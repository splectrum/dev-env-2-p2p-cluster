#!/usr/bin/env node
// haicc at the root of a work folder (./haicc): the part of HAICC the host
// needs, run from packages/base-package-haicc (copied in by ./boot,
// stage 1). Node.js built-ins only. The work folder: HAICC_WORK.
// Each `haicc boot` or `haicc shutdown` works on the configuration of the folder
// it is called from, and keeps it; removing a child is `teardown <child>`.
// At the root (./haicc), on swarms.json, the host's swarms:
//   haicc boot [--yes]           the host's prerequisites (git, Docker Engine), checked
//                                and fixed with a yes; each swarm in swarms.json booted;
//                                then haiccing/install, if there, or the next commands
//   haicc boot <swarm>           the swarm: added (its folder, launcher, nodes.json) if new,
//                                then booted
//   haicc shutdown [<swarm>]     each swarm's (or the one's) shutdown: its nodes removed,
//                                its folder and nodes.json kept
//   haicc teardown <swarm>       the swarm removed: its nodes, its folder, its entry
//   haicc shutdown --cold        (./shutdown) everything removed back to the setup: the
//                                swarms, swarms.json, packages/, ./haicc; kept: haiccing/,
//                                log/, nodejs/ (external downloads are retained)
// In a swarm (<swarm>/haicc), on its nodes.json, its nodes and roles:
//   haicc boot [<node>] [--role=master|node] [--no-echo]
//                                each node (or the one: added if new, the first the
//                                master), built if its folder is not there (its manager:
//                                the package manager and HAICC copied in, its launcher),
//                                then its own boot (<swarm>/<node>/haicc boot), as it happens
//   haicc shutdown [<node>]      each node's (or the one's) cold shutdown: its container
//                                removed, its folder removed; nodes.json kept
//   haicc teardown <node>        the node removed, and its entry
// Both: haicc fetch <repository> (into haiccing/, with what it requires), haicc list.
// Removing is asked first (--yes agrees). Names are made URI parts, the changes said.
// --verbose: each check's detail too. What every command prints goes to
// log/ as well, in order (files of 10 KB named by their start, newest last). Exit 0 when done,
// 1 when not (the output says what is missing), 2 on a bad call.
import process from 'node:process'
import { existsSync, readFileSync, openSync, closeSync, createReadStream, createWriteStream, mkdirSync, writeFileSync, chmodSync, renameSync, rmSync } from 'node:fs'
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
// A swarm's command run by the root (the root echoes and logs every line of
// it: HAICC_NOLOG) does not log itself; typed, it does.
const level = flags.debug ? 'debug' : flags.verbose ? 'verbose' : 'normal'
const log = process.env.HAICC_NOLOG === '1' ? { level, verbose: level !== 'normal', debug: level === 'debug' } : openLog({ dir: join(work, 'log'), command: flags.cold ? ['./shutdown', ...argv.filter(a => a !== 'shutdown' && a !== '--cold')] : [process.env.HAICC_SWARM ? `${process.env.HAICC_SWARM}/haicc` : 'haicc', ...argv], level })

const usage = () => { process.stderr.write(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 33).map(l => l.replace(/^\/\/ ?/, '')).join('\n') + '\n'); process.exit(2) }

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
    console.log('  ./haicc boot <swarm>          a swarm: its folder, launcher and nodes.json')
    console.log('  <swarm>/haicc boot master     its master: a node\'s manager, its own HAICC')
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
const OWN = ['packages', 'haiccing', 'nodejs', 'log', 'haicc', 'boot', 'shutdown', 'swarms.json']
const SWARM_OWN = ['haicc', 'nodes.json']
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

// The configurations: swarms.json (the host's swarms, in order), and each
// swarm's nodes.json (its nodes here and their roles).
const jsonFile = {
  read: (f, empty) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : empty,
  write: (f, v) => { writeFileSync(f + '.new', JSON.stringify(v, null, 2) + '\n'); renameSync(f + '.new', f) }
}
const swarmsFile = join(work, 'swarms.json')
const readSwarms = () => jsonFile.read(swarmsFile, { swarms: {} })
const nodesFile = swarm => join(work, swarm, 'nodes.json')
const readNodes = swarm => jsonFile.read(nodesFile(swarm), { swarm, nodes: {} })
// A swarm's nodes in the order to take them down: the nodes, then the master.
const downOrder = s => Object.keys(s.nodes).sort((a, b) => (s.nodes[a].role === 'master') - (s.nodes[b].role === 'master') || a.localeCompare(b))

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

