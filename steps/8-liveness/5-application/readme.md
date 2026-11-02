# Part 5: base-demo-liveness

**Done.** An application (`splectral` organisation), a scenario, "A node
goes quiet": node-1 is frozen; the master hears nothing and flags it
absent when its lease runs out; a request to it is refused at once; it is
thawed and present again; a request is answered; it is stopped gracefully
and leaves; the swarm runs on. No p2p in it: it names hosts, nodes and
the abstract world's actions.
