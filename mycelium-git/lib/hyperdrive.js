// A node's store: a persisted, Corestore-backed Hyperdrive, with p2p-git on
// it through p2p-git's own adapter (hyperdrive-fs.js). The repository is
// the drive's root: objects and refs are drive entries, so they replicate
// with the drive's cores.
//   const node = await openHyperdrive(dir)   // node.backend, node.drive
//   ...
//   await node.close()
// A key opens another node's drive (a replica); without one, the store's
// own drive, the same one each time.

import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import { createFs } from 'p2p-git/hyperdrive-fs'
import { p2pgitBackend } from './p2pgit.js'

export async function openHyperdrive (dir, { key = null, corestore = null } = {}) {
  const store = corestore || new Corestore(dir)
  const drive = new Hyperdrive(store, key)
  await drive.ready()
  const backend = p2pgitBackend('/', { fs: createFs(drive) })
  return {
    backend,
    drive,
    corestore: store,
    async close () {
      await drive.close()
      if (!corestore) await store.close()
    }
  }
}
