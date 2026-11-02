// haicc-deployment — a deployment as an object: its declared configuration,
// what runs on top, and its desired lifecycle state, made true by
// haicc-reconcile (notes/haicc-reconcile.md).
//   const d = await openDeployment({ project, work })
//   await d.deploy()     the configuration should exist
//   await d.start()      and run, on top of it
//   await d.stop()       not run; the configuration kept
//   await d.teardown()   nothing of it: what it made, taken away
//   await d.reconcile()  the world brought back to the desired state
//   await d.status()     the desired state and what is there
//
// A project file (`project.json`): { owner, providers: [modules],
// configuration: [requirements], running: [requirements], strict }.
// "{here}" is the project's folder, "{work}" the deployment's work folder
// (where its state and everything it makes live). Every verb is a record in
// the deployment's lifecycle topic; the desired state is their fold. What
// the engine checks and does goes to its reconcile topic.
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createEngine, providers as builtin } from '../haicc-reconcile/index.js'
import { openTopic, folderStorage } from '../mycelium-topic/index.js'
import { validateName } from '../mycelium-uri/index.js'

const VERBS = { deploy: { deployed: true, running: false }, start: { deployed: true, running: true }, stop: { running: false }, teardown: { deployed: false, running: false } }

export const desiredOf = records => records.reduce((s, r) => VERBS[r.value.verb] ? { ...s, ...VERBS[r.value.verb], since: r.value.time, last: r.value.verb } : s, { deployed: false, running: false, since: null, last: null })

// The boundary: a project file read and checked once.
export async function readProject (file, work) {
  const here = dirname(resolve(file))
  const p = JSON.parse(readFileSync(file, 'utf8').replaceAll('{here}', here).replaceAll('{work}', work))
  validateName(p.owner, 'project owner')
  for (const r of [...(p.configuration || []), ...(p.running || [])]) validateName(r.name || r.kind, 'requirement name')
  const providers = { ...builtin }
  for (const m of p.providers || []) Object.assign(providers, (await import(pathToFileURL(resolve(here, m)).href)).providers)
  return { owner: p.owner, strict: Boolean(p.strict), configuration: p.configuration || [], running: p.running || [], providers, file: resolve(file), title: p.title || p.owner }
}

export async function openDeployment ({ project: file, work }) {
  work = resolve(work)
  mkdirSync(join(work, 'deployment'), { recursive: true })
  const p = await readProject(file, work)
  const lifecycle = await openTopic({ storage: folderStorage(join(work, 'deployment', 'topics', 'lifecycle')) })
  const log = await openTopic({ storage: folderStorage(join(work, 'deployment', 'topics', 'reconcile')) })
  let verb = null
  const engine = createEngine({ providers: p.providers, owner: p.owner, record: v => log.produce({ value: { verb, ...v } }) })
  const both = () => [...p.configuration, ...p.running]
  const runningNames = () => p.running.map(r => r.name || r.kind)
  const stopRunning = () => engine.remove(both(), { only: runningNames() })
  const desired = async () => desiredOf(await lifecycle.consume(0))

  async function reconcile () {
    const want = await desired()
    verb = 'reconcile'
    if (want.running) return engine.apply(both(), { strict: p.strict })
    const stopped = await stopRunning()
    if (want.deployed) return { stopped, ...(await engine.apply(p.configuration, { strict: p.strict })) }
    return { stopped, removed: await engine.remove(p.configuration) }
  }
  const act = v => async () => {
    await lifecycle.produce({ value: { verb: v, time: Date.now(), project: p.owner } })
    verb = v
    const want = await desired()
    if (v === 'deploy') return engine.apply(p.configuration, { strict: p.strict })
    if (v === 'start') return engine.apply(both(), { strict: p.strict })
    if (v === 'stop') return { stopped: await stopRunning() }
    return { stopped: await stopRunning(), removed: await engine.remove(p.configuration), desired: want }
  }
  async function status () {
    const want = await desired()
    verb = 'status'
    const reqs = want.running ? both() : want.deployed ? p.configuration : []
    return { project: p.owner, desired: want, check: reqs.length ? await engine.check(reqs, { strict: p.strict }) : [] }
  }
  return { project: p, work, deploy: act('deploy'), start: act('start'), stop: act('stop'), teardown: act('teardown'), reconcile, status, desired }
}
