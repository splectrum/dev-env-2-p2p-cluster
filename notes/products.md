# Product repositories

Each module's product repository follows its folder here: once validated,
the folder's history is split (`git subtree split`) and plain-merged into
the product repository's main. Recorded per update.

| Folder | Product repository | Dev commit | Split head | Product commit |
|---|---|---|---|---|
| `mycelium-git` | `pear-full-square/mycelium-git` | `eee62cc` | `693c5a5` | `3e021c4` |
| `mycelium-git` | `pear-full-square/mycelium-git` | `f4b9d1d` | `1dd99c5` | `c97f3a0` |

- `mycelium-git` at `3e021c4`: this phase's folder started as a copy of
  phase 1's, so its split history was unrelated to the product's; the
  merge joins them (`--allow-unrelated-histories`), taking this folder's
  files, and keeps the product's LICENSE. Later splits merge plainly.
- `mycelium-git` at `c97f3a0` (step 1): back to its backend contract, p2p-git
  from `pear-full-square`, id `64072bc6-cb98-4383-9d48-480f5d119889`; a
  plain merge, the previous split head an ancestor of the new one.
- `mycelium-uri`, `mycelium-xpath`: unchanged since phase 1
  (`dev-env-1-mycelium-git@33634de`); nothing to merge.
- `mycelium-node`: the first build's module, removed in step 1; it never
  had a product repository.
- `p2p-git`: used at `d7d154d`, which carries this phase's fixes; now
  `pear-full-square/p2p-git` (below).

## The p2p series and the managers (2026-10-31)

All in `pear-full-square` (the design: `node-pattern.md`, `plan.md`):

| Module | Repository | State |
|---|---|---|
| `p2p-store` | `pear-full-square/p2p-store` | created, empty |
| `p2p-dht` | `pear-full-square/p2p-dht` | created, empty |
| `p2p-connect` | `pear-full-square/p2p-connect` | created, empty |
| `p2p-replicate` | `pear-full-square/p2p-replicate` | created, empty |
| `p2p-channel` | `pear-full-square/p2p-channel` | created, empty |
| `p2p-git` | `pear-full-square/p2p-git` | moved from `bare-for-pear/p2p-git`, `main` at `d7d154d`; mycelium-git's dependency names it since step 1 |
| `p2p-node-manager` | `pear-full-square/p2p-node-manager` | created, empty |
| `p2p-swarm-manager` | `pear-full-square/p2p-swarm-manager` | created, empty |
| `p2p-rns` | to create | the resource name service |

`pear-full-square/p2p-swarm` was created before the connections module
was named `p2p-connect`; it is unused.
