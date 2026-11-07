# The local agent's run: the tenth release (2026-11-08)

`setup-795612ec9e16`, Bare v1.36.0, latest, from `2e3eb0a`: published with the
human's word ("build and test and publish"). Five repositories pushed:
`base-package-haicc` `40b0bde`, `base-package-pkgm` `0091737`,
`base-swarm-three-nodes` `10a5d3a`, `base-demo-liveness` `aabb426`,
`base-demo-other-host` `0637bc2`. Built and tested first with
`publish.sh --no-push`, from local sources (`--sources=folder:`), Node.js off
the PATH.

## The candidate as handed over failed: fixed here

From `105a148` (`setup-d6820bbf52dd`): the platform's own test passed (6, its 24
steps), but every test that starts a node's container failed at it:
`base-swarm-three-nodes/test` 16 of 17, each demo 24 of 25, `FAILED the node
not started:  Run 'docker run --help' for more information`. Only Docker's last
two lines were shown; the first said why:

    invalid endpoint settings: user specified IP address is supported only when
    connecting to networks with user configured subnets

The cause: `ensureNetwork` (`haicc-base-boot/haicc.js`) makes the swarm's network
without `--subnet`, and the node's container is started with `--ip`. Docker
28.3.0 (here) refuses that; the implementer's Docker must allow it.

Fixed in `ensureNetwork`: the network is made, the subnet and gateway Docker
picked are read, and it is made again with them given (`b8c975e`). The module's
tests: 103 of 103.

## Tested, the fixed build, local sources, Node.js off the PATH

Every command exit 0, each count as the handover says:

| `./haicc boot …` | full set | `--set=validation` |
|---|---|---|
| `base-package-haicc/test` | 6 passed, the platform's 24 steps | 2 |
| `base-swarm-three-nodes/test` | 17 passed, the deployment's 13 steps | 3 |
| `base-demo-liveness/test` | 25 passed, the demo's 8 steps | 2 |
| `base-demo-other-host/test` | 25 passed, the demo's 9 steps | 2 |

`./boot`: `base-package-pkgm` and `base-package-haicc` deployed, intact, their
validation passed. Afterwards: no containers, no networks, no hidden files.

## After publishing, from GitHub

The latest link, the default sources, a new folder, Node.js off the PATH: the
file served is the file built; every command exit 0, every count the same as the
table above. No containers, networks or hidden files left. The download stalled at
13.7 of 39 MB for 10 minutes (curl's `--retry` does not notice a stall); stopped
and resumed with `curl -C -` and a stall limit (`-y 30 -Y 1000`): done in 12 s,
identical. So `-C -` resumes, seen once.

**By hand, with a browser** (the handover's step 4): the human's, from the local
file.

## Findings, for the implementer

1. **Docker's first line is the one that says why**: `startContainer` shows the
   last two lines of `docker run`'s error, here `Run 'docker run --help'` and
   nothing more. The first line (or all of them) would have said it.
2. **A failed test leaves its swarm's network**: the three failed runs left
   `haicc-…-three-nodes` and two `haicc-…-hosts` networks (labelled with the
   test's install, which was gone). No containers were left.
3. **No test covers a Docker that wants a subnet**: the fix is covered by the
   platform's and the demos' own runs here, not by a unit test.
4. Open from before: a removed `LICENSE` not noticed; the WSL clock's negative
   durations; the sha256 pin refusing a damaged runtime untested.
5. **A stalled download hangs**: the published commands' `curl --retry` waits
   forever on a connection that stops sending; `-y 30 -Y 1000` (or
   `--speed-time`/`--speed-limit`) with the retries would end it and resume.
