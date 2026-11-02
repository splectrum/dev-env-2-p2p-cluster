# Request: step 9, click and run

From the human's local run of Splectral (`main:steps/7-splectral/local-machine-run.md`)
and the discussion after it. The design: `main:notes/haicc-reconcile.md`
(the engine, cold configuration, `haicc-deployment` and the lifecycle,
authority), `main:notes/splectral.md` (running Splectral, demos as
projects), `main:notes/node-pattern.md` (authority), `main:vision.md` (the
organisations, HAICC, Pear later). Amended twice on 2026-11-02, as the
discussion settled: configuration apart from running, the server through
topics, no launcher; then demos as projects deployed by HAICC, replacing
Splectral setups.

The aim: a demo is a project brought up with one command, then clicks,
and run again any number of times.

## Parts, in order

1. **`haicc-reconcile`**: the engine (requirements named and selected;
   check, plan, apply; non-strict by default, strict per scope; only what
   it owns; records in a topic), a command and a library. Cold
   configuration is its concern: configuration state (repository state)
   apart from anything running on top. Its generic providers, checked
   only: the OS and native Docker, Node and Bare's runtime version, the
   subnets, the ports, UDP to the bridges; and folders, which it creates.
2. **`haicc-deployment`**: a deployment as an object (the declared
   configuration, the desired lifecycle state); the verbs deploy, start,
   stop, teardown and status as records in its topic, its state their
   fold; `haicc-reconcile` converging the world to it. A command. The
   deployment kept on the host in this step (topics in the project's
   folder).
3. **The p2p providers**, each in the module that knows its kind: the
   node image (`p2p-node-manager`); swarms and nodes, named and selected
   (`p2p-swarm-manager`). The managers stay the authority for the
   substrate.
4. **The fixes from the local run**: `state.json` written by temporary
   file and rename (step 6's script reads it); the test reporter made
   explicit (Node 24 printed null counts); Bare's version checked (part
   1).
5. **Splectral as part of a project.**
   - Its requirements declared: its configuration (the instance's
     folder) made true cold, its server running on top.
   - The server spoken to through topics: each client produces actions
     into an action topic of its own (a correlation id in a header); the
     server follows them from committed offsets and produces results into
     its results topic. HTTP only at the browser's boundary, as its
     adapter onto the same topics.
   - It knows the project it was started for: Run again reconciles the
     project's cluster, then plays.
   - Tabs in the shell: pages side by side (a demo, the map).
6. **The demo projects** (`haiccing`): `demo-liveness` and
   `demo-other-host`, each a test cluster, a Splectral install with its
   components, and its scenario. The scenarios (`splectral`) name no
   setup.
7. **One document** for running the demos, replacing the steps'
   `local-machine.md` (the step folders keep their records).
8. **Validation and products.** Unit tests; from a machine with nothing
   running: each demo project deployed and started with one command, its
   scenario run from the browser twice, stopped, the other project
   deployed, torn down; what the check says on a machine that lacks
   something; recorded, with headless browser tests; the product
   repositories merged.

Not in this step: the deployment on the swarm (the next step: the swarm's
part as a repository on the master, the managers' substrate apart, auto
mode); Pear (later, with fixed versions); several projects at once.

## Done

All parts done, recorded in `main:steps/9-click-and-run/`.
