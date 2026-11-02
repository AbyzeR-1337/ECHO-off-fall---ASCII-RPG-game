'use strict';
// Башни магов. Стоят в городах и столицах, в части сёл, а иногда — одиноко посреди дикой земли.
// В башне: лавка чародея (посохи, жезлы, осколки маны, зелья духа, книги), библиотека
// (выучить заклинание за плату — если хватит Разума), мастерская чар:
//  • усилить заклинание — до пятой ступени: сильнее, дальше, дешевле, быстрее;
//  • создать своё — выбрать стихию (огонь, лёд, гроза, тайное, кислота, свет), форму
//    (стрела, вспышка, цепь, волна) и свойство (сильное, дальнее, лёгкое, быстрое, широкое).
// Созданное заклинание работает как любое другое: из списка умений (K) или из посоха (цифры).
(function (E) {
  const U = E.U, D = E.D, T = E.T, TL = E.TL, G = E.G, Gm = E.Gm, Dlg = E.Dlg, UI = E.UI, Items = E.Items, MGen = E.MapGen;
  const MG = E.Magic = {};
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------- ступени заклинаний ----------
  const lvOf = (id) => (G.P && G.P.spl && G.P.spl[id]) || 0;
  MG.lv = lvOf;
  MG.cost = (id) => { const a = D.ab[id]; return a ? Math.max(0, Math.round(a.cost * (1 - 0.08 * lvOf(id)))) : 0; };
  MG.cd = (id) => { const a = D.ab[id]; return a ? Math.max(0, a.cd - Math.floor(lvOf(id) / 2)) : 0; };
  const ua0 = E.Combat.useAbility;
  E.Combat.useAbility = function (aid, dir, isPrayer) {
    if (isPrayer) return ua0.apply(this, arguments);
    const a = D.ab[aid], lv = lvOf(aid);
    if (!a || !lv) return ua0.apply(this, arguments);
    const save = { p: a.p, r: a.r, cnt: a.cnt };
    a.p = (a.p || 1) * (1 + 0.2 * lv);
    if (a.r) a.r += Math.floor(lv / 2);
    if (a.cnt) a.cnt += Math.floor(lv / 2);
    try { return ua0.apply(this, arguments); } finally { Object.assign(a, save); }
  };
  const isSpell = (a) => a && (a.stat === 'int' || a.stat === 'fai') && !['travel', 'transmute', 'sate'].includes(a.k);

  // ---------- свои заклинания ----------
  const ELS = [
    { id: 'fire', n: 'Огненная', d: 'жжёт и поджигает', c: '#ff9a50' }, { id: 'ice', n: 'Ледяная', d: 'морозит и сковывает', c: '#a0d8ff', x: { slow: 3 } },
    { id: 'storm', n: 'Грозовая', d: 'бьёт молнией', c: '#e0e0ff' }, { id: 'arcane', n: 'Тайная', d: 'чистая сила духа', c: '#c8a0ff' },
    { id: 'acid', n: 'Кислотная', d: 'разъедает броню', c: '#a0e060' }, { id: 'holy', n: 'Светлая', d: 'жжёт нечисть', c: '#fff0a0' },
  ];
  const FORMS = [
    { id: 'bolt', n: 'стрела', d: 'летит в того, на кого смотришь', k: 'bolt', o: { p: 1.25, r: 10, cost: 3, cd: 1 } },
    { id: 'burst', n: 'вспышка', d: 'взрывается там, куда попадёт', k: 'blast', o: { p: 1.0, r: 2, range: 8, cost: 6, cd: 3 } },
    { id: 'chain', n: 'цепь', d: 'перескакивает с врага на врага', k: 'chain', o: { p: 0.9, r: 8, cnt: 3, cost: 6, cd: 3 } },
    { id: 'wave', n: 'волна', d: 'расходится кругом от тебя', k: 'blast', o: { p: 1.1, r: 2.5, self: 1, cost: 7, cd: 4 } },
  ];
  const MODS = [
    { id: 'none', n: '', t: 'без свойства', f: () => {} },
    { id: 'strong', n: 'Сильная', t: 'сильное (×1.4, дороже)', f: (o) => { o.p *= 1.4; o.cost = Math.ceil(o.cost * 1.5); } },
    { id: 'far', n: 'Дальняя', t: 'дальнее (+5 клеток)', f: (o) => { o.r = (o.r || 2) + (o.self ? 1 : 5); if (o.range) o.range += 5; } },
    { id: 'light', n: 'Лёгкая', t: 'лёгкое (дешевле, чуть слабее)', f: (o) => { o.cost = Math.max(1, Math.floor(o.cost * 0.6)); o.p *= 0.85; } },
    { id: 'quick', n: 'Быстрая', t: 'быстрое (короче ожидание)', f: (o) => { o.cd = Math.max(0, o.cd - 2); } },
    { id: 'wide', n: 'Широкая', t: 'широкое (больше целей и шире взрыв)', f: (o) => { if (o.cnt) o.cnt += 2; else o.r = (o.r || 2) + 1; } },
  ];
  MG.ELS = ELS; MG.FORMS = FORMS; MG.MODS = MODS;
  function register(def) {
    const el = ELS.find((e) => e.id === def.el) || ELS[0], fm = FORMS.find((f) => f.id === def.form) || FORMS[0], md = MODS.find((m) => m.id === def.mod) || MODS[0];
    const o = Object.assign({}, fm.o, { el: el.id, stat: 'int' });
    if (el.x) o.x = Object.assign({}, el.x);
    md.f(o);
    const nm = (md.n ? md.n + ' ' + el.n.toLowerCase() : el.n) + ' ' + fm.n;
    o.d = U.cap(fm.d) + '; ' + el.d + '. Создано своими руками.';
    D.mkAb(def.id, nm, fm.k, o);
    return D.ab[def.id];
  }
  MG.price = (mod) => 140 + (mod && mod !== 'none' ? 60 : 0);
  MG.create = function (el, form, mod) {
    const P = G.P;
    P.mySpells = P.mySpells || [];
    const id = 'my_' + (P.mySpells.length + 1) + '_' + el + '_' + form;
    const def = { id, el, form, mod };
    const a = register(def);
    P.mySpells.push(def);
    if (!P.abil.includes(id)) P.abil.push(id);
    Gm.cnt('spells_made');
    return a;
  };
  // после загрузки и в новой жизни — вернуть свои заклинания в книгу
  MG.restore = function () { const P = G.P; if (P && P.mySpells) for (const d of P.mySpells) register(d); };

  // ---------- где стоят башни ----------
  const NAMES = ['Серебряной Совы', 'Семи Свечей', 'Тихого Пламени', 'Звёздной Пыли', 'Пепельного Ока', 'Лунной Росы', 'Последнего Слова', 'Белого Ворона', 'Тысячи Книг', 'Синего Огня', 'Шепчущих Ветров', 'Спящего Змея'];
  MG.towerName = (key) => 'Башня ' + NAMES[(U.hash(key, 991) >>> 0) % NAMES.length];
  function wants(m) {
    if (!m || m.kind !== 'over' || !m.region) return false;
    const g = m.region, h = (U.hash(G.W.seed, g.id, 4141) >>> 0) % 100;
    if (m.sett != null && m.sett >= 0) {
      const s = G.W.settlements[m.sett];
      if (!s || ['sea', 'vanish'].includes(s.type)) return false;
      return { capital: 100, town: 100, tree: 70, village: 35, hamlet: 12, farm: 8 }[s.type] > h;
    }
    return ['forest', 'ancient', 'mountain', 'plains', 'ash', 'swamp', 'tundra', 'desert', 'coast'].includes(g.biome) && h < 5;
  }
  function place(m) {
    const W = m.w, H = m.h, r = U.rng(G.W.seed, m.key, 'tower');
    const c = m.settCenter || { x: W >> 1, y: H >> 1 };
    const ok = (x, y) => { const t = TL[m.tiles[y * W + x]]; return t && t.walk && !t.indoor && !t.water && !t.link && !m.feat[y * W + x] && ![T.ROAD, T.BRIDGE, T.FIELD, T.DOOR, T.GATE].includes(m.tiles[y * W + x]); };
    for (let t = 0; t < 900; t++) {
      const a = r.next() * Math.PI * 2, d = (m.sett >= 0 ? 6 : 0) + r.next() * (m.sett >= 0 ? 22 : 16) * Math.min(1, 0.4 + t / 300);
      const x = Math.round(c.x + Math.cos(a) * d), y = Math.round(c.y + Math.sin(a) * d);
      if (x < 4 || y < 4 || x >= W - 4 || y >= H - 4) continue;
      // клетка под башню и кольцо вокруг — свободны; спереди — проход к двери
      let good = ok(x, y + 2);
      for (let dy = -1; dy <= 1 && good; dy++) for (let dx = -1; dx <= 1; dx++) if (!ok(x + dx, y + dy)) { good = false; break; }
      if (!good) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m.tiles[(y + dy) * W + x + dx] = T.STONEFLOOR;
      m.tiles[y * W + x] = T.MAGETOWER;
      m.feat[y * W + x] = { k: 'magetower', name: MG.towerName(m.key) };
      // тропинка к двери
      for (let k = 2; k <= 3; k++) if (ok(x, y + k)) m.tiles[(y + k) * W + x] = T.STONEFLOOR;
      return { x, y };
    }
    return null;
  }
  if (MGen && MGen.build) {
    const b0 = MGen.build;
    MGen.build = function (key) {
      const m = b0.apply(this, arguments);
      try { if (G.W && wants(m) && !(MGen.parseKey(key) || {}).v) m.tower = place(m); } catch (e) { console.warn('tower', e); }
      return m;
    };
  }

  // ---------- войти в башню ----------
  const isTower = (x, y) => { const m = G.map; return m && x >= 0 && y >= 0 && x < m.w && y < m.h && m.tiles[y * m.w + x] === T.MAGETOWER; };
  const pu0 = Gm.plainUse;
  Gm.plainUse = function (x, y) { return isTower(x, y) || pu0.apply(this, arguments); };
  const ia0 = Gm.interactAt;
  Gm.interactAt = function (x, y) {
    if (isTower(x, y)) { UI.magetower(x, y); return true; }
    return ia0.apply(this, arguments);
  };
  const fl0 = UI.focusLabel;
  UI.focusLabel = function () { const f = G.focus; if (f && f.kind === 'use' && isTower(f.x, f.y)) return 'Войти: ' + ((G.map.feat[f.y * G.map.w + f.x] || {}).name || 'башня магов'); return fl0.apply(this, arguments); };

  // лавка чародея
  Dlg.SHOP.magic = ['staff', 'staff_crystal', 'staff_bone', 'wand', 'mana_shard', 'mana_shard', 'mana_shard', 'p_spirit', 'p_spirit', 'book', 'blank_book', 'candle', 'star_jelly', 'owl_feather', 'mirror_shard', 'h_moonwort', 'h_mandrake'].filter((b) => D.items[b]);
  const keeper = (x, y) => ({ npc: null, ghostShop: 'mt' + G.map.key + ':' + x + ':' + y, n: 'Хранитель башни', kind: 'npc' });

  // заклинания, которым учат в библиотеке
  const learnable = () => Object.keys(D.ab).filter((id) => { const a = D.ab[id]; return isSpell(a) && !a.staff && !/^my_/.test(id) && !/^x_/.test(id) && !G.P.abil.includes(id) && ['bolt', 'blast', 'chain', 'heal', 'buff', 'shield', 'debuff', 'fear', 'blink', 'reveal', 'summon'].includes(a.k); });
  const priceLearn = (a) => 60 + (a.cost || 3) * 14 + (a.k === 'summon' || a.k === 'blink' ? 80 : 0);
  const needInt = (a) => 4 + Math.floor(((a.cost || 3) + (a.cd || 2)) / 3);

  UI.magetower = function (x, y) {
    const P = G.P, f = G.map.feat[y * G.map.w + x] || {}, kp = keeper(x, y);
    const intl = () => (P.st && P.st.int) || 5;
    const shards = () => Gm.count('mana_shard');
    UI.list({
      title: f.name || 'Башня магов', w: 70, name: 'tower',
      header: () => 'Внутри пахнет воском, пылью и грозой. По стенам — полки до самого верха, в середине — стол с кругом из рун. Хранитель башни кивает тебе. Кошелёк: ' + Gm.purseStr() + ' · осколков маны: ' + shards() + ' · Разум ' + intl() + '.',
      items: () => [
        { t: 'Лавка чародея', c: '#e8d8a0', f: () => { UI.trade(kp, 'magic'); return 'keep'; } },
        { t: 'Библиотека: выучить заклинание', c: '#c8b0ff', f: () => { UI.towerLearn(kp); return 'keep'; } },
        { t: 'Мастерская чар: усилить заклинание', c: '#a8d8ff', f: () => { UI.towerUpgrade(); return 'keep'; } },
        { t: 'Мастерская чар: создать своё заклинание', c: '#ffc8a0', f: () => { UI.towerCreate(); return 'keep'; } },
        { t: 'Уйти', f: () => null },
      ],
    });
  };
  UI.towerLearn = function (kp) {
    const P = G.P;
    UI.list({
      title: 'Библиотека', w: 80, name: 'tlearn',
      header: () => 'Книги заклинаний. Учит хранитель — за плату, и если хватит Разума (сейчас ' + ((P.st && P.st.int) || 5) + '). Кошелёк: ' + Gm.purseStr() + '.',
      items: () => learnable().map((id) => {
        const a = D.ab[id], pr = priceLearn(a), ni = needInt(a), can = P.gold >= pr && ((P.st && P.st.int) || 5) >= ni;
        return { t: a.n + ' — ' + a.d, r: Gm.money(pr, true) + ' · Р' + ni, disabled: !can, c: '#c8b0ff', f: () => {
          P.gold -= pr; Gm.learnAb(id); Gm.cnt('spells_learned');
          Gm.msg('Ты выучиваешь «' + a.n + '». Строки ещё долго горят перед глазами.', '#c8b0ff');
          return 'keep';
        } };
      }),
      empty: 'Ты уже знаешь всё, чему здесь учат.',
    });
  };
  UI.towerUpgrade = function () {
    const P = G.P;
    UI.list({
      title: 'Мастерская чар — усиление', w: 80, name: 'tupg',
      header: () => 'Каждая ступень: сила +20%, дух −8%, через ступень — дальше, больше целей и короче ожидание. Кошелёк: ' + Gm.purseStr() + ' · осколков маны: ' + Gm.count('mana_shard') + '.',
      items: () => P.abil.filter((id) => isSpell(D.ab[id])).concat(['sv_missile', 'sv_ember', 'sv_rime', 'sv_spark'].filter((id) => D.ab[id] && !P.abil.includes(id))).map((id) => {
        const a = D.ab[id], lv = lvOf(id), max = lv >= 5;
        const gold = 50 * (lv + 1) * (lv + 1), sh = lv;
        const can = !max && P.gold >= gold && Gm.count('mana_shard') >= sh;
        return { t: a.n + (lv ? '  [' + 'I II III IV V'.split(' ')[lv - 1] + ']' : ''), r: max ? 'предел' : Gm.money(gold, true) + (sh ? ' + ' + sh + ' оск.' : ''), disabled: !can, c: '#a8d8ff', f: () => {
          P.gold -= gold; if (sh) Gm.take('mana_shard', sh);
          P.spl = P.spl || {}; P.spl[id] = lv + 1;
          Gm.msg('«' + a.n + '» — теперь ступень ' + (lv + 1) + '. Руны на столе гаснут одна за другой.', '#a8d8ff');
          Gm.cnt('spells_upgraded');
          return 'keep';
        } };
      }),
      empty: 'Ты не знаешь ни одного заклинания. Начни с библиотеки.',
    });
  };
  // создать: стихия → форма → свойство
  UI.towerCreate = function () {
    const P = G.P;
    if (((P.st && P.st.int) || 5) < 6) { UI.popup('Мастерская чар', 'Хранитель качает головой: «Чтобы сплести своё заклинание, нужен Разум хотя бы 6. Почитай книги, приходи потом.»'); return; }
    UI.list({ title: 'Своё заклинание — стихия', w: 60, items: ELS.map((el) => ({ t: el.n.replace(/ая$/, 'ая') + ' — ' + el.d, c: el.c, f: () => { UI.pop(); pickForm(el); return 'keep'; } })) });
    function pickForm(el) {
      UI.list({ title: 'Своё заклинание — форма', w: 60, items: FORMS.map((fm) => ({ t: U.cap(fm.n) + ' — ' + fm.d, c: el.c, f: () => { UI.pop(); pickMod(el, fm); return 'keep'; } })) });
    }
    function pickMod(el, fm) {
      UI.list({ title: 'Своё заклинание — свойство', w: 64, items: MODS.map((md) => {
        const pr = MG.price(md.id), sh = 1;
        const nm = (md.n ? md.n + ' ' + el.n.toLowerCase() : el.n) + ' ' + fm.n;
        const can = P.gold >= pr && Gm.count('mana_shard') >= sh;
        return { t: U.cap(md.t) + ' → «' + nm + '»', r: Gm.money(pr, true) + ' + 1 оск.', disabled: !can, c: el.c, f: () => {
          P.gold -= pr; Gm.take('mana_shard', sh);
          const a = MG.create(el.id, fm.id, md.id);
          UI.pop();
          UI.popup('Новое заклинание', 'Руны вспыхивают, сплетаются — и гаснут у тебя на ладони. Ты знаешь новое заклинание: «' + a.n + '». ' + a.d + ' Дух: ' + a.cost + ', ожидание: ' + a.cd + '. Его можно взять в посох (цифры) или вызвать из умений (K).');
          return 'keep';
        } };
      }) });
    }
  };
  // осколки маны изредка находятся в подземельях и у чародеев
  const drop0 = E.Combat.onKill;
  if (drop0) E.Combat.onKill = function (e) { const r = drop0.apply(this, arguments); try { if (e && (e.tags || []).some((t) => t === 'spirit' || t === 'dream' || t === 'undead') && Math.random() < 0.12) Gm.give('mana_shard', 1); } catch (err) { /* */ } return r; };
})(window.EOF);
