# Step 2 (the demos again), part 1: p2p and mycelium on Bare (2026-11-07)

Request: `pending/default:pending/phase-3/step-2-the-demos-again/request.md`.

- The swarm's codebase on Bare: 13 modules (the p2p node and what it uses),
  their tests on brittle (180); `mycelium-topic`, `mycelium-repo` too. The
  managers wait for part 3.
- What Bare needed care with, new here: `readdirSync` unsorted (sorted where
  the order matters); `t.exception.all` for an expected `TypeError`; no
  `execFileSync` (a local helper on `spawnSync` in the tests that use it).
- `base-swarm-three-nodes` written by the package writer (64 MB); its
  swarm's codebase assembled into a master's repository by the package
  manager: 166 tests passing there.
- The writer: knows every module of this repository; writes every
  package's `modules-load` and `sets`; default test sets. Test sets can
  include the swarms' tests (`swarms`).
- From a fresh release, Node.js off the PATH: haicc's full set 7 passed;
  `./haicc boot base-swarm-three-nodes/test` 16 passed;
  `--set=validation` 3 passed.

The local check: `local-run.md`, to come.
