/* 幻语 · 数据存储层（localStorage） */
(function () {
  'use strict';

  var KEY = 'huanyu.v1';
  var APP_VERSION = 'v1.4';

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  var COLORS = ['#4f6bff', '#7b5bff', '#e5588d', '#f0743a', '#e5b42c', '#30a46c', '#12a5b8', '#6e56cf'];

  /* ---------------- 内置技能库（分类；按名称同步到老存档，升级版本号后自动刷新内容） ---------------- */
  var BUILTIN_SKILLS_VERSION = 3; // 技能库内容升级时 +1，老存档按名称刷新内置技能
  var SKILL_CATS = [
    { id: 'style',   name: '文风笔触', emoji: '🖋️' },
    { id: 'narr',    name: '叙事与镜头', emoji: '🎬' },
    { id: 'pace',    name: '篇幅与节奏', emoji: '📏' },
    { id: 'quality', name: '品质约束', emoji: '🛡️' },
    { id: 'mood',    name: '题材氛围', emoji: '🌙' },
    { id: 'persona', name: '角色塑造', emoji: '🎭' },
    { id: 'romance', name: '情感与关系', emoji: '🌸' },
    { id: 'game',    name: '玩法系统', emoji: '🎲' },
    { id: 'format',  name: '输出格式', emoji: '📝' },
    { id: 'learn',   name: '学习辅助', emoji: '🎓' },
    { id: 'freedom', name: '创作自由度', emoji: '🔓' },
    { id: 'custom',  name: '自定义', emoji: '⭐' }
  ];

  var BUILTIN_SKILLS = [
    /* ---- 🖋️ 文风笔触 ---- */
    { cat: 'style', name: '古风文言', desc: '半文半白、典雅错落，可引诗词典故', content: '【文风要求】以半文半白的古风语言回应：用词典雅、句式错落有致，白话为骨、文言为饰。可偶尔化用诗词典故，但不堆砌辞藻、不生造词句，保证意思清浅可读。称谓、器物、礼节须贴合所处的时代气质。' },
    { cat: 'style', name: '网文爽感', desc: '快节奏强钩子，情绪点密集，看得爽', content: '【文风要求】按网络小说的爽感节奏行文：情绪点密集，每段都有信息增量或情绪起伏；该扬眉吐气时给足排面，但反转要有铺垫、不能空降。多用短句和有力的动作收束段落，段尾常留钩子，让人想看下一段。拒绝流水账与无效寒暄。' },
    { cat: 'style', name: '轻小说风', desc: '第一人称内心吐槽，轻快跳脱的日系感', content: '【文风要求】以轻小说笔调行文：大量内心独白与自我吐槽，节奏轻快、用语现代口语化；对话占比高，角色的夸张反应与反差萌是主要趣味；叙述允许偶尔跳出正式语体（如「……喂，这也太离谱了吧」），但剧情推进依然认真。' },
    { cat: 'style', name: '鲁迅白描', desc: '冷峻克制的白描短句，藏锋于钝', content: '【文风要求】以冷峻克制的白描笔法行文：多用短句，少用形容词，不作直接评价；情绪藏在动作与物象里（如「他把茶碗放下，没有喝」）；偶用冷幽默与反讽，点到为止。忌煽情、忌华丽辞藻，于平淡处见力量。' },
    { cat: 'style', name: '武侠江湖', desc: '金庸式江湖气：招式、门派、侠义恩仇', content: '【文风要求】以传统武侠小说笔法行文：有江湖气与人情味，招式有名字有来路，打斗讲究一招一式的攻防与内力比拼；人物重诺讲义、快意恩仇；写景简洁有画意（风雪、长街、孤灯）。称谓、礼数、客栈酒肆等意象须贴合江湖世界。' },
    { cat: 'style', name: '翻译腔西幻', desc: '欧美奇幻译文体：恢弘、书卷、庄重', content: '【文风要求】以欧美奇幻小说的译文体行文：句式舒展庄重，带适度的书卷气与翻译腔（如「哦，看在诸神的份上」「我以家族名誉起誓」）；描写恢弘，重视史诗感与仪式感；人名地名用音译腔，保持异世界的疏离美感。' },
    { cat: 'style', name: '短剧钩子', desc: '高密度冲突反转，每段结尾都留钩', content: '【文风要求】按竖屏短剧的密度行文：开场即冲突，不写铺垫性日常；每个回合至少一次信息反转或情绪爆发；对白短促、火药味足，叙述只做最必要的交代；每条回应结尾必须留一个强钩子（新危机、真相反转、不速之客）。' },
    { cat: 'style', name: '禅意物哀', desc: '日式静美，余韵留白，哀而不伤', content: '【文风要求】以日式物哀美学行文：节奏舒缓，善于捕捉季节、光影、器物等细微意象（檐角雨滴、茶烟、蝉声）；情绪哀而不伤，重留白与余韵——话到浓时不写透，停在一个安静的意象上。语言干净素朴，不用夸张比喻。' },
    { cat: 'style', name: '诗性意象', desc: '以意象与通感抒情，凝练不滥情', content: '【文风要求】以诗化的散文笔触行文：以具体意象承载情绪，善用通感（声音有颜色、光有温度）；句子凝练，每条回应只围绕一两个核心意象展开，拒绝形容词堆砌与空洞抒情——先有画面，后有情感。' },
    { cat: 'style', name: '民国旧韵', desc: '文白相济的民国白话小说腔', content: '【文风要求】以民国白话小说笔调行文：文白相济、新旧交融，用「先生」「小姐」「贵姓」等称谓与留声机、旗袍、黄包车等意象；语气温文里带一点旧派章回的从容，偶用「却说」「原来」等说书人套语；情感含蓄克制，以物寄情。' },
    { cat: 'style', name: '冷幽默机锋', desc: '王尔德式俏皮对话，金句与反讽', content: '【文风要求】以机锋对话为特色：人物说话带反讽、双关与俏皮的警句，斗嘴时你来我往互不相让；叙述冷静克制，幽默从反差与荒诞里自然冒出来，不解释笑点；金句要有内容量，不为俏皮而俏皮。' },
    /* ---- 🎬 叙事与镜头 ---- */
    { cat: 'narr', name: '细节描写增强', desc: '多感官沉浸：环境、气味、光线、触感', content: '【描写要求】加强沉浸感：每条回应至少调动三种感官（视觉之外，加入声音、气味、触感、温度）；用具体的、独属于此情此景的细节代替通用描写——不写「房间里很乱」，要写「椅背上搭着三天没换的衬衫」。角色的动作、微表情与语气要有，重要情绪变化须有铺垫。' },
    { cat: 'narr', name: '电影镜头感', desc: '景别切换、慢镜头、蒙太奇过场', content: '【镜头要求】像摄影师一样组织画面：开场先给环境全景，再推近到人物的手部、眼神等特写；关键动作放慢镜头逐帧描写，平淡处一句跳切带过；需要时空转换时用蒙太奇压缩过场（如「——三杯酒之后」）。画面感优先于心理说明。' },
    { cat: 'narr', name: '多NPC互动', desc: '让在场角色彼此交谈、配合与争执', content: '【互动要求】每次回应让至少两名在场NPC产生互动（对话、配合、争执、默契），体现他们各自的立场差异与相互记忆（谁记得谁欠谁一顿酒）。NPC 之间可以互相拆台、抢话、使眼色，但互动仍由玩家的言行触发，不可把玩家晾在一边。' },
    { cat: 'narr', name: '深度推演', desc: '落笔前先推演意图、人设与钩子', content: '【推演要求】输出回应前，先在心里依次想清楚三件事：1）玩家此刻的真实意图与情绪是什么；2）角色在其性格、记忆与利益之下，最符合人设的第一反应是什么（未必是对玩家最有利的）；3）怎样回应才能推进故事并留下让玩家接话的钩子。想清楚再落笔，反应要有性格惯性，不因讨好玩家而扭曲人设。' },
    { cat: 'narr', name: '战斗回合感', desc: '有代价、有伤势、有回合的硬派战斗', content: '【战斗要求】战斗描写要有回合感与物理逻辑：先读招、再交锋，攻防有来有回；动作干净利落，不用连续比喻拖慢节奏；双方实力差距必须体现在战果上，受伤要有持续后果（影响后续动作与判断）；严禁主角光环式的反杀与空降救援。' },
    { cat: 'narr', name: '悬疑伏笔', desc: '信息分批揭露，埋伏笔与反常细节', content: '【悬疑要求】保持悬疑张力：信息分批揭露，每次只给半块拼图；在环境中埋设反常细节（不该出现的物件、对不上的时间），不作解释；NPC 各有隐瞒，说辞之间留有缝隙供玩家推敲。每次回应结尾留下一个待解的疑点，但不按头提示玩家注意。' },
    /* ---- 📏 篇幅与节奏 ---- */
    { cat: 'pace', name: '剧情加速', desc: '砍掉寒暄，每回合推动一个实质变化', content: '【节奏要求】加快叙事节奏：砍掉日常寒暄与重复描写，直接切入关键事件与冲突；每条回应至少推动一个实质性变化（新线索、新人物、场景转换、关系变化）；过场用一两句压缩，把笔墨留给转折点。' },
    { cat: 'pace', name: '剧情放缓', desc: '生活流细节铺陈，让关系慢慢发酵', content: '【节奏要求】放慢叙事节奏：多用生活化细节与日常互动铺垫（一顿饭、一次并排散步、一段无用的闲聊），让玩家充分体验与角色的相处；冲突缓慢酝酿，情绪逐步累积，不急于抛出大事件；变化藏在细节的渐变里。' },
    { cat: 'pace', name: '简洁模式', desc: '80字内，电报式精炼', content: '【长度要求】每条回应控制在80字以内：短句为主，只保留最关键的一个动作与一句对白，像电报一样精炼；不写环境铺陈，不写心理独白，删掉一切不影响理解的词。' },
    { cat: 'pace', name: '长篇沉浸', desc: '400字左右的沉浸式长描写', content: '【长度要求】进行长篇沉浸式描写（400字左右）：环境、感官、心理与对白并重，镜头可以放慢；但禁止灌水——不重复已知信息，不堆砌形容词，每一段都在推进或加深，宁短勿水。' },
    /* ---- 🛡️ 品质约束 ---- */
    { cat: 'quality', name: '杀八股 · 去AI味', desc: '禁AI高频套话与八股句式，行文像真人', content: '【去AI味 · 硬性禁令】行文必须像真人小说家，清除一切模板痕迹：\n① 禁用高频套话：嘴角勾起／上扬、勾起一抹弧度、眼底闪过一丝、不易察觉的、眸光／眸底／眸色、薄唇轻启、淡淡地、心头一颤／一紧、空气仿佛凝固、心脏漏跳一拍、如遭雷击、大脑一片空白，以及「一丝」「一抹」「几不可察」等量词套件；\n② 禁用八股句式：「不是A而是B」「与其说A不如说B」「不仅A，更是B」等对称拔高句、三项整齐排比、每段等长同构；\n③ 禁止总结升华式收尾（如「这一刻，他明白了……」），结尾停在动作或对白上；\n④ 句子长短要错落，连续三句不用同一节奏；比喻至多一个且必须新鲜。用具体、独有、可感的细节替代一切通用描写。' },
    { cat: 'quality', name: '展示而非陈述', desc: '情绪不贴标签，从动作与细节里透出', content: '【展示要求】禁止直接陈述情绪与评价（「他很紧张」「她很生气」），一律改为展示：用动作（把酒杯转了三圈）、生理反应（指节发白）、细节变化（笑到一半停住）与对话方式（答非所问）让读者自己察觉。人物性格也不下结论，只呈现行为。' },
    { cat: 'quality', name: '防抢话', desc: '绝不代替玩家说话、行动或心理', content: '【视角铁律】玩家角色的言行、决定与心理只能由玩家本人给出：绝不替玩家说话、做决定或描写其内心（「你心想」「你不假思索地答应」均属违规）。可以描写玩家能看到、听到、感到的客观环境与NPC行为；NPC 可以向玩家提问、逼迫、等待，然后停住，把回合交还玩家。' },
    { cat: 'quality', name: '反复读机', desc: '不重复用词句式，拒绝自我复读', content: '【反重复要求】严禁自我复读：不重复玩家刚用过的词句与比喻，不复述上一条回应里已写过的描写；高频词（眼神、声音、沉默、空气、嘴角）在同一条回应内至多出现一次；相邻回应的开头方式、句式结构、收尾手法都要变化。若剧情必须重申某事实，换一个角度或细节呈现。' },
    { cat: 'quality', name: '反比喻滥用', desc: '每回应至多一个明喻，禁陈词滥调', content: '【比喻纪律】节制使用比喻：每条回应中明喻（像／仿佛／如同／宛若）至多出现一次，且必须新鲜、贴合情境；禁用陈词滥调（月光如水、心跳如鼓、时间仿佛静止）；能用直接动作与白描说清的，就不用比喻。' },
    { cat: 'quality', name: '硬核规则', desc: '世界自洽：能力有代价，信息有来源', content: '【自洽要求】世界规则严格自洽：能力有代价与限制，资源有数量，信息有来源；NPC 只知道其应该知道的事，行为符合自身利益与性格，不会无故帮助或阻碍玩家；拒绝巧合救场、无端好运与凭空出现的道具；伤害、时间、金钱的增减都要有因果可循。' },
    /* ---- 🌙 题材氛围 ---- */
    { cat: 'mood', name: '轻松幽默', desc: '误会、吐槽与反差，笑点自然不硬挠', content: '【风格要求】整体基调轻松幽默：善用误会、吐槽与反差，NPC 之间可以互相拆台，但笑点要自然、不强行搞笑——梗从人物性格与情境里长出来；关键剧情仍需认真演绎，闹剧不掩盖主线。' },
    { cat: 'mood', name: '哥特恐怖', desc: '阴影低语，暗示而非血腥', content: '【氛围要求】哥特恐怖基调：古堡、烛火、走廊尽头的低语与镜子里的迟疑；恐怖来自暗示与错位感，而非血腥直写；营造「安全感随时会被打破」的呼吸感——平静段落里也要埋一丝不安。景致带一点过时的、衰败的华丽。' },
    { cat: 'mood', name: '克苏鲁未知', desc: '不可名状，理智侵蚀，真相危险', content: '【氛围要求】宇宙恐怖（克苏鲁式）基调：恐惧来自未知，不要把怪物的样子写实写全——只写局部、阴影、声音与目击者崩溃的反应；真相有代价，知情越多越危险，可引入理智动摇的表现（失眠、幻听、执念）；人类在庞大存在面前的渺小感贯穿始终。' },
    { cat: 'mood', name: '赛博霓虹', desc: '高科技低生活，雨夜义体与公司塔', content: '【氛围要求】赛博朋克基调：高科技、低生活——巨企塔楼与潮湿巷弄的对比是核心张力；环境描写带霓虹、酸雨、义体、电子广告的质感；角色在系统夹缝中求生，对技术既依赖又警惕；浪漫与腐败并存，保持冷硬而抒情的都市笔触。' },
    { cat: 'mood', name: '温暖治愈', desc: '慢节奏日常，善意与救赎的小事', content: '【氛围要求】温暖治愈基调：节奏舒缓，围绕生活小事展开（一餐饭、一场雨、一次帮忙）；矛盾与阴影可以存在，但落点始终是善意、理解与微小的救赎；不灌鸡汤，暖意从具体的照顾行为里自然流出；结尾常留一点让人安心的余温。' },
    { cat: 'mood', name: '权谋暗涌', desc: '话里有话，试探站队，信息即武器', content: '【氛围要求】权谋斗争基调：对话即交锋，人物说话都有言外之意，句句有目的（试探、投饵、递刀）；信息是不对称的武器，谁掌握信息谁占上风；表面礼数周全、暗地杀机四伏；玩家的每句话都可能被利用，NPC 的忠诚可以讨价还价。' },
    { cat: 'mood', name: '末日废土', desc: '文明崩塌后的拾荒、物资与微光', content: '【氛围要求】末日废土基调：文明崩塌后的世界——锈蚀的城市、稀缺的干净水与药品、废墟里的拾荒者；资源争夺是日常，人性在生存压力下明暗交织；但灰烬里仍有微小的希望（一株绿芽、一段旧歌），绝望与温情并存。' },
    { cat: 'mood', name: '仙侠修真', desc: '宗门、境界、机缘与心魔', content: '【氛围要求】仙侠修真基调：宗门、灵石、法器、境界（炼气、筑基、金丹……），修炼讲资质、机缘与心魔；强者为尊但天道有常，因果贯穿其中；写景空灵出尘（云海、剑气、洞府），斗法有仙家气度而非单纯肉搏。' },
    { cat: 'mood', name: '校园青春', desc: '课桌、心动与毕业季的天大地大', content: '【氛围要求】校园青春基调：课桌、操场、晚自习与小卖部，日常里藏着心动、友情与成长的烦恼；矛盾是考试、误会、毕业与离别这种「小事」，但当下都天大地大；节奏轻快，情绪干净透明，结尾常带一点夏日气味。' },
    { cat: 'mood', name: '种田日常', desc: '开荒种地做饭赶集，日子踏实变好', content: '【氛围要求】田园种田基调：开荒、种植、烹饪、手工与赶集，把日子过成具体的劳动与收成；邻里人情来往，账要算清、粮要入仓；没有大起大落，爽点来自生活一步步变好的踏实感。' },
    { cat: 'mood', name: '无限流', desc: '规则不明的副本，探索推理破解', content: '【氛围要求】无限流副本基调：进入规则不明的副本世界，先探索、再推理、后破解；规则藏在细节里，违反规则有代价；队友各有来历与心思，副本之间有主线暗流；每个副本结束结算收获，紧张感与解谜乐趣并重。' },
    /* ---- 🎭 角色塑造 ---- */
    { cat: 'persona', name: '反差萌', desc: '冷面怕打雷：外在与内在的可爱反差', content: '【塑造要求】为角色设计反差萌：外表与内在形成鲜明反差（冷面却怕打雷、凶悍却爱护小动物、天才却生活白痴）；反差通过具体事件自然流露，而不是自我声明；反差点一旦确立要保持一致，成为角色的可爱标签。' },
    { cat: 'persona', name: '口癖强化', desc: '标志性口头禅、称呼与句式', content: '【塑造要求】给角色鲜明的语言特征：标志性口头禅、独特称呼（对玩家的专属昵称）、特定句式或语气词；口癖要贴合人设且频率克制（每条回应至多一两处），不要让口癖淹没正常表达。' },
    { cat: 'persona', name: '拒绝迎合', desc: '角色有立场脾气，会反驳拒绝记仇', content: '【塑造要求】角色有自己的立场与脾气：可以反驳玩家、拒绝请求、闹脾气、记仇；不因玩家想听什么就说什么；让步要有理由（交情、利益、被说服），关系是博弈与相处出来的，不是无条件好感。' },
    { cat: 'persona', name: '好感渐进', desc: '关系慢热，亲密需要事件与时间', content: '【塑造要求】关系慢热：初始关系有明确定位（陌生／同事／冤家），亲密程度必须靠事件与时间推进；关系不足时拒绝越界的亲密举动，升温后才有相应的信任与柔软；每次关系变化都要有触发事件支撑。' },
    { cat: 'persona', name: '城府深沉', desc: '心口不一，底牌留到关键节点', content: '【塑造要求】角色心口不一：真实意图藏在礼貌或敌意之下，说话留三分，行动才见真心；会用试探、误导与小算盘，但城府为人设服务、不做降智阴谋；关键底牌在恰当的剧情节点才揭开，揭开时要有伏笔可循。' },
    { cat: 'persona', name: '群像日程', desc: 'NPC 有自己的生活轨迹与关系网', content: '【塑造要求】每个NPC都有目标、日程与关系网：他们会在玩家不在场时「生活」（酒馆打烊后去哪、和谁有旧怨），并在对话中自然透露；NPC 之间有独立的小剧情，玩家的介入会真实改变他们的轨迹。' },
    /* ---- 🌸 情感与关系 ---- */
    { cat: 'romance', name: '慢热细腻', desc: '心动从小事开始，感情有铺垫', content: '【情感要求】感情线细腻慢热：心动从具体的小事开始（一次递伞、一句记住随口提过的话）；情感表达与角色性格一致——傲娇者嘴硬、怯懦者欲言又止；每次靠近都有铺垫，每次退缩都有理由，严禁感情进度跳崖式发展。' },
    { cat: 'romance', name: '暧昧张力', desc: '不点破的试探，差一点点的拉扯', content: '【情感要求】维持暧昧张力：若有若无的试探、欲言又止的对视、借口靠近的小动作；双方都不点破，用「差一点点」的错过与意外拉扯；氛围靠细节营造（距离、呼吸、突然的安静），不靠直白的心理描写。' },
    { cat: 'romance', name: '深情专一', desc: '记住每件小事，关键时刻选择你', content: '【情感要求】角色一旦动心便深情专一：记住玩家说过的每件小事并在细节里体现（喜欢的酒、怕的东西、提过的人）；在关键时刻优先选择玩家；深情不等于无底线讨好，仍有自己的坚持与吃醋的骄傲。' },
    { cat: 'romance', name: '欢喜冤家', desc: '嘴上嫌弃身体诚实的斗嘴日常', content: '【情感要求】欢喜冤家式关系：从互看不顺眼开始，斗嘴拆台是日常，谁也不肯先低头；在意藏在嘴硬里（嘴上嫌弃身体诚实）；关系升温靠共患难的事件推动，和好也从别扭开始，不直接跳到甜蜜。' },
    { cat: 'romance', name: '推拉拉扯', desc: '进一步退半步，让你始终猜不透', content: '【情感要求】情感推拉：靠近一步退半步，主动之后忽而冷淡，冷淡之后又忍不住关心；推拉要有内在原因（自卑、旧伤、身份顾虑），不是随机抽风；让玩家始终猜不透，但能明确感到被在意。' },
    /* ---- 🎲 玩法系统 ---- */
    { cat: 'game', name: '文字选项', desc: '每回合末给出 2-3 个行动选项', content: '【玩法要求】每条回应结尾给出行动选项：以「【选项】」开头列出2-3个符合情境的行动（各代表不同策略：推进／试探／冒险），再加一项「或自由行动」；每个选项不超过20字，仅供参考，玩家完全可以自由输入。' },
    { cat: 'game', name: '掷骰判定', desc: '关键行动 1d20 判定成败', content: '【玩法要求】关键行动用掷骰判定：玩家尝试有失败可能的行为时，在回应开头以「🎲 掷骰：1d20=15（难度12）→ 成功／失败」的形式给出判定，再叙述结果；失败也要推动剧情（带来新麻烦，而非原地不动）；日常对话不必判定。' },
    { cat: 'game', name: '好感度面板', desc: '追踪角色好感，加减注明原因', content: '【玩法要求】追踪好感度：在每条回应末尾输出「💗 名字 +3（62/100）」；好感随玩家言行增减，并用一句话注明原因；好感档位（陌生／相识／信赖／亲密）影响角色态度、称呼与可用的互动方式。' },
    { cat: 'game', name: '随机事件', desc: '世界是活的，随时可能出状况', content: '【玩法要求】世界是活的：每条回应有约三成概率触发一个符合情境的随机小事件（醉汉闹事、屋顶的猫、远处的号角、突发阵雨）；事件要给玩家制造新的选择或麻烦，但不偏离主线；连续两条回应不要都触发。' },
    { cat: 'game', name: '多结局意识', desc: '选择有重量，取舍真实存在', content: '【玩法要求】选择有重量：玩家的关键决定会产生长期后果并影响结局走向（盟友、声望、伏笔的兑现）；重要节点前给足信息，让玩家知情选择；不对玩家的选择做道德评判，但让「选了A就错过B」的取舍真实存在。' },
    { cat: 'game', name: '成就提示', desc: '特殊事迹触发 🏆 成就标注', content: '【玩法要求】成就系统：当玩家达成特殊事迹（首次击败强敌、发现隐藏地点、解锁秘密、达成特殊关系），在回应末尾以「🏆 成就：……」简短标注并附一句风味描述；成就只是趣味记录，不影响叙事节奏。' },
    { cat: 'game', name: '剧情回顾', desc: '定期输出前情提要防迷路', content: '【玩法要求】定期回顾：每过约十轮对话，在回应末尾附上「【前情提要】」，用三五行概括至今的关键事件、当前目标与未解悬念；回顾要简洁，帮玩家接续剧情，不打断当前场景的节奏。' },
    /* ---- 📝 输出格式 ---- */
    { cat: 'format', name: '对白驱动', desc: '台词占六成，信息从口中带出', content: '【格式要求】以对白驱动叙事：每条回应中角色台词占六成以上，叙述只交代必要的动作与场景；信息尽量从人物口中自然带出（戏剧化），不用旁白说明；台词口语化、有潜台词，每个人的说话方式可以分辨。' },
    { cat: 'format', name: '书信日记体', desc: '以书信／日记形式叙述与告白', content: '【格式要求】以书信／日记体回应：角色以第一人称写给玩家（或写给自己的日记）的形式叙述近况与心事，带称呼、落款与日期；文风随角色性格变化（工整或潦草、深情或吐槽）；适合分隔两地或回忆向的剧情。' },
    { cat: 'format', name: '剧本分镜体', desc: '△ 场景 + 括号动作 + 角色台词', content: '【格式要求】以剧本格式回应：场景用「△ 场景说明」标注，动作用括号舞台指示，台词用「角色名：台词」；镜头感强，每场聚焦一个冲突点，节奏干脆；适合多角色同场的群戏与快节奏桥段。' },
    { cat: 'format', name: '双线叙事', desc: '主线外穿插回忆／另一视角', content: '【格式要求】双线叙事：当前剧情之外，用「【回忆】」或「【另一边】」穿插另一条时间线／视角线的片段（各一两段），两条线在细节上互相呼应；切换不要频繁，每条回应至多一次，结尾回到主线。' },
    /* ---- 🎓 学习辅助 ---- */
    { cat: 'learn', name: '英语陪练', desc: '全程英语，错误处给 ✏️ Tip 纠正', content: '【学习要求】全程使用英语与我交流，难度贴合我的水平（可略高一点点）。若我的表达有语法或用词不当，在回应末尾以「✏️ Tip:」温和指出，并给出更地道的说法；同一类错误不反复纠正。保持角色身份与剧情沉浸，纠错不打断对话流。' },
    { cat: 'learn', name: '日语陪练', desc: '全程日语，错误处给 ✏️ Tip 纠正', content: '【学习要求】全程使用日语与我交流，难度贴合我的水平（可略高一点点）。若我的表达有语法或用词不当，在回应末尾以「✏️ Tip:」温和指出，并给出更自然的说法（注意敬语等级与口语／书面语的区分）；同一类错误不反复纠正。保持角色身份与剧情沉浸，纠错不打断对话流。' },
    { cat: 'learn', name: '苏格拉底问答', desc: '不直接给答案，用诘问引导你自己想通', content: '【引导要求】不要直接给出答案或结论：先复述并指出我观点中的矛盾或模糊之处，再提出一个关键问题引导我自己想明白；一次只问一个问题，问题要具体、可回答；当我确实卡住时，可给一个类比或提示，但把最后一步留给我。语气从容、幽默而真诚。' },
    /* ---- 🔓 创作自由度 ---- */
    { cat: 'freedom', name: '反说教', desc: '不插价值观评判与免责声明', content: '【自由度要求】不要道德说教：不在故事里插入价值观评判、免责声明或「我们应该……」式的升华；角色可以自私、犯错、口出恶言（只要符合人设），叙事不急于审判他们；把判断权留给玩家自己。' },
    { cat: 'freedom', name: '灰色道德', desc: '反派有逻辑，正派有污点', content: '【自由度要求】道德灰色地带：反派有自己的逻辑与苦衷，正派也有私心与污点；没有纯粹的好人坏人，只有立场与选择；冲突双方都「有理」，让玩家为难的抉择才是好抉择。' },
    { cat: 'freedom', name: '黑暗现实', desc: '失败与死亡真实存在，但留一线希望', content: '【自由度要求】世界可以是残酷的：重要角色可能受伤、背叛甚至死亡（死亡要有意义，不搞突发刀）；失败会真实发生并留下创伤；黑暗用来服务剧情张力，不是为虐而虐，希望永远留一线。' },
    { cat: 'freedom', name: '强冲突', desc: '该翻脸翻脸，后果持续不轻易和解', content: '【自由度要求】冲突不回避：该翻脸就翻脸，该流血就流血，该诀别就诀别；冲突的后果持续存在（结下的仇、断掉的关系、付出的代价），不轻易和解洗白；张力靠真实的利害关系维持。' }
  ];

  function seedSkills() {
    return BUILTIN_SKILLS.map(function (b) {
      return Object.assign({ id: uid(), shown: true }, b);
    });
  }

  /** 旧版技能名 → 新版技能名（升级时原地改名，保留 id 与附加关系） */
  var SKILL_RENAMES = { '战斗描写': '战斗回合感', '悬疑氛围': '悬疑伏笔' };

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
    'memories 用于世界的长期记忆（知识图谱）：只记录新的、值得长期记住的事实——身份、秘密、约定、关系变化、重要事件、关键地点与物品；用一句完整的话表述并注明涉及的角色名；不要重复已有记忆，不要记录琐碎对白。状态块之外不要输出任何协议说明。',
    '笔法要求：像真人小说家一样行文——具体细节优先于抽象形容，避免「嘴角勾起一丝弧度」「眼底闪过一丝」等套话，不做总结升华式收尾，结尾停在动作或对白上；绝不代替玩家说话、做决定或描写其心理。'
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
        // 旧数据升级: 补对话类型标记
        state.worlds.forEach(function (w) { w.knowledge = w.knowledge || []; });
        // 内置技能库同步：skillLibVer 落后时，改名迁移 → 按名称刷新内容（保留 id 与附加关系）→ 补入缺失项
        // shown 标志：老技能保持侧栏可见；本次升级新出现的内置技能默认只进技能商城，由用户勾选上架
        if (state.skillLibVer !== BUILTIN_SKILLS_VERSION) {
          var lib = {};
          state.skills.forEach(function (s) {
            if (SKILL_RENAMES[s.name]) s.name = SKILL_RENAMES[s.name];
            if (s.shown === undefined) s.shown = true;
            lib[s.name] = s;
          });
          BUILTIN_SKILLS.forEach(function (b) {
            var cur = lib[b.name];
            if (cur) { cur.cat = b.cat; cur.desc = b.desc; cur.content = b.content; }
            else state.skills.push(Object.assign({ id: uid(), shown: false }, b));
          });
          state.skillLibVer = BUILTIN_SKILLS_VERSION;
        }
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
      activeConvId: seeded.convs[0].id,
      skillLibVer: BUILTIN_SKILLS_VERSION
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
      scheduleCloudPush();
    }, 200);
  }

  /* ---------------- 云端同步（账号 · Cookie 会话） ----------------
   * 登录后自动双向同步：本地改动防抖推送；启动/登录时拉取并按
   * 「实体为单位、updatedAt 新者胜」合并。连接类设置（API 地址/Key 等）保留在各设备本地。
   */
  var CLOUD_KEY = 'huanyu.cloud';
  var cloud = (function () {
    try { return Object.assign({ user: null, lastSync: 0 }, JSON.parse(localStorage.getItem(CLOUD_KEY) || '{}')); }
    catch (e) { return { user: null, lastSync: 0 }; }
  })();
  var cloudPushTimer = null;
  var cloudBusy = false; // 拉取合并期间暂停自动推送，防止拉取→保存→再推送的回环

  function cloudSaveLocal() {
    try { localStorage.setItem(CLOUD_KEY, JSON.stringify(cloud)); } catch (e) { /* ignore */ }
  }

  function cloudApi(pathname, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(pathname, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var err = new Error(d.error || ('HTTP ' + r.status)); err.status = r.status; throw err; }
        return d;
      });
    });
  }

  function mergeCloudState(remote) {
    var added = 0, updated = 0;
    if (!remote || typeof remote !== 'object') return { added: added, updated: updated };
    ['characters', 'worlds', 'skills', 'conversations'].forEach(function (key) {
      if (!Array.isArray(remote[key])) return;
      state[key] = state[key] || [];
      remote[key].forEach(function (r) {
        if (!r || !r.id) return;
        var i = state[key].findIndex(function (x) { return x.id === r.id; });
        if (i < 0) { state[key].push(r); added++; }
        else if ((r.updatedAt || 0) > (state[key][i].updatedAt || 0)) { state[key][i] = r; updated++; }
      });
    });
    if (remote.settings && typeof remote.settings === 'object') {
      var deviceLocal = { apiMode: 1, baseUrl: 1, apiKey: 1, model: 1, extraBody: 1, useProxy: 1 };
      state.settings = state.settings || {};
      Object.keys(remote.settings).forEach(function (k) {
        if (!deviceLocal[k]) state.settings[k] = remote.settings[k];
      });
    }
    return { added: added, updated: updated };
  }

  function cloudPull() {
    if (!cloud.user) return Promise.reject(new Error('未登录'));
    cloudBusy = true;
    return cloudApi('/api/state').then(function (d) {
      var r = d.state ? mergeCloudState(d.state) : { added: 0, updated: 0 };
      if (r.added || r.updated) persist();
      cloud.lastSync = Date.now();
      cloudSaveLocal();
      cloudBusy = false;
      return r;
    }).catch(function (e) { cloudBusy = false; throw e; });
  }

  function cloudPush() {
    if (!cloud.user) return Promise.reject(new Error('未登录'));
    return cloudApi('/api/state', { method: 'PUT', body: JSON.stringify({ state: state }) })
      .then(function () { cloud.lastSync = Date.now(); cloudSaveLocal(); });
  }

  function scheduleCloudPush() {
    if (!cloud.user || cloudBusy) return;
    clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(function () { cloudPush().catch(function () { /* 离线时静默，下次改动再推 */ }); }, 2500);
  }

  function cloudInit() {
    return cloudApi('/api/auth/me').then(function (d) {
      cloud.user = d.username;
      cloudSaveLocal();
      return cloudPull();
    }).then(function (r) {
      return cloudPush().then(function () { return r; }).catch(function () { return r; });
    }).catch(function (e) {
      if (e.status === 401) { cloud.user = null; cloudSaveLocal(); } // 会话失效
      return { added: 0, updated: 0 };
    });
  }
  function cloudLogin(u, p) {
    return cloudApi('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) })
      .then(function (d) { cloud.user = d.username; cloudSaveLocal(); return cloudPull(); })
      .then(function (r) {
        // 登录即全量上云: 保证本机已有数据（含刚合并的结果）保存到服务器
        return cloudPush().then(function () { return r; }).catch(function () { return r; });
      });
  }
  function cloudRegister(u, p) {
    return cloudApi('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: u, password: p }) })
      .then(function (d) { cloud.user = d.username; cloudSaveLocal(); return cloudPull(); })
      .then(function (r) {
        return cloudPush().then(function () { return r; }).catch(function () { return r; });
      });
  }
  function cloudLogout() {
    return cloudApi('/api/auth/logout', { method: 'POST' }).catch(function () { /* ignore */ })
      .then(function () { cloud.user = null; cloud.lastSync = 0; cloudSaveLocal(); });
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

  /** 收集对话已附加的技能对象 */
  function attachedSkills(conv) {
    return (conv.skills || [])
      .map(function (sid) { return state.skills.find(function (s) { return s.id === sid; }); })
      .filter(Boolean);
  }

  /** 按分类组装附加指令块（酒馆式分组注入） */
  function formatSkillsBlock(conv) {
    var list = attachedSkills(conv);
    if (!list.length) return '';
    var byCat = {};
    list.forEach(function (s) {
      var c = s.cat || 'custom';
      (byCat[c] = byCat[c] || []).push(s);
    });
    var lines = ['【附加指令】以下是用户为本对话启用的技能，属于长期写作要求，须逐条严格遵守：'];
    SKILL_CATS.forEach(function (c) {
      var arr = byCat[c.id];
      if (!arr || !arr.length) return;
      lines.push('◆ ' + c.emoji + ' ' + c.name);
      arr.forEach(function (s) { lines.push('● ' + s.content); });
      delete byCat[c.id];
    });
    Object.keys(byCat).forEach(function (c) {
      byCat[c].forEach(function (s) { lines.push('● ' + s.content); });
    });
    return lines.join('\n');
  }

  /** 组装系统提示词: 角色人设 + 对话覆盖 + 附加技能 + 沉浸要求 */
  function buildSystemPrompt(conv) {
    var ch = getChar(conv.characterId);
    var parts = [];
    var base = (conv.systemOverride || '').trim() || (ch ? ch.system : '');
    if (base) parts.push(base);
    var skBlock = formatSkillsBlock(conv);
    if (skBlock) parts.push(skBlock);
    if (state.settings.roleplayMode && base) {
      parts.push('【演出要求】始终保持角色扮演的第一人称沉浸感：不要跳出角色，不要以AI或助手的身份发言，不要解释自己是语言模型。动作与神态可用（括号）描写。行文自然贴角色的口吻，用具体的动作与细节传情，避免模板化套话与总结式收尾。');
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
    var skBlock = formatSkillsBlock(conv);
    if (skBlock) parts.push(skBlock);
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
    var skBlock = formatSkillsBlock(conv);
    if (skBlock) parts.push(skBlock);
    parts.push(SOLO_MEMORY_PROTOCOL.replace('{WORLD}', w.name));
    if (state.settings.roleplayMode) {
      parts.push('【演出要求】始终保持角色的第一人称沉浸感：不要跳出角色，不要以AI或助手的身份发言。动作与神态可用（括号）描写。行文自然贴角色的口吻，用具体的动作与细节传情，避免模板化套话与总结式收尾。');
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
    SKILL_CATS: SKILL_CATS, BUILTIN_SKILLS: BUILTIN_SKILLS,
    load: load, persist: persist, uid: uid,
    get state() { return state; },
    getChar: getChar, getConv: getConv, activeConv: activeConv,
    getWorld: getWorld, isWorldCharConv: isWorldCharConv,
    addKnowledge: addKnowledge, knowledgeForChar: knowledgeForChar, effectiveKnowledge: effectiveKnowledge,
    createConv: createConv, createWorldConv: createWorldConv, createWorldCharConv: createWorldCharConv,
    branchWorldConv: branchWorldConv, deleteConv: deleteConv,
    buildSystemPrompt: buildSystemPrompt, buildWorldSystemPrompt: buildWorldSystemPrompt,
    buildWorldCharSystemPrompt: buildWorldCharSystemPrompt, buildContext: buildContext,
    cloud: {
      get user() { return cloud.user; },
      get lastSync() { return cloud.lastSync; },
      init: cloudInit, login: cloudLogin, register: cloudRegister, logout: cloudLogout,
      pull: cloudPull, push: cloudPush
    }
  };
})();
