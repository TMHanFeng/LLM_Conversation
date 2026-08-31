/* 幻语 · 零依赖本地服务器：静态托管 + LLM 接口转发（解决浏览器 CORS 限制）
 * 用法:  node server.js   然后浏览器打开 http://localhost:3000
 * 手机访问同一局域网内显示的地址即可。
 */
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2'
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
}

function serveStatic(req, res, pathname) {
  let file = pathname === '/' ? '/index.html' : pathname;
  const full = path.join(ROOT, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404 Not Found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

/** 转发 /api/proxy?url=... 的请求到真实接口（流式透传） */
function proxy(req, res, target) {
  const u = new URL(target);
  const isHttps = u.protocol === 'https:';
  const mod = isHttps ? https : http;

  const headers = { ...req.headers };
  delete headers.host; delete headers.origin; delete headers.referer;
  delete headers['accept-encoding']; // 保持明文，便于流式逐行转发
  headers['accept-encoding'] = 'identity';

  const opts = {
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port || (isHttps ? 443 : 80),
    path: u.pathname + u.search,
    method: req.method,
    headers
  };

  const upstream = mod.request(opts, (ur) => {
    setCors(res);
    const h = { ...ur.headers };
    delete h['content-encoding']; // 内容已解压为 identity
    delete h['transfer-encoding'];
    h['x-proxied-by'] = 'huanyu';
    res.writeHead(ur.statusCode || 502, h);
    ur.pipe(res); // 流式透传，SSE 不缓冲
  });

  upstream.on('error', (e) => {
    if (!res.headersSent) {
      setCors(res);
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ error: { message: '代理请求失败: ' + e.message } }));
  });

  req.pipe(upstream);
}

/** 内置 Mock：OpenAI 兼容的 SSE 流式响应，用于无 Key 演示与联调
 *  地址形如 http://localhost:3000/api/mock/chat/completions
 */
function handleMock(req, res) {
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on('end', () => {
    let prompt = '';
    let isWorld = false;
    let isWorldChar = false;
    try {
      const j = JSON.parse(body || '{}');
      const msgs = j.messages || [];
      const sys = msgs.find((m) => m.role === 'system');
      const sysText = (sys && sys.content) || '';
      isWorld = sysText.includes('叙事协议');
      isWorldChar = sysText.includes('私谈记忆');
      const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
      prompt = (lastUser && lastUser.content || '').slice(0, 24);
    } catch (e) { /* ignore */ }

    setCors(res);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const wantReason = /deepseek-r|reasoner|r1/i.test(JSON.parse(body || '{}').model || '') === true;
    const worldState = {
      time: '深夜', location: '银鹿酒馆',
      events: ['得知古塔异动的线索', '获得一张泛黄的地图'],
      present: ['莉莉', '凯恩'], status: { '金币': '-5' }
    };
    if (/遇见|遇到|陌生人|来了一位|敲门/.test(prompt)) {
      worldState.newCharacters = [{
        name: '灰袍旅者', emoji: '🕵️', tagline: '来历不明的过客',
        system: '你是灰袍旅者，言语隐晦、行踪不定，似乎知晓古塔的秘密。',
        greeting: '「我们……又见面了。」'
      }];
      worldState.present.push('灰袍旅者');
      worldState.events.push('一位灰袍旅者推门而入');
    }
    // NPC 相互对话 + 世界长期记忆写入知识图谱
    worldState.memories = [
      { kind: '事件', text: '玩家从莉莉处得到一张通往古塔的泛黄地图' },
      { kind: '关系', text: '凯恩与莉莉当众拌嘴，两人是旧识且互相在意' }
    ];
    const reply = isWorld
      ? '（晚风穿过窗缝，**烛火轻轻摇曳**，你话音落下的一刻，屋内安静了下来。）\n\n' +
        '莉莉：「你说的「' + prompt + '」……这件事，知道的人可不多。」\n\n' +
        '（她擦杯子的手停了下来，环顾一圈，压低了声音。）\n\n' +
        '凯恩：「我说小家伙，这种事你该先来找我。」\n\n' +
        '（莉莉瞪了凯恩一眼，转头对你柔声说道）\n\n' +
        '莉莉：「别听他的，他就会逞英雄。北边古塔的灯，**三天前**又亮了。」\n\n' +
        (worldState.newCharacters ? '（话音未落，门帘被掀开，一位灰袍旅者走了进来，目光径直落在你身上。）\n\n灰袍旅者：「……终于找到你了。」\n\n' : '') +
        '（莉莉从柜台下摸出一张泛黄的地图，推到你面前。）\n\n' +
        '莉莉：「拿着。要去，就在今夜。」\n\n' +
        '⟦STATE⟧' + JSON.stringify(worldState) + '⟦/STATE⟧'
      : isWorldChar
        ? '（看到你，她放下手里的酒杯，眼中漾起笑意）\n\n「是你啊。' + prompt + '……这件事，我记下了。」\n\n' +
          '（她压低声音）「世界不太平，今晚别走远。有我在。」\n\n' +
          '⟦STATE⟧' + JSON.stringify({
            memories: [{ kind: '关系', text: '玩家与莉莉私下约定：无论古塔之行结果如何，都要互相照应' }]
          }) + '⟦/STATE⟧'
        : `（微微一笑，放下了手中的事情）\n\n你说的「${prompt}」，我听到了。\n\n这是 **Mock 接口**返回的流式回复，用来验证：\n\n1. SSE 分块解析\n2. 思考过程展示\n3. Markdown 渲染\n\n\`\`\`js\nconsole.log("hello 幻语");\n\`\`\`\n\n（歪头看你）接下来，想聊点什么？`;
    let i = 0;
    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    // 先推思考内容(如果模型名含 reasoner/r1)
    let ri = 0;
    const reasonText = '用户的消息要点已提取，组织一个角色化、带行动描写的回应。';
    function step() {
      if (wantReason && ri < reasonText.length) {
        send({ choices: [{ delta: { reasoning_content: reasonText[ri++] } }] });
        return setTimeout(step, 18);
      }
      if (i < reply.length) {
        const n = 2 + Math.floor(Math.random() * 3);
        send({ choices: [{ delta: { content: reply.slice(i, i + n) } }] });
        i += n;
        return setTimeout(step, 24);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    }
    step();
    // 客户端提前断开时停止吐字（注意: 请求流的 close 在请求体读完即触发，不能用）
    res.on('close', () => { if (!res.writableEnded) { i = reply.length; ri = reasonText.length; } });
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') { setCors(res); res.writeHead(204); return res.end(); }

  if (u.pathname === '/api/proxy') {
    const target = u.searchParams.get('url');
    if (!target || !/^https?:\/\//i.test(target)) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Bad proxy url');
    }
    return proxy(req, res, target);
  }

  if (u.pathname === '/api/mock/chat/completions') return handleMock(req, res);

  serveStatic(req, res, u.pathname);
});

server.listen(PORT, () => {
  const nets = os.networkInterfaces();
  const lan = [];
  Object.keys(nets).forEach((k) => {
    (nets[k] || []).forEach((n) => {
      if (n.family === 'IPv4' && !n.internal) lan.push(n.address);
    });
  });
  console.log('\n  ✦ 幻语 · 角色扮演对话 已启动\n');
  console.log(`  本机访问   http://localhost:${PORT}`);
  lan.forEach((ip) => console.log(`  手机访问   http://${ip}:${PORT}   （同一 WiFi）`));
  console.log('\n  提示: 手机上遇到接口跨域报错时，在「后台设置」里打开「通过本地代理转发」。\n');
});
