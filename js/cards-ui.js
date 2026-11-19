'use strict';
/* 抽卡休闲彩蛋（Demo）：机会获取 fg_cards_meta / 卡牌 fg_cards / 装扮小屋
   纯装扮向，无效率加成、无签到打卡；稀有度：普通/臻选/限定 */
(function () {
  const $ = (id) => document.getElementById(id);

  /* ================= 数据层 ================= */
  const CARD_CHANCES_PER_DAY = 3;
  const escapeCardText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function loadMeta() {
    try {
      const v = JSON.parse(localStorage.getItem('fg_cards_meta'));
      if (v && typeof v === 'object') {
        return {
          chances: Number(v.chances) || 0,
          energy: Number(v.energy) || 0,
          earnedByDate: (v.earnedByDate && typeof v.earnedByDate === 'object') ? v.earnedByDate : {},
          equipped: (v.equipped && typeof v.equipped === 'object') ? v.equipped : {},
          drawBg: (v.drawBg && typeof v.drawBg === 'object')
            ? { mode: ['default', 'fixed', 'random'].includes(v.drawBg.mode) ? v.drawBg.mode : 'default',
                pool: Array.isArray(v.drawBg.pool) ? v.drawBg.pool.filter(s => typeof s === 'string') : [] }
            : { mode: 'default', pool: [] }
        };
      }
    } catch (e) { /* 首次使用 */ }
    return { chances: 0, energy: 0, earnedByDate: {}, equipped: {}, drawBg: { mode: 'default', pool: [] } };
  }
  let meta = loadMeta();
  let cards = [];
  try {
    const v = JSON.parse(localStorage.getItem('fg_cards'));
    if (v && Array.isArray(v.items)) cards = v.items.filter(c => c && c.id && c.assetId);
  } catch (e) { /* 首次使用 */ }
  let metaDirty = false, cardsDirty = false;
  function flush() {
    if (metaDirty) { try { localStorage.setItem('fg_cards_meta', JSON.stringify(meta)); } catch (e) { /* 保留内存态 */ } metaDirty = false; }
    if (cardsDirty) { try { localStorage.setItem('fg_cards', JSON.stringify({ items: cards })); } catch (e) { /* 保留内存态 */ } cardsDirty = false; }
  }
  function persist() { metaDirty = cardsDirty = true; flush(); }

  /* ================= 奖励池（全部装扮向） =================
     assetId → 渲染函数；重复卡自动转微光能量 */
  const ENERGY_ON_DUP = { common: 2, fine: 4, season: 8 };
  const RARITY_LABEL = { common: '普通', fine: '臻选', season: '限定' };
  const POOL = [
    { assetId: 'flower-rose', type: 'decor', rarity: 'common', name: '奶杏小花', desc: '一株柔和的小花，轻轻开在植物旁。' },
    { assetId: 'flower-tulip', type: 'decor', rarity: 'common', name: '安静郁金香', desc: '两瓣慢慢舒展的花。' },
    { assetId: 'grass-tuft', type: 'decor', rarity: 'common', name: '软软草丛', desc: '一小丛软草，垫在花盆边。' },
    { assetId: 'stone-pair', type: 'decor', rarity: 'common', name: '鹅卵小石', desc: '两颗圆圆的小石头。' },
    { assetId: 'mushroom', type: 'decor', rarity: 'fine', name: '蘑菇小摆件', desc: '一把低饱和的小伞，站在角落。' },
    { assetId: 'lantern', type: 'decor', rarity: 'fine', name: '纸灯笼', desc: '溪流边的一盏小灯，柔柔地亮。' },
    { assetId: 'stream-leaf-raft', type: 'decor', rarity: 'fine', name: '溪流小叶舟', desc: '一片叶子折的小舟，顺水慢慢漂。' },
    { assetId: 'pet-ribbon', type: 'pet', rarity: 'common', name: '小围巾', desc: '给桌宠围一条浅色小围巾。' },
    { assetId: 'pet-bow', type: 'pet', rarity: 'fine', name: '蝴蝶结', desc: '戴在桌宠头顶的小蝴蝶结。' },
    { assetId: 'pet-dew', type: 'pet', rarity: 'common', name: '晨露材料', desc: '一滴露水，装扮小屋的常用材料。' },
    { assetId: 'pet-crystal', type: 'pet', rarity: 'fine', name: '微光晶体', desc: '会微微发亮的晶体材料。' },
    { assetId: 'filter-warm', type: 'filter', rarity: 'season', name: '午后柔光', desc: '给花园铺一层温暖的午后光。' },
    { assetId: 'filter-morning', type: 'filter', rarity: 'season', name: '清晨薄雾', desc: '淡淡的晨雾色，花园更轻一点。' },
    { assetId: 'wallpaper-dawn', type: 'filter', rarity: 'season', name: '黎明天色', desc: '静态的黎明色壁纸，安安静静。' }
  ];
  function ownedCount(assetId) { return cards.filter(c => c.assetId === assetId).length; }
  function drawOne() {
    const card = POOL[Math.floor(Math.random() * POOL.length)];
    const dup = ownedCount(card.assetId) > 0;
    const rec = { id: uid('cd'), type: card.type, rarity: card.rarity, name: card.name, assetId: card.assetId, obtainedAt: Date.now() };
    if (dup) {
      meta.energy += ENERGY_ON_DUP[card.rarity] || 2;
      metaDirty = true;
      cards.push(rec);
      cardsDirty = true;
      flush();
      return { card, dup, gainedEnergy: ENERGY_ON_DUP[card.rarity] || 2 };
    }
    cards.push(rec);
    cardsDirty = true;
    flush();
    return { card, dup: false, gainedEnergy: 0 };
  }

  /* ================= 机会获取（正向温和，每日上限 3 次，可累积） ================= */
  function earnChance(source) {
    if (!window.GardenPrefs.get().cards) return;
    const today = todayKey();
    const earned = meta.earnedByDate[today] || 0;
    if (earned >= CARD_CHANCES_PER_DAY) return; // 事件照常发生，机会不再累加，不打扰
    meta.earnedByDate[today] = earned + 1;
    meta.chances += 1;
    metaDirty = true;
    flush();
    renderCardEntry();
  }
  window.GardenCards = { earnChance, getMeta: () => meta, ownedCount, hasChance: () => meta.chances > 0,
    ownedAssets: () => [...new Set(cards.map(c => c.assetId))], assetSVG: (id) => assetSVG(id) };

  /* ================= SVG 资产（低饱和，贴主题变量） ================= */
  function assetSVG(assetId) {
    switch (assetId) {
      case 'flower-rose': return `<svg viewBox="0 0 40 40"><path d="M20 36V20" stroke="var(--accent)" stroke-width="1.6" opacity=".6"/><circle cx="20" cy="14" r="6.5" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity=".35"/><circle cx="20" cy="14" r="3" fill="var(--surface)"/></svg>`;
      case 'flower-tulip': return `<svg viewBox="0 0 40 40"><path d="M20 36V18" stroke="var(--accent)" stroke-width="1.6" opacity=".6"/><path d="M14 18c0-7 3-10 6-12 3 2 6 5 6 12-2 3-10 3-12 0Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity=".35"/></svg>`;
      case 'grass-tuft': return `<svg viewBox="0 0 40 40"><path d="M12 34c1-8-2-12-4-14M20 34c0-10 0-16-1-20M28 34c-1-8 2-12 4-14" stroke="var(--accent)" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/></svg>`;
      case 'stone-pair': return `<svg viewBox="0 0 40 40"><ellipse cx="15" cy="30" rx="8" ry="5.5" fill="var(--bg-sub)" stroke="var(--line)"/><ellipse cx="27" cy="31" rx="6" ry="4.4" fill="var(--tint)" stroke="var(--line)"/></svg>`;
      case 'mushroom': return `<svg viewBox="0 0 40 40"><rect x="17" y="22" width="6" height="10" rx="3" fill="var(--surface)" stroke="var(--line)"/><path d="M8 22c0-8 5-13 12-13s12 5 12 13Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity=".3"/><circle cx="15" cy="17" r="1.6" fill="var(--surface)"/><circle cx="24" cy="15" r="1.4" fill="var(--surface)"/></svg>`;
      case 'lantern': return `<svg viewBox="0 0 40 40"><path d="M20 4v4" stroke="var(--line)"/><rect x="13" y="10" width="14" height="18" rx="6" fill="var(--warm)" opacity=".55" stroke="var(--line)"/><rect x="16" y="15" width="8" height="8" rx="3" fill="var(--surface)" opacity=".8"/><path d="M17 28v6M23 28v6" stroke="var(--line)"/></svg>`;
      case 'stream-leaf-raft': return `<svg viewBox="0 0 40 40"><path d="M8 26c6-3 18-3 24 0-6 4-18 4-24 0Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity=".3"/><path d="M20 24c2-6 5-9 8-11" stroke="var(--accent)" stroke-width="1.4" fill="none" opacity=".6"/></svg>`;
      case 'pet-ribbon': return `<svg viewBox="0 0 40 40"><path d="M10 24c4-6 16-6 20 0" stroke="var(--accent)" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".8"/></svg>`;
      case 'pet-bow': return `<svg viewBox="0 0 40 40"><path d="M20 20 12 14v10Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity=".4"/><path d="M20 20 28 14v10Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity=".4"/><circle cx="20" cy="20" r="2.6" fill="var(--accent)"/></svg>`;
      case 'pet-dew': return `<svg viewBox="0 0 40 40"><path d="M20 8c4 7 7 11 7 15a7 7 0 0 1-14 0c0-4 3-8 7-15Z" fill="var(--accent-soft)" opacity=".8"/><circle cx="17.5" cy="22" r="2" fill="var(--surface)"/></svg>`;
      case 'pet-crystal': return `<svg viewBox="0 0 40 40"><path d="M14 32 10 18l10-8 10 8-4 14Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity=".4"/><path d="M20 10v22M14 18l12 0" stroke="var(--surface)" opacity=".7"/></svg>`;
      case 'filter-warm': return `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="12" fill="var(--warm)" opacity=".35"/><circle cx="20" cy="20" r="7" fill="var(--surface)" opacity=".5"/></svg>`;
      case 'filter-morning': return `<svg viewBox="0 0 40 40"><rect x="8" y="14" width="24" height="4" rx="2" fill="var(--surface)" opacity=".8"/><rect x="10" y="21" width="20" height="4" rx="2" fill="var(--surface)" opacity=".6"/><rect x="12" y="28" width="16" height="3" rx="1.5" fill="var(--surface)" opacity=".4"/></svg>`;
      case 'wallpaper-dawn': return `<svg viewBox="0 0 40 40"><rect x="7" y="10" width="26" height="22" rx="4" fill="var(--bg-sub)" stroke="var(--line)"/><circle cx="20" cy="24" r="6" fill="var(--warm)" opacity=".5"/><path d="M7 28h26" stroke="var(--accent-soft)" stroke-width="2"/></svg>`;
      default: return `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="8" fill="var(--tint)" stroke="var(--line)"/></svg>`;
    }
  }
  function cardSVG(rarity) {
    return `<svg viewBox="0 0 84 112" class="draw-card-svg" aria-hidden="true"><rect class="draw-card-face" x="2" y="2" width="80" height="108" rx="10" stroke-width="1.5"/><rect class="draw-card-aura" x="2" y="2" width="80" height="108" rx="10"/><path d="M42 30 30 44h8v14h8V44h8Z" opacity=".35"/></svg>`;
  }

  /* ================= 入口（花园 dialog 角落） ================= */
  function renderCardEntry() {
    const el = $('cardEntry');
    if (!el) return;
    const on = window.GardenPrefs.get().cards;
    el.hidden = !on;
    if (!on) return;
    const n = meta.chances;
    el.textContent = n > 0 ? `装扮彩蛋 · 剩 ${n} 次` : '装扮彩蛋 · 完成小事后收获机会';
  }
  /* 抽卡动画（0.9s 翻转；极简模式直接出结果） */
  let drawing = false;
  function openDraw() {
    if (drawing) return;
    if (!window.GardenPrefs.get().cards) return;
    if (meta.chances <= 0) {
      showToast('还剩 0 次机会。做一件小事、记一段专注，机会就会轻轻涨上来');
      return;
    }
    meta.chances -= 1;
    metaDirty = true;
    const result = drawOne();
    flush();
    if (window.GardenPrefs.get().minimal) { showDrawResult(result, true); renderCardEntry(); return; }
    drawing = true;
    // 花园是原生顶层 dialog，普通 div 遮罩会被压在下面；用嵌套 dialog 才能浮在花园之上
    const dlg = document.createElement('dialog');
    dlg.className = 'draw-dialog';
    const stage = document.createElement('div');
    stage.className = 'draw-stage';
    const bg = drawBgPick();
    if (bg) stage.style.background = `center / cover no-repeat url(${bg})`;
    const flip = document.createElement('div');
    flip.className = 'draw-flip';
    flip.innerHTML = `<div class="draw-card-front">${cardSVG()}</div><div class="draw-card-back"><span class="draw-asset">${assetSVG(result.card.assetId)}</span><strong>${result.card.name}</strong><small class="rarity-${result.card.rarity}">${RARITY_LABEL[result.card.rarity]}</small><p>${result.dup ? `已有这张了，换成了 ${result.gainedEnergy} 点微光能量` : result.card.desc}</p></div>`;
    stage.appendChild(flip);
    dlg.appendChild(stage);
    document.body.appendChild(dlg);
    dlg.showModal();
    requestAnimationFrame(() => flip.classList.add('go'));
    setTimeout(() => { if (dlg.open) dlg.close(); dlg.remove(); }, 2600);
    setTimeout(() => { drawing = false; renderCardEntry(); renderDrawBadge(); }, 950);
  }
  function showDrawResult(result, instant) {
    showToast(instant ? `抽到「${result.card.name}」· ${RARITY_LABEL[result.card.rarity]}` : '');
  }
  function renderDrawBadge() { renderCardEntry(); }

  /* ================= 装扮小屋（仓库） ================= */
  function equipped() { return meta.equipped || {}; }
  function applyEquip() {
    const eq = equipped();
    const scene = document.querySelector('.garden-scene');
    if (scene) { scene.classList.remove('filter-warm', 'filter-morning', 'wallpaper-dawn'); if (eq.filter) scene.classList.add(eq.filter); }
    const pet = $('petBody');
    if (pet) {
      pet.querySelectorAll('.pet-accessory').forEach(a => a.remove());
      if (eq.pet) {
        const acc = document.createElement('span');
        acc.className = 'pet-accessory';
        acc.innerHTML = eq.pet === 'pet-bow'
          ? `<svg viewBox="0 0 40 40"><path d="M20 12 10 5v12Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity=".5"/><path d="M20 12 30 5v12Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity=".5"/><circle cx="20" cy="11" r="2.4" fill="var(--accent)"/></svg>`
          : `<svg viewBox="0 0 40 40"><path d="M9 26c5-5 17-5 22 0" stroke="var(--accent)" stroke-width="3.6" fill="none" stroke-linecap="round" opacity=".85"/></svg>`;
        pet.appendChild(acc);
      }
    }
  }
  function equip(assetId) {
    if (!assetId) { delete meta.equipped.filter; }
    else {
      const card = POOL.find(p => p.assetId === assetId);
      if (!card) return;
      if (card.type === 'filter') { meta.equipped.filter = meta.equipped.filter === assetId ? null : assetId; if (!meta.equipped.filter) delete meta.equipped.filter; }
      else if (card.type === 'pet') { meta.equipped.pet = meta.equipped.pet === assetId ? null : assetId; if (!meta.equipped.pet) delete meta.equipped.pet; }
    }
    metaDirty = true;
    flush();
    applyEquip();
    renderWardrobe();
  }
  function decorOnPlant(assetId) {
    const plant = $('gardenDetailPlant');
    if (!plant) return;
    plant.querySelectorAll('.plant-decor').forEach(d => d.remove());
    if (!assetId) return;
    const wrap = document.createElement('span');
    wrap.className = 'plant-decor';
    wrap.innerHTML = assetSVG(assetId);
    plant.appendChild(wrap);
  }
  function renderWardrobe() {
    const box = $('wardrobeList');
    if (!box) return;
    box.replaceChildren();
    const eq = equipped();
    const kinds = [
      { label: '花园装饰（穿戴到植物旁）', type: 'decor' },
      { label: '桌宠配饰与材料', type: 'pet' },
      { label: '花园柔光与壁纸（消耗能量）', type: 'filter' }
    ];
    let any = false;
    for (const kind of kinds) {
      const owned = cards.filter(c => c.type === kind.type);
      if (!owned.length) continue;
      any = true;
      const h = document.createElement('p');
      h.className = 'wardrobe-kind';
      h.textContent = kind.label;
      box.appendChild(h);
      const grid = document.createElement('div');
      grid.className = 'wardrobe-grid';
      const seen = new Set();
      for (const c of owned) {
        if (seen.has(c.assetId)) continue;
        seen.add(c.assetId);
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'wardrobe-item' + (eq.filter === c.assetId || eq.pet === c.assetId ? ' equipped' : '');
        item.innerHTML = `<span class="wardrobe-thumb">${assetSVG(c.assetId)}</span><strong>${escapeCardText(c.name)}</strong><small>${RARITY_LABEL[c.rarity]}${kind.type === 'filter' ? (eq.filter === c.assetId ? ' · 使用中' : ' · 需 8 能量') : (eq.pet === c.assetId ? ' · 穿戴中' : '')}</small>`;
        item.addEventListener('click', () => {
          if (kind.type === 'filter' && eq.filter !== c.assetId && meta.energy < 8) {
            showToast('微光能量还差一点。抽到重复的卡会轻轻补上'); return;
          }
          if (kind.type === 'filter' && eq.filter !== c.assetId) meta.energy -= 8;
          if (kind.type === 'decor') decorOnPlant(eq.plant === c.assetId ? null : c.assetId), meta.equipped.plant = eq.plant === c.assetId ? null : c.assetId, metaDirty = true, flush();
          equip(c.assetId);
        });
        grid.appendChild(item);
      }
      box.appendChild(grid);
    }
    if (!any) {
      const p = document.createElement('p');
      p.className = 'leaf-dialog-hint';
      p.textContent = '仓库还空着。抽到的卡都会收在这里，重复的卡会变成微光能量。';
      box.appendChild(p);
    }
    const energy = $('wardrobeEnergy');
    if (energy) energy.textContent = `微光能量 · ${meta.energy}`;
  }

  /* ================= 弹窗 ================= */
  function openWardrobe() {
    renderWardrobe();
    renderDrawBg();
    $('wardrobeDialog').showModal();
  }

  /* ================= 抽卡背景：默认柔色 / 上传图片池（固定 / 随机） ================= */
  function shrinkBgImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 900;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const cv = document.createElement('canvas');
          cv.width = Math.round(img.width * scale);
          cv.height = Math.round(img.height * scale);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          resolve(cv.toDataURL('image/jpeg', .82));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function drawBgPick() {
    const bg = meta.drawBg;
    if (!bg || !bg.pool.length || bg.mode === 'default') return null;
    if (bg.mode === 'random') return bg.pool[Math.floor(Math.random() * bg.pool.length)];
    return bg.pool[0];
  }
  function renderDrawBg() {
    const modeBtn = $('drawBgMode'), pool = $('drawBgPool');
    if (!modeBtn || !pool) return;
    const bg = meta.drawBg;
    modeBtn.textContent = `模式：${bg.mode === 'default' ? '默认柔色' : bg.mode === 'fixed' ? '固定一张' : '随机切换'}`;
    pool.replaceChildren();
    bg.pool.forEach((src, i) => {
      const wrap = document.createElement('span');
      wrap.className = 'draw-bg-thumb' + (bg.mode === 'fixed' && i === 0 ? ' chosen' : '');
      const img = document.createElement('img');
      img.src = src; img.alt = `背景图 ${i + 1}`; img.draggable = false;
      wrap.appendChild(img);
      wrap.title = bg.mode === 'fixed' ? '固定模式下使用第一张' : '已加入背景池';
      pool.appendChild(wrap);
    });
  }
  function initDrawBgDom() {
    const up = $('drawBgUpload'), file = $('drawBgFile'), mode = $('drawBgMode'), clear = $('drawBgClear');
    if (!up) return;
    up.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const files = [...file.files];
      file.value = '';
      for (const f of files) {
        try {
          const data = await shrinkBgImage(f);
          meta.drawBg.pool.push(data);
          if (meta.drawBg.pool.length > 6) meta.drawBg.pool.shift();
        } catch (e) { showToast('这张图放不进来，换一张试试'); }
      }
      if (files.length && meta.drawBg.mode === 'default' && meta.drawBg.pool.length) {
        meta.drawBg.mode = 'fixed';
        showToast('背景图加好了。抽卡时会用上（可在下方换固定或随机）');
      } else if (files.length) showToast('背景图加好了');
      metaDirty = true; flush();
      renderDrawBg();
    });
    mode.addEventListener('click', () => {
      if (!meta.drawBg.pool.length) { showToast('先加几张图，再选固定或随机'); return; }
      meta.drawBg.mode = meta.drawBg.mode === 'fixed' ? 'random' : meta.drawBg.mode === 'random' ? 'fixed' : 'fixed';
      metaDirty = true; flush();
      renderDrawBg();
      showToast(meta.drawBg.mode === 'fixed' ? '固定使用第一张背景' : '每次抽卡随机换一张背景');
    });
    clear.addEventListener('click', () => {
      meta.drawBg.pool = [];
      meta.drawBg.mode = 'default';
      metaDirty = true; flush();
      renderDrawBg();
      showToast('背景池清空了，回到默认柔色');
    });
  }

  function initDom() {
    // 花园 dialog：抽卡入口 + 装扮小屋入口（不抢主视觉）
    const actions = document.querySelector('.garden-actions');
    if (actions && !$('cardEntry')) {
      const cardBtn = document.createElement('button');
      cardBtn.type = 'button'; cardBtn.className = 'quiet-link card-entry'; cardBtn.id = 'cardEntry';
      cardBtn.addEventListener('click', openDraw);
      actions.appendChild(cardBtn);
      const wBtn = document.createElement('button');
      wBtn.type = 'button'; wBtn.className = 'quiet-link wardrobe-link'; wBtn.id = 'wardrobeLink'; wBtn.textContent = '装扮小屋 →';
      wBtn.addEventListener('click', openWardrobe);
      actions.appendChild(wBtn);
    }
    const wClose = $('wardrobeClose');
    if (wClose) wClose.addEventListener('click', () => { const d = $('wardrobeDialog'); if (d.open) d.close(); });
    initDrawBgDom();
    renderCardEntry();
    applyEquip();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDom);
  else initDom();

  document.addEventListener('fg-prefs', () => {
    renderCardEntry();
    if (!window.GardenPrefs.get().cards) {
      // 关闭抽卡：入口隐藏、机会冻结（不产出），已有卡牌保留
      const cardBtn = $('cardEntry'); if (cardBtn) cardBtn.hidden = true;
    }
  });
  function refreshCards() {
    meta=loadMeta();let saved;try{saved=JSON.parse(localStorage.getItem('fg_cards'));}catch{}
    cards=Array.isArray(saved?.items)?saved.items:[];metaDirty=cardsDirty=false;
    renderCardEntry();applyEquip();
  }
  window.addEventListener('fg-data-restored',refreshCards);
  window.addEventListener('storage',event=>{if(!event.key||['fg_cards_meta','fg_cards'].includes(event.key))refreshCards();});
  window.GardenCardsDom = { initDom, decorOnPlant, applyEquip };
})();
