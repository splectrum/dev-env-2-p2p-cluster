# Request: step 4, the swarm: genesis

From the plan (`main:notes/plan.md`, step 4). From zero: the swarm comes
first, everything else joins it. A thin path, end to end.

## Parts

1. **`p2p-rns`, in code**: the resource name service, in memory, for the
   lifetime of the node running it. Register (owners only: a node under
   its own name, a node's name unique in the swarm), resolve a URI
   (`/<swarm>/<node>/<name>`) to its internal id and key, list by URI
   pattern, reverse (a key to its URI); served and asked as requests on a
   `p2p-channel`, the sender's identity from the connection.
2. **The node application** (proposed name `p2p-node`; its repository to
   be created), master role: its store in RAM with the primary key given
   on stdin; the swarm's first DHT (two persistent nodes); connections,
   replication, channels; `p2p-rns`; genesis: its own repository (`node`)
   and the packages (`packages`: the node's code, as deployed, imported
   into a repository at the boundary, reproducibly), registered and
   served; graceful stop; its audit and metrics as JSON lines on its log.
3. **The image**: the plain base with the node's code (the join closure).
4. **`p2p-node-manager`, minimal**: starts a node's hardened container
   (read-only root, no capabilities, an unprivileged user, the store on a
   tmpfs, no swap, no core dumps), hands it its secret on stdin from the
   vault (a stand-in: an owner-only file outside every repository),
   follows its log and the container's lifecycle into its records, stops
   it gracefully; long-running, for the node's life.
5. **`p2p-swarm-manager`, minimal**: genesis (the swarm's network, the
   master node's secret in the vault, its node manager started,
   independent of the swarm manager), the swarm's record, and status by
   asking `p2p-rns` from the host as a peer.
6. **Validation**: genesis end to end; from the host, the master node's
   resources resolved by URI and the packages read lazily from a replica;
   a restart of the master gives the same identity and the same packages
   commit; a graceful stop; the audit and metrics recorded.
7. **The product repositories**: the managers' updated; `p2p-rns` and the
   node application's once their repositories exist.

## Done

All parts done, recorded in `main:steps/4-genesis/`.
