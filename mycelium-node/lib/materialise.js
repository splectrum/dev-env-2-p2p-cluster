// pkg/materialise: a deployment's layout written out as plain folders, from
// the package repository. A layout links each folder of an installed tree
// to a package instance (a tree oid); only those trees are read, so on a
// replica only their blocks are loaded.
//   const { layout } = await readDeployment(backend, 'mycelium-node')
//   await materialise(backend, layout, dir)   // { folders, files, bytes }
// Files are written as stored; executables keep their mode, symlinks are
// written as links.

import fs from 'node:fs'
import path from 'node:path'

export async function materialise (backend, layout, dir) {
  const counts = { folders: 0, files: 0, bytes: 0 }
  await Promise.all(Object.entries(layout).map(async ([at, oid]) => {
    await writeTree(backend, oid, path.join(dir, at), counts)
    counts.folders++
  }))
  return counts
}

// A deployment from the package repository's main: deployments/<name>.json.
export async function readDeployment (backend, name) {
  const main = (await backend.listBranches()).find(([n]) => n === 'main')
  if (!main) throw new Error('no main in the package repository')
  const at = async (oid, entry) => {
    const e = (await backend.readTree(oid)).find(e => e.name === entry)
    if (!e) throw new Error(`no ${entry} in the package repository`)
    return e.oid
  }
  const { tree } = await backend.readCommit(main[1])
  const file = await at(await at(tree, 'deployments'), `${name}.json`)
  return { commit: main[1], ...JSON.parse((await backend.readBlob(file)).toString()) }
}

// A tree's entries are read in parallel: on a replica each read is a round
// trip to a peer.
async function writeTree (backend, oid, dir, counts) {
  fs.mkdirSync(dir, { recursive: true })
  await Promise.all((await backend.readTree(oid)).map(async e => {
    const to = path.join(dir, e.name)
    if (e.type === 'tree') {
      await writeTree(backend, e.oid, to, counts)
    } else if (e.type === 'blob') {
      const bytes = await backend.readBlob(e.oid)
      if (e.mode === '120000') {
        fs.symlinkSync(bytes.toString(), to)
      } else {
        fs.writeFileSync(to, bytes)
        if (e.mode === '100755') fs.chmodSync(to, 0o755)
      }
      counts.files++
      counts.bytes += bytes.length
    }
  }))
}
