# pkgm-base-boot

The package manager's boot, in plain shell: the package manager installed
from its package (`haiccing/base-package-pkgm`) into the host's install
folder (`~/.haicc/packages`), by itself, with `~/.haicc/bin/pkgm` to run
it. Needs Node.js, which HAICC's boot sees to, and nothing else.

```sh
sh base-package-pkgm/kick.sh          # kicking the package manager: HAICC's boot (step 0), then this; exits
sh base-package-pkgm/pear-full-square/pkgm-base-boot/boot.sh <folder>   # this boot alone (HAICC's kick runs it)
```

Booting is only between HAICC and the package manager:
- kicking the package manager: HAICC's boot (`base-package-haicc` beside
  it), then this boot and install; then it exits;
- kicking HAICC: HAICC's boot, this boot and install, then HAICC's
  install by the package manager.

Idempotent: a package manager installed and current is left as it is.
`HAICC_HOME` moves everything from `~/.haicc`. It says its version
(`VERSION`); it never touches a vault.
