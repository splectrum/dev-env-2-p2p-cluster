# Part: validation

**Scope.** The changed modules' unit tests; then, end to end
(`other-host.sh <work> <record> <phase>`, each phase a case; `run.sh
<work>` records them all): genesis and node-1 on host A; the invitation;
remote-1 on host B under its own manager; what remote-1's container is
attached to and given; the swarm's status from host A; a request from host
A to remote-1 and one from host B to node-1; remote-1 restarted by its
manager; status and a request again; remote-1 stopped by its manager, the
swarm running on (status, a request from host B to node-1); the swarm
stopped; the records copied, each host's apart (never a vault), checked
for secrets and for anything left running. `request.mjs` is a requester
knowing only an invitation and its own address on the data plane.

**Findings** (record of 2026-11-01, dev `28642a8`, request `997f17e`; 18
cases, all exit 0):

- **Unit tests**: p2p-swarm-manager 1 (the invitation), p2p-node-manager
  1 (the vault): pass.
- **remote-1 joined in 8.7 s** under host B's manager: its auxiliary
  network made there (`172.36.0.0/24`), provisioned from host B's vault,
  the packages materialised at the invitation's commit (`bfccac2`, 3,609
  files, 14.4 MB by replication, 6.9 s), live as `/hosts/remote-1`, its
  repository `/hosts/remote-1/node` cloned from the swarm's boot
  repository.
- **Isolation**: remote-1's container on the data plane (`172.34.0.100`)
  and its own host's auxiliary network only (not host A's), no mount, its
  store, `/tmp` and code on tmpfs, its secret in neither its environment
  nor its arguments; host A's vault holds the master's and node-1's keys,
  host B's remote-1's only; host A's swarm record does not name remote-1.
- **The swarm sees it, does not control it**: status from host A lists
  `/hosts/master` and `/hosts/node-1` controlled, `/hosts/remote-1` not,
  and the five repositories by URI; the managers listed are host A's two.
- **Requests across the hosts**: host A to remote-1 (reached at
  `172.34.0.100`, 432 ms) and host B's requester (`172.34.0.101`) to
  node-1 (reached at `172.34.0.3`, 386 ms): each taken into
  `pending/default`, executed, `Status given.`, read back from a replica.
- **Restarted by its manager**: ready in 8.1 s with the same identity
  (`f6ebabaa…`), repository key (`b1cbcece…`) and internal id
  (`11b2d2d4…`); a request answered again (517 ms). As in step 5, what its
  repository took in before the restart is gone (checkpoints).
- **Stopped by its manager, the swarm runs on**: remote-1 exits 0; node-1
  still answers host B's requester, its `pending/default` holding both of
  host B's requests.
- **The gap: nothing tells the swarm a node has gone.** After remote-1's
  stop, p2p-rns still lists it (in code it keeps registrations until its
  owner registers again), and the status and the next request took 6.3 s
  and 6.4 s instead of 0.3 s and 0.4 s: peers' DHTs still held remote-1's
  address and waited on it. Carried forward: liveness in p2p-rns (a
  registration held while its owner is connected, or a lease) and leaving
  the swarm on a graceful stop.
- **The stop**: graceful, node-1 then the master, exit 0; no container and
  no network left (host B's auxiliary network removed by its manager).
- **No secret in the records** (every key of both vaults searched for);
  the logs: master 168 lines, node-1 80, remote-1 138; remote-1's manager:
  auxiliary network made, provisioning ready, authorised, connected, the
  secret handed over, materialised, ready, stopped, per run.
