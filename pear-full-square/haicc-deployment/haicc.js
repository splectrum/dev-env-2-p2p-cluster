#!/usr/bin/env node
// haicc: HAICC from the command line, as installed ($HAICC_HOME/bin/haicc).
//   haicc run <project> [--work=<folder>] [--no-open]   its packages installed, the project
//                                                     deployed and started, the browser opened
//   haicc test <project>          its packages' tests (within the package), its state as declared,
//                                 and what it serves answering
//   haicc check|deploy|start|stop|teardown|status|reconcile <project> [--work=<folder>]
//   haicc install <package> [--from=<folder>]       a package, by the package manager
//   haicc list | version
// <project>: a project's folder (with project.json), or its name, looked up
// beside the packages it was installed from ($HAICC_HOME/from): <name> or
// base-<name>. The work folder defaults to $HAICC_HOME/<owner>. Exit 0 when
// done; 1 when not (the output says what is missing); 2 on a bad call.
import process from 'node:process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { openDeployment, haiccHome, packagesFolder } from './index.js'
import { humanText } from './lib/human.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const [verb, name] = argv.filter(a => !a.startsWith('--'))
const home = haiccHome()
const packages = packagesFolder()
const fromFile = join(home, 'from')
const from = flags.from || (existsSync(fromFile) ? readFileSync(fromFile, 'utf8').trim() : null)
const usage = () => { process.stderr.write(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 14).map(l => l.replace(/^\/\/ ?/, '')).join('\n') + '\n'); process.exit(2) }
const pkgm = async () => import(pathToFileURL(join(packages, 'pear-full-square', 'pkgm-base-manager', 'index.js')).href)

function projectFile (p) {
  if (!p) usage()
  for (const c of [p, ...(from ? [join(from, p), join(from, `base-${p}`)] : [])]) if (existsSync(join(c, 'project.json'))) return resolve(c, 'project.json')
  if (p.endsWith('.json') && existsSync(p)) return resolve(p)
  console.log(`no project: ${p} (a folder with project.json${from ? `, or one beside the packages in ${from}` : ''})`)
  process.exit(2)
}

// Its packages first: the providers it names come from them.
async function installPackages (file) {
  const p = JSON.parse(readFileSync(file, 'utf8'))
  const done = []
  for (const n of p.packages || []) done.push(...(await pkgm()).install(n, { from: [dirname(dirname(file)), ...(from ? [from] : [])], into: packages }))
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
  const d = await openDeployment({ project: file, work: flags.work || join(home, owner), packages })
  const result = v === 'check' ? { check: await d.check() } : await d[v]()
  if (v === 'status' && !result.desired.deployed) result.check = await d.check()
  const ok = v === 'status' || v === 'check' ? met(result.check)
    : result.after ? result.failed.length === 0 && result.blocked.length === 0 && met(result.after)
      : [result.stopped, result.removed].every(x => !x || x.failed.length === 0)
  console.log(humanText({ verb: v, project: d.project.owner, work: d.work, ok, result }))
  return { ok, result, d }
}

const urlsOf = result => [...(result.after || result.check || [])].map(c => c.detail?.url).filter(Boolean)

try {
  if (verb === 'version') {
    const reg = existsSync(packages) ? (await pkgm()).installed(packages) : { packages: {} }
    console.log(`haicc, from ${packages}`)
    for (const [n, p] of Object.entries(reg.packages)) console.log(`  ${n}: ${p.hash.slice(0, 12)}${p.overrides ? ' (overridden)' : ''}`)
  } else if (verb === 'list') {
    const reg = (await pkgm()).installed(packages)
    for (const [n, p] of Object.entries(reg.packages)) console.log(`${n}  ${p.hash.slice(0, 12)}  ${p.from}`)
  } else if (verb === 'install') {
    if (!name || !from) usage()
    for (const d of (await pkgm()).install(name, { from, into: packages })) console.log(`  ${d.package}: ${d.action}`)
  } else if (verb === 'run') {
    const file = projectFile(name)
    await installPackages(file)
    const { ok, result } = await lifecycle('start', file)
    const url = urlsOf(result)[0]
    if (ok && url) { openBrowser(url); console.log(`\nopen ${url}`) }
    process.exit(ok ? 0 : 1)
  } else if (verb === 'test') {
    const file = projectFile(name)
    const p = JSON.parse(readFileSync(file, 'utf8'))
    let ok = true
    // Its packages' tests, within the package (the project's own first).
    for (const n of p.packages || []) {
      const t = (await pkgm()).testPackage(n, { into: packages })
      for (const r of t.runs) console.log(`  ${r.ok ? 'ok    ' : 'FAILED'} ${n}: ${r.what} (${r.pass}/${r.tests})${r.ok ? '' : '\n' + r.output}`)
      ok = ok && t.ok
    }
    // Its state as declared, and what it serves answering.
    const s = await lifecycle('status', file)
    ok = ok && s.ok && s.result.desired.running
    if (!s.result.desired.running) console.log('  not running: haicc run first')
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
