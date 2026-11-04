import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync, cpSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync, execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(dirname(fileURLToPath(import.meta.url)))
const manager = join(dirname(here), 'pkgm-base-manager')

test("the package manager's boot: installed by itself, twice the same, pkgm to run it", async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pkgm-boot-'))
  const home = join(dir, '.haicc')
  try {
    // base-package-pkgm, laid out as the package manager writes it.
    const pkg = join(dir, 'folder', 'base-package-pkgm')
    cpSync(manager, join(pkg, 'pear-full-square', 'pkgm-base-manager'), { recursive: true, filter: s => !s.includes('node_modules') })
    cpSync(here, join(pkg, 'pear-full-square', 'pkgm-base-boot'), { recursive: true })
    const { hashTree } = await import(pathToFileURL(join(manager, 'index.js')).href)
    const folders = ['pear-full-square/pkgm-base-manager', 'pear-full-square/pkgm-base-boot']
    writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'base-package-pkgm', pkgm: { package: 'pkgm', requires: [], folders, hash: hashTree(pkg, folders) } }))
    const boot = () => spawnSync('sh', [join(pkg, 'pear-full-square', 'pkgm-base-boot', 'boot.sh'), join(dir, 'folder')], { encoding: 'utf8', env: { ...process.env, HAICC_HOME: home } })
    const first = boot()
    assert.equal(first.status, 0, first.stdout + first.stderr)
    assert.match(first.stdout, /pkgm: installed/)
    assert.ok(existsSync(join(home, 'packages', 'pear-full-square', 'pkgm-base-manager', 'cli.js')))
    const again = boot()
    assert.match(again.stdout, /pkgm: current/)
    const list = JSON.parse(execFileSync(join(home, 'bin', 'pkgm'), ['list'], { encoding: 'utf8', env: { ...process.env, HAICC_HOME: home } }))
    assert.deepEqual(Object.keys(list.packages), ['pkgm'])
    assert.equal(list.into, join(home, 'packages'))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
