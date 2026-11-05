// stop-node { node }: the node shut down. On the host running its swarm:
// by the swarm's manager: a shutdown requested, every party holding on to
// the node let go first (the watcher, in auto mode, would bring it back),
// then its manager stopped gracefully; held until released. On a host with
// only the node's manager (another host): that manager stopped. Either way
// waited for by the process signalled, not by its pid file; a stop that
// does not complete fails, never `ok` for a node still running.
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { findNode, hostOf, swarmFolderOf, sleep } from './lib/hosts.js'
import { nodeState } from '../p2p-node-manager/index.js'
import { describe, stopNode } from '../p2p-swarm-manager/index.js'

const alive = pid => { try { process.kill(pid, 0); return true } catch { return false } }

export default async ({ node, timeout = 60000 }, ctx) => {
  const { host, folder } = await findNode(ctx.config, node)
  const name = node.split('/')[2]
  const swarmFolder = swarmFolderOf(hostOf(ctx.config, host))
  const s = swarmFolder ? await describe({ folder: swarmFolder }) : null
  if (s?.nodes.some(n => n.name === name)) {
    await stopNode({ folder: swarmFolder, node: name, by: 'splectral' })
  } else {
    const pidFile = join(folder, 'manager.pid')
    if (!existsSync(pidFile)) throw new Error(`no manager running for ${node}`)
    const pid = Number(readFileSync(pidFile, 'utf8'))
    process.kill(pid, 'SIGTERM')
    const t0 = Date.now()
    while (alive(pid)) {
      if (Date.now() - t0 > timeout) throw new Error(`${node}'s manager (pid ${pid}) did not stop within ${timeout} ms`)
      await sleep(100)
    }
  }
  const st = await nodeState(folder)
  if (st?.status === 'running') throw new Error(`${node} still running after its stop`)
  return { node, status: st?.status, exitCode: st?.exitCode }
}
