'use strict';

let rhythmSelectedId=null;
let rhythmPlanKind=null;
const EFFORT_LABELS={light:'轻松上手',medium:'适中投入',deep:'需要专心'};
function currentRhythmPlan() {
  const key=todayKey(), mood=moodList.find(entry=>entry.date===key)?.mood;
  const candidates=tasks.filter(task=>!task.sealed&&occursOn(task,key)&&!doneOn(task,key));
  const plan=GardenCore.moodPlan(mood,candidates);
  if(rhythmPlanKind!==plan.kind||!plan.ids.includes(rhythmSelectedId)) rhythmSelectedId=plan.ids[0]||null;
  rhythmPlanKind=plan.kind;
  return {...plan,mood,task:candidates.find(task=>task.id===rhythmSelectedId)||null};
}
function rhythmIsDismissed() {
  try{return localStorage.getItem('fg_rhythm_dismissed')===todayKey();}catch{return false;}
}
function setRhythmDismissed(dismissed) {
  try {dismissed?localStorage.setItem('fg_rhythm_dismissed',todayKey()):localStorage.removeItem('fg_rhythm_dismissed');}
  catch {showToast('没有保存成功，请稍后再试');return;}
  renderRhythm();
}
function renderRhythm() {
  const plan=currentRhythmPlan(), {kind,task,minutes,mood}=plan;
  const dismissed=rhythmIsDismissed();
  $('rhythmCard').hidden=dismissed;$('rhythmCollapsed').hidden=!dismissed;
  $('rhythmMood').textContent=kind==='unrecorded'?'还没记录心情':`此刻 · ${MOOD_LABELS[mood]}`;
  $('rhythmTitle').textContent=kind==='gentle'?'今天，从轻一点的事开始。':kind==='steady'?'给今天，留一个舒服的节奏。':kind==='open'?'有余力的话，往前走一小步。':'先照顾今天的自己。';
  $('rhythmDescription').textContent=kind==='gentle'?'不用一下子完成很多。挑一件轻松的事，只开始五分钟也很好。':kind==='steady'?'选一件想做的事，留一小段不被打扰的时间。':kind==='open'?'可以试试需要专心的事，也随时可以换一件轻松的。':'记下此刻的感受，我们一起找一个适合今天的起点。';
  $('rhythmTaskMeta').textContent=task?`今日任务 · ${EFFORT_LABELS[task.effort]||'精力未标记'}${task.time?' · '+task.time:''}`:kind==='unrecorded'?'日程，也可以照顾心情':kind==='gentle'?'还没有标为轻松的今日任务':'今天的安排，已经告一段落';
  $('rhythmTaskName').textContent=task?task.text:kind==='unrecorded'?'从问问自己「还好吗」开始':kind==='gentle'?'把一件大事，拆成一小步。':'给自己留一点空白，也很好。';
  $('rhythmStart').textContent=task?`准备 ${minutes} 分钟专注 ↗`:kind==='unrecorded'?'去记录心情 ↗':kind==='gentle'?'写下一件轻松的小事 ＋':'添加一件想做的事 ＋';
  $('rhythmNext').hidden=plan.ids.length<2;
  $('rhythmFootnote').textContent=task?'只准备计时，按下开始才会计时。':'你来决定，按自己的节奏就好。';
  $('rhythmMoodLink').textContent=kind==='unrecorded'?'记下此刻的心情 ↗':'更新此刻的心情 ↗';
  $('spaceRhythmText').textContent=kind==='unrecorded'?'记下感受，让今天的安排更贴近你。':kind==='gentle'?(task?`今天可以轻一点，从「${task.text}」开始。`:'今天可以轻一点。把大事拆成小步，或先休息一下。'):task?`为今天留了一个起点：「${task.text}」。`:'今天的安排已经告一段落，给自己留一点空白吧。';
}
function openRhythmMood() {
  location.hash='space';
  setTimeout(()=>{$('moodRow').scrollIntoView({block:'center',behavior:'smooth'});$('moodRow').querySelector('button')?.focus({preventScroll:true});},0);
}
function prepareRhythmFocus(taskId, minutes) {
  const task=tasks.find(t=>t.id===taskId&&occursOn(t,todayKey())&&!doneOn(t,todayKey()));
  if(!task){renderRhythm();showToast('这件事已经更新，看看新的建议吧');return;}
  if(pomo.running||pomo.sessionId||pomo.pendingSave) {
    location.hash='tools';showToast('还有一段未结束的专注，先回去看看吧');return;
  }
  const next={...pomo,taskId:task.id,mode:'focus',focusMs:minutes*60000,left:minutes*60000,running:false,endTs:null,sessionId:null,sessionDuration:null};
  if(!saveJSON('fg_pomo',next))return;
  pomo=next;renderPomo();location.hash='tools';
  setTimeout(()=>$('pomoBox').scrollIntoView({block:'center',behavior:'smooth'}),0);
}
$('rhythmStart').addEventListener('click',()=>{
  const plan=currentRhythmPlan();
  if(plan.task)prepareRhythmFocus(plan.task.id,plan.minutes);
  else if(plan.kind==='unrecorded')openRhythmMood();
  else openTaskEditor({dateKey:todayKey(),effort:plan.kind==='gentle'?'light':null});
});
$('rhythmNext').addEventListener('click',()=>{
  const plan=currentRhythmPlan();rhythmSelectedId=plan.ids[(plan.ids.indexOf(rhythmSelectedId)+1)%plan.ids.length]||null;renderRhythm();
});
$('rhythmMoodLink').addEventListener('click',openRhythmMood);
$('rhythmDismiss').addEventListener('click',()=>setRhythmDismissed(true));
$('rhythmRestore').addEventListener('click',()=>setRhythmDismissed(false));
$('spaceRhythmLink').addEventListener('click',()=>{
  setRhythmDismissed(false);location.hash='today';
  setTimeout(()=>$('rhythmCard').scrollIntoView({block:'center',behavior:'smooth'}),0);
});
window.addEventListener('storage',event=>{if(!event.key||event.key==='fg_rhythm_dismissed')renderRhythm();});

