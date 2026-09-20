import {T,buildGym,makeAthlete,poseAthlete,makeBall,makeHands} from './court-3d.js?v=202609201158';
import {makeScreenLesson} from './screen-lesson.js?v=202609201158';
import {ccDappoPov} from './pov-cc-dappo.js?v=202609201158';
import {centerSidePov} from './pov-center-side.js?v=202609201158';
import {mirrorTactic} from './mirror-tactic.js?v=202609201158';
const PARAMS=new URLSearchParams(location.search),MIRRORED=PARAMS.get('mirror')==='1';
const TACTIC_ID=['06','07','08'].includes(PARAMS.get('id'))?PARAMS.get('id'):'05',SIDE_YUGO=TACTIC_ID==='06',CENTER_SIDE=TACTIC_ID==='07',CC_DAPPO=TACTIC_ID==='08';
const TACTIC_NAME=CC_DAPPO?'CCダッポ':CENTER_SIDE?'センターサイド':SIDE_YUGO?'サイドユーゴ':'ユーゴ';
const E=window.TacticEngine,$=id=>document.getElementById(id),clamp=T.MathUtils.clamp;
const CENTER=CC_DAPPO?ccDappoPov(window.TACTICS['08'],MIRRORED,E):CENTER_SIDE?centerSidePov(window.TACTICS['07'],MIRRORED,E):null;
const STEP_NAMES=CENTER?CENTER.stepNames:SIDE_YUGO?(MIRRORED?['右から始動','CBから受球','RBの判断']:['左から始動','CBの1対1','RBへ展開','広い3対2']):MIRRORED?['回り込み','RBとPVの判断']:['逆パス','回り込み','RBへ','最後の判断'];
const CHOICE_STEP=STEP_NAMES.length-1;
const CHOICE_LABELS=CENTER?CENTER.choiceLabels:SIDE_YUGO?(MIRRORED?['① 左3枚目が出なければ\n→ ケンケンからロング','② 左3枚目が出て裏が空いたら\n→ 再スライドしたPVへパス','③ 左2–3間を攻め、左2が寄れば\n→ 並行で走り込むLBへパス','④ フェイクで左2が外へ寄れば\n→ 左2–3間へ走るLBにパス']:['① 右1枚目と右2枚目の間が空けば\n→ アウト割りでシュート','② 右1枚目が自分に出てきたら\n→ 内側へ並行で走るRWにパス','③ 右2枚目が自分に寄ってきたら\n→ PVへポストパス']):MIRRORED?['① 3枚目が出なければ\n→ ロングシュート','② 左3枚目が出てきたら\n→ LBへパスし、PVへつなぐ','③ 右3枚目が出てきたら\n→ CBへパスし、PVへつなぐ','④ 左3枚目がけん制したら\n→ PVへパスし、左で3対2','⑤ 右3枚目がけん制したら\n→ 左でもらい、PVと縦の2対1']:['① アウト割り','② PVパス','③ サイド落とし'];

// A continuation retains its original time origin: never restart an in-progress
// movement at the receive position with a fresh easing curve.
class TrainingPlayer extends E.Player {
  currentSequence(){
    if(this.branch?.playFrom!==undefined)return {start:this.stepStarts[this.stepIndex],actions:this.branch.actions};
    return super.currentSequence();
  }
  restart(play=true){
    if(!CENTER)return super.restart(play);
    this.playing=false;this.runId++;clearTimeout(this.autoTimer);
    this.seq=this.currentSequence();
    this.total=this.branch?E.duration(this.seq.actions):this.step.decisionAt??E.duration(this.seq.actions);
    this.t=this.branch?.playFrom??0;
    this.drawStatic();this.render();this.onChange();
    if(play)this.play();
  }
}

