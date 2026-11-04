// The third-party package's own test (written by the package manager): the
// tree as recorded, for this platform, and Bare's runtime runs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const m = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')).pkgm
const root = process.env.PKGM_ROOT

test('for this platform', () => assert.equal(m.platform, `${process.platform}-${process.arch}`))

test('every recorded module installed, at its version', () => {
  const record = JSON.parse(readFileSync(join(here, '..', 'third-party.json'), 'utf8'))
  for (const r of record.modules) {
    const pj = join(root, r.path, 'package.json')
    assert.ok(existsSync(pj), `${r.path} missing`)
    assert.equal(JSON.parse(readFileSync(pj, 'utf8')).version, r.version, r.path)
  }
})

test("Bare's runtime runs, at its version", () => {
  const v = execFileSync(join(root, m.runtime), ['--version'], { encoding: 'utf8' }).trim()
  assert.equal(v, `v${m.bare}`)
})
