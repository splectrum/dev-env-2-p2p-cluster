# The plain base: a minimal Linux with the runtime (Bare) only. No Node, no
# npm, no git. Everything else a node needs comes from repositories.
FROM debian:bookworm-slim
COPY bare /usr/local/bin/bare
ENTRYPOINT ["bare"]
