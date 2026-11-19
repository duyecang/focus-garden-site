/* Garden economy. Pure transitions: the UI commits one complete state or nothing. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BotanyCore=api;})(globalThis,function(){
 'use strict';
 const TIERS={N:{name:'日常',rate:60,need:20,tickets:1,shards:1,price:8},R:{name:'稀有',rate:28,need:30,tickets:1,shards:3,price:18},SR:{name:'珍稀',rate:10,need:45,tickets:2,shards:8,price:42},SSR:{name:'典藏',rate:2,need:60,tickets:3,shards:18,price:90}};
 const rows=[
  ['daisy','小雏菊','N','daisy','#f6e9bc','把平凡的一天，开成小小的花。'],
  ['mint','苹果薄荷','N','herb','#91ba95','揉一揉叶子，是清清爽爽的夏天。'],
  ['clover','幸运三叶草','N','clover','#8eb979','幸运，藏在认真生活的小细节里。'],
  ['fern','波士顿蕨','N','fern','#729d7a','每片新叶，都在悄悄伸展。'],
  ['cactus','星球仙人掌','N','cactus','#83b6a1','慢一点长，也有自己的形状。'],
  ['sunflower','口袋向日葵','N','daisy','#efb958','装下一小片阳光。'],
  ['tulip','杏子郁金香','R','tulip','#eca68d','捧起一杯温柔的晨光。'],
  ['lavender','暮色薰衣草','R','herb','#a99acb','把忙碌的心，交给一阵晚风。'],
  ['hydrangea','海盐绣球','R','cluster','#9ebdd4','很多小小的努力，聚成一朵花。'],
  ['rose','奶油玫瑰','R','rose','#e6b2a9','浪漫，是对日常多一点用心。'],
  ['lily','白露百合','R','lily','#eae2c7','安静，也可以是一种力量。'],
  ['bell','风铃草','R','bell','#afa4d2','风路过的时候，花也在轻轻点头。'],
  ['poppy','雾蓝罂粟','SR','rose','#86b8d0','在不确定里，长出自己的颜色。'],
  ['moonvine','月光藤','SR','vine','#c8c1e4','沿着月亮的方向，慢慢攀爬。'],
  ['lotus','琉璃莲','SR','lotus','#bdcbd3','清澈的心，也值得被照顾。'],
  ['star-lily','星屑百合','SR','lily','#cab1d5','把一点点闪光，收进每个夜晚。'],
  ['aurora','极光花树','SSR','tree','#d1b1c9','所有认真生长的日子，终会相遇。'],
  ['cosmos','星河花冠','SSR','cosmos','#acbce1','你播下的微光，长成了一片星河。']
 ];
 const CATALOG=rows.map(([id,name,rarity,shape,color,story])=>Object.freeze({...TIERS[rarity],id,name,rarity,shape,color,story}));
 const clone=v=>JSON.parse(JSON.stringify(v));
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 function ensure(ok,message){if(!ok)throw new Error(message);}
 function integer(n,max=100000000){return Number.isSafeInteger(n)&&n>=0&&n<=max;}
 function validDate(d){if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const t=new Date(d+'T12:00:00');return Number.isFinite(+t)&&dateKey(t)===d;}
 function dateKey(d){d=new Date(d);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
 function initial(){return {version:1,name:'慢慢花园',scene:'morning',energy:0,earned:0,spent:0,tickets:3,shards:0,owned:['daisy'],beds:[{plantId:'daisy',growth:0,claimed:false},null,null,null,null,null],blooms:0,bloomed:{},drawTotal:0,sinceSR:0,sinceSSR:0,ledger:{},dayCounts:{},history:[],custom:[]};}
 function plant(state,id){return CATALOG.find(p=>p.id===id)||state.custom.find(p=>p.id===id);}
 function slots(state){return 3+(state.blooms>=2?1:0)+(state.blooms>=5?1:0)+(state.blooms>=10?1:0);}
 function validate(raw){
  ensure(object(raw)&&raw.version===1,'花园存档版本无效');const s=clone(raw);
  ensure(typeof s.name==='string'&&s.name.length<=24&&['morning','sunset','moon'].includes(s.scene),'花园设置无效');
  for(const k of ['energy','earned','spent','tickets','shards','blooms','drawTotal','sinceSR','sinceSSR'])ensure(integer(s[k]),'花园数值无效：'+k);
  ensure(s.energy===s.earned-s.spent&&s.sinceSR<10&&s.sinceSSR<30,'花园账目或保底记录无效');
  ensure(Array.isArray(s.custom)&&s.custom.length<=24,'自定义植物数量无效');
  const ids=new Set(CATALOG.map(p=>p.id));
  for(const p of s.custom){
   ensure(object(p)&&/^custom-[\w-]{1,60}$/.test(p.id)&&!ids.has(p.id),'自定义植物 ID 无效');ids.add(p.id);
   ensure(typeof p.name==='string'&&p.name.trim()&&p.name.length<=24&&typeof p.story==='string'&&p.story.length<=100,'自定义植物文字无效');
   ensure(['daisy','tulip','herb','lily','tree','creature'].includes(p.shape)&&/^#[a-f\d]{6}$/i.test(p.color),'自定义植物样式无效');
   ensure(p.rarity==='CUSTOM'&&p.need===40&&p.tickets===1,'自定义植物养成规则无效');
   ensure(p.image==null||(typeof p.image==='string'&&p.image.length<=180000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.image)),'植物图片无效');
  }
  ensure(Array.isArray(s.owned)&&s.owned.length===new Set(s.owned).size&&s.owned.every(id=>ids.has(id)),'植物收藏无效');
  ensure(Array.isArray(s.beds)&&s.beds.length===6,'花圃数量无效');const active=new Set();
  s.beds.forEach((b,i)=>{if(b===null)return;const p=plant(s,b.plantId);ensure(object(b)&&p&&s.owned.includes(b.plantId)&&!active.has(b.plantId)&&i<slots(s),'花圃植物无效');active.add(b.plantId);ensure(integer(b.growth,p.need)&&typeof b.claimed==='boolean'&&(!b.claimed||b.growth===p.need),'植物生长记录无效');});
  ensure(object(s.bloomed)&&Object.entries(s.bloomed).every(([id,n])=>ids.has(id)&&integer(n)),'开花记录无效');
  ensure(Object.values(s.bloomed).reduce((n,v)=>n+v,0)===s.blooms,'开花总数无效');
  ensure(object(s.ledger)&&Object.keys(s.ledger).length<=100000&&Object.values(s.ledger).every(validDate),'能量记录无效');
  ensure(object(s.dayCounts)&&Object.entries(s.dayCounts).every(([d,c])=>validDate(d)&&object(c)&&integer(c.task,10)&&integer(c.focus,4)),'每日能量记录无效');
  ensure(Array.isArray(s.history)&&s.history.length<=60&&s.history.every(h=>object(h)&&typeof h.plantId==='string'&&ids.has(h.plantId)&&integer(h.number)&&['draw','exchange'].includes(h.kind)&&typeof h.duplicate==='boolean'&&integer(h.shards)&&typeof h.pity==='string'&&h.pity.length<30),'抽取历史无效');
  return s;
 }
 function syncEnergy(raw,data,today){
  const s=clone(raw),events=[];
  for(const t of data.tasks||[]){
   if(typeof t.id!=='string')continue;
   const repeat=t.repeat&&t.repeat!=='none';
   const dates=repeat?[...new Set(t.doneDates||[])]:t.completedAt?[dateKey(t.firstCompletedAt||t.completedAt)]:[];
   for(const date of dates)if(validDate(date)&&date<=today)events.push({id:'t:'+t.id+(repeat?':'+date:''),date,kind:'task',value:5});
  }
  for(const f of data.focus||[])if(f.completed&&typeof f.id==='string'&&validDate(f.date)&&f.date<=today&&Number.isFinite(f.durationMs)&&f.durationMs>=60000)events.push({id:'f:'+f.id,date:f.date,kind:'focus',value:10});
  events.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));let gained=0;
  for(const e of events){
   if(has(s.ledger,e.id))continue;s.ledger[e.id]=e.date;
   const c=s.dayCounts[e.date]||(s.dayCounts[e.date]={task:0,focus:0}),max=e.kind==='task'?10:4;
   if(c[e.kind]<max){c[e.kind]++;gained+=e.value;}
  }
  s.energy+=gained;s.earned+=gained;return {state:s,gained};
 }
 function sow(raw,id,index){const s=clone(raw);ensure(integer(index,5)&&index<slots(s),'这块花圃还没有开放');ensure(!s.beds[index]||s.beds[index].claimed,'先让这株植物开花并收下花礼');ensure(s.owned.includes(id),'还没有收集到这株植物');ensure(!s.beds.some((b,i)=>b&&b.plantId===id&&i!==index),'这株植物正在另一块花圃生长');s.beds[index]={plantId:id,growth:0,claimed:false};return s;}
 function water(raw,index,amount){const s=clone(raw),b=s.beds[index];ensure(b,'请先种下一株植物');const p=plant(s,b.plantId);ensure(!b.claimed&&b.growth<p.need,'已经开花了，收下花礼吧');ensure(integer(amount)&&amount>0,'养分数量无效');const n=Math.min(amount,p.need-b.growth);ensure(s.energy>=n,'养分还不够，完成任务或专注就能获得');b.growth+=n;s.energy-=n;s.spent+=n;return s;}
 function harvest(raw,index){const s=clone(raw),b=s.beds[index];ensure(b,'这块花圃还空着');const p=plant(s,b.plantId);ensure(b.growth===p.need&&!b.claimed,'这份花礼还不能领取');b.claimed=true;s.blooms++;s.bloomed[p.id]=(s.bloomed[p.id]||0)+1;s.tickets+=p.tickets;return s;}
 function clearBed(raw,index){const s=clone(raw);ensure(s.beds[index]?.claimed,'开花并领取花礼后，可以重新种植');s.beds[index]=null;return s;}
 function random(rng){const n=rng();ensure(typeof n==='number'&&n>=0&&n<1,'随机数生成失败，请重试');return n;}
 function draw(raw,count,rng){
  const s=clone(raw),results=[];ensure([1,5].includes(count),'抽取数量无效');ensure(s.tickets>=count,'抽卡券不足，养花开花就能获得');
  for(let i=0;i<count;i++){
   let tier,pity='';const n=random(rng)*100;
   if(s.sinceSSR>=29){tier='SSR';pity='30 抽典藏保底';}
   else if(s.sinceSR>=9){tier=n<2?'SSR':'SR';pity='10 抽珍稀保底';}
   else tier=n<60?'N':n<88?'R':n<98?'SR':'SSR';
   const pool=CATALOG.filter(p=>p.rarity===tier),p=pool[Math.floor(random(rng)*pool.length)],duplicate=s.owned.includes(p.id),shards=duplicate?TIERS[tier].shards:0;
   if(!duplicate)s.owned.push(p.id);s.shards+=shards;s.tickets--;s.drawTotal++;
   s.sinceSSR=tier==='SSR'?0:s.sinceSSR+1;s.sinceSR=['SR','SSR'].includes(tier)?0:s.sinceSR+1;
   const r={plantId:p.id,number:s.drawTotal,kind:'draw',duplicate,shards,pity};s.history.unshift(r);results.push(r);
  }
  s.history=s.history.slice(0,60);return {state:s,results};
 }
 function exchange(raw,id){const s=clone(raw),p=CATALOG.find(p=>p.id===id);ensure(p&&!s.owned.includes(id),'这株植物已经在你的花册里');ensure(s.shards>=p.price,'碎片还不够');s.shards-=p.price;s.owned.push(id);s.history.unshift({plantId:id,number:s.drawTotal,kind:'exchange',duplicate:false,shards:0,pity:''});s.history=s.history.slice(0,60);return s;}
 function addCustom(raw,details){const s=clone(raw);ensure(s.custom.length<24,'最多保留 24 株自定义植物');const p={id:details.id,name:details.name.trim(),story:(details.story||'在我的花园，自在生长。').trim(),rarity:'CUSTOM',shape:details.shape,color:details.color,image:details.image||null,need:40,tickets:1};s.custom.push(p);s.owned.push(p.id);return validate(s);}
 const TAROT=[['愚者','新的一步','允许自己从不完美的第一步开始。','先放慢一点，看看脚下，再出发。'],['魔术师','你已有的力量','把手边的一项资源，用在一件小事上。','减少同时展开的事情，把注意力收回来。'],['女祭司','听见自己','留一点安静，答案也许在心里。','先写下感受，不急着替它找解释。'],['女皇','温柔照料','照顾好身体，也是在滋养创造力。','为自己留一段无需产出的时间。'],['皇帝','建立秩序','给今天设一个清晰、可做到的边界。','计划是帮手，留一点灵活的空间。'],['教皇','向经验学习','找一个可靠的方法，试着走一小步。','别人的方法，可以按你的节奏调整。'],['恋人','忠于选择','选择一件与你重视的事一致的行动。','问问自己，哪些事可以暂时放下。'],['战车','向前的方向','选定一个方向，专注完成眼前这一段。','停下来校准方向，也是一种前进。'],['力量','柔软的勇气','用耐心支持自己，比催促更有力量。','今天少一点苛责，多给自己一点理解。'],['隐者','独处的光','留一段独处时间，整理真正重要的事。','需要帮助时，试着向信任的人开口。'],['命运之轮','接纳变化','把握现在能做的那一小步。','变化很多时，先照顾能掌握的日常。'],['正义','平衡与诚实','诚实看待自己的投入，也认可已做的努力。','给付出和休息，各留一个位置。'],['倒吊人','换一个角度','暂缓一步，从不同方向看看问题。','不必一直等待，试一个可逆的小行动。'],['死神','为新的留白','结束一项不再需要的安排，给新事留空间。','允许告别需要时间，不催自己翻篇。'],['节制','刚刚好的节奏','把大任务分成小块，留出恢复的间隙。','发现失衡时，从一次短休息开始。'],['恶魔','看见束缚','留意是什么分走了注意力，温柔设一道边界。','一时陷住不代表失败，找回一个小选择。'],['高塔','重新搭建','计划变化时，先保留最重要的一件事。','不用一下修好所有事情，先稳住脚下。'],['星星','微小的希望','写下一件仍然期待的小事。','暂时看不到光时，先让自己休息。'],['月亮','接纳不确定','分清事实和担心，让自己慢慢看清。','不急着下结论，等信息更明朗一点。'],['太阳','看见好事','认真庆祝一件已经完成的小事。','快乐无需表现给别人看，舒服就很好。'],['审判','重新出发','回顾一次成长，给自己一个新的起点。','过去的一次失误，不需要定义现在的你。'],['世界','收下这一程','为已经走完的一小段旅程画个圆。','收尾也需要时间，先完成一件未竟的小事。']];
 function validateTarot(raw){ensure(object(raw)&&raw.version===1&&Array.isArray(raw.records)&&raw.records.length<=365,'塔罗存档无效');const s=clone(raw),seen=new Set();s.records.forEach(r=>{ensure(object(r)&&validDate(r.date)&&!seen.has(r.date)&&integer(r.card,21)&&typeof r.reversed==='boolean'&&typeof r.note==='string'&&r.note.length<=280,'塔罗记录无效');seen.add(r.date);});return s;}
 function tarot(raw,date,rng){const s=clone(raw);ensure(validDate(date),'日期无效');ensure(!s.records.some(r=>r.date===date),'今天的牌已经抽好，明天再来看看');const r={date,card:Math.floor(random(rng)*22),reversed:random(rng)<.5,note:''};s.records.unshift(r);s.records=s.records.slice(0,365);return {state:s,record:r};}
 return {TIERS,CATALOG,TAROT,initial,validate,validateTarot,plant,slots,syncEnergy,sow,water,harvest,clearBed,draw,exchange,addCustom,tarot,dateKey,validDate};
});
