import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, symlinkSync, rmSync, chmodSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = dirname(dirname(fileURLToPath(import.meta.url)))
const UTILS = ['sh', 'awk', 'sed', 'sort', 'grep', 'tr', 'head', 'cut', 'id', 'uname', 'getent', 'cat', 'mktemp', 'rm', 'dirname', 'printf']

// A host as step 0 sees it: only the given commands (fakes) and the shell's
// utilities on PATH.
function host (fakes) {
  const dir = mkdtempSync(join(tmpdir(), 'step0-'))
  const bin = join(dir, 'bin')
  mkdirSync(bin)
  for (const u of UTILS) { const p = execFileSync('sh', ['-c', `command -v ${u}`], { encoding: 'utf8' }).trim(); if (p.startsWith('/')) symlinkSync(p, join(bin, u)) }
  for (const [name, script] of Object.entries(fakes)) { writeFileSync(join(bin, name), `#!/bin/sh\n${script}\n`); chmodSync(join(bin, name), 0o755) }
  return { dir, run: (...args) => spawnSync(join(bin, 'sh'), [join(here, 'step0.sh'), ...args], { encoding: 'utf8', env: { PATH: bin, HOME: dir, HAICC_WORK: dir }, input: '' }) }
}
const row = (out, name) => out.split('\n').find(l => l.startsWith(name + ' '))?.split(/\s{2,}/)

test('check: Node.js too old (exit 1), with found, required and the fix; only what HAICC needs to run', () => {
  const h = host({ node: 'echo v20.11.0', git: 'echo git version 2.20.1' })
  try {
    const r = h.run('check')
    assert.equal(r.status, 1, r.stdout)
    assert.deepEqual(row(r.stdout, 'node').slice(0, 4), ['node', 'v20.11.0', '22 or later', 'no'])
    assert.match(row(r.stdout, 'node')[4], /into .*\/nodejs, no sudo/)
    assert.equal(row(r.stdout, 'os')[3], process.arch === 'x64' && process.platform === 'linux' ? 'yes' : 'no')
    assert.equal(row(r.stdout, 'git'), undefined, 'git and Docker: stage 2, HAICC itself')
    assert.equal(row(r.stdout, 'docker'), undefined)
  } finally { rmSync(h.dir, { recursive: true, force: true }) }
})

test('check: Node.js there (exit 0); without it, fix --dry-run says what it would do', () => {
  const h = host({ node: 'echo v22.3.0' })
  try {
    assert.equal(h.run('check').status, 0)
  } finally { rmSync(h.dir, { recursive: true, force: true }) }
  const g = host({})
  try {
    const f = g.run('fix', '--dry-run')
    assert.match(f.stdout, /would: install Node\.js 22/)
  } finally { rmSync(g.dir, { recursive: true, force: true }) }
})

test('fix without a terminal and without --yes changes nothing', () => {
  const h = host({ git: 'echo git version 2.43.0' })
  try {
    const f = spawnSync(execFileSync('sh', ['-c', 'command -v setsid'], { encoding: 'utf8' }).trim(), ['-w', join(h.dir, 'bin', 'sh'), join(here, 'step0.sh'), 'fix'], { encoding: 'utf8', env: { PATH: join(h.dir, 'bin'), HOME: h.dir, HAICC_WORK: h.dir }, input: '' })
    assert.match(f.stdout, /not fixed \(no terminal to ask; --yes to agree\): install Node\.js/)
    assert.ok(!existsSync(join(h.dir, 'nodejs')))
  } finally { rmSync(h.dir, { recursive: true, force: true }) }
})

