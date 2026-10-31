# Phase 2: plan

Status: **proposed, 2026-10-31**. The request's phase, reworked along the
design (`node-pattern.md`; `multi-cluster.md` stays vision). Step by step,
one thin path end to end before generalising; each step is a request whose
execution is recorded, with metrics at the boundary, and nothing moves on
before its step is validated. Where a step settles a design choice, the
rules follow (`rules.md`): the rules constrain the implementation.

## The layers being built

| Layer | Organisation | Concern |
|---|---|---|
| cluster manager, node manager | `pear-full-square` | management, on the host machine: starting, provisioning, monitoring, recording nodes |
| node application | `pear-full-square` | the node repository in operation |
| mycelium-p2p | `pear-full-square` | a mycelium repository instance on a peer |
| mycelium (uri, xpath, git, layer, repo) | `pear-full-square` | the data fabric: repositories over a backend contract |
| the p2p series: `p2p-store`, `p2p-dht`, `p2p-swarm`, `p2p-channel`, `p2p-git` | `pear-full-square` | every aspect of the p2p layer, inside a node's process, one concern per module, instrumented; no management |
| Hypercore, Corestore, Hyperdrive, Hyperswarm | Holepunch | storage, replication, discovery |

## Steps

### 0. Probes (local, small)

1. What Corestore and Hypercore persist when the primary key is passed in
   at open: does a secret reach the disk?
2. A container (plain base, Bare) joining a DHT and a node on the host,
   over an internal network.
3. A Hyperdrive opened writable with an explicit keypair.

They decide whether "secrets in memory only" and the auxiliary cluster
hold as designed.

### 1. Mycelium back to its own concern

- mycelium-git returns to the backend contract over a given filesystem:
  `openHyperdrive`, the Hyperdrive engine and the Corestore and Hyperdrive
  dependencies leave it (their tests move down with them).
- git on a Hyperdrive sits below, in p2p-git: its Hyperdrive adapter
  (`hyperdrive-fs`) is what makes it p2p, so it stays there.
- The product repository `pear-full-square/mycelium-git` is updated.

### 2. The p2p series

"Host" means the host machine only. The p2p layer is a series of modules,
one concern each (names proposed), in `pear-full-square`:

| Module | Concern | Capability |
|---|---|---|
| `p2p-store` | resources and their keys, locally: the Corestore opened with a given primary key (nothing secret on disk), resources by name or key, explicit keypairs, hold and pin, replication over any stream | `state/hyperdrive`, `p2p/replicate` |
| `p2p-dht` | discovery: a persistent DHT node, a private DHT's bootstrap (two persistent nodes at least), announce and lookup | `p2p/discover` |
| `p2p-swarm` | connections: the server on the node's keypair, outgoing connections, the membership hook; yields encrypted streams | `p2p/connect` |
| `p2p-channel` | messages on a connection, not stored: the secret handover, later dedicated channels | (new) |
| `p2p-git` | git on a Hyperdrive (its `hyperdrive-fs`) | `state/hyperdrive` |

- Each is usable alone or in combination: a repository with no network
  uses `p2p-store` alone; mobile and the auxiliary link use the store and
  channels over a pipe or socket; a full node uses all of them. No module
  composes the others: the application does.
- **Instrumentation and audit are part of every module**, by one shared
  contract: each module reports its activity as structured events (what,
  when, which peer key, which resource key, bytes, outcome) and counters,
  through an observer the application gives it. Never a secret, only facts
  about one (a secret was handed over, to which key). Two kinds:
  - **audit**: who did what (connections admitted or refused, resources
    created, opened, announced, held; keys handed over; membership
    changes), append-only;
  - **metrics**: counters and samples, summarised per interval, at the
    boundary.
- `p2p-git` moves from `bare-for-pear` to `pear-full-square` with the
  series (by the human: a transfer of the repository, or a new one taking
  its history with a plain merge); mycelium-git's dependency follows.
- Validated: two peers on one machine, then one on the host machine and
  one in a container; the audit and metrics of each recorded.

### 3. mycelium-p2p: repository instances on a peer

- Create an instance (its keypair), import one from the boundary (a bundle
  or a native repository), open one by key; reopen on start.
- The contract suite and the command set on an instance and on a replica
  (reads).
- **Test-run instances on Hypercore**: the test-run model's instances are
  mycelium-p2p instances, executed under Bare. This completes the
  request's first done item as intended.

### 4. Repository-to-repository talk

- The inbox (one writer core per writer, priority, internal or external),
  intake into `pending/default`, bundles as entries, exactly once,
  rejections answered; responses read from the replica.
- Validated: two repositories on two peers asking each other.

### 5. The capability store

- Multi-module packages: module instances stored once, a package a commit
  of gitlinks with one resolved dependency tree; the first package,
  `mycelium`, then the p2p series.
- Import at the boundary, validation by a test run (the evidence linked),
  availability; materialise for Bare from a replica.
- A repository's `capability/default` as gitlinks to packages, with the
  store's key.
- Kept runs get small: run instances hold links into the store.

### 6. The node

- The boot repository cloned live into the node's Corestore under its own
  key; the node repository in operation.
- Containerised and hardened, from the plain base with the join closure
  only.
- The node manager (`pear-full-square`) on the host machine: starts the container, provisions it
  through the auxiliary cluster (the secret into memory from the vault,
  an encrypted file first; packages by replication), monitors it (logs,
  lifecycle events, resource samples) and records it; graceful stop,
  restart, rebuild.

### 7. Genesis and join

- The cluster manager (`pear-full-square`), controlling the seed: genesis from non-P2P
  repositories, the first DHT, the capability store primed.
- A node manager starting a node that joins; a node on another host
  joining under its own manager.
- The cluster's record, reached through requests.

## The request's done, mapped

| Request's done | Where |
|---|---|
| 1. contract suite and test-run model on a persisted Hyperdrive under Bare | steps 1 and 3 |
| 2. two Bare nodes in containers, Hyperswarm, a replicated repository | steps 2, 3 and 6 |
| 3. a node from a plain Bare base through a bootstrap repository, packages loaded lazily | steps 5 and 6 |
| 4. a deployment repository bringing up a seed and a joining node, recording them | step 7 (the cluster manager and its record) |
| 5. every step recorded and rerunnable, metrics at the boundary, small runs | every step; small runs with step 5 |

## Not in this phase

The vision in `multi-cluster.md` (boot, management and destination
memberships as separate clusters, closed-box devices), mobile, streaming
channels, zero knowledge, AVRO and Kafka.

## Needs the human

- Repositories in `pear-full-square` for the p2p series (`p2p-store`,
  `p2p-dht`, `p2p-swarm`, `p2p-channel`; names proposed), mycelium-p2p,
  the node manager and the cluster manager; and `p2p-git` moved there from
  `bare-for-pear`. Until then they are folders here.
- Open in step 2: where audit goes (proposed: an append-only, signed core
  per node, replicated to its node manager over the management plane;
  facts only, never secrets) and how detailed it is.
