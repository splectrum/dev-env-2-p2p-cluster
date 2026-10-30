#!/bin/sh
# Seed a deployment repository, with repo/seed (mycelium-repo): main (a
# readme), pending/default with the given requests (default: seed,
# join-node-1, join-node-2, status from cluster/deployment/requests),
# execute/main, and capability/default holding a link to the code that
# executes it (link.json: the dev repository's commit and path), deployed
# with layer/deploy. Run from the dev repository's root, committed.
#   cluster/deployment/seed.sh <repo> [request-dir]...
set -eu
repo=$1
shift
[ $# -gt 0 ] || set -- $(ls -d cluster/deployment/requests/*)
src=$(pwd)
[ -e "$repo" ] && { echo "exists: $repo" >&2; exit 2; }
[ -z "$(git -C "$src" status --porcelain -- . ':!cluster/runs')" ] || { echo "dev tree has uncommitted changes; commit first" >&2; exit 2; }
commit=$(git -C "$src" rev-parse HEAD)
t=$(mktemp -d)
trap 'rm -rf "$t"' EXIT
mkdir -p "$t/template/main" "$t/template/pending/default/pending" "$t/capability"
printf '# Deployment repository\n\nThe P2P cluster: its nodes, their state and their metrics, as responses\nto requests (responses/). Seeded from dev repository commit %s.\n' "$(echo $commit | cut -c1-7)" > "$t/template/main/readme.md"
for req in "$@"; do cp -r "$req" "$t/template/pending/default/pending/$(basename "$req")"; done
printf '{\n  "repository": "splectrum/dev-env-2-p2p-cluster",\n  "commit": "%s",\n  "path": "cluster/deployment/execute.js"\n}\n' "$commit" > "$t/capability/link.json"
node --input-type=module -e "
import { seed } from '$src/mycelium-repo/index.js'
import { deploy } from '$src/mycelium-layer/index.js'
import { nativeBackend } from '$src/mycelium-git/index.js'
const [dir, template, cap, source] = process.argv.slice(1)
const author = { name: 'deployment', email: 'deployment@localhost' }
const backend = nativeBackend(dir)
await seed({ backend, template, source, author })
await deploy({ backend, layer: 'capability/default', folder: cap, message: 'Deploy the link to the execution code', author })
" "$repo" "$t/template" "$t/capability" "dev commit $(echo $commit | cut -c1-7)"
echo "seeded $repo"
