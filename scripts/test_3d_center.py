"""Set 07: source timelines, neutral decisions, camera, all routes and mobile UI."""
import asyncio,json,pathlib,sys
from playwright.async_api import async_playwright
BASE=sys.argv[1].rstrip('/') if len(sys.argv)>1 else 'http://127.0.0.1:8765'
OUT=pathlib.Path('/tmp/handball-center-qa');OUT.mkdir(exist_ok=True)
async def finish(p):
 for _ in range(200):
  if await p.locator('#choicePanel').is_visible() or await p.locator('#resultPanel').is_visible():return
  if await p.evaluate('!!court3d.stopped'):await p.locator('#play').tap()
  await p.wait_for_timeout(100)
 raise AssertionError('playback did not finish')
async def main():
 async with async_playwright() as pw:
  for engine in ['chromium','webkit']:
   browser=await getattr(pw,engine).launch(**({'args':['--use-angle=swiftshader']} if engine=='chromium' else {}))
   p=await browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
   errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   for mirror in [False,True]:
    await p.goto(BASE+'/')
    await p.locator('a.trial3d').filter(has_text='セット 07').filter(has_text='左右反転' if mirror else '3Dテスト版').tap()
    await p.wait_for_function('!!window.court3d')
    assert 'センターサイド' in await p.title()
    assert await p.evaluate("player.data.id==='07'&&court3d.pos==='RB'&&court3d.overview")
    result=await p.evaluate('''async mirror=>{
     const E=TacticEngine,T=await import('./vendor/three-0.170.0.module.min.js'),source=TACTICS['07'],original=JSON.stringify(source);
     let base={pos:{},holder:source.ball,team:{}};
     for(const[id,p]of Object.entries(source.players)){base.pos[id]={x:p.x,y:p.y};base.team[id]=p.team;}
     const starts=[];for(const s of source.steps){starts.push(base);const end=E.stateAt(base,s.actions,E.duration(s.actions));base={pos:end.pos,holder:end.holder,team:base.team};}
     const map=id=>mirror?(E.MIRROR_ID[id]||id):id;
     let samples=0,maxPositionError=0,maxExtent=0,minVisible=99,maxDefHeight=0;
     const check=oracle=>{
      player.pause();court3d.clearStop();player.render();
      const st=E.stateAt(player.seq.start,player.seq.actions,player.t);
      for(const[id,q]of Object.entries(oracle.pos)){
       const actual=st.pos[map(id)],model=court3d.athletes[map(id)];
       maxPositionError=Math.max(maxPositionError,Math.abs(actual.x-(mirror?20-q.x:q.x)),Math.abs(actual.y-q.y),Math.abs(model.root.position.x-actual.x),Math.abs(model.root.position.z-actual.y));
      }
      if(st.holder!==map(oracle.holder)||st.shotDone!==oracle.shotDone)throw Error('state differs');
      const camera=court3d.camera,me=st.pos.RB;
      const lesson=player.branch?.screenLesson,focus=lesson?T.MathUtils.smoothstep(player.t,Math.max(lesson.start,player.branch.playFrom??0),lesson.arrive):0;
      const eye=new T.Vector3(me.x,3.6,me.y),back=new T.Vector3(me.x-10,0,me.y).normalize();eye.addScaledVector(back,mirror?3.6:5);
      if(focus&&!mirror)eye.lerp(new T.Vector3(me.x+1.8,3.8,me.y+6),focus);
      if(camera.position.distanceTo(eye)>1e-8)throw Error('lesson camera');
      const points=[];for(const x of [8.45,11.55])for(const y of [0,2.05])points.push(new T.Vector3(x,y,0));
      if(court3d.ball.visible)points.push(court3d.ball.position.clone());
      for(const q of points){const v=q.project(camera);maxExtent=Math.max(maxExtent,Math.abs(v.x),Math.abs(v.y));if(v.z>1||v.z< -1||Math.abs(v.x)>.86||Math.abs(v.y)>.86)throw Error(JSON.stringify({t:player.t,step:player.stepIndex,branch:player.branch?.label,v}));}
      if(court3d.hands.visible||court3d.hands.userData.ball.visible)throw Error('first-person hands obscure overview');
      if(st.holder==='RB'&&!st.shotDone){
       let visible=0;for(const[id,q]of Object.entries(st.pos)){if(id==='RB')continue;const a=new T.Vector3(q.x,0,q.y).project(camera),b=new T.Vector3(q.x,1.9,q.y).project(camera);if(Math.abs(b.x)<.98&&Math.abs(b.y)<.98&&b.z<1&&b.z> -1)visible++;if(player.data.players[id].team==='df')maxDefHeight=Math.max(maxDefHeight,Math.abs(b.y-a.y)/2);}
       if(focus===0)minVisible=Math.min(minVisible,visible);
      }
      if(lesson&&player.t>=lesson.start&&player.t<=lesson.end)for(const id of [lesson.blocker,lesson.defender,lesson.shooter]){
       const q=st.pos[id],v=new T.Vector3(q.x,1.9,q.y).project(camera);
       if(Math.abs(v.x)>.9||Math.abs(v.y)>.9||Math.abs(v.z)>1)throw Error('screen role outside view: '+id);
      }
      samples++;
     };
     for(let i=0;i<player.data.steps.length;i++){
      player.gotoStep(i,false);for(let t=0;t<=player.total+1e-8;t+=.1){player.t=Math.min(t,player.total);check(E.stateAt(starts[i],source.steps[i].actions,player.t));}
     }
     const i=mirror?2:1;
     for(let k=0;k<player.data.steps[i].branches.length;k++){
      player.gotoStep(i,false);player.t=player.total;player.render();const before=E.stateAt(player.seq.start,player.seq.actions,player.t),camera=court3d.camera.quaternion.clone(),ball=court3d.ball.position.clone();
      player.playBranch(player.step.branches[k]);player.pause();
      const after=E.stateAt(player.seq.start,player.seq.actions,player.t);
      for(const id in before.pos)if(Math.hypot(before.pos[id].x-after.pos[id].x,before.pos[id].y-after.pos[id].y)>1e-8)throw Error('rewind at branch '+k);
      if(before.holder!=='RB'||after.holder!=='RB'||camera.angleTo(court3d.camera.quaternion)>.03||ball.distanceTo(court3d.ball.position)>.15)throw Error(JSON.stringify({join:k,before:before.holder,after:after.holder,camera:camera.angleTo(court3d.camera.quaternion),ball:ball.distanceTo(court3d.ball.position)}));
      for(let t=player.t;t<=player.total+1e-8;t+=.1){
       player.t=Math.min(t,player.total);let oracle;
       if(!mirror&&k<4){const b=source.steps[1].branches[k+1],at=E.stateAt(starts[1],source.steps[1].actions,b.from);oracle=E.stateAt({...starts[1],pos:at.pos,holder:at.holder},b.actions,player.t);}
       else if(!mirror){let time=player.t,index=1;while(index<3&&time>=E.duration(source.steps[index].actions)){time-=E.duration(source.steps[index++].actions);}oracle=E.stateAt(starts[index],source.steps[index].actions,time);}
       else if(player.t<2.4)oracle=E.stateAt(starts[2],source.steps[2].actions,player.t);
       else {const a=k===0?source.steps[3].actions:source.steps[3].branches[k-1].actions;oracle=E.stateAt(starts[3],a,player.t-2.4);}
       check(oracle);
      }
     }
     if(JSON.stringify(source)!==original)throw Error('source mutated');
     return {samples,maxPositionError,maxExtent,minVisible,maxDefHeight};
    }''',mirror)
    assert result['maxPositionError']<1e-7 and result['minVisible']>=7 and result['maxDefHeight']<.45,result
    print(engine,mirror,result,flush=True)
    await p.reload();await p.wait_for_function('!!window.court3d');await p.evaluate('player.speed=1.5')
    await p.locator('#restartAlways').tap();await finish(p)
    assert await p.evaluate('!player.branch&&Math.abs(player.t-(player.data.id==="07"&&player.data.steps.length===3?.8:1.5))<1e-8')
    count=4 if mirror else 5
    for k in range(count):
     await p.locator('#branches button').nth(k).tap();await finish(p)
     assert await p.locator('#resultPanel').is_visible()
     assert await p.evaluate('TacticEngine.stateAt(player.seq.start,player.seq.actions,player.t).shotDone')
     # Seek/replay use the original source timeline's playFrom rather than zero.
     await p.locator('#closeResult').tap();await p.locator('#seek').fill('0')
     assert await p.evaluate('player.t===(player.branch.playFrom??0)')
     await p.locator('#play').tap();await finish(p)
     await p.locator('#tryOther').tap()
    for w,h in [(320,568),(375,667),(390,844),(844,390),(1440,900)]:
     await p.set_viewport_size({'width':w,'height':h});await p.locator('#choose').tap()
     assert await p.locator('#choicePanel').evaluate('''el=>{const r=el.getBoundingClientRect();return el.scrollHeight-el.clientHeight<=1&&[...el.querySelectorAll('button')].every(b=>{const q=b.getBoundingClientRect(),hit=document.elementFromPoint(q.x+q.width/2,q.y+q.height/2);return q.top>=r.top&&q.bottom<=r.bottom+1&&(hit===b||b.contains(hit))})}'''),(engine,mirror,w,h)
     assert await p.evaluate('scrollY===0&&document.documentElement.scrollWidth<=innerWidth')
     await p.screenshot(path=str(OUT/f'{engine}-{mirror}-{w}.png'))
    await p.locator('#closeChoice').tap();await p.set_viewport_size({'width':320,'height':568})
    await p.locator('#settingsBtn').tap();await p.locator('#overview').tap()
    assert await p.evaluate('!court3d.overview&&court3d.camera.position.y===1.6&&!court3d.athletes.RB.root.visible')
    await p.locator('#overview').tap();await p.locator('#experience').tap();await p.locator('#closeSettings').tap()
    await p.locator('#restartAlways').tap();await finish(p)
    assert not await p.evaluate('!!court3d.stopped')
    # Actual branch button plus time sample: no artificial overlay in screenshots.
    await p.locator('#branches button.basic-route').tap();await p.evaluate('player.pause();court3d.clearStop();player.t=player.branch.screenLesson.arrive;player.render()')
    await p.set_viewport_size({'width':390,'height':844});await p.screenshot(path=str(OUT/f'{engine}-{mirror}-action.png'))
    await p.locator('#restartAlways').tap();assert await p.evaluate('player.stepIndex===0&&player.playing&&!player.branch')
    await p.emulate_media(reduced_motion='reduce');await p.reload();await p.wait_for_function('!!window.court3d')
    await p.locator('#choose').tap();await p.locator('#branches button').last.tap();assert await p.locator('#resultPanel').is_visible()
    await p.emulate_media(reduced_motion='no-preference')
    print(engine,mirror,'CENTER PASS: source, early decision, all routes, replay/seek, layouts, modes, reduced motion',flush=True)
   assert not errors,errors
   await browser.close()
asyncio.run(main())
