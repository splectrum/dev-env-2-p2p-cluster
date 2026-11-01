// p2p-node — the node application: a node of a swarm, composed from the
// p2p series (store, DHT, connections, replication, channels), its
// repositories (p2p-mrepo, with mycelium) and the resource name service
// (p2p-rns). The application composes them; none knows another.
//   const node = await startNode({ role: 'master', swarm, name, storage,
//     primaryKey, host, dhtPort, code, observer })
//   node.uri, node.key, node.metrics(), await node.stop()
//
// Role master: the swarm's first node, from zero (genesis). It starts the
// swarm's DHT (two persistent nodes at host:dhtPort), runs p2p-rns in
// memory, and creates its repositories from what it was given: `node`, its
// own record, and `packages`, the node's code (the folder `code`, as
// deployed) imported once at the boundary; both reproducibly (fixed author
// and time: the same primary key and code give the same keys and commits).
// It registers itself and them, announces them, and serves p2p-rns on a
// channel to every peer that connects (found on the swarm's topic).
//
// The store is meant for RAM (a tmpfs): it holds the node's secrets
// (step 0). `primaryKey` comes from the node manager, never from a file the
// node keeps.
//
// Instrumentation: every module's events go to the observer (the node's
// log); the node adds node-started, genesis, metrics (every interval) and
// node-stopped.

import crypto from 'hypercore-crypto'
import { openStore } from 'p2p-store'
import { startBootstrap, startDht } from 'p2p-dht'
import { connect } from 'p2p-connect'
import { replicator } from 'p2p-replicate'
import { openChannel } from 'p2p-channel'
import { createRns } from 'p2p-rns'
import { mrepos, idFrom } from 'p2p-mrepo'
import { writer, openRepo } from '../mycelium-git/index.js'
import { deploy } from '../mycelium-layer/index.js'

const MODULE = 'p2p-node'
const hex = b => b.toString('hex')
const author = { name: 'p2p-node', email: 'p2p-node@localhost' }
const time = '2026-01-01T00:00:00Z' // fixed: the same input, the same commits

// A swarm's topic: where its nodes find the master (and, later, each other).
export const swarmTopic = swarm => crypto.hash(Buffer.from(`p2p-swarm:${swarm}`))

export async function startNode ({ role, swarm, name, storage, primaryKey, host, dhtPort = 49737, code, observer = null, metricsEvery = 30000 }) {
  if (role !== 'master') throw new Error(`unknown role: ${role}`)
  const t0 = Date.now()
  const emit = (kind, facts) => observer && observer({ module: MODULE, kind, time: Date.now(), ...facts })

  const store = await openStore({ storage, primaryKey, observer })
  const keyPair = await store.corestore.createKeyPair('p2p-node/identity')
  const owner = hex(keyPair.publicKey)
  const boot = await startBootstrap({ host, port: dhtPort, observer })
  const dht = await startDht({ host, bootstrap: boot.bootstrap, observer })
  const net = connect({ dht: dht.dht, keyPair, observer })
  const rep = replicator({ store, observer })
  const rns = createRns({ swarm, observer })
  rns.registerNode({ owner, name })

  net.onConnection((stream, peer) => {
    rep.replicate(stream, { peer: peer.peer })
    openChannel(stream, { name: 'p2p-rns', peer: peer.peer, observer, onrequest: rns.handler(peer.peer) })
  })

  // Genesis: the node's repositories, from what it was given.
  const repos = mrepos({ store, observer })
  const own = new Set((await repos.list()).map(r => r.name))
  // A repository's internal id is permanent: derived from the node's
  // identity and the repository's name, a rebuilt node's are the same.
  const idOf = repo => idFrom(crypto.hash(Buffer.from(`${owner}/${repo}`)))
  const node = own.has('node') ? await repos.open('node') : await repos.create('node', { id: idOf('node') })
  if (!own.has('node')) {
    const w = writer(node.backend)
    await w.createLayer('main', 'Create main', { author, time })
    const c = await w.change('main')
    await c.put('/node.json', JSON.stringify({ swarm, name, role, key: owner }, null, 2) + '\n')
    await c.commit(`Node ${name} of swarm ${swarm}`, { author, time })
  }
  const packages = own.has('packages') ? await repos.open('packages') : await repos.create('packages', { id: idOf('packages') })
  let deployed = Object.fromEntries(await packages.backend.listBranches())['capability/default']
  let files = null
  if (!deployed) {
    const r = await deploy({ backend: packages.backend, layer: 'capability/default', folder: code, message: 'The node packages, as deployed\n', author, time })
    deployed = r.commit
    files = r.files
  }
  for (const [repo, type] of [[node, 'node'], [packages, 'packages']]) {
    rns.register({ owner, name: repo.name, id: repo.id, key: repo.key, type })
    rep.track(repo.drive)
    await net.join(repo.drive.discoveryKey, { server: true, client: false })
  }
  await net.join(swarmTopic(swarm), { server: true, client: false })
  emit('genesis', { swarm, node: name, owner, packages: { key: packages.key, id: packages.id, commit: deployed, files }, nodeRepo: { key: node.key, id: node.id }, ms: Date.now() - t0 })

  const metrics = () => ({
    store: store.resources(),
    replicate: rep.metrics(),
    connect: net.metrics(),
    dht: dht.metrics(),
    bootstrap: boot.metrics(),
    rns: rns.metrics()
  })
  const timer = setInterval(() => emit('metrics', metrics()), metricsEvery)
  emit('node-started', { role, swarm, node: name, uri: `/${swarm}/${name}`, owner, dht: `${host}:${dhtPort}`, ms: Date.now() - t0 })

  let stopping = null
  return {
    uri: `/${swarm}/${name}`,
    key: owner,
    rns,
    repos: { node, packages },
    packagesCommit: deployed,
    metrics,
    stop () {
      stopping ??= (async () => {
        clearInterval(timer)
        emit('metrics', metrics())
        await net.close()
        await dht.close()
        await boot.close()
        await store.close()
        emit('node-stopped', { uri: `/${swarm}/${name}`, ms: Date.now() - t0 })
      })()
      return stopping
    },
    read: (repo, uri) => openRepo(repo.backend).read(uri)
  }
}