// Retain the existing cue timeline and branch state calculation; render in WebGL.
class CourtView extends window.PovView {
  constructor(player){
    super(player,{pos:'RB',canvas:document.createElement('canvas'),minimap:$('court'),callout:$('callout'),stopBox:$('stopBox'),format:s=>s});
    this.canvas=$('scene');this.learning=true;this.yawOffset=0;this.pitchOffset=0;this.wide=false;this.overview=CENTER?.view.overview??SIDE_YUGO;
    this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;
    this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(70,1,.06,90);this.scene.add(this.camera);
    buildGym(this.scene,this.renderer);this.athletes={};this.labels={};
    Object.entries(player.data.players).forEach(([id,p],i)=>{
      if(id==='RB'&&!SIDE_YUGO&&!CENTER)return;
      this.athletes[id]=makeAthlete(this.scene,id,p.team==='df',i);
      if(id==='RB'&&!CENTER)return;
      const label=document.createElement('span');label.className='player-label'+(p.team==='df'?' df':'');$('labels').append(label);this.labels[id]=label;
    });
    this.ball=makeBall(this.scene);this.hands=makeHands(this.camera);this.screenGuide=makeScreenLesson(T,this.scene);
    this.sound=new CourtSound();this.bindLook();this.resize();this.redraw();
    this.resizeObserver=new ResizeObserver(()=>{this.resize();this.redraw();});this.resizeObserver.observe(this.canvas.parentElement);
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();player.pause();$('loading').hidden=false;$('loading').textContent='3D描画が中断しました。ページを再読み込みしてください。';updateUI();});
    $('loading').hidden=true;
  }
  resize(){
    if(!this.renderer)return;
    this.W=this.canvas.clientWidth;this.H=this.canvas.clientHeight;
    if(!this.W||!this.H)return;
    const hfov=(this.wide?115:96)*Math.PI/180;
    this.hfov=hfov;this.camera.aspect=this.W/this.H;
    this.camera.fov=T.MathUtils.radToDeg(2*Math.atan(Math.tan(hfov/2)/this.camera.aspect));this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.W,this.H,false);
  }
  bindLook(){
    let drag=null;
    this.canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};this.canvas.setPointerCapture(e.pointerId);});
    this.canvas.addEventListener('pointermove',e=>{
      if(!drag)return;
      this.yawOffset-=(e.clientX-drag.x)/this.W*this.hfov;
      this.pitchOffset=clamp(this.pitchOffset+(e.clientY-drag.y)/this.H*1.1,-.55,.55);
      drag={x:e.clientX,y:e.clientY};this.redraw();
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])this.canvas.addEventListener(event,()=>{drag=null;});
    this.canvas.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();
      if(e.key==='Home'){this.yawOffset=0;this.pitchOffset=0;}
      else if(e.key==='ArrowLeft')this.yawOffset-=.12;else if(e.key==='ArrowRight')this.yawOffset+=.12;
      else this.pitchOffset=clamp(this.pitchOffset+(e.key==='ArrowUp'?.1:-.1),-.55,.55);
      this.redraw();
    });
  }
  cuesOf(node){
    const cues=super.cuesOf(node);
    return CENTER_SIDE&&!this.lessonBreaks?cues.map(c=>({...c,stop:false})):cues;
  }
  onRender(st,t){
    super.onRender(st,t);
    // Learning mode waits for an explicit user action even during continuous play.
    if(this.stopped)clearTimeout(this.stopTimer);
    if(this.renderer)updateUI();
  }
  showStop(c){
    super.showStop(c);
    this.stopBox.querySelector('.small').textContent='タップまたは「続き」で再開 ▶';
  }
  drawMini(st){
    const c=this.cam,R=9,M=E.M,a=Math.atan2(c.fw.y,c.fw.x);let d=`M ${c.x*M} ${c.y*M}`;
    for(let i=0;i<=18;i++){const b=a-this.hfov/2+this.hfov*i/18;d+=` L ${(c.x+R*Math.cos(b))*M} ${(c.y+R*Math.sin(b))*M}`;}
    this.fov.innerHTML=`<path d="${d} Z" fill="#d7f26666" stroke="#859735" stroke-width="4"/><circle cx="${st.pos.RB.x*M}" cy="${st.pos.RB.y*M}" r="43" fill="none" stroke="#1b4d41" stroke-width="10"/>`;
  }
  draw(st,t){
    if(!this.renderer)return;
    const me=st.pos.RB;
    const cue=this.cueAt(this.contexts().cur.cues,t),looks=new Set([].concat(cue?.look||[]));
    const actions=this.p.seq.actions;
    const fakeAction=actions.find(a=>a.type==='fake'&&t>=a.t&&t<a.t+a.dur);
    if(this.motionSequence!==this.p.seq){
      this.motionSequence=this.p.seq;this.motionTracks={};
      for(const action of actions){
        if(!['move','block'].includes(action.type))continue;
        const start=E.stateAt(this.p.seq.start,actions,action.t).pos[action.who];
        const pts=[[start.x,start.y],...action.to];let length=0;
        for(let k=1;k<pts.length;k++)length+=Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]);
        (this.motionTracks[action.who]??=[]).push({t:action.t,dur:action.dur,length});
      }
    }
    const previous=E.stateAt(this.p.seq.start,actions,Math.max(0,t-.06));
    const future=E.stateAt(this.p.seq.start,actions,Math.min(this.p.total,t+.06));
    for(const [id,model] of Object.entries(this.athletes)){
      model.root.visible=id!=='RB'||this.overview;
      const q=st.pos[id],a=previous.pos[id],b=future.pos[id],mx=b.x-a.x,mz=b.y-a.y;
      const speed=Math.hypot(mx,mz)/Math.max(.001,Math.min(this.p.total,t+.06)-Math.max(0,t-.06));
      const moving=speed>.05;
      let target=model.def?(st.ballPos||st.pos[st.holder]||me):E.GOAL;
      if(moving&&!model.def){const blend=T.MathUtils.smoothstep(speed,.05,1.5),len=Math.hypot(mx,mz)||1,goalLen=Math.hypot(target.x-q.x,target.y-q.y)||1;target={x:q.x+(mx/len)*blend+(target.x-q.x)/goalLen*(1-blend),y:q.y+(mz/len)*blend+(target.y-q.y)/goalLen*(1-blend)};}
      let throwing=null,receiving=false,shooting=false,throwSide=1;
      for(const action of actions){
        if(action.type==='pass'&&action.to===id&&t>=action.t-.25&&t<=action.t+action.dur+.15){
          receiving=true;target=st.pos[action.from];
          if(CENTER&&id==='RB'){
            // Settle the catch toward the goal before the neutral decision.
            const arrival=action.t+action.dur,u=T.MathUtils.smoothstep(t,arrival-.2,arrival+.1);
            target={x:target.x+(E.GOAL.x-target.x)*u,y:target.y+(E.GOAL.y-target.y)*u};receiving=u<1-1e-8;
          }
        }
        if(((action.type==='pass'&&action.from===id)||(action.type==='shoot'&&action.who===id))&&t>=action.t-.35&&t<action.t+.5){
          throwSide=action.hand==='左'?-1:1;throwing=clamp((t-action.t+.35)/.85,0,1);shooting=action.type==='shoot';target=action.type==='pass'?st.pos[action.to]:E.GOAL;
        }
      }
      if(fakeAction?.from===id){
        throwing=.35*Math.sin((t-fakeAction.t)/fakeAction.dur*Math.PI);target=st.pos[fakeAction.to];
      }
      let blocking=0;
      const lesson=this.p.branch?.screenLesson;
      if(CENTER_SIDE&&lesson&&id===lesson.blocker){
        const last=actions.filter(a=>a.who===id&&['block','move'].includes(a.type)&&a.t<=t).sort((a,b)=>b.t-a.t)[0];
        if(last?.type==='block'&&st.holder!==id){
          const begin=E.stateAt(this.p.seq.start,actions,last.t).pos[id],end=last.to.at(-1);
          blocking=Math.hypot(begin.x-end[0],begin.y-end[1])<.01?1:T.MathUtils.smoothstep(t,last.t+last.dur-.25,last.t+last.dur);
          const face={x:MIRRORED?11.6:8.4,y:9.4};
          target={x:target.x+(face.x-target.x)*blocking,y:target.y+(face.y-target.y)*blocking};
        }
      }
      model.blocking=blocking;
      model.root.position.set(q.x,0,q.y);model.root.rotation.y=Math.atan2(target.x-q.x,target.y-q.y);
      let distance=0,acceleration=0;for(const track of this.motionTracks[id]||[]){const u=clamp((t-track.t)/track.dur,0,1),e=u<.5?2*u*u:-1+(4-2*u)*u;distance+=track.length*e;if(u>0&&u<1)acceleration+=4*track.length/(track.dur*track.dur)*(1-2*T.MathUtils.smoothstep(u,.38,.62));}
      const yaw=model.root.rotation.y,lateral=model.def&&moving?clamp((mx*Math.cos(yaw)-mz*Math.sin(yaw))/(Math.hypot(mx,mz)||1),-1,1):0;
      poseAthlete(model,{speed,phase:distance*5.2+model.phaseOffset,holding:st.holder===id,throwing,receiving,acceleration,lateral,shooting,blocking,throwSide});
      model.ring.visible=this.learning&&(looks.has(id)||st.holder===id);
    }
    const ownBall=st.holder==='RB'&&(!st.ballPos||fakeAction?.from==='RB')&&!st.shotDone;
    let release=null,catching=0;
    for(const action of actions){
      if(((action.type==='pass'&&action.from==='RB')||(action.type==='shoot'&&action.who==='RB'))&&t>=action.t-.28&&t<action.t+.22)release={u:clamp((t-action.t+.28)/.5,0,1)};
      if(action.type==='pass'&&action.to==='RB'){const arrival=action.t+action.dur;if(t>=arrival-.25&&t<arrival+.2)catching=Math.sin(clamp((t-arrival+.25)/.45,0,1)*Math.PI);}
    }
    this.hands.visible=!this.overview&&(ownBall||!!release||catching>0);
    this.hands.userData.ball.visible=ownBall&&!this.overview;
    this.hands.position.set(0,-.32+catching*.045,-.65-catching*.06);
    this.hands.rotation.set(0,0,0);
    if(release){const wind=Math.sin(Math.min(release.u/.56,1)*Math.PI/2),follow=T.MathUtils.smoothstep(release.u,.56,1);this.hands.position.x=.07*wind;this.hands.position.y+=.08*wind-.12*follow;this.hands.position.z+=.08*wind-.22*follow;this.hands.rotation.x=-.16*wind+.25*follow;this.hands.rotation.z=-.1*wind;}
    if(fakeAction?.from==='RB'){
      const lift=Math.sin((t-fakeAction.t)/fakeAction.dur*Math.PI);
      this.hands.position.y+=.18*lift;this.hands.position.z-=.08*lift;this.hands.rotation.x=-.2*lift;
    }
    let handBlend=0;
    this.ball.visible=(this.overview||!ownBall)&&(!!st.ballPos||!!st.holder);
    if(this.ball.visible){
      const inFlight=!!st.ballPos&&!fakeAction;
      const q=inFlight?st.ballPos:st.pos[st.holder];let x=q.x,z=q.y,height=inFlight?st.ballZ:1.15;
      if(!inFlight&&this.athletes[st.holder]){const rot=this.athletes[st.holder].root.rotation.y;x+=Math.sin(rot)*.32;z+=Math.cos(rot)*.32;}
      // A pass reaches the hands in front of the eyes, not the camera's feet.
      // Keep the tactical state unchanged; only connect the visible catch/release to the hands.
      const handAction=actions.find(a=>t>=a.t&&t<a.t+a.dur&&((a.type==='pass'&&(a.to==='RB'||a.from==='RB'))||(a.type==='shoot'&&a.who==='RB')));
      const distance=Math.hypot(x-me.x,z-me.y);
      if(handAction&&distance<1&&!this.overview){
        handBlend=T.MathUtils.smoothstep(1-distance,0,1);
        const target=handAction.type==='shoot'?E.GOAL:st.pos[handAction.from==='RB'?handAction.to:handAction.from];
        const vx=distance>1e-6?x-me.x:target.x-me.x,vz=distance>1e-6?z-me.y:target.y-me.y;
        const length=Math.hypot(vx,vz)||1;
        x=me.x+vx/length;z=me.y+vz/length;
      }
      this.ball.position.set(x,height,z);this.ball.rotation.set(t*2,t*3,0);
    }
    if(this.overview){
      const hand=this.athletes.RB.limbs[1].hand;
      hand.updateWorldMatrix(true,false);
      const held=hand.getWorldPosition(new T.Vector3());held.y+=.08;
      if(ownBall)this.ball.position.copy(held);
      else if(this.ball.visible){
        const transfer=actions.find(a=>t>=a.t&&t<a.t+a.dur&&((a.type==='pass'&&(a.from==='RB'||a.to==='RB'))||(a.type==='shoot'&&a.who==='RB')));
        if(transfer){const u=(t-transfer.t)/transfer.dur,near=transfer.to==='RB'?u:1-u;this.ball.position.lerp(held,T.MathUtils.smoothstep(near,.75,1));}
      }
    }
    // The sheet explicitly specifies the left-handed CC (right when mirrored).
    const ccPass=actions.find(a=>a.type==='pass'&&a.hand&&t>=a.t-.35&&t<a.t+a.dur);
    if(ccPass&&this.ball.visible){
      const arm=this.athletes[ccPass.from]?.limbs[ccPass.hand==='左'?-1:1];
      if(arm){const hand=arm.hand.getWorldPosition(new T.Vector3());hand.y+=.08;
        const weight=t<ccPass.t?1:1-T.MathUtils.smoothstep((t-ccPass.t)/ccPass.dur,0,.25);
        this.ball.position.lerp(hand,weight);
      }
    }
    this.frameCamera(st,t);
    if(handBlend>0){
      this.hands.updateWorldMatrix(true,true);
      const target=this.hands.userData.ball.getWorldPosition(new T.Vector3());
      this.ball.position.lerp(target,handBlend);this.hands.visible=true;
    }
    this.screenGuide.update(st,t,this.p.branch?.screenLesson,this.learning);
    this.updateLabels(st,looks);this.drawMini(st);this.drawCallout(cue);
    $('shot').hidden=!st.shotDone;$('viewStatus').textContent=(this.overview?'RB後方 · ':'RB目線 · ')+(Math.abs(this.yawOffset)+Math.abs(this.pitchOffset)>.02?'見回し中':'自動視線');
    this.renderer.render(this.scene,this.camera);this.sound?.update(st,t,this.p);
  }
  frameCamera(st,t){
    const me=st.pos.RB,eye=new T.Vector3(me.x,1.6,me.y);
    const goalDirection=new T.Vector3(me.x-E.GOAL.x,0,me.y-E.GOAL.y).normalize();
    if(this.overview)eye.addScaledVector(goalDirection,CENTER?.view.back??3.6).setY(CENTER?.view.height??3.6);
    const lesson=this.p.branch?.screenLesson;
    const focus=this.overview&&lesson?T.MathUtils.smoothstep(t,Math.max(lesson.start,this.p.branch.playFrom??0),lesson.arrive):0;
    if(focus&&!MIRRORED)eye.lerp(new T.Vector3(me.x+1.8,3.8,me.y+6),focus);
    const fw=this.forwardAt(t),preferred=this.overview?Math.atan2(E.GOAL.y-eye.z,E.GOAL.x-eye.x):Math.atan2(fw.y,fw.x);
    const baseHFov=T.MathUtils.degToRad(this.wide?115:this.overview?T.MathUtils.lerp(this.camera.aspect<1?76:106,this.camera.aspect<1?62:82,focus):96),margin=.82;
    const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
    const goalAngle=Math.atan2(E.GOAL.y-eye.z,E.GOAL.x-eye.x);
    // Frame the full goal and the rendered ball, including its radius. Apply this
    // AFTER cue smoothing: the inherited 2D view assumes a different field of view.
    const points=[];
    for(const x of [8.45,11.55])for(const y of [0,2.05])points.push(new T.Vector3(x,y,0));
    if(this.ball.visible){
      const center=this.ball.position;
      points.push(center.clone());
      for(const axis of ['x','y','z'])for(const sign of [-1,1]){
        const p=center.clone();p[axis]+=.14*sign;points.push(p);
      }
    }
    if(this.overview){
      // Keep the nearby attacking line and defensive line in the same frame.
      for(const [id,q] of Object.entries(st.pos)){
        const key=lesson&&[lesson.blocker,lesson.defender,lesson.shooter].includes(id);
        if(key||q.y<=me.y+1&&Math.hypot(q.x-me.x,q.y-me.y)<6){
          const f=key?0:focus,x=q.x+(me.x-q.x)*f,z=q.y+(me.y-q.y)*f;
          points.push(new T.Vector3(x,0,z),new T.Vector3(x,1.9,z));
        }
      }
    }
    const bearingPoints=this.overview?[...points]:points.slice(0,4);if(this.ball.visible)bearingPoints.push(this.ball.position);
    const bearings=bearingPoints.map(p=>wrap(Math.atan2(p.z-eye.z,p.x-eye.x)-goalAngle));
    const lo=Math.min(...bearings),hi=Math.max(...bearings);
    const safeHalf=Math.atan(Math.tan(baseHFov/2)*margin);
    const middle=(lo+hi)/2,freedom=Math.max(0,safeHalf-(hi-lo)/2);
    const yaw=goalAngle+clamp(wrap(preferred-goalAngle),middle-freedom,middle+freedom);
    const elevations=points.map(p=>Math.atan2(p.y-eye.y,Math.hypot(p.x-eye.x,p.z-eye.z)));
    const bottom=Math.min(...elevations),top=Math.max(...elevations);
    const vHalf=Math.atan(Math.tan(baseHFov/2)/this.camera.aspect*margin);
    const vMiddle=(bottom+top)/2,vFreedom=Math.max(0,vHalf-(top-bottom)/2);
    const pitch=clamp(this.overview?-.48:-.07,vMiddle-vFreedom,vMiddle+vFreedom);
    const aim=(a,p)=>{
      this.camera.position.copy(eye);
      this.camera.lookAt(eye.x+Math.cos(a)*Math.cos(p),eye.y+Math.sin(p),eye.z+Math.sin(a)*Math.cos(p));
      this.camera.updateMatrixWorld();
    };
    aim(yaw,pitch);
    let tanHalf=Math.tan(baseHFov/2);
    for(const point of points){
      const local=point.clone().applyMatrix4(this.camera.matrixWorldInverse),depth=Math.max(.01,-local.z);
      tanHalf=Math.max(tanHalf,Math.abs(local.x)/depth/margin,Math.abs(local.y)/depth*this.camera.aspect/margin);
    }
    this.hfov=2*Math.atan(tanHalf);
    this.camera.fov=T.MathUtils.radToDeg(2*Math.atan(tanHalf/this.camera.aspect));
    this.camera.updateProjectionMatrix();
    // Manual looking remains available; reset restores automatic framing.
    const angle=yaw+this.yawOffset;
    aim(angle,pitch+this.pitchOffset);
    this.cam={x:eye.x,y:eye.z,fw:{x:Math.cos(angle),y:Math.sin(angle)},rt:{x:-Math.sin(angle),y:Math.cos(angle)}};
  }
  updateLabels(st,looks){
    const edges={left:0,right:0},placed=[];
    const ordered=Object.entries(this.labels).sort(([a],[b])=>Number(looks.has(b))-Number(looks.has(a)));
    for(const[id,label]of ordered){
      const p=st.pos[id],v=new T.Vector3(p.x,1.92,p.y).project(this.camera);
      const rx=p.x-this.cam.x,rz=p.y-this.cam.y,depth=rx*this.cam.fw.x+rz*this.cam.fw.y;
      const attention=looks.has(id),outside=depth<.1||Math.abs(v.x)>.93||Math.abs(v.y)>.91;
      label.hidden=(id==='RB'&&!this.overview)||!this.learning||(!attention&&st.holder!==id&&(outside||Math.hypot(rx,rz)>6));
      label.classList.toggle('attention',attention);label.classList.toggle('edge',outside);
      if(label.hidden)continue;
      let x=(v.x+1)*this.W/2,y=(1-v.y)*this.H/2;
      if(outside){const right=rx*this.cam.rt.x+rz*this.cam.rt.y>=0;const side=right?'right':'left';x=right?this.W-32:32;y=this.H*.42+edges[side]++*28;label.textContent=right?`${this.label(id)} →`:`← ${this.label(id)}`;}
      else {
        const lesson=this.p.branch?.screenLesson,active=lesson&&this.p.t>=lesson.start&&this.p.t<=lesson.end;
        label.textContent=active&&id===lesson.blocker?`${id==='RB'?'自分RB':id}：${this.label(lesson.defender)}をブロック`:active&&id===lesson.defender?`${this.p.t<lesson.contact-1e-8?'追う':'止まる'}：${this.label(id)}`:active&&id===lesson.shooter?`${id==='RB'?'自分RB':id}：ロング`:id==='RB'?'自分RB':(attention?'見る · ':'')+this.label(id);
      }
      const half=label.offsetWidth/2;
      x=clamp(x,half+6,this.W-half-6);y=Math.max(label.offsetHeight+8,y);
      const mini=$('court').closest('.mini').getBoundingClientRect(),canvas=this.canvas.getBoundingClientRect();
      const underMap=()=>x+half>mini.left-canvas.left&&x-half<mini.right-canvas.left&&y>mini.top-canvas.top&&y-label.offsetHeight<mini.bottom-canvas.top;
      if(underMap())y=mini.bottom-canvas.top+label.offsetHeight+8;
      const overlaps=()=>placed.some(p=>Math.abs(p.x-x)<64&&Math.abs(p.y-y)<23);
      if(overlaps()){if(!attention){label.hidden=true;continue;}while(overlaps())y-=25;if(underMap()){y=mini.bottom-canvas.top+label.offsetHeight+8;while(overlaps())y+=25;}}
      placed.push({x,y});
      label.style.left=x+'px';label.style.top=y+'px';
    }
  }
  setLearning(value){
    this.learning=value;this.reducedMotion=this.p.reducedMotion||!value;
    document.body.classList.toggle('experience',!value);
    $('learn').classList.toggle('selected',value);$('experience').classList.toggle('selected',!value);
    $('learn').setAttribute('aria-pressed',String(value));$('experience').setAttribute('aria-pressed',String(!value));
    if(this.stopped&&!value)this.clearStop();this.resize();this.redraw();updateUI();
  }
}

