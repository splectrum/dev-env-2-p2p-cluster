# Running Splectral on a local machine

How to run step 7 on your own machine and see Splectral in a browser: a
swarm on host A, a simulated host B, and the step 6 scenario driven from
Splectral's page, live, then replayed. Local network only: nothing goes to
the internet while it runs.

Written to be followed by a person or by Claude Code running locally. The
section "For Claude Code" at the end says how to hand it over.

## 1. The machine

Exactly as for step 6: see `steps/6-other-host/local-machine.md`, "What
the machine needs". In short:
- **Linux on x86-64** with Docker Engine running natively, rootful.
  Docker Desktop on macOS or Windows doesn't work: the managers on the
  host must reach the Docker networks' addresses.
- **Node.js 22**, npm, git; **Bare** from npm, `npm i -g bare@1.36.2`
  (runtime 1.36.0).
- **Free subnets** `172.34.0.0/24` to `172.36.0.0/24`.
- **UDP from containers to the host's bridge addresses** (ports 49737 to
  49741) allowed by the firewall.
- **Free ports** `4400` (Splectral live) and `4401` (Splectral replaying)
  on `127.0.0.1`.
- **A browser** to watch. Optional, for the recorded browser tests:
  Playwright with its Chromium (step 5 below).

## 2. Once, while online

```bash
git clone https://github.com/splectrum/dev-env-2-p2p-cluster.git
```

```bash
cd dev-env-2-p2p-cluster && git checkout main
```

One dependency tree at the root for the p2p series, the managers and
Splectral (React and htm included); `PUPPETEER_SKIP_DOWNLOAD=1` stops
p2p-git's preparation from fetching a browser:

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm install
```

The mycelium modules keep their own `node_modules`:

```bash
for m in mycelium-git mycelium-layer mycelium-repo; do (cd $m && PUPPETEER_SKIP_DOWNLOAD=1 npm install); done
```

The base image the node image is built on:

```bash
docker pull debian:bookworm-slim
```

Optionally, build the node image now (otherwise the first run builds it):

```bash
sh p2p-node-manager/image/build.sh .
```

From here the machine can be offline.

## 3. Check

The unit tests of the modules step 7 changed or added:

```bash
for m in mycelium-uri mycelium-topic p2p-rns p2p-mrepo p2p-node p2p-node-manager p2p-swarm-manager splectral-contract splectral-model splectral-transport splectral-server splectral-scenario splectral-p2p-observer splectral-p2p-watchers; do sh steps/1-mycelium/validation/unit-tests.sh $m; done
```

Each prints `{"module": ..., "pass": n, "fail": 0}`.

## 4. The demo, watched by you

`steps/7-splectral/10-validation/demo.sh <work> <record> <phase>` runs one
phase at a time; each prints one JSON line. Choose a work folder outside
the repository and a scratch record folder:

```bash
export W=$HOME/splectral-work R=$HOME/splectral-record
```

**Host A's swarm** (about 30 s: the master, then node-1, each provisioned
through its manager):

```bash
sh steps/7-splectral/10-validation/demo.sh "$W" "$R" swarm
```

**Splectral's configuration** (`$W/splectral.json`: both hosts' folders
as sources, host B's vault for its own manager):

```bash
sh steps/7-splectral/10-validation/demo.sh "$W" "$R" config
```

**Splectral, serving** (it runs detached until stopped; its pid in
`$W/server.pid`, its output in `$W/server.out`):

```bash
sh steps/7-splectral/10-validation/demo.sh "$W" "$R" serve
```

Open **http://127.0.0.1:4400**. What you see and do:
1. **The menu** (left): the scenario "A node on another host", Timeline,
   Map, and a page per node. It grows as nodes come.
2. **Map**: host A's frame with `/hosts/master` and `/hosts/node-1`,
   filled green (running, controlled by host A), their resources beside
   them, the links between them.
3. **The scenario**: open "A node on another host" and press **Run**. Then
   go back to **Map** and watch (about 20 to 30 s in all):
   - the message on top follows the steps;
   - `/hosts/remote-1` appears on host B's frame, **outlined**: running,
     part of the swarm, not controlled by host A;
   - a ring around it when host A's request is answered;
   - a blue dot on its `node` resource when it writes;
   - it turns grey when host B's manager stops it; host A's nodes run on.
4. **The scenario's page** again: every step marked done, "Done.", the
   messages in order.
5. **Timeline**: every event, filterable by kind. **Node: /hosts/remote-1**:
   that node's own history.

The scenario runs once per swarm: host B's node is started, then stopped.
To run it again, stop everything (below) and start again from `swarm`.

**Stop Splectral, then the swarm:**

```bash
sh steps/7-splectral/10-validation/demo.sh "$W" "$R" unserve
```

```bash
sh steps/7-splectral/10-validation/demo.sh "$W" "$R" stop
```

## 5. The same run, replayed

Everything that happened is in the managers' topics and the scenario's
run (`$W/a`, `$W/b`, `$W/runs`). A second Splectral replays them, at 20
times the speed, with no swarm running:

```bash
sh steps/7-splectral/10-validation/demo.sh "$W" "$R" replay
```

Open **http://127.0.0.1:4401** and choose **Map**: the run plays again,
messages and all, ending with "Replay finished". The replay goes to the
end of the topics, so it ends after the swarm was stopped: all three nodes
grey. Stop it:

```bash
sh steps/7-splectral/10-validation/demo.sh "$W" "$R" unreplay
```

## 6. Watching from a tablet or phone

Splectral listens on `127.0.0.1` by default. To open it from another
device on your local network, after the `config` phase and before `serve`,
set `"host": "0.0.0.0"` in `$W/splectral.json` (next to `"port"`), then
open `http://<this machine's LAN address>:4400` on the device. The layout
fits a phone's width.

