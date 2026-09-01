/* 幻语 · 主逻辑 */
(function () {
  'use strict';

  var S = Store.load();
  var state = Store.state; // 与 load() 返回值是同一对象
  var $ = function (sel) { return document.querySelector(sel); };

  /* ---------------- 通用 ---------------- */
  function uid() { return Store.uid(); }
  function esc(s) { return window.MD.esc(s); }

  function shade(hex, pct) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function f(v) { v = Math.round(v * (100 + pct) / 100); return Math.max(0, Math.min(255, v)); }
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }
  function grad(c) { return 'linear-gradient(135deg,' + c + ',' + shade(c, -22) + ')'; }
  /** 上传头像: 压缩裁剪为 128px JPEG dataURL */
  function processImageFile(file, cb) {
    if (!file || !/^image\//.test(file.type)) { UI.toast('请选择图片文件', 'err'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var SZ = 128;
        var canvas = document.createElement('canvas');
        canvas.width = SZ; canvas.height = SZ;
        var ctx = canvas.getContext('2d');
        var side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SZ, SZ);
        cb(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { UI.toast('图片读取失败', 'err'); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  /** 表单里的头像上传区: 返回 {el, get:()=>dataURL|''} */
  function avatarPicker(obj) {
    var pending = (obj && obj.avatar) || '';
    var color = (obj && obj.color) || '#8a90a6';
    var emoji = (obj && obj.emoji) || '💬';
    var wrap = UI.el('div', { style: 'display:flex;align-items:center;gap:14px;margin-bottom:14px' });
    var preview = UI.el('div', { class: 'conv-avatar', style: 'width:64px;height:64px;border-radius:18px;font-size:30px;overflow:hidden' });
    function fill() {
      preview.style.background = grad(color);
      preview.innerHTML = '';
      if (pending) preview.appendChild(UI.el('img', { src: pending, alt: '', style: 'width:100%;height:100%;object-fit:cover;display:block' }));
      else preview.textContent = emoji;
      rmBtn.style.display = pending ? '' : 'none';
    }
    var fileInput = UI.el('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    fileInput.addEventListener('change', function (e) {
      var f = e.target.files[0];
      e.target.value = '';
      if (f) processImageFile(f, function (dataURL) { pending = dataURL; fill(); });
    });
    var upBtn = UI.el('button', { class: 'mini-btn primary', text: '上传头像' });
    upBtn.addEventListener('click', function () { fileInput.click(); });
    var rmBtn = UI.el('button', { class: 'mini-btn danger', text: '移除图片' });
    rmBtn.addEventListener('click', function () { pending = ''; fill(); });
    var col = UI.el('div', { style: 'display:flex;flex-direction:column;gap:6px;align-items:flex-start' });
    col.appendChild(UI.el('div', { style: 'font-size:11.5px;color:var(--text-3)', text: '支持上传图片作为头像（本地压缩存储）' }));
    var btnRow = UI.el('div', { style: 'display:flex;gap:6px' });
    btnRow.appendChild(upBtn); btnRow.appendChild(rmBtn);
    col.appendChild(btnRow);
    wrap.appendChild(preview); wrap.appendChild(col); wrap.appendChild(fileInput);
    fill();
    return {
      el: wrap,
      set: function (o) { if (o.color) color = o.color; if (o.emoji) emoji = o.emoji; fill(); },
      get: function () { return pending; }
    };
  }
  function convChar(conv) { return Store.getChar(conv && conv.characterId); }
  function getWorld(id) { return Store.getWorld(id); }
  function convWorld(conv) { return conv && conv.worldId ? getWorld(conv.worldId) : null; }
  function isWorldCharConv(conv) { return Store.isWorldCharConv(conv); }
  function convWorldChar(conv) {
    if (!isWorldCharConv(conv)) return null;
    var w = convWorld(conv);
    return (w && w.characters.find(function (c) { return c.id === conv.characterId; })) || null;
  }
  /** 对话的头像来源: 世界冒险 → 世界; 世界角色私谈 → 该角色; 单角色 → 全局角色 */
  function convPersona(conv) {
    if (!conv) return null;
    if (conv.type === 'world') {
      var w = convWorld(conv);
      return w ? { emoji: w.emoji, color: w.color, name: w.name, tagline: w.tagline, avatar: w.avatar } : null;
    }
    if (isWorldCharConv(conv)) {
      var ch = convWorldChar(conv);
      return ch ? { emoji: ch.emoji, color: ch.color, name: ch.name, tagline: ch.tagline, avatar: ch.avatar } : null;
    }
    var gc = convChar(conv);
    return gc ? { emoji: gc.emoji, color: gc.color, name: gc.name, tagline: gc.tagline, avatar: gc.avatar } : null;
  }
  /** 头像节点: 支持上传图片(avatar dataURL)或 emoji */
  function avatarNode(p, cls, extraStyle) {
    var d = UI.el('div', { class: cls, style: 'background:' + grad(p ? p.color : '#8a90a6') + (extraStyle ? ';' + extraStyle : '') });
    if (p && p.avatar) {
      d.appendChild(UI.el('img', { src: p.avatar, alt: '', style: 'width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block' }));
    } else {
      d.textContent = p ? (p.emoji || '💬') : '💬';
    }
    return d;
  }

  function plainPreview(m) {
    if (!m) return '';
    if (m.error) return '（请求失败）';
    if (m.pending) return '正在输入…';
    var t = (m.content || '').replace(/```[\s\S]*?```/g, '[代码]').replace(/[*_~`#>|\[\]]/g, '').replace(/\s+/g, ' ').trim();
    return t.slice(0, 40);
  }

  /* ---------------- 主题 ---------------- */
  function applyTheme() {
    var t = state.settings.theme;
    var eff = t;
    if (t === 'auto') eff = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', eff);
    var btn = $('#themeToggle');
    if (btn) btn.innerHTML = UI.icon(eff === 'dark' ? 'sun' : 'moon');
  }
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (state.settings.theme === 'auto') applyTheme(); });

  /* ---------------- 抽屉 ---------------- */
  var drawer = $('#drawer'), backdrop = $('#drawerBackdrop');
  var activeTab = 'conv';

  function openDrawer() { drawer.classList.add('open'); backdrop.classList.add('show'); }
  function closeDrawer() { drawer.classList.remove('open'); backdrop.classList.remove('show'); }

  $('#menuBtn').addEventListener('click', openDrawer);
  backdrop.addEventListener('click', closeDrawer);
  $('#themeToggle').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    state.settings.theme = cur === 'dark' ? 'light' : 'dark';
    Store.persist(); applyTheme();
  });

  document.querySelectorAll('.dtab').forEach(function (b) {
    b.addEventListener('click', function () {
      activeTab = b.dataset.tab;
      document.querySelectorAll('.dtab').forEach(function (x) { x.classList.toggle('active', x === b); });
      document.querySelectorAll('.dtab-page').forEach(function (p) { p.hidden = p.dataset.page !== activeTab; });
      renderDrawer();
    });
  });

  $('#searchInput').addEventListener('input', renderDrawer);
  $('#newChatBtn').addEventListener('click', function () { openStartPicker(); });
  $('#headerNewBtn').addEventListener('click', function () { openStartPicker(); });
  $('#addWorldBtn').addEventListener('click', function () { openWorldForm(null); });
  $('#rosterBtn').innerHTML = UI.icon('person');
  $('#rosterBtn').addEventListener('click', function () {
    var conv = Store.activeConv();
    var w = conv && conv.type === 'world' ? convWorld(conv) : null;
    if (w) openRoster(w);
  });
  $('#importWorldBtn').addEventListener('click', function () {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', function (e) {
      var f = e.target.files[0];
      input.remove();
      importWorldFile(f);
    });
    input.click();
  });
  $('#addCharBtn').addEventListener('click', function () { openCharForm(null); });
  $('#addSkillBtn').addEventListener('click', function () { openSkillForm(null); });
  $('#settingsBtn').addEventListener('click', function () { openSettings(); });
  $('#headerTitle').addEventListener('click', function () {
    var conv = Store.activeConv();
    if (conv) openConvSettings(conv);
    else openStartPicker();
  });

  function startWithChar(charId) {
    Store.createConv(charId);
    Store.persist();
    renderAll();
    closeDrawer();
    scrollToBottom(true);
    setTimeout(function () { $('#inputBox').focus(); }, 120);
  }

  /* ---------------- 抽屉渲染 ---------------- */
  function renderDrawer() {
    var q = ($('#searchInput').value || '').trim().toLowerCase();
    renderConvList(q);
    renderWorldGrid(q);
    renderCharGrid(q);
    renderSkillList(q);
  }

  function renderConvList(q) {
    var list = $('#convList');
    list.innerHTML = '';
    var convs = state.conversations.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    var empty = true;
    convs.forEach(function (conv) {
      var persona = convPersona(conv);
      var title = conv.title || '新对话';
      var hay = (title + ' ' + (persona ? persona.name : '') + ' ' + conv.messages.map(function (m) { return m.content || ''; }).join(' ')).toLowerCase();
      if (q && hay.indexOf(q) < 0) return;
      empty = false;
      var item = UI.el('div', { class: 'conv-item' + (conv.id === state.activeConvId ? ' active' : '') });
      var av = avatarNode(persona, 'conv-avatar');
      var meta = UI.el('div', { class: 'conv-meta' });
      meta.appendChild(UI.el('div', { class: 'conv-title', text: (conv.branch ? '⎇ ' : '') + title }));
      var lastMsg = conv.messages[conv.messages.length - 1];
      var who = lastMsg && lastMsg.role === 'user' ? '你：' : '';
      meta.appendChild(UI.el('div', { class: 'conv-preview', text: who + plainPreview(lastMsg) || '（空）' }));
      item.appendChild(av);
      item.appendChild(meta);
      item.appendChild(UI.el('div', { class: 'conv-time', text: UI.fmtTime(conv.updatedAt) }));

      function menuItems() {
        var items = [];
        if (conv.type === 'world') {
          items.push(conv.branch
            ? { label: '回到主线', icon: 'refresh', onClick: function () { switchToMainline(conv); } }
            : null);
          items.push({ label: '分支出世界线', icon: 'swap', onClick: function () { branchThisConv(conv); } });
        }
        items.push({ label: '重命名', icon: 'edit', onClick: function () { renameConv(conv); } });
        items.push({ label: '清空消息', icon: 'broom', onClick: function () { clearConvMsgs(conv); } });
        items.push({ label: '删除对话', icon: 'trash', danger: true, onClick: function () { removeConv(conv); } });
        return items;
      }
      UI.bindContextMenu(item, menuItems);
      item.addEventListener('click', function () {
        state.activeConvId = conv.id;
        Store.persist();
        renderAll();
        closeDrawer();
      });
      list.appendChild(item);
    });
    $('[data-empty="conv"]').hidden = !empty;
  }

  function renderWorldGrid(q) {
    var grid = $('#worldGrid');
    grid.innerHTML = '';
    var empty = true;
    (state.worlds || []).forEach(function (w) {
      if (q && ((w.name + w.tagline + w.rules).toLowerCase().indexOf(q) < 0)) return;
      empty = false;
      var card = UI.el('div', { class: 'char-card' });
      card.appendChild(avatarNode(w, 'char-emoji'));
      card.appendChild(UI.el('div', { class: 'char-name', text: w.name }));
      card.appendChild(UI.el('div', { class: 'char-tag', text: w.tagline || '' }));
      card.appendChild(UI.el('div', { class: 'world-npc-count', text: '🌍 ' + (w.characters || []).length + ' 名角色' }));
      var acts = UI.el('div', { class: 'char-card-acts' });
      var enter = UI.el('button', { class: 'mini-btn primary', text: '进入' });
      var edit = UI.el('button', { class: 'mini-btn', text: '编辑' });
      enter.addEventListener('click', function (e) { e.stopPropagation(); startWithWorld(w.id, false); });
      edit.addEventListener('click', function (e) { e.stopPropagation(); openWorldForm(w); });
      acts.appendChild(enter); acts.appendChild(edit);
      card.appendChild(acts);
      UI.bindContextMenu(card, function () {
        return [
          { label: '继续冒险', icon: 'chat', onClick: function () { startWithWorld(w.id, false); } },
          { label: '开启新冒险', icon: 'plus', onClick: function () { startWithWorld(w.id, true); } },
          { label: '编辑世界', icon: 'edit', onClick: function () { openWorldForm(w); } },
          { label: '导出世界', icon: 'download', onClick: function () { exportWorld(w); } },
          { label: '删除世界', icon: 'trash', danger: true, onClick: function () { removeWorld(w); } }
        ];
      });
      grid.appendChild(card);
    });
    $('[data-empty="world"]').hidden = !empty;
  }

  function startWithWorld(worldId, forceNew) {
    var existing = forceNew ? null : state.conversations.find(function (c) { return c.type === 'world' && c.worldId === worldId; });
    if (existing) {
      state.activeConvId = existing.id;
      Store.persist();
    } else {
      Store.createWorldConv(worldId);
    }
    renderAll();
    closeDrawer();
    scrollToBottom(true);
    setTimeout(function () { $('#inputBox').focus(); }, 120);
  }

  function removeWorld(w) {
    UI.confirmDialog({ title: '删除世界', message: '确定删除世界「' + w.name + '」吗？该世界的冒险对话将保留消息记录，但无法再继续推进剧情。', okText: '删除', danger: true })
      .then(function (yes) {
        if (!yes) return;
        state.worlds = state.worlds.filter(function (x) { return x.id !== w.id; });
        Store.persist(); renderDrawer(); UI.toast('已删除');
      });
  }

  function renderCharGrid(q) {
    var grid = $('#charGrid');
    grid.innerHTML = '';
    var empty = true;
    state.characters.forEach(function (ch) {
      if (q && ((ch.name + ch.tagline).toLowerCase().indexOf(q) < 0)) return;
      empty = false;
      var card = UI.el('div', { class: 'char-card' });
      card.appendChild(avatarNode(ch, 'char-emoji'));
      card.appendChild(UI.el('div', { class: 'char-name', text: ch.name }));
      card.appendChild(UI.el('div', { class: 'char-tag', text: ch.tagline || '' }));
      var acts = UI.el('div', { class: 'char-card-acts' });
      var talk = UI.el('button', { class: 'mini-btn primary', text: '对话' });
      var edit = UI.el('button', { class: 'mini-btn', text: '编辑' });
      talk.addEventListener('click', function (e) { e.stopPropagation(); startWithChar(ch.id); });
      edit.addEventListener('click', function (e) { e.stopPropagation(); openCharForm(ch); });
      acts.appendChild(talk); acts.appendChild(edit);
      card.appendChild(acts);
      UI.bindContextMenu(card, function () {
        return [
          { label: '开始对话', icon: 'chat', onClick: function () { startWithChar(ch.id); } },
          { label: '编辑角色', icon: 'edit', onClick: function () { openCharForm(ch); } },
          { label: '删除角色', icon: 'trash', danger: true, onClick: function () { removeChar(ch); } }
        ];
      });
      grid.appendChild(card);
    });
    $('[data-empty="char"]').hidden = !empty;
  }

  function renderSkillList(q) {
    var list = $('#skillList');
    list.innerHTML = '';
    var empty = true;
    state.skills.forEach(function (sk) {
      if (q && ((sk.name + sk.content).toLowerCase().indexOf(q) < 0)) return;
      empty = false;
      var item = UI.el('div', { class: 'skill-item' });
      item.appendChild(UI.el('div', { class: 'skill-ico', html: UI.icon('sparkles') }));
      var meta = UI.el('div', { class: 'skill-meta' });
      meta.appendChild(UI.el('div', { class: 'skill-name', text: sk.name }));
      meta.appendChild(UI.el('div', { class: 'skill-desc', text: sk.content }));
      item.appendChild(meta);
      var acts = UI.el('div', { class: 'skill-acts' });
      var ins = UI.el('button', { class: 'mini-btn primary', text: '插入' });
      var ed = UI.el('button', { class: 'mini-btn', text: '编辑' });
      var del = UI.el('button', { class: 'mini-btn danger', text: '删除' });
      ins.addEventListener('click', function () {
        var box = $('#inputBox');
        box.value = (box.value ? box.value + '\n' : '') + sk.content;
        box.dispatchEvent(new Event('input'));
        closeDrawer();
        box.focus();
      });
      ed.addEventListener('click', function () { openSkillForm(sk); });
      del.addEventListener('click', function () {
        UI.confirmDialog({ title: '删除技能', message: '确定删除技能「' + sk.name + '」吗？已附加该技能的对话将不再受影响。', okText: '删除', danger: true })
          .then(function (yes) {
            if (!yes) return;
            state.skills = state.skills.filter(function (x) { return x.id !== sk.id; });
            state.conversations.forEach(function (c) { c.skills = (c.skills || []).filter(function (id) { return id !== sk.id; }); });
            Store.persist(); renderDrawer(); renderSkillChips(); UI.toast('已删除');
          });
      });
      acts.appendChild(ins); acts.appendChild(ed); acts.appendChild(del);
      item.appendChild(acts);
      list.appendChild(item);
    });
    $('[data-empty="skill"]').hidden = !empty;
  }

  function renameConv(conv) {
    UI.promptDialog({ title: '重命名对话', value: conv.title, required: true })
      .then(function (v) {
        if (v == null) return;
        conv.title = v;
        conv.updatedAt = Date.now();
        Store.persist(); renderDrawer(); updateHeader();
        UI.toast('已重命名');
      });
  }
  function clearConvMsgs(conv) {
    var isSoloWorld = isWorldCharConv(conv);
    UI.confirmDialog({
      title: '清空消息',
      message: conv.type === 'world' ? '将清空全部剧情记录，并把场景、时间与玩家状态重置回世界初始值。' : (isSoloWorld ? '将清空私谈记录，场景回到「' + ((convWorldChar(conv) || {}).place || '初始') + '」。注意：已写入世界记忆的事实不会被删除。' : '将清空该对话的全部消息记录，且不可恢复。'),
      okText: '清空', danger: true
    })
      .then(function (yes) {
        if (!yes) return;
        if (conv.type === 'world') {
          var w = convWorld(conv);
          conv.scene = { location: '', time: '' };
          conv.status = JSON.parse(JSON.stringify((w && w.initialStatus) || {}));
          conv.present = [];
          conv.messages = (w && w.opening)
            ? [{ id: uid(), role: 'assistant', content: w.opening, reasoning: '', ts: Date.now() }]
            : [];
        } else if (isSoloWorld) {
          var ch = convWorldChar(conv) || {};
          conv.scene = { location: ch.place || '', time: '' };
          var opening = ch.greeting || (ch.place
            ? '（' + ch.place + '。你见到了' + ch.name + (ch.tagline ? '——' + ch.tagline : '') + '。）'
            : '（你见到了' + (ch.name || '对方') + '。）');
          conv.messages = [{ id: uid(), role: 'assistant', content: opening, reasoning: '', ts: Date.now() }];
        } else {
          conv.messages = [];
        }
        conv.updatedAt = Date.now();
        Store.persist(); renderAll();
      });
  }
  function removeConv(conv) {
    UI.confirmDialog({ title: '删除对话', message: '确定删除对话「' + (conv.title || '新对话') + '」吗？该操作不可恢复。', okText: '删除', danger: true })
      .then(function (yes) {
        if (!yes) return;
        if (currentGen && currentGen.convId === conv.id) currentGen.ctrl.abort();
        Store.deleteConv(conv.id);
        renderAll();
        UI.toast('已删除');
      });
  }
  function removeChar(ch) {
    UI.confirmDialog({ title: '删除角色', message: '确定删除角色「' + ch.name + '」吗？相关对话将保留消息，但失去角色设定。', okText: '删除', danger: true })
      .then(function (yes) {
        if (!yes) return;
        state.characters = state.characters.filter(function (x) { return x.id !== ch.id; });
        Store.persist(); renderDrawer(); UI.toast('已删除');
      });
  }

  /* ---------------- 世界线分支 ---------------- */
  function branchThisConv(conv) {
    if (conv.type !== 'world') { UI.toast('只有世界冒险可以分支', 'err'); return; }
    UI.confirmDialog({
      title: '分支出世界线',
      message: '将从当前剧情复制出一条平行世界线：之后的故事走向、玩家状态与世界记忆各自独立；世界规则与角色名册共享。原对话不受影响，可随时从对话列表或面板回到主线。',
      okText: '创建分支'
    })
      .then(function (yes) {
        if (!yes) return;
        if (currentGen && currentGen.convId === conv.id) { UI.toast('请等当前剧情推进完成', 'err'); return; }
        var b = Store.branchWorldConv(conv.id);
        if (!b) { UI.toast('分支失败', 'err'); return; }
        renderAll();
        UI.toast('⎇ 已分支出「' + b.title + '」');
      });
  }
  function switchToMainline(conv) {
    if (!conv.branch) return;
    var main = Store.getConv(conv.branch.of);
    if (!main) { UI.toast('主线对话已被删除', 'err'); return; }
    state.activeConvId = main.id;
    Store.persist();
    renderAll();
    scrollToBottom(true);
    UI.toast('已回到主线「' + main.title + '」');
  }

  /* ---------------- 世界导出 / 导入 ---------------- */
  function exportWorld(w) {
    var payload = { type: 'huanyu-world', version: 1, exportedAt: new Date().toISOString(), world: w };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '世界-' + (w.name || '未命名') + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    UI.toast('已导出世界（含角色名册与记忆）');
  }
  function importWorldFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var w = data && (data.world || data);
        if (!w || !w.name || !Array.isArray(w.characters)) throw new Error('不是有效的世界文件');
        var copy = JSON.parse(JSON.stringify(w));
        copy.id = Store.uid();
        copy.characters = copy.characters || [];
        copy.knowledge = copy.knowledge || [];
        copy.characters.forEach(function (c) { c.id = Store.uid(); });
        state.worlds.push(copy);
        Store.persist();
        renderDrawer();
        UI.toast('世界「' + copy.name + '」已导入');
      } catch (err) {
        UI.toast('导入失败：' + err.message, 'err');
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- 聊天区渲染 ---------------- */
  var msgList = $('#msgList'), msgInner = $('#msgInner');

  function nearBottom() {
    return msgList.scrollHeight - msgList.scrollTop - msgList.clientHeight < 140;
  }
  function scrollToBottom(force) {
    if (force || nearBottom()) msgList.scrollTop = msgList.scrollHeight;
  }

  function renderAll() {
    renderDrawer();
    renderSkillChips();
    updateHeader();
    renderChat();
    updateComposerState();
    updateComposerHint();
  }

  function updateHeader() {
    var conv = Store.activeConv();
    var persona = convPersona(conv);
    var htAv = $('#htAvatar');
    htAv.style.background = grad(persona ? persona.color : '#8a90a6');
    htAv.innerHTML = '';
    if (persona && persona.avatar) htAv.appendChild(UI.el('img', { src: persona.avatar, alt: '', style: 'width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block' }));
    else htAv.textContent = persona ? persona.emoji : '💬';
    $('#htName').textContent = conv ? (conv.type === 'world' ? (persona ? persona.name : '未知世界') : (persona ? persona.name : (conv.title || '新对话'))) : '幻语';
    var sub = $('#htSub');
    if (currentGen) {
      sub.innerHTML = '<span class="live-dot"></span>' + (conv && conv.type === 'world' ? '剧情推进中…' : '正在输入…');
    } else if (conv && conv.type === 'world') {
      var bits = [];
      if (conv.scene && conv.scene.location) bits.push('📍' + conv.scene.location);
      if (conv.scene && conv.scene.time) bits.push('⏰' + conv.scene.time);
      sub.textContent = bits.length ? bits.join(' · ') : (persona ? (persona.tagline || '故事正等待你书写') : '世界已丢失');
    } else if (conv && isWorldCharConv(conv)) {
      var w = convWorld(conv);
      sub.textContent = (persona ? (persona.tagline ? persona.tagline + ' · ' : '') : '') + (w ? '来自「' + w.name + '」' : '');
    } else if (conv) {
      sub.textContent = persona ? (persona.tagline || '点击查看对话设置') : '点击选择一个角色';
    } else {
      sub.textContent = '开启一段新的冒险';
    }
    // 世界冒险: 头部快捷名册按钮
    var rbtn = $('#rosterBtn');
    var wForBtn = conv && conv.type === 'world' ? convWorld(conv) : null;
    rbtn.hidden = !wForBtn;
    // 私谈场景坐标
    if (conv && isWorldCharConv(conv) && conv.scene && conv.scene.location) {
      var el = $('#htSub');
      el.textContent = '📍' + conv.scene.location + ' · ' + el.textContent;
    }
    renderStatusBar();
  }

  /** 玩家状态栏（世界冒险模式） */
  function renderStatusBar() {
    var bar = $('#statusBar');
    var conv = Store.activeConv();
    bar.innerHTML = '';
    var keys = conv && conv.type === 'world' && conv.status ? Object.keys(conv.status) : [];
    if (!keys.length) { bar.hidden = true; return; }
    bar.hidden = false;
    keys.forEach(function (k) {
      bar.appendChild(UI.el('span', { class: 'status-chip', text: k + ' ' + conv.status[k] }));
    });
    bar.appendChild(UI.el('span', { class: 'status-chip', text: '编辑', style: 'background:var(--panel);color:var(--text-3);border:1px solid var(--line)' }))
      .addEventListener('click', function () {
        var conv2 = Store.activeConv();
        if (conv2 && conv2.type === 'world') openWorldPanel(conv2);
      });
  }

  function renderChat() {
    msgInner.innerHTML = '';
    var conv = Store.activeConv();
    if (!conv) {
      renderWelcome();
      return;
    }
    var ch = convPersona(conv);
    if (!conv.messages.length) {
      var w = UI.el('div', { class: 'welcome' });
      w.appendChild(UI.el('div', { class: 'welcome-emoji', style: 'background:' + grad(ch ? ch.color : '#8a90a6'), text: ch ? ch.emoji : '💬' }));
      w.appendChild(UI.el('h2', { text: ch ? ch.name : '开始对话' }));
      w.appendChild(UI.el('p', { text: conv.type === 'world' ? '这个故事还没有开始，说出你想做的事，比如「走进酒馆」或「观察四周」' : (ch ? (ch.tagline || '一切故事，从这里开始') : '在左侧「角色」页创建属于你的角色') }));
      msgInner.appendChild(w);
      return;
    }
    var lastDay = '';
    conv.messages.forEach(function (m) {
      var day = new Date(m.ts).toDateString();
      if (day !== lastDay) {
        lastDay = day;
        var d = new Date(m.ts);
        msgInner.appendChild(UI.el('div', { class: 'time-divider', text: (d.getMonth() + 1) + '月' + d.getDate() + '日' }));
      }
      msgInner.appendChild(buildMsgEl(conv, m));
    });
    scrollToBottom(true);
  }

  function renderWelcome() {
    var w = UI.el('div', { class: 'welcome' });
    w.appendChild(UI.el('div', { class: 'welcome-emoji', style: 'background:' + grad('#7b5bff'), text: '🎭' }));
    w.appendChild(UI.el('h2', { text: '开始你的故事' }));
    w.appendChild(UI.el('p', { text: '选择一个角色，开启一段沉浸式对话；也可以在「角色」页创造属于你的角色。' }));
    var btn = UI.el('button', { class: 'btn primary', text: '选择角色', style: 'margin-top:14px;min-width:160px' });
    btn.addEventListener('click', function () { openCharPicker('选择角色开启对话', startWithChar); });
    w.appendChild(btn);
    msgInner.appendChild(w);
  }

  function appendMsgEl(conv, m) {
    var welcome = msgInner.querySelector('.welcome');
    if (welcome) welcome.remove();
    var node = buildMsgEl(conv, m);
    msgInner.appendChild(node);
    scrollToBottom(true);
    return node;
  }

  /** 世界叙事文本 → 段落(旁白 / NPC对白) */
  function parseWorldSegments(text, rosterNames) {
    var segs = [], cur = null;
    String(text || '').split('\n').forEach(function (line) {
      var m = line.match(/^\s*[\[【]?([^\]】：:【\[]{1,10})[\]】]?\s*[：:]\s*(.*)$/);
      var name = null, content = line;
      if (m) {
        var cand = m[1].trim();
        if (rosterNames.indexOf(cand) >= 0 || /^[「『"“]/.test(m[2])) { name = cand; content = m[2]; }
      }
      var type = name ? 'speech' : 'narration';
      if (cur && cur.type === type && cur.name === name) {
        cur.text += '\n' + content;
      } else {
        cur = { type: type, name: name, text: content };
        segs.push(cur);
      }
    });
    return segs.map(function (s) { return { type: s.type, name: s.name, text: s.text.replace(/^\n+|\n+$/g, '') }; })
      .filter(function (s) { return s.text && s.text.trim(); });
  }

  /** 构建单个叙事段落节点(旁白 / NPC对白) */
  function buildSegmentNode(roster, seg, withCaret) {
    if (seg.type === 'narration') {
      return UI.el('div', { class: 'narration md', html: MD.render(seg.text) + (withCaret ? '<span class="caret"></span>' : '') });
    }
    var chp = roster.find(function (c) { return c.name === seg.name; });
    var row = UI.el('div', { class: 'speech' });
    row.appendChild(avatarNode(chp, 'avatar sm'));
    var wrap = UI.el('div', { class: 'speech-wrap' });
    wrap.appendChild(UI.el('div', { class: 'speech-name', style: chp ? 'color:' + chp.color : '', text: seg.name }));
    wrap.appendChild(UI.el('div', { class: 'bubble md', html: MD.render(seg.text) + (withCaret ? '<span class="caret"></span>' : '') }));
    row.appendChild(wrap);
    return row;
  }

  /** 流式期间增量更新世界叙事段落: 只改动变化的段落, 不重建已完成部分 */
  function updateWorldSegments(node, conv, m) {
    var world = convWorld(conv);
    var roster = world ? (world.characters || []) : [];
    var names = roster.map(function (c) { return c.name; });
    var disp = String(m.content || '').split('⟦STATE⟧')[0];
    if (!disp.trim()) return true; // 还在思考阶段, 打字气泡保持

    var body = node.querySelector('.msg-body');
    if (!body) return false;
    var segs = parseWorldSegments(disp, names);
    if (!segs.length) return true;

    var typing = body.querySelector('.typing-bubble');
    if (typing) typing.remove();

    var rendered = node._segs || [];
    var nodes = body.querySelectorAll(':scope > .narration, :scope > .speech');
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      var p = rendered[i];
      var existing = nodes[i] || null;
      if (existing && p && p.type === s.type && p.name === s.name) {
        if (p.len !== s.text.length) {
          var html = MD.render(s.text) + (i === segs.length - 1 ? '<span class="caret"></span>' : '');
          if (s.type === 'narration') existing.innerHTML = html;
          else {
            var b = existing.querySelector('.bubble');
            if (b) b.innerHTML = html;
          }
        }
      } else {
        var fresh = buildSegmentNode(roster, s, i === segs.length - 1);
        if (existing) existing.replaceWith(fresh);
        else body.appendChild(fresh);
      }
    }
    node._segs = segs.map(function (s) { return { type: s.type, name: s.name, len: s.text.length }; });
    return true;
  }

  /** 渲染世界冒险的一条 GM 叙事消息 */
  function buildWorldBody(conv, m, body) {
    var world = convWorld(conv);
    var roster = world ? (world.characters || []) : [];
    var names = roster.map(function (c) { return c.name; });
    var disp = String(m.content || '').split('⟦STATE⟧')[0];

    if (m.pending && !disp.trim()) {
      var tb = UI.el('div', { class: 'bubble typing-bubble' });
      var tlabel = state.settings.thinking !== 'off' ? '推演世界中…' : '剧情推进中…';
      tb.innerHTML = '<span class="tdots"><i></i><i></i><i></i></span><span class="tlabel">' + tlabel + '</span>';
      body.appendChild(tb);
      return;
    }

    var segs = parseWorldSegments(disp, names);
    if (!segs.length) segs = [{ type: 'narration', name: null, text: disp.trim() }];
    var root = body.parentNode; // 用于记录段落渲染状态
    segs.forEach(function (seg, i) {
      body.appendChild(buildSegmentNode(roster, seg, false));
    });
    if (root && root.hasAttribute && root.hasAttribute('data-mid')) {
      root._segs = segs.map(function (s) { return { type: s.type, name: s.name, len: s.text.length }; });
    }

    // 事件 / 新角色 / 状态变化 提示
    var meta = m.worldMeta;
    if (meta && !m.pending) {
      (meta.events || []).forEach(function (ev) {
        body.appendChild(UI.el('div', { class: 'event-card', html: '<span>📜</span><span>' + esc(ev) + '</span>' }));
      });
      if (meta.statusChange) {
        var s = Object.keys(meta.statusChange).map(function (k) { return k + ' ' + meta.statusChange[k]; }).join('，');
        if (s) body.appendChild(UI.el('div', { class: 'event-card', html: '<span>📊</span><span>' + esc(s) + '</span>' }));
      }
      (meta.newChars || []).forEach(function (nm) {
        var card = UI.el('button', { class: 'newchar-card' });
        card.innerHTML = '<span>✨</span><span>新角色加入：<b>' + esc(nm) + '</b> · 点击编辑</span>';
        card.addEventListener('click', function () {
          var w = convWorld(conv);
          var ch = w && w.characters.find(function (c) { return c.name === nm; });
          if (ch) openCharForm(ch, null, w);
        });
        body.appendChild(card);
      });
    }
  }

  /** 解析并应用 GM/私谈 回复末尾的状态块 */
  function applyWorldState(conv, m) {
    var match = String(m.content || '').match(/⟦STATE⟧([\s\S]*?)(?:⟦\/STATE⟧|$)/);
    if (!match) return false;
    var raw = match[1].trim();
    m.content = String(m.content).replace(/⟦STATE⟧[\s\S]*?(?:⟦\/STATE⟧|$)/, '').trim();
    var data = null;
    try { data = JSON.parse(raw); } catch (e) {
      var s = raw.indexOf('{'), e2 = raw.lastIndexOf('}');
      if (s >= 0 && e2 > s) { try { data = JSON.parse(raw.slice(s, e2 + 1)); } catch (e3) { /* ignore */ } }
    }
    if (!data || typeof data !== 'object') return false;
    var world = convWorld(conv);
    var isSolo = isWorldCharConv(conv);
    var meta = m.worldMeta = m.worldMeta || {};
    var kStore = conv.knowledge || (world && world.knowledge);

    // 长期记忆 → 生效的知识图谱（主线共享世界图谱; 分支写分支快照; 私谈以角色名义归档）
    if (Array.isArray(data.memories) && data.memories.length && kStore) {
      var srcName = isSolo ? ((convWorldChar(conv) || {}).name || '私谈') : (conv.branch ? '分支' : '世界');
      var n = Store.addKnowledge(kStore, data.memories, srcName);
      if (n > 0) meta.memories = n;
    }

    // 私谈: 记忆 + 场景变化即可, 不改动世界的状态/名册
    if (isSolo) {
      if (data.location && conv.scene) {
        conv.scene.location = data.location;
        meta.scene = { location: data.location };
      }
      return true;
    }

    if (data.location || data.time) {
      conv.scene = conv.scene || {};
      if (data.location) conv.scene.location = data.location;
      if (data.time) conv.scene.time = data.time;
      meta.scene = { location: data.location, time: data.time };
    }
    if (Array.isArray(data.events) && data.events.length) meta.events = data.events;
    if (data.status && typeof data.status === 'object') {
      conv.status = Object.assign({}, conv.status, data.status);
      meta.statusChange = data.status;
    }
    if (Array.isArray(data.present) && data.present.length) {
      conv.present = data.present;
      meta.present = data.present;
    }
    if (Array.isArray(data.newCharacters) && data.newCharacters.length) {
      var w = convWorld(conv);
      meta.newChars = meta.newChars || [];
      data.newCharacters.forEach(function (nc) {
        if (!nc || !nc.name) return;
        if (w) {
          var exist = w.characters.find(function (c) { return c.name === nc.name; });
          if (!exist) {
            w.characters.push({
              id: uid(), name: nc.name,
              emoji: nc.emoji || '🧑', color: Store.COLORS[w.characters.length % Store.COLORS.length],
              tagline: nc.tagline || '', system: nc.system || nc.persona || nc.description || ('「' + nc.name + '」是这个世界的一员。'),
              greeting: nc.greeting || ''
            });
            // 新角色的名字与登场, 也写入知识图谱
            if (kStore) Store.addKnowledge(kStore, [{ kind: '人物', text: nc.name + (nc.tagline ? '（' + nc.tagline + '）' : '') + '出现在世界中' }], '世界');
          }
        }
        if (meta.newChars.indexOf(nc.name) < 0) meta.newChars.push(nc.name);
      });
    }
    return true;
  }

  function buildMsgEl(conv, m) {
    var ch = convChar(conv);
    var isUser = m.role === 'user';
    var isWorldMsg = conv.type === 'world' && !isUser;
    var root = UI.el('div', { class: 'msg ' + m.role + (isWorldMsg ? ' world' : ''), 'data-mid': m.id });
    if (!isUser && !isWorldMsg && ch) {
      root.appendChild(avatarNode(ch, 'avatar'));
    }
    var body = UI.el('div', { class: 'msg-body' });

    // 思考过程
    var hasReasoning = !!(m.reasoning && m.reasoning.trim());
    var rEl = null;
    if (hasReasoning || (m.pending && !isUser)) {
      rEl = buildReasoning(m);
      body.appendChild(rEl);
    }

    // 气泡 / 叙事
    if (m.error) {
      var ec = UI.el('div', { class: 'error-card' });
      ec.innerHTML = '<b>' + UI.icon('alert') + '请求失败</b><div class="err-msg">' + esc(m.error) + '</div>';
      var acts = UI.el('div', { class: 'error-acts' });
      var retry = UI.el('button', { class: 'mini-btn primary', text: '重试' });
      var drop = UI.el('button', { class: 'mini-btn', text: '移除' });
      retry.addEventListener('click', function () { delete m.error; regenFrom(conv, m); });
      drop.addEventListener('click', function () {
        conv.messages = conv.messages.filter(function (x) { return x.id !== m.id; });
        Store.persist(); renderChat(); renderConvList('');
      });
      acts.appendChild(retry); acts.appendChild(drop);
      ec.appendChild(acts);
      body.appendChild(ec);
    } else if (isWorldMsg) {
      buildWorldBody(conv, m, body);
    } else if (m.pending && !m.content) {
      var tb = UI.el('div', { class: 'bubble typing-bubble' });
      var thinkLabel = state.settings.thinking !== 'off';
      tb.innerHTML = '<span class="tdots"><i></i><i></i><i></i></span><span class="tlabel">' + (thinkLabel ? '思考中…' : '正在输入…') + '</span>';
      body.appendChild(tb);
    } else {
      // 流式期间隐藏未完成的状态块, 完成后由 applyWorldState 剥离
      var dispContent = String(m.content || '').split('⟦STATE⟧')[0];
      var bub = UI.el('div', { class: 'bubble md', html: MD.render(dispContent) + (m.pending ? '<span class="caret"></span>' : '') });
      body.appendChild(bub);
    }

    // 操作按钮
    if (!m.pending && !m.error) {
      var actsRow = UI.el('div', { class: 'msg-acts' });
      var mk = function (ic, title, act) {
        return UI.el('button', { class: 'act-btn', html: UI.icon(ic), title: title, 'data-act': act, 'data-mid': m.id });
      };
      actsRow.appendChild(mk('copy', '复制', 'copy'));
      if (isUser) actsRow.appendChild(mk('edit', '编辑', 'edit'));
      if (!isUser) actsRow.appendChild(mk('refresh', '重新生成', 'regen'));
      actsRow.appendChild(mk('trash', '删除', 'del'));
      body.appendChild(actsRow);
    }

    root.appendChild(body);
    return root;
  }

  function buildReasoning(m) {
    var thinking = m.pending && !m.content;
    var d = UI.el('details', { class: 'reasoning' + (thinking ? ' thinking' : '') });
    if (thinking) d.setAttribute('open', '');
    var secs = m.thinkMs ? Math.round(m.thinkMs / 1000) : 0;
    var label = thinking ? '深度思考中' : (m.thinkMs ? '已深度思考（用时 ' + secs + ' 秒）' : '思考过程');
    d.innerHTML = '<summary><span class="r-ico">' + (thinking ? '<span class="r-spin"></span>' : UI.icon('brain', 'ic')) + '</span>' +
      '<span class="r-label">' + label + '</span><span class="r-chev">' + UI.icon('chevR', 'ic') + '</span></summary>' +
      '<div class="r-body">' + esc(m.reasoning || '') + '</div>';
    return d;
  }

  /* 消息操作（事件委托） */
  msgInner.addEventListener('click', function (e) {
    var codeBtn = e.target.closest('[data-copy-code]');
    if (codeBtn) {
      var pre = codeBtn.closest('.codeblock').querySelector('pre');
      UI.copyText(pre.textContent).then(function () { UI.toast('代码已复制'); });
      return;
    }
    var actBtn = e.target.closest('.act-btn');
    if (!actBtn) {
      // 点击气泡本身: 手机上切换操作按钮显隐
      var row = e.target.closest('.msg') && e.target.closest('.msg').querySelector('.msg-acts');
      if (row && e.target.closest('.bubble')) {
        row.classList.toggle('show');
      }
      return;
    }
    var mid = actBtn.dataset.mid, act = actBtn.dataset.act;
    var conv = Store.activeConv();
    if (!conv) return;
    var m = conv.messages.find(function (x) { return x.id === mid; });
    if (!m) return;

    if (act === 'copy') {
      UI.copyText(m.content).then(function () { UI.toast('已复制'); });
    } else if (act === 'del') {
      conv.messages = conv.messages.filter(function (x) { return x.id !== m.id; });
      conv.updatedAt = Date.now();
      Store.persist(); renderChat(); renderConvList('');
    } else if (act === 'regen') {
      regenFrom(conv, m);
    } else if (act === 'edit') {
      editUserMessage(conv, m);
    }
  });

  function editUserMessage(conv, m) {
    var el = msgInner.querySelector('[data-mid="' + m.id + '"] .bubble');
    if (!el) return;
    var wrap = UI.el('div', { class: 'bubble-edit' });
    var ta = UI.el('textarea', { text: m.content });
    wrap.appendChild(ta);
    var acts = UI.el('div', { class: 'bubble-edit-acts' });
    var cancel = UI.el('button', { class: 'mini-btn', text: '取消' });
    var save = UI.el('button', { class: 'mini-btn', text: '保存' });
    var regen = UI.el('button', { class: 'mini-btn primary', text: '保存并重问' });
    acts.appendChild(cancel); acts.appendChild(save); acts.appendChild(regen);
    wrap.appendChild(acts);
    el.replaceWith(wrap);
    ta.focus();
    cancel.addEventListener('click', function () { renderChat(); });
    function doSave(andRegen) {
      var v = ta.value.trim();
      if (!v) { UI.toast('内容不能为空', 'err'); return; }
      m.content = v;
      m.ts = Date.now();
      Store.persist();
      if (andRegen) {
        regenFrom(conv, m);
      } else {
        renderChat(); renderConvList('');
      }
    }
    save.addEventListener('click', function () { doSave(false); });
    regen.addEventListener('click', function () { doSave(true); });
  }

  /** 从某条消息处截断并重新生成（m 为最后保留的用户消息，或待重写的助手消息） */
  function regenFrom(conv, m) {
    if (currentGen) { UI.toast('正在生成中，请稍候', 'err'); return; }
    var idx = conv.messages.findIndex(function (x) { return x.id === m.id; });
    if (idx < 0) return;
    if (m.role === 'assistant') {
      // 移除该助手消息及之后所有内容，基于其前面的历史重新生成
      conv.messages.splice(idx);
    } else {
      // 用户消息: 保留自己，移除之后的所有内容
      conv.messages.splice(idx + 1);
    }
    Store.persist();
    renderChat();
    generate(conv);
  }

  /* ---------------- 发送与流式生成 ---------------- */
  var currentGen = null;

  function updateComposerState() {
    var sendBtn = $('#sendBtn');
    var inputBox = $('#inputBox');
    if (currentGen) {
      sendBtn.classList.add('stop');
      sendBtn.innerHTML = UI.icon('stop');
      sendBtn.disabled = false;
      sendBtn.title = '停止生成';
      inputBox.placeholder = '对方正在回复…（可继续输入）';
    } else {
      sendBtn.classList.remove('stop');
      sendBtn.innerHTML = UI.icon('send');
      sendBtn.disabled = !inputBox.value.trim();
      sendBtn.title = '发送';
      inputBox.placeholder = '写点什么…';
    }
  }

  function updateComposerHint() {
    var st = state.settings;
    var hint = $('#composerHint');
    if (st.apiMode === 'demo') {
      hint.textContent = '演示模式 · 在「后台设置」接入你自己的模型 API';
    } else {
      var th = { off: '', low: ' · 思考:低', medium: ' · 思考:中', high: ' · 思考:高' }[st.thinking] || '';
      hint.textContent = (st.model || '未设置模型') + th;
    }
  }

  function handleSend() {
    if (currentGen) { currentGen.ctrl.abort(); return; }
    var inputBox = $('#inputBox');
    var text = inputBox.value.trim();
    if (!text) return;
    var conv = Store.activeConv();
    if (!conv) { UI.toast('请先选择一个角色', 'err'); return; }

    inputBox.value = '';
    autoGrow();
    var um = { id: uid(), role: 'user', content: text, reasoning: '', ts: Date.now() };
    conv.messages.push(um);
    // 首条消息自动作为对话标题（若仍是默认标题）
    if (/^(新对话|与.*的对话)$/.test(conv.title || '')) {
      conv.title = text.slice(0, 14);
    }
    conv.updatedAt = Date.now();
    Store.persist();
    renderConvList('');
    appendMsgEl(conv, um);
    generate(conv);
  }

  async function generate(conv) {
    var m = { id: uid(), role: 'assistant', content: '', reasoning: '', ts: Date.now(), pending: true };
    conv.messages.push(m);
    appendMsgEl(conv, m);

    var ctrl = new AbortController();
    currentGen = { convId: conv.id, msgId: m.id, ctrl: ctrl };
    updateHeader();
    updateComposerState();

    var thinkStart = Date.now();
    var rafId = 0;
    var hasFirstToken = false;

    // 全量重建（仅在首 token / 收尾时使用）
    function updateDom() {
      rafId = 0;
      var node = msgInner.querySelector('[data-mid="' + m.id + '"]');
      if (!node) return;
      var stick = nearBottom();
      var fresh = buildMsgEl(conv, m);
      node.replaceWith(fresh);
      if (stick) scrollToBottom();
    }
    // 流式期间: 只增量更新内容, 不重建整条消息(避免头像图片重载导致闪屏)
    function updateDomLight() {
      rafId = 0;
      var node = msgInner.querySelector('[data-mid="' + m.id + '"]');
      if (!node) return;
      var stick = nearBottom();
      // 思考过程正文就地更新
      var rb = node.querySelector('.reasoning .r-body');
      if (rb && m.reasoning && rb.textContent !== m.reasoning) rb.textContent = m.reasoning;

      if (conv.type === 'world') {
        if (!updateWorldSegments(node, conv, m)) return updateDom();
      } else {
        var disp = String(m.content || '').split('⟦STATE⟧')[0];
        var bub = node.querySelector('.bubble.md');
        if (bub) {
          bub.innerHTML = MD.render(disp) + '<span class="caret"></span>';
        } else if (disp) {
          return updateDom(); // 首个可见内容: 从打字气泡切换为正文
        }
      }
      if (stick) scrollToBottom();
    }
    function schedule() {
      if (!rafId) rafId = requestAnimationFrame(hasFirstToken ? updateDomLight : updateDom);
    }

    try {
      var wObj = conv.type === 'world' ? convWorld(conv) : null;
      var wc = isWorldCharConv(conv) ? convWorldChar(conv) : null;
      await API.chatStream({
        messages: Store.buildContext(conv),
        settings: state.settings,
        charName: (convChar(conv) || wc || {}).name || '对方',
        signal: ctrl.signal,
        worldMode: conv.type === 'world',
        worldCharMode: !!wc,
        world: wObj ? {
          name: wObj.name,
          presentName: (conv.present && conv.present[0]) || (wObj.characters[0] && wObj.characters[0].name) || '店主'
        } : null,
        onReasoning: function (t) {
          m.reasoning += t;
          if (!hasFirstToken) schedule();
        },
        onDelta: function (t) {
          m.content += t;
          if (!hasFirstToken) {
            hasFirstToken = true;
            m.thinkMs = Date.now() - thinkStart;
            updateDom(); // 首token全量重建(落定思考用时标签), 之后走增量
          } else {
            schedule();
          }
        }
      });
      m.pending = false;
      if (!m.content) { m.content = '（对方沉默了片刻…）'; }
    } catch (e) {
      m.pending = false;
      if (e && (e.name === 'AbortError' || ctrl.signal.aborted)) {
        m.stopped = true;
        if (!m.content) m.content = '（对话被中止）';
        else m.content += '\n\n（已停止生成）';
      } else {
        m.error = (e && e.message) || String(e);
      }
    }

    if (rafId) cancelAnimationFrame(rafId);
    m.pending = false;
    // 世界冒险/私谈: 解析并应用状态块(场景/事件/状态/新角色/记忆入图谱)
    var worldChanged = false;
    if ((conv.type === 'world' || isWorldCharConv(conv)) && !m.error) {
      worldChanged = applyWorldState(conv, m);
    }
    currentGen = null;
    conv.updatedAt = Date.now();
    Store.persist();

    var node = msgInner.querySelector('[data-mid="' + m.id + '"]');
    if (node) {
      var stick = nearBottom();
      node.replaceWith(buildMsgEl(conv, m));
      if (stick) scrollToBottom();
    }
    updateHeader();
    updateComposerState();
    renderConvList('');
  }

  /* ---------------- 输入框 ---------------- */
  var inputBox = $('#inputBox');
  function autoGrow() {
    inputBox.style.height = 'auto';
    inputBox.style.height = Math.min(inputBox.scrollHeight, 132) + 'px';
  }
  inputBox.addEventListener('input', function () {
    autoGrow();
    updateComposerState();
  });
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  inputBox.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !coarse) {
      e.preventDefault();
      handleSend();
    }
  });
  inputBox.addEventListener('focus', function () {
    setTimeout(function () { scrollToBottom(true); }, 350);
  });
  $('#sendBtn').addEventListener('click', handleSend);

  /* ---------------- 附加技能 Chips ---------------- */
  function renderSkillChips() {
    var conv = Store.activeConv();
    var box = $('#skillChips');
    box.innerHTML = '';
    if (!conv || !(conv.skills || []).length) { box.hidden = true; return; }
    box.hidden = false;
    conv.skills.forEach(function (sid) {
      var sk = state.skills.find(function (x) { return x.id === sid; });
      if (!sk) return;
      var chip = UI.el('span', { class: 'chip' });
      chip.innerHTML = UI.icon('sparkles') + '<span>' + esc(sk.name) + '</span>';
      var x = UI.el('button', { html: UI.icon('close'), title: '移除' });
      x.addEventListener('click', function () {
        conv.skills = conv.skills.filter(function (i) { return i !== sid; });
        Store.persist();
        renderSkillChips();
      });
      chip.appendChild(x);
      box.appendChild(chip);
    });
  }

  $('#attachBtn').innerHTML = UI.icon('sparkles');
  $('#attachBtn').addEventListener('click', function () {
    var conv = Store.activeConv();
    if (!conv) { UI.toast('请先选择一个角色', 'err'); return; }
    openAttachSheet(conv);
  });

  function openAttachSheet(conv) {
    var body = UI.el('div', {});
    body.appendChild(UI.el('div', { style: 'font-size:12.5px;color:var(--text-3);padding:0 2px 10px', text: '附加的技能将作为长期指令注入本对话的角色设定中。' }));
    state.skills.forEach(function (sk) {
      var on = (conv.skills || []).indexOf(sk.id) >= 0;
      var row = UI.switchRow(sk.name, sk.content.slice(0, 42) + (sk.content.length > 42 ? '…' : ''), on, function (v) {
        conv.skills = conv.skills || [];
        if (v) conv.skills.push(sk.id);
        else conv.skills = conv.skills.filter(function (i) { return i !== sk.id; });
        Store.persist();
        renderSkillChips();
      });
      body.appendChild(row);
    });
    if (!state.skills.length) {
      body.appendChild(UI.el('div', { class: 'empty-tip', text: '技能库还是空的' }));
    }
    var foot = UI.el('button', { class: 'btn plain block', text: '前往技能库管理' });
    var entry = null;
    foot.addEventListener('click', function () {
      if (entry) entry.close();
      document.querySelector('.dtab[data-tab="skill"]').click();
      closeDrawerIfMobile(); openDrawer();
    });
    entry = UI.openSheet({ title: '附加技能 · ' + (conv.title || ''), body: body, footer: foot });
  }

  function closeDrawerIfMobile() {
    if (window.innerWidth <= 860) closeDrawer();
  }

  /* ---------------- 开启冒险选择器(世界 / 单角色) ---------------- */
  function openStartPicker() {
    var body = UI.el('div', {});

    body.appendChild(UI.el('div', { class: 'divider-label', text: '🌍 世界冒险 · 你扮演自己，在异世界中活动' }));
    var wGrid = UI.el('div', { class: 'pick-grid' });
    (state.worlds || []).forEach(function (w) {
      var card = UI.el('button', { class: 'pick-card' });
      card.appendChild(avatarNode(w, 'char-emoji'));
      card.appendChild(UI.el('div', { class: 'char-name', text: w.name }));
      card.appendChild(UI.el('div', { class: 'char-tag', text: w.tagline || '' }));
      card.addEventListener('click', function () { entry.close(); startWithWorld(w.id, false); });
      wGrid.appendChild(card);
    });
    body.appendChild(wGrid);
    var mkWorld = UI.el('button', { class: 'btn plain block', text: '＋ 创造新世界', style: 'margin-top:12px' });
    mkWorld.addEventListener('click', function () {
      entry.close();
      openWorldForm(null, function (w) { startWithWorld(w.id, true); });
    });
    body.appendChild(mkWorld);

    body.appendChild(UI.el('div', { class: 'divider-label', text: '🎭 单角色对话 · 与一位角色面对面' }));
    var grid = UI.el('div', { class: 'pick-grid' });
    state.characters.forEach(function (ch) {
      var card = UI.el('button', { class: 'pick-card' });
      card.appendChild(avatarNode(ch, 'char-emoji'));
      card.appendChild(UI.el('div', { class: 'char-name', text: ch.name }));
      card.appendChild(UI.el('div', { class: 'char-tag', text: ch.tagline || '' }));
      card.addEventListener('click', function () { entry.close(); startWithChar(ch.id); });
      grid.appendChild(card);
    });
    body.appendChild(grid);
    var mkChar = UI.el('button', { class: 'btn plain block', text: '＋ 创建新角色', style: 'margin-top:12px' });
    mkChar.addEventListener('click', function () {
      entry.close();
      openCharForm(null, function (ch) { startWithChar(ch.id); });
    });
    body.appendChild(mkChar);

    var entry = UI.openSheet({ title: '开启新冒险', body: body });
  }

  /* ---------------- 角色编辑表单 ---------------- */
  var EMOJIS = ['🌸', '🤖', '⚔️', '🏛️', '🧙‍♀️', '🎭', '🐱', '🦊', '🐉', '🦄', '👻', '🥷', '👽', '🌟', '🌙', '🔥', '❄️', '🍀', '👑', '🎓', '🩺', '🕵️', '💃', '🎸'];

  /**
   * 角色/人物编辑表单
   * @param world 传入世界对象时，角色保存到该世界的名册
   */
  function openCharForm(ch, onSaved, world) {
    var isNew = !ch;
    ch = ch || { id: uid(), name: '', emoji: EMOJIS[0], color: Store.COLORS[Math.floor(Math.random() * 8)], tagline: '', system: '', greeting: '' };

    var body = UI.el('div', {});
    var avatarCtl = avatarPicker(ch);
    body.appendChild(avatarCtl.el);
    var nameIn = UI.el('input', { class: 'form-input', type: 'text', placeholder: '角色的名字', value: ch.name });
    body.appendChild(UI.formGroup('名称', nameIn));

    var emojiGrid = UI.el('div', { class: 'emoji-grid' });
    var selEmoji = ch.emoji;
    EMOJIS.forEach(function (em) {
      var b = UI.el('button', { class: 'emoji-opt' + (em === selEmoji ? ' sel' : ''), text: em });
      b.addEventListener('click', function () {
        selEmoji = em;
        emojiGrid.querySelectorAll('.emoji-opt').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        avatarCtl.set({ emoji: em });
      });
      emojiGrid.appendChild(b);
    });
    body.appendChild(UI.formGroup('头像', emojiGrid));

    var colorGrid = UI.el('div', { class: 'color-grid' });
    var selColor = ch.color;
    Store.COLORS.forEach(function (c) {
      var b = UI.el('button', { class: 'color-opt' + (c === selColor ? ' sel' : ''), style: 'background:' + grad(c) });
      b.addEventListener('click', function () {
        selColor = c;
        colorGrid.querySelectorAll('.color-opt').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        avatarCtl.set({ color: c });
      });
      colorGrid.appendChild(b);
    });
    body.appendChild(UI.formGroup('主题色', colorGrid));

    var tagIn = UI.el('input', { class: 'form-input', type: 'text', placeholder: '一句话简介，如「温柔的知心朋友」', value: ch.tagline || '' });
    body.appendChild(UI.formGroup('简介', tagIn));

    if (world) {
      var placeIn = UI.el('input', { class: 'form-input', type: 'text', placeholder: '如「银鹿酒馆吧台」「自家小院」，私谈将默认从这里开始', value: ch.place || '' });
      body.appendChild(UI.formGroup('常在地点', placeIn, '私谈的默认场景'));
      body._placeIn = placeIn;
    }

    var sysTa = UI.el('textarea', { class: 'form-textarea', placeholder: '描述这个角色的身份、性格、说话风格、世界观…这是角色的灵魂，越具体越传神。' });
    sysTa.value = ch.system || '';
    sysTa.rows = 6;
    body.appendChild(UI.formGroup('人设 / 系统提示词', sysTa, '角色的核心设定'));

    var greetTa = UI.el('textarea', { class: 'form-textarea', placeholder: '角色登场时说的第一句话，可用（括号）描写动作神态。' });
    greetTa.value = ch.greeting || '';
    greetTa.rows = 4;
    body.appendChild(UI.formGroup('开场白', greetTa, '可选'));

    var acts = UI.el('div', { class: 'form-acts' });
    var cancel = UI.el('button', { class: 'btn plain', text: '取消' });
    var save = UI.el('button', { class: 'btn primary', text: isNew ? '创建角色' : '保存修改' });
    acts.appendChild(cancel); acts.appendChild(save);
    body.appendChild(acts);

    var entry = UI.openSheet({ title: (world ? (isNew ? '添加世界人物' : '编辑人物 · ') : (isNew ? '创建角色' : '编辑角色 · ')) + (isNew ? '' : ch.name), body: body });
    cancel.addEventListener('click', function () { entry.close(); });
    save.addEventListener('click', function () {
      var name = nameIn.value.trim();
      var system = sysTa.value.trim();
      if (!name) { UI.toast('请填写角色名称', 'err'); nameIn.focus(); return; }
      if (!system) { UI.toast('请填写人设/系统提示词', 'err'); sysTa.focus(); return; }
      ch.name = name; ch.emoji = selEmoji; ch.color = selColor;
      ch.tagline = tagIn.value.trim(); ch.system = system; ch.greeting = greetTa.value.trim();
      if (world && body._placeIn) ch.place = body._placeIn.value.trim();
      var av = avatarCtl.get();
      if (av) ch.avatar = av; else delete ch.avatar;
      if (isNew) {
        if (world) world.characters.push(ch);
        else state.characters.push(ch);
      }
      Store.persist();
      renderDrawer(); updateHeader(); renderChat();
      entry.close();
      UI.toast(isNew ? (world ? '「' + name + '」加入了世界' : '角色已创建') : '已保存');
      if (onSaved) onSaved(ch);
    });
  }

  /* ---------------- 世界编辑表单 ---------------- */
  function openWorldForm(w, onSaved) {
    var isNew = !w;
    w = w || { id: uid(), name: '', emoji: '🌍', color: Store.COLORS[Math.floor(Math.random() * 8)], tagline: '', rules: '', opening: '', initialStatus: {}, characters: [] };

    var body = UI.el('div', {});
    var avatarCtl = avatarPicker(w);
    body.appendChild(avatarCtl.el);
    var nameIn = UI.el('input', { class: 'form-input', type: 'text', placeholder: '世界名称，如「艾兰西亚大陆」', value: w.name });
    body.appendChild(UI.formGroup('名称', nameIn));

    var emojiGrid = UI.el('div', { class: 'emoji-grid' });
    var selEmoji = w.emoji;
    ['🌍', '🗡️', '🌃', '🏰', '🐉', '🌙', '🍄', '🌵', ' ❄️', '🔥', '⚓', '🚀', '🏚️', '⛩️', '🧭', '🧪', '🦋', '🎭', '🌌', '🏝️', '⛰️', '🌾', '🕯️', '📜'].forEach(function (em) {
      em = em.trim();
      var b = UI.el('button', { class: 'emoji-opt' + (em === selEmoji ? ' sel' : ''), text: em });
      b.addEventListener('click', function () {
        selEmoji = em;
        emojiGrid.querySelectorAll('.emoji-opt').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        avatarCtl.set({ emoji: em });
      });
      emojiGrid.appendChild(b);
    });
    body.appendChild(UI.formGroup('图标', emojiGrid));

    var colorGrid = UI.el('div', { class: 'color-grid' });
    var selColor = w.color;
    Store.COLORS.forEach(function (c) {
      var b = UI.el('button', { class: 'color-opt' + (c === selColor ? ' sel' : ''), style: 'background:' + grad(c) });
      b.addEventListener('click', function () {
        selColor = c;
        colorGrid.querySelectorAll('.color-opt').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        avatarCtl.set({ color: c });
      });
      colorGrid.appendChild(b);
    });
    body.appendChild(UI.formGroup('主题色', colorGrid));

    var tagIn = UI.el('input', { class: 'form-input', type: 'text', placeholder: '一句话简介，如「剑与魔法的大陆」', value: w.tagline || '' });
    body.appendChild(UI.formGroup('简介', tagIn));

    var rulesTa = UI.el('textarea', { class: 'form-textarea', rows: 6, placeholder: '这个世界的运行规则：力量体系、种族、势力、危险与禁忌、整体基调…规则越清晰，AI 的演绎就越稳定。' });
    rulesTa.value = w.rules || '';
    body.appendChild(UI.formGroup('世界规则 / 世界观', rulesTa, '世界的核心设定'));

    var openTa = UI.el('textarea', { class: 'form-textarea', rows: 4, placeholder: '玩家登场时的开场剧情，用第二人称「你」描写场景。这段文字会作为故事的第一幕呈现。' });
    openTa.value = w.opening || '';
    body.appendChild(UI.formGroup('开场剧情', openTa, '故事的第一幕'));

    var statusTa = UI.el('textarea', { class: 'form-textarea', rows: 2, placeholder: '{"金币": "50", "生命": "100"}' });
    statusTa.value = w.initialStatus && Object.keys(w.initialStatus).length ? JSON.stringify(w.initialStatus, null, 0) : '';
    body.appendChild(UI.formGroup('初始玩家状态 (JSON)', statusTa, '可选，AI 会在剧情中更新'));

    var acts = UI.el('div', { class: 'form-acts' });
    var cancel = UI.el('button', { class: 'btn plain', text: '取消' });
    var save = UI.el('button', { class: 'btn primary', text: isNew ? '创造世界' : '保存修改' });
    acts.appendChild(cancel); acts.appendChild(save);
    body.appendChild(acts);

    var entry = UI.openSheet({ title: isNew ? '创造新世界' : '编辑世界 · ' + w.name, body: body });
    cancel.addEventListener('click', function () { entry.close(); });
    save.addEventListener('click', function () {
      var name = nameIn.value.trim();
      if (!name) { UI.toast('请填写世界名称', 'err'); nameIn.focus(); return; }
      var status = {};
      if (statusTa.value.trim()) {
        try { status = JSON.parse(statusTa.value) || {}; }
        catch (e) { UI.toast('初始状态 JSON 格式有误', 'err'); return; }
      }
      w.name = name; w.emoji = selEmoji; w.color = selColor;
      w.tagline = tagIn.value.trim(); w.rules = rulesTa.value.trim();
      w.opening = openTa.value.trim(); w.initialStatus = status;
      w.characters = w.characters || [];
      var av = avatarCtl.get();
      if (av) w.avatar = av; else delete w.avatar;
      if (isNew) state.worlds.push(w);
      Store.persist();
      renderDrawer();
      entry.close();
      UI.toast(isNew ? '世界「' + name + '」已诞生' : '已保存');
      if (onSaved) onSaved(w);
    });
  }

  /* ---------------- 技能编辑表单 ---------------- */
  function openSkillForm(sk, onSaved) {
    var isNew = !sk;
    sk = sk || { id: uid(), name: '', content: '' };
    var body = UI.el('div', {});
    var nameIn = UI.el('input', { class: 'form-input', type: 'text', placeholder: '技能名称，如「细节描写增强」', value: sk.name });
    body.appendChild(UI.formGroup('名称', nameIn));
    var ta = UI.el('textarea', { class: 'form-textarea', rows: 7, placeholder: '技能内容：希望模型遵循的具体指令。例如写作风格、输出格式、语言要求…' });
    ta.value = sk.content || '';
    body.appendChild(UI.formGroup('内容 / 指令', ta));
    var acts = UI.el('div', { class: 'form-acts' });
    var cancel = UI.el('button', { class: 'btn plain', text: '取消' });
    var save = UI.el('button', { class: 'btn primary', text: isNew ? '创建技能' : '保存修改' });
    acts.appendChild(cancel); acts.appendChild(save);
    body.appendChild(acts);

    var entry = UI.openSheet({ title: isNew ? '新建技能' : '编辑技能 · ' + sk.name, body: body });
    cancel.addEventListener('click', function () { entry.close(); });
    save.addEventListener('click', function () {
      if (!nameIn.value.trim()) { UI.toast('请填写技能名称', 'err'); return; }
      if (!ta.value.trim()) { UI.toast('请填写技能内容', 'err'); return; }
      sk.name = nameIn.value.trim(); sk.content = ta.value.trim();
      if (isNew) state.skills.push(sk);
      Store.persist();
      renderDrawer(); renderSkillChips();
      entry.close();
      UI.toast(isNew ? '技能已创建' : '已保存');
      if (onSaved) onSaved(sk);
    });
  }

  /* ---------------- 对话设置 ---------------- */
  function openConvSettings(conv) {
    if (conv.type === 'world') { openWorldPanel(conv); return; }
    var ch = convChar(conv);
    var body = UI.el('div', {});

    // 角色卡
    var card = UI.el('div', { style: 'display:flex;align-items:center;gap:12px;padding:6px 2px 14px' });
    card.appendChild(avatarNode(ch, 'conv-avatar', 'width:52px;height:52px;border-radius:16px'));
    var info = UI.el('div', { style: 'flex:1;min-width:0' });
    info.appendChild(UI.el('div', { style: 'font-weight:700;font-size:16px', text: ch ? ch.name : '（角色已删除）' }));
    info.appendChild(UI.el('div', { style: 'font-size:12px;color:var(--text-3)', text: ch ? (ch.tagline || '') : (conv.title || '') }));
    card.appendChild(info);
    var swap = UI.el('button', { class: 'mini-btn', text: '切换角色' });
    swap.addEventListener('click', function () {
      entry.close();
      openCharPicker('切换本对话的角色', function (cid) {
        conv.characterId = cid;
        conv.updatedAt = Date.now();
        Store.persist(); renderAll();
        UI.toast('角色已切换');
      });
    });
    card.appendChild(swap);
    body.appendChild(card);

    // 重命名
    var rRow = UI.el('button', { class: 'set-row' });
    rRow.innerHTML = '<span class="sr-ico">' + UI.icon('edit') + '</span><span class="sr-text"><span class="sr-title">重命名对话</span><span class="sr-desc">' + esc(conv.title || '') + '</span></span><span class="sr-arrow">' + UI.icon('chevR') + '</span>';
    rRow.addEventListener('click', function () { entry.close(); renameConv(conv); });
    body.appendChild(rRow);

    // 附加技能
    var skRow = UI.el('button', { class: 'set-row' });
    var skNames = (conv.skills || []).map(function (sid) {
      var s = state.skills.find(function (x) { return x.id === sid; });
      return s ? s.name : '';
    }).filter(Boolean).join('、');
    skRow.innerHTML = '<span class="sr-ico">' + UI.icon('sparkles') + '</span><span class="sr-text"><span class="sr-title">附加技能</span><span class="sr-desc">' + esc(skNames || '未附加') + '</span></span><span class="sr-arrow">' + UI.icon('chevR') + '</span>';
    skRow.addEventListener('click', function () { entry.close(); openAttachSheet(conv); });
    body.appendChild(skRow);

    // 危险区
    var cRow = UI.el('button', { class: 'set-row' });
    cRow.innerHTML = '<span class="sr-ico danger">' + UI.icon('broom') + '</span><span class="sr-text"><span class="sr-title">清空消息</span><span class="sr-desc">保留对话，清除全部消息记录</span></span>';
    cRow.addEventListener('click', function () { entry.close(); clearConvMsgs(conv); });
    body.appendChild(cRow);

    var dRow = UI.el('button', { class: 'set-row' });
    dRow.innerHTML = '<span class="sr-ico danger">' + UI.icon('trash') + '</span><span class="sr-text"><span class="sr-title">删除对话</span><span class="sr-desc">删除整个对话，不可恢复</span></span>';
    dRow.addEventListener('click', function () { entry.close(); removeConv(conv); });
    body.appendChild(dRow);

    var entry = UI.openSheet({ title: '对话设置', body: body });
  }

  /* ---------------- 世界面板（世界冒险的对话设置） ---------------- */
  function openWorldPanel(conv) {
    var w = convWorld(conv);
    var body = UI.el('div', {});

    // 世界信息卡
    var card = UI.el('div', { style: 'display:flex;align-items:center;gap:12px;padding:6px 2px 14px' });
    card.appendChild(avatarNode(w, 'conv-avatar', 'width:52px;height:52px;border-radius:16px'));
    var info = UI.el('div', { style: 'flex:1;min-width:0' });
    info.appendChild(UI.el('div', { style: 'font-weight:700;font-size:16px', text: w ? w.name : '（世界已删除）' }));
    info.appendChild(UI.el('div', { style: 'font-size:12px;color:var(--text-3)', text: w ? (w.tagline || '') : (conv.title || '') }));
    card.appendChild(info);
    if (w) {
      var editW = UI.el('button', { class: 'mini-btn', text: '编辑世界' });
      editW.addEventListener('click', function () { entry.close(); openWorldForm(w); });
      card.appendChild(editW);
    }
    body.appendChild(card);

    // 当前场景
    var sceneDesc = [];
    if (conv.scene && conv.scene.location) sceneDesc.push('📍' + conv.scene.location);
    if (conv.scene && conv.scene.time) sceneDesc.push('⏰' + conv.scene.time);
    var scRow = UI.el('button', { class: 'set-row' });
    scRow.innerHTML = '<span class="sr-ico">' + UI.icon('chevR') + '</span><span class="sr-text"><span class="sr-title">当前场景</span><span class="sr-desc">' + esc(sceneDesc.join(' · ') || '尚未进入具体场景') + '</span></span><span class="sr-arrow">' + UI.icon('edit') + '</span>';
    scRow.addEventListener('click', function () {
      UI.promptDialog({ title: '地点', value: (conv.scene && conv.scene.location) || '', required: false })
        .then(function (loc) {
          if (loc === null) return;
          conv.scene = conv.scene || {};
          conv.scene.location = loc;
          return UI.promptDialog({ title: '时间', value: (conv.scene && conv.scene.time) || '', required: false });
        })
        .then(function (time) {
          if (time === null) return;
          conv.scene = conv.scene || {};
          conv.scene.time = time;
          conv.updatedAt = Date.now();
          Store.persist(); updateHeader();
          UI.toast('场景已更新');
        });
    });
    body.appendChild(scRow);

    // 世界线（主线 / 分支）
    var lineRow = UI.el('button', { class: 'set-row' });
    lineRow.innerHTML = '<span class="sr-ico">' + UI.icon('swap') + '</span><span class="sr-text"><span class="sr-title">世界线' + (conv.branch ? ' · 分支' : ' · 主线') + '</span><span class="sr-desc">' +
      (conv.branch ? '由「' + esc(conv.branch.ofTitle) + '」分出，剧情与记忆独立' : '从任意剧情处分支出平行世界线，互不干扰') + '</span></span><span class="sr-arrow">' + (conv.branch ? UI.icon('refresh') : UI.icon('plus')) + '</span>';
    lineRow.addEventListener('click', function () {
      if (conv.branch) switchToMainline(conv);
      else branchThisConv(conv);
    });
    body.appendChild(lineRow);
    if (conv.branch) {
      var backRow = UI.el('button', { class: 'set-row' });
      backRow.innerHTML = '<span class="sr-ico danger">' + UI.icon('refresh') + '</span><span class="sr-text"><span class="sr-title">回到主线</span><span class="sr-desc">切换回「' + esc(conv.branch.ofTitle) + '」，本分支保留在对话列表</span></span>';
      backRow.addEventListener('click', function () { entry.close(); switchToMainline(conv); });
      body.appendChild(backRow);
    }

    // 角色名册
    if (w) {
      var rosterRow = UI.el('button', { class: 'set-row' });
      rosterRow.innerHTML = '<span class="sr-ico">' + UI.icon('person') + '</span><span class="sr-text"><span class="sr-title">角色名册</span><span class="sr-desc">' + w.characters.length + ' 名角色 · 可与其私谈，共享世界记忆</span></span><span class="sr-arrow">' + UI.icon('chevR') + '</span>';
      rosterRow.addEventListener('click', function () { openRoster(w); });
      body.appendChild(rosterRow);

      // 知识图谱
      var kgRow = UI.el('button', { class: 'set-row' });
      kgRow.innerHTML = '<span class="sr-ico">' + UI.icon('sparkles') + '</span><span class="sr-text"><span class="sr-title">世界记忆 · 知识图谱</span><span class="sr-desc">' + Store.effectiveKnowledge(conv).length + ' 条事实 · 代替长历史节约 token</span></span><span class="sr-arrow">' + UI.icon('chevR') + '</span>';
      kgRow.addEventListener('click', function () { openKnowledgeSheet(w, conv); });
      body.appendChild(kgRow);
    }

    // 附加技能
    var skRow = UI.el('button', { class: 'set-row' });
    var skNames = (conv.skills || []).map(function (sid) {
      var s = state.skills.find(function (x) { return x.id === sid; });
      return s ? s.name : '';
    }).filter(Boolean).join('、');
    skRow.innerHTML = '<span class="sr-ico">' + UI.icon('sparkles') + '</span><span class="sr-text"><span class="sr-title">附加技能</span><span class="sr-desc">' + esc(skNames || '未附加') + '</span></span><span class="sr-arrow">' + UI.icon('chevR') + '</span>';
    skRow.addEventListener('click', function () { openAttachSheet(conv); });
    body.appendChild(skRow);

    // 危险区
    var cRow = UI.el('button', { class: 'set-row' });
    cRow.innerHTML = '<span class="sr-ico danger">' + UI.icon('broom') + '</span><span class="sr-text"><span class="sr-title">重新开始这段冒险</span><span class="sr-desc">清空剧情，场景与状态重置回世界初始值</span></span>';
    cRow.addEventListener('click', function () { entry.close(); clearConvMsgs(conv); });
    body.appendChild(cRow);

    var dRow = UI.el('button', { class: 'set-row' });
    dRow.innerHTML = '<span class="sr-ico danger">' + UI.icon('trash') + '</span><span class="sr-text"><span class="sr-title">删除冒险</span><span class="sr-desc">删除整个对话，不可恢复</span></span>';
    dRow.addEventListener('click', function () { entry.close(); removeConv(conv); });
    body.appendChild(dRow);

    var entry = UI.openSheet({ title: '世界面板', body: body });
  }

  /** 世界知识图谱（长期记忆）查看与编辑；分支对话编辑的是分支自己的图谱 */
  function openKnowledgeSheet(world, conv) {
    var isBranch = !!(conv && conv.branch && conv.knowledge);
    var store = isBranch ? conv.knowledge : (world.knowledge = world.knowledge || []);
    var body = UI.el('div', {});
    if (isBranch) {
      body.appendChild(UI.el('div', { style: 'font-size:12px;color:var(--warn);background:color-mix(in srgb, var(--warn) 12%, transparent);border-radius:10px;padding:8px 12px;margin-bottom:8px', text: '⎇ 当前是分支世界线：这里的记忆独立于主线，只影响本分支的剧情。' }));
    }
    body.appendChild(UI.el('div', { style: 'font-size:12.5px;color:var(--text-3);padding:0 2px 10px;line-height:1.7', text: '世界以「知识图谱」方式记住剧情：只保留重要事实（人物/事件/地点/关系/物品），每次请求只注入这些事实 + 最近对话，而不是全部历史，大幅节约 token。世界冒险与世界角色私谈共享这份记忆。' }));

    var listWrap = UI.el('div', {});
    body.appendChild(listWrap);

    function renderList() {
      listWrap.innerHTML = '';
      if (!store.length) {
        listWrap.appendChild(UI.el('div', { class: 'empty-tip', text: '还没有记忆，去世界里冒险吧' }));
        return;
      }
      var KINDS = ['人物', '事件', '地点', '关系', '物品'];
      var groups = {};
      store.forEach(function (k) {
        (groups[k.kind] = groups[k.kind] || []).push(k);
      });
      KINDS.forEach(function (kind) {
        var items = groups[kind];
        if (!items || !items.length) return;
        listWrap.appendChild(UI.el('div', { class: 'divider-label', text: kind + ' · ' + items.length }));
        items.forEach(function (k) {
          var row = UI.el('div', { class: 'set-row' });
          row.innerHTML = '<span class="sr-text"><span class="sr-title" style="font-weight:500;font-size:13.5px">' + esc(k.text) + '</span><span class="sr-desc">来源：' + esc(k.src) + '</span></span>';
          var delB = UI.el('button', { class: 'mini-btn danger', text: '删除', style: 'flex:none' });
          delB.addEventListener('click', function () {
            var idx = store.indexOf(k);
            if (idx >= 0) store.splice(idx, 1);
            Store.persist(); renderList();
          });
          row.appendChild(delB);
          listWrap.appendChild(row);
        });
      });
      // 其他类别
      var others = store.filter(function (k) { return KINDS.indexOf(k.kind) < 0; });
      if (others.length) {
        others.forEach(function (k) {
          var row = UI.el('div', { class: 'set-row' });
          row.innerHTML = '<span class="sr-text"><span class="sr-title" style="font-weight:500;font-size:13.5px">' + esc(k.text) + '</span></span>';
          listWrap.appendChild(row);
        });
      }
    }
    renderList();

    // 手动添加
    var addRow = UI.el('div', { style: 'display:flex;gap:8px;margin-top:14px' });
    var kindSel = UI.el('select', { class: 'form-select', style: 'flex:none;width:86px' });
    ['人物', '事件', '地点', '关系', '物品'].forEach(function (k) { kindSel.appendChild(UI.el('option', { value: k, text: k })); });
    var textIn = UI.el('input', { class: 'form-input', placeholder: '补充一条事实，如「凯恩欠莉莉三个人情」' });
    var addB = UI.el('button', { class: 'mini-btn primary', text: '添加', style: 'flex:none;height:auto' });
    addB.addEventListener('click', function () {
      var v = textIn.value.trim();
      if (!v) { UI.toast('请输入内容', 'err'); return; }
      Store.addKnowledge(store, [{ kind: kindSel.value, text: v }], '玩家');
      textIn.value = '';
      Store.persist(); renderList(); UI.toast('已写入世界记忆');
    });
    addRow.appendChild(kindSel); addRow.appendChild(textIn); addRow.appendChild(addB);
    body.appendChild(addRow);

    UI.openSheet({ title: '世界记忆 · ' + world.name, body: body });
  }

  /** 世界角色名册管理 */
  function openRoster(world) {
    var body = UI.el('div', {});
    body.appendChild(UI.el('div', { style: 'font-size:12.5px;color:var(--text-3);padding:0 2px 10px', text: '这些角色生活在这个世界里。冒险中遇到新人物时，AI 会自动为其创建角色卡，你可以随时修改。' }));

    function renderRows() {
      body.querySelectorAll('.roster-row').forEach(function (r) { r.remove(); });
      var emptyTip = body.querySelector('.empty-tip');
      if (emptyTip) emptyTip.remove();
      if (!world.characters.length) {
        body.appendChild(UI.el('div', { class: 'empty-tip', text: '这个世界还没有角色' }));
      }
      world.characters.forEach(function (ch) {
        var row = UI.el('div', { class: 'set-row roster-row' });
        row.appendChild(avatarNode(ch, 'conv-avatar', 'width:36px;height:36px;border-radius:11px;font-size:18px;flex:none'));
        row.innerHTML += '<span class="sr-text"><span class="sr-title">' + esc(ch.name) + '</span><span class="sr-desc">' + esc(ch.tagline || ch.system.slice(0, 30)) + '</span></span>';
        var talkB = UI.el('button', { class: 'mini-btn primary', text: '私谈', style: 'flex:none' });
        talkB.addEventListener('click', function () {
          Store.createWorldCharConv(world.id, ch.id);
          renderAll(); closeDrawer();
          scrollToBottom(true);
          UI.toast('与「' + ch.name + '」开始私谈');
        });
        var editB = UI.el('button', { class: 'mini-btn', text: '编辑', style: 'flex:none' });
        editB.addEventListener('click', function () { openCharForm(ch, null, world); });
        var delB = UI.el('button', { class: 'mini-btn danger', text: '移除', style: 'flex:none' });
        delB.addEventListener('click', function () {
          UI.confirmDialog({ title: '移除角色', message: '将「' + ch.name + '」从世界名册中移除？过去的剧情记录不受影响。', okText: '移除', danger: true })
            .then(function (yes) {
              if (!yes) return;
              world.characters = world.characters.filter(function (c) { return c.id !== ch.id; });
              Store.persist(); renderRows(); renderWorldGrid(''); UI.toast('已移除');
            });
        });
        row.appendChild(talkB); row.appendChild(editB); row.appendChild(delB);
        body.appendChild(row);
      });
    }
    renderRows();

    var addB = UI.el('button', { class: 'btn plain block', text: '＋ 手动添加角色', style: 'margin-top:12px' });
    addB.addEventListener('click', function () { openCharForm(null, function () { renderRows(); renderWorldGrid(''); }, world); });
    body.appendChild(addB);

    UI.openSheet({ title: '角色名册 · ' + world.name, body: body });
  }

  /* ---------------- 全局设置（后台） ---------------- */
  function openSettings() {
    var st = state.settings;
    var body = UI.el('div', {});

    body.appendChild(UI.el('div', { style: 'font-size:12px;font-weight:700;color:var(--text-3);letter-spacing:.06em;padding:2px 2px 8px', text: '接口模式' }));
    body.appendChild(UI.segControl(
      [{ v: 'demo', label: '演示模式' }, { v: 'custom', label: '自定义 API' }],
      st.apiMode,
      function (v) { st.apiMode = v; Store.persist(); updateComposerHint(); }
    ));

    var customWrap = UI.el('div', {});

    var urlIn = UI.el('input', { class: 'form-input', type: 'url', placeholder: 'https://api.deepseek.com/v1', value: st.baseUrl });
    urlIn.addEventListener('input', function () { st.baseUrl = urlIn.value.trim(); Store.persist(); });
    customWrap.appendChild(UI.formGroup('API 地址 (Base URL)', urlIn, 'OpenAI 兼容'));

    var keyShell = UI.el('div', { style: 'position:relative' });
    var keyIn = UI.el('input', { class: 'form-input', type: 'password', placeholder: 'sk-…', value: st.apiKey, autocomplete: 'off' });
    keyIn.addEventListener('input', function () { st.apiKey = keyIn.value.trim(); Store.persist(); });
    keyIn.addEventListener('change', function () { st.apiKey = keyIn.value.trim(); Store.persist(); });
    var eye = UI.el('button', { style: 'position:absolute;right:6px;top:50%;transform:translateY(-50%);width:34px;height:34px;display:grid;place-items:center;color:var(--text-3)', html: UI.icon('eye') });
    eye.addEventListener('click', function () {
      var show = keyIn.type === 'password';
      keyIn.type = show ? 'text' : 'password';
      eye.innerHTML = UI.icon(show ? 'eyeOff' : 'eye');
    });
    keyShell.appendChild(keyIn); keyShell.appendChild(eye);
    customWrap.appendChild(UI.formGroup('API Key', keyShell, '仅保存在本机浏览器'));

    var modelIn = UI.el('input', { class: 'form-input', type: 'text', list: 'modelList', placeholder: 'deepseek-chat / gpt-4o-mini …', value: st.model });
    modelIn.addEventListener('input', function () { st.model = modelIn.value.trim(); Store.persist(); updateComposerHint(); });
    modelIn.addEventListener('change', function () { st.model = modelIn.value.trim(); Store.persist(); updateComposerHint(); });
    var dl = UI.el('datalist', { id: 'modelList' });
    ['deepseek-chat', 'deepseek-reasoner', 'gpt-4o-mini', 'gpt-4.1-mini', 'qwen-plus', 'glm-4-flash', 'moonshot-v1-8k'].forEach(function (m) {
      dl.appendChild(UI.el('option', { value: m }));
    });
    var mg = UI.formGroup('模型名称', modelIn);
    mg.appendChild(dl);
    customWrap.appendChild(mg);
    var proxySwitch = UI.switchRow('通过本地代理转发', '接口跨域(CORS)报错时开启，需使用 node server.js 启动', st.useProxy, function (v) { st.useProxy = v; Store.persist(); });
    customWrap.appendChild(proxySwitch);

    body.appendChild(customWrap);

    // 演示模式提示
    var demoTip = UI.el('div', { style: 'font-size:12.5px;color:var(--text-2);background:var(--accent-soft);border-radius:12px;padding:10px 13px;margin:4px 0 14px;line-height:1.7' });
    demoTip.innerHTML = '演示模式无需任何配置即可体验完整流程（本地模拟流式回复）。<br>接入真实模型请切换到「自定义 API」。';
    body.appendChild(demoTip);

    body.appendChild(UI.el('div', { style: 'font-size:12px;font-weight:700;color:var(--text-3);letter-spacing:.06em;padding:10px 2px 8px', text: '生成参数' }));

    // 思考强度
    var thinkSeg = UI.segControl(
      [{ v: 'off', label: '关闭' }, { v: 'low', label: '低' }, { v: 'medium', label: '中' }, { v: 'high', label: '高' }],
      st.thinking,
      function (v) { st.thinking = v; Store.persist(); updateComposerHint(); }
    );
    body.appendChild(UI.formGroup('思考强度', thinkSeg, '映射 reasoning_effort 参数'));

    // 温度
    var tempVal = UI.el('span', { style: 'color:var(--accent);font-weight:600', text: String(st.temperature) });
    var temp = UI.el('input', { type: 'range', min: '0', max: '2', step: '0.1', value: String(st.temperature), style: 'width:100%;accent-color:var(--accent)' });
    temp.addEventListener('input', function () { st.temperature = Number(temp.value); tempVal.textContent = temp.value; Store.persist(); });
    var tg = UI.formGroup('随机性 Temperature', temp);
    tg.querySelector('.form-label').insertBefore(tempVal, tg.querySelector('.hint'));
    body.appendChild(tg);

    var row = UI.el('div', { class: 'form-row' });
    var maxIn = UI.el('input', { class: 'form-input', type: 'number', min: '64', max: '32000', value: String(st.maxTokens) });
    maxIn.addEventListener('change', function () { st.maxTokens = Number(maxIn.value) || 2048; Store.persist(); });
    row.appendChild(UI.formGroup('最大回复长度', maxIn));
    var histIn = UI.el('input', { class: 'form-input', type: 'number', min: '4', max: '200', value: String(st.historyLimit || 40) });
    histIn.addEventListener('change', function () { st.historyLimit = Number(histIn.value) || 40; Store.persist(); });
    row.appendChild(UI.formGroup('上下文条数', histIn, '带上最近几条消息'));
    body.appendChild(row);

    var extraTa = UI.el('textarea', { class: 'form-textarea', rows: 2, placeholder: '{"top_p": 0.9}', value: st.extraBody || '' });
    extraTa.addEventListener('change', function () { st.extraBody = extraTa.value; Store.persist(); });
    body.appendChild(UI.formGroup('附加请求参数 (JSON)', extraTa, '高级'));

    var rpSwitch = UI.switchRow('角色扮演沉浸模式', '注入「始终保持角色、不以 AI 身份发言」的演出要求', st.roleplayMode, function (v) { st.roleplayMode = v; Store.persist(); });
    body.appendChild(rpSwitch);

    // 测试按钮
    var testBtn = UI.el('button', { class: 'btn primary block', style: 'margin-top:6px' });
    testBtn.innerHTML = UI.icon('link') + '<span>测试连接</span>';
    testBtn.addEventListener('click', async function () {
      testBtn.disabled = true;
      testBtn.innerHTML = '<span class="r-spin"></span><span>连接中…</span>';
      try {
        var msg = await API.testConnection(state.settings);
        UI.toast('✓ ' + msg);
      } catch (e) {
        UI.toast((e && e.message) || '连接失败', 'err');
      }
      testBtn.disabled = false;
      testBtn.innerHTML = UI.icon('link') + '<span>测试连接</span>';
    });
    body.appendChild(testBtn);

    body.appendChild(UI.el('div', { style: 'font-size:12px;font-weight:700;color:var(--text-3);letter-spacing:.06em;padding:16px 2px 8px', text: '应用' }));

    var themeSeg = UI.segControl(
      [{ v: 'auto', label: '跟随系统' }, { v: 'light', label: '浅色' }, { v: 'dark', label: '深色' }],
      st.theme,
      function (v) { st.theme = v; Store.persist(); applyTheme(); }
    );
    body.appendChild(UI.formGroup('外观主题', themeSeg));

    // 数据管理
    var dataRow = UI.el('div', { class: 'form-row', style: 'margin-top:4px' });
    var expBtn = UI.el('button', { class: 'btn plain small', style: 'flex:1' });
    expBtn.innerHTML = UI.icon('download') + '<span>导出数据</span>';
    expBtn.addEventListener('click', exportData);
    var impBtn = UI.el('button', { class: 'btn plain small', style: 'flex:1' });
    impBtn.innerHTML = UI.icon('upload') + '<span>导入数据</span>';
    impBtn.addEventListener('click', function () { $('#importFile').click(); });
    dataRow.appendChild(expBtn); dataRow.appendChild(impBtn);
    body.appendChild(dataRow);

    var wipeBtn = UI.el('button', { class: 'btn danger block', style: 'margin-top:14px' });
    wipeBtn.innerHTML = UI.icon('trash') + '<span>清空全部数据</span>';
    wipeBtn.addEventListener('click', function () {
      UI.confirmDialog({ title: '清空全部数据', message: '将删除所有对话、角色、技能与设置，且不可恢复。建议先导出备份。', okText: '全部删除', danger: true })
        .then(function (yes) {
          if (!yes) return;
          localStorage.removeItem(Store.KEY);
          location.reload();
        });
    });
    body.appendChild(wipeBtn);

    body.appendChild(UI.el('div', { class: 'ver-tag', text: '幻语 · 角色扮演对话 ' + (Store.APP_VERSION || '') }));

    UI.openSheet({ title: '后台设置', body: body });

    // 自定义/演示 切换显示
    function refreshMode() {
      customWrap.style.display = st.apiMode === 'custom' ? '' : 'none';
      demoTip.style.display = st.apiMode === 'demo' ? '' : 'none';
    }
    var origPersist = Store.persist;
    // 观察 apiMode 变化刷新显隐: 简单轮询即可（设置面板生命周期短）
    var modeTimer = setInterval(function () {
      if (!document.body.contains(body)) { clearInterval(modeTimer); return; }
      refreshMode();
    }, 300);
    refreshMode();
  }

  $('#importFile').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.conversations)) throw new Error('格式不正确');
        UI.confirmDialog({ title: '导入数据', message: '导入将覆盖当前的全部数据（对话 ' + data.conversations.length + ' 组），确定继续吗？', okText: '覆盖导入' })
          .then(function (yes) {
            if (!yes) return;
            localStorage.setItem(Store.KEY, JSON.stringify(data));
            location.reload();
          });
      } catch (err) {
        UI.toast('导入失败：' + err.message, 'err');
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  });

  function exportData() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'huanyu-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    UI.toast('已导出备份文件');
  }

  /* ---------------- 启动 ---------------- */
  function initIcons() {
    $('#menuBtn').innerHTML = UI.icon('menu');
    $('#headerNewBtn').innerHTML = UI.icon('plus');
    document.querySelector('.search-ico').innerHTML = UI.icon('search');
    document.querySelectorAll('.ic-plus').forEach(function (s) { s.innerHTML = UI.icon('plus'); s.style.display = 'flex'; });
  }

  function init() {
    applyTheme();
    initIcons();
    renderAll();
    if (window.innerWidth > 860) { /* 桌面端抽屉常驻 */ }
  }
  init();

  // PWA Service Worker（可选，注册失败静默）
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () { });
  }
})();
