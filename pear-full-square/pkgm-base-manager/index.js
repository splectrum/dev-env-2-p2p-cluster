// The package manager, basic. A package is a self-contained folder (its
// repository: haiccing/base-package-<name>): its code ready to run, laid
// out as it is installed (<org>/<module>, node_modules/ for third-party
// code), its tests, and a manifest (package.json, "pkgm").
//   importThirdParty({ dev, out })   the one contact with npm: the
//        development workspace's installed tree, this platform only, recorded
//   writePackages({ dev, out, only })   our packages from the development
//        repository's modules (packages.json), installed and tested together
//        before any is written
//   install(name, { from, into, overrides })   a package and what it
//        requires, from folders of package repositories side by side
//   testPackage(name, { into })   its modules' tests and its own, installed
//   installed(into), uninstall(name, { into })
// Node's built-ins only. Whole or nothing: a package is staged in the
// install folder, then moved in place; one marked installing is redone.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync, symlinkSync, lstatSync, chmodSync, mkdtempSync } from 'node:fs'
import { join, dirname, resolve, relative, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { walk, copy, hashTree, remove } from './lib/tree.js'

const here = dirname(fileURLToPath(import.meta.url))
const PREFIX = 'base-package-'
const ORG = 'haiccing'
const readJson = f => JSON.parse(readFileSync(f, 'utf8'))
const writeJson = (f, v) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f + '.tmp', JSON.stringify(v, null, 2) + '\n'); renameSync(f + '.tmp', f) }
export const platform = () => `${process.platform}-${process.arch}`
export const repoName = name => PREFIX + name

// Where a package's repository is, among folders of repositories side by
// side (plain, or laid out fully qualified: <folder>/haiccing/<repo>).
// A package's repository is base-package-<name>, or base-<name> for a
// project carrying its own components (a demo: base-demo-liveness).
export function findPackage (name, from) {
  for (const f of [].concat(from)) {
    for (const repo of [repoName(name), `base-${name}`]) {
      for (const p of [join(f, repo), join(f, ORG, repo)]) if (existsSync(join(p, 'package.json')) && manifest(p)?.package === name) return resolve(p)
    }
  }
  return null
}
export const manifest = dir => readJson(join(dir, 'package.json')).pkgm || null
const missing = (name, from) => new Error(`missing: ${ORG}/${repoName(name)} is not beside the others (looked in ${[].concat(from).join(', ')}); get it from https://github.com/${ORG}/${repoName(name)} (a clone, or its archive unpacked beside the others)`)

// ---- the install folder ---------------------------------------------------

const registryFile = into => join(into, '.pkgm', 'installed.json')
export const installed = into => existsSync(registryFile(into)) ? readJson(registryFile(into)) : { packages: {} }

