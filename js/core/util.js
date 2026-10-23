'use strict';
// ECHOES OF THE FALL — базовые утилиты: детерминированный RNG, шум, текст, цвета.
window.EOF = window.EOF || {};
(function (E) {
  const U = E.U = {};

  // Константы мира
  E.C = {
    WS: 25,        // размер мира в регионах (25×25 = 625)
    MW: 72,        // ширина локальной карты региона
    MH: 36,        // высота
    TURN: 2,       // минут игрового времени за ход
    DAY: 1440,
    YEAR_DAYS: 360,
  };

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
  U.dist = (x0, y0, x1, y1) => Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
  U.edist = (x0, y0, x1, y1) => Math.hypot(x0 - x1, y0 - y1);

  // ---------- хэши ----------
  U.hashStr = function (s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  U.mix = function (h) {
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  };
  U.hash = function () {
    let h = 0x811c9dc5;
    for (let i = 0; i < arguments.length; i++) {
      const a = arguments[i];
      if (typeof a === 'number') {
        h = U.mix(h ^ Math.imul((a | 0) + 0x9e3779b9, 0x27d4eb2d));
        if (a !== (a | 0)) h = U.mix(h ^ Math.floor(a * 100000));
      } else h = U.mix(h ^ U.hashStr(String(a)));
    }
    return h >>> 0;
  };
  U.h2 = function (s, x, y) {
    let h = (s ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return h >>> 0;
  };
  U.hf = (...a) => U.hash(...a) / 4294967296; // хэш в [0,1)

  // ---------- RNG (mulberry32) ----------
  class RNG {
    constructor(seed) { this.s = (seed >>> 0) || 1; }
    next() {
      let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
    range(a, b) { return a + this.next() * (b - a); }
    chance(p) { return this.next() < p; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    weighted(list) { // [[val, w], ...]
      let tot = 0;
      for (const e of list) tot += e[1];
      let r = this.next() * tot;
      for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; }
      return list[list.length - 1][0];
    }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
      return arr;
    }
    sample(arr, n) { return this.shuffle(arr.slice()).slice(0, n); }
  }
  E.RNG = RNG;
  U.rng = (...a) => new RNG(U.hash(...a));

  // ---------- шум ----------
  U.noise = function (seed, x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const K = 1 / 4294967296;
    const a = U.h2(seed, xi, yi) * K, b = U.h2(seed, xi + 1, yi) * K;
    const c = U.h2(seed, xi, yi + 1) * K, d = U.h2(seed, xi + 1, yi + 1) * K;
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  U.fbm = function (seed, x, y, oct) {
    oct = oct || 4;
    let s = 0, a = 1, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += a * U.noise(seed + i * 1013, x * f, y * f); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  };

  // ---------- направления ----------
  U.DIR8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  U.DIR4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  U.dirWord = function (dx, dy) {
    if (dx === 0 && dy === 0) return 'здесь';
    const a = Math.atan2(dy, dx) * 180 / Math.PI; // 0 = восток, 90 = юг
    const names = ['на востоке', 'на юго-востоке', 'на юге', 'на юго-западе', 'на западе', 'на северо-западе', 'на севере', 'на северо-востоке'];
    const idx = Math.round(((a + 360) % 360) / 45) % 8;
    return names[idx];
  };

  // ---------- текст ----------
  U.cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  U.plural = function (n, a, b, c) {
    n = Math.abs(n) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return c;
    if (n1 > 1 && n1 < 5) return b;
    if (n1 === 1) return a;
    return c;
  };
  U.gx = (sex, m, f) => (sex === 'f' ? f : m);
  U.died = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'Погиб ' + n + ' человек' : U.plural(n, 'a', 'b', 'c') === 'b' ? 'Погибли ' + n + ' человека' : 'Погибло ' + n + ' человек');
  // род: m f n p
  U.gr = (g, m, f, n, p) => (g === 'f' ? f : g === 'n' ? n : g === 'p' ? p : m);
  U.wrap = function (text, w) {
    const out = [];
    for (const para of String(text).split('\n')) {
      if (!para) { out.push(''); continue; }
      let line = '';
      for (const word of para.split(' ')) {
        if (!line) line = word;
        else if ((line + ' ' + word).length <= w) line += ' ' + word;
        else { out.push(line); line = word; }
        while (line.length > w) { out.push(line.slice(0, w)); line = line.slice(w); }
      }
      out.push(line);
    }
    return out;
  };
  U.pad = (s, n) => { s = String(s); return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length); };
  U.padl = (s, n) => { s = String(s); return s.length >= n ? s.slice(0, n) : ' '.repeat(n - s.length) + s; };

  // Склонение русских имён (упрощённо, для генерируемых имён)
  const VEL = 'гкхжшчщ';
  U.gen = function (name) { // родительный
    if (!name) return name;
    const w = name.split(' ');
    const s = w[0], l = s[s.length - 1], p = s[s.length - 2] || '';
    let r;
    if (l === 'а') r = s.slice(0, -1) + (VEL.includes(p) ? 'и' : 'ы');
    else if (l === 'я') r = s.slice(0, -1) + 'и';
    else if (l === 'й' || l === 'ь') r = s.slice(0, -1) + 'я';
    else if ('оеиуыэю'.includes(l)) r = s;
    else r = s + 'а';
    w[0] = r;
    return w.join(' ');
  };
  U.dat = function (name, sex) { // дательный
    if (!name) return name;
    const w = name.split(' ');
    const s = w[0], l = s[s.length - 1];
    let r;
    if (l === 'а') r = s.slice(0, -1) + 'е';
    else if (l === 'я') r = s.endsWith('ия') ? s.slice(0, -1) + 'и' : s.slice(0, -1) + 'е';
    else if (l === 'й' || l === 'ь') r = sex === 'f' ? s.slice(0, -1) + 'и' : s.slice(0, -1) + 'ю';
    else if ('оеиуыэю'.includes(l)) r = s;
    else r = sex === 'f' ? s : s + 'у';
    w[0] = r;
    return w.join(' ');
  };
  U.acc = function (name, sex) { // винительный (одушевлённый)
    if (!name) return name;
    const w = name.split(' ');
    const s = w[0], l = s[s.length - 1];
    let r;
    if (l === 'а') r = s.slice(0, -1) + 'у';
    else if (l === 'я') r = s.slice(0, -1) + 'ю';
    else if (sex === 'f') r = s;
    else r = U.gen(s);
    w[0] = r;
    return w.join(' ');
  };
  U.ins = function (name, sex) { // творительный
    if (!name) return name;
    const w = name.split(' ');
    const s = w[0], l = s[s.length - 1], p = s[s.length - 2] || '';
    let r;
    if (l === 'а') r = s.slice(0, -1) + ('жшчщц'.includes(p) ? 'ей' : 'ой');
    else if (l === 'я') r = s.slice(0, -1) + 'ей';
    else if (l === 'й') r = s.slice(0, -1) + 'ем';
    else if (l === 'ь') r = sex === 'f' ? s + 'ю' : s.slice(0, -1) + 'ем';
    else if ('оеиуыэю'.includes(l)) r = s;
    else r = sex === 'f' ? s : s + ('жшчщц'.includes(l) ? 'ем' : 'ом');
    w[0] = r;
    return w.join(' ');
  };
  // Прилагательное по роду из мужской формы
  U.adj = function (m, g) {
    if (!g || g === 'm') return m;
    const end = m.slice(-2), st = m.slice(0, -2), last = st[st.length - 1] || '';
    let f, n, p;
    if (end === 'ый') { f = 'ая'; n = 'ое'; p = 'ые'; }
    else if (end === 'ой') { f = 'ая'; n = 'ое'; p = VEL.slice(0, 5).includes(last) ? 'ие' : 'ые'; }
    else if (end === 'ий') {
      if ('гкх'.includes(last)) { f = 'ая'; n = 'ое'; p = 'ие'; }
      else if ('жшчщ'.includes(last)) { f = 'ая'; n = 'ее'; p = 'ие'; }
      else { f = 'яя'; n = 'ее'; p = 'ие'; }
    } else return m;
    return st + (g === 'f' ? f : g === 'n' ? n : p);
  };

  // ---------- цвета ----------
  const cache = new Map();
  function parse(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function toHex(r, g, b) { return '#' + ((1 << 24) | (U.clamp(Math.round(r), 0, 255) << 16) | (U.clamp(Math.round(g), 0, 255) << 8) | U.clamp(Math.round(b), 0, 255)).toString(16).slice(1); }
  U.shade = function (hex, f) {
    if (!hex) return hex;
    const k = hex + '*' + f;
    let r = cache.get(k);
    if (r) return r;
    const c = parse(hex);
    r = toHex(c[0] * f, c[1] * f, c[2] * f);
    cache.set(k, r);
    return r;
  };
  U.mixc = function (a, b, t) {
    if (!a) return a;
    const k = a + b + t;
    let r = cache.get(k);
    if (r) return r;
    const x = parse(a), y = parse(b);
    r = toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
    cache.set(k, r);
    return r;
  };
  U.gray = function (hex, t) {
    const c = parse(hex);
    const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
    return U.mixc(hex, toHex(l, l, l), t);
  };

  // ---------- геометрия ----------
  U.line = function (x0, y0, x1, y1) {
    const pts = [];
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 400; i++) {
      pts.push([x0, y0]);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return pts;
  };

  // ---------- биты <-> строка ----------
  U.bitsToStr = function (arr) {
    let s = '';
    for (let i = 0; i < arr.length; i += 6) {
      let v = 0;
      for (let j = 0; j < 6; j++) if (arr[i + j]) v |= 1 << j;
      s += String.fromCharCode(48 + v);
    }
    return s;
  };
  U.strToBits = function (s, n) {
    const arr = new Uint8Array(n);
    for (let i = 0; i < s.length; i++) {
      const v = s.charCodeAt(i) - 48;
      for (let j = 0; j < 6; j++) if (v & (1 << j)) { const k = i * 6 + j; if (k < n) arr[k] = 1; }
    }
    return arr;
  };

  U.uid = (function () { let n = 0; return () => (Date.now() % 1e9).toString(36) + (n++).toString(36); })();
  U.roman = function (n) {
    const m = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let r = '';
    for (const [v, s] of m) while (n >= v) { r += s; n -= v; }
    return r;
  };
})(window.EOF);
