import { test } from 'node:test'
import assert from 'node:assert/strict'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { openChannel } from '../index.js'

function pair () {
  const a = new NoiseSecretStream(true)
  const b = new NoiseSecretStream(false)
  a.rawStream.pipe(b.rawStream).pipe(a.rawStream)
  return [a, b]
}

test('messages and requests, both ways; the observer sees sizes, not content', async () => {
  const events = []
  const [sa, sb] = pair()
  const got = []
  const a = openChannel(sa, { name: 'test', observer: e => events.push(e), onmessage: m => got.push(m) })
  const b = openChannel(sb, {
    name: 'test',
    onrequest: async body => {
      if (body.fail) throw new Error('refused')
      return { echo: body.say }
    }
  })
  await a.opened
  await b.opened
  assert.deepEqual(await a.request({ say: 'secret-123' }), { echo: 'secret-123' })
  await assert.rejects(a.request({ fail: true }), /refused/)
  b.send({ note: 'hi' })
  await new Promise(resolve => setTimeout(resolve, 50))
  assert.deepEqual(got, [{ note: 'hi' }])
  a.close()
  await new Promise(resolve => setTimeout(resolve, 50))
  sa.destroy()
  sb.destroy()

  const kinds = events.map(e => e.kind)
  assert.ok(kinds.includes('channel-opened') && kinds.includes('channel-closed') && kinds.includes('request-failed'))
  assert.ok(!JSON.stringify(events).includes('secret-123'), 'no content in the events')
  assert.ok(events.filter(e => e.kind === 'message').every(e => e.bytes > 0))
})

test('a channel waits for the other side', async () => {
  const [sa, sb] = pair()
  const a = openChannel(sa, { name: 'late' })
  let open = false
  a.opened.then(() => { open = true })
  await new Promise(resolve => setTimeout(resolve, 50))
  assert.equal(open, false)
  openChannel(sb, { name: 'late' })
  await a.opened
  sa.destroy()
  sb.destroy()
})
