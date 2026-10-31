# Probe: container-dht

**Question.** Can a container (the plain base, Bare only) join a DHT and a
node on the host, over an internal network? (`notes/node-pattern.md`,
provisioning through the auxiliary swarm.)

**Expectation.** Yes, if the host's DHT and node bind to the host's
address on that network (its gateway) and announce it, and nodes on it
are marked not firewalled (they reach each other directly).

**Method** (`run.sh <node|bare>`). An internal Docker network
(`--internal`, no route out; subnet 172.31.0.0/24, gateway 172.31.0.1).
On the host (`host.mjs`, with the given runtime): a private DHT of two
persistent nodes at the gateway address, port 49741, and a node serving a
random topic. In the container (`node.mjs`, image `bare-base`: Debian slim
and Bare, nothing else; hardened: read-only root filesystem, all
capabilities dropped, no new privileges, user 65534): a node bootstrapping
from the gateway address and joining the topic as a client. Each side says
hello; the container reports what it heard, its times and the
connection's bytes; the host reports its peers and connection counts. The
probe folder is mounted into the container read-only, for the probe only
(provisioning will bring code by replication).

**Record**: `record/`.

**Findings** (record of 2026-10-31, dev `b98f677`; the host on Node and on
Bare, both exit 0, the same outcome):

- **Yes.** The hardened container bootstrapped from the host's DHT at the
  gateway address in 15 to 17 ms and was connected to the host's node in
  34 to 38 ms from its start (the whole case, container start included,
  about 2.4 s). Both sides heard each other; 138 bytes in, 143 out.
- **The addresses that work:** on the host, the DHT and the node bound to
  the internal network's gateway (172.31.0.1) and announcing it; in the
  container, its own address on that network; nodes not firewalled.
- **Hardening costs nothing here:** a read-only root filesystem, all
  capabilities dropped, no new privileges and an unprivileged user did not
  get in the way of Bare, the DHT or the connection.
- **Bare does not act on SIGTERM through `process.on`** (bare-node-process):
  the host's handler never fired, so the probe's host ends by itself. A
  node's graceful stop under Bare needs Bare's own signal handling
  (bare-signals); to settle in step 2.
- Not verified: that the internal network has no route out (in this
  session the outside is unreachable for UDP anyway).

**What this means for the design.** The auxiliary swarm works as designed:
a container from the plain base, on an internal network, joins a DHT run by
the host and connects to the host's node. Recorded in
`notes/node-pattern.md`.
