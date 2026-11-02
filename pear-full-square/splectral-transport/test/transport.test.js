import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { serveTransport } from '../index.js'
import { createModel } from '../../splectral-model/index.js'

test('a snapshot, then changes; an action and its result', async () => {
  const model = createModel()
  model.apply({ kind: 'joined', uri: '/s/a', host: 'h', key: 'k' })
  const t = serveTransport({ model, act: async a => ({ ok: true, result: { did: a.action } }) })
  const server = http.createServer((req, res) => { if (!t.handle(req, res)) { res.writeHead(404); res.end() } })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const messages = []
  const res = await fetch(`${base}/stream`)
  const reader = res.body.getReader()
  const read = async () => { const { value } = await reader.read(); for (const part of Buffer.from(value).toString().split('\n\n')) if (part.startsWith('data: ')) messages.push(JSON.parse(part.slice(6))) }
  await read()
  model.apply({ kind: 'gone', uri: '/s/a' })
  await read()
  assert.equal(messages[0].type, 'snapshot')
  assert.equal(messages[0].snapshot.nodes['/s/a'].status, 'running')
  assert.deepEqual([messages[1].type, messages[1].event.kind, messages[1].version], ['event', 'gone', 2])
  const out = await (await fetch(`${base}/act`, { method: 'POST', body: JSON.stringify({ action: 'state' }) })).json()
  assert.deepEqual(out, { ok: true, result: { did: 'state' } })
  await reader.cancel()
  t.close()
  const closed = new Promise(resolve => server.close(resolve))
  server.closeAllConnections()
  await closed
})
