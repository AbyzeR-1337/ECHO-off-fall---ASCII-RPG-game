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
  const stoneTex = texNoise(0.2, 0.6, 8, 13);
  // кора: продольные борозды
  const barkTex = (x, y, z, mo, n) => { const a = x * 70 + vnoise(x * 8, z * 3, 5) * 5, v = Math.abs(Math.sin(a)); const k = 0.72 + v * 0.45; mo.r *= k; mo.g *= k; mo.b *= k; mo.t = v; n[0] += Math.cos(a) * 0.5; mo.lk = (v - 0.5) * 0.12; };
  // складки ткани: вертикальные волны с шумом — меняют наклон поверхности и тон штриха
  const foldTex = (freq, amp, seed) => (x, y, z, mo, n) => {
    const w = Math.sin(x * freq + vnoise(x * 6, z * 3, seed) * 4 + z * 2);
    n[0] += w * amp; mo.lk = w * 0.03;
    const k = 0.94 + vnoise(x * 10, z * 10, seed + 1) * 0.12; mo.r *= k; mo.g *= k; mo.b *= k;
  };
  const clothTex = foldTex(55, 0.22, 91);
  const hairTex = (x, y, z, mo, n) => { const w = Math.sin(x * 140 + Math.sin(z * 45) * 2.5); n[0] += w * 0.35; mo.lk = w * 0.07; };
  // мех: пряди вдоль тела
  const furTex2 = (x, y, z, mo, n) => {
    const w = Math.sin(x * 90 + z * 40 + vnoise(x * 12, z * 12, 94) * 6);
    n[2] += w * 0.2; n[0] += Math.cos(x * 70 + z * 30) * 0.1; mo.lk = w * 0.04;
    const k = 0.9 + vnoise(x * 14, (y + z) * 14, 95) * 0.2; mo.r *= k; mo.g *= k; mo.b *= k;
  };
  const scaleTex = (x, y, z, mo, n) => {
    const u = x * 40, v = z * 40 + (Math.floor(u) % 2) * 0.5, fu = u - Math.floor(u), fv = v - Math.floor(v);
    const d = Math.hypot(fu - 0.5, fv - 0.4);
    n[0] += (fu - 0.5) * 0.8; n[2] += (0.5 - fv) * 0.5; mo.lk = d > 0.45 ? -0.12 : 0.03;
  };
  const mailTex = (x, y, z, mo, n) => { const u = Math.sin(x * 160) * Math.sin(z * 160); n[0] += u * 0.3; mo.lk = u * 0.06; };
  const membraneTex = (x, y, z, mo, n) => { const v = Math.abs(Math.sin(x * 25)); mo.lk = v < 0.15 ? 0.1 : -0.03; };
  // листва: мелкие листья — сильный шум наклона и тона на мелком шаге
  const leafTex2 = (seed) => (x, y, z, mo, n) => {
    const v = vnoise(x * 42 + seed, (y + z) * 42, seed), w = vnoise(x * 16, (y - z) * 16 + seed, seed + 3);
    n[0] += (v - 0.5) * 0.6; n[1] += (w - 0.5) * 0.45; n[2] += (vnoise(x * 30, z * 30, seed + 5) - 0.5) * 0.35;
    mo.lk = (v - 0.5) * 0.12;
    const k = 0.84 + w * 0.3; mo.r *= k; mo.g *= k; mo.b *= k;
  };
  const needleTex = (seed) => (x, y, z, mo, n) => {
    const a = Math.atan2(y, x), w = Math.sin(a * 22 + z * 9 + seed);
    n[0] += Math.cos(a * 22 + seed) * 0.35; mo.lk = w * 0.08 + (vnoise(x * 30, z * 30, seed) - 0.5) * 0.1;
    const k = 0.85 + vnoise(x * 18, (y + z) * 18, seed + 7) * 0.3; mo.r *= k; mo.g *= k; mo.b *= k;
  };


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
    const mn = 0.55 * P.px;
    r0 = Math.max(r0, mn); r1 = Math.max(r1, mn);
    const L = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    const n = Math.max(2, Math.ceil(L / (Math.min(r0, r1) * 0.45)));
    for (let i = 0; i <= n; i++) { const t = i / n; out.push(sph(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t, r0 + (r1 - r0) * t, m)); }
  }
  const pmin = (P, r) => Math.max(r, 0.55 * P.px);
  // поднять модель (на постамент)
  const lift = (prims, dz) => prims.map((p) => (p.t === 'b' ? Object.assign({}, p, { z0: p.z0 + dz, z1: p.z1 + dz }) : p.t === 'c' || p.t === 'y' ? Object.assign({}, p, { z0: p.z0 + dz }, p.t === 'y' ? { z1: p.z1 + dz } : {}) : Object.assign({}, p, { z: p.z + dz })));
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
  // крона — множество комков листвы вокруг центра; у каждого свой оттенок, снизу темнее
  function crown(out, P, seed, cx, cy, cz, rx, ry, rz, n, rmin, rmax, c, sway) {
    for (let q = 0; q < n; q++) {
      const a = hash2(q, seed, 1) * Math.PI * 2, u = hash2(q, seed, 2) * 2 - 1, rr = Math.pow(hash2(q, seed, 3), 0.5);
      const sx = Math.cos(a) * Math.sqrt(1 - u * u) * rr, sy = Math.sin(a) * Math.sqrt(1 - u * u) * rr, sz = u * rr;
      const r = rmin + hash2(q, seed, 4) * (rmax - rmin);
      const k = 0.8 + hash2(q, seed, 5) * 0.35 + sz * 0.12;
      out.push(el(cx + sx * rx + (sway || 0) * (sz + 1), cy + sy * ry, cz + sz * rz, r, r * 0.9, r * 0.85, mat(shadeC(c, k), 'leaf', { tex: leafTex2(seed + q) })));
    }
  }
  function oak(o, P, variant) {
    const v = variant, fr = P.level >= 4 ? (o.f || 0) % 4 : 0, sway = Math.sin(fr * 1.57) * 0.012;
    const c = C(colOf(o, '#3e7b34'));
    const out = [];
    // ствол с корнями, ветви к кроне
    limb(out, P, 0, 0, 0.02, 0.03, 0, 1.05, 0.13, 0.08, BARK);
    out.push(el(-0.12, 0.03, 0.04, 0.11, 0.07, 0.06, BARK), el(0.13, 0.0, 0.04, 0.1, 0.07, 0.05, BARK), el(0.02, 0.12, 0.04, 0.07, 0.1, 0.05, BARK));
    limb(out, P, 0.02, 0, 0.82, -0.36, 0.04, 1.32, 0.06, 0.035, BARK);
    limb(out, P, 0.03, 0, 0.9, 0.4, -0.02, 1.38, 0.055, 0.03, BARK);
    limb(out, P, 0.03, 0, 1.0, 0.06, 0.12, 1.6, 0.05, 0.03, BARK);
    crown(out, P, 11 + v * 7, 0, 0, v ? 1.78 : 1.72, v ? 0.5 : 0.58, 0.42, v ? 0.55 : 0.45, 13, 0.2, 0.3, c, sway);
    return { key: 'oak' + v + '|' + c.join() + '|' + fr, prims: out };
  }
  MD.tree = (o, P) => oak(o, P, 0);
  MD.tree2 = (o, P) => oak(o, P, 1);
  // голые ветви: ствол, сучья второго порядка, снег на развилках
  function branches(out, P, B, seed, x0, z0, x1, y1, z1, r0, depth) {
    limb(out, P, x0, 0, z0, x1, y1, z1, r0, r0 * 0.6, B);
    if (depth <= 0) return;
    for (let q = 0; q < 2; q++) {
      const t = 0.55 + q * 0.25, bx = x0 + (x1 - x0) * t, bz = z0 + (z1 - z0) * t, by = y1 * t;
      const dir = (hash2(q, seed, 9) - 0.5) * 0.7 + (x1 - x0) * 0.6;
      branches(out, P, B, seed * 3 + q, bx, bz, bx + dir, by + (hash2(q, seed, 8) - 0.5) * 0.2, bz + 0.25 + hash2(q, seed, 7) * 0.2, r0 * 0.55, depth - 1);
    }
  }
  MD.tree_bare = (o, P) => {
    const out = [], S = mat('#e8eef4', 'snow');
    limb(out, P, 0, 0, 0, 0, 0, 1.0, 0.1, 0.06, BARK);
    branches(out, P, BARK, 3, 0, 0.7, -0.4, 0.03, 1.4, 0.05, 2);
    branches(out, P, BARK, 5, 0, 0.8, 0.42, -0.02, 1.45, 0.05, 2);
    branches(out, P, BARK, 7, 0, 0.95, 0.05, 0.08, 1.75, 0.045, 2);
    for (const [x, z] of [[-0.2, 1.08], [0.21, 1.15], [0.02, 1.35]]) out.push(el(x, 0.02, z, 0.06, 0.05, 0.025, S));
    return { key: 'treebare', prims: out };
  };
  // ель: ярусы-конусы с «иголками» лучами, снизу каждого яруса — тень
  function pine(o, P, snow) {
    const c = C(colOf(o, '#2e6b55'));
    const S = mat('#eef4f8', 'snow', { tex: texNoise(0.08, 0.3, 14, 19) });
    const out = [];
    limb(out, P, 0, 0, 0, 0, 0, 0.5, 0.075, 0.06, BARK);
    const tiers = 6;
    for (let q = 0; q < tiers; q++) {
      const t = q / (tiers - 1), z = 0.32 + t * 1.55, r = 0.58 - t * 0.42, h = 0.62 - t * 0.2;
      out.push(cone(0, 0, z, r, h, mat(shadeC(c, 0.85 + t * 0.3), 'leaf', { tex: needleTex(q) })));
      if (snow) out.push(cone(0, -0.02, z + h * 0.42, r * 0.6, h * 0.55, S));
    }
    return { key: 'pine|' + c.join() + (snow ? 's' : ''), prims: out };
  }
  MD.pine = (o, P) => pine(o, P, false);
  MD.pine_snow = (o, P) => pine(o, P, true);
  MD.deadtree = (o, P) => {
    const out = [], B = mat('#6a5a46', 'bark', { tex: barkTex });
    limb(out, P, 0, 0, 0, 0.05, 0, 0.95, 0.09, 0.05, B);
    out.push(el(-0.1, 0.03, 0.03, 0.09, 0.06, 0.04, B), el(0.1, 0.02, 0.03, 0.08, 0.06, 0.04, B));
    branches(out, P, B, 13, 0.04, 0.6, -0.38, 0.02, 1.05, 0.045, 1);
    branches(out, P, B, 17, 0.05, 0.75, 0.36, 0, 1.2, 0.04, 1);
    return { key: 'dead', prims: out };
  };
  MD.bush = (o, P) => {
    const out = [], berry = (o.seed || 0) % 3 === 0;
    crown(out, P, 23 + ((o.seed || 0) % 2), 0, 0, 0.24, 0.3, 0.22, 0.18, 9, 0.11, 0.16, C('#3e6a2c'));
    if (berry) for (let q = 0; q < 6; q++) out.push(sph(-0.2 + hash2(q, 4, 1) * 0.4, 0.12 + hash2(q, 4, 2) * 0.08, 0.15 + hash2(q, 4, 3) * 0.2, pmin(P, 0.028), mat('#c03030', 'glow', { sp: 0.6 })));
    return { key: 'bush' + (berry ? 'b' : '') + ((o.seed || 0) % 2), prims: out };
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
    return { key: 'statue', prims: [box(-0.25, -0.2, 0, 0.25, 0.2, 0.22, DSTONE)].concat(lift(body, 0.22)) };
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
  // колодец: каменный сруб, тёмная вода, столбы, ворот с ведром, маленькая крыша
  const ringTex = (x, y, z, mo, n) => { const a = Math.atan2(y, x), row = Math.floor(z * 14), u = a * 3.2 + (row % 2) * 0.5, fu = u - Math.floor(u), fz = z * 14 - row; if (fz < 0.16 || fu < 0.07) { mo.r *= 0.45; mo.g *= 0.45; mo.b *= 0.45; mo.t = 0.05; mo.lk = -0.25; } else { mo.t = 0.6; const k = 0.85 + hash2(Math.floor(u), row, 5) * 0.3; mo.r *= k; mo.g *= k; mo.b *= k; } };
  MD.well = (o, P) => {
    const out = [];
    out.push({ t: 'y', x: 0, y: 0, r: 0.29, z0: 0, z1: 0.34, m: mat('#8a8478', 'stone', { tex: ringTex }) });
    out.push(disc(0, 0, 0.345, 0.22, 0.22, mat('#0c1824', 'water', { sp: 1, fl: F.WATER })));
    limb(out, P, -0.3, 0, 0.3, -0.3, 0, 1.0, 0.032, 0.03, DWOOD); limb(out, P, 0.3, 0, 0.3, 0.3, 0, 1.0, 0.032, 0.03, DWOOD);
    limb(out, P, -0.32, 0, 0.82, 0.32, 0, 0.82, 0.03, 0.03, WOOD);
    limb(out, P, 0.05, 0, 0.8, 0.05, 0, 0.55, 0.006, 0.006, mat('#c8b890', 'cloth'));
    out.push({ t: 'y', x: 0.05, y: 0, r: 0.06, z0: 0.45, z1: 0.55, m: mat('#6a4a2a', 'wood', { tex: texNoise(0.15, 0.3, 30, 7) }) });
    out.push(cone(0, 0, 1.0, 0.36, 0.22, mat('#7a3a2a', 'rooftile', { tex: (x, y, z, mo, n) => { if ((z * 30) % 1 < 0.2) { mo.r *= 0.5; mo.g *= 0.5; mo.b *= 0.5; mo.lk = -0.2; } } })));
    return { key: 'well', prims: out };
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
  const LEATHER = mat('#4a3020', 'cloth', { tex: texNoise(0.1, 0.3, 16, 93) });
  const EYE = mat('#1a1210', 'dark');
  // Фигура человека (рост около 1.35 клетки при s = 1). o: { cloth, pants, sleeve, skin, head, hair, boots, belt, eyes,
  // frame, moving, armsFwd, robe, hunch, bulky, long, beard }. Смотрит на зрителя (на юг).
  const HZ = 1.235;
  function human(o, P, s) {
    s = s || 1;
    const out = [], S = (v) => v * s;
    const ph = (o.frame || 0) % 4, walk = o.moving ? Math.sin(ph * Math.PI / 2) : 0;
    const hunch = (o.hunch || 0) * s, bk = o.bulky || 1;
    const cloth = o.cloth, pants = o.pants || cloth, sleeve = o.sleeve || cloth, skin = o.skin, boots = o.boots || LEATHER;
    // ноги или подол
    if (o.robe) {
      out.push(el(0, 0, S(0.2), S(0.175) * bk, S(0.145) * bk, S(0.21), cloth), el(0, 0, S(0.45), S(0.15) * bk, S(0.115) * bk, S(0.2), cloth), el(0, 0, S(0.66), S(0.135) * bk, S(0.095) * bk, S(0.12), cloth));
      for (const sd of [-1, 1]) out.push(el(sd * S(0.06), S(0.11 + walk * sd * 0.04), S(0.03), S(0.042), S(0.06), S(0.03), boots));
    } else {
      for (const sd of [-1, 1]) {
        const sw = walk * sd * 0.12;
        const hip = [sd * S(0.075) * bk, 0, S(0.66)], knee = [sd * S(0.074) * bk, S(sw * 0.55 + 0.015), S(0.37)], ank = [sd * S(0.067) * bk, S(sw), S(0.08)];
        limb(out, P, hip[0], hip[1], hip[2], knee[0], knee[1], knee[2], S(0.068) * bk, S(0.05) * bk, pants);
        limb(out, P, knee[0], knee[1], knee[2], ank[0], ank[1], S(0.22), S(0.05) * bk, S(0.044) * bk, pants);
        limb(out, P, ank[0], ank[1], S(0.24), ank[0], ank[1], ank[2], S(0.048) * bk, S(0.042) * bk, boots);
        out.push(el(ank[0], ank[1] + S(0.035), S(0.035), S(0.043) * bk, S(0.075), S(0.035), boots));
      }
      out.push(el(0, 0, S(0.685), S(0.13) * bk, S(0.088) * bk, S(0.075), pants));
    }
    // туловище: живот, грудь, подол рубахи, пояс с пряжкой, плечи
    const hy = hunch * 0.6;
    out.push(el(0, hunch * 0.25, S(0.815), S(0.133) * bk, S(0.087) * bk, S(0.11), cloth));
    out.push(el(0, hy, S(0.975), S(0.158) * bk, S(0.098) * bk, S(0.125), cloth));
    if (!o.robe) out.push(el(0, 0, S(0.715), S(0.146) * bk, S(0.096) * bk, S(0.055), cloth));
    out.push(el(0, hunch * 0.2, S(0.755), S(0.14) * bk, S(0.093) * bk, S(0.022), o.belt || LEATHER));
    out.push(box(-S(0.017), S(0.088) * bk + hunch * 0.2, S(0.74), S(0.017), S(0.098) * bk + hunch * 0.2, S(0.772), GOLD));
    for (const sd of [-1, 1]) out.push(sph(sd * S(0.157) * bk, hy, S(1.05), S(0.068) * bk, sleeve));
    // руки: плечо — локоть — запястье, кисть
    for (const sd of [-1, 1]) {
      const fw = o.armsFwd ? 1 : 0, sw = -walk * sd * 0.11;
      const sh = [sd * S(0.175) * bk, hy, S(1.035)];
      const elb = fw ? [sd * S(0.19) * bk, hy + S(0.16), S(0.95)] : [sd * S(0.222) * bk, hy + S(sw * 0.55), S(0.81)];
      const wr = fw ? [sd * S(0.15) * bk, hy + S(0.36), S(0.93)] : [sd * S(0.235) * bk, hy + S(sw + 0.035), S(0.6)];
      limb(out, P, sh[0], sh[1], sh[2], elb[0], elb[1], elb[2], S(0.05) * bk, S(0.042) * bk, sleeve);
      limb(out, P, elb[0], elb[1], elb[2], wr[0], wr[1], wr[2], S(0.042) * bk, S(0.033) * bk, sleeve);
      out.push(el(wr[0], wr[1] + (fw ? S(0.04) : S(0.006)), wr[2] - (fw ? 0 : S(0.05)), S(0.031) * bk, fw ? S(0.05) : S(0.033), fw ? S(0.03) : S(0.052), skin));
    }
    // шея и голова: череп, челюсть, нос, уши, глаза; волосы, борода
    const head = o.head || skin, hz = S(HZ), yh = hunch + S(0.01);
    limb(out, P, 0, hunch * 0.8, S(1.09), 0, yh, S(1.165), S(0.046), S(0.044), skin);
    out.push(el(0, yh - S(0.005), hz + S(0.015), S(0.097), S(0.104), S(0.112), head));
    out.push(el(0, yh + S(0.03), hz - S(0.052), S(0.074), S(0.075), S(0.06), head));
    out.push(el(0, yh + S(0.105), hz - S(0.01), S(0.018), S(0.024), S(0.028), head));
    for (const sd of [-1, 1]) out.push(sph(sd * S(0.098), yh, hz - S(0.005), S(0.024), head));
    for (const sd of [-1, 1]) out.push(sph(sd * S(0.036), yh + S(0.093), hz + S(0.018), S(0.014), o.eyes || EYE));
    if (o.hair) {
      out.push(el(0, yh - S(0.022), hz + S(0.055), S(0.104), S(0.11), S(0.085), o.hair));
      out.push(el(0, yh - S(0.06), hz - S(0.008), S(0.1), S(0.068), S(0.096), o.hair));
      if (o.long) out.push(el(0, yh - S(0.07), hz - S(0.14), S(0.096), S(0.05), S(0.16), o.hair));
      if (o.beard) out.push(el(0, yh + S(0.06), hz - S(0.085), S(0.064), S(0.055), S(0.064), o.hair));
    }
    return out;
  }
  HF.human = human;
  function faceOf(m) { return m; }
  function bodyOf(m) { return m; }
  const HAIR = ['#3a2416', '#1a1410', '#a87a40', '#6a4a2a', '#c8a060'];
  // принадлежности: шапка, капюшон, шлем, корона, копьё, молот, посох, лук, удочка, книга, мешок, клюка, лютня, плащ…
  function gear(out, P, kind, s, x) {
    x = x || {};
    const S = (v) => v * s, hz = S(HZ);
    switch (kind) {
      case 'hat': out.push(disc(0, 0, hz + S(0.085), S(0.22), S(0.18), mat('#c8b060', 'thatchS', { tex: texNoise(0.15, 0.3, 30, 101) })), el(0, -S(0.01), hz + S(0.12), S(0.104), S(0.1), S(0.065), mat('#d8c070', 'thatchS', { tex: texNoise(0.12, 0.3, 30, 103) })), el(0, -S(0.01), hz + S(0.092), S(0.106), S(0.104), S(0.016), mat('#7a3a2a', 'cloth'))); break;
      case 'hood': out.push(el(0, -S(0.03), hz + S(0.025), S(0.122), S(0.122), S(0.135), x.m), el(0, -S(0.03), hz - S(0.12), S(0.15), S(0.1), S(0.075), x.m)); break;
      case 'helm': out.push(el(0, -S(0.005), hz + S(0.04), S(0.11), S(0.115), S(0.098), METAL), disc(0, 0, hz + S(0.005), S(0.128), S(0.132), METAL), box(-S(0.012), S(0.105), hz - S(0.055), S(0.012), S(0.122), hz + S(0.05), METAL)); break;
      case 'crown': out.push(el(0, 0, hz + S(0.1), S(0.1), S(0.106), S(0.024), GOLD)); for (let q = 0; q < 5; q++) { const a = -0.9 + q * 0.45; out.push(cone(Math.sin(a) * S(0.096), Math.cos(a) * S(0.1) * 0.6, hz + S(0.105), pmin(P, S(0.022)), S(0.06), GOLD)); } out.push(sph(0, S(0.1), hz + S(0.1), pmin(P, S(0.018)), mat('#e03040', 'glow', { em: 0.6, sp: 1 }))); break;
      case 'spear': limb(out, P, S(0.235), S(0.06), 0, S(0.235), S(0.06), S(1.6), S(0.018), S(0.016), DWOOD); out.push(cone(S(0.235), S(0.06), S(1.6), pmin(P, S(0.032)), S(0.17), METAL), el(S(0.235), S(0.06), S(1.6), S(0.03), S(0.02), S(0.012), METAL)); break;
      case 'hammer': limb(out, P, S(0.22), S(0.05), S(0.5), S(0.26), S(0.07), S(0.95), S(0.018), S(0.018), DWOOD); out.push(box(S(0.19), S(0.03), S(0.93), S(0.34), S(0.11), S(1.02), METAL)); break;
      case 'staff': limb(out, P, S(0.255), S(0.05), 0, S(0.255), S(0.05), S(1.52), S(0.02), S(0.018), DWOOD); out.push(sph(S(0.255), S(0.05), S(1.57), pmin(P, S(0.045)), mat(x.orb || '#a0c0ff', 'glow', { em: 1.4, fl: F.NOSHADOW }))); break;
      case 'bow': for (let q = 0; q <= 10; q++) { const a = (q / 10 - 0.5) * 2.3; out.push(sph(-S(0.25) - Math.cos(a) * S(0.07) + S(0.07), S(0.05), S(0.8) + Math.sin(a) * S(0.36), pmin(P, S(0.016)), DWOOD)); } limb(out, P, -S(0.25), S(0.05), S(0.8) - S(0.33), -S(0.25), S(0.05), S(0.8) + S(0.33), S(0.005), S(0.005), mat('#d0c8b0', 'cloth')); break;
      case 'rod': limb(out, P, S(0.21), S(0.06), S(0.55), S(0.55), S(0.12), S(1.5), S(0.016), S(0.01), DWOOD); break;
      case 'book': out.push(box(-S(0.09), S(0.1), S(0.8), S(0.09), S(0.15), S(0.94), mat('#8a2a2a', 'book')), box(-S(0.08), S(0.15), S(0.81), S(0.08), S(0.155), S(0.93), mat('#e8e0c8', 'cloth'))); break;
      case 'bag': out.push(el(S(0.21), -S(0.02), S(0.66), S(0.07), S(0.08), S(0.1), mat('#8a6a40', 'cloth', { tex: clothTex })), el(S(0.21), -S(0.02), S(0.75), S(0.04), S(0.05), S(0.02), mat('#5a4228', 'cloth'))); break;
      case 'cane': limb(out, P, S(0.22), S(0.07), S(0.56), S(0.25), S(0.1), 0, S(0.017), S(0.017), DWOOD); break;
      case 'lute': out.push(el(-S(0.02), S(0.12), S(0.8), S(0.1), S(0.045), S(0.12), mat('#a87040', 'wood', { sp: 0.4 })), sph(-S(0.02), S(0.165), S(0.8), pmin(P, S(0.025)), mat('#2a1a0e', 'dark'))); limb(out, P, S(0.05), S(0.13), S(0.88), S(0.24), S(0.13), S(1.08), S(0.016), S(0.014), DWOOD); break;
      case 'flask': out.push(el(S(0.215), S(0.06), S(0.52), S(0.04), S(0.04), S(0.05), mat('#7ad0a0', 'glass', { em: 0.6, sp: 1 })), el(S(0.215), S(0.06), S(0.58), S(0.012), S(0.012), S(0.02), mat('#8a6a40', 'wood'))); break;
      case 'bowl': out.push(el(S(0.0), S(0.3), S(0.9), S(0.075), S(0.06), S(0.03), mat('#8a6a40', 'wood'))); break;
      case 'sword': limb(out, P, S(0.215), S(0.07), S(0.56), S(0.23), S(0.12), S(1.05), S(0.014), S(0.008), METAL); out.push(el(S(0.215), S(0.07), S(0.6), S(0.045), S(0.015), S(0.012), METAL)); break;
      case 'club': limb(out, P, S(0.22), S(0.06), S(0.55), S(0.3), S(0.1), S(1.05), S(0.025), S(0.065), DWOOD); break;
      case 'trident': limb(out, P, S(0.245), S(0.05), 0, S(0.245), S(0.05), S(1.5), S(0.018), S(0.016), METAL); out.push(el(S(0.245), S(0.05), S(1.5), S(0.08), S(0.015), S(0.012), METAL)); for (const dx of [-0.07, 0, 0.07]) out.push(cone(S(0.245 + dx), S(0.05), S(1.5), pmin(P, S(0.02)), S(0.15), METAL)); break;
      case 'note': { const k = (x.f || 0) % 8; out.push(sph(S(0.15) + Math.sin(k) * 0.05, 0, S(1.55) + k * 0.03, pmin(P, S(0.035)), mat('#f0d060', 'glow', { em: 1, fl: F.NOSHADOW })), box(S(0.17) + Math.sin(k) * 0.05, -0.005, S(1.55) + k * 0.03, S(0.18) + Math.sin(k) * 0.05, 0.005, S(1.66) + k * 0.03, mat('#f0d060', 'glow', { em: 1, fl: F.NOSHADOW }))); break; }
      case 'cape': out.push(el(0, -S(0.105), S(0.8), S(0.175), S(0.05), S(0.36), x.m), el(0, -S(0.07), S(1.08), S(0.17), S(0.07), S(0.05), x.m)); break;
      case 'ring': for (let q = 0; q < 18; q++) { const a = q / 18 * Math.PI * 2; out.push(disc(Math.cos(a) * 0.33, Math.sin(a) * 0.19, 0.005, pmin(P, 0.02), pmin(P, 0.014), mat(x.c || '#f0d080', 'glow', { em: 1.1, fl: F.NOSHADOW }))); } break;
    }
  }
  // житель: из ключа рисунка — одежда, принадлежности, рост
  const JOBGEAR = {
    npc_guard: { gear: ['helm', 'spear'], cloth: '#7a8a9a', pants: '#3a3a44' }, npc_hood: { gear: ['hood'], robe: 1 }, npc_mage: { gear: ['hood', 'staff'], robe: 1 },
    npc_smith: { gear: ['hammer'], bulky: 1.15, apron: 1, beard: 1 }, npc_hat: { gear: ['hat'] }, npc_fisher: { gear: ['hat', 'rod'] }, npc_hunter: { gear: ['bow', 'cape'] },
    npc_trader: { gear: ['bag'] }, npc_noble: { gear: ['crown', 'cape'] }, npc_bard: { gear: ['lute', 'note'] }, npc_beggar: { gear: ['bowl'], hunch: 0.08, armsFwd: 1 },
    npc_scholar: { gear: ['book'], robe: 1 }, npc_healer: { gear: ['flask'] }, npc_wander: { gear: ['hood', 'cane'] }, npc_elder: { gear: ['cane'], hunch: 0.06, grey: 1, beard: 1 },
    npc_f: { robe: 1, long: 1 }, npc_m: {}, npc_child: { scale: 0.68 },
  };
  for (const key in JOBGEAR) {
    MD[key] = (o, P) => {
      const j = JOBGEAR[key], s = j.scale || 1;
      const cc = colOf(o, '#b89878'), cloth = mat(cc, 'cloth', { tex: clothTex }), pants = mat(j.pants || shadeC(C(cc), 0.55), 'cloth', { tex: clothTex });
      const hairC = j.grey ? '#d0d0d0' : HAIR[(o.seed || cc.charCodeAt(2)) % HAIR.length];
      const covered = j.gear && (j.gear.includes('hood') || j.gear.includes('helm'));
      const prims = human({ cloth: j.cloth ? mat(j.cloth, 'metal', { sp: 0.5, tex: mailTex }) : cloth, pants, skin: mat(SKIN, 'skin'), hair: covered ? null : mat(hairC, 'hair', { tex: hairTex }), frame: o.f, moving: o.moving, robe: j.robe, hunch: j.hunch, bulky: j.bulky, long: j.long, beard: j.beard && !covered, armsFwd: j.armsFwd }, P, s);
      if (j.apron) prims.push(el(0, S1(0.07), 0.66 * s, 0.12 * s, 0.05 * s, 0.24 * s, mat('#6a4a30', 'cloth', { tex: texNoise(0.1, 0.3, 14, 105) })));
      for (const g of j.gear || []) gear(prims, P, g, s, { m: mat(shadeC(C(cc), 0.8), 'cloth', { tex: clothTex }), f: o.f });
      return wrap(key + '|' + cc + '|' + (o.moving ? o.f % 4 : 0) + (key === 'npc_bard' ? '|' + (o.f % 8) : ''), prims, o);
    };
  }
  const S1 = (v) => v;
  MD.player = (o, P) => {
    const cc = colOf(o, '#c8a060');
    const prims = human({ cloth: mat(cc, 'cloth', { tex: clothTex }), pants: mat('#3a3028', 'cloth', { tex: clothTex }), skin: mat(SKIN, 'skin'), hair: mat('#5a3a22', 'hair', { tex: hairTex }), frame: o.f, moving: o.moving }, P, 1);
    gear(prims, P, 'cape', 1, { m: mat(shadeC(C(cc), 0.6), 'cloth', { tex: clothTex }) });
    gear(prims, P, 'ring', 1, { c: o.ring || '#f0d080' });
    return wrap('player|' + cc + '|' + (o.moving ? o.f % 4 : 0), prims, o);
  };

  // ============================================================
  // ЗВЕРИ: четвероногие, птицы, гады, насекомые
  // ============================================================
  // четвероногое, смотрит на восток. q: { len, h, w, body, belly, headc, legc, snout, ears, tail, headR, headUp, legR, fat, cs, … }
  // Корпус — грудь, бочка, круп; ноги с суставами (у задних — скакательный сустав назад); шея, череп, морда с носом
  function quad(o, P, q) {
    const out = [], L = q.len, Hh = q.h, Wd = q.w || 0.16, fat = q.fat || 1;
    const ph = (o.f || 0) % 4, walk = o.moving ? Math.sin(ph * Math.PI / 2) : 0;
    const tx = q.cs === 'scale' ? scaleTex : furTex2;
    const B = mat(q.body, q.cs || 'fur', { tex: tx }), Bl = mat(q.belly || q.body, q.cs || 'fur', { tex: tx }), Hd = mat(q.headc || q.body, q.cs || 'fur', { tex: tx });
    const Lg = mat(q.legc || shadeC(q.body, 0.82), q.cs || 'fur', { tex: tx });
    const bz = Hh * 0.6, legR = q.legR || 0.045;
    out.push(el(L * 0.24, 0, bz + Hh * 0.04, L * 0.25, Wd * 1.05 * fat, Hh * 0.21 * fat, B));
    out.push(el(0, 0, bz - Hh * 0.01, L * 0.3, Wd * fat, Hh * 0.185 * fat, B));
    out.push(el(-L * 0.27, 0, bz + Hh * 0.02, L * 0.22, Wd * 0.95 * fat, Hh * 0.18 * fat, B));
    out.push(el(0, 0, bz - Hh * 0.12 * fat, L * 0.3, Wd * 0.72 * fat, Hh * 0.09, Bl));
    // ноги
    for (const [fx, sy, phs] of [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]) {
      const lx = fx * L * 0.3, ly = sy * Wd * 0.55, st = walk * phs * L * 0.13, lc = sy > 0 ? Lg : mat(shadeC(q.legc ? C(q.legc) : q.body, 0.62), q.cs || 'fur');
      const top = [lx, ly, bz - Hh * 0.02], foot = [lx + st, ly, legR * 0.6];
      const mid = fx > 0 ? [lx + st * 0.45 + L * 0.015, ly, bz * 0.47] : [lx + st * 0.45 - L * 0.07, ly, bz * 0.42];
      limb(out, P, top[0], top[1], top[2], mid[0], mid[1], mid[2], legR * (fx > 0 ? 1.35 : 1.7), legR, lc);
      limb(out, P, mid[0], mid[1], mid[2], foot[0], foot[1], foot[2], legR, legR * 0.8, lc);
      out.push(el(foot[0] + legR * 0.5, foot[1], legR * 0.55, legR * 1.25, legR * 0.95, legR * 0.6, lc));
    }
    // шея и голова
    const hR = q.headR || 0.11, hx = L * 0.56, hz = bz + Hh * (q.headUp != null ? q.headUp : 0.2);
    limb(out, P, L * 0.36, 0, bz + Hh * 0.12, hx - hR * 0.3, 0, hz - hR * 0.2, Wd * 0.75 * fat, hR * 0.8, B);
    out.push(el(hx, 0, hz, hR * 1.05, hR * 0.9, hR, Hd));
    const sn = (q.snout || 0) * 2.3;
    if (sn > 0) {
      limb(out, P, hx + hR * 0.5, 0, hz - hR * 0.25, hx + hR * 0.5 + sn, 0, hz - hR * 0.42, hR * 0.62, hR * 0.36, Hd);
      out.push(sph(hx + hR * 0.5 + sn + hR * 0.25, 0, hz - hR * 0.36, pmin(P, hR * 0.2), mat('#141010', 'dark', { sp: 0.6 })));
    }
    for (const sy of [-1, 1]) out.push(sph(hx + hR * 0.55, sy * hR * 0.5, hz + hR * 0.25, pmin(P, hR * 0.14), mat(q.eye || '#1a1410', q.eye ? 'eye' : 'dark', q.eye ? { em: 1.2 } : { sp: 0.8 })));
    if (q.ears === 'up') for (const sy of [-1, 1]) out.push(cone(hx - hR * 0.25, sy * hR * 0.5, hz + hR * 0.55, pmin(P, hR * 0.36), hR * 1.05, Hd));
    if (q.ears === 'long') for (const sy of [-1, 1]) limb(out, P, hx - hR * 0.2, sy * hR * 0.35, hz + hR * 0.6, hx - hR * 0.6, sy * hR * 0.45, hz + hR * 3, hR * 0.3, hR * 0.22, Hd);
    if (q.ears === 'round') for (const sy of [-1, 1]) out.push(sph(hx - hR * 0.35, sy * hR * 0.62, hz + hR * 0.7, pmin(P, hR * 0.3), Hd));
    // хвост
    const tz = bz + Hh * 0.08, tx0 = -L * 0.48;
    if (q.tail === 'bushy') { limb(out, P, tx0, 0, tz, tx0 - L * 0.2, 0, tz - Hh * 0.12, Wd * 0.35, Wd * 0.55, mat(q.tailc ? C(q.tailc) : q.body, 'fur', { tex: furTex2 })); limb(out, P, tx0 - L * 0.2, 0, tz - Hh * 0.12, tx0 - L * 0.38, 0, tz - Hh * 0.3, Wd * 0.55, Wd * 0.3, mat(q.tailc ? C(q.tailc) : q.body, 'fur', { tex: furTex2 })); }
    else if (q.tail === 'thin') limb(out, P, tx0, 0, tz, tx0 - L * 0.25, 0, tz - Hh * 0.3, 0.022, 0.012, B);
    else if (q.tail === 'puff') out.push(sph(tx0 - 0.02, 0, tz, pmin(P, Wd * 0.4), mat('#f0f0f0', 'fur', { tex: furTex2 })));
    else if (q.tail === 'long') limb(out, P, tx0, 0, tz - 0.03, -L * 1.05, 0.02, 0.05, Wd * 0.45, 0.015, B);
    // особое
    if (q.antlers) for (const sy of [-1, 1]) { const A = mat('#c8b090', 'bone'); limb(out, P, hx - 0.03, sy * 0.05, hz + 0.08, hx - 0.1, sy * 0.15, hz + 0.4, 0.018, 0.012, A); limb(out, P, hx - 0.07, sy * 0.1, hz + 0.24, hx + 0.06, sy * 0.17, hz + 0.36, 0.013, 0.01, A); limb(out, P, hx - 0.09, sy * 0.13, hz + 0.33, hx - 0.2, sy * 0.18, hz + 0.45, 0.012, 0.009, A); }
    if (q.tusks) for (const sy of [-1, 1]) limb(out, P, hx + hR * 0.7, sy * hR * 0.4, hz - hR * 0.5, hx + hR * 0.7 + 0.12 * q.tusks, sy * hR * 0.5, hz - hR * 0.2 + 0.08 * q.tusks, 0.018, 0.01, mat('#f0ece0', 'bone', { sp: 0.5 }));
    if (q.trunk) limb(out, P, hx + hR * 0.7, 0, hz - hR * 0.3, hx + hR * 1.1, 0.03, 0.08, hR * 0.32, hR * 0.18, Hd);
    if (q.mane) out.push(el(hx - hR * 1.1, 0, hz - hR * 0.1, hR * 1.2, hR * 0.95, hR * 1.3, mat(q.mane, 'fur', { tex: furTex2, em: q.maneEm || 0 })));
    if (q.wings) { const fl = Math.sin((o.f || 0) * 1.3) * 0.15; for (const sy of [-1, 1]) { const W2 = mat(shadeC(q.body, 0.85), 'wing', { tex: membraneTex }); out.push(el(-0.02, sy * 0.2, bz + Hh * 0.35 + fl, 0.24, 0.15, 0.025, W2)); limb(out, P, 0.1, sy * 0.06, bz + Hh * 0.25, -0.15, sy * 0.36, bz + Hh * 0.4 + fl, 0.015, 0.01, B); } }
    return out;
  }
  const QUADS = {
    m_wolf: { len: 0.74, h: 0.66, w: 0.17, body: '#8a8a8a', belly: '#c8c8c8', snout: 0.07, ears: 'up', tail: 'bushy', headR: 0.125, legR: 0.05, fat: 1.12 },
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
