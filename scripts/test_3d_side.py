"""Set 06, both RB views: source geometry, framing, fake, playback and mobile UI."""
import asyncio,json,pathlib,sys
from playwright.async_api import async_playwright
BASE=sys.argv[1].rstrip('/') if len(sys.argv)>1 else 'http://127.0.0.1:8765'
OUT=pathlib.Path('/tmp/handball-side-qa');OUT.mkdir(exist_ok=True)
async def finish(page):
 for _ in range(250):
  if await page.locator('#choicePanel').is_visible() or await page.locator('#resultPanel').is_visible():return
  if await page.evaluate('!!court3d.stopped'):await page.locator('#play').click()
  await page.wait_for_timeout(100)
 raise AssertionError('Playback did not finish')
async def main():
 async with async_playwright() as pw:
  for engine in ['chromium','webkit']:
   browser=await getattr(pw,engine).launch(**({'args':['--use-angle=swiftshader']} if engine=='chromium' else {}))
   page=await browser.new_page(viewport={'width':375,'height':812},is_mobile=True,has_touch=True)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   for mirror in [False,True]:
    count=4 if mirror else 3;steps=3 if mirror else 4
    await page.goto(BASE+'/')
    link=page.locator('a.trial3d').filter(has_text='セット 06').filter(has_text='左右反転') if mirror else page.locator('a.trial3d').filter(has_text='セット 06').filter(has_text='3Dテスト版')
    await link.tap();await page.wait_for_function('!!window.court3d')
    assert await page.evaluate("court3d.pos==='RB'&&!court3d.athletes.RB&&player.data.id==='06'")
    assert await page.locator('#branches button').count()==count
    assert await page.evaluate('player.data.steps.length')==steps
    assert 'サイドユーゴ' in await page.title()
    result=await page.evaluate('''async mirror=>{
     const E=TacticEngine,T=await import('./vendor/three-0.170.0.module.min.js');
     const map=id=>mirror?(E.MIRROR_ID[id]||id):id;
     const source=TACTICS['06'],sourceJSON=JSON.stringify(source);let base={pos:{},team:{},holder:source.ball};
     for(const[id,p]of Object.entries(source.players)){base.pos[id]={x:p.x,y:p.y};base.team[id]=p.team;}
     const starts=[];for(const step of source.steps){starts.push(base);const s=E.stateAt(base,step.actions,E.duration(step.actions));base={pos:s.pos,holder:s.holder,team:base.team};}
     let samples=0,maxError=0,maxExtent=0,maxHFov=0;
     function check(start,actions,t){
      player.pause();court3d.clearStop();player.t=t;player.render();
      const a=E.stateAt(start,actions,t),b=E.stateAt(player.seq.start,player.seq.actions,t);
      for(const[id,p]of Object.entries(a.pos)){
       const q=b.pos[map(id)];maxError=Math.max(maxError,Math.abs(q.x-(mirror?20-p.x:p.x)),Math.abs(q.y-p.y));
       const m=court3d.athletes[map(id)];if(m)maxError=Math.max(maxError,Math.abs(m.root.position.x-q.x),Math.abs(m.root.position.z-q.y));
      }
      if(court3d.camera.position.distanceTo(new T.Vector3(b.pos.RB.x,1.6,b.pos.RB.y))>1e-8)throw Error('camera is not RB');
      const points=[];for(const x of [8.5,11.5])for(const y of [0,2])points.push(new T.Vector3(x,y,0));
      if(court3d.ball.visible)points.push(court3d.ball.position.clone());
      for(const q of points){const v=q.project(court3d.camera);maxExtent=Math.max(maxExtent,Math.abs(v.x),Math.abs(v.y));if(v.z>1||v.z< -1||Math.abs(v.x)>.86||Math.abs(v.y)>.86)throw Error(JSON.stringify({step:player.stepIndex,t,branch:player.branch?.label,v}));}
      maxHFov=Math.max(maxHFov,court3d.hfov*180/Math.PI);
      if(court3d.hands.userData.ball.visible&&court3d.ball.visible)throw Error('double ball');
      samples++;
     }
     for(let i=0;i<player.data.steps.length;i++){
      player.gotoStep(i,false);for(let t=0;t<player.total;t+=.2)check(starts[i],source.steps[i].actions,t);
      for(let k=0;k<(player.step.branches||[]).length;k++){
       const src=source.steps[i].branches[k],at=E.stateAt(starts[i],source.steps[i].actions,src.from);
       player.playBranch(player.step.branches[k]);player.pause();
       for(let t=0;t<player.total;t+=.2)check({pos:at.pos,holder:at.holder,team:starts[i].team},src.actions,t);
      }
     }
     if(mirror){
      player.gotoStep(2,false);player.t=player.total;player.render();
      if(E.stateAt(player.seq.start,player.seq.actions,player.t).holder!=='RB')throw Error('choice after passing');
      player.playBranch(player.step.branches[3]);player.pause();player.t=1.15;player.render();
      if(!court3d.hands.userData.ball.visible||court3d.ball.visible)throw Error('fake released ball');
     }
     if(sourceJSON!==JSON.stringify(source))throw Error('source mutated');
     return {samples,maxError,maxExtent,maxHFov};
    }''',mirror)
    assert result['maxError']<1e-7,result
    print(engine,mirror,result,flush=True)
    await page.reload();await page.wait_for_function('!!window.court3d')
    await page.locator('#restartAlways').tap();await finish(page)
    assert await page.locator('#choicePanel').is_visible()
    for i in range(count):
     await page.locator('#branches button').nth(i).tap();await finish(page)
     assert await page.locator('#resultPanel').is_visible()
     assert await page.evaluate('TacticEngine.stateAt(player.seq.start,player.seq.actions,player.t).shotDone')
     await page.locator('#tryOther').tap()
    await page.locator('#restartAlways').tap()
    assert await page.evaluate('player.stepIndex===0&&player.playing&&!player.branch')
    await page.locator('#play').tap()
    await page.locator('#settingsBtn').tap();await page.locator('#experience').tap();await page.locator('#closeSettings').tap()
    await page.locator('#restartAlways').tap();await finish(page)
    assert not await page.evaluate('!!court3d.stopped')
    await page.locator('#closeChoice').tap()
    await page.locator('#settingsBtn').tap();await page.locator('#learn').tap();await page.locator('#closeSettings').tap()
    for w,h in [(320,568),(375,667),(390,844),(844,390),(1440,900)]:
     await page.set_viewport_size({'width':w,'height':h});await page.locator('#choose').tap()
     assert await page.locator('#choicePanel').evaluate('''el=>{const r=el.getBoundingClientRect();return el.scrollHeight-el.clientHeight<=1&&[...el.querySelectorAll('button')].every(b=>{const q=b.getBoundingClientRect(),hit=document.elementFromPoint(q.x+q.width/2,q.y+q.height/2);return q.top>=r.top&&q.bottom<=r.bottom+1&&(hit===b||b.contains(hit))})}'''),(engine,mirror,w,h)
     assert await page.evaluate('scrollY===0&&document.documentElement.scrollWidth<=innerWidth')
     await page.screenshot(path=str(OUT/f'{engine}-{mirror}-{w}x{h}.png'))
    await page.locator('#closeChoice').tap();await page.set_viewport_size({'width':375,'height':812})
    for i,t,label in ([(0,.4,'start'),(1,2.4,'catch'),(2,1.2,'decision')] if mirror else [(0,.5,'start'),(2,2.5,'catch')]):
     await page.evaluate('([i,t])=>{player.gotoStep(i,false);player.t=t;player.render()}',[i,t]);await page.screenshot(path=str(OUT/f'{engine}-{mirror}-{label}.png'))
    if mirror:
     await page.evaluate('player.gotoStep(2,false);player.playBranch(player.step.branches[3]);player.pause();player.t=1.15;player.render()')
     await page.screenshot(path=str(OUT/f'{engine}-fake.png'))
    await page.emulate_media(reduced_motion='reduce');await page.reload();await page.wait_for_function('!!window.court3d')
    await page.locator('#choose').tap();await page.locator('#branches button').last.tap()
    assert await page.locator('#resultPanel').is_visible()
    await page.emulate_media(reduced_motion='no-preference')
    print(engine,mirror,'SIDE YUGO PASS: RB, source geometry, framing, all branches, touch, 5 layouts, reduced motion',flush=True)
   assert not errors,errors
   await browser.close()
asyncio.run(main())
