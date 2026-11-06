#!/usr/bin/env node
// haicc at the root of a work folder (./haicc): the part of HAICC the host
// needs, run from packages/base-package-haicc (copied in by haiccing/boot,
// stage 1). Node.js built-ins only. The work folder: HAICC_WORK.
//   haicc boot [--yes]           the root's boot (stage 2): the host's prerequisites
//                                (git, Docker Engine), checked and fixed with a yes;
//                                then haiccing/install, if there, or the next commands
//   haicc boot <swarm>/<node> [--role=master|node] [--no-echo]
//                                a node's manager, <work>/<swarm>/<node>: the swarm's folder
//                                (its launcher, swarm.json) made on first use, the node added
//                                with its role (the first: master), the package manager and
//                                HAICC copied in whole; then the node's own boot (its
//                                self-test), its output shown as it happens (--no-echo: its
//                                outcome only). Names made URI parts, the changes said.
//   haicc teardown [<swarm>[/<node>]] [--yes]
//                                a node: its own teardown (leave, shut down, its contents
//                                removed; its HAICC kept for a reboot); a swarm: its nodes,
//                                the master last; the root: every swarm, then the swarms'
//                                folders, packages/ and ./haicc (kept: haiccing/, log/,
//                                nodejs/: external downloads are retained). Asked first.
//   haicc fetch <repository>     a repository, with what it requires, into haiccing/
//   haicc list                   the swarms here, their nodes and roles
// From a swarm's launcher (<swarm>/haicc, HAICC_SWARM): the same commands, in
// that swarm (boot <node>, boot: each of its nodes, teardown [<node>], list).
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

const usage = () => { process.stderr.write(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 25).map(l => l.replace(/^\/\/ ?/, '')).join('\n') + '\n'); process.exit(2) }

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
    console.log('  ./haicc boot <swarm>/master   a swarm\'s master: its manager, its own HAICC and package manager')
    console.log('  ./haicc list                  the swarms here, their nodes')
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

// The work folder's own folders and files: not a swarm's name; a swarm's
// own files: not a node's name.
const OWN = ['packages', 'haiccing', 'nodejs', 'log', 'haicc']
const SWARM_OWN = ['haicc', 'swarm.json']
const ROLES = ['master', 'node']
const inSwarm = process.env.HAICC_SWARM || null
// A name made a URI part: lowercase a-z, 0-9, words joined by single '-'.
export const cleanName = raw => raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// A name, cleaned, the change said; null (and why) when nothing is left of it.
function clean (raw, what, own) {
  const n = cleanName(raw || '')
  if (!n) { console.log(`haicc: '${raw ?? ''}': no ${what} name in it (a-z, 0-9)`); return null }
  if (n !== raw) console.log(`The ${what} name '${raw}' is not a URI part (lowercase a-z, 0-9, words joined by single '-'): it is '${n}'.`)
  if (own.includes(n)) { console.log(`haicc: '${n}' is taken by the ${what === 'swarm' ? 'work folder' : 'swarm\'s folder'} itself (${own.join(', ')}): choose another name`); return null }
  return n
}

// What a command names: [swarm, node], from <swarm>[/<node>] or, from a
// swarm's launcher, [<node>]. undefined: not named; null: not a name.
function target (arg) {
  const parts = (arg || '').split('/').filter(Boolean)
  const [rs, rn] = inSwarm ? [inSwarm, parts[0]] : [parts[0], parts[1]]
  const swarm = rs === undefined ? undefined : (inSwarm ? rs : clean(rs, 'swarm', OWN))
  const node = rn === undefined ? undefined : clean(rn, 'node', SWARM_OWN)
  return [swarm, node]
}

const swarmFile = swarm => join(work, swarm, 'swarm.json')
const readSwarm = swarm => existsSync(swarmFile(swarm)) ? JSON.parse(readFileSync(swarmFile(swarm), 'utf8')) : { swarm, nodes: {} }
const writeSwarm = (swarm, v) => { writeFileSync(swarmFile(swarm) + '.new', JSON.stringify(v, null, 2) + '\n'); renameSync(swarmFile(swarm) + '.new', swarmFile(swarm)) }
const swarms = () => readdirSync(work).filter(n => existsSync(join(work, n, 'swarm.json'))).sort()
// A swarm's nodes in the order to take them down: the nodes, then the master.
const downOrder = s => Object.keys(s.nodes).sort((a, b) => (s.nodes[a].role === 'master') - (s.nodes[b].role === 'master') || a.localeCompare(b))

