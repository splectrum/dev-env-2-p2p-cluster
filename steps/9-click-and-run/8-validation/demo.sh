#!/bin/sh
# Step 9's validation: the demo projects, as a person runs them (sh haicc),
# watched by a headless browser (ui.cjs). One JSON line per phase.
#   sh steps/9-click-and-run/8-validation/demo.sh <work-dir> <record-dir> <phase>   (from the root)
# Phases: lacking, check-live, start-live, ui-live, conflict, stop-live,
#         start-other, ui-other, teardown-other, teardown-live, records.
set -eu
w=$1
rec=$2
v=steps/9-click-and-run/8-validation
live=$w/live other=$w/other
d=pear-full-square/haicc-deployment/cli.js
pw=$(npm root -g)
json () { node -e "$1" ; }
case $3 in
  lacking)
    # A machine lacking things: the check says what, with hints, and makes nothing.
    port=4499
    node -e "require('net').createServer().listen($port,'127.0.0.1')" & holder=$!
    sleep 0.5
    out=$(node pear-full-square/haicc-reconcile/cli.js check $v/lacking.json || true)
    kill $holder
    printf '%s' "$out" | json "const r=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(JSON.stringify({ ok: r.ok, statuses: Object.fromEntries(r.result.map(x => [x.name, x.status])), hints: r.result.filter(x => x.hint).map(x => x.name + ': ' + x.hint), made: require('fs').existsSync('$v/never-made') }))" ;;
  check-live)
    # Before anything: the machine's needs met; what deploying would make.
    node $d status haiccing/base-demo-liveness/project.json --work=$live | json "const r=JSON.parse(require('fs').readFileSync(0,'utf8')); const c=r.result.check; console.log(JSON.stringify({ machineMet: c.filter(x => ['os','docker','nodejs','bare','data-plane','management-plane','udp-to-host','ui-port'].includes(x.name)).every(x => x.status === 'met'), toMake: c.filter(x => x.status !== 'met').map(x => x.name) }))" ;;
  start-live) sh haicc start base-demo-liveness --work=$live ;;
  ui-live) NODE_PATH=$pw node $v/ui.cjs http://127.0.0.1:4400 "$rec/screens" liveness liveness ;;
  conflict)
    # The other project while this one runs: refused, saying why; nothing of the running one touched.
    before=$(docker ps --format '{{.Names}}' | sort | tr '\n' ' ')
    out=$(node $d start haiccing/base-demo-other-host/project.json --work=$other || true)
    after=$(docker ps --format '{{.Names}}' | sort | tr '\n' ' ')
    printf '%s' "$out" | json "const r=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(JSON.stringify({ refused: !r.ok, why: r.result.failed.map(f => f.name + ': ' + f.hint), untouched: '$before' === '$after', running: '$after'.trim() }))" ;;
  stop-live) sh haicc stop base-demo-liveness --work=$live ;;
  start-other) sh haicc start base-demo-other-host --work=$other ;;
  ui-other) NODE_PATH=$pw node $v/ui.cjs http://127.0.0.1:4400 "$rec/screens" other-host other-host ;;
  teardown-other) sh haicc teardown base-demo-other-host --work=$other ;;
  teardown-live) sh haicc teardown base-demo-liveness --work=$live ;;
  records)
    # What a teardown leaves: the records (never a vault). Checked for secrets.
    for p in live other; do
      mkdir -p "$rec/$p"
      cp -r "$w/$p/deployment" "$w/$p/runs" "$rec/$p/"
    done
    leaked=false
    for k in $(find "$w" -path '*vault*' -name '*.key' 2>/dev/null); do grep -rqF "$(cat "$k")" "$rec" && leaked=true; done
    printf '{"secretInRecords":%s,"vaultsLeft":%s,"containersLeft":%s,"networksLeft":%s,"recordFiles":%s,"leftInWork":"%s"}\n' "$leaked" "$(find "$w" -type d -name '*vault' | wc -l)" "$(docker ps -a --filter name=p2p-hosts --format x | wc -l)" "$(docker network ls --filter name=p2p-hosts --format x | wc -l)" "$(find "$rec" -type f | wc -l)" "$(ls "$w/live" | tr '\n' ' ')" ;;
esac
