#!/bin/sh
# A module's unit tests (npm test, on Node), summarised as one JSON line.
#   sh steps/1-mycelium/validation/unit-tests.sh <module>   (from the root)
set -eu
out=$(cd "$1" && npm test 2>&1) || true
# Node 22 prints TAP when not on a terminal (`# pass 3`); Node 24 the spec
# reporter (`ℹ pass 3`): both read.
pass=$(printf '%s\n' "$out" | sed -n 's/^\(# \|ℹ \)pass //p' | tail -1)
fail=$(printf '%s\n' "$out" | sed -n 's/^\(# \|ℹ \)fail //p' | tail -1)
printf '{"module":"%s","pass":%s,"fail":%s}\n' "$1" "${pass:-null}" "${fail:-null}"
