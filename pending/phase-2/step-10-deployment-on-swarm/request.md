# Request: step 10, the deployment on the swarm

The phase's request, done item 4: "a deployment repository bringing up a
seed and a joining node, recording them" (in code since steps 4 and 5).
The design agreed with the human (`main:notes/haicc-reconcile.md`,
authority; `main:notes/node-pattern.md`, authority): the swarm is the
authority for all that is the swarm; the swarm and node managers for the
substrate; a 100% split, but for auto mode; nodes may shadow their
managers.

## The design

- **The swarm's deployment repository**: `deployment`, a repository on the
  master (as `packages` and `boot`), registered as
  `/<swarm>/master/deployment`, replicated to whoever follows it. It holds
  the swarm's part of a deployment, `deployment.json`: the nodes the swarm
  wants, named or selected (`{ name }`, `{ prefix, atLeast }`, with `type`
  and `config` reserved). Each change a commit: the history is the record.
- **The handover at genesis**: the swarm manager is given the swarm's part
  with the swarm; genesis commits it as the deployment's first commit.
  From then on the swarm is the authority.
- **Changes go through the swarm**: a request to the master (`Deployment:
  set`, the new `deployment.json` in the request), taken in and committed
  by the master. Senders are not yet admitted or refused (open, as all
  requests today).
- **The managers keep to the substrate.** The swarm manager follows the
  deployment as a replica and keeps a shadow of it in its topic. In
  **manual mode** (the default) it reports what the swarm's deployment
  would need of the substrate and changes nothing. In **auto mode** it
  accepts the updates: it makes the substrate match (containers for the
  nodes wanted, its own extras stopped), with `haicc-reconcile`.
- **Nodes shadow their managers**: a node manager passes its state to its
  node over the management channel; the node keeps it, read-only, and
  says it in its status.
- **HAICC on top**: a project declares the swarm's part (its nodes)
  instead of the nodes themselves; deploying writes it to the swarm (at
  genesis, then by request), and the swarm manager in auto mode brings the
  nodes up. The demos keep working, run again included.

## Parts, in order

1. **The deployment repository** (`p2p-node`, master role): created at
   genesis from the given swarm part, registered; `Deployment: set`
   requests committed.
2. **The swarm manager**: the swarm's part given at genesis; the
   deployment followed and shadowed (`topics/deployment`); manual mode
   reporting, auto mode reconciling (a process of its own: `watch`).
3. **Nodes shadow their managers** (`p2p-node-manager`, the observer and
   the node).
4. **HAICC**: a provider for the swarm's part (`swarm-deployment`:
   observed through the swarm manager's shadow, set by request), the
   swarm manager's watcher as a running requirement; the demo projects
   moved to it.
5. **Splectral**: what the swarm wants beside what runs (the map or a node
   page), if small; otherwise carried forward.
6. **Validation and products.** Unit tests; a swarm whose deployment is
   changed by request: manual mode reports, auto mode brings a node up and
   stops one taken out; nothing else touched; the demos run twice;
   recorded; the products merged.

## Done

All parts done, recorded in `main:steps/10-deployment-on-swarm/`. The
phase's request then fully met.
