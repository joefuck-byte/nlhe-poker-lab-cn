(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORE = "nlhe-poker-lab-v1";
  const safeParse = (value, fallback) => { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
  let storage = null;
  try {
    storage = window.localStorage;
    const probe = "__nlhe_storage_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
  } catch {
    storage = null;
  }
  const initial = { profile: {}, answers: {}, training: {}, roadmap: {}, hand: {}, view: "home" };
  const state = { ...initial, ...safeParse(storage ? storage.getItem(STORE) : null, {}) };
  const save = () => { if (storage) { try { storage.setItem(STORE, JSON.stringify(state)); } catch {} } updateProgress(); };

  const strategyInfo = {
    gto: { tag: "GTO BENCHMARK", title: "理论最优策略", body: "Game Theory Optimal（理论最优或近似均衡策略）只在明确的游戏树、范围、尺度、筹码、抽水和赛事模型下成立。没有可靠求解结果时，不写伪精确频率。", example: "例：‘100BB、6-max、指定抽水下 BTN vs BB SRP 的某个求解结果’可以是基准；‘A-high 面永远小注’不是。" },
    simple: { tag: "SIMPLIFIED STRATEGY", title: "简化策略", body: "把多个尺度、混合动作或边缘组合压缩成容易执行的规则。简化必须说明被删除了什么、可能损失什么，以及何时不能使用。", example: "例：把两个接近 EV 的小尺度合并为一个 33% pot 尺度，并保留强制 Check 的牌面家族。" },
    exploit: { tag: "EXPLOITATIVE STRATEGY", title: "针对性剥削", body: "针对已经验证的对手或玩家池偏差调整。必须记录证据、机会数、调整幅度、被反剥削风险和停止条件。", example: "例：有可靠样本显示某池对特定小 C-Bet 过度弃牌，才小幅扩大合适的 C-Bet Bluff；不是因为‘线下玩家都爱跟’。" }
  };

  const modules = [
    ["∑","基础数学","Pot Odds、Equity、EV、组合数、SPR 与 MDF","foundation"],
    ["PF","翻前体系","按位置、深度、Ante/抽水和行动节点索引","preflop"],
    ["F→R","翻后体系","牌面分类、范围互动、尺度与三街计划","postflop"],
    ["MTT","锦标赛","Chip EV、ICM、PKO、卫星与决赛桌","mtt"],
    ["$","现金桌","抽水、深筹、Straddle、多人池与玩家池","cash"],
    ["GTO","求解器思维","范围输入、游戏树、简化和 Node Lock","solver"],
    ["DB","数据库分析","统计关联、机会数、样本与漏洞验证","database"],
    ["↻","复盘闭环","学习—测试—实战—验证—更新","review"]
  ];

  const roadmap = [
    { n:"00", title:"诊断与建档", sub:"确定主项、知识缺口、时间和风险边界", goal:"完成玩家档案、闭卷测试和漏洞优先级。", core:["证据分层","三层策略","结果导向偏误"], pass:"能给每个结论添加策略层和证据标签。" },
    { n:"01", title:"基础框架", sub:"位置、范围、组合、权益、赔率与 EV", goal:"用数学和范围语言描述决策，而不是只说牌强或牌弱。", core:["Pot Odds / EV","Combos / Blockers","SPR / MDF"], pass:"基础计算 ≥85%，能解释 Equity、实现性和 EV 的区别。" },
    { n:"02", title:"翻前体系", sub:"建立配置化决策树，不背万能范围", goal:"按位置、筹码、行动、Ante/抽水查找正确节点。", core:["RFI / Facing Open","3-Bet / 4-Bet","Jam / Rejam / Call-off"], pass:"关键边界牌能解释位置、价格、阻断和实现性。" },
    { n:"03", title:"翻后体系", sub:"牌面分类、范围互动、尺度与各街计划", goal:"按底池类型、位置、SPR 和牌面建立三街计划。", core:["范围/坚果优势","Value / Bluff 桶","Turn 与 River 计划"], pass:"陌生 flop 能在 2 分钟内完成分类、优势、尺度和 Turn 计划。" },
    { n:"04", title:"专项分流", sub:"分别深入 MTT 与 Cash", goal:"在主项中建立真实环境下的常见节点库。", core:["MTT：ICM/PKO","Cash：Rake/深筹","线上/线下差异"], pass:"完成主项 20 手牌和 30–50 个配置完整节点。" },
    { n:"05", title:"求解器思维", sub:"提出问题、解释输出、稳健简化", goal:"理解输入如何限制输出，不机械记忆频率。", core:["游戏树与范围","EV 差与混合","Node Lock / 敏感性"], pass:"完成 10 个配置完整、可复现的研究条目。" },
    { n:"06", title:"数据库与剥削", sub:"从关联指标验证玩家池偏差", goal:"用机会数、过滤器和手牌证据建立可证伪假设。", core:["样本置信度","关联诊断","小幅实验与复测"], pass:"完成 3 个‘假设—验证—调整—复测’周期。" },
    { n:"07", title:"持续精进", sub:"形成长期学习与决策质量系统", goal:"独立分析陌生节点，并随新证据更新知识库。", core:["知识版本化","间隔复习","资金与心理边界"], pass:"每周完成复盘闭环，每季度重做综合评估。" }
  ];

  const knowledge = {
    foundation: { label:"基础理论", kicker:"FOUNDATIONS", title:"先把决策语言学准确", desc:"数学并不替你做决定，但能阻止你用错误价格和错误记账点做决定。", condition:"先问：价格、范围和未来行动是什么？", cards:[
      ["赔率、权益与 EV","Pot Odds 是价格；Equity 是摊牌份额；EV 才是动作的平均净收益。",["跟注阈值 C/(P+C)","实现权益受位置和压力影响","所有候选动作使用同一记账点"]],
      ["组合数与阻断牌","从具体花色组合而不是抽象牌名判断价值与诈唬密度。",["对子通常 6 组合","同花通常 4 组合","Blocker 必须说明阻断哪个范围"]],
      ["范围与坚果优势","整体权益优势不等于拥有更多最强组合，两者会导向不同尺度。",["范围优势影响总体下注能力","坚果优势支持极化与大尺度","优势结论依翻前范围"]],
      ["SPR、Alpha 与 MDF","下注几何提供基准，不是脱离范围的自动规则。",["SPR=有效后手/底池","Alpha=B/(P+B)","MDF 只适用于简化模型"]]
    ]},
    preflop: { label:"翻前体系", kicker:"PREFLOP", title:"先选配置，再查范围", desc:"本系统不会给一张万能图。精确频率必须匹配人数、深度、尺寸、Ante/抽水和赛事模型。", condition:"游戏 → 人数 → 深度 → 位置 → 行动 → 费用/赛事", cards:[
      ["位置与深度","UTG、HJ、CO、BTN、SB、BB 必须与桌上人数和 10–200BB 深度绑定。",["10–20BB：Jam/Rejam 树","40–60BB：完整 MTT 树","100–200BB：Cash 与深筹树"]],
      ["首入与面对开池","RFI、Facing Open 与 Flat 需要分别建模，尤其关注后位挤压风险。",["开池位置和尺寸","Call 的价格与实现性","后位玩家和有效深度"]],
      ["3-Bet / 4-Bet / Squeeze","区分线性与极化形状，解释价值目标、诈唬阻断和后续回应。",["价值区与更差继续范围","Bluff 的阻断与可实现性","混合频率无结果则标待验证"]],
      ["特殊节点","Blind vs Blind、Limp、Iso、Open Jam、Rejam、Call-off 不能混成一个表。",["SB Limp/Raise/Jam","Limp-heavy 与多人风险","ICM/PKO/Satellite 分支"]]
    ]},
    postflop: { label:"翻后体系", kicker:"POSTFLOP", title:"按牌面和范围构建三街计划", desc:"同一个 A-high 标签远远不够。底池、位置、SPR、同花性、连接性和坚果变化必须一起看。", condition:"底池 → IP/OOP → SPR → 牌面 → 范围互动", cards:[
      ["底池与人数","分别研究单挑/多人、SRP、3-Bet Pot 和 4-Bet Pot。",["多人池降低边缘权益实现","低 SPR 不等于自动打光","翻前范围错误会传播到河牌"]],
      ["牌面分类","A/K/Q-high、干湿、配对、单色/双色、连接和静态/动态。",["A72r：较静态","987tt：高度动态","具体花色决定阻断"]],
      ["行动节点","C-Bet、Check、Probe、Donk、Delayed C-Bet、Check-Raise、Overbet。",["尺度必须匹配范围形状","Check 也要保护强牌","Turn 前先写 River 计划"]],
      ["河牌结构","Value、Thin Value、Bluff、Bluff Catcher 与 Showdown Value 分桶。",["列出价值目标","优先阻断 Call、保留 Fold","组合与价格检查故事"]]
    ]},
    mtt: { label:"MTT", kicker:"TOURNAMENT", title:"先确认你在最大化什么", desc:"同一手牌在 Chip EV、泡沫 ICM、决赛桌、PKO 和卫星中可能得到不同结论。", condition:"阶段 + 深度 + Ante + 支付 + 全桌筹码 + 覆盖", cards:[
      ["Chip EV 与 $EV","筹码增长不线性等于奖金增长，泡沫和 Pay Jump 会引入风险溢价。",["记录剩余人数与支付","全员筹码进入 ICM","+cEV 可能 −$EV"]],
      ["筹码角色与覆盖","Big、Medium、Short 互相制约，中筹码常承受显著 ICM 压力。",["覆盖按每一对玩家判断","短码不一定最紧","大筹码也要避免覆盖者碰撞"]],
      ["短码与赛事阶段","10–40BB 分别研究 Push/Fold、Rejam、Call-off 与非全押树。",["Ante 改变初始价格","早/中/泡沫/ITM/FT","Turbo/Hyper 增加短码频率"]],
      ["PKO 与卫星","赏金需要模型转换；卫星目标是席位概率而非筹码最大化。",["赏金面值不能直接加底池","确认即时与递增赏金","等值席位使多余筹码贬值"]]
    ]},
    cash: { label:"Cash", kicker:"CASH GAMES", title:"抽水、位置和深度写进每个决策", desc:"线上/线下、6-max/Full Ring、常规/快桌、100BB/超深筹都需要独立配置。", condition:"级别 + 抽水 + 人数 + 位置 + 深度 + Straddle", cards:[
      ["抽水与翻前范围","抽水压低边缘 Cold Call、盲注防守和小底池 EV。",["比例、封顶和触发规则","无抽水模型不可直接使用","具体重分配需要验证"]],
      ["100BB 与深筹","150–200BB+ 时位置和坚果潜力升值，反向隐含赔率加重。",["弱同花/顺子风险上升","非全押 4-Bet 树改变","一对牌不能机械 Stack-off"]],
      ["Limp、Straddle 与多人池","线下非标准尺度要按真实底池和有效单位重算。",["Straddle 改变行动顺序","Iso 尺度看后位与深度","多人池降低边缘诈唬"]],
      ["玩家池与结果","Reg/娱乐玩家只是研究起点，不能替代个体证据。",["bb/100 同时报告样本","红蓝线不是独立目标","Rakeback 与牌桌 EV 分开"]]
    ]},
    research: { label:"数据与求解", kicker:"RESEARCH", title:"用工具验证问题，不制造确定感", desc:"求解器输出和 HUD 数据都受输入限制。先写预测，再运行模型；先看机会数，再看百分比。", condition:"问题 → 配置 → 预测 → 结果 → 敏感性 → 更新", cards:[
      ["求解器配置","保存工具版本、范围、尺寸、深度、抽水/Ante 和精度。",["先看范围再看单手牌","比较 EV 而不迷信频率","至少一个替代输入"]],
      ["Node Locking","锁定有证据的对手偏差，再计算回应并做不同幅度敏感性。",["保留未锁基线","偏差必须可证伪","避免为一手牌过拟合"]],
      ["数据库诊断","总手数不等于节点机会数，不能凭单指标下结论。",["分位置/深度/底池过滤","关联上下游指标","随机样本 + 大底池样本"]],
      ["持续闭环","每次复盘提炼原则、归类错误、安排复习并登记待求解项。",["+1/+3/+7/+21 天","记录适用与禁用条件","新证据进入更新日志"]]
    ]}
  };

  const glossary = [
    ["有效筹码","Effective Stack","基础","相关玩家最多能彼此赢走的较短筹码；多人池按对手分别计算。","Hero 80BB、Villain 35BB，双方有效筹码是 35BB。"],
    ["底池赔率","Pot Odds","数学","跟注成本相对跟注后总底池的比例，阈值为 C/(P+C)。","底池原 100，对手下注 50；跟 50 赢最终 200，需要 25% 原始权益。"],
    ["隐含赔率","Implied Odds","数学","当前价格以外，未来改善后还能赢得额外筹码的潜在价值。","深筹 IP 同花听牌成牌后可能获得额外支付。"],
    ["反向隐含赔率","Reverse Implied Odds","数学","改善成强牌却仍可能输掉更多筹码的未来风险。","深筹多人池的小同花可能输给更大同花。"],
    ["权益","Equity","数学","给定手牌/范围和公共牌下，打到摊牌平均获得的底池份额。","对手范围变化时，同一手牌的 Equity 也变化。"],
    ["权益实现","Equity Realization","数学","原始摊牌权益经真实行动能够转化成 EV 的程度。","OOP 弱高张可能被迫在河牌前弃掉大量权益。"],
    ["期望值","Expected Value · EV","数学","所有结果的净收益按概率加权之和。","30% 净赢 150、70% 净输 50，EV=+10。"],
    ["组合数","Combinations · Combos","范围","一类起手牌或牌力由多少具体花色组合构成。","未知牌未阻断时，口袋对子 6 组合、同花牌 4 组合。"],
    ["阻断牌","Blocker","范围","Hero 持牌减少对手某类组合数量。","持 A♠ 会减少对手含 A♠ 的坚果同花组合。"],
    ["反阻断牌","Unblocker","范围","不阻断希望对手拥有的组合；含义必须指向具体范围。","抓诈时不持失败同花牌，可让对手保留更多自然 Bluff。"],
    ["范围优势","Range Advantage","范围","一方范围在整体权益或高权益密度上更有利。","UTG vs BB 的 A-high 干面，UTG 往往拥有更多强 Ax。"],
    ["坚果优势","Nut Advantage","范围","一方拥有更多最强牌与近坚果组合。","低张连接面上 BB 可能拥有更多两对和顺子。"],
    ["底池筹码比","Stack-to-Pot Ratio · SPR","数学","有效后手与行动前底池的比值。","底池 20BB、后手 80BB，SPR=4。"],
    ["最低防守频率","Minimum Defense Frequency · MDF","数学","使零权益诈唬不能自动获利的简化防守基准 P/(P+B)。","面对 75 into 100，MDF≈57.1%；真实范围下不是强制配额。"],
    ["阿尔法值","Alpha","数学","零权益纯诈唬的盈亏平衡弃牌率 B/(P+B)。","下注 75 争夺 100，Alpha≈42.9%。"],
    ["极化范围","Polarized Range","范围","主要由强价值与诈唬构成，中等强度牌较少。","河牌大尺度常由坚果价值与合适阻断的空气构成。"],
    ["线性范围","Linear Range","范围","从最强牌向下连续选择较强组合。","面对宽跟少 4-Bet 的对手，3-Bet 候选可能更线性。"],
    ["混合策略","Mixed Strategy","GTO","同一组合在相同信息集以不同频率采取多个动作。","某组合在 Check 和 Bet 间混合；无结果时只标混合候选。"],
    ["首入加注","Raise First In · RFI","翻前","前面所有玩家弃牌后首次加注入池。","前面弃牌到 CO，CO 加注到 2.3BB。"],
    ["三次下注","3-Bet","翻前","对翻前开池再次加注。","CO 开到 2.5BB，BTN 加到 8BB。"],
    ["四次下注","4-Bet","翻前","对 3-Bet 再加注。","CO 开、BTN 3-Bet、CO 再加到 22BB。"],
    ["挤压加注","Squeeze","翻前","一人加注且至少一人跟注后再做大额加注。","HJ 开、CO 跟、SB 3-Bet Squeeze。"],
    ["隔离加注","Isolation Raise · Iso","翻前","对 Limp 玩家加注，尝试减少入池人数并获得主动权。","两人 Limp，BTN 用更大尺度 Iso。"],
    ["再全押","Rejam","翻前","面对此前开池或行动再加注全押。","CO 开 2.2BB，SB 18BB Jam。"],
    ["单次加注底池","Single-Raised Pot · SRP","翻后","翻前只有一次加注、没有再加注的底池。","BTN RFI、BB Call 后看 flop。"],
    ["持续下注","Continuation Bet · C-Bet","翻后","前一街进攻者在下一街继续下注。","BTN 翻前开池，BB Call；flop BB Check，BTN Bet。"],
    ["探测下注","Probe Bet","翻后","对手前街 Check Back 后，OOP 玩家在下一街主动下注。","BTN flop Check Back，BB turn Bet。"],
    ["领先下注","Donk Bet","翻后","OOP 非前街进攻者在进攻者行动前下注。","BB 跟注开池后直接在 flop Bet。"],
    ["过牌加注","Check-Raise","翻后","同一街先 Check，面对下注后 Raise。","BB Check、BTN Bet、BB Raise。"],
    ["抓诈牌","Bluff Catcher","翻后","通常输给价值区、赢诈唬区的中等牌。","河牌面对极化大注的一对牌。"],
    ["静态牌面","Static Board","牌面","后续牌较少剧烈改变坚果与牌力排序。","A♠7♦2♣ 通常比 9♠8♠7♦ 更静态。"],
    ["动态牌面","Dynamic Board","牌面","大量 Turn/River 会改变坚果、听牌或优势。","9♠8♠7♦ 在 T、6 或同花牌上变化很大。"],
    ["独立筹码模型","Independent Chip Model · ICM","MTT","用筹码和支付估算当前奖金权益的模型。","决赛桌需要所有玩家筹码和完整支付结构。"],
    ["风险溢价","Risk Premium","MTT","ICM 下跟注全押相对纯 Chip EV 所需的额外权益。","泡沫中筹码面对覆盖自己的大筹码 Jam 通常需要更高权益。"],
    ["筹码期望","Chip Expected Value · cEV","MTT","以赛事筹码衡量动作的平均收益。","某 Jam 可为 +1BB cEV，但未必增加奖金权益。"],
    ["奖金期望","Dollar Expected Value · $EV","MTT","以奖金价值衡量赛事决策。","泡沫期 +cEV Call 仍可能是 −$EV。"],
    ["渐进式赏金赛","Progressive Knockout · PKO","MTT","淘汰对手时一部分赏金支付，另一部分加入自身赏金。","覆盖、赏金规则和支付共同改变 Call-off。"],
    ["抽水","Rake","Cash","牌室从底池或按时间收取的费用。","无抽水下接近零 EV 的 Call，真实抽水后可能转负。"],
    ["枪口加盲","Straddle","Cash","盲注外的额外强制下注，会改变行动顺序与实际深度。","1/2、Straddle 4、后手 200，相对 Straddle 只有 50 个单位。"],
    ["节点锁定","Node Locking","GTO","强制某节点采用假设策略，再计算回应或新均衡。","锁定玩家池对小 C-Bet 过弃后研究调整；结论只对该假设有效。"],
    ["胜率","Win Rate · bb/100","数据","Cash 每 100 手平均赢得的大盲，必须连同样本与方差报告。","20,000 手 5 bb/100 不能证明真实胜率正好为 5。"],
    ["红线","Red Line","数据","未到摊牌底池的累计输赢。","红线下降可能来自合理弃牌、抽水或桌型，不自动等于少 Bluff。"]
  ].map(([zh,en,cat,def,ex]) => ({ zh,en,cat,def,ex }));

  const testSections = [
    { key:"math", label:"基础数学", qs:[
      "底池 80，Villain 下注 40。Hero 跟注 40 的直接底池赔率阈值是多少？写出算式。",
      "底池 100，Hero 下注 60。在零权益纯诈唬、无后续行动的模型中，Alpha 和 MDF 各是多少？",
      "未知牌中，AKs 与 AKo 通常各有多少组合？若 Hero 持 A♠，Villain 的 AA 还剩多少组合？",
      "某动作 30% 时净赢 150，70% 时净输 50。EV 是多少？",
      "区分 Equity、Equity Realization 与 EV，并举一个有权益但 Call 仍可能 −EV 的例子。",
      "Flop 底池 12BB、有效后手 48BB。SPR 是多少？它为何不能单独决定 Stack-off？"
    ]},
    { key:"preflop", label:"翻前", qs:[
      "使用任何翻前图表前，至少列出 8 个必须核对的配置字段。",
      "为什么 100BB、6-max、高抽水 Cash 的 SB 策略不能直接用于 20BB、带 BB Ante 的 MTT？",
      "区分线性 3-Bet 与极化 3-Bet，并各描述一种可能适用条件。",
      "定义 Squeeze，并解释死钱、原开池者、跟注者和后位玩家怎样进入决策。",
      "‘BTN 15BB，前面弃牌，拿 A7o 应该怎么做？’指出信息缺口并给出条件式框架。",
      "面对开池时，如何系统比较 Fold、Call 和 3-Bet？"
    ]},
    { key:"postflop", label:"翻后", qs:[
      "从最高张、连接性、同花性、对子性和动态性分类 A♠7♦2♣ 与 9♠8♠7♦。",
      "区分 Range Advantage 与 Nut Advantage，并举一个优势不在同一方的场景。",
      "决定 Flop C-Bet 前，Turn 计划至少应包含哪些牌类和范围问题？",
      "经典河牌极化、无加注玩具模型中，Pot-size Bet 的 Value:Bluff 比约是多少？为何不能直接套用？",
      "河牌 Bluff 时，阻断对手跟注区和阻断对手弃牌区有何相反影响？",
      "为什么单挑 SRP 的 C-Bet 策略不能直接用于三人底池？"
    ]},
    { key:"mtt", label:"MTT", qs:[
      "区分 Chip EV 与 $EV；给出一个 +cEV 但可能 −$EV 的情形。",
      "解释 Risk Premium。为什么它常使覆盖者对被覆盖中筹码的压力更大？",
      "分析泡沫期全押牌，至少需要哪些赛事快照信息？列出 7 项。",
      "PKO 中为什么不能把 Villain 的赏金面值直接加进底池？还需知道什么？",
      "卫星赛剩 11 人、10 个等值席位。为何大筹码策略可能与普通 MTT 泡沫完全不同？",
      "Big、Medium、Short Stack 如何相互制约？为何最紧的并不一定是短码？"
    ]},
    { key:"cash", label:"Cash", qs:[
      "抽水如何影响边缘 Cold Call、盲注防守和 3-Bet/Call/Fold 的重分配？",
      "从 100BB 增加到 200BB 后，位置、坚果潜力与反向隐含赔率怎样变化？",
      "1/2 Cash 加 UTG Straddle 4，Hero 200。为何不能只说 Hero 有 100BB？",
      "列出线上和线下至少 5 个应验证的环境差异，说明为何不能当作刻板印象。",
      "Red Line 持续下降是否自动代表 Bluff 不足？给出至少 4 个竞争解释。",
      "某级别 20,000 手赢 5 bb/100，能否断言真实胜率为 5？为什么？"
    ]},
    { key:"exploit", label:"GTO 与剥削", qs:[
      "严格区分 GTO 基准、简化策略和剥削调整，各写一个使用条件。",
      "什么是 Node Locking？怎样避免锁入想当然的偏差后得到精确但无效的答案？",
      "Villain 总样本 10,000 手，但只有 28 次 River Call 机会。应如何描述置信度？",
      "你怀疑某池面对 33% pot Flop C-Bet 过度弃牌。写出从观察到正式剥削的流程。",
      "可靠证据表明某对手在特定 River 节点严重 Underbluff。抓诈范围应如何调整？",
      "一手大底池 Hero 赢了。写出不受结果污染的复盘流程和可迁移原则所需字段。"
    ]}
  ];
  const allQuestions = testSections.flatMap((s, si) => s.qs.map((q, qi) => ({ id: si*6+qi+1, section:s.key, label:s.label, q })));

  const week = [
    ["Day 1","建档与闭卷诊断","75–90 分钟",["填写玩家档案","闭卷完成 36 题测试","记录最不确定的 3 题"]],
    ["Day 2","评分与错误分类","60 分钟",["按 0/1/2 分评分","把错题归入原因标签","选择 P1 与 P2 弱项","口述三层策略"]],
    ["Day 3","P1 弱项：原理","60 分钟",["10 分钟主动回忆","25 分钟弱项训练","做 2 个新情景题","生成 2 张复习卡"]],
    ["Day 4","P1：决策树与迁移","60 分钟",["复测 Day 3","画一张决策树","隐藏结果复盘 2 手牌","写一条带禁用条件的原则"]],
    ["Day 5","P2 弱项 + 主项","60 分钟",["复测错题","完成 P2 模块","建立 MTT 快照或 Cash 抽水档案","登记一个待求解问题"]],
    ["Day 6","标准化手牌复盘","60–90 分钟",["复盘一手赢牌","复盘一手输牌","复盘一手边缘小池","三手都写三层策略"]],
    ["Day 7","周测与闭环","60 分钟",["随机重做 6 道错题","分析一个陌生牌局","更新漏洞与复习队列","确定下周唯一目标"]]
  ];

  const profileSchema = [
    ["基本情况","决定训练强度与目标",[["level","当前自评水平","select",["","新手","入门","中级","高级","职业"]],["years","学习扑克时长","text"],["goal","主要目标","text"],["studyTime","每周学习时间","text"],["playTime","每周实战时间","text"]]],
    ["主要游戏","决定 MTT 与 Cash 的训练比例",[["mainGame","主项","select",["","MTT","Cash","两者"]],["mix","MTT / Cash 比例","text"],["environment","线上 / 线下比例","text"],["platform","常用平台或牌室","text"],["format","常见桌型","text"]]],
    ["MTT 与 Cash","填写与你相关的部分",[["abi","MTT 平均买入 ABI","text"],["mttFormat","MTT 常见赛制/字段","text"],["stake","Cash 常玩级别","text"],["depth","Cash 常见深度","text"],["rake","Cash 抽水 / Straddle","text"]]],
    ["工具与风险","决定数据和求解训练方式",[["database","数据库 / HUD","text"],["solver","求解器与熟练度","text"],["materials","已有范围/课程/书籍","text"],["bankroll","独立扑克资金规则","text"],["stopRule","降级与停止规则","text"]]]
  ];

  const handFields = {
    game: [["gameType","游戏类型","select",["","MTT","Cash"]],["environment","线上/线下、平台/牌室","text"],["format","桌型","text"],["blinds","盲注与 Ante","text"],["rake","抽水（Cash）","text"],["structure","赛事结构 / Straddle","text"],["stage","赛事阶段、剩余人数、奖金/ICM/赏金","textarea","wide"]],
    player: [["heroPos","Hero 位置","text"],["heroHand","Hero 手牌（含花色）","text"],["effective","有效筹码","text"],["villain","对手位置与筹码","text"],["reads","对手画像、统计与样本","textarea","wide"],["question","最不确定的节点与候选动作","textarea","wide"]],
    street: [["preflop","Preflop 完整行动、尺度与底池","textarea"],["flop","Flop 牌面、底池、行动与思考","textarea"],["turn","Turn 牌面、底池、行动与思考","textarea"],["river","River 牌面、底池、行动与思考","textarea"],["result","Showdown / Result（可隐藏）","textarea","wide"]]
  };

  function navigate(view) {
    if (!$("#view-"+view)) view = "home";
    $$(".view").forEach(el => el.classList.toggle("active", el.id === "view-"+view));
    $$(".nav-item").forEach(el => { const on = el.dataset.view === view; el.classList.toggle("active", on); el.setAttribute("aria-current", on ? "page" : "false"); });
    state.view = view; save(); $("#sidebar").classList.remove("open"); window.scrollTo({ top:0, behavior:"smooth" });
  }

  function toast(message) { const el=$("#toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove("show"),2200); }
  function openModal(info) { $("#modalTag").textContent=info.tag||"提示"; $("#modalTitle").textContent=info.title; $("#modalBody").textContent=info.body; $("#modalExample").textContent=info.example||""; $("#infoModal").hidden=false; }
  function closeModal(){ $("#infoModal").hidden=true; }
  function downloadText(name, text, type="text/plain") { const blob=new Blob([text],{type:type+";charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500); }
  async function copyText(text){ try{ await navigator.clipboard.writeText(text); toast("已复制到剪贴板"); }catch{ downloadText("nlhe-copy.txt",text); toast("已改为下载文本"); } }

  function renderHome(){
    $("#homeModules").innerHTML=modules.map(m=>`<button class="module-card" data-module="${m[3]}"><span class="module-icon">${m[0]}</span><h3>${m[1]}</h3><p>${m[2]}</p><small>打开模块 →</small></button>`).join("");
    $$("[data-module]").forEach(b=>b.addEventListener("click",()=>{ navigate("knowledge"); renderKnowledge(b.dataset.module); }));
  }

  function renderRoadmap(){
    $("#roadmapList").innerHTML=roadmap.map((r,i)=>`<article class="roadmap-item ${i===0?"open":""}"><button class="roadmap-head"><span class="stage-number">${r.n}</span><div><h3>${r.title}</h3><p>${r.sub}</p></div><b>›</b></button><div class="roadmap-body"><div class="roadmap-columns"><div><h4>学习目标</h4><p>${r.goal}</p></div><div><h4>核心概念</h4><ul>${r.core.map(x=>`<li>${x}</li>`).join("")}</ul></div></div><h4>进入下一阶段的证据</h4><p>${r.pass}</p><label class="roadmap-check"><input type="checkbox" data-roadmap="${i}" ${state.roadmap[i]?"checked":""}/> 我已达到本阶段标准</label></div></article>`).join("");
    $$(".roadmap-head").forEach(b=>b.addEventListener("click",()=>b.closest(".roadmap-item").classList.toggle("open")));
    $$('[data-roadmap]').forEach(c=>c.addEventListener("change",()=>{ state.roadmap[c.dataset.roadmap]=c.checked; save(); }));
  }

  let knowledgeKey="foundation";
  function renderKnowledge(preferred){
    if (preferred && knowledge[preferred]) knowledgeKey=preferred;
    else if (["solver","database","review"].includes(preferred)) knowledgeKey="research";
    $("#knowledgeTabs").innerHTML=Object.entries(knowledge).map(([k,v])=>`<button role="tab" class="${k===knowledgeKey?"active":""}" data-knowledge="${k}">${v.label}</button>`).join("");
    const v=knowledge[knowledgeKey];
    $("#knowledgeContent").innerHTML=`<div class="knowledge-hero"><div><span class="eyebrow">${v.kicker}</span><h2>${v.title}</h2><p>${v.desc}</p></div><div class="condition-chip">${v.condition}</div></div><div class="knowledge-grid">${v.cards.map(c=>`<article class="knowledge-card"><h3>${c[0]}</h3><p>${c[1]}</p><ul>${c[2].map(x=>`<li>${x}</li>`).join("")}</ul></article>`).join("")}</div>`;
    $$('[data-knowledge]').forEach(b=>b.addEventListener("click",()=>{knowledgeKey=b.dataset.knowledge;renderKnowledge();}));
  }

  let glossaryCat="全部";
  function renderGlossary(){
    const cats=["全部",...new Set(glossary.map(x=>x.cat))];
    $("#glossaryFilters").innerHTML=cats.map(c=>`<button class="${c===glossaryCat?"active":""}" data-cat="${c}">${c}</button>`).join("");
    const q=$("#glossarySearch").value.trim().toLowerCase();
    const list=glossary.filter(x=>(glossaryCat==="全部"||x.cat===glossaryCat)&&(!q||[x.zh,x.en,x.cat,x.def,x.ex].join(" ").toLowerCase().includes(q)));
    $("#glossaryGrid").innerHTML=list.map(x=>`<article class="term-card"><div class="term-top"><div><h3>${x.zh}</h3><span class="english">${x.en}</span></div><span class="term-category">${x.cat}</span></div><p class="term-definition">${x.def}</p><p class="term-example"><b>例：</b>${x.ex}</p></article>`).join("");
    $("#glossaryEmpty").hidden=list.length!==0;
    $$('[data-cat]').forEach(b=>b.addEventListener("click",()=>{glossaryCat=b.dataset.cat;renderGlossary();}));
  }

  let testKey="math";
  function renderTest(){
    $("#testTabs").innerHTML=testSections.map(s=>`<button class="${s.key===testKey?"active":""}" data-test-tab="${s.key}">${s.label}</button>`).join("");
    const qs=allQuestions.filter(q=>q.section===testKey);
    $("#testQuestions").innerHTML=`<div class="question-list">${qs.map(q=>`<article class="question-card ${state.answers[q.id]?.trim()?"answered":""}" data-question="${q.id}"><div class="question-heading"><span class="question-number">${q.id}</span><div><p>${q.q}</p><textarea data-answer="${q.id}" placeholder="写下你的答案、计算过程或缺少的信息…">${state.answers[q.id]||""}</textarea><div class="answer-tools"><span class="answered-label">✓ 已保存</span><small>${q.label} · 0–2 分</small></div></div></div></article>`).join("")}</div>`;
    $$('[data-test-tab]').forEach(b=>b.addEventListener("click",()=>{testKey=b.dataset.testTab;renderTest();}));
    $$('[data-answer]').forEach(t=>t.addEventListener("input",()=>{state.answers[t.dataset.answer]=t.value;t.closest(".question-card").classList.toggle("answered",!!t.value.trim());save();}));
    updateTestProgress();
  }
  function updateTestProgress(){const n=Object.values(state.answers).filter(x=>String(x).trim()).length;$("#testAnswered").textContent=`${n} / 36`;$("#testMeterBar").style.width=`${n/36*100}%`;}

  function renderWeek(){
    $("#weekGrid").innerHTML=week.map((d,di)=>{const complete=d[3].every((_,ti)=>state.training[`${di}-${ti}`]);return `<article class="day-card ${complete?"complete":""}"><div class="day-head"><div><span class="day-index">${d[0]}</span><h3>${d[1]}</h3></div><span class="day-duration">${d[2]}</span></div>${d[3].map((t,ti)=>`<label class="training-task"><input type="checkbox" data-training="${di}-${ti}" ${state.training[`${di}-${ti}`]?"checked":""}/><span>${t}</span></label>`).join("")}</article>`;}).join("");
    $$('[data-training]').forEach(c=>c.addEventListener("change",()=>{state.training[c.dataset.training]=c.checked;save();renderWeek();}));
    const total=week.reduce((n,d)=>n+d[3].length,0),done=Object.values(state.training).filter(Boolean).length;$("#weekPercent").textContent=Math.round(done/total*100)+"%";
  }

  function fieldHTML(f, values){const [name,label,type,extra]=f;const val=values[name]||"";const wide=extra==="wide"?" wide":"";if(type==="select")return `<div class="field${wide}"><label for="${name}">${label}</label><select id="${name}" name="${name}">${extra.map(o=>`<option ${o===val?"selected":""}>${o}</option>`).join("")}</select></div>`;if(type==="textarea")return `<div class="field${wide}"><label for="${name}">${label}</label><textarea id="${name}" name="${name}">${val}</textarea></div>`;return `<div class="field${wide}"><label for="${name}">${label}</label><input id="${name}" name="${name}" value="${String(val).replaceAll('"','&quot;')}" /></div>`;}

  function renderHand(){
    $("#handGameFields").innerHTML=handFields.game.map(f=>fieldHTML(f,state.hand)).join("");$("#handPlayerFields").innerHTML=handFields.player.map(f=>fieldHTML(f,state.hand)).join("");$("#handStreetFields").innerHTML=handFields.street.map(f=>fieldHTML(f,state.hand)).join("");
    $$("input,textarea,select",$("#handForm")).forEach(el=>el.addEventListener("input",()=>{state.hand[el.name]=el.value;save();$("#handSaveStatus").textContent="已自动保存";}));
  }
  function handText(){const v=state.hand;return `# 德州扑克手牌提交\n\n1. 游戏类型：${v.gameType||"unknown"}\n2. 环境：${v.environment||"unknown"}\n3. 桌型：${v.format||"unknown"}\n4. 盲注与 Ante：${v.blinds||"unknown"}\n5. 抽水：${v.rake||"unknown"}\n6. 赛事结构 / Straddle：${v.structure||"unknown"}\n7. 赛事阶段、奖金、ICM/赏金：${v.stage||"unknown"}\n8. Hero 位置：${v.heroPos||"unknown"}\n9. Hero 手牌：${v.heroHand||"unknown"}\n10. 有效筹码：${v.effective||"unknown"}\n11. 对手位置与筹码：${v.villain||"unknown"}\n12. 对手画像与可靠统计：${v.reads||"unknown"}\n\n## Preflop\n${v.preflop||"unknown"}\n\n## Flop\n${v.flop||"unknown"}\n\n## Turn\n${v.turn||"unknown"}\n\n## River\n${v.river||"unknown"}\n\n## Showdown / Result\n${v.result||"暂时隐藏"}\n\n## 最不确定的节点与候选动作\n${v.question||"unknown"}\n\n请分别给出：信息缺口、候选策略、EV 逻辑、GTO 基准、简化策略、剥削调整、主要错误、可迁移原则和待求解问题。`;}

  function renderProfile(){
    $("#profileSections").innerHTML=profileSchema.map(s=>`<section class="profile-section"><h2>${s[0]}</h2><p>${s[1]}</p><div class="form-grid">${s[2].map(f=>fieldHTML(f,state.profile)).join("")}</div></section>`).join("");
    $("#profileStatus").textContent=Object.values(state.profile).filter(Boolean).length?"已保存到本机":"尚未填写";
  }
  function profileText(){return profileSchema.map(s=>`## ${s[0]}\n`+s[2].map(f=>`- ${f[1]}：${state.profile[f[0]]||"unknown"}`).join("\n")).join("\n\n");}

  function updateProgress(){
    const pCount=Object.values(state.profile).filter(x=>String(x).trim()).length, pTotal=profileSchema.reduce((n,s)=>n+s[2].length,0);const a=Object.values(state.answers).filter(x=>String(x).trim()).length;const tTotal=week.reduce((n,d)=>n+d[3].length,0),t=Object.values(state.training).filter(Boolean).length;const r=Object.values(state.roadmap).filter(Boolean).length;const pct=Math.round(((pCount/pTotal)+(a/36)+(t/tTotal)+(r/8))/4*100);
    $("#topProgressText").textContent=pct+"%";$("#topProgressRing").style.setProperty("--p",pct);$("#mainProgressText").textContent=pct+"%";$("#mainProgressRing").style.setProperty("--p",pct);$("#statProfile").textContent=pCount?"✓":"0";$("#statTest").textContent=a;$("#statTraining").textContent=t;updateTestProgress();
    let today;if(pCount<3)today={step:"STEP 1",title:"完成玩家档案",desc:"先告诉系统你主要打 MTT 还是 Cash，以及每周能投入多少时间。",tasks:["选择主项和环境","填写级别与工具","设定资金和停止边界"],view:"profile"};else if(a<36)today={step:"STEP 2",title:"完成六维度水平测试",desc:"闭卷回答 36 题。不会时写缺失信息和条件式分析。",tasks:[`已完成 ${a}/36 题`,"保留计算过程","不要提前查答案"],view:"assessment"};else today={step:"STEP 3",title:"执行本周训练",desc:"根据最低两个分项安排 P1 和 P2 训练块。",tasks:[`本周已完成 ${t}/${tTotal} 项`,"复盘至少 5 手牌","安排间隔复习"],view:"training"};
    $("#todayPill").textContent=today.step;$("#todayTitle").textContent=today.title;$("#todayDescription").textContent=today.desc;$("#todayTasks").innerHTML=today.tasks.map(x=>`<span class="task-mini">${x}</span>`).join("");$("#todayAction").dataset.target=today.view;
  }

  function bindEvents(){
    $$(".nav-item").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));$$('[data-go]').forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));$("#menuButton").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
    $("#todayAction").addEventListener("click",e=>navigate(e.currentTarget.dataset.target||"profile"));
    $$('[data-info]').forEach(b=>b.addEventListener("click",()=>openModal(strategyInfo[b.dataset.info])));$(".modal-close").addEventListener("click",closeModal);$("#infoModal").addEventListener("click",e=>{if(e.target.id==="infoModal")closeModal();});
    $("#glossarySearch").addEventListener("input",renderGlossary);$("#globalSearch").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.currentTarget.value.trim()){navigate("glossary");$("#glossarySearch").value=e.currentTarget.value;renderGlossary();}});document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#globalSearch").focus();}if(e.key==="Escape")closeModal();});
    $("#exportAnswers").addEventListener("click",()=>downloadText("nlhe-diagnostic-answers.txt",allQuestions.map(q=>`${q.id}. ${q.q}\n答：${state.answers[q.id]||"未作答"}`).join("\n\n")));
    $("#clearTest").addEventListener("click",()=>{if(confirm("确认清空全部 36 题答案？")){state.answers={};save();renderTest();toast("测试答案已清空");}});
    $("#finishTest").addEventListener("click",()=>{const n=Object.values(state.answers).filter(x=>String(x).trim()).length;openModal({tag:"SCORING",title:n===36?"测试已完成":"还有题目未完成",body:`当前已作答 ${n}/36。每题按 0–2 分：2 分=正确且能说明条件；1 分=核心方向正确但不完整；0 分=核心错误或无答案。建议把导出的答案发给我统一评分。`,example:"六个分项各 12 分。低于 60% 是 P1，60–79% 是 P2，80% 以上进入维护。总分不是盈利预测。"});});
    $("#handForm").addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(e.currentTarget);for(const [k,v] of fd)state.hand[k]=v;save();$("#handOutputText").textContent=handText();$("#handOutput").hidden=false;$("#handOutput").scrollIntoView({behavior:"smooth"});});
    $("#copyHand").addEventListener("click",()=>copyText($("#handOutputText").textContent));$("#clearHand").addEventListener("click",()=>{if(confirm("确认清空手牌草稿？")){state.hand={};save();renderHand();$("#handOutput").hidden=true;}});
    $("#profileForm").addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(e.currentTarget);for(const [k,v] of fd)state.profile[k]=v;save();$("#profileStatus").textContent="已保存到本机";toast("玩家档案已保存");});
    $("#exportProfile").addEventListener("click",()=>downloadText("nlhe-player-profile.txt",profileText()));
  }

  try {
    renderHome();renderRoadmap();renderKnowledge();renderGlossary();renderTest();renderWeek();renderHand();renderProfile();bindEvents();updateProgress();navigate(state.view||"home");
    document.documentElement.dataset.appReady = "true";
    if (!storage) setTimeout(() => toast("页面可正常使用；当前浏览器不会保存进度"), 250);
  } catch (error) {
    console.error("NLHE Poker Lab failed to start", error);
    const warning = document.createElement("div");
    warning.className = "boot-warning";
    warning.innerHTML = "<strong>页面功能没有成功启动</strong><span>请用 Safari 或 Chrome 重新打开本文件；不要使用文档预览模式。</span>";
    document.body.prepend(warning);
  }
})();
