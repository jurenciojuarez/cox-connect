'use strict';
(()=>{
 const KEY='cox-connect-plan-v1',CHECKS='cox-connect-reset-v1';
 const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
 const labels={study:'Study and assignments',career:'Recruiting and career prep',connect:'Connections and downtime'};
 const suggestions={study:['Practice course problems','Review notes and key concepts','Work on the next assignment','Prepare questions for class'],career:['Research a target employer','Practice interview answers','Review applications and next steps','Work on resume and outreach'],connect:['Coffee with a classmate','Make time for a break','Catch up with your study group','Take a walk and recharge']};
 const presets={balanced:{weekday:2,weekend:3,study:8,career:4,connect:2,priority:'study'},exams:{weekday:3,weekend:4,study:16,career:2,connect:2,priority:'study'},recruiting:{weekday:2,weekend:3,study:6,career:7,connect:2,priority:'career'}};
 let storageAvailable=true;
 function load(key){try{return JSON.parse(localStorage.getItem(key));}catch(e){return null;}}
 function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){storageAvailable=false;}}
 const video=document.getElementById('campus-video'),videoToggle=document.getElementById('video-toggle');
 if(video&&videoToggle){video.muted=true;videoToggle.addEventListener('click',()=>{if(video.paused)video.play().catch(()=>{});else video.pause();});const update=()=>{videoToggle.textContent=video.paused?'Play video':'Pause video';videoToggle.setAttribute('aria-label',video.paused?'Play campus video':'Pause campus video');};video.addEventListener('play',update);video.addEventListener('pause',update);}
 const form=document.getElementById('planner-form');
 if(form){
  let settings={...presets.balanced};let sessions=[];let serial=0;let activePreset='balanced';
  const fields=['weekday','weekend','study','career','connect','priority'];
  const field=name=>form.elements.namedItem(name);
  function readSettings(){const value={};fields.forEach(k=>value[k]=k==='priority'?field(k).value:Number(field(k).value));return value;}
  function showSettings(){fields.forEach(k=>field(k).value=settings[k]);document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===activePreset)));}
  function persist(){save(KEY,{settings,sessions,activePreset});}
  function capacity(day){return day<5?settings.weekday:settings.weekend;}
  function id(){return Date.now().toString(36)+'-'+(++serial);}
  function generate(){
   sessions=[];const used=days.map(()=>0);const counts={study:0,career:0,connect:0};
   const order=[settings.priority,...Object.keys(labels).filter(k=>k!==settings.priority)];
   for(const category of order){let remaining=settings[category];while(remaining>=.5){const largestGap=Math.max(...days.map((_,i)=>capacity(i)-used[i]));if(largestGap<.5)break;const duration=Math.min(1,remaining,largestGap);const candidates=days.map((_,i)=>i).filter(i=>capacity(i)-used[i]>=duration-.001);if(!candidates.length)break;candidates.sort((a,b)=>used[a]/Math.max(capacity(a),.5)-used[b]/Math.max(capacity(b),.5)||a-b);const day=candidates[0];sessions.push({id:id(),day,category,duration,name:suggestions[category][counts[category]++%suggestions[category].length],done:false});used[day]+=duration;remaining-=duration;}}
  }
  function text(tag,value,cls){const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;}
  function hours(n){return Number(n.toFixed(1))+'h';}
  function render(){
   const grid=document.getElementById('week-grid');grid.replaceChildren();let overload=false;
   days.forEach((day,i)=>{const box=text('section','','day');box.setAttribute('aria-label',day+' plan');const header=text('div','','day-header');header.append(text('h4',day));const daySessions=sessions.filter(s=>s.day===i);const used=daySessions.reduce((n,s)=>n+s.duration,0);const over=used>capacity(i)+.001;overload||=over;const cap=text('small',hours(used)+' / '+hours(capacity(i)),over?'overload-text':'');header.append(cap);box.append(header);if(over)box.append(text('p','Over capacity by '+hours(used-capacity(i)), 'plan-status warning'));if(!daySessions.length)box.append(text('p','Room to breathe.','empty-day'));
    daySessions.forEach(s=>{const row=text('div','',`session ${s.category}-session${s.done?' done':''}`);const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=s.done;check.setAttribute('aria-label','Mark '+s.name+' on '+day+' complete');check.addEventListener('change',()=>{s.done=check.checked;persist();render();});label.append(check,text('span',s.name+' · '+hours(s.duration)));const remove=text('button','×');remove.type='button';remove.setAttribute('aria-label','Remove '+s.name+' from '+day);remove.addEventListener('click',()=>{sessions=sessions.filter(v=>v.id!==s.id);persist();render();});row.append(label,remove);box.append(row);});grid.append(box);
   });
   const available=5*settings.weekday+2*settings.weekend;const planned=sessions.reduce((n,s)=>n+s.duration,0);const wanted=settings.study+settings.career+settings.connect;const summary=document.getElementById('budget-summary');summary.replaceChildren(text('strong',hours(planned)+' planned · '+hours(available)+' available'));summary.append(text('small',sessions.filter(s=>s.done).length+' of '+sessions.length+' sessions completed'));
   const fill=document.getElementById('capacity-fill');fill.style.width=(available?Math.min(100,planned/available*100):0)+'%';fill.classList.toggle('overload',overload||wanted>available);
   const status=document.getElementById('plan-status');const missing=Object.keys(labels).map(k=>({k,h:Math.max(0,settings[k]-sessions.filter(s=>s.category===k).reduce((n,s)=>n+s.duration,0))})).filter(x=>x.h>.01);
   status.classList.toggle('warning',overload||missing.length>0);status.textContent=overload?'One or more days are over capacity. Remove a session or increase your free hours.':missing.length?'Not everything fits. Unscheduled: '+missing.map(x=>hours(x.h)+' '+labels[x.k].toLowerCase()).join('; ')+'. Reduce your goals or increase your free hours.':'Your plan fits. '+hours(Math.max(0,available-planned))+' left for flexibility.';
   if(!storageAvailable)status.textContent+=' Browser storage is unavailable. Your changes will last for this visit only.';
  }
  const cached=load(KEY);if(cached&&cached.settings&&Array.isArray(cached.sessions)&&fields.every(k=>k==='priority'?Object.hasOwn(labels,cached.settings[k]):Number.isFinite(cached.settings[k])&&cached.settings[k]>=0&&cached.settings[k]<=60)){
   settings=cached.settings;activePreset=cached.activePreset;sessions=cached.sessions.filter(s=>Number.isInteger(s.day)&&s.day>=0&&s.day<7&&Object.hasOwn(labels,s.category)&&typeof s.name==='string'&&Number.isFinite(s.duration)&&s.duration>0&&s.duration<=12);
  }else generate();
  const requested=new URLSearchParams(location.search).get('preset');if(Object.hasOwn(presets,requested)){settings={...presets[requested]};activePreset=requested;generate();}
  showSettings();render();persist();
  form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;settings=readSettings();activePreset=null;generate();showSettings();persist();render();});
  document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{activePreset=b.dataset.preset;settings={...presets[activePreset]};generate();showSettings();persist();render();}));
  document.getElementById('reset-plan').addEventListener('click',()=>{settings={...presets.balanced};activePreset='balanced';generate();showSettings();persist();render();});
  document.getElementById('print-plan').addEventListener('click',()=>window.print());
  document.getElementById('add-session').addEventListener('click',()=>{const input=document.getElementById('session-name'),durationInput=document.getElementById('session-hours');if(!input.value.trim()){input.setCustomValidity('Give this session a name.');input.reportValidity();return;}input.setCustomValidity('');if(!durationInput.reportValidity())return;const duration=Number(durationInput.value);if(!Number.isFinite(duration)||duration<.5||duration>12)return;sessions.push({id:id(),day:Number(document.getElementById('session-day').value),category:document.getElementById('session-category').value,name:input.value.trim().slice(0,70),duration,done:false});input.value='';persist();render();});
  document.getElementById('session-name').addEventListener('input',e=>e.target.setCustomValidity(''));
 }
 const checkboxes=[...document.querySelectorAll('[data-reset-check]')];
 if(checkboxes.length){const cached=load(CHECKS)||{};const update=()=>{const next={};checkboxes.forEach(e=>next[e.dataset.resetCheck]=e.checked);save(CHECKS,next);document.getElementById('checklist-progress').textContent=checkboxes.filter(e=>e.checked).length+' of '+checkboxes.length+' steps complete';};checkboxes.forEach(e=>{e.checked=Boolean(cached[e.dataset.resetCheck]);e.addEventListener('change',update);});update();}
})();

