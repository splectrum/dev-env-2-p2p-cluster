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

**Findings**: below, once recorded.
