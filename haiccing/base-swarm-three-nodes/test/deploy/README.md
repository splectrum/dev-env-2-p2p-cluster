# deploy

The package deployed through a root, as a user would: a fresh install
inside this test's run (the platform this one runs on, its setup built
here, sourced from the same haiccing/), `./boot`, then
`./haicc boot base-swarm-three-nodes`: the package checked intact, its swarm
`three-nodes` made from its configuration, its three nodes booted (each validates the platform's pair), the master's
build assembling the codebase into `three-nodes/master/packages/base-swarm-three-nodes/`. Booted
again from its own copy; under another name, strict (`--as`, `--strict`: a
node not in its package refused); the swarm shut down and booted (the
codebase assembled again); both torn down. The platform's default teardown removes the run,
the install with it.
