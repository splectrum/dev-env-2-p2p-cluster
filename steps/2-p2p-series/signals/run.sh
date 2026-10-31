#!/bin/sh
# Is a SIGTERM handled? One JSON line: { runner, handled, alive }.
#   sh steps/2-p2p-series/signals/run.sh <node|bare-binary|bare-wrapper|container>   (from the root)
# bare-binary: the Bare runtime's own binary; bare-wrapper: npm's `bare`
# command on the PATH (a Node script spawning the binary); container: the
# binary in bare-base, stopped with docker stop.
set -eu
runner=$1
here=$(cd "$(dirname "$0")" && pwd)
out=$(mktemp)
trap 'rm -f "$out"' EXIT
case $runner in
  node) cmd="node" ;;
  bare-binary) cmd="$(npm root -g)/bare/node_modules/bare-runtime-linux-x64/bin/bare" ;;
  bare-wrapper) cmd="bare" ;;
  container)
    root=$(cd "$here/../../.." && pwd)
    docker run -d --rm --name step-2-signal --read-only --cap-drop ALL --user 65534:65534 \
      -v "$root:/code:ro" bare-base /code/steps/2-p2p-series/signals/signal.mjs >/dev/null
    sleep 2
    docker stop -t 5 step-2-signal >/dev/null &
    line=$(docker logs -f step-2-signal 2>&1 | tail -1)
    wait
    printf '{"runner":"%s","result":%s}\n' "$runner" "$line"
    exit 0 ;;
esac
$cmd "$here/signal.mjs" > "$out" &
pid=$!
sleep 2
kill -TERM $pid
sleep 1
alive=false
if kill -0 $pid 2>/dev/null; then alive=true; kill -9 $pid; fi
wait $pid 2>/dev/null || true
printf '{"runner":"%s","result":%s,"aliveAfterSigterm":%s}\n' "$runner" "$(tail -1 "$out")" "$alive"
