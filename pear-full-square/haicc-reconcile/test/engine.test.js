import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import net from 'node:net'
import { createEngine, providers } from '../index.js'

// A kind of our own: things in a set, made and removed, marked by owner.
function thingKind (world) {
  return {
    observe: r => world.get(r.want.id) ?? null,
    compare: (r, a) => !a ? { status: 'missing' } : a.size === r.want.size ? { status: 'met' } : { status: 'different', detail: a },
    create: (r, ctx) => { if (r.want.fail) throw new Error('cannot'); world.set(r.want.id, { size: r.want.size, owner: ctx.owner }) },
    owned: (a, ctx) => a.owner === ctx.owner,
    remove: (r, ctx, a) => { for (const [k, v] of world) if (v === a) world.delete(k) },
    extras: (reqs) => [...world].filter(([id]) => !reqs.some(r => r.kind === 'thing' && r.want.id === id)).map(([id, actual]) => ({ name: `thing-${id}`, actual })),
    hint: () => 'not ours to change'
  }
}

test('check, plan, apply: missing made, different updated if ours, dependents blocked, idempotent', async () => {
  const world = new Map([['b', { size: 1, owner: 'someone' }], ['c', { size: 1, owner: 'us' }]])
  const records = []
  const e = createEngine({ providers: { thing: thingKind(world) }, owner: 'us', record: v => records.push(v) })
  const reqs = [
    { name: 'a', kind: 'thing', want: { id: 'a', size: 2 } },
    { name: 'b', kind: 'thing', want: { id: 'b', size: 2 } }, // different, not ours
    { name: 'c', kind: 'thing', want: { id: 'c', size: 3 }, needs: ['a'] }, // different, ours
    { name: 'd', kind: 'thing', want: { id: 'd', size: 1 }, needs: ['b'] }
  ]
  const c = await e.check(reqs)
  assert.deepEqual(c.map(x => [x.name, x.status, x.fixable]), [['a', 'missing', true], ['b', 'different', false], ['c', 'different', true], ['d', 'blocked', false]])
  assert.equal(c[1].hint, 'not ours to change')
  assert.deepEqual((await e.plan(reqs)).map(s => [s.name, s.action]), [['a', 'create'], ['c', 'update'], ['d', 'create']])
  const r = await e.apply(reqs)
  assert.deepEqual(r.done.map(x => [x.name, x.action]), [['a', 'create'], ['c', 'update']])
  assert.deepEqual(r.failed.map(x => x.name), ['b'])
  assert.deepEqual(r.blocked, [{ name: 'd', needs: ['b'] }])
  assert.equal(world.has('d'), false)
  // Again: nothing more to do for what was made.
  const again = await e.apply(reqs.filter(x => x.name !== 'b' && x.name !== 'd'))
  assert.deepEqual(again.done, [])
  assert.ok(records.some(x => x.phase === 'apply' && x.action === 'create' && x.ok))
})

test('non-strict leaves extras; strict removes only its own; remove takes away only what it made', async () => {
  const world = new Map([['x', { size: 1, owner: 'us' }], ['y', { size: 1, owner: 'someone' }]])
  const e = createEngine({ providers: { thing: thingKind(world) }, owner: 'us' })
  const reqs = [{ name: 'a', kind: 'thing', want: { id: 'a', size: 1 } }]
  await e.apply(reqs)
  assert.deepEqual((await e.check(reqs)).filter(x => x.status === 'extra').map(x => x.name), ['thing-x', 'thing-y'])
  assert.ok(world.has('x') && world.has('y'), 'non-strict: extras stay')
  const s = await e.apply(reqs, { strict: true })
  assert.deepEqual(s.done.map(x => [x.name, x.action]), [['thing-x', 'remove']])
  assert.ok(!world.has('x') && world.has('y'), 'strict: only ours removed')
  world.set('z', { size: 1, owner: 'someone' })
  const gone = await e.remove([...reqs, { name: 'z', kind: 'thing', want: { id: 'z', size: 1 } }])
  assert.deepEqual(gone, { done: ['a'], failed: [], kept: ['z'] })
})

test('a declaration error: a cycle, an unknown need, a duplicate name', async () => {
  const e = createEngine({ providers: { thing: thingKind(new Map()) } })
  await assert.rejects(e.check([{ name: 'a', kind: 'thing', want: {}, needs: ['b'] }, { name: 'b', kind: 'thing', want: {}, needs: ['a'] }]), /cycle/)
  await assert.rejects(e.check([{ name: 'a', kind: 'thing', want: {}, needs: ['nope'] }]), /not declared/)
  await assert.rejects(e.check([{ kind: 'thing', want: {} }, { kind: 'thing', want: {} }]), /unique/)
  await assert.rejects(e.check([{ kind: 'nothing', want: {} }]), /no provider/)
})

test('the generic providers: folder (made, owned, removed), port (free, taken, ours), os and nodejs', async () => {
  const w = mkdtempSync(join(tmpdir(), 'haicc-'))
  const e = createEngine({ providers, owner: 'test' })
  const f = { name: 'work', kind: 'folder', want: { path: join(w, 'work') } }
  assert.equal((await e.check([f]))[0].status, 'missing')
  await e.apply([f])
  assert.ok(existsSync(join(w, 'work', 'haicc-owner')))
  mkdirSync(join(w, 'theirs'))
  const theirs = { name: 'theirs', kind: 'folder', want: { path: join(w, 'theirs') } }
  assert.deepEqual(await e.remove([f, theirs]), { done: ['work'], failed: [], kept: ['theirs'] })
  assert.ok(!existsSync(join(w, 'work')) && existsSync(join(w, 'theirs')))

  const server = net.createServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const taken = server.address().port
  const [p] = await e.check([{ name: 'ui', kind: 'port', want: { port: taken } }])
  assert.deepEqual([p.status, p.fixable], ['different', false])
  assert.match(p.hint, /taken/)
  server.close()

  const [o, n] = await e.check([{ kind: 'os', want: { platform: process.platform } }, { kind: 'nodejs', want: { atLeast: 22 } }])
  assert.equal(o.status, 'met')
  assert.equal(n.status, Number(process.versions.node.split('.')[0]) >= 22 ? 'met' : 'different')
})
