import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, chmodSync, readlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { importThirdParty, writePackages, install, testPackage, installed, uninstall, findPackage, manifest, platform } from '../index.js'

const put = (f, s) => { mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, s) }
const json = (f, v) => put(f, JSON.stringify(v, null, 2))

// A development repository in miniature: one third-party module (with a
// prebuild per platform and a test folder), Bare's runtime as a script, and
// one module of ours using the third-party one.
function devRepo () {
  const dev = mkdtempSync(join(tmpdir(), 'pkgm-dev-'))
  json(join(dev, 'node_modules/dep-x/package.json'), { name: 'dep-x', version: '1.2.3', license: 'MIT', type: 'module', exports: './index.js' })
  put(join(dev, 'node_modules/dep-x/index.js'), 'export const x = 42\n')
  put(join(dev, 'node_modules/dep-x/test/t.js'), 'not shipped\n')
  put(join(dev, `node_modules/dep-x/prebuilds/${platform()}/dep-x.node`), 'this platform\n')
  put(join(dev, 'node_modules/dep-x/prebuilds/other-arch/dep-x.node'), 'not shipped\n')
  json(join(dev, `node_modules/bare-runtime-${platform()}/package.json`), { name: `bare-runtime-${platform()}`, version: '9.9.9', license: 'Apache-2.0' })
  put(join(dev, `node_modules/bare-runtime-${platform()}/bin/bare`), '#!/bin/sh\necho v9.9.9\n')
  json(join(dev, 'package-lock.json'), {
    packages: {
      '': {},
      'node_modules/dep-x': { version: '1.2.3', resolved: 'https://example/dep-x-1.2.3.tgz', integrity: 'sha512-x', license: 'MIT' },
      [`node_modules/bare-runtime-${platform()}`]: { version: '9.9.9', integrity: 'sha512-b' },
      'node_modules/amod': { link: true }
    }
  })
  json(join(dev, 'org/amod/package.json'), { name: 'amod', type: 'module', exports: './index.js', scripts: { test: 'node --test test/*.test.js' } })
  put(join(dev, 'org/amod/index.js'), "import { x } from 'dep-x'\nexport const a = () => x + 1\n")
  put(join(dev, 'org/amod/test/a.test.js'), "import { test } from 'node:test'\nimport assert from 'node:assert/strict'\nimport { a } from 'amod'\ntest('a', () => assert.equal(a(), 43))\n")
  json(join(dev, 'packages.json'), {
    packages: {
      'third-party': { description: 'Theirs.' },
      apkg: { description: 'Ours.', requires: ['third-party'], modules: ['org/amod'] }
    }
  })
  return dev
}

