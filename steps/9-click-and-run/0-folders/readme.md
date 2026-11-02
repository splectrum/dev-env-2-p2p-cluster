# Part 0: the folders as `<org>/<repo>`

**Scope.** Every module at the path of its product repository, so a
project and its component can share a name across organisations
(`haiccing/base-demo-liveness` and `splectral/base-demo-liveness`).

**Done** (`d20b1be`):
- `pear-full-square/`: the engines, 27 folders (`mycelium-*`, `p2p-*`,
  `splectral-*`); `splectral/`: `base-view-map`, `base-demo-liveness`,
  `base-demo-other-host`. `haiccing/` comes with the projects.
- The paths naming folders: the root workspaces, `.gitignore`, the node
  image (its archive now `pear-full-square/` and the lockfile; its command
  `/app/pear-full-square/p2p-node/cli.js`), the node's code paths in
  `boot.js`. The modules stay siblings, so no import changed.
- Left as they are: recorded steps and the phase-1 `test-run/`
  machinery (they rerun at their commits); `cluster/`, `test-runs/`
  (records); `notes/`, `steps/`.
- The documents: `rules.md` (a package's folder is `<org>/<repo>`), the
  handover's commands, `steps/readme.md`.

**Findings:**
- All 25 modules with tests pass in the new layout (mycelium-git 82,
  p2p-mrepo 24, mycelium-uri 15, ...; 0 fail).
- A swarm end to end from the new paths: genesis, node-1 joining and
  running the master's code by replication (which now carries the new
  layout), status (both present), stop; no container left.
- **Product splits after a move.** `git subtree split --onto=<previous
  split head>` did not continue the product's history: the split of the
  new path starts without a parent, its tree identical to the product's.
  Splits are deterministic, so the fallback is simple: at each product's
  next merge, one join (`--allow-unrelated-histories`, no file changed),
  and plain merges after it, as each product's first merge was.
