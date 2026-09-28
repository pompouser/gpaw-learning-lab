// Dependency-free local server; the deployed Site is still static.
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2),option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const host=option('--host','127.0.0.1'),port=Number(option('--port','8000'));
const root=await realpath(fileURLToPath(new URL('../dist/',import.meta.url)));
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.py':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=await realpath(path.join(root,pathname==='/'?'index.html':pathname));
    if(!file.startsWith(root+path.sep)||(await stat(file)).isDirectory()){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
  }catch{res.writeHead(404).end();}
}).listen(port,host,()=>console.log('Static development server ready on port '+port));
