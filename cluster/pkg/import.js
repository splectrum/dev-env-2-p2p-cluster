#!/usr/bin/env node
// pkg/import: modules and their dependencies brought into the package
// repository, at the boundary (on the host, with Node and native git).
//   node cluster/pkg/import.js <package-repo> <staged-module-dir>...
// Each module folder is staged first (cluster/stage.sh: no development
// dependencies, linux-x64 prebuilds only). Every package instance (the
// module itself, and each folder of its node_modules as its lock file
// lays them out) becomes a tree, without its own nested node_modules; a
// tree is stored once, under its oid: instances/<oid>. index.json maps
// name@version (our modules: name@id) to the oid. A deployment,
// deployments/<module>.json, is the layout: each folder of the module's
// installed tree linked to an instance. One commit on main per import.
// Prints one JSON line with the counts.

import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

const [repo, ...modules] = process.argv.slice(2)
const env = { ...process.env, GIT_AUTHOR_NAME: 'pkg-import', GIT_AUTHOR_EMAIL: 'pkg-import@localhost', GIT_COMMITTER_NAME: 'pkg-import', GIT_COMMITTER_EMAIL: 'pkg-import@localhost' }
const git = (args, opts = {}) => execFileSync('git', ['--git-dir', repo, ...args], { encoding: 'utf8', env, maxBuffer: 1 << 30, ...opts }).trim()
if (!existsSync(join(repo, 'HEAD'))) execFileSync('git', ['init', '-q', '--bare', '-b', 'main', repo])

// A folder as a tree in the package repository: every file, ignore rules
// off, without the folder's own node_modules.
function treeOf (dir) {
  const tmp = mkdtempSync(join(tmpdir(), 'pkg-index-'))
  try {
    const e = { env: { ...env, GIT_INDEX_FILE: join(tmp, 'index') } }
    git(['--work-tree', dir, '-c', 'core.excludesFile=/dev/null', 'add', '-A', '-f', '--', '.', ':!node_modules'], e)
    return git(['write-tree'], e)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}

const head = (() => { try { return git(['rev-parse', '-q', '--verify', 'refs/heads/main']) } catch { return null } })()
const read = path => head ? git(['show', `${head}:${path}`]) : null
const instances = new Map(head ? git(['ls-tree', `${head}:instances`]).split('\n').filter(Boolean).map(l => [l.split('\t')[1], true]) : [])
const index = head ? JSON.parse(read('index.json')) : {}
const deployments = new Map(head ? git(['ls-tree', `${head}:deployments`]).split('\n').filter(Boolean).map(l => {
  const name = l.split('\t')[1]
  return [name, l.split(/\s+/)[2]]
}) : [])
const before = instances.size
const counts = { modules: 0, folders: 0, added: 0 }

for (const dir of modules) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const module = basename(dir)
  const lock = existsSync(join(dir, 'package-lock.json')) ? JSON.parse(readFileSync(join(dir, 'package-lock.json'), 'utf8')).packages : { '': {} }
  const layout = {}
  for (const path of Object.keys(lock).sort()) {
    const at = join(dir, path)
    if (path !== '' && !existsSync(at)) continue // pruned: a development dependency
    const meta = JSON.parse(readFileSync(join(at, 'package.json'), 'utf8'))
    const oid = treeOf(at)
    const name = path === '' ? `${meta.name}@${meta.id}` : `${meta.name}@${meta.version}`
    layout[path === '' ? module : `${module}/${path}`] = oid
    if (index[name] && index[name] !== oid) index[`${name}#${oid.slice(0, 7)}`] = oid
    else index[name] = oid
    if (!instances.has(oid)) { instances.set(oid, true); counts.added++ }
    counts.folders++
  }
  const deployment = JSON.stringify({ module, id: pkg.id, layout }, null, 2) + '\n'
  deployments.set(`${module}.json`, git(['hash-object', '-w', '--stdin'], { input: deployment }))
  counts.modules++
}

const mktree = lines => git(['mktree'], { input: lines.join('\n') + '\n' })
const instancesTree = mktree([...instances.keys()].sort().map(oid => `040000 tree ${oid}\t${oid}`))
const deploymentsTree = mktree([...deployments].sort().map(([name, oid]) => `100644 blob ${oid}\t${name}`))
const sorted = Object.fromEntries(Object.entries(index).sort())
const indexBlob = git(['hash-object', '-w', '--stdin'], { input: JSON.stringify(sorted, null, 2) + '\n' })
const readme = git(['hash-object', '-w', '--stdin'], { input: '# Package repository\n\nEach package instance stored once, under its tree oid (instances/).\nindex.json: name@version to oid. deployments/: layouts linking to instances.\n' })
const root = mktree([
  `040000 tree ${deploymentsTree}\tdeployments`,
  `100644 blob ${indexBlob}\tindex.json`,
  `040000 tree ${instancesTree}\tinstances`,
  `100644 blob ${readme}\treadme.md`
])
const message = `Import ${modules.map(m => basename(m)).join(', ')}\n\n${counts.folders} folders, ${counts.added} new instances.\n`
const commit = git(['commit-tree', root, ...(head ? ['-p', head] : []), '-m', message])
git(['update-ref', 'refs/heads/main', commit])
console.log(JSON.stringify({ commit, ...counts, instances: instances.size, before }))
