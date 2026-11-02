# Part 4: Splectral, presence

**Done.**
- `splectral-contract` 0.2.0: events `absent { uri, since }`, `present`,
  `left`; actions `pause-node`, `resume-node`. Minor versions add to the
  world and never change it: a 0.1 extension works on 0.2. The world
  still names no p2p (its test caught "left the swarm").
- `splectral-model`: a node's `presence` (present, absent, left), apart
  from its `status` (what its host sees of the process).
- `splectral-p2p-watchers`: p2p-rns's events, from the master's log,
  mapped to the three.
- `base-view-map`: an absent node with a dashed ring and the word under
  its name; its page says it.
- `splectral-p2p-actions`: `pause-node` and `resume-node` freeze and thaw
  a node's container, which no graceful path sees.
- `splectral-scenario`: a step may expect a refusal (`refused: true`, told
  as a message, a success failing the step) and hold after itself
  (`hold`, ms) so people can read; `absent`, `present` and `left` can be
  awaited.

Unit tests: contract 2, model 2, watchers 2, scenario 1 (each with the
new cases).
