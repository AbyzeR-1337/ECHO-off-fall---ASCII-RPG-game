'use strict';
// «Почти реальность» в символах (уровни графики 3–5).
// Кадр сначала считается как изображение: у каждой крошечной ячейки есть материал (цвет, рельеф,
// блеск, свечение), нормаль и место в мире. Потом его освещают солнце или луна (с тенями,
// которые зависят от времени суток), небо, огни и факел; вода бликует, облака плывут, ложится туман.
// И только в конце каждая ячейка становится ASCII-символом: плотность символа — от яркости и фактуры,
// цвет — от света. Модуль не знает игровых правил: на входе то же описание сцены, что и у scene.js.
(function (E) {
  const Gfx = E.Gfx;
  const HF = Gfx.HF = { mats: {}, blocks: {}, roofs: {}, models: {} };

  // ============================================================
  // Шум
  // ============================================================
  const hash2 = (x, y, s) => {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s, oct) {
    let a = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { a += amp * vnoise(x * f, y * f, s + i * 17); n += amp; f *= 2.03; amp *= 0.5; }
    return a / n;
  }
  // клеточный шум: расстояние до ближайшей и второй точки (камни, брусчатка, трещины)
  function cell2(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y);
    let d1 = 9, d2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = xi + i, cy = yi + j;
      const px = cx + hash2(cx, cy, s), py = cy + hash2(cx, cy, s + 7);
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < d1) { d2 = d1; d1 = d; id = hash2(cx, cy, s + 13); } else if (d < d2) d2 = d;
    }
    return [Math.sqrt(d1), Math.sqrt(d2), id];
  }
  HF.noise = { hash2, vnoise, fbm, cell2 };
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  HF.smooth = smooth;

  // ============================================================
  // Цвета
  // ============================================================
  const hexCache = new Map();
  const C = HF.C = (hex) => {
    let c = hexCache.get(hex);
    if (!c) { const n = parseInt(hex.slice(1), 16); c = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; hexCache.set(hex, c); }
    return c;
  };
  HF.parseRGBA = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null; const p = m[1].split(',').map(Number); return [p[0] / 255, p[1] / 255, p[2] / 255, p[3] == null ? 1 : p[3]]; };

  // ============================================================
  // Наборы символов: pick(t, l) — t: фактура 0..1, l: освещённость 0..1
  // ============================================================
  const CSL = HF.CSL = [], CSN = HF.CS = {}, CHARS = new Set(' ');
  const pickStr = (s, x) => s[x <= 0 ? 0 : x >= 1 ? s.length - 1 : Math.floor(x * s.length)];
  function cs(name, str, fn) { for (const ch of str) CHARS.add(ch); CSL.push(fn); CSN[name] = CSL.length - 1; }
  const RAMP = (s, kl, kt) => (t, l) => pickStr(s, l * kl + t * kt);
  cs('none', ' ', () => ' ');
  cs('grass', '.,\'`";/|\\', (t, l) => (l < 0.1 ? '.' : pickStr('.,,\'\'`"";;/|\\', t * 0.9 + l * 0.1)));
  cs('dirt', '.,:;\'`', RAMP('.,:;\'`', 0.2, 0.85));
  cs('stone', '.:-=+*#%', RAMP('.:-=+*#%', 0.85, 0.3));
  cs('sand', '.,·:\'`', RAMP('..,·:\'`', 0.15, 0.9));
  cs('snow', '.\':`', RAMP('..\'`:', 0.15, 0.9));
  cs('water', '~≈-=.', (t, l) => pickStr('.-~≈=', t * 0.8 + l * 0.3));
  cs('wood', '|=-_', (t, l) => (t < 0.12 ? '|' : t > 0.92 ? '_' : l > 0.55 ? '=' : '-'));
  cs('brick', '_|.:=#', (t, l) => (t < 0.14 ? '_' : t < 0.26 ? '|' : pickStr('.:=#', l * 0.9 + (t - 0.26) * 0.4)));
  cs('leaf', ' .:;+*%&@', RAMP(' .:;+*%&@', 0.9, 0.25));
  cs('bark', '|(){}', (t) => pickStr('||(){}', t));
  cs('cloth', '.:-=+*#%@', RAMP('.:-=+*#%@', 0.9, 0.2));
  cs('skin', 'o0O@', RAMP('oo0O', 0.7, 0.4));
  cs('metal', '=#H8*', (t, l) => (l > 0.88 ? '*' : pickStr('=#H8', l * 0.8 + t * 0.3)));
  cs('fire', '\'`^*()', (t) => pickStr('\'`^*()', t));
  cs('fur', ',;"wmWM', RAMP(',;"wmWM', 0.7, 0.4));
  cs('glow', '·+*°o', (t) => pickStr('·+*°o', t));
  cs('thatchN', '/"\'', (t) => pickStr('//"\'', t));
  cs('thatchS', '\\"\'', (t) => pickStr('\\\\"\'', t));
  cs('rooftile', '^nm', (t, l) => (t < 0.15 ? '_' : pickStr('^nm', l)));
  cs('slate', '=-_', (t) => pickStr('==-_', t));
  cs('ice', '-=/\\\'', (t) => pickStr('-=/\\\'', t));
  cs('lava', '≈~*', (t) => pickStr('~≈≈*', t));
  cs('flower', '*o°', (t) => pickStr('*o°', t));
  cs('ghost', '~°o.', (t) => pickStr('.~°o', t));
  cs('bone', '=-+#', RAMP('-=+#', 0.8, 0.3));
  cs('dark', ' .', (t) => (t > 0.85 ? '.' : ' '));
  cs('gold', '$*=#', (t, l) => (l > 0.8 ? '*' : pickStr('=$#', t)));
  cs('player', '@', () => '@');
  cs('eye', '•', () => '•');
  cs('cobble', 'oO°•', (t, l) => (t < 0.18 ? ' ' : pickStr('°oO•', l * 0.7 + t * 0.3)));
  cs('tiles', '+-|.', (t) => (t < 0.1 ? '+' : t < 0.3 ? '-' : t < 0.42 ? '|' : t > 0.9 ? '.' : ' '));
  cs('rune', '≡¶§', (t) => pickStr('≡¶§', t));
  cs('book', '|‖▌', (t) => pickStr('|‖▌', t));
  cs('glass', '▒#', (t, l) => (l > 0.6 ? '▒' : '#'));
  cs('rock', '/\\|;:.\'', (t, l) => pickStr('.:;\'|/\\', t * 0.75 + l * 0.3));
  cs('moss', ',;"\'', (t) => pickStr(',;"\'', t));
  cs('crop', 'ψ|Yv', (t) => pickStr('|ψYv', t));
  cs('wing', '~^v', (t) => pickStr('~^v', t));
  cs('scale', '<>vV', (t) => pickStr('<>vV', t));
  cs('smoke', '°o.\'', (t) => pickStr('.\'°o', t));
  cs('star', '*+.', (t) => pickStr('.+*', t));
  cs('root', '~S§', (t) => pickStr('~~S§', t));
  cs('solid', '#%@', RAMP('#%@', 0.9, 0.2));
  cs('pebble', 'o°.', (t) => pickStr('.°oo', t));
  cs('sleep', 'zZ', (t) => (t > 0.5 ? 'Z' : 'z'));
  // символы по направлению и по форме: конечности — чёрточки вдоль кости, голова — (O), туловище — [#], конус — /^\\
  cs('lineV', '|', (t, l) => (l < 0.06 ? '.' : '|'));
  cs('lineH', '-', (t, l) => (l < 0.06 ? '.' : '-'));
  cs('lineD1', '\\', (t, l) => (l < 0.06 ? '.' : '\\'));
  cs('lineD2', '/', (t, l) => (l < 0.06 ? '.' : '/'));
  cs('face', '()Oo', (t, l) => (t < 0.3 ? '(' : t > 0.7 ? ')' : l > 0.5 ? 'O' : 'o'));
  cs('body', '[]#%=', (t, l) => (t < 0.26 ? '[' : t > 0.74 ? ']' : pickStr('=#%', l)));
  cs('cone', '/\\^A', (t, l) => (t < 0.4 ? '/' : t > 0.6 ? '\\' : l > 0.6 ? 'A' : '^'));
  cs('hair', '~"\'', (t) => pickStr('~"\'', t));
  for (const ch of '|_-/\\()[]*\'`,.~°+') CHARS.add(ch);
  for (let c = 33; c < 127; c++) CHARS.add(String.fromCharCode(c));
  HF.allChars = () => [...CHARS];

  // ============================================================
  // Небо: солнце, луна, свет неба — от времени суток и погоды
  // ============================================================
  const DIM_SKY = {
    dream: [[0.30, 0.20, 0.45], 0.7], spirit: [[0.12, 0.32, 0.30], 0.6], void: [[0.08, 0.08, 0.16], 0.45], time: [[0.40, 0.32, 0.16], 0.7],
    moon: [[0.30, 0.32, 0.42], 0.7], flesh: [[0.35, 0.10, 0.14], 0.55], sea: [[0.06, 0.16, 0.30], 0.5], depths: [[0.25, 0.10, 0.04], 0.35], mirror: [[0.55, 0.60, 0.72], 0.75],
  };
  HF.sky = function (o) {
    const out = { S: [0, 0.5, 0.8], sun: [0, 0, 0], amb: [0.1, 0.1, 0.12], M: null, moon: [0, 0, 0], day: 0, over: 0 };
    if (o.dim && DIM_SKY[o.dim]) { const d = DIM_SKY[o.dim]; out.amb = d[0].map((x) => x * d[1] * 1.4); return out; }
    if (!o.outdoor) { out.amb = o.abyss ? [0.06, 0.01, 0.02] : [0.035, 0.03, 0.03]; return out; }
    const md = ((o.time % 1440) + 1440) % 1440;
    const ang = (md / 1440 - 0.25) * Math.PI * 2; // 06:00 — восток, 12:00 — юг, 18:00 — запад
    const el = Math.sin(ang);
    const sx = Math.cos(ang), sy = 0.42, sz = Math.max(0.06, el);
    const len = Math.hypot(sx, sy, sz);
    out.S = [sx / len, sy / len, sz / len];
    const day = smooth(-0.1, 0.28, el);
    const warm = 1 - smooth(0.04, 0.42, el);
    const over = { cloudy: 0.35, rain: 0.6, storm: 0.75, snow: 0.5, blizzard: 0.7, fog: 0.5, blacksnow: 0.6, ashrain: 0.6, sandstorm: 0.6 }[o.weather] || 0;
    out.over = over;
    const sunK = day * 1.08 * (1 - over * 0.78);
    out.sun = [(1 - warm * 0.0) * sunK, (0.97 - warm * 0.38) * sunK, (0.9 - warm * 0.6) * sunK];
    const dusk = smooth(-0.25, 0.05, el) * (1 - smooth(0.05, 0.35, el));
    out.amb = [0.07 + 0.36 * day + 0.12 * dusk, 0.085 + 0.4 * day + 0.03 * dusk, 0.17 + 0.46 * day - 0.02 * dusk].map((x) => x * (1 - over * 0.15));
    if (o.nightland) out.amb = out.amb.map((x, i) => x * 0.8 + [0.04, 0.05, 0.14][i]);
    out.day = day;
    if (day < 0.5) {
      const mz = Math.max(0.35, -el), mx = -sx * 0.6;
      const ml = Math.hypot(mx, 0.4, mz);
      out.M = [mx / ml, 0.4 / ml, mz / ml];
      const mk = (1 - day * 2) * (o.fullMoon ? 0.42 : 0.2) * (1 - over * 0.7);
      out.moon = [0.55 * mk, 0.65 * mk, 0.95 * mk];
    }
    return out;
  };

  // ============================================================
  // Атлас глифов: альфа каждого символа в пикселях ячейки
  // ============================================================
  let GA = null;
  function glyphAtlas(cw, ch, family) {
    if (GA && GA.cw === cw && GA.ch === ch && GA.family === family) return GA;
    const chars = HF.allChars();
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch * chars.length;
    const x = cv.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#000'; x.fillRect(0, 0, cv.width, cv.height);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = Math.max(5, Math.round(ch * 0.9)) + 'px ' + family;
    chars.forEach((c, i) => { if (c !== ' ') x.fillText(c, cw / 2, i * ch + ch / 2 + ch * 0.04); });
    const data = x.getImageData(0, 0, cv.width, cv.height).data;
    const alpha = new Uint8Array(cw * ch * chars.length);
    for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4];
    const index = new Map(), code = new Uint16Array(65536);
    chars.forEach((c, i) => { index.set(c, i); code[c.charCodeAt(0)] = i; });
    GA = { cw, ch, family, chars, alpha, index, code };
    return GA;
  }
  HF.glyphIndex = (c) => (GA ? GA.index.get(c) || 0 : 0);
  HF.glyphAtlas = glyphAtlas;

  // ============================================================
  // Образцы символов для подбора по форме
  // ============================================================
  // Клетка делится на SX×SY долей; для каждого символа считаем, насколько закрашена каждая доля.
  // Потом для куска картинки выбирается символ, чей рисунок ближе всего к нему: край фигуры
  // становится «d», «/» или «(», светлая гладь — «$» или «#», полутень — «:» и «.».
  // full — для фигур и построек: знаки, которые хорошо ложатся на контур (без «текстовых» букв вроде M, W, g, y);
  // light — для земли: только лёгкие штрихи. ramp — шкала плотности для ровных мест.
  const GSET = {
    full: ' .,\'`^"-_~:;!|/\\()[]{}<>=+*?ijlrtvxoceaszJLTYIVXOC0dbpq$#%&@',
    light: ' .,\'`:;-_~=^"|/\\()vxoc*',
    line: ' .,\'`-_~:;=|/\\()[]<>^v+*#"!',
  };
  const GRAMP = { full: ' .:-=+*#%@', light: ' .,:;-=', line: ' .:-=+*#' };
  const GP = new Map();
  let FAM = 'monospace';
  HF.setFamily = (f) => { if (f && f !== FAM) { FAM = f; GP.clear(); mcache.clear(); if (HF.clearGround) HF.clearGround(); } };
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) document.fonts.ready.then(() => { GP.clear(); mcache.clear(); if (HF.clearGround) HF.clearGround(); });
  function patterns(SX, SY, set) {
    const key = FAM + '|' + SX + 'x' + SY + '|' + set;
    let pt = GP.get(key);
    if (pt) return pt;
    const chars = GSET[set], n = chars.length, R = 6, w = SX * R, h = SY * R, D = SX * SY;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h * n;
    const x = cv.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#000'; x.fillRect(0, 0, cv.width, cv.height);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = Math.round(h * 0.9) + 'px ' + FAM;
    for (let i = 0; i < n; i++) if (chars[i] !== ' ') x.fillText(chars[i], w / 2, i * h + h / 2 + h * 0.04);
    const data = x.getImageData(0, 0, cv.width, cv.height).data;
    const vec = new Float32Array(n * D), mean = new Float32Array(n);
    for (let i = 0; i < n; i++) for (let by = 0; by < SY; by++) for (let bx = 0; bx < SX; bx++) {
      let a = 0;
      for (let yy = 0; yy < R; yy++) for (let xx = 0; xx < R; xx++) a += data[((i * h + by * R + yy) * w + bx * R + xx) * 4];
      const v = a / (R * R * 255);
      vec[i * D + by * SX + bx] = v; mean[i] += v / D;
    }
    let mx = 0;
    for (let i = 0; i < n; i++) mx = Math.max(mx, mean[i]);
    // шкала плотности: номера её знаков, по возрастанию закраски
    const ramp = Array.from(GRAMP[set], (c) => chars.indexOf(c)).filter((i) => i >= 0).sort((a, b) => mean[a] - mean[b]);
    pt = { chars, codes: Array.from(chars, (c) => c.charCodeAt(0)), n, D, SX, SY, vec, mean, top: mx, ramp };
    GP.set(key, pt);
    return pt;
  }
  HF.patterns = patterns;
  // ближайший по рисунку символ (сумма квадратов разниц по долям)
  // ровное место (рисунка внутри клетки нет) — знак из шкалы плотности; иначе — по форме
  function matchGlyph(pt, tv) {
    const D = pt.D, v = pt.vec;
    let mu = 0, s2 = 0;
    for (let i = 0; i < D; i++) mu += tv[i];
    mu /= D;
    for (let i = 0; i < D; i++) { const e = tv[i] - mu; s2 += e * e; }
    s2 /= D;
    if (s2 < 0.0025 + mu * mu * 0.12) {
      const r = pt.ramp, mn = pt.mean;
      let bi = r[0], bdm = 1e9;
      for (let q = 0; q < r.length; q++) { const dm = Math.abs(mn[r[q]] - mu); if (dm < bdm) { bdm = dm; bi = r[q]; } }
      return bi;
    }
    let best = 0, bd = 1e9;
    for (let c = 0; c < pt.n; c++) {
      let d = 0;
      const o = c * D;
      for (let i = 0; i < D; i++) { const e = tv[i] - v[o + i]; d += e * e; if (d >= bd) break; }
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  HF.matchGlyph = matchGlyph;

  // ============================================================
  // Буфер кадра (ячейки экрана)
  // ============================================================
  let B = null;
  function buf(NU, NV) {
    const n = NU * NV;
    if (!B || B.n < n) {
      B = {
        n, ar: new Float32Array(n), ag: new Float32Array(n), ab: new Float32Array(n),
        nx: new Float32Array(n), ny: new Float32Array(n), nz: new Float32Array(n),
        wx: new Float32Array(n), wy: new Float32Array(n), wz: new Float32Array(n),
        er: new Float32Array(n), eg: new Float32Array(n), eb: new Float32Array(n),
        cs: new Uint8Array(n), tx: new Uint8Array(n), sp: new Uint8Array(n), fl: new Uint16Array(n), ao: new Uint8Array(n), id: new Uint32Array(n),
        fg: new Uint32Array(n), bg: new Uint32Array(n), gl: new Uint16Array(n),
        ur: new Float32Array(n), ug: new Float32Array(n), ub: new Float32Array(n),
      };
    }
    B.NU = NU; B.NV = NV;
    B.fl.fill(0, 0, n); B.id.fill(0, 0, n); B.er.fill(0, 0, n); B.eg.fill(0, 0, n); B.eb.fill(0, 0, n); B.ao.fill(255, 0, n); B.sp.fill(0, 0, n);
    return B;
  }
  // флаги ячейки
  // GLYPH — символ уже подобран по форме; PART — фигура закрывает клетку не целиком (фон — от того, что под ней)
  const F = HF.F = { FILL: 1, GROUND: 2, WATER: 4, MEM: 8, LAVA: 16, FOAM: 32, WINDOW: 64, ALPHA: 128, NOSHADOW: 256, GHOST: 512, WIND: 1024, REVEAL: 2048, GLYPH: 4096, PART: 8192, WALL: 16384 };
  HF.buf = () => B;

  // запись одной ячейки материала (o — результат функции материала)
  HF.put = function (k, o, wx, wy, wz, nx, ny, nz, id, flags) {
    const b = B;
    b.ar[k] = o.r; b.ag[k] = o.g; b.ab[k] = o.b;
    b.nx[k] = nx; b.ny[k] = ny; b.nz[k] = nz;
    b.wx[k] = wx; b.wy[k] = wy; b.wz[k] = wz;
    b.cs[k] = o.cs; b.tx[k] = Math.max(0, Math.min(255, (o.t * 255) | 0)); b.sp[k] = o.sp ? Math.min(255, (o.sp * 255) | 0) : 0;
    if (o.em) { b.er[k] = o.r * o.em; b.eg[k] = o.g * o.em; b.eb[k] = o.b * o.em; } else { b.er[k] = 0; b.eg[k] = 0; b.eb[k] = 0; }
    b.fl[k] = flags | (o.fl || 0) | F.FILL;
    b.id[k] = id;
  };
  // то же, но с готовым символом (код знака)
  HF.putG = function (k, o, wx, wy, wz, nx, ny, nz, id, flags, code) {
    HF.put(k, o, wx, wy, wz, nx, ny, nz, id, flags);
    if (code >= 0) { B.gl[k] = GA ? GA.code[code] : 0; B.fl[k] |= F.GLYPH; }
  };

  // ============================================================
  // Модели: растеризация объёмных примитивов в маленький «спрайт ячеек» (с кэшем)
  // ============================================================
  // Примитив: { t: 'e'|'b'|'c'|'d', ... , m: материал }. Координаты в клетках: x — восток, y — юг (к зрителю),
  // z — вверх; начало — у земли в середине клетки. Камера смотрит с юга сверху: экран = (x, y - z).
  const mcache = new Map();
  HF.clearModels = () => mcache.clear();
  function hitPrim(p, lx, s) {
    // возвращает t (чем больше, тем ближе к зрителю) или -1
    if (p.t === 'e') {
      const irx = 1 / (p.rx * p.rx), iry = 1 / (p.ry * p.ry), irz = 1 / (p.rz * p.rz);
      const dx = lx - p.x;
      const ex = dx * dx * irx;
      if (ex > 1) return -1;
      const sy = s - p.y;
      const A = iry + irz, Bq = 2 * sy * iry - 2 * p.z * irz, Cq = ex + sy * sy * iry + p.z * p.z * irz - 1;
      const D = Bq * Bq - 4 * A * Cq;
      if (D < 0) return -1;
      return (-Bq + Math.sqrt(D)) / (2 * A);
    }
    if (p.t === 'b') {
      if (lx < p.x0 || lx > p.x1) return -1;
      const lo = Math.max(p.y0 - s, p.z0), hi = Math.min(p.y1 - s, p.z1);
      return hi >= lo ? hi : -1;
    }
    if (p.t === 'c') {
      // конус: вершина вверху; dx² + (s+t-cy)² = (r(1-(t-z0)/h))²
      const dx = lx - p.x, k = p.r / p.h;
      const a0 = p.r + k * p.z0; // r(1-(t-z0)/h) = a0 - k t
      const sy = s - p.y;
      const A = 1 - k * k, Bq = 2 * sy + 2 * a0 * k, Cq = dx * dx + sy * sy - a0 * a0;
      if (Math.abs(A) < 1e-6) return -1;
      const D = Bq * Bq - 4 * A * Cq;
      if (D < 0) return -1;
      const r1 = (-Bq + Math.sqrt(D)) / (2 * A), r2 = (-Bq - Math.sqrt(D)) / (2 * A);
      let best = -1;
      for (const t of [r1, r2]) if (t >= p.z0 && t <= p.z0 + p.h && a0 - k * t >= 0 && t > best) best = t;
      return best;
    }
    if (p.t === 'y') {
      // стоячий цилиндр: (x - cx)² + (y - cy)² ≤ r², z от z0 до z1
      const dx = lx - p.x;
      if (dx * dx > p.r * p.r) return -1;
      const hw = Math.sqrt(p.r * p.r - dx * dx);
      const lo = Math.max(p.y - hw - s, p.z0), hi = Math.min(p.y + hw - s, p.z1);
      return hi >= lo ? hi : -1;
    }
    if (p.t === 'd') {
      const t = p.z, y = s + t;
      const dx = (lx - p.x) / p.rx, dy = (y - p.y) / p.ry;
      return dx * dx + dy * dy <= 1 ? t : -1;
    }
    return -1;
  }
  function normalOf(p, lx, y, z, out) {
    if (p.t === 'e') { out[0] = (lx - p.x) / (p.rx * p.rx); out[1] = (y - p.y) / (p.ry * p.ry); out[2] = (z - p.z) / (p.rz * p.rz); }
    else if (p.t === 'b') { if (Math.abs(z - p.z1) < 1e-4) { out[0] = 0; out[1] = 0; out[2] = 1; } else { out[0] = 0; out[1] = 1; out[2] = 0.15; } }
    else if (p.t === 'c') { const dx = lx - p.x, dy = y - p.y, rr = Math.hypot(dx, dy) || 1e-3; out[0] = dx / rr; out[1] = dy / rr; out[2] = p.r / p.h; }
    else if (p.t === 'y') { if (Math.abs(z - p.z1) < 1e-4) { out[0] = 0; out[1] = 0; out[2] = 1; } else { out[0] = (lx - p.x) / p.r; out[1] = (y - p.y) / p.r; out[2] = 0; } }
    else { out[0] = 0; out[1] = 0; out[2] = 1; }
    const l = Math.hypot(out[0], out[1], out[2]) || 1;
    out[0] /= l; out[1] /= l; out[2] /= l;
  }
  function bounds(p) {
    if (p.t === 'e') return [p.x - p.rx, p.x + p.rx, (p.y - p.ry) - (p.z + p.rz), (p.y + p.ry) - (p.z - p.rz)];
    if (p.t === 'b') return [p.x0, p.x1, p.y0 - p.z1, p.y1 - p.z0];
    if (p.t === 'c') return [p.x - p.r, p.x + p.r, (p.y - p.r) - (p.z0 + p.h), (p.y + p.r) - p.z0];
    if (p.t === 'y') return [p.x - p.r, p.x + p.r, (p.y - p.r) - p.z1, (p.y + p.r) - p.z0];
    return [p.x - p.rx, p.x + p.rx, p.y - p.ry - p.z, p.y + p.ry - p.z];
  }
  const mo = { r: 0, g: 0, b: 0, t: 0, cs: 0, sp: 0, em: 0, fl: 0 };
  // зеркальная копия модели (смотрит на запад)
  function mirror(p) {
    if (p.t === 'b') return Object.assign({}, p, { x0: -p.x1, x1: -p.x0 });
    return Object.assign({}, p, { x: -p.x });
  }
  // Растеризация модели в мелкие доли клетки (SX×SY на клетку), затем — символ по форме на каждую клетку.
  // Доли освещаются «мастерским» светом (слева сверху), с затенением в складках и тёмной линией там,
  // где одна часть тела заходит за другую, — так рисунок символов передаёт объём, как у художника.
  // Настоящий свет сцены (солнце, огни, тени) потом красит готовые символы.
  const RS = { sx: 4, sy: 8 };
  HF.RS = RS;
  let RB = null;
  function rbuf(n) {
    if (!RB || RB.n < n) RB = { n, dep: new Float32Array(n), tt: new Float32Array(n), pid: new Int16Array(n), lum: new Float32Array(n), r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), nx: new Float32Array(n), ny: new Float32Array(n), nz: new Float32Array(n), em: new Float32Array(n), sp: new Float32Array(n), al: new Float32Array(n), lk: new Float32Array(n) };
    return RB;
  }
  const KL = (() => { const v = [-0.5, 0.42, 0.76], l = Math.hypot(v[0], v[1], v[2]); return v.map((x) => x / l); })();
  const tv = new Float32Array(256);
  const pcount = new Int32Array(1024);
  HF.raster = function (key, prims, CX, CY, flip) {
    const ck = key + '|' + CX + '|' + CY + (flip ? '|f' : '') + '|' + FAM;
    let s = mcache.get(ck);
    if (s) return s;
    // новых рисунков за кадр — сколько успеем; остальные дорисуются в следующих кадрах
    if (HF.deadline && performance.now() > HF.deadline) { HF.pending = true; return null; }
    if (flip) prims = prims.map(mirror);
    const SX = RS.sx, SY = RS.sy, D = SX * SY, pt = patterns(SX, SY, 'full');
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    const bb = prims.map(bounds);
    for (const b of bb) { u0 = Math.min(u0, b[0]); u1 = Math.max(u1, b[1]); v0 = Math.min(v0, b[2]); v1 = Math.max(v1, b[3]); }
    const iu0 = Math.floor(u0 * CX), iu1 = Math.ceil(u1 * CX), iv0 = Math.floor(v0 * CY), iv1 = Math.ceil(v1 * CY);
    const w = Math.max(1, iu1 - iu0), h = Math.max(1, iv1 - iv0), n = w * h;
    const SW = w * SX, SH = h * SY, N = SW * SH, fx = CX * SX, fy = CY * SY;
    const R = rbuf(N);
    R.dep.fill(-1e9, 0, N); R.pid.fill(-1, 0, N);
    // 1. видимая поверхность (по каждому телу — только его прямоугольник)
    for (let q = 0; q < prims.length; q++) {
      const p = prims[q], b = bb[q];
      const i0 = Math.max(0, Math.floor(b[0] * fx) - iu0 * SX), i1 = Math.min(SW, Math.ceil(b[1] * fx) - iu0 * SX);
      const j0 = Math.max(0, Math.floor(b[2] * fy) - iv0 * SY), j1 = Math.min(SH, Math.ceil(b[3] * fy) - iv0 * SY);
      for (let j = j0; j < j1; j++) {
        const sv = (iv0 * SY + j + 0.5) / fy;
        for (let i = i0; i < i1; i++) {
          const lx = (iu0 * SX + i + 0.5) / fx;
          const t = hitPrim(p, lx, sv);
          if (t === -1 || t < -0.02) continue;
          const d = sv + 2 * t, k = j * SW + i;
          if (d > R.dep[k]) { R.dep[k] = d; R.tt[k] = t; R.pid[k] = q; }
        }
      }
    }
    // 2. материал и нормаль каждой доли
    const nrm = [0, 0, 1];
    for (let k = 0; k < N; k++) {
      const q = R.pid[k];
      if (q < 0) continue;
      const p = prims[q], i = k % SW, j = (k / SW) | 0;
      const lx = (iu0 * SX + i + 0.5) / fx, sv = (iv0 * SY + j + 0.5) / fy, t = R.tt[k];
      const y = sv + t, z = t;
      normalOf(p, lx, y, z, nrm);
      const m = p.m;
      mo.r = m.c[0]; mo.g = m.c[1]; mo.b = m.c[2]; mo.t = 0.5; mo.cs = m.cs; mo.sp = m.sp || 0; mo.em = m.em || 0; mo.fl = m.fl || 0;
      if (m.tex) { m.tex(lx, y, z, mo, nrm); const nl = Math.hypot(nrm[0], nrm[1], nrm[2]) || 1; nrm[0] /= nl; nrm[1] /= nl; nrm[2] /= nl; }
      R.r[k] = mo.r; R.g[k] = mo.g; R.b[k] = mo.b; R.nx[k] = nrm[0]; R.ny[k] = nrm[1]; R.nz[k] = nrm[2]; R.em[k] = mo.em; R.sp[k] = mo.sp;
      R.al[k] = m.a != null ? m.a : 1;
      R.lk[k] = mo.lk || 0; mo.lk = 0;
    }
    // 3. «мастерский» свет, затенение складок, линия перекрытия
    const r1 = Math.max(1, Math.round(0.035 * fx)), r2 = Math.max(2, Math.round(0.09 * fx));
    const ring = [[r1, 0], [-r1, 0], [0, r1], [0, -r1], [r2, 0], [-r2, 0], [0, r2], [0, -r2], [r2, r2], [-r2, r2], [r2, -r2], [-r2, -r2]];
    const edgeT = 0.05;
    for (let k = 0; k < N; k++) {
      if (R.pid[k] < 0) continue;
      const i = k % SW, j = (k / SW) | 0, d = R.dep[k];
      let occ = 0, cnt = 0;
      for (let q = 0; q < ring.length; q++) {
        const ii = i + ring[q][0], jj = j + ring[q][1];
        if (ii < 0 || jj < 0 || ii >= SW || jj >= SH) continue;
        const kn = jj * SW + ii;
        cnt++;
        if (R.pid[kn] < 0) continue;
        const rr = q < 4 ? r1 : r2;
        occ += Math.min(1, Math.max(0, R.dep[kn] - d - 0.004) * fx / (rr * 1.5));
      }
      const ao = 1 - 0.6 * (cnt ? occ / cnt : 0);
      let edge = false;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= SW || jj >= SH) continue;
        const kn = jj * SW + ii;
        if (R.pid[kn] >= 0 && R.dep[kn] - d > edgeT) { edge = true; break; }
      }
      const nx = R.nx[k], ny = R.ny[k], nz = R.nz[k];
      const nd = nx * KL[0] + ny * KL[1] + nz * KL[2];
      const dif = Math.max(0, nd), wr = Math.max(0, (nd + 0.4) / 1.4);
      const nv = Math.max(0, (ny + nz) * 0.7071);
      const rim = (1 - nv) * (1 - nv) * 0.18;
      const a = R.r[k] * 0.3 + R.g[k] * 0.59 + R.b[k] * 0.11;
      const af = 0.42 + 0.58 * Math.min(1, Math.sqrt(a / 0.5));
      let lum = (0.1 + 0.9 * (0.7 * dif + 0.3 * wr)) * ao * af + rim * ao + R.em[k] * 0.6 + R.lk[k];
      if (edge) lum *= 0.22;
      R.lum[k] = Math.min(1, Math.max(edge ? 0 : 0.06, lum));
    }
    // 4. клетки: символ по форме, средний цвет, нормаль, место
    s = { w, h, ou: -iu0, ov: -iv0, n, r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), nx: new Float32Array(n), ny: new Float32Array(n), nz: new Float32Array(n),
      y: new Float32Array(n), z: new Float32Array(n), cs: new Uint8Array(n), t: new Uint8Array(n), sp: new Uint8Array(n), em: new Float32Array(n), fl: new Uint16Array(n), a: new Uint8Array(n), part: new Uint8Array(n), code: new Uint16Array(n), cov: new Uint8Array(n) };
    const TK = pt.top * 1.15;
    for (let cj = 0; cj < h; cj++) for (let ci = 0; ci < w; ci++) {
      let c = 0, sr = 0, sg = 0, sb = 0, snx = 0, sny = 0, snz = 0, sy = 0, sz = 0, sem = 0, ssp = 0, sal = 0, fl = 0, bestP = -1, bestN = 0;
      for (let dj = 0; dj < SY; dj++) for (let di = 0; di < SX; di++) {
        const k = (cj * SY + dj) * SW + ci * SX + di, q = R.pid[k], o = dj * SX + di;
        if (q < 0) { tv[o] = 0; continue; }
        tv[o] = Math.pow(R.lum[k], 0.8) * TK;
        c++; sr += R.r[k]; sg += R.g[k]; sb += R.b[k]; snx += R.nx[k]; sny += R.ny[k]; snz += R.nz[k];
        const sv = (iv0 * SY + cj * SY + dj + 0.5) / fy;
        sy += sv + R.tt[k]; sz += R.tt[k]; sem += R.em[k]; ssp += R.sp[k]; sal += R.al[k]; fl |= prims[q].m.fl || 0;
        if (++pcount[q & 1023] > bestN) { bestN = pcount[q & 1023]; bestP = q; }
      }
      // сбросить счётчики частей
      for (let dj = 0; dj < SY; dj++) for (let di = 0; di < SX; di++) { const q = R.pid[(cj * SY + dj) * SW + ci * SX + di]; if (q >= 0) pcount[q & 1023] = 0; }
      const kk = cj * w + ci;
      if (!c) continue;
      const g = matchGlyph(pt, tv);
      const cov = c / D;
      if (pt.chars[g] === ' ' && cov < 0.5) continue;
      s.code[kk] = pt.codes[g]; s.cov[kk] = Math.round(cov * 255);
      s.r[kk] = sr / c; s.g[kk] = sg / c; s.b[kk] = sb / c;
      const nl = Math.hypot(snx, sny, snz) || 1;
      s.nx[kk] = snx / nl; s.ny[kk] = sny / nl; s.nz[kk] = snz / nl;
      s.y[kk] = sy / c; s.z[kk] = Math.max(0, sz / c); s.em[kk] = sem / c; s.sp[kk] = Math.min(255, (ssp / c) * 255) | 0;
      s.fl[kk] = fl; s.cs[kk] = prims[bestP].m.cs; s.t[kk] = 128; s.part[kk] = bestP & 255;
      s.a[kk] = Math.round(Math.min(1, sal / c) * 255) || 1;
    }
    if (mcache.size > 2500) mcache.clear();
    mcache.set(ck, s);
    return s;
  };
  // наложить спрайт в буфер: (u, v) — клетка буфера, куда встаёт начало модели
  HF.blit = function (s, u, v, bx, by, id, flags) {
    const b = B, NU = b.NU, NV = b.NV, code = GA.code;
    for (let j = 0; j < s.h; j++) {
      const vv = v - s.ov + j;
      if (vv < 0 || vv >= NV) continue;
      for (let i = 0; i < s.w; i++) {
        const sk = j * s.w + i;
        const a = s.a[sk];
        if (!a) continue;
        const uu = u - s.ou + i;
        if (uu < 0 || uu >= NU) continue;
        const k = vv * NU + uu;
        if (a < 255) {
          // полупрозрачное (призраки): смешать цвет, символ — свой
          const al = a / 255;
          b.ar[k] = b.ar[k] * (1 - al) + s.r[sk] * al; b.ag[k] = b.ag[k] * (1 - al) + s.g[sk] * al; b.ab[k] = b.ab[k] * (1 - al) + s.b[sk] * al;
          b.er[k] += s.r[sk] * s.em[sk] * al; b.eg[k] += s.g[sk] * s.em[sk] * al; b.eb[k] += s.b[sk] * s.em[sk] * al;
          b.gl[k] = code[s.code[sk]];
          b.fl[k] |= F.GHOST | F.FILL | F.GLYPH;
          continue;
        }
        const pf = b.fl[k];
        if (s.cov[sk] < 250) {
          // фон клетки — то, что под фигурой
          if (pf & F.PART) { /* уже запомнено */ } else if (pf & F.FILL) { b.ur[k] = b.ar[k]; b.ug[k] = b.ag[k]; b.ub[k] = b.ab[k]; } else { b.ur[k] = 0; b.ug[k] = 0; b.ub[k] = 0; }
        }
        b.ar[k] = s.r[sk]; b.ag[k] = s.g[sk]; b.ab[k] = s.b[sk];
        b.nx[k] = s.nx[sk]; b.ny[k] = s.ny[sk]; b.nz[k] = s.nz[sk];
        b.wx[k] = bx + (uu - u) / b.CX; b.wy[k] = by + s.y[sk]; b.wz[k] = s.z[sk];
        b.cs[k] = s.cs[sk]; b.tx[k] = s.t[sk]; b.sp[k] = s.sp[sk];
        const em = s.em[sk];
        b.er[k] = s.r[sk] * em; b.eg[k] = s.g[sk] * em; b.eb[k] = s.b[sk] * em;
        b.fl[k] = flags | s.fl[sk] | F.FILL | F.GLYPH | (s.cov[sk] < 250 ? F.PART : 0) | (pf & F.MEM && !(flags & F.MEM) ? 0 : 0);
        b.gl[k] = code[s.code[sk]];
        b.id[k] = id * 64 + s.part[sk];
        b.ao[k] = 255;
      }
    }
  };
  // ============================================================
  // Кадр
  // ============================================================
  // gw1/gw2 — ширина знака в точках экрана (обычный экран / плотный, как у телефона): мельче нельзя — знак перестанет читаться.
  // Размер клетки на экране — от ширины карты: tiles клеток в ряд (на узком экране меньше, зато подробнее).
  // Сколько знаков ляжет на клетку (CX), получается из этих двух чисел: чем плотнее экран и ближе масштаб, тем подробнее.
  // bgK — фон земли, bgS — фон под фигурами: тёмный, чтобы рисунок держался на самих символах.
  const LV = HF.LEVELS = {
    3: { gw1: 7, gw2: 10, tiles: 15, TW: 56, bgW: 0.3, wfK: 1.15, bgK: 0.12, bgS: 0.05, fgK: 1.12, gfK: 0.8, lift: 0.1, clouds: 0, soft: 0, vign: 0, exp: 1.15 },
    4: { gw1: 6, gw2: 8, tiles: 12, TW: 64, bgW: 0.3, wfK: 1.15, bgK: 0.12, bgS: 0.05, fgK: 1.12, gfK: 0.8, lift: 0.1, clouds: 1, soft: 1, vign: 1, exp: 1.2 },
    5: { gw1: 5, gw2: 7, tiles: 9, TW: 72, bgW: 0.3, wfK: 1.15, bgK: 0.12, bgS: 0.04, fgK: 1.12, gfK: 0.8, lift: 0.1, clouds: 1, soft: 1, vign: 1, exp: 1.22 },
  };
  // масштаб (+/−) приближает камеру: знаки того же размера, но их больше на клетку — подробнее
  HF.tileSize = (level, zoom, dpr, vw) => {
    const L = LV[level] || LV[4];
    dpr = dpr || 1;
    const cw = (dpr >= 2 ? L.gw2 : L.gw1) / dpr, ch = cw * 2;
    const tiles = vw ? L.tiles * (vw < 700 ? 0.6 : 1) : 0;
    const tw = (tiles ? Math.max(40, vw / tiles) : L.TW) * (zoom || 1);
    const CX = Math.max(6, Math.round(tw / cw / 2) * 2), CY = CX / 2;
    return { CX, CY, cw, ch, TW: cw * CX, TH: ch * CY };
  };

  let OUT = null;
  // sc — описание сцены (как у Gfx.drawScene) + hs: { level, time, outdoor, dim, weather, season, cold, fullMoon, nightland, abyss, heights }
  HF.render = function (ctx, sc, hs) {
    const L = LV[hs.level] || LV[4];
    const CX = hs.CX, CY = hs.CY, cw = hs.cw, ch = hs.ch, dpr = hs.dpr || 1;
    const W = sc.W, H = sc.H, NU = W * CX, NV = H * CY;
    HF.setFamily(hs.family || 'monospace');
    glyphAtlas(Math.round(cw * dpr), Math.round(ch * dpr), hs.family || 'monospace');
    HF.pending = false; HF.deadline = performance.now() + (hs.budget || 40);
    const b = buf(NU, NV);
    b.CX = CX; b.CY = CY;
    const now = sc.now, T = now / 1000;
    const sky = HF.sky(hs);
    const P = { season: hs.season, cold: hs.cold, T, level: hs.level, night: sky.day < 0.3 && !hs.dim, px: 1 / (CX * RS.sx), wet: /rain|storm/.test(hs.weather || '') };
    // 1. земля
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, mem = sc.mem[k];
      if (mem === 255 || sc.b[k] || sc.rf[k] >= 0) continue;
      HF.groundTile(sc, i, j, CX, CY, mem ? F.MEM : 0, P);
    }
    // 2. высоты для теней
    const Hm = hs.heights;
    // 3. по рядам: верх стен и крыши, грани, предметы, существа
    const byRow = new Map();
    for (const e of sc.ents) { const r = Math.round(e.y); if (!byRow.has(r)) byRow.set(r, []); byRow.get(r).push(e); }
    for (const l of byRow.values()) l.sort((a, c) => a.y - c.y || a.x - c.x);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const k = j * W + i, mem = sc.mem[k];
        if (mem === 255) continue;
        if (sc.rf[k] >= 0) { HF.roofTile(sc, i, j, CX, CY, mem ? F.MEM : 0, P); continue; }
        if (sc.b[k]) HF.blockTop(sc, i, j, CX, CY, mem ? F.MEM : 0, P);
      }
      if (j > 0) for (let i = 0; i < W; i++) {
        const k = j * W + i, a = k - W;
        const ba = sc.b[a];
        if (!ba || sc.mem[a] === 255) continue;
        const rfa = sc.rf[a], rfk = sc.rf[k];
        if (rfa >= 0 && rfa === rfk) continue;
        if (rfa < 0 && rfk >= 0) continue;
        if (sc.b[k] && rfk < 0 && rfa < 0) continue;
        HF.blockFace(sc, i, j, CX, CY, sc.mem[a] ? F.MEM : 0, P, rfa >= 0);
      }
      for (let i = 0; i < W; i++) {
        const k = j * W + i, mem = sc.mem[k];
        if (mem === 255 || sc.rf[k] >= 0) continue;
        if (sc.bank[k] === 'cliff') HF.cliffFace(i, j, CX, CY, mem ? F.MEM : 0);
        if (sc.o[k]) HF.drawModel(sc.o[k], { c: sc.oc[k], seed: (sc.tx0 + i) * 7 + (sc.ty0 + j) * 13, f: Math.floor(now / 160) + sc.of[k] * 3, T }, i, j, CX, CY, 1 + k, mem ? F.MEM : 0, false, P);
        if (sc.it[k] && !mem) HF.drawModel(sc.it[k], { seed: k, f: Math.floor(now / 300), T }, i, j, CX, CY, 1 + k + W * H, 0, false, P);
      }
      const row = byRow.get(j);
      if (row) for (const e of row) {
        const flags = (e.mode === 2 ? F.REVEAL : 0) | (e.mode === 4 ? F.GHOST : 0);
        HF.drawModel(e.k, { c: e.c, f: e.hf != null ? e.hf : e.f, T, moving: e.moving, mode: e.mode, alpha: e.alpha, boss: e.big, ring: e.ring, hit: e.mode === 3 }, e.x, e.y, CX, CY, 100000 + (e.id || 0), flags, e.flip, P);
        if (e.sleep) HF.drawModel('fx_sleep', { f: Math.floor(now / 500) }, e.x, e.y, CX, CY, 99999, 0, false, P);
      }
      for (const r of sc.roofs) if (r.chim) for (const c of r.chim) if (c.y === j && c.x >= 0 && c.x < W && sc.mem[j * W + c.x] !== 255) HF.drawModel('chimney', { f: Math.floor(now / 140), T, seed: c.x }, c.x, c.y, CX, CY, 7, r.mem ? F.MEM : 0, false, P);
    }
    // 4. свет, тени, перевод в символы
    HF.shade(sc, hs, sky, L, Hm, P);
    // 5. погода и вспышки — тоже символами
    HF.weather(sc, hs, sky, L, P);
    // 6. вывод
    const ga = glyphAtlas(Math.round(cw * dpr), Math.round(ch * dpr), hs.family || 'monospace');
    const vwD = Math.round(sc.vw * dpr), vhD = Math.round(sc.vh * dpr);
    if (!OUT || OUT.width !== vwD || OUT.height !== vhD) { OUT = { img: ctx.createImageData(vwD, vhD), width: vwD, height: vhD }; OUT.u32 = new Uint32Array(OUT.img.data.buffer); }
    const out = OUT.u32;
    out.fill(0xff09050a >>> 0);
    const ox = Math.round((sc.px0 - sc.vx0) * dpr), oy = Math.round((sc.py0 - sc.vy0) * dpr);
    const gw = ga.cw, gh = ga.ch, gsz = gw * gh, alpha = ga.alpha;
    const i0 = Math.max(0, Math.floor(-ox / gw)), i1 = Math.min(NU, Math.ceil((vwD - ox) / gw));
    const j0 = Math.max(0, Math.floor(-oy / gh)), j1 = Math.min(NV, Math.ceil((vhD - oy) / gh));
    for (let j = j0; j < j1; j++) {
      const py0 = oy + j * gh;
      for (let i = i0; i < i1; i++) {
        const k = j * NU + i;
        if (!(b.fl[k] & F.FILL)) continue;
        const px0 = ox + i * gw;
        const fg = b.fg[k], bgc = b.bg[k];
        const fr = fg & 255, fgg = (fg >> 8) & 255, fb = (fg >> 16) & 255;
        const br = bgc & 255, bgg = (bgc >> 8) & 255, bb = (bgc >> 16) & 255;
        const gbase = b.gl[k] * gsz;
        const ya = py0 < 0 ? -py0 : 0, yb = py0 + gh > vhD ? vhD - py0 : gh;
        const xa = px0 < 0 ? -px0 : 0, xb = px0 + gw > vwD ? vwD - px0 : gw;
        for (let y = ya; y < yb; y++) {
          let o = (py0 + y) * vwD + px0 + xa;
          let ai = gbase + y * gw + xa;
          for (let x = xa; x < xb; x++, o++, ai++) {
            const a = alpha[ai];
            if (a === 0) out[o] = bgc;
            else if (a === 255) out[o] = fg;
            else out[o] = 0xff000000 | (((bb + (((fb - bb) * a) >> 8)) & 255) << 16) | (((bgg + (((fgg - bgg) * a) >> 8)) & 255) << 8) | ((br + (((fr - br) * a) >> 8)) & 255);
          }
        }
      }
    }
    ctx.putImageData(OUT.img, Math.round(sc.vx0 * dpr), Math.round(sc.vy0 * dpr));
    // курсор осмотра — скобки поверх
    if (sc.cursor) {
      const x = sc.px0 + sc.cursor[0] * cw * CX, y = sc.py0 + sc.cursor[1] * ch * CY;
      ctx.save(); ctx.beginPath(); ctx.rect(sc.vx0, sc.vy0, sc.vw, sc.vh); ctx.clip();
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#f0c060'; ctx.fillRect(x, y, cw * CX, ch * CY); ctx.globalAlpha = 1;
      ctx.font = '700 ' + Math.round(ch * CY * 0.55) + 'px ' + (hs.family || 'monospace'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe080';
      ctx.fillText('[', x - cw * 0.5, y + ch * CY / 2); ctx.fillText(']', x + cw * CX + cw * 0.5, y + ch * CY / 2);
      ctx.restore();
    }
  };

  // ============================================================
  // Свет: солнце (с тенями), луна, небо, огни, блики, память; затем символ и цвет
  // ============================================================
  const tm = (v) => (v < 0.82 ? v : 0.82 + (v - 0.82) / (1 + (v - 0.82) * 3));
  const pack = (r, g, b) => (0xff000000 | (Math.min(255, Math.max(0, b * 255 | 0)) << 16) | (Math.min(255, Math.max(0, g * 255 | 0)) << 8) | Math.min(255, Math.max(0, r * 255 | 0))) >>> 0;
  let HSHAPE = null;
  function heightAt(Hm, W, H, x, y) {
    const i = Math.floor(x), j = Math.floor(y);
    if (i < 0 || j < 0 || i >= W || j >= H) return 0;
    const k = j * W + i;
    if (HSHAPE && HSHAPE[k]) { const dx = x - i - 0.5, dy = y - j - 0.5; const r = HSHAPE[k] / 100; if (dx * dx + dy * dy > r * r) return 0; }
    return Hm[k];
  }
  HF.shade = function (sc, hs, sky, L, Hm, P) {
    const b = B, NU = b.NU, NV = b.NV, W = sc.W, H = sc.H;
    HSHAPE = hs.hshape || null;
    const S = sky.S, sun = sky.sun, amb = sky.amb, M = sky.M, moon = sky.moon;
    const sunOn = sun[0] + sun[1] + sun[2] > 0.02;
    const shx = S[0], shy = S[1], hl = Math.hypot(shx, shy) || 1, dx = shx / hl, dy = shy / hl, slope = S[2] / hl;
    const maxD = sunOn ? Math.min(3.5, 2.2 / Math.max(0.15, slope)) : 0;
    // у низкого солнца тени длинные, но бледные и размытые
    const shK = smooth(0.08, 0.45, S[2]), soft = L.soft ? 2.5 * (0.45 + 0.55 * shK) : 6;
    const steps = L.soft ? 14 : 9;
    const lights = sc.hlights || [];
    const T = P.T;
    const bgK = L.bgK;
    const CSL_ = CSL;
    const ga = GA;
    const gidx = (c) => { const v = ga ? ga.index.get(c) : 0; return v == null ? 0 : v; };
    const vcx = NU / 2, vcy = NV / 2;
    const cloudK = L.clouds && hs.outdoor && !hs.dim ? 0.35 + sky.over * 0.4 : 0;
    // глаз привыкает к темноте: в сумерки, ночью и под землёй картинка светлеет (но не до дневной)
    const avg3 = (c) => (c ? (c[0] + c[1] + c[2]) / 3 : 0);
    const seen = avg3(amb) + Math.max(0, S[2]) * avg3(sun) * 0.35 + avg3(moon) * 0.6;
    const EXP = L.exp * Math.min(2.5, Math.max(1, Math.pow(0.6 / Math.max(0.05, seen), 0.75)));
    // атлас нужен, чтобы знать номера символов
    if (!GA) glyphAtlas(hs.cw * (hs.dpr || 1), hs.ch * (hs.dpr || 1), hs.family || 'monospace');
    for (let k = 0, n = NU * NV; k < n; k++) {
      const fl = b.fl[k];
      if (!(fl & F.FILL)) continue;
      let r = b.ar[k], g = b.ag[k], bl = b.ab[k];
      let nx = b.nx[k], ny = b.ny[k], nz = b.nz[k];
      const t = b.tx[k] / 255;
      if (fl & F.MEM) {
        // память: серый и тусклый, без света
        const gr = (r * 0.3 + g * 0.59 + bl * 0.11) * 0.42;
        const cr = gr * 0.85 + 0.03, cg = gr * 0.85 + 0.03, cb = gr + 0.06;
        if (!(fl & F.GLYPH)) b.gl[k] = gidx(CSL_[b.cs[k]](t, 0.35));
        b.fg[k] = pack(cr, cg, cb);
        if (fl & F.PART) { const ug = (b.ur[k] * 0.3 + b.ug[k] * 0.59 + b.ub[k] * 0.11) * 0.42; b.bg[k] = pack(ug * 0.3, ug * 0.3, ug * 0.36); }
        else b.bg[k] = (fl & F.GLYPH) && !(fl & (F.GROUND | F.WALL)) ? pack(cr * 0.15, cg * 0.15, cb * 0.18) : pack(cr * 0.35, cg * 0.35, cb * 0.4);
        continue;
      }
      const wx = b.wx[k], wy = b.wy[k], wz = b.wz[k];
      // вода: живая рябь и блики
      let spec = b.sp[k] / 255;
      if (fl & (F.WATER | F.LAVA)) {
        const w1 = Math.sin(wx * 5.1 + T * 1.6 + Math.sin(wy * 2.3)) * 0.22, w2 = Math.sin((wx + wy) * 7.3 - T * 2.1) * 0.14, w3 = Math.sin(wy * 6.1 + T * 1.2) * 0.18;
        nx = w1 + w2 * 0.5; ny = w3 + w2 * 0.5; nz = 1;
        const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      }
      // окружение
      let ao = b.ao[k] / 255;
      if (fl & F.GROUND) {
        let occ = 0;
        const h0 = wz + 0.25;
        occ += Math.max(0, heightAt(Hm, W, H, wx - 0.45, wy) - h0); occ += Math.max(0, heightAt(Hm, W, H, wx + 0.45, wy) - h0);
        occ += Math.max(0, heightAt(Hm, W, H, wx, wy - 0.45) - h0); occ += Math.max(0, heightAt(Hm, W, H, wx, wy + 0.45) - h0);
        ao *= 1 - Math.min(0.45, occ * 0.18);
      }
      let lr = amb[0] * ao * (0.75 + 0.25 * nz), lg = amb[1] * ao * (0.75 + 0.25 * nz), lb = amb[2] * ao * (0.75 + 0.25 * nz);
      // солнце и его тени
      if (sunOn) {
        let d = nx * S[0] + ny * S[1] + nz * S[2];
        if (d > 0) {
          let sh = 1;
          if (!(fl & F.NOSHADOW)) {
            const base = wz + 0.05, own = (fl & F.GLYPH) && !(fl & F.GROUND), oi = Math.floor(wx), oj = Math.floor(wy - 0.05);
            for (let q = 1; q <= steps; q++) {
              const dd = (q / steps) * maxD;
              const sx = wx + dx * dd, sy = wy + dy * dd;
              if (own && Math.floor(sx) === oi && Math.floor(sy) === oj) continue;
              const hh = heightAt(Hm, W, H, sx, sy);
              const ray = base + dd * slope;
              if (hh > ray) { sh = Math.min(sh, 1 - clamp01((hh - ray) * soft) * (0.35 + 0.65 * shK)); if (sh <= 0) break; }
            }
          }
          if (cloudK) { const cl = HF.noise.fbm(wx * 0.09 + T * 0.035, wy * 0.09 + T * 0.012, 99, 3); sh *= 1 - cloudK * smooth(0.45, 0.7, cl); }
          d *= sh;
          lr += sun[0] * d; lg += sun[1] * d; lb += sun[2] * d;
          if (spec > 0 && sh > 0.3) {
            // отражение солнца к зрителю (камера смотрит с юга сверху)
            const rz = 2 * (nx * S[0] + ny * S[1] + nz * S[2]) * nz - S[2], ry = 2 * (nx * S[0] + ny * S[1] + nz * S[2]) * ny - S[1];
            const vd = Math.max(0, ry * 0.7071 + rz * 0.7071);
            spec *= Math.pow(vd, 24) * 3 * sh;
          } else spec = 0;
        } else spec = 0;
      } else spec *= 0.15;
      if (M) { const d = Math.max(0, nx * M[0] + ny * M[1] + nz * M[2]); lr += moon[0] * d; lg += moon[1] * d; lb += moon[2] * d; }
      // огни
      for (let q = 0; q < lights.length; q++) {
        const li = lights[q];
        const ddx = li.x - wx, ddy = li.y - wy, ddz = (li.z || 0.5) - wz;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 > li.r * li.r) continue;
        const dist = Math.sqrt(d2 + ddz * ddz) || 0.001;
        let att = 1 - dist / li.r; if (att <= 0) continue; att *= att;
        const nd = Math.max(0.25, (nx * ddx + ny * ddy + nz * ddz) / dist);
        const fk = li.fl ? 0.85 + 0.15 * Math.sin(T * 9 + li.x * 3 + Math.sin(T * 13)) : 1;
        const kk = att * nd * li.i * fk;
        lr += li.col[0] * kk; lg += li.col[1] * kk; lb += li.col[2] * kk;
      }
      r = r * lr + b.er[k] + spec; g = g * lg + b.eg[k] + spec; bl = bl * lb + b.eb[k] + spec * 0.95;
      if (fl & F.FOAM) { const f = 0.5 + 0.5 * Math.sin(T * 2 + wx * 9 + wy * 5); r += 0.25 * f * (lr + 0.2); g += 0.27 * f * (lg + 0.2); bl += 0.3 * f * (lb + 0.2); }
      if (fl & F.REVEAL) { const gr = (r + g + bl) / 3 + 0.25; r = gr * 0.8; g = gr * 0.4; bl = gr * 0.9; }
      if (L.vign) { const vx = (k % NU - vcx) / vcx, vy = (Math.floor(k / NU) - vcy) / vcy; const v = 1 - 0.22 * (vx * vx + vy * vy) * 0.5; r *= v; g *= v; bl *= v; }
      r = tm(r * EXP); g = tm(g * EXP); bl = tm(bl * EXP);
      const lum = r * 0.3 + g * 0.59 + bl * 0.11;
      // символ: у фигур и построек он уже подобран по форме; у воды, огня и прочего живого — по фактуре и свету
      if (fl & F.GLYPH) {
        if (fl & F.WALL) {
          // стена и крыша: цветная толща, по ней — швы и ряды символами
          b.fg[k] = pack(r * L.wfK + 0.02, g * L.wfK + 0.02, bl * L.wfK + 0.02);
          b.bg[k] = pack(r * L.bgW, g * L.bgW, bl * L.bgW);
        } else if (fl & F.GROUND) {
          b.fg[k] = pack(r * L.gfK + 0.02, g * L.gfK + 0.02, bl * L.gfK + 0.02);
          // фон земли не ярче потёмок: светлое (снег, песок) передают сами символы
          const gl2 = (r * 0.3 + g * 0.59 + bl * 0.11) * bgK, cap = gl2 > 0.075 ? 0.075 / gl2 : 1;
          b.bg[k] = pack(r * bgK * cap, g * bgK * cap, bl * bgK * cap);
        } else {
          // тёмную одежду чуть приподнять, чтобы фигура не пропадала на тёмной земле
          const fk = L.fgK, lift = L.lift * (lr + lg + lb) / 3 * EXP;
          b.fg[k] = pack(r * fk + lift + 0.02, g * fk + lift + 0.02, bl * fk + lift + 0.02);
          if (fl & F.PART) {
            const ex = EXP * bgK;
            b.bg[k] = pack(tm(b.ur[k] * lr * ex), tm(b.ug[k] * lg * ex), tm(b.ub[k] * lb * ex));
          } else b.bg[k] = pack(r * L.bgS, g * L.bgS, bl * L.bgS);
        }
        continue;
      }
      let chr = null;
      if (fl & F.WATER) {
        // гладь воды: редкая рябь бежит по ней, на бликах — искры
        if (spec > 0.5) chr = '*';
        else { const wv = HF.noise.vnoise(wx * 3.2 + T * 0.35, wy * 7 - T * 0.2, 103); chr = wv < 0.58 ? ' ' : wv < 0.68 ? '.' : wv < 0.8 ? '-' : '~'; }
      }
      if (!chr) chr = CSL_[b.cs[k]](t, Math.min(1, lum * 1.35));
      b.gl[k] = gidx(chr);
      const fk = L.fgK;
      b.fg[k] = pack(r * fk + 0.03, g * fk + 0.03, bl * fk + 0.03);
      b.bg[k] = pack(r * bgK, g * bgK, bl * bgK);
    }
  };
  // контур фигуры: символ по тому, с какой стороны «воздух»
  HF.edgeChar = function (k, NU, NV) {
    const b = B, me = (b.id[k] / 64) | 0;
    const other = (kk) => !(b.fl[kk] & F.FILL) || ((b.id[kk] / 64) | 0) !== me;
    const u = k % NU, v = (k / NU) | 0;
    const up = v > 0 && other(k - NU), dn = v < NV - 1 && other(k + NU), lf = u > 0 && other(k - 1), rt = u < NU - 1 && other(k + 1);
    if (up && lf && !rt) return '/';
    if (up && rt && !lf) return '\\';
    if (dn && lf && !rt) return '\\';
    if (dn && rt && !lf) return '/';
    if ((lf || rt) && !up && !dn) return lf && rt ? '|' : lf ? '(' : ')';
    if (dn && !up) return '_';
    if (up && !dn) return '-';
    return null;
  };

  // ============================================================
  // Погода символами: дождь, снег, пепел, буря, туман, молния
  // ============================================================
  HF.weather = function (sc, hs, sky, L, P) {
    const b = B, NU = b.NU, NV = b.NV, T = P.T;
    const w = sc.weather;
    if (!w || w === 'none' || w === 'clear' || w === 'cloudy') { if (sc.storm) flash(); return; }
    const gidx = (c) => { const v = GA.index.get(c); return v == null ? 0 : v; };
    const spec = {
      rain: ['/', [0.45, 0.58, 0.85], 0.06, 1.4, 0.5], storm: ['/', [0.6, 0.7, 0.95], 0.1, 2, 0.9], snow: ['*', [0.92, 0.95, 1], 0.05, 0.3, 0.15],
      blizzard: ['-', [0.95, 0.97, 1], 0.12, 0.6, 2.2], blacksnow: ['*', [0.25, 0.25, 0.3], 0.06, 0.28, 0.1], ashrain: ['.', [0.6, 0.58, 0.56], 0.07, 0.35, 0.15],
      sandstorm: ['~', [0.85, 0.7, 0.42], 0.12, 0.15, 2.5], fog: [null, [0.62, 0.66, 0.7], 0, 0, 0.2],
    }[w];
    if (!spec) return;
    const [chr, col, dens, vy, vx] = spec;
    const gi = chr ? gidx(chr) : 0;
    const fogK = w === 'fog' ? 0.55 : w === 'sandstorm' ? 0.4 : w === 'blizzard' ? 0.35 : 0;
    for (let k = 0, n = NU * NV; k < n; k++) {
      if (!(b.fl[k] & F.FILL) || (b.fl[k] & F.MEM)) continue;
      const u = k % NU, v = (k / NU) | 0;
      if (fogK) {
        const f = fogK * (0.55 + 0.45 * HF.noise.vnoise(u * 0.06 + T * 0.3, v * 0.12, 5));
        b.fg[k] = mixPack(b.fg[k], col, f); b.bg[k] = mixPack(b.bg[k], col, f * 0.6);
      }
      if (!chr) continue;
      const su = Math.floor(u - T * vx * 6 - v * vx * 0.15), sv = Math.floor(v - T * vy * 14);
      if (HF.noise.hash2(su, sv, 1) < dens) { b.gl[k] = gi; b.fg[k] = pack(col[0], col[1], col[2]); }
    }
    if (sc.storm) flash();
    function flash() { for (let k = 0, n = NU * NV; k < n; k++) if (b.fl[k] & F.FILL) { b.fg[k] = mixPack(b.fg[k], [1, 1, 1], 0.5); b.bg[k] = mixPack(b.bg[k], [0.7, 0.75, 0.9], 0.4); } }
  };
  function mixPack(p, c, f) {
    const r = (p & 255) / 255, g = ((p >> 8) & 255) / 255, bl = ((p >> 16) & 255) / 255;
    return pack(r + (c[0] - r) * f, g + (c[1] - g) * f, bl + (c[2] - bl) * f);
  }

  // ============================================================
  // Уровень 2: поверх рисунков — тени от солнца, облака, затенение у стен, тёплый вечерний свет
  // ============================================================
  let OV = null;
  HF.shadeOverlay = function (ctx, sc) {
    const sh = sc.shade, W = sc.W, H = sc.H, Hm = sh.heights;
    HSHAPE = sh.hshape || null;
    const sky = HF.sky(sh);
    if (sky.day < 0.02 && !sh.dim) return;
    const R = 3, w = W * R, h = H * R;
    if (!OV || OV.width !== w || OV.height !== h) { OV = document.createElement('canvas'); OV.width = w; OV.height = h; }
    const ox = OV.getContext('2d');
    const img = ox.createImageData(w, h), d = img.data;
    const S = sky.S, hl = Math.hypot(S[0], S[1]) || 1, dx = S[0] / hl, dy = S[1] / hl, slope = S[2] / hl;
    const maxD = Math.min(6, 2.6 / Math.max(0.12, slope));
    const T = sc.now / 1000;
    const warm = sky.sun[0] > 0 ? [1, Math.min(1, sky.sun[1] / sky.sun[0] + 0.05), Math.min(1, sky.sun[2] / sky.sun[0] + 0.12)] : [1, 1, 1];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const X = (i + 0.5) / R, Y = (j + 0.5) / R;
      const h0 = heightAt(Hm, W, H, X, Y);
      let s = 1;
      for (let q = 1; q <= 10; q++) { const dd = q / 10 * maxD; const hh = heightAt(Hm, W, H, X + dx * dd, Y + dy * dd); const ray = h0 + 0.05 + dd * slope; if (hh > ray) { s = Math.min(s, 1 - clamp01((hh - ray) * 3)); if (s <= 0) break; } }
      let occ = 0; for (const [ax, ay] of [[-0.45, 0], [0.45, 0], [0, -0.45], [0, 0.45]]) occ += Math.max(0, heightAt(Hm, W, H, X + ax, Y + ay) - h0 - 0.25);
      let cl = 1;
      if (sh.outdoor && !sh.dim) cl = 1 - (0.3 + sky.over * 0.35) * smooth(0.45, 0.7, fbm((X + sc.tx0) * 0.09 + T * 0.035, (Y + sc.ty0) * 0.09 + T * 0.012, 99, 3));
      const lit = (0.55 + 0.45 * s * cl) * (1 - Math.min(0.4, occ * 0.18));
      const k = (j * w + i) * 4;
      d[k] = Math.min(255, 255 * lit * warm[0]); d[k + 1] = Math.min(255, 255 * lit * warm[1]); d[k + 2] = Math.min(255, 255 * lit * warm[2]); d[k + 3] = 255;
    }
    ox.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(OV, sc.px0, sc.py0, W * Gfx.S.TW, H * Gfx.S.TH);
    ctx.restore();
  };

  // ============================================================
  // Модель на клетке: из ключа рисунка — объёмная модель (или упрощённая из рисунка)
  // ============================================================
  HF.drawModel = function (key, o, x, y, CX, CY, id, flags, flip, P) {
    const def = HF.models[key] || HF.models[HF.alias[key]];
    if (!def) return;
    const sp = def(o, P);
    if (!sp) return;
    // sp: { key, prims } или массив таких (частицы огня, дым)
    const parts = Array.isArray(sp) ? sp : [sp];
    const u = Math.round((x + 0.5) * CX), v = Math.round((y + 0.82) * CY);
    for (const p of parts) {
      const s = HF.raster(p.key, p.prims, CX, CY, flip && !p.noflip);
      if (!s) continue;
      HF.blit(s, u + Math.round((p.dx || 0) * CX), v + Math.round((p.dy || 0) * CY), x + 0.5, y + 0.5, id, flags | (p.flags || 0));
    }
  };
  HF.alias = {};

  // высота того, что стоит на клетке (для теней), и круглый ли у него след
  HF.OBJH = { tree: 1.9, tree2: 1.9, tree_bare: 1.5, pine: 1.75, pine_snow: 1.75, deadtree: 1.2, bush: 0.45, fern: 0.2, reeds: 0.7, mushroom: 0.2, bigshroom: 0.95, cactus: 0.9, coral: 0.6, sapling: 0.4, boulder: 0.45, crystal: 0.6, statue: 1.4, pillar: 1.4, tent: 0.9, shrine: 1.0, altar: 0.6, inscription: 0.85, grave: 0.5, well: 1.1, campfire: 0.1, hearth: 0.75, chest: 0.35, table: 0.5, counter: 0.55, bed: 0.35, anvil: 0.4, alchtable: 0.7, throne: 1.2, sign: 0.75, lighthouse: 3, gate: 1.3, mine: 0.8 };
  HF.heightsFor = function (sc) {
    const n = sc.W * sc.H, Hm = new Float32Array(n), Hs = new Uint8Array(n);
    for (let k = 0; k < n; k++) {
      if (sc.rf[k] >= 0) Hm[k] = 1.7;
      else if (sc.b[k]) Hm[k] = (HF.blocks[sc.b[k]] && HF.blocks[sc.b[k]].h) || 1;
      else if (sc.o[k]) { Hm[k] = HF.OBJH[sc.o[k]] || 0.4; Hs[k] = /tree|pine|bush|shroom|boulder|well|tent|statue|pillar/.test(sc.o[k]) ? 45 : 30; }
    }
    return { Hm, Hs };
  };
})(window.EOF);
