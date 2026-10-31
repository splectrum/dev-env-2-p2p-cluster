#!/bin/sh
# A module's unit tests (npm test, on Node), summarised as one JSON line.
#   sh steps/1-mycelium/validation/unit-tests.sh <module>   (from the root)
set -eu
out=$(cd "$1" && npm test 2>&1) || true
pass=$(printf '%s\n' "$out" | sed -n 's/^# pass //p')
fail=$(printf '%s\n' "$out" | sed -n 's/^# fail //p')
printf '{"module":"%s","pass":%s,"fail":%s}\n' "$1" "${pass:-null}" "${fail:-null}"
