// p2p-swarm-manager — a swarm's manager, on the host machine: it manages
// the nodes it controls (a swarm manager may control one node only, the
// master), through their node managers, and keeps the swarm's record.
//   await genesis({ swarm, folder, nodes, vault, code })   the swarm from zero
//   await joinNode({ folder, node })                       a node joining it
//   await status({ folder })                               the swarm as p2p-rns sees it
//   await restart({ folder, node }), await stop({ folder })
//
// Folders stand side by side under `nodes` (no hierarchy): the swarm
// manager's own (`folder`: swarm.json, swarm.jsonl) and one per node (its
// node manager's). The vault is a folder of its own. A node manager runs as
// a process of its own, detached: it keeps its node running when the swarm
// manager is not. The swarm manager asks p2p-rns as a peer of the swarm,
// from the host, on the swarm's internal network.
//
// Two internal networks per swarm: the swarm's own (the data plane) and an
// auxiliary one (the management plane), where each joining node's manager
// provisions it; the host is the gateway of both.

import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, existsSync, openSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'hypercore-crypto'
import { startDht } from 'p2p-dht'
import { connect } from 'p2p-connect'
import { openChannel } from 'p2p-channel'
import { rnsClient } from 'p2p-rns'
import { swarmTopic } from 'p2p-node'

const here = dirname(fileURLToPath(import.meta.url))
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const tryDocker = (...args) => { try { return docker(...args) } catch { return null } }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function swarmRecord (folder) {
  const record = (kind, facts = {}) => appendFileSync(join(folder, 'swarm.jsonl'), JSON.stringify({ module: 'p2p-swarm-manager', kind, time: Date.now(), ...facts }) + '\n')
  const read = () => JSON.parse(readFileSync(join(folder, 'swarm.json'), 'utf8'))
  const write = s => writeFileSync(join(folder, 'swarm.json'), JSON.stringify(s, null, 2) + '\n')
  return { record, read, write }
}

// Start a node's manager, detached, and wait for its node to be ready.
async function startNodeManager (s, node, { vault, timeout = 180000 }) {
  const folder = node.folder
  mkdirSync(folder, { recursive: true })
  // The previous run's state is the previous run's: cleared, so only this
  // run's is read.
  rmSync(join(folder, 'state.json'), { force: true })
  const out = openSync(join(folder, 'manager.out'), 'a')
  const joining = node.role === 'join' ? [
    `--aux-network=${s.aux.network}`, `--aux-gateway=${s.aux.gateway}`, `--aux-port=${node.auxPort}`, `--aux-ip=${node.auxIp}`,
    `--master=${s.master.key}`, `--bootstrap=${s.dht.host}:${s.dht.port}`,
    `--packages-uri=${s.master.packages.uri}`, `--packages-key=${s.master.packages.key}`, `--packages-commit=${s.master.packages.commit}`
  ] : []
  const child = spawn(process.execPath, [join(here, '..', 'p2p-node-manager', 'cli.js'), 'run',
    `--folder=${folder}`, `--vault=${vault}`, `--image=${s.image}`, `--network=${s.network}`, `--ip=${node.ip}`,
    `--swarm=${s.swarm}`, `--name=${node.name}`, `--role=${node.role}`, ...joining], { detached: true, stdio: ['ignore', out, out] })
  child.unref()
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    const st = existsSync(join(folder, 'state.json')) ? JSON.parse(readFileSync(join(folder, 'state.json'), 'utf8')) : null
    if (st && st.status === 'running') return { ...st, managerPid: child.pid, ms: Date.now() - t0 }
    if (st && st.status === 'exited') throw new Error(`${node.name} exited before it was ready (exit ${st.exitCode})`)
    await sleep(500)
  }
  throw new Error(`${node.name}: not ready within ${timeout} ms`)
}

export async function genesis ({ swarm, folder, nodes, vault, code, subnet = '172.34.0', auxSubnet = '172.35.0' }) {
  mkdirSync(folder, { recursive: true })
  const { record, write } = swarmRecord(folder)
  const t0 = Date.now()
  record('genesis-started', { swarm })
  const image = execFileSync('sh', [join(here, '..', 'p2p-node-manager', 'image', 'build.sh'), code], { encoding: 'utf8' }).trim()
  record('image-built', { image, ms: Date.now() - t0 })
  const network = `p2p-${swarm}`
  tryDocker('network', 'rm', network)
  docker('network', 'create', '--internal', '--subnet', `${subnet}.0/24`, '--gateway', `${subnet}.1`, network)
  record('network-created', { network, subnet: `${subnet}.0/24`, internal: true })
  const aux = { network: `p2p-${swarm}-aux`, subnet: `${auxSubnet}.0/24`, gateway: `${auxSubnet}.1` }
  tryDocker('network', 'rm', aux.network)
  docker('network', 'create', '--internal', '--subnet', aux.subnet, '--gateway', aux.gateway, aux.network)
  record('network-created', { network: aux.network, subnet: aux.subnet, internal: true, plane: 'management' })
  const master = { name: 'master', role: 'master', ip: `${subnet}.2`, folder: join(nodes, `${swarm}-master`) }
  const s = { swarm, image, network, subnet, gateway: `${subnet}.1`, aux, nodes: [master], vault, dht: { host: master.ip, port: 49737 }, nodesFolder: nodes, created: new Date().toISOString() }
  write(s)
  const ready = await startNodeManager(s, master, { vault })
  s.nodes[0] = { ...master, uri: ready.uri, key: ready.key, managerPid: ready.managerPid }
  s.master = { uri: ready.uri, key: ready.key, packages: { uri: `/${swarm}/master/packages`, ...ready.genesis?.packages }, boot: ready.genesis?.boot }
  write(s)
  record('master-ready', { uri: ready.uri, key: ready.key, packages: ready.genesis?.packages?.commit, ms: Date.now() - t0 })
  return s
}

