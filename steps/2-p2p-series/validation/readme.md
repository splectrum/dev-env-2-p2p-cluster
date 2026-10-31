# Part: validation

**Scope.** The modules' unit tests, and two peers composed from the five
modules (`peer.mjs`), the way an application composes them:

- the first peer (`serve`): a private DHT from nothing, a store in RAM,
  its own drive written with 20 files of 1 KB, served on the drive's
  topic, a channel answering requests;
- the second (`join`): joins the DHT, opens a replica by the drive's key,
  finds the first peer on the drive's topic, replicates, reads two files,
  asks a request on a channel, says done.

Cases (`two-peers.sh <case>`): both peers on Node; both on Bare (the
runtime's binary); the first on the host (Bare) and the second in a
hardened container from `bare-base` (read-only root, all capabilities
dropped, no new privileges, user 65534, 512 MB with no swap, no core
dumps, the store on a tmpfs) on an internal network.

**Expectation.** In every case: the replica found and read, only what was
read loaded, the request answered, both peers ending cleanly; every
module's events in each peer's audit, its metrics at the end.

**Record**: `record/`: `results.jsonl` (each case, both peers' metrics),
`<case>-serve-audit.jsonl`, `<case>-join-audit.jsonl`.

**Findings** (record of 2026-10-31, dev `ef28d8e`; 8 cases, all exit 0):

- **Unit tests:** p2p-store 5, p2p-dht 1, p2p-connect 1, p2p-replicate 1,
  p2p-channel 2: all pass.
- **Two peers, in every case** (Node, Bare, host and container): the
  replica found the first peer on the drive's topic and read both files
  (`ddd`, `rrr`), the request was answered by the other side's runtime,
  and both peers ended cleanly.

| Case | Connected | Read | Total |
|---|---|---|---|
| Node | 77 ms | 136 ms | 339 ms |
| Bare | 82 ms | 136 ms | 338 ms |
| host (Bare) and container | 63 ms | 116 ms | 319 ms |

- **Lazy, and the accounting agrees on both sides.** For two files of 20,
  the replica downloaded 12 blocks, 3,548 bytes: 10 index blocks (1,548
  bytes) and the 2 file blobs (2,000 bytes); the serving peer's upload
  counters show exactly the same. The connection carried about 6.9 KB in
  and 1.8 KB out (the protocol around the data). The same numbers in
  every case.
- **The audit is complete and the same shape everywhere:** each peer's
  file has every module's events, 19 on the serving side (its three DHT
  nodes among them), 16 on the joining side, with no secret and no
  message content in them.
- **The hardened container** (read-only root, no capabilities, no new
  privileges, an unprivileged user, 512 MB with no swap, no core dumps,
  the store on a tmpfs) ran the same as the host. Two fixes on the way:
  the container's audit file is created and opened for it (its user cannot
  write the record folder), and Docker needs the record folder's absolute
  path.
- **Composition needs Bare's aliases at the root**: `node:fs` and
  `node:process` resolve under Bare through packages named `fs` and
  `process` (`bare-node-*`); the application's tree (the root
  `package.json`) carries them, the modules do not need them.
