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
import { startNode, swarmTopic } from '../index.js'

const dir = () => mkdtempSync(join(tmpdir(), 'p2p-node-'))
const code = new URL('../../p2p-rns', import.meta.url).pathname // a small folder to deploy as packages
const host = '127.0.0.1'

test('genesis: the master serves p2p-rns and its packages; a peer resolves and reads them lazily', async () => {
  const events = []
  const primaryKey = crypto.randomBytes(32)
  const master = await startNode({ role: 'master', swarm: 'test', name: 'master', storage: dir(), primaryKey, host, dhtPort: 49851, code, observer: e => events.push(e) })
  assert.equal(master.uri, '/test/master')

  // A peer on the host: its own store, DHT node and connections.
  const store = await openStore({ storage: dir() })
  const d = await startDht({ host, bootstrap: [{ host, port: 49851 }] })
  const net = connect({ dht: d.dht, keyPair: crypto.keyPair() })
  const rep = replicator({ store })
  let rns
  const connected = new Promise(resolve => net.onConnection((stream, peer) => {
    rep.replicate(stream, { peer: peer.peer })
    rns = rnsClient(openChannel(stream, { name: 'p2p-rns', peer: peer.peer }))
    resolve()
  }))
  await net.join(swarmTopic('test'), { server: false, client: true })
  await connected

  assert.deepEqual((await rns.list('/test/master/*')).map(r => r.name), ['node', 'packages'])
  const record = await rns.resolve('/test/master/packages')
  assert.equal(record.key, master.repos.packages.key)
  assert.equal(record.owner, master.key)
  assert.equal(await rns.reverse(master.key), '/test/master')

  const replica = await mrepos({ store }).replica(record.key)
  rep.track(replica.drive)
  await replica.drive.update({ wait: true })
  assert.equal((await replica.info()).id, record.id)
  const pkg = JSON.parse((await openRepo(replica.backend).read('/capability/default/package.json')).toString())
  assert.equal(pkg.name, 'p2p-rns')
  const blobs = rep.metrics().filter(m => m.part === 'blobs').reduce((n, m) => n + m.downloaded.blocks, 0)
  const total = store.resources().find(r => r.how === 'replica').blobs.length
  assert.ok(blobs < total, `lazily: ${blobs} of ${total}`)

  await net.close()
  await d.close()
  await store.close()
  await master.stop()
  const kinds = new Set(events.map(e => `${e.module}:${e.kind}`))
  for (const k of ['p2p-node:genesis', 'p2p-node:node-started', 'p2p-node:node-stopped', 'p2p-rns:node-registered', 'p2p-rns:registered', 'p2p-mrepo:repo-created', 'p2p-dht:dht-started', 'p2p-connect:connection-opened']) assert.ok(kinds.has(k), k)
  assert.ok(!JSON.stringify(events).includes(primaryKey.toString('hex')), 'no secret in the log')
})

test('a rebuilt master: the same primary key and code give the same identity and packages commit', async () => {
  const primaryKey = crypto.randomBytes(32)
  const opts = { role: 'master', swarm: 'test', name: 'master', primaryKey, host, code }
  const a = await startNode({ ...opts, storage: dir(), dhtPort: 49852 })
  const first = { key: a.key, packages: a.repos.packages.key, commit: a.packagesCommit, node: a.repos.node.key }
  await a.stop()
  const b = await startNode({ ...opts, storage: dir(), dhtPort: 49853 })
  assert.deepEqual({ key: b.key, packages: b.repos.packages.key, commit: b.packagesCommit, node: b.repos.node.key }, first)
  assert.equal(b.repos.packages.id, a.repos.packages.id, 'the same internal id: it is permanent')
  assert.equal(b.repos.node.id, a.repos.node.id)
  await b.stop()
})
