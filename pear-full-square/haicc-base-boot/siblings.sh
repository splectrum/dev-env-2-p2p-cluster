#!/bin/sh
# The repositories a kick needs, beside each other in <folder>: each one
# missing is said, with where to get it; with --fetch, got (git, or curl
# and tar) from github.com/haiccing.
#   sh siblings.sh <folder> [--fetch] <repository>...
set -eu
folder=$1; shift
fetch=0; [ "${1:-}" = --fetch ] && { fetch=1; shift; }
missing=
for r in "$@"; do
  [ -f "$folder/$r/package.json" ] && continue
  if [ $fetch = 1 ]; then
    echo "fetching haiccing/$r into $folder"
    if command -v git >/dev/null 2>&1; then git clone -q --depth 1 "https://github.com/haiccing/$r" "$folder/$r"
    else (cd "$folder" && curl -fsSL "https://github.com/haiccing/$r/archive/refs/heads/main.tar.gz" | tar -xz && mv "$r-main" "$r"); fi
  else missing="$missing $r"; fi
done
[ -z "$missing" ] && exit 0
echo "missing beside the others in $folder:"
for r in $missing; do
  echo "  haiccing/$r: git clone https://github.com/haiccing/$r"
  echo "    or: curl -fsSL https://github.com/haiccing/$r/archive/refs/heads/main.tar.gz | tar -xz && mv $r-main $r"
done
echo "(or kick again with --fetch)"
exit 1
