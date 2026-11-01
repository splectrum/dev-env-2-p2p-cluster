# Part 9: the applications

**Done** (folders on `main`; repositories in the `splectral`
organisation, named package, kind, name):
- **`base-view-map`**: the map: hosts as frames, nodes in them (filled
  when their host controls them, outlined when they joined from
  elsewhere; green running, amber starting, grey gone), each node's
  resources beside it, links between nodes (solid open, dashed closed), a
  ring when a request is answered, a blue dot when a resource changes, the
  latest message on top. A page per node: its host, status, resources and
  events.
- **`base-demo-other-host`**: step 6 as a scenario in the abstract
  vocabulary: host A's swarm running; an invitation to host B; host B's
  node started from it by its own manager; a request from host A to it; a
  note written on it; the node stopped; a request to node-1 answered still.

**Neither knows p2p**: no file of either names a p2p module (checked in
the record).
