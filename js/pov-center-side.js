// Set 07 presentation only. Preserve the source action timelines and coordinates.
import {mirrorTactic} from './mirror-tactic.js?v=202609200641';
export function centerSidePov(source,mirror,E){
  const data=mirror?mirrorTactic(source,E.CW):structuredClone(source);
  const steps=data.steps;
  const cue=(t,look,say)=>({t,face:'GOAL',look,say});
  const cues=(node,list)=>{node.pov={RB:{cues:list}};};
  const chain=parts=>{
    let offset=0;const actions=[],list=[];
    for(const part of parts){
      actions.push(...part.actions.map(a=>({...structuredClone(a),t:a.t+offset})));
      list.push(...(part.pov?.RB?.cues||[]).map(c=>({...c,t:c.t+offset})));
      offset+=E.duration(part.actions);
    }
    return {actions,pov:{RB:{cues:list}}};
  };
  let stepNames,choiceLabels;
  if(!mirror){
    cues(steps[0],[cue(0,['CB','RW','R2'],'CBとRWのクロスを見る。自分はCBの後ろを回って中央へ。')]);
    cues(steps[1],[cue(0,['RW','L3','R3'],'RWから受ける。左右の3枚目とパス先を見る。')]);
    cues(steps[2],[
      {...cue(0,['LB','L2'],'① 左2を見る → LBへパス。パスした後も自分の仕事は続く。'),stop:true},
      cue(.8,['L2','RB','LB'],'② 左2の内側へ先回り。床の目印へ入り、LBへの進路に体を置く。'),
      {...cue(2.2,['L2','RB','LB'],'③ 足を止める。腕で押さず体で進路を遮り、LBの助走を見る。'),stop:true}
    ]);
    cues(steps[3],[{...cue(.3,['L2','RB','LB'],'④ 左2の進路を塞いだまま、LBが9mから打つ。自分も内側を向き、パスに備える。'),stop:true}]);
    const options=steps[1].branches.filter(b=>b.group==='RBの選択肢');
    const reads=[['L3','R3'],['L3','PV'],['L2','LB'],['R3','RW']];
    choiceLabels=['① 両3枚目が出なければ\n→ 中央からロング','② 左3枚目が出て裏が空いたら\n→ PVへパス','③ 左2枚目がけん制に出たら\n→ カラ走りするLBへパス','④ 右3枚目が自分に来たら\n→ RWへリターンパス','基本プレー：自分が左2をブロック\n→ LBにロングを打たせる'];
    options.forEach((b,i)=>cues(b,[cue(0,reads[i],b.text)]));
    // Replay the ORIGINAL remaining main timeline from 1.5s, not a re-eased
    // partial move from its current position. CB/LB are still moving here.
    const continuation={...chain(steps.slice(1)),group:'本線',label:'LBへつなぎ、インブロックからLBのロング',text:steps[2].text,from:1.5,playFrom:1.5};
    continuation.basic=true;
    continuation.screenLesson={blocker:'RB',defender:'L2',shooter:'LB',start:2.3,move:3.1,arrive:4.5,shot:5.1,end:6.3,at:[6.1,6.1]};
    steps[1].branches=[...options,continuation];steps[1].decisionAt=1.5;
    data.steps=steps.slice(0,2);steps[0].branches=[];
    stepNames=['クロスと回り込み','中央で受球・判断'];
  }else{
    cues(steps[0],[cue(0,['CB','LW','L2'],'CBとLWのクロスを見る。自分は右からロングの準備。')]);
    cues(steps[1],[cue(0,['LB','R2','R3'],'中央のLBへボールが渡る。右側から次のパスに備える。')]);
    cues(steps[2],[cue(0,['LB','R2','R3'],'LBから受ける。ブロックと守備を見て、ロングかパスを選ぶ。'),cue(.9,['R2','LB','RB'],'LBが右2の内側へ入る。自分はブロックを使って中へ助走。'),{...cue(2.2,['R2','LB','RB'],'LBが足を止め、右2の進路を塞ぐ。その内側から自分がロングを狙う。'),stop:true}]);
    cues(steps[3],[cue(0,['R3','L3'],'3枚目が出なければ、ブロックを使ってロング。')]);
    const originalOptions=steps[3].branches;
    const reads=[['R3','L3','PV'],['R3','LB'],['L2','LW']];
    originalOptions.forEach((b,i)=>cues(b,[cue(0,reads[i],b.text)]));
    const routes=[{...steps[3],label:'ブロックを使ってRBのロング',text:steps[3].text},...originalOptions];
    steps[2].branches=routes.map(b=>({...chain([steps[2],b]),label:b.label,text:b.text,group:'RBの判断',from:.8,playFrom:.8}));
    steps[2].branches.forEach((b,i)=>{b.screenLesson={blocker:'LB',defender:'R2',shooter:'RB',start:0,move:.8,arrive:2.2,shot:2.8,end:i===0?4:2.4,at:[13.9,6.1]};});
    steps[2].branches[0].basic=true;
    steps[2].decisionAt=.8;
    data.steps=steps.slice(0,3);steps[0].branches=[];steps[1].branches=[];
    stepNames=['左のクロスを見る','中央のLBへ','受球・ロングの判断'];
    choiceLabels=['① 3枚目が出なければ\n→ ブロックを使ってロング','② 両3枚目が出てPVが空いたら\n→ PVへポストパス','③ 右3枚目が出てLBの前が空いたら\n→ ブロック役のLBへパス','④ 裏の展開：左2枚目を中へ寄せたら\n→ フェイクからLWへ並行パス'];
  }
  return {data,stepNames,choiceLabels,view:{overview:true,back:mirror?3.6:5,height:3.6}};
}