// A swarm's folder, on first use: its launcher (the root's HAICC, in that
// swarm) and its configuration (swarm.json: the host's side of the swarm,
// its nodes here and their roles).
function swarmFolder (swarm) {
  if (existsSync(swarmFile(swarm))) return
  mkdirSync(join(work, swarm), { recursive: true })
  writeFileSync(join(work, swarm, 'haicc'), `#!/bin/sh
# The swarm ${swarm} on this host (written by the root's HAICC): ${swarm}/haicc <command>,
# the root's HAICC in this swarm.
work=$(cd "$(dirname "$0")/.." && pwd)
HAICC_WORK=$work; HAICC_SWARM=${swarm}; export HAICC_WORK HAICC_SWARM
[ -x "$work/nodejs/bin/node" ] && PATH=$work/nodejs/bin:$PATH
exec node "$work/packages/base-package-haicc/pear-full-square/haicc-base-boot/haicc.js" "$@"
`)
  chmodSync(join(work, swarm, 'haicc'), 0o755)
  writeSwarm(swarm, { swarm, nodes: {} })
  console.log(`The swarm ${swarm}: its folder made (${join(work, swarm)}), its launcher ${swarm}/haicc, swarm.json`)
}

// A child HAICC run, its output here as it happens (each line marked), or
// only its last line; its exit code.
async function echoed (cmd, args, env) {
  const child = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
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
  return code
}

// A node's manager: the swarm's folder first, the node added with its
// role; its folder in the work folder's shape, the package manager and
// HAICC copied in whole (fetched first where they are not), its launcher;
// then its own boot (its self-test), as it happens.
async function bootNode (swarm, node) {
  const notMet = CHECKS.filter(c => !c.met(c.observe())).map(c => c.name)
  if (notMet.length) { console.log(`The host is not ready (${notMet.join(', ')}): ./haicc boot first`); return 1 }
  if (existsSync(join(work, swarm)) && !existsSync(swarmFile(swarm))) { console.log(`haicc boot: ${join(work, swarm)} is there, and not a swarm's folder: choose another name`); return 1 }
  swarmFolder(swarm)
  const dir = join(work, swarm, node)
  if (existsSync(dir) && !existsSync(join(dir, 'packages'))) { console.log(`haicc boot ${swarm}/${node}: ${dir} is there, and not a node's manager: choose another name`); return 1 }
  const s = readSwarm(swarm)
  if (!s.nodes[node]) {
    const master = Object.keys(s.nodes).find(n => s.nodes[n].role === 'master')
    const role = flags.role || (master ? 'node' : 'master')
    if (!ROLES.includes(role)) { console.log(`haicc boot: --role=${role}: a role is one of ${ROLES.join(', ')}`); return 2 }
    if (role === 'master' && master) { console.log(`haicc boot: the swarm ${swarm} has its master already (${master})`); return 1 }
    s.nodes[node] = { role }
    writeSwarm(swarm, s)
    console.log(`The swarm ${swarm}: ${node} added, its role ${role} (${swarmFile(swarm)})`)
  }
  console.log(`The node ${swarm}/${node}, its manager (${dir}):`)
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
# HAICC for the node ${swarm}/${node} (written by the root's HAICC): ${swarm}/${node}/haicc <command>,
# the node's own HAICC (installed in its packages/).
work=$(cd "$(dirname "$0")" && pwd)
HAICC_WORK=$work; export HAICC_WORK
[ -x "$work/../../nodejs/bin/node" ] && PATH=$work/../../nodejs/bin:$PATH
exec node "$work/packages/base-package-haicc/pear-full-square/haicc-deployment/haicc.js" "$@"
`)
  chmodSync(join(dir, 'haicc.new'), 0o755)
  renameSync(join(dir, 'haicc.new'), join(dir, 'haicc'))
  console.log(`  written ${join(dir, 'haicc')}`)
  // Its own boot: it logs itself (in its log/); here, echoed as it happens.
  console.log(`Its boot (${swarm}/${node}/haicc boot)${flags['no-echo'] ? ', its outcome only' : ''}:`)
  const code = await echoed(join(dir, 'haicc'), ['boot'], { HAICC_WORK: dir })
  console.log(code === 0 ? `The node ${swarm}/${node}: ready` : `The node ${swarm}/${node}: its boot ended with exit ${code} (its log: ${swarm}/${node}/log/)`)
  return code === 0 ? 0 : 1
}

// A node's teardown: its own HAICC's (it leaves the swarm, shuts its
// container down, removes its contents, keeping its HAICC for a reboot).
async function teardownNode (swarm, node) {
  const dir = join(work, swarm, node)
  if (!existsSync(join(dir, 'haicc'))) { console.log(`The node ${swarm}/${node}: no manager here, nothing to take down`); return 0 }
  console.log(`The node ${swarm}/${node} (${swarm}/${node}/haicc teardown):`)
  const code = await echoed(join(dir, 'haicc'), ['teardown', '--yes'], { HAICC_WORK: dir })
  console.log(code === 0 ? `The node ${swarm}/${node}: torn down (its HAICC kept: ${swarm}/haicc boot ${node} again)` : `The node ${swarm}/${node}: its teardown ended with exit ${code} (its log: ${swarm}/${node}/log/)`)
  return code === 0 ? 0 : 1
}

// A swarm's teardown: its nodes, the master last; stopping at a failure.
async function teardownSwarm (swarm) {
  const s = readSwarm(swarm)
  const order = downOrder(s)
  console.log(`The swarm ${swarm}: its nodes taken down, the master last (${order.join(', ') || 'none'})`)
  for (const node of order) if (await teardownNode(swarm, node)) return 1
  return 0
}

// What a teardown will remove, said; asked once.
async function confirm (what) {
  console.log(`Teardown: ${what}. A plain remove: no way back.`)
  return ask('go ahead')
}

async function teardown (arg) {
  const [swarm, node] = target(arg)
  if (swarm === null || node === null) return 2
  if (swarm && !existsSync(swarmFile(swarm))) { console.log(`haicc teardown: no swarm ${swarm} here`); return 1 }
  if (node) {
    if (!readSwarm(swarm).nodes[node]) { console.log(`haicc teardown: no node ${node} in the swarm ${swarm}`); return 1 }
    if (!(await confirm(`the node ${swarm}/${node}: it leaves the swarm, its container is shut down, its contents removed (its HAICC kept)`))) return 1
    return teardownNode(swarm, node)
  }
  if (swarm) {
    if (!(await confirm(`the swarm ${swarm}: each of its nodes, the master last (their HAICC kept)`))) return 1
    return teardownSwarm(swarm)
  }
  const all = swarms()
  if (!(await confirm(`the root: every swarm (${all.join(', ') || 'none'}), then the swarms' folders, packages/ and ./haicc; kept: haiccing/, log/, nodejs/`))) return 1
  for (const sw of all) if (await teardownSwarm(sw)) { console.log('The root\'s teardown stopped: a swarm could not be taken down (above)'); return 1 }
  const { rmSync } = await import('node:fs')
  for (const sw of all) { rmSync(join(work, sw), { recursive: true, force: true }); console.log(`  removed ${sw}/`) }
  // Last: what runs this command (it is loaded: removing its files is safe).
  rmSync(join(work, 'packages'), { recursive: true, force: true }); console.log('  removed packages/')
  rmSync(join(work, 'haicc'), { force: true }); console.log('  removed ./haicc')
  console.log(`The root: torn down; haiccing/boot sets it up again (kept: haiccing/, log/${existsSync(join(work, 'nodejs')) ? ', nodejs/' : ''})`)
  return 0
}

