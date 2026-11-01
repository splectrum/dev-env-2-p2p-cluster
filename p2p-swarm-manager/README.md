# p2p-swarm-manager

A swarm's manager, on the host machine: it manages the nodes it controls
(possibly only the master) through their node managers, and keeps the
swarm's record.

```sh
node cli.js genesis --swarm=<name> --folder=<swarm-folder> --nodes=<parent> --vault=<dir> --code=<dev-repo>
node cli.js status  --folder=<swarm-folder>
node cli.js restart --folder=<swarm-folder> --node=<name>
node cli.js stop    --folder=<swarm-folder>
```

- **Genesis**: the images, the swarm's internal network, the master's node
  manager (its secret generated in the vault); the swarm's record
  (`swarm.json`, `swarm.jsonl`) in its own folder.
- **Folders stand side by side** under `--nodes`: the swarm manager's and
  one per node. The vault is a folder of its own.
- **Node managers run detached**: a node keeps running when the swarm
  manager is not.
- **Status** asks p2p-rns as a peer of the swarm, from the host, on the
  swarm's internal network (the host's address there is the gateway).

Nodes joining come with step 5; nodes on other hosts with step 6.
