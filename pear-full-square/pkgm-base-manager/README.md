# pkgm-base-manager

The package manager, basic. Packages are self-contained folders (each its
repository, `haiccing/base-package-<name>`): their code ready to run, laid
out as it is installed, with their tests and a manifest. Installed into one
folder (a work folder's `install/packages`), each module once, the
third-party code once; tested there, within the package. Node's built-ins
only: no npm, no git.

```sh
pkgm import  --dev=<development repository> --out=<folder>   # third-party: the one contact with npm
pkgm write   --dev=<development repository> --out=<folder>   # our packages, tested together, then written
pkgm install <package> --from=<folder>[,<folder>] [--into=<install folder>] [--override=<org>/<module>=<dir>]
pkgm test    <package> [--into=<install folder>]
pkgm list | uninstall <package>
```

(`pkgm` is `node <install folder>/pear-full-square/pkgm-base-manager/cli.js`.)

## A package

```
base-package-<name>/
  package.json        "pkgm": { package, requires, folders, hash, [platform, runtime, bare] }
  README.md
  test/               the package's own tests (with PKGM_ROOT, the install folder)
  <org>/<module>/     its modules, as installed (with their tests)
  node_modules/...    third-party code (the third-party package only)
  third-party.json    the import's record: version, integrity, licence of each
```

- **The hash** covers the package's folders (paths, exec bits, contents):
  writing an unchanged package gives the same hash, so the same repository.
- **Requires**: installed first, from the same folders; a package beside
  the others but missing is said, with where to get it.

## Installing

- Into `<install folder>/<org>/<module>` (and `node_modules/` for the
  third-party package); our modules are found by name through
  `node_modules/<module>` links.
- **Current**: installed with the same hash and not overridden, skipped.
- **Whole or nothing**: staged inside the install folder, then moved in
  place; one marked installing (interrupted) is redone.
- **One owner per folder**: a folder another package holds is refused.
- **Overrides**: `--override=<org>/<module>=<dir>` installs the package
  with that module's code from `<dir>` (its `node_modules` and `.git`
  left out), recorded; `pkgm test` then runs the module's and the
  package's tests; a plain install puts the package back.
- The registry: `<install folder>/.pkgm/installed.json`; each package's
  own files (manifest, readme, record, tests) in `pkgm/packages/<name>/`.

## Writing packages

From the development repository's `packages.json`: each package's modules
(`<org>/<module>`, or `{ path, from }` for one taken from elsewhere, as
`p2p-git` from `node_modules`). All are staged, installed together into a
scratch folder (the third-party package from `--out`, as last imported)
and tested; only when every package's tests pass are they written, each
into its folder in `--out` (a clone's `.git` and `LICENSE` kept).

**The import** takes the development workspace's installed tree
(`node_modules`, from its `package-lock.json`): our own modules left out,
other platforms' prebuilds and test folders dropped, Bare's runtime
included (`bare-runtime-<platform>`), each module recorded.

## For HAICC

`reconcile.js`: the kind `package`, `{ name, from, into }`: installed and
current, made by installing. The node image is built from an install
folder (`p2p-node-manager/image/build.sh`).
