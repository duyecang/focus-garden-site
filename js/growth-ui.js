'use strict';

function growthData() {
  return {tasks, focus:focusSessions, mood:moodList, dayline:daylines};
}
const GARDEN_NAMES = ['种子静候','新芽初生','绿叶舒展','花朵绽放','花园繁盛'];
const GARDEN_THRESHOLDS = [0,20,60,120,220];
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
  const daily = GardenCore.dailyStats(data,key), g = GardenCore.garden(data,key);
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
      plant.innerHTML = plantSVG(g.stage,prefix);
      plant.dataset.stage = String(g.stage);
    }
  }
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
  renderFocusContext();
  const greeting = new Date().getHours()<12 ? '早上好' : new Date().getHours()<18 ? '下午好' : '晚上好';
  $('todayGreeting').textContent = `${greeting}，今天也慢慢来。`;
  renderMiniCalendar();
  renderGrowthHistory();
  if(typeof renderRhythm==='function') renderRhythm();
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
function openGardenDetail() {
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
