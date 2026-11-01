# Request: step 7, Splectral and data in topics

From the design (`main:notes/splectral.md`, `main:notes/topics.md`) and
the rules (`main:rules.md`: single concern first, records and topics,
data names). The platform's foundations, then Splectral as a viewer with
its first demo. Thin path, end to end.

## Parts, in order

1. **Validation in one place.** `mycelium-uri` is the one validator: data
   names and their URI form added. The modules' own copies of the
   segment check go (`p2p-rns`, `p2p-mrepo`, `p2p-node`'s requests, the
   vault); validation where input enters (network handlers, command-line
   arguments), internal APIs trusting their callers.
2. **`mycelium-topic`.** Topics of Kafka records, single partition, on
   host folders: produce, consume from an offset, follow, fold; segments
   named by base offset, rolled by policy, archived and sealed; committed
   offsets.
3. **The managers on topics.** The node managers' and the swarm manager's
   records produced into topics; their state files become views.
4. **A management channel for every node.** The master provisioned
   through the auxiliary swarm, as joining nodes are.
5. **The observer** (`splectral-p2p-observer`): the node's events and
   state to its manager over the management channel, named actions; the
   manager produces them into the node's topic and follows its action
   topic.
6. **The platform's core**: `splectral-contract` (with the abstract
   world), `-model`, `-transport`, `-server` (with the `file` source),
   `-shell`.
7. **The generic extensions**: `splectral-replay`, `-scenario`,
   `-timeline`.
8. **The p2p adapters**: `splectral-p2p-watchers` (sources `repository`,
   `swarm`; the managers' and observers' records mapped to the abstract
   world), `splectral-p2p-actions`.
9. **The applications**: `base-view-map`, `base-demo-other-host` (step 6
   as a scenario), agnostic of p2p.
10. **Validation and products.** Unit tests; the step 6 scenario run live
    and recorded as topics, then replayed; headless browser tests
    recorded; the product repositories merged.

## Done

All parts done, recorded in `main:steps/7-splectral/`.
