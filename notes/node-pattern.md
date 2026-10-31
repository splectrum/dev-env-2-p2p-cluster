# The node pattern

Status: **settled in discussion, 2026-10-31**; open points at the end. The
main pattern wherever containers run; written in terms of runtime,
exchange point, vault and store, so it carries over where they do not
(mobile).

It replaces the shape of what was built first (`mycelium-node`,
`cluster/bootstrap`, `cluster/deployment`): those stay as probes, the
evidence behind some of what follows, not as the design.

## Settled

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
5. **Runtime only.** A node starts from a plain base: Bare, nothing else.
6. **The exchange point.** One folder shared with the host, mapped into
   the container. It is the boundary: boot material, imports, requests,
   responses, exports cross here and nowhere else. It holds nothing secret,
   so it can be copied, synced or carried. This makes the container model
   universal and allows air-gapped execution: on a PC the folder is the
   user's exchange point with the node.
7. **The repository boots the node.** A boot repository, taken from the
   exchange point, is cloned into the node's own Corestore under the
   node's own key, and execution switches to the clone: it goes live. The
   node is that repository in operation, active for as long as the node
   is. The clone records its origin (the boot repository's key and
   commit). One boot repository can start many nodes, each with its own
   clone and key.
8. **Local first, network last.** The node is complete and live on
   Hypercore before it opens a socket.
9. **A disposable store.** The Corestore sits in the container's own
   filesystem (no mount), rebuilt from checkpoints (the repositories the
   node writes) and from the cluster (the replicas it holds, by key).
10. **Identity in a vault.** The node's secret (its Corestore primary key,
    and any explicit keypairs) lives in a vault on the host, not in the
    store, the exchange point or the image. At start it is handed over
    through a channel of its own into a RAM-only mount (tmpfs), read into
    memory and removed. Secrets never touch a disk: swap and core dumps
    are closed off for the container.

## Where things live

Two mounts; the store needs none.

| Where | Holds | Lifetime |
|---|---|---|
| exchange folder (bind mount from the host) | boot material, bundles, requests, responses; nothing secret | shared, carried around |
| `/secrets` (tmpfs mount) | the node's secret, only while it is handed over | RAM only |
| the container's own filesystem | the Corestore, rebuildable | gone with the container |

Once proven, this becomes part of the architecture in the main
documentation.

## The pattern elsewhere

| Pattern | Container | Mobile |
|---|---|---|
| runtime | plain image with Bare | Bare in the app |
| isolation | the container | the app sandbox |
| exchange point | the mapped folder | the app's shared folder, share and import |
| vault | host vault, keychain or encrypted file | the OS keystore |
| secrets in RAM | tmpfs | process memory |
| disposable store | internal volume | app-private storage |

## What a running node is

One process, the runtime with the host, running: a DHT node (taking part
in the cluster's DHT), a server listening on the node's keypair, the
swarm with its announcements kept alive, replication on every connection,
and the Corestore. Repositories (applications) are opened, served and
joined within it; the substrate under them (modules for `bare-for-pear`)
is still to be designed.

## Open

1. **What the Corestore persists.** Whether Corestore and Hypercore write
   the primary key, or writable cores' secret keys, into their storage
   when the primary key is passed in at open. If they do, the key reaches
   the internal disk and must be kept out. A local probe, first.
2. **Release or sign.** The vault hands the secret over into memory
   (start here), or keeps it and signs on request (stronger; depends on
   Hypercore allowing an external signer).
3. **Which vault first:** an encrypted file on the host, the OS keychain,
   or a vault service. Who generates a node's secret (proposed: the
   vault, so it is born where it lives).
4. **The exchange folder's layout**, one per node or shared parts, and
   when the node reads it: at start only, or watched while it runs (which
   touches how later requests arrive, still open).
5. **Starting from zero and joining.** Creating the first node and its DHT
   from nothing, from non-P2P repositories, and a node joining an existing
   cluster: to be taken up step by step, after the above.
6. **Hyperdrive with an explicit keypair:** how a drive is opened writable
   with a keypair of its own, given that its blobs core is derived from its
   db core.
