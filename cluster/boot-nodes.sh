#!/bin/sh
# Nodes started from the plain base through the bootstrap repository: the
# seed takes the package repository in once, as a bundle; each joining node
# has only the bootstrap checkout and the seed's key, obtains the package
# repository, materialises its modules from it and starts from them.
#   cluster/boot-nodes.sh <bootstrap-repo> <packages-bundle> <record-dir> [joiners]
# Run from the dev repository's root, with the Docker daemon up. The record
# holds the unit (unit.json) and each node's JSON lines, with the metrics.
set -eu
bootrepo=$(cd "$1" && pwd)
bundle=$(cd "$(dirname "$2")" && pwd)/$(basename "$2")
record=$3
joiners=${4:-1}
src=$(pwd)
net=p2p-cluster subnet=172.30.0
work=$(mktemp -d)
names="seed $(seq -f 'node-%g' 1 "$joiners" | tr '\n' ' ')"
cleanup () {
  for n in $names; do docker rm -f "$n" >/dev/null 2>&1 || true; done
  docker network rm $net >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT
cleanup; work=$(mktemp -d)
mkdir -p "$record" "$work/boot" "$work/in"
t0=$(date +%s%3N)
git --git-dir="$bootrepo" archive main | tar -x -C "$work/boot"
cp "$bundle" "$work/in/packages.bundle"
cluster/base/build.sh >/dev/null
docker network create --subnet $subnet.0/24 $net >/dev/null
wait_for () { # <container> <event>: the line once it appears
  for i in $(seq 1 120); do
    line=$(docker logs "$1" 2>&1 | grep "\"event\":\"$2\"" | head -1)
    [ -n "$line" ] && { echo "$line"; return 0; }
    sleep 1
  done
  docker logs "$1" >&2; echo "$1: no $2" >&2; return 1
}
docker run -d --name seed --network $net --ip $subnet.2 -v "$work/boot:/bootstrap:ro" -v "$work/in:/in:ro" \
  bare-base /bootstrap/boot.js seed --bundle=/in/packages.bundle --host=$subnet.2 >/dev/null
key=$(wait_for seed serving | sed 's/.*"key":"\([0-9a-f]*\)".*/\1/')
i=0
for n in $names; do
  [ "$n" = seed ] && continue
  i=$((i + 1))
  ip=$subnet.$((i + 2))
  docker run -d --name "$n" --network $net --ip $ip -v "$work/boot:/bootstrap:ro" \
    bare-base /bootstrap/boot.js join "$key" --bootstrap=$subnet.2:49737 --host=$ip >/dev/null
  wait_for "$n" selected >/dev/null
done
sleep 2
for n in $names; do docker logs "$n" > "$record/$n.jsonl" 2>&1; done
t1=$(date +%s%3N)
cat > "$record/unit.json" <<JSON
{
  "invocation": "cluster/boot-nodes.sh <bootstrap-repo> $(basename "$bundle") <record> $joiners",
  "dev": "$(git -C "$src" rev-parse HEAD)$( [ -z "$(git -C "$src" status --porcelain -- . ':!cluster/runs')" ] || echo '+uncommitted')",
  "bootstrap": "$(git --git-dir="$bootrepo" rev-parse main)",
  "packages": { "bytes": $(wc -c < "$bundle"), "sha256": "$(sha256sum "$bundle" | cut -c1-64)",
    "refs": [$(git bundle list-heads "$bundle" | sed 's/^\(.*\) \(.*\)$/"\2 \1"/' | paste -sd, -)] },
  "image": "bare-base:$(bare --version | sed 's/^v//')",
  "docker": "$(docker version --format '{{.Server.Version}}')",
  "key": "$key",
  "ms": $((t1 - t0))
}
JSON
echo "recorded $record"
