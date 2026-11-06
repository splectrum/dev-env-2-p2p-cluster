#!/bin/sh
# Build the images a node runs from:
#   bare-base:<bare version>   the plain base: debian:bookworm-slim and Bare's
#                              own binary (bare-runtime: the third-party package's,
#                              or the development workspace's)
#   p2p-node:<commit>          the base with the node's code: the modules
#                              (pear-full-square/: mycelium-*, p2p-*, splectral-*, haicc-*) and their one dependency tree,
#                              without development dependencies, this
#                              platform's prebuilds only
#   sh pear-full-square/p2p-node-manager/image/build.sh <code>   prints the node image's tag
# <code> is either
#   - an install folder (the package manager's, with pkgm/installed.json):
#     the code as installed, the image tagged by the installed packages'
#     hashes (p2p-node:pkg-<hash>), Bare's runtime from the third-party
#     package; or
#   - a development repository, from a committed dev state (p2p-node:<commit>).
# The code crosses the boundary here.
set -eu
src=$(cd "$1" && pwd)
here=$(cd "$(dirname "$0")" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
if [ -f "$src/pkgm/installed.json" ]; then
  tag=$(node --input-type=module -e "import { tagOf } from '$here/tag.js'; console.log(tagOf(process.argv[1]))" "$src")
  meta=$src/pkgm/packages/third-party/package.json
  [ -f "$meta" ] || { echo "no third-party package installed in $src" >&2; exit 2; }
  version=$(node -p "require('$meta').pkgm.bare")
  binary=$src/$(node -p "require('$meta').pkgm.runtime")
  mkdir "$work/base" && cp "$here/base.Dockerfile" "$work/base/Dockerfile" && cp "$binary" "$work/base/bare" && chmod 755 "$work/base/bare"
  docker image inspect "bare-base:$version" >/dev/null 2>&1 || docker build -q -t "bare-base:$version" "$work/base" >/dev/null
  if ! docker image inspect "$tag" >/dev/null 2>&1; then
    app=$work/node/app
    mkdir -p "$app"
    # Everything installed but the package manager's own records (pkgm/); tests and
    # Node's addons (Bare loads its own, .bare) left out.
    for d in "$src"/*; do cp -a "$d" "$app/"; done
    rm -rf "$app/pkgm"
    find "$app" -type d -name test -prune -exec rm -rf {} +
    find "$app/node_modules" -name '*.node' -path '*/prebuilds/*' -delete
    rm -rf "$app/node_modules/bare-runtime-"*
    cp "$here/node.Dockerfile" "$work/node/Dockerfile"
    docker build -q --build-arg BASE="bare-base:$version" -t "$tag" "$work/node" >/dev/null
  fi
  echo "$tag"
  exit 0
fi
[ -z "$(git -C "$src" status --porcelain -- . ":!steps/*/*/record/*")" ] || { echo "dev tree has uncommitted changes; commit first" >&2; exit 2; }
commit=$(git -C "$src" rev-parse --short HEAD)
# Bare's runtime from the workspace (bare-runtime, as the third-party package has it).
rt=$src/node_modules/bare-runtime-$(node -p 'process.platform + "-" + process.arch')
version=$(node -p "require('$rt/package.json').version")
binary=$rt/bin/bare
mkdir "$work/base" && cp "$here/base.Dockerfile" "$work/base/Dockerfile" && cp "$binary" "$work/base/bare" && chmod 755 "$work/base/bare"
docker image inspect "bare-base:$version" >/dev/null 2>&1 || docker build -q -t "bare-base:$version" "$work/base" >/dev/null
app=$work/node/app
mkdir -p "$app"
git -C "$src" archive HEAD pear-full-square package.json package-lock.json | tar -x -C "$app"
cp -a "$src/node_modules" "$app/node_modules"
(cd "$app" && npm prune -q --omit=dev --offline --no-audit --no-fund >/dev/null)
platform=$(node -p 'process.platform + "-" + process.arch')
find "$app" -type d -name prebuilds -path '*node_modules*' | while read -r p; do
  for b in "$p"/*; do [ "$(basename "$b")" = "$platform" ] || rm -rf "$b"; done
done
find "$app" -type d -name test -prune -exec rm -rf {} +
rm -rf "$app/node_modules/bare-runtime"*
cp "$here/node.Dockerfile" "$work/node/Dockerfile"
docker build -q --build-arg BASE="bare-base:$version" -t "p2p-node:$commit" "$work/node" >/dev/null
echo "p2p-node:$commit"
