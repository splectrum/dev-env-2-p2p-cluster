// stop-node { node }: its manager stops it gracefully (SIGTERM to the
// manager, by its pid file); returns once the manager has exited.
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { findNode, sleep } from './lib/hosts.js'
import { nodeState } from '../p2p-node-manager/index.js'

export default async ({ node, timeout = 60000 }, ctx) => {
  const { folder } = await findNode(ctx.config, node)
  const pidFile = join(folder, 'manager.pid')
  if (!existsSync(pidFile)) throw new Error(`no manager running for ${node}`)
  process.kill(Number(readFileSync(pidFile, 'utf8')), 'SIGTERM')
  const t0 = Date.now()
  while (existsSync(pidFile) && Date.now() - t0 < timeout) await sleep(250)
  const st = await nodeState(folder)
  return { node, status: st.status, exitCode: st.exitCode }
}
