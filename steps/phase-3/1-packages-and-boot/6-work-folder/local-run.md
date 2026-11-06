# The first release, from scratch (the local agent, 2026-11-06)

`setup-96cfc58bc18f`, the first HAICC release, tested as a visitor gets it:
downloaded from its release, on the local machine (WSL2, Node.js 24.21,
Docker 28.3). The root only: the manager boot, and so a demo, is the next
step. The demos were not published for this (the human: not needed now).
The log of the main run: `record/local-run-haicc.log`.

**Result: the route works on a machine with Node.js, and its release file
contains everything it needs. On a machine without Node.js the first boot
stopped (finding 1). Fixed, in the second release below.**

| Case | Result |
|---|---|
| download from the release | 34,204 bytes, identical to the setup as built |
| `sh haicc-setup.sh ~/haicc-work` | exit 0, no network |
| `haiccing/boot` | exit 0, 0.7 s: all met, nothing to fix |
| `./haicc list` | "none yet", exit 0 |
| outside the work folder | nothing written: `~/.haicc` unchanged |
| setup again | "already set up", exit 0 |
| boot again | exit 0: the copy kept, `./haicc` rewritten |
| `<work>/haicc list` from another folder | exit 0 |
| `./haicc fetch base-package-pkgm` (a throwaway folder) | fetched from GitHub, exit 0 |
| `./haicc boot manager` | "the next step, not built yet", exit 1 |
| no Node.js, no terminal, no `--yes` | nothing changed, says what to do, exit 1 |
| no Node.js, `--yes` | **Node.js installed, then the boot stops, exit 1** (finding 1) |
| the Node.js download breaking | says so, stops cleanly, a later boot goes on (seen by chance) |

## Findings

### 1. On a machine without Node.js, the first boot stopped (fixed)

`haiccing/boot --yes` installed Node.js v22.23.4 into `.haicc/node`, then
reported it missing and stopped with exit 1, before `./haicc` was written.
`step0.sh` puts `.haicc/node/bin` on its `PATH` once, as it starts; on a new
machine the folder is not there yet, so the check after the fix could not
see what the fix had just installed. A second `haiccing/boot` succeeded.

Fixed in `haicc-base-boot/step0.sh`, one line, with a test (fails without
it, 8 of 8 with it). Then a real boot with no Node.js on `PATH`, from this
release's own package with the two fixed files laid over it: exit 0 at the
first boot, `./haicc list` answering.

### 2. A warning from Node.js on every command (fixed)

`./haicc` printed four lines of `MODULE_TYPELESS_PACKAGE_JSON` every time,
as `haicc-base-boot/package.json` had no `"type": "module"`. Added. Harmless,
but the first thing a visitor reads. Absent from that same real boot.

### 3. `haiccing`'s profile promised more than this release does (fixed)

Its last step is `./haicc run base-demo-liveness`. This release answers with
its usage, exit 2. `base-package-haicc`'s readme rightly stops at `./haicc
list`. Trimmed, on the human's word: it ends at `./haicc list`, and says
running the projects is the next step.

## The second release (2026-11-06)

`setup-58fb397be615`, the boot 0.4.1: findings 1 and 2. Only
`base-package-haicc` written; the demos not touched. Tested before
publishing, from the built file: the package's tests 8 of 8; with Node.js
and with none on `PATH` (Node.js v22 really installed), the boot exit 0 at
the first go, `./haicc list` answering, no warning. The file at the release's
`latest` link is byte-identical to the one tested.

While publishing, `pkgm write` said tests `0 / 0`: it read `# tests N`, and
Node.js 24 prints `ℹ tests N`. Only the counts: pass or fail was always the
exit code. Fixed in `pkgm-base-manager`'s source, not yet in its product or
package.

## Output as it happens: the third release (2026-11-06)

The human, running the release on an intermittent connection: a blinking
cursor and no idea what was happening. Now every step says what it is doing
before it does it, as it happens, on stdout and in the log:

- the host's checks each say `checking <name>...`, then the result; a command
  that does not answer gives up after 20 s (a stuck Docker daemon);
- a download (`lib/download.sh`, Node.js's and `./haicc fetch`'s) gives its
  size every 5 s, says when no data is arriving, resumes a lost connection up
  to six tries with longer waits, says not found at once, and fails with
  the reason;
- `./haicc fetch` streams, and tells a failed connection from a repository
  that is not there;
- a kept older copy of the root's HAICC is said, not silent;
- no answer to a question (Ctrl-D) is a no, not Node.js's error;
- the published first command shows a progress bar (`curl --progress-bar`).

