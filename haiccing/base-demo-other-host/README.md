# base-demo-other-host

Demo project: A node on another host. A two-host test cluster: host A runs the swarm (master, node-1); host B has its own manager and vault and nothing running. With Splectral and the other-host scenario: a node joins from host B by invitation.

Deployed with HAICC (`haicc-deployment`, made true by `haicc-reconcile`);
its scenario is the Splectral component of the same name
(`splectral/base-demo-other-host`), carried in this repository.

## Running it

From a work folder (`haiccing/boot` done: the setup, `base-package-haicc`'s
release, explains it), Linux x86-64 with Docker Engine:

```sh
./haicc run base-demo-other-host        # fetched with what it needs, installed, deployed, started; the browser at http://127.0.0.1:4400
```

Press Run on the scenario's page; run it again any time: the project is
brought back to its declared state first. Then:

```sh
./haicc test base-demo-other-host       # its packages' tests, its state as declared, its page answering
./haicc stop base-demo-other-host       # nothing runs; the configuration kept
./haicc teardown base-demo-other-host   # nothing of it left but its record
```

Its deployment is in the work folder's `manager/base-demo-other-host/`.

## In the development repository

Written by the package manager from `haiccing/base-demo-other-host` there (the
project and this readme) and `splectral/base-demo-other-host`; from its root, the
code as it is there:

```sh
sh haicc start base-demo-other-host
```
