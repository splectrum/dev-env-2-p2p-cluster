#!/bin/sh
# Step 8's validation, recorded: the changed and new modules' unit tests,
# then every phase of demo.sh as a case, in order.
#   sh steps/8-liveness/6-validation/run.sh <work-dir>   (from the root, committed)
set -eu
w=$1
v=steps/8-liveness/6-validation
u=steps/1-mycelium/validation/unit-tests.sh
r=$v/record
set --
for m in p2p-rns p2p-node splectral-contract splectral-model splectral-scenario splectral-server splectral-p2p-watchers; do
  set -- "$@" "unit-$m=sh $u $m"
done
for p in swarm config serve ui-live unserve liveness stop replay ui-replay unreplay records; do
  set -- "$@" "$p=sh $v/demo.sh $w $r $p"
done
sh steps/record.sh 8-liveness 6-validation "$@"
