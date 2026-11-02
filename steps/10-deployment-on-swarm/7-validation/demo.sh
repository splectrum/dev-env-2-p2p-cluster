#!/bin/sh
# Step 10's validation: the deployment on the swarm, then the demo projects
# on it. One JSON line per phase.
#   sh steps/10-deployment-on-swarm/7-validation/demo.sh <work-dir> <record-dir> <phase>   (from the root)
# Phases: genesis, manual, auto, change, refused, shadow, stop-swarm,
#         start-live, ui-live, stop-live, start-other, ui-other,
#         teardown-other, teardown-live, records.
set -eu
w=$1
rec=$2
v=steps/10-deployment-on-swarm/7-validation
s=$w/s/hosts-swarm
sm=pear-full-square/p2p-swarm-manager/cli.js
pw=$(npm root -g)
running () { docker ps --format '{{.Names}}' | sort | tr '\n' ' '; }
shadowLog () { node -e "import('./pear-full-square/mycelium-topic/index.js').then(async ({openTopic,folderStorage})=>{ const rs=(await (await openTopic({storage:folderStorage('$s/topics/deployment')})).consume(0)).map(r=>r.value); console.log(JSON.stringify(rs.slice($1).map(v=>({kind:v.kind,commit:(v.commit||'').slice(0,7),what:v.wouldDo||v.done||v.deployment?.nodes||v.error||null})))) })"; }
waitFor () { for i in $(seq 1 150); do sh -c "$1" && return 0; sleep 2; done; return 1; }
case $3 in
  genesis)
    # The swarm with its part handed over at genesis: node-1 wanted.
    rm -rf "$w"; mkdir -p "$w/s"
    node $sm genesis --swarm=hosts --folder=$s --nodes=$w/s --vault=$w/s-vault --code=. --deployment=$v/d1.json > "$w/genesis.json"
    node $sm deployment --folder=$s | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8')).result; console.log(JSON.stringify({ onTheSwarm: r.deployment, commit: r.commit.slice(0,7), running: '$(running)'.trim() }))" ;;
  manual)
    # Manual mode: what the substrate would need, reported; nothing done.
    setsid node $sm watch --folder=$s > "$w/watch-manual.out" 2>&1 < /dev/null &
    waitFor "[ -f $s/watch.pid ]"; sleep 8
    kill "$(cat $s/watch.pid)"; waitFor "[ ! -f $s/watch.pid ]"
    echo "{\"records\":$(shadowLog 0),\"running\":\"$(running)\"}" ;;
  auto)
    # Auto mode: the substrate made to match: node-1 brought up.
    setsid node $sm watch --folder=$s --auto=true > "$w/watch-auto.out" 2>&1 < /dev/null &
    waitFor "docker ps --format '{{.Names}}' | grep -q p2p-hosts-node-1"
    sleep 3; echo "{\"records\":$(shadowLog -1),\"running\":\"$(running)\"}" ;;
  change)
    # A change by request to the swarm: two workers by selection, node-1 out.
    t0=$(date +%s)
    node $sm deploy --folder=$s --deployment=$v/d2.json > "$w/deploy-2.json"
    waitFor "[ \$(docker ps --format '{{.Names}}' | grep -c worker) -ge 2 ] && ! docker ps --format '{{.Names}}' | grep -q node-1"
    sleep 3; echo "{\"records\":$(shadowLog -3),\"running\":\"$(running)\",\"seconds\":$(( $(date +%s)-t0 ))}" ;;
  refused)
    # The master deployed is not a deployment: refused at the boundary, the swarm's unchanged.
    out=$(node $sm deploy --folder=$s --deployment=$v/bad.json || true)
    now=$(node $sm deployment --folder=$s)
    printf '%s\n%s\n' "$out" "$now" | node -e "const [a,b]=require('fs').readFileSync(0,'utf8').trim().split('\n').map(JSON.parse); console.log(JSON.stringify({ refused: a.error, unchanged: b.result.deployment }))" ;;
  shadow)
    # Nodes shadow their managers: each running node holds its manager's state.
    for n in master worker-1 worker-2; do printf '%s ' "$n:$(grep -rh '"kind":"manager-shadowed"' $w/s/hosts-$n/topics/node | tail -1 | grep -o '"status":"[a-z]*"')"; done | node -e "console.log(JSON.stringify({ lastShadowed: require('fs').readFileSync(0,'utf8').trim().split(' ') }))" ;;
  stop-swarm)
    kill "$(cat $s/watch.pid)"; waitFor "[ ! -f $s/watch.pid ]"
    node $sm stop --folder=$s > /dev/null; echo "{\"running\":\"$(running)\"}" ;;
  start-live) sh haicc start base-demo-liveness --work=$w/live ;;
  ui-live) waitFor "docker ps --format '{{.Names}}' | grep -q p2p-hosts-node-1"; NODE_PATH=$pw node steps/9-click-and-run/8-validation/ui.cjs http://127.0.0.1:4400 "$rec/screens" liveness liveness ;;
  stop-live) sh haicc stop base-demo-liveness --work=$w/live ;;
  start-other) sh haicc start base-demo-other-host --work=$w/other ;;
  ui-other) waitFor "docker ps --format '{{.Names}}' | grep -q p2p-hosts-node-1"; NODE_PATH=$pw node steps/9-click-and-run/8-validation/ui.cjs http://127.0.0.1:4400 "$rec/screens" other-host other-host ;;
  teardown-other) sh haicc teardown base-demo-other-host --work=$w/other ;;
  teardown-live) sh haicc teardown base-demo-liveness --work=$w/live ;;
  records)
    mkdir -p "$rec/swarm" "$rec/live" "$rec/other"
    cp -r "$s/topics" "$rec/swarm/"
    for p in live other; do cp -r "$w/$p/deployment" "$w/$p/runs" "$rec/$p/"; cp -r "$w/$p/a/hosts-swarm/topics" "$rec/$p/swarm-topics" 2>/dev/null || true; done
    leaked=false
    for k in $(find "$w" -path '*vault*' -name '*.key' 2>/dev/null); do grep -rqF "$(cat "$k")" "$rec" && leaked=true; done
    rm -rf "$w/s-vault"
    printf '{"secretInRecords":%s,"containersLeft":%s,"networksLeft":%s,"recordFiles":%s}\n' "$leaked" "$(docker ps -a --filter name=p2p-hosts --format x | wc -l)" "$(docker network ls --filter name=p2p-hosts --format x | wc -l)" "$(find "$rec" -type f | wc -l)" ;;
esac
