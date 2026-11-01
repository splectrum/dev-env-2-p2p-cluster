# p2p-node

The node application: a node of a swarm, composed from the p2p series
(store, DHT, connections, replication, channels), its repositories
(p2p-mrepo, with mycelium) and the resource name service (p2p-rns). It is
what runs in a node's container (`cli.js`, Bare).

```js
import { startNode, swarmTopic } from 'p2p-node'
const node = await startNode({ role: 'master', swarm, name, storage, primaryKey, host, code, observer })
node.uri, node.key, node.repos, node.metrics(), await node.stop()
```

**Role master** (step 4), the swarm's first node, from zero:

- the swarm's DHT (two persistent nodes at its address), connections on
  its identity (a keypair derived from its primary key), replication,
  p2p-rns in memory, served on a channel to every peer that connects on
  the swarm's topic (`swarmTopic(swarm)`);
- genesis: its repositories, `node` (its own record) and `packages` (the
  node's code, the folder `code`, deployed into `capability/default`, the
  code crossing the boundary once), reproducibly: fixed author and time,
  ids derived from its identity and the names, so the same primary key and
  code give the same keys, commits and ids after a rebuild;
- registered in p2p-rns and announced.

The store is for RAM (it holds the node's secrets). The primary key comes
from the node manager on stdin (`cli.js`), never from a file the node
keeps. Its log (stdout, JSON lines) is every module's audit and its
metrics at intervals. SIGTERM stops it gracefully.

Other roles (a node joining) come with step 5.

`npm test`: 2 tests.
