# Step 8. Liveness

Status: **done** (2026-11-02). Request:
`pending/phase-2/step-8-liveness/request.md` on `pending/default`
(`fc2c621`). The human's direction: the rns service uses a timeout to flag
a node as absent, on top of a graceful leave.

| Part | What | Status |
|---|---|---|
| `1-rns/` | p2p-rns: leases, absent by timeout, leave | done |
| `2-node/` | p2p-node: heartbeat, leave on a graceful stop; the managers' fixes found | done |
| `3-requesters/` | an absent node refused at once | done |
| `4-splectral/` | presence in the abstract world; pause and resume | done |
| `5-application/` | `base-demo-liveness` | done |
| `6-validation/` | end to end, recorded; the products | done |

**Outcome.** A gone node is neither listed as present nor waited on:
p2p-rns flags a silent node absent when its lease runs out and present
again when it renews; a graceful stop leaves; requesters refuse an absent
node at once. Splectral shows it, live and replayed ("A node goes quiet").
On the way, a graceful stop's log is whole again, and the swarm manager
reads node state from its source.

Open, carried forward: how long an absent node keeps its name (a second,
longer timeout taking it out); the lease per swarm (a setting, today 15 s);
the step 7 scenario rerun with liveness (remote-1 now leaves too).
