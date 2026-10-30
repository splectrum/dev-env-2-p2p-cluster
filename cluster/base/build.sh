#!/bin/sh
# Build the plain base image (bare-base:<bare version>): Bare's own binary,
# taken from the bare package installed on this host
# (npm install -g bare@1.36.0), on debian:bookworm-slim.
#   cluster/base/build.sh
set -eu
here=$(cd "$(dirname "$0")" && pwd)
version=$(bare --version | sed 's/^v//')
binary=$(dirname "$(npm root -g)/bare/package.json")/node_modules/bare-runtime-linux-x64/bin/bare
ctx=$(mktemp -d)
trap 'rm -rf "$ctx"' EXIT
cp "$here/Dockerfile" "$binary" "$ctx/"
docker build -q -t "bare-base:$version" -t bare-base:latest "$ctx"
