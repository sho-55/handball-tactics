// All source and 3D paths: no overlapping movements, valid passes, spacing, shots.
const fs=require('fs'),assert=require('assert');
global.window={matchMedia:()=>({matches:false})};
eval(fs.readFileSync('js/engine.js','utf8'));eval(fs.readFileSync('tactics/08-cc-dappo.js','utf8'));
const E=window.TacticEngine,source=window.TACTICS['08'];
function verify(data,label){
 let start={pos:{},team:{},holder:data.ball};for(const[id,p]of Object.entries(data.players)){start.pos[id]={x:p.x,y:p.y};start.team[id]=p.team;}
 let min=Infinity,passes=0;
 const check=(base,actions,name,from=0)=>{
  for(const a of actions){
   if(['move','block'].includes(a.type))for(const b of actions)if(b!==a&&b.who===a.who&&['move','block'].includes(b.type))assert(a.t+a.dur<=b.t+1e-8||b.t+b.dur<=a.t+1e-8,`${name}: overlapping ${a.who}`);
   if(a.type==='pass'){
    const at=a.t===0?base:E.stateAt(base,actions,a.t-1e-6);assert(at.holder===a.from,`${name}: wrong passer ${a.from}/${at.holder}`);
    for(let k=1;k<20;k++){const st=E.stateAt(base,actions,a.t+a.dur*k/20);for(const id in st.pos)if(base.team[id]==='df'&&st.ballPos){const q=st.pos[id];assert(Math.hypot(st.ballPos.x-q.x,st.ballPos.y-q.y)>=E.laneLimit(a.kind),`${name}: pass near ${id}`);}}passes++;
   }
  }
  for(let t=from;t<=E.duration(actions);t+=.025){const st=E.stateAt(base,actions,t),ids=Object.keys(st.pos);
   for(const id of ids)if(base.team[id]==='of'){const q=st.pos[id],dx=Math.max(8.5-q.x,q.x-11.5,0),line=Math.sqrt(Math.max(0,36-dx*dx));assert(q.y>=line-1e-8,`${name}: ${id} inside 6m at ${t.toFixed(2)}`);}
   for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const a=st.pos[ids[i]],b=st.pos[ids[j]],dist=Math.hypot(a.x-b.x,a.y-b.y);min=Math.min(min,dist);assert(dist>=1.1-1e-8,`${name}: ${ids[i]}/${ids[j]} ${dist.toFixed(3)}m at ${t.toFixed(2)}`);}}
 };
 for(const[i,s]of data.steps.entries()){
  check(start,s.actions,`${label} S${i}`);
  for(const[j,b]of (s.branches||[]).entries()){
   const st=E.stateAt(start,s.actions,b.from),base=b.playFrom!==undefined?start:{...start,pos:st.pos,holder:st.holder};check(base,b.actions,`${label} S${i} B${j}`,b.playFrom??0);
   assert(E.stateAt(base,b.actions,E.duration(b.actions)).shotDone,`${label} S${i} B${j}: missing shot`);
  }
  const st=E.stateAt(start,s.actions,E.duration(s.actions));start={...start,pos:st.pos,holder:st.holder};
 }
 console.log(label,'PASS', {minSpacing:min,passes});
}
(async()=>{verify(source,'2D');const {ccDappoPov}=await import('../js/pov-cc-dappo.js');for(const mirror of [false,true])verify(ccDappoPov(source,mirror,E).data,'3D mirror='+mirror);})();
