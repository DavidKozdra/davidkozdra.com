"""Run with Python Playwright installed; npm ci supplies axe-core. Starts its own local server."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright, expect
import json

ROOT = Path(__file__).resolve().parents[2]
AXE = (ROOT / 'cardKing/node_modules/axe-core/axe.min.js').read_text()
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}/cardKing/'
checks = []
errors = []
def passed(text):
    checks.append(text)
    print('PASS: ' + text, flush=True)
def audit(page):
    page.add_script_tag(content=AXE)
    return page.evaluate("async () => (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))")
def saved(page):
    page.wait_for_timeout(180)
    page.wait_for_function("document.querySelector('#save-status').textContent.includes('Saved in this browser')")
    return page.evaluate("JSON.parse(localStorage.getItem('cardking.draft.v1'))")
try:
 with TemporaryDirectory(prefix='cardking-a11y-') as temp, sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1600,'height':1050}, accept_downloads=True)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL)
    expect(page.locator('#download-html')).to_be_enabled()
    violations = audit(page)
    assert not violations, violations
    passed('editor default view has no axe WCAG A/AA violations')
    page.locator('[data-select-element="heading"]').focus()
    page.keyboard.press('Enter')
    expect(page.locator('#element-content')).to_have_value('A little older.\nA lot more fun.')
    expect(page.locator('[data-select-element="heading"]')).to_be_focused()
    page.locator('#focus-element-text').focus(); page.keyboard.press('Enter')
    expect(page.locator('#element-content')).to_be_focused()
    page.locator('#element-content').fill('An accessible celebration')
    saved(page)
    expect(page.locator('#element-content')).to_be_focused()
    expect(page.locator('[data-field="heading"]')).to_have_value('An accessible celebration')
    page.locator('[data-nudge="right"]').focus(); page.keyboard.press('Enter')
    data = saved(page)
    assert data['layouts']['heading']['x'] > 0
    expect(page.locator('[data-nudge="right"]')).to_be_focused()
    page.locator('[data-layout="width"]').fill('420')
    page.locator('[data-layout="rotation"]').fill('12')
    assert saved(page)['layouts']['heading']['rotation'] == 12
    page.locator('#undo').focus(); page.keyboard.press('Enter')
    assert saved(page)['layouts']['heading'].get('rotation',0) != 12
    page.locator('#redo').focus(); page.keyboard.press('Enter')
    assert saved(page)['layouts']['heading']['rotation'] == 12
    passed('keyboard selects, edits, moves, resizes, rotates, undoes and redoes with stable focus')
    expect(page.locator('[data-group="appearance"]')).not_to_have_attribute('open','')
    page.locator('[data-group="appearance"] > summary').click()
    page.locator('[data-layout="color"]').fill('#fefefe')
    saved(page)
    page.locator('#check-accessibility').click()
    expect(page.locator('#review-issues')).to_contain_text('Increase text contrast')
    expect(page.locator('#download-html')).to_be_enabled()
    page.locator('#close-review').click()
    expect(page.locator('#check-accessibility')).to_be_focused()
    page.locator('[data-layout="color"]').fill('#214b40')
    page.locator('[data-layout="rotation"]').fill('0')
    saved(page)
    passed('accessibility review flags rendered low contrast and never blocks export')
    page.locator('.reading-order > summary').click()
    frame = page.frame_locator('#preview')
    before = frame.locator('[data-ck-id="heading"]').bounding_box()
    page.locator('[data-reading-id="heading"][data-reading-move="-1"]').click()
    data = saved(page)
    assert data['readingOrder'][1] == 'heading'
    current = frame.locator('[data-ck-id="heading"]').bounding_box()
    assert abs(before['y']-current['y']) < 2, (before,current)
    ids = frame.locator('#page-content > [data-ck-id]').evaluate_all('(els)=>els.map(el=>el.dataset.ckId)')
    assert ids.index('heading') < ids.index('sticker')
    passed('reading order changes DOM sequence without moving the artwork')
    page.locator('#open-code').focus(); page.keyboard.press('Enter')
    expect(page.locator('#code-dialog')).to_be_visible()
    page.locator('#code-source').focus(); page.keyboard.press('Tab')
    assert page.locator('#code-source').evaluate('el=>el!==document.activeElement')
    page.locator('[data-code-tab="page"]').focus(); page.keyboard.press('ArrowRight')
    expect(page.locator('[data-code-tab="html"]')).to_be_focused()
    expect(page.locator('[data-code-tab="html"]')).to_have_attribute('aria-selected','true')
    page.keyboard.press('Escape')
    expect(page.locator('#open-code')).to_be_focused()
    passed('code tabs support keyboard navigation, Tab escapes the textarea, and dialog focus returns')
    page.locator('[data-add="text"]').click()
    page.locator('#element-content').fill('Free placement stays accessible')
    data = saved(page); custom_id = data['elements'][-1]['id']
    custom = frame.locator(f'[data-ck-id="{custom_id}"]')
    expect(custom).to_be_visible()
    custom.scroll_into_view_if_needed()
    box = custom.bounding_box(); x=box['x']+box['width']/2; y=box['y']+box['height']/2
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+30,y+25,steps=8);page.mouse.up()
    assert saved(page)['layouts'][custom_id]['x'] > 15
    custom.dblclick()
    inline = frame.locator('[contenteditable="plaintext-only"]'); inline.fill('Still free to create')
    page.locator('#element-content').click()
    expect(page.locator('#element-content')).to_have_value('Still free to create')
    page.locator('[data-element-command="delete"]').click()
    expect(page.locator('[data-select-element="heading"]')).to_be_focused()
    passed('direct dragging and inline editing still work; deleting a custom element restores layer focus')
    page.locator('#photo-upload').set_input_files(str(ROOT/'cards/mom_card/cat.jpg'))
    saved(page)
    page.locator('#check-accessibility').click()
    expect(page.locator('#review-issues')).to_contain_text('Describe this photo')
    page.locator('#review-issues [data-review-element="photo"]').first.click()
    expect(page.locator('[data-field="imageAlt"]')).to_be_focused()
    page.locator('[data-field="imageAlt"]').fill('A black and white cat resting in a pink stroller')
    saved(page)
    page.locator('[data-field="imageDecorative"]').check()
    saved(page)
    expect(frame.locator('.photo-block img')).to_have_attribute('alt','')
    page.locator('[data-field="imageDecorative"]').uncheck()
    saved(page)
    passed('photos support descriptions and an explicit decorative-image choice')
    # All template defaults: audit generated cards without editor controls.
    for template in ['birthday','party','note','dino']:
        source = page.evaluate("async(id)=>{const {createTemplate}=await import('./project.mjs');const {generateHTML}=await import('./render.mjs');return generateHTML(createTemplate(id),{css:await(await fetch('./page.css')).text(),engine:await(await fetch('./vendor/koz-engine.js')).text()});}", template)
        destination = Path(temp)/f'{template}.html'; destination.write_text(source)
        card = context.new_page(); card.goto(destination.as_uri())
        expect(card.locator('h1')).to_have_count(1)
        assert not audit(card), (template,audit(card))
        if template == 'birthday':
            seconds=card.locator('[data-count-unit="seconds"]')
            first=seconds.inner_text(); expect(seconds).not_to_have_text(first,timeout=2500)
            card.locator('#pause-countdown').click(); held=seconds.inner_text(); card.wait_for_timeout(1200); expect(seconds).to_have_text(held)
            card.locator('#pause-countdown').click(); expect(seconds).not_to_have_text(held,timeout=2500)
            card.locator('#pause-motion').click(); expect(card.locator('html')).to_have_attribute('data-motion','paused')
            card.locator('#pause-motion').click(); expect(card.locator('html')).to_have_attribute('data-motion','full')
        if template == 'note':
            card.locator('#open-card').focus(); card.keyboard.press('Enter'); expect(card.locator('#card-cover')).to_be_hidden()
            expect(card.locator('h1')).to_be_focused()
        card.close()
    passed('all four exported templates pass axe; seconds tick and pause; motion and card opening work by keyboard')
    # Responsive checks include the effective layout widths reached at high browser zoom.
    for width in [320,390,400,768,1024,1440,1600]:
        page.set_viewport_size({'width':width,'height':900})
        if width<1440:
            page.locator('[data-workspace-view="canvas"]').click()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
        if width<768:
            page.locator('[data-workspace-view="properties"]').click(); expect(page.locator('#studio-properties')).to_be_visible(); expect(page.locator('#studio-canvas')).to_be_hidden()
            page.locator('[data-workspace-view="content"]').click(); expect(page.locator('#studio-tools')).to_be_visible()
            page.locator('[data-workspace-view="canvas"]').click()
    page.set_viewport_size({'width':1600,'height':1050})
    page.locator('[data-select-element="heading"]').click()
    expect(page.locator('#element-content')).to_be_visible()
    page.wait_for_function("parseFloat(getComputedStyle(document.querySelector('#element-content')).fontSize)>=16")
    assert page.locator('#download-html').evaluate('el=>el.getBoundingClientRect().height')>=44
    page.evaluate("document.documentElement.style.fontSize='32px'")
    page.wait_for_function("parseFloat(getComputedStyle(document.querySelector('#element-content')).fontSize)>=32")
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'overflow with text enlarged to 200%'
    page.evaluate("document.documentElement.style.fontSize=''")
    page.screenshot(path='/tmp/cardking-accessible-final.png')
    page.set_viewport_size({'width':390,'height':844});page.locator('[data-workspace-view="canvas"]').click()
    expect(page.locator('.add-elements')).to_be_hidden()
    page.locator('#toggle-elements').click(); expect(page.locator('.add-elements')).to_be_visible()
    page.locator('#toggle-elements').click(); expect(page.locator('.add-elements')).to_be_hidden()
    assert not audit(page), audit(page)
    page.screenshot(path='/tmp/cardking-accessible-mobile.png', full_page=True)
    passed('responsive views reflow from 320px upward; readable fields and primary touch targets are retained')
    reduced=browser.new_context(reduced_motion='reduce')
    r=reduced.new_page();r.goto((Path(temp)/'birthday.html').as_uri())
    expect(r.locator('html')).to_have_attribute('data-motion','paused')
    # Inspect the browser accessibility tree as a screen-reader proxy; not a real AT certification.
    snapshot=r.locator('body').aria_snapshot()
    assert 'Pause countdown' in snapshot and 'heading' in snapshot and 'seconds' in snapshot
    passed('reduced-motion default and exported accessibility-tree labels are correct')
    with page.expect_download() as info:page.locator('#download-html').click()
    output=Path(temp)/'roundtrip.html';info.value.save_as(str(output))
    offline=browser.new_context(offline=True)
    o=offline.new_page();o.goto(output.as_uri());expect(o.locator('.photo-block img')).to_have_attribute('alt','A black and white cat resting in a pink stroller')
    assert o.locator('.photo-block img').evaluate('el=>el.complete&&el.naturalWidth>0')
    page.locator('#project-upload').set_input_files(str(output));data=saved(page)
    assert data['readingOrder'][1]=='heading'; assert data['heading']=='An accessible celebration'
    assert not errors,errors
    passed('accessible metadata, positions and photos survive offline HTML export and reimport')
    print(json.dumps({'checks':len(checks),'page_errors':errors},indent=2))
    browser.close()
finally:
 server.shutdown();server.server_close()
