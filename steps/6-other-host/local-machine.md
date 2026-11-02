# Repeating step 6 on a local machine

**Superseded by `demos.md`** (step 9): the demos as HAICC projects, one command each. Kept as the record of how this step ran, at its own commits, before the folders moved to `<org>/<repo>`.

How to rerun step 6's validation on your own machine, using the local
network only. It is the same run as the record in `validation/record/`:
host A and a simulated host B on one machine, joined by one Docker
network that stands for the network between the hosts. Nothing goes to the
internet while it runs. The swarm has its own private DHT, every Docker
network is `--internal` (no route out), and the vaults stay on the
machine.

The internet is needed once, beforehand, to fetch the code, the npm
packages and two base images. After that the machine can be offline.

## What the machine needs

- **Linux on x86-64, with Docker Engine running natively, rootful.**
  - The managers run on the host and bind to the gateway addresses of the
    Docker bridge networks (`172.34.0.1`, `172.35.0.1`, `172.36.0.1`), so
    those must be addresses of the machine itself. Docker Desktop (macOS,
    Windows) puts the networks in a VM where the host can't reach them, so
    it does not work as is.
  - The image build copies the `linux-x64` Bare binary.
  - Tested with Docker 29.9.2, kernel 6.18.
- **Node.js 22** (tested 22.22.0), with npm and git.
- **Bare**, installed globally from npm: `npm i -g bare@1.36.2`, which gives
  runtime 1.36.0 (`bare --version`). The image build takes Bare's binary
  from there.
