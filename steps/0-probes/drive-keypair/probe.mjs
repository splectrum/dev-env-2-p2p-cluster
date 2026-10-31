// Probe: can a Hyperdrive be opened writable with an explicit keypair,
// one not derived from its Corestore's primary key?
//   node probe.mjs <dir> | bare probe.mjs <dir>
// Hyperdrive takes no keypair option; it takes its db (a Hyperbee) as the
// internal option _db, so the db core is opened here with the keypair and
// handed over. Then: written in store A; reopened in A; opened writable in
// store B (another primary key) with the same keypair, so the drive moves
// with its keypair alone; and read from store C as a replica, over a
// direct stream (no network). The storage is removed afterwards. One JSON
// line on stdout.

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import crypto from 'hypercore-crypto'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import Hyperdrive from 'hyperdrive'

const dir = process.argv[2]
fs.rmSync(dir, { recursive: true, force: true })
const keyPair = crypto.keyPair()

// A drive on a db core opened with the keypair, as Hyperdrive would make it.
function driveWith (store, keyPair) {
  const core = store.get({ keyPair, exclusive: true })
  const db = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'json', metadata: { contentFeed: null } })
  return new Hyperdrive(store, { _db: db })
}
const describe = async drive => {
  await drive.ready()
  await drive.getBlobs()
  return {
    key: drive.key.toString('hex'),
    keyIsThePublicKey: Buffer.compare(drive.key, keyPair.publicKey) === 0,
    signer: drive.core.manifest && drive.core.manifest.signers[0].publicKey.toString('hex') === keyPair.publicKey.toString('hex'),
    writable: drive.writable,
    blobsWritable: drive.blobs.core.writable,
    blobsKey: drive.blobs.core.key.toString('hex')
  }
}

// A: create and write.
const a = new Corestore(path.join(dir, 'a'))
let drive = driveWith(a, keyPair)
const created = await describe(drive)
await drive.put('/hello.txt', Buffer.from('hello'))
await drive.close()
await a.close()

// A again: reopened with the keypair.
const a2 = new Corestore(path.join(dir, 'a'))
drive = driveWith(a2, keyPair)
const reopened = { ...await describe(drive), read: String(await drive.get('/hello.txt')) }
await drive.close()
await a2.close()

// B: another store, the same keypair: writable there? It starts empty, so
// it is first filled from A by replication (all of it), then written.
const a3 = new Corestore(path.join(dir, 'a'))
const fromA = driveWith(a3, keyPair)
await fromA.ready()
const b = new Corestore(path.join(dir, 'b'))
const sa = a3.replicate(true)
const sb = b.replicate(false)
sa.pipe(sb).pipe(sa)
drive = driveWith(b, keyPair)
await drive.ready()
await drive.update({ wait: true })
const lazy = { db: drive.core.contiguousLength, of: drive.core.length }
// B is to write and serve the drive in A's place, so it takes the whole
// drive first: a replica holds only the blocks it has read.
await drive.getBlobs()
await drive.core.download({ start: 0, end: drive.core.length }).done()
await drive.blobs.core.download({ start: 0, end: drive.blobs.core.length }).done()
const moved = {
  ...await describe(drive),
  heldBeforeDownload: lazy,
  heldAfterDownload: { db: drive.core.contiguousLength, blobs: drive.blobs.core.contiguousLength },
  read: String(await drive.get('/hello.txt'))
}
await drive.put('/from-b.txt', Buffer.from('written in b'))
moved.wroteInB = String(await drive.get('/from-b.txt'))

// C: a replica, opened by the drive's key only (not the keypair's public
// key: Hypercore derives a core's key from its manifest, which names the
// signer), over a direct stream from B.
const c = new Corestore(path.join(dir, 'c'))
const sb2 = b.replicate(true)
const sc = c.replicate(false)
sb2.pipe(sc).pipe(sb2)
const replica = new Hyperdrive(c, Buffer.from(created.key, 'hex'))
await replica.ready()
await replica.update({ wait: true })
const read = {
  writable: replica.writable,
  hello: String(await replica.get('/hello.txt')),
  fromB: String(await replica.get('/from-b.txt'))
}

await replica.close()
await drive.close()
await fromA.close()
for (const s of [c, b, a3]) await s.close()
fs.rmSync(dir, { recursive: true, force: true })

console.log(JSON.stringify({
  runtime: typeof Bare !== 'undefined' ? `bare ${Bare.version}` : `node ${process.version}`,
  created, reopened, moved, replica: read
}))
