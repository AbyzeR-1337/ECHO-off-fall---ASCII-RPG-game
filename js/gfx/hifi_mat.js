'use strict';
// Материалы «почти реальности»: земля, стены, крыши.
// Каждая крошечная ячейка получает цвет, фактуру, блеск, свечение, наклон и набор символов.
// Земля смешивается с соседями неровной кромкой — трава переходит в песок и дорогу без «клеточек».
(function (E) {
  const Gfx = E.Gfx, HF = Gfx.HF, C = HF.C, CS = HF.CS, F = HF.F;
  const { fbm, vnoise, hash2, cell2 } = HF.noise;
  const smooth = HF.smooth;
  const frac = (x) => x - Math.floor(x);
  // общий «результат материала» — без лишних объектов в горячем цикле
  const o = { r: 0, g: 0, b: 0, t: 0.5, cs: 0, sp: 0, em: 0, fl: 0, nx: 0, ny: 0 };
  const col = (c, k) => { o.r = c[0] * k; o.g = c[1] * k; o.b = c[2] * k; };
  const mixc = (a, b, t, k) => { k = k || 1; o.r = (a[0] + (b[0] - a[0]) * t) * k; o.g = (a[1] + (b[1] - a[1]) * t) * k; o.b = (a[2] + (b[2] - a[2]) * t) * k; };
  const tint = (c, t) => { o.r += (c[0] - o.r) * t; o.g += (c[1] - o.g) * t; o.b += (c[2] - o.b) * t; };
  const reset = () => { o.t = 0.5; o.sp = 0; o.em = 0; o.fl = 0; o.nx = 0; o.ny = 0; };

  // ============================================================
  // ЗЕМЛЯ
  // ============================================================
  const G = HF.mats;
  const GR = { dark: C('#2c5422'), mid: C('#477a30'), light: C('#6c9c42'), dry: C('#7c7a3a'), autumn: C('#8a7634'), frost: C('#a8b6b6'), spring: C('#4e8a34') };
  const FLW = [C('#c890e0'), C('#f0d050'), C('#f07a8a'), C('#f0f0f0'), C('#7aa0f0')];
  function grassBase(X, Y, P, dark, light) {
    const n = fbm(X * 0.28, Y * 0.28, 11, 3), d = vnoise(X * 2.6, Y * 2.6, 12);
    mixc(dark || GR.dark, light || GR.light, Math.min(1, n * 0.85 + d * 0.35));
    if (n < 0.34) tint(GR.dry, 0.35);
    if (P.season === 2) tint(GR.autumn, 0.45);
    else if (P.season === 3 && P.cold) tint(GR.frost, 0.55);
    else if (P.season === 0) tint(GR.spring, 0.25);
    o.cs = CS.grass; o.t = hash2(Math.floor(X * 40), Math.floor(Y * 40), 3); o.fl = F.WIND;
    return n;
  }
  G.grass = (X, Y, P) => {
    grassBase(X, Y, P);
    const h = hash2(Math.floor(X * 11), Math.floor(Y * 23), 9);
    if (h < 0.018 && P.season < 2) { col(FLW[Math.floor(h * 1000) % FLW.length], 1); o.cs = CS.flower; o.t = h * 50; }
    else if (P.season === 2 && h < 0.05) { col(h < 0.025 ? C('#c86a2a') : C('#d8a040'), 0.9); o.cs = CS.dirt; }
  };
  G.grass_dry = (X, Y, P) => { grassBase(X, Y, P, C('#5a5a2a'), C('#a89a50')); };
  G.grass_frost = (X, Y, P) => { grassBase(X, Y, P, C('#6a7a7a'), C('#c8d4d4')); o.sp = 0.2; };
  G.tallgrass = (X, Y, P) => { grassBase(X, Y, P, C('#2a4e1e'), C('#7aa848')); o.t = 0.45 + o.t * 0.55; };
  G.flowers = (X, Y, P) => {
    grassBase(X, Y, P);
    const h = hash2(Math.floor(X * 9), Math.floor(Y * 18), 4);
    if (h < 0.3) { col(FLW[Math.floor(h * 997) % FLW.length], 1); o.cs = CS.flower; o.t = h * 3; }
  };
  G.nightgrass = (X, Y, P) => { grassBase(X, Y, { season: 1 }, C('#2a3460'), C('#6a7ab8')); };
  G.nightflower = (X, Y, P) => {
    grassBase(X, Y, { season: 1 }, C('#2a3460'), C('#6a7ab8'));
    if (hash2(Math.floor(X * 9), Math.floor(Y * 18), 4) < 0.22) { col(C('#b0c0ff'), 1); o.cs = CS.flower; o.em = 0.9; }
  };
  G.hill = (X, Y, P) => {
    grassBase(X, Y, P, C('#4a5a24'), C('#8a9a50'));
    const e = 0.06, n0 = fbm(X * 0.5, Y * 0.5, 21, 3);
    o.nx = (n0 - fbm(X * 0.5 + e, Y * 0.5, 21, 3)) * 14; o.ny = (n0 - fbm(X * 0.5, Y * 0.5 + e, 21, 3)) * 14;
  };
  G.road = (X, Y, P) => {
    reset();
    const n = fbm(X * 0.6, Y * 0.6, 31, 3), d = vnoise(X * 4, Y * 4, 32);
    mixc(C('#4e3a24'), C('#8c7250'), n * 0.7 + d * 0.3);
    o.cs = CS.dirt; o.t = hash2(Math.floor(X * 30), Math.floor(Y * 30), 5);
    if (o.t < 0.05) { col(C('#8a8478'), 0.9); o.cs = CS.pebble; o.t = o.t * 20; }
    if (P.wet) { o.sp = 0.35; col([o.r, o.g, o.b], 0.8); }
  };
  G.soil = (X, Y, P) => {
    reset();
    const f = frac(Y * 3);
    const ridge = f < 0.45;
    mixc(C('#3a2a16'), C('#6a5030'), (ridge ? 0.75 : 0.25) + vnoise(X * 5, Y * 5, 33) * 0.25);
    o.cs = CS.dirt; o.t = ridge ? 0.85 : 0.2; o.ny = ridge ? -0.4 : 0.4;
  };
  G.field = (X, Y, P) => {
    reset();
    const row = frac(X * 2.5) < 0.55;
    const ripe = P.season === 2 ? C('#d0b048') : P.season === 0 ? C('#6a9a3a') : C('#c0a840');
    if (row) { mixc(ripe, C('#e8d070'), vnoise(X * 6, Y * 9, 34) * 0.6); o.cs = CS.crop; o.t = hash2(Math.floor(X * 20), Math.floor(Y * 12), 6); o.fl = F.WIND; }
    else { mixc(C('#3a2a16'), C('#5a4228'), vnoise(X * 5, Y * 5, 35)); o.cs = CS.dirt; o.t = 0.1; }
  };
  G.field_bare = (X, Y, P) => {
    reset();
    mixc(C('#5a4a30'), C('#8a7a5a'), vnoise(X * 4, Y * 4, 36));
    if (P.cold) tint(C('#d8e0e8'), 0.6);
    o.cs = CS.dirt; o.t = frac(X * 2.5) < 0.4 ? 0.7 : 0.1;
  };
  G.sand = (X, Y, P) => {
    reset();
    const n = fbm(X * 0.4, Y * 0.4, 41, 3);
    const rip = Math.sin(X * 5 + Y * 1.3 + n * 6) * 0.5 + 0.5;
    mixc(C('#a88a4a'), C('#dcc07a'), n * 0.6 + rip * 0.35);
    o.cs = CS.sand; o.t = rip * 0.6 + hash2(Math.floor(X * 30), Math.floor(Y * 30), 7) * 0.4; o.ny = (rip - 0.5) * 0.3;
    if (P.wet) { col([o.r, o.g, o.b], 0.72); o.sp = 0.3; }
  };
  G.dune = (X, Y, P) => {
    reset();
    const n = fbm(X * 0.25, Y * 0.25, 42, 3);
    const w = Math.sin(X * 2.2 + Y * 0.7 + n * 8);
    mixc(C('#a07c40'), C('#e8c880'), 0.4 + w * 0.3 + n * 0.3);
    o.cs = CS.sand; o.t = w * 0.5 + 0.5; o.nx = Math.cos(X * 2.2 + Y * 0.7 + n * 8) * 0.5; o.ny = 0.15;
  };
  G.stones = (X, Y, P) => {
    reset();
    const [d1, d2, id] = cell2(X * 3.2, Y * 3.2, 51);
    if (d1 < 0.3) { mixc(C('#5e5850'), C('#8e887e'), id * 0.7 + (0.3 - d1)); o.cs = CS.pebble; o.t = 0.3 + id * 0.7; o.nx = (id - 0.5) * 0.6; o.ny = -0.3; }
    else { mixc(C('#4a4232'), C('#6e6248'), vnoise(X * 3, Y * 3, 52)); o.cs = CS.dirt; o.t = hash2(Math.floor(X * 30), Math.floor(Y * 30), 8); }
  };
  G.snow = (X, Y, P) => {
    reset();
    const n = fbm(X * 0.35, Y * 0.35, 61, 3);
    mixc(C('#b8c4d0'), C('#f2f6fa'), n * 0.8 + 0.2);
    o.cs = CS.snow; o.t = hash2(Math.floor(X * 30), Math.floor(Y * 30), 9) * 0.8; o.sp = hash2(Math.floor(X * 40), Math.floor(Y * 40), 10) < 0.04 ? 0.9 : 0.15;
    o.nx = (n - 0.5) * 0.4;
  };
  G.drift = (X, Y, P) => { G.snow(X, Y, P); const w = Math.sin(X * 3 + Y * 2); o.nx = w * 0.5; o.t = 0.5 + w * 0.4; };
  G.blacksnow = (X, Y, P) => { reset(); mixc(C('#24242a'), C('#4a4a54'), fbm(X * 0.4, Y * 0.4, 62, 3)); o.cs = CS.snow; o.t = hash2(Math.floor(X * 30), Math.floor(Y * 30), 11); };
  G.ice = (X, Y, P) => {
    reset();
    const [d1, d2] = cell2(X * 1.6, Y * 1.6, 71);
    mixc(C('#6aa8c0'), C('#c8ecf8'), fbm(X * 0.5, Y * 0.5, 72, 2));
    o.cs = CS.ice; o.sp = 0.8; o.t = 0.3 + vnoise(X * 6, Y * 6, 73) * 0.4;
    if (d2 - d1 < 0.06) { col([o.r, o.g, o.b], 0.55); o.t = 0.7; }
  };
  const ROCK = [C('#4a4540'), C('#7a746c')];
  G.rock = (X, Y, P) => {
    reset();
    const n = fbm(X * 0.6, Y * 0.6, 81, 3);
    const [d1, d2] = cell2(X * 1.8, Y * 1.8, 82);
    mixc(ROCK[0], ROCK[1], n);
    o.cs = CS.rock; o.t = hash2(Math.floor(X * 25), Math.floor(Y * 25), 12) * 0.6;
    if (d2 - d1 < 0.05) { col([o.r, o.g, o.b], 0.6); o.t = 0.9; }
  };
  G.ash = (X, Y, P) => {
    reset();
    mixc(C('#2e2a28'), C('#5e5854'), fbm(X * 0.5, Y * 0.5, 83, 3));
    o.cs = CS.dirt; o.t = hash2(Math.floor(X * 30), Math.floor(Y * 30), 13);
    if (o.t < 0.012) { col(C('#ff6a20'), 1); o.em = 1.2; o.cs = CS.glow; }
  };
  G.rubble = (X, Y, P) => {
    reset();
    const [d1, , id] = cell2(X * 2.5, Y * 2.5, 84);
    if (d1 < 0.38) { mixc(C('#5a5248'), C('#9a9080'), id); o.cs = CS.stone; o.t = 0.5 + id * 0.5; o.nx = (id - 0.5); o.ny = -0.4; }
    else { G.rock(X, Y, P); col([o.r, o.g, o.b], 0.7); }
  };
  G.bones = (X, Y, P) => {
    G.road(X, Y, P);
    const h = hash2(Math.floor(X * 8), Math.floor(Y * 16), 14);
    if (h < 0.22) { col(C('#d8d0b8'), 0.95); o.cs = CS.bone; o.t = h * 4; }
  };
  G.roots = (X, Y, P) => {
    reset();
    const r = Math.abs(Math.sin(X * 2.1 + fbm(X * 0.6, Y * 0.6, 85, 2) * 6));
    if (r < 0.25) { mixc(C('#4a3018'), C('#7a5432'), r * 4); o.cs = CS.root; o.t = r * 4; o.ny = -0.3; }
    else { mixc(C('#1e160c'), C('#3a2a18'), vnoise(X * 4, Y * 4, 86)); o.cs = CS.dirt; o.t = 0.1; }
  };
  G.crater = (X, Y, P) => { G.moondust(X, Y, P); const fx = frac(X) - 0.5, fy = frac(Y) - 0.5, d = Math.hypot(fx, fy); if (d > 0.3 && d < 0.42) { o.nx = fx * 2; o.ny = fy * 2; col([o.r, o.g, o.b], 0.85); } else if (d < 0.3) col([o.r, o.g, o.b], 0.7); };
  G.moondust = (X, Y, P) => {
    reset();
    mixc(C('#8a8a92'), C('#d0d0d8'), fbm(X * 0.5, Y * 0.5, 87, 3));
    o.cs = CS.dirt; o.t = hash2(Math.floor(X * 30), Math.floor(Y * 30), 15); o.sp = 0.1;
  };
  G.voidfloor = (X, Y, P) => {
    reset();
    mixc(C('#0e0e18'), C('#24243a'), fbm(X * 0.5, Y * 0.5, 88, 2));
    o.cs = CS.star; o.t = 0.1;
    if (hash2(Math.floor(X * 12), Math.floor(Y * 24), 16) < 0.03) { col(C('#a0a0ff'), 1); o.em = 1; o.t = 0.9; }
  };
  G.timefloor = (X, Y, P) => {
    reset();
    const rr = Math.hypot(frac(X) - 0.5, frac(Y) - 0.5);
    mixc(C('#5a4420'), C('#c0a060'), fbm(X * 0.6, Y * 0.6, 89, 2) * 0.6 + (Math.abs(Math.sin(rr * 30)) < 0.2 ? 0.4 : 0));
    o.cs = CS.glow; o.t = Math.abs(Math.sin(rr * 30)); o.em = 0.15; o.sp = 0.3;
  };
  G.dreamfloor = (X, Y, P) => {
    reset();
    mixc(C('#3a2a5a'), C('#9a8ac0'), fbm(X * 0.4 + 3, Y * 0.4, 90, 3));
    o.cs = CS.ghost; o.t = hash2(Math.floor(X * 20), Math.floor(Y * 20), 17); o.em = 0.18;
  };
  G.spiritfloor = (X, Y, P) => { reset(); mixc(C('#1a3a36'), C('#5aa090'), fbm(X * 0.5, Y * 0.5, 91, 3)); o.cs = CS.ghost; o.t = hash2(Math.floor(X * 20), Math.floor(Y * 20), 18); o.em = 0.12; };
  G.mist = (X, Y, P) => { reset(); mixc(C('#3a4846'), C('#8a9a96'), fbm(X * 0.6, Y * 0.6, 92, 3)); o.cs = CS.smoke; o.t = 0.4; o.em = 0.08; };
  G.flesh = (X, Y, P) => {
    reset();
    const [d1, d2] = cell2(X * 2, Y * 2, 93);
    mixc(C('#5a1a24'), C('#9a4a5a'), d1);
    o.cs = CS.ghost; o.t = d1; o.sp = 0.5;
    if (d2 - d1 < 0.08) { col(C('#c03040'), 1); o.em = 0.25; o.t = 0.9; }
  };
  G.floor = (X, Y, P) => {
    reset();
    const row = Math.floor(Y * 3), fy = frac(Y * 3);
    const off = hash2(row, 0, 19) * 2;
    const fx = frac(X * 0.8 + off);
    const plank = hash2(row, Math.floor(X * 0.8 + off), 20);
    mixc(C('#4a3220'), C('#7a5636'), plank * 0.6 + vnoise(X * 12, Y * 2, 94) * 0.4);
    o.cs = CS.wood; o.t = 0.5;
    if (fy > 0.86) { col([o.r, o.g, o.b], 0.5); o.t = 0.95; }
    else if (fx < 0.05) { col([o.r, o.g, o.b], 0.55); o.t = 0.05; }
    o.sp = 0.1;
  };
  G.stonefloor = (X, Y, P) => {
    reset();
    const fx = frac(X * 2), fy = frac(Y * 2);
    const id = hash2(Math.floor(X * 2), Math.floor(Y * 2), 21);
    mixc(C('#4a4a52'), C('#76767e'), id * 0.7 + vnoise(X * 6, Y * 6, 95) * 0.3);
    o.cs = CS.tiles; o.t = 0.7 + id * 0.3;
    const gx = fx < 0.08, gy = fy < 0.12;
    if (gx || gy) { col([o.r, o.g, o.b], 0.45); o.t = gx && gy ? 0.05 : gy ? 0.2 : 0.35; }
    o.sp = 0.15;
  };
  G.cobble = (X, Y, P) => {
    reset();
    const [d1, d2, id] = cell2(X * 3.4, Y * 3.4, 96);
    const mortar = d2 - d1 < 0.14;
    if (mortar) { mixc(C('#1e1c1a'), C('#2e2a26'), id); o.cs = CS.cobble; o.t = 0.05; }
    else { mixc(C('#5a5650'), C('#8e8a82'), id * 0.7 + (1 - d1) * 0.3); o.cs = CS.cobble; o.t = 0.3 + id * 0.7; o.nx = (id - 0.5) * 0.5; o.ny = -0.25; o.sp = 0.12; }
    if (P.wet) o.sp = 0.5;
  };
  G.deck = (X, Y, P) => {
    reset();
    const fx = frac(X * 3);
    const plank = hash2(Math.floor(X * 3), 0, 22);
    if (fx < 0.1) { col(C('#0a1420'), 1); o.cs = CS.dark; o.t = 0.1; return; }
    mixc(C('#5a3e24'), C('#8a6a44'), plank * 0.6 + vnoise(X * 2, Y * 10, 97) * 0.4);
    o.cs = CS.wood; o.t = frac(Y * 1.3) < 0.05 ? 0.05 : 0.5;
  };
  function waterMat(deep, light, X, Y, P, sp) {
    reset();
    const n = fbm(X * 0.35, Y * 0.35, 101, 3);
    mixc(deep, light, n * 0.7 + vnoise(X * 3, Y * 3, 102) * 0.3);
    o.cs = CS.water; o.t = vnoise(X * 4, Y * 8, 103); o.sp = sp; o.fl = F.WATER;
  }
  G.water = (X, Y, P) => waterMat(C('#06203a'), C('#174a72'), X, Y, P, 0.95);
  G.shallow = (X, Y, P) => { waterMat(C('#155070'), C('#3a8aa8'), X, Y, P, 0.85); if (fbm(X * 0.8, Y * 0.8, 104, 2) > 0.62) tint(C('#8a8a60'), 0.35); };
  G.stream = (X, Y, P) => waterMat(C('#1a5a88'), C('#5ab0e0'), X, Y, P, 0.9);
  G.mirrorwater = (X, Y, P) => waterMat(C('#8090a8'), C('#e0e8f4'), X, Y, P, 1);
  G.bog = (X, Y, P) => {
    waterMat(C('#1a2410'), C('#3a4a24'), X, Y, P, 0.4);
    if (hash2(Math.floor(X * 10), Math.floor(Y * 20), 23) < 0.04) { col(C('#6a8a4a'), 1); o.cs = CS.ghost; o.t = 0.9; }
  };
  G.swamp = (X, Y, P) => {
    const n = fbm(X * 0.5, Y * 0.5, 105, 3);
    if (n < 0.42) { waterMat(C('#141c0e'), C('#2e3c1e'), X, Y, P, 0.6); return; }
    reset();
    mixc(C('#2a2a16'), C('#4e5a2c'), n);
    o.cs = CS.moss; o.t = hash2(Math.floor(X * 25), Math.floor(Y * 25), 24); o.fl = F.WIND;
  };
  G.lava = (X, Y, P) => {
    reset();
    const [d1, d2, id] = cell2(X * 1.5, Y * 1.5, 106);
    const crack = d2 - d1;
    if (crack < 0.2) { mixc(C('#ffd040'), C('#ff5a10'), crack * 5); o.em = 1.6; o.cs = CS.lava; o.t = 0.5 + crack * 2; o.fl = F.LAVA; }
    else { mixc(C('#1e0c06'), C('#4a1c0c'), id); o.em = 0.12; o.cs = CS.rock; o.t = id * 0.6; }
  };
  G.cloud = (X, Y, P) => { reset(); mixc(C('#8a92a4'), C('#f0f4fa'), fbm(X * 0.4, Y * 0.4, 107, 4)); o.cs = CS.smoke; o.t = vnoise(X * 3, Y * 3, 108); o.em = 0.2; };
  G.void = (X, Y, P) => {
    reset();
    col(C('#04040a'), 1); o.cs = CS.star; o.t = 0;
    const h = hash2(Math.floor(X * 14), Math.floor(Y * 28), 25);
    if (h < 0.012) { col(h < 0.004 ? C('#ffffff') : C('#8a8ad0'), 1); o.em = 1.2; o.t = h * 80; }
    o.fl = F.NOSHADOW;
  };
  G.seafloor = (X, Y, P) => {
    reset();
    mixc(C('#2a4a5a'), C('#6a8a90'), fbm(X * 0.5, Y * 0.5, 109, 3));
    o.cs = CS.sand; o.t = hash2(Math.floor(X * 30), Math.floor(Y * 30), 26);
    const c = Math.abs(Math.sin(X * 3 + Math.sin(Y * 2.3) * 2) * Math.sin(Y * 3.3 + Math.sin(X * 1.7)));
    if (c > 0.8) { o.em = 0.25; }
    if (hash2(Math.floor(X * 6), Math.floor(Y * 12), 27) < 0.05) { col(C('#3a8a5a'), 1); o.cs = CS.moss; o.fl = F.WIND; }
  };
  // мягкие земли смешиваются кромкой; рукотворные полы — ровные
  const SOFT = new Set(['grass', 'grass_dry', 'grass_frost', 'tallgrass', 'flowers', 'nightgrass', 'nightflower', 'hill', 'road', 'sand', 'dune', 'stones', 'snow', 'drift', 'blacksnow', 'rock', 'ash', 'rubble', 'bones', 'roots', 'moondust', 'swamp', 'water', 'shallow', 'stream', 'bog', 'seafloor', 'soil', 'mist', 'spiritfloor', 'dreamfloor', 'voidfloor', 'ice']);
  const WET = new Set(['water', 'shallow', 'stream', 'bog', 'mirrorwater']);
  HF.SOFT = SOFT; HF.WET = WET;

  // клетка земли: кэш по месту, ключу, соседям и времени года
  const gcache = new Map();
  HF.clearGround = () => gcache.clear();
  HF.groundTile = function (sc, i, j, CX, CY, memFlag, P) {
    const W = sc.W, H = sc.H;
    const key = sc.g[j * W + i];
    if (!key) return;
    const tx = sc.tx0 + i, ty = sc.ty0 + j;
    const nk = (di, dj) => { const a = i + di, c = j + dj; if (a < 0 || c < 0 || a >= W || c >= H) return key; return sc.g[c * W + a] || key; };
    const sig = key + '|' + nk(-1, 0) + nk(1, 0) + nk(0, -1) + nk(0, 1) + nk(-1, -1) + nk(1, -1) + nk(-1, 1) + nk(1, 1) + '|' + P.season + (P.cold ? 1 : 0) + (P.wet ? 1 : 0);
    const ck = tx + ',' + ty + '|' + CX + '|' + sig;
    let cdat = gcache.get(ck);
    if (!cdat) {
      const n = CX * CY;
      cdat = { r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), nx: new Float32Array(n), ny: new Float32Array(n), t: new Float32Array(n), cs: new Uint8Array(n), sp: new Float32Array(n), em: new Float32Array(n), fl: new Uint16Array(n) };
      const soft = SOFT.has(key);
      for (let cv = 0; cv < CY; cv++) for (let cu = 0; cu < CX; cu++) {
        const X = tx + (cu + 0.5) / CX, Y = ty + (cv + 0.5) / CY;
        let use = key;
        if (soft) {
          const jx = (vnoise(X * 1.9, Y * 1.9, 3) - 0.5) * 0.8, jy = (vnoise(X * 1.9 + 5.2, Y * 1.9 + 1.3, 4) - 0.5) * 0.8;
          const di = Math.floor(X + jx) - tx, dj = Math.floor(Y + jy) - ty;
          const k2 = nk(di, dj);
          if (k2 !== key && SOFT.has(k2)) use = k2;
        }
        const fn = G[use] || G.rock;
        const Pw = WET.has(use) ? P : (P.wet ? P : nearWet(nk, X, Y, tx, ty) ? Object.assign({}, P, { wet: true }) : P);
        fn(X, Y, Pw);
        let fl = o.fl;
        // пена у берега и мокрый песок
        if (WET.has(use) && use !== 'bog') {
          for (const [ax, ay] of [[0.28, 0], [-0.28, 0], [0, 0.28], [0, -0.28]]) {
            const k3 = nk(Math.floor(X + ax) - tx, Math.floor(Y + ay) - ty);
            if (!WET.has(k3)) { fl |= F.FOAM; break; }
          }
        }
        const q = cv * CX + cu;
        cdat.r[q] = o.r; cdat.g[q] = o.g; cdat.b[q] = o.b; cdat.nx[q] = o.nx; cdat.ny[q] = o.ny; cdat.t[q] = o.t; cdat.cs[q] = o.cs; cdat.sp[q] = o.sp; cdat.em[q] = o.em; cdat.fl[q] = fl;
      }
      if (gcache.size > 6000) gcache.clear();
      gcache.set(ck, cdat);
    }
    const b = HF.buf(), NU = b.NU;
    for (let cv = 0; cv < CY; cv++) for (let cu = 0; cu < CX; cu++) {
      const q = cv * CX + cu, k = (j * CY + cv) * NU + i * CX + cu;
      o.r = cdat.r[q]; o.g = cdat.g[q]; o.b = cdat.b[q]; o.t = cdat.t[q]; o.cs = cdat.cs[q]; o.sp = cdat.sp[q]; o.em = cdat.em[q]; o.fl = cdat.fl[q];
      let nx = cdat.nx[q], ny = cdat.ny[q], nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      HF.put(k, o, i + (cu + 0.5) / CX, j + (cv + 0.5) / CY, 0, nx, ny, nz, 0, F.GROUND | memFlag);
    }
  };
  function nearWet(nk, X, Y, tx, ty) {
    for (const [ax, ay] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) if (WET.has(nk(Math.floor(X + ax) - tx, Math.floor(Y + ay) - ty))) return true;
    return false;
  }

  // ============================================================
  // СТЕНЫ И СКАЛЫ: верх в своей клетке, лицевая грань свисает в клетку южнее
  // ============================================================
  const BL = HF.blocks;
  function brick(c0, c1, mortar) {
    return (X, fy, h, P) => {
      reset();
      const rows = Math.max(2, Math.round(h * 5));
      const r = Math.floor(fy * rows), ry = frac(fy * rows);
      const off = (r % 2) * 0.5;
      const cxx = X * 2.2 + off, cx = Math.floor(cxx), rx = frac(cxx);
      const id = hash2(cx, r, 31);
      mixc(c0, c1, id * 0.7 + vnoise(X * 9, fy * 9, 32) * 0.3);
      o.cs = CS.brick; o.t = 0.3 + id * 0.7;
      if (ry < 0.18) { col(mortar, 1); o.t = 0.05; }
      else if (rx < 0.07) { col(mortar, 1); o.t = 0.2; }
    };
  }
  function capTop(c0, c1) {
    return (X, Y, mask, P) => {
      reset();
      const fx = frac(X), fy = frac(Y);
      mixc(c0, c1, vnoise(X * 5, Y * 5, 41) * 0.6 + 0.3);
      o.cs = CS.stone; o.t = 0.4 + hash2(Math.floor(X * 10), Math.floor(Y * 10), 42) * 0.4;
      // скругление кромки там, где стена обрывается
      if (!(mask & 1) && fy < 0.2) o.ny = -0.6;
      if (!(mask & 4) && fy > 0.8) o.ny = 0.6;
      if (!(mask & 8) && fx < 0.2) o.nx = -0.6;
      if (!(mask & 2) && fx > 0.8) o.nx = 0.6;
      if (frac(X * 2.2) < 0.06) { col([o.r, o.g, o.b], 0.6); o.t = 0.1; }
      if (P.season === 3 && P.cold && o.ny <= 0) tint(C('#e8eef4'), 0.6);
    };
  }
  function rockTop(c0, c1, snowAbove) {
    return (X, Y, mask, P) => {
      reset();
      const n = fbm(X * 0.9, Y * 0.9, 51, 3);
      mixc(c0, c1, n);
      o.cs = CS.rock; o.t = hash2(Math.floor(X * 20), Math.floor(Y * 20), 52) * 0.8;
      o.nx = (fbm(X * 0.9 + 0.1, Y * 0.9, 51, 3) - n) * -12; o.ny = (fbm(X * 0.9, Y * 0.9 + 0.1, 51, 3) - n) * -12;
      if (snowAbove || (P.season === 3 && P.cold)) { if (n > 0.45 || snowAbove) { mixc(C('#c8d4e0'), C('#ffffff'), n); o.cs = CS.snow; o.sp = 0.3; } }
    };
  }
  function rockFace(c0, c1, strata, crack) {
    return (X, fy, h, P) => {
      reset();
      const n = fbm(X * 1.2, fy * h * 2, 53, 3);
      const s = strata ? Math.abs(Math.sin(fy * h * 7 + n * 3)) : 1;
      mixc(c0, c1, n * 0.7 + (s < 0.25 ? -0.2 : 0.1));
      o.cs = CS.rock; o.t = hash2(Math.floor(X * 18), Math.floor(fy * 24), 54) * 0.9;
      o.nx = (n - 0.5) * 0.8;
      if (crack && Math.abs(frac(X) - 0.5 - (fy - 0.5) * 0.3) < 0.03) { col([o.r, o.g, o.b], 0.45); o.t = 0.95; }
      if (fy < 0.15 && P.season !== 2) { const m = vnoise(X * 6, fy * 6, 55); if (m > 0.6) { tint(C('#4a6a30'), 0.5); o.cs = CS.moss; } }
    };
  }
  const W1 = C('#8a7c66'), W2 = C('#a89a80');
  const BR0 = C('#6a4e36'), BR1 = C('#94704c'), MORT = C('#2a2018');
  BL.wall = { h: 1, faceH: 0.6, top: capTop(W1, W2), face: brick(BR0, BR1, MORT) };
  BL.window = { h: 1, faceH: 0.6, top: capTop(W1, W2), face: (X, fy, h, P) => {
    brick(BR0, BR1, MORT)(X, fy, h, P);
    const fx = frac(X);
    if (fx > 0.22 && fx < 0.78 && fy > 0.18 && fy < 0.78) {
      const frame = fx < 0.28 || fx > 0.72 || fy < 0.24 || fy > 0.72 || Math.abs(fx - 0.5) < 0.03;
      if (frame) { col(C('#5a3e22'), 1); o.cs = CS.wood; o.t = 0.5; }
      else if (P.night) { mixc(C('#c86a20'), C('#f0a040'), vnoise(X * 7, fy * 7, 56)); o.em = 0.75; o.cs = CS.glass; o.fl = F.WINDOW; }
      else { mixc(C('#3a6a80'), C('#a8d8e8'), fy); o.sp = 0.9; o.cs = CS.glass; }
    }
  } };
  BL.door = { h: 1, faceH: 0.6, top: capTop(W1, W2), face: (X, fy, h, P) => {
    reset();
    const fx = frac(X);
    if (fx < 0.14 || fx > 0.86 || fy < 0.1) { col(C('#4a3018'), 1); o.cs = CS.wood; o.t = 0.05; return; }
    mixc(C('#5a3a1e'), C('#8a5e34'), vnoise(X * 3, fy * 12, 57));
    o.cs = CS.wood; o.t = frac(fx * 4) < 0.12 ? 0.05 : 0.6;
    if (Math.abs(fx - 0.72) < 0.06 && Math.abs(fy - 0.55) < 0.08) { col(C('#f0d060'), 1); o.cs = CS.metal; o.sp = 1; }
  } };
  BL.townwall = { h: 1.4, faceH: 1, top: (X, Y, mask, P) => { capTop(C('#8a8a82'), C('#b0b0a8'))(X, Y, mask, P); if (frac(X * 2) < 0.5 && frac(Y) < 0.4) { o.ny = -0.5; col([o.r, o.g, o.b], 1.15); } },
    face: (X, fy, h, P) => {
      reset();
      const rows = 4, r = Math.floor(fy * rows), ry = frac(fy * rows);
      const off = (r % 2) * 0.5, cxx = X * 1.4 + off, rx = frac(cxx), id = hash2(Math.floor(cxx), r, 58);
      mixc(C('#5e5e58'), C('#9a9a90'), id * 0.7 + vnoise(X * 7, fy * 7, 59) * 0.3);
      o.cs = CS.stone; o.t = 0.5 + id * 0.5;
      if (ry < 0.1 || rx < 0.05) { col(C('#262624'), 1); o.cs = CS.brick; o.t = ry < 0.1 ? 0.05 : 0.2; }
    } };
  BL.treewall = { h: 1, faceH: 0.6, top: (X, Y, m, P) => { reset(); mixc(C('#4a3018'), C('#7a5432'), vnoise(X * 4, Y * 4, 60)); o.cs = CS.bark; o.t = hash2(Math.floor(X * 12), Math.floor(Y * 12), 61); },
    face: (X, fy) => { reset(); const s = Math.sin(X * 14 + fbm(X, fy * 3, 62, 2) * 4); mixc(C('#3a2412'), C('#7a5432'), s * 0.5 + 0.5); o.cs = CS.bark; o.t = s * 0.5 + 0.5; } };
  BL.coralwall = { h: 1, faceH: 0.6, top: (X, Y) => { reset(); mixc(C('#a04a5a'), C('#f0a0b0'), fbm(X, Y, 63, 3)); o.cs = CS.leaf; o.t = 0.6; },
    face: (X, fy) => { reset(); mixc(C('#7a3040'), C('#e08a9a'), fbm(X * 2, fy * 3, 64, 3)); o.cs = CS.leaf; o.t = vnoise(X * 6, fy * 6, 65); } };
  BL.cave = { h: 1, faceH: 0.6, top: rockTop(C('#3a3430'), C('#5e5650')), face: rockFace(C('#2e2824'), C('#5a5048'), false) };
  BL.crackwall = { h: 1, faceH: 0.6, top: rockTop(C('#3a3430'), C('#5e5650')), face: rockFace(C('#2e2824'), C('#5a5048'), false, true) };
  BL.mountain = { h: 1.6, faceH: 1, top: rockTop(C('#5a5a56'), C('#9a9a94')), face: rockFace(C('#3e3e3a'), C('#7a7a74'), true) };
  BL.peak = { h: 2.2, faceH: 1, top: rockTop(C('#9aa4ae'), C('#ffffff'), true), face: (X, fy, h, P) => { rockFace(C('#4a4a4a'), C('#8a8a8a'), true)(X, fy, h, P); if (fy < 0.35 + vnoise(X * 3, 0, 66) * 0.3) { mixc(C('#c8d4e0'), C('#ffffff'), fy); o.cs = CS.snow; } } };
  BL.icerock = { h: 1.2, faceH: 1, top: (X, Y, m, P) => { G.ice(X, Y, P); o.sp = 1; }, face: (X, fy, h, P) => { G.ice(X, fy * 2, P); col([o.r, o.g, o.b], 0.85); o.sp = 1; } };
  BL.basalt = { h: 1.3, faceH: 1, top: (X, Y) => { reset(); const [d1, d2] = cell2(X * 2.5, Y * 2.5, 67); mixc(C('#1a1816'), C('#3e3a36'), d1); o.cs = CS.stone; o.t = d2 - d1 < 0.1 ? 0.95 : 0.4; },
    face: (X) => { reset(); const f = frac(X * 2.5); mixc(C('#141210'), C('#3a3632'), Math.sin(f * Math.PI)); o.cs = CS.bark; o.t = f < 0.12 ? 0.05 : 0.6; o.nx = (f - 0.5) * 1.6; } };
  BL.ore = { h: 1, faceH: 0.6, top: rockTop(C('#3a3430'), C('#5e5650')), face: (X, fy, h, P) => { rockFace(C('#2e2824'), C('#5a5048'), false)(X, fy, h, P); const v = vnoise(X * 5, fy * 5, 68); if (v > 0.68) { mixc(C('#c87a4a'), C('#ffc080'), (v - 0.68) * 3); o.cs = CS.gold; o.sp = 0.9; o.em = 0.15; } } };
  BL.bigtree = { h: 2.5, faceH: 1, top: (X, Y) => { reset(); const rr = Math.hypot(frac(X) - 0.5, frac(Y) - 0.5); mixc(C('#3a2412'), C('#8a6036'), Math.abs(Math.sin(rr * 40))); o.cs = CS.bark; o.t = 0.7; }, face: BL.treewall.face };
  BL.fleshwall = { h: 1, faceH: 0.6, top: (X, Y, m, P) => G.flesh(X, Y, P), face: (X, fy, h, P) => { G.flesh(X, fy * 2, P); col([o.r, o.g, o.b], 0.8); } };
  BL.dreamwall = { h: 1, faceH: 0.6, top: (X, Y) => { reset(); mixc(C('#2a1e48'), C('#8a7ac0'), fbm(X, Y, 69, 3)); o.cs = CS.glow; o.t = 0.5; o.em = 0.25; }, face: (X, fy) => { reset(); mixc(C('#1a1430'), C('#6a5aa0'), fbm(X * 2, fy * 2, 70, 3)); o.cs = CS.glow; o.t = vnoise(X * 5, fy * 5, 71); o.em = 0.2; o.sp = 0.6; } };
  BL.clockwall = { h: 1, faceH: 0.6, top: (X, Y) => { reset(); const rr = Math.hypot(frac(X * 2) - 0.5, frac(Y * 2) - 0.5); mixc(C('#4a3a1a'), C('#c0a050'), rr < 0.3 ? 0.8 : 0.3); o.cs = CS.metal; o.t = 0.5; o.sp = 0.6; },
    face: (X, fy) => { reset(); const a = Math.atan2(frac(fy * 2) - 0.5, frac(X * 2) - 0.5), rr = Math.hypot(frac(X * 2) - 0.5, frac(fy * 2) - 0.5); const tooth = rr < 0.42 && rr > 0.3 && Math.sin(a * 8) > 0; mixc(C('#3a2c14'), C('#c0a050'), tooth || rr < 0.12 ? 0.9 : 0.3); o.cs = CS.metal; o.sp = 0.7; o.t = 0.6; } };
  BL.shelf = { h: 0.9, faceH: 1, top: (X, Y) => { reset(); mixc(C('#4a3018'), C('#7a5636'), vnoise(X * 8, Y * 2, 72)); o.cs = CS.wood; o.t = 0.5; },
    face: (X, fy) => {
      reset();
      const shelfRow = frac(fy * 3);
      if (shelfRow < 0.16) { col(C('#5a3e22'), 1); o.cs = CS.wood; o.t = 0.95; return; }
      const bk = Math.floor(X * 9), id = hash2(bk, Math.floor(fy * 3), 73);
      const cols = [C('#8a3028'), C('#2e5a3e'), C('#4a3a7a'), C('#a08030'), C('#30607a'), C('#6a4228')];
      col(cols[Math.floor(id * cols.length)], 0.7 + id * 0.5);
      o.cs = CS.book; o.t = id; if (shelfRow > 0.16 + id * 0.25 && id < 0.15) { col(C('#1a120a'), 1); o.cs = CS.dark; }
    } };
  for (const k in BL) BL[k].key = k;

  // верх стены/скалы
  HF.blockTop = function (sc, i, j, CX, CY, memFlag, P) {
    const W = sc.W, k0 = j * W + i, key = sc.b[k0], d = BL[key] || BL.cave, mask = sc.m[k0];
    const b = HF.buf(), NU = b.NU, tx = sc.tx0 + i, ty = sc.ty0 + j;
    for (let cv = 0; cv < CY; cv++) for (let cu = 0; cu < CX; cu++) {
      const X = tx + (cu + 0.5) / CX, Y = ty + (cv + 0.5) / CY;
      d.top(X, Y, mask, P);
      let nx = o.nx, ny = o.ny, nz = 1; const l = Math.hypot(nx, ny, nz);
      HF.put((j * CY + cv) * NU + i * CX + cu, o, i + (cu + 0.5) / CX, j + (cv + 0.5) / CY, d.h, nx / l, ny / l, nz / l, 1 + (blockId(key)), memFlag);
    }
  };
  const BID = {};
  const blockId = (k) => BID[k] || (BID[k] = Object.keys(BID).length + 2);
  // грань стены ряда выше, свисающая в клетку (i, j); facade — фасад дома под крышей (во весь рост)
  HF.blockFace = function (sc, i, j, CX, CY, memFlag, P, facade) {
    const W = sc.W, a = (j - 1) * W + i, key = sc.b[a], d = BL[key] || BL.cave;
    const rows = facade ? CY : Math.max(1, Math.round(d.faceH * CY));
    const b = HF.buf(), NU = b.NU, tx = sc.tx0 + i;
    for (let cv = 0; cv < rows; cv++) for (let cu = 0; cu < CX; cu++) {
      const X = tx + (cu + 0.5) / CX, fy = (cv + 0.5) / rows;
      d.face(X, fy, facade ? 1.2 : d.h, P);
      let nx = o.nx, ny = 1, nz = 0.12; const l = Math.hypot(nx, ny, nz);
      const k = (j * CY + cv) * NU + i * CX + cu;
      HF.put(k, o, i + (cu + 0.5) / CX, j + 0.02, d.h * (1 - fy), nx / l, ny / l, nz / l, 1 + blockId(key), memFlag);
      b.ao[k] = Math.round(255 * (0.55 + 0.45 * (1 - fy * fy)));
    }
  };
  // обрыв небесного острова над пустотой
  HF.cliffFace = function (i, j, CX, CY, memFlag) {
    const b = HF.buf(), NU = b.NU;
    const rows = Math.max(1, Math.round(CY * 0.85));
    for (let cv = 0; cv < rows; cv++) for (let cu = 0; cu < CX; cu++) {
      const X = i + (cu + 0.5) / CX, fy = (cv + 0.5) / rows;
      reset();
      mixc(C('#3a3028'), C('#6a5a48'), fbm(X * 2, fy * 3, 74, 3) * (1 - fy * 0.6));
      o.cs = CS.rock; o.t = hash2(Math.floor(X * 20), cv, 75);
      HF.put((j * CY + cv) * NU + i * CX + cu, o, i + (cu + 0.5) / CX, j, 1 - fy, 0, 1, 0.1, 1, memFlag);
    }
  };

  // ============================================================
  // КРЫШИ: скаты по-разному освещены солнцем, конёк, свесы
  // ============================================================
  const RF = HF.roofs;
  RF.thatch = (rx, ry, X, Y, north, ridge, P) => { reset(); const s = vnoise(X * 14, Y * 3, 81); mixc(C('#7a5e2e'), C('#c8a45a'), s * 0.7 + (north ? 0 : 0.25)); o.cs = north ? CS.thatchN : CS.thatchS; o.t = hash2(Math.floor(X * 30), Math.floor(Y * 6), 82); if (ridge) { col(C('#d8b870'), 0.9); o.cs = CS.wood; o.t = 0.6; } };
  RF.tiles = (rx, ry, X, Y, north, ridge, P) => { reset(); const row = Math.floor(Y * 4), off = (row % 2) * 0.5, f = frac(X * 3 + off), fyy = frac(Y * 4); mixc(C('#7a2a1e'), C('#c8584a'), hash2(Math.floor(X * 3 + off), row, 83) * 0.5 + (north ? 0.1 : 0.4)); o.cs = CS.rooftile; o.t = fyy > 0.8 ? 0.05 : 0.5; o.nx = (f - 0.5) * 0.8; if (ridge) { col(C('#e08a6a'), 1); o.t = 0.5; } };
  RF.slate = (rx, ry, X, Y, north, ridge, P) => { reset(); const row = Math.floor(Y * 5), off = (row % 2) * 0.5; mixc(C('#2e3a46'), C('#6a7a8a'), hash2(Math.floor(X * 2.5 + off), row, 84) * 0.6 + (north ? 0 : 0.3)); o.cs = CS.slate; o.t = frac(Y * 5) > 0.8 ? 0.9 : 0.2; o.sp = 0.25; if (ridge) { col(C('#9aaaba'), 1); } };
  RF.temple = (rx, ry, X, Y, north, ridge, P) => { reset(); mixc(C('#6a645a'), C('#b0a898'), vnoise(X * 6, Y * 6, 85) * 0.5 + (north ? 0.1 : 0.4)); o.cs = CS.stone; o.t = 0.5; if (ridge) { col(C('#f0d060'), 1); o.cs = CS.gold; o.sp = 0.9; o.em = 0.1; } };
  RF.palace = (rx, ry, X, Y, north, ridge, P) => { RF.tiles(rx, ry, X, Y, north, false, P); mixc(C('#24407a'), C('#5a80d0'), north ? 0.3 : 0.6); o.sp = 0.3; if (ridge) { col(C('#f0d060'), 1); o.cs = CS.gold; o.sp = 1; } };
  RF.wood = (rx, ry, X, Y, north, ridge, P) => { reset(); const f = frac(X * 3); mixc(C('#4a3018'), C('#8a6440'), hash2(Math.floor(X * 3), 0, 86) * 0.5 + (north ? 0 : 0.35)); o.cs = CS.wood; o.t = f < 0.1 ? 0.05 : 0.6; if (ridge) col(C('#a07a4a'), 1); };
  HF.roofTile = function (sc, i, j, CX, CY, memFlag, P) {
    const r = sc.roofs[sc.rf[j * sc.W + i]];
    const fn = RF[r.style] || RF.thatch;
    const b = HF.buf(), NU = b.NU;
    for (let cv = 0; cv < CY; cv++) for (let cu = 0; cu < CX; cu++) {
      const lx = i + (cu + 0.5) / CX, ly = j + (cv + 0.5) / CY;
      const rx = (lx - r.x) / r.w, ry = (ly - r.y) / r.h;
      const north = ry < 0.5, ridge = Math.abs(ry - 0.5) < 0.5 / (r.h * CY) + 0.02;
      const X = sc.tx0 + lx, Y = sc.ty0 + ly;
      fn(rx, ry, X, Y, north, ridge, P);
      if (P.season === 3 && P.cold && vnoise(X * 3, Y * 3, 87) > 0.35) { tint(C('#eef2f6'), 0.75); o.cs = CS.snow; }
      let nx = o.nx, ny = ridge ? 0 : north ? -0.62 : 0.62, nz = 0.8;
      const eave = rx < 0.03 || rx > 0.97;
      if (eave) { nx += rx < 0.5 ? -0.5 : 0.5; col([o.r, o.g, o.b], 0.7); }
      if (ry > 0.97) col([o.r, o.g, o.b], 0.65);
      const l = Math.hypot(nx, ny, nz);
      HF.put((j * CY + cv) * NU + i * CX + cu, o, lx, ly, 1 + 0.6 * (1 - Math.abs(ry - 0.5) * 2), nx / l, ny / l, nz / l, 3, memFlag);
    }
  };
})(window.EOF);
