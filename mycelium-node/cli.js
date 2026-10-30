#!/usr/bin/env bare
// Command line for mycelium-node: a cluster node, under Bare (or Node).
//   bare cli.js seed <storage> [--bundle=<file>] [--host=<ip>] [--dht-port=<port>]
//     The first node: a private DHT's bootstrap node at <dht-port> (49737),
//     and a node whose own drive holds a repository. The repository comes in
//     from the outside world once, as a bundle, into an empty drive. Stays up.
//   bare cli.js join <storage> <key> --bootstrap=<host:port> [--host=<ip>]
//                    [--select=<path>] [--stay]
//     A node replicating the drive <key>: selects <path> (/*/*) on it, then
//     stays up to serve it (--stay) or closes.
// Prints JSON lines: {"event": ...} while it runs, {"result": ...} or
// {"error": "..."} (exit 1) when done. Metrics only here, at the boundary:
// object counts, sizes, times and replication volume.

import process from 'node:process'
import fs from 'node:fs'
import { validate, sameName } from '../mycelium-uri/index.js'
import { openRepo, readBundle } from '../mycelium-git/index.js'
import { startNode, startBootstrap } from './lib/node.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--'))
  .map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const [op, storage, key] = argv.filter(a => !a.startsWith('--'))
const t0 = Date.now()
const since = () => Date.now() - t0
const emit = o => console.log(JSON.stringify(o))
const hostPort = s => { const [host, port] = s.split(':'); return { host, port: Number(port) } }

try {
  if (op === 'seed') {
    const port = Number(flags['dht-port'] || 49737)
    const dht = await startBootstrap({ host: flags.host || '0.0.0.0', port })
    emit({ event: 'dht', port, ms: since() })
    const node = await startNode({ storage, bootstrap: [{ host: flags.host || '127.0.0.1', port }], host: flags.host })
    if (flags.bundle && node.drive.version <= 1) {
      await node.backend.init()
      const { branches, objects } = await readBundle(node.backend, fs.readFileSync(flags.bundle))
      for (const [name, oid] of Object.entries(branches)) await node.backend.updateBranch(name, oid, null)
      emit({ event: 'imported', branches: Object.keys(branches).length, objects, ms: since() })
    }
    node.swarm.on('connection', conn => emit({ event: 'peer', ms: since(), peers: node.swarm.connections.size }))
    emit({ event: 'serving', key: node.key, ms: since(), metrics: node.metrics() })
    // Stays up: the seed is the first always-on peer. Metrics now and then.
    setInterval(() => emit({ event: 'metrics', ms: since(), metrics: node.metrics() }), 30000)
    process.on('SIGTERM', async () => { await node.close(); await dht.destroy(); process.exit(0) })
  } else if (op === 'join') {
    if (!flags.bootstrap) throw new Error('join needs --bootstrap=<host:port>')
    const node = await startNode({ storage, key, bootstrap: [hostPort(flags.bootstrap)], host: flags.host })
    emit({ event: 'replica', key: node.key, version: node.drive.version, ms: since() })
    const repo = openRepo(node.backend)
    const path = flags.select || '/*/*'
    const selected = await repo.select(validate(path, { star: true }), sameName)
    const result = { selected, ms: since(), metrics: node.metrics() }
    if (flags.stay) {
      emit({ event: 'selected', ...result })
      process.on('SIGTERM', async () => { await node.close(); process.exit(0) })
    } else {
      await node.close()
      emit({ result })
    }
  } else {
    throw new Error(`unknown op: ${op}`)
  }
} catch (err) {
  emit({ error: err.message })
  process.exit(1)
}
