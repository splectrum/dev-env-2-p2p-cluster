#!/bin/sh
# HAICC's boot, for a work folder: run as <work>/haiccing/boot (the stub).
#   haiccing/boot [--yes]
# 1. step 0, the host's prerequisites (fixed with your yes, or the boot stops);
# 2. the repositories it needs fetched into haiccing/ from haiccing/sources;
# 3. the package manager installed (by its own code), then HAICC (by the
#    package manager), into <work>/.haicc;
# 4. <work>/haicc written: everything after is ./haicc <command>;
# 5. haiccing/install, if there: one haicc command a line, stopping at the
#    first failure; otherwise the next commands are said.
# Its output to <work>/.haicc/log/boot-<time>.log as well. No secrets.
set -u
here=$(cd "$(dirname "$0")" && pwd)
haiccing=$(cd "$here/../../.." && pwd)
work=$(dirname "$haiccing")
install=$work/.haicc
mkdir -p "$install/log"
# Everything it says, to its log too (the exit code kept through the pipe).
if [ -z "${HAICC_BOOT_LOG:-}" ]; then
  HAICC_BOOT_LOG=$install/log/boot-$(date -u +%Y%m%dT%H%M%SZ).log; export HAICC_BOOT_LOG
  { sh "$0" "$@" 2>&1; echo $? > "$HAICC_BOOT_LOG.exit"; } | tee "$HAICC_BOOT_LOG"
  code=$(cat "$HAICC_BOOT_LOG.exit" 2>/dev/null || echo 1); rm -f "$HAICC_BOOT_LOG.exit"
  exit "$code"
fi
export HAICC_HOME=$install
echo "haicc-base-boot $(cat "$here/VERSION"), $(date -u +%Y-%m-%dT%H:%M:%SZ): the work folder $work"

# 1. Step 0.
if ! sh "$here/step0.sh" check; then
  echo
  echo "HAICC needs what is marked 'no' above to boot (nodes run in Docker containers)."
  sh "$here/step0.sh" fix "$@" || { echo; echo "HAICC cannot boot yet: fix what is marked 'no' (sh $here/step0.sh fix), then haiccing/boot again"; exit 1; }
fi
[ -x "$install/node/bin/node" ] && PATH=$install/node/bin:$PATH && export PATH

# 2. The repositories: the package manager's, HAICC's and what it requires.
sh "$here/fetch.sh" "$haiccing" --requires base-package-pkgm base-package-haicc || exit 1

# 3. The package manager, by its own code; HAICC, by the package manager.
summary () { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{for(const d of JSON.parse(s).done)console.log('  '+d.package+': '+d.action)})"; }
node "$haiccing/base-package-pkgm/pear-full-square/pkgm-base-manager/cli.js" install pkgm --from="$haiccing" --into="$install/packages" --quiet | summary || exit 1
node "$install/packages/pear-full-square/pkgm-base-manager/cli.js" install haicc --from="$haiccing" --into="$install/packages" --quiet | summary || exit 1

# 4. The launcher.
cat > "$work/haicc.new" <<EOS
#!/bin/sh
# HAICC for this work folder (written by haiccing/boot): ./haicc <command>
work=\$(cd "\$(dirname "\$0")" && pwd)
HAICC_WORK=\$work; HAICC_HOME=\$work/.haicc; export HAICC_WORK HAICC_HOME
[ -x "\$HAICC_HOME/node/bin/node" ] && PATH=\$HAICC_HOME/node/bin:\$PATH
exec node "\$HAICC_HOME/packages/pear-full-square/haicc-deployment/haicc.js" "\$@"
EOS
chmod 755 "$work/haicc.new" && mv "$work/haicc.new" "$work/haicc"
echo "haicc is ready: $work/haicc"

# 5. The install file, or the next commands.
if [ -f "$haiccing/install" ]; then
  echo
  echo "haiccing/install:"
  n=0
  while IFS= read -r line || [ -n "$line" ]; do
    n=$((n + 1))
    case $line in ''|'#'*) continue ;; esac
    echo
    echo "[$n] ./haicc $line"
    # One line, one command: its words as written (no shell expansion).
    set -f; set -- $line; set +f
    "$work/haicc" "$@" </dev/null || { echo; echo "haiccing/install stopped at line $n: ./haicc $line"; exit 1; }
  done < "$haiccing/install"
  echo
  echo "haiccing/install done"
else
  echo
  echo "Next, from $work:"
  echo "  ./haicc run base-demo-liveness    a demo: fetched, installed, deployed, started"
  echo "  ./haicc list                      what is installed and deployed"
fi
