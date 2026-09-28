// Blob Worker in an opaque-origin, CSP-restricted iframe. Python never receives
// the private MessagePort or the initial message that carried it.
self.onmessage=async(event)=>{
  self.onmessage=null;
  const {job,assets,sources,port}=event.data;
  const emit=port.postMessage.bind(port),close=self.close.bind(self),now=performance.now.bind(performance);
  const send=(type,data={})=>emit({...data,type});
  const sourceURL=text=>URL.createObjectURL(new Blob([text],{type:'text/javascript'}));
  const originalWarn=console.warn;
  console.warn=(...args)=>{originalWarn(...args);send('status',{text:String(args.join(' ')).slice(0,200)});};
  try{
    // Fail closed without effective CSP; this probe has no data or remote host.
    let blocked=false;
    try{await fetch('data:text/plain,gpaw-csp-probe');}catch{blocked=true;}
    if(!blocked)throw new Error('浏览器未启用所需的网络隔离，已取消运行。');
    const {memoryFetch,runtimeBase}=await import(sourceURL(sources.offline));
    Object.defineProperty(self,'fetch',{value:memoryFetch(assets),writable:false,configurable:false});
    for(const name of ['XMLHttpRequest','WebSocket','WebTransport','EventSource','Worker','SharedWorker','BroadcastChannel']){
      Object.defineProperty(self,name,{value:undefined,writable:false,configurable:false});
    }
    const decoder=new TextDecoder();
    await import(sourceURL(decoder.decode(assets['pyodide.asm.js'])));
    const {loadPyodide}=await import(sourceURL(decoder.decode(assets['pyodide.mjs'])));
    const {createEngine}=await import(sourceURL(sources.engine));
    const engine=await createEngine({indexURL:runtimeBase,runnerSource:sources.runner,loadRuntime:loadPyodide,onStatus:text=>send('status',{text})});
    console.warn=originalWarn;
    engine.writeFiles(job.files);
    send('ready',{version:engine.version});
    const start=now(),result=await engine.run(job.code,job.filename);
    send('result',{...result,seconds:(now()-start)/1000});
  }catch(error){send('error',{message:String(error?.stack||error).slice(0,60000)});}
  finally{port.close();close();}
};
