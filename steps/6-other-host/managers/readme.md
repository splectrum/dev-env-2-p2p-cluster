# Part: the managers

- **`p2p-node-manager` on its own**: `cli.js join --invitation=<file>
  --folder --vault --name --ip --aux-subnet` (`joinFromInvitation()`).
  It makes the node's management plane on its host (its auxiliary network,
  `p2p-<swarm>-<name>-aux`, created at start, removed when the node has
  exited), provisions the node through it from its own vault, and attaches
  the container to the swarm's data plane at the address given. No swarm
  manager is involved. Its record says where the node came from
  (`aux-network-created`, `from: invitation`, the master's key).
- **`p2p-swarm-manager`**: `invite` (part `invitation/`); `status` lists
  the nodes p2p-rns knows, each marked `controlled` or not: controlled are
  the nodes it started through their managers; the others joined from
  elsewhere, under managers of their own. Its `managers` list stays its
  own nodes'. Its record (`swarm.json`) holds nothing of host B's node.
- Both CLIs clear the previous run's `state.json` before a start, so a
  restart's wait reads only this run's state (found in the trial: the
  wait read the previous run's `exited`).
