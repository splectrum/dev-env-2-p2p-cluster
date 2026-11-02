// send-request { from, to, name }: a request to a node's repository (named
// <name>-<a suffix of its own>, unique per request), from
// host `from`, as a peer of the swarm (its address on the data plane: the
// host's gateway there). The repository resolved by URI, the request sent
// as a bundle, the response read back from a replica. A node p2p-rns flags
// absent is refused at once.
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
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
import { askRequest, requestBundle } from 'p2p-node'
import { openRepo } from '../mycelium-git/index.js'
import { invite } from '../p2p-swarm-manager/index.js'
import { hostOf, swarmFolderOf } from './lib/hosts.js'

export default async ({ from, to, name: given }, ctx) => {
  // A request is taken once under its name: the name made unique per
  // request (the requester's concern), so a scenario can run again.
  const name = `${given}-${Date.now().toString(36)}`
  const h = hostOf(ctx.config, from)
  const own = swarmFolderOf(h)
  const inv = own ? await invite({ folder: own }) : JSON.parse(readFileSync(join(h.folder, 'invitation.json'), 'utf8'))
  if (!own && !existsSync(join(h.folder, 'invitation.json'))) throw new Error(`${from} knows no swarm`)
  const t0 = Date.now()
  const storage = mkdtempSync(join(tmpdir(), 'splectral-request-'))
  const store = await openStore({ storage })
  const [bh, bp] = inv.bootstrap.split(':')
  const d = await startDht({ host: inv.network.gateway, bootstrap: [{ host: bh, port: Number(bp) }] })
  const net = connect({ dht: d.dht, keyPair: crypto.keyPair() })
  const rep = replicator({ store })
  const channels = new Map()
  net.onConnection((stream, p) => {
    rep.replicate(stream, { peer: p.peer })
    channels.set(p.peer, { rns: rnsClient(openChannel(stream, { name: 'p2p-rns', peer: p.peer })), requests: openChannel(stream, { name: 'p2p-request', peer: p.peer }) })
  })
  const reach = async key => {
    net.connectTo(Buffer.from(key, 'hex'))
    for (let i = 0; i < 1500 && !channels.has(key); i++) await new Promise(resolve => setTimeout(resolve, 20))
    if (!channels.has(key)) throw new Error(`not reached: ${key.slice(0, 8)}`)
    return channels.get(key)
  }
  try {
    const record = await (await reach(inv.master)).rns.resolve(to)
    if (!record) throw new Error(`not in the swarm: ${to}`)
    // Absent (its lease ran out): refused at once, not waited on.
    if (record.present === false) throw new Error(`absent: ${to}, since ${new Date(record.absentSince).toISOString()}`)
    const outbox = await mrepos({ store }).create('outbox')
    const bundle = await requestBundle(outbox.backend, { 'request.md': `# Request: ${name}\n\nThe node's status, from ${from}.\n\nStatus: node\n` })
    const answer = await askRequest((await reach(record.owner)).requests, { name, bundle })
    const replica = await mrepos({ store }).replica(record.key)
    await replica.drive.update({ wait: true })
    const response = (await openRepo(replica.backend).read(`/main/responses/${name}/response.md`)).toString()
    return { to, name, answer: response.split('\n')[2], main: answer.main, ms: Date.now() - t0 }
  } finally {
    await net.close()
    await d.close()
    await store.close()
    rmSync(storage, { recursive: true, force: true })
  }
}
