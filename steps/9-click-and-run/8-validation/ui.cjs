// Step 9's browser test: a demo project's scenario run from its page, the
// map beside it (tabs), then run again; as a person would. One JSON line;
// screenshots into <screens>.
//   NODE_PATH=$(npm root -g) node ui.cjs <url> <screens> <name> <scenario-id>
const { chromium } = require('playwright')
const { mkdirSync } = require('node:fs')
const { join } = require('node:path')

const [url, screens, name, id] = process.argv.slice(2)
mkdirSync(screens, { recursive: true })
const t0 = Date.now()
const shot = (page, what) => page.screenshot({ path: join(screens, `${name}-${what}.png`), fullPage: true })
const go = async (page, hash) => { await page.evaluate(h => { location.hash = h }, hash); await page.waitForSelector(`main[data-current="${hash}"]`) }
const scenario = `splectral-scenario/scenario/${id}`
const map = 'base-view-map/map'

async function runOnce (page, n) {
  const t = Date.now()
  await page.click('[data-run]')
  // Running: the button says so; then the outcome of this run.
  await page.waitForSelector('[data-run][disabled]', { timeout: 30000 })
  await page.waitForSelector('[data-outcome]', { timeout: 400000 })
  return {
    run: n,
    outcome: await page.getAttribute('[data-outcome]', 'data-outcome'),
    stepsDone: (await page.$$eval(`[data-scenario="${id}"] [data-step]`, els => els.map(e => e.dataset.done))).every(d => d === 'yes'),
    says: await page.$$eval(`[data-scenario="${id}"] [data-say]`, els => els.map(e => e.textContent)),
    runsShown: await page.getAttribute('[data-runs]', 'data-runs').catch(() => null),
    ms: Date.now() - t
  }
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url)
  const out = { name }
  await page.waitForSelector(`[data-page="${scenario}"]`, { timeout: 60000 })
  await page.waitForSelector('[data-page="base-view-map/node/%2Fhosts%2Fnode-1"]', { timeout: 120000 })
  out.menu = await page.$$eval('[data-page]', els => els.map(e => e.textContent))
  // Tabs: the map opened, then the scenario, the map beside it.
  await go(page, map)
  await go(page, scenario)
  await page.click(`[data-beside-toggle="${map}"]`)
  await page.waitForSelector(`main[data-beside="${map}"] [data-pane="${map}"]`)
  out.tabs = await page.$$eval('[data-tab]', els => els.map(e => e.dataset.tab))
  await shot(page, '1-scenario-and-map')

  out.first = await runOnce(page, 1)
  await shot(page, '2-first-run-done')
  out.second = await runOnce(page, 2)
  await shot(page, '3-second-run-done')
  out.nodes = await page.$$eval('[data-node]', els => els.map(e => ({ uri: e.dataset.node, status: e.dataset.status, presence: e.dataset.presence })))
  await go(page, 'splectral-timeline/timeline')
  out.timelineKinds = await page.$$eval('[data-event]', els => [...new Set(els.map(e => e.dataset.event))].sort())
  await shot(page, '4-timeline')
  out.pageErrors = errors
  out.ms = Date.now() - t0
  console.log(JSON.stringify(out))
  await browser.close()
})().catch(err => { console.log(JSON.stringify({ name, error: err.message.split('\n')[0], ms: Date.now() - t0 })); process.exit(1) })
