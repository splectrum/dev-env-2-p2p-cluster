#!/bin/sh
# Kicking HAICC, from a folder of haiccing repositories side by side (clones
# or plain copies): HAICC's boot (step 0), the package manager's boot and
# install, then HAICC's install by the package manager; then it exits, and
# `haicc` is there ($HAICC_HOME/bin/haicc, ~/.haicc/bin/haicc).
#   sh base-package-haicc/kick.sh [--yes] [--fetch]
#     --yes     agree to step 0's fixes without asking
#     --fetch   get missing repositories from github.com/haiccing (git, or
#               curl and tar) instead of only saying which
set -eu
pkg=$(cd "$(dirname "$0")" && pwd)
folder=$(dirname "$pkg")
home=${HAICC_HOME:-$HOME/.haicc}
yes=; fetch=0
for a in "$@"; do case $a in --yes) yes=--yes ;; --fetch) fetch=1 ;; esac; done

sh "$pkg/pear-full-square/haicc-base-boot/boot.sh" $yes
[ -x "$home/node/bin/node" ] && PATH=$home/node/bin:$PATH && export PATH

# The package manager's boot: from its repository beside this one.
sh "$pkg/pear-full-square/haicc-base-boot/siblings.sh" "$folder" $([ $fetch = 1 ] && echo --fetch) base-package-pkgm
HAICC_HOME=$home sh "$folder/base-package-pkgm/pear-full-square/pkgm-base-boot/boot.sh" "$folder"

# HAICC, by the package manager, with what it requires from beside it.
sh "$pkg/pear-full-square/haicc-base-boot/siblings.sh" "$folder" $([ $fetch = 1 ] && echo --fetch) $(node -e "
  // What HAICC requires, all the way down, as far as it is beside it.
  const fs = require('fs'); const seen = new Set()
  const walk = n => { if (seen.has(n)) return; seen.add(n); try { for (const r of JSON.parse(fs.readFileSync(process.argv[1] + '/base-package-' + n + '/package.json')).pkgm.requires) walk(r) } catch {} }
  walk('haicc'); console.log([...seen].map(n => 'base-package-' + n).join(' '))" "$folder")
"$home/bin/pkgm" install haicc --from="$folder" --quiet | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{for(const d of JSON.parse(s).done)console.log('  '+d.package+': '+d.action)})"
mkdir -p "$home/bin"
cat > "$home/bin/haicc.new" <<EOS
#!/bin/sh
# HAICC (written by base-package-haicc's kick)
HAICC_HOME=\${HAICC_HOME:-$home}; export HAICC_HOME
[ -x "\$HAICC_HOME/node/bin/node" ] && PATH=\$HAICC_HOME/node/bin:\$PATH
exec node "\$HAICC_HOME/packages/pear-full-square/haicc-deployment/haicc.js" "\$@"
EOS
chmod +x "$home/bin/haicc.new" && mv "$home/bin/haicc.new" "$home/bin/haicc"
printf '%s\n' "$folder" > "$home/from"
echo "haicc is ready: $home/bin/haicc$(case ":$PATH:" in *":$home/bin:"*) ;; *) echo " (for your shell: export PATH=$home/bin:\$PATH)" ;; esac)"
