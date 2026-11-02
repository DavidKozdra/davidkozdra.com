// Shared by preview and exported cards. Preview submissions never contact a relay.
export function pageRuntime(settings) {
  'use strict';
  const project = JSON.parse(document.getElementById('cardking-project').textContent);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let motionPaused = reduceMotion.matches, countdownPaused = false;
  const canvas = document.querySelector('#confetti'), context = canvas.getContext('2d');
  const particles = new CardKingEngine.ParticleSystemCore({ poolSize: 384, maxPoolSize: 768 });
  const colors = [project.accent, '#e8bf64', '#7da992', '#cc9cce', '#e9e1ce'];
  const cover = document.querySelector('#card-cover'), inside = document.querySelector('#page-content');
  const openButton = document.querySelector('#open-card');
  const backPanel = document.querySelector('#back-content');
  let isOpen = !cover, frame = 0, previous = 0, nextRain = 0, rainActive = false, openTimer;
  const rainPhoto = new Image(), confettiPhoto = new Image();
  const status = message => { document.querySelector('#recipient-status').textContent = message; };
  rainPhoto.onload = () => { if (rainActive && !motionPaused) seedRain(); };
  if (project.rainImage) rainPhoto.src = project.rainImage;
  if (project.confettiImage) confettiPhoto.src = project.confettiImage;
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  resize(); addEventListener('resize', resize, { passive: true });
  function ensureFrame() { if (!frame) { previous = performance.now(); frame = requestAnimationFrame(draw); } }
  function spawnRain(fill = false) {
    if (!rainPhoto.naturalWidth || motionPaused) return;
    const width = 65 + Math.random()*65;
    const p = particles.spawn(Math.random()*innerWidth, fill ? Math.random()*innerHeight : -width, { vx:(Math.random()-.5)*20, vy:65+Math.random()*55, life:20000, size:width, drag:1, gravity:2, tag:'rain' });
    p.imageWidth = width; p.imageHeight = width*rainPhoto.naturalHeight/rainPhoto.naturalWidth; p.angle = (Math.random()-.5)*.25;
  }
  function seedRain() { for (let i=0;i<Math.min(18,Math.ceil(innerWidth/90));i++) spawnRain(true); ensureFrame(); }
  function startRain() { if (motionPaused || !project.rainImage || settings.editing) return; rainActive=true; canvas.style.zIndex='0'; seedRain(); }
  function breakRain() {
    const snapshots = particles.activeParticles().filter(p=>p.tag==='rain').map(p=>({x:p.x,y:p.y,w:p.imageWidth,h:p.imageHeight}));
    rainActive=false; canvas.style.zIndex='10'; particles.clear();
    for (const photo of snapshots) for (let row=0;row<2;row++) for (let col=0;col<2;col++) {
      const dx=photo.x-innerWidth/2,dy=photo.y-innerHeight/2,distance=Math.hypot(dx,dy)||1;
      const p=particles.spawn(photo.x+(col-.5)*photo.w/2,photo.y+(row-.5)*photo.h/2,{vx:dx/distance*220+(col-.5)*180,vy:dy/distance*180-160,life:1400,size:photo.w/2,gravity:350,tag:'fragment'});
      Object.assign(p,{imageWidth:photo.w/2,imageHeight:photo.h/2,sourceX:col*rainPhoto.naturalWidth/2,sourceY:row*rainPhoto.naturalHeight/2,sourceWidth:rainPhoto.naturalWidth/2,sourceHeight:rainPhoto.naturalHeight/2,angle:Math.random()});
    }
    if (snapshots.length) ensureFrame();
  }
  function draw(now) {
    particles.update(Math.min(now-previous||16,40)); previous=now;
    if (rainActive && now>=nextRain) { spawnRain(); nextRain=now+220; }
    context.clearRect(0,0,innerWidth,innerHeight);
    for (const p of particles.activeParticles()) {
      if (p.y>innerHeight+150 && p.tag==='rain') { p.life=0; continue; }
      context.save(); context.translate(p.x,p.y);
      context.rotate(p.angle ?? ((p.maxLife-p.life)/230+p.vx));
      context.globalAlpha=p.tag==='rain' ? Math.min(.4,p.alpha) : Math.min(1,p.alpha*2);
      if (p.tag==='rain' && rainPhoto.naturalWidth) context.drawImage(rainPhoto,-p.imageWidth/2,-p.imageHeight/2,p.imageWidth,p.imageHeight);
      else if (p.tag==='fragment' && rainPhoto.naturalWidth) context.drawImage(rainPhoto,p.sourceX,p.sourceY,p.sourceWidth,p.sourceHeight,-p.imageWidth/2,-p.imageHeight/2,p.imageWidth,p.imageHeight);
      else if (p.tag==='image-confetti' && confettiPhoto.naturalWidth) {
        const r=p.source; context.drawImage(confettiPhoto,r.x,r.y,r.width,r.height,-p.imageWidth/2,-p.imageHeight/2,p.imageWidth,p.imageHeight); p.angle+=.025;
      } else {
        context.fillStyle=p.color;
        if (project.effect==='sparkles') {
          context.beginPath(); for(let i=0;i<8;i++){const r=i%2 ? p.size/3 : p.size;context.lineTo(Math.cos(i*Math.PI/4)*r,Math.sin(i*Math.PI/4)*r);} context.closePath();context.fill();
        } else context.fillRect(-p.size/2,-p.size/2,p.size,p.size*.55);
      }
      context.restore();
    }
    if (particles.activeCount()||rainActive) frame=requestAnimationFrame(draw); else {frame=0;previous=0;}
  }
  function celebrate(origin) {
    if(project.effect==='none'||motionPaused) return;
    canvas.style.zIndex='10';
    const rect=origin?.getBoundingClientRect?.();
    const x=rect ? rect.left+rect.width/2 : innerWidth/2,y=rect ? rect.top+rect.height/2 : Math.min(innerHeight*.35,270);
    for(let i=0;i<project.particleCount;i++) {
      const image=confettiPhoto.naturalWidth && i%3===0;
      const p=particles.spawn(x,y,{vx:(Math.random()-.5)*620,vy:-80-Math.random()*340,life:2100+Math.random()*1600,size:5+Math.random()*6,color:colors[i%colors.length],gravity:360,drag:.995,tag:image?'image-confetti':null});
      if(image){const rects=project.confettiSprites.filter(r=>r.x+r.width<=confettiPhoto.naturalWidth&&r.y+r.height<=confettiPhoto.naturalHeight);p.source=rects.length?rects[Math.floor(Math.random()*rects.length)]:{x:0,y:0,width:confettiPhoto.naturalWidth,height:confettiPhoto.naturalHeight};p.imageHeight=40+Math.random()*35;p.imageWidth=p.imageHeight*p.source.width/p.source.height;p.angle=Math.random()*Math.PI*2;}
    }
    ensureFrame();
  }
  function setMotion(paused) {
    motionPaused=paused; document.documentElement.dataset.motion=paused?'paused':'full';
    const button=document.querySelector('#pause-motion');button.textContent=paused?'Resume animations':'Pause animations';button.setAttribute('aria-pressed',String(paused));
    if(paused){cancelAnimationFrame(frame);frame=0;previous=0;particles.clear();context.clearRect(0,0,innerWidth,innerHeight);}
    else if (rainActive) seedRain();
  }
  setMotion(motionPaused);reduceMotion.addEventListener('change',e=>setMotion(e.matches));
  document.querySelector('#pause-motion').addEventListener('click',()=>setMotion(!motionPaused));
  function setCardOpen(open) {
    if(!cover) return;
    clearTimeout(openTimer); isOpen=open;
    document.body.classList.toggle('card-open',open);cover.classList.toggle('is-open',open);
    if(backPanel){backPanel.toggleAttribute('inert',!open);backPanel.setAttribute('aria-hidden',String(!open));}
    inside.toggleAttribute('inert',!open);inside.setAttribute('aria-hidden',String(!open));
    openButton?.setAttribute('aria-expanded',String(open));
    if(open){breakRain();openTimer=setTimeout(()=>{if(isOpen)cover.hidden=true;},motionPaused?0:650);inside.querySelector('h1')?.focus({preventScroll:true});celebrate();status('Card opened.');}
    else {cover.hidden=false;scrollTo({top:0,behavior:'instant'});openButton?.focus({preventScroll:true});if(project.photoRain)startRain();status('Card closed.');}
  }
  openButton?.addEventListener('click',()=>setCardOpen(true));
  if(cover && project.photoRain && !settings.editing) startRain();
  document.querySelector('#celebrate')?.addEventListener('click',e=>celebrate(e.currentTarget));
  if(!cover&&!settings.editing)setTimeout(()=>celebrate(),350);
  const countdowns=[...document.querySelectorAll('[data-countdown]')];
  function tick(){
    if(!countdowns.length||countdownPaused)return;
    if(!settings.timestamp){countdowns.forEach(c=>c.setAttribute('aria-label','Choose an event date to start the countdown'));return;}
    const remaining=settings.timestamp-Date.now(),total=Math.max(0,Math.floor(remaining/1000));
    const values={days:Math.floor(total/86400),hours:Math.floor(total/3600)%24,minutes:Math.floor(total/60)%60,seconds:total%60};
    for(const c of countdowns){for(const[unit,value]of Object.entries(values)){const target=c.querySelector(`[data-count-unit="${unit}"]`);if(target)target.textContent=String(value).padStart(2,'0');}c.setAttribute('aria-label',remaining<=0?'The event has started.':`${values.days} days, ${values.hours} hours, ${values.minutes} minutes, ${values.seconds} seconds until the event`);}
  }
  tick();if(countdowns.length)setInterval(tick,1000);
  document.querySelector('#pause-countdown')?.addEventListener('click',e=>{countdownPaused=!countdownPaused;e.currentTarget.textContent=countdownPaused?'Resume countdown':'Pause countdown';e.currentTarget.setAttribute('aria-pressed',String(countdownPaused));status(countdownPaused?'Countdown paused. The event date is unchanged.':'Countdown resumed.');if(!countdownPaused)tick();});
  function downloadCalendar(){
    if(!settings.timestamp){status('Set an event date before adding a calendar event.');return;}
    const escape=v=>v.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
    const date=v=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Card King//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${settings.timestamp}-${settings.slug}@cardking.local`,`DTSTAMP:${date(Date.now())}`,`DTSTART:${date(settings.timestamp)}`,`DTEND:${date(settings.timestamp+project.eventDuration*60000)}`,`SUMMARY:${escape(project.heading.replace(/\n/g,' '))}`,`DESCRIPTION:${escape(project.message)}`,`LOCATION:${escape(project.location)}`,'END:VEVENT','END:VCALENDAR',''];
    const url=URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${settings.slug}.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  document.querySelector('#add-calendar')?.addEventListener('click',downloadCalendar);
  const dialog=document.querySelector('#rsvp-dialog'), form=document.querySelector('#rsvp-form'), guests=document.querySelector('#rsvp-guests');
  let rsvpTrigger;
  function openRsvp(trigger){rsvpTrigger=trigger;document.querySelector('#rsvp-status').textContent=settings.preview?'Preview mode: submissions are not sent.':'';dialog.showModal();form.elements.name.focus();}
  document.querySelector('#rsvp-close')?.addEventListener('click',()=>dialog.close());
  dialog?.addEventListener('close',()=>rsvpTrigger?.focus({preventScroll:true}));
  dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  function updateGuests(){[...guests.children].forEach((row,i)=>{row.querySelector('input').setAttribute('aria-label',`Guest ${i+1} name`);row.querySelector('button').setAttribute('aria-label',`Remove guest ${i+1}`);});document.querySelector('#rsvp-add-guest').hidden=guests.children.length>=project.maxGuests;}
  document.querySelector('#rsvp-add-guest')?.addEventListener('click',()=>{if(guests.children.length>=project.maxGuests)return;const row=document.createElement('div');row.className='rsvp-guest';row.innerHTML='<input type="text" maxlength="80" autocomplete="off" placeholder="Guest name (optional)"><button type="button">Remove</button>';guests.append(row);updateGuests();row.querySelector('input').focus();});
  guests?.addEventListener('click',e=>{if(e.target.closest('button')){e.target.closest('.rsvp-guest').remove();updateGuests();document.querySelector('#rsvp-add-guest').focus();}});
  form?.addEventListener('submit',async e=>{
    e.preventDefault(); const name=form.elements.name.value.trim(),phone=form.elements.phone?.value.trim()||'',names=[...guests.querySelectorAll('input')].map(i=>i.value.trim()||'Unnamed guest');
    if(!name){form.elements.name.setCustomValidity('Enter your name.');form.elements.name.reportValidity();return;}
    const message=document.querySelector('#rsvp-status'),submit=document.querySelector('#rsvp-submit');
    if(settings.preview){message.textContent='Preview: RSVP validated. No message was sent.';return;}
    if(project.rsvpMode==='email'){
      if(!project.rsvpEmail){message.textContent='The host has not configured an RSVP email address.';return;}
      location.href=`mailto:${project.rsvpEmail}?subject=${encodeURIComponent(`RSVP: ${project.heading.replace(/\n/g,' ')}`)}&body=${encodeURIComponent(`Name: ${name}\nPhone: ${phone}\nParty size: ${names.length+1}\nGuests: ${names.join(', ')}`)}`;return;
    }
    if(!project.rsvpEndpoint){message.textContent='The host has not configured an RSVP endpoint.';return;}
    submit.disabled=true;message.textContent='Sending RSVP…';const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const fields=[{name:'Phone',value:phone||'Not given',inline:true},{name:'Party size',value:String(names.length+1),inline:true},{name:'Event',value:project.name||project.heading}];
      for(let i=0;i<names.length;i+=10)fields.push({name:`Guests ${i+1}–${Math.min(i+10,names.length)}`,value:names.slice(i,i+10).join('\n')});
      const response=await fetch(project.rsvpEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:project.name||'Card King RSVP',title:`RSVP: ${name}`,fields}),signal:controller.signal});
      if(!response.ok)throw new Error('delivery');dialog.close();form.reset();guests.replaceChildren();updateGuests();status(project.rsvpSuccess);celebrate(rsvpTrigger);
    }catch{message.textContent='Your RSVP was not sent. Check your connection and try again.';}finally{clearTimeout(timeout);submit.disabled=false;}
  });
  form?.elements.name.addEventListener('input',()=>form.elements.name.setCustomValidity(''));
  document.querySelectorAll('[data-ck-action]').forEach(button=>button.addEventListener('click',e=>{
    if(settings.editing)return;
    const action=button.dataset.ckAction;
    if(action==='celebrate')celebrate(button);
    if(action==='reveal'){const content=button.parentElement.querySelector('.reveal-content');if(content){content.hidden=!content.hidden;button.setAttribute('aria-expanded',String(!content.hidden));if(!content.hidden)celebrate(button);}}
    if(action==='rsvp')openRsvp(button);
    if(action==='calendar-download')downloadCalendar();
    if(action==='close-card')setCardOpen(false);
    if(action==='toggle-rain'){if(motionPaused){status('Resume animations to enable photo rain.');return;}rainActive=!rainActive;if(rainActive)seedRain();else{particles.clear();context.clearRect(0,0,innerWidth,innerHeight);}}
  }));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&cover&&isOpen&&!dialog?.open)setCardOpen(false);});
  if(settings.preview)addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='cardking:celebrate')celebrate();});
}
