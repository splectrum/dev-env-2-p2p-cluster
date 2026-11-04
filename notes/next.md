# Handover: where the phase stands, and how to continue

Written 2026-11-01 after step 7, updated 2026-11-02 after steps 8, 9 and 10 (the phase's request met), for the next session (or after
compaction). Read this first, then `rules.md` (single concern first), then
`notes/plan.md`. Everything below is on `main`.

## Paused (2026-11-02)

After step 10 (phase 2's request met), for the human to look at the work
locally: `notes/local.md` lists what to do there (the `haiccing` merge
for the local agent, the demos in the flesh, what to report). Resume from
what they bring back.

## Where it stands

Phase 2, the P2P swarm (the request: `pending/phase-2/request.md` on
`pending/default`). Steps, each with its request, parts and records:
`steps/` (index: `steps/readme.md`).

| Step | Status | Record |
|---|---|---|
| 0. Probes | done | `steps/0-probes/` |
| 1. Mycelium back to its own concern | done | `steps/1-mycelium/` |
| 2. The p2p series | done | `steps/2-p2p-series/` |
| 3. Repositories on the p2p layer | done | `steps/3-repositories/` |
| 4. The swarm: genesis | done | `steps/4-genesis/` |
| 5. A node joining | done | `steps/5-node-joining/` |
| 6. A node on another host | done (simulated on one machine) | `steps/6-other-host/` |
| 7. Splectral and data in topics | done | `steps/7-splectral/` |
| 8. Liveness | done | `steps/8-liveness/` |
| 9. Click and run | done | `steps/9-click-and-run/` |
| 10. The deployment on the swarm | done | `steps/10-deployment-on-swarm/` |

**What runs today.**
- A swarm manager on the host does genesis and adds nodes. Every node,
  the master included, is a hardened container provisioned by its own node
  manager through the auxiliary swarm (its secret into memory only), and
  keeps that link as its management channel.
- Joining nodes run the master's packages by replication. Requests in code
  are answered by every node. Everything is reached by URI
  (`/<swarm>/<node>/<name>`).
- A node on another host joins from an invitation (public facts only)
  under its own manager, vault and auxiliary network, on the one data plane
  all nodes reach. The swarm manager sees it but does not control it.
- **Data in topics**: the managers' records are Kafka records in topics
  (`mycelium-topic`); state is their fold.
- **An observer on every node** (`splectral-p2p-observer`) takes named
  actions from its manager, through the node's action topic and the
  management channel.
- **Splectral**: a browser platform showing hosts, nodes, resources and
  activity live, with the step 6 scenario as a demo, live and replayed,
  tested in headless Chromium. To run it locally:
  `steps/7-splectral/local-machine.md` (with a prompt for Claude Code).
- **Liveness** (step 8): p2p-rns holds a 15 s lease per node, renewed by
  the node's heartbeat; a silent node is flagged absent (records kept,
  flagged), present again when heard; a graceful stop leaves. Requesters
  refuse an absent node at once. Splectral shows presence; the scenario
  "A node goes quiet" (`base-demo-liveness`) freezes and thaws node-1.
  `steps/8-liveness/6-validation/demo.sh` runs it like step 7's.
- **Click and run** (step 9): a demo is a HAICC project
  (`haiccing/base-demo-liveness`, `base-demo-other-host`): `sh haicc
  start <project>` checks the machine, deploys and starts a test cluster
  with Splectral on top; Run in the browser, Run again any time (the
  project reconciled first); `stop`, `teardown`. `haicc-reconcile` (check,
  plan, make it so; non-strict by default, only what it owns) and
  `haicc-deployment` (the lifecycle as records). Splectral is spoken to
  through topics, has tabs, knows its project. How to run: `demos.md`.
