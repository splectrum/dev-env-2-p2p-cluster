# Part: the first build's code removed

**Scope.** The first build's code (2026-10-30) depended on what left
mycelium-git and is superseded by the plan: `mycelium-node/` and the
scripts in `cluster/` (`base/`, `bootstrap/`, `deployment/`, `pkg/`,
`stage.sh`, `two-nodes.sh`, `boot-nodes.sh`) are removed.

Kept: their records, `cluster/runs/`, with `cluster/README.md` saying what
they are; what they proved is in `notes/status.md`. The code itself stays
in this repository's history (last at `fa009fd`).
