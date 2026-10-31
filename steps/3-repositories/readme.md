# Step 3. Repositories on the p2p layer

Status: **done** (2026-10-31), except p2p-mrepo's product repository, which waits for its repository to be created. Request: `pending/phase-2/step-3-repositories/request.md`
on `pending/default`. Scope: `notes/plan.md`, step 3.

| Part | What | Record |
|---|---|---|
| `p2p-mrepo/` | the module: mycelium repositories on a p2p-store | unit tests in `validation/record/` |
| `engine/` | mycelium-git's CLI takes an engine given as a module; a new id | unit tests in `validation/record/` |
| `command-sets/` | p2p-mrepo's command sets, Node and Bare, from mycelium-git's | in every test run |
| `machinery/` | test-run instances native or on the p2p layer, executed under Bare | `validation/record/` |
| `validation/` | unit tests; runs r3 (reference), r4 (machinery in development, native), r5 (the same, on Hypercore under Bare), compared | `validation/record/` |
| `pin/` | the machinery's new id, pinned; run r6 with it on Hypercore | `pin/record/` |
| `product/` | the product repositories | `product/readme.md`, `notes/products.md` |

## Outcome

Mycelium repositories live on Hypercore, provided by the p2p layer:
`p2p-mrepo` creates, imports, clones, reopens and replicates them on a
p2p-store, each a mycelium backend, and mycelium-git's contract suite and
command sets pass on them, on Node and on Bare. **Test-run instances live
on Hypercore and their machinery runs under Bare**: r5 (machinery in
development) and r6 (pinned at `dba3214e`) met 627 of 627, identical to
the native runs r3 and r4. This completes the request's first done item:
the contract suite and the test-run model on a persisted Hyperdrive under
Bare, through p2p-git's own adapter, without the workaround.

Found on the way and fixed: a tree's entries came in plain name order on
the isomorphic-git-style engines, git's order on native git (mycelium-git,
with a contract test); a repository open in a store must not be opened
twice (p2p-mrepo); Bare's `spawnSync` gives bytes, its `util` has no
`isDeepStrictEqual`, it has no global `process` (the machinery); a lazy
test measured the wrong thing (p2p-mrepo).
