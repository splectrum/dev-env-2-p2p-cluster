# Part 2: mycelium-topic

**Scope.** `notes/topics.md`: topics of Kafka records, single partition,
on host folders, first version.

**Done.** `mycelium-topic` (folder on `main`; repository
`pear-full-square/mycelium-topic`):
- produce (offsets assigned in order), consume from an offset, follow
  (polling the storage), fold (at the latest offset or a past one);
- segments named by base offset; the active one a directory, one object
  per record; rolled by records or age, never at a restart; a reopened
  producer continues at its end offset;
- archiving into one JSON array per segment and sealing in a chain
  (`previousSegment` header, `<base>:<sha256>`), verified; tampering
  detected;
- an archive left beside its directory (a crash between the two writes):
  the archive wins, the directory is removed;
- retention by number of archived segments; committed offsets in a
  topic of their own;
- a storage contract and its folder implementation; JSON parsing by
  extension, every read an array.

**Findings** (record: `record/`):
- 8 unit tests pass.
- One bug met while testing: the `roll` option was shadowed by a function
  of the same name, so every topic used the default policy; renamed
  (`rollActive`).
- Following polls the storage (every 200 ms by default): simple, and the
  same on any storage. Change notifications from the storage, where it
  has them, can replace it later behind the same `follow`.
