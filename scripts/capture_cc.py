"""Visual checkpoints and left/right CC hand assertions for the final data."""
import asyncio,pathlib
from playwright.async_api import async_playwright
OUT=pathlib.Path('/tmp/handball08/final');OUT.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as pw:
  b=await pw.chromium.launch(args=['--use-angle=swiftshader'])
  p=await b.new_page(viewport={'width':390,'height':844})
  for mirror in [0,1]:
   await p.goto(f'http://127.0.0.1:8765/pov-3d.html?id=08&mirror={mirror}')
   await p.wait_for_function('!!window.court3d')
   if mirror:
    await p.locator('#choose').click();await p.locator('#branches button').first.click();await p.evaluate('player.pause()')
   for t in [1.65,1.9,2.0,2.1,2.3,2.5]:
    await p.evaluate('(t)=>{player.pause();player.t=t;player.render()}',t)
    # Mirrored branch retains original clock; normal first step is unchanged.
    if t==2.0:
     assert await p.evaluate('''mirror=>{const a=player.seq.actions.find(a=>a.hand);const m=court3d.athletes[a.from];return a.hand===(mirror?'右':'左')&&Math.abs(m.limbs[mirror?1:-1].arm.rotation.x)>Math.abs(m.limbs[mirror?-1:1].arm.rotation.x)}''',mirror)
    await p.screenshot(path=str(OUT/f'{mirror}-cc-{t}.png'))
   await p.locator('#choose').click()
   count=await p.locator('#branches button').count()
   for k in range(count):
    await p.locator('#branches button').nth(k).click()
    await p.evaluate('player.pause();player.t=Math.min(player.total-.1,(player.branch.playFrom??0)+1);player.render()')
    await p.screenshot(path=str(OUT/f'{mirror}-branch-{k}.png'))
    await p.locator('#choose').click()
   for w,h in [(375,667),(844,390)]:
    await p.set_viewport_size({'width':w,'height':h});await p.locator('#closeChoice').click();await p.screenshot(path=str(OUT/f'{mirror}-{w}-overview.png'))
    await p.locator('#settingsBtn').click();await p.locator('#overview').click();await p.locator('#closeSettings').click();await p.screenshot(path=str(OUT/f'{mirror}-{w}-first.png'))
    await p.locator('#settingsBtn').click();await p.locator('#overview').click();await p.locator('#closeSettings').click();await p.locator('#choose').click()
   await p.set_viewport_size({'width':390,'height':844})
  await b.close()
  print('CC hand assertions and final visual checkpoints PASS')
asyncio.run(main())
