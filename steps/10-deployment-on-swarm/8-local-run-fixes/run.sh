#!/bin/sh
# The fixes from the demos' local run, recorded: the checks above, then
# step 10's swarm phases with the shadow check reading the topic in order.
#   sh steps/10-deployment-on-swarm/8-local-run-fixes/run.sh <work-dir>   (from the root, committed)
set -eu
w=$1
f=steps/10-deployment-on-swarm/8-local-run-fixes
d=steps/10-deployment-on-swarm/7-validation/demo.sh
r=$f/record
rm -rf "$w"; mkdir -p "$w"
set --
for c in lockfile missing-deps check-summary; do set -- "$@" "$c=sh $f/check.sh $w $c"; done
for p in genesis auto change shadow stop-swarm; do set -- "$@" "$p=sh $d $w/swarm $r $p"; done
set -- "$@" "unit-haicc-deployment=sh steps/1-mycelium/validation/unit-tests.sh pear-full-square/haicc-deployment"
sh steps/record.sh 10-deployment-on-swarm 8-local-run-fixes "$@"
