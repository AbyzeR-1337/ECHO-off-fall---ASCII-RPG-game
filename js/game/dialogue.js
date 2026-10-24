'use strict';
// Разговоры, торговля, обучение, подарки, преступления.
(function (E) {
  const U = E.U, D = E.D, T = E.T, TL = E.TL, Time = E.Time;
  const G = E.G, Gm = E.Gm, Items = E.Items;
  const Dlg = E.Dlg = {};
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  Gm.knows = (id) => !!(G.P.known.npc[id] && G.P.known.npc[id].name);
  Gm.meet = function (id) { const k = G.P.known.npc; k[id] = k[id] || { t: G.S.time }; return k[id]; };
  Dlg.label = function (e) {
    if (e.npc == null) return e.n;
    const n = Gm.npc(e.npc);
    if (Gm.knows(e.npc)) return n.first + (n.sur ? ' ' + n.sur : '');
    return U.cap(n.look || 'незнакомец');
  };

  // ---------- реплики ----------
  Dlg.greet = function (e) {
    const id = e.npc;
    const n = Gm.npc(id);
    const st = G.S.npc[id] || {};
    const op = Gm.opinion(id);
    const P = G.P;
    if (e.asleep) return pick(D.talk.asleep);
    if (P.flags.transcended) return pick(D.talk.deeds.transcend);
    if (Gm.fxFlag('mute')) return '...';
    if (st.hate && (st.m || []).some((m) => m.k === 'relKiller')) { const m = st.m.find((x) => x.k === 'relKiller'); return D.talk.deeds.relKiller[0].replace('$rel', U.acc(Gm.npc(m.who).first, Gm.npc(m.who).sex)); }
    if (op < -40) return pick(D.talk.greetFear.concat(D.talk.greetHate));
    if (op < -15) return pick(D.talk.greetHate);
    if (st.grief && G.S.time - st.grief.t < 1440 * 20) return pick(D.talk.grief).replace('$rel', Gm.npc(st.grief.who).first);
    if (Gm.night() && Time.hour(G.S.time) < 4 && e.job !== 'innkeeper' && e.job !== 'shadow' && e.job !== 'guard') return pick(D.talk.greetNight);
    if (P.flags.dragonSlayer && Math.random() < 0.3) return pick(D.talk.deeds.dragon);
    const kn = P.known.npc[id];
    if (kn && kn.name && op > 25) return pick(D.talk.greetLike);
    if (kn && kn.name) return pick(D.talk.greetKnown);
    return pick(D.talk.greetHi);
  };
  Dlg.smalltalk = function (e) {
    const id = e.npc;
    const n = Gm.npc(id);
    const sid = E.Sim.settOf(id);
    const ss = sid >= 0 ? G.S.sett[sid] : null;
    const pool = [];
    if (ss) {
      if (ss.famine > 2) pool.push(...D.talk.famine);
      if (ss.plague) pool.push(...D.talk.plague);
      if (Gm.atWar(ss.fac)) pool.push(...D.talk.war);
      if (G.S.cults.some((c) => c.sett === sid)) pool.push(...D.talk.cult);
      const st = G.W.settlements[sid];
      if (st.b.smith && !E.Sim.jobCount(sid, 'smith')) pool.push(...D.talk.noSmith);
      if (st.b.mine && ss.mineDead) pool.push(...D.talk.noIron);
      if (st.b.dock && E.Sim.jobCount(sid, 'fisher') === 0) pool.push(...D.talk.noFish);
    }
    if (Gm.event('nosun')) pool.push(...D.talk.nosun);
    if (Gm.event('harvest')) pool.push(...D.talk.harvest);
    const w = Gm.weather();
    if (D.talk.weather[w]) pool.push(...D.talk.weather[w]);
    pool.push(...D.talk.season[Gm.season()]);
    for (const t of n.traits || []) if (D.talk.trait[t]) pool.push(...D.talk.trait[t], ...D.talk.trait[t]);
    // фольклор — редко, и не всегда правда
    if (Math.random() < 0.12) {
      const f = pick(D.folk);
      return (n.traits || []).includes('liar') ? 'Слышал{|а} я однажды: ' + f.toLowerCase() : f;
    }
    if (n.lostChild && Math.random() < 0.5) return 'У меня была дочка. ' + n.lostChild + '. Пропала у реки. Осталась только её кукла... и той нет.';
    return pick(pool);
  };
  Dlg.self = function (e) {
    const id = e.npc;
    const n = Gm.npc(id);
    const job = E.Sim.job(id);
    const j = D.jobs[job];
    const sid = E.Sim.settOf(id);
    const age = E.Sim.age(id);
    const k = Gm.meet(id);
    k.name = 1;
    const parts = [];
    parts.push('Меня зовут ' + n.first + (n.sur ? ' ' + n.sur : '') + '.');
    if (j && job !== 'child') parts.push('Я ' + (j[n.sex] || j.m) + (sid >= 0 ? ', живу ' + G.W.settlements[sid].loc : '') + '.');
    else if (job === 'child') parts.push('Мне ' + age + ' ' + U.plural(age, 'год', 'года', 'лет') + '!');
    const fam = E.Sim.famOf(id).filter((x) => E.Sim.isAlive(x)).slice(0, 3).map((x) => Gm.npc(x).first);
    const dead = E.Sim.famOf(id).filter((x) => !E.Sim.isAlive(x)).slice(0, 2).map((x) => Gm.npc(x).first);
    if (fam.length) parts.push('Родня моя: ' + fam.join(', ') + '.');
    if (dead.length) parts.push(dead.join(' и ') + ' — уже в земле.');
    if (Math.random() < 0.7) parts.push('Боюсь я ' + D.fears[n.fear] + '.');
    const hb = D.habits[n.habit];
    if (hb && Math.random() < 0.6) parts.push('Я из тех, кто ' + hb[0] + '.');
    if (n.keeps && n.keeps.some((p) => !G.S.lostPr[p])) parts.push('Я ещё помню старые молитвы. Таких, как я, мало осталось.');
    if (E.Sim.job(id) === 'ruler') { const f = G.W.factions.find((x) => G.S.fac[x.id].ruler === id); if (f) parts.push('Я правлю ' + U.ins(f.short).replace(/ом$/, 'ом') + '.'); }
    k.notes = parts.join(' ');
    k.job = job;
    k.sett = sid;
    return parts.join(' ');
  };
  Dlg.rumor = function (e) {
    const id = e.npc;
    const P = G.P;
    const list = E.Sim.rumorsFor(id).filter((c) => !c.seenBy || !c.seenBy[id]);
    if (!list.length) return pick(D.talk.noRumor);
    const fresh = list.find((c) => !P.known.rumors[c.t + c.s]) || list[0];
    P.known.rumors[fresh.t + fresh.s] = { t: fresh.t, s: fresh.s, heard: G.S.time, from: id };
    Gm.cnt('rumors'); Gm.gain('rumor');
    fresh.seen = fresh.seen || 0;
    const ago = Math.round((G.S.time - fresh.t) / 1440);
    const when = ago <= 1 ? 'Вчера' : ago < 7 ? ago + ' ' + U.plural(ago, 'день', 'дня', 'дней') + ' назад' : ago < 40 ? 'Недавно' : 'Давно уже';
    const n = Gm.npc(id);
    const intro = (n.traits || []).includes('liar') && Math.random() < 0.3 ? 'Врать не буду, сам{|а} не видел{|а}, но ' : '';
    return intro + when + ' — ' + fresh.s.charAt(0).toLowerCase() + fresh.s.slice(1);
  };

  // ---------- набор вариантов разговора ----------
  Dlg.options = function (e) {
    const id = e.npc;
    const P = G.P;
    const opts = [];
    if (e.ghostShop != null) { opts.push({ t: 'Посмотреть товар', f: () => E.UI.trade(e, 'fair') }); opts.push({ t: 'Уйти', f: () => 'close' }); return opts; }
    if (e.ghost && id != null) { opts.push({ t: 'Спросить, как он(а) умер(ла)', f: () => { const st = G.S.npc[id] || {}; Gm.cnt('ghost_talks'); Gm.gain('spirit_talk'); Gm.cnt('spirit_talks'); return 'Я ' + Gm.npc(id).first + '. Я ' + String(st.dc || 'просто ушёл(ла)').replace(/\(ла\)/g, Gm.npc(id).sex === 'f' ? 'ла' : '').replace(/\(а\)/g, Gm.npc(id).sex === 'f' ? 'а' : '') + '. Здесь тихо.'; } }); }
    if (id == null) { opts.push({ t: 'Уйти', f: () => 'close' }); return opts; }
    const n = Gm.npc(id);
    if (e.asleep) { opts.push({ t: 'Разбудить', f: () => { e.asleep = 0; e.ai = 'npc'; Gm.op(id, -5); return 'А?! Что?! Кто здесь?!'; } }); opts.push({ t: 'Уйти', f: () => 'close' }); return opts; }
    if (Gm.fxFlag('mute')) { opts.push({ t: '(Ты не можешь говорить)', f: () => 'close' }); return opts; }
    const op = Gm.opinion(id);
    if (op < -50 && !e.guard) { opts.push({ t: 'Уйти', f: () => 'close' }); return opts; }
    opts.push({ t: 'Поговорить', f: () => Dlg.smalltalk(e) });
    opts.push({ t: 'Что нового?', f: () => Dlg.rumor(e) });
    opts.push({ t: 'Расскажи о себе', f: () => Dlg.self(e) });
    const job = E.Sim.job(id);
    const j = D.jobs[job] || {};
    const sid = E.Sim.settOf(id);
    if (j.shop && sid >= 0 && !G.S.sett[sid].destroyed) opts.push({ t: 'Торговать', f: () => { E.UI.trade(e, j.shop); return null; } });
    if (n.deep) opts.push({ t: 'Торговать', f: () => { E.UI.trade(e, 'deep'); return null; } });
    if (job === 'smith') opts.push({ t: 'Починить вещи', f: () => Dlg.repair(e) });
    if (job === 'innkeeper') opts.push({ t: 'Снять комнату на ночь (6 монет)', f: () => Dlg.room(e) });
    if (job === 'healer' || job === 'priest') opts.push({ t: 'Попросить исцеления (10 монет)', f: () => Dlg.healSvc(e) });
    if (job === 'priest' || job === 'monk') opts.push({ t: 'Попросить благословения (40 монет)', f: () => Dlg.blessSvc(e) });
    if (j.trains) opts.push({ t: 'Попросить научить своему ремеслу', f: () => Dlg.train(e, j.trains) });
    if (n.keeps && n.keeps.length) opts.push({ t: 'Расспросить о старых молитвах', f: () => Dlg.keeper(e) });
    if (j.caravan) opts.push({ t: 'Отправиться с караваном', f: () => { E.UI.travel(false, e); return null; } });
    if (e.guard && sid >= 0 && Gm.isWanted(sid)) opts.push({ t: 'Заплатить штраф (' + Gm.fine(sid) + ' монет)', f: () => Dlg.payFine(e, sid) });
    if (job === 'boatman' && G.map.dimName !== 'spirit' && n.special !== 'ferryman') { /* лодки продаются в торговле */ }
    // сюжеты
    for (const s of D.stories) {
      const roles = G.W.storyRoles[s.id];
      if (!roles || !s.talk) continue;
      try {
        const so = s.talk(n, Gm.st(s.id), roles) || [];
        for (const o of so) opts.push({ t: o.t, f: () => { G.dlgReply = null; o.f(); return G.dlgReply || null; }, story: 1 });
      } catch (err) { console.warn('story talk', s.id, err); }
    }
    opts.push({ t: 'Подарить...', f: () => { E.UI.pickItem('Что подарить?', (it) => it.b !== 'gold', (it) => Dlg.gift(e, it)); return null; } });
    if (P.gold >= 5) opts.push({ t: 'Дать монет', f: () => Dlg.giveGold(e) });
    opts.push({ t: 'Напасть', f: () => { E.UI.confirm('Напасть на ' + U.acc(n.first, n.sex) + '?', () => { e.wasPeaceful = 1; E.Combat.playerAttack(e, { force: 1 }); e.hostile = true; Gm.endTurn(1); }); return 'close'; } });
    opts.push({ t: 'Уйти', f: () => 'close' });
    return opts;
  };
  Dlg.onTalk = function (e) {
    const P = G.P;
    if (e.npc == null) return;
    const n = Gm.npc(e.npc);
    Gm.meet(e.npc);
    P.silentHours = 0;
    Gm.cnt('talks'); Gm.gain('talk');
    if (Gm.day() === P.startDay) P.flags.talked_first_day = 1;
    const job = E.Sim.job(e.npc);
    if (job === 'priest' || job === 'monk') P.flags.talkedPriest = 1;
    Gm.fire('talk', { npc: n });
    // кольцо чужой памяти
    if (P.eq.trinket && P.eq.trinket.b === 'a_memring') {
      const st = G.S.npc[e.npc] || {};
      const mem = [];
      if (n.keeps && n.keeps.length) mem.push('помнит молитвы: ' + n.keeps.map((p) => '«' + G.W.prayers[p].n + '»').slice(0, 2).join(', '));
      if (G.W.npcUq[e.npc] != null && !G.S.taken['uq' + G.W.npcUq[e.npc]]) mem.push('хранит дома: ' + G.W.uniques[G.W.npcUq[e.npc]].n);
      if (G.W.npcItem[e.npc]) mem.push('держит в сундуке: ' + D.items[G.W.npcItem[e.npc]].n.toLowerCase());
      if (n.lostChild) mem.push('потеряла дочь у реки');
      for (const s in G.W.storyRoles) { const r = G.W.storyRoles[s]; for (const k in r) if (r[k] === e.npc) mem.push('связан{|а} с чем-то большим («' + (D.stories.find((x) => x.id === s) || {}).n + '»)'); }
      if (mem.length) Gm.msg('(Чужая память: ' + Gm.fmt(mem.join('; '), n) + ')', '#c0a0e0');
    }
  };

  // ---------- услуги ----------
  Dlg.repair = function (e) {
    const sid = E.Sim.settOf(e.npc);
    const ss = G.S.sett[sid];
    const P = G.P;
    const broken = P.inv.filter((i) => i.mw && i.mw < 5000 && i.wr < i.mw);
    if (!broken.length) return 'Всё у тебя в порядке. Иди.';
    if (ss.stock.iron < 1) return 'Железа нет. Без железа не починю. Шахта-то...';
    const cost = broken.reduce((a, i) => a + Math.ceil((i.mw - i.wr) / i.mw * (i.v || 10) * 0.3) + 1, 0);
    if (P.gold < cost) return 'Это будет стоить ' + cost + ' ' + U.plural(cost, 'монету', 'монеты', 'монет') + '. У тебя нет столько.';
    P.gold -= cost; Gm.cnt('gold_spent', cost);
    for (const i of broken) { i.wr = i.mw; i.brokeMsg = 0; }
    ss.stock.iron = Math.max(0, ss.stock.iron - 1);
    Gm.calc();
    return 'Готово. ' + cost + ' ' + U.plural(cost, 'монета', 'монеты', 'монет') + '. Как новое.';
  };
  Dlg.room = function (e) {
    const P = G.P;
    if (P.gold < 6) return 'Шесть монет. Не меньше.';
    P.gold -= 6;
    const sp = G.map.spots.tavern;
    const bed = sp && sp.in.find((p) => G.map.tiles[p.y * G.map.w + p.x] === T.BED);
    if (bed) { const occ = Gm.entAt(bed.x, bed.y); if (!occ) { P.x = bed.x; P.y = bed.y; } }
    E.UI.closeAll();
    Gm.rest(0, 7);
    return null;
  };
  Dlg.healSvc = function (e) {
    const P = G.P;
    if (P.gold < 10) return 'Десять монет на свечи и травы.';
    P.gold -= 10;
    P.hp = P.mhp;
    for (const id of ['poison', 'bleed', 'burn', 'fear', 'weak']) Gm.rmFx(id);
    return 'Ступай с миром.';
  };
  Dlg.blessSvc = function (e) {
    const P = G.P;
    if (P.gold < 40) return 'Боги не торгуются. Но храму нужны свечи. Сорок монет.';
    P.gold -= 40;
    const b = D.blessIds[rnd(0, D.blessIds.length - 1)];
    Gm.fx(b, 60 * 24 * 5);
    Gm.gain('pray');
    return 'Да будет так.';
  };
  Dlg.train = function (e, cid) {
    const P = G.P;
    const c = D.classes[cid];
    if (P.cls === cid) return 'Я тебя уже учил{|а}. Дальше — сам[|а].';
    const req = c.req || {};
    const op = Gm.opinion(e.npc);
    for (const k of ['str', 'dex', 'int', 'fai']) if (req[k] && P.st[k] < req[k]) return { str: 'Слабоват[|а] ты. Окрепни сначала.', dex: 'Неуклюж[|а]. Не выйдет.', int: 'Тут голова нужна. Подучись сначала.', fai: 'Ты не умеешь верить. Это не купишь.' }[k];
    if (req.regions && (P.c.regions || 0) < req.regions) return 'Ты ещё мало где был[|а]. Походи по миру — потом поговорим.';
    if (cid === 'assassin' && (P.c.npc_kills || 0) === 0 && op < 30) return 'Тебе нечего здесь делать. Ты никого не убивал[|а].';
    const price = Math.max(0, Math.round((req.gold || 0) * (op > 30 ? 0.5 : 1)));
    if (P.gold < price) return 'Это стоит ' + price + ' ' + U.plural(price, 'монету', 'монеты', 'монет') + '.';
    E.UI.confirm('Стать: ' + c.n + '? (' + price + ' монет)', () => { P.gold -= price; Gm.setClass(cid); Gm.popup(c.n, 'Ты учишься днями и ночами. Однажды утром понимаешь: ты — ' + c.n.toLowerCase() + '.\n\n«' + c.d + '»'); E.Sim.advance(60 * 24 * 3, () => { Gm.playerHour(); return true; }); });
    return 'Учить буду строго.';
  };
  Dlg.keeper = function (e) {
    const P = G.P;
    const n = Gm.npc(e.npc);
    const op = Gm.opinion(e.npc);
    const avail = n.keeps.filter((p) => !P.prayers.includes(p) && !G.S.lostPr[p]);
    if (!avail.length) return 'Всё, что знал{|а}, — ты уже знаешь.';
    if (op < 15 && E.Sim.age(e.npc) < 90) return 'Не тебе это знать. Пока.';
    Gm.learn(avail[0], 'Хранитель');
    Gm.op(e.npc, 5);
    return 'Слушай. И запоминай. Когда я умру — помнить будешь только ты.';
  };
  Dlg.gift = function (e, it) {
    const P = G.P;
    const n = Gm.npc(e.npc);
    if (Gm.fire('gift', { npc: n, item: it })) { Gm.removeItem(it); Gm.cnt('gifts'); Gm.gain('gift'); return; }
    if (Gm.storyHook('gift', { npc: n, item: it })) { Gm.removeItem(it); return; }
    const b = D.items[it.b] || {};
    let v = Math.min(40, Math.round(Math.sqrt((it.v || 1) * (it.q || 1)) * 2 + 2));
    const hb = D.habits[n.habit] && D.habits[n.habit][1];
    if (hb === 'sweet' && ['honey', 'pie'].includes(it.b)) v += 25;
    if ((n.traits || []).includes('drunk') && it.b === 'ale') v += 25;
    if (hb === 'book' && it.b === 'book') v += 25;
    if (hb === 'dice' && it.b === 'dice') v += 30;
    if (hb === 'charm' && it.b === 'charm') v += 25;
    if (E.Sim.job(e.npc) === 'beggar' && b.t === 'food') v += 20;
    if ((n.traits || []).includes('greedy')) v = Math.round(v * 1.3);
    if ((n.traits || []).includes('proud') && (it.v || 0) < 5) v = -5;
    Gm.removeItem(it);
    Gm.op(e.npc, v);
    Gm.cnt('gifts'); Gm.gain('gift');
    Gm.say(n, v > 20 ? 'О! Спасибо тебе! Не ожидал{|а}.' : v > 5 ? 'Спасибо.' : v < 0 ? 'Это что, подачка?' : 'Ну... спасибо.');
  };
  Dlg.giveGold = function (e) {
    const P = G.P;
    const q = Math.min(P.gold, 10);
    P.gold -= q;
    Gm.op(e.npc, 3 + q);
    Gm.cnt('gifts'); Gm.gain('gift');
    return E.Sim.job(e.npc) === 'beggar' ? 'Храни тебя боги!' : 'Спасибо...';
  };
  Dlg.payFine = function (e, sid) {
    const P = G.P;
    const f = Gm.fine(sid);
    if (P.gold < f) return 'Нет денег — будет тюрьма. Или хуже.';
    P.gold -= f;
    delete P.wanted[sid];
    for (const x of G.map.ents) if (x.guard) x.hostile = false;
    return 'Ладно. Но я тебя запомнил[|а]... то есть запомнил{|а}.';
  };

  // ---------- преступления ----------
  Gm.isWanted = (sid) => sid >= 0 && G.P.wanted[sid] && G.S.time - G.P.wanted[sid].t < 1440 * 10;
  Gm.fine = (sid) => (G.P.wanted[sid] ? 30 + G.P.wanted[sid].n * 40 : 0);
  Gm.crime = function (victim, kind) {
    const P = G.P, m = G.map;
    if (m.sett < 0) { if (victim && victim.npc != null) E.Sim.mem(victim.npc, { k: 'attacked' }); return; }
    const mask = P.eq.head && P.eq.head.b === 'mask';
    let seen = 0;
    for (const e of m.ents) {
      if (e.npc == null || e.asleep || e === victim) continue;
      if (U.dist(e.x, e.y, P.x, P.y) > 8) continue;
      if (!E.FOV.los(m, e.x, e.y, P.x, P.y)) continue;
      seen++;
      if (!mask) { E.Sim.mem(e.npc, { k: kind === 'theft' ? 'thief' : 'killer' }); Gm.op(e.npc, kind === 'theft' ? -15 : -40); }
      if (!e.guard) e.flee = 1; else e.hostile = true;
      if (!e.guard && Math.random() < 0.5) Gm.msg(U.cap(Dlg.label(e)) + ' кричит: «Стража!»', '#ffb070');
    }
    if (victim && victim.npc != null) { E.Sim.mem(victim.npc, { k: 'attacked' }); Gm.op(victim.npc, -60); }
    if (seen && !mask) {
      const w = P.wanted[m.sett] || { n: 0, t: 0 };
      w.n++; w.t = G.S.time;
      P.wanted[m.sett] = w;
      Gm.settRep(m.sett, kind === 'theft' ? -5 : -15);
      Gm.cnt('wanted_places', w.n === 1 ? 1 : 0);
      if (kind === 'theft') { Gm.cnt('thefts'); Gm.gain('theft'); }
    } else if (kind === 'theft') { Gm.cnt('thefts'); Gm.gain('theft'); }
  };
  Gm.crimeArea = function (kind) { Gm.crime(null, kind); };
  Gm.duel = function (id) {
    const e = G.map.ents.find((x) => x.npc === id);
    if (!e) return;
    e.duel = 1; e.hostile = false;
    E.UI.closeAll();
    Gm.msg('Поединок! До первой серьёзной раны.', '#ffd080');
  };
  Gm.duelEnd = function (e, won) {
    Gm.msg(U.cap(e.n) + ' опускает оружие. «Хватит».', '#ffd080');
    Gm.storyHook('duelEnd', { npc: e.npc, won });
  };
  Gm.npcToBoss = function (id, bossId) {
    const e = G.map.ents.find((x) => x.npc === id);
    if (!e) return;
    const x = e.x, y = e.y;
    Gm.removeEnt(e);
    E.Sim.kill(id, 'исчез(ла)', { quiet: 1 });
    G.S.boss[bossId] = {};
    Gm.spawnBossQuiet(bossId, x, y);
  };

  // ---------- торговля ----------
  const SHOP = {
    general: ['bread', 'rusk', 'torch', 'rope', 'flint', 'bedroll', 'salt', 'empty_bottle', 'lamp_oil', 'mortar', 'rod', 'shovel', 'pickaxe', 'cloak', 'hood', 'tunic', 'charm', 'cheese', 'apple', 'axe', 'sickle', 'dice', 'candle', 'flute', 'under_linen', 'under_wool', 'trousers', 'pants_wool', 'skirt', 'shoes_bast', 'boots', 'mittens', 'shirt_wool', 'waterskin'],
    smith: ['knife', 'dagger', 'shortsword', 'sword', 'longsword', 'axe', 'waraxe', 'mace', 'spear', 'warhammer', 'flail', 'bow', 'sling', 'crossbow', 'helm', 'greathelm', 'leather', 'chain', 'scale', 'plate', 'pickaxe', 'shovel'],
    inn: ['ale', 'stew', 'bread', 'pie', 'cheese', 'meat_cooked', 'fish_cooked', 'honey', 'milk', 'kvass'],
    bakery: ['bread', 'pie', 'rusk', 'honey'],
    fish: ['fish_raw', 'fish_cooked', 'rod', 'shell'],
    hunter: ['meat_raw', 'meat_cooked', 'hide', 'bow', 'sling', 'furcoat', 'furhat', 'knife', 'feather'],
    herbs: ['h_plantain', 'h_wormwood', 'h_sage', 'h_bloodroot', 'h_moonwort', 'h_mandrake', 'h_frost', 'h_saltmoss', 'h_sundew', 'p_heal', 'mushrooms', 'berries'],
    alch: ['p_heal', 'p_spirit', 'p_antidote', 'p_night', 'p_breath', 'p_str', 'p_warm', 'p_sleep', 'p_fire', 'p_acid', 'powder', 'mortar', 'h_mandrake', 'h_moonwort', 'empty_bottle', 'salt'],
    temple: ['holy_water', 'beads', 'robe', 'candle', 'charm', 'lamp_oil'],
    books: ['book', 'book', 'book', 'book', 'book', 'blank_book', 'candle'],
    boats: ['boat', 'rod', 'lamp_oil', 'rope'],
    healer: ['p_heal', 'p_antidote', 'h_plantain', 'cure', 'stew'],
    fair: ['mask', 'compass', 'skull', 'holed_coin', 'mirror_shard', 'owl_feather', 'salt', 'star_jelly', 'broken_clock', 'bell', 'empty_bottle', 'seed', 'p_sleep'],
    deep: ['pearl', 'p_breath', 'shell', 'fish_raw', 'scale_mat'],
  };
  Dlg.shopStock = function (e, kind) {
    const sid = e.npc != null ? E.Sim.settOf(e.npc) : -1;
    const ss = sid >= 0 ? G.S.sett[sid] : null;
    const key = (e.npc != null ? e.npc : 'g' + e.ghostShop) + ':' + kind;
    G.S.shops = G.S.shops || {};
    let sh = G.S.shops[key];
    const day = Time.day(G.S.time);
    if (!sh || day - sh.day >= 3) {
      const r = U.rng(G.W.seed, key, Math.floor(day / 3));
      const pool = SHOP[kind] || SHOP.general;
      const items = [];
      const n = kind === 'fair' ? 5 : r.int(5, 9);
      for (let i = 0; i < n; i++) {
        const b = r.pick(pool);
        if (ss) {
          const bt = D.items[b].t;
          if (kind === 'smith' && (bt === 'weapon' || bt === 'armor') && ss.stock.weapons < 1 + i * 0.5) continue;
          if (bt === 'food' && ss.stock.food < E.Sim.pop(sid) * 2) continue;
          if (D.items[b].herb && ss.stock.herbs < 2) continue;
        }
        const it = Items.make(b);
        if (b === 'book') Items.fillBook(it);
        if (it.q) it.q = D.items[b].t === 'food' || D.items[b].herb ? r.int(1, 4) : 1;
        items.push(it);
      }
      if (sid >= 0 && kind === 'general' && G.W.uqShop[sid]) for (const u of G.W.uqShop[sid]) if (!G.S.taken['uq' + u] && r.chance(0.5)) items.push(Items.realize({ uq: u }));
      sh = G.S.shops[key] = { day, items };
    }
    return sh.items;
  };
  Dlg.priceMul = function (e, b, buy) {
    const sid = e.npc != null ? E.Sim.settOf(e.npc) : -1;
    let m = 1;
    if (sid >= 0) {
      const ss = G.S.sett[sid];
      const pop = Math.max(1, E.Sim.pop(sid));
      const t = D.items[b] ? D.items[b].t : 'misc';
      if (t === 'food') m *= U.clamp(Math.pow((pop * 20) / (ss.stock.food + 1), 0.4), 0.5, 4);
      if (t === 'weapon' || t === 'armor') m *= U.clamp(Math.pow((pop * 0.2 + 3) / (ss.stock.weapons + 0.5), 0.5), 0.7, 5);
      if (D.items[b] && D.items[b].herb) m *= U.clamp(Math.pow(20 / (ss.stock.herbs + 1), 0.4), 0.6, 3);
      if (b === 'iron_ore') m *= U.clamp(Math.pow(30 / (ss.stock.iron + 1), 0.5), 0.5, 4);
    }
    if (e.npc != null) { const op = Gm.opinion(e.npc); if (op > 30) m *= buy ? 0.85 : 1.1; if (op < -20) m *= buy ? 1.4 : 0.7; }
    m *= Gm.fxMul('price');
    if (Gm.socialPriceMul) m *= Gm.socialPriceMul(buy);
    return m;
  };
  Dlg.buyPrice = (e, it) => Math.max(1, Math.round((it.v || 1) * Dlg.priceMul(e, it.b, true) * (it.q || 1)));
  Dlg.sellPrice = (e, it) => Math.max(0, Math.floor((it.v || 1) * 0.4 * Dlg.priceMul(e, it.b, false) * (it.q || 1)));
  Dlg.buy = function (e, it, kind) {
    const P = G.P;
    if (kind === 'fair') {
      // мёртвые берут не только монеты
      const p = Dlg.buyPrice(e, it);
      if (P.gold >= p) P.gold -= p;
      else { P.ageAdd = (P.ageAdd || 0) + 1; Gm.msg('Торговец улыбается: «Год жизни сгодится». Ты чувствуешь себя старше.', '#a0e0d0'); }
    } else {
      const p = Dlg.buyPrice(e, it);
      if (P.gold < p) { Gm.msg('Не хватает монет.'); return false; }
      P.gold -= p;
      Gm.cnt('gold_spent', p);
      const sid = e.npc != null ? E.Sim.settOf(e.npc) : -1;
      if (sid >= 0) { const ss = G.S.sett[sid]; const t = D.items[it.b].t; if (t === 'weapon' || t === 'armor') ss.stock.weapons = Math.max(0, ss.stock.weapons - 1); if (t === 'food') ss.stock.food = Math.max(0, ss.stock.food - 2 * (it.q || 1)); }
      if (e.npc != null) Gm.op(e.npc, 1);
    }
    if (it.uq != null) G.S.taken['uq' + it.uq] = 1;
    const list = Dlg.shopStock(e, kind);
    list.splice(list.indexOf(it), 1);
    Gm.give(it, it.q, false);
    return true;
  };
  Dlg.sell = function (e, it) {
    const P = G.P;
    const p = Dlg.sellPrice(e, it);
    if (it.b === 'a_tear') { Gm.msg('Капля тает в чужих руках. Её больше нет.', '#b0e0ff'); }
    Gm.removeItem(it);
    P.gold += p;
    Gm.cnt('gold_earned', p); Gm.gain('gold', p);
    const sid = e.npc != null ? E.Sim.settOf(e.npc) : -1;
    if (sid >= 0) { const ss = G.S.sett[sid]; const t = D.items[it.b] ? D.items[it.b].t : ''; if (t === 'food') ss.stock.food += 2 * (it.q || 1); if (t === 'weapon' || t === 'armor') ss.stock.weapons += 1; if (it.b === 'iron_ore') ss.stock.iron += (it.q || 1); if (D.items[it.b] && D.items[it.b].herb) ss.stock.herbs += it.q || 1; }
    return p;
  };

  // ---------- караваны ----------
  Dlg.travelTargets = function (fromAbility) {
    const P = G.P;
    const cur = Gm.region();
    const out = [];
    for (const s of G.W.settlements) {
      if (G.S.sett[s.id].destroyed || !P.known.regions[s.region]) continue;
      const g = G.W.regions[s.region];
      if (g.exist !== 'always' || s.type === 'sea') continue;
      if (cur && g.id === cur.id) continue;
      const d = cur ? Math.abs(g.x - cur.x) + Math.abs(g.y - cur.y) : 5;
      if (!fromAbility && d > 8) continue;
      out.push({ s, d, cost: fromAbility ? 0 : 10 + d * 6, hours: d * (fromAbility ? 2 : 5) });
    }
    return out.sort((a, b) => a.d - b.d).slice(0, 18);
  };
  Dlg.travel = function (t, fromAbility) {
    const P = G.P;
    if (!fromAbility) { if (P.gold < t.cost) { Gm.msg('Не хватает монет.'); return; } P.gold -= t.cost; }
    Gm.msg((fromAbility ? 'Ты идёшь знакомыми тропами' : 'Караван трогается') + '...', '#d0c0a0');
    E.Sim.advance(t.hours * 60, () => { Gm.playerHour(); return !P.dead; });
    if (P.dead) return;
    const g = G.W.regions[t.s.region];
    if (!fromAbility && Math.random() < 0.12) Gm.msg('В пути на караван напали разбойники. Ты отбил[ся|ась], но потерял[|а] время.', '#ff9090');
    Gm.loadMap('o:' + g.x + ':' + g.y, -1, -1, 'tp');
    Gm.endTurn(1);
  };
})(window.EOF);
