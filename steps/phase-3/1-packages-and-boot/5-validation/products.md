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
