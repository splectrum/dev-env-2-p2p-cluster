# Part: validation

**Scope.** Every module's unit tests (`npm test`, Node) and a full test
run: an instance seeded from the committed dev state with every module's
command sets (mycelium-git on native git, isomorphic-git and p2p-git, each
on Node and on Bare; the other modules on Node), with the pinned machinery
(`test-run/machinery`), kicked, reported and kept.

**Expectation.** Every unit test passes; in the test run every invocation
is met. Against r1 (`test-runs/2026-10-30-r1.bundle`, 627 invocations), the
two Hyperdrive command sets (60 invocations each) are gone: 507 expected.

**Method.** `steps/record.sh 1-mycelium validation ...`, with the cases
`unit-tests.sh <module>` per module and `test-run.sh <instance> <bundle>`.

**Record**: `record/` (the kept run: `record/2026-10-31-r2.bundle`).

**Findings** (record of 2026-10-31, dev `5cbe6da`; 6 cases, all exit 0):

- **Unit tests:** mycelium-uri 12, mycelium-xpath 4, mycelium-git 78 (its
  contract suite on every engine and on a Hyperdrive through p2p-git's
  own adapter), mycelium-layer 8, mycelium-repo 3: all pass.
- **Test run r2:** 10 requests, 507 invocations, **507 met**, none not
  met, none incomplete: as expected (r1's 627 less the two Hyperdrive
  command sets).
- **The kept run is 5.0 MB** (r1: 13 MB): Corestore, Hyperdrive and
  rocksdb-native are no longer deployed into the instance.
- Seeding refused at first: the step's record, written during the run,
  made the dev tree dirty. `test-run/seed.sh` and `deploy.sh` now leave
  step records (`steps/*/*/record/*`) out of their check.
