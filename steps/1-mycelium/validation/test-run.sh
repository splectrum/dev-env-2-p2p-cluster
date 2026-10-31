#!/bin/sh
# A full test run (the test-run model, test-run/README.md): an instance
# seeded from the committed dev state with every module's command sets
# (every engine, Node and Bare) and the report request, kicked, kept as a
# bundle. Prints the report's summary as one JSON line.
#   sh steps/1-mycelium/validation/test-run.sh <instance-dir> <bundle>   (from the root)
set -eu
dir=$1
bundle=$2
rm -rf "$dir"
test-run/seed.sh "$dir" test-run/requests/report-runs >/dev/null
"$dir/hooks/execute" >/dev/null
test-run/keep.sh "$dir" "$bundle" >/dev/null
summary=$(git -C "$dir" show main:responses/report-runs/report.md | sed -n 's/^\([0-9]*\) requests, \([0-9]*\) invocations: \([0-9]*\) met, \([0-9]*\) not met, \([0-9]*\) without expectation; \([0-9]*\) did not complete\.$/\1 \2 \3 \4 \5 \6/p')
set -- $summary
printf '{"requests":%s,"invocations":%s,"met":%s,"notMet":%s,"withoutExpectation":%s,"didNotComplete":%s,"bundleBytes":%s}\n' "$1" "$2" "$3" "$4" "$5" "$6" "$(wc -c < "$bundle")"
