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
