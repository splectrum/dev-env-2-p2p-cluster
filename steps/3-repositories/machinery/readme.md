# Part: the test-run machinery on Hypercore, under Bare

**Scope.** Test-run instances on the p2p layer as well as native:

- `test-run/instance.js` (machinery): opens an instance: a native repository,
  or an instance folder holding a p2p-store (`store/`) whose repository
  `repo` is the instance.
- `execute.js`: opens the instance through it; runs the runner on its own
  runtime; makes the report in its own process (a p2p instance's store is
  open in one process at a time), with `report.js` now a library as well
  as a command; records the runtime and the instance's kind.
- `report.js`: compares JSON values itself (Bare's `util` has no
  `isDeepStrictEqual`).
- `runner.js`: imports `process`, and takes command output as text (Bare's
  `spawnSync` gives bytes whatever encoding is asked).
- The kick (`hook.sh`): a native instance's tree extracted with git, a p2p
  instance's with the p2p layer, both from the environment (p2p-mrepo as
  installed where the instance runs: `MREPO_TOOLS`, or the instance's
  `hooks/tools`); a p2p instance's machinery runs on Bare.
- The dev scripts: `seed.sh` (`ENGINE=hyperdrive` for a p2p instance),
  `deploy.sh` (the p2p series and its dependency tree staged, development
  dependencies pruned; `instance.js` carried), `request.sh`, `keep.sh` (a
  p2p instance kept as a bundle of every branch, checked by git).

Unchanged on purpose: the request line recorded with its line end (as
before, under Node too), so records stay comparable with earlier runs.
