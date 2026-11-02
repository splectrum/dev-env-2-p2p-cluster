// start-node-from-invitation { host, name, ip, auxSubnet }: the host's own
// node manager joins a node from the invitation it was given, with the
// host's vault; it runs detached, for the node's life.
import { spawn } from 'node:child_process'
import { openSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hostOf, sleep } from './lib/hosts.js'
import { nodeState } from '../p2p-node-manager/index.js'

const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'p2p-node-manager', 'cli.js')

export default async ({ host, name, ip, auxSubnet, timeout = 180000 }, ctx) => {
  const h = hostOf(ctx.config, host)
  const invitation = join(h.folder, 'invitation.json')
  if (!existsSync(invitation)) throw new Error(`${host} has no invitation`)
  const inv = JSON.parse(await (await import('node:fs/promises')).readFile(invitation, 'utf8'))
  const folder = join(h.folder, `${inv.swarm}-${name}`)
  mkdirSync(folder, { recursive: true })
  rmSync(join(folder, 'state.json'), { force: true })
  const out = openSync(join(folder, 'manager.out'), 'a')
  const t0 = Date.now()
  spawn(process.execPath, [cli, 'join', `--invitation=${invitation}`, `--folder=${folder}`, `--vault=${h.vault}`, `--name=${name}`, `--ip=${ip}`, `--aux-subnet=${auxSubnet}`, '--observer=true'], { detached: true, stdio: ['ignore', out, out] }).unref()
  while (Date.now() - t0 < timeout) {
    const st = await nodeState(folder)
    if (st && st.startedAt && new Date(st.startedAt).getTime() >= t0 - 1000) {
      if (st.status === 'running') return { uri: st.uri, ms: Date.now() - t0 }
      if (st.status === 'exited') throw new Error(`${name} exited before it was ready`)
    }
    await sleep(500)
  }
  throw new Error(`${name}: not ready within ${timeout} ms`)
}
