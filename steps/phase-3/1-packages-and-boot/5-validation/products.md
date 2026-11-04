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

`mycelium-xpath` already equals its folder. Not here:
- **`mycelium-layer`, `mycelium-repo`**: no product repository the session
  can see (to create, if they are to have one).
- **The `haiccing` repositories** (the six packages and the two demo
  projects, now written by the package manager): published by the local
  agent, `notes/handover-packages.md`.
