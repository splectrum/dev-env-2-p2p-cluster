# Step 8. Liveness

Status: **in progress**. Request:
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
| `6-validation/` | end to end, recorded; the products | |
