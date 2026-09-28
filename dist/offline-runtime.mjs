// Only immutable preloaded runtime bytes. CSP separately blocks real requests.
export const runtimeBase='https://gpaw-runtime.invalid/';
export function memoryFetch(assets){
  const buffers=new Map(Object.entries(assets));
  return (input,options={})=>{
    const url=new URL(typeof input==='string'?input:(input?.href||input?.url)),name=url.pathname.slice(1);
    if(url.origin!==new URL(runtimeBase).origin||url.search||url.hash||name.includes('/')||(options.method||input?.method||'GET').toUpperCase()!=='GET'||!buffers.has(name))throw new TypeError('外部网络已禁用；只能读取预载的 Python 运行文件。');
    return Promise.resolve(new Response(buffers.get(name),{headers:{'Content-Type':name.endsWith('.wasm')?'application/wasm':'application/octet-stream'}}));
  };
}
