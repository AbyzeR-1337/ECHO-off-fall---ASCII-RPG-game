'use strict';
// Закон и чужие дома.
// • Дом — не проходной двор: хозяева гонят чужих («Это мой дом! Выйди!»), не выйдешь — бьют сами или зовут стражу.
//   Пускают своих: супругов, возлюбленных, друзей. Лавки, кабаки и храмы открыты днём для всех.
// • Ночью двери домов заперты. Можно постучать, а можно взломать (мини-игра со штифтами; нужна отмычка или нож).
//   Сломал отмычку, зашумел, увидели — это уже кража со взломом.
// • Стража ловит разыскиваемого: сдаться, заплатить штраф, сопротивляться или бежать.
//   В городе — суд: залог (выкуп) или темница на несколько дней. В селе — староста: штраф или ночь в колодках.
//   Убил мирного жителя — показательная казнь на площади.
(function (E) {
  const G = E.G, Gm = E.Gm, U = E.U, D = E.D, TL = E.TL, T = E.T, UI = E.UI, Ent = E.Ent, Sim = E.Sim;
  const LAW = E.Law = {};
  // ---------- концовка: казнь ----------
  if (D.endings && !D.endings.death_executed) D.endings.death_executed = { id: 'death_executed', t: 'Казнён[|а] на площади', cat: 'death', text: null, cause: 'executed' };
  if (D.deathCauses && !D.deathCauses.executed) D.deathCauses.executed = 'Казнён[|а] на площади';
  // ---------- что числится за тобой ----------
  const SEV = { theft: 2, trespass: 1, burglary: 3, attack: 3, grave: 2, mine: 1, murder: 99 };
  const KN = { theft: 'кража', trespass: 'проникновение в дом', burglary: 'взлом', attack: 'нападение', grave: 'разорение могилы', mine: 'чужая шахта', murder: 'убийство' };
  const rec = (sid) => { const P = G.P; P.law = P.law || {}; return (P.law[sid] = P.law[sid] || {}); };
  LAW.record = rec;
  LAW.severity = (sid) => { const r = rec(sid); let s = 0; for (const k in r) s += (SEV[k] || 1) * r[k]; return s; };
  LAW.charges = (sid) => { const r = rec(sid), out = []; for (const k in r) if (r[k] > 0) out.push(KN[k] + (r[k] > 1 ? ' ×' + r[k] : '')); return out.join(', ') || 'бродяжничество'; };
  const sett = (sid) => (sid >= 0 ? G.W.settlements[sid] : null);
  LAW.isTown = (sid) => { const s = sett(sid); return !!s && ['town', 'capital', 'city'].includes(s.type); };
  // запись преступления — только если увидели (так решает Gm.crime: растёт счётчик розыска)
  const crime0 = Gm.crime;
  Gm.crime = function (victim, kind) {
    const m = G.map, sid = m.sett, w0 = G.P.wanted[sid] ? G.P.wanted[sid].n : 0;
    const r = crime0.apply(this, arguments);
    const w1 = G.P.wanted[sid] ? G.P.wanted[sid].n : 0;
    if (sid >= 0 && w1 > w0) { const k = kind === 'attack' && victim && victim.dead ? 'murder' : kind; rec(sid)[k] = (rec(sid)[k] || 0) + 1; }
    return r;
  };
  // убийство мирного жителя
  const kill0 = E.Combat.kill;
  E.Combat.kill = function (e, src) {
    const peaceful = e && e.kind === 'npc' && !e.guardFight && (e.wasPeaceful || !e.hostile) && !e.duel;
    const r = kill0.apply(this, arguments);
    if (peaceful && (src === 'player' || src === 'ally') && G.map.sett >= 0) { e.dead = true; Gm.crime(e, 'murder'); }
    return r;
  };

  // ---------- дома ----------
  const homes = (m) => (m.spots && m.spots.home) || [];
  const inside = (sp, x, y) => sp.rect && x > sp.rect.x && y > sp.rect.y && x < sp.rect.x + sp.rect.w - 1 && y < sp.rect.y + sp.rect.h - 1;
  LAW.homeAt = (m, x, y) => homes(m).find((sp) => inside(sp, x, y)) || null;
  LAW.residents = (m, sp) => m.ents.filter((e) => !e.dead && e.npc != null && Ent.homeOf && Ent.homeOf(e.npc) === sp);
  LAW.allowed = function (m, sp) {
    if (!sp) return true;
    if (sp.mine || (sp.invite && G.S.time < sp.invite)) return true;
    const SO = E.Social;
    for (const id of residentIds(m, sp)) {
      const v = SO && SO.vals ? SO.vals(id) : null;
      if (v && (v.rel === 'spouse' || v.rel === 'partner' || v.fr || v.op >= 60)) return true;
      if (!v && Gm.opinion && Gm.opinion(id) >= 60) return true;
    }
    return false;
  };
  // жильцы дома — по всему поселению (кто сейчас на карте и кто нет)
  function residentIds(m, sp) {
    const s = sett(m.sett); if (!s) return [];
    const out = [];
    for (const id of s.npcs || []) { try { if (Ent.homeOf(id) === sp) out.push(id); } catch (e) { /* */ } }
    return out;
  }
  const night = () => { const h = Gm.hour(); return h >= 22 || h < 6; };
  // ---------- ночью двери заперты ----------
  function syncLocks() {
    const m = G.map, P = G.P;
    if (!m || m.sett < 0 || !m.outdoor) return;
    const nt = night(), day = Math.floor(G.S.time / 1440);
    for (const sp of homes(m)) {
      if (!sp.door) continue;
      const i = sp.door.y * m.w + sp.door.x, f = m.feat[i];
      const want = nt && !LAW.allowed(m, sp) && sp.picked !== day && !inside(sp, P.x, P.y) && !(P.x === sp.door.x && P.y === sp.door.y);
      if (want && !f) m.feat[i] = { k: 'locked', homeLock: 1 };
      else if (!want && f && f.homeLock) delete m.feat[i];
    }
  }
  LAW.syncLocks = syncLocks;
  // ---------- чужой в доме ----------
  let trespass = null;
  function watchHome() {
    const m = G.map, P = G.P;
    if (!m || m.sett < 0 || P.dead) { trespass = null; return; }
    const sp = LAW.homeAt(m, P.x, P.y);
    if (!sp || LAW.allowed(m, sp)) { if (trespass && trespass.sp !== sp && trespass.warned && trespass.who && !trespass.who.dead) { trespass.who.lawHold = 0; if (E.Social) E.Social.say(trespass.who, 'И чтоб духу твоего тут больше не было!'); } trespass = null; return; }
    // кто видит: жильцы и все, кто внутри
    const see = m.ents.filter((e) => !e.dead && e.npc != null && !e.asleep && !e.hostile && U.dist(e.x, e.y, P.x, P.y) <= 8 && E.FOV.los(m, e.x, e.y, P.x, P.y) && (inside(sp, e.x, e.y) || Ent.homeOf(e.npc) === sp));
    if (!trespass || trespass.sp !== sp) trespass = { sp, n: 0, warned: 0, who: null };
    if (!see.length) return;
    const who = see.find((e) => Ent.homeOf(e.npc) === sp) || see[0];
    trespass.who = who; trespass.n++;
    const say = (s) => (E.Social ? E.Social.say(who, Gm.fmt(s), undefined) : Gm.msg(s));
    who.lawHold = G.S.time + 20; // стоит и смотрит на тебя, пока не уйдёшь
    if (trespass.warned === 0) { trespass.warned = 1; say(night() ? 'Кто здесь?! Это мой дом — вон отсюда!' : 'Эй! Это мой дом. Выйди, пока по-хорошему.'); }
    else if (trespass.warned === 1 && trespass.n > 12) { trespass.warned = 2; say('Последний раз говорю — уходи!'); }
    else if (trespass.warned === 2 && trespass.n > 22) {
      trespass.warned = 3;
      const tough = (who.lvl || 1) >= (P.level || 1) || (Gm.npc(who.npc).traits || []).some((t) => ['brave', 'angry', 'proud', 'strong'].includes(t));
      const guards = m.ents.some((e) => e.guard && !e.dead);
      if (LAW.isTown(m.sett) || (guards && !tough)) { say('Стража! Ко мне! Вор в доме!'); Gm.crime(null, 'trespass'); }
      else { say('Ну, сам{|а} напросил{ся|ась}!'); who.hostile = true; who.beat = 1; Gm.crime(null, 'trespass'); }
    }
  }
  // «отметелить»: хозяин бьёт, но не до смерти — потом выкидывает за дверь
  const ma0 = E.Combat.monAttack;
  E.Combat.monAttack = function (e) {
    const P = G.P;
    if (e && e.beat && P.hp <= P.mhp * 0.3) {
      e.hostile = false; e.beat = 0;
      if (E.Social) E.Social.say(e, Gm.fmt('Хватит с тебя. Пош{ёл|ла} вон — и не возвращайся!'));
      const sp = LAW.homeAt(G.map, P.x, P.y);
      if (sp && sp.door) outside(sp);
      return;
    }
    return ma0.apply(this, arguments);
  };
  // поставить за дверь
  function outside(sp) {
    const m = G.map, P = G.P, d = sp.door;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const x = d.x + dx, y = d.y + dy; if (x < 0 || y < 0 || x >= m.w || y >= m.h || inside(sp, x, y)) continue; const t = TL[m.tiles[y * m.w + x]]; if (t.walk && !m.occ.has(y * m.w + x)) { P.x = x; P.y = y; P.posX = x + 0.5; P.posY = y + 0.5; Gm.computeFov(); return; } }
  }
  // ---------- взлом ----------
  LAW.lockMenu = function (x, y) {
    const m = G.map, P = G.P, sp = homes(m).find((s) => s.door && s.door.x === x && s.door.y === y);
    const pick = P.inv.find((it) => it.b === 'lockpick'), knife = P.inv.find((it) => /knife|dagger/.test(it.b)) || (P.eq.hand && /knife|dagger/.test(P.eq.hand.b) ? P.eq.hand : null);
    const opts = [];
    opts.push({ t: 'Постучать', f: () => knock(sp, x, y) });
    if (pick || knife) opts.push({ t: pick ? 'Взломать отмычкой' : 'Взломать ножом (трудно)', f: () => picklock(sp, x, y, !!pick) });
    else opts.push({ t: 'Взломать (нужна отмычка или нож)', f: () => Gm.msg('Нечем. Отмычку продают воры и скупщики, сойдёт и нож.', '#c0a080') });
    opts.push({ t: 'Уйти', f: () => {} });
    UI.menu('Дверь заперта на ночь.', opts);
  };
  function knock(sp, x, y) {
    const m = G.map, ids = sp ? residentIds(m, sp) : [];
    const home = ids.map((id) => m.ents.find((e) => e.npc === id && !e.dead)).filter(Boolean);
    if (!home.length) { Gm.msg('Тишина. Никого нет дома.', '#a0a0a0'); return; }
    const e = home[0], op = Gm.opinion ? Gm.opinion(e.npc) : 0;
    if (op >= 35) { sp.invite = G.S.time + 600; delete m.feat[y * m.w + x]; if (E.Social) E.Social.say(e, 'А, это ты… Заходи, только тихо.'); }
    else { if (E.Social) E.Social.say(e, Gm.fmt(op < -10 ? 'Убирайся, пока я стражу не позвал{|а}!' : 'Ночь на дворе! Приходи днём.', e)); }
  }
  function picklock(sp, x, y, real) {
    const P = G.P, m = G.map, lvl = 3 + (LAW.isTown(m.sett) ? 1 : 0) + (sp && sp.rich ? 1 : 0);
    UI.mgPlay({ type: 'timing', title: 'Взлом', hint: 'Ставь штифты: жми, когда отмычка в светлой полосе', need: lvl, tries: real ? 3 : 2, speed: real ? 1 : 1.35, zone: real ? 0.16 + (P.st.dex || 5) * 0.004 : 0.11, col: '#c8d0e0', glyph: '⟊', pins: 1,
      onMiss: () => { if (Math.random() < (real ? 0.25 : 0.4)) noise('Отмычка звякает.'); } },
    (r) => {
      if (r.ok) {
        delete m.feat[y * m.w + x];
        if (sp) sp.picked = Math.floor(G.S.time / 1440);
        Gm.msg('Замок щёлкает. Открыто.', '#c8d0e0');
        Gm.cnt('locks_picked'); if (Gm.gain) Gm.gain('theft');
      } else {
        if (real && Math.random() < 0.5) { const i = P.inv.findIndex((it) => it.b === 'lockpick'); if (i >= 0) { const it = P.inv[i]; if ((it.q || 1) > 1) it.q--; else P.inv.splice(i, 1); Gm.msg('Отмычка ломается.', '#c0a080'); } }
        noise('Замок не поддаётся. В доме кто-то заворочался.');
      }
    });
  }
  // шум: проснувшийся или прохожий видит — взлом
  function noise(text) {
    const m = G.map, P = G.P;
    Gm.msg(text, '#d0b080');
    const near = m.ents.filter((e) => !e.dead && e.npc != null && U.dist(e.x, e.y, P.x, P.y) <= 6);
    for (const e of near) if (e.asleep && Math.random() < 0.4) e.asleep = false;
    if (near.some((e) => !e.asleep && E.FOV.los(m, e.x, e.y, P.x, P.y))) Gm.crime(null, 'burglary');
  }
  const ia0 = Gm.interactAt;
  Gm.interactAt = function (x, y) {
    const m = G.map, f = m.feat[y * m.w + x];
    if (f && f.k === 'locked' && f.homeLock) { LAW.lockMenu(x, y); return true; }
    return ia0.apply(this, arguments);
  };

  // ---------- стража: задержание ----------
  const act0 = Ent.act;
  Ent.act = function (e) {
    const P = G.P, m = G.map;
    // хозяин, что гонит тебя из дома, стоит на месте и не уходит по делам
    if (e && e.lawHold && G.S.time < e.lawHold && !e.hostile) return;
    if (e && e.guard && !e.dead && !e.guardFight && m.sett >= 0 && Gm.isWanted(m.sett) && U.dist(e.x, e.y, P.x, P.y) <= 1 && !(P.eq.head && P.eq.head.b === 'mask')) {
      const top = UI.top && UI.top();
      if (top && top.name === 'game' && (!e.askT || G.S.time - e.askT > 30)) { e.askT = G.S.time; e.hostile = false; LAW.arrest(e); return; }
    }
    return act0.apply(this, arguments);
  };
  LAW.arrest = function (g) {
    const P = G.P, m = G.map, sid = m.sett, fine = Gm.fine(sid) + LAW.severity(sid) * 10, murder = rec(sid).murder > 0;
    const who = Gm.knows && g.npc != null && Gm.knows(g.npc) ? g.n : 'Стражник';
    const opts = [{ t: 'Сдаться', f: () => surrender(sid) }];
    if (!murder) opts.push({ t: 'Заплатить штраф — ' + fine + ' мон.' + (P.gold < fine ? ' (не хватает)' : ''), f: () => { if (P.gold < fine) { Gm.msg('Денег не хватает. Стражник хмурится.', '#c0a080'); g.askT = 0; return; } P.gold -= fine; clear(sid); Gm.msg('Ты платишь ' + fine + '. «Чтоб больше такого не было».', '#e0c080'); } });
    opts.push({ t: 'Сопротивляться', f: () => { for (const x of m.ents) if (x.guard) { x.hostile = true; x.guardFight = 1; } Gm.msg(who + ': «Ах так! Взять!»', '#ff9a80'); } });
    opts.push({ t: 'Бежать', f: () => { g.hostile = true; g.guardFight = 1; Gm.msg('Ты бросаешься прочь. За спиной — топот и крики.', '#ffb080'); } });
    UI.menu(who + ': «Именем закона! Ты задержан{|а}.»\nОбвинение: ' + LAW.charges(sid) + '.', opts.map((o) => ({ t: Gm.fmt ? Gm.fmt(o.t) : o.t, f: o.f })));
  };
  function clear(sid) {
    const P = G.P;
    delete P.wanted[sid];
    if (P.law) delete P.law[sid];
    for (const x of G.map.ents) if (x.guard) { x.hostile = false; x.guardFight = 0; }
  }
  function surrender(sid) {
    const P = G.P, r = rec(sid);
    if (r.murder > 0) { execute(sid); return; }
    if (LAW.isTown(sid)) trial(sid); else elder(sid);
  }
  // суд в городе
  function trial(sid) {
    const P = G.P, sev = LAW.severity(sid), bail = 30 + sev * 25, days = Math.min(10, 1 + Math.ceil(sev / 2));
    const s = sett(sid);
    const text = 'Тебя ведут в ратушу ' + (s ? s.gen : '') + '. Судья в чёрной мантии листает донесения стражи.\n\n«Обвиняется в: ' + LAW.charges(sid) + '. Вина доказана свидетелями. Суд назначает: ' + days + ' ' + U.plural(days, 'день', 'дня', 'дней') + ' темницы — либо залог в ' + bail + ' монет».';
    UI.popup('Суд', Gm.fmt(text), { then: () => {
      const opts = [];
      if (P.gold >= bail) opts.push({ t: 'Внести залог — ' + bail + ' мон.', f: () => { P.gold -= bail; clear(sid); Gm.msg('Ты платишь залог. Судья стучит молотком: «Свободен{|а}. Пока».', '#e0c080'); } });
      opts.push({ t: 'Отсидеть ' + days + ' ' + U.plural(days, 'день', 'дня', 'дней'), f: () => jail(sid, days) });
      UI.menu('Решение суда' + (P.gold < bail ? ' (на залог не хватает: ' + P.gold + ' из ' + bail + ')' : ''), opts);
    } });
  }
  // в селе — староста
  function elder(sid) {
    const P = G.P, sev = LAW.severity(sid), fine = 20 + sev * 12;
    if (P.gold >= fine) { P.gold -= fine; clear(sid); UI.popup('Староста', 'Староста машет рукой: «Суда у нас нет. Заплатишь ' + fine + ' — и с глаз долой».\n\nТы платишь.'); }
    else { UI.popup('Староста', 'Денег у тебя нет. Ночь и день ты проводишь в колодках на площади — прохожие плюют и кидают гнилую репу.', { then: () => jail(sid, 1, true) }); }
  }
  // темница: дни проходят, мир живёт дальше
  function jail(sid, days, stocks) {
    const P = G.P;
    Gm.msg(stocks ? 'Колодки натирают шею…' : 'Дверь темницы захлопывается.', '#a0a0b0');
    for (let h = 0; h < days * 24; h++) {
      E.Sim.advance(60, () => true);
      if (Gm.playerHour) Gm.playerHour();
      if (h % 8 === 0) { if (P.hunger != null) P.hunger = Math.max(P.hunger, 45); if (P.thirst != null) P.thirst = Math.min(P.thirst, 35); }
      if (P.dead) return;
    }
    clear(sid);
    P.hp = Math.max(P.hp, Math.round(P.mhp * 0.5));
    Gm.cnt('jail_days', days);
    const m = G.map;
    if (m.spots && m.spots.guard && m.spots.guard.door) { const d = m.spots.guard.door; P.x = d.x; P.y = Math.min(m.h - 1, d.y + 1); P.posX = P.x + 0.5; P.posY = P.y + 0.5; Gm.computeFov(); }
    UI.popup(stocks ? 'Колодки' : 'Темница', stocks ? 'Наутро тебя отпускают. Шея болит, но ты свобод{ен|на}.' : 'Прошло ' + days + ' ' + U.plural(days, 'день', 'дня', 'дней') + '. Сырость, крысы, похлёбка из чего-то серого. Наконец дверь открывают: «Выходи. И не попадайся больше».');
  }
  // казнь за убийство
  function execute(sid) {
    const s = sett(sid);
    UI.popup('Приговор', Gm.fmt('Суда почти не было. Свидетели, кровь на твоих руках — этого достаточно.\n\nНа рассвете тебя выводят на площадь ' + (s ? s.gen : '') + '. Толпа молчит. Глашатай читает имя убитого. Палач проверяет верёвку…'), { then: () => { G.P.hp = 0; Gm.die('executed'); } });
  }
  LAW.jail = jail; LAW.trial = trial; LAW.execute = execute;
  // ---------- каждый ход ----------
  const tk0 = Gm.tick;
  Gm.tick = function () {
    const r = tk0.apply(this, arguments);
    try { syncLocks(); watchHome(); } catch (e) { console.warn('law', e); }
    return r;
  };
  // отмычки: продают скупщики, на ярмарках и в мастерских
  if (D.items && !D.items.lockpick) D.items.lockpick = { id: 'lockpick', n: 'Отмычка', g: 'f', t: 'tool', w: 0.1, v: 12, st: 1, d: 'Изогнутая проволока. Открывает чужие двери — если руки не дрожат.' };
  const SH = E.Dlg && E.Dlg.SHOP;
  if (SH) for (const k of ['junk', 'fair', 'tools']) if (SH[k] && !SH[k].includes('lockpick')) SH[k].push('lockpick', 'lockpick');
})(window.EOF);
