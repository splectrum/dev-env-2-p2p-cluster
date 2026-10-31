# Part: validation

**Scope.** Unit tests of p2p-mrepo (with mycelium-git's contract suite)
and mycelium-git; then, as the machinery's practice requires:

- **r3**: the pinned machinery (`46ba2e65`), a native instance: the
  reference, with p2p-mrepo's command sets now among the requests;
- **r4**: the machinery in development (`MACHINERY=dev`), a native
  instance: identical to r3;
- **r5**: the machinery in development, an instance on Hypercore
  (`ENGINE=hyperdrive`), executed under Bare: identical to r4.

Compared with `compare.mjs`: per response, the recorded invocations (line,
command, exit code, output) and the report (commit ids aside).

**Expectation.** Every unit test passes; r3, r4 and r5: 12 requests, 627
invocations, all met; r4 identical to r3, r5 to r4.

**Record**: `record/` (the kept runs `2026-10-31-r3.bundle`, `-r4`, `-r5`).

**Findings**: below, once recorded.
