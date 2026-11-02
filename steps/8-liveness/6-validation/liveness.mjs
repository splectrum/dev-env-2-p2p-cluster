// Step 8: what the topics say about liveness, from the run: the master's
// log (p2p-rns's events), node-1's log (its heartbeat and leave), the
// scenario's run and Splectral's actions. One JSON line.
//   node liveness.mjs <work-dir>
import { join } from 'node:path'
import { openTopic, folderStorage } from '../../../mycelium-topic/index.js'

const w = process.argv[2]
const read = async path => (await openTopic({ storage: folderStorage(path) })).consume(0)
const master = (await read(join(w, 'a', 'hosts-master', 'topics', 'node'))).map(r => r.value)
const node1 = (await read(join(w, 'a', 'hosts-node-1', 'topics', 'node'))).map(r => r.value)
const run = (await read(join(w, 'runs', 'scenario-liveness'))).map(r => r.value)
const actions = (await read(join(w, 'runs', 'actions'))).map(r => r.value)

const rns = master.filter(e => e.module === 'p2p-rns' && /^node-(registered|absent|present|left)$/.test(e.kind) && e.uri === '/hosts/node-1')
const absent = rns.find(e => e.kind === 'node-absent')
const pausedAt = run.find(e => e.kind === 'scenarioStep' && e.step === 1)?.time
const resumedAt = run.find(e => e.kind === 'say' && e.step === 4)?.time
const present = rns.find(e => e.kind === 'node-present')
const refused = actions.find(a => a.action === 'send-request' && !a.ok)
console.log(JSON.stringify({
  rnsEvents: rns.map(e => e.kind),
  leaseMs: absent?.leaseMs,
  absentAfterLastHeard: absent ? absent.time - absent.lastSeen : null,
  absentAfterPause: absent && pausedAt ? absent.time - pausedAt : null,
  presentAfterResume: present && resumedAt ? present.time - resumedAt : null,
  refused: refused ? { error: refused.error.replace(/since .*/, 'since <time>'), ms: refused.ms } : null,
  nodeLeft: node1.filter(e => e.kind === 'left').map(e => e.uri),
  renewFailed: node1.filter(e => e.kind === 'renew-failed').length,
  registeredAgain: node1.filter(e => e.kind === 'registered-again').length,
  masterConnectionsToNode1: { opened: master.filter(e => e.kind === 'connection-opened').length, closed: master.filter(e => e.kind === 'connection-closed').length },
  actions: actions.map(a => `${a.action}:${a.ok ? 'ok' : 'refused'}`)
}))
