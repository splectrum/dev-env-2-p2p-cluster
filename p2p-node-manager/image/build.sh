#!/bin/sh
# Build the images a node runs from:
#   bare-base:<bare version>   the plain base: debian:bookworm-slim and Bare's
#                              own binary (from the bare package on this host)
#   p2p-node:<commit>          the base with the node's code: the modules
#                              (mycelium-*, p2p-*) and their dependency tree,
#                              without development dependencies, this
#                              platform's prebuilds only
#   sh p2p-node-manager/image/build.sh <dev-repository>   prints the node image's tag
# The code crosses the boundary here, from a committed dev state.
set -eu
src=$(cd "$1" && pwd)
here=$(cd "$(dirname "$0")" && pwd)
[ -z "$(git -C "$src" status --porcelain -- . ":!steps/*/*/record/*")" ] || { echo "dev tree has uncommitted changes; commit first" >&2; exit 2; }
commit=$(git -C "$src" rev-parse --short HEAD)
version=$(bare --version | sed 's/^v//')
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
binary=$(npm root -g)/bare/node_modules/bare-runtime-linux-x64/bin/bare
mkdir "$work/base" && cp "$here/base.Dockerfile" "$work/base/Dockerfile" && cp "$binary" "$work/base/bare"
docker image inspect "bare-base:$version" >/dev/null 2>&1 || docker build -q -t "bare-base:$version" "$work/base" >/dev/null
app=$work/node/app
mkdir -p "$app"
git -C "$src" archive HEAD $(cd "$src" && ls -d mycelium-* p2p-* splectral-* package.json package-lock.json) | tar -x -C "$app"
for m in "$app"/mycelium-*; do
  [ -d "$src/$(basename "$m")/node_modules" ] && cp -a "$src/$(basename "$m")/node_modules" "$m/"
  [ -d "$m/node_modules" ] && (cd "$m" && npm prune -q --omit=dev --offline --no-audit --no-fund >/dev/null)
done
cp -a "$src/node_modules" "$app/node_modules"
(cd "$app" && npm prune -q --omit=dev --offline --no-audit --no-fund >/dev/null)
platform=$(node -p 'process.platform + "-" + process.arch')
find "$app" -type d -name prebuilds -path '*node_modules*' | while read -r p; do
  for b in "$p"/*; do [ "$(basename "$b")" = "$platform" ] || rm -rf "$b"; done
done
find "$app" -type d -name test -prune -exec rm -rf {} +
cp "$here/node.Dockerfile" "$work/node/Dockerfile"
docker build -q --build-arg BASE="bare-base:$version" -t "p2p-node:$commit" "$work/node" >/dev/null
echo "p2p-node:$commit"
