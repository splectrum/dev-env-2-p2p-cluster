// start-node { node }: the node booted by its own HAICC
// (<swarm>/<node>/haicc boot): validated, its container started, up when
// it says it started.
import { join } from 'bare-path'
import { findNode, run } from './lib/hosts.js'
import { quiet } from './stop.js'

export default async ({ node }, ctx) => {
  const { folder } = findNode(ctx.config, node)
  const t0 = Date.now()
  const r = run(join(folder, 'haicc'), ['boot'], quiet)
  if (!r.ok) throw new Error(`${node}: its boot ended with exit ${r.status}: ${r.out.split('\n').slice(-2).join(' ')}`)
  return { node, started: true, ms: Date.now() - t0 }
}
