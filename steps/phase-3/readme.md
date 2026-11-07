# Phase 3: report

Begun 2026-11-05, closed 2026-11-08. Three steps; their records in this
folder:

| Step | Folder | Status |
|---|---|---|
| 1. Packages and the boot | `1-packages-and-boot/` | done (the ninth release and earlier) |
| (between) The package structure rebuilt: HAICC, Bare, a node validated by itself | `2-package-structure/` | done, not under a request (recorded in `docs/`) |
| 2. The demos again | `3-demos-again/` | done (the tenth release) |

## What the phase achieved

**The ability to create swarms and deploy packages, on one recursive,
consistent structure.** From one downloaded file (`haicc-setup.sh`, 39 MB,
Bare's runtime in it, no Node.js anywhere):

1. `./boot`: the work folder set up; the platform's two packages (HAICC,
   the package manager) refreshed from the sources and deployed.
2. `./haicc boot <package>`: the package fetched from haiccing, checked
   intact; its swarm made from its configuration; its codebase assembled
   into the master's `packages/`; each node built (cold), validated by
   itself and started in its container (warm), running the swarm's code;
   a Splectral server on the host where the package names one.
3. Every level the same: a folder, its config, its own HAICC, a cold boot
   that copies in and a warm boot that runs and checks; `boot`,
   `shutdown`, `teardown` work on the config of the folder they are called
   from; everything printed goes to the level's log.

Packages are self-contained and carry their own tests (functionality by
URI: `./haicc boot <package>/test`), so a failure stays inside the package
that has it: it fails to deploy and says why; nothing else changes.

On it, both demos run again: a node going quiet (liveness), and a node
joining from another host by invitation. Every package's sets pass from
the published release on the local machine, as here.

## How it went

- The structure was redesigned with the human in this phase, and rebuilt
  step by step, each step tested on the platform from a fresh release
  before the next; the design, rules and guides written up in `docs/`.
- Ten releases; each local run found what this sandbox did not (the
  LICENSE in the hash, WSL2's clock, Docker 28's subnets): the local check
  is the real test, and stays one.
- Where the implementer decided structure alone, the human corrected it
  (the repository's place, strict as the default, a swarm's log): the
  rules for autonomy are being written with the human.

## What comes next

Proposed by the human, recorded in `notes/plan.md` ("Proposed next phase:
applications on mycelium repositories"), to be designed step by step:
mycelium repositories as the context applications run in. A repository's
visible state composed of its own layers and read-only mounts of other
repositories' data structures; a change, synced, triggering internal
processing requests, executed in the node's container. Self-contained, as
everything else. With it: work on functionality and data, within a set of
simple rules, with high autonomy.
