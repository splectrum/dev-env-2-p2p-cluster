#!/usr/bin/env node
// One node's manager, from the command line: runs for the node's life.
//   node cli.js run --folder=<node-folder> --vault=<vault-dir> --image=<image>
//                   --network=<network> --ip=<ip> --swarm=<swarm> --name=<node>
//                   [--role=master] [--metrics-every=<ms>]
// Writes its pid to <folder>/manager.pid; SIGTERM or SIGINT stops the node
// gracefully, then the manager exits. Prints one JSON line when the node
// is ready, and one when it has exited.

import { writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { manageNode } from './index.js'
import { vault } from './vault.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v] }))
const [op] = argv.filter(a => !a.startsWith('--'))
if (op !== 'run') { console.error('usage: cli.js run --folder=... --vault=... --image=... --network=... --ip=... --swarm=... --name=...'); process.exit(2) }

writeFileSync(join(flags.folder, 'manager.pid'), String(process.pid) + '\n')
const m = manageNode({
  folder: flags.folder,
  vault: vault(flags.vault),
  image: flags.image,
  network: flags.network,
  ip: flags.ip,
  swarm: flags.swarm,
  name: flags.name,
  role: flags.role || 'master',
  metricsEvery: Number(flags['metrics-every'] || 30000)
})
let stopping = false
const stop = async () => { if (stopping) return; stopping = true; await m.stop() }
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
m.ready.then(s => console.log(JSON.stringify({ event: 'ready', ...s })), () => {})
const end = await m.done
console.log(JSON.stringify({ event: 'exited', ...end }))
rmSync(join(flags.folder, 'manager.pid'), { force: true })
process.exit(end.exitCode === 0 ? 0 : 1)
