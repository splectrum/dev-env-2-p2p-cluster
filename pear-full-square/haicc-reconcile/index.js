// haicc-reconcile — declare what a module needs; check it, plan it, make it
// so (notes/haicc-reconcile.md). HAICC's deployment stage.
//   import { createEngine, providers } from 'haicc-reconcile'
//   const e = createEngine({ providers: { ...providers, ...more }, owner, record })
//   await e.check(reqs) / e.plan(reqs) / e.apply(reqs, { strict }) / e.remove(reqs)
export { createEngine } from './lib/engine.js'
import * as machine from './lib/providers/machine.js'
import * as local from './lib/providers/local.js'
export const providers = { ...machine, ...local }
