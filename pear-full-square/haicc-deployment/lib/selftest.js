// A manager's self-test: the packages copied into its packages/, tested in
// place, each as it is: its modules' own tests (each module's `test`
// script, in its folder) and the package's own (its test/*.test.js, with
// PKGM_ROOT its folder). Nothing installed, nothing changed. Each run said
// as it ends: ok or FAILED, its counts, how long; a failure with the end
// of its output.
//   const { ok, runs } = selfTest(packagesFolder, say)
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const readJson = f => JSON.parse(readFileSync(f, 'utf8'))

export function selfTest (packages, say = console.log) {
  const runs = []
  const run = (what, cmd, args, cwd, root) => {
    const t0 = Date.now()
    // Its own run, even under a test runner (NODE_TEST_CONTEXT would make
    // it report to ours instead).
    const env = { ...process.env, PKGM_ROOT: root }
    delete env.NODE_TEST_CONTEXT
    const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 })
    const out = (r.stdout || '') + (r.stderr || '')
    const count = k => Number((out.match(new RegExp(`^(?:#|ℹ) ${k} (\\d+)`, 'm')) || [])[1] || 0)
    const result = { what, ok: r.status === 0, tests: count('tests'), pass: count('pass'), fail: count('fail'), skipped: count('skipped'), ms: Date.now() - t0 }
    say(`  ${result.ok ? 'ok    ' : 'FAILED'} ${what} (${result.pass}/${result.tests}${result.skipped ? `, ${result.skipped} skipped` : ''}, ${(result.ms / 1000).toFixed(1)} s)`)
    if (!result.ok) say(out.split('\n').slice(-30).map(l => `         ${l}`).join('\n'))
    runs.push(result)
  }
  const repos = existsSync(packages) ? readdirSync(packages).filter(n => existsSync(join(packages, n, 'package.json')) && readJson(join(packages, n, 'package.json')).pkgm).sort() : []
  for (const repo of repos) {
    const dir = join(packages, repo)
    const m = readJson(join(dir, 'package.json')).pkgm
    say(`${repo}:`)
    for (const f of m.folders || []) {
      const pj = join(dir, f, 'package.json')
      if (f.startsWith('node_modules/') || !existsSync(pj)) continue
      const script = readJson(pj).scripts?.test
      if (script && existsSync(join(dir, f, 'test'))) run(`${repo}/${f}`, 'sh', ['-c', script], join(dir, f), dir)
    }
    const tests = existsSync(join(dir, 'test')) ? readdirSync(join(dir, 'test')).filter(n => n.endsWith('.test.js')).sort() : []
    if (tests.length) run(`${repo}/test`, process.execPath, ['--test', ...tests.map(t => join(dir, 'test', t))], dir, dir)
  }
  return { ok: repos.length > 0 && runs.every(r => r.ok), repos, runs }
}
