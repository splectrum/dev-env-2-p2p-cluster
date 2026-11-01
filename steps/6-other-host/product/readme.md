# Part: the product repositories

Changed in this step: `p2p-node-manager` (joining from an invitation) and
`p2p-swarm-manager` (the invitation; status telling controlled from not;
its first test). From dev `a73df80`, each a plain merge pushed to `main`
(the previous split head an ancestor of the new):

| Module | Split head | Product commit |
|---|---|---|
| `p2p-node-manager` | `bc89e73` | `bf52040` |
| `p2p-swarm-manager` | `96d7b83` | `7e6a79b` |

`p2p-node` (unchanged in this step, its repository newly made): its first
merge, from dev `0d5537d`, split head `1a9977e`, product commit `a554890`
(unrelated histories joined, the repository's LICENSE kept).

`p2p-rns` and `p2p-mrepo` (unchanged in this step, their repositories
newly made): first merges from dev `596e314`, split heads `f9b1984` and
`7a42c53`, product commits `30d9186` and `a5b8ba1`. Every module now has its
product repository. Recorded in `notes/products.md`.
