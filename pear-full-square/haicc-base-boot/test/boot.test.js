import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, chmodSync, existsSync } from 'node:fs'
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

test('missing siblings are said, with where to get them', () => {
  const dir = mkdtempSync(join(tmpdir(), 'siblings-'))
  try {
    mkdirSync(join(dir, 'base-package-pkgm'))
    writeFileSync(join(dir, 'base-package-pkgm', 'package.json'), '{}')
    const r = spawnSync('sh', [join(here, 'siblings.sh'), dir, 'base-package-pkgm', 'base-package-mycelium'], { encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(r.stdout, /haiccing\/base-package-mycelium: git clone https:\/\/github.com\/haiccing\/base-package-mycelium/)
    assert.match(r.stdout, /archive\/refs\/heads\/main.tar.gz \| tar -xz/)
    assert.doesNotMatch(r.stdout, /base-package-pkgm:/)
    assert.equal(spawnSync('sh', [join(here, 'siblings.sh'), dir, 'base-package-pkgm']).status, 0)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
