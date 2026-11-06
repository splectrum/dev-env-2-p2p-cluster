// HAICC's log: what a command prints (its stdout and stderr), appended to
// <install>/log/haicc.log as it is printed, in order; a header line before
// each command (the time, the command as typed, its folder, its level) and
// a close line after (its exit code, how long it took). Files up to a size
// limit (10 KB), checked as a command starts: then haicc.log becomes
// haicc.<n>.log and the command starts a new one (a file holds whole
// commands, so one may end a little over the limit).
// The boot (stage 1, in shell) writes the same way. The root's own copy
// (haicc-deployment has the managers').
//   const log = openLog({ dir, command, level })   its stdout and stderr, teed from now
import { appendFileSync, mkdirSync, existsSync, statSync, renameSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const LIMIT = 10 * 1024
export const LEVELS = ['normal', 'verbose', 'debug']

function rotate (dir) {
  const file = join(dir, 'haicc.log')
  if (!existsSync(file) || statSync(file).size < LIMIT) return
  const n = readdirSync(dir).map(f => /^haicc\.(\d+)\.log$/.exec(f)).filter(Boolean).reduce((m, x) => Math.max(m, Number(x[1])), 0) + 1
  renameSync(file, join(dir, `haicc.${n}.log`))
}

export function openLog ({ dir, command, level = 'normal' }) {
  mkdirSync(dir, { recursive: true })
  const file = join(dir, 'haicc.log')
  try { rotate(dir) } catch {}
  const write = text => { try { appendFileSync(file, text) } catch {} }
  const t0 = Date.now()
  write(`== ${new Date(t0).toISOString()} ${command.join(' ')}  (in ${process.cwd()}${level === 'normal' ? '' : `, ${level}`})\n`)
  for (const stream of [process.stdout, process.stderr]) {
    const original = stream.write.bind(stream)
    stream.write = (chunk, ...rest) => { write(String(chunk)); return original(chunk, ...rest) }
  }
  process.on('exit', code => write(`== exit ${code}, ${((Date.now() - t0) / 1000).toFixed(1)} s\n`))
  return {
    level,
    verbose: LEVELS.indexOf(level) >= 1,
    debug: LEVELS.indexOf(level) >= 2
  }
}
