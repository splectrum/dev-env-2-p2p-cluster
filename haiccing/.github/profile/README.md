# haiccing

Projects you can run, and the packages they need, ready to run. Everything
starts with HAICC, which declares what a project needs, checks it, and
makes it so.

## Start here

Linux on x86-64 (on Windows: inside WSL2), with `curl` and `tar`:

```sh
curl -fsSL -o haicc-setup.sh https://github.com/haiccing/base-package-haicc/releases/latest/download/haicc-setup.sh
sh haicc-setup.sh ~/haicc-work         # a work folder, with haiccing/boot in it
~/haicc-work/haiccing/boot             # checks the machine, installs the package manager and HAICC
cd ~/haicc-work
./haicc run base-demo-liveness         # a demo: fetched, installed, deployed; the browser opens
```

The boot checks Node.js, git and Docker Engine, and fixes what is missing
only with your yes. Everything stays in the work folder, and is logged there.

Part of the [SPLectrum](https://splectrum.world) engineering infrastructure.
