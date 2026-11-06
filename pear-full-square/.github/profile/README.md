# pear-full-square

P2P application code built on the Bare + Holepunch stack, one module a
repository. Developed and tested together in
[splectrum/dev-env-2-p2p-cluster](https://github.com/splectrum/dev-env-2-p2p-cluster),
and published as packages, ready to run, in
**[haiccing](https://github.com/haiccing)** (start there to run anything).

| Modules | What they do | Package |
|---|---|---|
| `mycelium-git`, `-layer`, `-repo`, `-topic`, `-uri`, `-xpath`; `p2p-git` | the data fabric: layered git repositories, topics of records, URIs and paths; git on Hyperdrive | [mycelium](https://github.com/haiccing/base-package-mycelium) |
| `p2p-store`, `-dht`, `-connect`, `-replicate`, `-channel`, `-mrepo`, `-rns` | the p2p substrate: storage, discovery, connections, replication, channels, repositories on Hypercore, the name service | [p2p](https://github.com/haiccing/base-package-p2p) |
| `p2p-node`, `p2p-node-manager`, `p2p-swarm-manager` | a node, and its managers on the host: a swarm's genesis, nodes joining, liveness, a node's shutdown | [p2p](https://github.com/haiccing/base-package-p2p) |
| `splectral-server`, `-shell`, `-contract`, `-model`, `-transport`, `-p2p-*`, `-scenario`, `-timeline`, `-replay` | Splectral, the browser platform: watching swarms, acting on them, scenarios | [splectral](https://github.com/haiccing/base-package-splectral) |
| `haicc-reconcile`, `haicc-deployment`, `haicc-base-boot` | HAICC: declare what a project needs, check it, make it so; its boot | [haicc](https://github.com/haiccing/base-package-haicc) |
| `pkgm-base-manager` | the package manager | [pkgm](https://github.com/haiccing/base-package-pkgm) |

Also here: `hyperdrive-fuse` (a read-only FUSE mount for Hyperdrive),
`p2p-docker-dev`. Archived: `mycelium` (split into the `mycelium-*`
modules), `pkgm-base-boot` (retired: everything boots through HAICC).

Part of the [SPLectrum](https://splectrum.world) engineering infrastructure.
All modules MIT licensed.
