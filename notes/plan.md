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
| node application, cluster manager, node manager | `pear-full-square` (this repository first) | nodes and clusters, as repositories in operation |
| mycelium-p2p | `pear-full-square` | a mycelium repository instance on a host |
| mycelium (uri, xpath, git, layer, repo) | `pear-full-square` | the data fabric: repositories over a backend contract |
| the substrate: host, hyperdrive-fs | `bare-for-pear` | peers, resources, replication, transfer, metrics |
| p2p-git | `bare-for-pear` | git on any filesystem |
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
- git on a Hyperdrive sits below: `hyperdrive-fs` (a Hyperdrive as a
  filesystem) as its own module, or kept in p2p-git.
- The product repository `pear-full-square/mycelium-git` is updated.

### 2. The substrate: a host

- One host per process: one Corestore (its primary key given, not
  stored), one DHT node, one swarm, replication on every connection.
- Resources opened by name (own, a namespace) or by key (a replica),
  announced per resource; a private DHT for clusters (two persistent
  nodes); a membership hook (firewall); metrics per connection and per
  resource.
- Validated: two hosts on one machine, then a host and a container.

### 3. mycelium-p2p: repository instances on a host

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
- Validated: two repositories on two hosts asking each other.

### 5. The capability store

- Multi-module packages: module instances stored once, a package a commit
  of gitlinks with one resolved dependency tree; the first package,
  `mycelium`, then the substrate.
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
- The node manager on the host: starts the container, provisions it
  through the auxiliary cluster (the secret into memory from the vault,
  an encrypted file first; packages by replication), monitors it (logs,
  lifecycle events, resource samples) and records it; graceful stop,
  restart, rebuild.

### 7. Genesis and join

- The cluster manager, controlling the seed: genesis from non-P2P
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

- Repositories for new modules: `bare-for-pear` for the substrate (and
  `hyperdrive-fs`, if it becomes its own module), `pear-full-square` for
  mycelium-p2p. Until then they are folders here.
- The choice in step 1: `hyperdrive-fs` as its own module or kept in
  p2p-git.
