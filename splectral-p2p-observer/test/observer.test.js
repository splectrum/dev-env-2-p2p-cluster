// The observer on a node: named actions in, results out; unknown refused.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import crypto from 'hypercore-crypto'
import { startNode } from 'p2p-node'
import { attachObserver } from '../index.js'

test('named actions: state and write; an unknown action refused; no secret in what it says', async () => {
  const primaryKey = crypto.randomBytes(32)
  const node = await startNode({ role: 'master', swarm: 'obs', name: 'master', storage: mkdtempSync(join(tmpdir(), 'obs-')), primaryKey, host: '127.0.0.1', dhtPort: 49800, code: new URL('../../p2p-rns', import.meta.url).pathname, metricsEvery: 60000 })
  const input = new PassThrough()
  const out = []
  const o = attachObserver({ node, input, log: e => out.push(e) })
  input.write(JSON.stringify({ id: 1, action: 'state' }) + '\n')
  input.write(JSON.stringify({ id: 2, action: 'write', with: { name: 'hello', text: 'Hello from a test.\n' } }) + '\n')
  input.write(JSON.stringify({ id: 3, action: 'format-disk' }) + '\n')
  await new Promise(resolve => setTimeout(resolve, 50))
  await o.settled()
  const results = out.filter(e => e.kind === 'action-result')
  assert.deepEqual(results.map(r => [r.id, r.ok]), [[1, true], [2, true], [3, false]])
  assert.equal(results[0].result.status.uri, '/obs/master')
  assert.equal(results[1].result.path, '/main/notes/hello.md')
  assert.equal((await node.read(node.repos.node, '/main/notes/hello.md')).toString(), 'Hello from a test.\n')
  assert.match(results[2].error, /unknown action/)
  assert.ok(!JSON.stringify(out).includes(primaryKey.toString('hex')))
  o.detach()
  await node.stop()
})
