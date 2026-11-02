# Step 9. Click and run

Status: **done** (2026-11-02). Request:
`pending/phase-2/step-9-click-and-run/request.md` on `pending/default`
(`9b4fe57`). Design: `notes/haicc-reconcile.md`, `notes/splectral.md`
(running Splectral, demos as projects), `notes/node-pattern.md`
(authority), `vision.md` (organisations, HAICC).

| Part | What | Status |
|---|---|---|
| `0-folders/` | the folders as `<org>/<repo>` | done |
| `1-reconcile/` | `haicc-reconcile` | done |
| `2-deployment/` | `haicc-deployment`, the lifecycle | done |
| `3-providers/` | the p2p providers; the swarm manager's start | done |
| `4-fixes/` | the local run's fixes | done |
| `5-splectral/` | Splectral in a project: topics, tabs, its providers | done |
| `6-projects/` | the demo projects, `sh haicc` | done |
| `7-document/` | `demos.md` | done |
| `8-validation/` | end to end, recorded; the products | done |

**Outcome.** A demo is a HAICC project brought up with one command, then
clicks, and run again any number of times. `haicc-reconcile` checks what
a module needs and makes it so (non-strict by default, only what it
owns); `haicc-deployment` keeps a deployment's lifecycle as records;
Splectral is part of a project, spoken to through topics, with tabs. The
repository's folders follow the products, `<org>/<repo>`.

Open, carried forward: the deployment on the swarm (step 10: the swarm's
part as a repository on the master, the managers' substrate apart, auto
mode); several projects at once (addresses allocated); node types and
configurations in selected requirements; a reconcile that notices the
image of a running swarm is older than the code; the `haiccing` projects'
product merges from a session that can attach them (see `products.md`).
