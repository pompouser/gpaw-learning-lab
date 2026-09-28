// Validate outside the Python execution context.
export const limits=Object.freeze({code:2*1024*1024,inputFile:10*1024*1024,inputTotal:30*1024*1024,outputFile:10*1024*1024,outputTotal:20*1024*1024,text:60000,figures:12,artifacts:20,initMs:180000,runMs:90000});
const extensions=new Set(['png','jpg','jpeg','svg','csv','txt','dat','json','npy','npz','py']);
export function validName(name){return typeof name==='string'&&/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,99}$/.test(name);}
export function validateJob(job){
  if(!job||typeof job.code!=='string'||new TextEncoder().encode(job.code).length>limits.code)throw new Error('代码不能超过 2 MB。');
  if(!validName(job.filename))throw new Error('无效的脚本文件名。');
  if(!Array.isArray(job.files)||job.files.length>100)throw new Error('最多导入 100 个文件。');
  let total=0;const names=new Set();
  for(const file of job.files){
    if(!file||!validName(file.name)||names.has(file.name))throw new Error('导入文件名无效或重复。');
    names.add(file.name);
    if(typeof file.data!=='string'&&!(file.data instanceof ArrayBuffer)&&!ArrayBuffer.isView(file.data))throw new Error('导入文件内容无效。');
    const size=typeof file.data==='string'?new TextEncoder().encode(file.data).length:file.data.byteLength;
    if(!Number.isSafeInteger(size)||size>limits.inputFile||(total+=size)>limits.inputTotal)throw new Error('导入文件超过大小限制。');
  }
}
function base64Size(value){
  if(typeof value!=='string'||value.length>Math.ceil(limits.outputFile/3)*4||value.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw new Error('输出包含无效或过大的文件。');
  const size=value.length/4*3-(value.endsWith('==')?2:value.endsWith('=')?1:0);
  if(size>limits.outputFile)throw new Error('输出文件超过 10 MB。');return size;
}
export function isPreviewablePNG(base64){
  try{
    const h=Uint8Array.from(atob(base64.slice(0,44)),c=>c.charCodeAt(0));
    if(h.length<24||![137,80,78,71,13,10,26,10].every((n,i)=>h[i]===n)||String.fromCharCode(...h.slice(12,16))!=='IHDR')return false;
    const view=new DataView(h.buffer),w=view.getUint32(16),v=view.getUint32(20);
    return w>0&&v>0&&w<=4096&&v<=4096&&w*v<=16000000;
  }catch{return false;}
}
export function validateResult(data){
  if(!data||data.type!=='result'||!Number.isFinite(data.seconds)||data.seconds<0||typeof data.output!=='string'||data.output.length>limits.text||!(data.error===null||typeof data.error==='string'&&data.error.length<=limits.text)||!Array.isArray(data.figures)||data.figures.length>limits.figures||!Array.isArray(data.artifacts)||data.artifacts.length>limits.artifacts)throw new Error('计算环境返回了无效结果，已关闭。');
  let bytes=0;const names=new Set();
  for(const figure of data.figures){bytes+=base64Size(figure);if(!isPreviewablePNG(figure))throw new Error('绘图格式或尺寸不安全，已拒绝显示。');}
  for(const file of data.artifacts){
    if(!file||!validName(file.name)||names.has(file.name)||!extensions.has(file.name.split('.').pop().toLowerCase()))throw new Error('输出文件名或类型无效。');
    names.add(file.name);bytes+=base64Size(file.data);
  }
  if(bytes>limits.outputTotal)throw new Error('绘图和文件输出总量超过 20 MB。');
  return {type:'result',seconds:data.seconds,output:data.output,error:data.error,figures:data.figures,artifacts:data.artifacts};
}
// Destroy the job BEFORE cancelling its watchdog or accepting any result.
export function superviseRun({port,destroy,onStatus=()=>{},onReady=()=>{},onResult,onError,initMs=limits.initMs,runMs=limits.runMs,setTimer=setTimeout,clearTimer=clearTimeout}){
  let closed=false,running=false,timer;
  const cleanup=()=>{if(closed)return false;closed=true;destroy();port.onmessage=null;port.close();clearTimer(timer);return true;};
  const fail=message=>{if(cleanup())onError(message);};
  timer=setTimer(()=>fail('Python 加载超时，隔离环境已关闭。'),initMs);
  port.onmessage=({data})=>{
    if(closed)return;
    if(data?.type==='ready'&&!running){running=true;clearTimer(timer);timer=setTimer(()=>fail('运行超过 90 秒，隔离环境已关闭。'),runMs);onReady(String(data.version||'').slice(0,30));}
    else if(data?.type==='status'&&typeof data.text==='string'&&data.text.length<=200)onStatus(data.text);
    else if(data?.type==='error')fail(typeof data.message==='string'?data.message.slice(0,limits.text):'计算环境异常。');
    else if(data?.type==='result'){
      if(!cleanup())return;
      try{onResult(validateResult(data));}catch(error){onError(error.message);}
    }else fail('收到无效的运行消息，隔离环境已关闭。');
  };
  port.onmessageerror=()=>fail('运行消息无法解析，隔离环境已关闭。');port.start?.();
  return {cancel:()=>fail('已停止运行，隔离环境已关闭。'),fail};
}
