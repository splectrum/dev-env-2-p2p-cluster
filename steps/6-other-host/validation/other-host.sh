#!/bin/sh
# Step 6's validation: a node on another host, end to end. One JSON line
# per phase. The other host (B) is simulated on this machine: its own
# folder, vault, node manager and auxiliary network; from host A it is
# given only the invitation, and it shares only the swarm's data plane
# (the network both hosts reach). Its requester runs in a container on
# that network at an address of its own, not host A's.
#   sh steps/6-other-host/validation/other-host.sh <work-dir> <record-dir> <phase>   (from the root)
# Phases, in order: genesis, join-node-1, invite, remote-join, isolation,
# status, request-remote-from-a, request-node-1-from-b, restart-remote,
# status-after-restart, request-remote-after-restart, remote-stop,
# status-after-remote-stop, request-node-1-after-remote-stop, stop, records.
set -eu
work=$1
rec=$2
phase=$3
sm=p2p-swarm-manager/cli.js
nm=p2p-node-manager/cli.js
v=steps/6-other-host/validation
a=$work/a b=$work/b
swarm=$a/hosts-swarm
remote=$b/hosts-remote-1
remote_ip=172.34.0.100 b_requester=172.34.0.101 b_aux=172.36.0

# Host B's node manager, detached (it outlives this script), ready when its
# state says running.
remote_start () {
  setsid node $nm join --invitation="$b/invitation.json" --folder="$remote" --vault="$b-vault" \
    --name=remote-1 --ip=$remote_ip --aux-subnet=$b_aux >> "$remote/manager.out" 2>&1 < /dev/null &
  t0=$(date +%s%3N)
  for i in $(seq 1 360); do
    if [ -f "$remote/state.json" ]; then
      st=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$remote/state.json','utf8')).status)")
      [ "$st" = running ] && break
      [ "$st" = exited ] && { echo '{"error":"exited"}'; exit 1; }
    fi
    sleep 0.5
  done
  node -e "const s=JSON.parse(require('fs').readFileSync('$remote/state.json','utf8')); console.log(JSON.stringify({ status: s.status, uri: s.uri, key: s.key, materialised: s.materialised, live: s.live, readyMs: s.readyMs, waitedMs: $(date +%s%3N) - $t0 }))"
}
remote_stop () {
  pid=$(cat "$remote/manager.pid")
  kill -TERM "$pid"
  for i in $(seq 1 120); do [ -f "$remote/manager.pid" ] || break; sleep 0.5; done
  node -e "const s=JSON.parse(require('fs').readFileSync('$remote/state.json','utf8')); console.log(JSON.stringify({ status: s.status, exitCode: s.exitCode, oomKilled: s.oomKilled, key: s.key }))"
}
# Host B's requester: a container on the data plane, at its own address.
b_request () {
  docker run --rm --network p2p-hosts --ip $b_requester --read-only --tmpfs /tmp:rw,size=64m \
    --user 65534:65534 -v "$(pwd):/app:ro" -v "$b/invitation.json:/invitation.json:ro" -w /app node:22-slim \
    node $v/request.mjs /invitation.json $b_requester "$1" "$2" /tmp
}

