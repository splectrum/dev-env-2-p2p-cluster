# Part 7: validation

**Scope.** The changed modules' unit tests; a swarm whose deployment is
handed over at genesis, followed in manual then auto mode, changed by
request, refused a bad change; nodes shadowing their managers; then the
demo projects on the deployment on the swarm (`demo.sh` phases, `run.sh`).

**Findings** (record of 2026-11-02, `record/`; 20 cases, all exit 0):
- **Unit tests**: p2p-node 4, p2p-node-manager 2, p2p-swarm-manager 1,
  haicc-reconcile 4, splectral-p2p-observer 1.
- **Handover at genesis**: the swarm's deployment (`deployment.json` on
  the master's `deployment` repository) wants node-1; only the master runs.
- **Manual mode**: the deployment shadowed, `deployment-pending` with
  `node-1:create`; nothing started.
- **Auto mode**: node-1 brought up.
- **A change by request** (two workers by selection, node-1 not wanted):
  one apply, `worker-nodes:create` and `hosts-node-1:remove`; master,
  worker-1, worker-2 running, node-1 stopped; 47 s.
- **Refused at the boundary**: a deployment with the master in it ("the
  master is not deployed: it holds the deployment"); the swarm's
  deployment unchanged.
- **Shadows**: master, worker-1 and worker-2 each hold their manager's
  state (`running`).
- **The demos on it**: liveness ok in 77 s, again in 41 s; other-host ok
  in 63 s, again in 26 s; the watcher brings node-1 back when a scenario
  stops it (the swarm still wants it).
- **Records**: 287 files, no secret; nothing left running.

**Products**: `products.md`.
