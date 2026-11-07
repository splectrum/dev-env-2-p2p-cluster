#!/bin/sh
# The new base-package-haicc, tested on the platform as it ships: written by
# the package writer (its own tests first), released, set up in a fresh work
# folder, booted; a swarm and its master (the node's cold boot: the
# platform's package only; its warm boot: the self-test, bottom up); each
# level shut down and booted again; the cold shutdown and ./boot again.
# Stops at the first step that fails (exit 1), saying which.
#   sh run.sh <scratch folder>      (Docker Engine running; this repository installed)
set -u
dev=$(cd "$(dirname "$0")/../../../.." && pwd)
s=$(mkdir -p "$1" && cd "$1" && pwd)
out=$s/out; work=$s/work
rm -rf "$out" "$work" "$s/haicc-setup.sh"
n=0
step () { n=$((n + 1)); what=$1; shift; printf '%2d %s ... ' "$n" "$what"; if out_=$("$@" 2>&1); then echo ok; else echo FAILED; echo "$out_" | tail -30 | sed 's/^/     /'; exit 1; fi; }
expect () { printf '%s' "$out_" | grep -q "$1" || { echo "   expected: $1"; echo "$out_" | tail -20 | sed 's/^/     /'; exit 1; }; }
has () { [ -e "$1" ]; }
hasnt () { [ ! -e "$1" ]; }

step 'written: base-package-haicc, its tests passed first' node "$dev/tools/package-writer/cli.js" --out="$out" --only=haicc --quiet
step 'the package structure: modules/, test/modules-load, no requires' sh -c "[ -d '$out/base-package-haicc/modules/pear-full-square/haicc-base-boot' ] && [ -d '$out/base-package-haicc/modules/pear-full-square/pkgm-base-manager' ] && [ -x '$out/base-package-haicc/test/modules-load/test' ] && ! grep -q requires '$out/base-package-haicc/package.json'"
step 'released: haicc-setup.sh' sh "$dev/pear-full-square/haicc-base-boot/release.sh" "$out/base-package-haicc" "$s/haicc-setup.sh"
step 'set up: a fresh work folder' sh "$s/haicc-setup.sh" "$work" "--sources=folder:$out"
step './boot (cold): stage 1 and 2' "$work/boot" --yes
expect 'Booted'
step 'the work folder: base-package-haicc in packages/, ./haicc' sh -c "[ -x '$work/haicc' ] && [ -f '$work/packages/base-package-haicc/modules/pear-full-square/haicc-base-boot/haicc.js' ]"
step 'a swarm: ./haicc boot hosts' "$work/haicc" boot hosts --no-echo
step "its master, cold and warm: ./hosts/haicc boot master" "$work/hosts/haicc" boot master
expect 'Ready: 5 test runs passed (base-package-haicc)'
expect 'The node hosts/master: up'
step "the node's cold boot: the platform's package only" sh -c "[ \"\$(ls '$work/hosts/master/packages')\" = base-package-haicc ]"
step 'the node: list, test a package' "$work/hosts/master/haicc" test base-package-haicc
expect 'test base-package-haicc: passed'
step 'a second node: ./hosts/haicc boot node-1' "$work/hosts/haicc" boot node-1 --no-echo
step 'the node level: shutdown, boot' sh -c "'$work/hosts/node-1/haicc' shutdown && '$work/hosts/node-1/haicc' boot"
step 'the swarm level: shutdown (nodes removed, nodes.json kept)' "$work/hosts/haicc" shutdown --yes
step '  its nodes gone, its config kept' sh -c "[ ! -e '$work/hosts/master' ] && [ -f '$work/hosts/nodes.json' ]"
step '  boot: rebuilt from nodes.json, the master first' "$work/hosts/haicc" boot --no-echo
step '  both up again' sh -c "[ -x '$work/hosts/master/haicc' ] && [ -x '$work/hosts/node-1/haicc' ]"
step 'the root level: shutdown, boot' sh -c "'$work/haicc' shutdown --yes && '$work/haicc' boot --no-echo"
step 'teardown: the swarm and its entry' "$work/haicc" teardown hosts --yes
step 'the cold shutdown: ./shutdown' "$work/shutdown" --yes
step '  kept: haiccing/, log/; gone: packages/, ./haicc' sh -c "[ -d '$work/haiccing' ] && [ -d '$work/log' ] && [ ! -e '$work/packages' ] && [ ! -e '$work/haicc' ]"
step './boot again: set up from haiccing/' "$work/boot" --yes
expect 'Booted'
echo "all $n steps passed"
