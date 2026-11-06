# base-demo-liveness

Demo project: A node goes quiet. A one-host test cluster (master, node-1) with Splectral and the liveness scenario: node-1 frozen and flagged absent, back, then leaving.

Deployed with HAICC (`haicc-deployment`, made true by `haicc-reconcile`);
its scenario is the Splectral component of the same name
(`splectral/base-demo-liveness`), carried in this repository.

## Running it

From a work folder (`./boot` done: the setup, `base-package-haicc`'s
release, explains it), Linux x86-64 with Docker Engine:

```sh
./haicc run base-demo-liveness        # fetched with what it needs, installed, deployed, started; the browser at http://127.0.0.1:4400
```

Press Run on the scenario's page; run it again any time: the project is
brought back to its declared state first. Then:

```sh
./haicc test base-demo-liveness       # its packages' tests, its state as declared, its page answering
./haicc stop base-demo-liveness       # nothing runs; the configuration kept
./haicc teardown base-demo-liveness   # nothing of it left but its record
```

Its deployment is in the work folder's `manager/base-demo-liveness/`.

## In the development repository

Written by the package manager from `haiccing/base-demo-liveness` there (the
project and this readme) and `splectral/base-demo-liveness`; from its root, the
code as it is there:

```sh
sh haicc start base-demo-liveness
```
