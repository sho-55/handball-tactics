"""Screen teaching: actual role proximity, planted stance, phase stops and guides."""
import asyncio,pathlib,sys
from playwright.async_api import async_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765'
OUT=pathlib.Path('/tmp/handball-block-qa');OUT.mkdir(exist_ok=True)
async def wait_stop(p):
 await p.wait_for_function('!!court3d.stopped||!document.querySelector("#resultPanel").hidden',timeout=15000)
async def main():
 async with async_playwright() as pw:
  for engine in ['chromium','webkit']:
   b=await getattr(pw,engine).launch(**({'args':['--use-angle=swiftshader']} if engine=='chromium' else {}))
   p=await b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
   errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   for mirror in [False,True]:
    await p.goto(BASE+'/pov-3d.html?id=07'+('&mirror=1' if mirror else ''));await p.wait_for_function('!!window.court3d');await p.evaluate('player.speed=1.5')
    await p.locator('#basicPlay').tap()
    stops=[]
    for _ in range(5):
     await wait_stop(p)
     if await p.locator('#resultPanel').is_visible():break
     stops.append(await p.evaluate('player.t'));await p.screenshot(path=str(OUT/f'{engine}-{mirror}-stop{len(stops)}.png'))
     await p.locator('#play').tap()
    assert len(stops)==(1 if mirror else 3),(engine,mirror,stops)
    assert all(abs(a-b)<1e-8 for a,b in zip(stops,[2.2] if mirror else [2.3,4.5,5])),stops
    assert await p.locator('#resultPanel').is_visible()
    await p.locator('#closeResult').tap()
    result=await p.evaluate('''async()=>{
     const T=await import('./vendor/three-0.170.0.module.min.js'),l=player.branch.screenLesson;
     const samples=[];
     for(const t of [l.arrive+.02,l.arrive+.21,l.shot-.05]){
      player.t=t;player.render();const st=TacticEngine.stateAt(player.seq.start,player.seq.actions,t),rb=st.pos[l.blocker],df=st.pos[l.defender],m=court3d.athletes[l.blocker];
      let ground=99;for(const side of [-1,1])for(const z of [-.5,.5]){m.root.updateMatrixWorld(true);const v=new T.Vector3(0,-.5,z).applyMatrix4(m.limbs[side].sole.matrixWorld);ground=Math.min(ground,v.y);}
      samples.push({pos:rb,rotation:m.root.rotation.y,blocking:m.blocking,distance:Math.hypot(rb.x-df.x,rb.y-df.y),ground,arms:Math.abs(m.limbs[1].arm.rotation.z)});
     }
     return {samples,guide:court3d.screenGuide.root.visible};
    }''')
    a,c=result['samples'][0],result['samples'][-1];assert a['pos']==c['pos'] and abs(a['rotation']-c['rotation'])<1e-8,result
    assert result['guide'] and all(.7<s['distance']<1.1 and s['blocking']==1 and s['arms']<.1 and abs(s['ground']-.008)<.002 for s in result['samples']),result
    for w,h in [(320,568),(390,844),(844,390),(1440,900)]:
     await p.set_viewport_size({'width':w,'height':h});await p.wait_for_function('court3d.W===court3d.canvas.clientWidth&&court3d.H===court3d.canvas.clientHeight');await p.evaluate('player.t=player.branch.screenLesson.arrive+.02;player.render()')
     assert await p.evaluate('''()=>{
      const l=player.branch.screenLesson,v=court3d,cr=v.canvas.getBoundingClientRect();
      return [l.blocker,l.defender,l.shooter].every(id=>{const e=v.labels[id],r=e.getBoundingClientRect();return !e.hidden&&r.left>=cr.left&&r.right<=cr.right+1&&r.top>=cr.top&&r.bottom<=cr.bottom});
     }'''),(engine,mirror,w,h)
     await p.screenshot(path=str(OUT/f'{engine}-{mirror}-{w}.png'))
    await p.locator('#settingsBtn').tap();await p.locator('#experience').tap();await p.locator('#closeSettings').tap();await p.locator('#basicPlay').tap()
    await p.wait_for_selector('#resultPanel:visible',timeout=15000)
    assert not await p.evaluate('!!court3d.stopped||court3d.screenGuide.root.visible')
    print(engine,mirror,'BLOCK PASS: phase stops, <1.1m screen, planted feet/body, tucked arms, readable roles, experience playback',flush=True)
   assert not errors,errors
   await b.close()
asyncio.run(main())
