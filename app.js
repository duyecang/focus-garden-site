"use strict";

/* ================= 基础工具 ================= */
const DAY = 24 * 60 * 60 * 1000;
const $ = (id) => document.getElementById(id);

function pad2(n) { return (n < 10 ? "0" : "") + n; }
function dayKey(ts) {
  const d = new Date(ts);
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
function todayKey() { return dayKey(Date.now()); }
function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function dayOfWeek(key) { return keyToDate(key).getDay(); }
function dayNum(key) { return Number(key.split("-")[2]); }
function daysFromTo(fromKey, toKey) {
  return Math.round((keyToDate(toKey) - keyToDate(fromKey)) / DAY);
}
function uid(p) { return p + Date.now() + Math.floor(Math.random() * 999); }
const WEEK_CN = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const WEEK_SHORT = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/* ================= 反馈提示：Toast 右上角 3s / Snackbar 底部可撤销 ================= */
let toastTimer = null;
let snackbarTimer = null;
function showToast(msg) { // 无操作提示，右上角 3s 自动关闭
  const old = document.querySelector(".toast");
  if (old) old.remove();
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  toastTimer = setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 200);
  }, 3000);
}
function showSnackbar(msg, onUndo) { // 带撤销操作，底部滑入
  const old = document.querySelector(".snackbar");
  if (old) old.remove();
  if (snackbarTimer) { clearTimeout(snackbarTimer); snackbarTimer = null; }
  const el = document.createElement("div");
  el.className = "snackbar";
  const span = document.createElement("span");
  span.textContent = msg;
  el.appendChild(span);
  if (onUndo) {
    const btn = document.createElement("button");
    btn.textContent = "撤销";
    btn.addEventListener("click", () => { el.remove(); onUndo(); });
    el.appendChild(btn);
  }
  document.body.appendChild(el);
  snackbarTimer = setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 200);
  }, 4500);
}

/* 高风险操作确认弹窗（Modal Layer） */
function openConfirm(title, msg, okText, onOk) {
  openOverlay((card, close) => {
    card.classList.add("confirm-card");
    const t = document.createElement("div");
    t.className = "ov-title";
    t.textContent = title;
    const p = document.createElement("p");
    p.className = "confirm-msg";
    p.textContent = msg;
    const act = document.createElement("div");
    act.className = "ov-actions";
    const ok = document.createElement("button");
    ok.className = "soft-btn mini";
    ok.textContent = okText || "确定";
    ok.addEventListener("click", () => { close(); onOk(); });
    const no = document.createElement("button");
    no.className = "soft-btn mini ghost";
    no.textContent = "再想想";
    no.addEventListener("click", close);
    act.appendChild(no); act.appendChild(ok);
    card.appendChild(t); card.appendChild(p); card.appendChild(act);
  }, "modal");
}

/* ================= 通用浮层（Overlay/Modal Layer，弹出 scale 0.96→1） ================= */
function openOverlay(build, kind) {
  const ov = document.createElement("div");
  ov.className = "overlay" + (kind ? " " + kind : "");
  document.body.classList.add("no-scroll");
  const card = document.createElement("div");
  card.className = "overlay-card";
  let releaseFocus = () => {};
  const close = () => {
    releaseFocus(); ov.remove();
    if (!document.querySelector(".overlay,.drawer")) document.body.classList.remove("no-scroll");
  };
  build(card, close);
  ov.appendChild(card);
  ov.addEventListener("click", (e) => {
    if (e.target === ov) close();
  });
  document.body.appendChild(ov);
  releaseFocus = containDialogFocus(ov, card, close);
  return ov;
}

function containDialogFocus(root, panel, close) {
  const previous = document.activeElement;
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true");
  panel.tabIndex = -1;
  const title = panel.querySelector(".ov-title");
  if (title) { title.id = uid("dialog-title-"); panel.setAttribute("aria-labelledby", title.id); }
  else panel.setAttribute("aria-label", "照片详情");
  const controls = () => [...panel.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
  const onKey = e => {
    if ([...document.querySelectorAll(".overlay,.drawer")].at(-1) !== root) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    if (e.key === "Tab") {
      const list = controls(), first = list[0], last = list.at(-1);
      if (!first) { e.preventDefault(); panel.focus(); }
      else if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener("keydown", onKey, true);
  requestAnimationFrame(() => (controls()[0] || panel).focus());
  return () => { document.removeEventListener("keydown", onKey, true); if (previous?.isConnected) previous.focus(); };
}

/* ================= 柔和音效（WebAudio，无外部文件） ================= */
let audioCtx = null;
function playChime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [[523.25, 0], [659.25, 0.22], [783.99, 0.44]].forEach(([f, d]) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = f;
      const t0 = audioCtx.currentTime + d;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + 1);
    });
  } catch (e) { /* 无声环境忽略 */ }
}

/* ================= 数据层 =================
   旧键保持：fg_tasks / fg_mood / fg_events / fg_jar / fg_dayline /
   fg_bg / fg_pet_img / fg_pet_x / fg_pet_y / fg_goals / fg_review_state
   新增键：fg_todos（待办+提醒）、fg_notes（想法速记）、fg_pomo（番茄钟）
   IndexedDB：fg_db / photos */
const storedVersions = new Map();
const RECORD_KEYS = ["fg_tasks", "fg_todos", "fg_notes", "fg_goals", "fg_mood", "fg_events", "fg_jar", "fg_dayline", "fg_templates", "fg_quadrant", "fg_focus_sessions", "fg_promises"];
function readStored(key) {
  const raw = localStorage.getItem(key);
  storedVersions.set(key, raw);
  return raw;
}
function loadTasks() {
  try {
    const raw = JSON.parse(readStored("fg_tasks")) || [];
    return raw.map(t => ({
      id: t.id,
      text: t.text,
      createdAt: t.createdAt || t.created || Date.now(),
      completedAt: t.completedAt !== undefined ? t.completedAt : (t.done ? (t.completedAt || Date.now()) : null),
      lastMovedAt: t.lastMovedAt || t.createdAt || t.created || Date.now(),
      planDate: t.planDate || null,
      time: t.time || null,                            // "HH:MM" 可空
      repeat: t.repeat || "none",
      doneDates: Array.isArray(t.doneDates) ? t.doneDates : [],
      sealed: !!t.sealed,
      sealedAt: t.sealedAt || null,
      firstCompletedAt: t.firstCompletedAt || null,
      goalId: t.goalId || null,
      tags: Array.isArray(t.tags) ? t.tags : [],
      effort: ['light','medium','deep'].includes(t.effort) ? t.effort : null
    }));
  } catch (e) { return []; }
}
function saveTasks(list) {
  return saveRecordBatch({ fg_tasks: list });
}
function loadJSON(key, fallback) {
  try { return JSON.parse(readStored(key)) ?? fallback; }
  catch (e) { return fallback; }
}
function saveJSON(key, val) {
  return saveRecordBatch({ [key]: val });
}
function reloadRecord(key) {
  if (key === "fg_tasks") tasks = loadTasks();
  else if (key === "fg_todos") todos = loadJSON(key, []);
  else if (key === "fg_notes") notes = loadJSON(key, []);
  else if (key === "fg_goals") goals = loadJSON(key, []);
  else if (key === "fg_mood") moodList = loadJSON(key, []);
  else if (key === "fg_events") events = loadJSON(key, []);
  else if (key === "fg_jar") jarList = loadJSON(key, []);
  else if (key === "fg_dayline") daylines = loadJSON(key, []);
  else if (key === "fg_templates") templates = loadJSON(key, TPL_DEFAULT);
  else if (key === "fg_quadrant") quadrant = loadJSON(key, {});
  else if (key === "fg_focus_sessions") focusSessions = loadJSON(key, []);
  else if (key === "fg_promises") promises = loadJSON(key, []);
}
let sharedRefreshFrame = null;
function queueSharedRefresh() {
  if (sharedRefreshFrame != null) return;
  sharedRefreshFrame = requestAnimationFrame(() => {
    sharedRefreshFrame = null;
    renderGoals(); renderDateStrip(); renderToday(); renderTasksPage();
    renderTagFilter(); renderCalendar(); renderTodoAdmin(); renderPool();
    if (taskView === "quad") renderQuad();
    if (!pomo.running && !$("pomoBox").contains(document.activeElement)) renderPomo();
    if (typeof renderGrowth === "function") renderGrowth();
  });
}
function saveRecordBatch(fields) {
  const keys = Object.keys(fields), before = {}, written = [];
  try {
    for (const key of keys) {
      before[key] = localStorage.getItem(key);
      if (RECORD_KEYS.includes(key) && storedVersions.has(key) && before[key] !== storedVersions.get(key)) {
        keys.filter(k => RECORD_KEYS.includes(k)).forEach(reloadRecord);
        queueSharedRefresh();
        showToast("另一页面更新了记录，已同步。请再操作一次");
        return false;
      }
    }
    for (const key of keys) {
      localStorage.setItem(key, JSON.stringify(fields[key]));
      written.push(key);
    }
    keys.forEach(key => storedVersions.set(key, JSON.stringify(fields[key])));
    if (keys.some(key => RECORD_KEYS.includes(key))) queueSharedRefresh();
    return true;
  } catch (error) {
    for (const key of written) {
      try { before[key] == null ? localStorage.removeItem(key) : localStorage.setItem(key, before[key]); }
      catch (rollbackError) { /* Previously persisted values remain available to export. */ }
    }
    keys.filter(key => RECORD_KEYS.includes(key)).forEach(reloadRecord);
    queueSharedRefresh();
    showToast("没有保存成功，请导出备份、腾出空间后重试");
    return false;
  }
}

let focusSessions = loadJSON("fg_focus_sessions", []);
let tasks = loadTasks();
let todos = loadJSON("fg_todos", []);   // [{id,text,tags,remindAt,remindFired,done,createdAt}]
let notes = loadJSON("fg_notes", []);   // [{id,text,archived,createdAt}]
let goals = loadJSON("fg_goals", []);   // [{id,title,createdAt}]
let moodList = loadJSON("fg_mood", []);
let events = loadJSON("fg_events", []); // [{id,title,date,yearly}]
let jarList = loadJSON("fg_jar", []);
let daylines = loadJSON("fg_dayline", []);
let promises = loadJSON("fg_promises", []); // 价值承诺：[{id,text,createdAt}] 无完成度、不可划勾，仅手动书写

function effPlanDate(t) { return t.planDate || dayKey(t.createdAt); }
function taskActionDate(t) {
  if (!t.repeat || t.repeat === "none") return effPlanDate(t);
  const start = todayKey() > effPlanDate(t) ? todayKey() : effPlanDate(t);
  for (let i = 0; i < 62; i++) {
    const date = keyToDate(start); date.setDate(date.getDate() + i);
    if (occursOn(t, dayKey(date))) return dayKey(date);
  }
  return start;
}

function occursOn(t, key) {
  if (t.sealed) return false;
  const pd = effPlanDate(t);
  if (key < pd) return false;
  if (t.repeat === "daily") return true;
  if (t.repeat === "weekly") return dayOfWeek(key) === dayOfWeek(pd);
  if (t.repeat === "monthly") return dayNum(key) === dayNum(pd);
  return key === pd;
}
function doneOn(t, key) {
  if (t.repeat && t.repeat !== "none") return (t.doneDates || []).includes(key);
  return t.completedAt != null;
}
function allTags() {
  const s = new Set();
  tasks.forEach(t => (t.tags || []).forEach(x => s.add(x)));
  todos.forEach(t => (t.tags || []).forEach(x => s.add(x)));
  goals.forEach(g => (g.tags || []).forEach(x => s.add(x)));
  return Array.from(s);
}
function fmtTimeChip(t) {
  if (t && t.time) return t.time;
  return null;
}
function fmtClock(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60), sec = s % 60;
  return pad2(m) + ":" + pad2(sec);
}
function fmtRemind(ts) {
  const d = new Date(ts);
  return pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

/* ================= 导航与 hash 路由 ================= */
const PANEL_IDS = { garden: "sec-garden", tarot: "sec-tarot", today: "sec-today", calendar: "sec-calendar", tasks: "sec-tasks", tools: "sec-tools", bench: "sec-bench", notes: "sec-thoughts", space: "sec-space" };
const PAGE_LABELS = { garden: "花园", tarot: "每日塔罗", bench: "工作台", today: "今日", calendar: "日历", tasks: "任务", tools: "功能", notes: "思绪整理", space: "情绪空间" };
const SUBS = ["notes", "todo", "timeline"];
const navItems = document.querySelectorAll(".nav-item");
const content = $("content");
const scrollMemo = {};
let lastSub = "notes";

function parseRoute() {
  let h = location.hash.replace("#", "");
  if (h === "notes") return { panel: "notes", sub: lastSub };
  if (h === "mood") { location.replace("#space"); return { panel: "space" }; }
  if (h === "record" || h === "thoughts") { location.replace("#notes/notes"); return { panel: "notes", sub: "notes" }; }
  if (h.startsWith("record/")) { // 旧版 hash 兼容
    const old = h.split("/")[1];
    const map = { timeline: "timeline", event: "notes", jar: "notes" };
    location.replace("#notes/" + (map[old] || "notes"));
    return { panel: "notes", sub: map[old] || "notes" };
  }
  if (h.startsWith("thoughts/")) { // 旧版 hash 兼容
    location.replace("#notes/" + (h.split("/")[1] || "notes"));
    return { panel: "notes", sub: h.split("/")[1] || "notes" };
  }
  if (h.startsWith("notes/")) {
    const sub = h.split("/")[1];
    if (SUBS.includes(sub)) { lastSub = sub; return { panel: "notes", sub }; }
    location.replace("#notes/" + lastSub);
    return { panel: "notes", sub: lastSub };
  }
  if (h.startsWith("garden/share/")) return { panel: "garden" };
  if (PANEL_IDS[h]) return { panel: h };
  location.replace("#today");
  return { panel: "today" };
}

function switchRoute() {
  const r = parseRoute();
  Object.entries(PANEL_IDS).forEach(([k, id]) => {
    if ($(id).classList.contains("active")) scrollMemo[k] = content.scrollTop;
    $(id).classList.toggle("active", k === r.panel);
  });
  navItems.forEach(b => b.classList.toggle("active", b.dataset.section === r.panel));
  const pageLocation = $("pageLocation");
  if (pageLocation) pageLocation.textContent = "我的花园 / " + PAGE_LABELS[r.panel];
  if (r.panel === "notes") renderSub(r.sub);
  if (window.BotanyUI) window.BotanyUI.onRoute();
  if (r.panel === "calendar") renderCalendar();
  if (r.panel === "space") {
    renderWall();
    renderPool();
    playSpaceOpen();
  }
  content.scrollTop = scrollMemo[r.panel] || 0;
}

$("quickNote").addEventListener("click", () => {
  location.hash = "notes/notes";
  setTimeout(() => $("daylineInput").focus(), 0);
});
$("miniCalendarLink").addEventListener("click", () => { location.hash = "calendar"; });
$("todayFocusLink").addEventListener("click", () => { location.hash = "tools"; setTimeout(() => $("pomoBox").scrollIntoView({ behavior: "smooth", block: "center" }), 0); });
$("tasksAddTask").addEventListener("click", () => openTaskEditor({ type: "task" }));
$("tasksAddGoal").addEventListener("click", () => $("calGoalBtn").click());

navItems.forEach(b => b.addEventListener("click", () => {
  const k = b.dataset.section;
  location.hash = k === "notes" ? "notes/" + lastSub : k;
}));
window.addEventListener("hashchange", switchRoute);

const subtabBtns = document.querySelectorAll(".subtab");
subtabBtns.forEach(b => b.addEventListener("click", () => {
  location.hash = "notes/" + b.dataset.sub;
}));
function renderSub(sub) {
  subtabBtns.forEach(b => b.classList.toggle("active", b.dataset.sub === sub));
  SUBS.forEach(s => { $("sub-" + s).hidden = s !== sub; });
  if (sub === "notes") renderNotes();
  if (sub === "todo") renderTodoAdmin();
  if (sub === "timeline") renderTimeline();
}

/* 开屏流星：每次进入情绪空间，几颗流星贴图划过一次 */
function playSpaceOpen() {
  const host = $("moodBg");
  if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 4; i++) {
    const m = document.createElement("img");
    m.src = "assets/meteor.png";
    m.alt = "";
    m.className = "meteor fly";
    m.style.right = (20 + Math.random() * 150) + "px";
    m.style.top = (10 + Math.random() * 50) + "px";
    m.style.animationDelay = (i * 0.22 + Math.random() * 0.15) + "s";
    host.appendChild(m);
    setTimeout(() => m.remove(), 2800);
  }
}

/* ================= 今日：日期串联轴 ================= */
function goalOn(key) { return goals.find(g => g.date === key); }

function renderDateStrip() {
  const strip = $("dateStrip");
  strip.innerHTML = "";
  const base = keyToDate(todayKey());
  for (let i = -3; i <= 3; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const key = dayKey(d.getTime());
    const c = document.createElement("button");
    c.className = "ds-cell" + (i === 0 ? " today" : "");
    const wk = document.createElement("div");
    wk.className = "ds-week";
    wk.textContent = i === 0 ? "今天" : WEEK_SHORT[d.getDay()];
    const dy = document.createElement("div");
    dy.className = "ds-day";
    dy.textContent = (d.getMonth() + 1) + "." + d.getDate();
    c.appendChild(wk); c.appendChild(dy);
    const g = goalOn(key);
    if (g) {
      const gl = document.createElement("div");
      gl.className = "ds-goal";
      gl.textContent = g.title;
      c.appendChild(gl);
    }
    if (i !== 0) c.addEventListener("click", () => jumpToDate(key));
    else c.addEventListener("click", () => { location.hash = "today"; });
    strip.appendChild(c);
  }
}

function jumpToDate(key) {
  const d = keyToDate(key);
  cal.view = "day";
  cal.y = d.getFullYear(); cal.m = d.getMonth() + 1; cal.d = d.getDate();
  if (location.hash === "#calendar") renderCalendar();
  else location.hash = "calendar";
}

/* 展开：完整年月日选择 */
$("dateExpand").addEventListener("click", () => {
  openMonthPicker(cal.y || new Date().getFullYear(), cal.m || (new Date().getMonth() + 1), (key) => jumpToDate(key));
});

