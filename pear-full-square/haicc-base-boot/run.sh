#!/bin/sh
# Click and run: this project, from a folder of haiccing repositories side
# by side (clones or plain copies). HAICC kicked first if it is not
# installed (base-package-haicc beside this one), then `haicc run`: the
# project's packages installed, its layers deployed and started, the
# browser opened.
#   sh run.sh [--yes] [--fetch] [--no-open]
#     --yes     agree to step 0's fixes without asking
#     --fetch   get missing repositories from github.com/haiccing
#     --no-open print the address, do not open the browser
set -eu
here=$(cd "$(dirname "$0")" && pwd)
folder=$(dirname "$here")
home=${HAICC_HOME:-$HOME/.haicc}
open=
for a in "$@"; do [ "$a" = --no-open ] && open=--no-open; done
if [ ! -x "$home/bin/haicc" ]; then
  if [ ! -f "$folder/base-package-haicc/kick.sh" ]; then
    echo "HAICC is not installed, and base-package-haicc is not beside this project in $folder:"
    echo "  git clone https://github.com/haiccing/base-package-haicc"
    echo "  or: curl -fsSL https://github.com/haiccing/base-package-haicc/archive/refs/heads/main.tar.gz | tar -xz && mv base-package-haicc-main base-package-haicc"
    exit 1
  fi
  sh "$folder/base-package-haicc/kick.sh" "$@"
fi
exec "$home/bin/haicc" run "$here" $open
