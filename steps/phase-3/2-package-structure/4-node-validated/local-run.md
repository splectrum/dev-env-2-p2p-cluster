# The local agent's run: the ninth release (2026-11-07)

`setup-434506b82414`, boot 0.6.0, Bare v1.36.0, from `77db647`: built with
`publish.sh --no-push`, **not published**. `base-package-haicc` `aba7360` is in
the local clone only; the latest link still serves the eighth release. Publishing
waits for the human's explicit word.

## The candidate as handed over failed: fixed here

From `ed514b6` (`setup-9ea3b7a896f0`): every fresh node refused itself, `FAILED
base-package-haicc: changed since it was written`, the platform test stopping at
its step 6: `FAILED: 6 passed, 1 failed, 0 skipped`.

The cause: `packageHash` counts every top-level file but `package.json`, the
readme and `.git`. The writer takes the hash before the repository's own `LICENSE`
is back (`tools/package-writer/index.js` keeps it when writing), and the setup
carries it, so a real release's copy always differs. A fresh repository has no
`LICENSE`, so the implementer's run passed. Removing `LICENSE` from a node made it
pass, which showed the cause.

Fixed in `pkgm-base-manager/index.js`: `LICENSE` is not part of a package's
identity; a test added to `verify` (fails without the fix, 5 of 6; 6 of 6 with it).

## Tested, the fixed build, Node.js off the PATH, from another folder

- `./haicc boot base-package-haicc/test`: `Passed: 7 passed, 0 failed, 0 skipped`,
  the platform's 23 steps.
- `./haicc boot hosts`, `./hosts/haicc boot master`: `ok base-package-haicc: intact
  (434506b82414)`, `modules-load`, `sets`, `Ready: 3 test runs passed`.
- `./hosts/master/haicc test base-package-haicc --set=validation`: exit 0.
- A file replaced in the master's copy (`rm`, a new file; 3 hard links before, the
  root's copy untouched): `./hosts/master/haicc boot`, and `./hosts/haicc boot`:
  not intact, said, exit 1.
- `./hosts/haicc shutdown master --yes`, `./hosts/haicc boot master`: rebuilt,
  intact, up.
- A file added: refused, exit 1. No hidden files.

Not run: from GitHub (nothing published).

**The human's manual test (2026-11-07)**: the local build in `~/haicc-r9`, from
the local file: "great, all passed". The output was not handed back.

## Findings, for the implementer

1. **The platform test could not see this**: the setup it builds comes from the
   package under test, but only a repository with a `LICENSE` shows it. A test
   package written with a `LICENSE` beside it would have.
2. **A removed `LICENSE` is not noticed**, by the fix: it is no longer identity.
   If it should be, the writer has to put it in before taking the hash.
3. **Negative durations**: `== exit 1, -1.2 s`, and a later header earlier than the
   one before it (`08:56:08.566`, then `08:56:07.539`), once, on the swarm's boot.
   The clock stepped back under WSL2, it seems, not a fault in the sum: durations
   taken from a wall clock can do this. A monotonic clock would not.