/* 通用月份选择浮层（展开日期 / 封存到 / 添加任务 共用） */
function openMonthPicker(startY, startM, cb) {
  openOverlay((card, close) => {
    let y = startY, m = startM;
    const title = document.createElement("div");
    title.className = "ov-title";
    const nav = document.createElement("div");
    nav.className = "mp-nav";
    const prev = document.createElement("button");
    prev.className = "soft-btn mini ghost"; prev.textContent = "上一月";
    const next = document.createElement("button");
    next.className = "soft-btn mini ghost"; next.textContent = "下一月";
    nav.appendChild(prev); nav.appendChild(title); nav.appendChild(next);
    const grid = document.createElement("div");
    grid.className = "mp-grid";
    card.appendChild(nav); card.appendChild(grid);
    function draw() {
      title.textContent = y + " 年 " + m + " 月";
      grid.innerHTML = "";
      const offset = (keyToDate(y + "-" + pad2(m) + "-01").getDay() + 6) % 7;
      const last = new Date(y, m, 0).getDate();
      const tk = todayKey();
      for (let i = 0; i < 42; i++) {
        const n = i - offset + 1;
        const cell = document.createElement("button");
        if (n < 1 || n > last) { cell.className = "mp-cell blank"; cell.disabled = true; grid.appendChild(cell); continue; }
        const key = y + "-" + pad2(m) + "-" + pad2(n);
        cell.className = "mp-cell" + (key === tk ? " today" : "");
        cell.textContent = n;
        cell.addEventListener("click", () => { close(); cb(key); });
        grid.appendChild(cell);
      }
    }
    prev.addEventListener("click", () => { m--; if (m < 1) { m = 12; y--; } draw(); });
    next.addEventListener("click", () => { m++; if (m > 12) { m = 1; y++; } draw(); });
    draw();
  });
}

/* ================= 大目标 ================= */
let selectedGoalId = null;
const goalInput = $("goalInput"), goalCards = $("goalCards");

goalInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const title = goalInput.value.trim();
  if (!title) return;
  goals.push({ id: uid("g"), title, createdAt: Date.now() });
  if (!saveJSON("fg_goals", goals)) return;
  goalInput.value = "";
  renderGoals();
});

function renderGoals() {
  goalCards.innerHTML = "";
  const active = goals.filter(g => !g.withdrawn);
  const stones = goals.filter(g => g.withdrawn);
  if (!goals.find(g => g.id === selectedGoalId && !g.withdrawn)) selectedGoalId = null;
  active.forEach(g => {
    const card = document.createElement("div");
    card.className = "goal-card" + (g.id === selectedGoalId ? " selected" : "");
    const p = goalProgress(g);
    let meta = "";
    if (p.nrTotal > 0) meta += p.nrDone + "/" + p.nrTotal;
    if (p.repeatDays > 0) meta += (meta ? " · " : "") + "已坚持 " + p.repeatDays + " 天";
    card.innerHTML = `
      <div class="g-title"></div>
      ${p.nrTotal > 0 ? '<div class="g-bar"><i></i></div>' : ""}
      ${meta ? '<div class="g-meta"></div>' : ""}
      ${(g.date || (g.tags || []).length) ? '<div class="g-sub"></div>' : ""}
      <div class="goal-card-actions"><button class="g-pause">先放一放</button><button class="g-del">删除</button></div>`;
    card.querySelector(".g-title").textContent = g.title;
    if (p.nrTotal > 0) card.querySelector(".g-bar i").style.width = Math.round(p.nrDone / p.nrTotal * 100) + "%";
    if (meta) card.querySelector(".g-meta").textContent = meta;
    if (g.date || (g.tags || []).length) {
      const sub = card.querySelector(".g-sub");
      const bits = [];
      if (g.date) bits.push(g.date);
      if ((g.tags || []).length) bits.push(g.tags.join(" / "));
      sub.textContent = bits.join(" · ");
    }
    card.addEventListener("click", (e) => {
      if (e.target.closest(".g-del") || e.target.closest(".g-pause")) return;
      selectedGoalId = selectedGoalId === g.id ? null : g.id;
      renderGoals();
    });
    card.querySelector(".g-pause").addEventListener("click", () => openGoalWithdraw(g));
    card.querySelector(".g-del").addEventListener("click", () => {
      const idx = goals.findIndex(x => x.id === g.id);
      const linkedIds = tasks.filter(t => t.goalId === g.id).map(t => t.id);
      const removed = goals.splice(idx, 1)[0];
      tasks.forEach(t => { if (t.goalId === g.id) t.goalId = null; });
      if (!saveRecordBatch({ fg_goals: goals, fg_tasks: tasks })) return;
      if (selectedGoalId === g.id) selectedGoalId = null;
      renderGoals(); renderTasksPage(); renderToday(); renderCalendar(); renderDateStrip();
      showSnackbar("已删除目标「" + removed.title + "」", () => {
        goals.splice(Math.min(idx, goals.length), 0, removed);
        tasks.forEach(t => { if (linkedIds.includes(t.id) && !t.goalId) t.goalId = removed.id; });
        if (!saveRecordBatch({ fg_goals: goals, fg_tasks: tasks })) return;
        renderGoals();
      });
    });
    goalCards.appendChild(card);
  });

  /* 静石：撤回的长期目标，安静留在这里，不负面标记 */
  const stoneWrap = $("stoneCards");
  if (!stoneWrap) return;
  stoneWrap.innerHTML = "";
  stoneWrap.hidden = stones.length === 0;
  stones.forEach(g => {
    const card = document.createElement("div");
    card.className = "stone-card";
    card.innerHTML = `
      <span class="stone-svg" aria-hidden="true"><svg viewBox="0 0 40 26"><ellipse cx="20" cy="16" rx="16" ry="8.5" fill="var(--bg-sub)" stroke="var(--line)"/><ellipse cx="24" cy="12" rx="8" ry="4.5" fill="var(--tint)" stroke="var(--line)" opacity=".7"/><path d="M14 14q3 2 6 1" stroke="var(--line)" fill="none" opacity=".8"/></svg></span>
      <div class="stone-copy"><strong></strong><small></small></div>
      <div class="stone-actions"><button class="quiet-link stone-reason">暂停理由</button><button class="quiet-link stone-resume">重新立起</button></div>`;
    card.querySelector(".stone-copy strong").textContent = g.title;
    card.querySelector(".stone-copy small").textContent =
      g.withdrawnReason ? `「${g.withdrawnReason}」` : "先放一放，它还在这里等你";
    card.querySelector(".stone-reason").addEventListener("click", () => {
      openOverlay((c, close) => {
        const t = document.createElement("div");
        t.className = "ov-title"; t.textContent = "暂停的理由";
        const p = document.createElement("p");
        p.className = "leaf-dialog-hint";
        p.textContent = g.withdrawnReason
          ? `「${g.title}」先放一放：${g.withdrawnReason}`
          : `「${g.title}」先放一放，没有写下理由。石头安静地待在花园里，等你想回来的时候。`;
        const day = document.createElement("p");
        day.className = "memory-meta";
        day.textContent = `${dayKey(g.withdrawnAt)} 放下`;
        const act = document.createElement("div");
        act.className = "ov-actions";
        const back = document.createElement("button");
        back.className = "soft-btn mini"; back.textContent = "好，先这样";
        back.addEventListener("click", close);
        act.appendChild(back);
        c.appendChild(t); c.appendChild(p); c.appendChild(day); c.appendChild(act);
      });
    });
    card.querySelector(".stone-resume").addEventListener("click", () => {
      g.withdrawn = false;
      g.withdrawnReason = "";
      g.withdrawnAt = null;
      if (!saveJSON("fg_goals", goals)) return;
      renderGoals(); renderTasksPage(); renderGardenStones();
      showToast("目标重新立起来了，花园里的石头也松了口气");
    });
    stoneWrap.appendChild(card);
  });
}

/* ================= 撤回目标：记录暂停理由，变为花园静石，不负面标记 ================= */
function openGoalWithdraw(g) {
  openOverlay((card, close) => {
    const t = document.createElement("div");
    t.className = "ov-title"; t.textContent = "先放一放？";
    const hint = document.createElement("p");
    hint.className = "leaf-dialog-hint";
    hint.textContent = "这个目标会变成花园里的一枚静石，安静留着，不算放弃，也不会被扣掉什么。想回来的时候随时重新立起。";
    const ta = document.createElement("textarea");
    ta.className = "leaf-textarea";
    ta.maxLength = 60; ta.rows = 2;
    ta.placeholder = "想写一句暂停的理由吗（可不填）";
    const act = document.createElement("div");
    act.className = "ov-actions";
    const ok = document.createElement("button");
    ok.className = "soft-btn mini"; ok.textContent = "先放一放";
    ok.addEventListener("click", () => {
      g.withdrawn = true;
      g.withdrawnReason = ta.value.trim();
      g.withdrawnAt = Date.now();
      if (!saveJSON("fg_goals", goals)) return;
      if (selectedGoalId === g.id) selectedGoalId = null;
      close();
      renderGoals(); renderTasksPage(); renderGardenStones();
      showToast("放好了。花园里多了一枚安静的石头");
    });
    const no = document.createElement("button");
    no.className = "soft-btn mini ghost"; no.textContent = "再坚持一下";
    no.addEventListener("click", close);
    act.appendChild(ok); act.appendChild(no);
    card.appendChild(t); card.appendChild(hint); card.appendChild(ta); card.appendChild(act);
    setTimeout(() => ta.focus(), 50);
  });
}

/* 花园里的静石区：仅展示，无删除 */
function renderGardenStones() {
  const row = $("stoneRow");
  if (!row) return;
  row.replaceChildren();
  const section = row.closest(".garden-stones");
  const stones = goals.filter(g => g.withdrawn);
  if (section) section.hidden = stones.length === 0;
  stones.forEach(g => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "garden-stone";
    item.title = g.withdrawnReason ? `暂停理由：${g.withdrawnReason}` : "先放一放的目标，安静留在这里";
    item.innerHTML = `<span class="garden-stone-svg" aria-hidden="true"><svg viewBox="0 0 40 26"><ellipse cx="20" cy="16" rx="16" ry="8.5" fill="var(--bg-sub)" stroke="var(--line)"/><ellipse cx="24" cy="12" rx="8" ry="4.5" fill="var(--tint)" stroke="var(--line)" opacity=".7"/><path d="M14 14q3 2 6 1" stroke="var(--line)" fill="none" opacity=".8"/></svg></span><small></small>`;
    item.querySelector("small").textContent = g.title;
    item.addEventListener("click", () => {
      showToast(g.withdrawnReason ? `暂停理由：${g.withdrawnReason}` : "先放一放的目标，等你想回来的时候它还在");
    });
    row.appendChild(item);
  });
}

function goalProgress(g) {
  const linked = tasks.filter(t => t.goalId === g.id && !t.sealed);
  const nr = linked.filter(t => !t.repeat || t.repeat === "none");
  const rep = linked.filter(t => t.repeat && t.repeat !== "none");
  return {
    nrDone: nr.filter(t => t.completedAt != null).length,
    nrTotal: nr.length,
    repeatDays: rep.reduce((s, t) => s + (t.doneDates || []).length, 0)
  };
}

/* ================= 价值承诺：无完成度、不可划勾，仅手动书写，用来校准重心 ================= */
function savePromises() { return saveJSON("fg_promises", promises); }

function renderPromises() {
  const list = $("promiseList");
  if (!list) return;
  list.innerHTML = "";
  if (!promises.length) {
    const p = document.createElement("p");
    p.className = "promise-empty";
    p.textContent = "还没有写下承诺。它可以很小，只要是你自己想说的。";
    list.appendChild(p);
    return;
  }
  promises.slice().sort((a, b) => b.createdAt - a.createdAt).forEach(pr => {
    const row = document.createElement("div");
    row.className = "promise-item";
    const txt = document.createElement("span");
    txt.className = "promise-text";
    txt.textContent = pr.text;
    const date = document.createElement("small");
    date.className = "promise-date";
    date.textContent = dayKey(pr.createdAt);
    const drop = document.createElement("button");
    drop.className = "quiet-link promise-drop";
    drop.textContent = "轻轻放下";
    drop.addEventListener("click", () => {
      const idx = promises.findIndex(x => x.id === pr.id);
      const removed = promises.splice(idx, 1)[0];
      if (!savePromises()) return;
      renderPromises();
      showSnackbar("已放下这句承诺", () => {
        promises.splice(Math.min(idx, promises.length), 0, removed);
        savePromises();
        renderPromises();
      });
    });
    row.appendChild(txt); row.appendChild(date); row.appendChild(drop);
    list.appendChild(row);
  });
}

$("promiseAdd").addEventListener("click", addPromise);
$("promiseInput").addEventListener("keydown", (e) => { if (e.key === "Enter") addPromise(); });
function addPromise() {
  const inp = $("promiseInput");
  const text = inp.value.trim();
  if (!text) return;
  promises.push({ id: uid("pr"), text, createdAt: Date.now() });
  if (!savePromises()) return;
  inp.value = "";
  renderPromises();
  showToast("记下了。它会安静待在这里，不催你完成");
}


/* 日历右下角：设立目标（名 / 日期 / 标签） */
$("calGoalBtn").addEventListener("click", () => {
  openOverlay((card, close) => {
    const t = document.createElement("div");
    t.className = "ov-title"; t.textContent = "设立目标";
    const inp = document.createElement("input");
    inp.className = "ov-input";
    inp.maxLength = 30;
    inp.placeholder = "写下它，任务就能归到它下面";
    const rows = document.createElement("div");
    rows.className = "ed-rows";

    const dateBtn = document.createElement("button");
    dateBtn.className = "ed-field";
    let curDate = todayKey();
    const dateLbl = document.createElement("span");
    const drawDate = () => { dateLbl.textContent = "目标日 · " + curDate; };
    drawDate();
    dateBtn.appendChild(dateLbl);
    dateBtn.addEventListener("click", () => {
      const d = keyToDate(curDate);
      openMonthPicker(d.getFullYear(), d.getMonth() + 1, (k) => { curDate = k; drawDate(); });
    });

    const tagInp = document.createElement("input");
    tagInp.className = "ed-field";
    tagInp.maxLength = 20;
    tagInp.setAttribute("list", "tagList");
    tagInp.placeholder = "标签（可不填，多个用逗号隔开）";
    refreshTagDatalist();

    rows.appendChild(dateBtn); rows.appendChild(tagInp);

    // 写给未来 · 时光信（可选，不影响目标本身）
    const budWrap = document.createElement("div");
    budWrap.className = "bud-fields";
    const budLbl = document.createElement("div");
    budLbl.className = "bud-fields-label";
    budLbl.textContent = "写给未来的自己 · 时光信（可选）";
    const budDate = document.createElement("input");
    budDate.type = "date";
    budDate.className = "ed-field bud-unlock-date";
    budDate.min = dayKey(Date.now() + DAY);
    budDate.setAttribute("aria-label", "时光信解锁日期");
    const budText = document.createElement("textarea");
    budText.className = "bud-letter-text";
    budText.maxLength = 160;
    budText.rows = 2;
    budText.placeholder = "到时候想对自己说的话（可不填）";
    budWrap.appendChild(budLbl); budWrap.appendChild(budDate); budWrap.appendChild(budText);

    const act = document.createElement("div");
    act.className = "ov-actions";
    const ok = document.createElement("button");
    ok.className = "soft-btn mini"; ok.textContent = "立好";
    ok.addEventListener("click", () => {
      const v = inp.value.trim();
      if (!v) return;
      const budDateVal = budDate.value;
      if (budDateVal && budDateVal <= todayKey()) {
        showToast("时光信要写给未来的日子，换一天试试"); return;
      }
      const gid = uid("g");
      goals.push({
        id: gid, title: v, createdAt: Date.now(),
        date: curDate,
        tags: tagInp.value.trim() ? tagInp.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) : []
      });
      if (!saveJSON("fg_goals", goals)) return;
      if (budDateVal && window.GardenLetters && typeof window.GardenLetters.create === "function") {
        window.GardenLetters.create({ goalId: gid, text: budText.value.trim(), unlockDate: budDateVal });
      }
      renderGoals(); renderTasksPage(); renderDateStrip(); renderCalendar();
      showToast("目标立好了");
      close();
    });
    const no = document.createElement("button");
    no.className = "soft-btn mini ghost"; no.textContent = "先想想";
    no.addEventListener("click", close);
    act.appendChild(ok); act.appendChild(no);
    card.appendChild(t); card.appendChild(inp); card.appendChild(rows); card.appendChild(budWrap); card.appendChild(act);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") ok.click(); });
    setTimeout(() => inp.focus(), 50);
  });
});

