import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkManifest, world, contractVersion } from '../index.js'

test('a manifest is checked at the boundary', () => {
  const ok = { name: 'base-view-map', contract: '0.1', provides: [{ kind: 'page', id: 'map', needs: ['world'], module: 'map.js' }] }
  assert.equal(checkManifest(ok), ok)
  assert.throws(() => checkManifest({ ...ok, contract: '2' }), /contract/)
  // Minor versions add: a 0.1 extension works on 0.2; one for 0.3 does not.
  assert.equal(checkManifest({ ...ok, contract: '0.2' }).contract, '0.2')
  assert.throws(() => checkManifest({ ...ok, contract: '0.3' }), /contract/)
  assert.throws(() => checkManifest({ ...ok, provides: [{ kind: 'page', id: 'map', module: 'm.js' }] }), /needs/)
  assert.throws(() => checkManifest({ ...ok, provides: [{ kind: 'widget', id: 'x' }] }), /unknown kind/)
  assert.throws(() => checkManifest({ ...ok, name: 'Bad_Name' }), /not an extension name/)
})

test('the abstract world has no p2p words', () => {
  const text = JSON.stringify(world).toLowerCase()
  for (const w of ['hypercore', 'dht', 'swarm', 'docker', 'container', 'corestore']) assert.ok(!text.includes(w), w)
  assert.equal(contractVersion, '0.2.0')
  for (const e of ['absent', 'present', 'left']) assert.ok(world.events[e], e)
  for (const a of ['pause-node', 'resume-node']) assert.ok(world.actions.includes(a), a)
})
