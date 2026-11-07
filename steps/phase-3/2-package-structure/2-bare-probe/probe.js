// What HAICC's host side does, on Bare's own modules: each said ok or FAILED.
import fs from 'bare-fs'
import path from 'bare-path'
import os from 'bare-os'
import process from 'bare-process'
import { spawn, spawnSync } from 'bare-subprocess'
import { fileURLToPath, pathToFileURL } from 'bare-url'
import crypto from 'bare-crypto'
import http from 'bare-http1'
import fetch from 'bare-fetch'
import tcp from 'bare-tcp'
import dgram from 'bare-dgram'
import readline from 'bare-readline'
import { Readable } from 'bare-stream'

let n = 0, failed = 0
const limit = (p, ms = 10000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`no answer after ${ms / 1000} s`)), ms))])
const check = async (what, fn) => { n++; try { const r = await limit(Promise.resolve().then(fn)); console.log(`ok ${n} - ${what}${r !== undefined ? `: ${r}` : ''}`) } catch (e) { failed++; console.log(`not ok ${n} - ${what}: ${e && e.message}`) } }
const tmp = path.join(os.tmpdir(), 'probe-' + Date.now())

await check('fs: mkdir -p, write, append, read, readdir', () => { fs.mkdirSync(path.join(tmp, 'a/b'), { recursive: true }); fs.writeFileSync(path.join(tmp, 'a/b/f'), 'x'); fs.appendFileSync(path.join(tmp, 'a/b/f'), 'y'); if (fs.readFileSync(path.join(tmp, 'a/b/f'), 'utf8') !== 'xy') throw new Error('content'); return fs.readdirSync(path.join(tmp, 'a')).join(',') })
await check('fs: stat mode, chmod, exec bit', () => { fs.chmodSync(path.join(tmp, 'a/b/f'), 0o755); const m = fs.statSync(path.join(tmp, 'a/b/f')).mode; if (!(m & 0o100)) throw new Error('mode ' + m); return (m & 0o777).toString(8) })
await check('fs: symlink, readlink, lstat', () => { fs.symlinkSync('b/f', path.join(tmp, 'a/l')); if (!fs.lstatSync(path.join(tmp, 'a/l')).isSymbolicLink()) throw new Error('not a link'); return fs.readlinkSync(path.join(tmp, 'a/l')) })
await check('fs: rename, copyFile, exists', () => { fs.renameSync(path.join(tmp, 'a/b/f'), path.join(tmp, 'a/b/g')); fs.copyFileSync(path.join(tmp, 'a/b/g'), path.join(tmp, 'a/h')); return [fs.existsSync(path.join(tmp, 'a/b/f')), fs.existsSync(path.join(tmp, 'a/h'))].join(',') })
await check('fs: rm -rf, rmdir', () => { fs.rmSync(path.join(tmp, 'a'), { recursive: true, force: true }); fs.rmdirSync(tmp); return fs.existsSync(tmp) })
await check('fs: mkdtemp', () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-')); fs.rmdirSync(d); return 'ok' })
await check('path: join, resolve, relative, dirname, basename', () => [path.resolve('/a/b', '../c'), path.relative('/a/b', '/a/c/d'), path.dirname('/x/y'), path.basename('/x/y.js')].join(' '))
await check('os: platform, arch, tmpdir, homedir', () => [os.platform(), os.arch(), os.tmpdir(), os.homedir()].join(' '))
await check('process: argv, env, cwd, execPath', () => [process.argv.length, typeof process.env.PATH, process.cwd(), process.execPath].join(' '))
await check('url: import.meta.url to a path, and back', () => { const p = fileURLToPath(import.meta.url); return pathToFileURL(p).href === import.meta.url ? p : 'differs' })
await check('crypto: sha256', () => crypto.createHash('sha256').update('abc').digest('hex').slice(0, 12))
await check('subprocess: spawnSync, its output and exit code, env, cwd', () => { const r = spawnSync('sh', ['-c', 'echo "$X in $(pwd)"; exit 3'], { env: { ...process.env, X: 'hi' }, cwd: os.tmpdir() }); return `${r.status} ${String(r.stdout).trim()}` })
await check('subprocess: spawn, output streamed as it comes, exit code', () => new Promise((resolve, reject) => { const c = spawn('sh', ['-c', 'echo one; sleep 0.2; printf two; exit 5'], { stdio: ['ignore', 'pipe', 'pipe'] }); const chunks = []; c.stdout.on('data', d => chunks.push(String(d))); c.on('exit', code => resolve(`exit ${code}, ${chunks.length} chunks: ${JSON.stringify(chunks)}`)); c.on('error', reject) }))
await check('subprocess: inherit stdio (a child writing to our terminal)', () => { const r = spawnSync('sh', ['-c', 'echo "  (from the child, inherited)"'], { stdio: 'inherit' }); return r.status })
await check('stdout: write, as it comes', () => { process.stdout.write('  (written)\n'); return 'ok' })
await check('readline: lines from a stream', () => new Promise(resolve => { const lines = []; const rl = readline.createInterface({ input: Readable.from(['a\nb', '\nc\n']) }); rl.on('data', l => { lines.push(String(l)); if (lines.length === 3) { rl.close(); resolve(JSON.stringify(lines)) } }) }))
await check('http1: a server; fetch: a GET to it', () => new Promise((resolve, reject) => { const s = http.createServer((req, res) => { res.end('served') }); s.listen(0, '127.0.0.1', async () => { try { const r = await fetch(`http://127.0.0.1:${s.address().port}/`); resolve(`${r.status} ${await r.text()}`) } catch (e) { reject(e) } finally { s.close() } }) }))
await check('fetch: https (through the proxy, if any)', async () => { const r = await fetch('https://registry.npmjs.org/brittle', { method: 'HEAD' }); return r.status })
await check('tcp: connect to a local port', () => new Promise((resolve, reject) => { const s = tcp.createServer(c => c.end()); s.listen(0, '127.0.0.1', () => { const c = tcp.createConnection(s.address().port, '127.0.0.1'); c.on('connect', () => { c.destroy(); s.close(); resolve('connected') }); c.on('error', reject) }) }))
await check('dgram: bind, send, receive', () => new Promise(resolve => { const a = dgram.createSocket('udp4'); a.on('message', m => { a.close(); b.close(); resolve(String(m)) }); const b = dgram.createSocket('udp4'); a.bind(0, '127.0.0.1', () => b.send(Buffer.from('ping'), a.address().port, '127.0.0.1')) }))
await check('import(): a module by file URL', async () => { fs.writeFileSync(path.join(os.tmpdir(), 'probe-m.js'), 'export const v = 42\n'); return (await import(pathToFileURL(path.join(os.tmpdir(), 'probe-m.js')).href)).v })
await check('/dev/tty: open (none here, expect an error)', () => { try { const fd = fs.openSync('/dev/tty', 'r+'); fs.closeSync(fd); return 'opened' } catch (e) { return `no terminal: ${e.code || e.message}` } })
console.log(`# tests ${n}\n# pass ${n - failed}\n# fail ${failed}`)
process.exitCode = failed ? 1 : 0
