# Step 9's products

From dev `223f095` (`main`, after the validation), splits of
`pear-full-square/<module>`. The two `haicc-*` products: their first merge.
The eight changed: one join after the move to `<org>/<repo>` folders
(`--allow-unrelated-histories`, the split's side taken; their histories
before the move, the human's call, not carried); plain merges after. Each
product equals its folder but for its LICENSE. Every push verified.

| Module | Repository | Split head | Product commit | |
|---|---|---|---|---|
| `haicc-reconcile` | `pear-full-square/haicc-reconcile` | `ba4dc72` | `7027f90` | first merge |
| `haicc-deployment` | `pear-full-square/haicc-deployment` | `2ed68d1` | `d6aa76f` | first merge |
| `p2p-node-manager` | `pear-full-square/p2p-node-manager` | `58640c2` | `d03a27b` | join after the move |
| `p2p-node` | `pear-full-square/p2p-node` | `995e920` | `56f64ca` | join after the move |
| `p2p-swarm-manager` | `pear-full-square/p2p-swarm-manager` | `4ac1f77` | `eac0736` | join after the move |
| `splectral-p2p-actions` | `pear-full-square/splectral-p2p-actions` | `66518b6` | `cb7619a` | join after the move |
| `splectral-scenario` | `pear-full-square/splectral-scenario` | `018500b` | `897a21b` | join after the move |
| `splectral-server` | `pear-full-square/splectral-server` | `dc0adaf` | `91c3436` | join after the move |
| `splectral-shell` | `pear-full-square/splectral-shell` | `bcec5e3` | `503f52d` | join after the move |
| `splectral-transport` | `pear-full-square/splectral-transport` | `4efc1c4` | `4892096` | join after the move |

**Waiting: the projects** `haiccing/base-demo-liveness` and
`haiccing/base-demo-other-host`. This cloud session cannot attach them:
it checks repositories out by name, and the `splectral` components of the
same names are attached. Their first merge, from a session started with
them as sources, or by hand on a machine with access:

```bash
git -C dev-env-2-p2p-cluster subtree split --prefix=haiccing/base-demo-liveness -b split-liveness
```

```bash
git clone https://github.com/haiccing/base-demo-liveness && cd base-demo-liveness && git pull --allow-unrelated-histories --no-edit ../dev-env-2-p2p-cluster split-liveness && git push origin main
```

(the same for `base-demo-other-host`).
