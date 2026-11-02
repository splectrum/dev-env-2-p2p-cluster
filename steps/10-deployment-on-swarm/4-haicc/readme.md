# Part 4: HAICC on the deployment on the swarm

**Done.** The swarm manager's providers `swarm-deployment` (observed
through its shadow, set by request: the swarm its authority) and
`swarm-watcher` (auto mode, a process on top). The demo projects declare
the swarm's part (node-1), handed over at genesis; the watcher brings
node-1 up, and back when a scenario stops it (the swarm still wants it).
`sh haicc start` 30 s; the liveness scenario twice, ok.
