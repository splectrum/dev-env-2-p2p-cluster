# Step 10. The deployment on the swarm

Status: **done** (2026-11-02). Request:
`pending/phase-2/step-10-deployment-on-swarm/request.md` on
`pending/default` (`b67fae5`). The phase's request, done item 4: a
deployment repository bringing up a seed and a joining node, recording
them. Design: `notes/haicc-reconcile.md` and `notes/node-pattern.md`
(authority).

| Part | What | Status |
|---|---|---|
| `1-repository/` | the swarm's deployment repository on the master | done |
| `2-manager/` | the swarm manager: handover, shadow, manual and auto | done |
| `3-shadows/` | nodes shadow their managers | done |
| `4-haicc/` | HAICC on the deployment on the swarm | done |
| `5-splectral/` | the deployment in Splectral | carried forward |
| `7-validation/` | end to end, recorded; the products | done |

**Outcome.** The swarm keeps its deployment: a repository on the master,
each change a commit, handed over at genesis and changed by request. The
managers keep to the substrate: they follow it, shadow it, report in
manual mode and make it so in auto mode; nodes shadow their managers.
HAICC's projects declare the swarm's part and the swarm brings it about.
With this, the phase's request is met (done item 4: a deployment
repository bringing up a seed and a joining node, recording them).

Carried forward: the deployment in Splectral (part 5); admitting who may
change the deployment (requests are open); node types and configurations
in the deployment; several hosts' managers following one deployment, each
acting on its part (`p2p-propagate`).
