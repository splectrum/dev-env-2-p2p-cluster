#!/usr/bin/env node
// One node's manager, from the command line: runs for the node's life.
//   node cli.js run --folder=<node-folder> --vault=<vault-dir> --image=<image>
//                   --network=<network> --ip=<ip> --swarm=<swarm> --name=<node>
//                   [--role=master|join] [--metrics-every=<ms>]
//   join only: --aux-network --aux-gateway --aux-port --aux-ip
//              --master=<key> --bootstrap=<host:port> --packages-uri --packages-key --packages-commit
//   node cli.js join --invitation=<file> --folder=<node-folder> --vault=<vault-dir>
//                    --name=<node> --ip=<address on the swarm's data plane> --aux-subnet=<a.b.c>
//   (a node on a host of its own: its auxiliary network made here, no swarm manager)
// Writes its pid to <folder>/manager.pid; SIGTERM or SIGINT stops the node
// gracefully, then the manager exits. Prints one JSON line when the node
// is ready, and one when it has exited.

import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { manageNode, joinFromInvitation } from './index.js'
import { vault } from './vault.js'
import { validateName } from '../mycelium-uri/index.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v] }))
const [op] = argv.filter(a => !a.startsWith('--'))
if (op !== 'run' && op !== 'join') { console.error('usage: cli.js run|join --folder=... (see the header)'); process.exit(2) }

// The boundary: names from the command line and the invitation, validated
// once (mycelium-uri); inside, they are trusted.
const invitation = op === 'join' ? JSON.parse(readFileSync(flags.invitation, 'utf8')) : null
validateName(op === 'join' ? invitation.swarm : flags.swarm, 'swarm name')
validateName(flags.name, 'node name')

mkdirSync(flags.folder, { recursive: true })
writeFileSync(join(flags.folder, 'manager.pid'), String(process.pid) + '\n')
// The previous run's state is the previous run's.
rmSync(join(flags.folder, 'state.json'), { force: true })
const m = op === 'join' ? await joinFromInvitation({
  invitation,
  folder: flags.folder,
  vault: vault(flags.vault),
  name: flags.name,
  ip: flags.ip,
  auxSubnet: flags['aux-subnet'],
  metricsEvery: Number(flags['metrics-every'] || 30000)
}) : await manageNode({
  folder: flags.folder,
  vault: vault(flags.vault),
  image: flags.image,
  network: flags.network,
  ip: flags.ip,
  swarm: flags.swarm,
  name: flags.name,
  role: flags.role || 'master',
  ...(flags.role === 'join' ? {
    aux: { network: flags['aux-network'], gateway: flags['aux-gateway'], port: Number(flags['aux-port']), ip: flags['aux-ip'] },
    joining: { master: flags.master, bootstrap: flags.bootstrap, packages: { uri: flags['packages-uri'], key: flags['packages-key'], commit: flags['packages-commit'] } }
  } : {}),
  metricsEvery: Number(flags['metrics-every'] || 30000)
})
let stopping = null
const stop = () => { stopping ??= m.stop() }
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
m.ready.then(s => console.log(JSON.stringify({ event: 'ready', ...s })), () => {})
const end = await m.done
if (stopping) await stopping
console.log(JSON.stringify({ event: 'exited', ...end }))
rmSync(join(flags.folder, 'manager.pid'), { force: true })
process.exit(end.exitCode === 0 ? 0 : 1)
