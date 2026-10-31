# dev-env-2-p2p-cluster

The development environment for the second development phase of
SPLectrum: the creation of a P2P cluster, starting with p2p-git on
Hyperdrive. Its modules are folders on `main`:

- `mycelium-uri`, `mycelium-xpath`, `mycelium-git`: the base, each kept
  updated in its product repository in `pear-full-square`
- `mycelium-layer`, `mycelium-repo`: layer and repository capabilities,
  with no repositories of their own
- `test-run/`: the test-run machinery; `test-runs/`: kept runs
- `steps/`: the phase's steps after `notes/plan.md`, each with its records
- `cluster/`: the first build's records
- `notes/`: the phase's status and the environment probes

`vision.md` holds directions that are not settled, for information.

Status: design settled, implementation starting along it (2026-10-31); see
`notes/status.md` and `notes/plan.md`. Seeded from `splectrum/roadmap-1`.
