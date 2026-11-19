'use strict';
/* ================= MCP 插件体系（Demo：示例数据模拟返回） =================
   铁则：
   1. 只在用户点击按钮时运行，禁止自动 / 定时 / 后台调用；
   2. 输出固定标注【AI 生成，仅供参考】，用户确认后才写入本地存储；
   3. 当前为 Demo 模拟模式，赛后把 simulate() 换成真实 MCP 请求即可；
   4. 插件关闭或失败时友好提示，页面功能不受影响。 */
(function () {
  const $ = (id) => document.getElementById(id);

  /* ================= 真实 API 层（OpenAI 兼容 · 默认 DeepSeek） =================
     密钥只存本机 localStorage（fg_mcp_api），不进导出、不上传；
     真实调用失败自动降级回示例数据（铁则 4）。 */
  const API_DEFAULTS = { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', key: '', mode: 'mock' };
  function loadApiCfg() {
    try {
      const v = JSON.parse(localStorage.getItem('fg_mcp_api'));
      return v && typeof v === 'object' ? { ...API_DEFAULTS, ...v } : { ...API_DEFAULTS };
    } catch (e) { return { ...API_DEFAULTS }; }
  }
  function saveApiCfg(cfg) {
    try { localStorage.setItem('fg_mcp_api', JSON.stringify(cfg)); } catch (e) { /* 保存失败保持当前态 */ }
  }
  async function callLLM(system, user, timeoutMs) {
    const cfg = loadApiCfg();
    if (cfg.mode !== 'real' || !cfg.key) throw new Error('未开启真实模式');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || 20000);
    try {
      const res = await fetch(cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
        body: JSON.stringify({
          model: cfg.model || 'deepseek-chat',
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          temperature: .7, stream: false
        }),
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error('HTTP ' + res.status + (res.status === 401 ? '（密钥无效或过期）' : ''));
      const data = await res.json();
      const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!text) throw new Error('返回内容为空');
      return text;
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('请求超时');
      throw err;
    } finally { clearTimeout(timer); }
  }
  function parseJSONLoose(text, fb) {
    try {
      const m = String(text).replace(/```json|```/g, '').trim();
      const s = m.indexOf('{'), e = m.lastIndexOf('}');
      if (s >= 0 && e > s) return JSON.parse(m.slice(s, e + 1));
    } catch (err) { /* 解析失败走兜底 */ }
    return fb;
  }
  // 真实模式走 LLM（期望 JSON 输出），示例模式直接用本地模拟；真实失败降级
  function mcpJSON(system, user, fallback) {
    const cfg = loadApiCfg();
    if (cfg.mode !== 'real' || !cfg.key) return Promise.resolve({ real: false, data: fallback() });
    return callLLM(system, user)
      .then(text => {
        const data = parseJSONLoose(text, null);
        if (!data) { showToast('真实返回解析失败，本次已用示例结果兜底'); return { real: false, data: fallback() }; }
        return { real: true, data };
      })
      .catch(err => {
        showToast('真实调用失败，已用示例结果兜底（' + (err && err.message || err) + '）');
        return { real: false, data: fallback() };
      });
  }
  const SYS_SORTER = '你是「思绪分拣」助手，帮备考的人把杂乱想法整理成三类。只输出 JSON，不要解释，格式：{"tasks":["可执行任务"],"feels":["情绪念头"],"later":["暂缓想法"]}。情绪类（担心/焦虑/烦等）放 feels；有明确动作的放 tasks；不着急的放 later。每条保留用户原话，不超过40字。';
  const SYS_FEYNMAN_Q = '你是「费曼学习助手」，只输出引导提问，不给答案。只输出 JSON：{"questions":["问题1","问题2","问题3"]}，问题要帮用户发现自己对给定知识点的理解盲区。';
  const SYS_FEYNMAN_FB = '你是「费曼学习助手」，对照知识点与学生的理解，指出一个含糊或遗漏之处并鼓励一句。只输出 JSON：{"feedback":"..."}，feedback 不超过80字，语气温和。';
  const SYS_MNEMONIC = '你是「助记口诀」助手。只输出 JSON：{"mnemonic":"..."}，针对知识点给出一句简短好记的口诀或记忆线索（不超过50字），不要解释知识点本身。';
  const SYS_GUIDE = '你是「价值承诺引导」助手，只提问、绝不代写承诺。只输出 JSON：{"questions":["问题1","问题2","问题3"]}，三个温和的启发问题，帮用户找到自己真正看重的方向。';

  /* ================= API 设置卡片 ================= */
  function renderApiCard() {
    const cfg = loadApiCfg();
    const key = $('apiKeyInput'), model = $('apiModelInput'), base = $('apiBaseInput');
    if (!key) return;
    if (document.activeElement !== key) key.value = cfg.key || '';
    if (document.activeElement !== model) model.value = cfg.model || '';
    if (document.activeElement !== base) base.value = cfg.baseUrl || '';
    $('apiModeBtn').textContent = cfg.mode === 'real' ? '模式：真实 API' : '模式：示例模拟';
    $('apiModeBtn').classList.toggle('api-on', cfg.mode === 'real');
    $('apiStatus').textContent = cfg.mode === 'real'
      ? (cfg.key ? '真实模式 · 模型 ' + cfg.model + ' · 调用失败时自动降级示例' : '真实模式 · 但还没有填密钥，先填 Key')
      : '未连接。插件当前使用示例数据。';
  }
  function bindApiCard() {
    const key = $('apiKeyInput'), model = $('apiModelInput'), base = $('apiBaseInput');
    if (!key) return;
    const persist = () => {
      const cfg = loadApiCfg();
      cfg.key = key.value.trim();
      cfg.model = model.value.trim() || 'deepseek-chat';
      cfg.baseUrl = base.value.trim() || 'https://api.deepseek.com';
      saveApiCfg(cfg);
      renderApiCard();
    };
    [key, model, base].forEach(el => {
      el.addEventListener('change', persist);
      el.addEventListener('blur', persist);
    });
    $('apiModeBtn').addEventListener('click', () => {
      const cfg = loadApiCfg();
      if (cfg.mode === 'real') {
        cfg.mode = 'mock';
        saveApiCfg(cfg);
        showToast('已切回示例模拟模式，插件不再联网');
      } else {
        if (!key.value.trim()) { key.focus(); showToast('先填入 API Key，再切真实模式'); return; }
        cfg.mode = 'real';
        saveApiCfg(cfg);
        showToast('真实模式已开启。只在你点击时调用，输出仅供参考');
      }
      renderApiCard();
    });
    $('apiTestBtn').addEventListener('click', async () => {
      persist();
      const st = $('apiStatus');
      st.textContent = '测试连接中…';
      try {
        const text = await callLLM('你是连接测试助手，只回复两个字：正常', 'ping', 15000);
        st.textContent = '连接成功 · 模型 ' + loadApiCfg().model + ' · 回复：' + text.slice(0, 12);
        showToast('连接成功，可以切到真实模式了');
      } catch (err) {
        const msg = err && err.message || String(err);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) st.textContent = '连接失败：网络不通或被 CORS 拦截，检查接口地址';
        else st.textContent = '连接失败：' + msg;
        showToast('连接失败：' + msg);
      }
    });
    renderApiCard();
  }

  /* ---------- 模拟调用层：延迟 + 可替换 ---------- */
  function simulate(payload, delay) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(payload), delay || 700);
    });
  }
  function mcpOn(plugin) {
    const p = window.GardenPrefs.get();
    return p.mcp && p['mcp' + plugin] !== false;
  }
  function aiBadge() {
    const b = document.createElement('span');
    b.className = 'ai-badge';
    b.textContent = 'AI 生成，仅供参考';
    return b;
  }
  function busy(btn, label) {
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = label || '正在请求数据…';
    setTimeout(() => { btn.disabled = false; btn.textContent = old; }, 900);
  }

  /* ================= 1. 思绪分拣 ================= */
  // Demo 模拟：按行拆分用户输入，映射到三类候选（赛后接真实 MCP，输出同构 JSON）
  function mockSort(text) {
    const parts = text.split(/[\n；;。！？!?]+/).map(s => s.trim()).filter(Boolean);
    if (!parts.length) return null;
    const tasks = [], feels = [], later = [];
    parts.forEach((p, i) => {
      if (/想|焦虑|担心|怕|烦|紧张|难过/.test(p)) feels.push(p);
      else if (i % 3 === 2) later.push(p);
      else tasks.push(p);
    });
    if (!tasks.length && !feels.length && !later.length) tasks.push(parts[0]);
    return { tasks, feels, later };
  }
  function openSorter() {
    if (!mcpOn('Sorter')) return;
    openOverlay((card, close) => {
      const t = document.createElement('div');
      t.className = 'ov-title'; t.textContent = 'AI 分拣 · 把杂乱想法理一理';
      const hint = document.createElement('p');
      hint.className = 'leaf-dialog-hint';
      hint.textContent = '把脑子里的东西倒进来（一行一句）。分拣结果只是候选，你勾选、修改、确认后才会写入。';
      const ta = document.createElement('textarea');
      ta.className = 'leaf-textarea'; ta.rows = 4; ta.maxLength = 400;
      ta.placeholder = '比如：明天要交报告\n有点担心讲不好\n过几天再收拾房间…';
      const act1 = document.createElement('div');
      act1.className = 'ov-actions';
      const go = document.createElement('button');
      go.className = 'soft-btn mini'; go.textContent = 'AI 分拣（示例）';
      act1.appendChild(go);
      card.appendChild(t); card.appendChild(aiBadge()); card.appendChild(hint); card.appendChild(ta); card.appendChild(act1);

      go.addEventListener('click', () => {
        const text = ta.value.trim();
        if (!text) { ta.focus(); return; }
        busy(go, '分拣中…');
        mcpJSON(SYS_SORTER, text, () => mockSort(text)).then(({ real, data }) => {
          const res = (real && data && (data.tasks || data.feels || data.later)) ? {
            tasks: Array.isArray(data.tasks) ? data.tasks.filter(s => typeof s === 'string') : [],
            feels: Array.isArray(data.feels) ? data.feels.filter(s => typeof s === 'string') : [],
            later: Array.isArray(data.later) ? data.later.filter(s => typeof s === 'string') : []
          } : mockSort(text);
          if (!res) { showToast('先写点什么进来吧'); return; }
          ta.parentElement.querySelector('.ov-actions').remove(); ta.remove();
          const box = document.createElement('div');
          box.className = 'sorter-groups';
          const checks = [];
          const mkGroup = (title, items, cls) => {
            if (!items.length) return;
            const g = document.createElement('div');
            g.className = 'sorter-group ' + cls;
            const h = document.createElement('small');
            h.textContent = title;
            g.appendChild(h);
            items.forEach(it => {
              const lab = document.createElement('label');
              lab.className = 'sorter-item';
              const boxInp = document.createElement('input');
              boxInp.type = 'checkbox'; boxInp.checked = true;
              const inp = document.createElement('input');
              inp.type = 'text'; inp.maxLength = 50; inp.value = it;
              lab.appendChild(boxInp); lab.appendChild(inp);
              g.appendChild(lab);
              checks.push({ boxInp, inp, cls });
            });
            box.appendChild(g);
          };
          mkGroup('可执行任务 → 任务', res.tasks, 'is-task');
          mkGroup('情绪念头 → 溪流存档', res.feels, 'is-feel');
          mkGroup('暂缓想法 → 想法速记', res.later, 'is-later');
          const act2 = document.createElement('div');
          act2.className = 'ov-actions';
          const ok = document.createElement('button');
          ok.className = 'soft-btn mini'; ok.textContent = '确认写入';
          ok.addEventListener('click', () => {
            let nTask = 0, nFeel = 0, nNote = 0;
            checks.forEach(({ boxInp, inp, cls }) => {
              const v = inp.value.trim();
              if (!boxInp.checked || !v) return;
              if (cls === 'is-task') {
                tasks.unshift({ id: uid('t'), text: v, createdAt: Date.now(), completedAt: null, lastMovedAt: Date.now(),
                  planDate: todayKey(), time: null, repeat: 'none', doneDates: [], sealed: false, firstCompletedAt: null,
                  goalId: null, tags: [], effort: null });
                nTask++;
              } else if (cls === 'is-feel') {
                window.GardenLeaves.addStored(v); nFeel++;
              } else {
                notes.unshift({ id: uid('n'), text: v, archived: false, createdAt: Date.now() }); nNote++;
              }
            });
            saveRecordBatch({ fg_tasks: tasks, fg_notes: notes });
            queueSharedRefresh();
            showToast(`已写入：任务 ${nTask} 件 · 溪流存档 ${nFeel} 条 · 想法速记 ${nNote} 条`);
            close();
          });
          const no = document.createElement('button');
          no.className = 'soft-btn mini ghost'; no.textContent = '先不要写入';
          no.addEventListener('click', close);
          act2.appendChild(ok); act2.appendChild(no);
          card.appendChild(box); card.appendChild(act2);
        });
      });
    });
  }

  /* ================= 2. 费曼学习助手（只提问，不给答案） ================= */
  const FEYNMAN_QS = [
    '如果要用一句话讲给完全没接触过的朋友听，你会怎么说？',
    '这里面哪一个词，你还解释不清楚？',
    '它能用一个生活中的例子说明吗？举个试试。'
  ];
  function openFeynman(prefill) {
    if (!mcpOn('Feynman')) return;
    openOverlay((card, close) => {
      const t = document.createElement('div');
      t.className = 'ov-title'; t.textContent = '费曼助手 · 先自己讲讲看';
      const hint = document.createElement('p');
      hint.className = 'leaf-dialog-hint';
      hint.textContent = '助手只提问，不给答案。你的理解写完之后再对照一次，看看盲区在哪。';
      const kp = document.createElement('p');
      kp.className = 'sorter-kp';
      kp.textContent = prefill ? `知识点：${prefill}` : '';
      const qBox = document.createElement('ul');
      qBox.className = 'feynman-questions';
      const myAns = document.createElement('textarea');
      myAns.className = 'leaf-textarea'; myAns.rows = 3; myAns.maxLength = 300;
      myAns.placeholder = '按自己的话写写看（写完再对照一次）';
      const act = document.createElement('div');
      act.className = 'ov-actions';
      const compare = document.createElement('button');
      compare.className = 'soft-btn mini'; compare.textContent = '对照一次（示例）';
      const save = document.createElement('button');
      save.className = 'soft-btn mini ghost'; save.textContent = '存为想法速记';
      const no = document.createElement('button');
      no.className = 'quiet-link'; no.textContent = '先到这里';
      no.addEventListener('click', close);
      save.addEventListener('click', () => {
        const v = myAns.value.trim();
        if (!v) { myAns.focus(); return; }
        notes.unshift({ id: uid('n'), text: `费曼练习 · ${v}`, archived: false, createdAt: Date.now() });
        saveJSON('fg_notes', notes);
        renderNotes();
        showToast('已经收进想法速记，之后可以随时回看');
        close();
      });
      compare.addEventListener('click', () => {
        busy(compare, '对照中…');
        mcpJSON(SYS_FEYNMAN_FB, `知识点：${prefill || '（未填写）'}\n我的理解：${myAns.value.trim()}`, () => ({
          feedback: myAns.value.trim().length >= 30
            ? '（示例反馈）讲得挺完整了。可以再检查：例子是不是真的解释了原理，而不是重复结论。'
            : '（示例反馈）写得太短啦。试着把三个问题都答一遍，再看看有没有含糊带过的地方。'
        })).then(({ real, data }) => {
          const old = card.querySelector('.feynman-feedback');
          if (old) old.remove();
          const fb = document.createElement('p');
          fb.className = 'feynman-feedback';
          fb.textContent = (real && data && data.feedback ? data.feedback : '（示例反馈）' + (data.feedback || '对照完成。'));
          card.insertBefore(fb, act);
        });
      });
      act.appendChild(compare); act.appendChild(save); act.appendChild(no);
      card.appendChild(t); card.appendChild(aiBadge()); card.appendChild(hint);
      if (prefill) card.appendChild(kp);
      // 出题：示例模式用固定三问；真实模式现场生成
      const cfgNow = loadApiCfg();
      if (cfgNow.mode === 'real' && cfgNow.key) {
        const li = document.createElement('li');
        li.textContent = '正在出题…';
        qBox.appendChild(li);
        mcpJSON(SYS_FEYNMAN_Q, prefill || '（用户还没填知识点，请给三个通用的理解自检问题）', () => ({ questions: FEYNMAN_QS }))
          .then(({ real, data }) => {
            const qs = (real && data && Array.isArray(data.questions) && data.questions.length)
              ? data.questions.slice(0, 3) : FEYNMAN_QS;
            qBox.replaceChildren();
            qs.forEach(q => { const item = document.createElement('li'); item.textContent = q; qBox.appendChild(item); });
          })
          .catch(() => { qBox.replaceChildren(); FEYNMAN_QS.forEach(q => { const item = document.createElement('li'); item.textContent = q; qBox.appendChild(item); }); });
      } else {
        FEYNMAN_QS.forEach(q => { const li = document.createElement('li'); li.textContent = q; qBox.appendChild(li); });
      }
      card.appendChild(qBox); card.appendChild(myAns); card.appendChild(act);
      setTimeout(() => myAns.focus(), 60);
    });
  }

  /* ================= 3. 文档解析 OCR（示例模式：返回样例草稿） ================= */
  function openOcr(fileName) {
    if (!mcpOn('Ocr')) return;
    openOverlay((card, close) => {
      const t = document.createElement('div');
      t.className = 'ov-title'; t.textContent = '解析 · 图片转文字';
      const hint = document.createElement('p');
      hint.className = 'leaf-dialog-hint';
      hint.textContent = `正在解析「${fileName}」。当前为示例模式，返回的是模拟草稿；正式接入后会提取真实文字。`;
      const status = document.createElement('p');
      status.className = 'sorter-kp';
      status.textContent = '解析中…';
      const draftWrap = document.createElement('div');
      const act = document.createElement('div');
      act.className = 'ov-actions';
      const ok = document.createElement('button');
      ok.className = 'soft-btn mini'; ok.textContent = '存为想法速记';
      ok.addEventListener('click', () => {
        const ta = draftWrap.querySelector('textarea');
        const v = ta ? ta.value.trim() : '';
        if (!v) return;
        notes.unshift({ id: uid('n'), text: `来自「${fileName}」：${v}`, archived: false, createdAt: Date.now() });
        saveJSON('fg_notes', notes);
        renderNotes();
        showToast('草稿已存进想法速记，整理交给你了');
        close();
      });
      const no = document.createElement('button');
      no.className = 'quiet-link'; no.textContent = '不要了';
      no.addEventListener('click', close);
      simulate(null, 900).then(() => {
        status.textContent = '解析完成（示例结果）';
        const ta = document.createElement('textarea');
        ta.className = 'leaf-textarea'; ta.rows = 4;
        ta.value = '（示例草稿）第一章 复习要点：\n1. 概念定义与适用条件；\n2. 典型例题的解题步骤；\n3. 常见错误：条件遗漏、单位换算。';
        draftWrap.appendChild(ta);
        act.appendChild(ok); act.appendChild(no);
        card.appendChild(draftWrap); card.appendChild(act);
      });
      card.appendChild(t); card.appendChild(aiBadge()); card.appendChild(hint); card.appendChild(status); card.appendChild(act);
    });
  }

  /* ================= 4. 念头关联图谱（本地提取，仅可视化） ================= */
  const STOP = new Set(['的','了','是','我','有','和','就','不','都','一个','也','很','在','要','去','会','着','它','这','那','与','还','被','把','你','他','她','上','下','里','没','吧','吗','呢','啊','哦','所以','但是','然后','因为','如果','觉得','有点']);
  function extractKeywords(texts, topN) {
    const freq = new Map();
    texts.forEach(t => {
      const words = t.replace(/[，。！？、；：""''（）\s]/g, ' ').split(/[\s]+|(?=[\u4e00-\u9fff]{2})/).filter(Boolean);
      const seen = new Set();
      words.forEach(w => {
        if (w.length < 2 || w.length > 6 || STOP.has(w) || seen.has(w)) return;
        seen.add(w);
        freq.set(w, (freq.get(w) || 0) + 1);
      });
    });
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN || 8).map(([w, c]) => ({ w, c }));
  }
  function openThoughtMap() {
    if (!mcpOn('Map')) return;
    openOverlay((card, close) => {
      const t = document.createElement('div');
      t.className = 'ov-title'; t.textContent = '念头图谱 · 看看最近在想什么';
      const hint = document.createElement('p');
      hint.className = 'leaf-dialog-hint';
      hint.textContent = '只做客观的关键词提取与连线，不做任何诊断或建议。选择范围，点生成。';
      const row = document.createElement('div');
      row.className = 'ov-actions';
      const sel = document.createElement('select');
      sel.className = 'ed-field';
      [['1', '今天'], ['7', '最近 7 天'], ['30', '最近 30 天']].forEach(([v, l]) => {
        const op = document.createElement('option'); op.value = v; op.textContent = l; sel.appendChild(op);
      });
      const go = document.createElement('button');
      go.className = 'soft-btn mini'; go.textContent = '生成图谱（示例）';
      row.appendChild(sel); row.appendChild(go);
      const stage = document.createElement('div');
      stage.className = 'map-stage';
      card.appendChild(t); card.appendChild(aiBadge()); card.appendChild(hint); card.appendChild(row); card.appendChild(stage);
      go.addEventListener('click', () => {
        busy(go, '生成中…');
        simulate(null, 800).then(() => {
          const days = Number(sel.value);
          const from = Date.now() - days * 864e5;
          const texts = [
            ...leavesAll().filter(l => l.createdAt >= from).map(l => l.text),
            ...notes.filter(n => n.createdAt >= from).map(n => n.text)
          ];
          stage.replaceChildren();
          if (!texts.length) {
            const p = document.createElement('p');
            p.className = 'leaf-dialog-hint';
            p.textContent = '这个范围里还没有念头记录。写下一些想法或心事，再来看看。';
            stage.appendChild(p);
            return;
          }
          stage.appendChild(mapSVG(extractKeywords(texts)));
          const cap = document.createElement('p');
          cap.className = 'map-caption';
          cap.textContent = `提取自 ${texts.length} 条记录 · 连线表示常一起出现`;
          stage.appendChild(cap);
        });
      });
    });
  }
  function leavesAll() {
    try { return JSON.parse(localStorage.getItem('fg_leaves')) || []; } catch (e) { return []; }
  }
  function mapSVG(nodes) {
    const W = 420, H = 240, cx = W / 2, cy = H / 2, R = 82;
    const pos = nodes.map((n, i) => {
      const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return { ...n, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });
    const links = [];
    pos.forEach((a, i) => pos.forEach((b, j) => {
      if (j <= i) return;
      if (a.c > 1 && b.c > 1 && (i + j) % 3 !== 2) links.push([a, b]);
    }));
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'thought-map');
    svg.setAttribute('role', 'img');
    links.forEach(([a, b]) => {
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', a.x); l.setAttribute('y1', a.y);
      l.setAttribute('x2', b.x); l.setAttribute('y2', b.y);
      svg.appendChild(l);
    });
    pos.forEach(n => {
      const g = document.createElementNS(ns, 'g');
      g.setAttribute('transform', `translate(${n.x} ${n.y})`);
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('r', Math.min(9 + n.c * 1.6, 20));
      g.appendChild(c);
      const tx = document.createElementNS(ns, 'text');
      tx.textContent = n.w;
      g.appendChild(tx);
      svg.appendChild(g);
    });
    return svg;
  }

  /* ================= 5. 价值承诺引导（只提问，不代写） ================= */
  function openPromiseGuide() {
    if (!mcpOn('Guide')) return;
    const cfgNow = loadApiCfg();
    const useReal = cfgNow.mode === 'real' && !!cfgNow.key;
    const pick = () => pool.sort(() => Math.random() - .5).slice(0, 3);
    const pool = [
      '过去一周，哪一件事让你觉得「这就是我看重的」？',
      '如果不看任何人的期待，你想把更多时间花在哪里？',
      '五年后的你，会感谢现在的你在坚持什么？',
      '什么情况下你会觉得「今天没有白过」？'
    ];
    openOverlay((card, close) => {
      const t = document.createElement('div');
      t.className = 'ov-title'; t.textContent = '先想一想这些';
      const hint = document.createElement('p');
      hint.className = 'leaf-dialog-hint';
      hint.textContent = '助手只给几个温和的问题。承诺一定要是你自己的话，它不会替你写。';
      const ul = document.createElement('ul');
      ul.className = 'feynman-questions';
      if (useReal) {
        const li = document.createElement('li');
        li.textContent = '正在想几个问题…';
        ul.appendChild(li);
        mcpJSON(SYS_GUIDE, '用户想写下此刻看重的方向，但不知道写什么。', () => ({ questions: pick() }))
          .then(({ real, data }) => {
            const qs = (real && data && Array.isArray(data.questions) && data.questions.length)
              ? data.questions.slice(0, 3) : pick();
            ul.replaceChildren();
            qs.forEach(q => { const item = document.createElement('li'); item.textContent = q; ul.appendChild(item); });
          })
          .catch(() => { ul.replaceChildren(); pick().forEach(q => { const item = document.createElement('li'); item.textContent = q; ul.appendChild(item); }); });
      } else {
        pick().forEach(q => { const li = document.createElement('li'); li.textContent = q; ul.appendChild(li); });
      }
      const act = document.createElement('div');
      act.className = 'ov-actions';
      const back = document.createElement('button');
      back.className = 'soft-btn mini'; back.textContent = '好，我自己写';
      back.addEventListener('click', () => { close(); setTimeout(() => $('promiseInput') && $('promiseInput').focus(), 80); });
      act.appendChild(back);
      card.appendChild(t); card.appendChild(aiBadge()); card.appendChild(hint); card.appendChild(ul); card.appendChild(act);
    });
  }

  /* ================= 6. 柔性复习（本地调度，AI 仅出助记） ================= */
  const REVIEW_STEPS = [1, 2, 4, 7, 15]; // 艾宾浩斯柔性节奏：1/2/4/7/15 天
  let reviewItems = (() => {
    try { const v = JSON.parse(localStorage.getItem('fg_review_items')); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  })();
  function saveReviewItems() { saveJSON('fg_review_items', reviewItems); }
  function reviewNext(item) {
    const d = keyToDate(todayKey());
    d.setDate(d.getDate() + (REVIEW_STEPS[Math.min(item.stage, REVIEW_STEPS.length - 1)]));
    return dayKey(d);
  }
  function renderReview() {
    const host = $('reviewList');
    if (!host) return;
    host.replaceChildren();
    if (!reviewItems.length) {
      const p = document.createElement('p');
      p.className = 'promise-empty';
      p.textContent = '还没有知识点。收进来一个，节奏本机会帮你安排。';
      host.appendChild(p);
      return;
    }
    reviewItems.slice().sort((a, b) => a.nextDate < b.nextDate ? -1 : 1).forEach(item => {
      const due = item.nextDate <= todayKey();
      const row = document.createElement('div');
      row.className = 'review-item' + (due ? ' due' : '');
      const copy = document.createElement('div');
      copy.className = 'review-copy';
      const strong = document.createElement('strong');
      strong.textContent = item.text;
      const small = document.createElement('small');
      small.textContent = item.stage >= REVIEW_STEPS.length
        ? '已经记牢啦，随时可以回看'
        : (due ? '今天可以轻轻复习一下' : `下一次 · ${item.nextDate}`);
      copy.appendChild(strong); copy.appendChild(small);
      const act = document.createElement('div');
      act.className = 'review-actions';
      if (due && item.stage < REVIEW_STEPS.length) {
        const ok = document.createElement('button');
        ok.className = 'soft-btn mini'; ok.textContent = '记住了';
        ok.addEventListener('click', () => {
          item.stage++;
          item.nextDate = reviewNext(item);
          saveReviewItems();
          renderReview();
          showToast('好样的。下一次时间已经轻轻排好');
        });
        act.appendChild(ok);
      }
      const mn = document.createElement('button');
      mn.className = 'quiet-link'; mn.textContent = '来点助记';
      mn.addEventListener('click', () => openMnemonic(item));
      act.appendChild(mn);
      const del = document.createElement('button');
      del.className = 'quiet-link'; del.textContent = '放下';
      del.addEventListener('click', () => {
        reviewItems = reviewItems.filter(x => x.id !== item.id);
        saveReviewItems();
        renderReview();
      });
      act.appendChild(del);
      row.appendChild(copy); row.appendChild(act);
      host.appendChild(row);
    });
  }
  function openMnemonic(item) {
    openOverlay((card, close) => {
      const t = document.createElement('div');
      t.className = 'ov-title'; t.textContent = '助记线索';
      const head = document.createElement('p');
      head.className = 'sorter-kp';
      head.textContent = `知识点：${item.text}`;
      const body = document.createElement('p');
      body.className = 'feynman-feedback';
      const fallbackMnemonic = () => {
        const chars = item.text.replace(/[，。、\s]/g, '').slice(0, 4).split('');
        return { mnemonic: `抓住四个字「${chars.join(' ')}」，各想一个画面连成一个小故事；回忆时先默念这四个字，再逐个展开。` };
      };
      const cfgNow = loadApiCfg();
      if (cfgNow.mode === 'real' && cfgNow.key) body.textContent = '正在编口诀…';
      else body.textContent = '（示例口诀）' + fallbackMnemonic().mnemonic;
      mcpJSON(SYS_MNEMONIC, item.text, fallbackMnemonic).then(({ real, data }) => {
        if (data && data.mnemonic) body.textContent = (real ? '' : '（示例口诀）') + data.mnemonic;
      });
      const act = document.createElement('div');
      act.className = 'ov-actions';
      const back = document.createElement('button');
      back.className = 'soft-btn mini'; back.textContent = '收到';
      back.addEventListener('click', close);
      act.appendChild(back);
      card.appendChild(t); card.appendChild(aiBadge()); card.appendChild(head); card.appendChild(body); card.appendChild(act);
    });
  }
  $('reviewItemInput').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const v = $('reviewItemInput').value.trim();
    if (!v) return;
    reviewItems.push({ id: uid('rv'), text: v, createdAt: Date.now(), stage: 0, nextDate: reviewNext({ stage: 0 }) });
    saveReviewItems();
    $('reviewItemInput').value = '';
    renderReview();
    showToast('收进来了。到日子它会轻轻等你，不会催你');
  });

  /* ================= 入口绑定 ================= */
  $('aiTaskBtn').addEventListener('click', openSorter);
  $('aiFeynmanBtn').addEventListener('click', () => openFeynman(''));
  $('aiMapBtn').addEventListener('click', openThoughtMap);
  $('promiseGuideBtn').addEventListener('click', openPromiseGuide);
  $('feynmanAskBtn').addEventListener('click', () => {
    const v = $('feynmanInput').value.trim();
    if (!v) { $('feynmanInput').focus(); return; }
    openFeynman(v);
    $('feynmanInput').value = '';
  });
  let ocrName = '';
  $('ocrPickBtn').addEventListener('click', () => $('ocrFile').click());
  $('ocrFile').addEventListener('change', () => {
    const f = $('ocrFile').files[0];
    if (!f) return;
    ocrName = f.name;
    $('ocrFileName').textContent = ocrName;
    $('ocrParseBtn').hidden = false;
  });
  $('ocrParseBtn').addEventListener('click', () => {
    if (!ocrName) return;
    busy($('ocrParseBtn'));
    openOcr(ocrName);
  });

  function refreshReview() {try{const v=JSON.parse(localStorage.getItem('fg_review_items'));reviewItems=Array.isArray(v)?v:[];}catch{reviewItems=[];}renderReview();}
  window.addEventListener('fg-data-restored',refreshReview);
  window.addEventListener('storage',event=>{if(!event.key||event.key==='fg_review_items')refreshReview();});
  bindApiCard();
  renderReview();
  document.addEventListener('fg-prefs', renderReview);
})();