function list () {
  const all = inSwarm ? [inSwarm] : swarms()
  console.log(`swarms (${work}):${all.length ? '' : ' none yet'}`)
  for (const sw of all) {
    const s = readSwarm(sw)
    console.log(`  ${sw}`)
    for (const n of Object.keys(s.nodes).sort((a, b) => (s.nodes[b].role === 'master') - (s.nodes[a].role === 'master') || a.localeCompare(b))) {
      console.log(`    ${n}  ${s.nodes[n].role}${existsSync(join(work, sw, n, 'haicc')) ? '' : '  (no manager)'}`)
    }
  }
  return 0
}

async function boot (arg) {
  if (!arg && !inSwarm) return (await hostPrerequisites()) ? installFile() : 1
  const [swarm, node] = target(arg)
  if (swarm === null || node === null) return 2
  if (node) return bootNode(swarm, node)
  if (!inSwarm) { console.log(`haicc boot ${swarm}: a node's manager is booted as <swarm>/<node> (e.g. ${swarm}/master)`); return 2 }
  // From a swarm's launcher, no node: each of its nodes, the master first.
  const order = downOrder(readSwarm(swarm)).reverse()
  if (!order.length) { console.log(`The swarm ${swarm}: no nodes yet (${swarm}/haicc boot <node>)`); return 1 }
  for (const n of order) if (await bootNode(swarm, n)) return 1
  return 0
}

try {
  if (verb === 'boot') process.exit(await boot(name))
  else if (verb === 'teardown') process.exit(await teardown(name))
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
  } else if (verb === 'list') process.exit(list())
  else usage()
} catch (err) {
  console.log(`haicc ${verb}: ${err.message}`)
  process.exit(1)
}
