# Part: an engine given as a module

**Scope.** mycelium-git's CLI takes `--engine=<path>` (relative to
`cli.js`, ending in `.js`): a module exporting
`openBackend(dir) → { backend, close }`. So mycelium-git's command sets run
on any engine, and mycelium-git does not know which. Exit codes are set,
not forced, so the engine is closed. A new id for mycelium-git:
`24ecc3a3-b134-49ef-953f-4bc5a71862a0`.
