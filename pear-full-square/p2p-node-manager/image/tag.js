// The node image's tag for an install folder: the installed packages and
// their hashes, as one (p2p-node:pkg-<12 hex>).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

export function tagOf (folder) {
  const reg = JSON.parse(readFileSync(join(folder, '.pkgm', 'installed.json'), 'utf8'))
  const h = createHash('sha256')
  for (const [name, p] of Object.entries(reg.packages).sort(([a], [b]) => a < b ? -1 : 1)) {
    if (p.state !== 'installed') throw new Error(`${name}: not installed completely`)
    h.update(`${name}\0${p.hash}\0${JSON.stringify(p.overrides || {})}\0`)
  }
  return `p2p-node:pkg-${h.digest('hex').slice(0, 12)}`
}

