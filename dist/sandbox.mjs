import {limits,validateJob,superviseRun} from './runtime-security.mjs';
import {sha256} from './sha256.mjs';
let assetPromise;
const sourceFiles={worker:'python-worker.mjs',engine:'engine.mjs',runner:'runner.py',offline:'offline-runtime.mjs'};
async function prepareAssets(onStatus){
  if(!assetPromise){
    assetPromise=(async()=>{
      onStatus('正在准备离线 Python 运行文件…');
      const response=await fetch(new URL('./runtime/runtime-manifest.json',import.meta.url));
      if(!response.ok)throw new Error('无法加载 Python 文件清单。');
      const manifest=await response.json();
      if(manifest.version!=='0.28.3'||!manifest.files)throw new Error('Python 文件清单版本不匹配。');
      const entries=Object.entries(manifest.files).filter(([name])=>!['pyodide.js','PYODIDE-LICENSE'].includes(name));
      if(entries.length>40||entries.some(([name,hash])=>!/^[a-zA-Z0-9_.-]+$/.test(name)||!/^[a-f0-9]{64}$/.test(hash)))throw new Error('Python 文件清单无效。');
      const assets={},sources={};let total=0;
      await Promise.all(entries.map(async([name,expected])=>{
        const r=await fetch(new URL('./runtime/'+name,import.meta.url));if(!r.ok)throw new Error('无法加载 Python 文件：'+name);
        const bytes=await r.arrayBuffer();total+=bytes.byteLength;if(total>80*1024*1024)throw new Error('Python 运行文件超过大小限制。');
        const hash=await sha256(bytes);
        if(hash!==expected)throw new Error('Python 文件校验失败：'+name);assets[name]=bytes;
      }));
      await Promise.all(Object.entries(sourceFiles).map(async([key,name])=>{const r=await fetch(new URL('./'+name,import.meta.url));if(!r.ok)throw new Error('无法加载计算环境。');sources[key]=await r.text();}));
      return {assets,sources};
    })().catch(error=>{assetPromise=null;throw error;});
  }
  return assetPromise;
}
// The blob worker inherits CSP from a frame without allow-same-origin.
export function sandboxDocument(nonce){
  if(!/^[a-zA-Z0-9]+$/.test(nonce))throw new Error('无效的隔离标识。');
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src 'none'; script-src 'nonce-${nonce}' blob: 'unsafe-eval' 'wasm-unsafe-eval'; worker-src blob:; child-src blob:; base-uri 'none'; form-action 'none'"><script nonce="${nonce}">
  (()=>{
    let worker;
    addEventListener('message',function init(event){
      if(event.source!==parent||event.data?.nonce!=='${nonce}')return;
      if(event.data.stop){worker?.terminate();removeEventListener('message',init);return;}
      if(worker||event.ports.length!==1)return;
      const payload=event.data.payload,port=event.ports[0];
      try{
        const url=URL.createObjectURL(new Blob([payload.sources.worker],{type:'text/javascript'}));
        worker=new Worker(url);
        worker.onerror=error=>{parent.postMessage({nonce:'${nonce}',type:'startup-error',message:String(error.message||'隔离计算环境启动失败。').slice(0,200)},'*');worker.terminate();};
        worker.postMessage({...payload,port},[port]);
      }catch(error){parent.postMessage({nonce:'${nonce}',type:'startup-error',message:String(error.message).slice(0,200)},'*');}
    });
  })();<\/script>`;
}
export function startSandbox(job,{onStatus,onReady,onResult,onError}){
  validateJob(job);
  let cancelled=false,frame,controller,preparationTimer;
  const fail=message=>{if(cancelled)return;cancelled=true;clearTimeout(preparationTimer);frame?.remove();onError(message);};
  preparationTimer=setTimeout(()=>fail('Python 运行文件准备超时，请稍后重试。'),limits.initMs);
  prepareAssets(onStatus).then(payload=>{
    if(cancelled)return;clearTimeout(preparationTimer);
    const nonce=Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('');
    frame=document.createElement('iframe');frame.hidden=true;frame.title='隔离 Python 计算环境';frame.setAttribute('sandbox','allow-scripts');frame.srcdoc=sandboxDocument(nonce);
    const channel=new MessageChannel();
    const startupError=event=>{if(event.source===frame.contentWindow&&event.data?.nonce===nonce&&event.data.type==='startup-error')controller.fail(String(event.data.message).slice(0,200));};
    window.addEventListener('message',startupError);
    controller=superviseRun({port:channel.port1,destroy:()=>{
      cancelled=true;
      window.removeEventListener('message',startupError);
      frame.contentWindow?.postMessage({nonce,stop:true},'*');
      setTimeout(()=>frame.remove(),250);
    },onStatus,onReady,onResult,onError});
    frame.onload=()=>{frame.onload=null;if(!cancelled)frame.contentWindow.postMessage({nonce,payload:{...payload,job}},'*',[channel.port2]);};
    document.body.append(frame);
  }).catch(error=>fail(error.message));
  return {cancel(){if(controller)controller.cancel();else fail('已停止运行。');}};
}
