#!/usr/bin/env node
// The Splectral server, from the command line: runs until stopped.
//   node cli.js --config=<config.json>
// Prints one JSON line with its URL when it is listening.
//   node cli.js act --config=<config.json> --action=<id> [--with=<json>]
// A client: the action produced into a client topic of its own, its result
// read back (the server may start after it is asked). One JSON line.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { startServer } from './index.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)] }))
const file = resolve(flags.config)
const config = JSON.parse(readFileSync(file, 'utf8'))
// Folders in the configuration are relative to it.
const at = p => resolve(dirname(file), p)
if (argv[0] === 'act') {
  const { askServer } = await import('./client.js')
  const out = await askServer({ runs: at(config.runs || 'runs'), action: flags.action, with: flags.with ? JSON.parse(flags.with) : {} }).catch(err => ({ ok: false, error: err.message }))
  console.log(JSON.stringify(out))
  process.exit(out.ok ? 0 : 1)
}
config.extensions = (config.extensions || []).map(at)
if (config.runs) config.runs = at(config.runs)
const s = await startServer({ config })
console.log(JSON.stringify({ event: 'listening', url: s.url }))
const stop = async () => { await s.close(); process.exit(0) }
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
