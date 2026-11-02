// pause-node { node } / resume-node { node }: the node's container frozen
// and thawed (docker pause / unpause), on the host whose manager runs it.
// A frozen node says nothing and no graceful path sees it: the swarm only
// notices when its lease runs out.
import { spawnSync } from 'node:child_process'
import { findNode } from './lib/hosts.js'

export const freeze = verb => async ({ node }, ctx) => {
  const { state } = await findNode(ctx.config, node)
  if (state.status !== 'running') throw new Error(`not running: ${node} (${state.status})`)
  const r = spawnSync('docker', [verb, state.container], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`docker ${verb}: ${(r.stderr || '').trim()}`)
  return { node, [verb === 'pause' ? 'paused' : 'resumed']: true }
}

export default freeze('pause')
