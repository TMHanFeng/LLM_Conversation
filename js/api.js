/* 幻语 · LLM API 客户端（OpenAI 兼容 / 流式 SSE / 演示模式） */
(function () {
  'use strict';

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /** 计算请求 URL（支持自定义代理防 CORS） */
  function buildUrl(settings) {
    var base = (settings.baseUrl || '').trim().replace(/\/+$/, '');
    var url;
    if (/\/chat\/completions$/.test(base)) {
      url = base;
    } else if (/\/v\d+(beta)?$/.test(base) || /\/api$/.test(base) || /\/openai$/.test(base)) {
      url = base + '/chat/completions';
    } else {
      url = base + '/v1/chat/completions';
    }
    if (settings.useProxy && location.protocol !== 'file:') {
      return location.origin + '/api/proxy?url=' + encodeURIComponent(url);
    }
    return url;
  }

  function buildBody(settings, messages, stream) {
    var body = {
      model: settings.model,
      messages: messages,
      stream: !!stream,
      temperature: Number(settings.temperature)
    };
    if (settings.maxTokens) body.max_tokens = Number(settings.maxTokens);
    if (settings.thinking && settings.thinking !== 'off') {
      body.reasoning_effort = settings.thinking; // OpenAI o 系列 / 兼容网关
    }
    if (settings.extraBody && settings.extraBody.trim()) {
      try {
        var extra = JSON.parse(settings.extraBody);
        Object.assign(body, extra);
      } catch (e) { console.warn('附加参数 JSON 解析失败', e); }
    }
    return body;
  }

  /** 逐行读取 SSE 流 */
  async function* sseLines(res) {
    var reader = res.body.getReader();
    var dec = new TextDecoder('utf-8');
    var buf = '';
    while (true) {
      var r = await reader.read();
      if (r.done) break;
      buf += dec.decode(r.value, { stream: true });
      var idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        var line = buf.slice(0, idx).replace(/\r$/, '');
        buf = buf.slice(idx + 1);
        if (line) yield line;
      }
    }
    if (buf) yield buf;
  }

  function extractDelta(obj, out) {
    var ch = obj.choices && obj.choices[0];
    if (!ch) return;
    var d = ch.delta || {};
    if (d.content) out.content = d.content;
    var reason = d.reasoning_content || d.reasoning;
    if (reason) out.reasoning = reason;
    if (ch.message) { // 非流式兜底
      if (ch.message.content) out.content = ch.message.content;
      var r2 = ch.message.reasoning_content || ch.message.reasoning;
      if (r2) out.reasoning = r2;
    }
  }

  /**
   * 发起对话请求（流式）
   * @param {Object} opts {messages, settings, charName, signal, onDelta, onReasoning}
   * @returns {Promise<{content:string, reasoning:string}>}
   */
  async function chatStream(opts) {
    var s = opts.settings;
    if (s.apiMode === 'demo') return demoStream(opts);

    var res = await fetch(buildUrl(s), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (s.apiKey || '')
      },
      body: JSON.stringify(buildBody(s, opts.messages, true)),
      signal: opts.signal
    });

    if (!res.ok) {
      var errText = '';
      try { errText = await res.text(); } catch (e) { /* ignore */ }
      var msg = 'HTTP ' + res.status;
      try { var j = JSON.parse(errText); msg += ': ' + (j.error && (j.error.message || j.error.code) || j.message || ''); }
      catch (e) { if (errText) msg += ': ' + errText.slice(0, 200); }
      throw new Error(msg);
    }

    var ct = (res.headers.get('content-type') || '');
    var result = { content: '', reasoning: '' };

    if (!ct.includes('event-stream')) {
      // 服务端未按流式返回，整体解析
      var data = await res.json();
      var out = {};
      extractDelta(data, out);
      result.content = out.content || '';
      result.reasoning = out.reasoning || '';
      if (opts.onDelta && result.content) opts.onDelta(result.content);
      if (opts.onReasoning && result.reasoning) opts.onReasoning(result.reasoning);
      return result;
    }

    var iter = sseLines(res);
    while (true) {
      var n = await iter.next();
      if (n.done) break;
      var line = n.value;
      if (!/^data:/.test(line)) continue;
      var payload = line.slice(5).trim();
      if (payload === '[DONE]') break;
      var obj;
      try { obj = JSON.parse(payload); } catch (e) { continue; }
      var piece = {};
      extractDelta(obj, piece);
      if (piece.reasoning) { result.reasoning += piece.reasoning; if (opts.onReasoning) opts.onReasoning(piece.reasoning); }
      if (piece.content) { result.content += piece.content; if (opts.onDelta) opts.onDelta(piece.content); }
    }
    if (!result.content && !result.reasoning) {
      throw new Error('接口未返回内容，请检查模型名称与接口地址');
    }
    return result;
  }

  /** 连接测试（非流式小请求） */
  async function testConnection(settings) {
    if (settings.apiMode === 'demo') {
      await sleep(400);
      return '演示模式运行正常 🎉 切换到「自定义 API」即可接入你自己的模型';
    }
    var res = await fetch(buildUrl(settings), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (settings.apiKey || '') },
      body: JSON.stringify({
        model: settings.model,
        messages: [{ role: 'user', content: '回复"连接成功"四个字' }],
        max_tokens: 20,
        stream: false
      })
    });
    if (!res.ok) {
      var t = '';
      try { t = await res.text(); } catch (e) { /* ignore */ }
      throw new Error('HTTP ' + res.status + (t ? ' · ' + t.slice(0, 160) : ''));
    }
    var data = await res.json();
    var c = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return (c || '连接成功').trim().slice(0, 60);
  }

  /* ---------------- 演示模式（本地模拟流式输出） ---------------- */

  var DEMO_REPLIES = [
    function (name, text) {
      return '（' + name + '微微一怔，随即眼中漾起笑意）\n\n你说的「' + text.slice(0, 18) + (text.length > 18 ? '…' : '') + '」，我听进去了。\n\n不过在此之前——' +
        '我更想知道，此刻站在我面前的你，是带着怎样的心情说出这句话的呢？\n\n（用指尖轻轻点了点桌面）别急着回答，先坐下来，我们慢慢聊。';
    },
    function (name, text) {
      return '有意思。\n\n（转过身，目光落在你身上）大多数人来到这里，说的第一句话都差不多，但「' + text.slice(0, 12) + (text.length > 12 ? '…' : '') + '」——这个开场，我给 **九十分**。\n\n扣掉的十分，是因为你还没有告诉我：**你为什么而来？**';
    },
    function (name, text) {
      return '（沉默了片刻，窗外恰好有一阵风掠过）\n\n好，那我认真回应你。\n\n> 你所说的这件事，表面是一回事，底下的暗流又是另一回事。\n\n1. 你真正想解决的，也许不是问题本身\n2. 而是问题背后，那个一直没被安放的情绪\n\n（重新看向你，语气柔和下来）那么——先从情绪说起，好吗？';
    }
  ];

  /** 世界冒险模式: GM叙事回复（对白独立成行 + 末尾状态块） */
  function demoWorldReply(opts, lastUser) {
    var wname = (opts.world && opts.world.name) || '异世界';
    var pname = (opts.world && opts.world.presentName) || '老板娘';
    var meet = /遇见|遇到|来了一位|陌生人|敲门|新的|问路/.test(lastUser);
    var out = [];
    out.push('（' + wname + '的晚风掠过，**烛火轻轻摇曳**，周围的空气仿佛凝滞了一瞬。）\n\n');
    out.push(pname + '：「哦？你提到「' + (lastUser.slice(0, 10) || '这件事') + '」……这可不是小事。」\n\n');
    out.push('（' + pname + '环顾四周，压低了声音。你能闻到空气中淡淡的危险气息。）\n\n');
    out.push(pname + '：「跟我来，别声张。有些事情，**今晚**就会有个了断——而我，或许能帮上忙。」\n\n');
    if (meet) {
      out.push('（就在这时，门帘掀开，一位身披灰袍的旅者走了进来，目光径直落在你身上。）\n\n');
      out.push('神秘旅者：「……终于找到你了。」\n\n');
    } else {
      out.push('（远处忽然传来一阵骚动，人群窃窃私语——似乎有什么东西，正在夜色中**悄悄靠近**。）\n\n');
    }
    var st = {
      time: '入夜',
      events: meet ? ['一位神秘旅者出现了'] : ['有人注意到了你的举动'],
      present: meet ? [pname, '神秘旅者'] : [pname],
      status: { '金币': '-5' }
    };
    if (meet) {
      st.newCharacters = [{
        name: '神秘旅者', emoji: '🕵️', tagline: '来历不明的灰袍过客',
        system: '你是神秘旅者，身披灰袍游走于各地，言语隐晦却似乎知晓许多秘密。只在必要时开口，每句话都意味深长。',
        greeting: '「我们……又见面了。」'
      }];
    }
    out.push('⟦STATE⟧' + JSON.stringify(st) + '⟦/STATE⟧');
    return out.join('');
  }

  async function demoStream(opts) {
    var msgs = opts.messages || [];
    var lastUser = '';
    for (var i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { lastUser = msgs[i].content; break; }
    }
    var charName = opts.charName || '对方';
    var settings = opts.settings || {};
    var signal = opts.signal;

    function aborted() { return signal && signal.aborted; }

    async function typeOut(text, onChunk, speed) {
      // 按块吐字(每步 2-3 字符)，接近真实 LLM 的分块流式，也更抗后台节流
      var STEP = 2;
      for (var i = 0; i < text.length; i += STEP) {
        if (aborted()) throw new DOMException('Aborted', 'AbortError');
        onChunk(text.slice(i, i + STEP));
        var ch = text[i];
        var d = speed;
        if (ch === '\n') d = speed * 6;
        else if (/[，。！？；：…」]/.test(ch)) d = speed * 4;
        await sleep(d + Math.random() * speed);
      }
    }

    await sleep(650);
    if (aborted()) throw new DOMException('Aborted', 'AbortError');

    var s = settings;
    if (s.thinking && s.thinking !== 'off') {
      var depth = { low: 1, medium: 2, high: 3 }[s.thinking] || 1;
      var thoughts = [];
      thoughts.push('正在分析对方的话语意图…\n');
      if (depth >= 2) thoughts.push(opts.worldMode
        ? '玩家正在推动剧情，应当给出场景反应、一位NPC的对白，并检查是否需要更新场景与状态。\n'
        : '对方提到「' + (lastUser.slice(0, 12) || '……') + '」，情绪基调偏温和，应当先共情再回应。\n');
      if (depth >= 3) thoughts.push(opts.worldMode
        ? '按叙事协议组织：环境描写 → NPC对白 → 剧情钩子，末尾按需输出状态块。'
        : '结合人设背景，选择「（动作）+ 短句 + 抛出新的话题钩子」的三段式回应结构，既能保持角色感，又能推动对话继续。');
      await typeOut(thoughts.join(''), function (t) { if (opts.onReasoning) opts.onReasoning(t); }, 14);
      await sleep(350);
    }

    var reply;
    if (opts.worldMode) {
      reply = demoWorldReply(opts, lastUser || '……');
    } else if (opts.worldCharMode) {
      var cname = opts.charName || '对方';
      var r2 = [];
      r2.push('（' + cname + '看到是你，眼中闪过一丝暖意）\n\n');
      r2.push(cname + '：「是你啊。' + (lastUser ? '你刚才说的「' + lastUser.slice(0, 12) + '」……' : '') + '这件事，我记下了。」\n\n');
      r2.push('（' + cname + '压低声音）「世界不太平，今晚别走远。有我在。」\n\n');
      r2.push('⟦STATE⟧' + JSON.stringify({
        memories: [{ kind: '关系', text: '玩家与' + cname + '约定今晚互相照应，关系更近了一步' }]
      }) + '⟦/STATE⟧');
      reply = r2.join('');
    } else {
      reply = DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)](charName, lastUser || '……');
    }
    await typeOut(reply, function (t) { if (opts.onDelta) opts.onDelta(t); }, 22);

    return { content: reply, reasoning: '' };
  }

  window.API = { chatStream: chatStream, testConnection: testConnection, buildUrl: buildUrl };
})();
