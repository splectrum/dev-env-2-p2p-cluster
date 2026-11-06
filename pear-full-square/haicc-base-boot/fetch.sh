#!/bin/sh
# The repositories a work folder needs, fetched into its haiccing/ from the
# sources listed in haiccing/sources (in order; the first having one wins):
#   folder <path>    a folder of repositories side by side (plain copies)
#   github <org>     GitHub's archives (curl and tar)
# A repository already there is kept as it is. Each fetch is said as it
# happens (with its source): in the log of the command that fetched.
#   sh fetch.sh <haiccing> [--requires] <repository>...
#     --requires   and what each requires, all the way down (from its manifest)
set -u
. "$(cd "$(dirname "$0")" && pwd)/lib/download.sh"
haiccing=$(cd "$1" && pwd); shift
walk=0; [ "${1:-}" = --requires ] && { walk=1; shift; }
sources=$haiccing/sources
[ -f "$sources" ] || { echo "no $sources: where the repositories come from (e.g. 'github haiccing')"; exit 1; }

fetch_one () {
  r=$1
  lost=0
  [ -f "$haiccing/$r/package.json" ] && return 0
  grep -v '^[[:space:]]*#' "$sources" | grep -v '^[[:space:]]*$' > "$haiccing/.sources.$$"
  while read -r kind where; do
    tmp=$haiccing/.fetch-$r.$$; rm -rf "$tmp"
    case $kind in
      folder)
        [ -f "$where/$r/package.json" ] || continue
        echo "  copying $r from $where..."
        cp -a "$where/$r" "$tmp" && rm -rf "$tmp/.git" ;;
      github)
        mkdir -p "$tmp.d"
        echo "  fetching $r from GitHub ($where)..."
        download "https://github.com/$where/$r/archive/refs/heads/main.tar.gz" "$tmp.tgz"; got=$?
        if [ $got = 0 ]; then
          echo "  unpacking $r..."
          tar -xzf "$tmp.tgz" -C "$tmp.d" && [ -f "$tmp.d/$r-main/package.json" ] && mv "$tmp.d/$r-main" "$tmp"
        elif [ $got = 2 ]; then lost=1; fi
        rm -f "$tmp.tgz"
        rm -rf "$tmp.d"
        [ -d "$tmp" ] || continue ;;
      *) echo "haiccing/sources: unknown source '$kind'"; continue ;;
    esac
    mv "$tmp" "$haiccing/$r" && { echo "  fetched $r ($kind $where)"; rm -f "$haiccing/.sources.$$"; return 0; }
  done < "$haiccing/.sources.$$"
  rm -f "$haiccing/.sources.$$"
  if [ $lost = 1 ]; then echo "  $r: the connection failed; check it and run this again"; return 1; fi
  echo "  $r: in none of the sources ($(grep -v '^[[:space:]]*#' "$sources" | tr '\n' ';' | sed 's/;$//'))"
  return 1
}

seen=
visit () {
  case " $seen " in *" $1 "*) return 0 ;; esac
  seen="$seen $1"
  fetch_one "$1" || return 1
  [ $walk = 1 ] || return 0
  for n in $(node -p "(require('$haiccing/$1/package.json').pkgm || {}).requires?.join(' ') || ''"); do visit "base-package-$n" || return 1; done
}
code=0
for r in "$@"; do visit "$r" || code=1; done
exit $code
