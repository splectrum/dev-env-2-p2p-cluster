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

**Findings**: below, once recorded.
