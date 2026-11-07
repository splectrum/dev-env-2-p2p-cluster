# The Bare probe (2026-11-07)

Before the platform moves to Bare (the human: Bare only, `brittle` for
tests, no Node.js equivalence): what HAICC's host side does, on Bare's own
modules. Bare 1.36.0; `bare-fs` 4.8.4, `bare-subprocess` 6.2.2, `bare-tty`
5.2.2, `bare-fetch` 3.4.1, `bare-readline` 1.3.1, `bare-tcp` 2.6.1,
`bare-dgram` 1.1.1, `bare-http1` 4.6.3, `bare-url` 2.5.6, `bare-crypto`
1.15.4, `bare-os` 3.9.4, `bare-process` 4.5.1, `brittle` 4.5.0.

`probe.js` (run: `bare probe.js` with those installed), `probe.log`: 20 of 22.

**Covered**: the file system (mkdir -p, read, write, append, readdir, stat
and the exec bit, chmod, symlink, readlink, lstat, rename, copy, rm -rf,
rmdir, mkdtemp); paths; the OS (platform, arch, tmpdir, homedir); process
(argv, env, cwd, execPath, exitCode); `import.meta.url` to a path and back;
sha256; child processes: `spawnSync` (output, exit code, env, cwd), `spawn`
with output streamed as it comes (chunks, a partial last line) and its exit
code, inherited stdio; stdout written as it comes; lines from a stream;
an HTTP server and `fetch` to it; TCP; UDP; `/dev/tty` opened (none here:
ENXIO, as expected).

**Found**:
- **`fetch` over HTTPS through a proxy: no.** `bare-fetch` reads no proxy
  settings; this sandbox reaches the network only through one. Downloads
  stay in the shell (`curl`, as `fetch.sh` and stage 1 do); HTTPS from Bare
  in a proxied network: later, when something needs it.
- **Module type**: a `.js` file is an ES module only beside a
  `package.json` with `"type": "module"` (ours all have one), and that file
  is read once per folder: a test writing modules at run time writes the
  `package.json` first, or uses `.mjs`.
- **`brittle`** runs on Bare (`bare node_modules/brittle/cmd.js <files>`);
  its summary: `# tests = 3/4 pass`, `# asserts = 5/6 pass` (the package
  manager's counting reads that); exit 1 on a failure; source and stack
  shown for each.
- Reading a yes from the terminal: `/dev/tty` opens through `bare-fs`;
  `bare-tty` and `bare-readline` are there; to be checked on a terminal
  (the local agent).
