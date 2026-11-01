import { test } from 'node:test'
import assert from 'node:assert/strict'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { openChannel } from 'p2p-channel'
import { createRns, rnsClient } from '../index.js'

const A = 'a'.repeat(64)
const B = 'b'.repeat(64)

test('nodes and their resources, by URI', () => {
  const rns = createRns({ swarm: 'test' })
  rns.registerNode({ owner: A, name: 'master' })
  rns.register({ owner: A, name: 'packages', id: 'id-1', key: 'k1', type: 'packages' })
  rns.register({ owner: A, name: 'node', id: 'id-2', key: 'k2', type: 'node' })
  rns.registerNode({ owner: B, name: 'node-1' })
  rns.register({ owner: B, name: 'node', id: 'id-3', key: 'k3', type: 'node' })

  assert.deepEqual(rns.resolve('/test/master/packages'), { uri: '/test/master/packages', kind: 'resource', node: 'master', name: 'packages', type: 'packages', id: 'id-1', key: 'k1', owner: A })
  assert.equal(rns.resolve('/test/master').kind, 'node')
  assert.equal(rns.resolve('/test/nobody'), null)
  assert.deepEqual(rns.list('/test/*').map(r => r.uri), ['/test/master', '/test/node-1'])
  assert.deepEqual(rns.list('/test/*/node').map(r => r.uri), ['/test/master/node', '/test/node-1/node'])
  assert.deepEqual(rns.list('/test/master/*').map(r => r.name), ['node', 'packages'])
  assert.equal(rns.reverse('k3'), '/test/node-1/node')
  assert.equal(rns.reverse(B), '/test/node-1')
  assert.deepEqual(rns.metrics(), { records: 5, nodes: 2, registerNode: 2, register: 3, refused: 0, resolve: 3, list: 3, reverse: 2 })
})

test('owners only: names are unique, a node names only its own', () => {
  const events = []
  const rns = createRns({ swarm: 'test', observer: e => events.push(e) })
  rns.registerNode({ owner: A, name: 'master' })
  assert.throws(() => rns.registerNode({ owner: B, name: 'master' }), /taken/)
  assert.throws(() => rns.registerNode({ owner: A, name: 'other' }), /already a node/)
  assert.throws(() => rns.register({ owner: B, name: 'x', id: 'i', key: 'k' }), /not a node/)
  // Validation is the boundary's: the handler refuses what a peer sends.
  assert.throws(() => rns.handler(B)({ op: 'registerNode', name: 'Not-Valid' }), /not a node name/)
  assert.throws(() => rns.handler(B)({ op: 'resolve', uri: 'no-slash' }), /not absolute/)
  rns.registerNode({ owner: A, name: 'master' }) // again: the same owner, fine
  rns.register({ owner: A, name: 'repo', id: 'i', key: 'k1' })
  const again = rns.register({ owner: A, name: 'repo', id: 'i', key: 'k2' }) // rebuilt: a new key
  assert.equal(again.key, 'k2')
  assert.equal(events.filter(e => e.kind === 'refused').length, 5)
  assert.equal(events.at(-1).replaced, 'k1')
})

test('over a channel: the owner is the connection, not the message', async () => {
  const sa = new NoiseSecretStream(true)
  const sb = new NoiseSecretStream(false)
  sa.rawStream.pipe(sb.rawStream).pipe(sa.rawStream)
  await Promise.all([sa.opened, sb.opened])
  const rns = createRns({ swarm: 'test' })
  // The service side: requests from this connection belong to its peer.
  openChannel(sa, { name: 'p2p-rns', onrequest: rns.handler(sa.remotePublicKey.toString('hex')) })
  const client = rnsClient(openChannel(sb, { name: 'p2p-rns' }))
  await client.registerNode('node-1')
  await client.register({ name: 'notes', id: 'id-9', key: 'k9', type: 'notes' })
  const r = await client.resolve('/test/node-1/notes')
  assert.equal(r.owner, sb.publicKey.toString('hex'))
  assert.deepEqual((await client.list('/test/*')).map(x => x.uri), ['/test/node-1'])
  await assert.rejects(client.registerNode('another'), /already a node/)
  sa.destroy()
  sb.destroy()
})
