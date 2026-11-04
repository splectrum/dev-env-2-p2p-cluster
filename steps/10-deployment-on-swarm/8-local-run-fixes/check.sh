#!/bin/sh
# The fixes from the demos' local run, checked. One JSON line per case.
#   sh steps/10-deployment-on-swarm/8-local-run-fixes/check.sh <work-dir> <case>   (from the root)
# Cases: lockfile, missing-deps, check-summary.
set -eu
w=$1
case $2 in
  lockfile)
    # npm install leaves the committed lockfile as it is (no old folders' entries).
    PUPPETEER_SKIP_DOWNLOAD=1 npm install --no-audit --no-fund >/dev/null 2>&1
    changed=$(git diff --stat package-lock.json | wc -l)
    extraneous=$(node -e "console.log(Object.values(require('./package-lock.json').packages).filter(v=>v.extraneous).length)")
    printf '{"lockfileChanged":%s,"extraneous":%s}\n' "$([ "$changed" -eq 0 ] && echo false || echo true)" "$extraneous" ;;
  missing-deps)
    # Dependencies not resolving (as in a clone from before the move): said, with what to do.
    mv node_modules/p2p-dht node_modules/.p2p-dht-hidden
    set +e; out=$(sh haicc check base-demo-liveness --work=$w/live 2>&1); code=$?; set -e
    mv node_modules/.p2p-dht-hidden node_modules/p2p-dht
    printf '%s' "$out" | node -e "console.log(JSON.stringify({ exit: $code, said: require('fs').readFileSync(0,'utf8').trim() }))" ;;
  check-summary)
    # Before anything: the machine all met, the project not deployed yet.
    set +e; out=$(sh haicc check base-demo-liveness --work=$w/live 2>&1); set -e
    printf '%s' "$out" | node -e "console.log(JSON.stringify({ firstLines: require('fs').readFileSync(0,'utf8').split('\n').slice(0,3) }))" ;;
esac
