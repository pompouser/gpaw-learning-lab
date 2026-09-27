import { createEngine } from "./engine.mjs";
let engine;
let starting;
const send=(type,data={})=>self.postMessage({type,...data});
async function initialize(){
  if(engine)return engine;
  if(!starting){
    starting=(async()=>{
      const r=await fetch(new URL("./runner.py",import.meta.url));
      if(!r.ok)throw new Error("无法加载 Python 执行桥");
      engine=await createEngine({indexURL:new URL("./runtime/",import.meta.url).href,
        runnerSource:await r.text(),onStatus:text=>send("status",{text})});
      return engine;
    })();
  }
  return starting;
}
self.onmessage=async({data})=>{
  try{
    if(data.type==="init"){
      const e=await initialize();send("ready",{version:e.version});
    }else if(data.type==="run"){
      const e=await initialize();
      e.writeFiles(data.files||[]);
      const start=performance.now();
      const result=await e.run(data.code,data.filename);
      send("result",{...result,seconds:(performance.now()-start)/1000});
    }
  }catch(error){
    send("error",{message:String(error?.stack||error)});
    if(!engine)starting=null;
  }
};
