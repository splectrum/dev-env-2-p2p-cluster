import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startBootstrap, startDht } from '../index.js'

test('a private DHT from nothing, and a node joining it', async () => {
  const events = []
  const observer = e => events.push(e)
  const boot = await startBootstrap({ host: '127.0.0.1', port: 49811, observer })
  assert.equal(boot.nodes.length, 2)
  assert.deepEqual(boot.bootstrap, [{ host: '127.0.0.1', port: 49811 }])
  const node = await startDht({ host: '127.0.0.1', bootstrap: boot.bootstrap, observer })
  const m = node.metrics()
  assert.ok(m.routingTable >= 1, 'the node knows the DHT')
  assert.equal(typeof m.queries.total, 'number')
  await node.close()
  await boot.close()
  assert.deepEqual(events.map(e => `${e.kind}:${e.role}`),
    ['dht-started:bootstrap', 'dht-started:persistent', 'dht-started:node', 'dht-closed:node', 'dht-closed:bootstrap'])
  assert.ok(events.every(e => e.module === 'p2p-dht'))
})
