# Part: provisioning through the auxiliary swarm

Per swarm, an auxiliary internal network (the management plane) beside
the swarm's own (the data plane); the host is the gateway of both. For a
joining node, its node manager runs a peer of its own there: a DHT at the
gateway on a port of the node's, and a key of its own for the run. The
container (created on the auxiliary network, then connected to the
swarm's) starts the boot program from its image:

1. it generates an ephemeral keypair and writes the public key to its log;
2. the manager, following the log, authorises exactly that key (its peer
   admits no other) and records it;
3. the node connects to the manager by key and asks for its secret on a
   channel (`p2p-provision`); the manager answers once, recording that it
   did (`secret-handed-over`, via the auxiliary swarm, to that key);
   asked again, it refuses.

The link stays, as the management channel. `p2p-connect` gained
`connectTo(publicKey)` for this (Hyperswarm's `joinPeer`).
