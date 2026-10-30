# Request: second development phase

From: `splectrum/roadmap-1`, 2026-10-30. Rewritten from the first phase's
draft (`splectrum/dev-env-1-mycelium-git@33634de:notes/next-phase-request.md`)
after its evaluation.

## First: plant this seed

This seed was prepared in `splectrum/roadmap-1` under
`seeds/dev-env-2-p2p-cluster/`. Plant it by hand; this is the bootstrap.

1. Put `README.md`, `CLAUDE.md`, `rules.md` and `vision.md` on `main`.
2. Create `pending/default` as an orphan branch holding this request in
   `pending/` (as `pending/phase-2/request.md`).
3. Create `execute/main` from `main`.

Then set up the development state, through `execute/main`:

- The five modules as folders on `main`, from
  `splectrum/dev-env-1-mycelium-git@33634de`: `mycelium-uri`,
  `mycelium-xpath`, `mycelium-git`, `mycelium-layer`, `mycelium-repo`,
  and the test-run machinery (`test-run/`). Phase 1's kept runs stay
  there, as its data; they are not carried over.
- `mycelium-git`'s p2p-git dependency moved to the fixed commit
  `bare-for-pear/p2p-git@d7d154d` (its `package-lock.json` still pins the
  old one), and its `hyperdriveFs` workaround dropped: p2p-git's own
  adapter passes the contract suite.

## The phase

**Second development phase:** the creation of a P2P cluster, starting with
p2p-git on Hyperdrive. Hypercore is the foundation from the start, not a
later step: replication carries the data between nodes, and links over
copies follow from it.

1. **p2p-git on Hyperdrive as a node's store.** mycelium-git's contract
   suite and the test-run model on a persisted, Corestore-backed Hyperdrive,
   under Bare. p2p-git is fixed in itself: folders reported as folders
   (`Stats(null)` reports not-a-folder), `readlink` and `symlink` added
   (`mycelium-git`'s `hyperdriveFs` works around both now), and the delta
   offsets its pack parser decodes wrongly. Hyperbee for refs is evaluated,
   not assumed.
2. **Two nodes replicating.** Docker is how container-based P2P clusters
   are created. Two Bare nodes in containers; discovery over
   Hyperswarm; a repository replicated from one to the other. Probe the
   environment first: `env/docker` (the daemon, starting it, limits in a
   cloud session) and `env/udp` (needed for Hyperswarm). Run Bare in a
   plain container before anything depends on it.
3. **The package repository on Hyperdrive.** Each package instance stored
   once; a deployment holds links (a core key and a commit), and a node
   loads only what it reads. Our modules arrive by hand for now;
   third-party packages are brought in once, at the boundary.
4. **The seed node.** A node starts from a plain base with the runtime
   (Bare) only. A self-contained bootstrap repository sets it up: obtain
   the package repository, materialise what the node needs, start the node.
   The very first repository comes in from the outside world once; a later
   node needs only the bootstrap repository and the seed node's key.
5. **The deployment repository.** What the cluster is: its nodes, their
   state and a minimum of monitoring, kept and reached through requests
   like everything else. Every step is a request whose execution is
   recorded and can be rerun.

Capabilities, as in `capabilities.md`: `state/hyperdrive`; `env/docker`,
`env/udp`; `p2p/discover`, `p2p/replicate`; `pkg/store`, `pkg/import`,
`pkg/materialise`; `cluster/bootstrap`, `cluster/seed`, `cluster/join`,
`cluster/deployment`. First observations on `p2p/boundary`.

## Done

The phase is done when:

1. mycelium-git's contract suite and the test-run model pass on a
   persisted Hyperdrive under Bare, through p2p-git's own adapter, without
   the workaround.
2. Two Bare nodes in Docker containers find each other over Hyperswarm and
   replicate a repository.
3. A node starts from a plain Bare base through a bootstrap repository,
   and takes what it needs from the package repository, loaded lazily.
4. A deployment repository brings up a seed node and at least one joining
   node, and records them.
5. Every step is recorded and can be rerun, with metrics at the
   boundary, and kept as small runs.

## Modules

- All modules come in as folders on `main`: the base modules
  `mycelium-uri`, `mycelium-xpath` and `mycelium-git` (development goes
  on here), `mycelium-layer` and `mycelium-repo` with no repositories of
  their own.
- The test-run machinery comes along; its practice stays: expectations in
  the requests, reports as requests, kept runs as data on `main`, machinery
  pinned by id and validated before the pin moves.
- **Keep the product repositories updated from here.** A session can
  attach other repositories and push to them, so a module's product
  repository follows its folder: once a change is validated (a test run,
  a new id), the session splits the folder's history (`git subtree split`)
  and merges it into the product repository's `main` with a plain merge,
  never a force-push. The commit message names the dev repository's
  commit; the dev repository records the product commit. Product
  repositories:

  | Folder | Product repository |
  |---|---|
  | `mycelium-uri` | `pear-full-square/mycelium-uri` |
  | `mycelium-xpath` | `pear-full-square/mycelium-xpath` |
  | `mycelium-git` | `pear-full-square/mycelium-git` |
  | (a dependency) | `bare-for-pear/p2p-git`: fixes made in it directly |

  `pear-full-square` holds our application modules, `bare-for-pear` Bare
  versions of third-party or general-purpose modules. A new module's
  repository is created by the human.

## Practice

- Execution can be repeated exactly, so metrics and audit only at the
  boundary: object counts, sizes, times and replication volume, per step.
  The Hypercore decisions (per-package cores or groups, batching) need the
  numbers.
- One thin path end to end before generalising: one node on Hyperdrive,
  then two replicating, then the seed node and a joining node.
- Operators (single-concern repositories) arise naturally where a
  multistep process needs them; they are not a requirement.
- Kept runs get small: we work towards a single code repository, the
  package repository, with each run repository holding links to it and
  still self-contained, since the cluster resolves the links.

## Not in this phase

AVRO and Kafka (a p2p-Kafka probe only as a stretch), the full evaluation
of the P2P boundary, devices and phones, private data. Directions:
`vision.md`, carried in the seed for information.

## Background

- `splectrum/dev-env-1-mycelium-git@33634de`: `notes/status.md` (the
  outcome and the boundary question), `notes/api.md`, `notes/vision.md`,
  `rules.md`, the modules' READMEs, `test-runs/README.md`.
- In `splectrum/roadmap-1`: `principles.md`, `roadmap.md`, `vision.md`,
  `capabilities.md`, `capabilities/reuse.md`.
