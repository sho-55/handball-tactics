"""Regression: receive -> neutral choice -> continuous branch, and useful overview."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765'
OUT=pathlib.Path('/tmp/handball-side-flow');OUT.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as pw:
  for name in ['chromium','webkit']:
   browser=await getattr(pw,name).launch(**({'args':['--use-angle=swiftshader']} if name=='chromium' else {}))
   page=await browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   for mirror in [False,True]:
    await page.goto(BASE+'/pov-3d.html?id=06'+('&mirror=1' if mirror else ''))
    await page.wait_for_function('!!window.court3d')
    await page.locator('#choose').tap()
    if mirror:
     # Timeline arrives at the neutral decision 0.4s after receiving the pass.
     result=await page.evaluate('''()=>{
      const E=TacticEngine,s=player.data.steps[1],pass=s.actions.find(a=>a.type==='pass'&&a.to==='RB');
      return {delay:E.duration(s.actions)-pass.t-pass.dur,froms:player.step.branches.map(b=>b.from),total:player.total,t:player.t};
     }''')
     assert 0<=result['delay']<=.5 and result['total']==0 and result['froms']==[0]*4,result
     for index in range(4):
      await page.evaluate('window.joinCamera=court3d.camera.quaternion.clone();window.joinBall=court3d.ball.position.clone()')
      before=await page.evaluate('JSON.stringify(TacticEngine.stateAt(player.seq.start,player.seq.actions,player.t).pos)')
      await page.locator('#branches button').nth(index).tap()
      result=await page.evaluate('''before=>{
       player.pause();court3d.clearStop();player.t=0;player.render();
       const state=TacticEngine.stateAt(player.seq.start,player.seq.actions,0);
       const delta=Math.max(...Object.entries(JSON.parse(before)).flatMap(([id,p])=>[Math.abs(p.x-state.pos[id].x),Math.abs(p.y-state.pos[id].y)]));
       if(joinCamera.angleTo(court3d.camera.quaternion)>.03)throw Error('camera jumps at choice');
       if(joinBall.distanceTo(court3d.ball.position)>.15)throw Error('ball jumps at choice');
       return {delta,holder:state.holder};
      }''',before)
      assert result=={'delta':0,'holder':'RB'},(index,result)
      await page.locator('#choose').tap()
     # Actual playback from reception triggers the menu before any L3 advance.
     await page.locator('#closeChoice').tap()
     await page.evaluate('player.gotoStep(1,false);court3d.setLearning(false);player.t=2.6;player.render()')
     await page.locator('#play').tap()
     await page.wait_for_selector('#choicePanel:visible',timeout=2000)
     assert await page.evaluate('player.stepIndex===2&&player.t===0&&!player.playing&&!player.auto')
    await page.locator('#closeChoice').tap()
    for w,h in [(390,844),(844,390),(1440,900)]:
     await page.set_viewport_size({'width':w,'height':h})
     result=await page.evaluate('''async mirror=>{
      const T=await import('./vendor/three-0.170.0.module.min.js');
      player.gotoStep(mirror?2:3,false);player.playBranch(player.step.branches[1]);player.pause();court3d.clearStop();player.t=mirror?1.2:.4;player.render();
      const st=TacticEngine.stateAt(player.seq.start,player.seq.actions,player.t);
      let visible=0,maxHeight=0;
      for(const [id,q]of Object.entries(st.pos)){
       if(id==='RB')continue;
       const a=new T.Vector3(q.x,0,q.y).project(court3d.camera),b=new T.Vector3(q.x,1.9,q.y).project(court3d.camera);
       if(Math.abs(b.x)<.95&&Math.abs(b.y)<.95&&b.z<1&&b.z> -1)visible++;
       if(player.data.players[id].team==='df')maxHeight=Math.max(maxHeight,Math.abs(b.y-a.y)/2);
      }
      return {visible,maxHeight,hands:court3d.hands.visible};
     }''',mirror)
     assert result['visible']>=7 and result['maxHeight']<.45 and not result['hands'],(name,mirror,w,result)
     if await page.locator('#choicePanel').is_visible():await page.locator('#closeChoice').tap()
     await page.screenshot(path=str(OUT/f'{name}-{mirror}-{w}.png'))
    await page.set_viewport_size({'width':320,'height':568})
    await page.locator('#settingsBtn').tap();await page.locator('#overview').tap()
    assert await page.evaluate('!court3d.overview&&!court3d.athletes.RB.root.visible&&court3d.camera.position.y===1.6')
    await page.locator('#overview').tap();await page.locator('#closeSettings').tap()
    await page.locator('#restartAlways').tap()
    assert await page.evaluate('court3d.overview&&player.stepIndex===0&&player.playing')
    print(name,mirror,'PASS: neutral receive/4 branch joins, broad view at 3 sizes, perspective toggle, restart',flush=True)
   assert not errors,errors
   await browser.close()
asyncio.run(main())
