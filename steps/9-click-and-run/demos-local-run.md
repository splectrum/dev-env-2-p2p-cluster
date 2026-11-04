# The demos on a local machine: the human's run, 2026-11-02

`notes/local.md` item 2: both demo projects run from `demos.md` on the
human's own machine, with Claude Code running locally doing the commands
(the prompt in "For Claude Code"). Not a recorded run: nothing written
into the repository but this report; both projects torn down afterwards.

The human's verdict: **"really good"**, and **"otherwise the work is
really good"**, with feedback on Splectral (below): to be taken into
account, not to be built now.

## The machine

The same as at the first local run (`steps/7-splectral/local-machine-run.md`):
Windows with WSL2, Ubuntu 24.04.2, kernel 5.15.167.4-microsoft-standard-WSL2;
Docker Engine 28.3.0 inside the distribution; Node.js 24.21.0, npm 11.19.0;
Bare 1.36.2 (runtime 1.36.0). Dev tree: `main` at `c88885f` (the code of
`04bcb84`, after step 10), in an existing clone from before step 9.

## What was done

| Command | Result | Time |
|---|---|---|
| `sh haicc check base-demo-liveness` | first: `Cannot find package 'p2p-dht'` (finding 1); after section 2 again: every machine requirement `met`, the project's parts `missing` | 3.5 s |
| `sh haicc start base-demo-liveness` | done: folders, vault, image (built for this commit), Splectral's configuration and server, swarm, watcher; node-1 brought up by the watcher a few seconds after the master | 27 s |
| the scenario "A node goes quiet", from the browser | 8 steps done, the refusal seen ("Refused: absent: /hosts/node-1/node"), "Scenario finished." | 49 s |
| `sh haicc stop base-demo-liveness` | swarm, watcher, Splectral removed; no containers left | 4 s |
| `sh haicc check base-demo-other-host` | machine met, the project's parts missing (the image already there) | |
| `sh haicc start base-demo-other-host` | done, the image reused | 26 s |
| the scenario "A node on another host", from the browser | 8 steps done, "Scenario finished." | 31 s |
| `sh haicc stop`, then `teardown` for both | nothing left: 0 containers, 0 `p2p-hosts` networks, port 4400 free; each work folder holding only `deployment/`, `runs/`, `splectral.out` | |

Each scenario's topic holds one run: **Run again** was not exercised this
time. Whether the browser opened by itself (WSL, `cmd.exe`) was not
reported. The node image `p2p-node:c88885f` stays after teardown, by
design.

## The human's feedback on Splectral

The direction it belongs to, in the human's words: Splectral is going to
be built as a platform for multiple functional components that are part
of a solution. That is the future vision, approached step by step; this
feedback is noted for it, not asked for now.

1. **Time on the other screens too.** Only the Timeline shows when things
   happen; the Map, the scenario's page and the node pages should show
   time as well (when a message was said, when a node changed, how long a
   step took).
2. **The demo app as a tab, components as tabs inside it.** Today a link
   in the left-hand menu opens a tab of its own. Wanted: the demo app
   (the project) is one tab, with its left-hand menu inside it; within it,
   several tabs, one per component (the scenario, the map, the timeline, a
   node), side by side as now. It fits the direction above: a solution's
   tab holding its components.

## Findings

Findings 1 to 4 and 7 fixed on 2026-11-04
(`steps/10-deployment-on-swarm/8-local-run-fixes/`).

1. **An existing clone after the move to `<org>/<repo>` folders.** `check`
   failed with `Cannot find package 'p2p-dht' imported from
   .../pear-full-square/p2p-swarm-manager/index.js`: the workspaces moved,
   and section 2 must run again. The message doesn't say so. `check` could
   carry an install requirement (the workspace's `node_modules` resolving,
   with section 2 as its hint), so it says what to do instead of
   failing.
2. **`package-lock.json` is stale.** `npm install` at the root removed 166
   lines: entries marked `extraneous` for the old top-level folders
   (`p2p-channel`, `p2p-connect`, ...), leaving the tree dirty. Restored
   here by hand (`git checkout package-lock.json`) before starting, since
   the image is tagged by the commit; committing the cleaned lockfile
   removes it for everyone.
3. **Old top-level folders stay in existing clones**: `mycelium-git/`,
   `mycelium-layer/`, `mycelium-repo/` holding only their ignored
   `node_modules`. Harmless, confusing; worth a line in `demos.md`
   (remove them after the move), or nothing if new clones are the norm.
4. **`check` doesn't say the machine is fine.** The readable output lists
   only what is missing; when every machine requirement is met, nothing
   says so, and before the first start the list of missing parts looks
   like a failure. A first line such as "machine: all 8 met" (and "the
   project: not deployed yet, `start` deploys it") would read better.
5. **Fast.** A first start in 27 s with the image build, the second
   project in 26 s, stop in 4 s: `demos.md`'s "about a minute" is
   generous on this machine.
6. **WSL2 and Node 24** keep working; `check` agrees (Node "22 or later",
   Bare's runtime 1.36.0).

## Step 10's deployment on the swarm, by hand

`notes/local.md` item 3, done by the local agent the same day:
`steps/10-deployment-on-swarm/7-validation/demo.sh` phases `genesis` to
`stop-swarm`, in a work folder outside the repository, deleted
afterwards. Every phase as in the record but one check:

| Phase | Result | Time |
|---|---|---|
| `genesis` | the swarm's deployment on the master wants node-1 (commit `0823779`); only the master runs | 21 s |
| `manual` | shadowed: `deployment`, then `deployment-pending` with `node-1:create`; nothing started | 13 s |
| `auto` | node-1 brought up | 4 s |
| `change` | `worker-nodes:create`, `hosts-node-1:remove` applied (commit `757ddfe`); master, worker-1, worker-2 running, node-1 stopped | 30 s (the record: 47 s) |
| `refused` | "the master is not deployed: it holds the deployment"; the swarm's deployment unchanged | 7 s |
| `shadow` | master `running`; worker-1 and worker-2 `starting` (the record: all `running`) | |
| `stop-swarm` | nothing of the swarm left running | 19 s |

7. **The `shadow` phase's check depends on the order the filesystem lists
   files.** Read in offset order, every node's shadows are right
   (`starting`, `running`, then `stopping` at the stop). The phase takes
   `grep -rh ... | tail -1` over the topic's record files, and `grep -r`
   follows the directory's listing order, which on this filesystem (ext4
   in WSL) is not the files' order (`...052.json`, `...031.json`,
   `...010.json`, ...). The last line printed is then not the last
   record. Reading the topic (as `shadowLog` does, with `mycelium-topic`)
   or sorting the files first makes it exact. The product is fine; the
   check is not.