// A node joining: its node manager provisions it through the auxiliary
// network; the node runs from the master's packages.
export async function joinNode ({ folder, node: name }) {
  const { record, read, write } = swarmRecord(folder)
  const s = read()
  if (s.nodes.some(n => n.name === name)) throw new Error(`already a node: ${name}`)
  const i = s.nodes.length
  const subnet = s.subnet
  const node = { name, role: 'join', ip: `${subnet}.${2 + i}`, auxIp: `${s.aux.gateway.replace(/\.1$/, '')}.${9 + i}`, auxPort: 49740 + i, folder: join(s.nodesFolder, `${s.swarm}-${name}`) }
  s.nodes.push(node)
  write(s)
  record('join-started', { node: name, ip: node.ip, auxIp: node.auxIp })
  const ready = await startNodeManager(s, node, { vault: s.vault })
  s.nodes[i] = { ...node, uri: ready.uri, key: ready.key, managerPid: ready.managerPid, materialised: ready.materialised }
  write(s)
  record('node-joined', { node: name, uri: ready.uri, key: ready.key, materialised: ready.materialised, ms: ready.ms })
  return s.nodes[i]
}

// The swarm as p2p-rns sees it: asked from the host, as a peer of the
// swarm on its internal network (the host's address there: the gateway).
export async function status ({ folder }) {
  const { record, read } = swarmRecord(folder)
  const s = read()
  const t0 = Date.now()
  const d = await startDht({ host: s.gateway, bootstrap: [s.dht] })
  const net = connect({ dht: d.dht, keyPair: crypto.keyPair() })
  const rns = await new Promise((resolve, reject) => {
    const limit = setTimeout(() => reject(new Error('the swarm did not answer')), 30000)
    net.onConnection((stream, peer) => { clearTimeout(limit); resolve(rnsClient(openChannel(stream, { name: 'p2p-rns', peer: peer.peer }))) })
    net.join(swarmTopic(s.swarm), { server: false, client: true }).catch(reject)
  })
  const nodes = await rns.list(`/${s.swarm}/*`)
  const resources = await rns.list(`/${s.swarm}/*/*`)
  const managers = s.nodes.map(n => existsSync(join(n.folder, 'state.json')) ? JSON.parse(readFileSync(join(n.folder, 'state.json'), 'utf8')) : { name: n.name, status: 'unknown' })
  await net.close()
  await d.close()
  const result = { swarm: s.swarm, nodes, resources, managers: managers.map(m => ({ name: m.name, status: m.status, uri: m.uri, key: m.key })), ms: Date.now() - t0 }
  record('status', { nodes: nodes.map(n => n.uri), resources: resources.map(r => r.uri), ms: result.ms })
  return result
}

async function stopNodeManager (node, timeout = 60000) {
  const pidFile = join(node.folder, 'manager.pid')
  if (!existsSync(pidFile)) return null
  const pid = Number(readFileSync(pidFile, 'utf8'))
  try { process.kill(pid, 'SIGTERM') } catch { return null }
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    if (!existsSync(pidFile)) break
    await sleep(250)
  }
  return JSON.parse(readFileSync(join(node.folder, 'state.json'), 'utf8'))
}

export async function restart ({ folder, node: name }) {
  const { record, read, write } = swarmRecord(folder)
  const s = read()
  const i = s.nodes.findIndex(n => n.name === name)
  const before = await stopNodeManager(s.nodes[i])
  record('node-stopped', { node: name, exitCode: before?.exitCode })
  const ready = await startNodeManager(s, s.nodes[i], { vault: s.vault })
  s.nodes[i] = { ...s.nodes[i], uri: ready.uri, key: ready.key, managerPid: ready.managerPid }
  write(s)
  record('node-restarted', { node: name, key: ready.key, packages: ready.genesis?.packages?.commit, sameKey: ready.key === before?.key, ms: ready.ms })
  return { before, after: ready }
}

export async function stop ({ folder }) {
  const { record, read } = swarmRecord(folder)
  const s = read()
  const ended = []
  for (const n of [...s.nodes].reverse()) ended.push(await stopNodeManager(n))
  tryDocker('network', 'rm', s.network)
  if (s.aux) tryDocker('network', 'rm', s.aux.network)
  record('swarm-stopped', { nodes: ended.map(e => e && { name: e.name, exitCode: e.exitCode }) })
  return ended
}