test('import, write, install, test: the whole flow', () => {
  const dev = devRepo()
  const out = mkdtempSync(join(tmpdir(), 'pkgm-out-'))
  const into = mkdtempSync(join(tmpdir(), 'pkgm-into-'))
  try {
    // The import: this platform only, tests dropped, recorded.
    const tp = importThirdParty({ dev, out })
    assert.equal(tp.platform, platform())
    const tpDir = findPackage('third-party', out)
    assert.ok(existsSync(join(tpDir, `node_modules/dep-x/prebuilds/${platform()}/dep-x.node`)))
    assert.ok(!existsSync(join(tpDir, 'node_modules/dep-x/prebuilds/other-arch')))
    assert.ok(!existsSync(join(tpDir, 'node_modules/dep-x/test')))
    const record = JSON.parse(readFileSync(join(tpDir, 'third-party.json'), 'utf8'))
    assert.deepEqual(record.modules.find(m => m.name === 'dep-x'), { path: 'node_modules/dep-x', name: 'dep-x', version: '1.2.3', license: 'MIT', resolved: 'https://example/dep-x-1.2.3.tgz', integrity: 'sha512-x' })
    assert.equal(tp.bare, '9.9.9')

    // Writing: installed and tested together first, then written.
    const w = writePackages({ dev, out })
    assert.equal(w.ok, true, JSON.stringify(w.results))
    const ap = findPackage('apkg', out)
    assert.ok(existsSync(join(ap, 'org/amod/index.js')))
    assert.ok(existsSync(join(ap, 'README.md')))
    assert.deepEqual(manifest(ap).requires, ['third-party'])
    // Written again unchanged: the same hash (nothing in it depends on when).
    const before = manifest(ap).hash
    writePackages({ dev, out })
    assert.equal(manifest(ap).hash, before)

    // Installing: what it requires first, fully qualified, our module by name.
    const done = install('apkg', { from: out, into })
    assert.deepEqual(done.map(d => [d.package, d.action]), [['third-party', 'installed'], ['apkg', 'installed']])
    assert.ok(existsSync(join(into, 'org/amod/index.js')))
    assert.equal(readlinkSync(join(into, 'node_modules/amod')), '../org/amod')
    assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', "import { a } from 'amod'; console.log(a())"], { cwd: into, encoding: 'utf8' }).trim(), '43')
    // Current: skipped.
    assert.deepEqual(install('apkg', { from: out, into }).map(d => d.action), ['current', 'current'])
    // Tested within the package: the module's tests and the package's.
    const t = testPackage('apkg', { into })
    assert.equal(t.ok, true, JSON.stringify(t.runs))
    assert.deepEqual(t.runs.map(r => r.what), ['org/amod', 'base-package-apkg/test'])
    assert.equal(testPackage('third-party', { into }).ok, true)

    // A changed module: a new hash, the package updated as one unit.
    put(join(dev, 'org/amod/index.js'), "import { x } from 'dep-x'\nexport const a = () => x + 1\nexport const b = 2\n")
    writePackages({ dev, out })
    assert.notEqual(manifest(ap).hash, before)
    assert.deepEqual(install('apkg', { from: out, into }).map(d => d.action), ['current', 'updated'])
    assert.match(readFileSync(join(into, 'org/amod/index.js'), 'utf8'), /b = 2/)

    // A failing test: nothing written.
    put(join(dev, 'org/amod/index.js'), 'export const a = () => 0\n')
    const bad = writePackages({ dev, out })
    assert.equal(bad.ok, false)
    assert.match(readFileSync(join(ap, 'org/amod/index.js'), 'utf8'), /b = 2/)

    // An override: the module replaced by another folder, then tested
    // within its package; recorded, and a plain install puts it back.
    const alt = join(dev, 'alt-amod')
    json(join(alt, 'package.json'), { name: 'amod', type: 'module', exports: './index.js', scripts: { test: 'node --test test/*.test.js' } })
    put(join(alt, 'index.js'), "import { x } from 'dep-x'\nexport const a = () => x + 1\nexport const c = 3\n")
    put(join(alt, 'test/a.test.js'), readFileSync(join(dev, 'org/amod/test/a.test.js')))
    put(join(alt, 'node_modules/junk/x.js'), 'not copied\n')
    assert.deepEqual(install('apkg', { from: out, into, overrides: { 'org/amod': alt } }).map(d => d.action), ['current', 'updated'])
    assert.match(readFileSync(join(into, 'org/amod/index.js'), 'utf8'), /c = 3/)
    assert.ok(!existsSync(join(into, 'org/amod/node_modules')))
    assert.deepEqual(installed(into).packages.apkg.overrides, { 'org/amod': alt })
    assert.equal(testPackage('apkg', { into }).ok, true)
    assert.throws(() => install('apkg', { from: out, into, overrides: { 'org/other': alt } }), /not a folder of base-package-apkg/)
    install('apkg', { from: out, into })
    assert.match(readFileSync(join(into, 'org/amod/index.js'), 'utf8'), /b = 2/)
    assert.equal(installed(into).packages.apkg.overrides, undefined)

    // A folder is one package's only.
    const clash = join(out, 'base-package-clash')
    json(join(clash, 'package.json'), { name: 'base-package-clash', pkgm: { package: 'clash', requires: [], folders: ['org/amod'], hash: 'h' } })
    mkdirSync(join(clash, 'org/amod'), { recursive: true })
    assert.throws(() => install('clash', { from: out, into }), /org\/amod belongs to base-package-apkg/)

    // Missing siblings are said, with where to get them.
    assert.throws(() => install('nope', { from: out, into }), /missing: haiccing\/base-package-nope .*https:\/\/github.com\/haiccing\/base-package-nope/)

    // Uninstall: refused while required, then one unit at a time.
    assert.throws(() => uninstall('third-party', { into }), /required by base-package-apkg/)
    assert.equal(uninstall('apkg', { into }), true)
    assert.ok(!existsSync(join(into, 'org/amod')) && !existsSync(join(into, 'node_modules/amod')))
    assert.equal(uninstall('third-party', { into }), true)
    assert.ok(!existsSync(join(into, 'node_modules/dep-x')))
    // Every change, a record.
    const changes = readFileSync(join(into, '.pkgm/changes.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l))
    assert.deepEqual(changes.map(c => `${c.package}:${c.action}`), ['third-party:installed', 'apkg:installed', 'apkg:updated', 'apkg:updated', 'apkg:updated', 'apkg:removed', 'third-party:removed'])
    assert.deepEqual(Object.keys(changes[3].overrides), ['org/amod'])
  } finally {
    for (const d of [dev, out, into]) rmSync(d, { recursive: true, force: true })
  }
})

test('the platform is checked', () => {
  const out = mkdtempSync(join(tmpdir(), 'pkgm-out-'))
  const into = mkdtempSync(join(tmpdir(), 'pkgm-into-'))
  try {
    json(join(out, 'base-package-elsewhere/package.json'), { pkgm: { package: 'elsewhere', requires: [], folders: [], hash: 'h', platform: 'android-arm64' } })
    if (platform() !== 'android-arm64') assert.throws(() => install('elsewhere', { from: out, into }), /is for android-arm64/)
  } finally {
    for (const d of [out, into]) rmSync(d, { recursive: true, force: true })
  }
})

test('an interrupted install is redone', () => {
  const dev = devRepo()
  const out = mkdtempSync(join(tmpdir(), 'pkgm-out-'))
  const into = mkdtempSync(join(tmpdir(), 'pkgm-into-'))
  try {
    importThirdParty({ dev, out })
    install('third-party', { from: out, into })
    const reg = installed(into)
    reg.packages['third-party'].state = 'installing'
    writeFileSync(join(into, '.pkgm/installed.json'), JSON.stringify(reg))
    rmSync(join(into, 'node_modules/dep-x'), { recursive: true })
    assert.deepEqual(install('third-party', { from: out, into }).map(d => d.action), ['updated'])
    assert.ok(existsSync(join(into, 'node_modules/dep-x/index.js')))
    chmodSync(join(into, `node_modules/bare-runtime-${platform()}/bin/bare`), 0o755)
  } finally {
    for (const d of [dev, out, into]) rmSync(d, { recursive: true, force: true })
  }
})

// The package manager is installed on its own (it requires nothing): its
// provider is tested where HAICC is installed beside it.
const reconcile = await import('haicc-reconcile').catch(() => null)

test('the provider for HAICC: a package as a prerequisite', { skip: reconcile ? false : 'haicc-reconcile is not installed beside the package manager' }, async () => {
  const { createEngine } = reconcile
  const { providers } = await import('../reconcile.js')
  const dev = devRepo()
  const out = mkdtempSync(join(tmpdir(), 'pkgm-out-'))
  const into = mkdtempSync(join(tmpdir(), 'pkgm-into-'))
  try {
    importThirdParty({ dev, out })
    writePackages({ dev, out })
    const e = createEngine({ providers, owner: 'test' })
    const reqs = [{ name: 'apkg', kind: 'package', want: { name: 'apkg', from: out, into } }]
    assert.deepEqual((await e.check(reqs)).map(c => [c.status, c.fixable]), [['missing', true]])
    await e.apply(reqs)
    assert.deepEqual((await e.check(reqs)).map(c => c.status), ['met'])
    assert.ok(installed(into).packages['third-party'])
    // A new version beside the others: different, and updated.
    put(join(dev, 'org/amod/index.js'), "import { x } from 'dep-x'\nexport const a = () => x + 1\nexport const d = 4\n")
    writePackages({ dev, out })
    assert.deepEqual((await e.check(reqs)).map(c => c.status), ['different'])
    await e.apply(reqs)
    assert.deepEqual((await e.check(reqs)).map(c => c.status), ['met'])
    await e.remove(reqs)
    assert.equal(installed(into).packages.apkg, undefined)
  } finally {
    for (const d of [dev, out, into]) rmSync(d, { recursive: true, force: true })
  }
})
