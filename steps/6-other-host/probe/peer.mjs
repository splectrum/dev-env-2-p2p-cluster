// A peer of probe two-networks, in a container from the plain base (Bare),
// the dev repository's root mounted read-only at /app.
//   bare peer.mjs master <bind-host> <dht-port> <bootstrap-host>
//   bare peer.mjs peer <name> <bind-host> <bootstrap-host:port> <connect-to...>
// Keys come from fixed seeds (the probe's peers know each other's keys,
// public facts); a peer connects to each name given and prints one JSON
// line: whom it reached, how, and what it heard. Hosts may be 0.0.0.0.

import process from 'node:process'
import crypto from 'hypercore-crypto'
import DHT from 'hyperdht'
import { startBootstrap, startDht } from 'p2p-dht'
import { connect } from 'p2p-connect'

const keyOf = name => crypto.keyPair(crypto.hash(Buffer.from(`probe-two-networks:${name}`)))
const [role, ...args] = process.argv.slice(2)
const t0 = Date.now()
const events = []
const observer = e => { if (e.kind === 'dht-started' || e.kind === 'connection-opened') events.push({ kind: e.kind, host: e.host, port: e.port, peer: e.peer && e.peer.slice(0, 8), remote: e.remoteHost }) }

async function anyBootstrap (port, self) {
  const nodes = []
  for (let i = 0; i < 2; i++) {
    const node = new DHT({ ephemeral: false, firewalled: false, host: '0.0.0.0', port: i ? 0 : port, bootstrap: i ? [{ host: self, port }] : [] })
    await node.fullyBootstrapped()
    observer({ kind: 'dht-started', host: '0.0.0.0', port: node.address().port })
    nodes.push(node)
  }
  return { async close () { for (const n of nodes.reverse()) await n.destroy() } }
}

function serve (net, name) {
  net.onConnection(stream => {
    stream.on('error', () => {})
    stream.write(`hello from ${name}`)
  })
}

if (role === 'master') {
  const [host, port, self] = args
  // p2p-dht's bootstrap points its second node at { host, port }; bound to
  // 0.0.0.0 that is not an address the others see, so here the second node
  // bootstraps from the master's own address (`self`).
  const boot = host === '0.0.0.0' ? await anyBootstrap(Number(port), self) : await startBootstrap({ host, port: Number(port), observer })
  const d = await startDht({ host, bootstrap: [{ host: self, port: Number(port) }], observer })
  const net = connect({ dht: d.dht, keyPair: keyOf('master'), observer })
  serve(net, 'master')
  await net.swarm.listen()
  console.log(JSON.stringify({ ready: 'master', host, port: Number(port), ms: Date.now() - t0 }))
  setTimeout(async () => { console.log(JSON.stringify({ role, events })); await net.close(); await d.close(); await boot.close(); process.exit(0) }, Number(process.env.LIFE || 60000))
} else {
  const [name, host, bootstrap, ...targets] = args
  const [bh, bp] = bootstrap.split(':')
  const d = await startDht({ host, bootstrap: [{ host: bh, port: Number(bp) }], persistent: true, observer })
  const net = connect({ dht: d.dht, keyPair: keyOf(name), observer })
  serve(net, name)
  await net.swarm.listen()
  const heard = {}
  net.onConnection((stream, peer) => {
    stream.once('data', b => { const from = b.toString().replace('hello from ', ''); heard[from] = { ms: Date.now() - t0, remoteHost: stream.rawStream.remoteHost } })
  })
  for (const t of targets) net.connectTo(keyOf(t).publicKey)
  const wait = Number(process.env.WAIT || 15000)
  await new Promise(resolve => setTimeout(resolve, wait))
  console.log(JSON.stringify({ role: name, host, bootstrap, targets, heard, reached: targets.filter(t => heard[t]), routingTable: d.dht.toArray().map(n => `${n.host}:${n.port}`), events }))
  if (process.env.LINGER) await new Promise(resolve => setTimeout(resolve, Number(process.env.LINGER)))
  await net.close(); await d.close(); process.exit(0)
}
