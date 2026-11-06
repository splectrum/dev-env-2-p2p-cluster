# Request: phase 3, step 1, packages and the boot

The first step after phase 2, from the design agreed with the human
(`main:notes/packages.md`): modules used as packages, the package manager
booted in stages, demos run from their own `haiccing` repositories. Linux
x64. The phase's own request is written as its scope settles.

Amended 2026-11-05: booting only between HAICC and the package manager
(`main:notes/packages.md`, "Booting"); step 0, the host's prerequisites,
checked and fixed in shell; a folder of `haiccing` repositories side by
side, cloned or copied; a from-scratch script.

## The aim

A demo runs from a folder of `haiccing` repositories side by side (cloned
or a plain copy): its script, and the browser opens. No development
repository, no `npm install`.

## Parts, in order

0. **The mycelium modules into the one workspace**: no separate installs,
   no duplicated trees (24 MB less).
1. **The package manager, basic** (`pkgm-base-manager`, `pear-full-square`;
   needing only Node's built-ins and git):
   - the third-party import: the one contact with npm, Linux x64,
     pruned, recorded (versions, integrity, licences), Bare's runtime
     included;
   - writing a package: its code, self-contained, with its tests, into
     its `haiccing` repository; the packages written as a consistent set,
     tested together at their latest;
   - installing packages into a host folder (fully qualified,
     `<org>/<repo>`), with overrides (an updated module tested within its
     package);
   - its provider for HAICC (a package as a prerequisite);
   - the node image built from a folder (code from the packages), Bare's
     runtime from `third-party`.
2. **The packages** (`haiccing/base-package-<name>`): `haicc` (the entry), `pkgm`, `third-party`, `p2p`
   (with `p2p-git`), `mycelium`, `splectral`, `haicc`; each with its
   tests, run within the package.
3. **Booting** (`pkgm-base-boot`, and HAICC's boot, `haicc-base-boot`):
   - HAICC's boot (`base-package-haicc`, plain shell): step 0, the host's
     prerequisites: `check` (versions found and required, from one file)
     and `fix` (with the human's yes: Node.js into `~/.haicc/node`, git
     and Docker Engine with `apt`, the `docker` group, the daemon);
   - the package manager's boot (`base-package-pkgm`, plain shell):
     installs the package manager into the host's install folder;
   - kicking the package manager: HAICC's boot, then the package
     manager's boot and install, exit; kicking HAICC: HAICC's boot, the
     package manager's boot and install, HAICC's install, exit (`haicc`
     available);
   - idempotent; missing siblings said; nothing relying on git; a
     from-scratch script in the readmes (`curl` and `tar`).
4. **The demo projects' scripts**: HAICC kicked if not installed (their
   prerequisite repositories assumed siblings), then `haicc run
   <project>`: the project's layers reconciled (its packages installed by
   the package manager, the swarm host, the demo), the browser opened;
   `haicc test`: the project's tests, after it runs.
5. **Validation and products.** Each package's tests within the package;
   step 0's `check` on a machine lacking things; from a clean home
   folder: the `haiccing` repositories copied side by side as plain
   folders, a demo project's script, its scenario run from the browser,
   `haicc test`, teardown; kicking the package manager alone, and HAICC
   alone; recorded; the products merged.

6. **The work folder, one route** (amended 2026-11-05,
   `main:notes/packages.md`, "The work folder, one route, one boot"):
   - a setup: a self-extracting release of `base-package-haicc` (`sh`
     and `tar`), extracting `haiccing/` with `boot` (an executable stub
     naming its setup), `sources` and `base-package-haicc`;
   - `haiccing/boot`, no verbs: step 0, the repositories fetched from
     `sources` (`folder`, `github`), the package manager and HAICC into
     `<work>/.haicc`, `<work>/haicc` written; then `haiccing/install` if
     present;
   - `./haicc` for everything after; deployments in `<work>/manager/`
     (one fixed manager folder);
   - logged from the start, in files: boot's output, every `haicc`
     command's input, output and outcome, every package change, every
     repository fetched;
   - the self-test an `install` file, run in a fresh work folder from the
     development repository's written packages;
   - retired: `pkgm-base-boot`, the kicks, the demos' `run.sh`.
   Then (a follow-on): the logs as topics.

7. **Self-contained packages, the work folder, the log on a timeline**
   (amended 2026-11-06, `main:notes/packages.md`, "Self-contained
   packages, the work folder, the log"):
   - each package carries everything it runs on (no `requires`); installed
     by copying its repository in, whole; once sealed, only its version
     counts; Splectral's components the same; Bare's runtime stripped where
     node images are built;
   - the work folder: `haicc`, `haiccing/`, `packages/` (repositories,
     whole), `node/`, `log/`, `manager/` (the same shape); one variable,
     `HAICC_WORK`; no hidden folders;
   - the log: files of 10 KB named by their first command's start (UTC),
     reading in time order; each command's real start time and its
     duration, the setup's included.
   Later, not in this step: versioned packages (major.minor in the name,
   side by side); the host on Bare (the roadmap).

Not in this step: the p2p version (packages as Hyperdrives mirrored to
the folder, the container's code the same way), pinning, other platforms,
Android.

## Needs the human

Repositories: `pear-full-square/pkgm-base-boot` and `pkgm-base-manager`
(created); `pear-full-square/haicc-base-boot` (HAICC's boot); the
packages `haiccing/base-package-haicc`, `-pkgm`, `-third-party`, `-p2p`,
`-mycelium`, `-splectral`.

## Done

All parts done, recorded in `main:steps/phase-3/1-packages-and-boot/`.
