// From the host, as a peer of the swarm: resolve the master's packages by
// URI through p2p-rns, open them as a replica by the key it gives, read one
// file from the deployed tree, and count what came over. One JSON line.
//   node steps/4-genesis/validation/read.mjs <swarm-folder> <path-in-the-tree>
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
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
import { swarmTopic } from 'p2p-node'
import { openRepo } from '../../../mycelium-git/index.js'

const [folder, path] = process.argv.slice(2)
const s = JSON.parse(readFileSync(join(folder, 'swarm.json'), 'utf8'))
const t0 = Date.now()
const storage = mkdtempSync(join(tmpdir(), 'step-4-read-'))
const store = await openStore({ storage })
const d = await startDht({ host: s.gateway, bootstrap: [s.dht] })
const net = connect({ dht: d.dht, keyPair: crypto.keyPair() })
const rep = replicator({ store })
const connected = new Promise(resolve => net.onConnection((stream, peer) => {
  rep.replicate(stream, { peer: peer.peer })
  resolve(rnsClient(openChannel(stream, { name: 'p2p-rns', peer: peer.peer })))
}))
await net.join(swarmTopic(s.swarm), { server: false, client: true })
const rns = await connected
const uri = `/${s.swarm}/master/packages`
const record = await rns.resolve(uri)
const replica = await mrepos({ store }).replica(record.key)
rep.track(replica.drive)
await replica.drive.update({ wait: true })
const info = await replica.info()
const branches = Object.fromEntries(await replica.backend.listBranches())
const text = (await openRepo(replica.backend).read(`/capability/default/${path}`)).toString()
const held = store.resources().find(r => r.how === 'replica')
const down = rep.metrics().reduce((a, m) => ({ blocks: a.blocks + m.downloaded.blocks, bytes: a.bytes + m.downloaded.bytes }), { blocks: 0, bytes: 0 })
console.log(JSON.stringify({
  uri,
  resolved: { key: record.key, id: record.id, owner: record.owner, type: record.type },
  replica: { id: info.id, name: info.name },
  commit: branches['capability/default'],
  read: { path, bytes: text.length, name: JSON.parse(text).name },
  lazy: { downloaded: down, of: { db: held.db.length, blobs: held.blobs.length, blobBytes: held.blobs.bytes } },
  ms: Date.now() - t0
}))
await net.close()
await d.close()
await store.close()
rmSync(storage, { recursive: true, force: true })
process.exit(0)
