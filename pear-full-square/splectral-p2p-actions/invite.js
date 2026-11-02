// invite { from, to }: the swarm manager on host `from` gives host `to`
// the invitation (public facts only), as a file in that host's folder.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { invite } from '../p2p-swarm-manager/index.js'
import { hostOf, swarmFolderOf } from './lib/hosts.js'

export default async ({ from, to }, ctx) => {
  const folder = swarmFolderOf(hostOf(ctx.config, from))
  if (!folder) throw new Error(`no swarm manager on ${from}`)
  const inv = await invite({ folder })
  writeFileSync(join(hostOf(ctx.config, to).folder, 'invitation.json'), JSON.stringify(inv, null, 2) + '\n')
  return { swarm: inv.swarm, to }
}
