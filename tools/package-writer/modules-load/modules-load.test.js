// Every module of ours in the package (modules/<org>/<module>) loads.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const modules = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'modules')
for (const org of readdirSync(modules).filter(o => o !== 'node_modules' && !o.endsWith('.json')).sort()) {
  for (const mod of readdirSync(join(modules, org)).sort()) {
    const dir = join(modules, org, mod)
    test(`${org}/${mod} loads`, async () => {
      const p = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      const entry = typeof p.exports === 'string' ? p.exports : p.exports?.['.']?.import ?? p.exports?.['.'] ?? p.main
      if (!entry) { if (p.browser) assert.ok(existsSync(join(dir, p.browser)), `${p.browser} missing`); return }
      const m = await import(pathToFileURL(join(dir, entry)).href)
      assert.ok(Object.keys(m).length > 0, 'exports nothing')
    })
  }
}