// Removing is asked once, by the command the person typed (its children
// are told --yes).
async function confirm (what) {
  console.log(`${what}. A plain remove: no way back.`)
  return ask('go ahead')
}

const hostReady = () => {
  const notMet = CHECKS.filter(c => !c.met(c.observe())).map(c => c.name)
  if (notMet.length) console.log(`The host is not ready (${notMet.join(', ')}): ./haicc boot first`)
  return !notMet.length
}

// ---- a swarm, from its folder: on nodes.json ----------------------------

// A node built if its folder is not there (its manager: the package manager
// and HAICC copied in whole, its launcher); then its own boot, as it happens.
async function bootNode (swarm, node) {
  const dir = join(work, swarm, node)
  if (existsSync(dir) && !existsSync(join(dir, 'packages'))) { console.log(`The node ${swarm}/${node}: ${dir} is there, and not a node's manager`); return 1 }
  console.log(`The node ${swarm}/${node} (${readNodes(swarm).nodes[node]?.role}), its manager (${dir}):`)
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
  if (!existsSync(join(dir, 'haicc'))) {
    writeFileSync(join(dir, 'haicc.new'), `#!/bin/sh
# HAICC for the node ${swarm}/${node} (written by its swarm's HAICC): ${swarm}/${node}/haicc <command>,
# the node's own HAICC (installed in its packages/).
work=$(cd "$(dirname "$0")" && pwd)
HAICC_WORK=$work; export HAICC_WORK
[ -x "$work/../../nodejs/bin/node" ] && PATH=$work/../../nodejs/bin:$PATH
exec node "$work/packages/base-package-haicc/pear-full-square/haicc-deployment/haicc.js" "$@"
`)
    chmodSync(join(dir, 'haicc.new'), 0o755)
    renameSync(join(dir, 'haicc.new'), join(dir, 'haicc'))
    console.log(`  written ${join(dir, 'haicc')}`)
  }
  console.log(`Its boot (${swarm}/${node}/haicc boot)${flags['no-echo'] ? ', its outcome only' : ''}:`)
  const code = await echoed(join(dir, 'haicc'), ['boot'], { HAICC_WORK: dir, HAICC_NOLOG: '' })
  console.log(code === 0 ? `The node ${swarm}/${node}: up` : `The node ${swarm}/${node}: its boot ended with exit ${code} (its log: ${swarm}/${node}/log/)`)
  return code === 0 ? 0 : 1
}

// A node's cold shutdown: its own shutdown (its container removed), then
// its folder removed.
async function removeNode (swarm, node) {
  const dir = join(work, swarm, node)
  if (!existsSync(dir)) { console.log(`The node ${swarm}/${node}: not here (nothing to remove)`); return 0 }
  if (existsSync(join(dir, 'haicc'))) {
    console.log(`The node ${swarm}/${node} (${swarm}/${node}/haicc shutdown):`)
    const code = await echoed(join(dir, 'haicc'), ['shutdown'], { HAICC_WORK: dir, HAICC_NOLOG: '' })
    if (code !== 0) { console.log(`The node ${swarm}/${node}: its shutdown ended with exit ${code}: not removed (its log: ${swarm}/${node}/log/)`); return 1 }
  }
  rmSync(dir, { recursive: true, force: true })
  console.log(`  removed ${swarm}/${node}/`)
  return 0
}

async function swarmBoot (swarm, node) {
  const s = readNodes(swarm)
  if (node) {
    if (!s.nodes[node]) {
      if (!hostReady()) return 1
      const master = Object.keys(s.nodes).find(n => s.nodes[n].role === 'master')
      const role = flags.role || (master ? 'node' : 'master')
      if (!ROLES.includes(role)) { console.log(`haicc boot: --role=${role}: a role is one of ${ROLES.join(', ')}`); return 2 }
      if (role === 'master' && master) { console.log(`haicc boot: the swarm ${swarm} has its master already (${master})`); return 1 }
      s.nodes[node] = { role }
      jsonFile.write(nodesFile(swarm), s)
      console.log(`The swarm ${swarm}: ${node} added to nodes.json, its role ${role}`)
    }
    return bootNode(swarm, node)
  }
  // Each node in nodes.json, the master first.
  const order = downOrder(s).reverse()
  console.log(`The swarm ${swarm}: its nodes booted, the master first (${order.join(', ') || 'none in nodes.json'})`)
  for (const n of order) if (await bootNode(swarm, n)) return 1
  return 0
}

