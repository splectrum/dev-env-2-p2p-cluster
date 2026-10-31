# The node pattern

Status: **settled in discussion, 2026-10-31**, except where marked as a
direction or open. Once proven, it becomes part of the architecture in the
main documentation. The vision beyond it (several cluster memberships,
closed-box devices) is in `multi-cluster.md`.

It replaces the shape of what was built first (`mycelium-node`,
`cluster/bootstrap`, `cluster/deployment`): those stay as probes, the
evidence behind some of what follows, not as the design.

The pattern is simple and secure: a plain runtime, every repository on
Hypercore, everything moved by replication, secrets only in memory.

## Repositories

1. **All repositories on Hypercore.** Every repository this work creates
   lives on Hypercore: a Corestore-backed Hyperdrive with p2p-git on it.
   Repositories outside (native git, hosted repositories, bundles) are
   sources and targets at the boundary only: imported once, exported as
   copies.
2. **A repository on Hypercore needs no cluster.** It is created and used
   locally (shown in step 1: the contract suite and the command set on a
   persisted Hyperdrive, Node and Bare, no network). Networking only adds
   replication, over any duplex stream; a swarm is one way to get streams.
3. **Every repository has a keypair.** The drive's key (its db core's
   public key) is its identity and, hashed, its discovery topic. The secret
   key is the right to write: whoever holds it is the single writer.
4. **The Corestore is the storage.** A Hyperdrive is built on one, and a
   node has one. By default it derives each repository's keypair from its
   primary key and the repository's name, so the primary key is the root
   secret behind everything the store writes. A repository that must move
   or change writer gets an explicit keypair of its own.

## The node

5. **A containerised node on the host, where possible.** Containers give
   resource separation (CPU, memory, I/O per node; an out-of-memory node
   dies alone), isolation, a disposable environment and observability from
   the runtime. Where containers are not available (mobile, some hosts) the
   node runs in-process; the pattern holds, only the stream between
   manager and node changes. Plain host processes serve development and
   tests.
6. **Runtime only.** A node starts from a plain base: Bare, nothing else.
   Containers are hardened: read-only root filesystem, all capabilities
   dropped, no new privileges, a non-root user, no swap (memory limit equal
   to swap limit), no core dumps. A rootless container runtime where
   possible.
7. **The repository boots the node.** A boot repository is cloned into the
   node's own Corestore under the node's own key, and execution switches
   to the clone: it goes live. The node is that repository in operation,
   active for as long as the node is. The clone records its origin (the
   boot repository's key and commit). One boot repository can start many
   nodes, each with its own clone and key.
8. **Local first, network last.** The node is complete and live on
   Hypercore before it opens a socket to its cluster.
9. **A disposable store.** The Corestore sits in the container's own
   filesystem (no mount), rebuilt from checkpoints (the repositories the
   node writes) and from the cluster (the replicas it holds, by key).
10. **Identity in a vault, secrets in RAM only.** The node's secret (its
    Corestore primary key, and any explicit keypairs) lives in a vault on
    the host, never in a store, repository, bundle, folder or image. It
    reaches the node only into memory, at each start. Secrets never go
    into a Hypercore either: a core is a replicated, signed, persistent
    log.

## Provisioning: the auxiliary cluster

Direction; it rests on one probe still to run (a container joining a DHT
on the host).

The node manager's side runs a small cluster local to the host, on an
internal network with no route out: the **auxiliary cluster**, the
management plane. The node's own cluster is the data plane.

1. The node manager starts the container with only a small fixed join
   closure (Bare, the swarm, Corestore, the secret stream), attached to
   the auxiliary network.
2. The container generates an ephemeral keypair and writes its public key
   to its log. The node manager, following the log, authorises exactly
   that key. No secret is needed to start.
3. The container joins the auxiliary cluster and receives its secret over
   an ephemeral channel on the Noise-encrypted connection, into memory,
   from the host's provisioning node (backed by the vault).
4. It loads its packages by replication from the capability store,
   lazily, verified by commits and the store's key.
5. It goes live (point 7) and sets up or joins its proper cluster, as its
   request says.
6. The auxiliary link stays as the management channel between the node
   manager and its node.

This works air-gapped as well: host and container always have a network
between them, even with none to the outside.

## Where things live

| Where | Holds | Lifetime |
|---|---|---|
| the container's own filesystem | the join closure, the Corestore (rebuildable) | gone with the container |
| the container's memory | the node's secret | until the node stops |
| the host's vault | node secrets, long-lived keypairs | persistent, guarded |
| the host's own folders | the host side's boundary with the outside world: bundles and files brought in by hand, exports to carry elsewhere | the host's |

No folder is mapped into the container; nothing reaches it except through
the auxiliary cluster (and a tmpfs, if a secret must ever be a file).

## The pattern elsewhere

| Pattern | Container on a host | Mobile |
|---|---|---|
| runtime | plain image with Bare | Bare in the app (a worklet) |
| isolation | the container | the app sandbox |
| manager to node | the auxiliary cluster, on the host's internal network | replication and the secret channel over the worklet's IPC pipe |
| vault | host vault, keychain or encrypted file | the OS keystore |
| secrets | process memory | process memory |
| disposable store | container filesystem | app-private storage |
| boundary with the outside world | the host's folders | share and import with other apps |

## The host side

