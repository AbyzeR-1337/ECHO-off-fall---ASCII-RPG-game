'use strict';
// Симуляция мира. Мир живёт сам — с игроком или без него.
(function (E) {
  const U = E.U, D = E.D, C = E.C, N = E.N;
  const Sim = E.Sim = {};
  const WS = C.WS;
  const DAY = 1440, YEAR = 1440 * 360;
  const W = () => E.G.W, S = () => E.G.S;

  // ---------- время ----------
  const Time = E.Time = {
    day: (t) => Math.floor(t / DAY),
    hour: (t) => Math.floor((t % DAY) / 60),
    minute: (t) => t % 60,
    month: (t) => Math.floor((Math.floor(t / DAY) % 360) / 30),
    dom: (t) => (Math.floor(t / DAY) % 30) + 1,
    year: (t) => E.G.W.year0 + Math.floor(t / YEAR),
    season: (t) => Math.floor(Time.month(t) / 3),
    moon: (t) => (Math.floor(t / DAY) + (E.G.W.seed % 28)) % 28,
    fullMoon: (t) => { const p = Time.moon(t); return p >= 13 && p <= 15; },
    night: (t) => { if (Sim.event('nosun') || Sim.event('eclipse')) return true; const h = Time.hour(t); return h >= 21 || h < 5; },
    light: (t) => { // 0 — ночь, 1 — день
      if (Sim.event('nosun') || Sim.event('eclipse')) return 0;
      const h = Time.hour(t) + Time.minute(t) / 60;
      if (h >= 7 && h < 19) return 1;
      if (h >= 5 && h < 7) return (h - 5) / 2;
      if (h >= 19 && h < 21) return 1 - (h - 19) / 2;
      return 0;
    },
    fmt: (t) => String(Time.hour(t)).padStart(2, '0') + ':' + String(Time.minute(t)).padStart(2, '0'),
    date: (t) => Time.dom(t) + ' ' + D.monthsGen[Time.month(t)] + ', ' + Time.year(t) + ' г.',
    dayWord: (t) => { const h = Time.hour(t); return h < 5 ? 'глубокая ночь' : h < 7 ? 'рассвет' : h < 11 ? 'утро' : h < 15 ? 'день' : h < 19 ? 'вечер' : h < 21 ? 'сумерки' : 'ночь'; },
  };

  // ---------- инициализация ----------
  Sim.init = function (Wd) {
    const s = {
      v: 1, time: 8 * 60, sett: [], npc: {}, newNpc: [], fac: [], ev: [], evLast: {}, evPlan: [], chron: [], boss: {}, taken: {}, lostPr: {}, flags: {}, st: {}, maps: {},
      infect: {}, cults: [], dragon: null, temps: [], springStorm: {}, deadList: [], lastDay: 0, lastHour: 8, nid: 0,
    };
    for (const st of Wd.settlements) {
      const pop = st.npcs.length;
      s.sett.push({ stock: { food: pop * 25 + 40, iron: st.b.mine ? 20 : 4, wood: 30, herbs: 10, weapons: Math.ceil(pop * 0.2) + 2 }, famine: 0, destroyed: 0, fac: st.fac, plague: 0, unrest: 0, rep: 0, mineDead: 0, raided: 0 });
    }
    const rr = U.rng(Wd.seed, 'rel');
    for (const f of Wd.factions) {
      const rel = Wd.factions.map((g) => (g.id === f.id ? 100 : 0));
      s.fac.push({ alive: 1, ruler: f.ruler, rel, war: {}, weary: 0, rep: 0 });
    }
    for (let a = 0; a < Wd.factions.length; a++) for (let b = a + 1; b < Wd.factions.length; b++) { const v = rr.int(-25, 45); s.fac[a].rel[b] = v; s.fac[b].rel[a] = v; }
    return s;
  };

  // Кэши, не сохраняются
  Sim.prepare = function () {
    const Wd = W(), Sd = S();
    Sim.alive = new Uint8Array(Wd.npcs.length + 20000);
    Sim.base = Wd.npcs.length;
    Sim.settAlive = Wd.settlements.map(() => []);
    Sim.jobs = Wd.settlements.map(() => ({}));
    const add = (n) => {
      const id = n.id;
      const st = Sd.npc[id];
      if (st && st.d != null) return;
      Sim.alive[id] = 1;
      const sid = st && st.s != null ? st.s : n.sett;
      if (sid >= 0 && Sim.settAlive[sid]) {
        Sim.settAlive[sid].push(id);
        const j = Sim.job(id);
        Sim.jobs[sid][j] = (Sim.jobs[sid][j] || 0) + 1;
      }
    };
    for (const n of Wd.npcs) add(n);
    for (const n of Sd.newNpc) add(n);
    // соседи для торговли
    Sim.nb = Wd.settlements.map((a) => Wd.settlements.filter((b) => b !== a && !['sea', 'vanish'].includes(b.type) && !['sea', 'vanish'].includes(a.type) && Math.abs(a.rx - b.rx) + Math.abs(a.ry - b.ry) <= 4).map((b) => b.id));
  };

  // ---------- NPC ----------
  Sim.npc = (id) => (id < Sim.base ? W().npcs[id] : S().newNpc[id - Sim.base]);
  Sim.st = (id) => { const s = S().npc; return s[id] || (s[id] = {}); };
  Sim.isAlive = (id) => !!Sim.alive[id];
  Sim.age = (id) => {
    const n = Sim.npc(id);
    if (!n) return 0;
    if (n.born != null) return Math.floor((S().time - n.born) / YEAR);
    return n.age + Math.floor(S().time / YEAR);
  };
  Sim.job = (id) => { const st = S().npc[id]; return (st && st.j) || Sim.npc(id).job; };
  Sim.settOf = (id) => { const st = S().npc[id]; return st && st.s != null ? st.s : Sim.npc(id).sett; };
  Sim.pop = (sid) => Sim.settAlive[sid] ? Sim.settAlive[sid].length : 0;
  Sim.jobCount = (sid, j) => (Sim.jobs[sid] && Sim.jobs[sid][j]) || 0;
  Sim.setJob = function (id, j) {
    const sid = Sim.settOf(id), old = Sim.job(id);
    if (sid >= 0 && Sim.jobs[sid]) { Sim.jobs[sid][old] = Math.max(0, (Sim.jobs[sid][old] || 1) - 1); Sim.jobs[sid][j] = (Sim.jobs[sid][j] || 0) + 1; }
    Sim.st(id).j = j;
  };
  Sim.kill = function (id, cause, o) {
    o = o || {};
    if (!Sim.alive[id]) return false;
    Sim.alive[id] = 0;
    const st = Sim.st(id);
    st.d = S().time; st.dc = cause || 'умер(ла)';
    if (o.byPlayer) st.bp = 1;
    const sid = Sim.settOf(id);
    if (sid >= 0 && Sim.settAlive[sid]) {
      const arr = Sim.settAlive[sid];
      const k = arr.indexOf(id);
      if (k >= 0) { arr[k] = arr[arr.length - 1]; arr.pop(); }
      const j = Sim.job(id);
      Sim.jobs[sid][j] = Math.max(0, (Sim.jobs[sid][j] || 1) - 1);
    }
    S().deadList.push(id);
    if (S().deadList.length > 3000) S().deadList.splice(0, 500);
    const n = Sim.npc(id);
    const Wd = W();
    // хранители молитв
    if (n.keeps) for (const pid of n.keeps) {
      const p = Wd.prayers[pid];
      if (p && p.keepers && !S().lostPr[pid] && p.keepers.every((k) => !Sim.alive[k])) {
        S().lostPr[pid] = S().time;
        Sim.chron('Умер(ла) ' + n.first + ' ' + (n.sur || '') + '. Вместе с ней(ним) ушла последняя память о молитве «' + p.n + '».', { r: Sim.regionOf(id), k: 'lost', hidden: 1 });
      }
    }
    // важные смерти
    const j = Sim.job(id);
    if (j === 'ruler') {
      const f = Wd.settlements[sid] ? S().sett[sid].fac : -1;
      if (f >= 0 && S().fac[f] && S().fac[f].ruler === id) Sim.succession(f, n, cause);
    } else if (sid >= 0 && (j === 'smith' || j === 'priest' || j === 'elder' || j === 'innkeeper') && !o.quiet) {
      const left = Sim.jobCount(sid, j);
      if (left === 0 && j === 'smith') Sim.chron('В ' + Wd.settlements[sid].loc.slice(2) + ' умер последний кузнец — ' + n.first + '. Ковать больше некому.', { r: Wd.settlements[sid].region, k: 'econ' });
    }
    // семья помнит
    for (const fid of Sim.famOf(id)) {
      if (!Sim.alive[fid]) continue;
      const fs = Sim.st(fid);
      fs.grief = { who: id, t: S().time };
      if (o.byPlayer) { fs.hate = (fs.hate || 0) + 1; Sim.mem(fid, { k: 'relKiller', who: id }); fs.op = (fs.op || 0) - 80; }
    }
    return true;
  };
  Sim.famOf = function (id) {
    const n = Sim.npc(id);
    const out = n.fam ? n.fam.slice() : [];
    // новорождённые
    for (const b of S().newNpc) if (b.fam && b.fam.includes(id) && !out.includes(b.id)) out.push(b.id);
    return out;
  };
  Sim.isRel = (a, b) => a === b || Sim.famOf(a).includes(b) || Sim.famOf(b).includes(a);
  Sim.mem = function (id, m) { const st = Sim.st(id); st.m = st.m || []; m.t = S().time; st.m.push(m); if (st.m.length > 10) st.m.shift(); };
  Sim.regionOf = function (id) { const sid = Sim.settOf(id); if (sid >= 0) return W().settlements[sid].region; const n = Sim.npc(id); return n.region != null ? n.region : -1; };

  // ---------- хроника ----------
  Sim.chron = function (text, o) {
    o = o || {};
    const e = { t: S().time, s: text, r: o.r != null ? o.r : -1, k: o.k || 'misc' };
    if (o.hidden) e.h = 1;
    const G = E.G;
    if (G.P && G.map && G.map.rid != null && e.r === G.map.rid) e.seen = 1;
    if (o.seen) e.seen = 1;
    S().chron.push(e);
    if (S().chron.length > 2500) S().chron.splice(0, 300);
    return e;
  };

  // ---------- погода ----------
  Sim.weather = function (rid, t) {
    t = t == null ? S().time : t;
    if (rid == null || rid < 0) return 'none';
    const Wd = W();
    const g = Wd.regions[rid];
    if (!g) return 'none';
    if (Sim.event('blacksnow') && g.t < 0.65) return 'blacksnow';
    const ash = Sim.event('ashrain');
    if (ash && Math.abs(Wd.regions[ash.r].x - g.x) + Math.abs(Wd.regions[ash.r].y - g.y) <= 4) return 'ashrain';
    const blk = t / 360;
    const n = U.noise(Wd.seed + 500, g.x * 0.28 + blk * 0.61, g.y * 0.28 - blk * 0.37);
    const season = Time.season(t);
    const cold = g.t < 0.27 || g.biome === 'ice' || season === 3 && g.t < 0.6;
    const b = g.biome;
    if (b === 'desert') return n > 0.86 ? 'sandstorm' : n > 0.8 ? 'cloudy' : 'clear';
    if (b === 'sky') return n > 0.7 ? 'storm' : n > 0.55 ? 'fog' : 'clear';
    const stormT = season === 0 || season === 1 ? 0.77 : 0.82;
    let w;
    if (n < 0.42) w = 'clear';
    else if (n < 0.58) w = 'cloudy';
    else if (n < stormT) w = 'rain';
    else if (n < 0.86) w = 'storm';
    else w = 'fog';
    if (b === 'swamp' && n > 0.5 && n < 0.58) w = 'fog';
    if (cold) { if (w === 'rain') w = 'snow'; if (w === 'storm') w = 'blizzard'; }
    return w;
  };
  Sim.firstSpringStorm = function () {
    const ss = S().springStorm[Time.year(S().time)];
    return !!(ss && ss.active);
  };

  // ---------- события ----------
  Sim.event = function (id, rid) {
    const s = E.G.S;
    if (!s) return null;
    for (const e of s.ev) {
      if (e.id !== id) continue;
      if (rid == null) return e;
      const def = D.events[id];
      if (def.scope === 'global') return e;
      if (def.scope === 'region' && e.r === rid) return e;
      if (def.scope === 'area' && e.r != null && Sim.rdist(e.r, rid) <= 4) return e;
      if (def.scope === 'spread' && S().infect[rid] && id === 'shroom') return e;
      if (def.scope === 'settlement' && W().regions[rid] && W().regions[rid].settlement === e.s) return e;
    }
    return null;
  };
  Sim.rdist = (a, b) => { const A = W().regions[a], B = W().regions[b]; return Math.abs(A.x - B.x) + Math.abs(A.y - B.y); };

  function planEvents(day) {
    const s = S(), Wd = W();
    const r = U.rng(Wd.seed, 'ev', day);
    const season = Math.floor(((day % 360)) / 90);
    for (const id in D.events) {
      const d = D.events[id];
      if (day < d.min) continue;
      if (d.season && !d.season.includes(season)) continue;
      const last = s.evLast[id];
      if (last != null && day - last < d.cd) continue;
      if (s.evPlan.some((p) => p.id === id)) continue;
      if (s.ev.some((e) => e.id === id)) continue;
      let w = d.w;
      if (id === 'ocean' && s.flags.lighthouseDark) w *= 3;
      if (s.flags.sealBroken && ['blacksnow', 'bloodmoon', 'nosun', 'hunt'].includes(id)) w *= 2;
      if (id === 'dragon' && s.dragon) continue;
      if (!r.chance(w * 0.0035)) continue;
      const hour = d.night ? 0 : r.int(0, 23);
      const p = { id, t: day * DAY + hour * 60 + r.int(0, 59), r: null, s: null };
      // место
      const land = Wd.regions.filter((g) => g.biome !== 'ocean' && g.exist === 'always');
      if (id === 'star' || id === 'fair' || id === 'quake' || id === 'locust') p.r = r.pick(land).id;
      else if (id === 'shroom') { const l = land.filter((g) => ['swamp', 'forest', 'ancient'].includes(g.biome)); p.r = (l.length ? r.pick(l) : r.pick(land)).id; }
      else if (id === 'island') { const l = Wd.regions.filter((g) => g.biome === 'ocean' && g.exist === 'always'); p.r = r.pick(l).id; }
      else if (id === 'dragon') { const l = land.filter((g) => ['volcanic', 'mountain', 'living'].includes(g.biome)); p.r = (l.length ? r.pick(l) : r.pick(land)).id; }
      else if (id === 'ashrain') { const l = Wd.regions.filter((g) => g.biome === 'volcanic'); p.r = (l.length ? r.pick(l) : r.pick(land)).id; }
      else if (id === 'ocean') { const l = Wd.regions.filter((g) => g.biome === 'ocean' && g.exist === 'always'); p.r = r.pick(l).id; }
      else if (id === 'plague' || id === 'cult') { const l = Wd.settlements.filter((st) => ['town', 'capital', 'village'].includes(st.type) && !s.sett[st.id].destroyed); if (!l.length) continue; p.s = r.pick(l).id; p.r = Wd.settlements[p.s].region; }
      else if (id === 'flood') { const l = Wd.settlements.filter((st) => st.coast && !s.sett[st.id].destroyed); if (!l.length) continue; p.s = r.pick(l).id; p.r = Wd.settlements[p.s].region; }
      s.evPlan.push(p);
    }
  }

  function fmtEv(text, e) {
    const Wd = W();
    let t = text;
    if (e.r != null && Wd.regions[e.r]) t = t.replace(/\{reg\}/g, Wd.regions[e.r].name);
    if (e.s != null && Wd.settlements[e.s]) t = t.replace(/\{town\}/g, Wd.settlements[e.s].loc.slice(2)).replace(/В \{town\}/g, 'В ' + Wd.settlements[e.s].loc.slice(2));
    if (e.cult) t = t.replace(/\{cult\}/g, e.cult);
    if (e.days) t = t.replace(/\{days\}/g, e.days + ' ' + U.plural(e.days, 'день', 'дня', 'дней'));
    return t;
  }
  Sim.fmtEv = fmtEv;

  function startEvent(p) {
    const s = S(), Wd = W();
    const d = D.events[p.id];
    const r = U.rng(Wd.seed, 'evs', p.t);
    const dur = r.range(d.dur[0], d.dur[1]);
    const e = { id: p.id, t0: S().time, t1: S().time + Math.round(dur * DAY), r: p.r, s: p.s };
    if (p.id === 'nosun') e.days = Math.round(dur);
    s.evLast[p.id] = Time.day(S().time);
    if (p.id === 'cult') {
      e.cult = r.pick(N.cultNames);
      const ids = Sim.settAlive[p.s].filter((id) => Sim.age(id) >= 25);
      if (!ids.length) return;
      s.cults.push({ name: e.cult, sett: p.s, members: 3, leader: r.pick(ids), t: S().time });
    }
    if (p.id === 'star') s.temps.push({ id: 'star' + p.t, kind: 'star', r: p.r, t1: S().time + 720, boss: r.chance(0.2) && !(s.boss.b_star_fallen && s.boss.b_star_fallen.dead) });
    if (p.id === 'fair') s.temps.push({ id: 'fair' + p.t, kind: 'fair', r: p.r, t1: S().time + 210 });
    if (p.id === 'island') s.temps.push({ id: 'isl' + p.t, kind: 'island', r: p.r, t1: e.t1 });
    if (p.id === 'shroom') s.infect[p.r] = S().time;
    if (p.id === 'plague') s.sett[p.s].plague = S().time;
    if (p.id === 'dragon') { s.dragon = { r: p.r, alive: 1, next: S().time + DAY * r.int(3, 6) }; e.t1 = 1e12; }
    if (p.id === 'flood') { const st = s.sett[p.s]; st.stock.food *= 0.4; Sim.killPop(p.s, 0.03, 'утонул(а) в наводнение'); }
    if (p.id === 'quake') {
      for (const st of Wd.settlements) if (st.b.mine && Sim.rdist(st.region, p.r) <= 2 && r.chance(0.5)) { s.sett[st.id].mineDead = 1; Sim.chron('Землетрясение обрушило шахту у ' + st.gen + '.', { r: st.region, k: 'econ' }); }
    }
    s.ev.push(e);
    Sim.chron(fmtEv(d.chron, e), { r: e.r, k: 'event' });
    if (E.Gm && E.Gm.onEventStart) E.Gm.onEventStart(e);
  }
  function endEvent(e) {
    const s = S();
    const d = D.events[e.id];
    if (d.end) Sim.chron(fmtEv(d.end, e), { r: e.r, k: 'event', hidden: 1 });
    if (e.id === 'shroom') s.infect = {};
    if (E.Gm && E.Gm.onEventEnd) E.Gm.onEventEnd(e);
  }

  // ---------- такт: час ----------
  Sim.hourly = function () {
    const s = S(), Wd = W(), t = s.time;
    // запланированные события
    for (let i = s.evPlan.length - 1; i >= 0; i--) if (s.evPlan[i].t <= t) { const p = s.evPlan.splice(i, 1)[0]; startEvent(p); }
    for (let i = s.ev.length - 1; i >= 0; i--) if (s.ev[i].t1 <= t) { const e = s.ev.splice(i, 1)[0]; endEvent(e); }
    for (let i = s.temps.length - 1; i >= 0; i--) if (s.temps[i].t1 <= t) s.temps.splice(i, 1);
    // первая весенняя гроза над священным ручьём
    if (Time.season(t) === 0) {
      const y = Time.year(t);
      const w = Sim.weather(Wd.special.stream, t);
      const ss = s.springStorm[y];
      if (!ss && w === 'storm') { s.springStorm[y] = { t0: t, active: 1 }; }
      else if (ss && ss.active && w !== 'storm') ss.active = 0;
    }
    // дракон
    if (s.dragon && s.dragon.alive && t >= s.dragon.next) dragonRaid();
    s.lastHour = Time.hour(t);
  };

  function dragonRaid() {
    const s = S(), Wd = W();
    const r = U.rng(Wd.seed, 'dragon', s.time);
    s.dragon.next = s.time + DAY * r.int(4, 7);
    const l = Wd.settlements.filter((st) => !s.sett[st.id].destroyed && Sim.rdist(st.region, s.dragon.r) <= 6 && !['sea', 'vanish'].includes(st.type));
    if (!l.length) return;
    const st = r.pick(l);
    s.dragon.raid = { s: st.id, t: s.time };
    const k = Sim.killPop(st.id, r.range(0.04, 0.14), 'сгорел(а) в драконьем пламени');
    s.sett[st.id].stock.food *= 0.5;
    s.sett[st.id].raided = s.time;
    Sim.chron('Дракон Аргхаал сжёг ' + st.nom + '. ' + U.died(k) + '.', { r: st.region, k: 'big' });
    if (Sim.pop(st.id) < 6) Sim.destroySett(st.id, 'сожжён драконом');
    s.dragon.raids = (s.dragon.raids || 0) + 1;
    if (r.chance(0.05) && Sim.settAlive[st.id].length) { const h = r.pick(Sim.settAlive[st.id]); s.dragon.alive = 0; s.boss.b_dragon = Object.assign(s.boss.b_dragon || {}, { dead: s.time, by: h }); Sim.chron('В ' + st.loc.slice(2) + ' дракона Аргхаала убил(а) ' + Sim.npc(h).first + ' ' + (Sim.npc(h).sur || '') + ' — простой(ая) ' + (D.jobs[Sim.job(h)] ? D.jobs[Sim.job(h)][Sim.npc(h).sex] : 'житель') + '.', { r: st.region, k: 'big' }); }
    else if (s.dragon.raids > 8 && r.chance(0.15)) { s.dragon.alive = 0; s.dragon.slept = s.time; Sim.chron('Дракон Аргхаал улетел на север и уснул. Надолго ли?', { r: s.dragon.r, k: 'big' }); }
    if (E.Gm && E.Gm.onDragonRaid) E.Gm.onDragonRaid(st.id);
  }

  Sim.killPop = function (sid, frac, cause) {
    const arr = Sim.settAlive[sid];
    if (!arr) return 0;
    const n = Math.max(arr.length ? 1 : 0, Math.round(arr.length * frac));
    const r = U.rng(W().seed, 'kp', sid, S().time);
    let k = 0;
    for (let i = 0; i < n && arr.length; i++) { const id = arr[r.int(0, arr.length - 1)]; if (E.G.P && E.Gm && E.Gm.isNearPlayerNpc && E.Gm.isNearPlayerNpc(id) && r.chance(0.7)) continue; Sim.kill(id, cause, { quiet: 1 }); k++; }
    return k;
  };
  Sim.destroySett = function (sid, why) {
    const s = S(), Wd = W();
    if (s.sett[sid].destroyed) return;
    s.sett[sid].destroyed = s.time;
    const st = Wd.settlements[sid];
    // выжившие уходят к соседям
    const surv = Sim.settAlive[sid].slice();
    const nb = Sim.nb[sid].filter((x) => !s.sett[x].destroyed);
    for (const id of surv) {
      if (nb.length && Math.random() < 0.7) {
        const to = nb[Math.floor(Math.random() * nb.length)];
        Sim.moveNpc(id, to);
      } else Sim.kill(id, 'погиб(ла), когда ' + st.nom + ' ' + why, { quiet: 1 });
    }
    Sim.chron(st.nom + ' перестал(о) существовать — ' + why + '.', { r: st.region, k: 'big' });
  };
  Sim.moveNpc = function (id, to) {
    const from = Sim.settOf(id);
    const j = Sim.job(id);
    if (from >= 0 && Sim.settAlive[from]) {
      const arr = Sim.settAlive[from], k = arr.indexOf(id);
      if (k >= 0) { arr[k] = arr[arr.length - 1]; arr.pop(); }
      Sim.jobs[from][j] = Math.max(0, (Sim.jobs[from][j] || 1) - 1);
    }
    Sim.st(id).s = to;
    Sim.st(id).h = -1;
    Sim.settAlive[to].push(id);
    Sim.jobs[to][j] = (Sim.jobs[to][j] || 0) + 1;
  };

  // ---------- такт: день ----------
  Sim.daily = function (fast) {
    const s = S(), Wd = W();
    const day = Time.day(s.time);
    s.lastDay = day;
    planEvents(day + 20);
    economy(day);
    population(day);
    factions(day);
    cults(day);
    spread(day);
    // сюжеты
    if (!fast && E.Gm && E.Gm.storyDay) E.Gm.storyDay();
    if (fast && E.Gm && E.Gm.storyDayFast) E.Gm.storyDayFast();
    // восстановление ремёсел
    if (day % 7 === 0) recoverJobs(day);
  };

  const FOODJOB = { farmer: 5, fisher: 4, hunter: 2, shepherd: 2.5 };
  function economy(day) {
    const s = S(), Wd = W();
    const season = Math.floor((day % 360) / 90);
    const farmMul = [3, 6, 8, 2.5][season] / 5;
    const harvest = Sim.event('harvest') ? 2.5 : 1;
    const nosun = Sim.event('nosun') ? 0 : 1;
    const ocean = Sim.event('ocean');
    for (const st of Wd.settlements) {
      const ss = s.sett[st.id];
      if (ss.destroyed) continue;
      const pop = Sim.pop(st.id);
      if (!pop) { if (!ss.destroyed && day > 2) Sim.destroySett(st.id, 'опустел(о)'); continue; }
      const J = Sim.jobs[st.id];
      const g = Wd.regions[st.region];
      let locust = false;
      for (const e of s.ev) if (e.id === 'locust' && Sim.rdist(e.r, st.region) <= 3) locust = true;
      let food = (J.farmer || 0) * FOODJOB.farmer * farmMul * harvest * nosun * (locust ? 0 : 1);
      food += (J.fisher || 0) * FOODJOB.fisher * (season === 3 ? 0.6 : 1) * (ocean && st.coast ? 0 : 1);
      food += (J.hunter || 0) * FOODJOB.hunter + (J.shepherd || 0) * FOODJOB.shepherd * nosun;
      food *= 1 + Math.min(0.3, (J.baker || 0) * 0.06);
      if (st.type === 'sea') food += pop * 1.1;
      if (st.type === 'vanish') food = pop;
      if (ss.plague) food *= 0.7;
      ss.stock.food += food - pop;
      ss.stock.food = Math.min(ss.stock.food, pop * 70 + 50);
      // ресурсы
      if (st.b.mine && !ss.mineDead) ss.stock.iron += (J.miner || 0) * 2;
      const smiths = J.smith || 0;
      for (let i = 0; i < smiths; i++) if (ss.stock.iron >= 2) { ss.stock.iron -= 2; ss.stock.weapons += 1; }
      ss.stock.weapons = Math.max(0, ss.stock.weapons - (J.guard || 0) * 0.02);
      ss.stock.wood += (J.woodcutter || 0) * 3 - (season === 3 ? pop * 0.08 : 0.02 * pop);
      ss.stock.herbs += (J.herbalist || 0) * 2 - 0.1;
      for (const k in ss.stock) ss.stock[k] = Math.max(0, ss.stock[k]);
      ss.stock.iron = Math.min(ss.stock.iron, 400); ss.stock.weapons = Math.min(ss.stock.weapons, pop + 20); ss.stock.wood = Math.min(ss.stock.wood, 600); ss.stock.herbs = Math.min(ss.stock.herbs, 200);
      // голод
      if (st.b.market && ss.famine > 2 && !Sim.atWar(ss.fac)) ss.stock.food += pop * 0.7;
      if (ss.stock.food <= 0) { ss.famine++; if (ss.famine === 5) Sim.chron('В ' + st.loc.slice(2) + ' начался голод.', { r: st.region, k: 'econ' }); }
      else if (ss.famine) ss.famine = Math.max(0, ss.famine - 2);
      // холод
      if (season === 3 && ss.stock.wood <= 0 && g.t < 0.4) ss.cold = (ss.cold || 0) + 1; else ss.cold = 0;
    }
    // торговля
    for (const st of Wd.settlements) {
      const ss = s.sett[st.id];
      if (ss.destroyed) continue;
      const pop = Sim.pop(st.id);
      for (const res of ['food', 'iron', 'weapons', 'herbs']) {
        const keep = res === 'food' ? pop * 25 : res === 'iron' ? 15 : res === 'weapons' ? pop * 0.15 + 2 : 10;
        const surplus = ss.stock[res] - keep;
        if (surplus <= 1) continue;
        const nb = Sim.nb[st.id].filter((o) => { const so = s.sett[o]; if (so.destroyed) return false; if (Sim.warBetween(ss.fac, so.fac)) return false; const op = Sim.pop(o); const need = res === 'food' ? op * 12 : res === 'iron' ? (Sim.jobCount(o, 'smith') ? 10 : 0) : res === 'weapons' ? op * 0.1 : 5; return so.stock[res] < need; });
        if (!nb.length) continue;
        const share = surplus * 0.35 / nb.length;
        for (const o of nb) { s.sett[o].stock[res] += share; ss.stock[res] -= share; }
      }
    }
  }

  function deathP(age) {
    if (age < 1) return 0.0001;
    if (age < 50) return 0.00002;
    if (age < 60) return 0.00008;
    if (age < 70) return 0.0003;
    if (age < 80) return 0.0009;
    if (age < 90) return 0.0025;
    return 0.008;
  }
  function population(day) {
    const s = S(), Wd = W();
    const r = U.rng(Wd.seed, 'pop', day);
    const yr = Math.floor(day / 360);
    for (const st of Wd.settlements) {
      const ss = s.sett[st.id];
      if (ss.destroyed) continue;
      const arr = Sim.settAlive[st.id];
      const fam = Math.min(10, ss.famine);
      const plague = ss.plague ? 0.002 : 0;
      const cold = ss.cold > 5 ? 0.0006 : 0;
      for (let i = arr.length - 1; i >= 0; i--) {
        const id = arr[i];
        const n = Sim.npc(id);
        const age = n.born != null ? Math.floor((s.time - n.born) / YEAR) : n.age + yr;
        let p = deathP(age) + fam * 0.0011 + plague + cold;
        if (st.type === 'vanish') p *= 0.2;
        if (r.next() < p) {
          if (E.Gm && E.Gm.isNearPlayerNpc && E.Gm.isNearPlayerNpc(id)) continue;
          const cause = plague && r.chance(0.8) ? 'умер(ла) от мора' : fam && r.chance(0.7) ? 'умер(ла) от голода' : cold ? 'замёрз(ла)' : age > 65 ? 'умер(ла) от старости' : r.pick(['умер(ла) от лихорадки', 'утонул(а)', 'не вернулся(лась) из леса', 'умер(ла) во сне', 'погиб(ла) от несчастного случая']);
          Sim.kill(id, cause);
        }
      }
      // переселение при голоде
      if (ss.famine > 6 && arr.length > 3 && r.chance(0.3)) {
        const nb = Sim.nb[st.id].filter((x) => !s.sett[x].destroyed && s.sett[x].stock.food > Sim.pop(x) * 10);
        if (nb.length) { const id = arr[r.int(0, arr.length - 1)]; Sim.moveNpc(id, r.pick(nb)); }
      }
      // рождения
      if (!ss.famine && !ss.plague && st.type !== 'vanish' && st.type !== 'farm') {
        const pb = arr.length * 0.000125 * (ss.stock.food > arr.length * 30 ? 1.4 : 1);
        if (r.next() < pb) birth(st.id, r);
      }
    }
    // взросление — раз в год
    if (day % 360 === 0 && day > 0) {
      for (const st of Wd.settlements) {
        if (s.sett[st.id].destroyed) continue;
        for (const id of Sim.settAlive[st.id]) {
          const a = Sim.age(id);
          if (a === 14 && Sim.job(id) === 'child') {
            const need = ['smith', 'farmer', 'fisher', 'miner', 'guard', 'baker', 'herbalist'].find((j) => (j === 'smith' ? st.b.smith : j === 'fisher' ? st.b.dock : j === 'miner' ? st.b.mine : j === 'guard' ? st.b.guard : true) && !Sim.jobCount(st.id, j));
            Sim.setJob(id, need || r.pick(['farmer', 'laborer', 'farmer', 'weaver']));
          }
        }
      }
    }
  }
  function birth(sid, r) {
    const s = S(), Wd = W();
    const arr = Sim.settAlive[sid];
    const moms = arr.filter((id) => { const n = Sim.npc(id); const a = Sim.age(id); return n.sex === 'f' && a >= 18 && a <= 42; });
    if (!moms.length) return;
    const mom = Sim.npc(r.pick(moms));
    const dad = Sim.famOf(mom.id).map((x) => Sim.npc(x)).find((n) => n && n.sex === 'm' && Sim.isAlive(n.id) && Sim.age(n.id) >= 18);
    const sex = r.chance(0.5) ? 'm' : 'f';
    const sur = dad ? dad.sur : mom.sur.replace(/а$/, '');
    const id = Sim.base + s.newNpc.length;
    const n = { id, first: r.pick(sex === 'm' ? N.male : N.female), sur: sex === 'm' ? sur : N.femSur(sur), sex, born: s.time, age: 0, job: 'child', sett: sid, house: mom.house, fam: [mom.id].concat(dad ? [dad.id] : []), friends: [], enemies: [], traits: r.sample(D.traitIds, 2), fear: r.int(0, D.fears.length - 1), habit: r.int(0, D.habits.length - 1), col: '#d0c0b0', look: (sex === 'm' ? 'младенец' : 'младенец') + ', завёрнутый в пелёнки', lvl: 1 };
    s.newNpc.push(n);
    Sim.alive[id] = 1;
    arr.push(id);
    Sim.jobs[sid].child = (Sim.jobs[sid].child || 0) + 1;
  }
  function recoverJobs(day) {
    const s = S(), Wd = W();
    const r = U.rng(Wd.seed, 'rec', day);
    for (const st of Wd.settlements) {
      const ss = s.sett[st.id];
      if (ss.destroyed) continue;
      const needs = [];
      if (st.b.smith && !Sim.jobCount(st.id, 'smith')) needs.push('smith');
      if (st.b.dock && Sim.jobCount(st.id, 'fisher') < 1) needs.push('fisher');
      if (st.b.temple && !Sim.jobCount(st.id, 'priest')) needs.push('priest');
      if (st.b.tavern && !Sim.jobCount(st.id, 'innkeeper')) needs.push('innkeeper');
      if (st.b.guard && Sim.jobCount(st.id, 'guard') < 2) needs.push('guard');
      if (st.b.fields && Sim.jobCount(st.id, 'farmer') < Sim.pop(st.id) * 0.1) needs.push('farmer');
      for (const j of needs) {
        if (!r.chance(0.12)) continue;
        const pool = Sim.settAlive[st.id].filter((id) => ['laborer', 'weaver', 'potter'].includes(Sim.job(id)) && Sim.age(id) >= 16 && Sim.age(id) < 60);
        if (!pool.length) continue;
        const id = r.pick(pool);
        Sim.setJob(id, j);
        if (j === 'smith') Sim.chron('В ' + st.loc.slice(2) + ' появился новый кузнец — ' + Sim.npc(id).first + '. Учится на ходу.', { r: st.region, k: 'econ', hidden: 1 });
      }
    }
  }

  // ---------- государства ----------
  Sim.warBetween = (a, b) => a >= 0 && b >= 0 && a !== b && S().fac[a] && S().fac[a].war[b] != null;
  Sim.atWar = (f) => f >= 0 && S().fac[f] && Object.keys(S().fac[f].war).length > 0;
  Sim.facStrength = function (f) {
    const s = S(), Wd = W();
    let str = 0;
    for (const st of Wd.settlements) {
      const ss = s.sett[st.id];
      if (ss.destroyed || ss.fac !== f) continue;
      const pop = Sim.pop(st.id);
      const men = pop * 0.12 + Sim.jobCount(st.id, 'guard') * 2;
      str += men * (0.45 + Math.min(1, ss.stock.weapons / Math.max(1, men)) * 0.75) * (ss.famine > 5 ? 0.6 : 1);
    }
    return str;
  };
  Sim.facRuler = (f) => { const fd = S().fac[f]; return fd && fd.ruler >= 0 && Sim.isAlive(fd.ruler) ? fd.ruler : null; };
  Sim.succession = function (f, dead, cause) {
    const s = S(), Wd = W();
    const fd = s.fac[f];
    const fac = Wd.factions[f];
    const heirs = Sim.famOf(dead.id).filter((id) => Sim.isAlive(id) && Sim.age(id) >= 16).sort((a, b) => Sim.age(b) - Sim.age(a));
    Sim.chron('Умер(ла) правитель ' + U.gen(fac.short) + ' — ' + dead.first + ' ' + dead.sur + ' (' + cause + ').', { r: Wd.settlements[fac.capital].region, k: 'big' });
    if (heirs.length) {
      const h = heirs[0];
      fd.ruler = h;
      Sim.setJob(h, 'ruler');
      Sim.chron('На трон ' + U.gen(fac.short) + ' взошёл(ла) ' + Sim.npc(h).first + '.', { r: Wd.settlements[fac.capital].region, k: 'big' });
    } else {
      fd.ruler = -1;
      fd.interreg = s.time;
      Sim.chron('У ' + U.gen(fac.short) + ' не осталось наследников. Началась смута.', { r: Wd.settlements[fac.capital].region, k: 'big' });
    }
  };
  Sim.setRuler = function (f, id) { const fd = S().fac[f]; fd.ruler = id; fd.interreg = 0; const cap = W().factions[f].capital; if (Sim.settOf(id) !== cap) Sim.moveNpc(id, cap); Sim.setJob(id, 'ruler'); };
  function factions(day) {
    const s = S(), Wd = W();
    const r = U.rng(Wd.seed, 'fac', day);
    const F = Wd.factions;
    for (let a = 0; a < F.length; a++) {
      const fa = s.fac[a];
      if (!fa.alive) continue;
      // смута
      if (fa.ruler < 0 || !Sim.isAlive(fa.ruler)) {
        if (fa.ruler >= 0 && !Sim.isAlive(fa.ruler)) { fa.ruler = -1; fa.interreg = s.time; }
        if (s.time - (fa.interreg || 0) > DAY * r.int(12, 30)) {
          const cap = F[a].capital;
          const pool = (Sim.settAlive[cap] || []).filter((id) => ['noble', 'guard', 'veteran', 'merchant'].includes(Sim.job(id)) && Sim.age(id) >= 20);
          if (pool.length) { const id = r.pick(pool); Sim.setRuler(a, id); Sim.chron('Смута в ' + U.gen(F[a].short).replace(/а$/, 'е') + ' окончена: власть взял(а) ' + Sim.npc(id).first + ' ' + Sim.npc(id).sur + '. Новая династия.', { r: Wd.settlements[cap].region, k: 'big' }); }
        }
      }
      for (let b = a + 1; b < F.length; b++) {
        const fb = s.fac[b];
        if (!fb.alive) continue;
        let v = fa.rel[b] + (0 - fa.rel[b]) * 0.006 + r.range(-4.7, 4.7);
        if (s.flags.sealBroken) v -= 0.25;
        v = U.clamp(v, -100, 100);
        fa.rel[b] = fb.rel[a] = v;
        const war = fa.war[b] != null;
        if (!war && v < -48 && r.chance(0.08)) {
          fa.war[b] = fb.war[a] = s.time;
          fa.weary = fb.weary = 0;
          Sim.chron(F[a].name + ' и ' + F[b].name + ' начали войну.', { r: Wd.settlements[F[a].capital].region, k: 'war' });
        } else if (war) {
          if ((day - Time.day(fa.war[b])) % 6 === 0 && day !== Time.day(fa.war[b])) battle(a, b, r);
          if ((fa.weary > 6 && r.chance(0.2)) || v > -20) {
            delete fa.war[b]; delete fb.war[a];
            fa.rel[b] = fb.rel[a] = r.int(0, 25);
            Sim.chron(F[a].name + ' и ' + F[b].name + ' заключили мир.', { r: Wd.settlements[F[a].capital].region, k: 'war' });
          }
        }
      }
    }
  }
  function battle(a, b, r) {
    const s = S(), Wd = W(), F = Wd.factions;
    const [att, def] = r.chance(Sim.facStrength(a) / (Sim.facStrength(a) + Sim.facStrength(b) + 1)) ? [a, b] : [b, a];
    // пограничное поселение защитника
    let target = null, bd = 1e9;
    const attS = Wd.settlements.filter((st) => s.sett[st.id].fac === att && !s.sett[st.id].destroyed);
    for (const st of Wd.settlements) {
      const ss = s.sett[st.id];
      if (ss.fac !== def || ss.destroyed) continue;
      for (const o of attS) { const d = Math.abs(o.rx - st.rx) + Math.abs(o.ry - st.ry) + r.next(); if (d < bd) { bd = d; target = st; } }
    }
    if (!target) return;
    const sa = Sim.facStrength(att) * r.range(0.6, 1.4) * 0.35;
    const sd = (Sim.pop(target.id) * 0.3 + Sim.jobCount(target.id, 'guard') * 3 + 4) * r.range(0.6, 1.4) * (target.b.walls ? 1.8 : 1) * (target.type === 'capital' ? 1.6 : 1);
    s.fac[a].weary++; s.fac[b].weary++;
    const kd = Sim.killPop(target.id, sa > sd ? r.range(0.04, 0.1) : r.range(0.01, 0.04), 'погиб(ла) в битве');
    const src = attS.length ? r.pick(attS) : null;
    if (src) Sim.killPop(src.id, sa > sd ? r.range(0.005, 0.02) : r.range(0.02, 0.05), 'погиб(ла) на войне');
    s.sett[target.id].stock.food *= 0.8;
    if (E.Gm && E.Gm.onBattle) E.Gm.onBattle(target.id, att, def);
    if (sa > sd * 1.7) {
      const raze = sa > sd * 3 && r.chance(0.08) && target.type !== 'capital';
      if (raze) { Sim.destroySett(target.id, 'сожжён войсками ' + U.gen(F[att].short)); return; }
      if (target.id === F[def].capital && sa <= sd * 2.2) { Sim.chron('Столица ' + U.gen(F[def].short) + ' выдержала осаду.', { r: target.region, k: 'war' }); return; }
      s.sett[target.id].fac = att;
      Wd.regions[target.region].facNow = att;
      Sim.chron('Войска ' + U.gen(F[att].short) + ' взяли ' + target.nom + '. ' + U.died(kd) + '.', { r: target.region, k: 'war' });
      if (target.id === F[def].capital && sa > sd * 2.2) {
        s.fac[def].alive = 0;
        if (s.fac[def].ruler >= 0 && Sim.isAlive(s.fac[def].ruler) && r.chance(0.7)) Sim.kill(s.fac[def].ruler, 'казнён(а) победителями');
        for (const st of Wd.settlements) if (s.sett[st.id].fac === def) s.sett[st.id].fac = att;
        for (const k in s.fac[def].war) { delete s.fac[k].war[def]; }
        s.fac[def].war = {};
        Sim.chron('Пало государство «' + F[def].name + '». Его земли отошли ' + U.dat(F[att].short) + '.', { r: target.region, k: 'big' });
      }
    } else Sim.chron('У ' + target.gen + ' прошла битва между ' + U.ins(F[att].short) + ' и ' + U.ins(F[def].short) + '. ' + U.died(kd) + '.', { r: target.region, k: 'war', hidden: 1 });
  }
  Sim.facUnrest = function (f) { S().fac[f].weary += 3; };

  // ---------- культы, мор, грибница ----------
  function cults(day) {
    const s = S(), Wd = W();
    const r = U.rng(Wd.seed, 'cult', day);
    for (let i = s.cults.length - 1; i >= 0; i--) {
      const c = s.cults[i];
      if (s.sett[c.sett].destroyed || !Sim.isAlive(c.leader)) { Sim.chron('Культ ' + c.name + ' в ' + Wd.settlements[c.sett].loc.slice(2) + ' распался.', { r: Wd.settlements[c.sett].region, k: 'event' }); s.cults.splice(i, 1); continue; }
      if (r.chance(0.35)) c.members++;
      if (day % 9 === 0 && c.members > 8) { const ids = Sim.settAlive[c.sett]; if (ids.length) { Sim.kill(ids[r.int(0, ids.length - 1)], 'принесён(а) в жертву культом ' + c.name); } }
      if (c.members >= 45 && !c.summoned) {
        c.summoned = 1;
        Sim.chron('Культ ' + c.name + ' провёл ритуал в ' + Wd.settlements[c.sett].loc.slice(2) + '. Что-то пришло.', { r: Wd.settlements[c.sett].region, k: 'big' });
        s.flags['summon_' + c.sett] = s.time;
      }
    }
  }
  function spread(day) {
    const s = S(), Wd = W();
    const r = U.rng(Wd.seed, 'spr', day);
    // мор
    for (const st of Wd.settlements) {
      const ss = s.sett[st.id];
      if (!ss.plague || ss.destroyed) continue;
      if (s.time - ss.plague > DAY * 25 && r.chance(0.12)) { ss.plague = 0; ss.immune = s.time; Sim.chron('Мор в ' + st.loc.slice(2) + ' отступил.', { r: st.region, k: 'event', hidden: 1 }); continue; }
      if (s.time - ss.plague > DAY * 18) continue;
      for (const o of Sim.nb[st.id]) {
        const so = s.sett[o];
        if (so.plague || so.destroyed || (so.immune && s.time - so.immune < YEAR)) continue;
        if (r.chance(0.004)) { so.plague = s.time; Sim.chron('Мор пришёл в ' + Wd.settlements[o].nom + '.', { r: Wd.settlements[o].region, k: 'event' }); }
      }
    }
    // грибница
    if (day % 3 === 0) {
      for (const k of Object.keys(s.infect)) {
        if (Object.keys(s.infect).length >= 10) break;
        const g = Wd.regions[k];
        for (const [x, y] of E.World.nb4(g.x, g.y)) {
          const nb = Wd.regions[y * WS + x];
          if (nb.biome !== 'ocean' && !s.infect[nb.id] && r.chance(0.08)) s.infect[nb.id] = s.time;
        }
      }
      for (const k of Object.keys(s.infect)) { const g = Wd.regions[k]; if (g.settlement >= 0 && !s.sett[g.settlement].destroyed && r.chance(0.5)) Sim.killPop(g.settlement, 0.006, 'пророс(ла) грибницей'); }
    }
  }
  Sim.endPlague = function (sid) { S().sett[sid].plague = 0; Sim.chron('Мор в ' + W().settlements[sid].loc.slice(2) + ' отступил благодаря лекарству.', { r: W().settlements[sid].region, k: 'event' }); };
  Sim.giantStep = function () {
    const Wd = W(), s = S();
    const liv = Wd.regions.filter((g) => g.biome === 'living');
    if (!liv.length) return;
    const g = liv[Math.floor(Math.random() * liv.length)];
    const l = Wd.settlements.filter((st) => !s.sett[st.id].destroyed && Sim.rdist(st.region, g.id) <= 2);
    if (l.length) { const st = l[Math.floor(Math.random() * l.length)]; Sim.killPop(st.id, 0.15, 'раздавлен(а) идущей горой'); Sim.chron('Горы сдвинулись. ' + st.nom + ' засыпало камнями.', { r: st.region, k: 'big' }); }
  };

  // ---------- продвижение времени ----------
  Sim.advance = function (minutes, onHour) {
    const s = S();
    let left = minutes;
    while (left > 0) {
      const toHour = 60 - (s.time % 60);
      const step = Math.min(left, toHour);
      s.time += step;
      left -= step;
      if (s.time % 60 === 0) {
        Sim.hourly();
        if (s.time % DAY === 0) Sim.daily();
        if (onHour && onHour() === false) return minutes - left;
      }
    }
    return minutes;
  };
  // Быстрая перемотка на годы (эпилог)
  Sim.fastForward = function (days) {
    const s = S();
    for (let d = 0; d < days; d++) {
      s.time = (Time.day(s.time) + 1) * DAY;
      for (let i = s.evPlan.length - 1; i >= 0; i--) if (s.evPlan[i].t <= s.time) startEvent(s.evPlan.splice(i, 1)[0]);
      for (let i = s.ev.length - 1; i >= 0; i--) if (s.ev[i].t1 <= s.time) endEvent(s.ev.splice(i, 1)[0]);
      if (s.dragon && s.dragon.alive && s.time >= s.dragon.next) dragonRaid();
      Sim.daily(true);
    }
  };

  // ---------- слухи ----------
  Sim.rumorsFor = function (npcId) {
    const s = S(), Wd = W();
    const rid = Sim.regionOf(npcId);
    const out = [];
    for (let i = s.chron.length - 1; i >= 0 && out.length < 12; i--) {
      const e = s.chron[i];
      if (e.h) continue;
      const age = (s.time - e.t) / DAY;
      const big = e.k === 'big' || e.k === 'war';
      if (age > (big ? 200 : 45)) break;
      const dist = e.r >= 0 && rid >= 0 ? Sim.rdist(e.r, rid) : 3;
      if (dist > (big ? 30 : 7)) continue;
      if (age < dist * 0.6) continue;
      out.push(e);
    }
    return out;
  };
  Sim.prophecy = function () {
    const s = S(), Wd = W();
    const P = E.G.P;
    const pr = P && E.G.map && E.G.map.region ? E.G.map.region : Wd.regions[Wd.start];
    const p = s.evPlan.filter((e) => e.t > s.time).sort((a, b) => a.t - b.t)[0];
    if (!p) return 'Туман. Ничего не вижу. Или ничего не будет.';
    const days = Math.max(1, Math.round((p.t - s.time) / DAY));
    const when = days <= 1 ? 'Завтра' : days < 5 ? 'Скоро, через ' + days + ' ' + U.plural(days, 'день', 'дня', 'дней') : 'Через ' + days + ' ' + U.plural(days, 'день', 'дня', 'дней');
    const where = p.r != null ? ' — ' + U.dirWord(Wd.regions[p.r].x - pr.x, Wd.regions[p.r].y - pr.y) : '';
    const what = { star: 'упадёт звезда', blacksnow: 'пойдёт чёрный снег', bloodmoon: 'луна нальётся кровью', shroom: 'земля прорастёт грибами', nosun: 'солнце не взойдёт', island: 'из моря поднимется остров', ocean: 'проснётся море', dragon: 'дракон откроет глаза', hunt: 'боги выйдут на охоту', madness: 'звери сойдут с ума', spirits: 'мёртвые выйдут на дороги', harvest: 'земля родит, как никогда', ashrain: 'с неба пойдёт пепел', plague: 'придёт мор', eclipse: 'солнце почернеет', quake: 'земля задрожит', cult: 'люди наденут маски', fair: 'в полночь откроется ярмарка мёртвых', locust: 'прилетит саранча', comet: 'по небу проползёт хвостатая звезда', flood: 'вода выйдет из берегов' }[p.id] || 'что-то случится';
    return when + where + ' ' + what + '.';
  };

  // Вариант карты региона сейчас: '' | 'n' | 'c' | 'i'; null — недоступен
  Sim.variant = function (rid) {
    const Wd = W(), s = S();
    const g = Wd.regions[rid];
    if (g.exist === 'night') return Time.night(s.time) ? 'n' : null;
    if (g.exist === 'cyclic') { const d = Time.day(s.time); return ((d + g.cyc.off) % g.cyc.period) < g.cyc.len ? 'c' : ''; }
    for (const t of s.temps) if (t.kind === 'island' && t.r === rid) return 'i';
    return '';
  };
  Sim.cycActive = function (rid) { return Sim.variant(rid) === 'c'; };
})(window.EOF);
