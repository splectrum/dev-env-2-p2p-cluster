// Two nodes in one process, on a private DHT on this host: the seed's own
// drive, written with p2p-git, read from a replica on the other node.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { openRepo, writer } from '../../mycelium-git/index.js'
import { startNode, startBootstrap } from '../index.js'

const author = { name: 'test', email: 'test@localhost' }
const time = '2026-01-02T00:00:00Z'

test('a joining node reads a repository from the seed, lazily', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mycelium-node-'))
  const host = '127.0.0.1'
  const dht = await startBootstrap({ host, port: 49790 })
  const bootstrap = [{ host, port: 49790 }]
  const seed = await startNode({ storage: join(dir, 'seed'), bootstrap, host })
  await seed.backend.init()
  const w = writer(seed.backend)
  const c = await w.createLayer('main', 'Create main', { author, time })
  const ch = await w.change('main')
  await ch.put('/readme.md', 'hello')
  const commit = await ch.commit('Put readme', { author, time })
  assert.ok(c && commit)

  const joiner = await startNode({ storage: join(dir, 'joiner'), bootstrap, host, key: seed.key })
  try {
    const read = await openRepo(joiner.backend).read('/main/readme.md')
    assert.equal(read.toString(), 'hello')
    const m = joiner.metrics()
    assert.equal(m.connections, 1)
    assert.ok(m.bytesReceived > 0)
    assert.ok(m.db.contiguous < m.db.length, 'loaded lazily')
  } finally {
    await joiner.close()
    await seed.close()
    await dht.destroy()
  }
})
