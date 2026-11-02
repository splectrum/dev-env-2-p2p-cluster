# Part 2: haicc-deployment

**Done.** `pear-full-square/haicc-deployment`: a project file
(configuration and running layer, providers, strict), the verbs deploy,
start, stop, teardown as records in the deployment's lifecycle topic, the
desired state their fold; `reconcile` (back to the desired state; a
Splectral reconciling its own project leaves itself) and `status` (for a
project never deployed: what deploying would need); a command and a
readable summary (`human.js`).

**Findings.** 1 unit test (the lifecycle on folders: deploy, start, stop
keeping the configuration, a drift reconciled, teardown, the fold
reopened). On a swarm: deploy 59 s (the image built), start 48 s, stop
2 s, start again 33 s, status 1 s, reconcile 17 s (node-1 stopped by hand
started again; node-2 joined by hand stopped, strict on our swarm),
teardown with nothing left. The engine's `remove` learned `only` (stop
what runs, keep its configuration).
