# Vision

Status: **directions, not settled** (2026-10-30). Kept so decisions take
them into account, and added to every seed for information. Details:
`splectrum/dev-env-1-mycelium-git@33634de:notes/vision.md`.

## The mycelium base layer

From the bottom:

- **Hypercore:** storage and replication. Hyperdrive, and the
  filesystems git engines run on, sit here.
- **mycelium-git:** objects, trees, checkpoints and the repository rules,
  over a backend contract with several engines. p2p-git on Hyperdrive is
  one of the main components.
- **AVRO:** objects become data structures, with schemas and typed values.
  From here up, a URI names a typed value, not stored bytes.
- **Kafka:** streaming and high-volume data: records and topics. On
  Hypercore, a partition is a core, an offset a block index; no central
  broker, its functions taken on by peers.

`mycelium-uri` and `mycelium-xpath` are the shared vocabulary across all
four. On top sit the **repository paradigms**: the dev env, the test-run
instance, the module repository, data instance repositories. Each is its
own set of rules and capabilities; the request flow, deploy, publish and
sync belong to the paradigms that use them.

## P2P and the outside world

Fetch and push are the outside world's way: a client reaches a server.
Inside P2P the same needs are met by subscription and replication. The
boundary is found, not assumed, once Hypercore is understood. Links over
copies follow naturally from the cluster: a node holds links and loads
lazily what it reads.

## Packages, deployments and the cluster

- No npm inside P2P: a package comes in once, at the boundary, and then
  lives in P2P under its own identity, as a repository.
- A deployment links to packages (gitlinks or a manifest; on Hypercore a
  key and a commit) rather than containing them.
- A package repository holds the bytes; everything else holds links.
  Towards a single code repository: run repositories stay self-contained
  by holding links the cluster resolves, so kept runs get small.
- A seed node starts from a plain base with the runtime (Bare) only; a
  self-contained bootstrap repository sets it up. It is the first
  always-on peer; later nodes need only the bootstrap repository and its
  key.
- A cluster has a deployment repository, alive while the cluster runs:
  what it is, its nodes, its state and its monitoring.

## Operators

Single-concern repositories: each does one step of a multistep process
and keeps the record of it. Input is a request, output its response on
`main`; the next one takes it in itself. Every step can be traced and
rerun on its own. The test-run instance was the first.

## Bundles and storage

Bundles are the transport between repositories outside replication:
self-contained, immutable, verifiable, shared by hash. Loose objects stay
the working store; deltas are an optimisation for later.
