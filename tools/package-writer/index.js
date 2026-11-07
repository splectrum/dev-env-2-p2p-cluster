// The package writer: haiccing's packages written. The development
// environment's side of the airgap (never shipped; the package manager only installs and tests
// packages made). From this repository's modules and packages.json, each
// package written whole, in the package structure (notes/packages.md,
// "Packages, platforms, swarms and tests"):
//   <repo>/package.json  README.md
//   <repo>/modules/<org>/<module>/      ours: the definition's, its swarms'
//                                       (modules.json), and what they use
//   <repo>/modules/node_modules/        the third-party code they use, all
//                                       the way down; links to ours by name
//   <repo>/modules/third-party.json     the record: each, its version,
//                                       licence, integrity, where from
//   <repo>/swarms/ platform/ test/      hand-written, from haiccing/<repo>/
//   <repo>/test/modules-load/           written here: every module loads
// Self-contained: no requires; a package carries what it runs on. All are
// staged and tested (the package manager's test, bottom up) before any is
// written; then each into its repository's folder in `out` (.git kept).
//   writePackages({ dev, out, only, keep, log })
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, lstatSync, symlinkSync, mkdtempSync, chmodSync } from 'bare-fs'
import { join, dirname, resolve, relative } from 'bare-path'
import os, { tmpdir } from 'bare-os'
import { fileURLToPath } from 'bare-url'
import { closure } from '../../pear-full-square/pkgm-base-manager/lib/closure.js'
import { copy, hashTree, remove } from '../../pear-full-square/pkgm-base-manager/lib/tree.js'
import { testPackage } from '../../pear-full-square/pkgm-base-manager/index.js'
import process from 'bare-process'

const here = dirname(fileURLToPath(import.meta.url))
const ORG = 'haiccing'
const readJson = f => JSON.parse(readFileSync(f, 'utf8'))
const writeJson = (f, v) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(v, null, 2) + '\n') }
const platform = () => `${os.platform()}-${os.arch()}`
export const repoOf = (name, def) => def.repo || `base-package-${name}`
const entry = m => typeof m === 'string' ? { path: m, from: m } : m

// Our modules, by the name they are imported by: every module any
// definition names (a module from elsewhere: { path, from }).
export function oursOf (dev, defs) {
  const ours = new Map()
  for (const def of Object.values(defs.packages)) {
    for (const m of (def.modules || []).map(entry)) {
      const pj = readJson(join(dev, m.from, 'package.json'))
      ours.set(pj.name || m.path.split('/')[1], { path: m.path, dir: join(dev, m.from) })
    }
  }
  return ours
}

// The swarms' codebases, as written by hand: swarms/<swarm>/modules.json,
// in the package and in its named tests.
function swarmModules (hand) {
  const lists = []
  const visit = d => {
    if (!existsSync(join(d, 'swarms'))) return
    for (const s of readdirSync(join(d, 'swarms'))) if (existsSync(join(d, 'swarms', s, 'modules.json'))) lists.push(...readJson(join(d, 'swarms', s, 'modules.json')).modules)
  }
  if (!existsSync(hand)) return lists
  visit(hand)
  if (existsSync(join(hand, 'test'))) for (const t of readdirSync(join(hand, 'test'))) visit(join(hand, 'test', t))
  return lists
}

// What a package starts from: its definition's modules, those of the
// definitions it is written with (`with`: a convenience of this tool, not a
// requirement at run time), and its swarms'.
export function startOf (dev, defs, name) {
  const def = defs.packages[name]
  const start = new Set((def.modules || []).map(m => entry(m).path))
  for (const w of def.with || []) for (const m of defs.packages[w].modules || []) start.add(entry(m).path)
  for (const p of swarmModules(join(dev, ORG, repoOf(name, def)))) start.add(p)
  return [...start]
}

// Third-party code as shipped: no tests, no .bin, this platform's prebuilds only.
const skipThird = (r, base) => base === 'test' || base === '.bin' || (r.split('/').at(-2) === 'prebuilds' && base !== platform())
// Not a module's: its dependencies, git, records, and a log/ a run there left.
const skipOurs = (r, base) => base === 'node_modules' || base === '.git' || base === 'record' || r === 'log'

