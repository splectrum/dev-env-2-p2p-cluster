// Generate the engine and runtime variants of the test commands from
// commands.txt (native git on Node): the same invocations and expectations,
// run with another engine or on Bare.
//   node test/variants.js
import { readFileSync, writeFileSync } from 'node:fs'

const here = new URL('.', import.meta.url)
const base = readFileSync(new URL('commands.txt', here), 'utf8')
// The base's own three-line header is replaced by each variant's.
const body = base.split('\n').slice(3)
const variants = {
  isogit: ['isomorphic-git', 'node cli.js --engine=isogit '],
  p2pgit: ['p2p-git', 'node cli.js --engine=p2pgit '],
  'bare-native': ['native git on Bare', 'bare cli.js --engine=native '],
  'bare-isogit': ['isomorphic-git on Bare', 'bare cli.js --engine=isogit '],
  'bare-p2pgit': ['p2p-git on Bare', 'bare cli.js --engine=p2pgit '],
  hyperdrive: ['p2p-git on a persisted Hyperdrive', 'node cli.js --engine=hyperdrive '],
  'bare-hyperdrive': ['p2p-git on a persisted Hyperdrive on Bare', 'bare cli.js --engine=hyperdrive ']
}
// On a Hyperdrive the fixture is built natively and imported into the
// drive's Corestore, with the variant's runtime.
const fixture = 'sh test/fixture.sh fixture'
for (const [name, [what, prefix]] of Object.entries(variants)) {
  const head = `# Test commands for mycelium-git on ${what}: generated from commands.txt\n` +
    '# by test/variants.js, with the same expectations.\n'
  let text = body.join('\n').replaceAll('node cli.js ', prefix)
  if (name.endsWith('hyperdrive')) {
    text = text.replace(fixture, `sh test/fixture-hyperdrive.sh fixture ${prefix.split(' ')[0]}`)
  }
  writeFileSync(new URL(`commands-${name}.txt`, here), head + text)
}
