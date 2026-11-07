// The p2p records, mapped into the abstract world (splectral-contract).
// All knowledge of p2p stays here: applications see hosts, nodes,
// resources, links and requests.
//
// From the source `haicc-swarm`: each node's container log (`haicc-node/log`:
// the node's own JSON lines) and its container followed and ended
// (`haicc-node/container`). Every node there is controlled by this host's
// HAICC.

export default function createMapper () {
  const container = (v, ctx) => {
    if (v.kind === 'following') return [{ kind: 'nodeStarting', uri: ctx.uri, host: ctx.host, controlled: true, time: v.time }]
    if (v.kind === 'exited') return [{ kind: 'gone', uri: ctx.uri, exitCode: v.exitCode, time: v.time }]
    return []
  }

  const log = (v, ctx, r) => {
    const uri = ctx.uri
    const t = v.time
    switch (v.kind) {
      case 'node-started': return [{ kind: 'joined', uri, host: ctx.host, key: v.owner, controlled: true, time: t }]
      case 'genesis': return ['packages', 'boot', 'deployment'].filter(n => v[n]).map(n => ({ kind: 'resource', uri: `${uri}/${n}`, node: uri, type: n, time: t }))
      case 'live': return [{ kind: 'resource', uri: v.uri, node: uri, type: 'node', time: t }]
      case 'connection-opened': return [{ kind: 'connected', from: uri, toKey: v.peer, time: t }]
      case 'connection-closed': return [{ kind: 'disconnected', from: uri, toKey: v.peer, bytes: (v.bytesReceived || 0) + (v.bytesSent || 0), time: t }]
      // The name service's view of presence (p2p-rns, in the master's log).
      case 'node-absent': return v.module === 'p2p-rns' ? [{ kind: 'absent', uri: v.uri, since: v.lastSeen + v.leaseMs, time: t }] : []
      case 'node-present': return v.module === 'p2p-rns' ? [{ kind: 'present', uri: v.uri, time: t }] : []
      case 'node-left': return v.module === 'p2p-rns' ? [{ kind: 'left', uri: v.uri, time: t }] : []
      case 'request-taken': return [{ kind: 'requestSent', fromKey: v.sender, to: `${uri}/${v.repository || 'node'}`, uri: `${uri}/${v.repository || 'node'}`, name: v.name, time: t }]
      case 'requests-executed': return (v.executed || []).map(name => ({ kind: 'requestAnswered', uri: `${uri}/node`, name, time: t }))
      default: return []
    }
  }

  return (record, topic) => {
    const ctx = topic.context || {}
    const v = record.value || {}
    if (topic.holds === 'haicc-node/container') return container(v, ctx)
    if (topic.holds === 'haicc-node/log') return log(v, ctx, record)
    return []
  }
}
