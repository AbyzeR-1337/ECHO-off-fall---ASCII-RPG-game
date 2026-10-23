'use strict';
// Ядро игры: состояние, журнал, предметы, эффекты, характеристики, опыт.
(function (E) {
  const U = E.U, D = E.D, T = E.T, TL = E.TL, C = E.C, Time = E.Time;
  const G = E.G = E.G || {};
  const Gm = E.Gm = {};
  G.log = G.log || [];

  // ---------- журнал и текст ----------
  Gm.msg = function (s, c) {
    if (!s) return;
    s = Gm.fmt(s);
    const last = G.log[G.log.length - 1];
    if (last && last.s === s && last.turn === G.turn) { last.n = (last.n || 1) + 1; return; }
    G.log.push({ s, c: c || '#c8c8c8', turn: G.turn });
    if (G.log.length > 300) G.log.splice(0, 50);
  };
  Gm.fmt = function (s, npc) {
    if (!s) return s;
    const P = G.P;
    s = String(s);
    if (npc) s = s.replace(/\{([^|{}]*)\|([^|{}]*)\}/g, (m, a, b) => (npc.sex === 'f' ? b : a));
    if (P) s = s.replace(/\[([^|\[\]]*)\|([^|\[\]]*)\]/g, (m, a, b) => (P.sex === 'f' ? b : a));
    if (P) s = s.replace(/\$pname/g, P.name);
    return s;
  };
  Gm.popup = (title, text, opts) => E.UI && E.UI.popup(title, Gm.fmt(text), opts);
  Gm.say = function (npc, text) {
    const t = Gm.fmt(text, npc);
    if (E.UI && E.UI.dialogSay && E.UI.dialogSay(npc, t)) return;
    Gm.msg((npc.first || 'Кто-то') + ': «' + t + '»', '#e0d0a0');
  };
  Gm.note = function (s, story) { const P = G.P; P.notes.push({ t: G.S.time, s: Gm.fmt(s), story }); Gm.msg('(Ты запоминаешь это.)', '#8a8a9a'); };

  // ---------- время ----------
  Gm.hour = () => Time.hour(G.S.time);
  Gm.minute = () => Time.minute(G.S.time);
  Gm.day = () => Time.day(G.S.time);
  Gm.night = () => Time.night(G.S.time);
  Gm.fullMoon = () => Time.fullMoon(G.S.time);
  Gm.season = () => Time.season(G.S.time);
  Gm.event = (id) => E.Sim.event(id, G.map && G.map.rid != null ? G.map.rid : null);
  Gm.firstSpringStorm = () => E.Sim.firstSpringStorm();
  Gm.regionId = () => (G.map && !G.map.dim && G.map.kind === 'over' ? G.map.rid : -1);
  Gm.region = () => (G.map && G.map.region) || null;
  Gm.biome = () => (G.map ? G.map.biome : '');
  Gm.weather = function () {
    const m = G.map;
    if (!m || !m.outdoor || m.dim) return m && m.dimName === 'dream' ? 'fog' : 'none';
    return E.Sim.weather(m.rid);
  };
  Gm.outdoors = function () {
    const m = G.map;
    if (!m || !m.outdoor) return false;
    const t = TL[m.tiles[G.P.y * m.w + G.P.x]];
    return !t.indoor;
  };
  Gm.st = (id) => (G.S.st[id] = G.S.st[id] || {});

  // ---------- NPC ----------
  Gm.npc = (id) => E.Sim.npc(id);
  Gm.nalive = (id) => E.Sim.isAlive(id);
  Gm.nstate = (id) => E.Sim.st(id);
  Gm.op = function (id, d) { const st = E.Sim.st(id); st.op = U.clamp((st.op || 0) + d, -100, 100); return st.op; };
  Gm.opinion = function (id) {
    const st = G.S.npc[id] || {};
    let o = st.op || 0;
    const sid = E.Sim.settOf(id);
    if (sid >= 0) o += G.S.sett[sid].rep || 0;
    for (const f of G.P.fx) { const d = D.effects[f.id]; if (d && d.opinion) o += d.opinion; }
    if (G.P.eq.head && G.P.eq.head.b === 'a_crown') o += 10;
    return o;
  };
  Gm.isRelativeOf = (a, b) => E.Sim.isRel(a, b);
  Gm.killNpc = function (id, cause, peaceful) {
    E.Sim.kill(id, cause, { quiet: peaceful });
    const e = G.map && G.map.ents.find((x) => x.npc === id);
    if (e) Gm.removeEnt(e);
  };
  Gm.facRuler = (f) => E.Sim.facRuler(f);
  Gm.setRuler = (f, id) => E.Sim.setRuler(f, id);
  Gm.facUnrest = (f) => E.Sim.facUnrest(f);
  Gm.atWar = (f) => E.Sim.atWar(f);
  Gm.inCapital = (f) => G.map && G.map.sett >= 0 && G.W.factions[f] && G.W.factions[f].capital === G.map.sett;
  Gm.killPop = (s, f, c) => E.Sim.killPop(s, f, c);
  Gm.settPlague = (s) => s >= 0 && !!G.S.sett[s].plague;
  Gm.endPlague = (s) => E.Sim.endPlague(s);
  Gm.settRep = (s, d) => { if (s >= 0) G.S.sett[s].rep = U.clamp((G.S.sett[s].rep || 0) + d, -100, 100); };
  Gm.settStock = (s, r, a) => { if (s >= 0) G.S.sett[s].stock[r] = (G.S.sett[s].stock[r] || 0) + a; };
  Gm.giantStep = () => E.Sim.giantStep();
  Gm.prophecy = () => E.Sim.prophecy();
  Gm.chron = (s, o) => E.Sim.chron(Gm.fmt(s), o);

  // ---------- предметы ----------
  const Items = E.Items = {};
  Items.make = function (b, o) {
    const base = D.items[b];
    if (!base) { console.warn('нет предмета', b); return null; }
    const it = { u: U.uid(), b, n: base.n, g: base.g, t: base.t, w: base.w || 0, v: base.v || 0 };
    if (base.s) it.s = base.s;
    if (base.dmg) it.dmg = base.dmg.slice();
    if (base.def != null) it.def = base.def;
    if (base.wear) it.mw = it.wr = base.wear;
    if (base.stat) it.stat = base.stat;
    if (base.range) it.range = base.range;
    if (base.crit) it.crit = base.crit;
    if (base.warm) it.warm = base.warm;
    if (base.spell) it.spell = base.spell;
    if (base.mods) it.mods = Object.assign({}, base.mods);
    if (base.vs) it.vs = Object.assign({}, base.vs);
    if (base.st) it.q = 1;
    if (base.light && base.t === 'tool') it.light = base.light;
    if (base.art) it.art = 1;
    if (base.cont) it.cont = 1;
    if (base.music) it.music = 1;
    if (b === 'book') { const r = U.rng(U.hash(Date.now(), Math.random())); it.title = r.pick(D.bookTitles); it.n = '«' + it.title + '»'; }
    if (o) Object.assign(it, o);
    return it;
  };
  Gm.mkItem = (b, o) => Items.make(b, o);
  // Превращение заготовки из сундука в предмет
  Items.realize = function (stub) {
    if (!stub) return null;
    if (stub.u) return stub;
    if (stub.uq != null) {
      const src = G.W.uniques[stub.uq];
      if (G.S.taken['uq' + stub.uq]) return Items.make('rusk');
      const it = JSON.parse(JSON.stringify(src));
      it.u = U.uid();
      return it;
    }
    if (stub.b === 'gold') return { u: U.uid(), b: 'gold', n: 'Монеты', t: 'gold', q: stub.q || 1, w: 0, v: 1 };
    const o = Object.assign({}, stub);
    delete o.b;
    const it = Items.make(stub.b, o);
    if (it && stub.q && D.items[stub.b] && D.items[stub.b].st) it.q = stub.q;
    if (it && it.b === 'book' && !it.text) Items.fillBook(it);
    return it;
  };
  Items.fillBook = function (it) {
    const r = U.rng(G.W.seed, 'book', it.u);
    const p = r.next();
    if (p < 0.35) {
      const pool = G.W.prayers.filter((x) => x.src === 'book' && !G.S.lostPr[x.id]);
      const pr = pool.length ? r.pick(pool) : null;
      if (pr) { it.teach = pr.id; it.text = 'Среди рассуждений — слова молитвы. Ты перечитываешь их, пока они не становятся твоими.'; }
    } else if (p < 0.6) { it.lore = 1; it.text = r.pick(D.loreBooks); }
    else if (p < 0.65) { it.text = r.pick(D.folk); }
    else it.text = r.pick(['Скучно. Очень скучно.', 'Ты продираешься через страницы. Что-то оседает в голове.', 'Половина страниц вырвана.', 'Написано на непонятном наречии. Но картинки красивые.', 'Список чьих-то долгов. Дальше — ещё один.']);
  };
  Items.name = function (it) {
    if (!it) return '';
    if (it.b === 'gold') return it.q + ' ' + U.plural(it.q, 'монета', 'монеты', 'монет');
    let n = it.n;
    if (it.q > 1) n += ' ×' + it.q;
    if (it.water) n += it.water === 'holy' ? ' (святая вода)' : ' (вода)';
    if (it.mw && it.wr <= 0) n += ' (сломан' + U.gr(it.g, '', 'а', 'о', 'ы') + ')';
    return n;
  };
  Items.desc = function (it) {
    const base = D.items[it.b] || {};
    const lines = [];
    if (it.d) lines.push(it.d); else if (base.d) lines.push(base.d);
    const tt = { weapon: 'Оружие', armor: 'Одежда', food: 'Еда', potion: 'Снадобье', mat: 'Материал', tool: 'Инструмент', book: 'Книга', trinket: 'Украшение', misc: 'Вещь', art: 'Вещь' }[it.t] || '';
    const parts = [];
    if (it.dmg) parts.push('урон ' + it.dmg[0] + '–' + it.dmg[1]);
    if (it.def) parts.push('защита ' + it.def);
    if (it.range) parts.push('дальность ' + it.range);
    if (it.mods) for (const k in it.mods) parts.push(STATN[k] + ' ' + (it.mods[k] > 0 ? '+' : '') + it.mods[k]);
    if (it.warm) parts.push('тёплое');
    lines.push(tt + (parts.length ? ': ' + parts.join(', ') : ''));
    if (it.mat) { const m = D.materials.find((x) => x.id === it.mat); if (m) lines.push('Материал: ' + m.gen.replace(/а$|и$|ы$/, (x) => x).replace(/^/, '') ); }
    lines.push('Вес: ' + (Math.round((it.w || 0) * (it.q || 1) * 10) / 10) + (it.mw ? '   Износ: ' + Math.max(0, Math.round(100 - 100 * it.wr / it.mw)) + '%' : ''));
    if (it.hist) { lines.push(''); for (const h of it.hist) lines.push(h); }
    return lines;
  };
  const STATN = E.STATN = { str: 'Сила', dex: 'Ловкость', con: 'Стойкость', int: 'Разум', fai: 'Вера', luck: 'Удача', wil: 'Воля', res: 'Резонанс', def: 'Защита' };

  Gm.weight = () => G.P.inv.reduce((a, i) => a + (i.w || 0) * (i.q || 1), 0);
  Gm.cap = () => 25 + G.P.st.str * 3;
  Gm.has = (b) => G.P.inv.find((i) => i.b === b) || null;
  Gm.count = (b) => G.P.inv.filter((i) => i.b === b).reduce((a, i) => a + (i.q || 1), 0);
  Gm.give = function (b, q, silent) {
    const P = G.P;
    q = q || 1;
    if (b === 'gold') { P.gold += q; if (!silent) Gm.msg('+' + q + ' ' + U.plural(q, 'монета', 'монеты', 'монет'), '#e8c860'); Gm.cnt('gold_earned', q); Gm.gain('gold', q); return null; }
    let it = typeof b === 'string' ? Items.make(b) : b;
    if (!it) return null;
    if (it.b === 'gold') { P.gold += it.q || 1; return null; }
    if (typeof b === 'string' && D.items[b].st) it.q = q;
    if (it.q) {
      const ex = P.inv.find((x) => x.b === it.b && x.q && !x.uq && !it.uq && x.n === it.n && !x.water);
      if (ex) { ex.q += it.q; if (!silent) Gm.msg('Ты берёшь: ' + Items.name(it) + '.'); return ex; }
    }
    P.inv.push(it);
    if (!silent) Gm.msg('Ты берёшь: ' + Items.name(it) + '.');
    if (it.art) Gm.cnt('artifacts');
    return it;
  };
  Gm.take = function (b, q) {
    const P = G.P;
    q = q || 1;
    for (let i = P.inv.length - 1; i >= 0 && q > 0; i--) {
      const it = P.inv[i];
      if (it.b !== b) continue;
      if (it.q > q) { it.q -= q; return true; }
      q -= it.q || 1;
      Gm.removeItem(it);
    }
    return q <= 0;
  };
  Gm.removeItem = function (it) {
    const P = G.P;
    const i = P.inv.indexOf(it);
    if (i >= 0) P.inv.splice(i, 1);
    for (const s in P.eq) if (P.eq[s] === it) P.eq[s] = null;
    if (it.b === 'a_tear' && !it.keep) { G.S.flags.tearLost = 1; }
  };
  Gm.randomUnique = function (tier) {
    const r = U.rng(G.W.seed, 'ru', G.S.time);
    for (let k = 0; k < 50; k++) { const i = r.int(0, G.W.uniques.length - 1); if (!G.S.taken['uq' + i]) { G.S.taken['uq' + i] = 1; return Items.realize({ uq: i }); } }
    return Items.make('ring');
  };

  // ---------- эффекты ----------
  Gm.fx = function (id, dur, data) {
    const P = G.P;
    const d = D.effects[id];
    if (!d) return;
    const until = d.perm ? 1e15 : G.S.time + (dur || 60);
    const ex = P.fx.find((f) => f.id === id);
    if (ex) { ex.until = Math.max(ex.until, until); return; }
    P.fx.push(Object.assign({ id, until, t0: G.S.time }, data || {}));
    if (d.kind === 'curse' || d.kind === 'bless') {
      Gm.msg((d.kind === 'curse' ? 'Тебя коснулось: ' : 'Тебя коснулось: ') + d.n + '. ' + d.d, d.kind === 'curse' ? '#c080c0' : '#a0d0ff');
      const nc = P.fx.filter((f) => D.effects[f.id].kind === 'curse').length, nb = P.fx.filter((f) => D.effects[f.id].kind === 'bless').length;
      P.c.max_curses = Math.max(P.c.max_curses || 0, nc);
      P.c.max_bless = Math.max(P.c.max_bless || 0, nb);
    }
    Gm.calc();
  };
  Gm.hasFx = (id) => G.P.fx.some((f) => f.id === id);
  Gm.rmFx = function (id) { G.P.fx = G.P.fx.filter((f) => f.id !== id); Gm.calc(); };
  Gm.fxFlag = function (k) { // суммирует числовое поле эффектов
    let v = 0;
    for (const f of G.P.fx) { const d = D.effects[f.id]; if (d && d[k]) v = typeof d[k] === 'number' ? (v || 0) + d[k] : 1; }
    return v;
  };
  Gm.fxMul = function (k) {
    let v = 1;
    for (const f of G.P.fx) { const d = D.effects[f.id]; if (d && d[k]) v *= d[k]; }
    return v;
  };

  // ---------- характеристики ----------
  Gm.calc = function () {
    const P = G.P;
    if (!P) return;
    const st = {};
    for (const k of ['str', 'dex', 'con', 'int', 'fai', 'luck', 'wil', 'res']) st[k] = P.base[k] || 0;
    st.def = 0; st.crit = 0; st.dodge = 0;
    const add = (mods) => { if (mods) for (const k in mods) st[k] = (st[k] || 0) + mods[k]; };
    for (const s in P.eq) {
      const it = P.eq[s];
      if (!it) continue;
      if (it.def && !(it.mw && it.wr <= 0)) st.def += it.def;
      add(it.mods);
      if (it.hx) for (const h of it.hx) { if (h.k === 'luck') st.luck += h.v; if (h.k === 'crit') st.crit += h.v; }
      const ah = E.Arts && E.Arts[it.b];
      if (ah && ah.mods) add(ah.mods(P, it));
    }
    for (const f of P.fx) { const d = D.effects[f.id]; if (d && d.mods) add(d.mods); }
    // проклятие одиночества: сила в одиночестве
    if (Gm.hasFx('lonely') && G.map && !G.map.ents.some((e) => e.npc != null && U.dist(e.x, e.y, P.x, P.y) < 8)) st.str += 3;
    for (const k of ['str', 'dex', 'con', 'int', 'fai', 'luck']) st[k] = Math.max(1, st[k]);
    const L = P.level;
    st.mhp = Math.round(20 + st.con * 5 + L * 4 + Math.max(0, L - 100) * 2 + (st.wil || 0) * 2);
    st.mmp = Math.round(5 + st.int * 3 + st.fai * 2 + L);
    st.dodge += st.dex * 2 + st.luck;
    st.crit += 4 + st.luck + Math.floor(st.dex / 3);
    st.def += Math.floor(st.con / 4);
    st.speed = 10 * (Gm.fxFlag('haste') ? 1.5 : 1) * (Gm.fxFlag('slow') ? 0.6 : 1);
    if (Gm.weight() > 25 + st.str * 3) st.speed *= 0.6;
    P.st = st;
    P.mhp = st.mhp; P.mmp = st.mmp;
    if (P.hp > P.mhp) P.hp = P.mhp;
    if (P.mp > P.mmp) P.mp = P.mmp;
  };

  // ---------- опыт и рост ----------
  Gm.need = (L) => Math.round(20 * Math.pow(L, 1.5));
  Gm.xp = function (n) {
    const P = G.P;
    n = Math.max(0, Math.round(n * Gm.fxMul('xp') * (G.P.flags.transcended ? 1.5 : 1)));
    if (!n) return;
    P.xp += n;
    while (P.xp >= Gm.need(P.level)) {
      P.xp -= Gm.need(P.level);
      P.level++;
      P.pts += P.level % 5 === 0 ? 2 : 1;
      Gm.onLevel(P.level);
    }
  };
  Gm.onLevel = function (L) {
    const P = G.P;
    Gm.calc();
    P.hp = P.mhp; P.mp = P.mmp;
    if (L < 999) Gm.msg('Ты чувствуешь, как что-то в тебе крепнет.', '#ffe080');
    if (L === 100) { P.base.wil = 5; P.base.res = 5; Gm.popup('…', 'Ты замечаешь в себе то, чего раньше не было. Волю. Резонанс. Мир звучит в тебе — и ты в нём.'); }
    if (L === 250) { Gm.learnAb('x_echo'); Gm.learnAb('x_fore'); Gm.msg('Твои удары отзываются эхом.', '#ffe080'); }
    if (L === 300) Gm.learnAb('x_fall');
    if (L === 400) Gm.learnAb('x_quiet');
    if (L >= 500) P.talentPts = (P.talentPts || 0) + 1;
    if (L === 500) Gm.popup('…', 'Перед тобой открываются иные пути. Не дороги — деревья. Ветви, которых нет у людей.');
    if (L === 999) { P.flags.transcended = 1; Gm.fx('transcend', 0); Gm.popup('…', 'Счёт обрывается. Цифры больше не нужны. Мир смотрит на тебя иначе — и ты на него.'); }
  };
  Gm.learnAb = function (id) {
    const P = G.P;
    if (P.abil.includes(id)) return;
    P.abil.push(id);
    const a = D.ab[id];
    if (a) Gm.msg('Новое умение: ' + a.n + '.', '#a0e0a0');
  };
  Gm.cnt = function (k, n) { const P = G.P; if (!P) return; P.c[k] = (P.c[k] || 0) + (n == null ? 1 : n); };
  // Рост пути класса
  Gm.gain = function (evt, n) {
    const P = G.P;
    if (!P || !P.cls) return;
    const c = D.classes[P.cls];
    if (!c || !c.gain) return;
    let v = c.gain[evt];
    if (v == null) return;
    v *= n == null ? 1 : n;
    const before = D.rankOf(P.prog[P.cls] || 0);
    P.prog[P.cls] = Math.max(0, (P.prog[P.cls] || 0) + v);
    const after = D.rankOf(P.prog[P.cls]);
    if (after > before) Gm.rankUp(P.cls, after);
  };
  Gm.rankUp = function (cid, r) {
    const P = G.P;
    const c = D.classes[cid];
    P.rank[cid] = r;
    for (const k in c.grow) P.base[k] = (P.base[k] || 0) + c.grow[k];
    for (const [rr, ab] of c.ab) if (rr <= r) Gm.learnAb(ab);
    Gm.msg('Путь «' + c.n + '»: ступень ' + r + '. (' + c.res + ')', '#ffd0a0');
    Gm.calc();
  };
  Gm.setClass = function (cid) {
    const P = G.P;
    const c = D.classes[cid];
    if (!P.paths.includes(cid)) P.paths.push(cid);
    P.cls = cid;
    if (!P.rank[cid]) { P.rank[cid] = 1; P.prog[cid] = 0; for (const k in c.grow) P.base[k] = (P.base[k] || 0) + c.grow[k]; }
    for (const [rr, ab] of c.ab) if (rr <= (P.rank[cid] || 1)) Gm.learnAb(ab);
    Gm.calc();
  };
  Gm.unlock = function (cid) {
    const P = G.P;
    if (P.paths.includes(cid)) return;
    P.paths.push(cid);
    if (!P.cls) { Gm.setClass(cid); Gm.popup('…', 'Что-то в тебе изменилось. Ты чувствуешь это так же ясно, как голод или холод.\n\nТы — ' + D.classes[cid].n + '.\n\n«' + D.classes[cid].d + '»'); }
    else Gm.popup('…', 'Что-то в тебе изменилось. Перед тобой открылся иной путь.\n\n«' + D.classes[cid].d + '»\n\n(Путь можно принять в окне персонажа.)');
  };
  Gm.checkClasses = function () {
    const P = G.P;
    for (const id of D.hiddenClasses) {
      if (P.paths.includes(id)) continue;
      const c = D.classes[id];
      try { if (c.cond(P, G)) { Gm.unlock(id); return; } } catch (e) { /* ignore */ }
    }
    // Странник открывается сам, если долго идти без пути
    if (!P.cls && (P.c.regions || 0) >= 12 && !P.paths.includes('wanderer')) Gm.unlock('wanderer');
  };
  Gm.learn = function (pid, how) {
    const P = G.P;
    if (pid == null || P.prayers.includes(pid)) return false;
    if (G.S.lostPr[pid]) return false;
    const p = G.W.prayers[pid];
    P.prayers.push(pid);
    Gm.cnt('prayers');
    Gm.gain('learn_prayer');
    Gm.msg('Ты запоминаешь молитву: «' + p.n + '».' + (how ? ' (' + how + ')' : ''), '#fff0b0');
    Gm.xp(25 + p.pw * 20);
    return true;
  };

  // ---------- игрок ----------
  Gm.newPlayer = function (name, sex) {
    const r = U.rng(G.W.seed, 'player', name, G.S.time);
    const P = {
      name, sex, age0: r.int(18, 28), born: G.S.time, ageAdd: 0, x: 0, y: 0,
      level: 1, xp: 0, pts: 2, base: { str: 5, dex: 5, con: 5, int: 5, fai: 5, luck: 5, wil: 0, res: 0 }, st: {},
      hp: 1, mp: 1, hunger: 85, cls: null, paths: [], prog: {}, rank: {}, abil: [], cd: {}, prayers: [], prCd: {},
      fx: [], inv: [], eq: { hand: null, body: null, head: null, trinket: null }, gold: 15,
      flags: {}, c: {}, secrets: {}, known: { npc: {}, rumors: {}, regions: {}, recipes: {} }, langs: {}, notes: [],
      light: 0, wanted: {}, pets: [], stillTurns: 0, silentTurns: 0, turn: 0, timeAcc: 0, rebirths: (G.P && G.P.rebirths + 1) || 0,
      lineage: G.P ? (G.P.lineage || []).concat([G.P.name]) : [], hotbar: [],
    };
    G.P = P;
    // стартовые вещи: обычный человек
    const knife = Items.make('knife'); knife.wr = Math.round(knife.mw * 0.6);
    const clothes = Items.make('rags');
    P.inv.push(knife, clothes, Items.make('old_mug'), Object.assign(Items.make('bread'), { q: 2 }));
    P.eq.hand = knife; P.eq.body = clothes;
    Gm.calc();
    P.hp = P.mhp; P.mp = P.mmp;
    return P;
  };
  Gm.age = function () { const P = G.P; return P.age0 + Math.floor((G.S.time - P.born) / (1440 * 360)) + (P.ageAdd || 0); };
})(window.EOF);