test('fix --yes: Node.js installed into the home, and the check after it finds it', () => {
  const h = host({})
  try {
    // The release, as a fake curl serves it: a tar with a bin/node, its checksum.
    const file = 'node-v22.9.9-linux-x64.tar.gz'
    const tree = join(h.dir, 'release', 'node-v22.9.9-linux-x64')
    mkdirSync(join(tree, 'bin'), { recursive: true })
    writeFileSync(join(tree, 'bin', 'node'), '#!/bin/sh\necho v22.9.9\n')
    chmodSync(join(tree, 'bin', 'node'), 0o755)
    execFileSync('tar', ['-czf', join(h.dir, file), '-C', join(h.dir, 'release'), 'node-v22.9.9-linux-x64'])
    const sum = execFileSync('sha256sum', [join(h.dir, file)], { encoding: 'utf8' }).split(' ')[0]
    const tools = join(h.dir, 'bin')
    writeFileSync(join(tools, 'curl'), `#!/bin/sh\nfor a in "$@"; do last=$a; case $a in */SHASUMS256.txt) sums=1 ;; esac; done\nif [ -n "$sums" ]; then echo "${sum}  ${file}" > "$last"; else cp "${join(h.dir, file)}" "$last"; fi\n`)
    chmodSync(join(tools, 'curl'), 0o755)
    for (const u of ['tar', 'sha256sum', 'gzip', 'mkdir', 'mv', 'cp', 'sleep', 'wc', 'tail']) symlinkSync(execFileSync('sh', ['-c', `command -v ${u}`], { encoding: 'utf8' }).trim(), join(tools, u))
    const f = h.run('fix', '--yes')
    assert.match(f.stdout, /downloading node-v22\.9\.9.*\n(.*\n)*.*checksum.*\n.*unpacking.*\ninstalled: Node\.js v22\.9\.9/, f.stdout + f.stderr)
    assert.equal(row(f.stdout.split('installed:')[1], 'node')[1], 'v22.9.9')
    assert.equal(f.status, 0, f.stdout + f.stderr)
  } finally { rmSync(h.dir, { recursive: true, force: true }) }
})

test('download: a lost connection is tried again and said; not found is not tried again', () => {
  const h = host({})
  try {
    const tools = join(h.dir, 'bin')
    for (const u of ['sleep', 'wc', 'tail']) symlinkSync(execFileSync('sh', ['-c', `command -v ${u}`], { encoding: 'utf8' }).trim(), join(tools, u))
    // The fake curl: fails once with a lost connection, then delivers; or says 404.
    writeFileSync(join(tools, 'curl'), `#!/bin/sh\nfor a in "$@"; do last=$a; url=$prev; prev=$a; case $a in *missing*) echo "curl: (22) 404" >&2; exit 22 ;; esac; done\nif [ ! -f "$last.once" ]; then : > "$last.once"; echo "curl: (28) too slow" >&2; exit 28; fi\necho done > "$last"\n`)
    chmodSync(join(tools, 'curl'), 0o755)
    const dl = url => spawnSync(join(tools, 'sh'), ['-c', `. ${join(here, 'lib', 'download.sh')}; download ${url} ${join(h.dir, 'out')}`], { encoding: 'utf8', env: { PATH: tools, DL_WAIT: '0' } })
    const ok = dl('https://x/there')
    assert.equal(ok.status, 0, ok.stdout + ok.stderr)
    assert.match(ok.stdout, /connection lost \(curl: \(28\) too slow\): trying again in 0 s, 2 of 6/)
    const no = dl('https://x/missing')
    assert.equal(no.status, 1)
    assert.match(no.stdout, /not available: curl: \(22\) 404/)
    assert.doesNotMatch(no.stdout, /trying again/)
  } finally { rmSync(h.dir, { recursive: true, force: true }) }
})

// A folder of repositories, as a source: a project requiring a package
// requiring another.
function source () {
  const dir = mkdtempSync(join(tmpdir(), 'source-'))
  const repo = (r, pkgm) => { mkdirSync(join(dir, r), { recursive: true }); writeFileSync(join(dir, r, 'package.json'), JSON.stringify({ name: r, pkgm })) }
  repo('base-demo-x', { package: 'demo-x', requires: ['b'] })
  repo('base-package-b', { package: 'b', requires: ['c'] })
  repo('base-package-c', { package: 'c', requires: [] })
  mkdirSync(join(dir, 'base-package-c', '.git'))
  return dir
}

