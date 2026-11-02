# Part 3: requesters

**Done.** Callers decide what absent means to them. `send-request`
(`splectral-p2p-actions`) refuses a node p2p-rns flags absent at once,
saying since when; step 6's `request.mjs` does the same. Before, a request
to a gone node waited on its address until its own timeout (30 s).

The refusal itself is immediate; the 6 s the action takes in the record
is the requester joining the swarm (its DHT node, the connection to the
master), before it asks.
