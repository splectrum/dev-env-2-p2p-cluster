# Handover: publishing the haiccing packages (for the local agent)

**Done 2026-11-05**, both tasks: `steps/phase-3/1-packages-and-boot/5-validation/local-run.md`.

Written 2026-11-04 after phase 3, step 1; updated the same day. The cloud
session published the six packages (`haiccing/base-package-haicc`, `-pkgm`,
`-third-party`, `-mycelium`, `-p2p`, `-splectral`), each equal to what it
wrote and tested here, its GitHub archive checked identical (exec bits
included). It cannot push the two demo projects: a session checks out
repositories by name only, and `splectral/base-demo-liveness` and
`-other-host` already hold those names there. So two tasks are the local
agent's.

## 1. Publish the two demo projects

`haiccing/base-demo-liveness` and `haiccing/base-demo-other-host`, now
packages too (their project, their Splectral component, `run.sh`), written
by the package manager from this repository. On the local machine, in this
repository at `main`, Linux x86-64 (in WSL2, inside the distribution):

```sh
git pull
npm install
sh steps/phase-3/1-packages-and-boot/5-validation/publish.sh ~/haiccing-publish
```

It clones the eight repositories, writes them (tested together first:
nothing is written if a test fails), commits what changed and pushes. The
six packages show `unchanged`; only the two demos are committed ("Written by
the package manager from dev-env-2-p2p-cluster <commit> (hash <hash>)",
their LICENSE kept). `--no-push` looks first.

## 2. From scratch, against GitHub

The one check the session leaves to this side: the repositories as anyone
gets them, GitHub's archives, on a clean home (`HOME=$(mktemp -d)` keeps it
apart from your own `~/.haicc`):

```sh
mkdir -p ~/haiccing-scratch && cd ~/haiccing-scratch
for r in base-demo-liveness base-package-haicc base-package-pkgm base-package-third-party base-package-mycelium base-package-p2p base-package-splectral; do
  curl -fsSL https://github.com/haiccing/$r/archive/refs/heads/main.tar.gz | tar -xz && mv $r-main $r
done
sh base-demo-liveness/run.sh
```

Then Run (and Run again) on the scenario's page, `~/.haicc/bin/haicc test
base-demo-liveness`, `~/.haicc/bin/haicc teardown base-demo-liveness`; the
same for `base-demo-other-host` if time allows. Record what happens in
`steps/phase-3/1-packages-and-boot/5-validation/local-run.md`, commit and
push.

- `base-package-third-party` is about 144 MB (Bare's runtime one 97 MB
  file): its archive is the slow one.
- Step 0 asks before fixing anything on the host; on a machine with
  everything, it only checks.
