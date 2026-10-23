'use strict';
// Графический движок «ASCII 2.5D».
// Всё рисуется символами: у каждой вещи и существа есть свой маленький рисунок из нескольких знаков,
// у земли — текстура из знаков, у стен — верх и лицевая грань из знаков.
// Модуль ничего не знает об игре: на входе — атлас (art.js) и описание сцены (scene.js), на выходе — картинка.
//
// Масштаб: клетка карты — это 4×2 «малых» символа. Спрайт может быть шире и выше клетки:
// нижний ряд спрайта стоит на нижнем ряду клетки, остальное поднимается над ней (2.5D).
(function (E) {
  const U = E.U;
  const Gfx = E.Gfx = { sprites: {}, grounds: {}, blocks: {}, roofs: {}, groups: {} };
  const S = Gfx.S = { fpx: 12, cw: 7, ch: 14, TW: 28, TH: 28, dpr: 1, family: 'monospace', ready: false };
  const CW = 4, CH = 2; // клетка в малых символах
  Gfx.CW = CW; Gfx.CH = CH;
  let cache = new Map();

  // ---------- масштаб ----------
  Gfx.setScale = function (fpx, dpr, family) {
    if (S.ready && S.fpx === fpx && S.dpr === dpr && S.family === family) return false;
    const c = document.createElement('canvas').getContext('2d');
    c.font = fpx + 'px ' + family;
    S.fpx = fpx; S.dpr = dpr; S.family = family;
    S.cw = Math.max(4, Math.round(c.measureText('M').width));
    S.ch = Math.max(7, Math.round(fpx * 1.08));
    S.TW = S.cw * CW; S.TH = S.ch * CH;
    S.ready = true;
    cache = new Map();
    return true;
  };
  Gfx.clearCache = () => { cache = new Map(); };
  // кэш готовых рисунков не растёт без меры: при переполнении начинается заново
  const remember = (k, img) => { if (cache.size > 3000) cache = new Map(); cache.set(k, img); };
  Gfx.cacheSize = () => cache.size;

  // ---------- режимы цвета ----------
  const MODES = Gfx.MODES = [
    (c) => c,                                            // 0 — как есть
    (c) => U.mixc(U.gray(c, 0.85), '#1c1c2a', 0.58),     // 1 — память: видел раньше, сейчас не видно
    (c) => U.mixc(U.gray(c, 0.6), '#7a3a8a', 0.7),       // 2 — чутьё: силуэт сквозь стены
    (c) => U.mixc(c, '#ff3030', 0.65),                   // 3 — удар
    (c) => U.mixc(c, '#a0f0e8', 0.55),                   // 4 — призрак
    (c) => U.mixc(U.gray(c, 0.5), '#d8e4f0', 0.35),      // 5 — отражение
  ];

  // ---------- зеркало ----------
  const MIR = {
    '/': '\\', '\\': '/', '(': ')', ')': '(', '<': '>', '>': '<', '[': ']', ']': '[', '{': '}', '}': '{',
    'd': 'b', 'b': 'd', 'p': 'q', 'q': 'p', '«': '»', '»': '«', '⌐': '¬', '¬': '⌐', '`': '\'', '\'': '`',
    '╔': '╗', '╗': '╔', '╚': '╝', '╝': '╚', '┌': '┐', '┐': '┌', '└': '┘', '┘': '└', '├': '┤', '┤': '├',
    '▌': '▐', '▐': '▌', '↗': '↖', '↖': '↗', '↘': '↙', '↙': '↘', '◄': '►', '►': '◄', '⊂': '⊃', '⊃': '⊂', 'ɔ': 'c', 'c': 'ɔ', 'J': 'L', 'L': 'J',
  };
  const mirChar = (c) => MIR[c] || c;

  // ---------- разбор рисунков ----------
  // Рисунок — строка (обычно String.raw), ряды через \n, кадры разделены строкой «--».
  function parseFrames(s) {
    if (s == null) return null;
    const src = Array.isArray(s) ? s.map((x) => String(x).replace(/^\n/, '')).join('\n--\n') : String(s);
    const out = [];
    let cur = [];
    for (const line of src.replace(/^\n/, '').split('\n')) {
      if (line === '--') { out.push(cur); cur = []; continue; }
      cur.push(line);
    }
    out.push(cur);
    // хвостовые пустые строки не нужны
    for (const f of out) while (f.length > 1 && f[f.length - 1].trim() === '' && f.length > 1) { if (f[f.length - 1] === '') f.pop(); else break; }
    return out;
  }
  Gfx.parseFrames = parseFrames;

  // ---------- спрайты ----------
  // def: { art, ink, pal, ox, oy, bold, outline, flip, lift, shadow, group, name }
  //   art  — рисунок (кадры через «--»), пробел — прозрачно;
  //   ink  — такая же сетка букв палитры (одна на все кадры или по кадру);
  //   pal  — { буква: цвет }; '$c' — основной цвет существа, '$d' — темнее, '$l' — светлее, '$k' — кожа;
  //   ox   — сдвиг по x в малых символах (по умолчанию — по центру клетки); oy — сдвиг вниз;
  //   shadow — ширина тени в клетках (0 — без тени); lift — парит над землёй (пикселей на 10 px шрифта).
  Gfx.sprite = function (key, def) { def.key = key; def._c = null; Gfx.sprites[key] = def; if (def.group) (Gfx.groups[def.group] = Gfx.groups[def.group] || []).push(key); return def; };
  function compile(d) {
    if (d._c) return d._c;
    const arts = parseFrames(d.art) || [['?']];
    const inks = parseFrames(d.ink);
    let w = 0, h = 0;
    for (const f of arts) { h = Math.max(h, f.length); for (const l of f) w = Math.max(w, [...l].length); }
    const frames = arts.map((f, k) => {
      const ink = inks ? inks[Math.min(k, inks.length - 1)] : null;
      const pad = h - f.length; // кадры ниже других прижимаются к земле
      const cells = [];
      for (let j = 0; j < h; j++) {
        const row = j - pad >= 0 ? [...(f[j - pad] || '')] : [];
        const irow = ink && j - pad >= 0 ? [...(ink[j - pad] || '')] : [];
        for (let i = 0; i < w; i++) cells.push([row[i] || ' ', irow[i] || ' ']);
      }
      return cells;
    });
    d._c = { w, h, frames };
    return d._c;
  }
  Gfx.compile = compile;
  function resolveColor(d, letter, col) {
    const pal = d.pal || {};
    let c = pal[letter];
    if (c == null) c = pal._ || pal.a || '#c8c8c8';
    if (c[0] === '$') {
      const base = col || pal.$ || '#c8c0b0';
      if (c === '$c') return base;
      if (c === '$d') return U.shade(base, 0.62);
      if (c === '$D') return U.shade(base, 0.4);
      if (c === '$l') return U.mixc(base, '#ffffff', 0.35);
      if (c === '$k') return '#d8b090';
    }
    return c;
  }
  function spriteGrid(d, f, col, flip) {
    const c = compile(d);
    const fr = c.frames[((f % c.frames.length) + c.frames.length) % c.frames.length];
    const cells = new Array(c.w * c.h);
    for (let j = 0; j < c.h; j++) for (let i = 0; i < c.w; i++) {
      const src = fr[j * c.w + (flip ? c.w - 1 - i : i)];
      const ch = flip ? mirChar(src[0]) : src[0];
      cells[j * c.w + i] = ch === ' ' ? null : [ch, resolveColor(d, src[1], col), null];
    }
    return { w: c.w, h: c.h, cells };
  }
  Gfx.frames = (key) => { const d = Gfx.sprites[key]; return d ? compile(d).frames.length : 1; };
  Gfx.size = (key) => { const d = Gfx.sprites[key]; if (!d) return null; const c = compile(d); return { w: c.w, h: c.h }; };

  // ---------- рисование сетки символов в холст ----------
  const BLOCK = { '█': [0, 0, 1, 1], '▀': [0, 0, 1, 0.5], '▄': [0, 0.5, 1, 0.5], '▌': [0, 0, 0.5, 1], '▐': [0.5, 0, 0.5, 1] };
  function paint(grid, mode, opt) {
    const pad = opt.outline ? 2 : 0;
    const W = grid.w * S.cw + pad * 2, H = grid.h * S.ch + pad * 2;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(W * S.dpr)); cv.height = Math.max(1, Math.ceil(H * S.dpr));
    const x = cv.getContext('2d');
    x.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    x.font = (opt.bold ? '700 ' : '') + S.fpx + 'px ' + S.family;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const tf = MODES[mode] || MODES[0];
    const n = grid.w * grid.h;
    for (let k = 0; k < n; k++) {
      const c = grid.cells[k];
      if (!c || !c[2]) continue;
      x.fillStyle = tf(c[2]);
      x.fillRect(pad + (k % grid.w) * S.cw, pad + Math.floor(k / grid.w) * S.ch, S.cw, S.ch);
    }
    if (opt.outline) {
      // тёмная обводка — чтобы рисунок читался поверх любой земли
      x.lineJoin = 'round'; x.lineWidth = Math.max(2, S.cw * 0.45); x.strokeStyle = opt.outline === true ? 'rgba(6,5,10,0.9)' : opt.outline;
      for (let k = 0; k < n; k++) {
        const c = grid.cells[k];
        if (!c || c[0] === ' ' || BLOCK[c[0]]) continue;
        x.strokeText(c[0], pad + (k % grid.w + 0.5) * S.cw, pad + (Math.floor(k / grid.w) + 0.5) * S.ch + 1);
      }
    }
    for (let k = 0; k < n; k++) {
      const c = grid.cells[k];
      if (!c || c[0] === ' ') continue;
      x.fillStyle = tf(c[1] || '#c8c8c8');
      const px = pad + (k % grid.w) * S.cw, py = pad + Math.floor(k / grid.w) * S.ch;
      const bl = BLOCK[c[0]];
      if (bl) { x.fillRect(px + bl[0] * S.cw, py + bl[1] * S.ch, Math.ceil(bl[2] * S.cw), Math.ceil(bl[3] * S.ch)); continue; }
      x.fillText(c[0], px + S.cw / 2, py + S.ch / 2 + 1);
    }
    return { cv, pad, w: W, h: H };
  }
  Gfx.paint = paint;

  // ---------- спрайты: получение и вывод ----------
  Gfx.spriteImg = function (key, f, mode, col, flip) {
    const d = Gfx.sprites[key];
    if (!d) return null;
    const nf = compile(d).frames.length;
    const fr = ((f || 0) % nf + nf) % nf;
    const ck = 's|' + key + '|' + fr + '|' + (mode || 0) + '|' + (col || '') + '|' + (flip ? 1 : 0);
    let img = cache.get(ck);
    if (!img) { img = paint(spriteGrid(d, fr, col, flip), mode || 0, { outline: d.outline === false ? false : (d.outline || true), bold: d.bold }); remember(ck, img); }
    return img;
  };
  // x, y — левый верхний угол клетки, на которой стоит спрайт (в пикселях)
  Gfx.drawSprite = function (ctx, key, x, y, o) {
    o = o || {};
    const d = Gfx.sprites[key];
    if (!d) return;
    const c = compile(d);
    const img = Gfx.spriteImg(key, o.f || 0, o.mode || 0, o.c, o.flip);
    let ox = d.ox != null ? d.ox : (CW - c.w) / 2;
    if (o.flip) ox = CW - c.w - ox;
    const lift = (d.lift || 0) * S.fpx / 10 + (o.lift || 0);
    const px = Math.round(x + ox * S.cw - img.pad), py = Math.round(y + (CH - c.h + (d.oy || 0)) * S.ch - img.pad - lift);
    if (o.alpha != null && o.alpha < 1) { ctx.globalAlpha = o.alpha; ctx.drawImage(img.cv, px, py, img.w, img.h); ctx.globalAlpha = 1; }
    else ctx.drawImage(img.cv, px, py, img.w, img.h);
  };

  // ---------- земля ----------
  // def: { bg, fn(u, v, f, h) -> [символ, цвет, фон?] | null, period: [P, Q], frames, seed }
  //   u, v — координаты малой ячейки внутри периода; h — её хэш (0..1), f — кадр анимации.
  Gfx.ground = function (key, def) { def.key = key; Gfx.grounds[key] = def; if (def.group !== false) (Gfx.groups.ground = Gfx.groups.ground || []).push(key); return def; };
  const hash = (a, b, c) => { let h = Math.imul(a ^ 0x9e3779b1, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35) ^ Math.imul(c | 0, 0x27d4eb2f); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; };
  Gfx.hash = hash;
  const strSeed = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
  Gfx.groundImg = function (key, tx, ty, f, mode) {
    const d = Gfx.grounds[key];
    if (!d) return null;
    const P = d.period ? d.period[0] : 4, Q = d.period ? d.period[1] : 4;
    const vx = ((tx % P) + P) % P, vy = ((ty % Q) + Q) % Q, fr = d.frames ? ((f % d.frames) + d.frames) % d.frames : 0;
    const ck = 'g|' + key + '|' + vx + '|' + vy + '|' + fr + '|' + (mode || 0);
    let img = cache.get(ck);
    if (img) return img;
    if (d._seed == null) d._seed = strSeed(key);
    const cells = [];
    for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
      const u = vx * CW + i, v = vy * CH + j;
      const r = d.fn ? d.fn(u, v, fr, hash(u, v, d._seed), P * CW, Q * CH) : null;
      cells.push(r ? [r[0], r[1], r[2] || d.bg || null] : [' ', null, d.bg || null]);
    }
    img = paint({ w: CW, h: CH, cells }, mode || 0, { outline: false });
    remember(ck, img);
    return img;
  };
  // base — цвет почвы под текстурой; если задан baseOverride (общая почва карты), берётся он: так соседние
  // трава, снег и камни не превращаются в лоскутное одеяло
  Gfx.drawGround = function (ctx, key, x, y, tx, ty, f, mode, baseOverride) {
    const d = Gfx.grounds[key];
    if (!d) return;
    const base = d.bg ? null : baseOverride && d.base ? U.mixc(d.base, baseOverride, 0.65) : (baseOverride || d.base);
    if (base) { ctx.fillStyle = (MODES[mode] || MODES[0])(base); ctx.fillRect(x, y, S.TW, S.TH); }
    const img = Gfx.groundImg(key, tx, ty, f, mode);
    if (img) ctx.drawImage(img.cv, x, y, img.w, img.h);
  };

  // ---------- блоки (стены, скалы) ----------
  // def: { top(mask, vx, vy) -> сетка 4×2, face(mask, vx, vy) -> сетка 4×2, period }
  //   mask — соседи-блоки: 1 север, 2 восток, 4 юг, 8 запад.
  Gfx.block = function (key, def) { def.key = key; Gfx.blocks[key] = def; (Gfx.groups.block = Gfx.groups.block || []).push(key); return def; };
  Gfx.blockImg = function (key, part, mask, tx, ty, mode) {
    const d = Gfx.blocks[key];
    if (!d) return null;
    const P = d.period ? d.period[0] : 2, Q = d.period ? d.period[1] : 2;
    const vx = ((tx % P) + P) % P, vy = ((ty % Q) + Q) % Q;
    const ck = 'b|' + key + '|' + part + '|' + mask + '|' + vx + '|' + vy + '|' + (mode || 0);
    let img = cache.get(ck);
    if (img) return img;
    const g = part === 't' ? d.top(mask, vx, vy) : d.face(mask, vx, vy);
    // 'h' — низкая грань: только верхний ряд (стены домов и пещер не закрывают пол целиком)
    if (part === 'h') for (let i = CW; i < CW * CH; i++) g.cells[i] = null;
    img = paint(g, mode || 0, { outline: false });
    remember(ck, img);
    return img;
  };

  // ---------- крыши ----------
  // def: { cell(info) -> сетка 4×2 }, info: { l, r, t, b (края), ridge, x, y, w, h }
  Gfx.roof = function (key, def) { def.key = key; Gfx.roofs[key] = def; (Gfx.groups.roof = Gfx.groups.roof || []).push(key); return def; };
  Gfx.roofImg = function (key, info, mode) {
    const d = Gfx.roofs[key];
    if (!d) return null;
    const ck = 'r|' + key + '|' + info.l + info.r + info.t + info.b + '|' + info.zone + '|' + (info.x & 1) + '|' + (mode || 0);
    let img = cache.get(ck);
    if (img) return img;
    img = paint(d.cell(info), mode || 0, { outline: false });
    remember(ck, img);
    return img;
  };

  // ---------- помощники для атласа ----------
  // Сетка 4×2 из строк и цветов: rows — 2 строки по 4 символа, ink — буквы палитры, pal — цвета, bg — фон
  Gfx.grid = function (rows, ink, pal, bg) {
    const cells = [];
    for (let j = 0; j < CH; j++) {
      const r = [...(rows[j] || '')], k = [...((ink && ink[j]) || '')];
      for (let i = 0; i < CW; i++) {
        const ch = r[i] || ' ';
        const b = typeof bg === 'object' && bg ? bg[(k[i] || '_')] || bg._ : bg;
        cells.push([ch, pal[k[i] || '_'] || pal._ || '#c8c8c8', b || null]);
      }
    }
    return { w: CW, h: CH, cells };
  };

  // ---------- правки из студии ----------
  // Студия (tools/studio.html) сохраняет изменённые рисунки; игра подхватывает их при запуске.
  Gfx.OVR_KEY = 'eotf_art';
  Gfx.applyOverrides = function () {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(Gfx.OVR_KEY) || 'null'); } catch (e) { o = null; }
    if (!o || typeof o !== 'object') return 0;
    let n = 0;
    for (const k in o) {
      const d = Gfx.sprites[k], v = o[k];
      if (!d || !v || typeof v !== 'object') continue;
      if (typeof v.art === 'string') d.art = v.art;
      if (typeof v.ink === 'string') d.ink = v.ink;
      if (v.pal && typeof v.pal === 'object') d.pal = Object.assign({}, d.pal, v.pal);
      if (typeof v.ox === 'number') d.ox = v.ox;
      if (typeof v.oy === 'number') d.oy = v.oy;
      d._c = null; n++;
    }
    cache = new Map();
    return n;
  };
})(window.EOF);
