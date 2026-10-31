# Part: p2p-mrepo

**Scope.** Mycelium repositories on the p2p layer, in a p2p-store: create
(an internal id recorded inside), import (a native repository or a bundle,
the boundary), clone (a new key and id, the origin recorded), open again
(the store's registry), a replica by key (read only, lazy), list. Each
repository is a mycelium backend: p2p-git on the drive, through
mycelium-git's p2p-git engine. Folder: `p2p-mrepo/` (README there). The
name is proposed; its product repository is to be created.

Found on the way: a repository open in a store must be given again, not
opened twice (Hyperdrive opens its db core as an exclusive session: a
second open waits forever).
