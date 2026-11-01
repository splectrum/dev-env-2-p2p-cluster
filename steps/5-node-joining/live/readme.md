# Part: the node goes live

At genesis the master makes the swarm's **boot repository** (`boot`:
`main` with a readme, `pending/default` where requests come, and
`execute/main`). Every node, the master too, goes live the same way: the
boot repository cloned into its own `node` repository, under its own key
(its origin recorded: the boot repository's id and key), then its record
(`main:node.json`) and its capability (`capability/default:packages.json`,
a link to the packages it runs: URI, key, commit) committed. A joining node
reads the boot repository from a replica; it joins under its friendly name
(`p2p-rns` refuses a taken name, and a refused start now closes what it had
opened), registers `/<swarm>/<node>/node` and announces it.
Reproducible: a restarted node has the same identity, the same repository
key and internal id.
