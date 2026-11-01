# Part: requests in code

`p2p-node/requests.js`. The requester writes a request in a repository of
its own (a branch `request` holding the request folder) and sends it as a
bundle on a channel (`p2p-request`) to the node owning the target
repository; the node's intake takes it into `pending/default` once, under
its name, recording the sender's key; the node executes it with
layer/request's flow (`Status: node`) and responds on `main`; the
requester reads the response from a replica. Requests run one at a time.
Writers are not yet admitted or refused; a node's `/tmp` (for the flow's
working folder) is a small noexec tmpfs, since its root is read-only.
