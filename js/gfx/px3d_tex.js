'use strict';
// Пиксельные текстуры 32×32 для 3D-мира: земля, стены, крыши, потолки.
// Каждая рисуется по правилу (шум, кладка, доски, черепица…) и сводится к короткой палитре.
// Альфа: 255 — обычная, 128 — светится всегда (лава, кристаллы), 64 — светится ночью (окна).
(function (E) {
  const Gfx = E.Gfx, P3 = Gfx.P3;
  const N = 32;
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  // ступени палитры: цвет к ближайшим 12 уровням — «пиксельно»
  const q = (v) => Math.max(0, Math.min(255, Math.round(v / 12) * 12));
  function put(d, x, y, c, a) { x = ((x % N) + N) % N; y = ((y % N) + N) % N; const k = (y * N + x) * 4; d[k] = q(c[0]); d[k + 1] = q(c[1]); d[k + 2] = q(c[2]); d[k + 3] = a == null ? 255 : a; }
  function get(d, x, y) { x = ((x % N) + N) % N; y = ((y % N) + N) % N; const k = (y * N + x) * 4; return [d[k], d[k + 1], d[k + 2]]; }
  // гладкий шум с повтором по краю (текстура бесшовная)
  function tileNoise(r, cells) {
    const g = []; for (let i = 0; i < cells * cells; i++) g.push(r());
    return (x, y) => {
      const fx = (x / N) * cells, fy = (y / N) * cells, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const at = (a, b) => g[((b % cells + cells) % cells) * cells + ((a % cells + cells) % cells)];
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      return (at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx) * (1 - sy) + (at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx) * sy;
    };
  }
  function fill(d, fn) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = fn(x, y); put(d, x, y, c, c[3]); } }
  // шум двух масштабов + крапинки
  function noisy(d, r, dark, light, specks, k1, k2) {
    const a = tileNoise(r, k1 || 4), b = tileNoise(r, k2 || 16);
    fill(d, (x, y) => mix(dark, light, a(x, y) * 0.65 + b(x, y) * 0.35));
    for (const [c, dens] of specks || []) for (let i = 0; i < N * N * dens; i++) put(d, Math.floor(r() * N), Math.floor(r() * N), c);
  }
  const T = P3.TEX = {};
  T.noise = (d, name, r) => noisy(d, r, [60, 60, 60], [120, 120, 120]);

  // ---------- земля ----------
  const GR = { grass: ['#2c5422', '#5c8c34', '#7aa848'], grass_dry: ['#5a5a2a', '#9a9050', '#b0a060'], grass_frost: ['#5a6a6a', '#a8b8b8', '#d8e4e4'], nightgrass: ['#22284a', '#4a5a98', '#7a8ad0'], tallgrass: ['#24461a', '#4e7e2e', '#80b04c'] };
  function grass(d, name, r) {
    const key = name.split(':')[0], p = (GR[key] || GR.grass).map(hex);
    noisy(d, r, p[0], p[1], [], 3, 12);
    // травинки
    const n = key === 'tallgrass' ? 110 : 60;
    for (let i = 0; i < n; i++) { const x = Math.floor(r() * N), y = Math.floor(r() * N), h = 1 + Math.floor(r() * (key === 'tallgrass' ? 4 : 2)); const c = r() < 0.5 ? p[2] : mul(p[0], 0.8); for (let k = 0; k < h; k++) put(d, x + (k > 1 && r() < 0.3 ? 1 : 0), y - k, c); }
    if (name.endsWith(':f')) { const fl = ['#e0d050', '#e070a0', '#f0f0f0', '#a080f0'].map(hex); for (let i = 0; i < 9; i++) { const x = Math.floor(r() * N), y = Math.floor(r() * N), c = fl[Math.floor(r() * fl.length)]; put(d, x, y, c); put(d, x + 1, y, mul(c, 0.8)); } }
  }
  T.grass = grass; T.grass_dry = grass; T.grass_frost = grass; T.nightgrass = grass; T.tallgrass = grass;
  T.flowers = (d, name, r) => grass(d, 'grass:f', r);
  T.dirt = (d, name, r) => { noisy(d, r, hex('#4a3620'), hex('#8a6c48'), [[hex('#a08868'), 0.03], [hex('#3a2a18'), 0.04]], 4, 14); for (let i = 0; i < 6; i++) { const x = Math.floor(r() * N), y = Math.floor(r() * N); put(d, x, y, hex('#8a8478')); put(d, x + 1, y, hex('#6a645a')); } };
  T.soil = (d, name, r) => { noisy(d, r, hex('#3a2814'), hex('#6a4e2c'), [], 4, 12); for (let y = 0; y < N; y += 4) for (let x = 0; x < N; x++) put(d, x, y, hex('#2a1c0e')); };
  T.field = (d, name, r) => { T.soil(d, name, r); for (let x = 1; x < N; x += 4) for (let y = 0; y < N; y++) if (r() < 0.8) put(d, x, y, mix(hex('#b09030'), hex('#e0c060'), r())); };
  T.cobble = (d, name, r) => {
    const pts = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) pts.push([i * 8 + 2 + r() * 4, j * 8 + 2 + r() * 4, 0.7 + r() * 0.5]);
    fill(d, (x, y) => {
      let b1 = 1e9, b2 = 1e9, k = 0;
      for (const p of pts) for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) { const dd = Math.hypot(x - p[0] - ox, y - p[1] - oy); if (dd < b1) { b2 = b1; b1 = dd; k = p[2]; } else if (dd < b2) b2 = dd; }
      if (b2 - b1 < 1.4) return hex('#2a2824');
      return mul(hex('#8a867c'), k * (1 - b1 / 12 * 0.35));
    });
  };
  T.stonetiles = (d, name, r) => { fill(d, (x, y) => { if (x % 16 === 0 || y % 16 === 0) return hex('#2a2a30'); const id = (x >> 4) + (y >> 4) * 2; return mul(hex('#6a6a72'), 0.85 + ((id * 37) % 7) / 28 + (r() - 0.5) * 0.08); }); };
  T.planks = (d, name, r) => { const ks = []; for (let i = 0; i < 4; i++) ks.push(0.8 + r() * 0.35); fill(d, (x, y) => { const row = y >> 3; if (y % 8 === 7) return hex('#24180c'); const off = (row * 13) % 32; if ((x + off) % 32 === 0) return hex('#24180c'); return mul(hex('#7a5634'), ks[row] * (0.9 + Math.sin(x * 0.7 + row) * 0.06 + (r() - 0.5) * 0.08)); }); };
  T.deck = (d, name, r) => { T.planks(d, name, r); };
  T.sand = (d, name, r) => { noisy(d, r, hex('#a88a4a'), hex('#e0c47e'), [[hex('#f0dca0'), 0.04], [hex('#8a7040'), 0.03]], 3, 10); for (let y = 3; y < N; y += 8) for (let x = 0; x < N; x++) if (Math.sin(x * 0.4 + y) > 0.3) put(d, x, y + Math.round(Math.sin(x * 0.3) * 1), mul(get(d, x, y), 1.1)); };
  T.dune = T.sand;
  T.snow = (d, name, r) => noisy(d, r, hex('#b8c6d4'), hex('#f4f8fc'), [[hex('#ffffff'), 0.04], [hex('#a0b0c4'), 0.03]], 3, 10);
  T.blacksnow = (d, name, r) => noisy(d, r, hex('#22222a'), hex('#4a4a56'), [[hex('#6a6a78'), 0.04]], 3, 10);
  T.ice = (d, name, r) => { noisy(d, r, hex('#6aa8c4'), hex('#c8ecf8'), [[hex('#ffffff'), 0.03]], 3, 8); for (let i = 0; i < 5; i++) { let x = r() * N, y = r() * N; const a = r() * 6; for (let k = 0; k < 10; k++) { put(d, Math.round(x), Math.round(y), hex('#4a7890')); x += Math.cos(a + k * 0.3); y += Math.sin(a + k * 0.3); } } };
  T.stones = (d, name, r) => { T.dirt(d, name, r); for (let i = 0; i < 14; i++) { const x = Math.floor(r() * N), y = Math.floor(r() * N), s = 1 + Math.floor(r() * 2); for (let a = 0; a <= s; a++) for (let b = 0; b <= s; b++) put(d, x + a, y + b, mul(hex('#8a8478'), 0.8 + (a + b) * 0.08)); } };
  T.rubble = T.stones;
  T.rockfloor = (d, name, r) => noisy(d, r, hex('#4a4540'), hex('#7a746c'), [[hex('#3a3632'), 0.05], [hex('#8a847c'), 0.03]], 4, 14);
  T.ash = (d, name, r) => noisy(d, r, hex('#2e2a28'), hex('#5e5854'), [[hex('#ff6a20'), 0.004], [hex('#1e1a18'), 0.05]], 4, 14);
  T.bones = (d, name, r) => { T.dirt(d, name, r); for (let i = 0; i < 8; i++) { const x = Math.floor(r() * N), y = Math.floor(r() * N); for (let k = 0; k < 4; k++) put(d, x + k, y, hex('#d8d0b8')); put(d, x, y - 1, hex('#e8e0c8')); put(d, x + 3, y + 1, hex('#e8e0c8')); } };
  T.moondust = (d, name, r) => noisy(d, r, hex('#8a8a92'), hex('#d0d0d8'), [[hex('#6a6a72'), 0.05]], 3, 12);
  T.crater = T.moondust;
  T.swamp = (d, name, r) => { noisy(d, r, hex('#1e2a14'), hex('#4e5a2c'), [[hex('#6a8a4a'), 0.05]], 3, 10); };
  T.water = (d, name, r) => {
    const deep = name.endsWith(':s') ? hex('#1a5070') : name.endsWith(':r') ? hex('#1a5a88') : name.endsWith(':m') ? hex('#8090a8') : name.endsWith(':b') ? hex('#1a2410') : hex('#0c2a48');
    const lt = name.endsWith(':m') ? hex('#e0e8f4') : name.endsWith(':b') ? hex('#3a4a24') : mix(deep, hex('#5aa0d0'), 0.6);
    noisy(d, r, mul(deep, 0.85), deep, [], 3, 8);
    for (let y = 2; y < N; y += 5) { const o = Math.floor(r() * N); for (let k = 0; k < 6 + Math.floor(r() * 6); k++) put(d, o + k, y + Math.round(Math.sin((o + k) * 0.5)), lt); }
  };
  T.lava = (d, name, r) => {
    const pts = []; for (let i = 0; i < 9; i++) pts.push([r() * N, r() * N]);
    fill(d, (x, y) => { let b1 = 1e9, b2 = 1e9; for (const p of pts) for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) { const dd = Math.hypot(x - p[0] - ox, y - p[1] - oy); if (dd < b1) { b2 = b1; b1 = dd; } else if (dd < b2) b2 = dd; } const e = b2 - b1; if (e < 2) { const c = mix(hex('#ffd040'), hex('#ff5a10'), e / 2); c[3] = 128; return c; } return mul(hex('#3a1408'), 0.8 + r() * 0.3); });
  };
  T.cloud = (d, name, r) => noisy(d, r, hex('#a8b0c0'), hex('#f4f6fa'), [], 3, 8);
  T.mist = (d, name, r) => noisy(d, r, hex('#3a4846'), hex('#8a9a96'), [], 3, 8);
  T.dream = (d, name, r) => noisy(d, r, hex('#3a2a5a'), hex('#9a8ac0'), [[hex('#e0d0ff'), 0.01]], 3, 10);
  T.spirit = (d, name, r) => noisy(d, r, hex('#1a3a36'), hex('#5aa090'), [[hex('#b0fff0'), 0.008]], 3, 10);
  T.voidfloor = (d, name, r) => { fill(d, () => mul(hex('#10101a'), 0.8 + r() * 0.4)); for (let i = 0; i < 6; i++) { const c = hex('#a0a0ff'); c[3] = 128; const x = Math.floor(r() * N), y = Math.floor(r() * N); put(d, x, y, c, 128); } };
  T.timefloor = (d, name, r) => { noisy(d, r, hex('#5a4420'), hex('#c0a060'), [], 3, 10); for (let a = 0; a < 6.28; a += 0.12) { put(d, 16 + Math.round(Math.cos(a) * 11), 16 + Math.round(Math.sin(a) * 11), hex('#f0d080')); } };
  T.seafloor = (d, name, r) => noisy(d, r, hex('#2a4a5a'), hex('#6a8a90'), [[hex('#3a8a5a'), 0.03]], 3, 10);
  T.flesh = (d, name, r) => { noisy(d, r, hex('#5a1a24'), hex('#9a4a5a'), [], 3, 8); for (let i = 0; i < 4; i++) { let x = r() * N, y = r() * N, a = r() * 6; for (let k = 0; k < 14; k++) { put(d, Math.round(x), Math.round(y), hex('#c03040')); x += Math.cos(a); y += Math.sin(a); a += (r() - 0.5) * 0.8; } } };
  T.roots = (d, name, r) => { noisy(d, r, hex('#1e160c'), hex('#3a2a18'), [], 3, 10); for (let i = 0; i < 5; i++) { let x = r() * N, y = r() * N, a = r() * 6; for (let k = 0; k < 18; k++) { put(d, Math.round(x), Math.round(y), hex('#6a4a2a')); put(d, Math.round(x), Math.round(y) + 1, hex('#4a3018')); x += Math.cos(a); y += Math.sin(a) * 0.4; a += (r() - 0.5) * 0.5; } } };

  // ---------- стены ----------
  T.brick = (d, name, r) => {
    const base = name.endsWith(':s') ? hex('#8a8478') : hex('#8a5a3c'), mort = name.endsWith(':s') ? hex('#3a3834') : hex('#c8b8a0');
    const ks = []; for (let i = 0; i < 32; i++) ks.push(0.8 + r() * 0.35);
    fill(d, (x, y) => { const row = y >> 2; const off = (row % 2) * 4; if (y % 4 === 3) return mort; const bx = ((x + off) >> 3); if ((x + off) % 8 === 7) return mort; return mul(base, ks[(row * 5 + bx) % 32] * (0.94 + r() * 0.08)); });
  };
  T.timber = (d, name, r) => {
    // фахверк: светлая штукатурка в тёмных балках
    noisy(d, r, hex('#c8bca0'), hex('#e4dac4'), [[hex('#b0a488'), 0.04]], 3, 10);
    const beam = hex('#4a3018');
    for (let x = 0; x < N; x++) { put(d, x, 0, beam); put(d, x, 1, beam); put(d, x, 30, beam); put(d, x, 31, beam); }
    for (let y = 0; y < N; y++) { put(d, 0, y, beam); put(d, 1, y, beam); put(d, 15, y, beam); put(d, 16, y, beam); }
    for (let k = 2; k < 30; k++) { put(d, 2 + Math.round((k - 2) * 12 / 28), k, beam); put(d, 3 + Math.round((k - 2) * 12 / 28), k, beam); }
  };
  T.townwall = (d, name, r) => { const ks = []; for (let i = 0; i < 16; i++) ks.push(0.8 + r() * 0.3); fill(d, (x, y) => { const row = y >> 3; const off = (row % 2) * 8; if (y % 8 === 7 || (x + off) % 16 === 15) return hex('#3a3a36'); return mul(hex('#9a9a90'), ks[(row * 3 + ((x + off) >> 4)) % 16] * (0.92 + r() * 0.1)); }); };
  T.window = (d, name, r) => {
    T[name.includes(':t') ? 'timber' : 'brick'](d, name.includes(':t') ? 'timber' : 'brick', r);
    const fr = hex('#3a2410');
    for (let y = 6; y < 26; y++) for (let x = 8; x < 24; x++) {
      const edge = x === 8 || x === 23 || y === 6 || y === 25 || x === 15 || x === 16 || y === 15 || y === 16;
      if (edge) put(d, x, y, fr);
      else { const c = mix(hex('#d08a30'), hex('#f0c060'), (y - 6) / 20 + (r() - 0.5) * 0.2); put(d, x, y, c, 64); }
    }
    for (let x = 6; x < 26; x++) put(d, x, 26, hex('#5a4028'));
  };
  T.door = (d, name, r) => {
    T[name.includes(':t') ? 'timber' : 'brick'](d, name.includes(':t') ? 'timber' : 'brick', r);
    for (let y = 4; y < N; y++) for (let x = 7; x < 25; x++) {
      if (x === 7 || x === 24 || y === 4) { put(d, x, y, hex('#2a1a0a')); continue; }
      const plank = (x - 8) % 4 === 3;
      put(d, x, y, plank ? hex('#3a2410') : mul(hex('#7a4e28'), 0.9 + r() * 0.15));
    }
    for (const yy of [9, 24]) for (let x = 8; x < 24; x++) put(d, x, yy, hex('#4a4a50'));
    put(d, 21, 17, hex('#e0c060')); put(d, 21, 18, hex('#a08030'));
  };
  T.cave = (d, name, r) => { noisy(d, r, hex('#2e2824'), hex('#5e5650'), [[hex('#22201c'), 0.06], [hex('#6e6660'), 0.03]], 4, 12); for (let i = 0; i < 4; i++) { let x = r() * N, y = r() * N; for (let k = 0; k < 9; k++) { put(d, Math.round(x), Math.round(y), hex('#1a1614')); x += r() - 0.3; y += 1; } } };
  T.crack = (d, name, r) => { T.cave(d, name, r); for (let y = 0; y < N; y++) put(d, 16 + Math.round(Math.sin(y * 0.4) * 2), y, hex('#0e0c0a')); };
  T.ore = (d, name, r) => { T.cave(d, name, r); for (let i = 0; i < 12; i++) { const x = Math.floor(r() * N), y = Math.floor(r() * N); put(d, x, y, hex('#e0a060')); put(d, x + 1, y, hex('#c87a4a')); } };
  T.mountain = (d, name, r) => { noisy(d, r, hex('#4a4a46'), hex('#8a8a84'), [[hex('#3a3a36'), 0.05]], 4, 12); for (let y = 2; y < N; y += 7) for (let x = 0; x < N; x++) if (r() < 0.7) put(d, x, y + Math.round(Math.sin(x * 0.3 + y) * 1.5), hex('#3a3a36')); };
  T.peak = (d, name, r) => { T.mountain(d, name, r); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (y < 12 + Math.sin(x * 0.5) * 4) put(d, x, y, mix(hex('#c8d4e0'), hex('#ffffff'), r())); };
  T.icerock = (d, name, r) => noisy(d, r, hex('#7aa8c0'), hex('#d0eef8'), [[hex('#ffffff'), 0.04]], 3, 10);
  T.basalt = (d, name, r) => { fill(d, (x, y) => { const c = x % 8; if (c === 0) return hex('#0e0c0a'); return mul(hex('#3a3632'), 0.7 + Math.sin(c / 8 * Math.PI) * 0.4 + (r() - 0.5) * 0.1); }); };
  T.bark = (d, name, r) => { fill(d, (x, y) => { const v = Math.abs(Math.sin(x * 0.9 + Math.sin(y * 0.2) * 1.5)); return mul(hex('#5a3e24'), 0.6 + v * 0.55 + (r() - 0.5) * 0.1); }); };
  T.treewall = T.bark;
  T.coral = (d, name, r) => noisy(d, r, hex('#7a3040'), hex('#e08a9a'), [[hex('#f0b0c0'), 0.04]], 3, 10);
  T.fleshwall = (d, name, r) => T.flesh(d, name, r);
  T.dreamwall = (d, name, r) => noisy(d, r, hex('#1a1430'), hex('#6a5aa0'), [[hex('#c0b0ff'), 0.01]], 3, 8);
  T.clockwall = (d, name, r) => { noisy(d, r, hex('#3a2c14'), hex('#7a6030'), [], 3, 8); for (let a = 0; a < 6.28; a += 0.08) { const rr = 9 + (Math.sin(a * 8) > 0 ? 2 : 0); put(d, 16 + Math.round(Math.cos(a) * rr), 16 + Math.round(Math.sin(a) * rr), hex('#c0a050')); } };
  T.shelf = (d, name, r) => {
    const cols = ['#8a3028', '#2e5a3e', '#4a3a7a', '#a08030', '#30607a', '#6a4228'].map(hex);
    fill(d, (x, y) => { if (y % 11 === 0 || y % 11 === 10) return hex('#4a3018'); if (x === 0 || x === 31) return hex('#3a2410'); const b = Math.floor(x / 3) + Math.floor(y / 11) * 11; return mul(cols[(b * 7) % cols.length], 0.75 + ((b * 13) % 5) / 10); });
  };
  // ---------- крыши и потолки ----------
  T.roof_tiles = (d, name, r) => { fill(d, (x, y) => { const row = y >> 3, off = (row % 2) * 4, fx = (x + off) % 8, fy = y % 8; const edge = fy === 7 || (fy > 4 && (fx === 0 || fx === 7)); return mul(hex('#a83c2c'), edge ? 0.5 : 0.8 + (1 - fy / 8) * 0.35 + (r() - 0.5) * 0.06); }); };
  T.roof_palace = (d, name, r) => { fill(d, (x, y) => { const row = y >> 3, off = (row % 2) * 4, fx = (x + off) % 8, fy = y % 8; const edge = fy === 7 || (fy > 4 && (fx === 0 || fx === 7)); return mul(hex('#34509a'), edge ? 0.5 : 0.8 + (1 - fy / 8) * 0.4); }); };
  T.roof_slate = (d, name, r) => { fill(d, (x, y) => { const row = y >> 2, off = (row % 2) * 3, fx = (x + off) % 6; if (y % 4 === 3) return hex('#1e2630'); return mul(hex('#4e5e70'), (fx === 0 ? 0.7 : 0.9) + (r() - 0.5) * 0.15); }); };
  T.roof_thatch = (d, name, r) => { fill(d, (x, y) => { const s = Math.sin(x * 2.1 + Math.floor(y / 6) * 1.7) * 0.5 + 0.5; const band = y % 6 === 5 ? 0.6 : 1; return mul(mix(hex('#8a6a30'), hex('#d8b468'), s * 0.7 + r() * 0.3), band); }); };
  T.roof_wood = (d, name, r) => { fill(d, (x, y) => { const row = y >> 3, off = (row % 2) * 5; if (y % 8 === 7 || (x + off) % 10 === 0) return hex('#2a1a0c'); return mul(hex('#7a5634'), 0.8 + (1 - (y % 8) / 8) * 0.3 + (r() - 0.5) * 0.08); }); };
  T.roof_temple = (d, name, r) => { fill(d, (x, y) => { if (y % 8 === 7) return hex('#5a544a'); return mul(hex('#b0a898'), 0.85 + (r() - 0.5) * 0.12); }); for (let x = 0; x < N; x++) put(d, x, 0, hex('#e0c050')); };
  T.ceiling_wood = (d, name, r) => { T.planks(d, name, r); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) put(d, x, y, mul(get(d, x, y), 0.75)); };
  T.ceiling_rock = (d, name, r) => noisy(d, r, hex('#1e1a16'), hex('#3e3832'), [[hex('#141210'), 0.05]], 4, 12);
})(window.EOF);
