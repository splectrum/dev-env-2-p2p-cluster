# Phase 3, step 2. The demos again

Status: **done** (2026-11-08). Request:
`pending/phase-3/step-2-the-demos-again/request.md` on `pending/default`
(`86cd957`). Design: `docs/design/` (platform, work-folder, packages, bare,
releases). Published: the tenth release, `setup-795612ec9e16`, by the local
agent with the human's word (`local-run.md`).

The aim, as asked: a demo runs again from a downloaded setup, the demo's
package fetched from haiccing and deployed through the root, its swarm made
from the package's configuration, the swarm's codebase assembled into the
master, its nodes running it, the Splectral app in the browser with its
scenario, the demo's tests passing on the platform; all on Bare, from
haiccing packages, no development repository. Met, but for the browser
check by hand, which is the human's.

| Part | What | Status |
|---|---|---|
| 1 | `p2p` and `mycelium` on Bare: their modules on Bare's own, tests on brittle; `base-swarm-three-nodes` (`1-p2p-mycelium/`) | done |
| 2 | Deploying a package through the root: the platform as two packages (HAICC, the package manager), refreshed from the sources at every root boot; `./haicc boot <package>`: checked intact, its swarms made from its configuration, its codebase assembled into the master's `packages/` | done |
| 3 | Nodes running the codebase: a container each, started by the node's own warm boot from its config (`node.json`: its key, readable for now), the master's `packages/` mounted read-only, Bare's stripped runtime, hardened; one Docker network per swarm | done |
| 4 | Splectral on Bare: the server on `bare-http1`, the generic modules ported; the p2p side on the new structure (watchers: the containers' logs; actions: the node's HAICC, Docker, a peer from the host); a swarm's Splectral server started and stopped with the swarm | done |
| 5 | The demos in the new structure: `base-demo-liveness` (one host); `base-demo-other-host` (host B joining by invitation, the previous implementation on Bare: the human, HAICC is the outside) | done |

## Validated

Every part from a fresh release here, Node.js off the PATH; then the local
agent from the published release (`local-run.md`), the same counts:

| `./haicc boot …` | full set | `--set=validation` |
|---|---|---|
| `base-package-haicc/test` | 6 passed, the platform's 24 steps | 2 |
| `base-swarm-three-nodes/test` | 17 passed, the deployment's 13 steps | 3 |
| `base-demo-liveness/test` | 25 passed, the demo's 8 steps | 2 |
| `base-demo-other-host/test` | 25 passed, the demo's 9 steps | 2 |

Nothing left after: no containers, no networks, no hidden files.

## Decisions made with the human, on the way

- The platform is a pair of packages, HAICC and the package manager; the
  setup carries a sufficient pair as a bootstrap, refreshed by the same
  names at every root boot, nothing kept or compared. The release covers
  the initial boot only: the packages keep changing; a breaking change
  fails the boot, and a new release follows.
- Swarms come from packages; a swarm already there boots from its own copy.
  Strict (nodes the package's only) is an option, not the default.
- The same name for the same kind of folder at every level: the swarm's
  codebase in the master's `packages/`. A swarm logs in the root's log (it
  runs the root's HAICC); a node in its own.
- A node's key in readable text in its config, kept while its folder is: a
  more secure way once it all runs. `host.json` not needed yet.
- The stripped runtime only, at the root too: the setup 39 MB.
- No release until all parts were done.
- Inside the swarm, the previous implementation (invitations, the node
  manager, the boot program replicating the code): HAICC is the outside.

## Findings, from the local run, and what became of them

- The candidate failed on Docker 28 (a node's `--ip` refused on a network
  made without a subnet): fixed by the local agent before publishing.
- Docker's error said whole; a test's Docker leftovers removed by the
  platform's default teardown; a stalled download ended (`--speed-time`):
  fixed here, on `main`, to go out with the next packages.
- No unit test for a Docker wanting a subnet: left to the full runs.
- Open from before: a removed `LICENSE` not noticed; WSL's clock; the
  runtime's sha256 pin untested.

## Known, not done (for later, each the human's to schedule)

Node keys in readable text; the next layout (`swarms/`, `user/`, the lock);
cleanup by label after a crash (the old node manager's containers carry no
install label); the node image pulled from Docker Hub at the first node
boot (not air-gapped yet); a fixed port per demo (4400) and host B's fixed
side subnet (`172.36.0.0/24`); `state` and `write` only for nodes a node
manager runs.
