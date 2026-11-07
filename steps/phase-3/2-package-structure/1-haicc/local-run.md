# The local agent's run: the sixth release (2026-11-07)

`setup-25c91afc4801`, boot 0.6.0, latest. Published with the human's word from
`7a01183`: `base-package-haicc` `8ac17a0` and the release, nothing else.

## Before publishing, the built file in new folders

- `sh haicc-setup.sh <new folder>`, `./boot`, then
  `./haicc boot base-package-haicc/test`: `Passed: 7 passed, 0 failed, 0 skipped`
  (the modules' tests, `modules-load`, `sets`, and `platform`: all 19 steps).
- `./haicc boot base-package-haicc/test --set=validation`: `Passed: 2 passed, 0
  failed, 0 skipped`.
- A swarm and a master: up, the node's self-test 2 of 2 runs. In the node,
  `./haicc list` shows the package once, `./haicc test base-package-haicc`
  passes: findings 1 and 2 of the fifth release (`notes/next.md`) no longer
  show. `./haicc boot hosts/master`: refused, exit 2, naming the command.

## After publishing, as a user would, from GitHub

```sh
curl -fL -o haicc-setup.sh https://github.com/haiccing/base-package-haicc/releases/latest/download/haicc-setup.sh
sh haicc-setup.sh <new folder> && <new folder>/boot && <new folder>/haicc boot base-package-haicc/test
<new folder>/haicc boot base-package-haicc/test --set=validation
```

The default sources (`github haiccing`), in a scratch folder rather than
`~/haicc-r6`, which stays free for the human. Every command exit 0:
`Passed: 7 passed, 0 failed, 0 skipped` (the platform's 19 steps), `Passed: 2
passed, 0 failed, 0 skipped`. No hidden files; one log file, named by its start.

Not run: a boot without Node.js, a failed download stopping the one command.

## Findings, for the implementer (not fixed here)

1. **A test run's log is in the source and in the release.**
   `pear-full-square/haicc-base-boot/log/20261107T062339Z.log` (from `fd4d821`,
   40 lines: `haicc`'s usage, run in `/home/user/dev-env-2-p2p-cluster`) is
   tracked, and the package writer carries it into
   `modules/pear-full-square/haicc-base-boot/log/`. Nothing sensitive in it, so
   it did not hold the release. To do: remove it, and stop a run in a module's
   folder writing `log/` there, or ignore `log/` in the source and the writer.

## The human's manual test

To come.
