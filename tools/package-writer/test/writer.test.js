import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readlinkSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { writePackages } from '../index.js'

const put = (f, s) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, s) }
const json = (f, v) => put(f, JSON.stringify(v, null, 2))

// A development repository in miniature: two modules of ours (one using the
// other), one third-party module with a test folder and a prebuild for
// another platform, and a swarm package whose swarm names one module.
function devRepo () {
  const dev = mkdtempSync(join(tmpdir(), 'writer-dev-'))
  json(join(dev, 'org/amod/package.json'), { name: 'amod', type: 'module', exports: './index.js', scripts: { test: 'node --test test/*.test.js' } })
  put(join(dev, 'org/amod/index.js'), "import { b } from 'bmod'\nexport const a = () => b() + 1\n")
  put(join(dev, 'org/amod/test/a.test.js'), "import { test } from 'node:test'\nimport assert from 'node:assert/strict'\nimport { a } from 'amod'\ntest('a', () => assert.equal(a(), 43))\n")
  json(join(dev, 'org/bmod/package.json'), { name: 'bmod', type: 'module', exports: './index.js' })
  put(join(dev, 'org/bmod/index.js'), "import { x } from 'dep-x'\nexport const b = () => x\n")
  json(join(dev, 'node_modules/dep-x/package.json'), { name: 'dep-x', version: '1.2.3', license: 'MIT', type: 'module', exports: './index.js' })
  put(join(dev, 'node_modules/dep-x/index.js'), 'export const x = 42\n')
  put(join(dev, 'node_modules/dep-x/test/t.js'), 'not shipped\n')
  put(join(dev, 'node_modules/dep-x/prebuilds/other-arch/x.node'), 'not shipped\n')
  json(join(dev, 'package-lock.json'), { packages: { 'node_modules/dep-x': { version: '1.2.3', integrity: 'sha512-x' } } })
  json(join(dev, 'packages.json'), { packages: {
    code: { description: 'Code.', modules: ['org/amod', 'org/bmod'] },
    swarmy: { repo: 'base-swarm-y', description: 'A swarm.' }
  } })
  json(join(dev, 'haiccing/base-swarm-y/swarms/s1/modules.json'), { modules: ['org/amod'] })
  json(join(dev, 'haiccing/base-swarm-y/swarms/s1/nodes.json'), { nodes: { master: { role: 'master' } } })
  put(join(dev, 'haiccing/base-swarm-y/README.md'), '# base-swarm-y\n\nBy hand.\n')
  return dev
}

test('written: self-contained, in the package structure, tested first', () => {
  const dev = devRepo()
  const out = mkdtempSync(join(tmpdir(), 'writer-out-'))
  try {
    const r = writePackages({ dev, out })
    assert.equal(r.ok, true, JSON.stringify(r.results))
    const y = join(out, 'base-swarm-y')
    // Its swarm's codebase and what that uses, all the way down.
    assert.ok(existsSync(join(y, 'modules/org/amod/index.js')))
    assert.ok(existsSync(join(y, 'modules/org/bmod/index.js')))
    assert.ok(existsSync(join(y, 'modules/node_modules/dep-x/index.js')))
    assert.ok(!existsSync(join(y, 'modules/node_modules/dep-x/test')), 'third-party tests not shipped')
    assert.ok(!existsSync(join(y, 'modules/node_modules/dep-x/prebuilds/other-arch')), 'other platforms not shipped')
    assert.equal(readlinkSync(join(y, 'modules/node_modules/bmod')), '../org/bmod')
    assert.deepEqual(JSON.parse(readFileSync(join(y, 'modules/third-party.json'), 'utf8')).modules, [{ name: 'dep-x', version: '1.2.3', license: 'MIT', resolved: null, integrity: 'sha512-x' }])
    // The hand-written parts as they are; the named test written here.
    assert.equal(readFileSync(join(y, 'README.md'), 'utf8'), '# base-swarm-y\n\nBy hand.\n')
    assert.ok(existsSync(join(y, 'swarms/s1/nodes.json')))
    assert.ok(statSync(join(y, 'test/modules-load/test')).mode & 0o100)
    const m = JSON.parse(readFileSync(join(y, 'package.json'), 'utf8'))
    assert.equal(m.name, 'base-swarm-y')
    assert.deepEqual(m.pkgm.modules, { ours: ['org/amod', 'org/bmod'], third: 1 })
    assert.deepEqual(m.pkgm.swarms, ['s1'])
    assert.equal(m.pkgm.requires, undefined, 'no requires')
    assert.match(m.pkgm.hash, /^[0-9a-f]{64}$/)
    // A generated readme for one without its own.
    assert.match(readFileSync(join(out, 'base-package-code', 'README.md'), 'utf8'), /Self-contained/)
    // Written again: the same hash.
    writePackages({ dev, out })
    assert.equal(JSON.parse(readFileSync(join(y, 'package.json'), 'utf8')).pkgm.hash, m.pkgm.hash)
  } finally { for (const d of [dev, out]) rmSync(d, { recursive: true, force: true }) }
})

test('a test failing: nothing written', () => {
  const dev = devRepo()
  const out = mkdtempSync(join(tmpdir(), 'writer-out-'))
  try {
    put(join(dev, 'org/amod/test/a.test.js'), "import { test } from 'node:test'\nimport assert from 'node:assert/strict'\ntest('a', () => assert.equal(1, 2))\n")
    const r = writePackages({ dev, out })
    assert.equal(r.ok, false)
    assert.deepEqual(r.written, [])
    assert.ok(!existsSync(join(out, 'base-swarm-y')))
  } finally { for (const d of [dev, out]) rmSync(d, { recursive: true, force: true }) }
})
