#!/usr/bin/env node
// haicc: HAICC in a manager (<manager>/haicc <command>), the full HAICC,
// copied in by the root's `./haicc boot <manager>`.
//   haicc boot                        the node's boot: the self-test of what was copied
//                                     in (each package's tests, in place); 0 when all pass
//   haicc shutdown                    the node's shutdown: its container removed (with the
//                                     swarm's step); its folder kept, for its boot
// Removing a node is its swarm's: <swarm>/haicc shutdown|teardown <node>.
//   haicc run <project> [--no-open]   fetched (with what it needs), installed, deployed and
//                                     started, the browser opened
//   haicc test <project|package>      a package's tests within the package; a project's: its
//                                     packages', its state as declared, what it serves answering
//   haicc check|deploy|start|stop|teardown|status|reconcile <project>
//   haicc install <package>           a package, fetched and installed by the package manager
//   haicc fetch <repository>          a repository (and what it requires) into haiccing/
//   haicc list | version
// The manager's folder ($HAICC_WORK): packages/ (its packages, whole
// repositories), log/ (its log); the root's haiccing/ beside it. (`run` and
// the lifecycle verbs: being reworked for managers, the swarm's step.)
// <project>: its repository's name, with or without `base-`, or a folder
// with project.json. What every command prints goes to log/ too, in order
// (files of 10 KB named by their start, newest last); --verbose and --debug say more. Every visible state
// change is printed. Exit 0 when done; 1 when not (the output says what is
// missing); 2 on a bad call.
import process from 'node:process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve, dirname, basename } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { openDeployment } from './index.js'
import { humanText } from './lib/human.js'
import { openLog } from './lib/log.js'
import { selfTest } from './lib/selftest.js'
import { journal } from '../haicc-reconcile/lib/journal.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const [verb, name] = argv.filter(a => !a.startsWith('--'))
const work = resolve(process.env.HAICC_WORK || '.')
const packages = join(work, 'packages')
const home = work
const haiccing = existsSync(join(work, 'haiccing')) ? join(work, 'haiccing') : join(dirname(work), 'haiccing')
const manager = join(work, 'manager')
process.env.HAICC_PACKAGES = packages

const log = openLog({ dir: join(work, 'log'), command: ['haicc', ...argv], level: flags.debug ? 'debug' : flags.verbose ? 'verbose' : 'normal' })

const usage = () => { process.stderr.write(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 16).map(l => l.replace(/^\/\/ ?/, '')).join('\n') + '\n'); process.exit(2) }
const pkgm = async () => import(pathToFileURL(join(packages, 'pear-full-square', 'pkgm-base-manager', 'index.js')).href)
const fetchScript = join(packages, 'pear-full-square', 'haicc-base-boot', 'fetch.sh')

