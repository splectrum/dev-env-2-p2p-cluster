# Handover: publishing the haiccing packages (for the local agent)

Written 2026-11-04 after phase 3, step 1. The cloud session cannot push to
`github.com/haiccing` (the Claude GitHub App is not installed for that
organisation there; `haiccing/base-package-splectral` is not visible to it
at all). The `pear-full-square` products are merged from the session; the
`haiccing` repositories need a machine with push access: the local agent.

## What to publish

The eight `haiccing` repositories, each written by the package manager
from this repository (`packages.json`):
`base-package-third-party`, `-mycelium`, `-haicc`, `-pkgm`, `-p2p`,
`-splectral`, and the demo projects `base-demo-liveness`,
`base-demo-other-host` (now packages too: their project, their Splectral
component and `run.sh`; their content is replaced by what is written, the
LICENSE kept).

## How

On the local machine, in this repository at `main`:

```sh
git pull
npm install          # the third-party import is taken from node_modules (Linux x64)
sh steps/phase-3/1-packages-and-boot/5-validation/publish.sh ~/haiccing-publish
```

It clones what is not there, imports the third-party package, writes the
others (tested together first: nothing is written if a test fails),
commits each changed repository ("Written by the package manager from
dev-env-2-p2p-cluster <commit> (hash <hash>)") and pushes. `--no-push`
looks first.

- **Linux x86-64 only**: the third-party package is this platform's (in
  WSL2, inside the distribution).
- `base-package-third-party` is about 144 MB, Bare's runtime one file of
  97 MB (under GitHub's 100 MB limit; GitHub warns above 50 MB). Its first
  push takes a while.
- If `haiccing/base-package-splectral` does not exist yet, create it
  (empty, with a LICENSE like the others) first.

## Then: from scratch

With the repositories published, the from-scratch script in a demo's
readme is the check that matters: on a clean machine or a clean home
(`HAICC_HOME=$(mktemp -d)` keeps it apart):

```sh
mkdir -p ~/haiccing && cd ~/haiccing
for r in base-demo-liveness base-package-haicc base-package-pkgm base-package-third-party base-package-mycelium base-package-p2p base-package-splectral; do
  curl -fsSL https://github.com/haiccing/$r/archive/refs/heads/main.tar.gz | tar -xz && mv $r-main $r
done
sh base-demo-liveness/run.sh
```

Record what happens in `steps/phase-3/1-packages-and-boot/5-validation/local-run.md`.
