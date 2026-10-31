# Request: step 0, probes

From the plan (`main:notes/plan.md`, step 0). Three small, local probes
whose answers the node pattern rests on (`main:notes/node-pattern.md`).

## Parts

1. **corestore-secrets.** Open a Corestore with a given primary key, create
   a writable Hyperdrive, write to it, close. Expected, from reading the
   code: the primary key (Corestore's seed) and the drive cores' secret
   keys are written into the storage. Record what is on disk, how it can
   be found, and what keeps secrets off the disk.
2. **drive-keypair.** Open a Hyperdrive writable with an explicit keypair
   (not derived from the store's primary key): it writes, reopens with the
   same key, and a replica opened by that key reads what was written.
   Record how, and what the blobs core does.
3. **container-dht.** A DHT (two persistent nodes) and a node on the host;
   a container from the plain base (Bare only) on an internal Docker
   network joins that DHT and connects to the node. Record the addresses
   that work and the connection's metrics.

## Done

Each part has run, on Node and on Bare where it can; its unit and results
are recorded in `main:steps/0-probes/<part>/record/`; what it means for the
design is written into `main:notes/node-pattern.md`.
