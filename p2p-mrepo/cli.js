#!/usr/bin/env node
// The boundary for p2p-mrepo's repositories, from the command line.
//   node cli.js import <storage> <native-repo> [name]   a native repository's
//                                                       branches, with history
//   node cli.js export <storage> <bundle> [name]        every branch, as a bundle
// (default name: repo). Everything else is mycelium-git's CLI with this
// module as its engine: node ../mycelium-git/cli.js --engine=../p2p-mrepo/engine.js ...
// Prints one JSON line, {"result": ...} or {"error": "..."} with exit 1.

import fs from 'node:fs'
import process from 'node:process'
import { openStore } from 'p2p-store'
import { writeBundle } from '../mycelium-git/index.js'
import { mrepos } from './index.js'

const [op, storage, path, name = 'repo'] = process.argv.slice(2)
let store = null
try {
  store = await openStore({ storage })
  const repos = mrepos({ store })
  let result
  if (op === 'import') {
    const repo = await repos.import(name, { native: path })
    result = { name, id: repo.id, branches: repo.branches, objects: repo.objects }
  } else if (op === 'export') {
    const repo = await repos.open(name)
    const branches = Object.fromEntries(await repo.backend.listBranches())
    const bytes = await writeBundle(repo.backend, branches)
    fs.writeFileSync(path, bytes)
    result = { name, branches: Object.keys(branches).length, bytes: bytes.length }
  } else {
    throw new Error(`unknown op: ${op}`)
  }
  console.log(JSON.stringify({ result }))
} catch (err) {
  console.log(JSON.stringify({ error: err.message }))
  process.exitCode = 1
} finally {
  if (store) await store.close()
}
