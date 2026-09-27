# Third-party runtime

The browser runtime is Pyodide 0.28.3, distributed from its official jsDelivr release endpoint:
https://cdn.jsdelivr.net/pyodide/v0.28.3/full/

Pyodide project: https://github.com/pyodide/pyodide
Pyodide license: Mozilla Public License 2.0 (MPL-2.0).
CPython and each numerical / plotting library have their own licenses.

Python wheel archives remain unmodified and contain their original license and copyright metadata. Installed packages include NumPy, SciPy, Matplotlib, contourpy, cycler, fonttools, kiwisolver, packaging, Pillow, pyparsing, python-dateutil, pytz, six, and micropip. The OpenBLAS bundle is also distributed with the runtime.

Runtime file hashes and exact package versions are recorded in:
- dist/runtime/runtime-manifest.json
- dist/runtime/pyodide-lock.json

The official GPAW and ASE tutorials are linked as sources. GPAW itself is not bundled or executed by the browser lab. Course descriptions and model examples were independently written for teaching.
