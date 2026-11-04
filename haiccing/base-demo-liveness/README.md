# base-demo-liveness

Demo project: A node goes quiet. A one-host test cluster (master, node-1) with Splectral and the liveness scenario: node-1 frozen and flagged absent, back, then leaving.

Deployed with HAICC (`haicc-deployment`, made true by `haicc-reconcile`);
its scenario is the Splectral component of the same name
(`splectral/base-demo-liveness`), carried in this repository.

## Click and run

From a folder of `haiccing` repositories side by side (clones, or plain
copies): this one and the packages beside it (`base-package-haicc`,
`-pkgm`, `-third-party`, `-mycelium`, `-p2p`, `-splectral`). Linux x86-64,
with Docker Engine:

```sh
sh base-demo-liveness/run.sh        # HAICC kicked if needed; the demo deployed, started; the browser at http://127.0.0.1:4400
```

Press Run on the scenario's page; run it again any time: the project is
brought back to its declared state first. Then:

```sh
~/.haicc/bin/haicc test base-demo-liveness       # its packages' tests, its state as declared, its page answering
~/.haicc/bin/haicc stop base-demo-liveness       # nothing runs; the configuration kept
~/.haicc/bin/haicc teardown base-demo-liveness   # nothing of it left but its record
```

The first run asks before fixing anything on the host (step 0: Node.js
into `~/.haicc/node`, git and Docker Engine with `apt`); `--yes` agrees
beforehand.

## From scratch

On a machine with only `curl` and `tar`:

```sh
mkdir -p ~/haiccing && cd ~/haiccing
for r in base-demo-liveness base-package-haicc base-package-pkgm base-package-third-party base-package-mycelium base-package-p2p base-package-splectral; do
  curl -fsSL https://github.com/haiccing/$r/archive/refs/heads/main.tar.gz | tar -xz && mv $r-main $r
done
sh base-demo-liveness/run.sh
```

## In the development repository

Written by the package manager from `haiccing/base-demo-liveness` there (the
project and this readme), `splectral/base-demo-liveness` and HAICC's `run.sh`;
from its root, the code as it is there:

```sh
sh haicc start base-demo-liveness
```
