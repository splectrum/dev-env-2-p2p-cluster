# haicc-base-boot

HAICC's boot and the root's part of HAICC, for a work folder (no hidden folders: everything
in plain sight): plain shell
for stage 1, Node.js built-ins for the rest; it depends on nothing. Kept
tiny and stable (it says its version, `VERSION`); no secrets.

```sh
sh haicc-setup.sh ~/haicc-work [--sources=folder:<path>|github:<org>]   # the setup: extracts haiccing/
~/haicc-work/haiccing/boot [--yes] [--verbose]                             # the boot, both stages
cd ~/haicc-work && ./haicc list
```

## The work folder

```
<work>/
  haicc         the launcher, written by boot: ./haicc <command>
  haiccing/     boot (the stub), sources, [install], the repositories
  packages/     the code: base-package-haicc, copied whole at the first boot (this module runs from it)
  node/         Node.js, when the boot installs it
  log/          the log files (the setup's, the boot's, every command's), named by their start
  <manager>/    a swarm, the same shape: its own HAICC, package manager and packages (next)
```

- **The setup** (`release.sh` makes it from `base-package-haicc` as
  written): one self-extracting file, `sh` and `tar` only, extracting
  `haiccing/boot` (the stub naming its setup), `haiccing/sources` and
  `haiccing/base-package-haicc/`.
- **Stage 1** (`boot.sh`): step 0, Linux x86-64 and Node.js
  (`step0.sh`, `requirements`); HAICC's package copied whole into
  `packages/base-package-haicc/` at the first boot (no updates: versions
  later); `./haicc` written; then stage 2. One variable: `HAICC_WORK`, the
  work folder.
- **Stage 2** (`./haicc boot`, `haicc.js`): the host's other prerequisites
  (`lib/host.js`: git; Docker Engine installed, running, in its group,
  rootful and native), each fixed only with a yes; then `haiccing/install`
  if there (one `./haicc` command a line, stopping at the first failure),
  or the next commands.
- **A manager** (`./haicc boot <name>`, e.g. `master`, `node-1`): the name
  is required, made a URI part if it is not one (the change said); the
  host's prerequisites checked first; `<name>/` made in the same shape,
  the package manager and HAICC copied in whole (`<name>/packages/`), its
  launcher `<name>/haicc`; then its own boot, `<name>/haicc boot`: the
  self-test of what was copied in (each package's tests, in place),
  ready when all pass. Its output shown here as it happens (`--no-echo`:
  its outcome only); its own log in `<name>/log/`. Booted again: what is
  there is kept, the self-test runs again.
- **The root's commands**: `boot`, `boot <name>`, `fetch
  <repository>` (with what it requires, from `haiccing/sources`: `folder
  <path>`, `github <org>`), `list` (the managers).
- **The host checks are the boot's own copy**: `haicc-reconcile`'s machine
  kinds hold the same for projects; a test keeps the two agreeing.

## Logged

Everything a command prints, the setup's and stage 1's included, goes to
`log/` too, in order: files of 10 KB, each named by its first command's
start in UTC (`20261106T103312Z.log`), so `ls log/` lists them in time order
and the newest is the current one; a header line (the real start, the
command, its folder) and a close line (its exit code, how long) each.
`--verbose` says each check's detail.

## Step 0, what HAICC needs to run

Before Node.js exists (`step0.sh`, `requirements`): Linux x86-64 and
Node.js 22 or later.
- `check`: each with the version found, the version required, ok or not,
  and what `fix` would do; it changes nothing. Exit 0 when all is met, 1
  when not (the boot stops).
- `fix`: only with your yes (asked on the terminal; with no terminal,
  nothing changes unless `--yes`): Node.js, the official release for Linux
  x64, checksum checked, into `node/` (no `sudo`).

The host's other prerequisites are stage 2's (above).
