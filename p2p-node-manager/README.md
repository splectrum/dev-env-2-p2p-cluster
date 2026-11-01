# p2p-node-manager

One node's manager, on the host machine, for the node's whole life: it
starts the node's container, hands it its secret, follows and records it,
and stops it. One per node, each in the node's own folder.

```sh
node cli.js run --folder=<node-folder> --vault=<vault-dir> --image=<image> \
  --network=<network> --ip=<ip> --swarm=<swarm> --name=<node> [--role=master]
```

- **The container is hardened**: read-only root, every capability dropped,
  no new privileges, user 65534, memory capped with no swap, no core
  dumps, the store on a tmpfs (RAM).
- **The secret** (the node's primary key, from the vault) reaches the
  node's memory only: no file, no mount, no environment variable. The
  master gets it on its stdin; a joining node through the auxiliary swarm:
  the manager's peer authorises the ephemeral key the container logs and
  answers its request for the secret once.
- **Its tmpfs mounts**: the store noexec; `/tmp` noexec (64 MB); for a
  joining node, the code loaded by replication on a tmpfs of its own,
  exec (native addons load only from one).
- **The vault** (`vault.js`) is a stand-in for now: one owner-only key file
  per node in a folder of its own on the host, outside every repository,
  node folder and image; generated there. Not yet encrypted.
- **Records**, in the node's folder (nothing secret): `node.json`,
  `manager.jsonl` (started, the secret handed over, ready, resources
  sampled from the container runtime, exited with its code and whether it
  was killed for memory, stopped), `node.jsonl` (the node's own log),
  `node.stderr`, `state.json`.
- SIGTERM to the manager stops the node gracefully (SIGTERM to the node).

`image/build.sh <dev-repository>` builds the images: `bare-base` (the plain
base) and `p2p-node:<commit>` (the base with the node's code, development
dependencies pruned, this platform's prebuilds only).

`npm test`: 1 test (the vault).
