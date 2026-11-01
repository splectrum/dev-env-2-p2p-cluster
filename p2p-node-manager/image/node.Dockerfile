# A node: the plain base with the node's code (the join closure), run as an
# unprivileged user. Its store and secrets are never in the image.
ARG BASE
FROM ${BASE}
COPY app /app
USER 65534:65534
ENTRYPOINT ["bare", "/app/p2p-node/cli.js"]
