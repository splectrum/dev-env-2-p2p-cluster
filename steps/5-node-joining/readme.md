# Step 5. A node joining

Status: **done** (2026-11-01); the product repositories of `p2p-node`,
`p2p-rns` and `p2p-mrepo` merged after step 6 (`notes/products.md`).
Request: `pending/phase-2/step-5-node-joining/request.md` on
`pending/default`. Scope: `notes/plan.md`, step 5.

| Part | What | Record |
|---|---|---|
| `provisioning/` | the secret through the auxiliary swarm | `validation/record/joining-node-1/manager.jsonl` |
| `code/` | the code by replication, at the pinned commit | the node's log, `materialised` |
| `live/` | the boot repository cloned into the node's own; its name | the node's log, `live` |
| `requests/` | requests in code: a bundle in, a response on main | `validation/record/results.jsonl` |
| `managers/` | the node manager provisions; the swarm manager adds nodes | `validation/record/joining-swarm/` |
| `validation/` | end to end | `validation/record/` |
| `product/` | the product repositories | `product/readme.md`, `notes/products.md` |

Not in this step, as the request says: an image holding only the join
closure (it still holds all the code), the master provisioned the same way
(it keeps stdin), admitting request writers (intake records the sender).
