# Data in logs: design

Status: **proposed, 2026-11-01**, from the discussion on Splectral's
data. Not started. The module, `mycelium-log`, is a proposed name; its
repository is to be created in `pear-full-square`.

## The rule

- **The elementary data container is a record compatible with Kafka's.**
  Compatible with the record only, nothing else of the Kafka ecosystem
  (no topics, partitions, brokers, consumer groups or protocols), and
  only with the properties needed now.
- **All configuration, audit and metrics data is appended to logs of
  such records**, from the ground up. Current state is never written
  directly: it is built from the logs.

## The record

**Now: a partial Kafka record, the data in `value`, all JSON.**

```json
{ "value": { "module": "p2p-node-manager", "kind": "node-ready", "time": 1761980000000, "uri": "/hosts/node-1" } }
```

- **`value` holds the data.** The data's schema is the schema of
  `value`: when schemas come (AVRO), they are schemas of values.
- **No `key` yet.** Records are taken in natural order: their order in
  the log.
- **Other properties come when they are needed**, under Kafka's names
  and meaning, so a record stays Kafka-compatible as it grows: `key`,
  `timestamp`, `headers`; `offset` is a position in a log, assigned by
  the log, not part of what is written.
- **Never a secret**, in any property.

## Where data lives, and how it is read

- **Data lives in objects, addressed by URI**:
  - files in folders on a host;
  - paths in a repository's layer;
  - entries on a drive, a core later.
- **Every read returns an array of records**, as xpath does: a URI
  resolves to zero or more records, never to a bare value. Everything
  downstream (parsing, model, display) handles arrays only.
- **An object holds one or more records.** A JSON object is one record;
  a JSON array, its elements.
- **A log is a directory**: targeting it reads its records in natural
  order, across its epochs (below).
- **Formats by extension**: `.json` now; `.avro` later (AVRO objects and
  object container files). A parser per format, its output always an
  array of records in the same JavaScript form.
- **Values in the form avsc gives AVRO data**: plain objects, strings,
  numbers (times in milliseconds), booleans, null, arrays. Keys and hashes
  are hex strings now and become `bytes` (or a logical type) when
  declared. Nothing downstream changes when a log moves from `.json` to
  `.avro`.
- **No schemas for now.** Values are read and displayed by their shape;
  specific handling matches on what a source says it holds. With AVRO,
  handlers respond to the value's schema, by its name or fingerprint.

## The log

- **Natural order.** A record's position is its place in the log: one
  number per log, continuing across epochs and restarts.
- **Epochs.**
  - An epoch is **open** while it is written: a directory, one object per
    record (or a small batch), each immutable once written.
  - It **switches on a regular policy**: every N records, or every period
    of time, not at a restart. A restart is a record like any other, and
    the log runs on across it: on start, the writer finds the open epoch
    and its last position.
  - It is **named by its first position**
    (`log/00000000000000004200/`), so reading from a position finds its
    epoch by name.
  - It is **closed by archiving**: the directory is replaced by a single
    object holding its records in order, under the same name. Now a JSON
    array (`log/00000000000000004200.json`); with AVRO, an object
    container file (one schema in its header, the records in compressed
    blocks).
- **Reading does not change** with archiving: a reader never needs to
  know which epochs are archived, and positions stay as they were.
- **Sealed in a chain**: a closed epoch's object gets a hash, carried by
  the next epoch's first record, so an archived epoch can be verified as
  a whole. On a core or in git this sits on top of the storage's own
  integrity.
- **Live and history by one rule**: live data in small immutable records;
  history in compact objects. A replica fetches closed epochs whole and the
  open one record by record.
- **One writer per log.** Who archives: the writer at the switch, first;
  later an operator of its own (`vision.md`, operators).

**Operations:**
- append a record;
- read from a position;
- follow: told when a record is appended;
- close and archive an epoch;
- fold into state, at the latest position or any past one.

## Three kinds of data, one mechanism

| Kind | Policy |
|---|---|
| **configuration** | the fold of its records in natural order is the current configuration; every change is a record, so history, audit and rollback (an earlier value appended again) come for free |
| **audit** | kept, sealed epoch by epoch |
| **metrics** | epochs close on time; archiving may summarise (detail recent, summaries old) |

With `key`, later: keeping only the latest record per key (compaction)
for configuration and state.

## State is a view

- `state.json`, `swarm.json` and `node.json` become views: folded from
  their logs in natural order, rebuilt on start, cached at most, never the
  source of truth.
- Splectral's model is the same fold, in its server and in the browser.
- A view can be built at any past position: replay, and "what did the
  swarm look like then", are the same operation.

## The module: `mycelium-log`

Single concern: append-only logs of records, as above, on any storage.
- **Storage-agnostic**: host folders, repository layers, drives and
  cores, over a small contract (list, read and write objects by path; be
  told of changes). It knows nothing of p2p or of what its records carry.
- **Mycelium's base** (`vision.md`): records compatible with Kafka's, JSON
  first, AVRO containers for archived epochs later.
- **Used by all**: the node managers and the swarm manager, the observer
  (through its manager), Splectral, later repositories' own records.

## What it changes

- The managers' `manager.jsonl` and `node.jsonl` become logs, written
  through `mycelium-log`; their `state.json` and the swarm manager's
  `swarm.json` become views.
- The observer's events reach its manager's log for the node.
- Splectral's sources read logs from a position and follow them; its
  model folds them.
- Records already committed (steps 0 to 6) stay as they are: they are
  the record of those steps.

## Open

1. **Epoch policy**: sizes and periods per kind of data.
2. **Positions on a core**: a position equal to a block index
   (`vision.md`), with epochs as ranges of blocks, or epochs as objects
   on a drive.
3. **Batching in an open epoch**: one record per object first; small
   batches when volume asks for it.
4. **Which record properties come next, and when**: `key` (with
   compaction), `timestamp`, `headers` (origin, correlation of actions and
   results).
