# Installing HAICC, and testing it

For a user. Linux on x86-64 (on Windows: inside WSL2), with `curl` and
`tar`; for swarms, Docker Engine (rootful, native: not Docker Desktop) and
git, which the boot checks and fixes with your yes.

## 1. Download the setup

One file, about 36 MB: it carries everything HAICC runs on.

```bash
rm -f haicc-setup.sh && curl -fL --progress-bar --retry 5 --retry-all-errors --connect-timeout 20 \
     -o haicc-setup.sh https://github.com/haiccing/base-package-haicc/releases/latest/download/haicc-setup.sh
```

On a poor connection, if the download stops, continue it where it stopped,
as often as needed, until it ends without an error:

```bash
curl -fL -C - -o haicc-setup.sh https://github.com/haiccing/base-package-haicc/releases/latest/download/haicc-setup.sh
```

## 2. Set up a work folder

```bash
sh haicc-setup.sh ~/haicc-work
```

It extracts `~/haicc-work/`: `boot`, `shutdown`, `bare/` (Bare's runtime,
checked), `haiccing/` (the platform's package, and `sources`: where more
packages come from, GitHub's `haiccing` by default; `--sources=folder:<path>`
for a local folder of repositories). Run again on the same folder: said,
nothing changed. A different setup needs a new folder.

## 3. Boot it

```bash
~/haicc-work/boot
```

The cold boot checks Linux x86-64 and that Bare's runtime runs here, copies
the platform's package into `packages/` and writes `./haicc`; then the warm
boot (`./haicc boot`) checks git and Docker Engine (installed, running,
rootful, native, you in the `docker` group) and fixes what is missing only
with your yes (`--yes` agrees beforehand). `Booted.` when done.

## 4. Test the release, where it landed

```bash
~/haicc-work/haicc boot base-package-haicc/test
```

The full set: the modules' own tests, the package's, and the platform test
(a fresh install inside its run, worked through every level). Expect
`Passed: 7 passed, 0 failed, 0 skipped` (about 40 s). The quick check,
nothing started: `--set=validation`.

## What is where

- Everything is in the work folder, in plain sight; nothing hidden.
- Everything it printed is in `log/`, newest file last.
- `./shutdown` takes the work folder back to the setup (keeping `haiccing/`,
  `log/`, `bare/`); `./boot` sets it up again.

Next: [swarms.md](swarms.md).
