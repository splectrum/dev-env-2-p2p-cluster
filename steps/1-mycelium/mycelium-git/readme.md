# Part: mycelium-git

**Scope.** Back to its backend contract over a given filesystem.

- Gone: `openHyperdrive` (`lib/hyperdrive.js`, the `mycelium-git/hyperdrive`
  export), the CLI's Hyperdrive engine and its `import`, the command sets
  `test/commands-hyperdrive.txt` and `test/commands-bare-hyperdrive.txt`
  and their fixture `test/fixture-hyperdrive.sh`. The CLI and
  `test/variants.js` are as they were before the first build.
- Corestore and Hyperdrive are development dependencies again, for the
  contract suite's run on a drive (`test/hyperdrive.test.js`), now through
  p2p-git's own adapter directly (`createFs` from `p2p-git/hyperdrive-fs`).
  rocksdb-native and the rest of the Hypercore stack go with them: they are
  not deployed.
- The engine adapters stay, p2p-git's included: mycelium-git uses p2p-git
  as an engine and knows nothing of Hypercore.
- p2p-git is `github:pear-full-square/p2p-git#d7d154d` (moved from
  `bare-for-pear`; the same commit).
- A new id: `64072bc6-cb98-4383-9d48-480f5d119889` (was
  `a5371baf-7c0c-4906-afaa-273a604861e9`).

The Hyperdrive engine's command sets come back in step 3, where
repositories live on the p2p layer and test-run instances run on
Hypercore.

**Validated** by `../validation/`.
