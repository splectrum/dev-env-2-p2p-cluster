# Part 6: Splectral's core

**Scope.** `notes/splectral.md`: the platform's core, knowing no page and
no p2p.

**Done** (folders on `main`; repositories in `pear-full-square`):
- **`splectral-contract`**: the contract, version `0.1.0`: the abstract
  world (entities host, node, resource, link; events nodeStarting,
  joined, gone, resource, connected, disconnected, requestSent,
  requestAnswered, changed, actionResult, say; action ids), manifests
  (`splectral.json`: source, mapper, page, scenario, action) checked once
  where the server finds them.
- **`splectral-model`**: events folded into hosts, nodes (status,
  controlled), resources (changes), links (open, bytes) and activity;
  snapshot, restore, subscribe. The same file runs in the server and in
  the browser.
- **`splectral-transport`**: Server-Sent Events down (a snapshot, then
  events), actions up (`POST /act`); a browser side feeding a local
  model.
- **`splectral-server`**: extensions; the platform's `file` source (a
  topic followed from 0); mappers chosen by what a source holds, records
  holding `splectral/world` passed as they are; actions dispatched and
  recorded in a topic of its own (`<runs>/actions`); the menu from what
  is available (`world`, one entry per node for `node`, per scenario for
  `scenario`); the files a browser may load and no others; a start that
  fails leaves nothing running.
- **`splectral-shell`**: the browser's shell: header, menu, routing by
  hash, pages loaded as modules and given the state, the parameter,
  `act` and `html`; React 18 and htm from npm, no build step; light and
  dark; a single column at phone width.

**Findings:**
- Unit tests: contract 2, model 1, transport 1, server 1 (record:
  `../10-validation/record/`).
- Two bugs met: the server's `close` waited on `fetch`'s keep-alive
  connections (now closed); React's and htm's package exports hide their
  UMD files from `require.resolve` (the package folders are found on the
  resolution paths instead).
- Found by the browser test: the shell subscribed to its model after the
  snapshot had arrived and showed an empty world until the next event
  (now it reads the model again after subscribing).
