"""Execution bridge for the teaching lab. Executed by real Pyodide Python."""
import base64 as _base64
import hashlib as _hashlib
import io as _io
import json as _json
import os as _os
from pathlib import Path as _Path
import traceback as _traceback
import contextlib as _contextlib
import matplotlib as _mpl
_mpl.use("Agg")
import matplotlib.pyplot as _plt

_plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 10,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "figure.facecolor": "white",
    "savefig.facecolor": "white",
    "figure.dpi": 110,
})
_lab_figures = []
_lab_workdir = "/home/pyodide"
_os.makedirs(_lab_workdir, exist_ok=True)
_os.chdir(_lab_workdir)

class _CappedText(_io.StringIO):
    def write(self, value):
        remaining = 60000 - self.tell()
        if remaining > 0:
            super().write(value[:remaining])
        return len(value)

def _capture_figures(*args, **kwargs):
    for number in _plt.get_fignums():
        if len(_lab_figures) >= 12:
            break
        buffer = _io.BytesIO()
        _plt.figure(number).savefig(buffer, format="png", dpi=110, bbox_inches="tight")
        if buffer.tell() <= 10 * 1024 * 1024:
            _lab_figures.append(_base64.b64encode(buffer.getvalue()).decode("ascii"))
    _plt.close("all")

def _file_state():
    result = {}
    for path in _Path(_lab_workdir).iterdir():
        if path.is_file() and not path.is_symlink() and path.stat().st_size <= 10 * 1024 * 1024:
            result[path.name] = (_hashlib.sha256(path.read_bytes()).hexdigest(), path.stat().st_mtime_ns)
    return result

def _lab_run(code, filename):
    global _lab_figures
    _os.chdir(_lab_workdir)
    _plt.close("all")
    _lab_figures = []
    _plt.show = _capture_figures
    before = _file_state()
    output = _CappedText()
    error = None
    with _contextlib.redirect_stdout(output), _contextlib.redirect_stderr(output):
        try:
            namespace = {"__name__": "__main__", "__file__": filename}
            exec(compile(code, filename, "exec"), namespace, namespace)
        except BaseException as exc:
            error = "".join(_traceback.format_exception(type(exc), exc, exc.__traceback__))
            if isinstance(exc, ModuleNotFoundError) and exc.name == "gpaw":
                error += "\nGPAW 需要原生环境；请下载脚本，在安装 GPAW 的 Linux / WSL / 集群运行。\n"
        finally:
            try:
                _capture_figures()
            except Exception as exc:
                error = (error or "") + "\nFigure rendering failed: " + str(exc)
    artifacts = []
    allowed = {".png", ".jpg", ".jpeg", ".svg", ".csv", ".txt", ".dat", ".json", ".npy", ".npz", ".py"}
    total_bytes = 0
    for name, digest in _file_state().items():
        path = _Path(_lab_workdir) / name
        if before.get(name) == digest or path.suffix.lower() not in allowed:
            continue
        data = path.read_bytes()
        if len(artifacts) >= 20 or total_bytes + len(data) > 20 * 1024 * 1024:
            continue
        total_bytes += len(data)
        artifacts.append({"name": name, "data": _base64.b64encode(data).decode("ascii")})
    return _json.dumps({"output": output.getvalue(), "error": error,
                        "figures": _lab_figures, "artifacts": artifacts})
