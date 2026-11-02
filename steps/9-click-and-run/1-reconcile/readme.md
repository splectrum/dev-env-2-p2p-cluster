# Part 1: haicc-reconcile

**Done.** `pear-full-square/haicc-reconcile`: the engine (check, plan,
apply, remove; dependency order; non-strict by default, strict removing
only its own extras; ownership; `blocked` for what needs an unmet,
unfixable need; records), a command reading a declaration file, and the
generic providers: checked only `os`, `docker`, `node`, `bare`,
`subnet`, `udp`, `port`; created `folder`.

**Findings.**
- 4 unit tests (fake kinds for the engine's rules; folder, port, os and
  node for real).
- On this machine, a declaration of the machine's needs: all met, `udp`
  by a container sending to the bridge's gateway, in about 4 s; with
  Docker stopped (it stops now and then here), `docker` missing with its
  hint, and `udp` reported blocked rather than wrongly observed (first
  run: the subnet said "free" with Docker down; `blocked` added).
- Bare's version is checked by the `bare` provider (part 4's third fix).
