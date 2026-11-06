#!/bin/sh
# HAICC's cold boot, stage 1, for a work folder: run as <work>/boot
# (the stub). Only what HAICC needs to run:
#   ./boot [--yes] [--verbose|--debug]
# 1. step 0: Linux x86-64 and Node.js (fixed with your yes, or it stops);
# 2. HAICC's package, base-package-haicc, copied whole into
#    <work>/packages/ (at the first boot only), and <work>/haicc written;
# 3. then ./haicc boot (stage 2: the host's other prerequisites,
#    haiccing/install).
# The work folder: haicc, haiccing/, packages/, nodejs/ (Node.js, when the
# boot installs it), log/. What it prints goes to the log as well, in
# <work>/log/: files of 10 KB, each named by its first command's start
# (UTC), so they list in time order; a header line (the real start) and a
# close line (the exit, the duration) each. No hidden folders. No secrets.
set -u
here=$(cd "$(dirname "$0")" && pwd)
haiccing=$(cd "$here/../../.." && pwd)
work=$(dirname "$haiccing")
logdir=$work/log
mkdir -p "$logdir"
# Its output, to the log too (the exit code kept through the pipe).
if [ -z "${HAICC_BOOT_LOGGING:-}" ]; then
  export HAICC_BOOT_LOGGING=1
  # The current log file (the newest), or a new one named by now.
  log=$(ls "$logdir" | grep -E '^[0-9]{8}T[0-9]{6}Z\.log$' | sort | tail -1)
  if [ -z "$log" ] || [ "$(wc -c < "$logdir/$log")" -ge 10240 ]; then log=$(date -u +%Y%m%dT%H%M%SZ).log; fi
  log=$logdir/$log
  t0=$(date +%s)
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) ./boot $*  (in $(pwd))" >> "$log"
  { sh "$0" "$@" 2>&1; echo $? > "$logdir/boot.exit"; } | tee -a "$log"
  code=$(cat "$logdir/boot.exit" 2>/dev/null || echo 1); rm -f "$logdir/boot.exit"
  echo "== exit $code, $(( $(date +%s) - t0 )) s" >> "$log"
  [ "$code" = 0 ] || exit "$code"
  # 3. Stage 2: HAICC itself (it logs itself).
  exec "$work/haicc" boot "$@"
fi
export HAICC_WORK=$work
yes=; for a in "$@"; do [ "$a" = --yes ] && yes=--yes; done
echo "haicc-base-boot $(cat "$here/VERSION"): stage 1, the work folder $work"

# 1. Step 0.
echo "Checking what HAICC needs to run..."
if ! sh "$here/step0.sh" check; then
  echo
  echo "HAICC needs what is marked 'no' above to run."
  sh "$here/step0.sh" fix $yes || { echo; echo "HAICC cannot run yet: fix what is marked 'no' (sh $here/step0.sh fix), then ./boot again"; exit 1; }
fi
[ -x "$work/nodejs/bin/node" ] && PATH=$work/nodejs/bin:$PATH && export PATH

# 2. HAICC's package, copied whole into packages/ at the first boot.
pkg=$work/packages/base-package-haicc
if [ -f "$pkg/package.json" ]; then
  there=$(cat "$pkg/pear-full-square/haicc-base-boot/VERSION"); this=$(cat "$here/VERSION")
  if [ "$there" = "$this" ]; then echo "  HAICC's package: there (copied at the first boot)"
  else echo "  HAICC's package: boot $there is there, this setup is $this: kept, no updates yet (a new work folder has $this)"; fi
else
  echo "  copying HAICC's package into $work/packages..."
  mkdir -p "$work/packages" || { echo "  could not make $work/packages"; exit 1; }
  rm -rf "$pkg.new" && cp -a "$haiccing/base-package-haicc" "$pkg.new" && rm -rf "$pkg.new/.git" && mv "$pkg.new" "$pkg" || { echo "  could not copy HAICC's package into $work/packages"; exit 1; }
  echo "  copied HAICC's package (base-package-haicc, boot $(cat "$here/VERSION")) into $pkg"
fi
cat > "$work/haicc.new" <<EOS
#!/bin/sh
# HAICC for this work folder (written by ./boot): ./haicc <command>
work=\$(cd "\$(dirname "\$0")" && pwd)
HAICC_WORK=\$work; export HAICC_WORK
[ -x "\$work/nodejs/bin/node" ] && PATH=\$work/nodejs/bin:\$PATH
exec node "\$work/packages/base-package-haicc/pear-full-square/haicc-base-boot/haicc.js" "\$@"
EOS
chmod 755 "$work/haicc.new" && mv "$work/haicc.new" "$work/haicc"
echo "  written $work/haicc"
echo "Stage 1 done. Now the host's prerequisites (./haicc boot)."