test('fetch: from a folder source, with what it requires, all the way down; each said', () => {
  const src = source()
  const work = mkdtempSync(join(tmpdir(), 'work-'))
  try {
    mkdirSync(join(work, 'haiccing'))
    writeFileSync(join(work, 'haiccing', 'sources'), `# test\nfolder ${join(work, 'nowhere')}\nfolder ${src}\n`)
    const r = spawnSync('sh', [join(here, 'fetch.sh'), join(work, 'haiccing'), '--requires', 'base-demo-x'], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stdout + r.stderr)
    for (const repo of ['base-demo-x', 'base-package-b', 'base-package-c']) assert.ok(existsSync(join(work, 'haiccing', repo, 'package.json')), repo)
    assert.ok(!existsSync(join(work, 'haiccing', 'base-package-c', '.git')), 'plain copies, no .git')
    assert.deepEqual(r.stdout.trimEnd().split('\n').filter(l => l.startsWith('  fetched')), ['base-demo-x', 'base-package-b', 'base-package-c'].map(x => `  fetched ${x} (folder ${src})`))
    // Already there: kept, not fetched again.
    const again = spawnSync('sh', [join(here, 'fetch.sh'), join(work, 'haiccing'), '--requires', 'base-demo-x'], { encoding: 'utf8' })
    assert.equal(again.status, 0)
    assert.equal(again.stdout, '')
    // In none of the sources: said, recorded, exit 1.
    const m = spawnSync('sh', [join(here, 'fetch.sh'), join(work, 'haiccing'), 'base-package-nope'], { encoding: 'utf8' })
    assert.equal(m.status, 1)
    assert.match(m.stdout, /base-package-nope: in none of the sources/)
  } finally { for (const d of [src, work]) rmSync(d, { recursive: true, force: true }) }
})

