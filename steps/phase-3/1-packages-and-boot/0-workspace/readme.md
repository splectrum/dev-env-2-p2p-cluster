# Part 0: the mycelium modules in the one workspace

**Done** (`b1be425`): the six `mycelium-*` modules joined the root's npm
workspaces; their separate installs and lockfiles removed; Bare's
`crypto` and `os` aliases at the root with the others. The image build,
`demos.md` (section 2, existing clones) and `sh haicc`'s hint follow.

**Findings.**
- The dependency trees: 540 MB (the root 249 MB, mycelium-git's 267 MB,
  -layer's and -repo's 12 MB each) down to one of 279 MB.
- All 27 modules with tests pass (mycelium-git 82, p2p-mrepo 24, ...).
- A swarm end to end: genesis, node-1 joining and materialising the
  master's packages: 2,206 files (3,792 before, the duplicates gone),
  15.8 MB replicated; 63 s with the image build; stopped, nothing left.
  The node image: 295 MB.