- **The deployment on the swarm** (step 10): the master keeps the swarm's
  `deployment` repository (each change a commit), handed over at genesis
  and changed by request (`Deployment: set`); the swarm manager follows
  and shadows it, reports in manual mode, makes the substrate match in
  auto mode (`watch`); nodes shadow their managers. The demo projects
  declare the swarm's part (node-1); the watcher brings it up.
- **The folders are `<org>/<repo>`** (step 9): `pear-full-square/` the
  engines (all code), `splectral/` the components, `haiccing/` the
  projects, each folder its product repository.

## The design, where it is written

- **`rules.md`**: single concern first (one concern, one place;
  validation at the boundary; knowledge stays with its concern); branches
  and process; records and topics (Kafka records, Kafka's names); URIs;
  data names (lowerCamelCase, URI form with hyphens, `_` reserved).
- **`notes/node-pattern.md`**: the node, its provisioning, the host side,
  one data plane.
- **`notes/topics.md`**: data in topics: the record (partial Kafka record,
  data in `value`, metadata in `headers`), partitions, segments archived
  and sealed, the fold; records and objects as two levels.
- **`notes/splectral.md`**: Splectral as a platform (viewer first, then
  interaction, then applications); extensions; the abstract world;
  applications agnostic of p2p.
- **`vision.md`**: the directions. The organisations: `pear-full-square`
  is infrastructure (including Splectral's platform), `splectral` holds
  applications on it (named `<package>-<kind>-<name>`), and `splectrum` is
  the language medium (URI capabilities and AVRO as a DSL platform).
  Multi-paradigm data.
- **`notes/multi-swarm.md`**: vision only.

## Products

Every module has its product repository; every validated change is merged
(`notes/products.md`, step 7's table in
`steps/7-splectral/10-validation/products.md`).
- **`pear-full-square`**: the mycelium modules (`mycelium-uri`,
  `mycelium-git`, `mycelium-topic`, ...), the p2p series, `p2p-git`,
  `p2p-mrepo`, `p2p-rns`, `p2p-node`, the two managers, and the Splectral
  platform (`splectral-contract`, `-model`, `-transport`, `-server`,
  `-shell`, `-replay`, `-scenario`, `-timeline`, `-p2p-watchers`,
  `-p2p-actions`, `-p2p-observer`).
- **`splectral`**: `base-view-map`, `base-demo-other-host`,
  `base-demo-liveness`.

## Decisions waiting on the human

0. **The direction agreed for the next phase** (`notes/packages.md`):
   packages (`prerequisites`, `mycelium`, `splectral`, `haicc`; third-party
   code imported once; latest versions for now), cascading click and runs
   as `haiccing` projects with their own tests, then an Android skeleton
   node (a Termux probe, by the local agent). Its request is to be written.
1. **What comes next: phase 2's request is met** (steps 0 to 10; the
   mapping in `notes/plan.md`). The next phase is the human's call.
   Candidates, from what is carried forward:
   - the nodes' audit cores (with Splectral's `repository` and `swarm`
     sources), so Splectral works across real machines;
   - interaction in Splectral, with identities and permissions (its
     actions start and stop swarms; who may change a deployment);
   - the deployment in Splectral; node types and configurations;
     `p2p-propagate` (several hosts' managers on one deployment);
   - several projects at once; the capability store and small runs; the
     repository-based versions; a real second machine; Pear with fixed
     versions; HAICC's project tool.
2. **The `haiccing` projects' product merges**: done 2026-11-02 by the
   local agent, from dev `04bcb84` (step 9's table in
   `steps/9-click-and-run/8-validation/products.md`). Later merges are
   plain, from a session that can attach them, or locally the same way.
3. **The human ran the demos locally** (2026-11-02, WSL2, Node 24): both
   projects started, ran, stopped and were torn down with `haicc`; "really
   good". Report and findings: `steps/9-click-and-run/demos-local-run.md`.
   Feedback on Splectral, noted for the vision (a platform for a
   solution's components, step by step; `vision.md`,
   `notes/splectral.md` open point 4), not asked for now: the demo app
   as a tab with its menu and components as tabs inside it; time on
   every screen. Step 10's deployment run by hand too: as recorded, but
   for the `shadow` phase's check, which reads record files in the
   filesystem's order (finding 7). Findings 1 to 4 and 7 fixed on
   2026-11-04 (`steps/10-deployment-on-swarm/8-local-run-fixes/`): `sh
   haicc` says when the dependencies don't resolve, the lockfile is clean,
   `demos.md` covers existing clones, the summary says the machine is all
   met, the shadow check reads the topic in order.

## Carried forward (open, not built)

- **From step 9** (all three of the local run's fixes are done):
  - a reconcile does not notice that a running swarm's image is older
    than the code (the image requirement builds the new one; the swarm
    keeps running the old until restarted);
  - selected requirements by node type and configuration (the shape is
    there: `type`, `config`);
  - Splectral's world is rebuilt from the managers' topics at its start,
    not from its runs: a restarted Splectral shows a scenario's runs from
    then on.
- **Liveness, what is left** (step 8): how long an absent node keeps its
  name (a second, longer timeout taking it out); the lease per swarm (a
  setting, 15 s today);  a link to an
  absent node drawn as open until the connection closes.
- **The nodes' audit cores**, and Splectral's `repository` and `swarm`
  sources: other hosts' nodes seen through the swarm (step 7).
- **Splectral**:
  - replay to a point in time (step 7's one wrong check compared
    different moments);
  - a scenario page showing the pages its steps name (`show`);
  - interaction with identities and permissions (designed in
    `notes/splectral.md`).
- **The node image**: it holds all the code, and since step 7 React and
  htm too (the workspace's one tree); an image with the join closure only.
- **Rebuilding a node's repositories from checkpoints**: a restart keeps
  identity, keys and ids, but loses what its repositories took in.
- **Admitting request writers** (intake records the sender, admits
  everyone).
- **The vault** is a stand-in (an owner-only file, not encrypted); release
  or sign.
- **Replication policy**; dedicated channels.
- **The invitation**: how it travels, signed by the master, address
  allocation on a shared data plane.
- **Topics** (`notes/topics.md`, open):
  - the header values' schema;
  - the segment policy;
  - offsets on a core;
  - batching;
  - which record properties come next (`key`, `timestamp`).
- **The repository-based versions** (roadmap):
  - p2p-rns on a repository;
  - the inbox as writer cores;
  - the capability store with gitlinks;
  - the swarm's record as a deployment repository.
- **Code loaded by replication runs from an exec tmpfs** (a recorded
  trade-off).

## How to work here

- **Rules**: `rules.md`, `CLAUDE.md`. Single concern first. Design first:
  discuss, then write what settles; the rules follow the design.
  - `main` changes only by plain merges from `execute/main`.
  - Never force-push.
  - Requests, and only requests, go on `pending/default`; outcomes and
    notes are data on `main`.
- **A step's cycle**:
  1. Its request on `pending/default`
     (`pending/phase-2/step-<n>-<name>/request.md`), written in a
     worktree of `pending/default` that is removed afterwards.
  2. The work on `execute/main`, part by part (`steps/<step>/<n-part>/`),
     committed as it goes.
  3. Unit tests and the step's validation, recorded with `steps/record.sh
     <step> <part> <case>=<command> ...`, or a `run.sh` that calls it.
     Run from the root, committed first (the unit names the dev commit).
     Never touch the tree while a recorded run is going: draft in the
     scratchpad.
  4. Findings in the part's readme, honestly, including what failed and
     why. Then the step's outcome, the plan's and `steps/readme.md`'s
     status, and the design notes where the design learns.
  5. Validated modules get new ids (`package.json`) and their product
     repositories are updated:
     - attach the repository (`add_repo`, push) and clone it;
     - `git subtree split --prefix=<org>/<module>`. Since step 9's move
       to `<org>/<repo>` folders, the first merge after the move is one
       join, `--allow-unrelated-histories`, no file changed; plain merges
       after;
     - plain merge into the product's `main`. The first time,
       `--allow-unrelated-histories`, and the product's LICENSE stays.
       For a product with an older history, take the folder's files.
     - push, verify against the remote, record in `notes/products.md`.
  6. Merge `execute/main` into `main`, and push `main`, `execute/main` and
     the session branch.
- **Commit messages**: first line the change; body why; `Request:
  <pending/default commit>:pending/phase-2/<step>/request.md`.
- **Modules**: folders on `main` at `<org>/<repo>`, as their product
  repositories (since step 9): `pear-full-square/` the engines,
  `splectral/` the components, `haiccing/` the projects.
  - The p2p series, the node, the managers and the Splectral modules are
    npm workspaces at the root: one dependency tree, with the root
    `package.json` carrying Bare's `bare-node-*` aliases.
  - The mycelium modules (and `mycelium-topic`, which has no dependencies)
    are imported by relative path.
  - Components (`splectral/base-*`) are folders with a `splectral.json`.
  - Unit tests: `sh steps/1-mycelium/validation/unit-tests.sh
    pear-full-square/<module>`.
- **Validation**: only where input enters, with `mycelium-uri`. Internal
  APIs trust their callers.

## Practical, in this cloud session

- `npm install` at the root needs `PUPPETEER_SKIP_DOWNLOAD=1` (p2p-git is a
  git dependency whose preparation pulls puppeteer).
- The Docker daemon is not running at start, and stops now and then:
  `(dockerd > /home/user/runs/dockerd.log 2>&1 &)`, then wait for
  `docker info`.
- Bare: `bare` on the PATH is npm's wrapper, which suppresses signals. For
  long-running processes on the host use the binary,
  `$(npm root -g)/bare/node_modules/bare-runtime-linux-x64/bin/bare`.
  Inside containers (`bare-base`) the binary is the runtime.
- Bare differences met:
  - no global `process` (import it);
  - `spawnSync` gives bytes;
  - `util` lacks `isDeepStrictEqual`;
  - asynchronous stdout loses a line written just before `process.exit`
    (write logs with `fs.writeSync`).
- Containers: native addons need an exec mount, and Docker's `--tmpfs` is
  noexec by default. The root is read-only, so `/tmp` is a tmpfs.
- Kill by pid files. Never `pkill -f` with a pattern that appears in the
  same command line: it kills the shell. Don't `rm` globs in shared
  folders (`/dev/shm`): use exact paths.
- Node's `http` server: `server.close()` waits for keep-alive connections
  (as `fetch` leaves them). Call `closeAllConnections()` too.
- Playwright and Chromium are preinstalled: `NODE_PATH=$(npm root -g)
  node <script>.cjs`. Screenshots can be shown to the human with
  SendUserFile.
- Long runs go in the background (`run_in_background`), followed with a
  Monitor on the record's `results.jsonl`, not with `sleep`.
- Scratch work goes in the session's scratchpad (outside the repository);
  records go into `steps/<step>/<part>/record/`.
- Images: `pear-full-square/p2p-node-manager/image/build.sh .` builds `bare-base:1.36.0`
  and `p2p-node:<commit>` from a committed tree.
- A demo for a try: `sh haicc start base-demo-liveness
  --work=<scratch>/live` (then `stop`, `teardown`; one project at a time).
  Its validation: `steps/9-click-and-run/8-validation/demo.sh` (phases in
  its header). A swarm on its own: `node
  pear-full-square/p2p-swarm-manager/cli.js genesis|join|start|stop-node|status|stop
  ...`. Always stop or tear down: containers and networks stay otherwise.
- This session cannot attach two repositories of the same name from
  different organisations (it checks them out by name): the `haiccing`
  projects' merges go through another session or by hand.

## To continue

"Read `notes/next.md` and continue." The next step is the human's call
(decisions above). Once chosen, write its request and follow the cycle.
