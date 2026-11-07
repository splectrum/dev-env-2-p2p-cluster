# The development pipeline

Status marks: **built** (in the code, tested), **agreed** (decided, not
built), **open** (under discussion).

Where this is going (the roadmap, `notes/plan.md`): this repository as the
code-development repository for the modules of every organisation,
implementing the pipeline's processes end to end, from three angles: cloud
(a session on a GitHub checkout, in a sandbox), local (an always-on Linux
machine, a swarm node, with agents taking part in the local test while
cloud development goes on), and the swarm. Built over time.

## The modules are the source of truth

**Agreed** (the human, 2026-11-07). This repository implements the visible
code transitions of the modules; the changes are committed into the
modules themselves (their own repositories: `pear-full-square/<module>`,
`splectral/<component>`, ...).

- **Tested on the modules themselves**, not on a copy here.
- **Packages are written from the modules** (at their commits), not from
  local copies: a package records which commit of each module it holds.
- This repository keeps its local copies in sync with the modules' commits.

*Why*: code merges from several development environments stay consistent:
they meet in the modules, where merging happens; a package is traceable to
exact module commits.

Consequence: the manual product split (`git subtree split` into each
product repository, `notes/products.md`) goes: the change is made in the
module in the first place.

**Open**: how the local copies are held: git submodules (each module's
folder a checkout of its repository, pinned to a commit; git does the
syncing; a commit here states exactly which module commits it was built
and tested with), or plain folders kept in sync by a tool (today's way:
simpler to edit, but a copy and its module can drift).

## Cloud and local communicate through GitHub

**Agreed** (the human). A cloud session can reach only GitHub; the local
node answers through it too.

## A candidate is rebuilt, not carried

**Agreed** (the implementer's call, given to it by the human). Local
rebuilds a candidate from the same commits and compares the hashes with
cloud's (the packages', the setup's), rather than receiving built files.

*Why*: it proves the build reproducible, and no binaries travel through git.

## Who does what

**Agreed**: the split between agents and the human is the human's, with the
local agent. Coding has maximal autonomy: most guides are for agents; the
platform's user guide is for people and agents alike.

## Tools

**Agreed**: the pipeline's processes become tools of this repository
(today some are scripts in a step's folder: `publish.sh`), and where
possible run on a HAICC platform; decided step by step.

## Branches

**Open**: too early to decide (the human). Today: `main` (settled),
`execute/main` (execution), `pending/default` (requests), a session's
`claude/...`.
