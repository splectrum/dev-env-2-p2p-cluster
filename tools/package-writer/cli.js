#!/usr/bin/env node
// The package writer: haiccing's packages written (the development environment's side of the airgap):
//   node tools/package-writer/cli.js --out=<folder of package repositories> [--only=a,b] [--keep] [--quiet]
// From this repository (packages.json, its modules, haiccing/<repo>/). Progress
// to stderr as JSON lines; the result to stdout, as JSON; exit 1 when a test
// fails (nothing written).
import process from 'node:process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writePackages } from './index.js'

const flags = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
if (!flags.out) { process.stderr.write('--out=<folder> needed\n'); process.exit(2) }
const dev = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const log = flags.quiet ? () => {} : e => process.stderr.write(JSON.stringify(e) + '\n')
const r = writePackages({ dev, out: flags.out, only: flags.only ? String(flags.only).split(',') : null, keep: Boolean(flags.keep), log })
process.stdout.write(JSON.stringify({ ok: r.ok, written: r.written, failed: r.results.flatMap(x => x.runs.filter(y => !y.ok).map(y => ({ dir: x.dir, ...y }))), scratch: r.scratch }, null, 2) + '\n')
process.exit(r.ok ? 0 : 1)
