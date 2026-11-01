# Part: the managers

- `p2p-node-manager`: role `join` as well as `master`: the container
  created on the auxiliary network and connected to the swarm's, the
  provisioning peer, the tmpfs mounts (store noexec, code exec for joining
  nodes, `/tmp` noexec), the materialised code recorded.
- `p2p-swarm-manager`: genesis makes the auxiliary network too; `join`
  adds a node (its addresses on both networks, its auxiliary port), starts
  its node manager with the master's key and DHT address and the packages'
  URI, key and commit, and records it; `status`, `restart` and `stop` work
  on every node (stop: joined nodes first, then the master).
