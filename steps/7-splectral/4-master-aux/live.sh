#!/bin/sh
# Parts 3 and 4, live: a swarm whose every node is provisioned through the
# auxiliary swarm (the master too), every manager's records in topics.
# One JSON line per phase.
#   sh steps/7-splectral/4-master-aux/live.sh <work-dir> <phase>   (from the root)
# Phases: genesis, join, status, topics, stop, after.
set -eu
w=$1
sm=p2p-swarm-manager/cli.js
f=$w/live-swarm
case $2 in
  genesis) rm -rf "$w"; mkdir -p "$w"; node $sm genesis --swarm=live --folder="$f" --nodes="$w" --vault="$w/vault" --code=. ;;
  join) node $sm join --folder="$f" --node=node-1 ;;
  status) node $sm status --folder="$f" ;;
  topics)
    # The managers' topics, folded: what each says, and how the master got its secret.
    node --input-type=module -e "
      import { openTopic, folderStorage } from './mycelium-topic/index.js'
      import { nodeState } from './p2p-node-manager/index.js'
      const out = {}
      for (const n of ['master', 'node-1']) {
        const d = '$w/live-' + n
        const m = await (await openTopic({ storage: folderStorage(d + '/topics/manager') })).consume(0)
        const nd = await (await openTopic({ storage: folderStorage(d + '/topics/node') })).consume(0)
        const st = await nodeState(d)
        out[n] = { managerRecords: m.length, nodeRecords: nd.length, secretVia: m.filter(r => r.value.kind === 'secret-handed-over').map(r => r.value.via), status: st.status, uri: st.uri, nodeSecretReceived: nd.filter(r => r.value.kind === 'secret-received').map(r => r.value.via || 'stdin of the node') }
      }
      const s = await (await openTopic({ storage: folderStorage('$f/topics/swarm') })).consume(0)
      out.swarm = { records: s.length, kinds: [...new Set(s.map(r => r.value.kind))] }
      console.log(JSON.stringify(out))" ;;
  stop) node $sm stop --folder="$f" ;;
  after)
    # Nothing left; no secret in any topic.
    leaked=false
    for k in "$w/vault"/*.key; do grep -rqF "$(cat "$k")" "$w"/live-*/topics "$f/topics" && leaked=true; done
    printf '{"containersLeft":%s,"networksLeft":%s,"secretInTopics":%s}\n' "$(docker ps -a --filter name=p2p-live --format x | wc -l)" "$(docker network ls --filter name=p2p-live --format x | wc -l)" "$leaked" ;;
esac
