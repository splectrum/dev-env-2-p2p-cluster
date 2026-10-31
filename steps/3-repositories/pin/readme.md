# Part: the machinery pinned

**Scope.** Validated by r3, r4 and r5 (`../validation/`), the machinery in
development gets a new id, `dba3214e-36bc-4e22-bd9d-eeb80242850f` (was
`46ba2e65-5221-43f2-96cd-6dec6c82d35c`), put into `test-run/machinery`
(commit `b9db7d9`; `test-run/find-id.sh` finds it there). Then r6: the
pinned machinery, found by its id, on an instance on Hypercore, executed
under Bare.

**Expectation.** r6: 627 of 627 met, identical to r5.

**Record**: `record/` (the kept run `2026-10-31-r6.bundle`).

**Findings** (record of 2026-10-31, dev `45a3c42`; 2 cases, exit 0):

- **r6: 627 of 627 met**, with the pinned machinery `dba3214e`, found by
  its id, on an instance on Hypercore, executed under Bare; kept at
  13.9 MB.
- **Identical to r5** (the same machinery, in development): every
  response's invocations and the report.
