import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
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
  assert.ok(existsSync(join(work, 'deployment', 'topics', 'lifecycle')), 'the record stays')
  // Reopened: the desired state is the fold of what was recorded.
  const again = await openDeployment({ project: join(dir, 'project.json'), work })
  assert.deepEqual(await again.desired().then(x => [x.deployed, x.running, x.last]), [false, false, 'teardown'])
})
