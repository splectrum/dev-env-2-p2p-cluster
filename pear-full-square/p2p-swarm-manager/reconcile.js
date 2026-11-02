// haicc-reconcile's providers for what the swarm manager knows (the
// substrate: the swarm it runs on this host, and its nodes).
//   swarm   { swarm, folder, nodes, vault, code, subnet?, auxSubnet? }
//           described and running (its master up); made by genesis, or
//           started again as described; removed: stopped
//   node    { swarm: <swarm folder>, name }      a named node, running
//   nodes   { swarm: <swarm folder>, atLeast, prefix, type?, config? }
//           selected: at least n running nodes named <prefix><i>, the
//           master not counted (types and configurations: later)
// Ownership: a swarm made through haicc is marked with its owner in its
// folder; its nodes are that owner's. Extras: running nodes of a declared
// swarm that no requirement names (strict stops them, if ours).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { genesis, joinNode, start, stop, stopNode, restart, describe } from './index.js'
import { nodeState } from '../p2p-node-manager/index.js'

const MARK = '.haicc-owner'
const ownerOf = folder => existsSync(join(folder, MARK)) ? readFileSync(join(folder, MARK), 'utf8').trim() : null
const running = async n => (await nodeState(n.folder))?.status === 'running'

const networkExists = name => { try { execFileSync('docker', ['network', 'inspect', name], { stdio: 'ignore' }); return true } catch { return false } }

const swarm = {
  async observe (r) {
    const s = await describe({ folder: r.want.folder })
    // Not ours to describe, but its networks are there: a swarm of that
    // name runs from elsewhere on this host (another project). A conflict:
    // reported, never touched.
    if (!s) return networkExists(`p2p-${r.want.swarm}`) ? { conflict: true, swarm: r.want.swarm, owner: null } : null
    return { swarm: s.swarm, nodes: s.nodes.map(n => n.name), running: await running(s.nodes[0]), owner: ownerOf(r.want.folder) }
  },
  compare: (r, a) => !a ? { status: 'missing' } : a.conflict ? { status: 'different', detail: 'another swarm of this name runs here' } : a.running ? { status: 'met', detail: { nodes: a.nodes } } : { status: 'different', detail: 'stopped' },
  async create (r, ctx, a) {
    if (!a) {
      const s = await genesis(r.want)
      writeFileSync(join(r.want.folder, MARK), ctx.owner + '\n')
      return { genesis: s.swarm, image: s.image }
    }
    const s = await start({ folder: r.want.folder })
    return { started: s.swarm }
  },
  owned: (a, ctx) => a.owner === ctx.owner,
  async remove (r) { await stop({ folder: r.want.folder }) },
  hint: (r, a) => a?.conflict ? `a swarm named ${r.want.swarm} runs on this host from elsewhere (another project?): stop it first` : 'this swarm was not made by this owner: its own manager stops or starts it'
}

const nodeOf = async (folder, name) => {
  const s = await describe({ folder })
  const n = s?.nodes.find(x => x.name === name)
  return n ? { swarm: folder, name, running: await running(n), owner: ownerOf(folder) } : null
}

const node = {
  observe: r => nodeOf(r.want.swarm, r.want.name),
  compare: (r, a) => !a ? { status: 'missing' } : a.running ? { status: 'met' } : { status: 'different', detail: 'stopped' },
  async create (r, ctx, a) {
    if (!a) return joinNode({ folder: r.want.swarm, node: r.want.name })
    await restart({ folder: r.want.swarm, node: r.want.name })
    return { restarted: r.want.name }
  },
  owned: (a, ctx) => a.owner === ctx.owner,
  async remove (r, ctx, a) { await stopNode({ folder: a.swarm, node: a.name }) },
  hint: () => 'this node was not made by this owner',
  async extras (all) {
    // The swarms named by node and nodes requirements; a node named, or
    // covered by a selection's prefix, is not an extra.
    const reqs = all.filter(r => r.kind === 'node' || r.kind === 'nodes')
    const out = []
    const named = new Set(reqs.filter(r => r.kind === 'node').map(r => `${r.want.swarm}|${r.want.name}`))
    const selected = reqs.filter(r => r.kind === 'nodes').map(r => [r.want.swarm, r.want.prefix ?? 'node-'])
    for (const folder of new Set(reqs.map(r => r.want.swarm))) {
      const s = await describe({ folder })
      for (const n of s?.nodes || []) {
        if (n.role === 'master' || named.has(`${folder}|${n.name}`)) continue
        if (selected.some(([f, prefix]) => f === folder && n.name.startsWith(prefix))) continue
        if (await running(n)) out.push({ name: `${s.swarm}-${n.name}`, actual: { swarm: folder, name: n.name, running: true, owner: ownerOf(folder) } })
      }
    }
    return out
  }
}

const nodes = {
  async observe (r) {
    const s = await describe({ folder: r.want.swarm })
    if (!s) return null
    const prefix = r.want.prefix ?? 'node-'
    const mine = s.nodes.filter(n => n.role !== 'master' && n.name.startsWith(prefix))
    const up = []
    for (const n of mine) if (await running(n)) up.push(n.name)
    return { swarm: r.want.swarm, prefix, known: mine.map(n => n.name), running: up, owner: ownerOf(r.want.swarm) }
  },
  compare: (r, a) => a && a.running.length >= r.want.atLeast ? { status: 'met', detail: { running: a.running } } : { status: 'missing', detail: a ? { running: a.running } : null },
  async create (r, ctx, a) {
    const made = []
    let up = a ? a.running.length : 0
    for (let i = 1; up < r.want.atLeast; i++) {
      const name = `${a?.prefix ?? r.want.prefix ?? 'node-'}${i}`
      if (a?.running.includes(name)) continue
      if (a?.known.includes(name)) await restart({ folder: r.want.swarm, node: name })
      else await joinNode({ folder: r.want.swarm, node: name })
      made.push(name)
      up++
    }
    return { made }
  },
  owned: (a, ctx) => a.owner === ctx.owner
}

export const providers = { swarm, node, nodes }
