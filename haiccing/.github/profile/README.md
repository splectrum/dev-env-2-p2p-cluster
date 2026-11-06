# haiccing

Projects you can run, each with the packages it needs. Everything starts
with HAICC, which declares what a project needs, checks it, and makes it so.

## Start here

Linux on x86-64 (on Windows: inside WSL2), with `curl` and `tar`:

```sh
curl -fsSL -o haicc-setup.sh https://github.com/haiccing/base-package-haicc/releases/latest/download/haicc-setup.sh
sh haicc-setup.sh ~/haicc-work         # a work folder, with haiccing/boot in it
~/haicc-work/haiccing/boot             # checks the machine, installs the package manager and HAICC
cd ~/haicc-work
./haicc run base-demo-liveness         # a demo: fetched, installed, deployed; the browser opens
```

The boot checks Node.js 22+, git and Docker Engine, and fixes what is
missing only with your yes. Everything lives in the work folder, and
everything it does is logged there (`.haicc/log/`).

## Demos

| Repository | What you see |
|---|---|
| [base-demo-liveness](https://github.com/haiccing/base-demo-liveness) | A node goes quiet: frozen, flagged absent when its lease runs out, back again, then leaving gracefully. |
| [base-demo-other-host](https://github.com/haiccing/base-demo-other-host) | A node on another host joins the swarm from an invitation, takes requests, then leaves. |

## Packages

Fetched and installed for you, as a project needs them:

| Repository | Holds |
|---|---|
| [base-package-haicc](https://github.com/haiccing/base-package-haicc) | HAICC and its boot: **the entry**, and its releases are the setup |
| [base-package-pkgm](https://github.com/haiccing/base-package-pkgm) | the package manager |
| [base-package-third-party](https://github.com/haiccing/base-package-third-party) | the third-party code (Bare, the Holepunch stack, React), imported once, recorded |
| [base-package-mycelium](https://github.com/haiccing/base-package-mycelium) | the repository layer |
| [base-package-p2p](https://github.com/haiccing/base-package-p2p) | the p2p substrate: nodes, swarms, their managers |
| [base-package-splectral](https://github.com/haiccing/base-package-splectral) | Splectral, the browser platform the demos run in |

The packages are written from their modules (in
[pear-full-square](https://github.com/pear-full-square)) by the
development repository,
[splectrum/dev-env-2-p2p-cluster](https://github.com/splectrum/dev-env-2-p2p-cluster).
