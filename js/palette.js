/* Applied before styles load, so saved colors also survive a page refresh. */
(function () {
  'use strict';
  const options = [
    {id:'auto',name:'跟随页面',note:'每个空间，一点不同',colors:['#dfb893','#a9bfd1','#b7add2']},
    {id:'almond',name:'暖暖奶杏',note:'像午后落在纸上的阳光',colors:['#e8c3a4','#faf5ef','#956348']},
    {id:'mist',name:'晴空雾蓝',note:'清透、安静，留出呼吸',colors:['#b0cadb','#f1f6f9','#416b87']},
    {id:'lavender',name:'暮色浅紫',note:'把声音调轻一点',colors:['#c6b8d9','#f7f3fa','#75618f']},
    {id:'sage',name:'窗边草绿',note:'熟悉的自然与生长',colors:['#b9cbaa','#f5f7f0','#4f6e46']}
  ];
  const defaults = {garden:'sage',tarot:'lavender',bench:'mist',today:'almond',calendar:'mist',tasks:'sage',tools:'mist',notes:'almond',space:'lavender'};
  function choice() {
    try { const value=JSON.parse(localStorage.getItem('fg_appearance'));return options.some(p=>p.id===value)?value:'auto'; }
    catch { return 'auto'; }
  }
  function apply() {
    const selected=choice(), route=location.hash.slice(1).split('/')[0];
    document.documentElement.dataset.palette=selected==='auto'?(defaults[route]||'almond'):selected;
    document.documentElement.dataset.paletteChoice=selected;
    document.querySelectorAll('[data-palette-option]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.paletteOption===selected)));
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.content={almond:'#faf5ef',mist:'#f1f6f9',lavender:'#f7f3fa',sage:'#f5f7f0'}[document.documentElement.dataset.palette];
  }
  function set(value) {
    if(!options.some(p=>p.id===value))return false;
    try {localStorage.setItem('fg_appearance',JSON.stringify(value));}
    catch {if(typeof showToast==='function')showToast('配色没有保存成功，请稍后重试');return false;}
    apply();return true;
  }
  window.GardenPalette={choice,apply,set};
  apply();
  window.addEventListener('hashchange',apply);
  window.addEventListener('storage',event=>{if(!event.key||event.key==='fg_appearance')apply();});
  document.addEventListener('DOMContentLoaded',()=>{
    const dialog=document.getElementById('appearanceDialog'), list=document.getElementById('paletteOptions');
    options.forEach(option=>{
      const button=document.createElement('button');button.className='palette-option';button.dataset.paletteOption=option.id;
      const swatch=document.createElement('span');swatch.className='palette-swatch';swatch.setAttribute('aria-hidden','true');
      option.colors.forEach(color=>{const circle=document.createElement('i');circle.style.backgroundColor=color;swatch.appendChild(circle);});
      const copy=document.createElement('span'),name=document.createElement('strong'),note=document.createElement('small');
      name.textContent=option.name;note.textContent=option.note;copy.append(name,note);button.append(swatch,copy);
      button.addEventListener('click',()=>set(option.id));list.appendChild(button);
    });
    apply();
    document.getElementById('appearanceBtn').addEventListener('click',()=>dialog.showModal());
    document.getElementById('appearanceClose').addEventListener('click',()=>dialog.close());
  });
})();
