// The command line is a boundary: names are validated there, once.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

test('a name that breaks the rules is refused at the command line, before anything starts', () => {
  const folder = join(mkdtempSync(join(tmpdir(), 'nm-cli-')), 'n')
  const r = spawnSync(process.execPath, ['cli.js', 'run', `--folder=${folder}`, '--vault=/nonexistent', '--swarm=Bad_Swarm', '--name=node-1'], { encoding: 'utf8' })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /not a swarm name: Bad_Swarm/)
})
