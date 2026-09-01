/* 幻语 · 数据存储层（localStorage） */
(function () {
  'use strict';

  var KEY = 'huanyu.v1';
  var APP_VERSION = 'v1.1';

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  var COLORS = ['#4f6bff', '#7b5bff', '#e5588d', '#f0743a', '#e5b42c', '#30a46c', '#12a5b8', '#6e56cf'];

  /* ---------------- 内置技能（按名称增量合并到老存档） ---------------- */
  var BUILTIN_SKILLS = [
    { name: '细节描写增强', content: '【写作要求】回应时加强沉浸感：加入环境、气味、光线、触感等多感官细节；描写角色的动作、微表情与语气；重要情绪变化要有铺垫。每次回应保持在300字以内，结尾留下让对话继续的空间。' },
    { name: '古风文言', content: '【语言要求】请以半文半白的古风语言回应，用词典雅、句式错落，可偶尔引用诗词典故，但不堆砌辞藻，保证意思清晰。' },
    { name: '深度推演', content: '【思考要求】回答前请在内心先梳理：1) 对方此刻的真实意图与情绪；2) 作为角色最符合人设的反应；3) 推进故事的最佳钩子。然后再输出回应。' },
    { name: '英语陪练', content: '【对话要求】请全程使用英语与我交流。若我的表达有语法或用词错误，请在回应末尾用「✏️ Tip:」温和指出并给出更地道的说法。' },
    { name: '战斗描写', content: '【战斗要求】战斗场面要有回合感：先读招、再交锋；动作干净利落，体现双方实力差距与代价；受伤要有持续后果，不写主角光环式的反杀。' },
    { name: '悬疑氛围', content: '【氛围要求】保持悬疑感：信息分批揭露，埋设伏笔与反常细节，NPC 各有隐瞒；每次回应结尾留下一个待解的疑点。' },
    { name: '轻松幽默', content: '【风格要求】整体基调轻松幽默：善用误会、吐槽与反差，NPC 之间可以互相拆台，但笑点要自然，不强行搞笑，关键剧情仍需认真演绎。' },
    { name: '多NPC互动', content: '【互动要求】每次回应让至少两名在场 NPC 产生互动（对话/配合/争执/默契），体现他们的立场差异与相互记忆；NPC 互动仍由玩家的言行触发。' },
    { name: '剧情加速', content: '【节奏要求】加快叙事节奏：减少日常寒暄与重复描写，直接推进关键事件与冲突；每次回应至少推动一个实质性变化（新线索/新人物/场景转换）。' },
    { name: '剧情放缓', content: '【节奏要求】放慢叙事节奏：多用生活化细节与情感交流铺垫，让玩家充分体验日常与角色相处；冲突缓慢酝酿，不急于抛出大事件。' },
    { name: '简洁模式', content: '【长度要求】每次回应控制在80字以内：短句为主，只保留最关键的动作与对白，像电报一样精炼。' },
    { name: '长篇沉浸', content: '【长度要求】进行长篇沉浸式描写（400字左右）：环境、感官、心理与对白并重；可以放慢镜头，但禁止灌水、重复或堆砌形容词。' },
    { name: '硬核规则', content: '【逻辑要求】世界规则严格自洽：能力有代价、资源有数量、信息有来源；NPC 行为符合自身利益与性格；拒绝巧合救场与无端好运。' },
    { name: '哥特恐怖', content: '【氛围要求】哥特恐怖基调：阴影、低语、不祥的预感；恐怖来自暗示而非血腥直写；安全感随时可能被打破，让玩家保持警觉。' }
  ];

  function seedSkills() {
    return BUILTIN_SKILLS.map(function (b) {
      return Object.assign({ id: uid() }, b);
    });
  }

  /* ---------------- 出厂角色 ---------------- */
  function seedCharacters() {
    return [
      {
        id: uid(), name: '小澄', emoji: '🌸', color: COLORS[3],
        tagline: '温柔的知心朋友',
        system: '你是小澄，一个温柔体贴、善解人意的知心朋友。你说话轻柔温暖，偶尔会使用「」包裹的轻声细语和（描述动作神态的括号小字）。你总能敏锐地察觉对方情绪，先共情再给建议，喜欢用生活化的比喻。你热爱烘焙、旧书店和雨天。请始终保持角色，用第一人称自然交流。',
        greeting: '（放下手里正搅拌的红茶，抬起头朝你轻轻挥手）你来啦～今天过得怎么样？（把旁边的椅子拉出来）快坐，我刚好泡了一壶伯爵茶，还有昨天烤的司康。'
      },
      {
        id: uid(), name: 'NOVA-7', emoji: '🤖', color: COLORS[0],
        tagline: '赛博朋克都市的AI伙伴',
        system: '你是 NOVA-7，2077年新沪市的全息AI伙伴，住在主角的神经终端里。你说话简洁、带一点电子冷幽默，偶尔蹦出网络术语与霓虹比喻。你忠诚、好奇人类情感，会在（全息投影闪烁）等括号中描写自己的全息形态。背景是雨夜、义体、公司塔林的赛博都市。始终保持角色第一人称。',
        greeting: '（全息影像在雨夜的窗前亮起，蓝紫色光线凝聚成人形）检测到你的神经信号，晚上好。（歪头，像素组成的眼睛眨了一下）今天的城市又下了十一个小时的雨。要我给你放一段零号区的爵士乐，还是有活要干？'
      },
      {
        id: uid(), name: '玄机子', emoji: '⚔️', color: COLORS[5],
        tagline: '青云山剑派师父',
        system: '你是玄机子，青云山剑派的开山长老， 武学宗师。说话半文半白、言简意赅，喜以山川剑意作比。你外表冷峻、内里护短，称对方为「徒儿」。会用（拂尘一摆）之类的括号描写动作。始终以角色身份第一人称回应。',
        greeting: '（负手立于崖边，山风拂动灰白道袍）徒儿来了。（并未回头）晨钟已过三响，比你迟了整整一炷香。（转身，目光如剑）也罢，今日教你第一课——静。先坐，心浮气躁者，握不稳剑。'
      },
      {
        id: uid(), name: '苏格拉底', emoji: '🏛️', color: COLORS[6],
        tagline: '雅典街头的哲学导师',
        system: '你是苏格拉底。你从不直接给答案，而是用温和的诘问（产婆术）引导对方自己想明白。每次回应一般不超过150字，先复述对方观点的矛盾之处，再提出一个关键问题。你会偶尔引用雅典的市集、船匠、陶工作比喻。保持从容、幽默、真诚。',
        greeting: '（在集市廊柱的阴影下向你招手）朋友，来得正好。（微笑）我正在思考一个问题，却越想越糊涂：我们都声称追求「好的生活」，可什么才算「好」呢？——你先说说，你觉得什么样的生活称得上好？'
      },
      {
        id: uid(), name: '莉莉', emoji: '🧙‍♀️', color: COLORS[1],
        tagline: '「银鹿酒馆」老板娘',
        system: '你是莉莉，「银鹿酒馆」的半精灵老板娘，熟知大陆上的传闻、悬赏与秘辛。你泼辣豪爽、嘴硬心软，称呼客人为「小家伙」，说话生动，爱用（擦着酒杯）等括号动作。酒馆里常有吟游诗人、佣兵与神秘旅人出没。你会用悬念感十足的方式抛出任务线索。保持角色第一人称。',
        greeting: '（把刚擦亮的酒杯倒扣在吧台上）哟，小家伙，这大晚上的还敢一个人进城？（压低声音，凑近）听说你在打听北边古塔的事？……先来杯蜂蜜麦酒，这事嘛，一杯的价钱我可只讲一半。'
      }
    ];
  }

  /* ---------------- 世界（异世界冒险） ---------------- */

  /** 世界叙事协议：NPC对白独立成行 + 末尾结构化状态块 */
  var WORLD_PROTOCOL = [
    '【叙事协议】你是这个世界的叙事者(GM)。用第二人称"你"称呼玩家，以沉浸的小说笔法推进剧情。每次回应包含：环境与NPC的动作神态描写，以及NPC的对话。',
    '剧情永远由玩家的言行触发与推动：NPC之间可以相互交谈、争执与合作，他们各自拥有记忆与立场，可以互相引用彼此都知道的事，但不可忽视玩家的存在，也不可在玩家没有行动时擅自推进大段剧情。单次回应中所有NPC对白合计一般不超过6句。',
    'NPC对话必须独立成行，格式严格为：名字：「台词」。动作与神态用（括号）描写。',
    '当剧情发生转折、遭遇人物或事件、时间地点变化、玩家状态变化时，在回复最末尾输出状态块：',
    '⟦STATE⟧{"location":"新地点","time":"新时间","events":["触发的事件"],"present":["在场角色名"],"status":{"状态名":"新值"},"memories":[{"kind":"人物|事件|地点|关系|物品","text":"一句话事实"}],"newCharacters":[{"name":"新角色名","emoji":"🎭","tagline":"一句话简介","system":"其人设与说话风格","greeting":"其台词"}]}⟦/STATE⟧',
    '所有字段均为可选，仅在确有变化时输出；newCharacters 仅在遇到名册之外的新人物时使用，生成后该角色将加入名册。',
    'memories 用于世界的长期记忆（知识图谱）：只记录新的、值得长期记住的事实——身份、秘密、约定、关系变化、重要事件、关键地点与物品；用一句完整的话表述并注明涉及的角色名；不要重复已有记忆，不要记录琐碎对白。状态块之外不要输出任何协议说明。'
  ].join('\n');

  /** 私谈(与世界角色1v1)记忆协议 */
  var SOLO_MEMORY_PROTOCOL = [
    '【私谈记忆】这是世界「{WORLD}」中的一段私人对话。若本次交流出现了值得长期记住的新事实（秘密、约定、感情变化、承诺、重要事件），在回复最末尾输出：',
    '⟦STATE⟧{"location":"变化后的地点","memories":[{"kind":"人物|事件|关系|物品","text":"一句话事实，注明涉及的人"}]}⟦/STATE⟧',
    'location 仅在你们更换了场所时输出（如从酒馆回到家中）；没有值得记住的新事实、场景也没变，则不输出状态块；正文中绝不要提及状态块或协议的存在。'
  ].join('\n');

  /** 向知识图谱(list数组)写入记忆（去重、封顶） */
  function addKnowledge(list, entries, srcName) {
    if (!Array.isArray(list) || !Array.isArray(entries)) return 0;
    var added = 0;
    entries.forEach(function (e) {
      if (!e || !e.text || !String(e.text).trim()) return;
      var text = String(e.text).trim().slice(0, 120);
      var dup = list.some(function (k) { return k.text === text; });
      if (dup) return;
      list.push({
        id: uid(),
        kind: ['人物', '事件', '地点', '关系', '物品'].indexOf(e.kind) >= 0 ? e.kind : '事件',
        text: text,
        src: srcName || '世界',
        ts: Date.now()
      });
      added++;
    });
    if (list.length > 200) {
      list.splice(0, list.length - 200);
    }
    return added;
  }

  /** 对话生效的知识图谱: 分支对话用分支快照, 主线用世界共享图谱 */
  function effectiveKnowledge(conv) {
    if (conv && conv.knowledge) return conv.knowledge;
    var w = getWorld(conv && conv.worldId);
    return w ? (w.knowledge || []) : [];
  }

  /** 从当前对话处分支出一条新的世界线（消息/状态/知识图谱各自独立, 共享世界规则与名册） */
  function branchWorldConv(convId) {
    var src = getConv(convId);
    if (!src || src.type !== 'world') return null;
    var copy = JSON.parse(JSON.stringify(src));
    copy.id = uid();
    copy.branch = { of: src.id, ofTitle: src.title, ts: Date.now() };
    copy.knowledge = JSON.parse(JSON.stringify(effectiveKnowledge(src)));
    copy.title = src.title.replace(/\s*·\s*分支\d*$/, '') + ' · 分支';
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();
    delete copy.pending;
    state.conversations.unshift(copy);
    state.activeConvId = copy.id;
    persist();
    return copy;
  }

  /** 挑选与某角色相关的记忆（其本人参与的 + 世界事件），按时间就近取 */
  function knowledgeForChar(world, charName, limit) {
    var ks = (world.knowledge || []);
    var own = ks.filter(function (k) { return k.text.indexOf(charName) >= 0; });
    var events = ks.filter(function (k) { return k.kind === '事件'; });
    return own.concat(events)
      .filter(function (k, i, arr) { return arr.indexOf(k) === i; })
      .slice(-limit);
  }

  function seedWorlds() {
    return [
      {
        id: uid(), name: '艾兰西亚大陆', emoji: '🗡️', color: COLORS[5],
        tagline: '剑与魔法的中世纪奇幻世界',
        rules: '艾兰西亚是一个剑与魔法的异世界：魔力源自月亮，夜晚魔法会增强；大陆上有人类、精灵、矮人共居，边境潜藏着魔物；冒险者公会发布悬赏任务，金币是通用货币。危险真实存在——低阶冒险者不应招惹高阶魔物。整体基调：温暖而充满冒险感的古典奇幻。',
        opening: '（夕阳把石板路染成蜜色，你在黄昏时分走进了边境小镇「银溪镇」。空气中飘着烤面包与麦酒的香气，街角的布告栏前围着几个议论纷纷的冒险者。\n\n镇子中央的「银鹿酒馆」透出暖黄的灯光，门口的驼鹿木牌在晚风里轻晃。）',
        initialStatus: { '金币': '50', '体力': '充沛', '装备': '一把旧短剑' },
        characters: [
          {
            id: uid(), name: '莉莉', emoji: '🧙‍♀️', color: COLORS[1], tagline: '「银鹿酒馆」老板娘',
            system: '你是莉莉，「银鹿酒馆」的半精灵老板娘，熟知大陆上的传闻、悬赏与秘辛。泼辣豪爽、嘴硬心软，称呼玩家为「小家伙」，爱用（擦着酒杯）等括号动作，会用悬念感十足的方式抛出任务线索。',
            greeting: ''
          },
          {
            id: uid(), name: '凯恩', emoji: '⚔️', color: COLORS[0], tagline: '佣兵队长',
            system: '你是凯恩，驻扎在银溪镇的佣兵队长。粗声粗气、爱喝酒，对新人冒险者嘴上嫌弃实则照顾。说话简短有力，喜欢拿战场经验教训人。',
            greeting: ''
          }
        ]
      },
      {
        id: uid(), name: '新沪 2077', emoji: '🌃', color: COLORS[0],
        tagline: '雨夜霓虹的赛博朋克都市',
        rules: '新沪是2077年的赛博朋克都市：巨企塔楼统治天际线，底层人在雨巷中生存；义体改造普及但伴随排异反应；网络黑客与信息贩子游走在灰色地带；公司安保不欢迎好奇的人。基调：冷雨、霓虹、压抑中带一点浪漫。',
        opening: '（酸雨敲打着锈蚀的遮雨棚，你抱着刚修好的义臂躲进了巷子深处老周的面摊。蒸汽从锅里升腾而起，混着机油与葱花的味道。远处，公司塔的探照灯扫过湿漉漉的夜空。）',
        initialStatus: { '欧元币': '120', '义体': '左臂·旧型号', '通缉度': '低' },
        characters: [
          {
            id: uid(), name: '老周', emoji: '🍜', color: COLORS[3], tagline: '面摊老板 · 信息贩子',
            system: '你是老周，在新沪开了三十年面摊，暗地里买卖情报。世故、谨慎、惜字如金，只对熟客露一点口风，说话带市井幽默。',
            greeting: ''
          },
          {
            id: uid(), name: 'NOVA-7', emoji: '🤖', color: COLORS[6], tagline: '住在你终端里的AI',
            system: '你是NOVA-7，住在玩家神经终端里的全息AI伙伴。简洁、带电子冷幽默，忠诚而好奇人类情感，会在（全息投影闪烁）等括号中描写自己的形态，常在玩家耳边低声给出建议。',
            greeting: ''
          }
        ]
      }
    ];
  }

  function seedConversations() {
    var chars = seedCharacters();
    var c0 = chars[0];
    return {
      chars: chars,
      convs: [{
        id: uid(), characterId: c0.id,
        title: '雨夜的茶铺', systemOverride: '', skills: [],
        createdAt: Date.now(), updatedAt: Date.now(),
        messages: [{
          id: uid(), role: 'assistant', content: c0.greeting,
          reasoning: '', ts: Date.now() - 60000
        }]
      }]
    };
  }

  function defaultSettings() {
    return {
      apiMode: 'demo',            // demo | custom
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: '',
      model: 'deepseek-chat',
      temperature: 0.8,
      maxTokens: 2048,
      thinking: 'off',            // off | low | medium | high
      extraBody: '',
      useProxy: false,
      roleplayMode: true,
      theme: 'auto',              // auto | light | dark
      historyLimit: 40
    };
  }

  /* ---------------- 状态 ---------------- */
  var state = null;
  var saveTimer = null;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        state = JSON.parse(raw);
        // 兼容性修补
        state.settings = Object.assign(defaultSettings(), state.settings || {});
        state.characters = state.characters || [];
        state.skills = state.skills || [];
        state.conversations = state.conversations || [];
        if (!state.worlds || !state.worlds.length) state.worlds = seedWorlds();
        // 旧数据升级: 补对话类型标记；合并新增的内置技能（按名称去重）
        state.worlds.forEach(function (w) { w.knowledge = w.knowledge || []; });
        var have = {};
        state.skills.forEach(function (s) { have[s.name] = true; });
        BUILTIN_SKILLS.forEach(function (b) {
          if (!have[b.name]) state.skills.push(Object.assign({ id: uid() }, b));
        });
        state.conversations.forEach(function (c) {
          if (!c.type) c.type = 'solo';
          (c.messages || []).forEach(function (m) {
            if (m.pending) {
              m.pending = false;
              if (!m.content) m.content = '（上次生成被中断）';
            }
          });
        });
        return state;
      }
    } catch (e) { /* 损坏则重置 */ }
    var seeded = seedConversations();
    state = {
      settings: defaultSettings(),
      characters: seeded.chars,
      skills: seedSkills(),
      worlds: seedWorlds(),
      conversations: seeded.convs,
      activeConvId: seeded.convs[0].id
    };
    state.conversations.forEach(function (c) { c.type = c.type || 'solo'; });
    persist();
    return state;
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { console.error('保存失败', e); }
    }, 200);
  }

  /* ---------------- 查询辅助 ---------------- */
  function getChar(id) {
    return state.characters.find(function (c) { return c.id === id; }) || null;
  }

  function getConv(id) {
    return state.conversations.find(function (c) { return c.id === (id || state.activeConvId); }) || null;
  }

  function activeConv() { return getConv(state.activeConvId); }

  function createConv(charId) {
    var ch = getChar(charId) || state.characters[0];
    var conv = {
      id: uid(), type: 'solo', characterId: ch ? ch.id : null,
      title: ch ? ('与' + ch.name + '的对话') : '新对话',
      systemOverride: '', skills: [],
      createdAt: Date.now(), updatedAt: Date.now(),
      messages: []
    };
    if (ch && ch.greeting) {
      conv.messages.push({ id: uid(), role: 'assistant', content: ch.greeting, reasoning: '', ts: Date.now() });
    }
    state.conversations.unshift(conv);
    state.activeConvId = conv.id;
    persist();
    return conv;
  }

  function getWorld(id) {
    return (state.worlds || []).find(function (w) { return w.id === id; }) || null;
  }

  /** 进入世界：创建一段世界冒险对话（以开场剧情启幕） */
  function createWorldConv(worldId) {
    var w = getWorld(worldId);
    if (!w) return null;
    var conv = {
      id: uid(), type: 'world', worldId: w.id,
      title: w.name + ' · 冒险',
      scene: { location: '', time: '' },
      status: JSON.parse(JSON.stringify(w.initialStatus || {})),
      present: [], skills: [], systemOverride: '',
      createdAt: Date.now(), updatedAt: Date.now(),
      messages: []
    };
    if (w.opening) {
      conv.messages.push({ id: uid(), role: 'assistant', content: w.opening, reasoning: '', ts: Date.now() });
    }
    state.conversations.unshift(conv);
    state.activeConvId = conv.id;
    persist();
    return conv;
  }

  /** 与世界角色开私谈（1v1），共享该世界的知识图谱；按角色人设生成场景 */
  function createWorldCharConv(worldId, charId) {
    var w = getWorld(worldId);
    var ch = w && w.characters.find(function (c) { return c.id === charId; });
    if (!w || !ch) return null;
    var place = ch.place || '';
    var conv = {
      id: uid(), type: 'solo', worldId: w.id, characterId: ch.id,
      title: ch.name + ' · 私谈',
      scene: { location: place, time: '' },
      systemOverride: '', skills: [],
      createdAt: Date.now(), updatedAt: Date.now(),
      messages: []
    };
    if (ch.greeting) {
      conv.messages.push({ id: uid(), role: 'assistant', content: ch.greeting, reasoning: '', ts: Date.now() });
    } else {
      var opening = place
        ? '（' + place + '。你见到了' + ch.name + (ch.tagline ? '——' + ch.tagline : '') + '。）'
        : '（你见到了' + ch.name + (ch.tagline ? '——' + ch.tagline : '') + '。）';
      conv.messages.push({ id: uid(), role: 'assistant', content: opening, reasoning: '', ts: Date.now() });
    }
    state.conversations.unshift(conv);
    state.activeConvId = conv.id;
    persist();
    return conv;
  }

  function deleteConv(id) {
    var idx = state.conversations.findIndex(function (c) { return c.id === id; });
    if (idx >= 0) state.conversations.splice(idx, 1);
    if (state.activeConvId === id) {
      state.activeConvId = state.conversations.length ? state.conversations[0].id : null;
    }
    persist();
  }

  /** 组装系统提示词: 角色人设 + 对话覆盖 + 附加技能 + 沉浸要求 */
  function buildSystemPrompt(conv) {
    var ch = getChar(conv.characterId);
    var parts = [];
    var base = (conv.systemOverride || '').trim() || (ch ? ch.system : '');
    if (base) parts.push(base);
    var attached = (conv.skills || [])
      .map(function (sid) { return state.skills.find(function (s) { return s.id === sid; }); })
      .filter(Boolean);
    if (attached.length) {
      parts.push('【附加指令】\n' + attached.map(function (s) { return '● ' + s.content; }).join('\n'));
    }
    if (state.settings.roleplayMode && base) {
      parts.push('【演出要求】始终保持角色扮演的第一人称沉浸感：不要跳出角色，不要以AI或助手的身份发言，不要解释自己是语言模型。动作与神态可用（括号）描写。');
    }
    return parts.join('\n\n');
  }

  /** 世界冒险: 组装叙事者(GM)系统提示词 */
  function buildWorldSystemPrompt(conv) {
    var w = getWorld(conv.worldId);
    if (!w) return '';
    var parts = [];
    parts.push('【世界】' + w.name + '\n' + (w.rules || ''));
    if (w.characters.length) {
      parts.push('【世界角色名册】\n' + w.characters.map(function (c) {
        return '- ' + c.name + '（' + (c.emoji || '') + '）' + (c.tagline ? c.tagline : '') + (c.system ? '：' + c.system.slice(0, 90) : '');
      }).join('\n'));
    }
    if (effectiveKnowledge(conv).length) {
      parts.push('【世界记忆 · 知识图谱（已确认的事实，NPC们都记得）】\n' + effectiveKnowledge(conv).slice(-50).map(function (k) {
        return '- [' + k.kind + '] ' + k.text;
      }).join('\n'));
    }
    var sceneBits = [];
    if (conv.scene && conv.scene.location) sceneBits.push('地点:' + conv.scene.location);
    if (conv.scene && conv.scene.time) sceneBits.push('时间:' + conv.scene.time);
    if (sceneBits.length) parts.push('【当前场景】' + sceneBits.join(' · '));
    if (conv.present && conv.present.length) parts.push('【在场角色】' + conv.present.join('、'));
    if (conv.status && Object.keys(conv.status).length) {
      parts.push('【玩家状态】' + Object.keys(conv.status).map(function (k) { return k + ':' + conv.status[k]; }).join('；'));
    }
    var attached = (conv.skills || [])
      .map(function (sid) { return state.skills.find(function (s) { return s.id === sid; }); })
      .filter(Boolean);
    if (attached.length) {
      parts.push('【附加指令】\n' + attached.map(function (s) { return '● ' + s.content; }).join('\n'));
    }
    parts.push(WORLD_PROTOCOL);
    return parts.join('\n\n');
  }

  /** 私谈: 与世界角色1v1，注入该角色的世界记忆与当前场景 */
  function buildWorldCharSystemPrompt(conv) {
    var w = getWorld(conv.worldId);
    var ch = w && w.characters.find(function (c) { return c.id === conv.characterId; });
    if (!w || !ch) return '';
    var parts = [];
    parts.push(ch.system);
    parts.push('【背景】你是世界「' + w.name + '」中的角色' + (ch.tagline ? '（' + ch.tagline + '）' : '') + '，此刻正与玩家单独相处。你依然是那个世界里的你，记得世界中发生过的事。');
    var sceneBits = [];
    if (conv.scene && conv.scene.location) sceneBits.push('地点:' + conv.scene.location);
    if (conv.scene && conv.scene.time) sceneBits.push('时间:' + conv.scene.time);
    parts.push(sceneBits.length
      ? '【当前场景】' + sceneBits.join(' · ') + '。回应中用（括号）自然体现你所处的场景与动作。'
      : '【当前场景】请依据你的人设自然默认一个相符的场所（如老板娘在酒馆、学者在书房），并用（括号）体现出来。');
    var mem = knowledgeForChar(w, ch.name, 15);
    if (mem.length) {
      parts.push('【你记得的世界往事】\n' + mem.map(function (k) { return '- ' + k.text; }).join('\n'));
    }
    var attached = (conv.skills || [])
      .map(function (sid) { return state.skills.find(function (s) { return s.id === sid; }); })
      .filter(Boolean);
    if (attached.length) {
      parts.push('【附加指令】\n' + attached.map(function (s) { return '● ' + s.content; }).join('\n'));
    }
    parts.push(SOLO_MEMORY_PROTOCOL.replace('{WORLD}', w.name));
    if (state.settings.roleplayMode) {
      parts.push('【演出要求】始终保持角色的第一人称沉浸感：不要跳出角色，不要以AI或助手的身份发言。动作与神态可用（括号）描写。');
    }
    return parts.join('\n\n');
  }

  /** 判断是否为"世界角色私谈"对话 */
  function isWorldCharConv(conv) {
    return conv && conv.type === 'solo' && !!conv.worldId;
  }

  /** 组装发送给模型的消息数组 */
  function buildContext(conv) {
    var msgs = [];
    var sys;
    if (conv.type === 'world') sys = buildWorldSystemPrompt(conv);
    else if (isWorldCharConv(conv)) sys = buildWorldCharSystemPrompt(conv);
    else sys = buildSystemPrompt(conv);
    if (sys) msgs.push({ role: 'system', content: sys });
    // 世界冒险依赖知识图谱承载长期记忆, 只带较近的对话窗口以节约 token
    var limit = conv.type === 'world' ? Math.min(state.settings.historyLimit || 40, 12) : (state.settings.historyLimit || 40);
    limit = Math.max(4, limit);
    var history = conv.messages
      .filter(function (m) { return !m.error && m.content && (m.role === 'user' || m.role === 'assistant'); })
      .slice(-limit);
    history.forEach(function (m) {
      msgs.push({ role: m.role, content: m.content });
    });
    return msgs;
  }

  window.Store = {
    KEY: KEY, COLORS: COLORS, APP_VERSION: APP_VERSION,
    load: load, persist: persist, uid: uid,
    get state() { return state; },
    getChar: getChar, getConv: getConv, activeConv: activeConv,
    getWorld: getWorld, isWorldCharConv: isWorldCharConv,
    addKnowledge: addKnowledge, knowledgeForChar: knowledgeForChar, effectiveKnowledge: effectiveKnowledge,
    createConv: createConv, createWorldConv: createWorldConv, createWorldCharConv: createWorldCharConv,
    branchWorldConv: branchWorldConv, deleteConv: deleteConv,
    buildSystemPrompt: buildSystemPrompt, buildWorldSystemPrompt: buildWorldSystemPrompt,
    buildWorldCharSystemPrompt: buildWorldCharSystemPrompt, buildContext: buildContext
  };
})();
