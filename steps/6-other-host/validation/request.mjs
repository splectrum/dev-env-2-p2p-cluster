// A request to a node's repository, from a host, as a peer of the swarm,
// knowing only an invitation (public facts) and its own address on the
// swarm's data plane. The node's repository resolved by URI (p2p-rns, on
// the master), the request written in the requester's own repository and
// sent as a bundle on a channel to the node owning it; the response read
// back from a replica. One JSON line.
//   node request.mjs <invitation.json> <own-address> <node> <request-name> <storage-parent>
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import crypto from 'hypercore-crypto'
import { openStore } from 'p2p-store'
import { startDht } from 'p2p-dht'
import { connect } from 'p2p-connect'
import { replicator } from 'p2p-replicate'
import { openChannel } from 'p2p-channel'
import { rnsClient } from 'p2p-rns'
import { mrepos } from 'p2p-mrepo'
import { askRequest, requestBundle } from 'p2p-node'
import { openRepo } from '../../../mycelium-git/index.js'

const [invitationFile, host, node, name, parent] = process.argv.slice(2)
const inv = JSON.parse(readFileSync(invitationFile, 'utf8'))
const t0 = Date.now()
const storage = mkdtempSync(join(parent, 'step-6-request-'))
const store = await openStore({ storage })
const [bh, bp] = inv.bootstrap.split(':')
const d = await startDht({ host, bootstrap: [{ host: bh, port: Number(bp) }] })
const net = connect({ dht: d.dht, keyPair: crypto.keyPair() })
const rep = replicator({ store })
const channels = new Map()
net.onConnection((stream, p) => {
  rep.replicate(stream, { peer: p.peer })
  channels.set(p.peer, {
    rns: rnsClient(openChannel(stream, { name: 'p2p-rns', peer: p.peer })),
    requests: openChannel(stream, { name: 'p2p-request', peer: p.peer }),
    remoteHost: stream.rawStream.remoteHost
  })
})
const to = async key => {
  net.connectTo(Buffer.from(key, 'hex'))
  while (!channels.has(key)) await new Promise(resolve => setTimeout(resolve, 20))
  return channels.get(key)
}
const { rns } = await to(inv.master)
const uri = `/${inv.swarm}/${node}/node`
const record = await rns.resolve(uri)
const outbox = await mrepos({ store }).create('outbox')
const bundle = await requestBundle(outbox.backend, { 'request.md': `# Request: ${name}\n\nThe node's status, from ${host}.\n\nStatus: node\n` })
const target = await to(record.owner)
const answer = await askRequest(target.requests, { name, bundle })
const replica = await mrepos({ store }).replica(record.key)
await replica.drive.update({ wait: true })
const repo = openRepo(replica.backend)
const response = (await repo.read(`/main/responses/${name}/response.md`)).toString()
const status = JSON.parse(response.split('```json\n')[1].split('\n```')[0])
const pending = (await repo.select('/pending/default/pending/*')).map(([p]) => p)
console.log(JSON.stringify({
  from: host,
  uri,
  resolved: { key: record.key, id: record.id, owner: record.owner },
  reachedAt: target.remoteHost,
  sent: { name, bundleBytes: bundle.length },
  answer,
  response: { firstLine: response.split('\n')[2], status },
  pending,
  ms: Date.now() - t0
}))
await net.close()
await d.close()
await store.close()
rmSync(storage, { recursive: true, force: true })
process.exit(0)
