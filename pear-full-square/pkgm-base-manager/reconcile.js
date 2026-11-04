// haicc-reconcile's provider for packages: a package as a prerequisite.
//   package   { name, from: <folder>|[<folder>], into: <install folder> }
//             installed and current (the hash of its repository beside the
//             others, not overridden); made by installing it, and what it
//             requires, from the folders of package repositories
// The install folder is the package manager's: a package installed there
// is its own to update or remove (one required by another is not removed).
import { findPackage, manifest, installed, install, uninstall, repoName } from './index.js'

const pkg = {
  observe (r) {
    const have = installed(r.want.into).packages[r.want.name] || null
    const dir = findPackage(r.want.name, r.want.from)
    return { have, available: dir ? manifest(dir).hash : null }
  },
  compare (r, a) {
    if (!a.have) return { status: 'missing', detail: a.available ? 'not installed' : `not installed, and ${repoName(r.want.name)} is not beside the others` }
    if (a.have.state !== 'installed') return { status: 'different', detail: 'an install was interrupted' }
    if (a.have.overrides) return { status: 'different', detail: `overridden: ${Object.keys(a.have.overrides).join(', ')}` }
    if (a.available && a.available !== a.have.hash) return { status: 'different', detail: `${a.have.hash.slice(0, 12)} installed, ${a.available.slice(0, 12)} available` }
    return { status: 'met', detail: a.have.hash.slice(0, 12) }
  },
  create (r) { return install(r.want.name, { from: r.want.from, into: r.want.into }) },
  owned: () => true,
  remove (r) { try { uninstall(r.want.name, { into: r.want.into }) } catch (err) { if (!/required by/.test(err.message)) throw err } },
  hint: r => `get ${repoName(r.want.name)} (https://github.com/haiccing/${repoName(r.want.name)}) and put it beside the others`
}

export const providers = { package: pkg }