/* ================= 添加任务/待办弹窗（类型切换，提醒仅待办） ================= */
function openTaskEditor(pref) {
  pref = pref || {};
  const editing = pref.editId ? tasks.find(x => x.id === pref.editId) : null;
  openOverlay((card, close) => {
    const title = document.createElement("div");
    title.className = "ov-title";
    title.textContent = editing ? "编辑任务" : "添加任务";
    const inp = document.createElement("input");
    inp.className = "ov-input";
    inp.maxLength = 50;
    inp.value = editing ? editing.text : (pref.text || "");
    inp.placeholder = "要做点什么";
    const counter = document.createElement("div");
    counter.className = "char-counter";
    const drawCounter = () => {
      counter.textContent = inp.value.length + "/50";
      counter.classList.toggle("warn", inp.value.length >= 45); // 柔和暖色提示，不标红
    };
    drawCounter();
    inp.addEventListener("input", drawCounter);

    // 类型：任务 / 待办
    let type = editing ? "task" : (pref.type || "task");
    let curDate = editing ? effPlanDate(editing) : (pref.dateKey || todayKey());
    const typeRow = document.createElement("div");
    typeRow.className = "ed-type-row";
    const bTask = document.createElement("button");
    bTask.className = "soft-btn mini";
    bTask.textContent = "任务";
    const bTodo = document.createElement("button");
    bTodo.className = "soft-btn mini ghost";
    bTodo.textContent = "待办";
    typeRow.appendChild(bTask); typeRow.appendChild(bTodo);
    function drawType() {
      typeRow.hidden = !!editing;
      bTask.className = "soft-btn mini" + (type === "task" ? "" : " ghost");
      bTodo.className = "soft-btn mini" + (type === "todo" ? "" : " ghost");
      title.textContent = editing ? "编辑任务" : (type === "task" ? "添加任务" : "添加待办");
      dateBtn.hidden = type === "todo";
      remindRow.hidden = type !== "todo";
      effortRow.hidden = type !== "task";
    }
    bTask.addEventListener("click", () => { type = "task"; drawType(); });
    bTodo.addEventListener("click", () => { type = "todo"; drawType(); });

    const rows = document.createElement("div");
    rows.className = "ed-rows";

    const dateBtn = document.createElement("button");
    dateBtn.className = "ed-field";
    const dateLbl = document.createElement("span");
    const drawDate = () => { dateLbl.textContent = "哪天 · " + curDate; };
    drawDate();
    dateBtn.appendChild(dateLbl);
    dateBtn.addEventListener("click", () => {
      const d = keyToDate(curDate);
      openMonthPicker(d.getFullYear(), d.getMonth() + 1, (k) => { curDate = k; drawDate(); });
    });

    const timeInp = document.createElement("input");
    timeInp.type = "time";
    timeInp.className = "ed-field ed-time";
    timeInp.value = editing ? (editing.time || "") : (pref.time || "");

    const tagInp = document.createElement("input");
    tagInp.className = "ed-field";
    tagInp.maxLength = 40;
    tagInp.setAttribute("list", "tagList");
    tagInp.placeholder = "标签（可不填，多个用逗号隔开）";
    if (editing) tagInp.value = (editing.tags || []).join("，");
    refreshTagDatalist();

    const goalSel = document.createElement("select");
    goalSel.className = "ed-field";
    const optNone = document.createElement("option");
    optNone.value = ""; optNone.textContent = "不归到目标下";
    goalSel.appendChild(optNone);
    goals.forEach(g => {
      const o = document.createElement("option");
      o.value = g.id; o.textContent = g.title;
      goalSel.appendChild(o);
    });
    if (pref.goalId) goalSel.value = pref.goalId;
    else if (editing && editing.goalId) goalSel.value = editing.goalId;
    else if (selectedGoalId) goalSel.value = selectedGoalId;

    const effortRow = document.createElement("label");
    effortRow.className = "effort-field";
    const effortLabel = document.createElement("span"); effortLabel.textContent = "这件事需要多少精力？（可选）";
    const effortSel = document.createElement("select"); effortSel.className = "ed-field"; effortSel.id = "taskEffort";
    [["","暂不标记"],["light","轻松上手 · 一点精力就好"],["medium","适中投入 · 按平常的节奏"],["deep","需要专心 · 留一段完整时间"]].forEach(([value,label])=>{
      const option = document.createElement("option");option.value=value;option.textContent=label;effortSel.appendChild(option);
    });
    effortSel.value = editing?.effort || pref.effort || "";
    const effortHint = document.createElement("small");effortHint.textContent = "心情疲惫时，会优先推荐标为「轻松上手」的今日任务。";
    effortRow.append(effortLabel,effortSel,effortHint);

    // 到点提醒（仅待办）
    let remindOn = false;
    const remindRow = document.createElement("div");
    remindRow.className = "ed-remind-row";
    remindRow.hidden = true;
    const remindBtn = document.createElement("button");
    remindBtn.className = "ed-field";
    remindBtn.textContent = "到点提醒：关";
    const remindInp = document.createElement("input");
    remindInp.type = "datetime-local";
    remindInp.className = "ed-field ed-time";
    remindInp.hidden = true;
    remindBtn.addEventListener("click", () => {
      remindOn = !remindOn;
      remindBtn.textContent = "到点提醒：" + (remindOn ? "开" : "关");
      remindInp.hidden = !remindOn;
    });
    remindRow.appendChild(remindBtn); remindRow.appendChild(remindInp);

    rows.appendChild(typeRow); rows.appendChild(dateBtn); rows.appendChild(timeInp);
    rows.appendChild(tagInp); rows.appendChild(goalSel); rows.appendChild(effortRow); rows.appendChild(remindRow);
    drawType();

    const act = document.createElement("div");
    act.className = "ov-actions";
    const ok = document.createElement("button");
    ok.className = "soft-btn mini"; ok.textContent = editing ? "保存修改" : "放进去";
    ok.addEventListener("click", () => {
      const text = inp.value.trim();
      if (!text) { inp.classList.add("invalid"); inp.focus(); return; } // Inline Validation
      inp.classList.remove("invalid");
      const tags = tagInp.value.trim()
        ? tagInp.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
      const now = Date.now();
      if (editing) {
        const current = tasks.find(t => t.id === editing.id);
        if (!current) { showToast("这条任务已被删除，请重新添加"); return; }
        current.text = text;
        current.time = timeInp.value || null;
        current.planDate = curDate;
        current.tags = tags;
        current.goalId = goalSel.value || null;
        current.effort = effortSel.value || null;
        current.lastMovedAt = now;
        if (!saveTasks(tasks)) return;
      } else if (type === "todo") {
        const remindTs = remindOn && remindInp.value ? new Date(remindInp.value).getTime() : null;
        todos.push({ id: uid("td"), text, tags, remindAt: remindTs, remindFired: null, done: false, createdAt: now });
        if (!saveJSON("fg_todos", todos)) return;
      } else {
        tasks.push({
          id: uid("t"), text,
          createdAt: now, completedAt: null, lastMovedAt: now,
          planDate: curDate, time: timeInp.value || null,
          repeat: "none", doneDates: [],
          sealed: false, sealedAt: null, firstCompletedAt: null,
          goalId: goalSel.value || null,
          tags, effort: effortSel.value || null
        });
        if (!saveTasks(tasks)) return;
      }
      renderToday(); renderCalendar(); renderTasksPage(); renderGoals(); renderTodoAdmin();
      showToast("已经放好了");
      close();
    });
    const no = document.createElement("button");
    no.className = "soft-btn mini ghost"; no.textContent = "取消";
    no.addEventListener("click", close);
    act.appendChild(ok); act.appendChild(no);

    card.appendChild(title); card.appendChild(inp); card.appendChild(counter); card.appendChild(rows); card.appendChild(act);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") ok.click(); });
    setTimeout(() => inp.focus(), 50);
  });
}

function refreshTagDatalist() {
  const dl = $("tagList");
  dl.innerHTML = "";
  allTags().forEach(tag => {
    const o = document.createElement("option");
    o.value = tag;
    dl.appendChild(o);
  });
}

$("addTaskBtn").addEventListener("click", () => openTaskEditor({ dateKey: todayKey() }));
$("addTaskMini").addEventListener("click", () => openTaskEditor({ dateKey: todayKey() }));

/* ================= 今日：任务时间轴 ================= */
const searchInput = $("searchInput"), searchSug = $("searchSug");
let searchQ = "";

searchInput.addEventListener("input", () => {
  searchQ = searchInput.value.trim();
  renderToday();
});
searchInput.addEventListener("blur", () => {
  setTimeout(() => { searchSug.hidden = true; }, 180);
});

function matchQuery(t, q) {
  if (!q) return true;
  const g = goals.find(x => x.id === t.goalId);
  return (t.text || "").includes(q)
    || (t.tags || []).some(tag => tag.includes(q))
    || (g && (g.title.includes(q) || (g.tags || []).some(tag => tag.includes(q))));
}

function timeToMin(hm) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/* 时间轴：主界面只显示已有的条目（紧凑连线）；点开才显示完整 0-24h 刻度轴 */
const TL_HOUR_H = 46; // 每小时像素高
let tasksTimelineFull = false, todosTimelineFull = false;

function buildTimeline(wrap, timed, loose, full) {
  if (full && timed.length > 0) {
    const tl = document.createElement("div");
    tl.className = "day-timeline";
    const rail = document.createElement("div");
    rail.className = "dt-rail";
    tl.appendChild(rail);
    for (let h = 0; h <= 24; h += 3) {
      const lbl = document.createElement("div");
      lbl.className = "dt-hour";
      lbl.textContent = pad2(h % 24) + ":00";
      lbl.style.top = (h * TL_HOUR_H) + "px";
      tl.appendChild(lbl);
    }
    timed.sort((a, b) => a.min - b.min);
    let lastBottom = 0;
    timed.forEach(({ min, row }) => {
      const item = document.createElement("div");
      item.className = "dt-item";
      item.appendChild(row);
      tl.appendChild(item);
      let y = min / 60 * TL_HOUR_H;
      const hgt = item.offsetHeight;
      if (y < lastBottom + 4) y = lastBottom + 4;
      item.style.top = y + "px";
      lastBottom = y + hgt;
    });
    tl.style.height = Math.max(24 * TL_HOUR_H, lastBottom + 8) + "px";
    wrap.appendChild(tl);
    if (loose.length) {
      const lbl = document.createElement("div");
      lbl.className = "dt-loose-label";
      lbl.textContent = "时间随你";
      wrap.appendChild(lbl);
      const box = document.createElement("div");
      box.className = "tl-tasks";
      loose.forEach(el => box.appendChild(el));
      wrap.appendChild(box);
    }
  } else {
    // 紧凑模式：只有条目本身，竖线把现有节点串起来，不画空刻度
    if (timed.length + loose.length === 0) return;
    timed.sort((a, b) => a.min - b.min);
    const box = document.createElement("div");
    box.className = "mini-timeline";
    timed.forEach(({ row }) => box.appendChild(row));
    loose.forEach(el => box.appendChild(el));
    wrap.appendChild(box);
  }
  applyStagger(wrap);
}

/* Stagger 错峰入场：列表每项延迟 50ms 淡入 */
function applyStagger(container) {
  if (!container) return;
  Array.from(container.querySelectorAll(":scope > .task-row, :scope > .todo-row, :scope > .tl-row, :scope > .tl-task, .mini-timeline > .task-row, .mini-timeline > .todo-row, .day-timeline .tl-tasks > .task-row, .day-timeline .tl-tasks > .todo-row"))
    .forEach((el, i) => {
      el.classList.remove("stagger-item");
      void el.offsetWidth;
      el.classList.add("stagger-item");
      el.style.animationDelay = Math.min(i * 50, 500) + "ms";
    });
}

function renderColToggle(wrap, full, timedCount, set) {
  if (timedCount === 0) return;
  const btn = document.createElement("button");
  btn.className = "add-mini tl-toggle";
  btn.textContent = full ? "收起全天" : "点开看全天";
  btn.addEventListener("click", () => set(!full));
  wrap.appendChild(btn);
}

function renderToday() {
  const key = todayKey();
  // 任务列
  let list = tasks.filter(t => !t.sealed && occursOn(t, key) && matchQuery(t, searchQ));
  list.sort((a, b) => {
    const at = a.time || "99:99", bt = b.time || "99:99";
    if (at !== bt) return at < bt ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
  const wrap = $("todayTasks");
  wrap.innerHTML = "";
  const timedTasks = list.filter(t => t.time)
    .map(t => ({ min: timeToMin(t.time), row: makeTaskRow(t, key) }));
  const looseTasks = list.filter(t => !t.time).map(t => makeTaskRow(t, key));
  buildTimeline(wrap, timedTasks, looseTasks, tasksTimelineFull);
  renderColToggle(wrap, tasksTimelineFull, timedTasks.length, v => { tasksTimelineFull = v; renderToday(); });
  const emptyBtn = $("addTaskBtn"), miniBtn = $("addTaskMini");
  if (list.length === 0) {
    emptyBtn.hidden = !!searchQ;
    miniBtn.hidden = true;
  } else {
    emptyBtn.hidden = true;
    miniBtn.hidden = false;
  }
  // 待办列
  renderTodayTodos();
  renderSearchSug();
}

/* 单行任务：时间 chip（磨砂圆角+黑体）+ 文本 + 标签 */
function makeTaskRow(t, dateKey, opts) {
  opts = opts || {};
  const el = document.createElement("div");
  el.className = "task-row" + (doneOn(t, dateKey) ? " done" : "");
  el.dataset.id = t.id;

  const tick = document.createElement("div");
  tick.className = "row-tick";
  el.appendChild(tick);

  const chip = fmtTimeChip(t);
  if (chip && !opts.showDate) {
    const tm = document.createElement("div");
    tm.className = "row-time";
    tm.textContent = chip;
    el.appendChild(tm);
  }
  if (opts.showDate) {
    const dm = document.createElement("div");
    dm.className = "row-time row-date";
    dm.textContent = dateKey.slice(5).replace("-", ".");
    el.appendChild(dm);
  }

  const body = document.createElement("div");
  body.className = "row-body";
  const txt = document.createElement("div");
  txt.className = "row-text";
  txt.textContent = t.text;
  body.appendChild(txt);
  const metaBits = [];
  if (t.effort) metaBits.push({cls:"tag-chip effort-chip",text:{light:"轻松上手",medium:"适中投入",deep:"需要专心"}[t.effort]});
  if (t.repeat && t.repeat !== "none") metaBits.push({ cls: "tag-chip", text: { daily: "每天", weekly: "每周", monthly: "每月" }[t.repeat] });
  (t.tags || []).forEach(tag => metaBits.push({ cls: "tag-chip", text: tag }));
  if (t.goalId) {
    const g = goals.find(x => x.id === t.goalId);
    if (g) metaBits.push({ cls: "tag-chip goal-chip", text: g.title });
  }
  if (opts.remind) metaBits.push({ cls: "tag-chip", text: "提醒 " + fmtRemind(opts.remind) });
  if (metaBits.length) {
    const meta = document.createElement("div");
    meta.className = "row-meta";
    metaBits.forEach(b => {
      const s = document.createElement("span");
      s.className = b.cls;
      s.textContent = b.text;
      meta.appendChild(s);
    });
    body.appendChild(meta);
  }
  el.appendChild(body);
  const actions = document.createElement("div"); actions.className = "row-actions";
  const focus = document.createElement("button"); focus.className = "row-icon"; focus.textContent = "▷";
  focus.setAttribute("aria-label", "专注于：" + t.text); focus.title = "开始专注";
  focus.addEventListener("click", e => {
    e.stopPropagation();
    if (pomo.running || pomo.sessionId) { showToast("请先完成或结束当前专注"); return; }
    pomo.taskId = t.id; saveJSON("fg_pomo", pomo); renderPomo(); location.hash = "tools";
  });
  const more = document.createElement("button"); more.className = "row-icon"; more.textContent = "⋯";
  more.setAttribute("aria-label", "任务操作：" + t.text); more.title = "编辑、封存或删除";
  more.addEventListener("click", e => { e.stopPropagation(); openTaskMenu(t.id, dateKey); });
  actions.append(focus, more); el.appendChild(actions);
  bindRow(el, t.id, dateKey, opts);
  return el;
}

function bindRow(el, id, dateKey, opts) {
  let clickTimer = null, timer = null, held = false;
  const tick = el.querySelector(".row-tick");
  tick.setAttribute("role", "checkbox"); tick.tabIndex = 0;
  tick.setAttribute("aria-checked", String(doneOn(tasks.find(t => t.id === id), dateKey)));
  tick.setAttribute("aria-label", "完成任务：" + tasks.find(t => t.id === id).text);
  tick.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleRowDone(el, id, dateKey, opts); } });
  el.addEventListener("click", e => {
    if (held || e.target.closest("button,input")) return;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => toggleRowDone(el, id, dateKey, opts), 260);
  });
  el.addEventListener("pointerdown", e => {
    if (e.target.closest("button,input")) return;
    held = false;
    timer = setTimeout(() => { held = true; clearTimeout(clickTimer); openTaskMenu(id, dateKey); }, 550);
  });
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  el.addEventListener("pointerup", cancel);
  el.addEventListener("pointerleave", cancel);
  el.addEventListener("pointercancel", cancel);
  el.addEventListener("contextmenu", (e) => { e.preventDefault(); openTaskMenu(id, dateKey); });
  el.addEventListener("dblclick", (e) => { if (e.target.closest("button,input")) return; e.preventDefault(); clearTimeout(clickTimer); inlineEditTask(el, id, dateKey); });
}

/* Inline Edit：双击任务文字原地编辑 */
function inlineEditTask(el, id, dateKey) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const txt = el.querySelector(".row-text");
  if (!txt || el.querySelector(".inline-edit")) return;
  const inp = document.createElement("input");
  inp.className = "inline-edit";
  inp.maxLength = 50;
  inp.value = t.text;
  txt.replaceWith(inp);
  inp.focus();
  inp.setSelectionRange(inp.value.length, inp.value.length);
  let closed = false;
  const commit = () => {
    if (closed) return;
    closed = true;
    const v = inp.value.trim();
    if (v && v !== t.text) {
      t.text = v;
      t.lastMovedAt = Date.now();
      if (!saveTasks(tasks)) return;
    }
    renderToday(); renderCalendar(); renderTasksPage();
  };
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { closed = true; renderToday(); }
  });
  inp.addEventListener("blur", commit);
}
document.addEventListener("contextmenu", (e) => {
  if (e.target.closest(".task-row")) e.preventDefault();
});

function toggleRowDone(el, id, dateKey) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const wasDone = doneOn(t, dateKey);
  if (t.repeat && t.repeat !== "none") {
    if (wasDone) t.doneDates = t.doneDates.filter(d => d !== dateKey);
    else t.doneDates.push(dateKey);
  } else if (wasDone) {
    t.completedAt = null;
  } else {
    t.completedAt = Date.now();
    t.lastMovedAt = Date.now();
    if (!t.firstCompletedAt) t.firstCompletedAt = Date.now();
    el.style.background = "linear-gradient(160deg, var(--warm), var(--crystal-b))";
    el.classList.add("row-success"); // Success 反馈：水晶柔光脉冲
    setTimeout(() => { el.style.background = ""; el.classList.remove("row-success"); }, 600);
  }
  if (!saveTasks(tasks)) return;
  renderToday();
  renderCalendar();
  renderTasksPage();
  renderGoals();
}

