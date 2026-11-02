# Part 8: validation

**Scope.** The changed and new modules' unit tests; then the demos as a
person runs them (`demo.sh <work> <record> <phase>`, each phase a case;
`run.sh <work>` records them all, from nothing running): a machine lacking
things; the liveness project checked, started with one command, its
scenario run twice in a headless browser (`ui.cjs`: the map beside the
scenario, then Run again); the other project started while it runs;
liveness stopped, the other project started and its scenario run twice;
both torn down; the records.

**Findings** (record of 2026-11-02, `record/`; 18 cases, all exit 0):
- **Unit tests**, 7 modules: haicc-reconcile 4, haicc-deployment 1,
  p2p-node-manager 2, p2p-swarm-manager 1, splectral-server 2,
  -transport 1, -scenario 1. All pass.
- **Lacking**: Node.js 99, Bare 9.9.9 and a taken port each reported
  `different` with its hint; the folder needing Bare `blocked`; nothing
  made.
- **Check before anything**: the machine's needs met (OS, Docker, Node.js,
  Bare, both subnets, UDP to the host, the port); what deploying would make
  listed (host folder, vault, image, Splectral's configuration, Splectral,
  the swarm, node-1).
- **One command**: `sh haicc start base-demo-liveness`, 59 s from nothing
  (image included).
- **Run, and run again**, in the browser: liveness ok in 75 s, again ok in
  56 s ("run 2", every step done); other-host ok in 59 s, again ok in 30 s.
  Each second run after the project's reconcile (node-1, or host B's
  remote-1, back). Tabs: the map beside the scenario. No page error.
- **One project at a time**: starting the other while liveness ran was
  refused, both reasons given (the port, a swarm of that name running from
  elsewhere), the running swarm untouched.
- **Switching**: stop 3 s, the other started in 43 s.
- **Teardown**: nothing running, no vault, container or network left; what
  stays is the record (`deployment/`, `runs/`, the server's output), 298
  files, no secret in them.

**Products**: `products.md`.
