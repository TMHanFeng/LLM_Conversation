/* 幻语 · 零依赖本地服务器：静态托管 + LLM 接口转发（解决浏览器 CORS 限制）+ 账号与云端存档
 * 用法:  node server.js   然后浏览器打开 http://localhost:3000
 * 手机访问同一局域网内显示的地址即可。
 */
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { URL } = require('url');
const { StringDecoder } = require('string_decoder');

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
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
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

/* ================= 账号与云端存档 =================
 * 零依赖实现：账号为 data/accounts/<用户名>.json（scrypt 加盐哈希存密码），
 * 会话令牌持久化在 data/sessions.json —— 服务重启后浏览器 Cookie 依然保持登录，
 * 直到用户主动退出。每个账号云端保存一份与浏览器 localStorage 同构的完整状态。
 */
const DATA_DIR = path.join(ROOT, 'data');
const ACCOUNTS_DIR = path.join(DATA_DIR, 'accounts');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const STATE_MAX = 64 * 1024 * 1024; // 单份存档上限 64MB

function ensureDataDirs() {
  fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
}
function accountFile(username) {
  return path.join(ACCOUNTS_DIR, username.replace(/[^A-Za-z0-9_\-\u4e00-\u9fa5]/g, '_') + '.json');
}
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function writeJson(file, obj) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, file);
}
function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

// 会话: token -> { username, createdAt }，进程内缓存 + 落盘
let sessions = readJson(SESSIONS_FILE, {});
function saveSessions() { writeJson(SESSIONS_FILE, sessions); }
function createSession(res, username) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions[token] = { username: username, createdAt: Date.now() };
  saveSessions();
  res.setHeader('Set-Cookie',
    'huanyu_session=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + (365 * 24 * 3600));
}
function clearSession(req, res) {
  const token = parseCookies(req).huanyu_session;
  if (token && sessions[token]) { delete sessions[token]; saveSessions(); }
  res.setHeader('Set-Cookie', 'huanyu_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function currentUser(req) {
  const token = parseCookies(req).huanyu_session;
  const s = token && sessions[token];
  return s ? s.username : null;
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > limit) { req.destroy(); reject(new Error('payload too large')); }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

async function handleCloudApi(req, res, pathname) {
  ensureDataDirs();
  try {
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const j = JSON.parse((await readBody(req, 4096)) || '{}');
      const username = String(j.username || '').trim();
      const password = String(j.password || '');
      if (!/^[A-Za-z0-9_\-\u4e00-\u9fa5]{2,24}$/.test(username)) return json(res, 400, { error: '用户名需 2-24 位（中文、字母、数字、_ -）' });
      if (password.length < 6 || password.length > 128) return json(res, 400, { error: '密码需 6-128 位' });
      if (fs.existsSync(accountFile(username))) return json(res, 409, { error: '用户名已存在' });
      const salt = crypto.randomBytes(16).toString('hex');
      writeJson(accountFile(username), {
        username: username, salt: salt, hash: hashPassword(password, salt),
        createdAt: Date.now(), updatedAt: 0, state: null
      });
      createSession(res, username);
      return json(res, 200, { ok: true, username: username });
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const j = JSON.parse((await readBody(req, 4096)) || '{}');
      const username = String(j.username || '').trim();
      const password = String(j.password || '');
      const acc = readJson(accountFile(username), null);
      if (!acc) return json(res, 401, { error: '用户名或密码错误' });
      // 注意: hashPassword 返回 64 字节的 hex 字符串，双方都转成 Buffer 再比长度（此前
      // 误用 Buffer.length(64) 与字符串 .length(128) 相比，导致任何密码都 401）
      const calc = Buffer.from(hashPassword(password, acc.salt), 'hex');
      const stored = Buffer.from(String(acc.hash || ''), 'hex');
      const ok = calc.length === stored.length && stored.length > 0 && crypto.timingSafeEqual(calc, stored);
      if (!ok) return json(res, 401, { error: '用户名或密码错误' });
      createSession(res, username);
      return json(res, 200, { ok: true, username: username });
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      clearSession(req, res);
      return json(res, 200, { ok: true });
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = currentUser(req);
      if (!user) return json(res, 401, { error: '未登录' });
      return json(res, 200, { ok: true, username: user });
    }

    // 以下需要登录
    const user = currentUser(req);
    if (!user) return json(res, 401, { error: '未登录' });
    const accFile = accountFile(user);
    const acc = readJson(accFile, null);
    if (!acc) return json(res, 401, { error: '账号不存在，请重新登录' });

    if (pathname === '/api/state' && req.method === 'GET') {
      return json(res, 200, { ok: true, state: acc.state, updatedAt: acc.updatedAt || 0 });
    }

    if (pathname === '/api/state' && req.method === 'PUT') {
      const j = JSON.parse((await readBody(req, STATE_MAX)) || '{}');
      const st = j.state;
      if (!st || typeof st !== 'object' || !Array.isArray(st.conversations)) {
        return json(res, 400, { error: '存档格式不正确' });
      }
      acc.state = st;
      acc.updatedAt = Date.now();
      writeJson(accFile, acc);
      return json(res, 200, { ok: true, updatedAt: acc.updatedAt });
    }

    return json(res, 404, { error: 'not found' });
  } catch (e) {
    return json(res, 500, { error: '服务器内部错误: ' + e.message });
  }
}