/* 长按/右键菜单：标记完成（划掉）/ 编辑 / 删除 */
function openTaskMenu(id, dateKey) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const done = doneOn(t, dateKey);
  openOverlay((card, close) => {
    const title = document.createElement("div");
    title.className = "ov-title";
    title.textContent = t.text;
    const menu = document.createElement("div");
    menu.className = "menu-list";

    const bDone = document.createElement("button");
    bDone.className = "soft-btn";
    bDone.textContent = done ? "取消划掉" : "标记完成（划掉）";
    bDone.addEventListener("click", () => {
      close();
      const el = document.querySelector('.task-row[data-id="' + id + '"]');
      if (el) toggleRowDone(el, id, dateKey);
      else {
        if (t.repeat && t.repeat !== "none") {
          if (done) t.doneDates = t.doneDates.filter(d => d !== dateKey);
          else t.doneDates.push(dateKey);
        } else {
          t.completedAt = done ? null : Date.now();
          if (!done && !t.firstCompletedAt) t.firstCompletedAt = Date.now();
        }
        if (!saveTasks(tasks)) return;
        renderToday(); renderCalendar(); renderTasksPage(); renderGoals();
      }
    });

    const bEdit = document.createElement("button");
    bEdit.className = "soft-btn";
    bEdit.textContent = "编辑";
    bEdit.addEventListener("click", () => {
      close();
      openTaskEditor({ editId: id, dateKey });
    });

    const bSeal = document.createElement("button");
    bSeal.className = "soft-btn ghost"; bSeal.textContent = "暂时封存到情绪空间";
    bSeal.addEventListener("click", () => {
      t.sealed = true; t.sealedAt = Date.now();
      if (!saveTasks(tasks)) return;
      close(); showToast("放进封存池了，想继续时可以捞回来");
    });
    const bDel = document.createElement("button");
    bDel.className = "soft-btn";
    bDel.textContent = "删除";
    bDel.addEventListener("click", () => {
      close();
      openConfirm("删除任务", "把「" + t.text + "」从花园里收走吗？", "收走", () => {
        const idx = tasks.findIndex(x => x.id === id);
        const removed = tasks.splice(idx, 1)[0];
        const previousQuadrant = quadrant[id];
        delete quadrant[id];
        if (!saveRecordBatch({ fg_tasks: tasks, fg_quadrant: quadrant })) return;
        renderToday(); renderCalendar(); renderTasksPage(); renderGoals();
        showSnackbar("已删掉「" + removed.text + "」", () => {
          tasks.splice(Math.min(idx, tasks.length), 0, removed);
          if (previousQuadrant) quadrant[id] = previousQuadrant;
          if (!saveRecordBatch({ fg_tasks: tasks, fg_quadrant: quadrant })) return;
          renderToday(); renderCalendar(); renderTasksPage(); renderGoals();
        });
      });
    });

    menu.append(bDone, bEdit, bSeal, bDel);
    card.appendChild(title); card.appendChild(menu);
  });
}

/* ================= 今日：待办列 ================= */
const todoQuick = $("todoQuick");
todoQuick.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const v = todoQuick.value.trim();
  if (!v) return;
  todos.push({ id: uid("td"), text: v, tags: [], remindAt: null, remindFired: null, done: false, createdAt: Date.now() });
  if (!saveJSON("fg_todos", todos)) return;
  todoQuick.value = "";
  refreshTagDatalist();
  renderToday();
  if (!$("sub-todo").hidden) renderTodoAdmin();
});

function todosForDay(key) {
  return todos.filter(td => {
    if (td.done) return false;
    if (!td.remindAt) return key === todayKey();
    return dayKey(td.remindAt) <= key;
  }).sort((a, b) => (a.remindAt || Infinity) - (b.remindAt || Infinity));
}

function renderTodayTodos() {
  const wrap = $("todayTodos");
  wrap.innerHTML = "";
  const key = todayKey();
  const list = todosForDay(key).filter(td => matchQuery(td, searchQ));
  const invite = $("todoInvite");
  invite.hidden = list.length > 0 || !!searchQ;
  const timed = list.filter(td => td.remindAt)
    .map(td => ({ min: new Date(td.remindAt).getHours() * 60 + new Date(td.remindAt).getMinutes(), row: makeTodoRow(td) }));
  const loose = list.filter(td => !td.remindAt).map(td => makeTodoRow(td));
  buildTimeline(wrap, timed, loose, todosTimelineFull);
  renderColToggle(wrap, todosTimelineFull, timed.length, v => { todosTimelineFull = v; renderToday(); });
}

function makeTodoRow(td, admin) {
  const el = document.createElement("div");
  el.className = "task-row todo-row" + (td.done ? " done" : "");
  el.dataset.tid = td.id;

  const tick = document.createElement("div");
  tick.className = "row-tick";
  el.appendChild(tick);

  if (td.remindAt) {
    const tm = document.createElement("div");
    tm.className = "row-time row-date";
    tm.textContent = fmtRemind(td.remindAt);
    el.appendChild(tm);
  }

  const body = document.createElement("div");
  body.className = "row-body";
  const txt = document.createElement("div");
  txt.className = "row-text";
  txt.textContent = td.text;
  body.appendChild(txt);
  if ((td.tags || []).length) {
    const meta = document.createElement("div");
    meta.className = "row-meta";
    td.tags.forEach(tag => {
      const s = document.createElement("span");
      s.className = "tag-chip";
      s.textContent = tag;
      meta.appendChild(s);
    });
    body.appendChild(meta);
  }
  el.appendChild(body);

  if (admin) {
    const act = document.createElement("div");
    act.className = "row-actions";
    const bEdit = document.createElement("button");
    bEdit.className = "row-act"; bEdit.textContent = "编辑";
    bEdit.addEventListener("click", (e) => { e.stopPropagation(); openTodoEditor(td); });
    const bDel = document.createElement("button");
    bDel.className = "row-act"; bDel.textContent = "删除";
    bDel.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = todos.findIndex(x => x.id === td.id);
      const removed = todos.splice(idx, 1)[0];
      if (!saveJSON("fg_todos", todos)) return;
      renderTodoAdmin(); renderToday(); renderCalendar();
      showSnackbar("已删除待办", () => {
        todos.splice(Math.min(idx, todos.length), 0, removed);
        if (!saveJSON("fg_todos", todos)) return;
        renderTodoAdmin(); renderToday();
      });
    });
    act.appendChild(bEdit); act.appendChild(bDel);
    el.appendChild(act);
  }

  el.addEventListener("click", () => {
    td.done = !td.done;
    if (!saveJSON("fg_todos", todos)) return;
    renderTodayTodos();
    if (!$("sub-todo").hidden) renderTodoAdmin();
    renderCalendar();
  });
  return el;
}

/* ================= 待办闹铃：音效 + 提醒弹窗 ================= */
function checkAlarms() {
  const now = Date.now();
  todos.forEach(td => {
    if (td.done || !td.remindAt || td.remindFired) return;
    if (now >= td.remindAt) {
      td.remindFired = now;
      if (!saveJSON("fg_todos", todos)) return;
      fireAlarm(td);
    }
  });
}
function fireAlarm(td) {
  playChime();
  openOverlay((card, close) => {
    const t = document.createElement("div");
    t.className = "ov-title alarm-title";
    t.textContent = "到点啦";
    const txt = document.createElement("div");
    txt.className = "alarm-text";
    txt.textContent = td.text;
    card.appendChild(t); card.appendChild(txt);
    if ((td.tags || []).length) {
      const meta = document.createElement("div");
      meta.className = "row-meta";
      td.tags.forEach(tag => {
        const s = document.createElement("span");
        s.className = "tag-chip"; s.textContent = tag;
        meta.appendChild(s);
      });
      card.appendChild(meta);
    }
    const act = document.createElement("div");
    act.className = "ov-actions";
    const ok = document.createElement("button");
    ok.className = "soft-btn mini"; ok.textContent = "好，这就去";
    ok.addEventListener("click", () => {
      td.done = true;
      if (!saveJSON("fg_todos", todos)) return;
      renderTodayTodos();
      if (!$("sub-todo").hidden) renderTodoAdmin();
      close();
    });
    const later = document.createElement("button");
    later.className = "soft-btn mini ghost"; later.textContent = "10 分钟后再响";
    later.addEventListener("click", () => {
      td.remindAt = Date.now() + 10 * 60 * 1000;
      td.remindFired = null;
      if (!saveJSON("fg_todos", todos)) return;
      close();
    });
    const no = document.createElement("button");
    no.className = "soft-btn mini ghost"; no.textContent = "先关掉";
    no.addEventListener("click", close);
    act.appendChild(ok); act.appendChild(later); act.appendChild(no);
    card.appendChild(act);
  });
}

/* ================= 今日：搜索建议 ================= */
function renderSearchSug() {
  const q = searchQ;
  if (!q) { searchSug.hidden = true; searchSug.innerHTML = ""; return; }
  searchSug.innerHTML = "";
  let has = false;

  const tags = allTags().filter(tag => tag.includes(q)).slice(0, 4);
  if (tags.length) {
    has = true;
    const lbl = document.createElement("div");
    lbl.className = "sug-label"; lbl.textContent = "标签";
    searchSug.appendChild(lbl);
    tags.forEach(tag => {
      const item = document.createElement("div");
      item.className = "sug-item";
      item.textContent = "# " + tag;
      item.addEventListener("mousedown", () => {
        searchInput.value = tag; searchQ = tag; renderToday();
      });
      searchSug.appendChild(item);
    });
  }

  const gs = goals.filter(g => g.title.includes(q)).slice(0, 2);
  gs.forEach(g => {
    has = true;
    const lbl = document.createElement("div");
    lbl.className = "sug-label"; lbl.textContent = "目标 · " + g.title;
    searchSug.appendChild(lbl);
    tasks.filter(t => t.goalId === g.id && !t.sealed).slice(0, 4).forEach(t => {
      const item = document.createElement("div");
      item.className = "sug-item";
      item.textContent = "· " + t.text;
      item.addEventListener("mousedown", () => {
        searchInput.value = t.text; searchQ = t.text; renderToday();
      });
      searchSug.appendChild(item);
    });
    if (tasks.filter(t => t.goalId === g.id && !t.sealed).length === 0) {
      const item = document.createElement("div");
      item.className = "sug-item sug-soft";
      item.textContent = "这个目标下还没有任务";
      searchSug.appendChild(item);
    }
  });

  tasks.filter(t => !t.sealed && t.text.includes(q) && !occursOn(t, todayKey())).slice(0, 3).forEach(t => {
    has = true;
    const item = document.createElement("div");
    item.className = "sug-item sug-soft";
    item.textContent = "· " + t.text + "（" + effPlanDate(t) + " 那天）";
    item.addEventListener("mousedown", () => jumpToDate(effPlanDate(t)));
    searchSug.appendChild(item);
  });

  searchSug.hidden = !has;
}

/* ================= 日历 ================= */
const cal = { view: "month", y: 0, m: 0, d: 1, repeat: "none" };
const calTitle = $("calTitle"), calMonth = $("calMonth"), calDayView = $("calDayView");
const calNav = $("calNav");

function initCal() {
  const now = new Date();
  cal.y = now.getFullYear();
  cal.m = now.getMonth() + 1;
  cal.d = now.getDate();
}

function renderCalendar() {
  cal.d = Math.max(1, Math.min(cal.d, new Date(cal.y, cal.m, 0).getDate()));
  const mode = cal.view;
  $("calMonthBtn").className = "soft-btn mini" + (mode === "month" ? "" : " ghost");
  $("calDayBtn").className = "soft-btn mini" + (mode === "day" ? "" : " ghost");
  calMonth.hidden = mode !== "month";
  calDayView.hidden = mode !== "day";
  calNav.hidden = mode !== "month";
  if (mode === "month") renderMonth();
  else renderDay();
}

$("calMonthBtn").addEventListener("click", () => { cal.view = "month"; renderCalendar(); });
$("calDayBtn").addEventListener("click", () => { cal.view = "day"; renderCalendar(); });
$("calPrev").addEventListener("click", () => {
  cal.m--; if (cal.m < 1) { cal.m = 12; cal.y--; }
  renderCalendar();
});
$("calNext").addEventListener("click", () => {
  cal.m++; if (cal.m > 12) { cal.m = 1; cal.y++; }
  renderCalendar();
});
$("backToMonth").addEventListener("click", () => { cal.view = "month"; renderCalendar(); });

function eventsOnDay(key) {
  return events.filter(e => {
    if (e.yearly) return e.date.slice(5) === key.slice(5);
    return e.date === key;
  });
}

function renderMonth() {
  calTitle.textContent = cal.y + " 年 " + cal.m + " 月";
  calMonth.innerHTML = "";
  const offset = (keyToDate(cal.y + "-" + pad2(cal.m) + "-01").getDay() + 6) % 7;
  const last = new Date(cal.y, cal.m, 0).getDate();
  const today = todayKey();
  for (let i = 0; i < 42; i++) {
    const cell = document.createElement("div");
    const n = i - offset + 1;
    if (n < 1 || n > last) {
      cell.className = "cal-cell blank";
      calMonth.appendChild(cell);
      continue;
    }
    const key = cal.y + "-" + pad2(cal.m) + "-" + pad2(n);
    cell.className = "cal-cell" + (key === today ? " today-cell" : "") + (moodEntry(key) ? " mood-day" : "");
    const num = document.createElement("div");
    num.className = "cal-num";
    num.textContent = n;
    cell.appendChild(num);

    // 心情小标识
    if (moodEntry(key)) {
      const md = document.createElement("span");
      md.className = "cal-mood-dot";
      md.title = "这天留下了心情";
      cell.appendChild(md);
    }

    // 当天任务+待办：编号显示在日期下方，最多 2 条，完成的加删除线并降低不透明度，第 3 条起省略
    const dayItems = [];
    tasks.filter(t => !t.sealed && occursOn(t, key))
      .sort((a, b) => {
        const at = a.time || "99:99", bt = b.time || "99:99";
        if (at !== bt) return at < bt ? -1 : 1;
        return a.createdAt - b.createdAt;
      })
      .forEach(t => dayItems.push({
        text: (t.time ? t.time + " " : "") + t.text,
        done: doneOn(t, key)
      }));
    todos.filter(td => td.remindAt && dayKey(td.remindAt) === key)
      .sort((a, b) => a.remindAt - b.remindAt)
      .forEach(td => dayItems.push({
        text: pad2(new Date(td.remindAt).getHours()) + ":" + pad2(new Date(td.remindAt).getMinutes()) + " " + td.text,
        done: !!td.done
      }));
    dayItems.slice(0, 2).forEach((item, idx) => {
      const line = document.createElement("div");
      line.className = "cal-task" + (item.done ? " done" : "");
      line.textContent = (idx + 1) + ". " + item.text;
      cell.appendChild(line);
    });
    if (dayItems.length > 2) {
      const more = document.createElement("div");
      more.className = "cal-more";
      more.textContent = "…";
      cell.appendChild(more);
    }

    // 标记：重要日期（暖字）优先，其次目标标签（按目标日或当天任务归属）
    const evs = eventsOnDay(key);
    if (evs.length) {
      const tag = document.createElement("div");
      tag.className = "cal-tag has-event";
      tag.textContent = evs[0].title;
      cell.appendChild(tag);
    } else {
      const g = goalOn(key) ||
        (tasks.find(t => !t.sealed && occursOn(t, key) && t.goalId) &&
          goals.find(x => x.id === tasks.find(t => !t.sealed && occursOn(t, key) && t.goalId).goalId));
      if (g) {
        const tag = document.createElement("div");
        tag.className = "cal-tag";
        tag.textContent = g.title;
        cell.appendChild(tag);
      }
    }
    cell.addEventListener("click", () => {
      cal.d = n;
      cal.view = "day";
      renderCalendar();
    });
    calMonth.appendChild(cell);
  }
}

const dayTaskInput = $("dayTaskInput");
document.querySelectorAll(".repeat-opt").forEach(b => b.addEventListener("click", () => {
  cal.repeat = b.dataset.repeat;
  document.querySelectorAll(".repeat-opt").forEach(x => x.classList.toggle("active", x === b));
}));
dayTaskInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const v = dayTaskInput.value.trim();
  if (!v) return;
  const key = viewDayKey();
  tasks.push({
    id: uid("t"), text: v,
    createdAt: Date.now(), completedAt: null, lastMovedAt: Date.now(),
    planDate: key, time: null, repeat: cal.repeat, doneDates: [],
    sealed: false, sealedAt: null, firstCompletedAt: null,
    goalId: selectedGoalId || null, tags: []
  });
  if (!saveTasks(tasks)) return;
  dayTaskInput.value = "";
  renderDay(); renderToday(); renderTasksPage();
});

function viewDayKey() {
  return cal.y + "-" + pad2(cal.m) + "-" + pad2(cal.d);
}

/* 日视图：与今日页同款双栏时间轴（每个日期单独点开都和今日一样） */
let dayTlFull = false, dayTodoFull = false, dayTlKey = null;

function renderDay() {
  const key = viewDayKey();
  const d = keyToDate(key);
  $("dayTitle").textContent = (d.getMonth() + 1) + " 月 " + d.getDate() + " 日 " + WEEK_CN[d.getDay()];
  if (dayTlKey !== key) { dayTlKey = key; dayTlFull = false; dayTodoFull = false; }

  // 任务 + 待办双栏
  const wrap = $("dayTasks");
  wrap.innerHTML = "";
  const list = tasks.filter(t => !t.sealed && occursOn(t, key))
    .sort((a, b) => {
      const at = a.time || "99:99", bt = b.time || "99:99";
      if (at !== bt) return at < bt ? -1 : 1;
      return a.createdAt - b.createdAt;
    });
  const cols = document.createElement("div");
  cols.className = "today-cols";
  const colT = document.createElement("div");
  colT.className = "today-col";
  colT.innerHTML = `<div class="block-label">任务</div>`;
  const timedT = list.filter(t => t.time).map(t => ({ min: timeToMin(t.time), row: makeTaskRow(t, key) }));
  const looseT = list.filter(t => !t.time).map(t => makeTaskRow(t, key));
  if (list.length === 0) {
    const tip = document.createElement("p");
    tip.className = "db-empty";
    tip.textContent = "这天没有安排";
    colT.appendChild(tip);
  } else {
    buildTimeline(colT, timedT, looseT, dayTlFull);
    renderColToggle(colT, dayTlFull, timedT.length, v => { dayTlFull = v; renderDay(); });
  }
  const colD = document.createElement("div");
  colD.className = "today-col";
  colD.innerHTML = `<div class="block-label">待办</div>`;
  const tds = todos.filter(td => td.remindAt && dayKey(td.remindAt) === key && !td.done);
  const timedD = tds.map(td => ({ min: new Date(td.remindAt).getHours() * 60 + new Date(td.remindAt).getMinutes(), row: makeTodoRow(td) }));
  if (tds.length === 0) {
    const tip = document.createElement("p");
    tip.className = "db-empty";
    tip.textContent = "这天没有待办提醒";
    colD.appendChild(tip);
  } else {
    buildTimeline(colD, timedD, [], dayTodoFull);
    renderColToggle(colD, dayTodoFull, timedD.length, v => { dayTodoFull = v; renderDay(); });
  }
  cols.appendChild(colT);
  cols.appendChild(colD);
  wrap.appendChild(cols);
  $("dayTodoBlock").hidden = true;
  $("dayTodoBlock").innerHTML = "";

  // 重要日期
  const evB = $("dayEventBlock");
  evB.innerHTML = `<div class="db-title">重要日期</div>`;
  const evs = eventsOnDay(key);
  if (evs.length) {
    evs.forEach(e => {
      const line = document.createElement("div");
      line.className = "day-mood-line has-event-text";
      line.textContent = (e.yearly ? "每年 · " : "") + e.title;
      evB.appendChild(line);
    });
  } else {
    const tip = document.createElement("p");
    tip.className = "db-empty";
    tip.textContent = "这天没有标记的日期";
    evB.appendChild(tip);
  }

  // 心情
  const moodB = $("dayMoodBlock");
  moodB.innerHTML = `<div class="db-title">心情</div>`;
  const me = moodEntry(key);
  if (me && (me.mood != null || me.note)) {
    const line = document.createElement("div");
    line.className = "day-mood-line";
    line.textContent = (me.mood != null ? MOOD_LABELS[me.mood] : "") + (me.note ? " · " + me.note : "");
    moodB.appendChild(line);
  } else {
    const tip = document.createElement("p");
    tip.className = "db-empty";
    tip.textContent = "这天没有留下心情";
    moodB.appendChild(tip);
  }

  // 照片
  const photoB = $("dayPhotoBlock");
  photoB.innerHTML = `<div class="db-title">照片</div>`;
  const dayPhotos = photosCache.filter(p => p.date === key);
  if (dayPhotos.length === 0) {
    const tip = document.createElement("p");
    tip.className = "db-empty";
    tip.textContent = "这天没有照片";
    photoB.appendChild(tip);
  } else {
    const row = document.createElement("div");
    row.className = "day-photo-row";
    dayPhotos.forEach(p => {
      const img = document.createElement("img");
      img.src = p.img;
      img.alt = p.date;
      img.addEventListener("click", () => openPhotoOverlay(p));
      row.appendChild(img);
    });
    photoB.appendChild(row);
  }

  // 罐子
  const jarB = $("dayJarBlock");
  jarB.innerHTML = `<div class="db-title">罐子</div>`;
  const n = jarList.filter(j => j.date === key).length;
  const tip = document.createElement("p");
  tip.className = n > 0 ? "day-mood-line" : "db-empty";
  tip.textContent = n > 0 ? "这天投进去了 " + n + " 句" : "这天没有投进句子";
  jarB.appendChild(tip);
}

