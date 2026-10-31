import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'hypercore-crypto'
import { startBootstrap, startDht } from 'p2p-dht'
import { connect } from '../index.js'

test('two nodes meet on a topic; a refused node does not connect', async () => {
  const events = []
  const observer = e => events.push(e)
  const boot = await startBootstrap({ host: '127.0.0.1', port: 49821 })
  const nodes = []
  const node = async admit => {
    const d = await startDht({ host: '127.0.0.1', bootstrap: boot.bootstrap })
    const keyPair = crypto.keyPair()
    const n = connect({ dht: d.dht, keyPair, admit, observer })
    nodes.push({ d, n })
    return n
  }
  const outsider = crypto.keyPair()
  let refuse = null
  const a = await node(key => !refuse || !key.equals(refuse))
  const b = await node()
  const topic = crypto.randomBytes(32)
  const heard = new Promise(resolve => b.onConnection(stream => stream.once('data', d => resolve(d.toString()))))
  a.onConnection(stream => stream.write('hello'))
  await a.join(topic, { server: true, client: false })
  await b.join(topic, { server: false, client: true })
  assert.equal(await heard, 'hello')
  assert.equal(a.connections().length, 1)
  assert.equal(a.connections()[0].peer, b.publicKey.toString('hex'))

  // A node a refuses: its connection never opens on a.
  refuse = outsider.publicKey
  const d = await startDht({ host: '127.0.0.1', bootstrap: boot.bootstrap })
  const c = connect({ dht: d.dht, keyPair: outsider, observer })
  nodes.push({ d, n: c })
  await c.join(topic, { server: false, client: true })
  await new Promise(resolve => setTimeout(resolve, 500))
  assert.equal(a.connections().length, 1, 'still only b')
  assert.ok(events.some(e => e.kind === 'connection-refused' && e.peer === outsider.publicKey.toString('hex')))

  for (const { n, d } of nodes.reverse()) { await n.close(); await d.close() }
  await boot.close()
  const kinds = new Set(events.map(e => e.kind))
  for (const k of ['topic-joined', 'connection-opened', 'connection-closed', 'connection-refused']) assert.ok(kinds.has(k), k)
  assert.ok(events.filter(e => e.kind === 'connection-closed').every(e => e.bytesReceived > 0))
})
