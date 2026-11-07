# The local agent's run: the seventh release (2026-11-07)

`setup-bb5ab8f7a96d`, boot 0.6.0, from `8d11242`: built with `publish.sh
--no-push`, **not published**. `base-package-haicc` `cb60f4b` is in the local
clone only; the latest link still serves the sixth release.

## Tested, the built file in a new folder, Node.js off the PATH

- Setup and `./boot`: exit 0; `bare/` placed, the runtime v1.36.0.
- `./haicc boot base-package-haicc/test`: `Passed: 7 passed, 0 failed, 0
  skipped`, the platform's 19 steps, 26.6 s.
- `./haicc boot base-package-haicc/test --set=validation`: `Passed: 2 passed, 0
  failed, 0 skipped`.
- A swarm, a master, `./haicc list`: exit 0. No hidden files.
- A yes on a terminal (`./haicc teardown hosts` through `script`): `n` kept the
  swarm, exit 1; `y` removed it, exit 0; closed input refused, exit 1.
- The human's feedback on the sixth release: seen working. Each command says
  itself on stdout at its start and its end, nested ones with their ` | `; the
  platform test's steps show their commands.

Not run: from GitHub (nothing published), a failed download, `./haicc boot` with
git missing.

## Findings, for the implementer

1. **The runtime in git: size, and a limit close by.** The package went from
   436 KB to 119 MB (`modules/node_modules`), its packed history from 114 KB to
   34.6 MB, the setup from 59 KB to 36 MB. Never force-pushed, so this stays in
   the history, and each Bare upgrade adds about the same again.
   `bare-runtime-linux-x64/bin/bare` is one 92.6 MB file (97,094,392 bytes):
   GitHub warns above 50 MB and rejects a file over 100 MiB (104,857,600 bytes),
   about 8% away. Codeberg's limit not checked. It has to be settled before
   publishing: the history cannot be undone.

   **The human's proposal: if the large file is an issue, a downloadable
   asset.** The runtime kept out of `base-package-haicc`'s git and uploaded with
   the release beside the setup, or as its own file `./boot` fetches. Git stays
   small and the limit goes; what it needs: pinning the file by its hash, a boot
   that downloads (through `lib/download.sh`, which resumes), and a way to work
   offline. `notes/packages.md`'s "the runtime carried" changes with it.
2. **A large download on an intermittent connection.** The published `curl`
   command restarts from zero after a drop (`--retry`, no `-C -`). At 59 KB that
   did not matter; at 36 MB it can. The readme, the profile and `packages.json`.
3. **`npm install` dirties `package-lock.json`**, so `publish.sh` refuses: a
   metadata change only (`optional` lines, a `dependencies` entry on
   `bare-runtime`), no version changed. Restored here for the build. To do:
   commit the file as npm writes it.
4. **The prompt doubled**: `go ahead? [y/N]   go ahead? no` on one line. Seen
   through `script` with piped input, which may be the cause: to check on a real
   terminal (the human's manual test).

5. **The echoed command is not always the command as run.** The human ran
   `~/haicc-r7/boot` and `~/haicc-r7/haicc boot ...` from `/home/herma`; stdout
   and the log say `./boot` and `./haicc boot ...` `(in /home/herma)`, where no
   such file is. Print the path as called, or the launcher's folder.

## The human's manual test (2026-11-07)

The built file in `~/haicc-r7`, on the human's machine: setup, `./boot` and the
host's checks ok, `Passed: 7 passed, 0 failed, 0 skipped`, the platform's 19
steps in 26.9 s, 38.0 s in all. Each command on stdout, as asked. Not in the
output handed back: `--set=validation`, the prompt (finding 4). Not published:
the runtime's place is still the human's to settle (finding 1).