async function swarmShutdown (swarm, node, { asked = false } = {}) {
  const s = readNodes(swarm)
  if (node) {
    if (!s.nodes[node]) { console.log(`haicc shutdown: no node ${node} in the swarm ${swarm}`); return 1 }
    if (!asked && !(await confirm(`The node ${swarm}/${node}: its cold shutdown, its container and its folder removed (kept in nodes.json)`))) return 1
    return removeNode(swarm, node)
  }
  const order = downOrder(s)
  if (!asked && !(await confirm(`The swarm ${swarm}: its nodes' cold shutdown, the master last (${order.join(', ') || 'none'}): their folders removed; kept: nodes.json`))) return 1
  console.log(`The swarm ${swarm}: its nodes shut down, the master last (${order.join(', ') || 'none'})`)
  for (const n of order) if (await removeNode(swarm, n)) return 1
  return 0
}

async function swarmTeardown (swarm, node) {
  const s = readNodes(swarm)
  if (!s.nodes[node]) { console.log(`haicc teardown: no node ${node} in the swarm ${swarm}`); return 1 }
  if (!(await confirm(`The node ${swarm}/${node} removed: its container, its folder, its entry in nodes.json`))) return 1
  if (await removeNode(swarm, node)) return 1
  delete s.nodes[node]
  jsonFile.write(nodesFile(swarm), s)
  console.log(`The swarm ${swarm}: ${node} removed from nodes.json`)
  return 0
}

// ---- the root: on swarms.json ------------------------------------------------

// A swarm's folder, on first use: its launcher (the root's HAICC, in that
// swarm) and nodes.json; its entry in swarms.json.
function addSwarm (swarm) {
  const all = readSwarms()
  if (!all.swarms[swarm]) { all.swarms[swarm] = {}; jsonFile.write(swarmsFile, all); console.log(`The host: ${swarm} added to swarms.json`) }
  if (existsSync(nodesFile(swarm))) return
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
  jsonFile.write(nodesFile(swarm), { swarm, nodes: {} })
  console.log(`The swarm ${swarm}: its folder made (${join(work, swarm)}): its launcher ${swarm}/haicc, nodes.json`)
}

// A swarm's own command, through its launcher (it logs in the root's log too).
const inSwarmRun = (swarm, args) => echoed(join(work, swarm, 'haicc'), args, { HAICC_WORK: work, HAICC_SWARM: swarm, HAICC_NOLOG: '1' })

async function rootBoot (swarm) {
  if (swarm) {
    if (existsSync(join(work, swarm)) && !existsSync(nodesFile(swarm))) { console.log(`haicc boot: ${join(work, swarm)} is there, and not a swarm's folder: choose another name`); return 1 }
    if (!hostReady()) return 1
    addSwarm(swarm)
    console.log(`The swarm ${swarm} (${swarm}/haicc boot):`)
    return (await inSwarmRun(swarm, ['boot', ...(flags['no-echo'] ? ['--no-echo'] : [])])) ? 1 : 0
  }
  if (!(await hostPrerequisites())) return 1
  const all = Object.keys(readSwarms().swarms)
  if (all.length) {
    console.log(`The host's swarms (swarms.json): ${all.join(', ')}`)
    for (const sw of all) {
      console.log(`The swarm ${sw} (${sw}/haicc boot):`)
      if (await inSwarmRun(sw, ['boot', ...(flags['no-echo'] ? ['--no-echo'] : [])])) { console.log(`The host's boot stopped at the swarm ${sw}`); return 1 }
    }
  }
  return installFile()
}

