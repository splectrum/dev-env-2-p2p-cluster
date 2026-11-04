# Part 2: the packages

**Done** (written here; their repositories published by the local agent,
`notes/handover-packages.md`, since this session cannot push to
`haiccing`). Defined in `packages.json` at the root; written by the package
manager (part 1), each self-contained, with its tests, tested within the
package before it is written.

| Repository | Package | Requires | Holds |
|---|---|---|---|
| `haiccing/base-package-third-party` | `third-party` | | the import (192 modules, Linux x64), `third-party.json` |
| `haiccing/base-package-mycelium` | `mycelium` | third-party | `mycelium-*` and `p2p-git` |
| `haiccing/base-package-haicc` | `haicc` | mycelium | `haicc-reconcile`, `haicc-deployment`, `haicc-base-boot`; `kick.sh` |
| `haiccing/base-package-pkgm` | `pkgm` | | `pkgm-base-manager`, `pkgm-base-boot`; `kick.sh` |
| `haiccing/base-package-p2p` | `p2p` | mycelium, haicc | the `p2p-*` modules |
| `haiccing/base-package-splectral` | `splectral` | p2p | the `splectral-*` modules and `splectral/base-view-map` |
| `haiccing/base-demo-liveness` | `demo-liveness` | splectral | `project.json`, `splectral/base-demo-liveness`, `run.sh` |
| `haiccing/base-demo-other-host` | `demo-other-host` | splectral | `project.json`, `splectral/base-demo-other-host`, `run.sh` |

**Findings.**
- **The demo projects are packages too**: self-contained, each carrying
  its Splectral component and its click and run. Their repositories are
  `base-<name>` (`findPackage` takes `base-package-<name>` or
  `base-<name>`); a project's own readme kept (the definition's `root`
  files); written from `haiccing/<project>` here, no longer split.
- **`splectral/base-view-map` is in the `splectral` package**: both demos
  use it, and a folder is one package's only.
- **A package's own tests are in its hash** (with its root files), so a
  change to them is a new version.
- A project's code paths are `{packages}` (the install folder; here, the
  root); its `packages` say what to install. The global Bare requirement
  is gone from the projects: Bare comes in `third-party` (and, for a
  development tree's image, from the workspace).
