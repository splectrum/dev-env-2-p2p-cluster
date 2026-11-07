# Steps

The phase's steps, one folder each, after `notes/plan.md`. A step is one
request on `pending/default` (`pending/phase-2/<step>/request.md`), with its
parts listed inside; executed on `execute/main`, its record lands here.

Each step folder holds:

- `readme.md`: the step: what is asked, its parts, what counts as done,
  its status and outcome, with references to its request and records.
- one folder per part, with what the part needs (code for a probe; for a
  module, a reference to its folder on `main`), its `readme.md` (question
  or scope, expectation, method, findings) and its `record/`:
  - `unit.json`: the invocation, the states by commit, the environment
    and the nondeterministic inputs: enough to rerun it;
  - `results.json` or `results.jsonl`: what happened, with metrics at the
    boundary;
  - kept runs, where a part has one.

Modules stay folders of their own on `main`, at `<org>/<repo>` since step 9
(`pear-full-square/p2p-store/`, ...): they are
split into their product repositories. A step's folder records what was
done with them.

| Step | Folder | Status |
|---|---|---|
| 0. Probes | `0-probes/` | done |
| 1. Mycelium back to its own concern | `1-mycelium/` | done |
| 2. The p2p series, minimal and instrumented | `2-p2p-series/` | done |
| 3. Repositories on the p2p layer | `3-repositories/` | done |
| 4. The swarm: genesis | `4-genesis/` | done |
| 5. A node joining | `5-node-joining/` | done |
| 6. A node on another host | `6-other-host/` | done (the other host simulated) |
| 7. Splectral and data in topics | `7-splectral/` | done |
| 8. Liveness | `8-liveness/` | done |
| 9. Click and run | `9-click-and-run/` | done |
| 10. The deployment on the swarm | `10-deployment-on-swarm/` | done |

Phase 3 (packages, the platform's structure, the demos again): `phase-3/`, its report `phase-3/readme.md`.
