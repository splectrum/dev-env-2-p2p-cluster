# Probe: drive-keypair

**Question.** Can a Hyperdrive be opened writable with an explicit keypair,
one not derived from its Corestore's primary key? (`notes/node-pattern.md`,
open point: a Hyperdrive with an explicit keypair.) A repository that may
move, or change writer, needs one.

**Expectation.** Hyperdrive has no keypair option. It does take its db (a
Hyperbee) as an internal option, `_db`; a db core opened with the keypair
should make the drive writable, and its blobs core follows the db core.

**Method** (`probe.mjs <dir>`). A random keypair (never recorded). The db
core opened with it (`store.get({ keyPair })`) and handed to Hyperdrive as
`_db`. Store A: create, write a file; A again: reopen with the keypair;
store B (another primary key): replicate the drive from A over a direct
stream (no network), take all of it, then write; store C: open a replica
by the drive's key only and read both files, from B. Run on Node and on
Bare.

**Record**: `record/`.

**Findings**: below, once recorded.
