/* 幻语 · 轻量 Markdown 渲染器（无依赖，安全转义） */
(function () {
  'use strict';

  function esc(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function inline(s) {
    s = esc(s);
    // 行内代码（先处理，避免内部被其它规则改写）
    var codes = [];
    s = s.replace(/`([^`\n]+)`/g, function (_, c) {
      codes.push('<code>' + c + '</code>');
      return '\u0001' + (codes.length - 1) + '\u0001';
    });
    s = s.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, function (_, t, u) {
      return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a>';
    });
    s = s.replace(/\u0001(\d+)\u0001/g, function (_, i) { return codes[+i]; });
    return s;
  }

  function codeBlockHtml(code, lang) {
    return '<div class="codeblock"><div class="codeblock-head"><span>' + esc(lang || '代码') + '</span>' +
      '<button type="button" data-copy-code>复制</button></div>' +
      '<pre>' + esc(code) + '</pre></div>';
  }

  /** 将 markdown 文本渲染为 HTML（输入未转义，内部负责转义） */
  function render(src) {
    if (!src) return '';
    var out = [];
    var lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    var i = 0;
    var para = [];
    var listStack = null; // 'ul' | 'ol'
    var quoteBuf = null;

    function flushPara() {
      if (para.length) {
        out.push('<p>' + para.map(inline).join('<br>') + '</p>');
        para = [];
      }
    }
    function closeList() { if (listStack) { out.push('</' + listStack + '>'); listStack = null; } }
    function closeQuote() {
      if (quoteBuf !== null) {
        out.push('<blockquote>' + quoteBuf.map(inline).join('<br>') + '</blockquote>');
        quoteBuf = null;
      }
    }
    function flushAll() { flushPara(); closeList(); closeQuote(); }

    while (i < lines.length) {
      var line = lines[i];

      // 代码围栏
      var fence = line.match(/^\s*```+\s*(\S*)\s*$/);
      if (fence) {
        flushAll();
        var buf = [];
        i++;
        while (i < lines.length && !/^\s*```+\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++; // 跳过结尾 ```
        out.push(codeBlockHtml(buf.join('\n'), fence[1]));
        continue;
      }

      // 空行
      if (/^\s*$/.test(line)) { flushAll(); i++; continue; }

      // 标题
      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flushAll(); var lv = h[1].length; out.push('<h' + lv + '>' + inline(h[2]) + '</h' + lv + '>'); i++; continue; }

      // 分割线
      if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) { flushAll(); out.push('<hr>'); i++; continue; }

      // 引用
      if (/^\s*>\s?/.test(line)) {
        flushPara(); closeList();
        if (quoteBuf === null) quoteBuf = [];
        quoteBuf.push(line.replace(/^\s*>\s?/, ''));
        i++; continue;
      }
      closeQuote();

      // 无序列表（支持 - * + •）
      var ul = line.match(/^\s*[-*+•]\s+(.*)$/);
      if (ul && !/^\s*[-*+]\s*$/.test(line)) {
        flushPara();
        if (listStack !== 'ul') { closeList(); out.push('<ul>'); listStack = 'ul'; }
        out.push('<li>' + inline(ul[1]) + '</li>');
        i++; continue;
      }
      // 有序列表
      var ol = line.match(/^\s*\d+[.、)]\s+(.*)$/);
      if (ol) {
        flushPara();
        if (listStack !== 'ol') { closeList(); out.push('<ol>'); listStack = 'ol'; }
        out.push('<li>' + inline(ol[1]) + '</li>');
        i++; continue;
      }
      closeList();

      // 表格: | a | b |
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        flushAll();
        var head = line.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
        i += 2;
        var rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|'));
          i++;
        }
        var t = '<table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
        rows.forEach(function (r) {
          t += '<tr>' + r.map(function (c) { return '<td>' + inline(c.trim()) + '</td>'; }).join('') + '</tr>';
        });
        out.push(t + '</tbody></table>');
        continue;
      }

      // 表格: | a | b |（无分隔行，退化为普通行）
      if (/^\s*\|.*\|\s*$/.test(line)) {
        para.push(line.replace(/^\s*\|\s*/, '').replace(/\s*\|\s*$/, ' ⬈ ').replace(/\s*\|\s*/g, ' ⬈ '));
        i++; continue;
      }

      para.push(line);
      i++;
    }
    flushAll();
    return out.join('');
  }

  window.MD = { render: render, esc: esc };
})();
