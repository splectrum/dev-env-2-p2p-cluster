#!/bin/sh
# Step 0, the host's prerequisites (HAICC's boot), before Node exists.
#   sh step0.sh check            each prerequisite: found, required, ok, and
#                                what fix would do; changes nothing
#   sh step0.sh fix [--yes] [--dry-run]
#                                fixes what check finds, each only with your
#                                yes (asked before anything needing sudo),
#                                checked again after each
# Required versions: ./requirements. Node.js goes into $HAICC_HOME/node
# (<work>/.haicc/node, no sudo); git and Docker Engine with apt.
# check exits 0 when all is met, 1 when not (HAICC cannot boot).
set -u
here=$(cd "$(dirname "$0")" && pwd)
home=${HAICC_HOME:-$HOME/.haicc}
[ -x "$home/node/bin/node" ] && PATH=$home/node/bin:$PATH
op=${1:-check}; shift 2>/dev/null || true
yes=0; dry=0
for a in "$@"; do case $a in --yes) yes=1 ;; --dry-run) dry=1 ;; esac; done
SUDO=; [ "$(id -u)" = 0 ] || SUDO=sudo

# a >= b, versions as dotted numbers
at_least () { [ "$(printf '%s\n%s\n' "$2" "$1" | sort -t. -k1,1n -k2,2n -k3,3n | head -1)" = "$2" ]; }
has () { command -v "$1" >/dev/null 2>&1; }
dinfo () { docker info --format "$1" 2>/dev/null; }

# found <name> <required>: sets found, ok (yes|no), fix (what fix would do)
probe () {
  found=-; ok=no; fix=
  case $1 in
    os)
      found="$(uname -s | tr A-Z a-z)-$(uname -m)"
      [ "$found" = "$2" ] && ok=yes || fix="none: HAICC runs on Linux x86-64 only, for now" ;;
    node)
      if has node; then found=$(node -v 2>/dev/null); fi
      v=${found#v}
      [ "$found" != - ] && at_least "$v" "$2" && ok=yes || fix="install Node.js $2 (the official release for Linux x64) into $home/node, no sudo" ;;
    git)
      if has git; then found=$(git --version | awk '{print $3}'); fi
      [ "$found" != - ] && at_least "$found" "$2" && ok=yes || fix="install git with apt (sudo)" ;;
    docker)
      if has docker; then found=$(docker --version | awk '{print $3}' | tr -d ,); fi
      [ "$found" != - ] && ok=yes || fix="install Docker Engine with apt (docker.io, sudo)" ;;
    docker-running)
      if ! has docker; then found=-; fix="after docker"
      elif docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then found=yes; ok=yes
      elif [ -S /var/run/docker.sock ] && ! [ -w /var/run/docker.sock ]; then found="not reachable (permission)"; fix="after docker-group"
      else found=no; fix="start the Docker daemon (sudo)"; fi ;;
    docker-rootful)
      if ! docker version >/dev/null 2>&1; then found=-; fix="after docker-running"
      elif dinfo '{{.SecurityOptions}}' | grep -q rootless; then found=no; fix="none: rootless Docker cannot give the managers the networks' addresses; use Docker Engine, rootful"
      else found=yes; ok=yes; fi ;;
    docker-native)
      if ! docker version >/dev/null 2>&1; then found=-; fix="after docker-running"
      elif dinfo '{{.OperatingSystem}}' | grep -qi 'docker desktop'; then found=no; fix="none: Docker Desktop's networks are not the host's; use Docker Engine (in WSL2, inside the distribution)"
      else found=yes; ok=yes; fi ;;
    docker-group)
      if [ "$(id -u)" = 0 ]; then found="root"; ok=yes
      elif id -nG | tr ' ' '\n' | grep -qx docker; then found=yes; ok=yes
      elif getent group docker 2>/dev/null | cut -d: -f4 | tr ',' '\n' | grep -qx "$(id -un)"; then found="yes, from the next login"; fix="log in again (or: newgrp docker)"
      else found=no; fix="add $(id -un) to the docker group (sudo); then log in again"; fi ;;
  esac
}

