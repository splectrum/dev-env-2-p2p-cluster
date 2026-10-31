# Step 0. Probes

Status: **in progress**. Request: `pending/phase-2/step-0-probes/request.md`
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

The probes share one set of pinned dependencies (`package.json`), the same
versions the first build used.
