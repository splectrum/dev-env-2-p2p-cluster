// Waits for SIGTERM, handled through process.on (bare-node-process under
// Bare, Node's own process under Node), and says whether it arrived.
import process from 'node:process'
const t0 = Date.now()
process.on('SIGTERM', () => {
  console.log(JSON.stringify({ handled: true, ms: Date.now() - t0 }))
  process.exit(0)
})
setTimeout(() => { console.log(JSON.stringify({ handled: false })); process.exit(1) }, 10000)
console.log(JSON.stringify({ ready: true }))
