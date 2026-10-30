#!/bin/sh
# Build the test repository on a persisted Hyperdrive: the native fixture
# (test/fixture.sh) at <dir>.git, imported into the Corestore at <dir>
# with the given runtime, so the oids are the fixture's.
#   sh test/fixture-hyperdrive.sh <dir> <node|bare>
set -eu
dir=$1
runtime=$2
rm -rf "$dir" "$dir.git"
sh test/fixture.sh "$dir.git"
$runtime cli.js --engine=hyperdrive import "$dir" "$dir.git" > /dev/null
