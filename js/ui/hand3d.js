'use strict';
// Рука героя от первого лица — как в старых RPG: внизу экрана кулак держит то, что в руке.
// Меч, кинжал, топор, булава, копьё, посох с кристаллом, лук, кирка… или просто кулак.
// Правша держит оружие справа, левша — слева; горящий факел — в другой руке.
// Всё рисуется здесь же, по пикселю: части (клинок, гарда, пальцы, наруч) — слоями с тёмной
// обводкой, с бликами и тенями; потом картинка красится светом вокруг (солнце, костёр, ночь).
(function (E) {
  const UI = E.UI, G = E.G, D = E.D, U = E.U;
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const q = (v) => Math.max(0, Math.min(255, Math.round(v / 10) * 10));

  // ---------- маленький художник: слой пикселей ----------
  function Layer(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); this.e = new Uint8Array(w * h); }
  Layer.prototype.set = function (x, y, c, em) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return; const i = y * this.w + x, k = i * 4; this.d[k] = q(c[0]); this.d[k + 1] = q(c[1]); this.d[k + 2] = q(c[2]); this.d[k + 3] = 255; this.e[i] = em ? 1 : 0; };
  Layer.prototype.on = function (x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.d[(y * this.w + x) * 4 + 3] > 0; };
  // многоугольник, цвет — функция точки
  Layer.prototype.poly = function (pts, fn, em) {
    let y0 = 1e9, y1 = -1e9;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) xs.push(a[0] + (y + 0.5 - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, fn(x, y), em);
    }
  };
  // капсула: отрезок с толщиной; fn(x, y, t — вдоль, s — поперёк от −1 до 1)
  Layer.prototype.capsule = function (x0, y0, x1, y1, r0, r1, fn, em) {
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, L = Math.sqrt(L2), nx = -dy / L, ny = dx / L;
    const rr = Math.max(r0, r1);
    for (let y = Math.floor(Math.min(y0, y1) - rr); y <= Math.ceil(Math.max(y0, y1) + rr); y++) for (let x = Math.floor(Math.min(x0, x1) - rr); x <= Math.ceil(Math.max(x0, x1) + rr); x++) {
      const px = x + 0.5 - x0, py = y + 0.5 - y0;
      const t = U.clamp((px * dx + py * dy) / L2, 0, 1);
      const r = r0 + (r1 - r0) * t;
      const ex = px - dx * t, ey = py - dy * t, d = Math.hypot(ex, ey);
      if (d > r) continue;
      this.set(x, y, fn(x, y, t, (ex * nx + ey * ny) / r), em);
    }
  };
  Layer.prototype.ellipse = function (cx, cy, rx, ry, fn, em) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const ux = (x + 0.5 - cx) / rx, uy = (y + 0.5 - cy) / ry, d = ux * ux + uy * uy;
      if (d > 1) continue;
      this.set(x, y, fn(x, y, ux, uy, d), em);
    }
  };
  // тёмная обводка по краю слоя
  Layer.prototype.rim = function (c) {
    const out = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!this.on(x, y) || this.e[y * this.w + x]) continue;
      if (!this.on(x - 1, y) || !this.on(x + 1, y) || !this.on(x, y - 1) || !this.on(x, y + 1)) out.push([x, y]);
    }
    for (const [x, y] of out) { const k = (y * this.w + x) * 4; this.d[k] = q(this.d[k] * 0.35 + c[0] * 0.65); this.d[k + 1] = q(this.d[k + 1] * 0.35 + c[1] * 0.65); this.d[k + 2] = q(this.d[k + 2] * 0.35 + c[2] * 0.65); }
  };
  Layer.prototype.over = function (L) { for (let i = 0; i < L.w * L.h; i++) { const k = i * 4; if (!L.d[k + 3]) continue; this.d[k] = L.d[k]; this.d[k + 1] = L.d[k + 1]; this.d[k + 2] = L.d[k + 2]; this.d[k + 3] = 255; this.e[i] = L.e[i]; } };
  const rnd = (x, y, s) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + (s | 0) * 1013 | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  // ---------- что в руке ----------
  function weaponKind(it) {
    if (!it) return 'fist';
    const b = it.b || '';
    if (/knife/.test(b)) return 'knife';
    if (/dagger|whisper/.test(b)) return 'dagger';
    if (/longsword|spite/.test(b)) return 'longsword';
    if (/sword|blade/.test(b)) return 'sword';
    if (/waraxe/.test(b)) return 'waraxe';
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
    if (/pickaxe/.test(b)) return 'pick';
    if (/shovel/.test(b)) return 'shovel';
    const d = D.items[b];
    return d && d.dmg ? 'sword' : 'fist';
  }
  const SKIN = ['#e8b48c', '#d49a72', '#b97d55', '#8c5a3a', '#f2c9a4', '#6a4028'];
  // перчатки из одежды
  function gloveOf(P) {
    const g = P.eq && P.eq.hands;
    if (!g) return null;
    if (/gauntlet/.test(g.b)) return { c: hex('#9aa4ae'), metal: true };
    if (/mitten/.test(g.b)) return { c: hex('#8a5a4a'), wool: true };
    return { c: hex('#6a4a2c') };
  }

  // ---------- кулак ----------
  // (cx, cy) — середина хвата; рука уходит вниз-вправо (для правой)
  function drawFist(Ls, cx, cy, s, skin, glove, grip) {
    const base = glove ? glove.c : skin;
    const shade = (c, k) => { const v = mix(mul(c, k), [c[0] * 0.55, c[1] * 0.6, c[2] * 0.85], k < 0.85 ? 0.35 : 0); return v; };
    const tex = (x, y) => (glove && glove.wool ? (rnd(x, y, 3) < 0.25 ? 0.9 : 1) : glove && glove.metal ? (y % 3 === 0 ? 0.82 : 1.05) : 1);
    // предплечье и наруч
    const A = Ls.arm;
    const ax0 = cx + 5 * s, ay0 = cy + 14 * s, ax1 = cx + 30 * s, ay1 = cy + 95 * s;
    A.capsule(ax0, ay0, ax1, ay1, 13 * s, 18 * s, (x, y, t, n) => {
      const k = 0.78 + n * 0.25;
      if (t > 0.35) { // кожаный наруч с ремешками
        const strap = Math.abs(((t * 9) % 1) - 0.5) < 0.09;
        const lc = strap ? hex('#3a2414') : mix(hex('#6a4024'), hex('#8a5a34'), rnd(x >> 1, y >> 1, 9) * 0.5);
        return mul(lc, k * (strap ? 1 : 1));
      }
      return shade(base, k * tex(x, y));
    });
    A.rim(hex('#1a0e08'));
    // тыльная сторона ладони
    const H = Ls.hand;
    H.ellipse(cx + 4 * s, cy + 2 * s, 13 * s, 16 * s, (x, y, ux, uy) => shade(base, (0.82 + (-ux * 0.15 - uy * 0.2)) * tex(x, y)));
    H.rim(hex('#2a140a'));
    // пальцы: четыре валика, обнимающих рукоять
    const F = Ls.fing;
    for (let i = 0; i < 4; i++) {
      const fy = cy - 11 * s + i * 7.4 * s;
      F.capsule(cx - 9 * s, fy, cx + 9 * s, fy + 0.6 * s, 3.9 * s, 4.2 * s, (x, y, t, n) => {
        let k = 0.8 + (1 - t) * 0.12 - n * 0.22;
        if (t > 0.78) k += 0.12; // костяшки
        return shade(base, k * tex(x, y));
      });
    }
    F.rim(hex('#2a140a'));
    // большой палец сверху
    const Tm = Ls.thumb;
    Tm.capsule(cx + 8 * s, cy - 6 * s, cx - 7 * s, cy - 14 * s, 4.6 * s, 3.8 * s, (x, y, t, n) => shade(base, (0.9 - n * 0.2 + t * 0.06) * tex(x, y)));
    Tm.rim(hex('#2a140a'));
  }

  // ---------- клинки и древки ----------
  const STEEL = hex('#a4aeb8'), STEEL_D = hex('#5a6470'), GOLD = hex('#c8a040'), WOOD = hex('#7a4e2c'), WOOD_D = hex('#4a2e18');
  function blade(L, cx, y0, len, w0, tipW, s, style) {
    // клинок вверх от гарды: ребро посередине, светлый край слева, крапины ковки
    const pts = [[cx - w0 / 2, y0], [cx + w0 / 2, y0], [cx + tipW / 2, y0 - len * 0.86], [cx, y0 - len], [cx - tipW / 2, y0 - len * 0.86]];
    const base = style === 'dawn' ? hex('#f0d090') : style === 'spite' ? hex('#8a6a8a') : STEEL;
    L.blade.poly(pts, (x, y) => {
      const t = (y0 - y) / len, half = (w0 / 2) * (1 - t * 0.86) + 0.001;
      const u = (x + 0.5 - cx) / Math.max(1, half); // −1 левый край … 1 правый
      let k = 1.05 - (u + 1) * 0.28;
      if (Math.abs(u) < 0.18 && t < 0.82) k = u < 0 ? 1.25 : 0.62; // ребро/дол
      if (u < -0.82) k = 1.35; // заточка
      k *= 0.92 + rnd(x >> 1, y >> 1, 7) * 0.16;
      return mix(mul(base, k), hex('#cfe0f0'), t * 0.15);
    }, style === 'dawn');
    L.blade.rim(hex('#20262c'));
  }
  function guard(L, cx, y, w, s, fancy) {
    L.guard.capsule(cx - w / 2, y, cx + w / 2, y, 2.6 * s, 2.6 * s, (x, yy, t, n) => mul(fancy ? GOLD : hex('#6a5444'), 0.8 - n * 0.3 + Math.sin(t * Math.PI) * 0.2));
    if (fancy) { L.guard.ellipse(cx, y, 3.6 * s, 3.6 * s, (x, yy, ux, uy) => mix(hex('#c03040'), hex('#ff8090'), Math.max(0, -ux - uy) * 0.6)); for (const sx of [-1, 1]) L.guard.ellipse(cx + sx * w / 2, y - 1 * s, 2.4 * s, 3.2 * s, () => mul(GOLD, 0.9)); }
    L.guard.rim(hex('#20160c'));
  }
  function grip(L, cx, y0, y1, s, col) {
    L.grip.capsule(cx, y0, cx, y1, 3.2 * s, 3.2 * s, (x, y, t, n) => { const wrap = ((y / (2.2 * s)) | 0) % 2; return mul(col || hex('#4a2c18'), (0.85 - n * 0.3) * (wrap ? 0.82 : 1.05)); });
    L.grip.rim(hex('#140a04'));
  }
  function pommel(L, cx, y, s, col) { L.guard.ellipse(cx, y, 4.6 * s, 4.2 * s, (x, yy, ux, uy) => mul(col || hex('#8a8070'), 0.8 - ux * 0.2 - uy * 0.25)); L.guard.rim(hex('#20160c')); }
  function haft(L, cx, y0, y1, s, r, col, dark) {
    L.grip.capsule(cx, y0, cx + 2 * s, y1, r, r * 0.9, (x, y, t, n) => mul(mix(col || WOOD, dark || WOOD_D, rnd(x >> 1, y / 3 | 0, 2) * 0.5), 0.95 - n * 0.32));
    L.grip.rim(hex('#140a04'));
  }

  // вся картинка: что в руке + кулак
  function compose(kind, it, P, s, W, H, cx, cy) {
    const mk = () => new Layer(W, H);
    const Ls = { blade: mk(), guard: mk(), grip: mk(), arm: mk(), hand: mk(), fing: mk(), thumb: mk(), glow: mk() };
    const skin = hex(SKIN[(P.skin == null ? 0 : P.skin) % SKIN.length]);
    const glove = gloveOf(P);
    const b = (it && it.b) || '';
    const wy = cy - 9 * s; // оружие чуть выше: гарда — над кулаком
    switch (kind) {
      case 'knife': grip(Ls, cx, wy + 10 * s, wy - 14 * s, s, hex('#6a4a2a')); blade(Ls, cx, wy - 15 * s, 40 * s, 7 * s, 4 * s, s); break;
      case 'dagger': grip(Ls, cx, wy + 12 * s, wy - 15 * s, s); guard(Ls, cx, wy - 17 * s, 26 * s, s, true); blade(Ls, cx, wy - 19 * s, 62 * s, 12 * s, 7 * s, s); pommel(Ls, cx, wy + 15 * s, s, GOLD); break;
      case 'sword': case 'longsword': {
        const len = kind === 'longsword' ? 150 * s : 122 * s, fancy = /heir|dawn|spite/.test(b);
        grip(Ls, cx, wy + 14 * s, wy - 16 * s, s); guard(Ls, cx, wy - 18 * s, 38 * s, s, fancy); blade(Ls, cx, wy - 20 * s, len, 11 * s, 7 * s, s, /dawn/.test(b) ? 'dawn' : /spite/.test(b) ? 'spite' : null); pommel(Ls, cx, wy + 17 * s, s, fancy ? GOLD : null); break;
      }
      case 'axe': case 'waraxe': {
        const top = wy - (kind === 'waraxe' ? 110 : 95) * s, big = kind === 'waraxe' ? 1.4 : 1;
        haft(Ls, cx, wy + 22 * s, top, s, 3.6 * s);
        const hx = cx - 2 * s, hy = top + 18 * s;
        Ls.blade.poly([[hx, hy - 10 * s * big], [hx - 30 * s * big, hy - 24 * s * big], [hx - 34 * s * big, hy + 4 * s], [hx - 28 * s * big, hy + 26 * s * big], [hx, hy + 12 * s * big], [hx + 9 * s, hy + 6 * s], [hx + 9 * s, hy - 6 * s]], (x, y) => { const e = (hx - x) / (34 * s * big); return mul(STEEL, (e > 0.82 ? 1.3 : 0.75 + e * 0.35) * (0.9 + rnd(x >> 1, y >> 1, 4) * 0.2)); });
        Ls.blade.rim(hex('#20262c')); break;
      }
      case 'mace': case 'hammer': case 'club': case 'flail': {
        const top = wy - (kind === 'club' ? 80 : 90) * s;
        if (kind === 'club') { Ls.grip.capsule(cx, wy + 22 * s, cx - 4 * s, top, 4 * s, 10 * s, (x, y, t, n) => mul(mix(hex('#6a4426'), hex('#3a2412'), rnd(x >> 2, y >> 2, 5)), 0.95 - n * 0.35)); for (let i = 0; i < 5; i++) Ls.grip.ellipse(cx - 4 * s + (i % 2 ? 9 : -9) * s, top + (10 + i * 14) * s, 3 * s, 2.4 * s, () => hex('#4a2e18')); Ls.grip.rim(hex('#140a04')); break; }
        haft(Ls, cx, wy + 22 * s, top + 14 * s, s, 3.4 * s, /dragonbone/.test(b) ? hex('#d8cdb0') : WOOD);
        const hy = top, hx = cx + 1 * s;
        if (kind === 'hammer') { Ls.blade.poly([[hx - 20 * s, hy - 10 * s], [hx + 22 * s, hy - 10 * s], [hx + 22 * s, hy + 12 * s], [hx - 20 * s, hy + 12 * s]], (x, y) => mul(STEEL, 0.75 + (hy + 12 * s - y) / (22 * s) * 0.4 + rnd(x >> 1, y >> 1, 6) * 0.12)); Ls.blade.rim(hex('#20262c')); break; }
        if (kind === 'flail') { for (let i = 0; i < 5; i++) Ls.guard.ellipse(hx - i * 3 * s, hy - 4 * s + i * 6 * s, 2.2 * s, 3 * s, () => STEEL_D); Ls.guard.rim(hex('#101418')); }
        const by = kind === 'flail' ? hy + 30 * s : hy, bx = kind === 'flail' ? hx - 18 * s : hx;
        Ls.blade.ellipse(bx, by, 17 * s, 17 * s, (x, y, ux, uy) => mul(STEEL, 0.62 + Math.max(0, -ux * 0.45 - uy * 0.5) + rnd(x >> 1, y >> 1, 8) * 0.12));
        for (let a = 0; a < 12; a++) { const an = a / 12 * Math.PI * 2; Ls.blade.capsule(bx + Math.cos(an) * 14 * s, by + Math.sin(an) * 14 * s, bx + Math.cos(an) * 24 * s, by + Math.sin(an) * 24 * s, 3 * s, 0.6 * s, (x, y, t) => mul(STEEL, 1.1 - t * 0.3)); }
        Ls.blade.rim(hex('#20262c')); break;
      }
      case 'spear': case 'trident': {
        const top = wy - 170 * s;
        haft(Ls, cx, wy + 24 * s, top + 30 * s, s, 3 * s);
        if (kind === 'trident') { for (const ox of [-12, 0, 12]) Ls.blade.poly([[cx + ox * s - 3 * s, top + 30 * s], [cx + ox * s + 3 * s, top + 30 * s], [cx + ox * s, top - (ox ? 0 : 10) * s]], (x, y) => mul(hex('#8ab0b8'), 0.8 + rnd(x, y, 3) * 0.3)); Ls.blade.capsule(cx - 13 * s, top + 32 * s, cx + 13 * s, top + 32 * s, 2.4 * s, 2.4 * s, () => hex('#5a7a80')); }
        else Ls.blade.poly([[cx, top - 8 * s], [cx + 9 * s, top + 22 * s], [cx + 2 * s, top + 34 * s], [cx - 2 * s, top + 34 * s], [cx - 9 * s, top + 22 * s]], (x, y) => mul(/sun/.test(b) ? hex('#f0c060') : STEEL, (x < cx ? 1.2 : 0.75) * (0.9 + rnd(x >> 1, y >> 1, 5) * 0.2)), /sun/.test(b));
        Ls.blade.rim(hex('#20262c')); break;
      }
      case 'staff': {
        const night = /night/.test(b), top = wy - 122 * s;
        haft(Ls, cx, wy + 26 * s, top + 22 * s, s, 3.6 * s, night ? hex('#3a2e40') : hex('#7a5232'), night ? hex('#1a1420') : hex('#4a2e18'));
        // кольца и когти держателя
        for (const yy of [top + 45 * s, top + 95 * s]) Ls.guard.capsule(cx - 5 * s, yy, cx + 7 * s, yy, 1.8 * s, 1.8 * s, () => GOLD);
        for (const ox of [-8, -3, 3, 8]) Ls.guard.capsule(cx + ox * 0.6 * s + 1 * s, top + 24 * s, cx + ox * s + 1 * s, top + 8 * s, 2.2 * s, 1.4 * s, (x, y, t, n) => mul(GOLD, 0.8 + t * 0.3 - n * 0.2));
        Ls.guard.rim(hex('#2a1c08'));
        // кристалл — светится сам
        const cc = night ? hex('#6a8aff') : hex('#b080ff');
        Ls.glow.poly([[cx + 1 * s, top - 24 * s], [cx + 10 * s, top - 6 * s], [cx + 8 * s, top + 14 * s], [cx - 6 * s, top + 14 * s], [cx - 8 * s, top - 6 * s]], (x, y) => mix(mul(cc, 0.7), [255, 255, 255], Math.max(0, 1 - Math.hypot(x - cx + 2 * s, y - top) / (9 * s)) * 0.8 + (x < cx ? 0.12 : 0)), true);
        break;
      }
      case 'sickle': case 'scythe': {
        const top = wy - (kind === 'scythe' ? 125 : 34) * s;
        haft(Ls, cx, wy + 20 * s, top, s, 3 * s);
        const R = (kind === 'scythe' ? 46 : 24) * s;
        for (let a = 0; a < 1; a += 0.02) { const an = Math.PI * (1.0 + a * 0.85); Ls.blade.capsule(cx - R + Math.cos(an) * -R * 0 + Math.cos(an) * R + R, top + Math.sin(an) * R * 0.8, cx + Math.cos(an + 0.05) * R, top + Math.sin(an + 0.05) * R * 0.8, (1 - a) * 4 * s + 1, (1 - a) * 4 * s + 1, () => mul(/moon/.test(b) ? hex('#c8d8f0') : STEEL, 0.85 + a * 0.3)); }
        Ls.blade.rim(hex('#20262c')); break;
      }
      case 'bow': case 'crossbow': case 'sling': {
        if (kind === 'sling') { Ls.grip.capsule(cx, wy - 4 * s, cx - 6 * s, wy + 40 * s, 1.6 * s, 1.6 * s, () => hex('#6a4a2a')); Ls.grip.ellipse(cx - 6 * s, wy + 44 * s, 5 * s, 4 * s, () => hex('#7a6a5a')); Ls.grip.rim(hex('#140a04')); break; }
        const R = 82 * s;
        for (let a = -1; a <= 1; a += 0.01) { const y = wy + a * R, x = cx - 10 * s - Math.cos(a * 1.3) * 26 * s; Ls.grip.ellipse(x, y, 4 * s * (1 - Math.abs(a) * 0.5), 2.5 * s, () => mul(kind === 'crossbow' ? hex('#5a4a3a') : hex('#8a5a2a'), 0.95 - Math.abs(a) * 0.3)); }
        Ls.grip.rim(hex('#140a04'));
        for (let y = wy - R + 4 * s; y < wy + R - 4 * s; y++) Ls.guard.set(cx + 12 * s, y, hex('#d8d0b8'));
        break;
      }
      case 'pick': {
        const top = wy - 96 * s;
        haft(Ls, cx, wy + 22 * s, top, s, 3.4 * s);
        Ls.blade.capsule(cx - 40 * s, top + 16 * s, cx + 40 * s, top + 4 * s, 2 * s, 5 * s, (x, y, t, n) => mul(STEEL_D, 1.1 - n * 0.3 + Math.abs(t - 0.5) * -0.3));
        Ls.blade.rim(hex('#101418')); break;
      }
      case 'shovel': {
        const top = wy - 110 * s;
        haft(Ls, cx, wy + 22 * s, top + 30 * s, s, 3 * s);
        Ls.blade.poly([[cx - 12 * s, top + 34 * s], [cx + 14 * s, top + 34 * s], [cx + 12 * s, top], [cx + 1 * s, top - 10 * s], [cx - 10 * s, top]], (x, y) => mul(STEEL_D, 1 + (cx - x) / (30 * s)));
        Ls.blade.rim(hex('#101418')); break;
      }
    }
    drawFist(Ls, cx, cy, s * 1.35, skin, glove, kind !== 'fist');
    const out = new Layer(W, H);
    for (const k of ['grip', 'blade', 'guard', 'arm', 'hand', 'fing', 'thumb', 'glow']) out.over(Ls[k]);
    return out;
  }
  // факел в другой руке: палка, обмотка, пламя (пламя светится и пляшет)
  function torchLayer(P, s, W, H, cx, cy, f) {
    const mk = () => new Layer(W, H);
    const Ls = { blade: mk(), guard: mk(), grip: mk(), arm: mk(), hand: mk(), fing: mk(), thumb: mk(), glow: mk() };
    haft(Ls, cx, cy + 20 * s, cy - 56 * s, s, 3.2 * s, hex('#6a4426'));
    Ls.guard.capsule(cx, cy - 48 * s, cx + 1 * s, cy - 66 * s, 5 * s, 5.5 * s, (x, y) => mix(hex('#5a4030'), hex('#2a1a10'), rnd(x >> 1, y >> 1, 2)));
    Ls.guard.rim(hex('#140a04'));
    const fy = cy - 70 * s;
    for (let y = -34; y <= 0; y++) for (let x = -10; x <= 10; x++) {
      const yy = y * s, xx = x * s;
      const wv = Math.sin(y * 0.35 + f * 1.7) * 2.2 + Math.sin(y * 0.8 - f * 2.3);
      const w = (1 - Math.pow(-y / 34, 1.4)) * 9;
      if (Math.abs(x - wv * (-y / 34)) > w) continue;
      const k = 1 - Math.abs(x - wv * (-y / 34)) / Math.max(1, w), h = -y / 34;
      const c = k > 0.6 && h < 0.5 ? hex('#fff4c0') : k > 0.3 ? hex('#ffb040') : hex('#e05a18');
      for (let a = 0; a < Math.max(1, Math.round(s)); a++) for (let b2 = 0; b2 < Math.max(1, Math.round(s)); b2++) Ls.glow.set(cx + xx + a, fy + yy + b2, c, true);
    }
    drawFist(Ls, cx, cy, s * 1.35, hex(SKIN[(P.skin || 0) % SKIN.length]), gloveOf(P), true);
    const out = new Layer(W, H);
    for (const k of ['grip', 'guard', 'arm', 'hand', 'fing', 'thumb', 'glow']) out.over(Ls[k]);
    return out;
  }
  // картинка слоя → холст; свечение — отдельно (его не гасит темнота)
  function toCanvas(L) {
    const cv = document.createElement('canvas'), em = document.createElement('canvas');
    cv.width = em.width = L.w; cv.height = em.height = L.h;
    const a = cv.getContext('2d').createImageData(L.w, L.h), b = em.getContext('2d').createImageData(L.w, L.h);
    for (let i = 0; i < L.w * L.h; i++) { const k = i * 4; if (!L.d[k + 3]) continue; const t = L.e[i] ? b : a; t.data[k] = L.d[k]; t.data[k + 1] = L.d[k + 1]; t.data[k + 2] = L.d[k + 2]; t.data[k + 3] = 255; }
    cv.getContext('2d').putImageData(a, 0, 0); em.getContext('2d').putImageData(b, 0, 0);
    return { cv, em };
  }

  // ---------- кадр ----------
  const cache = new Map();
  let HC = null, TC = null;
  function sprite(key, make) { let s = cache.get(key); if (!s) { s = toCanvas(make()); cache.set(key, s); if (cache.size > 40) cache.delete(cache.keys().next().value); } return s; }
  UI.handKind = () => weaponKind(G.P && G.P.eq.hand);
  UI.drawHand3D = function (ctx, v) {
    const P = G.P;
    if (!P || P.dead) return;
    const fw = v.fw, fh = v.fh;
    // на узком (телефонном) кадре рука не должна занимать полэкрана
    const base = Math.min(fh, fw * 1.15);
    const s = base / 175;
    const kind = weaponKind(P.eq.hand), left = P.hand === 'L';
    const W = Math.ceil(base * 0.85), H = Math.ceil(base * 1.5), cx = Math.round(W * 0.42), cy = Math.round(H * 0.74);
    const key = kind + '|' + ((P.eq.hand && P.eq.hand.b) || '') + '|' + (P.skin || 0) + '|' + ((P.eq.hands && P.eq.hands.b) || '') + '|' + Math.round(base);
    const main = sprite(key, () => compose(kind, P.eq.hand, P, s, W, H, cx, cy));
    const torch = P.light > 0 ? sprite('torch|' + (P.skin || 0) + '|' + ((P.eq.hands && P.eq.hands.b) || '') + '|' + Math.round(base) + '|' + (Math.floor(v.now / 110) % 6), () => torchLayer(P, s, W, H, cx, cy, Math.floor(v.now / 110) % 6)) : null;
    // свет вокруг: небо, солнце, огни (как у спрайтов мира)
    const sk = v.sky;
    let L = [0.06, 0.055, 0.07];
    for (let i = 0; i < 3; i++) L[i] += sk.amb[i] * (v.inside ? 0.6 : 1) + sk.sun[i] * (v.inside ? 0.1 : 0.55);
    for (const l of v.lights.slice(0, 4)) { const d = Math.hypot(l.x - (v.cam ? v.cam.x : l.x), l.z - (v.cam ? v.cam.z : l.z)); const a = Math.max(0, 1 - d / l.r); for (let i = 0; i < 3; i++) L[i] += l.col[i] * l.i * a * a * 0.8; }
    if (P.light > 0) { L[0] += 0.55; L[1] += 0.36; L[2] += 0.18; }
    L = L.map((x) => Math.min(1.0, x));
    // покачивание на ходу, удар
    const RT = E.RT;
    const t = v.now / 1000;
    let bx = Math.sin((v.walked || 0) * 2.6) * 3 * s, by = Math.abs(Math.cos((v.walked || 0) * 2.6)) * 4 * s;
    if (!v.moving) { bx = Math.sin(t * 1.1) * 1.2 * s; by = Math.sin(t * 1.7) * 1.5 * s; }
    let rot = -0.08, dx = 0, dy = 0;
    const sw = RT ? (v.now - (RT.swing || 0)) / 380 : 9;
    if (sw >= 0 && sw < 1) {
      const k = Math.sin(sw * Math.PI);
      if (['bow', 'crossbow', 'sling'].includes(kind)) { dy = k * 10 * s; }
      else if (['staff', 'spear', 'trident'].includes(kind)) { dy = -k * 30 * s; dx = -k * 10 * s; }
      else { rot = -0.08 - k * 0.95; dx = -k * 34 * s; dy = k * 22 * s; }
    }
    if (!HC) { HC = document.createElement('canvas'); TC = document.createElement('canvas'); }
    if (HC.width !== fw || HC.height !== fh) { HC.width = TC.width = fw; HC.height = TC.height = fh; }
    const hc = HC.getContext('2d'), tc = TC.getContext('2d');
    hc.clearRect(0, 0, fw, fh); tc.clearRect(0, 0, fw, fh);
    hc.imageSmoothingEnabled = false; tc.imageSmoothingEnabled = false;
    const place = (c, sp, px, py, r, mirror) => {
      c.save();
      c.translate(Math.round(px), Math.round(py));
      if (mirror) c.scale(-1, 1);
      c.rotate(r);
      c.drawImage(sp, -cx, -cy);
      c.restore();
    };
    const hx = left ? fw * 0.27 : fw * 0.73, hy = fh - base * 0.2;
    const ox = left ? fw * 0.83 : fw * 0.17, oy = fh - base * 0.1;
    // картинку красим светом: каждую отдельно — умножаем на цвет света, потом возвращаем форму
    const tint = 'rgb(' + Math.round(L[0] * 255 * 0.95) + ',' + Math.round(L[1] * 255 * 0.95) + ',' + Math.round(L[2] * 255 * 0.95) + ')';
    const lit = (sp, px, py, r, mirror) => {
      tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, fw, fh);
      place(tc, sp.cv, px, py, r, mirror);
      tc.globalCompositeOperation = 'multiply'; tc.fillStyle = tint; tc.fillRect(0, 0, fw, fh);
      tc.globalCompositeOperation = 'destination-in'; place(tc, sp.cv, px, py, r, mirror);
      tc.globalCompositeOperation = 'source-over';
      hc.drawImage(TC, 0, 0);
    };
    if (torch) lit(torch, ox - bx * 0.6, oy + by * 0.8, 0.12, !left);
    lit(main, hx + bx + (left ? -dx : dx), hy + by + dy, rot, left);
    // свечение — поверх, без тени
    place(hc, main.em, hx + bx + (left ? -dx : dx), hy + by + dy, rot, left);
    if (torch) place(hc, torch.em, ox - bx * 0.6, oy + by * 0.8, 0.12, !left);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(HC, v.vx0, v.vy0, fw * v.px, fh * v.px);
    ctx.restore();
  };
})(window.EOF);