case $phase in
  genesis)
    rm -rf "$work" "$work-vault" "$a-vault" "$b-vault"
    mkdir -p "$a" "$b"
    node $sm genesis --swarm=hosts --folder="$swarm" --nodes="$a" --vault="$a-vault" --code=. ;;
  join-node-1) node $sm join --folder="$swarm" --node=node-1 ;;
  invite)
    # Host A gives host B the invitation, and nothing else (host A keeps a
    # copy for its own requester).
    node $sm invite --folder="$swarm" | node -e "let t='';process.stdin.on('data',d=>t+=d).on('end',()=>{const r=JSON.parse(t).result;for(const f of ['$b/invitation.json','$a/invitation.json'])require('fs').writeFileSync(f,JSON.stringify(r,null,2)+'\\n');console.log(JSON.stringify({invitation:r}))})" ;;
  remote-join)
    mkdir -p "$remote"
    docker image inspect "$(node -e "console.log(require('$b/invitation.json').image)")" --format '{"image":"{{.Id}}"}' > /dev/null
    remote_start ;;
  isolation)
    # What host B's node is attached to and given: the data plane and its
    # own host's auxiliary network; no mount; no secret in its environment.
    c=p2p-hosts-remote-1
    nets=$(docker inspect "$c" --format '{{json .NetworkSettings.Networks}}' | node -e "let t='';process.stdin.on('data',d=>t+=d).on('end',()=>console.log(JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(t)).map(([k,x])=>[k,x.IPAddress])))))")
    mounts=$(docker inspect "$c" --format '{{json .Mounts}}')
    tmpfs=$(docker inspect "$c" --format '{{json .HostConfig.Tmpfs}}')
    key=$(cat "$b-vault/hosts--remote-1.key")
    envSecret=false; docker inspect "$c" --format '{{json .Config.Env}}' | grep -qF "$key" && envSecret=true
    argsSecret=false; docker inspect "$c" --format '{{json .Args}}' | grep -qF "$key" && argsSecret=true
    aVault=$(ls "$a-vault" | node -e "let t='';process.stdin.on('data',d=>t+=d).on('end',()=>console.log(JSON.stringify(t.trim().split('\n'))))")
    bVault=$(ls "$b-vault" | node -e "let t='';process.stdin.on('data',d=>t+=d).on('end',()=>console.log(JSON.stringify(t.trim().split('\n'))))")
    inSwarmRecord=false; grep -q remote-1 "$swarm/swarm.json" && inSwarmRecord=true
    printf '{"networks":%s,"mounts":%s,"tmpfs":%s,"secretInEnv":%s,"secretInArgs":%s,"vaultA":%s,"vaultB":%s,"remoteInSwarmRecord":%s}\n' \
      "$nets" "$mounts" "$tmpfs" "$envSecret" "$argsSecret" "$aVault" "$bVault" "$inSwarmRecord" ;;
  status|status-after-restart|status-after-remote-stop) node $sm status --folder="$swarm" ;;
  request-remote-from-a)
    gw=$(node -e "console.log(require('$swarm/swarm.json').gateway)")
    node $v/request.mjs "$a/invitation.json" "$gw" remote-1 status-from-host-a "$work" ;;
  request-node-1-from-b) b_request node-1 status-from-host-b ;;
  request-remote-after-restart)
    gw=$(node -e "console.log(require('$swarm/swarm.json').gateway)")
    node $v/request.mjs "$a/invitation.json" "$gw" remote-1 status-after-restart "$work" ;;
  request-node-1-after-remote-stop) b_request node-1 status-after-remote-stop || true ;;
  restart-remote)
    before=$(remote_stop)
    after=$(remote_start)
    printf '{"before":%s,"after":%s}\n' "$before" "$after" ;;
  remote-stop) remote_stop ;;
  stop) node $sm stop --folder="$swarm" ;;
  records)
    # The records, each host's apart (never a vault), checked for secrets.
    mkdir -p "$rec/host-a/hosts-swarm" "$rec/host-b/hosts-remote-1"
    cp "$swarm/swarm.json" "$swarm/swarm.jsonl" "$rec/host-a/hosts-swarm/"
    for n in master node-1; do
      mkdir -p "$rec/host-a/hosts-$n"
      for f in node.json manager.jsonl node.jsonl state.json; do cp "$a/hosts-$n/$f" "$rec/host-a/hosts-$n/"; done
      [ -s "$a/hosts-$n/node.stderr" ] && cp "$a/hosts-$n/node.stderr" "$rec/host-a/hosts-$n/"
    done
    cp "$b/invitation.json" "$rec/host-b/"
    for f in node.json manager.jsonl node.jsonl state.json; do cp "$remote/$f" "$rec/host-b/hosts-remote-1/"; done
    [ -s "$remote/node.stderr" ] && cp "$remote/node.stderr" "$rec/host-b/hosts-remote-1/"
    leaked=false
    for k in "$a-vault"/*.key "$b-vault"/*.key; do grep -rqF "$(cat "$k")" "$rec" && leaked=true; done
    left=$(docker ps -a --filter name=p2p-hosts --format '{{.Names}}' | wc -l)
    nets=$(docker network ls --filter name=p2p-hosts --format '{{.Name}}' | wc -l)
    printf '{"secretInRecords":%s,"containersLeft":%s,"networksLeft":%s}\n' "$leaked" "$left" "$nets" ;;
esac
