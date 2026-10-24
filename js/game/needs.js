'use strict';
// Тело и кошелёк: одежда по слоям (от исподнего до плаща), разные монеты, жажда и нужда.
(function (E) {
  const U = E.U, D = E.D, T = E.T, TL = E.TL, G = E.G, Gm = E.Gm, Items = E.Items;

  // ============================================================
  // Одежда
  // ============================================================
  D.SLOTS = [['under', 'Исподнее'], ['shirt', 'Рубаха'], ['legs', 'Штаны'], ['feet', 'Обувь'], ['hands', 'Руки'], ['body', 'Верх, доспех'], ['cloak', 'Плащ'], ['head', 'Голова'], ['hand', 'В руке'], ['trinket', 'Украшение']];
  Gm.ensureSlots = function (P) { for (const [s] of D.SLOTS) if (!(s in P.eq)) P.eq[s] = null; };
  // во что одет: naked — совсем без одежды, under — только исподнее, half — без штанов или без рубахи, dressed — одет
  const COVERS_LEGS = new Set(['robe', 'rags', 'furcoat']);
  Gm.dress = function () {
    const e = G.P.eq;
    const legs = !!e.legs || (e.body && COVERS_LEGS.has(e.body.b));
    const top = !!e.shirt || !!e.body;
    if (!legs && !top) return e.under ? 'under' : 'naked';
    if (!legs || !top) return 'half';
    return 'dressed';
  };
  const DRESS_N = { naked: 'без одежды', under: 'в одном исподнем', half: 'одет[|а] наполовину', dressed: 'одет[|а]' };
  Gm.dressName = () => DRESS_N[Gm.dress()];
  // торговцы и люди смотрят на вид: раздетым — дороже, после конфуза — тоже
  Gm.socialPriceMul = function (buy) {
    let k = 1;
    const d = Gm.dress();
    if (d === 'naked' || d === 'under') k *= 1.35; else if (d === 'half') k *= 1.12;
    if (Gm.hasFx('soiled')) k *= 1.25;
    return buy ? k : 1 / k;
  };
  // исподнее под доспехом не даёт натереть; босые ноги страдают на камнях и в снегу; без рукавиц на морозе пальцы деревенеют
  function clothesHour() {
    const P = G.P, e = P.eq, m = G.map;
    if (e.body && (e.body.def || 0) >= 2 && !e.under && !e.shirt) { if (!Gm.hasFx('chafed')) { Gm.fx('chafed', 240); Gm.msg('Доспех на голое тело натирает кожу.', '#d0a080'); } }
    const t = TL[m.tiles[P.y * m.w + P.x]];
    if (!e.feet && m.outdoor && !t.indoor && [T.SNOW, T.DRIFT, T.ICE, T.STONES, T.RUBBLE, T.ROCKFLOOR, T.ASH, T.BLACKSNOW].includes(m.tiles[P.y * m.w + P.x])) {
      if (Math.random() < 0.35) { Gm.hurtPlayer(1, 'cold'); Gm.msg('Босые ноги сбиты и стынут.', '#d0a080'); }
    }
    if (!e.hands && Gm.coldLevel() >= 1 && !Gm.hasFx('cold') && Math.random() < 0.3) Gm.fx('cold', 90);
    // люди в поселении замечают, как ты одет
    const d = Gm.dress();
    if (m.sett >= 0 && Gm.outdoors() && !Gm.night() && d !== 'dressed' && m.ents.some((x) => x.npc != null && !x.hostile && U.dist(x.x, x.y, P.x, P.y) < 7)) {
      if (Math.random() < 0.5) Gm.msg(d === 'half' ? 'Прохожие косятся на тебя.' : 'Люди отворачиваются и перешёптываются. Кто-то смеётся.', '#c0a0a0');
      if (d === 'naked' || d === 'under') { G.S.sett[m.sett].rep = Math.max(-100, (G.S.sett[m.sett].rep || 0) - 1); Gm.cnt('naked_hours'); }
    }
  }

  // ============================================================
  // Деньги: медь, серебро, золото (1 зол. = 10 сер. = 100 мед.).
  // Всё, что игра считает «монетами», — стоимость в меди; кошелёк сам отсчитывает и даёт сдачу.
  // ============================================================
  const COIN = [['au', 100, 'зол.', 'золотой', 'золотых', 'золотых'], ['ag', 10, 'сер.', 'серебряник', 'серебряника', 'серебряников'], ['cu', 1, 'мед.', 'медяк', 'медяка', 'медяков']];
  D.COINS = COIN;
  const total = (p) => (p.au || 0) * 100 + (p.ag || 0) * 10 + (p.cu || 0);
  // получить сумму: крупными монетами, сколько получится
  function addValue(p, v) {
    for (const [k, w] of COIN) { const n = Math.floor(v / w); if (n > 0) { p[k] = (p[k] || 0) + n; v -= n * w; } }
  }
  // заплатить сумму: сначала мелочью, потом размен крупной монеты (сдача — мелочью)
  function payValue(p, v) {
    if (v <= 0) return;
    if (total(p) < v) { p.au = 0; p.ag = 0; p.cu = 0; return; }
    for (const [k, w] of COIN.slice().reverse()) { const n = Math.min(p[k] || 0, Math.floor(v / w)); p[k] -= n; v -= n * w; }
    if (v > 0) {
      // разменять самую мелкую из подходящих крупных монет
      for (const [k, w] of COIN.slice().reverse()) {
        if ((p[k] || 0) > 0 && w >= v) { p[k]--; addValue(p, w - v); v = 0; break; }
      }
      while (v > 0) {
        const k = (p.ag || 0) > 0 ? 'ag' : (p.au || 0) > 0 ? 'au' : null;
        if (!k) break;
        const w = k === 'ag' ? 10 : 100;
        p[k]--; addValue(p, w);
        const n = Math.min(p.cu || 0, v); p.cu -= n; v -= n;
        if (v > 0) { const m = Math.min(p.ag || 0, Math.floor(v / 10)); p.ag -= m; v -= m * 10; }
      }
    }
  }
  // P.gold остаётся числом для всей игры, но за ним — настоящий кошелёк с монетами
  Gm.attachPurse = function (P) {
    let start = 0;
    const own = Object.getOwnPropertyDescriptor(P, 'gold');
    if (own && 'value' in own) { start = own.value || 0; delete P.gold; }
    if (!P.purse) { P.purse = { au: 0, ag: 0, cu: 0 }; addValue(P.purse, start); }
    Object.defineProperty(P, 'gold', {
      configurable: true, enumerable: false,
      get() { return total(P.purse); },
      set(v) { v = Math.max(0, Math.round(v)); const cur = total(P.purse); if (v > cur) addValue(P.purse, v - cur); else if (v < cur) payValue(P.purse, cur - v); },
    });
  };
  // «3 зол. 2 сер. 5 мед.» или коротко «3з 2с 5м»
  Gm.money = function (v, short) {
    if (typeof v === 'number') { const p = { au: 0, ag: 0, cu: 0 }; addValue(p, v); v = p; }
    const parts = [];
    for (const [k, , ab, n1, n2, n5] of COIN) if (v[k]) parts.push(short ? v[k] + ab[0] : v[k] + ' ' + U.plural(v[k], n1, n2, n5));
    return parts.length ? parts.join(short ? ' ' : ', ') : (short ? '0м' : 'ни гроша');
  };
  Gm.purseStr = (short) => Gm.money(G.P.purse || G.P.gold, short);

  // ============================================================
  // Жажда и нужда: 0 — всё хорошо, 100 — невыносимо
  // ============================================================
  const HOT = new Set(['desert', 'volcanic', 'ash']);
  function needsHour() {
    const P = G.P, m = G.map;
    if (P.thirst == null) P.thirst = 10;
    if (P.need == null) P.need = 5;
    // жажда: жара, лето, тяжёлый доспех и бой — быстрее; ночью и в холод — медленнее
    let tr = 4.2;
    if (HOT.has(m.biome)) tr *= 1.7;
    if (Gm.season() === 1 && !Gm.night() && Gm.outdoors()) tr *= 1.25;
    if (Gm.night()) tr *= 0.75;
    if (P.eq.body && (P.eq.body.def || 0) >= 4) tr *= 1.2;
    if (Gm.coldLevel() >= 1) tr *= 0.85;
    if (m.underwater) tr = 0;
    const t0 = P.thirst;
    P.thirst = Math.min(100, P.thirst + tr);
    if (t0 < 50 && P.thirst >= 50) Gm.msg('Хочется пить.', '#80b0e0');
    if (t0 < 80 && P.thirst >= 80) Gm.msg('Горло пересохло. Нужна вода.', '#80a0e0');
    if (P.thirst >= 80 && !Gm.hasFx('thirsty')) Gm.fx('thirsty', 9999);
    if (P.thirst >= 100) { Gm.hurtPlayer(Math.max(1, Math.round(P.mhp * 0.03)), 'thirst'); if (P.dead) return; if (!Gm.hasFx('parched')) Gm.fx('parched', 9999); if (Gm.hour() % 3 === 0) Gm.msg('Обезвоживание. Мысли путаются.', '#80a0e0'); }
    // нужда копится сама и от еды с питьём
    const n0 = P.need;
    P.need = Math.min(100, P.need + 1.2);
    if (n0 < 60 && P.need >= 60) Gm.msg('Пора бы отойти по нужде.', '#c0a070');
    if (P.need >= 85 && !Gm.hasFx('bursting')) { Gm.fx('bursting', 9999); Gm.msg('Терпеть всё труднее.', '#d0a060'); }
    if (P.need >= 100) accident();
    clothesHour();
  }
  // не дотерпел[а]
  function accident() {
    const P = G.P;
    P.need = 0;
    Gm.rmFx('bursting');
    Gm.fx('soiled', 720);
    Gm.cnt('accidents');
    Gm.msg('Ты не дотерпел[|а]. Стыдно. Нужно вымыться и постирать одежду.', '#c0a060');
    if (G.map.sett >= 0 && G.map.ents.some((x) => x.npc != null && U.dist(x.x, x.y, P.x, P.y) < 7)) G.S.sett[G.map.sett].rep = Math.max(-100, (G.S.sett[G.map.sett].rep || 0) - 3);
  }
  Gm.thirstAdd = function (v) {
    const P = G.P;
    P.thirst = U.clamp((P.thirst || 0) + v, 0, 100);
    if (P.thirst < 80) Gm.rmFx('thirsty');
    if (P.thirst < 100) Gm.rmFx('parched');
    if (v < 0) P.need = Math.min(100, (P.need || 0) + (-v) * 0.3);
  };
  Gm.needAdd = function (v) { const P = G.P; P.need = U.clamp((P.need || 0) + v, 0, 100); if (P.need < 85) Gm.rmFx('bursting'); };

  // напиться прямо из колодца, ручья или озера
  Gm.drinkHere = function () {
    const P = G.P;
    if (!Gm.nearWater(P.x, P.y, 1)) { Gm.msg('Здесь нет воды.'); return false; }
    const m = G.map;
    let bad = false;
    for (const [dx, dy] of [[0, 0]].concat(U.DIR8)) { const x = P.x + dx, y = P.y + dy; if (x >= 0 && y >= 0 && x < m.w && y < m.h && [T.BOG, T.SWAMP].includes(m.tiles[y * m.w + x])) bad = true; }
    Gm.thirstAdd(-60);
    Gm.msg(bad ? 'Ты пьёшь затхлую воду. Отдаёт тиной.' : 'Ты пьёшь холодную воду. Хорошо.', '#90c0e0');
    if (bad && Math.random() < 0.3) Gm.fx('poison', 20);
    Gm.cnt('drinks');
    Gm.endTurn(2);
    return true;
  };
  // справить нужду: в нужнике и в кустах — спокойно, на людях — позор
  Gm.relieve = function () {
    const P = G.P, m = G.map;
    if ((P.need || 0) < 15) { Gm.msg('Пока не хочется.'); return; }
    const t = m.tiles[P.y * m.w + P.x];
    let privy = false;
    for (const [dx, dy] of [[0, 0]].concat(U.DIR8)) { const x = P.x + dx, y = P.y + dy; if (x >= 0 && y >= 0 && x < m.w && y < m.h && TL[m.tiles[y * m.w + x]].privy) privy = true; }
    const cover = [T.BUSH, T.TALLGRASS, T.REEDS, T.FERN].includes(t) || [T.TREE, T.PINE, T.BUSH].some((tt) => { for (const [dx, dy] of U.DIR8) { const x = P.x + dx, y = P.y + dy; if (x >= 0 && y >= 0 && x < m.w && y < m.h && m.tiles[y * m.w + x] === tt) return true; } return false; });
    const seen = m.ents.filter((x) => x.npc != null && !x.hostile && !x.asleep && U.dist(x.x, x.y, P.x, P.y) < 8 && (!E.Ent.sees || E.Ent.sees(x)));
    P.need = 0;
    Gm.rmFx('bursting');
    Gm.cnt('relieved');
    if (privy) Gm.msg('Ты заходишь в нужник. Скрипит дверь. Пахнет как положено.', '#b0a080');
    else if (TL[t].indoor) {
      Gm.msg('Прямо в доме?! Хозяева этого не забудут.', '#d08080');
      if (m.sett >= 0) G.S.sett[m.sett].rep = Math.max(-100, (G.S.sett[m.sett].rep || 0) - 5);
      Gm.cnt('indoor_shame');
    } else if (seen.length && !Gm.night() && !cover) {
      Gm.msg('Тебя видят. Кто-то возмущённо кричит, кто-то смеётся.', '#d0a0a0');
      if (m.sett >= 0) G.S.sett[m.sett].rep = Math.max(-100, (G.S.sett[m.sett].rep || 0) - 2);
      Gm.fx('ashamed', 240);
      const guard = seen.find((x) => x.guard);
      if (guard && P.gold >= 3) { P.gold -= 3; Gm.msg('Стражник берёт штраф: три медяка «за непотребство».', '#d0a0a0'); }
    } else Gm.msg(cover ? 'Ты отходишь в кусты.' : 'Ты отходишь в сторону.', '#b0a080');
    Gm.endTurn(3);
  };
  // умыться и постирать: смывает конфуз
  Gm.wash = function () {
    const P = G.P;
    if (!Gm.nearWater(P.x, P.y, 1)) { Gm.msg('Здесь нечем умыться.'); return; }
    Gm.rmFx('soiled');
    Gm.msg('Ты умываешься и полощешь одежду. Холодно, зато чисто.', '#90c0e0');
    if (Gm.coldLevel() >= 1) Gm.fx('cold', 60);
    Gm.endTurn(10);
  };

  // ---------- еда и питьё меняют жажду и нужду ----------
  const THIRST = { apple: -8, berries: -6, stew: -18, ale: -25, milk: -35, kvass: -40, honey: 4, rusk: 6, cheese: 4, fish_cooked: 3, meat_cooked: 4, pie: 2, bread: 3, star_jelly: -10 };
  const eat0 = Gm.eat;
  Gm.eat = function (it) {
    const b = D.items[it.b] || {};
    const r = eat0.call(this, it);
    if (G.P.dead) return r;
    Gm.needAdd((b.food || 0) * 0.22);
    const th = b.thirst != null ? b.thirst : THIRST[it.b];
    if (th) Gm.thirstAdd(th);
    return r;
  };
  const drink0 = Gm.drink;
  Gm.drink = function (it) { const r = drink0.call(this, it); if (!G.P.dead) Gm.thirstAdd(-10); return r; };
  const drinkFrom0 = Gm.drinkFrom;
  Gm.drinkFrom = function (it) {
    const had = !!it.water, base = D.items[it.b] || {};
    if (had && base.sips) {
      // бурдюк: несколько глотков
      it.sips = it.sips == null ? base.sips : it.sips;
      it.sips--;
      Gm.msg('Ты делаешь глоток из бурдюка.' + (it.sips > 0 ? '' : ' Он пуст.'));
      Gm.thirstAdd(-40);
      if (it.sips <= 0) { it.water = null; it.sips = null; }
      Gm.endTurn(1);
      return;
    }
    const r = drinkFrom0.call(this, it);
    if (had && !it.water) Gm.thirstAdd(-45);
    if (!had && it.water && base.sips) it.sips = base.sips;
    return r;
  };
  const fill0 = Gm.fill;
  Gm.fill = function (it) { const r = fill0.call(this, it); const base = D.items[it.b] || {}; if (it.water && base.sips) it.sips = base.sips; return r; };

  // ---------- каждый час ----------
  const hour0 = Gm.playerHour;
  Gm.playerHour = function () {
    hour0.apply(this, arguments);
    if (G.P && !G.P.dead && !G.P.ended) needsHour();
  };
})(window.EOF);

