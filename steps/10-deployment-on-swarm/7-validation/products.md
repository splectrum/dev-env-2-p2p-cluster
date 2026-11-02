# Step 10's products

From dev `dfec81a` (`main`, after the validation), splits of
`pear-full-square/<module>`. Plain merges, but `splectral-p2p-observer`
(its first change since the move: one join, no file lost). Each product
equals its folder but for its LICENSE. Every push verified.

| Module | Repository | Split head | Product commit |
|---|---|---|---|
| `p2p-node` | `pear-full-square/p2p-node` | `2ed8d8f` | `06d6be7` |
| `p2p-node-manager` | `pear-full-square/p2p-node-manager` | `19aae3b` | `5564d36` |
| `p2p-swarm-manager` | `pear-full-square/p2p-swarm-manager` | `fdc428b` | `61b942f` |
| `haicc-reconcile` | `pear-full-square/haicc-reconcile` | `0f575f4` | `880d7f5` |
| `splectral-p2p-observer` | `pear-full-square/splectral-p2p-observer` | `7d36df0` | `59fe1de` |

The `haiccing` projects changed too (their swarm part); their merges stay
with the local agent (`notes/handover-haiccing-merge.md`: the split takes
whatever `main` holds when it runs).
