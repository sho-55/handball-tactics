import {T,buildGym,makeAthlete,poseAthlete,makeBall,makeHands} from './court-3d.js?v=202609182302';
const E=window.TacticEngine,$=id=>document.getElementById(id),clamp=T.MathUtils.clamp;
const STEP_NAMES=['逆パス','回り込み','RBへ','最後の判断'];

// Retain the existing cue timeline and branch state calculation; render in WebGL.
class CourtView extends window.PovView {
  constructor(player){
    super(player,{pos:'RB',canvas:document.createElement('canvas'),minimap:$('court'),callout:$('callout'),stopBox:$('stopBox'),format:s=>s});
    this.canvas=$('scene');this.learning=true;this.yawOffset=0;this.pitchOffset=0;this.wide=false;
    this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(70,1,.06,90);this.scene.add(this.camera);
    buildGym(this.scene,this.renderer);this.athletes={};this.labels={};
    Object.entries(player.data.players).forEach(([id,p],i)=>{
      if(id==='RB')return;
      this.athletes[id]=makeAthlete(this.scene,id,p.team==='df',i);
      const label=document.createElement('span');label.className='player-label'+(p.team==='df'?' df':'');$('labels').append(label);this.labels[id]=label;
    });
    this.ball=makeBall(this.scene);this.hands=makeHands(this.camera);
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
    this.fov.innerHTML=`<path d="${d} Z" fill="#d7f26666" stroke="#859735" stroke-width="4"/><circle cx="${c.x*M}" cy="${c.y*M}" r="43" fill="none" stroke="#1b4d41" stroke-width="10"/>`;
  }
  draw(st,t){
    if(!this.renderer)return;
    const me=st.pos.RB,fw=this.forwardAt(t),angle=Math.atan2(fw.y,fw.x)+this.yawOffset;
    const dx=Math.cos(angle),dz=Math.sin(angle),pitch=-.07+this.pitchOffset;
    this.cam={x:me.x,y:me.y,fw:{x:dx,y:dz},rt:{x:-dz,y:dx}};
    this.camera.position.set(me.x,1.6,me.y);
    this.camera.lookAt(me.x+dx*Math.cos(pitch),1.6+Math.sin(pitch),me.y+dz*Math.cos(pitch));this.camera.updateMatrixWorld();
    const cue=this.cueAt(this.contexts().cur.cues,t),looks=new Set([].concat(cue?.look||[]));
    const actions=this.p.seq.actions;
    const previous=E.stateAt(this.p.seq.start,actions,Math.max(0,t-.06));
    const future=E.stateAt(this.p.seq.start,actions,Math.min(this.p.total,t+.06));
    for(const [id,model] of Object.entries(this.athletes)){
      const q=st.pos[id],a=previous.pos[id],b=future.pos[id],mx=b.x-a.x,mz=b.y-a.y;
      const moving=Math.hypot(mx,mz)>.005;
      let target=moving?{x:q.x+mx,y:q.y+mz}:model.def?(st.ballPos||st.pos[st.holder]||me):E.GOAL;
      let throwing=null,receiving=false;
      for(const action of actions){
        if(action.type==='pass'&&action.to===id&&t>=action.t-.25&&t<=action.t+action.dur+.15)receiving=true;
        if(((action.type==='pass'&&action.from===id)||(action.type==='shoot'&&action.who===id))&&t>=action.t-.25&&t<action.t+.35){
          throwing=clamp((t-action.t+.25)/.6,0,1);target=action.type==='pass'?st.pos[action.to]:E.GOAL;
        }
      }
      model.root.position.set(q.x,0,q.y);model.root.rotation.y=Math.atan2(target.x-q.x,target.y-q.y);
      poseAthlete(model,{moving,phase:t*10,holding:st.holder===id,throwing,receiving});
      model.ring.visible=this.learning&&(looks.has(id)||st.holder===id);
    }
    this.hands.visible=st.holder==='RB'&&!st.ballPos&&!st.shotDone;
    this.ball.visible=!this.hands.visible&&(!!st.ballPos||!!st.holder);
    if(this.ball.visible){
      const q=st.ballPos||st.pos[st.holder];let x=q.x,z=q.y,height=st.ballPos?st.ballZ:1.15;
      if(!st.ballPos&&this.athletes[st.holder]){const rot=this.athletes[st.holder].root.rotation.y;x+=Math.sin(rot)*.32;z+=Math.cos(rot)*.32;}
      this.ball.position.set(x,height,z);this.ball.rotation.set(t*2,t*3,0);
    }
    this.updateLabels(st,looks);this.drawMini(st);this.drawCallout(cue);
    $('shot').hidden=!st.shotDone;$('viewStatus').textContent=Math.abs(this.yawOffset)+Math.abs(this.pitchOffset)>.02?'RB目線 · 見回し中':'RB目線 · 自動視線';
    this.renderer.render(this.scene,this.camera);this.sound?.update(st,t,this.p);
  }
  updateLabels(st,looks){
    const edges={left:0,right:0},placed=[];
    const ordered=Object.entries(this.labels).sort(([a],[b])=>Number(looks.has(b))-Number(looks.has(a)));
    for(const[id,label]of ordered){
      const p=st.pos[id],v=new T.Vector3(p.x,1.92,p.y).project(this.camera);
      const rx=p.x-this.cam.x,rz=p.y-this.cam.y,depth=rx*this.cam.fw.x+rz*this.cam.fw.y;
      const attention=looks.has(id),outside=depth<.1||Math.abs(v.x)>.93||Math.abs(v.y)>.91;
      label.hidden=!this.learning||(!attention&&st.holder!==id&&(outside||Math.hypot(rx,rz)>6));
      label.classList.toggle('attention',attention);label.classList.toggle('edge',outside);
      if(label.hidden)continue;
      let x=(v.x+1)*this.W/2,y=(1-v.y)*this.H/2;
      if(outside){const right=rx*this.cam.rt.x+rz*this.cam.rt.y>=0;const side=right?'right':'left';x=right?this.W-32:32;y=this.H*.42+edges[side]++*28;label.textContent=right?`${this.label(id)} →`:`← ${this.label(id)}`;}
      else label.textContent=(attention?'見る · ':'')+this.label(id);
      const overlaps=()=>placed.some(p=>Math.abs(p.x-x)<64&&Math.abs(p.y-y)<23);
      if(overlaps()){if(!attention){label.hidden=true;continue;}while(overlaps())y-=25;}
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
  player.gotoStep(3,false);player.t=player.total;player.render();
  terminalSeen=player.seq;changing=false;renderPanel();showPanel('choicePanel');
}
function startBranch(branch){
  hidePanels();view.yawOffset=0;view.pitchOffset=0;terminalSeen=null;
  player.playBranch(branch);renderPanel();
}
function updateUI(){
  if(!player)return;
  const ended=player.t>=player.total;
  $('play').textContent=view?.stopped?'続き ▶':ended&&player.stepIndex===3?(player.branch?'↻ もう一度':'プレーを選ぶ'):player.playing||player.auto?'Ⅱ 一時停止':'▶ 再生';
  $('prev').disabled=player.stepIndex===0&&!player.branch;
  $('next').textContent=view?.stopped?'続き':player.stepIndex===3?'選ぶ':'次へ';
  $('sceneStep').textContent=`0${player.stepIndex+1} / 04`;
  $('modeName').textContent=view?.learning===false?'体験':'学習';
  $('seek').value=player.total?Math.round(player.t/player.total*1000):0;
  $('time').textContent=`${player.t.toFixed(1)} / ${player.total.toFixed(1)}秒`;
  document.querySelectorAll('#steps button').forEach((b,i)=>{b.classList.toggle('active',i===player.stepIndex);b.setAttribute('aria-current',i===player.stepIndex?'step':'false');});
  if(view&&!changing&&!view.stopped&&player.t>=player.total&&terminalSeen!==player.seq){
    terminalSeen=player.seq;
    if(player.branch){pausePlayback();$('resultText').textContent=player.branch.label;showPanel('resultPanel');}
    else if(player.stepIndex===3){pausePlayback();showPanel('choicePanel');}
  }
}
function renderPanel(){
  if(!player)return;
  $('stepTitle').textContent=player.branch?player.branch.label:STEP_NAMES[player.stepIndex]+' · '+player.step.title;
  // Rebuild only when the branch changes, never for every animation frame.
  const b=$('branches');b.replaceChildren();
  for(const [i,branch] of player.data.steps[3].branches.entries()){
    const button=document.createElement('button');button.textContent=['① アウト割り','② PVパス','③ サイド落とし'][i];
    button.classList.toggle('active',player.branch===branch);button.onclick=()=>startBranch(branch);b.append(button);
  }
  updateUI();
}
function changeStep(i,play=false){
  hidePanels();pausePlayback();changing=true;view?.clearStop();terminalSeen=null;
  player.gotoStep(i,false);changing=false;renderPanel();
  if(play){player.auto=true;player.play();updateUI();}
}
try{
  const data=structuredClone(window.TACTICS['05']);data.steps.forEach((s,i)=>{if(i!==3)s.branches=[];});
  player=new E.Player(data,$('court'));player.pause();view=new CourtView(player);
  window.player=player;window.pov=view;window.court3d=view;
  player.onChange=renderPanel;
  const internal=$('court').querySelector('g#court');if(internal)internal.id='court-lines-3d';
  for(let i=0;i<4;i++){const b=document.createElement('button');b.textContent=`${i+1} ${STEP_NAMES[i]}`;b.onclick=()=>changeStep(i);$('steps').append(b);}
  $('play').onclick=()=>{
    hidePanels();
    if(view.stopped)view.resume();
    else if(player.playing||player.auto)pausePlayback();
    else if(player.stepIndex===3&&!player.branch&&player.t>=player.total)showChoices();
    else{
      if(player.t>=player.total){changing=true;terminalSeen=null;player.restart(false);changing=false;}
      player.auto=!player.branch;player.play();
    }
    updateUI();
  };
  $('prev').onclick=()=>changeStep(player.branch?player.stepIndex:Math.max(0,player.stepIndex-1));
  $('next').onclick=()=>{hidePanels();if(view.stopped)view.resume();else if(player.stepIndex===3)showChoices();else changeStep(player.stepIndex+1);};
  $('choose').onclick=showChoices;
  const restart=()=>{view.yawOffset=0;view.pitchOffset=0;changeStep(0,true);};
  $('restart').onclick=restart;$('startOver').onclick=restart;
  $('tryOther').onclick=showChoices;
  $('again').onclick=()=>{if(player.branch)startBranch(player.branch);else changeStep(player.stepIndex,true);};
  $('closeChoice').onclick=()=>{hidePanels();$('choose').focus({preventScroll:true});};
  $('closeResult').onclick=()=>{hidePanels();$('choose').focus({preventScroll:true});};
  $('settingsBtn').onclick=()=>{pausePlayback();showPanel('settingsPanel');updateUI();};
  $('closeSettings').onclick=()=>{hidePanels();$('settingsBtn').focus({preventScroll:true});};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){hidePanels();$('settingsBtn').focus({preventScroll:true});}});
  $('speed').onclick=()=>{const speeds=[.5,1,1.5];player.speed=speeds[(speeds.indexOf(player.speed)+1)%3];$('speed').textContent='速さ '+player.speed+'×';};
  $('seek').addEventListener('input',()=>{hidePanels();pausePlayback();view.clearStop();player.t=player.total*Number($('seek').value)/1000;player.render();updateUI();});
  $('learn').onclick=()=>view.setLearning(true);$('experience').onclick=()=>view.setLearning(false);
  $('resetView').onclick=()=>{view.yawOffset=0;view.pitchOffset=0;view.redraw();};
  $('wide').onclick=()=>{view.wide=!view.wide;$('wide').setAttribute('aria-pressed',String(view.wide));$('wide').textContent=view.wide?'標準の視野':'広い視野';view.resize();view.redraw();};
  $('sound').onclick=async()=>{try{const enabled=await view.sound.toggle();$('sound').textContent=enabled?'音 ON':'音 OFF';$('sound').setAttribute('aria-pressed',String(enabled));}catch{$('sound').textContent='音を使えません';}};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pausePlayback();view.sound.previous=null;updateUI();}});
  renderPanel();
}catch(error){
  player?.pause();console.error(error);$('loading').hidden=false;
  $('loading').replaceChildren(document.createTextNode('この環境では3Dを表示できません。'));
  const link=document.createElement('a');link.href='pov.html?id=05&pos=RB';link.textContent='元のRB目線を開く';$('loading').append(link);
  for(const el of document.querySelectorAll('button,input'))el.disabled=true;
}
