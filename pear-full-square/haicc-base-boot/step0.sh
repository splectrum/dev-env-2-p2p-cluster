#!/bin/sh
# Step 0: what HAICC needs to run, before Node.js exists (./requirements).
#   sh step0.sh check            each: found, required, ok, what fix would do
#   sh step0.sh fix [--yes] [--dry-run]
#                                Node.js, the official release for Linux x64,
#                                checksum checked, into $HAICC_WORK/nodejs (no
#                                sudo), only with your yes
# check exits 0 when all is met, 1 when not.
set -u
here=$(cd "$(dirname "$0")" && pwd)
work=${HAICC_WORK:-.}
. "$here/lib/download.sh"
[ -x "$work/nodejs/bin/node" ] && PATH=$work/nodejs/bin:$PATH
op=${1:-check}; shift 2>/dev/null || true
yes=0; dry=0
for a in "$@"; do case $a in --yes) yes=1 ;; --dry-run) dry=1 ;; esac; done

# a >= b, versions as dotted numbers
at_least () { [ "$(printf '%s\n%s\n' "$2" "$1" | sort -t. -k1,1n -k2,2n -k3,3n | head -1)" = "$2" ]; }
has () { command -v "$1" >/dev/null 2>&1; }

probe () {
  found=-; ok=no; fix=
  case $1 in
    os)
      found="$(uname -s | tr A-Z a-z)-$(uname -m)"
      [ "$found" = "$2" ] && ok=yes || fix="none: HAICC runs on Linux x86-64 only, for now" ;;
    node)
      if has node; then found=$(node -v 2>/dev/null); fi
      v=${found#v}
      [ "$found" != - ] && at_least "$v" "$2" && ok=yes || fix="install Node.js $2 (the official release for Linux x64) into $work/nodejs, no sudo" ;;
  esac
}

rows () { grep -v '^#' "$here/requirements" | grep -v '^[[:space:]]*$'; }

check () {
  printf '%-14s %-24s %-14s %-4s %s\n' prerequisite found required ok 'fix would'
  rows | while read -r name required; do
    probe "$name" "$required"
    case $name in node) req="$required or later" ;; *) req=$required ;; esac
    printf '%-14s %-24s %-14s %-4s %s\n' "$name" "$found" "$req" "$ok" "${fix:-}"
  done
  rows | { w=0; while read -r name required; do probe "$name" "$required"; [ $ok = yes ] || w=1; done; exit $w; }
}

ask () {
  [ $dry = 1 ] && { echo "would: $1"; return 1; }
  [ $yes = 1 ] && { echo "yes: $1"; return 0; }
  if (exec </dev/tty) 2>/dev/null; then printf '%s? [y/N] ' "$1"; read -r a </dev/tty || a=; echo "$1? ${a:-no}"; [ "$a" = y ] || [ "$a" = yes ]
  else echo "not fixed (no terminal to ask; --yes to agree): $1"; return 1; fi
}

fix_node () {
  major=$1
  for t in curl tar sha256sum; do has $t || { echo "Node.js cannot be fetched: $t is missing"; return 1; }; done
  base=https://nodejs.org/dist/latest-v$major.x
  tmp=$(mktemp -d)
  echo "  finding the latest Node.js $major at nodejs.org..."
  download "$base/SHASUMS256.txt" "$tmp/SHASUMS256.txt" || { rm -rf "$tmp"; return 1; }
  file=$(awk '/linux-x64.tar.gz$/ {print $2}' "$tmp/SHASUMS256.txt" | head -1)
  [ -n "$file" ] || { echo "no Node.js $major release found at $base"; rm -rf "$tmp"; return 1; }
  echo "  downloading $file (about 30 MB)..."
  download "$base/$file" "$tmp/$file" || { rm -rf "$tmp"; return 1; }
  echo "  checking its checksum..."
  grep " $file\$" "$tmp/SHASUMS256.txt" | (cd "$tmp" && sha256sum -c - >/dev/null) || { echo "Node.js's checksum did not match"; rm -rf "$tmp"; return 1; }
  echo "  unpacking into $work/nodejs..."
  mkdir -p "$work" && rm -rf "$work/nodejs.new" && mkdir "$work/nodejs.new" && tar -xzf "$tmp/$file" -C "$work/nodejs.new" --strip-components=1 && rm -rf "$work/nodejs" && mv "$work/nodejs.new" "$work/nodejs"
  rm -rf "$tmp"
  PATH=$work/nodejs/bin:$PATH   # for the check that follows
  echo "installed: Node.js $("$work/nodejs/bin/node" -v) in $work/nodejs"
}

fix () {
  rows > "${TMPDIR:-/tmp}/haicc-step0.$$"
  while read -r name required; do
    probe "$name" "$required"
    [ $ok = yes ] && continue
    case $name in
      node) ask "$fix" && fix_node "$required" ;;
      *) echo "$name: $fix" ;;
    esac
  done < "${TMPDIR:-/tmp}/haicc-step0.$$"
  rm -f "${TMPDIR:-/tmp}/haicc-step0.$$"
  echo
  check
}

case $op in
  check) check ;;
  fix) fix ;;
  *) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
