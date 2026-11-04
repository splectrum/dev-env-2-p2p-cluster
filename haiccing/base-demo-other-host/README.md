# base-demo-other-host

Demo project: A node on another host. A two-host test cluster: host A runs the swarm (master, node-1); host B has its own manager and vault and nothing running. With Splectral and the other-host scenario: a node joins from host B by invitation.

Deployed with HAICC (`haicc-deployment`, made true by `haicc-reconcile`);
its scenario is the Splectral component of the same name
(`splectral/base-demo-other-host`), carried in this repository.

## Click and run

From a folder of `haiccing` repositories side by side (clones, or plain
copies): this one and the packages beside it (`base-package-haicc`,
`-pkgm`, `-third-party`, `-mycelium`, `-p2p`, `-splectral`). Linux x86-64,
with Docker Engine:

```sh
sh base-demo-other-host/run.sh        # HAICC kicked if needed; the demo deployed, started; the browser at http://127.0.0.1:4400
```

Press Run on the scenario's page; run it again any time: the project is
brought back to its declared state first. Then:

```sh
~/.haicc/bin/haicc test base-demo-other-host       # its packages' tests, its state as declared, its page answering
~/.haicc/bin/haicc stop base-demo-other-host       # nothing runs; the configuration kept
~/.haicc/bin/haicc teardown base-demo-other-host   # nothing of it left but its record
```

The first run asks before fixing anything on the host (step 0: Node.js
into `~/.haicc/node`, git and Docker Engine with `apt`); `--yes` agrees
beforehand.

## From scratch

On a machine with only `curl` and `tar`:

```sh
mkdir -p ~/haiccing && cd ~/haiccing
for r in base-demo-other-host base-package-haicc base-package-pkgm base-package-third-party base-package-mycelium base-package-p2p base-package-splectral; do
  curl -fsSL https://github.com/haiccing/$r/archive/refs/heads/main.tar.gz | tar -xz && mv $r-main $r
done
sh base-demo-other-host/run.sh
```

## In the development repository

Written by the package manager from `haiccing/base-demo-other-host` there (the
project and this readme), `splectral/base-demo-other-host` and HAICC's `run.sh`;
from its root, the code as it is there:

```sh
sh haicc start base-demo-other-host
```
