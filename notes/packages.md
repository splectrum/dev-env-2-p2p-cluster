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
  x64 first. Android arm64 next (below); only `third-party` has native code today.
- One root for now (this repository's workspace root, the modules side by
  side), with room to loosen later: each project deriving its own root,
  then products depending on each other by name rather than by path.

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
each a mycelium repository (git now): `main` its declaration and tests,
`capability/default` its assembled code, each assembly a commit recording
its modules' commits and any overrides.

The package manager needs packages itself, so it is booted in stages, as
a node is (`p2p-node/boot.js`):

1. **`pkgm-boot`**: simple, minimal dependencies (Node's built-ins and
   the git command line; nothing of ours but itself). It copies the code
   of the packages the proper package manager needs (their
   `capability/default`) into a folder on the host, checks each is the
   commit asked for, and runs the proper package manager from there with
   its dependencies. It builds nothing, and steps aside.
2. **The proper package manager** (`pkgm-base-*`, built on mycelium):
   assembling with overrides (an updated module tested within its
   package), the tests, the third-party import, fetching the remaining
   packages; its provider for HAICC's cascade.

Packages are built and tested in the development repository, with the
proper package manager run in place; elsewhere a machine only boots from
what was built there.

**Other aspects of booting** (to be designed with the first version):
- **its own prerequisites** (Node, git) checked by the boot itself, with
  hints: `haicc-reconcile` is not there yet;
- **where it fetches from**: the package repositories on GitHub by
  default; a local mirror (a folder, a git server on the LAN) for an
  air-gapped machine;
- **idempotent**: packages already on the host and current are not
  fetched again; a newer `capability/default` is (latest versions, for
  now);
- **whole or nothing**: a package fetched into a temporary folder and
  moved in place, so a failed boot leaves no half package;
- **one host folder of packages shared by projects** (`~/.haicc/packages`),
  each project's workspace using them;
- **the platform**: `third-party` for the host's platform;
- **the boot kept tiny and stable**: it is copied into every project that
  boots; it says its version, and a project can ask for a newer one;
- **no secrets**: the boot never touches a vault;
- **trust**: today the commit asked for; later signed releases (Pear);
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