async function rootShutdown (swarm) {
  const all = swarm ? [swarm] : Object.keys(readSwarms().swarms).reverse()
  if (swarm && !readSwarms().swarms[swarm]) { console.log(`haicc shutdown: no swarm ${swarm} here (swarms.json)`); return 1 }
  if (!(await confirm(`${swarm ? `The swarm ${swarm}` : `The host's swarms (${all.join(', ') || 'none'})`}: their nodes' cold shutdown, their folders removed; kept: each swarm's folder and nodes.json, swarms.json`))) return 1
  for (const sw of all) {
    console.log(`The swarm ${sw} (${sw}/haicc shutdown):`)
    if (await inSwarmRun(sw, ['shutdown', '--yes'])) return 1
  }
  return 0
}

async function rootTeardown (swarm) {
  const all = readSwarms()
  if (!all.swarms[swarm] && !existsSync(nodesFile(swarm))) { console.log(`haicc teardown: no swarm ${swarm} here`); return 1 }
  if (!(await confirm(`The swarm ${swarm} removed: its nodes' cold shutdown, its folder, its entry in swarms.json`))) return 1
  if (existsSync(join(work, swarm, 'haicc'))) {
    console.log(`The swarm ${swarm} (${swarm}/haicc shutdown):`)
    if (await inSwarmRun(swarm, ['shutdown', '--yes'])) return 1
  }
  rmSync(join(work, swarm), { recursive: true, force: true })
  console.log(`  removed ${swarm}/`)
  delete all.swarms[swarm]
  jsonFile.write(swarmsFile, all)
  console.log(`The host: ${swarm} removed from swarms.json`)
  return 0
}

// The cold shutdown (./shutdown): every swarm removed, then the root's own,
// back to the setup.
async function coldShutdown () {
  const all = Object.keys(readSwarms().swarms).reverse()
  if (!(await confirm(`The work folder, cold: every swarm (${all.join(', ') || 'none'}), swarms.json, packages/ and ./haicc removed; kept: haiccing/, log/, nodejs/ (./boot sets it up again)`))) return 1
  for (const sw of all) {
    if (existsSync(join(work, sw, 'haicc'))) {
      console.log(`The swarm ${sw} (${sw}/haicc shutdown):`)
      if (await inSwarmRun(sw, ['shutdown', '--yes'])) { console.log('The cold shutdown stopped: a swarm could not be shut down (above)'); return 1 }
    }
    rmSync(join(work, sw), { recursive: true, force: true }); console.log(`  removed ${sw}/`)
  }
  rmSync(swarmsFile, { force: true }); console.log('  removed swarms.json')
  // Last: what runs this command (it is loaded: removing its files is safe).
  rmSync(join(work, 'packages'), { recursive: true, force: true }); console.log('  removed packages/')
  rmSync(join(work, 'haicc'), { force: true }); console.log('  removed ./haicc')
  console.log(`The work folder: shut down, cold (kept: haiccing/, log/${existsSync(join(work, 'nodejs')) ? ', nodejs/' : ''}); ./boot sets it up again`)
  return 0
}

function list () {
  const all = inSwarm ? [inSwarm] : Object.keys(readSwarms().swarms)
  console.log(`swarms (${inSwarm ? `${work}/${inSwarm}` : `${work}, swarms.json`}):${all.length ? '' : ' none yet'}`)
  for (const sw of all) {
    const s = readNodes(sw)
    console.log(`  ${sw}`)
    for (const n of downOrder(s).reverse()) console.log(`    ${n}  ${s.nodes[n].role}${existsSync(join(work, sw, n, 'haicc')) ? '' : '  (not built: shut down)'}`)
  }
  return 0
}

// What a command names: a swarm (at the root) or a node (in a swarm); null:
// not a name.
const named = arg => arg === undefined ? undefined : (inSwarm ? clean(arg, 'node', SWARM_OWN) : clean(arg, 'swarm', OWN))

try {
  const n = named(name)
  if (n === null) process.exit(2)
  if (verb === 'boot') process.exit(inSwarm ? await swarmBoot(inSwarm, n) : await rootBoot(n))
  else if (verb === 'shutdown') {
    if (flags.cold && !inSwarm && !n) process.exit(await coldShutdown())
    process.exit(inSwarm ? await swarmShutdown(inSwarm, n, { asked: Boolean(flags.yes) }) : await rootShutdown(n))
  } else if (verb === 'teardown') {
    if (!n) { console.log(`haicc teardown <${inSwarm ? 'node' : 'swarm'}>: which ${inSwarm ? 'node' : 'swarm'} to remove`); process.exit(2) }
    process.exit(inSwarm ? await swarmTeardown(inSwarm, n) : await rootTeardown(n))
  } else if (verb === 'fetch') {
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
