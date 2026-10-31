// Probe: what do Corestore and Hypercore write to disk when the primary key
// is given at open?
//   node probe.mjs <dir> | bare probe.mjs <dir>
// Opens a Corestore at <dir> with a given primary key, creates a writable
// Hyperdrive, writes a file and closes. Then looks for the secrets on disk
// two ways: the raw bytes in every file, and by reopening the store with
// no key at all (if it opens with the same primary key and its drive is
// writable, the secrets were persisted). One JSON line on stdout.

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import crypto from 'hypercore-crypto'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'

const dir = process.argv[2]
fs.rmSync(dir, { recursive: true, force: true })

const primaryKey = crypto.randomBytes(32)
const store = new Corestore(dir, { primaryKey, unsafe: true })
const drive = new Hyperdrive(store)
await drive.ready()
await drive.put('/hello.txt', Buffer.from('hello'))
await drive.getBlobs()
const secrets = {
  primaryKey,
  dbSecretKey: drive.core.keyPair.secretKey,
  blobsSecretKey: drive.blobs.core.keyPair.secretKey
}
const driveKey = drive.key
await drive.close()
await store.close()

// 1. The raw bytes, in every file of the storage.
const files = []
const walk = d => {
  for (const name of fs.readdirSync(d)) {
    const p = path.join(d, name)
    if (fs.statSync(p).isDirectory()) walk(p)
    else files.push(p)
  }
}
walk(dir)
const found = {}
for (const [name, secret] of Object.entries(secrets)) {
  found[name] = files.filter(f => fs.readFileSync(f).indexOf(secret) !== -1)
    .map(f => path.relative(dir, f))
}

// 2. Reopened with no key: the same primary key, a writable drive?
const again = new Corestore(dir)
await again.ready()
const reopened = new Hyperdrive(again)
await reopened.ready()
const reopen = {
  samePrimaryKey: Buffer.compare(again.primaryKey, primaryKey) === 0,
  sameDriveKey: Buffer.compare(reopened.key, driveKey) === 0,
  writable: reopened.writable,
  read: String(await reopened.get('/hello.txt'))
}
await reopened.close()
await again.close()

console.log(JSON.stringify({
  runtime: typeof Bare !== 'undefined' ? `bare ${Bare.version}` : `node ${process.version}`,
  files: files.map(f => path.relative(dir, f)).sort(),
  secretsFoundRaw: found,
  reopenedWithoutKey: reopen
}))
