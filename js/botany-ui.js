(function(){
 'use strict';
 const B=BotanyCore,A=GardenArt,$=id=>document.getElementById(id),KEY='fg_garden_v1',TKEY='fg_tarot_v1';
 let state,tarotState,selected=0,tab='grow',failure='',syncQueued=false,queue=Promise.resolve(),drawing=false,lastShared='';
 const e=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const button=(text,fn,cls='soft-btn')=>{const n=e('button',cls,text);n.type='button';n.addEventListener('click',fn);return n;};
 const rng=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
 function read(key){const raw=localStorage.getItem(key);return raw==null?(key===KEY?B.initial():{version:1,records:[]}):(key===KEY?B.validate(JSON.parse(raw)):B.validateTarot(JSON.parse(raw)));}
 function failed(error){failure=error.message||'保存失败';$('gardenError').hidden=false;$('gardenError').textContent='这次操作没有完成：'+failure+'。请先到「功能」导出备份，腾出空间或恢复有效备份后再试。';showToast(failure);}
 function reload(){try{state=read(KEY);tarotState=read(TKEY);failure='';$('gardenError').hidden=true;render();}catch(error){failed(error);}}
 function transact(change,key=KEY){
  const run=async()=>{
   const old=read(key),synced=key===KEY?B.syncEnergy(old,growthData(),todayKey()).state:old;
   const result=change(synced),next=(result&&result.state)||result;
   const checked=key===KEY?B.validate(next):B.validateTarot(next),text=JSON.stringify(checked);
   if(localStorage.getItem(key)!==text)localStorage.setItem(key,text);
   if(key===KEY)state=checked;else tarotState=checked;
   failure='';$('gardenError').hidden=true;render();return result;
  };
  const locked=()=>navigator.locks?navigator.locks.request('fg-garden-state',run):run();
  const p=queue.then(locked);queue=p.catch(()=>{});return p;
 }
 async function action(fn,key=KEY){try{return await transact(fn,key);}catch(error){failed(error);return null;}}
 function sync(){if(syncQueued)return;syncQueued=true;queueMicrotask(async()=>{syncQueued=false;try{await transact(s=>s);}catch(error){failed(error);}});}
 function rarity(p){return p.rarity==='CUSTOM'?'自定义':p.rarity+' · '+B.TIERS[p.rarity].name;}
 function badge(p){const n=e('span','plant-rarity rarity-'+p.rarity,rarity(p));return n;}
 function selectTab(name){tab=name;document.querySelectorAll('[data-garden-tab]').forEach(b=>{const on=b.dataset.gardenTab===name;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;$('gardenPane-'+b.dataset.gardenTab).hidden=!on;});}
 function render(){if(!state||!tarotState)return;renderGarden();renderTarot();}
 function renderGarden(){
  const count=state.owned.filter(id=>!id.startsWith('custom-')).length;
  $('walletEnergy').textContent=state.energy;$('walletTickets').textContent=state.tickets;$('walletShards').textContent=state.shards;$('walletCollection').textContent=`${count} / ${state.blooms}`;
  $('livingName').textContent=state.name;$('gardenScene').value=state.scene;
  $('livingGarden').dataset.scene=state.scene;$('livingLandscape').innerHTML=A.scenery(state.scene);
  const featured=state.beds.find(b=>b&&b.growth<B.plant(state,b.plantId).need)||state.beds.find(Boolean);
  if(featured){const p=B.plant(state,featured.plantId);$('gardenPlant').innerHTML=A.plant(p,featured.growth/p.need,'today-featured');$('gardenStage').textContent=p.name;$('gardenLevel').textContent=featured.claimed?'已经盛放':`${featured.growth} / ${p.need} 养分`;$('gardenStageProgress').max=p.need;$('gardenStageProgress').value=featured.growth;$('gardenNextAction').textContent=featured.claimed?'这朵花已经留下祝福，可以继续欣赏或种下新芽。':featured.growth===p.need?'花开了，去花园收下它的小小心意。':`再照料 ${p.need-featured.growth} 点养分，就能看见它盛放。`;}
  else{$('gardenPlant').innerHTML=A.plant(B.CATALOG[0],0,'today-empty');$('gardenStage').textContent='等待一颗新芽';$('gardenLevel').textContent='花圃暂时空着';$('gardenStageProgress').max=1;$('gardenStageProgress').value=0;$('gardenNextAction').textContent='去花园，种下一株喜欢的植物。';}
  $('gardenEnergy').textContent=`可用养分 ${state.energy} · ${state.blooms} 次盛放`;
  const focusPlot=document.activeElement?.dataset?.plot;
  $('gardenPlots').replaceChildren();state.beds.forEach((b,i)=>{
   const unlocked=i<B.slots(state),p=b?B.plant(state,b.plantId):null;
   const item=button('',()=>{selected=i;renderGarden();$('gardenPlots').querySelector(`[data-plot="${i}"]`)?.focus();},'garden-plot'+(selected===i?' is-selected':'')+(!unlocked?' is-locked':''));item.dataset.plot=i;item.setAttribute('aria-pressed',String(selected===i));
   item.disabled=!unlocked;item.setAttribute('aria-label',p?`${p.name}，${b.growth}/${p.need} 养分，${b.claimed?'花礼已领取':b.growth===p.need?'可以领取花礼':'生长中'}`:unlocked?'空花圃，点击种植':`累计盛放 ${[0,0,0,2,5,10][i]} 次解锁`);
   const art=e('div','plot-art');if(p)art.innerHTML=A.plant(p,b.growth/p.need,'plot-'+i);else art.innerHTML='<span class="empty-pot">'+(unlocked?'+':'⌑')+'</span>';
   item.append(art,e('strong','',p?p.name:unlocked?'种下一株':`${[0,0,0,2,5,10][i]} 次盛放解锁`));
   if(p)item.append(e('small','',b.claimed?'盛放留念':b.growth===p.need?'花礼待领取':`${b.growth} / ${p.need}`));
   $('gardenPlots').append(item);
  });
  if(focusPlot!=null)$('gardenPlots').querySelector(`[data-plot="${focusPlot}"]`)?.focus();
  renderJournal();renderCatalog();renderHistory();
  const d=state.dayCounts[todayKey()]||{task:0,focus:0};
  $('gardenDailyNote').textContent=`今天的真实行动提供了 ${d.task*5+d.focus*10} 点养分。累计获得 ${state.earned} 点，已经用 ${state.spent} 点照料植物。`;
  $('pityRare').textContent=`至多 ${10-state.sinceSR} 抽遇见 SR 或以上`;$('pityLegend').textContent=`至多 ${30-state.sinceSSR} 抽遇见 SSR`;
  $('drawOne').disabled=state.tickets<1||drawing;$('drawFive').disabled=state.tickets<5||drawing;
  if(!$('seedWindow').childElementCount){$('seedWindow').innerHTML=`<div class="seed-card seed-card-back"><span>THE GARDEN</span>${A.plant(B.CATALOG.find(p=>p.id==='lotus'),1,'shop-lotus')}<small>琉璃莲 · SR</small></div><div class="seed-card seed-card-front"><span>A NEW BEGINNING</span>${A.plant(B.CATALOG.find(p=>p.id==='aurora'),1,'shop-aurora')}<small>极光花树 · SSR</small></div>`;}
 }
 function renderJournal(){
  const host=$('plantJournal');host.replaceChildren();const plot=selected,b=state.beds[plot],p=b?B.plant(state,b.plantId):null;
  host.append(e('span','eyebrow',`PLOT ${String(selected+1).padStart(2,'0')} · GROWING NOTES`));
  if(!p){host.append(e('h2','','给这里留一点绿。'),e('p','','选一株收藏里的植物，让它从种子慢慢长大。'),button('选择植物',()=>choosePlant(selected)));return;}
  host.append(badge(p),e('h2','',p.name),e('p','plant-story',p.story));
  const thumb=e('div','journal-specimen');thumb.innerHTML=A.plant(p,b.growth/p.need,'journal');host.append(thumb);
  const progress=e('progress');progress.max=p.need;progress.value=b.growth;progress.setAttribute('aria-label',p.name+'生长进度');
  host.append(e('div','plant-progress-copy',b.claimed?'这一次的盛放，已经被记住。':b.growth===p.need?'开花了！收下它的小小心意。':`${['种子静候','新芽初生','绿叶舒展','含苞待放'][Math.min(3,Math.floor(b.growth/p.need*4))]} · ${b.growth} / ${p.need} 养分`),progress);
  if(b.claimed){host.append(e('p','journal-reward',`已收下 ${p.tickets} 张花券 · 可以留作欣赏`),button('收进花册，重新种植',async()=>{if(await action(s=>B.clearBed(s,plot)))choosePlant(plot);},'soft-btn ghost'));}
  else if(b.growth===p.need)host.append(button(`领取花礼 · ${p.tickets} 张花券`,async()=>{if(await action(s=>B.harvest(s,plot)))showToast('花开了，抽卡券已放进花园！');}));
  else {const row=e('div','plant-care-actions');const need=p.need-b.growth;
   const feed=button('照料 +5',()=>action(s=>B.water(s,plot,5)));feed.disabled=state.energy<Math.min(5,need);
   const full=button(`养至开花 · ${need}`,()=>action(s=>B.water(s,plot,need)),'soft-btn ghost');full.disabled=state.energy<need;row.append(feed,full);host.append(row,e('small','',state.energy?'每一点养分，都是你做过的努力。':'完成一项任务 +5；完成一段专注 +10。'));
  }
  host.append(button('制作植物分享卡 ↗',()=>share('plant',p.id),'quiet-link'));
 }
 const dialog=e('dialog','botany-dialog');dialog.id='botanyDialog';document.body.append(dialog);let origin=null;
 function modal(title,build,wide=false){if(dialog.open)dialog.close();origin=document.activeElement;dialog.classList.toggle('is-wide',wide);dialog.replaceChildren();const head=e('header','botany-dialog-head');head.append(e('h2','',title),button('×',()=>dialog.close(),'dialog-close'));head.lastChild.setAttribute('aria-label','关闭');dialog.append(head);const body=e('div','botany-dialog-body');build(body);dialog.append(body);dialog.showModal();}
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{if(origin?.isConnected)origin.focus();});
 function choosePlant(index){modal('给花圃选一株植物',body=>{body.append(e('p','','植物收集后可以反复种植。同一种植物同时照料一株。'));const grid=e('div','picker-grid');
  for(const id of state.owned){const p=B.plant(state,id),busy=state.beds.some((b,i)=>b?.plantId===id&&i!==index);const item=button('',async()=>{if(await action(s=>B.sow(s,id,index)))dialog.close();},'plant-pick');item.disabled=busy;item.innerHTML=A.plant(p,1,'pick-'+id);item.append(e('strong','',p.name),e('small','',busy?'正在另一块花圃':`${p.need} 养分开花`));grid.append(item);}body.append(grid);
  body.append(button('去种子小铺看看',()=>{dialog.close();selectTab('shop');location.hash='garden';},'quiet-link'));
 },true);}
 function catalogCard(p,exchange=false){
  const owned=state.owned.includes(p.id),card=e('article','specimen-card'+(!owned?' is-undiscovered':''));card.dataset.plant=p.id;
  const art=e('div','specimen-art');art.innerHTML=A.plant(p,1,(exchange?'exchange-':'collection-')+p.id);card.append(badge(p),art,e('h3','',p.name),e('p','',p.story));
  if(exchange){const b=button(owned?'已经收集':`${p.price} 碎片 · 兑换`,()=>modal('兑换 '+p.name,body=>{body.append(e('p','',`使用 ${p.price} 片星光碎片换取 ${p.name}。兑换后可反复种植。`),button('确认兑换',async()=>{if(await action(s=>B.exchange(s,p.id))){dialog.close();showToast(p.name+' 已收入花册');}}));}));b.disabled=owned||state.shards<p.price;card.append(b);}
  else {card.append(e('small','',owned?(state.bloomed[p.id]?`已盛放 ${state.bloomed[p.id]} 次`:'已收集 · 等待第一朵花'):'尚未相遇'));
   if(owned){const actions=e('div','specimen-actions');actions.append(button('种植',()=>{const i=state.beds.findIndex((b,i)=>i<B.slots(state)&&(!b||b.claimed));if(i<0){showToast('花圃正忙着生长，先照料当前植物吧');selectTab('grow');return;}selected=i;action(s=>B.sow(s,p.id,i)).then(result=>{if(result)selectTab('grow');});},'quiet-link'),button('分享 ↗',()=>share('plant',p.id),'quiet-link'));card.append(actions);}
   else card.append(button('去相遇',()=>selectTab('shop'),'quiet-link'));
  }
  return card;
 }
 function renderCatalog(){const filter=$('collectionFilter').value;const all=[...B.CATALOG,...state.custom];$('collectionCount').textContent=`系统植物 ${state.owned.filter(id=>!id.startsWith('custom-')).length} / ${B.CATALOG.length} · 自定义 ${state.custom.length} 株`;
  const shown=all.filter(p=>filter==='all'||filter==='owned'&&state.owned.includes(p.id)||p.rarity===filter);$('collectionGrid').replaceChildren(...shown.map(p=>catalogCard(p)));if(!shown.length)$('collectionGrid').append(e('p','collection-empty','这里还没有植物。可以先创建一株属于自己的。'));
  $('exchangeGrid').replaceChildren(...B.CATALOG.map(p=>catalogCard(p,true)));
 }
 function renderHistory(){const list=$('drawHistory');list.replaceChildren();if(!state.history.length)list.append(e('li','empty-history','第一封来自花园的种子信，还在等你拆开。'));
  state.history.forEach(r=>{const p=B.plant(state,r.plantId),li=e('li');li.append(e('span','history-index',r.kind==='draw'?'#'+r.number:'兑换'),badge(p),e('strong','',p.name),e('span','',r.duplicate?`重复 → +${r.shards} 碎片`:r.kind==='exchange'?'碎片兑换':'新相遇'),e('small','',r.pity));list.append(li);});
 }
 async function draw(count){if(drawing)return;drawing=true;renderGarden();const result=await action(s=>B.draw(s,count,rng));drawing=false;renderGarden();if(!result)return;
  modal(count===1?'一份新的相遇':'花园寄来的五封信',body=>{const grid=e('div','draw-results');result.results.forEach((r,i)=>{const p=B.plant(state,r.plantId),card=e('article','draw-result');card.style.setProperty('--reveal-delay',i*.09+'s');card.innerHTML=A.plant(p,1,'result-'+i);card.append(badge(p),e('h3','',p.name),e('p','',r.duplicate?`已经遇见过，变成 ${r.shards} 片星光碎片`:'一株新的植物，已经收入花册。'));if(r.pity)card.append(e('small','pity-badge',r.pity));grid.append(card);});body.append(grid,button('去花册看看',()=>{dialog.close();selectTab('collection');}));},count>1);
 }
 function rules(){modal('花园的小小约定',body=>{body.innerHTML=`<div class="garden-rule-list"><h3>从行动到盛放</h3><p>完成任务 +5 养分（每天至多 10 项）；完成一分钟及以上的完整专注 +10（每天至多 4 次）。重复勾选、刷新、导入相同记录不会再次发放。历史真实记录也会计入。</p><p>照料消耗养分，植物不会枯萎。每轮开花仅领取一次花券；留作欣赏或收进花册重新种植。N / R / SR / SSR 分别需 20 / 30 / 45 / 60 养分，赠送 1 / 1 / 2 / 3 券；自定义植物需 40 养分，赠送 1 券。</p><h3>每一次相遇，都有规则</h3><p>基础概率：N 60%、R 28%、SR 10%、SSR 2%，同级植物等概率。连续 9 抽没有 SR 或以上，第 10 抽至少 SR（SR 98%、SSR 2%）；连续 29 抽没有 SSR，第 30 抽必得 SSR。SSR 保底优先，同时重置两项计数；SR 重置 SR 计数。保底跨天保存。</p><p>重复的 N / R / SR / SSR 分别转换 1 / 3 / 8 / 18 碎片；兑换价格为 8 / 18 / 42 / 90 碎片。没有付费抽取。</p><h3>给自己的花园</h3><p>初次使用赠送小雏菊和 3 券，不赠送学习能量。最初有 3 块花圃，累计盛放 2 / 5 / 10 次逐步开放到 6 块。每种植物可反复种植，同一种同时照料一株。</p><p>植物抽取、装扮彩蛋、每日塔罗各有独立记录。自定义植物不进入系统随机卡池，也不影响保底。数据保存在当前浏览器，可通过「功能」导出完整备份。</p></div>`;},true);}
 function rename(){modal('给花园起个名字',body=>{const input=e('input');input.maxLength=24;input.value=state.name;input.setAttribute('aria-label','花园名称');body.append(input,button('保存名字',async()=>{const value=input.value.trim();if(!value){input.focus();return;}if(await action(s=>({...s,name:value})))dialog.close();}));});}
 function custom(){modal('让想象，也在花园里生长。',body=>{
  const form=e('form','custom-plant-form');form.innerHTML='<label>植物或伙伴的名字<input name="name" maxlength="24" required placeholder="例如：妙蛙花、我的云朵树"></label><label>它的小故事<textarea name="story" maxlength="100" placeholder="写一句属于它的话"></textarea></label><div class="custom-controls"><label>生长的模样<select name="shape"><option value="daisy">小花</option><option value="tulip">郁金香</option><option value="herb">草本</option><option value="lily">百合</option><option value="tree">花树</option><option value="creature">植物伙伴</option></select></label><label>喜欢的颜色<input name="color" type="color" value="#9cafbf"></label></div><label class="custom-upload">或上传一张自己的图片<input name="image" type="file" accept="image/png,image/jpeg,image/webp"><small>PNG / JPG / WebP，最多 5 MB；自动压缩，只保存在本机。</small></label><div class="custom-preview" id="customPreview"></div><p>自定义植物需要 40 养分开花，赠 1 张花券，不进入随机卡池。</p><p class="form-error" role="alert"></p>';
  let image=null,uploading=false,uploadVersion=0;
  const sample=()=>({name:form.elements.name.value||'我的植物',shape:form.elements.shape.value,color:form.elements.color.value,image});
  const preview=()=>form.querySelector('.custom-preview').innerHTML=A.plant(sample(),1,'custom-preview');preview();
  form.addEventListener('input',preview);
  form.elements.image.addEventListener('change',async()=>{const version=++uploadVersion,file=form.elements.image.files[0];uploading=!!file;submit.disabled=uploading;if(!file){image=null;preview();return;}try{const nextImage=await compressCustom(file);if(version!==uploadVersion)return;image=nextImage;preview();form.querySelector('.form-error').textContent='';}catch(error){if(version!==uploadVersion)return;image=null;form.elements.image.value='';preview();form.querySelector('.form-error').textContent=error.message;}finally{if(version===uploadVersion){uploading=false;submit.disabled=false;}}});
  const submit=e('button','soft-btn','收进我的花册');submit.type='submit';form.append(submit);
  form.addEventListener('submit',async event=>{event.preventDefault();if(uploading||submit.disabled)return;submit.disabled=true;const details={...sample(),story:form.elements.story.value,id:'custom-'+crypto.randomUUID()};const result=await action(s=>B.addCustom(s,details));if(result){dialog.close();$('collectionFilter').value='CUSTOM';selectTab('collection');showToast('新伙伴已加入花册，可以种进花园了。');}else submit.disabled=false;});body.append(form);
 });}
 async function compressCustom(file){if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('请选择 5 MB 以内的 PNG、JPG 或 WebP 图片');const url=URL.createObjectURL(file);try{const img=await loadImage(url);const scale=Math.min(1,360/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);let data=canvas.toDataURL('image/webp',.8);if(data.length>180000)data=canvas.toDataURL('image/webp',.5);if(data.length>180000)throw new Error('图片仍然太大，请换一张更简单的图片');return data;}finally{URL.revokeObjectURL(url);}}
 function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('图片无法读取，请换一张'));img.src=src;});}
 function encode(value){const bytes=new TextEncoder().encode(JSON.stringify(value));return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
 function decode(value){if(value.length>5000)throw new Error('分享内容过长');return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))));}
 function sharePlant(id){const p=B.plant(state,id);return p.rarity==='CUSTOM'?{id:'custom',name:p.name,shape:p.shape,color:p.color}:{id:p.id};}
 function payload(kind,id){return {v:1,kind,name:state.name,plants:kind==='plant'?[{...sharePlant(id),stage:1}]:state.beds.filter(Boolean).map(b=>({...sharePlant(b.plantId),stage:b.growth/B.plant(state,b.plantId).need}))};}
 function validateShare(raw){if(!raw||raw.v!==1||!['plant','garden'].includes(raw.kind)||typeof raw.name!=='string'||raw.name.length>24||!Array.isArray(raw.plants)||raw.plants.length>6||(raw.kind==='plant'&&raw.plants.length!==1))throw new Error('分享卡格式无效');return {v:1,kind:raw.kind,name:raw.name,plants:raw.plants.map(p=>{if(!p||!Number.isFinite(p.stage)||p.stage<0||p.stage>1)throw new Error('分享植物无效');if(p.id==='custom'){if(typeof p.name!=='string'||p.name.length>24||!['daisy','tulip','herb','lily','tree','creature'].includes(p.shape)||!/^#[a-f\d]{6}$/i.test(p.color))throw new Error('分享植物无效');return {id:'custom',name:p.name,shape:p.shape,color:p.color,stage:p.stage,rarity:'CUSTOM'};}const plant=B.CATALOG.find(x=>x.id===p.id);if(!plant)throw new Error('未知的分享植物');return {...plant,stage:p.stage};})};}
 function sharePreview(data){const root=e('div','share-preview');root.dataset.kind=data.kind;root.append(e('span','eyebrow','FOCUS GARDEN · A LITTLE GROWTH'),e('h3','',data.kind==='plant'?data.plants[0].name:data.name));const art=e('div','share-art');data.plants.forEach((p,i)=>{const wrap=e('div');wrap.innerHTML=A.plant(p,p.stage,'share-'+i);art.append(wrap);});root.append(art,e('p','',data.kind==='plant'?'把努力，开成喜欢的模样。':'一件小事，一片新叶。'),e('small','','慢慢来，每一天都算数。'));return root;}
 function share(kind,id){const raw=payload(kind,id),data=validateShare(raw),url=new URL(location.href);url.hash='garden/share/'+encode(raw);
  const artwork={scene:state.scene,plants:kind==='plant'?[{...B.plant(state,id),stage:1}]:state.beds.filter(Boolean).map(b=>({...B.plant(state,b.plantId),stage:b.growth/B.plant(state,b.plantId).need}))};
  modal('把花园的这一刻，分享出去。',body=>{body.append(sharePreview(data),e('p','share-privacy','分享卡只包含花园名称与植物展示，不含任务、心情、资产和个人记录。自定义图片仅出现在下载图片里，链接使用绘制的植物外形。'));
   const actions=e('div','botany-inline-actions');actions.append(button('保存分享图片',()=>savePoster(data,artwork)),button('复制分享链接',async()=>{try{await navigator.clipboard.writeText(url.href);showToast('分享链接已复制');}catch{const input=e('textarea');input.readOnly=true;input.value=url.href;body.append(input);input.focus();input.select();}},'soft-btn ghost'));body.append(actions);
  },true);
 }
 async function poster(data,artwork){const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=data.kind==='plant'?1400:960;const c=canvas.getContext('2d');c.fillStyle='#f7f4eb';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#71866a';c.font='20px sans-serif';c.textAlign='center';c.fillText('F O C U S   G A R D E N',600,80);c.fillStyle='#324d42';c.font='46px "Microsoft YaHei",sans-serif';c.fillText(data.kind==='plant'?data.plants[0].name:data.name,600,155);
  if(data.kind==='garden'){const scene=await loadImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(A.scenery(artwork?.scene||'morning')));c.drawImage(scene,50,205,1100,570);}
  for(let i=0;i<data.plants.length;i++){const p=artwork?.plants?.[i]||data.plants[i];const svg=await loadImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(A.plant(p,p.stage,'poster-'+i)));if(data.kind==='plant')c.drawImage(svg,250,240,700,890);else {const x=130+(i%3)*335,y=300+Math.floor(i/3)*190;c.drawImage(svg,x,y,235,300);}}
  c.font='27px "Microsoft YaHei",sans-serif';c.fillStyle='#536b5d';c.fillText('把努力，开成喜欢的模样。',600,canvas.height-95);c.font='19px sans-serif';c.fillText('慢慢来，每一天都算数。',600,canvas.height-51);return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
 }
 async function savePoster(data,artwork){try{const blob=await poster(data,artwork);if(!blob)throw new Error('图片生成失败');const href=URL.createObjectURL(blob),a=e('a');a.href=href;a.download='Focus-Garden-'+todayKey()+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(href),5000);showToast('分享图片已生成');}catch(error){failed(error);}}
 function openShared(){const match=location.hash.match(/^#garden\/share\/(.+)$/);if(!match){lastShared='';return;}if(lastShared===match[1])return;lastShared=match[1];try{const data=validateShare(decode(match[1]));modal('一张寄给你的花园明信片',body=>{body.append(sharePreview(data),e('p','share-privacy','这是朋友分享的花园展示，不会添加植物或修改你的个人记录。'),button('回到我的花园',()=>{dialog.close();location.hash='garden';}));},true);}catch(error){showToast('这张分享卡无法读取，请让朋友重新分享。');}}
 let noteDay=null;
 function renderTarot(){const r=tarotState.records.find(r=>r.date===todayKey()),host=$('tarotStage');host.replaceChildren();$('tarotReflection').hidden=!r;
  if(r){const data=B.TAROT[r.card],card=e('div','daily-tarot');card.innerHTML=A.tarot(r.card,r.reversed);host.append(card);const copy=e('div','tarot-reading');copy.append(e('span','tarot-date',r.date+' · '+(r.reversed?'逆位':'正位')),e('h2','',data[0]),e('h3','',data[1]),e('p','',data[r.reversed?3:2]));host.append(copy);if(noteDay!==r.date||document.activeElement!==$('tarotNote')){$('tarotNote').value=r.note;noteDay=r.date;}}
  else{host.append(e('p','tarot-invitation','深呼吸，选一张此刻想靠近的牌。'));const deck=e('div','tarot-deck');for(let i=0;i<3;i++){const b=button('',async()=>{if(await action(s=>B.tarot(s,todayKey(),rng),TKEY))showToast('今天的牌已经为你翻开。');},'tarot-choice');b.innerHTML=A.tarot(null);b.setAttribute('aria-label',`选择第 ${i+1} 张塔罗牌`);deck.append(b);}host.append(deck);}
  $('tarotHistory').replaceChildren();tarotState.records.slice(0,30).forEach(r=>{const row=e('div','tarot-history-row');row.append(e('small','',r.date),e('strong','',B.TAROT[r.card][0]),e('span','',r.reversed?'逆位':'正位'),e('p','',r.note||B.TAROT[r.card][r.reversed?3:2]));$('tarotHistory').append(row);});if(!tarotState.records.length)$('tarotHistory').append(e('p','','从今天的第一张牌开始。'));
 }
 document.querySelectorAll('[data-garden-tab]').forEach(b=>{b.addEventListener('click',()=>selectTab(b.dataset.gardenTab));b.addEventListener('keydown',event=>{const tabs=[...document.querySelectorAll('[data-garden-tab]')],i=tabs.indexOf(b);if(['ArrowRight','ArrowLeft','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?3:(i+(event.key==='ArrowRight'?1:3))%4;selectTab(tabs[next].dataset.gardenTab);tabs[next].focus();}});});
 $('drawOne').addEventListener('click',()=>draw(1));$('drawFive').addEventListener('click',()=>draw(5));$('collectionFilter').addEventListener('change',renderCatalog);
 $('gardenRules').addEventListener('click',rules);$('shopRules').addEventListener('click',rules);$('gardenRename').addEventListener('click',rename);$('gardenCustomize').addEventListener('click',custom);$('gardenShare').addEventListener('click',()=>share('garden'));
 $('gardenScene').addEventListener('change',()=>action(s=>({...s,scene:$('gardenScene').value})));$('gardenToTasks').addEventListener('click',()=>location.hash='tasks');$('gardenToFocus').addEventListener('click',()=>location.hash='tools');
 $('saveTarotNote').addEventListener('click',async()=>{const date=noteDay,value=$('tarotNote').value.trim();const result=await action(s=>{const rec=s.records.find(r=>r.date===date);if(!rec)throw new Error('请先抽取今天的牌');rec.note=value;return s;},TKEY);if(result)$('tarotSaveStatus').textContent='已保存';});
 window.addEventListener('storage',event=>{if([KEY,TKEY,null].includes(event.key))reload();});
 // Keep the previous garden scene available, while giving the new garden a clear entry.
 const oldHead=document.querySelector('.garden-room-header');if(oldHead)oldHead.append(button('进入种植花园 ↗',()=>{$('gardenDialog').close();location.hash='garden';},'soft-btn'));
  const roomButton=button('去休憩小屋坐坐 ↗',()=>openGardenRoom(),'quiet-link');roomButton.id='gardenRoom';document.querySelector('.botany-header-actions').prepend(roomButton);
 const preview=$('gardenNextAction');if(preview)preview.after(button('种植、抽卡与植物图鉴 →',()=>location.hash='garden','quiet-link botany-entry'));
 const wardrobeEntry=$('cardEntry');if(wardrobeEntry)wardrobeEntry.setAttribute('aria-label','旧版装扮彩蛋抽取');
 window.BotanyUI={sync,reload,onRoute(){if(location.hash.startsWith('#garden'))sync();openShared();if(location.hash==='#tarot')renderTarot();},flush:()=>queue,exportState:()=>read(KEY),exportTarot:()=>read(TKEY),selectTab,validateShare,poster};
 reload();sync();openShared();
})();
