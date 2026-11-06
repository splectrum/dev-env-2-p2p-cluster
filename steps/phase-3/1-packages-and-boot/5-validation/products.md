# Phase 3, step 1's products

From dev `7aead0e` (`main`, after the validation), splits of
`pear-full-square/<module>`. Each product equals its folder but for its
LICENSE; every push verified.

| Module | Repository | Split head | Product commit | |
|---|---|---|---|---|
| `pkgm-base-manager` | `pear-full-square/pkgm-base-manager` | `201b674` | `6f016fe` | first merge |
| `pkgm-base-boot` | `pear-full-square/pkgm-base-boot` | `a647426` | `1faee97` | first merge |
| `haicc-base-boot` | `pear-full-square/haicc-base-boot` | `89ce935` | `a36c4ae` | first merge |
| `haicc-deployment` | `pear-full-square/haicc-deployment` | `ff2b879` | `c28e66c` | |
| `p2p-node-manager` | `pear-full-square/p2p-node-manager` | `2add015` | `5e3f78b` | |
| `splectral-shell` | `pear-full-square/splectral-shell` | `af24709` | `8c5775f` | |
| `mycelium-git` | `pear-full-square/mycelium-git` | `5a16c54` | `cd9b371` | part 0's changes too (`p2p-git` at its latest, its own lockfile gone); joined (a shallow clone) |
| `p2p-mrepo` | `pear-full-square/p2p-mrepo` | `b280dc1` | `7870720` | part 0's change too (`p2p-git` at its latest); joined |

| `mycelium-layer` | `pear-full-square/mycelium-layer` | `c9ec50b` | `c0d5b8c` | first merge (created by the human; description updated) |
| `mycelium-repo` | `pear-full-square/mycelium-repo` | `61de898` | `cf733c9` | first merge (created by the human; description updated) |

`mycelium-xpath` already equals its folder. Not here:
- **The `haiccing` repositories**, written by the package manager from dev
  `e146c4c`: the six packages pushed from the session
  (`base-package-haicc` `505f0e3`, `-pkgm` `5d9edc7`, `-third-party`
  `4144c11`, `-mycelium` `853c91a`, `-p2p` `0771ec3`, `-splectral`
  `db6c4c7`), each GitHub archive identical to what was written, exec bits
  included. The two demo projects by the local agent
  (`notes/handover-packages.md`): their names are held in the session by
  `splectral/base-demo-*`.

**The two demos (2026-11-05)**, by the local agent from dev `9c480c8`:
`base-demo-liveness` `9e7bb75`, `base-demo-other-host` `feed429`
(`local-run.md`).

**Then (2026-11-05)**: Docker needed to boot, and the import's record
without its date. Products: `haicc-base-boot` `8ca71ed`,
`pkgm-base-manager` `42e2d46`; packages republished:
`base-package-haicc` `2ae6588`, `base-package-pkgm` `d1394c6`,
`base-package-third-party` `bc26ec9` (its record only; its content hash
unchanged).

**Part 6 (2026-11-05)**: products `haicc-base-boot` `c921567`,
`haicc-deployment` `0b70c09`, `pkgm-base-manager` `456e1d4`; packages
`base-package-haicc` `9c0539a`, `base-package-pkgm` `bc0f8ed` (written
from dev `55b9829`; the readmes changed since the self-test's write). The
demos and the setup's release: the local agent. `pkgm-base-boot`: retired,
to archive (the human).

**Part 7 (2026-11-05)**, a node's shutdown: products `p2p-swarm-manager`
`561c633`, `splectral-p2p-actions` `d420d44`, `splectral-scenario` `bbe2908`;
packages `base-package-p2p` `c71fb51`, `base-package-splectral` `5fcf3d7`
(from dev `5414ae5`). The demos (their readmes) with the local agent.

**The fourth release (2026-11-06)**, the boot 0.5.0, no hidden folders, by the
local agent from dev `0a014eb`: products `haicc-base-boot` `6012226`,
`haicc-reconcile` `86fbe8f`, `haicc-deployment` `d10db18`, `pkgm-base-manager`
`06f3859` (the count of tests with it), `p2p-swarm-manager` `1db49a3`,
`p2p-node-manager` `7eb9303`; packages `base-package-haicc` `68a0f10`, `-pkgm`
`19428a8`, `-p2p` `ec317ca`, `base-demo-liveness` `5d340fc`,
`base-demo-other-host` `85dc0a0` (the other three unchanged); the setup's
release `setup-47f2b29b0194`; `haiccing/.github` `7d6acf7`.

**The third release (2026-11-06)**, the boot 0.4.2, by the local agent from
dev `6c756d7`: product `haicc-base-boot` `b3eef86` (split `2f44fd2`), package
`base-package-haicc` `d816572` alone; the setup's release
`setup-b8c4a67a5e83`; `haiccing/.github` `abab769`.

**The second release (2026-11-06)**, the boot 0.4.1, by the local agent from
dev `ba9c12a`: product `haicc-base-boot` `229a816` (split `6115008`), package
`base-package-haicc` `d4b7c29` alone (`pkgm write --only=haicc`), the demos
left as they are; the setup's release `setup-58fb397be615`; `haiccing/.github`
`f9649d3`.

**The root boot (2026-11-06)**: products `haicc-base-boot` `06d69bb`,
`haicc-deployment` `98fcc76`, `haicc-reconcile` `1362fe7`,
`pkgm-base-manager` `67b92e0`; packages (from dev `e4ffd70`; every readme
by the new template) `base-package-haicc` `90fe587`, `-pkgm` `59002ac`,
`-third-party` `b001bdb`, `-mycelium` `49d5ac5`, `-p2p` `c01fd3f`,
`-splectral` `137141f`. The setup built: `haicc-setup.sh`, base-package-haicc
`96cfc58bc18f`, 34 KB; its release and the demos: the local agent.
