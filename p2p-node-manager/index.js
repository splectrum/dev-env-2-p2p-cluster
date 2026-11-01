// p2p-node-manager — one node's manager, on the host machine, for the
// node's whole life: it starts the node's container, hands it its secret,
// follows it and records it, and stops it.
//   const m = manageNode({ folder, vault, image, network, ip, swarm, name, role, ...join })
//   await m.ready        the node said node-started
//   await m.stop()       a graceful stop (SIGTERM to the node)
//   await m.done         the container has exited; its end recorded
//
// The container is hardened: read-only root, every capability dropped, no
// new privileges, an unprivileged user, its memory capped with no swap, no
// core dumps, its store on a tmpfs (in RAM: the store holds the node's
// secrets). Its secret, the node's primary key from the vault, reaches its
// memory only: no file, no mount, no environment variable.
//   role master: on its stdin (genesis: nobody to provision from yet).
//   role join: through the auxiliary swarm. The manager runs a peer of its
//   own on an internal network it shares with its node only (`aux`: the
//   network, its gateway, a DHT port, the container's address there). The
//   container's boot program writes an ephemeral public key to its log;
//   the manager authorises exactly that key, and answers its request for
//   the secret on a channel, once. That link stays: the management
//   channel. The node then runs from the swarm's code (`join`: the master's
//   key and DHT address, the packages' URI, key and commit).
//
// Records, in the node's folder (one per node, side by side; nothing
// secret): node.json (what the node is), manager.jsonl (what the manager
// did and saw: started, ready, resources sampled, exited, stopped),
// node.jsonl (the node's log as it wrote it: every module's audit and
// metrics), node.stderr, state.json (the latest state).

import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, appendFileSync, createWriteStream } from 'node:fs'
import { join } from 'node:path'
import crypto from 'hypercore-crypto'
import { startBootstrap } from 'p2p-dht'
import { connect } from 'p2p-connect'
import { openChannel } from 'p2p-channel'

const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const tryDocker = (...args) => { try { return docker(...args) } catch { return null } }

