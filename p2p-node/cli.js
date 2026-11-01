#!/usr/bin/env bare
// The node application, from the command line (its container's command).
//   bare cli.js master --swarm=<name> --name=<node> --host=<ip> --storage=<dir>
//                      --code=<folder> [--dht-port=49737]
// The node's primary key comes first on stdin, as hex, from its node
// manager: never from a file the node keeps. Everything the node does goes
// to stdout as JSON lines (its log: the audit and metrics of every module),
// which the node manager follows. SIGTERM stops it gracefully.

import process from 'node:process'
import { startNode } from './index.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v] }))
const [role] = argv.filter(a => !a.startsWith('--'))
const log = e => process.stdout.write(JSON.stringify(e) + '\n')

function readSecret () {
  return new Promise((resolve, reject) => {
    let text = ''
    const ondata = chunk => {
      text += chunk.toString()
      const end = text.indexOf('\n')
      if (end === -1) return
      process.stdin.removeListener('data', ondata)
      process.stdin.pause()
      const key = Buffer.from(text.slice(0, end).trim(), 'hex')
      text = ''
      if (key.length !== 32) reject(new Error('the primary key on stdin is not 32 bytes of hex'))
      else resolve(key)
    }
    process.stdin.on('data', ondata)
    process.stdin.once('end', () => reject(new Error('no primary key on stdin')))
  })
}

try {
  const primaryKey = await readSecret()
  log({ module: 'p2p-node', kind: 'secret-received', time: Date.now(), bytes: primaryKey.length })
  const node = await startNode({
    role,
    swarm: flags.swarm,
    name: flags.name,
    storage: flags.storage,
    primaryKey,
    host: flags.host,
    dhtPort: Number(flags['dht-port'] || 49737),
    code: flags.code,
    observer: log,
    metricsEvery: Number(flags['metrics-every'] || 30000)
  })
  primaryKey.fill(0)
  let stopped = false
  const stop = async signal => {
    if (stopped) return
    stopped = true
    log({ module: 'p2p-node', kind: 'stopping', time: Date.now(), signal })
    await node.stop()
    process.exit(0)
  }
  process.on('SIGTERM', () => stop('SIGTERM'))
  process.on('SIGINT', () => stop('SIGINT'))
} catch (err) {
  log({ module: 'p2p-node', kind: 'failed', time: Date.now(), error: err.message })
  process.exit(1)
}
