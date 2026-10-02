import {materials,materialIds,geometry,opticalParameters,materialSpectrum,comparisonCSV,compareDielectricDatasets} from "../dist/materials.mjs";
import {spawnSync} from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createEngine} from "../dist/engine.mjs";
import {opticalSpectrum,convergence,parseDielectricCSV,sampleCSV,applyParameters,defaults,diamondFractional,safeFilename} from "../dist/physics.mjs";
import {lessons} from "../dist/lessons.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
assert.equal(diamondFractional.length,8);
assert.ok(Math.abs(Math.sqrt(3)*5.431/4-2.35169198398)<1e-8);
const spectrum=opticalSpectrum(defaults.optics);
assert.ok(Math.abs(spectrum[0].re-(1+12/3.4**2))<1e-12);
assert.ok(spectrum.every(r=>r.loss>=0 && r.im>=0 && Number.isFinite(r.re)));
assert.equal(convergence(2).cutoff,450);
assert.equal(convergence(.5).cutoff,null);
assert.equal(convergence(5).cutoff,400);
assert.equal(parseDielectricCSV(sampleCSV()).length,201);
assert.equal(parseDielectricCSV("E,Re,Im,ReLF,ImLF\n0,1,0,1,0\n1,2,1,2,1").length,2);
assert.throws(()=>parseDielectricCSV("0,1,0\n1,2,1"));
assert.throws(()=>parseDielectricCSV("1,1,0,1,0\n0,2,1,2,1"));
assert.throws(()=>parseDielectricCSV("0,1,0,1,0\n1,NaN,1,2,1"));
assert.equal(safeFilename("../../demo.py"),"demo.py");
assert.equal(applyParameters("x = 1  # @x\n",{x:3}).trim(),"x = 3  # @x");
console.log("Physics and CSV checks passed.");
const engine=await createEngine({indexURL:path.join(root,"dist/runtime/"),runnerSource:await fs.readFile(path.join(root,"dist/runner.py"),"utf8"),onStatus:console.log});
engine.writeFiles([{name:"df.csv",data:sampleCSV()}]);
console.log("Actual Pyodide Python:",engine.version);
for(const lesson of lessons.filter(l=>l.id!=="gpaw")){
  const code=applyParameters(await fs.readFile(path.join(root,"dist/examples",lesson.filename),"utf8"),defaults[lesson.id]);
  const r=await engine.run(code,lesson.filename);
  assert.equal(r.error,null,r.error);
  assert.ok(r.figures.length>0,"Expected real PNG output for "+lesson.id);
  const png=Buffer.from(r.figures[0],"base64");
  assert.equal(png.subarray(1,4).toString(),"PNG");
  await fs.mkdir(path.join(root,".sites-runtime/qa"),{recursive:true});
  await fs.writeFile(path.join(root,".sites-runtime/qa",lesson.id+".png"),png);
  console.log(lesson.id,"PASS",r.figures.length,"figure(s)",r.output.trim());
}
const result=await engine.run("import scipy\nfrom scipy.integrate import quad\nprint(quad(lambda x: x*x, 0, 1)[0])\nprint(6*7)","uploaded.py");
assert.equal(result.error,null);assert.match(result.output,/0.333333333333333/);assert.match(result.output,/42/);
const failure=await engine.run("raise ValueError('intentional test')","bad.py");
assert.match(failure.error,/intentional test/);
const recovery=await engine.run("print('recovered')","recovery.py");
assert.equal(recovery.error,null);assert.match(recovery.output,/recovered/);
const saved=await engine.run("import matplotlib.pyplot as plt\nplt.plot([0,1],[0,1])\nplt.savefig('saved.svg')\nplt.close()\nwith open('answer.txt','w') as f: f.write('42')","save.py");
assert.equal(saved.error,null);assert.ok(saved.artifacts.some(a=>a.name==="saved.svg"));assert.ok(saved.artifacts.some(a=>a.name==="answer.txt"));
console.log("Uploaded script, SciPy, error recovery and saved artifacts passed.");

