// splectral-scenario — the generic scenario runner, as an action:
//   { action: 'run-scenario', with: { id } }
// A scenario (an extension's JSON, see notes/splectral.md) is steps:
//   { say }            a message for the people watching
//   { do, with }       an action, dispatched as any action is
//   { do, with, refused: true }
//                      an action expected to be refused: its refusal is
//                      told as a message; a success fails the step
//   { await, timeout } wait until the world shows it: '<event kind>' or
//                      '<event kind>:<uri>' (joined, gone, changed,
//                      requestAnswered, resource, ...)
// Its run is recorded: each step's message and outcome are produced into a
// topic holding `splectral/world` (`<runs>/scenario-<id>`), so a replay
// shows the messages where they were.

import { join } from 'node:path'
import { openTopic, folderStorage } from '../mycelium-topic/index.js'

export const matches = (e, pattern) => {
  const [kind, uri] = pattern.split(/:(.+)/)
  return e.kind === kind && (!uri || e.uri === uri || e.to === uri)
}

// Already true in the world? (A node joined before the step began.)
const holds = (snap, pattern) => {
  const [kind, uri] = pattern.split(/:(.+)/)
  if (kind === 'joined') return snap.nodes[uri]?.status === 'running'
  if (kind === 'gone') return snap.nodes[uri]?.status === 'gone'
  if (kind === 'absent' || kind === 'left' || kind === 'present') return snap.nodes[uri]?.presence === kind
  if (kind === 'resource') return Boolean(snap.resources[uri])
  return false
}

function waitFor (model, pattern, timeout) {
  return new Promise((resolve, reject) => {
    if (holds(model.snapshot(), pattern)) return resolve('already')
    const limit = setTimeout(() => { off(); reject(new Error(`not seen within ${timeout} ms: ${pattern}`)) }, timeout)
    const off = model.subscribe(e => { if (matches(e, pattern)) { clearTimeout(limit); off(); resolve('seen') } })
  })
}

export default async function runScenario ({ id }, ctx) {
  const sc = ctx.scenarios[id]
  if (!sc) throw new Error(`no scenario: ${id}`)
  const topic = ctx.config.runs ? await openTopic({ storage: folderStorage(join(ctx.config.runs, `scenario-${id}`)) }) : null
  const tell = async e => {
    const event = { time: Date.now(), scenario: id, ...e }
    ctx.emit(event)
    if (topic) await topic.produce({ value: event })
  }
  const t0 = Date.now()
  await tell({ kind: 'say', text: `Scenario: ${sc.title || id}`, step: -1 })
  for (let i = 0; i < sc.steps.length; i++) {
    const step = sc.steps[i]
    if (step.say) await tell({ kind: 'say', text: step.say, step: i })
    if (step.do && step.refused) {
      const refusal = await ctx.dispatch({ action: step.do, with: step.with || {} }).then(() => null, err => err.message)
      if (!refusal) throw new Error(`step ${i}: ${step.do} was expected to be refused`)
      await tell({ kind: 'say', text: `Refused: ${refusal}`, step: i })
    } else if (step.do) await ctx.dispatch({ action: step.do, with: step.with || {} })
    if (step.await) await waitFor(ctx.model, step.await, step.timeout ?? 120000)
    await tell({ kind: 'scenarioStep', step: i, done: true })
  }
  await tell({ kind: 'say', text: 'Scenario finished.', step: sc.steps.length })
  return { id, steps: sc.steps.length, ms: Date.now() - t0 }
}
