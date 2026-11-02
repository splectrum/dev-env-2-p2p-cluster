# Part 5: Splectral in a project

**Done.**
- **Through topics**: clients produce actions into topics of their own
  (`<runs>/clients/<client>/actions`, a correlation id in a header); the
  server follows them from committed offsets and records results in
  `<runs>/actions`. The browser's HTTP is an adapter onto the client
  `browser`; `cli.js act` is a command-line client (an action asked while
  the server is down is answered when it starts). Unknown actions are
  recorded as refused.
- **Its providers**: `splectral-config` (repository state) and
  `splectral-server` (running on top; restarted when its configuration
  changed).
- **Its project**: a scenario run reconciles the project first
  (`reconcile-project`, an action `haicc-deployment` provides).
- **Tabs**: pages opened as tabs, one shown beside the active one.
- **Run again**: the scenario page shows the latest run; a failed run is
  closed with a message.

**Findings** (from running the liveness project's scenario twice): the
page counted runs by their step -1 messages, and the project's reconcile
added one; it kept the first run's steps; a failed run never closed; the
master kept the first run's request names (taken once per repository):
`send-request` now names each request uniquely.