/* ================= 服务器端对话任务（后台生成） =================
 * 消息发出后，LLM 请求完全由服务器执行：向上游发流式请求、逐字接收、节流落盘到
 * data/tasks/<id>.json（API Key 只留内存，绝不落盘）。浏览器只是轮询读进度，
 * 随时可切走 / 挂起 / 关闭 / 换设备——回来按消息上的 taskId 续读即可，
 * 任务早已在服务器跑完并持久保存。
 *   POST /api/task              { url, apiKey, body } → { taskId } 立即返回
 *   GET  /api/task/<id>         → { id, status: running|done|error, content, reasoning, error, stopped }
 *   POST /api/task/<id>/stop    → 停止生成，保留已生成的部分内容
 */
const TASKS_DIR = path.join(DATA_DIR, 'tasks');
const TASK_TTL_MS = 3 * 24 * 3600 * 1000; // 任务文件保留 3 天，超期自动清理
const TASK_IDLE_TIMEOUT = 300000;         // 上游 5 分钟无数据 → 判定失败
const TASK_BODY_MAX = 8 * 1024 * 1024;    // 任务请求体上限 8MB
const liveTasks = new Map(); // id -> task（含 apiKey 与上游请求句柄，仅内存）

function taskPath(id) {
  return /^[a-f0-9]{32}$/.test(id) ? path.join(TASKS_DIR, id + '.json') : null;
}
function taskView(t) {
  return {
    id: t.id, status: t.status, content: t.content, reasoning: t.reasoning,
    error: t.error || null, stopped: !!t.stopped, updatedAt: t.updatedAt
  };
}
function writeTaskFile(t) {
  const f = taskPath(t.id);
  if (f) { try { writeJson(f, taskView(t)); } catch (e) { /* 磁盘满等场景不致命 */ } }
}
function queueSaveTask(t) {
  if (t.finished || t.saveTimer) return;
  t.saveTimer = setTimeout(function () { t.saveTimer = null; writeTaskFile(t); }, 250);
}
function finishTask(t, status, errMsg) {
  if (t.finished) return;
  if (t.saveTimer) { clearTimeout(t.saveTimer); t.saveTimer = null; }
  liveTasks.delete(t.id);
  t.finished = true;
  t.updatedAt = Date.now();
  if (errMsg) t.error = String(errMsg).slice(0, 500);
  if (status !== 'done' && !t.error) t.error = '生成失败';
  if (status === 'done' && !t.error && !t.stopped && !t.content && !t.reasoning) {
    t.error = '接口未返回内容，请检查模型名称与接口地址';
  }
  t.status = t.error ? 'error' : status;
  writeTaskFile(t);
}

