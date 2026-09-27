"""Fetch the pinned browser Python runtime and verify package hashes."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1] / 'dist' / 'runtime'
BASE = 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/'
ROOT.mkdir(parents=True, exist_ok=True)

def fetch(name, expected=None):
    path = ROOT / name
    if path.exists() and (not expected or hashlib.sha256(path.read_bytes()).hexdigest() == expected):
        return name, path.stat().st_size
    with urllib.request.urlopen(BASE + name, timeout=90) as response:
        data = response.read()
    if expected and hashlib.sha256(data).hexdigest() != expected:
        raise RuntimeError(f'Hash mismatch: {name}')
    path.write_bytes(data)
    return name, len(data)

fetch('pyodide-lock.json')
lock = json.loads((ROOT / 'pyodide-lock.json').read_text())
packages = lock['packages']
selected = set()
def include(name):
    if name in selected:
        return
    selected.add(name)
    for dep in packages[name]['depends']:
        include(dep)
for name in ['numpy', 'matplotlib', 'scipy', 'micropip']:
    include(name)
files = [(n, None) for n in ['pyodide.js', 'pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip']]
files += [(packages[n]['file_name'], packages[n]['sha256']) for n in sorted(selected)]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for result in pool.map(lambda args: fetch(*args), files):
        print(*result, flush=True)
license_path = ROOT / 'PYODIDE-LICENSE'
if not license_path.exists():
    license_path.write_bytes(urllib.request.urlopen(
        'https://cdn.jsdelivr.net/gh/pyodide/pyodide@0.28.3/LICENSE', timeout=60).read())
(ROOT / 'runtime-manifest.json').write_text(json.dumps({'version': '0.28.3', 'source': BASE,
    'files': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(ROOT.iterdir()) if p.is_file() and p.name != 'runtime-manifest.json'}}, indent=2) + '\n')
print('Runtime ready', sum(p.stat().st_size for p in ROOT.iterdir() if p.is_file()))
