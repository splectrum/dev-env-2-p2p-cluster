# Part: validation

**Scope.** The changed modules' unit tests; then, end to end
(`join.sh <work> <record> <phase>`, each phase a case): genesis; node-1
joining; status from the host; a request to node-1 and one to the master,
from the host; node-1 restarted; status and a request again; a graceful
stop, the records copied here (never the vault) and checked for secrets.
`request.mjs` is the host's requester: the node's repository resolved by
URI, the request written in its own repository and sent as a bundle, the
response read from a replica.

**Findings** (record of 2026-11-01, dev `6343154`; 14 cases, all exit 0):

- **Unit tests:** p2p-node 2, p2p-connect 2, p2p-mrepo 24, p2p-rns 3,
  p2p-node-manager 1: all pass.
- **node-1 joined in 8.4 s**: provisioned through the auxiliary swarm (its
  manager authorised the key it logged and handed the secret over once),
  the packages materialised at the pinned commit `7c78068` (3,609 files,
  14.4 MB by replication, 6.1 s), the node started from that code, live from
  the boot repository, registered as `/joining/node-1`.
- **The swarm by URI, from the host**: `/joining/master` and
  `/joining/node-1`, with `/joining/master/boot`, `/node`, `/packages` and
  `/joining/node-1/node`, both node managers running (37 to 43 ms).
- **Requests**: to node-1 and to the master, each taken into
  `pending/default`, executed and answered (`Status given.`, with the node's
  own key and role), read back from a replica (about 350 ms each).
- **node-1 restarted** (a fresh store, only the vault's key surviving):
  ready in 8.5 s with the same identity (`a91ace97…`), the same repository
  key (`b5814ff0…`) and internal id (`919502a7…`), the same answers by URI,
  and a request answered again.
- **What a restart loses**: node-1's repository after the restart held only
  the new request: the one before, and its response, were in the store
  that was thrown away. Rebuilding a node's repositories from checkpoints
  is not built yet (node pattern, point 9).
- **The stop**: graceful, node-1 then the master, both exit 0.
- **No secret in the records**; the logs: node-1 138 lines, the master 129,
  every module's events; node-1's manager: provisioning ready, authorised,
  connected, the secret handed over, materialised, ready, stopped, per run.
