'use strict';
// Городские службы:
//  • доска объявлений на площади: заказы — извести зверьё, награда за разбойников, собрать травы, добыть руду
//    и шкуры, отнести письмо в соседнее село; сдать работу можно у любой доски;
//  • ростовщик (купец в городе): положить деньги в рост или взять в долг; просрочка — «Должник» и злые
//    купцы, пока не вернёшь;
//  • трактир: кости и армрестлинг с завсегдатаями, извозчик до знакомых мест — быстрее каравана, но дороже.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, UI = E.UI, Dlg = E.Dlg, Items = E.Items, MG = E.MapGen, Time = E.Time;
  const GU = E.Guild = {};
  const MW = E.C.MW;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const day = () => Time.day(G.S.time);
  if (!D.effects.indebted) D.effects.indebted = { id: 'indebted', n: 'Должник', kind: 'curse', d: 'Ростовщик ждёт своих денег. Купцы косятся, удача отворачивается.', mods: { luck: -2 } };
  if (!D.items.sealed_letter) D.items.sealed_letter = { id: 'sealed_letter', n: 'Запечатанное письмо', g: 'n', t: 'misc', w: 0.05, v: 0, d: 'Сургуч с оттиском. Адрес выведен аккуратно — не потеряй.' };

  // ---------- доска на площади ----------
  const b0 = MG.build;
  MG.build = function (key) {
    const m = b0.apply(this, arguments);
    try {
      if (m && m.kind === 'over' && m.sett >= 0 && m.spots && m.spots.square && m.settCenter && !m.dimName) {
        const s = G.W.settlements[m.sett];
        if (s && ['capital', 'town', 'village', 'hamlet', 'tree'].includes(s.type)) {
          const c = m.settCenter, near = (x, y) => U.DIR8.some(([dx, dy]) => [T.DOOR, T.WELL, T.GATE].includes(m.tiles[(y + dy) * MW + x + dx]));
          const cand = m.spots.square.filter((p) => p.x !== c.x && p.y !== c.y && !near(p.x, p.y) && TL[m.tiles[p.y * MW + p.x]].walk && !m.feat[p.y * MW + p.x] && U.DIR4.filter(([dx, dy]) => TL[m.tiles[(p.y + dy) * MW + p.x + dx]].walk).length >= 3)
            .sort((a, b) => Math.abs(a.x - c.x) + Math.abs(a.y - c.y) - (Math.abs(b.x - c.x) + Math.abs(b.y - c.y)));
          const p = cand[1] || cand[0];
          if (p) { m.tiles[p.y * MW + p.x] = T.NOTICE; m.spots.notice = p; }
        }
      }
    } catch (e) { console.warn('notice', e); }
    return m;
  };

  // ---------- заказы ----------
  const HERBS = ['h_plantain', 'h_wormwood', 'h_sage', 'h_chamomile', 'h_mint', 'h_nettle', 'h_thyme', 'h_yarrow'].filter((b) => D.items[b]);
  const GOODS = [['hide', 'шкур'], ['iron_ore', 'руды'], ['wood', 'брёвен'], ['bone', 'костей'], ['meat_raw', 'сырого мяса']].filter(([b]) => D.items[b]);
  const BANDITS = new Set(['bandit', 'archer', 'deserter', 'cultist', 'soldier']);
  GU.posted = function (sid) {
    const d3 = Math.floor(day() / 3), key = sid + ':' + d3;
    G.S.board = G.S.board || {};
    for (const k in G.S.board) if (+k.split(':')[1] < d3 - 1) delete G.S.board[k];
    if (G.S.board[key]) return G.S.board[key];
    const r = U.rng(G.W.seed, 'board', key), s = G.W.settlements[sid];
    const lvl = (G.P && G.P.level) || 1, mul = s.type === 'capital' ? 1.6 : s.type === 'town' ? 1.3 : 1;
    const pay = (base) => Math.round((base + lvl * 4) * mul * (0.85 + r.next() * 0.3));
    const out = [];
    const n = s.type === 'hamlet' ? 2 : r.int(3, 5);
    for (let i = 0; i < n; i++) {
      const k = r.pick(['hunt', 'bounty', 'gather', 'fetch', 'deliver', 'hunt', 'gather']);
      const id = key + ':' + i;
      if (k === 'hunt') { const q = r.int(3, 6); out.push({ id, k, sid, need: q, d: 'Извести зверьё и нечисть в округе: ' + q + ' ' + U.plural(q, 'тварь', 'твари', 'тварей') + '. «Скотину режут, детей в лес не пустишь».', pay: pay(20 + q * 6) }); }
      else if (k === 'bounty') { const q = r.int(2, 4); out.push({ id, k, sid, need: q, d: 'Награда за головы: ' + q + ' ' + U.plural(q, 'разбойник', 'разбойника', 'разбойников') + ', дезертиров или сектантов. «Обоз ограбили у брода».', pay: pay(40 + q * 15) }); }
      else if (k === 'gather' && HERBS.length) { const b = r.pick(HERBS), q = r.int(3, 6); out.push({ id, k, sid, b, need: q, d: 'Травница просит: ' + D.items[b].n.toLowerCase() + ' — ' + q + ' шт. «Свежих, с корешком».', pay: pay(10 + q * 4) }); }
      else if (k === 'fetch' && GOODS.length) { const [b, w] = r.pick(GOODS), q = r.int(3, 6); out.push({ id, k, sid, b, need: q, d: 'Мастер купит ' + w + ': ' + q + ' шт. «Плачу сразу, без обмана».', pay: pay(12 + q * 5) }); }
      else {
        // отнести письмо в соседнее поселение
        const near = G.W.settlements.filter((q) => q.id !== sid && q.type !== 'sea' && q.type !== 'vanish' && Math.abs(q.rx - s.rx) + Math.abs(q.ry - s.ry) <= 6 && !(G.S.sett[q.id] && G.S.sett[q.id].destroyed));
        if (!near.length) continue;
        const to = near[r.int(0, near.length - 1)], dd = Math.abs(to.rx - s.rx) + Math.abs(to.ry - s.ry);
        out.push({ id, k: 'deliver', sid, to: to.id, need: 1, d: 'Отнести письмо ' + to.loc.replace(/^в /, 'в ') + ' (' + dd + ' ' + U.plural(dd, 'земля', 'земли', 'земель') + ' пути). «Срочно и в собственные руки».', pay: pay(15 + dd * 8) });
      }
    }
    G.S.board[key] = out;
    return out;
  };
  const mine = () => { const P = G.P; P.contracts = P.contracts || []; return P.contracts; };
  GU.progress = function (c) {
    if (c.k === 'gather' || c.k === 'fetch') return Math.min(c.need, Gm.count(c.b));
    return Math.min(c.need, c.got || 0);
  };
  GU.ready = (c) => (c.k === 'deliver' ? false : GU.progress(c) >= c.need);
  GU.board = function () {
    const m = G.map, sid = m.sett, P = G.P;
    const list = GU.posted(sid).filter((c) => !c.taken);
    const my = mine();
    const opts = [];
    for (const c of my.filter((q) => GU.ready(q))) opts.push({ t: '✔ Сдать: ' + c.d.split('.')[0] + ' — ' + c.pay + ' ' + U.plural(c.pay, 'монета', 'монеты', 'монет'), f: () => GU.turnIn(c) });
    for (const c of list) opts.push({ t: c.d + '  [' + c.pay + ' ' + U.plural(c.pay, 'монета', 'монеты', 'монет') + ']', f: () => {
      if (my.length >= 3) { Gm.msg('Больше трёх заказов разом не унесёшь — сначала сдай что-нибудь.', '#e0a070'); return; }
      c.taken = 1;
      const q = Object.assign({}, c, { got: 0, until: G.S.time + 8 * 1440, from: G.W.settlements[sid].nom });
      my.push(q);
      if (c.k === 'deliver') { const it = Gm.give('sealed_letter', 1, true); if (it) { it.n = 'Письмо ' + (G.W.settlements[c.to].loc.replace(/^в /, 'в ')); it.cid = q.id; } }
      Gm.msg('Ты срываешь листок с доски: «' + c.d + '»', '#e0d0a0');
      Gm.cnt('contracts_taken');
    } });
    if (my.length) opts.push({ t: 'Мои заказы (' + my.length + ')', f: () => UI.popup('Мои заказы', my.map((c) => '• ' + c.d + '\n  ' + (c.k === 'deliver' ? 'Отнести письмо.' : 'Сделано: ' + GU.progress(c) + ' из ' + c.need + '.') + ' Награда: ' + c.pay + '. Срок: ещё ' + Math.max(0, Math.ceil((c.until - G.S.time) / 1440)) + ' дн. (взято ' + c.from + ')').join('\n\n')) });
    opts.push({ t: 'Отойти', f: () => {} });
    UI.menu('Доска объявлений. Листки прибиты гвоздями один поверх другого: просьбы, угрозы, обещания награды.' + (list.length ? '' : '\nСвежих заказов нет — загляни через пару дней.'), opts);
  };
  GU.turnIn = function (c) {
    const P = G.P, my = mine();
    if (c.k === 'gather' || c.k === 'fetch') Gm.take(c.b, c.need);
    my.splice(my.indexOf(c), 1);
    P.gold += c.pay;
    Gm.cnt('contracts_done'); if (Gm.xp) Gm.xp(10 + Math.round(c.pay / 4));
    const s = G.W.settlements[c.sid];
    if (G.S.sett[c.sid]) G.S.sett[c.sid].fame = (G.S.sett[c.sid].fame || 0) + 1;
    Gm.msg('Работа сдана' + (s ? ' (заказ ' + s.gen + ')' : '') + ': +' + c.pay + ' ' + U.plural(c.pay, 'монета', 'монеты', 'монет') + '.', '#e8c860');
  };
  // убитые твари и разбойники идут в зачёт
  const kill0 = E.Combat.kill;
  E.Combat.kill = function (e, src) {
    const r = kill0.apply(this, arguments);
    try {
      if (e && (src === 'player' || src === 'ally') && G.P && G.P.contracts) {
        for (const c of G.P.contracts) {
          if (c.k === 'hunt' && e.kind === 'mon' && !(e.tags || []).includes('human') && e.ai !== 'passive') c.got = (c.got || 0) + 1;
          if (c.k === 'bounty' && (BANDITS.has(e.tpl) || (e.kind === 'mon' && (e.tags || []).includes('human')))) c.got = (c.got || 0) + 1;
          if ((c.k === 'hunt' || c.k === 'bounty') && c.got === c.need) Gm.msg('Заказ выполнен: «' + c.d.split('.')[0] + '». Сдай его у любой доски объявлений.', '#e0d070');
        }
      }
    } catch (err) { /* */ }
    return r;
  };
  // письмо доходит само, как только входишь в нужное поселение; просроченные заказы сгорают
  const lm0 = Gm.loadMap;
  Gm.loadMap = function () {
    const r = lm0.apply(this, arguments);
    try {
      const P = G.P, m = G.map;
      if (P && P.contracts) for (const c of P.contracts.slice()) {
        if (c.k === 'deliver' && m.sett === c.to) {
          const it = P.inv.find((i) => i.b === 'sealed_letter' && i.cid === c.id);
          if (it) Gm.removeItem(it);
          P.contracts.splice(P.contracts.indexOf(c), 1);
          P.gold += c.pay; Gm.cnt('contracts_done'); if (Gm.xp) Gm.xp(10 + Math.round(c.pay / 4));
          Gm.msg('Ты отдаёшь письмо адресату. Тот ломает сургуч, читает — и молча отсчитывает ' + c.pay + ' ' + U.plural(c.pay, 'монету', 'монеты', 'монет') + '.', '#e8c860');
        } else if (c.until < G.S.time) {
          P.contracts.splice(P.contracts.indexOf(c), 1);
          const it = P.inv.find((i) => i.b === 'sealed_letter' && i.cid === c.id); if (it) Gm.removeItem(it);
          Gm.msg('Срок заказа вышел: «' + c.d.split('.')[0] + '». Листок можно выбросить.', '#a09080');
        }
      }
    } catch (e) { /* */ }
    return r;
  };

  // ---------- ростовщик ----------
  const bank = () => { G.S.bank = G.S.bank || { dep: 0, t: G.S.time, loan: 0, due: 0 }; const B = G.S.bank; const days = (G.S.time - B.t) / 1440; if (days > 0) { B.dep = Math.floor(B.dep * Math.pow(1.004, days)); B.t = G.S.time; } return B; };
  GU.bankMenu = function () {
    const P = G.P, B = bank();
    const lim = 100 + P.level * 25;
    const late = B.loan > 0 && G.S.time > B.due;
    const head = 'Ростовщик поправляет очки: «Деньги должны работать. Твои — у меня, мои — у тебя. Всё честно».\nВ рост положено: ' + B.dep + ' (растёт понемногу каждый день).' + (B.loan ? ' Долг: ' + B.loan + (late ? ' — ПРОСРОЧЕН!' : ', вернуть через ' + Math.max(0, Math.ceil((B.due - G.S.time) / 1440)) + ' дн.') : '');
    const opts = [];
    for (const v of [10, 50, 200]) if (P.gold >= v) opts.push({ t: 'Положить в рост ' + v, f: () => { P.gold -= v; B.dep += v; Gm.msg('Монеты легли в окованный ларец. Ростовщик записывает в книгу.', '#c8b890'); } });
    if (B.dep > 0) opts.push({ t: 'Забрать всё (' + B.dep + ')', f: () => { P.gold += B.dep; Gm.msg('+' + B.dep + ' монет.', '#e8c860'); B.dep = 0; } });
    if (!B.loan) opts.push({ t: 'Взять в долг ' + lim + ' (вернуть ' + Math.round(lim * 1.2) + ' за две недели)', f: () => { B.loan = Math.round(lim * 1.2); B.due = G.S.time + 14 * 1440; P.gold += lim; Gm.msg('Ростовщик отсчитывает ' + lim + ' монет: «Две недели. Не заставляй меня искать тебя».', '#e0c080'); } });
    else if (P.gold > 0) opts.push({ t: 'Вернуть долг (' + Math.min(B.loan, P.gold) + ')', f: () => { const k = Math.min(B.loan, P.gold); P.gold -= k; B.loan -= k; if (!B.loan) { Gm.rmFx('indebted'); Gm.msg('Долг закрыт. Ростовщик вычёркивает твоё имя — почти с сожалением.', '#c8e0a0'); } else Gm.msg('Осталось вернуть ' + B.loan + '.', '#e0c080'); } });
    opts.push({ t: 'Уйти', f: () => {} });
    UI.menu(head, opts);
  };
  // просрочка: «Должник», купцы дерут втридорога
  const tk0 = Gm.tick;
  let lastD = -1;
  Gm.tick = function () {
    const r = tk0.apply(this, arguments);
    try { const d = day(); if (d !== lastD) { lastD = d; const B = G.S.bank; if (B && B.loan > 0 && G.S.time > B.due) { if (!Gm.hasFx('indebted')) { Gm.fx('indebted', 0); Gm.msg('Срок долга вышел. По городам уже шепчутся, что ты должен ростовщику.', '#e08080'); } B.loan = Math.round(B.loan * 1.01); } } } catch (e) { /* */ }
    return r;
  };
  const pm0 = Dlg.priceMul;
  Dlg.priceMul = function (e, b, buy) { let m = pm0.apply(this, arguments); if (G.P && Gm.hasFx('indebted')) m *= buy ? 1.2 : 0.85; return m; };

  // ---------- трактир: игры и извозчик ----------
  GU.arm = function (e) {
    const P = G.P;
    G.S.armDay = G.S.armDay || {};
    if (G.S.armDay[G.map.key] === day()) return 'Завсегдатаи потирают руки: «Хватит на сегодня, а то без рук останемся».';
    if (P.gold < 10) return 'На руку — десять монет. Иначе какой интерес?';
    G.S.armDay[G.map.key] = day();
    const me = P.st.str * 2 + P.st.con + Math.random() * 12, him = 12 + Math.random() * 14;
    Gm.cnt('armwrestle');
    if (me > him) { P.gold += 10; return pick(['Локоть к локтю, жилы вздуты — и рука кузнеца с грохотом ложится на стол. Трактир ревёт! +10.', 'Ты кладёшь здоровенного возчика, и тот, потирая запястье, ставит тебе кружку. +10.']); }
    P.gold -= 10; return pick(['Твоя рука медленно, но верно ползёт к столу. Бах! −10. «Приходи, как подкачаешься».', 'Мельник даже не моргнул. −10 монет и ноющее плечо.']);
  };
  GU.coach = function () {
    const P = G.P, cur = Gm.region();
    const list = [];
    for (const s of G.W.settlements) {
      if (!P.known.regions[s.region] || (G.S.sett[s.id] && G.S.sett[s.id].destroyed) || s.type === 'sea' || s.type === 'vanish') continue;
      const g = G.W.regions[s.region];
      if (g.exist !== 'always' || (cur && g.id === cur.id)) continue;
      const d = cur ? Math.abs(g.x - cur.x) + Math.abs(g.y - cur.y) : 5;
      if (d > 14) continue;
      list.push({ s, d, cost: 8 + d * 5, hours: d * 3 });
    }
    list.sort((a, b) => a.d - b.d);
    UI.list({ title: 'Извозчик', header: list.length ? 'Возок на рессорах, пара гнедых. «Куда изволите? Быстрее каравана, только платить вперёд».' : 'Ты не знаешь ни одного места, куда можно доехать.', items: list.slice(0, 18).map((t) => ({ t: t.s.nom + ' — ' + t.d + ' ' + U.plural(t.d, 'земля', 'земли', 'земель') + ', ' + t.hours + ' ч', r: t.cost + ' м', f: () => {
      UI.pop();
      if (P.gold < t.cost) { Gm.msg('Не хватает монет.'); return 'keep'; }
      P.gold -= t.cost;
      Gm.msg('Возок трогается, колёса стучат по камням...', '#d0c0a0');
      E.Sim.advance(t.hours * 60, () => { Gm.playerHour(); return !P.dead; });
      if (P.dead) return 'keep';
      const g = G.W.regions[t.s.region];
      Gm.loadMap('o:' + g.x + ':' + g.y, -1, -1, 'tp');
      Gm.cnt('coach_trips');
      Gm.endTurn(1);
      UI.render();
      return 'keep';
    } })), empty: '—' });
  };
  const op0 = Dlg.options;
  Dlg.options = function (e) {
    const o = op0.apply(this, arguments);
    try {
      if (!e || e.npc == null || e.hostile) return o;
      const job = E.Sim.job(e.npc), sid = E.Sim.settOf(e.npc), s = sid >= 0 ? G.W.settlements[sid] : null;
      const add = [];
      if (job === 'innkeeper') {
        add.push({ t: 'Сыграть в кости с завсегдатаями…', f: () => { UI.menu('Стол у очага, кружки, гвалт. «Ставка — какую не жалко».', [5, 20, 50].map((v) => ({ t: 'Ставка ' + v, f: () => Gm.msg(E.Markets ? E.Markets.dice(null, v) : '', '#e0d0a0') })).concat([{ t: 'Передумать', f: () => {} }])); return null; } });
        add.push({ t: 'Помериться силой на руках (10 монет)', f: () => GU.arm(e) });
        add.push({ t: 'Позвать извозчика', f: () => { GU.coach(); return null; } });
      }
      if (job === 'merchant' && s && (s.type === 'town' || s.type === 'capital')) add.push({ t: 'Дела с ростовщиком (вклад, долг)', f: () => { GU.bankMenu(); return null; } });
      if (add.length) o.splice(Math.max(0, o.length - 1), 0, ...add);
    } catch (err) { /* */ }
    return o;
  };
  // доска — «использовать»
  const iat0 = Gm.interactAt;
  Gm.interactAt = function (x, y) {
    const m = G.map;
    if (m && m.tiles[y * m.w + x] === T.NOTICE && m.sett >= 0) { GU.board(); return true; }
    return iat0.apply(this, arguments);
  };
})(window.EOF);
