#!/bin/sh
# Probe two-networks: can a master on two networks (its host's swarm network
# and the hosts' LAN) be reached from both, and can peers on different
# networks reach each other? Three containers from the plain base (Bare):
#   master   on swarm (.2) and lan (.2), its DHT bound to <master-bind>
#   local    on swarm (.3): host A's other node
#   remote   on lan (.10) only: the node on another host
#   (variant one-network: remote on swarm (.10) instead, nothing else of
#   host A's: the swarm's network spanning the hosts, as an overlay would)
# Prints one JSON line: { variant, local, remote, master }.
#   sh run.sh <variant> <master-bind> [lan|swarm]   (from the root)
#   master-bind: 0.0.0.0, or the swarm address; the third, remote's network
set -eu
variant=$1 bind=$2 where=${3:-lan}
if [ "$where" = swarm ]; then rnet=s6-probe-swarm rip=172.38.0.10 rboot=172.38.0.2; else rnet=s6-probe-lan rip=172.39.0.10 rboot=172.39.0.2; fi
here=$(pwd)
sw=s6-probe-swarm lan=s6-probe-lan
cleanup () {
  for c in s6-master s6-local s6-remote; do docker rm -f $c >/dev/null 2>&1 || true; done
  docker network rm $sw $lan >/dev/null 2>&1 || true
}
cleanup
trap cleanup EXIT
docker network create --internal --subnet 172.38.0.0/24 --gateway 172.38.0.1 $sw >/dev/null
docker network create --internal --subnet 172.39.0.0/24 --gateway 172.39.0.1 $lan >/dev/null

docker create --name s6-master --network $sw --ip 172.38.0.2 --read-only --cap-drop ALL --security-opt no-new-privileges --user 65534:65534 -e LIFE=40000 -v "$here:/app:ro" bare-base /app/steps/6-other-host/probe/peer.mjs master "$bind" 49737 172.38.0.2 >/dev/null
docker network connect --ip 172.39.0.2 $lan s6-master
docker start s6-master >/dev/null
for i in $(seq 1 30); do docker logs s6-master 2>&1 | grep -q '"ready"' && break; sleep 1; done
docker create --name s6-local --network $sw --ip 172.38.0.3 --read-only --cap-drop ALL --security-opt no-new-privileges --user 65534:65534 -e WAIT=20000 -e LINGER=8000 -v "$here:/app:ro" bare-base /app/steps/6-other-host/probe/peer.mjs peer local 172.38.0.3 172.38.0.2:49737 master remote >/dev/null
docker create --name s6-remote --network $rnet --ip $rip --read-only --cap-drop ALL --security-opt no-new-privileges --user 65534:65534 -e WAIT=20000 -e LINGER=8000 -v "$here:/app:ro" bare-base /app/steps/6-other-host/probe/peer.mjs peer remote $rip $rboot:49737 master local >/dev/null
docker start s6-local s6-remote >/dev/null
docker wait s6-local s6-remote >/dev/null
local=$(docker logs s6-local 2>&1 | tail -1)
remote=$(docker logs s6-remote 2>&1 | tail -1)
docker wait s6-master >/dev/null
master=$(docker logs s6-master 2>&1 | tail -1)
printf '{"variant":"%s","masterBind":"%s","local":%s,"remote":%s,"master":%s}\n' "$variant" "$bind" "$local" "$remote" "$master"
