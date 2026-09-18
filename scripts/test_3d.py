"""Real-control tests for the single-screen 3D player. Local server: port 8765."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
OUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/handball-screen-qa');OUT.mkdir(parents=True,exist_ok=True)
BASE=sys.argv[2] if len(sys.argv)>2 else 'http://127.0.0.1:8765'
async def fits(page,selector):
    assert await page.locator(selector).is_visible(),selector+' hidden'
    assert await page.locator(selector).evaluate('''el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1}'''),selector+' outside screen'
    assert await page.locator(selector).evaluate('''el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===el||el.contains(hit)}'''), selector+' covered'
    assert await page.evaluate('scrollY===0&&document.documentElement.scrollWidth<=innerWidth'), 'Page scrolled'
async def finish(page):
    # Use only the actual play/continue button through training pauses.
    for _ in range(180):
        if await page.locator('#choicePanel').is_visible() or await page.locator('#resultPanel').is_visible():return
        if await page.evaluate('!!court3d.stopped'):
            await fits(page,'#play');await page.locator('#play').click()
        await page.wait_for_timeout(150)
    raise AssertionError('Playback never completed')
async def main():
 async with async_playwright() as pw:
  for engine in ['chromium','webkit']:
   browser=await getattr(pw,engine).launch(**({'args':['--use-angle=swiftshader']} if engine=='chromium' else {}))
   page=await browser.new_page(viewport={'width':375,'height':812},device_scale_factor=1)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto(BASE+'/pov-3d.html');await page.wait_for_function('!!window.court3d')
   assert await page.locator('#loading').is_hidden()
   for el in ['#play','#prev','#next','#choose','#settingsBtn']:await fits(page,el)
   await page.screenshot(path=str(OUT/f'{engine}-initial.png'))
   await page.locator('#play').click();await finish(page)
   assert await page.locator('#choicePanel').is_visible()
   assert await page.evaluate('player.stepIndex===3&&!player.auto&&!player.playing')
   for i in range(3):await fits(page,f'#branches button:nth-child({i+1})')
   await page.screenshot(path=str(OUT/f'{engine}-choices.png'))
   for k in range(3):
    await page.locator('#branches button').nth(k).click();await finish(page)
    assert await page.locator('#resultPanel').is_visible()
    for el in ['#tryOther','#again','#startOver']:await fits(page,el)
    await page.screenshot(path=str(OUT/f'{engine}-result-{k}.png'))
    if k==0:
     await page.locator('#again').click();await finish(page)
     assert await page.locator('#resultPanel').is_visible()
    await page.locator('#tryOther').click()
    assert await page.locator('#choicePanel').is_visible()
   await page.locator('#branches button').nth(1).click();await finish(page)
   await page.locator('#startOver').click()
   assert await page.evaluate('player.stepIndex===0&&player.playing')
   await page.locator('#play').click()
   await page.locator('#settingsBtn').click()
   for el in ['#learn','#experience','#speed','#sound','#wide','#closeSettings']:await fits(page,el)
   await page.locator('#experience').click();await page.locator('#speed').click()
   await page.locator('#sound').click();assert await page.evaluate('court3d.sound.enabled')
   await page.locator('#sound').click();assert not await page.evaluate('court3d.sound.enabled')
   await page.locator('#wide').click();assert await page.evaluate('court3d.wide')
   await page.locator('#closeSettings').click();await page.locator('#play').click();await finish(page)
   assert await page.locator('#choicePanel').is_visible()
   assert not await page.evaluate('!!court3d.stopped')
   await page.locator('#closeChoice').click()
   # Drag does not move the page. Reset returns to the scripted view.
   r=await page.locator('#scene').bounding_box();x=r['x']+r['width']*.45;y=r['y']+r['height']*.45
   await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+50,y+10,steps=4);await page.mouse.up()
   assert abs(await page.evaluate('court3d.yawOffset'))>.05
   await page.locator('#resetView').click();assert await page.evaluate('court3d.yawOffset===0')
   for width,height in [(320,568),(375,667),(390,844),(844,390),(1440,900)]:
    await page.set_viewport_size({'width':width,'height':height});await page.wait_for_timeout(200)
    await page.locator('#choose').click()
    for el in ['#play','#choose','#branches button:nth-child(1)','#branches button:nth-child(3)']:await fits(page,el)
    await page.screenshot(path=str(OUT/f'{engine}-{width}x{height}.png'))
    await page.locator('#closeChoice').click()
   await page.emulate_media(reduced_motion='reduce');await page.reload();await page.wait_for_function('!!window.court3d')
   await page.locator('#choose').click();await page.locator('#branches button').first.click()
   assert await page.locator('#resultPanel').is_visible()
   assert not errors, errors
   print(engine.upper()+' ALL PASS: no-scroll playback, 3 branches, replay, settings, layouts, reduced motion',flush=True)
   await browser.close()
asyncio.run(main())