// Cross-check browser formulas against NumPy complex arithmetic for every row.
for(const symbol of materialIds){
  const m=materials[symbol],g=geometry(symbol);
  assert.equal(g.fractional.length,m.atoms);
  assert.ok(Math.abs(g.nearest-(symbol==='Si'?Math.sqrt(3)*m.a/4:m.a/Math.sqrt(2)))<1e-12);
  const opticalTemplate=await fs.readFile(path.join(root,'dist/examples/material_optics.py'),'utf8');
  const code=applyParameters(opticalTemplate,{symbol,...opticalParameters(symbol)})+'\nimport json\nprint("CROSSCHECK="+json.dumps(np.column_stack((energy,epsilon.real,epsilon.imag,loss,alpha)).tolist()))';
  const r=await engine.run(code,symbol+'_model.py');assert.equal(r.error,null,r.error);assert.equal(r.figures.length,1);
  const rows=JSON.parse(r.output.split('\n').find(x=>x.startsWith('CROSSCHECK=')).slice(11));
  const js=materialSpectrum(symbol);
  rows.forEach((row,i)=>row.forEach((v,j)=>assert.ok(Math.abs(v-[js[i].e,js[i].re,js[i].im,js[i].loss,js[i].alpha][j])<1e-9*Math.max(1,Math.abs(v)),symbol+' row '+i+' col '+j)));
  const structure=applyParameters(await fs.readFile(path.join(root,'dist/examples/silicon_structure.py'),'utf8'),{symbol,crystal:m.structure,a:m.a,elevation:25,azimuth:35});
  const sr=await engine.run(structure,symbol+'_structure.py');assert.equal(sr.error,null,sr.error);assert.match(sr.output,new RegExp(m.atoms+' atoms'));assert.equal(sr.figures.length,1);
  const native=applyParameters(await fs.readFile(path.join(root,'dist/examples/gpaw_silicon.py'),'utf8'),{symbol,crystal:m.structure,a:m.a,...defaults.gpaw});
  const nativePath=path.join(root,'.sites-runtime/qa','gpaw_'+symbol.toLowerCase()+'.py');await fs.writeFile(nativePath,native);
  const syntax=spawnSync('python3',['-m','py_compile',nativePath],{encoding:'utf8'});assert.equal(syntax.status,0,syntax.stderr);
  console.log(symbol,'geometry + 501-row JavaScript/NumPy parity + native syntax PASS');
}
for(const observable of ['loss','im','alpha']){
  const code=applyParameters(await fs.readFile(path.join(root,'dist/examples/compare_materials.py'),'utf8'),{observable});
  const r=await engine.run(code,'compare_materials.py');assert.equal(r.error,null,r.error);assert.equal(r.figures.length,1);
  const csv=r.artifacts.find(a=>a.name==='compare_models.csv');assert.ok(csv);
  const numeric=text=>text.split('\n').filter(x=>x.trim()&&!x.startsWith('#')).map(x=>x.split(',').map(Number));
  const py=numeric(Buffer.from(csv.data,'base64').toString()),js=numeric(comparisonCSV(observable));
  assert.equal(py.length,501);py.forEach((r,i)=>r.forEach((v,j)=>assert.ok(Math.abs(v-js[i][j])<1e-9*Math.max(1,Math.abs(v)))));
  console.log('Comparison',observable,'Python/CSV parity PASS');
}
const rawA=[[0,1,0,2,1],[1,1,0,3,2],[2,1,0,4,1]],rawB=[[1,1,0,2,2],[1.5,1,0,3,1],[3,1,0,4,2]];
const compared=compareDielectricDatasets([{symbol:'Si',rows:rawA},{symbol:'Al',rows:rawB}],'loss');
assert.equal(compared.min,1);assert.equal(compared.max,2);assert.equal(compared.series[0].points[0][1],2/13);assert.equal(compared.series[1].points[0][1],.25);
assert.deepEqual(compared.series[1].points.map(p=>p[0]),[1,1.5]); // no interpolation
assert.throws(()=>compareDielectricDatasets([{symbol:'Si',rows:rawA},{symbol:'Al',rows:[[4,1,0,1,1],[5,1,0,1,1]]}],'im'),/共同能量/);
console.log('Imported material comparison boundaries and raw sample retention PASS');
