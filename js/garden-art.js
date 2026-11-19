(function(){
 'use strict';
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function plant(p,growth=1,uid='specimen'){
  const n=Math.max(0,Math.min(1,growth)),stage=n>=1?4:n>=.7?3:n>=.4?2:n>0?1:0,c=p.color;
  const leaf=(x,y,rot,size=1)=>`<g transform="translate(${x} ${y}) rotate(${rot}) scale(${size})"><path d="M0 0C-32-8-40-35-23-49C2-48 19-22 0 0" fill="#739d76"/><path d="M-23-47Q-9-27 0 0" fill="none" stroke="#d7dfb2" stroke-width="1.5"/></g>`;
  const flower=(x,y,r=1,kind=p.shape)=>{
   const body=kind==='tulip'?`<path d="M-22-20Q-25 19 0 21Q25 19 22-20L9-11 0-29-10-11Z" fill="${c}"/><path d="M0-26Q-6 0 0 21" fill="none" stroke="white" opacity=".3"/>`:
    kind==='bell'?`<path d="M0-23C-18-24-12-2-23 12Q0 23 23 12C12-2 18-24 0-23Z" fill="${c}"/><path d="M0 14v11" stroke="#d5b260" stroke-width="3"/>`:
    kind==='lotus'?`${[-55,-28,0,28,55].map(a=>`<path d="M0 20Q-25-8 0-39Q25-8 0 20" transform="rotate(${a})" fill="${c}" stroke="#fff" stroke-opacity=".5"/>`).join('')}<ellipse cy="18" rx="26" ry="9" fill="#819c94"/>`:
    `${Array.from({length:kind==='lily'?6:kind==='rose'?9:12},(_,i)=>`<ellipse cy="-19" rx="${kind==='lily'?11:kind==='rose'?14:7}" ry="${kind==='lily'?28:21}" fill="${c}" stroke="#fff" stroke-opacity=".25" transform="rotate(${i*(kind==='lily'?60:kind==='rose'?40:30)})"/>`).join('')}<circle r="${kind==='rose'?13:10}" fill="${kind==='rose'?'#bd938e':'#d4b663'}"/><circle r="5" fill="#f1d78c"/>`;
   return `<g transform="translate(${x} ${y}) scale(${r})">${body}</g>`;
  };
  let foliage=`<ellipse cx="110" cy="224" rx="8" ry="4" fill="#ad885f" transform="rotate(-22 110 224)"/>`;
  if(stage>0){
   const tip=stage===1?165:stage===2?115:78;
   foliage=`<path d="M110 226Q97 176 111 ${tip}" fill="none" stroke="#5d8965" stroke-width="5" stroke-linecap="round"/>${leaf(108,205,-55,.55)}${leaf(107,188,48,.56)}`;
   if(stage>=2)foliage+=leaf(108,161,-52,.75)+leaf(110,146,53,.7);
   if(stage>=3)foliage+=stage===4?flower(111,69,.8):`<path d="M110 87Q90 61 111 53Q130 65 110 87" fill="${c}"/>`;
   if(stage===4){
    if(p.shape==='tree')foliage=`<path d="M109 228V99M109 165 64 111M109 155 154 90" stroke="#937755" stroke-width="8" fill="none"/>${[[65,96],[88,64],[132,59],[162,97],[115,116]].map(([x,y])=>flower(x,y,.67,'daisy')).join('')}${leaf(91,180,-50,.6)}${leaf(118,183,50,.65)}`;
    else if(p.shape==='cactus')foliage=`<path d="M95 225V103Q110 78 125 103V225M95 170H76Q66 168 66 156V135M125 151H141V116" fill="none" stroke="${c}" stroke-width="20" stroke-linecap="round"/><path d="M110 211V103M99 130h23M99 156h23M99 187h23" stroke="#ecedcf" opacity=".6"/>${flower(108,86,.4,'daisy')}`;
    else if(['herb','fern','clover'].includes(p.shape)){
     foliage='';for(let j=0;j<5;j++){const x=70+j*20,y=70+Math.abs(j-2)*16;foliage+=`<path d="M110 228Q${x-10} 157 ${x} ${y}" fill="none" stroke="#628c63" stroke-width="3"/>`;for(let k=0;k<4;k++)foliage+=leaf(x+(110-x)*k/5,y+32+k*23,k%2?45:-55,.4+(k/20));if(p.id==='lavender')for(let k=0;k<6;k++)foliage+=`<ellipse cx="${x+(k%2?4:-4)}" cy="${y+k*7}" rx="5" ry="8" fill="${c}"/>`;if(p.shape==='clover')foliage+=`<g fill="${c}"><circle cx="${x-8}" cy="${y}" r="13"/><circle cx="${x+8}" cy="${y}" r="13"/><circle cx="${x}" cy="${y-13}" r="13"/></g>`;}
    } else if(p.shape==='cluster')foliage+=Array.from({length:16},(_,i)=>flower(110+Math.sin(i*2.4)*29,67+Math.cos(i*2.4)*24,.26,'daisy')).join('');
    else if(['vine','cosmos'].includes(p.shape))foliage+=`<path d="M108 199Q55 186 63 122M108 177Q165 141 164 100" fill="none" stroke="#70906b" stroke-width="3"/>${flower(63,111,.47,'lily')}${flower(164,88,.5,'lily')}${leaf(71,164,-60,.6)}`;
    else if(p.shape==='creature')foliage=`<ellipse cx="110" cy="195" rx="53" ry="33" fill="${c}"/><path d="M64 204 63 224M86 212 85 228M138 213 139 229M156 201 158 221" stroke="${c}" stroke-width="13" stroke-linecap="round"/><ellipse cx="110" cy="172" rx="42" ry="31" fill="${c}"/><circle cx="92" cy="175" r="5" fill="#304e46"/><circle cx="128" cy="175" r="5" fill="#304e46"/><path d="M101 189q9 7 18 0" fill="none" stroke="#446354" stroke-width="2"/>${leaf(106,160,-60,.8)}${leaf(117,160,53,.8)}${flower(110,111,.8,'lotus')}`;
   }
  }
  if(p.image&&stage===4)foliage=`<image href="${p.image}" x="36" y="32" width="148" height="193" preserveAspectRatio="xMidYMid meet"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 280" role="img" aria-label="${escape(p.name)}，${['种子','萌芽','展叶','花苞','盛放'][stage]}"><defs><linearGradient id="${uid}-pot" x2="1" y2=".2"><stop stop-color="#b88361"/><stop offset=".5" stop-color="#e4b995"/><stop offset="1" stop-color="#be8767"/></linearGradient></defs><ellipse cx="110" cy="266" rx="61" ry="9" fill="#45614b" opacity=".1"/>${foliage}<path d="M67 226 77 258Q110 270 143 258L153 226" fill="url(#${uid}-pot)"/><path d="m83 237 4 19m16-16 1 21m15-22-2 20m17-21-4 17" stroke="#ad7858" stroke-opacity=".3" stroke-width="2"/><ellipse cx="110" cy="226" rx="46" ry="10" fill="#e6b796"/><ellipse cx="110" cy="224" rx="40" ry="7" fill="#735e48"/>${stage===0?'<ellipse cx="110" cy="223" rx="7" ry="3" fill="#bb986a"/>':''}<path d="M64 226v7q46 17 92 0v-7" fill="#d9a884"/></svg>`;
 }
 function scenery(mode='morning'){
  const night=mode==='moon',sunset=mode==='sunset',sky=night?'#253f57':sunset?'#ecd4c3':'#d7e7d6',hill=night?'#45675e':sunset?'#a6b78e':'#9fbc97';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="630" fill="${sky}"/><circle cx="930" cy="134" r="56" fill="${night?'#f2e5b6':'#fff4cd'}" opacity=".85"/>${night?Array.from({length:30},(_,i)=>`<circle cx="${(i*197)%1190}" cy="${25+(i*97)%260}" r="${i%3+1}" fill="#fbefd2" opacity=".6"/>`).join(''):''}<path d="M0 345Q160 215 337 310T683 280T1200 290V630H0" fill="${hill}"/><path d="M0 387Q182 299 402 391T777 360T1200 373V630H0" fill="${night?'#355348':'#749b7b'}"/><path d="M0 457Q400 415 640 459T1200 442V630H0" fill="${night?'#2a493f':'#e1dfbf'}"/><path d="M-60 70Q74 17 128 129T175 269M126 127Q223 62 310 88" stroke="${night?'#547566':'#9fae7b'}" stroke-width="13" fill="none"/>${[20,68,115,172,231,283].map((x,i)=>`<ellipse cx="${x}" cy="${71+(i%2)*24}" rx="39" ry="13" fill="${night?'#567863':'#9eb889'}" transform="rotate(${i%2?32:-28} ${x} ${71+(i%2)*24})"/>`).join('')}<path d="M0 533H1200V630H0" fill="${night?'#566b5a':'#c3b998'}"/><path d="M0 542H1200M0 598H1200" stroke="#e9dfbb" stroke-opacity=".3" stroke-width="3"/></svg>`;
 }
 function tarot(index,reversed=false){
  const symbols=[
   '<path d="M-22 37 0-34 26 37M-13 9h29"/><circle cx="29" cy="-27" r="8"/>',
   '<path d="m-30 28 59-56M20-38v18M10-29h20M-33-26v12M-39-20h12"/>',
   '<path d="M17-37C-38-35-48 29 0 40C-20 10-11-18 17-37Z"/>',
   '<path d="M0 39Q-46 4 0-39Q46 4 0 39ZM0 39Q-59 23-38-15Q-3-8 0 39ZM0 39Q59 23 38-15Q3-8 0 39Z"/>',
   '<path d="M-40-19-23 21H24L40-19 17 0 0-33-18 0ZM-24 32h48"/>',
   '<path d="M0-26Q-22-40-39-26v61Q-21 22 0 34Q21 22 39 35v-61Q21-40 0-26ZM0-26v60"/>',
   '<path d="M0 39-34 4C-59-29-12-50 0-19C13-50 59-29 34 4Z"/>',
   '<path d="M-30 18h60v-39h-60ZM-39-30h78M-20-30v-14M20-30v-14"/><circle cx="-23" cy="30" r="9"/><circle cx="23" cy="30" r="9"/>',
   '<path d="M0 0C-60-61-60 61 0 0C60-61 60 61 0 0Z"/>',
   '<path d="M-23-29h46v56h-46ZM-32-29h64M-32 28h64M-13-41q13-18 26 0M0-15 10 3 0 18-10 3Z"/>',
   '<circle r="39"/><circle r="13"/><path d="M0-39V-13M0 13v26M-39 0h26M13 0h26M-28-28l18 18M10 10l18 18M-28 28l18-18M10-10l18-18"/>',
   '<path d="M0-40v75M-20 36h40M-39-21h78M-27-21-41 9h28ZM27-21 13 9h28Z"/>',
   '<path d="M-27-38h54M-27 38h54M-23-38Q-29-9 0 0Q29 9 23 38M23-38Q29-9 0 0Q-29 9-23 38M0 0V-12"/>',
   '<path d="M0 39C-52 3-32-37 27-39C40-6 31 23 0 39ZM0 39 21-25M5 11-17-8M13-6l15-5"/>',
   '<path d="M-40-34h30v21q-15 30-30 0ZM-25 10v13M-37 24h24M10 1h30v21q-15 30-30 0ZM25 39v-13M-23-21l49 8"/>',
   '<path d="m-6-13-7-7q-20-20-35 0t0 30l14 14q20 20 33-2M6 13l7 7q20 20 35 0t0-30L34-24Q14-44 1-22M-15 15l30-30"/>',
   '<path d="M-26 41V-18h52v59M-29-18l29-15 29 15M0-48l-9 20 16-5-8 25M-14-1v13M12-1v13M-34 41h68"/>',
   '<path d="M0-44 11-12 44-12 18 8 27 40 0 21-27 40-18 8-44-12-11-12Z"/>',
   '<path d="M14-40C-40-29-38 32 14 40C-9 18-9-18 14-40Z"/><circle cx="34" cy="-20" r="5"/><circle cx="34" cy="20" r="3"/>',
   '<circle r="23"/><path d="M0-45v11M0 34v11M-45 0h11M34 0h11M-32-32l8 8M24 24l8 8M-32 32l8-8M24-24l8-8"/>',
   '<path d="M-37-17-12-13 20-37v61L-12 1l-25 4ZM-12 4l9 30h-13L-26 4M30-27l12-7M30 13l12 7M32-7h15"/>',
   '<ellipse rx="30" ry="44"/><path d="M-28-15h56M-30 7h60M-23 29h46M0-43Q-30 0 0 44Q30 0 0-43Z"/>'
  ];
  const title=index==null?'给此刻的你':BotanyCore.TAROT[index][0];
  const motif=index==null?symbols[17]:symbols[index];
  const stars=Array.from({length:12},(_,i)=>`<circle cx="${22+(i*43)%176}" cy="${28+(i*37)%210}" r="1.4" fill="#d5bd82" opacity=".6"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 330" aria-hidden="true"><rect x="4" y="4" width="212" height="322" rx="18" fill="#33435a" stroke="#c6ac79" stroke-width="2"/><rect x="15" y="15" width="190" height="300" rx="12" fill="none" stroke="#c6ac79" stroke-opacity=".5"/>${stars}<g transform="translate(110 155) ${reversed?'rotate(180)':''}"><circle r="66" fill="none" stroke="#c9b985" stroke-dasharray="2 7"/><g fill="none" stroke="#e1cfa1" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">${motif}</g></g><path d="M48 256Q78 232 110 253Q145 232 172 256M65 297h90" fill="none" stroke="#c9b985"/><text x="110" y="58" text-anchor="middle" fill="#e2d4b4" font-family="Georgia,serif" font-size="16">${index==null?'✦':index}</text><text x="110" y="283" text-anchor="middle" fill="#e2d4b4" font-family="Microsoft YaHei,sans-serif" font-size="13" letter-spacing="3">${title}</text></svg>`;
 }
 window.GardenArt={plant,scenery,tarot,escape};
})();
