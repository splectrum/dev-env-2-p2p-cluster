# Part: the code by replication

The boot program opens the master's packages by key (the swarm manager
gives it the key and the commit from the swarm's record), connects to the
master, checks that `capability/default` is at that commit (else it
stops), and materialises the deployed tree (`layer/extract`) into its own
memory; then it starts the node from that code, its secret on stdin, and
stays as its parent (passing SIGTERM on).

Found on the way:

- An update of a replica before the master is connected returns at once,
  with nothing: the boot waits for the connection first.
- **Native addons in code loaded by replication need a filesystem that
  allows execution.** Docker mounts a `--tmpfs` `noexec` by default, and
  `dlopen` refuses there. The store keeps its noexec tmpfs; the code gets a
  tmpfs of its own, `exec`, for joining nodes only. This is a real
  trade-off: a compromised node could write executable code there. It is
  recorded here and in the node pattern.
- The node's log is now written synchronously: under Bare an asynchronous
  write just before `process.exit` was lost, and with it the failure.
