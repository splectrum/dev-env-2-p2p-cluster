# base-demo-other-host

Demo project: A node on another host. A two-host test cluster: host A runs the swarm (master, node-1); host B has its own manager and vault and nothing running. With Splectral and the other-host scenario: a node joins from host B by invitation.

Deployed with HAICC (`haicc-deployment`, made true by `haicc-reconcile`);
its scenario is the Splectral component of the same name
(`splectral/base-demo-other-host`). From the development repository's root:

```sh
sh haicc start base-demo-other-host      # checked, deployed, started; the browser at http://127.0.0.1:4400
sh haicc stop base-demo-other-host       # nothing runs; the configuration kept
sh haicc teardown base-demo-other-host   # nothing of it left but its record
```

Press Run on the scenario's page; run it again any time: the project is
brought back to its declared state first.
