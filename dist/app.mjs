import {lessons} from "./lessons.mjs";
import {defaults,opticalSpectrum,convergence,cutoffValues,exampleEnergies,parseDielectricCSV,sampleCSV,safeFilename,applyParameters,escapeHTML as esc} from "./physics.mjs";
import {lineChart,crystalChart} from "./charts.mjs";
import {startSandbox} from "./sandbox.mjs";
import {isPreviewablePNG} from "./runtime-security.mjs";

const $=id=>document.getElementById(id);
const state={lesson:"optics",parameters:structuredClone(defaults),templates:{},drafts:{},filename:"optical_model.py",dirty:false,
  data:null,dataName:null,dataSynthetic:false,files:new Map(),busy:false,ready:false,worker:null,learning:"theory",urls:[],lastResult:null};
let toastTimer,pendingRun=null;
function notify(message){$("toast").textContent=message;$("toast").hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").hidden=true,5000);}
function currentLesson(){return lessons.find(l=>l.id===state.lesson);}
function setStatus(text,type=""){$("engine-status").textContent=text;$("engine-status").className="engine-status "+type;}
function setBusy(value){
  state.busy=value;$("stop").hidden=!value;
  for(const id of ["run","import-py","reset-code","generate-code"])$(id).disabled=value;
  document.querySelectorAll(".lesson-button").forEach(b=>b.disabled=value);
}
function setOutputTab(tab){
  for(const t of ["preview","python"]){$(t+"-tab").setAttribute("aria-selected",String(t===tab));$(t+"-tab").tabIndex=t===tab?0:-1;$(t+"-view").hidden=t!==tab;}
}
function refreshLines(){$("line-numbers").textContent=Array.from({length:$("code").value.split("\n").length},(_,i)=>i+1).join("\n");}
function setCode(code,filename){$("code").value=code;state.filename=filename;$("filename").textContent=filename;refreshLines();state.dirty=false;$("editor-type").textContent="可编辑 Python";}
function generateCode(force=false){
  if(!force && state.dirty && !window.confirm("用当前参数生成示例将替换编辑器中修改过的代码。是否继续？"))return false;
  const lesson=currentLesson(),template=state.templates[lesson.id];
  if(!template){notify("示例代码还在加载，请稍后重试。");return false;}
  setCode(applyParameters(template,state.parameters[lesson.id]),lesson.filename);
  state.drafts[lesson.id]={code:$("code").value,filename:lesson.filename};
  $("code-note").textContent=lesson.id==="gpaw"?"下载后在 GPAW 环境运行":"Ctrl / ⌘ + Enter 运行";
  return true;
}
function renderLearning(tab=state.learning){
  state.learning=tab;const lesson=currentLesson();
  for(const t of ["theory","steps","source"]){$("tab-"+t).setAttribute("aria-selected",String(t===tab));$("tab-"+t).tabIndex=t===tab?0:-1;}
  $("learning-content").setAttribute("aria-labelledby","tab-"+tab);
  $("learning-content").innerHTML=tab==="source"?'<div class="source-list">'+lesson.sources.map(s=>'<a class="source-link" href="'+s[0]+'" target="_blank" rel="noopener noreferrer">'+s[1]+' ↗<small>'+s[2]+'</small></a>').join("")+'</div><p class="note" style="margin:18px 0 0">教学说明为独立编写的中文学习材料。示例与合成数据不冒充官方计算结果；请以链接中的版本说明为准。</p>':lesson[tab];
}
function renderControls(){
  const lesson=currentLesson(),params=state.parameters[lesson.id];
  $("parameter-heading").textContent=lesson.id==="data"?"计算结果文件":"实验参数";
  $("parameter-note").textContent=lesson.id==="data"?"支持 GPAW 的五列 df.csv":"拖动参数观察变化，再生成代码";
  $("controls").innerHTML=lesson.controls.map(c=>'<div class="control"><label for="p-'+c.key+'">'+c.label+'<strong id="v-'+c.key+'">'+Number(params[c.key]).toFixed(c.digits)+' '+c.unit+'</strong></label><input type="range" id="p-'+c.key+'" min="'+c.min+'" max="'+c.max+'" step="'+c.step+'" value="'+params[c.key]+'"><div class="range-ticks"><span>'+c.min+'</span><span>'+c.max+'</span></div></div>').join("");
  if(lesson.id==="data"){
    $("controls").innerHTML='<div class="data-controls"><button class="button primary" id="import-csv">导入 df.csv</button><button class="button" id="sample-csv">载入示例数据</button><button class="button" id="download-csv" '+(!state.data?"disabled":"")+'>下载 CSV</button><p id="data-info"></p></div><div id="data-preview" class="data-table" '+(!state.data?"hidden":"")+'></div>';
    $("import-csv").onclick=()=>$("csv-input").click();
    $("sample-csv").onclick=()=>loadData(sampleCSV(),"synthetic_df.csv",true);
    $("download-csv").onclick=()=>{if(state.data)download(normalizedCSV(),state.dataSynthetic?"synthetic_df.csv":"df.csv","text/csv");};
    updateDataInfo();
  }
  for(const c of lesson.controls)$("p-"+c.key).addEventListener("input",e=>{
    params[c.key]=Number(e.target.value);
    $("v-"+c.key).textContent=Number(params[c.key]).toFixed(c.digits)+" "+c.unit;
    $("code-note").textContent="参数已变化 · 请写入代码";renderPreview();
  });
}
function updateDataInfo(){
  if(!$("data-info"))return;
  $("data-info").textContent=state.data?state.dataName+" · "+state.data.length+" 个点 · "+(state.dataSynthetic?"合成教学数据":"用户导入数据"):"尚未导入。可先载入合成示例，熟悉流程。";
  $("download-csv").disabled=!state.data;
  $("data-preview").hidden=!state.data;
  if(state.data)$("data-preview").innerHTML="<table><thead><tr>"+["E (eV)","Re NLF","Im NLF","Re LF","Im LF"].map(v=>"<th>"+v+"</th>").join("")+"</tr></thead><tbody>"+state.data.slice(0,3).map(r=>"<tr>"+r.map(v=>"<td>"+v.toFixed(4)+"</td>").join("")+"</tr>").join("")+"</tbody></table>";
}
function normalizedCSV(){return "# "+(state.dataSynthetic?"SYNTHETIC TEACHING DATA, not GPAW results":"User imported dielectric data")+"\n# energy_eV,re_nlf,im_nlf,re_lf,im_lf\n"+state.data.map(r=>r.join(",")).join("\n")+"\n";}
function loadData(text,name,synthetic=false){
  try{
    const parsed=parseDielectricCSV(text);
    state.data=parsed;state.dataName=name;state.dataSynthetic=synthetic;
    if($("data-info"))$("data-info").className="";
    updateDataInfo();renderPreview();notify("已读取 "+parsed.length+" 个数据点。");
  }catch(e){notify(e.message);if($("data-info")){$("data-info").textContent=e.message;$("data-info").className="error-note";}}
}
function renderPreview(){
  const lesson=currentLesson(),p=state.parameters[state.lesson];
  let series=[];
  $("chart-title").textContent=lesson.chartTitle;$("chart-badge").textContent=lesson.chartBadge;
  $("chart-caption").textContent=lesson.caption;$("mode-badge").textContent=lesson.badge;
  $("chart").className="chart";$("legend").innerHTML="";
  if(state.lesson==="optics"){
    const data=opticalSpectrum(p);
    series=[{label:"ε₁ · 实部",color:"#147d6a",points:data.map(r=>[r.e,r.re])},{label:"ε₂ · 虚部",color:"#db9542",points:data.map(r=>[r.e,r.im])},{label:"损失函数",color:"#577bc4",points:data.map(r=>[r.e,r.loss])}];
    $("chart").innerHTML=lineChart(series,{ylabel:"Dimensionless response",xlim:[0,8]});
    const peak=data.reduce((a,b)=>a.im>b.im?a:b), loss=data.reduce((a,b)=>a.loss>b.loss?a:b);
    $("live-metrics").textContent="ε₂ 采样峰位 "+peak.e.toFixed(2)+" eV · 损失峰位 "+loss.e.toFixed(2)+" eV · ε(0) = "+(1+p.strength/p.e0**2).toFixed(3);
  }else if(state.lesson==="structure"){
    $("chart").innerHTML=crystalChart(p);
    $("live-metrics").textContent="常规晶胞：8 原子 · 体积 "+(p.a**3).toFixed(3)+" Å³ · 最近邻 "+(Math.sqrt(3)*p.a/4).toFixed(4)+" Å";
  }else if(state.lesson==="convergence"){
    const check=convergence(p.tolerance);
    series=[{label:"合成能量 / 原子",color:"#147d6a",points:cutoffValues.map((v,i)=>[v,exampleEnergies[i]]),dots:true}];
    $("chart").innerHTML=lineChart(series,{xlabel:"Cutoff energy (eV)",ylabel:"Energy (eV / atom)",ylim:[-5.330,-5.290]});
    $("live-metrics").textContent=check.cutoff?"候选截断能 "+check.cutoff+" eV · 后续相邻能量差均 ≤ "+p.tolerance.toFixed(1)+" meV / atom":"现有数据没有满足条件且可复核的候选点，请增加更高截断能数据。";
  }else if(state.lesson==="data"){
    if(state.data){
      const step=Math.max(1,Math.ceil(state.data.length/1200)), preview=state.data.filter((_,i)=>i%step===0||i===state.data.length-1);
      series=[{label:"Im ε · 无局域场",color:"#db9542",points:preview.map(r=>[r[0],r[2]])},{label:"Im ε · 有局域场",color:"#147d6a",points:preview.map(r=>[r[0],r[4]])}];
      $("chart").innerHTML=lineChart(series,{ylabel:"Im epsilon"});
      $("chart-badge").textContent=state.dataSynthetic?"合成数据":"导入数据";$("mode-badge").textContent=state.dataSynthetic?"合成数据":"用户数据";
      $("live-metrics").textContent=state.dataName+" · "+state.data[0][0].toFixed(2)+"–"+state.data.at(-1)[0].toFixed(2)+" eV"+(step>1?" · 预览抽样显示；Python 使用全部点":"");
    }else{
      $("chart").innerHTML='<div class="preview-empty"><strong>让真实结果接上学习过程</strong><p>导入 df.csv 后，这里会显示两条介电损耗曲线。</p><p>没有数据？点击上方「载入示例数据」。</p></div>';$("live-metrics").textContent="文件只在当前网页会话读取，不上传。";
    }
  }else{
    $("chart").innerHTML='<div class="native-steps"><div class="native-step"><b>01</b><div><h3>检查原生环境</h3><p><code>gpaw info</code> · <code>gpaw test</code></p></div></div><div class="native-step"><b>02</b><div><h3>下载并执行脚本</h3><p><code>python gpaw_silicon.py</code><br>求基态、对角化空态、保存波函数。</p></div></div><div class="native-step"><b>03</b><div><h3>回到第 04 课分析 df.csv</h3><p>保存日志，逐项收敛 k 点、空带和截断能。</p></div></div></div>';
    $("live-metrics").textContent="Si 两原子原胞 · "+p.k+" × "+p.k+" × "+p.k+" k 点 · "+p.bands+" 条带 · 尚未执行 GPAW";
  }
  $("legend").innerHTML=series.map(s=>'<span><i style="background:'+s.color+'"></i>'+s.label+'</span>').join("");
}
function selectLesson(id){
  if(!lessons.some(l=>l.id===id))throw new Error("未知实验");
  if(state.busy)throw new Error("请等待当前运行结束或先停止。");
  if(state.templates[state.lesson] && $("code").value)state.drafts[state.lesson]={code:$("code").value,filename:state.filename,dirty:state.dirty};
  state.lesson=id;const lesson=currentLesson();
  document.querySelectorAll(".lesson-button").forEach(b=>{b.classList.toggle("active",b.dataset.lesson===id);b.setAttribute("aria-current",b.dataset.lesson===id?"step":"false");});
  $("lesson-number").textContent="EXPERIMENT 0"+(lessons.indexOf(lesson)+1);
  $("lesson-title").textContent=lesson.title;$("lesson-intro").textContent=lesson.intro;$("crumb").textContent=lesson.name;
  $("run").innerHTML=id==="gpaw"?"下载 GPAW 脚本 ↓":"<span aria-hidden='true'>▶</span> 运行 Python";
  $("code-note").textContent=id==="gpaw"?"下载后在 GPAW 环境运行":"Ctrl / ⌘ + Enter 运行";
  renderControls();renderPreview();renderLearning();setOutputTab("preview");
  const draft=state.drafts[id];
  if(draft){setCode(draft.code,draft.filename);state.dirty=!!draft.dirty;}
  else generateCode(true);
}
function download(data,name,type="application/octet-stream"){
  const url=URL.createObjectURL(new Blob([data],{type}));
  const a=document.createElement("a");a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function addOutputFigure(url,name){
  const fig=document.createElement("figure");fig.className="figure-item";
  const img=document.createElement("img");img.src=url;img.alt="Python 生成的图像："+name;
  const caption=document.createElement("figcaption");caption.append(document.createTextNode(name));
  const a=document.createElement("a");a.href=url;a.download=name;a.textContent="下载 ↓";caption.append(a);fig.append(img,caption);$("figures").append(fig);
}
function artifactURL(base64,name){
  const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  const extension=name.split(".").pop().toLowerCase();
  const mime={png:"image/png",csv:"text/csv",txt:"text/plain"}[extension]||"application/octet-stream";
  const url=URL.createObjectURL(new Blob([bytes],{type:mime}));state.urls.push(url);return url;
}
function clearOutput(){
  state.urls.forEach(URL.revokeObjectURL);state.urls=[];$("figures").replaceChildren();$("artifacts").replaceChildren();$("console").textContent="";$("run-summary").className="run-summary";
}
function finishError(message){
  state.worker=null;state.ready=false;
  $("run-summary").textContent="运行未完成，隔离环境已关闭。";$("run-summary").classList.add("fail");$("console").textContent=message;
  setBusy(false);setStatus("Python 已关闭");
  if(pendingRun){pendingRun.resolve({ok:false,error:message});pendingRun=null;}
}
function stopRuntime(){state.worker?.cancel();}
function renderResult(data){
  state.worker=null;state.ready=false;state.lastResult=data;setBusy(false);setStatus("运行完成 · 环境已关闭");
  $("run-summary").textContent=(data.error?"运行出现错误":"运行完成")+" · "+data.seconds.toFixed(2)+" s · "+data.figures.length+" 幅绘图";
  $("run-summary").classList.toggle("fail",!!data.error);
  $("console").textContent=(data.output||"无标准输出。")+(data.error?"\n"+data.error:"");
  for(let i=0;i<data.figures.length;i++)addOutputFigure(artifactURL(data.figures[i],"figure.png"),"figure_"+(i+1)+".png");
  for(const file of data.artifacts){
    const url=artifactURL(file.data,file.name);
    if(/\.png$/i.test(file.name)&&isPreviewablePNG(file.data))addOutputFigure(url,file.name);
    else {const a=document.createElement("a");a.href=url;a.download=file.name;a.textContent=file.name+" ↓";$("artifacts").append(a);}
  }
  if(pendingRun){pendingRun.resolve({ok:!data.error,seconds:data.seconds,figures:data.figures.length,output:data.output,error:data.error});pendingRun=null;}
}
async function runPython(){
  if(state.busy)return {ok:false,error:"已有运行中的任务"};
  if(state.lesson==="gpaw"){download($("code").value,state.filename,"text/x-python");notify("已下载脚本。请在原生 GPAW 环境中运行。");return {ok:true,downloaded:true,executed:false};}
  if(state.lesson==="data"&&!state.data){notify("请先导入 CSV 或载入示例数据。");return {ok:false,error:"缺少 df.csv"};}
  if(!$("code").value.trim()){notify("请先输入 Python 代码。");return {ok:false,error:"代码为空"};}
  clearOutput();setOutputTab("python");setBusy(true);
  const promise=new Promise(resolve=>{pendingRun={resolve};});
  const files=[...state.files.entries()].filter(([name])=>!(state.lesson==="data"&&name==="df.csv")).map(([name,data])=>({name,data}));
  if(state.lesson==="data"&&state.data)files.push({name:"df.csv",data:normalizedCSV()});
  $("run-summary").textContent="正在启动独立 Python 环境…";
  try{
    state.worker=startSandbox({code:$("code").value,filename:state.filename,files},{
      onStatus:text=>{$("run-summary").textContent=text;setStatus(text,"loading");},
      onReady:version=>{state.ready=true;setStatus("Python "+version+" · 已隔离","ready");},
      onResult:renderResult,onError:finishError
    });
  }catch(error){finishError(error.message);}
  return promise;
}

$("lessons").innerHTML=lessons.map((l,i)=>'<button class="lesson-button" data-lesson="'+l.id+'"><span class="lesson-number">0'+(i+1)+'</span><span class="lesson-label">'+l.name+'<small>'+l.sub+'</small></span></button>').join("");
document.querySelectorAll(".lesson-button").forEach(b=>b.onclick=()=>selectLesson(b.dataset.lesson));
$("code").oninput=()=>{state.dirty=true;$("editor-type").textContent="已修改 · 当前会话保留";refreshLines();};
$("code").onscroll=()=>$("line-numbers").scrollTop=$("code").scrollTop;
$("code").onkeydown=e=>{
  if(e.key==="Tab"){e.preventDefault();const t=e.target,start=t.selectionStart,end=t.selectionEnd;t.setRangeText("    ",start,end,"end");state.dirty=true;refreshLines();}
  if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();runPython();}
};
$("generate-code").onclick=()=>{if(generateCode())notify("已将当前参数写入代码。");};
$("reset-code").onclick=()=>generateCode();
$("run").onclick=()=>runPython();
$("stop").onclick=()=>stopRuntime();
$("download-py").onclick=()=>download($("code").value,state.filename,"text/x-python");
$("import-py").onclick=()=>$("py-input").click();
$("py-input").onchange=async e=>{
  const file=e.target.files[0];e.target.value="";if(!file)return;
  if(!file.name.toLowerCase().endsWith(".py"))return notify("请选择 .py 文件。");
  if(file.size>2*1024*1024)return notify("Python 文件不能超过 2 MB。");
  if(state.dirty&&!window.confirm("导入文件会替换编辑器内修改过的代码，是否继续？"))return;
  if(state.lesson==="gpaw")selectLesson("optics");
  setCode(await file.text(),safeFilename(file.name,"experiment.py"));state.dirty=true;
  $("editor-type").textContent="已导入 · 自定义 Python";notify("已导入 "+state.filename);
};
$("csv-input").onchange=async e=>{
  const file=e.target.files[0];e.target.value="";if(!file)return;
  if(file.size>5*1024*1024)return notify("CSV 文件不能超过 5 MB。");
  loadData(await file.text(),file.name);
};
function showGuide(){$("guide").showModal();}
$("open-guide").onclick=showGuide;$("engine-status").onclick=showGuide;$("files-help").onclick=showGuide;
$("close-guide").onclick=()=>$("guide").close();
$("add-assets").onclick=()=>$("asset-input").click();
$("asset-input").onchange=async e=>{
  const files=[...e.target.files];e.target.value="";
  for(const file of files){
    if(file.size>10*1024*1024){notify(file.name+" 超过 10 MB，未添加。");continue;}
    if(state.files.size>=100&&!state.files.has(safeFilename(file.name))){notify("最多导入 100 个文件。");break;}
    if([...state.files.values()].reduce((a,b)=>a+b.byteLength,0)+file.size>30*1024*1024){notify("当前会话导入文件总量不能超过 30 MB。");break;}
    state.files.set(safeFilename(file.name),await file.arrayBuffer());
  }
  $("asset-list").textContent="当前目录文件："+[...state.files.keys()].join("、");
};
for(const t of ["preview","python"])$(t+"-tab").onclick=()=>setOutputTab(t);
for(const t of ["theory","steps","source"])$("tab-"+t).onclick=()=>renderLearning(t);
for(const list of document.querySelectorAll('[role="tablist"]'))list.onkeydown=e=>{
  if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
  const tabs=[...list.querySelectorAll('[role="tab"]')],i=tabs.indexOf(document.activeElement);
  const next=e.key==="Home"?0:e.key==="End"?tabs.length-1:(i+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;
  e.preventDefault();tabs[next].click();tabs[next].focus();
};
try{
  await Promise.all(lessons.map(async l=>{
    const r=await fetch("./examples/"+l.filename);if(!r.ok)throw new Error("示例文件加载失败："+l.filename);
    state.templates[l.id]=await r.text();
  }));
  selectLesson("optics");
}catch(e){notify(e.message);$("code").value="# 示例加载失败，请刷新页面重试。";$("run").disabled=true;}

// The same actions are available to supporting agent browsers.
const context=document.modelContext;
if(context?.registerTool){
  const lifecycle=new AbortController();
  const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:"get_lab_state",title:"读取实验状态",description:"Read the selected lesson, parameters, data source and latest Python run.",
    inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},
    execute:()=>({lesson:state.lesson,parameters:state.parameters[state.lesson],filename:state.filename,busy:state.busy,dataSource:state.dataName,synthetic:state.dataSynthetic,lastRun:state.lastResult?{ok:!state.lastResult.error,figures:state.lastResult.figures.length}:null})});
  register({name:"configure_lab_experiment",title:"调整实验参数",description:"Select a lesson and update its visible controls and preview. Does not overwrite code or run Python.",
    inputSchema:{type:"object",properties:{lesson:{type:"string",enum:lessons.map(l=>l.id)},parameters:{type:"object",additionalProperties:{type:"number"}}},required:["lesson"],additionalProperties:false},
    annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{
      if(!input||typeof input!=="object")throw new Error("需要实验参数对象");
      const lesson=lessons.find(l=>l.id===input.lesson);if(!lesson)throw new Error("未知实验");
      for(const [key,value] of Object.entries(input.parameters||{})){
        const c=lesson.controls.find(c=>c.key===key);
        if(!c||!Number.isFinite(value)||value<c.min||value>c.max||Math.abs((value-c.min)/c.step-Math.round((value-c.min)/c.step))>1e-7)throw new Error("参数超出范围或步长："+key);
      }
      selectLesson(lesson.id);Object.assign(state.parameters[lesson.id],input.parameters||{});renderControls();renderPreview();
      $("code-note").textContent="参数已变化 · 请写入代码";return {lesson:state.lesson,parameters:state.parameters[state.lesson],codeUpdated:false};
    }});
  window.addEventListener("pagehide",()=>lifecycle.abort(),{once:true});
}
