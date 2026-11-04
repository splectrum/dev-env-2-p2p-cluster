# Packages and cascading click and runs

Agreed with the human, 2026-11-04. Design, not built yet: the direction
for the next phase.

## Packages

A package is a set of modules referenced as one unit. Projects reference
packages; nothing depends on outside software once a package is made.

| Package | Holds |
|---|---|
| `third-party` | below mycelium, not ours: bare and holepunch, isomorphic-git, react and htm; changes only by a recorded import |
| `p2p` | below mycelium, ours: the p2p substrate (the series, rns, mrepo, the node, the managers) and `p2p-git` (git on Hyperdrive; developed in its own repository, `pear-full-square/p2p-git`, used at its latest) |
| `mycelium` | the repository layer |
| `splectral` | the platform |
| `haicc` | reconcile, deployment |

- Grouped by what makes sense functionally: few packages, a mixture of
  concern and practicality. The prerequisites (everything below mycelium)
  are two packages: `third-party` and ours, `p2p`, so our changes never
  carry the imported tree again.
- **Third-party code comes in once, at a deliberate boundary**: an import,
  recorded (versions, integrity, licences), the only contact with npm.
- **No fixed versions yet**: a package is rebuilt from the latest version
  of its modules (our products' `main`, the last import). Versions, and
  their release (Pear's main use for us), come later.
- **Platforms**: a package with native code is made per platform; Linux
  x64 first, and then only its binaries. Bare's runtime belongs to
  `third-party` too, so the node image needs no global install. Android arm64 next (below); only `third-party` has native code today.
- One root for now (this repository's workspace root, the modules side by
  side, fully qualified: `<org>/<repo>`), with room to loosen later: each
  project deriving its own root, then products depending on each other by
  name rather than by path.
- **Pinning** comes as soon as there is a working system; until then the
  packages are written as a consistent set (tested together, at their
  latest).

## Testing: always within the package

Agreed 2026-11-04.
- **Tests live in a module and in its package**: a module's own tests,
  and the package's tests of its modules together.
- **They always run with the package.** When a module is updated: the
  package is deployed, the module overwritten with its new version, then
  the module's and the package's tests run. A module is never validated
  on its own, only in the package it is used in.

## The package manager, and booting it

Agreed 2026-11-04. Managing packages is an application of its own
(`pkgm`, code in `pear-full-square`), not part of HAICC: HAICC uses it
through its provider. The packages are its data: `haiccing/base-package-<name>`,
**self-contained**: each holds its code, ready to run, with its tests.
Nothing is assembled at use, so nothing has to be pinned: a package is
taken as its repository has it (the latest). The development repository
writes a package's code into its repository when its modules change and
the package's tests pass.

The package manager needs packages itself, so it is booted in stages, as
a node is (`p2p-node/boot.js`):

1. **`pkgm-boot`** (simplified by the human, 2026-11-05): it only copies
   the package manager's code from its `haiccing` repository
   (`base-package-pkgm`) into the manager's folder on the host, and runs
   it. Node's built-ins and the git command line; nothing of ours but
   itself. The running package manager does the rest. So the package
   manager's package is self-contained with what it needs to run: its
   basic version itself needs only Node's built-ins and git.
2. **The proper package manager** (`pkgm-base-*`, built on mycelium)
   installs itself, and the other packages, on the p2p layer (mycelium
   repositories there), and from then on manages them: overrides (an
   updated module tested within its package), the tests, the third-party
   import; its provider for HAICC's cascade.

Packages are built and tested in the development repository, with the
proper package manager run in place; elsewhere a machine only boots from
what was built there.

**Two stages** (agreed 2026-11-04): the boot is **folder-based** (git
into a host folder, nothing more); the **p2p version does the heavy
lifting**: the swarm's code repository (below), kept current by
replication and mirrored to the folder code runs from (Holepunch's
`localdrive` and `mirror-drive`, as Pear keeps an app's files), only the
differences applied; code always runs from the folder.

**One code repository per swarm** (the human's simplification, for the
no-versions scenario: always the latest at install): a mycelium
repository on the master whose capability branch is the register of what
is installed, synced to every node. An install needing a dependency not
there requests it from the master, which installs it from its package
(`haiccing`) and commits; the change replicates to all. One tree, one
writer, one commit: every node runs the same, consistent set. It
generalises the master's `packages` repository (steps 4 and 5); the
`haiccing` package repositories stay the source installs come from, and
the boot's, before there is a swarm.

**On deploy, missing packages added** (the human, 2026-11-04): when a
manager deploys, the package manager adds the packages the deployment
needs that the swarm's code repository lacks. So the code is there once,
in layers of that repository; every node is provisioned the same, from
it; and the package manager's scope is global: the swarm, not a machine. **The container the same way**:
a node's boot already takes its code by replication from the master's
packages repository and extracts it; with packages, it is the same
mechanism as the host's, writing only what changed, the image keeping
Bare and the boot only.

## Folders on a machine

One root, each repository its own folder, laid out by fully qualified
name (`<root>/<org>/<repo>`). A package lays its modules into the root at
module level (`<root>/<org>/<module>`), the third-party code once
(`<root>/node_modules`): no module in two packages, so no collisions and
no duplication; the package manager records which package owns which
folders, so a package is still updated or removed as one unit. Folders
are units of storage and update; processes are by function (the Splectral
server, a watcher, a node manager each), importing from whichever folders
they need. Packages get folders of their own outright once modules import
each other by name.

## Sizes (measured 2026-11-04, pruned for Linux x64)

| Package | Size |
|---|---|
| `haicc` | 0.1 MB |
| `splectral` | 0.2 MB |
| `mycelium` | 0.4 MB |
| `p2p` | 1.3 MB (0.3 MB modules, `p2p-git` 1.0 MB) |
| `third-party` | about 40 MB, 1,913 files: native binaries 30.5 MB (`rocksdb-native` 19.5 MB, `sodium-native` 2.1 MB, `udx-native` 0.5 MB, the `bare-*` modules), React, react-dom and htm 5.0 MB, other JavaScript about 5 MB |

An update adds only the files that changed: our modules a few KB; the
third-party package only at an import, and only the modules whose versions
changed. The `mycelium-*` modules' separate installs held another 24 MB of
duplicates (a second Corestore, Hyperdrive, isomorphic-git, `rocksdb-native`,
`p2p-git`): gone once they join the one workspace.

**Step 0, the host's prerequisites** (agreed 2026-11-05): in plain shell,
before Node exists, part of `pkgm-base-boot`, run first by `sh haicc run`.
- `host.sh check`: each prerequisite with the version found, the version
  required, ok or not, and what `fix` would do; it changes nothing. The
  required versions in one file, read by check and fix alike: Linux
  x86-64; Node.js 22 or later; git 2.25 or later; Docker Engine, rootful,
  native, running; the user in the `docker` group. (The shell twin of
  `haicc-reconcile`'s machine providers.)
- `host.sh fix`, only with the human's yes, asking before anything
  needing `sudo`: Node.js, the official release for Linux x64, into a
  folder of ours (`~/.haicc/node`, no `sudo`; Ubuntu's own is too old);
  git with `apt`; Docker Engine with `apt`, the `docker` group, the
  daemon started (saying what needs a new login); checked again after
  each fix.
- Bare is not a host prerequisite: its runtime comes in `third-party`,
  and the node image takes it from there.

**From scratch** (agreed 2026-11-05): the entry repository (a project's,
or `pkgm-base-boot`) works as a plain folder copy (cloned, a zip, copied
over): nothing before the boot relies on git. Its readme gives a script
for a bare machine with only `curl` and `tar`: the repository's archive
fetched and unpacked, then `sh haicc run` (step 0, then the boot, which
then uses git). Since code may then come from the package folder rather
than a git tree, the node image is built from a folder too.

**Names**: `pear-full-square/pkgm-base-boot` and `pkgm-base-manager` (the
human, leaving room for more sophisticated versions).

**Other aspects of booting** (to be designed with the first version):
- **its own prerequisites** (Node, git) checked by the boot itself, with
  hints: `haicc-reconcile` is not there yet;
- **where it fetches from**: the package repositories on GitHub by
  default; a local mirror (a folder, a git server on the LAN) for an
  air-gapped machine;
- **idempotent**: packages already on the host and current are not
  fetched again; a newer one is (latest, for now);
- **whole or nothing**: a package fetched into a temporary folder and
  moved in place, so a failed boot leaves no half package;
- **one host folder of packages shared by projects** (`~/.haicc/packages`),
  each project's workspace using them;
- **the platform**: `third-party` for the host's platform;
- **the boot kept tiny and stable**: it is copied into every project that
  boots; it says its version, and a project can ask for a newer one;
- **no secrets**: the boot never touches a vault;
- **trust**: today the `haiccing` repositories as they are; later signed
  releases (Pear);
- later, the node's own boot could use the same package code.

## Cascading click and runs

Every layer is a `haiccing` project, a click and run of its own, whose
prerequisites (other projects, strict or not) are a state reconciled like
any requirement. Bootstrapping and layering, one step at a time: `start`
on a project brings up the layers below it. The click and run is
`haicc run <project>`: boot if needed, deploy and start what the project
needs, open the browser; the lifecycle verbs (`deploy`, `start`, `stop`,
`teardown`) stay for each step on its own.

1. a workspace: the packages a project needs, assembled (no install);
2. a swarm host: the node image, a swarm on this host;
3. a demo: Splectral with its components, and its scenario.

**Each project carries its tests**: its state as declared, and a smoke
test of what it provides; validated before use (in the development
repository) and when deployed (`sh haicc test`).

## Then: Android

After Linux x64 runs: a skeleton node on Android, probed first with Termux
on the human's phone, by the local Claude Code agent. Bare runs a minimal
node (identity, joining a swarm from an invitation, liveness, its own
repository) and a small local web server; the phone's browser opens
`http://127.0.0.1:<port>`. Before it, the `third-party` package for
Android arm64. An app with Bare Kit after the probe.
