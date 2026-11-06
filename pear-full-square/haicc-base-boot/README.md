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
  nodejs/       Node.js, when the boot installs it
  log/          the log files (the setup's, the boot's, every command's), named by their start
  <swarm>/      a swarm on this host: haicc (its launcher: the root's HAICC, in that swarm),
                swarm.json (its nodes here, their roles), and a folder per node:
    <node>/     a node's manager: haicc (the node's own HAICC), packages/, log/
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
- **A swarm's node** (`./haicc boot <swarm>/<node>`, e.g. `hosts/master`;
  or `<swarm>/haicc boot <node>`): both names required, made URI parts if
  they are not (the changes said); the host's prerequisites checked first;
  the swarm's folder made on first use (its launcher, `swarm.json`); the
  node added with its role (the first: `master`, then `node`;
  `--role=`); its manager `<swarm>/<node>/` in the same shape, the package
  manager and HAICC copied in whole, its launcher; then its own boot,
  `<swarm>/<node>/haicc boot`: the self-test of what was copied in, ready
  when all pass. Its output shown as it happens (`--no-echo`: its outcome
  only); its log in `<swarm>/<node>/log/`. Booted again: kept, tested again.
  `<swarm>/haicc boot`: each of the swarm's nodes, the master first.
- **Teardown**, a plain remove, asked first (`--yes`): a node
  (`./haicc teardown <swarm>/<node>`): its own teardown: it leaves the
  swarm, its container is shut down (with the swarm's step), its contents
  removed, its HAICC kept for a reboot; a swarm (`./haicc teardown
  <swarm>`, `<swarm>/haicc teardown`): its nodes, the master last; the root
  (`./haicc teardown`): every swarm, then the swarms' folders,
  `packages/` and `./haicc`. Kept: `haiccing/` (`haiccing/boot` again),
  `log/` (the record, the teardown's included), and external downloads
  (`nodejs/`). Later: teardown with checkpointing and backup.
- The host's structure (the root, a swarm's folder) is run by the root's
  HAICC and logs in the root's `log/`; the swarm's structure (its nodes) by
  each node's own HAICC, logging in its own `log/`, echoed to the root.
- **The root's commands**: `boot`, `boot <swarm>/<node>`, `teardown`, `fetch
  <repository>` (with what it requires, from `haiccing/sources`: `folder
  <path>`, `github <org>`), `list` (the swarms, their nodes and roles).
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
  x64, checksum checked, into `nodejs/` (no `sudo`).

The host's other prerequisites are stage 2's (above).
