"""Set 08: RB roles, continuous branch joins, routes, replay and mobile layouts."""
import asyncio,json,pathlib,sys
from playwright.async_api import async_playwright
BASE=sys.argv[1].rstrip('/') if len(sys.argv)>1 else 'http://127.0.0.1:8765'
OUT=pathlib.Path('/tmp/handball08/3d');OUT.mkdir(parents=True,exist_ok=True)
async def finish(p):
 for _ in range(500):
  if await p.locator('#choicePanel').is_visible() or await p.locator('#resultPanel').is_visible():return
  await p.wait_for_timeout(100)
 raise AssertionError('playback did not finish')
async def main():
 async with async_playwright() as pw:
  for engine in ['chromium','webkit']:
   b=await getattr(pw,engine).launch(**({'args':['--use-angle=swiftshader']} if engine=='chromium' else {}))
   p=await b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
   errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   for mirror in [False,True]:
    await p.goto(BASE+'/')
    await p.locator('a.trial3d').filter(has_text='セット 08').filter(has_text='左右反転' if mirror else '3Dテスト版').tap()
    await p.wait_for_function('!!window.court3d')
    assert 'CCダッポ' in await p.title()
    assert await p.evaluate("player.data.id==='08'&&court3d.pos==='RB'&&court3d.overview")
    await p.locator('#choose').tap()
    count=3 if mirror else 4
    assert await p.locator('#branches button').count()==count
    for k in range(count):
     before=await p.evaluate('''()=>{const s=TacticEngine.stateAt(player.seq.start,player.seq.actions,player.t);return {pos:s.pos,holder:s.holder}}''')
     await p.locator('#branches button').nth(k).tap()
     after=await p.evaluate('''()=>{player.pause();player.t=player.branch.playFrom??0;player.render();const s=TacticEngine.stateAt(player.seq.start,player.seq.actions,player.t);return {pos:s.pos,holder:s.holder}}''')
     assert before['holder']==after['holder']=='RB',(mirror,k,before,after)
     for id,q in before['pos'].items():assert abs(q['x']-after['pos'][id]['x'])+abs(q['y']-after['pos'][id]['y'])<1e-7,(mirror,k,id,q,after['pos'][id])
     result=await p.evaluate('''async()=>{
      const T=await import('./vendor/three-0.170.0.module.min.js');let extent=0,err=0;
      for(let t=player.t;t<=player.total;t+=.07){player.t=t;player.render();const s=TacticEngine.stateAt(player.seq.start,player.seq.actions,t);
       for(const[id,q]of Object.entries(s.pos)){const a=court3d.athletes[id].root.position;err=Math.max(err,Math.hypot(a.x-q.x,a.z-q.y));}
       for(const x of [8.45,11.55])for(const y of [0,2.05]){const v=new T.Vector3(x,y,0).project(court3d.camera);extent=Math.max(extent,Math.abs(v.x),Math.abs(v.y));}
       if(court3d.ball.visible){const v=court3d.ball.position.clone().project(court3d.camera);extent=Math.max(extent,Math.abs(v.x),Math.abs(v.y));}
      }player.t=player.total;player.render();return {extent,err,shot:TacticEngine.stateAt(player.seq.start,player.seq.actions,player.t).shotDone};}''')
     assert result['err']<1e-8 and result['shot'] and result['extent']<1,result
     await p.locator('#closeResult').tap();await p.locator('#seek').fill('0');assert await p.evaluate('player.t===(player.branch.playFrom??0)')
     await p.evaluate('player.speed=1.5');await p.locator('#play').tap();await finish(p)
     assert await p.locator('#resultPanel').is_visible()
     await p.screenshot(path=str(OUT/f'{engine}-{mirror}-route{k}.png'))
     await p.locator('#tryOther').tap()
    for w,h in [(320,568),(375,667),(390,844),(844,390),(1440,900)]:
     await p.set_viewport_size({'width':w,'height':h})
     assert await p.evaluate('scrollY===0&&document.documentElement.scrollWidth<=innerWidth')
     assert await p.locator('#branches').evaluate('''el=>[...el.querySelectorAll('button')].every(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top>=0&&r.bottom<=innerHeight&&(hit===b||b.contains(hit))})'''),(engine,mirror,w,h)
     await p.screenshot(path=str(OUT/f'{engine}-{mirror}-{w}.png'))
    await p.locator('#closeChoice').tap();await p.set_viewport_size({'width':390,'height':844})
    await p.locator('#settingsBtn').tap();await p.locator('#overview').tap();assert await p.evaluate('!court3d.overview')
    await p.locator('#closeSettings').tap();await p.screenshot(path=str(OUT/f'{engine}-{mirror}-firstperson.png'))
    await p.locator('#settingsBtn').tap();await p.locator('#overview').tap();await p.locator('#closeSettings').tap()
    await p.screenshot(path=str(OUT/f'{engine}-{mirror}-overview.png'))
    await p.locator('#restartAlways').tap();assert await p.evaluate('player.stepIndex===0&&player.playing&&!player.branch');await finish(p)
    assert await p.locator('#choicePanel').is_visible()
    await p.emulate_media(reduced_motion='reduce');await p.reload();await p.wait_for_function('!!window.court3d');await p.locator('#choose').tap();await p.locator('#branches button').last.tap();assert await p.locator('#resultPanel').is_visible()
    await p.emulate_media(reduced_motion='no-preference')
    print(engine,mirror,'PASS: role, all joins/routes, playback, seek, restart, layouts, camera toggle, reduced-motion',flush=True)
   assert not errors,errors
   await b.close()
asyncio.run(main())
