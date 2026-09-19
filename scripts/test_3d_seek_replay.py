"""Finishing, seeking back, and finishing again must reopen the result panel."""
import asyncio,sys
from playwright.async_api import async_playwright
BASE=sys.argv[1].rstrip('/') if len(sys.argv)>1 else 'http://127.0.0.1:8765'
async def main():
 async with async_playwright() as pw:
  for engine in ['chromium','webkit']:
   b=await getattr(pw,engine).launch(**({'args':['--use-angle=swiftshader']} if engine=='chromium' else {}))
   p=await b.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
   errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   for id in ['05','06','07']:
    for mirror in [False,True]:
     await p.goto(BASE+'/pov-3d.html?id='+id+('&mirror=1' if mirror else ''));await p.wait_for_function('!!window.court3d')
     await p.locator('#choose').click();await p.locator('#branches button').last.click()
     assert await p.locator('#resultPanel').is_visible()
     await p.locator('#closeResult').click();await p.locator('#seek').fill('0')
     assert await p.evaluate('player.t===(player.branch.playFrom??0)')
     await p.locator('#play').click();assert await p.locator('#resultPanel').is_visible(),(engine,id,mirror)
   assert not errors,errors
   print(engine,'05/06/07 both variants: finish -> seek back -> finish PASS',flush=True)
   await b.close()
asyncio.run(main())
