'use strict';
// Бой, умения, артефакты, поведение боссов.
(function (E) {
  const U = E.U, D = E.D, T = E.T, TL = E.TL, Time = E.Time;
  const G = E.G, Gm = E.Gm, Ent = E.Ent;
  const Cb = E.Combat = {};
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  // ---------- артефакты: у каждого своя логика ----------
  const A = E.Arts = {
    a_dawnblade: { onKill: (P) => { P.ageAdd = (P.ageAdd || 0) + 1 / 360; } },
    a_nightstaff: { dmgAdd: (P, it) => Math.floor((it.held || 0) / 25) },
    a_moonsickle: { dmgMul: () => (Gm.night() ? 12 : 1) },
    a_stormcloak: { mods: () => { const w = Gm.weather(); return w === 'storm' || w === 'rain' || w === 'blizzard' ? { def: 8, dodge: 25 } : w === 'clear' ? { dex: -3 } : {}; } },
    a_tidetrident: { dmgMul: () => (Gm.nearWater(G.P.x, G.P.y, 4) || ['coast', 'ocean'].includes(Gm.biome()) ? 3 : 1) },
    a_spiteblade: { selfHit: 0.12 },
    a_crown: { mods: () => ({ str: 3, dex: 3, con: 3, int: 3, fai: 3, luck: 3 }), canPick: (P) => (P.c.civ_kills || 0) === 0 && (P.c.ruler_kills || 0) === 0 && P.level >= 10 },
    a_golem_heart: { mods: () => ({ con: 6, def: 3, dex: -2 }) },
    a_tear: {},
    a_mirrorshield: { reflect: 0.3 },
    a_gauntlet: { hour: (P, it) => { const f = P.inv.find((i) => D.items[i.b] && D.items[i.b].t === 'food'); if (f) { Gm.take(f.b, 1); it.fed = (it.fed || 0) + 1; } else if (Math.random() < 0.3) { Gm.hurtPlayer(Math.round(P.mhp * 0.05), 'art'); Gm.msg('Перчатка кусает тебя за пальцы.', '#c08080'); } }, mods: (P, it) => ({ str: Math.floor((it.fed || 0) / 3) }) },
    a_voidlantern: { mods: () => ({}) },
    a_memring: {},
    a_hourglass: {},
    a_deadbell: {},
    a_dragonbone: { el: 'fire' },
    a_blindeye: {},
    a_frostheart: { mods: () => ({}) },
    a_whisper: { onKill: (P, it) => { it.kills = (it.kills || 0) + 1; if (it.kills === 100) { const pr = G.W.prayers.find((p) => p.god === 'faceless' && !P.prayers.includes(p.id)); Gm.msg('Кинжал шепчет тебе слова.', '#c0a0e0'); if (pr) Gm.learn(pr.id, 'Шёпот'); } } },
    a_sunspear: { dmgMul: () => (Gm.event('nosun') ? 0.1 : Gm.night() ? 0.5 : (G.map.outdoor ? 2 : 1)) },
    a_rootcrown: { mods: () => (['forest', 'ancient'].includes(Gm.biome()) ? { con: 3 } : {}) },
    a_graveshovel: {},
    a_starheart: { mods: () => ({ int: 10 }) },
    a_echo: { mods: (P, it) => { const days = (it.held || 0) / 24; return days >= 100 ? { str: 5, dex: 5, con: 5, int: 5, fai: 5, luck: 5 } : {}; } },
    a_oathring: { mods: () => ({ luck: 4 }) },
  };

  // ---------- урон игрока ----------
  Cb.playerDmg = function (target, mult, opt) {
    const P = G.P;
    opt = opt || {};
    const w = P.eq.hand;
    const broken = w && w.mw && w.wr <= 0;
    let lo = 1, hi = 2, stat = 'str';
    if (w && w.dmg && !broken) { lo = w.dmg[0]; hi = w.dmg[1]; stat = w.stat || 'str'; }
    if (opt.stat) stat = opt.stat;
    let dmg = rnd(lo, hi) + Math.floor((P.st[stat] || 5) / 2) + Math.floor(P.level / 4);
    if (w && w.spell && stat === 'int') dmg *= w.spell;
    if (!w || broken) dmg = rnd(1, 2) + Math.floor(P.st.str / 3);
    let m = (mult || 1) * Gm.fxMul('atk');
    if (Gm.fxFlag('dayAtk') && !Gm.night()) m *= Gm.fxFlag('dayAtk') > 1 ? 1.3 : 1;
    for (const f of P.fx) { const d = D.effects[f.id]; if (!d) continue; if (d.dayAtk && !Gm.night()) m *= d.dayAtk; if (d.nightAtk && Gm.night()) m *= d.nightAtk; if (d.vsUndead && target.tags.includes('undead')) m *= d.vsUndead; }
    if (w && !broken) {
      if (w.vs) for (const t in w.vs) if (target.tags.includes(t)) m *= w.vs[t];
      if (w.hx) m *= Cb.hiddenMul(w, target);
      const ah = A[w.b];
      if (ah && ah.dmgMul) m *= ah.dmgMul(P, w, target);
      if (ah && ah.dmgAdd) dmg += ah.dmgAdd(P, w);
    }
    for (const s of ['body', 'head', 'trinket']) { const it = P.eq[s]; if (it && it.hx) m *= Cb.hiddenMul(it, target, true); }
    // камень из храма
    if (P.flags.stoneBlessed && target.tags.some((t) => ['other', 'dream', 'spirit'].includes(t))) opt.critBonus = (opt.critBonus || 0) + 20;
    // кузнец святых орудий и пр.
    let crit = P.st.crit + (opt.critBonus || 0);
    let isCrit = Math.random() * 100 < crit;
    if (opt.sneak) isCrit = true;
    if (isCrit) { m *= 2; Gm.cnt('crits'); Gm.gain('crit'); }
    dmg = Math.max(1, Math.round(dmg * m));
    return { dmg, crit: isCrit };
  };
  Cb.hiddenMul = function (it, target, armor) {
    let m = 1;
    const reg = Gm.region();
    for (const h of it.hx) {
      switch (h.k) {
        case 'vs': if (target && target.tags.includes(h.tag)) m *= h.mul; break;
        case 'night': if (Gm.night()) m *= h.mul; break;
        case 'day': if (!Gm.night()) m *= h.mul; break;
        case 'weather': if (Gm.weather() === h.w) m *= h.mul; break;
        case 'biome': if (Gm.biome() === h.b) m *= h.mul; break;
        case 'region': if (reg && reg.id === h.r) m *= h.mul; break;
        case 'season': if (Gm.season() === h.s) m *= h.mul; break;
        case 'moon': if (Gm.fullMoon() && Gm.night()) m *= h.mul; break;
      }
    }
    return armor ? 1 + (m - 1) * 0.3 : m;
  };

  // ---------- атака игрока ----------
  Cb.playerAttack = function (e, opts) {
    const P = G.P;
    opts = opts || {};
    if (e.kind === 'npc' && !e.hostile && !opts.force) return false;
    if (e.kind === 'npc' && !e.hostile) Gm.crime(e, 'attack');
    if (e.npc != null && E.Gm.storyHook('attackNpc', { npc: e.npc })) return true;
    const w = P.eq.hand;
    // артефакт, что ненавидит владельца
    if (w && A[w.b] && A[w.b].selfHit && Math.random() < A[w.b].selfHit) {
      const r = Cb.playerDmg(e, 0.5);
      Gm.msg(Items_name(w) + ' выворачивается в руке и бьёт тебя!', '#ff6060');
      Gm.hurtPlayer(r.dmg, 'art');
      return true;
    }
    const sneak = (!e.aware && e.kind === 'mon') || (e.kind === 'npc' && !e.hostile) || (opts.sneakMul && !e.aware);
    const acc = 75 + P.st.dex * 2 + P.level - e.dg + (sneak ? 30 : 0);
    if (Math.random() * 100 > U.clamp(acc, 10, 97)) { Gm.msg('Ты промахиваешься.', '#909090'); Cb.wear(w, 0.3); e.aware = true; return true; }
    const r = Cb.playerDmg(e, (opts.mult || 1) * (sneak ? (opts.sneakMul || 1.6) : 1), { sneak: sneak && opts.sneakMul });
    let dmg = Math.max(1, r.dmg - Math.floor(e.d * (opts.pierce ? 0.2 : 0.7)));
    if (sneak) { Gm.cnt('sneak'); Gm.gain('sneak'); }
    const verb = r.crit ? 'Ты наносишь сокрушительный удар' : 'Ты бьёшь';
    Gm.msg(verb + ' — ' + e.acc + ' (' + dmg + ').', r.crit ? '#ffe080' : '#e0e0e0');
    Cb.wear(w, 1);
    e.aware = true;
    if (e.kind === 'mon' && e.ai === 'passive') e.hostileToP = true;
    const killed = Cb.hurtEnt(e, dmg, 'player', opts.el);
    if (!killed) Cb.onHitFx(e, opts);
    // кровопийство
    if (Gm.fxFlag('lifesteal')) Gm.healPlayer(Math.round(dmg * 0.25), true);
    if (Gm.hasFx('poisonblade') && !killed) Cb.entFx(e, 'poison', 5, 2);
    return true;
  };
  function Items_name(it) { return U.cap(E.Items.name(it)); }
  Cb.onHitFx = function (e, o) {
    if (!o) return;
    if (o.stun) Cb.entFx(e, 'stun', o.stun);
    if (o.slow) Cb.entFx(e, 'slow', o.slow);
    if (o.bleed) Cb.entFx(e, 'bleed', o.bleed, 3);
    if (o.poison) Cb.entFx(e, 'poison', o.poison, 2 + Math.floor(G.P.level / 5));
  };
  Cb.entFx = function (e, id, t, dmg) { const ex = e.fx.find((f) => f.id === id); if (ex) ex.t = Math.max(ex.t, t); else e.fx.push({ id, t, dmg }); };
  Cb.wear = function (it, n) { if (!it || !it.mw) return; if (it.mw > 5000) return; it.wr = Math.max(0, it.wr - n); if (it.wr === 0 && !it.brokeMsg) { it.brokeMsg = 1; Gm.msg(Items_name(it) + ' ломается.', '#ff9060'); Gm.calc(); } };

  // ---------- урон существам ----------
  Cb.hurtEnt = function (e, dmg, src, el) {
    if (e.dead) return true;
    if (e.immortal) { Gm.msg(U.cap(e.n) + ' не замечает удара.', '#a0a0a0'); return false; }
    if (el === 'holy' && (e.tags.includes('undead') || e.tags.includes('other'))) dmg = Math.round(dmg * 1.8);
    if (el === 'fire' && e.tags.includes('fire')) dmg = Math.round(dmg * 0.3);
    if (el === 'fire' && e.tags.includes('plant')) dmg = Math.round(dmg * 1.6);
    if (el === 'ice' && e.tags.includes('fire')) dmg = Math.round(dmg * 1.6);
    e.hp -= dmg;
    if (src === 'player' && e.ab.includes('split') && e.hp > 0 && e.hp > e.mhp * 0.3 && Math.random() < 0.35 && G.map.ents.length < 60) {
      const c = Ent.mon(e.tpl, e.lvl, e.x, e.y); if (c) { c.hp = c.mhp = Math.ceil(e.hp / 2); e.hp = Math.ceil(e.hp / 2); c.aware = true; Gm.addEnt(c); Gm.msg(U.cap(e.n) + ' делится надвое!', '#a0e080'); }
    }
    if (e.hp <= 0) { Cb.kill(e, src, el); return true; }
    if (e.kind === 'npc' && e.npc != null && src === 'player') { if (!e.guard && e.hp < e.mhp * 0.6) e.flee = 1; else e.hostile = true; }
    if (e.duel && e.hp < e.mhp * 0.3) { e.duel = 0; e.hostile = false; Gm.duelEnd(e, true); }
    return false;
  };
  Cb.kill = function (e, src, el) {
    const P = G.P;
    const m = G.map;
    Gm.removeEnt(e);
    const byP = src === 'player' || src === 'ally';
    const deathWord = e.tags.includes('undead') ? 'рассыпается' : e.tags.includes('spirit') || e.ghost ? 'растворяется' : e.tags.includes('stone') ? 'разваливается на куски' : e.tags.includes('plant') ? 'увядает' : 'падает замертво';
    Gm.msg(U.cap(e.n) + ' ' + deathWord + '.', '#ffb080');
    if (!byP) { if (e.npc != null) E.Sim.kill(e.npc, 'погиб(ла)'); return; }
    // опыт и пути
    Gm.xp(e.xp);
    Gm.cnt('kills');
    for (const t of e.tags) { Gm.cnt('k_' + t); Gm.gain('kill:' + t); }
    Gm.gain('kill');
    const w = P.eq.hand;
    if (!w || !w.range) Gm.gain('kill_melee');
    if (Gm.night()) { Gm.cnt('k_night'); Gm.gain('kill_night'); }
    if (Gm.event('bloodmoon') && Gm.night()) Gm.cnt('k_blood');
    if (Gm.event('blacksnow')) Gm.cnt('k_blacksnow');
    if (Gm.event('nosun')) Gm.cnt('k_sunless');
    if (el === 'fire') Gm.cnt('fire_kills');
    if (e.fx.some((f) => f.id === 'poison')) { Gm.cnt('poison_kills'); Gm.gain('kill:poison'); }
    if (e.tpl === 'bandit' || e.tpl === 'archer' || e.tpl === 'deserter') Gm.cnt('k_bandit');
    if (e.tpl === 'soldier' || (e.npc != null && e.guard && Gm.atWar(G.map.sett >= 0 ? G.S.sett[G.map.sett].fac : -1))) Gm.cnt('war_kills');
    if (Gm.day() === 0) P.flags.killed_first_day = 1;
    const ah = w && A[w.b];
    if (ah && ah.onKill) ah.onKill(P, w, e);
    // NPC
    if (e.npc != null) {
      const n = Gm.npc(e.npc);
      E.Sim.kill(e.npc, 'убит(а) чужаком по имени ' + P.name, { byPlayer: 1 });
      Gm.cnt('npc_kills');
      if (!e.hostile || e.wasPeaceful) Gm.cnt('civ_kills');
      if (E.Sim.job(e.npc) === 'ruler' || n.job === 'ruler') { Gm.cnt('ruler_kills'); Gm.chron(n.first + ', правитель, убит(а) чужаком.', { r: m.rid, k: 'big' }); }
      // уникальная вещь NPC и золото
      const uq = G.W.npcUq[e.npc];
      if (uq != null && !G.S.taken['uq' + uq]) { Gm.dropItem(e.x, e.y, E.Items.realize({ uq })); G.S.taken['uq' + uq] = 1; }
      const spec = G.W.npcItem[e.npc];
      if (spec && !G.S.taken['ni' + e.npc]) { Gm.dropItem(e.x, e.y, E.Items.make(spec)); G.S.taken['ni' + e.npc] = 1; }
      if (Math.random() < 0.7) Gm.dropItem(e.x, e.y, { u: U.uid(), b: 'gold', n: 'Монеты', t: 'gold', q: rnd(1, 8) * (n.job === 'merchant' || n.job === 'noble' || n.job === 'ruler' ? 8 : 1), w: 0 });
      if (P.flags.oathRing || (P.eq.trinket && P.eq.trinket.b === 'a_oathring')) { P.flags.oathBroken = 1; }
    }
    // босс
    if (e.boss) {
      const st = G.S.boss[e.boss] = G.S.boss[e.boss] || {};
      st.dead = G.S.time;
      Gm.cnt('bosses');
      Gm.gain('boss');
      const b = G.W.bossById[e.boss];
      Gm.chron(b.n + ' повержен(а) чужаком по имени ' + P.name + '.', { r: m.rid != null ? m.rid : -1, k: 'big', seen: 1 });
      for (const d of b.drops || []) {
        if (d === 'gold') { Gm.dropItem(e.x, e.y, { u: U.uid(), b: 'gold', n: 'Монеты', t: 'gold', q: rnd(50, 200) * b.tier, w: 0 }); continue; }
        if (D.items[d] && D.items[d].art && G.S.flags['art_' + d]) continue;
        if (D.items[d] && D.items[d].art) G.S.flags['art_' + d] = 1;
        Gm.dropItem(e.x, e.y, E.Items.make(d));
      }
      const uq = G.W.uqBoss[b.i];
      if (uq != null && !G.S.taken['uq' + uq]) { Gm.dropItem(e.x, e.y, E.Items.realize({ uq })); G.S.taken['uq' + uq] = 1; }
      if (e.boss === 'b_dragon' && G.S.dragon) { G.S.dragon.alive = 0; Gm.msg('Дракон Аргхаал мёртв. Где-то далеко люди выходят из погребов.', '#ffd080'); P.flags.dragonSlayer = 1; Gm.settRep(G.map.sett, 30); }
      if (e.boss === 'b_shroom_heart') { G.S.infect = {}; G.S.ev = G.S.ev.filter((x) => x.id !== 'shroom'); }
      if (e.boss === 'b_flesh_heart' && G.map.dimName === 'flesh') { const p = Ent.freeNear(e.x, e.y); if (p) { Gm.setTile(p.x, p.y, T.PORTAL); Gm.setFeature(p.x, p.y, { k: 'link', to: 'ret', name: 'выход наружу' }); } Gm.msg('Исполин содрогается. Где-то открывается выход.', '#ffa0a0'); }
      if (e.boss === 'b_void_judge') { P.flags.voidJudged = 1; Gm.popup('Приговор', 'Судия опускает руки.\n\n«Ты пришёл. Ты сражался. Ты прав — пока. Суди и ты».'); }
    } else if (e.drops && e.drops.length && e.kind === 'mon') {
      for (const [b, p] of e.drops) if (Math.random() < p) {
        if (b === 'gold') Gm.dropItem(e.x, e.y, { u: U.uid(), b: 'gold', n: 'Монеты', t: 'gold', q: rnd(2, 10) + e.lvl * 2, w: 0 });
        else Gm.dropItem(e.x, e.y, E.Items.make(b));
      }
      if (e.tags.includes('human') && Math.random() < 0.03) Gm.dropItem(e.x, e.y, Gm.randomUnique(e.lvl));
    }
    if (e.tags.includes('undead') || e.tags.includes('beast') || e.tags.includes('human')) if (Math.random() < 0.25 && TL[m.tiles[e.y * m.w + e.x]].walk && !m.items.some((i) => i.x === e.x && i.y === e.y)) m.tiles[e.y * m.w + e.x] === T.GRASS && Gm.setTile(e.x, e.y, T.BONES);
    Gm.fire('kill', { target: e, weapon: w });
    Gm.storyHook('kill', { target: e });
  };

  // ---------- атаки существ ----------
  Cb.monAttack = function (e, ranged) {
    const P = G.P;
    if (e.kind === 'npc' && !e.hostile && !e.duel) return;
    const acc = 70 + e.ac - P.st.dodge;
    if (Math.random() * 100 > U.clamp(acc, 8, 95)) { Gm.msg(U.cap(e.n) + ' промахивается.', '#808080'); return; }
    let dmg = rnd(e.a[0], e.a[1]);
    if (Gm.event('bloodmoon') && Gm.night()) dmg = Math.round(dmg * 1.4);
    if (G.S.flags.sealBroken) dmg = Math.round(dmg * 1.15);
    if (e.enraged) dmg = Math.round(dmg * 1.5);
    const def = P.st.def;
    dmg = Math.max(1, dmg - Math.floor(def * 0.8));
    // зеркальный щит / проклятие зеркала
    const refl = (P.eq.trinket && A[P.eq.trinket.b] && A[P.eq.trinket.b].reflect) || Gm.fxFlag('reflect');
    if (refl) Cb.hurtEnt(e, Math.max(1, Math.round(dmg * (typeof refl === 'number' ? refl : 0.25))), 'player');
    const verb = ranged ? (e.v || 'стреляет в') : (e.v || 'бьёт');
    Gm.msg(U.cap(e.n) + ' ' + verb + (ranged || /в$/.test(verb) ? ' тебя' : ' тебя') + ' (' + dmg + ').', '#ff8080');
    Gm.hurtPlayer(dmg, e.kind === 'boss' ? 'boss:' + e.boss : (e.tags[0] || 'other'), e);
    for (const s of ['body', 'head']) Cb.wear(P.eq[s], 1);
    if (e.ab.includes('poison') && Math.random() < 0.3) Gm.fx('poison', 20);
    if (e.ab.includes('drain')) e.hp = Math.min(e.mhp, e.hp + Math.round(dmg * 0.5));
    if (e.ab.includes('web') && Math.random() < 0.2) Gm.fx('webbed', 6);
    if (e.ab.includes('fire') && Math.random() < 0.2 && !Gm.fxFlag('fireImm')) Gm.fx('burn', 10);
    if (e.ab.includes('freeze') && Math.random() < 0.25) Gm.fx('slow', 12);
    if (e.ab.includes('fear') && Math.random() < 0.15) Gm.fx('fear', 10);
    if (e.ab.includes('spore') && Math.random() < 0.04 && !Gm.hasFx('spores')) Gm.fx('spores', 60 * 24 * 20);
    if (e.ab.includes('curse') && Math.random() < 0.03) { const c = D.curseIds[Math.floor(Math.random() * D.curseIds.length)]; if (!['plague', 'hungry_god', 'age'].includes(c)) Gm.fx(c, 60 * 24 * 3); }
    if (e.tpl === 'reflection' && Math.random() < 0.1) Gm.cnt('mirror');
  };
  // существо против существа (союзники)
  Cb.entAttack = function (a, b) {
    const acc = 70 + a.ac - b.dg;
    if (Math.random() * 100 > U.clamp(acc, 10, 95)) return;
    const dmg = Math.max(1, rnd(a.a[0], a.a[1]) - Math.floor(b.d * 0.7));
    if (b.kind === 'npc' && !b.hostile) return;
    Gm.msg(U.cap(a.n) + ' ' + a.v + ' — ' + b.acc + ' (' + dmg + ').', '#a0d0a0');
    Cb.hurtEnt(b, dmg, a.ally ? 'ally' : 'mon');
  };

  // ---------- боссы ----------
  Cb.bossAct = function (e) {
    const P = G.P;
    const m = G.map;
    const sees = Ent.sees(e) || U.dist(e.x, e.y, P.x, P.y) <= 2;
    if (sees && !e.aware) { e.aware = true; Gm.msg(U.cap(e.full || e.n) + '.', e.c); if (e.lore && !e.lored) { e.lored = 1; Gm.msg(e.lore, '#a0a0a0'); } }
    if (!e.aware) { Ent.wander(e, 0.2); return; }
    const dist = U.dist(e.x, e.y, P.x, P.y);
    const cd = e.cdA;
    const ready = (k, n) => { if ((cd[k] || 0) > 0) { cd[k]--; return false; } cd[k] = n; return true; };
    if (e.hp < e.mhp * 0.3 && e.ab.includes('enrage') && !e.enraged) { e.enraged = 1; Gm.msg(U.cap(e.n) + ' приходит в ярость!', '#ff4040'); }
    if (e.ab.includes('mirror')) { /* повторяет игрока */ }
    if (e.ab.includes('summon') && ready('summon', 9) && m.ents.length < 50) {
      const pool = D.monsFor(m.spawn ? m.spawn.biome : 'plains', { lvl: e.lvl, night: Gm.night() }).filter(([id]) => D.mons[id].ai !== 'passive');
      const tid = pool.length ? pool[Math.floor(Math.random() * pool.length)][0] : 'skeleton';
      for (let i = 0; i < 2; i++) { const s = Ent.mon(tid, Math.max(1, e.lvl - 3), e.x, e.y); s.aware = true; Gm.addEnt(s); }
      Gm.msg(U.cap(e.n) + ' зовёт на помощь.', '#ff9090');
      return;
    }
    if (e.ab.includes('teleport') && dist > 2 && ready('tp', 7)) {
      const p = Ent.freeNear(P.x + rnd(-2, 2), P.y + rnd(-2, 2));
      if (p) { Ent.move(e, p.x, p.y); Gm.msg(U.cap(e.n) + ' возникает рядом с тобой.', '#c0a0ff'); return; }
    }
    if ((e.ab.includes('fire') || e.ab.includes('freeze')) && dist > 1 && dist <= 7 && E.FOV.los(m, e.x, e.y, P.x, P.y) && ready('bolt', 3)) {
      const fire = e.ab.includes('fire');
      let dmg = Math.max(1, Math.round(rnd(e.a[0], e.a[1]) * 0.9) - Math.floor(P.st.def * 0.5));
      if (fire && Gm.fxFlag('fireImm')) dmg = Math.round(dmg * 0.2);
      Gm.msg(U.cap(e.n) + (fire ? ' обдаёт тебя пламенем' : ' бьёт тебя стужей') + ' (' + dmg + ').', fire ? '#ff9040' : '#80c0ff');
      Gm.hurtPlayer(dmg, fire ? 'fire' : 'boss:' + e.boss, e);
      if (!fire) Gm.fx('slow', 6);
      return;
    }
    if (e.ab.includes('charge') && dist >= 3 && dist <= 6 && ready('charge', 6)) {
      const p = Ent.freeNear(P.x, P.y);
      if (p && U.dist(p.x, p.y, P.x, P.y) === 1) { Ent.move(e, p.x, p.y); Gm.msg(U.cap(e.n) + ' бросается на тебя!', '#ff7070'); Cb.monAttack(e); return; }
    }
    if (dist === 1) {
      if (e.ab.includes('aoe') && ready('aoe', 5)) {
        Gm.msg(U.cap(e.n) + ' бьёт всё вокруг!', '#ff6060');
        Cb.monAttack(e);
        for (const o of m.ents) if (o.ally && U.dist(o.x, o.y, e.x, e.y) <= 1) Cb.entAttack(e, o);
        return;
      }
      if (e.ab.includes('swallow') && Math.random() < 0.12) {
        Gm.popup('Тьма', 'Пасть смыкается вокруг тебя. Тепло. Влажно. Темно. Ты внутри.');
        P.ret = { key: m.key, x: P.x, y: P.y };
        Gm.teleport('dim:flesh:' + rnd(0, 2) + ':' + rnd(0, 2), -1, -1);
        return;
      }
      Cb.monAttack(e);
      return;
    }
    if (!Ent.stepToward(e, false)) Ent.wander(e, 0.5);
  };

  // ---------- умения ----------
  Cb.useAbility = function (aid, dir, isPrayer) {
    const P = G.P;
    const a = isPrayer ? aid : D.ab[aid];
    if (!a) return false;
    const key = isPrayer ? null : aid;
    const stat = a.stat || 'str';
    const sv = P.st[stat] || 5;
    const spell = P.eq.hand && P.eq.hand.spell && (stat === 'int' || stat === 'fai') ? P.eq.hand.spell : 1;
    const comet = Gm.event('comet') ? 1.3 : 1;
    const powerDmg = (p) => Math.max(1, Math.round((rnd(2, 5) + sv * 0.9 + P.level * 0.8) * p * spell * comet));
    const m = G.map;
    const target1 = () => { // первый враг по направлению
      if (!dir) return Cb.nearestEnemy(a.r || 8);
      let x = P.x, y = P.y;
      for (let i = 0; i < (a.r || 8); i++) { x += dir[0]; y += dir[1]; if (x < 0 || y < 0 || x >= m.w || y >= m.h) break; if (!TL[m.tiles[y * m.w + x]].see && !TL[m.tiles[y * m.w + x]].walk) break; const e = Gm.entAt(x, y); if (e && e.kind !== 'ally') return e; }
      return null;
    };
    const hurt = (e, dmg, el) => { if (e.kind === 'npc' && !e.hostile) Gm.crime(e, 'attack'); e.aware = true; Gm.msg(U.cap(a.n) + ' — ' + e.acc + ' (' + dmg + ').', '#ffd0a0'); const k = Cb.hurtEnt(e, dmg, 'player', el); if (!k) Cb.onHitFx(e, a.x || {}); return k; };
    switch (a.k) {
      case 'strike': case 'execute': case 'drain': {
        const e = dir ? Gm.entAt(P.x + dir[0], P.y + dir[1]) : Cb.nearestEnemy(1);
        if (!e) { Gm.msg('Рядом никого.'); return false; }
        let mult = a.p;
        if (a.k === 'execute' && e.hp < e.mhp * 0.35) mult *= 2.5;
        const r = Cb.playerDmg(e, mult, { stat: a.stat !== 'str' ? a.stat : null, sneak: a.x && a.x.sneak && !e.aware });
        if (a.x && a.x.sneak && !e.aware) r.dmg = Math.round(r.dmg * a.x.sneak);
        const dmg = Math.max(1, r.dmg - Math.floor(e.d * (a.x && a.x.pierce ? 0.1 : 0.5)));
        hurt(e, dmg, a.el);
        if (a.k === 'drain') Gm.healPlayer(Math.round(dmg * 0.5));
        if (a.x && a.x.echo && !e.dead) { const r2 = Cb.playerDmg(e, mult * 0.6); hurt(e, r2.dmg, a.el); }
        Cb.wear(P.eq.hand, 1);
        break;
      }
      case 'cleave': {
        let any = false;
        for (const [dx, dy] of U.DIR8) { const e = Gm.entAt(P.x + dx, P.y + dy); if (e && e.kind !== 'ally' && (e.kind !== 'npc' || e.hostile)) { any = true; const r = Cb.playerDmg(e, a.p); hurt(e, Math.max(1, r.dmg - Math.floor(e.d * 0.6)), a.el); } }
        if (!any) Gm.msg('Ты рассекаешь воздух.');
        break;
      }
      case 'bolt': {
        const e = target1();
        if (!e) { Gm.msg('Мимо.'); break; }
        const el = a.el === 'random' ? ['fire', 'ice', 'acid', 'storm'][rnd(0, 3)] : a.el;
        hurt(e, powerDmg(a.p), el);
        if (el === 'fire' && !e.dead && Math.random() < 0.3) Cb.entFx(e, 'burn', 4, 3);
        break;
      }
      case 'blast': {
        let cx = P.x, cy = P.y;
        if (!a.self) { const e = target1(); if (e) { cx = e.x; cy = e.y; } else if (dir) { cx = P.x + dir[0] * Math.min(4, a.range || 5); cy = P.y + dir[1] * Math.min(4, a.range || 5); } }
        Gm.flash(cx, cy, a.r || 2, a.el);
        const el = a.el === 'random' ? ['fire', 'ice', 'acid', 'storm'][rnd(0, 3)] : a.el;
        for (const e of m.ents.slice()) {
          if (e.kind === 'ally' || (e.kind === 'npc' && !e.hostile && a.self)) continue;
          if (U.dist(e.x, e.y, cx, cy) <= (a.r || 2)) hurt(e, powerDmg(a.p), el);
        }
        if (el === 'fire') Gm.cnt('throw');
        break;
      }
      case 'chain': {
        const tg = m.ents.filter((e) => (e.hostile || e.hostileToP) && e.kind !== 'ally' && U.dist(e.x, e.y, P.x, P.y) <= (a.r || 8) && E.FOV.los(m, P.x, P.y, e.x, e.y)).slice(0, a.n || 3);
        if (!tg.length) { Gm.msg('Молния уходит в землю.'); break; }
        for (const e of tg) hurt(e, powerDmg(a.p), a.el);
        break;
      }
      case 'heal': {
        const v = a.pct ? Math.round(P.mhp * a.p) : Math.round((a.flat || 0) + sv * a.p);
        Gm.healPlayer(v);
        Gm.gain('heal', v);
        break;
      }
      case 'buff': Gm.fx(a.e, (a.dur || 20) * 2); break;
      case 'stealth': Gm.fx('stealth', (a.dur || 10) * 2); if (a.x && a.x.fear) Cb.fearAround(4); for (const e of m.ents) e.aware = false; break;
      case 'debuff': {
        let n = 0;
        for (const e of m.ents) if ((e.hostile || e.hostileToP) && e.kind !== 'ally' && U.dist(e.x, e.y, P.x, P.y) <= (a.r || 3)) { Cb.entFx(e, a.e === 'webbed' ? 'webbed' : a.e === 'stun' ? 'stun' : a.e === 'slow' ? 'slow' : a.e === 'poison' ? 'poison' : a.e === 'bleed' ? 'bleed' : a.e, a.dur || 4, 3); if (a.e === 'weak') e.a = [Math.max(1, Math.round(e.a[0] * 0.7)), Math.max(1, Math.round(e.a[1] * 0.7))]; if (a.e === 'fear' || a.e === 'blind') { e.aware = false; } n++; }
        Gm.msg(n ? U.cap(a.n) + ': ' + n + ' ' + U.plural(n, 'цель', 'цели', 'целей') + '.' : 'Никого рядом.', '#c0a0ff');
        break;
      }
      case 'fear': {
        let n = 0;
        for (const e of m.ents.slice()) {
          if (!(e.hostile || e.hostileToP) || e.kind === 'ally' || U.dist(e.x, e.y, P.x, P.y) > (a.r || 5)) continue;
          if (a.x && a.x.undeadDie && e.tags.includes('undead') && e.kind !== 'boss' && e.lvl <= P.level + 2) { Cb.hurtEnt(e, e.hp + 1, 'player', 'holy'); n++; continue; }
          if (e.kind !== 'boss') { e.feared = G.turn + 8; e.aware = false; Cb.entFx(e, 'stun', 2); n++; }
        }
        Gm.msg(n ? 'Враги в страхе отступают.' : 'Никто не испугался.', '#c0a0ff');
        break;
      }
      case 'blink': {
        let tx = P.x, ty = P.y;
        if (a.x && a.x.away) { const e = Cb.nearestEnemy(10); const dx = e ? U.sign(P.x - e.x) : rnd(-1, 1), dy = e ? U.sign(P.y - e.y) : rnd(-1, 1); tx = P.x + dx * (a.r || 6); ty = P.y + dy * (a.r || 6); }
        else if (dir) { tx = P.x + dir[0] * (a.r || 6); ty = P.y + dir[1] * (a.r || 6); }
        else { tx = P.x + rnd(-(a.r || 6), a.r || 6); ty = P.y + rnd(-(a.r || 6), a.r || 6); }
        tx = U.clamp(tx, 0, m.w - 1); ty = U.clamp(ty, 0, m.h - 1);
        const p = Ent.freeNear(tx, ty);
        if (p) { P.x = p.x; P.y = p.y; Gm.msg('Мир на миг смазывается.', '#c0c0ff'); }
        break;
      }
      case 'shadowstep': {
        const e = Cb.nearestEnemy(a.r || 8);
        if (!e) { Gm.msg('Никого.'); return false; }
        const p = Ent.freeNear(e.x - U.sign(P.x - e.x), e.y - U.sign(P.y - e.y));
        if (p) { P.x = p.x; P.y = p.y; }
        const r = Cb.playerDmg(e, a.p, { stat: 'dex' });
        hurt(e, r.dmg, null);
        break;
      }
      case 'summon': { const n = (a.x && a.x.n) || 1; for (let i = 0; i < n; i++) Gm.spawnAlly(a.x.mon, a.dur || 40, P.level); Gm.msg('Рядом с тобой кто-то появляется.', '#a0e0a0'); break; }
      case 'reveal': {
        if (a.x && a.x.map) { const ex = G.mapExplored(); ex.fill(1); Gm.msg('Ты видишь эти места, будто сверху.', '#a0c0ff'); }
        if (a.x && a.x.mons) { G.revealUntil = G.turn + 30; Gm.msg('Ты чувствуешь всех живых вокруг.', '#a0c0ff'); }
        break;
      }
      case 'shield': P.shield = (P.shield || 0) + Math.round(sv * (a.p || 3)); Gm.msg('Тебя окружает невидимая преграда.', '#a0c0ff'); break;
      case 'timestop': G.frozen = (a.p || 3); Gm.msg('Мир замирает.', '#f0e0a0'); break;
      case 'sate': P.hunger = Math.min(100, P.hunger + (a.p || 50)); Gm.msg('Голод отступает.'); break;
      case 'transmute': { E.UI.pickItem('Что превратить в золото?', (it) => !it.art && it.b !== 'gold', (it) => { const v = Math.round((it.v || 1) * (a.p || 2) * (it.q || 1)); Gm.removeItem(it); Gm.give('gold', v); Gm.cnt('brews'); Gm.gain('brew'); }); break; }
      case 'travel': E.UI.travel(true); break;
    }
    if (!isPrayer) { Gm.cnt('cast'); Gm.gain('cast'); }
    return true;
  };
  Cb.nearestEnemy = function (r) {
    const P = G.P;
    let best = null, bd = r + 1;
    for (const e of G.map.ents) {
      if (e.kind === 'ally' || !(e.hostile || e.hostileToP)) continue;
      const d = U.dist(e.x, e.y, P.x, P.y);
      if (d < bd && E.FOV.los(G.map, P.x, P.y, e.x, e.y)) { bd = d; best = e; }
    }
    return best;
  };
  Cb.fearAround = function (r) { for (const e of G.map.ents) if (e.hostile && U.dist(e.x, e.y, G.P.x, G.P.y) <= r) { e.aware = false; Cb.entFx(e, 'stun', 2); } };
  // нужен ли выбор направления
  Cb.needsDir = (a) => ['strike', 'execute', 'drain', 'bolt', 'blink', 'blast'].includes(a.k) && !(a.k === 'blast' && a.self) && !(a.k === 'blink' && a.x && a.x.away);
})(window.EOF);
