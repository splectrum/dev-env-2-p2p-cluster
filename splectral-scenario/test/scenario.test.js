// A scenario run live through the server, recorded; then the same topics
// replayed into a fresh server: the same world, with the messages.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { startServer } from '../../splectral-server/index.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

test('run a scenario, record it, replay it', async () => {
  const w = mkdtempSync(join(tmpdir(), 'scn-'))
  const ext = join(w, 'ext')
  mkdirSync(ext)
  writeFileSync(join(ext, 'splectral.json'), JSON.stringify({ name: 'demo-ext', contract: '0.1', provides: [
    { kind: 'mapper', id: 'nodes', holds: 'demo/*', module: 'mapper.js' },
    { kind: 'action', id: 'start', module: 'start.js' },
    { kind: 'scenario', id: 'two-nodes', title: 'Two nodes', file: 'two-nodes.json' }
  ] }))
  writeFileSync(join(ext, 'mapper.js'), "export default () => r => [{ kind: 'joined', uri: r.value.uri, host: 'h', time: r.value.time }]\n")
  writeFileSync(join(ext, 'start.js'), `import { openTopic, folderStorage } from ${JSON.stringify(join(root, 'mycelium-topic', 'index.js'))}
export default async ({ uri }, ctx) => (await openTopic({ storage: folderStorage(ctx.config.sources[0].path) })).produce({ value: { uri, time: Date.now() } })
`)
  writeFileSync(join(ext, 'two-nodes.json'), JSON.stringify({ title: 'Two nodes', steps: [
    { say: 'A node starts.', do: 'start', with: { uri: '/s/a' }, await: 'joined:/s/a', timeout: 5000 },
    { say: 'Another one.', do: 'start', with: { uri: '/s/b' }, await: 'joined:/s/b', timeout: 5000 }
  ] }))
  const exts = [ext, join(root, 'splectral-scenario'), join(root, 'splectral-replay')]
  const source = { kind: 'file', path: join(w, 'nodes'), holds: 'demo/nodes', every: 20 }
  const live = await startServer({ config: { extensions: exts, sources: [source], runs: join(w, 'runs') } })
  assert.deepEqual(live.menu().map(e => [e.page, e.param]), [['scenario', 'two-nodes']])
  const out = await live.dispatch({ action: 'run-scenario', with: { id: 'two-nodes' } })
  assert.equal(out.steps, 2)
  const says = live.model.snapshot().activity.filter(e => e.kind === 'say').map(e => e.text)
  assert.deepEqual(says, ['Scenario: Two nodes', 'A node starts.', 'Another one.', 'Scenario finished.'])
  await assert.rejects(live.dispatch({ action: 'run-scenario', with: { id: 'nope' } }), /no scenario/)
  await live.close()

  // Replayed: the nodes' topic and the run's, in time order.
  const replay = await startServer({ config: { extensions: exts, sources: [{ kind: 'replay', speed: 100, sources: [source, { kind: 'file', path: join(w, 'runs', 'scenario-two-nodes'), holds: 'splectral/world' }] }] } })
  for (let i = 0; i < 100 && !replay.model.snapshot().activity.some(e => e.replay); i++) await sleep(20)
  const s = replay.model.snapshot()
  assert.deepEqual(Object.keys(s.nodes).sort(), ['/s/a', '/s/b'])
  const kinds = s.activity.filter(e => e.kind === 'say' || e.kind === 'joined').map(e => e.kind === 'say' ? e.text : e.uri)
  assert.deepEqual(kinds.slice(0, 5), ['Scenario: Two nodes', 'A node starts.', '/s/a', 'Another one.', '/s/b'])
  await replay.close()
})
