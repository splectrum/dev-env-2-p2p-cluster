# mycelium-node

A cluster node: its store, a persisted Hyperdrive with p2p-git on it
(mycelium-git's `openHyperdrive`), on Hyperswarm. Every connection
replicates the node's Corestore, so a drive opened by key is loaded from
the peers that hold it, lazily: only the blocks a read needs.

```js
import { startBootstrap, startNode } from 'mycelium-node'
const dht = await startBootstrap({ host, port: 49737 })        // the seed only
const seed = await startNode({ storage, bootstrap: [{ host, port: 49737 }], host })
const joiner = await startNode({ storage, bootstrap, host, key: seed.key })
openRepo(joiner.backend).read('/main/readme.md')
joiner.metrics()   // connections, bytes received and sent, drive sizes
```

- `startNode({ storage, bootstrap, host, port, key })`: without a key the
  node's own drive (it writes); with one, a replica of another node's drive
  (it reads). Peers find each other by the drive's discovery key.
  `metrics()` gives the replication volume and the drive's cores: their
  length, what is held from the start (`contiguous`) and bytes.
- `startBootstrap({ host, port, size })`: a private DHT, its bootstrap
  node at a fixed port plus a second persistent node. A cluster does not
  need the public DHT, and here it cannot reach it (no outbound UDP).

- `materialise(backend, layout, dir)` (pkg/materialise): a deployment's
  layout (each folder of an installed tree linked to a package instance, a
  tree oid in the package repository) written out as plain folders. Only
  the layout's trees are read, so on a replica only their blocks are
  loaded; a tree's entries are read in parallel, since each read is a
  round trip to a peer. `readDeployment(backend, name)` reads
  `deployments/<name>.json` from the package repository's main.

Two findings from probing, both in `lib/node.js`:

- A DHT of one node keeps no findable announcements: with one persistent
  node no connection was made, with two or more it was.
- Nodes of a cluster reach each other directly, so a node's DHT is not
  firewalled. Left to holepunching, a connection opened on one side only
  and carried nothing (on one host, Node and Bare alike).

## Command line

```sh
bare cli.js seed <storage> [--bundle=<file>] [--host=<ip>] [--dht-port=<port>]
bare cli.js join <storage> <key> --bootstrap=<host:port> [--host=<ip>] [--select=<path>] [--stay]
```

`seed` starts the private DHT and the node; a bundle (the outside world's
transport) is read into an empty drive once. It stays up. `join`
replicates the drive `<key>`, selects a path on it and closes, or stays up
to serve (`--stay`). Output is JSON lines; metrics only here, at the
boundary.

## Tests

- `npm test`: a seed and a joining node in one process, on a private DHT
  on this host: written on one, read lazily on the other.
- `cluster/two-nodes.sh` (dev repository): the same with two Bare nodes in
  Docker containers.
