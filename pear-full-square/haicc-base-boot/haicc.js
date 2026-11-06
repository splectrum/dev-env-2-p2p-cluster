#!/usr/bin/env node
// haicc at the root of a work folder (./haicc): the part of HAICC the host
// needs, run from packages/base-package-haicc (copied in by haiccing/boot,
// stage 1). Node.js built-ins only. The work folder: HAICC_WORK.
//   haicc boot [--yes]           the root's boot (stage 2): the host's prerequisites
//                                (git, Docker Engine), checked and fixed with a yes;
//                                then haiccing/install, if there, or the next commands
//   haicc boot <name> [--no-echo] a manager, <work>/<name>: the package manager and HAICC
//                                copied in whole; then its own boot (its self-test),
//                                its output shown as it happens (--no-echo: its outcome only).
//                                The name is made a URI part, and the change said.
//   haicc fetch <repository>     a repository, with what it requires, into haiccing/
//   haicc list                   the managers in this work folder
// --verbose: each check's detail too. What every command prints goes to
// log/ as well, in order (files of 10 KB named by their start, newest last). Exit 0 when done,
// 1 when not (the output says what is missing), 2 on a bad call.
import process from 'node:process'
import { existsSync, readFileSync, readdirSync, openSync, closeSync, createReadStream, createWriteStream, mkdirSync, writeFileSync, chmodSync, renameSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { openLog } from './lib/log.js'
import { CHECKS } from './lib/host.js'

const here = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const [verb, name] = argv.filter(a => !a.startsWith('--'))
const work = resolve(process.env.HAICC_WORK || '.')
const haiccing = join(work, 'haiccing')
const log = openLog({ dir: join(work, 'log'), command: ['haicc', ...argv], level: flags.debug ? 'debug' : flags.verbose ? 'verbose' : 'normal' })

const usage = () => { process.stderr.write(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 12).map(l => l.replace(/^\/\/ ?/, '')).join('\n') + '\n'); process.exit(2) }

// A yes, asked of the person (or given with --yes; none without a terminal).
async function ask (what) {
  if (flags.yes) { console.log(`  yes (--yes): ${what}`); return true }
  let fd
  try { fd = openSync('/dev/tty', 'r+') } catch { console.log(`  not done, no terminal to ask (--yes to agree): ${what}`); return false }
  const rl = createInterface({ input: createReadStream(null, { fd, autoClose: false }), output: createWriteStream(null, { fd, autoClose: false }) })
  const answer = await new Promise(resolve => { rl.once('close', () => resolve('')); rl.question(`  ${what}? [y/N] `, resolve) })   // no answer (Ctrl-D): a no
  rl.close(); closeSync(fd)
  const yes = /^y(es)?$/i.test(answer.trim())
  console.log(`  ${what}? ${yes ? 'yes' : 'no'}`)
  return yes
}

// The host's prerequisites, in order: checked; what is missing fixed with
// a yes and checked again; what is still missing said, with its hint.
async function hostPrerequisites () {
  console.log("The host's prerequisites (git, Docker Engine):")
  const missing = []
  for (const c of CHECKS) {
    process.stdout.write(`  checking ${c.name}... `)
    let a = c.observe()
    if (c.met(a)) { console.log(`ok (${c.detail(a)})`); continue }
    console.log(`missing (${c.detail(a)})`)
    if (c.fix) {
      const r = await c.fix(ask, a)
      console.log(`  ${r.said}`)
      if (r.done) a = c.observe()   // nothing changed otherwise
      if (r.done && c.met(a)) { console.log(`  ok      ${c.name}  ${c.detail(a)}`); continue }
    }
    console.log(`  ${c.name}: ${c.hint}`)
    missing.push(c.name)
  }
  if (missing.length) { console.log(`Not booted (${missing.join(', ')}): fix what is said above, then ./haicc boot again`); return false }
  console.log(`  all ${CHECKS.length} met`)
  return true
}

// haiccing/install: one haicc command a line, each its own command (it
// logs itself), stopping at the first failure.
function installFile () {
  const file = join(haiccing, 'install')
  if (!existsSync(file)) {
    console.log(`\nBooted. Next, from ${work}:`)
    console.log('  ./haicc boot <name>      a manager (e.g. master): its own HAICC and package manager')
    console.log('  ./haicc list             the managers here')
    return 0
  }
  console.log('\nhaiccing/install:')
  const lines = readFileSync(file, 'utf8').split('\n')
  for (let n = 1; n <= lines.length; n++) {
    const line = lines[n - 1].trim()
    if (!line || line.startsWith('#')) continue
    console.log(`\n[${n}] ./haicc ${line}`)
    const r = spawnSync(join(work, 'haicc'), line.split(/\s+/), { stdio: 'inherit' })
    if (r.status !== 0) { console.log(`haiccing/install stopped at line ${n}: ./haicc ${line}`); return 1 }
  }
  console.log('\nhaiccing/install done')
  return 0
}

