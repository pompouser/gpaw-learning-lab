export async function createEngine({indexURL, runnerSource, onStatus=()=>{},loadRuntime}){
  const loadPyodide=loadRuntime||(await import('./runtime/pyodide.mjs')).loadPyodide;
  onStatus("正在启动 Python…");
  const py = await loadPyodide({indexURL, stdout:()=>{}, stderr:()=>{}});
  onStatus("正在加载 NumPy 与 Matplotlib…");
  await py.loadPackage(["numpy","matplotlib"]);
  await py.runPythonAsync(runnerSource);
  return {
    version: py.runPython("import sys; sys.version.split()[0]"),
    writeFiles(files){
      for(const file of files){
        if(!/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,99}$/.test(file.name)) throw new Error("无效的文件名");
        const bytes=typeof file.data==="string" ? new TextEncoder().encode(file.data) : new Uint8Array(file.data);
        py.FS.writeFile("/home/pyodide/"+file.name,bytes);
      }
    },
    async run(code,filename="experiment.py"){
      onStatus("正在检查所需的 Python 库…");
      await py.loadPackagesFromImports(code);
      onStatus("Python 正在计算…");
      const fn=py.globals.get("_lab_run");
      try{
        const result=fn(code,filename);
        if(typeof result!=="string"||result.length>30*1024*1024)throw new Error("输出超过安全大小限制。");
        return JSON.parse(result);
      }
      finally{fn.destroy();}
    }
  };
}
