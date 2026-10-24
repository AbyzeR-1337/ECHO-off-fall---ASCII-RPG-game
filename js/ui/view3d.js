'use strict';
// Мир от первого лица (уровень графики 6, «Пиксели 3D»).
// Из карты игры собирается 3D-сцена: земля, стены, двускатные крыши, потолки в домах и пещерах;
// деревья, вещи, люди и звери — пиксельные спрайты, повёрнутые к камере нужной стороной.
// Ходьба — по клеткам, как и во всей игре: «вперёд» — туда, куда смотришь; поворот — на 45°.
(function (E) {
  const U = E.U, T = E.T, TL = E.TL, G = E.G, UI = E.UI, Gfx = E.Gfx, D = E.D, Time = E.Time;
  const V3 = UI.V3 = { face: 4, yaw: Math.PI, yawT: Math.PI, last: 0, sig: '', drag: null, head: new Map() };
  const DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const EYE = 0.8, WALL = 1.5, CAVE = 2.0, R = 22, K_ENT = 0.7;
  UI.is3D = () => UI.gfxLevel === 6 && !!Gfx.P3 && Gfx.P3.supported();
  const turnTo = (f) => { V3.face = (f + 8) % 8; const t = V3.face * Math.PI / 4; let d = t - V3.yawT; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; V3.yawT += d; UI.animUntil = performance.now() + 400; };
  V3.turn = (k) => { turnTo(V3.face + k); UI.render(); };
  V3.dirRel = (k) => DIRS[(V3.face + k + 8) % 8];
  const DIRN = ['север', 'северо-восток', 'восток', 'юго-восток', 'юг', 'юго-запад', 'запад', 'северо-запад'];
  const DIRS_SHORT = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];

  // ---------- что чем рисовать ----------
  const GTEX = { grass: 'grass', grass_dry: 'grass_dry', grass_frost: 'grass_frost', tallgrass: 'tallgrass', flowers: 'flowers', roots: 'roots', sand: 'sand', dune: 'dune', stones: 'stones', snow: 'snow', drift: 'snow', ice: 'ice', hill: 'grass', rock: 'rockfloor', floor: 'planks', stonefloor: 'stonetiles', road: 'dirt', cobble: 'cobble', water: 'water', shallow: 'water:s', stream: 'water:r', swamp: 'swamp', bog: 'water:b', lava: 'lava', ash: 'ash', cloud: 'cloud', deck: 'deck', rubble: 'rubble', bones: 'bones', field: 'field', field_bare: 'soil', soil: 'soil', mirrorwater: 'water:m', blacksnow: 'blacksnow', flesh: 'flesh', moondust: 'moondust', crater: 'crater', dreamfloor: 'dream', voidfloor: 'voidfloor', timefloor: 'timefloor', seafloor: 'seafloor', spiritfloor: 'spirit', mist: 'mist', nightgrass: 'nightgrass', nightflower: 'nightgrass' };
  const WTEX = { townwall: 'townwall', treewall: 'treewall', coralwall: 'coral', cave: 'cave', crackwall: 'crack', mountain: 'mountain', peak: 'peak', icerock: 'icerock', basalt: 'basalt', ore: 'ore', bigtree: 'bark', fleshwall: 'fleshwall', dreamwall: 'dreamwall', clockwall: 'clockwall', shelf: 'shelf' };
  const WH = { wall: WALL, window: WALL, door: WALL, townwall: 2.1, treewall: 2.2, coralwall: 1.6, cave: CAVE, crackwall: CAVE, ore: CAVE, mountain: 2.4, peak: 3.4, icerock: 2.0, basalt: 2.2, bigtree: 4.5, fleshwall: 2.0, dreamwall: 2.0, clockwall: 2.0, shelf: 1.25 };
  const ROOFTEX = { thatch: 'roof_thatch', tiles: 'roof_tiles', slate: 'roof_slate', temple: 'roof_temple', palace: 'roof_palace', wood: 'roof_wood' };
  const TREES = new Set(['tree', 'tree2', 'pine', 'pine_snow', 'tree_bare', 'deadtree']);
  // симметричные вещи снимаются одним углом
  const SYM = new Set(['tree', 'tree2', 'pine', 'pine_snow', 'bush', 'boulder', 'campfire', 'mushroom', 'bigshroom', 'fern', 'reeds', 'sapling', 'crystal', 'coral', 'cactus', 'well', 'pillar', 'portal', 'whirlpool', 'tent', 'tree_bare', 'deadtree']);
  const isLow = (tid) => TL[tid].water === 2 || TL[tid].water === 1 || TL[tid].lava;
  // природная земля «перетекает» в соседнюю с меньшим рангом — мягкий край вместо квадратов
  const SPILL = { grass: 1, grass_dry: 1, grass_frost: 1, nightgrass: 1, flowers: 1, tallgrass: 1, field: 2, soil: 2, swamp: 2, roots: 2, dirt: 3, stones: 3, ash: 4, moondust: 4, sand: 4, dune: 4, snow: 5, blacksnow: 5 };
  const EDGES = [[0, -1, 2], [1, 0, 3], [0, 1, 4], [-1, 0, 5], [1, -1, 6], [1, 1, 7], [-1, 1, 8], [-1, -1, 9]];

  // ---------- сборка мира ----------
  function wallTex(M, roofs, bk, x, y) {
    if (bk === 'wall' || bk === 'window' || bk === 'door') {
      const rf = roofs.find((r) => x >= r.rect.x && y >= r.rect.y && x < r.rect.x + r.rect.w && y < r.rect.y + r.rect.h);
      const timber = rf && (rf.style === 'thatch' || rf.style === 'wood');
      const stone = !rf || rf.style === 'temple' || rf.style === 'palace';
      if (bk === 'wall') return timber ? 'timber' : stone ? 'brick:s' : 'brick';
      return bk + (timber ? ':t' : '');
    }
    return WTEX[bk] || 'cave';
  }
  function build(m, cx, cy, inside, X) {
    const P3 = Gfx.P3, M = P3.mesh();
    const { GK, BK, OK, FIX } = X;
    const roofs = X.roofsOf(m);
    const under = m.outdoor !== false && !m.dun;
    const dungeon = !m.outdoor;
    const tidAt = (x, y) => m.tiles[U.clamp(y, 0, m.h - 1) * m.w + U.clamp(x, 0, m.w - 1)];
    const bAt = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? null : BK[m.tiles[y * m.w + x]]);
    const hOf = (bk, x, y) => { let h = WH[bk] || WALL; if (bk === 'mountain') h += U.hash(x, y, 7) % 7 * 0.12; if (bk === 'peak') h += U.hash(x, y, 9) % 5 * 0.2; if (dungeon && h < CAVE && bk !== 'shelf') h = CAVE; return h; };
    const gy = (tid) => (TL[tid].water === 2 || TL[tid].lava ? -0.14 : TL[tid].water === 1 ? -0.07 : 0);
    const objs = [], lights = [];
    let gnd = m._gndKey || 'grass';
    const groundKey = (x, y, tid) => {
      if (FIX[tid]) return FIX[tid];
      if (GK[tid]) return GK[tid];
      if (TL[tid].indoor) return 'floor';
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) { const t2 = tidAt(x + dx, y + dy); if (GK[t2] && !isLow(t2)) return GK[t2]; }
      return gnd;
    };
    const season = E.Gm.season(), cold = m.region && m.region.t < 0.55;
    const gtex = (k, x, y) => {
      if (k === 'grass') { if (season === 2 && m.biome !== 'desert') k = 'grass_dry'; else if (season === 3 && cold && m.outdoor) k = 'grass_frost'; }
      const t = GTEX[k] || 'rockfloor';
      return t === 'grass' || t === 'grass_dry' || t === 'grass_frost' ? t + ':' + (U.hash(x, y, 3) % 3) : t;
    };
    const fol = season === 2 ? ['#c08a30', '#b05a2a', '#c8a040'] : season === 0 ? ['#5a9a40', '#4a8a3a'] : ['#3e7b34', '#4a8a3c'];
    for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
      const inMap = x >= 0 && y >= 0 && x < m.w && y < m.h;
      const tid = tidAt(x, y);
      if (inMap && !m.ex[y * m.w + x] && !G.vis[y * m.w + x] && dungeon) continue; // подземелья — только увиденное
      const bk = inMap ? BK[tid] : null;
      const indoorT = TL[tid].indoor || inside && inside.rect && x > inside.rect.x && y > inside.rect.y && x < inside.rect.x + inside.rect.w - 1 && y < inside.rect.y + inside.rect.h - 1;
      const sky = dungeon ? 0 : indoorT ? 0.3 : 1;
      if (bk && bk !== 'door') {
        const h = hOf(bk, x, y), tex = wallTex(M, roofs, bk, x, y);
        P3.quad(M, [x, h, y + 1], [x + 1, h, y + 1], [x + 1, h, y], [x, h, y], [0, 0], [1, 1], bk === 'mountain' || bk === 'peak' || bk === 'cave' ? tex : 'roof_slate', [0, 1, 0], dungeon ? 0 : 1);
        for (const [dx, dy, nx, nz] of [[0, -1, 0, -1], [1, 0, 1, 0], [0, 1, 0, 1], [-1, 0, -1, 0]]) {
          const nb = bAt(x + dx, y + dy);
          const nh = nb && nb !== 'door' ? hOf(nb, x + dx, y + dy) : (nb === 'door' ? 0 : gy(tidAt(x + dx, y + dy)));
          if (nb && nb !== 'door' && nh >= h) continue;
          const b0 = Math.min(nh, 0) - (isLow(tidAt(x + dx, y + dy)) ? 0.14 : 0);
          // грань со стороны соседа
          let p0, p1;
          if (dy === -1) { p0 = [x + 1, 0, y]; p1 = [x, 0, y]; } else if (dx === 1) { p0 = [x + 1, 0, y + 1]; p1 = [x + 1, 0, y]; } else if (dy === 1) { p0 = [x, 0, y + 1]; p1 = [x + 1, 0, y + 1]; } else { p0 = [x, 0, y]; p1 = [x, 0, y + 1]; }
          const bot = nb && nb !== 'door' ? nh : b0;
          const fsky = dungeon ? 0 : TL[tidAt(x + dx, y + dy)].indoor ? 0.3 : 1;
          P3.quad(M, [p0[0], bot, p0[2]], [p1[0], bot, p1[2]], [p1[0], h, p1[2]], [p0[0], h, p0[2]], [0, h - bot], [1, 0], tex, [nx, 0, nz], fsky);
        }
        continue;
      }
      // пол
      const gk = groundKey(x, y, tid);
      const isVoid = gk === 'void';
      const y0 = gy(tid);
      if (!isVoid) P3.quad(M, [x, y0, y + 1], [x + 1, y0, y + 1], [x + 1, y0, y], [x, y0, y], [0, 0], [1, 1], gtex(gk, x, y), [0, 1, 0], sky, TL[tid].water ? 1 : 0);
      // мягкие края соседней земли
      const rk = SPILL[GTEX[gk]] || 0;
      if (rk && y0 === 0 && inMap) {
        const side = new Set();
        for (const [dx, dy, kind] of EDGES) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
          const t2 = m.tiles[ny * m.w + nx];
          if (BK[t2] || isLow(t2) || TL[t2].indoor) continue;
          const k2 = groundKey(nx, ny, t2), r2 = SPILL[GTEX[k2]] || 0;
          if (r2 <= rk) continue;
          const tk = GTEX[k2];
          if (kind >= 6) { if (side.has(tk + (dx > 0 ? 3 : 5)) || side.has(tk + (dy > 0 ? 4 : 2))) continue; } else side.add(tk + kind);
          const e = 0.004;
          P3.quad(M, [x, e, y + 1], [x + 1, e, y + 1], [x + 1, e, y], [x, e, y], [0, 0], [1, 1], gtex(k2, x, y), [0, 1, 0], sky, kind);
        }
      }
      // берег: от пониженной воды до земли соседа
      if (y0 < 0) for (const [dx, dy, nx, nz] of [[0, -1, 0, 1], [1, 0, -1, 0], [0, 1, 0, -1], [-1, 0, 1, 0]]) {
        const t2 = tidAt(x + dx, y + dy);
        if (bAt(x + dx, y + dy)) continue;
        const y1 = gy(t2);
        if (y1 <= y0) continue;
        let p0, p1;
        if (dy === -1) { p0 = [x, 0, y]; p1 = [x + 1, 0, y]; } else if (dx === 1) { p0 = [x + 1, 0, y]; p1 = [x + 1, 0, y + 1]; } else if (dy === 1) { p0 = [x + 1, 0, y + 1]; p1 = [x, 0, y + 1]; } else { p0 = [x, 0, y + 1]; p1 = [x, 0, y]; }
        P3.quad(M, [p0[0], y0, p0[2]], [p1[0], y0, p1[2]], [p1[0], y1, p1[2]], [p0[0], y1, p0[2]], [0, 0], [1, 0.3], 'dirt', [nx, 0, nz], sky);
      }
      // дверной проём: перемычка над проходом
      if (bk === 'door') {
        const tex = wallTex(M, roofs, 'wall', x, y), top = dungeon ? CAVE : WALL, lo = 1.12;
        const ew = !!bAt(x - 1, y) && !!bAt(x + 1, y); // стена идёт с запада на восток — проход с севера на юг
        if (ew) { P3.quad(M, [x, lo, y + 1], [x + 1, lo, y + 1], [x + 1, top, y + 1], [x, top, y + 1], [0, 0], [1, top - lo], tex, [0, 0, 1], sky); P3.quad(M, [x + 1, lo, y], [x, lo, y], [x, top, y], [x + 1, top, y], [0, 0], [1, top - lo], tex, [0, 0, -1], sky); }
        else { P3.quad(M, [x, lo, y], [x, lo, y + 1], [x, top, y + 1], [x, top, y], [0, 0], [1, top - lo], tex, [-1, 0, 0], sky); P3.quad(M, [x + 1, lo, y + 1], [x + 1, lo, y], [x + 1, top, y], [x + 1, top, y + 1], [0, 0], [1, top - lo], tex, [1, 0, 0], sky); }
        P3.quad(M, [x, lo, y], [x + 1, lo, y], [x + 1, lo, y + 1], [x, lo, y + 1], [0, 0], [1, 1], 'ceiling_wood', [0, -1, 0], sky);
      }
      // потолок: в пещерах и подземельях, в доме, где ты сейчас
      if (dungeon) P3.quad(M, [x, CAVE, y], [x + 1, CAVE, y], [x + 1, CAVE, y + 1], [x, CAVE, y + 1], [0, 0], [1, 1], 'ceiling_rock', [0, -1, 0], 0);
      else if (inside && inside.rect && x >= inside.rect.x && y >= inside.rect.y && x < inside.rect.x + inside.rect.w && y < inside.rect.y + inside.rect.h) P3.quad(M, [x, WALL, y], [x + 1, WALL, y], [x + 1, WALL, y + 1], [x, WALL, y + 1], [0, 0], [1, 1], 'ceiling_wood', [0, -1, 0], 0.3);
      // вещи на клетке — спрайты
      if (inMap && OK[tid]) {
        let ok = OK[tid], c = null;
        const hh = (x * 7 + y * 13) % 5;
        if (ok === 'tree') { if (season === 3 && cold) ok = 'tree_bare'; else { ok = hh < 2 ? 'tree2' : 'tree'; c = fol[(x + y * 3) % fol.length]; } }
        else if (ok === 'pine') { if ((season === 3 && cold) || m.biome === 'ice' || m.biome === 'tundra') ok = 'pine_snow'; else c = (x + y) % 3 ? '#2e6b55' : '#3a7a5a'; }
        objs.push({ k: ok, x, y, c, seed: (x * 7 + y * 13) | 0 });
      }
      if (inMap && X.HLIGHT[tid]) { const d = X.HLIGHT[tid]; lights.push({ x: x + 0.5, y: 0.6, z: y + 0.5, r: d[2] * 1.1, col: d[0], i: d[1] * 0.9, fl: d[3] }); }
    }
    // двускатные крыши над домами, где тебя нет
    for (const rf of roofs) {
      const r = rf.rect;
      if (inside && inside.rect === r) continue;
      if (!X.roofIntact(m, r)) continue;
      if (r.x + r.w < cx - R || r.y + r.h < cy - R || r.x > cx + R || r.y > cy + R) continue;
      const tex = ROOFTEX[rf.style] || 'roof_thatch', wtex = rf.style === 'thatch' || rf.style === 'wood' ? 'timber' : rf.style === 'temple' || rf.style === 'palace' ? 'brick:s' : 'brick';
      const o = 0.14, x0 = r.x - o, x1 = r.x + r.w + o, z0 = r.y - o, z1 = r.y + r.h + o, b = WALL;
      if (r.w >= r.h) {
        const zm = r.y + r.h / 2, top = b + r.h * 0.4, sl = Math.hypot(r.h / 2 + o, top - b);
        const n1 = [0, (r.h / 2 + o) / sl, -(top - b) / sl], n2 = [0, n1[1], -n1[2]];
        P3.quad(M, [x0, b, z0], [x1, b, z0], [x1, top, zm], [x0, top, zm], [0, sl], [x1 - x0, 0], tex, n1, 1);
        P3.quad(M, [x1, b, z1], [x0, b, z1], [x0, top, zm], [x1, top, zm], [0, sl], [x1 - x0, 0], tex, n2, 1);
        P3.tri(M, [r.x, b, r.y], [r.x, b, r.y + r.h], [r.x, top, zm], [0, top - b], [r.h, top - b], [r.h / 2, 0], wtex, [-1, 0, 0], 1);
        P3.tri(M, [r.x + r.w, b, r.y + r.h], [r.x + r.w, b, r.y], [r.x + r.w, top, zm], [0, top - b], [r.h, top - b], [r.h / 2, 0], wtex, [1, 0, 0], 1);
      } else {
        const xm = r.x + r.w / 2, top = b + r.w * 0.4, sl = Math.hypot(r.w / 2 + o, top - b);
        const n1 = [-(top - b) / sl, (r.w / 2 + o) / sl, 0], n2 = [-n1[0], n1[1], 0];
        P3.quad(M, [x0, b, z1], [x0, b, z0], [xm, top, z0], [xm, top, z1], [0, sl], [z1 - z0, 0], tex, n1, 1);
        P3.quad(M, [x1, b, z0], [x1, b, z1], [xm, top, z1], [xm, top, z0], [0, sl], [z1 - z0, 0], tex, n2, 1);
        P3.tri(M, [r.x + r.w, b, r.y], [r.x, b, r.y], [xm, top, r.y], [0, top - b], [r.w, top - b], [r.w / 2, 0], wtex, [0, 0, -1], 1);
        P3.tri(M, [r.x, b, r.y + r.h], [r.x + r.w, b, r.y + r.h], [xm, top, r.y + r.h], [0, top - b], [r.w, top - b], [r.w / 2, 0], wtex, [0, 0, 1], 1);
      }
    }
    P3.setWorld(M);
    return { objs, lights };
  }

  // ---------- небо и свет ----------
  const DIMC = { dream: [[0.28, 0.18, 0.42], [0.55, 0.42, 0.7]], spirit: [[0.06, 0.2, 0.2], [0.3, 0.55, 0.5]], void: [[0.01, 0.01, 0.03], [0.04, 0.04, 0.08]], time: [[0.3, 0.24, 0.1], [0.7, 0.58, 0.32]], moon: [[0.02, 0.02, 0.05], [0.12, 0.12, 0.18]], flesh: [[0.25, 0.04, 0.08], [0.45, 0.12, 0.16]], sea: [[0.02, 0.1, 0.2], [0.06, 0.25, 0.4]], depths: [[0.15, 0.05, 0.02], [0.35, 0.12, 0.04]], mirror: [[0.4, 0.45, 0.55], [0.75, 0.8, 0.88]] };
  const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function skyOf(m, hs) {
    const HF = Gfx.HF, s = HF.sky(hs);
    const day = s.day, over = s.over || 0;
    // настоящая высота солнца (HF.sky держит его над горизонтом ради освещения)
    const md = ((hs.time % 1440) + 1440) % 1440, ang = (md / 1440 - 0.25) * Math.PI * 2;
    const el = Math.sin(ang), sl = Math.hypot(Math.cos(ang), 0.42, el);
    const sunReal = [Math.cos(ang) / sl, el / sl, 0.42 / sl];
    const dusk = Math.max(0, 1 - Math.abs(el - 0.02) / 0.2);
    let zen = mix3([0.02, 0.03, 0.08], [0.3, 0.5, 0.86], day), hor = mix3([0.05, 0.07, 0.14], [0.72, 0.82, 0.92], day);
    hor = mix3(hor, [0.95, 0.58, 0.32], dusk * 0.7); zen = mix3(zen, [0.32, 0.3, 0.52], dusk * 0.4);
    const grey = mix3([0.08, 0.08, 0.1], [0.55, 0.57, 0.6], day);
    zen = mix3(zen, grey, over * 0.85); hor = mix3(hor, grey, over * 0.8);
    let fogD = 0.04 + over * 0.03 + (1 - day) * 0.02;
    const w = hs.weather;
    if (w === 'fog') fogD = 0.2; else if (w === 'blizzard' || w === 'sandstorm') fogD = 0.14; else if (w === 'rain' || w === 'storm' || w === 'snow') fogD += 0.02;
    if (w === 'sandstorm') { hor = [0.7, 0.55, 0.35]; zen = [0.6, 0.48, 0.32]; }
    if (m.dimName && DIMC[m.dimName]) { zen = DIMC[m.dimName][0]; hor = DIMC[m.dimName][1]; fogD = 0.06; }
    const out = {
      zen, hor, fog: hor, fogD,
      sunDir: [s.S[0], s.S[2], s.S[1]], sunSky: sunReal, sun: s.sun.map((v) => v * 0.95), amb: s.amb.map((v) => v * 1.05),
      sunDisc: el > -0.06 ? [1.2, 1.0 - dusk * 0.3, 0.75 - dusk * 0.4].map((v) => v * (1 - over * 0.7) * Math.min(1, (el + 0.06) * 12)) : [0, 0, 0],
      moonDir: s.M ? [s.M[0], s.M[2], s.M[1]] : [0, -1, 0], stars: Math.max(0, 1 - day * 1.6) * (1 - over), cloud: Math.min(1, 0.25 + over), cloudC: mix3([0.1, 0.1, 0.14], [0.95, 0.95, 0.98], day * (1 - over * 0.5)),
      night: day < 0.35 ? 1 : 0, indoor: false,
    };
    // ночью светит луна: её направление вместо солнечного
    if (s.moon && s.M && el < 0) { const k = Math.min(1, -el * 5); out.sunDir = out.sunDir.map((v, i) => v * (1 - k) + out.moonDir[i] * k); const l = Math.hypot(...out.sunDir); out.sunDir = out.sunDir.map((v) => v / l); out.sun = out.sun.map((v, i) => v + s.moon[i] * 0.8); }
    if (!m.outdoor) { out.indoor = true; out.fog = [0.02, 0.018, 0.022]; out.fogD = 0.16; out.amb = [0.09, 0.082, 0.088]; out.sun = [0, 0, 0]; out.night = 1; out.hor = out.fog; out.zen = out.fog; }
    return out;
  }

  // ---------- кадр ----------
  let world = null, rafOn = false;
  UI.drawMap3D = function (t, L) {
    const m = G.map, P = G.P, X = UI.mvTiles, P3 = Gfx.P3;
    const now = performance.now();
    if (V3.mapKey !== m.key) { V3.mapKey = m.key; V3.bc = null; V3.sig = ''; }
    const dt = Math.min(0.1, (now - (V3.last || now)) / 1000); V3.last = now;
    const dpr = t.dpr || 1;
    const vx0 = L.mx * t.cw, vy0 = L.my * t.ch, vw = L.mw * t.cw, vh = L.mh * t.ch;
    const K = Math.max(2, Math.round(vh * dpr / 230));
    const fw = Math.max(64, Math.ceil(vw * dpr / K)), fh = Math.max(48, Math.ceil(vh * dpr / K));
    // поворот плавно
    let d = V3.yawT - V3.yaw;
    V3.yaw += d * Math.min(1, dt * 14);
    if (Math.abs(d) > 0.002) UI.animUntil = Math.max(UI.animUntil || 0, now + 60);
    const ps = X.track('P', P.x, P.y, now);
    const [ppx, ppy, pmov] = X.curPos(ps, now);
    const bob = pmov ? Math.sin(now / 55) * 0.015 : 0;
    // мир — пересобрать, если ушли далеко или что-то поменялось
    const rects = X.roofsOf(m);
    const inside = rects.find((r) => P.x >= r.rect.x && P.y >= r.rect.y && P.x < r.rect.x + r.rect.w && P.y < r.rect.y + r.rect.h && X.roofIntact(m, r.rect)) || null;
    let h = 0;
    for (let y = Math.max(0, (V3.bc ? V3.bc[1] : P.y) - R); y <= Math.min(m.h - 1, (V3.bc ? V3.bc[1] : P.y) + R); y++) for (let x = Math.max(0, (V3.bc ? V3.bc[0] : P.x) - R); x <= Math.min(m.w - 1, (V3.bc ? V3.bc[0] : P.x) + R); x++) { const i = y * m.w + x; h = (Math.imul(h, 31) + m.tiles[i] + (m.ex[i] ? 7 : 0)) | 0; }
    const far = !V3.bc || Math.abs(P.x - V3.bc[0]) > 7 || Math.abs(P.y - V3.bc[1]) > 7;
    const sig = m.key + '|' + (inside ? inside.rect.x + ',' + inside.rect.y : '') + '|' + E.Gm.season() + '|' + h;
    if (far || sig !== V3.sig || !world) {
      if (far) V3.bc = [P.x, P.y];
      world = build(m, V3.bc[0], V3.bc[1], inside, X);
      V3.sig = m.key + '|' + (inside ? inside.rect.x + ',' + inside.rect.y : '') + '|' + E.Gm.season() + '|' + (() => { let hh = 0; for (let y = Math.max(0, V3.bc[1] - R); y <= Math.min(m.h - 1, V3.bc[1] + R); y++) for (let x = Math.max(0, V3.bc[0] - R); x <= Math.min(m.w - 1, V3.bc[0] + R); x++) { const i = y * m.w + x; hh = (Math.imul(hh, 31) + m.tiles[i] + (m.ex[i] ? 7 : 0)) | 0; } return hh; })();
    }
    // небо и свет
    const w = E.Gm.weather();
    const hs = { time: G.S.time, outdoor: !!m.outdoor, dim: m.dimName || null, weather: m.outdoor && !m.dimName ? w : null, season: E.Gm.season(), cold: m.region && m.region.t < 0.55, fullMoon: E.Gm.fullMoon(), nightland: m.tint === 'night' };
    const sky = skyOf(m, hs);
    if (inside && m.outdoor) { sky.amb = sky.amb.map((v) => v * 0.7); }
    const cam = { x: ppx + 0.5, y: EYE + bob, z: ppy + 0.5, yaw: V3.yaw, pitch: -0.05, fov: 1.15 };
    const fx = Math.sin(V3.yaw), fz = -Math.cos(V3.yaw);
    // огни: ближние к камере + факел
    const lights = world.lights.map((l) => Object.assign({}, l, { i: l.fl ? l.i * (0.85 + 0.15 * Math.sin(now / 90 + l.x * 3)) : l.i, d: (l.x - cam.x) ** 2 + (l.z - cam.z) ** 2 })).sort((a, b) => a.d - b.d).slice(0, 7);
    const dark = !m.outdoor || m.dimName ? 1 : Math.max(0, 1 - Time.light(G.S.time) * 1.4);
    if (P.light > 0) lights.unshift({ x: cam.x + fx * 0.3, y: 0.95, z: cam.z + fz * 0.3, r: 6.5, col: [1, 0.68, 0.38], i: 1.35 * (0.9 + 0.1 * Math.sin(now / 70)) });
    else if (dark > 0.15) lights.unshift({ x: cam.x, y: 1.1, z: cam.z, r: 3.6, col: [0.5, 0.55, 0.78], i: 0.55 * dark });
    // свет для спрайтов (на процессоре: один цвет на спрайт)
    const litAt = (x, z, skyK) => {
      const c = [0.035, 0.03, 0.04];
      for (let i = 0; i < 3; i++) c[i] += sky.amb[i] * skyK + sky.sun[i] * 0.62 * skyK;
      for (const l of lights) { const dd = Math.hypot(l.x - x, l.z - z); const a = Math.max(0, 1 - dd / l.r); for (let i = 0; i < 3; i++) c[i] += l.col[i] * l.i * a * a; }
      return c;
    };
    const skyKAt = (x, y) => { if (!m.outdoor) return 0; const tid = m.tiles[U.clamp(y, 0, m.h - 1) * m.w + U.clamp(x, 0, m.w - 1)]; return TL[tid].indoor ? 0.3 : 1; };
    // спрайты
    const sprites = [];
    const PX = Gfx.PX;
    const budget = now + 22;
    const camAng = Math.atan2(fz, fx);
    const add = (key, o, wx, wz, heading, scale, frontK) => {
      const dx = wx - cam.x, dz = wz - cam.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 26) return;
      if ((dx * fx + dz * fz) < -0.6 && dist > 1.2) return; // позади
      // с какой стороны видна модель: угол камеры в осях модели
      let yaw = 0;
      if (!SYM.has(key)) {
        const front = PX.frontYaw(key);
        const viewAng = Math.atan2(dz, dx);
        let am = viewAng - (heading - (front ? 0 : Math.PI / 2));
        yaw = am + Math.PI / 2;
        yaw = Math.round(yaw / (Math.PI / 4)) * (Math.PI / 4);
        yaw = ((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      }
      const pk = key + '|' + yaw.toFixed(2) + '|' + (o.c || '') + '|' + (o.f || 0) + '|' + (o.moving ? 1 : 0) + '|' + (o.mode || 0) + '|' + (o.hit ? 1 : 0) + '|' + (o.seed || 0);
      let r = V3.sprCache && V3.sprCache.get(pk);
      if (!r) {
        if (performance.now() > budget) { V3.pending = true; return; }
        const sp = PX.sprite(key, o, { yaw, pitch: 0.12, ppu: 44 });
        if (!sp) return;
        r = P3.sprite(sp);
        (V3.sprCache = V3.sprCache || new Map()).set(pk, r);
        if (V3.sprCache.size > 3000) V3.sprCache.clear();
      }
      const sk = skyKAt(Math.floor(wx), Math.floor(wz));
      sprites.push({ r, x: wx, y: 0, z: wz, scale: scale || K_ENT, col: litAt(wx, wz, sk), d: dist });
    };
    V3.pending = false;
    for (const ob of world.objs) add(ob.k, { c: ob.c, seed: ob.seed % 3, f: ob.k === 'campfire' || ob.k === 'hearth' ? Math.floor(now / 160) % 4 : 0, season: E.Gm.season() }, ob.x + 0.5, ob.y + 0.5, Math.PI / 2, TREES.has(ob.k) ? 1.05 : K_ENT);
    // вещи на земле
    for (const it of m.items) { if (!G.vis[it.y * m.w + it.x]) continue; add(X.itemArt(it.it), {}, it.x + 0.5, it.y + 0.5, Math.PI / 2, K_ENT); }
    // существа
    const reveal = G.revealUntil && G.turn < G.revealUntil;
    for (const e of m.ents) {
      if (e.dead) continue;
      const vis = G.vis[e.y * m.w + e.x];
      if (!vis && !(reveal && e.kind !== 'npc')) continue;
      const s = X.track(e.id, e.x, e.y, now);
      const [ex, ey, moving] = X.curPos(s, now);
      // куда смотрит: по последнему шагу; враги — на тебя
      let hd = V3.head.get(e.id);
      const prev = V3.head.get('p' + e.id);
      if (prev && (prev[0] !== e.x || prev[1] !== e.y)) { hd = Math.atan2(e.y - prev[1], e.x - prev[0]); V3.head.set(e.id, hd); }
      V3.head.set('p' + e.id, [e.x, e.y]);
      if (hd == null || (e.hostile || e.hostileToP) && !moving) hd = Math.atan2(P.y - e.y, P.x - e.x);
      const key = X.entArt(e);
      const always = X.ALWAYS.has(key) || key.startsWith('b_');
      const f = always ? Math.floor((now + e.id * 137) / 220) % 4 : moving ? (s.step % 2 ? 1 : 3) : 0;
      let mode = vis ? 0 : 2;
      if (e.ghost || (e.kind === 'npc' && e.ai === 'wander' && e.immortal)) mode = 4;
      let c = e.c;
      if (e.kind === 'npc' && e.hostile) c = '#e07060';
      add(key, { c, f, moving, mode, hit: false }, ex + 0.5, ey + 0.5, hd, K_ENT);
    }
    sprites.sort((a, b) => b.d - a.d);
    // погода
    let wx = null;
    if (m.outdoor && !m.dimName && !inside) {
      if (w === 'rain') wx = { kind: 1, dens: 0.1, col: [0.65, 0.72, 0.9] };
      else if (w === 'storm') wx = { kind: 1, dens: 0.18, col: [0.7, 0.75, 0.95] };
      else if (w === 'snow') wx = { kind: 2, dens: 0.05, col: [0.95, 0.97, 1] };
      else if (w === 'blizzard') wx = { kind: 2, dens: 0.12, col: [0.95, 0.97, 1] };
      else if (w === 'blacksnow') wx = { kind: 2, dens: 0.06, col: [0.2, 0.2, 0.24] };
      else if (w === 'ashrain') wx = { kind: 2, dens: 0.06, col: [0.55, 0.52, 0.5] };
    }
    const frame = { w: fw, h: fh, time: now / 1000, cam, sky, lights, sprites, wx };
    const gcv = P3.render(frame);
    V3.view = { vx0, vy0, vw, vh, fw, fh, K, dpr };
    UI.mv3 = V3.view;
    // хинты [E]: проекция центра клетки
    UI.mvRect3 = (x, y) => {
      if (x === P.x && y === P.y) return { x: vx0 + vw / 2 - 20, y: vy0 + vh - 60, w: 40, h: 20 };
      const p = P3.project(x + 0.5, 1.0, y + 0.5);
      if (!p) return null;
      const sx = vx0 + p[0] / fw * vw, sy = vy0 + p[1] / fh * vh;
      if (sx < vx0 || sx > vx0 + vw || sy < vy0 || sy > vy0 + vh) return null;
      return { x: sx - 20, y: sy, w: 40, h: 20 };
    };
    t.under = (ctx) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(vx0, vy0, vw, vh); ctx.clip();
      ctx.imageSmoothingEnabled = false;
      if (gcv) ctx.drawImage(gcv, vx0, vy0, fw * K / dpr, fh * K / dpr);
      drawCompass(ctx, t, vx0, vy0, vw);
      drawMinimap(ctx, m, P, vx0 + vw - 8, vy0 + 8, Math.round(Math.min(vw, vh) * 0.22), K / dpr);
      // попадание по тебе — красная вспышка по краям
      if (G.hitFlash && now - G.hitFlash < 200) { ctx.fillStyle = 'rgba(200,30,20,' + (0.25 * (1 - (now - G.hitFlash) / 200)) + ')'; ctx.fillRect(vx0, vy0, vw, vh); }
      ctx.restore();
    };
    if ((V3.pending || Math.abs(V3.yawT - V3.yaw) > 0.002) && !rafOn) { rafOn = true; requestAnimationFrame(() => { rafOn = false; UI.render(); }); }
  };
  function drawCompass(ctx, t, x0, y0, w) {
    const s = DIRS_SHORT[V3.face];
    ctx.font = '700 ' + Math.max(11, Math.round(t.fpx * 0.9)) + 'px ' + t.family;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(10,8,6,0.6)'; ctx.fillRect(x0 + w / 2 - 34, y0 + 4, 68, t.fpx * 1.4);
    ctx.fillStyle = '#e8d8a8'; ctx.fillText('‹ ' + s + ' ›', x0 + w / 2, y0 + 6);
  }
  // маленькая карта: всё, что видел, и куда смотришь
  let MM = null;
  function drawMinimap(ctx, m, P, xr, y0, size, px) {
    const X = UI.mvTiles, n = 25, half = 12;
    if (!MM) { MM = document.createElement('canvas'); MM.width = n; MM.height = n; }
    const c = MM.getContext('2d'), img = c.createImageData(n, n), d = img.data;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = P.x - half + i, y = P.y - half + j, k = (j * n + i) * 4;
      d[k + 3] = 200;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      const mi = y * m.w + x;
      if (!m.ex[mi] && !G.vis[mi]) continue;
      const tid = m.tiles[mi];
      let col = TL[tid].fg || '#666666';
      if (X.BK[tid]) col = '#b8b0a0';
      const v = parseInt(col.slice(1), 16), dim = G.vis[mi] ? 1 : 0.55;
      d[k] = ((v >> 16) & 255) * dim * 0.75; d[k + 1] = ((v >> 8) & 255) * dim * 0.75; d[k + 2] = (v & 255) * dim * 0.75;
    }
    for (const e of m.ents) { if (e.dead || !G.vis[e.y * m.w + e.x]) continue; const i = e.x - P.x + half, j = e.y - P.y + half; if (i < 0 || j < 0 || i >= n || j >= n) continue; const k = (j * n + i) * 4; const hc = e.hostile || e.hostileToP; d[k] = hc ? 255 : 240; d[k + 1] = hc ? 60 : 220; d[k + 2] = hc ? 50 : 120; }
    c.putImageData(img, 0, 0);
    const s = Math.max(2, Math.floor(size / n));
    const W = s * n, x0 = xr - W;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x0 - 2, y0 - 2, W + 4, W + 4);
    ctx.drawImage(MM, x0, y0, W, W);
    // ты — стрелка
    const cx = x0 + half * s + s / 2, cy = y0 + half * s + s / 2, a = V3.yaw;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * s * 1.6, cy - Math.cos(a) * s * 1.6);
    ctx.lineTo(cx + Math.sin(a + 2.5) * s, cy - Math.cos(a + 2.5) * s);
    ctx.lineTo(cx + Math.sin(a - 2.5) * s, cy - Math.cos(a - 2.5) * s);
    ctx.closePath(); ctx.fill();
  }
  // клетка мира под точкой экрана (клик по земле)
  UI.mvTileAt3 = function (px, py) {
    const v = V3.view, P3 = Gfx.P3;
    if (!v) return null;
    const r = P3.ray((px - v.vx0) / v.vw * v.fw, (py - v.vy0) / v.vh * v.fh);
    if (!r || r.d[1] >= -0.001) return null;
    const t = (0 - r.o[1]) / r.d[1];
    if (t > 30) return null;
    return [Math.floor(r.o[0] + r.d[0] * t), Math.floor(r.o[2] + r.d[2] * t)];
  };
  // перетаскивание по карте — поворот головы
  V3.dragStart = function (px) { V3.drag = { x0: px, yaw0: V3.yawT, moved: false }; };
  V3.dragMove = function (px) {
    const d = V3.drag;
    if (!d) return;
    if (Math.abs(px - d.x0) > 6) d.moved = true;
    if (!d.moved) return;
    V3.yawT = d.yaw0 + (px - d.x0) * 0.008;
    V3.yaw = V3.yawT;
    UI.render();
  };
  V3.dragEnd = function () {
    const d = V3.drag;
    V3.drag = null;
    if (!d || !d.moved) return false;
    const f = Math.round(V3.yawT / (Math.PI / 4));
    V3.face = ((f % 8) + 8) % 8;
    V3.yawT = f * Math.PI / 4;
    UI.render();
    return true;
  };
  V3.dirName = () => DIRN[V3.face];
  // при входе на новую карту — смотреть туда же, куда шли
  V3.onMap = () => { V3.bc = null; V3.sig = ''; };
})(window.EOF);
