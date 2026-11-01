#!/bin/sh
# Step 4's validation: a swarm from zero, end to end. One JSON line per
# phase on stdout; the managers' records copied into <record-dir> (never
# the vault).
#   sh steps/4-genesis/validation/genesis.sh <work-dir> <record-dir> <phase>   (from the root)
# Phases, run in order as separate cases:
#   genesis    the swarm manager: images, network, the master's secret in the
#              vault, its node manager, genesis; the master ready
#   status     p2p-rns asked from the host, as a peer of the swarm
#   read       the master's packages resolved by URI, read lazily from a replica
#   restart    the master restarted by its node manager: a fresh store, the
#              same identity, packages commit and ids
#   stop       a graceful stop; the records collected
set -eu
work=$1
rec=$2
phase=$3
sm=p2p-swarm-manager/cli.js
folder=$work/genesis-swarm
case $phase in
  genesis)
    rm -rf "$work"
    mkdir -p "$work"
    node $sm genesis --swarm=genesis --folder="$folder" --nodes="$work" --vault="$work-vault" --code=. ;;
  status) node $sm status --folder="$folder" ;;
  read) node steps/4-genesis/validation/read.mjs "$folder" p2p-node/package.json ;;
  restart) node $sm restart --folder="$folder" --node=master ;;
  stop)
    out=$(node $sm stop --folder="$folder")
    mkdir -p "$rec/genesis-swarm" "$rec/genesis-master"
    cp "$folder/swarm.json" "$folder/swarm.jsonl" "$rec/genesis-swarm/"
    for f in node.json manager.jsonl node.jsonl state.json; do cp "$work/genesis-master/$f" "$rec/genesis-master/"; done
    [ -s "$work/genesis-master/node.stderr" ] && cp "$work/genesis-master/node.stderr" "$rec/genesis-master/"
    # The swarm record names the vault's folder, not its content; check that
    # no secret reached the records.
    leaked=false
    for k in "$work-vault"/*.key; do grep -rqF "$(cat "$k")" "$rec" && leaked=true; done
    printf '{"stop":%s,"secretInRecords":%s}\n' "$out" "$leaked" ;;
esac
