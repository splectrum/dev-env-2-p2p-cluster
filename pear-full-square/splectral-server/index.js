// splectral-server — the server's shell (notes/splectral.md). It knows no
// page and no p2p: everything comes from extensions.
//   const s = await startServer({ config })
//   s.url, s.model, s.dispatch(action), await s.close()
//
// config: {
//   port, host,
//   extensions: [folders],        each with a splectral.json (splectral-contract)
//   sources: [{ kind, ... }],     the platform's `file`, or a kind an extension provides
//   runs: folder                  where actions and scenario runs are recorded (topics)
// }
//
// Sources yield records; mappers (extensions, matched by what a source
// `holds`) turn records into events of the abstract world; the model folds
// them; the transport carries the model to browsers. Actions are dispatched
// to the extension declaring them, and recorded. The menu lists the pages
// whose needs are met: `world` once any source runs, `node` once per node,
// `scenario` once per scenario.

import http from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, resolve, dirname, extname, basename } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { checkManifest } from '../splectral-contract/index.js'
import { createModel } from '../splectral-model/index.js'
import { serveTransport } from '../splectral-transport/index.js'
import { openTopic, folderStorage } from '../mycelium-topic/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }

export async function startServer ({ config }) {
  // Vendor files first: nothing has started if they are missing.
  const require = createRequire(join(here, '..', 'splectral-shell', 'package.json'))
  // A package's folder, found on the resolution paths (exports may hide its files).
  const pkg = name => {
    const found = require.resolve.paths(name).map(p => join(p, name)).find(p => existsSync(join(p, 'package.json')))
    if (!found) throw new Error(`not installed: ${name}`)
    return found
  }
  const vendor = {
    'react.js': join(pkg('react'), 'umd', 'react.production.min.js'),
    'react-dom.js': join(pkg('react-dom'), 'umd', 'react-dom.production.min.js'),
    'htm.js': join(pkg('htm'), 'dist', 'htm.umd.js')
  }
  const model = createModel()
  const emit = event => model.apply({ time: Date.now(), ...event })

  // Extensions, checked once at the boundary.
  const extensions = []
  for (const dir of config.extensions || []) {
    const manifest = checkManifest(JSON.parse(readFileSync(join(dir, 'splectral.json'), 'utf8')))
    extensions.push({ dir: resolve(dir), manifest })
  }
  const provided = kind => extensions.flatMap(x => (x.manifest.provides || []).filter(p => p.kind === kind).map(p => ({ ...p, ext: x.manifest.name, dir: x.dir })))
  const load = async p => (await import(pathToFileURL(join(p.dir, p.module)).href)).default

  // Mappers, by what a source holds ('p2p-node-manager/manager'; '*' at the end matches a prefix).
  const mappers = []
  for (const p of provided('mapper')) mappers.push({ holds: p.holds, map: (await load(p))() })
  const mapperFor = holds => mappers.find(m => m.holds === holds || (m.holds.endsWith('*') && holds.startsWith(m.holds.slice(0, -1))))
  const mapRecord = (topic, record) => {
    // Records holding `splectral/world` are events of the abstract world
    // already (a scenario's run, recorded); others go through their mapper.
    const m = topic.holds === 'splectral/world' ? { map: r => [r.value] } : mapperFor(topic.holds)
    const events = m ? m.map(record, topic) : [{ kind: 'record', holds: topic.holds, value: record.value }]
    for (const e of events || []) emit(e)
  }

  // Sources: the platform's `file`, and the kinds extensions provide.
  const sourceKinds = { file: fileSource }
  for (const p of provided('source')) sourceKinds[p.id] = await load(p)
  const platform = {
    emit,
    mapRecord,
    model,
    topicsOf: cfg => (cfg.kind === 'file' ? [cfg] : (sourceKinds[cfg.kind]?.topicsOf?.(cfg, platform) || [])),
    async readAll (topic) { return (await openTopic({ storage: folderStorage(topic.path) })).consume(0) },
    startSource (cfg) {
      const kind = sourceKinds[cfg.kind]
      if (!kind) throw new Error(`no source kind: ${cfg.kind}`)
      return kind(cfg, platform)
    }
  }
  const running = []
  try {
    for (const cfg of config.sources || []) running.push(await platform.startSource(cfg))
    return await serve()
  } catch (err) {
    // A start that fails leaves nothing running.
    for (const r of running) await r?.stop?.()
    throw err
  }

  async function serve () {

  // Actions, recorded in a topic of the server's own.
  const actionLog = config.runs ? await openTopic({ storage: folderStorage(join(config.runs, 'actions')) }) : null
  const actions = {}
  for (const p of provided('action')) actions[p.id] = await load(p)
  const scenarios = {}
  for (const p of provided('scenario')) scenarios[p.id] = { ...JSON.parse(readFileSync(join(p.dir, p.file), 'utf8')), id: p.id, ext: p.ext, title: p.title }
  const ctx = { config, model, emit, platform, scenarios, dispatch: a => dispatch(a) }
  async function dispatch ({ action, with: args = {} }) {
    const run = actions[action]
    if (!run) throw new Error(`no action: ${action}`)
    const t0 = Date.now()
    let result, error = null
    try { result = await run(args, ctx) } catch (err) { error = err.message }
    if (actionLog) await actionLog.produce({ value: { action, with: args, ok: !error, error, ms: Date.now() - t0 } })
    emit({ kind: 'actionResult', action, ok: !error, error })
    if (error) throw new Error(error)
    return result
  }

  // The menu: the pages whose needs are met, now.
  function menu () {
    const s = model.snapshot()
    const out = []
    for (const p of provided('page')) {
      const entry = { ext: p.ext, page: p.id, title: p.title || p.id, module: `/m/${p.ext}/${p.module}` }
      if (p.needs.includes('node')) for (const uri of Object.keys(s.nodes).sort()) out.push({ ...entry, param: uri, title: `${entry.title}: ${uri}` })
      else if (p.needs.includes('scenario')) for (const sc of Object.values(scenarios)) out.push({ ...entry, param: sc.id, title: sc.title || sc.id })
      else if (p.needs.includes('world') && running.length) out.push(entry)
    }
    return out
  }

  // Files the browser may load: the shell, the shared modules, extensions, vendor.
  const folders = {
    'splectral-shell': join(here, '..', 'splectral-shell'),
    'splectral-model': join(here, '..', 'splectral-model'),
    'splectral-transport': join(here, '..', 'splectral-transport'),
    'splectral-contract': join(here, '..', 'splectral-contract'),
    ...Object.fromEntries(extensions.map(x => [x.manifest.name, x.dir]))
  }
  const sendFile = (res, file) => {
    if (!file || !existsSync(file) || !statSync(file).isFile() || !types[extname(file)]) { res.writeHead(404); return res.end() }
    res.writeHead(200, { 'content-type': types[extname(file)] })
    res.end(readFileSync(file))
  }
  const transport = serveTransport({ model, dispatch })
  const server = http.createServer((req, res) => {
    if (transport.handle(req, res)) return
    const url = new URL(req.url, 'http://x')
    if (url.pathname === '/' || url.pathname === '/index.html') return sendFile(res, join(folders['splectral-shell'], 'index.html'))
    if (url.pathname === '/menu') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(menu())) }
    if (url.pathname.startsWith('/scenario/')) {
      const sc = scenarios[basename(url.pathname)]
      res.writeHead(sc ? 200 : 404, { 'content-type': 'application/json' })
      return res.end(JSON.stringify(sc || null))
    }
    if (url.pathname.startsWith('/vendor/')) return sendFile(res, vendor[basename(url.pathname)])
    const m = url.pathname.match(/^\/m\/([a-z0-9-]+)\/(.+)$/)
    if (m && folders[m[1]] && !m[2].includes('..')) return sendFile(res, join(folders[m[1]], m[2]))
    res.writeHead(404)
    res.end()
  })
  await new Promise(resolve => server.listen(config.port ?? 0, config.host ?? '127.0.0.1', resolve))
  const url = `http://${config.host ?? '127.0.0.1'}:${server.address().port}`
  return {
    url,
    model,
    dispatch,
    menu,
    async close () {
      for (const r of running) await r?.stop?.()
      transport.close()
      const closed = new Promise(resolve => server.close(resolve))
      server.closeAllConnections()
      await closed
    }
  }
}

}

// The platform's source: a topic in a folder on the host, followed from
// its start; each record mapped by what the topic holds.
//   { kind: 'file', path, holds, context }
async function fileSource (cfg, platform) {
  const topic = await openTopic({ storage: folderStorage(cfg.path) })
  const stop = topic.follow(0, rs => { for (const r of rs) platform.mapRecord(cfg, r) }, { every: cfg.every ?? 250 })
  return { stop }
}
