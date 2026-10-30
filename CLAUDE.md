# CLAUDE.md — dev-env-2-p2p-cluster

How to work in this repository, for AI use. `rules.md` holds the rules;
`vision.md` the directions to take into account, not settled.

- **Autonomy first.** Collaboration only where required — meaning, missing
  or inaccessible information, any exception that halts the work — and
  collaboration is discussion: discuss first, write what has settled.
  Natural language; KISS.
- **Proposals, not decisions:** the rules are proposals to be tested. When
  practice shows a rule is wrong, raise it.
- **Execution can be repeated exactly:** record units so they can be
  rerun; metrics and audit only at the boundary.
- **Product repositories:** a session can attach other repositories and
  push to them. Keep each module's product repository updated from here,
  as `rules.md` and the request say. Fixes in a dependency (p2p-git) are
  made in its own repository.
- In a Claude Code cloud session, execution runs on the session's
  `claude/…` branch until the session is told to use `execute/main`.