export async function manageNode ({ folder, vault, image, network, ip, swarm, name, role, aux = null, joining = null, memory = '1g', storeSize = '512m', codeSize = '256m', metricsEvery = 30000, sampleEvery = 15000 }) {
  mkdirSync(folder, { recursive: true })
  const container = `p2p-${swarm}-${name}`
  const t0 = Date.now()
  const state = { swarm, name, role, container, image, ip, status: 'starting', startedAt: new Date().toISOString() }
  const record = (kind, facts = {}) => {
    appendFileSync(join(folder, 'manager.jsonl'), JSON.stringify({ module: 'p2p-node-manager', kind, time: Date.now(), ...facts }) + '\n')
  }
  const saveState = () => writeFileSync(join(folder, 'state.json'), JSON.stringify(state, null, 2) + '\n')
  writeFileSync(join(folder, 'node.json'), JSON.stringify({ swarm, name, role, image, network, ip, container, memory, storeSize }, null, 2) + '\n')

  tryDocker('rm', '-f', container)
  // The store's tmpfs is noexec (Docker's default). A joining node runs code
  // it loads by replication, native addons among them, which load only from
  // a filesystem that allows execution: that code gets a tmpfs of its own,
  // exec, and nothing else does.
  const hardening = ['--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '65534:65534',
    '--memory', memory, '--memory-swap', memory, '--ulimit', 'core=0', '--tmpfs', `/data:rw,noexec,nosuid,size=${storeSize},mode=1777`,
    ...(role === 'join' ? ['--tmpfs', `/code:rw,exec,nosuid,size=${codeSize},mode=1777`] : [])]
  record('starting', { container, image, network, ip, role, hardening: ['read-only', 'cap-drop ALL', 'no-new-privileges', 'user 65534', `memory ${memory} no swap`, 'core 0', `store tmpfs ${storeSize} noexec`, ...(role === 'join' ? [`code tmpfs ${codeSize} exec`] : [])] })

  // A joining node is provisioned through the auxiliary swarm: the
  // manager's peer, there for the node's life.
  let provision = null
  if (role === 'join') provision = await provisioner({ aux, record, secret: () => vault.keyFor(swarm, name) })

  let child
  if (role === 'master') {
    child = spawn('docker', ['run', '-i', '--name', container, '--network', network, '--ip', ip, ...hardening,
      image, role, `--swarm=${swarm}`, `--name=${name}`, `--host=${ip}`, '--storage=/data/store', '--code=/app',
      `--metrics-every=${metricsEvery}`], { stdio: ['pipe', 'pipe', 'pipe'] })
    // The secret, into the node's memory, then gone from here.
    child.stdin.end(vault.keyFor(swarm, name) + '\n')
    record('secret-handed-over', { via: 'stdin' })
  } else {
    docker('create', '--name', container, '--network', aux.network, '--ip', aux.ip, ...hardening,
      '--entrypoint', 'bare', image, '/app/p2p-node/cli.js', 'boot',
      `--swarm=${swarm}`, `--name=${name}`, `--host=${ip}`, '--storage=/data/store', '--app=/code/app',
      `--aux-host=${aux.ip}`, `--aux-bootstrap=${aux.gateway}:${aux.port}`, `--manager=${provision.publicKey}`,
      `--bootstrap=${joining.bootstrap}`, `--master=${joining.master}`,
      `--packages-key=${joining.packages.key}`, `--packages-commit=${joining.packages.commit}`, `--packages-uri=${joining.packages.uri}`,
      `--metrics-every=${metricsEvery}`)
    docker('network', 'connect', '--ip', ip, network, container)
    child = spawn('docker', ['start', '-a', container], { stdio: ['ignore', 'pipe', 'pipe'] })
  }

  let readyResolve, readyReject
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject })
  ready.catch(() => {})
  const log = createWriteStream(join(folder, 'node.jsonl'), { flags: 'a' })
  child.stderr.pipe(createWriteStream(join(folder, 'node.stderr'), { flags: 'a' }))
  let rest = ''
  child.stdout.on('data', chunk => {
    log.write(chunk)
    rest += chunk.toString()
    let i
    while ((i = rest.indexOf('\n')) !== -1) {
      const line = rest.slice(0, i)
      rest = rest.slice(i + 1)
      let e
      try { e = JSON.parse(line) } catch { continue }
      if (e.module === 'p2p-node' && e.kind === 'provisioning-key' && provision) {
        provision.authorise(e.publicKey)
      } else if (e.module === 'p2p-node' && e.kind === 'materialised') {
        state.materialised = { commit: e.commit, files: e.files, downloaded: e.downloaded, ms: e.ms }
        saveState()
        record('materialised', state.materialised)
      } else if (e.module === 'p2p-node' && e.kind === 'node-started') {
        Object.assign(state, { status: 'running', uri: e.uri, key: e.owner, dht: e.dht, readyMs: Date.now() - t0 })
        saveState()
        record('node-ready', { uri: e.uri, key: e.owner, dht: e.dht, ms: Date.now() - t0 })
        readyResolve(state)
      } else if (e.module === 'p2p-node' && e.kind === 'genesis') {
        state.genesis = { packages: e.packages, boot: e.boot }
        saveState()
      } else if (e.module === 'p2p-node' && e.kind === 'live') {
        state.live = { uri: e.uri, key: e.key, id: e.id, origin: e.origin }
        saveState()
      } else if (e.module === 'p2p-node' && e.kind === 'failed') {
        record('node-failed', { error: e.error })
      }
    }
  })

  // Resources, from outside: what only the container runtime sees.
  const sampler = setInterval(() => {
    const s = tryDocker('stats', '--no-stream', '--format', '{{json .}}', container)
    if (s) { const j = JSON.parse(s); record('resources', { cpu: j.CPUPerc, memory: j.MemUsage, memoryPercent: j.MemPerc, net: j.NetIO, pids: j.PIDs }) }
  }, sampleEvery)

  const done = new Promise(resolve => child.once('exit', async code => {
    clearInterval(sampler)
    if (provision) await provision.close()
    const inspected = tryDocker('inspect', '--format', '{{json .State}}', container)
    const s = inspected ? JSON.parse(inspected) : {}
    tryDocker('rm', container)
    Object.assign(state, { status: 'exited', exitCode: s.ExitCode ?? code, oomKilled: !!s.OOMKilled, exitedAt: new Date().toISOString() })
    saveState()
    record('container-exited', { exitCode: s.ExitCode ?? code, oomKilled: !!s.OOMKilled, error: s.Error || null, ms: Date.now() - t0 })
    readyReject(new Error('the node exited before it was ready'))
    log.end()
    resolve(state)
  }))
  saveState()

  return {
    container,
    state,
    ready,
    done,
    async stop (timeout = 15) {
      record('stopping', { signal: 'SIGTERM', timeout })
      state.status = 'stopping'
      saveState()
      tryDocker('stop', '-t', String(timeout), container)
      const end = await done
      record('stopped', { exitCode: end.exitCode, graceful: end.exitCode === 0 })
      return end
    }
  }
}

// The manager's peer on the auxiliary swarm: a DHT of its own at the
// network's gateway, and a key of its own for this run. It admits only the
// key it is told to authorise, and gives that peer the secret once.
async function provisioner ({ aux, record, secret }) {
  const keyPair = crypto.keyPair()
  const dht = await startBootstrap({ host: aux.gateway, port: aux.port })
  let authorised = null
  let given = false
  const net = connect({ dht: dht.nodes[0], keyPair, admit: key => authorised !== null && key.toString('hex') === authorised })
  await net.swarm.listen()
  net.onConnection((stream, peer) => {
    record('provisioning-connected', { peer: peer.peer })
    openChannel(stream, {
      name: 'p2p-provision',
      peer: peer.peer,
      onrequest: body => {
        if (body.op !== 'secret') throw new Error(`unknown op: ${body.op}`)
        if (peer.peer !== authorised || given) { record('secret-refused', { peer: peer.peer, given }); throw new Error('not authorised') }
        given = true
        record('secret-handed-over', { via: 'auxiliary swarm', to: peer.peer })
        return { primaryKey: secret() }
      }
    })
  })
  record('provisioning-ready', { gateway: aux.gateway, port: aux.port, network: aux.network, publicKey: keyPair.publicKey.toString('hex') })
  return {
    publicKey: keyPair.publicKey.toString('hex'),
    authorise (key) { authorised = key; record('provisioning-authorised', { peer: key }) },
    async close () { await net.close(); await dht.close() }
  }
}