/* .ics 导入：把外部日历事件收进重要日期 */
$("icsBtn").addEventListener("click", () => $("icsFile").click());
$("icsFile").addEventListener("change", () => {
  const f = $("icsFile").files && $("icsFile").files[0];
  $("icsFile").value = "";
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "").replace(/\r\n/g, "\n").replace(/\n /g, "");
    let count = 0;
    const blocks = text.split("BEGIN:VEVENT").slice(1);
    blocks.forEach(b => {
      const body = b.split("END:VEVENT")[0];
      const sum = (body.match(/^SUMMARY[^:]*:(.+)$/m) || [])[1];
      const dt = (body.match(/^DTSTART[^:]*(?:;[^:]*)?:(\d{4})(\d{2})(\d{2})/m) || []);
      if (!sum || !dt[1]) return;
      const title = sum.replace(/\\,/g, ",").replace(/\\n/g, " ").trim().slice(0, 30);
      const date = dt[1] + "-" + dt[2] + "-" + dt[3];
      if (events.some(e => e.title === title && e.date === date)) return;
      events.push({ id: uid("e"), title, date, yearly: false });
      count++;
    });
    if (!saveJSON("fg_events", events)) return;
    renderEvents(); renderCalendar();
    showToast(count > 0 ? "收进来 " + count + " 个日期" : "这份日历里没有读到日期");
  };
  reader.readAsText(f);
});

/* ================= 功能：重要日期 ================= */
const eventTitle = $("eventTitle"), eventDate = $("eventDate"),
  eventYearlyBtn = $("eventYearly"), eventAddBtn = $("eventAdd"), eventList = $("eventList");
let eventYearly = false;

eventYearlyBtn.addEventListener("click", () => {
  eventYearly = !eventYearly;
  eventYearlyBtn.dataset.yearly = eventYearly ? "1" : "0";
  eventYearlyBtn.textContent = "每年重复：" + (eventYearly ? "开" : "关");
});
eventAddBtn.addEventListener("click", () => {
  const title = eventTitle.value.trim();
  const date = eventDate.value;
  if (!title || !date) return;
  events.push({ id: uid("e"), title, date, yearly: eventYearly });
  if (!saveJSON("fg_events", events)) return;
  eventTitle.value = "";
  renderEvents(); renderCalendar();
  showToast("已经标好了");
});

function nextOccurrence(e) {
  if (!e.yearly) return e.date;
  const today = todayKey();
  const md = e.date.slice(5);
  let candidate = keyToDate(e.date).getFullYear() + "-" + md;
  if (candidate < today) candidate = (keyToDate(e.date).getFullYear() + 1) + "-" + md;
  return candidate;
}

function renderEvents() {
  eventList.innerHTML = "";
  const today = todayKey();
  const rows = events.map(e => ({ e, next: nextOccurrence(e) }));
  rows.sort((a, b) => {
    const aPast = !a.e.yearly && a.e.date < today;
    const bPast = !b.e.yearly && b.e.date < today;
    if (aPast !== bPast) return aPast ? 1 : -1;
    return a.next < b.next ? -1 : a.next > b.next ? 1 : 0;
  });
  rows.forEach(({ e, next }) => {
    const row = document.createElement("div");
    row.className = "event-row";
    const left = daysFromTo(today, next);
    let leftText;
    if (!e.yearly && e.date < today) leftText = "已经过去了";
    else if (left === 0) { leftText = "就是今天"; row.classList.add("is-today"); }
    else leftText = "还有 " + left + " 天";

    row.innerHTML = `
      <div class="e-title"></div>
      <span class="e-tag"></span>
      <div class="e-date"></div>
      <div class="e-left"></div>
      <button class="e-edit">编辑</button>
      <button class="e-del">删除</button>`;
    row.querySelector(".e-title").textContent = e.title;
    row.querySelector(".e-tag").textContent = e.yearly ? "每年" : "";
    row.querySelector(".e-date").textContent = e.yearly ? next : e.date;
    row.querySelector(".e-left").textContent = leftText;
    row.querySelector(".e-edit").addEventListener("click", () => {
      openOverlay((card, close) => {
        const t = document.createElement("div");
        t.className = "ov-title"; t.textContent = "编辑重要日期";
        const ti = document.createElement("input");
        ti.className = "ov-input"; ti.maxLength = 30; ti.value = e.title;
        const dt = document.createElement("input");
        dt.type = "date"; dt.className = "ov-input"; dt.value = e.date;
        const yb = document.createElement("button");
        yb.className = "soft-btn mini"; yb.textContent = "每年重复：" + (e.yearly ? "开" : "关");
        yb.addEventListener("click", () => {
          e.yearly = !e.yearly;
          yb.textContent = "每年重复：" + (e.yearly ? "开" : "关");
        });
        const act = document.createElement("div");
        act.className = "ov-actions";
        const ok = document.createElement("button");
        ok.className = "soft-btn mini"; ok.textContent = "保存";
        ok.addEventListener("click", () => {
          const v = ti.value.trim();
          if (!v || !dt.value) return;
          e.title = v; e.date = dt.value;
          if (!saveJSON("fg_events", events)) return;
          renderEvents(); renderCalendar();
          close();
        });
        const no = document.createElement("button");
        no.className = "soft-btn mini ghost"; no.textContent = "取消";
        no.addEventListener("click", close);
        act.appendChild(ok); act.appendChild(no);
        card.appendChild(t); card.appendChild(ti); card.appendChild(dt); card.appendChild(yb); card.appendChild(act);
      });
    });
    row.querySelector(".e-del").addEventListener("click", () => {
      const idx = events.findIndex(x => x.id === e.id);
      const removed = events.splice(idx, 1)[0];
      if (!saveJSON("fg_events", events)) return;
      renderEvents(); renderCalendar();
      showSnackbar("已删除「" + removed.title + "」", () => {
        events.splice(Math.min(idx, events.length), 0, removed);
        if (!saveJSON("fg_events", events)) return;
        renderEvents();
      });
    });
    eventList.appendChild(row);
  });
  if (rows.length === 0) {
    const tip = document.createElement("p");
    tip.className = "wall-empty";
    tip.textContent = "还没有重要日期。放一个值得等待的日子进来。";
    eventList.appendChild(tip);
  }
}

/* ================= 功能：番茄钟（可自定义时长 + 预设） ================= */
const POMO_FOCUS = 25 * 60 * 1000, POMO_BREAK = 5 * 60 * 1000;
let pomo = loadJSON("fg_pomo", { date: null, rounds: 0, mode: "focus", left: POMO_FOCUS, focusMs: POMO_FOCUS, running: false, endTs: null });
if (!pomo.focusMs) pomo.focusMs = POMO_FOCUS;
if (pomo.demoRun) { pomo.demoRun = false; if (pomo.running) { pomo.running = false; pomo.endTs = null; pomo.mode = "focus"; pomo.left = pomo.focusMs; } } // 刷新后清掉试用演示态

function ensurePomoDay() {
  const date = todayKey();
  if (pomo.date !== date) {
    pomo.date = date;
    pomo.rounds = focusSessions.filter(s => s.date === date).length;
    if (!saveJSON("fg_pomo", pomo)) return;
  }
}
function recordFocusSession() {
  const id = pomo.sessionId || uid("focus");
  focusSessions = loadJSON("fg_focus_sessions", []);
  if (focusSessions.some(s => s.id === id)) return true;
  const endedAt = pomo.sessionEndedAt || pomo.endTs || Date.now();
  const durationMs = pomo.sessionDuration || pomo.focusMs;
  if (!Number.isFinite(durationMs) || durationMs < 60000 || durationMs > 7200000) return false;
  const record = { id, date: dayKey(endedAt), taskId: pomo.taskId || null, durationMs, completed: true, endedAt };
  const next = [...focusSessions, record];
  if (!saveJSON("fg_focus_sessions", next)) return false;
  focusSessions = next;
  if (typeof renderGrowth === "function") renderGrowth();
  return true;
}
function settleFocus() {
  pomo.sessionEndedAt = pomo.sessionEndedAt || pomo.endTs || Date.now();
  if (!recordFocusSession()) {
    pomo.pendingSave = true; pomo.running = false; pomo.left = 0;
    saveJSON("fg_pomo", pomo); renderPomo();
    showToast("专注已完成，记录尚未保存。腾出空间后点“重试保存”");
    return false;
  }
  pomo.pendingSave = false; pomo.sessionId = null; pomo.sessionDuration = null; pomo.sessionEndedAt = null;
  pomo.rounds = focusSessions.filter(s => s.date === todayKey()).length;
  pomo.mode = "break"; pomo.left = POMO_BREAK;
  pomo.running = true; pomo.endTs = Date.now() + POMO_BREAK;
  saveJSON("fg_pomo", pomo); playChime(); showToast("一颗番茄收好了，歇一会儿");
  return true;
}
function pomoLeft() {
  return pomo.running ? Math.max(0, pomo.endTs - Date.now()) : pomo.left;
}
function renderPomo() {
  ensurePomoDay();
  const box = $("pomoBox");
  const left = pomoLeft();
  const total = pomo.mode === "focus" ? pomo.focusMs : POMO_BREAK;
  const pct = Math.max(0, Math.min(100, (1 - left / total) * 100));
  box.innerHTML = "";
  box.style.setProperty("--p", pct.toFixed(1));

  const mode = document.createElement("div");
  mode.className = "pomo-mode";
  mode.textContent = pomo.mode === "focus" ? "专注" : "歇一会儿";
  box.appendChild(mode);

  const ring = document.createElement("div");
  ring.className = "pomo-ring";
  const time = document.createElement("div");
  time.className = "pomo-time";
  time.textContent = fmtClock(left);
  ring.appendChild(time);
  box.appendChild(ring);

  const taskLabel = document.createElement("label");
  taskLabel.className = "focus-task-label";
  taskLabel.textContent = "这段时间，想专注于";
  const taskSelect = document.createElement("select");
  const noTask = document.createElement("option");
  noTask.value = ""; noTask.textContent = "自由专注"; taskSelect.appendChild(noTask);
  tasks.filter(t => t.id === pomo.taskId || (!t.sealed && !doneOn(t,todayKey()))).forEach(t => {
    const option = document.createElement("option"); option.value=t.id; option.textContent=t.text; taskSelect.appendChild(option);
  });
  taskSelect.value = pomo.taskId || "";
  taskSelect.disabled = pomo.running || !!pomo.sessionId;
  taskSelect.addEventListener("change", () => {
    pomo.taskId=taskSelect.value || null;
    if (!saveJSON("fg_pomo",pomo)) return;
    if (typeof renderFocusContext === "function") renderFocusContext();
  });
  taskLabel.appendChild(taskSelect); box.appendChild(taskLabel);
  // 预设 + 自定义时长（未在计时中时生效）
  const presets = document.createElement("div");
  presets.className = "pomo-presets";
  [5, 10, 15, 25].forEach(min => {
    const b = document.createElement("button");
    b.className = "soft-btn mini" + (pomo.focusMs === min * 60000 ? "" : " ghost");
    b.textContent = min + " 分";
    b.addEventListener("click", () => setPomoMinutes(min));
    presets.appendChild(b);
  });
  const custom = document.createElement("input");
  custom.type = "number";
  custom.min = "1"; custom.max = "120";
  custom.className = "pomo-custom";
  custom.placeholder = "自定义(分)";
  custom.value = "";
  custom.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const v = Math.max(1, Math.min(120, Math.round(Number(custom.value))));
    if (v) setPomoMinutes(v);
    custom.value = "";
    custom.blur();
  });
  presets.appendChild(custom);
  box.appendChild(presets);

  const btns = document.createElement("div");
  btns.className = "pomo-btns";
  const main = document.createElement("button");
  main.className = "soft-btn";
  main.textContent = pomo.pendingSave ? "重试保存" : (pomo.running ? "暂停" : (left < total ? "继续" : "开始"));
  main.addEventListener("click", () => {
    if (pomo.pendingSave) { settleFocus(); renderPomo(); return; }
    ensurePomoDay();
    if (pomo.running) {
      pomo.left = Math.max(0, pomo.endTs - Date.now());
      pomo.running = false; pomo.endTs = null;
    } else {
      if (pomo.mode === "focus" && !pomo.sessionId) {
        pomo.sessionId = uid("focus");
        pomo.sessionDuration = pomo.focusMs;
      }
      pomo.endTs = Date.now() + pomo.left;
      pomo.running = true;
      if (window.GardenCards) window.GardenCards.earnChance("focus");
    }
    if (!saveJSON("fg_pomo", pomo)) return;
    renderPomo();
  });
  const reset = document.createElement("button");
  reset.className = "soft-btn ghost";
  reset.textContent = "结束";
  reset.addEventListener("click", () => {
    if (pomo.pendingSave) { showToast("请先重试保存这次已经完成的专注"); return; }
    pomo.mode = "focus"; pomo.left = pomo.focusMs; pomo.running = false; pomo.endTs = null;
    pomo.sessionId = null; pomo.sessionDuration = null;
    if (!saveJSON("fg_pomo", pomo)) return;
    renderPomo();
  });
  btns.appendChild(main); btns.appendChild(reset);
  box.appendChild(btns);

  const rounds = document.createElement("div");
  rounds.className = "pomo-rounds";
  rounds.textContent = pomo.rounds > 0 ? "今天收了 " + pomo.rounds + " 颗番茄" : "收几颗都好，一颗也算数";
  box.appendChild(rounds);
  // 试用：10 秒版（体验引导，结束后不写专注记录）
  if (!pomo.running && !pomo.pendingSave && !pomo.sessionId && !pomo.demoRun) {
    const demo = document.createElement("button");
    demo.type = "button";
    demo.className = "quiet-link pomo-demo-link";
    demo.textContent = "试用：10 秒版";
    demo.title = "体验引导：跑一个 10 秒的演示，不会记录成真实专注";
    demo.addEventListener("click", () => {
      if (pomo.running || pomo.pendingSave) return;
      pomo.demoRun = true;
      pomo.mode = "focus";
      pomo.left = 10000;
      pomo.endTs = Date.now() + 10000;
      pomo.running = true;
      saveJSON("fg_pomo", pomo);
      renderPomo();
      showToast("试用演示 · 10 秒版开始了，不会记录真实数据");
    });
    box.appendChild(demo);
  }
  if (typeof renderFocusContext === "function") renderFocusContext();
}
function setPomoMinutes(min) {
  if (pomo.pendingSave) { showToast("请先重试保存已经完成的专注"); return; }
  if (pomo.running) { showToast("先暂停或结束当前计时，再设置时长"); return; }
  pomo.sessionId = null; pomo.sessionDuration = null;
  pomo.focusMs = min * 60000;
  if (!pomo.running) { pomo.mode = "focus"; pomo.left = pomo.focusMs; pomo.endTs = null; }
  if (!saveJSON("fg_pomo", pomo)) return;
  renderPomo();
}
setInterval(() => {
  if (!pomo.running) return;
  ensurePomoDay();
  const left = pomoLeft();
  if (left <= 0) {
    if (pomo.demoRun) { // 试用演示：只响提示音，不落任何记录
      pomo.demoRun = false;
      pomo.mode = "focus"; pomo.left = pomo.focusMs;
      pomo.running = false; pomo.endTs = null;
      saveJSON("fg_pomo", pomo);
      playChime();
      showToast("试用演示结束。真实的一段时间，随时可以开始");
      renderPomo();
      return;
    }
    if (pomo.mode === "focus") {
      settleFocus();
    } else {
      pomo.mode = "focus"; pomo.left = pomo.focusMs;
      pomo.running = false; pomo.endTs = null;
      playChime();
      showToast("歇好了，随时可以再来");
    }
    if (!saveJSON("fg_pomo", pomo)) return;
  }
  if (!$("pomoBox").contains(document.activeElement) || left <= 0) renderPomo();
  else {
    const time = $("pomoBox").querySelector(".pomo-time"); if (time) time.textContent = fmtClock(pomoLeft());
    $("pomoBox").style.setProperty("--p", Math.max(0, Math.min(100, (1 - pomoLeft() / (pomo.mode === "focus" ? pomo.focusMs : POMO_BREAK)) * 100)));
  }
}, 1000);

/* ================= 功能：模板工具栏（一键写入今日待办，可增删） ================= */
const TPL_DEFAULT = [
  { id: "tpl_read", text: "每日阅读" },
  { id: "tpl_water", text: "喝够水" },
  { id: "tpl_review", text: "复盘一句" },
  { id: "tpl_words", text: "背单词20个" }
];
let templates = loadJSON("fg_templates", null);
if (!templates) { templates = TPL_DEFAULT.slice(); saveJSON("fg_templates", templates); }

