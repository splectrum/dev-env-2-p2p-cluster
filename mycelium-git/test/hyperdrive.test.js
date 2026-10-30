// The contract suite on p2p-git with a Hyperdrive as its filesystem,
// through p2p-git's own adapter (hyperdrive-fs.js): the
// fixture copied into a drive (on a persisted Corestore of its own, as a
// node's store: lib/hyperdrive.js), then the same
// tests as on every other engine.

import { after } from 'node:test'
import { existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { contract } from './contract.js'
import { openHyperdrive } from '../lib/hyperdrive.js'
import { nativeBackend, transfer } from '../index.js'

const open = []
after(async () => { for (const s of open) await s.close() })

async function onHyperdrive (dir) {
  const node = await openHyperdrive(mkdtempSync(join(tmpdir(), 'corestore-')))
  open.push(node)
  const backend = node.backend
  if (existsSync(join(dir, 'HEAD'))) {
    // A fixture on disk: copied into the drive, objects and branches.
    await backend.init()
    const fixture = nativeBackend(dir)
    for (const [name, commit] of await fixture.listBranches()) {
      await transfer(fixture, backend, commit)
      await backend.updateBranch(name, commit, null)
    }
  }
  return backend
}

contract('p2p-git on Hyperdrive', onHyperdrive)
