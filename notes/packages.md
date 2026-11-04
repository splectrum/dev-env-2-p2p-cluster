# Packages and cascading click and runs

Agreed with the human, 2026-11-04. Design, not built yet: the direction
for the next phase.

## Packages

A package is a set of modules referenced as one unit. Projects reference
packages; nothing depends on outside software once a package is made.

| Package | Holds |
|---|---|
| `third-party` | below mycelium, not ours: bare and holepunch, git (isomorphic-git, p2p-git), react and htm; changes only by a recorded import |
| `p2p` | below mycelium, ours: the p2p substrate (the series, rns, mrepo, the node, the managers) |
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

## Cascading click and runs

Every layer is a `haiccing` project, a click and run of its own, whose
prerequisites (other projects, strict or not) are a state reconciled like
any requirement. Bootstrapping and layering, one step at a time: `start`
on a project brings up the layers below it.

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
