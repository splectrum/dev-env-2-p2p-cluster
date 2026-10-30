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

## Next

3. The package repository on Hyperdrive. 4. The seed node and the
bootstrap repository. 5. The deployment repository.
