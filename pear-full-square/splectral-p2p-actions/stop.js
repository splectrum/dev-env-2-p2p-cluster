// stop-node { node }: the node shut down by its own HAICC
// (<swarm>/<node>/haicc shutdown): its container stopped gracefully (the
// node leaves the swarm's names first), then removed; its folder kept, so
// start-node brings it back. A stop that does not complete fails.
import { join } from 'bare-path'
import { findNode, run, containerState } from './lib/hosts.js'

// The node's HAICC as its own: no level's settings passed on.
export const quiet = { HAICC_WORK: '', HAICC_SWARM: '', HAICC_NOLOG: '', HAICC_AS: '' }

export default async ({ node }, ctx) => {
  const { folder, config } = findNode(ctx.config, node)
  const r = run(join(folder, 'haicc'), ['shutdown'], quiet)
  if (!r.ok) throw new Error(`${node}: its shutdown ended with exit ${r.status}: ${r.out.split('\n').slice(-2).join(' ')}`)
  const state = containerState(config.container)
  if (state !== 'gone') throw new Error(`${node} still there after its stop (${state})`)
  return { node, stopped: true }
}
