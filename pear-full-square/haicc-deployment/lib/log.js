// HAICC's log: what a command prints (its stdout and stderr), appended as
// it is printed, in order, to the current file in <work>/log/: files of
// 10 KB, each named by its first command's start in UTC
// (20261106T103312Z.log), so the folder lists in time order and the
// newest is the current one. A command starts a new file, named by its own
// start, when the current one is over 10 KB (whole commands a file). Each
// command: a header line (its real start, the command, its folder, its
// level) and a close line (its exit code, how long it took). The setup and
// the boot's stage 1 (in shell) write the same way. The managers' copy
// (haicc-base-boot has the root's).
//   const log = openLog({ dir, command, level })   its stdout and stderr, teed from now
import { appendFileSync, mkdirSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const LIMIT = 10 * 1024
export const LEVELS = ['normal', 'verbose', 'debug']
const NAME = /^\d{8}T\d{6}Z\.log$/

// The current file (the newest), or a new one named by this start.
export function logFile (dir, start = new Date()) {
  const newest = readdirSync(dir).filter(f => NAME.test(f)).sort().at(-1)
  if (newest && statSync(join(dir, newest)).size < LIMIT) return join(dir, newest)
  return join(dir, start.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z') + '.log')
}

export function openLog ({ dir, command, level = 'normal' }) {
  mkdirSync(dir, { recursive: true })
  const t0 = Date.now()
  const file = logFile(dir, new Date(t0))
  const write = text => { try { appendFileSync(file, text) } catch {} }
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
