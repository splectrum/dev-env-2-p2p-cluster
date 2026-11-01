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

Still waiting for their repositories: `p2p-rns`, `p2p-mrepo`. Recorded in
`notes/products.md`.
