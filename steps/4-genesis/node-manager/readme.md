# Part: p2p-node-manager, minimal

Folder `p2p-node-manager/` (README there): one node's hardened container,
its secret on stdin from the vault stand-in, its log and lifecycle and the
container runtime's resource samples recorded, a graceful stop. Found on
the way: the manager's CLI exited before recording the stop it had
started; it now waits for it.
