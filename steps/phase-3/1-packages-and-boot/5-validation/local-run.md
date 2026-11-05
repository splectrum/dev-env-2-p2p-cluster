# From scratch, against GitHub (the local agent, 2026-11-05)

The two tasks of `notes/handover-packages.md`, on the local machine: Linux
x86-64 in WSL2, Node.js 24.21, Docker 28.3. Dev at `9c480c8`.

**Result: published; both demos ran from GitHub's archives on a clean home;
one real finding.** `base-demo-liveness`'s scenario failed 1 run in 6: its
`stop-node` races the swarm manager's auto mode (finding 1). Everything
else passed.

## 1. Publishing

`publish.sh ~/haiccing-publish --no-push` took 2 min 28 s with all tests
passing. The six packages `unchanged`, as the handover expected; only the
two demos committed. Each commit reviewed (8 files, `LICENSE` kept, no
secrets), then pushed by hand (finding 2), fast-forward, no force:

| Repository | Before | After |
|---|---|---|
| `haiccing/base-demo-liveness` | `f85b958` | `9e7bb75` |
| `haiccing/base-demo-other-host` | `a34735f` | `feed429` |

GitHub shows those heads. Not yet on Codeberg: see "Left open".

## 2. From scratch

GitHub's archives of the eight repositories into `~/haiccing-scratch` (147
MB), a clean `HOME` (the machine's own `~/.haicc` untouched). The browser
was headless Chromium driven by step 9's `ui.cjs` (`--no-open`), so opening
a real browser was not exercised.

| Case | Result |
|---|---|
| `sh base-demo-liveness/run.sh` | ok, 16 s to the page: step 0 only checked, nothing to fix; HAICC kicked; deployed; started |
| liveness, Run and Run again, 3 pairs | **5 of 6 ok** (42, 44, 46, 40, 42 s); the first run of all failed at step 7 after 186 s, finding 1 |
| `haicc test base-demo-liveness` | passed |
| `haicc teardown base-demo-liveness` | nothing of it left |
| `sh base-demo-other-host/run.sh` | ok |
| other-host, Run and Run again | 2 of 2 ok (51, 23 s) |
| `haicc test base-demo-other-host` | passed |
| `haicc teardown base-demo-other-host` | nothing of it left |

No page errors in any run. After both teardowns no `p2p-hosts-*` container
and no p2p network of these demos remained; the port was free again.

## Findings

### 1. `stop-node` races auto mode (the liveness scenario fails now and then)

Run 1 ended "not seen within 60000 ms: left:/hosts/node-1", and the page
showed node-1 green. The stop itself was right; the records of that run:

```
02:31:46.504 node-1 manager  stopping
02:31:46.565 master          node-left /hosts/node-1
02:31:47.339 node-1 manager  container-exited (0)
02:31:47.340 node-1 manager  stopped
02:31:47.445 node-1 manager  starting            <- auto mode, 105 ms later
02:31:51.914 node-1 manager  node-ready
```

In a passing run the same `starting` came 1.3 s after `stopped`.

- The action `stop-node` (`splectral-p2p-actions/stop.js`) waits for
  `manager.pid` to go, looking every 250 ms. The next manager writes that
  file again. In the failed run the action took 60,122 ms and returned
  `status: running` with `ok: true`; in a passing run 1,033 ms, `exited`.
  That it never saw the gap is inferred from those timings: the file itself
  was not watched.
- The scenario then waits for `left`, but it subscribes only after the
  action returned, and `holds()` looks at the presence now. The `left`
  event had passed and node-1 was back, so it could not be seen: the step
  took the 60 s of the action and the 60 s of the wait, 120.1 s in the
  record.

The watcher ticks every 3 s (`deployment.js`), so a window under 250 ms
hits about 1 stop in 12: an estimate, consistent with 1 in 6 here, which
is too few runs to measure it. It also fits the session's 2 of 2 passing,
which is why it did not show there. Step 10's auto mode made it possible:
`steps/9-click-and-run/demos-local-run.md` already notes the swarm brings
node-1 back. Run again recovers (the project is brought back first).

Two separate things to fix, not done here: a stop has to know which
manager it stopped (the pid it signalled, not the file's presence), and a
scenario's `await` on an action's effect has to be subscribed before the
action runs. Whether a stop by hand should hold auto mode off is a design
question for the human. A stop that timed out should not report `ok`.

### 2. `publish.sh --no-push` cannot be followed by `publish.sh`

`--no-push` commits. The run after it finds nothing to add, says
`unchanged` and goes on without pushing, so "`--no-push` looks first" leaves
the commits local. Read from the script, not run: here they were pushed by
hand. Pushing what is ahead of `origin` in that branch of the loop would
fix it.

### 3. The browser check needs Playwright, not listed

`ui.cjs` takes `playwright` from `npm root -g`, not installed on this
machine; a copy in a temporary folder served, with the browsers already
cached. Worth a line in the validation's readme.

## Left open

- Findings 1 to 3 are for the next session (`notes/next.md`).
- Codeberg: the demo repositories there are as they were until the next
  `~/codeberg-sync.sh` run.
- `~/haiccing-publish`, `~/haiccing-scratch` and the clean home
  `~/haiccing-scratch-home` are left on the machine.
