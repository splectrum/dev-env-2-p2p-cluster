# Step 0. Probes

Status: **done** (2026-10-31). Request: `pending/phase-2/step-0-probes/request.md`
on `pending/default`. Scope: `notes/plan.md`, step 0.

Small, local probes whose answers the design rests on. Each states its
question and expectation first, runs on Node and on Bare where it can, and
records its outcome in its `record/`.

| Part | Question | Decides |
|---|---|---|
| `corestore-secrets/` | What do Corestore and Hypercore write to disk when the primary key is given at open? | whether "secrets in memory only" holds, and how |
| `drive-keypair/` | Can a Hyperdrive be opened writable with an explicit keypair? | portable repositories, explicit keys from the vault |
| `container-dht/` | Can a container (the plain base, Bare) join a DHT and a node on the host, over an internal network? | the auxiliary swarm for provisioning |

Done when each part has run, its outcome is recorded, and what it means
for the design is written into `notes/node-pattern.md`.

## Outcome

| Part | Answer | Record |
|---|---|---|
| `corestore-secrets/` | The primary key and the drives' secret keys are written to the store (its write-ahead log), in clear; the store reopens writable with no key. On tmpfs the same, in RAM. So: **the whole store in RAM**. | `corestore-secrets/record/` (4 cases, Node and Bare, disk and tmpfs) |
| `drive-keypair/` | **Yes**, through the db core (Hyperdrive's internal `_db`); the drive moves with its keypair alone; its key is derived from a manifest naming the signer; a store taking over the writing must hold the whole drive. | `drive-keypair/record/` (Node and Bare) |
| `container-dht/` | **Yes**: a hardened container on an internal network joins the host's DHT at the gateway address and connects in under 40 ms. Bare ignores SIGTERM handlers registered through `process.on`. | `container-dht/record/` (host on Node and on Bare) |

The design changes this brings are in `notes/node-pattern.md` (the store in
RAM; explicit keypairs; the auxiliary swarm confirmed).

The probes share one set of pinned dependencies (`package.json`), the same
versions the first build used.