function renderTplBar() {
  const bar = $("tplBar");
  bar.innerHTML = "";
  templates.forEach(tpl => {
    const chip = document.createElement("div");
    chip.className = "tpl-chip";
    const txt = document.createElement("button");
    txt.className = "tpl-use";
    txt.textContent = tpl.text;
    txt.title = "写进今日待办";
    txt.addEventListener("click", () => {
      todos.push({ id: uid("td"), text: tpl.text, tags: [], remindAt: null, remindFired: null, done: false, createdAt: Date.now() });
      if (!saveJSON("fg_todos", todos)) return;
      renderToday(); renderTodoAdmin();
      showToast("已放进今日待办");
    });
    const del = document.createElement("button");
    del.className = "tpl-del";
    del.textContent = "×";
    del.title = "删除模板";
    del.addEventListener("click", () => {
      templates = templates.filter(x => x.id !== tpl.id);
      if (!saveJSON("fg_templates", templates)) return;
      renderTplBar();
    });
    chip.appendChild(txt); chip.appendChild(del);
    bar.appendChild(chip);
  });
  const addRow = document.createElement("div");
  addRow.className = "tpl-add-row";
  const addInp = document.createElement("input");
  addInp.maxLength = 20;
  addInp.placeholder = "加一个模板";
  const addBtn = document.createElement("button");
  addBtn.className = "soft-btn mini";
  addBtn.textContent = "＋";
  addBtn.addEventListener("click", () => {
    const v = addInp.value.trim();
    if (!v) return;
    templates.push({ id: uid("tpl"), text: v });
    if (!saveJSON("fg_templates", templates)) return;
    renderTplBar();
  });
  addInp.addEventListener("keydown", (e) => { if (e.key === "Enter") addBtn.click(); });
  addRow.appendChild(addInp); addRow.appendChild(addBtn);
  bar.appendChild(addRow);
}

/* ================= 思绪整理：想法速记 ================= */
const noteInput = $("noteInput"), noteList = $("noteList"), noteArchivedLine = $("noteArchivedLine");
let showArchived = false;

noteInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const v = noteInput.value.trim();
  if (!v) return;
  notes.unshift({ id: uid("n"), text: v, archived: false, createdAt: Date.now() });
  if (!saveJSON("fg_notes", notes)) return;
  noteInput.value = "";
  renderNotes();
});

/* AI 入口已接入 MCP 插件体系（js/mcp-ui.js），此处不再占位 */

function renderNotes() {
  noteList.innerHTML = "";
  const list = notes.filter(n => showArchived ? n.archived : !n.archived);
  const archCount = notes.filter(n => n.archived).length;
  if (!showArchived && archCount > 0) {
    noteArchivedLine.hidden = false;
    noteArchivedLine.textContent = "已收起 " + archCount + " 条想法 · 点开看看";
  } else if (showArchived) {
    noteArchivedLine.hidden = archCount === 0;
    noteArchivedLine.textContent = "收起来的想法 · 再点一下折回去";
  } else {
    noteArchivedLine.hidden = true;
  }
  if (list.length === 0) {
    const tip = document.createElement("p");
    tip.className = "wall-empty";
    tip.textContent = showArchived ? "这里安安静静的" : "想到什么，随时丢进来";
    noteList.appendChild(tip);
    return;
  }
  list.forEach(n => {
    const row = document.createElement("div");
    row.className = "note-row";
    const txt = document.createElement("div");
    txt.className = "note-text";
    txt.textContent = n.text;
    const meta = document.createElement("div");
    meta.className = "note-meta";
    const d = new Date(n.createdAt);
    const date = document.createElement("span");
    date.textContent = (d.getMonth() + 1) + "月" + d.getDate() + "日";
    meta.appendChild(date);

    if (!n.archived) {
      const bTask = document.createElement("button");
      bTask.textContent = "转成任务";
      bTask.addEventListener("click", () => openTaskEditor({ text: n.text, dateKey: todayKey() }));
      const bTodo = document.createElement("button");
      bTodo.textContent = "转成待办";
      bTodo.addEventListener("click", () => {
        todos.push({ id: uid("td"), text: n.text, tags: [], remindAt: null, remindFired: null, done: false, createdAt: Date.now() });
        if (!saveJSON("fg_todos", todos)) return;
        renderToday();
        showToast("已经放进待办，在今日页能看到");
      });
      const bArch = document.createElement("button");
      bArch.textContent = "收起来";
      bArch.addEventListener("click", () => {
        n.archived = true;
        if (!saveJSON("fg_notes", notes)) return;
        renderNotes();
      });
      meta.appendChild(bTask); meta.appendChild(bTodo); meta.appendChild(bArch);
    } else {
      const bBack = document.createElement("button");
      bBack.textContent = "捞回来";
      bBack.addEventListener("click", () => {
        n.archived = false;
        if (!saveJSON("fg_notes", notes)) return;
        renderNotes();
      });
      const bDel = document.createElement("button");
      bDel.textContent = "删掉";
      bDel.addEventListener("click", () => {
        const idx = notes.findIndex(x => x.id === n.id);
        const removed = notes.splice(idx, 1)[0];
        if (!saveJSON("fg_notes", notes)) return;
        renderNotes();
        showSnackbar("已删掉这条想法", () => {
          notes.splice(Math.min(idx, notes.length), 0, removed);
          if (!saveJSON("fg_notes", notes)) return;
          renderNotes();
        });
      });
      meta.appendChild(bBack); meta.appendChild(bDel);
    }
    row.appendChild(txt); row.appendChild(meta);
    noteList.appendChild(row);
  });
}
noteArchivedLine.addEventListener("click", () => {
  showArchived = !showArchived;
  renderNotes();
});

/* 今日一句（想法速记顶部） */
const daylineInput = $("daylineInput"), jarDropBtn = $("jarDropBtn");

function renderDayline() {
  const date = todayKey(), cur = daylines.find(d => d.date === date);
  if (document.activeElement === daylineInput && daylineInput.dataset.date === date) return;
  daylineInput.dataset.date = date;
  daylineInput.value = cur?.text || "";
  jarDropBtn.hidden = !daylineInput.value;
}
function saveDayline() {
  const v = daylineInput.value.trim();
  const date = daylineInput.dataset.date || todayKey();
  let cur = daylines.find(d => d.date === date);
  if (!cur && !v) { jarDropBtn.hidden = true; return true; }
  if (cur) {
    cur.text = v;
    cur.updatedAt = Date.now();
  } else {
    daylines.push({ date, text: v, updatedAt: Date.now() });
  }
  if (!saveJSON("fg_dayline", daylines)) return false;
  if (typeof renderGrowth === "function") renderGrowth();
  jarDropBtn.hidden = !v;
  return true;
}
daylineInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { saveDayline(); daylineInput.blur(); }
});
daylineInput.addEventListener("blur", saveDayline);
jarDropBtn.addEventListener("click", () => {
  const v = daylineInput.value.trim();
  if (!v) return;
  jarList.push({ id: uid("j"), text: v, date: todayKey(), createdAt: Date.now() });
  if (!saveJSON("fg_jar", jarList)) return;
  if (window.GardenCards) window.GardenCards.earnChance("jar");
  renderJar();
  showToast("投进罐子里了");
});

/* ================= 思绪整理：待办管理 ================= */
const todoInput = $("todoInput"), todoTag = $("todoTag"), todoRemind = $("todoRemind"), todoAdd = $("todoAdd"), todoAdmin = $("todoAdmin");

todoAdd.addEventListener("click", () => {
  const v = todoInput.value.trim();
  if (!v) return;
  const remind = todoRemind.value ? new Date(todoRemind.value).getTime() : null;
  todos.push({
    id: uid("td"), text: v,
    tags: todoTag.value.trim() ? [todoTag.value.trim()] : [],
    remindAt: remind, remindFired: null, done: false, createdAt: Date.now()
  });
  if (!saveJSON("fg_todos", todos)) return;
  todoInput.value = ""; todoTag.value = ""; todoRemind.value = "";
  refreshTagDatalist();
  renderTodoAdmin(); renderToday(); renderCalendar();
});

function renderTodoAdmin() {
  todoAdmin.innerHTML = "";
  const list = todos.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.remindAt || Infinity) - (b.remindAt || Infinity);
  });
  if (list.length === 0) {
    const tip = document.createElement("p");
    tip.className = "wall-empty";
    tip.textContent = "还没有待办。要提醒自己的事，放在这里就好。";
    todoAdmin.appendChild(tip);
    return;
  }
  const box = document.createElement("div");
  box.className = "mini-timeline";
  list.forEach(td => box.appendChild(makeTodoRow(td, true)));
  todoAdmin.appendChild(box);
}

function openTodoEditor(td) {
  openOverlay((card, close) => {
    const t = document.createElement("div");
    t.className = "ov-title"; t.textContent = "改一下这条待办";
    const inp = document.createElement("input");
    inp.className = "ov-input"; inp.maxLength = 40; inp.value = td.text;
    const rows = document.createElement("div");
    rows.className = "ed-rows";
    const tagInp = document.createElement("input");
    tagInp.className = "ed-field"; tagInp.maxLength = 10;
    tagInp.setAttribute("list", "tagList");
    tagInp.placeholder = "标签（可不填）";
    tagInp.value = (td.tags || [])[0] || "";
    const remind = document.createElement("input");
    remind.type = "datetime-local";
    remind.className = "ed-field";
    if (td.remindAt) {
      const d = new Date(td.remindAt);
      remind.value = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate())
        + "T" + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
    }
    rows.appendChild(tagInp); rows.appendChild(remind);
    const act = document.createElement("div");
    act.className = "ov-actions";
    const ok = document.createElement("button");
    ok.className = "soft-btn mini"; ok.textContent = "保存";
    ok.addEventListener("click", () => {
      const v = inp.value.trim();
      if (!v) return;
      td.text = v;
      td.tags = tagInp.value.trim() ? [tagInp.value.trim()] : [];
      td.remindAt = remind.value ? new Date(remind.value).getTime() : null;
      td.remindFired = null;
      if (!saveJSON("fg_todos", todos)) return;
      refreshTagDatalist();
      renderTodoAdmin(); renderToday(); renderCalendar();
      showToast("已经改好了");
      close();
    });
    const no = document.createElement("button");
    no.className = "soft-btn mini ghost"; no.textContent = "取消";
    no.addEventListener("click", close);
    act.appendChild(ok); act.appendChild(no);
    card.appendChild(t); card.appendChild(inp); card.appendChild(rows); card.appendChild(act);
  });
}

/* ================= 任务页：按目标整理 ================= */
function renderTasksPage() {
  const host = $("goalGroups");
  host.innerHTML = "";

  const groups = goals.map(g => ({ goal: g, list: tasks.filter(t => t.goalId === g.id && !t.sealed && quadMatches(t)) }));
  const loose = tasks.filter(t => !t.goalId && !t.sealed && quadMatches(t));
  if (loose.length) groups.push({ goal: null, list: loose });

  if (groups.length === 0) {
    const tip = document.createElement("div");
    tip.className = "tasks-empty";
    tip.innerHTML = `
      <span class="tasks-empty-icon" aria-hidden="true"><svg viewBox="0 0 48 40"><path d="M24 27V13" stroke="var(--accent)" stroke-opacity=".55" fill="none" stroke-linecap="round"/><path d="M24 15c.4-5.5 3.5-8.6 9-9.6-.7 5.6-3.6 8.8-9 9.6Z" fill="var(--tint)" stroke="var(--accent)" stroke-opacity=".5"/><path d="M24 20c-.4-4.4-2.8-7-7.2-8 .6 4.5 2.9 7.2 7.2 8Z" fill="var(--bg-sub)" stroke="var(--accent)" stroke-opacity=".4"/><path d="M15 27h18l-1.8 9H16.8Z" fill="var(--tint)" stroke="var(--accent)" stroke-opacity=".5"/></svg></span>
      <p>暂无任务。点击上方输入框添加你的第一件事。</p>`;
    host.appendChild(tip);
    return;
  }

  groups.forEach(({ goal, list }) => {
    const box = document.createElement("div");
    box.className = "goal-group";
    const head = document.createElement("div");
    head.className = "gg-head";
    const title = document.createElement("div");
    title.className = "gg-title";
    title.textContent = goal ? goal.title : "还没归属目标";
    head.appendChild(title);
    if (goal) {
      const p = goalProgress(goal);
      if (p.nrTotal > 0) {
        const meta = document.createElement("div");
        meta.className = "gg-meta";
        meta.textContent = p.nrDone + "/" + p.nrTotal;
        head.appendChild(meta);
      }
      if (p.repeatDays > 0) {
        const meta2 = document.createElement("div");
        meta2.className = "gg-meta";
        meta2.textContent = "已坚持 " + p.repeatDays + " 天";
        head.appendChild(meta2);
      }
    }
    box.appendChild(head);
    if (goal) {
      const p = goalProgress(goal);
      if (p.nrTotal > 0) {
        const bar = document.createElement("div");
        bar.className = "gg-bar";
        const i = document.createElement("i");
        i.style.width = Math.round(p.nrDone / p.nrTotal * 100) + "%";
        bar.appendChild(i);
        box.appendChild(bar);
      }
    }

    const sorted = list.slice().sort((a, b) => {
      const ad = effPlanDate(a), bd = effPlanDate(b);
      if (ad !== bd) return ad < bd ? -1 : 1;
      const at = a.time || "99:99", bt = b.time || "99:99";
      if (at !== bt) return at < bt ? -1 : 1;
      return a.createdAt - b.createdAt;
    });
    const inner = document.createElement("div");
    inner.className = "tl-tasks";
    if (sorted.length === 0) {
      const tip = document.createElement("p");
      tip.className = "db-empty";
      tip.textContent = "这个目标下还没有任务";
      inner.appendChild(tip);
    } else {
      sorted.forEach(t => inner.appendChild(makeTaskRow(t, taskActionDate(t), { showDate: true })));
    }
    box.appendChild(inner);
    host.appendChild(box);
  });
}

/* ================= 任务页：视图切换 + 标签筛选 + 四象限 ================= */
let taskView = "timeline";
let taskTagFilter = "";

$("tvTimeline").addEventListener("click", () => { taskView = "timeline"; drawTaskView(); });
$("tvQuad").addEventListener("click", () => { taskView = "quad"; drawTaskView(); });

function drawTaskView() {
  $("tvTimeline").className = "soft-btn mini" + (taskView === "timeline" ? "" : " ghost");
  $("tvQuad").className = "soft-btn mini" + (taskView === "quad" ? "" : " ghost");
  $("goalGroups").hidden = taskView !== "timeline";
  $("quadWrap").hidden = taskView !== "quad";
  renderTagFilter();
  if (taskView === "quad") renderQuad();
  else renderTasksPage();
}

function renderTagFilter() {
  const bar = $("tagFilter");
  bar.innerHTML = "";
  const tags = allTags();
  if (tags.length === 0) { bar.hidden = true; return; }
  bar.hidden = false;
  const mk = (label, val) => {
    const b = document.createElement("button");
    b.className = "tag-chip" + (taskTagFilter === val ? " active" : "");
    b.textContent = label;
    b.addEventListener("click", () => { taskTagFilter = taskTagFilter === val ? "" : val; drawTaskView(); });
    bar.appendChild(b);
  };
  mk("全部", "");
  tags.forEach(t => mk(t, t));
}

function quadMatches(t) {
  if (!taskTagFilter) return true;
  const g = goals.find(x => x.id === t.goalId);
  return (t.tags || []).some(tag => tag.includes(taskTagFilter)) ||
    (g && (g.title.includes(taskTagFilter) || (g.tags || []).some(tag => tag.includes(taskTagFilter))));
}

/* 四象限：手动拖入梳理，不打分、不参与统计，点开才加载 */
const QUAD_TITLES = ["重要 · 紧急", "重要 · 不紧急", "不重要 · 紧急", "不重要 · 不紧急"];
let quadrant = loadJSON("fg_quadrant", {});   // { taskId: 0..3 }

function renderQuad() {
  const wrap = $("quadWrap");
  wrap.innerHTML = "";
  const pool = tasks.filter(t => !t.sealed && quadMatches(t));
  const unplaced = pool.filter(t => quadrant[t.id] == null);

  const free = document.createElement("div");
  free.className = "quad-pool";
  const freeLbl = document.createElement("div");
  freeLbl.className = "quad-pool-lbl";
  freeLbl.textContent = "把任务拖进格子里梳理一下，拖错就双击拿回来";
  free.appendChild(freeLbl);
  const freeList = document.createElement("div");
  freeList.className = "quad-pool-list";
  if (unplaced.length === 0) {
    const tip = document.createElement("span");
    tip.className = "db-empty";
    tip.textContent = "都放进格子里了";
    freeList.appendChild(tip);
  }
  unplaced.forEach(t => freeList.appendChild(makeQuadChip(t)));
  freeList.addEventListener("dragover", (e) => e.preventDefault());
  freeList.addEventListener("drop", (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    delete quadrant[id];
    if (!saveJSON("fg_quadrant", quadrant)) return;
    renderQuad();
  });
  free.appendChild(freeList);
  wrap.appendChild(free);

  const grid = document.createElement("div");
  grid.className = "quad-grid";
  QUAD_TITLES.forEach((title, idx) => {
    const cell = document.createElement("div");
    cell.className = "quad-cell";
    const lbl = document.createElement("div");
    lbl.className = "quad-cell-title";
    lbl.textContent = title;
    cell.appendChild(lbl);
    pool.filter(t => quadrant[t.id] === idx).forEach(t => cell.appendChild(makeQuadChip(t)));
    cell.addEventListener("dragover", (e) => { e.preventDefault(); cell.classList.add("over"); });
    cell.addEventListener("dragleave", () => cell.classList.remove("over"));
    cell.addEventListener("drop", (e) => {
      e.preventDefault();
      cell.classList.remove("over");
      const id = e.dataTransfer.getData("text/plain");
      if (!id) return;
      quadrant[id] = idx;
      if (!saveJSON("fg_quadrant", quadrant)) return;
      renderQuad();
    });
    grid.appendChild(cell);
  });
  wrap.appendChild(grid);
}

function makeQuadChip(t) {
  const chip = document.createElement("div");
  chip.className = "quad-chip" + (doneOn(t, taskActionDate(t)) ? " done" : "");
  chip.draggable = true;
  chip.textContent = t.text;
  chip.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", t.id);
  });
  chip.addEventListener("dblclick", () => {
    delete quadrant[t.id];
    if (!saveJSON("fg_quadrant", quadrant)) return;
    renderQuad();
  });
  return chip;
}

