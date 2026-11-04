# Part 1: the package manager, basic

**Done**: `pear-full-square/pkgm-base-manager` (Node's built-ins only; its
readme says how it works), the packages' definitions (`packages.json` at
the root), the node image built from an install folder.

## What it does

- **The import** (`pkgm import`): the third-party package from the
  workspace's installed tree; the one contact with npm. Bare's runtime
  joined the workspace's dependencies (`bare-runtime` 1.36.0) so it comes
  with the rest.
- **Writing** (`pkgm write`): our packages from their modules, staged,
  installed together into a scratch folder and tested; written only when
  all pass. Unchanged, a package is written the same (its hash).
- **Installing** (`pkgm install`): what a package requires first, from
  folders of package repositories side by side; `<org>/<module>`, our
  modules linked by name in `node_modules/`; current ones skipped; whole
  or nothing; one owner per folder; overrides; missing siblings said.
- **Testing** (`pkgm test`): the package's modules' tests, then its own,
  in the install folder.
- **For HAICC**: the kind `package` (`reconcile.js`).
- **The node image from a folder**: `build.sh` takes an install folder
  (or, as before, a committed development tree): tagged
  `p2p-node:pkg-<hash of the installed packages>`, Bare's runtime from the
  third-party package (no global install), tests and Node's addons left
  out. The node manager's `image` provider observes either.

## The packages, as written

| Package | Requires | Hash | Size | Files |
|---|---|---|---|---|
| `third-party` | | `76cac1534423` | 144 MB | 1,822 (192 modules) |
| `mycelium` | third-party | `ea54b7c41def` | 1.6 MB | 310 |
| `haicc` | mycelium | `72300f217854` | 0.1 MB | 19 |
| `pkgm` | | `d57325e0d559` | 0.1 MB | 11 |
| `p2p` | mycelium, haicc | `e285f629bd12` | 0.5 MB | 65 |
| `splectral` | p2p | `eead7ea3dbd1` | 0.3 MB | 54 |

Their tests, written together: 31 runs (each module's tests and each
package's own), 218 tests, all passing; 53 s.

## Validation

- `pkgm-base-manager`'s tests: a development repository in miniature
  (one third-party module with prebuilds for two platforms, Bare's runtime
  as a script, one module of ours): import, write, install, current,
  update, a failing test writing nothing, an override and back, a clash,
  a missing sibling, uninstall refused while required, the platform
  checked, an interrupted install redone, the provider through
  haicc-reconcile's engine. 4 tests, passing.
- **A swarm from an install folder**: every package installed into a
  fresh `~/.haicc/packages` (147 MB); genesis with `--code` that folder,
  run from it (`node <folder>/pear-full-square/p2p-swarm-manager/cli.js`):
  29 s with the image build; the image `p2p-node:pkg-f641913e9e20`, 293 MB
  (295 MB before); node-1 joining in 13 s, materialising the master's
  packages, 2,212 files, 11.7 MB replicated; both present; stopped,
  nothing left.

## Findings

- **Bare's runtime is 97 MB** (with debug information, not stripped; 68 MB
  stripped): two thirds of the third-party package, which the earlier
  measure (about 40 MB) left out. Kept as published, since the record's
  integrity is of what was published; GitHub takes files up to 100 MB.
- **`p2p-git` is in the `mycelium` package**, not in `p2p` as the design
  had it: `mycelium-git` runs on it, and the `p2p` modules use
  `mycelium-*`, so in `p2p` the two packages would require each other. The
  order: third-party, mycelium (with p2p-git), haicc, p2p, splectral; the
  package manager on its own.
- **`splectral-shell` is browser code**: its entry now npm's `browser`
  field (it imports what the server serves, `/m/...`); the package's load
  test checks such a module is there instead of loading it.
- **A test run inside a test run** reports to the outer one
  (`NODE_TEST_CONTEXT`): the package manager clears it, so a package's
  tests stand on their own even when the manager is itself under test.
- The package manager's provider test needs HAICC beside it; installed
  alone, it says so and skips.
