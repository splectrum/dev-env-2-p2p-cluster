# Part: signals under Bare

**Question.** Step 0 found that a SIGTERM handler registered through
`process.on` did not fire under Bare. A node needs a graceful stop.

**Expectation**, after reading `bare-process`: it forwards signals from
`bare-signals` to `process`, so the handler should fire. On this host,
`bare` on the PATH is npm's wrapper (`bare/bin/bare`), a Node script that
spawns the runtime's binary with `suppressSignals: true`.

**Method** (`run.sh <runner>`, `signal.mjs`): a process waiting for
SIGTERM through `process.on`, sent one after 2 s. Runners: Node; the Bare
runtime's binary; npm's `bare` wrapper; the binary in `bare-base`, stopped
with `docker stop`.

**Record**: `record/`.

**Findings** (record of 2026-10-31, dev `45636c8`; 4 cases):

| Runner | SIGTERM handled |
|---|---|
| Node | yes, in 2 s, exited |
| the Bare runtime's binary | yes, exited |
| npm's `bare` wrapper | **no**: still alive after the signal |
| the binary in `bare-base`, `docker stop` | yes, exited |

- **Bare handles SIGTERM through `process.on`.** Step 0's finding was the
  wrapper's: npm's `bare` command spawns the binary with
  `suppressSignals: true`, so a signal sent to it never reaches Bare.
- So long-running Bare processes on a host are started with the runtime's
  binary (`$(npm root -g)/bare/node_modules/bare-runtime-linux-x64/bin/bare`),
  as containers already do; the wrapper is for interactive use only.
  Step 0's record is kept as it was; its readme carries the correction.
