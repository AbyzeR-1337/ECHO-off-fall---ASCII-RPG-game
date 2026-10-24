'use strict';
// Знание: что герой знает о мире, о вещах и о том, что с ним происходит.
// — Окно «Статистика мира» растёт вместе со знанием: новые строки появляются, когда узнаёшь новое.
// — Описание вещи или эффекта (при наведении мышью, а на телефоне — у выбранной строки)
//   говорит, что вещь делает, только когда ты это узнал[а]: съел[а], выпил[а], надел[а], купил[а].
(function (E) {
  const U = E.U, D = E.D, G = E.G, Gm = E.Gm, UI = E.UI, Items = E.Items, Time = E.Time;
  const COL = UI.COL;
  const STATN = E.STATN;

  // ============================================================
  // Что известно о вещах и эффектах
  // ============================================================
  const kn = () => { const P = G.P; P.known.items = P.known.items || {}; P.known.fx = P.known.fx || {}; return P.known; };
  Gm.learnItem = function (it, silent) {
    if (!it || !G.P) return;
    const k = kn(), b = it.b;
    if (!b || k.items[b]) return;
    k.items[b] = G.S.time;
    if (!silent && (D.items[b] || {}).t !== 'misc') Gm.msg('Теперь ты знаешь, что делает ' + Items.name(it).toLowerCase() + '.', '#a0c0e0');
  };
  Gm.itemKnown = (it) => !!(G.P && kn().items[it.b]);
  Gm.fxKnown = (id) => !!(G.P && kn().fx[id]);
  // мелочь, которой пользуется всякий, понятна сразу
  const OBVIOUS = new Set(['knife', 'bread', 'old_mug', 'torch', 'rope', 'flint', 'apple', 'berries', 'tunic', 'trousers', 'skirt', 'under_linen', 'shoes_bast', 'waterskin', 'candle', 'cheese', 'rusk']);

  // описание вещи: как выглядит — всегда; что делает — только если знаешь
  UI.itemTip = function (it) {
    if (!it) return null;
    const base = D.items[it.b] || {};
    const known = Gm.itemKnown(it) || OBVIOUS.has(it.b);
    const L = [Items.name(it)];
    const d = it.d || base.d;
    if (d) L.push(d);
    const tt = { weapon: 'Оружие', armor: 'Одежда', food: 'Еда', potion: 'Снадобье', mat: 'Материал', tool: 'Инструмент', book: 'Книга', trinket: 'Украшение', misc: 'Вещь', art: 'Вещь' }[it.t || base.t] || 'Вещь';
    const slot = (it.s || base.s) && D.SLOTS ? (D.SLOTS.find((q) => q[0] === (it.s || base.s)) || [])[1] : null;
    L.push(tt + (slot ? ' — ' + slot.toLowerCase() : ''));
    const parts = [];
    if (known) {
      if (it.dmg) parts.push('урон ' + it.dmg[0] + '–' + it.dmg[1]);
      if (it.def) parts.push('защита ' + it.def);
      if (it.warm) parts.push('тепло ' + it.warm);
      if (it.range) parts.push('дальность ' + it.range);
      if (it.mods) for (const k in it.mods) parts.push(STATN[k] + ' ' + (it.mods[k] > 0 ? '+' : '') + it.mods[k]);
      if (base.food) parts.push('сытость +' + base.food);
      const th = base.thirst;
      if (th) parts.push(th < 0 ? 'утоляет жажду' : 'вызывает жажду');
      if (base.heal) parts.push('лечит ' + base.heal);
      if (base.mp) parts.push('дух +' + base.mp);
      if (base.cure) parts.push('снимает: ' + ((D.effects[base.cure] || {}).n || base.cure).toLowerCase());
      if (base.eff) parts.push('даёт: ' + ((D.effects[base.eff] || {}).n || base.eff).toLowerCase() + (base.dur ? ' (' + Math.round(base.dur / 60) + ' ч)' : ''));
      if (base.cont) parts.push(base.sips ? 'вмещает ' + base.sips + ' глотка' : 'в неё можно набрать воды');
      if (base.tool) parts.push('инструмент');
      if (parts.length) L.push('Что делает: ' + parts.join(', ') + '.');
    } else {
      const hasUse = it.dmg || it.def || it.warm || it.mods || base.food || base.heal || base.eff || base.cure || base.mp || it.art || it.uq != null;
      if (hasUse) L.push('Что эта вещь делает — ты пока не знаешь. Попробуй — или спроси знающего.');
    }
    L.push('Вес ' + (Math.round((it.w || 0) * (it.q || 1) * 10) / 10) + (it.mw ? ', износ ' + Math.max(0, Math.round(100 - 100 * it.wr / it.mw)) + '%' : '') + (it.v ? ', цена около ' + Gm.money(it.v, true) : ''));
    if (it.hist && known) L.push(it.hist[0]);
    return L;
  };
  // описание эффекта: название — всегда, суть — когда прочувствуешь
  UI.fxTip = function (id) {
    const d = D.effects[id];
    if (!d) return null;
    const L = [d.n];
    const f = G.P.fx.find((x) => x.id === id);
    if (Gm.fxKnown(id)) {
      L.push(d.d);
      const m = d.mods ? Object.keys(d.mods).map((k) => STATN[k] + ' ' + (d.mods[k] > 0 ? '+' : '') + d.mods[k]) : [];
      if (m.length) L.push(m.join(', ') + '.');
      if (f && f.until < 1e14) { const h = Math.max(1, Math.round((f.until - G.S.time) / 60)); L.push('Пройдёт через ' + h + ' ' + U.plural(h, 'час', 'часа', 'часов') + '.'); }
    } else L.push('Что это с тобой — ты пока не понимаешь. Поймёшь, когда проживёшь с этим подольше.');
    return L;
  };

  // учимся, пользуясь вещами
  const wrapLearn = (name, pick) => { const f0 = Gm[name]; if (!f0) return; Gm[name] = function () { const it = pick ? pick.apply(null, arguments) : arguments[0]; const r = f0.apply(this, arguments); if (it && it.b && G.P && !G.P.dead) Gm.learnItem(it); return r; }; };
  wrapLearn('eat'); wrapLearn('drink'); wrapLearn('equip'); wrapLearn('read'); wrapLearn('drinkFrom');
  // купленное: торговец рассказал, что это
  if (E.Dlg && E.Dlg.buy) { const b0 = E.Dlg.buy; E.Dlg.buy = function (e, it) { const r = b0.apply(this, arguments); if (r) Gm.learnItem(it, true); return r; }; }
  // эффекты понимаешь, прожив с ними: телесные — за полчаса, благословения и проклятия — за полдня или когда отпустит
  const tick0 = Gm.playerHour;
  Gm.playerHour = function () {
    tick0.apply(this, arguments);
    const P = G.P;
    if (!P || P.dead) return;
    const k = kn();
    for (const f of P.fx) {
      const d = D.effects[f.id];
      if (!d || k.fx[f.id]) continue;
      const need = d.kind === 'state' ? 30 : 720;
      if (G.S.time - (f.t0 || G.S.time) >= need) { k.fx[f.id] = G.S.time; Gm.msg('Ты понимаешь, что с тобой: ' + d.n.toLowerCase() + '.', '#a0c0e0'); }
    }
  };
  const rm0 = Gm.rmFx;
  Gm.rmFx = function (id) { if (G.P && G.P.fx.some((f) => f.id === id)) kn().fx[id] = kn().fx[id] || G.S.time; return rm0.apply(this, arguments); };
  // с чем родился — знаешь
  const np0 = Gm.newPlayer;
  Gm.newPlayer = function () { const P = np0.apply(this, arguments); kn(); for (const it of P.inv) P.known.items[it.b] = 1; return P; };

  // ============================================================
  // Подсказка у мыши (или у выбранной строки на телефоне)
  // ============================================================
  UI.drawTip = function (t, lines, ax, ay, side) {
    if (!lines || !lines.length) return;
    const W = Math.min(46, t.cols - 2);
    const wl = [];
    lines.forEach((l, i) => { for (const w of U.wrap(Gm.fmt(l), W - 4)) wl.push([w, i === 0 ? COL.title : i === 1 ? COL.text : COL.dim]); });
    const H = Math.min(t.rows - 2, wl.length + 2);
    let x = side === 'left' ? ax - W - 1 : ax + 2, y = ay + 1;
    if (x + W > t.cols) x = Math.max(0, ax - W - 1);
    if (x < 0) x = Math.max(0, t.cols - W);
    if (y + H > t.rows) y = Math.max(0, t.rows - H);
    t.box(x, y, W, H, '#8a7a5a', '#16121e');
    wl.slice(0, H - 2).forEach(([l, c], i) => t.text(x + 2, y + 1 + i, l, c, '#16121e', W - 4));
  };
  // над чем мышь — подсказка (UI.render зовёт перед выводом)
  UI.hoverTip = function (t) {
    if (!UI.mouse) return;
    const h = t.hit(UI.mouse[0], UI.mouse[1]);
    if (!h || !h.data || !h.data.tip) return;
    const lines = typeof h.data.tip === 'function' ? h.data.tip() : h.data.tip;
    UI.drawTip(t, lines, UI.mouse[0], UI.mouse[1]);
  };

  // ============================================================
  // Статистика мира: только то, что ты знаешь
  // ============================================================
  UI.worldStats = function () {
    const P = G.P, W = G.W, S = G.S, c = P.c;
    const L = [];
    const H = (s) => { L.push(''); L.push([s, COL.title]); };
    const row = (k, v, col) => L.push([U.pad(Gm.fmt(k), 27) + v, col || COL.text]);
    // ---- ты ----
    H('Ты');
    row('Имя', P.name + (P.goddess ? ' (имя дала ' + P.goddess.n + ')' : ''));
    row('Возраст', Gm.age() + ' ' + U.plural(Gm.age(), 'год', 'года', 'лет'));
    row('Путь', P.cls ? D.classes[P.cls].n + ' ' + U.roman(P.rank[P.cls] || 1) : 'нет');
    row('Прожито дней', String(Time.day(S.time) - P.startDay));
    row('Одежда', Gm.fmt(Gm.dressName()));
    row('Кошелёк', Gm.purseStr());
    row('Сытость / жажда / нужда', Math.round(P.hunger) + ' / ' + Math.round(P.thirst || 0) + ' / ' + Math.round(P.need || 0));
    if (P.prayers.length) row('Молитв знаешь', String(P.prayers.length));
    if (Object.keys(P.langs || {}).length) row('Языки', Object.keys(P.langs).map((l) => D.langs[l] + ' ' + P.langs[l]).join(', '));
    if (Object.keys(P.known.recipes || {}).length) row('Рецептов', String(Object.keys(P.known.recipes).length));
    const items = Object.keys((P.known.items) || {}).length, fx = Object.keys(P.known.fx || {}).length;
    if (items) row('Понятых вещей', String(items));
    if (fx) row('Понятых состояний', String(fx));
    // ---- мир ----
    H('Мир');
    if (P.goddess) row('Богиня мира', P.goddess.n + ', ' + P.goddess.e.toLowerCase());
    row('Год', Time.year(S.time) + ' после Падения');
    const kr = Object.keys(P.known.regions || {}).map(Number);
    row('Земель повидано', String(kr.length) + ((c.regions || 0) >= 10 ? ' из ' + W.regions.length : ''));
    if (kr.length) {
      const bs = [...new Set(kr.map((id) => W.regions[id] && W.regions[id].biome).filter(Boolean))].map((b) => (D.biomes[b] || {}).n).filter(Boolean);
      if (bs.length) row('Видел[|а] края', bs.join(', '), COL.dim);
    }
    const ks = W.settlements.filter((st) => P.known.regions[st.region] != null && st.type !== 'vanish');
    if (ks.length) {
      row('Поселений знаешь', String(ks.length));
      const ruined = ks.filter((st) => S.sett[st.id].destroyed);
      if (ruined.length) row('Из них в руинах', ruined.map((st) => st.nom).join(', '), '#c0a0a0');
      const rep = ks.filter((st) => S.sett[st.id].rep).map((st) => st.nom + ' ' + (S.sett[st.id].rep > 0 ? '+' : '') + Math.round(S.sett[st.id].rep));
      if (rep.length) row('Как к тебе относятся', rep.slice(0, 6).join(', '));
    }
    // державы — по поселениям, где ты бывал[а]
    const facs = [...new Set(ks.map((st) => st.fac).filter((f) => f >= 0))];
    if (facs.length) {
      H('Державы');
      for (const f of facs) {
        const fd = W.factions[f], fs = S.fac[f];
        const ruler = fs && fs.ruler >= 0 && Gm.knows(fs.ruler) ? Gm.npc(fs.ruler).first : null;
        const wars = fs ? Object.keys(fs.war || {}).map(Number).filter((g) => facs.includes(g) || (c.rumors || 0) >= 3).map((g) => W.factions[g].short) : [];
        row(fd.name, (fs && !fs.alive ? 'пала' : ruler ? 'правит ' + ruler : 'правителя не знаешь') + (wars.length ? '; воюет с ' + wars.join(', ') : ''), fd.color);
      }
    }
    // люди
    const kNpc = Object.keys(P.known.npc || {});
    if (kNpc.length) {
      H('Люди');
      const named = kNpc.filter((id) => Gm.knows(+id));
      row('Встречено', String(kNpc.length) + (named.length ? ', по имени — ' + named.length : ''));
      const friends = named.filter((id) => Gm.opinion(+id) > 30).map((id) => Gm.npc(+id).first);
      const foes = named.filter((id) => Gm.opinion(+id) < -30).map((id) => Gm.npc(+id).first);
      const dead = named.filter((id) => !E.Sim.isAlive(+id)).map((id) => Gm.npc(+id).first);
      if (friends.length) row('Друзья', friends.slice(0, 8).join(', '), '#a0e0a0');
      if (foes.length) row('Недруги', foes.slice(0, 8).join(', '), '#e0a0a0');
      if (dead.length) row('Ушли из жизни', dead.slice(0, 8).join(', '), COL.dim);
    }
    // слухи и события
    const rum = Object.values(P.known.rumors || {});
    const evs = (S.ev || []).filter((e) => { const d = D.events[e.id]; return d && (d.scope === 'global' || (e.r != null && P.known.regions[e.r] != null)); });
    if (rum.length || evs.length) {
      H('Что творится');
      if (evs.length) row('Сейчас в мире', [...new Set(evs.map((e) => D.events[e.id].n))].join(', '), '#e0c080');
      if (rum.length) { row('Слухов', String(rum.length)); rum.slice(-3).reverse().forEach((r) => L.push(['  «' + r.s + '»', COL.dim])); }
    }
    // вера и тайны
    const gods = [...new Set(P.prayers.map((id) => W.prayers[id] && W.prayers[id].god).filter(Boolean))];
    if (gods.length || (c.shrines || 0) || Object.keys(P.secrets || {}).length || (c.bosses || 0) || (c.kills || 0)) {
      H('Пережитое');
      if (gods.length) row('Боги, чьи молитвы знаешь', gods.map((g) => (D.godById && D.godById[g] ? D.godById[g].n : g)).join(', '));
      if (c.kills) row('Убито', String(c.kills) + (c.npc_kills ? ', людей ' + c.npc_kills : ''));
      if (c.bosses) row('Великих повержено', String(c.bosses), '#ffc080');
      if (Object.keys(P.secrets || {}).length) row('Тайн раскрыто', String(Object.keys(P.secrets).length), '#d0b0ff');
      if (c.accidents) row('Конфузов', String(c.accidents), COL.dim);
    }
    L.push('');
    L.push(['Мир расскажет о себе больше, когда ты узнаешь больше.', COL.faint]);
    UI.textScreen('Статистика мира', L.map((l) => (Array.isArray(l) ? [Gm.fmt(l[0]), l[1]] : l)));
  };
})(window.EOF);
