# Part 3: the p2p providers

**Done.**
- `p2p-swarm-manager/reconcile.js`: `swarm` (genesis, or started again
  as described; stopped on removal; a swarm of the same name running from
  elsewhere is a conflict, never touched), `node` (named: joined, or
  restarted; extras: running nodes no requirement names), `nodes`
  (selected: at least n, by prefix; types and configurations later).
  Ownership: the swarm's folder marked with its owner.
- The swarm manager learned `start` (a stopped swarm, its networks, its
  nodes, the master first), `stopNode` and `describe`; its command `start`
  and `stop-node`.
- `p2p-node-manager/reconcile.js`: `image` (built from a committed tree;
  a cache, never removed).

**Findings.** The generic kind for Node.js was `node`, overridden by the
swarm's `node`: renamed `nodejs`.
