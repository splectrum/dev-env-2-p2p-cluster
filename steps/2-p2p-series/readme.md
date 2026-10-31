# Step 2. The p2p series, minimal and instrumented

Status: **in progress**. Request: `pending/phase-2/step-2-p2p-series/request.md`
on `pending/default`. Scope: `notes/plan.md`, step 2.

| Part | What | Record |
|---|---|---|
| `instrumentation/` | the contract every module follows: events (audit) and metrics, never a secret | the readme |
| `modules/` | `p2p-store`, `p2p-dht`, `p2p-connect`, `p2p-replicate`, `p2p-channel`, folders on `main`, one dependency tree | unit tests in `validation/record/` |
| `signals/` | a graceful stop under Bare | `signals/record/` |
| `validation/` | two peers composed from the modules: Node, Bare, host and container | `validation/record/` |
| `product/` | the five product repositories updated | `product/readme.md`, `notes/products.md` |

Done when all five parts are done and recorded here.
