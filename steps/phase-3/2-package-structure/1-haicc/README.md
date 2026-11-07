# Step 1, haicc: tested on the platform

`run.log`: the first test of the new `base-package-haicc` on the platform
(2026-11-07), 21 steps passed, by a script that lived here. That script is
now the package's own test, `base-package-haicc/test/platform` (the package
carries its tests): on any work folder,

    ./haicc boot base-package-haicc/test                    # the full set
    ./haicc boot base-package-haicc/test --set=validation   # the package as it is

This folder keeps the record only.
