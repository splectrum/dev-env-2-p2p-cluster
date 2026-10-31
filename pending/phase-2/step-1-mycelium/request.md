# Request: step 1, mycelium back to its own concern

From the plan (`main:notes/plan.md`, step 1). Mycelium knows nothing of
p2p; storage on Hypercore belongs below it.

## Parts

1. **mycelium-git.** Back to its backend contract over a given filesystem:
   `openHyperdrive` (`lib/hyperdrive.js`), the CLI's Hyperdrive engine and
   its `import`, the Hyperdrive command sets and their fixture go;
   Corestore and Hyperdrive return to development dependencies, used by
   the contract suite's run on a drive (through p2p-git's own adapter)
   only. Its engine adapters stay, p2p-git's included. Its p2p-git
   dependency names `pear-full-square/p2p-git` at `d7d154d`. A new id.
2. **The first build's code goes.** `mycelium-node/` and the scripts in
   `cluster/` depend on what goes and are superseded by the plan; they are
   removed. Their records (`cluster/runs/`) stay.
3. **Validation.** Every module's unit tests; a full test run, every
   module, every engine (native git, isomorphic-git, p2p-git) on Node and
   on Bare. Expected: every invocation met; the run kept.
4. **The product repository.** `pear-full-square/mycelium-git` updated
   from the folder (subtree split, plain merge), recorded in
   `main:notes/products.md`.

## Done

All four parts done, recorded in `main:steps/1-mycelium/`.
