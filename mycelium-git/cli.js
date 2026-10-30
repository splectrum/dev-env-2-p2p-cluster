#!/usr/bin/env node
// Command line for mycelium-git, the test entry point.
//   node cli.js [--engine=isogit|p2pgit|hyperdrive] <op> ...  (default: native)
//   (hyperdrive: p2p-git on a persisted Hyperdrive; <repo> is its Corestore)
//   node cli.js select <repo> <path>                [path, node] pairs
//   node cli.js read <repo> <path>                  the file's content, as text
//   node cli.js put <repo> <branch> <path> <text>   one put, committed
//   node cli.js remove <repo> <branch> <path>       one remove, committed
//   node cli.js merge <repo> <from> <into>          a plain merge
//   node cli.js create-layer <repo> <name>          an orphan layer
//   node cli.js create-execution <repo> <target>    execute/<target>
//   node cli.js delete <repo> <name> <into>         delete, once merged
//   node cli.js import <repo> <from>                every branch of the native
//                                                   repository <from>, with history
// Prints the outcome as one JSON line: {"result": ...}, or {"error": "..."}
// with exit 1. Commits are by 'cli' at a fixed time, so oids are stable.
//
// Arguments come in from outside, so this is the boundary. A path to read
// or select is validated, then selected with sameName to find the stored
// names. A path to write is validated and written in its canonical,
// lowercase form: inside our repositories every name is lowercase. A branch
// name is validated as a URI.

import process from 'node:process'
import { validate, sameName } from '../mycelium-uri/index.js'
import { nativeBackend, isogitBackend, p2pgitBackend, openRepo, writer, transfer } from './index.js'

const argv = process.argv.slice(2)
const engine = argv[0] && argv[0].startsWith('--engine=') ? argv.shift().slice(9) : 'native'
const [op, dir, ...args] = argv
const engines = {
  native: nativeBackend,
  isogit: isogitBackend,
  p2pgit: p2pgitBackend,
  hyperdrive: async dir => (await import('./lib/hyperdrive.js')).openHyperdrive(dir)
}
const commit = { author: { name: 'cli', email: 'cli@localhost' }, time: '2026-01-02T00:00:00Z' }
const branch = name => validate('/' + name).slice(1)
const writePath = path => validate(path)

const ops = {
  select: async (repo, path) => repo.select(validate(path, { star: true }), sameName),
  read: async (repo, path) => (await repo.read(validate(path), sameName)).toString(),
  put: async (repo, w, b, path, text) => {
    const c = await w.change(branch(b))
    await c.put(writePath(path), text)
    return c.commit(`Put ${path}`, commit)
  },
  remove: async (repo, w, b, path) => {
    const c = await w.change(branch(b))
    c.remove(writePath(path))
    return c.commit(`Remove ${path}`, commit)
  },
  merge: async (repo, w, from, into) =>
    w.merge(branch(from), branch(into), `Merge ${from} into ${into}`, commit),
  'create-layer': async (repo, w, name) => w.createLayer(branch(name), `Create ${name}`, commit),
  'create-execution': async (repo, w, target) => w.createExecution(branch(target)),
  delete: async (repo, w, name, into) => { await w.deleteBranch(branch(name), branch(into)); return null },
  import: async (backend, from) => {
    const source = nativeBackend(from)
    await backend.init()
    const branches = await source.listBranches()
    for (const [name, oid] of branches) {
      await transfer(source, backend, oid)
      await backend.updateBranch(name, oid, null)
    }
    return branches.length
  }
}

let opened = null
try {
  if (!(engine in engines)) throw new Error(`unknown engine: ${engine}`)
  if (!(op in ops)) throw new Error(`unknown op: ${op}`)
  opened = await engines[engine](dir)
  const backend = opened.backend || opened
  const repo = openRepo(backend)
  const result = op === 'select' || op === 'read'
    ? await ops[op](repo, ...args)
    : op === 'import'
      ? await ops.import(backend, ...args)
      : await ops[op](repo, writer(backend), ...args)
  console.log(JSON.stringify({ result }))
} catch (err) {
  console.log(JSON.stringify({ error: err.message }))
  process.exitCode = 1
} finally {
  if (opened && opened.close) await opened.close()
}
