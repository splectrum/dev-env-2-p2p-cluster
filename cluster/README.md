# cluster

The records of the first build (2026-10-30), kept as data: what it
proved is in `notes/status.md`. Its code (`mycelium-node/` and the scripts
that were here) was superseded by the plan (`notes/plan.md`) and removed
in step 1 (`steps/1-mycelium/`); it is in this repository's history, at
`eee62cc` and `fa009fd`.

- `runs/2026-10-30-two-nodes-fixture`, `runs/2026-10-30-two-nodes-dev-main`:
  two Bare nodes in containers replicating a repository over Hyperswarm.
- `runs/2026-10-30-boot-nodes`: a seed and two joining nodes started
  through a bootstrap repository, materialising their modules.
- `runs/2026-10-30-deployment.bundle`: a request-driven deployment
  repository after its requests.