class CourtSound {
  constructor(){this.enabled=false;this.previous=null;}
  async toggle(){
    if(!this.context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;this.context=new AC();}
    await this.context.resume();this.enabled=!this.enabled;this.previous=null;return this.enabled;
  }
  hit(kind){
    if(!this.enabled||this.context.state!=='running')return;
    const c=this.context,now=c.currentTime,g=c.createGain(),o=c.createOscillator();
    o.type=kind==='shoe'?'triangle':'sine';o.frequency.setValueAtTime(kind==='shoe'?480:170,now);o.frequency.exponentialRampToValueAtTime(kind==='shoe'?120:55,now+.08);
    g.gain.setValueAtTime(kind==='shoe'?.025:.10,now);g.gain.exponentialRampToValueAtTime(.001,now+.12);o.connect(g);g.connect(c.destination);o.start(now);o.stop(now+.13);
    o.onended=()=>{o.disconnect();g.disconnect();};
  }
  update(st,t,p){
    const prev=this.previous;this.previous={t,seq:p.seq,holder:st.holder,shot:st.shotDone};
    if(!this.enabled||!p.playing||!prev||prev.seq!==p.seq||t<prev.t||t-prev.t>.15)return;
    if((st.holder&&st.holder!==prev.holder)||(st.shotDone&&!prev.shot))this.hit('ball');
    else if(st.activeMoves.length&&Math.floor(t/.36)!==Math.floor(prev.t/.36))this.hit('shoe');
    for(const a of p.seq.actions)if(a.type==='pass'&&a.kind==='bounce'&&prev.t<a.t+a.dur*.65&&t>=a.t+a.dur*.65)this.hit('ball');
  }
}

