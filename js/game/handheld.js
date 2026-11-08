'use strict';
// Что в руках — живёт своей жизнью.
//  • Еду и питьё берёшь в руку и подносишь ко рту: откусываешь (сухое крошится), отпиваешь (капли).
//    Пока ешь — можно идти; съедено — когда рука опустилась.
//  • Тряхнёшь кружку с водой (резко крутанёшь головой, прыгнешь, бежишь) — расплещешь; сухой хлеб в руке крошится.
//  • Фонарь со свечой: свеча понемногу сгорает (12 ч), свет тускнеет, потом гаснет — вставь новую (E на фонаре в сумке).
//  • Кристальный фонарь: холодный голубой свет, не боится воды и ветра, но кристалл выдыхается — подпитай маной или осколком.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, UI = E.UI, Items = E.Items;
  const H = E.Hold = { cur: null, emitQ: [], lastFrame: 0 };
  const item = (id, n, g, t, o) => { if (!D.items[id]) D.items[id] = Object.assign({ id, n, g, t, w: 1, v: 1, d: '' }, o); };
  item('crumbs', 'Хлебные крошки', 'p', 'food', { w: 0.05, v: 0, food: 4, st: 1, d: 'Всё, что осталось от хлеба, который трясли.' });
  item('lantern_crystal', 'Кристальный фонарь', 'm', 'tool', { s: 'hand', w: 1.2, v: 140, d: 'Кристалл в серебряной клетке. Холодный голубой свет — ни ветер, ни вода не страшны. Кристалл выдыхается: подпитывай маной или осколком.' });
  if (D.items.candle) Object.assign(D.items.candle, { n: 'Свеча', st: 1, d: 'Восковая свеча. В фонаре горит полдня.' });
  if (D.items.lantern) D.items.lantern.d = 'Свеча за стеклом в железной клетке. Светит ровно, но свеча сгорает за полдня — носи запасные.';
  const FUEL = { lantern: 720, lantern_crystal: 1440 };
  const isLamp = (it) => !!(it && FUEL[it.b]);
  const fuelOf = (it) => (it.fuel == null ? FUEL[it.b] : it.fuel);
  H.fuelK = (it) => (isLamp(it) ? U.clamp(fuelOf(it) / FUEL[it.b], 0, 1) : 1);
  // насколько ярко светит вещь в руке: 0 — погасла
  H.glowK = (it) => { if (!isLamp(it)) return 1; const f = fuelOf(it); if (f <= 0) return 0; return it.b === 'lantern' ? 0.45 + 0.55 * Math.min(1, f / 240) : 0.3 + 0.7 * Math.min(1, f / 480); };
  const heldLamps = () => { const P = G.P; return P ? [P.eq.hand, P.eq.off].filter(isLamp) : []; };
  Gm.lanternHeld = () => heldLamps().some((it) => fuelOf(it) > 0);
  // свет фонаря для 3D: цвет, радиус, сила
  Gm.lanternLight = function () {
    const l = heldLamps().find((it) => fuelOf(it) > 0);
    if (!l) return null;
    const k = H.glowK(l);
    if (l.b === 'lantern_crystal') return { col: [0.55, 0.8, 1], r: 4 + 3.5 * k, i: 1.3 * k, crystal: 1 };
    return { col: [1, 0.8, 0.52], r: 3.5 + 3.5 * k, i: 1.25 * k * (0.92 + 0.08 * Math.sin(performance.now() / 90)) };
  };
  // имя в сумке: сколько осталось
  const name0 = Items.name;
  Items.name = function (it) {
    const n = name0.apply(this, arguments);
    if (!isLamp(it)) return n;
    const f = fuelOf(it);
    if (it.b === 'lantern') return n + (f > 0 ? ' (свеча: ' + Math.ceil(f / 60) + ' ч)' : ' (свеча догорела)');
    return n + (f > 0 ? ' (заряд: ' + Math.ceil(f / 60) + ' ч)' : ' (кристалл погас)');
  };
  // горит, пока в руке
  let lastT = null;
  function burn() {
    const P = G.P;
    if (!P || !G.S) return;
    const now = G.S.time;
    if (lastT == null || now < lastT || now - lastT > 1440 * 3) { lastT = now; return; }
    const dt = now - lastT;
    if (dt <= 0) return;
    lastT = now;
    for (const it of heldLamps()) {
      const f0 = fuelOf(it);
      if (f0 <= 0) continue;
      const f = Math.max(0, f0 - dt);
      it.fuel = f;
      if (it.b === 'lantern') {
        if (f0 > 60 && f <= 60) Gm.msg('Свеча в фонаре догорает — огонёк едва держится.', '#d0a060');
        if (f <= 0) { Gm.msg('Свеча догорела. Фонарь погас.' + (Gm.has('candle') ? ' В сумке есть свеча — вставь новую.' : ''), '#a08060'); Gm.calc && Gm.calc(); }
      } else {
        if (f0 > 120 && f <= 120) Gm.msg('Кристалл тускнеет — скоро нужна подпитка.', '#90b0e0');
        if (f <= 0) { Gm.msg('Кристалл погас. Подпитай его маной или осколком.', '#8090b0'); Gm.calc && Gm.calc(); }
      }
    }
  }
  const tk0 = Gm.tick;
  Gm.tick = function () { const r = tk0.apply(this, arguments); try { burn(); } catch (e) { /* */ } return r; };

  // фонарь в сумке: свеча, мана, осколок
  function lampMenu(it) {
    const P = G.P, items = [];
    if (it.b === 'lantern') {
      items.push({ t: 'Вставить новую свечу' + (Gm.has('candle') ? ' (свечи: ' + Gm.count('candle') + ')' : ' — нет свечи'), f: () => {
        if (!Gm.has('candle')) { Gm.msg('Свечи нет. Свечи продают в лавках и храмах.'); return 'keep'; }
        Gm.take('candle', 1); it.fuel = FUEL.lantern; UI.pop(); Gm.msg('Ты вставляешь свежую свечу. Фонарь снова светит ровно.', '#ffd890'); Gm.endTurn(1); return 'keep';
      } });
    } else {
      items.push({ t: 'Подпитать маной — 10 ОМ за 4 часа света (ОМ: ' + Math.floor(P.mp) + ')', f: () => {
        if (P.mp < 10) { Gm.msg('Не хватает маны.'); return 'keep'; }
        P.mp -= 10; it.fuel = Math.min(FUEL.lantern_crystal, fuelOf(it) + 240); Gm.msg('Мана стекает с пальцев в кристалл. Он теплеет голубым.', '#a0d0ff'); Gm.endTurn(1); return 'keep';
      } });
      items.push({ t: 'Вставить осколок маны — полный заряд' + (Gm.has('mana_shard') ? ' (осколки: ' + Gm.count('mana_shard') + ')' : ' — нет осколка'), f: () => {
        if (!Gm.has('mana_shard')) { Gm.msg('Осколка маны нет.'); return 'keep'; }
        Gm.take('mana_shard', 1); it.fuel = FUEL.lantern_crystal; UI.pop(); Gm.msg('Осколок тает в кристалле. Свет — как в первый день.', '#c0e0ff'); Gm.endTurn(1); return 'keep';
      } });
    }
    const slot = P.eq.hand === it ? 'hand' : P.eq.off === it ? 'off' : null;
    if (!slot && Gm.equip) items.push({ t: 'Взять в руку', f: () => { UI.pop(); Gm.equip(it); return 'keep'; } });
    UI.list({ title: Items.name(it), items });
  }

  // ---------- еда и питьё в руке ----------
  const DRY = /bread|rusk|pie|jerky|hazelnut|burnt|crumbs|cheese|dates|mushroom_fried/;
  const consumable = (it) => { const d = D.items[it.b] || {}; return d.t === 'food' || d.t === 'potion' || it.t === 'potion' || !!(it.cont && it.water); };
  const drinkish = (it) => { const d = D.items[it.b] || {}; return d.t === 'potion' || d.drink || it.drink || !!(it.cont && it.water); };
  H.dry = (it) => !!it && !drinkish(it) && (DRY.test(it.b) || (it.b === 'dish' && (it.ing || []).some((b) => /rye|bread|rusk/.test(b))));
  // как выглядит в руке: кружка, бутылка, хлеб, пучок
  H.spriteOf = function (it) {
    const d = D.items[it.b] || {};
    if (d.t === 'potion' || it.cont) return it;
    if (drinkish(it)) return { b: 'old_mug' };
    if (d.herb || /berr|mushroom|shroom|onion|lingon|blueb|cloudb|seaweed/.test(it.b)) return { b: 'mushrooms' };
    return { b: 'bread' };
  };
  // живой ли кадр от первого лица: рука рисовалась только что
  H.live = () => !!(E.RT && E.RT.on && G.P && !G.P.dead && performance.now() - H.lastFrame < 1500 && !window.EOF_TEST_MG && !H.off);
  H.start = function (it, done) {
    const drink = drinkish(it);
    const c = H.cur = { it, spr: H.spriteOf(it), drink, dry: H.dry(it), t0: performance.now(), dur: drink ? 1300 : 1550, done, bites: 0, fin: false };
    setTimeout(() => H.finish(c), c.dur + 400);
    UI.animUntil = Math.max(UI.animUntil || 0, performance.now() + c.dur + 100);
    return c;
  };
  H.finish = function (c) {
    c = c || H.cur;
    if (!c || c.fin) return;
    c.fin = true;
    if (H.cur === c) H.cur = null;
    try { c.done(); } catch (e) { console.error(e); }
    UI.render && UI.render();
  };
  // каждый кадр (из отрисовки руки): фаза, укусы, конец
  H.frame = function (now) {
    H.lastFrame = now;
    const c = H.cur;
    if (!c) return null;
    const ph = (now - c.t0) / c.dur;
    if (ph >= 1) { H.finish(c); return null; }
    // поднести → есть/пить → опустить
    const up = ph < 0.28 ? ph / 0.28 : ph > 0.82 ? (1 - ph) / 0.18 : 1;
    const e = up * up * (3 - 2 * up);
    let bob = 0, tilt = 0;
    if (c.drink) tilt = ph > 0.28 && ph < 0.82 ? Math.sin((ph - 0.28) / 0.54 * Math.PI) : 0;
    else {
      const bites = ph > 0.3 ? Math.min(3, Math.floor((ph - 0.3) / 0.17) + 1) : 0;
      if (bites > c.bites && ph < 0.82) { c.bites = bites; if (c.dry) H.emitQ.push({ k: 'crumb', n: 5 + Math.floor(Math.random() * 4) }); }
      bob = ph > 0.3 && ph < 0.82 ? Math.abs(Math.sin((ph - 0.3) / 0.17 * Math.PI)) : 0;
    }
    if (c.drink && ph > 0.4 && ph < 0.75 && Math.random() < 0.08) H.emitQ.push({ k: 'drop', n: 1 });
    return { it: c.spr, e, bob, tilt, drink: c.drink, ph };
  };
  const use0 = Gm.use;
  Gm.use = function (it) {
    if (it && isLamp(it)) { lampMenu(it); return; }
    if (!it || H.cur || !consumable(it) || !H.live()) return use0.apply(this, arguments);
    const P = G.P;
    // окна закрываются: еду — в руку
    while (UI.stack.length > 1 && UI.top() && UI.top().name !== 'game') UI.pop();
    H.start(it, () => {
      if (!P.inv.includes(it) || P.dead) return;
      use0.call(Gm, it);
      for (const s of ['hand', 'off']) if (P.eq[s] && !P.inv.includes(P.eq[s])) P.eq[s] = null;
    });
  };

  // ---------- тряска: расплескать, раскрошить ----------
  let lastSpill = 0;
  H.shake = function (rate, dt) {
    const P = G.P;
    if (!P || P.dead || !(rate > 0) || !(dt > 0)) return;
    const over = Math.max(0, rate - 4.5);
    if (!over) return;
    const held = [P.eq.hand, P.eq.off].filter(Boolean);
    if (H.cur && P.inv.includes(H.cur.it)) held.push(H.cur.it);
    for (const it of held) {
      const d = D.items[it.b] || {};
      const liquid = (it.cont && it.water) || (d.t === 'food' && d.drink);
      if (liquid) {
        it.slosh = (it.slosh || 0) + over * dt;
        if (Math.random() < over * dt * 2) H.emitQ.push({ k: 'drop', n: 2 + Math.floor(over) });
        if (it.slosh > 3) {
          it.slosh = 0;
          if (it.cont) {
            const base = D.items[it.b] || {};
            if (base.sips) { it.sips = (it.sips == null ? base.sips : it.sips) - 1; if (it.sips <= 0) { it.water = null; it.sips = null; } }
            else if (it.b !== 'holy_vessel') it.water = null;
          } else if ((it.q || 1) > 1) it.q--; else { Gm.removeItem(it); for (const s of ['hand', 'off']) if (P.eq[s] === it) P.eq[s] = null; }
          if (performance.now() - lastSpill > 3000) { lastSpill = performance.now(); Gm.msg(it.cont ? (it.water ? 'Вода плещет через край — часть пролилась.' : 'Расплескал всё до капли.') : 'Выплеснулось через край: ' + d.n.toLowerCase() + '.', '#80b0e0'); }
          H.emitQ.push({ k: 'drop', n: 10 });
        }
      } else if (H.dry(it) && d.t === 'food') {
        it.crumb = (it.crumb || 0) + over * dt;
        if (Math.random() < over * dt * 2.5) H.emitQ.push({ k: 'crumb', n: 2 + Math.floor(over / 2) });
        if (it.crumb > 6) {
          it.crumb = 0;
          if ((it.q || 1) > 1) it.q--; else { Gm.removeItem(it); for (const s of ['hand', 'off']) if (P.eq[s] === it) P.eq[s] = null; }
          Gm.give('crumbs', 1, true);
          if (performance.now() - lastSpill > 3000) { lastSpill = performance.now(); Gm.msg('Сухой хлеб крошится в руке — остались крошки.', '#c8b080'); }
        }
      }
    }
  };

  // ---------- где взять ----------
  const SH = E.Dlg && E.Dlg.SHOP;
  if (SH) {
    if (SH.general) SH.general.push('candle', 'candle');
    if (SH.magic) SH.magic.push('lantern_crystal');
    if (SH.tools) SH.tools.push('candle');
  }
  const CR = E.Crafts && E.Crafts.recipes;
  if (CR && CR.JEWELER) CR.JEWELER.list.push(['lantern_crystal', 1, { crystal: 2, silver_nugget: 1, mana_shard: 1 }, 5]);
})(window.EOF);
