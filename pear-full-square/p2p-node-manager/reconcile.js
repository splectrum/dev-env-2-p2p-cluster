// haicc-reconcile's provider for what the node manager knows: the node
// image, built from a committed development tree.
//   image   { code: <dev repository> }   p2p-node:<its commit> exists; made by
//           the image build (which refuses a tree with uncommitted changes)
// Images are a cache: never removed here.
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const run = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null } }

const image = {
  observe (r) {
    const commit = run('git', ['-C', r.want.code, 'rev-parse', '--short', 'HEAD'])
    if (!commit) return null
    const tag = `p2p-node:${commit}`
    return { tag, exists: run('docker', ['image', 'inspect', tag, '--format', '{{.Id}}']) !== null }
  },
  compare: (r, a) => a?.exists ? { status: 'met', detail: a.tag } : { status: 'missing', detail: a?.tag ?? 'not a git tree' },
  create (r) {
    try {
      return { tag: execFileSync('sh', [join(here, 'image', 'build.sh'), r.want.code], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
    } catch (err) {
      throw new Error((err.stderr || err.message).toString().trim().split('\n').pop())
    }
  }
}

export const providers = { image }
