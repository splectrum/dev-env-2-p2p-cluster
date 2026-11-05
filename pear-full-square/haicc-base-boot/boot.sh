#!/bin/sh
# HAICC's boot: step 0, the host's prerequisites. Anything missing: fixed
# with your yes (step0.sh fix), or the boot stops.
#   sh boot.sh [--yes]
set -u
here=$(cd "$(dirname "$0")" && pwd)
echo "haicc-base-boot $(cat "$here/VERSION"): step 0, the host's prerequisites"
sh "$here/step0.sh" check
code=$?
if [ $code = 1 ]; then
  echo
  echo "HAICC needs what is marked 'no' above to boot (nodes run in Docker containers)."
  sh "$here/step0.sh" fix "$@"
  code=$?
fi
case $code in
  0) exit 0 ;;
  *) echo; echo "HAICC cannot boot yet: fix what is marked 'no' (sh $here/step0.sh fix), then kick again"; exit 1 ;;
esac