- **Free addresses**: nothing else on the subnets `172.34.0.0/24` (the
  swarm's data plane), `172.35.0.0/24` (host A's auxiliary network) or
  `172.36.0.0/24` (host B's). The probe also uses `172.38` and `172.39`.
- **A firewall that lets UDP from the containers reach the host's bridge
  addresses.** The managers' DHT and the provisioning peers listen there,
  on ports 49737 to 49741. With `ufw` or `firewalld` on default deny, open
  them on the `br-*` interfaces, or turn the firewall off for the run.
- About 4 GB of disk (images, `node_modules`), 4 GB of RAM: each node's
  container is capped at 1 GB and keeps its store in RAM.

## Once, while online

```bash
git clone https://github.com/splectrum/dev-env-2-p2p-cluster.git
```

```bash
cd dev-env-2-p2p-cluster && git checkout main
```

The p2p series, the node and the managers form one npm workspace at the
root. `PUPPETEER_SKIP_DOWNLOAD=1` stops p2p-git's preparation from fetching
a browser.

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm install
```

The mycelium modules keep their own `node_modules`:

```bash
for m in mycelium-git mycelium-layer mycelium-repo; do (cd $m && PUPPETEER_SKIP_DOWNLOAD=1 npm install); done
```

The two base images: the node images are built on `debian:bookworm-slim`,
and host B's requester runs in `node:22-slim`.

```bash
docker pull debian:bookworm-slim && docker pull node:22-slim
```

Optionally, build the node image now, so the run doesn't need to. Genesis
builds it from the committed tree; it is tagged by the commit, so the run
then finds it already there.

```bash
sh p2p-node-manager/image/build.sh .
```

From here on the machine can be offline.

## Check first

The changed modules' unit tests:

```bash
(cd p2p-swarm-manager && npm test) && (cd p2p-node-manager && npm test)
```

## The probe: why one data plane

About 2.5 minutes. Three small containers per variant, each printing one
JSON line:

```bash
sh steps/6-other-host/probe/run.sh master-on-two-networks 172.38.0.2
```

```bash
sh steps/6-other-host/probe/run.sh master-bound-to-all 0.0.0.0
```

```bash
sh steps/6-other-host/probe/run.sh one-network 172.38.0.2 swarm
```

Expected, as in `probe/readme.md`:
- In the first two variants, `remote.reached` is `[]` and its
  `routingTable` is empty.
- In `one-network`, every peer reaches every other.

## The validation, phase by phase

About 2 minutes in all. Choose a work folder outside the repository, and a
record folder: use a scratch one, so the committed record stays as it is.
The tree must be committed and clean, because genesis builds the image
from it.

```bash
export W=$HOME/step6-work R=$HOME/step6-record
```

Each phase prints one JSON line, and they run in this order:

```bash
for p in genesis join-node-1 invite remote-join isolation status request-remote-from-a request-node-1-from-b restart-remote status-after-restart request-remote-after-restart remote-stop status-after-remote-stop request-node-1-after-remote-stop stop records; do echo "== $p"; sh steps/6-other-host/validation/other-host.sh "$W" "$R" $p || break; done
```

What each part shows, and what to look for:

| Phase | What happens | Look for |
|---|---|---|
| `genesis` | host A's swarm manager builds the image and starts the master | `"master":{"uri":"/hosts/master",...}` |
| `join-node-1` | host A adds a node it controls | `"uri":"/hosts/node-1"`, `materialised` |
| `invite` | host A writes the invitation for host B (`$W/b/invitation.json`) | public keys, addresses, a commit, an image tag; nothing else |
| `remote-join` | host B's node manager, started on its own, joins `remote-1` | `"status":"running"`, the invitation's commit in `materialised` |
| `isolation` | what `remote-1` is attached to and given | networks `p2p-hosts` and `p2p-hosts-remote-1-aux` only; `mounts: []`; `secretInEnv`, `secretInArgs` and `remoteInSwarmRecord` all `false`; each vault holding only its own host's keys |
| `status` | the swarm from host A | `remote-1` with `"controlled":false`; `master` and `node-1` with `true` |
| `request-remote-from-a`, `request-node-1-from-b` | requests across the hosts | `"Status given."`; `reachedAt` the other host's node |
| `restart-remote` | host B's manager restarts its node | `before.key` equal to `after.key`; the same `live` key and id |
| `remote-stop` | host B's manager stops its node | `"exitCode":0` |
| `status-after-remote-stop`, `request-node-1-after-remote-stop` | the swarm runs on | node-1 answers. Known gap: `remote-1` is still listed, and both take about 6 s instead of under 1 s |
| `stop` | host A stops its swarm | each node `"exitCode":0` |
| `records` | the records copied into `$R`, each host's apart, never a vault | `"secretInRecords":false,"containersLeft":0,"networksLeft":0` |

Keys, ids and commits differ from the committed record, because every run
makes new identities and the image is tagged by your commit. What should
match is everything in the "look for" column.

To record a run the way the committed one was recorded, use the script
below. It overwrites `steps/6-other-host/validation/record/` (compare with
`git diff`, then keep it or `git checkout` it back):

```bash
sh steps/6-other-host/validation/run.sh "$W"
```

## Watching it

While the swarm runs (after `remote-join`, before `stop`):

- `docker ps` lists `p2p-hosts-master`, `p2p-hosts-node-1` and
  `p2p-hosts-remote-1`.
- Host A's records are in `$W/a/` (`hosts-swarm/`, `hosts-master/`,
  `hosts-node-1/`), host B's in `$W/b/hosts-remote-1/`. Each holds
  `manager.jsonl` (what the manager did and saw), `node.jsonl` (the node's
  own log) and `state.json`.
- Status at any time:
  `node p2p-swarm-manager/cli.js status --folder=$W/a/hosts-swarm`.

The vaults are `$W/a-vault` and `$W/b-vault`. They hold the nodes' secret
keys as plain files (the vault is still a stand-in), so delete them when
you're done.

## If it stops halfway

Host B's manager runs detached. Stop it by its pid file, then host A's
swarm:

```bash
[ -f $W/b/hosts-remote-1/manager.pid ] && kill $(cat $W/b/hosts-remote-1/manager.pid)
```

```bash
node p2p-swarm-manager/cli.js stop --folder=$W/a/hosts-swarm
```

If anything is still left over, remove it by name:

```bash
docker rm -f p2p-hosts-master p2p-hosts-node-1 p2p-hosts-remote-1; docker network rm p2p-hosts p2p-hosts-aux p2p-hosts-remote-1-aux
```

Then delete `$W` (the vaults, `$W/a-vault` and `$W/b-vault`, are inside
it; `genesis` also clears them at the start of a run).

Common failures:
- **`dev tree has uncommitted changes`**: commit or stash first; the
  record folders don't count.
- **A node not ready within 180 s**: usually UDP to the bridge gateway is
  blocked by the firewall; see the node's `manager.jsonl` and `node.stderr` under `$W`.
- **`Pool overlaps with other one on this network`**: another network
  holds one of the subnets above.

## Two machines on a local network (not done yet)

The run above simulates host B. With a real second machine on the LAN,
the probe's finding decides the setup: the swarm's data plane has to be
one network that every node's container reaches from both machines. Two
ways to get one:
- **Containers with addresses on the LAN** (a `macvlan` Docker network on
  each machine, on the same LAN subnet, with address ranges that don't
  overlap).
- **An overlay network** (Docker swarm mode, `docker network create -d
  overlay --attachable`).

Host B then needs:
- the code (the same commit), installed as above;
- the image built from that commit;
- the invitation file copied over from host A;
- its own vault;
- an address on the data plane for `--ip`.

The invitation names the data-plane network, so on host B a network of
that name must exist and reach host A's containers. Host B's own
auxiliary network is created by its node manager, as here.

This is untested. The scripts here assume one machine (one Docker daemon
for both hosts, the host's gateway address on the data plane). It is the
open point "the data plane on real hosts" in `notes/next.md`.
