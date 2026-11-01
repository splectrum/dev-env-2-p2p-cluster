# Step 6. A node on another host

Status: **done** (2026-11-01), with the other host simulated on this
session's one machine. `p2p-node`, `p2p-rns` and `p2p-mrepo` (unchanged
in this step) merged into their new repositories after it. Request:
`pending/phase-2/step-6-other-host/request.md` on `pending/default`
(`997f17e`). Scope: `notes/plan.md`, step 6.

A node on another host joins the swarm under its own node manager, with
its own vault and auxiliary network, given only an invitation: the swarm
sees it and resolves it by URI; its swarm manager does not control it.

| Part | What | Record |
|---|---|---|
| `probe/` | reaching the swarm from another host: one data plane | `probe/record/` |
| `invitation/` | what another host is given: public facts only | `validation/record/host-b/invitation.json` |
| `managers/` | a node manager on its own; the swarm manager tells controlled from not | `validation/record/host-*/` |
| `validation/` | end to end, the two hosts' records apart | `validation/record/` |
| `product/` | the product repositories | `product/readme.md`, `notes/products.md` |

To repeat it on a machine of your own (local network only):
`local-machine.md`.

**How the other host is simulated.** One machine, one Docker daemon. Host
B is its own folder, vault, node manager (a process started apart from the
swarm manager) and auxiliary network; from host A it gets the invitation
and nothing else, and it shares with host A only the swarm's data plane
(the network both hosts reach, as an overlay or the LAN would between real
hosts). Host B's requester runs in a container on that network, at an
address of its own, not host A's. Not simulated: a second Docker daemon,
a network between machines (latency, loss, NAT), host B building or
pulling the image itself (it uses the invitation's image by its tag).

**Outcome.** The general pattern holds: a node joins from an invitation
under a manager of its own, is provisioned on its own host's management
plane, runs from the swarm's code by replication, is reached by URI from
host A and reaches host A's nodes; it restarts with the same identity and
stops while the swarm runs on. The probe settled one design point (one
data plane, `node-pattern.md`) and the run showed one gap: nothing tells
the swarm a node has gone (p2p-rns in code keeps its registration, peers'
DHTs its address).
