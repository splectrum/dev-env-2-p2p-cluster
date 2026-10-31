# Part: the modules

Five folders on `main`, each with its own `package.json` (an id), README
and unit tests, composed in one dependency tree: npm workspaces at the
repository's root (`package.json`), so every module and the application
composing them share one copy of each dependency (one module tree per
process: the first build's lesson).

| Module | Folder | Unit tests |
|---|---|---|
| `p2p-store` | `p2p-store/` | 5: own drives by name, across storages; an explicit keypair; a replica; resources and events without secrets |
| `p2p-dht` | `p2p-dht/` | 1: a private DHT from nothing, a node joining it |
| `p2p-connect` | `p2p-connect/` | 1: two nodes meet on a topic; a refused node does not connect |
| `p2p-replicate` | `p2p-replicate/` | 1: over a direct stream, read lazily, counted per peer, then held whole |
| `p2p-channel` | `p2p-channel/` | 2: messages and requests both ways, no content in the events; a channel waits for the other side |

Not yet, as planned (only what the next steps need): a replication policy
(which resources to which peers; Corestore serves any core it holds),
dedicated channels.

**Record**: the unit tests run as cases in `../validation/record/`.
