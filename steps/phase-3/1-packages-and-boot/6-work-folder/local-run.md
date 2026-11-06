# The first release, from scratch (the local agent, 2026-11-06)

`setup-96cfc58bc18f`, the first HAICC release, tested as a visitor gets it:
downloaded from its release, on the local machine (WSL2, Node.js 24.21,
Docker 28.3). The root only: the manager boot, and so a demo, is the next
step. The demos were not published for this (the human: not needed now).
The log of the main run: `record/local-run-haicc.log`.

**Result: the route works on a machine with Node.js, and its release file
contains everything it needs. On a machine without Node.js the first boot
stops (finding 1), fixed in the source, not yet released.**

| Case | Result |
|---|---|
| download from the release | 34,204 bytes, identical to `releases/haicc-setup.sh` |
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

### 1. On a machine without Node.js, the first boot stops (fixed, not released)

`haiccing/boot --yes` installed Node.js v22.23.4 into `.haicc/node`, then
reported it missing and stopped with exit 1, before `./haicc` was written.
`step0.sh` puts `.haicc/node/bin` on its `PATH` once, as it starts; on a new
machine the folder is not there yet, so the check after the fix could not
see what the fix had just installed. A second `haiccing/boot` succeeds: the
workaround while this release is the latest.

Fixed in `haicc-base-boot/step0.sh`, one line, with a test (fails without
it, 8 of 8 with it). Then a real boot with no Node.js on `PATH`, from this
release's own package with the two fixed files laid over it: exit 0 at the
first boot, `./haicc list` answering.

### 2. A warning from Node.js on every command (fixed, not released)

`./haicc` printed four lines of `MODULE_TYPELESS_PACKAGE_JSON` every time,
as `haicc-base-boot/package.json` had no `"type": "module"`. Added. Harmless,
but the first thing a visitor reads. Absent from that same real boot.

### 3. `haiccing`'s profile promises more than this release does (open)

Its last step is `./haicc run base-demo-liveness`. This release answers with
its usage, exit 2. `base-package-haicc`'s readme rightly stops at `./haicc
list`. The human's call: the wording was agreed with them.

## Left open

- Findings 1 and 2 reach people only with a new release: the products and
  packages merged, the setup rebuilt, `VERSION` raised.
- `5-validation/manual-run.sh` retired: this route replaces it.
- `~/haicc-work` is left on the machine, as the run left it.
