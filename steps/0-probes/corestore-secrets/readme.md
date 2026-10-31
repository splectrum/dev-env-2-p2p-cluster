# Probe: corestore-secrets

**Question.** What do Corestore and Hypercore write to disk when the
primary key is given at open? (`notes/node-pattern.md`, open point 1.)

**Expectation**, from reading the code (corestore 7.16.1, hypercore
11.39.6): Corestore stores its primary key as the storage's seed
(`storage.setSeed`), whatever is passed in; a writable core keeps its
keypair, secret key included, in its header. So the secrets reach the
storage.

**Method** (`probe.mjs <dir>`). A Corestore opened with a random primary
key (`unsafe: true`, which Corestore requires to accept one), a writable
Hyperdrive, one file written, closed. Then every file of the storage is
searched for the raw bytes of the primary key and of the drive's two
secret keys (its db core and blobs core), and the store is reopened with
no key at all: same primary key, same drive key, writable? Run on Node and
on Bare, with the storage on disk and on tmpfs (`/dev/shm`). The random
key is never recorded.

**Record**: `record/`.

**Findings** (record of 2026-10-31, dev `48be636`; 4 cases, all exit 0):

- **The secrets are written to the storage, in clear.** The primary key
  and the drive's two secret keys (db core, blobs core) were found as raw
  bytes in RocksDB's write-ahead log (`db/000004.log`), on Node and on
  Bare alike. No option prevents it: Corestore stores its primary key as
  the storage's seed whether one is passed in or not, and `unsafe: true`
  only acknowledges passing one.
- **The store is self-unlocking.** Reopened with no key at all, it had the
  same primary key, the same drive key, and the drive was writable.
  Whoever has the storage folder has every write right in it.
- **The same on tmpfs**, which works for a Corestore (Node and Bare): the
  secrets are then in RAM, as part of the store.

**What this means for the design.** "The secret is not in the store" does
not hold with Corestore as it is. What does hold: **the whole store in
RAM**, on a tmpfs. The node pattern's store is disposable anyway (rebuilt
from checkpoints and from the swarm), so keeping it in memory costs only a
rebuild at each start, and the secrets never touch a disk. For a store too
large for RAM, or one that must survive restarts, the options are an
encrypted volume unlocked from the vault, or signing outside the store
(open point: release or sign). Recorded in `notes/node-pattern.md`.
