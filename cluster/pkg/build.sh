#!/bin/sh
# The package repository, built at the boundary: every module (mycelium-*)
# staged (cluster/stage.sh) and imported (pkg/import.js), then bundled: the
# form in which it comes in to the seed node, once.
#   cluster/pkg/build.sh <repo-dir> <bundle-file>
# Run from the dev repository's root. Imports into an existing repository
# add a commit; instances already there are not stored again.
set -eu
repo=$1
bundle=$2
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
modules=$(ls -d mycelium-*)
cluster/stage.sh "$stage" $modules >/dev/null
node cluster/pkg/import.js "$repo" $(for m in $modules; do echo "$stage/$m"; done)
git --git-dir="$repo" bundle create -q "$bundle" main