Splectral has no sign-in yet. Its actions start and stop nodes on this
machine. Only do this on a network you trust, and set it back afterwards.

## 7. The recorded run, with the browser tests

This is how the step's record was made: the unit tests, every phase above
as a case, and a headless browser (`ui.cjs`) doing what section 4
describes, taking screenshots and checking what it sees.

Playwright and its Chromium, once (online), installed globally so the
scripts find it with `npm root -g`:

```bash
npm i -g playwright@1.63.0
```

```bash
npx playwright install chromium
```

Then (about 3 minutes; the tree must be committed and clean):

```bash
sh steps/7-splectral/10-validation/run.sh "$HOME/splectral-run"
```

It writes `steps/7-splectral/10-validation/record/` (results, screens,
topics): compare with the committed record using `git diff --stat`, then
keep it or `git checkout` it back. Every case should exit 0; ids, keys and
times differ from run to run.

## 8. Your own configuration

`$W/splectral.json` is an ordinary file; `demo.sh config` writes one, and
you can write your own:

```json
{
  "port": 4400,
  "host": "127.0.0.1",
  "runs": "runs",
  "extensions": ["<repo>/splectral-p2p-watchers", "<repo>/splectral-p2p-actions", "<repo>/splectral-scenario", "<repo>/splectral-timeline", "<repo>/splectral-replay", "<repo>/base-view-map", "<repo>/base-demo-other-host"],
  "sources": [
    { "kind": "p2p-host", "host": "host-a", "folder": "<work>/a" },
    { "kind": "p2p-host", "host": "host-b", "folder": "<work>/b" }
  ],
  "hosts": { "host-a": { "folder": "<work>/a" }, "host-b": { "folder": "<work>/b", "vault": "<work>/b-vault" } }
}
```

- **`extensions`**: folders holding a `splectral.json`. Drop one and its
  pages, actions or scenarios leave the menu.
- **`sources`**: what to watch. `p2p-host` follows every manager's folder
  under `folder`; `file` follows one topic (`path`, `holds`); `replay`
  plays other sources back (`sources`, `speed`, `maxGap`).
- **`hosts`**: where actions may act; `vault` only for a host whose node
  manager Splectral may start.
- **`runs`**: where actions and scenario runs are recorded, relative to
  the configuration file.

Run it with `node splectral-server/cli.js --config=<file>`; stop it with
Ctrl-C.

## 9. When something goes wrong

- **The map stays empty**: the sources' folders are wrong, or the swarm
  isn't running. `node p2p-swarm-manager/cli.js status
  --folder=$W/a/hosts-swarm` says what runs.
- **The scenario stops at a step**: its page shows which step isn't done;
  the action's error is in `$W/runs/actions` (a topic: one JSON file per
  record) and on the Timeline (`actionResult`). A node that doesn't start
  usually means UDP to the bridge addresses is blocked (section 1).
- **`EADDRINUSE`**: port 4400 or 4401 is taken; stop the old server (its
  pid file) or change `"port"`.
- **Left over after a failure**: stop by pid files, then remove by name:

```bash
for f in "$W/server.pid" "$W/replay.pid"; do [ -f "$f" ] && kill "$(cat "$f")"; done; node p2p-swarm-manager/cli.js stop --folder="$W/a/hosts-swarm"; [ -f "$W/b/hosts-remote-1/manager.pid" ] && kill "$(cat "$W/b/hosts-remote-1/manager.pid")"
```

```bash
docker rm -f p2p-hosts-master p2p-hosts-node-1 p2p-hosts-remote-1; docker network rm p2p-hosts p2p-hosts-aux p2p-hosts-remote-1-aux
```

Then delete `$W` (the vaults are inside it).

## For Claude Code

Open Claude Code in the repository's folder and give it this:

> Read `steps/7-splectral/local-machine.md` and set up and run the
> Splectral demo on this machine: check section 1's requirements and
> tell me what is missing, do section 2 and section 3, then section 4's
> phases `swarm`, `config` and `serve`, and give me the URL. Don't run
> the scenario: I will press Run in the browser. Don't commit anything.
> When I say I'm done, stop Splectral and the swarm (section 4), offer the
> replay (section 5), and clean up (section 9).

Notes for Claude Code:
- **Long-running processes** (Splectral, the node managers) detach
  themselves (`setsid`) and leave pid files; stop them by those pid
  files, never with `pkill -f` on a pattern.
- **Docker** must be running before `swarm`; with rootful Docker, `docker
  info` is the check.
- **Nothing to commit**: the work folders are outside the repository. Only
  section 7 writes into the repository (the record), and only when the
  person asks for a recorded run.
- **Never print or copy the vaults** (`$W/a-vault`, `$W/b-vault`): they
  hold the nodes' secret keys.
