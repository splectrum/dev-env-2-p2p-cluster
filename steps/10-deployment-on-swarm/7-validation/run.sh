#!/bin/sh
# Step 10's validation, recorded: the changed modules' unit tests, then
# every phase of demo.sh as a case, in order.
#   sh steps/10-deployment-on-swarm/7-validation/run.sh <work-dir>   (from the root, committed)
set -eu
w=$1
v=steps/10-deployment-on-swarm/7-validation
u=steps/1-mycelium/validation/unit-tests.sh
r=$v/record
set --
for m in p2p-node p2p-node-manager p2p-swarm-manager haicc-reconcile splectral-p2p-observer; do
  set -- "$@" "unit-$m=sh $u pear-full-square/$m"
done
for p in genesis manual auto change refused shadow stop-swarm start-live ui-live stop-live start-other ui-other teardown-other teardown-live records; do
  set -- "$@" "$p=sh $v/demo.sh $w $r $p"
done
sh steps/record.sh 10-deployment-on-swarm 7-validation "$@"
