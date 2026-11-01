# Part: validation

**Scope.** The new modules' unit tests, then a swarm from zero, end to end
(`genesis.sh <work> <record> <phase>`, each phase a case):

1. `genesis`: the swarm manager builds the images and the swarm's internal
   network, generates the master's secret in the vault and starts its node
   manager; the master runs genesis and is ready;
2. `status`: p2p-rns asked from the host, as a peer of the swarm;
3. `read`: the master's packages resolved by URI and read from a replica;
4. `restart`: the master restarted by its node manager, with a fresh store
   (in RAM, so nothing survives but the vault's key);
5. `status-after-restart`, `read-after-restart`: the same answers;
6. `stop`: a graceful stop; the managers' records copied here, and checked
   for the secret.

**Expectation.** Every case exits 0; the master's resources resolved by
URI; a read loads a small part of the packages; the restarted master has
the same identity, packages key, commit and id; it stops with exit 0; no
secret in the records.

**Record**: `record/`: `results.jsonl`, `unit.json`, `genesis-swarm/` (the
swarm manager's record), `genesis-master/` (the node manager's record and
the master's own log). The vault is not copied.

**Findings** (record of 2026-11-01, dev `e473305`; 11 cases, all exit 0):

- **Unit tests:** p2p-rns 3, p2p-node 2, p2p-node-manager 1, p2p-mrepo 24:
  all pass.
- **Genesis**, from zero: images, network, vault, node manager, the master
  ready in 16.8 s (the packages: 3,603 files of code imported, as
  deployed, into `capability/default` at commit `ab2e159`).
- **From the host, by URI**: p2p-rns answered with `/genesis/master` and
  its two resources, `/genesis/master/node` and `/genesis/master/packages`,
  in 50 to 62 ms, each with its key and internal id.
- **Lazily**: reading one file of the packages (`p2p-node/package.json`)
  from a replica took 109 blocks, 31 KB, of 2,217 index blocks and
  2,383 blobs (13.7 MB), in 177 ms.
- **The restart** (a fresh store in RAM; only the vault's key survives):
  ready again in 9.5 s with the **same identity** (`faab5d5b…`), the same
  packages key (`94b7ff6e…`), commit (`ab2e159`) and internal id
  (`bf4739b9…`); the same answers by URI after it.
- **The stop**: graceful (SIGTERM through the node manager), exit 0, its
  final metrics in the node's log.
- **No secret in the records**: the vault's key was searched for in every
  file copied here, and not found.
- **The audit**: the node manager's record has, per run, starting, the
  secret handed over (via stdin), ready, stopping, the container's exit
  and stopped; the master's own log (86 lines) has every module's events:
  store, DHT nodes, connections, replication, channels, repositories,
  names, genesis, metrics, stop. No resource samples: each run lived less
  than the 15 s sampling interval.