// The same functional Lab 3 Chatling bot is available on both pages.
(()=>{
 const launcher=document.createElement('button');launcher.type='button';launcher.className='chat-launcher';launcher.id='chat-launcher';launcher.setAttribute('aria-controls','lab3-chat-panel');launcher.setAttribute('aria-expanded','false');launcher.textContent='Chat with the Lab 3 bot';
 const panel=document.createElement('section');panel.id='lab3-chat-panel';panel.className='chat-panel';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','Harbor House guest assistant');
 const header=document.createElement('div');header.className='chat-heading';const intro=document.createElement('div');const title=document.createElement('h2');title.textContent='Harbor House guest assistant';const note=document.createElement('p');note.textContent='Lab 3 chatbot demo. Ask about hotel check-in, parking or breakfast.';intro.append(title,note);
 const close=document.createElement('button');close.type='button';close.className='chat-close';close.textContent='×';close.setAttribute('aria-label','Close chatbot');header.append(intro,close);panel.append(header);
 const frame=document.createElement('iframe');frame.title='Harbor House Chatling chatbot';frame.setAttribute('allow','clipboard-write');
 const fallback=document.createElement('p');fallback.className='chat-fallback';const link=document.createElement('a');link.href='https://share.chatling.ai/s/n6Lt9vg9U22vcWg';link.target='_blank';link.rel='noopener';link.textContent='Open chatbot in a separate tab';fallback.append(link);panel.append(frame,fallback);document.body.append(launcher,panel);
 function open(){if(!frame.src)frame.src=link.href;panel.hidden=false;launcher.setAttribute('aria-expanded','true');close.focus();}
 function hide(){panel.hidden=true;launcher.setAttribute('aria-expanded','false');launcher.focus();}
 launcher.addEventListener('click',()=>panel.hidden?open():hide());close.addEventListener('click',hide);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)hide();});
})();
