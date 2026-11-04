#!/bin/sh
# Kicking the package manager, from a folder of haiccing repositories side
# by side (clones or plain copies): HAICC's boot (step 0, from
# base-package-haicc beside this one), then the package manager's boot and
# install; then it exits ($HAICC_HOME/bin/pkgm, ~/.haicc/bin/pkgm).
#   sh base-package-pkgm/kick.sh [--yes] [--fetch]
set -eu
pkg=$(cd "$(dirname "$0")" && pwd)
folder=$(dirname "$pkg")
home=${HAICC_HOME:-$HOME/.haicc}
yes=; fetch=
for a in "$@"; do case $a in --yes) yes=--yes ;; --fetch) fetch=--fetch ;; esac; done
if [ ! -f "$folder/base-package-haicc/package.json" ]; then
  [ -n "$fetch" ] || { echo "missing beside the others in $folder:"; echo "  haiccing/base-package-haicc: git clone https://github.com/haiccing/base-package-haicc"; echo "    or: curl -fsSL https://github.com/haiccing/base-package-haicc/archive/refs/heads/main.tar.gz | tar -xz && mv base-package-haicc-main base-package-haicc"; echo "(or kick again with --fetch)"; exit 1; }
  if command -v git >/dev/null 2>&1; then git clone -q --depth 1 https://github.com/haiccing/base-package-haicc "$folder/base-package-haicc"
  else (cd "$folder" && curl -fsSL https://github.com/haiccing/base-package-haicc/archive/refs/heads/main.tar.gz | tar -xz && mv base-package-haicc-main base-package-haicc); fi
fi
sh "$folder/base-package-haicc/pear-full-square/haicc-base-boot/boot.sh" $yes
HAICC_HOME=$home sh "$pkg/pear-full-square/pkgm-base-boot/boot.sh" "$folder"
