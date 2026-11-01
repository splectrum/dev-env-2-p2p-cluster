# Part: probe, reaching the swarm from another host

**Question.** A node on another host reaches the swarm over a network
between the hosts. Can the master stand on two networks (its host's swarm
network and the hosts' LAN) and be reached from both, or must a swarm's
data plane be one network all its nodes reach?

**Method** (`run.sh <variant> <master-bind> [lan|swarm]`, `peer.mjs`):
three containers from the plain base (Bare), hardened, the dev
repository's root mounted read-only; the p2p series (`p2p-dht`,
`p2p-connect`) with keys from fixed seeds. The master (swarm `.2`, LAN
`.2`) runs a private DHT and a server; `local` (swarm `.3`) and `remote`
(LAN `.10`, or swarm `.10` in the third variant) bootstrap from the master's
address on their network and connect to the master and to each other.

**Findings** (record of 2026-11-01, dev `5435b56`; 3 cases, exit 0):

| Variant | local reached | remote reached | remote's routing table |
|---|---|---|---|
| master on two networks, DHT bound to its swarm address | master | nothing | empty |
| master on two networks, DHT bound to every address | master | nothing | empty |
| one network for all (remote on the swarm's) | master, remote | master, local | local, master |

- **A DHT node has one address.** Its identity is derived from the
  address the others see it at; bound to every address, the master's DHT
  still answered only on the network its bootstrap was learnt on (with
  p2p-dht's bootstrap pointed at `0.0.0.0` it answered on none). A peer
  on the second network got no valid answer: its routing table stayed
  empty and it reached nobody.
- **One network, everything works**: every peer reached every other,
  directly (38 to 147 ms after starting).
- **So the data plane is one network every node reaches.** Between real
  hosts: an overlay (Docker's overlay network, a WireGuard mesh) or the
  hosts' LAN (containers given LAN addresses, macvlan). The management
  plane stays per host and per node. Holepunching across NATs (HyperDHT's
  own answer for peers that cannot reach each other directly) is a
  different setting, not probed here (in the first build, a connection
  left to holepunching between containers on one host carried nothing).