function stage (dev, defs, name, ours, lock, dir) {
  const def = defs.packages[name]
  const repo = repoOf(name, def)
  // brittle too: the package's own tests run on it (test/modules-load, written here).
  const set = closure({ ours, third: join(dev, 'node_modules'), start: startOf(dev, defs, name), also: ['brittle'] })
  const byPath = new Map([...ours.values()].map(m => [m.path, m]))
  for (const p of set.ours) copy(byPath.get(p).dir, join(dir, 'modules', p), { skip: skipOurs })
  for (const t of set.third) copy(join(dev, 'node_modules', t), join(dir, 'modules', 'node_modules', t), { skip: skipThird })
  // Ours found by name: modules/node_modules/<name> -> ../<org>/<module>.
  for (const [n, m] of ours) {
    if (!set.ours.includes(m.path)) continue
    const link = join(dir, 'modules', 'node_modules', n)
    mkdirSync(dirname(link), { recursive: true })
    symlinkSync(relative(dirname(link), join(dir, 'modules', m.path)), link)
  }
  if (set.third.length) {
    const record = []
    for (const t of set.third) {
      const e = lock.packages[`node_modules/${t}`] || {}
      const pj = readJson(join(dev, 'node_modules', t, 'package.json'))
      record.push({ name: t, version: pj.version, license: pj.license || e.license || null, resolved: e.resolved || null, integrity: e.integrity || null })
    }
    writeJson(join(dir, 'modules', 'third-party.json'), { platform: platform(), modules: record })
  }
  // The hand-written parts: haiccing/<repo>/ as it is.
  const hand = join(dev, ORG, repo)
  if (existsSync(hand)) for (const n of readdirSync(hand)) if (!['package.json', 'modules', '.git'].includes(n)) copy(join(hand, n), join(dir, n))
  // The package's own named test, written here: every module loads.
  copy(join(here, 'modules-load'), join(dir, 'test', 'modules-load'))
  chmodSync(join(dir, 'test', 'modules-load', 'test'), 0o755)
  // Bare's runtime, when the package carries it: executable (npm keeps no exec bit).
  const rt = join(dir, 'modules', 'node_modules', `bare-runtime-${platform()}`, 'bin', 'bare')
  if (existsSync(rt)) chmodSync(rt, 0o755)
  const tops = readdirSync(dir).filter(n => n !== 'package.json' && n !== 'README.md' && n !== '.git').sort()
  const has = n => existsSync(join(dir, n))
  const pkgm = {
    package: name,
    modules: { ours: set.ours, third: set.third.length },
    swarms: has('swarms') ? readdirSync(join(dir, 'swarms')).sort() : [],
    tests: readdirSync(join(dir, 'test')).filter(n => lstatSync(join(dir, 'test', n)).isDirectory()).sort(),
    sets: readdirSync(join(dir, 'test')).filter(n => n.endsWith('.json')).map(n => n.slice(0, -5)).sort(),
    platform: has('platform'),
    ...(set.missing.length ? { unresolved: set.missing.map(m => `${m.from}: ${m.name}`) } : {})
  }
  if (!has('README.md')) writeFileSync(join(dir, 'README.md'), readme(repo, def, pkgm))
  pkgm.hash = hashTree(dir, [...tops, 'README.md'])
  writeJson(join(dir, 'package.json'), { name: repo, description: def.description, private: true, license: def.license || 'MIT', pkgm })
  return { name, repo, dir, pkgm, missing: set.missing }
}

function readme (repo, def, m) {
  return [`# ${repo}`, '', def.description, '', ...(def.readme ? [...def.readme, ''] : []),
    '## The package', '',
    `- modules: ${m.modules.ours.map(p => `\`${p}\``).join(', ')}${m.modules.third ? `; ${m.modules.third} third-party (\`modules/third-party.json\`)` : ''}`,
    ...(m.swarms.length ? [`- swarms: ${m.swarms.map(s => `\`${s}\``).join(', ')}`] : []),
    ...(m.platform ? ['- the platform (`platform/`)'] : []),
    `- tests: ${m.tests.map(t => `\`test/${t}\``).join(', ')}`, '',
    'Self-contained: it carries what it runs on. Written from the development repository ([splectrum/dev-env-2-p2p-cluster](https://github.com/splectrum/dev-env-2-p2p-cluster)): not edited here.', ''].join('\n')
}

export function writePackages ({ dev, out, only = null, keep = false, log = () => {} }) {
  dev = resolve(dev); out = resolve(out)
  const defs = readJson(join(dev, 'packages.json'))
  const ours = oursOf(dev, defs)
  const lock = readJson(join(dev, 'package-lock.json'))
  const names = only ? [].concat(only) : Object.keys(defs.packages)
  const scratch = mkdtempSync(join(tmpdir(), 'packages-write-'))
  try {
    const staged = []
    for (const name of names) {
      const s = stage(dev, defs, name, ours, lock, join(scratch, repoOf(name, defs.packages[name])))
      log({ kind: 'staged', package: name, ours: s.pkgm.modules.ours.length, third: s.pkgm.modules.third, unresolved: s.missing.length })
      staged.push(s)
    }
    const results = staged.map(s => testPackage(s.dir, { log }))
    if (results.some(r => !r.ok)) return { ok: false, written: [], results, scratch: keep ? scratch : null }
    const written = []
    for (const s of staged) {
      const to = join(out, s.repo)
      mkdirSync(to, { recursive: true })
      for (const n of readdirSync(to)) if (n !== '.git' && n !== 'LICENSE') remove(join(to, n))
      for (const n of readdirSync(s.dir)) copy(join(s.dir, n), join(to, n))
      written.push({ package: s.name, dir: to, hash: s.pkgm.hash })
      log({ kind: 'written', package: s.name, dir: to, hash: s.pkgm.hash.slice(0, 12) })
    }
    return { ok: true, written, results }
  } finally {
    if (!keep) remove(scratch)
  }
}