test('the setup: a self-extracting release, extracting haiccing/ (boot, sources, the package)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-'))
  try {
    // base-package-haicc in miniature: its manifest and this boot.
    const pkg = join(dir, 'base-package-haicc')
    mkdirSync(join(pkg, 'modules', 'pear-full-square'), { recursive: true })
    execFileSync('cp', ['-a', here, join(pkg, 'modules', 'pear-full-square', 'haicc-base-boot')])
    writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'base-package-haicc', pkgm: { package: 'haicc', hash: 'abcdef1234567890' } }))
    execFileSync('sh', [join(here, 'release.sh'), pkg, join(dir, 'haicc-setup.sh')])
    const work = join(dir, 'work')
    const r = spawnSync('sh', [join(dir, 'haicc-setup.sh'), work, `--sources=folder:${dir}/repos`, '--sources=github:haiccing'], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stdout + r.stderr)
    assert.match(r.stdout, /next: .*\/work\/boot/)
    assert.ok(existsSync(join(work, 'haiccing', 'base-package-haicc', 'modules', 'pear-full-square', 'haicc-base-boot', 'boot.sh')))
    // The stubs, ./boot and ./shutdown: executable, naming their setup.
    for (const s of ['boot', 'shutdown']) {
      assert.ok(statSync(join(work, s)).mode & 0o100)
      assert.match(readFileSync(join(work, s), 'utf8'), new RegExp(`base-package-haicc/modules/pear-full-square/haicc-base-boot/${s}\\.sh`))
    }
    assert.deepEqual(readFileSync(join(work, 'haiccing', 'sources'), 'utf8').split('\n').filter(l => l && !l.startsWith('#')), [`folder ${dir}/repos`, 'github haiccing'])
    // Logged from the start: the setup's own lines in the work folder's log.
    // in a file named by its start (UTC), listing in time order; its real start, its duration.
    const logs = readdirSync(join(work, 'log'))
    assert.equal(logs.length, 1)
    assert.match(logs[0], /^\d{8}T\d{6}Z\.log$/)
    assert.match(readFileSync(join(work, 'log', logs[0]), 'utf8'), /^== \d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ sh haicc-setup\.sh .*\nhaicc-setup: base-package-haicc abcdef123456 .*\n(.*\n)*== exit 0, \d+ s\n$/)
    // The first boot's stage 1, on a folder with no packages/ yet: HAICC's package copied in whole.
    const stage1 = spawnSync('sh', [join(work, 'boot')], { encoding: 'utf8', env: { ...process.env, HAICC_BOOT_LOGGING: '1' } })
    assert.equal(stage1.status, 0, stage1.stdout + stage1.stderr)
    assert.ok(existsSync(join(work, 'packages', 'base-package-haicc', 'modules', 'pear-full-square', 'haicc-base-boot', 'haicc.js')), stage1.stdout + stage1.stderr)
    assert.ok(existsSync(join(work, 'haicc')))
    assert.match(readFileSync(join(work, 'haicc'), 'utf8'), /packages\/base-package-haicc\/modules\/pear-full-square\/haicc-base-boot\/haicc\.js/)
    // Nothing hidden, no install/: the work folder's shape.
    assert.deepEqual(readdirSync(work).sort(), ['boot', 'haicc', 'haiccing', 'log', 'packages', 'shutdown'])
    // Again, the same setup: said, exit 0, nothing changed.
    const again = spawnSync('sh', [join(dir, 'haicc-setup.sh'), work], { encoding: 'utf8' })
    assert.equal(again.status, 0)
    assert.match(again.stdout, /already set up with this setup/)
    // Another setup over it: both named, a new folder said, exit 1, nothing changed.
    writeFileSync(join(work, 'haiccing', 'base-package-haicc', 'package.json'), JSON.stringify({ name: 'base-package-haicc', pkgm: { package: 'haicc', hash: '0123456789abcdef' } }))
    const other = spawnSync('sh', [join(dir, 'haicc-setup.sh'), work], { encoding: 'utf8' })
    assert.equal(other.status, 1)
    assert.match(other.stdout, /has base-package-haicc 0123456789ab \(boot .*\), this one is abcdef123456 .*use a new folder/s)
    // Without --sources: GitHub.
    spawnSync('sh', [join(dir, 'haicc-setup.sh'), join(dir, 'work2')])
    assert.deepEqual(readFileSync(join(dir, 'work2', 'haiccing', 'sources'), 'utf8').split('\n').filter(l => l && !l.startsWith('#')), ['github haiccing'])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('a path for a name is refused, not cleaned into one name: a node is its swarm\'s', () => {
  const work = mkdtempSync(join(tmpdir(), 'names-'))
  try {
    const r = spawnSync(process.execPath, [join(here, 'haicc.js'), 'boot', 'hosts/master'], { encoding: 'utf8', env: { ...process.env, HAICC_WORK: work, HAICC_SWARM: '' } })
    assert.equal(r.status, 2)
    assert.match(r.stdout, /'hosts\/master': one swarm's name here; a node is its swarm's: hosts\/haicc boot master/)
    assert.ok(!existsSync(join(work, 'swarms.json')) && !existsSync(join(work, 'hosts-master')), 'nothing made')
    const s = spawnSync(process.execPath, [join(here, 'haicc.js'), 'teardown', 'a/b'], { encoding: 'utf8', env: { ...process.env, HAICC_WORK: work, HAICC_SWARM: 'hosts' } })
    assert.equal(s.status, 2)
    assert.match(s.stdout, /one node's name here \(hosts\/haicc teardown <node>\)/)
  } finally { rmSync(work, { recursive: true, force: true }) }
})
