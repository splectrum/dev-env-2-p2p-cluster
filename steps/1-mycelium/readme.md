# Step 1. Mycelium back to its own concern

Status: **in progress**. Request: `pending/phase-2/step-1-mycelium/request.md`
on `pending/default`. Scope: `notes/plan.md`, step 1.

Mycelium knows nothing of p2p: storage on Hypercore belongs below it.

| Part | What | Record |
|---|---|---|
| `mycelium-git/` | back to its backend contract; Corestore and Hyperdrive development dependencies only; p2p-git from `pear-full-square`; a new id | the change itself (commits named in the readme) |
| `first-build/` | `mycelium-node/` and the scripts in `cluster/` removed; their records kept | the change itself |
| `validation/` | every module's unit tests; a full test run, every engine, Node and Bare, kept | `validation/record/` |
| `product/` | `pear-full-square/mycelium-git` updated from the folder | `product/readme.md`, `notes/products.md` |

Done when all four parts are done and recorded here.
