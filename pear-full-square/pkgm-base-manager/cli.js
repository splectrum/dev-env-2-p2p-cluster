#!/usr/bin/env node
// pkgm: the package manager, basic.
//   pkgm import  --dev=<development repository> --out=<folder of package repositories>
//   pkgm write   --dev=<development repository> --out=<folder> [--only=a,b] [--keep]
//   pkgm install <package> --from=<folder>[,<folder>] [--into=<install folder>] [--override=<org>/<module>=<dir>]...
//   pkgm test    <package> [--into=<install folder>]
//   pkgm list    [--into=<install folder>]
//   pkgm uninstall <package> [--into=<install folder>]
// The install folder defaults to $HAICC_HOME/packages (~/.haicc/packages).
// Progress to stderr as JSON lines (--quiet: none); the result to stdout, as JSON; exit 1
// when a test fails or the operation is refused.
import process from 'node:process'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { importThirdParty, writePackages, install, testPackage, installed, uninstall } from './index.js'

const [op, ...rest] = process.argv.slice(2)
const flags = {}; const args = []; const overrides = {}
for (const a of rest) {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/)
  if (!m) { args.push(a); continue }
  if (m[1] === 'override') { const i = m[2].lastIndexOf('='); overrides[m[2].slice(0, i)] = m[2].slice(i + 1) } else flags[m[1]] = m[2] ?? true
}
const into = flags.into || join(process.env.HAICC_HOME || join(homedir(), '.haicc'), 'packages')
const log = flags.quiet ? () => {} : e => process.stderr.write(JSON.stringify(e) + '\n')
const out = (v, ok = true) => { process.stdout.write(JSON.stringify(v, null, 2) + '\n'); process.exit(ok ? 0 : 1) }
const need = (v, what) => { if (!v) { process.stderr.write(`pkgm ${op}: ${what} needed\n`); process.exit(2) } return v }

try {
  if (op === 'import') out(importThirdParty({ dev: need(flags.dev, '--dev'), out: need(flags.out, '--out'), log }))
  else if (op === 'write') { const r = writePackages({ dev: need(flags.dev, '--dev'), out: need(flags.out, '--out'), only: flags.only ? String(flags.only).split(',') : null, keep: Boolean(flags.keep), log }); out(r, r.ok) }
  else if (op === 'install') out({ into, done: install(need(args[0], 'a package'), { from: need(flags.from, '--from').split(','), into, overrides, log }) })
  else if (op === 'test') { const r = testPackage(need(args[0], 'a package'), { into, log }); out(r, r.ok) }
  else if (op === 'list') out({ into, ...installed(into) })
  else if (op === 'uninstall') out({ into, removed: uninstall(need(args[0], 'a package'), { into }) })
  else { process.stderr.write((await import('node:fs')).readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 12).map(l => l.replace(/^\/\/ ?/, '')).join('\n') + '\n'); process.exit(2) }
} catch (err) {
  process.stderr.write(`pkgm ${op}: ${err.message}\n`)
  process.exit(1)
}
