import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync, chmodSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = dirname(dirname(fileURLToPath(import.meta.url)))
const UTILS = ['sh', 'awk', 'sed', 'sort', 'grep', 'tr', 'head', 'cut', 'id', 'uname', 'getent', 'cat', 'mktemp', 'rm', 'dirname', 'printf']

// A host as step 0 sees it: only the given commands (fakes) and the shell's
// utilities on PATH.
function host (fakes) {
  const dir = mkdtempSync(join(tmpdir(), 'step0-'))
  const bin = join(dir, 'bin')
  mkdirSync(bin)
  for (const u of UTILS) { const p = execFileSync('sh', ['-c', `command -v ${u}`], { encoding: 'utf8' }).trim(); if (p.startsWith('/')) symlinkSync(p, join(bin, u)) }
  for (const [name, script] of Object.entries(fakes)) { writeFileSync(join(bin, name), `#!/bin/sh\n${script}\n`); chmodSync(join(bin, name), 0o755) }
  return { dir, run: (...args) => spawnSync(join(bin, 'sh'), [join(here, 'step0.sh'), ...args], { encoding: 'utf8', env: { PATH: bin, HOME: dir, HAICC_HOME: join(dir, '.haicc') }, input: '' }) }
}
const row = (out, name) => out.split('\n').find(l => l.startsWith(name + ' '))?.split(/\s{2,}/)

test('check: Node.js and git too old, Docker missing (exit 1), each with found, required and the fix', () => {
  const h = host({ node: 'echo v20.11.0', git: 'echo git version 2.20.1' })
  try {
    const r = h.run('check')
    assert.equal(r.status, 1, r.stdout)
    assert.deepEqual(row(r.stdout, 'node').slice(0, 4), ['node', 'v20.11.0', '22 or later', 'no'])
    assert.match(row(r.stdout, 'node')[4], /into .*\.haicc\/node, no sudo/)
    assert.deepEqual(row(r.stdout, 'git').slice(0, 4), ['git', '2.20.1', '2.25 or later', 'no'])
    assert.deepEqual(row(r.stdout, 'docker').slice(0, 4), ['docker', '-', 'engine', 'no'])
    assert.equal(row(r.stdout, 'os')[3], process.arch === 'x64' && process.platform === 'linux' ? 'yes' : 'no')
  } finally { rmSync(h.dir, { recursive: true, force: true }) }
})

test('check: only Docker missing still stops the boot (exit 1); fix --dry-run says what it would do', () => {
  const h = host({ node: 'echo v22.3.0', git: 'echo git version 2.43.0' })
  try {
    const r = h.run('check')
    assert.equal(r.status, 1, r.stdout)
    assert.deepEqual(row(r.stdout, 'docker').slice(0, 4), ['docker', '-', 'engine', 'no'])
    assert.equal(row(r.stdout, 'node')[3], 'yes')
    const f = h.run('fix', '--dry-run')
    assert.match(f.stdout, /would: install Docker Engine with apt/)
    assert.doesNotMatch(f.stdout, /would: install Node/)
  } finally { rmSync(h.dir, { recursive: true, force: true }) }
})

test('fix without a terminal and without --yes changes nothing', () => {
  const h = host({ git: 'echo git version 2.43.0' })
  try {
    const f = spawnSync(execFileSync('sh', ['-c', 'command -v setsid'], { encoding: 'utf8' }).trim(), ['-w', join(h.dir, 'bin', 'sh'), join(here, 'step0.sh'), 'fix'], { encoding: 'utf8', env: { PATH: join(h.dir, 'bin'), HOME: h.dir, HAICC_HOME: join(h.dir, '.haicc') }, input: '' })
    assert.match(f.stdout, /not fixed \(no terminal to ask; --yes to agree\): install Node\.js/)
    assert.ok(!existsSync(join(h.dir, '.haicc', 'node')))
  } finally { rmSync(h.dir, { recursive: true, force: true }) }
})

// A folder of repositories, as a source: a project requiring a package
// requiring another.
function source () {
  const dir = mkdtempSync(join(tmpdir(), 'source-'))
  const repo = (r, pkgm) => { mkdirSync(join(dir, r), { recursive: true }); writeFileSync(join(dir, r, 'package.json'), JSON.stringify({ name: r, pkgm })) }
  repo('base-demo-x', { package: 'demo-x', requires: ['b'] })
  repo('base-package-b', { package: 'b', requires: ['c'] })
  repo('base-package-c', { package: 'c', requires: [] })
  mkdirSync(join(dir, 'base-package-c', '.git'))
  return dir
}

