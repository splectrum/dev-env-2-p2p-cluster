# Part 7: replay, scenario runner, timeline

**Done** (folders on `main`; repositories in `pear-full-square`):
- **`splectral-replay`**: a source kind: the topics of other sources
  (`topicsOf`), consumed from 0, merged in time order, played back at a
  chosen speed (gaps capped) through the same mappers as live; it ends
  with a message.
- **`splectral-scenario`**: the `run-scenario` action: steps `say`, `do`
  (any action), `await` (`<event>` or `<event>:<uri>`, already true or
  seen within a timeout). The run's messages and steps are produced into a
  topic holding `splectral/world` (`<runs>/scenario-<id>`), so a replay
  shows them where they were. A page per scenario: its steps, done or
  not, its messages, a Run button; its outcome read from the world.
- **`splectral-timeline`**: every event, newest first, filtered by kind.

**Findings:** the scenario test (a scenario run live, recorded, replayed
into a fresh server: the same nodes, the messages in order) passes
first time; found by the browser test: the scenario page kept its outcome
in its own state, lost when the page was left (now read from the world).
