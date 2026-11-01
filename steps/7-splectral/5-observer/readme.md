# Part 5: the observer

**Scope.** `notes/splectral.md`, the observer: a privileged application
on the node, granted by its manager, answering only that manager; named
actions; never a secret.

**Done.**
- **`splectral-p2p-observer`** (folder on `main`; repository
  `pear-full-square/splectral-p2p-observer`): `attachObserver({ node,
  input, log })`. Named actions, declared in the module: `state` (the
  node's status and metrics) and `write` (a note committed on the node's
  repository's `main`, activity that replicas see). Anything else is
  refused.
- **The path of an action:** a record in the node's action topic
  (`topics/actions` in the node's folder) → its manager, following that
  topic from its committed offset (`topics/actions-offsets`) → the
  management channel → the boot program in the container → the node's
  process, on its stdin after the secret → the observer → its result on
  the node's log → the node's topic, with the action's offset in a
  `correlation` header.
- **Granted by the manager**: `--observer=true` on the node manager; the
  swarm manager grants it to every node it starts (this development
  environment's choice). Without it, the node's stdin closes after the
  secret, as before.
- The image includes the `splectral-*` folders; the root workspace
  includes `splectral-p2p-observer`.

**Findings** (record of 2026-11-01, `record/`, `live.sh`; 8 cases, all
exit 0):
- Unit tests: splectral-p2p-observer 1 (on a node in process: state,
  write, an unknown action refused, no secret in what it says),
  p2p-node-manager 2.
- Live, on the master and node-1: three actions each (`state`, `write`,
  `format-disk`), all passed by their managers (`action-passed` 0, 1, 2);
  results correlated 0, 1, 2: state with the node's URI, write on its
  `node` repository, the unknown action refused.
- No container or network left; no secret in any topic.
