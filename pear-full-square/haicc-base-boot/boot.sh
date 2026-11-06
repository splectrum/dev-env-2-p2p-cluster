#!/bin/sh
# HAICC's boot, stage 1, for a work folder: run as <work>/haiccing/boot
# (the stub). Only what HAICC needs to run:
#   haiccing/boot [--yes] [--verbose|--debug]
# 1. step 0: Linux x86-64 and Node.js (fixed with your yes, or it stops);
# 2. the root's part of HAICC, this module (haicc-base-boot), copied out of
#    haiccing/base-package-haicc into <work>/.haicc/ (at the first boot
#    only), and <work>/haicc written;
# 3. then ./haicc boot (stage 2: the host's other prerequisites,
#    haiccing/install).
# What it prints goes to <work>/.haicc/log/haicc.log as well (a header and a
# close line, files of 10 KB), as every haicc command's does. No secrets.
set -u
here=$(cd "$(dirname "$0")" && pwd)
haiccing=$(cd "$here/../../.." && pwd)
work=$(dirname "$haiccing")
install=$work/.haicc
logdir=$install/log
mkdir -p "$logdir"
# Its output, to the log too (the exit code kept through the pipe).
if [ -z "${HAICC_BOOT_LOGGING:-}" ]; then
  export HAICC_BOOT_LOGGING=1
  log=$logdir/haicc.log
  if [ -f "$log" ] && [ "$(wc -c < "$log")" -ge 10240 ]; then
    n=$(ls "$logdir" | sed -n 's/^haicc\.\([0-9]*\)\.log$/\1/p' | sort -n | tail -1); mv "$log" "$logdir/haicc.$(( ${n:-0} + 1 )).log"
  fi
  t0=$(date +%s)
  echo "== $(date -u +%Y-%m-%dT%H:%M:%S.000Z) haiccing/boot $*  (in $(pwd))" >> "$log"
  { sh "$0" "$@" 2>&1; echo $? > "$logdir/.boot-exit"; } | tee -a "$log"
  code=$(cat "$logdir/.boot-exit" 2>/dev/null || echo 1); rm -f "$logdir/.boot-exit"
  echo "== exit $code, $(( $(date +%s) - t0 )).0 s" >> "$log"
  [ "$code" = 0 ] || exit "$code"
  # 3. Stage 2: HAICC itself (it logs itself).
  exec "$work/haicc" boot "$@"
fi
export HAICC_HOME=$install
yes=; for a in "$@"; do [ "$a" = --yes ] && yes=--yes; done
echo "haicc-base-boot $(cat "$here/VERSION"): stage 1, the work folder $work"

# 1. Step 0.
echo "Checking what HAICC needs to run..."
if ! sh "$here/step0.sh" check; then
  echo
  echo "HAICC needs what is marked 'no' above to run."
  sh "$here/step0.sh" fix $yes || { echo; echo "HAICC cannot run yet: fix what is marked 'no' (sh $here/step0.sh fix), then haiccing/boot again"; exit 1; }
fi
[ -x "$install/node/bin/node" ] && PATH=$install/node/bin:$PATH && export PATH

# 2. The root's part of HAICC: this module, copied out at the first boot.
if [ -f "$install/haicc-base-boot/haicc.js" ]; then
  there=$(cat "$install/haicc-base-boot/VERSION"); this=$(cat "$here/VERSION")
  if [ "$there" = "$this" ]; then echo "  the root's HAICC: there (copied at the first boot)"
  else echo "  the root's HAICC: $there is there, this setup is $this: kept, no updates yet (a new work folder has $this)"; fi
else
  echo "  copying the root's HAICC into $install..."
  rm -rf "$install/haicc-base-boot.new" && cp -a "$here" "$install/haicc-base-boot.new" && rm -rf "$install/haicc-base-boot.new/test" && mv "$install/haicc-base-boot.new" "$install/haicc-base-boot"
  echo "  copied the root's HAICC (haicc-base-boot $(cat "$here/VERSION")) into $install/haicc-base-boot"
fi
cat > "$work/haicc.new" <<EOS
#!/bin/sh
# HAICC for this work folder (written by haiccing/boot): ./haicc <command>
work=\$(cd "\$(dirname "\$0")" && pwd)
HAICC_WORK=\$work; HAICC_HOME=\$work/.haicc; export HAICC_WORK HAICC_HOME
[ -x "\$HAICC_HOME/node/bin/node" ] && PATH=\$HAICC_HOME/node/bin:\$PATH
exec node "\$HAICC_HOME/haicc-base-boot/haicc.js" "\$@"
EOS
chmod 755 "$work/haicc.new" && mv "$work/haicc.new" "$work/haicc"
echo "  written $work/haicc"
echo "Stage 1 done. Now the host's prerequisites (./haicc boot)."