/** 解析上游 SSE 单行，逐字累积到任务（含部分网关的非流式 message 兜底） */
function feedTaskLine(t, line) {
  if (t.finished || !/^data:/.test(line)) return;
  const payload = line.slice(5).trim();
  if (payload === '[DONE]') return finishTask(t, 'done');
  let obj;
  try { obj = JSON.parse(payload); } catch (e) { return; }
  const ch = obj.choices && obj.choices[0];
  if (!ch) return;
  const d = ch.delta || {};
  let contentPiece = d.content || '';
  let reasonPiece = d.reasoning_content || d.reasoning || '';
  if (ch.message) {
    if (ch.message.content) contentPiece = ch.message.content;
    const r2 = ch.message.reasoning_content || ch.message.reasoning;
    if (r2) reasonPiece = r2;
  }
  if (contentPiece) { t.content += contentPiece; queueSaveTask(t); }
  if (reasonPiece) { t.reasoning += reasonPiece; queueSaveTask(t); }
}

/** 由服务器向上游 LLM 发起流式请求（与浏览器无关，独立跑完） */
function runTaskUpstream(t, url, apiKey, bodyStr) {
  let u;
  try { u = new URL(url); } catch (e) { return finishTask(t, 'error', '无效的接口地址'); }
  if (!/^https?:$/.test(u.protocol)) return finishTask(t, 'error', '仅支持 http/https 接口');
  const isHttps = u.protocol === 'https:';
  const mod = isHttps ? https : http;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'Content-Length': Buffer.byteLength(bodyStr)
  };
  if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;
  const req = mod.request({
    protocol: u.protocol, hostname: u.hostname,
    port: u.port || (isHttps ? 443 : 80),
    path: u.pathname + u.search, method: 'POST', headers, timeout: TASK_IDLE_TIMEOUT
  }, (ur) => {
    const ct = String(ur.headers['content-type'] || '');
    if ((ur.statusCode || 502) !== 200) {
      let errBody = '';
      ur.on('data', (c) => { errBody += c; if (errBody.length > 65536) ur.destroy(); });
      ur.on('end', () => finishTask(t, 'error', 'HTTP ' + ur.statusCode + (errBody ? ': ' + errBody.slice(0, 300) : '')));
      ur.on('error', () => finishTask(t, 'error', 'HTTP ' + ur.statusCode));
      return;
    }
    const dec = new StringDecoder('utf8'); // 逐字接收，正确处理跨块的中文多字节字符
    if (!ct.includes('event-stream')) {
      // 上游未按流式返回：整体缓冲后按 JSON 解析
      let raw = '';
      ur.on('data', (c) => { raw += c; if (raw.length > 32 * 1024 * 1024) ur.destroy(); });
      ur.on('end', () => {
        try {
          const data = JSON.parse(raw);
          const msg = (data.choices && data.choices[0] && data.choices[0].message) || {};
          if (msg.content) t.content += msg.content;
          const r = msg.reasoning_content || msg.reasoning;
          if (r) t.reasoning += r;
        } catch (e) { /* 非 JSON 响应按空内容收尾 */ }
        finishTask(t, 'done');
      });
      ur.on('error', (e) => finishTask(t, 'error', e.message));
      return;
    }
    let buf = '';
    ur.on('data', (chunk) => {
      t.updatedAt = Date.now();
      buf += dec.write(chunk);
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).replace(/\r$/, '');
        buf = buf.slice(idx + 1);
        feedTaskLine(t, line);
      }
      if (t.finished) { try { ur.destroy(); } catch (e) { /* ignore */ } }
    });
    ur.on('end', () => finishTask(t, 'done'));
    ur.on('error', (e) => finishTask(t, 'error', '上游连接中断: ' + e.message));
  });
  req.on('timeout', () => req.destroy(new Error('上游长时间无响应')));
  req.on('error', (e) => finishTask(t, 'error', '请求失败: ' + e.message));
  t.req = req;
  req.end(bodyStr);
}

