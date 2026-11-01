#!/bin/sh
# Step 5's validation: a node joining a swarm, end to end. One JSON line per
# phase; the managers' records copied into <record-dir> (never the vault).
#   sh steps/5-node-joining/validation/join.sh <work-dir> <record-dir> <phase>   (from the root)
# Phases, each a case, in order: genesis, join, status, request-node-1,
# request-master, restart-node-1, status-after-restart, request-after-restart,
# stop.
set -eu
work=$1
rec=$2
phase=$3
sm=p2p-swarm-manager/cli.js
folder=$work/joining-swarm
case $phase in
  genesis)
    rm -rf "$work" "$work-vault"
    mkdir -p "$work"
    node $sm genesis --swarm=joining --folder="$folder" --nodes="$work" --vault="$work-vault" --code=. ;;
  join) node $sm join --folder="$folder" --node=node-1 ;;
  status|status-after-restart) node $sm status --folder="$folder" ;;
  request-node-1) node steps/5-node-joining/validation/request.mjs "$folder" node-1 status-from-host ;;
  request-master) node steps/5-node-joining/validation/request.mjs "$folder" master status-from-host ;;
  request-after-restart) node steps/5-node-joining/validation/request.mjs "$folder" node-1 status-after-restart ;;
  restart-node-1) node $sm restart --folder="$folder" --node=node-1 ;;
  stop)
    out=$(node $sm stop --folder="$folder")
    mkdir -p "$rec/joining-swarm"
    cp "$folder/swarm.json" "$folder/swarm.jsonl" "$rec/joining-swarm/"
    for n in master node-1; do
      mkdir -p "$rec/joining-$n"
      for f in node.json manager.jsonl node.jsonl state.json; do cp "$work/joining-$n/$f" "$rec/joining-$n/"; done
      [ -s "$work/joining-$n/node.stderr" ] && cp "$work/joining-$n/node.stderr" "$rec/joining-$n/"
    done
    leaked=false
    for k in "$work-vault"/*.key; do grep -rqF "$(cat "$k")" "$rec" && leaked=true; done
    printf '{"stop":%s,"secretInRecords":%s}\n' "$out" "$leaked" ;;
esac