let player,view,terminalSeen=null,changing=false;
const panelIds=['choicePanel','resultPanel','settingsPanel'];
function hidePanels(){
  panelIds.forEach(id=>$(id).hidden=true);
  document.body.classList.remove('panel-open');$('settingsBtn').setAttribute('aria-expanded','false');
}
function showPanel(id){
  hidePanels();$(id).hidden=false;document.body.classList.add('panel-open');
  $('settingsBtn').setAttribute('aria-expanded',String(id==='settingsPanel'));
}
function pausePlayback(){player.auto=false;clearTimeout(player.autoTimer);player.pause();}
function showChoices(){
  pausePlayback();changing=true;view.clearStop();
  player.gotoStep(CHOICE_STEP,false);player.t=player.total;player.render();
  terminalSeen=player.seq;changing=false;renderPanel();showPanel('choicePanel');
}
function startBranch(branch,explain=false){
  if(CENTER_SIDE){view.lessonBreaks=explain;view.clearStop();}
  hidePanels();view.yawOffset=0;view.pitchOffset=0;terminalSeen=null;
  player.playBranch(branch);renderPanel();
}
function updateUI(){
  if(!player)return;
  $('explainPlay').hidden=!CENTER_SIDE||!player.branch?.basic;
  const ended=player.t>=player.total;
  $('play').textContent=view?.stopped?'続き ▶':ended&&player.stepIndex===CHOICE_STEP?(player.branch?'↻ もう一度':'プレーを選ぶ'):player.playing||player.auto?'Ⅱ 一時停止':'▶ 再生';
  $('prev').disabled=player.stepIndex===0&&!player.branch;
  $('next').textContent=view?.stopped?'続き':player.stepIndex===CHOICE_STEP?'選ぶ':'次へ';
  $('sceneStep').textContent=`0${player.stepIndex+1} / 0${STEP_NAMES.length}`;
  $('modeName').textContent=view?.learning===false?'体験':'学習';
  const playFrom=player.branch?.playFrom??0,elapsed=player.t-playFrom,duration=player.total-playFrom;
  $('seek').value=duration?Math.round(elapsed/duration*1000):0;
  $('seek').disabled=player.total===0;
  $('time').textContent=player.total===0?'受球直後 · 判断待ち':`${elapsed.toFixed(1)} / ${duration.toFixed(1)}秒`;
  document.querySelectorAll('#steps button').forEach((b,i)=>{b.classList.toggle('active',i===player.stepIndex);b.setAttribute('aria-current',i===player.stepIndex?'step':'false');});
  if(view&&!changing&&!view.stopped&&player.t>=player.total&&terminalSeen!==player.seq){
    terminalSeen=player.seq;
    if(player.branch){pausePlayback();$('resultText').textContent=player.branch.label;showPanel('resultPanel');}
    else if(player.stepIndex===CHOICE_STEP){pausePlayback();showPanel('choicePanel');}
    else if(SIDE_YUGO&&MIRRORED&&player.stepIndex===CHOICE_STEP-1){showChoices();}
  }
}
function renderPanel(){
  if(!player)return;
  $('stepTitle').textContent=player.branch?player.branch.label:STEP_NAMES[player.stepIndex]+' · '+player.step.title;
  // Rebuild only when the branch changes, never for every animation frame.
  const b=$('branches');b.replaceChildren();
  for(const [i,branch] of [...player.data.steps[CHOICE_STEP].branches.entries()].sort((a,b)=>Number(!!b[1].basic)-Number(!!a[1].basic))){
    const button=document.createElement('button');button.textContent=CHOICE_LABELS[i];
    button.classList.toggle('basic-route',!!branch.basic);button.classList.toggle('active',player.branch===branch);button.onclick=()=>startBranch(branch);b.append(button);
  }
  updateUI();
}
function changeStep(i,play=false){
  hidePanels();pausePlayback();changing=true;view?.clearStop();terminalSeen=null;
  player.gotoStep(i,false);changing=false;renderPanel();
  if(play){player.auto=true;player.play();updateUI();}
}
try{
  const data=CENTER?CENTER.data:MIRRORED?mirrorTactic(window.TACTICS[TACTIC_ID],E.CW):structuredClone(window.TACTICS[TACTIC_ID]);data.steps=data.steps.slice(0,STEP_NAMES.length);data.steps.forEach((s,i)=>{if(i!==CHOICE_STEP)s.branches=[];});
  if(SIDE_YUGO&&MIRRORED){
    // Receive completes at 2.6s; the preceding step ends at 3.0s.
    // All alternatives start at this neutral state (from: 0), before L3 reacts.
    data.steps[CHOICE_STEP].actions=[];
    data.steps[CHOICE_STEP].pov.RB.cues=[];
  }
  document.body.classList.toggle('mirrored',MIRRORED);
  document.body.classList.toggle('side-yugo',SIDE_YUGO);
  document.body.classList.toggle('center-side',CENTER_SIDE);
  document.body.classList.toggle('conditional-choices',MIRRORED||SIDE_YUGO||!!CENTER);
  $('steps').style.gridTemplateColumns=`repeat(${STEP_NAMES.length},1fr)`;
  document.title=`${TACTIC_NAME}・${MIRRORED?'左右反転 ':''}RB目線 3D | ハンド動き解説`;
  document.querySelector('.lab').textContent=`${TACTIC_ID!=='05'?TACTIC_ID+' · ':''}3D${MIRRORED?' · 左右反転':''}`;
  document.querySelector('.stage').setAttribute('aria-label',`${TACTIC_NAME}・${MIRRORED?'左右反転・':''}RB目線の3D体育館`);
  if(MIRRORED||SIDE_YUGO||!!CENTER){
    $('choiceTitle').textContent=CC_DAPPO?(MIRRORED?'始動するRB：守備を見て選ぶ':'RBの縦の2対2：守備を見て選ぶ'):CENTER_SIDE?(MIRRORED?'RBのロング：守備を見て選ぶ':'中央のRB：守備を見て選ぶ'):MIRRORED?'中央のRB：守備を見て選ぶ':'RBの3対2：守備を見て選ぶ';
    $('choiceHint').textContent='守備の動き → 選ぶプレー。選択後はシュートまで再生。';
    $('modeHelp').textContent=`学習モードは見るポイントを表示し、判断時に一時停止します。体験モードは解説を減らして連続再生します。RBの${CHOICE_LABELS.length}択を選ぶと、パス先のプレーはシュートまで自動で進みます。`;
  }
  for(const link of document.querySelectorAll('.help a')){
    const url=new URL(link.href);url.searchParams.set('id',TACTIC_ID);
    if(MIRRORED)url.searchParams.set('mirror','1');link.href=url.href;
  }
  player=new TrainingPlayer(data,$('court'));player.pause();view=new CourtView(player);
  window.player=player;window.pov=view;window.court3d=view;
  player.onChange=renderPanel;
  const internal=$('court').querySelector('g#court');if(internal)internal.id='court-lines-3d';
  for(let i=0;i<STEP_NAMES.length;i++){const b=document.createElement('button');b.textContent=`${i+1} ${STEP_NAMES[i]}`;b.onclick=()=>changeStep(i);$('steps').append(b);}
  $('play').onclick=()=>{
    hidePanels();
    if(view.stopped)view.resume();
    else if(player.playing||player.auto)pausePlayback();
    else if(player.stepIndex===CHOICE_STEP&&!player.branch&&player.t>=player.total)showChoices();
    else{
      if(player.t>=player.total){changing=true;terminalSeen=null;player.restart(false);changing=false;}
      player.auto=!player.branch;player.play();
    }
    updateUI();
  };
  $('prev').onclick=()=>changeStep(player.branch?player.stepIndex:Math.max(0,player.stepIndex-1));
  $('next').onclick=()=>{hidePanels();if(view.stopped)view.resume();else if(player.stepIndex===CHOICE_STEP)showChoices();else changeStep(player.stepIndex+1);};
  $('choose').onclick=showChoices;
  $('basicPlay').hidden=!CENTER_SIDE;
  const basicLesson=explain=>{changing=true;pausePlayback();view.clearStop();player.gotoStep(CHOICE_STEP,false);changing=false;const basic=player.step.branches.find(b=>b.basic);if(explain)view.setLearning(true);startBranch(MIRRORED?{...basic,playFrom:0,from:0}:basic,explain);};
  $('basicPlay').onclick=()=>basicLesson(false);
  $('explainPlay').onclick=()=>basicLesson(true);
  const restart=()=>{view.yawOffset=0;view.pitchOffset=0;changeStep(0,true);};
  $('restartAlways').onclick=restart;$('restart').onclick=restart;$('startOver').onclick=restart;
  $('tryOther').onclick=showChoices;
  $('again').onclick=()=>{if(player.branch)startBranch(player.branch);else changeStep(player.stepIndex,true);};
  $('closeChoice').onclick=()=>{hidePanels();$('choose').focus({preventScroll:true});};
  $('closeResult').onclick=()=>{hidePanels();$('choose').focus({preventScroll:true});};
  $('settingsBtn').onclick=()=>{pausePlayback();showPanel('settingsPanel');updateUI();};
  $('closeSettings').onclick=()=>{hidePanels();$('settingsBtn').focus({preventScroll:true});};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){hidePanels();$('settingsBtn').focus({preventScroll:true});}});
  $('speed').onclick=()=>{const speeds=[.5,1,1.5];player.speed=speeds[(speeds.indexOf(player.speed)+1)%3];$('speed').textContent='速さ '+player.speed+'×';};
  $('seek').addEventListener('input',()=>{hidePanels();pausePlayback();view.clearStop();terminalSeen=null;const from=player.branch?.playFrom??0;player.t=from+(player.total-from)*Number($('seek').value)/1000;player.render();updateUI();});
  $('learn').onclick=()=>view.setLearning(true);$('experience').onclick=()=>view.setLearning(false);
  $('resetView').onclick=()=>{view.yawOffset=0;view.pitchOffset=0;view.redraw();};
  $('wide').onclick=()=>{view.wide=!view.wide;$('wide').setAttribute('aria-pressed',String(view.wide));$('wide').textContent=view.wide?'標準の視野':'広い視野';view.resize();view.redraw();};
  $('overview').hidden=!SIDE_YUGO&&!CENTER;
  $('overview').onclick=()=>{view.overview=!view.overview;$('overview').setAttribute('aria-pressed',String(view.overview));$('overview').textContent=view.overview?'視点：引いて全体':'視点：本人目線';view.yawOffset=0;view.pitchOffset=0;view.redraw();};
  $('sound').onclick=async()=>{try{const enabled=await view.sound.toggle();$('sound').textContent=enabled?'音 ON':'音 OFF';$('sound').setAttribute('aria-pressed',String(enabled));}catch{$('sound').textContent='音を使えません';}};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pausePlayback();view.sound.previous=null;updateUI();}});
  renderPanel();
}catch(error){
  player?.pause();console.error(error);$('loading').hidden=false;
  $('loading').replaceChildren(document.createTextNode('この環境では3Dを表示できません。'));
  const link=document.createElement('a');link.href='pov.html?id='+TACTIC_ID+'&pos=RB'+(MIRRORED?'&mirror=1':'');link.textContent='元のRB目線を開く';$('loading').append(link);
  for(const el of document.querySelectorAll('button,input'))el.disabled=true;
}
