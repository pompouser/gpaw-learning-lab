"""Restore the exact runtime from the source-controlled SHA-256 lock."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT / 'dist' / 'runtime'
LOCK = json.loads((PROJECT / 'scripts' / 'runtime-lock.json').read_text())
BASE = 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/'
ROOT.mkdir(parents=True, exist_ok=True)

def fetch(item):
    name, expected = item
    if Path(name).name != name or len(expected) != 64:
        raise ValueError('Invalid runtime lock entry')
    path = ROOT / name
    if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() == expected:
        return name, path.stat().st_size
    url = BASE + name if name != 'PYODIDE-LICENSE' else 'https://cdn.jsdelivr.net/gh/pyodide/pyodide@0.28.3/LICENSE'
    with urllib.request.urlopen(url, timeout=90) as response:
        data = response.read(80 * 1024 * 1024 + 1)
    if len(data) > 80 * 1024 * 1024 or hashlib.sha256(data).hexdigest() != expected:
        raise RuntimeError('Runtime integrity check failed: ' + name)
    temporary = path.with_suffix(path.suffix + '.part')
    temporary.write_bytes(data)
    temporary.replace(path)
    return name, len(data)

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for result in pool.map(fetch, LOCK['files'].items()):
        print(*result, flush=True)
(ROOT / 'runtime-manifest.json').write_text(json.dumps(LOCK, indent=2) + '\n')
print('Pinned runtime verified.')
