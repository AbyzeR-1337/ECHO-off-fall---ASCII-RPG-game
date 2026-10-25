'use strict';
// Рука героя от первого лица — пиксельный спрайт, как в старых RPG.
// Кулак и оружие сначала строятся в объёме (фаланги пальцев, костяшки, ладонь, большой палец,
// запястье и наруч; рукоять с обмоткой, гарда, клинок с ребром, навершие…) и освещаются
// как на картине: тёплый свет сверху-слева, холодный подсвет снизу, яркий контровой край.
// Потом картинка сводится к пиксель-арту: короткие палитры со сдвигом оттенка (тень уходит
// в бордово-лиловое, свет — в жёлто-тёплое), тёмная обводка по силуэту и линии-складки
// между пальцами. Кадр удара — свой рисунок, а не поворот готовой картинки.
// Правша держит оружие справа, левша — слева; горящий факел — в другой руке.
(function (E) {
  const UI = E.UI, G = E.G, D = E.D;
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ============================================================
  // Палитры: ступени цвета от глубокой тени до блика
  // ============================================================
  function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
  function hsl2rgb([h, s, l]) { const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; if (!s) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255]; }
  // ступени со сдвигом оттенка: тени — к красно-лиловому, свет — к жёлтому
  function ramp(baseHex, n, opt) {
    opt = opt || {};
    const [h, s, l] = rgb2hsl(hex(baseHex));
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1); // 0 тень … 1 блик
      const hh = h + (t - 0.55) * (opt.shift == null ? 0.07 : opt.shift);
      const ss = clamp(s * (opt.sat || 1) * (1.15 - Math.abs(t - 0.45) * 0.55), 0, 1);
      const ll = clamp(l * (0.28 + t * 1.05) + (t > 0.8 ? (t - 0.8) * (opt.hi || 0.5) : 0), 0.03, 0.97);
      out.push(hsl2rgb([(hh + 1) % 1, ss, ll]).map(Math.round));
    }
    return out;
  }
  const SKIN = ['#d9a07a', '#c58a62', '#a8704a', '#7e5034', '#e8b896', '#5e3a24'];
  const RAMPS = {};
  function rampOf(mat, P) {
    const key = mat + '|' + (mat === 'skin' ? (P.skin || 0) : '');
    if (RAMPS[key]) return RAMPS[key];
    let r;
    switch (mat) {
      case 'skin': r = ramp(SKIN[(P.skin || 0) % SKIN.length], 7, { shift: 0.09, sat: 0.9 }); break;
      case 'glove': r = ramp('#6e4a2c', 6, { shift: 0.05 }); break;
      case 'wool': r = ramp('#8a4a3e', 6, { shift: 0.04 }); break;
      case 'bracer': r = ramp('#6a4426', 6, { shift: 0.06 }); break;
      case 'strap': r = ramp('#3e2616', 5, { shift: 0.04 }); break;
      case 'wrap': r = ramp('#4a2e1c', 5, { shift: 0.05 }); break;
      case 'wood': r = ramp('#7a5030', 6, { shift: 0.05 }); break;
      case 'wooddark': r = ramp('#40303a', 6, { shift: 0.04 }); break;
      case 'bone': r = ramp('#cfc2a0', 6, { shift: 0.05 }); break;
      case 'rag': r = ramp('#4e3c2c', 5, { shift: 0.04 }); break;
      case 'steel': r = [[22, 26, 34], [40, 48, 60], [66, 78, 94], [100, 116, 134], [142, 158, 176], [190, 204, 218], [236, 244, 250]]; break;
      case 'steeldark': r = [[16, 18, 24], [30, 34, 42], [50, 56, 68], [76, 84, 98], [110, 120, 136], [160, 170, 184]]; break;
      case 'gauntlet': r = [[24, 26, 32], [46, 52, 62], [74, 84, 98], [110, 122, 138], [156, 168, 184], [210, 220, 232]]; break;
      case 'gold': r = [[52, 30, 8], [100, 62, 16], [150, 100, 28], [200, 148, 46], [232, 196, 84], [255, 240, 170]]; break;
      case 'dawn': r = [[90, 48, 20], [160, 96, 36], [214, 150, 60], [240, 196, 110], [255, 230, 170], [255, 250, 225]]; break;
      case 'spite': r = [[30, 16, 34], [58, 32, 64], [92, 56, 100], [130, 90, 140], [170, 130, 180], [214, 186, 222]]; break;
      case 'gem': r = [[60, 8, 16], [120, 16, 30], [180, 36, 50], [230, 80, 96], [255, 170, 180]]; break;
      case 'crystal': r = [[60, 30, 110], [100, 56, 170], [150, 100, 230], [196, 160, 255], [236, 220, 255], [255, 255, 255]]; break;
      case 'nightcrystal': r = [[20, 30, 90], [40, 60, 160], [80, 110, 230], [140, 170, 255], [210, 225, 255], [255, 255, 255]]; break;
      case 'sun': r = [[110, 60, 10], [190, 110, 20], [240, 170, 40], [255, 214, 100], [255, 240, 190]]; break;
      default: r = ramp('#808080', 6);
    }
    RAMPS[key] = r;
    return r;
  }
  const EMISSIVE = new Set(['crystal', 'nightcrystal', 'sun']);
  const METAL = new Set(['steel', 'steeldark', 'gauntlet', 'gold', 'dawn', 'spite', 'gem', 'crystal', 'nightcrystal', 'sun']);

  // ============================================================
  // Объёмные формы (расстояние до поверхности)
  // ============================================================
  function capsule(a, b, r0, r1) {
    const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2], bb = bax * bax + bay * bay + baz * baz || 1e-6;
    return (x, y, z) => { const px = x - a[0], py = y - a[1], pz = z - a[2]; const h = clamp((px * bax + py * bay + pz * baz) / bb, 0, 1); const dx = px - bax * h, dy = py - bay * h, dz = pz - baz * h; return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r0 + (r1 - r0) * h); };
  }
  const sphere = (c, r) => (x, y, z) => Math.hypot(x - c[0], y - c[1], z - c[2]) - r;
  const rbox = (c, h, r) => (x, y, z) => { const qx = Math.abs(x - c[0]) - h[0] + r, qy = Math.abs(y - c[1]) - h[1] + r, qz = Math.abs(z - c[2]) - h[2] + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r; };
  const cylY = (cx, cz, y0, y1, r) => (x, y, z) => { const d = Math.hypot(x - cx, z - cz) - r, e = Math.max(y0 - y, y - y1); return Math.min(Math.max(d, e), 0) + Math.hypot(Math.max(d, 0), Math.max(e, 0)); };
  // клинок: ромб в сечении (ребро посередине), сужается к острию
  const bladeY = (y0, y1, hw, ht, tip) => (x, y, z) => {
    const t = (y - y0) / (y1 - y0);
    let w = hw * (1 - t * 0.12);
    if (y > y1 - tip) w *= clamp((y1 - y) / tip, 0, 1);
    const th = ht * (w / hw + 0.15);
    const d2 = (Math.abs(x) * th + Math.abs(z) * w - w * th) / Math.hypot(w, th);
    const dy = Math.max(y0 - y, y - y1);
    return Math.max(d2, dy);
  };
  const octa = (c, r, sy) => (x, y, z) => (Math.abs(x - c[0]) + Math.abs((y - c[1]) / sy) + Math.abs(z - c[2]) - r) * 0.55;
  // плоская фигура (клинок, лезвие топора) с толщиной th посередине и скосом к кромке
  function sdPoly(v, px, py) {
    let d = (px - v[0][0]) ** 2 + (py - v[0][1]) ** 2, sg = 1;
    for (let i = 0, j = v.length - 1; i < v.length; j = i, i++) {
      const ex = v[j][0] - v[i][0], ey = v[j][1] - v[i][1], wx = px - v[i][0], wy = py - v[i][1];
      const h = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1), bx = wx - ex * h, by = wy - ey * h;
      d = Math.min(d, bx * bx + by * by);
      const c1 = py >= v[i][1], c2 = py < v[j][1], c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) sg = -sg;
    }
    return sg * Math.sqrt(d);
  }
  // gr — дол: желобок по оси клинка [ширина, низ, верх, глубина]
  const plate = (poly, th, bevel, edge, gr) => (x, y, z) => {
    const d = sdPoly(poly, x, y);
    let t = (edge || 0.012) + (th - (edge || 0.012)) * clamp(-d / bevel, 0, 1);
    if (gr && y > gr[1] && y < gr[2]) { const k = clamp(1 - Math.abs(x) / gr[0], 0, 1) * clamp(Math.min(y - gr[1], gr[2] - y) / 0.15, 0, 1); t -= gr[3] * Math.sqrt(k); }
    return Math.max(d, Math.abs(z) - t);
  };
  const polyBox = (poly, th) => { const b = [1e9, 1e9, -th - 0.02, -1e9, -1e9, th + 0.02]; for (const [x, y] of poly) { b[0] = Math.min(b[0], x - 0.02); b[1] = Math.min(b[1], y - 0.02); b[3] = Math.max(b[3], x + 0.02); b[4] = Math.max(b[4], y + 0.02); } return b; };
  const arc = (cx, cy, rx, ry, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
  const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b * (1 - h) + a * h - k * h * (1 - h); };

  // ============================================================
  // Модель: кулак, обнимающий рукоять (ось — вверх), и то, что в руке
  // ============================================================
  // часть: { f, mat, id, g — группа для мягкого слияния, box: [x0,y0,z0,x1,y1,z1] }
  function boxOfCapsule(a, b, r) { return [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r]; }
  // Рукоять — по оси Y. Глаз смотрит с +Z: ладонь и предплечье — ближе к глазу, пальцы обнимают
  // рукоять с дальней стороны, большой палец ложится сверху поперёк указательного.
  const WRIST = [0.5, -0.32, 1.55];
  function handParts(P, gloveMat, out) {
    const skin = gloveMat || 'skin';
    let id = 10;
    const add = (f, mat, box, g, ex) => out.push(Object.assign({ f, mat, id: id, g: g || 'hand', box }, ex || {}));
    const cap = (a, b, r0, r1, mat, g, ex) => add(capsule(a, b, r0, r1), mat, boxOfCapsule(a, b, Math.max(r0, r1)), g, ex);
    // точка вокруг рукояти: угол 0 — справа, 90° — дальняя сторона, 180° — слева
    const at = (R, deg, y) => { const a = deg * Math.PI / 180; return [R * Math.cos(a), y, -R * Math.sin(a)]; };
    // пальцы: указательный сверху … мизинец снизу (высота, толщина, длина)
    const FING = [[0.6, 0.2, 1.0], [0.19, 0.212, 1.04], [-0.22, 0.2, 0.98], [-0.6, 0.172, 0.86]];
    for (const [fy, r, k] of FING) {
      id++;
      const R = 0.29 + r * 0.98;
      const mcp = [0.64 - (1 - k) * 0.12, fy + 0.03, 0.06 + (1 - k) * 0.25];
      const pip = at(R + 0.03, 72, fy), dip = at(R, 72 + 66 * k, fy - 0.02), tip = at(R - 0.02, 72 + 66 * k + 52 * k, fy - 0.04);
      cap(mcp, pip, r * 1.08, r * 1.02, skin);
      cap(pip, dip, r * 1.02, r * 0.95, skin);
      cap(dip, tip, r * 0.95, r * 0.86, skin);
      add(sphere(mcp, r * 1.12), skin, boxOfCapsule(mcp, mcp, r * 1.15)); // костяшка на тыльной стороне
      add(sphere(pip, r * 1.06), skin, boxOfCapsule(pip, pip, r * 1.08));
    }
    // тыльная сторона кисти и ладонь
    id++;
    add(rbox([0.5, 0.02, 0.62], [0.2, 0.74, 0.56], 0.17), skin, [0.25, -0.8, 0.0, 0.75, 0.8, 1.22]);
    add(capsule([0.28, -0.6, 0.62], [0.32, -0.2, 0.7], 0.27, 0.27), skin, [0.0, -0.9, 0.3, 0.6, 0.1, 1.0]); // ребро ладони
    // большой палец: от подушечки у запястья — вверх и поперёк указательного
    id++;
    add(sphere([0.2, 0.52, 0.62], 0.33), skin, [-0.15, 0.17, 0.27, 0.55, 0.87, 0.97]);
    cap([0.2, 0.62, 0.62], [-0.04, 0.96, 0.3], 0.25, 0.22, skin);
    cap([-0.04, 0.96, 0.3], [-0.36, 0.95, 0.02], 0.22, 0.19, skin);
    cap([-0.36, 0.95, 0.02], [-0.5, 0.86, -0.26], 0.19, 0.165, skin);
    // запястье и предплечье — к глазу и вниз
    id++;
    cap([0.46, -0.08, 1.05], [0.5, -0.32, 1.55], 0.4, 0.38, skin);
    id++;
    // ближе к глазу рука толще — как в перспективе
    const A0 = WRIST, A1 = [0.9, -4.2, 4.6];
    cap(A0, A1, 0.39, 0.86, 'bracer', 'arm', { axis: [A0, A1], skin });
  }
  // то, что в руке
  // оружие строится плоскостью клинка по X; в руке клинок повёрнут плашмя к глазу
  const WR = 1.2;
  function weaponParts(kind, b, out) {
    const n0 = out.length;
    weaponLocal(kind, b, out);
    const c = Math.cos(WR), s = Math.sin(WR);
    for (let i = n0; i < out.length; i++) {
      const p = out[i], f = p.f;
      p.f = (x, y, z) => f(x * c + z * s, y, -x * s + z * c);
      if (p.box) {
        const b = p.box, nb = [1e9, b[1], 1e9, -1e9, b[4], -1e9];
        for (const lx of [b[0], b[3]]) for (const lz of [b[2], b[5]]) { const x = lx * c - lz * s, z = lx * s + lz * c; nb[0] = Math.min(nb[0], x); nb[3] = Math.max(nb[3], x); nb[2] = Math.min(nb[2], z); nb[5] = Math.max(nb[5], z); }
        p.box = nb;
      }
    }
  }
  function weaponLocal(kind, b, out) {
    let id = 40;
    const add = (f, mat, box) => out.push({ f, mat, id: id++, g: 'w' + id, box });
    const cap = (a, c, r0, r1, mat) => add(capsule(a, c, r0, r1), mat, boxOfCapsule(a, c, Math.max(r0, r1)));
    const grip = (y0, y1, r, mat) => add(cylY(0, 0, y0, y1, r), mat || 'wrap', [-r, y0, -r, r, y1, r]);
    const haft = (y0, y1, r, mat) => add(cylY(0, 0, y0, y1, r), mat || 'wood', [-r, y0, -r, r, y1, r]);
    const blade = (poly, th, bevel, mat, gr) => add(plate(poly, th, bevel, 0.012, gr), mat || 'steel', polyBox(poly, th));
    const fancy = /heir|dawn|spite/.test(b), bm = /dawn/.test(b) ? 'dawn' : /spite/.test(b) ? 'spite' : 'steel', gm = fancy ? 'gold' : 'steeldark';
    switch (kind) {
      case 'fist': out.push({ f: cylY(0, 0, -0.75, 0.75, 0.3), mat: out[0].mat, id: 18, g: 'hand', box: [-0.3, -0.75, -0.3, 0.3, 0.75, 0.3] }); break;
      case 'knife': grip(-0.9, 1.0, 0.22, 'wood'); add(rbox([0, 1.05, 0], [0.16, 0.08, 0.12], 0.04), 'steeldark', [-0.2, 0.9, -0.2, 0.2, 1.2, 0.2]); blade([[-0.14, 1.1], [0.24, 1.1], [0.26, 2.0], [-0.04, 2.85], [-0.14, 2.2]], 0.07, 0.14); break;
      case 'dagger': {
        grip(-0.95, 1.05, 0.24);
        cap([-0.62, 1.22, 0], [0.62, 1.22, 0], 0.11, 0.11, 'gold');
        for (const s of [-1, 1]) cap([s * 0.6, 1.24, 0], [s * 0.78, 1.5, 0], 0.08, 0.02, 'gold');
        add(sphere([0, 1.24, 0.08], 0.11), 'gem', [-0.12, 1.1, -0.05, 0.12, 1.36, 0.2]);
        blade([[-0.36, 1.3], [0.36, 1.3], [0.3, 2.1], [0.24, 3.0], [0, 3.75], [-0.24, 3.0], [-0.3, 2.1]], 0.09, 0.2);
        add(sphere([0, -1.18, 0], 0.24), 'gold', [-0.25, -1.43, -0.25, 0.25, -0.93, 0.25]);
        break;
      }
      case 'sword': case 'longsword': {
        const L = kind === 'longsword' ? 5.1 : 4.3;
        grip(-1.05, 1.15, 0.255);
        cap([-1.05, 1.32, 0], [1.05, 1.32, 0], 0.15, 0.15, gm);
        for (const s of [-1, 1]) add(sphere([s * 1.12, 1.4, 0], 0.2), gm, [s * 1.12 - 0.22, 1.18, -0.22, s * 1.12 + 0.22, 1.62, 0.22]);
        add(rbox([0, 1.3, 0], [0.26, 0.2, 0.19], 0.06), gm, [-0.3, 1.08, -0.22, 0.3, 1.52, 0.22]);
        if (fancy) add(sphere([0, 1.3, 0.17], 0.12), 'gem', [-0.13, 1.17, 0.02, 0.13, 1.43, 0.3]);
        blade([[-0.44, 1.45], [0.44, 1.45], [0.4, 1.45 + L - 0.95], [0, 1.45 + L], [-0.4, 1.45 + L - 0.95]], 0.12, 0.22, bm, [0.1, 1.6, 1.45 + L * 0.72, 0.06]);
        add(sphere([0, -1.3, 0], 0.27), gm, [-0.28, -1.58, -0.28, 0.28, -1.02, 0.28]);
        break;
      }
      case 'axe': case 'waraxe': {
        const top = 4.3, hy = top - 0.45;
        haft(-1.25, top + 0.2, 0.21);
        // бородатое лезвие: проушина у топорища, щека и широкая дуга кромки
        const head = (sx, k) => [[0.05 * sx, hy + 0.32], [-0.5 * sx * k, hy + 0.26], ...arc(-0.62 * sx * k, hy - 0.05, 0.55 * sx * k, 0.95 * k, Math.PI - 1.25, Math.PI + 1.35, 10).map(([x, y]) => [x - 0.08 * sx, y]), [-0.48 * sx * k, hy - 0.3], [0.05 * sx, hy - 0.32]];
        blade(head(1, kind === 'waraxe' ? 1.15 : 1), 0.12, 0.3);
        if (kind === 'waraxe') blade(head(-1, 0.9), 0.12, 0.3);
        else blade([[0.0, hy + 0.2], [0.55, hy + 0.08], [0.62, hy - 0.04], [0.0, hy - 0.2]], 0.1, 0.1, 'steeldark');
        add(cylY(0, 0, hy - 0.36, hy + 0.36, 0.27), 'steeldark', [-0.28, hy - 0.37, -0.28, 0.28, hy + 0.37, 0.28]);
        break;
      }
      case 'mace': case 'hammer': case 'club': case 'flail': {
        if (kind === 'club') { add(capsule([0, -1.15, 0], [0.06, 3.5, 0], 0.22, 0.5), 'wood', [-0.6, -1.4, -0.6, 0.6, 4.0, 0.6]); for (let i = 0; i < 6; i++) add(sphere([(i % 2 ? 0.4 : -0.38) * (0.6 + i * 0.1), 0.8 + i * 0.5, (i % 3 - 1) * 0.2], 0.13), 'wood', null); break; }
        const bone = /dragonbone/.test(b);
        haft(-1.25, kind === 'flail' ? 1.9 : 3.0, 0.2, bone ? 'bone' : 'wood');
        if (kind === 'hammer') { add(rbox([0, 3.35, 0], [0.8, 0.36, 0.36], 0.06), 'steeldark', [-0.85, 2.95, -0.4, 0.85, 3.75, 0.4]); break; }
        const c = kind === 'flail' ? [-1.05, 0.95, 0.3] : [0, 3.45, 0];
        if (kind === 'flail') for (let i = 0; i < 5; i++) { const t = i / 4; add(sphere([-t * 0.85, 1.9 - t * 0.7, 0.3 * t], 0.08), 'steeldark', null); }
        add(sphere(c, 0.62), 'steeldark', [c[0] - 0.65, c[1] - 0.65, c[2] - 0.65, c[0] + 0.65, c[1] + 0.65, c[2] + 0.65]);
        const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0.7, -0.7, 0], [-0.7, -0.7, 0], [0, 0.7, 0.7], [0, -0.7, 0.7], [0.58, 0.58, 0.58], [-0.58, 0.58, 0.58], [0.58, -0.58, 0.58], [-0.58, -0.58, 0.58]];
        for (const d of dirs) cap([c[0] + d[0] * 0.5, c[1] + d[1] * 0.5, c[2] + d[2] * 0.5], [c[0] + d[0] * 1.02, c[1] + d[1] * 1.02, c[2] + d[2] * 1.02], 0.13, 0.015, 'steel');
        break;
      }
      case 'spear': case 'trident': {
        haft(-1.25, 6.2, 0.18);
        if (kind === 'trident') { for (const x of [-0.5, 0, 0.5]) add(bladeY(6.1, x ? 7.1 : 7.5, 0.1, 0.05, 0.35), 'steel', null); cap([-0.52, 6.15, 0], [0.52, 6.15, 0], 0.09, 0.09, 'steeldark'); }
        else { blade([[0, 6.0], [0.36, 6.55], [0.3, 7.1], [0, 7.95], [-0.3, 7.1], [-0.36, 6.55]], 0.1, 0.2, /sun/.test(b) ? 'sun' : 'steel'); add(cylY(0, 0, 5.8, 6.15, 0.21), 'steeldark', [-0.22, 5.78, -0.22, 0.22, 6.17, 0.22]); }
        break;
      }
      case 'staff': {
        const night = /night/.test(b);
        haft(-1.3, 4.95, 0.2, night ? 'wooddark' : 'wood');
        for (const y of [1.9, 3.6]) add(cylY(0, 0, y - 0.08, y + 0.08, 0.24), 'gold', [-0.25, y - 0.1, -0.25, 0.25, y + 0.1, 0.25]);
        // когти держателя
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4, ox = Math.cos(a), oz = Math.sin(a); cap([ox * 0.16, 4.9, oz * 0.16], [ox * 0.42, 5.35, oz * 0.42], 0.08, 0.06, 'gold'); cap([ox * 0.42, 5.35, oz * 0.42], [ox * 0.24, 5.8, oz * 0.24], 0.06, 0.03, 'gold'); }
        add(octa([0, 5.62, 0], 0.4, 1.7), night ? 'nightcrystal' : 'crystal', [-0.45, 4.9, -0.45, 0.45, 6.35, 0.45]);
        break;
      }
      case 'sickle': case 'scythe': {
        const sc = kind === 'scythe', top = sc ? 4.4 : 1.4, R = sc ? 1.55 : 0.95;
        haft(-1.2, top + 0.15, 0.18);
        // полумесяц: внешняя дуга и внутренняя, острие загнуто вниз
        const outer = arc(-R * 0.95, top, R, R * 0.85, 0.05, Math.PI * 0.98, 12), inner = arc(-R * 0.95, top - R * 0.12, R * 0.82, R * 0.58, Math.PI * 0.98, 0.12, 12);
        blade(outer.concat(inner), 0.08, 0.16);
        break;
      }
      case 'bow': case 'crossbow': {
        const pts = [];
        for (let i = 0; i <= 12; i++) { const t = i / 12 * 2 - 1; pts.push([-0.15 - Math.cos(t * 1.25) * 0.75, t * 3.0, -0.1]); }
        for (let i = 0; i < 12; i++) cap(pts[i], pts[i + 1], 0.13 - Math.abs(i - 6) * 0.008, 0.13 - Math.abs(i + 1 - 6) * 0.008, kind === 'crossbow' ? 'steeldark' : 'wood');
        cap([pts[0][0] + 0.02, pts[0][1], -0.1], [pts[12][0] + 0.02, pts[12][1], -0.1], 0.025, 0.025, 'bone');
        break;
      }
      case 'sling': cap([0, 0.6, 0], [-0.25, -2.2, 0.3], 0.06, 0.06, 'strap'); add(sphere([-0.28, -2.4, 0.32], 0.25), 'bracer', null); break;
      case 'pick': haft(-1.25, 3.5, 0.2); cap([0, 3.7, 0], [-1.35, 3.4, 0], 0.17, 0.05, 'steeldark'); cap([0, 3.7, 0], [1.35, 3.4, 0], 0.17, 0.05, 'steeldark'); add(rbox([0, 3.68, 0], [0.24, 0.24, 0.24], 0.05), 'steeldark', null); break;
      case 'shovel': haft(-1.25, 3.3, 0.18); add(rbox([0, 3.95, 0], [0.5, 0.62, 0.05], 0.12), 'steeldark', [-0.55, 3.25, -0.1, 0.55, 4.6, 0.1]); break;
      case 'torch': haft(-1.2, 2.5, 0.17, 'wood'); add(capsule([0, 2.3, 0], [0, 2.95, 0], 0.3, 0.33), 'rag', [-0.36, 1.95, -0.36, 0.36, 3.3, 0.36]); break;
    }
  }

  // ============================================================
  // Отрисовка объёма: лучи, свет, тени — по кусочку за кадр
  // ============================================================
  const L1 = (() => { const v = [-0.55, 0.72, 0.48], l = Math.hypot(...v); return v.map((x) => x / l); })();  // тёплый ключевой свет
  const L2 = (() => { const v = [0.65, -0.35, 0.45], l = Math.hypot(...v); return v.map((x) => x / l); })();  // холодный подсвет
  const L3 = (() => { const v = [0.85, 0.25, -0.5], l = Math.hypot(...v); return v.map((x) => x / l); })();   // контровой край
  function rotMat(rx, ry, rz) {
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    // вид = Rz * Rx * Ry (модель → вид)
    const Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy], Rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx], Rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
    const m = (A, B) => { const o = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o.push(A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]); return o; };
    return m(Rz, m(Rx, Ry));
  }
  // задание на рисунок: модель → буферы (свет, материал, часть, глубина)
  function makeJob(parts, opt) {
    const M = rotMat(opt.rx, opt.ry, opt.rz), Mi = [M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]];
    const pv = opt.pivot || [0, 0, 0];
    const toView = (p) => { const x = p[0] - pv[0], y = p[1] - pv[1], z = p[2] - pv[2]; return [M[0] * x + M[1] * y + M[2] * z, M[3] * x + M[4] * y + M[5] * z, M[6] * x + M[7] * y + M[8] * z]; };
    // рамки частей в виде
    let vb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const p of parts) {
      if (!p.box) { p.vbox = null; continue; }
      const b = p.box, vbx = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
      for (let k = 0; k < 8; k++) { const c = toView([b[k & 1 ? 3 : 0], b[k & 2 ? 4 : 1], b[k & 4 ? 5 : 2]]); for (let i = 0; i < 3; i++) { vbx[i] = Math.min(vbx[i], c[i]); vbx[i + 3] = Math.max(vbx[i + 3], c[i]); } }
      p.vbox = vbx;
      for (let i = 0; i < 3; i++) { vb[i] = Math.min(vb[i], vbx[i]); vb[i + 3] = Math.max(vb[i + 3], vbx[i + 3]); }
    }
    // части без рамки — рамка из соседей (мелочь: шипы, сучки)
    for (const p of parts) if (!p.vbox) p.vbox = vb.slice();
    const S = opt.ss, ppu = opt.ppu * S;
    // кадр: рука по низу может уходить за край
    const x0 = vb[0] - 0.1, x1 = vb[3] + 0.1, y0 = Math.max(vb[1], opt.cutY == null ? -1e9 : opt.cutY) - 0.1, y1 = vb[4] + 0.1;
    const W = Math.ceil((x1 - x0) * ppu), H = Math.ceil((y1 - y0) * ppu);
    return { parts, M, Mi, pv, x0, y0, x1, y1, W, H, S, ppu, row: 0, lit: new Float32Array(W * H), mat: new Int16Array(W * H).fill(-1), pid: new Int16Array(W * H).fill(-1), dep: new Float32Array(W * H), nrm: new Float32Array(W * H * 3) };
  }
  function sceneSD(job, cand, vx, vy, vz, want) {
    const Mi = job.Mi, pv = job.pv;
    const x = Mi[0] * vx + Mi[1] * vy + Mi[2] * vz + pv[0], y = Mi[3] * vx + Mi[4] * vy + Mi[5] * vz + pv[1], z = Mi[6] * vx + Mi[7] * vy + Mi[8] * vz + pv[2];
    let best = 1e9, bp = null, hand = 1e9, hp = null, bestHandPart = 1e9;
    for (const p of cand) {
      const d = p.f(x, y, z);
      if (p.g === 'hand') { if (d < bestHandPart) { bestHandPart = d; hp = p; } hand = hand === 1e9 ? d : smin(hand, d, 0.05); }
      else if (d < best) { best = d; bp = p; }
    }
    if (hand < best) { best = hand; bp = hp; }
    if (want) want.p = bp;
    return best;
  }
  // часть работы: несколько строк за раз
  function runJob(job, until) {
    const { W, H, ppu, x0, y1, parts } = job;
    const out = { p: null };
    while (job.row < H) {
      const j = job.row++;
      const vy = y1 - (j + 0.5) / ppu;
      for (let i = 0; i < W; i++) {
        const vx = x0 + (i + 0.5) / ppu;
        const cand = [];
        let z1 = -1e9, z0 = 1e9;
        for (const p of parts) { const b = p.vbox; if (vx < b[0] - 0.05 || vx > b[3] + 0.05 || vy < b[1] - 0.05 || vy > b[4] + 0.05) continue; cand.push(p); z1 = Math.max(z1, b[5]); z0 = Math.min(z0, b[2]); }
        if (!cand.length) continue;
        let z = z1 + 0.05, hit = false;
        for (let s = 0; s < 90 && z > z0 - 0.05; s++) {
          const d = sceneSD(job, cand, vx, vy, z, null);
          if (d < 0.004) { hit = true; break; }
          z -= Math.max(d * 0.9, 0.004);
        }
        if (!hit) continue;
        const k = j * W + i;
        sceneSD(job, cand, vx, vy, z, out);
        const p = out.p;
        // нормаль
        const e = 0.008;
        const nx = sceneSD(job, cand, vx + e, vy, z, null) - sceneSD(job, cand, vx - e, vy, z, null);
        const ny = sceneSD(job, cand, vx, vy + e, z, null) - sceneSD(job, cand, vx, vy - e, z, null);
        const nz = sceneSD(job, cand, vx, vy, z + e, null) - sceneSD(job, cand, vx, vy, z - e, null);
        const nl = Math.hypot(nx, ny, nz) || 1;
        const n = [nx / nl, ny / nl, nz / nl];
        // затенение во впадинах
        let ao = 0;
        for (let q = 1; q <= 3; q++) { const h = q * 0.07; ao += (h - sceneSD(job, cand, vx + n[0] * h, vy + n[1] * h, z + n[2] * h, null)) / h; }
        ao = clamp(1 - ao * 0.22, 0.25, 1);
        // тень от себя: большой палец на пальцах, гарда на кулаке
        let sh = 1, t = 0.04;
        // тень бросают только части, мимо которых проходит луч к свету
        const sx0 = vx + L1[0] * 1.6, sy1 = vy + L1[1] * 1.6, sz1 = z + L1[2] * 1.6, shc = [];
        for (const q of parts) { const b = q.vbox; if (b[3] < sx0 - 0.05 || b[0] > vx + 0.05 || b[4] < vy - 0.05 || b[1] > sy1 + 0.05 || b[5] < z - 0.05 || b[2] > sz1 + 0.05) continue; shc.push(q); }
        for (let q = 0; q < 14 && t < 1.6 && shc.length; q++) { const d = sceneSD(job, shc, vx + L1[0] * t, vy + L1[1] * t, z + L1[2] * t, null); sh = Math.min(sh, clamp(10 * d / t, 0, 1)); if (sh < 0.05) break; t += Math.max(0.03, d); }
        const metal = METAL.has(p.mat);
        let I;
        const dif = Math.max(0, n[0] * L1[0] + n[1] * L1[1] + n[2] * L1[2]);
        const fil = Math.max(0, n[0] * L2[0] + n[1] * L2[1] + n[2] * L2[2]);
        const rim = Math.pow(Math.max(0, n[0] * L3[0] + n[1] * L3[1] + n[2] * L3[2]), 2) * (1 - Math.max(0, n[2]) * 0.6);
        if (metal) {
          // металл: отражает небо (светлее сверху) и даёт острый блик
          const rx = 2 * n[2] * n[0], ry = 2 * n[2] * n[1], rz = 2 * n[2] * n[2] - 1; // отражение взгляда (0,0,-1)
          const env = clamp(0.5 - rx * 1.7 + ry * 0.6, 0, 1);
          const spec = Math.pow(Math.max(0, rx * L1[0] + ry * L1[1] + rz * L1[2]), 24) * sh;
          I = 0.26 * ao + 0.62 * dif * (0.4 + 0.6 * sh) + 0.22 * env + 0.9 * spec + 0.25 * rim;
        } else {
          I = 0.24 * ao + 0.72 * dif * (0.35 + 0.65 * sh) * (0.7 + 0.3 * ao) + 0.16 * fil * ao + 0.4 * rim * ao;
        }
        job.lit[k] = I;
        job.mat[k] = MATS.indexOf(p.mat);
        job.pid[k] = p.id;
        job.dep[k] = z;
        // ремешки наруча и обмотка рукояти — узор по месту
        if (p.mat === 'bracer' || p.mat === 'wrap') {
          const Mi = job.Mi, pv = job.pv;
          const mx = Mi[0] * vx + Mi[1] * vy + Mi[2] * z + pv[0], my = Mi[3] * vx + Mi[4] * vy + Mi[5] * z + pv[1], mz = Mi[6] * vx + Mi[7] * vy + Mi[8] * z + pv[2];
          if (p.mat === 'bracer') {
            const [A0, A1] = p.axis, dx = A1[0] - A0[0], dy = A1[1] - A0[1], dz = A1[2] - A0[2];
            const tt = ((mx - A0[0]) * dx + (my - A0[1]) * dy + (mz - A0[2]) * dz) / (dx * dx + dy * dy + dz * dz);
            if (tt < 0.12) job.mat[k] = MATS.indexOf(p.skin);
            else if (Math.abs((tt - 0.12) * 4.2 % 1 - 0.5) < 0.1) { job.mat[k] = MATS.indexOf('strap'); job.lit[k] *= 0.9; }
            else if (Math.abs((tt - 0.12) * 4.2 % 1 - 0.5) < 0.16 && Math.abs(mx - A0[0] - dx * tt - 0.32) < 0.08) job.lit[k] += 0.35;
          }
          else { const band = (my * 3.2 + Math.atan2(mz, mx) * 0.32) % 1; if (Math.abs(band) < 0.18 || Math.abs(band) > 0.82) job.lit[k] *= 0.6; }
        }
        if (p.mat === 'wood' || p.mat === 'wooddark') { const Mi = job.Mi; const my = Mi[3] * vx + Mi[4] * vy + Mi[5] * z; job.lit[k] *= 0.9 + 0.12 * Math.sin(my * 9 + Math.sin(vx * 13) * 2); }
      }
      if (performance.now() > until) return false;
    }
    return true;
  }
  const MATS = ['skin', 'glove', 'wool', 'gauntlet', 'bracer', 'strap', 'wrap', 'wood', 'wooddark', 'bone', 'rag', 'steel', 'steeldark', 'gold', 'dawn', 'spite', 'gem', 'crystal', 'nightcrystal', 'sun'];

  // ============================================================
  // Из объёма — в пиксель-арт: палитра, обводка, складки
  // ============================================================
  const B2 = [[0, 0.5], [0.75, 0.25]];
  function pixelize(job, P) {
    const S = job.S, W = Math.floor(job.W / S), H = Math.floor(job.H / S);
    const n = W * H;
    const lit = new Float32Array(n), mat = new Int16Array(n).fill(-1), pid = new Int16Array(n).fill(-1), dep = new Float32Array(n);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      let c = 0, sum = 0, dz = -1e9; const votes = {};
      for (let b = 0; b < S; b++) for (let a = 0; a < S; a++) {
        const k = (j * S + b) * job.W + i * S + a;
        if (job.mat[k] < 0) continue;
        c++; sum += job.lit[k]; dz = Math.max(dz, job.dep[k]);
        const v = job.mat[k] * 1000 + job.pid[k]; votes[v] = (votes[v] || 0) + 1;
      }
      if (c * 2 < S * S) continue;
      const k = j * W + i;
      let bv = -1, bc = 0; for (const v in votes) if (votes[v] > bc) { bc = votes[v]; bv = +v; }
      lit[k] = sum / c; mat[k] = Math.floor(bv / 1000); pid[k] = bv % 1000; dep[k] = dz;
    }
    const cv = document.createElement('canvas'), em = document.createElement('canvas');
    cv.width = em.width = W; cv.height = em.height = H;
    const ia = cv.getContext('2d').createImageData(W, H), ib = em.getContext('2d').createImageData(W, H);
    const on = (i, j) => i >= 0 && j >= 0 && i < W && j < H && mat[j * W + i] >= 0;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i;
      if (mat[k] < 0) continue;
      const mname = MATS[mat[k]], R = rampOf(mname, P), N = R.length;
      let idx = Math.round(clamp(lit[k], 0, 1.05) / 1.05 * (N - 1) + (B2[j & 1][i & 1] - 0.375) * 0.45);
      idx = clamp(idx, 0, N - 1);
      // складка: сосед — другая часть и ближе к глазу → тёмная линия по шву
      let crease = false;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj;
        if (!on(ii, jj)) continue;
        const kk = jj * W + ii;
        if (pid[kk] !== pid[k] && dep[kk] > dep[k] + 0.06) { crease = true; break; }
      }
      let col = R[idx];
      // обводка силуэта: тёмный цвет того же материала
      const edge = !on(i - 1, j) || !on(i + 1, j) || !on(i, j - 1) || !on(i, j + 1);
      if (edge) col = mixc(R[0], [10, 6, 10], 0.45);
      else if (crease) col = mixc(R[0], R[1], 0.4);
      if (UI.HAND_DEBUG) { const hh = (pid[k] * 0.618) % 1; col = hsl2rgb([hh, 0.7, 0.25 + 0.5 * clamp(lit[k], 0, 1)]); }
      const t = EMISSIVE.has(mname) && !edge ? ib : ia;
      const q = k * 4;
      t.data[q] = col[0]; t.data[q + 1] = col[1]; t.data[q + 2] = col[2]; t.data[q + 3] = 255;
    }
    cv.getContext('2d').putImageData(ia, 0, 0); em.getContext('2d').putImageData(ib, 0, 0);
    // где на картинке точка хвата (центр рукояти) и верх оружия
    const pvx = Math.round((0 - job.x0) * job.ppu / S), pvy = Math.round((job.y1 - 0) * job.ppu / S);
    const sp = (q) => q && [Math.round((q[0] - job.x0) * job.ppu / S), Math.round((job.y1 - q[1]) * job.ppu / S)];
    return { cv, em, w: W, h: H, px: pvx, py: pvy, top: sp(job.topPt), wrist: sp(job.wristPt), grip: sp(job.gripPt) };
  }

  // ============================================================
  // Что в руке
  // ============================================================
  function weaponKind(it) {
    if (!it) return 'fist';
    const b = it.b || '';
    if (/knife/.test(b)) return 'knife';
    if (/dagger|whisper/.test(b)) return 'dagger';
    if (/longsword|spite/.test(b)) return 'longsword';
    if (/sword|blade/.test(b)) return 'sword';
    if (/waraxe/.test(b)) return 'waraxe';
    if (/pickaxe/.test(b)) return 'pick';
    if (/axe/.test(b)) return 'axe';
    if (/warhammer|old_hammer/.test(b)) return 'hammer';
    if (/mace|dragonbone/.test(b)) return 'mace';
    if (/flail/.test(b)) return 'flail';
    if (/club/.test(b)) return 'club';
    if (/trident/.test(b)) return 'trident';
    if (/spear/.test(b)) return 'spear';
    if (/staff/.test(b)) return 'staff';
    if (/scythe/.test(b)) return 'scythe';
    if (/sickle/.test(b)) return 'sickle';
    if (/crossbow/.test(b)) return 'crossbow';
    if (/bow/.test(b)) return 'bow';
    if (/sling/.test(b)) return 'sling';
    if (/shovel/.test(b)) return 'shovel';
    const d = D.items[b];
    return d && d.dmg ? 'sword' : 'fist';
  }
  function gloveMat(P) {
    const g = P.eq && P.eq.hands;
    if (!g) return null;
    if (/gauntlet/.test(g.b)) return 'gauntlet';
    if (/mitten/.test(g.b)) return 'wool';
    return 'glove';
  }
  // позы: покой и удар (удар — свой рисунок: рука повёрнута у запястья)
  // Удар — поворот кисти в запястье (рука с наручем остаётся на месте): замах назад, потом рубящий взмах влево
  const POSE = {
    idle: { rx: 0.6, ry: 0.95, rz: 0.2 },
    wind: { rx: 0.6, ry: 0.95, rz: 0.2, wrist: -0.45 },
    swing: { rx: 0.6, ry: 0.95, rz: 0.2, wrist: 1.05 },
  };
  // повернуть кисть с оружием вокруг оси взгляда через запястье
  function bendWrist(parts, po) {
    const M = rotMat(po.rx, po.ry, po.rz), a = [M[6], M[7], M[8]], W = WRIST;
    const rot = (v, ang) => { const c = Math.cos(ang), s = Math.sin(ang), d = a[0] * v[0] + a[1] * v[1] + a[2] * v[2]; const cx = a[1] * v[2] - a[2] * v[1], cy = a[2] * v[0] - a[0] * v[2], cz = a[0] * v[1] - a[1] * v[0]; return [v[0] * c + cx * s + a[0] * d * (1 - c), v[1] * c + cy * s + a[1] * d * (1 - c), v[2] * c + cz * s + a[2] * d * (1 - c)]; };
    for (const p of parts) {
      if (p.g === 'arm') continue;
      const f = p.f;
      p.f = (x, y, z) => { const q = rot([x - W[0], y - W[1], z - W[2]], -po.wrist); return f(q[0] + W[0], q[1] + W[1], q[2] + W[2]); };
      if (p.box) {
        const b = p.box, nb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
        for (let k = 0; k < 8; k++) { const q = rot([b[k & 1 ? 3 : 0] - W[0], b[k & 2 ? 4 : 1] - W[1], b[k & 4 ? 5 : 2] - W[2]], po.wrist); for (let i = 0; i < 3; i++) { nb[i] = Math.min(nb[i], q[i] + W[i]); nb[i + 3] = Math.max(nb[i + 3], q[i] + W[i]); } }
        p.box = nb;
      }
    }
  }

  // ============================================================
  // Кэш рисунков и задания «в фоне»
  // ============================================================
  const done = new Map(), jobs = new Map();
  function want(key, build, keep) {
    keep.add(key);
    const d = done.get(key);
    if (d) return d;
    if (!jobs.has(key)) jobs.set(key, build());
    return null;
  }
  function pump(budget, keep) {
    for (const key of [...jobs.keys()]) if (!keep.has(key)) jobs.delete(key); // сменил оружие — старое не дорисовываем
    const until = performance.now() + budget;
    for (const [key, j] of jobs) {
      if (runJob(j.job, until)) { done.set(key, pixelize(j.job, j.P)); jobs.delete(key); if (done.size > 24) done.delete(done.keys().next().value); }
      if (performance.now() > until) break;
    }
  }
  // где у оружия верх (для пламени факела и следа удара)
  const TIP = { fist: 0.8, knife: 2.85, dagger: 3.75, sword: 5.75, longsword: 6.55, axe: 4.5, waraxe: 4.5, hammer: 3.7, mace: 4.45, club: 3.9, flail: 1.9, spear: 7.95, trident: 7.5, staff: 6.3, sickle: 2.2, scythe: 5.8, bow: 3, crossbow: 3, sling: 0.6, pick: 3.7, shovel: 4.6, torch: 2.95 };
  function buildJob(kind, it, P, pose, ppu) {
    const parts = [];
    handParts(P, gloveMat(P), parts);
    weaponParts(kind, (it && it.b) || '', parts);
    const po = POSE[pose];
    if (po.wrist) bendWrist(parts, po);
    const job = makeJob(parts, { rx: po.rx, ry: po.ry, rz: po.rz, ppu, ss: UI.HAND_SS || 1, cutY: -4.0, pivot: [0, 0, 0] });
    // верх оружия и рукоять поворачиваются вместе с кистью
    const bend = (q) => { if (!po.wrist) return q; const M = rotMat(po.rx, po.ry, po.rz), a = [M[6], M[7], M[8]], W = WRIST, c = Math.cos(po.wrist), sn = Math.sin(po.wrist), v = [q[0] - W[0], q[1] - W[1], q[2] - W[2]], d = a[0] * v[0] + a[1] * v[1] + a[2] * v[2]; return [v[0] * c + (a[1] * v[2] - a[2] * v[1]) * sn + a[0] * d * (1 - c) + W[0], v[1] * c + (a[2] * v[0] - a[0] * v[2]) * sn + a[1] * d * (1 - c) + W[1], v[2] * c + (a[0] * v[1] - a[1] * v[0]) * sn + a[2] * d * (1 - c) + W[2]]; };
    const tp = bend([0, TIP[kind] || 1, 0]), gp = bend([0, 0, 0]);
    const M = job.M;
    const vw = (q) => [M[0] * q[0] + M[1] * q[1] + M[2] * q[2], M[3] * q[0] + M[4] * q[1] + M[5] * q[2]];
    job.topPt = vw(tp); job.wristPt = vw(WRIST); job.gripPt = vw(gp);
    return { job, P };
  }
  UI.handKind = () => weaponKind(G.P && G.P.eq.hand);
  // для проверки и снимков: позы, рисунок сразу целиком, готовность; а также UI.HAND_SW (фаза удара),
  // UI.HAND_BUDGET (мс на кадр), UI.HAND_SS (сглаживание), UI.HAND_DEBUG (части разными цветами)
  UI.HAND_POSE = POSE;
  UI.handSpriteSync = (kind, it, pose, ppu) => { const j = buildJob(kind, it, G.P, pose || 'idle', ppu || 16); runJob(j.job, 1e15); return pixelize(j.job, G.P); };
  UI.handReady = () => jobs.size === 0;

  // ---------- пламя факела: живое, рисуется каждый кадр ----------
  function drawFlame(c, x, y, s, t) {
    for (let yy = -16; yy <= 0; yy++) for (let xx = -6; xx <= 6; xx++) {
      const h = -yy / 16;
      const wv = Math.sin(yy * 0.6 + t * 9) * 1.4 + Math.sin(yy * 1.3 - t * 13) * 0.6;
      const w = (1 - Math.pow(h, 1.5)) * 5.2;
      const dx = Math.abs(xx - wv * h);
      if (dx > w) continue;
      const k = 1 - dx / Math.max(1, w);
      c.fillStyle = k > 0.62 && h < 0.55 ? '#fff4c8' : k > 0.3 ? '#ffb040' : '#e85a18';
      c.fillRect(Math.round(x + xx * s), Math.round(y + yy * s), Math.ceil(s), Math.ceil(s));
    }
  }
  // след удара: бледная дуга по пути острия
  function drawSmear(c, cx, cy, a0, a1, r, w, k) {
    const n = Math.ceil(Math.abs(a1 - a0) * r / Math.max(1, w * 0.6));
    for (let i = 0; i <= n; i++) {
      const f = i / n, a = a0 + (a1 - a0) * f, al = k * f * f * 0.55;
      if (al < 0.03) continue;
      for (let j = 0; j < 3; j++) {
        const rr = r * (1 - j * 0.09);
        c.fillStyle = 'rgba(' + (j ? '210,225,240' : '255,255,255') + ',' + (al * (1 - j * 0.3)).toFixed(3) + ')';
        c.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), Math.ceil(w), Math.ceil(w));
      }
    }
  }

  // ============================================================
  // Кадр
  // ============================================================
  let HC = null, TC = null, shown = null;
  const MELEE_THRUST = new Set(['staff', 'spear', 'trident']), RANGED = new Set(['bow', 'crossbow', 'sling']);
  // спрайты одной руки: покой и (для рубящего) замах и взмах
  function handSet(kind, it, P, ppu, gk, keep, needSwing) {
    const kb = kind + '|' + ((it && it.b) || '') + '|' + (P.skin || 0) + '|' + gk + '|' + ppu;
    const idle = want(kb + '|idle', () => buildJob(kind, it, P, 'idle', ppu), keep);
    const slash = !MELEE_THRUST.has(kind) && !RANGED.has(kind) && kind !== 'fist' && kind !== 'torch';
    let wind = null, swing = null;
    if (idle && slash && needSwing) { wind = want(kb + '|wind', () => buildJob(kind, it, P, 'wind', ppu), keep); swing = want(kb + '|swing', () => buildJob(kind, it, P, 'swing', ppu), keep); }
    return { kind, kb, idle, wind, swing };
  }
  // где спрайт в момент удара: sw — 0…1 от начала удара
  function strikePose(hs, sw, u) {
    const r = { spr: hs.idle, dx: 0, dy: 0, smear: 0 };
    if (!(sw >= 0 && sw < 1)) return r;
    const k = Math.sin(sw * Math.PI), kind = hs.kind;
    if (RANGED.has(kind)) r.dy = k * 8 * u;
    else if (MELEE_THRUST.has(kind)) { r.dy = -k * 24 * u; r.dx = -k * 8 * u; }
    else if (kind === 'fist' || kind === 'torch') { r.dx = -k * 30 * u; r.dy = -k * 16 * u; }
    else if (hs.wind && hs.swing) {
      // замах → взмах (со следом) → возврат; кисть поворачивается в запястье, а рука чуть подаётся, чтобы кулак не уходил за край
      const lift = (sp, q) => [(sp.px - sp.grip[0]) * q, (sp.py - sp.grip[1]) * q];
      if (sw < 0.2) { r.spr = hs.wind; const e = sw / 0.2, [lx, ly] = lift(hs.wind, 0.5); r.dx = lx + 4 * u * e; r.dy = ly - 4 * u * e; }
      else if (sw < 0.6) { r.spr = hs.swing; const e = (sw - 0.2) / 0.4, [lx, ly] = lift(hs.swing, 0.75); r.dx = lx - 10 * u + 4 * u * e; r.dy = ly - 2 * u + 4 * u * e; r.smear = 1 - e; }
      else { const e = (sw - 0.6) / 0.4; r.dx = -6 * u * (1 - e); r.dy = 4 * u * (1 - e); }
    } else { r.dx = -k * 22 * u; r.dy = k * 12 * u; }
    return r;
  }
  UI.drawHand3D = function (ctx, v) {
    const P = G.P;
    if (!P || P.dead) return;
    const fw = v.fw, fh = v.fh;
    const base = Math.min(fh, fw * 1.15);
    const ppu = Math.max(10, Math.round(base * 0.122));
    const left = P.hand === 'L';
    const gk = (P.eq.hands && P.eq.hands.b) || '';
    const keep = new Set();
    const RT = E.RT;
    const swM = UI.HAND_SW != null ? UI.HAND_SW : RT ? (v.now - (RT.swing || 0)) / 420 : 9;
    const swO = UI.HAND_SW_OFF != null ? UI.HAND_SW_OFF : RT ? (v.now - (RT.swingOff || 0)) / 420 : 9;
    // главная рука и вторая: оружие, горящий факел или пустой кулак (пустую вторую руку не показываем)
    const main = handSet(weaponKind(P.eq.hand), P.eq.hand, P, ppu, gk, keep, true);
    const offIt = P.eq.off;
    let off = null;
    if (main.idle) {
      if (offIt) off = handSet(weaponKind(offIt), offIt, P, ppu, gk, keep, true);
      else if (P.light > 0) off = handSet('torch', null, P, ppu, gk, keep, false);
      else if (swO >= 0 && swO < 1 && !(E.Gm.twoHanded && E.Gm.twoHanded(P.eq.hand))) off = handSet('fist', null, P, ppu, gk, keep, false);
    }
    // рисуем по кусочку за кадр; пока руки нет совсем — щедрее
    pump(UI.HAND_BUDGET || (main.idle || shown ? 8 : 40), keep);
    let idle = main.idle || done.get(main.kb + '|idle');
    if (idle) { shown = idle; main.idle = idle; } else if (shown) main.idle = idle = shown; else return;
    // свет вокруг: небо, солнце, огни
    const sk = v.sky;
    let L = [0.07, 0.065, 0.08];
    for (let i = 0; i < 3; i++) L[i] += sk.amb[i] * (v.inside ? 0.7 : 1.05) + sk.sun[i] * (v.inside ? 0.12 : 0.6);
    for (const l of v.lights.slice(0, 4)) { const d = Math.hypot(l.x - (v.cam ? v.cam.x : l.x), l.z - (v.cam ? v.cam.z : l.z)); const a = Math.max(0, 1 - d / l.r); for (let i = 0; i < 3; i++) L[i] += l.col[i] * l.i * a * a * 0.8; }
    if (P.light > 0) { L[0] += 0.5; L[1] += 0.33; L[2] += 0.16; }
    L = L.map((x) => Math.min(1.0, x));
    // покачивание на ходу
    const t = v.now / 1000, u = ppu / 12;
    let bx = Math.sin((v.walked || 0) * 2.6) * 2.5 * u, by = Math.abs(Math.cos((v.walked || 0) * 2.6)) * 3.2 * u;
    if (!v.moving) { bx = Math.sin(t * 1.1) * 0.8 * u; by = Math.sin(t * 1.7) * 1.1 * u; }
    if (!HC) { HC = document.createElement('canvas'); TC = document.createElement('canvas'); }
    if (HC.width !== fw || HC.height !== fh) { HC.width = TC.width = fw; HC.height = TC.height = fh; }
    const hc = HC.getContext('2d'), tc = TC.getContext('2d');
    hc.clearRect(0, 0, fw, fh);
    hc.imageSmoothingEnabled = false; tc.imageSmoothingEnabled = false;
    const place = (c, sp, img, px, py, mirror) => {
      c.save();
      c.translate(Math.round(px), Math.round(py));
      if (mirror) c.scale(-1, 1);
      c.drawImage(img, -sp.px, -sp.py);
      c.restore();
    };
    const tint = 'rgb(' + Math.round(L[0] * 255) + ',' + Math.round(L[1] * 255) + ',' + Math.round(L[2] * 255) + ')';
    const lit = (sp, px, py, mirror) => {
      tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, fw, fh);
      place(tc, sp, sp.cv, px, py, mirror);
      tc.globalCompositeOperation = 'multiply'; tc.fillStyle = tint; tc.fillRect(0, 0, fw, fh);
      tc.globalCompositeOperation = 'destination-in'; place(tc, sp, sp.cv, px, py, mirror);
      tc.globalCompositeOperation = 'source-over';
      hc.drawImage(TC, 0, 0);
      place(hc, sp, sp.em, px, py, mirror);
    };
    // точка спрайта → экран (с учётом зеркала)
    const at = (sp, pt, px, py, mirror) => [px + (mirror ? -1 : 1) * (pt[0] - sp.px), py + pt[1] - sp.py];
    // одна рука: hs — спрайты, sw — фаза удара, (hx, hy) — где кулак, mirror — левая рука
    const drawOne = (hs, sw, hx, hy, mirror, bobK) => {
      const r = strikePose(hs, sw, u);
      const spr = r.spr || hs.idle;
      const px = hx + bx * bobK + (mirror ? -r.dx : r.dx), py = hy + by * bobK + r.dy;
      if (r.smear > 0 && hs.idle.top && spr.top) {
        // дуга от верхнего положения острия к нижнему вокруг запястья
        const c0 = at(spr, spr.wrist, px, py, mirror), p0 = at(hs.idle, hs.idle.top, px, py, mirror), p1 = at(spr, spr.top, px, py, mirror);
        const a0 = Math.atan2(p0[1] - c0[1], p0[0] - c0[0]), a1 = Math.atan2(p1[1] - c0[1], p1[0] - c0[0]);
        let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        drawSmear(hc, c0[0], c0[1], a0, a0 + da, Math.hypot(p1[0] - c0[0], p1[1] - c0[1]), Math.max(1, u * 1.2), r.smear);
      }
      lit(spr, px, py, mirror);
      if (hs.kind === 'torch' && spr.top) { const [fx, fy] = at(spr, spr.top, px, py, mirror); drawFlame(hc, fx, fy + u, Math.max(1, Math.round(ppu / 11)), t); }
    };
    // вторая рука — у другого края; факел держат ниже и ближе к краю
    if (off && off.idle) {
      const torch = off.kind === 'torch';
      const ox = left ? fw * (torch ? 0.84 : 0.76) : fw * (torch ? 0.16 : 0.24), oy = fh - base * (torch ? 0.14 : 0.22);
      drawOne(off, swO, ox, oy, !left, -0.6);
    }
    // главная: кулак у нижнего края, оружие тянется вверх
    drawOne(main, swM, left ? fw * 0.28 : fw * 0.72, fh - base * 0.25, left, 1);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(HC, v.vx0, v.vy0, fw * v.px, fh * v.px);
    ctx.restore();
  };
})(window.EOF);
