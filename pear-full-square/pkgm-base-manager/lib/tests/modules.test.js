// A package's own test (written by the package manager): every module of
// the package loads, from the install folder (PKGM_ROOT); browser code is
// only checked to be there.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const m = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')).pkgm
const root = process.env.PKGM_ROOT

for (const f of m.folders) {
  const pj = join(root, f, 'package.json')
  test(`${f}: installed, and loads`, async () => {
    assert.ok(existsSync(pj), `${f} has no package.json`)
    const p = JSON.parse(readFileSync(pj, 'utf8'))
    const entry = typeof p.exports === 'string' ? p.exports : p.exports?.['.']?.import ?? p.exports?.['.'] ?? p.main
    // Browser code (npm's "browser" field, no entry for Node): it is there.
    if (!entry) { if (p.browser) assert.ok(existsSync(join(root, f, p.browser)), `${f}: ${p.browser} missing`); return }
    const mod = await import(pathToFileURL(join(root, f, entry)).href)
    assert.ok(Object.keys(mod).length > 0, `${f} exports nothing`)
  })
}
