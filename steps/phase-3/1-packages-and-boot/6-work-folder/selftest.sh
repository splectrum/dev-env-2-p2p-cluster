#!/bin/sh
# The self-test, from this repository, as anyone runs it in a work folder:
# the packages written (from here) into <scratch>/out, the setup released
# from them, a fresh work folder whose sources are that folder, the
# self-test's install file (haicc-base-boot/selftest.install) as
# haiccing/install, then haiccing/boot. Its logs copied into record/.
#   sh selftest.sh <scratch folder>
set -eu
dev=$(cd "$(dirname "$0")/../../../.." && pwd)
v=$(cd "$(dirname "$0")" && pwd)
scratch=$(mkdir -p "$1" && cd "$1" && pwd)
out=$scratch/out; work=$scratch/work; rec=$v/record
pkgm="node $dev/pear-full-square/pkgm-base-manager/cli.js"
boot=$dev/pear-full-square/haicc-base-boot
mkdir -p "$out"
$pkgm import --dev="$dev" --out="$out" --quiet > /dev/null
$pkgm write --dev="$dev" --out="$out" --quiet > "$scratch/written.json" || { echo "a package's tests failed: see $scratch/written.json"; exit 1; }
sh "$boot/release.sh" "$out/base-package-haicc" "$scratch/haicc-setup.sh"
rm -rf "$work"
sh "$scratch/haicc-setup.sh" "$work" --sources="folder:$out"
cp "$boot/selftest.install" "$work/haiccing/install"
set +e
"$work/haiccing/boot"
code=$?
set -e
rm -rf "$rec"; mkdir -p "$rec"
cp "$work"/.haicc/log/* "$rec/"
cp "$work/.haicc/packages/.pkgm/changes.jsonl" "$rec/packages-changes.jsonl"
sed -i "s#$scratch#<scratch>#g; s#$dev#<dev>#g" "$rec"/*
ls -R "$work" | head -0
(cd "$work" && find . -maxdepth 2 -not -path './.haicc/*' -not -path './haiccing/*/*' | sort) > "$rec/work-folder.txt"
echo "selftest: exit $code"
exit $code
