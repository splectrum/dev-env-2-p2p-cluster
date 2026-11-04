#!/bin/sh
# Phase 3, step 1, validation: the packages written from this repository,
# then everything as a person runs it, from plain folder copies and clean
# home folders. Each case's output into record/<case>.txt, its exit code
# in record/cases.txt.
#   sh run.sh <scratch folder> [case...]   (no case: all, in order)
set -u
dev=$(cd "$(dirname "$0")/../../../.." && pwd)
v=$(cd "$(dirname "$0")" && pwd)
scratch=$(mkdir -p "$1" && cd "$1" && pwd); shift
rec=$v/record
mkdir -p "$rec"
out=$scratch/out                       # the package repositories, as written
pkgm="node $dev/pear-full-square/pkgm-base-manager/cli.js"
pw=$(npm root -g)
# A folder of plain copies, side by side: <name> <repository>...
folder () { f=$scratch/$1; shift; rm -rf "$f"; mkdir -p "$f"; for r in "$@"; do cp -a "$out/$r" "$f/$r"; rm -rf "$f/$r/.git"; done; echo "$f"; }
ALL="base-package-haicc base-package-pkgm base-package-third-party base-package-mycelium base-package-p2p base-package-splectral base-demo-liveness base-demo-other-host"
fresh () { rm -rf "$scratch/home-$1"; mkdir -p "$scratch/home-$1"; echo "$scratch/home-$1"; }
# A host lacking Node.js (and Docker): only the shell's utilities, curl,
# tar and sha256sum; apt-get only says what it would do.
lacking () {
  b=$scratch/lacking-bin; rm -rf "$b"; mkdir -p "$b"
  for u in sh awk sed sort grep tr head cut id uname getent cat mktemp rm mv mkdir dirname curl tar gzip sha256sum; do ln -s "$(command -v $u)" "$b/$u"; done
  printf '#!/bin/sh\necho "(apt-get $*: not run in this validation)"\nexit 1\n' > "$b/apt-get"; chmod +x "$b/apt-get"
  ln -s "$(command -v git)" "$b/git"
  echo "$b"
}

case_ () {
  name=$1
  case $name in
    import) $pkgm import --dev="$dev" --out="$out" --quiet | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(JSON.stringify({platform:r.platform,bare:r.bare,modules:r.imported.modules,folders:r.folders.length,hash:r.hash}))" ;;
    write) $pkgm write --dev="$dev" --out="$out" | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));for(const x of r.results)for(const t of x.runs)console.log((t.ok?'ok    ':'FAILED')+' '+x.package+': '+t.what+' '+t.pass+'/'+t.tests+' '+t.ms+'ms');for(const w of r.written)console.log('written '+w.package+' '+w.hash.slice(0,12));process.exit(r.ok?0:1)" ;;
    step0-bare-debian)
      # A bare Debian: no Node.js, no git, no Docker.
      docker run --rm -v "$out/base-package-haicc:/p:ro" debian:bookworm-slim sh /p/pear-full-square/haicc-base-boot/step0.sh check ;;
    step0-fix-node)
      h=$(fresh step0); b=$(lacking)
      env -i PATH="$b" HOME="$h" sh "$out/base-package-haicc/pear-full-square/haicc-base-boot/step0.sh" check
      echo "check: exit $?"
      env -i PATH="$b" HOME="$h" sh "$out/base-package-haicc/pear-full-square/haicc-base-boot/step0.sh" fix --yes
      echo "fix: exit $?"
      ls "$h/.haicc/node/bin" ;;
    kick-pkgm-alone)
      f=$(folder only-pkgm base-package-haicc base-package-pkgm); h=$(fresh pkgm)
      HOME=$h sh "$f/base-package-pkgm/kick.sh" && echo "again:" && HOME=$h sh "$f/base-package-pkgm/kick.sh" | tail -3 && HOME=$h "$h/.haicc/bin/pkgm" list | node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync(0,'utf8')).packages))" ;;
    kick-haicc-missing)
      f=$(folder missing base-package-haicc base-package-pkgm); h=$(fresh missing)
      HOME=$h sh "$f/base-package-haicc/kick.sh"; code=$?; echo "exit $code"; [ $code = 1 ] ;;
    kick-haicc-alone)
      f=$(folder haicc base-package-haicc base-package-pkgm base-package-third-party base-package-mycelium); h=$(fresh haicc)
      HOME=$h sh "$f/base-package-haicc/kick.sh" && echo "again:" && HOME=$h sh "$f/base-package-haicc/kick.sh" | tail -6 && HOME=$h "$h/.haicc/bin/haicc" version ;;
    run-liveness)
      f=$(folder demos $ALL); h=$(fresh demos)
      HOME=$h sh "$f/base-demo-liveness/run.sh" --no-open ;;
    ui-liveness) NODE_PATH=$pw node "$dev/steps/9-click-and-run/8-validation/ui.cjs" http://127.0.0.1:4400 "$rec/screens" liveness liveness | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(JSON.stringify(r,null,1));process.exit(r.first?.outcome==='ok'&&r.second?.outcome==='ok'&&!r.pageErrors.length?0:1)" ;;
    test-liveness) HOME=$scratch/home-demos "$scratch/home-demos/.haicc/bin/haicc" test base-demo-liveness ;;
    teardown-liveness) HOME=$scratch/home-demos "$scratch/home-demos/.haicc/bin/haicc" teardown base-demo-liveness && docker ps -a --format '{{.Names}}' && docker network ls --format '{{.Name}}' | grep p2p; true ;;
    run-other-host) HOME=$scratch/home-demos sh "$scratch/demos/base-demo-other-host/run.sh" --no-open ;;
    ui-other-host) NODE_PATH=$pw node "$dev/steps/9-click-and-run/8-validation/ui.cjs" http://127.0.0.1:4400 "$rec/screens" other-host other-host | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(JSON.stringify(r,null,1));process.exit(r.first?.outcome==='ok'&&r.second?.outcome==='ok'&&!r.pageErrors.length?0:1)" ;;
    test-other-host) HOME=$scratch/home-demos "$scratch/home-demos/.haicc/bin/haicc" test base-demo-other-host ;;
    teardown-other-host) HOME=$scratch/home-demos "$scratch/home-demos/.haicc/bin/haicc" teardown base-demo-other-host && echo "left:" && docker ps -a --format '{{.Names}}' && docker network ls --format '{{.Name}}' | grep p2p; true ;;
    *) echo "no case: $name"; return 2 ;;
  esac
}

cases=${*:-import write step0-bare-debian step0-fix-node kick-pkgm-alone kick-haicc-missing kick-haicc-alone run-liveness ui-liveness test-liveness teardown-liveness run-other-host ui-other-host test-other-host teardown-other-host}
for c in $cases; do
  t0=$(date +%s)
  case_ "$c" > "$rec/$c.txt" 2>&1
  code=$?
  sed -i "s#$scratch#<scratch>#g; s#$dev#<dev>#g" "$rec/$c.txt"
  grep -v "^$c " "$rec/cases.txt" 2>/dev/null > "$rec/cases.tmp"; echo "$c exit=$code $(( $(date +%s) - t0 ))s" >> "$rec/cases.tmp"; mv "$rec/cases.tmp" "$rec/cases.txt"
  echo "$c exit=$code $(( $(date +%s) - t0 ))s"
done
