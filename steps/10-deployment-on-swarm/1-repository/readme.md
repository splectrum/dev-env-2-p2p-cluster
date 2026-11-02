# Part 1: the deployment repository

**Done.** The master creates `deployment` at genesis (empty: `{ swarm,
nodes: [] }`), registers it as `/<swarm>/master/deployment`, replicates
it. `Deployment: set` requests to the master carry a `deployment.json`,
checked at that boundary (`checkDeployment`, `p2p-node/deployment.js`:
the swarm's own, nodes named or selected, the master never deployed, no
unknown field) and committed: each change a commit, the history the
record. Unit test: set by a peer's request, read back; three bad ones
refused without changing it.
