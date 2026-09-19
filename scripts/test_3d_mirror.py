"""Mirrored Yugo: data symmetry, moving RB camera, five branches and real controls."""
import asyncio, json, pathlib, sys
from playwright.async_api import async_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765'
OUT=pathlib.Path('/tmp/handball-mirror-qa');OUT.mkdir(exist_ok=True)
async def click(page, selector):
    item=page.locator(selector)
    await item.scroll_into_view_if_needed()
    assert await item.evaluate('''el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top>=0&&r.bottom<=innerHeight+1&&(hit===el||el.contains(hit))}'''),selector
    await item.click()
    assert await page.evaluate('scrollY===0&&document.documentElement.scrollWidth<=innerWidth')
async def finish(page):
    stops=0
    for _ in range(220):
        if await page.locator('#choicePanel').is_visible() or await page.locator('#resultPanel').is_visible():return stops
        if await page.evaluate('!!court3d.stopped'):
            stops+=1
            await click(page,'#play')
        await page.wait_for_timeout(100)
    raise AssertionError('Playback never completed')
async def main():
 async with async_playwright() as pw:
  for engine in ['chromium','webkit']:
   browser=await getattr(pw,engine).launch(**({'args':['--use-angle=swiftshader']} if engine=='chromium' else {}))
   page=await browser.new_page(viewport={'width':375,'height':812})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto(BASE+'/')
   await page.get_by_role('link',name='セット 05 3D・左右反転',exact=False).click()
   await page.wait_for_function('!!window.court3d')
   assert 'mirror=1' in page.url
   assert await page.evaluate("court3d.pos==='RB'&&!court3d.athletes.RB&&player.data.steps.length===2")
   assert await page.locator('#branches button').count()==5
   assert await page.locator('#loading').is_hidden()
   # Independent oracle: original coordinates reflected across x=10 and IDs swapped.
   result=await page.evaluate('''async()=>{
    const E=TacticEngine,T=await import('./vendor/three-0.170.0.module.min.js');
    const ids={LW:'RW',RW:'LW',LB:'RB',RB:'LB',L1:'R1',R1:'L1',L2:'R2',R2:'L2',L3:'R3',R3:'L3',CB:'CB',PV:'PV'};
    const source=TACTICS['05'];let base={pos:{},team:{},holder:source.ball};
    for(const[id,p]of Object.entries(source.players)){base.pos[id]={x:p.x,y:p.y};base.team[id]=p.team;}
    const starts=[];for(const step of source.steps){starts.push(base);const end=E.stateAt(base,step.actions,E.duration(step.actions));base={pos:end.pos,team:base.team,holder:end.holder};}
    let maxPositionError=0,maxBallError=0,maxGroundError=0,maxCameraError=0,samples=0;
    const near=(a,b)=>Math.abs(a-b);
    function check(start,actions,t){
     court3d.clearStop();player.pause();player.t=t;player.render();
     const a=E.stateAt(start,actions,t),b=E.stateAt(player.seq.start,player.seq.actions,t);
     for(const[id,q]of Object.entries(a.pos)){
      const actual=b.pos[ids[id]],model=court3d.athletes[ids[id]];
      maxPositionError=Math.max(maxPositionError,near(actual.x,20-q.x),near(actual.y,q.y));
      if(model){
       maxPositionError=Math.max(maxPositionError,near(model.root.position.x,actual.x),near(model.root.position.z,actual.y));
       const ys=[];for(const side of [-1,1])for(const z of [-.5,.5])ys.push(new T.Vector3(0,-.5,z).applyMatrix4(model.limbs[side].sole.matrixWorld).y);
       maxGroundError=Math.max(maxGroundError,near(Math.min(...ys),.008));
      }
     }
     if(b.holder!==(a.holder?ids[a.holder]:null))throw Error('holder mismatch');
     if(a.ballPos){maxBallError=Math.max(maxBallError,near(b.ballPos.x,20-a.ballPos.x),near(b.ballPos.y,a.ballPos.y),near(b.ballZ,a.ballZ));}
     maxCameraError=Math.max(maxCameraError,near(court3d.camera.position.x,20-a.pos.LB.x),near(court3d.camera.position.z,a.pos.LB.y),near(court3d.camera.position.y,1.6));
     const own=b.holder==='RB'&&!b.ballPos&&!b.shotDone;
     if(court3d.hands.userData.ball.visible!==own||own&&court3d.ball.visible)throw Error('own ball duplicated');
     if(near(+court3d.fov.querySelector('circle').getAttribute('cx'),b.pos.RB.x*E.M)>1e-7)throw Error('minimap camera mismatch');
     const node=player.nodes.RB.g.transform.baseVal.getItem(0).matrix;if(near(node.e,b.pos.RB.x*E.M)>.051||near(node.f,b.pos.RB.y*E.M)>.051)throw Error('minimap RB mismatch');
     const pose=()=>JSON.stringify(Object.values(court3d.athletes).map(m=>[m.body.position.y,m.body.rotation.toArray(),m.upper.rotation.toArray(),m.limbs[1].leg.rotation.toArray()]));
     const first=pose();player.t=0;player.render();player.t=t;player.render();if(first!==pose())throw Error('non deterministic pose');
     samples++;
    }
    for(let i=0;i<2;i++){
     player.gotoStep(i,false);
     for(const t of [0,.15,.6,.85,1.2,player.total])check(starts[i],source.steps[i].actions,Math.min(t,player.total));
    }
    for(let i=0;i<5;i++){
     const branch=source.steps[1].branches[i],at=E.stateAt(starts[1],source.steps[1].actions,branch.from);
     player.playBranch(player.data.steps[1].branches[i]);player.pause();
     for(let t=0;t<player.total;t+=.17)check({pos:at.pos,holder:at.holder,team:starts[1].team},branch.actions,t);
     check({pos:at.pos,holder:at.holder,team:starts[1].team},branch.actions,player.total);
    }
    return {samples,maxPositionError,maxBallError,maxGroundError,maxCameraError};
   }''')
   assert max(result[k] for k in ['maxPositionError','maxBallError','maxCameraError'])<1e-7,result
   assert result['maxGroundError']<.001,result
   print(engine, json.dumps(result),flush=True)
   for t,name in [(.55,'windup'),(.95,'release')]:
    await page.evaluate('t=>{player.gotoStep(1,false);player.playBranch(player.data.steps[1].branches[1]);player.pause();player.t=t;player.render();document.getElementById("closeResult").click()}',t)
    await page.screenshot(path=str(OUT/f'{engine}-{name}.png'))
   await page.reload();await page.wait_for_function('!!window.court3d')
   # Inspect running, catch and release poses at reproducible times.
   for step,t,name in [(0,0,'initial'),(0,1.8,'running'),(1,.85,'catch')]:
    await page.evaluate('([i,t])=>{player.gotoStep(i,false);player.t=t;player.render()}',[step,t])
    await page.screenshot(path=str(OUT/f'{engine}-{name}.png'))
   await click(page,'#restartAlways')
   assert await finish(page)>=1
   assert await page.locator('#choicePanel').is_visible()
   await page.screenshot(path=str(OUT/f'{engine}-choices.png'))
   for i in range(5):
    await click(page,f'#branches button:nth-child({i+1})')
    await finish(page)
    assert await page.locator('#resultPanel').is_visible()
    assert await page.evaluate('TacticEngine.stateAt(player.seq.start,player.seq.actions,player.t).shotDone')
    await page.screenshot(path=str(OUT/f'{engine}-result-{i}.png'))
    await click(page,'#tryOther')
   # Restart from the choices, a live branch, and a result.
   for state in ['choices','branch','result']:
    if state!='choices':
     await click(page,'#choose');await click(page,'#branches button:nth-child(2)')
     if state=='result':await finish(page)
    await page.evaluate('court3d.yawOffset=.3')
    await click(page,'#restartAlways')
    assert await page.evaluate('player.stepIndex===0&&!player.branch&&player.playing&&court3d.yawOffset===0')
    await click(page,'#play')
   await click(page,'#settingsBtn');await click(page,'#experience');await click(page,'#closeSettings')
   await click(page,'#restartAlways');assert await finish(page)==0
   await click(page,'#branches button:nth-child(5)');assert await finish(page)==0
   await click(page,'#closeResult')
   await click(page,'#settingsBtn');await click(page,'#learn');await click(page,'#closeSettings')
   for w,h in [(320,568),(375,667),(390,844),(844,390),(1440,900)]:
    await page.set_viewport_size({'width':w,'height':h})
    await click(page,'#choose')
    assert await page.locator('#choicePanel').evaluate('''el=>{const r=el.getBoundingClientRect();return el.scrollHeight-el.clientHeight<=1&&[...el.querySelectorAll('button')].every(b=>{const q=b.getBoundingClientRect(),hit=document.elementFromPoint(q.x+q.width/2,q.y+q.height/2);return q.top>=r.top&&q.bottom<=r.bottom+1&&(hit===b||b.contains(hit))})}'''),(engine,w,h,'choices need scrolling')
    for i in range(1,6):
     await click(page,f'#branches button:nth-child({i})')
     await click(page,'#choose')
    await page.locator('#choicePanel').evaluate('el=>el.scrollTop=0')
    await page.screenshot(path=str(OUT/f'{engine}-{w}x{h}.png'))
    await click(page,'#closeChoice')
    for sel in ['#restartAlways','#play','#settingsBtn']:
     assert await page.locator(sel).is_visible()
   await page.emulate_media(reduced_motion='reduce');await page.reload();await page.wait_for_function('!!window.court3d')
   await click(page,'#choose');await click(page,'#branches button:nth-child(5)')
   assert await page.locator('#resultPanel').is_visible()
   assert not errors,errors
   print(engine.upper()+' MIRROR PASS: RB camera, 5 branches, restarts, modes, layouts, no JS errors',flush=True)
   await browser.close()
asyncio.run(main())
