#!/bin/sh
# Step 7's validation, recorded: the changed and new modules' unit tests,
# then every phase of demo.sh as a case, in order.
#   sh steps/7-splectral/10-validation/run.sh <work-dir>   (from the root, committed)
set -eu
w=$1
v=steps/7-splectral/10-validation
u=steps/1-mycelium/validation/unit-tests.sh
r=$v/record
set --
for m in mycelium-uri mycelium-topic p2p-rns p2p-mrepo p2p-node p2p-node-manager p2p-swarm-manager splectral-contract splectral-model splectral-transport splectral-server splectral-scenario splectral-p2p-observer splectral-p2p-watchers; do
  set -- "$@" "unit-$m=sh $u $m"
done
for p in swarm config serve ui-live unserve stop replay ui-replay unreplay records; do
  set -- "$@" "$p=sh $v/demo.sh $w $r $p"
done
sh steps/record.sh 7-splectral 10-validation "$@"
