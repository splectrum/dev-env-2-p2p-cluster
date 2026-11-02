# Part 3: nodes shadow their managers

**Done.** The node manager passes its state on each change (a message on
the management channel); the boot program hands it to the node as a
line; the node keeps it read-only (`manager-shadowed`) and says it in its
status. The observer leaves those lines alone. **Found**: the manager's
`record` referred to its provisioner before its declaration (fatal at the
first record; unit tests do not provision): declared first.
