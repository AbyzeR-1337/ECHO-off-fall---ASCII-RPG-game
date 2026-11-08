'use strict';
// Навершия посохов — у каждого своё, нарисованное попиксельно поверх древка с листа рук (а не перекраска).
// Сфера в рогах с листа срезается, вместо неё — своё: угли в железных рогах (Пламя), ледяные шипы (Иней),
// медная катушка с шаром молнии (Буря), камень в обвязке (Камень), солнечный диск (Свет), череп с огнями в
// глазницах (Тлен), ветви с листьями и бутоном (Жизнь), руны вокруг сферы (Тайное), полумесяц со звездой
// (Архимаг), позвонки и рог (костяной), призма (хрустальный); у ветвей, смешений и тайных школ — свои:
// капля в кольце, перья, клинки, терновое сердце, глаз пустоты, клык, песочные часы, лира…
// Светящееся (угли, кристаллы, глазницы) рисуется ещё и в слой свечения.
(function (E) {
  const UI = E.UI;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const U_clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // какое навершие у какого посоха
  const HEAD = UI.STAFF_HEADS = {
    staff_fire: 'ember', staff_ice: 'icicle', staff_storm: 'coil', staff_stone: 'rock', staff_light: 'sun', staff_grave: 'skull',
    staff_wild: 'branch', staff_arcane: 'runes', staff_archmage: 'crescent', staff_bone: 'bone', staff_crystal: 'prism', a_pilgrim_staff: 'lantern', a_nightstaff: 'crescent_dark',
    staff2_water: 'droplet', staff2_wind: 'feathers', staff2_metal: 'blades', staff2_blood: 'thorn', staff2_shadow: 'eye', staff2_venom: 'fang', staff2_steam: 'kettle', staff2_magma: 'ember_big',
    staff2_blizzard: 'icicle_storm', staff2_sun: 'sun', staff2_twilight: 'crescent_dark', staff2_rot: 'mushroom', staff2_astral: 'star', staff2_crystal: 'prism', staff2_time: 'hourglass', staff2_dream: 'cloud', staff2_song: 'lyre',
  };
  // главный цвет навершия (светящаяся часть) — если у заклинания своей стихии нет
  const GLOW = {
    ember: '#ff8a2a', ember_big: '#ff5a10', icicle: '#a8e8ff', icicle_storm: '#c8e8ff', coil: '#b8c8ff', sun: '#ffe080', skull: '#b070ff', branch: '#90f070', runes: '#c890ff', crescent: '#e8f0ff',
    crescent_dark: '#b080e0', prism: '#a0fff0', droplet: '#60b0ff', eye: '#a070ff', thorn: '#ff3040', fang: '#90f040', star: '#a0b0ff', hourglass: '#ffe0a0', cloud: '#e0b0ff', lyre: '#ffc0e0', lantern: '#ffd890', knot: null, rock: '#d8a060', bone: null, feathers: null, blades: null, kettle: '#f0f0f8', mushroom: '#c0e060',
  };
  // ---------- рисовалка: попиксельно с тенью и обводкой ----------
  function painter(d, e, w, h) {
    const mark = new Uint8Array(w * h);
    const put = (x, y, c, glow) => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const q = (y * w + x) * 4;
      d[q] = clamp(c[0], 0, 255); d[q + 1] = clamp(c[1], 0, 255); d[q + 2] = clamp(c[2], 0, 255); d[q + 3] = 255;
      mark[y * w + x] = 1;
      if (glow && e) { e[q] = d[q]; e[q + 1] = d[q + 1]; e[q + 2] = d[q + 2]; e[q + 3] = 255; }
    };
    // ступени цвета: тень → основа → свет
    const shade = (base, k) => (k < 0.5 ? mix(mix(base, [20, 10, 24], 0.65), base, k * 2) : mix(base, mix(base, [255, 250, 230], 0.75), (k - 0.5) * 2));
    // шар с освещением сверху-слева
    const ball = (cx, cy, r, base, glow, spec) => {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const dd = (x * x + y * y) / (r * r);
        if (dd > 1) continue;
        const nz = Math.sqrt(1 - dd), l = clamp(0.25 + (-x / r * 0.5 - y / r * 0.6 + nz * 0.55) * 0.75, 0, 1);
        let c = shade(base, l);
        if (spec !== false && x / r < -0.25 && x / r > -0.6 && y / r < -0.25 && y / r > -0.65) c = mix(c, [255, 255, 255], 0.6);
        put(cx + x, cy + y, c, glow);
      }
    };
    // толстая линия-ветка с бликом с одной стороны
    const line = (x0, y0, x1, y1, th, base, glow) => {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        for (let k = -th; k <= th; k++) put(x + k, y, shade(base, 0.5 - k / (th * 2 + 1) * 0.55), glow);
      }
    };
    // изогнутый рог/зубец по квадратичной кривой
    const curve = (x0, y0, cx, cy, x1, y1, th0, th1, base, glow) => {
      const n = 40;
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
        const th = th0 + (th1 - th0) * t;
        for (let k = -Math.ceil(th); k <= Math.ceil(th); k++) if (Math.abs(k) <= th + 0.3) put(x + k, y, shade(base, 0.55 - k / (th * 2 + 1)), glow);
      }
    };
    // заливка многоугольника (кристаллы): левые грани светлее
    const poly = (pts, base, glow, lite) => {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const cxm = (x0 + x1) / 2;
      for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) {
        let ins = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; }
        if (!ins) continue;
        const k = x < cxm ? 0.72 + (lite || 0) : 0.36;
        put(x, y, shade(base, k - (y - y0) / Math.max(1, y1 - y0) * 0.18), glow);
      }
    };
    const outline = (col) => {
      const o = col || [24, 14, 20];
      const add = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!mark[y * w + x]) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const q = (yy * w + xx) * 4; if (d[q + 3] < 8 && !mark[yy * w + xx]) add.push(q); }
      }
      for (const q of add) { d[q] = o[0]; d[q + 1] = o[1]; d[q + 2] = o[2]; d[q + 3] = 255; }
    };
    return { put, ball, line, curve, poly, shade, outline };
  }

  // ---------- навершия ----------
  // g: { cx, cy — центр, где была сфера; R — её радиус; sx, sy — верх древка; wood — цвет древка; glow — цвет свечения }
  const DRAW = {
    knot: (p, g) => { // простой посох: узел и пара сучков
      p.curve(g.sx, g.sy, g.sx - 2, g.cy + g.R * 0.4, g.cx, g.cy, 4, 6, g.wood);
      p.ball(g.cx, g.cy - 2, Math.round(g.R * 0.32), mix(g.wood, [255, 230, 190], 0.15), false, false);
      p.curve(g.cx, g.cy, g.cx - g.R * 0.5, g.cy - g.R * 0.3, g.cx - g.R * 0.55, g.cy - g.R * 0.75, 3, 1, g.wood);
      p.curve(g.cx + 2, g.cy, g.cx + g.R * 0.4, g.cy - g.R * 0.2, g.cx + g.R * 0.35, g.cy - g.R * 0.6, 2, 1, g.wood);
    },
    ember: (p, g, big) => { // железные рога, угли
      const iron = [70, 64, 70], s = big ? 1.2 : 1;
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.45, 4, iron);
      for (const k of [-1, 0, 1]) p.curve(g.cx, g.cy + g.R * 0.45, g.cx + k * g.R * 0.9 * s, g.cy + g.R * 0.1, g.cx + k * g.R * 0.55 * s, g.cy - g.R * 0.8 * s, 3.5, 1, iron);
      p.ball(g.cx, g.cy - 2, Math.round(g.R * 0.42 * s), hex(big ? '#ff5010' : '#ff7a20'), true);
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.22, r = g.R * (0.45 + (i % 3) * 0.12) * s; p.put(g.cx + Math.cos(a) * r, g.cy - 2 + Math.sin(a) * r - 3, hex(i % 2 ? '#ffd040' : '#ff8a20'), true); }
    },
    ember_big: (p, g) => DRAW.ember(p, g, true),
    icicle: (p, g, storm) => { // ледяные шипы
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.5, 4, mix(g.wood, [200, 230, 255], 0.3));
      const ice = hex(storm ? '#c8e0ff' : '#9adcff');
      const sp = [[-0.55, 0.7, 0.25], [-0.25, 1.05, 0.3], [0.05, 1.3, 0.32], [0.35, 1.0, 0.28], [0.6, 0.65, 0.22]];
      for (const [dx, hh, ww] of sp) {
        const bx = g.cx + dx * g.R, by = g.cy + g.R * 0.45, tx = g.cx + dx * g.R * 1.5, ty = g.cy + g.R * 0.45 - hh * g.R;
        p.poly([[bx - ww * g.R, by], [tx, ty], [bx + ww * g.R, by]], ice, true, 0.15);
      }
      if (storm) for (let i = 0; i < 6; i++) p.put(g.cx + (Math.random() - 0.5) * g.R * 1.6, g.cy - g.R * 0.6 + (Math.random() - 0.5) * g.R, [255, 255, 200], true);
    },
    icicle_storm: (p, g) => DRAW.icicle(p, g, true),
    coil: (p, g) => { // медная катушка и шар молнии
      const cu = hex('#b87333');
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.2, 4, [60, 56, 70]);
      for (let i = 0; i < 6; i++) { const y = g.cy + g.R * 0.65 - i * 4; p.line(g.cx - 7, y, g.cx + 7, y - 2, 1, cu); }
      p.ball(g.cx, g.cy - g.R * 0.25, Math.round(g.R * 0.38), hex('#a8b8ff'), true);
      for (let i = 0; i < 5; i++) { let x = g.cx, y = g.cy - g.R * 0.25; const a = Math.random() * Math.PI * 2; for (let k = 0; k < 7; k++) { x += Math.cos(a) * 2.2 + (Math.random() - 0.5) * 2; y += Math.sin(a) * 2.2 + (Math.random() - 0.5) * 2; p.put(x, y, [240, 245, 255], true); } }
    },
    rock: (p, g) => { // камень в обвязке
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.5, 4, g.wood);
      const st = hex('#8a8076'), r = g.R * 0.62;
      const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, rr = r * (0.75 + ((i * 37) % 10) / 30); pts.push([g.cx + Math.cos(a) * rr, g.cy - 4 + Math.sin(a) * rr]); }
      p.poly(pts, st, false);
      for (const k of [-0.3, 0.25]) p.line(g.cx - r, g.cy - 4 + k * r, g.cx + r, g.cy - 4 + k * r + 3, 1, hex('#6a5030'));
      p.put(g.cx - 4, g.cy - 8, hex('#d8a060'), true); p.put(g.cx + 3, g.cy - 2, hex('#d8a060'), true);
    },
    sun: (p, g) => { // солнечный диск с лучами
      const au = hex('#e8b840');
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.55, 4, au);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r0 = g.R * 0.5, r1 = g.R * (i % 2 ? 0.8 : 0.98); p.line(g.cx + Math.cos(a) * r0, g.cy + Math.sin(a) * r0, g.cx + Math.cos(a) * r1, g.cy + Math.sin(a) * r1, 1, au, i % 2 === 0); }
      for (let a = 0; a < Math.PI * 2; a += 0.04) for (let rr = g.R * 0.42; rr <= g.R * 0.52; rr += 0.7) p.put(g.cx + Math.cos(a) * rr, g.cy + Math.sin(a) * rr, p.shade(au, 0.5 + Math.cos(a + 2.2) * 0.35));
      p.ball(g.cx, g.cy, Math.round(g.R * 0.28), hex('#fff0a0'), true);
    },
    skull: (p, g) => { // череп с огнями в глазницах
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.5, 4, g.wood);
      const bone = hex('#e8dcc4'), r = g.R * 0.45;
      p.ball(g.cx, g.cy - 2, Math.round(r), bone, false, false);
      p.poly([[g.cx - r * 0.6, g.cy + r * 0.5], [g.cx + r * 0.6, g.cy + r * 0.5], [g.cx + r * 0.45, g.cy + r * 1.05], [g.cx - r * 0.45, g.cy + r * 1.05]], bone, false);
      for (const sx of [-1, 1]) { for (let y = -2; y <= 1; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 4) p.put(g.cx + sx * r * 0.4 + x, g.cy - 1 + y, hex('#c080ff'), true); }
      p.put(g.cx, g.cy + r * 0.3, [30, 20, 30]); p.put(g.cx - 1, g.cy + r * 0.35, [30, 20, 30]);
      for (let i = -2; i <= 2; i++) p.put(g.cx + i * 2, g.cy + r * 0.85, [40, 30, 34]);
      for (const sx of [-1, 1]) p.curve(g.cx + sx * r * 0.7, g.cy - r * 0.6, g.cx + sx * r * 1.4, g.cy - r * 1.0, g.cx + sx * r * 1.1, g.cy - r * 1.6, 2.5, 0.8, hex('#4a4040'));
    },
    branch: (p, g) => { // ветви с листьями и бутоном
      const lf = hex('#5aa040');
      p.curve(g.sx, g.sy, g.cx - 4, g.cy + g.R * 0.3, g.cx, g.cy - g.R * 0.2, 4, 2, g.wood);
      p.curve(g.cx - 2, g.cy + g.R * 0.2, g.cx - g.R * 0.7, g.cy, g.cx - g.R * 0.8, g.cy - g.R * 0.7, 2.5, 1, g.wood);
      p.curve(g.cx + 1, g.cy + g.R * 0.1, g.cx + g.R * 0.6, g.cy - g.R * 0.1, g.cx + g.R * 0.75, g.cy - g.R * 0.6, 2, 1, g.wood);
      const leaf = (x, y, a) => { for (let k = 0; k < 7; k++) { const w = Math.sin(k / 7 * Math.PI) * 2.5; for (let j = -w; j <= w; j++) p.put(x + Math.cos(a) * k - Math.sin(a) * j, y + Math.sin(a) * k + Math.cos(a) * j, p.shade(lf, 0.5 + j / 6)); } };
      for (const [x, y, a] of [[-0.8, -0.7, -2.2], [-0.5, -0.1, 2.6], [0.75, -0.6, -1.1], [0.5, 0, 0.3], [-0.2, -0.5, -1.7], [0.2, -0.3, -0.6]]) leaf(g.cx + x * g.R, g.cy + y * g.R, a);
      p.ball(g.cx, g.cy - g.R * 0.32, Math.round(g.R * 0.2), hex('#f0a0c0'), true);
    },
    runes: (p, g) => { // сфера и руны-осколки вокруг
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.5, 4, g.wood);
      p.ball(g.cx, g.cy, Math.round(g.R * 0.4), hex(g.glow || '#c890ff'), true);
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.6, x = g.cx + Math.cos(a) * g.R * 0.82, y = g.cy + Math.sin(a) * g.R * 0.62; p.poly([[x - 4, y - 3], [x + 4, y - 4], [x + 3, y + 4], [x - 3, y + 3]], hex('#6a6070'), false); p.put(x, y - 1, hex('#e0b0ff'), true); p.put(x, y, hex('#e0b0ff'), true); p.put(x - 1, y, hex('#e0b0ff'), true); }
    },
    crescent: (p, g, dark) => { // полумесяц и звезда
      const ag = hex(dark ? '#5a4a6a' : '#d8dce8');
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.55, 4, ag);
      for (let y = -g.R; y <= g.R; y++) for (let x = -g.R; x <= g.R; x++) { const a = (x * x + y * y) / (g.R * g.R * 0.8), b = ((x - g.R * 0.38) ** 2 + (y + g.R * 0.1) ** 2) / (g.R * g.R * 0.6); if (a <= 1 && b > 1) p.put(g.cx - 2 + x * 0.8, g.cy + y * 0.8, p.shade(ag, 0.45 + (-x - y) / (g.R * 4))); }
      const st = hex(dark ? '#c090ff' : '#f0f4ff');
      for (let k = -4; k <= 4; k++) { p.put(g.cx + g.R * 0.25 + k, g.cy - 2, st, true); p.put(g.cx + g.R * 0.25, g.cy - 2 + k, st, true); }
      for (const [dx, dy] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) p.put(g.cx + g.R * 0.25 + dx, g.cy - 2 + dy, st, true);
    },
    crescent_dark: (p, g) => DRAW.crescent(p, g, true),
    bone: (p, g) => { // позвонки и рог
      const bn = hex('#e0d4bc');
      for (let i = 0; i < 4; i++) { const t = i / 4, x = g.sx + (g.cx - g.sx) * t, y = g.sy + (g.cy + g.R * 0.2 - g.sy) * t; p.ball(x, y, 4 - i * 0.3, bn, false, false); p.line(x - 5, y + 1, x + 5, y - 1, 0, bn); }
      p.curve(g.cx, g.cy + g.R * 0.1, g.cx + g.R * 0.9, g.cy - g.R * 0.2, g.cx + g.R * 0.25, g.cy - g.R * 0.95, 4, 1, bn);
      p.curve(g.cx, g.cy + g.R * 0.1, g.cx - g.R * 0.6, g.cy - g.R * 0.1, g.cx - g.R * 0.45, g.cy - g.R * 0.6, 2.5, 1, bn);
    },
    prism: (p, g) => { // шестигранная призма
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.55, 4, g.wood);
      const c = hex(g.glow || '#a0fff0'), w = g.R * 0.3;
      p.poly([[g.cx - w, g.cy + g.R * 0.45], [g.cx - w * 1.1, g.cy - g.R * 0.4], [g.cx, g.cy - g.R * 1.05], [g.cx + w * 1.1, g.cy - g.R * 0.4], [g.cx + w, g.cy + g.R * 0.45], [g.cx, g.cy + g.R * 0.65]], c, true, 0.1);
      p.line(g.cx, g.cy - g.R, g.cx, g.cy + g.R * 0.6, 0, mix(c, [255, 255, 255], 0.5), true);
      for (const sx of [-1, 1]) p.curve(g.cx + sx * w * 1.6, g.cy + g.R * 0.6, g.cx + sx * w * 1.9, g.cy, g.cx + sx * w * 1.3, g.cy - g.R * 0.35, 2, 1, hex('#8a8e98'));
    },
    lantern: (p, g) => { // посох паломника: фонарик на крюке
      p.curve(g.sx, g.sy, g.cx, g.cy, g.cx + g.R * 0.5, g.cy - g.R * 0.7, 4, 2, g.wood);
      p.line(g.cx + g.R * 0.5, g.cy - g.R * 0.7, g.cx + g.R * 0.5, g.cy - g.R * 0.3, 0, [60, 60, 60]);
      p.poly([[g.cx + g.R * 0.3, g.cy - g.R * 0.3], [g.cx + g.R * 0.7, g.cy - g.R * 0.3], [g.cx + g.R * 0.75, g.cy + g.R * 0.25], [g.cx + g.R * 0.25, g.cy + g.R * 0.25]], hex('#ffd890'), true);
    },
    droplet: (p, g) => { // капля в серебряном кольце
      const ag = hex('#b8c4d0');
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.6, 4, ag);
      for (let a = 0; a < Math.PI * 2; a += 0.03) for (let rr = g.R * 0.7; rr <= g.R * 0.8; rr += 0.6) p.put(g.cx + Math.cos(a) * rr, g.cy + Math.sin(a) * rr, p.shade(ag, 0.5 + Math.cos(a + 2.2) * 0.4));
      for (let y = -g.R * 0.55; y <= g.R * 0.45; y++) { const t = (y + g.R * 0.55) / g.R, w = t < 0.45 ? t * g.R * 0.75 : Math.sqrt(Math.max(0, 1 - ((t - 0.62) / 0.4) ** 2)) * g.R * 0.36; for (let x = -w; x <= w; x++) p.put(g.cx + x, g.cy + y, p.shade(hex('#4a9cff'), 0.4 + (-x / Math.max(1, w)) * 0.3 + (1 - t) * 0.2), true); }
    },
    feathers: (p, g) => { // перья по ветру
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.45, 4, g.wood);
      for (const [a, c] of [[-2.0, '#e8e8e0'], [-1.6, '#c8d8d0'], [-1.2, '#f0f0e8'], [-0.9, '#b0c8c0']]) {
        const x0 = g.cx, y0 = g.cy + g.R * 0.4, L = g.R * 1.15;
        for (let k = 0; k < L; k++) { const x = x0 + Math.cos(a) * k, y = y0 + Math.sin(a) * k, w = Math.sin(k / L * Math.PI) * 4; for (let j = -w; j <= w; j++) p.put(x - Math.sin(a) * j, y + Math.cos(a) * j, p.shade(hex(c), 0.5 + j / 10)); p.put(x, y, hex('#6a6050')); }
      }
    },
    blades: (p, g) => { // клинки веером
      const st = hex('#c8ccd8');
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.5, 4, [80, 76, 86]);
      for (const a of [-2.3, -1.9, -1.57, -1.25, -0.85]) { const x0 = g.cx, y0 = g.cy + g.R * 0.45, L = g.R * 1.2; p.poly([[x0 + Math.cos(a + 1.57) * 2, y0 + Math.sin(a + 1.57) * 2], [x0 + Math.cos(a) * L, y0 + Math.sin(a) * L], [x0 + Math.cos(a - 1.57) * 2, y0 + Math.sin(a - 1.57) * 2]], st, false, 0.1); }
    },
    thorn: (p, g) => { // терновое сердце
      p.curve(g.sx, g.sy, g.cx + 3, g.cy + g.R * 0.5, g.cx, g.cy + g.R * 0.35, 4, 3, hex('#3a1a18'));
      for (let y = -g.R * 0.5; y <= g.R * 0.4; y++) for (let x = -g.R * 0.55; x <= g.R * 0.55; x++) { const X = x / (g.R * 0.5), Y = -y / (g.R * 0.5) + 0.25; if ((X * X + Y * Y - 1) ** 3 - X * X * Y * Y * Y <= 0) p.put(g.cx + x, g.cy - 2 + y, p.shade(hex('#d81830'), 0.45 - x / (g.R * 2) - y / (g.R * 2)), true); }
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = g.R * 0.6; p.line(g.cx + Math.cos(a) * r, g.cy - 2 + Math.sin(a) * r, g.cx + Math.cos(a) * (r + 5), g.cy - 2 + Math.sin(a) * (r + 5), 0, hex('#2a1410')); }
    },
    eye: (p, g) => { // глаз пустоты
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.5, 4, g.wood);
      for (let y = -g.R * 0.4; y <= g.R * 0.4; y++) for (let x = -g.R * 0.75; x <= g.R * 0.75; x++) if ((x / (g.R * 0.75)) ** 2 + (y / (g.R * 0.4 * (1 - Math.abs(x) / (g.R * 0.9)))) ** 2 <= 1) p.put(g.cx + x, g.cy + y, hex('#1a1424'));
      p.ball(g.cx, g.cy, Math.round(g.R * 0.24), hex('#9060ff'), true);
      p.put(g.cx, g.cy, [10, 6, 16]); p.put(g.cx, g.cy - 1, [10, 6, 16]); p.put(g.cx, g.cy + 1, [10, 6, 16]);
    },
    fang: (p, g) => { // клык с ядом
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.5, 4, g.wood);
      p.curve(g.cx - g.R * 0.25, g.cy + g.R * 0.45, g.cx - g.R * 0.45, g.cy - g.R * 0.2, g.cx + g.R * 0.15, g.cy - g.R * 0.95, 5, 0.6, hex('#ece4cc'));
      p.put(g.cx + g.R * 0.15, g.cy - g.R * 0.85, hex('#90f040'), true); p.put(g.cx + g.R * 0.18, g.cy - g.R * 0.75, hex('#90f040'), true); p.put(g.cx + g.R * 0.2, g.cy - g.R * 0.62, hex('#70d030'), true);
    },
    kettle: (p, g) => { // котелок-курильница с паром
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.5, 4, [70, 66, 72]);
      p.ball(g.cx, g.cy + 2, Math.round(g.R * 0.42), hex('#6a6470'), false);
      for (let i = 0; i < 18; i++) { const t = i / 18; p.put(g.cx + Math.sin(t * 9) * 4, g.cy - g.R * 0.4 - t * g.R * 0.8, mix([250, 250, 255], [180, 180, 190], t), true); }
    },
    mushroom: (p, g) => { // гнилой гриб
      p.curve(g.sx, g.sy, g.cx - 2, g.cy + g.R * 0.4, g.cx, g.cy, 4, 3, hex('#cfc4a0'));
      for (let y = -g.R * 0.55; y <= 0; y++) for (let x = -g.R * 0.75; x <= g.R * 0.75; x++) if ((x / (g.R * 0.75)) ** 2 + (y / (g.R * 0.55)) ** 2 <= 1) p.put(g.cx + x, g.cy - 2 + y, p.shade(hex('#8c9c40'), 0.5 - x / (g.R * 2) - y / (g.R * 1.2)));
      for (const [x, y] of [[-0.4, -0.3], [0.2, -0.45], [0.45, -0.15], [-0.1, -0.15]]) p.put(g.cx + x * g.R, g.cy - 2 + y * g.R, hex('#d8f070'), true);
    },
    star: (p, g) => { // восьмилучевая звезда
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.55, 4, g.wood);
      const c = hex('#a8b8ff');
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, L = g.R * (i % 2 ? 0.45 : 0.85); p.poly([[g.cx + Math.cos(a + 1.57) * 3, g.cy + Math.sin(a + 1.57) * 3], [g.cx + Math.cos(a) * L, g.cy + Math.sin(a) * L], [g.cx + Math.cos(a - 1.57) * 3, g.cy + Math.sin(a - 1.57) * 3]], c, true, 0.1); }
      p.ball(g.cx, g.cy, 4, [240, 244, 255], true);
    },
    hourglass: (p, g) => { // песочные часы
      const br = hex('#a08040');
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.6, 4, br);
      p.line(g.cx - g.R * 0.45, g.cy - g.R * 0.75, g.cx + g.R * 0.45, g.cy - g.R * 0.75, 1, br); p.line(g.cx - g.R * 0.45, g.cy + g.R * 0.55, g.cx + g.R * 0.45, g.cy + g.R * 0.55, 1, br);
      for (const sx of [-1, 1]) p.line(g.cx + sx * g.R * 0.45, g.cy - g.R * 0.75, g.cx + sx * g.R * 0.45, g.cy + g.R * 0.55, 0, br);
      const gl = [220, 235, 245];
      for (let y = -g.R * 0.68; y <= g.R * 0.48; y++) { const t = Math.abs((y + g.R * 0.1) / (g.R * 0.58)), w = 2 + t * g.R * 0.3; for (let x = -w; x <= w; x++) p.put(g.cx + x, g.cy + y, y > g.R * 0.2 || (y < -g.R * 0.45) ? hex('#f0d080') : gl, y > g.R * 0.2); }
    },
    cloud: (p, g) => { // облачко сна и луна
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.5, 4, g.wood);
      for (const [x, y, r] of [[-0.35, 0, 0.35], [0.05, -0.15, 0.42], [0.42, 0.02, 0.3], [0.05, 0.15, 0.3]]) p.ball(g.cx + x * g.R, g.cy + y * g.R, Math.round(r * g.R), hex('#d8b8f0'), true, false);
      for (let k = 0; k < 3; k++) p.put(g.cx + g.R * 0.55 + k * 3, g.cy - g.R * 0.65 - k * 3, [255, 255, 255], true);
    },
    lyre: (p, g) => { // лира: два рога и струны
      const au = hex('#d8a0b8');
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.55, 4, au);
      for (const sx of [-1, 1]) p.curve(g.cx, g.cy + g.R * 0.55, g.cx + sx * g.R * 0.95, g.cy + g.R * 0.1, g.cx + sx * g.R * 0.45, g.cy - g.R * 0.85, 3, 2, au);
      p.line(g.cx - g.R * 0.45, g.cy - g.R * 0.7, g.cx + g.R * 0.45, g.cy - g.R * 0.7, 1, au);
      for (let k = -2; k <= 2; k++) p.line(g.cx + k * 4, g.cy - g.R * 0.65, g.cx + k * 2, g.cy + g.R * 0.45, 0, [255, 220, 240], true);
    },
  };
  // ---------- головы оружия (дубина, булава, кистень, секира) ----------
  const WDRAW = {
    club: (p, g) => { // шишковатая дубина
      const wd = hex('#7a5232');
      for (let i = 0; i <= 26; i++) { const t = i / 26, x = g.sx + (g.cx - g.sx) * t, y = g.sy + (g.cy - g.R * 0.3 - g.sy) * t, r = 3 + t * g.R * 0.42; p.ball(x, y, Math.round(r), wd, false, false); }
      for (const [dx, dy] of [[-0.35, -0.55], [0.3, -0.35], [-0.1, -0.1], [0.38, 0.05], [-0.42, 0.1]]) p.ball(g.cx + dx * g.R, g.cy - g.R * 0.25 + dy * g.R, 3, hex('#5a3820'), false, false);
      for (const [dx, dy] of [[-0.5, -0.3], [0.45, -0.6], [0.1, 0.2]]) p.line(g.cx + dx * g.R, g.cy + dy * g.R - 4, g.cx + dx * g.R * 1.25, g.cy + dy * g.R - 6, 0, hex('#c8c0b0'));
    },
    mace: (p, g) => { // булава с перьями
      const st = hex('#9aa0aa');
      p.line(g.sx, g.sy, g.cx, g.cy + g.R * 0.3, 2, [70, 66, 72]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2, x = g.cx + Math.cos(a) * g.R * 0.3, y = g.cy - 2 + Math.sin(a) * g.R * 0.3; p.poly([[x + Math.cos(a + 1.57) * 5, y + Math.sin(a + 1.57) * 5], [g.cx + Math.cos(a) * g.R * 0.78, g.cy - 2 + Math.sin(a) * g.R * 0.78], [x + Math.cos(a - 1.57) * 5, y + Math.sin(a - 1.57) * 5]], st, false, 0.1); }
      p.ball(g.cx, g.cy - 2, Math.round(g.R * 0.44), st, false);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; p.put(g.cx + Math.cos(a) * g.R * 0.3, g.cy - 2 + Math.sin(a) * g.R * 0.3, [60, 60, 70]); }
      p.ball(g.cx, g.cy - g.R * 0.62, 3, st, false);
    },
    flail: (p, g) => { // кистень: цепь и шар с шипами
      const iron = hex('#6a6e78');
      const hx = g.cx + g.R * 0.1, hy = g.cy + g.R * 0.25;
      p.line(g.sx, g.sy, hx, hy, 3, [90, 70, 50]);
      p.ball(hx, hy, 4, iron, false);
      const bx = g.cx - g.R * 0.45, by = g.cy - g.R * 0.35;
      for (let i = 0; i <= 6; i++) { const t = i / 6, x = hx + (bx - hx) * t, y = hy + (by - hy) * t + Math.sin(t * Math.PI) * 6; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) if (!(dx && dy)) p.put(x + dx * 1.5, y + dy * 1.5, i % 2 ? [150, 150, 160] : [90, 90, 100]); }
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; p.poly([[bx + Math.cos(a + 0.25) * g.R * 0.36, by + Math.sin(a + 0.25) * g.R * 0.36], [bx + Math.cos(a) * g.R * 0.62, by + Math.sin(a) * g.R * 0.62], [bx + Math.cos(a - 0.25) * g.R * 0.36, by + Math.sin(a - 0.25) * g.R * 0.36]], hex('#b8bcc6'), false); }
      p.ball(bx, by, Math.round(g.R * 0.4), iron, false);
    },
    waraxe: (p, g) => { // секира: два широких полумесяца
      const st = hex('#a0a6b0');
      p.line(g.sx, g.sy, g.cx, g.cy - g.R * 0.6, 3, hex('#6a4028'));
      for (const sx of [-1, 1]) {
        const pts = [[g.cx + sx * 3, g.cy - g.R * 0.45], [g.cx + sx * g.R * 0.75, g.cy - g.R * 0.95], [g.cx + sx * g.R * 1.0, g.cy - g.R * 0.25], [g.cx + sx * g.R * 0.75, g.cy + g.R * 0.45], [g.cx + sx * 3, g.cy - g.R * 0.05]];
        p.poly(pts, st, false, sx < 0 ? 0.15 : -0.05);
        p.line(g.cx + sx * g.R * 0.75, g.cy - g.R * 0.9, g.cx + sx * g.R * 0.95, g.cy - g.R * 0.25, 0, [230, 236, 244]);
      }
      p.ball(g.cx, g.cy - g.R * 0.25, 3, hex('#c8a040'), false);
    },
  };
  UI.paintWeaponHead = function (d, e, w, h, style, md) {
    const f = WDRAW[style];
    if (!f) return false;
    // голова — сверху, пока строка широкая; потом идёт рукоять
    let y0 = -1;
    for (let y = 0; y < h && y0 < 0; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) { y0 = y; break; }
    if (y0 < 0) return false;
    const span = (y) => { let a = -1, b = -1; for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8 && !(md && md[(y * w + x) * 4] > 128)) { if (a < 0) a = x; b = x; } return a < 0 ? [0, -1] : [a, b]; };
    const wd = (y) => { const [a, b] = span(y); return b - a + 1; };
    let mw = 0, my = y0;
    for (let y = y0; y < Math.min(h, y0 + 70); y++) { const v = wd(y); if (v > mw) { mw = v; my = y; } }
    let cut = my + 6, x0 = 1e9, x1 = -1;
    for (let y = my; y < h - 6; y++) if (wd(y) < mw * 0.42 && wd(y + 2) < mw * 0.42 && wd(y + 4) < mw * 0.42) { cut = y; break; }
    for (let y = y0; y < cut; y++) { const [a, b] = span(y); if (b >= a) { x0 = Math.min(x0, a); x1 = Math.max(x1, b); } }
    for (let y = 0; y < cut; y++) for (let x = 0; x < w; x++) { const q = (y * w + x) * 4; d[q + 3] = 0; if (e) e[q + 3] = 0; }
    let sx = (x0 + x1) / 2, sy = cut;
    for (let y = cut; y < Math.min(h, cut + 20); y++) { const [a, b] = span(y); if (b >= a) { sx = (a + b) / 2; sy = y; break; } }
    const R = Math.max(24, U_clamp((x1 - x0) / 2, 14, 34), w * 0.26);
    const g = { cx: (x0 + x1) / 2, cy: Math.max(R * 0.95, (y0 + cut) / 2), R, sx, sy: sy + 1 };
    const p = painter(d, e, w, h);
    f(p, g);
    p.outline();
    return true;
  };
  // перерисовать верх спрайта посоха: d/e — пиксели спрайта и свечения, md — маска (G — сфера), style — вид, wood — цвет древка, orbCol — цвет чар
  UI.paintStaffHead = function (d, e, md, w, h, style, wood, orbCol) {
    const f = DRAW[style];
    if (!f) return false;
    // где была сфера
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (md[(y * w + x) * 4 + 1] > 128) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    if (x1 < 0) return false;
    const cut = y1 + 5;
    // срезать сферу и рога
    for (let y = 0; y < cut; y++) for (let x = 0; x < w; x++) { const q = (y * w + x) * 4; d[q + 3] = 0; if (e) e[q + 3] = 0; }
    // верх древка: середина первых непрозрачных строк ниже среза
    let sx = (x0 + x1) / 2, sy = cut;
    for (let y = cut; y < Math.min(h, cut + 30); y++) { let a = 0, n = 0; for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8 && md[(y * w + x) * 4] <= 128) { a += x; n++; } if (n) { sx = a / n; sy = y; break; } }
    // навершие крупнее прежней сферы: верх — у края спрайта, низ — ближе к древку
    const R = Math.max(16, (x1 - x0) / 2) * 1.32;
    const g = { cx: (x0 + x1) / 2, cy: Math.min(R + 2, sy - R * 0.55), R, sx, sy: sy + 1, wood: wood ? hex(wood) : [110, 70, 44], glow: orbCol || GLOW[style] };
    const p = painter(d, e, w, h);
    f(p, g);
    p.outline();
    return true;
  };
  UI.staffHeadOf = (it) => (it ? HEAD[it.b] || null : null);
})(window.EOF);
