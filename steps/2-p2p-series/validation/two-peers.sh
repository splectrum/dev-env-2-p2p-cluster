#!/bin/sh
# Step 2's validation, two peers. Prints one JSON line: { case, serve, join }.
#   sh steps/2-p2p-series/validation/two-peers.sh <case> <record-dir>    (from the root)
# Cases:
#   node            both peers on the host, on Node
#   bare            both peers on the host, on Bare (the runtime binary itself:
#                   npm's `bare` wrapper suppresses signals)
#   container       the first peer on the host (Bare), the second in a
#                   hardened container from bare-base on an internal network
# Stores live in RAM (/dev/shm on the host, a tmpfs in the container). Each
# peer's audit (every module's events) is written to the record folder.
set -eu
case=$1
mkdir -p "$2"
rec=$(cd "$2" && pwd)
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../../.." && pwd)
bare=$(npm root -g)/bare/node_modules/bare-runtime-linux-x64/bin/bare
serveout=$(mktemp)
net=step-2-aux subnet=172.32.0
cleanup () {
  docker rm -f step-2-peer >/dev/null 2>&1 || true
  [ "$case" = container ] && docker network rm $net >/dev/null 2>&1 || true
  rm -f "$serveout"
}
trap cleanup EXIT
case $case in
  node) srt=node; host=127.0.0.1; port=49831 ;;
  bare) srt=$bare; host=127.0.0.1; port=49832 ;;
  container) srt=$bare; host=$subnet.1; port=49833
    docker network rm $net >/dev/null 2>&1 || true
    docker network create --internal --subnet $subnet.0/24 --gateway $host $net >/dev/null ;;
  *) echo "unknown case: $case" >&2; exit 2 ;;
esac
$srt "$here/peer.mjs" serve /dev/shm/step-2-serve-$case $host $port "$rec/$case-serve-audit.jsonl" > "$serveout" &
pid=$!
for i in $(seq 1 30); do grep -q '"ready"' "$serveout" && break; sleep 1; done
key=$(sed -n 's/.*"event":"ready","key":"\([0-9a-f]*\)".*/\1/p' "$serveout")
if [ "$case" = container ]; then
  # The container runs as an unprivileged user: it gets its audit file only,
  # created here, writable.
  : > "$rec/$case-join-audit.jsonl"
  chmod 0666 "$rec/$case-join-audit.jsonl"
  join=$(docker run --rm --name step-2-peer --network $net --ip $subnet.10 \
    --read-only --cap-drop ALL --security-opt no-new-privileges --user 65534:65534 \
    --memory 512m --memory-swap 512m --ulimit core=0 \
    --tmpfs /data:rw,size=64m,mode=1777 -v "$root:/code:ro" -v "$rec/$case-join-audit.jsonl:/record/$case-join-audit.jsonl" \
    bare-base /code/steps/2-p2p-series/validation/peer.mjs join /data/store $subnet.10 $host:$port "$key" /record/$case-join-audit.jsonl 2>&1 | tail -1)
else
  join=$($srt "$here/peer.mjs" join /dev/shm/step-2-join-$case $host $host:$port "$key" "$rec/$case-join-audit.jsonl" | tail -1)
fi
wait $pid || true
serve=$(grep '"done"' "$serveout" || echo null)
printf '{"case":"%s","serve":%s,"join":%s}\n' "$case" "$serve" "${join:-null}"
