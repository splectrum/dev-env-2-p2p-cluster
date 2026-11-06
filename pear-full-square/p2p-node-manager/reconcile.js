// haicc-reconcile's provider for what the node manager knows: the node
// image, built from an install folder or a committed development tree.
//   image   { code: <install folder | dev repository> }   its tag exists:
//           p2p-node:pkg-<installed packages' hash>, or p2p-node:<commit>;
//           made by the image build (which refuses a dev tree with
//           uncommitted changes)
// Images are a cache: never removed here.
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { tagOf } from './image/tag.js'

const here = dirname(fileURLToPath(import.meta.url))
const run = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null } }

const image = {
  observe (r) {
    if (existsSync(join(r.want.code, 'pkgm', 'installed.json'))) {
      let tag
      try { tag = tagOf(r.want.code) } catch { return null }
      return { tag, exists: run('docker', ['image', 'inspect', tag, '--format', '{{.Id}}']) !== null }
    }
    const commit = run('git', ['-C', r.want.code, 'rev-parse', '--short', 'HEAD'])
    if (!commit) return null
    const tag = `p2p-node:${commit}`
    return { tag, exists: run('docker', ['image', 'inspect', tag, '--format', '{{.Id}}']) !== null }
  },
  compare: (r, a) => a?.exists ? { status: 'met', detail: a.tag } : { status: 'missing', detail: a?.tag ?? 'neither an install folder nor a git tree' },
  create (r) {
    try {
      return { tag: execFileSync('sh', [join(here, 'image', 'build.sh'), r.want.code], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
    } catch (err) {
      throw new Error((err.stderr || err.message).toString().trim().split('\n').pop())
    }
  }
}

export const providers = { image }
