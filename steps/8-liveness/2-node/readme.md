# Part 2: p2p-node, the heartbeat and leaving

**Done.** `p2p-node`:
- a joining node renews every third of the lease p2p-rns told it, on the
  master's current connection; each renewal is bounded by that third;
- a new connection to the master is taken again and renewed at once; a
  registry that forgot the node (its master restarted) is told again,
  with its resources;
- a renewal not answered drops the connection as stale, so it is made
  again at once;
- on a graceful stop the node leaves first, bounded (2 s), so a master
  already gone does not hold the stop;
- the master runs p2p-rns (option `leaseMs`) and closes its sweep on stop.

3 unit tests (1 new: three leases long a joined node stays present; on its
stop it has left, with its resources).

**Found in the dry runs, fixed** (each its own commit):
- **A stale connection.** Frozen, node-1 lost its connection on the
  master's side only. Thawed, its renewal waited a whole lease on the dead
  one: present again only 14.6 s after the resume. Now bounded by the
  heartbeat's interval and the connection dropped: about 7 s.
- **A graceful stop's last lines were lost** (in step 7's record too): the
  node left, stopped, exited 0, but its log ended at the leave request.
  The node manager stopped the container with a synchronous call, which
  blocked its loop while the node stopped; the pipe from `docker start -a`
  filled (the last metrics line is large) and the rest was dropped. The
  stop is asynchronous now, and the manager ends on the child's `close`
  (after its output is read), not its `exit`. A first attempt, reading
  the tail from `docker logs`, found nothing to add and went.
- **The swarm manager read `state.json` half written** (a JSON parse
  error at `join`, the node fine): it is a cache. The swarm manager now
  reads the node's state as the fold of its manager's topic
  (`nodeState(folder, from)`, this run's records only, from
  `stateOffset`), as single concern says.
