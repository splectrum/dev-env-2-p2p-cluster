import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { openStore } from 'p2p-store'
import { replicator } from 'p2p-replicate'
import { openRepo, writer, writeBundle, nativeBackend } from '../../mycelium-git/index.js'
import { mrepos } from '../index.js'

const dir = () => mkdtempSync(join(tmpdir(), 'p2p-mrepo-'))
const fixtureScript = new URL('../../mycelium-git/test/fixture.sh', import.meta.url).pathname
const nativeFixture = () => { const d = join(dir(), 'fixture.git'); execFileSync('sh', [fixtureScript, d]); return d }
const author = { name: 'test', email: 'test@localhost' }
const time = '2026-01-02T00:00:00Z'

test('create, write through mycelium, reopen on start: the same repository', async () => {
  const storage = dir()
  let store = await openStore({ storage })
  let repos = mrepos({ store })
  const repo = await repos.create('notes')
  assert.match(repo.id, /^[0-9a-f-]{36}$/)
  const w = writer(repo.backend)
  await w.createLayer('main', 'Create main', { author, time })
  const c = await w.change('main')
  await c.put('/readme.md', 'hello')
  await c.commit('Put readme', { author, time })
  await assert.rejects(repos.create('notes'), /exists/)
  const given = await repos.create('given', { id: '12345678-1234-4234-8234-123456789abc' })
  assert.equal(given.id, '12345678-1234-4234-8234-123456789abc')
  await assert.rejects(repos.create('bad-id', { id: 'nope' }), /not an id/)
  await assert.rejects(repos.create('Not A Name'), /not a repository name/)
  await store.close()

  store = await openStore({ storage })
  repos = mrepos({ store })
  assert.deepEqual((await repos.list()).map(r => [r.name, r.id]), [['given', '12345678-1234-4234-8234-123456789abc'], ['notes', repo.id]])
  const again = await repos.open('notes')
  assert.equal(again.key, repo.key)
  assert.equal(again.id, repo.id)
  assert.equal((await openRepo(again.backend).read('/main/readme.md')).toString(), 'hello')
  await store.close()
})

test('import from the boundary: a native repository and a bundle, the same commits', async () => {
  const native = nativeFixture()
  const store = await openStore({ storage: dir() })
  const repos = mrepos({ store })
  const a = await repos.import('from-native', { native })
  const expected = await nativeBackend(native).listBranches()
  assert.deepEqual(await a.backend.listBranches(), expected)
  assert.equal(a.branches, 4)
  assert.equal(a.origin.kind, 'native')
  const bundle = await writeBundle(a.backend, Object.fromEntries(expected))
  const b = await repos.import('from-bundle', { bundle })
  assert.deepEqual(await b.backend.listBranches(), expected)
  assert.equal(b.origin.kind, 'bundle')
  assert.equal(b.origin.bytes, bundle.length)
  await store.close()
})

test('clone: the same history under a new key and id, its origin recorded', async () => {
  const store = await openStore({ storage: dir() })
  const repos = mrepos({ store })
  const a = await repos.import('a', { native: nativeFixture() })
  const b = await repos.clone(a, 'b')
  const c = await repos.clone(a, 'c', { id: '12345678-1234-4234-8234-123456789abc' })
  assert.equal(c.id, '12345678-1234-4234-8234-123456789abc')
  assert.notEqual(b.key, a.key)
  assert.notEqual(b.id, a.id)
  assert.deepEqual(await b.backend.listBranches(), await a.backend.listBranches())
  assert.deepEqual(b.origin, { kind: 'clone', id: a.id, key: a.key, branches: Object.fromEntries(await a.backend.listBranches()) })
  const recorded = JSON.parse((await b.drive.get('/mrepo.json')).toString())
  assert.deepEqual(recorded.origin, b.origin)
  await store.close()
})

test('a replica by key: read through mycelium, lazily, read only', async () => {
  const s1 = await openStore({ storage: dir() })
  const s2 = await openStore({ storage: dir() })
  const a = await mrepos({ store: s1 }).import('a', { native: nativeFixture() })
  const r1 = replicator({ store: s1 })
  const r2 = replicator({ store: s2 })
  const x = r1.replicate(true)
  const y = r2.replicate(false)
  x.pipe(y).pipe(x)
  const replica = await mrepos({ store: s2 }).replica(a.key)
  r2.track(replica.drive)
  await replica.drive.update({ wait: true })
  assert.equal((await replica.info()).id, a.id)
  const repo = openRepo(replica.backend)
  assert.equal((await repo.read('/main/readme')).toString(), 'hello')
  assert.equal((await repo.read('/overlay/config/docs/a')).toString(), 'conf')
  // Lazily: of the objects the repository holds (one blob each), only those
  // read came over (what is held from the start is no measure: a small
  // index can arrive whole).
  const blobs = r2.metrics().filter(m => m.part === 'blobs').reduce((n, m) => n + m.downloaded.blocks, 0)
  const total = s2.resources().find(r => r.how === 'replica').blobs.length
  assert.ok(blobs > 0 && blobs < total, `only what was read: ${blobs} of ${total} blobs`)
  assert.equal(replica.drive.writable, false)
  await s1.close()
  await s2.close()
})

test('events: names, ids and keys, never a secret', async () => {
  const events = []
  const store = await openStore({ storage: dir(), observer: e => events.push(e) })
  const repos = mrepos({ store, observer: e => events.push(e) })
  const a = await repos.import('a', { native: nativeFixture() })
  await repos.clone(a, 'b')
  assert.equal(await repos.open('a'), await repos.open('a'), 'an open repository is given again')
  const kinds = events.filter(e => e.module === 'p2p-mrepo').map(e => e.kind)
  assert.deepEqual(kinds, ['repo-created', 'repo-imported', 'repo-created', 'repo-cloned'])
  const secret = store.corestore.primaryKey.toString('hex')
  assert.ok(!JSON.stringify(events).includes(secret))
  await store.close()
})
