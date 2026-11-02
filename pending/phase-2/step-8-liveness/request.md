# Request: step 8, liveness

Carried forward from step 6: nothing tells the swarm a node has gone.
p2p-rns keeps a gone node's registration, and peers wait on its address.
The human's direction: the rns service uses a timeout to flag a node as
absent, on top of a graceful leave.

## The design

Liveness is p2p-rns's concern, and only its own: it holds the lease, and
tells the nodes how long it is.

- **A lease per node.** A node registered from a peer holds a lease
  (`leaseMs`, p2p-rns's option). Any operation from its owner renews it,
  and `renew` is the heartbeat. The registration answers with the lease,
  so a node knows how often to renew (a third of it).
- **Absent, by timeout.** A sweep flags a node whose lease ran out:
  `present: false`, `absentSince`. Its records stay, flagged, not hidden:
  `resolve` and `list` say it. Its name stays its owner's. Renewing again
  makes it present again.
- **Leaving, gracefully.** `leave` takes the node and its resources out:
  the name is free. A node leaves when it stops gracefully, bounded in
  time (a master already gone does not hold the stop).
- **The node running the service** holds no lease.
- **Events**: `node-absent`, `node-present`, `node-left`; metrics count
  them.
- **Callers decide.** A requester refuses an absent node at once, rather
  than waiting on its address.
- **A broken connection to the master** (a node paused, the network gone
  for a while): the node renews on the next connection.

## Parts, in order

1. **p2p-rns**: leases, the sweep, `renew`, `leave`, presence on the
   records, the events.
2. **p2p-node**: the heartbeat, leaving on a graceful stop, the master
   channel taken again on a new connection.
3. **Requesters**: `send-request` (and step 6's request) refuse an absent
   node.
4. **Splectral**: the abstract world learns presence (`absent`,
   `present`, `left`; contract 0.2); the mapper maps p2p-rns's events from
   the master's log; the map shows an absent node and a node that left;
   actions `pause-node` and `resume-node` (the node frozen and thawed,
   which no graceful path sees).
5. **The application** `base-demo-liveness`: a scenario. node-1 is paused
   and flagged absent after its lease, resumed and present again, then
   stopped gracefully and leaves; the swarm runs on.
6. **Validation and products.** Unit tests; the scenario run live in
   Splectral, recorded as topics, replayed; headless browser tests
   recorded; the product repositories merged.

## Done

All parts done, recorded in `main:steps/8-liveness/`.
