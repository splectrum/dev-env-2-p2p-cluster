// The p2p records, mapped into the abstract world (splectral-contract).
// All knowledge of p2p stays here: applications see hosts, nodes,
// resources, links and requests.
//
// One mapper for the managers' and nodes' topics, keeping what it needs
// across them: which node a folder is (from its manager's `starting`),
// which nodes a host's swarm manager controls (from its `described`). A
// node's log read before its manager's topic waits for it.

export default function createMapper () {
  const folders = {} // `${host}/${folder}` -> node URI
  const waiting = {} // `${host}/${folder}` -> [records]
  const controlled = new Set() // node URIs a swarm manager on that host controls
  const nodes = {} // uri -> { host, key, status }

  const node = (uri, host) => (nodes[uri] ??= { host })
  const joinedOf = uri => ({ kind: 'joined', uri, host: nodes[uri].host, key: nodes[uri].key, controlled: controlled.has(uri) })

  function manager (v, ctx, at) {
    const out = []
    switch (v.kind) {
      case 'starting': {
        const uri = `/${v.swarm}/${v.name}`
        folders[at] = uri
        node(uri, ctx.host).status = 'starting'
        out.push({ kind: 'nodeStarting', uri, host: ctx.host, controlled: controlled.has(uri), time: v.time })
        for (const r of waiting[at] || []) out.push(...log(r.value, uri, r))
        delete waiting[at]
        break
      }
      case 'node-ready': { const n = node(v.uri, ctx.host); n.key = v.key; n.status = 'running'; out.push({ ...joinedOf(v.uri), time: v.time }); break }
      case 'node-live': out.push({ kind: 'resource', uri: v.uri, node: folders[at], type: 'node', time: v.time }); break
      case 'node-genesis': for (const t of ['packages', 'boot']) out.push({ kind: 'resource', uri: `${folders[at]}/${t}`, node: folders[at], type: t, time: v.time }); break
      case 'container-exited': if (folders[at]) { node(folders[at], ctx.host).status = 'gone'; out.push({ kind: 'gone', uri: folders[at], exitCode: v.exitCode, time: v.time }) } break
    }
    return out
  }

  function log (v, uri, r) {
    const t = v.time
    switch (v.kind) {
      case 'connection-opened': return [{ kind: 'connected', from: uri, toKey: v.peer, time: t }]
      case 'connection-closed': return [{ kind: 'disconnected', from: uri, toKey: v.peer, bytes: (v.bytesReceived || 0) + (v.bytesSent || 0), time: t }]
      // The name service's view of presence (p2p-rns, in the master's log).
      case 'node-absent': return v.module === 'p2p-rns' ? [{ kind: 'absent', uri: v.uri, since: v.lastSeen + v.leaseMs, time: t }] : []
      case 'node-present': return v.module === 'p2p-rns' ? [{ kind: 'present', uri: v.uri, time: t }] : []
      case 'node-left': return v.module === 'p2p-rns' ? [{ kind: 'left', uri: v.uri, time: t }] : []
      case 'request-taken': return [{ kind: 'requestSent', fromKey: v.sender, to: `${uri}/${v.repository || 'node'}`, uri: `${uri}/${v.repository || 'node'}`, name: v.name, time: t }]
      case 'requests-executed': return (v.executed || []).map(name => ({ kind: 'requestAnswered', uri: `${uri}/node`, name, time: t }))
      case 'action-result': {
        const corr = (r.headers || []).find(h => h.key === 'correlation')?.value
        const out = [{ kind: 'actionResult', node: uri, action: v.action, ok: v.ok, correlation: corr, time: t }]
        if (v.ok && v.action === 'write') out.push({ kind: 'changed', uri: v.result.uri, path: v.result.path, time: t })
        return out
      }
      default: return []
    }
  }

  function swarm (v, ctx) {
    if (v.kind !== 'described') return []
    const out = []
    for (const n of v.swarm.nodes || []) {
      const uri = `/${v.swarm.swarm}/${n.name}`
      if (controlled.has(uri)) continue
      controlled.add(uri)
      // Told again, now with who controls it.
      const status = nodes[uri]?.status
      if (status === 'running') out.push({ ...joinedOf(uri), time: v.time })
      else if (status === 'starting') out.push({ kind: 'nodeStarting', uri, host: nodes[uri].host, controlled: true, time: v.time })
      else if (status === 'gone') out.push({ kind: 'gone', uri, controlled: true, time: v.time })
    }
    return out
  }

  return (record, topic) => {
    const ctx = topic.context || {}
    const at = `${ctx.host}/${ctx.folder}`
    const v = record.value || {}
    if (topic.holds === 'p2p-node-manager/manager') return manager(v, ctx, at)
    if (topic.holds === 'p2p-swarm-manager/swarm') return swarm(v, ctx)
    if (topic.holds === 'p2p-node/log') {
      if (!folders[at]) { (waiting[at] ??= []).push(record); return [] }
      return log(v, folders[at], record)
    }
    return []
  }
}
