# Phase 2: status

The second development phase: the creation of a P2P cluster, starting with
p2p-git on Hyperdrive. Request: `pending/phase-2/request.md` on
`pending/default`.

## 1. p2p-git on Hyperdrive as a node's store — done

- p2p-git at `bare-for-pear/p2p-git@d7d154d`: folders reported as folders,
  `readlink` and `symlink`, and the pack parser's ofs-delta offsets fixed
  in p2p-git itself. mycelium-git's `hyperdriveFs` workaround is gone.
- `openHyperdrive` (mycelium-git/hyperdrive): p2p-git on a persisted,
  Corestore-backed Hyperdrive through p2p-git's own adapter. The contract
  suite passes on it (78 of 78, Node), and so does the command set on
  Node and on Bare (`commands-hyperdrive.txt`,
  `commands-bare-hyperdrive.txt`, 60 of 60 each), each invocation a
  separate process on the same persisted store.
- Test run `test-runs/2026-10-30-r1.bundle`: every module, every engine
  and runtime, Hyperdrive included: 627 of 627 met.
- Deployed modules now carry Corestore and Hyperdrive. rocksdb-native
  alone ships 180 MB of prebuilds for thirteen platforms; deployments keep
  this platform's only (20 MB). Package size is the package repository's
  first question.

### Hyperbee for refs: evaluated, not adopted now

A Hyperdrive is a Hyperbee (`db`: path to entry) plus a blobs core. With
p2p-git on it, refs are already Hyperbee entries (`/refs/heads/<name>`),
each pointing at a small blob. A separate Hyperbee for refs would save the
blob read per ref and allow a batched, atomic update of several refs, at
the cost of a second structure to replicate and keep consistent with the
objects. Measured on the dev repository's `main` (166 objects): the drive
is 170 db entries (40 KB) and 169 blobs (155 KB); a joining node reading
the root tree received 26 KB. Ref reads are not what costs: object reads
are. A drive is single-writer, so compare-and-swap on a ref is a compare
then a write by the one writer. Revisit when several writers or
multi-ref atomicity are needed.

## 2. Two nodes replicating — done

- `notes/env.md`: Docker runs in the session (daemon started by hand);
  outbound UDP to the public DHT is blocked, UDP inside works.
- `bare-base` (cluster/base): Bare only, on debian:bookworm-slim.
- `mycelium-node`: a node's store on Hyperswarm, replicating its Corestore;
  a private DHT bootstrapped by the seed.
- `cluster/two-nodes.sh`: two Bare nodes in containers; the joiner finds
  the seed over Hyperswarm and reads the repository from its replica,
  lazily. Records in `cluster/runs/`.

## 3. The package repository on Hyperdrive — done, thin path

- `cluster/pkg/build.sh`: six modules, 308 installed folders, 185 package
  instances (each stored once, by tree oid): 2,199 objects, 29 MB loose,
  a 13.4 MB bundle. The seed takes the bundle into its drive in 11 s.
- A deployment is a layout of links: folder to instance (tree oid) in the
  package repository, whose drive key and commit name it. A node reads
  only the trees its layout names (`materialise`, mycelium-node).
- Our modules arrive by hand (staged from the dev tree); third-party
  packages come in once, at the boundary, from npm's install, with
  linux-x64 prebuilds only.
- Laziness: on the dev repository's main (13 MB bundle) a node reading the
  root tree received 25 KB. A node's own modules are nearly the whole
  package repository today, so a booting node receives 22 to 23 MB of it;
  the gain will show once the package repository holds more than one
  node's needs.

## 4. The seed node — done

- `cluster/bootstrap`: a self-contained bootstrap repository (94 MB
  checkout, mostly native addons). The base has Bare only.
- The seed starts from it with the package repository's bundle (the very
  first repository, from the outside world, once). A joining node needs
  only the bootstrap checkout and the seed's key: it obtains the package
  repository, materialises four modules (2,575 files, 68 MB written, 22 MB
  received, 7 s) and starts from them. Record: `cluster/runs/
  2026-10-30-boot-nodes` (a seed and two joining nodes).

## 5. The deployment repository — done, thin path

- `cluster/deployment`: a repository seeded with requests (Seed, Join,
  Status), executed with layer/request's flow; each response records a
  node or the cluster's state, with its unit (states by commit,
  environment: dev commit, bootstrap commit, packages hash). A later
  status request came in with request intake and was executed by a second
  kick: the seed had sent 32 MB to the two joiners. Kept:
  `cluster/runs/2026-10-30-deployment.bundle` (10 KB).
- Its capability/default holds a link (dev commit and path), not a copy:
  the execution code runs from the dev repository at that commit.

## Done, against the request

1. Contract suite and test-run model on a persisted Hyperdrive under Bare,
   through p2p-git's own adapter: yes (r1). The test-run instances
   themselves are still native git repositories; their requests exercise
   the Hyperdrive engine.
2. Two Bare nodes in containers, Hyperswarm, a replicated repository: yes.
3. A node from a plain Bare base through a bootstrap repository, taking
   its modules from the package repository, loaded lazily: yes.
4. A deployment repository brings up a seed and joining nodes and records
   them: yes (one seed, two joining nodes).
5. Every step recorded and rerunnable, metrics at the boundary, kept as
   small runs: the records in `cluster/runs/` and `test-runs/`. The package
   and bootstrap repositories are not kept: they are rebuilt from the dev
   commit, and the records carry their commits and hashes.

## First observations on p2p/boundary

- The outside world comes in once, as bundles: the package repository
  (built with npm and native git on the host) and the first repository on
  a node. Inside, nodes only replicate and read.
- Docker is the outside world's tool: the deployment repository runs on
  the host. Inside the cluster nothing needs it.
- The public DHT is unreachable here; a cluster brings its own (two
  persistent nodes at least). Peers are reachable directly, so no
  holepunching.

## Deviations and open points

- Process: four commits (`21b91bf` to `eee62cc`) went onto `main`
  directly, not through `execute/main`, and were pushed; without
  force-push they stay. `execute/main` was brought level with `main`, and
  every later change went through it.
- mycelium-node has no product repository yet (a new module's repository
  is created by the human): proposed `pear-full-square/mycelium-node`.
- Hypercore decisions (per-package cores or groups, batching): one drive
  holds the whole package repository now. A replica's first read costs
  about 100 ms; materialising reads some 2,500 files in parallel. Numbers
  for one core per package are still to be taken.
- Kept runs are not yet small: r1 is 13 MB, because instances carry their
  modules' node_modules. Next: test-run instances holding links into the
  package repository.
- mycelium-node has no command set for the test-run model (its operations
  are long-running processes); its tests are `npm test` and the cluster
  records.
