#!/bin/sh
# The repositories a work folder needs, fetched into its haiccing/ from the
# sources listed in haiccing/sources (in order; the first having one wins):
#   folder <path>    a folder of repositories side by side (plain copies)
#   github <org>     GitHub's archives (curl and tar)
# A repository already there is kept as it is. Each fetch to
# <work>/.haicc/log/sources.jsonl.
#   sh fetch.sh <haiccing> [--requires] <repository>...
#     --requires   and what each requires, all the way down (from its manifest)
set -u
haiccing=$(cd "$1" && pwd); shift
walk=0; [ "${1:-}" = --requires ] && { walk=1; shift; }
log=$(dirname "$haiccing")/.haicc/log/sources.jsonl
mkdir -p "$(dirname "$log")"
sources=$haiccing/sources
[ -f "$sources" ] || { echo "no $sources: where the repositories come from (e.g. 'github haiccing')"; exit 1; }
record () { printf '{"time":"%s","repository":"%s","source":"%s","outcome":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$2" "$3" >> "$log"; }

fetch_one () {
  r=$1
  [ -f "$haiccing/$r/package.json" ] && return 0
  grep -v '^[[:space:]]*#' "$sources" | grep -v '^[[:space:]]*$' > "$haiccing/.sources.$$"
  while read -r kind where; do
    tmp=$haiccing/.fetch-$r.$$; rm -rf "$tmp"
    case $kind in
      folder)
        [ -f "$where/$r/package.json" ] || continue
        cp -a "$where/$r" "$tmp" && rm -rf "$tmp/.git" ;;
      github)
        mkdir -p "$tmp.d" && curl -fsSL "https://github.com/$where/$r/archive/refs/heads/main.tar.gz" 2>/dev/null | tar -xz -C "$tmp.d" 2>/dev/null && [ -f "$tmp.d/$r-main/package.json" ] && mv "$tmp.d/$r-main" "$tmp"
        rm -rf "$tmp.d"
        [ -d "$tmp" ] || continue ;;
      *) echo "haiccing/sources: unknown source '$kind'"; continue ;;
    esac
    mv "$tmp" "$haiccing/$r" && { echo "  fetched $r ($kind $where)"; record "$r" "$kind $where" fetched; rm -f "$haiccing/.sources.$$"; return 0; }
  done < "$haiccing/.sources.$$"
  rm -f "$haiccing/.sources.$$"
  echo "  $r: in none of the sources ($(grep -v '^[[:space:]]*#' "$sources" | tr '\n' ';' | sed 's/;$//'))"
  record "$r" "-" missing
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
