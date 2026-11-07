# Step 2: a node's boot, validated by the node itself (2026-11-07)

The cold boot (the swarm's HAICC) copies the platform's package into the
node (hard links) and hands over; the warm boot (the node's own HAICC)
validates it: each package intact (its hash against the one it was written
with), then its validation set. Up only when both pass.

Validated here, from a fresh release, Node.js off the PATH:
`./haicc boot base-package-haicc/test`, 7 passed; the platform test's 23
steps, among them a file replaced in a node's copy: not intact, not up, the
swarm's boot stopped there, repaired by a shutdown and a boot from scratch.
The local test: `local-run.md`, to come.
