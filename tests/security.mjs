import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {MessageChannel} from 'node:worker_threads';
import {limits,validateJob,validateResult,superviseRun,isPreviewablePNG} from '../dist/runtime-security.mjs';
import {memoryFetch,runtimeBase} from '../dist/offline-runtime.mjs';
import {sandboxDocument} from '../dist/sandbox.mjs';
import {sha256Fallback} from '../dist/sha256.mjs';

const good={type:'result',seconds:0,output:'42',error:null,figures:[],artifacts:[]};
assert.deepEqual(validateResult(good),good);
assert.throws(()=>validateResult({...good,seconds:NaN}));
assert.throws(()=>validateResult({...good,output:'x'.repeat(limits.text+1)}));
assert.throws(()=>validateResult({...good,artifacts:[{name:'../../secret.txt',data:'NDI='}]}));
assert.throws(()=>validateResult({...good,artifacts:[{name:'page.html',data:'NDI='}]}));
assert.throws(()=>validateResult({...good,artifacts:[{name:'ok.txt',data:'invalid'}]}));
assert.throws(()=>validateResult({...good,figures:['PHN2Zz4=']}));
assert.equal(isPreviewablePNG('PHN2Zz4='),false);
assert.throws(()=>validateJob({code:'print(42)',filename:'../x.py',files:[]}));
assert.throws(()=>validateJob({code:'x'.repeat(limits.code+1),filename:'x.py',files:[]}));
assert.throws(()=>validateJob({code:'pass',filename:'x.py',files:[{name:'a.txt',data:'a'},{name:'a.txt',data:'b'}]}));

// Actual MessageChannel + watchdog. Untrusted worker-global messages have no
// listener, cannot complete this job, and cannot cancel its deadline.
const channel=new MessageChannel();let destroyed=false;
await new Promise((resolve,reject)=>{
  superviseRun({port:channel.port1,destroy:()=>{destroyed=true;},runMs:30,
    onResult:()=>reject(new Error('Untrusted completion was accepted')),
    onError:message=>{assert.match(message,/超过/);assert.equal(destroyed,true);resolve();}});
  channel.port2.postMessage({type:'ready',version:'test'});
  const untrustedGlobalMessage={data:good};assert.equal(untrustedGlobalMessage.data.type,'result');
});channel.port2.close();
// Even a well-formed completion arriving on the private channel destroys the
// execution context before the result callback and before the watchdog clears.
for(const result of [good,{...good,artifacts:[{name:'bad.html',data:'NDI='}]}]){
  const c=new MessageChannel(),order=[];
  await new Promise(resolve=>{
    superviseRun({port:c.port1,destroy:()=>order.push('destroy'),
      onResult:()=>{order.push('result');resolve();},onError:()=>{order.push('error');resolve();},
      clearTimer:id=>{order.push('clear');clearTimeout(id);}});
    c.port2.postMessage(result);
  });
  assert.equal(order[0],'destroy');assert.equal(order[1],'clear');c.port2.close();
}
const fetchLocal=memoryFetch({'test.whl':new TextEncoder().encode('immutable').buffer});
assert.equal(await (await fetchLocal(runtimeBase+'test.whl')).text(),'immutable');
assert.equal(await (await fetchLocal(new URL(runtimeBase+'test.whl'))).text(),'immutable');
for(const url of ['https://example.invalid/upload','data:,x',runtimeBase+'test.whl?data=x',runtimeBase+'missing.whl'])assert.throws(()=>fetchLocal(url));
assert.throws(()=>fetchLocal(runtimeBase+'test.whl',{method:'POST'}));
const page=sandboxDocument('123abc');assert.match(page,/connect-src 'none'/);assert.match(page,/worker\.terminate/);assert.throws(()=>sandboxDocument('"<script>'));
for(const n of [0,3,55,56,64,65,1000000]){const data=Uint8Array.from(randomBytes(n));assert.equal(sha256Fallback(data.buffer),createHash('sha256').update(data).digest('hex'));}
console.log('Security checks passed: watchdog, destroy-before-accept, channel isolation, output/input bounds, offline fetch and SHA-256.');
