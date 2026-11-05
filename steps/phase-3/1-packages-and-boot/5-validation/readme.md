# Part 5: validation and products

**Scope.** Everything as a person runs it, from the packages as written:
plain folder copies of the `haiccing` repositories side by side, a clean
home folder each (`HAICC_HOME` under the scratch folder). `run.sh
<scratch>` runs the cases, each recorded in `record/<case>.txt`,
`record/cases.txt` their exit codes; `publish.sh` writes and pushes the
`haiccing` repositories (for the local agent, `notes/handover-packages.md`);
`manual-run.sh [liveness|other-host]` runs a demo by hand, from GitHub's
archives and a clean home in a temporary folder, removed afterwards. The
`ui-*` cases need `playwright` where `npm root -g` finds it, with its
Chromium.

**Findings** (2026-11-04; 15 cases, all as expected):

| Case | Result |
|---|---|
| `import` | the third-party package: 192 modules, Linux x64, Bare 1.36.0 |
| `write` | 8 repositories written after 35 test runs passed (each module's tests and each package's own), 52 s |
| `step0-bare-debian` | a bare Debian container: Node.js, git, Docker each `no` with its fix; exit 1 (HAICC cannot boot) |
| `step0-fix-node` | a host lacking Node.js and Docker: `fix --yes` installed Node.js v22.23.4 (the official release, checksum checked) into the home, no sudo; Docker's `apt` stubbed in this validation; then exit 1: Docker still missing, and needed to boot (nodes run in Docker containers; first run, before that change: exit 3) |
| `kick-pkgm-alone` | only `base-package-haicc` and `-pkgm` beside each other: step 0, the package manager installed; again: `current` |
| `kick-haicc-missing` | the same two only, kicking HAICC: the package manager installed, then `base-package-mycelium` said missing with a clone and an archive command; exit 1 |
| `kick-haicc-alone` | HAICC with what it requires: installed; again: all `current` |
| `run-liveness` | a clean home, every repository beside the demo: `sh base-demo-liveness/run.sh`: HAICC kicked, the demo's packages installed, the image built from the install folder, deployed and started: 26 s |
| `ui-liveness` | the scenario in a headless browser, the map beside it: ok in 77 s, run again ok in 35 s ("run 2"); no page error |
| `test-liveness` | `haicc test`: the demo package's tests, its state as declared, its page answering 200: passed |
| `teardown-liveness` | nothing running, no container or network left; the demo's package removed, the shared ones kept |
| `run-other-host` | HAICC already installed (no kick): 17 s |
| `ui-other-host` | ok in 55 s, again ok in 23 s; no page error |
| `test-other-host` | passed |
| `teardown-other-host` | nothing left running |

- **No development repository and no `npm install`** in any of the runs:
  code from the install folder only, Bare's runtime from the third-party
  package.
- The first record of `ui-other-host` came out empty though the case
  passed (its screenshots there); the four other-host cases were run again
  and recorded.
- **Done afterwards**: the from-scratch run against GitHub's archives, by
  the local agent: `local-run.md`.

**Products**: `products.md`.