// Новый герой одет по слоям и с кошельком; старые сохранения получают кошелёк и новые места для одежды
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, Items = E.Items;
  const newPlayer0 = Gm.newPlayer;
  Gm.newPlayer = function (name, sex) {
    const P = newPlayer0.apply(this, arguments);
    Gm.ensureSlots(P);
    const rags = P.inv.find((i) => i.b === 'rags');
    if (rags) Gm.removeItem(rags);
    for (const b of ['under_linen', 'tunic', sex === 'f' ? 'skirt' : 'trousers', 'shoes_bast']) { const it = Items.make(b); P.inv.push(it); P.eq[D.items[b].s] = it; }
    P.thirst = 10; P.need = 5;
    Gm.attachPurse(P);
    Gm.calc();
    return P;
  };
  // после загрузки вещи «на тебе» — те же, что в сумке (JSON разрывает эту связь)
  Gm.relinkEq = function (P) {
    for (const s in P.eq) { const it = P.eq[s]; if (it && it.u != null) { const inv = P.inv.find((x) => x.u === it.u); if (inv) P.eq[s] = inv; } }
  };
  const load0 = E.Save.load;
  E.Save.load = function () {
    const ok = load0.apply(this, arguments);
    if (ok && G.P) {
      Gm.attachPurse(G.P); Gm.ensureSlots(G.P); Gm.relinkEq(G.P);
      if (G.P.thirst == null) G.P.thirst = 10;
      if (G.P.need == null) G.P.need = 5;
      Gm.calc();
    }
    return ok;
  };
})(window.EOF);
