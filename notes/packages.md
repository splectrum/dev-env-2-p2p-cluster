# Packages and cascading click and runs

Agreed with the human, 2026-11-04. Design, not built yet: the direction
for the next phase.

## Packages

A package is a set of modules referenced as one unit. Projects reference
packages; nothing depends on outside software once a package is made.

| Package | Holds |
|---|---|
| `third-party` | below mycelium, not ours: bare and holepunch, isomorphic-git, react and htm; changes only by a recorded import |
| `p2p` | ours: the p2p substrate (the series, rns, mrepo, the node, the managers) |
| `mycelium` | the repository layer, with `p2p-git` (git on Hyperdrive, which `mycelium-git` runs on; developed in its own repository, `pear-full-square/p2p-git`, used at its latest). Moved here from `p2p` when built (part 1): the `p2p` modules use `mycelium-*`, so the two packages would have required each other |
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

**Decided with the human (2026-11-06), to build with the package manager
work, not before:**
- **A test is a normal executable** in the package (a script or a program:
  it runs, prints, exits 0 or not); no HAICC harness to run it.
- **The package manager runs them**: once released, wherever the package
  is installed (`pkgm test <package>`); in the development environment,
  writing the packages installs and tests them together.
- **Only the latest run's log is kept**, with the package (small: logs
  only); older runs in the repository's history, or later in a more
  central HAICC solution. Benchmarks are tests like any other.
- **Known issues** are kept with the package.
- **Nothing of the environment a test ran in is kept**: the throwaway work
  folder is removed; only the test and its output log stay.
- **A harness, if one is ever needed,** is a `haiccing` package of its own,
  installed first (a chicken and egg: so avoided).
- **The release is stored once, clean**: the GitHub release of
  `base-package-haicc`, nowhere else.
- Until then, a test needed at the root is an `sh` script test on the
  root's HAICC.

## The package manager, and booting it

Agreed 2026-11-04. Managing packages is an application of its own
(`pkgm`, code in `pear-full-square`), not part of HAICC: HAICC uses it
through its provider. The packages are its data: `haiccing/base-package-<name>`,
**self-contained**: each holds its code, ready to run, with its tests.
Nothing is assembled at use, so nothing has to be pinned: a package is
taken as its repository has it (the latest). The development repository
writes a package's code into its repository when its modules change and
the package's tests pass.

**Booting** (agreed with the human, 2026-11-05; it replaces the stages
written before):

- **A folder of `haiccing` repositories side by side**, as in the
  organisation, is the starting point: at least `base-package-haicc` and
  `base-package-pkgm`, with the packages a project needs beside them. It
  may be a clone of each, or a plain folder copy: nothing in booting
  relies on git.
- **Boot is only between HAICC and the package manager.** Their two
  packages each carry a boot, in plain shell:
  - **HAICC's boot** (`base-package-haicc`): the host's prerequisites
    (step 0, below);
  - **the package manager's boot** (`base-package-pkgm`): installs the
    package manager into the host's install folder.
- **What a kick runs**:
  - kicking the package manager (its shell script): HAICC's boot, then
    the package manager's boot and install; then it exits;
  - kicking HAICC (its shell script): HAICC's boot, the package manager's
    boot, the package manager's install, then HAICC's install (by the
    package manager); then it exits. `haicc` is then available
    (`~/.haicc/bin/haicc`).
- **A higher-level package** (a demo project, any `haiccing` repository
  above them) has no boot: its script kicks HAICC if HAICC is not
  installed yet, assuming its prerequisite repositories are its siblings
  in the folder, and then calls HAICC the proper way (`haicc run
  <project>`, `haicc install <package>`), which installs and runs what
  it needs through the package manager.
- **Idempotent**: a kick finding the package manager or HAICC installed
  and current skips to what is left.
- **Missing siblings are said, not guessed**: which repository is missing
  from the folder, and where to get it; fetching from the organisation
  with git is an explicit option.

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

## The work folder, one route, a double boot (agreed 2026-11-05, revised 2026-11-06)

**Decided by the human, 2026-11-06, over what follows: no hidden folders, full
stop.** "It doesn't make sense to have visible state change in a hidden
folder." Done (2026-11-06): `install/` and `log/`, below; `.haicc`
elsewhere in this note is the history it replaced.

```
<work>/
  haicc                 the launcher: ./haicc <command>
  haiccing/             boot (the stub), sources, [install], the repositories
  install/              the root install: node/, haicc-base-boot/
  log/                  the log: haicc.log (the setup's, the boot's, every command's)
  manager/              the swarm: self-contained (next: haicc boot <manager>)
```

- **The setup** is a release of `base-package-haicc`: a self-extracting
  shell archive (`haicc-setup.sh`: `sh` and `tar` only) extracting
  `haiccing/boot`, `haiccing/sources`, `haiccing/base-package-haicc/`.
- **Stage 1, `haiccing/boot`** (shell, before Node.js): only what HAICC
  needs to run: Linux x86-64 and Node.js (fixed with a yes, into
  `install/node`); the root's part of HAICC, `haicc-base-boot`, copied into
  `install/` at the first boot only (versions later); `./haicc` written;
  then stage 2.
