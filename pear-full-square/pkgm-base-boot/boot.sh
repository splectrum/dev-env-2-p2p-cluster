#!/bin/sh
# The package manager's boot: the package manager, from its package
# (base-package-pkgm, this script's), installed into the host's install
# folder by itself, with $HAICC_HOME/bin/pkgm to run it. Needs Node (HAICC's
# boot sees to it) and nothing else.
#   sh boot.sh <folder of haiccing repositories>
set -eu
pkg=$(cd "$(dirname "$0")/../.." && pwd)
folder=${1:-$(dirname "$pkg")}
home=${HAICC_HOME:-$HOME/.haicc}
[ -x "$home/node/bin/node" ] && PATH=$home/node/bin:$PATH
here=$(cd "$(dirname "$0")" && pwd)
echo "pkgm-base-boot $(cat "$here/VERSION"): the package manager into $home/packages"
command -v node >/dev/null || { echo "no Node.js: HAICC's boot first (sh base-package-haicc/kick.sh)"; exit 1; }
node "$pkg/pear-full-square/pkgm-base-manager/cli.js" install pkgm --from="$folder" --into="$home/packages" --quiet \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{for(const d of JSON.parse(s).done)console.log('  '+d.package+': '+d.action)})"
mkdir -p "$home/bin"
cat > "$home/bin/pkgm.new" <<EOS
#!/bin/sh
# The package manager (written by base-package-pkgm's boot)
HAICC_HOME=\${HAICC_HOME:-$home}; export HAICC_HOME
[ -x "\$HAICC_HOME/node/bin/node" ] && PATH=\$HAICC_HOME/node/bin:\$PATH
exec node "\$HAICC_HOME/packages/pear-full-square/pkgm-base-manager/cli.js" "\$@"
EOS
chmod +x "$home/bin/pkgm.new" && mv "$home/bin/pkgm.new" "$home/bin/pkgm"
echo "pkgm is ready: $home/bin/pkgm"
