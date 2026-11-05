# haicc-base-boot

HAICC's boot, in plain shell: the host's prerequisites (step 0), then the
package manager to install HAICC. Kept tiny and stable (it says its
version, `VERSION`); no secrets.

```sh
sh base-package-haicc/kick.sh [--yes] [--fetch]   # kicking HAICC; ~/.haicc/bin/haicc after
sh base-package-haicc/pear-full-square/haicc-base-boot/step0.sh check
sh base-package-haicc/pear-full-square/haicc-base-boot/step0.sh fix [--yes] [--dry-run]
```

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
  into `~/.haicc/node` (no `sudo`); git and Docker Engine (`docker.io`)
  with `apt`; the daemon started; the `docker` group (it holds from the
  next login: kick again after it). Each checked again after its fix. What cannot be fixed
  here (another platform, rootless Docker, Docker Desktop) is said.

## Kicking HAICC

From a folder of `haiccing` repositories side by side, cloned or plain
copies (nothing relies on git): HAICC's boot (step 0), the package
manager's boot and install (`base-package-pkgm`), then HAICC's install by
the package manager, with what it requires (`base-package-mycelium`,
`base-package-third-party`); then it exits, and `~/.haicc/bin/haicc` is
there. A repository missing beside the others is said, with where to get
it; `--fetch` gets it from `github.com/haiccing` (git, or `curl` and
`tar`).

## Higher packages

A project (a demo, any `haiccing` repository above these) has no boot:
its `run.sh` (`run.sh` here, copied into each) kicks HAICC if it is not
installed yet, then calls `haicc run <project>`.
