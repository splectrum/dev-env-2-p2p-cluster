# dev-env-2-p2p-cluster

The development environment for the second development phase of
SPLectrum: the creation of a P2P cluster, starting with p2p-git on
Hyperdrive. Its modules are folders on `main`:

- `mycelium-uri`, `mycelium-xpath`, `mycelium-git`: the base, each kept
  updated in its product repository in `pear-full-square`
- `mycelium-layer`, `mycelium-repo`: layer and repository capabilities,
  with no repositories of their own
- `mycelium-node`: a cluster node, its store on Hyperswarm, and
  materialising from the package repository (no product repository yet)
- `test-run/`: the test-run machinery; `test-runs/`: kept runs
- `cluster/`: the cluster's base image, package repository, bootstrap and
  deployment repository, and their records (`cluster/runs/`)
- `notes/`: the phase's status and the environment probes

`vision.md` holds directions that are not settled, for information.

Status: phase steps 1 to 5 done on a thin path (2026-10-30); see
`notes/status.md`. Seeded from `splectrum/roadmap-1`.
