#!/usr/bin/env node
// The Splectral server, from the command line: runs until stopped.
//   node cli.js --config=<config.json>
// Prints one JSON line with its URL when it is listening.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { startServer } from './index.js'

const flags = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v] }))
const file = resolve(flags.config)
const config = JSON.parse(readFileSync(file, 'utf8'))
// Folders in the configuration are relative to it.
const at = p => resolve(dirname(file), p)
config.extensions = (config.extensions || []).map(at)
if (config.runs) config.runs = at(config.runs)
const s = await startServer({ config })
console.log(JSON.stringify({ event: 'listening', url: s.url }))
const stop = async () => { await s.close(); process.exit(0) }
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
