// Compare two kept runs (bundles): for every response, the recorded
// invocations (results.jsonl: line, command, exit code, output) and the
// report (report.md, with commit ids and the capability's own lines left
// out, since every run deploys anew). Prints one JSON line:
// { a, b, responses, identical, differences }.
//   node steps/3-repositories/validation/compare.mjs <bundle-a> <bundle-b>
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const [a, b] = process.argv.slice(2)
const work = mkdtempSync(join(tmpdir(), 'compare-'))
const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 })
const open = (bundle, name) => { const d = join(work, name); execFileSync('git', ['clone', '-q', '--bare', bundle, d]); return d }
const ra = open(a, 'a')
const rb = open(b, 'b')
const responses = r => git(r, 'ls-tree', '--name-only', 'main:responses').trim().split('\n').sort()
const file = (r, p) => { try { return git(r, 'show', `main:${p}`) } catch { return null } }
const invocations = t => t === null ? null : t.trim().split('\n').map(l => { const x = JSON.parse(l); return { line: x.line, command: x.command, code: x.code, stdout: x.stdout } })
const report = t => t === null ? null : t.replace(/`[0-9a-f]{7}`/g, '`<commit>`')

const differences = []
const na = responses(ra)
const nb = responses(rb)
if (JSON.stringify(na) !== JSON.stringify(nb)) differences.push({ responses: { a: na, b: nb } })
for (const name of na.filter(n => nb.includes(n))) {
  const ia = invocations(file(ra, `responses/${name}/results.jsonl`))
  const ib = invocations(file(rb, `responses/${name}/results.jsonl`))
  if (JSON.stringify(ia) !== JSON.stringify(ib)) {
    const at = (ia || []).findIndex((x, i) => JSON.stringify(x) !== JSON.stringify((ib || [])[i]))
    differences.push({ response: name, file: 'results.jsonl', first: at, a: ia?.[at], b: ib?.[at] })
  }
  const pa = report(file(ra, `responses/${name}/report.md`))
  const pb = report(file(rb, `responses/${name}/report.md`))
  if (pa !== pb) differences.push({ response: name, file: 'report.md' })
}
rmSync(work, { recursive: true, force: true })
console.log(JSON.stringify({ a, b, responses: na.length, identical: differences.length === 0, differences }))
