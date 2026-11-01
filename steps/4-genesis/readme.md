# Step 4. The swarm: genesis

Status: **done** (2026-11-01); the product repositories of `p2p-rns` and
`p2p-node` merged after step 6 (`notes/products.md`).
Request: `pending/phase-2/step-4-genesis/request.md` on `pending/default`.
Scope: `notes/plan.md`, step 4.

| Part | What | Record |
|---|---|---|
| `rns/` | `p2p-rns`, in code | unit tests in `validation/record/` |
| `node/` | `p2p-node`, the node application, master role | unit tests; the master's log in `validation/record/genesis-master/` |
| `image/` | `bare-base` and `p2p-node:<commit>` | built by genesis |
| `node-manager/` | `p2p-node-manager`, minimal, with the vault stand-in | `validation/record/genesis-master/manager.jsonl` |
| `swarm-manager/` | `p2p-swarm-manager`, minimal | `validation/record/genesis-swarm/` |
| `validation/` | genesis end to end | `validation/record/` |
| `product/` | the product repositories | `product/readme.md`, `notes/products.md` |

## The thin path, as built

- The master's code comes in its image (the join closure); provisioning
  code by replication through the auxiliary swarm is step 5's.
- Its secret comes from the vault on its stdin, into memory; the vault is
  a stand-in (an owner-only file, outside every repository, not yet
  encrypted).
- One network: the swarm's, internal; the host reaches it at its gateway.
- Genesis primes the packages by importing the image's code tree into a
  repository, reproducibly.
