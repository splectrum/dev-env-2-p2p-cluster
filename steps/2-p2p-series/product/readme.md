# Part: the product repositories

**Scope.** `pear-full-square/p2p-store`, `p2p-dht`, `p2p-connect`,
`p2p-replicate`, `p2p-channel`, each from its folder: history split
(`git subtree split`) and merged into the product's `main` with a plain
merge, never a force-push; the merge names the dev commit,
`notes/products.md` the product commit.

**Record** (2026-10-31): from dev `adbbc29`, each a plain merge pushed to
`main`, joining the repository's initial commit (its LICENSE) to the
folder's split history:

| Module | Split head | Product commit |
|---|---|---|
| `p2p-store` | `46b9917` | `ec382f5` |
| `p2p-dht` | `7c9fe2d` | `6b1f41b` |
| `p2p-connect` | `6efb963` | `a26b020` |
| `p2p-replicate` | `eb1d14f` | `0b46561` |
| `p2p-channel` | `cca62fd` | `c4fb7c7` |

Recorded in `notes/products.md`. The modules' development dependencies on
each other resolve only in the dev repository's workspace (noted there).
