'use strict';
// Игровой цикл: загрузка карт, переходы, ходы, часы жизни персонажа.
(function (E) {
  const U = E.U, D = E.D, T = E.T, TL = E.TL, C = E.C, Time = E.Time;
  const G = E.G, Gm = E.Gm, Ent = E.Ent, MG = E.MapGen;
  const MW = C.MW, MH = C.MH, WS = C.WS;
  G.cache = new Map();

  // ---------- новая игра ----------
  Gm.newWorld = function (seed) {
    G.W = E.World.generate(seed);
    G.S = E.Sim.init(G.W);
    E.Sim.prepare();
    G.cache.clear();
    G.log = [];
    G.P = null;
  };
  Gm.startLife = function (name, sex, reborn) {
    const W = G.W;
    G.turn = 0;
    let start = W.regions[W.start];
    if (reborn) {
      // новая жизнь — в случайной деревне
      const l = W.settlements.filter((s) => ['village', 'hamlet'].includes(s.type) && !G.S.sett[s.id].destroyed && W.regions[s.region].exist === 'always');
      if (l.length) start = W.regions[l[Math.floor(Math.random() * l.length)].region];
      E.Sim.fastForward(30 + Math.floor(Math.random() * 300));
      G.S.time = Time.day(G.S.time) * 1440 + 8 * 60;
    }
    Gm.newPlayer(name, sex);
    G.log = [];
    G.map = null;
    G.cache.clear();
    G.P.startRegion = start.id;
    G.P.startDay = Time.day(G.S.time);
    const key = 'o:' + start.x + ':' + start.y;
    Gm.loadMap(key, -1, -1, 'start');
    // у края деревни, у костра
    const m = G.map;
    let p = null;
    if (m.settRect) {
      const sr = m.settRect;
      const gates = (m.spots.gate || []).slice().sort((a, b) => a.x - b.x);
      const g0 = gates[0] || { x: sr.x, y: sr.y + (sr.h >> 1) };
      p = Ent.freeNear(Math.max(1, g0.x - 3), g0.y) || Ent.freeNear(sr.x - 2, sr.y + (sr.h >> 1));
    }
    p = p || MG.findWalkNear(m, MW >> 1, MH >> 1);
    G.P.x = p.x; G.P.y = p.y;
    const fire = Ent.freeNear(p.x + 1, p.y);
    if (fire) Gm.setTile(fire.x, fire.y, T.CAMPFIRE);
    Gm.computeFov();
    Gm.msg('Ты просыпаешься у дороги. Костёр почти догорел.', '#e0d0b0');
    Gm.msg('Никто тебя не ждёт.', '#a0a0a0');
  };

  // ---------- карты ----------
  G.mapExplored = () => G.map.ex;
  function getDyn(key) { return G.S.maps[key]; }
  Gm.loadMap = function (key, px, py, how) {
    const P = G.P;
    if (G.map) Gm.leaveMap();
    let m = G.cache.get(key);
    if (!m) {
      m = MG.build(key);
      let dyn = getDyn(key);
      if (dyn) {
        for (const k in dyn.t) m.tiles[k] = dyn.t[k];
        m.items = dyn.it;
        m.chests = dyn.ch;
        for (const k in dyn.f) { if (dyn.f[k]) m.feat[k] = dyn.f[k]; else delete m.feat[k]; }
        if (typeof dyn.ex === 'string') dyn.ex = U.strToBits(dyn.ex, m.w * m.h);
        if (!dyn.ex) dyn.ex = new Uint8Array(m.w * m.h);
      } else {
        dyn = { t: {}, it: m.items, ch: m.chests, f: {}, ex: new Uint8Array(m.w * m.h), v: 0, tmp: {} };
        G.S.maps[key] = dyn;
      }
      dyn.tmp = dyn.tmp || {};
      m.dyn = dyn;
      m.ex = dyn.ex;
      G.cache.set(key, m);
      if (G.cache.size > 10) { const first = G.cache.keys().next().value; if (first !== key) G.cache.delete(first); }
    }
    m.ents = [];
    m.occ = new Map();
    G.map = m;
    G.vis = new Uint8Array(m.w * m.h);
    P.mapKey = key;
    // размещение игрока
    if (px < 0 || py < 0) { const e = m.entry || m.settCenter || { x: MW >> 1, y: MH >> 1 }; const p = MG.findWalkNear(m, e.x, e.y); px = p.x; py = p.y; }
    P.x = px; P.y = py;
    injectTemps(m);
    dynamicTiles(m);
    const since = G.S.time - (m.dyn.v || -1e9);
    Ent.populate();
    for (const pl of m.npcsPlaced) if (Gm.nalive(pl.id) && (!m.dimName || m.dimName === 'moon' || m.dimName === 'spirit' || m.dimName === 'sea')) { const n = Gm.npc(pl.id); if (n.special === 'forestchild' && Ent.place(pl.id, Gm.hour()) === 'gone') continue; Gm.addEnt(Ent.npc(pl.id, pl.x, pl.y)); }
    if (m.dimName === 'spirit') spawnGhosts(m);
    spawnLairs(m);
    spawnMonsters(m, since);
    // спутники
    for (const pet of P.pets) Gm.spawnAlly(pet.tpl, 999999, P.level);
    for (const a of (G.carryAllies || [])) { a.x = P.x; a.y = P.y; Gm.addEnt(a); }
    G.carryAllies = [];
    m.dyn.v = G.S.time;
    // учёт
    if (m.kind === 'over' && m.rid != null) {
      if (!P.known.regions[m.rid]) {
        P.known.regions[m.rid] = G.S.time;
        Gm.cnt('regions');
        Gm.gain('region_new');
        if (P.c.regions > 1) Gm.xp(10 + m.region.danger * 3);
        if (m.region.features.includes('ruins')) Gm.cnt('ruins_visited');
      }
      if (Time.day(G.S.time) === P.startDay && m.rid !== P.startRegion) P.flags.left_start_first_day = 1;
    }
    if (m.dim) { P.dims = P.dims || {}; P.dims[m.dimName] = 1; }
    if (m.kind === 'dun' && m.dtype === 'abyss') P.c.abyss_depth = Math.max(P.c.abyss_depth || 0, m.depth);
    Ent.computeDmap();
    Gm.computeFov();
    Gm.fire('enter', { map: m, how });
    Gm.storyHook('enter', { map: m });
    if (how !== 'start' && how !== 'load') Gm.describeArrival(m, how);
  };
  Gm.leaveMap = function () {
    const m = G.map;
    if (!m) return;
    // однократные боссы уходят навсегда
    for (const e of m.ents) if (e.boss) { const b = G.W.bossById[e.boss]; if (b && b.sp.k === 'once') (G.S.boss[e.boss] = G.S.boss[e.boss] || {}).gone = 1; }
    // союзники идут следом
    G.carryAllies = m.ents.filter((e) => e.ally && !G.P.pets.some((p) => p.tpl === e.tpl && e.until > 1e10) && e.until > G.S.time);
    m.dyn.v = G.S.time;
  };
  Gm.describeArrival = function (m, how) {
    if (m.kind === 'over' && m.region) {
      const g = m.region;
      let s = (m.nightland ? (g.nightName || 'Ночные земли') : g.exist === 'cyclic' && Sim_variant(g.id) === 'c' ? (g.cycName || g.name) : g.name);
      if (m.sett >= 0) { const st = G.W.settlements[m.sett]; s += ' — ' + (G.S.sett[m.sett].destroyed ? 'руины. Здесь было ' + st.nom : st.nom); }
      Gm.msg(s + '.', '#d8c8a0');
      if (G.S.infect[g.id]) Gm.msg('Здесь всё поросло фиолетовыми грибами.', '#c080e0');
    } else if (m.kind === 'dun') Gm.msg(m.depth === 1 ? 'Ты спускаешься вниз. Темно и сыро.' : 'Глубже. Ещё темнее.', '#a0a0a0');
    else if (m.dim && how !== 'walk') Gm.msg('Ты здесь: ' + (D.dims[m.dimName] ? D.dims[m.dimName].n : '...') + '.', '#c0b0ff');
  };
  const Sim_variant = (rid) => E.Sim.variant(rid);

  function injectTemps(m) {
    if (m.kind !== 'over' || m.rid == null) return;
    for (const t of G.S.temps) {
      if (t.r !== m.rid || m.dyn.tmp[t.id]) continue;
      const r = U.rng(t.id);
      if (t.kind === 'star') {
        let p = null;
        for (let i = 0; i < 200 && !p; i++) { const x = r.int(6, MW - 7), y = r.int(4, MH - 5); if (TL[m.tiles[y * MW + x]].walk && !TL[m.tiles[y * MW + x]].water && !(m.settRect && x > m.settRect.x - 3 && x < m.settRect.x + m.settRect.w + 3 && y > m.settRect.y - 3 && y < m.settRect.y + m.settRect.h + 3)) p = { x, y }; }
        if (!p) continue;
        for (let y = p.y - 3; y <= p.y + 3; y++) for (let x = p.x - 5; x <= p.x + 5; x++) { if (x < 0 || y < 0 || x >= MW || y >= MH) continue; const d = Math.hypot((x - p.x) / 1.7, y - p.y); if (d < 2) Gm.setTile(x, y, T.CRATER, m); else if (d < 3.2) Gm.setTile(x, y, T.ASH, m); }
        m.items.push({ x: p.x, y: p.y, it: E.Items.make('star_shard') });
        if (r.chance(0.6)) m.items.push({ x: p.x + 1, y: p.y, it: E.Items.make('star_metal') });
        if (r.chance(0.4)) m.items.push({ x: p.x - 1, y: p.y, it: E.Items.make('star_jelly') });
        m.dyn.tmp[t.id] = { x: p.x, y: p.y };
        if (t.boss) m.lairs.push({ b: G.W.bossById.b_star_fallen.i, x: p.x + 2, y: p.y + 1, temp: t.id });
        G.P.c.star_shards = (G.P.c.star_shards || 0);
      } else if (t.kind === 'fair') {
        const p = MG.findWalkNear(m, r.int(10, MW - 10), r.int(6, MH - 6));
        m.dyn.tmp[t.id] = { x: p.x, y: p.y };
      }
    }
    // ярмарка призраков: торговцы есть, пока она открыта
    for (const t of G.S.temps) if (t.kind === 'fair' && t.r === m.rid && m.dyn.tmp[t.id]) {
      const p = m.dyn.tmp[t.id];
      for (let i = 0; i < 3; i++) {
        const e = Ent.npc(G.W.special.ferryman, p.x + i * 2 - 2, p.y);
        e.ch = '☺'; e.c = '#a0e0d0'; e.n = ['Бледный торговец', 'Торговка без тени', 'Старик с фонарём'][i]; e.ghostShop = i; e.npc = null; e.ai = 'still'; e.immortal = 1; e.kind = 'npc'; e.ghost = 1;
        Gm.addEnt(e);
      }
    }
  }
  // Лунная лестница, ночные торговцы, следы событий
  function dynamicTiles(m) {
    if (m.kind === 'over' && m.rid === G.W.special.moonPeak && m.peak) {
      const on = Gm.fullMoon() && Gm.night();
      const i = m.peak.y * MW + m.peak.x;
      if (on) { m.tiles[i] = T.UP; m.feat[i] = { k: 'link', to: 'dim:moon:1:1', name: 'лунная лестница', moon: 1 }; }
      else if (m.feat[i] && m.feat[i].moon) { m.tiles[i] = T.PEAK === m.tiles[i] ? T.PEAK : T.ROCKFLOOR; delete m.feat[i]; }
    }
  }
  function spawnGhosts(m) {
    const dl = G.S.deadList;
    const r = U.rng(m.key, Gm.day());
    for (let i = 0; i < 6 && dl.length; i++) {
      const id = dl[r.int(0, dl.length - 1)];
      const p = MG.findWalkNear(m, r.int(5, MW - 6), r.int(4, MH - 5));
      Gm.addEnt(Ent.ghost(id, p.x, p.y));
    }
  }
  function bossAllowed(b) {
    const st = G.S.boss[b.id] || {};
    if (st.dead || st.gone) return false;
    const sp = b.sp;
    // Тот, кто ждал у дороги, приходит лишь к тем, кто не спал в первую ночь — и только ночью
    if (b.id === 'b_roadside') return Gm.night() && !!G.P.flags.awake_first_night && !G.P.flags.slept_first_night;
    switch (sp.k) {
      case 'always': return true;
      case 'night': return Gm.night();
      case 'once': return !st.seen;
      case 'after': return !!(G.S.boss[sp.b] && G.S.boss[sp.b].dead);
      case 'days': return Gm.day() >= sp.d;
      case 'never': return !G.P.flags[sp.f] && !(G.P.lineageFlags && G.P.lineageFlags[sp.f]);
      case 'event': return !!E.Sim.event(sp.e);
      case 'moon': return Gm.fullMoon() && Gm.night();
      case 'weather': return Gm.weather() === sp.w;
    }
    return false;
  }
  Gm.bossAllowed = bossAllowed;
  function spawnLairs(m) {
    for (const l of m.lairs) {
      const b = G.W.bosses[l.b];
      if (!b || !bossAllowed(b)) continue;
      if (b.id === 'b_dragon') continue;
      Gm.spawnBossQuiet(b.id, l.x, l.y);
    }
    // дракон в своём логове
    if (G.S.dragon && G.S.dragon.alive && m.kind === 'over' && m.rid === G.S.dragon.r) { const p = MG.findWalkNear(m, MW >> 1, MH >> 1); Gm.spawnBossQuiet('b_dragon', p.x, p.y); }
    // призванное культом
    if (m.sett >= 0 && G.S.flags['summon_' + m.sett] && !G.S.flags['summonKilled_' + m.sett]) {
      const gb = G.W.bosses.filter((b) => b.gen);
      const b = gb[(m.sett * 7) % gb.length];
      if (b && !(G.S.boss[b.id] && G.S.boss[b.id].dead)) { const p = Ent.freeNear(m.settCenter.x + 3, m.settCenter.y + 2); if (p) Gm.spawnBossQuiet(b.id, p.x, p.y); }
    }
  }
  Gm.spawnBossQuiet = function (id, x, y) {
    if (G.map.ents.some((e) => e.boss === id)) return;
    const b = G.W.bossById[id];
    const st = G.S.boss[id] = G.S.boss[id] || {};
    if (st.dead) return;
    st.seen = st.seen || G.S.time;
    Gm.addEnt(Ent.boss(b.i, x, y));
  };
  Gm.monFlags = function (m) {
    const g = m.region;
    const f = { night: Gm.night(), lvl: m.spawn ? m.spawn.danger : 1 };
    if (Gm.event('blacksnow') && (!g || g.t < 0.65)) f.blacksnow = 1;
    if (Gm.event('bloodmoon') && f.night) f.bloodmoon = 1;
    if (g && G.S.infect[g.id]) f.shroom = 1;
    if (Gm.event('madness')) f.madness = 1;
    if (Gm.weather() === 'ashrain') f.ashrain = 1;
    if (Gm.event('ocean') && g && ['coast', 'ocean'].includes(m.biome)) f.ocean = 1;
    if (Gm.event('hunt') && G.P.level >= 10) f.hunt = 1;
    if (m.sett >= 0) f.town = 1;
    if (g && g.fac >= 0 && Gm.atWar(g.fac)) f.war = 1;
    if (m.sett >= 0 && G.S.cults.some((c) => c.sett === m.sett)) f.cult = 1;
    return f;
  };
  function monTable(m, f) {
    let biome = m.spawn ? m.spawn.biome : m.biome;
    if (m.kind === 'dun') biome = m.spawn.abyss ? 'abyss' : m.dtype === 'flesh' ? 'flesh' : 'dungeon';
    if (m.kind === 'dim') biome = m.dimName === 'sea' ? 'undersea' : m.dimName;
    if (m.nightland) biome = 'spirit';
    return D.monsFor(biome, f);
  }
  function spawnMonsters(m, since) {
    const P = G.P;
    const f = Gm.monFlags(m);
    if (m.sett >= 0 && !G.S.sett[m.sett].destroyed && m.dimName !== 'sea') {
      // в поселении — разве что крысы и культисты ночью
      if (Math.random() < 0.3) for (let i = 0; i < 2; i++) placeMon(m, 'rat', m.spawn.danger);
      if (f.cult && f.night) for (let i = 0; i < 3; i++) placeMon(m, 'cultist', m.spawn.danger + 1);
      if (f.blacksnow && f.night) for (let i = 0; i < 2; i++) placeMon(m, 'blackdead', m.spawn.danger + 1);
      return;
    }
    const tbl = monTable(m, f);
    if (!tbl.length) return;
    const dg = m.spawn ? m.spawn.danger : 1;
    let n = m.kind === 'dun' ? 6 + Math.min(10, m.depth) : m.kind === 'dim' ? 7 : 3 + Math.min(5, Math.floor(dg / 4)) + (f.night ? 3 : 0);
    if (m.biome === 'ocean' && m.kind === 'over') n = f.ocean ? 4 : 1;
    if (since < 360) n = Math.floor(n / 3);
    if (G.S.flags.sealBroken) n += 2;
    const r = U.rng(m.key, G.S.time);
    for (let i = 0; i < n; i++) {
      const tid = r.weighted(tbl);
      let lvl = dg + (f.night && m.outdoor ? 1 : 0) + r.int(-1, 1) + (G.S.flags.sealBroken ? 2 : 0);
      const k = D.mons[tid].ai === 'pack' ? (dg <= 2 ? r.int(1, 2) : r.int(2, 3)) : 1;
      for (let j = 0; j < k; j++) placeMon(m, tid, lvl);
    }
    // лагеря разбойников
    for (const c of m.camps) {
      for (let i = 0; i < r.int(2, 4); i++) { const e = Ent.mon(r.chance(0.3) ? 'archer' : 'bandit', dg + 1, c.x + r.int(-3, 3), c.y + r.int(-2, 2)); Gm.addEnt(e); }
    }
    // солдаты на войне
    if (f.war && m.kind === 'over' && r.chance(0.4)) for (let i = 0; i < r.int(2, 4); i++) placeMon(m, r.chance(0.7) ? 'soldier' : 'deserter', dg + 2);
  }
  function placeMon(m, tid, lvl) {
    const P = G.P;
    for (let t = 0; t < 40; t++) {
      const x = Math.floor(Math.random() * m.w), y = Math.floor(Math.random() * m.h);
      if (U.dist(x, y, P.x, P.y) < 10) continue;
      const tt = TL[m.tiles[y * m.w + x]];
      const water = D.mons[tid].tags.includes('water');
      if (!tt.walk && !(water && tt.water === 2)) continue;
      if (tt.fall || tt.lava || tt.indoor) continue;
      if (m.occ.has(y * m.w + x)) continue;
      const e = Ent.mon(tid, lvl, x, y);
      return Gm.addEnt(e);
    }
    return null;
  }
  Gm.placeMon = placeMon;

  Gm.setTile = function (x, y, t, mm) {
    const m = mm || G.map;
    const i = y * m.w + x;
    m.tiles[i] = t;
    m.dyn.t[i] = t;
  };
  Gm.tileAt = (x, y) => G.map.tiles[y * G.map.w + x];
  Gm.setFeature = function (x, y, f) { const m = G.map; const i = y * m.w + x; if (f) m.feat[i] = f; else delete m.feat[i]; m.dyn.f[i] = f || null; };
  Gm.dropItem = function (x, y, it) { if (it) G.map.items.push({ x, y, it }); };
  Gm.itemsAt = (x, y) => G.map.items.filter((o) => o.x === x && o.y === y);
  Gm.nearWater = function (x, y, r) { const m = G.map; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue; if (TL[m.tiles[yy * m.w + xx]].water || m.tiles[yy * m.w + xx] === T.WELL) return true; } return false; };
  Gm.nearTile = function (t, r) { const m = G.map, P = G.P; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = P.x + dx, yy = P.y + dy; if (xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && m.tiles[yy * m.w + xx] === t) return true; } return false; };
  Gm.nearFire = function (r) { const m = G.map, P = G.P; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = P.x + dx, yy = P.y + dy; if (xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && TL[m.tiles[yy * m.w + xx]].fire) return true; } return false; };
  Gm.nearestTemp = function () { const r = Gm.region(); if (!r) return null; let best = null, bd = 1e9; for (const t of G.S.temps) { const g = G.W.regions[t.r]; const d = Math.abs(g.x - r.x) + Math.abs(g.y - r.y); if (d < bd) { bd = d; best = g; } } return best; };

  Gm.teleport = function (key, x, y) { Gm.loadMap(key, x, y, 'tp'); };
  Gm.returnFromDim = function (mirror) {
    const P = G.P;
    const r = P.ret;
    P.ret = null;
    if (r && r.key) Gm.loadMap(r.key, r.x, r.y, 'tp');
    else { const g = G.W.regions[P.startRegion || G.W.start]; Gm.loadMap('o:' + g.x + ':' + g.y, -1, -1, 'tp'); }
  };

  // ---------- поле зрения ----------
  Gm.fovRadius = function () {
    const P = G.P, m = G.map;
    let r;
    if (m.outdoor && !TL[m.tiles[P.y * m.w + P.x]].indoor) {
      const L = Time.light(G.S.time);
      r = Math.round(5 + L * 22);
      const w = D.weathers[Gm.weather()];
      if (w) r = Math.max(3, Math.round(r * (L > 0.5 ? w.fov : Math.max(0.6, w.fov))));
      if (Gm.fullMoon() && L < 0.5) r += 2;
    } else r = m.dark ? 3 : 8;
    if (m.indoorLit) r = 8;
    let light = 0;
    if (P.light > 0) light = 4;
    for (const s in P.eq) { const it = P.eq[s]; if (it && it.light && s === 'trinket') light = Math.max(light, it.light > 10 ? 4 : it.light); if (it && it.hx) for (const h of it.hx) if (h.k === 'light') light += h.v; }
    for (const it of P.inv) if (it.lit && it.light) light = Math.max(light, it.light);
    if (P.eq.trinket && P.eq.trinket.b === 'a_voidlantern') light += m.ents.some((e) => e.npc != null && U.dist(e.x, e.y, P.x, P.y) < 6) ? 1 : 6;
    if (P.inv.some((i) => i.b === 'star_shard')) light += 1;
    light += Gm.fxFlag('light') || 0;
    if (Gm.fxFlag('nightEye') && Time.light(G.S.time) < 0.6) r = Math.max(r, 12);
    if (Gm.fxFlag('dayBlind') && Time.light(G.S.time) > 0.5 && m.outdoor) r = Math.min(r, 4);
    if (Gm.hasFx('blind')) r = Math.min(r, 2);
    r += light;
    if (G.map.underwater && !(Gm.fxFlag('gills'))) r = Math.min(r, 4);
    return Math.max(1, Math.min(r, 40));
  };
  Gm.computeFov = function () {
    const m = G.map, P = G.P;
    const xray = P.eq.trinket && P.eq.trinket.b === 'a_blindeye' ? 4 : 0;
    E.FOV.compute(m, P.x, P.y, Gm.fovRadius(), G.vis, xray);
    const ex = m.ex;
    for (let i = 0; i < G.vis.length; i++) if (G.vis[i]) ex[i] = 1;
  };

  // ---------- ход ----------
  G.turn = 0;
  Gm.endTurn = function (cost) {
    const P = G.P;
    if (P.dead || P.ended) return;
    cost = cost == null ? 1 : cost;
    P.timeAcc += cost * (10 / (P.st.speed || 10));
    let guard = 0;
    while (P.timeAcc >= 1 && guard++ < 40) {
      P.timeAcc -= 1;
      Gm.tick();
      if (P.dead || P.ended || G.mapChanged) break;
    }
    G.mapChanged = false;
    Gm.calc();
    Ent.computeDmap();
    Gm.computeFov();
    if (G.autoSaveTurn == null || G.turn - G.autoSaveTurn > 150) { G.autoSaveTurn = G.turn; E.Save && E.Save.save(); }
  };
  Gm.tick = function () {
    const P = G.P, m = G.map;
    G.turn++;
    P.turn++;
    const prevKey = m.key;
    // в реальном времени ход мира короче: игровые минуты копятся дробно (js/game/realtime.js)
    let adv = C.TURN, k = 1;
    if (E.RT && E.RT.ticking) { G.minAcc = (G.minAcc || 0) + E.RT.MIN; adv = Math.floor(G.minAcc); G.minAcc -= adv; k = E.RT.MIN / C.TURN; }
    if (adv > 0) E.Sim.advance(adv, () => { Gm.playerHour(); return !P.dead && !P.ended && G.map.key === prevKey; });
    if (P.dead || P.ended || G.map.key !== prevKey) { G.mapChanged = true; return; }
    // перезарядки
    for (const k in P.cd) if (P.cd[k] > 0) P.cd[k]--;
    if (G.frozen > 0) G.frozen--;
    // эффекты
    for (let i = P.fx.length - 1; i >= 0; i--) {
      const f = P.fx[i];
      const d = D.effects[f.id];
      if (d && d.dot) {
        // урон от яда и огня — за игровое время, а не за число ходов
        P.dotAcc = (P.dotAcc || 0) + (d.dot + Math.floor(P.mhp * 0.01)) * k;
        const dmg = Math.floor(P.dotAcc);
        if (dmg > 0) { P.dotAcc -= dmg; Gm.hurtPlayer(dmg, f.id === 'poison' ? 'poison' : f.id === 'bleed' ? 'bleed' : 'fire'); if (P.dead) return; }
      }
      if (f.until <= G.S.time) { P.fx.splice(i, 1); if (d && (d.kind === 'bless' || d.kind === 'curse')) Gm.msg('Отпускает: ' + d.n + '.', '#909090'); }
    }
    // регенерация
    if (P.hunger > 0 && !Gm.fxFlag('noRegen')) {
      let rg = P.mhp / 420 * (1 + (Gm.fxFlag('regen') || 0));
      if (Gm.hasFx('spores') && ['swamp', 'forest', 'ancient'].includes(m.biome)) rg *= 3;
      if (Gm.hasFx('forest') && ['forest', 'ancient'].includes(m.biome)) rg *= 3;
      P.hpAcc = (P.hpAcc || 0) + rg;
      if (P.hpAcc >= 1) { const k = Math.floor(P.hpAcc); P.hp = Math.min(P.mhp, P.hp + k); P.hpAcc -= k; }
    }
    P.mpAcc = (P.mpAcc || 0) + P.mmp / 300;
    if (P.mpAcc >= 1) { const k = Math.floor(P.mpAcc); P.mp = Math.min(P.mmp, P.mp + k); P.mpAcc -= k; }
    if (P.light > 0) { P.light -= C.TURN * k; if (P.light <= 0) { P.light = 0; Gm.msg('Факел догорел.', '#a08060'); } }
    // под водой без жабр
    if (m.underwater && !Gm.fxFlag('gills') && (k >= 1 || G.turn % Math.round(1 / k) === 0)) { Gm.hurtPlayer(Math.max(1, Math.round(P.mhp * 0.04)), 'drown'); if (P.dead) return; if (G.turn % 5 === 0) Gm.msg('Нечем дышать!', '#80a0ff'); }
    if (m.underwater) Gm.cnt('under_turns');
    if (m.dimName === 'void') { Gm.cnt('void_turns'); Gm.gain('void'); }
    if (m.kind === 'dun' && m.dtype === 'abyss') Gm.gain('abyss');
    // существа
    const ents = m.ents.slice();
    for (const e of ents) {
      if (e.dead) continue;
      e.en += e.sp;
      let k = 0;
      while (e.en >= 10 && k++ < 3) {
        e.en -= 10;
        if (e.feared && G.turn < e.feared) { Ent.stepToward(e, true); continue; }
        Ent.act(e);
        if (P.dead || G.map !== m) return;
      }
    }
    // блуждающие существа приходят
    if (G.turn % Math.round(60 / k) === 0 && m.sett < 0 && Math.random() < (Gm.night() ? 0.5 : 0.25) && m.ents.filter((e) => e.kind === 'mon').length < 14) {
      const tbl = monTable(m, Gm.monFlags(m));
      if (tbl.length) { const r = U.rng(G.turn, m.key); placeMon(m, r.weighted(tbl), (m.spawn ? m.spawn.danger : 1) + (Gm.night() ? 1 : 0)); }
    }
    Gm.fire('turn', {});
  };

  // Часовые изменения тела и мира вокруг игрока
  Gm.playerHour = function () {
    const P = G.P, m = G.map;
    const h = Gm.hour();
    // голод
    let hungerRate = 4 * (Gm.hasFx('dragon') ? 1.5 : 1) * (P.eq.hand && P.eq.hand.b === 'a_dragonbone' ? 2 : 1);
    for (const s in P.eq) { const it = P.eq[s]; if (it && it.hx) for (const x of it.hx) if (x.k === 'hunger') hungerRate *= x.v; }
    const hBefore = P.hunger;
    P.hunger = Math.max(0, P.hunger - hungerRate);
    if (hBefore >= 25 && P.hunger < 25) Gm.msg('Ты проголодал[ся|ась].', '#e0b060');
    if (P.hunger <= 0) { Gm.hurtPlayer(Math.max(1, Math.round(P.mhp * 0.025)), 'starve'); if (P.dead) return; if (h % 3 === 0) Gm.msg('Ты голодаешь.', '#e0a060'); Gm.gain('hunger_hour'); }
    if (P.hunger < 25) P.hungryHours = (P.hungryHours || 0) + 1;
    // холод
    const cold = Gm.coldLevel();
    if (cold > 0) {
      let warm = 0;
      for (const s in P.eq) if (P.eq[s] && P.eq[s].warm) warm += P.eq[s].warm;
      warm += Gm.fxFlag('warm') || 0;
      if (Gm.nearFire(3)) warm += 3;
      if (P.eq.trinket && P.eq.trinket.b === 'a_frostheart') warm += 9;
      if (warm < cold) { Gm.hurtPlayer(Math.max(1, Math.round(P.mhp * 0.02 * (cold - warm))), 'cold'); if (P.dead) return; if (!Gm.hasFx('cold')) Gm.fx('cold', 120); if (h % 2 === 0) Gm.msg('Холод пробирает до костей.', '#a0c0ff'); }
    }
    // мелочи и счётчики
    if (Gm.weather() === 'storm' && Gm.outdoors()) { Gm.cnt('storms', 30); Gm.gain('storm', 30); }
    if (Gm.night() && Gm.outdoors() && h === 0 && Gm.fullMoon()) { Gm.cnt('fullmoons'); Gm.gain('moon'); }
    if (h === 0 && Gm.outdoors() && m.kind === 'over') { Gm.cnt('nights_out'); if (m.biome === 'ice') Gm.cnt('nights_ice'); if (m.biome === 'ancient') Gm.cnt('nights_ancient'); }
    if (Gm.event('harvest') && h === 12) Gm.cnt('harvest_days');
    if (P.eq.head && P.eq.head.b === 'mask' && h === 12) Gm.cnt('mask_days');
    for (const it of P.inv) {
      if (it.art) { it.held = (it.held || 0) + 1; Gm.cnt('art_hours'); }
      const ah = E.Arts[it.b];
      if (ah && ah.hour && (Object.values(P.eq).includes(it))) ah.hour(P, it);
    }
    if (P.inv.some((i) => i.b === 'a_memring') && h === 4) { const keys = Object.keys(G.S.maps); if (keys.length > 1) { const k = keys[Math.floor(Math.random() * keys.length)]; if (k !== m.key) { G.S.maps[k].ex = new Uint8Array(MW * MH); Gm.cnt('forgot'); } } }
    if (Gm.fxFlag('forget') && h === 4) { const keys = Object.keys(G.S.maps); const k = keys[Math.floor(Math.random() * keys.length)]; if (k && k !== m.key) G.S.maps[k].ex = new Uint8Array(MW * MH); }
    // молчание
    P.silentHours = (P.silentHours || 0) + 1;
    if (P.silentHours >= 24 && h === 0) { Gm.cnt('silent_days'); Gm.gain('silent', 24); }
    if (h === 0) Gm.dayChange();
    if (Gm.outdoors() && !Gm.event('nosun')) {
      if (h === 20) Gm.msg(['Темнеет.', 'Солнце садится. Тени становятся длиннее.', 'Наступают сумерки.'][Gm.day() % 3], '#8090c0');
      if (h === 6) Gm.msg(['Светает.', 'Над краем земли поднимается солнце.', 'Утро. Где-то кричит птица.'][Gm.day() % 3], '#e0d0a0');
    }
    // эмоции
    if (P.hp < P.mhp * 0.2 && m.ents.some((e) => e.hostile && U.dist(e.x, e.y, P.x, P.y) < 3) && !P.rageHour) { P.rageHour = 1; Gm.cnt('rage'); Gm.emotion('rage'); }
    if (P.hp > P.mhp * 0.6) P.rageHour = 0;
    // жители меняют дела
    Ent.hourly();
    dynamicTiles(m);
    // ночные земли исчезают на рассвете
    if (m.nightland && !Gm.night()) { Gm.msg('Туман рассеивается — и вместе с ним уходит земля под ногами. Ты стоишь там, откуда пришёл[|а].', '#a0b0ff'); Gm.expel(); return; }
    if (m.kind === 'over' && m.rid != null && m.key.endsWith(':c') && E.Sim.variant(m.rid) !== 'c') { Gm.msg('Остров тихо уходит под воду. Туман смыкается.', '#a0b0ff'); Gm.expel(); return; }
    if (m.kind === 'over' && m.rid != null && m.key.endsWith(':i') && E.Sim.variant(m.rid) !== 'i') { Gm.msg('Остров погружается в море.', '#a0b0ff'); Gm.expel(); return; }
    // события вокруг
    Gm.eventHour();
    Gm.fire('hour', {});
    Gm.storyHook('hour', {});
    if (h % 6 === 0) Gm.checkClasses();
    if (Gm.age() >= (P.deathAge || (P.deathAge = 72 + Math.floor(Math.random() * 25)))) { Gm.die('old'); return; }
  };
  Gm.coldLevel = function () {
    const m = G.map;
    if (!m.outdoor || TL[m.tiles[G.P.y * m.w + G.P.x]].indoor) return 0;
    let c = 0;
    const b = D.biomes[m.biome];
    if (b && b.cold) c = b.cold;
    if (m.region && m.region.t < 0.3 && Gm.season() === 3) c = Math.max(c, 1);
    const w = Gm.weather();
    if (w === 'blizzard') c += 1;
    if (w === 'blacksnow') c += 1;
    if (Gm.night() && c > 0) c += 0.5;
    return c;
  };
  Gm.expel = function () {
    const P = G.P;
    const back = P.lastOver;
    if (back) Gm.loadMap(back.key, back.x, back.y, 'tp');
    else Gm.returnFromDim();
    G.mapChanged = true;
  };
  Gm.dayChange = function () {
    const P = G.P;
    Gm.cnt('days');
    if (Time.dom(G.S.time) === 1) {
      const mo = Time.month(G.S.time);
      Gm.msg('Наступил ' + D.months[mo] + '.' + (mo % 3 === 0 ? ' ' + U.cap(D.seasons[Math.floor(mo / 3)]) + '.' : ''), '#c0c0d0');
    }
    if ((P.hungryHours || 0) >= 12) { Gm.cnt('hunger_days'); if (Gm.fxFlag('hungerStr')) { P.base.str += 1; Gm.msg('Голод сделал тебя твёрже.', '#d0b080'); } }
    P.hungryHours = 0;
    if (Gm.fxFlag('intYear') && Gm.day() % 60 === 0) P.base.int += 1;
    if (Gm.fxFlag('aging')) P.ageAdd = (P.ageAdd || 0) + 6 / 360;
    if (Gm.hasFx('spores')) Gm.cnt('spore_days_now');
    if (Gm.day() === P.startDay + 1) { if (!P.flags.slept_first_night) P.flags.awake_first_night = 1; }
  };
  Gm.emotion = function (k) {
    const P = G.P;
    const pool = G.W.prayers.filter((p) => p.emo === k && !P.prayers.includes(p.id) && !G.S.lostPr[p.id]);
    if (pool.length && Math.random() < 0.25) Gm.learn(pool[Math.floor(Math.random() * pool.length)].id, 'Сердце');
  };
  // Небо, события, внезапные гости
  Gm.eventHour = function () {
    const P = G.P, m = G.map;
    const out = Gm.outdoors();
    for (const e of G.S.ev) {
      const d = D.events[e.id];
      if (!e.seenP && d.sky && out && (d.scope === 'global' || (e.r != null && m.region && E.Sim.rdist(e.r, m.region.id) <= (e.id === 'star' ? 12 : 4)))) {
        if (e.id === 'star' && !Gm.night()) continue;
        e.seenP = 1;
        let s = d.sky;
        if (e.r != null && m.region) { const g = G.W.regions[e.r]; s = s.replace('{dir}', U.dirWord(g.x - m.region.x, g.y - m.region.y)); }
        Gm.msg(s, '#ffe0b0');
        const c = G.S.chron.find((x) => x.t === e.t0 && x.k === 'event');
        if (c) c.seen = 1;
      }
    }
    const r = Math.random();
    if (!out || m.sett >= 0) return;
    if (Gm.event('bloodmoon') && Gm.night() && r < 0.04) Gm.spawnEventBoss('b_blood_lord');
    else if (Gm.event('blacksnow') && Gm.weather() === 'blacksnow' && r < 0.03) Gm.spawnEventBoss('b_black_winter');
    else if (Gm.event('hunt') && P.level >= 10 && r < 0.12) { for (let i = 0; i < 2; i++) Gm.placeMon(m, 'hound', P.level); Gm.msg('Где-то совсем близко трубит рог.', '#ffe080'); if (Math.random() < 0.2) Gm.spawnEventBoss('b_god_hunter'); }
    else if (Gm.event('ocean') && m.biome === 'ocean' && r < 0.1) Gm.spawnEventBoss('b_leviathan');
    else if (G.S.infect[m.rid] && G.S.ev.some((e) => e.id === 'shroom' && e.r === m.rid) && r < 0.2) Gm.spawnEventBoss('b_shroom_heart');
    // засада, если за тобой охотятся
    if (Gm.fxFlag('ambush') && Math.random() < 0.05) { for (let i = 0; i < 2; i++) Gm.placeMon(m, 'bandit', P.level); Gm.msg('Из-за деревьев выходят люди с ножами.', '#ff9090'); }
  };
  Gm.spawnEventBoss = function (id) {
    const b = G.W.bossById[id];
    if (!b || (G.S.boss[id] && G.S.boss[id].dead)) return;
    if (G.map.ents.some((e) => e.boss === id)) return;
    const P = G.P;
    const p = Ent.freeNear(U.clamp(P.x + (Math.random() < 0.5 ? -9 : 9), 1, MW - 2), U.clamp(P.y + (Math.random() < 0.5 ? -5 : 5), 1, MH - 2));
    if (p) Gm.spawnBoss(id, p.x, p.y);
  };
  Gm.freezeEnemies = (n) => { G.frozen = n; };
  Gm.flash = function (x, y, r, el) { G.fxFlash = { x: x == null ? G.P.x : x, y: y == null ? G.P.y : y, r: r || 40, el: el || 'light', t: performance.now() }; };

  // ---------- здоровье ----------
  Gm.hurtPlayer = function (dmg, cause, src) {
    const P = G.P;
    if (P.dead || P.ended) return;
    if (P.shield > 0) { const a = Math.min(P.shield, dmg); P.shield -= a; dmg -= a; if (!dmg) return; }
    if (cause === 'fire' && Gm.fxFlag('fireImm')) dmg = Math.round(dmg * 0.2);
    if (cause === 'fire' && P.eq.trinket && P.eq.trinket.b === 'a_frostheart') dmg *= 2;
    P.hp -= dmg;
    Gm.cnt('dmg_taken', dmg);
    Gm.gain('hit_taken');
    P.restInterrupt = 1;
    G.hitFlash = performance.now();
    if (P.hp <= 0) { P.hp = 0; Gm.die(cause, src); }
  };
  Gm.healPlayer = function (n, quiet) { const P = G.P; const before = P.hp; P.hp = Math.min(P.mhp, P.hp + Math.max(0, Math.round(n))); if (!quiet && P.hp > before) Gm.msg('+' + (P.hp - before) + ' здоровья.', '#80e080'); };

  // ---------- хуки ----------
  Gm.fire = function (on, ctx) {
    let r = false;
    for (const s of D.secrets) {
      if (s.on !== on) continue;
      try { if (s.test(ctx)) { const v = s.run(ctx); if (v) r = true; if (on === 'death' && v) return true; } } catch (e) { console.warn('secret', e); }
    }
    return r;
  };
  Gm.storyHook = function (on, ctx) {
    let r = false;
    for (const s of D.stories) {
      if (!s.on || !s.on[on]) continue;
      const roles = G.W.storyRoles[s.id];
      if (!roles) continue;
      try { if (s.on[on](ctx, Gm.st(s.id), roles)) r = true; } catch (e) { console.warn('story', s.id, e); }
    }
    return r;
  };
  Gm.storyDay = function () { Gm.storyHook('day', {}); };
  Gm.storyDayFast = function () {
    for (const s of D.stories) if (s.on && s.on.day && ['heir', 'eyecult', 'giant', 'keeper'].includes(s.id)) { const roles = G.W.storyRoles[s.id]; if (roles) try { s.on.day({}, Gm.st(s.id), roles); } catch (e) { /**/ } }
  };
  Gm.isNearPlayerNpc = function (id) { return !!(G.map && G.map.ents.some((e) => e.npc === id && U.dist(e.x, e.y, G.P.x, G.P.y) < 10)); };
  Gm.onDragonRaid = function (sid) {
    const m = G.map;
    if (G.ff || !G.P || G.P.ended || G.P.dead) return;
    if (m && m.sett === sid && m.kind === 'over') { Gm.msg('Небо темнеет. Над крышами — крылья!', '#ff8040'); const p = Ent.freeNear(G.P.x + 6, G.P.y - 3); if (p) Gm.spawnBoss('b_dragon', p.x, p.y); }
  };
  Gm.onBattle = function (sid) { const m = G.map; if (G.ff || !G.P || G.P.ended || G.P.dead) return; if (m && m.sett === sid) { Gm.msg('В городе бой! Звенит сталь, кричат люди.', '#ff9060'); for (let i = 0; i < 3; i++) Gm.placeMon(m, 'soldier', (m.spawn ? m.spawn.danger : 3) + 2); } };
})(window.EOF);
