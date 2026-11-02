import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { openTopic, committedOffsets, folderStorage, parseRecords } from '../index.js'

const dir = () => mkdtempSync(join(tmpdir(), 'topic-'))
const pad = n => String(n).padStart(20, '0')

test('produce and consume: offsets from 0 in order, the data in value', async () => {
  const root = dir()
  const t = await openTopic({ storage: folderStorage(root) })
  assert.equal(await t.produce({ value: { kind: 'a' } }), 0)
  assert.equal(await t.produce({ value: { kind: 'b' }, headers: [{ key: 'origin', value: 'test' }] }), 1)
  const rs = await t.consume(0)
  assert.deepEqual(rs, [{ offset: 0, value: { kind: 'a' } }, { offset: 1, value: { kind: 'b' }, headers: [{ key: 'origin', value: 'test' }] }])
  assert.deepEqual((await t.consume(1)).map(r => r.offset), [1])
  // One object per record in the active segment, named by its offset; the offset is never written.
  const files = readdirSync(join(root, 'partition-0', pad(0)))
  assert.deepEqual(files, [`${pad(0)}.json`, `${pad(1)}.json`])
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'partition-0', pad(0), files[0]), 'utf8')), { value: { kind: 'a' } })
})

test('segments roll by policy, are archived into one object, sealed in a chain; offsets survive', async () => {
  const root = dir()
  const t = await openTopic({ storage: folderStorage(root), roll: { records: 3 } })
  for (let i = 0; i < 8; i++) await t.produce({ value: { i } })
  const names = readdirSync(join(root, 'partition-0'))
  assert.deepEqual(names, [`${pad(0)}.json`, `${pad(3)}.json`, pad(6)])
  const archived = parseRecords('x.json', readFileSync(join(root, 'partition-0', `${pad(0)}.json`)))
  assert.deepEqual(archived.map(r => r.value.i), [0, 1, 2])
  assert.deepEqual((await t.consume(0)).map(r => [r.offset, r.value.i]), [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7]])
  assert.deepEqual((await t.consume(4)).map(r => r.offset), [4, 5, 6, 7])
  const [first] = await t.consume(3)
  assert.match(first.headers[0].value, new RegExp(`^${pad(0)}:[0-9a-f]{64}$`))
  assert.equal(first.headers[0].key, 'previousSegment')
  assert.deepEqual(await t.verify(), { segments: 3, archived: 2, ok: true, problems: [] })
  // Tampering with an archived segment breaks the chain.
  const f = join(root, 'partition-0', `${pad(0)}.json`)
  writeFileSync(f, readFileSync(f, 'utf8').replace('"i":1', '"i":9'))
  assert.equal((await t.verify()).ok, false)
})

test('a restart is no boundary: the producer finds the active segment and continues', async () => {
  const root = dir()
  let t = await openTopic({ storage: folderStorage(root), roll: { records: 2 } })
  for (let i = 0; i < 3; i++) await t.produce({ value: { i } })
  t = await openTopic({ storage: folderStorage(root), roll: { records: 2 } })
  assert.equal(t.endOffset(), 3)
  assert.equal(await t.produce({ value: { i: 3 } }), 3)
  assert.equal(await t.produce({ value: { i: 4 } }), 4) // rolls: the segment at 2 held 2
  assert.deepEqual((await t.consume(0)).map(r => r.value.i), [0, 1, 2, 3, 4])
  assert.equal((await t.verify()).ok, true)
  // Reopened after all segments were archived: the next record carries the seal.
  await t.roll()
  t = await openTopic({ storage: folderStorage(root), roll: { records: 2 } })
  assert.equal(await t.produce({ value: { i: 5 } }), 5)
  assert.equal((await t.verify()).ok, true)
})

test('rolling by time', async () => {
  let clock = 0
  const t = await openTopic({ storage: folderStorage(dir()), roll: { records: 100, ms: 1000 }, now: () => clock })
  await t.produce({ value: { i: 0 } })
  clock = 1500
  await t.produce({ value: { i: 1 } })
  assert.deepEqual(await t.verify(), { segments: 2, archived: 1, ok: true, problems: [] })
})

test('fold builds state in offset order, at the latest offset or a past one', async () => {
  const t = await openTopic({ storage: folderStorage(dir()), roll: { records: 2 } })
  for (const [k, v] of [['a', 1], ['b', 2], ['a', 3]]) await t.produce({ value: { set: k, to: v } })
  const reducer = (s, r) => ({ ...s, [r.value.set]: r.value.to })
  assert.deepEqual(await t.fold(reducer, {}), { a: 3, b: 2 })
  assert.deepEqual(await t.fold(reducer, {}, { to: 1 }), { a: 1, b: 2 })
})

test('follow: told of records as they are produced', async () => {
  const t = await openTopic({ storage: folderStorage(dir()) })
  await t.produce({ value: { i: 0 } })
  const seen = []
  const stop = t.follow(0, rs => { for (const r of rs) seen.push(r.offset) }, { every: 20 })
  await t.produce({ value: { i: 1 } })
  await t.produce({ value: { i: 2 } })
  for (let i = 0; i < 50 && seen.length < 3; i++) await new Promise(resolve => setTimeout(resolve, 20))
  stop()
  assert.deepEqual(seen, [0, 1, 2])
})

test('retention keeps the last archived segments; committed offsets resume a consumer', async () => {
  const root = dir()
  const t = await openTopic({ storage: folderStorage(root), roll: { records: 2 } })
  for (let i = 0; i < 7; i++) await t.produce({ value: { i } })
  assert.deepEqual(await t.retain({ segments: 1 }), [0, 2])
  assert.deepEqual((await t.consume(0)).map(r => r.offset), [4, 5, 6])
  const offsets = await committedOffsets({ storage: folderStorage(join(root, 'offsets-viewer')) })
  assert.equal(await offsets.committed(), null)
  await offsets.commit(5)
  assert.equal(await offsets.committed(), 5)
})

test('an archive written before its directory was removed: the archive wins, the directory goes', async () => {
  const root = dir()
  let t = await openTopic({ storage: folderStorage(root), roll: { records: 2 } })
  for (let i = 0; i < 2; i++) await t.produce({ value: { i } })
  await t.roll()
  // Simulate the crash: the directory comes back next to its archive.
  const d = join(root, 'partition-0', pad(0))
  const { mkdirSync } = await import('node:fs')
  mkdirSync(d)
  writeFileSync(join(d, `${pad(0)}.json`), '{"value":{"stale":true}}\n')
  t = await openTopic({ storage: folderStorage(root), roll: { records: 2 } })
  assert.deepEqual((await t.consume(0)).map(r => r.value.i), [0, 1])
  assert.equal(existsSync(d), false)
})
