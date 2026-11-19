'use strict';
/* ================= 工作台：碎片桌面（fg_bench）+ 归档书架（fg_shelves） =================
   碎片卡片可拖拽到书上归档；书本支持自建分类、封面用抽卡装饰或上传图；
   书内卡片可回传思绪整理。全部本地存储，不依赖网络。 */
(function () {
  const $ = (id) => document.getElementById(id);
  const load = (key, fb) => {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fb : v; }
    catch (e) { return fb; }
  };
  let benchCards = load('fg_bench', []);
  let shelves = load('fg_shelves', []);

  /* 图片压缩：长边 ≤520px，jpeg 0.82，避免 localStorage 超限 */
  function shrinkImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 520;
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

  function save() {
    saveRecordBatch({ fg_bench: benchCards, fg_shelves: shelves });
  }

  /* ================= 碎片桌面 ================= */
  function renderBench() {
    const host = $('benchCards'), empty = $('benchEmpty');
    if (!host) return;
    host.replaceChildren();
    empty.hidden = benchCards.length > 0;
    benchCards.forEach(card => {
      const el = document.createElement('div');
      el.className = 'bench-chip' + (card.type === 'image' ? ' is-img' : '');
      el.draggable = true;
      el.dataset.id = card.id;
      if (card.type === 'image') {
        const img = document.createElement('img');
        img.src = card.img; img.alt = '桌面碎片图片'; img.draggable = false;
        el.appendChild(img);
      } else {
        const p = document.createElement('p');
        p.textContent = card.text;
        el.appendChild(p);
      }
      const act = document.createElement('div');
      act.className = 'bench-chip-actions';
      const toNote = document.createElement('button');
      toNote.className = 'quiet-link'; toNote.textContent = '送思绪整理';
      toNote.addEventListener('click', () => {
        const text = card.type === 'image' ? '（桌面图片碎片）' : card.text;
        notes.unshift({ id: uid('n'), text, archived: false, createdAt: Date.now(), fromBench: card.id });
        saveJSON('fg_notes', notes);
        renderNotes();
        benchCards = benchCards.filter(c => c.id !== card.id);
        save(); renderBench();
        showToast('已经送进思绪整理 · 想法速记');
      });
      const toShelf = document.createElement('button');
      toShelf.className = 'quiet-link'; toShelf.textContent = '归档书架';
      toShelf.addEventListener('click', () => pickShelf(card.id));
      const del = document.createElement('button');
      del.className = 'quiet-link'; del.textContent = '拿起';
      del.addEventListener('click', () => {
        benchCards = benchCards.filter(c => c.id !== card.id);
        save(); renderBench();
      });
      act.appendChild(toNote); act.appendChild(toShelf); act.appendChild(del);
      el.appendChild(act);
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.id);
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      host.appendChild(el);
    });
  }
  $('benchTextInput').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const v = $('benchTextInput').value.trim();
    if (!v) return;
    benchCards.unshift({ id: uid('bc'), type: 'text', text: v, createdAt: Date.now() });
    save();
    $('benchTextInput').value = '';
    renderBench();
  });
  $('benchImgBtn').addEventListener('click', () => $('benchFile').click());
  $('benchFile').addEventListener('change', async () => {
    const files = [...$('benchFile').files];
    $('benchFile').value = '';
    for (const f of files) {
      try {
        const data = await shrinkImage(f);
        benchCards.unshift({ id: uid('bc'), type: 'image', img: data, createdAt: Date.now() });
      } catch (e) { showToast('这张图放不进来，换一张试试'); }
    }
    save(); renderBench();
    if (files.length) showToast('图片放上桌面了，随时可以归档');
  });

  /* ================= 归档书架 ================= */
  function renderShelf() {
    const host = $('shelfCats'), empty = $('shelfEmpty');
    if (!host) return;
    host.replaceChildren();
    empty.hidden = shelves.length > 0;
    // 自建分类：按 category 分层展示
    const cats = [...new Set(shelves.map(s => s.category || '未分类'))];
    cats.forEach(cat => {
      const layer = document.createElement('div');
      layer.className = 'shelf-layer';
      const label = document.createElement('small');
      label.textContent = cat;
      layer.appendChild(label);
      const row = document.createElement('div');
      row.className = 'shelf-row';
      shelves.filter(s => (s.category || '未分类') === cat).forEach(book => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'shelf-book';
        b.dataset.id = book.id;
        const cover = document.createElement('span');
        cover.className = 'book-cover';
        if (book.cover && book.cover.kind === 'img') {
          const img = document.createElement('img');
          img.src = book.cover.value; img.alt = ''; img.draggable = false;
          cover.appendChild(img);
        } else if (book.cover && book.cover.kind === 'asset' && window.GardenCards) {
          cover.innerHTML = window.GardenCards.assetSVG(book.cover.value);
        } else {
          cover.innerHTML = `<svg viewBox="0 0 40 40"><rect x="8" y="5" width="24" height="30" rx="2.5" fill="var(--tint)" stroke="var(--line)"/><path d="M13 12h14M13 17h14M13 22h9" stroke="var(--accent)" stroke-opacity=".5"/></svg>`;
        }
        const t = document.createElement('strong');
        t.textContent = book.title;
        const c = document.createElement('small');
        c.textContent = `${book.cards.length} 张碎片`;
        b.appendChild(cover); b.appendChild(t); b.appendChild(c);
        b.addEventListener('click', () => openBook(book.id));
        // 拖拽归档：碎片拖到书上
        b.addEventListener('dragenter', (e) => { e.preventDefault(); b.classList.add('drop-ready'); });
        b.addEventListener('dragover', (e) => { e.preventDefault(); b.classList.add('drop-ready'); });
        b.addEventListener('dragleave', () => b.classList.remove('drop-ready'));
        b.addEventListener('drop', (e) => {
          e.preventDefault();
          b.classList.remove('drop-ready');
          const id = e.dataTransfer.getData('text/plain');
          archiveToShelf(id, book.id);
        });
        row.appendChild(b);
      });
      layer.appendChild(row);
      host.appendChild(layer);
    });
  }
  function archiveToShelf(cardId, bookId) {
    const card = benchCards.find(c => c.id === cardId);
    const book = shelves.find(s => s.id === bookId);
    if (!card || !book) return;
    book.cards.unshift({
      id: uid('pc'), type: card.type, text: card.type === 'image' ? '' : card.text,
      img: card.img || '', createdAt: Date.now()
    });
    benchCards = benchCards.filter(c => c.id !== cardId);
    save(); renderBench(); renderShelf();
    showToast(`归档进「${book.title}」了，随时可以回看`);
  }
  function pickShelf(cardId) {
    if (!shelves.length) { showToast('书架上还没有书，先建一本'); return; }
    openOverlay((card, close) => {
      const t = document.createElement('div');
      t.className = 'ov-title'; t.textContent = '归档到哪本书？';
      const list = document.createElement('div');
      list.className = 'ov-book-list';
      shelves.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'soft-btn mini';
        btn.textContent = `${b.title}（${b.cards.length}）`;
        btn.addEventListener('click', () => { close(); archiveToShelf(cardId, b.id); });
        list.appendChild(btn);
      });
      const no = document.createElement('button');
      no.className = 'quiet-link'; no.textContent = '先放回桌面';
      no.addEventListener('click', close);
      card.appendChild(t); card.appendChild(list); card.appendChild(no);
    });
  }
  function createBookDialog(prefill) {
    openOverlay((card, close) => {
      const t = document.createElement('div');
      t.className = 'ov-title'; t.textContent = '建一本书';
      const inp = document.createElement('input');
      inp.className = 'ov-input'; inp.maxLength = 16; inp.placeholder = '书的名字，比如「备考笔记」';
      inp.value = prefill || '';
      const cat = document.createElement('input');
      cat.className = 'ov-input'; cat.maxLength = 12; cat.placeholder = '分类（可不填，如「数学」）';
      const act = document.createElement('div');
      act.className = 'ov-actions';
      const ok = document.createElement('button');
      ok.className = 'soft-btn mini'; ok.textContent = '放上书架';
      ok.addEventListener('click', () => {
        const title = inp.value.trim();
        if (!title) { inp.focus(); return; }
        shelves.unshift({ id: uid('bk'), title, category: cat.value.trim(), cover: null, cards: [], createdAt: Date.now() });
        save(); renderShelf();
        showToast('书放上书架了。把桌面的碎片拖到书上归档');
        close();
      });
      const no = document.createElement('button');
      no.className = 'soft-btn mini ghost'; no.textContent = '先想想';
      no.addEventListener('click', close);
      act.appendChild(ok); act.appendChild(no);
      card.appendChild(t); card.appendChild(inp); card.appendChild(cat); card.appendChild(act);
      setTimeout(() => inp.focus(), 50);
    });
  }
  $('shelfAddBtn').addEventListener('click', () => createBookDialog($('shelfTitleInput').value.trim()));
  $('shelfTitleInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); createBookDialog($('shelfTitleInput').value.trim()); } });

  /* 打开一本书：翻看内容、回传思绪、封面装饰 */
  function openBook(bookId) {
    const book = shelves.find(s => s.id === bookId);
    if (!book) return;
    openOverlay((card, close) => {
      const t = document.createElement('div');
      t.className = 'ov-title'; t.textContent = book.title;
      const meta = document.createElement('p');
      meta.className = 'sorter-kp';
      meta.textContent = `${book.category || '未分类'} · ${book.cards.length} 张碎片`;
      const list = document.createElement('div');
      list.className = 'ov-card-list';
      if (!book.cards.length) {
        const p = document.createElement('p');
        p.className = 'leaf-dialog-hint';
        p.textContent = '这本书还空着。回到工作台，把碎片拖到书上就能归档。';
        list.appendChild(p);
      }
      book.cards.forEach(pc => {
        const row = document.createElement('div');
        row.className = 'ov-card-row';
        if (pc.type === 'image' && pc.img) {
          const img = document.createElement('img');
          img.src = pc.img; img.alt = '';
          row.appendChild(img);
        } else {
          const p = document.createElement('p');
          p.textContent = pc.text || '（图片碎片）';
          row.appendChild(p);
        }
        const act = document.createElement('div');
        act.className = 'ov-actions ov-actions-wrap';
        const back = document.createElement('button');
        back.className = 'soft-btn mini'; back.textContent = '回传思绪';
        back.addEventListener('click', () => {
          const text = pc.type === 'image' ? '（书页图片碎片）' : pc.text;
          notes.unshift({ id: uid('n'), text, archived: false, createdAt: Date.now(), fromBook: book.id });
          saveJSON('fg_notes', notes);
          renderNotes();
          showToast('已经回传到思绪整理 · 想法速记');
        });
        const out = document.createElement('button');
        out.className = 'soft-btn mini ghost'; out.textContent = '取出回桌面';
        out.addEventListener('click', () => {
          benchCards.unshift({ id: uid('bc'), type: pc.type, text: pc.text, img: pc.img, createdAt: Date.now() });
          book.cards = book.cards.filter(x => x.id !== pc.id);
          save(); renderBench(); renderShelf();
          close();
          openBook(book.id);
        });
        act.appendChild(back); act.appendChild(out);
        row.appendChild(act);
        list.appendChild(row);
      });
      const bottom = document.createElement('div');
      bottom.className = 'ov-actions ov-actions-wrap';
      const cover = document.createElement('button');
      cover.className = 'soft-btn mini'; cover.textContent = '装饰封面';
      cover.addEventListener('click', () => { close(); openCoverEditor(book.id); });
      const del = document.createElement('button');
      del.className = 'soft-btn mini ghost'; del.textContent = '收起这本书';
      del.addEventListener('click', close);
      bottom.appendChild(cover); bottom.appendChild(del);
      card.appendChild(t); card.appendChild(meta); card.appendChild(list); card.appendChild(bottom);
    });
  }

  /* 封面：抽卡装饰 or 上传图 */
  function openCoverEditor(bookId) {
    const book = shelves.find(s => s.id === bookId);
    if (!book) return;
    openOverlay((card, close) => {
      const t = document.createElement('div');
      t.className = 'ov-title'; t.textContent = `装饰「${book.title}」的封面`;
      const hint = document.createElement('p');
      hint.className = 'leaf-dialog-hint';
      hint.textContent = '可以用抽到的卡牌装饰，也可以上传一张自己的图。';
      const act = document.createElement('div');
      act.className = 'ov-actions ov-actions-wrap';
      const fileInp = document.createElement('input');
      fileInp.type = 'file'; fileInp.accept = 'image/*'; fileInp.className = 'hidden-file';
      const up = document.createElement('button');
      up.className = 'soft-btn mini'; up.textContent = '上传图片';
      up.addEventListener('click', () => fileInp.click());
      fileInp.addEventListener('change', async () => {
        const f = fileInp.files[0];
        if (!f) return;
        try {
          const data = await shrinkImage(f);
          book.cover = { kind: 'img', value: data };
          save(); renderShelf();
          showToast('封面换好了');
          close();
        } catch (e) { showToast('这张图放不进来，换一张试试'); }
      });
      act.appendChild(up); act.appendChild(fileInp);
      const owned = window.GardenCards ? window.GardenCards.ownedAssets() : [];
      if (owned.length) {
        const lab = document.createElement('small');
        lab.style.cssText = 'width:100%;font-size:12px;color:var(--text-sub);margin-top:6px;';
        lab.textContent = '用抽到的卡牌装饰：';
        act.appendChild(lab);
        owned.forEach(assetId => {
          const b = document.createElement('button');
          b.className = 'soft-btn mini';
          b.innerHTML = `<span class="cover-swatch">${window.GardenCards.assetSVG(assetId)}</span>`;
          b.addEventListener('click', () => {
            book.cover = { kind: 'asset', value: assetId };
            save(); renderShelf();
            showToast('封面换好了');
            close();
          });
          act.appendChild(b);
        });
      } else {
        const p = document.createElement('p');
        p.className = 'leaf-dialog-hint';
        p.textContent = '还没有抽到卡牌。抽到之后，它们也能变成书封。';
        act.appendChild(p);
      }
      const no = document.createElement('button');
      no.className = 'quiet-link'; no.textContent = '先这样';
      no.addEventListener('click', close);
      card.appendChild(t); card.appendChild(hint); card.appendChild(act); card.appendChild(no);
    });
  }

  const refresh = () => { benchCards=load('fg_bench',[]); shelves=load('fg_shelves',[]); renderBench(); renderShelf(); };
  window.addEventListener('fg-data-restored',refresh);
  window.addEventListener('storage',event=>{if(!event.key||['fg_bench','fg_shelves'].includes(event.key))refresh();});
  renderBench();
  renderShelf();
})();
