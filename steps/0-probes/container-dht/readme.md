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

**Findings**: below, once recorded.