let breathingTimer=null, breathingEnd=0;
function stopBreathing() {
  clearInterval(breathingTimer);breathingTimer=null;$('breathingOrbit').classList.remove('is-breathing');
}
function showBreathing() {
  stopBreathing();$('breathingPhase').textContent='准备好就开始';$('breathingRemaining').textContent='留一分钟给自己';
  $('breathingStart').textContent='开始一分钟';$('breathingStart').disabled=false;$('breathingDialog').showModal();
}
function tickBreathing() {
  const remaining=Math.max(0,Math.ceil((breathingEnd-Date.now())/1000));
  if(!remaining) {
    stopBreathing();$('breathingPhase').textContent='慢慢来，就很好';$('breathingRemaining').textContent='这一分钟，留给了自己';
    $('breathingStart').textContent='再休息一分钟';$('breathingStart').disabled=false;return;
  }
  $('breathingPhase').textContent=((60-remaining)%10)<4?'轻轻吸气':'慢慢呼气';$('breathingRemaining').textContent=`还有 ${remaining} 秒`;
}
[$('rhythmBreathe'),$('spaceBreathe')].forEach(button=>button.addEventListener('click',showBreathing));
$('breathingStart').addEventListener('click',()=>{
  breathingEnd=Date.now()+60000;$('breathingStart').disabled=true;$('breathingOrbit').classList.add('is-breathing');
  tickBreathing();breathingTimer=setInterval(tickBreathing,250);
});
[$('breathingClose'),$('breathingFinish')].forEach(button=>button.addEventListener('click',()=>$('breathingDialog').close()));
$('breathingDialog').addEventListener('close',stopBreathing);
renderRhythm();