/* ================= 心情（移到情绪空间） ================= */
const MOOD_LABELS = ["很好", "开心", "平静", "有点累", "低落"];
const moodRow = $("moodRow"), moodInvite = $("moodInvite"), moodNote = $("moodNote");

function moodEntry(date) { return moodList.find(m => m.date === date); }

function renderMood() {
  moodRow.innerHTML = "";
  MOOD_LABELS.forEach((label, i) => {
    const btn = document.createElement("button");
    btn.className = "mood-opt";
    btn.dataset.mood = String(i);
    const mouths = ['M7 16q5 8 10 0Z','M7 17q5 6 10 0','M8 19h8','M8 19q4-3 8 0','M7 21q5-7 10 0'];
    const eyes = i < 3 ? '<path d="M7 11h1m8 0h1"/>' : '<path d="m6 10 3 2m6 0 3-2"/>';
    btn.innerHTML = `<div class="mood-dot"><svg viewBox="0 0 24 28" class="mood-face" aria-hidden="true">${eyes}<path d="${mouths[i]}"/></svg></div><div class="mood-label"></div>`;
    btn.querySelector(".mood-label").textContent = label;
    btn.addEventListener("click", () => setMood(i));
    moodRow.appendChild(btn);
  });
  const date = todayKey(), cur = moodEntry(date);
  const editing = document.activeElement === moodNote && moodNote.dataset.date === date;
  if (cur && cur.mood != null) {
    moodRow.children[cur.mood].classList.add("active");
    if (!editing) moodNote.value = cur.note || "";
    moodInvite.hidden = true;
  } else {
    if (!editing) moodNote.value = cur ? (cur.note || "") : "";
    moodInvite.hidden = false;
  }
  moodNote.dataset.date = date;
}

function setMood(i) {
  const date = todayKey();
  let cur = moodEntry(date);
  if (cur) {
    cur.mood = i;
    cur.updatedAt = Date.now();
  } else {
    cur = { date, mood: i, note: "", updatedAt: Date.now() };
    moodList.push(cur);
  }
  if (!saveJSON("fg_mood", moodList)) return;
  if (window.GardenCards) window.GardenCards.earnChance("mood");
  renderMood();
  renderCalendar();
}

moodNote.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { saveMoodNote(); moodNote.blur(); }
});
moodNote.addEventListener("blur", saveMoodNote);
function saveMoodNote() {
  const date = moodNote.dataset.date || todayKey();
  let cur = moodEntry(date);
  const v = moodNote.value.trim();
  if (!cur && !v) return true;
  if (cur) {
    cur.note = v;
    cur.updatedAt = Date.now();
  } else {
    moodList.push({ date, mood: null, note: v, updatedAt: Date.now() });
  }
  if (!saveJSON("fg_mood", moodList)) return false;
  renderCalendar();
  return true;
}

/* ================= 照片（IndexedDB fg_db / photos） ================= */
let dbPromise = null;
let photosCache = [];
const WALL_MAX = 30;

function idb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("fg_db", 2);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("photos")) req.result.createObjectStore("photos", { keyPath: "id" });
        if (!req.result.objectStoreNames.contains("recovery")) req.result.createObjectStore("recovery", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}
async function idbAll() {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction("photos", "readonly").objectStore("photos").getAll();
    tx.onsuccess = () => res(tx.result || []);
    tx.onerror = () => rej(tx.error);
  });
}
async function idbPut(p) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").put(p);
    tx.oncomplete = res; tx.onabort = tx.onerror = () => rej(tx.error);
  });
}
async function idbDelete(id) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").delete(id);
    tx.oncomplete = res; tx.onabort = tx.onerror = () => rej(tx.error);
  });
}
async function idbClear() {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").clear();
    tx.oncomplete = res; tx.onabort = tx.onerror = () => rej(tx.error);
  });
}

const wallFile = $("wallFile"), wallUploadBtn = $("wallUploadBtn"),
  wallGrid = $("wallGrid"), wallEmpty = $("wallEmpty"), wallCount = $("wallCount");

wallUploadBtn.addEventListener("click", () => {
  if (photosCache.length >= WALL_MAX) {
    showToast("先删几张再放新的吧");
    return;
  }
  wallFile.click();
});
wallFile.addEventListener("change", async () => {
  const files = Array.from(wallFile.files || []);
  wallFile.value = "";
  if (!files.length) return;
  let slots = WALL_MAX - photosCache.length;
  if (slots <= 0) {
    wallUploadBtn.classList.add("faded");
    showToast("先删几张再放新的吧");
    return;
  }
  wallUploadBtn.disabled = true;
  try { for (const f of files) {
    if (slots <= 0) break;
    const dataUrl = await readAsDataURL(f);
    const small = await compressImage(dataUrl, 900, 0.7);
    const p = { id: uid("p"), date: todayKey(), note: "", img: small, createdAt: Date.now() };
    await idbPut(p);
    photosCache.push(p);
    slots--;
  } } catch (error) { showToast("照片未能全部保存，请检查图片或腾出空间后重试"); }
  finally { wallUploadBtn.disabled = false; }
  if (photosCache.length >= WALL_MAX) wallUploadBtn.classList.add("faded");
  renderWall();
  renderTimeline();
  renderCalendar();
});
function readAsDataURL(f) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });
}
function compressImage(dataUrl, maxEdge, quality) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const longEdge = Math.max(img.width, img.height);
      const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => rej(new Error("无法读取图片"));
    img.src = dataUrl;
  });
}

let wallView = localStorage.getItem("fg_wall_view") || "grid";
function renderWall() {
  wallGrid.innerHTML = "";
  wallEmpty.hidden = photosCache.length > 0;
  wallCount.textContent = photosCache.length > 0 ? photosCache.length + " / " + WALL_MAX : "";
  if (photosCache.length >= WALL_MAX) wallUploadBtn.classList.add("faded");
  else wallUploadBtn.classList.remove("faded");
  wallGrid.classList.toggle("wall-list", wallView === "list");
  const sorted = photosCache.slice().sort((a, b) => b.createdAt - a.createdAt);
  sorted.forEach((p, i) => {
    const item = document.createElement("div");
    item.className = "wall-item";
    item.style.animationDelay = Math.min(i * 50, 500) + "ms"; // Stagger 错峰淡入
    const img = document.createElement("img");
    img.className = "wall-img";
    img.src = p.img;
    img.alt = p.date;
    const date = document.createElement("div");
    date.className = "wall-date";
    date.textContent = p.date;
    item.appendChild(img);
    item.appendChild(date);
    if (p.note) {
      const note = document.createElement("div");
      note.className = "wall-note";
      note.textContent = p.note;
      item.appendChild(note);
    }
    item.addEventListener("click", () => openPhotoOverlay(p));
    wallGrid.appendChild(item);
  });
}

/* 照片详情：Drawer 侧边抽屉，锁定背景滚动 */
function openPhotoOverlay(p) {
  const drawer = document.createElement("div");
  drawer.className = "drawer";
  const panel = document.createElement("div");
  panel.className = "drawer-panel";
  let releaseFocus = () => {};
  const close = () => {
    releaseFocus();
    drawer.classList.add("closing");
    setTimeout(() => { drawer.remove(); if (!document.querySelector(".overlay,.drawer")) document.body.classList.remove("no-scroll"); }, 240);
  };
  document.body.classList.add("no-scroll");
  drawer.addEventListener("click", (e) => { if (e.target === drawer) close(); });
  const img = document.createElement("img");
  img.className = "big-photo";
  img.src = p.img;
  const meta = document.createElement("div");
  meta.className = "ov-meta";
  meta.textContent = p.date;
  const ta = document.createElement("textarea");
  ta.rows = 2;
  ta.maxLength = 60;
  ta.value = p.note || "";
  ta.placeholder = "给这张照片写一句备注";
  const actions = document.createElement("div");
  actions.className = "ov-actions";
  const saveBtn = document.createElement("button");
  saveBtn.className = "soft-btn mini";
  saveBtn.textContent = "保存备注";
  saveBtn.addEventListener("click", async () => {
    try { await idbPut({ ...p, note: ta.value.trim() }); }
    catch (error) { showToast("备注没有保存成功，请重试"); return; }
    p.note = ta.value.trim();
    renderWall();
    renderTimeline();
    showToast("备注已保存");
  });
  const delBtn = document.createElement("button");
  delBtn.className = "soft-btn mini ghost";
  delBtn.textContent = "删除照片";
  delBtn.addEventListener("click", () => {
    openConfirm("拿走照片", "把这张照片从墙上收起来吗？", "拿走", async () => {
      try { await idbDelete(p.id); }
      catch (error) { showToast("照片没有删除成功，请重试"); return; }
      photosCache = photosCache.filter(x => x.id !== p.id);
      close();
      renderWall(); renderTimeline(); renderCalendar();
      showToast("照片已收起来");
    });
  });
  const closeBtn = document.createElement("button");
  closeBtn.className = "soft-btn mini ghost";
  closeBtn.textContent = "关闭";
  closeBtn.addEventListener("click", close);
  actions.appendChild(saveBtn);
  actions.appendChild(delBtn);
  actions.appendChild(closeBtn);
  panel.appendChild(img);
  panel.appendChild(meta);
  panel.appendChild(ta);
  panel.appendChild(actions);
  drawer.appendChild(panel);
  document.body.appendChild(drawer);
  releaseFocus = containDialogFocus(drawer, panel, close);
  requestAnimationFrame(() => drawer.classList.add("open"));
}

/* ================= 时间线 ================= */
function renderTimeline() {
  const listEl = $("timelineList");
  const daysEl = $("timelineDays");
  listEl.innerHTML = "";
  const sorted = photosCache.slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  if (sorted.length === 0) {
    daysEl.textContent = "";
    const tip = document.createElement("p");
    tip.className = "wall-empty";
    tip.textContent = "还没有照片。放一张，这一天就留在轨道上了。";
    listEl.appendChild(tip);
    return;
  }
  daysEl.textContent = "已经走过 " + daysFromTo(sorted[0].date, todayKey()) + " 天";
  const desc = sorted.slice().reverse();
  let prevDate = null;
  desc.forEach((p, i) => {
    if (prevDate && daysFromTo(p.date, prevDate) > 3) {
      const gap = document.createElement("div");
      gap.className = "tl-gap";
      listEl.appendChild(gap);
    }
    prevDate = p.date;
    const node = document.createElement("div");
    node.className = "tl-node";
    node.innerHTML = `
      <div class="tl-dot"></div>
      <div class="tl-date"></div>
      <img class="tl-thumb" alt="">
      <div class="tl-note"></div>`;
    node.querySelector(".tl-date").textContent = p.date;
    const thumb = node.querySelector(".tl-thumb");
    thumb.src = p.img;
    thumb.style.animationDelay = (i * 0.3) + "s";
    thumb.addEventListener("click", () => openPhotoOverlay(p));
    node.querySelector(".tl-note").textContent = p.note || "";
    if (!p.note) node.querySelector(".tl-note").remove();
    listEl.appendChild(node);
  });
}

/* ================= 感恩罐子 ================= */
const jarBody = $("jarBody"), jarInput = $("jarInput"), jarAddBtn = $("jarAddBtn"),
  jarEmpty = $("jarEmpty"), jarFullTip = $("jarFullTip");
const JAR_DOT_MAX = 30;

function renderJar() {
  jarEmpty.hidden = jarList.length > 0;
  jarFullTip.hidden = jarList.length <= JAR_DOT_MAX;
}

jarAddBtn.addEventListener("click", dropJar);
jarInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { dropJar(); jarInput.blur(); }
});
function dropJar() {
  const v = jarInput.value.trim();
  if (!v) return;
  jarList.push({ id: uid("j"), text: v, date: todayKey(), createdAt: Date.now() });
  if (!saveJSON("fg_jar", jarList)) return;
  if (window.GardenCards) window.GardenCards.earnChance("jar");
  renderJar();
  jarInput.value = "";
  const rise = document.createElement("div");
  rise.className = "jar-text-rise";
  rise.textContent = v;
  document.querySelector(".jar-stage").appendChild(rise);
  setTimeout(() => rise.remove(), 400);

  const star = document.createElement("div");
  star.className = "jar-star spawn";
  star.style.left = (32 + Math.random() * 36) + "%";
  star.style.top = (52 + Math.random() * 26) + "%";
  const size = 10 + Math.floor(Math.random() * 7);
  star.style.width = size + "px";
  star.style.height = size + "px";
  $("jarBody").appendChild(star);
  setTimeout(() => star.remove(), 1200);
}

jarBody.addEventListener("click", () => {
  if (jarList.length === 0) return;
  openOverlay((card, close) => {
    const title = document.createElement("div");
    title.className = "ov-title";
    title.textContent = "罐子里的话";
    card.appendChild(title);
    const desc = jarList.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
    desc.forEach(j => {
      const item = document.createElement("div");
      item.className = "jar-list-item";
      item.innerHTML = `<div class="jl-date"></div><div class="jl-text"></div>`;
      item.querySelector(".jl-date").textContent = j.date;
      item.querySelector(".jl-text").textContent = j.text;
      card.appendChild(item);
    });
    const actions = document.createElement("div");
    actions.className = "ov-actions";
    actions.style.marginTop = "12px";
    const closeBtn = document.createElement("button");
    closeBtn.className = "soft-btn mini ghost";
    closeBtn.textContent = "关上罐子";
    closeBtn.addEventListener("click", close);
    actions.appendChild(closeBtn);
    card.appendChild(actions);
  });
});

/* ================= 情绪空间：背景（键 fg_bg 不变） ================= */
const moodBg = $("moodBg"), moodHint = $("moodHint"),
  moodFile = $("moodFile"), moodUploadBtn = $("moodUploadBtn"), moodResetBtn = $("moodResetBtn");

function applyMoodBg() {
  const bg = localStorage.getItem("fg_bg");
  if (bg) {
    moodBg.style.backgroundImage = "url(" + bg + ")";
    moodBg.classList.remove("no-img");
    moodHint.hidden = true;
  } else {
    moodBg.style.backgroundImage = "";
    moodBg.classList.add("no-img");
    moodHint.hidden = false;
  }
}
moodUploadBtn.addEventListener("click", () => moodFile.click());
moodFile.addEventListener("change", () => {
  const f = moodFile.files && moodFile.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    compressImage(reader.result, 1600, 0.75).then(small => {
      try { localStorage.setItem("fg_bg", small); } catch (e) { showToast("图片太大存不下，换一张小一点的试试"); }
      applyMoodBg();
    });
  };
  reader.readAsDataURL(f);
  moodFile.value = "";
});
moodResetBtn.addEventListener("click", () => {
  localStorage.removeItem("fg_bg");
  applyMoodBg();
});

/* ================= 封存水池 ================= */
const pool = $("pool");

function renderPool() {
  pool.innerHTML = "";
  const sealed = tasks.filter(t => t.sealed).sort((a, b) => (b.sealedAt || 0) - (a.sealedAt || 0));
  if (sealed.length === 0) {
    const tip = document.createElement("div");
    tip.className = "pool-empty-tip";
    tip.textContent = "水池里很安静，封存的任务会在这里等你";
    pool.appendChild(tip);
    return;
  }
  sealed.forEach((t, i) => {
    const c = document.createElement("button");
    c.className = "pool-crystal";
    c.setAttribute("aria-label", "恢复任务：" + t.text);
    c.title = t.text + " · 点一下捞起来";
    c.style.left = (6 + (i % 12) * 7.5) + "%";
    c.addEventListener("click", () => {
      t.sealed = false;
      t.sealedAt = null;
      if (!saveTasks(tasks)) return;
      renderPool();
      renderToday();
      renderCalendar();
      renderTasksPage();
      showToast("已经捞起来了");
    });
    pool.appendChild(c);
  });
}

