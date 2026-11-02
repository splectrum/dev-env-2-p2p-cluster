// The machine's generic kinds, checked only: they report what is missing
// and how to fix it, and never touch the machine.
//   os       { platform: 'linux', arch: 'x64' }
//   docker   { native: true }              Docker Engine, rootful, not Docker Desktop
//   nodejs   { atLeast: 22 }               Node.js, its major version
//   bare     { runtime: '1.36.0' }         Bare's runtime: the binary images are built with
//   subnet   { cidr: '172.34.0.0/24', network }   free, or held by that Docker network
//   udp      { network: 'bridge' }         a container reaches the host's address on it by UDP
import { execFileSync, spawnSync } from 'node:child_process'
import dgram from 'node:dgram'

const run = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null } }
const exact = (want, actual, keys) => keys.every(k => want[k] === undefined || actual[k] === want[k])

export const os = {
  observe: () => ({ platform: process.platform, arch: process.arch }),
  compare: (r, a) => exact(r.want, a, ['platform', 'arch']) ? { status: 'met' } : { status: 'different', detail: a },
  hint: r => `this needs ${r.want.platform}/${r.want.arch}: on Windows, inside WSL2`
}

export const docker = {
  observe () {
    const out = run('docker', ['info', '--format', '{{json .}}'])
    if (!out) return null
    const info = JSON.parse(out)
    return {
      server: info.ServerVersion,
      os: info.OperatingSystem,
      rootless: (info.SecurityOptions || []).some(o => /rootless/.test(o)),
      desktop: /Docker Desktop/i.test(info.OperatingSystem || '')
    }
  },
  compare: (r, a) => {
    if (!a) return { status: 'missing' }
    const native = !a.rootless && !a.desktop
    return r.want.native && !native ? { status: 'different', detail: a } : { status: 'met', detail: { server: a.server } }
  },
  hint: (r, a) => !a ? 'Docker Engine is not running (or not installed): start it, and check with docker info'
    : 'Docker Desktop and rootless Docker are not enough: the managers on the host must reach the networks\' addresses; use Docker Engine, rootful (in WSL2, inside the distribution)'
}

export const nodejs = {
  observe: () => ({ version: process.versions.node }),
  compare: (r, a) => Number(a.version.split('.')[0]) >= (r.want.atLeast ?? 0) ? { status: 'met', detail: a } : { status: 'different', detail: a },
  hint: r => `Node.js ${r.want.atLeast} or later is needed`
}

// What images are built with: the bare package's runtime on this host
// (`bare --version` names the runtime; the build copies that binary).
export const bare = {
  observe () {
    const v = run('bare', ['--version'])
    return v ? { runtime: v.replace(/^v/, '') } : null
  },
  compare: (r, a) => !a ? { status: 'missing' } : a.runtime === r.want.runtime ? { status: 'met', detail: a } : { status: 'different', detail: a },
  // The bare package's version differs from its runtime's: the ones known.
  hint: (r, a) => `Bare's runtime ${r.want.runtime} is needed${a ? ` (found ${a.runtime})` : ''}: ${{ '1.36.0': 'npm i -g bare@1.36.2' }[r.want.runtime] || 'install the bare package with that runtime (npm i -g bare@<version>)'}`
}

export const subnet = {
  observe (r) {
    const ids = (run('docker', ['network', 'ls', '-q']) || '').split('\n').filter(Boolean)
    const held = []
    for (const id of ids) {
      const out = run('docker', ['network', 'inspect', id, '--format', '{{.Name}} {{range .IPAM.Config}}{{.Subnet}} {{end}}'])
      if (!out) continue
      const [name, ...subnets] = out.split(/\s+/).filter(Boolean)
      if (subnets.includes(r.want.cidr)) held.push(name)
    }
    const route = (run('ip', ['route']) || '').split('\n').find(l => l.startsWith(r.want.cidr.replace(/\/\d+$/, '')))
    return { heldBy: held, routed: Boolean(route) }
  },
  compare: (r, a) => {
    if (a.heldBy.length === 0 && !a.routed) return { status: 'met', detail: 'free' }
    if (r.want.network && a.heldBy.length === 1 && a.heldBy[0] === r.want.network) return { status: 'met', detail: `held by ${r.want.network}` }
    if (a.heldBy.length === 0 && a.routed) return { status: 'different', detail: 'routed by the host' }
    return { status: 'different', detail: { heldBy: a.heldBy } }
  },
  hint: (r, a) => `the subnet ${r.want.cidr} is taken (${a.heldBy.length ? `by ${a.heldBy.join(', ')}` : 'routed'}): free it, or choose another`
}

// A container on the network sends one datagram to the network's gateway
// (the host), where this process listens: the firewall lets it through.
export const udp = {
  async observe (r) {
    const net = r.want.network || 'bridge'
    const gw = run('docker', ['network', 'inspect', net, '--format', '{{range .IPAM.Config}}{{.Gateway}}{{end}}'])
    if (!gw) return null
    const sock = dgram.createSocket('udp4')
    await new Promise((resolve, reject) => sock.bind(0, gw, resolve).once('error', reject))
    const port = sock.address().port
    const got = new Promise(resolve => { sock.once('message', () => resolve(true)); setTimeout(() => resolve(false), 8000) })
    const image = r.want.image || 'debian:bookworm-slim'
    spawnSync('docker', ['run', '--rm', '--network', net, image, 'bash', '-c', `for i in 1 2 3; do echo ok > /dev/udp/${gw}/${port}; sleep 0.3; done`], { stdio: 'ignore', timeout: 30000 })
    const reached = await got
    sock.close()
    return { gateway: gw, reached }
  },
  compare: (r, a) => !a ? { status: 'missing', detail: `no network ${r.want.network || 'bridge'}` } : a.reached ? { status: 'met', detail: a } : { status: 'different', detail: a },
  hint: (r, a) => a ? `UDP from containers to ${a.gateway} is blocked: allow it in the firewall (ports 49737 to 49741 at least)` : 'Docker\'s network is not there'
}
