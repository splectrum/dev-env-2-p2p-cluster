#!/bin/sh
# Step 9's validation, recorded: the changed and new modules' unit tests,
# then every phase of demo.sh as a case, in order.
#   sh steps/9-click-and-run/8-validation/run.sh <work-dir>   (from the root, committed)
set -eu
w=$1
v=steps/9-click-and-run/8-validation
u=steps/1-mycelium/validation/unit-tests.sh
r=$v/record
rm -rf "$w"
set --
for m in haicc-reconcile haicc-deployment p2p-node-manager p2p-swarm-manager splectral-server splectral-transport splectral-scenario; do
  set -- "$@" "unit-$m=sh $u pear-full-square/$m"
done
for p in lacking check-live start-live ui-live conflict stop-live start-other ui-other teardown-other teardown-live records; do
  set -- "$@" "$p=sh $v/demo.sh $w $r $p"
done
sh steps/record.sh 9-click-and-run 8-validation "$@"