// A package, and first what it requires; skipped when installed and
// current (the same hash, not overridden). Returns what was done, in order.
export function install (name, { from, into, overrides = {}, log = () => {}, done = [] }) {
  into = resolve(into)
  const dir = findPackage(name, from)
  if (!dir) throw missing(name, from)
  const m = manifest(dir)
  for (const r of m.requires || []) if (!done.some(d => d.package === r)) install(r, { from, into, log, done })
  const reg = installed(into)
  const have = reg.packages[name]
  const overridden = Object.keys(overrides).length > 0
  if (have && have.state === 'installed' && have.hash === m.hash && !have.overrides && !overridden) {
    done.push({ package: name, action: 'current', hash: m.hash })
    return done
  }
  if (m.platform && m.platform !== platform()) throw new Error(`${repoName(name)} is for ${m.platform}, this host is ${platform()}`)
  for (const f of Object.keys(overrides)) if (!m.folders.includes(f)) throw new Error(`override ${f}: not a folder of ${repoName(name)}`)
  // Folders belong to one package only.
  for (const [other, o] of Object.entries(reg.packages)) {
    if (other === name) continue
    const clash = m.folders.find(f => o.folders.includes(f))
    if (clash) throw new Error(`${clash} belongs to ${repoName(other)}, not ${repoName(name)}`)
  }
  // Staged inside the install folder (one file system), then moved in place.
  const stage = join(into, '.pkgm', 'stage', name)
  remove(stage)
  for (const f of m.folders) copy(overrides[f] ? resolve(overrides[f]) : join(dir, f), join(stage, f), overrides[f] ? { skip: (r, n) => n === 'node_modules' || n === '.git' } : {})
  // The package's own files (manifest, readme, record, tests): kept with it.
  const tops = new Set(m.folders.map(f => f.split('/')[0]))
  for (const n of readdirSync(dir)) if (n !== '.git' && !tops.has(n)) copy(join(dir, n), join(stage, '.package', n))
  reg.packages[name] = { ...(have || {}), state: 'installing', hash: m.hash }
  writeJson(registryFile(into), reg)
  for (const f of new Set([...(have?.folders || []), ...(have?.links || []), ...m.folders])) remove(join(into, f))
  for (const f of m.folders) { mkdirSync(dirname(join(into, f)), { recursive: true }); renameSync(join(stage, f), join(into, f)) }
  const meta = join(into, '.pkgm', 'packages', name)
  remove(meta)
  mkdirSync(dirname(meta), { recursive: true })
  renameSync(join(stage, '.package'), meta)
  remove(stage)
  // Our modules found by name: node_modules/<module> -> ../<org>/<module>.
  const links = []
  for (const f of m.folders) {
    const [org, mod, ...rest] = f.split('/')
    if (org === 'node_modules' || rest.length || !mod) continue
    const link = `node_modules/${mod}`
    mkdirSync(join(into, 'node_modules'), { recursive: true })
    remove(join(into, link))
    symlinkSync(relative(join(into, 'node_modules'), join(into, f)), join(into, link))
    links.push(link)
  }
  if (m.runtime) chmodSync(join(into, m.runtime), 0o755)
  reg.packages[name] = { state: 'installed', hash: m.hash, from: dir, folders: m.folders, links, ...(overridden ? { overrides } : {}), at: new Date().toISOString() }
  writeJson(registryFile(into), reg)
  log({ kind: 'installed', package: name, hash: m.hash.slice(0, 12), folders: m.folders.length, overrides: Object.keys(overrides) })
  done.push({ package: name, action: have ? 'updated' : 'installed', hash: m.hash, ...(overridden ? { overrides: Object.keys(overrides) } : {}) })
  return done
}

export function uninstall (name, { into }) {
  const reg = installed(into)
  const have = reg.packages[name]
  if (!have) return false
  const needed = Object.keys(reg.packages).filter(o => o !== name && (manifest(join(into, '.pkgm', 'packages', o)).requires || []).includes(name))
  if (needed.length) throw new Error(`${repoName(name)} is required by ${needed.map(repoName).join(', ')}`)
  for (const f of [...have.folders, ...(have.links || [])]) remove(join(into, f))
  remove(join(into, '.pkgm', 'packages', name))
  delete reg.packages[name]
  writeJson(registryFile(into), reg)
  return true
}

// ---- tests, always within the package --------------------------------------

// The package's modules' own tests (each module's "test" script, run in
// its installed folder), then the package's tests (its test/, with
// PKGM_ROOT the install folder).
export function testPackage (name, { into, log = () => {} }) {
  into = resolve(into)
  const meta = join(into, '.pkgm', 'packages', name)
  if (!existsSync(meta)) throw new Error(`${repoName(name)} is not installed in ${into}`)
  const m = manifest(meta)
  const runs = []
  const run = (what, cmd, args, cwd) => {
    const t0 = Date.now()
    // Its own run, even under a test runner (NODE_TEST_CONTEXT would make
    // it report to ours instead).
    const env = { ...process.env, PKGM_ROOT: into }
    delete env.NODE_TEST_CONTEXT
    const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 })
    const out = (r.stdout || '') + (r.stderr || '')
    const counts = Object.fromEntries(['tests', 'pass', 'fail'].map(k => [k, Number((out.match(new RegExp(`^# ${k} (\\d+)`, 'm')) || [])[1] || 0)]))
    const result = { what, ok: r.status === 0, ...counts, ms: Date.now() - t0, ...(r.status === 0 ? {} : { output: out.split('\n').slice(-40).join('\n') }) }
    log({ kind: 'tested', package: name, ...result, output: undefined })
    runs.push(result)
  }
  for (const f of m.folders) {
    const pj = join(into, f, 'package.json')
    if (f.startsWith('node_modules/') || !existsSync(pj)) continue
    const script = readJson(pj).scripts?.test
    if (script && existsSync(join(into, f, 'test'))) run(f, 'sh', ['-c', script], join(into, f))
  }
  const tests = existsSync(join(meta, 'test')) ? readdirSync(join(meta, 'test')).filter(n => n.endsWith('.test.js')).sort() : []
  if (tests.length) run(`${readJson(join(meta, 'package.json')).name || repoName(name)}/test`, process.execPath, ['--test', ...tests.map(t => join(meta, 'test', t))], meta)
  return { package: name, ok: runs.every(r => r.ok), runs }
}

