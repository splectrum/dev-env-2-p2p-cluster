# base-swarm-three-nodes

A configured swarm, no application: a master and two nodes on one host,
with the p2p node as its codebase.

```sh
./haicc boot base-swarm-three-nodes     # its swarm, three-nodes, in swarms/three-nodes/
```

## The package

- `swarms/three-nodes/`: its nodes (`nodes.json`), its codebase
  (`modules.json`), what Splectral shows (`splectral.json`: nothing yet),
  what the host provides (`host.json`).
- `modules/`: the code its swarm uses, self-contained.

Written from the development repository
([splectrum/dev-env-2-p2p-cluster](https://github.com/splectrum/dev-env-2-p2p-cluster)).
