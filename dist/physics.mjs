export const defaults = {
  structure: {a: 5.431, elevation: 25, azimuth: 35},
  convergence: {tolerance: 2},
  optics: {e0: 3.4, gamma: 0.35, strength: 12},
  data: {field: "lf"},
  gpaw: {cutoff: 300, k: 4, bands: 24}
};
export const diamondFractional = [[0,0,0],[0,.5,.5],[.5,0,.5],[.5,.5,0],[.25,.25,.25],[.25,.75,.75],[.75,.25,.75],[.75,.75,.25]];
export const cutoffValues = [250,300,350,400,450,500,550];
export const exampleEnergies = [-5.293,-5.311,-5.320,-5.324,-5.326,-5.327,-5.3275];
export function opticalSpectrum({e0,gamma,strength}, count=401) {
  if (![e0,gamma,strength].every(Number.isFinite) || e0<=0 || gamma<=0 || strength<0) throw new Error("无效的光谱参数");
  return Array.from({length:count},(_,i)=>{
    const e=8*i/(count-1), a=e0*e0-e*e, b=gamma*e, den=a*a+b*b;
    const re=1+strength*a/den, im=strength*b/den;
    return {e,re,im,loss:im/(re*re+im*im)};
  });
}
export function convergence(tolerance, energies=exampleEnergies, cutoffs=cutoffValues) {
  const diffs=energies.map((v,i)=>i===0?null:1000*Math.abs(v-energies[i-1]));
  const candidate=diffs.findIndex((v,i)=>i>0 && i<diffs.length-1 && diffs.slice(i).every(d=>d<=tolerance+1e-9));
  return {diffs,candidate,cutoff:candidate<0?null:cutoffs[candidate]};
}
export function parseDielectricCSV(text) {
  const rows=[];
  let started=false, headerSkipped=false;
  const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();
    if(!line || line.startsWith("#")) continue;
    const fields=line.split(/[,\s;]+/).filter(Boolean);
    const nums=fields.map(Number);
    if(!started && !headerSkipped && /^(energy|e$|e\(|omega|frequency|ω|能量)/i.test(fields[0]) && nums.some(Number.isNaN)){
      headerSkipped=true; continue;
    }
    if(nums.length!==5 || !nums.every(Number.isFinite)) throw new Error("第 "+(i+1)+" 行需要 5 个有限数值：能量、Re NLF、Im NLF、Re LF、Im LF。");
    if(nums[0]<0)throw new Error("能量不能为负数。");
    if(rows.length && nums[0]<=rows.at(-1)[0])throw new Error("能量必须严格递增，请先排序并去除重复值。");
    rows.push(nums); started=true;
    if(rows.length>20000)throw new Error("最多支持 20,000 个数据点。");
  }
  if(rows.length<2)throw new Error("至少需要两行有效数据。");
  return rows;
}
export function sampleCSV(){
  const nlf=opticalSpectrum({e0:3.4,gamma:.35,strength:12},201);
  const lf=opticalSpectrum({e0:3.5,gamma:.35,strength:10},201);
  return "# Synthetic teaching data, NOT GPAW results\n# energy_eV,re_nlf,im_nlf,re_lf,im_lf\n"+nlf.map((r,i)=>[r.e,r.re,r.im,lf[i].re,lf[i].im].map(v=>v.toFixed(7)).join(",")).join("\n")+"\n";
}
export function escapeHTML(value){
  return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
export function safeFilename(value, fallback="input.dat"){
  const last=String(value).split(/[\\/]/).pop();
  return (last.replace(/[^a-zA-Z0-9_.-]/g,"_").replace(/^\.+/,"").replace(/^-+/,"_").slice(0,100)) || fallback;
}
export function applyParameters(template,parameters){
  return template.replace(/^(\w+)\s*=\s*.*?# @(\w+)\s*$/gm,(match,variable,key)=>{
    const v=parameters[key];
    return v===undefined ? match : variable+" = "+JSON.stringify(v)+"  # @"+key;
  });
}