rows () { grep -v '^#' "$here/requirements" | grep -v '^[[:space:]]*$'; }

check () {
  worst=0
  printf '%-16s %-28s %-14s %-4s %s\n' prerequisite found required ok 'fix would'
  rows | while read -r name required; do
    probe "$name" "$required"
    case $name in node) req="$required or later" ;; git) req="$required or later" ;; *) req=$required ;; esac
    printf '%-16s %-28s %-14s %-4s %s\n' "$name" "$found" "$req" "$ok" "${fix:-}"
  done
  # The verdict, again (the loop ran in a subshell).
  rows | { w=0; while read -r name required; do probe "$name" "$required"; [ $ok = yes ] || w=1; done; exit $w; }
}

ask () {
  [ $dry = 1 ] && { echo "would: $1"; return 1; }
  [ $yes = 1 ] && { echo "yes: $1"; return 0; }
  if (exec </dev/tty) 2>/dev/null; then printf '%s? [y/N] ' "$1"; read -r a </dev/tty || a=; [ "$a" = y ] || [ "$a" = yes ]
  else echo "not fixed (no terminal to ask; --yes to agree): $1"; return 1; fi
}

fix_node () {
  major=$1
  for t in curl tar sha256sum; do has $t || { echo "Node.js cannot be fetched: $t is missing"; return 1; }; done
  base=https://nodejs.org/dist/latest-v$major.x
  file=$(curl -fsSL "$base/SHASUMS256.txt" | awk '/linux-x64.tar.gz$/ {print $2}' | head -1)
  [ -n "$file" ] || { echo "no Node.js $major release found at $base"; return 1; }
  tmp=$(mktemp -d)
  curl -fsSL "$base/$file" -o "$tmp/$file" && curl -fsSL "$base/SHASUMS256.txt" | grep " $file\$" | (cd "$tmp" && sha256sum -c - >/dev/null) || { echo "Node.js download failed, or its checksum did not match"; rm -rf "$tmp"; return 1; }
  mkdir -p "$home" && rm -rf "$home/node.new" && mkdir "$home/node.new" && tar -xzf "$tmp/$file" -C "$home/node.new" --strip-components=1 && rm -rf "$home/node" && mv "$home/node.new" "$home/node"
  rm -rf "$tmp"
  PATH=$home/node/bin:$PATH
  echo "Node.js $("$home/node/bin/node" -v) in $home/node (on PATH for HAICC; for your shell: export PATH=$home/node/bin:\$PATH)"
}

fix () {
  rows > "${TMPDIR:-/tmp}/haicc-step0.$$"
  while read -r name required; do
    probe "$name" "$required"
    [ $ok = yes ] && continue
    case $name in
      node) ask "$fix" && fix_node "$required" ;;
      git) ask "$fix" && $SUDO apt-get update -q </dev/null && $SUDO apt-get install -y -q git </dev/null ;;
      docker) ask "$fix" && $SUDO apt-get update -q </dev/null && $SUDO apt-get install -y -q docker.io </dev/null ;;
      docker-running) case $fix in start*) ask "$fix" && { $SUDO systemctl start docker 2>/dev/null || $SUDO service docker start; } ;; *) echo "$name: $fix" ;; esac ;;
      docker-group) case $fix in add*) ask "$fix" && $SUDO usermod -aG docker "$(id -un)" && echo "added: it holds from your next login (or: newgrp docker)" ;; *) echo "$name: $fix" ;; esac ;;
      *) echo "$name: ${fix:-cannot be fixed here}" ;;
    esac
    probe "$name" "$required"
    [ $dry = 1 ] || echo "$name: $( [ $ok = yes ] && echo ok || echo "not ok ($found)" )"
  done < "${TMPDIR:-/tmp}/haicc-step0.$$"
  rm -f "${TMPDIR:-/tmp}/haicc-step0.$$"
  echo
  check
}

case $op in
  check) check ;;
  fix) fix ;;
  *) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
