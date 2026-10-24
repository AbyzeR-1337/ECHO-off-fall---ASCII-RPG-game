'use strict';
// Мелочь у ног: пучки травы, цветы, папоротник, колосья, камешки, тростник, сухие кустики.
// Каждая — крошечный пиксельный рисунок (без обводки, чтобы не рябило), цвета — по времени года.
(function (E) {
  const Gfx = E.Gfx;
  const TF = Gfx.Tufts = {};
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function rng(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
  const SEASON = [
    { lo: '#2e5a1e', mid: '#5a8c2e', hi: '#9ac850' }, // весна
    { lo: '#24481a', mid: '#4a7a28', hi: '#82b040' }, // лето
    { lo: '#5a4a1e', mid: '#9a7a30', hi: '#d0a84a' }, // осень
    { lo: '#4a5a5a', mid: '#8a9a9a', hi: '#d0dcdc' }, // зима
  ];
  const FLOWER = ['#f0d040', '#f4f0e8', '#e870a0', '#a070e0', '#5a90f0', '#e04a3a', '#f0a030'];
  function canvas(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d'), img = c.createImageData(w, h), d = img.data;
    const put = (x, y, col) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h) return; const k = (y * w + x) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255; };
    draw(put);
    c.putImageData(img, 0, 0);
    return cv;
  }
  // травинка: изогнутая линия снизу вверх, к кончику светлее
  function blade(put, x, h, bend, pal, r) {
    let px = x;
    for (let k = 0; k < h; k++) { const t = k / h; px += bend * t * 0.5; put(px, -k, mix(pal[0], pal[2], t * (0.6 + r() * 0.4))); }
  }
  const DRAW = {
    grass: (w, h, r, pal) => (put) => { const n = 6 + Math.floor(r() * 4); for (let i = 0; i < n; i++) blade((x, y, c) => put(x, h - 1 + y, c), 2 + r() * (w - 4), 3 + Math.floor(r() * (h - 3)), (r() - 0.5) * 2.2, pal, r); },
    tall: (w, h, r, pal) => (put) => { const n = 9 + Math.floor(r() * 5); for (let i = 0; i < n; i++) blade((x, y, c) => put(x, h - 1 + y, c), 2 + r() * (w - 4), Math.floor(h * 0.5 + r() * h * 0.5), (r() - 0.5) * 3, pal, r); },
    flower: (w, h, r, pal, col) => (put) => {
      DRAW.grass(w, h, r, pal)(put);
      const n = 1 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const x = 2 + Math.floor(r() * (w - 4)), top = 2 + Math.floor(r() * (h * 0.4));
        for (let y = top + 2; y < h; y++) put(x, y, pal[1]);
        const c = hex(col), dk = mix(c, [0, 0, 0], 0.3);
        put(x, top, c); put(x - 1, top + 1, c); put(x + 1, top + 1, c); put(x, top + 2, dk); put(x, top + 1, [250, 230, 120]);
      }
    },
    fern: (w, h, r, pal) => (put) => {
      for (const s of [-1, 1, -0.5, 0.6]) {
        let x = w / 2, y = h - 1;
        for (let k = 0; k < w * 0.55; k++) { x += s * 0.9; y -= (1 - k / (w * 0.55)) * 1.1 - 0.2; put(x, y, mix(pal[0], pal[2], k / (w * 0.6))); if (k % 2) { put(x, y + 1, pal[0]); put(x, y - 1, pal[1]); } }
      }
    },
    wheat: (w, h, r) => (put) => { const n = 5 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const x = 1 + r() * (w - 2), hh = Math.floor(h * 0.7 + r() * h * 0.3); for (let k = 0; k < hh; k++) put(x + (k > hh - 5 ? 0.5 : 0), h - 1 - k, k > hh - 5 ? hex('#e8c060') : mix(hex('#8a7a30'), hex('#c8a848'), k / hh)); } },
    pebble: (w, h, r) => (put) => { const n = 2 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const x = 1 + Math.floor(r() * (w - 3)), s = 1 + Math.floor(r() * 2), g = 110 + Math.floor(r() * 60); for (let a = 0; a <= s; a++) for (let b = 0; b <= s - (a === 0 || a === s ? 1 : 0); b++) put(x + a, h - 1 - b, [g + (b ? 20 : 0), g - 4 + (b ? 18 : 0), g - 10 + (b ? 14 : 0)]); } },
    dry: (w, h, r) => (put) => { const pal = [hex('#5a4220'), hex('#8a6a34'), hex('#c0a060')]; const n = 5 + Math.floor(r() * 4); for (let i = 0; i < n; i++) blade((x, y, c) => put(x, h - 1 + y, c), 2 + r() * (w - 4), 2 + Math.floor(r() * (h - 2)), (r() - 0.5) * 4, pal, r); },
    reed: (w, h, r, pal) => (put) => { for (let i = 0; i < 4; i++) { const x = 1 + r() * (w - 2), hh = Math.floor(h * 0.6 + r() * h * 0.4); for (let k = 0; k < hh; k++) put(x, h - 1 - k, mix(pal[0], pal[1], k / hh)); if (r() < 0.7) for (let k = 0; k < 4; k++) put(x, h - hh + k, hex('#6a4024')); } },
    mush: (w, h, r) => (put) => { const c = r() < 0.5 ? hex('#c84a30') : hex('#c8a070'); for (let y = h - 3; y < h; y++) put(w / 2, y, hex('#e8dcc0')); for (let x = -2; x <= 2; x++) put(w / 2 + x, h - 4, c); for (let x = -1; x <= 1; x++) put(w / 2 + x, h - 5, c); put(w / 2 - 1, h - 4, [250, 240, 230]); },
  };
  const SIZE = { grass: [14, 10], tall: [18, 18], flower: [12, 13], fern: [20, 12], wheat: [12, 22], pebble: [9, 5], dry: [14, 9], reed: [9, 22], mush: [8, 7] };
  const cache = new Map();
  // прямоугольник в атласе спрайтов для пучка: kind, вариант 0…3, время года, цвет цветка
  TF.rect = function (kind, v, season, col) {
    const P3 = Gfx.P3;
    const key = 'tuft|' + kind + '|' + v + '|' + season + '|' + (col || '');
    let r = cache.get(key);
    if (r && r.gen === P3.sprGen) return r;
    const [w, h] = SIZE[kind];
    const pal = Object.values(SEASON[season] || SEASON[1]).map(hex);
    const rr = rng(key);
    const cv = canvas(w, h, DRAW[kind](w, h, rr, pal, col || FLOWER[v % FLOWER.length]));
    r = P3.sprite({ key, cv, w, h, ax: w / 2, ay: h, ppu: 44 });
    cache.set(key, r);
    return r;
  };
  TF.FLOWER = FLOWER;
})(window.EOF);
