// splectral-contract — the extension contract, versioned
// (notes/splectral.md). What an extension declares, and the abstract world
// every application works in. Shared by server and browser; no p2p.

export const contractVersion = '0.1.0'

// The abstract world: entities, events and actions, in data names.
export const world = {
  entities: ['host', 'node', 'resource', 'link'],
  events: {
    nodeStarting: 'a node is starting { uri, host, controlled }',
    joined: 'a node is running { uri, host, key, controlled }',
    gone: 'a node has stopped { uri, exitCode }',
    resource: 'a resource exists { uri, node, type }',
    connected: 'a link opened { from, toKey }',
    disconnected: 'a link closed { from, toKey, bytes }',
    requestSent: 'a request went out { from, to, name }',
    requestAnswered: 'a request was answered { uri, name }',
    changed: 'a resource changed { uri, path }',
    actionResult: 'an action came back { id, action, ok }',
    say: 'a message for the people watching { text }'
  },
  actions: ['state', 'write', 'sendRequest', 'stopNode', 'startNodeFromInvitation']
}

const KINDS = ['source', 'mapper', 'page', 'scenario', 'action']
const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

// The boundary for extensions: a manifest (splectral.json) is checked once,
// when the server finds it.
export function checkManifest (m) {
  if (!m || typeof m !== 'object') throw new Error('a manifest is an object')
  if (!ID.test(m.name || '')) throw new Error(`not an extension name: ${m.name}`)
  if (!/^0\.1(\.|$)/.test(String(m.contract || ''))) throw new Error(`${m.name}: contract ${m.contract} is not ${contractVersion}`)
  for (const p of m.provides || []) {
    if (!KINDS.includes(p.kind)) throw new Error(`${m.name}: unknown kind ${p.kind}`)
    if (!ID.test(p.id || '')) throw new Error(`${m.name}: not an id: ${p.id}`)
    if (p.kind === 'page' && !Array.isArray(p.needs)) throw new Error(`${m.name}/${p.id}: a page declares what it needs`)
    if (['source', 'mapper', 'page', 'action'].includes(p.kind) && !p.module) throw new Error(`${m.name}/${p.id}: no module`)
    if (p.kind === 'scenario' && !p.file) throw new Error(`${m.name}/${p.id}: no file`)
  }
  return m
}

// Topics a page may need: 'world' (the whole model), 'node' (one per node:
// the page is parameterised by a node's URI).
export const topics = ['world', 'node']
