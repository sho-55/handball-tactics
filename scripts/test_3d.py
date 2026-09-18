"""Run with a local server on 8765: python3 scripts/test_3d.py /tmp/handball-3d-qa"""
import asyncio
import json
import pathlib
import sys
from playwright.async_api import async_playwright

OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/handball-3d-qa')
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:8765'

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(args=['--use-angle=swiftshader'])
        page = await browser.new_page(viewport={'width':375,'height':812}, device_scale_factor=2)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        await page.goto(BASE + '/pov-3d.html')
        await page.wait_for_function('!!window.court3d')
        assert await page.locator('#loading').is_hidden(), 'WebGL lost or loading failed'
        assert await page.evaluate('document.documentElement.scrollWidth') == 375
        assert await page.evaluate('Object.keys(court3d.athletes).length') == 11
        assert await page.evaluate('player.data.steps.slice(0,3).every(s=>!s.branches.length)')
        assert await page.evaluate('player.data.steps[3].branches.length') == 3
        assert not await page.evaluate('player.playing'), 'Must wait for user to start'
        await page.screenshot(path=str(OUT/'01-initial.png'), full_page=True)

        # Every main step and branch: sync with source state, different poses, no NaN.
        for i in range(4):
            for fraction in (0,.5,1):
                result = await page.evaluate('''([i,f])=>{
                  player.auto=false;player.gotoStep(i,false);player.t=player.total*f;player.render();
                  const st=TacticEngine.stateAt(player.seq.start,player.seq.actions,player.t);
                  return Object.entries(court3d.athletes).every(([id,m])=>
                    m.root.position.x===st.pos[id].x && m.root.position.z===st.pos[id].y &&
                    Number.isFinite(m.root.rotation.y)) && court3d.camera.position.y===1.6;
                }''',[i,fraction])
                assert result, f'3D position/rotation mismatch step {i}'
            await page.locator('.stage').screenshot(path=str(OUT/f'step-{i+1}.png'))
        assert await page.evaluate('court3d.hands.visible'), 'Hands while RB holds the ball'
        await page.screenshot(path=str(OUT/'02-decision.png'),full_page=True)
        for k in range(3):
            await page.evaluate('''k=>{player.playBranch(player.step.branches[k]);player.pause();
              player.t=player.total*.5;player.render();}''',k)
            await page.locator('.stage').screenshot(path=str(OUT/f'branch-{k+1}-middle.png'))
            await page.evaluate('player.t=player.total;player.render()')
            assert await page.locator('#shot').is_visible()
            assert not await page.evaluate('court3d.hands.visible')
            await page.locator('.stage').screenshot(path=str(OUT/f'branch-{k+1}-end.png'))

        # Deterministic camera and body pose when scrubbing backwards.
        snap='JSON.stringify({cam:court3d.camera.matrixWorld.elements,pose:court3d.athletes.R2.limbs[1].arm.rotation.toArray()})'
        await page.evaluate('player.gotoStep(2,false);player.t=1;player.render()')
        before=await page.evaluate(snap)
        await page.evaluate('player.t=0;player.render();player.t=1;player.render()')
        assert before == await page.evaluate(snap)

        # Learning stops exactly at the cue and can resume using actual controls.
        await page.evaluate('player.gotoStep(2,false);player.t=.65;player.render();player.auto=true;player.play()')
        await page.wait_for_function('!!court3d.stopped')
        assert abs(await page.evaluate('player.t')-.7)<.001
        await page.wait_for_timeout(1700)
        assert not await page.evaluate('player.playing'), 'Learning must not auto-dismiss a decision'
        await page.locator('#play').click()
        await page.wait_for_function('player.t>.9')
        await page.evaluate('player.pause();player.auto=false;clearTimeout(player.autoTimer)')

        # Pointer, keyboard, reset and minimap follow the same actual camera.
        await page.locator('#scene').scroll_into_view_if_needed()
        rect=await page.locator('#scene').bounding_box()
        x,y=rect['x']+rect['width']*.5,rect['y']+rect['height']*.7
        await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+65,y-15,steps=5);await page.mouse.up()
        assert abs(await page.evaluate('court3d.yawOffset'))>.1
        assert '見回し中' in await page.locator('#viewStatus').inner_text()
        await page.locator('#resetView').click()
        assert await page.evaluate('court3d.yawOffset===0&&court3d.pitchOffset===0')
        await page.locator('#scene').focus();await page.keyboard.press('ArrowRight')
        assert await page.evaluate('court3d.yawOffset') > 0
        await page.keyboard.press('Home')
        await page.locator('#wide').click()
        assert await page.evaluate('court3d.wide')
        await page.locator('#wide').click()

        # Experience: no training stops, main sequence reaches its final step.
        await page.locator('#experience').click()
        assert not await page.locator('#coach').is_visible()
        await page.evaluate('player.speed=1.5;player.gotoStep(0,false)')
        await page.locator('#play').click()
        await page.wait_for_function('player.stepIndex===3&&!player.playing&&!player.auto',timeout=25000)
        assert not await page.evaluate('!!court3d.stopped')
        assert await page.locator('#branches button').count()==3
        await page.locator('#learn').click()
        assert await page.locator('#coach').is_visible()

        # Audio is opt-in and can be toggled off. Seeking never synthesizes a hit.
        assert not await page.evaluate('court3d.sound.enabled')
        await page.locator('#sound').click()
        assert await page.evaluate('court3d.sound.enabled&&court3d.sound.context.state==="running"')
        await page.locator('#sound').click()
        assert not await page.evaluate('court3d.sound.enabled')
        await page.locator('#seek').fill('500')
        assert abs(await page.evaluate('player.t/player.total')-.5)<.001
        assert not await page.evaluate('player.playing')

        await page.locator('#expand').click()
        assert await page.evaluate('document.documentElement.scrollWidth')==375
        await page.locator('#expand').click()
        for w,h in [(320,740),(768,1024),(1440,900)]:
            await page.set_viewport_size({'width':w,'height':h})
            await page.wait_for_timeout(200)
            assert await page.evaluate('document.documentElement.scrollWidth')==w
            assert await page.locator('#loading').is_hidden()
        await page.locator('.stage').screenshot(path=str(OUT/'03-desktop.png'))
        stats=await page.evaluate('({calls:court3d.renderer.info.render.calls,triangles:court3d.renderer.info.render.triangles})')
        assert stats['triangles']>1000
        await page.emulate_media(reduced_motion='reduce')
        await page.reload();await page.wait_for_function('!!window.court3d')
        await page.locator('#play').click()
        assert await page.evaluate('player.reducedMotion&&!player.playing')
        assert not await page.locator('#stopBox').is_visible()
        assert not errors, errors
        print('3D ALL PASS',json.dumps(stats),flush=True)
        await browser.close()

        # Safari engine check (not a substitute for a physical iPhone).
        webkit=await pw.webkit.launch()
        page=await webkit.new_page(viewport={'width':375,'height':812})
        wk_errors=[];page.on('pageerror',lambda e:wk_errors.append(str(e)))
        await page.goto(BASE+'/pov-3d.html');await page.wait_for_function('!!window.court3d')
        await page.wait_for_timeout(1000)
        assert await page.locator('#loading').is_hidden()
        await page.evaluate('player.gotoStep(3,false);player.t=player.total;player.render()')
        await page.locator('.stage').screenshot(path=str(OUT/'04-webkit.png'))
        assert not wk_errors,wk_errors
        print('WEBKIT PASS',flush=True)
        await webkit.close()

asyncio.run(main())
