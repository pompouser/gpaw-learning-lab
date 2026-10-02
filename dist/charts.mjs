import {geometry} from "./materials.mjs";
import {escapeHTML} from "./physics.mjs";
const text=(x,y,s,extra="")=>'<text x="'+x+'" y="'+y+'" '+extra+'>'+escapeHTML(s)+'</text>';
export function lineChart(series,{xlabel="Energy (eV)",ylabel="Response",xlim,ylim,clip=false}={}){
  const all=series.flatMap(s=>s.points).filter(p=>p.every(Number.isFinite));
  if(!all.length)return '<div class="preview-empty">没有可绘制的有限数值。</div>';
  const minX=xlim?.[0]??Math.min(...all.map(p=>p[0])),maxX=xlim?.[1]??Math.max(...all.map(p=>p[0]));
  let minY=ylim?.[0]??Math.min(0,...all.map(p=>p[1])),maxY=ylim?.[1]??Math.max(...all.map(p=>p[1]));
  if(!ylim){const pad=(maxY-minY||1)*.08;minY-=pad;maxY+=pad;}
  const left=63,top=24,w=465,h=240;
  const px=v=>left+(v-minX)/(maxX-minX||1)*w,py=v=>top+h-(v-minY)/(maxY-minY||1)*h;
  let out='<svg viewBox="0 0 560 315" role="img" aria-label="'+escapeHTML(ylabel+" 随 "+xlabel+" 的变化")+'" xmlns="http://www.w3.org/2000/svg"><g font-family="system-ui,sans-serif" font-size="11" fill="#687f88">';
  const fmt=v=>Math.abs(v)>=1000?v.toFixed(0):Math.abs(maxY-minY)<.2?v.toFixed(3):v.toFixed(1);
  for(let i=0;i<=4;i++){
    const y=top+h-i*h/4, val=minY+i*(maxY-minY)/4;
    out+='<line x1="'+left+'" y1="'+y+'" x2="'+(left+w)+'" y2="'+y+'" stroke="#e4ecee"/>'+text(left-10,y+4,fmt(val),'text-anchor="end"');
  }
  for(let i=0;i<=4;i++){
    const x=left+i*w/4,val=minX+i*(maxX-minX)/4;
    out+=text(x,top+h+21,Number(val.toFixed(2)),'text-anchor="middle"');
  }
  if(minY<0 && maxY>0)out+='<line x1="'+left+'" y1="'+py(0)+'" x2="'+(left+w)+'" y2="'+py(0)+'" stroke="#b3c5ca" stroke-dasharray="3 4"/>';
  if(clip)out+='<defs><clipPath id="plot-clip"><rect x="'+left+'" y="'+top+'" width="'+w+'" height="'+h+'"/></clipPath></defs><g clip-path="url(#plot-clip)">';
  for(const s of series){
    let d="",pen=false;
    for(const [x,y] of s.points){
      if(!Number.isFinite(x)||!Number.isFinite(y)){pen=false;continue;}
      d+=(pen?"L":"M")+px(x).toFixed(2)+","+py(y).toFixed(2);pen=true;
    }
    out+='<path d="'+d+'" fill="none" stroke="'+s.color+'" stroke-width="2.3" stroke-linejoin="round"'+(s.dashed?' stroke-dasharray="5 4"':"")+'/>';
    if(s.dots)for(const [x,y] of s.points)out+='<circle cx="'+px(x)+'" cy="'+py(y)+'" r="4" fill="'+s.color+'" stroke="white" stroke-width="1.5"><title>'+escapeHTML(x+": "+y)+'</title></circle>';
  }
  if(clip)out+="</g>";
  out+=text(left+w/2,307,xlabel,'text-anchor="middle" fill="#425d66"')+text(0,0,ylabel,'transform="translate(15 145) rotate(-90)" text-anchor="middle" fill="#425d66"');
  return out+'</g></svg>';
}
export function crystalChart({a,elevation,azimuth,symbol="Si"}){
  const g=geometry(symbol,a), fractional=g.fractional;
  const az=azimuth*Math.PI/180,el=elevation*Math.PI/180;
  function project(p){
    const [x,y,z]=p.map(v=>v-.5), u=-x*Math.sin(az)+y*Math.cos(az), v=-Math.sin(el)*(x*Math.cos(az)+y*Math.sin(az))+z*Math.cos(el);
    return [280+u*230,152-v*230,Math.cos(el)*(x*Math.cos(az)+y*Math.sin(az))+z*Math.sin(el)];
  }
  const line=(p,q,color,width,dash="")=>{const x=project(p),y=project(q);return '<line x1="'+x[0]+'" y1="'+x[1]+'" x2="'+y[0]+'" y2="'+y[1]+'" stroke="'+color+'" stroke-width="'+width+'" '+dash+'/>';};
  let out='<svg viewBox="0 0 560 315" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+symbol+' 的常规晶胞"><g>';
  const corners=[];for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++)corners.push([x,y,z]);
  for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){
    if(corners[i].filter((v,k)=>v!==corners[j][k]).length===1)out+=line(corners[i],corners[j],"#b3c8cc",1.2);
  }
  for(let i=0;i<fractional.length;i++)for(let j=i+1;j<fractional.length;j++){
    if(Math.abs(Math.hypot(...fractional[i].map((v,k)=>v-fractional[j][k]))-g.nearest/a)<1e-8)out+=line(fractional[i],fractional[j],"#77a69b",3);
  }
  const sorted=fractional.map((p,i)=>({p:project(p),i})).sort((a,b)=>a.p[2]-b.p[2]);
  for(const {p,i} of sorted)out+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="9" fill="'+(i<4?"#087d68":"#57bda1")+'" stroke="white" stroke-width="2"><title>'+symbol+' '+(i+1)+": ("+fractional[i].map(v=>(v*a).toFixed(3)).join(", ")+') Å</title></circle>';
  out+=text(20,295,"a = "+a.toFixed(3)+" Å",'font-size="12" fill="#48666e" font-family="monospace"');
  return out+'</g></svg>';
}
