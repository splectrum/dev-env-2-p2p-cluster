# Part 8: the p2p adapters

**Done** (folders on `main`; repositories in `pear-full-square`):
- **`splectral-p2p-watchers`**: the source kind `p2p-host` (a host's
  managers' folders: each node manager's `topics/manager` and
  `topics/node`, each swarm manager's `topics/swarm`, followed as `file`
  sources; rescanned, so nodes that come later are followed) and one
  mapper for all of them, into the abstract world: nodes starting,
  joined, gone, and controlled when their host's swarm manager describes
  them; resources (`node`, `packages`, `boot`); links with bytes; requests
  sent and answered; observers' results, and the changes a `write` makes.
  A node's log read before its manager's topic waits for it.
- **`splectral-p2p-actions`**: `state` and `write` (into the node's
  action topic, carried out by its observer), `invite` (the swarm
  manager's invitation, into the other host's folder),
  `start-node-from-invitation` (the host's own node manager, detached,
  with its vault), `stop-node` (its manager, by its pid file),
  `send-request` (a peer of the swarm from the host's address on the data
  plane: resolved by URI, a bundle, the answer from a replica).

**Findings:**
- Unit test of the mapper (every kind of record, no p2p word in the
  events it gives) passes; mapped live from part 5's recorded topics
  before any test: nodes, resources, links with bytes, actions, changes.
- One ordering bug met on those topics: a swarm's description read after
  its node had gone told the node "starting" again; now it tells "gone"
  with who controlled it.
- Not built in this step (from the request): the `repository` source (a
  resource's replica, watched) and the `swarm` source (the name service
  asked as a peer). The `p2p-host` source covers the demo, both hosts'
  folders being on one machine; the two follow with the nodes' audit
  cores, which they serve.
