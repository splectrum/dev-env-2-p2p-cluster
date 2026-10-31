# Request: step 2, the p2p series, minimal and instrumented

From the plan (`main:notes/plan.md`, step 2). The p2p layer as a series of
modules, one concern each, composed by the application; only what the
next steps need, first.

## Parts

1. **The instrumentation contract.** One shared contract for every module:
   an observer the application gives it, receiving structured events
   (module, kind, time, peer key, resource key, bytes, outcome); audit
   (who did what) and metrics (counters). Never a secret, only facts
   about one.
2. **The modules**, each a folder on `main` with its own `package.json`
   (an id), README and unit tests, composed in one dependency tree:
   - `p2p-store`: a Corestore opened with a given primary key, in a
     storage the application places in RAM; resources by name (own, a
     namespace), by explicit keypair, or by key (a replica); no peer
     needed.
   - `p2p-dht`: a DHT node (persistent, not firewalled, in a swarm), and a
     private DHT's bootstrap of two persistent nodes.
   - `p2p-connect`: connections on the node's keypair over a DHT, joining
     topics as server or client, the membership hook; yields encrypted
     streams.
   - `p2p-replicate`: a store replicated over any stream, accounting per
     peer and resource, and holding a resource whole.
   - `p2p-channel`: messages and requests on a connection, not stored.
3. **Signals under Bare.** A graceful stop under Bare, since a SIGTERM
   handler registered through `process.on` did not fire (step 0).
4. **Validation.** Two peers on one machine (Node and Bare): a resource
   written on one, found, connected, replicated and read lazily on the
   other, a request and its answer on a channel; then one peer on the host
   and one in a hardened container. The audit and metrics of each
   recorded.
5. **The product repositories** of the five modules updated from their
   folders.

## Done

All five parts done, recorded in `main:steps/2-p2p-series/`.
