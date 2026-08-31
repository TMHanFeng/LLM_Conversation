/* 幻语 · UI 组件：图标 / 弹层 / 对话框 / Toast / 长按菜单 */
(function () {
  'use strict';

  /* ---------------- 图标 ---------------- */
  var I = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    send: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" stroke="none"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/>',
    edit: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    brain: '<path d="M12 5a3 3 0 1 0-5.9.8A3 3 0 0 0 4 11a3 3 0 0 0 1.2 5.5A3 3 0 1 0 12 19V5z"/><path d="M12 5a3 3 0 1 1 5.9.8A3 3 0 0 1 20 11a3 3 0 0 1-1.2 5.5A3 3 0 1 1 12 19V5z"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    swap: '<path d="M8 3 4 7l4 4M4 7h16m-4 10 4-4-4-4m4 4H4"/>',
    broom: '<path d="M19 3 12 10M9.5 6.5 15 12M11 22a7 7 0 0 1-7-7c4 .5 6.5 2 8.5 5 0 0 .8-1.6.5-4-.3-2.4-2-8-2-8"/>',
    alert: '<path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.5 0-10-7-10-7a17.6 17.6 0 0 1 4.1-4.9M9.9 5.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-2.2 3.2M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'
  };

  function icon(name, cls) {
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (I[name] || '') + '</svg>';
  }

  /* ---------------- 工具 ---------------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function fmtTime(ts) {
    var d = new Date(ts);
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    if (sameDay) return pad(d.getHours()) + ':' + pad(d.getMinutes());
    var yest = new Date(now.getTime() - 864e5);
    if (d.toDateString() === yest.toDateString()) return '昨天';
    if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  }

  /* ---------------- Toast ---------------- */
  function toast(msg, type) {
    var root = document.getElementById('toastRoot');
    var t = el('div', { class: 'toast' + (type === 'err' ? ' err' : ''), html: icon(type === 'err' ? 'alert' : 'check') + '<span></span>' });
    t.querySelector('span').textContent = msg;
    root.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { t.remove(); }, 320);
    }, 2400);
  }

  /* ---------------- 底部弹层 / 居中弹窗 ---------------- */
  var sheetStack = [];

  function openSheet(opts) {
    // opts: {title, body(Element|DocumentFragment), footer, onClose, wide}
    var root = document.getElementById('sheetRoot');
    var backdrop = el('div', { class: 'sheet-backdrop' });
    var sheet = el('div', { class: 'sheet' + (opts.cls ? ' ' + opts.cls : '') });
    sheet.appendChild(el('div', { class: 'sheet-grip' }));
    var head = el('div', { class: 'sheet-head' });
    head.appendChild(el('div', { class: 'sheet-title', text: opts.title || '' }));
    var closeBtn = el('button', { class: 'icon-btn', html: icon('close'), 'aria-label': '关闭' });
    head.appendChild(closeBtn);
    sheet.appendChild(head);
    var body = el('div', { class: 'sheet-body' });
    if (opts.body) body.appendChild(opts.body);
    sheet.appendChild(body);
    if (opts.footer) {
      var foot = el('div', { class: 'sheet-foot', style: 'padding:0 16px calc(16px + env(safe-area-inset-bottom))' });
      foot.appendChild(opts.footer);
      sheet.appendChild(foot);
    }
    root.appendChild(backdrop);
    root.appendChild(sheet);

    var entry = { backdrop: backdrop, sheet: sheet, onClose: opts.onClose, closed: false };

    function close(result) {
      if (entry.closed) return;
      entry.closed = true;
      backdrop.classList.add('closing');
      sheet.classList.add('closing');
      setTimeout(function () {
        backdrop.remove(); sheet.remove();
        var i = sheetStack.indexOf(entry);
        if (i >= 0) sheetStack.splice(i, 1);
        if (opts.onClose) opts.onClose(result);
      }, 260);
    }
    entry.close = close;

    backdrop.addEventListener('click', function () { close(); });
    closeBtn.addEventListener('click', function () { close(); });

    sheetStack.push(entry);
    return entry;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sheetStack.length) {
      sheetStack[sheetStack.length - 1].close();
    }
  });

  /* ---------------- 表单组件快捷方式 ---------------- */
  function formGroup(labelText, control, hint) {
    var g = el('div', { class: 'form-group' });
    var lab = el('div', { class: 'form-label' });
    lab.appendChild(el('span', { text: labelText }));
    if (hint) lab.appendChild(el('span', { class: 'hint', text: hint }));
    g.appendChild(lab);
    g.appendChild(control);
    return g;
  }

  function segControl(options, value, onChange) {
    // options: [{v,label}]
    var wrap = el('div', { class: 'seg-group' });
    options.forEach(function (o) {
      var b = el('button', { class: 'seg-item' + (o.v === value ? ' active' : ''), type: 'button', text: o.label });
      b.addEventListener('click', function () {
        wrap.querySelectorAll('.seg-item').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        onChange(o.v);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function switchRow(title, desc, checked, onChange) {
    var row = el('div', { class: 'switch-row' });
    row.appendChild(el('div', { class: 'sw-text', html: '<div class="sw-title"></div><div class="sw-desc"></div>' }));
    row.querySelector('.sw-title').textContent = title;
    row.querySelector('.sw-desc').textContent = desc || '';
    var sw = el('label', { class: 'switch' });
    var input = el('input', { type: 'checkbox' });
    input.checked = !!checked;
    input.addEventListener('change', function () { onChange(input.checked); });
    sw.appendChild(input);
    sw.appendChild(el('span', { class: 'track' }));
    row.appendChild(sw);
    row._input = input;
    return row;
  }

  /* ---------------- 确认对话框 ---------------- */
  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var body = el('div', {});
      body.appendChild(el('div', { style: 'font-size:14.5px;color:var(--text-2);line-height:1.7;padding:2px 2px 6px', text: opts.message || '确定要执行该操作吗？' }));
      var acts = el('div', { class: 'form-acts' });
      var cancel = el('button', { class: 'btn plain', text: opts.cancelText || '取消' });
      var ok = el('button', { class: 'btn ' + (opts.danger ? 'danger' : 'primary'), text: opts.okText || '确定' });
      acts.appendChild(cancel); acts.appendChild(ok);
      body.appendChild(acts);

      var sh = openSheet({
        title: opts.title || '确认',
        body: body,
        onClose: function () { resolve(false); }
      });
      cancel.addEventListener('click', function () { sh.close(); });
      ok.addEventListener('click', function () {
        sh.onClose = null;
        sh.close();
        resolve(true);
      });
    });
  }

  /* ---------------- 输入对话框 ---------------- */
  function promptDialog(opts) {
    return new Promise(function (resolve) {
      var body = el('div', {});
      var input = el(opts.multiline ? 'textarea' : 'input', { class: opts.multiline ? 'form-textarea' : 'form-input' });
      if (opts.multiline) { input.rows = opts.rows || 5; input.value = opts.value || ''; }
      else { input.type = 'text'; input.value = opts.value || ''; input.placeholder = opts.placeholder || ''; }
      body.appendChild(input);
      var acts = el('div', { class: 'form-acts' });
      var cancel = el('button', { class: 'btn plain', text: '取消' });
      var ok = el('button', { class: 'btn primary', text: opts.okText || '保存' });
      acts.appendChild(cancel); acts.appendChild(ok);
      body.appendChild(acts);

      var sh = openSheet({ title: opts.title || '输入', body: body, onClose: function () { resolve(null); } });
      setTimeout(function () { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 350);
      function submit() {
        var v = input.value.trim();
        if (opts.required && !v) { toast('内容不能为空', 'err'); return; }
        sh.onClose = null;
        sh.close();
        resolve(v);
      }
      ok.addEventListener('click', submit);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !opts.multiline) { e.preventDefault(); submit(); }
      });
    });
  }

  /* ---------------- 长按/右键菜单 ---------------- */
  function showMenu(x, y, items) {
    // items: [{label, icon, danger, onClick}]
    var root = document.getElementById('menuRoot');
    root.innerHTML = '';
    var menu = el('div', { class: 'ctx-menu' });
    items.forEach(function (it) {
      if (!it) return;
      var b = el('button', { class: 'ctx-item' + (it.danger ? ' danger' : '') });
      if (it.icon) b.appendChild(el('span', { html: icon(it.icon), style: 'display:flex' }));
      b.appendChild(el('span', { text: it.label }));
      b.addEventListener('click', function () {
        hideMenu();
        it.onClick();
      });
      menu.appendChild(b);
    });
    root.appendChild(menu);
    var rect = menu.getBoundingClientRect();
    var px = Math.min(x, window.innerWidth - rect.width - 8);
    var py = Math.min(y, window.innerHeight - rect.height - 8);
    menu.style.left = Math.max(8, px) + 'px';
    menu.style.top = Math.max(8, py) + 'px';

    setTimeout(function () {
      document.addEventListener('pointerdown', onDocDown, { capture: true });
      document.addEventListener('touchstart', onDocDown, { capture: true });
    }, 0);
    function onDocDown(e) {
      if (!menu.contains(e.target)) hideMenu();
    }
    function hideMenu() {
      document.removeEventListener('pointerdown', onDocDown, { capture: true });
      document.removeEventListener('touchstart', onDocDown, { capture: true });
      menu.remove();
    }
  }

  /** 为元素绑定长按菜单(触屏) + 右键菜单(桌面) */
  function bindContextMenu(elm, getItems) {
    var timer = null, startX = 0, startY = 0, fired = false;
    elm.addEventListener('touchstart', function (e) {
      fired = false;
      var t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
      timer = setTimeout(function () {
        fired = true;
        if (navigator.vibrate) navigator.vibrate(12);
        showMenu(startX, startY, getItems());
      }, 480);
    }, { passive: true });
    function clear() { clearTimeout(timer); timer = null; }
    elm.addEventListener('touchmove', function (e) {
      if (timer) {
        var t = e.touches[0];
        if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) clear();
      }
    }, { passive: true });
    elm.addEventListener('touchend', clear);
    elm.addEventListener('touchcancel', clear);
    elm.addEventListener('click', function (e) {
      if (fired) { e.stopImmediatePropagation(); e.preventDefault(); fired = false; }
    }, true);
    elm.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      showMenu(e.clientX, e.clientY, getItems());
    });
  }

  /* ---------------- 复制到剪贴板 ---------------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext !== false) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    ta.remove();
  }

  window.UI = {
    icon: icon, ICONS: I,
    el: el, fmtTime: fmtTime, toast: toast,
    openSheet: openSheet, confirmDialog: confirmDialog, promptDialog: promptDialog,
    formGroup: formGroup, segControl: segControl, switchRow: switchRow,
    showMenu: showMenu, bindContextMenu: bindContextMenu,
    copyText: copyText
  };
})();
