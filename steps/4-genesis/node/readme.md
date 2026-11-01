# Part: p2p-node, the master role

Folder `p2p-node/` (README there). The node application composes the p2p
series, p2p-mrepo and p2p-rns; the master starts the swarm's DHT, serves
p2p-rns on the swarm's topic, and runs genesis: its `node` and `packages`
repositories, reproducibly. Proposed name; its product repository is to be
created.

Found on the way: a rebuilt master got new internal ids for its
repositories, though the internal id is the permanent identity. p2p-mrepo
now takes a given id (`idFrom`), and the master derives its repositories'
ids from its identity and their names: a rebuild keeps them (tested, and
shown by the validation's restart).
