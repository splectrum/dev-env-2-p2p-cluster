# Part 6: validation

**Scope.** The changed modules' unit tests; then the liveness scenario as
a Splectral demo (`demo.sh <work> <record> <phase>`, each phase a case;
`run.sh <work>` records them all): host A's swarm (genesis, node-1);
Splectral serving; a headless browser (`ui.cjs`) running "A node goes
quiet" from its page and watching the map; what the topics say about
liveness (`liveness.mjs`); the swarm stopped; the same topics replayed and
watched; the records, checked for secrets, leftovers and p2p names in the
applications.

**Findings** (record of 2026-11-02, `record/`; 20 cases, all exit 0):
- **Unit tests**, 9 modules: p2p-rns 5, p2p-node 3, p2p-node-manager 2,
  p2p-swarm-manager 1, splectral-contract 2, -model 2, -scenario 1,
  -server 1, -p2p-watchers 2. All pass.
- **Absent, by timeout.** node-1 frozen (its container paused): p2p-rns
  flagged it absent 16.1 s after it was last heard from (the 15 s lease,
  plus up to a third of it for the sweep), 12.6 s after the pause. The
  map showed the dashed ring and "absent" (`screens/live-2-map-absent.png`);
  its records stayed, flagged.
- **Refused at once.** A request to it was refused (`absent: ..., since
  ...`) without reaching for its address; the action's 6.1 s is the
  requester joining the swarm, before it asks.
- **Present again.** Thawed, node-1 was present 7.3 s after the resume
  (one renewal unanswered on the stale connection, which was dropped and
  made again). A request to it was then answered.
- **Left, gracefully.** Stopped, node-1 left first: p2p-rns took it out
  (`node-left`), and node-1's own log now ends with `left`,
  `node-stopped` and the boot program's `node-exited` (lost before this
  step). The map: gone, "left". The swarm ran on: the master answered.
- **In the browser**: all 8 steps done, outcome ok, the messages in
  order, the refusal's message among them; the timeline holding the new
  events (absent, present, left); node-1's page: gone, left. From Run to
  done: 38 s. No page error.
- **Replayed**: 270 records from 6 topics in 3.6 s; absent seen on the
  way; the messages identical to the live run's.
- **No secret in the records** (290 files); no container or network left;
  **no file of the applications names p2p**.

**Noted, not changed.** While node-1 was absent, the map still drew its
link to the master as open: links come from connection events, and the
master closed the connection only later. Presence and links are separate
facts; a page may choose to draw a link to an absent node faded.