/* ================= 导出与导入备份 ================= */
async function buildBackup(skipGardenWait=false) {
  if(window.BotanyUI && !skipGardenWait) await window.BotanyUI.flush();
  const extraKeys=["fg_settings","fg_leaves","fg_letters","fg_cards","fg_cards_meta","fg_bench","fg_shelves","fg_review_items","fg_promises","fg_whitenoise"];
  const extras=Object.fromEntries(extraKeys.map(k=>[k,loadJSON(k,null)]));
  return {version:4, exportedAt:new Date().toISOString(), tasks,todos,notes,goals,
    preferences:{palette:window.GardenPalette.choice()},
    garden:window.BotanyUI?window.BotanyUI.exportState():undefined,
    tarot:window.BotanyUI?window.BotanyUI.exportTarot():undefined,extras,
    mood:moodList,events,jar:jarList,dayline:daylines,templates,quadrant,focus:focusSessions,
    bg:localStorage.getItem("fg_bg") || null, petImg:localStorage.getItem("fg_pet_img") || null,
    photos:await idbAll()};
}
function downloadBackup(data, prefix) {
  const blob = new Blob([JSON.stringify(data)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (prefix || "focus-garden-backup-") + todayKey() + ".json";
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
$("exportBtn").addEventListener("click", async () => {
  try { downloadBackup(await buildBackup()); showToast("备份已导出，包含照片与专注记录"); }
  catch(e) { showToast("备份失败，照片数据库暂时无法读取，请重试"); }
});
const recoveryBtn = document.createElement("button");
recoveryBtn.className="soft-btn ghost"; recoveryBtn.textContent="导出上次导入前的数据";
recoveryBtn.addEventListener("click",async()=>{
  try {
    const db=await idb();
    const snapshot=await new Promise((resolve,reject)=>{
      const req=db.transaction("recovery","readonly").objectStore("recovery").get("before-import");
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
    if(!snapshot) {showToast("还没有导入前的恢复点");return;}
    downloadBackup(snapshot.data,"focus-garden-recovery-");
  } catch(e) {showToast("恢复点暂时无法读取，请重试");}
});
document.querySelector(".backup-actions").appendChild(recoveryBtn);
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", () => {
  const f = $("importFile").files && $("importFile").files[0];
  $("importFile").value = "";
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = GardenCore.normalizeBackup(JSON.parse(reader.result)); }
    catch (e) { showToast("备份未导入：" + e.message); return; }

    const photoDates = (data.photos || []).map(p => p.date).sort();
    const range = photoDates.length ? photoDates[0] + " ~ " + photoDates[photoDates.length - 1] : "无";
    openOverlay((card, close) => {
      const title = document.createElement("div");
      title.className = "ov-title";
      title.textContent = "这份备份里有";
      const summary = document.createElement("div");
      summary.className = "ov-meta";
      summary.style.lineHeight = "2";
      summary.innerHTML = [
        "任务 " + ((data.tasks || []).length) + " 条",
        "待办 " + ((data.todos || []).length) + " 条",
        "想法 " + ((data.notes || []).length) + " 条",
        "目标 " + ((data.goals || []).length) + " 个",
        "心情 " + ((data.mood || []).length) + " 天",
        "重要日期 " + ((data.events || []).length) + " 个",
        "罐子 " + ((data.jar || []).length) + " 句",
        "照片 " + ((data.photos || []).length) + " 张（" + range + "）"
      ].join("<br>");
      const warn = document.createElement("div");
      warn.className = "ov-meta";
      warn.textContent = "导入会替换当前全部数据。系统会先保存一份恢复点，可在备份区导出。";
      const actions = document.createElement("div");
      actions.className = "ov-actions";
      const ok = document.createElement("button");
      ok.className = "soft-btn mini";
      ok.textContent = "确认导入";
      ok.addEventListener("click", async () => {
        ok.disabled = true;
        try { await applyImport(data); close(); }
        catch(e) { showToast("导入失败，已尝试保留原数据。可在备份区导出恢复点。"); }
        finally { ok.disabled = false; }
      });
      const no = document.createElement("button");
      no.className = "soft-btn mini ghost";
      no.textContent = "取消";
      no.addEventListener("click", close);
      actions.appendChild(ok);
      actions.appendChild(no);
      card.appendChild(title);
      card.appendChild(summary);
      card.appendChild(warn);
      card.appendChild(actions);
    });
  };
  reader.readAsText(f);
});

async function replacePhotos(photos, recovery) {
  const db=await idb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(recovery ? ["photos","recovery"] : ["photos"],"readwrite");
    const store=tx.objectStore("photos"); store.clear();
    photos.forEach(p=>store.put(p));
    if(recovery) tx.objectStore("recovery").put({id:"before-import",data:recovery});
    tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error || new Error("照片恢复中断"));
  });
}
async function applyImport(raw, gardenLocked=false) {
  if(!gardenLocked && navigator.locks) return navigator.locks.request("fg-garden-state",()=>applyImport(raw,true));
  const data=GardenCore.normalizeBackup(raw);
  const previous=await buildBackup(true);
  const fields={fg_tasks:data.tasks,fg_todos:data.todos,fg_notes:data.notes,fg_goals:data.goals,
    fg_mood:data.mood,fg_events:data.events,fg_jar:data.jar,fg_dayline:data.dayline,
    fg_templates:data.templates.length ? data.templates : TPL_DEFAULT,fg_quadrant:data.quadrant,
    fg_focus_sessions:data.focus,fg_pomo:{date:todayKey(),rounds:0,mode:"focus",left:POMO_FOCUS,focusMs:POMO_FOCUS,running:false,endTs:null}};
  if(data.garden) fields.fg_garden_v1=data.garden;
  if(data.tarot) fields.fg_tarot_v1=data.tarot;
  if(data.extras) Object.assign(fields,data.extras);
  if(data.preferences) fields.fg_appearance=data.preferences.palette;
  const keys=[...Object.keys(fields),"fg_bg","fg_pet_img"];
  const original=Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]));
  await replacePhotos(data.photos,previous);
  try {
    Object.entries(fields).forEach(([k,v])=>localStorage.setItem(k,JSON.stringify(v)));
    [["fg_bg",data.bg],["fg_pet_img",data.petImg]].forEach(([k,v])=>v ? localStorage.setItem(k,v) : localStorage.removeItem(k));
  } catch(error) {
    Object.entries(original).forEach(([k,v])=>{try {v===null ? localStorage.removeItem(k) : localStorage.setItem(k,v);}catch(e){/* durable recovery is in IndexedDB */}});
    await replacePhotos(previous.photos);
    Object.keys(fields).forEach(readStored);
    throw error;
  }
  tasks=loadTasks(); todos=data.todos; notes=data.notes; goals=data.goals; moodList=data.mood;
  events=data.events; jarList=data.jar; daylines=data.dayline; templates=fields.fg_templates;
  quadrant=data.quadrant; focusSessions=data.focus; photosCache=data.photos; pomo=fields.fg_pomo;
  Object.keys(fields).forEach(readStored);
  promises=loadJSON("fg_promises",[]);
  window.dispatchEvent(new CustomEvent("fg-data-restored"));
  if(window.BotanyUI) window.BotanyUI.reload();
  window.GardenPalette.apply(); applyMoodBg(); renderPet(); renderAll();
  if(typeof renderGrowth==="function") renderGrowth();
  showToast("备份已导入；原数据恢复点已保存");
}

/* ================= 桌宠（键 fg_pet_img / fg_pet_x / fg_pet_y 不变） ================= */
const pet = $("pet"), petBody = $("petBody"), petFile = $("petFile"), petUploadBtn = $("petUploadBtn");

function renderPet() {
  const saved = localStorage.getItem("fg_pet_img");
  petBody.innerHTML = "";
  if (saved) {
    const img = document.createElement("img");
    img.src = saved;
    img.alt = "桌宠";
    petBody.appendChild(img);
  } else {
    const d = document.createElement("div");
    d.className = "pet-default";
    petBody.appendChild(d);
  }
}
petUploadBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  petFile.click();
});
petFile.addEventListener("change", () => {
  const f = petFile.files && petFile.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    compressImage(reader.result, 900, 0.75).then(small => {
      try { localStorage.setItem("fg_pet_img", small); } catch (e) { /* 忽略 */ }
      renderPet();
    });
  };
  reader.readAsDataURL(f);
  petFile.value = "";
});

let dragging = false, dragMoved = false, offX = 0, offY = 0;
pet.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".pet-upload")) return;
  dragging = true;
  dragMoved = false;
  const r = pet.getBoundingClientRect();
  offX = e.clientX - r.left;
  offY = e.clientY - r.top;
  pet.setPointerCapture(e.pointerId);
});
pet.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  dragMoved = true;
  const vw = window.innerWidth, vh = window.innerHeight;
  const r = pet.getBoundingClientRect();
  const x = Math.min(Math.max(e.clientX - offX, 4), vw - r.width - 4);
  const y = Math.min(Math.max(e.clientY - offY, 4), vh - r.height - 4);
  pet.style.left = (x / vw * 100).toFixed(2) + "%";
  pet.style.top = (y / vh * 100).toFixed(2) + "%";
  pet.style.right = "auto";
  pet.style.bottom = "auto";
});
pet.addEventListener("pointerup", () => {
  if (!dragging) return;
  dragging = false;
  if (!dragMoved) return;
  try {
    localStorage.setItem("fg_pet_x", pet.style.left);
    localStorage.setItem("fg_pet_y", pet.style.top);
  } catch (err) { /* 忽略 */ }
});
pet.addEventListener("pointercancel", () => { dragging = false; });

function restorePetPos() {
  const x = localStorage.getItem("fg_pet_x");
  const y = localStorage.getItem("fg_pet_y");
  if (x && y) {
    pet.style.left = x;
    pet.style.top = y;
    pet.style.right = "auto";
    pet.style.bottom = "auto";
  }
}

/* 桌宠问候：今天也要准备「目标」哦 */
let greetTimer = null;
function petGreet() {
  if (bubbleEl) return;
  const el = document.createElement("div");
  el.className = "bubble";
  el.textContent = goals.length > 0
    ? "今天也要准备「" + goals[0].title + "」哦"
    : "今天也慢慢来就好";
  const close = document.createElement("button");
  close.className = "bubble-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "关闭提醒");
  close.addEventListener("click", () => {
    if (greetTimer) { clearTimeout(greetTimer); greetTimer = null; }
    el.remove();
    if (bubbleEl === el) bubbleEl = null;
  });
  el.appendChild(close);
  document.body.appendChild(el);
  bubbleEl = el;
  greetTimer = setTimeout(() => { el.remove(); if (bubbleEl === el) bubbleEl = null; }, 6500);
}

/* ================= 艾宾浩斯柔和复习提醒（保留自 v3） ================= */
const REMIND_COPY = {
  1:  "「{t}」昨天刚完成，趁记忆还温热，回看一眼吗？",
  2:  "「{t}」已经陪你两天啦，要不要再看它一眼？",
  4:  "今天适合回看一眼「{t}」，一眼就好。",
  7:  "「{t}」满一周了，轻轻复习一下？",
  15: "「{t}」想你了，回看一眼就安心的那种。"
};
function loadReview() { return loadJSON("fg_review_state", { shown: {}, postpone: {} }); }

let bubbleEl = null, bubbleQueue = [];
function checkReminders() {
  const state = loadReview();
  const now = Date.now();
  const due = [];
  tasks.filter(t => t.firstCompletedAt && (!t.repeat || t.repeat === "none")).forEach(t => {
    [1, 2, 4, 7, 15].forEach(n => {
      const key = t.id + "_" + n;
      const effective = Math.max(t.firstCompletedAt + n * DAY, state.postpone[key] || 0);
      if (now >= effective && state.shown[key] !== todayKey()) {
        due.push({ key, text: t.text, days: n });
      }
    });
  });
  if (due.length > 0) { bubbleQueue = due; nextBubble(); }
}
function nextBubble() {
  if (bubbleEl) { bubbleEl.remove(); bubbleEl = null; }
  if (bubbleQueue.length === 0) return;
  const item = bubbleQueue.shift();
  const state = loadReview();
  state.shown[item.key] = todayKey();
  if (!saveJSON("fg_review_state", state)) return;
  bubbleEl = document.createElement("div");
  bubbleEl.className = "bubble";
  const p = document.createElement("div");
  p.textContent = (REMIND_COPY[item.days] || "要不要回看一眼「{t}」？").replace("{t}", item.text);
  bubbleEl.appendChild(p);
  const actions = document.createElement("div");
  actions.className = "b-actions";
  const ok = document.createElement("button");
  ok.textContent = "好，看一眼";
  ok.addEventListener("click", nextBubble);
  const skip = document.createElement("button");
  skip.textContent = "今天先不看";
  skip.addEventListener("click", () => {
    const s = loadReview();
    s.postpone[item.key] = keyToDate(todayKey()).getTime() + DAY;
    if (!saveJSON("fg_review_state", s)) return;
    nextBubble();
  });
  actions.appendChild(ok);
  actions.appendChild(skip);
  bubbleEl.appendChild(actions);
  const close = document.createElement("button");
  close.className = "bubble-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "关闭提醒");
  close.addEventListener("click", () => { bubbleEl.remove(); bubbleEl = null; });
  bubbleEl.appendChild(close);
  document.body.appendChild(bubbleEl);
}

/* ================= 初始化 ================= */
function renderAll() {
  renderGoals();
  renderGardenStones();
  renderPromises();
  renderDateStrip();
  renderToday();
  renderTasksPage();
  renderTagFilter();
  renderMood();
  renderDayline();
  renderNotes();
  renderTodoAdmin();
  renderPomo();
  renderTplBar();
  renderEvents();
  renderCalendar();
  renderWall();
  renderTimeline();
  renderJar();
  renderPool();
  refreshTagDatalist();
}

/* ================= 跟手涟漪：以点击坐标为圆心扩散 ================= */
document.addEventListener("pointerdown", (e) => {
  const btn = e.target.closest("button");
  if (!btn || btn.classList.contains("pref-switch")) return;   // 开关不用水波纹，走专属玻璃扫光
  const rect = btn.getBoundingClientRect();
  const d = rect.width * 2.4;
  const r = document.createElement("span");
  r.className = "ripple";
  r.style.width = r.style.height = d + "px";
  r.style.left = (e.clientX - rect.left - d / 2) + "px";
  r.style.top = (e.clientY - rect.top - d / 2) + "px";
  btn.appendChild(r);
  setTimeout(() => r.remove(), 480);
});

async function init() {
  initCal();
  try { photosCache = await idbAll(); } catch (e) { photosCache = []; }
  applyMoodBg();
  renderPet();
  restorePetPos();
  switchRoute();
  renderAll();
  setTimeout(checkReminders, 800);
  setTimeout(petGreet, 1600);
  setTimeout(checkAlarms, 2500);
  setInterval(checkAlarms, 15000);
}
init();

// Inputs keep their date while being edited, including across midnight.
let visibleDay = todayKey();
function refreshDayBoundary() {
  const date = todayKey();
  if (date === visibleDay) return;
  if (saveDayline() === false || saveMoodNote() === false) return;
  visibleDay = date;
  renderDateStrip(); renderToday(); renderTasksPage(); renderMood(); renderDayline();
  renderCalendar(); renderPomo();
  if (typeof renderGrowth === "function") renderGrowth();
}
setInterval(refreshDayBoundary, 15000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshDayBoundary(); });
window.addEventListener("storage", e => {
  if (e.storageArea !== localStorage || (e.key && !RECORD_KEYS.includes(e.key))) return;
  (e.key ? [e.key] : RECORD_KEYS).forEach(reloadRecord);
  queueSharedRefresh(); renderMood(); renderDayline(); renderNotes(); renderEvents(); renderTplBar(); renderJar(); renderTimeline();
});

/* ================= 交互规范补层：Tooltip / Auto Save / 字数统计 / 视图模式 ================= */
function initInteractions() {

/* Tooltip：hover 300ms 出现，Auto Placement 碰撞检测不跑出屏幕 */
let tipEl = null, tipTimer = null;
document.addEventListener("mouseover", (e) => {
  const host = e.target.closest("[data-tip]");
  if (!host) return;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => {
    if (tipEl) tipEl.remove();
    tipEl = document.createElement("div");
    tipEl.className = "tooltip";
    tipEl.textContent = host.getAttribute("data-tip");
    document.body.appendChild(tipEl);
    const r = host.getBoundingClientRect();
    const tr = tipEl.getBoundingClientRect();
    let top = r.top - tr.height - 8;
    if (top < 4) top = r.bottom + 8;              // 上方放不下就翻到下方
    let left = r.left + r.width / 2 - tr.width / 2;
    left = Math.max(6, Math.min(left, window.innerWidth - tr.width - 6));
    tipEl.style.top = top + "px";
    tipEl.style.left = left + "px";
    tipEl.classList.add("show");
  }, 300);
});
document.addEventListener("mouseout", (e) => {
  if (!e.target.closest("[data-tip]")) return;
  clearTimeout(tipTimer);
  if (tipEl) { tipEl.remove(); tipEl = null; }
});

/* Auto Save：输入停止 800ms 自动存草稿，刷新不丢 */
function autoSaveDraft(inputEl, key) {
  if (!inputEl) return;
  let t = null;
  const saved = loadJSON(key, "");
  if (saved) inputEl.value = saved;
  inputEl.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => saveJSON(key, inputEl.value.trim()), 800);
  });
  inputEl.addEventListener("change", () => saveJSON(key, inputEl.value.trim()));
}
for (const [input, save] of [[moodNote, saveMoodNote], [daylineInput, saveDayline]]) {
  let timer;
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(save, 800); });
}
autoSaveDraft($("taskInput"), "fg_draft_task");
// 提交后清掉对应草稿
const draftPairs = [["taskInput", "fg_draft_task"]];
draftPairs.forEach(([eid, dkey]) => {
  const el = $(eid);
  if (!el) return;
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && el.value.trim()) saveJSON(dkey, "");
  });
});

/* Character Counter：主输入框下的小字 x/上限，接近上限暖色提示 */
function addCounter(inputEl, max) {
  if (!inputEl) return;
  const c = document.createElement("div");
  c.className = "char-counter";
  c.style.textAlign = "right";
  const draw = () => {
    c.textContent = inputEl.value.length + "/" + max;
    c.classList.toggle("warn", inputEl.value.length >= max - 5);
  };
  draw();
  inputEl.addEventListener("input", draw);
  inputEl.parentNode.appendChild(c);
}
addCounter($("taskInput"), 50);
addCounter($("moodNote"), 60);
addCounter($("daylineInput"), 60);

/* 简约 / 温馨小屋 模式：Segmented Control，存 fg_mode */
let viewMode = localStorage.getItem("fg_mode") || "simple";
function applyMode() {
  document.body.classList.toggle("cozy", viewMode === "cozy");
}
applyMode();
function buildModeSwitch() {
  const host = document.querySelector("#sec-tools .block-label");
  if (!host) return;
  const seg = document.createElement("div");
  seg.className = "segmented mode-seg";
  seg.style.marginTop = "10px";
  const b1 = document.createElement("button");
  b1.textContent = "简约";
  const b2 = document.createElement("button");
  b2.textContent = "温馨小屋";
  const draw = () => {
    b1.className = viewMode === "simple" ? "active" : "";
    b2.className = viewMode === "cozy" ? "active" : "";
  };
  b1.addEventListener("click", () => { viewMode = "simple"; localStorage.setItem("fg_mode", "simple"); applyMode(); draw(); });
  b2.addEventListener("click", () => { viewMode = "cozy"; localStorage.setItem("fg_mode", "cozy"); applyMode(); draw(); });
  seg.appendChild(b1); seg.appendChild(b2);
  draw();
  host.parentNode.insertBefore(seg, host.nextSibling);
}

/* 照片墙 Grid / List 切换 */
function buildWallSwitch() {
  const actions = document.querySelector(".wall-actions");
  if (!actions) return;
  const seg = document.createElement("div");
  seg.className = "segmented";
  const g = document.createElement("button");
  g.textContent = "网格";
  const l = document.createElement("button");
  l.textContent = "时间线";
  const draw = () => {
    g.className = wallView === "grid" ? "active" : "";
    l.className = wallView === "list" ? "active" : "";
  };
  g.addEventListener("click", () => { wallView = "grid"; localStorage.setItem("fg_wall_view", "grid"); draw(); renderWall(); });
  l.addEventListener("click", () => { wallView = "list"; localStorage.setItem("fg_wall_view", "list"); draw(); renderWall(); });
  seg.appendChild(g); seg.appendChild(l);
  draw();
  actions.insertBefore(seg, actions.firstChild);
}
buildModeSwitch();
buildWallSwitch();

/* 给关键按钮补 data-tip */
[["petUploadBtn", "换一张桌宠图片"], ["dateExpand", "点开选完整年月日"],
 ["exportBtn", "把所有数据存成文件"], ["importBtn", "从备份文件恢复"]]
  .forEach(([id, tip]) => { const el = $(id); if (el) el.setAttribute("data-tip", tip); });
}
initInteractions();
