# Step 2. The p2p series, minimal and instrumented

Status: **done** (2026-10-31). Request: `pending/phase-2/step-2-p2p-series/request.md`
on `pending/default`. Scope: `notes/plan.md`, step 2.

| Part | What | Record |
|---|---|---|
| `instrumentation/` | the contract every module follows: events (audit) and metrics, never a secret | the readme |
| `modules/` | `p2p-store`, `p2p-dht`, `p2p-connect`, `p2p-replicate`, `p2p-channel`, folders on `main`, one dependency tree | unit tests in `validation/record/` |
| `signals/` | a graceful stop under Bare | `signals/record/` |
| `validation/` | two peers composed from the modules: Node, Bare, host and container | `validation/record/` |
| `product/` | the five product repositories updated | `product/readme.md`, `notes/products.md` |

Done when all five parts are done and recorded here.

## Outcome

The p2p series exists: `p2p-store`, `p2p-dht`, `p2p-connect`,
`p2p-replicate`, `p2p-channel`, each one concern, instrumented by one
contract (events to an observer as audit, metrics on demand, never a
secret), composed in one dependency tree. Their unit tests pass; two peers
composed from them find each other, connect, replicate lazily (the same
blocks counted on both sides) and talk on a channel, on Node, on Bare and
between the host and a hardened container (`validation/record/`, with each
peer's audit). Bare handles SIGTERM; npm's `bare` wrapper does not pass it
on, so long-running Bare processes start with the runtime's binary
(`signals/record/`; step 0's finding corrected). The five product
repositories are at their first versions (`product/`).

Not yet, as planned: replication policy, dedicated channels.
