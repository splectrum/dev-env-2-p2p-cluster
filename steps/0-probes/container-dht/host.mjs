// The host side of probe container-dht: a private DHT (two persistent
// nodes) and a node serving a topic, bound to the internal network's
// gateway address, the host's address on that network.
//   node host.mjs <host-address> <port> | bare host.mjs <host-address> <port>
// Prints {"event":"ready","topic":...} once serving, then {"event":"peer"}
// per connection, and {"event":"done", ...metrics} once a peer has spoken
// (or after 60 s): it ends by itself, since a SIGTERM handler registered
// through process.on did not fire under Bare.

import process from 'node:process'
import crypto from 'hypercore-crypto'
import DHT from 'hyperdht'
import Hyperswarm from 'hyperswarm'

const [host, portArg] = process.argv.slice(2)
const port = Number(portArg)
const emit = o => console.log(JSON.stringify(o))
const t0 = Date.now()

const boot = []
for (let i = 0; i < 2; i++) {
  const node = new DHT({ ephemeral: false, firewalled: false, host, port: i ? 0 : port, bootstrap: i ? [{ host, port }] : [] })
  await node.fullyBootstrapped()
  boot.push(node)
}
const dht = new DHT({ bootstrap: [{ host, port }], host, firewalled: false })
await dht.fullyBootstrapped()
const swarm = new Hyperswarm({ dht })
const topic = crypto.randomBytes(32)
const peers = []
swarm.on('connection', (conn, info) => {
  conn.on('error', () => {})
  conn.on('data', d => {
    peers.push({ remotePublicKey: info.publicKey.toString('hex'), said: d.toString(), ms: Date.now() - t0 })
    setTimeout(done, 500)
  })
  conn.write('hello from the host')
  emit({ event: 'peer', remoteHost: conn.rawStream.remoteHost, ms: Date.now() - t0 })
})
await swarm.join(topic, { server: true, client: false }).flushed()
emit({ event: 'ready', topic: topic.toString('hex'), dht: `${host}:${port}`, ms: Date.now() - t0 })

let finished = false
async function done () {
  if (finished) return
  finished = true
  emit({ event: 'done', peers, connects: swarm.stats.connects, ms: Date.now() - t0 })
  await swarm.destroy()
  for (const n of boot) await n.destroy()
  process.exit(0)
}
setTimeout(done, 60000)
