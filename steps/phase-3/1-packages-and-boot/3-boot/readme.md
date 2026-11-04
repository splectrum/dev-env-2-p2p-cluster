# Part 3: booting

**Done**: `pear-full-square/haicc-base-boot` (HAICC's boot, step 0, the
kick, the click and run's `run.sh`) and `pear-full-square/pkgm-base-boot`
(the package manager's boot and kick), plain shell; their readmes say how.

- **Step 0** (`step0.sh check|fix`, `requirements`): each prerequisite
  with found, required, ok, and what fix would do. What HAICC needs to boot
  (Linux x86-64, Node.js 22+, git 2.25+) stops the boot; what a swarm needs
  (Docker Engine, running, rootful, native; the `docker` group) is said
  and the boot goes on (exit 3). `fix`: only with a yes, from a terminal or
  `--yes`; with neither, nothing changes. Node.js, the official release,
  checksum checked, into `~/.haicc/node`.
- **Kicking the package manager** (`base-package-pkgm/kick.sh`): HAICC's
  boot from `base-package-haicc` beside it, then the package manager
  installed by itself; `~/.haicc/bin/pkgm`.
- **Kicking HAICC** (`base-package-haicc/kick.sh`): HAICC's boot, the
  package manager's boot, HAICC's install with what it requires;
  `~/.haicc/bin/haicc`, and `~/.haicc/from` (the folder it came from).
- **Idempotent**: a second kick finds everything current.
- **Missing siblings said**, with a clone and an archive command each;
  `--fetch` gets them (git, or curl and tar).
- **From scratch**: in each package's and project's readme, `curl` and
  `tar` only.
- `HAICC_HOME` moves everything from `~/.haicc` (the validation uses it, a
  clean home each).

**Tests**: `haicc-base-boot` 4 (a host lacking Node.js and git, one lacking
only Docker, `fix --dry-run`, `fix` with no terminal, missing siblings);
`pkgm-base-boot` 1 (booted twice from a package laid out as written).

**Findings.**
- In `dash`, a failed redirection on `:` exits the shell: the terminal is
  probed in a subshell (`(exec </dev/tty)`).
- A missing sibling is found as far as the manifests beside it go: with
  `base-package-mycelium` missing, `base-package-third-party` (which only
  mycelium's manifest names) is said after it is there.
