# cluster

The P2P cluster's own scripts and records, around the modules (a node is
`mycelium-node`).

- `base/`: the plain base image, `bare-base:<version>`: debian:bookworm-slim
  with Bare's own binary, nothing else (no Node, npm or git).
  `base/build.sh` builds it from the bare package installed on the host.
- `stage.sh <dir>`: what a node runs, staged as plain folders
  (mycelium-uri, mycelium-xpath, mycelium-git, mycelium-node), without
  development dependencies and with linux-x64 prebuilds only. For now
  mounted into the containers read-only; the package repository replaces
  it.
- `two-nodes.sh <bundle> <record> [path]...`: two Bare nodes in Docker
  containers on a bridge network: the seed serves the bundle's repository
  from its Hyperdrive and bootstraps a private DHT; the joiner finds it over
  Hyperswarm and selects each path on its replica. The record holds the
  unit (`unit.json`: invocation, dev commit, bundle hash, image, key, time)
  and both nodes' JSON lines, with the metrics.
- `pkg/build.sh <repo> <bundle>` (pkg/import, `pkg/import.js`): the
  package repository, built at the boundary with Node and native git.
  Every module and each folder of its installed node_modules becomes a
  package instance, a tree stored once under its oid (`instances/<oid>`);
  `index.json` maps name@version (our modules: name@id) to oids;
  `deployments/<module>.json` is a module's layout, its folders linked to
  instances. Bundled, it comes in to the seed node once.
- `bootstrap/`: the bootstrap repository (`build.sh <repo>`): boot.js,
  node.json (the modules a node materialises, and how it starts), boot.js's
  few dependencies, and the modules a node first runs, as plain folders. A
  node gets its checkout. `boot.js seed` takes the package repository in
  from its bundle and serves it; `boot.js join <key>` obtains the package
  repository from the cluster, materialises the node's modules into /app
  and starts the node from there.
- `boot-nodes.sh <bootstrap-repo> <packages-bundle> <record> [n]`: a seed
  and n joining nodes started from the plain base through the bootstrap
  repository, in containers.
- `deployment/`: the deployment repository. `seed.sh <repo>` seeds one
  (repo/seed) with requests (`requests/`: `Seed: seed`, `Join: node-1`,
  `Join: node-2`, `Status: nodes`), and capability/default holding a link
  to the code that executes it (`link.json`: dev commit and path).
  `execute.js <repo> --bootstrap=<repo> --packages=<bundle> --run=<dir>`
  executes the pending requests with layer/request's flow: each response
  on main records the node (`node.json`, `log.jsonl`) or the cluster's
  state (`status.json`, a table), with its unit. More requests come in
  with request intake (`test-run/request.sh`), e.g.
  `requests-later/status-later`. The nodes keep running after execution;
  stop them with `docker rm -f seed node-1 node-2`.
- `runs/`: the records, kept as data: `two-nodes-*` and `boot-nodes`
  (unit.json and every node's JSON lines), `deployment.bundle` (the
  deployment repository after its requests, 10 KB).

Run from the dev repository's root with the Docker daemon up (`dockerd &`
in a cloud session; see `notes/env.md`).
