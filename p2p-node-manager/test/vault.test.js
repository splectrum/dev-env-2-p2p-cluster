import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { vault } from '../vault.js'

test('the vault stand-in: a key per node, born here, owner-only, stable', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'vault-')), 'v')
  const v = vault(dir)
  assert.equal(v.has('s', 'master'), false)
  const k = v.keyFor('s', 'master')
  assert.match(k, /^[0-9a-f]{64}$/)
  assert.equal(v.keyFor('s', 'master'), k)
  assert.notEqual(v.keyFor('s', 'node-1'), k)
  assert.equal(statSync(dir).mode & 0o777, 0o700)
  for (const f of readdirSync(dir)) assert.equal(statSync(join(dir, f)).mode & 0o777, 0o600)
})
