import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import crypto from 'hypercore-crypto'
import { openStore } from 'p2p-store'
import { startDht } from 'p2p-dht'
import { connect } from 'p2p-connect'
import { replicator } from 'p2p-replicate'
import { openChannel } from 'p2p-channel'
import { rnsClient } from 'p2p-rns'
import { mrepos } from 'p2p-mrepo'
import { openRepo } from '../../mycelium-git/index.js'
import { startNode, swarmTopic, askRequest, requestBundle } from '../index.js'

const dir = () => mkdtempSync(join(tmpdir(), 'p2p-node-'))
const code = new URL('../../p2p-rns', import.meta.url).pathname // a small folder to deploy as packages
const host = '127.0.0.1'

// A peer on the host: its own store, DHT node and connections.
async function peer (port) {
  const store = await openStore({ storage: dir() })
  const d = await startDht({ host, bootstrap: [{ host, port }] })
  const net = connect({ dht: d.dht, keyPair: crypto.keyPair() })
  const rep = replicator({ store })
  const channels = new Map()
  net.onConnection((stream, p) => {
    rep.replicate(stream, { peer: p.peer })
    channels.set(p.peer, {
      rns: rnsClient(openChannel(stream, { name: 'p2p-rns', peer: p.peer })),
      requests: openChannel(stream, { name: 'p2p-request', peer: p.peer })
    })
  })
  const to = async key => {
    net.connectTo(Buffer.from(key, 'hex'))
    while (!channels.has(key)) await new Promise(resolve => setTimeout(resolve, 20))
    return channels.get(key)
  }
  return { store, net, rep, to, async close () { await net.close(); await d.close(); await store.close() } }
}

test('genesis: the master serves p2p-rns, its packages and the boot repository; a peer reads them lazily', async () => {
  const events = []
  const primaryKey = crypto.randomBytes(32)
  const master = await startNode({ role: 'master', swarm: 'test', name: 'master', storage: dir(), primaryKey, host, dhtPort: 49851, code, observer: e => events.push(e) })
  assert.equal(master.uri, '/test/master')
  const p = await peer(49851)
  const { rns } = await p.to(master.key)
  assert.deepEqual((await rns.list('/test/master/*')).map(r => r.name), ['boot', 'node', 'packages'])
  const record = await rns.resolve('/test/master/packages')
  assert.equal(record.owner, master.key)
  const replica = await mrepos({ store: p.store }).replica(record.key)
  p.rep.track(replica.drive)
  await replica.drive.update({ wait: true })
  const pkg = JSON.parse((await openRepo(replica.backend).read('/capability/default/package.json')).toString())
  assert.equal(pkg.name, 'p2p-rns')
  const blobs = p.rep.metrics().filter(m => m.part === 'blobs').reduce((n, m) => n + m.downloaded.blocks, 0)
  assert.ok(blobs < p.store.resources().find(r => r.how === 'replica').blobs.length, 'lazily')
  // The master's own repository was cloned from the boot repository.
  const node = JSON.parse((await openRepo(master.repos.node.backend).read('/main/node.json')).toString())
  assert.equal(node.key, master.key)
  assert.equal(master.repos.node.origin.id, master.repos.boot.id)
  await p.close()
  await master.stop()
  const kinds = new Set(events.map(e => `${e.module}:${e.kind}`))
  for (const k of ['p2p-node:genesis', 'p2p-node:live', 'p2p-node:node-started', 'p2p-node:node-stopped', 'p2p-rns:node-registered', 'p2p-mrepo:repo-cloned']) assert.ok(kinds.has(k), k)
  assert.ok(!JSON.stringify(events).includes(primaryKey.toString('hex')), 'no secret in the log')
})

test('a node joins: under its name, from the boot repository; requests to it and to the master answered', async () => {
  const master = await startNode({ role: 'master', swarm: 'test', name: 'master', storage: dir(), primaryKey: crypto.randomBytes(32), host, dhtPort: 49854, code })
  const joinOpts = { role: 'join', swarm: 'test', name: 'node-1', host, bootstrap: [{ host, port: 49854 }], master: master.key, packages: master.packages }
  const primaryKey = crypto.randomBytes(32)
  const n1 = await startNode({ ...joinOpts, storage: dir(), primaryKey })
  assert.equal(n1.uri, '/test/node-1')
  assert.equal(n1.repos.node.origin.id, master.repos.boot.id, 'cloned from the boot repository')

  const p = await peer(49854)
  const { rns } = await p.to(master.key)
  assert.deepEqual((await rns.list('/test/*')).map(r => r.uri), ['/test/master', '/test/node-1'])
  const n1Repo = await rns.resolve('/test/node-1/node')
  assert.equal(n1Repo.owner, n1.key)
  // A second node under a taken name is refused.
  await assert.rejects(startNode({ ...joinOpts, storage: dir(), primaryKey: crypto.randomBytes(32) }), /taken/)

  // A request, written in the requester's own repository, sent as a bundle.
  const outbox = await mrepos({ store: p.store }).create('outbox')
  for (const [key, uri] of [[n1.key, '/test/node-1/node'], [master.key, '/test/master/node']]) {
    const bundle = await requestBundle(outbox.backend, { 'request.md': '# Request: status\n\nStatus: node\n' })
    const { requests } = await p.to(key)
    const answer = await askRequest(requests, { name: 'status-1', bundle })
    assert.deepEqual(answer.executed, ['status-1'])
    // The response, read from a replica of the node's repository.
    const record = await rns.resolve(uri)
    const replica = await mrepos({ store: p.store }).replica(record.key)
    await replica.drive.update({ wait: true })
    const repo = openRepo(replica.backend)
    await new Promise(resolve => setTimeout(resolve, 200))
    await replica.drive.update({ wait: true })
    const response = (await repo.read('/main/responses/status-1/response.md')).toString()
    assert.match(response, /Status given/)
    assert.match(response, new RegExp(`"key": "${key}"`))
    // Taken once: the same name again is refused.
    await assert.rejects(askRequest(requests, { name: 'status-1', bundle }), /exists/)
    // The boundary: a name that breaks the rules is refused at the handler.
    await assert.rejects(askRequest(requests, { name: 'Not A Name', bundle }), /not a request name/)
  }
  await p.close()
  await n1.stop()

  // Rebuilt from a fresh store: the same identity, name and repository.
  const again = await startNode({ ...joinOpts, storage: dir(), primaryKey })
  assert.equal(again.key, n1.key)
  assert.equal(again.repos.node.key, n1.repos.node.key)
  assert.equal(again.repos.node.id, n1.repos.node.id)
  await again.stop()
  await master.stop()
})
