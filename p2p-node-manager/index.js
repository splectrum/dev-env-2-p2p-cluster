// p2p-node-manager — one node's manager, on the host machine, for the
// node's whole life: it starts the node's container, hands it its secret,
// follows it and records it, and stops it.
//   const m = manageNode({ folder, vault, image, network, ip, swarm, name, role })
//   await m.ready        the node said node-started
//   await m.stop()       a graceful stop (SIGTERM to the node)
//   await m.done         the container has exited; its end recorded
//
// The container is hardened: read-only root, every capability dropped, no
// new privileges, an unprivileged user, its memory capped with no swap, no
// core dumps, its store on a tmpfs (in RAM: the store holds the node's
// secrets). Its secret, the node's primary key from the vault, goes on its
// stdin, into memory: no file, no mount, no environment variable.
//
// Records, in the node's folder (one per node, side by side; nothing
// secret): node.json (what the node is), manager.jsonl (what the manager
// did and saw: started, ready, resources sampled, exited, stopped),
// node.jsonl (the node's log as it wrote it: every module's audit and
// metrics), node.stderr, state.json (the latest state).

import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, appendFileSync, createWriteStream } from 'node:fs'
import { join } from 'node:path'

const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim()
const tryDocker = (...args) => { try { return docker(...args) } catch { return null } }

export function manageNode ({ folder, vault, image, network, ip, swarm, name, role, memory = '768m', storeSize = '512m', metricsEvery = 30000, sampleEvery = 15000 }) {
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
  const args = [
    'run', '-i', '--name', container, '--network', network, '--ip', ip,
    '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '65534:65534',
    '--memory', memory, '--memory-swap', memory, '--ulimit', 'core=0',
    '--tmpfs', `/data:rw,size=${storeSize},mode=1777`,
    image, role, `--swarm=${swarm}`, `--name=${name}`, `--host=${ip}`, '--storage=/data/store', '--code=/app',
    `--metrics-every=${metricsEvery}`
  ]
  record('starting', { container, image, network, ip, hardening: ['read-only', 'cap-drop ALL', 'no-new-privileges', 'user 65534', `memory ${memory} no swap`, 'core 0', `store tmpfs ${storeSize}`] })
  const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] })
  // The secret, into the node's memory, then gone from here.
  child.stdin.end(vault.keyFor(swarm, name) + '\n')
  record('secret-handed-over', { via: 'stdin' })

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
      if (e.module === 'p2p-node' && e.kind === 'node-started') {
        Object.assign(state, { status: 'running', uri: e.uri, key: e.owner, dht: e.dht, readyMs: Date.now() - t0 })
        saveState()
        record('node-ready', { uri: e.uri, key: e.owner, dht: e.dht, ms: Date.now() - t0 })
        readyResolve(state)
      } else if (e.module === 'p2p-node' && e.kind === 'genesis') {
        state.genesis = { packages: e.packages, nodeRepo: e.nodeRepo }
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

  const done = new Promise(resolve => child.once('exit', code => {
    clearInterval(sampler)
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