// ---- writing packages ------------------------------------------------------

export const readDefinitions = dev => readJson(join(dev, 'packages.json'))

// Write a package's folder: its manifest, readme and tests, with its
// content already in place; the hash over its content.
function finish (dir, name, def, folders, extra = {}) {
  const hash = hashTree(dir, [...folders, ...(extra.root || []), ...(existsSync(join(dir, 'test')) ? ['test'] : [])])
  const pkg = { name: def.repo || repoName(name), description: def.description, private: true, license: def.license || 'MIT', pkgm: { package: name, requires: def.requires || [], folders, hash, ...extra } }
  writeJson(join(dir, 'package.json'), pkg)
  // A readme of its own (a project's), or one written from the definition.
  if (!(extra.root || []).includes('README.md')) writeFileSync(join(dir, 'README.md'), readme(name, def, pkg.pkgm))
  return pkg.pkgm
}

function readme (name, def, m) {
  const lines = [`# ${def.repo || repoName(name)}`, '', def.description, '',
    `A package: self-contained, its code ready to run, laid out as it is installed. Written by the package manager (\`pear-full-square/pkgm-base-manager\`) from the development repository; do not edit here.`, '',
    `- requires: ${m.requires.length ? m.requires.map(r => `\`${ORG}/${repoName(r)}\``).join(', ') : 'nothing'}`,
    ...(m.platform ? [`- platform: ${m.platform}`] : []),
    `- hash: \`${m.hash}\``, '']
  if (def.readme) lines.push(...def.readme, '')
  lines.push('## Holds', '')
  if (m.imported) lines.push(`${m.imported.modules} third-party modules, recorded in \`third-party.json\` (version, integrity, licence each).`, '')
  else lines.push(...m.folders.map(f => `- \`${f}\``), '')
  lines.push('## Installed', '', 'By the package manager, into the host\'s install folder (`~/.haicc/packages`), with the packages it requires; its tests run there:', '',
    '```sh', `node <install folder>/pear-full-square/pkgm-base-manager/cli.js install ${name} --from <folder of haiccing repositories>`, `node <install folder>/pear-full-square/pkgm-base-manager/cli.js test ${name}`, '```', '')
  return lines.join('\n')
}

function generatedTests (dir, kind) {
  remove(join(dir, 'test'))
  copy(join(here, 'lib', 'tests', `${kind}.test.js`), join(dir, 'test', `${kind}.test.js`))
}

