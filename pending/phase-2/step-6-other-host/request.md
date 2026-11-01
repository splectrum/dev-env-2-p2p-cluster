# Request: step 6, a node on another host

From the plan (`main:notes/plan.md`, step 6). A node on another host joins
the swarm under its own node manager: the general pattern, a swarm manager
managing only the nodes it controls. A thin path, end to end.

This session has one machine: the other host is simulated on it, and
nothing of host A's is shared with it but what another host would be given
and the network both hosts reach.

## Parts

1. **Probe: reaching the swarm from another host.** Whether a master on
   two networks (its host's and the hosts' LAN) can be reached from both,
   or whether a swarm's data plane must be one network all its nodes
   reach.
2. **The invitation.** What another host is given to join: public facts
   only (the swarm, its data plane, its bootstrap, the master's key, the
   packages' URI, key and commit, the image); from the swarm manager
   (`invite`).
3. **A node manager on its own.** `p2p-node-manager` joins a node from an
   invitation, on its host: its own vault, its own auxiliary network
   (created and removed by it), its own folder; no swarm manager.
4. **The swarm sees it, does not control it.** The swarm manager's status
   lists the nodes p2p-rns knows and tells those it controls from those it
   does not.
5. **Validation.** Genesis and a local node on host A; the invitation;
   a node on host B joining under its own manager; the swarm by URI from
   host A; a request to the node on host B from host A, and one from host
   B to host A's node; the node on host B restarted by its manager, the
   same identity; stopped by its manager while the swarm runs on; the
   swarm stopped; host B's records separate from host A's, no secret in
   any record, and neither vault reached by the other host.
6. **The product repositories** of the modules changed.

## Done

All parts done, recorded in `main:steps/6-other-host/`.
