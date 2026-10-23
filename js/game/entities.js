'use strict';
// Существа на карте: создание, расписания жителей, поведение.
(function (E) {
  const U = E.U, D = E.D, T = E.T, TL = E.TL, Time = E.Time;
  const G = E.G, Gm = E.Gm;
  const Ent = E.Ent = {};
  let nextId = 1;

  // ---------- создание ----------
  Ent.mon = function (tid, lvl, x, y, o) {
    const t = D.mons[tid];
    if (!t) return null;
    const L = Math.max(1, Math.round(lvl));
    // в самом начале мир чуть мягче к обычному человеку
    const soft = L <= 1 ? 0.7 : L === 2 ? 0.85 : 1;
    const k = (1 + 0.32 * (L - 1)) * soft, ka = (1 + 0.2 * (L - 1)) * soft;
    const e = {
      id: nextId++, kind: t.ai === 'ally' ? 'ally' : 'mon', tpl: tid, x, y, ch: t.ch, c: t.c, n: t.n, acc: t.acc, g: 'm',
      hp: Math.round(t.hp * k), mhp: Math.round(t.hp * k), a: [Math.round(t.a[0] * ka), Math.max(1, Math.round(t.a[1] * ka))], d: t.d + Math.floor(L / 3),
      dg: t.dg + L, ac: 5 + L * 2, sp: t.sp, en: Math.random() * 10, lvl: L, tags: t.tags.slice(), ai: t.ai, v: t.v, ab: t.ab ? t.ab.slice() : [], drops: t.drops || [],
      xp: Math.round(t.xp * Math.pow(L, 1.1)), hostile: t.ai !== 'passive' && t.ai !== 'ally', fx: [], range: t.range || 0, ghost: t.ghost,
    };
    if (t.ai === 'passive' && Gm.event('madness') && t.tags.includes('animal')) { e.ai = 'melee'; e.hostile = true; e.c = '#ff6060'; e.n = 'Обезумевший ' + t.n.toLowerCase(); }
    if (o) Object.assign(e, o);
    return e;
  };
  Ent.boss = function (bi, x, y) {
    const b = G.W.bosses[bi];
    const reg = b.region != null ? G.W.regions[b.region] : null;
    const base = reg ? reg.danger : 8;
    let L = Math.max(base + 2, b.tier * 2 + 2) + (b.where === 'dun' ? (b.depth || 1) : 0);
    if (b.dim) L = b.tier * 2 + 4;
    if (b.id === 'b_mirror') L = Math.max(5, G.P.level);
    const k = 1 + 0.25 * (L - 1);
    const hp = Math.round((70 + b.tier * 35) * k);
    const e = {
      id: nextId++, kind: 'boss', boss: b.id, bi, x, y, ch: b.ch, c: b.c, n: b.sn, full: b.n, g: b.g, acc: E.U.acc(b.sn, b.g),
      hp, mhp: hp, a: [Math.round((3 + b.tier * 1.4) * (1 + 0.14 * (L - 1))), Math.round((8 + b.tier * 2.2) * (1 + 0.14 * (L - 1)))], d: 3 + b.tier + Math.floor(L / 3),
      dg: 10 + L, ac: 10 + L * 2, sp: 10, en: 0, lvl: L, tags: b.tags.slice(), ai: 'boss', v: 'бьёт', ab: b.ab.slice(), drops: b.drops || [], xp: Math.round(60 * b.tier * Math.pow(L, 0.9)),
      hostile: true, fx: [], cdA: {}, lore: b.lore,
    };
    if (b.id === 'b_mirror') { const P = G.P; e.mhp = e.hp = P.mhp; e.a = [Math.max(1, Math.round(P.st.str * 0.8)), Math.round(P.st.str * 1.6 + 4)]; e.d = P.st.def; e.n = G.P.name !== '—' ? G.P.name : 'Ты'; e.acc = e.n; e.ch = '@'; }
    if (b.id === 'b_beggar_god') { e.hp = e.mhp = 900; }
    return e;
  };
  Ent.npc = function (id, x, y) {
    const n = Gm.npc(id);
    const job = E.Sim.job(id);
    const age = E.Sim.age(id);
    const lv = n.lvl || 1;
    const guard = job === 'guard' || job === 'veteran';
    const hp = guard ? 30 + lv * 9 : job === 'child' ? 8 : 14 + Math.min(20, age / 3);
    const e = {
      id: nextId++, kind: 'npc', npc: id, x, y, ch: n.deep ? 'Ѻ' : '☺', c: guard && job === 'guard' ? '#a8b8d0' : (n.col || '#c8b8a0'), n: n.first, g: n.sex === 'f' ? 'f' : 'm',
      hp, mhp: hp, a: guard ? [3 + lv, 7 + lv * 2] : [1, 3], d: guard ? 3 + Math.floor(lv / 2) : 0, dg: guard ? 15 : 8, ac: guard ? 20 + lv : 5, sp: 9, en: Math.random() * 10,
      lvl: lv, tags: ['human'], ai: 'npc', v: 'бьёт', ab: [], drops: [], xp: guard ? 20 + lv * 6 : 4, hostile: false, fx: [], job, guard,
    };
    if (n.special === 'ferryman' || n.special === 'moonmaid' || n.special === 'deepelder') { e.ch = n.special === 'ferryman' ? 'Ф' : n.special === 'moonmaid' ? 'Л' : 'Ѻ'; e.c = '#e0f0ff'; e.immortal = 1; e.ai = 'still'; }
    if (n.special === 'hag') { e.ch = 'Я'; e.c = '#90c070'; e.ai = 'still'; }
    if (n.special === 'forestchild') { e.c = '#9ae07a'; e.ai = 'still'; }
    if (n.deep) e.c = '#7ad0c0';
    return e;
  };
  Ent.ghost = function (id, x, y) {
    const n = Gm.npc(id);
    const e = Ent.npc(id, x, y);
    e.ch = '☺'; e.c = '#90d0c8'; e.ghost = 1; e.ai = 'wander'; e.immortal = 1;
    return e;
  };

  // ---------- карта ----------
  Gm.entAt = function (x, y) { const m = G.map; return m.occ.get(y * m.w + x) || null; };
  Gm.addEnt = function (e) {
    const m = G.map;
    if (!e) return null;
    const p = Ent.freeNear(e.x, e.y, e.kind === 'npc');
    if (!p) return null;
    e.x = p.x; e.y = p.y;
    m.ents.push(e);
    m.occ.set(e.y * m.w + e.x, e);
    return e;
  };
  Gm.removeEnt = function (e) {
    const m = G.map;
    const i = m.ents.indexOf(e);
    if (i >= 0) m.ents.splice(i, 1);
    if (m.occ.get(e.y * m.w + e.x) === e) m.occ.delete(e.y * m.w + e.x);
    e.dead = true;
  };
  Ent.move = function (e, x, y) {
    const m = G.map;
    if (m.occ.get(e.y * m.w + e.x) === e) m.occ.delete(e.y * m.w + e.x);
    e.x = x; e.y = y;
    m.occ.set(y * m.w + x, e);
  };
  Ent.passable = function (x, y, e) {
    const m = G.map;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
    const t = TL[m.tiles[y * m.w + x]];
    if (!t.walk) return t.water === 2 && e && (e.tags.includes('water') || e.ghost);
    if (t.fall && e && !e.ghost && !e.tags.includes('spirit')) return false;
    if (t.lava && e && !e.tags.includes('fire')) return false;
    if (m.occ.has(y * m.w + x)) return false;
    if (G.P && G.P.x === x && G.P.y === y) return false;
    return true;
  };
  Ent.freeNear = function (x, y, avoidDoor) {
    const m = G.map;
    for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const xx = x + dx, yy = y + dy;
      if (!Ent.passable(xx, yy, null)) continue;
      const t = m.tiles[yy * m.w + xx];
      if (TL[t].water || TL[t].fall || TL[t].lava) continue;
      if (TL[t].link) continue;
      return { x: xx, y: yy };
    }
    return null;
  };
  Gm.spawnMon = function (tid, x, y, lvl, o) {
    const e = Ent.mon(tid, lvl || (G.map.spawn ? G.map.spawn.danger : 1), x, y, o);
    return Gm.addEnt(e);
  };
  Gm.spawnBoss = function (id, x, y) {
    const b = G.W.bossById[id];
    if (!b) return null;
    if (G.map.ents.some((e) => e.boss === id)) return null;
    const st = G.S.boss[id] = G.S.boss[id] || {};
    if (st.dead) return null;
    st.seen = st.seen || G.S.time;
    const e = Gm.addEnt(Ent.boss(b.i, x, y));
    if (e) { Gm.msg('Воздух становится тяжёлым.', '#ff8080'); Gm.cnt('fear_seen'); }
    return e;
  };
  Gm.summonPet = function (tid) {
    G.P.pets.push({ tpl: tid, born: G.S.time });
    Gm.spawnAlly(tid, 999999, G.P.level);
  };
  Gm.spawnAlly = function (tid, dur, lvl) {
    const e = Ent.mon(tid, lvl || G.P.level, G.P.x, G.P.y);
    e.kind = 'ally'; e.hostile = false; e.ai = 'ally'; e.until = G.S.time + dur * 2; e.ally = 1;
    return Gm.addEnt(e);
  };

  // ---------- расписание жителей ----------
  Ent.place = function (id, hour) {
    const n = Gm.npc(id);
    const job = E.Sim.job(id);
    const j = D.jobs[job] || {};
    const tr = n.traits || [];
    if (n.special === 'forestchild') return hour >= 4 && hour <= 8 ? 'here' : 'gone';
    if (n.sett < 0 && !(G.S.npc[id] && G.S.npc[id].s >= 0)) return 'here';
    if (job === 'guard') { const day = id % 3 !== 0; return (day ? hour >= 6 && hour < 20 : hour >= 19 || hour < 7) ? 'patrol' : 'home'; }
    if (job === 'innkeeper' || job === 'bard') return hour >= 9 ? 'tavern' : 'home';
    if (job === 'shadow') return hour >= 20 || hour < 3 ? 'tavern' : 'home';
    if (job === 'beggar') return hour >= 7 && hour < 22 ? 'square' : 'home';
    if (hour >= 22 || hour < 6) return 'home';
    if (job === 'child') return hour >= 9 && hour < 19 ? (hour < 13 && id % 2 ? 'home' : 'square') : 'home';
    if (hour < 8) return 'home';
    if (hour < 18) {
      const w = j.place;
      if (job === 'miner') return 'mine';
      if (job === 'ruler' || job === 'noble') return 'palace';
      if (job === 'priest' || job === 'monk' || job === 'healer') return 'temple';
      return w || 'square';
    }
    if (hour < 22) {
      if (tr.includes('drunk') || (id % 3 === 0)) return 'tavern';
      if (tr.includes('pious')) return 'temple';
      return id % 2 ? 'square' : 'home';
    }
    return 'home';
  };
  // Точка цели для места
  Ent.spotFor = function (id, place) {
    const m = G.map;
    const S = m.spots || {};
    const n = Gm.npc(id);
    const r = U.rng(id, place, Math.floor(G.S.time / 360));
    const pick = (arr) => (arr && arr.length ? arr[r.int(0, arr.length - 1)] : null);
    const bld = (k) => (S[k] && S[k].in ? pick(S[k].in) : null);
    switch (place) {
      case 'home': { const h = Ent.homeOf(id); return h ? pick(h.in) : pick(S.square); }
      case 'tavern': return bld('tavern') || pick(S.square);
      case 'temple': return bld('temple') || pick(S.square);
      case 'palace': return bld('palace') || pick(S.square);
      case 'smithy': return bld('smithy') || pick(S.square);
      case 'library': return bld('library') || pick(S.square);
      case 'alch': return bld('alch') || pick(S.square);
      case 'market': return bld('market') || pick(S.square);
      case 'field': return pick(S.field) || pick(S.edge);
      case 'dock': return pick(S.dock) || pick(S.square);
      case 'edge': return pick(S.edge);
      case 'mine': return pick(S.mine) || pick(S.edge);
      case 'patrol': return pick(S.patrol) || pick(S.square);
      case 'gate': return pick(S.gate) || pick(S.square);
      case 'grave': return pick(S.grave) || pick(S.square);
      case 'square': return (S.street && S.street.length && r.chance(0.65)) ? pick(S.street) : pick(S.square);
      default: return (S.street && S.street.length && r.chance(0.5)) ? pick(S.street) : pick(S.square);
    }
  };
  Ent.homeOf = function (id) {
    const m = G.map;
    const homes = (m.spots && m.spots.home) || [];
    if (!homes.length) return null;
    const st = G.S.npc[id];
    const n = Gm.npc(id);
    let h = st && st.h != null ? st.h : n.house;
    if (h == null || h < 0) h = id;
    return homes[h % homes.length];
  };
  Ent.setTarget = function (e) {
    const place = Ent.place(e.npc, Time.hour(G.S.time));
    e.place = place;
    if (place === 'here' || place === 'gone') { e.tgt = null; return; }
    const p = Ent.spotFor(e.npc, place);
    e.tgt = p ? { x: p.x, y: p.y } : null;
    e.path = null;
  };
  // Заселение поселения на карте
  Ent.populate = function (fromRest) {
    const m = G.map;
    if (m.sett < 0 || m.dimName === 'mirror') return;
    if (G.S.sett[m.sett].destroyed) return;
    const ids = (E.Sim.settAlive[m.sett] || []).slice();
    const h = Time.hour(G.S.time);
    const cap = m.dimName === 'sea' ? 50 : 70;
    let out = 0;
    const present = new Set(m.ents.filter((e) => e.npc != null).map((e) => e.npc));
    const r = U.rng(m.sett, G.S.time);
    r.shuffle(ids);
    const sleepers = {};
    for (const id of ids) {
      if (present.has(id)) continue;
      const place = Ent.place(id, h);
      if (place === 'home') {
        // немного спящих в постелях
        const home = Ent.homeOf(id);
        if (!home) continue;
        const k = m.spots.home.indexOf(home);
        if ((sleepers[k] || 0) >= 2 || (h >= 6 && h < 22)) continue;
        const bed = home.in.find((p) => m.tiles[p.y * m.w + p.x] === T.BED && !m.occ.has(p.y * m.w + p.x));
        if (!bed) continue;
        sleepers[k] = (sleepers[k] || 0) + 1;
        const e = Ent.npc(id, bed.x, bed.y);
        e.asleep = 1; e.ai = 'sleep';
        m.ents.push(e); m.occ.set(bed.y * m.w + bed.x, e);
        continue;
      }
      if (out >= cap) continue;
      if (place === 'mine' && r.chance(0.7)) continue;
      const p = Ent.spotFor(id, place);
      if (!p) continue;
      const e = Ent.npc(id, p.x, p.y);
      if (Gm.addEnt(e)) { out++; Ent.setTarget(e); }
    }
  };
  // Ежечасная смена дел
  Ent.hourly = function () {
    const m = G.map;
    if (!m || m.sett < 0) return;
    const h = Time.hour(G.S.time);
    for (const e of m.ents.slice()) {
      if (e.npc == null || e.hostile || e.flee) continue;
      if (e.asleep) { if (h >= 6 && h < 22) { e.asleep = 0; e.ai = 'npc'; Ent.setTarget(e); } continue; }
      Ent.setTarget(e);
    }
    // новые выходят из домов
    if (h === 6 || h === 8 || h === 9 || h === 18 || h === 20 || h === 0) {
      const ids = E.Sim.settAlive[m.sett] || [];
      const present = new Set(m.ents.filter((e) => e.npc != null).map((e) => e.npc));
      let out = m.ents.filter((e) => e.npc != null && !e.asleep).length;
      for (const id of ids) {
        if (out >= 70) break;
        if (present.has(id)) continue;
        const place = Ent.place(id, h);
        if (place === 'home' || place === 'gone') continue;
        if (place === 'mine' && Math.random() < 0.7) continue;
        const home = Ent.homeOf(id);
        const start = home ? home.door : Ent.spotFor(id, 'square');
        if (!start) continue;
        const e = Ent.npc(id, start.x, start.y);
        if (Gm.addEnt(e)) { out++; Ent.setTarget(e); }
      }
    }
  };

  // ---------- поиск пути ----------
  // Карта расстояний до игрока (обновляется раз в ход)
  Ent.dmap = null;
  Ent.computeDmap = function () {
    const m = G.map, P = G.P;
    const n = m.w * m.h;
    if (!Ent.dmap || Ent.dmap.length !== n) Ent.dmap = new Int16Array(n);
    const d = Ent.dmap;
    d.fill(9999);
    const q = new Int32Array(n);
    let h = 0, t = 0;
    const s = P.y * m.w + P.x;
    d[s] = 0; q[t++] = s;
    while (h < t) {
      const i = q[h++];
      const dv = d[i];
      if (dv > 40) continue;
      const x = i % m.w, y = (i / m.w) | 0;
      for (let k = 0; k < 8; k++) {
        const xx = x + U.DIR8[k][0], yy = y + U.DIR8[k][1];
        if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue;
        const j = yy * m.w + xx;
        if (d[j] <= dv + 1) continue;
        const tt = TL[m.tiles[j]];
        if (!tt.walk && !(tt.water === 2)) continue;
        d[j] = dv + 1;
        q[t++] = j;
      }
    }
  };
  Ent.pathTo = function (e, tx, ty, maxN) {
    const m = G.map;
    const W = m.w, H = m.h;
    const prev = new Int32Array(W * H).fill(-1);
    const s = e.y * W + e.x, g = ty * W + tx;
    if (s === g) return [];
    const q = [s];
    prev[s] = s;
    let found = false;
    for (let h = 0; h < q.length && h < (maxN || 3000); h++) {
      const i = q[h];
      if (i === g) { found = true; break; }
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of U.DIR8) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (prev[j] >= 0) continue;
        const t = TL[m.tiles[j]];
        if (!t.walk || t.water === 2 || t.lava || t.fall) continue;
        if (dx && dy && (!TL[m.tiles[y * W + xx]].walk || !TL[m.tiles[yy * W + x]].walk)) continue;
        prev[j] = i;
        q.push(j);
      }
    }
    if (!found && prev[g] < 0) return null;
    const path = [];
    let c = g;
    while (c !== s) { path.push([c % W, (c / W) | 0]); c = prev[c]; if (path.length > 400) break; }
    return path.reverse();
  };

  // ---------- поведение ----------
  Ent.sees = function (e) {
    const P = G.P;
    const m = G.map;
    const d = U.dist(e.x, e.y, P.x, P.y);
    let r = e.kind === 'boss' ? 10 : e.ai === 'pack' ? 10 : 8;
    if (Gm.night() && m.outdoor && !e.tags.includes('undead')) r -= 2;
    if (Gm.hasFx('stealth') || Gm.fxFlag('stealth')) r = 2;
    if (Gm.fxFlag('noStealth')) r += 6;
    if (Gm.hasFx('calm') && e.tags.includes('animal')) return false;
    if (d > r) return false;
    return E.FOV.los(m, e.x, e.y, P.x, P.y);
  };
  Ent.stepToward = function (e, flee) {
    const d = Ent.dmap, m = G.map;
    const cur = d[e.y * m.w + e.x];
    let best = null, bv = flee ? cur : cur;
    for (const [dx, dy] of U.shuffleDirs()) {
      const x = e.x + dx, y = e.y + dy;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      const v = d[y * m.w + x];
      if (flee ? v <= bv : v >= bv) continue;
      if (!Ent.passable(x, y, e)) continue;
      best = [x, y]; bv = v;
    }
    if (best) { Ent.move(e, best[0], best[1]); return true; }
    return false;
  };
  const DIRS = U.DIR8.slice();
  U.shuffleDirs = function () { for (let i = DIRS.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = DIRS[i]; DIRS[i] = DIRS[j]; DIRS[j] = t; } return DIRS; };
  Ent.wander = function (e, p) {
    if (Math.random() > (p || 0.3)) return;
    const [dx, dy] = U.DIR8[(Math.random() * 8) | 0];
    if (Ent.passable(e.x + dx, e.y + dy, e)) Ent.move(e, e.x + dx, e.y + dy);
  };
  Ent.followPath = function (e) {
    if (!e.tgt) { Ent.wander(e, 0.15); return; }
    if (e.x === e.tgt.x && e.y === e.tgt.y) {
      if (e.place === 'home' && e.npc != null && !e.keep) { Gm.removeEnt(e); return; }
      if (e.place === 'mine' && e.npc != null) { Gm.removeEnt(e); return; }
      Ent.wander(e, 0.08);
      return;
    }
    if (!e.path || !e.path.length) {
      e.path = Ent.pathTo(e, e.tgt.x, e.tgt.y, 2600);
      if (!e.path) { e.tgt = null; return; }
    }
    const [nx, ny] = e.path[0];
    if (Ent.passable(nx, ny, e)) { Ent.move(e, nx, ny); e.path.shift(); e.stuck = 0; }
    else {
      e.stuck = (e.stuck || 0) + 1;
      if (e.stuck > 3) { e.path = null; Ent.wander(e, 1); }
      if (e.stuck > 25) { e.tgt = null; }
    }
  };
  Ent.adjacent = (e) => U.dist(e.x, e.y, G.P.x, G.P.y) === 1;

  Ent.act = function (e) {
    const P = G.P;
    if (e.dead) return;
    // эффекты существа
    if (e.fx.length) {
      for (let i = e.fx.length - 1; i >= 0; i--) {
        const f = e.fx[i];
        if (f.id === 'poison' || f.id === 'bleed' || f.id === 'burn') { E.Combat.hurtEnt(e, f.dmg || 2, null, f.id); if (e.dead) return; }
        if (--f.t <= 0) e.fx.splice(i, 1);
      }
      if (e.fx.some((f) => f.id === 'stun' || f.id === 'webbed' || f.id === 'freeze')) return;
      if (e.fx.some((f) => f.id === 'slow') && Math.random() < 0.5) return;
    }
    if (G.frozen > 0 && e.kind !== 'ally') return;
    if (e.until && G.S.time > e.until) { Gm.msg(U.cap(e.n) + ' исчезает.', '#909090'); Gm.removeEnt(e); return; }
    if (e.ab.includes('regen') && e.hp < e.mhp) e.hp = Math.min(e.mhp, e.hp + Math.max(1, Math.round(e.mhp * 0.03)));
    switch (e.ai) {
      case 'sleep': case 'still': return;
      case 'wander': Ent.wander(e, 0.25); return;
      case 'npc': return Ent.npcAct(e);
      case 'ally': return Ent.allyAct(e);
      case 'boss': return E.Combat.bossAct(e);
    }
    // монстры
    const sees = Ent.sees(e);
    if (sees) { if (!e.aware) { e.aware = true; if (e.kind === 'mon' && e.ai !== 'passive') e.lastSeen = G.turn; } e.lastSeen = G.turn; }
    else if (e.aware && G.turn - (e.lastSeen || 0) > 25) e.aware = false;
    // соль
    if (P.saltCircle && P.saltCircle.key === G.map.key && G.S.time < P.saltCircle.until && (e.tags.includes('undead') || e.tags.includes('spirit')) && U.dist(e.x, e.y, P.saltCircle.x, P.saltCircle.y) <= 3) { Ent.stepToward(e, true); return; }
    if (e.ai === 'passive' || (e.hp < e.mhp * 0.25 && !e.tags.includes('undead') && e.kind === 'mon' && Math.random() < 0.6)) {
      if (e.hostileToP && e.ai === 'passive' && Ent.adjacent(e) && Math.random() < 0.3) { E.Combat.monAttack(e); return; }
      if (sees && U.dist(e.x, e.y, P.x, P.y) < 6) { Ent.stepToward(e, true); return; }
      Ent.wander(e, 0.3); return;
    }
    // дракон не трогает носителя кости
    if (e.tags.includes('dragon') && P.eq.hand && P.eq.hand.b === 'a_dragonbone') { Ent.wander(e, 0.3); return; }
    if (P.flags.transcended && e.lvl < P.level / 10 && Math.random() < 0.7) { Ent.stepToward(e, true); return; }
    if (e.ai === 'ambush' && !e.sprung) { if (U.dist(e.x, e.y, P.x, P.y) <= 2) { e.sprung = true; Gm.msg(U.cap(e.n) + ' бросается из засады!', '#ff9090'); } else return; }
    if (!e.aware) { if (e.ai !== 'ambush') Ent.wander(e, e.ai === 'erratic' ? 0.6 : 0.25); return; }
    if (e.ai === 'erratic' && Math.random() < 0.3) { Ent.wander(e, 1); return; }
    const dist = U.dist(e.x, e.y, P.x, P.y);
    if (e.ai === 'ranged' && e.range) {
      if (dist <= e.range && dist > 1 && E.FOV.los(G.map, e.x, e.y, P.x, P.y)) { E.Combat.monAttack(e, true); return; }
      if (dist <= 2) { Ent.stepToward(e, true); return; }
    }
    if (dist === 1) { E.Combat.monAttack(e); return; }
    Ent.stepToward(e, false);
  };

  Ent.npcAct = function (e) {
    const P = G.P;
    if (e.flee) { if (U.dist(e.x, e.y, P.x, P.y) < 10) Ent.stepToward(e, true); else { e.flee = 0; Ent.setTarget(e); } return; }
    if (e.hostile) {
      if (U.dist(e.x, e.y, P.x, P.y) === 1) { E.Combat.monAttack(e); return; }
      if (U.dist(e.x, e.y, P.x, P.y) < 18) { Ent.stepToward(e, false); return; }
    }
    // стража ловит разыскиваемого
    if (e.guard && G.map.sett >= 0 && Gm.isWanted(G.map.sett) && !e.hostile && Ent.sees(e) && !(P.eq.head && P.eq.head.b === 'mask')) {
      e.hostile = true;
      Gm.msg((Gm.knows(e.npc) ? e.n : 'Стражник') + ': «Стой! Именем закона!»', '#ffb070');
      return;
    }
    if (e.duel) { if (U.dist(e.x, e.y, P.x, P.y) === 1) E.Combat.monAttack(e); else Ent.stepToward(e, false); return; }
    Ent.followPath(e);
  };
  Ent.allyAct = function (e) {
    const P = G.P;
    const m = G.map;
    let best = null, bd = 9;
    for (const o of m.ents) {
      if (o === e || o.dead || !(o.hostile || o.hostileToP) || o.kind === 'ally') continue;
      if (o.kind === 'npc' && !o.hostile) continue;
      const d = U.dist(e.x, e.y, o.x, o.y);
      if (d < bd) { bd = d; best = o; }
    }
    if (best) {
      if (bd === 1) { E.Combat.entAttack(e, best); return; }
      const dx = U.sign(best.x - e.x), dy = U.sign(best.y - e.y);
      if (Ent.passable(e.x + dx, e.y + dy, e)) Ent.move(e, e.x + dx, e.y + dy);
      else if (Ent.passable(e.x + dx, e.y, e)) Ent.move(e, e.x + dx, e.y);
      else if (Ent.passable(e.x, e.y + dy, e)) Ent.move(e, e.x, e.y + dy);
      return;
    }
    if (U.dist(e.x, e.y, P.x, P.y) > 3) Ent.stepToward(e, false); else Ent.wander(e, 0.2);
  };
})(window.EOF);
