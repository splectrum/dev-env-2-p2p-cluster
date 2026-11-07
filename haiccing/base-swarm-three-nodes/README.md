# base-swarm-three-nodes

A configured swarm, no application: a master and two nodes on one host,
with the p2p node as its codebase. Self-contained: it carries the code its
swarm runs (`modules/`), its configuration (`swarms/three-nodes/`) and its
tests.

```sh
./haicc boot base-swarm-three-nodes     # its swarm, made from its configuration
```

- `swarms/three-nodes/`: its nodes (`nodes.json`), its codebase
  (`modules.json`: the p2p node, and what it uses), what Splectral shows
  (`splectral.json`: nothing), what the host provides (`host.json`).
- `test/`: `validation` (the package as it is: its modules load, its sets
  agree, its swarm's configuration holds), `full` (and the modules' own
  tests).

Written by the package writer from the development repository
([splectrum/dev-env-2-p2p-cluster](https://github.com/splectrum/dev-env-2-p2p-cluster)): not edited here.
