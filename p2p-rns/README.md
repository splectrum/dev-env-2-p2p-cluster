# p2p-rns

The resource name service: a swarm's nodes and resources by URI. Rooted in
p2p (it knows keys, nodes and the swarm); its users get URIs and
identities. Part of the p2p series. In code for now: in memory, for the
life of the node running it (the swarm's master); a repository-based
version comes later, behind the same operations.

```js
import { createRns, rnsClient } from 'p2p-rns'
const rns = createRns({ swarm: 'demo', observer })
rns.registerNode({ owner, name: 'master' })                 // owner: the node's public key
rns.register({ owner, name: 'packages', id, key, type })    // under the owner's node
rns.resolve('/demo/master/packages'), rns.list('/demo/*/*'), rns.reverse(key)
openChannel(stream, { name: 'p2p-rns', onrequest: rns.handler(peerKey) })   // serving
const client = rnsClient(openChannel(stream, { name: 'p2p-rns' }))           // asking
```

- **Owners only.** The owner is the connection's key, never the message's
  claim. A node has one name, unique in the swarm; it names its own
  resources, unique under it, and may change what a name points to (a
  rebuilt repository's new key).
- **URIs**: `/<swarm>/<node>` and `/<swarm>/<node>/<name>`, segments
  lowercase `a-z`, `0-9`, `-`; `list` takes `*` for any one segment.
- **Nothing is kept**: when the node running it restarts, owners register
  again from their own records.

**Instrumentation**: `node-registered`, `registered` (with the key
replaced, if any), `refused` (why); metrics: records, nodes, and counts
per operation.

`npm test`: 3 tests.
