#!/bin/sh
# Probe container-dht: the host side (on the host, with the given runtime)
# and a container from the plain base (bare-base, Bare only) on an internal
# Docker network (no route out), joining the host's DHT at the network's
# gateway address. Prints one JSON line: { host, container }.
#   sh container-dht/run.sh <node|bare>     (from steps/0-probes/)
set -eu
runtime=$1
net=step-0-aux subnet=172.31.0
gateway=$subnet.1 port=49741
here=$(pwd)
out=$(mktemp)
docker network rm $net >/dev/null 2>&1 || true
docker network create --internal --subnet $subnet.0/24 --gateway $gateway $net >/dev/null
cleanup () { docker rm -f step-0-node >/dev/null 2>&1 || true; docker network rm $net >/dev/null 2>&1 || true; rm -f "$out"; }
trap cleanup EXIT
$runtime container-dht/host.mjs $gateway $port > "$out" &
hostpid=$!
for i in $(seq 1 30); do grep -q '"ready"' "$out" && break; sleep 1; done
topic=$(sed -n 's/.*"event":"ready","topic":"\([0-9a-f]*\)".*/\1/p' "$out")
set +e
container=$(docker run --rm --name step-0-node --network $net --ip $subnet.10 \
  --read-only --cap-drop ALL --security-opt no-new-privileges --user 65534:65534 \
  -v "$here:/probe:ro" bare-base /probe/container-dht/node.mjs $gateway:$port "$topic" $subnet.10 2>&1 | tail -1)
set -e
wait $hostpid 2>/dev/null || true
hostlines=$(paste -sd, "$out")
printf '{"runtime":"%s","host":[%s],"container":%s}\n' "$runtime" "$hostlines" "${container:-null}"
