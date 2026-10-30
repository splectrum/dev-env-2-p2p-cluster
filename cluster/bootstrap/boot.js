// The bootstrap: what a node runs first, on a plain base with Bare only.
// It sits at the top of the bootstrap repository's checkout, next to the
// modules it needs (mycelium-*, as plain folders) and node.json, which
// says what a node is: the modules it materialises and how it starts.
//   bare boot.js seed --bundle=<file> --host=<ip>
//     The seed node: the package repository comes in once, as a bundle, into
//     its own drive; it serves it and bootstraps the private DHT. It runs
//     from the bootstrap's own modules.
//   bare boot.js join <key> --bootstrap=<host:port> --host=<ip>
//     A joining node: needs only this repository and the seed's key (the
//     package repository's drive). Obtains the package repository (a
//     replica), materialises the node's modules from it into /app (only
//     their trees are loaded), and starts the node from /app.
// Storage: /data/store. JSON lines on stdout.

import process from 'node:process'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { startNode, materialise, readDeployment } from './mycelium-node/index.js'

const here = new URL('.', import.meta.url).pathname
const config = JSON.parse(fs.readFileSync(here + 'node.json', 'utf8'))
const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--'))
  .map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const [role, key] = argv.filter(a => !a.startsWith('--'))
const storage = flags.storage || '/data/store'
const app = flags.app || '/app'
const t0 = Date.now()
const emit = o => console.log(JSON.stringify({ ...o, ms: Date.now() - t0 }))
const pass = ['host', 'bootstrap', 'bundle', 'dht-port'].filter(f => flags[f]).map(f => `--${f}=${flags[f]}`)

// The node itself, as its own process, from the given code; it takes over.
function start (code, args) {
  emit({ event: 'start', code, args })
  const child = spawn('bare', [code, ...args], { stdio: 'inherit' })
  child.on('exit', code => process.exit(code ?? 1))
  process.on('SIGTERM', () => child.kill('SIGTERM'))
}

try {
  if (role === 'seed') {
    start(here + 'mycelium-node/cli.js', ['seed', storage, ...pass])
  } else if (role === 'join') {
    const [host, port] = String(flags.bootstrap).split(':')
    const node = await startNode({ storage, key, bootstrap: [{ host, port: Number(port) }], host: flags.host })
    emit({ event: 'packages', key: node.key, version: node.drive.version })
    const materialised = {}
    for (const module of config.modules) {
      const { commit, id, layout } = await readDeployment(node.backend, module)
      materialised[module] = { id, commit, ...await materialise(node.backend, layout, app) }
    }
    emit({ event: 'materialised', modules: materialised, metrics: node.metrics() })
    await node.close()
    start(`${app}/${config.start}`, ['join', storage, key, ...pass, '--select=/main/readme.md', '--stay'])
  } else {
    throw new Error(`unknown role: ${role}`)
  }
} catch (err) {
  emit({ error: err.message })
  process.exit(1)
}
