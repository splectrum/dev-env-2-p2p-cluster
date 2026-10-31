#!/bin/sh
# A full test run, kept: seeded from the committed dev state with every
# module's command sets and the report request, kicked, kept as a bundle.
# MACHINERY (dev, or an id; default: the pinned one) and ENGINE (native or
# hyperdrive; default native) pass on to test-run/seed.sh. Prints one JSON
# line: the report's summary, the instance's kind and the bundle's size.
#   sh steps/3-repositories/validation/test-run.sh <instance-dir> <bundle>   (from the root)
set -eu
dir=$1
bundle=$2
rm -rf "$dir"
test-run/seed.sh "$dir" test-run/requests/report-runs >/dev/null
"$dir/hooks/execute" >/dev/null 2>"$dir.kick-stderr"
test-run/keep.sh "$dir" "$bundle" >/dev/null
check=$(mktemp -d)
git clone -q --bare "$bundle" "$check/run"
summary=$(git -C "$check/run" show main:responses/report-runs/report.md | sed -n 's/^\([0-9]*\) requests, \([0-9]*\) invocations: \([0-9]*\) met, \([0-9]*\) not met, \([0-9]*\) without expectation; \([0-9]*\) did not complete\.$/\1 \2 \3 \4 \5 \6/p')
runtime=$(git -C "$check/run" show main:responses/report-runs/unit.json | node -e 'const u=JSON.parse(require("fs").readFileSync(0)); console.log(u.environment.runtime || "node (not recorded)")')
rm -rf "$check"
set -- $summary
printf '{"engine":"%s","machinery":"%s","runtime":"%s","requests":%s,"invocations":%s,"met":%s,"notMet":%s,"withoutExpectation":%s,"didNotComplete":%s,"bundleBytes":%s}\n' \
  "${ENGINE:-native}" "${MACHINERY:-pinned $(cat test-run/machinery)}" "$runtime" "$1" "$2" "$3" "$4" "$5" "$6" "$(wc -c < "$bundle")"
