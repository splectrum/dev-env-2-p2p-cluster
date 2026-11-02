# Part 2: the swarm manager

**Done** (`p2p-swarm-manager/deployment.js`): the swarm's part given at
genesis and handed over by request (`deployment-handed-over`); the
deployment read as a replica and shadowed (`topics/deployment`); `watch`:
manual mode records what the substrate would need (`deployment-pending`),
auto mode makes it so with `haicc-reconcile` (`deployment-applied`),
strict on its own nodes. Commands `deploy`, `deployment`, `watch`.

**Found on a swarm, fixed:** manual mode reported nothing (the handover
had shadowed the commit: it now reports at its start); a node taken out of
the deployment was not stopped (the engine gave each provider only its
kind's requirements: a provider now sees all and picks what concerns it);
a swarm made by the manager's own genesis carried no owner (now marked
`p2p-swarm-manager`; a project's provider marks it before genesis, so a
failed genesis is still the project's to clean up).