test('fetch: from a folder source, with what it requires, all the way down; recorded', () => {
  const src = source()
  const work = mkdtempSync(join(tmpdir(), 'work-'))
  try {
    mkdirSync(join(work, 'haiccing'))
    writeFileSync(join(work, 'haiccing', 'sources'), `# test\nfolder ${join(work, 'nowhere')}\nfolder ${src}\n`)
    const r = spawnSync('sh', [join(here, 'fetch.sh'), join(work, 'haiccing'), '--requires', 'base-demo-x'], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stdout + r.stderr)
    for (const repo of ['base-demo-x', 'base-package-b', 'base-package-c']) assert.ok(existsSync(join(work, 'haiccing', repo, 'package.json')), repo)
    assert.ok(!existsSync(join(work, 'haiccing', 'base-package-c', '.git')), 'plain copies, no .git')
    const log = readFileSync(join(work, '.haicc', 'log', 'sources.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l))
    assert.deepEqual(log.map(l => [l.repository, l.source, l.outcome]), [['base-demo-x', `folder ${src}`, 'fetched'], ['base-package-b', `folder ${src}`, 'fetched'], ['base-package-c', `folder ${src}`, 'fetched']])
    // Already there: kept, not fetched again.
    assert.equal(spawnSync('sh', [join(here, 'fetch.sh'), join(work, 'haiccing'), '--requires', 'base-demo-x']).status, 0)
    assert.equal(readFileSync(join(work, '.haicc', 'log', 'sources.jsonl'), 'utf8').trim().split('\n').length, 3)
    // In none of the sources: said, recorded, exit 1.
    const m = spawnSync('sh', [join(here, 'fetch.sh'), join(work, 'haiccing'), 'base-package-nope'], { encoding: 'utf8' })
    assert.equal(m.status, 1)
    assert.match(m.stdout, /base-package-nope: in none of the sources/)
  } finally { for (const d of [src, work]) rmSync(d, { recursive: true, force: true }) }
})

test('the setup: a self-extracting release, extracting haiccing/ (boot, sources, the package)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-'))
  try {
    // base-package-haicc in miniature: its manifest and this boot.
    const pkg = join(dir, 'base-package-haicc')
    mkdirSync(join(pkg, 'pear-full-square'), { recursive: true })
    execFileSync('cp', ['-a', here, join(pkg, 'pear-full-square', 'haicc-base-boot')])
    writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'base-package-haicc', pkgm: { package: 'haicc', hash: 'abcdef1234567890' } }))
    execFileSync('sh', [join(here, 'release.sh'), pkg, join(dir, 'haicc-setup.sh')])
    const work = join(dir, 'work')
    const r = spawnSync('sh', [join(dir, 'haicc-setup.sh'), work, `--sources=folder:${dir}/repos`, '--sources=github:haiccing'], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stdout + r.stderr)
    assert.match(r.stdout, /next: .*\/work\/haiccing\/boot/)
    assert.ok(existsSync(join(work, 'haiccing', 'base-package-haicc', 'pear-full-square', 'haicc-base-boot', 'boot.sh')))
    // The stub: executable, naming its setup.
    assert.ok(statSync(join(work, 'haiccing', 'boot')).mode & 0o100)
    assert.match(readFileSync(join(work, 'haiccing', 'boot'), 'utf8'), /base-package-haicc\/pear-full-square\/haicc-base-boot\/boot\.sh/)
    assert.deepEqual(readFileSync(join(work, 'haiccing', 'sources'), 'utf8').split('\n').filter(l => l && !l.startsWith('#')), [`folder ${dir}/repos`, 'github haiccing'])
    // Again: already set up, nothing changed.
    assert.match(spawnSync('sh', [join(dir, 'haicc-setup.sh'), work], { encoding: 'utf8' }).stdout, /already set up/)
    // Without --sources: GitHub.
    spawnSync('sh', [join(dir, 'haicc-setup.sh'), join(dir, 'work2')])
    assert.deepEqual(readFileSync(join(dir, 'work2', 'haiccing', 'sources'), 'utf8').split('\n').filter(l => l && !l.startsWith('#')), ['github haiccing'])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
