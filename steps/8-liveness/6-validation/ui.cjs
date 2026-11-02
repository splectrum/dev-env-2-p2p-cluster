// Step 8's browser tests: the liveness scenario in Splectral, in headless
// Chromium (Playwright), as a person would see it. Prints one JSON line;
// screenshots into <screens>.
//   NODE_PATH=$(npm root -g) node ui.cjs live <url> <screens>
//     the map before; the scenario run from its page; the map with node-1
//     absent, present again, left and gone; the scenario's messages; the
//     timeline; node-1's page
//   NODE_PATH=$(npm root -g) node ui.cjs replay <url> <screens>
//     the same topics replayed: the messages compared with the live run's
//     (live.json), and presence seen on the way
const { chromium } = require('playwright')
const { mkdirSync, writeFileSync, readFileSync } = require('node:fs')
const { join } = require('node:path')

const [mode, url, screens] = process.argv.slice(2)
mkdirSync(screens, { recursive: true })
const t0 = Date.now()
const N1 = '[data-node="/hosts/node-1"]'
const shot = (page, name) => page.screenshot({ path: join(screens, `${mode}-${name}.png`), fullPage: true })
const nodesOnMap = page => page.$$eval('[data-node]', els => els.map(e => ({ uri: e.dataset.node, status: e.dataset.status, presence: e.dataset.presence })).sort((a, b) => a.uri.localeCompare(b.uri)))
const go = async (page, hash) => { await page.evaluate(h => { location.hash = h }, hash); await page.waitForSelector(`main[data-current="${hash}"]`) }
const at = () => Date.now() - t0

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url)
  const out = { mode, seen: {} }
  if (mode === 'live') {
    await page.waitForSelector('[data-page="base-view-map/node/%2Fhosts%2Fnode-1"]', { timeout: 60000 })
    out.menu = await page.$$eval('[data-page]', els => els.map(e => e.textContent))
    await go(page, 'base-view-map/map')
    await page.waitForSelector(`${N1}[data-status="running"][data-presence="present"]`, { timeout: 60000 })
    out.before = await nodesOnMap(page)
    await shot(page, '1-map-before')

    await go(page, 'splectral-scenario/scenario/liveness')
    await page.click('[data-run]')
    const run = at()
    await page.waitForSelector('[data-say]', { timeout: 30000 })
    await go(page, 'base-view-map/map')
    await page.waitForSelector(`${N1}[data-presence="absent"]`, { timeout: 90000 })
    out.seen.absent = at() - run
    out.absent = { map: await nodesOnMap(page), ring: Boolean(await page.$(`${N1} [data-absent]`)), say: await page.textContent('[data-say-now]') }
    await shot(page, '2-map-absent')
    await page.waitForFunction(() => (document.querySelector('[data-say-now]')?.textContent || '').startsWith('Refused:'), null, { timeout: 60000 })
    out.refusedSay = await page.textContent('[data-say-now]')
    await shot(page, '3-map-refused')
    await page.waitForSelector(`${N1}[data-presence="present"]`, { timeout: 90000 })
    out.seen.present = at() - run
    out.presentAgain = await nodesOnMap(page)
    await shot(page, '4-map-present-again')
    await page.waitForSelector(`${N1}[data-presence="left"]`, { timeout: 90000 })
    out.seen.left = at() - run
    await page.waitForSelector(`${N1}[data-status="gone"]`, { timeout: 60000 })
    out.left = await nodesOnMap(page)
    await shot(page, '5-map-left')

    await go(page, 'splectral-scenario/scenario/liveness')
    await page.waitForSelector('[data-outcome]', { timeout: 120000 })
    out.seen.done = at() - run
    out.outcome = await page.getAttribute('[data-outcome]', 'data-outcome')
    out.stepsDone = await page.$$eval('[data-step]', els => els.map(e => e.dataset.done))
    out.says = await page.$$eval('[data-say]', els => els.map(e => e.textContent))
    await shot(page, '6-scenario-done')
    await go(page, 'splectral-timeline/timeline')
    out.timelineKinds = await page.$$eval('[data-event]', els => [...new Set(els.map(e => e.dataset.event))].sort())
    await shot(page, '7-timeline')
    await go(page, 'base-view-map/node/%2Fhosts%2Fnode-1')
    out.node1Page = { status: await page.textContent('[data-node-page] [data-status]'), presence: await page.textContent('[data-node-page] [data-presence]') }
    await shot(page, '8-node-1')
    writeFileSync(join(screens, 'live.json'), JSON.stringify(out, null, 2) + '\n')
  } else {
    await page.waitForSelector('[data-page="base-view-map/map"]', { timeout: 60000 })
    await go(page, 'base-view-map/map')
    // Presence seen on the way, as the replay plays.
    const watch = page.waitForSelector(`${N1}[data-presence="absent"]`, { timeout: 120000 }).then(() => { out.seen.absent = true }, () => { out.seen.absent = false })
    await page.waitForFunction(() => (document.querySelector('[data-say-now]')?.textContent || '').startsWith('Replay finished'), null, { timeout: 300000 })
    await watch
    out.final = await page.textContent('[data-say-now]')
    out.after = await nodesOnMap(page)
    await shot(page, '1-map-end')
    await go(page, 'splectral-scenario/scenario/liveness')
    out.says = await page.$$eval('[data-say]', els => els.map(e => e.textContent))
    await shot(page, '2-scenario-messages')
    const live = JSON.parse(readFileSync(join(screens, 'live.json'), 'utf8'))
    out.sameMessagesAsLive = JSON.stringify(out.says) === JSON.stringify(live.says)
  }
  out.pageErrors = errors
  out.ms = Date.now() - t0
  console.log(JSON.stringify(out))
  await browser.close()
})().catch(err => { console.log(JSON.stringify({ mode, error: err.message.split('\n')[0], ms: Date.now() - t0 })); process.exit(1) })
