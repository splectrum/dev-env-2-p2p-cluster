# Request: step 3, repositories on the p2p layer

From the plan (`main:notes/plan.md`, step 3). Mycelium repositories living
on Hypercore, provided by the p2p layer; mycelium knows nothing of p2p.

## Parts

1. **A module for repositories on the p2p layer** (proposed name
   `p2p-mrepo`, its repository to be created): on a `p2p-store`, create a
   repository (its own drive, an internal id recorded inside it), import
   one from the boundary (a bundle or a native repository), clone one (a
   new key, its origin recorded), open its own again, open another's by
   key (a replica, read only), list what it holds; each as a mycelium
   backend (p2p-git on the drive). Instrumented like the series.
2. **mycelium-git takes an engine given as a module**, so its CLI and
   command sets run on any engine without mycelium knowing which. A new
   id.
3. **Command sets on Hypercore**: the module's own command sets, on Node
   and on Bare, generated from mycelium-git's (the same invocations and
   expectations).
4. **Test-run instances on Hypercore, executed under Bare.** The machinery
   (seed, deploy, kick, execute, report, request, keep) works on an
   instance that is a repository on the p2p layer as well as on a native
   one. Validated as the machinery's practice requires: a reference run
   with the pinned machinery; the machinery in development on a native
   instance, identical; the same on a Hypercore instance under Bare; then a
   new id, pinned, and a run with it. Every invocation met; the runs kept.
5. **The product repositories**: mycelium-git updated; the new module's
   once its repository exists.

## Done

All parts done, recorded in `main:steps/3-repositories/`.
