# Request: step 9, click and run

From the human's local run of Splectral (`main:steps/7-splectral/local-machine-run.md`)
and the discussion after it. The design: `main:notes/haicc-reconcile.md`,
`main:notes/splectral.md` (setups), `main:vision.md` (HAICC, Pear later).

The aim: running Splectral and its demos is one command, then clicks.
Every demo can be run again, any number of times.

## Parts, in order

1. **`haicc-reconcile`**: the engine (requirements named and selected;
   check, plan, apply; non-strict by default, strict per scope; only what
   it owns; records in a topic), as a command and a library. Its generic
   providers, checked only: the OS and native Docker, Node and Bare's
   runtime version, the subnets, the ports, UDP to the bridges; and
   folders, which it creates.
2. **The p2p providers**, each in the module that knows its kind: the
   node image (`p2p-node-manager`); swarms and nodes, named and
   selected (`p2p-swarm-manager`).
3. **The fixes from the local run**: `state.json` written by temporary
   file and rename (step 6's script reads it); the test reporter made
   explicit (Node 24 printed null counts); Bare's version checked
   (part 1's provider).
4. **Setups in Splectral**: the extension kind `setup` (contract 0.3); a
   scenario names its setup, made true on Run through the p2p adapter
   (reuse, add, stop what is extra on the setup's own hosts, or start
   over; `fresh` where needed); Splectral changes only what it created;
   one active setup; the menu grouped by setup, with its readiness.
   Setups name their swarm.
5. **The applications**: `base-setup-one-host`, `base-setup-two-hosts`;
   `base-demo-other-host` and `base-demo-liveness` naming theirs; both in
   one configuration.
6. **Tabs in the shell**: pages opened side by side (a demo, the map).
7. **The `splectral` command**: `check`, `up` (requirements made true,
   Splectral served, the browser opened), `down`, `replay`, `clean`; a
   default work folder. One document for running Splectral, replacing the
   steps' `local-machine.md` (the step folders keep their records).
8. **Validation and products.** Unit tests; from a machine with nothing
   running: `splectral check`, `up`, both demos run from the browser one
   after the other and one of them twice, `down`, `clean`, recorded, with
   headless browser tests; what `check` says on a machine that lacks
   something; the product repositories merged.

Not in this step: Pear (later, with fixed versions); several setups at
once; requirements beyond named and selected nodes.

## Done

All parts done, recorded in `main:steps/9-click-and-run/`.
