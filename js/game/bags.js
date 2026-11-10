'use strict';
// Вместилища. Сам по себе человек унесёт немного: карманы, за пазуху, в руках — шесть мест и несколько
// килограммов. Всё остальное — в том, что носишь: кошель и подсумок на поясе, сума или мешок через плечо,
// котомка, короб, корзина или рюкзак за спиной. Двадцать с лишним видов, от узла на палке до бездонной сумы.
// Новая жизнь начинается с поясного кошеля — остальное надо купить, найти или выиграть.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, Items = E.Items, Dlg = E.Dlg;
  const BG = E.Bags = {};
  // места для вместилищ
  for (const sl of [['pouch', 'На поясе'], ['bag', 'Через плечо'], ['pack', 'За спиной']]) if (!D.SLOTS.some((s) => s[0] === sl[0])) D.SLOTS.push(sl);
  BG.SLOTS = ['pouch', 'bag', 'pack'];
  // id, имя, род, место, ячейки, +кг, цена, вес, вид (для фона сумки), прочее
  const B = (id, n, g, s, slots, cap, v, w, look, d, o) => { D.items[id] = Object.assign({ id, n, g, t: 'bag', s, slots, cap, v, w, look, d, bag: 1 }, o || {}); };
  B('pouch', 'Поясной кошель', 'm', 'pouch', 2, 1, 3, 0.2, 'pouch', 'Кожаный мешочек на шнурке. Пара мелочей да огниво.');
  B('belt_bag', 'Поясная сумка', 'f', 'pouch', 4, 3, 14, 0.5, 'leather', 'Крепкая кожа, медная пряжка. Всё нужное — под рукой.');
  B('herb_pouch', 'Травяной мешочек', 'm', 'pouch', 4, 1, 9, 0.2, 'linen', 'Льняной, с отделениями для трав. Пахнет мятой и полынью.');
  B('bandolier', 'Перевязь с кармашками', 'f', 'pouch', 5, 2, 26, 0.6, 'leather', 'Ремень через грудь, на нём — кармашки для склянок и ножей.');
  B('coin_purse', 'Расшитый кошель', 'm', 'pouch', 3, 1, 30, 0.2, 'velvet', 'Бархат, серебряная нить. Такие носят купеческие жёны.', { mods: { luck: 1 } });
  B('basket', 'Корзинка', 'f', 'bag', 5, 5, 3, 0.6, 'basket', 'Плетёная, с ручкой. Для ягод, грибов и пирожков.');
  B('sack', 'Холщовый мешок', 'm', 'bag', 6, 8, 4, 0.5, 'sack', 'Простой мешок из грубого холста. Влезает много, но бьёт по ногам.');
  B('shoulder_bag', 'Сумка через плечо', 'f', 'bag', 8, 10, 22, 0.8, 'leather', 'Длинный ремень, клапан на пуговице.');
  B('hunter_bag', 'Ягдташ', 'm', 'bag', 9, 12, 32, 0.9, 'leather', 'Охотничья сумка с сеткой для дичи и петлями для ножа.');
  B('satchel', 'Кожаная сума', 'f', 'bag', 10, 12, 38, 1, 'leather', 'Дорожная сума из воловьей кожи, прошита вощёной нитью.');
  B('scholar_bag', 'Сумка книжника', 'f', 'bag', 8, 8, 42, 0.8, 'velvet', 'Жёсткие стенки берегут книги от дождя и чужих рук.', { mods: { int: 1 } });
  B('mage_satchel', 'Сумка чародея', 'f', 'bag', 10, 10, 170, 0.6, 'magic', 'Шёлк с вышитыми знаками. Внутри теплее, чем снаружи, и чуть просторнее, чем кажется.', { mods: { int: 1, res: 1 } });
  B('bottomless_bag', 'Бездонная сума', 'f', 'bag', 30, 40, 1200, 0.5, 'magic', 'Заглянешь — а дна не видно. Что упало туда, весит как пёрышко.');
  B('bundle', 'Узел на палке', 'm', 'pack', 6, 8, 1, 0.6, 'sack', 'Платок, связанный узлом, на палке через плечо. Так уходят из дома.');
  B('knapsack', 'Котомка', 'f', 'pack', 10, 14, 15, 0.8, 'sack', 'Холщовая котомка с лямками. Верная спутница странника.');
  B('back_basket', 'Заплечная корзина', 'f', 'pack', 12, 20, 18, 1.4, 'basket', 'Высокая плетёнка с лямками. Травницы и грибники не расстаются с такой.');
  B('korob', 'Берестяной короб', 'm', 'pack', 14, 24, 28, 1.6, 'birch', 'Короб из бересты: лёгкий, не промокает, пахнет лесом.');
  B('backpack', 'Походный рюкзак', 'm', 'pack', 14, 22, 60, 1.5, 'leather', 'Кожа и парусина, карманы по бокам, скатка сверху.');
  B('soldier_pack', 'Солдатский ранец', 'm', 'pack', 16, 26, 75, 2, 'leather', 'Ранец на жёсткой раме. С ним шли в поход целые полки.');
  B('explorer_pack', 'Рюкзак следопыта', 'm', 'pack', 18, 28, 140, 1.6, 'leather', 'Из промасленной кожи: не боится ни дождя, ни снега.', { mods: { con: 1 } });
  B('frame_pack', 'Рюкзак на раме', 'm', 'pack', 18, 32, 110, 2.6, 'leather', 'Огромный, на деревянной раме. Носильщики гор ходят с такими.', { mods: { dex: -1 } });
  B('pedlar_box', 'Короб коробейника', 'm', 'pack', 20, 30, 90, 2.4, 'birch', 'Короб с ящичками на все случаи. Продавать из него — одно удовольствие.', { trade: 1 });
  B('travel_chest', 'Дорожный сундучок', 'm', 'pack', 22, 36, 130, 3.5, 'chest', 'Окованный сундучок на лямках. Тяжёл, зато надёжен.', { mods: { dex: -1 } });
  BG.LIST = Object.keys(D.items).filter((k) => D.items[k].bag);

  // ---------- сколько унесёшь ----------
  const POCKETS = 6;
  BG.bags = (P) => { P = P || G.P; return BG.SLOTS.map((s) => P.eq[s]).filter((it) => it && D.items[it.b] && D.items[it.b].bag); };
  BG.slots = (P) => { P = P || G.P; return POCKETS + BG.bags(P).reduce((a, it) => a + (D.items[it.b].slots || 0), 0); };
  const worn = (P, it) => { for (const s in P.eq) if (P.eq[s] === it) return true; return false; };
  BG.loose = (P) => { P = P || G.P; return P.inv.filter((it) => it.b !== 'gold' && !worn(P, it)); };
  BG.used = (P) => BG.loose(P).length;
  BG.free = (P) => BG.slots(P) - BG.used(P);
  // есть ли куда положить (в стопку — всегда можно)
  BG.roomFor = function (it, P) {
    P = P || G.P;
    if (!it || it.b === 'gold') return true;
    if (it.q && P.inv.some((x) => x.b === it.b && x.q && !x.uq && !it.uq && x.n === it.n && !x.water)) return true;
    return BG.free(P) > 0;
  };
  // что в какой сумке лежит: у вещи пометка it.in (карманы, пояс, плечо, спина); новое — туда, где есть место
  BG.NAMES = { pockets: 'Карманы', pouch: 'На поясе', bag: 'Через плечо', pack: 'За спиной', hands: 'Не помещается' };
  const SMALL = (it) => ['potion', 'trinket', 'ammo'].includes(it.t) || /^h_|seed|shard|nugget|pearl|ring|coin|key|lockpick|flint|candle|letter|map_scrap|dice/.test(it.b);
  BG.layout = function (P) {
    P = P || G.P;
    const cont = [{ k: 'pockets', n: BG.NAMES.pockets, cap: POCKETS, look: 'pockets', items: [] }];
    for (const s of BG.SLOTS) { const b = P.eq[s]; if (b && D.items[b.b] && D.items[b.b].bag) cont.push({ k: s, n: D.items[b.b].n, cap: D.items[b.b].slots, look: D.items[b.b].look, bag: b, items: [] }); }
    const by = {}; for (const c of cont) by[c.k] = c;
    const loose = BG.loose(P), wait = [];
    for (const it of loose) { const c = by[it.in]; if (c && c.items.length < c.cap) c.items.push(it); else wait.push(it); }
    for (const it of wait) {
      const pref = SMALL(it) ? ['pouch', 'bag', 'pack', 'pockets'] : ['pack', 'bag', 'pockets', 'pouch'];
      const c = pref.map((k) => by[k]).find((q) => q && q.items.length < q.cap);
      if (c) { c.items.push(it); it.in = c.k; } else { (by.hands || (by.hands = cont[cont.push({ k: 'hands', n: BG.NAMES.hands, cap: 0, look: 'hands', items: [] }) - 1])).items.push(it); it.in = null; }
    }
    return cont;
  };
  BG.move = function (it, k) { const P = G.P, c = BG.layout(P).find((q) => q.k === k); if (!c || c.items.length >= c.cap) return false; it.in = k; return true; };
  // вес: то, что надето, не тянет сумку (кроме самих сумок); бездонная сума делает поклажу легче
  Gm.weight = function () {
    const P = G.P;
    let w = 0;
    for (const it of P.inv) if (!worn(P, it)) w += (it.w || 0) * (it.q || 1);
    if (BG.bags(P).some((b) => b.b === 'bottomless_bag')) w *= 0.5;
    for (const b of BG.bags(P)) w += b.w || 0;
    return w;
  };
  Gm.cap = function () {
    const P = G.P;
    return Math.round(8 + (P.st ? P.st.str : 5) * 1.5 + BG.bags(P).reduce((a, it) => a + (D.items[it.b].cap || 0), 0));
  };
  BG.over = (P) => { P = P || G.P; return Gm.weight() > Gm.cap() || BG.used(P) > BG.slots(P); };
  // перегруз — медленнее (заменяет старую проверку «25 + 3×Сила»)
  const calc0 = Gm.calc;
  Gm.calc = function () {
    const r = calc0.apply(this, arguments);
    const P = G.P;
    if (P && P.st) {
      const oldOver = Gm.weight() > 25 + P.st.str * 3;
      const over = BG.over(P);
      if (oldOver && !over) P.st.speed /= 0.6;
      else if (!oldOver && over) P.st.speed *= 0.6;
    }
    return r;
  };
  // описание: сколько мест и сколько килограммов
  const desc0 = Items.desc;
  Items.desc = function (it) {
    const lines = desc0.apply(this, arguments);
    const b = it && D.items[it.b];
    if (b && b.bag) {
      const k = lines.findIndex((l) => /^undefined/.test(l));
      const s = 'Вместилище: ' + b.slots + ' ' + U.plural(b.slots, 'место', 'места', 'мест') + ', ещё ' + b.cap + ' кг' + (it.mods ? ', ' + Object.keys(it.mods).map((m) => (E.STATN[m] || m) + ' ' + (it.mods[m] > 0 ? '+' : '') + it.mods[m]).join(', ') : '');
      if (k >= 0) lines[k] = s; else lines.push(s);
    }
    return lines;
  };

  // ---------- полная сумка ----------
  // подобрать с земли: что не влезает — остаётся лежать
  const pick0 = Gm.pickupAll;
  Gm.pickupAll = function () {
    const P = G.P, m = G.map;
    const here = Gm.itemsAt(P.x, P.y);
    const keep = [];
    let free = BG.free(P);
    for (const o of here) {
      const it = o.it;
      if (!it || it.b === 'gold') continue;
      const stack = it.q && P.inv.some((x) => x.b === it.b && x.q && !x.uq && !it.uq && !x.water);
      if (stack) continue;
      if (free > 0) { free--; continue; }
      keep.push(o);
    }
    for (const o of keep) m.items.splice(m.items.indexOf(o), 1);
    const r = pick0.apply(this, arguments);
    for (const o of keep) m.items.push(o);
    if (keep.length) Gm.msg('Некуда положить: ' + keep.map((o) => Items.name(o.it).toLowerCase()).join(', ') + '. Нужна сумка побольше.', '#e0a070');
    return r;
  };
  // купить в лавке — только если есть куда
  const buy0 = Dlg.buy;
  Dlg.buy = function (e, it, kind) {
    const b = D.items[it.b];
    if (!(b && b.bag) && !BG.roomFor(it)) { Gm.msg('Некуда положить — сумки полны. Купи сумку побольше или продай лишнее.', '#e0a070'); return false; }
    return buy0.apply(this, arguments);
  };
  // всё, что дали, — берёшь; но если сумка полна, тащишь в руках
  const give0 = Gm.give;
  Gm.give = function (b, q, silent) {
    const P = G.P;
    const before = P ? BG.used(P) : 0;
    const r = give0.apply(this, arguments);
    try { if (P && r && BG.used(P) > before && BG.used(P) > BG.slots(P) && !silent) Gm.msg('Сумки полны — это придётся нести в руках. Тяжело и неудобно.', '#e0a070'); } catch (e) { /* */ }
    return r;
  };
  // сумку можно надеть, только если вещи из неё есть куда деть
  const eq0 = Gm.equip;
  Gm.equip = function (it, slot) {
    const P = G.P, b = it && D.items[it.b];
    if (b && b.bag && P.eq[b.s] === it) {
      const after = BG.slots(P) - (b.slots || 0);
      if (BG.used(P) + 1 > after) { Gm.msg('Снять ' + b.n.toLowerCase() + ' нельзя: вещи из неё некуда переложить.', '#e0a070'); return; }
    }
    const r = eq0.apply(this, arguments);
    if (b && b.bag) Gm.calc();
    return r;
  };
  // коробейнику с коробом платят чуть больше
  const pm0 = Dlg.priceMul;
  Dlg.priceMul = function (e, bb, buy) {
    let m = pm0.apply(this, arguments);
    if (!buy && G.P && BG.bags(G.P).some((x) => D.items[x.b].trade)) m *= 1.06;
    return m;
  };

  // ---------- где купить ----------
  const SH = Dlg.SHOP;
  const add = (k, list) => { if (SH[k]) for (const b of list) if (D.items[b]) SH[k].push(b); };
  add('general', ['pouch', 'belt_bag', 'sack', 'knapsack', 'basket', 'shoulder_bag']);
  add('tools', ['backpack', 'frame_pack', 'korob', 'belt_bag', 'sack']);
  add('hunter', ['hunter_bag', 'satchel', 'back_basket', 'backpack', 'bandolier']);
  add('herbs', ['herb_pouch', 'back_basket', 'basket']);
  add('junk', ['bundle', 'sack', 'knapsack', 'basket']);
  add('fair_cloth', ['shoulder_bag', 'satchel', 'belt_bag', 'coin_purse']);
  add('trinkets', ['coin_purse']);
  add('caravan', ['explorer_pack', 'pedlar_box', 'travel_chest', 'soldier_pack']);
  add('magic', ['mage_satchel', 'scholar_bag']);
  add('books', ['scholar_bag']);
  add('smith', ['soldier_pack', 'bandolier']);
  add('black', ['bandolier', 'satchel']);
  // бездонная сума — только с молотка
  if (E.Markets) { /* лоты аукциона читаются из списка при каждом торге */ }

  // ---------- новая жизнь — с кошелём; старым героям — котомка ----------
  const np0 = Gm.newPlayer;
  Gm.newPlayer = function () {
    const P = np0.apply(this, arguments);
    try {
      P.bagV = 1;
      const it = Items.make('pouch');
      P.inv.push(it); P.eq.pouch = it;
    } catch (e) { /* */ }
    return P;
  };
  const tk0 = Gm.tick;
  Gm.tick = function () {
    const P = G.P;
    if (P && !P.bagV && P.inv) {
      P.bagV = 1;
      if (Gm.ensureSlots) Gm.ensureSlots(P);
      if (!BG.bags(P).length) {
        const it = Items.make(BG.used(P) > 12 ? 'backpack' : 'knapsack');
        P.inv.push(it); P.eq.pack = it;
        Gm.msg('За плечами у тебя — ' + it.n.toLowerCase() + ': туда и сложено всё твоё добро. (Теперь вещи носят в сумках — смотри «Сумку».)', '#e0d0a0');
      }
      Gm.calc();
    }
    return tk0.apply(this, arguments);
  };
})(window.EOF);
