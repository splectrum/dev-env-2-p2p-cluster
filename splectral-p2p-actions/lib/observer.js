// An action for a node's observer: a record produced into the node's
// action topic, which its manager follows (splectral-p2p-observer).
import { join } from 'node:path'
import { openTopic, folderStorage } from '../../mycelium-topic/index.js'
import { findNode } from './hosts.js'

export async function toObserver (config, uri, action, args = {}) {
  const { folder } = await findNode(config, uri)
  const t = await openTopic({ storage: folderStorage(join(folder, 'topics', 'actions')) })
  const offset = await t.produce({ value: { action, with: args } })
  return { node: uri, action, correlation: String(offset) }
}
