// The p2p records mapped into the abstract world, without p2p words in it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import createMapper from '../mapper.js'

const mgr = { holds: 'p2p-node-manager/manager', context: { host: 'host-a', folder: 'hosts-node-1' } }
const log = { holds: 'p2p-node/log', context: { host: 'host-a', folder: 'hosts-node-1' } }
const sw = { holds: 'p2p-swarm-manager/swarm', context: { host: 'host-a', folder: 'hosts-swarm' } }
const r = (value, headers) => ({ value: { time: 1, ...value }, ...(headers ? { headers } : {}) })

test('managers, logs and the swarm into nodes, resources, links, requests and changes', () => {
  const map = createMapper()
  const out = []
  // A node's log read before its manager's topic waits for it.
  out.push(...map(r({ module: 'p2p-connect', kind: 'connection-opened', peer: 'kb' }), log))
  assert.equal(out.length, 0)
  out.push(...map(r({ kind: 'starting', swarm: 'hosts', name: 'node-1' }), mgr))
  out.push(...map(r({ kind: 'node-ready', uri: '/hosts/node-1', key: 'ka' }), mgr))
  out.push(...map(r({ kind: 'node-live', uri: '/hosts/node-1/node' }), mgr))
  out.push(...map(r({ kind: 'described', swarm: { swarm: 'hosts', nodes: [{ name: 'master' }, { name: 'node-1' }] } }), sw))
  out.push(...map(r({ kind: 'request-taken', name: 'q1', sender: 'kc', repository: 'node' }), log))
  out.push(...map(r({ kind: 'requests-executed', executed: ['q1'] }), log))
  out.push(...map(r({ kind: 'action-result', action: 'write', ok: true, result: { uri: '/hosts/node-1/node', path: '/main/notes/x.md' } }, [{ key: 'correlation', value: '4' }]), log))
  out.push(...map(r({ kind: 'connection-closed', peer: 'kb', bytesReceived: 10, bytesSent: 5 }), log))
  out.push(...map(r({ kind: 'container-exited', exitCode: 0 }), mgr))
  assert.deepEqual(out.map(e => e.kind), ['nodeStarting', 'connected', 'joined', 'resource', 'joined', 'requestSent', 'requestAnswered', 'actionResult', 'changed', 'disconnected', 'gone'])
  assert.equal(out[2].controlled, false)
  assert.equal(out[4].controlled, true)
  assert.equal(out[7].correlation, '4')
  assert.equal(out[9].bytes, 15)
  const text = JSON.stringify(out.map(({ toKey, fromKey, key, ...e }) => e)).toLowerCase()
  for (const w of ['p2p', 'dht', 'hypercore', 'container', 'docker']) assert.ok(!text.includes(w), w)
})

test("the name service's presence, from the master's log", () => {
  const map = createMapper()
  const mlog = { holds: 'p2p-node/log', context: { host: 'host-a', folder: 'hosts-master' } }
  map(r({ kind: 'starting', swarm: 'hosts', name: 'master' }), { ...mgr, context: { host: 'host-a', folder: 'hosts-master' } })
  const out = [
    ...map(r({ module: 'p2p-rns', kind: 'node-absent', uri: '/hosts/node-1', owner: 'kb', lastSeen: 100, leaseMs: 50 }), mlog),
    ...map(r({ module: 'p2p-rns', kind: 'node-present', uri: '/hosts/node-1', owner: 'kb' }), mlog),
    ...map(r({ module: 'p2p-rns', kind: 'node-left', uri: '/hosts/node-1', owner: 'kb' }), mlog),
    ...map(r({ module: 'other', kind: 'node-left', uri: '/hosts/x' }), mlog)
  ]
  assert.deepEqual(out.map(({ time, ...e }) => e), [{ kind: 'absent', uri: '/hosts/node-1', since: 150 }, { kind: 'present', uri: '/hosts/node-1' }, { kind: 'left', uri: '/hosts/node-1' }])
})
