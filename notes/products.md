# Product repositories

Each module's product repository follows its folder here: once validated,
the folder's history is split (`git subtree split`) and plain-merged into
the product repository's main. Recorded per update.

| Folder | Product repository | Dev commit | Split head | Product commit |
|---|---|---|---|---|
| `mycelium-git` | `pear-full-square/mycelium-git` | `eee62cc` | `693c5a5` | `3e021c4` |

- `mycelium-git` at `3e021c4`: this phase's folder started as a copy of
  phase 1's, so its split history was unrelated to the product's; the
  merge joins them (`--allow-unrelated-histories`), taking this folder's
  files, and keeps the product's LICENSE. Later splits merge plainly.
- `mycelium-uri`, `mycelium-xpath`: unchanged since phase 1
  (`dev-env-1-mycelium-git@33634de`); nothing to merge.
- `mycelium-node`: no product repository yet.
- `bare-for-pear/p2p-git`: used at `d7d154d`, which carries this phase's
  fixes; no further change needed.
