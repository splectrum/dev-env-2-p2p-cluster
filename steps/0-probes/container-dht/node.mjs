// The container side of probe container-dht: a node from the plain base
// (Bare only) joining the host's DHT and connecting to its topic.
//   bare node.mjs <bootstrap-host:port> <topic> <own-address>
// Prints one JSON line: what it found, what the host said, the
// connection's bytes, and the times.

import process from 'node:process'
import DHT from 'hyperdht'
import Hyperswarm from 'hyperswarm'

const [bootstrapArg, topicHex, own] = process.argv.slice(2)
const [bhost, bport] = bootstrapArg.split(':')
const t0 = Date.now()
const timeout = setTimeout(() => { console.log(JSON.stringify({ connected: false, timeout: true, ms: Date.now() - t0 })); process.exit(1) }, 30000)

const dht = new DHT({ bootstrap: [{ host: bhost, port: Number(bport) }], host: own, firewalled: false })
await dht.fullyBootstrapped()
const bootstrapped = Date.now() - t0
const swarm = new Hyperswarm({ dht })
swarm.on('connection', conn => {
  conn.on('error', () => {})
  conn.once('data', async d => {
    conn.write('hello from the container')
    const result = {
      connected: true,
      runtime: `bare ${Bare.version}`,
      heard: d.toString(),
      remoteHost: conn.rawStream.remoteHost,
      bootstrappedMs: bootstrapped,
      connectedMs: Date.now() - t0,
      dhtNodes: dht.toArray().length
    }
    setTimeout(async () => {
      result.bytesReceived = conn.rawStream.bytesReceived
      result.bytesSent = conn.rawStream.bytesTransmitted
      clearTimeout(timeout)
      console.log(JSON.stringify(result))
      await swarm.destroy()
      process.exit(0)
    }, 500)
  })
})
swarm.join(Buffer.from(topicHex, 'hex'), { server: false, client: true })