Tested with a clock on each line in a real terminal: lines arrive at their
moment. The route with everything installed: exit 0, about 0.5 s. A stuck
Docker: says so at 20 s each, ends with what to do. On this machine's
connection, outages included: a real resume seen (3 MB kept after a lost
connection). Not seen through to the end: the no-Node.js download and the
144 MB fetch, stopped for the connection's slowness; both reported truthfully
as far as they went. Tests 9 of 9.

Published as `setup-b8c4a67a5e83`, boot 0.4.2, at the human's word, ahead of
a full no-Node.js run: the built file booted with everything installed, and
the `latest` link serves that file byte for byte. Still to run: the no-Node.js
download through to the end, on a better connection; the human's manual test.

## The human's manual test of the third release (2026-11-06)

`setup-b8c4a67a5e83`, boot 0.4.2, everything installed, in the human's own
terminal: completed, with the output as it happens. It took two tries, and
the first taught something:

- **First try: not a test of the release.** The block of commands, pasted
  whole, went on after `curl: (56) Recv failure: Connection reset by peer`.
  `~/haicc-work` still held 0.4.1, so the setup said `already set up`, and
  the boot ran the old copy. It looked like a working run of the new release.
- **Second try, clean folder, commands joined with `&&`:** exit 0, 0.4.2 in
  `.haicc`, every line as it happened; `./haicc list`: none yet.

Findings, for the implementation session (`notes/next.md`):

### 4. Where the log is, is never said (open)

The human: "There was output text, but nothing in file", though the log was
there: `~/haicc-work/.haicc/log/haicc.log`, 1,298 bytes, the whole run. The
folder is hidden and no output names it. A log nobody can find is not doing
its job. The human's decision: no hidden folders, full stop (`notes/next.md`).

### 5. The log does not start from the start (open)

The request says "logged from the start, in files". It starts at
`haiccing/boot`. `sh haicc-setup.sh` is not logged, so the line saying which
setup was used is not in the file. The download itself cannot be: no HAICC
exists yet.

### 6. `already set up` hides a version mismatch (open)

A new setup over an older work folder says `already set up` and nothing else;
the boot then prints the new version, says the older copy is kept, and runs it.
The setup should name both versions and say to use a new folder.

### 7. The published commands do not stop on a failed download (open)

`haiccing`'s profile and `base-package-haicc`'s readme list the commands line
by line, so pasted whole they go on after a failed download, with an old
`haicc-setup.sh` where there is one. Join them with `&&`, and give the curl
retries (`--retry 5 --retry-all-errors --connect-timeout 20`).

## The fourth release (2026-11-06)

`setup-47f2b29b0194`, the boot 0.5.0: findings 4 to 7 and no hidden folders,
built in the session. Its first build, tested before publishing, did not boot:
on a new folder `install/` did not exist, so the copy failed, and the boot said
`copied` and went on to Node.js's error. The move from `.haicc` had lost the
folder's creation, and no test ran stage 1. Fixed here (`0a014eb`): the folder
made first, a failed copy stops the boot, a test of stage 1 (fails without
the fix). `package-lock.json` lost the retired `pkgm-base-boot`'s entry, which
`npm install` removed each time and `publish.sh` then refused.

Tested from the built file, then that file released: the packages' tests 232
of 232; a new folder boots, exit 0; nothing hidden (`haicc`, `haiccing/`,
`install/`, `log/`); `log/haicc.log` from the setup's first line; the same
setup again: `already set up with this setup`, exit 0; over a 0.4.2 folder:
both named, a new folder said, exit 1. The `latest` link serves that file
byte for byte. Not seen by the agent: a failed download stopping the one
command, the no-Node.js boot. The human's to run (`notes/handover-packages.md`).

## The human's manual test of the fourth release (2026-11-06)

`setup-47f2b29b0194` from its release, the one command, a clean folder:
"that works a lot better". Feedback, back to the implementation session
(`notes/next.md`): the folders' names, the log's timestamps, its files' names.

## Left open

- `5-validation/manual-run.sh` retired: this route replaces it.
- The no-Node.js boot through to the end, on a good connection: not yet seen.
  The local machine's connection is intermittent: a failed download there is
  the connection first.
- `~/haicc-work` is left on the machine, as the first release set it up: a
  setup does not update a work folder.

## The fifth release (2026-11-06)

`setup-25a1bd107a92`, boot 0.6.0, published with the human's OK: only
`base-package-haicc` (`5b36fe6`) and the release. Tested before publishing from
the built file: setup, `./boot`, a swarm, two nodes, shutdown and boot at each
level, teardown, `./shutdown`, `./boot` again. After publishing, from the latest
link with the default sources, through a node's boot and self-test: exit 0, no
hidden files, one log file named by its start. What was left out: `notes/next.md`.

The human's manual test, the published commands in a new folder: "the test
worked well, looks really good". The products and `haiccing`'s profile
followed; the other `haiccing` repositories stay at their last commits.
