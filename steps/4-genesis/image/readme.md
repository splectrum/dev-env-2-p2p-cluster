# Part: the image

`p2p-node-manager/image/build.sh <dev-repository>`, from a committed state:
`bare-base:1.36.0` (debian:bookworm-slim and Bare's own binary, 238 MB) and
`p2p-node:<commit>` (the base, the modules and their dependency tree in
`/app`, development dependencies pruned, linux-x64 prebuilds only, tests
left out; user 65534; 318 MB). The code crosses the boundary here; the
image holds no secret and no store.
