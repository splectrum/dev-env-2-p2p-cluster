import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { openDeployment } from '../index.js'

// A project of folders: one configuration, one "running" (a stand-in for a
// server), so the lifecycle can be followed without a swarm.
test('the lifecycle: deploy, start, stop, teardown, reconcile; the desired state as a fold', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'haicc-dep-'))
  writeFileSync(join(dir, 'project.json'), JSON.stringify({
    owner: 'demo-test',
    configuration: [{ name: 'config', kind: 'folder', want: { path: '{work}/config' } }],
    running: [{ name: 'server', kind: 'folder', want: { path: '{work}/running' }, needs: ['config'] }]
  }))
  const work = join(dir, 'work')
  const d = await openDeployment({ project: join(dir, 'project.json'), work })
  assert.deepEqual((await d.status()).desired.last, null)

  await d.deploy()
  assert.ok(existsSync(join(work, 'config')) && !existsSync(join(work, 'running')))
  await d.start()
  assert.ok(existsSync(join(work, 'running')))
  const st = await d.status()
  assert.deepEqual([st.desired.deployed, st.desired.running], [true, true])
  assert.ok(st.check.every(x => x.status === 'met'))

  await d.stop()
  assert.ok(existsSync(join(work, 'config')) && !existsSync(join(work, 'running')), 'stop keeps the configuration')
  // The world drifts; reconcile brings it back to the desired state (stopped, deployed).
  await d.start()
  const drift = (await import('node:fs')).rmSync
  drift(join(work, 'running'), { recursive: true })
  const r = await d.reconcile()
  assert.deepEqual(r.done.map(x => x.name), ['server'])

  await d.teardown()
  assert.ok(!existsSync(join(work, 'config')) && !existsSync(join(work, 'running')))
  assert.ok(existsSync(join(work, 'deployment', 'lifecycle.jsonl')), 'the record stays')
  // Reopened: the desired state is the fold of what was recorded.
  const again = await openDeployment({ project: join(dir, 'project.json'), work })
  assert.deepEqual(await again.desired().then(x => [x.deployed, x.running, x.last]), [false, false, 'teardown'])
})

// A node, two down from the root's haiccing/, the platform's package copied
// in whole: fetch.sh found in it, what is here listed, a package tested.
test('a node finds its packages and the root\'s haiccing/', () => {
  const dir = mkdtempSync(join(tmpdir(), 'haicc-node-'))
  const node = join(dir, 'hosts', 'master')
  const put = (f, text) => { mkdirSync(dirname(join(node, f)), { recursive: true }); writeFileSync(join(node, f), text) }
  mkdirSync(join(dir, 'haiccing'))
  put('packages/base-package-haicc/package.json', JSON.stringify({ pkgm: { hash: 'bbbbbbbbbbbbbbbb' } }))
  put('packages/base-package-haicc/modules/pear-full-square/haicc-base-boot/fetch.sh', 'echo "fetching into $1"\n')
  put('packages/base-package-haicc/test/one/test', '#!/bin/sh\necho "# tests 1"\necho "# pass 1"\n')
  chmodSync(join(node, 'packages/base-package-haicc/test/one/test'), 0o755)
  const haicc = (...args) => spawnSync(process.execPath, [fileURLToPath(new URL('../haicc.js', import.meta.url)), ...args], { encoding: 'utf8', env: { ...process.env, HAICC_WORK: node } })
  const list = haicc('list')
  assert.equal(list.status, 0, list.stderr)
  assert.match(list.stdout, /base-package-haicc {2}bbbbbbbbbbbb/)
  assert.ok(haicc('fetch', 'base-package-x').stdout.includes(`fetching into ${join(dir, 'haiccing')}`))
  const t = haicc('test', 'base-package-haicc')
  assert.equal(t.status, 0, t.stdout)
  assert.match(t.stdout, /ok {5}base-package-haicc: test\/one \(1\/1\)/)
  const boot = haicc('boot')
  assert.equal(boot.status, 0, boot.stdout)
  assert.match(boot.stdout, /Ready: 1 test runs passed \(base-package-haicc\)/)
  assert.equal(haicc('test', 'nope').status, 1)
})
