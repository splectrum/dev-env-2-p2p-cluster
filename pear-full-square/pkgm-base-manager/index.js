// The package manager: from packages made (never making them: that is the
// development environment's, the other side of the airgap) into a swarm's
// package repository on its master. Node's built-ins only.
//   assemble({ from, swarm, into })   a swarm's codebase: its reference
//        list (swarms/<swarm>/modules.json) and what those use, taken from
//        the package's modules/, into the repository `into` (whole or
//        nothing: staged beside it, then moved in place); contents.json
//        says what is there and where it came from
//   testPackage(dir)   a package's (or a repository's) tests, bottom up:
//        its modules' own, its swarms', its named tests (test/<test>/test);
//        each run stopped and failed after `timeout` (10 minutes)
//   contentsOf(dir)    a repository's contents.json, or null
// A package's structure: notes/packages.md, "Packages, platforms, swarms
// and tests".
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync, statSync, symlinkSync } from 'node:fs'
import { join, dirname, resolve, relative, basename } from 'node:path'
import { spawnSync } from 'node:child_process'
import { walk, copy, hashTree, remove } from './lib/tree.js'
import { closure, oursIn } from './lib/closure.js'

const readJson = f => JSON.parse(readFileSync(f, 'utf8'))
const writeJson = (f, v) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f + '.tmp', JSON.stringify(v, null, 2) + '\n'); renameSync(f + '.tmp', f) }
export const manifest = dir => existsSync(join(dir, 'package.json')) ? readJson(join(dir, 'package.json')).pkgm || null : null
export const contentsOf = dir => existsSync(join(dir, 'contents.json')) ? readJson(join(dir, 'contents.json')) : null

// ---- a swarm's codebase into its master's package repository -------------

export function assemble ({ from, swarm, into, log = () => {} }) {
  from = resolve(from); into = resolve(into)
  const m = manifest(from)
  if (!m) throw new Error(`${from}: not a package (no package.json with pkgm)`)
  const list = join(from, 'swarms', swarm, 'modules.json')
  if (!existsSync(list)) throw new Error(`${basename(from)} has no swarm ${swarm} (swarms/${swarm}/modules.json)`)
  const start = readJson(list).modules || []
  const modules = join(from, 'modules')
  const ours = oursIn(modules)
  const set = closure({ ours, third: join(modules, 'node_modules'), start })
  const lost = set.missing.filter(x => x.from === '(start)')
  if (lost.length) throw new Error(`${basename(from)}: swarms/${swarm}/modules.json names what the package does not hold: ${lost.map(x => x.name).join(', ')}`)
  const stage = `${into}.assembling`
  remove(stage)
  const byPath = new Map([...ours.values()].map(o => [o.path, o]))
  for (const p of set.ours) copy(byPath.get(p).dir, join(stage, 'modules', p))
  for (const t of set.third) copy(join(modules, 'node_modules', t), join(stage, 'modules', 'node_modules', t))
  for (const [n, o] of ours) {
    if (!set.ours.includes(o.path)) continue
    const link = join(stage, 'modules', 'node_modules', n)
    mkdirSync(dirname(link), { recursive: true })
    symlinkSync(relative(dirname(link), join(stage, 'modules', o.path)), link)
  }
  if (existsSync(join(modules, 'third-party.json'))) {
    const rec = readJson(join(modules, 'third-party.json'))
    writeJson(join(stage, 'modules', 'third-party.json'), { ...rec, modules: rec.modules.filter(r => set.third.includes(r.name)) })
  }
  const hash = hashTree(stage, ['modules'])
  const was = contentsOf(into)
  writeJson(join(stage, 'contents.json'), {
    package: { name: readJson(join(from, 'package.json')).name, hash: m.hash, from },
    swarm,
    modules: { ours: set.ours, third: set.third },
    hash,
    assembled: new Date().toISOString()
  })
  remove(into)
  mkdirSync(dirname(into), { recursive: true })
  renameSync(stage, into)
  const r = { swarm, ours: set.ours.length, third: set.third.length, hash, changed: !was || was.hash !== hash, ...(was && was.hash !== hash ? { was: was.hash } : {}) }
  log({ kind: 'assembled', ...r, hash: hash.slice(0, 12) })
  return r
}

