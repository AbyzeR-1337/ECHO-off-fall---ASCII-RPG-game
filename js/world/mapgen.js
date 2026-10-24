'use strict';
// Генерация локальных карт: регионы мира, поселения, подземелья, измерения.
(function (E) {
  const U = E.U, D = E.D, T = E.T, TL = E.TL, C = E.C;
  const MW = C.MW, MH = C.MH, WS = C.WS;
  const MG = E.MapGen = {};

  function newMap(key, kind) {
    return { key, kind, w: MW, h: MH, tiles: new Uint8Array(MW * MH), feat: {}, items: [], ents: [], spots: {}, chests: {}, lairs: [], camps: [], npcsPlaced: [], dark: false, outdoor: true, depth: 0, sett: -1 };
  }
  MG.newMap = newMap;
  const inb = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
  const I = (x, y) => y * MW + x;
  const get = (m, x, y) => (inb(x, y) ? m.tiles[I(x, y)] : T.VOID);
  const set = (m, x, y, t) => { if (inb(x, y)) m.tiles[I(x, y)] = t; };
  MG.I = I;

  MG.parseKey = function (key) {
    const p = key.split(':');
    if (p[0] === 'o') return { t: 'o', x: +p[1], y: +p[2], v: p[3] || '' };
    if (p[0] === 'd' || p[0] === 'm') return { t: p[0], r: +p[1], l: +p[2] };
    if (p[0] === 'dim') return { t: 'dim', n: p[1], x: +p[2], y: +p[3] };
    if (p[0] === 'sea') return { t: 'sea', r: +p[1] };
    return null;
  };

  MG.build = function (key) {
    const W = E.G.W;
    const k = MG.parseKey(key);
    let m;
    if (k.t === 'o') m = buildOver(W, k.x, k.y, k.v, key);
    else if (k.t === 'd' || k.t === 'm') m = buildDungeon(W, k.r, k.l, k.t, key);
    else if (k.t === 'dim') m = k.n === 'mirror' ? buildMirror(W, k.x, k.y, key) : buildDim(W, k.n, k.x, k.y, key);
    else if (k.t === 'sea') m = buildSea(W, k.r, key);
    m.key = key;
    return m;
  };

  // ---------- биом в точке мира (с дрожанием границ) ----------
  function regionBiomeBase(g) { return g.exist === 'cyclic' ? 'ocean' : g.biome; }
  function biomeAt(W, wx, wy, self, selfB) {
    const s = W.seed;
    const jx = wx + (U.noise(s + 71, wx / 13, wy / 13) - 0.5) * 30;
    const jy = wy + (U.noise(s + 72, wx / 13, wy / 13) - 0.5) * 16;
    const rx = Math.floor(jx / MW), ry = Math.floor(jy / MH);
    if (rx < 0 || ry < 0 || rx >= WS || ry >= WS) return 'ocean';
    const g = W.regions[ry * WS + rx];
    if (g === self && selfB) return selfB;
    return regionBiomeBase(g);
  }
  const LANDLIKE = (b) => b !== 'ocean' && b !== 'sky';

  function terrain(W, b, wx, wy, m, x, y, rr) {
    const s = W.seed;
    const n = U.fbm(s + 101, wx / 11, wy / 11, 3);
    const n2 = U.noise(s + 102, wx / 3.5, wy / 3.5);
    const h = U.h2(s + 103, wx, wy) / 4294967296;
    switch (b) {
      case 'plains':
        if (n > 0.66 && n2 > 0.45) return h < 0.6 ? T.TREE : T.BUSH;
        if (n < 0.28 && n2 > 0.6) return T.HILL;
        if (h < 0.03) return T.FLOWERS;
        if (h < 0.1) return T.TALLGRASS;
        if (h < 0.13) return T.BUSH;
        return T.GRASS;
      case 'forest': {
        const cold = rr.t < 0.4;
        if (n > 0.4 && n2 > 0.3) return h < 0.85 ? (cold ? T.PINE : T.TREE) : T.BUSH;
        if (n2 > 0.75) return cold ? T.PINE : T.TREE;
        if (h < 0.06) return T.FERN;
        if (h < 0.16) return T.BUSH;
        if (h < 0.22) return T.TALLGRASS;
        if (h < 0.235) return T.MUSHROOM;
        return T.GRASS;
      }
      case 'ancient': {
        const cx = Math.floor(wx / 9), cy = Math.floor(wy / 7);
        const hh = U.h2(s + 104, cx, cy);
        const tx = cx * 9 + 2 + (hh % 5), ty = cy * 7 + 1 + ((hh >> 4) % 4);
        if ((hh & 3) !== 0 && wx >= tx && wx < tx + 2 && wy >= ty && wy < ty + 2) return T.BIGTREE;
        if (n2 > 0.8) return T.TREE;
        if (h < 0.12) return T.ROOTS;
        if (h < 0.22) return T.FERN;
        if (h < 0.24) return T.MUSHROOM;
        return T.GRASS;
      }
      case 'swamp':
        if (n > 0.62) return h < 0.7 ? T.BOG : T.REEDS;
        if (n2 > 0.72) return T.SHALLOW;
        if (h < 0.05) return T.DEADTREE;
        if (h < 0.12) return T.REEDS;
        if (h < 0.14) return T.MUSHROOM;
        return h < 0.6 ? T.SWAMP : T.GRASS;
      case 'desert':
        if (n2 > 0.66) return T.DUNE;
        if (n < 0.25 && n2 < 0.3) return T.STONES;
        if (h < 0.006) return T.CACTUS;
        if (h < 0.012) return T.BOULDER;
        if (h < 0.015) return T.BONES;
        return T.SAND;
      case 'tundra':
        if (n > 0.68 && n2 > 0.5) return T.PINE;
        if (n2 > 0.8) return T.ICE;
        if (h < 0.08) return T.STONES;
        if (h < 0.12) return T.DRIFT;
        return h < 0.5 ? T.SNOW : T.GRASS;
      case 'ice':
        if (n > 0.66) return n2 > 0.4 ? T.ICEROCK : T.ICE;
        if (n < 0.22 && n2 > 0.55) return T.WATER;
        if (h < 0.15) return T.DRIFT;
        if (h < 0.25) return T.ICE;
        return T.SNOW;
      case 'mountain':
      case 'living':
        if (n > 0.58) return n > 0.7 && n2 > 0.5 ? T.PEAK : T.MOUNTAIN;
        if (n > 0.52) return n2 > 0.3 ? T.MOUNTAIN : T.ROCKFLOOR;
        if (h < 0.1) return T.STONES;
        if (h < 0.13) return T.BOULDER;
        if (b === 'living' && n2 > 0.82) return T.FLESH;
        if (rr.t < 0.3 && h < 0.5) return T.SNOW;
        return h < 0.75 ? T.ROCKFLOOR : T.GRASS;
      case 'volcanic': {
        // острова в море
        const cxw = (rr.x + 0.5) * MW, cyw = (rr.y + 0.5) * MH;
        const d = Math.hypot((wx - cxw) / (MW * 0.42), (wy - cyw) / (MH * 0.42));
        if (d + (n - 0.5) * 0.6 > 1) return d > 1.15 ? T.WATER : T.SHALLOW;
        if (n2 > 0.72 && d < 0.75) return T.LAVA;
        if (n > 0.62) return T.BASALT;
        if (h < 0.05) return T.DEADTREE;
        return h < 0.7 ? T.ASH : T.ROCKFLOOR;
      }
      case 'ash':
        if (n2 > 0.78) return T.RUBBLE;
        if (n > 0.66 && n2 > 0.55) return T.WALL;
        if (h < 0.04) return T.DEADTREE;
        if (h < 0.06) return T.BONES;
        if (h < 0.1) return T.RUBBLE;
        return h < 0.6 ? T.ASH : T.ROCKFLOOR;
      case 'ocean':
        return T.WATER;
      case 'coast':
        if (n2 < 0.33) return T.SAND;
        if (n > 0.7) return T.TREE;
        if (h < 0.1) return T.TALLGRASS;
        if (h < 0.13) return T.STONES;
        return T.GRASS;
      case 'sky': {
        const v = U.fbm(s + 105, wx / 9, wy / 6, 3);
        if (v > 0.52) return h < 0.08 ? T.FLOWERS : h < 0.14 ? T.STONES : T.GRASS;
        if (v > 0.47) return T.CLOUD;
        return T.VOID;
      }
      case 'nightland':
        if (n > 0.66 && n2 > 0.45) return T.TREE;
        if (h < 0.06) return T.NIGHTFLOWER;
        if (h < 0.1) return T.MIST;
        return T.NIGHTGRASS;
    }
    return T.GRASS;
  }
  const FLOOR_FOR = { plains: T.GRASS, forest: T.GRASS, ancient: T.GRASS, swamp: T.SWAMP, desert: T.SAND, tundra: T.SNOW, ice: T.SNOW, mountain: T.ROCKFLOOR, living: T.ROCKFLOOR, volcanic: T.ASH, ash: T.ASH, ocean: T.SHALLOW, coast: T.SAND, sky: T.GRASS, nightland: T.NIGHTGRASS };

  // ---------- карта региона ----------
  function buildOver(W, rx, ry, variant, key) {
    const g = W.regions[ry * WS + rx];
    const m = newMap(key, 'over');
    m.region = g;
    m.rid = g.id;
    let selfB = null;
    if (variant === 'c' || variant === 'i') selfB = 'coast';
    if (variant === 'n') { selfB = 'nightland'; m.tint = 'night'; m.nightland = 1; }
    m.biome = selfB || regionBiomeBase(g);
    const rng = U.rng(W.seed, 'map', g.id, variant);
    // сетка биомов с полями по 3 клетки
    const PAD = 3, GW = MW + PAD * 2, GH = MH + PAD * 2;
    const bg = new Array(GW * GH);
    for (let y = -PAD; y < MH + PAD; y++) for (let x = -PAD; x < MW + PAD; x++) {
      const wx = rx * MW + x, wy = ry * MH + y;
      let b = biomeAt(W, wx, wy, g, selfB);
      if (variant === 'c' || variant === 'i') {
        const d = Math.hypot((x - MW / 2) / (MW * 0.38), (y - MH / 2) / (MH * 0.38)) + (U.noise(W.seed + 9, wx / 6, wy / 6) - 0.5) * 0.4;
        b = d < 1 ? 'coast' : 'ocean';
      }
      bg[(y + PAD) * GW + x + PAD] = b;
    }
    const BA = (x, y) => bg[(U.clamp(y, -PAD, MH + PAD - 1) + PAD) * GW + U.clamp(x, -PAD, MW + PAD - 1) + PAD];
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const wx = rx * MW + x, wy = ry * MH + y;
      const b = BA(x, y);
      let t = terrain(W, b, wx, wy, m, x, y, g);
      if (b === 'ocean') {
        let near = false;
        for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 3], [-3, -3]]) { if (LANDLIKE(BA(x + dx, y + dy))) { near = true; break; } }
        if (near) t = T.SHALLOW;
        else if (U.fbm(W.seed + 106, wx / 7, wy / 7, 2) > 0.8) t = T.SAND;
      }
      if (b === 'coast' && variant !== 'c' && variant !== 'i') {
        let near = false;
        for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) if (BA(x + dx, y + dy) === 'ocean') { near = true; break; }
        if (near) t = T.SAND;
      }
      m.tiles[I(x, y)] = t;
    }
    // ручьи и озёра
    if (g.features.includes('stream') && m.biome !== 'ocean') drawStream(m, rng, g);
    if (g.features.includes('lake') && m.biome !== 'ocean') drawLake(m, rng, rng.int(14, MW - 14), rng.int(8, MH - 8), rng.int(3, 6), m.biome === 'ice' ? T.ICE : T.WATER);
    // дороги
    const mask = W.roads[g.id] || 0;
    const cx = Math.floor(MW / 2), cy = Math.floor(MH / 2);
    const edges = [];
    if (mask & 1) edges.push([cx, 0]);
    if (mask & 2) edges.push([MW - 1, cy]);
    if (mask & 4) edges.push([cx, MH - 1]);
    if (mask & 8) edges.push([0, cy]);
    for (const [ex, ey] of edges) drawRoad(m, rng, cx, cy, ex, ey);
    // поселение
    const sid = variant === 'c' ? W.regions[g.id].settlement : (g.exist === 'cyclic' ? -1 : g.settlement);
    if (sid >= 0 && !(variant === 'n')) {
      const s = W.settlements[sid];
      if (s.type !== 'sea') buildSettlement(m, W, s, rng);
    }
    const reserved = (x, y) => m.reserve && m.reserve[I(x, y)];
    // особенности
    const fpos = () => freeSpot(m, rng, reserved, 6);
    if (variant !== 'n') {
      for (const f of g.features) {
        if (f === 'dungeon' && g.dun) {
          const p = fpos(); if (!p) continue;
          clearArea(m, p.x - 1, p.y - 1, 3, 3, floorOf(m));
          set(m, p.x, p.y, T.DOWN);
          const dn = { cave: 'вход в пещеру', mine_old: 'старая штольня', ruins: 'спуск в руины', crypt: 'вход в склеп', barrow: 'вход в курган', sunken: 'затопленный провал', tomb: 'вход в гробницу', flooded: 'морской грот', ice: 'ледяная пещера', lava: 'огненный провал', roots: 'лаз под корнями', flesh: 'пасть горы', abyss: 'Провал' }[g.dun.type] || 'спуск вниз';
          m.feat[I(p.x, p.y)] = { k: 'link', to: 'd:' + g.id + ':1', name: dn };
          m.dunEntry = p;
        } else if (f === 'ruins' && m.biome !== 'ocean') buildRuins(m, rng, W, g, fpos);
        else if (f === 'shrine') {
          const p = fpos(); if (!p) continue;
          clearArea(m, p.x - 2, p.y - 2, 5, 5, T.STONEFLOOR);
          set(m, p.x, p.y, T.SHRINE); m.feat[I(p.x, p.y)] = { k: 'shrine', god: g.shrine };
          for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) set(m, p.x + dx, p.y + dy, T.PILLAR);
        } else if (f === 'camp') {
          const p = fpos(); if (!p) continue;
          clearArea(m, p.x - 4, p.y - 3, 9, 7, floorOf(m));
          set(m, p.x, p.y, T.CAMPFIRE);
          for (const [dx, dy] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) set(m, p.x + dx, p.y + dy, T.TENT);
          m.camps.push({ x: p.x, y: p.y });
          addChest(m, p.x + 2, p.y, [], rng);
        } else if (f === 'inscription') {
          const p = fpos(); if (!p) continue;
          set(m, p.x, p.y, T.INSCRIPTION);
          m.feat[I(p.x, p.y)] = { k: 'inscr', lang: U.hash(W.seed, g.id) % D.langs.length, text: D.inscr[U.hash(W.seed, g.id, 'i') % D.inscr.length] };
        } else if (f === 'altar') {
          const p = fpos(); if (!p) continue;
          clearArea(m, p.x - 2, p.y - 1, 5, 3, T.STONEFLOOR);
          set(m, p.x, p.y, T.ALTAR); m.feat[I(p.x, p.y)] = { k: 'altar', god: D.gods[U.hash(W.seed, g.id, 'alt') % D.gods.length].id };
        } else if (f === 'ore') {
          let k = 0;
          for (let i = 0; i < 400 && k < 14; i++) { const x = rng.int(1, MW - 2), y = rng.int(1, MH - 2); const t = get(m, x, y); if (t === T.MOUNTAIN || t === T.PEAK) { set(m, x, y, T.ORE); k++; } }
        } else if (f === 'whirlpool') {
          const p = { x: rng.int(10, MW - 10), y: rng.int(6, MH - 6) };
          set(m, p.x, p.y, T.WHIRLPOOL);
          m.feat[I(p.x, p.y)] = { k: 'link', to: g.seaCity != null ? 'sea:' + g.id : 'd:' + g.id + ':1', name: 'водоворот' };
          if (g.seaCity == null && !g.dun) g.dun = { type: 'flooded', depth: 2 };
        } else if (f === 'temple') buildTemple(m, rng, fpos);
        else if (f === 'peak') { m.peak = fpos(); }
      }
    }
    if (m.nightland) {
      // ночные земли: особые цветы, туман, иногда торговец
      m.nightMerchant = fpos();
    }
    // размещения (сюжеты, тайники)
    applyPlacements(m, W, g, rng, fpos);
    // уникальные предметы в сундуках
    const uq = W.uqOver[g.id] || [];
    if (uq.length && variant !== 'n') {
      const chestIdx = Object.keys(m.chests);
      for (let i = 0; i < uq.length; i++) {
        let ci = chestIdx.length ? chestIdx[i % chestIdx.length] : null;
        if (ci == null) { const p = fpos(); if (!p) break; addChest(m, p.x, p.y, [], rng); ci = I(p.x, p.y); chestIdx.push(ci); }
        m.chests[ci].items.push({ uq: uq[i] });
      }
    }
    // логова боссов
    for (const bi of W.bossByRegion[g.id] || []) {
      const b = W.bosses[bi];
      if (b.where !== 'over') continue;
      const p = freeSpot(m, rng, reserved, 10, true) || fpos();
      if (p) m.lairs.push({ b: bi, x: p.x, y: p.y });
    }
    // связность
    const pts = edges.slice();
    pts.push([0, cy], [MW - 1, cy], [cx, 0], [cx, MH - 1]);
    for (const k in m.feat) { const f = m.feat[k]; if (f.k === 'link' || f.k === 'shrine' || f.k === 'altar') pts.push([k % MW, Math.floor(k / MW)]); }
    for (const k in m.chests) pts.push([k % MW, Math.floor(k / MW)]);
    for (const l of m.lairs) pts.push([l.x, l.y]);
    if (m.biome !== 'ocean' && m.biome !== 'sky') ensureConn(m, rng, m.settCenter || findWalkNear(m, cx, cy), pts);
    if (m.biome === 'sky') skyBridges(m, rng, cx, cy);
    m.spawn = { biome: m.biome, danger: g.danger };
    return m;
  }

  function floorOf(m) { return FLOOR_FOR[m.biome] || T.GRASS; }
  function clearArea(m, x0, y0, w, h, t) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inb(x, y)) set(m, x, y, t); }
  function freeSpot(m, rng, reserved, margin, far) {
    margin = margin || 4;
    for (let i = 0; i < 300; i++) {
      const x = rng.int(margin, MW - 1 - margin), y = rng.int(Math.min(margin, 4), MH - 1 - Math.min(margin, 4));
      if (reserved && reserved(x, y)) continue;
      if (m.settRect && x >= m.settRect.x - 2 && x <= m.settRect.x + m.settRect.w + 2 && y >= m.settRect.y - 2 && y <= m.settRect.y + m.settRect.h + 2) continue;
      const t = get(m, x, y);
      if (!TL[t].walk || TL[t].water || TL[t].fall || t === T.ROAD || t === T.COBBLE) continue;
      if (far && Math.abs(x - MW / 2) + Math.abs(y - MH / 2) < 14) continue;
      return { x, y };
    }
    return null;
  }
  function findWalkNear(m, x, y) {
    for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (inb(xx, yy) && TL[get(m, xx, yy)].walk && !TL[get(m, xx, yy)].fall) return { x: xx, y: yy };
    }
    return { x, y };
  }
  MG.findWalkNear = findWalkNear;
  function drawStream(m, rng, g) {
    const vertical = rng.chance(0.5);
    let x = vertical ? rng.int(10, MW - 10) : 0, y = vertical ? 0 : rng.int(6, MH - 6);
    for (let k = 0; k < 400; k++) {
      if (!inb(x, y)) break;
      const t = get(m, x, y);
      if (t !== T.WATER && t !== T.LAVA) set(m, x, y, T.STREAM);
      if (rng.chance(0.3)) set(m, x + (vertical ? 1 : 0), y + (vertical ? 0 : 1), T.STREAM);
      if (vertical) { y++; x += rng.int(-1, 1); } else { x++; y += rng.int(-1, 1); }
      x = U.clamp(x, 1, MW - 2); y = U.clamp(y, 0, MH);
      if (vertical && y >= MH) break; if (!vertical && x >= MW - 1) { set(m, MW - 1, y, T.STREAM); break; }
    }
    m.stream = 1;
  }
  function drawLake(m, rng, cx, cy, r, t) {
    for (let y = cy - r - 2; y <= cy + r + 2; y++) for (let x = cx - r * 2 - 3; x <= cx + r * 2 + 3; x++) {
      if (!inb(x, y)) continue;
      const d = Math.hypot((x - cx) / 2, y - cy) + rng.next() * 0.8;
      if (d < r) set(m, x, y, t);
      else if (d < r + 1.2 && t === T.WATER) set(m, x, y, T.SHALLOW);
    }
  }
  function drawRoad(m, rng, x0, y0, x1, y1) {
    let x = x0, y = y0;
    for (let k = 0; k < 300; k++) {
      const t = get(m, x, y);
      if (TL[t].water) set(m, x, y, T.BRIDGE);
      else if (t !== T.BRIDGE && t !== T.DOWN) set(m, x, y, T.ROAD);
      if (x === x1 && y === y1) break;
      const dx = x1 - x, dy = y1 - y;
      if (Math.abs(dx) > Math.abs(dy) || (Math.abs(dx) === Math.abs(dy) && rng.chance(0.5))) x += Math.sign(dx);
      else y += Math.sign(dy);
      if (rng.chance(0.15) && Math.abs(dx) > 3 && Math.abs(dy) > 3) { if (Math.abs(dx) > Math.abs(dy)) y += rng.pick([-1, 1]); else x += rng.pick([-1, 1]); }
      x = U.clamp(x, 0, MW - 1); y = U.clamp(y, 0, MH - 1);
    }
  }
  function skyBridges(m, rng, cx, cy) {
    // мосты из облаков от центра к краям
    const c = findWalkNear(m, cx, cy);
    for (const [ex, ey] of [[cx, 0], [cx, MH - 1], [0, cy], [MW - 1, cy]]) {
      let x = c.x, y = c.y;
      for (let k = 0; k < 200; k++) {
        if (TL[get(m, x, y)].fall) set(m, x, y, T.BRIDGE);
        if (x === ex && y === ey) break;
        if (x !== ex && (y === ey || rng.chance(0.6))) x += Math.sign(ex - x); else y += Math.sign(ey - y);
      }
    }
  }
  // Проводит пути ко всем важным точкам
  function ensureConn(m, rng, start, pts) {
    const floor = floorOf(m);
    const passable = (t) => TL[t].walk && !TL[t].fall && !TL[t].lava;
    const reach = new Uint8Array(MW * MH);
    const bfs = () => {
      reach.fill(0);
      const q = [I(start.x, start.y)];
      reach[q[0]] = 1;
      for (let h = 0; h < q.length; h++) {
        const i = q[h], x = i % MW, y = (i / MW) | 0;
        for (const [dx, dy] of U.DIR4) {
          const xx = x + dx, yy = y + dy;
          if (!inb(xx, yy)) continue;
          const j = I(xx, yy);
          if (reach[j]) continue;
          if (passable(m.tiles[j]) || TL[m.tiles[j]].link) { reach[j] = 1; q.push(j); }
        }
      }
    };
    bfs();
    for (const [px, py] of pts) {
      if (!inb(px, py)) continue;
      let ok = false;
      for (const [dx, dy] of [[0, 0], ...U.DIR8]) if (inb(px + dx, py + dy) && reach[I(px + dx, py + dy)]) { ok = true; break; }
      if (ok) continue;
      let x = px, y = py;
      for (let k = 0; k < 300; k++) {
        if (reach[I(x, y)]) break;
        const t = m.tiles[I(x, y)];
        if (!passable(t) && !TL[t].link && !(m.chests[I(x, y)]) && !m.feat[I(x, y)]) {
          set(m, x, y, TL[t].water ? T.BRIDGE : (t === T.WALL || t === T.TOWNWALL || t === T.TREEWALL) ? T.RUBBLE : floor);
        }
        const dx = start.x - x, dy = start.y - y;
        if (dx === 0 && dy === 0) break;
        if (Math.abs(dx) > Math.abs(dy) ? rng.chance(0.8) : rng.chance(0.2)) x += Math.sign(dx); else y += Math.sign(dy) || Math.sign(dx);
        x = U.clamp(x, 0, MW - 1); y = U.clamp(y, 0, MH - 1);
      }
      bfs();
    }
  }
  MG.ensureConn = ensureConn;

  function addChest(m, x, y, items, rng, o) {
    if (!inb(x, y)) return null;
    set(m, x, y, T.CHEST);
    const c = Object.assign({ items: items || [], opened: 0 }, o || {});
    m.chests[I(x, y)] = c;
    return c;
  }
  MG.addChest = addChest;

  function buildRuins(m, rng, W, g, fpos) {
    const p = fpos(); if (!p) return;
    const w = rng.int(8, 14), h = rng.int(6, 9);
    const x0 = U.clamp(p.x - (w >> 1), 1, MW - w - 1), y0 = U.clamp(p.y - (h >> 1), 1, MH - h - 1);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const edge = x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1;
      if (edge) set(m, x, y, rng.chance(0.65) ? T.WALL : T.RUBBLE);
      else set(m, x, y, rng.chance(0.15) ? T.RUBBLE : T.STONEFLOOR);
    }
    set(m, x0 + (w >> 1), y0 + h - 1, T.RUBBLE);
    if (rng.chance(0.5)) set(m, x0 + 2, y0 + 2, T.STATUE);
    if (rng.chance(0.4)) set(m, x0 + w - 3, y0 + 2, T.PILLAR);
    addChest(m, x0 + w - 2, y0 + h - 2, [], rng);
    if (rng.chance(0.35)) { set(m, x0 + 1, y0 + h - 2, T.INSCRIPTION); m.feat[I(x0 + 1, y0 + h - 2)] = { k: 'inscr', lang: rng.int(0, D.langs.length - 1), text: rng.pick(D.inscr) }; }
    m.ruins = (m.ruins || 0) + 1;
    m.ruinRect = { x: x0, y: y0, w, h };
  }
  function buildTemple(m, rng, fpos) {
    const p = fpos(); if (!p) return;
    const w = 11, h = 7;
    const x0 = U.clamp(p.x - 5, 1, MW - w - 1), y0 = U.clamp(p.y - 3, 1, MH - h - 1);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const edge = x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1;
      set(m, x, y, edge ? (rng.chance(0.7) ? T.WALL : T.RUBBLE) : (rng.chance(0.1) ? T.RUBBLE : T.STONEFLOOR));
    }
    set(m, x0 + 5, y0 + h - 1, T.RUBBLE);
    set(m, x0 + 5, y0 + 1, T.ALTAR);
    m.feat[I(x0 + 5, y0 + 1)] = { k: 'altar', god: 'silent', ruined: 1 };
    for (const dx of [2, 8]) { set(m, x0 + dx, y0 + 2, T.PILLAR); set(m, x0 + dx, y0 + 4, T.PILLAR); }
    m.templeSpot = { x: x0 + 4, y: y0 + 3 };
  }

  function applyPlacements(m, W, g, rng, fpos) {
    const pl = W.placements[g.id] || [];
    pl.forEach((p, i) => {
      if (m.nightland) return;
      const mk = (o) => Object.assign({ b: o.b }, o);
      if (p.k === 'item') {
        if (p.inTemple && m.templeSpot) { m.items.push({ x: m.templeSpot.x, y: m.templeSpot.y, it: { b: p.b }, pid: g.id + ':' + i }); return; }
        if (p.onThrone && m.throneSpot) { m.items.push({ x: m.throneSpot.x, y: m.throneSpot.y + 1, it: { b: p.b }, pid: g.id + ':' + i }); return; }
        const extra = Object.assign({}, p); delete extra.k; delete extra.chest; delete extra.inTemple; delete extra.nest; delete extra.grave; delete extra.corpse; delete extra.story;
        if (p.grave) {
          const s = fpos(); if (!s) return;
          set(m, s.x, s.y, T.GRAVE); m.feat[I(s.x, s.y)] = { k: 'grave', text: 'Имя стёрто.', item: mk(extra) };
          return;
        }
        if (p.chest) {
          const ks = Object.keys(m.chests);
          if (ks.length && rng.chance(0.7)) { m.chests[rng.pick(ks)].items.push(mk(extra)); return; }
          const s = fpos(); if (!s) return; addChest(m, s.x, s.y, [mk(extra)], rng); return;
        }
        if (p.corpse) {
          const s = fpos(); if (!s) return; set(m, s.x, s.y, T.BONES); m.items.push({ x: s.x, y: s.y, it: mk(extra) }); return;
        }
        const s = fpos(); if (!s) return;
        if (p.nest) { for (const [dx, dy] of U.DIR8) if (TL[get(m, s.x + dx, s.y + dy)].walk) set(m, s.x + dx, s.y + dy, T.BONES); }
        m.items.push({ x: s.x, y: s.y, it: mk(extra) });
      } else if (p.k === 'npc') {
        const s = fpos(); if (!s) return; m.npcsPlaced.push({ id: p.id, x: s.x, y: s.y });
      } else if (p.k === 'grave') {
        const s = fpos(); if (!s) return; set(m, s.x, s.y, T.GRAVE); m.feat[I(s.x, s.y)] = { k: 'grave', text: p.text };
      } else if (p.k === 'corpse') {
        const s = fpos(); if (!s) return;
        set(m, s.x, s.y, T.BONES);
        if (p.item) m.items.push({ x: s.x, y: s.y, it: Object.assign({}, p.item) });
        if (p.loot) m.items.push({ x: s.x, y: s.y, it: { b: rng.pick(['bread', 'rusk', 'torch', 'knife', 'rope', 'p_heal', 'flint', 'cloak']) } });
        if (p.npc != null) m.feat[I(s.x, s.y)] = { k: 'corpse', npc: p.npc };
      } else if (p.k === 'site') {
        const s = fpos(); if (!s) return;
        if (p.s === 'lighthouse') { clearArea(m, s.x - 2, s.y - 2, 5, 5, T.STONEFLOOR); set(m, s.x, s.y, T.LIGHTHOUSE); m.feat[I(s.x, s.y)] = { k: 'lighthouse' }; }
        else if (p.s === 'hungry_altar') { clearArea(m, s.x - 3, s.y - 2, 7, 5, T.STONEFLOOR); set(m, s.x, s.y, T.ALTAR); m.feat[I(s.x, s.y)] = { k: 'altar', god: 'hungry' }; for (const [dx, dy] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) set(m, s.x + dx, s.y + dy, T.BONES); }
        else if (p.s === 'graveyard') { for (let k = 0; k < 10; k++) { const x = s.x + rng.int(-4, 4), y = s.y + rng.int(-2, 2); if (inb(x, y) && TL[get(m, x, y)].walk) { set(m, x, y, T.GRAVE); m.feat[I(x, y)] = { k: 'grave', text: rng.pick(E.N.male.concat(E.N.female)) + '. Покойся.' }; } } }
        else if (p.s === 'wreck') { clearArea(m, s.x - 3, s.y - 1, 7, 3, T.SAND); for (let k = 0; k < 6; k++) set(m, s.x + rng.int(-3, 3), s.y + rng.int(-1, 1), rng.pick([T.BONES, T.RUBBLE])); addChest(m, s.x, s.y, [{ b: 'rusk' }, { b: 'gold', q: rng.int(20, 80) }], rng); }
        else if (p.s === 'throne_ruin') {
          clearArea(m, s.x - 5, s.y - 3, 11, 7, T.STONEFLOOR);
          for (let x = s.x - 5; x <= s.x + 5; x++) { set(m, x, s.y - 3, rng.chance(0.7) ? T.WALL : T.RUBBLE); set(m, x, s.y + 3, rng.chance(0.5) ? T.WALL : T.RUBBLE); }
          set(m, s.x, s.y - 2, T.THRONE); m.feat[I(s.x, s.y - 2)] = { k: 'throne', ruined: 1 };
          for (const dx of [-3, 3]) { set(m, s.x + dx, s.y - 1, T.PILLAR); set(m, s.x + dx, s.y + 1, T.PILLAR); }
          m.throneSpot = { x: s.x, y: s.y - 2 };
        }
      } else if (p.k === 'vault') {
        const s = fpos(); if (!s) return;
        for (let y = s.y - 2; y <= s.y + 2; y++) for (let x = s.x - 3; x <= s.x + 3; x++) if (inb(x, y)) set(m, x, y, (Math.abs(y - s.y) === 2 || Math.abs(x - s.x) === 3) ? T.WALL : T.STONEFLOOR);
        set(m, s.x, s.y + 2, T.DOOR); m.feat[I(s.x, s.y + 2)] = { k: 'locked', key: 'rusty_key' };
        addChest(m, s.x, s.y - 1, [{ b: 'gold', q: 500 }, { uq: (U.hash(W.seed, 'vault') % 4200) }, { uq: (U.hash(W.seed, 'vault2') % 4200) }, { b: 'p_heal', q: 3 }], rng);
      }
    });
  }

  // ---------- поселения ----------
  function buildSettlement(m, W, s, rng) {
    const T0 = s.type;
    const size = { capital: [62, 30], town: [50, 26], village: [42, 22], tree: [46, 24], hamlet: [28, 14], farm: [16, 10], vanish: [36, 20] }[T0] || [30, 16];
    const [aw, ah] = size;
    const x0 = Math.floor((MW - aw) / 2), y0 = Math.floor((MH - ah) / 2);
    m.sett = s.id;
    m.settRect = { x: x0, y: y0, w: aw, h: ah };
    m.reserve = new Uint8Array(MW * MH);
    const urban = T0 === 'capital' || T0 === 'town';
    const ground = urban ? T.COBBLE : (m.biome === 'desert' ? T.SAND : m.biome === 'tundra' || m.biome === 'ice' ? T.SNOW : T.GRASS);
    const street = urban ? T.COBBLE : T.ROAD;
    const wallT = T0 === 'tree' ? T.TREEWALL : T.WALL;
    clearArea(m, x0, y0, aw, ah, ground);
    if (!urban) for (let y = y0; y < y0 + ah; y++) for (let x = x0; x < x0 + aw; x++) if (rng.chance(0.08)) set(m, x, y, T.TALLGRASS);
    const cx = Math.floor(MW / 2), cy = Math.floor(MH / 2);
    // стены
    if (s.b.walls) {
      for (let x = x0; x < x0 + aw; x++) { set(m, x, y0, T.TOWNWALL); set(m, x, y0 + ah - 1, T.TOWNWALL); }
      for (let y = y0; y < y0 + ah; y++) { set(m, x0, y, T.TOWNWALL); set(m, x0 + aw - 1, y, T.TOWNWALL); }
      for (const [gx, gy] of [[cx, y0], [cx, y0 + ah - 1], [x0, cy], [x0 + aw - 1, cy]]) { set(m, gx, gy, T.GATE); (m.spots.gate = m.spots.gate || []).push({ x: gx, y: gy }); }
    } else {
      m.spots.gate = [{ x: cx, y: y0 }, { x: cx, y: y0 + ah - 1 }, { x: x0, y: cy }, { x: x0 + aw - 1, y: cy }];
    }
    // улицы: линии разреза кварталов
    const vx = [cx], hy = [cy];
    if (T0 === 'capital') { vx.push(x0 + Math.floor(aw / 4), x0 + Math.floor(aw * 3 / 4)); }
    if (T0 === 'town') { vx.push(x0 + Math.floor(aw / 4) , x0 + Math.floor(aw * 3 / 4)); }
    for (const x of vx) for (let y = y0 + 1; y < y0 + ah - 1; y++) { set(m, x, y, street); m.reserve[I(x, y)] = 1; }
    for (const y of hy) for (let x = x0 + 1; x < x0 + aw - 1; x++) { set(m, x, y, street); m.reserve[I(x, y)] = 1; }
    // площадь
    const pw = urban ? 8 : 6, ph = urban ? 4 : 3;
    for (let y = cy - (ph >> 1); y <= cy + (ph >> 1); y++) for (let x = cx - (pw >> 1); x <= cx + (pw >> 1); x++) { set(m, x, y, street); m.reserve[I(x, y)] = 1; }
    if (T0 !== 'farm') set(m, cx + 2, cy - 1, T.WELL);
    m.spots.square = [];
    for (let y = cy - (ph >> 1); y <= cy + (ph >> 1); y++) for (let x = cx - (pw >> 1); x <= cx + (pw >> 1); x++) if (TL[get(m, x, y)].walk) m.spots.square.push({ x, y });
    m.settCenter = { x: cx, y: cy };
    // кварталы
    const xs = [x0].concat(vx.slice().sort((a, b) => a - b), [x0 + aw - 1]);
    const ys = [y0].concat(hy.slice().sort((a, b) => a - b), [y0 + ah - 1]);
    const blocks = [];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const b = { x: xs[i] + 1, y: ys[j] + 1, x2: xs[i + 1] - 1, y2: ys[j + 1] - 1 };
      if (b.x2 - b.x >= 4 && b.y2 - b.y >= 3) { b.d = Math.abs((b.x + b.x2) / 2 - cx) + Math.abs((b.y + b.y2) / 2 - cy); blocks.push(b); }
    }
    blocks.sort((a, b) => a.d - b.d);
    // здания: [тип, ширина, высота]
    const specials = [];
    if (s.b.palace) specials.push(['palace', 13, 8]);
    if (s.b.temple) specials.push(['temple', 11, 6]);
    if (s.b.tavern) specials.push(['tavern', 11, 6]);
    if (s.b.library) specials.push(['library', 9, 5]);
    if (s.b.market) specials.push(['market', 10, 5]);
    if (s.b.smith) specials.push(['smithy', 7, 5]);
    if (s.b.alch) specials.push(['alch', 7, 5]);
    if (s.b.guard) specials.push(['guard', 7, 5]);
    m.spots.home = [];
    const isFree = (bx, by, bw, bh) => {
      if (bx < x0 + 1 || by < y0 + 1 || bx + bw > x0 + aw - 1 || by + bh > y0 + ah - 1) return false;
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) if (m.reserve[I(x, y)]) return false;
      for (let y = by - 1; y <= by + bh; y++) for (let x = bx - 1; x <= bx + bw; x++) if (m.reserve[I(x, y)] === 2) return false;
      return true;
    };
    const side = (bx, by, bw, bh) => {
      // дверь — туда, где снаружи проходимо и не стена города
      const out = (x, y) => inb(x, y) && m.reserve[I(x, y)] !== 2 && get(m, x, y) !== T.TOWNWALL && x > x0 && x < x0 + aw - 1 && y > y0 && y < y0 + ah - 1;
      const midx = bx + (bw >> 1), midy = by + (bh >> 1);
      const c = [];
      if (out(midx, by - 1)) c.push(['t', Math.abs(by - 1 - cy)]);
      if (out(midx, by + bh)) c.push(['b', Math.abs(by + bh - cy)]);
      if (out(bx - 1, midy)) c.push(['l', Math.abs(bx - 1 - cx) + 4]);
      if (out(bx + bw, midy)) c.push(['r', Math.abs(bx + bw - cx) + 4]);
      c.sort((a, b2) => a[1] - b2[1]);
      return c.length ? c[0][0] : 'b';
    };
    const put = (type, bx, by, bw, bh) => {
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) m.reserve[I(x, y)] = 2;
      const spot = buildBuilding(m, rng, type, bx, by, bw, bh, wallT, cx, cy, s, side(bx, by, bw, bh));
      if (type === 'home') m.spots.home.push(spot); else m.spots[type] = spot;
    };
    // особые здания — в ближайших кварталах
    for (const [type, bw, bh] of specials) {
      let done = false;
      for (const b of blocks) {
        for (const by of [b.y, b.y2 - bh + 1]) {
          for (let bx = b.x; bx + bw - 1 <= b.x2 && !done; bx++) if (isFree(bx, by, bw, bh)) { put(type, bx, by, bw, bh); done = true; }
          if (done) break;
        }
        if (done) break;
      }
    }
    // дома — рядами по кварталам
    let left = s.houses;
    const hh = T0 === 'capital' ? 5 : 4;
    for (const b of blocks) {
      for (let ry = b.y; ry + hh - 1 <= b.y2 && left > 0; ry += hh + 1) {
        let bx = b.x;
        while (bx <= b.x2 && left > 0) {
          const bw = rng.int(5, 7) + (T0 === 'capital' ? 1 : 0);
          if (bx + bw - 1 > b.x2) break;
          if (isFree(bx, ry, bw, hh)) { put('home', bx, ry, bw, hh); left--; bx += bw + 1; }
          else bx++;
        }
      }
    }
    s.housesBuilt = m.spots.home.length;
    // поля
    if (s.b.fields) {
      m.spots.field = [];
      for (let k = 0; k < (T0 === 'farm' ? 2 : 4); k++) {
        const fw = rng.int(6, 10), fh = rng.int(3, 5);
        const side = rng.int(0, 3);
        let fx, fy;
        if (side === 0) { fx = rng.int(2, MW - fw - 2); fy = rng.int(1, Math.max(1, y0 - fh - 1)); }
        else if (side === 1) { fx = rng.int(2, MW - fw - 2); fy = rng.int(Math.min(MH - fh - 2, y0 + ah + 1), MH - fh - 1); }
        else if (side === 2) { fx = rng.int(1, Math.max(1, x0 - fw - 1)); fy = rng.int(2, MH - fh - 2); }
        else { fx = rng.int(Math.min(MW - fw - 2, x0 + aw + 1), MW - fw - 1); fy = rng.int(2, MH - fh - 2); }
        for (let y = fy; y < fy + fh; y++) for (let x = fx; x < fx + fw; x++) if (inb(x, y) && !m.reserve[I(x, y)] && TL[get(m, x, y)].walk && !TL[get(m, x, y)].water) { set(m, x, y, T.FIELD); m.spots.field.push({ x, y }); }
      }
    }
    // кладбище
    if (s.b.grave) {
      const gx = x0 + aw + 2 < MW - 8 ? x0 + aw + 2 : Math.max(1, x0 - 8), gy = Math.min(MH - 5, y0 + 1);
      m.spots.grave = [];
      for (let k = 0; k < 8; k++) { const x = gx + (k % 4) * 2, y = gy + Math.floor(k / 4) * 2; if (inb(x, y)) { set(m, x, y, T.GRAVE); m.feat[I(x, y)] = { k: 'grave', text: null, sid: s.id, n: k }; m.spots.grave.push({ x: x, y: y + 1 }); } }
    }
    // причал
    if (s.b.dock) {
      let best = null;
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (TL[get(m, x, y)].water) { const d = Math.abs(x - cx) + Math.abs(y - cy); if (!best || d < best.d) best = { x, y, d }; }
      if (best) {
        m.spots.dock = [];
        let x = best.x, y = best.y;
        for (let k = 0; k < 6; k++) { if (!inb(x, y)) break; set(m, x, y, T.DOCK); m.spots.dock.push({ x, y }); const dx = Math.sign(x - cx), dy = Math.sign(y - cy); if (Math.abs(x - cx) > Math.abs(y - cy)) x += dx; else y += dy; }
        drawRoad(m, rng, cx, cy, best.x, best.y);
      }
    }
    // шахта
    if (s.b.mine) {
      let p = null;
      for (let i = 0; i < 400 && !p; i++) { const x = rng.int(2, MW - 3), y = rng.int(2, MH - 3); if (m.reserve[I(x, y)]) continue; if ([T.MOUNTAIN, T.PEAK, T.ORE].some((t) => [get(m, x + 1, y), get(m, x - 1, y), get(m, x, y + 1), get(m, x, y - 1)].includes(t)) && TL[get(m, x, y)].walk) p = { x, y }; }
      if (!p) p = freeSpot(m, rng, (x, y) => m.reserve[I(x, y)], 4) || { x: 4, y: 4 };
      set(m, p.x, p.y, T.MINE);
      m.feat[I(p.x, p.y)] = { k: 'link', to: 'm:' + s.region + ':1', name: 'вход в шахту', mine: s.id };
      m.spots.mine = [p];
      drawRoad(m, rng, cx, cy, p.x, p.y);
      set(m, p.x, p.y, T.MINE);
    }
    // окраины — для охотников и лесорубов
    m.spots.edge = [];
    for (let i = 0; i < 40; i++) { const x = rng.int(2, MW - 3), y = rng.int(2, MH - 3); if (!m.reserve[I(x, y)] && TL[get(m, x, y)].walk && (x < x0 - 1 || x > x0 + aw || y < y0 - 1 || y > y0 + ah)) m.spots.edge.push({ x, y }); }
    if (!m.spots.edge.length) m.spots.edge = m.spots.square.slice();
    m.spots.patrol = (m.spots.gate || []).concat(m.spots.square.slice(0, 4));
    // улицы — чтобы люди не толпились на одной площади
    m.spots.street = [];
    for (let y = y0 + 1; y < y0 + ah - 1; y++) for (let x = x0 + 1; x < x0 + aw - 1; x++) { const tt = get(m, x, y); if ((tt === T.COBBLE || tt === T.ROAD) && !m.spots.square.some((p) => p.x === x && p.y === y)) m.spots.street.push({ x, y }); }
  }

  function buildBuilding(m, rng, type, bx, by, bw, bh, wallT, cx, cy, s, ds) {
    const floorT = type === 'temple' || type === 'palace' || type === 'guard' ? T.STONEFLOOR : T.FLOOR;
    const isMarket = type === 'market';
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
      const edge = x === bx || y === by || x === bx + bw - 1 || y === by + bh - 1;
      if (isMarket) set(m, x, y, T.COBBLE);
      else set(m, x, y, edge ? wallT : floorT);
    }
    const inside = [];
    // дверь — к центру
    let door;
    const midx = bx + (bw >> 1), midy = by + (bh >> 1);
    if (ds === 't') door = [midx, by];
    else if (ds === 'b') door = [midx, by + bh - 1];
    else if (ds === 'l') door = [bx, midy];
    else if (ds === 'r') door = [bx + bw - 1, midy];
    else {
      const opts = [];
      if (cy < by) opts.push([midx, by]); if (cy > by + bh - 1) opts.push([midx, by + bh - 1]);
      if (cx < bx) opts.push([bx, midy]); if (cx > bx + bw - 1) opts.push([bx + bw - 1, midy]);
      if (!opts.length) opts.push([midx, by + bh - 1]);
      door = rng.pick(opts);
    }
    if (!isMarket) {
      set(m, door[0], door[1], T.DOOR);
      // окна
      for (let k = 0; k < 2; k++) { const wx = bx + rng.int(1, bw - 2); const wy = rng.chance(0.5) ? by : by + bh - 1; if (get(m, wx, wy) === wallT && Math.abs(wx - door[0]) > 1) set(m, wx, wy, T.WINDOW); }
      // проход у двери снаружи
      const ox = door[0] + (door[0] === bx ? -1 : door[0] === bx + bw - 1 ? 1 : 0), oy = door[1] + (door[1] === by ? -1 : door[1] === by + bh - 1 ? 1 : 0);
      if (inb(ox, oy) && !TL[get(m, ox, oy)].walk) set(m, ox, oy, T.ROAD);
      if (inb(ox, oy)) drawRoadTo(m, ox, oy, cx, cy);
    }
    const ix0 = bx + 1, iy0 = by + 1, iw = bw - 2, ih = bh - 2;
    const putIn = (x, y, t) => { if (x >= ix0 && y >= iy0 && x < ix0 + iw && y < iy0 + ih) set(m, x, y, t); };
    // стулья у стола — сквозь них можно пройти
    const chairs = (x, y, both) => { for (const dx of both ? [-1, 1] : [-1]) { const xx = x + dx; if (xx >= ix0 && xx < ix0 + iw && get(m, xx, y) === T.FLOOR) set(m, xx, y, T.CHAIR); } };
    const tableAt = (x, y, both) => { putIn(x, y, T.TABLE); if (get(m, x, y) === T.TABLE) chairs(x, y, both); };
    if (type === 'home') {
      putIn(ix0, iy0, T.BED);
      if (iw > 2) putIn(ix0 + iw - 1, iy0, T.BED);
      tableAt(ix0 + (iw >> 1), iy0 + ih - 1 === door[1] - 1 && door[1] === by + bh - 1 ? iy0 : iy0 + ih - 1, false);
      putIn(ix0 + iw - 1, iy0 + ih - 1, T.HEARTH);
      // нужник за домом
      if (rng.chance(0.45)) for (const [ox, oy] of [[bx - 2, by], [bx + bw + 1, by], [bx - 2, by + bh - 1], [bx + bw + 1, by + bh - 1]]) { if (!inb(ox, oy)) continue; const tt = get(m, ox, oy); if (TL[tt].walk && !TL[tt].indoor && ![T.ROAD, T.COBBLE, T.DOOR, T.GATE, T.BRIDGE, T.DOCK].includes(tt) && !TL[tt].water) { set(m, ox, oy, T.OUTHOUSE); break; } }
      if (iw > 3) { const cxh = ix0 + 1, cyh = iy0 + ih - 1; if (get(m, cxh, cyh) === T.FLOOR) addChest(m, cxh, cyh, [], rng, { home: 1 }); }
    } else if (type === 'tavern') {
      for (let x = ix0 + 1; x < ix0 + iw - 1; x += 3) { tableAt(x, iy0 + 2, true); }
      for (let x = ix0 + 1; x < ix0 + iw - 1; x += 2) if (get(m, x, iy0 + ih - 2) === T.FLOOR && iy0 + ih - 2 > iy0 + 2) set(m, x, iy0 + ih - 2, T.BENCH);
      for (let x = ix0; x < ix0 + 4; x++) putIn(x, iy0, T.COUNTER);
      putIn(ix0 + iw - 1, iy0, T.HEARTH);
      putIn(ix0 + iw - 1, iy0 + ih - 1, T.BED); putIn(ix0 + iw - 2, iy0 + ih - 1, T.BED);
    } else if (type === 'temple') {
      putIn(ix0 + (iw >> 1), iy0, T.ALTAR);
      m.feat[I(ix0 + (iw >> 1), iy0)] = { k: 'altar', god: D.gods[U.hash(E.G.W.seed, s.id, 'tg') % D.gods.length].id, temple: 1 };
      for (let x = ix0 + 1; x < ix0 + iw - 1; x += 3) { putIn(x, iy0 + 2, T.PILLAR); }
    } else if (type === 'library') {
      for (let x = ix0; x < ix0 + iw; x++) { if (x % 2 === 0) { putIn(x, iy0, T.SHELF); putIn(x, iy0 + 1, T.SHELF); } }
      tableAt(ix0 + iw - 1, iy0 + ih - 1, false);
    } else if (type === 'smithy') {
      putIn(ix0 + 1, iy0 + 1, T.ANVIL); putIn(ix0 + iw - 1, iy0, T.HEARTH); putIn(ix0, iy0, T.COUNTER);
    } else if (type === 'alch') {
      putIn(ix0 + 1, iy0, T.ALCHTABLE); putIn(ix0 + iw - 1, iy0, T.SHELF);
    } else if (type === 'guard') {
      putIn(ix0, iy0, T.BED); putIn(ix0 + 1, iy0, T.BED); tableAt(ix0 + iw - 1, iy0 + ih - 1, false);
      addChest(m, ix0 + iw - 1, iy0, [], rng, { guard: 1 });
    } else if (type === 'palace') {
      putIn(ix0 + (iw >> 1), iy0, T.THRONE);
      m.feat[I(ix0 + (iw >> 1), iy0)] = { k: 'throne', sett: s.id };
      for (let x = ix0 + 1; x < ix0 + iw - 1; x += 3) { putIn(x, iy0 + 2, T.PILLAR); putIn(x, iy0 + ih - 2, T.PILLAR); }
      addChest(m, ix0, iy0, [{ b: 'gold', q: 300 }], rng, { treasury: 1 });
    } else if (type === 'market') {
      for (let x = bx + 1; x < bx + bw - 1; x += 3) { set(m, x, by + 1, T.COUNTER); set(m, x, by + bh - 2, T.COUNTER); }
    }
    for (let y = (isMarket ? by : iy0); y < (isMarket ? by + bh : iy0 + ih); y++) for (let x = (isMarket ? bx : ix0); x < (isMarket ? bx + bw : ix0 + iw); x++) if (TL[get(m, x, y)].walk) inside.push({ x, y });
    const res = { type, door: { x: door[0], y: door[1] }, in: inside.length ? inside : [{ x: door[0], y: door[1] }], rect: { x: bx, y: by, w: bw, h: bh } };
    if (!isMarket) (m.blds = m.blds || []).push(res);
    return res;
  }
  function drawRoadTo(m, x, y, cx, cy) {
    // короткая тропинка к ближайшей улице
    for (let k = 0; k < 12; k++) {
      const t = get(m, x, y);
      if (t === T.COBBLE || t === T.ROAD) return;
      if (!TL[t].walk) return;
      if (t !== T.DOOR) set(m, x, y, T.ROAD);
      if (Math.abs(cx - x) > Math.abs(cy - y)) x += Math.sign(cx - x); else y += Math.sign(cy - y);
      if (m.reserve && m.reserve[I(x, y)] === 2) return;
    }
  }

  // ---------- подземелья ----------
  function buildDungeon(W, rid, lvl, kind, key) {
    const g = W.regions[rid];
    const m = newMap(key, 'dun');
    m.region = g; m.rid = rid;
    m.outdoor = false; m.dark = true; m.depth = lvl;
    const rng = U.rng(W.seed, 'dun', rid, lvl, kind);
    let type = kind === 'm' ? 'mine' : (g.dun ? g.dun.type : 'cave');
    const maxD = kind === 'm' ? 2 : (g.dun ? g.dun.depth : 2);
    if (type === 'abyss' && lvl >= 10) m.abyss = 1;
    m.dtype = type;
    m.biome = 'dungeon';
    const pal = {
      cave: [T.ROCKFLOOR, T.CAVEWALL], mine: [T.ROCKFLOOR, T.CAVEWALL], mine_old: [T.ROCKFLOOR, T.CAVEWALL], sunken: [T.ROCKFLOOR, T.CAVEWALL], ice: [T.ICE, T.ICEROCK], lava: [T.ASH, T.BASALT],
      roots: [T.ROOTS, T.CAVEWALL], flesh: [T.FLESH, T.FLESHWALL], abyss: [T.ROCKFLOOR, T.CAVEWALL], crypt: [T.STONEFLOOR, T.WALL], barrow: [T.STONEFLOOR, T.CAVEWALL],
      tomb: [T.STONEFLOOR, T.WALL], ruins: [T.STONEFLOOR, T.WALL], flooded: [T.STONEFLOOR, T.WALL],
    }[type] || [T.ROCKFLOOR, T.CAVEWALL];
    const [FL, WL] = pal;
    const rooms = ['crypt', 'tomb', 'ruins', 'flooded', 'barrow'].includes(type);
    m.tiles.fill(WL);
    let up, down;
    if (rooms) {
      const rs = [];
      for (let a = 0; a < 200 && rs.length < 12; a++) {
        const w = rng.int(5, 12), h = rng.int(4, 7), x = rng.int(1, MW - w - 2), y = rng.int(1, MH - h - 2);
        if (rs.some((r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
        rs.push({ x, y, w, h });
      }
      for (const r of rs) clearArea(m, r.x, r.y, r.w, r.h, FL);
      for (let i = 1; i < rs.length; i++) {
        const a = rs[i - 1], b = rs[i];
        let x = a.x + (a.w >> 1), y = a.y + (a.h >> 1);
        const tx = b.x + (b.w >> 1), ty = b.y + (b.h >> 1);
        while (x !== tx) { set(m, x, y, FL); x += Math.sign(tx - x); }
        while (y !== ty) { set(m, x, y, FL); y += Math.sign(ty - y); }
      }
      for (const r of rs) {
        if (type === 'crypt' || type === 'tomb' || type === 'barrow') for (let k = 0; k < 2; k++) { const x = r.x + rng.int(0, r.w - 1), y = r.y + rng.int(0, r.h - 1); if (get(m, x, y) === FL) { set(m, x, y, rng.chance(0.6) ? T.GRAVE : T.BONES); if (get(m, x, y) === T.GRAVE) m.feat[I(x, y)] = { k: 'grave', text: rng.chance(0.3) ? rng.pick(E.N.male) + '. Король этих мест.' : 'Буквы стёрты.' }; } }
        if (type === 'flooded') for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (rng.chance(0.4)) set(m, x, y, T.SHALLOW);
        if (rng.chance(0.25)) set(m, r.x, r.y, T.PILLAR);
      }
      up = { x: rs[0].x + 1, y: rs[0].y + 1 };
      const last = rs[rs.length - 1];
      down = { x: last.x + last.w - 2, y: last.y + last.h - 2 };
      m.rooms = rs;
    } else {
      // клеточный автомат
      const a = new Uint8Array(MW * MH);
      for (let i = 0; i < a.length; i++) a[i] = rng.chance(type === 'abyss' && lvl > 15 ? 0.4 : 0.45) ? 1 : 0;
      for (let it = 0; it < 4; it++) {
        const b = new Uint8Array(MW * MH);
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
          if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) { b[I(x, y)] = 1; continue; }
          let c = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += a[I(x + dx, y + dy)];
          b[I(x, y)] = c >= 5 ? 1 : 0;
        }
        a.set(b);
      }
      for (let i = 0; i < a.length; i++) m.tiles[i] = a[i] ? WL : FL;
      // оставить крупнейшую область
      const lab = new Int32Array(MW * MH).fill(-1);
      let best = -1, bestN = 0, lid = 0;
      for (let i = 0; i < a.length; i++) {
        if (a[i] || lab[i] >= 0) continue;
        const q = [i]; lab[i] = lid; let n = 0;
        for (let h = 0; h < q.length; h++) { const j = q[h]; n++; const x = j % MW, y = (j / MW) | 0; for (const [dx, dy] of U.DIR4) { const xx = x + dx, yy = y + dy; if (!inb(xx, yy)) continue; const k = I(xx, yy); if (!a[k] && lab[k] < 0) { lab[k] = lid; q.push(k); } } }
        if (n > bestN) { bestN = n; best = lid; }
        lid++;
      }
      for (let i = 0; i < a.length; i++) if (!a[i] && lab[i] !== best) m.tiles[i] = WL;
      if (bestN < 300) { clearArea(m, 4, 4, MW - 8, MH - 8, FL); }
      const cells = [];
      for (let i = 0; i < a.length; i++) if (m.tiles[i] === FL) cells.push(i);
      // самые удалённые точки
      const c0 = cells[rng.int(0, cells.length - 1)];
      const far = (from) => { const dist = bfsDist(m, from % MW, (from / MW) | 0); let bi = from, bd = 0; for (const c of cells) if (dist[c] > bd && dist[c] < 1e8) { bd = dist[c]; bi = c; } return bi; };
      const ui = far(c0), di = far(ui);
      up = { x: ui % MW, y: (ui / MW) | 0 };
      down = { x: di % MW, y: (di / MW) | 0 };
      // декор
      for (const c of cells) {
        const h = rng.next();
        if (type === 'sunken' && h < 0.15) m.tiles[c] = T.SHALLOW;
        else if (type === 'lava' && h < 0.06) m.tiles[c] = T.LAVA;
        else if (type === 'ice' && h < 0.05) m.tiles[c] = T.SNOW;
        else if ((type === 'mine' || type === 'mine_old') && h < 0.02) m.tiles[c] = T.RUBBLE;
        else if (type === 'abyss' && lvl >= 10 && h < 0.04) m.tiles[c] = T.VOIDFLOOR;
        else if (h < 0.015) m.tiles[c] = T.BONES;
        else if (type === 'cave' && h < 0.025) m.tiles[c] = T.MUSHROOM;
      }
      if (type === 'mine' || type === 'mine_old' || type === 'cave') {
        for (let i = 0; i < 30; i++) { const c = rng.pick(cells); const x = c % MW, y = (c / MW) | 0; for (const [dx, dy] of U.DIR4) if (get(m, x + dx, y + dy) === WL && rng.chance(0.5)) { set(m, x + dx, y + dy, T.ORE); break; } }
        for (let i = 0; i < (type === 'cave' ? 4 : 0); i++) { const c = rng.pick(cells); const x = c % MW, y = (c / MW) | 0; for (const [dx, dy] of U.DIR4) if (get(m, x + dx, y + dy) === WL) { set(m, x + dx, y + dy, T.CRYSTAL); break; } }
      }
      if (type === 'abyss' && lvl >= 15) m.tint = 'abyss';
      // скрытые трещины в стене
      if (rng.chance(0.3)) { for (let i = 0; i < 200; i++) { const c = rng.pick(cells); const x = c % MW, y = (c / MW) | 0; const [dx, dy] = rng.pick(U.DIR4); if (get(m, x + dx, y + dy) === WL && WL === T.CAVEWALL) { set(m, x + dx, y + dy, T.CRACKWALL); break; } } }
    }
    set(m, up.x, up.y, T.UP);
    m.feat[I(up.x, up.y)] = { k: 'link', to: lvl === 1 ? 'up' : (kind + ':' + rid + ':' + (lvl - 1)), down: 1, name: lvl === 1 ? 'выход наверх' : 'подъём' };
    m.entry = up;
    if (lvl < maxD) { set(m, down.x, down.y, T.DOWN); m.feat[I(down.x, down.y)] = { k: 'link', to: kind + ':' + rid + ':' + (lvl + 1), name: 'спуск глубже' }; m.downAt = down; }
    m.bossSpot = down;
    // сундуки и уникальные предметы
    const uq = kind === 'd' ? (W.uqDun[rid] || []).filter((_, i) => i % maxD === lvl - 1) : [];
    const nChest = rng.int(1, 3) + Math.ceil(uq.length / 2);
    const chestKeys = [];
    for (let k = 0; k < nChest; k++) {
      const p = freeCell(m, rng, FL);
      if (!p) break;
      const c = addChest(m, p.x, p.y, [], rng);
      if (rng.chance(0.06)) c.mimic = 1;
      chestKeys.push(I(p.x, p.y));
    }
    uq.forEach((u, i) => { if (chestKeys.length) m.chests[chestKeys[i % chestKeys.length]].items.push({ uq: u }); });
    for (const ck of chestKeys) { const c = m.chests[ck]; if (rng.chance(0.7)) c.items.push({ b: 'gold', q: rng.int(5, 30) * lvl }); if (rng.chance(0.5)) c.items.push({ b: rng.pick(['p_heal', 'p_spirit', 'torch', 'rusk', 'p_antidote', 'book', 'h_mandrake', 'crystal', 'iron_ore']) }); }
    // боссы
    for (const bi of W.bossByRegion[rid] || []) {
      const b = W.bosses[bi];
      if (b.where === 'dun' && (b.depth === lvl || (lvl === maxD && b.depth > maxD)) && kind === 'd') m.lairs.push({ b: bi, x: down.x, y: down.y });
    }
    m.spawn = { biome: 'dungeon', danger: g.danger + lvl * 2 + (type === 'abyss' ? lvl * 2 : 0), dtype: type, abyss: m.abyss };
    if (type === 'flesh') m.spawn.biome = 'flesh';
    return m;
  }
  function freeCell(m, rng, FL) {
    for (let i = 0; i < 500; i++) { const x = rng.int(1, MW - 2), y = rng.int(1, MH - 2); if (get(m, x, y) === FL && !m.feat[I(x, y)]) return { x, y }; }
    return null;
  }
  function bfsDist(m, sx, sy) {
    const d = new Int32Array(MW * MH).fill(1e9);
    const q = [I(sx, sy)];
    d[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % MW, y = (i / MW) | 0;
      for (const [dx, dy] of U.DIR4) { const xx = x + dx, yy = y + dy; if (!inb(xx, yy)) continue; const j = I(xx, yy); if (d[j] < 1e9 || !TL[m.tiles[j]].walk) continue; d[j] = d[i] + 1; q.push(j); }
    }
    return d;
  }
  MG.bfsDist = bfsDist;

  // ---------- измерения ----------
  function buildDim(W, name, gx, gy, key) {
    const m = newMap(key, 'dim');
    m.dimName = name; m.dim = 1;
    const dd = D.dims[name];
    m.biome = dd.biome;
    m.dark = !!dd.dark;
    m.outdoor = !dd.dark;
    m.dimGrid = dd.size;
    m.gx = gx; m.gy = gy;
    const rng = U.rng(W.seed, 'dim', name, gx, gy);
    const center = gx === (dd.size >> 1) && gy === (dd.size >> 1);
    const s = W.seed + name.length * 97;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const wx = gx * MW + x, wy = gy * MH + y;
      const n = U.fbm(s, wx / 10, wy / 10, 3), n2 = U.noise(s + 1, wx / 4, wy / 4), h = U.h2(s + 2, wx, wy) / 4294967296;
      let t;
      switch (name) {
        case 'dream': t = n > 0.66 ? T.DREAMWALL : n < 0.22 ? T.WATER : h < 0.03 ? T.FLOWERS : h < 0.05 ? T.STATUE : T.DREAMFLOOR; break;
        case 'spirit': t = n > 0.7 ? T.MIST : n < 0.2 ? T.WATER : h < 0.02 ? T.GRAVE : T.SPIRITFLOOR; break;
        case 'time': t = n > 0.68 && n2 > 0.4 ? T.CLOCKWALL : h < 0.02 ? T.PILLAR : T.TIMEFLOOR; break;
        case 'void': t = n > 0.72 ? T.VOID : h < 0.01 ? T.CRYSTAL : T.VOIDFLOOR; break;
        case 'moon': t = n > 0.7 ? T.BOULDER : n2 > 0.75 ? T.CRATER : T.MOONDUST; break;
        case 'flesh': t = n > 0.6 ? T.FLESHWALL : h < 0.03 ? T.BONES : T.FLESH; break;
        case 'depths': t = n > 0.58 ? T.CAVEWALL : h < 0.02 ? T.ORE : T.ROCKFLOOR; break;
        default: t = T.ROCKFLOOR;
      }
      if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) {
        // края измерения закрыты, если дальше нет клеток
        const ex = x === 0 ? gx - 1 : x === MW - 1 ? gx + 1 : gx, ey = y === 0 ? gy - 1 : y === MH - 1 ? gy + 1 : gy;
        if (ex < 0 || ey < 0 || ex >= dd.size || ey >= dd.size) t = name === 'void' ? T.VOID : name === 'flesh' ? T.FLESHWALL : name === 'dream' ? T.DREAMWALL : name === 'time' ? T.CLOCKWALL : name === 'depths' ? T.CAVEWALL : name === 'spirit' ? T.MIST : T.BOULDER;
      }
      m.tiles[I(x, y)] = t;
    }
    const cx = MW >> 1, cy = MH >> 1;
    if (center) {
      clearArea(m, cx - 6, cy - 3, 13, 7, m.tiles[I(cx, cy)] === T.VOID ? T.VOIDFLOOR : (name === 'void' ? T.VOIDFLOOR : name === 'flesh' ? T.FLESH : name === 'dream' ? T.DREAMFLOOR : name === 'spirit' ? T.SPIRITFLOOR : name === 'time' ? T.TIMEFLOOR : name === 'moon' ? T.MOONDUST : T.ROCKFLOOR));
      if (name === 'void') { set(m, cx, cy - 2, T.THRONE); m.feat[I(cx, cy - 2)] = { k: 'throne', void: 1 }; }
      if (name === 'time') { for (let x = cx - 5; x <= cx + 5; x += 2) set(m, x, cy - 3, T.SHELF); m.feat[I(cx - 1, cy - 3)] = { k: 'archive' }; m.feat[I(cx + 1, cy - 3)] = { k: 'archive' }; }
      if (name === 'depths') { set(m, cx, cy, T.ANVIL); m.feat[I(cx, cy)] = { k: 'forge' }; set(m, cx + 2, cy, T.HEARTH); }
      if (name === 'spirit') { for (let x = 1; x < MW - 1; x++) for (let y = cy + 4; y <= cy + 6; y++) set(m, x, y, T.WATER); m.npcsPlaced.push({ id: W.special.ferryman, x: cx, y: cy + 3 }); }
      if (name === 'moon') m.npcsPlaced.push({ id: W.special.moonmaid, x: cx - 3, y: cy });
    }
    // выходы
    if (name === 'dream' && (gx + gy) % 2 === 0) { const p = freeCell(m, rng, T.DREAMFLOOR); if (p) { set(m, p.x, p.y, T.PORTAL); m.feat[I(p.x, p.y)] = { k: 'link', to: 'wake', name: 'дверь пробуждения' }; } }
    if (name === 'void' && gx === 0 && gy === 0) { const p = freeCell(m, rng, T.VOIDFLOOR); if (p) { set(m, p.x, p.y, T.PORTAL); m.feat[I(p.x, p.y)] = { k: 'link', to: 'ret', name: 'трещина света' }; } }
    if ((name === 'moon' || name === 'depths') && center) { set(m, cx + 4, cy + 2, name === 'moon' ? T.DOWN : T.UP); m.feat[I(cx + 4, cy + 2)] = { k: 'link', to: 'ret', name: name === 'moon' ? 'лестница вниз' : 'путь наверх' }; }
    if (name === 'time' && center) { set(m, cx, cy + 2, T.PORTAL); m.feat[I(cx, cy + 2)] = { k: 'link', to: 'ret', name: 'щель между секундами' }; }
    if (name === 'spirit' && center) { /* перевозчик возвращает */ }
    // боссы измерений
    for (const b of W.bosses) if (b.dim === name && center) m.lairs.push({ b: b.i, x: cx + 8, y: cy });
    m.entry = findWalkNear(m, cx, cy + 1);
    ensureConn(m, rng, m.entry, [[cx, 1], [cx, MH - 2], [1, cy], [MW - 2, cy]].filter(([x, y]) => TL[get(m, x, y)].walk));
    m.spawn = { biome: dd.biome === 'undersea' ? 'undersea' : name, danger: (D.biomes[dd.biome].dg || 5) + 4 };
    return m;
  }

  function buildMirror(W, mx, my, key) {
    // отражение: регион (WS-1-x, y), зеркально перевёрнутый
    const src = buildOver(W, WS - 1 - mx, my, '', 'tmp');
    const m = newMap(key, 'dim');
    m.dimName = 'mirror'; m.dim = 1; m.dimGrid = WS; m.gx = mx; m.gy = my;
    m.biome = 'mirror'; m.tint = 'mirror'; m.outdoor = true;
    m.region = src.region; m.mirrorOf = src.region.id;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) m.tiles[I(x, y)] = src.tiles[I(MW - 1 - x, y)];
    for (const k in src.feat) { const f = src.feat[k]; const x = k % MW, y = Math.floor(k / MW); if (f.k === 'link') { set(m, MW - 1 - x, y, T.RUBBLE); continue; } m.feat[I(MW - 1 - x, y)] = f; }
    for (const k in src.chests) { const x = k % MW, y = Math.floor(k / MW); m.chests[I(MW - 1 - x, y)] = { items: [], opened: 0 }; }
    m.spots = {};
    if (mx === (WS >> 1) && my === (WS >> 1)) m.lairs.push({ b: W.bossById.b_mirror.i, x: MW >> 1, y: MH >> 1 });
    else if (U.hash(W.seed, 'mir', mx, my) % 30 === 0) m.lairs.push({ b: W.bossById.b_mirror.i, x: MW >> 1, y: (MH >> 1) + 2 });
    m.spawn = { biome: 'mirror', danger: src.region.danger + 3 };
    m.entry = findWalkNear(m, MW >> 1, MH >> 1);
    return m;
  }

  function buildSea(W, rid, key) {
    const g = W.regions[rid];
    const s = W.settlements[g.seaCity];
    const m = newMap(key, 'dim');
    m.dimName = 'sea'; m.dim = 1; m.region = g; m.rid = rid; m.biome = 'undersea'; m.dark = true; m.outdoor = false; m.underwater = 1;
    const rng = U.rng(W.seed, 'sea', rid);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const n = U.fbm(W.seed + 333, x / 8, y / 8, 3), h = rng.next();
      let t = h < 0.05 ? T.CORAL : T.SEAFLOOR;
      if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1 || n > 0.72) t = T.CORAL;
      m.tiles[I(x, y)] = t;
    }
    if (s) {
      const fake = Object.assign({}, s, { b: Object.assign({}, s.b, { walls: 0, fields: 0, dock: 0, mine: 0, grave: 0 }) });
      buildSettlementSea(m, W, fake, rng);
    }
    const cx = MW >> 1, cy = MH >> 1;
    set(m, 3, 3, T.UP); m.feat[I(3, 3)] = { k: 'link', to: 'ret', name: 'к поверхности' };
    m.entry = { x: 4, y: 4 };
    m.npcsPlaced.push({ id: W.special.deepelder, x: cx + 1, y: cy + 1 });
    for (const b of W.bosses) if (b.dim === 'sea') { m.lairs.push({ b: b.i, x: MW - 6, y: MH - 5 }); break; }
    ensureConn(m, rng, m.entry, [[cx, cy]]);
    m.spawn = { biome: 'undersea', danger: g.danger + 2 };
    return m;
  }
  function buildSettlementSea(m, W, s, rng) {
    const saveBiome = m.biome;
    buildSettlement(m, W, s, rng);
    // заменить материалы на подводные
    for (let i = 0; i < m.tiles.length; i++) {
      const t = m.tiles[i];
      if (t === T.WALL || t === T.TOWNWALL) m.tiles[i] = T.CORALWALL;
      else if (t === T.GRASS || t === T.TALLGRASS || t === T.COBBLE || t === T.ROAD || t === T.FLOOR || t === T.STONEFLOOR) m.tiles[i] = T.SEAFLOOR;
      else if (t === T.WELL) m.tiles[i] = T.CORAL;
    }
    m.biome = saveBiome;
  }
})(window.EOF);