// The work folder's own folders: not a manager's name.
const OWN = ['packages', 'haiccing', 'node', 'log']
// A name made a URI part: lowercase a-z, 0-9, words joined by single '-'.
export const cleanName = raw => raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// A manager: its folder in the work folder's shape, the package manager and
// HAICC copied in whole (fetched first where they are not), its launcher;
// then its own boot (its self-test), as it happens.
async function bootManager (raw) {
  const name = cleanName(raw)
  if (!name) { console.log(`haicc boot: '${raw}': nothing in it makes a name (a-z, 0-9)`); return 2 }
  if (name !== raw) console.log(`The name '${raw}' is not a URI part (lowercase a-z, 0-9, words joined by single '-'): the manager is named '${name}'.`)
  if (OWN.includes(name)) { console.log(`haicc boot: '${name}' is one of the work folder's own folders (${OWN.join(', ')}): choose another name`); return 2 }
  // The host first: its prerequisites met (checked only; ./haicc boot fixes them).
  const notMet = CHECKS.filter(c => !c.met(c.observe())).map(c => c.name)
  if (notMet.length) { console.log(`The host is not ready (${notMet.join(', ')}): ./haicc boot first`); return 1 }
  const dir = join(work, name)
  if (existsSync(dir) && !existsSync(join(dir, 'packages'))) { console.log(`haicc boot ${name}: ${dir} is there, and not a manager: choose another name`); return 1 }
  console.log(`The manager ${name} (${dir}):`)
  mkdirSync(join(dir, 'packages'), { recursive: true })
  for (const repo of ['base-package-pkgm', 'base-package-haicc']) {
    const at = join(dir, 'packages', repo)
    if (existsSync(join(at, 'package.json'))) { console.log(`  ${repo}: there`); continue }
    if (!existsSync(join(haiccing, repo, 'package.json'))) {
      const f = spawnSync('sh', [join(here, 'fetch.sh'), haiccing, repo], { encoding: 'utf8', env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` } })
      process.stdout.write(f.stdout || '')
      if (f.status !== 0) { console.log(`  ${repo}: could not be fetched (haiccing/sources)`); return 1 }
    }
    const c = spawnSync('sh', ['-c', 'rm -rf "$2.new" && cp -a "$1" "$2.new" && rm -rf "$2.new/.git" && mv "$2.new" "$2"', 'copy', join(haiccing, repo), at], { encoding: 'utf8' })
    if (c.status !== 0) { console.log(`  ${repo}: could not be copied in: ${(c.stderr || '').trim()}`); return 1 }
    const hash = JSON.parse(readFileSync(join(at, 'package.json'), 'utf8')).pkgm?.hash?.slice(0, 12)
    console.log(`  copied ${repo} (${hash}) into ${join(dir, 'packages')}`)
  }
  writeFileSync(join(dir, 'haicc.new'), `#!/bin/sh
# HAICC for the manager ${name} (written by the root's ./haicc boot ${name}): ${name}/haicc <command>
work=$(cd "$(dirname "$0")" && pwd)
HAICC_WORK=$work; export HAICC_WORK
[ -x "$work/../node/bin/node" ] && PATH=$work/../node/bin:$PATH
exec node "$work/packages/base-package-haicc/pear-full-square/haicc-deployment/haicc.js" "$@"
`)
  chmodSync(join(dir, 'haicc.new'), 0o755)
  renameSync(join(dir, 'haicc.new'), join(dir, 'haicc'))
  console.log(`  written ${join(dir, 'haicc')}`)
  // Its own boot: it logs itself (in <name>/log/); here, echoed as it happens.
  console.log(`Its boot (${name}/haicc boot)${flags['no-echo'] ? ', its outcome only' : ''}:`)
  const child = spawn(join(dir, 'haicc'), ['boot'], { env: { ...process.env, HAICC_WORK: dir }, stdio: ['ignore', 'pipe', 'pipe'] })
  // Its last complete line: its outcome (an unfinished line kept apart).
  let last = ''; let partial = ''
  const echo = chunk => {
    const s = String(chunk)
    const lines = (partial + s).split('\n')
    partial = lines.pop()
    for (const l of lines) if (l.trim()) last = l
    if (!flags['no-echo']) process.stdout.write(s.replace(/^(?=.)/gm, '  | '))
  }
  child.stdout.on('data', echo); child.stderr.on('data', echo)
  const code = await new Promise(resolve => child.on('close', resolve))
  if (partial.trim()) last = partial
  if (flags['no-echo']) console.log(`  | ${last}`)
  console.log(code === 0 ? `The manager ${name}: ready` : `The manager ${name}: its boot ended with exit ${code} (its log: ${name}/log/)`)
  return code === 0 ? 0 : 1
}

try {
  if (verb === 'boot' && !name) {
    process.exit((await hostPrerequisites()) ? installFile() : 1)
  }
  else if (verb === 'boot') process.exit(await bootManager(name))
  else if (verb === 'fetch') {
    if (!name) usage()
    // As it happens, through our own stdout (the log sees it too).
    const code = await new Promise(resolve => {
      const c = spawn('sh', [join(here, 'fetch.sh'), haiccing, '--requires', name], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` } })
      c.stdout.on('data', d => process.stdout.write(d))
      c.stderr.on('data', d => process.stderr.write(d))
      c.on('close', resolve)
    })
    if (code !== 0) console.log(`haicc fetch: not all of ${name} could be fetched (haiccing/sources)`)
    process.exit(code === 0 ? 0 : 1)
  } else if (verb === 'list') {
    // A manager: a folder of the same shape (its own packages/), not the root's own folders.
    const managers = readdirSync(work).filter(n => !['packages', 'haiccing', 'node', 'log'].includes(n) && existsSync(join(work, n, 'packages')))
    console.log(`managers (${work}):${managers.length ? '' : ' none yet'}`)
    for (const m of managers) console.log(`  ${m}`)
    process.exit(0)
  } else usage()
} catch (err) {
  console.log(`haicc ${verb}: ${err.message}`)
  process.exit(1)
}
