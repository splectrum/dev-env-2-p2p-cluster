// A declaration file, read once at the boundary:
//   { "owner": "...", "providers": ["<module>", ...], "requirements": [...],
//     "strict": false, "record": "<topic folder>" }
// "{here}" in any string is the file's folder; providers are modules
// exporting { providers } (paths relative to the file).
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { providers as builtin } from '../index.js'
import { validateName } from '../../mycelium-uri/index.js'

export async function readDeclaration (file) {
  const here = dirname(resolve(file))
  const text = readFileSync(file, 'utf8').replaceAll('{here}', here)
  const d = JSON.parse(text)
  if (!Array.isArray(d.requirements)) throw new Error(`${file}: no requirements`)
  for (const r of d.requirements) {
    if (!r.kind) throw new Error(`${file}: a requirement without a kind`)
    validateName(r.name || r.kind, 'requirement name')
  }
  const providers = { ...builtin }
  for (const p of d.providers || []) Object.assign(providers, (await import(pathToFileURL(resolve(here, p)).href)).providers)
  return { here, owner: d.owner || 'haicc', strict: Boolean(d.strict), record: d.record ? resolve(here, d.record) : null, requirements: d.requirements, providers }
}
