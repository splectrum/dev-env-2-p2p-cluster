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
- `runs/`: the records, kept as data.

Run from the dev repository's root with the Docker daemon up (`dockerd &`
in a cloud session; see `notes/env.md`).
