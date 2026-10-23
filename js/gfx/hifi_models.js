'use strict';
// Объёмные модели «почти реальности»: деревья, утварь, святыни, люди, звери, чудовища, великие.
// Каждая модель — набор простых тел (шары, коробки, конусы, диски) с материалами;
// движок сам находит видимую поверхность, нормали и потом освещает их солнцем и огнями.
// Координаты в клетках: x — восток, y — юг (к зрителю), z — вверх; (0, 0, 0) — середина клетки у земли.
(function (E) {
  const Gfx = E.Gfx, HF = Gfx.HF, C = HF.C, CS = HF.CS, F = HF.F;
  const { vnoise, hash2 } = HF.noise;
  const MD = HF.models;

  // ---------- материалы ----------
  const mat = (hex, cs, x) => Object.assign({ c: typeof hex === 'string' ? C(hex) : hex, cs: CS[cs] }, x || {});
  const shadeC = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // фактура: шум по поверхности меняет цвет, наклон и плотность символа
  const texNoise = (amp, nAmp, freq, seed) => (x, y, z, mo, n) => {
    const v = vnoise(x * freq + seed, (y + z) * freq, seed);
    const k = 1 - amp + v * amp * 2;
    mo.r *= k; mo.g *= k; mo.b *= k; mo.t = v;
    n[0] += (v - 0.5) * nAmp; n[1] += (vnoise(x * freq, (y - z) * freq + 3, seed + 1) - 0.5) * nAmp;
  };
  const leafTex = (seed) => texNoise(0.32, 1.1, 9, seed);
  const furTex = texNoise(0.18, 0.5, 14, 7);
  const clothTex = texNoise(0.1, 0.35, 7, 11);
  const stoneTex = texNoise(0.2, 0.6, 8, 13);
  const barkTex = (x, y, z, mo, n) => { const v = Math.abs(Math.sin(x * 60 + vnoise(x * 8, z * 3, 5) * 4)); const k = 0.75 + v * 0.45; mo.r *= k; mo.g *= k; mo.b *= k; mo.t = v; };

  // ---------- примитивы ----------
  const el = (x, y, z, rx, ry, rz, m) => ({ t: 'e', x, y, z, rx, ry, rz, m });
  const sph = (x, y, z, r, m) => el(x, y, z, r, r, r, m);
  const box = (x0, y0, z0, x1, y1, z1, m) => ({ t: 'b', x0, y0, z0, x1, y1, z1, m });
  const coneCache = new Map();
  const coneMat = (m) => { if (m.cs === CS.snow || m.cs === CS.bone || m.cs === CS.metal) return m; let c = coneCache.get(m); if (!c) { c = Object.assign({}, m, { cs: CS.cone, nt: 1 }); coneCache.set(m, c); } return c; };
  const cone = (x, y, z0, r, h, m) => ({ t: 'c', x, y, z0, r, h, m: coneMat(m) });
  const disc = (x, y, z, rx, ry, m) => ({ t: 'd', x, y, z, rx, ry, m });
  // конечность — цепочка шаров (не тоньше ячейки, чтобы не пропадала)
  // символ кости — по её направлению на экране
  const lineCache = new Map();
  function lineMat(m, du, dv) {
    const ad = Math.abs(du), av = Math.abs(dv);
    const k = av > ad * 2.2 ? 'lineV' : ad > av * 2.2 ? 'lineH' : du * dv > 0 ? 'lineD1' : 'lineD2';
    let c = lineCache.get(m);
    if (!c) { c = {}; lineCache.set(m, c); }
    return c[k] || (c[k] = Object.assign({}, m, { cs: CS[k], tex: null }));
  }
  function limb(out, P, x0, y0, z0, x1, y1, z1, r0, r1, m) {
    if (!m.keep) m = lineMat(m, x1 - x0, (y1 - y0) - (z1 - z0));
    const mn = 0.55 * P.px;
    r0 = Math.max(r0, mn); r1 = Math.max(r1, mn);
    const L = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    const n = Math.max(2, Math.ceil(L / (Math.min(r0, r1) * 0.8)));
    for (let i = 0; i <= n; i++) { const t = i / n; out.push(sph(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t, r0 + (r1 - r0) * t, m)); }
  }
  const pmin = (P, r) => Math.max(r, 0.55 * P.px);
  const colOf = (o, def) => (o.c && /^#[0-9a-f]{6}$/i.test(o.c) ? o.c : def);

  // ---------- особые режимы: удар, призрак, отражение ----------
  function wrap(key, prims, o) {
    if (!o) return { key, prims };
    let k = key;
    let f = null;
    if (o.hit) { k += '|hit'; f = (m) => Object.assign({}, m, { c: mixC(m.c, [1, 0.15, 0.1], 0.6), em: 0.4 }); }
    else if (o.mode === 4) { k += '|ghost'; f = (m) => Object.assign({}, m, { c: mixC(m.c, [0.6, 0.95, 0.9], 0.55), a: 0.6, em: 0.35 }); }
    else if (o.mode === 5) { k += '|mirror'; f = (m) => Object.assign({}, m, { c: mixC(m.c, [0.85, 0.9, 0.98], 0.6), sp: 0.9 }); }
    if (f) { const map = new Map(); prims = prims.map((p) => { if (!map.has(p.m)) map.set(p.m, f(p.m)); return Object.assign({}, p, { m: map.get(p.m) }); }); }
    return { key: k, prims };
  }

  // ============================================================
  // ДЕРЕВЬЯ И РАСТЕНИЯ
  // ============================================================
  const BARK = mat('#5a3e24', 'bark', { tex: barkTex });
  function oak(o, P, variant) {
    const v = variant, sway = Math.sin(o.f * 0.7 + (o.seed || 0)) * 0.025 * (P.level >= 4 ? 1 : 0);
    const fr = (P.level >= 4 ? (o.f % 4) : 0);
    const c = C(colOf(o, '#3e7b34'));
    const L = mat(c, 'leaf', { tex: leafTex(v * 7 + 3) });
    const L2 = mat(shadeC(c, 1.25), 'leaf', { tex: leafTex(v * 7 + 5) });
    const out = [];
    limb(out, P, 0, 0, 0, 0.02, 0, 0.95, 0.09, 0.07, BARK);
    limb(out, P, 0.02, 0, 0.75, 0.25, 0, 1.05, 0.05, 0.04, BARK);
    const sx = sway * Math.sin(fr);
    const cl = v === 0
      ? [[0, 0, 1.35, 0.5, 0.42, 0.42], [-0.3, 0.06, 1.12, 0.32, 0.3, 0.3], [0.3, -0.04, 1.18, 0.34, 0.3, 0.3], [0.05, 0.1, 1.62, 0.3, 0.26, 0.24]]
      : [[0, 0, 1.25, 0.44, 0.38, 0.36], [-0.22, 0.08, 1.5, 0.3, 0.26, 0.26], [0.26, 0.04, 1.42, 0.3, 0.26, 0.26], [0.0, 0.12, 1.05, 0.34, 0.28, 0.24]];
    cl.forEach((q, i) => out.push(el(q[0] + sx, q[1], q[2], q[3], q[4], q[5], i === 3 ? L2 : L)));
    return { key: 'oak' + v + '|' + c.join() + '|' + fr + '|' + P.level, prims: out };
  }
  MD.tree = (o, P) => oak(o, P, 0);
  MD.tree2 = (o, P) => oak(o, P, 1);
  MD.tree_bare = (o, P) => {
    const out = [], S = mat('#e8eef4', 'snow');
    limb(out, P, 0, 0, 0, 0, 0, 1.1, 0.08, 0.05, BARK);
    for (const [x, z, h] of [[-0.35, 0.8, 1.35], [0.32, 0.75, 1.3], [-0.12, 1, 1.55], [0.18, 1.0, 1.6]]) { limb(out, P, 0, 0, z, x, 0.02, h, 0.04, 0.02, BARK); out.push(sph(x, 0.02, h + 0.02, pmin(P, 0.035), S)); }
    return { key: 'treebare|' + P.level, prims: out };
  };
  function pine(o, P, snow) {
    const c = C(colOf(o, '#2e6b55'));
    const N = mat(c, 'leaf', { tex: leafTex(17) }), S = mat('#eef4f8', 'snow', { tex: texNoise(0.1, 0.3, 9, 19) });
    const out = [];
    limb(out, P, 0, 0, 0, 0, 0, 0.45, 0.07, 0.06, BARK);
    const tiers = [[0.25, 0.48, 0.75], [0.7, 0.38, 0.65], [1.1, 0.27, 0.6]];
    tiers.forEach(([z, r, h]) => { out.push(cone(0, 0, z, r, h, N)); if (snow) out.push(cone(0, 0, z + h * 0.45, r * 0.55, h * 0.55, S)); });
    return { key: 'pine|' + c.join() + (snow ? 's' : '') + '|' + P.level, prims: out };
  }
  MD.pine = (o, P) => pine(o, P, false);
  MD.pine_snow = (o, P) => pine(o, P, true);
  MD.deadtree = (o, P) => {
    const out = [], B = mat('#6a5a46', 'bark', { tex: barkTex });
    limb(out, P, 0, 0, 0, 0.05, 0, 0.9, 0.08, 0.05, B);
    limb(out, P, 0.05, 0, 0.6, -0.3, 0.02, 1.0, 0.04, 0.02, B); limb(out, P, 0.05, 0, 0.75, 0.32, 0, 1.15, 0.035, 0.02, B); limb(out, P, -0.3, 0.02, 1.0, -0.4, 0.02, 1.2, 0.02, 0.015, B);
    return { key: 'dead|' + P.level, prims: out };
  };
  MD.bush = (o, P) => {
    const L = mat('#3e6a2c', 'leaf', { tex: leafTex(23) }), R = mat('#c03030', 'glow', { sp: 0.6 });
    const out = [el(-0.15, 0.04, 0.2, 0.24, 0.2, 0.2, L), el(0.15, 0, 0.22, 0.24, 0.2, 0.22, L), el(0, -0.05, 0.32, 0.22, 0.18, 0.2, L)];
    if ((o.seed || 0) % 3 === 0) out.push(sph(0.1, 0.15, 0.3, pmin(P, 0.035), R), sph(-0.12, 0.17, 0.22, pmin(P, 0.035), R));
    return { key: 'bush' + ((o.seed || 0) % 3 === 0 ? 'b' : '') + '|' + P.level, prims: out };
  };
  MD.fern = (o, P) => {
    const L = mat('#3e8a4e', 'leaf', { tex: leafTex(29) }), out = [];
    for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2; out.push(el(Math.cos(ang) * 0.17, Math.sin(ang) * 0.12, 0.13, 0.15, 0.06, 0.05, L)); }
    return { key: 'fern|' + P.level, prims: out };
  };
  MD.reeds = (o, P) => {
    const R = mat('#8a9a5a', 'crop'), T = mat('#6a4a2a', 'fur'), out = [], sw = Math.sin(o.f * 0.5) * 0.03;
    for (let q = 0; q < 6; q++) { const x = (hash2(q, 1, 3) - 0.5) * 0.5, y = (hash2(q, 2, 3) - 0.5) * 0.3, h = 0.5 + hash2(q, 3, 3) * 0.35; limb(out, P, x, y, 0, x + sw, y, h, 0.018, 0.012, R); if (q % 2 === 0) out.push(el(x + sw, y, h, pmin(P, 0.03), pmin(P, 0.03), 0.07, T)); }
    return { key: 'reeds|' + Math.round(sw * 100) + '|' + P.level, prims: out };
  };
  MD.mushroom = (o, P) => ({ key: 'mush|' + P.level, prims: [sph(0, 0, 0.07, pmin(P, 0.04), mat('#e0d0c0', 'bone')), el(0, 0, 0.15, 0.12, 0.1, 0.06, mat('#c07ad0', 'cloth', { tex: texNoise(0.25, 0.3, 12, 31) }))] });
  MD.bigshroom = (o, P) => {
    const out = [];
    limb(out, P, 0, 0, 0, 0, 0, 0.7, 0.1, 0.08, mat('#e0d0c0', 'bone'));
    out.push(el(0, 0, 0.8, 0.5, 0.42, 0.2, mat('#a050c8', 'cloth', { tex: (x, y, z, mo, n) => { const s = vnoise(x * 6, y * 6, 33) > 0.7; if (s) { mo.r = 0.95; mo.g = 0.9; mo.b = 0.85; } mo.t = s ? 0.9 : 0.4; } })));
    return { key: 'bigmush|' + P.level, prims: out };
  };
  MD.cactus = (o, P) => {
    const G = mat('#4a7a32', 'crop', { tex: texNoise(0.2, 0.5, 14, 35) }), out = [];
    limb(out, P, 0, 0, 0, 0, 0, 0.85, 0.11, 0.1, G);
    limb(out, P, 0, 0, 0.4, -0.22, 0, 0.45, 0.06, 0.06, G); limb(out, P, -0.22, 0, 0.45, -0.22, 0, 0.7, 0.06, 0.05, G);
    limb(out, P, 0, 0, 0.55, 0.2, 0, 0.58, 0.05, 0.05, G); limb(out, P, 0.2, 0, 0.58, 0.2, 0, 0.78, 0.05, 0.04, G);
    out.push(sph(0, 0, 0.92, pmin(P, 0.05), mat('#e080a0', 'flower')));
    return { key: 'cactus|' + P.level, prims: out };
  };
  MD.coral = (o, P) => {
    const K = mat('#e07a8a', 'leaf', { tex: leafTex(37) }), out = [];
    limb(out, P, 0, 0, 0, -0.15, 0, 0.5, 0.06, 0.04, K); limb(out, P, 0, 0, 0, 0.18, 0.02, 0.45, 0.06, 0.04, K); limb(out, P, 0, 0, 0, 0, 0.05, 0.62, 0.06, 0.035, K);
    return { key: 'coral|' + P.level, prims: out };
  };
  MD.sapling = (o, P) => { const out = []; limb(out, P, 0, 0, 0, 0, 0, 0.3, 0.025, 0.02, BARK); out.push(sph(0, 0, 0.36, 0.1, mat('#8ad06a', 'leaf', { tex: leafTex(39) }))); return { key: 'sapling|' + P.level, prims: out }; };
  MD.boulder = (o, P) => ({ key: 'boulder|' + P.level, prims: [el(0, 0, 0.18, 0.36, 0.3, 0.24, mat('#7a7268', 'stone', { tex: stoneTex })), el(0.15, 0.05, 0.12, 0.22, 0.2, 0.15, mat('#8a8278', 'stone', { tex: stoneTex }))] });
  MD.crystal = (o, P) => {
    const K = mat('#9a7aff', 'glow', { sp: 1, em: 0.45 }), K2 = mat('#c8b0ff', 'glow', { sp: 1, em: 0.6 });
    return { key: 'crystal|' + P.level, prims: [el(0, 0, 0.32, 0.09, 0.08, 0.32, K2), el(-0.12, 0.04, 0.2, 0.07, 0.06, 0.2, K), el(0.13, 0.02, 0.18, 0.07, 0.06, 0.18, K)] };
  };

  // ============================================================
  // ПОСТРОЙКИ И УТВАРЬ
  // ============================================================
  const WOOD = mat('#7a5634', 'wood', { tex: texNoise(0.12, 0.2, 10, 41) }), DWOOD = mat('#4a3018', 'wood');
  const STONE = mat('#8a8478', 'stone', { tex: stoneTex }), DSTONE = mat('#5a564e', 'stone', { tex: stoneTex });
  const METAL = mat('#9aa0a8', 'metal', { sp: 0.8 }), GOLD = mat('#e8c040', 'gold', { sp: 1, em: 0.08 });
  const flame = (P, f, x, y, z, s) => {
    const k = f % 4, out = [];
    const a = mat('#ffd060', 'fire', { em: 1.6, fl: F.NOSHADOW }), b = mat('#ff7a20', 'fire', { em: 1.3, fl: F.NOSHADOW });
    out.push(el(x, y, z + 0.08 * s, 0.09 * s, 0.07 * s, 0.13 * s, b));
    out.push(el(x + (k - 1.5) * 0.015 * s, y + 0.02, z + 0.18 * s + (k % 2) * 0.03 * s, pmin(P, 0.05 * s), pmin(P, 0.05 * s), 0.08 * s, a));
    return out;
  };
  MD.campfire = (o, P) => {
    const out = [];
    for (let a = 0; a < 7; a++) { const ang = a / 7 * Math.PI * 2; out.push(sph(Math.cos(ang) * 0.26, Math.sin(ang) * 0.18, 0.04, pmin(P, 0.06), DSTONE)); }
    limb(out, P, -0.18, 0.05, 0.05, 0.16, -0.04, 0.08, 0.035, 0.035, DWOOD); limb(out, P, -0.12, -0.08, 0.06, 0.14, 0.08, 0.05, 0.035, 0.035, DWOOD);
    const f = o.f % 4;
    return { key: 'campfire|' + f + '|' + P.level, prims: out.concat(flame(P, f, 0, 0, 0.04, 1.2)) };
  };
  MD.hearth = (o, P) => {
    const out = [box(-0.42, -0.3, 0, 0.42, 0.25, 0.75, STONE), box(-0.25, 0.25, 0, 0.25, 0.27, 0.42, mat('#1a120c', 'dark'))];
    const f = o.f % 4;
    return { key: 'hearth|' + f + '|' + P.level, prims: out.concat(flame(P, f, 0, 0.3, 0, 1)) };
  };
  MD.chest = (o, P) => ({ key: 'chest|' + P.level, prims: [box(-0.3, -0.18, 0, 0.3, 0.18, 0.28, mat('#8a5a2a', 'wood', { tex: texNoise(0.12, 0.2, 10, 43) })), el(0, 0, 0.28, 0.3, 0.18, 0.1, mat('#9a6a32', 'wood')), box(-0.31, 0.17, 0.05, -0.25, 0.19, 0.3, METAL), box(0.25, 0.17, 0.05, 0.31, 0.19, 0.3, METAL), box(-0.05, 0.18, 0.15, 0.05, 0.2, 0.25, GOLD)] });
  MD.table = (o, P) => {
    const out = [box(-0.4, -0.25, 0.42, 0.4, 0.25, 0.5, WOOD)];
    for (const [x, y] of [[-0.34, -0.2], [0.34, -0.2], [-0.34, 0.2], [0.34, 0.2]]) out.push(box(x - pmin(P, 0.03), y - 0.03, 0, x + pmin(P, 0.03), y + 0.03, 0.42, DWOOD));
    if ((o.seed || 0) % 2) out.push(el(0.1, 0, 0.55, 0.08, 0.06, 0.05, mat('#c8c0b0', 'bone', { sp: 0.5 })));
    return { key: 'table' + ((o.seed || 0) % 2) + '|' + P.level, prims: out };
  };
  MD.counter = (o, P) => ({ key: 'counter|' + P.level, prims: [box(-0.48, -0.22, 0, 0.48, 0.22, 0.5, WOOD), box(-0.5, -0.24, 0.5, 0.5, 0.24, 0.55, mat('#9a7448', 'wood'))] });
  MD.bed = (o, P) => ({ key: 'bed|' + P.level, prims: [box(-0.42, -0.3, 0, 0.42, 0.3, 0.25, DWOOD), box(-0.4, -0.28, 0.25, 0.4, 0.28, 0.32, mat('#d8d0c0', 'cloth')), box(-0.1, -0.28, 0.3, 0.4, 0.28, 0.36, mat('#8a5a8a', 'cloth', { tex: clothTex })), el(-0.28, 0, 0.36, 0.11, 0.18, 0.06, mat('#f0ece0', 'cloth'))] });
  MD.anvil = (o, P) => ({ key: 'anvil|' + P.level, prims: [box(-0.12, -0.1, 0, 0.12, 0.1, 0.25, DSTONE), box(-0.28, -0.1, 0.25, 0.22, 0.1, 0.36, METAL), el(0.3, 0, 0.32, 0.12, 0.06, 0.04, METAL)] });
  MD.alchtable = (o, P) => {
    const out = MD.table({ seed: 0 }, P).prims.slice();
    const cols = ['#7ad0a0', '#d07ab0', '#e0d060'];
    cols.forEach((c, i) => { const x = -0.22 + i * 0.22; out.push(el(x, 0, 0.6, 0.06, 0.06, 0.08, mat(c, 'glass', { sp: 1, em: 0.35, a: 0.9 }))); out.push(sph(x, 0, 0.7, pmin(P, 0.025), mat(c, 'glass', { em: 0.5 }))); });
    return { key: 'alch|' + P.level, prims: out };
  };
  MD.throne = (o, P) => ({ key: 'throne|' + P.level, prims: [box(-0.3, -0.25, 0, 0.3, 0.2, 0.4, mat('#c8a030', 'gold', { sp: 0.9 })), box(-0.3, -0.28, 0.4, 0.3, -0.18, 1.2, mat('#d8b040', 'gold', { sp: 0.9 })), box(-0.24, -0.18, 0.4, 0.24, 0.18, 0.46, mat('#a02a2a', 'cloth', { tex: clothTex })), sph(0, -0.24, 1.25, pmin(P, 0.06), mat('#e03040', 'glow', { em: 0.6, sp: 1 }))] });
  MD.sign = (o, P) => { const out = []; limb(out, P, 0, 0, 0, 0, 0, 0.7, 0.035, 0.03, DWOOD); out.push(box(-0.28, -0.03, 0.5, 0.28, 0.03, 0.75, mat('#a88a5a', 'wood'))); return { key: 'sign|' + P.level, prims: out }; };
  MD.statue = (o, P) => {
    const st = mat('#a0a0a0', 'stone', { tex: stoneTex });
    const body = human({ cloth: st, pants: st, skin: st, hair: st, frame: 0 }, P, 1.05);
    return { key: 'statue|' + P.level, prims: [box(-0.25, -0.2, 0, 0.25, 0.2, 0.22, DSTONE)].concat(body.map((p) => Object.assign({}, p, p.t === 'e' ? { z: p.z + 0.22 } : {}))) };
  };
  MD.pillar = (o, P) => ({ key: 'pillar|' + P.level, prims: [box(-0.22, -0.2, 0, 0.22, 0.2, 0.15, STONE), el(0, 0, 0.7, 0.15, 0.14, 0.62, mat('#9a9890', 'stone', { tex: (x, y, z, mo, n) => { const v = Math.abs(Math.sin(Math.atan2(y, x) * 8)); mo.t = v; const k = 0.85 + v * 0.25; mo.r *= k; mo.g *= k; mo.b *= k; } })), box(-0.22, -0.2, 1.25, 0.22, 0.2, 1.38, STONE)] });
  MD.tent = (o, P) => ({ key: 'tent|' + P.level, prims: [cone(0, 0, 0, 0.48, 0.9, mat('#b08a5a', 'cloth', { tex: clothTex })), box(-0.1, 0.3, 0, 0.1, 0.36, 0.35, mat('#2a1a0e', 'dark'))] });
  MD.shrine = (o, P) => {
    const glow = 0.55 + 0.25 * Math.sin((o.f || 0) * 0.6);
    return { key: 'shrine|' + Math.round(glow * 10) + '|' + P.level, prims: [box(-0.38, -0.3, 0, 0.38, 0.3, 0.12, DSTONE), box(-0.3, -0.24, 0.12, 0.3, 0.2, 0.62, STONE), cone(0, -0.02, 0.62, 0.44, 0.36, mat('#6a5a48', 'rooftile')), sph(0, 0.21, 0.38, pmin(P, 0.08), mat('#ffe080', 'glow', { em: glow * 2, fl: F.NOSHADOW }))] };
  };
  MD.altar = (o, P) => {
    const f = (o.f || 0) % 4;
    const out = [box(-0.4, -0.22, 0, 0.4, 0.22, 0.45, STONE), box(-0.42, -0.1, 0.45, 0.42, 0.24, 0.48, mat('#a02a2a', 'cloth', { tex: clothTex }))];
    for (const x of [-0.3, 0.3]) { limb(out, P, x, 0, 0.48, x, 0, 0.62, 0.025, 0.025, mat('#f0e8d0', 'bone')); out.push(sph(x + (f - 1.5) * 0.008, 0, 0.67, pmin(P, 0.03), mat('#ffd070', 'fire', { em: 1.6, fl: F.NOSHADOW }))); }
    return { key: 'altar|' + f + '|' + P.level, prims: out };
  };
  MD.inscription = (o, P) => ({ key: 'inscr|' + P.level, prims: [box(-0.2, -0.08, 0, 0.2, 0.08, 0.75, mat('#6a7a86', 'rune', { tex: stoneTex })), el(0, 0, 0.75, 0.2, 0.08, 0.08, mat('#6a7a86', 'stone'))] });
  MD.grave = (o, P) => ({ key: 'grave|' + P.level, prims: [el(0, 0.08, 0.04, 0.3, 0.22, 0.08, mat('#4a3a26', 'dirt')), box(-0.15, -0.16, 0, 0.15, -0.08, 0.45, mat('#9a9a9a', 'stone', { tex: stoneTex })), el(0, -0.12, 0.45, 0.15, 0.04, 0.08, mat('#9a9a9a', 'stone')), box(-0.08, -0.081, 0.28, 0.08, -0.075, 0.31, mat('#5a5a5a', 'rune')), box(-0.015, -0.081, 0.2, 0.015, -0.075, 0.38, mat('#5a5a5a', 'rune'))] });
  MD.well = (o, P) => {
    const out = [];
    for (let a = 0; a < 10; a++) { const ang = a / 10 * Math.PI * 2; out.push(el(Math.cos(ang) * 0.28, Math.sin(ang) * 0.2, 0.15, 0.1, 0.08, 0.16, STONE)); }
    out.push(disc(0, 0, 0.22, 0.2, 0.14, mat('#2a5a8a', 'water', { sp: 1, fl: F.WATER })));
    limb(out, P, -0.3, 0, 0.2, -0.3, 0, 0.85, 0.03, 0.03, DWOOD); limb(out, P, 0.3, 0, 0.2, 0.3, 0, 0.85, 0.03, 0.03, DWOOD);
    out.push(box(-0.38, -0.2, 0.85, 0.38, 0.2, 0.92, mat('#6a4a2a', 'wood')), cone(0, 0, 0.92, 0.42, 0.25, mat('#7a3a2a', 'rooftile')));
    return { key: 'well|' + P.level, prims: out };
  };
  MD.lighthouse = (o, P) => {
    const out = [], R = mat('#c84040', 'cloth'), Wt = mat('#f0f0e0', 'cloth');
    for (let q = 0; q < 6; q++) out.push(box(-0.24 + q * 0.015, -0.2, q * 0.42, 0.24 - q * 0.015, 0.2, q * 0.42 + 0.42, q % 2 ? R : Wt));
    out.push(sph(0, 0, 2.7, 0.16, mat('#fff0a0', 'glow', { em: 2, fl: F.NOSHADOW })), cone(0, 0, 2.85, 0.24, 0.3, mat('#5a5a5a', 'metal')));
    return { key: 'lighthouse|' + P.level, prims: out };
  };
  MD.stairs_down = (o, P) => {
    const out = [box(-0.42, -0.32, 0, 0.42, 0.32, 0.04, mat('#3a3020', 'dirt'))];
    for (let s = 0; s < 4; s++) out.push(box(-0.32, -0.25 + s * 0.12, 0.04 - s * 0.001, 0.32, -0.15 + s * 0.12, 0.041, mat(shadeC(C('#a08a60'), 1 - s * 0.22), 'wood')));
    out.push(disc(0, 0.12, 0.045, 0.22, 0.1, mat('#0a0806', 'dark')));
    return { key: 'down|' + P.level, prims: out };
  };
  MD.stairs_up = (o, P) => {
    const out = [];
    for (let s = 0; s < 4; s++) out.push(box(-0.3, 0.2 - s * 0.12, 0, 0.3, 0.32 - s * 0.12, 0.08 + s * 0.12, mat(shadeC(C('#b8a070'), 0.7 + s * 0.1), 'stone')));
    out.push(sph(0, -0.2, 0.7, 0.08, mat('#fff0c0', 'glow', { em: 1.2, fl: F.NOSHADOW })));
    return { key: 'up|' + P.level, prims: out };
  };
  MD.mine = (o, P) => ({ key: 'mine|' + P.level, prims: [box(-0.38, -0.1, 0, -0.3, 0.1, 0.7, DWOOD), box(0.3, -0.1, 0, 0.38, 0.1, 0.7, DWOOD), box(-0.42, -0.12, 0.7, 0.42, 0.12, 0.8, DWOOD), box(-0.3, -0.12, 0, 0.3, -0.05, 0.7, mat('#0a0806', 'dark'))] });
  MD.portal = (o, P) => {
    const f = (o.f || 0) % 8, out = [];
    for (let a = 0; a < 10; a++) { const ang = a / 10 * Math.PI * 2 + f * 0.25; out.push(sph(Math.cos(ang) * 0.3, 0, 0.45 + Math.sin(ang) * 0.38, pmin(P, 0.06), mat(a % 2 ? '#d080ff' : '#a050e0', 'glow', { em: 1.5, fl: F.NOSHADOW }))); }
    out.push(el(0, -0.02, 0.45, 0.2, 0.02, 0.28, mat('#4a1a6a', 'ghost', { em: 0.6, a: 0.85 })));
    return { key: 'portal|' + f + '|' + P.level, prims: out };
  };
  MD.whirlpool = (o, P) => {
    const f = (o.f || 0) % 8, out = [];
    for (let q = 0; q < 14; q++) { const ang = q * 0.6 + f * 0.3, r = 0.08 + q * 0.025; out.push(disc(Math.cos(ang) * r, Math.sin(ang) * r * 0.7, 0.01, pmin(P, 0.05), pmin(P, 0.04), mat('#c8e0ff', 'water', { em: 0.3 }))); }
    return { key: 'whirl|' + f + '|' + P.level, prims: out };
  };
  MD.gate = (o, P) => ({ key: 'gate|' + P.level, prims: [box(-0.48, -0.15, 0, -0.32, 0.15, 1.1, STONE), box(0.32, -0.15, 0, 0.48, 0.15, 1.1, STONE), box(-0.48, -0.15, 1.1, 0.48, 0.15, 1.3, STONE)] });
  MD.chimney = (o, P) => {
    const f = (o.f || 0) % 12, out = [box(-0.1, -0.1, 1.3, 0.1, 0.1, 1.85, mat('#6a3a2a', 'brick'))];
    for (let q = 0; q < 4; q++) { const k = (f + q * 3) % 12; out.push(sph(0.05 * Math.sin(k), 0, 1.95 + k * 0.08, pmin(P, 0.05 + k * 0.008), mat('#9a9aa0', 'smoke', { a: Math.max(0.15, 0.7 - k * 0.05), fl: F.NOSHADOW }))); }
    return { key: 'chim|' + f + '|' + P.level, prims: out };
  };

  // ---------- вещи на земле ----------
  const item = (name, prims) => { MD['item_' + name] = (o, P) => ({ key: 'item_' + name + '|' + P.level, prims: prims(P) }); };
  item('weapon', (P) => [box(-0.2, 0.05, 0.02, 0.22, 0.09, pmin(P, 0.05), mat('#c0c0d0', 'metal', { sp: 1 })), box(-0.26, 0.03, 0.02, -0.2, 0.11, 0.07, DWOOD)]);
  item('armor', (P) => [el(0, 0.05, 0.08, 0.2, 0.14, 0.08, mat('#8a8070', 'metal', { sp: 0.6 }))]);
  item('food', (P) => [el(0, 0.05, 0.06, 0.12, 0.09, 0.07, mat('#c0904a', 'dirt'))]);
  item('potion', (P) => [el(0, 0.05, 0.08, 0.07, 0.07, 0.08, mat('#e06090', 'glass', { sp: 1, em: 0.4 })), sph(0, 0.05, 0.17, pmin(P, 0.025), mat('#d0c0b0', 'bone'))]);
  item('book', (P) => [box(-0.12, 0, 0, 0.12, 0.12, 0.06, mat('#8a3a2a', 'book'))]);
  item('trinket', (P) => [sph(0, 0.05, 0.05, pmin(P, 0.05), mat('#e0c070', 'gold', { sp: 1 }))]);
  item('tool', (P) => [box(-0.18, 0.04, 0, 0.18, 0.08, 0.05, DWOOD), box(0.12, 0.0, 0, 0.2, 0.12, 0.07, METAL)]);
  item('misc', (P) => [sph(0, 0.05, 0.05, pmin(P, 0.06), mat('#b0b0c0', 'stone'))]);
  item('mat', (P) => [el(0, 0.05, 0.04, 0.1, 0.07, 0.05, mat('#a0a0a0', 'stone', { tex: stoneTex }))]);
  item('gold', (P) => [el(0, 0.05, 0.03, 0.12, 0.08, 0.04, mat('#f0d040', 'gold', { sp: 1, em: 0.1 }))]);
  item('art', (P) => [sph(0, 0.05, 0.12, pmin(P, 0.07), mat('#ffe0a0', 'glow', { em: 1.5, fl: F.NOSHADOW }))]);

  // ============================================================
  // ЛЮДИ
  // ============================================================
  const SKIN = C('#d8a880');
  // базовая фигура человека; o: { cloth, pants, skin, hair, frame, moving, armsFwd, robe, hunch }
  function human(o, P, s) {
    s = s || 1;
    const out = [];
    const ph = (o.frame || 0) % 4, walk = o.moving ? Math.sin(ph * Math.PI / 2) : 0;
    const hz = 0.52 * s, hunch = (o.hunch || 0) * s;
    if (o.robe) out.push(el(0, 0, 0.3 * s, 0.17 * s, 0.12 * s, 0.32 * s, bodyOf(o.cloth)));
    else {
      limb(out, P, -0.07 * s, 0, hz, -0.08 * s, walk * 0.13 * s, 0.05 * s, 0.06 * s, 0.05 * s, o.pants);
      limb(out, P, 0.07 * s, 0, hz, 0.08 * s, -walk * 0.13 * s, 0.05 * s, 0.06 * s, 0.05 * s, o.pants);
      out.push(el(-0.08 * s, walk * 0.13 * s + 0.03 * s, 0.03 * s, 0.05 * s, 0.07 * s, 0.03 * s, o.boots || DWOOD), el(0.08 * s, -walk * 0.13 * s + 0.03 * s, 0.03 * s, 0.05 * s, 0.07 * s, 0.03 * s, o.boots || DWOOD));
    }
    out.push(el(0, hunch * 0.5, 0.76 * s, 0.16 * s * (o.bulky || 1), 0.1 * s * (o.bulky || 1), 0.22 * s, bodyOf(o.cloth)));
    const sw = o.armsFwd ? 0.26 : -walk * 0.1;
    limb(out, P, -0.19 * s, hunch, 0.9 * s, -0.22 * s, sw * s + hunch, o.armsFwd ? 0.8 * s : 0.58 * s, 0.05 * s, 0.045 * s, o.sleeve || o.cloth);
    limb(out, P, 0.19 * s, hunch, 0.9 * s, 0.22 * s, (o.armsFwd ? 0.26 : walk * 0.1) * s + hunch, o.armsFwd ? 0.8 * s : 0.58 * s, 0.05 * s, 0.045 * s, o.sleeve || o.cloth);
    out.push(sph(-0.22 * s, sw * s + hunch, (o.armsFwd ? 0.8 : 0.56) * s, pmin(P, 0.045 * s), o.skin), sph(0.22 * s, (o.armsFwd ? 0.26 : walk * 0.1) * s + hunch, (o.armsFwd ? 0.8 : 0.56) * s, pmin(P, 0.045 * s), o.skin));
    out.push(sph(0, hunch, 1.08 * s, 0.12 * s, o.head || faceOf(o.skin)));
    if (o.hair) out.push(el(0, hunch - 0.025 * s, 1.13 * s, 0.128 * s, 0.11 * s, 0.085 * s, o.hair));
    if (o.eyes) out.push(sph(-0.05 * s, hunch + 0.1 * s, 1.1 * s, pmin(P, 0.025), o.eyes), sph(0.05 * s, hunch + 0.1 * s, 1.1 * s, pmin(P, 0.025), o.eyes));
    return out;
  }
  HF.human = human;
  // голова — (O), туловище — [#]: символ выбирается по тому, куда смотрит поверхность
  const shapeCache = new Map();
  function faceOf(m) { if (!m || m.cs === CS.player) return m; let r = shapeCache.get(m); if (!r) { r = [Object.assign({}, m, { cs: CS.face, nt: 1, tex: null }), Object.assign({}, m, { cs: CS.body, nt: 1 })]; shapeCache.set(m, r); } return r[0]; }
  function bodyOf(m) { if (!m || m.cs === CS.metal || m.cs === CS.bone || m.cs === CS.bark || m.cs === CS.scale || m.cs === CS.fur) return m; let r = shapeCache.get(m); if (!r) { r = [Object.assign({}, m, { cs: CS.face, nt: 1, tex: null }), Object.assign({}, m, { cs: CS.body, nt: 1 })]; shapeCache.set(m, r); } return r[1]; }
  const HAIR = ['#3a2416', '#1a1410', '#a87a40', '#6a4a2a', '#c8a060'];
  // принадлежности: шапка, капюшон, шлем, корона, копьё, молот, посох, лук, удочка, книга, мешок, клюка, лютня
  function gear(out, P, kind, s, x) {
    x = x || {};
    switch (kind) {
      case 'hat': out.push(disc(0, 0, 1.2 * s, 0.22 * s, 0.17 * s, mat('#d8c070', 'thatchS')), el(0, 0, 1.24 * s, 0.1 * s, 0.09 * s, 0.07 * s, mat('#c8b060', 'thatchS'))); break;
      case 'hood': out.push(el(0, -0.02 * s, 1.1 * s, 0.15 * s, 0.14 * s, 0.15 * s, x.m)); break;
      case 'helm': out.push(el(0, -0.01 * s, 1.14 * s, 0.135 * s, 0.13 * s, 0.1 * s, METAL), box(-0.012 * s, 0.1 * s, 1.03 * s, 0.012 * s, 0.13 * s, 1.15 * s, METAL)); break;
      case 'crown': for (let q = 0; q < 5; q++) out.push(sph(-0.1 * s + q * 0.05 * s, 0.02 * s, 1.22 * s, pmin(P, 0.03 * s), GOLD)); break;
      case 'spear': limb(out, P, 0.27 * s, 0.02, 0, 0.27 * s, 0.02, 1.55 * s, 0.022, 0.022, DWOOD); out.push(cone(0.27 * s, 0.02, 1.55 * s, pmin(P, 0.04), 0.16 * s, METAL)); break;
      case 'hammer': limb(out, P, 0.24 * s, 0.05, 0.55 * s, 0.32 * s, 0.05, 0.95 * s, 0.02, 0.02, DWOOD); out.push(box(0.26 * s, 0.0, 0.92 * s, 0.4 * s, 0.1, 1.02 * s, METAL)); break;
      case 'staff': limb(out, P, 0.26 * s, 0.03, 0, 0.26 * s, 0.03, 1.4 * s, 0.022, 0.02, DWOOD); out.push(sph(0.26 * s, 0.03, 1.45 * s, pmin(P, 0.05), mat(x.orb || '#a0c0ff', 'glow', { em: 1.4, fl: F.NOSHADOW }))); break;
      case 'bow': for (let q = 0; q <= 6; q++) { const a = (q / 6 - 0.5) * 2.2; out.push(sph(0.28 * s + Math.cos(a) * 0.06, 0.04, 0.78 * s + Math.sin(a) * 0.32 * s, pmin(P, 0.02), DWOOD)); } break;
      case 'rod': limb(out, P, 0.22 * s, 0.05, 0.55 * s, 0.6 * s, 0.1, 1.45 * s, 0.018, 0.012, DWOOD); break;
      case 'book': out.push(box(0.18 * s, 0.08, 0.6 * s, 0.3 * s, 0.14, 0.72 * s, mat('#8a2a2a', 'book'))); break;
      case 'bag': out.push(el(0.27 * s, 0.03, 0.55 * s, 0.09 * s, 0.08 * s, 0.11 * s, mat('#8a6a40', 'cloth', { tex: clothTex }))); break;
      case 'cane': limb(out, P, 0.26 * s, 0.08, 0, 0.24 * s, 0.08, 0.62 * s, 0.02, 0.02, DWOOD); break;
      case 'lute': out.push(el(0.05 * s, 0.13 * s, 0.68 * s, 0.11 * s, 0.05 * s, 0.13 * s, mat('#a87040', 'wood'))); limb(out, P, 0.1 * s, 0.13 * s, 0.78 * s, 0.3 * s, 0.13 * s, 0.98 * s, 0.018, 0.015, DWOOD); break;
      case 'flask': out.push(el(0.27 * s, 0.08, 0.58 * s, 0.05 * s, 0.05 * s, 0.07 * s, mat('#7ad0a0', 'glass', { em: 0.6, sp: 1 }))); break;
      case 'bowl': out.push(el(0.25 * s, 0.12, 0.5 * s, 0.08 * s, 0.06 * s, 0.03 * s, mat('#8a6a40', 'wood'))); break;
      case 'sword': limb(out, P, 0.25 * s, 0.08, 0.5 * s, 0.25 * s, 0.08, 1.05 * s, 0.018, 0.012, METAL); break;
      case 'club': limb(out, P, 0.3 * s, 0.08, 0.4 * s, 0.38 * s, 0.1, 1.0 * s, 0.03, 0.07, DWOOD); break;
      case 'trident': limb(out, P, 0.27 * s, 0.02, 0, 0.27 * s, 0.02, 1.45 * s, 0.022, 0.02, METAL); for (const dx of [-0.07, 0, 0.07]) out.push(cone(0.27 * s + dx, 0.02, 1.45 * s, pmin(P, 0.025), 0.15 * s, METAL)); break;
      case 'note': { const k = (x.f || 0) % 8; out.push(sph(0.15 * s + Math.sin(k) * 0.05, 0, 1.45 * s + k * 0.03, pmin(P, 0.04), mat('#f0d060', 'glow', { em: 1, fl: F.NOSHADOW }))); break; }
      case 'cape': out.push(el(0, -0.11 * s, 0.7 * s, 0.17 * s, 0.05 * s, 0.32 * s, x.m)); break;
      case 'ring': out.push(disc(0, 0, 0.005, 0.36, 0.2, mat(x.c || '#f0d080', 'glow', { em: 0.9, a: 0.55, fl: F.NOSHADOW }))); break;
    }
  }
  // житель: из ключа рисунка — одежда, принадлежности, рост
  const JOBGEAR = {
    npc_guard: { gear: ['helm', 'spear'], cloth: '#7a8a9a', pants: '#3a3a44' }, npc_hood: { gear: ['hood'], robe: 1 }, npc_mage: { gear: ['hood', 'staff'], robe: 1 },
    npc_smith: { gear: ['hammer'], bulky: 1.15, apron: 1 }, npc_hat: { gear: ['hat'] }, npc_fisher: { gear: ['hat', 'rod'] }, npc_hunter: { gear: ['bow', 'cape'] },
    npc_trader: { gear: ['bag'] }, npc_noble: { gear: ['crown', 'cape'] }, npc_bard: { gear: ['lute', 'note'] }, npc_beggar: { gear: ['bowl'], hunch: 0.08 },
    npc_scholar: { gear: ['book'], robe: 1 }, npc_healer: { gear: ['flask'] }, npc_wander: { gear: ['hood', 'cane'] }, npc_elder: { gear: ['cane'], hunch: 0.06, grey: 1 },
    npc_f: { robe: 1 }, npc_m: {}, npc_child: { scale: 0.68 },
  };
  for (const key in JOBGEAR) {
    MD[key] = (o, P) => {
      const j = JOBGEAR[key], s = j.scale || 1;
      const cc = colOf(o, '#b89878'), cloth = mat(cc, 'cloth', { tex: clothTex }), pants = mat(j.pants || shadeC(C(cc), 0.55), 'cloth');
      const hairC = j.grey ? '#d0d0d0' : HAIR[(o.seed || cc.charCodeAt(2)) % HAIR.length];
      const prims = human({ cloth: j.cloth ? mat(j.cloth, 'metal', { sp: 0.4 }) : cloth, pants, skin: mat(SKIN, 'skin'), hair: j.gear && (j.gear.includes('hood') || j.gear.includes('helm')) ? null : mat(hairC, 'hair'), frame: o.f, moving: o.moving, robe: j.robe, hunch: j.hunch, bulky: j.bulky }, P, s);
      if (j.apron) prims.push(el(0, 0.06 * s, 0.62 * s, 0.13 * s, 0.05 * s, 0.2 * s, mat('#6a4a30', 'cloth')));
      for (const g of j.gear || []) gear(prims, P, g, s, { m: mat(shadeC(C(cc), 0.8), 'cloth', { tex: clothTex }), f: o.f });
      return wrap(key + '|' + cc + '|' + (o.moving ? o.f % 4 : 0) + (key === 'npc_bard' ? '|' + (o.f % 8) : '') + '|' + P.level, prims, o);
    };
  }
  MD.player = (o, P) => {
    const cc = colOf(o, '#c8a060');
    const prims = human({ cloth: mat(cc, 'cloth', { tex: clothTex }), pants: mat('#3a3028', 'cloth'), skin: mat(SKIN, 'skin'), head: mat('#fff0d0', 'player', { em: 0.15 }), hair: null, frame: o.f, moving: o.moving }, P, 1);
    gear(prims, P, 'cape', 1, { m: mat(shadeC(C(cc), 0.6), 'cloth', { tex: clothTex }) });
    gear(prims, P, 'ring', 1, { c: o.ring || '#f0d080' });
    return wrap('player|' + cc + '|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, prims, o);
  };

  // ============================================================
  // ЗВЕРИ: четвероногие, птицы, гады, насекомые
  // ============================================================
  // четвероногое, смотрит на восток; q: { len, h, w, body, belly, head, ears, tail, extras }
  function quad(o, P, q) {
    const out = [], L = q.len, Hh = q.h, Wd = q.w || 0.16;
    const ph = (o.f || 0) % 4, walk = o.moving ? Math.sin(ph * Math.PI / 2) : 0;
    const B = mat(q.body, q.cs || 'fur', { tex: furTex }), Bl = mat(q.belly || q.body, q.cs || 'fur'), Hd = mat(q.headc || q.body, q.cs || 'fur', { tex: furTex });
    const bz = Hh * 0.62;
    out.push(el(0, 0, bz, L * 0.5, Wd, Hh * 0.22 * (q.fat || 1), B));
    out.push(el(0, 0.02, bz - Hh * 0.08, L * 0.38, Wd * 0.8, Hh * 0.12, Bl));
    // ноги
    const legR = q.legR || 0.045;
    for (const [lx, ly, phs] of [[L * 0.32, Wd * 0.6, 1], [L * 0.32, -Wd * 0.6, -1], [-L * 0.32, Wd * 0.6, -1], [-L * 0.32, -Wd * 0.6, 1]]) {
      const st = walk * phs * L * 0.12;
      limb(out, P, lx, ly, bz - Hh * 0.1, lx + st, ly, 0.03, legR, legR * 0.8, mat(q.legc || shadeC(q.body, 0.8), q.cs || 'fur'));
    }
    // голова и морда
    const hx = L * 0.55, hz = bz + Hh * (q.headUp || 0.18);
    out.push(sph(hx, 0, hz, q.headR || 0.11, Hd));
    if (q.snout) out.push(el(hx + (q.headR || 0.11) * 0.9, 0, hz - 0.03, q.snout, q.snout * 0.6, q.snout * 0.55, Hd));
    if (q.ears === 'up') out.push(cone(hx - 0.03, -0.05, hz + 0.06, pmin(P, 0.04), 0.1, Hd), cone(hx - 0.03, 0.05, hz + 0.06, pmin(P, 0.04), 0.1, Hd));
    if (q.ears === 'long') { limb(out, P, hx - 0.02, -0.03, hz + 0.05, hx - 0.06, -0.04, hz + 0.3, 0.03, 0.025, Hd); limb(out, P, hx - 0.02, 0.03, hz + 0.05, hx - 0.06, 0.04, hz + 0.3, 0.03, 0.025, Hd); }
    if (q.ears === 'round') out.push(sph(hx - 0.04, -0.07, hz + 0.08, pmin(P, 0.04), Hd), sph(hx - 0.04, 0.07, hz + 0.08, pmin(P, 0.04), Hd));
    out.push(sph(hx + (q.headR || 0.11) * 0.6, 0.06, hz + 0.03, pmin(P, 0.022), mat(q.eye || '#1a1410', q.eye ? 'eye' : 'dark', q.eye ? { em: 1.2 } : {})));
    // хвост
    if (q.tail === 'bushy') out.push(el(-L * 0.62, 0, bz + 0.05, 0.14, 0.07, 0.07, mat(q.tailc || q.body, 'fur', { tex: furTex })));
    else if (q.tail === 'thin') limb(out, P, -L * 0.48, 0, bz, -L * 0.75, 0, bz + 0.12, 0.025, 0.015, B);
    else if (q.tail === 'puff') out.push(sph(-L * 0.52, 0, bz + 0.04, pmin(P, 0.05), mat('#f0f0f0', 'fur')));
    else if (q.tail === 'long') limb(out, P, -L * 0.48, 0, bz - 0.04, -L * 1.05, 0.02, 0.06, 0.06, 0.02, B);
    // особое
    if (q.antlers) for (const sy of [-1, 1]) { limb(out, P, hx - 0.03, sy * 0.05, hz + 0.08, hx - 0.1, sy * 0.15, hz + 0.38, 0.02, 0.015, mat('#c8b090', 'bone')); limb(out, P, hx - 0.08, sy * 0.1, hz + 0.25, hx + 0.05, sy * 0.18, hz + 0.36, 0.015, 0.012, mat('#c8b090', 'bone')); }
    if (q.tusks) for (const sy of [-1, 1]) limb(out, P, hx + 0.08, sy * 0.04, hz - 0.06, hx + 0.2 * q.tusks, sy * 0.06, hz - 0.02 + 0.08 * q.tusks, 0.02, 0.015, mat('#f0ece0', 'bone'));
    if (q.trunk) limb(out, P, hx + 0.1, 0, hz - 0.05, hx + 0.2, 0.03, 0.08, 0.05, 0.03, Hd);
    if (q.mane) out.push(el(hx - 0.1, 0, hz + 0.02, 0.12, 0.09, 0.13, mat(q.mane, 'fur', { tex: furTex, em: q.maneEm || 0 })));
    if (q.wings) { const fl = Math.sin((o.f || 0) * 1.3) * 0.15; out.push(el(-0.05, -0.18, bz + 0.22 + fl, 0.22, 0.14, 0.03, mat(shadeC(q.body, 0.85), 'wing')), el(-0.05, 0.18, bz + 0.22 + fl, 0.22, 0.14, 0.03, mat(shadeC(q.body, 0.85), 'wing'))); }
    return out;
  }
  const QUADS = {
    m_wolf: { len: 0.72, h: 0.62, body: '#8a8a8a', belly: '#c8c8c8', snout: 0.07, ears: 'up', tail: 'bushy' },
    m_fox: { len: 0.56, h: 0.45, w: 0.12, body: '#d8763a', belly: '#f0e8e0', snout: 0.06, ears: 'up', tail: 'bushy', tailc: '#e88a4a', headR: 0.09 },
    m_beast: { len: 0.72, h: 0.62, body: '#8a6a5a', snout: 0.07, ears: 'up', tail: 'bushy' },
    m_deer: { len: 0.7, h: 0.95, w: 0.13, body: '#a07a4a', belly: '#e0d0b0', snout: 0.06, ears: 'up', tail: 'puff', antlers: 1, headUp: 0.42, legR: 0.03 },
    m_boar: { len: 0.66, h: 0.55, w: 0.18, body: '#5a4232', snout: 0.08, ears: 'up', tail: 'thin', tusks: 1, mane: '#3a2a1e', fat: 1.2, headUp: 0.04 },
    m_bear: { len: 0.82, h: 0.8, w: 0.24, body: '#6a4a2e', snout: 0.08, ears: 'round', tail: 'puff', fat: 1.3, headR: 0.15, legR: 0.08 },
    m_mammoth: { len: 1.1, h: 1.35, w: 0.32, body: '#7a5a3e', snout: 0.0, ears: 'round', tail: 'thin', tusks: 1.6, trunk: 1, fat: 1.4, headR: 0.22, legR: 0.11 },
    m_croc: { len: 1.1, h: 0.28, w: 0.16, body: '#4a6a32', belly: '#a0a070', snout: 0.16, tail: 'long', cs: 'scale', headUp: 0, headR: 0.09, legR: 0.04 },
    m_lizard: { len: 0.6, h: 0.25, w: 0.1, body: '#e0602a', snout: 0.08, tail: 'long', cs: 'scale', headUp: 0, headR: 0.07, legR: 0.03, eye: '#ffe060' },
    m_dragonling: { len: 0.6, h: 0.45, w: 0.12, body: '#e07a3a', snout: 0.08, tail: 'long', cs: 'scale', wings: 1, ears: 'up', eye: '#ffe060' },
    m_nightmare: { len: 0.85, h: 0.95, w: 0.16, body: '#1e1428', snout: 0.1, ears: 'up', tail: 'long', mane: '#a040ff', maneEm: 1.2, headUp: 0.4, eye: '#ff4060' },
    m_hare: { len: 0.32, h: 0.32, w: 0.1, body: '#b8a080', belly: '#f0e8d8', snout: 0.03, ears: 'long', tail: 'puff', headR: 0.07, fat: 1.3, legR: 0.03 },
  };
  for (const key in QUADS) {
    MD[key] = (o, P) => {
      const q = Object.assign({}, QUADS[key]);
      const c = colOf(o, null);
      q.body = C(c && key !== 'm_hare' && key !== 'm_fox' && key !== 'm_deer' ? c : q.body);
      if (q.belly) q.belly = C(q.belly);
      if (key === 'm_wolf' && c && /^#[ef]/i.test(c) && c !== '#e04040') q.belly = C('#ffffff');
      if (c === '#ff3030' || c === '#e04040') q.eye = '#ff2020';
      if (c === '#ffe080') { q.mane = '#fff0a0'; q.maneEm = 1; q.eye = '#ffffff'; }
      return wrap(key + '|' + (c || '') + '|' + (o.moving ? o.f % 4 : 0) + (q.wings ? '|' + (o.f % 6) : '') + '|' + P.level, quad(o, P, q), o);
    };
  }
  MD.m_rat = (o, P) => { const out = [el(0, 0, 0.08, 0.13, 0.07, 0.07, mat(colOf(o, '#8a7a6a'), 'fur', { tex: furTex })), sph(0.14, 0, 0.09, pmin(P, 0.05), mat(colOf(o, '#8a7a6a'), 'fur'))]; limb(out, P, -0.12, 0, 0.06, -0.32, 0.02, 0.02, 0.015, 0.01, mat('#c8a0a0', 'fur')); return wrap('rat|' + P.level, out, o); };
  function flyer(o, P, body, wingc, s, head) {
    const f = (o.f || 0) % 4, up = [0.18, 0.06, -0.08, 0.06][f], out = [];
    const z = 0.75;
    out.push(el(0, 0, z, 0.1 * s, 0.07 * s, 0.08 * s, mat(body, 'fur', { tex: furTex })));
    out.push(sph(0.1 * s, 0, z + 0.05 * s, pmin(P, 0.06 * s), mat(head || body, head ? 'skin' : 'fur')));
    for (const sy of [-1, 1]) out.push(el(-0.02, sy * 0.22 * s, z + up * s, 0.12 * s, 0.2 * s, 0.025, mat(wingc, 'wing')));
    out.push(disc(0, 0, 0.01, 0.15 * s, 0.08 * s, mat('#000000', 'dark', { a: 0.35, fl: F.NOSHADOW })));
    return out;
  }
  MD.m_bat = (o, P) => wrap('bat|' + o.f % 4 + '|' + P.level, flyer(o, P, C('#4a3a4a'), C('#2a202a'), 0.8), o);
  MD.m_eagle = (o, P) => wrap('eagle|' + o.f % 4 + '|' + P.level, flyer(o, P, C('#8a6a4a'), C('#6a4e34'), 1.2, C('#f0f0f0')), o);
  MD.m_harpy = (o, P) => wrap('harpy|' + o.f % 4 + '|' + P.level, flyer(o, P, C('#a08090'), C('#c0a0b0'), 1.3, SKIN), o);
  MD.m_fish = (o, P) => { const f = (o.f || 0) % 4, out = [el(0, 0, 0.6 + f * 0.02, 0.18, 0.06, 0.08, mat('#c0b0ff', 'scale', { sp: 0.8, em: 0.2 })), cone(-0.2, 0, 0.55, pmin(P, 0.07), 0.12, mat('#9a8ae0', 'scale'))]; return wrap('fish|' + f + '|' + P.level, out, o); };
  function snake(o, P, c, seg, r, rise) {
    const f = (o.f || 0) % 8, out = [], M = mat(c, 'scale', { tex: furTex, sp: 0.4 });
    for (let q = 0; q < seg; q++) { const t = q / seg; out.push(sph(0.35 - t * 0.7, Math.sin(t * 6 + f * 0.8) * 0.1, r + (rise ? (1 - t) * rise : 0), pmin(P, r * (1 - t * 0.5)), M)); }
    out.push(sph(0.4, Math.sin(f * 0.8) * 0.1, r * 1.2 + (rise || 0), pmin(P, r * 1.3), M));
    return out;
  }
  MD.m_snake = (o, P) => wrap('snake|' + (o.f % 8) + '|' + P.level, snake(o, P, C(colOf(o, '#7aa04a')), 10, 0.045, 0), o);
  MD.m_leech = (o, P) => wrap('leech|' + (o.f % 8) + '|' + P.level, snake(o, P, C('#5a2a2a'), 5, 0.04, 0), o);
  MD.m_worm = (o, P) => {
    const out = [], M = mat('#b8905a', 'scale', { tex: furTex });
    for (let q = 0; q < 6; q++) out.push(sph(0, 0.05 * Math.sin(q + (o.f || 0) * 0.4), 0.15 + q * 0.17, 0.2 - q * 0.012, M));
    out.push(disc(0, 0.06, 1.12, 0.14, 0.08, mat('#3a0a0a', 'dark')));
    for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2; out.push(cone(Math.cos(ang) * 0.13, 0.06 + Math.sin(ang) * 0.08, 1.08, pmin(P, 0.025), 0.08, mat('#f0ece0', 'bone'))); }
    return wrap('worm|' + ((o.f || 0) % 8) + '|' + P.level, out, o);
  };
  function spider(o, P, c, s, eyes) {
    const out = [], M = mat(c, 'fur', { tex: furTex }), f = (o.f || 0) % 4;
    out.push(el(-0.12 * s, 0, 0.18 * s, 0.17 * s, 0.14 * s, 0.13 * s, M), sph(0.1 * s, 0, 0.15 * s, 0.09 * s, M));
    for (let q = 0; q < 4; q++) for (const sy of [-1, 1]) {
      const ax = 0.08 * s - q * 0.06 * s, mid = [ax + (q < 2 ? 0.1 : -0.1) * s, sy * 0.25 * s, 0.3 * s], st = (o.moving ? Math.sin(f * 1.57 + q) * 0.04 : 0) * s;
      limb(out, P, ax, sy * 0.06 * s, 0.15 * s, mid[0], mid[1], mid[2], 0.022 * s, 0.02 * s, M);
      limb(out, P, mid[0], mid[1], mid[2], mid[0] + (q < 2 ? 0.08 : -0.08) * s + st, sy * 0.36 * s, 0.01, 0.02 * s, 0.015 * s, M);
    }
    out.push(sph(0.17 * s, -0.035, 0.18 * s, pmin(P, 0.022), mat(eyes || '#ff3030', 'eye', { em: 1.4 })), sph(0.17 * s, 0.035, 0.18 * s, pmin(P, 0.022), mat(eyes || '#ff3030', 'eye', { em: 1.4 })));
    return out;
  }
  MD.m_spider = (o, P) => wrap('spider|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, spider(o, P, C('#4a3a5a'), 1), o);
  MD.m_crawler = (o, P) => wrap('crawler|' + (o.moving ? o.f % 4 : 0) + '|' + (o.c || '') + '|' + P.level, spider(o, P, C(colOf(o, '#9a9080')), 1.4, '#e0e0ff'), o);
  MD.m_scorpion = (o, P) => {
    const out = spider(o, P, C('#c8a050'), 0.8, '#202020'), M = mat('#c8a050', 'scale', { sp: 0.5 });
    for (let q = 0; q < 6; q++) { const a = q / 6 * Math.PI * 0.9; out.push(sph(-0.25 - Math.sin(a) * 0.15, 0, 0.12 + (1 - Math.cos(a)) * 0.2, pmin(P, 0.04 - q * 0.003), M)); }
    out.push(cone(-0.3, 0, 0.5, pmin(P, 0.03), 0.08, mat('#ffe060', 'metal')));
    for (const sy of [-1, 1]) out.push(el(0.28, sy * 0.12, 0.1, 0.08, 0.05, 0.04, M));
    return wrap('scorp|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o);
  };
  MD.m_crab = (o, P) => {
    const M = mat('#d86a4a', 'scale', { sp: 0.5, tex: furTex }), out = [el(0, 0, 0.12, 0.2, 0.14, 0.1, M)];
    for (const sy of [-1, 1]) { out.push(el(0.12, sy * 0.2, 0.18, 0.08, 0.06, 0.05, M)); for (let q = 0; q < 3; q++) limb(out, P, -0.05 + q * 0.06, sy * 0.1, 0.1, -0.08 + q * 0.06, sy * 0.25, 0.01, 0.02, 0.015, M); }
    out.push(sph(0.15, -0.05, 0.22, pmin(P, 0.02), mat('#101010', 'eye')), sph(0.15, 0.05, 0.22, pmin(P, 0.02), mat('#101010', 'eye')));
    return wrap('crab|' + P.level, out, o);
  };

  // ============================================================
  // НЕЧИСТЬ И ЧУДОВИЩА
  // ============================================================
  const human2 = (o, P, s, m) => { const out = human(Object.assign({ frame: o.f, moving: o.moving }, m), P, s); return out; };
  MD.m_bandit = (o, P) => { const c = colOf(o, '#c86a4a'); const out = human2(o, P, 1, { cloth: mat(c, 'cloth', { tex: clothTex }), pants: mat('#3a2a1e', 'cloth'), skin: mat(SKIN, 'skin') }); gear(out, P, 'hood', 1, { m: mat(shadeC(C(c), 0.6), 'cloth') }); gear(out, P, 'sword', 1); return wrap('bandit|' + c + '|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_archer = (o, P) => { const c = colOf(o, '#c88a4a'); const out = human2(o, P, 1, { cloth: mat(c, 'cloth', { tex: clothTex }), pants: mat('#3a2a1e', 'cloth'), skin: mat(SKIN, 'skin'), hair: mat('#3a2416', 'hair') }); gear(out, P, 'bow', 1); gear(out, P, 'cape', 1, { m: mat('#4a3a20', 'cloth') }); return wrap('archer|' + c + '|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_cultist = (o, P) => { const out = human2(o, P, 1, { cloth: mat('#6a2a5a', 'cloth', { tex: clothTex }), pants: mat('#2a1028', 'cloth'), skin: mat(SKIN, 'skin'), robe: 1 }); gear(out, P, 'hood', 1, { m: mat('#4a1a40', 'cloth') }); gear(out, P, 'staff', 1, { orb: '#ff40a0' }); return wrap('cult|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_soldier = (o, P) => { const c = colOf(o, '#a0a8b8'); const out = human2(o, P, 1.05, { cloth: mat(c, 'metal', { sp: 0.6, tex: texNoise(0.1, 0.2, 12, 51) }), pants: mat('#3a3a44', 'cloth'), skin: mat(SKIN, 'skin') }); gear(out, P, 'helm', 1.05); gear(out, P, 'spear', 1.05); out.push(el(-0.24, 0.06, 0.7, 0.03, 0.12, 0.17, mat('#7a2a2a', 'metal'))); return wrap('soldier|' + c + '|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_zombie = (o, P) => { const c = colOf(o, '#7a9a6a'); const out = human2(o, P, 1, { cloth: mat('#4a4a3a', 'cloth', { tex: texNoise(0.3, 0.5, 9, 53) }), pants: mat('#3a3428', 'cloth'), skin: mat(c, 'skin', { tex: texNoise(0.2, 0.3, 9, 55) }), armsFwd: 1, hunch: 0.06, eyes: mat('#e0e060', 'eye', { em: 0.8 }) }); return wrap('zombie|' + c + '|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_skeleton = (o, P) => {
    const Bn = mat(colOf(o, '#d8d0b8'), 'bone', { tex: (x, y, z, mo) => { mo.t = Math.abs(Math.sin(z * 50)); if (z > 0.6 && z < 0.95 && Math.abs(Math.sin(z * 50)) < 0.3) { mo.r *= 0.35; mo.g *= 0.35; mo.b *= 0.35; } } });
    const out = human2(o, P, 1, { cloth: Bn, pants: Bn, skin: Bn, eyes: mat('#ff6040', 'eye', { em: 1.2 }) });
    return wrap('skel|' + (o.c || '') + '|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out.map((p) => (p.t === 'e' && p.rx > 0.1 ? Object.assign({}, p, { rx: p.rx * 0.7, ry: p.ry * 0.7 }) : p)), o);
  };
  MD.m_ghoul = (o, P) => { const out = human2(o, P, 0.95, { cloth: mat('#4a3a44', 'cloth'), pants: mat('#2a2028', 'cloth'), skin: mat(colOf(o, '#8a6a7a'), 'skin'), hunch: 0.12, armsFwd: 1, eyes: mat('#ff3030', 'eye', { em: 1.4 }) }); return wrap('ghoul|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_barrow = (o, P) => { const out = MD.m_skeleton(Object.assign({}, o, { hit: false, mode: 0 }), P).prims.slice(); gear(out, P, 'crown', 1); gear(out, P, 'sword', 1); gear(out, P, 'cape', 1, { m: mat('#3a2a4a', 'cloth') }); return wrap('barrow|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  function ghost(o, P, c, s) {
    const f = (o.f || 0) % 8, bob = Math.sin(f * 0.8) * 0.05, M = mat(c, 'ghost', { a: 0.7, em: 0.45, fl: F.NOSHADOW });
    const out = [el(0, 0, 0.85 * s + bob, 0.2 * s, 0.16 * s, 0.24 * s, M)];
    for (let q = 0; q < 4; q++) out.push(sph(Math.sin(f * 0.7 + q) * 0.04, 0, (0.6 - q * 0.13) * s + bob, pmin(P, (0.16 - q * 0.03) * s), M));
    out.push(sph(-0.07 * s, 0.17 * s, 0.9 * s + bob, pmin(P, 0.035), mat('#0a0a14', 'dark', { fl: F.NOSHADOW })), sph(0.07 * s, 0.17 * s, 0.9 * s + bob, pmin(P, 0.035), mat('#0a0a14', 'dark', { fl: F.NOSHADOW })));
    return out;
  }
  MD.m_ghost = (o, P) => wrap('ghost|' + (o.c || '') + '|' + (o.f % 8) + '|' + P.level, ghost(o, P, C(colOf(o, '#b0d0e0')), 1), o);
  MD.m_slime = (o, P) => { const f = (o.f || 0) % 4, w = [1, 1.06, 1, 0.94][f], M = mat(colOf(o, '#7ac05a'), 'ghost', { sp: 1, a: 0.85, em: 0.15 }); return wrap('slime|' + (o.c || '') + '|' + f + '|' + P.level, [el(0, 0, 0.16 / w, 0.24 * w, 0.2 * w, 0.17 / w, M), sph(-0.07, 0.17, 0.2, pmin(P, 0.03), mat('#101010', 'eye')), sph(0.07, 0.17, 0.2, pmin(P, 0.03), mat('#101010', 'eye'))], o); };
  MD.m_blob = (o, P) => { const M = mat(colOf(o, '#e0a0a0'), 'ghost', { sp: 0.8, tex: texNoise(0.2, 0.6, 9, 61) }), out = [el(0, 0, 0.25, 0.26, 0.22, 0.24, M)]; for (let a = 0; a < 8; a++) { const ang = a / 8 * Math.PI * 2; out.push(cone(Math.cos(ang) * 0.24, Math.sin(ang) * 0.2, 0.15, pmin(P, 0.04), 0.18, M)); } return wrap('blob|' + P.level, out, o); };
  MD.m_golem = (o, P) => {
    const c = C(colOf(o, '#9a9a8a')), S = mat(c, 'stone', { tex: stoneTex }), ph = (o.f || 0) % 4, wk = o.moving ? Math.sin(ph * 1.57) * 0.08 : 0, E2 = mat(c[2] > c[0] ? '#a0e0ff' : '#ffa040', 'eye', { em: 1.5 });
    const out = [box(-0.24, -0.15, 0.45, 0.24, 0.15, 1.0, S), box(-0.13, -0.12, 1.0, 0.13, 0.12, 1.22, S), box(-0.38, -0.1 + wk, 0.45, -0.26, 0.1 + wk, 0.95, S), box(0.26, -0.1 - wk, 0.45, 0.38, 0.1 - wk, 0.95, S), box(-0.2, -0.1 + wk, 0, -0.06, 0.1 + wk, 0.45, S), box(0.06, -0.1 - wk, 0, 0.2, 0.1 - wk, 0.45, S), box(-0.08, 0.12, 1.1, -0.03, 0.125, 1.14, E2), box(0.03, 0.12, 1.1, 0.08, 0.125, 1.14, E2)];
    return wrap('golem|' + (o.c || '') + '|' + (o.moving ? ph : 0) + '|' + P.level, out, o);
  };
  MD.m_troll = (o, P) => { const out = human2(o, P, 1.4, { cloth: mat('#5a4a32', 'fur', { tex: furTex }), pants: mat('#3a3020', 'fur'), skin: mat(colOf(o, '#6a8a5a'), 'skin', { tex: texNoise(0.2, 0.4, 7, 63) }), hunch: 0.1, bulky: 1.25, eyes: mat('#ffe060', 'eye', { em: 1 }) }); gear(out, P, 'club', 1.4); return wrap('troll|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_imp = (o, P) => { const out = human2(o, P, 0.62, { cloth: mat('#c03a2a', 'skin'), pants: mat('#8a2a1a', 'skin'), skin: mat(colOf(o, '#e05a3a'), 'skin'), eyes: mat('#ffe060', 'eye', { em: 1.4 }) }); out.push(cone(-0.05, 0, 0.75, pmin(P, 0.02), 0.08, mat('#2a1a1a', 'bone')), cone(0.05, 0, 0.75, pmin(P, 0.02), 0.08, mat('#2a1a1a', 'bone'))); const fl = Math.sin((o.f || 0) * 1.4) * 0.08; out.push(el(0, -0.16, 0.55 + fl, 0.2, 0.05, 0.12, mat('#7a1a1a', 'wing'))); return wrap('imp|' + (o.f % 4) + '|' + P.level, out, o); };
  MD.m_hag = (o, P) => { const out = human2(o, P, 0.95, { cloth: mat('#4a5a3a', 'cloth', { tex: clothTex }), pants: mat('#2a3020', 'cloth'), skin: mat(colOf(o, '#7a9a7a'), 'skin'), robe: 1, hunch: 0.1, hair: mat('#3a5a2a', 'hair'), eyes: mat('#c0ff60', 'eye', { em: 1 }) }); out.push(el(0, -0.04, 0.95, 0.2, 0.12, 0.2, mat('#3a5a2a', 'hair', { tex: furTex }))); return wrap('hag|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_leshy = (o, P) => { const out = human2(o, P, 1.25, { cloth: mat('#5a3e24', 'bark', { tex: barkTex }), pants: mat('#4a3018', 'bark', { tex: barkTex }), skin: mat('#6a4a2a', 'bark'), eyes: mat('#a0ff60', 'eye', { em: 1.4 }) }); out.push(el(0, 0, 1.55, 0.32, 0.26, 0.22, mat('#3e6a2c', 'leaf', { tex: leafTex(65) }))); for (const sx of [-1, 1]) limb(out, P, sx * 0.08, 0, 1.4, sx * 0.3, 0, 1.75, 0.025, 0.015, BARK); return wrap('leshy|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_treant = (o, P) => { const out = human2(o, P, 1.6, { cloth: mat('#5a3e24', 'bark', { tex: barkTex }), pants: mat('#4a3018', 'bark', { tex: barkTex }), skin: mat('#6a4a2a', 'bark'), bulky: 1.4, eyes: mat('#ffe060', 'eye', { em: 1.4 }) }); out.push(el(0, 0, 2.0, 0.5, 0.42, 0.4, mat('#3e6a2c', 'leaf', { tex: leafTex(67) }))); return wrap('treant|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_fishman = (o, P) => { const out = human2(o, P, 1, { cloth: mat(colOf(o, '#3a8a9a'), 'scale', { sp: 0.6, tex: furTex }), pants: mat('#2a5a6a', 'scale'), skin: mat(colOf(o, '#3a8a9a'), 'scale', { sp: 0.6 }), eyes: mat('#ffffff', 'eye', { em: 0.8 }) }); out.push(el(0, -0.05, 1.18, 0.02, 0.12, 0.08, mat('#2a6a7a', 'wing'))); return wrap('fishman|' + (o.c || '') + '|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_trident = (o, P) => { const out = MD.m_fishman(Object.assign({}, o, { mode: 0, hit: false }), P).prims.slice(); gear(out, P, 'trident', 1); return wrap('trident|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_shroom = (o, P) => { const out = human2(o, P, 0.9, { cloth: mat('#e0d0c0', 'bone'), pants: mat('#c0b0a0', 'bone'), skin: mat('#e0d0c0', 'bone') }); out.push(el(0, 0, 1.15, 0.28, 0.24, 0.12, mat(colOf(o, '#c07ad0'), 'cloth', { tex: (x, y, z, mo) => { if (vnoise(x * 9, y * 9, 69) > 0.72) { mo.r = 0.95; mo.g = 0.9; mo.b = 0.9; } } }))); return wrap('shroom|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_shroombig = (o, P) => { const out = human2(o, P, 1.3, { cloth: mat('#e0d0c0', 'bone'), pants: mat('#c0b0a0', 'bone'), skin: mat('#e0d0c0', 'bone'), bulky: 1.3 }); out.push(el(0, 0, 1.6, 0.48, 0.4, 0.2, mat(colOf(o, '#d08ae0'), 'cloth', { em: 0.15, tex: (x, y, z, mo) => { if (vnoise(x * 7, y * 7, 71) > 0.7) { mo.r = 0.95; mo.g = 0.9; mo.b = 0.9; } } }))); return wrap('shroombig|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_mimic = (o, P) => { const f = (o.f || 0) % 4, open = [0.05, 0.15, 0.25, 0.15][f]; const out = MD.chest({}, P).prims.filter((p) => p.t === 'b' && p.z1 <= 0.28); out.push(box(-0.3, -0.18, 0.28 + open, 0.3, 0.18, 0.4 + open, mat('#9a6a32', 'wood'))); for (let q = 0; q < 6; q++) out.push(cone(-0.25 + q * 0.1, 0.17, 0.28, pmin(P, 0.025), 0.05 + open * 0.3, mat('#f0ece0', 'bone'))); out.push(box(-0.12, -0.05, 0.27, 0.12, 0.15, 0.3, mat('#c03040', 'skin'))); return wrap('mimic|' + f + '|' + P.level, out, o); };
  MD.m_void = (o, P) => { const f = (o.f || 0) % 6, out = [sph(0, 0, 0.5, 0.22, mat('#0a0a18', 'dark', { a: 0.9 }))]; for (let q = 0; q < 6; q++) { const a = q + f * 0.5; out.push(sph(Math.cos(a) * 0.28, Math.sin(a) * 0.18, 0.5 + Math.sin(a * 1.7) * 0.15, pmin(P, 0.025), mat('#b0a0ff', 'star', { em: 1.6, fl: F.NOSHADOW }))); } return wrap('void|' + f + '|' + P.level, out, o); };
  MD.m_reflection = (o, P) => { const out = human(Object.assign({ frame: o.f, moving: o.moving }, { cloth: mat('#c0c8d8', 'cloth'), pants: mat('#8a90a0', 'cloth'), skin: mat('#d8e4f0', 'skin'), head: mat('#d8e4f0', 'player') }), P, 1); return wrap('refl|' + (o.c || '') + '|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, Object.assign({}, o, { mode: o.mode === 2 ? 2 : 5 })); };
  MD.m_wisp = (o, P) => { const f = (o.f || 0) % 6; return wrap('wisp|' + f + '|' + P.level, [sph(0, 0, 0.6 + Math.sin(f) * 0.05, pmin(P, 0.08), mat(colOf(o, '#f0d080'), 'glow', { em: 2, fl: F.NOSHADOW })), sph(-0.08, 0, 0.55, pmin(P, 0.04), mat('#f0d080', 'glow', { em: 1.2, a: 0.6, fl: F.NOSHADOW }))], o); };
  MD.m_herald = (o, P) => { const out = human2(o, P, 1.5, { cloth: mat('#5a1a30', 'cloth', { tex: clothTex }), pants: mat('#2a0a18', 'cloth'), skin: mat(colOf(o, '#a03060'), 'skin'), bulky: 1.2, eyes: mat('#ffe060', 'eye', { em: 1.6 }) }); for (const sx of [-1, 1]) limb(out, P, sx * 0.1, 0, 1.75, sx * 0.3, 0, 2.05, 0.04, 0.02, mat('#2a1a1a', 'bone')); return wrap('herald|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.m_thing = (o, P) => wrap('thing|' + (o.c || '') + '|' + P.level, [el(0, 0, 0.35, 0.25, 0.2, 0.3, mat(colOf(o, '#9a8aa0'), 'cloth', { tex: furTex })), sph(-0.07, 0.17, 0.45, pmin(P, 0.04), mat('#ffe060', 'eye', { em: 1.2 })), sph(0.07, 0.17, 0.45, pmin(P, 0.04), mat('#ffe060', 'eye', { em: 1.2 }))], o);

  // ============================================================
  // ВЕЛИКИЕ — крупные модели по природе
  // ============================================================
  const big = (prims, k) => prims.map((p) => {
    const q = Object.assign({}, p);
    if (q.t === 'e') { q.x *= k; q.y *= k; q.z *= k; q.rx *= k; q.ry *= k; q.rz *= k; }
    else if (q.t === 'b') { q.x0 *= k; q.x1 *= k; q.y0 *= k; q.y1 *= k; q.z0 *= k; q.z1 *= k; }
    else if (q.t === 'c') { q.x *= k; q.y *= k; q.z0 *= k; q.r *= k; q.h *= k; }
    else if (q.t === 'd') { q.x *= k; q.y *= k; q.z *= k; q.rx *= k; q.ry *= k; }
    return q;
  });
  const aura = (P, c) => disc(0, 0, 0.004, 0.9, 0.5, mat(c || '#ff2040', 'glow', { em: 1, a: 0.35, fl: F.NOSHADOW }));
  MD.b_dragon = (o, P) => { const q = Object.assign({}, QUADS.m_dragonling, { body: C(colOf(o, '#c04a2a')), len: 0.8 }); const out = big(quad(o, P, q), 2.1); out.push(aura(P, '#ff6020')); return wrap('bdragon|' + (o.c || '') + '|' + (o.f % 6) + '|' + P.level, out, o); };
  MD.b_beast = (o, P) => { const q = Object.assign({}, QUADS.m_bear, { body: C(colOf(o, '#5a3a2a')), eye: '#ff4020' }); const out = big(quad(o, P, q), 1.8); out.push(aura(P)); return wrap('bbeast|' + (o.c || '') + '|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.b_undead = (o, P) => { const out = big(MD.m_barrow(Object.assign({}, o, { mode: 0, hit: false }), P).prims, 1.6); out.push(aura(P, '#a040ff')); return wrap('bundead|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.b_spirit = (o, P) => { const out = big(ghost(o, P, C(colOf(o, '#a0e0f0')), 1), 2); out.push(aura(P, '#60e0ff')); return wrap('bspirit|' + (o.c || '') + '|' + (o.f % 8) + '|' + P.level, out, o); };
  MD.b_plant = (o, P) => { const out = big(MD.m_treant(Object.assign({}, o, { mode: 0, hit: false }), P).prims, 1.3); out.push(aura(P, '#60ff40')); return wrap('bplant|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.b_water = (o, P) => { const out = big(snake(o, P, C(colOf(o, '#2a7a9a')), 12, 0.08, 0.9), 1.8); out.push(aura(P, '#40a0ff')); return wrap('bwater|' + (o.c || '') + '|' + (o.f % 8) + '|' + P.level, out, o); };
  MD.b_stone = (o, P) => { const out = big(MD.m_golem(Object.assign({}, o, { mode: 0, hit: false }), P).prims, 1.7); out.push(aura(P, '#ffa040')); return wrap('bstone|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.b_god = (o, P) => { const out = big(human(Object.assign({ frame: o.f, moving: o.moving }, { cloth: mat(colOf(o, '#fff0c0'), 'cloth', { em: 0.6 }), pants: mat('#f0e0a0', 'cloth', { em: 0.5 }), skin: mat('#fff8e0', 'skin', { em: 0.8 }), robe: 1, eyes: mat('#ffffff', 'eye', { em: 2 }) }), P, 1), 1.6); out.push(disc(0, -0.2, 2.1, 0.35, 0.05, mat('#ffe060', 'glow', { em: 2, fl: F.NOSHADOW })), aura(P, '#ffe060')); return wrap('bgod|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.b_human = (o, P) => { const out = MD.m_soldier(Object.assign({}, o, { mode: 0, hit: false }), P).prims.slice(); gear(out, P, 'crown', 1.05); gear(out, P, 'cape', 1.05, { m: mat('#7a1a2a', 'cloth', { tex: clothTex }) }); const b2 = big(out, 1.45); b2.push(aura(P)); return wrap('bhuman|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, b2, o); };
  MD.b_insect = (o, P) => { const out = big(spider(o, P, C(colOf(o, '#5a3a6a')), 1, '#ff2020'), 2.1); out.push(el(-0.55, 0, 0.42, 0.35, 0.28, 0.25, mat('#7a4a8a', 'fur', { tex: furTex })), aura(P, '#c040ff')); return wrap('binsect|' + (o.moving ? o.f % 4 : 0) + '|' + P.level, out, o); };
  MD.b_fire = (o, P) => { const f = (o.f || 0) % 4, out = []; for (let q = 0; q < 7; q++) out.push(el(Math.sin(q * 2 + f) * 0.15, 0, 0.3 + q * 0.22, 0.32 - q * 0.03, 0.26 - q * 0.025, 0.2, mat(q % 2 ? '#ff7a20' : '#ffd060', 'fire', { em: 1.6, fl: F.NOSHADOW }))); out.push(sph(-0.08, 0.24, 1.3, pmin(P, 0.05), mat('#ffffff', 'eye', { em: 2 })), sph(0.08, 0.24, 1.3, pmin(P, 0.05), mat('#ffffff', 'eye', { em: 2 }))); return wrap('bfire|' + f + '|' + P.level, big(out, 1.2), o); };
  MD.b_other = (o, P) => { const out = big([el(0, 0, 0.4, 0.4, 0.32, 0.38, mat(colOf(o, '#7a5a8a'), 'cloth', { tex: furTex })), sph(-0.15, 0.3, 0.55, 0.06, mat('#ffe060', 'eye', { em: 1.6 })), sph(0.15, 0.3, 0.55, 0.06, mat('#ffe060', 'eye', { em: 1.6 })), sph(0, 0.33, 0.38, 0.05, mat('#ff4040', 'eye', { em: 1.6 }))], 1.6); out.push(aura(P, '#a040ff')); return wrap('bother|' + (o.c || '') + '|' + P.level, out, o); };

  // ---------- знаки ----------
  MD.fx_sleep = (o, P) => ({ key: 'sleep|' + ((o.f || 0) % 2) + '|' + P.level, prims: [sph(0.15, 0, 1.45 + ((o.f || 0) % 2) * 0.08, pmin(P, 0.05), mat('#a0b0ff', 'sleep', { em: 1, fl: F.NOSHADOW }))] });
})(window.EOF);
