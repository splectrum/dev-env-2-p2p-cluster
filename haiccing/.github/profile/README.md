# haiccing

Projects you can run, and the packages they need, ready to run. Everything
starts with HAICC, which declares what a project needs, checks it, and
makes it so.

## Start here

Linux on x86-64 (on Windows: inside WSL2), with `curl` and `tar`:

```sh
curl -fL --progress-bar --retry 5 --retry-all-errors --connect-timeout 20 \
     -o haicc-setup.sh https://github.com/haiccing/base-package-haicc/releases/latest/download/haicc-setup.sh \
  && sh haicc-setup.sh ~/haicc-work \
  && ~/haicc-work/haiccing/boot \
  && cd ~/haicc-work && ./haicc list
```

One command: it stops at the first step that fails (a failed download included).

The boot checks Node.js, git and Docker Engine, and fixes what is missing
only with your yes. Everything stays in the work folder, in plain sight.
Everything it does is logged in the work folder's `log/` (`~/haicc-work/log/`): files named by their start, newest last.
Running the projects from there is the next step.

Part of the [SPLectrum](https://splectrum.world) engineering infrastructure.
