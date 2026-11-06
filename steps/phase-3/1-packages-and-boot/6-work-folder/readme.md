# Part 6: the work folder, one route

**Done** (2026-11-05): the design in `notes/packages.md` ("The work
folder, one route, one boot"), the request's part 6.

- **The setup** (`haicc-base-boot/release.sh`): `haicc-setup.sh`, 27 KB,
  self-extracting (`sh`, `tar`): `haiccing/boot` (the stub naming
  `base-package-haicc`, executable), `haiccing/sources`
  (`--sources=folder:<path>|github:<org>`, default `github haiccing`),
  `haiccing/base-package-haicc/`. Stored once, clean: the GitHub release of
  `base-package-haicc` (not here).
- **`haiccing/boot`** (`boot.sh`): step 0; the package manager's and
  HAICC's repositories with what HAICC requires fetched (`fetch.sh`, from
  `sources`); the package manager by its own code, HAICC by it, into
  `.haicc`; `./haicc` written; then `haiccing/install`, or the next
  commands said.
- **`./haicc`** (`haicc-deployment/haicc.js`): `run`, `test` (a package or
  a project), the lifecycle verbs, `install`, `fetch`, `list`, `version`;
  a project fetched with what it needs; its deployment in
  `manager/<project>/`.
- **Logged, in files**: boot's output (`.haicc/log/boot-<time>.log`),
  every command with its input, output and outcome
  (`.haicc/log/commands.jsonl`), every fetch (`.haicc/log/sources.jsonl`),
  every package change (`.haicc/packages/.pkgm/changes.jsonl`). Topics
  next (a follow-on).
- **Retired**: `pkgm-base-boot` (its product repository to archive: the
  human), the kicks, `siblings.sh`, the demos' `run.sh`, `~/.haicc`.

## The self-test

The run (then a script here, since removed: test runs belong in the
development environment, thrown away after; only their logs kept): the packages written from here, the setup
released from them, a fresh work folder (`--sources=folder:<the written
packages>`), `haicc-base-boot/selftest.install` as `haiccing/install`,
then `haiccing/boot`. Record of 2026-11-05 (`record/`): **exit 0**.

- The boot: step 0 all met; three repositories fetched from the folder
  source; the package manager, third-party, mycelium and HAICC installed;
  `./haicc` written.
- The install file, 13 commands, all exit 0, 157 s: `test pkgm` (5),
  `third-party` (3), `mycelium`, `haicc`; `run base-demo-liveness` 37 s
  (its repository and p2p, splectral fetched and installed, the image
  built), `test` passed, `teardown`; `test p2p`, `test splectral`; the
  same for other-host (27 s); `list`: six packages installed, both
  deployments `nothing (last: teardown)`.
- The work folder: `haicc`, `haiccing/` (boot,
  sources, install, eight repositories), `.haicc/`, `manager/` (one folder
  per project). Nothing running after; no secret in the logs.
- The browser run is not in it (Playwright, outside the packages).
