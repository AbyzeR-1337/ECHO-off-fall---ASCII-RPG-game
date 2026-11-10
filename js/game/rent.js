'use strict';
// Аренда и бани:
//  • трактир: койка в общей зале, комната или лучшая комната — на ночь или на неделю; в снятой комнате —
//    сундук, где вещи никто не тронет; можно снять зал и закатить пир на весь город; помыться в бадье;
//  • заколоченные дома сдаются внаём: на неделю или месяц — под жильё (кровать и свой сундук) или под лавку
//    (что положишь в сундук, то за день-другой разойдётся по городу); срок вышел — дом снова заколачивают,
//    но вещи ждут;
//  • баня: попариться, окунуться в ледяную купель, банщик с веником.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, UI = E.UI, Ent = E.Ent, Dlg = E.Dlg, Items = E.Items, Time = E.Time;
  const RN = E.Rent = {};
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const fx = (id, n, d, o) => { if (!D.effects[id]) D.effects[id] = Object.assign({ id, n, kind: 'bless', d }, o); };
  fx('wellrested', 'Хорошо выспал[ся|ась]', 'Мягкая постель, тишина, никто не храпит. Голова ясная, тело лёгкое.', { mods: { con: 1, luck: 1, wil: 1 } });
  fx('steamed', 'Распаренный', 'После бани тело как новое: раны затягиваются, усталость ушла.', { mods: { con: 1 }, regen: 0.4 });
  fx('hardened', 'Закалка', 'После ледяной купели ни мороз, ни хворь не берут.', { mods: { wil: 1, con: 1 } });
  const day = () => Time.day(G.S.time);
  const S = () => { G.S.rent = G.S.rent || {}; G.S.stash = G.S.stash || {}; return G.S.rent; };
  const COL = UI.COL;
  // заколоченную дверь можно «использовать» — спросить, сдаётся ли дом
  if (T.BOARDED != null) TL[T.BOARDED].use = 1;

  // ---------- сундук ----------
  UI.stash = function (st, title) {
    UI.list({
      name: 'stash', title, keep: true, w: 70,
      header: () => 'В сундуке: ' + st.items.length + ' ' + U.plural(st.items.length, 'вещь', 'вещи', 'вещей') + '. Здесь их никто не тронет.',
      items: () => [{ t: '— Положить вещь из сумки —', c: COL.accent, put: 1 }].concat(st.items.map((it) => ({ t: Items.name(it), g: UI.itemGlyph(it), it }))),
      tip: (x) => (x.it ? UI.itemTip(x.it) : null),
      onSelect: (x) => {
        if (x.put) { UI.pickItem('Что положить в сундук?', (i) => !Object.values(G.P.eq).includes(i), (it) => { Gm.removeItem(it); st.items.push(it); Gm.msg('Убрано в сундук: ' + Items.name(it).toLowerCase() + '.', '#c8b890'); }); return 'keep'; }
        if (E.Bags && !E.Bags.roomFor(x.it)) { Gm.msg('Некуда положить — сумки полны.', '#e0a070'); return 'keep'; }
        st.items.splice(st.items.indexOf(x.it), 1);
        Gm.give(x.it, x.it.q, false);
        return 'keep';
      },
    });
  };

  // ---------- трактир ----------
  const sleepInn = (tier, nights) => {
    const P = G.P, m = G.map;
    const sp = m.spots.tavern || m.spots.pub;
    const bed = sp && sp.in.find((p) => m.tiles[p.y * m.w + p.x] === T.BED && !Gm.entAt(p.x, p.y));
    if (bed && tier > 0) { P.x = bed.x; P.y = bed.y; P.posX = bed.x + 0.5; P.posY = bed.y + 0.5; }
    UI.closeAll();
    Gm.rest(0, 7);
    if (P.dead) return;
    if (tier === 0 && Math.random() < 0.4) Gm.msg('Всю ночь кто-то храпел на соседней лавке. Выспал[ся|ась] так себе.', '#a09080');
    if (tier === 2) { Gm.fx('wellrested', 60 * 14); Gm.msg('Перина, чистое бельё, тёплый камин. Ты просыпаешься другим человеком.', '#e0d0a0'); }
  };
  RN.roomMenu = function (e) {
    const P = G.P, sid = E.Sim.settOf(e.npc), R = S();
    const s = G.W.settlements[sid], mul = s && s.type === 'capital' ? 1.5 : s && s.type === 'town' ? 1.2 : 1;
    const price = (v) => Math.round(v * mul);
    const pay = (v) => { if (P.gold < v) { Gm.msg('Не хватает монет.', '#e07070'); return false; } P.gold -= v; Gm.cnt('gold_spent', v); return true; };
    const week = (tier) => { const r = R['inn' + sid] = { until: G.S.time + 7 * 1440, tier }; Gm.msg('Комната твоя на неделю. Ключ на гвоздике, сундук под кроватью.', '#e0d0a0'); return r; };
    UI.menu('Хозяин вытирает кружку: «Койка в общей зале — дёшево и шумно. Комната — с замком и сундуком. Лучшая — с периной и камином».', [
      { t: 'Койка в общей зале на ночь (' + price(2) + ')', f: () => { if (pay(price(2))) sleepInn(0); } },
      { t: 'Комната на ночь (' + price(6) + ')', f: () => { if (pay(price(6))) sleepInn(1); } },
      { t: 'Лучшая комната на ночь (' + price(15) + ')', f: () => { if (pay(price(15))) sleepInn(2); } },
      { t: 'Комната на неделю — с сундуком (' + price(35) + ')', f: () => { if (pay(price(35))) week(1); } },
      { t: 'Лучшая комната на неделю (' + price(80) + ')', f: () => { if (pay(price(80))) week(2); } },
      { t: 'Передумать', f: () => {} },
    ]);
  };
  const op0 = Dlg.options;
  Dlg.options = function (e) {
    const o = op0.apply(this, arguments);
    try {
      if (!e || e.npc == null || e.hostile) return o;
      const job = E.Sim.job(e.npc), sid = E.Sim.settOf(e.npc);
      if (job !== 'innkeeper' || sid < 0) return o;
      const R = S(), r = R['inn' + sid];
      const i = o.findIndex((x) => /^Снять комнату на ночь/.test(x.t));
      const add = [{ t: 'Снять комнату…', f: () => { RN.roomMenu(e); return null; } }];
      if (r && r.until > G.S.time) {
        const left = Math.ceil((r.until - G.S.time) / 1440);
        add.push({ t: 'Отдохнуть в своей комнате (ещё ' + left + ' ' + U.plural(left, 'день', 'дня', 'дней') + ')', f: () => { sleepInn(r.tier); return null; } });
        add.push({ t: 'Мой сундук в комнате', f: () => { G.S.stash['inn' + sid] = G.S.stash['inn' + sid] || { items: [] }; UI.stash(G.S.stash['inn' + sid], 'Сундук в снятой комнате'); return null; } });
      } else if (G.S.stash && G.S.stash['inn' + sid] && G.S.stash['inn' + sid].items.length) {
        add.push({ t: 'Забрать вещи из сундука', f: () => { UI.stash(G.S.stash['inn' + sid], 'Твои вещи у хозяина'); return null; } });
      }
      const town = G.map && G.map.sett === sid;
      if (town && !(G.map.spots && G.map.spots.bath)) add.push({ t: 'Помыться в бадье (2 монеты)', f: () => { const P = G.P; if (P.gold < 2) return 'Две монеты за горячую воду.'; P.gold -= 2; Gm.rmFx('soiled'); Gm.fx('steamed', 60 * 6); Gm.endTurn(30); return 'Бадья, горячая вода, кусок щёлока. Грязь сходит пластами — и тебе снова хочется жить.'; } });
      add.push({ t: 'Снять зал и закатить пир (80 монет)', f: () => RN.feast(e) });
      if (i >= 0) o.splice(i, 1, ...add); else o.splice(Math.max(0, o.length - 1), 0, ...add);
    } catch (err) { console.warn('rent', err); }
    return o;
  };
  RN.feast = function () {
    const P = G.P, m = G.map;
    if (P.gold < 80) return 'Пир на весь город — восемьдесят монет. Меньше — это не пир, а ужин.';
    if (P.flags.feastDay === day()) return 'Пир уже гремит! Второй за день город не переживёт.';
    P.gold -= 80; P.flags.feastDay = day();
    let n = 0;
    for (const e of m.ents) if (e.npc != null && !e.dead && !e.hostile) { Gm.op(e.npc, 8); n++; }
    const s = G.W.settlements[m.sett];
    if (s && G.S.sett[m.sett]) { const ss = G.S.sett[m.sett]; ss.fame = (ss.fame || 0) + 1; }
    Gm.fx('feasted', 60 * 8); Gm.fx('merry', 60 * 10); Gm.cnt('feasts');
    if (Gm.xp) Gm.xp(20);
    Gm.endTurn(120);
    return 'Столы сдвигают, бочки выкатывают, музыканты настраивают гудки. До утра в трактире не смолкают песни — и ' + n + ' ' + U.plural(n, 'человек', 'человека', 'человек') + ' запомнят, кто угощал.';
  };

  // ---------- дом внаём ----------
  function bldOfDoor(m, i) { return (m.blds || []).find((b) => b.door && b.door.y * m.w + b.door.x === i); }
  const houseKey = (m, i) => 'h:' + m.key + ':' + i;
  RN.housePrice = (sid) => { const s = G.W.settlements[sid]; return s && s.type === 'capital' ? 50 : s && s.type === 'town' ? 30 : 15; };
  function chestIn(m, b) {
    const r = b.rect;
    for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) { const i = y * m.w + x; if (m.chests[i] && m.chests[i].own) return i; }
    for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
      const i = y * m.w + x;
      if (m.tiles[i] !== T.FLOOR && m.tiles[i] !== T.STONEFLOOR) continue;
      if (Math.abs(x - b.door.x) + Math.abs(y - b.door.y) <= 2) continue;
      Gm.setTile(x, y, T.CHEST);
      m.chests[i] = { items: [], opened: 1, own: 1 };
      return i;
    }
    return -1;
  }
  RN.rentHouse = function (m, i, days, purpose) {
    const P = G.P, R = S(), k = houseKey(m, i);
    const price = Math.round(RN.housePrice(m.sett) * (days >= 30 ? 3.4 : 1));
    if (P.gold < price) { Gm.msg('Не хватает монет: нужно ' + price + '.', '#e07070'); return; }
    P.gold -= price; Gm.cnt('gold_spent', price);
    const b = bldOfDoor(m, i);
    R[k] = { until: Math.max(G.S.time, (R[k] && R[k].until) || 0) + days * 1440, i, sid: m.sett, map: m.key, use: purpose, last: day() };
    Gm.setTile(i % m.w, Math.floor(i / m.w), T.DOOR);
    if (b) { b.boarded = 0; b.type = 'rented'; b.mine = 1; const ci = chestIn(m, b); if (ci >= 0) R[k].chest = ci; }
    Gm.msg(purpose === 'shop' ? 'Доски с двери сняты. Теперь это твоя лавка: что положишь в сундук, то разойдётся по городу.' : 'Доски с двери сняты. Дом твой на ' + days + ' ' + U.plural(days, 'день', 'дня', 'дней') + ': кровать, очаг и свой сундук.', '#e0d0a0');
    Gm.cnt('houses_rented');
    Gm.endTurn(5);
  };
  const iat0 = Gm.interactAt;
  Gm.interactAt = function (x, y) {
    const m = G.map, i = y * m.w + x;
    if (m && m.sett >= 0 && m.tiles[i] === T.BOARDED && m.kind === 'over' && !(G.S.sett[m.sett] && G.S.sett[m.sett].destroyed)) {
      const b = bldOfDoor(m, i);
      if (b) {
        const p = RN.housePrice(m.sett), R = S(), old = R[houseKey(m, i)];
        UI.menu('Заколоченный дом. На двери — выцветшая табличка: «Сдаётся. Спросить старосту». Староста, видно, давно сдал ключ трактирщику — но деньги берёт всякий, кто рядом.' + (old ? '\nЭтот дом ты уже снимал[|а] — твои вещи внутри.' : ''), [
          { t: 'Снять под жильё на неделю (' + p + ')', f: () => RN.rentHouse(m, i, 7, 'home') },
          { t: 'Снять под жильё на месяц (' + Math.round(p * 3.4) + ')', f: () => RN.rentHouse(m, i, 30, 'home') },
          { t: 'Снять под лавку на неделю (' + p + ')', f: () => RN.rentHouse(m, i, 7, 'shop') },
          { t: 'Уйти', f: () => {} },
        ]);
        return true;
      }
    }
    // баня: купель
    if (m && m.tiles[i] === T.BATH) { RN.bathe(); return true; }
    return iat0.apply(this, arguments);
  };
  // свой сундук не считается кражей
  const oc0 = Gm.openChest;
  Gm.openChest = function (i, x, y) {
    const c = G.map.chests[i];
    if (c && c.own) {
      const R = S(), k = Object.keys(R).find((q) => R[q].map === G.map.key && R[q].chest === i);
      const r = k ? R[k] : null;
      if (r && r.use === 'shop') {
        const gold = c.purse || 0;
        UI.menu('Твоя лавка. На прилавке — ' + c.items.length + ' ' + U.plural(c.items.length, 'вещь', 'вещи', 'вещей') + (gold ? ', в кассе — ' + gold + ' ' + U.plural(gold, 'монета', 'монеты', 'монет') : '') + '. Покупатели заходят днём.', [
          { t: 'Разложить или забрать товар', f: () => UI.stash(c, 'Товар в лавке') },
          { t: 'Забрать выручку', f: () => { if (!gold) { Gm.msg('Касса пуста.'); return; } G.P.gold += gold; c.purse = 0; Gm.msg('Выручка: +' + gold + ' ' + U.plural(gold, 'монета', 'монеты', 'монет') + '.', '#e8c860'); } },
          { t: 'Уйти', f: () => {} },
        ]);
        return;
      }
      UI.stash(c, 'Твой сундук');
      return;
    }
    return oc0.apply(this, arguments);
  };
  // каждый день: лавка торгует, сроки истекают
  RN.daily = function () {
    const R = S(), d = day(), m = G.map;
    for (const k in R) {
      const r = R[k];
      if (!k.startsWith('h:')) continue;
      // торговля: что лежит — расходится понемногу
      if (r.last == null) r.last = d;
      while (r.last < d) {
        r.last++;
        if (r.use !== 'shop' || r.until < r.last * 1440) continue;
        const dyn = G.S.maps[r.map], c = dyn && dyn.ch && dyn.ch[r.chest];
        if (!c) continue;
        for (const it of c.items.slice()) if (Math.random() < 0.3) { c.items.splice(c.items.indexOf(it), 1); c.purse = (c.purse || 0) + Math.max(1, Math.round((it.v || 1) * (it.q || 1) * (0.7 + Math.random() * 0.25))); c.sold = (c.sold || 0) + 1; }
      }
      // срок вышел — двери снова заколачивают (если ты не внутри)
      if (r.until < G.S.time && !r.closed) {
        if (m && m.key === r.map) { const P = G.P, b = bldOfDoor(m, r.i); if (b && P.x > b.rect.x && P.x < b.rect.x + b.rect.w - 1 && P.y > b.rect.y && P.y < b.rect.y + b.rect.h - 1) continue; Gm.setTile(r.i % m.w, Math.floor(r.i / m.w), T.BOARDED); }
        else if (G.S.maps[r.map]) G.S.maps[r.map].t[r.i] = T.BOARDED;
        r.closed = 1;
        Gm.msg('Срок аренды вышел — дом снова заколотили. Твои вещи ждут внутри, пока не снимешь снова.', '#c0a080');
      }
      if (r.until > G.S.time) r.closed = 0;
    }
  };
  let lastDay = -1;
  const tk0 = Gm.tick;
  Gm.tick = function () {
    const r = tk0.apply(this, arguments);
    try { const d = day(); if (d !== lastDay) { lastDay = d; RN.daily(); } } catch (e) { /* */ }
    return r;
  };

  // ---------- баня ----------
  RN.bathMenu = function () {
    const P = G.P;
    const paid = P.flags.bathDay === day();
    UI.menu('Банщик в льняной рубахе: «Пар сегодня лёгкий, веники свежие, купель ледяная — всё как положено».' + (paid ? '\nУплачено — купели твои до вечера.' : ''), [
      { t: 'Попариться (3 монеты)', f: () => { if (!paid) { if (P.gold < 3) { Gm.msg('Не хватает монет.'); return; } P.gold -= 3; P.flags.bathDay = day(); } RN.bathe(true); } },
      { t: 'Банщик с веником (5 монет)', f: () => { if (P.gold < 5) { Gm.msg('Не хватает монет.'); return; } P.gold -= 5; P.flags.bathDay = day(); Gm.fx('merry', 60 * 6); Gm.fx('steamed', 60 * 14); Gm.rmFx('soiled'); Gm.endTurn(60); Gm.msg('Веник свистит, банщик кряхтит, ты орёшь — и выходишь будто заново рожденн[ым|ой].', '#e0d0a0'); } },
      { t: 'Кружка кваса (2 монеты)', f: () => { if (P.gold < 2) return; P.gold -= 2; Gm.give('kvass'); } },
      { t: 'Уйти', f: () => {} },
    ]);
  };
  RN.bathe = function (fromMenu) {
    const P = G.P;
    if (P.flags.bathDay !== day()) { Gm.msg('Купели — за плату. Банщик у стойки при входе.', '#c0b090'); return; }
    if (!fromMenu && P.flags.bathPlunge === day()) { Gm.msg('Ещё раз в ледяную? Сердце не железное.', '#a0b0c0'); return; }
    Gm.rmFx('soiled');
    P.hp = Math.min(P.mhp, P.hp + Math.round(P.mhp * 0.3));
    P.mp = Math.min(P.mmp, P.mp + Math.round(P.mmp * 0.2));
    if (fromMenu) { Gm.fx('steamed', 60 * 12); Gm.endTurn(45); Gm.msg('Пар обжигает, камни шипят. Грязь, усталость и дорожная пыль уходят вместе с потом. Теперь — в купель!', '#e0c0a0'); return; }
    P.flags.bathPlunge = day();
    Gm.fx('hardened', 60 * 10);
    for (const id of ['drunk', 'tired', 'cold']) if (Gm.hasFx(id)) Gm.rmFx(id);
    Gm.endTurn(10);
    Gm.msg('Ты с головой уходишь в ледяную воду — и выныриваешь с воплем. Кровь кипит, в голове звенит ясность.', '#a0d0ff');
  };
  // стойка банщика
  const st0 = Gm.stall;
  Gm.stall = function (x, y) {
    const m = G.map;
    if (m && Gm.stallKind(m, x, y) === 'bath') { RN.bathMenu(); return; }
    return st0.apply(this, arguments);
  };
  const sn0 = Gm.stallName;
  Gm.stallName = function (m, x, y) { return Gm.stallKind(m, x, y) === 'bath' ? 'стойка банщика' : sn0.apply(this, arguments); };
})(window.EOF);
