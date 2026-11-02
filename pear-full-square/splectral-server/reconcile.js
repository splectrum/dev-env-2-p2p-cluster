// haicc-reconcile's providers for what Splectral knows: an instance's
// configuration (repository state, apart from running) and its server
// running on top of it.
//   splectral-config   { file, config }   the configuration file, as declared;
//                      marked with its owner; removed only if ours
//   splectral-server   { config: <file>, pid: <file>, out: <file> }
//                      the server running from that configuration, detached;
//                      a server running from an older configuration is
//                      different (restarted, if ours); removed: stopped
//                      (SIGTERM, by its pid file)
import { existsSync, readFileSync, writeFileSync, rmSync, openSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { createHash } from 'node:crypto'

const cli = join(dirname(fileURLToPath(import.meta.url)), 'cli.js')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const alive = pid => { try { process.kill(pid, 0); return true } catch { return false } }
const readJson = f => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null } }
const hashOf = f => existsSync(f) ? createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16) : null

const config = {
  observe: r => existsSync(r.want.file) ? readJson(r.want.file) : null,
  compare: (r, a) => !a ? { status: 'missing' } : isDeepStrictEqual({ ...a, haicc: undefined }, { ...r.want.config, haicc: undefined }) ? { status: 'met' } : { status: 'different' },
  create (r, ctx) {
    mkdirSync(dirname(r.want.file), { recursive: true })
    writeFileSync(r.want.file, JSON.stringify({ ...r.want.config, haicc: ctx.owner }, null, 2) + '\n')
    return { file: r.want.file }
  },
  owned: (a, ctx) => a.haicc === ctx.owner,
  remove (r) { rmSync(r.want.file, { force: true }) },
  hint: () => 'this configuration was not written by this owner'
}

const server = {
  observe (r) {
    const p = existsSync(r.want.pid) ? readJson(r.want.pid) : null
    if (!p || !alive(p.pid)) return null
    return { ...p, url: (readFileSync(r.want.out, 'utf8').match(/"url":"([^"]+)"/) || [])[1] || null, current: hashOf(r.want.config) }
  },
  compare: (r, a) => !a ? { status: 'missing' } : a.config === a.current ? { status: 'met', detail: { url: a.url, pid: a.pid } } : { status: 'different', detail: 'started from an older configuration' },
  async create (r, ctx, a) {
    if (a) await server.remove(r, ctx, a)
    const out = openSync(r.want.out, 'w')
    const child = spawn(process.execPath, [cli, `--config=${r.want.config}`], { detached: true, stdio: ['ignore', out, out] })
    child.unref()
    writeFileSync(r.want.pid, JSON.stringify({ pid: child.pid, owner: ctx.owner, config: hashOf(r.want.config) }) + '\n')
    for (let i = 0; i < 120; i++) {
      const text = readFileSync(r.want.out, 'utf8')
      const m = text.match(/"url":"([^"]+)"/)
      if (m) return { url: m[1], pid: child.pid }
      if (!alive(child.pid)) throw new Error(`the server stopped: ${text.trim().split('\n').pop()}`)
      await sleep(250)
    }
    throw new Error('the server did not listen within 30 s')
  },
  owned: (a, ctx) => a.owner === ctx.owner,
  async remove (r, ctx, a) {
    try { process.kill(a.pid, 'SIGTERM') } catch {}
    for (let i = 0; i < 40 && alive(a.pid); i++) await sleep(250)
    rmSync(r.want.pid, { force: true })
  },
  hint: () => 'a server not started by this owner'
}

export const providers = { 'splectral-config': config, 'splectral-server': server }
