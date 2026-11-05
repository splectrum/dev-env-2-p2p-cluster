# Part 7: a node's shutdown, with its prerequisites

The local run's finding 1 (`../5-validation/local-run.md`): `stop-node` raced
the swarm manager's auto mode (the liveness scenario failed 1 run in 6).
The human's design (2026-11-05): cut the ties first, per node: before a node
is stopped, every party holding on to it lets go, like programs closing
before a computer shuts down. Today one party, the watcher; later each
application the node takes part in.

**Built.**
- `p2p-swarm-manager/shutdown.js`: a shutdown requested
  (`<swarm>/topics/shutdown`), each running party letting go in its own
  topic (`topics/shutdown-<party>`), released; the nodes held, a fold.
- `stopNode` asks first and stops only once every party has let go (a
  party that does not: not stopped, an error); then it waits on the
  process it signalled, not on the pid file a next manager writes again.
  A stop the substrate does itself (an extra, in strict mode) asks nothing.
- The watcher lets go, after a round begun once the request was there.
- The providers: a held node is met as held, never an extra, counted in a
  selection; the `swarm-deployment` requirement releases a held node its
  deployment names (the project's reconcile: Run again); `restart` and
  `release-node` release too.
- `stop-node` (Splectral's action): through the swarm's manager where the
  swarm runs, the node's manager otherwise (another host); a stop that does
  not complete fails, never `ok`.
- The scenario listens for an action's effect before the action.

**Validated** (2026-11-05): the module tests (p2p-swarm-manager 2, among
them the shutdown's; splectral-scenario, haicc-*, p2p-node-manager); the
liveness demo from the development tree, auto mode on, its scenario in the
browser three pairs, **6 of 6 ok** (72, 58, 51, 59, 49, 51 s), no page
error. Each stop in the records: requested by `splectral`, let go by
`swarm-watcher` 0.2 to 2.2 s later, stopped; held through the rest of the
run (auto mode never brought it back); released by `reconcile` at the next
Run, and restarted. Torn down, nothing left.
