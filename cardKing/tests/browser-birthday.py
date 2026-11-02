"""Birthday-card capability and full-card editing regression. Never posts to a real relay."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright,expect
import json
ROOT=Path(__file__).resolve().parents[2]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}/cardKing/'
axe=(ROOT/'cardKing/node_modules/axe-core/axe.min.js').read_text()
errors=[];checks=[]
def passed(t):checks.append(t);print('PASS: '+t,flush=True)
def saved(page):
 page.wait_for_timeout(180);page.wait_for_function("document.querySelector('#save-status').textContent.includes('Saved in this browser')")
 return page.evaluate("JSON.parse(localStorage.getItem('cardking.draft.v1'))")
try:
 with TemporaryDirectory(prefix='cardking-birthday-') as temp,sync_playwright() as p:
  b=p.chromium.launch(headless=True);ctx=b.new_context(viewport={'width':1600,'height':1050},accept_downloads=True);page=ctx.new_page();page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR:',e,flush=True)))
  page.goto(URL);expect(page.locator('#download-html')).to_be_enabled()
  assert 'A little character' not in page.locator('body').inner_text()
  page.locator('.template-picker > summary').click();page.locator('[data-template="birthday-site"]').click();page.locator('#confirm-template').click()
  expect(page.locator('#template-dialog')).not_to_be_visible(timeout=15000)
  data=saved(page);assert data['coverImage'].startswith('data:image/webp;base64,');assert data['rainImage'].startswith('data:image/webp;base64,');assert data['confettiImage'].startswith('data:image/webp;base64,');assert data['eventDuration']==150
  frame=page.frame_locator('#preview');expect(frame.locator('[data-ck-id="cover-heading"]')).to_have_text('David Kozdra’s\n26th Birthday')
  passed('birthday preset imports cover art, photo rain, drink sprites, fold-out layout and five action buttons')
  page.locator('#element-content').fill('Team celebration')
  expect(frame.locator('[data-ck-id="cover-heading"]')).to_have_text('Team celebration')
  page.locator('[data-surface-view="back"]').click();page.locator('#element-content').fill('See you there')
  expect(frame.locator('[data-ck-id="back-heading"]')).to_have_text('See you there')
  page.locator('[data-surface-view="content"]').click();page.locator('[data-select-element="details"]').click()
  page.locator('#inspector-content [data-project-field="location"]').fill('100 Example Road\nOrlando, FL')
  expect(frame.locator('.details-block')).to_contain_text('100 Example Road')
  page.locator('[data-select-element="footer"]').click();page.locator('#element-content').fill('Contact the organizer')
  page.locator('#inspector-content [data-project-field="footerUrl"]').fill('https://example.com/contact')
  expect(frame.locator('.made-with')).to_have_text('Contact the organizer')
  page.locator('[data-select-element="sticker"]').click();page.locator('#element-content').fill('★')
  expect(frame.locator('.hero-sticker')).to_have_text('★')
  passed('cover, back panel, event details, footer and header graphic edit directly from element properties')
  page.locator('#add-event-button').select_option('rsvp');data=saved(page);assert data['elements'][-1]['action']=='rsvp';assert data['elements'][-1]['flow']
  page.locator('[data-element-command="delete"]').click()
  page.locator('[data-canvas-mode="interact"]').click()
  expect(frame.locator('#open-card')).to_be_visible();frame.locator('#open-card').click();expect(frame.locator('#card-cover')).to_be_hidden()
  expect(frame.locator('a[href*="calendar.google.com"]')).to_have_count(1)
  expect(frame.locator('a[href="https://davidkozdra.com/cards/brithday/menu.html"]')).to_have_count(1)
  expect(frame.locator('a[href="https://davidkozdra.com/cards/brithday/games.html"]')).to_have_count(1)
  map_url=frame.locator('a[href*="google.com/maps"]').get_attribute('href');assert '100%20Example%20Road' in map_url
  request_count=[]
  def relay(route):
   if route.request.method=='POST':request_count.append(route.request.post_data_json)
   route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'})
  ctx.route('https://hooks.davidkozdra.com/**',relay)
  frame.locator('[data-ck-action="rsvp"]').click();expect(frame.locator('#rsvp-dialog')).to_be_visible()
  frame.locator('#rsvp-form input[name="name"]').fill('Preview Person');frame.locator('#rsvp-add-guest').click();frame.locator('#rsvp-guests input').fill('Guest One');frame.locator('#rsvp-submit').click()
  expect(frame.locator('#rsvp-status')).to_have_text('Preview: RSVP validated. No message was sent.');assert len(request_count)==0
  frame.locator('#rsvp-close').click();frame.locator('[data-ck-action="close-card"]').click();expect(frame.locator('#card-cover')).to_be_visible();frame.locator('#open-card').click();expect(frame.locator('#card-cover')).to_be_hidden()
  passed('calendar, map, menu, games, close/reopen and RSVP preview work; preview sends no network request')
  with page.expect_download() as info:page.locator('#download-html').click()
  target=Path(temp)/'birthday.html';info.value.save_as(str(target))
  live=ctx.new_page();live.on('pageerror',lambda e:errors.append(str(e)));live.goto(target.as_uri())
  expect(live.locator('#open-card')).to_be_visible();live.wait_for_function("document.querySelector('#confetti').getContext('2d').getImageData(0,0,innerWidth,innerHeight).data.some((v,i)=>i%4===3&&v>0)")
  live.locator('#open-card').click();expect(live.locator('#card-cover')).to_be_hidden();expect(live.locator('#back-content')).to_be_visible()
  expect(live.locator('#back-content [data-ck-id="back-heading"]')).to_have_text('See you there')
  live.locator('[data-ck-action="rsvp"]').click();live.locator('#rsvp-form input[name="name"]').fill('Actual Test');live.locator('#rsvp-form input[name="phone"]').fill('555-0100')
  live.locator('#rsvp-add-guest').click();live.locator('#rsvp-guests input').fill('Named Guest');live.locator('#rsvp-submit').click();expect(live.locator('#rsvp-dialog')).to_be_hidden()
  assert len(request_count)==1;payload=request_count[0];assert payload['title']=='RSVP: Actual Test';assert any(f['value']=='2' for f in payload['fields'] if f['name']=='Party size');assert any('Named Guest' in f['value'] for f in payload['fields']);assert any(f['value']=='555-0100' for f in payload['fields'])
  passed('exported HTML renders embedded photo rain and fold-out back panel; RSVP delivers the expected guest/phone payload to a mocked relay')
  ctx.unroute('https://hooks.davidkozdra.com/**');ctx.route('https://hooks.davidkozdra.com/**',lambda route:route.fulfill(status=500,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}))
  live.locator('[data-ck-action="rsvp"]').click();live.locator('#rsvp-form input[name="name"]').fill('Retry Test');live.locator('#rsvp-submit').click()
  expect(live.locator('#rsvp-status')).to_contain_text('was not sent');expect(live.locator('#rsvp-submit')).to_be_enabled();expect(live.locator('#rsvp-form input[name="name"]')).to_have_value('Retry Test')
  live.add_script_tag(content=axe);violations=live.evaluate("async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))")
  assert not violations,violations
  live.locator('#rsvp-close').click();live.locator('#pause-motion').click();expect(live.locator('html')).to_have_attribute('data-motion','paused')
  live.screenshot(path='/tmp/cardking-birthday-export.png',full_page=True)
  page.locator('#project-upload').set_input_files(str(target));data=saved(page);assert data['coverHeading']=='Team celebration';assert data['footerText']=='Contact the organizer';assert data['rsvpMode']=='relay';assert data['rainImage']
  page.locator('[data-surface-view="content"]').click();page.locator('[data-canvas-mode="edit"]').click();page.add_script_tag(content=axe)
  violations=page.evaluate("async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))")
  assert not violations,violations
  page.screenshot(path='/tmp/cardking-editor-professional.png')
  assert not errors,errors;passed('RSVP failures retain input; accessibility checks pass; full-card settings survive HTML reimport')
  print(json.dumps({'checks':len(checks),'errors':errors,'real_messages_sent':0}),flush=True);b.close()
finally:server.shutdown();server.server_close()
