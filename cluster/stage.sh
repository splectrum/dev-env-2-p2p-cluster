#!/bin/sh
# Stage what a node runs, from the dev repository's working tree: the
# modules a node uses (mycelium-uri, mycelium-xpath, mycelium-git,
# mycelium-node) as plain folders, without development dependencies, and
# native addons with only the linux-x64 prebuilds (the containers').
#   cluster/stage.sh <dir>
# Run from the dev repository's root. Prints the staged size.
set -eu
dir=$1
src=$(pwd)
rm -rf "$dir"
mkdir -p "$dir"
for m in mycelium-uri mycelium-xpath mycelium-git mycelium-node; do
  cp -r "$src/$m" "$dir/"
  rm -rf "$dir/$m/test" "$dir/$m/fixture" "$dir/$m/fixture.git"
  [ -d "$dir/$m/node_modules" ] || continue
  (cd "$dir/$m" && npm prune -q --omit=dev --offline --no-audit --no-fund >/dev/null)
  find "$dir/$m/node_modules" -type d -name prebuilds | while read -r p; do
    for b in "$p"/*; do [ "$(basename "$b")" = linux-x64 ] || rm -rf "$b"; done
  done
done
du -sh "$dir" | cut -f1
