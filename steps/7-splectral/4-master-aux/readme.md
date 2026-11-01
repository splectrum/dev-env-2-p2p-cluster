# Part 4: a management channel for every node

**Scope.** Every node gets a management channel to its manager, the
master included, which until now got its secret on stdin.

**Done.**
- **The master is provisioned through the auxiliary swarm**, as joining
  nodes are: its container starts on the auxiliary network with the boot
  program, logs an ephemeral key that its manager authorises, takes its
  secret on a channel and keeps that link. It then runs from its image's
  code (`--role=master --code=/app`); a joining node still materialises
  the swarm's.
- `p2p-node/boot.js`: steps 1, 2 and 4 for both roles, step 3 (the code
  by replication) for joining nodes only.
- `p2p-node-manager`: one start path for both roles; the auxiliary flags
  for both. `p2p-swarm-manager`: the master's auxiliary address and port
  (index 0, as joining nodes are 1, 2, ...).

**Findings** (record of 2026-11-01, `record/`, `live.sh`; 9 cases, all
exit 0):
- Unit tests: p2p-node-manager 2, p2p-swarm-manager 1, p2p-node 2.
- Genesis 18.0 s (the image built), node-1 joined in 9.8 s.
- **Both nodes' secrets came through the auxiliary swarm**, each
  manager's topic says so (`secret-handed-over`, `via: auxiliary swarm`);
  inside the container the boot program hands it on to the node's
  process on its stdin.
- Status, stop (exit 0) as before; no container or network left; no
  secret in any topic.