// The one contact with npm: the development workspace's installed tree
// (node_modules, from its package-lock.json), our own modules left out,
// this platform's prebuilds only, test folders dropped; recorded.
export function importThirdParty ({ dev, out, log = () => {} }) {
  const defs = readDefinitions(dev)
  const def = defs.packages['third-party']
  const ours = new Set([...(def.exclude || []), ...Object.values(defs.packages).flatMap(d => (d.modules || []).map(m => basename(typeof m === 'string' ? m : m.path)))])
  const lock = readJson(join(dev, 'package-lock.json'))
  const dir = join(out, repoName('third-party'))
  mkdirSync(dir, { recursive: true })
  for (const n of readdirSync(dir)) if (n !== '.git' && n !== 'LICENSE') remove(join(dir, n))
  const top = []
  const nm = join(dev, 'node_modules')
  for (const n of readdirSync(nm).sort()) {
    if (n.startsWith('.')) continue
    const names = n.startsWith('@') ? readdirSync(join(nm, n)).map(s => `${n}/${s}`) : [n]
    for (const name of names) {
      if (ours.has(name) || lstatSync(join(nm, name)).isSymbolicLink()) continue
      copy(join(nm, name), join(dir, 'node_modules', name), { skip: (r, base) => base === 'test' || base === '.bin' || (r.split('/').includes('prebuilds') && r.split('/').at(-2) === 'prebuilds' && base !== platform()) })
      top.push(`node_modules/${name}`)
    }
  }
  // The record: every module in the tree, as the lock file has it.
  const record = []
  for (const [p, e] of Object.entries(lock.packages)) {
    if (!p.startsWith('node_modules/') || e.link) continue
    if (!existsSync(join(dir, p, 'package.json'))) continue
    const pj = readJson(join(dir, p, 'package.json'))
    record.push({ path: p, name: pj.name, version: pj.version, license: pj.license || e.license || null, resolved: e.resolved || null, integrity: e.integrity || null })
  }
  writeJson(join(dir, 'third-party.json'), { platform: platform(), modules: record })
  const runtime = `node_modules/bare-runtime-${platform()}/bin/bare`
  if (!existsSync(join(dir, runtime))) throw new Error(`no Bare runtime for ${platform()} in the workspace (${runtime}): add bare-runtime to the development repository's dependencies`)
  chmodSync(join(dir, runtime), 0o755)
  const bare = readJson(join(dir, `node_modules/bare-runtime-${platform()}/package.json`)).version
  generatedTests(dir, 'third-party')
  const m = finish(dir, 'third-party', def, top, { platform: platform(), runtime, bare, imported: { modules: record.length } })
  log({ kind: 'imported', package: 'third-party', modules: record.length, folders: top.length, hash: m.hash.slice(0, 12) })
  return { dir, ...m }
}

// Our packages, from the development repository's modules: staged, then
// installed together into a scratch folder (third-party from `out`, as last
// imported) and tested; only when every package's tests pass are they
// written into `out`, each its repository's folder (its .git kept).
export function writePackages ({ dev, out, only = null, keep = false, log = () => {} }) {
  dev = resolve(dev); out = resolve(out)
  const defs = readDefinitions(dev)
  const names = Object.keys(defs.packages).filter(n => n !== 'third-party')
  const scratch = mkdtempSync(join(tmpdir(), 'pkgm-write-'))
  const staged = join(scratch, 'packages')
  const into = join(scratch, 'install')
  try {
    const manifests = {}
    for (const name of names) {
      const def = defs.packages[name]
      const dir = join(staged, def.repo || repoName(name))
      const folders = []
      for (const mod of def.modules) {
        const { path, from } = typeof mod === 'string' ? { path: mod, from: mod } : mod
        copy(join(dev, from), join(dir, path), { skip: (r, base) => base === 'node_modules' || base === '.git' || base === 'record' })
        folders.push(path)
      }
      for (const [to, from] of Object.entries(def.root || {})) copy(join(dev, from), join(dir, to))
      generatedTests(dir, 'modules')
      manifests[name] = finish(dir, name, def, folders, def.root ? { root: Object.keys(def.root) } : {})
    }
    if (!findPackage('third-party', out)) throw missing('third-party', out)
    const results = []
    for (const name of only ? [].concat(only) : names) {
      install(name, { from: [staged, out], into, log })
      results.push(testPackage(name, { into, log }))
    }
    const failed = results.filter(r => !r.ok)
    if (failed.length) return { ok: false, written: [], results, scratch: keep ? scratch : null }
    const written = []
    for (const name of only ? [].concat(only) : names) {
      const repo = defs.packages[name].repo || repoName(name)
      const dir = join(out, repo)
      mkdirSync(dir, { recursive: true })
      for (const n of readdirSync(dir)) if (n !== '.git' && n !== 'LICENSE') remove(join(dir, n))
      for (const n of readdirSync(join(staged, repo))) copy(join(staged, repo, n), join(dir, n))
      written.push({ package: name, dir, hash: manifests[name].hash })
      log({ kind: 'written', package: name, dir, hash: manifests[name].hash.slice(0, 12) })
    }
    return { ok: true, written, results }
  } finally {
    if (!keep) remove(scratch)
  }
}

export { walk, copy, hashTree }
