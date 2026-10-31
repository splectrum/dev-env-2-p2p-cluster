# Part: the instrumentation contract

One contract for every module of the p2p series.

**The observer.** Every module takes `observer`, a function the
application gives it (default: none). The module calls it with one event
per activity:

```js
{ module: 'p2p-connect', kind: 'connection-opened', time: 1793477928807, peer: '<hex>', ... }
```

- `module`: the module's name; `kind`: what happened; `time`: epoch ms.
- Facts only: keys (hex), names, sizes, counts, durations, outcomes.
  **Never a secret, never content**: a channel reports a message's size
  and type, not its body; a store reports keys, not its primary key. The
  modules' tests check this.

**Audit and metrics.**

- **Audit** is the events: who did what (a store and its resources opened,
  DHT nodes started, connections opened, refused and closed with their
  bytes, topics joined, replication started and ended, a resource held,
  channels opened, messages passed, requests failed). Append-only: the
  application writes them where it keeps its audit (in step 2's
  validation, one JSON line per event, per peer).
- **Metrics** are counters each module keeps and gives on demand,
  `metrics()` (and `resources()` for the store): bytes per connection,
  blocks and bytes per resource and peer, a DHT's routing table and
  request counts, resource sizes. The application samples them at the
  boundary, per interval or at the end of a unit.

| Module | Events | Metrics |
|---|---|---|
| `p2p-store` | store-opened, resource-opened, store-closed | `resources()`: per drive, db and blobs: length, contiguous, bytes |
| `p2p-dht` | dht-started (role: bootstrap, persistent, node), dht-closed | routing table, queries, commands |
| `p2p-connect` | topic-joined, topic-left, connection-opened, connection-refused, connection-closed (bytes, ms), connect-closed | open and closed connections with bytes; the swarm's counters |
| `p2p-replicate` | replication-started, replication-ended, held (sizes, blocks fetched, ms) | per resource, core and peer: blocks and bytes up and down |
| `p2p-channel` | channel-opened, channel-closed, message (direction, type, bytes), request-failed | — |

Where audit is kept for good (proposed: an append-only core per node,
replicated to its node manager) is decided with the node, in step 5.
