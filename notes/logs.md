# Data in logs: design

Status: **proposed, 2026-11-01**, from the discussion on Splectral's
feeds. Not started. To be discussed further: Kafka streaming
(`vision.md`, Kafka on Hypercore). The module, `mycelium-log`, is a
proposed name; its repository is to be created in `pear-full-square`.

## The rule

All configuration, audit and metrics data is **appended to logs**, from
the ground up. Current state is never written directly: it is **built
from the logs**, as the latest record per key. This is Kafka-compatible by
construction.

## Where data lives, and how it is read

- **Data lives in objects, addressed by URI**:
  - files in folders on a host;
  - paths in a repository's layer;
  - entries on a drive, a core later.
- **Every read returns an array of records**, as xpath does: a URI
  resolves to zero or more records, never to a bare value. Everything
  downstream (parsing, model, display) handles arrays only.
- **An object holds one or more records.** A JSON object gives an array
  of one; a JSON array gives its elements.
- **A log is a directory**: targeting it reads its records in order,
  across its epochs (below).
- **Formats by extension**: `.json` now; `.avro` later, AVRO objects and
  object container files. A parser per format, its output always an
  array of records in the same JavaScript form.
- **JSON values in the form avsc gives AVRO records**: plain objects,
  strings, numbers (times in milliseconds), booleans, null, arrays. Keys
  and hashes are hex strings now and become `bytes` (or a logical type)
  when declared. Nothing downstream changes when a log moves from `.json`
  to `.avro`.
- **No schemas for now.** JSON is read and displayed by its shape;
  specific handling matches on what a source says it holds. With AVRO,
  handlers respond to the schema, by its name or fingerprint.

## The record

Kafka's shape:

| Field | What |
|---|---|
| `key` | what it is about: a node's URI, a setting's name, a resource |
| `value` | the JSON record; null deletes the key (a tombstone) |
| `time` | when it was appended, in milliseconds |
| `headers` | facts about the record: origin (module), kind, correlation (what it answers or what caused it) |
| `offset` | its position in the log: assigned by the log, never written by hand |

Never a secret, in any field.

## The log

| Kafka | Here |
|---|---|
| topic | a kind of data across sources: node audit, manager events, metrics, configuration |
| partition | one log, one writer: a node's, a manager's (a core later) |
| offset | one monotonic number per log, continuing across epochs and restarts |
| log segment | an **epoch**, named by its first offset (`log/00000000000000004200/`) |
| retention | old epochs archived, and kept or removed by policy |
| log compaction | only the latest record per key kept: state |
| consumer offsets | each reader keeps the offset it has read up to, itself in a log |

**Epochs.**
- An epoch is **open** while it is written: a directory, one object per
  record (or a small batch), immutable once written.
- It **switches on a regular policy**: every N records, or every period of
  time, not at a restart. A restart is a record like any other, and the log
  runs on across it: on start, the writer finds the open epoch and its
  last offset.
- It is **closed by archiving**: the directory is replaced by a single
  object holding its records in order, under the same name. Now a JSON
  array (`log/00000000000000004200.json`); with AVRO, an object container
  file (one schema in its header, the records in compressed blocks).
- **Reading does not change**: a reader never needs to know which epochs
  are archived.
- **Offsets survive archiving**: an epoch keeps every record and its
  order, so "read from offset N" finds the epoch by name and the record
  by its place in it.
- **Sealed in a chain**: a closed epoch's object gets a hash, carried by
  the next epoch's first record, so an archived epoch can be verified as
  a whole. On a core or in git this sits on top of the storage's own
  integrity.
- **Live and history by one rule**: live data in small immutable records;
  history in compact objects. A replica fetches closed epochs whole and the
  open one record by record.
- **Who archives**: the writer at the switch, first; later an operator of
  its own (`vision.md`, operators).

**Operations:**
- append a record;
- read from an offset;
- follow: told when a record is appended;
- close and archive an epoch;
- compact: the latest per key;
- fold into state, at the latest offset or any past one.

## Three kinds of data, one mechanism

| Kind | Policy |
|---|---|
| **configuration** | compacted by key: the current configuration is the latest value per key; every change is a record, so history, audit and rollback (an earlier value appended again) come for free |
| **audit** | never compacted, kept, sealed epoch by epoch |
| **metrics** | time-windowed: epochs close on time, and archiving may summarise (detail recent, summaries old) |

## State is a view

- `state.json`, `swarm.json` and `node.json` become views: folded from
  their logs, rebuilt on start, cached at most, never the source of truth.
- Splectral's model is the same fold, in its server and in the browser.
- A view can be built at any past offset: replay, and "what did the swarm
  look like then", are the same operation.

## The module: `mycelium-log`

Single concern: append-only logs of records, as above, on any storage.
- **Storage-agnostic**: host folders, repository layers, drives and
  cores, over a small contract (list, read and write objects by path; be
  told of changes). It knows nothing of p2p or of what its records carry.
- **The Kafka layer of mycelium's base** (`vision.md`), JSON first, AVRO
  containers for archived epochs later.
- **Used by all**: the node managers and the swarm manager, the observer
  (through its manager), Splectral, later repositories' own records.

## What it changes

- The managers' `manager.jsonl` and `node.jsonl` become logs, written
  through `mycelium-log`; their `state.json` and the swarm manager's
  `swarm.json` become views.
- The observer's events reach its manager's log for the node.
- Splectral's sources read logs from an offset and follow them; its
  model folds them.
- Records already committed (steps 0 to 6) stay as they are: they are
  the record of those steps.

## Open

1. **Kafka streaming**, to discuss: topics across logs, consumers and
   consumer groups, stream processing (folds, joins, windows) as
   operators, and how close to Kafka's own protocols and tools to stay.
2. **Epoch policy**: sizes and periods per kind of data.
3. **Offsets on a core**: an offset equal to a block index (`vision.md`),
   with epochs as ranges of blocks, or epochs as objects on a drive.
4. **Batching in an open epoch**: one record per object first; small
   batches when volume asks for it.
