# Request: phase 3, step 2, the demos again (the phase's last)

Agreed with the human, 2026-11-07. Since step 1 the platform was rebuilt
(not under a request; recorded in `main:docs/` and `main:notes/`): one
recursive structure from the work folder down to a node (a folder, its
config, its own HAICC, a cold boot then a warm boot, each level validating
what it was given), self-contained packages carrying their tests and their
lifecycle (functionality by URI), Bare only, the runtime in the setup, the
documentation (`docs/`: design, rules, guides). The rebuild took the demos
out; this step brings them back on it, and ends the phase.

## The aim

**A demo runs again**: from a downloaded setup, the demo's package fetched
from haiccing and deployed through the root; its swarm made from the
package's configuration; the swarm's codebase assembled into the master's
repository; its nodes running it; the Splectral app in the browser, its
scenario played; the demo's tests passing on the platform. All on Bare,
from haiccing packages, no development repository.

## Parts, in order (each tested on the platform, checked locally, before the next)

1. **`p2p` and `mycelium` on Bare**: their modules on Bare's own modules,
   their tests on brittle; a swarm package with the p2p node as its
   codebase (`base-swarm-three-nodes`), written by the package writer.
2. **Deploying a package through the root**: fetched, checked intact; its
   swarm made from its configuration (`swarms/`, swarms from packages, no
   building by hand); its codebase assembled into the master's package
   repository; its nodes validated.
3. **Nodes running the codebase**: in containers, from the master's
   repository (read-only), `host.json`, the stripped runtime.
4. **`splectral` on Bare**: its server (`bare-http1`) and its components.
5. **The demos in the new structure**: `base-demo-liveness` (one host),
   then `base-demo-other-host`; their tests on the platform.

Out of scope, the next phase's: the work folder's `user/` and sources per
package (unless a demo needs them), trimming the package's size, the
pipeline's open questions (`main:docs/design/pipeline.md`), the p2p version,
pinning, Android.

## Validation

Each part: its tests on the platform, from a fresh release, Node.js off the
PATH; the local agent's check before the next part. The end: the local
agent and the human run a demo from a downloaded setup, as above.
