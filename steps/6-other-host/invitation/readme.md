# Part: the invitation

**Scope.** What another host is given to join the swarm, from the swarm
manager: `node p2p-swarm-manager/cli.js invite --folder=<swarm-folder>`
(`invite()`), recorded in the swarm's record (`invited`).

```json
{
  "swarm": "hosts",
  "network": { "name": "p2p-hosts", "subnet": "172.34.0.0/24", "gateway": "172.34.0.1" },
  "bootstrap": "172.34.0.2:49737",
  "master": "<the master's public key>",
  "packages": { "uri": "/hosts/master/packages", "key": "<public>", "commit": "<sha>" },
  "image": "p2p-node:<dev commit>"
}
```

- **Public facts only**: public keys, addresses, a commit, an image tag.
  Nothing of host A's management plane (its auxiliary network, its
  folders, its vault, its managers' pids); the unit test checks it
  (`p2p-swarm-manager/test/invite.test.js`).
- **What it does not settle** (open): how it travels (here a file; it
  could be a repository of its own, or a resource of the swarm's), whether
  it is signed by the master (so host B can tell it is genuine), and
  address allocation on the data plane (host B chose `.100` by hand).
- The image: on a real host B, built from the same commit (`build.sh`
  tags by commit) or pulled. It only needs the boot program: the node's
  code comes by replication at the invitation's commit (the image with the
  join closure only, carried forward from step 5).
