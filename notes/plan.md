# Phase 2: plan

Status: **proposed, 2026-10-31**. The request's phase, reworked along the
design (`node-pattern.md`; `multi-swarm.md` stays vision). Step by step,
one thin path end to end before generalising; each step is a request whose
execution is recorded, with metrics at the boundary, and nothing moves on
before its step is validated. Where a step settles a design choice, the
rules follow (`rules.md`): the rules constrain the implementation.

## The layers being built

A **swarm** is the cluster: the set of nodes joined over the p2p layer.
"Host" means the host machine only. All our modules are in
`pear-full-square`; from the top down:

| Layer | Modules | Concern |
|---|---|---|
| management, on the host machine | `p2p-node-manager`, `p2p-swarm-manager` | a node; the swarm (the nodes it controls, priming, genesis): starting, provisioning, monitoring, recording |
| the node | the node application | the node repository in operation; composes the layers below |
| entities | the p2p layer's repository and naming module (name open) | swarms, nodes and their repositories as entities with URIs and friendly names, offered to mycelium through its contracts |
| the data fabric | mycelium (`mycelium-uri`, `-xpath`, `-git`, `-layer`, `-repo`) | repositories and their rules over contracts (a backend, repositories it can reach, an inbox, entities); p2p-git is one engine; knows nothing of p2p |
| git on Hypercore | `p2p-git` | git objects and refs on a Hyperdrive (its `hyperdrive-fs`) |
| the p2p series | `p2p-store`, `p2p-dht`, `p2p-connect`, `p2p-replicate`, `p2p-channel` | storage, discovery, connections, replication, messages; no git, no repositories, no management |
| Holepunch | Hypercore, Corestore, Hyperdrive, Hyperswarm, HyperDHT | storage, replication, discovery |

Managing happens only at the top, in the two managers; everything below is
mechanism.

## Steps

### 0. Probes (local, small)

1. What Corestore and Hypercore persist when the primary key is passed in
   at open: does a secret reach the disk?
2. A container (plain base, Bare) joining a DHT and a node on the host,
   over an internal network.
3. A Hyperdrive opened writable with an explicit keypair.

They decide whether "secrets in memory only" and the auxiliary swarm
hold as designed.

### 1. Mycelium back to its own concern

- mycelium-git returns to the backend contract over a given filesystem:
  `openHyperdrive`, the Hyperdrive engine and the Corestore and Hyperdrive
  dependencies leave it (their tests move down with them).
- git on a Hyperdrive sits below, in p2p-git: its Hyperdrive adapter
  (`hyperdrive-fs`) is what makes it p2p, so it stays there.
- The product repository `pear-full-square/mycelium-git` is updated.

### 2. The p2p series

The p2p layer is a series of modules, one concern each:

| Module | Concern | Capability |
|---|---|---|
| `p2p-store` | local storage: the Corestore opened with a given primary key (nothing secret on disk), resources by name or key, explicit keypairs; works with no peer at all | `state/hyperdrive` |
| `p2p-dht` | discovery: a persistent DHT node, a private DHT's bootstrap (two persistent nodes at least), announce and lookup | `p2p/discover` |
| `p2p-connect` | connections: the server on the node's keypair, outgoing connections, the membership hook; yields encrypted streams | `p2p/connect` |
| `p2p-replicate` | moving data between stores: which resources may replicate to which peers (policy: knowing a key is otherwise enough), accounting per peer and resource, explicit transfers (hold, pin, prefetch, mirror), over any stream (a connection, a pipe, a socket) | `p2p/replicate` |
| `p2p-channel` | messages on a connection, not stored: the secret handover, later dedicated channels | (new) |
| `p2p-git` | git on a Hyperdrive (its `hyperdrive-fs`) | `state/hyperdrive` |

- Each is usable alone or in combination: a repository with no network
  uses `p2p-store` alone; mobile and the auxiliary link use the store,
  replication and channels over a pipe or socket; a full node uses all of
  them. No module
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
- `p2p-git` has moved from `bare-for-pear` to `pear-full-square` with the
  series; mycelium-git's dependency follows (step 1).
- Validated: two peers on one machine, then one on the host machine and
  one in a container; the audit and metrics of each recorded.

### 3. Repositories as entities on the p2p layer

Mycelium knows nothing of p2p: it works with entities (repositories, nodes,
the swarm) through contracts it defines; the p2p layer implements them
(`node-pattern.md`, entities and names).

- In mycelium: the contracts (repositories it can reach: create, open by
  identity, clone with origin, list; the inbox; entities as identities)
  and validating entity URIs (mycelium-uri).
- In the p2p layer: create an instance (its keypair, owned by its node),
  import one from the boundary (a bundle or a native repository), open one
  by identity, clone; reopen on start; names resolved to keys.
- The contract suite and the command set on an instance and on a replica
  (reads).
- **Test-run instances on Hypercore**: the test-run model's instances are
  repositories on the p2p layer, executed under Bare. This completes the
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
- `p2p-node-manager` on the host machine: starts the container, provisions it
  through the auxiliary swarm (the secret into memory from the vault,
  an encrypted file first; packages by replication), monitors it (logs,
  lifecycle events, resource samples) and records it; graceful stop,
  restart, rebuild.

### 7. Genesis and join

- `p2p-swarm-manager`, controlling the seed: genesis from non-P2P
  repositories, the first DHT, the capability store primed.
- A node manager starting a node that joins; a node on another host
  joining under its own manager.
- The swarm's record, reached through requests.

## The request's done, mapped

| Request's done | Where |
|---|---|
| 1. contract suite and test-run model on a persisted Hyperdrive under Bare | steps 1 and 3 |
| 2. two Bare nodes in containers, Hyperswarm, a replicated repository | steps 2, 3 and 6 |
| 3. a node from a plain Bare base through a bootstrap repository, packages loaded lazily | steps 5 and 6 |
| 4. a deployment repository bringing up a seed and a joining node, recording them | step 7 (`p2p-swarm-manager` and its record) |
| 5. every step recorded and rerunnable, metrics at the boundary, small runs | every step; small runs with step 5 |

## Not in this phase

The vision in `multi-swarm.md` (boot, management and destination
memberships as separate swarms, closed-box devices), mobile, streaming
channels, zero knowledge, AVRO and Kafka.

## Needs the human

- Created in `pear-full-square`: `p2p-store`, `p2p-dht`, `p2p-connect`,
  `p2p-replicate`, `p2p-channel`, `p2p-node-manager`,
  `p2p-swarm-manager`; `p2p-git` moved there. Still to name and create:
  the p2p layer's repository and naming module (step 3).
  `pear-full-square/p2p-swarm` was created before the connections module
  was renamed `p2p-connect`, and is unused.
- Open in step 2: where audit goes (proposed: an append-only, signed core
  per node, replicated to its node manager over the management plane;
  facts only, never secrets) and how detailed it is.
