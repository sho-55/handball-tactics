"""Both 3D variants: goal and ball remain in the automatic camera's frustum."""
import asyncio,json,pathlib,sys
from playwright.async_api import async_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765'
OUT=pathlib.Path('/tmp/handball-framing-qa');OUT.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  for engine in ['chromium','webkit']:
   b=await getattr(p,engine).launch(**({'args':['--use-angle=swiftshader']} if engine=='chromium' else {}))
   page=await b.new_page(viewport={'width':375,'height':812});errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   for mirror in [False,True]:
    await page.goto(BASE+'/pov-3d.html'+('?mirror=1' if mirror else ''));await page.wait_for_function('!!window.court3d')
    result=await page.evaluate('''async()=>{
     const T=await import('./vendor/three-0.170.0.module.min.js');let samples=0,maxExtent=0,maxHFov=0;
     function check(t){
      player.pause();court3d.clearStop();player.t=t;player.render();
      const camera=court3d.camera,points=[];
      for(const x of [8.5,11.5])for(const y of [0,2])points.push(new T.Vector3(x,y,0));
      if(court3d.ball.visible){
       for(const axis of ['x','y','z'])for(const sign of [-1,1]){const q=court3d.ball.position.clone();q[axis]+=.13*sign;points.push(q);}
      }
      for(const q of points){const v=q.project(camera);if(v.z>1||v.z< -1||Math.abs(v.x)>.84||Math.abs(v.y)>.84)throw Error(JSON.stringify({step:player.stepIndex,branch:player.branch?.label,t,v}));maxExtent=Math.max(maxExtent,Math.abs(v.x),Math.abs(v.y));}
      maxHFov=Math.max(maxHFov,court3d.hfov*180/Math.PI);samples++;
     }
     for(let i=0;i<player.data.steps.length;i++){
      player.gotoStep(i,false);for(let t=0;t<=player.total;t+=.1)check(t);
      for(const branch of player.step.branches||[]){player.playBranch(branch);player.pause();for(let t=0;t<=player.total;t+=.1)check(t);}
     }
     return {samples,maxExtent,maxHFov};
    }''')
    print(engine,mirror,json.dumps(result),flush=True)
    if mirror:
     for w,h in [(375,812),(844,390)]:
      await page.set_viewport_size({'width':w,'height':h})
      for t in [0,.2,.5,.7,.79,.81]:
       await page.evaluate('t=>{player.gotoStep(1,false);player.t=t;player.render();document.getElementById("closeResult").click();document.getElementById("closeChoice").click()}',t)
       await page.screenshot(path=str(OUT/f'{engine}-{w}-receive-{t}.png'))
       assert await page.evaluate('''()=>{const c=court3d;const v=c.ball.position.clone().project(c.camera);return !c.ball.visible||(Math.abs(v.x)<.84&&Math.abs(v.y)<.84&&v.z<1)}''')
     await page.locator('#scene').focus();await page.keyboard.press('ArrowRight')
     assert await page.evaluate('court3d.yawOffset!==0')
     await page.locator('#resetView').click();assert await page.evaluate('court3d.yawOffset===0')
   assert not errors,errors
   await b.close()
asyncio.run(main())
