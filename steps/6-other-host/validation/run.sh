#!/bin/sh
# Step 6's validation, recorded: the changed modules' unit tests, then every
# phase of other-host.sh as a case, in order.
#   sh steps/6-other-host/validation/run.sh <work-dir>   (from the root, committed)
set -eu
w=$1
v=steps/6-other-host/validation
u=steps/1-mycelium/validation/unit-tests.sh
r=$v/record
set -- "unit-p2p-swarm-manager=sh $u p2p-swarm-manager" "unit-p2p-node-manager=sh $u p2p-node-manager"
for p in genesis join-node-1 invite remote-join isolation status request-remote-from-a request-node-1-from-b \
  restart-remote status-after-restart request-remote-after-restart remote-stop status-after-remote-stop \
  request-node-1-after-remote-stop stop records; do
  set -- "$@" "$p=sh $v/other-host.sh $w $r $p"
done
sh steps/record.sh 6-other-host validation "$@"
