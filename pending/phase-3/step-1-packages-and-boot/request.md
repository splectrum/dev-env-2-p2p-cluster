# Request: phase 3, step 1, packages and the boot

The first step after phase 2, from the design agreed with the human
(`main:notes/packages.md`): modules used as packages, the package manager
booted in stages, demos run from their own `haiccing` repositories. Linux
x64. The phase's own request is written as its scope settles.

## The aim

A demo runs from a clone of its `haiccing` repository alone:
`sh haicc run`, and the browser opens. No development repository, no
`npm install`, nothing outside but git.

## Parts, in order

0. **The mycelium modules into the one workspace**: no separate installs,
   no duplicated trees (24 MB less).
1. **The package manager, basic** (`pkgm-base-*`, `pear-full-square`):
   - the third-party import: the one contact with npm, Linux x64,
     pruned, recorded (versions, integrity, licences), Bare's runtime
     included;
   - writing a package: its code, self-contained, with its tests, into
     its `haiccing` repository; the packages written as a consistent set,
     tested together at their latest;
   - installing packages into a host folder (fully qualified,
     `<org>/<repo>`), with overrides (an updated module tested within its
     package);
   - its provider for HAICC (a package as a prerequisite).
2. **The packages** (`haiccing/base-package-<name>`): `third-party`, `p2p`
   (with `p2p-git`), `mycelium`, `splectral`, `haicc`; each with its
   tests, run within the package.
3. **`pkgm-boot`** (`pear-full-square`): Node's built-ins and git only;
   its own prerequisites checked with hints; the packages the proper
   package manager needs taken from their `haiccing` repositories into a
   host folder (`~/.haicc/packages`), whole or nothing, not again when
   current; then the proper package manager run from there.
4. **`haicc run`** in the demo projects' repositories: the boot, then the
   project's layers reconciled (packages, the swarm host, the demo), the
   browser opened; `haicc test`: the project's tests, after it runs.
5. **Validation and products.** Each package's tests within the package;
   from a clean home folder with only Node, git and Docker: a demo
   project cloned alone, `sh haicc run`, its scenario run from the
   browser, `haicc test`, teardown; recorded; the products merged.

Not in this step: the p2p version (packages as Hyperdrives mirrored to
the folder, the container's code the same way), pinning, other platforms,
Android.

## Needs the human

Repositories: `pear-full-square/pkgm-boot`, the package manager's
(`pear-full-square/pkgm-base-...`, named when its modules settle), and the
packages `haiccing/base-package-third-party`, `-p2p`, `-mycelium`,
`-splectral`, `-haicc`.

## Done

All parts done, recorded in `main:steps/phase-3/1-packages-and-boot/`.
