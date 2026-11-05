#!/bin/sh
# A demo by hand, from scratch: GitHub's archives and a clean home in one
# temporary folder, the browser opened; press Enter when done, and it is
# tested, torn down and the folder removed (Ctrl-C too). Nothing of the
# machine's own ~/.haicc is touched. Linux x86-64, with Docker Engine.
#   sh manual-run.sh [liveness|other-host] [--no-open]
set -eu
demo=${1:-liveness}
case $demo in liveness|other-host) ;; *) echo "usage: sh manual-run.sh [liveness|other-host] [--no-open]"; exit 2 ;; esac
[ $# -gt 0 ] && shift
project=base-demo-$demo
work=$(mktemp -d)
haicc=$work/home/.haicc/bin/haicc
done_ () {
  trap - EXIT INT TERM
  [ ! -x "$haicc" ] || HOME=$work/home "$haicc" teardown "$project" | tail -1 || true
  rm -rf "$work" && echo "removed $work" || echo "left behind: $work"
}
trap done_ EXIT
trap 'exit 130' INT TERM
mkdir "$work/home" "$work/repos"
cd "$work/repos"
for r in "$project" base-package-haicc base-package-pkgm base-package-third-party base-package-mycelium base-package-p2p base-package-splectral; do
  echo "getting $r"
  curl -fsSL "https://github.com/haiccing/$r/archive/refs/heads/main.tar.gz" | tar -xz && mv "$r-main" "$r"
done
HOME=$work/home sh "$project/run.sh" "$@"
printf 'Press Enter when done (test, teardown, the temporary folder removed): '
read -r _
HOME=$work/home "$haicc" test "$project"
