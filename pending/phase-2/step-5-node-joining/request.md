# Request: step 5, a node joining

From the plan (`main:notes/plan.md`, step 5). A node joins the swarm made
in step 4. A thin path, end to end.

## Parts

1. **Provisioning through the auxiliary swarm.** The node manager runs a
   peer of its own on an internal network shared only with its node. The
   node's boot program generates an ephemeral keypair and writes the public
   key to its log; the manager authorises exactly that key and hands the
   node its secret on a channel, into memory, once. (`p2p-connect` gains
   connecting to a peer by its key.)
2. **The code by replication.** The node resolves the master's packages by
   URI, checks the commit it was told to run, materialises the code from a
   replica into its RAM store, and starts the node from there.
3. **The node goes live.** It clones the swarm's boot repository (a new
   repository of the master's, made at genesis) into its own `node`
   repository, under its own key, its origin recorded; joins under its
   friendly name (unique, checked by `p2p-rns`); registers its repository
   and serves it.
4. **Requests in code.** A request comes as a bundle over a channel; the
   node's intake commits it into `pending/default`, the node executes it
   (`Status: node`) and responds on `main`; the requester reads the
   response from a replica.
5. **The managers.** The node manager provisions and follows a joining
   node; the swarm manager adds nodes (`join`) and records them.
6. **Validation.** Genesis, then a node joining; the swarm's nodes and
   resources resolved by URI from the host; a request to the joined node
   and one to the master, answered and read back; the joined node restarted
   with the same identity and name; a graceful stop; audit and metrics
   recorded, no secret in them.
7. **The product repositories** of the modules changed.

Not in this step, recorded as such: an image holding only the join
closure (it still holds all the code), the master provisioned the same way
(it keeps stdin), admitting request writers (intake records the sender).

## Done

All parts done, recorded in `main:steps/5-node-joining/`.
