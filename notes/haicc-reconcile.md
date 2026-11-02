# haicc-reconcile

The first module of the HAICC family (`vision.md`: HAICC, human–AI
creative collaboration, the eventual tool for the whole cycle from idea to
deployment). `haicc-reconcile` is its deployment stage: a module declares
what it needs; the tool checks it, plans what is missing, and makes it so,
or says what only a human can do. The common pattern of deployments
(Kubernetes controllers, Terraform's plan and apply), kept small and our
own: JavaScript, records in topics, no foreign runtime.

Status: design, agreed 2026-11-02. First built in step 9.

## Requirements

A requirement is a fact a module needs: `{ kind, name, want }`.
- Declared beside the module's manifest (`requires.json`), read once at
  the boundary.
- Two forms:
  - **named**: this exact thing (`node master on host-a`);
  - **selected**: a kind, a type, a count (`at least n`, `exactly n`) and
    a configuration (`at least 2 nodes of type storage, with ...`).
    Node types and configurations are designed later, with real
    applications; a node requirement has `type` and `config` from the
    start, so the tool grows into them without changing shape.
- Requirements may depend on others (a swarm needs the node image; the
  image needs Docker and Bare): the engine orders them.

## Providers

One provider per kind: the only place that knows that kind (single
concern). A provider:
- `observe`s what is actually there;
- `compare`s it with what is wanted;
- for the kinds it may create, `apply`s a change.

Some kinds can only be checked (the OS, native Docker, the firewall):
they report what is missing and how to fix it, and never touch the
machine.

Where providers live (knowledge stays with its concern): the machine's
generic kinds (OS, Docker, runtimes and their versions, ports, subnets,
UDP reachability, folders) in `haicc-reconcile`; the kinds a module knows
in that module (the node image in `p2p-node-manager`, swarms and nodes in
`p2p-swarm-manager`, Splectral's configuration in Splectral).

## The engine

1. **check**: each requirement is one of
   - met;
   - missing, and the tool can create it;
   - missing, and only a human can fix it (with the hint);
   - different from what is declared;
   - extra: there, and not declared.
2. **plan**: the actions that would make the fixable ones true, in
   dependency order.
3. **apply**: carry out the plan, then check again. Idempotent: applying
   again changes nothing.

A command (`check`, `plan`, `apply`) and a library (Splectral's Run calls
it with a scenario's setup).

## Modes and ownership

- **Non-strict (additive), the default**: make what is declared exist and
  be as declared; leave everything else. What is found beyond the
  manifest (an ad hoc node that joined) is reported as extra, never
  removed.
- **Strict (exact)**: also remove what is not declared. Chosen per scope,
  not per run: a demo's own host strict, a swarm with ad hoc joiners not.
- **Ownership**, in both modes: the tool changes or removes only what it
  created, which it marks as its own. Strict never removes what someone
  else started.

## Records

Every check, plan and apply is produced into a topic (`mycelium-topic`,
Kafka records): what was wanted, what was found, what was done. Splectral
can show them.

## Later

- Allocation: a free subnet, a free port as requirements the tool
  satisfies, so several setups run side by side (concurrent demos).
- `p2p-propagate`: a desired state carried across a swarm, each node
  reconciling its part with this engine.
- The same pattern on a node itself: its packages and capabilities
  checked before it starts.

## Where it lives

`pear-full-square/haicc-reconcile`: engines (all code) live in
`pear-full-square`; the HAICC prefix names its layer (`vision.md`,
organisations).
