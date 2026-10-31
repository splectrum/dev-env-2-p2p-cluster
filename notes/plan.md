# Phase 2: plan

Status: **proposed, 2026-10-31**. The request's phase, reworked along the
design (`node-pattern.md`; `multi-swarm.md` stays vision). Step by step,
one thin path end to end before generalising; each step is a request whose
execution is recorded, with metrics at the boundary, and nothing moves on
before its step is validated. Where a step settles a design choice, the
rules follow (`rules.md`): the rules constrain the implementation.

**Start simple, prove viability, then move on.** We are going to build many
resources (the lookup, the swarm's record, request delivery, the capability
store, ...). Each comes **in code first**: plain code behind the contract
it will keep, enough to prove the pattern end to end. Its
**repository-based implementation** (a mycelium repository with inbox and
intake) comes further down the roadmap, behind the same contract, so what
uses it does not change.

## The layers being built

A **swarm** is the cluster: the set of nodes joined over the p2p layer.
"Host" means the host machine only. The **master node** is the swarm's
first node (the seed), controlled by the swarm manager. All our modules are
in `pear-full-square`; from the top down:

| Layer | Modules | Concern |
|---|---|---|
| management, on the host machine | `p2p-node-manager`, `p2p-swarm-manager` | a node; the swarm (the nodes it controls, priming, genesis): starting, provisioning, monitoring, recording |
| the node | the node application | the node repository in operation; composes the layers below |
| resources | the lookup, first (module open) | p2p-agnostic services for mycelium repositories, behind contracts mycelium defines |
| the data fabric | mycelium (`mycelium-uri`, `-xpath`, `-git`, `-layer`, `-repo`) | repositories and their rules over contracts; p2p-git is one engine; knows nothing of p2p |
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

They decide whether "secrets in memory only" and the auxiliary swarm hold
as designed.

### 1. Mycelium back to its own concern

- mycelium-git returns to the backend contract over a given filesystem:
  `openHyperdrive`, the Hyperdrive engine and the Corestore and Hyperdrive
  dependencies leave it (their tests move down with them). Its engine
  adapters, p2p-git's included, stay: it uses p2p-git as an engine and
  knows nothing of Hypercore.
- git on a Hyperdrive sits below, in p2p-git: its Hyperdrive adapter
  (`hyperdrive-fs`) is what makes it p2p.
- mycelium-git's dependency names `pear-full-square/p2p-git`.
- The product repository `pear-full-square/mycelium-git` is updated.

### 2. The p2p series, minimal and instrumented

| Module | Concern | Capability |
|---|---|---|
| `p2p-store` | local storage: the Corestore opened with a given primary key (nothing secret on disk), resources by name or key, explicit keypairs; works with no peer at all | `state/hyperdrive` |
| `p2p-dht` | discovery: a persistent DHT node, a private DHT's bootstrap (two persistent nodes at least), announce and lookup | `p2p/discover` |
| `p2p-connect` | connections: the server on the node's keypair, outgoing connections, the membership hook; yields encrypted streams | `p2p/connect` |
| `p2p-replicate` | moving data between stores: which resources may replicate to which peers, accounting per peer and resource, explicit transfers (hold, pin, prefetch, mirror), over any stream | `p2p/replicate` |
| `p2p-channel` | messages on a connection, not stored: the secret handover, requests and lookups in code, later dedicated channels | (new) |

- Each usable alone or in combination; the application composes them.
- **Instrumentation and audit in every module**, by one shared contract:
  structured events (what, when, which peer key, which resource key,
  bytes, outcome) and counters, through an observer the application gives
  it; never a secret, only facts about one. Audit (who did what,
  append-only) and metrics (summarised per interval).
- Only what the next steps need, first; more as they ask for it.
- Validated: two peers on one machine, then one on the host machine and
  one in a container; the audit and metrics of each recorded.

### 3. Repositories on the p2p layer

- Create a repository (its keypair, owned by its node), import one from
  the boundary (a bundle or a native repository), open one by key, clone
  (a new key, its origin recorded); reopen on start.
- The contract suite and the command set on a repository and on a replica
  (reads).
- **Test-run instances on Hypercore**, executed under Bare: this completes
  the request's first done item as intended.

### 4. The lookup, in code

- On the master node, in memory, for its lifetime only: register (owners
  only: a node under its own name; a node's name checked unique when it
  joins), resolve a URI (`/<swarm>/<node>/<name>/...`) to its internal id
  and key, list by URI pattern, reverse.
- Mycelium's contract for it; registrations and lookups carried as
  messages (`p2p-channel`), the sender's identity from the connection.
- Validated: nodes registering what they create, and resolving each
  other's repositories by URI.

### 5. The node and its manager

- The boot repository cloned live into the node's Corestore under its own
  key; the node repository in operation; its name supplied on joining.
- Containerised and hardened, from the plain base with the join closure
  only.
- `p2p-node-manager` on the host machine: starts the container, provisions
  it through the auxiliary swarm (the secret into memory from the vault,
  an encrypted file first), monitors it (logs, lifecycle events, resource
  samples) and records it; graceful stop, restart, rebuild.
- **Packages in code first:** the master node serves the node packages as
  a resource (pinned, a multi-module package with one dependency tree);
  the node loads them by replication and materialises them.
- **Requests in code first:** delivered as bundles over `p2p-channel` into
  the receiving repository's intake, which commits them into
  `pending/default`; responses read from the replica.

### 6. Genesis and join

- `p2p-swarm-manager`, controlling the master node: genesis from non-P2P
  repositories, the first DHT, the lookup started, the packages primed.
- A node manager starting a node that joins; a node on another host
  joining under its own manager.
- The swarm's record in code first (the lookup and the managers' own
  records), reached through requests.

## Further down the roadmap

Each replacing its in-code version behind the same contract, once enough
is built and proven:

- the lookup as a repository (inbox and intake), replacing the in-code
  lookup at the end of an install;
- the inbox as writer cores (priority, internal or external), for
  repository-to-repository talk without a live connection;
- the capability store as a repository: packages as commits of gitlinks,
  validation by test runs, availability, a repository's `capability/default`
  as gitlinks; kept runs holding links into it;
- the swarm's record as a deployment repository.

## The request's done, mapped

| Request's done | Where |
|---|---|
| 1. contract suite and test-run model on a persisted Hyperdrive under Bare | steps 1 and 3 |
| 2. two Bare nodes in containers, Hyperswarm, a replicated repository | steps 2, 3 and 5 |
| 3. a node from a plain Bare base through a bootstrap repository, packages loaded lazily | step 5 (packages in code first) |
| 4. a deployment repository bringing up a seed and a joining node, recording them | step 6, in code first; the deployment repository further down the roadmap |
| 5. every step recorded and rerunnable, metrics at the boundary, small runs | every step; small runs with the capability store, further down |

## Not in this phase

The vision in `multi-swarm.md` (boot, management and destination
memberships as separate swarms, closed-box devices), mobile, streaming
channels, zero knowledge, AVRO and Kafka.

## Needs the human

- Created in `pear-full-square`: `p2p-store`, `p2p-dht`, `p2p-connect`,
  `p2p-replicate`, `p2p-channel`, `p2p-node-manager`,
  `p2p-swarm-manager`; `p2p-git` moved there. To decide: where the lookup
  (its contract and its in-code version) lives. `pear-full-square/p2p-swarm`
  was created before the connections module was renamed `p2p-connect`,
  and is unused.
- Open in step 2: where audit goes (proposed: an append-only, signed core
  per node, replicated to its node manager over the management plane;
  facts only, never secrets) and how detailed it is.
