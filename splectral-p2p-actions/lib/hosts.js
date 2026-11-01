// The hosts this server may act on, from its configuration:
//   config.hosts = { '<host>': { folder, vault? } }
// A node is found by its URI among the node folders under a host's folder
// (its state, the fold of its manager's topic).

import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { nodeState } from '../../p2p-node-manager/index.js'

export function hostOf (config, host) {
  const h = config.hosts?.[host]
  if (!h) throw new Error(`no host: ${host}`)
  return h
}

export async function findNode (config, uri) {
  for (const [host, h] of Object.entries(config.hosts || {})) {
    if (!existsSync(h.folder)) continue
    for (const name of readdirSync(h.folder)) {
      const folder = join(h.folder, name)
      if (!existsSync(join(folder, 'topics', 'manager'))) continue
      const st = await nodeState(folder)
      if (st && st.uri === uri) return { host, folder, state: st }
    }
  }
  throw new Error(`no node here: ${uri}`)
}

export function swarmFolderOf (h) {
  for (const name of readdirSync(h.folder)) if (existsSync(join(h.folder, name, 'topics', 'swarm'))) return join(h.folder, name)
  return null
}

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
