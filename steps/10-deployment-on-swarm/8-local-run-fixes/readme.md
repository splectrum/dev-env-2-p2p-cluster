# Fixes from the demos' local run

Request: `pending/phase-2/fixes-demos-local-run/request.md` (`7478bb5`).
From `steps/9-click-and-run/demos-local-run.md`, findings 1 to 4 and 7.

**Done** (`6e92bdf`):
1. `sh haicc` checks that the dependencies resolve for this layout and,
   if not, says to run `demos.md` section 2 (exit 2) instead of failing on
   a missing package.
2. `package-lock.json`: the 21 entries of the old top-level folders gone
   (166 lines, as the human's npm 11 found); `npm install` leaves it
   unchanged.
3. `demos.md`: an existing clone from before step 9 runs section 2 again,
   and may remove the old top-level folders.
4. The readable summary: `machine: all 8 met` (or `n of 8`), and for a
   project not deployed yet "not deployed yet (start deploys it)", its
   parts listed as `to make`.
5. Step 10's `shadow` check reads each node's topic in its order
   (`mycelium-topic`), not the record files in the filesystem's.

**Findings** (record of 2026-11-04, `record/`; 9 cases, all exit 0): the
lockfile unchanged after `npm install`, no extraneous entry; the missing
dependency said, exit 2; the check's first lines as above; step 10's swarm
phases as before (genesis, auto, change: two workers up and node-1
stopped), the shadow check now `running` for master, worker-1 and
worker-2; nothing left running; haicc-deployment's unit test passes.

**Products**: `haicc-deployment` (`human.js`) merged; see `notes/products.md`.
