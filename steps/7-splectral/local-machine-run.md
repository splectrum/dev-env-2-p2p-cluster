# Running Splectral on a local machine: the first run, 2026-11-02

The human's first run of `local-machine.md` on their own machine, with
Claude Code running locally doing the work (the prompt in "For Claude
Code"). The aim: see whether the instructions work as written, and what
would make running the app easier. Not a recorded run: nothing was written
into the repository, and the work folders were deleted afterwards.

## The machine

| | Asked | Here |
|---|---|---|
| OS | Linux x86-64 | Windows with WSL2: Ubuntu 24.04.2, kernel 5.15.167.4-microsoft-standard-WSL2 |
| Docker | Engine, native, rootful | Docker Engine 28.3.0 inside the WSL distribution (not Docker Desktop) |
| Node.js | 22 | 24.21.0, npm 11.19.0 |
| Bare | 1.36.2 from npm (runtime 1.36.0) | 1.24.2 at first, upgraded to 1.36.2 |
| Subnets, ports | 172.34–36 free, 4400/4401 free | free |
| UDP from containers to the bridge addresses | allowed | worked, nothing to open |
| Browser | any | on Windows, reaching WSL's `127.0.0.1:4400` through WSL's localhost forwarding |

Dev tree: `main` at `021a71c` (the handover after step 7), before step 8.

## What was done, section by section

1. **The machine.** Checked by hand: `uname`, `node`, `bare`, `docker
   info`, `docker network ls`, `ip route`, `ss`. Two gaps: Bare too old,
   Node 24 instead of 22.
2. **Once, while online.** `npm i -g bare@1.36.2`; `npm install` at the
   root and in the three mycelium modules; `docker pull
   debian:bookworm-slim`. The image was not built ahead; `swarm` built
   it. No problems.
3. **Check.** Every test passes, but `unit-tests.sh` printed `"pass":null,
   "fail":null` for all fourteen modules. Node 24's test runner reports
   in the spec format (`ℹ pass 15`), and the script reads the TAP format
   (`# pass 15`) that Node 22 prints when not on a terminal. Counted from
   Node 24's lines instead: mycelium-uri 15, mycelium-topic 8, p2p-rns 3,
   p2p-mrepo 24, p2p-node 2, p2p-node-manager 2, p2p-swarm-manager 1,
   splectral-contract 2, splectral-model 1, splectral-transport 1,
   splectral-server 1, splectral-scenario 1, splectral-p2p-observer 1,
   splectral-p2p-watchers 1; fail 0 everywhere.
4. **The demo.**
   - `swarm`: about 17 s, the image build included. It printed
     `{"error":"Unexpected end of JSON input"}`, but master and node-1
     were running and ready (node-1 materialised 3790 files, 15.8 MB, from
     the master), and `status` showed both. The cause is below.
   - `config`, `serve`: as written; Splectral listening on 4400.
   - The human pressed **Run** and watched the scenario in the browser.
     Afterwards remote-1 had been started and stopped by host B's
     manager, and the scenario's run was in `$W/runs`.
   - `unserve`, `stop`: master, node-1 and remote-1 all `exited`, exit
     code 0; no containers left.
5. **The replay.** `replay` served on 4401; the human watched it;
   `unreplay` stopped it.
6. **Tablet or phone**: not tried.
7. **The recorded run**: not tried (Playwright not installed).
8. **Own configuration**: not tried.
9. **Clean-up.** Nothing was left over; `$W` and `$R` deleted. Left on
   the machine by design: the image `p2p-node:021a71c`, Bare 1.36.2
   globally, the `node_modules` folders.

Outcome: the demo works as described, live and replayed, on WSL2 with
Node 24.

## Findings

1. **The `join` parse error: a race on `state.json`, fixed in step 8.**
   The node manager rewrote `state.json` in place (`writeFileSync`
   truncates, then writes), and the swarm manager polled it every 500 ms
   and parsed it. A read between the two finds an empty file. Step 8
   (`7d63653`) has the swarm manager read the fold of the manager's topic
   instead, which removes it from the managers. One instance of the
   pattern is left: `steps/6-other-host/validation/other-host.sh` (lines
   34 to 35) polls host B's `state.json` with `JSON.parse`. Either read the
   topic there too, or have `saveState` write a temporary file and rename
   it, so no reader ever sees a half-written cache.
2. **The unit test summary on Node 24.** `unit-tests.sh` gives nulls, as
   above. Make the format explicit (`node --test --test-reporter=tap` in
   the modules' `npm test`), or have the script read both formats.
3. **Bare's version matters, and nothing checks it.** The image build
   copies Bare's binary from the global install, so an old global Bare
   goes into the image. Here it was 1.24.2 and was caught by hand.
4. **WSL2 works.** Docker Engine inside WSL is native and rootful for this
   purpose; the managers bind the bridge gateways, the containers reach
   them over UDP, and a Windows browser reaches Splectral. Worth adding to
   section 1 as tested, with Docker Desktop still excluded.
5. **Node 24 works**, with finding 2 as the only difference.

## Towards one place for instructions and an easy launch

What the run showed, as input for that discussion:

- **The instructions are per step and spread out.** Step 6 and step 7 each
  have a `local-machine.md`; step 7's refers to step 6's for the machine;
  step 8 has its own `demo.sh` and no instructions yet. Running "the app"
  means knowing which step is the latest.
- **Launching is many commands.** Install, then `demo.sh` with two
  folders and a phase, three times, in the right order; `<record>` must be
  given even for phases that don't record. The same for stopping, and the
  scenario runs once per swarm, so running it again means stop and start
  over.
- **The requirements are checked by hand.** One preflight command could
  check them all and say what is missing: Linux and native Docker, Node,
  Bare's runtime version, the subnets, the ports, UDP to the bridges.
- **Clean-up is by hand when something fails**: pid files, then
  containers and networks by name.
- **The demo runs from this development repository only.** Its pieces
  are product repositories (the platform and actions in
  `pear-full-square`, the scenario and map in `splectral`), but nothing
  brings them together outside this repository's workspace.

A shape that would cover these: one entry point with commands such as
`check`, `install`, `up` (swarm, config, serve), `down` (unserve, stop),
`replay`, `reset` and `clean`, defaulting the work folder, choosing the
latest step's demo with its applications, and one document describing it,
with the step folders keeping only their records.
