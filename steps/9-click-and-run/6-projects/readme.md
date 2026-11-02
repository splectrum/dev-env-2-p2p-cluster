# Part 6: the demo projects

**Done.** `haiccing/base-demo-liveness` and `haiccing/base-demo-other-host`
(`project.json`, a readme): the machine's needs, host folders and vaults,
the image, Splectral's configuration (its components, the project it is
for); running: Splectral, the swarm, node-1. Strict. `sh haicc
check|start|stop|teardown|status|reconcile <project>` at the root (the
browser opened where it can).

**Findings.** One command: `start` 59 s from nothing. Both scenarios run
twice (liveness 70 s and 60 s; other-host 60 s and 28 s), the second
after the project's reconcile (node-1 or remote-1 back). The other-host
demo, once per swarm in step 7, now runs again: host B's node leaves when
stopped, so its name is free.