1. **A node manager per node.** A long-running process, living as long as
   its node, in the node's own folder on the host. It starts the container
   (limits, hardening, networks), provisions it (the auxiliary cluster),
   monitors it (the container's logs captured, the runtime's lifecycle
   events, resource samples), records what only the outside can see
   (crashes, out-of-memory kills, hangs), and is the node's management
   platform (status, logs, start, graceful stop, restart, rebuild). A host
   runs as many as it has nodes.
2. **No folder hierarchy.** Node folders stand side by side; nothing is
   organised by nesting. Managers talk repository to repository.
3. **A cluster manager** on a host that starts a cluster manages the node
   managers it controls: it starts them (the first node, then others) and
   follows them through their repositories.
4. **Independence.** A node manager and its node keep running when the
   cluster manager stops; the cluster manager picks them up again when it
   restarts.
5. **Priming.** A cluster manager may control a single node, the seed
   (the first DHT node). It is also responsible for priming the cluster
   with its capabilities: bringing them into the capability store, at the
   boundary.
6. **Scope.** A cluster manager manages only the nodes it controls. Other
   nodes join and are part of the cluster while living on other hosts,
   under their own managers: the general pattern.

## What a running node is

One process, the runtime with the p2p series (`p2p-store`, `p2p-dht`,
`p2p-swarm`, `p2p-channel`, `p2p-git`; `pear-full-square`), running: a DHT node (taking part in the cluster's
DHT), a server listening on the node's keypair, the swarm with its
announcements kept alive, replication on every connection, and the
Corestore. Repositories (applications) are opened, served and joined
within it. Every module of the series is instrumented and audited
(`plan.md`, step 2). The series holds no management: the node manager and the
cluster manager are applications on the host machine (`pear-full-square`).

## Repository-to-repository talk

The core communication mode for now, for low-frequency exchange; higher
frequency (streaming) comes later, through dedicated channels.

- **An inbox per repository**, multi-writer: one append-only core per
  writer, signed by its key. The inbox is the set of those cores, listed in
  the repository's configuration with, per writer, a priority and a flag:
  internal or external.
- **No consensus in the inbox.** The repository's own intake process
  orders: it reads the inbox (by priority), validates each entry and
  commits accepted requests into `pending/default`, the internal queue.
  `pending/default` is the linearised view; intake is the apply step.
- **An entry is a bundle**: self-contained, verifiable by its oids, the
  same format as at every other boundary. A bundle may have prerequisites
  the repository already holds; one missing them is refused.
- **Validation at intake:** an admitted writer; a well-formed bundle; a
  request whose URIs validate (external entries meet the boundary's
  rules); a capability to execute it. Exactly once: each entry is known by
  writer key and sequence, recorded with the accepted request. Rejections
  are answered.
- **Responses** are on `main` as now; the sender reads them from its
  replica.
- **Communication patterns** (fire and forget, confirmed, handshakes) are a
  higher-level concern, built on this.
- **Future vision** (not for implementation now): like ports, a first
  message on the repository's standard inbox sets up a dedicated channel
  between the two (a pair of cores of their own, or a channel on the
  connection) for what does not fit request by request, such as
  streaming; the inbox stays the well-known entry point.

## Capabilities

- **References are gitlinks** (git's own `160000` entries: a commit in
  another repository), with the capability store's key recorded beside
  them. One capability store to start; the seed writes it.
- **Multi-module packages.** A reference is per package: a set of modules
  with one resolved dependency tree (a shared `node_modules`), e.g.
  `mycelium` with all its modules, a wholesome and consistent set of
  capabilities tested as one, so no node mixes versions. Module instances
  stay stored once, shared between packages. To start, repositories
  reference packages directly.
- **The capability store is the single point** of import (third-party code
  crosses the boundary there, once), validation (a package is available
  only once tested as a whole, with its evidence) and maintenance
  (updates, fixes, retirement). Running nodes pin exact commits and move
  only when their repository asks.
- **The repository decides what to ask for**, from what the store has made
  available; the resolution is recorded as an exact commit.
- **Later:** a categorisation of packages by capability URI; a module's
  descriptor saying which capabilities it provides and how to instantiate
  them; the repository's own map (its internal knowledge) of which
  package serves each capability URI; a repository asking the store to
  include a missing package.

## Open

1. **What the Corestore persists.** Whether Corestore and Hypercore write
   the primary key, or writable cores' secret keys, into their storage
   when the primary key is passed in at open. If they do, the key reaches
   the disk and must be kept out. A local probe.
2. **A container joining a DHT on the host:** the probe the provisioning
   direction rests on.
3. **A Hyperdrive with an explicit keypair:** how a drive is opened
   writable with a keypair of its own, given that its blobs core is
   derived from its db core.
4. **The secure processes** for the keys that need securing: the
   Corestore on the host, any transport of a secret (only vault to vault,
   encrypted to the receiving vault's key), and the code in the container
   (only verified code, the secret only in memory).
5. **Release or sign.** The vault hands the secret over into memory
   (start here), or keeps it and signs on request (stronger; depends on
   Hypercore allowing an external signer). Which vault first, and who
   generates a node's secret (proposed: the vault).
6. **The inbox:** framing large bundles in a core (or a size limit, with
   links for large data), admission of new writers, clearing accepted
   entries.
7. **The p2p series** (its instrumentation and audit included), and **starting from zero
   and joining** (the first node and its DHT, a node joining), step by
   step.
