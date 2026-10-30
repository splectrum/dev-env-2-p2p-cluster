#!/bin/sh
# Build the bootstrap repository: a self-contained git repository whose
# checkout is all a node needs besides Bare. Its main holds boot.js,
# node.json, its own few dependencies (node_modules) and the modules a
# node first runs (cluster/stage.sh), as plain folders.
#   cluster/bootstrap/build.sh <repo-dir>
# Run from the dev repository's root. A node gets a checkout (the base has
# no git): git -C <repo-dir> archive main | tar -x -C <dir>.
set -eu
repo=$1
src=$(pwd)
here=$src/cluster/bootstrap
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
cluster/stage.sh "$stage" >/dev/null
cp "$here/boot.js" "$here/node.json" "$here/package.json" "$stage/"
(cd "$stage" && npm install -q --omit=dev --no-audit --no-fund --no-package-lock >/dev/null)
rm -rf "$stage/node_modules/.package-lock.json"
[ -d "$repo" ] || git init -q --bare -b main "$repo"
export GIT_AUTHOR_NAME=bootstrap GIT_AUTHOR_EMAIL=bootstrap@localhost
export GIT_COMMITTER_NAME=bootstrap GIT_COMMITTER_EMAIL=bootstrap@localhost
index=$(mktemp)
rm -f "$index"
GIT_INDEX_FILE=$index git --git-dir="$repo" --work-tree="$stage" -c core.excludesFile=/dev/null add -A -f .
tree=$(GIT_INDEX_FILE=$index git --git-dir="$repo" write-tree)
rm -f "$index"
parent=$(git --git-dir="$repo" rev-parse -q --verify refs/heads/main || true)
commit=$(git --git-dir="$repo" commit-tree "$tree" ${parent:+-p "$parent"} \
  -m "Bootstrap from dev commit $(git -C "$src" rev-parse --short HEAD)")
git --git-dir="$repo" update-ref refs/heads/main "$commit"
echo "$commit"
