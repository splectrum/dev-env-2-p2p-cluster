# Part: an engine given as a module

**Scope.** mycelium-git's CLI takes `--engine=<path>` (relative to
`cli.js`, ending in `.js`): a module exporting
`openBackend(dir) → { backend, close }`. So mycelium-git's command sets run
on any engine, and mycelium-git does not know which. Exit codes are set,
not forced, so the engine is closed. A new id for mycelium-git:
`7cadb8e9-88c5-4b56-8baf-5988072a0cc8`.

Also in mycelium-git, found by the validation (r4 against r5): the
isomorphic-git-style adapter (isomorphic-git and p2p-git) gave a tree's
entries in plain name order, native git in git's order (a folder's name as
if it ended in `/`), so selections, and a report's sections, depended on
the engine. The adapter now gives git's order; a contract test covers it
(82 pass). Hence a second new id, `7cadb8e9-88c5-4b56-8baf-5988072a0cc8`, which the runs were repeated
with.
