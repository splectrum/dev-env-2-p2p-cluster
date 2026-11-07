# The local agent's run: the seventh release (2026-11-07)

`setup-bb5ab8f7a96d`, boot 0.6.0, latest, from `8d11242`: published with the
human's word, the runtime in git as built: `base-package-haicc` `cb60f4b` and the
release, nothing else. Built and tested first with `publish.sh --no-push`.

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

## After publishing, from GitHub

The latest link, the default sources, a new folder: every command exit 0,
`Passed: 7 passed, 0 failed, 0 skipped` (the platform's 19 steps), `Passed: 2
passed, 0 failed, 0 skipped`, no hidden files. The download took about 3 minutes
here, the publish about 2. GitHub's warning on the push: `File
modules/node_modules/bare-runtime-linux-x64/bin/bare is 92.60 MB; this is larger
than GitHub's recommended maximum` (`GH001: Large files detected`); accepted.

## Findings, for the implementer

1. **The runtime in git: size, and a limit close by.** The package went from
   436 KB to 119 MB (`modules/node_modules`), its packed history from 114 KB to
   34.6 MB, the setup from 59 KB to 36 MB. Never force-pushed, so this stays in
   the history, and each Bare upgrade adds about the same again.
   `bare-runtime-linux-x64/bin/bare` is one 92.6 MB file (97,094,392 bytes):
   GitHub warns above 50 MB and rejects a file over 100 MiB (104,857,600 bytes),
   about 8% away. Codeberg's limit not checked. Published as built, the human's
   word, so the 34.6 MB is now in the history; the proposal below stands for
   what comes after.

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
output handed back: `--set=validation`, the prompt (finding 4).
