#!/usr/bin/env node
// The deployment repository's execution: its pending requests, executed with
// layer/request's flow (mycelium-layer), each response on main. What the
// cluster is (its nodes, their state, their metrics) is the record of these
// responses. The kick runs it on the host, the outside world, where Docker
// is.
//   node cluster/deployment/execute.js <repo> --bootstrap=<repo> --packages=<bundle> --run=<dir>
// --bootstrap and --packages are the inputs from outside (the bootstrap
// repository, the package repository's bundle); --run is where the running
// cluster keeps its files (the bootstrap checkout, the bundle).
// Requests, in this order:
//   Seed: <name>     the seed node
//   Join: <name>     a joining node (needs the seed's response)
//   Status: nodes    every node's container state and latest metrics
// A response holds node.json (Seed, Join), the node's JSON lines so far
// (log.jsonl), or status.json (Status).

import fs from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'
import { nativeBackend, openRepo } from '../../mycelium-git/index.js'
import { executeRequests } from '../../mycelium-layer/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const dev = join(here, '..', '..')
const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')))
const [repo] = argv.filter(a => !a.startsWith('--'))
const net = 'p2p-cluster'
const subnet = '172.30.0'
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim()
const docker = (...args) => sh('docker', args)
const sha256 = file => sh('sha256sum', [file]).slice(0, 64)
const backend = nativeBackend(repo)

const environment = {
  node: process.version,
  docker: docker('version', '--format', '{{.Server.Version}}'),
  bare: sh('bare', ['--version']),
  dev: sh('git', ['-C', dev, 'rev-parse', 'HEAD']),
  bootstrap: flags.bootstrap && sh('git', ['--git-dir', flags.bootstrap, 'rev-parse', 'main']),
  packages: flags.packages && { sha256: sha256(flags.packages), bytes: fs.statSync(flags.packages).size }
}

const kinds = ['Seed', 'Join', 'Status']
function plan (pending) {
  return pending.map(({ name, text }) => {
    const m = text.match(/^(Seed|Join|Status):[ \t]*(\S+)[ \t]*$/m)
    return { name, kind: m && m[1], arg: m && m[2], line: m && m[0] }
  }).sort((a, b) => (kinds.indexOf(a.kind) - kinds.indexOf(b.kind)) || a.name.localeCompare(b.name))
}

// Nodes recorded so far: every response with a node.json, on main at the
// unit's state.
async function nodes (state) {
  const repo = openRepo(pinnedMain(state))
  const found = []
  for (const [path] of await repo.select('/main/responses/*/node.json')) {
    found.push(JSON.parse((await repo.read(path)).toString()))
  }
  return found
}
function pinnedMain (state) {
  return { ...backend, listBranches: async () => [['main', state.main]] }
}

function waitFor (container, event, seconds = 120) {
  for (let i = 0; i < seconds; i++) {
    const log = spawnSync('docker', ['logs', container], { encoding: 'utf8' }).stdout || ''
    const line = log.split('\n').find(l => l.includes(`"event":"${event}"`))
    if (line) return JSON.parse(line)
    spawnSync('sleep', ['1'])
  }
  throw new Error(`${container}: no ${event} within ${seconds}s`)
}

function ensureNetwork () {
  const has = spawnSync('docker', ['network', 'inspect', net]).status === 0
  if (!has) docker('network', 'create', '--subnet', `${subnet}.0/24`, net)
}

function prepareRun () {
  const run = flags.run
  if (!fs.existsSync(join(run, 'boot'))) {
    fs.mkdirSync(join(run, 'boot'), { recursive: true })
    fs.mkdirSync(join(run, 'in'), { recursive: true })
    execFileSync('sh', ['-c', `git --git-dir="${flags.bootstrap}" archive main | tar -x -C "${join(run, 'boot')}"`])
    fs.copyFileSync(flags.packages, join(run, 'in', 'packages.bundle'))
  }
  execFileSync(join(dev, 'cluster', 'base', 'build.sh'), { stdio: 'ignore' })
  return run
}

async function handle (request, { state, out }) {
  if (!request.kind) return { outcome: "not executed: the request has no 'Seed:', 'Join:' or 'Status:' line." }
  const t0 = Date.now()
  const known = await nodes(state)
  if (request.kind === 'Status') {
    const status = known.map(n => {
      const r = spawnSync('docker', ['inspect', '--format', '{{.State.Status}} {{.State.StartedAt}}', n.name], { encoding: 'utf8' })
      const [container, startedAt] = r.status === 0 ? r.stdout.trim().split(' ') : ['absent', null]
      const log = (spawnSync('docker', ['logs', n.name], { encoding: 'utf8' }).stdout || '').trim().split('\n')
      const last = log.reverse().find(l => l.includes('"metrics"'))
      return { name: n.name, role: n.role, ip: n.ip, container, startedAt, metrics: last ? JSON.parse(last).metrics : null }
    })
    fs.writeFileSync(join(out, 'status.json'), JSON.stringify(status, null, 2) + '\n')
    const table = '| Node | Role | IP | Container | Received | Sent | Drive version |\n|---|---|---|---|---|---|---|\n' +
      status.map(s => `| ${s.name} | ${s.role} | ${s.ip} | ${s.container} | ${s.metrics?.bytesReceived ?? ''} | ${s.metrics?.bytesSent ?? ''} | ${s.metrics?.version ?? ''} |`).join('\n') + '\n'
    return { outcome: `${status.length} nodes, ${status.filter(s => s.container === 'running').length} running: \`status.json\`.`, body: table }
  }

  const name = request.arg
  if (known.some(n => n.name === name)) return { outcome: `not executed: ${name} is already a node.` }
  const run = prepareRun()
  ensureNetwork()
  let args, role, ip
  if (request.kind === 'Seed') {
    role = 'seed'; ip = `${subnet}.2`
    args = ['seed', '--bundle=/in/packages.bundle', `--host=${ip}`]
  } else {
    const seed = known.find(n => n.role === 'seed')
    if (!seed) return { outcome: 'not executed: no seed node yet.' }
    role = 'join'; ip = `${subnet}.${known.length + 2}`
    args = ['join', seed.key, `--bootstrap=${seed.ip}:49737`, `--host=${ip}`]
  }
  const container = docker('run', '-d', '--name', name, '--network', net, '--ip', ip,
    '-v', `${join(run, 'boot')}:/bootstrap:ro`, '-v', `${join(run, 'in')}:/in:ro`,
    'bare-base', '/bootstrap/boot.js', ...args)
  const ready = waitFor(name, role === 'seed' ? 'serving' : 'selected')
  const key = role === 'seed' ? ready.key : known.find(n => n.role === 'seed').key
  const node = { name, role, ip, container, image: 'bare-base', args, key, bootstrap: environment.bootstrap, ms: Date.now() - t0 }
  fs.writeFileSync(join(out, 'node.json'), JSON.stringify(node, null, 2) + '\n')
  fs.writeFileSync(join(out, 'log.jsonl'), docker('logs', name) + '\n')
  return { outcome: `${role === 'seed' ? 'Seed' : 'Joining'} node ${name} up at ${ip} in ${node.ms} ms: \`node.json\`, \`log.jsonl\`.` }
}

const executed = await executeRequests({
  backend,
  capability: 'capability/default',
  author: { name: 'deployment', email: 'deployment@localhost' },
  environment,
  plan,
  handle
})
console.log(JSON.stringify({ executed }))
