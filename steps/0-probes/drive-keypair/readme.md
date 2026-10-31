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

**Findings** (record of 2026-10-31, dev `23e309f`; Node and Bare, both
exit 0, the same outcome):

- **Yes, through the db core.** A db core opened with the keypair, given
  to Hyperdrive as `_db`, makes a writable drive, and its blobs core is
  writable too (Hyperdrive signs it with the db core's keypair, under a
  manifest of its own). Reopened with the keypair: same key, writable,
  reads back.
- **The drive moves with its keypair alone.** In store B (another primary
  key), the same keypair gave the same drive key and a writable drive;
  written there, the write was read by a replica in store C.
- **The drive's key is not the keypair's public key.** Hypercore 11 derives
  a core's key from its manifest, which names the signer (the keypair's
  public key, checked). A replica opens by the drive's key; the keypair
  determines it.
- **A store taking over the writing must hold the whole drive.** B had
  loaded only what it read (0 of 2 db blocks held from the start) and
  lacked the header block, so a replica connected only to B could not
  open the drive's contents. After B downloaded both cores, it could.
- `_db` is an internal option of Hyperdrive: it works with 13.3.4 and must
  be checked when Hyperdrive is upgraded (or replaced by a small wrapper
  of our own in `p2p-store`).

**What this means for the design.** Explicit keypairs work for
repositories that move or change writer (the swarm's repositories, the
capability store), and the keypair, held in the vault, is all that moves.
Moving a repository's writing means a full copy first. Recorded in
`notes/node-pattern.md`.
