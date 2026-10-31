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

**Findings**: below, once recorded.
