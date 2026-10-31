# Step 3. Repositories on the p2p layer

Status: **in progress**. Request: `pending/phase-2/step-3-repositories/request.md`
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