// ---- tests, within the package, bottom up --------------------------------

const executable = f => { try { return (statSync(f).mode & 0o111) !== 0 && statSync(f).isFile() } catch { return false } }

// A set (test/<set>.json): { description, modules: true|false, tests: [...] }.
// Without one: everything that runs in place. A test with a `boot` is booted
// (it needs a work folder: ./haicc boot <repo>/test/<test>): listed, not run here.
export function testSet (dir, set) {
  const f = join(dir, 'test', `${set}.json`)
  if (!existsSync(f)) throw new Error(`${basename(dir)} has no test set ${set} (test/${set}.json)`)
  return readJson(f)
}

export function testPackage (dir, { log = () => {}, env: extra = {}, timeout = 10 * 60 * 1000, set = null } = {}) {
  dir = resolve(dir)
  const chosen = set ? testSet(dir, set) : null
  const booted = []
  const runs = []
  const run = (what, cmd, args, cwd) => {
    const t0 = Date.now()
    // Its own run, even under a test runner (NODE_TEST_CONTEXT would make
    // it report to ours instead).
    const env = { ...process.env, PKGM_ROOT: dir, ...extra }
    delete env.NODE_TEST_CONTEXT
    // A run that does not end is stopped, and fails: it never holds the rest.
    const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024, timeout, killSignal: 'SIGKILL' })
    const out = (r.stdout || '') + (r.stderr || '') + (r.error?.code === 'ETIMEDOUT' ? `\nstopped: no end after ${timeout / 1000} s` : '')
    const count = k => Number((out.match(new RegExp(`^(?:#|ℹ) ${k} (\\d+)`, 'm')) || [])[1] || 0)
    const result = { what, ok: r.status === 0, tests: count('tests'), pass: count('pass'), fail: count('fail'), skipped: count('skipped'), ms: Date.now() - t0, ...(r.status === 0 ? {} : { output: out.split('\n').slice(-40).join('\n') }) }
    log({ kind: 'tested', ...result, output: undefined })
    runs.push(result)
  }
  // The modules' own: each module's "test" script, in its folder.
  if (!chosen || chosen.modules) for (const o of [...oursIn(join(dir, 'modules')).values()].sort((a, b) => a.path.localeCompare(b.path))) {
    const pj = join(o.dir, 'package.json')
    const script = readJson(pj).scripts?.test
    if (script && existsSync(join(o.dir, 'test'))) run(`modules/${o.path}`, 'sh', ['-c', script], o.dir)
  }
  // The swarms': each executable in swarms/<swarm>/test/, in the swarm's folder.
  const swarms = join(dir, 'swarms')
  if (!chosen && existsSync(swarms)) for (const s of readdirSync(swarms).sort()) {
    const t = join(swarms, s, 'test')
    if (existsSync(t)) for (const f of readdirSync(t).sort()) if (executable(join(t, f))) run(`swarms/${s}/test/${f}`, join(t, f), [], join(swarms, s))
  }
  // The named tests run in place: test/<test>/test, in its folder.
  const tests = join(dir, 'test')
  const names = chosen ? chosen.tests || [] : existsSync(tests) ? readdirSync(tests).filter(n => statSync(join(tests, n)).isDirectory()).sort() : []
  for (const n of names) {
    if (executable(join(tests, n, 'boot'))) { booted.push(n); continue }
    if (executable(join(tests, n, 'test'))) run(`test/${n}`, join(tests, n, 'test'), [], join(tests, n))
    else runs.push({ what: `test/${n}`, ok: false, tests: 0, pass: 0, fail: 0, skipped: 0, ms: 0, output: `test/${n}: no test or boot script` })
  }
  return { dir, ok: runs.length > 0 && runs.every(r => r.ok), runs, booted }
}

export { walk, copy, hashTree, closure, oursIn }
