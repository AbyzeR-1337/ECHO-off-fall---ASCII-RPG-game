'use strict';
// Концовки: сборка эпилога, перемотка мира, летопись найденного.
(function (E) {
  const U = E.U, D = E.D, Time = E.Time;
  const G = E.G, Gm = E.Gm;

  // ---------- мета-прогресс между жизнями ----------
  const Meta = E.Meta = {
    load() { try { return JSON.parse(localStorage.getItem('eotf_meta') || '{}'); } catch (e) { return {}; } },
    save(m) { try { localStorage.setItem('eotf_meta', JSON.stringify(m)); } catch (e) { /* */ } },
    addEnding(id, title) { const m = Meta.load(); m.endings = m.endings || {}; m.endings[id] = { n: ((m.endings[id] && m.endings[id].n) || 0) + 1, t: title }; m.lives = (m.lives || 0) + 1; Meta.save(m); return m; },
  };

  Gm.worldState = function (sid) {
    const ss = sid >= 0 ? G.S.sett[sid] : null;
    if (Gm.event('nosun') || G.S.flags.sealBroken) return 'dark';
    if (ss && ss.plague) return 'plague';
    if (ss && ss.famine > 0) return 'famine';
    if (ss && E.Sim.atWar(ss.fac)) return 'war';
    if (ss && G.S.cults.some((c) => c.sett === sid)) return 'cult';
    if (Gm.event('harvest')) return 'plenty';
    return 'peace';
  };
  Gm.settleOptions = function () {
    const P = G.P, m = G.map;
    const wild = m.kind === 'over' && m.sett < 0 && !m.dim;
    const s = m.sett >= 0 ? G.W.settlements[m.sett] : null;
    if (!s && !wild) return [];
    if (s && (G.S.sett[s.id].destroyed || Gm.isWanted(s.id))) return [];
    const ctx = { P, s: s || { type: 'wild' }, b: s ? s.b : {}, coast: s ? s.coast : ['coast'].includes(m.biome), wild };
    const out = [];
    for (const p of D.professions) {
      if (wild && p.id !== 'hermit') continue;
      if (!wild && p.id === 'hermit') continue;
      try { if (p.cond(ctx)) out.push({ t: U.gx(P.sex, p.t, p.g || p.t), prof: p.id }); } catch (e) { /* */ }
    }
    const sp = [];
    if (P.level >= 999) sp.push({ t: 'Уйти в легенду', end: 'legend' });
    if (P.flags.dragonRider) sp.push({ t: 'Улететь на драконе', end: 'dragon_rider' });
    if (P.flags.fisherHeir != null && m.rid === P.flags.fisherHeir) sp.push({ t: 'Жить в доме старого рыбака', end: 'fisher_heir' });
    if (P.flags.general) sp.push({ t: 'Принять титул полководца', end: 'general' });
    if (P.flags.giantSlayer) sp.push({ t: 'Подняться на гору, где высечено твоё имя', end: 'giant_slayer' });
    if (P.flags.lastKeeper) sp.push({ t: 'Хранить Печать до конца', end: 'keeper_end' });
    if (P.flags.cultSlayer) sp.push({ t: 'Остаться там, где тебе поставили памятник', end: 'cult_slayer' });
    if (G.S.st.heir && G.S.st.heir.s === 3) sp.push({ t: 'Остаться при новом короле', end: 'heir_kingmaker' });
    if (P.flags.forestChild && ['ancient'].includes(m.biome)) sp.push({ t: 'Уйти в исполинский лес', end: 'forest_stay' });
    if (P.flags.oathRing && !P.flags.oathBroken && P.level >= 20) sp.push({ t: 'Сдержать клятву до конца', end: 'oath_end' });
    if (m.dimName === 'time') sp.push({ t: 'Остаться в застывшем мгновении', end: 'time_stay' });
    if (m.dimName === 'flesh') sp.push({ t: 'Остаться внутри исполина', end: 'flesh_stay' });
    if (m.dimName === 'dream') sp.push({ t: 'Не просыпаться', end: 'dream_stay' });
    if (s && s.type === 'capital' && E.Sim.job && P.flags.beggarBless) sp.push({ t: 'Сесть у ворот с протянутой рукой', end: 'beggar_end' });
    return out.concat(sp);
  };
  Gm.settle = function (opt) {
    if (opt.end) return Gm.ending(opt.end);
    const ws = Gm.worldState(G.map.sett);
    Gm.ending('settle_' + opt.prof + '_' + ws, { prof: opt.prof, ws });
  };

  // ---------- сборка эпилога ----------
  Gm.ending = function (id, ctx) {
    const P = G.P;
    if (P.ended) return;
    ctx = ctx || {};
    const end = D.endings[id] || D.endings.death_other;
    P.ended = true;
    const fm = (s) => Gm.fmt(s);
    const W = G.W, S = G.S;
    const paras = [];
    const age = Gm.age();
    const days = Time.day(S.time) - P.startDay;
    const where = G.map.region ? '«' + G.map.region.name + '»' : (G.map.dimName ? D.dims[G.map.dimName] ? D.dims[G.map.dimName].n : 'неведомые края' : 'подземелье');
    if (end.cat === 'death') {
      const c = D.deathCauses[ctx.cause] || (String(ctx.cause || '').startsWith('boss:') ? 'Пал[|а] в бою' : 'Погиб[|ла]');
      let line = fm(P.name + '. ' + c.replace(/^./, (x) => x) + '.');
      if (ctx.src && ctx.src.full) line += ' Последнее, что ' + U.gx(P.sex, 'он видел', 'она видела') + ', — ' + ctx.src.full + '.';
      paras.push(line);
      paras.push(fm('Это случилось ' + Time.date(S.time) + ', в краю ' + where + '. ' + U.gx(P.sex, 'Ему', 'Ей') + ' было ' + age + ' ' + U.plural(age, 'год', 'года', 'лет') + '.'));
      if (Math.random() < 0.6) paras.push(fm('Тело так и осталось лежать там. Вместе со всем, что [он нёс|она несла].'));
    } else if (end.cat === 'settle') {
      const prof = D.professions.find((p) => p.id === ctx.prof || p.id === end.prof);
      const ws = D.worldStates.find((w) => w.id === (ctx.ws || end.ws));
      const s = G.map.sett >= 0 ? W.settlements[G.map.sett] : null;
      paras.push(fm((s ? 'Ты остал[ся|ась] ' + s.loc + '.' : 'Ты остал[ся|ась] в краю ' + where + ', вдали от людей.')));
      for (const t of prof.text) paras.push(fm(t));
      paras.push(fm(ws.text));
    } else paras.push(fm(end.text || ''));
    // что было потом
    const t0 = S.time;
    const homeR = G.map.rid;
    const after = [];
    if (end.cat !== 'death' || Math.random() < 0.5) {
      const years = end.cat === 'settle' ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
      E.Sim.fastForward(years * 360);
      let wars = 0;
      for (const c of S.chron) {
        if (c.t <= t0) continue;
        const local = homeR != null && c.r >= 0 && E.Sim.rdist(c.r, homeR) <= 1;
        if (c.k === 'war' && !local) { if (wars++ >= 3) continue; }
        if (c.k === 'big' || c.k === 'war' || local) after.push(c);
      }
      paras.push('');
      paras.push('— Прошли годы —');
      for (const c of after.slice(0, 12)) paras.push(Time.year(c.t) + ' г. ' + c.s);
      if (!after.length) paras.push('Ничего особенного. Мир жил.');
      if (end.cat === 'settle') {
        const lifeLeft = Math.max(1, (P.deathAge || 80) - age);
        paras.push(fm(lifeLeft > years ? 'Ты прожил[|а] ещё ' + lifeLeft + ' ' + U.plural(lifeLeft, 'год', 'года', 'лет') + '. Тебя похоронили там же, где ты жил[|а].' : 'Ты умер[|ла] спокойно, во сне, через ' + lifeLeft + ' ' + U.plural(lifeLeft, 'год', 'года', 'лет') + '.'));
      }
    }
    // жизнь в цифрах
    const cls = P.paths.map((c) => D.classes[c].n);
    const stats = [
      'Прожито дней: ' + Math.max(0, days) + '. Возраст: ' + age + '.',
      'Уровень: ' + (P.level >= 999 ? '—' : P.level) + (cls.length ? '. Пути: ' + cls.join(', ') : '. Без пути'),
      'Земель повидано: ' + (P.c.regions || 0) + ' из ' + W.regions.length + '. Людей встречено: ' + Object.keys(P.known.npc).length + '.',
      'Убито: ' + (P.c.kills || 0) + (P.c.npc_kills ? ' (из них людей: ' + P.c.npc_kills + ')' : '') + '. Молитв: ' + P.prayers.length + '. Тайн: ' + Object.keys(P.secrets).length + '.',
    ];
    // то, чего ты не видел
    const unseen = S.chron.filter((c) => !c.seen && c.t <= t0 && (c.k === 'big' || c.k === 'war' || c.k === 'lost' || c.k === 'econ' || c.k === 'event'));
    const pickN = [];
    const r = U.rng(S.time, P.name);
    const pool = r.shuffle(unseen.slice()).slice(0, 9).sort((a, b) => a.t - b.t);
    for (const c of pool) pickN.push(Time.date(c.t) + ' — ' + c.s);
    const meta = Meta.addEnding(id, fm(end.t));
    const found = Object.keys(meta.endings || {}).length;
    if (E.Save) E.Save.save();
    E.UI.ending({ id, title: fm(end.t), cat: end.cat, paras, stats, unseen: pickN, found, hidden: end.cat === 'hidden' });
  };

  // Эхо, носимое год
  D.secrets.push({ on: 'use', test: (c) => c.item.b === 'a_echo', run: (c) => { if ((c.item.held || 0) >= 365 * 24) { Gm.ending('echo_become'); } else Gm.msg('Ничего не происходит. Пока.'); return true; } });
  // Год у костра
  D.secrets.push({ on: 'hour', test: () => (G.P.c.fire_rest_streak || 0) >= 360 * 24, run: () => Gm.ending('hidden_fire') });
  // Конец мира, если Печать лопнула давно
  // Конец мира: Печать лопнула, никто её не подхватил, и Сердце Бездны бьётся три года
  D.secrets.push({ on: 'hour', test: () => G.S.flags.sealBroken && !G.S.flags.sealHeld && !G.S.flags.worldEnded && !(G.S.boss.b_abyss_heart && G.S.boss.b_abyss_heart.dead) && G.S.time - G.S.flags.sealBroken > 1440 * 360 * 3 && Gm.hour() === 12, run: () => { G.S.flags.worldEnded = G.S.time; Gm.chron('Мир треснул по швам.', { k: 'big' }); Gm.ending('world_end'); } });
  D.secrets.push({ on: 'hour', test: () => G.S.flags.sealBroken && !G.S.flags.sealHeld && Gm.hour() === 0 && Math.random() < 0.08, run: () => Gm.msg(['Земля под ногами чуть дрожит. Глубоко внизу что-то бьётся.', 'Звёзды мерцают неровно, будто их кто-то задевает.', 'Ты слышишь далёкий звон — будто лопнула струна.'][Math.floor(Math.random() * 3)], '#a080c0') });
  // Пир Голодного Бога
  D.secrets.push({ on: 'sleep', test: () => G.P.flags.feastOffer && !G.P.flags.feastAsked, run: () => { G.P.flags.feastAsked = 1; E.UI.confirm('Тебе снится урчащий голод. Накормить его всем миром?', () => Gm.ending('hungry_feast')); } });
})(window.EOF);
