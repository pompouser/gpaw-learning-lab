// Optical presets are authored teaching parameters, never measured/fitted spectra.
export const materials={
 Si:{name:'硅',structure:'diamond',structureName:'金刚石结构',a:5.431,atoms:8,primitive:2,color:'#147d6a',model:'Lorentz · 半导体机制示意',e0:3.4,gamma:.35,strength:12,wp:0,question:'束缚电子的共振怎样产生介电损耗？',note:'单振子没有描述 Si 的真实能带或间接带隙，不能用于预测硅的吸收边。'},
 Al:{name:'铝',structure:'fcc',structureName:'面心立方',a:4.043,atoms:4,primitive:1,color:'#b87922',model:'Drude · 自由电子机制示意',e0:3.4,gamma:.3,strength:0,wp:15,question:'自由电子的集体响应为何产生损失峰？',note:'忽略带间跃迁；15 eV 是本课选定的示意等离子体能量，不是本网站完成的 Al 计算。'},
 Ag:{name:'银',structure:'fcc',structureName:'面心立方',a:4.09,atoms:4,primitive:1,color:'#577bc4',model:'Drude–Lorentz · 带间跃迁示意',e0:4.5,gamma:.35,strength:60,wp:9,question:'加入带间响应后，损失峰为什么移动或分裂？',note:'用一个振子代表带间响应的影响；参数未经拟合，不能据此宣称得到真实 Ag 光谱。'}
};
export const materialIds=Object.keys(materials);
export const fccFractional=[[0,0,0],[0,.5,.5],[.5,0,.5],[.5,.5,0]];
export const diamondFractional=[...fccFractional,...fccFractional.map(p=>p.map(v=>v+.25))];
export function geometry(symbol,a=materials[symbol].a){
 const m=materials[symbol];if(!m||!Number.isFinite(a)||a<=0)throw new Error('无效的晶格参数');
 return {fractional:m.structure==='diamond'?diamondFractional:fccFractional,nearest:m.structure==='diamond'?Math.sqrt(3)*a/4:a/Math.sqrt(2),volume:a**3,atoms:m.atoms};
}
export function opticalParameters(symbol){const {e0,gamma,strength,wp}=materials[symbol];return {e0,gamma,strength,wp};}
export function materialSpectrum(symbol,parameters=opticalParameters(symbol),count=501){
 const {e0,gamma,strength,wp}=parameters;
 if(!materials[symbol]||![e0,gamma,strength,wp].every(Number.isFinite)||e0<=0||gamma<=0||strength<0||wp<0||!Number.isInteger(count)||count<2)throw new Error('无效的材料模型参数');
 return Array.from({length:count},(_,i)=>{
  const e=.05+24.95*i/(count-1),a=e0*e0-e*e,b=gamma*e,den=a*a+b*b;
  const re=1+strength*a/den-wp*wp/(e*e+gamma*gamma);
  const im=strength*b/den+wp*wp*gamma/(e*(e*e+gamma*gamma));
  const kappa=Math.sqrt(Math.max(0,(Math.hypot(re,im)-re)/2));
  return {e,re,im,loss:im/(re*re+im*im),alpha:2*e*kappa/197.3269804};
 });
}
export const observables={loss:{name:'损失函数 L',axis:'Loss function (dimensionless)'},im:{name:'介电损耗 ε₂',axis:'Im epsilon (dimensionless)'},alpha:{name:'吸收系数 α',axis:'Absorption coefficient (nm^-1)'}};
export function compareSeries(observable='loss'){
 if(!observables[observable])throw new Error('未知的光学量');
 return materialIds.map(symbol=>({label:symbol+' · 教学模型',color:materials[symbol].color,points:materialSpectrum(symbol).map(r=>[r.e,r[observable]])}));
}
export function comparisonCSV(observable='loss'){
 const series=compareSeries(observable);
 return '# Authored teaching models; NOT GPAW, fitted or experimental data\n# energy_eV,Si_'+observable+',Al_'+observable+',Ag_'+observable+'\n'+series[0].points.map(([e],i)=>[e,...series.map(s=>s.points[i][1])].join(',')).join('\n')+'\n';
}
export function compareDielectricDatasets(datasets,observable='im'){
 if(datasets.length<2||!observables[observable])throw new Error('至少需要两种材料和有效物理量。');
 const min=Math.max(...datasets.map(d=>d.rows[0][0])),max=Math.min(...datasets.map(d=>d.rows.at(-1)[0]));
 if(min>=max)throw new Error('这些数据没有共同能量范围，请导入范围重叠的文件。');
 const series=datasets.map(({symbol,rows})=>{
  const visible=rows.filter(r=>r[0]>=min&&r[0]<=max);
  if(visible.length<2)throw new Error(symbol+' 在共同范围内不足两个采样点。');
  const stride=Math.max(1,Math.ceil(visible.length/1200));
  const points=visible.filter((_,i)=>i%stride===0||i===visible.length-1).map(([e,,,re,im])=>{
   const value=observable==='im'?im:observable==='loss'?im/(re*re+im*im):2*e*Math.sqrt(Math.max(0,(Math.hypot(re,im)-re)/2))/197.3269804;
   if(!Number.isFinite(value))throw new Error(symbol+' 包含无法转换的介电函数（例如 ε=0）。');
   return [e,value];
  });
  return {label:symbol+' · 用户标记',color:materials[symbol].color,points};
 });return {series,min,max};
}
