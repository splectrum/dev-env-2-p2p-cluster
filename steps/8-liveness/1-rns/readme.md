# Part 1: p2p-rns, leases

**Scope.** Liveness as p2p-rns's concern, and only its own.

**Done.** `p2p-rns`:
- a lease per node registered from a peer (`leaseMs`, 15 s by default);
  any operation from its owner renews it, `renew` is the heartbeat, and
  registering answers with the lease, so the node knows how often to renew;
- a sweep (every third of the lease, on its own timer until `close()`)
  flags a node whose lease ran out: `present: false`, `absentSince`. Its
  records stay, flagged, not hidden; `resolve` and `list` say it on every
  record, resources taking their node's presence. Its name stays its
  owner's. Renewing makes it present again;
- `leave` takes the node and its resources out, and frees the name;
- a `local` registration (the node running the service) holds no lease;
- events `node-absent` (with when it was last heard from), `node-present`,
  `node-left`; metrics count them and the nodes absent now.

**Findings.** 5 unit tests (2 new: absent, present again and leaving, on
an injected clock; the sweep on its own timer). The registry stays a
function of what owners said and when: time comes in as `now`, so the
tests need no waiting.
