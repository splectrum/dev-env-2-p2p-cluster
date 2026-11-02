# The plain base: a minimal Linux with the runtime (Bare) only.
FROM debian:bookworm-slim
COPY bare /usr/local/bin/bare
ENTRYPOINT ["bare"]
