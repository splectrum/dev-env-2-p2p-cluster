#!/bin/sh
# Step 8's validation: the liveness scenario as a Splectral demo, live,
# then replayed; watched by a headless browser (ui.cjs). One JSON line per
# phase.
#   sh steps/8-liveness/6-validation/demo.sh <work-dir> <record-dir> <phase>   (from the root)
# Phases: swarm, config, serve, ui-live, unserve, stop, replay, ui-replay,
#         unreplay, liveness, records.
set -eu
w=$1
rec=$2
v=steps/8-liveness/6-validation
a=$w/a
sm=p2p-swarm-manager/cli.js
port=4400 rport=4401
exts='"../splectral-p2p-watchers", "../splectral-p2p-actions", "../splectral-scenario", "../splectral-timeline", "../splectral-replay", "../base-view-map", "../base-demo-liveness"'
pw=$(npm root -g)
serve () {
  setsid node splectral-server/cli.js --config="$1" > "$2" 2>&1 < /dev/null &
  echo $! > "$3"
  for i in $(seq 1 60); do grep -q listening "$2" 2>/dev/null && break; sleep 0.5; done
  tail -1 "$2"
}
case $3 in
  swarm)
    rm -rf "$w"; mkdir -p "$a"
    node $sm genesis --swarm=hosts --folder="$a/hosts-swarm" --nodes="$a" --vault="$a-vault" --code=. > "$w/genesis.json"
    node $sm join --folder="$a/hosts-swarm" --node=node-1 ;;
  config)
    cat > "$w/splectral.json" <<JSON
{ "port": $port, "runs": "runs",
  "extensions": [$(echo "$exts" | sed "s|\"\.\./|\"$(pwd)/|g")],
  "sources": [ { "kind": "p2p-host", "host": "host-a", "folder": "$a" } ],
  "hosts": { "host-a": { "folder": "$a" } } }
JSON
    node -e "const c=require('$w/splectral.json'); console.log(JSON.stringify({ sources: c.sources.length, extensions: c.extensions.length, hosts: Object.keys(c.hosts) }))" ;;
  serve) serve "$w/splectral.json" "$w/server.out" "$w/server.pid" ;;
  ui-live) NODE_PATH=$pw node $v/ui.cjs live "http://127.0.0.1:$port" "$rec/screens" ;;
  unserve|unreplay)
    f=$w/server.pid; [ "$3" = unreplay ] && f=$w/replay.pid
    kill "$(cat "$f")"; sleep 1; echo '{"stopped":true}' ;;
  stop) node $sm stop --folder="$a/hosts-swarm" ;;
  replay)
    cat > "$w/replay.json" <<JSON
{ "port": $rport,
  "extensions": [$(echo "$exts" | sed "s|\"\.\./|\"$(pwd)/|g")],
  "sources": [ { "kind": "replay", "speed": 20, "maxGap": 400, "sources": [
    { "kind": "p2p-host", "host": "host-a", "folder": "$a" },
    { "kind": "file", "path": "$w/runs/scenario-liveness", "holds": "splectral/world" } ] } ] }
JSON
    serve "$w/replay.json" "$w/replay.out" "$w/replay.pid" ;;
  ui-replay) NODE_PATH=$pw node $v/ui.cjs replay "http://127.0.0.1:$rport" "$rec/screens" ;;
  liveness) node $v/liveness.mjs "$w" ;;
  records)
    # The topics (never a vault) and the runs; checked for secrets.
    mkdir -p "$rec/host-a"
    for d in "$a"/*/; do n=$(basename "$d"); mkdir -p "$rec/host-a/$n"; cp -r "$d/topics" "$rec/host-a/$n/"; done
    cp -r "$w/runs" "$rec/"
    leaked=false
    for k in "$a-vault"/*.key; do grep -rqF "$(cat "$k")" "$rec" && leaked=true; done
    p2pInApps=$(grep -rlE "p2p-|hypercore|hyperswarm" base-view-map/*.js base-demo-liveness/*.json 2>/dev/null | wc -l)
    printf '{"secretInRecords":%s,"containersLeft":%s,"networksLeft":%s,"recordFiles":%s,"appFilesNamingP2p":%s}\n' "$leaked" "$(docker ps -a --filter name=p2p-hosts --format x | wc -l)" "$(docker network ls --filter name=p2p-hosts --format x | wc -l)" "$(find "$rec" -type f | wc -l)" "$p2pInApps" ;;
esac
