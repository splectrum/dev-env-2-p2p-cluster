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

**Findings** (record of 2026-10-31, dev `cb75eff`; 7 cases, all exit 0):

- **Unit tests:** p2p-mrepo 24 (mycelium-git's contract suite on a
  p2p-mrepo repository among them), mycelium-git 82: all pass.

| Run | Machinery | Instance | Runtime | Met | Kept |
|---|---|---|---|---|---|
| r3 | pinned `46ba2e65` | native | Node | 627 of 627 | 13.4 MB |
| r4 | in development | native | Node | 627 of 627 | 13.4 MB |
| r5 | in development | **on Hypercore** (p2p-mrepo) | **Bare** | 627 of 627 | 13.9 MB |

- **r4 is identical to r3, and r5 to r4**: every response's recorded
  invocations (line, command, exit code, output) and the report, commit ids
  aside. The machinery in development changes nothing in what a run
  records, and a run on Hypercore under Bare records the same as one on
  native git under Node. (The comparison's stderr lists the files a
  response does not have, as git reports them: expected.)
- **The comparison found a bug first.** The first round (not kept) had r5's
  report in another section order than r4's: the isomorphic-git-style
  adapter gave a tree's entries in plain name order, native git in git's
  order. Fixed in mycelium-git with a contract test (`../engine/`); the
  runs were repeated with the fix.
- **p2p-mrepo's replica test was flaky** (1 run in 4 failed): it measured
  laziness by what is held from the start, which a small index can be
  whole. It now counts the blobs downloaded (10 of 10 runs pass).
- Every run took about 3 minutes 44 seconds, on Hypercore under Bare as on
  native git under Node.
