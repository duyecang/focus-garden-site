'use strict';

function growthData() {
  return {tasks, focus:focusSessions, mood:moodList, dayline:daylines};
}
const GARDEN_NAMES = ['种子静候','新芽初生','绿叶舒展','花朵绽放','花园繁盛'];
const GARDEN_THRESHOLDS = [0,20,60,120,220];
let lastGrowthEnergy = null;
let demoStage = null; // 试用展示态：仅影响花园显示，不写入任何真实数据
function plantSVG(stage, prefix = 'plant') {
  const leaf = (x,y,angle,size,color) => `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${size})"><path d="M0 0C-32-17-32-51-8-66C20-62 27-27 0 0Z" fill="${color}"/><path d="M0 0Q-6-27-8-56" stroke="#e0e7ba" stroke-opacity=".55" stroke-width="1.4"/><path d="M-3-17-16-26M-5-31 5-43" stroke="#e0e7ba" stroke-opacity=".26" stroke-width="1"/></g>`;
  const flower = (x,y,size=1) => `<g transform="translate(${x} ${y}) scale(${size})">${Array.from({length:8},(_,i)=>`<ellipse cy="-15" rx="9" ry="18" transform="rotate(${i*45})" fill="${i%2?'#e9b7a3':'#f3cbbb'}" stroke="#d89d87" stroke-width=".6"/>`).join('')}<circle r="11" fill="#b18a4c"/><circle r="8" fill="#e5c47e"/><g fill="#ae8a49"><circle cy="-4" r="1"/><circle cx="4" r="1"/><circle cx="-3" cy="3" r="1"/><circle cx="2" cy="4" r="1"/></g></g>`;
  let foliage = '<ellipse cx="140" cy="241" rx="8" ry="4" fill="#b5965c" transform="rotate(-20 140 241)"/>';
  if (stage >= 1) foliage = `<path d="M140 248Q132 211 144 ${stage>=3?64:stage===2?131:201}" stroke="#527345" stroke-width="5" stroke-linecap="round"/>${leaf(139,228,-57,.67,'#7c9e63')}${leaf(141,214,55,.66,'#91ad6e')}`;
  if (stage >= 2) foliage += `${leaf(139,191,-54,.9,'#678955')}${leaf(141,177,55,.9,'#92ad70')}${leaf(142,150,-34,.66,'#799954')}`;
  if (stage >= 3) foliage += `${leaf(143,120,48,.61,'#8eac62')}${flower(144,64)}`;
  if (stage === 4) foliage += `<path d="M139 208Q105 159 78 126M141 194Q191 171 203 122" stroke="#678651" stroke-width="3"/>${leaf(104,173,-55,.58,'#95af73')}${leaf(175,166,43,.55,'#748f50')}${flower(77,120,.68)}${flower(204,115,.76)}<path d="M214 50q8-15 15-5-6 12-15 5m0 0q-13-5-11-14 13-1 11 14" fill="#e9cf8d"/><path d="m211 45 6 10" stroke="#9a8557" stroke-width="2"/>`;
  return `<svg viewBox="0 0 280 330" role="img" aria-label="${GARDEN_NAMES[stage]}，由真实行动养成的植物"><defs><linearGradient id="${prefix}-clay"><stop stop-color="#b98159"/><stop offset=".35" stop-color="#d4a079"/><stop offset=".76" stop-color="#d8ad85"/><stop offset="1" stop-color="#b58058"/></linearGradient></defs><ellipse cx="140" cy="312" rx="63" ry="10" fill="#4f653d" opacity=".16"/>${foliage}<path d="m92 252 13 52q36 19 70 0l13-52" fill="url(#${prefix}-clay)"/><path d="m108 264 8 35m13-35 3 42m18-42-2 42m18-42-8 36" stroke="#a4714e" stroke-opacity=".22" stroke-width="2"/><ellipse cx="140" cy="251" rx="53" ry="12" fill="#dfb18b"/><ellipse cx="140" cy="247" rx="47" ry="9" fill="#7f684b"/><ellipse cx="140" cy="247" rx="40" ry="5" fill="#65553e"/><path d="M86 249v10q54 21 108 0v-10" fill="#dca982"/><path d="M94 257q45 14 92 0" stroke="#f0c6a0" stroke-opacity=".55" stroke-width="2"/></svg>`;
}
function renderMiniCalendar() {
  const host=$('miniMonth');
  if(!host) return;
  host.replaceChildren();
  const now=new Date(), year=now.getFullYear(), month=now.getMonth();
  $('miniMonthTitle').textContent=`${year} 年 ${month+1} 月`;
  $('welcomeDate').textContent=`${year} 年 ${month+1} 月 ${now.getDate()} 日 · ${WEEK_CN[now.getDay()]}`;
  const offset=(new Date(year,month,1).getDay()+6)%7, last=new Date(year,month+1,0).getDate();
  for(let i=0;i<offset;i++){const blank=document.createElement('span');blank.className='mini-blank';host.appendChild(blank);}
  for(let n=1;n<=last;n++){
    const key=`${year}-${pad2(month+1)}-${pad2(n)}`;
    const b=document.createElement('button');b.textContent=n;b.className=n===now.getDate()?'is-today':'';
    b.setAttribute('aria-label',key+(n===now.getDate()?'，今天':''));
    if(tasks.some(t=>occursOn(t,key))) b.classList.add('has-record');
    b.addEventListener('click',()=>jumpToDate(key));host.appendChild(b);
  }
}
function renderGrowth() {
  const host = $('growthSummary');
  if (!host) return;
  const data = growthData(), key = todayKey();
  const daily = GardenCore.dailyStats(data,key);
  // 试用：看下一阶段（仅展示态，不改真实能量；真实数据到达后自动回归）
  const real = GardenCore.garden(data,key);
  const g = demoStage !== null && demoStage > real.stage
    ? { ...real, stage: demoStage, energy: GARDEN_THRESHOLDS[demoStage], next: GARDEN_THRESHOLDS[demoStage + 1] ?? null }
    : real;
  if (demoStage !== null && demoStage <= real.stage) demoStage = null; // 真实成长追上后自动收回
  const list = tasks.filter(t=>occursOn(t,key));
  const done = list.filter(t=>doneOn(t,key)).length;
  const percentage = list.length ? Math.round(done/list.length*100) : 0;
  $('growthProgress').value = percentage;
  $('growthPercent').textContent = percentage+'%';
  $('growthCount').textContent = `完成 ${done} / ${list.length} 项计划`;
  $('growthFocus').textContent = `${Math.floor(daily.focusMs/60000)} 分钟`;
  $('growthDays').textContent = `${g.activeDays} 天`;
  $('growthEnergy').textContent = `今天收获 ${daily.energy} 点成长能量`;
  for (const [id,prefix] of [['gardenPlant','preview'],['gardenDetailPlant','detail']]) {
    const plant = $(id);
    if (plant.dataset.stage !== String(g.stage)) {
      const upgraded = plant.dataset.stage !== '' && plant.dataset.stage !== undefined;
      plant.innerHTML = plantSVG(g.stage,prefix);
      plant.dataset.stage = String(g.stage);
      if (upgraded) {
        plant.classList.remove('stage-grown');
        void plant.offsetWidth;
        plant.classList.add('stage-grown');
        setTimeout(()=>plant.classList.remove('stage-grown'), 1100);
      }
    }
  }
  if (lastGrowthEnergy !== null && daily.energy > lastGrowthEnergy) {
    for (const el of [document.querySelector('.garden-window'), document.querySelector('.garden-scene')]) {
      if (!el) continue;
      el.classList.remove('energy-glow');
      void el.offsetWidth;
      el.classList.add('energy-glow');
      setTimeout(()=>el.classList.remove('energy-glow'), 1300);
    }
  }
  lastGrowthEnergy = daily.energy;
  $('gardenStage').textContent = GARDEN_NAMES[g.stage];
  $('gardenLevel').textContent = `阶段 ${g.stage+1} / 5`;
  const start=GARDEN_THRESHOLDS[g.stage];
  $('gardenStageProgress').max = g.next ? g.next-start : 1;
  $('gardenStageProgress').value = g.next ? g.energy-start : 1;
  $('gardenEnergy').textContent = `累计 ${g.energy} 点 · ${g.next ? `距下一阶段 ${g.next-g.energy} 点` : '每一份努力，都留下痕迹'}`;
  $('gardenDetailEnergy').textContent = $('gardenEnergy').textContent;
  const next = g.next ? `再积累 ${g.next-g.energy} 点，就能看见${GARDEN_NAMES[g.stage+1]}。` : '花园已经繁盛。接下来的每一天，也继续留下你的足迹。';
  $('gardenNextAction').textContent = next;
  $('gardenDetailNext').textContent = next;
  $('gardenDetailStage').textContent = GARDEN_NAMES[g.stage];
  $('gardenSceneStage').textContent = `第 ${g.stage+1} 阶段 · ${GARDEN_NAMES[g.stage]}`;
  $('gardenDetailProgress').max = $('gardenStageProgress').max;
  $('gardenDetailProgress').value = $('gardenStageProgress').value;
  $('gardenTaskCount').textContent = daily.completed;
  $('gardenFocusMinutes').textContent = Math.floor(daily.focusMs/60000);
  $('gardenTodayEnergy').textContent = daily.energy;
  $('todayIntention').textContent = daylines.find(d=>d.date===key)?.text?.trim() || '不必一下子开花，慢慢来，也很好。';
  renderGardenJourney(g.stage);
  renderGardenActivity(key);
  if (typeof renderGardenStones === 'function') renderGardenStones();
  // 试用：看下一阶段（体验引导，不写入真实能量，刷新即回归真实阶段）
  const side = document.querySelector('.garden-journal');
  if (side && !$('demoStageBtn')) {
    const row = document.createElement('div');
    row.className = 'demo-stage-row';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'quiet-link'; btn.id = 'demoStageBtn';
    btn.textContent = '试用：看下一阶段';
    btn.title = '体验引导：临时预览下一阶段的花园，不改变真实数据';
    btn.addEventListener('click', () => {
      const real = GardenCore.garden(growthData(), todayKey());
      if (real.stage >= GARDEN_NAMES.length - 1) { showToast('花园已经繁盛，每一份努力都留下了痕迹'); return; }
      demoStage = real.stage + 1;
      renderGrowth();
      showToast('试用预览 · 这一阶段只是先看看，真实数据没有变');
    });
    const tag = document.createElement('small');
    tag.className = 'demo-stage-tag'; tag.textContent = '试用';
    row.append(btn, tag);
    const note = side.querySelector('.garden-gentle-note');
    note ? side.insertBefore(row, note) : side.appendChild(row);
  }
  const demoTag = $('demoStageBtn')?.parentElement?.querySelector('.demo-stage-tag');
  if (demoTag) demoTag.hidden = demoStage === null;
  renderFocusContext();
  const greeting = new Date().getHours()<12 ? '早上好' : new Date().getHours()<18 ? '下午好' : '晚上好';
  $('todayGreeting').textContent = `${greeting}，今天也慢慢来。`;
  renderMiniCalendar();
  renderGrowthHistory();
  if(typeof renderRhythm==='function') renderRhythm();
  if(window.BotanyUI) window.BotanyUI.sync();
}
function renderGardenJourney(stage) {
  const host = $('gardenJourney');
  if (!host.children.length) GARDEN_NAMES.forEach((name,index)=>{
    const item=document.createElement('div'); item.className='journey-step';
    item.innerHTML=plantSVG(index,'journey-'+index);
    const copy=document.createElement('div'), label=document.createElement('strong'), hint=document.createElement('small');
    label.textContent=name; hint.textContent=`${GARDEN_THRESHOLDS[index]} 点`;
    copy.append(label,hint); item.appendChild(copy); host.appendChild(item);
  });
  [...host.children].forEach((item,index)=>{
    item.classList.toggle('is-current',index===stage);
    item.classList.toggle('is-reached',index<=stage);
    if(index===stage)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');
  });
}
function renderGardenActivity(key) {
  const host=$('gardenActivity'); host.replaceChildren();
  const items=tasks.filter(t=>t.repeat&&t.repeat!=='none' ? t.doneDates?.includes(key) : t.completedAt&&dayKey(t.completedAt)===key)
    .map(t=>({text:t.text,label:'任务完成'}));
  focusSessions.filter(s=>s.completed&&s.date===key).forEach(s=>{
    const task=tasks.find(t=>t.id===s.taskId);
    items.push({text:task?`专注 · ${task.text}`:'一段自由专注',label:`${Math.floor(s.durationMs/60000)} 分钟`});
  });
  if(!items.length)items.push({text:'从一件小事开始，花园会记住你的每一份努力。',label:''});
  items.slice(0,5).forEach(item=>{
    const li=document.createElement('li'), text=document.createElement('span'), label=document.createElement('small');
    text.textContent=item.text; label.textContent=item.label; li.append(text,label); host.appendChild(li);
  });
  if(items.length>5){const li=document.createElement('li');li.textContent=`还有 ${items.length-5} 条行动记录，已计入今日统计。`;host.appendChild(li);}
}
function renderFocusContext() {
  const title=$('focusTaskTitle'); if(!title)return;
  const selected=tasks.find(t=>t.id===pomo.taskId), goal=goals.find(g=>g.id===selected?.goalId);
  title.textContent=selected?selected.text:'给自己一段安静的时间';
  $('focusTaskContext').textContent=goal?`正在靠近「${goal.title}」。一次只往前走一小步。`:selected?'专注这件事就好，其他的可以等一等。':'选一件想做的事，或留一段自由专注的时间。';
  const daily=GardenCore.dailyStats(growthData(),todayKey());
  $('focusTodaySummary').textContent=`今天 ${Math.floor(daily.focusMs/60000)} 分钟 · ${daily.sessions} 次`;
  const host=$('focusRecent');host.replaceChildren();
  const sessions=focusSessions.filter(s=>s.completed).slice().sort((a,b)=>(b.endedAt||0)-(a.endedAt||0)).slice(0,3);
  if(!sessions.length){const empty=document.createElement('li');empty.className='empty-focus';empty.textContent='完成第一段专注后，你的足迹就会出现在这里。';host.appendChild(empty);}
  sessions.forEach(session=>{
    const li=document.createElement('li'), minutes=document.createElement('span'), copy=document.createElement('div'), name=document.createElement('strong'), date=document.createElement('small');
    minutes.textContent=Math.floor(session.durationMs/60000)+'′';
    name.textContent=tasks.find(t=>t.id===session.taskId)?.text||'自由专注';
    date.textContent=(session.date===todayKey()?'今天':session.date)+(session.endedAt?' · '+new Date(session.endedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'');
    copy.append(name,date);li.append(minutes,copy);host.appendChild(li);
  });
}
function renderGrowthHistory() {
  const wrap = $('growthHeatmap');
  if (!wrap) return;
  wrap.replaceChildren();
  const data=growthData(), end=todayKey();
  for(let i=83;i>=0;i--) {
    const date=GardenCore.shiftDate(end,-i), s=GardenCore.dailyStats(data,date);
    const cell=document.createElement('span');
    cell.className='heat-cell level-'+(s.energy===0?0:s.energy<10?1:s.energy<25?2:3);
    cell.title=`${date}：完成 ${s.completed} 项，专注 ${Math.floor(s.focusMs/60000)} 分钟，能量 ${s.energy}`;
    cell.setAttribute('aria-label',cell.title);
    wrap.appendChild(cell);
  }
  const range=Number($('reviewRange').value);
  const start=GardenCore.shiftDate(end,1-range);
  const days=GardenCore.history(data,end).filter(d=>d.date>=start);
  const completed=days.reduce((n,d)=>n+d.completed,0), minutes=Math.floor(days.reduce((n,d)=>n+d.focusMs,0)/60000);
  $('reviewSummary').textContent=`${start} — ${end}：完成 ${completed} 项任务，投入 ${minutes} 分钟专注，留下 ${moodList.filter(m=>m.date>=start&&m.date<=end&&m.mood!=null).length} 天心情和 ${photosCache.filter(p=>p.date>=start&&p.date<=end).length} 张照片。`;
}
function openGardenDetail() { location.hash = "garden"; }
function openGardenRoom() {
  renderGrowth();
  $('gardenDialog').showModal();
}
$('heroGardenLink').addEventListener('click',openGardenDetail);
$('heroFocusLink').addEventListener('click',()=>{
  if(!pomo.running&&!pomo.sessionId) {
    if(typeof currentRhythmPlan==='function') {
      const recommendation=currentRhythmPlan();
      if(recommendation.task) {prepareRhythmFocus(recommendation.task.id,recommendation.minutes);return;}
    }
    const next=tasks.find(t=>!t.sealed&&occursOn(t,todayKey())&&!doneOn(t,todayKey()));
    pomo.taskId=next?.id||null;
    if(!saveJSON('fg_pomo',pomo))return;
  }
  renderPomo(); location.hash='tools';
});
$('editIntention').addEventListener('click',()=>{
  location.hash='notes/notes';setTimeout(()=>$('daylineInput').focus(),0);
});
$('viewGarden').addEventListener('click',openGardenDetail);
$('closeGarden').addEventListener('click',()=>$('gardenDialog').close());
$('reviewRange').addEventListener('change',renderGrowthHistory);
$('growthReviewLink').addEventListener('click',()=>{ location.hash='space'; setTimeout(()=>$('growthRecords').scrollIntoView({behavior:'smooth'}),100); });
$('gardenStartFocus').addEventListener('click',()=>{ $('gardenDialog').close(); location.hash='tools'; $('pomoBox').scrollIntoView(); });
$('gardenBackTasks').addEventListener('click',()=>{ $('gardenDialog').close(); location.hash='today';setTimeout(()=>$('todayTasks').scrollIntoView({behavior:'smooth',block:'center'}),0); });
// Existing mutations call the shared render methods; observe their resulting DOM once per frame.
let growthFrame = null;
const growthObserver = new MutationObserver(() => {
  if (growthFrame != null) return;
  growthFrame = requestAnimationFrame(()=>{ growthFrame=null; renderGrowth(); });
});
['todayTasks','moodRow','daylineInput','wallGrid'].forEach(id=>growthObserver.observe($(id),{childList:true,subtree:true}));
setTimeout(renderGrowth,0);

/* ================= 花园摆件：感恩瓶 / 时光瓶 / 静石 + 点植物柔光 ================= */
(function(){
  const glow=(el)=>{ if(!el)return; el.classList.remove('glowing'); void el.offsetWidth; el.classList.add('glowing'); };
  // 感恩瓶：与情绪空间的罐子联动（fg_jar）
  $('ornJar').addEventListener('click',()=>{
    const btn=$('ornJar'); glow(btn);
    let jar=[]; try{ jar=JSON.parse(localStorage.getItem('fg_jar'))||[]; }catch(e){}
    openOverlay((card,close)=>{
      const t=document.createElement('div'); t.className='ov-title'; t.textContent='感恩瓶 · 收着你的小确幸';
      const hint=document.createElement('p'); hint.className='leaf-dialog-hint';
      hint.textContent='每天记下的小事都自动落进瓶子里（和情绪空间的罐子是同一处）。'; 
      const list=document.createElement('div'); list.className='ov-card-list';
      const items=jar.slice(-30).reverse();
      if(!items.length){ const p=document.createElement('p'); p.className='leaf-dialog-hint'; p.textContent='瓶子里还空着。今天有什么小事值得谢谢自己吗？'; list.appendChild(p); }
      items.forEach(j=>{ const row=document.createElement('div'); row.className='ov-card-row';
        const p=document.createElement('p'); p.textContent=j.text||''; 
        const s=document.createElement('small'); s.className='note-meta'; s.textContent=typeof dayKey==='function'&&j.createdAt?dayKey(j.createdAt):'';
        row.appendChild(p); row.appendChild(s); list.appendChild(row); });
      const act=document.createElement('div'); act.className='ov-actions';
      const back=document.createElement('button'); back.className='soft-btn mini'; back.textContent='轻轻合上'; back.addEventListener('click',close);
      act.appendChild(back);
      card.appendChild(t); card.appendChild(hint); card.appendChild(list); card.appendChild(act);
    });
  });
  // 时光瓶：打开记忆卡牌册（花苞与绽放的信都在里面）
  $('ornTime').addEventListener('click',()=>{
    glow($('ornTime'));
    const link=$('budAlbumLink');
    if(link) link.click(); else showToast('时光瓶里还没有信。写一封给未来的自己吧');
  });
  // 静石：指向「先放一放」的目标区
  $('ornStone').addEventListener('click',()=>{
    glow($('ornStone'));
    const sec=document.querySelector('.garden-stones');
    if(sec&&!sec.hidden){ sec.scrollIntoView({behavior:'smooth',block:'center'}); }
    else showToast('花园里还没有静石。目标想放一放的时候，会变成石头留在这里');
  });
  // 点植物柔光提亮（点空白处的柔光涟漪由全局跟手涟漪负责）
  const plant=$('gardenDetailPlant');
  if(plant) plant.addEventListener('click',()=>{
    plant.classList.remove('plant-glow'); void plant.offsetWidth; plant.classList.add('plant-glow');
  });
})();

/* ================= 花园白噪音：程序化声景，无外部音频文件 ================= */
(function(){
  const btn=$('ornSound'); if(!btn) return;
  const KEY='fg_whitenoise';
  const TYPES=[{id:'rain',name:'细雨'},{id:'stream',name:'溪水'},{id:'wind',name:'晚风'},{id:'fire',name:'篝火'}];
  const MASTER=0.55;
  let cfg={type:'rain',vol:0.35};
  try{ cfg=Object.assign(cfg,JSON.parse(localStorage.getItem(KEY))||{}); }catch(e){}
  if(!TYPES.some(t=>t.id===cfg.type)) cfg.type='rain';
  if(typeof cfg.vol!=='number'||!isFinite(cfg.vol)) cfg.vol=0.35;
  cfg.vol=Math.min(1,Math.max(0,cfg.vol));
  const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(cfg)); }catch(e){} };

  let ctx=null,master=null,chain=[],buffer=null,playing=false,killTimer=null;

  function ensure(){
    if(!ctx){
      ctx=new (window.AudioContext||window.webkitAudioContext)();
      master=ctx.createGain(); master.gain.value=0; master.connect(ctx.destination);
    }
    if(ctx.state==='suspended') ctx.resume();
    return ctx;
  }
  function noise(){
    if(buffer&&buffer.sampleRate===ctx.sampleRate) return buffer;
    const len=Math.floor(ctx.sampleRate*3);
    buffer=ctx.createBuffer(1,len,ctx.sampleRate);
    const d=buffer.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    return buffer;
  }
  function layer(filters,gainVal){
    const src=ctx.createBufferSource(); src.buffer=noise(); src.loop=true;
    const made=[src]; let node=src;
    filters.forEach(f=>{
      const b=ctx.createBiquadFilter(); b.type=f.type; b.frequency.value=f.freq;
      if(f.q!=null) b.Q.value=f.q;
      node.connect(b); node=b; made.push(b);
    });
    const g=ctx.createGain(); g.gain.value=gainVal;
    node.connect(g); g.connect(master); made.push(g);
    return {made,gain:g};
  }
  // 缓慢起伏的 LFO：让溪水和晚风有呼吸感，而不是一条死线
  function drift(param,freq,depth,base){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine'; o.frequency.value=freq; g.gain.value=depth;
    param.value=base; o.connect(g).connect(param); o.start();
    return [o,g];
  }
  function build(){
    const parts=[];
    if(cfg.type==='rain'){
      parts.push(layer([{type:'highpass',freq:700},{type:'lowpass',freq:7500}],.16));
      parts.push(layer([{type:'lowpass',freq:420}],.10));
    }else if(cfg.type==='stream'){
      const a=layer([{type:'bandpass',freq:880,q:.8}],.20);
      a.made.push(...drift(a.gain.gain,.13,.06,.20));
      parts.push(a);
      parts.push(layer([{type:'lowpass',freq:260}],.10));
    }else if(cfg.type==='wind'){
      const a=layer([{type:'lowpass',freq:460,q:.9}],.26);
      a.made.push(...drift(a.gain.gain,.055,.10,.26));
      parts.push(a);
    }else{
      parts.push(layer([{type:'bandpass',freq:320,q:.5}],.22));
      parts.push(layer([{type:'highpass',freq:2600}],.015));
    }
    chain=parts;
  }
  function teardown(fade){
    if(killTimer){ clearTimeout(killTimer); killTimer=null; }
    const old=chain; chain=[];
    const kill=()=>old.forEach(p=>p.made.forEach(n=>{
      if(n.stop){ try{ n.stop(); }catch(e){} }
      try{ n.disconnect(); }catch(e){}
    }));
    if(!ctx) return;
    if(fade>0){
      const t=ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(Math.max(master.gain.value,.0001),t);
      master.gain.exponentialRampToValueAtTime(.0001,t+fade);
      killTimer=setTimeout(kill,fade*1000+80);
    }else kill();
  }
  function stamp(){
    btn.classList.toggle('sound-on',playing);
    btn.setAttribute('aria-pressed',playing?'true':'false');
  }
  function start(){
    try{
      ensure(); teardown(0); build();
      const t=ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(.0001,t);
      master.gain.exponentialRampToValueAtTime(Math.max(.0001,cfg.vol*MASTER),t+1.2);
      playing=true; stamp();
    }catch(e){ showToast('这个浏览器暂时放不出声音'); }
  }
  function stop(){
    if(!playing&&!chain.length) return;
    teardown(.9); playing=false; stamp();
  }
  function volume(){
    if(!ctx||!playing) return;
    const t=ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(Math.max(.0001,cfg.vol*MASTER),t,.12);
  }

  btn.addEventListener('click',()=>{
    btn.classList.remove('glowing'); void btn.offsetWidth; btn.classList.add('glowing');
    openOverlay((card,close)=>{
      const t=document.createElement('div'); t.className='ov-title'; t.textContent='花园白噪音 · 陪你安静一会儿';
      const hint=document.createElement('p'); hint.className='leaf-dialog-hint';
      hint.textContent='雨、溪水、晚风或篝火，选一种陪着你。离开花园时会自动安静下来。';
      const chips=document.createElement('div'); chips.className='wn-chips'; chips.setAttribute('role','group'); chips.setAttribute('aria-label','声音类型');
      const map={};
      TYPES.forEach(tp=>{
        const c=document.createElement('button'); c.type='button';
        c.className='wn-chip'+(cfg.type===tp.id?' active':'');
        c.setAttribute('aria-pressed',cfg.type===tp.id?'true':'false');
        c.textContent=tp.name;
        c.addEventListener('click',()=>{
          cfg.type=tp.id; save();
          Object.keys(map).forEach(k=>{ map[k].classList.toggle('active',k===tp.id); map[k].setAttribute('aria-pressed',k===tp.id?'true':'false'); });
          if(playing) start();
        });
        map[tp.id]=c; chips.appendChild(c);
      });
      const row=document.createElement('label'); row.className='wn-row';
      const lab=document.createElement('span'); lab.textContent='音量';
      const range=document.createElement('input'); range.type='range'; range.min='0'; range.max='100'; range.step='1';
      range.value=String(Math.round(cfg.vol*100)); range.setAttribute('aria-label','白噪音音量');
      const out=document.createElement('output'); out.textContent=range.value+'%';
      range.addEventListener('input',()=>{
        cfg.vol=Number(range.value)/100; save(); out.textContent=range.value+'%'; volume();
      });
      row.appendChild(lab); row.appendChild(range); row.appendChild(out);
      const act=document.createElement('div'); act.className='ov-actions';
      const play=document.createElement('button'); play.type='button'; play.className='soft-btn';
      const label=()=>{ play.textContent=playing?'先安静下来':'听听看'; };
      label();
      play.addEventListener('click',()=>{ if(playing) stop(); else start(); label(); });
      const back=document.createElement('button'); back.type='button'; back.className='quiet-link'; back.textContent='合上';
      back.addEventListener('click',close);
      act.appendChild(play); act.appendChild(back);
      card.appendChild(t); card.appendChild(hint); card.appendChild(chips); card.appendChild(row); card.appendChild(act);
    });
  });

  // 离开花园就安静，不把声音带到别处
  const gd=$('gardenDialog');
  if(gd) gd.addEventListener('close',()=>{ if(playing) stop(); });
  stamp();
})();
