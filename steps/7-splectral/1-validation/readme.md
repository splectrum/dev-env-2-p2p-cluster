# Part 1: validation in one place

**Scope.** The rule (`rules.md`, single concern): input is validated once,
where it enters, by the one validator for its kind; internal traffic is
valid. Four modules carried their own copies of the segment check, inside
their APIs.

**Done.**
- **`mycelium-uri`** is the one validator for names: `isName`,
  `validateName` (lowercase words joined by single `-`), and data names:
  `isDataName`, `validateDataName` (lowerCamelCase, no two capitals in a
  row, no `_`), `uriFormOf` and `dataNameOf` (`publicKey` ↔ `public-key`,
  exact both ways).
- **The copies are gone**: `p2p-rns` (its swarm, node and resource names),
  `p2p-mrepo` (repository names and ids), `p2p-node`'s requests (request
  names), the vault in `p2p-node-manager`. Their APIs trust their callers.
- **Validation where input enters:**
  - network: `p2p-rns`'s channel handler (names, and URIs and patterns),
    `p2p-node`'s request handler (request names);
  - command lines: `p2p-node`, `p2p-node-manager` (and the invitation's
    swarm name, an external file), `p2p-swarm-manager`, `p2p-mrepo`.
- **Tests at the boundary**: the handlers refuse what breaks the rules
  (`p2p-rns`, `p2p-node`); the node manager's command line refuses a bad
  name before anything starts; the internal refusal tests are gone.

**Findings** (record: `record/`):
- One copy of the rule left in the code, in `mycelium-uri`.
- The unit tests of the six changed modules pass (counts in the record).
