import asyncio,json
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(args=['--use-angle=swiftshader']);page=await b.new_page(viewport={'width':375,'height':812})
  await page.goto('http://127.0.0.1:8765/pov-3d.html');await page.wait_for_function('!!window.court3d')
  result=await page.evaluate('''async()=>{
   const T=await import('./vendor/three-0.170.0.module.min.js');let maxGroundError=0,maxPositionError=0;
   const pose=()=>Object.values(court3d.athletes).map(m=>[m.body.position.y,m.body.rotation.toArray(),m.limbs[1].leg.rotation.toArray()]);
   for(let i=0;i<4;i++)for(const t of [.15,.6,1.2]){
    player.gotoStep(i,false);player.t=Math.min(t,player.total);player.render();
    const st=TacticEngine.stateAt(player.seq.start,player.seq.actions,player.t);
    for(const [id,m]of Object.entries(court3d.athletes)){
     maxPositionError=Math.max(maxPositionError,Math.abs(m.root.position.x-st.pos[id].x),Math.abs(m.root.position.z-st.pos[id].y));
     const ys=[];for(const side of [-1,1])for(const z of [-.5,.5])ys.push(new T.Vector3(0,-.5,z).applyMatrix4(m.limbs[side].sole.matrixWorld).y);
     maxGroundError=Math.max(maxGroundError,Math.abs(Math.min(...ys)-.008));
    }
    const first=JSON.stringify(pose());player.t=0;player.render();player.t=Math.min(t,player.total);player.render();if(first!==JSON.stringify(pose()))throw Error('pose not deterministic');
   }
   player.gotoStep(3,false);player.t=.5;player.render();document.getElementById('closeChoice').click();
   return {maxGroundError,maxPositionError,cameraHeight:court3d.camera.position.y,drawCalls:court3d.renderer.info.render.calls,triangles:court3d.renderer.info.render.triangles};
  }''')
  print(json.dumps(result));assert result['maxGroundError']<.001 and result['maxPositionError']==0 and result['cameraHeight']==1.6
  await page.screenshot(path='/tmp/handball-realistic-detail.png')
  print('FOOT CONTACT / SOURCE POSITIONS / DETERMINISTIC POSES PASS');await b.close()
asyncio.run(main())
