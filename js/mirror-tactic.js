// Reflect the court data once, so the 3D view and minimap share real position IDs.
// The mirrored RB follows the original LB's route and decision cues.
const IDS={LW:'RW',RW:'LW',LB:'RB',RB:'LB',L1:'R1',R1:'L1',L2:'R2',R2:'L2',L3:'R3',R3:'L3'};
export const mirrorText=text=>text.replace(/LW|RW|LB|RB|L[123]|R[123]|左|右/g,token=>IDS[token]||({左:'右',右:'左'})[token]);
export function mirrorTactic(source,width=20){
  function reflect(value,key=''){
    if(typeof value==='string')return mirrorText(value);
    if(Array.isArray(value)){
      if(key==='rect')return [width-value[0]-value[2],...value.slice(1)];
      if(key==='face'&&typeof value[0]==='number')return [width-value[0],value[1]];
      if(key==='to'&&Array.isArray(value[0]))return value.map(([x,y])=>[width-x,y]);
      return value.map(item=>reflect(item));
    }
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[
      IDS[k]||k,k==='x'&&typeof v==='number'?width-v:reflect(v,k)
    ]));
    return value;
  }
  return reflect(source);
}
