'use strict';
// Мир от первого лица (уровень графики 6, «Пиксели 3D»).
// Земля — с холмами и горами: высота идёт из карты мира (высота региона, горы, море) и мелкого шума.
// Видно далеко: вокруг — соседние земли во всех подробностях (каждая — свой кусок-«чанк»),
// дальше — весь мир целиком: снежные хребты, леса, море и замки на горизонте.
// Дома — с двускатными крышами; зашёл внутрь — крыша над тобой исчезает, появляется потолок.
// Деревья, вещи, люди и звери — пиксельные спрайты, повёрнутые к камере нужной стороной.
// В живом мире (js/game/realtime.js) ходьба плавная, голова поворачивается мышью или пальцем.
(function (E) {
  const U = E.U, T = E.T, TL = E.TL, G = E.G, UI = E.UI, Gfx = E.Gfx, D = E.D, Time = E.Time, C = E.C;
  const MW = C.MW, MH = C.MH, WS = C.WS;
  const V3 = UI.V3 = { face: 4, yaw: Math.PI, yawT: Math.PI, pitch: 0, last: 0, drag: null, head: new Map(), cd: new Map(), mesh: new Map() };
  const DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const EYE = 0.82, WALL = 1.5, CAVE = 2.0, K_ENT = 0.7, SEA = -0.15;
  const NEAR = 110;  // в стольких клетках земля рисуется во всех подробностях
  const FARSPR = 130; // люди, звери и вещи видны так далеко
  UI.is3D = () => UI.gfxLevel === 6 && !!Gfx.P3 && Gfx.P3.supported();
  const live = () => !!(E.RT && E.RT.on);
  const turnTo = (f) => { V3.face = (f + 8) % 8; const t = V3.face * Math.PI / 4; let d = t - V3.yawT; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; V3.yawT += d; UI.animUntil = performance.now() + 400; };
  V3.turn = (k) => { if (live()) { V3.yaw += k * Math.PI / 4; V3.yawT = V3.yaw; UI.render(); return; } turnTo(V3.face + k); UI.render(); };
  V3.dirRel = (k) => DIRS[(V3.face + k + 8) % 8];
  const DIRN = ['север', 'северо-восток', 'восток', 'юго-восток', 'юг', 'юго-запад', 'запад', 'северо-запад'];
  const DIRS_SHORT = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
  const faceOf = (yaw) => ((Math.round(yaw / (Math.PI / 4)) % 8) + 8) % 8;

  // ---------- что чем рисовать ----------
  const GTEX = { grass: 'grass', grass_dry: 'grass_dry', grass_frost: 'grass_frost', tallgrass: 'tallgrass', flowers: 'flowers', roots: 'roots', sand: 'sand', dune: 'dune', stones: 'stones', snow: 'snow', drift: 'snow', ice: 'ice', hill: 'grass', rock: 'rockfloor', floor: 'planks', stonefloor: 'stonetiles', road: 'dirt', cobble: 'cobble', water: 'water', shallow: 'water:s', stream: 'water:r', swamp: 'swamp', bog: 'water:b', lava: 'lava', ash: 'ash', cloud: 'cloud', deck: 'deck', rubble: 'rubble', bones: 'bones', field: 'field', field_bare: 'soil', soil: 'soil', mirrorwater: 'water:m', blacksnow: 'blacksnow', flesh: 'flesh', moondust: 'moondust', crater: 'crater', dreamfloor: 'dream', voidfloor: 'voidfloor', timefloor: 'timefloor', seafloor: 'seafloor', spiritfloor: 'spirit', mist: 'mist', nightgrass: 'nightgrass', nightflower: 'nightgrass' };
  const WTEX = { townwall: 'townwall', treewall: 'treewall', coralwall: 'coral', cave: 'cave', crackwall: 'crack', mountain: 'mountain', peak: 'peak', icerock: 'icerock', basalt: 'basalt', ore: 'ore', bigtree: 'bark', fleshwall: 'fleshwall', dreamwall: 'dreamwall', clockwall: 'clockwall', shelf: 'shelf' };
  const WH = { wall: WALL, window: WALL, door: WALL, boarded: WALL, townwall: 2.3, treewall: 2.4, coralwall: 1.6, cave: CAVE, crackwall: CAVE, ore: CAVE, mountain: 2.4, peak: 3.4, icerock: 2.0, basalt: 2.2, bigtree: 4.5, fleshwall: 2.0, dreamwall: 2.0, clockwall: 2.0, shelf: 1.25 };
  const ROOFTEX = { thatch: 'roof_thatch', tiles: 'roof_tiles', slate: 'roof_slate', temple: 'roof_temple', palace: 'roof_palace', wood: 'roof_wood', shingle: 'roof_shingle', moss: 'roof_moss' };
  // стены домов: фахверк, кирпич, камень, брёвна, бут, мазанка — и суффикс для окон и дверей
  const MATWALL = { timber: ['timber', ':t'], brick: ['brick', ''], stone: ['brick:s', ':s'], log: ['log', ':l'], field: ['fieldstone', ':f'], daub: ['daub', ':d'], burnt: ['grime', ':f'] };
  const TALL = 2.7; // двухэтажный дом
  // на поверхности камень — это рельеф: скалы и горы, а не кубы
  const ROCK = new Set(['mountain', 'peak', 'icerock', 'basalt']);
  const ROCKTEX = { mountain: 'mountain', peak: 'peak', icerock: 'icerock', basalt: 'basalt' };
  const TREES = new Set(['tree', 'tree2', 'pine', 'pine_snow', 'tree_bare', 'deadtree']);
  // симметричные вещи снимаются одним углом и лежат в неподвижной сетке куска
  const SYM = new Set(['tree', 'tree2', 'pine', 'pine_snow', 'bush', 'boulder', 'mushroom', 'bigshroom', 'fern', 'reeds', 'sapling', 'crystal', 'coral', 'cactus', 'well', 'pillar', 'portal', 'whirlpool', 'tent', 'tree_bare', 'deadtree']);
  const ANIM = new Set(['campfire', 'hearth', 'portal', 'whirlpool']);
  const isLow = (tid) => TL[tid].water === 2 || TL[tid].water === 1 || TL[tid].lava;
  // природная земля «перетекает» в соседнюю с меньшим рангом — мягкий край вместо квадратов
  const SPILL = { grass: 1, grass_dry: 1, grass_frost: 1, nightgrass: 1, flowers: 1, tallgrass: 1, field: 2, soil: 2, swamp: 2, roots: 2, dirt: 3, stones: 3, ash: 4, moondust: 4, sand: 4, dune: 4, snow: 5, blacksnow: 5 };
  const EDGES = [[0, -1, 2], [1, 0, 3], [0, 1, 4], [-1, 0, 5], [1, -1, 6], [1, 1, 7], [-1, 1, 8], [-1, -1, 9]];
  const K = { GROUND: 0, WATER: 1, ROOF: 10, CEIL: 11, FAR: 20, FARSEA: 21, FAROBJ: 22 };

  // ============================================================
  // Рельеф: одна функция высоты на весь мир
  // ============================================================
  function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 362437) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, s) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, y, s, oct) { let f = 0, a = 0.5, t = 0; for (let i = 0; i < oct; i++) { f += a * vnoise(x, y, s + i * 17); t += a; x *= 2.03; y *= 2.03; a *= 0.5; } return f / t; }
  function ridge(x, y, s) { let f = 0, a = 0.5, t = 0, w = 1; for (let i = 0; i < 5; i++) { let n = 1 - Math.abs(vnoise(x, y, s + i * 31) * 2 - 1); n *= n; f += a * n * w; w = Math.min(1, n * 1.7); t += a; x *= 2.1; y *= 2.1; a *= 0.5; } return f / t; }
  const MTN = { mountain: 1, living: 0.9, volcanic: 0.55, ice: 0.4, tundra: 0.12, sky: 0, ancient: 0.08, forest: 0.04, ash: 0.1 };
  const FOREST = { forest: 1, ancient: 1, swamp: 0.45, plains: 0.12, tundra: 0.2, coast: 0.1, living: 0.3 };
  const HGT = UI.Hgt = {};
  let seed = 1;
  // поле по центрам регионов, сглаженное между ними
  function field(gx, gz, arr) {
    const fx = gx / MW - 0.5, fy = gz / MH - 0.5, ix = Math.floor(fx), iy = Math.floor(fy);
    let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const at = (x, y) => arr[U.clamp(y, 0, WS - 1) * WS + U.clamp(x, 0, WS - 1)];
    return (at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx) * (1 - ty) + (at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx) * ty;
  }
  let FE = null, FM = null, FF = null, FSKY = null, fieldsFor = null;
  function fields() {
    if (fieldsFor === G.W) return;
    fieldsFor = G.W; seed = (G.W.seed | 0) || 1;
    FE = new Float32Array(WS * WS); FM = new Float32Array(WS * WS); FF = new Float32Array(WS * WS); FSKY = new Float32Array(WS * WS);
    for (const g of G.W.regions) { const i = g.y * WS + g.x; FE[i] = g.e; FM[i] = MTN[g.biome] || 0; FF[i] = FOREST[g.biome] || 0; FSKY[i] = g.biome === 'sky' ? 1 : 0; }
  }
  HGT.base = (gx, gz) => (field(gx, gz, FE) - 0.45) * 26;
  HGT.hills = (gx, gz) => (fbm(gx / 24, gz / 24, seed + 3, 4) - 0.5) * 3.4 + (fbm(gx / 7, gz / 7, seed + 7, 2) - 0.5) * 0.6;
  HGT.mtn = (gx, gz) => field(gx, gz, FM);
  HGT.ridge = (gx, gz) => ridge(gx / 38, gz / 30, seed + 11);
  HGT.land = (gx, gz, hk) => Math.max(0.3, HGT.base(gx, gz) + HGT.hills(gx, gz) * (hk == null ? 1 : hk));
  HGT.rock = (gx, gz, mt) => 2.6 + HGT.ridge(gx, gz) * (6 + 52 * mt);
  // высота дальней земли (без подробностей карты)
  HGT.far = function (gx, gz) {
    const b = HGT.base(gx, gz) + HGT.hills(gx, gz);
    if (field(gx, gz, FSKY) > 0.5) return SEA - 30;
    if (b < 0.2) return b - 0.6;
    const mt = HGT.mtn(gx, gz);
    let h = Math.max(0.3, b) + Math.pow(mt, 1.4) * HGT.rock(gx, gz, 1) * 0.95;
    return h;
  };

  // ============================================================
  // Куски мира: карты регионов и их подготовка
  // ============================================================
  // cd — данные куска: карта, классы клеток (0 земля, 1 вода, 2 скала, 3 стена, 4 пропасть) и высоты
  const CL = { LAND: 0, WATER: 1, ROCK: 2, BLOCK: 3, VOID: 4 };
  function regionKey(rx, ry) {
    if (rx < 0 || ry < 0 || rx >= WS || ry >= WS) return null;
    const v = E.Sim.variant(ry * WS + rx);
    if (v === null) return null;
    return 'o:' + rx + ':' + ry + (v ? ':' + v : '');
  }
  function loadCD(rx, ry) {
    // кусок, где ты стоишь, — всегда живая карта, какой бы ни была её разновидность
    const cur = G.map && G.map.kind === 'over' && G.map.region.x === rx && G.map.region.y === ry;
    const key = cur ? G.map.key : regionKey(rx, ry);
    if (!key) return null;
    const ck = rx + ',' + ry;
    let cd = V3.cd.get(ck);
    const m = G.map && G.map.key === key ? G.map : null;
    if (cd && cd.key === key && (!m || cd.m === m)) return cd;
    let mm = m;
    if (!mm) {
      mm = G.cache && G.cache.get(key);
      if (!mm) {
        mm = E.MapGen.build(key);
        const dyn = G.S.maps[key];
        if (dyn && dyn.t) for (const k in dyn.t) mm.tiles[k] = dyn.t[k];
      }
    }
    // карта та же, что была (просто стала живой) — подготовку не повторяем
    if (cd && cd.key === key && sameTiles(cd.m, mm)) { cd.m = mm; return cd; }
    cd = { key, ck, rx, ry, ox: rx * MW, oz: ry * MH, m: mm, over: true };
    prep(cd);
    V3.cd.set(ck, cd);
    const old = V3.mesh.get(ck);
    if (old) { freeMesh(old); V3.mesh.delete(ck); }
    return cd;
  }
  function sameTiles(a, b) { if (!a || !b || a.tiles.length !== b.tiles.length) return false; for (let i = 0; i < a.tiles.length; i++) if (a.tiles[i] !== b.tiles[i]) return false; return true; }
  // карта соседнего региона — только клетки (для берегов на стыке кусков)
  const PEEK = new Map();
  function peekMap(rx, ry) {
    const cd = V3.cd.get(rx + ',' + ry);
    if (cd) return cd.m;
    const cur = G.map && G.map.kind === 'over' && G.map.region.x === rx && G.map.region.y === ry;
    const key = cur ? G.map.key : regionKey(rx, ry);
    if (!key) return null;
    let mm = (G.cache && G.cache.get(key)) || PEEK.get(key);
    if (!mm) {
      mm = E.MapGen.build(key);
      const dyn = G.S.maps[key];
      if (dyn && dyn.t) for (const k in dyn.t) mm.tiles[k] = dyn.t[k];
      PEEK.set(key, mm);
      if (PEEK.size > 24) PEEK.delete(PEEK.keys().next().value);
    }
    return mm;
  }
  // классы и высоты клеток куска
  function prep(cd) {
    fields();
    const m = cd.m, W = m.w, H = m.h, n = W * H, X = UI.mvTiles;
    const cls = cd.cls = new Uint8Array(n), h = cd.h = new Float32Array(n);
    const flat = !cd.over;
    for (let i = 0; i < n; i++) {
      const t = m.tiles[i], bk = X.BK[t];
      if (bk && ROCK.has(bk) && !flat) cls[i] = CL.ROCK;
      else if (bk) cls[i] = CL.BLOCK;
      else if (isLow(t)) cls[i] = CL.WATER;
      else if (X.GK[t] === 'void' || X.LOW[t] === 2) cls[i] = CL.VOID;
      else cls[i] = CL.LAND;
    }
    if (flat) { for (let i = 0; i < n; i++) h[i] = cls[i] === CL.WATER ? (TL[m.tiles[i]].water === 1 ? -0.07 : -0.14) : 0; return; }
    // окрестность куска с запасом R клеток: вода у соседей тоже притягивает берег (иначе на стыке — обрыв)
    const R = 6, EW = W + 2 * R, EH = H + 2 * R;
    const ewat = new Uint8Array(EW * EH), ewl = new Float32Array(EW * EH);
    const coastalOf = (mm) => ['coast', 'ocean', 'volcanic'].includes(mm.biome) || (mm.region && ['coast', 'ocean', 'volcanic'].includes(mm.region.biome));
    const coastal = coastalOf(m);
    const levelOf = (t, gx, gz, cst) => { const fl = HGT.land(gx, gz, 0.15); return TL[t].lava ? fl - 0.2 : TL[t].water === 2 && cst ? SEA : Math.max(SEA, fl - (TL[t].water === 1 ? 0.1 : 0.2)); };
    for (let ey = 0; ey < EH; ey++) for (let ex = 0; ex < EW; ex++) {
      const x = ex - R, y = ey - R;
      let t, cst = coastal;
      if (x >= 0 && y >= 0 && x < W && y < H) t = m.tiles[y * W + x];
      else {
        const gx0 = cd.ox + x, gz0 = cd.oz + y, nb = peekMap(Math.floor(gx0 / MW), Math.floor(gz0 / MH));
        if (!nb) continue;
        t = nb.tiles[(gz0 - Math.floor(gz0 / MH) * MH) * MW + (gx0 - Math.floor(gx0 / MW) * MW)]; cst = coastalOf(nb);
      }
      if (!isLow(t) || X.LOW[t] === 2) continue;
      ewat[ey * EW + ex] = 1;
      ewl[ey * EW + ex] = levelOf(t, cd.ox + x + 0.5, cd.oz + y + 0.5, cst);
    }
    // до воды — чем ближе, тем ровнее берег
    const dw = new Uint8Array(n).fill(9);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let d = 9;
      for (let dy = -4; dy <= 4 && d > 0; dy++) for (let dx = -4; dx <= 4; dx++) { if (ewat[(y + dy + R) * EW + x + dx + R]) { const dd = Math.max(Math.abs(dx), Math.abs(dy)); if (dd < d) d = dd; } }
      dw[y * W + x] = d;
    }
    // до проходимой земли — скалы растут вглубь массива, а не торчат пиками
    const dr = new Uint8Array(n);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (cls[y * W + x] !== CL.ROCK) continue;
      let d = 7;
      for (let r = 1; r < 7 && d === 7; r++) for (let dy = -r; dy <= r && d === 7; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= W || b >= H) continue; if (cls[b * W + a] !== CL.ROCK) { d = r; break; } }
      dr[y * W + x] = d;
    }
    // посёлок стоит на ровном
    const sr = m.settRect;
    let setLevel = 0;
    if (sr) { const cx = cd.ox + sr.x + sr.w / 2, cz = cd.oz + sr.y + sr.h / 2; setLevel = Math.max(0.3, HGT.base(cx, cz) + HGT.hills(cx, cz) * 0.15); }
    // ближайшая вода и её уровень (в том числе за краем куска) — берег сходит к ней полого, без обрывов
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, gx = cd.ox + x + 0.5, gz = cd.oz + y + 0.5, t = m.tiles[i];
      let hk = 0.15 + 0.85 * U.clamp(dw[i] / 4, 0, 1);
      if (t === T.ROAD || t === T.COBBLE) hk *= 0.6;
      let land = HGT.land(gx, gz, hk);
      if (cls[i] !== CL.WATER) {
        let bd = 99, bl = 0;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          const k = (y + dy + R) * EW + x + dx + R;
          if (!ewat[k]) continue;
          const d = Math.hypot(dx, dy);
          if (d < bd) { bd = d; bl = ewl[k]; }
        }
        if (bd < R && land > bl + 0.12) { const f = U.clamp((bd - 0.5) / (R - 0.5), 0, 1); land = bl + 0.12 + (land - bl - 0.12) * f * f * (3 - 2 * f); }
      }
      const wli = cls[i] === CL.WATER ? ewl[(y + R) * EW + x + R] : 0;
      let ws = 0;
      if (sr) {
        const ddx = Math.max(sr.x - 1 - x, 0, x - (sr.x + sr.w)), ddy = Math.max(sr.y - 1 - y, 0, y - (sr.y + sr.h));
        ws = 1 - U.clamp(Math.hypot(ddx, ddy) / 7, 0, 1);
        ws = ws * ws * (3 - 2 * ws);
        land = land + (setLevel - land) * ws;
      }
      const c = cls[i];
      if (c === CL.ROCK) { const d = dr[i], f = U.clamp((d - 0.5) / 5, 0, 1); h[i] = land + (0.9 + d * 0.8 + (HGT.rock(gx, gz, HGT.mtn(gx, gz)) - 2.6) * f * f * (3 - 2 * f)) * (1 - ws * 0.8) * (X.BK[t] === 'peak' ? 1.2 : X.BK[t] === 'basalt' ? 0.6 : 1); }
      else if (c === CL.WATER) h[i] = sr && ws > 0.5 ? Math.min(wli, setLevel - 0.2) : wli;
      else h[i] = land;
    }
  }
  // клетка мира по общим координатам
  function tileAt(gx, gz) {
    const m = G.map;
    if (!m) return null;
    if (m.kind !== 'over') { const cd = V3.cd.get('L'); if (!cd || gx < 0 || gz < 0 || gx >= cd.m.w || gz >= cd.m.h) return null; return [cd, gz * cd.m.w + gx]; }
    const rx = Math.floor(gx / MW), ry = Math.floor(gz / MH);
    const cd = V3.cd.get(rx + ',' + ry);
    if (!cd) return null;
    return [cd, (gz - cd.oz) * MW + (gx - cd.ox)];
  }
  // высота угла клетки — какой её видит земля, вода или скала
  function corner(kind, gx, gz) {
    let s = 0, n = 0, any = 0, anyN = 0;
    for (let dz = -1; dz <= 0; dz++) for (let dx = -1; dx <= 0; dx++) {
      const t = tileAt(gx + dx, gz + dz);
      if (!t) continue;
      const c = t[0].cls[t[1]], hh = t[0].h[t[1]];
      any += hh; anyN++;
      if (kind === CL.ROCK) { s += c === CL.ROCK ? hh : c === CL.WATER ? hh + 0.8 : hh + 0.6; n++; }
      else if (c === CL.LAND || c === CL.BLOCK || c === CL.VOID) { s += hh; n++; }
    }
    return n ? s / n : anyN ? any / anyN : 0;
  }
  // земля под точкой (для камеры, людей, деревьев)
  HGT.groundAt = function (gx, gz) {
    const tx = Math.floor(gx), tz = Math.floor(gz), t = tileAt(tx, tz);
    if (!t) return 0;
    const cd = t[0], c = cd.cls[t[1]];
    if (!cd.over) return cd.h[t[1]];
    if (c === CL.WATER) return cd.h[t[1]];
    const k = c === CL.ROCK ? CL.ROCK : CL.LAND;
    const fx = gx - tx, fz = gz - tz;
    let a, b, cc, d;
    if (cd.cL) { const arr = k === CL.ROCK ? cd.cR : cd.cL, W2 = cd.CW, lx = tx - cd.ox + 1, lz = tz - cd.oz + 1; a = arr[lz * W2 + lx]; b = arr[lz * W2 + lx + 1]; cc = arr[(lz + 1) * W2 + lx]; d = arr[(lz + 1) * W2 + lx + 1]; }
    else { a = corner(k, tx, tz); b = corner(k, tx + 1, tz); cc = corner(k, tx, tz + 1); d = corner(k, tx + 1, tz + 1); }
    return (a * (1 - fx) + b * fx) * (1 - fz) + (cc * (1 - fx) + d * fx) * fz;
  };

  // ============================================================
  // Сборка куска
  // ============================================================
  function wallTex(roofs, bk, x, y) {
    if (bk === 'wall' || bk === 'window' || bk === 'door' || bk === 'boarded') {
      const rf = roofs.find((r) => x >= r.rect.x && y >= r.rect.y && x < r.rect.x + r.rect.w && y < r.rect.y + r.rect.h);
      const mw = rf ? MATWALL[rf.mat] || MATWALL.brick : MATWALL.stone;
      if (bk === 'wall') return mw[0];
      if (bk === 'boarded') return 'door' + mw[1] + ':b';
      return bk + mw[1];
    }
    return WTEX[bk] || 'cave';
  }
  const season = () => E.Gm.season();
  function buildChunk(cd) {
    const P3 = Gfx.P3, M = P3.mesh(), X = UI.mvTiles;
    const { GK, BK, OK, FIX } = X;
    const m = cd.m, W = m.w, H = m.h, ox = cd.ox, oz = cd.oz;
    const roofs = X.roofsOf(m);
    const dungeon = !m.outdoor;
    const over = cd.over;
    const objs = [], statics = [], lights = [];
    const tidAt = (x, y) => m.tiles[U.clamp(y, 0, H - 1) * W + U.clamp(x, 0, W - 1)];
    const clsAt = (x, y) => { const t = tileAt(ox + x, oz + y); return t ? t[0].cls[t[1]] : -1; };
    const hAt = (x, y) => { const t = tileAt(ox + x, oz + y); return t ? t[0].h[t[1]] : 0; };
    const bkAt = (x, y) => { const t = tileAt(ox + x, oz + y); return t ? BK[t[0].m.tiles[t[1]]] : null; };
    let gnd = m._gndKey || 'grass';
    const groundKey = (x, y, tid) => {
      if (FIX[tid]) return FIX[tid];
      if (GK[tid]) return GK[tid];
      if (TL[tid].indoor) return 'floor';
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) { const t2 = tidAt(x + dx, y + dy); if (GK[t2] && !isLow(t2)) return GK[t2]; }
      return gnd;
    };
    const sea = season(), cold = m.region && m.region.t < 0.55;
    const gtex = (k, x, y) => {
      if (k === 'grass') { if (sea === 2 && m.biome !== 'desert') k = 'grass_dry'; else if (sea === 3 && cold && m.outdoor) k = 'grass_frost'; }
      const t = GTEX[k] || 'rockfloor';
      return t === 'grass' || t === 'grass_dry' || t === 'grass_frost' ? t + ':' + (U.hash(x, y, 3) % 3) : t;
    };
    const fol = sea === 2 ? ['#c08a30', '#b05a2a', '#c8a040'] : sea === 0 ? ['#5a9a40', '#4a8a3a'] : ['#3e7b34', '#4a8a3c'];
    // углы клеток (с запасом в одну клетку — для нормалей)
    const CW = W + 3, CH = H + 3;
    const cL = new Float32Array(CW * CH), cR = new Float32Array(CW * CH);
    for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
      const gx = ox + i - 1, gz = oz + j - 1;
      cL[j * CW + i] = over ? corner(CL.LAND, gx, gz) : 0;
      cR[j * CW + i] = over ? corner(CL.ROCK, gx, gz) : 0;
    }
    const CLand = (x, y) => cL[(y + 1) * CW + x + 1], CRock = (x, y) => cR[(y + 1) * CW + x + 1];
    cd.cL = cL; cd.cR = cR; cd.CW = CW; // для быстрой высоты земли под ногами
    const nrm = (arr, x, y) => { const a = arr[(y + 1) * CW + Math.max(0, x)] , b = arr[(y + 1) * CW + Math.min(CW - 1, x + 2)], c = arr[Math.max(0, y) * CW + x + 1], d = arr[Math.min(CH - 1, y + 2) * CW + x + 1]; const nx = a - b, nz = c - d, l = Math.hypot(nx, 2, nz); return [nx / l, 2 / l, nz / l]; };
    const corners = (c, x, y) => {
      if (c === CL.WATER) { const v = cd.h[y * W + x]; return [v, v, v, v]; }
      const f = c === CL.ROCK ? CRock : CLand;
      return [f(x, y + 1), f(x + 1, y + 1), f(x + 1, y), f(x, y)]; // ЮЗ, ЮВ, СВ, СЗ
    };
    // затенение у подножия стен
    const ao = (x, y) => { let k = 0; for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (clsAt(x + dx, y + dy) === CL.BLOCK) k++; return 1 - Math.min(2, k) * 0.16; };
    const insideRoof = new Uint8Array(W * H), tallAt = new Uint8Array(W * H);
    for (const rf of roofs) for (let y = rf.rect.y; y < rf.rect.y + rf.rect.h; y++) for (let x = rf.rect.x; x < rf.rect.x + rf.rect.w; x++) if (x >= 0 && y >= 0 && x < W && y < H) { insideRoof[y * W + x] = 1; if (rf.tall) tallAt[y * W + x] = 1; }
    // высота стены: двухэтажные дома выше
    const wallH = (x, y, bk) => { let hh = WH[bk] || WALL; if (dungeon && hh < CAVE && bk !== 'shelf') hh = CAVE; if ((bk === 'wall' || bk === 'window' || bk === 'door' || bk === 'boarded') && x >= 0 && y >= 0 && x < W && y < H && tallAt[y * W + x]) hh = TALL; return hh; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, tid = m.tiles[i];
      if (dungeon && !m.ex[i] && !(G.map === m && G.vis[i])) continue; // подземелья — только увиденное
      const c = cd.cls[i], bk = BK[tid];
      const indoorT = TL[tid].indoor || insideRoof[i];
      const sky = dungeon ? 0 : indoorT ? 0.6 : 1;
      const hb = cd.h[i];
      // ---- стены и прочие глыбы ----
      if (c === CL.BLOCK && bk !== 'door') {
        const cs = corners(CL.LAND, x, y);
        const bot = Math.min(...cs) - 0.35;
        const hh = wallH(x, y, bk);
        const top = hb + hh, tex = wallTex(roofs, bk, x, y);
        P3.quad(M, [x, top, y + 1], [x + 1, top, y + 1], [x + 1, top, y], [x, top, y], [0, 0], [1, 1], bk === 'cave' || dungeon ? tex : 'roof_slate', [0, 1, 0], dungeon ? 0 : 1);
        for (const [dx, dy, nx, nz] of [[0, -1, 0, -1], [1, 0, 1, 0], [0, 1, 0, 1], [-1, 0, -1, 0]]) {
          const nc = clsAt(x + dx, y + dy), nb = bkAt(x + dx, y + dy);
          if (nc === CL.BLOCK && nb !== 'door') { const nh = wallH(x + dx, y + dy, nb); if (hAt(x + dx, y + dy) + nh >= top - 0.01) continue; }
          let p0, p1;
          if (dy === -1) { p0 = [x + 1, 0, y]; p1 = [x, 0, y]; } else if (dx === 1) { p0 = [x + 1, 0, y + 1]; p1 = [x + 1, 0, y]; } else if (dy === 1) { p0 = [x, 0, y + 1]; p1 = [x + 1, 0, y + 1]; } else { p0 = [x, 0, y]; p1 = [x, 0, y + 1]; }
          const b0 = nc === CL.WATER ? Math.min(bot, hAt(x + dx, y + dy) - 0.3) : bot;
          const fsky = dungeon ? 0 : (TL[tidAt(x + dx, y + dy)].indoor || (x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H && insideRoof[(y + dy) * W + x + dx])) ? 0.6 : 1;
          P3.quad(M, [p0[0], b0, p0[2]], [p1[0], b0, p1[2]], [p1[0], top, p1[2]], [p0[0], top, p0[2]], [0, top - b0], [1, 0], tex, [nx, 0, nz], fsky);
        }
        continue;
      }
      // ---- земля, вода, скалы ----
      const gk = groundKey(x, y, tid);
      const cs = corners(c === CL.BLOCK ? CL.LAND : c, x, y);
      if (c !== CL.VOID && gk !== 'void' && !(UI.V3props && UI.V3props.skipGround(m, i))) {
        const isRock = c === CL.ROCK;
        let tex = isRock ? ROCKTEX[bk] || 'mountain' : gtex(gk, x, y);
        if (isRock && over && hb > 24 + (cold ? -8 : 0)) tex = 'peak';
        const ns = c === CL.WATER || !over ? [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]] : [nrm(isRock ? cR : cL, x, y + 1), nrm(isRock ? cR : cL, x + 1, y + 1), nrm(isRock ? cR : cL, x + 1, y), nrm(isRock ? cR : cL, x, y)];
        const tints = c === CL.LAND || c === CL.BLOCK ? [ao(x, y + 1), ao(x + 1, y + 1), ao(x + 1, y), ao(x, y)].map((v) => [v, v, v]) : null;
        P3.quadN(M, [[x, cs[0], y + 1], [x + 1, cs[1], y + 1], [x + 1, cs[2], y], [x, cs[3], y]], [[0, 1], [1, 1], [1, 0], [0, 0]], tex, ns, sky, TL[tid].water ? K.WATER : K.GROUND, tints);
        // мягкие края соседней земли
        const rk = SPILL[GTEX[gk]] || 0;
        if (rk && c === CL.LAND) {
          const side = new Set();
          for (const [dx, dy, kind] of EDGES) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const t2 = m.tiles[ny * W + nx];
            if (BK[t2] || isLow(t2) || TL[t2].indoor) continue;
            const k2 = groundKey(nx, ny, t2), r2 = SPILL[GTEX[k2]] || 0;
            if (r2 <= rk) continue;
            const tk = GTEX[k2];
            if (kind >= 6) { if (side.has(tk + (dx > 0 ? 3 : 5)) || side.has(tk + (dy > 0 ? 4 : 2))) continue; } else side.add(tk + kind);
            const e = 0.006;
            P3.quadN(M, [[x, cs[0] + e, y + 1], [x + 1, cs[1] + e, y + 1], [x + 1, cs[2] + e, y], [x, cs[3] + e, y]], [[0, 1], [1, 1], [1, 0], [0, 0]], gtex(k2, x, y), ns, sky, kind);
          }
        }
      }
      // ---- уступы между клетками: берега, скалы, обрывы ----
      if (c !== CL.BLOCK) {
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const nc = clsAt(x + dx, y + dy);
          if (nc === CL.BLOCK || nc < 0) continue;
          let a0, a1, b0, b1, p0, p1;
          const mine = cs, nb = nc === CL.VOID ? null : corners(nc, x + dx, y + dy);
          // общие углы ребра: мои и соседа
          if (dy === -1) { a0 = mine[3]; a1 = mine[2]; p0 = [x, y]; p1 = [x + 1, y]; if (nb) { b0 = nb[0]; b1 = nb[1]; } }
          else if (dx === 1) { a0 = mine[2]; a1 = mine[1]; p0 = [x + 1, y]; p1 = [x + 1, y + 1]; if (nb) { b0 = nb[3]; b1 = nb[0]; } }
          else if (dy === 1) { a0 = mine[1]; a1 = mine[0]; p0 = [x + 1, y + 1]; p1 = [x, y + 1]; if (nb) { b0 = nb[2]; b1 = nb[3]; } }
          else { a0 = mine[0]; a1 = mine[3]; p0 = [x, y + 1]; p1 = [x, y]; if (nb) { b0 = nb[1]; b1 = nb[2]; } }
          if (!nb) { b0 = a0 - 8; b1 = a1 - 8; }
          if (a0 + a1 <= b0 + b1 + 0.02) continue; // уступ рисует тот, кто выше
          const t0 = Math.max(a0, b0), t1 = Math.max(a1, b1), u0 = Math.min(a0, b0), u1 = Math.min(a1, b1);
          const rockFace = c === CL.ROCK || nc === CL.ROCK || !nb;
          const tex = rockFace ? (c === CL.ROCK ? ROCKTEX[bk] || 'mountain' : 'cliff') : (m.biome === 'desert' || gk === 'sand' ? 'sand' : 'bank');
          const n = [-dy === 0 ? -dx : 0, 0, dx === 0 ? -dy : 0];
          P3.quad(M, [p0[0], u0, p0[1]], [p1[0], u1, p1[1]], [p1[0], t1, p1[1]], [p0[0], t0, p0[1]], [0, Math.max(t0 - u0, t1 - u1)], [1, 0], tex, [dx, 0, dy], sky);
        }
      }
      // ---- дверной проём: перемычка над проходом ----
      if (bk === 'door') {
        const tex = wallTex(roofs, 'wall', x, y), top = hb + (dungeon ? CAVE : wallH(x, y, 'door')), lo = hb + 1.12;
        const ew = clsAt(x - 1, y) === CL.BLOCK && clsAt(x + 1, y) === CL.BLOCK;
        if (ew) { P3.quad(M, [x, lo, y + 1], [x + 1, lo, y + 1], [x + 1, top, y + 1], [x, top, y + 1], [0, 0], [1, top - lo], tex, [0, 0, 1], sky); P3.quad(M, [x + 1, lo, y], [x, lo, y], [x, top, y], [x + 1, top, y], [0, 0], [1, top - lo], tex, [0, 0, -1], sky); }
        else { P3.quad(M, [x, lo, y], [x, lo, y + 1], [x, top, y + 1], [x, top, y], [0, 0], [1, top - lo], tex, [-1, 0, 0], sky); P3.quad(M, [x + 1, lo, y + 1], [x + 1, lo, y], [x + 1, top, y], [x + 1, top, y + 1], [0, 0], [1, top - lo], tex, [1, 0, 0], sky); }
        P3.quad(M, [x, lo, y], [x + 1, lo, y], [x + 1, lo, y + 1], [x, lo, y + 1], [0, 0], [1, 1], 'ceiling_wood', [0, -1, 0], sky);
      }
      // ---- потолки: в подземельях всегда, в доме — только когда ты внутри ----
      if (dungeon) P3.quad(M, [x, CAVE, y], [x + 1, CAVE, y], [x + 1, CAVE, y + 1], [x, CAVE, y + 1], [0, 0], [1, 1], 'ceiling_rock', [0, -1, 0], 0);
      else if (insideRoof[i]) P3.quad(M, [x, hb + WALL, y], [x + 1, hb + WALL, y], [x + 1, hb + WALL, y + 1], [x, hb + WALL, y + 1], [0, 0], [1, 1], 'ceiling_wood', [0, -1, 0], 0.3, K.CEIL);
      // ---- вещи на клетке ----
      if (OK[tid] && tid !== T.DOWN && tid !== T.UP && tid !== T.MINE && tid !== T.PORTAL && !(UI.V3furn && UI.V3furn.has(tid))) {
        let ok = OK[tid], col = null;
        const hh = (x * 7 + y * 13) % 5;
        if (ok === 'tree') { if (sea === 3 && cold) ok = 'tree_bare'; else { ok = hh < 2 ? 'tree2' : 'tree'; col = fol[(x + y * 3) % fol.length]; } }
        else if (ok === 'pine') { if ((sea === 3 && cold) || m.biome === 'ice' || m.biome === 'tundra') ok = 'pine_snow'; else col = (x + y) % 3 ? '#2e6b55' : '#3a7a5a'; }
        const gy = c === CL.WATER ? hb : (cs[0] + cs[1] + cs[2] + cs[3]) / 4;
        const o = { k: ok, x, y, gy, c: col, seed: (x * 7 + y * 13) | 0, sky };
        if (SYM.has(ok) && !ANIM.has(ok)) statics.push(o); else objs.push(o);
      }
      if (X.HLIGHT[tid]) { const d = X.HLIGHT[tid]; lights.push({ x: x + 0.5, y: hb + 0.6, z: y + 0.5, r: d[2] * 1.1, col: d[0], i: d[1] * 0.9, fl: d[3] }); }
      // днём окна и двери светят внутрь дома
      if (!dungeon && (bk === 'window' || bk === 'door')) for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const ax = x + dx, ay = y + dy;
        if (ax < 0 || ay < 0 || ax >= W || ay >= H) continue;
        const ti = ay * W + ax;
        if (!TL[m.tiles[ti]].walk || !(TL[m.tiles[ti]].indoor || insideRoof[ti])) continue;
        lights.push({ x: x + 0.5 + dx * 0.75, y: hb + (bk === 'door' ? 0.8 : 1.0), z: y + 0.5 + dy * 0.75, r: bk === 'door' ? 3.4 : 4.2, col: [1, 0.95, 0.86], i: bk === 'door' ? 0.55 : 0.8, day: 1 });
        break;
      }
    }
    // ---- входы в подземелья, шахты, лестницы — настоящие постройки ----
    if (UI.V3props) UI.V3props.build(M, cd, { tileAt, corner, CL, hAt, clsAt, lights, dungeon, over });
    // ---- мебель и утварь — объёмные ----
    if (UI.V3furn) UI.V3furn.build(M, cd, { lights, dungeon, over, insideRoof });
    // ---- двускатные крыши ----
    for (const rf of roofs) {
      const r = rf.rect;
      if (!X.roofIntact(m, r)) continue;
      const lvl = cd.h[U.clamp(r.y, 0, H - 1) * W + U.clamp(r.x, 0, W - 1)];
      const tex = ROOFTEX[rf.style] || 'roof_thatch', wtex = (MATWALL[rf.mat] || MATWALL.brick)[0];
      const o = 0.2, x0 = r.x - o, x1 = r.x + r.w + o, z0 = r.y - o, z1 = r.y + r.h + o, b = lvl + (rf.tall ? TALL : WALL), pk = rf.pitch || 0.42;
      if (r.w >= r.h) {
        const zm = r.y + r.h / 2, top = b + r.h * pk, sl = Math.hypot(r.h / 2 + o, top - b);
        const n1 = [0, (r.h / 2 + o) / sl, -(top - b) / sl], n2 = [0, n1[1], -n1[2]];
        P3.quad(M, [x0, b, z0], [x1, b, z0], [x1, top, zm], [x0, top, zm], [0, sl], [x1 - x0, 0], tex, n1, 1, K.ROOF);
        P3.quad(M, [x1, b, z1], [x0, b, z1], [x0, top, zm], [x1, top, zm], [0, sl], [x1 - x0, 0], tex, n2, 1, K.ROOF);
        P3.tri(M, [r.x, b, r.y], [r.x, b, r.y + r.h], [r.x, top, zm], [0, top - b], [r.h, top - b], [r.h / 2, 0], wtex, [-1, 0, 0], 1, K.ROOF);
        P3.tri(M, [r.x + r.w, b, r.y + r.h], [r.x + r.w, b, r.y], [r.x + r.w, top, zm], [0, top - b], [r.h, top - b], [r.h / 2, 0], wtex, [1, 0, 0], 1, K.ROOF);
        if (rf.chim) chimney(M, rf.chim.x + 0.5, top - 0.1, zm - 0.6, K.ROOF);
      } else {
        const xm = r.x + r.w / 2, top = b + r.w * pk, sl = Math.hypot(r.w / 2 + o, top - b);
        const n1 = [-(top - b) / sl, (r.w / 2 + o) / sl, 0], n2 = [-n1[0], n1[1], 0];
        P3.quad(M, [x0, b, z1], [x0, b, z0], [xm, top, z0], [xm, top, z1], [0, sl], [z1 - z0, 0], tex, n1, 1, K.ROOF);
        P3.quad(M, [x1, b, z0], [x1, b, z1], [xm, top, z1], [xm, top, z0], [0, sl], [z1 - z0, 0], tex, n2, 1, K.ROOF);
        P3.tri(M, [r.x + r.w, b, r.y], [r.x, b, r.y], [xm, top, r.y], [0, top - b], [r.w, top - b], [r.w / 2, 0], wtex, [0, 0, -1], 1, K.ROOF);
        P3.tri(M, [r.x, b, r.y + r.h], [r.x + r.w, b, r.y + r.h], [xm, top, r.y + r.h], [0, top - b], [r.w, top - b], [r.w / 2, 0], wtex, [0, 0, 1], 1, K.ROOF);
        if (rf.chim) chimney(M, xm + 0.6, top - 0.1, rf.chim.y + 0.5, K.ROOF);
      }
    }
    // ---- юбка по краю куска: прячет стык с дальней землёй ----
    if (over) {
      const sk = (ax, az, bx, bz, ha, hb2, n) => P3.quad(M, [ax, ha - 7, az], [bx, hb2 - 7, bz], [bx, hb2, bz], [ax, ha, az], [0, 7], [1, 0], 'bank', n, 1);
      for (let x = 0; x < W; x++) { sk(x, 0, x + 1, 0, CLand(x, 0), CLand(x + 1, 0), [0, 0, -1]); sk(x + 1, H, x, H, CLand(x + 1, H), CLand(x, H), [0, 0, 1]); }
      for (let y = 0; y < H; y++) { sk(0, y + 1, 0, y, CLand(0, y + 1), CLand(0, y), [-1, 0, 0]); sk(W, y, W, y + 1, CLand(W, y), CLand(W, y + 1), [1, 0, 0]); }
    }
    return { M, objs, statics, lights };
  }
  function chimney(M, x, y, z, kind) {
    const P3 = Gfx.P3, s = 0.22, h = 0.9;
    for (const [ax, az, bx, bz, n] of [[x - s, z - s, x + s, z - s, [0, 0, -1]], [x + s, z - s, x + s, z + s, [1, 0, 0]], [x + s, z + s, x - s, z + s, [0, 0, 1]], [x - s, z + s, x - s, z - s, [-1, 0, 0]]]) P3.quad(M, [ax, y, az], [bx, y, bz], [bx, y + h, bz], [ax, y + h, az], [0, h], [0.5, 0], 'brick:s', n, 1, kind);
    P3.quad(M, [x - s, y + h, z + s], [x + s, y + h, z + s], [x + s, y + h, z - s], [x - s, y + h, z - s], [0, 0], [0.5, 0.5], 'ceiling_rock', [0, 1, 0], 1, kind);
  }
  // неподвижные спрайты куска (деревья, кусты, камни): одна сетка-«щит»
  function bakeStatics(list, cd) {
    const P3 = Gfx.P3, PX = Gfx.PX, B = P3.bmesh();
    for (const o of list) {
      const key = o.k, oo = { c: o.c, seed: o.seed % 3, season: season() };
      const pk = key + '|0|' + (o.c || '') + '|0|0|0|0|' + (o.seed % 3);
      let r = V3.sprCache && V3.sprCache.get(pk);
      if (!r || r.gen !== P3.sprGen) {
        const sp = PX.sprite(key, oo, { yaw: 0, pitch: 0.12, ppu: 44 });
        if (!sp) continue;
        r = P3.sprite(sp);
        (V3.sprCache = V3.sprCache || new Map()).set(pk, r);
      }
      const j = (k) => (U.hash(o.x, o.y, k) % 100) / 100 - 0.5;
      const tree = TREES.has(key);
      const sc = tree ? 1.12 + j(5) * 0.36 : K_ENT;
      P3.bb(B, r, o.x + 0.5 + (tree ? j(1) * 0.3 : 0), o.gy, o.y + 0.5 + (tree ? j(2) * 0.3 : 0), sc, o.sky);
    }
    return B;
  }
  function freeMesh(ms) { const P3 = Gfx.P3; P3.free(ms.h); P3.free(ms.bh); }
  // ---------- мелочь у ног: трава, цветы, папоротник, колосья, камешки ----------
  const DETR = 22;
  let DET = null;
  const TUFTS = {
    grass: [['grass', 3.2], ['flower', 0.35], ['pebble', 0.15]], hill: [['grass', 3], ['pebble', 0.3]], tallgrass: [['tall', 3.5], ['grass', 1], ['flower', 0.4]],
    flowers: [['flower', 3], ['grass', 1.5]], field: [['wheat', 5]], soil: [['pebble', 0.6]], road: [['pebble', 0.5]], stones: [['pebble', 2.5], ['dry', 0.4]],
    sand: [['dry', 0.25], ['pebble', 0.3]], dune: [['dry', 0.1]], swamp: [['reed', 1.6], ['grass', 1.2]], roots: [['fern', 1.2], ['mush', 0.4]],
    snow: [['dry', 0.15]], rock: [['pebble', 0.8]], ash: [['pebble', 0.4]], nightgrass: [['grass', 2.5], ['flower', 0.6]], rubble: [['pebble', 2]],
  };
  function buildDetail(gcx, gcz) {
    const P3 = Gfx.P3, TF = Gfx.Tufts, X = UI.mvTiles, B = P3.bmesh();
    const sea = season();
    for (let gz = gcz - DETR; gz <= gcz + DETR; gz++) for (let gx = gcx - DETR; gx <= gcx + DETR; gx++) {
      const dd = (gx - gcx) ** 2 + (gz - gcz) ** 2;
      if (dd > DETR * DETR) continue;
      const t = tileAt(gx, gz);
      if (!t) continue;
      const cd = t[0], i = t[1];
      if (cd.cls[i] !== CL.LAND || !cd.cL) continue;
      const m = cd.m, tid = m.tiles[i];
      if (TL[tid].indoor || X.OK[tid] || !m.outdoor) continue;
      let gk = X.GK[tid] || X.FIX[tid];
      if (!gk) continue;
      if (gk === 'grass' && (m.biome === 'forest' || m.biome === 'ancient') && hash2(gx, gz, 77) < 0.35) gk = 'roots';
      const list = TUFTS[gk];
      if (!list) continue;
      const far = dd > 14 * 14 ? 0.45 : 1;
      for (const [kind, dens] of list) {
        let n = dens * far;
        const base = Math.floor(n); n = base + (hash2(gx * 3 + kind.length, gz, 5) < n - base ? 1 : 0);
        if (sea === 3 && (kind === 'flower' || kind === 'fern' || kind === 'tall') && cd.m.region && cd.m.region.t < 0.55) continue;
        for (let k = 0; k < n; k++) {
          const jx = hash2(gx, gz, k * 13 + 1), jz = hash2(gx, gz, k * 13 + 2), v = Math.floor(hash2(gx, gz, k * 13 + 3) * 4);
          const r = TF.rect(kind, v, kind === 'flower' ? 1 : sea, kind === 'flower' ? TF.FLOWER[Math.floor(hash2(gx >> 2, gz >> 2, 9) * TF.FLOWER.length + k) % TF.FLOWER.length] : null);
          const wx = gx + 0.08 + jx * 0.84, wz = gz + 0.08 + jz * 0.84;
          P3.bb(B, r, wx - gcx, HGT.groundAt(wx, wz), wz - gcz, (kind === 'wheat' ? 0.7 : 0.9) + hash2(gx, gz, k + 40) * 0.5, 1);
        }
      }
    }
    return { h: P3.upload(B), cx: gcx, cz: gcz, gen: P3.sprGen, sea };
  }

  // ============================================================
  // Дальняя земля: весь мир одной сеткой + море + замки и сёла на горизонте
  // ============================================================
  const BIOC = {
    plains: [0.42, 0.62, 0.26], forest: [0.18, 0.36, 0.16], ancient: [0.14, 0.3, 0.14], swamp: [0.3, 0.36, 0.2], desert: [0.86, 0.72, 0.44], tundra: [0.56, 0.62, 0.5],
    ice: [0.9, 0.94, 0.98], mountain: [0.46, 0.43, 0.4], living: [0.42, 0.34, 0.3], coast: [0.6, 0.62, 0.36], ash: [0.32, 0.3, 0.3], volcanic: [0.26, 0.2, 0.18], sky: [0.8, 0.85, 0.9], ocean: [0.6, 0.58, 0.42],
  };
  let FAR = null;
  function buildFar() {
    fields();
    const P3 = Gfx.P3, M = P3.mesh();
    const bioArr = G.W.regions.map((g) => BIOC[g.biome] || BIOC.plains);
    const bioAt = (gx, gz) => {
      const fx = gx / MW - 0.5, fy = gz / MH - 0.5, ix = Math.floor(fx), iy = Math.floor(fy);
      let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      const at = (x, y) => bioArr[U.clamp(y, 0, WS - 1) * WS + U.clamp(x, 0, WS - 1)];
      const out = [0, 0, 0];
      for (let k = 0; k < 3; k++) out[k] = (at(ix, iy)[k] * (1 - tx) + at(ix + 1, iy)[k] * tx) * (1 - ty) + (at(ix, iy + 1)[k] * (1 - tx) + at(ix + 1, iy + 1)[k] * tx) * ty;
      return out;
    };
    const colAt = (gx, gz, h, i, j) => {
      let c = bioAt(gx, gz);
      const mt = HGT.mtn(gx, gz);
      if (mt > 0.2 && h > 6) c = [0.44 + (fbm(gx / 9, gz / 9, seed + 2, 2) - 0.5) * 0.14, 0.4, 0.36];
      const snowLine = 24 - (field(gx, gz, FE) - 0.5) * 4 - (1 - Math.min(1, (gz / (WS * MH)) * 1.4)) * 14 + (fbm(gx / 5, gz / 5, seed + 4, 2) - 0.5) * 6;
      if (h > snowLine) c = [0.9, 0.93, 0.98];
      else if (h > snowLine - 4) { const t = (h - snowLine + 4) / 4; c = [c[0] + (0.88 - c[0]) * t * 0.6, c[1] + (0.9 - c[1]) * t * 0.6, c[2] + (0.95 - c[2]) * t * 0.6]; }
      if (h < 0.6 && h > SEA - 0.5) c = [0.72, 0.66, 0.46];
      const v = 0.92 + (hash2(i, j, seed) - 0.5) * 0.12;
      return [c[0] * v, c[1] * v, c[2] * v];
    };
    // шаг сетки: у гор — частый (видны гребни и кручи), на равнинах — редкий
    const stepOf = (rx, ry) => { if (rx < 0 || ry < 0 || rx >= WS || ry >= WS) return 6; let m = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m = Math.max(m, FM[U.clamp(ry + dy, 0, WS - 1) * WS + U.clamp(rx + dx, 0, WS - 1)]); return m > 0.3 ? 2 : 6; };
    for (let ry = 0; ry < WS; ry++) for (let rx = 0; rx < WS; rx++) {
      const st = stepOf(rx, ry), nx = MW / st, nz = MH / st, X0 = rx * MW, Z0 = ry * MH;
      const GW = nx + 3;
      const hg = new Float32Array(GW * (nz + 3));
      for (let j = -1; j <= nz + 1; j++) for (let i = -1; i <= nx + 1; i++) hg[(j + 1) * GW + i + 1] = HGT.far(X0 + i * st, Z0 + j * st);
      const H = (i, j) => hg[(j + 1) * GW + i + 1];
      const N = (i, j) => { const ax = H(i - 1, j) - H(i + 1, j), az = H(i, j - 1) - H(i, j + 1), l = Math.hypot(ax, 2 * st, az); return [ax / l, 2 * st / l, az / l]; };
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const xs = [i, i + 1, i + 1, i], zs = [j + 1, j + 1, j, j];
        const hs = xs.map((xx, q) => H(xx, zs[q]));
        if (Math.max(...hs) < SEA - 0.05) continue;
        const p = xs.map((xx, q) => [X0 + xx * st, hs[q], Z0 + zs[q] * st]);
        const l = p.map((pp) => [pp[0] / 8, pp[2] / 8]);
        const ns = xs.map((xx, q) => N(xx, zs[q]));
        const cs = xs.map((xx, q) => colAt(X0 + xx * st, Z0 + zs[q] * st, hs[q], X0 / st + xx, Z0 / st + zs[q]));
        P3.quadN(M, p, l, 'farnoise', ns, 1, K.FAR, cs);
      }
      // юбка там, где у соседа другой шаг: прячет щели
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        if (stepOf(rx + dx, ry + dy) === st) continue;
        const cnt = dx ? nz : nx;
        for (let k = 0; k < cnt; k++) {
          let a, b;
          if (dx === 1) { a = [nx, k]; b = [nx, k + 1]; } else if (dx === -1) { a = [0, k + 1]; b = [0, k]; } else if (dy === 1) { a = [k + 1, nz]; b = [k, nz]; } else { a = [k, 0]; b = [k + 1, 0]; }
          const ha = H(a[0], a[1]), hb = H(b[0], b[1]);
          if (Math.max(ha, hb) < SEA) continue;
          const pa = [X0 + a[0] * st, ha, Z0 + a[1] * st], pb = [X0 + b[0] * st, hb, Z0 + b[1] * st];
          const c = colAt(pa[0], pa[2], ha, 0, 0);
          P3.quad(M, [pa[0], ha - 5, pa[2]], [pb[0], hb - 5, pb[2]], [pb[0], hb, pb[2]], pa, [pa[0] / 8, 0], [pb[0] / 8, 0.6], 'farnoise', [dx, 0.3, dy], 1, K.FAR, c);
        }
      }
    }
    // море до края неба
    const B = 4000, X1 = WS * MW, Z1 = WS * MH;
    for (const [x0, z0, x1, z1] of [[-B, -B, X1 + B, 0], [-B, Z1, X1 + B, Z1 + B], [-B, 0, 0, Z1], [X1, 0, X1 + B, Z1], [0, 0, X1, Z1]]) {
      P3.quad(M, [x0, SEA, z1], [x1, SEA, z1], [x1, SEA, z0], [x0, SEA, z0], [x0 / 6, z1 / 6], [x1 / 6, z0 / 6], 'water', [0, 1, 0], 1, K.FARSEA, [0.9, 0.95, 1]);
    }
    // замки, города и сёла
    for (const s of G.W.settlements) landmark(M, s);
    FAR = { key: G.W.seed + ':' + G.W.regions.length, h: P3.upload(M) };
  }
  // постройки на горизонте: простые объёмы, но с крышами и башнями
  function box(M, x0, y0, z0, x1, y1, z1, tex, roofTex, kind) {
    const P3 = Gfx.P3;
    const w = x1 - x0, d = z1 - z0, h = y1 - y0;
    P3.quad(M, [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, h], [w, 0], tex, [0, 0, -1], 1, kind);
    P3.quad(M, [x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, h], [w, 0], tex, [0, 0, 1], 1, kind);
    P3.quad(M, [x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [0, h], [d, 0], tex, [-1, 0, 0], 1, kind);
    P3.quad(M, [x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [0, h], [d, 0], tex, [1, 0, 0], 1, kind);
    if (roofTex) P3.quad(M, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 0], [w, d], roofTex, [0, 1, 0], 1, kind);
  }
  function gable(M, x0, y0, z0, x1, z1, tex, wtex, kind) {
    const P3 = Gfx.P3, w = x1 - x0, d = z1 - z0, top = y0 + Math.min(w, d) * 0.45, zm = (z0 + z1) / 2;
    const sl = Math.hypot(d / 2, top - y0);
    P3.quad(M, [x0, y0, z0], [x1, y0, z0], [x1, top, zm], [x0, top, zm], [0, sl], [w, 0], tex, [0, 0.7, -0.7], 1, kind);
    P3.quad(M, [x1, y0, z1], [x0, y0, z1], [x0, top, zm], [x1, top, zm], [0, sl], [w, 0], tex, [0, 0.7, 0.7], 1, kind);
    P3.tri(M, [x0, y0, z0], [x0, y0, z1], [x0, top, zm], [0, top - y0], [d, top - y0], [d / 2, 0], wtex, [-1, 0, 0], 1, kind);
    P3.tri(M, [x1, y0, z1], [x1, y0, z0], [x1, top, zm], [0, top - y0], [d, top - y0], [d / 2, 0], wtex, [1, 0, 0], 1, kind);
  }
  function tower(M, x, y0, z, r, h, tex, roofTex, kind) {
    const P3 = Gfx.P3, n = 8, top = y0 + h, cone = r * 2.4;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      const p0 = [x + Math.cos(a0) * r, z + Math.sin(a0) * r], p1 = [x + Math.cos(a1) * r, z + Math.sin(a1) * r];
      const nm = [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)];
      P3.quad(M, [p1[0], y0, p1[1]], [p0[0], y0, p0[1]], [p0[0], top, p0[1]], [p1[0], top, p1[1]], [0, h], [r * 0.8, 0], tex, nm, 1, kind);
      const q0 = [x + Math.cos(a0) * r * 1.25, z + Math.sin(a0) * r * 1.25], q1 = [x + Math.cos(a1) * r * 1.25, z + Math.sin(a1) * r * 1.25];
      P3.tri(M, [q1[0], top, q1[1]], [q0[0], top, q0[1]], [x, top + cone, z], [0, cone], [r, cone], [r / 2, 0], roofTex, [nm[0] * 0.7, 0.7, nm[2] * 0.7], 1, kind);
    }
  }
  function landmark(M, s) {
    const T0 = s.type;
    if (!['capital', 'town', 'village', 'hamlet', 'farm', 'tree'].includes(T0)) return;
    const g = G.W.regions[s.region];
    if (g.biome === 'ocean' || g.biome === 'sky') return;
    const cx = g.x * MW + MW / 2, cz = g.y * MH + MH / 2;
    const rnd = (k) => (hash2(s.id, k, seed) - 0.5) * 2;
    const ground = Math.max(0.3, HGT.base(cx, cz) + HGT.hills(cx, cz) * 0.15);
    const kind = K.FAROBJ;
    const roofs = g.biome === 'mountain' || g.biome === 'tundra' || g.biome === 'ice' ? 'roof_slate' : 'roof_tiles';
    if (T0 === 'capital' || T0 === 'town') {
      const hw = T0 === 'capital' ? 30 : 24, hd = T0 === 'capital' ? 14 : 12, wh = T0 === 'capital' ? 3.4 : 2.6;
      box(M, cx - hw, ground - 1, cz - hd, cx + hw, ground + wh, cz - hd + 1, 'townwall', 'townwall', kind);
      box(M, cx - hw, ground - 1, cz + hd - 1, cx + hw, ground + wh, cz + hd, 'townwall', 'townwall', kind);
      box(M, cx - hw, ground - 1, cz - hd, cx - hw + 1, ground + wh, cz + hd, 'townwall', 'townwall', kind);
      box(M, cx + hw - 1, ground - 1, cz - hd, cx + hw, ground + wh, cz + hd, 'townwall', 'townwall', kind);
      for (const [tx, tz] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd], [0, -hd], [0, hd]]) tower(M, cx + tx, ground - 1, cz + tz, 1.6, wh + 3.5, 'townwall', 'roof_tiles', kind);
      for (let i = 0; i < (T0 === 'capital' ? 16 : 11); i++) {
        const hx = cx + rnd(i * 3) * (hw - 5), hz = cz + rnd(i * 3 + 1) * (hd - 4), w = 2.5 + Math.abs(rnd(i * 3 + 2)) * 2.5, d = 2.4 + Math.abs(rnd(i * 5)) * 1.6, hh = 1.6 + Math.abs(rnd(i * 7)) * 1.4;
        box(M, hx - w / 2, ground - 0.5, hz - d / 2, hx + w / 2, ground + hh, hz + d / 2, 'timber', null, kind);
        gable(M, hx - w / 2 - 0.2, ground + hh, hz - d / 2 - 0.2, hx + w / 2 + 0.2, hz + d / 2 + 0.2, roofs, 'timber', kind);
      }
      if (T0 === 'capital') {
        box(M, cx - 6, ground - 1, cz - 5, cx + 6, ground + 8, cz + 5, 'brick:s', 'roof_slate', kind);
        for (const [tx, tz] of [[-6, -5], [6, -5], [-6, 5], [6, 5]]) tower(M, cx + tx, ground - 1, cz + tz, 1.7, 12, 'brick:s', 'roof_palace', kind);
        tower(M, cx, ground + 8, cz, 2.2, 7, 'brick:s', 'roof_palace', kind);
      } else tower(M, cx + 4, ground - 1, cz - 2, 1.5, 9, 'brick:s', 'roof_tiles', kind);
    } else if (T0 === 'tree') {
      tower(M, cx, ground - 1, cz, 3.5, 26, 'bark', 'bark', kind);
    } else {
      const n = T0 === 'village' ? 9 : T0 === 'hamlet' ? 5 : 2, sp = T0 === 'village' ? 16 : 10;
      for (let i = 0; i < n; i++) {
        const hx = cx + rnd(i * 3) * sp, hz = cz + rnd(i * 3 + 1) * sp * 0.5, w = 3 + Math.abs(rnd(i * 3 + 2)) * 2, d = 2.6 + Math.abs(rnd(i * 5)) * 1.4;
        const gy = Math.max(0.3, HGT.base(hx, hz) + HGT.hills(hx, hz) * 0.15);
        box(M, hx - w / 2, gy - 0.6, hz - d / 2, hx + w / 2, gy + 1.5, hz + d / 2, 'timber', null, kind);
        gable(M, hx - w / 2 - 0.2, gy + 1.5, hz - d / 2 - 0.2, hx + w / 2 + 0.2, hz + d / 2 + 0.2, (i % 3 === 0 ? 'roof_tiles' : 'roof_thatch'), 'timber', kind);
      }
      if (T0 === 'village') tower(M, cx + 2, ground - 0.5, cz + 1, 1.0, 5, 'brick:s', 'roof_slate', kind);
    }
  }

  // ============================================================
  // Небо и свет: живописная палитра суток
  // ============================================================
  const DIMC = { dream: [[0.28, 0.18, 0.42], [0.55, 0.42, 0.7]], spirit: [[0.06, 0.2, 0.2], [0.3, 0.55, 0.5]], void: [[0.01, 0.01, 0.03], [0.04, 0.04, 0.08]], time: [[0.3, 0.24, 0.1], [0.7, 0.58, 0.32]], moon: [[0.02, 0.02, 0.05], [0.12, 0.12, 0.18]], flesh: [[0.25, 0.04, 0.08], [0.45, 0.12, 0.16]], sea: [[0.02, 0.1, 0.2], [0.06, 0.25, 0.4]], depths: [[0.15, 0.05, 0.02], [0.35, 0.12, 0.04]], mirror: [[0.4, 0.45, 0.55], [0.75, 0.8, 0.88]] };
  const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const sm = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function skyOf(m, hs) {
    const HF = Gfx.HF, s = HF.sky(hs);
    const over = s.over || 0;
    // настоящая высота солнца
    const md = ((hs.time % 1440) + 1440) % 1440, ang = (md / 1440 - 0.25) * Math.PI * 2;
    const el = Math.sin(ang), sl = Math.hypot(Math.cos(ang), 0.42, el);
    const sunReal = [Math.cos(ang) / sl, el / sl, 0.42 / sl];
    const day = sm(-0.12, 0.25, el);           // 0 ночь … 1 день
    const gold = sm(-0.1, 0.05, el) * (1 - sm(0.12, 0.42, el)); // золотой час
    // тёмное фэнтези: небо низкое и серое, синевы мало, закаты — ржавые, ночи — чёрные
    let zen = mix3([0.008, 0.01, 0.028], [0.27, 0.34, 0.46], day);
    let hor = mix3([0.03, 0.035, 0.06], [0.6, 0.63, 0.64], day);
    zen = mix3(zen, [0.22, 0.18, 0.3], gold * 0.6);
    hor = mix3(hor, [0.86, 0.48, 0.3], gold * 0.8);
    let glow = mix3([0.08, 0.08, 0.12], [0.9, 0.8, 0.62], day);
    glow = mix3(glow, [1.1, 0.48, 0.2], gold);
    let cloudLit = mix3([0.12, 0.13, 0.18], [0.84, 0.84, 0.85], day), cloudSh = mix3([0.03, 0.035, 0.06], [0.36, 0.38, 0.43], day);
    cloudLit = mix3(cloudLit, [0.95, 0.58, 0.38], gold); cloudSh = mix3(cloudSh, [0.32, 0.24, 0.32], gold);
    const grey = mix3([0.05, 0.05, 0.065], [0.5, 0.52, 0.54], day);
    zen = mix3(zen, grey, over * 0.8); hor = mix3(hor, mix3(grey, [0.7, 0.72, 0.76], day * 0.5), over * 0.75);
    cloudLit = mix3(cloudLit, mix3(grey, [0.8, 0.8, 0.82], day), over * 0.6); cloudSh = mix3(cloudSh, mix3(grey, [0.42, 0.44, 0.48], day), over * 0.6);
    glow = glow.map((v) => v * (1 - over * 0.7));
    let fogD = 0.0078 + over * 0.003 + (1 - day) * 0.003;
    const w = hs.weather;
    if (w === 'fog') fogD = 0.06; else if (w === 'blizzard' || w === 'sandstorm') fogD = 0.04; else if (w === 'rain' || w === 'storm' || w === 'snow') fogD = 0.012;
    if (w === 'sandstorm') { hor = [0.7, 0.55, 0.35]; zen = [0.6, 0.48, 0.32]; }
    if (m.dimName && DIMC[m.dimName]) { zen = DIMC[m.dimName][0]; hor = DIMC[m.dimName][1]; fogD = 0.02; glow = [0.2, 0.2, 0.2]; }
    const sunK = s.sun.map((v, i) => v * [0.92, 0.9, 0.86][i]);
    // в золотой час небо подсвечивает всё тёплым — тени не проваливаются в черноту
    s.amb = s.amb.map((v, i) => v + gold * [0.2, 0.12, 0.13][i] * (1 - over * 0.5) + (1 - day) * [0.015, 0.02, 0.045][i]);
    const out = {
      zen, hor, fog: hor, fogSun: mix3(hor, glow.map((v) => Math.min(1.1, v)), 0.55), fogD, glow,
      sunDir: [s.S[0], s.S[2], s.S[1]], sunSky: sunReal, sun: sunK, amb: s.amb.map((v) => v * 1.0),
      sunDisc: el > -0.06 ? mix3([1.3, 1.15, 0.9], [1.4, 0.75, 0.4], gold).map((v) => v * (1 - over * 0.85) * Math.min(1, (el + 0.06) * 12)) : [0, 0, 0],
      moonDir: s.M ? [s.M[0], s.M[2], s.M[1]] : [0, -1, 0], stars: Math.max(0, 1 - day * 1.5) * (1 - over * 0.9),
      cloud: Math.min(1, 0.62 + over * 0.6), cloudLit, cloudSh, cloudC: cloudLit,
      night: day < 0.3 ? 1 : 0, indoor: false, seed: (seed % 97) * 3.1,
    };
    // ночью светит луна: её направление вместо солнечного
    if (s.moon && s.M && el < 0) { const k = Math.min(1, -el * 5); out.sunDir = out.sunDir.map((v, i) => v * (1 - k) + out.moonDir[i] * k); const l = Math.hypot(...out.sunDir); out.sunDir = out.sunDir.map((v) => v / l); out.sun = out.sun.map((v, i) => v + s.moon[i] * 0.8); }
    if (!m.outdoor) { out.indoor = true; out.fog = [0.02, 0.018, 0.022]; out.fogSun = out.fog; out.fogD = 0.09; out.amb = [0.09, 0.082, 0.088]; out.sun = [0, 0, 0]; out.night = 1; out.hor = out.fog; out.zen = out.fog; out.glow = [0, 0, 0]; }
    return out;
  }

  // ============================================================
  // Кадр
  // ============================================================
  let rafOn = false;
  const RO = [0, 0]; // начало координат кадра (общие клетки)
  function wanted() {
    // какие куски нужны: те, что ближе NEAR клеток к камере
    const m = G.map;
    if (m.kind !== 'over') return [];
    const cx = m.region.x * MW + (G.P.posX != null ? G.P.posX : G.P.x + 0.5), cz = m.region.y * MH + (G.P.posY != null ? G.P.posY : G.P.y + 0.5);
    const out = [];
    for (let ry = Math.floor((cz - NEAR) / MH); ry <= Math.floor((cz + NEAR) / MH); ry++) for (let rx = Math.floor((cx - NEAR) / MW); rx <= Math.floor((cx + NEAR) / MW); rx++) {
      if (rx < 0 || ry < 0 || rx >= WS || ry >= WS) continue;
      const dx = Math.max(rx * MW - cx, 0, cx - (rx + 1) * MW), dz = Math.max(ry * MH - cz, 0, cz - (ry + 1) * MH);
      out.push({ rx, ry, d: Math.hypot(dx, dz) });
    }
    out.sort((a, b) => a.d - b.d);
    return out;
  }
  // подготовить куски: сначала карты (с кольцом соседей), потом сетки — по одной за кадр
  function stream(now) {
    const m = G.map, P3 = Gfx.P3;
    if (m.kind !== 'over') {
      // подземелье, измерение — один кусок, ровный
      let cd = V3.cd.get('L');
      if (!cd || cd.m !== m) {
        for (const [k, ms] of V3.mesh) freeMesh(ms);
        V3.mesh.clear(); V3.cd.clear();
        cd = { key: m.key, ck: 'L', rx: 0, ry: 0, ox: 0, oz: 0, m, over: false };
        prep(cd); V3.cd.set('L', cd);
      }
      const sig = sigOf(cd);
      let ms = V3.mesh.get('L');
      if (!ms || ms.sig !== sig || ms.gen !== P3.sprGen) {
        if (ms) freeMesh(ms);
        const b = buildChunk(cd);
        ms = { sig, gen: P3.sprGen, h: P3.upload(b.M), bh: P3.upload(bakeStatics(b.statics, cd)), objs: b.objs, lights: b.lights, cd };
        V3.mesh.set('L', ms);
      }
      return [ms];
    }
    if (V3.cd.has('L')) { for (const [, ms] of V3.mesh) freeMesh(ms); V3.mesh.clear(); V3.cd.clear(); }
    const want = wanted();
    const keep = new Set();
    let budget = now + 28;
    // карты нужных кусков и их соседей
    for (const w of want) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const rx = w.rx + dx, ry = w.ry + dy;
      if (rx < 0 || ry < 0 || rx >= WS || ry >= WS) continue;
      const ck = rx + ',' + ry;
      keep.add(ck);
      const cd = V3.cd.get(ck);
      const mine = rx === m.region.x && ry === m.region.y;
      if (cd && (!mine || cd.m === m)) continue;
      if (!mine && performance.now() > budget && cd) continue;
      if (!mine && performance.now() > budget) { V3.pending = true; continue; }
      loadCD(rx, ry);
    }
    // сетки — сначала ближние
    const out = [];
    let built = false;
    for (const w of want) {
      const ck = w.rx + ',' + w.ry, cd = V3.cd.get(ck);
      if (!cd) continue;
      let ready = true;
      for (let dy = -1; dy <= 1 && ready; dy++) for (let dx = -1; dx <= 1; dx++) { const rx = w.rx + dx, ry = w.ry + dy; if (rx < 0 || ry < 0 || rx >= WS || ry >= WS) continue; if (regionKey(rx, ry) && !V3.cd.has(rx + ',' + ry)) { ready = false; break; } }
      let ms = V3.mesh.get(ck);
      const sig = sigOf(cd);
      if ((!ms || ms.sig !== sig || ms.gen !== P3.sprGen) && ready && (!built || !ms && w.d === 0)) {
        if (!ms || ms.sig !== sig || ms.gen !== P3.sprGen) {
          const b = buildChunk(cd);
          const nm = { sig, gen: P3.sprGen, h: P3.upload(b.M), bh: P3.upload(bakeStatics(b.statics, cd)), objs: b.objs, lights: b.lights, cd };
          if (ms) freeMesh(ms);
          ms = nm; V3.mesh.set(ck, ms); built = true;
        }
      } else if (!ms || ms.sig !== sig) V3.pending = true;
      if (ms) out.push(ms);
    }
    // убрать далёкое
    for (const [ck, ms] of V3.mesh) if (!want.some((w) => w.rx + ',' + w.ry === ck)) { freeMesh(ms); V3.mesh.delete(ck); }
    for (const ck of [...V3.cd.keys()]) if (!keep.has(ck)) V3.cd.delete(ck);
    return out;
  }
  // ---------- дальний лес: те же деревья, что вблизи, — до самого горизонта ----------
  // Где кончаются подробные куски, лес не обрывается: деревья стоят там же, где встанут, когда подойдёшь
  // (мировой шум тот же), только без травы под ногами. Каждая земля — своя связка спрайтов.
  const FARTREE = 250;
  const FARWOOD = new Map();
  const FOL = { 0: ['#5a9a40', '#4a8a3a'], 1: ['#3e7b34', '#4a8a3c'], 2: ['#c08a30', '#b05a2a', '#c8a040'], 3: ['#3e7b34', '#4a8a3c'] };
  function farTreeSprite(key, col, seed) {
    const P3 = Gfx.P3, PX = Gfx.PX;
    const pk = key + '|0|' + (col || '') + '|0|0|0|0|' + seed;
    let r = V3.sprCache && V3.sprCache.get(pk);
    if (!r || r.gen !== P3.sprGen) {
      const sp = PX.sprite(key, { c: col, seed, season: season() }, { yaw: 0, pitch: 0.12, ppu: 44 });
      if (!sp) return null;
      r = P3.sprite(sp);
      (V3.sprCache = V3.sprCache || new Map()).set(pk, r);
    }
    return r;
  }
  function buildForest(rx, ry) {
    const P3 = Gfx.P3, MG = E.MapGen, B = P3.bmesh(), W = G.W;
    const X0 = rx * MW, Z0 = ry * MH, g = W.regions[ry * WS + rx];
    const sea = season(), cold = g.t < 0.55, fol = FOL[sea] || FOL[1];
    const v = E.Sim.variant(ry * WS + rx);
    if (v === null || v === 'c' || v === 'i' || g.exist === 'cyclic' || g.biome === 'ocean' || g.biome === 'sky') return { h: null, sea };
    // посёлок вырубил лес вокруг себя
    const s = g.settlement >= 0 ? W.settlements[g.settlement] : null;
    const SZ = { capital: [33, 17], town: [30, 16], village: [26, 14], tree: [25, 14], hamlet: [18, 10], farm: [10, 7], vanish: [20, 12] };
    const sz = s ? SZ[s.type] || [24, 13] : null;
    const st = 2;
    for (let z = 0; z < MH; z += st) for (let x = 0; x < MW; x += st) {
      const h = U.hash(X0 + x, Z0 + z, 77);
      const lx = x + (h & 1), lz = z + ((h >> 1) & 1);
      if (sz && Math.abs(lx - MW / 2) < sz[0] && Math.abs(lz - MH / 2) < sz[1]) continue;
      const tid = MG.terrainAt(W, X0 + lx, Z0 + lz);
      let key = null, col = null;
      if (tid === T.TREE) { if (sea === 3 && cold) key = 'tree_bare'; else { key = (lx * 7 + lz * 13) % 5 < 2 ? 'tree2' : 'tree'; col = fol[(lx + lz * 3) % fol.length]; } }
      else if (tid === T.PINE) { if ((sea === 3 && cold) || g.biome === 'ice' || g.biome === 'tundra') key = 'pine_snow'; else col = (lx + lz) % 3 ? '#2e6b55' : '#3a7a5a', key = 'pine'; }
      else if (tid === T.DEADTREE) key = 'deadtree';
      else if (tid === T.BIGTREE) { key = 'tree'; col = fol[0]; }
      if (!key) continue;
      const r = farTreeSprite(key, col, (lx * 7 + lz * 13) % 3);
      if (!r) continue;
      const gx = X0 + lx + 0.5, gz = Z0 + lz + 0.5;
      const j = ((h >> 4) % 100) / 100 - 0.5;
      P3.bb(B, r, lx + 0.5, HGT.far(gx, gz) - 0.05, lz + 0.5, (tid === T.BIGTREE ? 2.2 : 1.25) + j * 0.3, 1);
    }
    return { h: B.n ? P3.upload(B) : null, sea };
  }
  function farForest(now, meshes, cx, cz) {
    const m = G.map, P3 = Gfx.P3, out = [];
    if (m.kind !== 'over') return out;
    const near = new Set(meshes.map((ms) => ms.cd.rx + ',' + ms.cd.ry));
    const budget = now + 8, sea = season();
    const want = [];
    for (let ry = Math.floor((cz - FARTREE) / MH); ry <= Math.floor((cz + FARTREE) / MH); ry++) for (let rx = Math.floor((cx - FARTREE) / MW); rx <= Math.floor((cx + FARTREE) / MW); rx++) {
      if (rx < 0 || ry < 0 || rx >= WS || ry >= WS || near.has(rx + ',' + ry)) continue;
      const dx = Math.max(rx * MW - cx, 0, cx - (rx + 1) * MW), dz = Math.max(ry * MH - cz, 0, cz - (ry + 1) * MH), d = Math.hypot(dx, dz);
      if (d > FARTREE) continue;
      want.push({ rx, ry, d });
    }
    want.sort((a, b) => a.d - b.d);
    const keep = new Set();
    for (const w of want) {
      const ck = w.rx + ',' + w.ry;
      keep.add(ck);
      let f = FARWOOD.get(ck);
      if (!f || f.sea !== sea || f.gen !== P3.sprGen || f.seed !== G.W.seed) {
        if (performance.now() > budget) { V3.pending = true; if (!f) continue; }
        else { if (f) P3.free(f.h); f = buildForest(w.rx, w.ry); f.gen = P3.sprGen; f.seed = G.W.seed; FARWOOD.set(ck, f); }
      }
      if (f.h) out.push({ h: f.h, off: [w.rx * MW - RO[0], 0, w.ry * MH - RO[1]], noShadow: true });
    }
    for (const [ck, f] of FARWOOD) if (!keep.has(ck)) { P3.free(f.h); FARWOOD.delete(ck); }
    return out;
  }
  // подпись куска: меняется — сетку пересобираем
  function sigOf(cd) {
    const m = cd.m;
    let h = 0;
    for (let i = 0; i < m.tiles.length; i++) h = (Math.imul(h, 31) + m.tiles[i]) | 0;
    if (!m.outdoor && m === G.map) for (let i = 0; i < m.tiles.length; i++) if (m.ex[i] || G.vis[i]) h = (Math.imul(h, 7) + i) | 0;
    return h + '|' + season();
  }

  // люди соседнего посёлка: кто где стоит в этот час (пока ты не пришёл туда сам)
  function crowdOf(cd) {
    const m = cd.m, sid = m.sett;
    if (sid == null || sid < 0 || !E.Sim.settAlive || !E.Sim.settAlive[sid]) return [];
    const hour = Math.floor(((G.S.time % 1440) + 1440) % 1440 / 60);
    const night = hour < 6 || hour >= 22;
    const key = sid + '|' + (night ? 'n' : Math.floor(hour / 3));
    if (cd.crowd && cd.crowdKey === key) return cd.crowd;
    const sp = m.spots || {};
    const spots = [].concat(sp.square || [], sp.street || [], night ? [] : sp.field || [], night ? [] : sp.dock || []);
    const out = [];
    if (spots.length) {
      const ids = E.Sim.settAlive[sid];
      const n = Math.min(ids.length, night ? 3 : 16, spots.length);
      for (let k = 0; k < n; k++) {
        const id = ids[(k * 7 + hour) % ids.length], nn = E.Sim.npc(id);
        if (!nn) continue;
        const p = spots[(U.hash(sid, id, hour) >>> 0) % spots.length];
        if (out.some((q) => q.x === p.x && q.y === p.y)) continue;
        const job = E.Sim.job(id);
        out.push({ x: p.x, y: p.y, key: UI.entArt({ kind: 'npc', npc: id, job }), c: nn.col || '#c8b8a0', hd: (U.hash(id, hour, 5) % 8) * Math.PI / 4 });
      }
    }
    cd.crowd = out; cd.crowdKey = key;
    return out;
  }
  UI.drawMap3D = function (t, L) {
    const m = G.map, P = G.P, X = UI.mvTiles, P3 = Gfx.P3, RT = E.RT;
    const now = performance.now();
    if (V3.mapKey !== m.key) { V3.mapKey = m.key; }
    const dt = Math.min(0.1, (now - (V3.last || now)) / 1000); V3.last = now;
    fields();
    const dpr = t.dpr || 1;
    const vx0 = L.mx * t.cw, vy0 = L.my * t.ch, vw = L.mw * t.cw, vh = L.mh * t.ch;
    const KP = Math.max(2, Math.round(vh * dpr / 260));
    const fw = Math.max(64, Math.ceil(vw * dpr / KP)), fh = Math.max(48, Math.ceil(vh * dpr / KP));
    // голова: в живом мире — куда смотришь; по ходам — плавный поворот к стороне света
    if (live()) { V3.yawT = V3.yaw; V3.face = faceOf(V3.yaw); }
    else { let d = V3.yawT - V3.yaw; V3.yaw += d * Math.min(1, dt * 14); if (Math.abs(d) > 0.002) UI.animUntil = Math.max(UI.animUntil || 0, now + 60); V3.pitch = 0; }
    // где ты
    let px, py, pmov;
    if (live() && P.posX != null && Math.floor(P.posX) === P.x && Math.floor(P.posY) === P.y) { px = P.posX; py = P.posY; pmov = RT.moving; }
    else { const ps = X.track('P', P.x, P.y, now); const cp = X.curPos(ps, now); px = cp[0] + 0.5; py = cp[1] + 0.5; pmov = cp[2]; }
    const over = m.kind === 'over';
    const gox = over ? m.region.x * MW : 0, goz = over ? m.region.y * MH : 0;
    const gx = gox + px, gz = goz + py;
    RO[0] = Math.floor(gx / 64) * 64; RO[1] = Math.floor(gz / 64) * 64;
    // куски
    V3.pending = false;
    const meshes = stream(now);
    if (over && (!FAR || FAR.key !== G.W.seed + ':' + G.W.regions.length)) { if (FAR) P3.free(FAR.h); buildFar(); }
    // что ближе: граница подробных кусков (дальняя земля под ними опускается)
    let near = null;
    if (over && meshes.length) {
      let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
      for (const ms of meshes) { x0 = Math.min(x0, ms.cd.ox); z0 = Math.min(z0, ms.cd.oz); x1 = Math.max(x1, ms.cd.ox + MW); z1 = Math.max(z1, ms.cd.oz + MH); }
      near = [x0 - RO[0] + 0.01, z0 - RO[1] + 0.01, x1 - RO[0] - 0.01, z1 - RO[1] - 0.01];
    }
    // небо и свет
    const w = E.Gm.weather();
    const hs = { time: G.S.time, outdoor: !!m.outdoor, dim: m.dimName || null, weather: m.outdoor && !m.dimName ? w : null, season: season(), cold: m.region && m.region.t < 0.55, fullMoon: E.Gm.fullMoon(), nightland: m.tint === 'night' };
    const sky = skyOf(m, hs);
    const rects = X.roofsOf(m);
    const inside = rects.find((r) => P.x >= r.rect.x && P.y >= r.rect.y && P.x < r.rect.x + r.rect.w && P.y < r.rect.y + r.rect.h && X.roofIntact(m, r.rect)) || null;
    if (inside && m.outdoor) sky.amb = sky.amb.map((v) => v * 0.9);
    const walked = RT ? RT.walked || 0 : 0;
    const bob = pmov ? (live() ? Math.sin(walked * 5.2) * 0.022 : Math.sin(now / 55) * 0.015) : 0;
    const ground = HGT.groundAt(gx, gz);
    V3.camY = V3.camY == null || Math.abs(V3.camY - ground) > 2 ? ground : V3.camY + (ground - V3.camY) * Math.min(1, dt * 12);
    const jy = RT && RT.jy > 0 ? RT.jy : 0;
    const land = RT && RT.landed ? Math.max(0, 1 - (now - RT.landed) / 160) : 0;
    const cam = { x: gx - RO[0], y: V3.camY + EYE + bob + jy - land * 0.05, z: gz - RO[1], yaw: V3.yaw, pitch: (V3.pitch || 0) - 0.04, fov: 1.2 };
    // глаза в координатах этой карты (для выстрелов и прицела)
    V3.camPos = { x: px, y: cam.y, z: py };
    const fx = Math.sin(V3.yaw), fz = -Math.cos(V3.yaw);
    // огни: ближние к камере + факел
    const lights = [];
    const dayK = m.outdoor ? U.clamp((Time.light(G.S.time) - 0.15) / 0.6, 0, 1) : 0;
    for (const ms of meshes) for (const l of ms.lights) {
      const lx = ms.cd.ox + l.x - RO[0], lz = ms.cd.oz + l.z - RO[1], d = (lx - cam.x) ** 2 + (lz - cam.z) ** 2;
      if (d >= 900 || (l.day && dayK < 0.05)) continue;
      lights.push({ x: lx, y: l.y, z: lz, r: l.r, col: l.col, i: l.day ? l.i * dayK : l.fl ? l.i * (0.85 + 0.15 * Math.sin(now / 90 + l.x * 3)) : l.i, d: l.day ? d * 1.5 : d });
    }
    lights.sort((a, b) => a.d - b.d);
    lights.length = Math.min(lights.length, 7);
    const dark = !m.outdoor || m.dimName ? 1 : Math.max(0, 1 - Time.light(G.S.time) * 1.4);
    if (E.Gm.lanternHeld && E.Gm.lanternHeld() && !(P.light > 0)) lights.unshift({ x: cam.x + fx * 0.3 + Math.cos(V3.yaw) * 0.25, y: cam.y + 0.05, z: cam.z + fz * 0.3 + Math.sin(V3.yaw) * 0.25, r: 7, col: [1, 0.82, 0.55], i: 1.25 });
    else if (P.light > 0) lights.unshift({ x: cam.x + fx * 0.3 + Math.cos(V3.yaw) * 0.25, y: cam.y + 0.1, z: cam.z + fz * 0.3 + Math.sin(V3.yaw) * 0.25, r: 7.5, col: [1, 0.66, 0.36], i: 1.4 * (0.9 + 0.1 * Math.sin(now / 70)) });
    else if (dark > 0.15) lights.unshift({ x: cam.x, y: cam.y + 0.3, z: cam.z, r: 4, col: [0.5, 0.55, 0.78], i: 0.5 * dark });
    // спрайты этого кадра
    const PX = Gfx.PX, dyn = P3.bmesh();
    const budget = now + 18;
    const add = (key, o, wx, wz, heading, scale, skyK) => {
      const dx = wx - cam.x, dz = wz - cam.z;
      const dist = Math.hypot(dx, dz);
      if (dist > FARSPR) return;
      if ((dx * fx + dz * fz) < -0.6 && dist > 1.5) return; // позади
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
      if (!r || r.gen !== P3.sprGen) {
        if (performance.now() > budget) { V3.pending = true; return; }
        const sp = PX.sprite(key, o, { yaw, pitch: 0.12, ppu: 44 });
        if (!sp) return;
        r = P3.sprite(sp);
        (V3.sprCache = V3.sprCache || new Map()).set(pk, r);
        if (V3.sprCache.size > 4000) V3.sprCache.clear();
      }
      const gy = HGT.groundAt(wx + RO[0], wz + RO[1]);
      P3.bb(dyn, r, wx, gy, wz, scale || K_ENT, skyK == null ? 1 : skyK);
    };
    const skyKAt = (x, y) => { if (!m.outdoor) return 0; const tid = m.tiles[U.clamp(y, 0, m.h - 1) * m.w + U.clamp(x, 0, m.w - 1)]; return TL[tid].indoor ? 0.3 : 1; };
    // вещи-«не-щиты» (сундуки, кровати, костры…)
    for (const ms of meshes) for (const ob of ms.objs) {
      const wx = ms.cd.ox + ob.x + 0.5 - RO[0], wz = ms.cd.oz + ob.y + 0.5 - RO[1];
      if (Math.abs(wx - cam.x) > FARSPR || Math.abs(wz - cam.z) > FARSPR) continue;
      add(ob.k, { c: ob.c, seed: ob.seed % 3, f: ob.k === 'campfire' || ob.k === 'hearth' ? Math.floor(now / 160) % 4 : 0, season: season() }, wx, wz, Math.PI / 2, K_ENT, ob.sky);
    }
    // вещи на земле
    for (const it of m.items) { if (!G.vis[it.y * m.w + it.x]) continue; add(X.itemArt(it.it), {}, gox + it.x + 0.5 - RO[0], goz + it.y + 0.5 - RO[1], Math.PI / 2, K_ENT, skyKAt(it.x, it.y)); }
    // существа
    const reveal = G.revealUntil && G.turn < G.revealUntil;
    // на улице видно всех, кто не заслонён (заслоняет сама картинка); в подземелье — только в поле зрения
    const openAir = m.outdoor && !m.dimName;
    for (const e of m.ents) {
      if (e.dead) continue;
      const vis = G.vis[e.y * m.w + e.x] || (openAir && !e.hidden && !e.asleep);
      if (!vis && !(reveal && e.kind !== 'npc')) continue;
      const s = X.track(e.id, e.x, e.y, now);
      const [ex, ey, moving] = X.curPos(s, now);
      let hd = V3.head.get(e.id);
      const prev = V3.head.get('p' + e.id);
      if (prev && (prev[0] !== e.x || prev[1] !== e.y)) { hd = Math.atan2(e.y - prev[1], e.x - prev[0]); V3.head.set(e.id, hd); }
      V3.head.set('p' + e.id, [e.x, e.y]);
      if (hd == null || (e.hostile || e.hostileToP) && !moving) hd = Math.atan2(P.y - e.y, P.x - e.x);
      const base = X.entArt(e), ev = UI.entVar ? UI.entVar(e) : null;
      const key = ev ? base + '~' + ev : base;
      const always = X.ALWAYS.has(base) || base.startsWith('b_');
      const f = always ? Math.floor((now + e.id * 137) / 220) % 4 : moving ? (s.step % 2 ? 1 : 3) : 0;
      let mode = 0;
      if (e.ghost || (e.kind === 'npc' && e.ai === 'wander' && e.immortal)) mode = 4;
      let c = e.c;
      if (e.kind === 'npc' && e.hostile) c = '#e07060';
      const hit = G.hitEnt === e.id && now - (G.hitEntT || 0) < 160;
      add(key, { c, f, moving, mode, hit }, gox + ex + 0.5 - RO[0], goz + ey + 0.5 - RO[1], hd, K_ENT, skyKAt(e.x, e.y));
    }
    // в соседних посёлках тоже живут: издали видно людей на площадях и улицах
    if (over) for (const ms of meshes) {
      const cd = ms.cd;
      if (cd.m === m) continue;
      for (const p of crowdOf(cd)) add(p.key, { c: p.c, f: 0 }, cd.ox + p.x + 0.5 - RO[0], cd.oz + p.y + 0.5 - RO[1], p.hd, K_ENT, 1);
    }
    // погода
    let wx = null;
    if (m.outdoor && !m.dimName && !inside) {
      if (w === 'rain') wx = { kind: 1, dens: 0.08, col: [0.65, 0.72, 0.9] };
      else if (w === 'storm') wx = { kind: 1, dens: 0.14, col: [0.7, 0.75, 0.95] };
      else if (w === 'snow') wx = { kind: 2, dens: 0.05, col: [0.95, 0.97, 1] };
      else if (w === 'blizzard') wx = { kind: 2, dens: 0.11, col: [0.95, 0.97, 1] };
      else if (w === 'blacksnow') wx = { kind: 2, dens: 0.06, col: [0.2, 0.2, 0.24] };
      else if (w === 'ashrain') wx = { kind: 2, dens: 0.06, col: [0.55, 0.52, 0.5] };
    }
    // мелочь у ног: пересобрать, если ушли или появились новые куски
    const dcx = Math.floor(gx), dcz = Math.floor(gz);
    const detKey = m.key + '|' + meshes.length;
    if (!DET || Math.abs(DET.cx - dcx) > 6 || Math.abs(DET.cz - dcz) > 6 || DET.gen !== P3.sprGen || DET.sea !== season() || DET.key !== detKey) {
      if (performance.now() < now + 40 || !DET) { if (DET) P3.free(DET.h); DET = buildDetail(dcx, dcz); DET.key = detKey; }
    }
    // сетки кадра
    const fm = [];
    for (const ms of meshes) fm.push({ h: ms.h, off: [ms.cd.ox - RO[0], 0, ms.cd.oz - RO[1]] });
    // стрелы, болты, камни и чары в полёте
    const sh = shotsMesh(now, lights, gox - RO[0], goz - RO[1]);
    if (sh) fm.push({ h: sh, off: [gox - RO[0], 0, goz - RO[1]], noShadow: true });
    const bills = meshes.map((ms) => ({ h: ms.bh, off: [ms.cd.ox - RO[0], 0, ms.cd.oz - RO[1]] }));
    if (DET && DET.h && m.outdoor) bills.push({ h: DET.h, off: [DET.cx - RO[0], 0, DET.cz - RO[1]] });
    if (over && !m.dimName && !V3.noFarWood) for (const b of farForest(now, meshes, gx, gz)) bills.push(b);
    // дом, где ты: крыша прячется, потолок видно (крыши и потолки — особые вершины в сетке)
    const hide = inside ? [gox + inside.rect.x - RO[0] - 0.6, goz + inside.rect.y - RO[1] - 0.6, gox + inside.rect.x + inside.rect.w - RO[0] + 0.6, goz + inside.rect.y + inside.rect.h - RO[1] + 0.6] : null;
    const frame = {
      w: fw, h: fh, time: now / 1000, cam, sky, lights, meshes: fm, bills, dyn, wx, near, hide,
      far: over && FAR ? { h: FAR.h, off: [-RO[0], 0, -RO[1]] } : null,
      farClip: over ? 1500 : 80,
      shadow: m.outdoor && !m.dimName ? { center: [cam.x + fx * 18, V3.camY, cam.z + fz * 18], size: 46, k: inside ? 1 : 1 } : null,
    };
    const gcv = P3.render(frame);
    V3.view = { vx0, vy0, vw, vh, fw, fh, K: KP, dpr, gox, goz };
    UI.mv3 = V3.view;
    // подсказки [E] старого вида: проекция центра клетки
    UI.mvRect3 = (x, y) => {
      if (x === P.x && y === P.y) return { x: vx0 + vw / 2 - 20, y: vy0 + vh - 60, w: 40, h: 20 };
      const gy2 = HGT.groundAt(gox + x + 0.5, goz + y + 0.5);
      const p = P3.project(gox + x + 0.5 - RO[0], gy2 + 1.0, goz + y + 0.5 - RO[1]);
      if (!p) return null;
      const sx = vx0 + p[0] / fw * vw, sy = vy0 + p[1] / fh * vh;
      if (sx < vx0 || sx > vx0 + vw || sy < vy0 || sy > vy0 + vh) return null;
      return { x: sx - 20, y: sy, w: 40, h: 20 };
    };
    t.under = (ctx) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(vx0, vy0, vw, vh); ctx.clip();
      ctx.imageSmoothingEnabled = false;
      if (gcv) ctx.drawImage(gcv, vx0, vy0, fw * KP / dpr, fh * KP / dpr);
      // тёмные края кадра — как на старой гравюре
      const vg = ctx.createRadialGradient(vx0 + vw / 2, vy0 + vh * 0.48, Math.min(vw, vh) * 0.38, vx0 + vw / 2, vy0 + vh * 0.48, Math.hypot(vw, vh) * 0.62);
      vg.addColorStop(0, 'rgba(8,6,10,0)'); vg.addColorStop(1, 'rgba(8,6,10,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(vx0, vy0, vw, vh);
      // рука с оружием
      if (UI.drawHand3D) UI.drawHand3D(ctx, { vx0, vy0, vw, vh, px: KP / dpr, fw, fh, now, moving: pmov, walked, sky, lights, cam, inside: !m.outdoor || !!inside });
      if (UI.drawHUD3D) UI.drawHUD3D(ctx, t, { vx0, vy0, vw, vh, now, cam, RO, gox, goz, fw, fh });
      drawCompass(ctx, t, vx0, vy0, vw);
      drawMinimap(ctx, m, P, vx0 + vw - 8, vy0 + 8, Math.round(Math.min(vw, vh) * 0.22), KP / dpr);
      // попадание по тебе — красная вспышка по краям
      if (G.hitFlash && now - G.hitFlash < 200) { ctx.fillStyle = 'rgba(200,30,20,' + (0.25 * (1 - (now - G.hitFlash) / 200)) + ')'; ctx.fillRect(vx0, vy0, vw, vh); }
      ctx.restore();
    };
    V3.proj = (lx, ly, lz) => { const p = P3.project(lx - RO[0], ly, lz - RO[1]); if (!p) return null; return [vx0 + p[0] / fw * vw, vy0 + p[1] / fh * vh, p[2]]; };
    if (!live() && (V3.pending || Math.abs(V3.yawT - V3.yaw) > 0.002) && !rafOn) { rafOn = true; requestAnimationFrame(() => { rafOn = false; UI.render(); }); }
  };
  // ---------- снаряды: тонкие брусочки по ходу полёта ----------
  let SHOT_H = null;
  function shotsMesh(now, lights, ox, oz) {
    const P3 = Gfx.P3, RT = E.RT;
    if (SHOT_H) { P3.free(SHOT_H); SHOT_H = null; }
    if (!RT || !RT.shots || !RT.shots.length) return null;
    const M = P3.mesh();
    const prism = (cx, cy, cz, d, len, th, tile, back) => {
      // ось d (единичная), поперечные u (по земле) и v (вверх от оси)
      let ux = -d[2], uz = d[0];
      const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
      const v = [d[1] * uz, d[2] * ux - d[0] * uz, -d[1] * ux];
      const a = [cx - d[0] * len * back, cy - d[1] * len * back, cz - d[2] * len * back], b = [cx + d[0] * len * (1 - back), cy + d[1] * len * (1 - back), cz + d[2] * len * (1 - back)];
      const off = (p, su, sv) => [p[0] + ux * su * th + v[0] * sv * th, p[1] + v[1] * sv * th, p[2] + uz * su * th + v[2] * sv * th];
      const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (let i = 0; i < 4; i++) {
        const c0 = C[i], c1 = C[(i + 1) % 4];
        const n = [ux * (c0[0] + c1[0]) * 0.5 + v[0] * (c0[1] + c1[1]) * 0.5, v[1] * (c0[1] + c1[1]) * 0.5, uz * (c0[0] + c1[0]) * 0.5 + v[2] * (c0[1] + c1[1]) * 0.5];
        P3.quad(M, off(a, c0[0], c0[1]), off(b, c0[0], c0[1]), off(b, c1[0], c1[1]), off(a, c1[0], c1[1]), [0, 0], [1, 0.2], tile, n, 1, 0);
      }
      P3.quad(M, off(b, -1, -1), off(b, 1, -1), off(b, 1, 1), off(b, -1, 1), [0, 0], [0.2, 0.2], tile, d, 1, 0);
    };
    for (const s of RT.shots) {
      const sp = Math.hypot(s.vx, s.vy, s.vz) || 1, d = [s.vx / sp, s.vy / sp, s.vz / sp];
      const gy = s.y;
      if (s.k === 'spell') {
        const col = s.el === 'ice' ? [0.6, 0.85, 1] : s.el === 'storm' ? [0.75, 0.8, 1] : s.el === 'acid' ? [0.55, 1, 0.4] : s.el === 'holy' ? [1, 0.95, 0.7] : s.el === 'dark' || s.el === 'void' || s.el === 'arcane' ? [0.6, 0.4, 1] : [1, 0.55, 0.2];
        // сгусток — звезда из трёх лучей, крутится на лету
        const r = 0.05 + 0.015 * Math.sin(now / 40), a = now / 90;
        const ax = [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
        for (const q of ax) prism(s.x, gy, s.z, q, 0.17, r, 'flame', 0.5);
        prism(s.x, gy, s.z, d, 0.5, r * 0.6, 'flame', 0.9);
        lights.unshift({ x: ox + s.x, y: gy, z: oz + s.z, r: 4.5, col, i: 1.5 });
        continue;
      }
      // особый снаряд: наконечник своего цвета, огненный — горит и светит
      const fx = s.fx, glow = fx && fx.glow;
      if (glow) lights.unshift({ x: ox + s.x, y: gy, z: oz + s.z, r: 3.5, col: fx.el === 'ice' ? [0.6, 0.85, 1] : [1, 0.6, 0.25], i: 1.2 });
      if (s.k === 'stone') { if (fx && fx.blast) prism(s.x, gy, s.z, d, 0.12, 0.07, 'flame', 0.5); else prism(s.x, gy, s.z, d, 0.07, 0.04, 'rockfloor', 0.5); continue; }
      const shaft = s.k === 'bolt' ? 'wood:d' : 'wood:l';
      prism(s.x, gy, s.z, d, s.len, 0.013, shaft, 0.92);
      prism(s.x, gy, s.z, d, glow ? 0.09 : 0.06, glow ? 0.035 : 0.022, glow ? 'flame' : 'iron', 0.1);
      // оперение: два тонких пера крест-накрест
      const fx0 = s.x - d[0] * s.len * 0.8, fy0 = gy - d[1] * s.len * 0.8, fz0 = s.z - d[2] * s.len * 0.8;
      let ux = -d[2], uz = d[0]; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
      const vv = [d[1] * uz, d[2] * ux - d[0] * uz, -d[1] * ux];
      const fl = 'linen', L = s.k === 'bolt' ? 0.09 : 0.13, W = 0.03;
      for (const q of [[ux, 0, uz], vv]) {
        const p0 = [fx0 - d[0] * L * 0.5, fy0 - d[1] * L * 0.5, fz0 - d[2] * L * 0.5], p1 = [fx0 + d[0] * L * 0.5, fy0 + d[1] * L * 0.5, fz0 + d[2] * L * 0.5];
        const A = (p, k) => [p[0] + q[0] * W * k, p[1] + q[1] * W * k, p[2] + q[2] * W * k];
        const n = [q[1] * d[2] - q[2] * d[1], q[2] * d[0] - q[0] * d[2], q[0] * d[1] - q[1] * d[0]];
        P3.quad(M, A(p0, -1), A(p1, -0.4), A(p1, 0.4), A(p0, 1), [0, 0], [0.3, 0.1], fl, n, 1, 0);
        P3.quad(M, A(p0, 1), A(p1, 0.4), A(p1, -0.4), A(p0, -1), [0, 0], [0.3, 0.1], fl, [-n[0], -n[1], -n[2]], 1, 0);
      }
    }
    SHOT_H = P3.upload(M);
    return SHOT_H;
  }
  function drawCompass(ctx, t, x0, y0, w) {
    // полоса-компас: стороны света скользят под взглядом
    const fpx = Math.max(11, Math.round(t.fpx * 0.85));
    const bw = Math.min(w * 0.5, 360), bx = x0 + (w - bw) / 2, by = y0 + 4, bh = fpx * 1.5;
    ctx.fillStyle = 'rgba(12,10,8,0.55)'; ctx.fillRect(bx, by, bw, bh);
    ctx.font = '700 ' + fpx + 'px ' + t.family; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const span = Math.PI * 0.9;
    for (let k = 0; k < 8; k++) {
      let a = k * Math.PI / 4 - V3.yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
      if (Math.abs(a) > span / 2) continue;
      const x = bx + bw / 2 + a / span * bw;
      ctx.fillStyle = k === 0 ? '#ff9070' : k % 2 ? '#a89c84' : '#e8d8a8';
      ctx.fillText(DIRS_SHORT[k], x, by + 2);
    }
    // метки мест, что ты видел
    if (UI.compassMarks) for (const mk of UI.compassMarks()) {
      let a = mk.a - V3.yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
      if (Math.abs(a) > span / 2) continue;
      const x = bx + bw / 2 + a / span * bw;
      ctx.fillStyle = mk.c || '#f0c060'; ctx.fillRect(Math.round(x) - 2, by + bh - 5, 4, 4);
    }
    ctx.fillStyle = '#f0e0b0'; ctx.fillRect(bx + bw / 2 - 1, by + bh - 2, 2, 4);
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
    const cx = x0 + half * s + s / 2, cy = y0 + half * s + s / 2, a = V3.yaw;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * s * 1.6, cy - Math.cos(a) * s * 1.6);
    ctx.lineTo(cx + Math.sin(a + 2.5) * s, cy - Math.cos(a + 2.5) * s);
    ctx.lineTo(cx + Math.sin(a - 2.5) * s, cy - Math.cos(a - 2.5) * s);
    ctx.closePath(); ctx.fill();
  }
  // клетка мира под точкой экрана (касание земли): луч идёт до встречи с землёй
  UI.mvTileAt3 = function (px, py) {
    const v = V3.view, P3 = Gfx.P3;
    if (!v) return null;
    const r = P3.ray((px - v.vx0) / v.vw * v.fw, (py - v.vy0) / v.vh * v.fh);
    if (!r) return null;
    const l = Math.hypot(...r.d), d = r.d.map((q) => q / l);
    for (let t = 0.3; t < 60; t += 0.08) {
      const x = r.o[0] + d[0] * t, y = r.o[1] + d[1] * t, z = r.o[2] + d[2] * t;
      const gx = x + RO[0], gz = z + RO[1];
      if (y <= HGT.groundAt(gx, gz) + 0.02) {
        const lx = Math.floor(gx - v.gox), ly = Math.floor(gz - v.goz);
        if (lx < 0 || ly < 0 || lx >= G.map.w || ly >= G.map.h) return null;
        return [lx, ly];
      }
    }
    return null;
  };
  // перетаскивание по картинке — поворот головы (и наклон — в живом мире)
  V3.dragStart = function (px, py) { V3.drag = { x0: px, y0: py || 0, yaw0: V3.yawT, pitch0: V3.pitch || 0, moved: false }; };
  V3.dragMove = function (px, py) {
    const d = V3.drag;
    if (!d) return;
    if (Math.abs(px - d.x0) > 6 || Math.abs((py || 0) - d.y0) > 6) d.moved = true;
    if (!d.moved) return;
    V3.yawT = d.yaw0 + (px - d.x0) * 0.008;
    V3.yaw = V3.yawT;
    if (live() && py != null) V3.pitch = U.clamp(d.pitch0 - (py - d.y0) * 0.006, -0.62, 0.5);
    UI.render();
  };
  V3.dragEnd = function () {
    const d = V3.drag;
    V3.drag = null;
    if (!d || !d.moved) return false;
    if (live()) return true;
    const f = Math.round(V3.yawT / (Math.PI / 4));
    V3.face = ((f % 8) + 8) % 8;
    V3.yawT = f * Math.PI / 4;
    UI.render();
    return true;
  };
  V3.dirName = () => DIRN[faceOf(V3.yaw)];
  V3.onMap = () => {};
  V3.ro = RO;
})(window.EOF);
