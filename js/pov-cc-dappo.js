// Set 08 keeps RB as the learner, including the mirrored initiating role.
import {mirrorTactic} from './mirror-tactic.js?v=202609201201';
export function ccDappoPov(source,mirror,E){
  const data=mirror?mirrorTactic(source,E.CW):structuredClone(source),s=data.steps;
  const cue=(node,say,look)=>{node.pov={RB:{cues:[{t:0,face:'GOAL',look,say}]}};};
  const chain=parts=>{let t=0;const actions=[],cues=[];for(const p of parts){actions.push(...p.actions.map(a=>({...structuredClone(a),t:a.t+t})));cues.push(...(p.pov?.RB?.cues||[]).map(c=>({...c,t:c.t+t})));t+=E.duration(p.actions);}return {actions,pov:{RB:{cues}}};};
  let stepNames,choiceLabels;
  if(!mirror){
    cue(s[0],'左でCC。LWの動きを見て、右で受ける準備。',['LB','LW']);
    cue(s[1],'LWが右2–3へカラ走り。少し左へ寄ってCBから受ける。',['LW','CB','R2']);
    cue(s[2],'受球直後に判断。右3・LW・PVと左3を見る。',['R3','LW','PV','L3']);
    s[2].decisionAt=.9;
    s[2].branches.forEach(b=>{
      b.actions=b.actions.filter(a=>!(a.who==='PV'&&a.type==='move'&&a.t===0));
      // Keep non-decision movements on their original clock after the choice.
      const changed=new Set(b.actions.filter(a=>['move','block'].includes(a.type)).map(a=>a.who));
      const ongoing=s[2].actions.filter(a=>a.t<.9||(['move','block'].includes(a.type)&&!changed.has(a.who)));
      b.actions=[...ongoing,...b.actions.map(a=>({...a,t:a.t+.9}))];
      b.playFrom=.9;cue(b,b.text,['R3','LW','PV','L3']);
    });
    data.steps=s.slice(0,3);
    stepNames=['左のCCを見る','右で受球準備','受球・4つの判断'];
    choiceLabels=['① 右3枚目が出なければ\n→ ロングシュート','② 右3枚目をつり出せたら\n→ LWへバウンドパス','③ 左3枚目がPVについて来なければ\n→ PVへポストパス','④ 左3枚目がPVにかぶったら\n→ CBへ逆展開・アウト割り'];
  }else{
    cue(s[0],'右から始動するRB。アウトを狙い、RWへのCC・PV・1–2を見る。',['R2','RW','PV']);
    cue(s[1],'CCで渡した後は右サイドへ。RWは逆側へカラ走り。',['RW','CB']);
    cue(s[2],'左のLBとRWが縦の2対2。自分は右サイドで待つ。',['LB','RW','PV']);
    const long=s[2].branches[0];cue(long,'左3が出なければLBがロング。自分は右サイドの役。',['LB','L3']);
    // Preserve the whole original CC and subsequent movement interpolation.
    const last={...long,actions:[...s[2].actions.filter(a=>a.t<.9),...long.actions.map(a=>({...a,t:a.t+.9}))]};
    const cc={...chain([s[0],s[1],last]),from:1.9,playFrom:1.9,label:'①RWへCC → 左のLBがロング',text:'アウトを強く狙ってRWへCC。右サイドへ移り、逆側の縦の2対2を見届ける。'};
    const options=s[0].branches.slice(0,2);options.forEach(b=>cue(b,b.text,['R2','PV']));
    s[0].branches=[cc,...options];s[0].decisionAt=1.9;data.steps=[s[0]];
    stepNames=['右からCC・判断'];
    choiceLabels=['① 右2枚目を引き付けたら\n→ RWへCC・逆側の2対2へ','② 右2枚目が出てPVが空いたら\n→ PVへパス','③ 右1–2間が空いていれば\n→ カットイン'];
  }
  return {data,stepNames,choiceLabels,view:{overview:true,back:4.5,height:3.6}};
}
