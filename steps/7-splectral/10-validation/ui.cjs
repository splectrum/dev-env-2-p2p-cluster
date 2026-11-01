// Step 7's browser tests: Splectral in headless Chromium (Playwright), as
// a person would see it. Prints one JSON line; screenshots into <screens>.
//   NODE_PATH=$(npm root -g) node ui.cjs live <url> <screens>
//     the menu, the map before; the scenario run from its page, the map
//     while host B's node joins and after it stops; the scenario's
//     messages; the timeline; a node's page
//   NODE_PATH=$(npm root -g) node ui.cjs replay <url> <screens>
//     the same topics replayed: the map at the end compared with the live
//     run's (live.json, written by the live mode)
const { chromium } = require('playwright')
const { mkdirSync, writeFileSync, readFileSync } = require('node:fs')
const { join } = require('node:path')

const [mode, url, screens] = process.argv.slice(2)
mkdirSync(screens, { recursive: true })
const t0 = Date.now()
const shot = (page, name) => page.screenshot({ path: join(screens, `${mode}-${name}.png`), fullPage: true })
const nodesOnMap = page => page.$$eval('[data-node]', els => els.map(e => ({ uri: e.dataset.node, status: e.dataset.status, controlled: e.dataset.controlled })).sort((a, b) => a.uri.localeCompare(b.uri)))
const go = async (page, hash) => { await page.evaluate(h => { location.hash = h }, hash); await page.waitForSelector(`main[data-current="${hash}"]`) }

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url)
  const out = { mode }
  if (mode === 'live') {
    await page.waitForSelector('[data-page="base-view-map/node/%2Fhosts%2Fnode-1"]', { timeout: 60000 })
    out.menu = await page.$$eval('[data-page]', els => els.map(e => e.textContent))
    await go(page, 'base-view-map/map')
    await page.waitForSelector('[data-node="/hosts/node-1"][data-status="running"]', { timeout: 60000 })
    out.before = await nodesOnMap(page)
    await shot(page, '1-map-before')

    await go(page, 'splectral-scenario/scenario/other-host')
    await page.click('[data-run]')
    await page.waitForSelector('[data-say]', { timeout: 30000 })
    await shot(page, '2-scenario-started')

    await go(page, 'base-view-map/map')
    await page.waitForSelector('[data-node="/hosts/remote-1"][data-status="running"]', { timeout: 240000 })
    out.joined = await nodesOnMap(page)
    out.joinedSay = await page.textContent('[data-say-now]')
    await shot(page, '3-map-remote-joined')
    await page.waitForSelector('[data-resource="/hosts/remote-1/node"][data-changed="yes"], [data-node="/hosts/remote-1"][data-status="gone"]', { timeout: 120000 })
    out.sawChangeOrGone = await page.$eval('[data-resource="/hosts/remote-1/node"]', e => e.dataset.changed).catch(() => 'gone first')
    await shot(page, '4-map-remote-wrote')
    await page.waitForSelector('[data-node="/hosts/remote-1"][data-status="gone"]', { timeout: 120000 })
    await shot(page, '5-map-remote-gone')

    await go(page, 'splectral-scenario/scenario/other-host')
    await page.waitForSelector('[data-outcome]', { timeout: 180000 })
    out.outcome = await page.getAttribute('[data-outcome]', 'data-outcome')
    out.stepsDone = await page.$$eval('[data-step]', els => els.map(e => e.dataset.done))
    out.says = await page.$$eval('[data-say]', els => els.map(e => e.textContent))
    await shot(page, '6-scenario-done')

    await go(page, 'base-view-map/map')
    await page.waitForTimeout(1000)
    out.after = await nodesOnMap(page)
    await shot(page, '7-map-after')
    await go(page, 'splectral-timeline/timeline')
    out.timelineKinds = await page.$$eval('[data-event]', els => [...new Set(els.map(e => e.dataset.event))].sort())
    await shot(page, '8-timeline')
    await go(page, 'base-view-map/node/%2Fhosts%2Fremote-1')
    out.remotePage = { status: await page.textContent('[data-node-page] [data-status]'), events: (await page.$$('[data-node-page] [data-event]')).length }
    await shot(page, '9-node-remote-1')
    // At phone width: the layout holds, with no horizontal scroll.
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, 'base-view-map/map')
    out.phoneScrollsSideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    await shot(page, '10-map-phone')
    writeFileSync(join(screens, 'live.json'), JSON.stringify(out, null, 2) + '\n')
  } else {
    await page.waitForSelector('[data-page="base-view-map/map"]', { timeout: 60000 })
    await go(page, 'base-view-map/map')
    await page.waitForFunction(() => (document.querySelector('[data-say-now]')?.textContent || '').startsWith('Replay finished'), null, { timeout: 300000 })
    out.final = await page.textContent('[data-say-now]')
    out.after = await nodesOnMap(page)
    await shot(page, '1-map-end')
    await go(page, 'splectral-scenario/scenario/other-host')
    out.says = await page.$$eval('[data-say]', els => els.map(e => e.textContent))
    await shot(page, '2-scenario-messages')
    const live = JSON.parse(readFileSync(join(screens, 'live.json'), 'utf8'))
    out.sameMapAsLive = JSON.stringify(out.after) === JSON.stringify(live.after)
    out.sameMessagesAsLive = JSON.stringify(out.says) === JSON.stringify(live.says)
  }
  out.pageErrors = errors
  out.ms = Date.now() - t0
  console.log(JSON.stringify(out))
  await browser.close()
})().catch(err => { console.log(JSON.stringify({ mode, error: err.message.split('\n')[0], ms: Date.now() - t0 })); process.exit(1) })
