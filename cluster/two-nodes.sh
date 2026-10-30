#!/bin/sh
# Two Bare nodes in Docker containers: a seed node serving a repository on
# its Hyperdrive, and a joining node that finds it over Hyperswarm (a
# private DHT, bootstrapped by the seed) and reads from its replica.
#   cluster/two-nodes.sh <bundle> <record-dir> [select-path]...
# Run from the dev repository's root, with the Docker daemon up. The
# repository comes in once, from the outside world, as a bundle. The record
# (record-dir) holds the invocation, both nodes' JSON lines and the step's
# metrics: enough to rerun it (the bundle's refs name its content).
set -eu
bundle=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
record=$2
shift 2
[ $# -gt 0 ] || set -- '/*/*'
src=$(pwd)
net=p2p-cluster subnet=172.30.0
work=$(mktemp -d)
cleanup () {
  docker rm -f seed joiner >/dev/null 2>&1 || true
  docker network rm $net >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT
cleanup; work=$(mktemp -d)
mkdir -p "$record"
t0=$(date +%s%3N)
staged=$(cluster/stage.sh "$work/app")
cluster/base/build.sh >/dev/null
docker network create --subnet $subnet.0/24 $net >/dev/null
mkdir -p "$work/in" && cp "$bundle" "$work/in/repo.bundle"
docker run -d --name seed --network $net --ip $subnet.2 \
  -v "$work/app:/app:ro" -v "$work/in:/in:ro" bare-base \
  /app/mycelium-node/cli.js seed /data/store --bundle=/in/repo.bundle --host=$subnet.2 >/dev/null
key=
for i in $(seq 1 60); do
  key=$(docker logs seed 2>&1 | sed -n 's/.*"event":"serving","key":"\([0-9a-f]*\)".*/\1/p')
  [ -n "$key" ] && break
  sleep 1
done
[ -n "$key" ] || { docker logs seed; echo "seed did not start" >&2; exit 1; }
for path in "$@"; do
  docker run --rm --name joiner --network $net --ip $subnet.3 -v "$work/app:/app:ro" bare-base \
    /app/mycelium-node/cli.js join /data/store "$key" --bootstrap=$subnet.2:49737 --host=$subnet.3 \
    --select="$path" | tee -a "$record/joiner.jsonl"
done
sleep 1
docker logs seed > "$record/seed.jsonl" 2>&1
t1=$(date +%s%3N)
cat > "$record/unit.json" <<JSON
{
  "invocation": "cluster/two-nodes.sh $(basename "$bundle") <record> $*",
  "dev": "$(git -C "$src" rev-parse HEAD)$( [ -z "$(git -C "$src" status --porcelain)" ] || echo '+uncommitted')",
  "bundle": { "name": "$(basename "$bundle")", "bytes": $(wc -c < "$bundle"), "sha256": "$(sha256sum "$bundle" | cut -c1-64)",
    "refs": [$(git bundle list-heads "$bundle" | sed 's/^\(.*\) \(.*\)$/"\2 \1"/' | paste -sd, -)] },
  "image": "bare-base:$(bare --version | sed 's/^v//')",
  "staged": "$staged",
  "docker": "$(docker version --format '{{.Server.Version}}')",
  "key": "$key",
  "ms": $((t1 - t0))
}
JSON
echo "recorded $record"
