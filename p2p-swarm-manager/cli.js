#!/usr/bin/env node
// A swarm's manager, from the command line. Prints one JSON line.
//   node cli.js genesis --swarm=<name> --folder=<swarm-folder> --nodes=<parent> --vault=<dir> --code=<dev-repo>
//   node cli.js join    --folder=<swarm-folder> --node=<name>
//   node cli.js status  --folder=<swarm-folder>
//   node cli.js restart --folder=<swarm-folder> --node=<name>
//   node cli.js stop    --folder=<swarm-folder>
//   node cli.js invite  --folder=<swarm-folder>     (the invitation, for another host)

import { genesis, joinNode, status, restart, stop, invite, settled } from './index.js'
import { validateName } from '../mycelium-uri/index.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v] }))
const [op] = argv.filter(a => !a.startsWith('--'))
const ops = { genesis, join: () => joinNode({ folder: flags.folder, node: flags.node }), status, restart: () => restart({ folder: flags.folder, node: flags.node }), stop, invite }
try {
  if (!(op in ops)) throw new Error(`unknown op: ${op}`)
  // The boundary: names from the command line, validated once.
  if (op === 'genesis') validateName(flags.swarm, 'swarm name')
  if (op === 'join' || op === 'restart') validateName(flags.node, 'node name')
  const result = await ops[op](flags)
  await settled()
  console.log(JSON.stringify({ result }))
  process.exit(0)
} catch (err) {
  console.log(JSON.stringify({ error: err.message }))
  process.exit(1)
}
