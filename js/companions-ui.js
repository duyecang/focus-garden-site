'use strict';
/* 陪伴功能：设置开关（fg_settings）· 溪流落叶（fg_leaves）· 时光花苞（fg_letters）
   只做展示与记录，不参与成长统计；花苞呼吸 3.5s ease-in-out，与桌宠历史呼吸周期对齐 */
(function () {
  const $ = (id) => document.getElementById(id);

  /* ================= 设置：fg_settings ================= */
  const PREF_DEFAULTS = { leafStream: true, buds: true, minimal: false, cards: true, trail: false,
    mcp: true, mcpSorter: true, mcpFeynman: true, mcpReview: true, mcpOcr: true, mcpMap: true, mcpGuide: true };
  let prefs = { ...PREF_DEFAULTS };
  try {
    const saved = JSON.parse(localStorage.getItem('fg_settings'));
    if (saved && typeof saved === 'object') {
      for (const k of Object.keys(PREF_DEFAULTS)) if (typeof saved[k] === 'boolean') prefs[k] = saved[k];
    }
  } catch (e) { /* 默认值兜底 */ }
  function applyPrefs() {
    const root = document.documentElement;
    root.dataset.leafStream = prefs.leafStream ? 'on' : 'off';
    root.dataset.buds = prefs.buds ? 'on' : 'off';
    if (prefs.minimal) root.dataset.minimal = 'on'; else delete root.dataset.minimal;
    if (!prefs.cards) root.dataset.cards = 'off'; else delete root.dataset.cards;
    root.dataset.trail = prefs.trail ? 'on' : 'off';
    root.dataset.mcp = prefs.mcp ? 'on' : 'off';
    ['Sorter','Feynman','Review','Ocr','Map','Guide'].forEach(k => {
      const key = 'mcp' + k;
      root.dataset[key.toLowerCase()] = prefs[key] ? 'on' : 'off';
    });
    [['prefLeafStream','leafStream'],['prefBuds','buds'],['prefMinimal','minimal'],['prefCards','cards'],['prefTrail','trail'],
     ['prefMcp','mcp'],['prefMcpSorter','mcpSorter'],['prefMcpFeynman','mcpFeynman'],['prefMcpReview','mcpReview'],
     ['prefMcpOcr','mcpOcr'],['prefMcpMap','mcpMap'],['prefMcpGuide','mcpGuide']].forEach(([id,key])=>{
      const btn=$(id); if(btn) btn.setAttribute('aria-checked', String(prefs[key]));
    });
    const sub = $('mcpSubPrefs'); if (sub) sub.open = false;
  }
  function savePrefs() {
    try { localStorage.setItem('fg_settings', JSON.stringify(prefs)); } catch (e) { /* 保存失败保持当前态 */ }
    applyPrefs();
    document.dispatchEvent(new CustomEvent('fg-prefs'));
  }
  [['prefLeafStream','leafStream'],['prefBuds','buds'],['prefMinimal','minimal'],['prefCards','cards'],['prefTrail','trail'],
   ['prefMcp','mcp'],['prefMcpSorter','mcpSorter'],['prefMcpFeynman','mcpFeynman'],['prefMcpReview','mcpReview'],
   ['prefMcpOcr','mcpOcr'],['prefMcpMap','mcpMap'],['prefMcpGuide','mcpGuide']].forEach(([id,key])=>{
    const btn=$(id);
    if(btn) btn.addEventListener('click',()=>{
      // 关总开关时不动子开关状态；开子开关前若总开关关着，先自动打开总开关
      if (key !== 'mcp' && !prefs[key] && !prefs.mcp) { prefs.mcp = true; showToast('MCP 插件已打开，各入口重新出现'); }
      prefs[key]=!prefs[key];
      if (key === 'mcp' && prefs.mcp) showToast('MCP 插件已打开。只在你点击时才调用，输出仅供参考');
      // 玻璃粘滞扫光：只配 switch，快而精准（240ms 一次，不叠加）
      btn.classList.remove('swept');
      void btn.offsetWidth;
      btn.classList.add('swept');
      setTimeout(() => btn.classList.remove('swept'), 260);
      savePrefs();
    });
  });
  window.GardenPrefs = { get: () => ({ ...prefs }) };
  applyPrefs();

  /* ================= 鼠标拖尾：纯装饰 · 默认关 · 仅花园页 · 对象池零新建 =================
     规格：同存 5 点 / 4px / 存活 0.5s / 位移上限 24px（散不追）/ 两点最小间距 12px /
     主题 accent 10% 透明（余光可见），不发光不用混合模式；
     排除：输入区 / 拖动中 / 触屏 / 滚动中 / 极简模式 */
  (function initTrail() {
    const root = document.documentElement;
    const pool = Array.from({ length: 5 }, () => {
      const d = document.createElement('span');
      d.className = 'trail-dot';
      document.body.appendChild(d);
      return d;
    });
    let idx = 0, lastX = -999, lastY = -999, scrolling = false, scrollTimer;
    addEventListener('scroll', () => {
      scrolling = true;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => { scrolling = false; }, 160);
    }, { passive: true });
    document.addEventListener('pointermove', (e) => {
      if (root.dataset.trail !== 'on') return;
      if (e.pointerType === 'touch') return;
      if (typeof dragging !== 'undefined' && dragging) return;
      if (scrolling) return;
      if (location.hash.split('/')[0] !== '#space') return;   // 只在花园/情绪空间
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      if (dx * dx + dy * dy < 144) return;                     // 12px 最小间距
      let px = e.clientX, py = e.clientY;
      const dist = Math.hypot(dx, dy);
      if (dist > 24) { px = lastX + dx / dist * 24; py = lastY + dy / dist * 24; } // 散不追
      lastX = px; lastY = py;
      const d = pool[idx++ % pool.length];
      d.style.left = px + 'px';
      d.style.top = py + 'px';
      d.classList.remove('run');
      void d.offsetWidth;                                      // 强制重排重启动画
      d.classList.add('run');
    }, { passive: true });
  })();

  /* ================= 溪流落叶：fg_leaves =================
     记录：{id,text,createdAt,storedAt} storedAt=null 表示尚未漂完（待漂流/漂流中） */
  const LEAF_MAX_ONSCREEN = 5;
  let leaves = loadLeaves();
  function loadLeaves() {
    try {
      const v = JSON.parse(localStorage.getItem('fg_leaves'));
      return Array.isArray(v) ? v.filter(x => x && x.id && typeof x.text === 'string') : [];
    } catch (e) { return []; }
  }
  function persistLeaves() { saveJSON('fg_leaves', leaves); }
  // 刷新/切走后，未漂完的叶子统一收进存档（叶子永不删除）
  function settleLeaves(quiet) {
    let changed = false;
    const now = Date.now();
    for (const l of leaves) if (!l.storedAt) { l.storedAt = now; changed = true; }
    for (const d of drifting) { clearTimeout(d.dropTimer); if (d.el) d.el.remove(); }
    drifting.length = 0;
    if (changed) persistLeaves();
    if (!quiet && changed) showToast('漂流的叶子都收进了下游存档');
  }
  const drifting = []; // {rec,el,dropTimer,archived}

  function leafSVG() {
    return `<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M18 4C9 10 7 20 10 28c8 3 15-1 17-9 1-7-3-12-9-15Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity=".25"/><path d="M12 26C15 18 20 12 26 8" stroke="var(--surface)" stroke-width="1.6" fill="none" opacity=".9"/><path d="M15 18l5-1M13 22l6-1" stroke="var(--surface)" stroke-width="1" fill="none" opacity=".6"/></svg>`;
  }
  function streamCurve(W, H) {
    // 从上游（左上）蜿蜒到下游（右下），弯曲平缓
    return `M ${(W * .08).toFixed(1)} ${(H * .1).toFixed(1)} C ${(W * .62).toFixed(1)} ${(H * .2).toFixed(1)}, ${(W * .1).toFixed(1)} ${(H * .44).toFixed(1)}, ${(W * .6).toFixed(1)} ${(H * .56).toFixed(1)} S ${(W * .2).toFixed(1)} ${(H * .84).toFixed(1)}, ${(W * .7).toFixed(1)} ${H + 40}`;
  }
  function buildStream() {
    const wrap = $('leafStreamWrap'), lane = $('leafLane');
    if (!wrap || !lane) return;
    if (drifting.length) return; // 漂流中不重建，避免打断
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (!W || !H) return;
    const d = streamCurve(W, H);
    lane.style.setProperty('--stream-path', `path("${d}")`);
    const old = wrap.querySelector('svg');
    if (old) old.remove();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<path class="stream-band-outer" d="${d}"/><path class="stream-band-inner" d="${d}"/>`;
    wrap.insertBefore(svg, lane);
  }
  function floatPending() {
    if (!window.GardenPrefs.get().leafStream) return;
    if (window.GardenPrefs.get().minimal || !CSS.supports('offset-path', 'path("M0 0 L1 1")')) {
      if (leaves.some(l => !l.storedAt)) { settleLeaves(true); showToast('叶子已顺水漂进下游存档'); }
      return;
    }
    const wrap = $('leafStreamWrap');
    if (!wrap || !wrap.clientWidth) { buildStream(); }
    let queued = leaves.filter(l => !l.storedAt && !drifting.some(d => d.rec.id === l.id));
    if (queued.length > LEAF_MAX_ONSCREEN) showToast('溪流一次容不下太多叶子，其余会一片片跟上');
    floatNext();
  }
  function floatNext() {
    if (drifting.length >= LEAF_MAX_ONSCREEN) return;
    const rec = leaves.find(l => !l.storedAt && !drifting.some(d => d.rec.id === l.id));
    if (!rec) return;
    dropLeaf(rec);
  }
  function dropLeaf(rec) {
    const lane = $('leafLane');
    if (!lane || !lane.clientWidth) return;
    const el = document.createElement('div');
    el.className = 'leaf-drift';
    el.style.offsetPath = lane.style.getPropertyValue('--stream-path');
    el.style.setProperty('--drift-dur', (8 + Math.random() * 4).toFixed(2) + 's');
    el.innerHTML = `<div class="leaf-sway"><div class="leaf-spin"><button type="button" class="leaf-visual leaf-drop" aria-label="查看这片漂流的叶子">${leafSVG()}</button></div></div>`;
    const entry = { rec, el, dropTimer: null, archived: false, dropped: false };
    el.addEventListener('animationend', (ev) => {
      if (ev.animationName === 'leafDrop') {
        entry.dropped = true;
        if (!el.classList.contains('paused')) el.classList.add('drifting');
      }
      if (ev.animationName === 'leafFlow') finishLeaf(entry);
    });
    el.querySelector('.leaf-visual').addEventListener('click', () => openLeafCard(entry));
    lane.appendChild(el);
    drifting.push(entry);
    entry.dropTimer = setTimeout(() => {
      entry.dropTimer = null;
      if (!entry.archived && !el.classList.contains('paused')) el.classList.add('drifting');
    }, 820);
    floatNext();
  }
  function finishLeaf(entry) {
    if (entry.archived) return;
    entry.archived = true;
    entry.rec.storedAt = Date.now();
    persistLeaves();
    if (entry.el) entry.el.remove();
    const i = drifting.indexOf(entry);
    if (i >= 0) drifting.splice(i, 1);
    floatNext();
  }
  function archiveLeafNow(entry) {
    clearTimeout(entry.dropTimer);
    entry.archived = true;
    entry.rec.storedAt = Date.now();
    persistLeaves();
    if (entry.el) entry.el.remove();
    const i = drifting.indexOf(entry);
    if (i >= 0) drifting.splice(i, 1);
    floatNext();
    showToast('已收进下游存档');
  }
  function resumeLeaf(entry) {
    if (entry.archived) return;
    entry.el.classList.remove('paused');
    if (entry.dropped) entry.el.classList.add('drifting');
  }
  function openLeafCard(entry) {
    entry.el.classList.add('paused');
    let closedByButton = false;
    const ov = openOverlay((card, close) => {
      const t = document.createElement('div');
      t.className = 'ov-title'; t.textContent = '一片叶子正在漂流';
      const p = document.createElement('p');
      p.className = 'leaf-card-text'; p.textContent = entry.rec.text;
      const act = document.createElement('div');
      act.className = 'ov-actions ov-actions-wrap';
      const mk = (label, cls, fn) => {
        const b = document.createElement('button');
        b.className = cls; b.textContent = label;
        b.addEventListener('click', () => { closedByButton = true; close(); fn(); });
        return b;
      };
      act.appendChild(mk('捞起编辑', 'soft-btn mini', () => openLeafEdit(entry.rec, entry)));
      act.appendChild(mk('转为任务', 'soft-btn mini ghost', () => {
        resumeLeaf(entry);
        openTaskEditor({ type: 'task', text: entry.rec.text });
      }));
      act.appendChild(mk('放回存档', 'soft-btn mini', () => archiveLeafNow(entry)));
      const keep = document.createElement('button');
      keep.className = 'quiet-link'; keep.textContent = '继续漂';
      keep.addEventListener('click', () => { closedByButton = true; close(); });
      act.appendChild(keep);
      card.appendChild(t); card.appendChild(p); card.appendChild(act);
    });
    // 点击遮罩 / Esc 关闭时恢复漂流
    const obs = new MutationObserver(() => {
      if (!ov.isConnected) { obs.disconnect(); if (!closedByButton) resumeLeaf(entry); }
    });
    obs.observe(document.body, { childList: true });
  }
  window.GardenLeaves = {
    settle: () => settleLeaves(true),
    openInput: () => openLeafInput(),
    openArchive: () => openLeafArchive(),
    addStored: (text) => { // 直接存入下游存档（AI 分拣确认后使用，不进漂流）
      const t = (text || '').trim();
      if (!t) return;
      leaves.unshift({ id: uid('lf'), text: t, createdAt: Date.now(), storedAt: Date.now() });
      persistLeaves();
    }
  };

  /* 叶子输入 / 捞起编辑（同一弹窗双模式） */
  function openLeafInput() { showLeafDialog('new', null, null); }
  function openLeafEdit(rec, entry) { showLeafDialog('edit', rec, entry || null); }
  function showLeafDialog(mode, rec, entry) {
    const dlg = $('leafInputDialog');
    $('leafInputTitle').textContent = mode === 'edit' ? '捞起一片叶子' : '把心事写下来，交给溪流';
    $('leafInputHint').textContent = mode === 'edit'
      ? '改好之后放回存档，它还会安静地等在那里。'
      : '写下来，看着它顺水漂远。叶子不会丢失，之后可以在下游存档随时找回。';
    $('leafSubmit').textContent = mode === 'edit' ? '放回存档' : '放到溪流';
    const ta = $('leafInputText');
    ta.value = mode === 'edit' ? rec.text : '';
    dlg.showModal();
    setTimeout(() => ta.focus(), 60);
    $('leafSubmit').onclick = () => {
      const text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      if (mode === 'edit') {
        rec.text = text;
        persistLeaves();
        if (entry && !entry.archived) archiveLeafNow(entry); // 漂流中的叶子编辑后放回存档
        else showToast('叶子已放回存档');
      } else {
        leaves.unshift({ id: uid('lf'), text, createdAt: Date.now(), storedAt: null });
        persistLeaves();
        if (window.GardenCards) window.GardenCards.earnChance('leaf');
        showToast('写好了。走进花园，会看见它顺水漂远');
        if (leaves.filter(l => !l.storedAt).length > LEAF_MAX_ONSCREEN) showToast('溪流一次容不下太多叶子，其余会一片片跟上');
      }
      dlg.close();
    };
  }
  $('leafInputClose').addEventListener('click', () => $('leafInputDialog').close());
  $('leafCancel').addEventListener('click', () => $('leafInputDialog').close());
  ['leafEntryThoughts', 'leafEntrySpace'].forEach(id => {
    const b = $(id);
    if (b) b.addEventListener('click', openLeafInput);
  });

  /* 下游存档 */
  function openLeafArchive() {
    renderLeafArchive();
    $('leafArchiveDialog').showModal();
  }
  function renderLeafArchive() {
    const list = $('leafArchiveList');
    list.replaceChildren();
    const stored = leaves.filter(l => l.storedAt).sort((a, b) => b.storedAt - a.storedAt);
    if (!stored.length) {
      const p = document.createElement('p');
      p.className = 'leaf-dialog-hint';
      p.textContent = '下游还很安静。放下的心事漂到这里，会一直陪着你。';
      list.appendChild(p);
      return;
    }
    for (const rec of stored) {
      const item = document.createElement('div');
      item.className = 'leaf-archive-item';
      const p = document.createElement('p'); p.textContent = rec.text;
      const meta = document.createElement('small');
      meta.textContent = `${dayKey(rec.storedAt)} 漂到下游`;
      const act = document.createElement('div');
      act.className = 'leaf-item-actions';
      const edit = document.createElement('button');
      edit.className = 'quiet-link'; edit.textContent = '捞起编辑';
      edit.addEventListener('click', () => { $('leafArchiveDialog').close(); openLeafEdit(rec); });
      const toTask = document.createElement('button');
      toTask.className = 'quiet-link'; toTask.textContent = '转为任务';
      toTask.addEventListener('click', () => { $('leafArchiveDialog').close(); openTaskEditor({ type: 'task', text: rec.text }); });
      act.appendChild(edit); act.appendChild(toTask);
      item.appendChild(p); item.appendChild(meta); item.appendChild(act);
      list.appendChild(item);
    }
  }
  $('leafArchiveLink').addEventListener('click', openLeafArchive);
  $('leafArchiveClose').addEventListener('click', () => $('leafArchiveDialog').close());

  /* ================= 时光花苞：fg_letters =================
     记录：{id,goalId,text,unlockDate,createdAt,boundTaskIds,bloomDone} */
  let letters = loadLetters();
  function loadLetters() {
    try {
      const v = JSON.parse(localStorage.getItem('fg_letters'));
      return Array.isArray(v) ? v.filter(x => x && x.id && typeof x.unlockDate === 'string') : [];
    } catch (e) { return []; }
  }
  function persistLetters() { saveJSON('fg_letters', letters); }
  const letterUnlocked = (l) => l.unlockDate <= todayKey();
  const letterDays = (l) => daysFromTo(todayKey(), l.unlockDate);

  window.GardenLetters = {
    create({ goalId, text, unlockDate }) {
      letters.push({
        id: uid('tl'), goalId: goalId || null, text: text || '',
        unlockDate, createdAt: Date.now(), boundTaskIds: [], bloomDone: false
      });
      persistLetters();
      showToast('时光信封好了。到了那天，花园里会开出一枚花苞');
      if ($('gardenDialog').open) renderBuds();
      renderLetterBranch();
      document.dispatchEvent(new CustomEvent('fg-letters'));
    },
    all: () => letters
  };

  /* ================= 情绪空间 · 时光信分支（感恩瓶卡内） ================= */
  function renderLetterBranch() {
    const countEl = $('letterBranchCount'), budsEl = $('letterBranchBuds');
    if (!countEl || !budsEl) return;
    const waiting = letters.filter(l => !l.bloomDone).length;
    const bloomed = letters.length - waiting;
    countEl.textContent = letters.length
      ? `${waiting ? `等待中 ${waiting}` : ''}${waiting && bloomed ? ' · ' : ''}${bloomed ? `已绽放 ${bloomed}` : ''}`
      : '还没有信';
    budsEl.replaceChildren();
    if (!letters.length) return;
    letters.slice().sort((a, b) => a.createdAt - b.createdAt).slice(-4).reverse().forEach((l) => {
      const chip = document.createElement('span');
      chip.className = 'bud-branch-chip' + (l.bloomDone ? ' bloomed' : '');
      chip.textContent = l.bloomDone ? '已绽放 · ' + l.unlockDate
        : (letterUnlocked(l) ? '可绽放 · ' + l.unlockDate : `等待 ${letterDays(l)} 日 · ${l.unlockDate}`);
      budsEl.appendChild(chip);
    });
  }
  function openLetterCompose() {
    const dlg = $('letterComposeDialog');
    const dateInput = $('letterComposeDate');
    const d = new Date(); d.setDate(d.getDate() + 1);
    dateInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dateInput.min = (() => { const t = new Date(); t.setDate(t.getDate() + 1); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; })();
    $('letterComposeText').value = '';
    dlg.showModal();
    setTimeout(() => $('letterComposeText').focus(), 60);
  }
  $('letterComposeBtn').addEventListener('click', openLetterCompose);
  $('letterComposeClose').addEventListener('click', () => $('letterComposeDialog').close());
  $('letterComposeCancel').addEventListener('click', () => $('letterComposeDialog').close());
  $('letterComposeSubmit').addEventListener('click', () => {
    const text = $('letterComposeText').value.trim();
    const unlockDate = $('letterComposeDate').value;
    if (!text) { $('letterComposeText').focus(); return; }
    if (!unlockDate || unlockDate <= todayKey()) { showToast('时光信要写给未来的日子，换一天试试'); return; }
    $('letterComposeDialog').close();
    window.GardenLetters.create({ goalId: null, text, unlockDate });
  });
  $('letterAlbumBtn').addEventListener('click', () => { renderAlbum(); $('budAlbumDialog').showModal(); });
  document.addEventListener('fg-letters', renderLetterBranch);

  function budSVG() {
    return `<svg viewBox="0 0 40 52" aria-hidden="true"><circle class="bud-glow" cx="20" cy="18" r="14"/><g class="bud-breathe"><path d="M20 48V26" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" opacity=".65"/><path class="bud-petal-l" d="M20 26C12 24 8 16 10 8c8 0 12 8 10 18Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity=".3"/><path class="bud-petal-r" d="M20 26c8-2 12-10 10-18-8 0-12 8-10 18Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity=".3"/><path d="M20 26c-2-6-2-12 0-18 2 6 2 12 0 18Z" fill="var(--surface)" opacity=".92"/></g></svg>`;
  }
  function flowerSVG() {
    const petals = Array.from({ length: 8 }, (_, i) =>
      `<ellipse cy="-7" rx="4.2" ry="8.5" transform="rotate(${i * 45})" fill="${i % 2 ? 'var(--accent-soft)' : 'var(--tint)'}" stroke="var(--accent)" stroke-opacity=".28" stroke-width=".5"/>`).join('');
    return `<svg viewBox="0 0 40 52" aria-hidden="true"><circle class="flower-glow" cx="20" cy="20" r="13"/><path d="M20 48V27" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" opacity=".65"/><g transform="translate(20 20)">${petals}<circle r="4.6" fill="var(--warm)"/><circle r="3" fill="var(--surface)"/></g></svg>`;
  }

  let blooming = false;
  let bloomCardTimer = null, bloomDoneTimer = null;
  function cancelBloom() {
    clearTimeout(bloomCardTimer); clearTimeout(bloomDoneTimer);
    bloomCardTimer = bloomDoneTimer = null; blooming = false;
    document.querySelectorAll('.bud.blooming').forEach(el => el.classList.remove('blooming'));
  }
  function renderBuds() {
    const row = $('budRow');
    if (!row) return;
    row.replaceChildren();
    if (!window.GardenPrefs.get().buds) return;
    const data = growthData(), stage = GardenCore.garden(data, todayKey()).stage;
    letters.slice().sort((a, b) => a.createdAt - b.createdAt).forEach((l, i) => {
      const delay = (-(i % 5) * 1.3).toFixed(2) + 's';
      if (l.bloomDone) {
        const f = document.createElement('button');
        f.type = 'button'; f.className = 'bud bloomed'; f.style.animationDelay = delay;
        f.setAttribute('aria-label', '查看一张已绽放的时光卡牌');
        f.innerHTML = `<span class="bud-stage">${flowerSVG()}</span>`;
        f.addEventListener('click', () => openMemoryCard(l, false));
        row.appendChild(f);
        return;
      }
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'bud' + (letterUnlocked(l) ? ' ready' : ''); b.dataset.id = l.id;
      b.style.animationDelay = delay;
      b.innerHTML = `<span class="bud-stage">${budSVG()}</span><small>${letterUnlocked(l) ? '已到开启的日子' : `等待 ${letterDays(l)} 日开启`}</small>`;
      b.addEventListener('click', () => {
        if (letterUnlocked(l) && !l.bloomDone) startBloomChain();
        else openBudInfo(l);
      });
      row.appendChild(b);
    });
  }
  function startBloomChain() {
    if (blooming || !window.GardenPrefs.get().buds) return;
    const l = letters.find(x => letterUnlocked(x) && !x.bloomDone);
    if (!l) return;
    const budEl = document.querySelector(`.bud[data-id="${l.id}"]`);
    if (!budEl) { renderBuds(); return; }
    blooming = true;
    budEl.classList.add('blooming');
    bloomCardTimer = setTimeout(() => {
      bloomCardTimer = null;
      if ($('gardenDialog').open) openMemoryCard(l, true);
    }, 1000); // 1.0~1.6s：卡片上浮淡入
    bloomDoneTimer = setTimeout(() => {
      bloomDoneTimer = null; blooming = false;
      l.bloomDone = true;
      persistLetters();
      if ($('gardenDialog').open) { renderBuds(); setTimeout(startBloomChain, 500); }
      else cancelBloom();
    }, 1600);
  }
  function boundTasksOf(l) {
    return (l.boundTaskIds || []).map(id => tasks.find(t => t.id === id)).filter(Boolean);
  }
  function openBudInfo(l) {
    openOverlay((card, close) => {
      const t = document.createElement('div');
      t.className = 'ov-title';
      t.textContent = letterUnlocked(l) ? '已经到了开启的日子' : '一枚还没开的花苞';
      const meta = document.createElement('p');
      meta.className = 'memory-meta';
      meta.textContent = letterUnlocked(l)
        ? `${l.unlockDate} 开启 · 走进花园，它会自己绽放`
        : `${l.unlockDate} 开启 · 还有 ${letterDays(l)} 天`;
      const blk = document.createElement('div');
      blk.className = 'memory-tasks';
      const lbl = document.createElement('small');
      lbl.textContent = '同行的小事';
      blk.appendChild(lbl);
      const bound = boundTasksOf(l);
      if (!bound.length) {
        const s = document.createElement('span');
        s.textContent = '还没有绑定任务。绑定只是陪伴展示，不影响开启。';
        blk.appendChild(s);
      } else {
        bound.slice(0, 10).forEach(tk => {
          const s = document.createElement('span');
          s.textContent = `${doneOn(tk, effPlanDate(tk)) ? '已开好 ✓' : '还在路上'} · ${tk.text}`;
          blk.appendChild(s);
        });
      }
      const act = document.createElement('div');
      act.className = 'ov-actions';
      const bind = document.createElement('button');
      bind.className = 'soft-btn mini'; bind.textContent = '绑定任务';
      bind.addEventListener('click', () => { close(); openBindPicker(l); });
      const shut = document.createElement('button');
      shut.className = 'soft-btn mini ghost'; shut.textContent = '合上';
      shut.addEventListener('click', close);
      act.appendChild(bind); act.appendChild(shut);
      card.appendChild(t); card.appendChild(meta); card.appendChild(blk); card.appendChild(act);
    });
  }
  function openBindPicker(l) {
    openOverlay((card, close) => {
      const t = document.createElement('div');
      t.className = 'ov-title'; t.textContent = '绑定同行的任务';
      const hint = document.createElement('p');
      hint.className = 'leaf-dialog-hint';
      hint.textContent = '只是陪伴展示，不影响花苞开启，也不计入任何统计。';
      const list = document.createElement('div');
      list.className = 'bind-list';
      const boxes = [];
      const pool = tasks.filter(tk => !tk.sealed).slice(-30).reverse();
      if (!pool.length) {
        const s = document.createElement('span');
        s.className = 'memory-meta'; s.textContent = '还没有可以同行的任务。';
        list.appendChild(s);
      }
      pool.forEach(tk => {
        const lab = document.createElement('label');
        lab.className = 'bind-item';
        const box = document.createElement('input');
        box.type = 'checkbox'; box.checked = (l.boundTaskIds || []).includes(tk.id);
        const sp = document.createElement('span');
        sp.textContent = `${tk.text}（${effPlanDate(tk)}）`;
        lab.appendChild(box); lab.appendChild(sp);
        list.appendChild(lab);
        boxes.push([box, tk.id]);
      });
      const act = document.createElement('div');
      act.className = 'ov-actions';
      const ok = document.createElement('button');
      ok.className = 'soft-btn mini'; ok.textContent = '保存';
      ok.addEventListener('click', () => {
        l.boundTaskIds = boxes.filter(([b]) => b.checked).map(([, id]) => id);
        persistLetters();
        showToast('绑好了，它们会陪着这枚花苞');
        close();
      });
      const no = document.createElement('button');
      no.className = 'soft-btn mini ghost'; no.textContent = '先想想';
      no.addEventListener('click', close);
      act.appendChild(ok); act.appendChild(no);
      card.appendChild(t); card.appendChild(hint); card.appendChild(list); card.appendChild(act);
    });
  }
  function memorySnapshot(prefix) {
    const stage = GardenCore.garden(growthData(), todayKey()).stage;
    return plantSVG(stage, prefix);
  }
  function openMemoryCard(l, rise) {
    openOverlay((card, close) => {
      if (rise) card.classList.add('rise');
      const badge = document.createElement('span');
      badge.className = 'memory-badge'; badge.textContent = '时光信 · 已绽放';
      const head = document.createElement('div');
      head.className = 'memory-head';
      const snap = document.createElement('div');
      snap.className = 'memory-snapshot';
      snap.innerHTML = memorySnapshot('mem' + l.id);
      const metaBox = document.createElement('div');
      const meta = document.createElement('p');
      meta.className = 'memory-meta';
      const bound = boundTasksOf(l).length;
      meta.textContent = `${l.unlockDate} 开启${bound ? ` · 与 ${bound} 件小事同行` : ''}`;
      metaBox.appendChild(meta);
      head.appendChild(snap); head.appendChild(metaBox);
      const text = document.createElement('p');
      text.className = 'memory-text';
      text.textContent = l.text || '（这封信没有写字，心意都在花里。）';
      const act = document.createElement('div');
      act.className = 'ov-actions';
      const shut = document.createElement('button');
      shut.className = 'soft-btn mini'; shut.textContent = '收进卡牌册';
      shut.addEventListener('click', close);
      act.appendChild(shut);
      card.appendChild(badge); card.appendChild(head); card.appendChild(text); card.appendChild(act);
    });
  }
  function renderAlbum() {
    const grid = $('budAlbumGrid');
    grid.replaceChildren();
    const opened = letters.filter(l => l.bloomDone).sort((a, b) => b.createdAt - a.createdAt);
    if (!opened.length) {
      const p = document.createElement('p');
      p.className = 'leaf-dialog-hint';
      p.textContent = '还没有绽放的花苞。写给未来的信，会在约定的日子开花。';
      grid.appendChild(p);
      return;
    }
    for (const l of opened) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'album-card';
      b.innerHTML = `<span class="album-snap">${memorySnapshot('alb' + l.id)}</span>`;
      const strong = document.createElement('strong');
      strong.textContent = l.text ? (l.text.length > 14 ? l.text.slice(0, 14) + '…' : l.text) : '时光信';
      const small = document.createElement('small');
      small.textContent = `${l.unlockDate} 开启`;
      b.appendChild(strong); b.appendChild(small);
      b.addEventListener('click', () => { $('budAlbumDialog').close(); openMemoryCard(l, false); });
      grid.appendChild(b);
    }
  }
  $('budAlbumLink').addEventListener('click', () => { renderAlbum(); $('budAlbumDialog').showModal(); });
  $('budAlbumClose').addEventListener('click', () => $('budAlbumDialog').close());

  /* ================= 花园弹窗开合挂钩（惰性检测：打开时渲染与绽放） ================= */
  const gardenDialog = $('gardenDialog');
  let streamReady = false;
  let hintFocus = null; // 'stream' | 'buds'：今日页指引进入后高亮对应区域
  function openGardenHook() {
    requestAnimationFrame(() => {
      buildStream();
      if ($('leafLane') && $('leafLane').clientWidth) streamReady = true;
      if (!streamReady) { setTimeout(openGardenHook, 120); return; } // 布局未就绪时稍后重试
      floatPending(); renderBuds(); startBloomChain();
      if (hintFocus) {
        const target = hintFocus === 'buds' ? $('budRow') : $('leafStreamWrap');
        if (target) target.classList.add('spotlight');
        setTimeout(() => target && target.classList.remove('spotlight'), 2400);
        hintFocus = null;
      }
    });
  }
  new MutationObserver(() => {
    if (gardenDialog.open) {
      streamReady = false;
      openGardenHook();
    } else {
      settleLeaves(true);
      cancelBloom();
    }
  }).observe(gardenDialog, { attributes: true, attributeFilter: ['open'] });
  const hintLink = $('gardenHintLink');
  if (hintLink) hintLink.addEventListener('click', () => { hintFocus = 'stream'; });
  window.addEventListener('resize', () => { if (gardenDialog.open && !drifting.length) buildStream(); });
  window.addEventListener('pagehide', () => settleLeaves(true));
  document.addEventListener('fg-prefs', () => {
    if (!window.GardenPrefs.get().leafStream) settleLeaves(true);
    if (gardenDialog.open) { renderBuds(); if (!window.GardenPrefs.get().buds) cancelBloom(); }
    if (window.GardenPrefs.get().minimal) settleLeaves(true);
  });
  function refreshCompanions() {
    for(const d of drifting){clearTimeout(d.dropTimer);d.el?.remove();}drifting.length=0;
    leaves=loadLeaves();letters=loadLetters();
    let saved={};try{saved=JSON.parse(localStorage.getItem('fg_settings'))||{};}catch{}
    prefs={...PREF_DEFAULTS};for(const k of Object.keys(prefs))if(typeof saved[k]==='boolean')prefs[k]=saved[k];
    applyPrefs();renderLetterBranch();if(gardenDialog.open)renderBuds();
    document.dispatchEvent(new CustomEvent('fg-prefs'));
  }
  window.addEventListener('fg-data-restored',refreshCompanions);
  window.addEventListener('storage',event=>{if(!event.key||['fg_settings','fg_leaves','fg_letters'].includes(event.key))refreshCompanions();});
  // 加载时惰性收档：上次会话未漂完的叶子进存档
  settleLeaves(true);
  renderLetterBranch();
})();
