'use strict';
// Экраны: меню, инвентарь, персонаж, разговоры, торговля, карта, память, концовки.
(function (E) {
  const U = E.U, D = E.D, T = E.T, TL = E.TL, Time = E.Time, C = E.C;
  const G = E.G, Gm = E.Gm, UI = E.UI, Items = E.Items, Dlg = E.Dlg;
  const COL = UI.COL;
  const fmt = (s, n) => Gm.fmt(s, n);

  // ---------- общий список ----------
  UI.list = function (o) {
    const s = {
      name: o.name || 'list', o, sel: o.sel || 0, scroll: 0,
      draw(t, top) {
        const items = typeof o.items === 'function' ? o.items() : o.items;
        s.items = items;
        const W = Math.min(t.cols - 2, o.w || 72);
        const header = typeof o.header === 'function' ? o.header() : o.header;
        const hl = header ? U.wrap(fmt(header), W - 4) : [];
        const maxH = t.rows - 2;
        const listH = Math.max(3, Math.min(items.length, maxH - hl.length - 5 - (o.footer ? 1 : 0)));
        const H = Math.min(maxH, hl.length + listH + 4 + (hl.length ? 1 : 0) + (o.footer ? 1 : 0));
        const x0 = Math.floor((t.cols - W) / 2), y0 = Math.max(0, Math.floor((t.rows - H) / 2));
        t.box(x0, y0, W, H, COL.border, COL.panel, o.title ? fmt(o.title) : '');
        let y = y0 + 1;
        for (const l of hl) t.rich(x0 + 2, y++, l, COL.text, W - 4);
        if (hl.length) y++;
        s.sel = U.clamp(s.sel, 0, Math.max(0, items.length - 1));
        if (s.sel < s.scroll) s.scroll = s.sel;
        if (s.sel >= s.scroll + listH) s.scroll = s.sel - listH + 1;
        for (let k = 0; k < listH && k + s.scroll < items.length; k++) {
          const i = k + s.scroll;
          const it = items[i];
          const isSel = i === s.sel;
          const bg = isSel ? COL.sel : COL.panel;
          t.fill(x0 + 1, y, W - 2, 1, ' ', COL.text, bg);
          const key = i < 9 ? String(i + 1) : ' ';
          t.text(x0 + 2, y, key, COL.dim, bg);
          if (it.g) t.put(x0 + 4, y, it.g[0], it.g[1], bg);
          const tx = x0 + (it.g ? 6 : 4);
          t.text(tx, y, fmt(it.t), it.disabled ? COL.faint : isSel ? COL.selfg : (it.c || COL.text), bg, W - (tx - x0) - 2 - (it.r ? it.r.length + 1 : 0));
          if (it.r) t.text(x0 + W - 2 - it.r.length, y, it.r, it.rc || COL.dim, bg);
          t.hot(x0 + 1, y, W - 2, 1, () => { if (s.sel === i) s.choose(); else { s.sel = i; } UI.render(); }, o.tip ? { tip: () => o.tip(it) } : null);
          if (isSel) s.selY = y;
          y++;
        }
        if (items.length > listH) t.text(x0 + W - 8, y0 + H - 1, ' ' + (s.sel + 1) + '/' + items.length + ' ', COL.dim, COL.panel);
        if (!items.length) t.text(x0 + 2, y, o.empty || '(пусто)', COL.dim, COL.panel);
        if (o.footer) t.text(x0 + 2, y0 + H - 2, fmt(typeof o.footer === 'function' ? o.footer(items[s.sel]) : o.footer), COL.dim, COL.panel, W - 4);
        // описание выбранного — сбоку, если мышь не наведена и есть место (клавиатура)
        if (o.tip && top && !UI.mouse && items[s.sel] && (t.cols - (x0 + W) >= 26 || x0 >= 26)) {
          const tip = o.tip(items[s.sel]);
          if (tip) UI.drawTip(t, tip, t.cols - (x0 + W) >= 26 ? x0 + W - 2 : x0, s.selY || y0, t.cols - (x0 + W) >= 26 ? 'right' : 'left');
        }
      },
      choose() {
        const it = s.items[s.sel];
        if (!it || it.disabled) return;
        const r = it.f ? it.f(it, s.sel) : o.onSelect && o.onSelect(it, s.sel);
        if (r === 'keep' || o.keep) return;
        if (UI.top() === s) UI.pop();
      },
      key(c) {
        const n = s.items ? s.items.length : 0;
        if (c.k === 'up') s.sel = (s.sel - 1 + n) % Math.max(1, n);
        else if (c.k === 'down') s.sel = (s.sel + 1) % Math.max(1, n);
        else if (c.k === 'pgup') s.sel = Math.max(0, s.sel - 10);
        else if (c.k === 'pgdn') s.sel = Math.min(n - 1, s.sel + 10);
        else if (c.k === 'enter' || c.k === 'act') s.choose();
        else if (c.k === 'esc') { UI.pop(); if (o.onEsc) o.onEsc(); }
        else if (c.n >= 1 && c.n <= 9 && c.n <= n) { s.sel = c.n - 1; s.choose(); }
        else if (o.onKey) o.onKey(c, s);
      },
    };
    return UI.push(s);
  };
  UI.menu = function (title, opts) {
    return UI.list({ title: '', header: title, items: opts.map((o) => ({ t: o.t, f: () => { UI.pop(); o.f(); UI.render(); return 'keep'; } })) });
  };
  UI.popup = function (title, text, o) {
    const s = {
      name: 'popup', scroll: 0,
      draw(t) {
        const W = Math.min(t.cols - 2, 70);
        const lines = U.wrap(text, W - 4);
        const H = Math.min(t.rows - 2, lines.length + 4);
        const x0 = Math.floor((t.cols - W) / 2), y0 = Math.floor((t.rows - H) / 2);
        t.box(x0, y0, W, H, COL.accent, COL.panel, title);
        const vis = H - 4;
        s.max = Math.max(0, lines.length - vis);
        for (let k = 0; k < vis + 1 && k + s.scroll < lines.length; k++) t.rich(x0 + 2, y0 + 1 + k, lines[k + s.scroll], COL.text, W - 4);
        t.text(x0 + W - 12, y0 + H - 1, ' [дальше] ', COL.dim, COL.panel);
        t.hot(0, 0, t.cols, t.rows, () => { UI.pop(); if (o && o.then) o.then(); });
      },
      key(c) {
        if (c.k === 'up') { s.scroll = Math.max(0, s.scroll - 1); return; }
        if (c.k === 'down' && s.scroll < s.max) { s.scroll++; return; }
        UI.pop();
        if (o && o.then) o.then();
      },
    };
    UI.push(s);
  };
  UI.confirm = function (q, yes, no) {
    UI.list({ title: '', header: q, items: [{ t: 'Да', f: () => { UI.pop(); yes && yes(); UI.render(); return 'keep'; } }, { t: 'Нет', f: () => { UI.pop(); no && no(); return 'keep'; } }] });
  };
  UI.dialogSay = function (npc, text) {
    const s = UI.stack.find((x) => x.name === 'dialog');
    if (!s) return false;
    G.dlgReply = text;
    s.reply = text;
    return true;
  };

  // ---------- выбор направления ----------
  UI.askDir = function (prompt, cb) {
    UI.push({
      name: 'dir',
      draw(t) { const s = ' ' + prompt + ' — стрелки; Enter — ближайшая цель; Esc — отмена '; t.text(Math.max(0, Math.floor((t.cols - s.length) / 2)), 1, s, '#fff0c0', '#3a2a10'); },
      key(c) {
        const d = UI.dirOf(c);
        if (c.k === 'esc') { UI.pop(); return; }
        if (c.k === 'enter' || c.k === 'act' || (d && d[0] === 0 && d[1] === 0)) { UI.pop(); cb(null); return; }
        if (d) { UI.pop(); cb(d); }
      },
    });
  };
  UI.useAbility = function (id) {
    const a = D.ab[id];
    if (!a) return;
    if (E.Combat.needsDir(a)) UI.askDir(a.n, (d) => { Gm.useAb(id, d); UI.render(); });
    else { Gm.useAb(id, null); UI.render(); }
  };
  UI.fireCmd = function () {
    const P = G.P;
    const w = P.eq.hand;
    if (w && w.range) {
      UI.askDir('Стрелять', (d) => {
        const e = d ? (() => { let x = P.x, y = P.y; for (let i = 0; i < w.range; i++) { x += d[0]; y += d[1]; if (x < 0 || y < 0 || x >= G.map.w || y >= G.map.h || !TL[G.map.tiles[y * G.map.w + x]].see) return null; const o = Gm.entAt(x, y); if (o && o.kind !== 'ally') return o; } return null; })() : E.Combat.nearestEnemy(w.range);
        if (!e) { Gm.msg('Стрела уходит в пустоту.'); Gm.endTurn(1); return; }
        E.Combat.playerAttack(e, { force: e.kind === 'npc' });
        Gm.endTurn(1);
        UI.render();
      });
      return;
    }
    UI.askDir('Атаковать', (d) => {
      const e = d ? Gm.entAt(P.x + d[0], P.y + d[1]) : E.Combat.nearestEnemy(1);
      if (!e) { Gm.msg('Там никого.'); return; }
      if (e.kind === 'npc' && !e.hostile) { UI.confirm('Напасть на ' + (Gm.knows(e.npc) ? U.acc(e.n, e.g) : 'этого человека') + '?', () => { e.wasPeaceful = 1; E.Combat.playerAttack(e, { force: 1 }); Gm.endTurn(1); }); return; }
      E.Combat.playerAttack(e, { force: 1 });
      Gm.endTurn(1);
    });
  };

  // ---------- инвентарь ----------
  UI.inventory = function () {
    UI.list({
      name: 'inv', title: 'Сумка', w: 76,
      header: () => 'Вес: ' + Math.round(Gm.weight() * 10) / 10 + ' / ' + Gm.cap() + '    Кошелёк: ' + Gm.purseStr() + (Gm.weight() > Gm.cap() ? '   {#e07070|(перегруз)}' : ''),
      items: () => G.P.inv.map((it) => {
        const eq = Object.values(G.P.eq).includes(it);
        return { t: Items.name(it) + (eq ? '  (надето)' : ''), g: UI.itemGlyph(it), r: String(Math.round((it.w || 0) * (it.q || 1) * 10) / 10), it, c: eq ? COL.accent : COL.text };
      }),
      tip: (x) => UI.itemTip(x.it),
      empty: 'Сумка пуста.',
      onSelect: (x) => { UI.itemMenu(x.it); return 'keep'; },
      footer: 'Enter — действия с вещью, Esc — закрыть',
    });
  };
  UI.itemMenu = function (it) {
    const P = G.P;
    const b = D.items[it.b] || {};
    const opts = [];
    const t = it.t || b.t;
    if (t === 'food') opts.push({ t: 'Съесть', f: () => Gm.use(it) });
    else if (t === 'potion') opts.push({ t: 'Выпить', f: () => Gm.use(it) });
    else if (t === 'book' || it.b === 'book') opts.push({ t: 'Прочитать', f: () => Gm.use(it) });
    else if (it.cont) { opts.push({ t: it.water ? 'Выпить воду' : 'Наполнить водой', f: () => Gm.use(it) }); if (it.water && Gm.nearWater(P.x, P.y, 1)) opts.push({ t: 'Набрать заново', f: () => Gm.fill(it) }); }
    else if (!it.s && !b.s) opts.push({ t: 'Использовать', f: () => Gm.use(it) });
    if (it.s || b.s) { const on = P.eq[it.s || b.s] === it; opts.push({ t: on ? 'Снять' : (it.s === 'hand' ? 'Взять в руку' : 'Надеть'), f: () => Gm.equip(it) }); if (b.music || it.music || it.b === 'mask' || it.art || it.b === 'signet') opts.push({ t: 'Использовать', f: () => Gm.use(it) }); }
    if (b.light && it.b === 'torch') { /* в «Использовать» */ }
    let lava = false; for (const [dx, dy] of U.DIR8) { const x = P.x + dx, y = P.y + dy; if (x >= 0 && y >= 0 && x < G.map.w && y < G.map.h && TL[G.map.tiles[y * G.map.w + x]].lava) lava = true; }
    if (lava) opts.push({ t: 'Бросить в лаву', f: () => Gm.throwInto(it) });
    opts.push({ t: 'Осмотреть', f: () => { UI.popup(Items.name(it), UI.itemTip(it).slice(1).join('\n\n')); } });
    opts.push({ t: 'Выбросить', f: () => Gm.drop(it) });
    UI.list({ title: Items.name(it), header: UI.itemTip(it).slice(1, 4).join('\n'), items: opts.map((o) => ({ t: o.t, f: () => { UI.pop(); UI.pop(); o.f(); if (!['Осмотреть'].includes(o.t) && UI.top().name === 'game') UI.inventory(); return 'keep'; } })) });
  };
  // ---------- тело: вода, нужда, умывание ----------
  UI.body = function () {
    const P = G.P, opts = [];
    const nearW = Gm.nearWater(P.x, P.y, 1);
    if (nearW) opts.push({ t: 'Напиться', f: () => Gm.drinkHere() });
    const cont = P.inv.find((i) => i.cont && i.water);
    if (cont) opts.push({ t: 'Выпить: ' + Items.name(cont).toLowerCase(), f: () => Gm.drinkFrom(cont) });
    opts.push({ t: 'Справить нужду' + ((P.need || 0) < 15 ? '  (пока не хочется)' : ''), f: () => Gm.relieve() });
    if (nearW) opts.push({ t: 'Умыться и постирать одежду', f: () => Gm.wash() });
    opts.push({ t: 'Одежда', f: () => UI.outfit() });
    opts.push({ t: 'Уйти', f: () => {} });
    const th = Math.round(P.thirst || 0), nd = Math.round(P.need || 0);
    const st = (v, a) => (v < 30 ? a[0] : v < 60 ? a[1] : v < 85 ? a[2] : a[3]);
    UI.menu('Жажда: ' + st(th, ['нет', 'хочется пить', 'сильная', 'нестерпимая']) + '.  Нужда: ' + st(nd, ['нет', 'есть', 'пора', 'невтерпёж']) + '.\n' + U.cap(Gm.fmt(Gm.dressName())) + (nearW ? '. Рядом вода.' : '.'), opts);
  };
  // ---------- одежда по слоям ----------
  UI.outfit = function () {
    const P = G.P;
    UI.list({
      name: 'outfit', title: 'Одежда', w: 72, keep: true,
      header: () => U.cap(Gm.fmt(Gm.dressName())) + '.  Тепло одежды: ' + (Math.round(Object.values(P.eq).reduce((a, it) => a + ((it && it.warm) || 0), 0) * 10) / 10) + '.  Защита: ' + P.st.def + '.',
      items: () => D.SLOTS.map(([s, n]) => {
        const it = P.eq[s];
        return { t: U.pad(n, 13) + (it ? Items.name(it) : '—'), c: it ? COL.text : COL.dim, slot: s, it, r: it && it.warm ? 'тепло ' + it.warm : '' };
      }),
      tip: (x) => (x.it ? UI.itemTip(x.it) : null),
      onSelect: (x) => {
        const cand = P.inv.filter((i) => (i.s || (D.items[i.b] || {}).s) === x.slot);
        const items = cand.map((i) => ({ t: Items.name(i) + (P.eq[x.slot] === i ? '  (надето)' : ''), g: UI.itemGlyph(i), it: i, f: () => { UI.pop(); if (P.eq[x.slot] !== i) Gm.equip(i); return 'keep'; } }));
        if (P.eq[x.slot]) items.unshift({ t: 'Снять: ' + Items.name(P.eq[x.slot]), f: () => { UI.pop(); Gm.equip(P.eq[x.slot]); return 'keep'; } });
        UI.list({ title: D.SLOTS.find((q) => q[0] === x.slot)[1], items, empty: 'Нечего надеть на это место.', tip: (y) => (y.it ? UI.itemTip(y.it) : null) });
        return 'keep';
      },
    });
  };
  UI.pickItem = function (title, filter, cb) {
    UI.list({ title, items: G.P.inv.filter(filter).map((it) => ({ t: Items.name(it), g: UI.itemGlyph(it), it })), empty: 'Нечего выбрать.', onSelect: (x) => { UI.pop(); cb(x.it); UI.render(); return 'keep'; } });
  };

  // ---------- персонаж ----------
  UI.character = function () {
    const P = G.P;
    UI.list({
      name: 'char', title: P.name, w: 78, keep: true,
      tip: (x) => (x.fxId ? UI.fxTip(x.fxId) : null),
      header: () => {
        const st = P.st;
        const lines = [];
        lines.push((P.level >= 999 ? 'Уровень: —' : 'Уровень ' + P.level + '  (опыт ' + P.xp + ' / ' + Gm.need(P.level) + ')') + '   Возраст: ' + Gm.age() + '   Путь: ' + UI.clsLabel());
        if (P.cls) { const c = D.classes[P.cls]; const pts = Math.floor(P.prog[P.cls] || 0); const r = D.rankOf(pts); lines.push('«' + c.d + '»  ' + c.res + ': ' + pts + ' / ' + D.rankPts(r + 1)); }
        lines.push('Здоровье ' + Math.ceil(P.hp) + '/' + P.mhp + '   Дух ' + Math.floor(P.mp) + '/' + P.mmp + '   Защита ' + st.def + '   Уклонение ' + st.dodge + '   Крит ' + st.crit + '%');
        const fx = P.fx.map((f) => D.effects[f.id]).filter(Boolean);
        if (fx.length) lines.push('На тебе: ' + fx.map((d) => d.n).join(', ') + '  (подробнее — ниже)');
        lines.push('Свободных очков: ' + P.pts + (P.talentPts ? '   Очков древ: ' + P.talentPts : ''));
        return lines.join('\n');
      },
      items: () => {
        const out = [];
        const keys = ['str', 'dex', 'con', 'int', 'fai', 'luck'].concat(P.level >= 100 ? ['wil', 'res'] : []);
        for (const k of keys) out.push({ t: U.pad(E.STATN[k], 10) + ' ' + U.padl(P.st[k], 3) + (P.base[k] !== P.st[k] ? '  (' + P.base[k] + ')' : ''), r: P.pts > 0 ? '[+]' : '', c: COL.text, f: () => { if (P.pts > 0) { P.base[k]++; P.pts--; Gm.calc(); } return 'keep'; } });
        if (P.paths.length) for (const cid of P.paths) { const c = D.classes[cid]; out.push({ t: (P.cls === cid ? '► ' : '  ') + c.n + ' ' + U.roman(P.rank[cid] || 1), r: P.cls === cid ? 'текущий путь' : 'принять путь', c: P.cls === cid ? COL.accent : '#c0b0e0', f: () => { if (P.cls !== cid) { Gm.setClass(cid); Gm.msg('Ты принимаешь путь: ' + c.n + '.', '#ffd0a0'); } return 'keep'; } }); }
        if (P.talentPts > 0) for (const [n, k1, k2] of [['Древо Эха', 'luck', 'dex'], ['Древо Пепла', 'str', 'con'], ['Древо Пустоты', 'int', 'fai']]) out.push({ t: n, r: '+2 ' + E.STATN[k1] + ', +2 ' + E.STATN[k2], c: '#e0c0ff', f: () => { P.talentPts--; P.base[k1] += 2; P.base[k2] += 2; Gm.calc(); return 'keep'; } });
        for (const f of P.fx) { const d = D.effects[f.id]; if (!d) continue; out.push({ t: '· ' + d.n, c: d.kind === 'curse' ? '#c080c0' : d.kind === 'bless' ? '#80c0f0' : '#c0a080', fxId: f.id, r: Gm.fxKnown(f.id) ? '' : '?', f: () => { UI.popup(d.n, UI.fxTip(f.id).slice(1).join('\n\n')); return 'keep'; } }); }
        out.push({ t: 'Одежда (O)', c: '#c0d0e0', f: () => { UI.outfit(); return 'keep'; } });
        out.push({ t: 'Тело: вода и нужда (B)', c: '#c0d0e0', f: () => { UI.body(); return 'keep'; } });
        out.push({ t: 'Статистика мира (T)', c: '#c0d0e0', f: () => { UI.worldStats(); return 'keep'; } });
        out.push({ t: 'Летопись жизни', c: COL.dim, f: () => { UI.lifeStats(); return 'keep'; } });
        return out;
      },
    });
  };
  UI.lifeStats = function () {
    const P = G.P, c = P.c;
    const lines = [
      'Прожито дней: ' + (Time.day(G.S.time) - P.startDay), 'Шагов: ' + (c.steps || 0) + ' (ночью ' + (c.steps_night || 0) + ')', 'Земель повидано: ' + (c.regions || 0),
      'Убито: ' + (c.kills || 0) + ', из них людей: ' + (c.npc_kills || 0), 'Боссов повержено: ' + (c.bosses || 0), 'Книг прочитано: ' + (c.books || 0), 'Зелий сварено: ' + (c.brews || 0),
      'Рыбы поймано: ' + (c.fish || 0), 'Молитв: ' + P.prayers.length, 'Слухов: ' + (c.rumors || 0), 'Дней голода: ' + (c.hunger_days || 0), 'Тайн: ' + Object.keys(P.secrets).length,
    ];
    if (P.lineage && P.lineage.length) lines.push('', 'До тебя в этом мире жили: ' + P.lineage.join(', ') + '.');
    UI.popup('Летопись жизни', lines.join('\n'));
  };

  // ---------- умения и молитвы ----------
  UI.skills = function () {
    const P = G.P;
    UI.list({
      title: 'Умения', w: 76, header: P.abil.length ? 'Дух: ' + Math.floor(P.mp) + '/' + P.mmp : 'Ты пока ничего особенного не умеешь. Мир не спешит учить.',
      items: P.abil.map((id, i) => { const a = D.ab[id]; const cd = P.cd[id] || 0; return { t: a.n + ' — ' + a.d, r: cd > 0 ? 'ждать ' + cd : 'дух ' + a.cost, disabled: cd > 0 || P.mp < a.cost, f: () => { UI.pop(); UI.useAbility(id); return 'keep'; } }; }),
      empty: '—',
    });
  };
  UI.prayers = function () {
    const P = G.P;
    UI.list({
      title: 'Молитвы', w: 78, header: P.prayers.length ? 'Дух: ' + Math.floor(P.mp) + '/' + P.mmp + '. У каждой молитвы своя цена.' : 'Ты не знаешь ни одной молитвы.',
      items: P.prayers.map((pid) => {
        const p = G.W.prayers[pid];
        const cd = (P.prCd[pid] || 0) - G.S.time;
        return { t: p.n + ' — ' + p.fx.d + '; цена: ' + p.cost.d, r: cd > 0 ? Math.ceil(cd / 60) + ' ч' : 'дух ' + p.mp, disabled: cd > 0 || P.mp < p.mp, c: '#fff0c0', f: () => { UI.pop(); const need = E.Combat.needsDir(p.fx); if (need) UI.askDir(p.n, (d) => { Gm.pray(pid, d); UI.render(); }); else { Gm.pray(pid, null); UI.render(); } return 'keep'; } };
      }),
      empty: '—',
    });
  };

  // ---------- отдых ----------
  UI.rest = function () {
    const h = Gm.hour();
    UI.list({
      title: 'Отдых', header: 'Сейчас ' + Time.fmt(G.S.time) + ', ' + Time.dayWord(G.S.time) + '. Мир не будет ждать, пока ты спишь.',
      items: [
        { t: 'Подождать час', f: () => Gm.rest(1) },
        { t: 'До рассвета', f: () => Gm.rest(0, 6) },
        { t: 'До полудня', f: () => Gm.rest(0, 12) },
        { t: 'До заката', f: () => Gm.rest(0, 19) },
        { t: 'До полуночи', f: () => Gm.rest(0, 0) },
        { t: 'Сутки', f: () => Gm.rest(24) },
        { t: 'Неделю', f: () => Gm.rest(24 * 7) },
        { t: 'Месяц', f: () => Gm.rest(24 * 30) },
        { t: 'Развести костёр', f: () => Gm.makeFire() },
      ].map((o) => ({ t: o.t, f: () => { UI.pop(); o.f(); UI.render(); return 'keep'; } })),
    });
  };

  // ---------- разговор ----------
  UI.talk = function (e) {
    Dlg.onTalk(e);
    const s = {
      name: 'dialog', e, reply: e.npc != null ? Gm.fmt(Dlg.greet(e), Gm.npc(e.npc)) : (e.ghostShop != null ? 'Мы торгуем тем, чего у живых нет. Платят нам по-разному.' : '...'), sel: 0,
      draw(t) {
        const W = Math.min(t.cols - 2, 76);
        const n = e.npc != null ? Gm.npc(e.npc) : null;
        const opts = Dlg.options(e);
        s.opts = opts;
        const rl = U.wrap(s.reply || '', W - 4);
        const look = n ? (Gm.knows(e.npc) ? U.cap(n.look) : '') : '';
        const H = Math.min(t.rows - 1, 4 + (look ? 1 : 0) + rl.length + 1 + opts.length);
        const x0 = Math.floor((t.cols - W) / 2), y0 = Math.max(0, t.rows - H - 1);
        t.box(x0, y0, W, H, COL.border, COL.panel, Dlg.label(e));
        let y = y0 + 1;
        if (look) t.text(x0 + 2, y++, look, COL.dim, COL.panel, W - 4);
        for (const l of rl) t.text(x0 + 2, y++, l, '#e8dcb0', COL.panel, W - 4);
        y++;
        s.sel = U.clamp(s.sel, 0, opts.length - 1);
        const room = y0 + H - 1 - y;
        const off = Math.max(0, s.sel - room + 1);
        for (let i = off; i < opts.length && y < y0 + H - 1; i++) {
          const bg = i === s.sel ? COL.sel : COL.panel;
          t.fill(x0 + 1, y, W - 2, 1, ' ', COL.text, bg);
          t.text(x0 + 2, y, (i < 9 ? i + 1 : ' ') + ' ' + opts[i].t, i === s.sel ? COL.selfg : opts[i].story ? '#d0c0ff' : COL.text, bg, W - 4);
          const ii = i;
          t.hot(x0 + 1, y, W - 2, 1, () => { if (s.sel === ii) s.choose(); else s.sel = ii; UI.render(); });
          y++;
        }
      },
      choose() {
        const o = s.opts[s.sel];
        if (!o) return;
        G.dlgReply = null;
        const r = o.f();
        if (r === 'close') { if (UI.top() === s) UI.pop(); return; }
        if (typeof r === 'string') s.reply = Gm.fmt(r, e.npc != null ? Gm.npc(e.npc) : null);
        else if (G.dlgReply) s.reply = G.dlgReply;
        if (e.dead && UI.top() === s) UI.pop();
      },
      key(c) {
        const n = s.opts ? s.opts.length : 0;
        if (c.k === 'up') s.sel = (s.sel - 1 + n) % n;
        else if (c.k === 'down') s.sel = (s.sel + 1) % n;
        else if (c.k === 'enter' || c.k === 'act') s.choose();
        else if (c.k === 'esc') UI.pop();
        else if (c.n >= 1 && c.n <= 9 && c.n <= n) { s.sel = c.n - 1; s.choose(); }
      },
    };
    UI.push(s);
  };

  // ---------- торговля ----------
  UI.trade = function (e, kind) {
    const s = {
      name: 'trade', col: 0, sel: [0, 0],
      draw(t) {
        const W = Math.min(t.cols - 2, 96), H = Math.min(t.rows - 2, 26);
        const x0 = Math.floor((t.cols - W) / 2), y0 = Math.floor((t.rows - H) / 2);
        t.box(x0, y0, W, H, COL.border, COL.panel, 'Торговля — ' + Dlg.label(e));
        const stock = Dlg.shopStock(e, kind);
        const mine = G.P.inv.filter((i) => !Object.values(G.P.eq).includes(i) && i.b !== 'gold');
        s.lists = [stock, mine];
        t.text(x0 + 2, y0 + 1, 'Кошелёк: ' + Gm.purseStr() + (kind === 'fair' ? '   (мёртвые берут и годами жизни)' : ''), COL.accent, COL.panel);
        const cw = Math.floor((W - 5) / 2);
        const cols = [[x0 + 2, 'Товар', stock, (it) => Dlg.buyPrice(e, it)], [x0 + 3 + cw, 'Твои вещи', mine, (it) => Dlg.sellPrice(e, it)]];
        cols.forEach(([cx, title, list, price], ci) => {
          t.text(cx, y0 + 3, title, ci === s.col ? COL.title : COL.dim, COL.panel);
          const h = H - 6;
          s.sel[ci] = U.clamp(s.sel[ci], 0, Math.max(0, list.length - 1));
          const off = Math.max(0, s.sel[ci] - h + 1);
          for (let k = 0; k < h && k + off < list.length; k++) {
            const i = k + off, it = list[i];
            const isSel = ci === s.col && i === s.sel[ci];
            const bg = isSel ? COL.sel : COL.panel;
            t.fill(cx, y0 + 4 + k, cw, 1, ' ', COL.text, bg);
            const g = UI.itemGlyph(it); t.put(cx, y0 + 4 + k, g[0], g[1], bg);
            const p = Gm.money(price(it), true);
            t.text(cx + 2, y0 + 4 + k, Items.name(it), isSel ? COL.selfg : COL.text, bg, cw - p.length - 3);
            t.text(cx + cw - p.length, y0 + 4 + k, p, '#e8c860', bg);
            t.hot(cx, y0 + 4 + k, cw, 1, () => { if (s.col === ci && s.sel[ci] === i) s.act(); else { s.col = ci; s.sel[ci] = i; } UI.render(); }, { tip: () => UI.itemTip(it) });
          }
          if (!list.length) t.text(cx, y0 + 4, '(пусто)', COL.dim, COL.panel);
        });
        const cur = s.lists[s.col][s.sel[s.col]];
        if (cur) { const tl = UI.itemTip(cur); t.text(x0 + 2, y0 + H - 2, tl[tl.length > 3 ? 3 : 1] || '', COL.dim, COL.panel, W - 4); }
        t.text(x0 + 2, y0 + H - 1, ' ←→ — сторона, Enter — ' + (s.col ? 'продать' : 'купить') + ', Esc — уйти ', COL.dim, COL.panel);
      },
      act() {
        const list = s.lists[s.col];
        const it = list[s.sel[s.col]];
        if (!it) return;
        if (s.col === 0) Dlg.buy(e, it, kind);
        else { const p = Dlg.sell(e, it); Gm.msg('Продано: ' + Items.name(it) + ' (+' + Gm.money(p, true) + ').', '#e8c860'); }
      },
      key(c) {
        const n = s.lists ? s.lists[s.col].length : 0;
        if (c.k === 'left' || c.k === 'right' || c.k === 'tab') s.col = 1 - s.col;
        else if (c.k === 'up') s.sel[s.col] = Math.max(0, s.sel[s.col] - 1);
        else if (c.k === 'down') s.sel[s.col] = Math.min(n - 1, s.sel[s.col] + 1);
        else if (c.k === 'enter' || c.k === 'act') s.act();
        else if (c.k === 'esc') UI.pop();
      },
    };
    UI.push(s);
  };

  // ---------- сундук ----------
  UI.chest = function (c) {
    UI.list({
      title: 'Внутри', keep: true,
      items: () => c.items.map((it) => ({ t: Items.name(it), g: UI.itemGlyph(it), it })).concat(c.items.length ? [{ t: '— Взять всё —', c: COL.accent, all: 1 }] : []),
      empty: 'Пусто.',
      onSelect: (x) => {
        const take = (it) => {
          const ah = E.Arts[it.b];
          if (ah && ah.canPick && !ah.canPick(G.P, it)) { Gm.msg('Корона ускользает из пальцев. Будто не хочет.', '#c0a0e0'); c.items.splice(c.items.indexOf(it), 1); Gm.relocateCrown(); return; }
          c.items.splice(c.items.indexOf(it), 1);
          if (it.uq != null) G.S.taken['uq' + it.uq] = 1;
          if (it.b === 'gold') { Gm.give('gold', it.q); return; }
          Gm.give(it, it.q);
          Gm.fire('pickup', { item: it });
          Gm.storyHook('pickup', { item: it });
        };
        if (x.all) { for (const it of c.items.slice()) take(it); UI.pop(); Gm.endTurn(1); return; }
        take(x.it);
        if (!c.items.length) { UI.pop(); Gm.endTurn(1); }
      },
    });
  };

  // ---------- карта мира ----------
  UI.worldMap = function () {
    const P = G.P;
    const m = G.map;
    const inDim = m.dim && m.dimGrid > 1 && m.dimName !== 'mirror';
    const size = inDim ? m.dimGrid : C.WS;
    const cur = inDim ? [m.gx, m.gy] : m.region ? [m.region.x, m.region.y] : [12, 12];
    const s = {
      name: 'map', full: true, cx: cur[0], cy: cur[1],
      draw(t) {
        t.fill(0, 0, t.cols, t.rows, ' ', COL.text, COL.bg);
        t.center(0, inDim ? 'Карта: ' + D.dims[m.dimName].n : (m.dimName === 'mirror' ? 'Карта мира (в зеркале всё наоборот)' : 'Карта мира — то, что ты помнишь'), COL.title);
        const cw = t.cols >= 70 ? 2 : 1;
        const x0 = Math.max(1, Math.floor((t.cols - size * cw - (t.cols >= 100 ? 30 : 0)) / 2)), y0 = 2;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          const sx = x0 + x * cw, sy = y0 + y;
          if (inDim) { t.put(sx, sy, x === cur[0] && y === cur[1] ? '@' : '·', x === cur[0] && y === cur[1] ? '#fff6d0' : D.biomes[D.dims[m.dimName].biome].c); continue; }
          const g = G.W.regions[y * C.WS + x];
          const known = P.known.regions[g.id];
          const isCur = cur[0] === x && cur[1] === y;
          if (!known && !isCur) { t.put(sx, sy, ' ', COL.faint); continue; }
          const b = D.biomes[g.biome];
          let ch = b.g, c = b.c;
          if (g.settlement >= 0 && G.W.settlements[g.settlement].type !== 'vanish') { const st = G.W.settlements[g.settlement]; ch = G.S.sett[st.id].destroyed ? '×' : st.type === 'capital' ? '◆' : st.type === 'town' ? '■' : '▪'; c = G.S.sett[st.id].destroyed ? '#806060' : '#e0c890'; }
          if (isCur) { ch = '@'; c = '#fff6d0'; }
          const sel = x === s.cx && y === s.cy;
          t.put(sx, sy, ch, c, sel ? '#3a3050' : null);
          if (cw === 2 && sel) t.put(sx + 1, sy, ' ', c, '#3a3050');
          const xx = x, yy = y;
          t.hot(sx, sy, cw, 1, () => { s.cx = xx; s.cy = yy; UI.render(); });
        }
        // подпись
        const yI = y0 + size + 1;
        if (!inDim) {
          const g = G.W.regions[s.cy * C.WS + s.cx];
          const known = P.known.regions[g.id];
          let info = known ? g.name + ' — ' + D.biomes[g.biome].n : 'Ты там не был[|а].';
          if (known && g.settlement >= 0) { const st = G.W.settlements[g.settlement]; info += '. ' + st.nom + (G.S.sett[st.id].destroyed ? ' (руины)' : ''); }
          t.text(x0, yI, fmt(info), COL.text, null, t.cols - x0 - 1);
        }
        if (t.cols >= 100) {
          const lx = x0 + size * cw + 3;
          let ly = y0;
          t.text(lx, ly++, 'Обозначения', COL.title);
          for (const k of ['plains', 'forest', 'ancient', 'swamp', 'desert', 'tundra', 'ice', 'mountain', 'living', 'volcanic', 'ash', 'coast', 'ocean', 'sky']) { const b = D.biomes[k]; t.put(lx, ly, b.g, b.c); t.text(lx + 2, ly++, b.n, COL.dim); }
          t.put(lx, ly, '◆', '#e0c890'); t.text(lx + 2, ly++, 'столица', COL.dim);
          t.put(lx, ly, '■', '#e0c890'); t.text(lx + 2, ly++, 'город', COL.dim);
          t.put(lx, ly, '▪', '#e0c890'); t.text(lx + 2, ly++, 'деревня', COL.dim);
          t.put(lx, ly, '×', '#806060'); t.text(lx + 2, ly++, 'руины', COL.dim);
          ly++;
          t.text(lx, ly++, 'Повидано земель: ' + (P.c.regions || 0), COL.dim);
        }
        t.text(1, t.rows - 1, 'Стрелки — осмотреть, Esc — закрыть', COL.dim);
      },
      key(c) {
        const d = UI.dirOf(c);
        if (d) { s.cx = U.clamp(s.cx + d[0], 0, size - 1); s.cy = U.clamp(s.cy + d[1], 0, size - 1); return; }
        if (c.k === 'esc' || c.k === 'map' || c.k === 'enter') UI.pop();
      },
    };
    UI.push(s);
  };

  // ---------- память ----------
  UI.memory = function () {
    const P = G.P;
    const tabs = ['Записи', 'Слухи', 'Люди', 'Места', 'Рецепты'];
    const s = {
      name: 'mem', full: true, tab: 0, scroll: 0,
      lines() {
        const out = [];
        if (s.tab === 0) { for (const n of P.notes.slice().reverse()) out.push([Time.date(n.t) + ': ' + n.s, COL.text]); if (!out.length) out.push(['Ничего важного ты пока не запомнил[|а].', COL.dim]); }
        if (s.tab === 1) { const r = Object.values(P.known.rumors).sort((a, b) => b.heard - a.heard); for (const x of r) out.push([Time.date(x.t) + ': ' + x.s, COL.text]); if (!out.length) out.push(['Ты ещё не слышал[|а] ни одного слуха.', COL.dim]); }
        if (s.tab === 2) {
          const ids = Object.keys(P.known.npc).filter((id) => P.known.npc[id].name);
          for (const id of ids) { const n = Gm.npc(+id); const k = P.known.npc[id]; const alive = E.Sim.isAlive(+id); out.push([(alive ? '' : '† ') + n.first + ' ' + (n.sur || '') + ' — ' + (k.notes || n.look), alive ? COL.text : COL.dim]); }
          if (!out.length) out.push(['Ты ни с кем толком не знаком[|а].', COL.dim]);
        }
        if (s.tab === 3) { const r = Object.keys(P.known.regions).map((id) => G.W.regions[id]); for (const g of r) out.push([g.name + ' — ' + D.biomes[g.biome].n + (g.settlement >= 0 ? ', ' + G.W.settlements[g.settlement].nom : ''), COL.text]); }
        if (s.tab === 4) { for (const k in P.known.recipes) { const [a, b] = k.split('+'); out.push([(D.items[a] || {}).n + ' + ' + (D.items[b] || {}).n + ' → ' + D.items[P.known.recipes[k]].n, COL.text]); } if (!out.length) out.push(['Ты ещё ничего не сварил[|а] удачно.', COL.dim]); }
        return out;
      },
      draw(t) {
        t.fill(0, 0, t.cols, t.rows, ' ', COL.text, COL.bg);
        let x = 1;
        tabs.forEach((n, i) => { const lbl = ' ' + n + ' '; t.text(x, 0, lbl, i === s.tab ? '#100c18' : COL.dim, i === s.tab ? COL.accent : null); const ii = i; t.hot(x, 0, lbl.length, 1, () => { s.tab = ii; s.scroll = 0; UI.render(); }); x += lbl.length + 1; });
        const W = t.cols - 4;
        const all = [];
        for (const [l, c] of s.lines()) { for (const w of U.wrap(fmt(l), W)) all.push([w, c]); all.push(['', c]); }
        const H = t.rows - 3;
        s.max = Math.max(0, all.length - H);
        s.scroll = U.clamp(s.scroll, 0, s.max);
        for (let k = 0; k < H && k + s.scroll < all.length; k++) t.text(2, 2 + k, all[k + s.scroll][0], all[k + s.scroll][1]);
        t.text(1, t.rows - 1, '←→ — разделы, ↑↓ — листать, Esc — закрыть', COL.dim);
      },
      key(c) {
        if (c.k === 'left') { s.tab = (s.tab + tabs.length - 1) % tabs.length; s.scroll = 0; }
        else if (c.k === 'right' || c.k === 'tab') { s.tab = (s.tab + 1) % tabs.length; s.scroll = 0; }
        else if (c.k === 'up') s.scroll--;
        else if (c.k === 'down') s.scroll++;
        else if (c.k === 'pgup') s.scroll -= 10;
        else if (c.k === 'pgdn') s.scroll += 10;
        else if (c.k === 'esc' || c.k === 'mem') UI.pop();
      },
    };
    UI.push(s);
  };
  UI.textScreen = function (title, lines, o) {
    const s = {
      name: 'text', full: true, scroll: o && o.bottom ? 1e9 : 0,
      draw(t) {
        t.fill(0, 0, t.cols, t.rows, ' ', COL.text, COL.bg);
        t.center(0, title, COL.title);
        const W = Math.min(t.cols - 4, 100);
        const x0 = Math.floor((t.cols - W) / 2);
        const all = [];
        for (const l of lines) { const [txt, c] = Array.isArray(l) ? l : [l, COL.text]; if (!txt) { all.push(['', c]); continue; } for (const w of U.wrap(fmt(txt), W)) all.push([w, c]); }
        const H = t.rows - 3;
        s.max = Math.max(0, all.length - H);
        s.scroll = U.clamp(s.scroll, 0, s.max);
        for (let k = 0; k < H && k + s.scroll < all.length; k++) t.rich(x0, 2 + k, all[k + s.scroll][0], all[k + s.scroll][1], W);
        t.text(1, t.rows - 1, '↑↓ — листать, Esc — закрыть', COL.dim);
        t.hot(0, t.rows - 1, t.cols, 1, () => UI.pop());
      },
      key(c) {
        if (c.k === 'up') s.scroll--; else if (c.k === 'down') s.scroll++; else if (c.k === 'pgup') s.scroll -= 10; else if (c.k === 'pgdn') s.scroll += 10;
        else if (c.k === 'esc' || c.k === 'enter') UI.pop();
      },
    };
    UI.push(s);
  };
  UI.logScreen = () => UI.textScreen('Журнал', G.log.map((e) => [e.s, e.c]), { bottom: 1 });
  UI.archive = function () {
    Gm.cnt('read'); Gm.gain('read');
    UI.textScreen('Архив Времени — всё, что было', [['Здесь записано всё. Даже то, чего никто не видел.', COL.dim], ''].concat(G.S.chron.map((c) => [Time.date(c.t) + ' — ' + c.s, c.k === 'big' ? '#ffd080' : c.k === 'war' ? '#ff9080' : c.k === 'lost' ? '#c0a0e0' : COL.text])), { bottom: 1 });
  };

  // ---------- осмотр ----------
  UI.look = function () {
    const P = G.P;
    const s = {
      name: 'look', x: P.x, y: P.y,
      draw(t) {
        const L = UI.layout(t);
        const [cx, cy] = UI.cam || UI.camera(L);
        const sx = L.mx + s.x - cx, sy = L.my + s.y - cy;
        const i = s.y * G.map.w + s.x;
        if (UI.view3d) UI.mvCursor = [s.x, s.y]; else t.bg(sx, sy, '#806020');
        const desc = UI.lookText(s.x, s.y);
        t.text(0, L.my, ' ' + desc + ' ', '#fff0c0', '#2a2010', t.cols);
      },
      key(c) {
        const d = UI.dirOf(c);
        if (d) { s.x = U.clamp(s.x + d[0], 0, G.map.w - 1); s.y = U.clamp(s.y + d[1], 0, G.map.h - 1); return; }
        if (c.k === 'esc' || c.k === 'enter' || c.k === 'look') UI.pop();
      },
    };
    UI.push(s);
  };
  UI.lookText = function (x, y) {
    const m = G.map;
    const i = y * m.w + x;
    if (!G.vis[i] && !m.ex[i]) return 'Неизвестно.';
    const parts = [];
    if (x === G.P.x && y === G.P.y) parts.push('Это ты');
    const e = m.occ.get(i);
    if (e && G.vis[i]) parts.push(e.npc != null ? (Gm.knows(e.npc) ? Gm.npc(e.npc).first + ' — ' : '') + Gm.npc(e.npc).look + (e.asleep ? ' (спит)' : '') : U.cap(e.full || e.n));
    if (G.vis[i]) for (const o of m.items) if (o.x === x && o.y === y) parts.push(o.it.u ? Items.name(o.it) : o.it.uq != null ? G.W.uniques[o.it.uq].n : (D.items[o.it.b] || {}).n || 'что-то');
    const f = m.feat[i];
    parts.push(U.cap(f && f.name ? f.name : TL[m.tiles[i]].name));
    return parts.join('. ');
  };

  // ---------- помощь и пауза ----------
  UI.help = function () {
    UI.textScreen('Как играть', [
      ['Мир не объясняет себя. Эта страница объясняет только руки.', COL.dim], '',
      ['Движение: стрелки, WASD или цифровой блок (1–9, по диагонали тоже). 5 или «.» — подождать.', COL.text],
      ['Мышь/палец: нажми на клетку — пойти туда. Правая кнопка — осмотреть.', COL.text],
      ['Шаг ни с чем не взаимодействует сам: заговорить, открыть, войти — только действием (E). Мирные люди и звери уступают дорогу, врага шаг бьёт.', COL.text],
      '',
      ['E / Пробел — действие (взять, открыть, войти, помолиться, порыбачить, сорвать траву...)', COL.text],
      ['I — сумка   C — персонаж   K — умения   P — молитвы   1–9 — быстрые умения', COL.text],
      ['F — атаковать в направлении (или выстрелить, если в руке лук)', COL.text],
      ['R — отдых   M — карта   J — память   L — осмотреться   H — журнал   Esc — меню', COL.text],
      ['V — графика: ползунок от классического ASCII до «почти реальности». [ и ] — быстро сменить уровень.', COL.text],
      ['+ и − (или колесо мыши) — масштаб карты.', COL.text],
      ['Значок [E] над вещью — до неё можно дотянуться.', COL.text],
      '',
      ['Ты — обычный человек. Ешь, когда голоден. Грейся, когда холодно. Спи, когда темно.', COL.dim],
      ['Мир живёт и без тебя: люди рождаются и умирают, города богатеют и пустеют, короли сменяют друг друга.', COL.dim],
      ['Вещи помнят своих хозяев. Люди помнят тебя. Никто не скажет, куда идти.', COL.dim],
      '',
      ['Игра сохраняется сама.', COL.dim],
    ]);
  };
  // ---------- ползунок графики ----------
  UI.gfxScreen = function () {
    const s = {
      name: 'gfx',
      draw(t) {
        const L = UI.layout(t);
        const lv = UI.gfxLevel || 0;
        const W = Math.min(L.mw - 2, 66), H = 8;
        const x0 = L.mx + Math.floor((L.mw - W) / 2), y0 = L.my + L.mh - H - 1;
        t.box(x0, y0, W, H, COL.border, COL.panel, 'Графика');
        const left = 'ASCII', right = 'пиксели 3D';
        const tw = Math.max(18, W - left.length - right.length - 8), step = Math.floor(tw / 6);
        const tx = x0 + 3 + left.length + 1;
        t.text(x0 + 2, y0 + 2, left, COL.dim, COL.panel);
        for (let i = 0; i <= 6 * step; i++) t.put(tx + i, y0 + 2, i % step === 0 ? (i / step === lv ? '●' : '○') : '─', i <= lv * step ? COL.accent : COL.faint, COL.panel);
        t.text(tx + 6 * step + 2, y0 + 2, right, COL.dim, COL.panel);
        for (let k = 0; k <= 6; k++) {
          t.put(tx + k * step, y0 + 3, String(k), k === lv ? COL.selfg : COL.dim, COL.panel);
          t.hot(tx + k * step - 1, y0 + 2, 3, 2, () => { UI.setGfx(k, true); });
        }
        t.text(x0 + 2, y0 + 4, lv + ' · ' + UI.GFX[lv][0], COL.title, COL.panel, W - 4);
        UI.wrapText(t, x0 + 2, y0 + 5, W - 4, UI.GFX[lv][1], COL.text, 1);
        t.text(x0 + 2, y0 + H - 2, '←/→ или 0–6 — менять · Enter — готово', COL.dim, COL.panel, W - 4);
      },
      key(c) {
        if (c.k === 'left' || c.k === 'right') { UI.setGfx((UI.gfxLevel || 0) + (c.k === 'right' ? 1 : -1), true); return; }
        if (c.n != null && c.n >= 0 && c.n <= 6) { UI.setGfx(c.n, true); return; }
        if (c.k === 'gup' || c.k === 'gdown') { UI.setGfx((UI.gfxLevel || 0) + (c.k === 'gup' ? 1 : -1), true); return; }
        if (c.k === 'esc' || c.k === 'enter' || c.k === 'view' || c.k === 'act') { UI.pop(); E.Gm.msg('Графика: ' + UI.GFX[UI.gfxLevel || 0][0] + '.', '#808090'); }
      },
    };
    UI.push(s);
  };
  UI.pause = function () {
    const opts = [
      { t: 'Продолжить', f: () => {} },
      { t: 'Сохранить', f: () => { E.Save.save(); Gm.msg('Сохранено.', '#a0a0b0'); } },
    ];
    const so = Gm.settleOptions();
    if (so.length) opts.push({ t: G.map.sett >= 0 ? 'Остаться здесь навсегда' : 'Остаться в этих краях навсегда', f: () => UI.settle(so) });
    opts.push({ t: 'Уйти навсегда', f: () => UI.confirm('Уйти, не оглядываясь? Эта жизнь закончится.', () => Gm.ending(G.P.flags.nameless ? 'hidden_nobody' : 'walk_away')) });
    opts.push({ t: 'Графика: ' + UI.GFX[UI.gfxLevel || 0][0] + ' (V)', f: () => UI.gfxScreen() });
    if (UI.view3d) { opts.push({ t: 'Карта крупнее (+)', f: () => UI.zoom(1) }); opts.push({ t: 'Карта мельче (−)', f: () => UI.zoom(-1) }); }
    opts.push({ t: 'Журнал сообщений', f: () => UI.logScreen() });
    opts.push({ t: 'Как играть', f: () => UI.help() });
    opts.push({ t: 'Летопись концовок', f: () => UI.endingsGallery() });
    opts.push({ t: 'В главное меню', f: () => { E.Save.save(); UI.stack = []; UI.push(UI.titleScreen()); } });
    UI.list({ title: 'Меню', items: opts.map((o) => ({ t: o.t, f: () => { UI.pop(); o.f(); UI.render(); return 'keep'; } })) });
  };
  UI.settle = function (so) {
    UI.list({ title: 'Кем ты останешься?', header: 'Это решение навсегда. Мир продолжит жить, а ты — жить в нём иначе.', items: so.map((o) => ({ t: o.t, c: o.end ? '#d0c0ff' : COL.text, f: () => { UI.pop(); UI.confirm('Остаться — ' + o.t.toLowerCase() + '?', () => Gm.settle(o)); return 'keep'; } })) });
  };
  UI.travel = function (fromAbility, e) {
    const list = Dlg.travelTargets(fromAbility);
    UI.list({ title: fromAbility ? 'Знакомые дороги' : 'Караван', header: list.length ? 'Куда?' : 'Ты не знаешь ни одного места, куда можно поехать.', items: list.map((x) => ({ t: x.s.nom + ' — ' + G.W.regions[x.s.region].name, r: (fromAbility ? '' : x.cost + '$, ') + x.hours + ' ч', f: () => { UI.closeAll(); Dlg.travel(x, fromAbility); return 'keep'; } })) });
  };
  UI.alchemy = function () {
    const ing = G.P.inv.filter((i) => D.items[i.b] && (D.items[i.b].herb || ['spores', 'crystal', 'ectoplasm', 'salt', 'ashpile', 'honey', 'mushrooms', 'star_jelly'].includes(i.b)));
    if (ing.length < 1) { Gm.msg('Нечего смешивать.'); return; }
    UI.list({ title: 'Алхимия: первый ингредиент', header: 'Рецептов нет. Только опыт.', items: ing.map((it) => ({ t: Items.name(it), g: UI.itemGlyph(it), it })), onSelect: (a) => {
      UI.pop();
      UI.list({ title: 'Второй ингредиент', items: ing.filter((x) => x !== a.it || (x.q || 1) > 1).map((it) => ({ t: Items.name(it), g: UI.itemGlyph(it), it })), onSelect: (b) => { UI.pop(); Gm.brew(a.it, b.it); UI.render(); return 'keep'; } });
      return 'keep';
    } });
  };
  UI.fillMenu = function () {
    const c = G.P.inv.filter((i) => i.cont);
    const items = [{ t: 'Напиться', f: () => { UI.pop(); Gm.drinkHere(); UI.render(); return 'keep'; } }].concat(c.map((it) => ({ t: 'Набрать воды: ' + Items.name(it).toLowerCase(), it })));
    UI.list({ title: 'Колодец', items, onSelect: (x) => { UI.pop(); Gm.fill(x.it); UI.render(); return 'keep'; } });
  };
  UI.altar = function (f) {
    const god = D.godById[f.god];
    UI.menu('Алтарь' + (god ? ' — ' + god.n : '') + '.' + (f.ruined ? ' Он расколот, но всё ещё стоит.' : ''), [
      { t: 'Помолиться', f: () => Gm.prayAtShrine(f) },
      { t: 'Принести жертву', f: () => UI.pickItem('Что положить на алтарь?', (it) => it.b !== 'gold', (it) => Gm.sacrifice(f, it)) },
      { t: 'Уйти', f: () => {} },
    ]);
  };
  UI.endingsGallery = function () {
    const m = E.Meta.load();
    const e = m.endings || {};
    const ids = Object.keys(e);
    UI.textScreen('Летопись концовок', [['Найдено: ' + ids.length + '. Сколько их всего — мир не говорит.', COL.dim], ''].concat(ids.map((id) => [(D.endings[id] && D.endings[id].cat === 'hidden' ? '✶ ' : '· ') + (e[id].t || id) + (e[id].n > 1 ? ' (×' + e[id].n + ')' : ''), COL.text])).concat(ids.length ? [] : [['Пока ни одной. Ни одна жизнь ещё не закончилась.', COL.dim]]));
  };

  // ---------- концовка ----------
  UI.ending = function (d) {
    const lines = [];
    lines.push(['', COL.text]);
    for (const p of d.paras) lines.push([p, p.startsWith('—') ? COL.title : COL.text]);
    lines.push(''); for (const s of d.stats) lines.push([s, COL.dim]);
    if (d.unseen.length) { lines.push(''); lines.push(['Пока ты жил[|а], мир жил тоже. Вот что ты так и не увидел[|а]:', COL.title]); for (const u of d.unseen) lines.push(['  ' + u, '#a0a0b8']); }
    lines.push(''); lines.push(['Найдено концовок: ' + d.found, COL.accent]);
    const s = {
      name: 'ending', full: true, scroll: 0, sel: 0,
      draw(t) {
        t.fill(0, 0, t.cols, t.rows, ' ', COL.text, '#08070b');
        const W = Math.min(t.cols - 4, 90);
        const x0 = Math.floor((t.cols - W) / 2);
        t.center(1, d.hidden ? '✶ ' + d.title + ' ✶' : d.title.toUpperCase(), d.cat === 'death' ? '#e08080' : '#f0d890');
        const all = [];
        for (const [txt, c] of lines) { if (!txt) { all.push(['', c]); continue; } for (const w of U.wrap(fmt(txt), W)) all.push([w, c]); }
        const H = t.rows - 7;
        s.max = Math.max(0, all.length - H);
        s.scroll = U.clamp(s.scroll, 0, s.max);
        for (let k = 0; k < H && k + s.scroll < all.length; k++) t.text(x0, 3 + k, all[k + s.scroll][0], all[k + s.scroll][1], null, W);
        const opts = G.S && G.S.flags.worldEnded ? ['Новый мир', 'Новый мир', 'Главное меню'] : ['Родиться вновь в этом мире', 'Новый мир', 'Главное меню'];
        s.opts = opts;
        let x = x0;
        opts.forEach((o, i) => { const lbl = ' ' + o + ' '; t.text(x, t.rows - 2, lbl, i === s.sel ? '#100c18' : COL.text, i === s.sel ? COL.accent : '#1a1622'); const ii = i; t.hot(x, t.rows - 2, lbl.length, 1, () => { s.sel = ii; s.go(); }); x += lbl.length + 2; });
        if (s.max > 0) t.text(x0 + W - 18, t.rows - 3, '↑↓ — листать', COL.dim);
      },
      go() {
        if (s.sel === 0 && !(G.S && G.S.flags.worldEnded)) { UI.stack = []; UI.push(UI.createScreen(true)); }
        else if (s.sel === 0) { E.Save.clear(); UI.stack = []; UI.push(UI.createScreen(false)); }
        else if (s.sel === 1) { E.Save.clear(); UI.stack = []; UI.push(UI.createScreen(false)); }
        else { UI.stack = []; UI.push(UI.titleScreen()); }
      },
      key(c) {
        if (c.k === 'up') s.scroll--; else if (c.k === 'down') s.scroll++; else if (c.k === 'pgup') s.scroll -= 10; else if (c.k === 'pgdn') s.scroll += 10;
        else if (c.k === 'left') s.sel = (s.sel + 2) % 3; else if (c.k === 'right' || c.k === 'tab') s.sel = (s.sel + 1) % 3;
        else if (c.k === 'enter') s.go();
      },
    };
    UI.stack = [];
    UI.push(s);
  };

  // ---------- титульный экран ----------
  const LOGO = [
    '███████╗ ██████╗██╗  ██╗ ██████╗ ███████╗███████╗',
    '██╔════╝██╔════╝██║  ██║██╔═══██╗██╔════╝██╔════╝',
    '█████╗  ██║     ███████║██║   ██║█████╗  ███████╗',
    '██╔══╝  ██║     ██╔══██║██║   ██║██╔══╝  ╚════██║',
    '███████╗╚██████╗██║  ██║╚██████╔╝███████╗███████║',
    '╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚══════╝',
  ];
  UI.titleScreen = function () {
    const flakes = [];
    const s = {
      name: 'title', full: true, anim: true, sel: 0,
      items() {
        const it = [];
        if (s.info === undefined) s.info = E.Save.info();
        const info = s.info;
        if (info && !info.ended) it.push({ t: 'Продолжить — ' + info.name + (info.level >= 999 ? '' : ', ур. ' + info.level), f: () => s.cont() });
        if (info && info.ended && !info.worldEnded) it.push({ t: 'Новая жизнь в старом мире', f: () => { UI.stack = []; UI.push(UI.createScreen(true)); } });
        it.push({ t: 'Новый мир', f: () => { if (info) UI.confirm('Начать в новом мире? Старый мир будет забыт.', () => { E.Save.clear(); UI.stack = []; UI.push(UI.createScreen(false)); }); else { UI.stack = []; UI.push(UI.createScreen(false)); } } });
        it.push({ t: 'Летопись концовок', f: () => UI.endingsGallery() });
        it.push({ t: 'Как играть', f: () => UI.help() });
        return it;
      },
      cont() {
        UI.stack = [];
        UI.push(UI.loading('Мир вспоминает себя...', () => {
          if (E.Save.load() && !G.P.ended) { UI.stack = []; UI.push(UI.gameScreen); Gm.msg('Ты снова здесь.', '#a0a0b0'); }
          else if (G.P && G.P.ended) { UI.stack = []; UI.push(UI.createScreen(true)); }
          else { UI.stack = []; UI.push(UI.titleScreen()); }
        }));
      },
      draw(t) {
        t.fill(0, 0, t.cols, t.rows, ' ', COL.text, COL.bg);
        const now = performance.now();
        // падающий пепел
        while (flakes.length < Math.floor(t.cols * t.rows / 45)) flakes.push({ x: Math.random() * t.cols, y: Math.random() * t.rows, v: 0.02 + Math.random() * 0.05, c: Math.random() < 0.15 ? '#a05030' : '#3a3644', ch: Math.random() < 0.5 ? '·' : '.' });
        for (const f of flakes) { f.y += f.v; f.x += Math.sin((now / 1500) + f.y) * 0.02; if (f.y >= t.rows) { f.y = 0; f.x = Math.random() * t.cols; } t.put(Math.floor(f.x), Math.floor(f.y), f.ch, f.c); }
        const lw = LOGO[0].length;
        const y0 = Math.max(1, Math.floor(t.rows / 2) - 9);
        if (t.cols >= lw + 2) {
          const x0 = Math.floor((t.cols - lw) / 2);
          LOGO.forEach((l, k) => { for (let i = 0; i < l.length; i++) if (l[i] !== ' ') { const c = U.mixc('#9ab8d8', '#d8a878', i / lw); t.put(x0 + i, y0 + k, l[i], l[i] === '█' ? c : U.shade(c, 0.6)); } });
        } else {
          const SMALL = ['█▀▀ █▀▀ █ █ █▀█ █▀▀ █▀▀', '█▀▀ █   █▀█ █ █ █▀▀ ▀▀█', '▀▀▀ ▀▀▀ ▀ ▀ ▀▀▀ ▀▀▀ ▀▀▀'];
          const x0 = Math.floor((t.cols - SMALL[0].length) / 2);
          SMALL.forEach((l, k) => { for (let i = 0; i < l.length; i++) if (l[i] !== ' ') t.put(x0 + i, y0 + 2 + k, l[i], U.mixc('#9ab8d8', '#d8a878', i / l.length)); });
        }
        t.center(y0 + 7, 'E C H O E S   O F   T H E   F A L L', '#c8b8a8');
        t.center(y0 + 9, '«Мир, который никогда ничего не объясняет.»', COL.dim);
        const it = s.items();
        s.it = it;
        s.sel = U.clamp(s.sel, 0, it.length - 1);
        it.forEach((o, i) => {
          const lbl = (i === s.sel ? '› ' : '  ') + o.t + (i === s.sel ? ' ‹' : '  ');
          const x = Math.floor((t.cols - lbl.length) / 2), y = y0 + 12 + i;
          t.text(x, y, lbl, i === s.sel ? COL.accent : COL.text);
          const ii = i;
          t.hot(x, y, lbl.length, 1, () => { s.sel = ii; it[ii].f(); UI.render(); });
        });
        t.text(1, t.rows - 1, 'v1.0', COL.faint);
      },
      key(c) {
        const n = s.it ? s.it.length : 1;
        if (c.k === 'up') s.sel = (s.sel - 1 + n) % n;
        else if (c.k === 'down') s.sel = (s.sel + 1) % n;
        else if (c.k === 'enter' || c.k === 'act') s.it[s.sel].f();
      },
    };
    return s;
  };
  UI.loading = function (text, fn) {
    let started = false;
    return {
      name: 'loading', full: true, anim: true,
      draw(t) {
        t.fill(0, 0, t.cols, t.rows, ' ', COL.text, COL.bg);
        const dots = '.'.repeat(1 + Math.floor(performance.now() / 300) % 3);
        t.center(Math.floor(t.rows / 2), text + dots, COL.dim);
        if (!started) { started = true; setTimeout(() => { try { fn(); } catch (e) { console.error(e); UI.stack = []; UI.push(UI.titleScreen()); UI.popup('Ошибка', String(e && e.stack || e)); } UI.render(); }, 60); }
      },
      key() {},
    };
  };
  // ---------- создание персонажа ----------
  UI.createScreen = function (reborn) {
    const r = new E.RNG((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    const s = {
      name: 'create', full: true, sex: r.chance(0.5) ? 'm' : 'f', sel: 0, seed: (Math.random() * 1e9) >>> 0,
      open() {
        s.name0 = r.pick(s.sex === 'm' ? E.N.male : E.N.female);
        const inp = document.getElementById('nameInput');
        if (inp) { inp.value = s.name0; inp.style.display = 'block'; inp.oninput = () => { s.name0 = inp.value.slice(0, 18); UI.render(); }; }
      },
      close() { const inp = document.getElementById('nameInput'); if (inp) { inp.style.display = 'none'; inp.blur(); } },
      draw(t) {
        t.fill(0, 0, t.cols, t.rows, ' ', COL.text, COL.bg);
        const y0 = Math.max(1, Math.floor(t.rows / 2) - 8);
        t.center(y0, reborn ? 'Новая жизнь в старом мире' : 'Новая жизнь', COL.title);
        t.center(y0 + 2, 'Ты — обычный человек. Без класса, без судьбы, без пророчества.', COL.dim);
        const rows = [
          ['Имя', s.name0 + (s.sel === 0 && Math.floor(performance.now() / 500) % 2 ? '_' : ' '), () => { s.name0 = r.pick(s.sex === 'm' ? E.N.male : E.N.female); const inp = document.getElementById('nameInput'); if (inp) inp.value = s.name0; }],
          ['Пол', s.sex === 'm' ? 'мужчина' : 'женщина', () => { s.sex = s.sex === 'm' ? 'f' : 'm'; }],
        ];
        if (!reborn) rows.push(['Зерно мира', String(s.seed), () => { s.seed = (Math.random() * 1e9) >>> 0; }]);
        rows.push(['', '— Начать —', () => s.start()]);
        s.rows = rows;
        rows.forEach(([k, v, f], i) => {
          const y = y0 + 5 + i * 2;
          const sel = i === s.sel;
          const lbl = k ? U.padl(k, 12) + '   ' + v : v;
          const x = Math.floor((t.cols - 34) / 2);
          t.text(x, y, (sel ? '› ' : '  ') + lbl, sel ? COL.accent : COL.text);
          const ii = i;
          t.hot(x, y, 34, 1, () => { if (s.sel === ii) f(); else s.sel = ii; if (ii === 0) { const inp = document.getElementById('nameInput'); if (inp) inp.focus(); } UI.render(); });
        });
        t.center(y0 + 5 + rows.length * 2 + 1, s.sel === 0 ? 'Набери имя. Enter — случайное.' : s.sel === rows.length - 1 ? '' : 'Enter или ←→ — изменить', COL.faint);
      },
      start() {
        const name = (s.name0 || '').trim() || r.pick(s.sex === 'm' ? E.N.male : E.N.female);
        const inp = document.getElementById('nameInput'); if (inp) { inp.style.display = 'none'; inp.blur(); }
        UI.stack = [];
        UI.push(UI.loading(reborn ? 'Годы проходят...' : 'Мир рождается...', () => {
          if (!reborn || !G.W || !G.S) { if (reborn && E.Save.exists()) E.Save.load(); }
          if (!reborn || !G.W) Gm.newWorld(s.seed);
          const old = G.P;
          if (reborn && old) { G.P = old; }
          else G.P = null;
          Gm.startLife(name, s.sex, reborn && !!old);
          UI.stack = [];
          UI.push(UI.gameScreen);
          const W = G.W;
          UI.popup('', 'Год ' + Time.year(G.S.time) + ' после Падения.\n\nТы просыпаешься у дороги, рядом с потухшим костром. В кармане — немного монет. В сумке — нож, краюха хлеба и старая кружка.\n\nНикто не знает твоего имени. Никто тебя не ждёт.\n\nМир большой. Он жил до тебя и будет жить после.' + (reborn && old ? '\n\nГоворят, когда-то здесь жил[|а] человек по имени ' + old.name + '.' : ''));
          E.Save.save();
        }));
      },
      key(c) {
        const n = s.rows ? s.rows.length : 3;
        if (c.k === 'up') s.sel = (s.sel - 1 + n) % n;
        else if (c.k === 'down' || c.k === 'tab') s.sel = (s.sel + 1) % n;
        else if (c.k === 'enter') { if (s.sel === n - 1) s.start(); else s.rows[s.sel][2](); }
        else if (c.k === 'left' || c.k === 'right') { if (s.sel > 0 && s.sel < n - 1) s.rows[s.sel][2](); }
        else if (c.k === 'esc') { UI.stack = []; UI.push(UI.titleScreen()); }
        else if (s.sel === 0 && c.raw) {
          const inp = document.getElementById('nameInput');
          if (inp && document.activeElement === inp) return;
          if (c.raw === 'Backspace') s.name0 = s.name0.slice(0, -1);
          else if (c.raw.length === 1 && s.name0.length < 18 && /[\p{L} \-']/u.test(c.raw)) s.name0 += c.raw;
          if (inp) inp.value = s.name0;
        }
      },
    };
    return s;
  };
})(window.EOF);
