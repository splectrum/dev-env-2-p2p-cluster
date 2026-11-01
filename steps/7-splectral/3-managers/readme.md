# Part 3: the managers on topics

**Scope.** `notes/topics.md`: the managers' records produced into
topics; their state files become views.

**Done.**
- **`p2p-node-manager`**: in the node's folder, `topics/manager` (what the
  manager did and saw, from `starting`, which carries what was
  `node.json`) and `topics/node` (the node's log, one record per line;
  a non-JSON line as `{ text }`). The node's state is the fold of
  `topics/manager` (`reduceNodeState`, `nodeState(folder)`): a run starts
  at `starting`; materialised, genesis, live, ready, stopping, exited
  follow. `state.json` is its cache, written from the same reducer.
  Writes are flushed before the manager exits.
- **`p2p-swarm-manager`**: its record is `topics/swarm`; what the swarm
  is, is the fold of its `described` records, `swarm.json` the cache.
  Every operation reads the swarm from the fold; writes are settled
  before the command line exits.
- `node.jsonl`, `manager.jsonl`, `swarm.jsonl` and `node.json` are gone;
  `node.stderr` stays a text file.

**Findings**: recorded with part 4, live (`../4-master-aux/record/`):
the master's manager topic held 10 records and its node topic 62;
node-1's 9 and 45; the swarm's 12, of eight kinds; the states folded from
them `running` with the nodes' URIs; no secret in any topic.

Earlier steps' validation scripts (steps 4 to 6) read the old files:
they are those steps' record, kept as they were.
