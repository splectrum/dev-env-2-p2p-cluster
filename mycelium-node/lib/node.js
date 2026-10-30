// A cluster node: its store (a persisted Hyperdrive with p2p-git on it,
// mycelium-git's openHyperdrive) on Hyperswarm. Every connection replicates
// the node's Corestore, so a drive another node opens by key is loaded from
// its peers, lazily: only the blocks it reads.
//   const node = await startNode({ storage, bootstrap, host, key })
//   node.backend, node.drive, node.swarm, node.metrics(), await node.close()
// Without a key the node opens its own drive (it writes); with one, a
// replica of another node's drive (it reads).
// bootstrap: the DHT's bootstrap nodes ([{ host, port }]); a private DHT,
// since a cluster need not reach the public one (startBootstrap). Nodes of
// a cluster reach each other directly, so a node's DHT is not firewalled:
// left to holepunching, a connection opened on one side only and carried
// nothing (probed on one host, Node and Bare alike).

import Hyperswarm from 'hyperswarm'
import DHT from 'hyperdht'
import Corestore from 'corestore'
import { openHyperdrive } from '../../mycelium-git/lib/hyperdrive.js'

export async function startNode ({ storage, bootstrap, host, port = 0, key = null }) {
  const corestore = new Corestore(storage)
  const store = await openHyperdrive(storage, { corestore, key: key ? Buffer.from(key, 'hex') : null })
  const dht = new DHT({ bootstrap, host, port, firewalled: false })
  await dht.fullyBootstrapped()
  const swarm = new Hyperswarm({ dht })
  const traffic = { connections: 0, bytesReceived: 0, bytesSent: 0 }
  const open = new Set()
  swarm.on('connection', conn => {
    traffic.connections++
    open.add(conn)
    conn.on('error', () => {})
    conn.on('close', () => { count(conn); open.delete(conn) })
    store.corestore.replicate(conn)
  })
  function count (conn) {
    const raw = conn.rawStream
    if (!raw || conn.counted) return
    conn.counted = true
    traffic.bytesReceived += raw.bytesReceived || 0
    traffic.bytesSent += raw.bytesTransmitted || 0
  }
  // Announce and look up by the drive's discovery key: peers holding the
  // same drive find each other.
  const discovery = swarm.join(store.drive.discoveryKey, { server: true, client: true })
  await discovery.flushed()
  if (key) {
    // A replica: wait for a peer, then for the drive's latest state.
    const done = store.drive.findingPeers()
    swarm.flush().then(done, done)
    await store.drive.update({ wait: true })
  }
  return {
    ...store,
    swarm,
    key: store.drive.key.toString('hex'),
    // Replication volume so far (connections still open included), and
    // the drive's size: the whole and what this node holds.
    metrics () {
      const live = { bytesReceived: 0, bytesSent: 0 }
      for (const c of open) {
        if (c.counted || !c.rawStream) continue
        live.bytesReceived += c.rawStream.bytesReceived || 0
        live.bytesSent += c.rawStream.bytesTransmitted || 0
      }
      const db = store.drive.core
      const blobs = store.drive.blobs && store.drive.blobs.core
      return {
        connections: traffic.connections,
        bytesReceived: traffic.bytesReceived + live.bytesReceived,
        bytesSent: traffic.bytesSent + live.bytesSent,
        version: store.drive.version,
        db: { length: db.length, contiguous: db.contiguousLength, bytes: db.byteLength },
        blobs: blobs ? { length: blobs.length, contiguous: blobs.contiguousLength, bytes: blobs.byteLength } : null
      }
    },
    async close () {
      await swarm.destroy()
      await store.close()
      await corestore.close()
    }
  }
}

// A private DHT: its bootstrap node at a fixed port, and a second
// persistent node, since announcements made on a DHT of one node are never
// found (probed: one node, no connection; two or more, connected).
export async function startBootstrap ({ host = '0.0.0.0', port = 49737, size = 2 } = {}) {
  const nodes = []
  const at = host === '0.0.0.0' ? '127.0.0.1' : host
  for (let i = 0; i < size; i++) {
    const node = new DHT({
      ephemeral: false,
      firewalled: false,
      bootstrap: i ? [{ host: at, port }] : [],
      host,
      port: i ? 0 : port
    })
    await node.fullyBootstrapped()
    nodes.push(node)
  }
  return {
    nodes,
    async destroy () { for (const n of nodes.reverse()) await n.destroy() }
  }
}
