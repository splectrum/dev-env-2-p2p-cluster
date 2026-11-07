# Swarms and nodes, level by level

For a user, in a booted work folder (`cd ~/haicc-work`). Each level has its
own `haicc`; a `boot` or `shutdown` works on the config of the folder it is
called from. Removing asks first (`--yes` agrees). Names are URI parts:
`Hosts` becomes `hosts`, and it says so.

Today a swarm is built by hand, as below. Making swarms from a package's
configuration is agreed and comes next (`design/work-folder.md`).

## The root (the work folder)

```bash
./haicc boot                 # the host's prerequisites; each swarm in swarms.json booted
./haicc boot hosts           # a swarm: added to swarms.json, its folder, launcher and nodes.json
./haicc shutdown [hosts]     # each swarm's (or one's) shutdown: their nodes removed, configs kept
./haicc teardown hosts       # the swarm removed: its nodes, its folder, its entry
./haicc list                 # the swarms here, their nodes
./shutdown                   # cold: everything back to the setup (haiccing/, log/, bare/ kept)
```

## A swarm

```bash
./hosts/haicc boot master    # a node: added to nodes.json (the first is the master;
                             # --role=master|node), built, booted
./hosts/haicc boot node-1
./hosts/haicc boot           # each node in nodes.json: built if not there, booted, the master first
./hosts/haicc shutdown [node-1]   # each node's (or one's) cold shutdown: its folder removed
./hosts/haicc teardown node-1     # the node removed, and its entry
```

A node's boot shows as it happens, each line marked `  | ` (`--no-echo`: its
last line only).

## A node

A node's boot is in two parts. Its cold boot (by the swarm): its folder,
the platform's package copied in, its launcher. Its warm boot (its own
HAICC) validates what it was given:

```
  | base-package-haicc:
  |   ok     base-package-haicc: intact (e388c7830a25)
  |   ok     base-package-haicc/test/modules-load (4/4, 0.4 s)
  |   ok     base-package-haicc/test/sets (11/11, 0.2 s)
  | Ready: 3 test runs passed (base-package-haicc)
The node hosts/master: up
```

Not intact (a file changed in its copy) or a test failing: the node says
which and is not up; the swarm's boot stops there. Shut it down and boot it
again to build it from scratch.

```bash
./hosts/master/haicc boot              # its warm boot again
./hosts/master/haicc shutdown          # its container removed (none yet), its folder kept
./hosts/master/haicc test base-package-haicc [--set=validation]   # intact, then its tests
./hosts/master/haicc list              # its packages, their hashes
```

Never edit a file in a node's packages: they are hard links to the work
folder's own copy, so an edit changes every copy.
