#!/bin/sh
# The haiccing repositories, written by the package manager from this
# repository and pushed: the packages and the demo projects. For a machine
# with push access to github.com/haiccing (the local agent); this
# repository at the commit to publish, installed (npm install at its root:
# the third-party import is taken from its node_modules).
#   sh publish.sh <folder for the haiccing clones> [--no-push]
# Each repository cloned into <folder> if not there (its LICENSE kept),
# written (third-party by the import, the others tested together first:
# nothing is written if a test fails), committed when changed, pushed.
set -eu
dev=$(cd "$(dirname "$0")/../../../.." && pwd)
folder=$(mkdir -p "$1" && cd "$1" && pwd)
push=1; [ "${2:-}" = --no-push ] && push=0
repos="base-package-third-party base-package-mycelium base-package-haicc base-package-pkgm base-package-p2p base-package-splectral base-demo-liveness base-demo-other-host"
commit=$(git -C "$dev" rev-parse --short HEAD)
[ -z "$(git -C "$dev" status --porcelain -- pear-full-square splectral haiccing packages.json package.json package-lock.json)" ] || { echo "uncommitted changes in $dev: commit first"; exit 2; }
for r in $repos; do
  [ -d "$folder/$r/.git" ] || git clone -q "https://github.com/haiccing/$r" "$folder/$r"
done
pkgm="node $dev/pear-full-square/pkgm-base-manager/cli.js"
$pkgm import --dev="$dev" --out="$folder" --quiet >/dev/null
$pkgm write --dev="$dev" --out="$folder" --quiet > "$folder/written.json" || { echo "a package's tests failed: nothing written (see $folder/written.json)"; exit 1; }
for r in $repos; do
  cd "$folder/$r"
  git add -A
  if git diff --cached --quiet; then
    # Committed by an earlier --no-push: still to go out.
    if [ $push = 1 ] && [ -n "$(git rev-list '@{u}..HEAD')" ]; then git push -q origin HEAD; echo "$r: $(git log --oneline -1), pushed (committed earlier)"; else echo "$r: unchanged"; fi
    continue
  fi
  hash=$(node -p "require('./package.json').pkgm.hash.slice(0, 12)")
  git commit -q -m "Written by the package manager from dev-env-2-p2p-cluster $commit (hash $hash)"
  [ $push = 1 ] && git push -q origin HEAD
  echo "$r: $(git log --oneline -1)$([ $push = 1 ] && echo ', pushed')"
done
