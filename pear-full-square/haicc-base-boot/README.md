# haicc-base-boot

HAICC's boot, in plain shell, for a work folder: the host's prerequisites
(step 0), the repositories fetched, the package manager and HAICC
installed; then `./haicc` for everything. Kept tiny and stable (it says
its version, `VERSION`); no secrets. Everything starts here: there is no
other boot.

```sh
sh haicc-setup.sh ~/haicc-work [--sources=folder:<path>|github:<org>]   # the setup: extracts haiccing/
~/haicc-work/haiccing/boot [--yes]                                         # the boot
cd ~/haicc-work && ./haicc run base-demo-liveness
```

## The work folder

```
<work>/
  haicc         the launcher, written by boot: ./haicc <command>
  haiccing/     boot (the stub), sources, [install], the repositories
  .haicc/       the install: node/, packages/, log/
  manager/      the deployments, one folder per project (fixed, for now)
```

- **The setup** (`release.sh` makes it from `base-package-haicc` as
  written): one self-extracting file, `sh` and `tar` only, extracting
  `haiccing/boot`, `haiccing/sources` and `haiccing/base-package-haicc/`.
- **`haiccing/boot`**: a stub naming its setup (`base-package-haicc`),
  executable. It runs `boot.sh`: step 0; HAICC's repository and what it
  requires (the package manager, mycelium, third-party) fetched
  (`fetch.sh`); HAICC installed with them into `.haicc` by the package
  manager's own code; `./haicc` written. Then `haiccing/install` if there (one
  `haicc` command a line, stopping at the first failure), or the next
  commands said. Again: what is current is left as it is.
- **`haiccing/sources`**: where repositories come from, one a line, the
  first having one wins: `folder <path>` (plain copies), `github <org>`
  (archives). Later, a package swarm's repository synced to a folder.
- **The self-test** is an install file: `selftest.install` (every
  package's tests, each demo run, tested, torn down), copied to
  `haiccing/install` in a fresh work folder.

## Logged

Boot's output: `.haicc/log/boot-<time>.log`. Every repository fetched,
and from where: `.haicc/log/sources.jsonl`. Every `./haicc` command, its
input, output and outcome: `.haicc/log/commands.jsonl`. Every package
change: `.haicc/packages/.pkgm/changes.jsonl`. A deployment's lifecycle
and reconcile: its topics, in `manager/<project>/deployment/`.

## Step 0, the host's prerequisites

Before Node exists. The required versions in one file, `requirements`,
read by check and fix alike: Linux x86-64; Node.js 22 or later; git 2.25
or later; Docker Engine, running, rootful, native, and the user in the
`docker` group. All are needed to boot: nodes always run in Docker
containers.
- `check`: each with the version found, the version required, ok or not,
  and what `fix` would do; it changes nothing. Exit 0 when all is met, 1
  when not (the boot stops).
- `fix`: each fix only with your yes (asked on the terminal; with no
  terminal, nothing changes unless `--yes`), asking before anything needing
  `sudo`: Node.js, the official release for Linux x64, checksum checked,
  into `.haicc/node` (no `sudo`); git and Docker Engine (`docker.io`)
  with `apt`; the daemon started; the `docker` group (it holds from the
  next login: boot again after it). Each checked again after its fix. What cannot be fixed
  here (another platform, rootless Docker, Docker Desktop) is said.

