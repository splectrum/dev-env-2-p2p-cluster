#!/bin/sh
# Record a probe part: run its cases and write its record.
#   steps/0-probes/record.sh <part> <case-name>=<command> ...
# Run from steps/0-probes/, committed (the unit names the commit). Each case
# is a command printing one JSON line; record/results.jsonl gets one line
# per case ({ case, exit, ms, result }), record/unit.json the invocation,
# the states by commit, the environment and the nondeterministic inputs.
set -eu
part=$1
shift
here=$(pwd)
mkdir -p "$part/record"
results=$here/$part/record/results.jsonl
: > "$results"
started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
for c in "$@"; do
  name=${c%%=*}
  cmd=${c#*=}
  t0=$(date +%s%3N)
  set +e
  out=$(sh -c "$cmd" 2>"$here/$part/record/$name.stderr")
  code=$?
  set -e
  t1=$(date +%s%3N)
  [ -s "$here/$part/record/$name.stderr" ] || rm -f "$here/$part/record/$name.stderr"
  line=$(printf '%s\n' "$out" | tail -1)
  printf '{"case":"%s","command":"%s","exit":%s,"ms":%s,"result":%s}\n' \
    "$name" "$(printf '%s' "$cmd" | sed 's/"/\\"/g')" "$code" "$((t1 - t0))" "${line:-null}" >> "$results"
done
dev=$(git rev-parse HEAD)$( [ -z "$(git status --porcelain -- . ":!$part/record")" ] || echo '+uncommitted')
v() { node -p "require('./node_modules/$1/package.json').version" 2>/dev/null || echo null; }
cat > "$here/$part/record/unit.json" <<JSON
{
  "invocation": "steps/0-probes/record.sh $part $(printf '%s ' "$@" | sed 's/"/\\"/g')",
  "state": { "dev": "$dev", "pendingDefault": "$(git rev-parse --short origin/pending/default)" },
  "environment": {
    "node": "$(node --version)",
    "bare": "$(bare --version)",
    "os": "$(uname -sr)",
    "docker": "$(docker info --format '{{.ServerVersion}}' 2>/dev/null | grep . || echo none)",
    "modules": { "corestore": "$(v corestore)", "hypercore": "$(v hypercore)", "hypercore-storage": "$(v hypercore-storage)", "hyperdrive": "$(v hyperdrive)", "hyperswarm": "$(v hyperswarm)", "hyperdht": "$(v hyperdht)" }
  },
  "nondeterministic": { "started": "$started", "finished": "$(date -u +%Y-%m-%dT%H:%M:%SZ)" }
}
JSON
node -e "JSON.parse(require(\"fs\").readFileSync(process.argv[1]))" "$here/$part/record/unit.json"
echo "recorded $part"
