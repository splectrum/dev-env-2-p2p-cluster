// A node's self-test: the packages copied into its packages/, each tested in
// place by the package manager, bottom up (its modules' own tests, its
// swarms', its named tests). Nothing installed, nothing changed. Each run
// said as it ends: ok or FAILED, its counts, how long; a failure with the
// end of its output.
//   const { ok, repos, runs } = selfTest(packagesFolder, say)
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { testPackage } from '../../pkgm-base-manager/index.js'

const readJson = f => JSON.parse(readFileSync(f, 'utf8'))

export function selfTest (packages, say = console.log) {
  const runs = []
  const repos = existsSync(packages) ? readdirSync(packages).filter(n => existsSync(join(packages, n, 'package.json')) && readJson(join(packages, n, 'package.json')).pkgm).sort() : []
  for (const repo of repos) {
    say(`${repo}:`)
    const t = testPackage(join(packages, repo), {
      log: e => {
        if (e.kind !== 'tested') return
        say(`  ${e.ok ? 'ok    ' : 'FAILED'} ${repo}/${e.what} (${e.pass}/${e.tests}${e.skipped ? `, ${e.skipped} skipped` : ''}, ${(e.ms / 1000).toFixed(1)} s)`)
      }
    })
    for (const r of t.runs) {
      if (!r.ok) say(r.output.split('\n').slice(-30).map(l => `         ${l}`).join('\n'))
      runs.push({ ...r, what: `${repo}/${r.what}` })
    }
  }
  return { ok: repos.length > 0 && runs.every(r => r.ok), repos, runs }
}
