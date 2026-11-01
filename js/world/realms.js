'use strict';
// Земли и народы. Королевство делится на герцогства, герцогство — на графства, графство — на баронства.
// У каждого герцогства свой народ (люди, эльфы, гномы, орки, полурослики), своя вера, обычаи,
// праздник, уклад и закон; у каждого баронства — свой барон или баронесса из местных.
// Особняком стоят города суккубов: там правит Матрона, а хитрые суккубы торгуют всем — даже словом.
// Всё выводится из зерна мира отдельным генератором: старые сохранения не ломаются.
(function (E) {
  const U = E.U, D = E.D, World = E.World;
  const R = E.Realms = {};

  // ---------- народы ----------
  // h — рост, b — сложение, skin/hair — цвета, life — во сколько раз дольше живут
  const RACES = R.RACES = {
    human: { n: ['человек', 'женщина', 'люди'], adj: 'людской', m: 'человек', f: 'человеческая женщина', h: 1, b: 1, life: 1,
      skin: ['#e8c4a4', '#d8a880', '#c49070', '#a87050', '#8a5a3a'], hair: ['#3a2416', '#1a1410', '#a87a40', '#6a4a2a', '#c8a060', '#8a3a1a'] },
    elf: { n: ['эльф', 'эльфийка', 'эльфы'], adj: 'эльфийский', h: 1.06, b: 0.88, life: 3,
      skin: ['#f0dcc8', '#e8d0bc', '#d8c4b8', '#c8b0a0'], hair: ['#f0e0a0', '#e8e8f0', '#1a1410', '#c8a060', '#8a5a2a'] },
    dwarf: { n: ['гном', 'гномка', 'гномы'], adj: 'гномий', h: 0.8, b: 1.24, life: 2,
      skin: ['#e0a080', '#d09070', '#c08068'], hair: ['#8a3a1a', '#5a3a22', '#1a1410', '#c8c8c8', '#b06a2a'] },
    orc: { n: ['орк', 'орчанка', 'орки'], adj: 'орочий', h: 1.07, b: 1.2, life: 0.8,
      skin: ['#7a9a5a', '#6a8a5a', '#8a9a6a', '#7a8a7a'], hair: ['#1a1410', '#2a2420', '#3a2a1a'] },
    halfling: { n: ['полурослик', 'полурослица', 'полурослики'], adj: 'полуросличий', h: 0.7, b: 1.06, life: 1.3,
      skin: ['#e8c0a0', '#d8a880', '#c89878'], hair: ['#6a4a2a', '#a87a40', '#3a2416', '#c8a060'] },
    darkelf: { n: ['тёмный эльф', 'тёмная эльфийка', 'тёмные эльфы'], adj: 'тёмно-эльфийский', h: 1.04, b: 0.88, life: 3,
      skin: ['#6e7088', '#5c5e78', '#7c7c98'], hair: ['#e8e8f0', '#d0d0e0', '#a8a8c0', '#1a1418'] },
    goblin: { n: ['гоблин', 'гоблинша', 'гоблины'], adj: 'гоблинский', h: 0.72, b: 0.95, life: 0.7,
      skin: ['#8aa04a', '#9aae58', '#7a9440'], hair: ['#1a1410', '#3a2a1a', '#5a4a2a'] },
    lizard: { n: ['ящеролюд', 'ящеролюдка', 'ящеролюды'], adj: 'ящеролюдский', h: 1.04, b: 1.08, life: 1.2,
      skin: ['#5e8a6a', '#4e7a8a', '#7a8a4a'], hair: ['#3a5a3a'] },
    catfolk: { n: ['кошколюд', 'кошколюдка', 'кошколюды'], adj: 'кошачий', h: 0.96, b: 0.92, life: 1,
      skin: ['#d8a878', '#c89058', '#e8c8a8', '#8a8a8a'], hair: ['#c87a3a', '#2a2420', '#e8e0d0', '#8a6a4a'] },
    tiefling: { n: ['тифлинг', 'тифлинга', 'тифлинги'], adj: 'тифлингский', h: 1.0, b: 0.95, life: 1.3,
      skin: ['#b04848', '#9a3a5a', '#c06050', '#7a4a8a'], hair: ['#1a1018', '#3a1a2a', '#e8d0f0'] },
    giant: { n: ['полувеликан', 'полувеликанша', 'полувеликаны'], adj: 'великаний', h: 1.28, b: 1.3, life: 1.5,
      skin: ['#c89c80', '#b88a6a', '#a87a5a'], hair: ['#6a4a2a', '#8a6a3a', '#3a2a1a'] },
    succubus: { n: ['инкуб', 'суккуба', 'суккубы'], adj: 'суккубий', h: 1.02, b: 0.9, life: 5, demon: 1,
      skin: ['#d890b0', '#c87898', '#b05a7a', '#e0a8c0'], hair: ['#2a1028', '#5a1030', '#1a1018', '#8a2040', '#e8d0f0'] },
  };
  R.raceName = (race, sex) => { const r = RACES[race] || RACES.human; return sex === 'f' ? r.n[1] : r.n[0]; };
  R.racePl = (race) => (RACES[race] || RACES.human).n[2];

  // имена народов
  const SYL = {
    elf: { a: ['Аэ', 'Ла', 'Ри', 'Эль', 'Та', 'Ан', 'Ли', 'Си', 'На', 'Фи', 'Ил', 'Ме', 'Ти', 'Эа'], b: ['рин', 'ланд', 'риэль', 'тар', 'дир', 'ниэль', 'вен', 'рион', 'лас', 'фин', 'тиэль', 'мар'], fe: ['иэль', 'венн', 'лэ', 'ниа', 'риэн', 'ссэ', 'ира'], sur: ['Лунный Лист', 'Серебряная Ветвь', 'Тихий Ручей', 'Звёздная Роса', 'Ясень', 'Белый Олень', 'Ночной Ветер'] },
    dwarf: { a: ['Бор', 'Дур', 'Тра', 'Гим', 'Бал', 'Тор', 'Гро', 'Дво', 'Фар', 'Мор', 'Нор', 'Ку'], b: ['ин', 'гар', 'ак', 'ли', 'дин', 'грим', 'бур', 'рек', 'вин', 'дуг'], fe: ['да', 'ра', 'ги', 'на', 'дис', 'рун'], sur: ['Каменный Кулак', 'Медная Борода', 'Глубокий Забой', 'Тяжёлый Молот', 'Железнобок', 'Горный Пласт', 'Угольщик'] },
    orc: { a: ['Гро', 'Ур', 'Тра', 'Зуг', 'Мог', 'Гар', 'Шак', 'Друм', 'Кра', 'Бол', 'Руг'], b: ['маш', 'гак', 'зуг', 'рах', 'нак', 'гул', 'тар', 'кош', 'бур'], fe: ['ша', 'ра', 'гха', 'на', 'зи'], sur: ['из Рода Клыка', 'Сломанный Зуб', 'Кровавая Рука', 'Сын Пепла', 'Чёрный Кабан', 'Дробящий Череп'] },
    halfling: { a: ['Пип', 'Бил', 'Ро', 'Мер', 'Тод', 'Фро', 'Сэм', 'Пер', 'Лот', 'Мил'], b: ['пин', 'бо', 'си', 'ри', 'ди', 'ко', 'вин', 'то'], fe: ['ли', 'са', 'ра', 'нна', 'ти'], sur: ['Холмогор', 'Медовик', 'Пышкин', 'Боярышник', 'Норкин', 'Кругляш', 'Тыквин'] },
    darkelf: { a: ['Дрис', 'Вел', 'Ни', 'Зар', 'Ил', 'Маль', 'Рис', 'Шар', 'Ви', 'Квен'], b: ['зар', 'дор', 'рин', 'лит', 'тар', 'вин', 'нис', 'мор'], fe: ['тра', 'нис', 'рейн', 'ссэ', 'вия'], sur: ['из Дома Пепла', 'Тень Глубин', 'Холодная Звезда', 'из Дома Вдов', 'Безлунный', 'Серебряная Нить'] },
    goblin: { a: ['Гриз', 'Сник', 'Ног', 'Зип', 'Крак', 'Виг', 'Бук', 'Риз', 'Тук'], b: ['гл', 'ик', 'ок', 'зик', 'пс', 'ник', 'бо'], fe: ['ля', 'ка', 'зи', 'ша'], sur: ['Ржавый Гвоздь', 'Кривой Нос', 'Медяшка', 'Из-под Моста', 'Хапок', 'Шустрик'] },
    lizard: { a: ['Сс', 'Ксс', 'Тесс', 'Шиш', 'Зарр', 'Исс', 'Хасс'], b: ['ар', 'ик', 'ахт', 'ирр', 'ас', 'ош'], fe: ['сса', 'шша', 'ирра', 'ара'], sur: ['Тёплый Камень', 'Чешуя Реки', 'Ждущий в Тине', 'Зелёный Глаз', 'Сброшенная Кожа'] },
    catfolk: { a: ['Мур', 'Ми', 'Пур', 'Ша', 'Кис', 'Ра', 'Ну', 'Фе'], b: ['ра', 'рр', 'ш', 'лин', 'ка', 'тон', 'рис'], fe: ['ри', 'ша', 'ния', 'уша', 'ка'], sur: ['Мягкая Лапа', 'Рыжий Хвост', 'Ночной Глаз', 'Шёпот Травы', 'Тёплое Солнце', 'Сметанник'] },
    tiefling: { a: ['Мал', 'Аст', 'Зер', 'Ка', 'Нем', 'Мор', 'Вел', 'Ир'], b: ['ак', 'ор', 'ет', 'ис', 'ум', 'аэль'], fe: ['ия', 'ета', 'ис', 'ора'], sur: ['Отречённый', 'Пепельная Кровь', 'Без Отца', 'Надежда', 'Терпение', 'Последний'] },
    giant: { a: ['Гру', 'Бор', 'Хал', 'Тур', 'Ог', 'Сва', 'Ром'], b: ['мбо', 'данн', 'ваг', 'рик', 'гул', 'стан'], fe: ['да', 'на', 'вейг', 'ра'], sur: ['Валун', 'Три Медведя', 'Горный Ручей', 'Широкая Спина', 'Тихий Гром', 'Сосна'] },
    succubus: { a: ['Ли', 'Ми', 'Се', 'Ва', 'Ла', 'Ни', 'Аз', 'Ке', 'Иш', 'Зе', 'Ре'], b: ['лит', 'ра', 'рена', 'лис', 'ссара', 'вия', 'мира', 'тель', 'риса'], fe: ['а', 'ея', 'иса', 'ель'], sur: ['Шёлковая', 'Алые Уста', 'Ночная Сладость', 'Бархатный Шёпот', 'Тёмный Мёд', 'Золотой Коготь', 'Без Долгов'] },
  };
  function raceName(rng, race, sex) {
    const s = SYL[race];
    if (!s) return null;
    let nm = rng.pick(s.a) + rng.pick(s.b);
    if (sex === 'f' && race !== 'succubus') nm = rng.pick(s.a) + (rng.chance(0.5) ? rng.pick(s.b).slice(0, 2) : '') + rng.pick(s.fe);
    if (race === 'succubus' && sex === 'm') nm = rng.pick(['Аз', 'Ве', 'Ма', 'Ка', 'Бел']) + rng.pick(['рит', 'зор', 'миэль', 'фар', 'рон', 'тис']);
    return { first: nm, sur: rng.pick(s.sur) };
  }

  // ---------- вера и обычаи ----------
  const CUSTOMS = R.CUSTOMS = [
    { id: 'guest', n: 'гостевое право', d: 'гостя накормят и не тронут под крышей — даже врага', op: 4 },
    { id: 'tithe', n: 'десятина', d: 'с каждой покупки десятая часть идёт храму', price: 1.1 },
    { id: 'fair', n: 'ярмарочный обычай', d: 'торгуются до хрипоты, зато отдают дешевле', price: 0.92 },
    { id: 'duel', n: 'суд поединком', d: 'спор решают сталью на площади, а не у судьи' },
    { id: 'silence', n: 'обет молчания по вечерам', d: 'после заката говорят шёпотом и не поют' },
    { id: 'ancestors', n: 'почитание предков', d: 'у каждого дома — камень с именами умерших; их кормят хлебом' },
    { id: 'bread', n: 'хлеб и соль', d: 'путника встречают хлебом; отказаться — обида', op: 3 },
    { id: 'masks', n: 'маски в праздник', d: 'в ночь Последнего Колокола все в масках — и правят шуты' },
    { id: 'blood', n: 'кровная месть', d: 'за убитого мстит род — до седьмого колена' },
    { id: 'beards', n: 'клятва бородой', d: 'клянутся бородой (или косой); нарушить клятву — позор на весь род' },
    { id: 'iron', n: 'железный запрет', d: 'в храм не входят с железом; оружие оставляют у порога' },
    { id: 'tattoo', n: 'знаки рода', d: 'на руках — знаки рода; по ним узнают своих' },
    { id: 'hunt', n: 'весенняя охота', d: 'весной всем селом идут на зверя; добычу делят поровну' },
    { id: 'songs', n: 'песни за столом', d: 'за ужином поют по кругу; кто не поёт — моет посуду' },
    { id: 'debts', n: 'долг свят', d: 'обещание здесь — цепь; нарушившего изгоняют', price: 1.05 },
    { id: 'stars', n: 'звёздный счёт', d: 'дела начинают только по звёздам; без гадания не сеют' },
    { id: 'water', n: 'почитание воды', d: 'в реку не плюют и не бросают сор; у колодцев молятся' },
    { id: 'gifts', n: 'обмен дарами', d: 'дар обязывает ответить даром; щедрого любят', op: 2 },
  ];
  const FEASTS = ['Ночь Последнего Колокола', 'Праздник Первого Хлеба', 'Пир Короткого Дня', 'Ночь Пепельных Свечей', 'День Возвращённых Долгов', 'Праздник Лунного Пса', 'Ночь Открытых Дверей', 'Каменный Сход', 'День Тихой Воды', 'Праздник Рогатой Луны'];
  const LIFE = {
    plains: ['пашут и сеют; живут хлебом и ярмарками', 'разводят коней и пасут скот на вольных лугах'],
    forest: ['живут лесом: охота, бортничество, смола и уголь', 'рубят лес и сплавляют его по рекам'],
    ancient: ['живут среди древних деревьев и не рубят живого', 'собирают травы и берегут старые рощи'],
    mountain: ['роют руду и куют; хлеб покупают у соседей', 'пасут коз на кручах и стерегут перевалы'],
    living: ['роют руду и куют; хлеб покупают у соседей'],
    swamp: ['живут на сваях; ловят рыбу и гонят болотную смолу', 'собирают клюкву и мох, плетут сети'],
    desert: ['водят караваны и берегут колодцы пуще золота', 'живут у оазисов; вода у них дороже крови'],
    tundra: ['пасут оленей и бьют зверя на мех', 'ловят рыбу подо льдом и коптят её на зиму'],
    ice: ['бьют морского зверя и живут в снежных домах'],
    coast: ['живут морем: рыба, соль и торговля с кораблями', 'строят лодки и ходят далеко за рыбой'],
    volcanic: ['добывают серу и обсидиан на склонах огненных гор'],
    ash: ['копаются в руинах и меняют найденное на еду'],
    nightland: ['живут ночью и спят днём; торгуют тем, что светится'],
    sky: ['живут на облаках и пасут ветра'],
  };
  const LAWS = ['за кражу — рука', 'за кражу — штраф втрое', 'за убийство — изгнание всего рода', 'за убийство — виселица', 'за ложь на суде — клеймо', 'долг взыскивают трудом', 'чужак не может владеть землёй', 'суд вершит старейшина', 'суд вершит жрец', 'суд вершит господин'];
  const TABOO = ['не едят конину', 'не свистят в доме', 'не называют мёртвых по имени', 'не рубят рябину', 'не ступают на порог', 'не пьют до заката', 'не смотрят на луну через левое плечо', 'не дарят ножей', 'не стригут волосы зимой', 'не едят рыбу в пост'];
  const DRESS = { human: ['#8a6a4a', '#6a5a4a', '#5a6a7a', '#7a4a3a'], elf: ['#4a7a5a', '#6a8a6a', '#7a8aa0', '#d0c8a0'], dwarf: ['#7a3a2a', '#5a4a3a', '#8a6a3a', '#4a4a5a'], orc: ['#4a3a2a', '#6a2a1a', '#3a3a3a', '#5a4a30'], halfling: ['#7a8a4a', '#a07040', '#c0a060', '#6a7a3a'], succubus: ['#6a1a3a', '#3a1030', '#8a2050', '#2a1a2a'], darkelf: ['#2a2a3a', '#4a3a5a', '#1a1a2a', '#5a5a6a'], goblin: ['#5a4a2a', '#4a3a1a', '#6a5a3a'], lizard: ['#3a5a4a', '#5a4a2a', '#2a4a3a'], catfolk: ['#8a5a3a', '#c09060', '#6a7a8a'], tiefling: ['#3a1a2a', '#5a2a3a', '#2a1a1a'], giant: ['#6a5a3a', '#5a4a3a', '#7a6a4a'] };

  const RANK = { duchy: ['Герцогство', 'герцог', 'герцогиня'], county: ['Графство', 'граф', 'графиня'], barony: ['Баронство', 'барон', 'баронесса'] };
  R.RANK = RANK;
  R.lordWord = (rank, sex) => (RANK[rank] || RANK.barony)[sex === 'f' ? 2 : 1];

  // народ земли — по краю и случаю
  function raceFor(rng, biome) {
    const W = {
      forest: [['elf', 4], ['human', 3], ['halfling', 1], ['catfolk', 1]], ancient: [['elf', 6], ['darkelf', 2], ['human', 1]],
      mountain: [['dwarf', 6], ['human', 2], ['giant', 1], ['orc', 1]], living: [['dwarf', 4], ['orc', 2], ['darkelf', 2]],
      desert: [['orc', 3], ['human', 3], ['catfolk', 3]], ash: [['orc', 4], ['tiefling', 3], ['goblin', 2]], volcanic: [['orc', 3], ['dwarf', 2], ['tiefling', 2]],
      tundra: [['orc', 2], ['human', 4], ['giant', 1], ['dwarf', 1]], ice: [['human', 3], ['dwarf', 2], ['giant', 1]], swamp: [['lizard', 3], ['goblin', 2], ['human', 2]],
      plains: [['human', 5], ['halfling', 3], ['elf', 1], ['catfolk', 1]], coast: [['human', 5], ['lizard', 1], ['halfling', 1], ['elf', 1]],
      nightland: [['darkelf', 5], ['tiefling', 2]],
    }[biome] || [['human', 5], ['halfling', 1]];
    return rng.weighted(W);
  }
  function culture(rng, W, race, seatRegion) {
    const cs = rng.sample(CUSTOMS, 3);
    const life = LIFE[seatRegion.biome] || LIFE.plains;
    const others = ['human', 'elf', 'dwarf', 'orc', 'halfling', 'darkelf', 'goblin', 'lizard', 'catfolk', 'tiefling', 'giant'].filter((r) => r !== race);
    return {
      race, minor: rng.sample(others, 2), mix: rng.range(0.08, 0.3),
      faith: rng.pick(D.gods).id, customs: cs.map((c) => c.id), feast: rng.pick(FEASTS), life: rng.pick(life),
      law: rng.pick(LAWS), taboo: rng.pick(TABOO), dress: DRESS[race] || DRESS.human,
    };
  }

  // ---------- деление королевства ----------
  const dist = (a, b) => Math.abs(a.rx - b.rx) + Math.abs(a.ry - b.ry);
  // k семян — самые крупные поселения, разнесённые подальше; остальные — к ближайшему семени
  function cluster(rng, list, k, first) {
    const BIG = { capital: 5, town: 4, tree: 3, village: 2, hamlet: 1, farm: 0 };
    const sorted = list.slice().sort((a, b) => (BIG[b.type] || 0) - (BIG[a.type] || 0) || a.id - b.id);
    const seeds = first ? [first] : [sorted[0]];
    while (seeds.length < k) {
      let best = null, bd = -1;
      for (const s of sorted) { if (seeds.includes(s)) continue; const d = Math.min(...seeds.map((q) => dist(q, s))) + (BIG[s.type] || 0) * 0.8; if (d > bd) { bd = d; best = s; } }
      if (!best) break;
      seeds.push(best);
    }
    const groups = seeds.map((s) => ({ seat: s, list: [] }));
    for (const s of list) { let g = groups[0], bd = 1e9; for (const q of groups) { const d = dist(q.seat, s); if (d < bd) { bd = d; g = q; } } g.list.push(s); }
    return groups.filter((g) => g.list.length);
  }
  function lordOf(W, rng, s, prefer) {
    const ad = s.npcs.map((id) => W.npcs[id]).filter((n) => n.age >= 22 && !n.lordOf);
    for (const j of prefer) { const n = ad.find((q) => q.job === j); if (n) return n; }
    return ad.sort((a, b) => b.age - a.age)[0] || null;
  }

  R.gen = function (W) {
    const rng = U.rng(W.seed, 'realms');
    W.titles = [];
    W.cultures = [];
    const add = (o) => { o.id = W.titles.length; W.titles.push(o); return o; };
    const name = (rank, s) => RANK[rank][0] + ' ' + U.gen(s.nom.replace(/^(Древоград|Глубинный) /, ''));
    const real = (s) => s.type !== 'sea' && s.type !== 'vanish';

    // города суккубов: два-три поселения подальше от начала пути, вне королевств
    const st0 = W.regions[W.start];
    const cand = W.settlements.filter((s) => real(s) && ['town', 'village'].includes(s.type) && s.region !== W.start && Math.abs(s.rx - st0.x) + Math.abs(s.ry - st0.y) >= 6);
    rng.shuffle(cand);
    const succ = [];
    const SN = [['Шёлковый Предел', 'Шёлкового Предела', 'в Шёлковом Пределе'], ['Пурпурная Заводь', 'Пурпурной Заводи', 'в Пурпурной Заводи'], ['Сладкая Тень', 'Сладкой Тени', 'в Сладкой Тени'], ['Бархатный Двор', 'Бархатного Двора', 'в Бархатном Дворе']];
    for (const s of cand) {
      if (succ.length >= 3) break;
      if (succ.some((q) => dist(q, s) < 7)) continue;
      const nm = SN[succ.length];
      s.succ = 1; s.nom = nm[0]; s.gen = nm[1]; s.loc = nm[2];
      s.b.tavern = 1; s.b.market = 1; s.b.temple = 1; s.b.alch = 1;
      s.fac = -1; W.regions[s.region].fac = -1;
      succ.push(s);
    }
    const succCult = { race: 'succubus', minor: ['human', 'elf'], mix: 0.18, faith: 'faceless', customs: ['debts', 'gifts', 'masks'], feast: 'Ночь Открытых Дверей', life: 'живут торгом и удовольствиями; продают всё — и сны, и тайны, и обещания', law: 'кто не платит долг — платит собой: годами службы', taboo: 'не говорят «бесплатно»', dress: DRESS.succubus, succ: 1 };
    succCult.id = W.cultures.length; W.cultures.push(succCult);

    // королевства → герцогства → графства → баронства
    for (const f of W.factions) {
      const list = W.settlements.filter((s) => s.fac === f.id && real(s));
      if (!list.length) continue;
      const cap = W.settlements[f.capital];
      const nd = Math.max(1, Math.min(5, Math.round(list.length / 11)));
      for (const dg of cluster(rng, list, nd, cap)) {
        const seatR = W.regions[dg.seat.region];
        const cu = culture(rng, W, dg.seat === cap && rng.chance(0.7) ? 'human' : raceFor(rng, seatR.biome), seatR);
        cu.id = W.cultures.length; W.cultures.push(cu);
        const duke = lordOf(W, rng, dg.seat, ['ruler', 'noble', 'elder']);
        const du = add({ rank: 'duchy', name: name('duchy', dg.seat), seat: dg.seat.id, parent: null, realm: f.id, lord: duke ? duke.id : -1, cult: cu.id });
        if (duke) { duke.lordOf = du.id; }
        const nc = Math.max(1, Math.round(dg.list.length / 4));
        for (const cg of cluster(rng, dg.list, nc, dg.seat)) {
          const count = lordOf(W, rng, cg.seat, ['noble', 'elder', 'veteran', 'merchant']);
          const co = add({ rank: 'county', name: name('county', cg.seat), seat: cg.seat.id, parent: du.id, realm: f.id, lord: count ? count.id : -1, cult: cu.id });
          if (count) count.lordOf = co.id;
          for (const s of cg.list) {
            const baron = lordOf(W, rng, s, ['noble', 'elder', 'veteran', 'innkeeper', 'smith', 'farmer']);
            const ba = add({ rank: 'barony', name: name('barony', s), seat: s.id, parent: co.id, realm: f.id, lord: baron ? baron.id : -1, cult: cu.id });
            if (baron) baron.lordOf = ba.id;
            s.title = ba.id; s.cult = cu.id;
          }
        }
      }
    }
    // вольные земли: без короля — сами себе бароны, по графствам
    const free = W.settlements.filter((s) => real(s) && s.title == null && !s.succ);
    if (free.length) {
      for (const cg of cluster(rng, free, Math.max(1, Math.round(free.length / 5)))) {
        const seatR = W.regions[cg.seat.region];
        const cu = culture(rng, W, raceFor(rng, seatR.biome), seatR);
        cu.id = W.cultures.length; W.cultures.push(cu);
        const count = lordOf(W, rng, cg.seat, ['noble', 'elder', 'veteran']);
        const co = add({ rank: 'county', name: 'Вольное графство ' + U.gen(cg.seat.nom.replace(/^(Древоград|Глубинный) /, '')), seat: cg.seat.id, parent: null, realm: -1, lord: count ? count.id : -1, cult: cu.id, free: 1 });
        if (count) count.lordOf = co.id;
        for (const s of cg.list) {
          const baron = lordOf(W, rng, s, ['elder', 'noble', 'veteran', 'innkeeper', 'smith', 'farmer']);
          const ba = add({ rank: 'barony', name: name('barony', s), seat: s.id, parent: co.id, realm: -1, lord: baron ? baron.id : -1, cult: cu.id });
          if (baron) baron.lordOf = ba.id;
          s.title = ba.id; s.cult = cu.id;
        }
      }
    }
    for (const s of succ) {
      const mat = s.npcs.map((id) => W.npcs[id]).filter((n) => n.sex === 'f' && n.age >= 30).sort((a, b) => b.age - a.age)[0];
      const t = add({ rank: 'barony', name: 'Вольный город ' + s.nom, seat: s.id, parent: null, realm: -1, lord: mat ? mat.id : -1, cult: succCult.id, succ: 1 });
      if (mat) { mat.lordOf = t.id; mat.matron = 1; }
      s.title = t.id; s.cult = succCult.id;
    }
    for (const g of W.regions) { const s = g.settlement >= 0 ? W.settlements[g.settlement] : null; g.title = s && s.title != null ? s.title : -1; }
    // свободные земли без поселения — к ближайшему баронству
    for (const g of W.regions) {
      if (g.title >= 0 || g.biome === 'ocean') continue;
      let best = -1, bd = 4;
      for (const s of W.settlements) { if (s.title == null) continue; const d = Math.abs(s.rx - g.x) + Math.abs(s.ry - g.y); if (d < bd) { bd = d; best = s.title; } }
      g.title = best;
    }

    // ---------- народ каждого дома ----------
    const byHouse = new Map();
    for (const n of W.npcs) {
      const s = n.sett >= 0 ? W.settlements[n.sett] : null;
      const key = s ? s.id + ':' + n.house : 'r' + n.id;
      if (!byHouse.has(key)) byHouse.set(key, []);
      byHouse.get(key).push(n);
    }
    for (const [key, ns] of byHouse) {
      const n0 = ns[0];
      const s = n0.sett >= 0 ? W.settlements[n0.sett] : null;
      let cu = s && s.cult != null ? W.cultures[s.cult] : null;
      if (!cu) { const g = W.regions[n0.region != null ? n0.region : 0]; const t = g && g.title >= 0 ? W.titles[g.title] : null; cu = t ? W.cultures[t.cult] : null; }
      let race = 'human';
      if (s && s.type === 'sea') race = 'human';
      else if (cu && cu.succ) race = 'human';
      else if (cu) race = rng.chance(cu.mix) ? rng.pick(cu.minor) : cu.race;
      for (const n of ns) setRace(rng, n, race, cu);
      // супруги: первые двое взрослых в доме
      if (ns.length >= 2 && ns[0].sex === 'm' && ns[1].sex === 'f' && ns[0].age >= 18 && ns[1].age >= 18 && Math.abs(ns[0].age - ns[1].age) <= 10) { ns[0].mate = ns[1].id; ns[1].mate = ns[0].id; }
    }
    // в городах суккубов: суккубы и инкубы, при них — изящные юноши и люди-слуги
    for (const s of succ) for (const id of s.npcs) {
      const n = W.npcs[id];
      if (n.age < 18) continue;
      if (n.sex === 'f' && rng.chance(0.85)) setRace(rng, n, 'succubus', succCult);
      else if (n.sex === 'm' && rng.chance(0.35)) setRace(rng, n, 'succubus', succCult);
      else if (n.sex === 'm' && n.age >= 17 && n.age <= 34 && rng.chance(0.6)) n.fb = 1;
      if (n.race === 'succubus') { if (!n.traits.includes('liar') && rng.chance(0.6)) n.traits[0] = 'liar'; if (rng.chance(0.5)) n.traits[1] = 'greedy'; }
    }
    // изящные юноши — и в обычных землях
    for (const n of W.npcs) if (n.sex === 'm' && !n.fb && n.age >= 17 && n.age <= 32 && rng.chance(0.05) && !['guard', 'veteran', 'ruler', 'smith', 'miner'].includes(n.job)) n.fb = 1;
    for (const n of W.npcs) if (n.fb) n.look = fbLook(rng, n);
    // склонности сердца
    for (const n of W.npcs) n.orient = rng.weighted([['any', 55], ['opp', 30], ['same', 15]]);
    return W;
  };
  function setRace(rng, n, race, cu) {
    n.race = race;
    if (race !== 'human') {
      const nm = raceName(rng, race, n.sex);
      if (nm) { n.first = nm.first; n.sur = nm.sur; }
    }
    n.look = raceLook(rng, n);
    if (cu && cu.dress) n.col = rng.chance(0.6) ? rng.pick(cu.dress) : n.col;
    n.skin = rng.int(0, 9);
  }
  function who(n) {
    const r = n.race || 'human', a = n.age, f = n.sex === 'f';
    if (r === 'human') return null;
    const W = {
      elf: a < 14 ? (f ? 'эльфийская девочка' : 'эльфийский мальчик') : a < 60 ? (f ? 'юная эльфийка' : 'юный эльф') : a < 200 ? (f ? 'эльфийка' : 'эльф') : (f ? 'древняя эльфийка' : 'древний эльф'),
      dwarf: a < 14 ? (f ? 'гномья девчушка' : 'гномий мальчуган') : a < 50 ? (f ? 'молодая гномка' : 'молодой гном') : a < 120 ? (f ? 'гномка' : 'гном') : (f ? 'седая гномка' : 'седобородый гном'),
      orc: a < 14 ? (f ? 'орчанка-подросток' : 'орчонок') : a < 30 ? (f ? 'молодая орчанка' : 'молодой орк') : a < 50 ? (f ? 'орчанка' : 'орк') : (f ? 'старая орчанка' : 'старый орк'),
      halfling: a < 14 ? (f ? 'полурослица-малышка' : 'полурослик-малыш') : a < 40 ? (f ? 'молодая полурослица' : 'молодой полурослик') : a < 75 ? (f ? 'полурослица' : 'полурослик') : (f ? 'старушка-полурослица' : 'старичок-полурослик'),
      darkelf: a < 14 ? (f ? 'девочка из тёмных эльфов' : 'мальчик из тёмных эльфов') : a < 60 ? (f ? 'юная тёмная эльфийка' : 'юный тёмный эльф') : (f ? 'тёмная эльфийка' : 'тёмный эльф'),
      goblin: a < 14 ? (f ? 'гоблинша-малявка' : 'гоблинёнок') : a < 30 ? (f ? 'молодая гоблинша' : 'молодой гоблин') : (f ? 'гоблинша' : 'гоблин'),
      lizard: a < 14 ? (f ? 'ящеролюдка-подросток' : 'ящеролюд-подросток') : (f ? 'ящеролюдка' : 'ящеролюд'),
      catfolk: a < 14 ? (f ? 'кошколюдка-котёнок' : 'кошколюд-котёнок') : a < 30 ? (f ? 'молодая кошколюдка' : 'молодой кошколюд') : (f ? 'кошколюдка' : 'кошколюд'),
      tiefling: a < 14 ? (f ? 'девочка-тифлинг' : 'мальчик-тифлинг') : (f ? 'тифлинга' : 'тифлинг'),
      giant: a < 14 ? (f ? 'девочка-полувеликанша' : 'мальчик-полувеликан') : (f ? 'полувеликанша' : 'полувеликан'),
      succubus: f ? 'суккуба' : 'инкуб',
    }[r];
    return W || null;
  }
  const RACE_LOOK = {
    elf: ['с острыми ушами', 'с тонкими пальцами', 'с глазами цвета листвы', 'с тихим голосом', 'с серебряной заколкой'],
    dwarf: ['с косами в бороде', 'с руками в мозолях', 'с тяжёлым поясом', 'пахнущий углём', 'с медными кольцами в косах'],
    orc: ['с клыками', 'со шрамами на руках', 'с серьгой в ухе', 'с тяжёлым взглядом', 'с костяными бусами'],
    halfling: ['босой', 'с кудрявой головой', 'с трубкой за ухом', 'с пирожком в кармане', 'с хитрой улыбкой'],
    darkelf: ['с белыми волосами', 'с глазами без зрачков', 'с кожей цвета пепла', 'с кинжалом у пояса', 'с холодным взглядом'],
    goblin: ['с огромными ушами', 'с бегающими глазками', 'с карманами, полными хлама', 'с острыми зубками', 'с хитрой ухмылкой'],
    lizard: ['в чешуе', 'с немигающим взглядом', 'с длинным хвостом', 'с гребнем на голове', 'с раздвоенным языком'],
    catfolk: ['с кошачьими ушами', 'с пушистым хвостом', 'с глазами-щёлками', 'мурлычущий', 'с мягкой походкой'],
    tiefling: ['с рожками', 'с хвостом с кисточкой', 'с золотыми глазами', 'с кожей цвета углей', 'с печальной улыбкой'],
    giant: ['на две головы выше всех', 'с руками как брёвна', 'пригибающийся в дверях', 'с добрыми глазами', 'с громким смехом'],
    succubus: ['с рожками и хвостом', 'с медовым голосом', 'с глазами, что смеются', 'в шёлке и золоте', 'с улыбкой, от которой хочется отдать кошель'],
  };
  function raceLook(rng, n) {
    const w = who(n);
    if (!w) return n.look;
    const rest = n.look.split(', ').slice(1).join(', ');
    return w + ', ' + (rng.chance(0.6) ? rng.pick(RACE_LOOK[n.race]) : rest || rng.pick(RACE_LOOK[n.race]));
  }
  function fbLook(rng, n) {
    const w = n.race === 'succubus' ? 'изящный инкуб' : n.race && n.race !== 'human' ? 'изящный ' + R.raceName(n.race, 'm') : 'изящный юноша';
    return w + ', ' + rng.pick(['с подведёнными глазами', 'с длинными ресницами', 'в юбке с вышивкой', 'с лентой в волосах', 'с серёжкой-полумесяцем', 'с мягкой улыбкой', 'в чулках и короткой тунике']);
  }

  // ---------- что знает игра ----------
  R.titleOf = (W, sid) => { const s = W.settlements[sid]; return s && s.title != null ? W.titles[s.title] : null; };
  R.cultOf = (W, sid) => { const s = W.settlements[sid]; return s && s.cult != null ? W.cultures[s.cult] : null; };
  R.chain = (W, t) => { const out = []; while (t) { out.push(t); t = t.parent != null ? W.titles[t.parent] : null; } return out; };
  R.custom = (id) => CUSTOMS.find((c) => c.id === id);

  // вплести в создание мира
  const gen0 = World.generate;
  World.generate = function (seed) { const W = gen0.call(this, seed); R.gen(W); return W; };
})(window.EOF);
