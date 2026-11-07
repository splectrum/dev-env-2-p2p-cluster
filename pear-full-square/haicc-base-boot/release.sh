#!/bin/sh
# The setup: a release of base-package-haicc as one self-extracting file
# (sh and tar only), extracting a work folder: ./boot and ./shutdown (the
# cold pair, naming this setup), haiccing/sources, haiccing/base-package-haicc/.
#   sh release.sh <base-package-haicc, as written> <out file>
set -eu
pkg=$(cd "$1" && pwd)
out=$2
name=$(basename "$pkg")
version=$(cat "$pkg/modules/pear-full-square/haicc-base-boot/VERSION")
hash=$(sed -n 's/.*"hash": *"\([0-9a-f]\{12\}\).*/\1/p' "$pkg/package.json" | head -1)
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/haiccing"
cp -a "$pkg" "$tmp/haiccing/$name" && rm -rf "$tmp/haiccing/$name/.git"
# The work folder's cold pair, at its top: ./boot (set up from haiccing/,
# then ./haicc boot) and ./shutdown (everything removed back to haiccing/).
cat > "$tmp/boot" <<EOS
#!/bin/sh
# This work folder's cold boot: the setup $name. Run it as ./boot.
exec sh "\$(cd "\$(dirname "\$0")" && pwd)/haiccing/$name/modules/pear-full-square/haicc-base-boot/boot.sh" "\$@"
EOS
cat > "$tmp/shutdown" <<EOS
#!/bin/sh
# This work folder's cold shutdown: the setup $name. Run it as ./shutdown.
exec sh "\$(cd "\$(dirname "\$0")" && pwd)/haiccing/$name/modules/pear-full-square/haicc-base-boot/shutdown.sh" "\$@"
EOS
chmod 755 "$tmp/boot" "$tmp/shutdown"
cat > "$tmp/haiccing/sources" <<EOS
# Where this work folder's repositories come from, in order (the first
# having one wins): folder <path> (plain copies), github <org> (archives).
github haiccing
EOS
cat > "$out" <<EOS
#!/bin/sh
# haicc-setup: the setup $name ($hash, boot $version), self-extracting.
#   sh haicc-setup.sh [<work folder>] [--sources=folder:<path>|github:<org>]...
# Extracts <work folder>/: boot, shutdown, haiccing/ (sources, $name); then:
#   <work folder>/boot
set -eu
work=.; sources=
for a in "\$@"; do
  case \$a in
    --sources=*) sources="\$sources\$(printf '%s' "\${a#--sources=}" | sed 's/:/ /')
" ;;
    -*) sed -n '2,6p' "\$0" | sed 's/^# \\{0,1\\}//'; exit 2 ;;
    *) work=\$a ;;
  esac
done
mkdir -p "\$work"; work=\$(cd "\$work" && pwd)
# Logged from the start: what it says, to <work folder>/log/ too (the
# current file, or a new one named by now; a header and a close line, as
# every haicc command's).
mkdir -p "\$work/log"
log=\$(ls "\$work/log" | grep -E '^[0-9]{8}T[0-9]{6}Z\\.log\$' | sort | tail -1)
if [ -z "\$log" ] || [ "\$(wc -c < "\$work/log/\$log")" -ge 10240 ]; then log=\$(date -u +%Y%m%dT%H%M%SZ).log; fi
log=\$work/log/\$log
t0=\$(date +%s)
echo "== \$(date -u +%Y-%m-%dT%H:%M:%SZ) sh haicc-setup.sh \$*  (in \$(pwd))" | tee -a "\$log"
say () { echo "\$*"; echo "\$*" >> "\$log"; }
end () { echo "== exit \$1, \$(( \$(date +%s) - t0 )) s" | tee -a "\$log"; exit "\$1"; }
say "haicc-setup: $name $hash (boot $version)"
if [ -e "\$work/haiccing/$name/package.json" ]; then
  there=\$(sed -n 's/.*"hash": *"\\([0-9a-f]\\{12\\}\\).*/\\1/p' "\$work/haiccing/$name/package.json" | head -1)
  boot=\$(cat "\$work/haiccing/$name/modules/pear-full-square/haicc-base-boot/VERSION" 2>/dev/null || echo '?')
  if [ "\$there" = "$hash" ]; then say "already set up with this setup: \$work/haiccing (next: \$work/boot)"; end 0; fi
  say "already set up with another setup: \$work/haiccing has $name \$there (boot \$boot), this one is $hash (boot $version)."
  say "Nothing changed. For this setup, use a new folder: sh haicc-setup.sh <new folder>"
  end 1
fi
line=\$(awk '/^__PAYLOAD__\$/ { print NR + 1; exit }' "\$0")
tail -n +"\$line" "\$0" | tar -xzf - -C "\$work"
if [ -n "\$sources" ]; then { echo "# Where this work folder's repositories come from, in order."; printf '%s' "\$sources"; } > "\$work/haiccing/sources"; fi
say "set up: \$work/haiccing ($name $hash); sources: \$(grep -v '^#' "\$work/haiccing/sources" | tr '\\n' ';' | sed 's/;\$//')"
say "next: \$work/boot"
end 0
__PAYLOAD__
EOS
tar -czf - -C "$tmp" haiccing boot shutdown >> "$out"
chmod 755 "$out"
echo "$out: $name $hash, $(wc -c < "$out") bytes"
