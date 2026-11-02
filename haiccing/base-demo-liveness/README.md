# base-demo-liveness

Demo project: A node goes quiet. A one-host test cluster (master, node-1) with Splectral and the liveness scenario: node-1 frozen and flagged absent, back, then leaving.

Deployed with HAICC (`haicc-deployment`, made true by `haicc-reconcile`);
its scenario is the Splectral component of the same name
(`splectral/base-demo-liveness`). From the development repository's root:

```sh
sh haicc start base-demo-liveness      # checked, deployed, started; the browser at http://127.0.0.1:4400
sh haicc stop base-demo-liveness       # nothing runs; the configuration kept
sh haicc teardown base-demo-liveness   # nothing of it left but its record
```

Press Run on the scenario's page; run it again any time: the project is
brought back to its declared state first.
