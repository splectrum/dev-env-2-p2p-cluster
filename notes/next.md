# Handover: where the phase stands, and how to continue

Written 2026-11-01, for the next session (or after compaction); updated
after step 6. Read this
first, then `notes/plan.md`. Everything below is on `main`.

## Where it stands

Phase 2, the P2P swarm (the request: `pending/phase-2/request.md` on
`pending/default`). Design: `notes/node-pattern.md` (settled, with open
points), `notes/multi-swarm.md` (vision only). Plan: `notes/plan.md`.
Steps, each with its request, parts and records: `steps/` (index:
`steps/readme.md`).

| Step | Status | Record |
|---|---|---|
| 0. Probes | done | `steps/0-probes/` |
| 1. Mycelium back to its own concern | done | `steps/1-mycelium/` |
| 2. The p2p series | done | `steps/2-p2p-series/` |
| 3. Repositories on the p2p layer | done | `steps/3-repositories/` |
| 4. The swarm: genesis | done | `steps/4-genesis/` |
| 5. A node joining | done | `steps/5-node-joining/` |
| 6. A node on another host | done (simulated on one machine) | `steps/6-other-host/` |

What runs today: a swarm manager on the host does genesis (a master node
in a hardened container: the swarm's DHT, p2p-rns in code, the packages
and boot repositories) and adds joining nodes, each provisioned by its own
node manager through the auxiliary swarm and run from the master's
packages by replication; requests in code are answered by every node;
everything by URI (`/<swarm>/<node>/<name>`). A node on another host joins
from an invitation (public facts only) under its own node manager, vault
and auxiliary network, on the one data plane all nodes reach (a DHT node
has one address); the swarm manager sees it and does not control it. The
phase's plan (steps 0 to 6) is done.

## Decisions waiting on the human

1. **Repositories to create** in `pear-full-square`: `p2p-node`, `p2p-rns`,
   `p2p-mrepo` (the first and last are proposed names). Their folders are
   ready to merge (split, plain merge, as for the others).
2. **Step 6 on a real second machine**, if wanted: it was simulated on
   this session's one machine (the choice made at its start, recorded in
   `steps/6-other-host/readme.md`). On real hosts the data plane needs an
   overlay or the LAN: which one is open.
3. **`pear-full-square/p2p-swarm`**: created before the connections module
   was named `p2p-connect`; unused. Keep or delete.

## Carried forward (open, not built)

- Rebuilding a node's repositories from checkpoints: a restarted node keeps
  its identity, keys and ids, but loses what its repositories took in
  since it started (found in step 5).
- The image holds all the code; an image with the join closure only.
- The master gets its secret on stdin; to be provisioned through the
  auxiliary swarm as joining nodes are.
- Admitting request writers (intake records the sender, admits everyone).
- The vault is a stand-in (an owner-only file, not encrypted); release or
  sign.
- Replication policy (which resources to which peers); dedicated channels.
- The repository-based versions (roadmap): p2p-rns on a repository, the
  inbox as writer cores, the capability store with gitlinks, the swarm's
  record as a deployment repository.
- Code loaded by replication runs from an exec tmpfs (a recorded
  trade-off).
- Liveness: p2p-rns in code keeps a gone node's registration and peers
  wait on its address (step 6); a registration held while connected, or a
  lease, and leaving on a graceful stop.
- The invitation: how it travels, signed by the master, address
  allocation on a shared data plane.

## How to work here

- **Rules**: `rules.md`, `CLAUDE.md`. Design first, discuss, write what
  settles; the rules follow the design. `main` changes only by plain merges
  from `execute/main`; never force-push; requests (only requests) on
  `pending/default`; outcomes and notes are data on `main`.
- **A step's cycle**: (1) its request on `pending/default`
  (`pending/phase-2/step-<n>-<name>/request.md`, written in a worktree of
  `pending/default`); (2) the work on `execute/main`; (3) unit tests and
  the step's validation, recorded with `steps/record.sh <step> <part>
  <case>=<command> ...` (run from the root, committed first: the unit names
  the dev commit; never touch the tree while a recorded run is going);
  (4) findings in the part's readme, the step's outcome, the plan's and
  `steps/readme.md`'s status, `notes/node-pattern.md` where the design
  learns; (5) a validated module gets a new id (`package.json`), and its
  product repository is updated: `git subtree split --prefix=<module>`,
  plain merge into the product's `main` (first time:
  `--allow-unrelated-histories`, the product's LICENSE stays), pushed;
  recorded in `notes/products.md`; (6) merge `execute/main` into `main`,
  push both.
- **Commit messages**: first line the change; body why; `Request:
  <pending/default commit>:pending/phase-2/<step>/request.md`.
- **Modules**: folders on `main`. The p2p series and the node and managers
  are npm workspaces at the root (one dependency tree; the root
  `package.json` carries Bare's `bare-node-*` aliases). The mycelium
  modules keep their own `node_modules` and import siblings by relative
  path.

## Practical, in this cloud session

- `npm install` at the root needs `PUPPETEER_SKIP_DOWNLOAD=1` (p2p-git is a
  git dependency whose preparation pulls puppeteer).
- The Docker daemon is not running at start, and stops now and then:
  `(dockerd > /home/user/runs/dockerd.log 2>&1 &)`, then wait for
  `docker info`.
- Bare: `bare` on the PATH is npm's wrapper, which suppresses signals; for
  long-running processes on the host use the binary,
  `$(npm root -g)/bare/node_modules/bare-runtime-linux-x64/bin/bare`.
  Inside containers (`bare-base`) the binary is the runtime.
- Bare differences met: no global `process` (import it); `spawnSync` gives
  bytes; `util` lacks `isDeepStrictEqual`; asynchronous stdout loses a line
  written just before `process.exit` (write logs with `fs.writeSync`).
- Containers: native addons need an exec mount; Docker's `--tmpfs` is
  noexec by default; the root is read-only, so `/tmp` is a tmpfs.
- Don't `pkill -f` with a pattern that appears in the same command line
  (it kills the shell); kill by pid files. Don't `rm` globs in shared
  folders (`/dev/shm`): use exact paths.
- Scratch work goes in the session's scratchpad (outside the repository);
  records go into `steps/<step>/<part>/record/`.
- Images: `p2p-node-manager/image/build.sh .` builds `bare-base:1.36.0` and
  `p2p-node:<commit>` from a committed tree.
- Swarms for a try: `node p2p-swarm-manager/cli.js genesis --swarm=demo
  --folder=<w>/demo-swarm --nodes=<w> --vault=<w>-vault --code=.`, then
  `join --folder=... --node=node-1`, `status`, `restart`, `stop` (always
  stop: containers and networks stay otherwise).

## To continue

The plan's steps are done. Next is the human's call: what comes after
the plan (the items carried forward, the roadmap's repository-based
versions, the request's remaining done items), and the decisions above.
