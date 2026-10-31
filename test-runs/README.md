# Kept runs

Kept as data. Each bundle is the full, self-contained record of a test-run
instance repository (see `test-run/README.md`). From step 1 on, a step's
kept runs sit in its record (`steps/<step>/<part>/record/`); they are
listed here too. Phase 1's runs stay in
`splectrum/dev-env-1-mycelium-git`, as its data.

| Bundle | What it records |
|---|---|
| `2026-10-30-r1.bundle` | Every module, mycelium-git on every engine and runtime, now with p2p-git on a persisted Hyperdrive on Node and Bare (p2p-git `d7d154d`, its own adapter): 627 of 627 met |
| `../steps/1-mycelium/validation/record/2026-10-31-r2.bundle` | Step 1: mycelium-git back to its backend contract (no Hyperdrive engine), p2p-git from `pear-full-square`; every module, every engine, Node and Bare: 507 of 507 met |
| `../steps/3-repositories/validation/record/2026-10-31-r3.bundle` | Step 3, the reference: pinned machinery `46ba2e65`, native instance, with p2p-mrepo's command sets (Node and Bare): 627 of 627 met |
| `../steps/3-repositories/validation/record/2026-10-31-r4.bundle` | The machinery in development, native instance: identical to r3 |
| `../steps/3-repositories/validation/record/2026-10-31-r5.bundle` | The machinery in development, **an instance on Hypercore, executed under Bare**: identical to r4 |
| `../steps/3-repositories/pin/record/2026-10-31-r6.bundle` | Machinery pinned at `dba3214e`, on Hypercore under Bare: 627 of 627 met, identical to r5 |
