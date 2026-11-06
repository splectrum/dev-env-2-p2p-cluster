# haicc-base-boot

HAICC's boot and the root's part of HAICC, for a work folder: plain shell
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
  .haicc/       the root: node/, haicc-base-boot/ (this module, copied at the first boot), log/
  <manager>/    a swarm, self-contained: its own HAICC, package manager and packages (next)
```

- **The setup** (`release.sh` makes it from `base-package-haicc` as
  written): one self-extracting file, `sh` and `tar` only, extracting
  `haiccing/boot` (the stub naming its setup), `haiccing/sources` and
  `haiccing/base-package-haicc/`.
- **Stage 1** (`boot.sh`): step 0, Linux x86-64 and Node.js
  (`step0.sh`, `requirements`); this module copied into `.haicc/` at the
  first boot (no updates: versions later); `./haicc` written; then stage 2.
- **Stage 2** (`./haicc boot`, `haicc.js`): the host's other prerequisites
  (`lib/host.js`: git; Docker Engine installed, running, in its group,
  rootful and native), each fixed only with a yes; then `haiccing/install`
  if there (one `./haicc` command a line, stopping at the first failure),
  or the next commands.
- **The root's commands**: `boot`, `boot <manager>` (next), `fetch
  <repository>` (with what it requires, from `haiccing/sources`: `folder
  <path>`, `github <org>`), `list` (the managers).
- **The host checks are the boot's own copy**: `haicc-reconcile`'s machine
  kinds hold the same for projects; a test keeps the two agreeing.

## Logged

Everything a command prints, stage 1's included, goes to
`.haicc/log/haicc.log` too, in order: a header line (the time, the command,
its folder) and a close line (its exit code, how long) each; files of
10 KB, rotated as a command starts. `--verbose` says each check's detail.

## Step 0, what HAICC needs to run

Before Node.js exists (`step0.sh`, `requirements`): Linux x86-64 and
Node.js 22 or later.
- `check`: each with the version found, the version required, ok or not,
  and what `fix` would do; it changes nothing. Exit 0 when all is met, 1
  when not (the boot stops).
- `fix`: only with your yes (asked on the terminal; with no terminal,
  nothing changes unless `--yes`): Node.js, the official release for Linux
  x64, checksum checked, into `.haicc/node` (no `sudo`).

The host's other prerequisites are stage 2's (above).