- **Stage 2, `./haicc boot`** (the root's HAICC): the host's other
  prerequisites, git and Docker Engine (installed, running, rootful,
  native, the user in its group), checked and fixed with a yes; then
  `haiccing/install` (one `./haicc` command a line), or the next commands.
- **The root is `haicc-base-boot` alone** (76 KB, Node.js built-ins):
  the boot, `fetch`, `list` (the managers), `boot <manager>` (next). No
  package manager, no engine, no deployments: those are the managers'.
  Dependencies are only between `haiccing` repositories, so the root
  depends on nothing: its host checks are its own copy of
  `haicc-reconcile`'s machine kinds, a test keeping the two agreeing.
- **HAICC runs on Node.js alone**: its package requires only `pkgm`. Its
  records are files (journals, JSON lines); its name check its own (a URI
  part). Topics are not HAICC's: a sync into topics is a separate process,
  installed into a swarm, later.
- **The log is what a command prints**: stdout and stderr appended to
  `log/haicc.log` in order, from the setup on, a header line and a close line per
  command; files of 10 KB, rotated as a command starts (whole commands a
  file). Levels: normal (the state changes and the outcome), `--verbose`,
  `--debug`. Every visible state change is printed.
- **No hidden folders** (the human, 2026-11-06): `install/`, `log/`; an
  install's registry `pkgm/`; the owner's mark `haicc-owner`; no
  temporary dot-files. A manager has the same shape: `<manager>/install/`,
  `<manager>/log/`.
- **The setup** logs too, from its first line; set up again over the same
  setup it says so (exit 0), over another it names both and says to use a
  new folder (exit 1). The published commands are one command joined with
  `&&`, `curl` retrying. Where the log is, the instructions say.
- **Each swarm self-contained** (the manager boot, next): HAICC installed
  in the manager too, with the swarm's packages; processes there resolve
  their modules from the manager's folder; the manager's HAICC logs locally,
  echoed back to the root's or not (a config). The master's manager folder
  syncs its packages into the swarm; a node's are synced from the swarm into
  its manager folder (the p2p version).

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
| `third-party` | 144 MB as imported (part 1), 1,822 files: Bare's runtime 97 MB (with debug information; left out of this first measure), and native binaries 30.5 MB (`rocksdb-native` 19.5 MB, `sodium-native` 2.1 MB, `udx-native` 0.5 MB, the `bare-*` modules), React, react-dom and htm 5.0 MB, other JavaScript about 5 MB |

An update adds only the files that changed: our modules a few KB; the
third-party package only at an import, and only the modules whose versions
changed. The `mycelium-*` modules' separate installs held another 24 MB of
duplicates (a second Corestore, Hyperdrive, isomorphic-git, `rocksdb-native`,
`p2p-git`): gone once they join the one workspace.

**Step 0, the host's prerequisites** (agreed 2026-11-05): HAICC's boot, in
plain shell, before Node exists.
- `check`: each prerequisite with the version found, the version
  required, ok or not, and what `fix` would do; it changes nothing. The
  required versions in one file, read by check and fix alike: Linux
  x86-64; Node.js 22 or later; git 2.25 or later; Docker Engine, rootful,
  native, running; the user in the `docker` group. All needed to boot:
  nodes always run in Docker containers. (The shell twin of
  `haicc-reconcile`'s machine providers.)
- `fix`, only with the human's yes, asking before anything needing
  `sudo`: Node.js, the official release for Linux x64, into a folder of
  ours (`~/.haicc/node`, no `sudo`; Ubuntu's own is too old); git with
  `apt`; Docker Engine with `apt`, the `docker` group, the daemon started
  (saying what needs a new login); checked again after each fix.
- Bare is not a host prerequisite: its runtime comes in `third-party`,
  and the node image takes it from there.

**From scratch**: each `haiccing` repository's readme gives a script for a
bare machine with only `curl` and `tar`: the repositories needed fetched
as archives and unpacked side by side, then the kick. Since code then
comes from the install folder rather than a git tree, the node image is
built from a folder too.

**Names**: the boots' and the package manager's code in
`pear-full-square/pkgm-base-boot` and `pkgm-base-manager` (the human,
leaving room for more sophisticated versions); HAICC's boot with HAICC's
code in `pear-full-square` (a `haicc-` module). The packages:
`haiccing/base-package-haicc` (the entry), `-pkgm`, `-third-party`,
`-p2p`, `-mycelium`, `-splectral`.

**Other aspects of booting**:
- **one install folder on the host** (`~/.haicc/packages`), shared by
  projects, laid out fully qualified (see "Folders on a machine");
- **whole or nothing**: a package installed into a temporary folder and
  moved in place, so a failed install leaves no half package;
- **the platform**: `third-party` for the host's platform;
- **the boots kept tiny and stable** (plain shell; they say their
  version);
- **no secrets**: boot never touches a vault;
- **trust**: today the repositories as they are; later signed releases
  (Pear);
- later, a node's own boot could use the same package code.

## Cascading click and runs

Every layer is a `haiccing` project, a click and run of its own, whose
prerequisites (other projects, strict or not) are a state reconciled like
any requirement. Bootstrapping and layering, one step at a time: `start`
on a project brings up the layers below it. The click and run is a
project's script: it kicks HAICC if needed (booting), then `haicc run
<project>`: deploy and start what the project needs, open the browser; the lifecycle verbs (`deploy`, `start`, `stop`,
`teardown`) stay for each step on its own.

1. a workspace: the packages a project needs, installed by the package
   manager from their side-by-side repositories (no npm);
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