function abortTask(t) {
  if (t.finished) return;
  t.stopped = true;
  try { if (t.req) t.req.destroy(); } catch (e) { /* ignore */ }
  finishTask(t, 'done'); // 保留已生成的部分
}

/** 启动时清理：过期任务删除；上次服务器重启时仍在跑的任务 → 标记中断并保留部分内容 */
function sweepTasks(markInterrupted) {
  let names = [];
  try { names = fs.readdirSync(TASKS_DIR); } catch (e) { return; }
  const now = Date.now();
  names.forEach((n) => {
    const f = path.join(TASKS_DIR, n);
    const t = readJson(f, null);
    const valid = t && /^[a-f0-9]{32}$/.test(String(t.id)) && n === t.id + '.json';
    const stale = !valid || (now - Math.max(t.updatedAt || 0, t.createdAt || 0) > TASK_TTL_MS);
    if (stale) { try { fs.unlinkSync(f); } catch (e) { /* ignore */ } return; }
    if (markInterrupted && t.status === 'running') {
      t.status = 'error';
      t.error = '服务器重启，生成中断';
      t.updatedAt = now;
      writeJson(f, t);
    }
  });
}

async function handleTaskCreate(req, res) {
  ensureDataDirs();
  fs.mkdirSync(TASKS_DIR, { recursive: true });
  const j = JSON.parse((await readBody(req, TASK_BODY_MAX)) || '{}');
  const url = String(j.url || '');
  const apiKey = String(j.apiKey || '');
  const body = j.body;
  if (!/^https?:\/\//i.test(url)) return json(res, 400, { error: '无效的接口地址' });
  if (!body || typeof body !== 'object' || !Array.isArray(body.messages)) {
    return json(res, 400, { error: 'body.messages 不合法' });
  }
  const id = crypto.randomBytes(16).toString('hex');
  const t = {
    id: id, status: 'running', content: '', reasoning: '',
    error: null, stopped: false, updatedAt: Date.now(),
    apiKey: apiKey, req: null, saveTimer: null, finished: false
  };
  liveTasks.set(id, t);
  writeTaskFile(t);
  runTaskUpstream(t, url, apiKey, JSON.stringify(body));
  return json(res, 200, { taskId: id });
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

  if (u.pathname === '/api/task' && req.method === 'POST') {
    return handleTaskCreate(req, res).catch((e) => {
      if (!res.headersSent) return json(res, 500, { error: '创建任务失败: ' + e.message });
      try { res.end(); } catch (e2) { /* ignore */ }
    });
  }
  let tm;
  if (req.method === 'GET' && (tm = u.pathname.match(/^\/api\/task\/([a-f0-9]{32})$/))) {
    const f = taskPath(tm[1]);
    const t = f && fs.existsSync(f) ? readJson(f, null) : null;
    if (!t) return json(res, 404, { error: '任务不存在或已清理' });
    return json(res, 200, t);
  }
  if (req.method === 'POST' && (tm = u.pathname.match(/^\/api\/task\/([a-f0-9]{32})\/stop$/))) {
    const t = liveTasks.get(tm[1]);
    if (t) abortTask(t);
    return json(res, 200, { ok: true });
  }

  if (u.pathname.startsWith('/api/auth/') || u.pathname === '/api/state') {
    return handleCloudApi(req, res, u.pathname);
  }

  serveStatic(req, res, u.pathname);
});

// 启动即恢复任务区：清理过期文件；上次进程退出时仍在跑的任务 → 标记中断并保留部分内容
ensureDataDirs();
fs.mkdirSync(TASKS_DIR, { recursive: true });
sweepTasks(true);
setInterval(() => sweepTasks(false), 3600 * 1000).unref();

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
