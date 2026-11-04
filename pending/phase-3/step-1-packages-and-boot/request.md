# Request: phase 3, step 1, packages and the boot

The first step after phase 2, from the design agreed with the human
(`main:notes/packages.md`): modules used as packages, the package manager
booted in stages, demos run from their own `haiccing` repositories. Linux
x64. The phase's own request is written as its scope settles.

Amended 2026-11-05: the boot only copies the package manager and runs it;
step 0, the host's prerequisites, checked and fixed in shell; from a
plain folder copy, with a from-scratch script.

## The aim

A demo runs from a clone of its `haiccing` repository alone:
`sh haicc run`, and the browser opens. No development repository, no
`npm install`, nothing outside but git.

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
2. **The packages** (`haiccing/base-package-<name>`): `pkgm`, `third-party`, `p2p`
   (with `p2p-git`), `mycelium`, `splectral`, `haicc`; each with its
   tests, run within the package.
3. **`pkgm-base-boot`** (`pear-full-square`):
   - step 0, the host's prerequisites in plain shell: `host.sh check`
     (versions found and required, from one file) and `host.sh fix`
     (with the human's yes: Node.js into `~/.haicc/node`, git and Docker
     Engine with `apt`, the `docker` group, the daemon);
   - the boot: the package manager's code copied from its `haiccing`
     repository (`base-package-pkgm`) into the manager's folder, and run;
     the package manager does the rest;
   - working from a plain folder copy; a from-scratch script in the
     readme (`curl` and `tar` only).
4. **`haicc run`** in the demo projects' repositories: the boot, then the
   project's layers reconciled (packages, the swarm host, the demo), the
   browser opened; `haicc test`: the project's tests, after it runs.
5. **Validation and products.** Each package's tests within the package;
   `host.sh check` on a machine lacking things; from a clean home folder:
   a demo project copied as a plain folder, `sh haicc run`, its scenario
   run from the browser, `haicc test`, teardown; recorded; the products
   merged.

Not in this step: the p2p version (packages as Hyperdrives mirrored to
the folder, the container's code the same way), pinning, other platforms,
Android.

## Needs the human

Repositories: `pear-full-square/pkgm-base-boot` and `pkgm-base-manager`
(created); the packages `haiccing/base-package-pkgm`, `-third-party`,
`-p2p`, `-mycelium`, `-splectral`, `-haicc`.

## Done

All parts done, recorded in `main:steps/phase-3/1-packages-and-boot/`.
