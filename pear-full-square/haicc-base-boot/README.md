# haicc-base-boot

HAICC's boot and the root's part of HAICC, for a work folder (no hidden folders: everything
in plain sight): plain shell
for stage 1, Node.js built-ins for the rest; it depends on nothing. Kept
tiny and stable (it says its version, `VERSION`); no secrets.

```sh
sh haicc-setup.sh ~/haicc-work [--sources=folder:<path>|github:<org>]   # the setup: extracts haiccing/
~/haicc-work/boot [--yes] [--verbose]                                      # the cold boot, both stages
cd ~/haicc-work && ./haicc list
```

## The work folder

```
<work>/
  boot          the cold boot (a stub naming its setup): set up from haiccing/, then ./haicc boot
  shutdown      the cold shutdown (a stub): everything HAICC made removed, back to the setup
  haicc         the launcher, written by the boot: ./haicc <command>
  haiccing/     sources, [install], the repositories
  swarms.json   the host's swarms (the root's config)
  packages/     the code: base-package-haicc, copied whole at the first boot (this module runs from it)
  nodejs/       Node.js, when the boot installs it
  log/          the log files (the setup's, the boot's, every command's), named by their start
  <swarm>/      a swarm on this host: haicc (its launcher: the root's HAICC, in that swarm),
                nodes.json (its nodes here, their roles: the swarm's config), and a folder per node:
    <node>/     a node's manager: haicc (the node's own HAICC), packages/, log/
```

- **The setup** (`release.sh` makes it from `base-package-haicc` as
  written): one self-extracting file, `sh` and `tar` only, extracting
  `boot` and `shutdown` (the stubs naming their setup), `haiccing/sources`
  and `haiccing/base-package-haicc/`.
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
## Boot and shutdown, by level

A `haicc boot` or `haicc shutdown` works on the config in the folder it is
called from; the config is kept. Shutdowns are plain removes, asked first
(`--yes` agrees).

| Called from | Its config (kept) | `haicc shutdown` | `haicc boot` |
|---|---|---|---|
| a node, `<swarm>/<node>/` | the node's own | its container removed | its container started again |
| a swarm, `<swarm>/` | `nodes.json` (and its launcher) | each node's cold shutdown (its folder removed), the master last | each node in `nodes.json` built from scratch and booted, the master first |
| the root, `<work>/` | `swarms.json` | each swarm's `haicc shutdown` | the host's prerequisites, then each swarm in `swarms.json` booted |
| the work folder, cold | `haiccing/`, `log/`, `nodejs/` | `./shutdown`: everything else removed, back to the setup | `./boot`: set up from `haiccing/`, then `./haicc boot` |

Making and removing one thing, from its parent:
- `./haicc boot <swarm>`: the swarm added to `swarms.json`, its folder,
  launcher and `nodes.json` made, then booted. `./haicc teardown <swarm>`:
  its shutdown, its folder and its entry removed.
- `<swarm>/haicc boot <node>`: the node added to `nodes.json` with its role
  (the first: `master`, then `node`; `--role=`), its manager made (the
  package manager and HAICC copied in whole, its launcher), then its own
  boot, `<swarm>/<node>/haicc boot`: the self-test of what was copied in,
  up when all pass. Its output shown as it happens (`--no-echo`: its
  outcome only). `<swarm>/haicc teardown <node>`: its shutdown, its folder
  and its entry removed.
- Names are required, made URI parts if they are not (the change said).
- Logs are kept, and external downloads (`nodejs/`). Later: teardown with
  checkpointing and backup; a node's container, with the swarm's step.

- The host's structure (the root, a swarm's folder) is run by the root's
  HAICC and logs in the root's `log/`; the swarm's structure (its nodes) by
  each node's own HAICC, logging in its own `log/`, echoed to the root.
- **The root's commands**: `boot [<swarm>]`, `shutdown`, `teardown <swarm>`, `fetch
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
