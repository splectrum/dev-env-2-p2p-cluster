# Part 4: the demo projects' scripts, `haicc run`, `haicc test`

**Done**: `haicc-deployment/haicc.js`, the installed command
(`~/.haicc/bin/haicc`), and each demo's `run.sh` (HAICC's, copied in).

- `sh base-demo-<name>/run.sh`: HAICC kicked if not installed, then
  `haicc run <its folder>`.
- `haicc run <project>`: its packages installed (from its siblings),
  deployed and started, the browser opened (`--no-open` prints it).
- `haicc test <project>`: its packages' tests within the package, its
  state as declared (running, every requirement met), and each address it
  serves answering 200.
- `haicc check|deploy|start|stop|teardown|status|reconcile <project>`,
  `install <package>`, `list`, `version`. A project is a folder, or its
  name beside the packages HAICC came from.
- In a project: `{packages}`, and its `packages`, reconciled as `package`
  requirements (the package manager's provider) first in its
  configuration; teardown removes its own package, not the ones under it.
- In the development repository, `sh haicc` runs the projects from its
  root as before (`HAICC_PACKAGES` the root, no package installs).
