# Step 7. Splectral and data in topics

Status: **done** (2026-11-01). Request:
`pending/phase-2/step-7-splectral/request.md` on `pending/default`
(`d8cdfa0`). Design: `notes/splectral.md`, `notes/topics.md`; rules:
`rules.md` (single concern first, records and topics, data names).

| Part | What | Status |
|---|---|---|
| `1-validation/` | validation in one place: `mycelium-uri`, at the boundary | done |
| `2-topic/` | `mycelium-topic` | done |
| `3-managers/` | the managers on topics | done |
| `4-master-aux/` | a management channel for every node | done |
| `5-observer/` | `splectral-p2p-observer` | done |
| `6-core/` | the platform's core | done |
| `7-extensions/` | replay, scenario, timeline | done |
| `8-adapters/` | the p2p adapters | done |
| `9-applications/` | `base-view-map`, `base-demo-other-host` | done |
| `10-validation/` | end to end, recorded; the products | done |

**Outcome.** The platform's foundations and Splectral as a viewer with its
first demo, end to end: validation in one place; data in topics of Kafka
records (`mycelium-topic`), the managers' records among them, state as
their fold; every node with a management channel and an observer;
Splectral's core, generic extensions, p2p adapters and two applications
that know no p2p; the step 6 scenario watched live in a browser,
recorded, replayed.

Not done in this step, carried forward: the `repository` and `swarm`
sources (with the nodes' audit cores), replay to a point in time, the
scenario page showing the pages a step names (`show`), liveness. Found:
the node image now carries React and htm (the workspace's one tree).