// A repository and what it requires, into haiccing/ from the sources.
function fetchRepos (repos) {
  const r = spawnSync('sh', [fetchScript, haiccing, '--requires', ...repos], { encoding: 'utf8', env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` } })
  if (r.stdout) process.stdout.write(r.stdout)
  if (r.status !== 0) { console.log(`haicc ${verb}: not all of ${repos.join(', ')} could be fetched (haiccing/sources)`); process.exit(1) }
}

// A project's repository: given by its folder, or by name (base- or not),
// fetched from the sources if it is not in haiccing/ yet.
function projectFile (p) {
  if (!p) usage()
  if (existsSync(join(p, 'project.json'))) return resolve(p, 'project.json')
  const repo = p.startsWith('base-') ? p : `base-${p}`
  if (!existsSync(join(haiccing, repo, 'project.json'))) fetchRepos([repo])
  if (existsSync(join(haiccing, repo, 'project.json'))) return join(haiccing, repo, 'project.json')
  console.log(`no project: ${p} (${repo} in haiccing/ has no project.json)`)
  process.exit(2)
}

// Its packages first, with what they require: the providers it names come from them.
async function installPackages (file) {
  const p = JSON.parse(readFileSync(file, 'utf8'))
  fetchRepos([basename(dirname(file))])
  const done = []
  for (const n of p.packages || []) done.push(...(await pkgm()).install(n, { from: haiccing, into: packages }))
  for (const d of done.filter(d => d.action !== 'current')) console.log(`  ${d.action} package ${d.package}`)
  return p
}

function openBrowser (url) {
  if (flags['no-open']) return
  const wsl = existsSync('/proc/version') && /microsoft/i.test(readFileSync('/proc/version', 'utf8'))
  if (wsl) spawnSync('cmd.exe', ['/c', 'start', url], { stdio: 'ignore' })
  else if (process.env.DISPLAY || process.env.WAYLAND_DISPLAY) spawnSync('xdg-open', [url], { stdio: 'ignore' })
}

const met = xs => (xs || []).every(x => x.status === 'met' || x.status === 'extra')

async function lifecycle (v, file) {
  const owner = JSON.parse(readFileSync(file, 'utf8')).owner
  const d = await openDeployment({ project: file, work: join(manager, owner), packages, from: haiccing })
  const result = v === 'check' ? { check: await d.check() } : await d[v]()
  if (v === 'status' && !result.desired.deployed) result.check = await d.check()
  const ok = v === 'status' || v === 'check' ? met(result.check)
    : result.after ? result.failed.length === 0 && result.blocked.length === 0 && met(result.after)
      : [result.stopped, result.removed].every(x => !x || x.failed.length === 0)
  console.log(humanText({ verb: v, project: d.project.owner, work: d.work, ok, result }))
  return { ok, result, d }
}

const urlsOf = result => [...(result.after || result.check || [])].map(c => c.detail?.url).filter(Boolean)

function printTest (n, t) {
  for (const r of t.runs) console.log(`  ${r.ok ? 'ok    ' : 'FAILED'} ${n}: ${r.what} (${r.pass}/${r.tests})${r.ok ? '' : '\n' + r.output}`)
  return t.ok
}

try {
  if (verb === 'shutdown') {
    // The node's shutdown: its container removed; its folder kept (its
    // HAICC, its log, its state), for its boot to start it again.
    console.log(`The node ${basename(dirname(work))}/${basename(work)}: its shutdown`)
    console.log('  its container: none yet (nothing deployed here), nothing to remove')
    console.log('Shut down')
    process.exit(0)
  } else if (verb === 'boot') {
    // The node's boot: what was copied in, tested in place; then its
    // container started (with the swarm's step: none yet).
    console.log(`The node ${basename(dirname(work))}/${basename(work)}: the self-test of its packages (${packages})`)
    const t = selfTest(packages)
    const failed = t.runs.filter(r => !r.ok)
    if (!t.repos.length) console.log('  no packages here: nothing to test')
    console.log(t.ok ? `Ready: ${t.runs.length} test runs passed (${t.repos.join(', ')})` : `Not ready: ${failed.length} of ${t.runs.length} test runs failed`)
    if (t.ok) console.log('  its container: none yet (nothing deployed here), nothing to start')
    process.exit(t.ok ? 0 : 1)
  } else if (verb === 'version') {
    const reg = (await pkgm()).installed(packages)
    console.log(`haicc, the work folder ${work}`)
    for (const [n, p] of Object.entries(reg.packages)) console.log(`  ${n}: ${p.hash.slice(0, 12)}${p.overrides ? ' (overridden)' : ''}`)
  } else if (verb === 'list') {
    const reg = (await pkgm()).installed(packages)
    console.log(`installed (${packages}):`)
    for (const [n, p] of Object.entries(reg.packages)) console.log(`  ${n}  ${p.hash.slice(0, 12)}${p.overrides ? '  overridden' : ''}`)
    const deployments = existsSync(manager) ? readdirSync(manager).filter(n => existsSync(join(manager, n, 'deployment'))) : []
    console.log(`deployments (${manager}):${deployments.length ? '' : ' none'}`)
    const { desiredOf } = await import('./index.js')
    for (const n of deployments) {
      const w = desiredOf(journal(join(manager, n, 'deployment', 'lifecycle.jsonl')).read())
      console.log(`  ${n}  ${w.running ? 'running' : w.deployed ? 'deployed' : 'nothing'}${w.last ? ` (last: ${w.last})` : ''}`)
    }
  } else if (verb === 'fetch') {
    if (!name) usage()
    fetchRepos([name])
  } else if (verb === 'install') {
    if (!name) usage()
    fetchRepos([`base-package-${name}`])
    for (const d of (await pkgm()).install(name, { from: haiccing, into: packages })) console.log(`  ${d.package}: ${d.action}`)
  } else if (verb === 'run') {
    const file = projectFile(name)
    await installPackages(file)
    const { ok, result } = await lifecycle('start', file)
    const url = urlsOf(result)[0]
    if (ok && url) { openBrowser(url); console.log(`\nopen ${url}`) }
    process.exit(ok ? 0 : 1)
  } else if (verb === 'test') {
    if (!name) usage()
    const reg = (await pkgm()).installed(packages)
    // A package: its modules' tests and its own, within the package.
    if (reg.packages[name]) {
      const ok = printTest(name, (await pkgm()).testPackage(name, { into: packages }))
      console.log(ok ? `test ${name}: passed` : `test ${name}: FAILED`)
      process.exit(ok ? 0 : 1)
    }
    // A project: its packages' tests, its state as declared, what it serves answering.
    const file = projectFile(name)
    const p = JSON.parse(readFileSync(file, 'utf8'))
    let ok = true
    for (const n of p.packages || []) ok = printTest(n, (await pkgm()).testPackage(n, { into: packages })) && ok
    const s = await lifecycle('status', file)
    ok = ok && s.ok && s.result.desired.running
    if (!s.result.desired.running) console.log('  not running: ./haicc run first')
    for (const url of urlsOf(s.result)) {
      const r = await fetch(url).then(r => r.status, () => 'no answer')
      console.log(`  ${r === 200 ? 'ok    ' : 'FAILED'} ${url}: ${r}`)
      ok = ok && r === 200
    }
    console.log(ok ? `test ${p.owner}: passed` : `test ${p.owner}: FAILED`)
    process.exit(ok ? 0 : 1)
  } else if (['check', 'deploy', 'start', 'stop', 'teardown', 'status', 'reconcile'].includes(verb)) {
    const file = projectFile(name)
    if (verb === 'deploy' || verb === 'start') await installPackages(file)
    const { ok, result } = await lifecycle(verb, file)
    if (verb === 'start' && ok && urlsOf(result)[0]) openBrowser(urlsOf(result)[0])
    process.exit(ok ? 0 : 1)
  } else usage()
} catch (err) {
  console.log(`haicc ${verb}: ${err.message}`)
  process.exit(1)
}
