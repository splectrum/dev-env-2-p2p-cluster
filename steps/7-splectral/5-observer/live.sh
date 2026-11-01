#!/bin/sh
# Part 5, live: the observer on every node. Actions produced into each
# node's action topic, passed by its manager over the management channel,
# carried out by the observer; results on the node's topic, correlated.
# One JSON line per phase.
#   sh steps/7-splectral/5-observer/live.sh <work-dir> <phase>   (from the root)
# Phases: genesis, join, act, results, stop, after.
set -eu
w=$1
sm=p2p-swarm-manager/cli.js
f=$w/obs-swarm
case $2 in
  genesis) rm -rf "$w"; mkdir -p "$w"; node $sm genesis --swarm=obs --folder="$f" --nodes="$w" --vault="$w/vault" --code=. ;;
  join) node $sm join --folder="$f" --node=node-1 ;;
  act)
    node --input-type=module -e "
      import { openTopic, folderStorage } from './mycelium-topic/index.js'
      const out = {}
      for (const n of ['master', 'node-1']) {
        const t = await openTopic({ storage: folderStorage('$w/obs-' + n + '/topics/actions') })
        out[n] = [
          await t.produce({ value: { action: 'state' } }),
          await t.produce({ value: { action: 'write', with: { name: 'hello', text: 'Hello, ' + n + '.\\\\n' } } }),
          await t.produce({ value: { action: 'format-disk' } })
        ]
      }
      console.log(JSON.stringify({ produced: out }))" ;;
  results)
    sleep 3
    node --input-type=module -e "
      import { openTopic, folderStorage } from './mycelium-topic/index.js'
      const out = {}
      for (const n of ['master', 'node-1']) {
        const rs = (await (await openTopic({ storage: folderStorage('$w/obs-' + n + '/topics/node') })).consume(0)).filter(r => r.value.kind === 'action-result')
        const m = (await (await openTopic({ storage: folderStorage('$w/obs-' + n + '/topics/manager') })).consume(0)).filter(r => r.value.kind.startsWith('action-'))
        out[n] = { results: rs.map(r => ({ correlation: r.headers?.find(h => h.key === 'correlation')?.value, action: r.value.action, ok: r.value.ok, uri: r.value.result?.status?.uri || r.value.result?.uri, error: r.value.error })), passed: m.map(r => r.value.kind + ':' + r.value.id) }
      }
      console.log(JSON.stringify(out))" ;;
  stop) node $sm stop --folder="$f" ;;
  after)
    leaked=false
    for k in "$w/vault"/*.key; do grep -rqF "$(cat "$k")" "$w"/obs-*/topics && leaked=true; done
    printf '{"containersLeft":%s,"networksLeft":%s,"secretInTopics":%s}\n' "$(docker ps -a --filter name=p2p-obs --format x | wc -l)" "$(docker network ls --filter name=p2p-obs --format x | wc -l)" "$leaked" ;;
esac
