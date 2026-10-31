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

**Findings**: below, once recorded.
