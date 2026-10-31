// A peer composed from the p2p series, for step 2's validation.
//   serve <storage> <host> <dht-port> <audit-file>
//     the first peer: a private DHT from nothing, a store in RAM, its own
//     drive written with 20 files of 1 KB, served on the drive's topic, a
//     channel answering requests. Prints {"event":"ready",key,...}; ends once
//     the other peer says it is done (or after 60 s), printing its metrics.
//   join <storage> <host> <bootstrap host:port> <key> <audit-file>
//     the second peer: joins the DHT, opens a replica of the drive by key,
//     finds the first peer on the drive's topic, replicates, reads two files
//     (lazily), asks a request on a channel, says done; prints its result
//     and metrics.
// Every module's events go to the audit file (one JSON line each).
// Composed here, as the application composes them; no module knows another.

import fs from 'node:fs'
import process from 'node:process'
import crypto from 'hypercore-crypto'
import { openStore } from 'p2p-store'
import { startBootstrap, startDht } from 'p2p-dht'
import { connect } from 'p2p-connect'
import { replicator } from 'p2p-replicate'
import { openChannel } from 'p2p-channel'

const [role, storage, host, ...rest] = process.argv.slice(2)
const t0 = Date.now()
const since = () => Date.now() - t0
const out = o => console.log(JSON.stringify(o))
const auditFile = rest[rest.length - 1]
const audit = fs.openSync(auditFile, 'w')
const observer = e => fs.writeSync(audit, JSON.stringify(e) + '\n')
const runtime = typeof Bare !== 'undefined' ? `bare ${Bare.version}` : `node ${process.version}`
fs.rmSync(storage, { recursive: true, force: true })

const store = await openStore({ storage, primaryKey: crypto.randomBytes(32), observer })
const rep = replicator({ store, observer })
const keyPair = crypto.keyPair()

if (role === 'serve') {
  const [portArg] = rest
  const boot = await startBootstrap({ host, port: Number(portArg), observer })
  const node = await startDht({ host, bootstrap: boot.bootstrap, observer })
  const net = connect({ dht: node.dht, keyPair, observer })
  const drive = await store.own('repo')
  for (let i = 0; i < 20; i++) await drive.put(`/f${i}.txt`, Buffer.alloc(1000, 97 + (i % 26)))
  rep.track(drive)
  let finish
  const finished = new Promise(resolve => { finish = resolve })
  const limit = setTimeout(() => { out({ event: 'timeout', ms: since() }); finish() }, 60000)
  net.onConnection((stream, peer) => {
    rep.replicate(stream, { peer: peer.peer })
    openChannel(stream, {
      name: 'step-2',
      peer: peer.peer,
      observer,
      onrequest: body => ({ answer: `${body.ask} answered by ${runtime}` }),
      onmessage: body => { if (body.done) finish() }
    })
  })
  await net.join(drive.discoveryKey, { server: true, client: false })
  out({ event: 'ready', key: drive.key.toString('hex'), dht: `${host}:${portArg}`, runtime, ms: since() })
  await finished
  clearTimeout(limit)
  await new Promise(resolve => setTimeout(resolve, 200))
  out({ event: 'done', runtime, ms: since(), metrics: { store: store.resources(), replicate: rep.metrics(), connect: net.metrics(), dht: node.metrics(), bootstrap: boot.metrics() } })
  await net.close()
  await node.close()
  await boot.close()
} else if (role === 'join') {
  const [bootstrapArg, key] = rest
  const [bhost, bport] = bootstrapArg.split(':')
  const node = await startDht({ host, bootstrap: [{ host: bhost, port: Number(bport) }], observer })
  const net = connect({ dht: node.dht, keyPair, observer })
  const replica = await store.replica(key)
  rep.track(replica)
  let channel
  const connected = new Promise(resolve => net.onConnection((stream, peer) => {
    rep.replicate(stream, { peer: peer.peer })
    channel = openChannel(stream, { name: 'step-2', peer: peer.peer, observer })
    resolve()
  }))
  await net.join(replica.discoveryKey, { server: false, client: true })
  await connected
  const connectedMs = since()
  await replica.update({ wait: true })
  const f3 = String(await replica.get('/f3.txt')).slice(0, 3)
  const f17 = String(await replica.get('/f17.txt')).slice(0, 3)
  const readMs = since()
  const held = store.resources().find(r => r.how === 'replica')
  await channel.opened
  const answer = await channel.request({ ask: 'are you there?' })
  channel.send({ done: true })
  await new Promise(resolve => setTimeout(resolve, 200))
  out({
    event: 'result',
    runtime,
    read: { f3, f17 },
    lazy: { db: held.db, blobs: held.blobs },
    answer,
    ms: { connected: connectedMs, read: readMs, total: since() },
    metrics: { replicate: rep.metrics(), connect: net.metrics(), dht: node.metrics() }
  })
  await net.close()
  await node.close()
}
await store.close()
fs.closeSync(audit)
fs.rmSync(storage, { recursive: true, force: true })
process.exit(0)
