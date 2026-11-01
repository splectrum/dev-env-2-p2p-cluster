# Part 10: validation

**Scope.** The changed and new modules' unit tests; then the step 6
scenario as a Splectral demo (`demo.sh <work> <record> <phase>`, each
phase a case; `run.sh <work>` records them all): host A's swarm (genesis,
node-1); Splectral configured on both hosts' folders and serving; a
headless browser (`ui.cjs`, Playwright and Chromium) watching the run as
a person would, the scenario started from its page; Splectral and the
swarm stopped; the same topics replayed into a fresh Splectral, watched
again; the records (both hosts' topics apart, the runs, the screens),
checked for secrets, for anything left running and for p2p names in the
applications.

**Findings** (record of 2026-11-01, `record/`; 24 cases, all exit 0):
- **Unit tests**, 14 modules: mycelium-uri 15, mycelium-topic 8, p2p-rns
  3, p2p-mrepo 24, p2p-node 2, p2p-node-manager 2, p2p-swarm-manager 1,
  splectral-contract 2, -model 1, -transport 1, -server 1, -scenario 1,
  -p2p-observer 1, -p2p-watchers 1. All pass.
- **Live, in the browser** (`screens/live-*.png`, `screens/live.json`):
  - the menu built from what is there: the scenario, the timeline, the
    map, a page per node (master, node-1; remote-1 when it came);
  - the map before: master and node-1, running, controlled by host A;
  - the scenario run from its page: host B's node joined, shown on host
    B's frame and **not controlled** by host A; its repository changed
    after the write; it went grey when stopped; master and node-1 running
    on;
  - all 8 steps done, outcome ok, the 10 messages in order;
  - the timeline holding every kind of event of the abstract world met:
    nodeStarting, joined, gone, resource, connected, disconnected,
    requestSent, requestAnswered, actionResult, changed, say,
    scenarioStep; remote-1's page: gone, 15 events;
  - at phone width (390 px) no sideways scroll; no page error.
  - The whole live demo, from Run to done: 22 s.
- **Every action through the paths designed**: invite (host A's swarm
  manager), start-node-from-invitation (host B's own node manager and
  vault), send-request twice (a peer of the swarm), write (the observer,
  through remote-1's action topic and management channel), stop-node
  (host B's manager).
- **Replayed** (`screens/replay-*.png`): 295 records from 8 topics played
  back in 2.3 s; the scenario's messages identical to the live run's. The
  map at the end shows all three nodes gone, with who controlled them as
  live: the topics end later than the live browser test did (the swarm
  was stopped after it), so the check comparing the two final maps
  (`sameMapAsLive: false`) compared different moments. The check is
  wrong, not the replay: comparing the replay at the moment the live test
  ended needs a replay to a time (`to`), carried forward.
- **No secret in the records** (every key of both vaults searched for,
  322 files); no container or network left; **no file of the applications
  names p2p**.
