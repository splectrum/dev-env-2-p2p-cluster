// p2p-rns — the resource name service: a swarm's nodes and resources by
// URI. Rooted in p2p (it knows keys, nodes and the swarm); its users get
// URIs and identities.
//   const rns = createRns({ swarm, observer })      in code, in memory, for
//                                                  the life of the node running it
//   rns.registerNode({ owner, name })               a node joins under a name
//   rns.register({ owner, name, id, key, type })    a resource under its owner's node
//   rns.resolve(uri)       '/<swarm>/<node>[/<name>]' -> its record, or null
//   rns.list(pattern)      '*' for any one segment -> the records it matches
//   rns.reverse(key)       a key -> its URI, or null
//   rns.handler(owner)     onrequest for a p2p-channel: owner is the peer's key
//   rnsClient(channel)     the same operations, asked on a channel
//
// Owners only: `owner` is the registering node's public key (hex), from the
// connection, never from the message. A node has one name, unique in the
// swarm; it names its own resources, unique under it, and may change what
// a name points to (a rebuilt repository's new key). The registry keeps
// nothing: if the node running it restarts, owners register again.
//
// Instrumentation (the series' contract): node-registered, registered,
// refused (with why), and counts of lookups as metrics.

import { validate, validateName } from '../mycelium-uri/index.js'

const MODULE = 'p2p-rns'

export function createRns ({ swarm, observer = null }) {
  const emit = (kind, facts) => observer && observer({ module: MODULE, kind, time: Date.now(), ...facts })
  const records = new Map() // uri -> record
  const nodes = new Map() // owner -> node name
  const counts = { registerNode: 0, register: 0, refused: 0, resolve: 0, list: 0, reverse: 0 }

  const refuse = (owner, op, why) => {
    counts.refused++
    emit('refused', { owner, op, why })
    throw new Error(why)
  }
  const segments = uri => {
    const parts = String(uri).split('/')
    if (parts[0] !== '' || parts.length < 2) throw new Error(`not a URI: ${uri}`)
    return parts.slice(1)
  }

  const rns = {
    swarm,
    registerNode ({ owner, name }) {
      const uri = `/${swarm}/${name}`
      const held = records.get(uri)
      if (held && held.owner !== owner) refuse(owner, 'registerNode', `node name taken: ${name}`)
      if (nodes.has(owner) && nodes.get(owner) !== name) refuse(owner, 'registerNode', `already a node: ${nodes.get(owner)}`)
      const record = { uri, kind: 'node', name, owner }
      records.set(uri, record)
      nodes.set(owner, name)
      counts.registerNode++
      emit('node-registered', { uri, owner })
      return record
    },
    register ({ owner, name, id, key, type = null }) {
      const node = nodes.get(owner)
      if (!node) refuse(owner, 'register', 'not a node of this swarm')
      const uri = `/${swarm}/${node}/${name}`
      const before = records.get(uri)
      const record = { uri, kind: 'resource', node, name, type, id, key, owner }
      records.set(uri, record)
      counts.register++
      emit('registered', { uri, owner, id, key, type, replaced: before ? before.key : null })
      return record
    },
    resolve (uri) {
      counts.resolve++
      segments(uri)
      return records.get(uri) || null
    },
    list (pattern) {
      counts.list++
      const want = segments(pattern)
      return [...records.values()]
        .filter(r => {
          const have = segments(r.uri)
          return have.length === want.length && want.every((w, i) => w === '*' || w === have[i])
        })
        .sort((a, b) => a.uri.localeCompare(b.uri))
    },
    reverse (key) {
      counts.reverse++
      for (const r of records.values()) if (r.key === key || (r.kind === 'node' && r.owner === key)) return r.uri
      return null
    },
    // A p2p-channel's onrequest for one peer: the peer's key is the owner.
    // The boundary: what a peer sends is validated here (mycelium-uri),
    // once; the registry inside trusts it.
    handler (owner) {
      const name = (n, what) => { try { return validateName(n, what) } catch (err) { refuse(owner, 'validate', err.message) } }
      const uri = (u, star) => { try { return validate(u, { star }) } catch (err) { refuse(owner, 'validate', err.message) } }
      return body => {
        switch (body.op) {
          case 'registerNode': return rns.registerNode({ owner, name: name(body.name, 'node name') })
          case 'register': return rns.register({ owner, name: name(body.name, 'resource name'), id: body.id, key: body.key, type: body.type })
          case 'resolve': return rns.resolve(uri(body.uri, false))
          case 'list': return rns.list(uri(body.pattern, true))
          case 'reverse': return rns.reverse(body.key)
          default: throw new Error(`unknown op: ${body.op}`)
        }
      }
    },
    metrics: () => ({ records: records.size, nodes: nodes.size, ...counts })
  }
  return rns
}

// The same operations, asked of the swarm's p2p-rns on a channel (the
// channel named 'p2p-rns' on a connection to the node running it).
export function rnsClient (channel) {
  const ask = body => channel.request(body)
  return {
    registerNode: name => ask({ op: 'registerNode', name }),
    register: ({ name, id, key, type }) => ask({ op: 'register', name, id, key, type }),
    resolve: uri => ask({ op: 'resolve', uri }),
    list: pattern => ask({ op: 'list', pattern }),
    reverse: key => ask({ op: 'reverse', key })
  }
}
