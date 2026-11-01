// The vault, a stand-in: each node's primary key as a file the owner alone
// can read, in a folder of its own on the host, outside every repository,
// node folder and image. Not yet encrypted (the vault's design is open:
// notes/node-pattern.md); the key is generated here, where it lives, and
// handed to the node only through its stdin, into memory.
//   const v = vault(dir)
//   v.keyFor(swarm, node)       the node's key (hex), generated if new
//   v.has(swarm, node)

import { mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'

const SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function vault (dir) {
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  chmodSync(dir, 0o700)
  const file = (swarm, node) => {
    if (!SEGMENT.test(swarm) || !SEGMENT.test(node)) throw new Error('not a name')
    return join(dir, `${swarm}--${node}.key`)
  }
  return {
    has: (swarm, node) => existsSync(file(swarm, node)),
    keyFor (swarm, node) {
      const f = file(swarm, node)
      if (!existsSync(f)) writeFileSync(f, randomBytes(32).toString('hex') + '\n', { mode: 0o600, flag: 'wx' })
      return readFileSync(f, 'utf8').trim()
    }
  }
}
