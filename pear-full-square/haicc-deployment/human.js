// The command's JSON line, read by a person: what was done, what is
// missing, what only a human can do (with the hints), and the URLs.
//   node cli.js <verb> <project.json> | node human.js
import { readFileSync } from 'node:fs'

const r = JSON.parse(readFileSync(0, 'utf8'))
const out = []
if (r.error) out.push(`${r.verb}: ${r.error}`)
else {
  out.push(`${r.verb} ${r.project}: ${r.ok ? 'done' : 'NOT done'}  (work: ${r.work})`)
  const x = r.result || {}
  for (const d of x.done || []) out.push(`  ${d.action.padEnd(7)} ${d.name}${d.result?.url ? `  ${d.result.url}` : ''}`)
  for (const s of [x.stopped, x.removed]) for (const n of s?.done || []) out.push(`  removed ${n}`)
  for (const f of x.failed || []) out.push(`  FAILED  ${f.name}: ${f.error || f.status}${f.hint ? `\n          ${f.hint}` : ''}`)
  for (const b of x.blocked || []) out.push(`  blocked ${b.name} (needs ${b.needs.join(', ')})`)
  const told = new Set([...(x.failed || []), ...(x.blocked || [])].map(f => f.name))
  for (const c of (x.after || x.check || []).filter(c => !told.has(c.name))) {
    if (c.status === 'met') { if (c.detail?.url) out.push(`  running ${c.name}  ${c.detail.url}`); continue }
    if (c.status === 'extra') { out.push(`  extra   ${c.name} (left as it is)`); continue }
    out.push(`  ${c.status.padEnd(7)} ${c.name}${c.hint ? `\n          ${c.hint}` : ''}`)
  }
  if (x.desired) out.push(`  desired: ${x.desired.running ? 'running' : x.desired.deployed ? 'deployed, not running' : 'nothing'}`)
}
console.log(out.join('\n'))
