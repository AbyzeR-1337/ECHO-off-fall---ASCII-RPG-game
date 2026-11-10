'use strict';
// Город по сословиям (большой мир):
//  • кварталы: знать — плиты, фонтан, сады за живой изгородью и усадьбы; середина — лавки и мастерские;
//    беднота — грязь, лачуги впритык, хлам у стен (карту строит js/world/mapgen.js);
//  • кто где живёт: богатейшие семьи — в усадьбах и домах знати, ремесленники — посередине,
//    подёнщики и нищие — в бедном квартале; сословие видно в разговоре;
//  • знать гуляет по своему кварталу, нищие сидят у храма, у ворот и в бедных переулках;
//  • уличные торговцы: пирожники, сбитенщики, цветочницы, рыбные торговки, коробейники;
//  • нищие просят подать — щедрость приносит удачу, а нищие знают о городе всё;
//  • в бедном квартале держи кошелёк крепче.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, UI = E.UI, Ent = E.Ent, Dlg = E.Dlg, MG = E.MapGen, Time = E.Time;
  const CT = E.City = {};
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------- уличная снедь и мелочь ----------
  const it = (id, n, g, t, o) => { if (!D.items[id]) D.items[id] = Object.assign({ id, n, g, t, w: 1, v: 1, d: '' }, o); };
  const food = (id, n, g, f, v, o) => it(id, n, g, 'food', Object.assign({ w: 0.4, v, food: f, st: 1 }, o));
  food('sbiten', 'Горячий сбитень', 'm', 4, 3, { drink: 1, thirst: -30, d: 'Мёд, пряности и кипяток. Греет до самых пяток.' });
  food('pretzel', 'Крендель', 'm', 20, 3, { w: 0.3, d: 'С солью, ещё тёплый.' });
  food('meat_pie', 'Пирожок с мясом', 'm', 26, 4, { w: 0.3, d: 'Жирный, румяный, с луком.' });
  food('sweet_bun', 'Сдобная булка', 'f', 20, 4, { w: 0.3, d: 'С маком и мёдом. Пахнет праздником.' });
  food('roasted_nuts', 'Жареные орехи', 'm', 12, 3, { w: 0.2, d: 'Кулёк горячих орехов. Хрустят и обжигают пальцы.' });
  food('candied_apple', 'Яблоко в меду', 'n', 16, 4, { w: 0.3, d: 'На палочке, в застывшем меду.' });
  food('tea', 'Чашка чая', 'f', 3, 3, { drink: 1, thirst: -35, d: 'Терпкий, с дымком. Привезён издалека.' });
  food('rice_cake', 'Рисовый колобок', 'm', 20, 4, { w: 0.3, d: 'Липкий рис с начинкой, завёрнутый в лист.' });
  food('dumplings', 'Пельмени на пару', 'n', 30, 6, { w: 0.4, d: 'Горячие, с мясом и имбирём.' });
  food('mooncake', 'Лунный пряник', 'm', 28, 8, { w: 0.3, d: 'Круглый, с узором на корке и сладкой начинкой.' });
  it('bouquet', 'Букет цветов', 'm', 'misc', { w: 0.2, v: 6, gift: 1, d: 'Цветы с городского рынка. Лучший подарок — кроме золота.' });

  const SH = Dlg.SHOP;
  const shop = (k, a) => { SH[k] = a.filter((b) => D.items[b]); };
  shop('pies', ['pie', 'meat_pie', 'meat_pie', 'sweet_bun', 'pretzel', 'bread', 'rusk']);
  shop('sbiten', ['sbiten', 'sbiten', 'kvass', 'tea', 'honey', 'pretzel']);
  shop('fruit', ['apple', 'apple', 'berries', 'cloudberry', 'blueberry', 'lingonberry', 'hazelnut', 'candied_apple', 'dates']);
  shop('flowers', ['bouquet', 'bouquet', 'bouquet', 'h_lavender', 'h_chamomile', 'beads', 'comb']);
  shop('fishwife', ['fish_cooked', 'smoked_fish', 'crayfish_boiled', 'eel_fried', 'fish_raw', 'fish_raw', 'seaweed']);
  shop('trinkets', ['ring', 'beads', 'bracelet', 'brooch', 'comb', 'handmirror', 'medallion', 'figurine', 'charm', 'silver_ring', 'bouquet']);
  shop('nuts', ['roasted_nuts', 'roasted_nuts', 'hazelnut', 'candied_apple', 'honey']);
  shop('eastfood', ['rice_cake', 'dumplings', 'tea', 'mooncake', 'tea']);

  // ---------- сословия ----------
  const SCORE = { ruler: 100, noble: 90, merchant: 62, caravaneer: 55, mage: 56, alchemist: 50, priest: 52, librarian: 46, scholar: 46, innkeeper: 44, smith: 40, healer: 40, monk: 30, guard: 30, veteran: 28, baker: 30, bard: 16, boatman: 14, fisher: 12, miner: 10, farmer: 10, laborer: 10, hunter: 12, woodcutter: 10, gravedigger: 6, shadow: 8, wanderer: 6, beggar: 0, child: 10, elder: 30 };
  const jobScore = (id) => { const j = E.Sim.job(id); return SCORE[j] != null ? SCORE[j] : 20; };
  function idScore(id) {
    const n = Gm.npc(id);
    if (!n) return 0;
    let sc = jobScore(id);
    if (n.lordOf != null && G.W.titles && G.W.titles[n.lordOf] && G.W.titles[n.lordOf].lord === id) sc = 120;
    return sc;
  }
  const famScore = (id) => { const n = Gm.npc(id); let sc = idScore(id); for (const f of (n && n.fam) || []) sc = Math.max(sc, idScore(f)); return sc; };
  const EST = {
    nob: { n: 'знать', c: '#e8c870' }, mer: { n: 'купечество', c: '#d8b080' }, cle: { n: 'духовенство', c: '#c0c8f0' },
    art: { n: 'ремесленный люд', c: '#c8b898' }, mil: { n: 'служилые', c: '#a8b8d0' }, com: { n: 'простой люд', c: '#b0a890' }, poor: { n: 'беднота', c: '#9a8a7a' },
  };
  CT.EST = EST;
  CT.estateKey = function (id) {
    const n = Gm.npc(id);
    if (!n || n.sett == null || n.sett < 0) return null;
    const s = G.W.settlements[n.sett];
    if (!s || s.type === 'sea' || s.type === 'vanish') return null;
    const sc = famScore(id), j = E.Sim.job(id);
    if (sc >= 85) return 'nob';
    if (j === 'beggar') return 'poor';
    if (['priest', 'monk', 'healer', 'librarian', 'scholar'].includes(j)) return 'cle';
    if (sc >= 55) return 'mer';
    if (j === 'guard' || j === 'veteran') return 'mil';
    // бедный квартал — беднота, даже если отец семейства подёнщик
    const m = G.map;
    if (m && m.districts && m.sett === n.sett) { const h = Ent.homeOf(id); if (h && h.dist === 'poor' && sc < 40) return 'poor'; if (h && (h.dist === 'rich' || h.type === 'manor') && sc < 55) return 'mer'; }
    if (sc >= 30) return 'art';
    return s.type === 'capital' || s.type === 'town' ? 'com' : 'com';
  };
  CT.estate = (id) => { const k = CT.estateKey(id); return k ? EST[k] : null; };
  // сословие — в строке под обликом собеседника
  const SO = E.Social;
  if (SO && SO.tags) {
    const tg0 = SO.tags;
    SO.tags = function (id) {
      const r = tg0.apply(this, arguments);
      try { const es = CT.estate(id); if (es && Gm.knows(id)) r.unshift(es.n); } catch (e) { /* */ }
      return r;
    };
  }
  // знать без земель — «господин», «госпожа»
  const R = E.Realms;
  if (R && R.titleWord) {
    const tw0 = R.titleWord;
    R.titleWord = function (id) {
      const r = tw0.apply(this, arguments);
      if (r) return r;
      const j = E.Sim.job(id);
      if (j === 'noble') return Gm.npc(id).sex === 'f' ? 'Госпожа' : 'Господин';
      return null;
    };
  }

  // ---------- кто в каком доме живёт ----------
  const RANKH = (h) => (h.type === 'manor' ? 0 : h.dist === 'rich' ? 1 : h.dist === 'poor' ? 3 : 2);
  function homeMap(m) {
    const homes = m.spots.home;
    if (m._hm && m._hmN === homes.length) return m._hm;
    const s = G.W.settlements[m.sett];
    const fam = new Map();
    for (const id of (s && s.npcs) || []) {
      const n = Gm.npc(id); if (!n) continue;
      const st = G.S.npc[id];
      const h = st && st.h != null ? st.h : n.house;
      if (h == null || h < 0) continue;
      const sc = idScore(id);
      fam.set(h, Math.max(fam.has(h) ? fam.get(h) : -1, sc));
    }
    const houses = [...fam.keys()].sort((a, b) => fam.get(b) - fam.get(a) || ((U.hash(a, 71) >>> 0) - (U.hash(b, 71) >>> 0)));
    const ord = homes.map((h, i) => i).sort((a, b) => RANKH(homes[a]) - RANKH(homes[b]) || a - b);
    const mp = new Map(), F = houses.length, H = ord.length;
    // семьи ложатся на дома по достатку: верх — в усадьбы и дома знати, низ — в лачуги
    houses.forEach((h, k) => mp.set(h, homes[ord[Math.min(H - 1, Math.floor(k * H / Math.max(1, F)))]]));
    m._hm = mp; m._hmN = homes.length;
    return mp;
  }
  const ho0 = Ent.homeOf;
  Ent.homeOf = function (id) {
    const m = G.map;
    if (!m || !m.districts || !m.spots || !m.spots.home || !m.spots.home.length) return ho0.apply(this, arguments);
    const n = Gm.npc(id);
    if (!n || n.sett !== m.sett) return ho0.apply(this, arguments);
    const st = G.S.npc[id];
    const h = st && st.h != null ? st.h : n.house;
    const r = h != null && h >= 0 ? homeMap(m).get(h) : null;
    return r || ho0.apply(this, arguments);
  };

  // ---------- где проводят день ----------
  const pl0 = Ent.place;
  Ent.place = function (id, hour) {
    const r = pl0.apply(this, arguments);
    const m = G.map;
    if (!m || !m.districts) return r;
    const j = E.Sim.job(id);
    if (j === 'beggar' && r === 'square') return 'beg';
    if (r !== 'square' && r !== 'tavern') return r;
    const k = CT.estateKey(id);
    if (k === 'nob') return r === 'tavern' && id % 4 ? 'rich' : r === 'square' ? 'rich' : r;
    if (k === 'mer' && r === 'square' && id % 3 === 0) return 'rich';
    if (k === 'poor' && r === 'square' && id % 2 === 0) return 'poor';
    return r;
  };
  const sf0 = Ent.spotFor;
  Ent.spotFor = function (id, place) {
    if (place === 'rich' || place === 'poor' || place === 'beg') {
      const S = (G.map && G.map.spots) || {};
      const arr = S[place];
      if (arr && arr.length) { const r = U.rng(id, place, Math.floor(G.S.time / 360)); return arr[r.int(0, arr.length - 1)]; }
      return sf0.call(this, id, 'square');
    }
    return sf0.apply(this, arguments);
  };

  // ---------- уличные торговцы и нищие ----------
  const VEND = {
    pies: { m: 'Пирожник', f: 'Пирожница', d: ['mid', 'poor'], greet: ['Пирожки! Горячие, с пылу с жару! С мясом, с капустой!', 'Бери пирожок — до вечера сытым будешь.'] },
    sbiten: { m: 'Сбитенщик', f: 'Сбитенщица', d: ['mid', 'poor'], greet: ['Сбитень горячий! Кто замёрз — подходи!', 'Кружку сбитня? Мёд, гвоздика, кипяток — душа поёт.'] },
    fruit: { m: 'Яблочник', f: 'Торговка яблоками', d: ['mid'], greet: ['Яблочки наливные, ягода лесная — свежее не найдёшь!', 'Попробуй — кислое не продаю.'] },
    flowers: { m: 'Цветочник', f: 'Цветочница', d: ['rich', 'mid'], greet: ['Цветы для дамы? Для кавалера? Для себя — тоже можно.', 'Букет — и любое сердце оттает.'] },
    fishwife: { m: 'Рыботорговец', f: 'Рыбная торговка', d: ['poor'], greet: ['Рыбка! Утренняя, сама в руки прыгнула!', 'Чего нос воротишь? Рыба как рыба. Свежая почти.'] },
    trinkets: { m: 'Коробейник', f: 'Коробейница', d: ['rich', 'mid'], greet: ['Колечки, бусы, гребешки — всё для красоты!', 'Безделица, а глаз радует. Смотри, не стесняйся.'] },
    nuts: { m: 'Продавец орехов', f: 'Продавщица орехов', d: ['mid'], greet: ['Орехи жареные, горячие, хрустящие!', 'Кулёк орехов — и прогулка веселей.'] },
  };
  CT.VEND = VEND;
  const BEG = { m: ['Нищий старик', 'Калека у стены', 'Слепой с кружкой', 'Мальчишка-оборванец', 'Нищий в лохмотьях'], f: ['Нищенка', 'Старуха с клюкой', 'Вдова в лохмотьях', 'Девчонка-оборвыш'] };
  function streetSpot(m, dists, r) {
    const S = m.spots || {};
    let pool = [];
    if (m.districts && dists) for (const k of dists) pool = pool.concat(k === 'rich' ? S.rich || [] : k === 'poor' ? S.poor || [] : (S.street || []).filter((p) => { const d = CT.districtAt(m, p.x, p.y); return !d || d === 'mid'; }));
    if (!pool.length) pool = (S.street && S.street.length ? S.street : S.square) || [];
    for (let k = 0; k < 12 && pool.length; k++) {
      const p = pool[r.int(0, pool.length - 1)];
      const q = MG.findWalkNear(m, p.x, p.y);
      if (q && !m.occ.has(q.y * m.w + q.x) && !(q.x === G.P.x && q.y === G.P.y)) return q;
    }
    return null;
  }
  function mkStreet(m, x, y) {
    const e = Ent.npc(G.W.special.ferryman, x, y);
    e.npc = null; e.ghost = 0; e.immortal = 0; e.ai = 'still'; e.kind = 'npc'; e.street = 1;
    return e;
  }
  CT.street = function (m) {
    m = m || G.map;
    if (!m || m.sett < 0 || m.kind !== 'over' || !m.spots || m.dimName) return;
    const ss = G.S.sett[m.sett];
    if (!ss || ss.destroyed) return;
    const s = G.W.settlements[m.sett];
    if (!s || ['farm', 'vanish', 'sea'].includes(s.type)) return;
    const urban = s.type === 'capital' || s.type === 'town';
    const h = Time.hour(G.S.time), day = Time.day(G.S.time);
    // кто не к месту — уходит
    for (const e of m.ents.slice()) {
      if (!e.street || e.dead) continue;
      const vendor = e.ghostShop != null;
      if ((vendor && (h < 8 || h >= 20)) || (!vendor && (h < 6 || h >= 23))) Gm.removeEnt(e);
    }
    const have = new Set(m.ents.filter((e) => e.street && !e.dead).map((e) => e.streetKey));
    const r = U.rng(G.W.seed, m.key, 'street', day);
    // торговцы
    if (h >= 8 && h < 20) {
      const kinds = Object.keys(VEND);
      const n = s.type === 'capital' ? 6 : urban ? 4 : s.type === 'village' ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const kind = urban ? kinds[(r.int(0, 999) + k * 3) % kinds.length] : ['pies', 'sbiten', 'fruit'][((U.hash(s.id, 'vk') >>> 0) + k) % 3];
        const key = 'v' + k;
        if (have.has(key) || (U.hash(m.key, k, day, 'vd') >>> 0) % 10 < 2) continue;
        const p = streetSpot(m, VEND[kind].d, U.rng(m.key, k, day));
        if (!p) continue;
        const g = (U.hash(m.key, k, 'g') >>> 0) % 2 ? 'f' : 'm';
        const e = mkStreet(m, p.x, p.y);
        e.streetKey = key; e.g = g; e.n = VEND[kind][g];
        e.ghostShop = 'st:' + m.key + ':' + k + ':' + Math.floor(day / 3); e.shopKind = kind;
        e.ch = '☺'; e.c = '#d8b070'; e.job = 'merchant'; e.merchant = 1; e.vendor = kind;
        e.greet = VEND[kind].greet[(U.hash(m.key, k, day) >>> 0) % VEND[kind].greet.length];
        Gm.addEnt(e);
      }
    }
    // нищие
    if (h >= 6 && h < 23 && (urban || s.type === 'village')) {
      const n = s.type === 'capital' ? 4 : urban ? 3 : 1;
      const spots = (m.spots.beg && m.spots.beg.length ? m.spots.beg : m.spots.square) || [];
      for (let k = 0; k < n && spots.length; k++) {
        const key = 'b' + k;
        if (have.has(key)) continue;
        const sp = spots[(U.hash(m.key, k, 'beg', Math.floor(day / 2)) >>> 0) % spots.length];
        const p = MG.findWalkNear(m, sp.x, sp.y);
        if (!p || m.occ.has(p.y * m.w + p.x) || (p.x === G.P.x && p.y === G.P.y)) continue;
        const g = (U.hash(m.key, k, 'bg') >>> 0) % 3 ? 'm' : 'f';
        const e = mkStreet(m, p.x, p.y);
        e.streetKey = key; e.g = g; e.custom = 'beggar'; e.job = 'beggar'; e.c = '#8a7a6a';
        e.n = BEG[g][(U.hash(m.key, k, 'bn') >>> 0) % BEG[g].length];
        e.greet = pick(['Подай, добрый человек... Хоть медяк, хоть корочку.', 'Боги видят, кто подаёт. Подай — и тебе воздастся.', 'Третий день не ел[|а]... Не пожалей монетку.', 'Глянь на калеку, путник. Подай на хлеб.']);
        Gm.addEnt(e);
      }
    }
  };
  // разговор с нищим
  const op0 = Dlg.options;
  Dlg.options = function (e) {
    if (!e || e.custom !== 'beggar') return op0.apply(this, arguments);
    const P = G.P, o = [];
    const day = Gm.day();
    e.alms = e.alms || 0;
    o.push({ t: 'Подать монетку (1)', f: () => {
      if (P.gold < 1) return 'Сам[|а] без гроша? Ну, иди с богом.';
      P.gold -= 1; e.alms++; Gm.cnt('alms');
      if (Math.random() < 0.25 && D.effects.luckbuff) { Gm.fx('luckbuff', 60 * 4); return 'Спаси тебя боги... Удача пойдёт за тобой, вот увидишь.'; }
      return pick(['Спасибо, добрая душа. Помолюсь за тебя.', 'Хлеба куплю. Спасибо.', 'Медяк к медяку — глядишь, и до весны доживу.']);
    } });
    o.push({ t: 'Подать щедро (10 монет)', f: () => {
      if (P.gold < 10) return 'Да у тебя самого столько нет. Не надо, не надо.';
      P.gold -= 10; e.alms += 10; Gm.cnt('alms', 10);
      if (D.effects.luckbuff) Gm.fx('luckbuff', 60 * 12);
      if (Gm.xp) Gm.xp(3);
      P.flags.beggarFriend = (P.flags.beggarFriend || 0) + 1;
      const tip = CT.beggarTip ? CT.beggarTip(e) : null;
      return 'Десять монет?! Да хранят тебя все боги разом!' + (tip ? ' Слушай, скажу тебе кое-что... ' + tip : '');
    } });
    o.push({ t: 'Расспросить о городе', f: () => {
      if (e.alms < 1) return 'Ничего не вижу, ничего не знаю. Медяк память освежает.';
      return CT.cityTalk(e);
    } });
    o.push({ t: 'Прогнать', f: () => { Gm.removeEnt(e); Gm.msg(U.cap(e.n) + ' уходит, ворча.', '#9a8a7a'); return 'close'; } });
    o.push({ t: 'Уйти', f: () => 'close' });
    return o;
  };
  CT.cityTalk = function () {
    const m = G.map, s = G.W.settlements[m.sett], out = [];
    if (m.districts) {
      out.push('Знать живёт там, где плиты и фонтан — стража там злая, а подают скупо.');
      out.push('У бедноты грязь да лачуги. Ночью туда без ножа не ходи — кошелёк срежут и не заметишь.');
    }
    if (m.spots.bath) out.push('Баня у нас хорошая: пар, купели, всё как положено. Банщик за медяки и спину потрёт.');
    if (m.spots.tavern) out.push('В трактире комнату снять можно — на ночь, на неделю. Хозяин сундук даёт, с замком.');
    if (m.spots.flea) out.push('На барахолке всякое продают. Иное — краденое, но кто ж спрашивает.');
    const tt = E.Realms && E.Realms.titleOf ? E.Realms.titleOf(G.W, m.sett) : null;
    if (tt && tt.lord != null) { try { const n = Gm.npc(tt.lord); if (n) out.push('Правит тут ' + n.first + ' ' + (n.sur || '') + '. Видел[|а] издали — важн' + (n.sex === 'f' ? 'ая' : 'ый') + ', в мехах.'); } catch (e) { /* */ } }
    return out.length ? pick(out) : 'Город как город. Люди как люди.';
  };

  // ---------- квартал под ногами ----------
  CT.districtAt = function (m, x, y) {
    if (!m || !m.districts) return null;
    for (const d of m.districts) if (x >= d.x && x <= d.x2 && y >= d.y && y <= d.y2) return d.k;
    return null;
  };
  const DMSG = {
    rich: ['Квартал знати: плиты, фонтан, сады за живой изгородью. Стража здесь смотрит пристальнее.', '#e8d090'],
    mid: ['Средний квартал: лавки, мастерские, дома ремесленников.', '#c8b898'],
    poor: ['Бедный квартал: грязь по щиколотку, лачуги впритык, из подворотен косятся.', '#a09080'],
  };
  let lastD = null, lastKey = null;
  const tk0 = Gm.tick;
  Gm.tick = function () {
    const r = tk0.apply(this, arguments);
    try {
      const m = G.map, P = G.P;
      if (m && m.districts && P && !P.dead) {
        const d = CT.districtAt(m, P.x, P.y);
        if (m.key !== lastKey) { lastKey = m.key; lastD = d; }
        else if (d && d !== lastD) { lastD = d; Gm.msg(DMSG[d][0], DMSG[d][1]); }
        else if (!d) lastD = null;
        // карманники бедного квартала: раз в день, в толпе или ночью
        if (d === 'poor' && P.gold >= 6 && Math.random() < (Gm.night() ? 1 / 500 : 1 / 1500) && P.flags.ppDay !== Gm.day()) {
          P.flags.ppDay = Gm.day();
          if ((P.st.dex || 0) + Math.random() * 12 >= 13) Gm.msg('Чья-то рука тянется к твоему кошельку — ты перехватываешь её! Оборвыш вырывается и ныряет в подворотню.', '#e0c080');
          else { const k = Math.max(1, Math.floor(P.gold * (0.08 + Math.random() * 0.15))); P.gold -= k; Gm.msg('Кто-то толкнул тебя в переулке... Кошелёк стал легче на ' + k + ' ' + U.plural(k, 'монету', 'монеты', 'монет') + '.', '#e07070'); Gm.cnt('pickpocketed'); }
        }
      }
    } catch (e) { /* город подождёт */ }
    return r;
  };
  // торговцы и нищие выходят на улицы при входе и каждый час
  const lm0 = Gm.loadMap;
  Gm.loadMap = function () {
    const r = lm0.apply(this, arguments);
    try { CT.street(G.map); } catch (e) { console.warn('city', e); }
    return r;
  };
  const hr0 = Ent.hourly;
  Ent.hourly = function () {
    const r = hr0.apply(this, arguments);
    try { CT.street(G.map); } catch (e) { /* */ }
    return r;
  };
})(window.EOF);
