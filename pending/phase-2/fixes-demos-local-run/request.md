# Request: fixes from the demos' local run

From the human's local run of the demos (`main:steps/9-click-and-run/demos-local-run.md`,
findings 1 to 4 and 7). Small fixes to steps 9 and 10, recorded with a
short check.

1. `sh haicc` in a clone whose dependencies do not resolve (an existing
   clone after the move to `<org>/<repo>`): say so, with what to do
   (`demos.md` section 2), instead of failing on a missing package.
2. `package-lock.json` without the old top-level folders' entries.
3. `demos.md`: in an existing clone, the old top-level folders can be
   removed.
4. The readable summary says when the machine is fine, and that a
   project not yet deployed is deployed by `start`.
5. Step 10's `shadow` check reads the topic in its order, not the files
   in the filesystem's.

## Done

Recorded in `main:steps/10-deployment-on-swarm/8-local-run-fixes/`.
