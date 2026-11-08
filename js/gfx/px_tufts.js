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
    { lo: '#26401c', mid: '#4a6a2c', hi: '#7a9244' }, // весна
    { lo: '#20361a', mid: '#3e5a26', hi: '#687e3a' }, // лето
    { lo: '#4a3e1e', mid: '#7a6230', hi: '#a48444' }, // осень
    { lo: '#404a4a', mid: '#7a8484', hi: '#b4bcbc' }, // зима
  ];
  const FLOWER = ['#c8a838', '#d8d0c4', '#a84868', '#6e4a98', '#4a6aa8', '#9a2a24', '#b87a2a'];
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
    // ---- полевые и лесные: у каждого края свои ----
    daisy: (w, h, r, pal) => (put) => { // ромашка
      DRAW.grass(w, h, r, pal)(put);
      const n = 1 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const x = 2 + Math.floor(r() * (w - 4)), top = 2 + Math.floor(r() * (h * 0.35));
        for (let y = top + 1; y < h; y++) put(x, y, pal[1]);
        const wt = [240, 236, 226];
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [0, 1]]) put(x + dx, top + dy, wt);
        put(x, top, [236, 196, 60]);
      }
    },
    clover: (w, h, r, pal) => (put) => {
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) { const x = 1 + Math.floor(r() * (w - 3)), y = h - 1 - Math.floor(r() * 2); for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0]]) put(x + dx, y + dy, mix(pal[1], pal[2], r() * 0.6)); put(x, y, pal[0]); }
      if (r() < 0.6) { const x = 2 + Math.floor(r() * (w - 4)), c = r() < 0.5 ? [226, 150, 180] : [236, 232, 226]; put(x, h - 4, c); put(x + 1, h - 4, c); put(x, h - 5, c); put(x, h - 3, pal[1]); put(x, h - 2, pal[1]); }
    },
    dandelion: (w, h, r, pal) => (put) => {
      DRAW.grass(w, h - 2, r, pal)((x, y, c) => put(x, y + 2, c));
      const n = 1 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        const x = 2 + Math.floor(r() * (w - 4)), top = 2 + Math.floor(r() * 3), puff = r() < 0.4;
        for (let y = top + 1; y < h; y++) put(x, y, pal[1]);
        const c = puff ? [236, 236, 232] : [240, 200, 40];
        for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) put(x + dx, top + dy, c);
        if (puff) for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(x + dx, top + dy, [210, 210, 206]);
      }
    },
    thistle: (w, h, r, pal) => (put) => {
      const x = Math.floor(w / 2);
      for (let y = 4; y < h; y++) { put(x, y, pal[0]); if (y % 3 === 0) { put(x - 1, y, pal[1]); put(x + 1, y - 1, pal[1]); put(x - 2, y - 1, pal[2]); put(x + 2, y - 2, pal[2]); } }
      for (let dx = -1; dx <= 1; dx++) put(x + dx, 4, mix(pal[1], [80, 100, 60], 0.5));
      for (let dx = -1; dx <= 1; dx++) for (let dy = 1; dy <= 3; dy++) put(x + dx, dy, dy === 1 ? [200, 120, 220] : [160, 70, 170]);
    },
    berry: (w, h, r, pal) => (put) => { // брусника, черника — низкий кустик в ягодах
      const c = r() < 0.5 ? [200, 40, 50] : [70, 80, 170];
      for (let y = 0; y < h; y++) { const half = Math.round((w / 2 - 1) * Math.sqrt(1 - ((h - 1 - y) / h) ** 2)); for (let x = -half; x <= half; x++) if (r() < 0.8) put(w / 2 + x, y, mix(pal[0], pal[2], (h - y) / h * 0.5 + r() * 0.3)); }
      const n = 4 + Math.floor(r() * 5);
      for (let i = 0; i < n; i++) { const x = 2 + Math.floor(r() * (w - 4)), y = 2 + Math.floor(r() * (h - 3)); put(x, y, c); if (r() < 0.4) put(x + 1, y, mix(c, [255, 255, 255], 0.3)); }
    },
    nettle: (w, h, r, pal) => (put) => {
      for (let i = 0; i < 2; i++) {
        const x = 3 + i * (w - 6) + Math.floor(r() * 2), top = 1 + Math.floor(r() * 4);
        for (let y = top; y < h; y++) put(x, y, pal[0]);
        for (let y = top + 1; y < h - 1; y += 3) { const lc = mix(pal[0], pal[1], 0.6); put(x - 1, y, lc); put(x - 2, y + 1, lc); put(x + 1, y + 1, lc); put(x + 2, y + 2, lc); put(x - 2, y, pal[1]); put(x + 2, y + 1, pal[1]); }
      }
    },
    lavender: (w, h, r, pal) => (put) => {
      const n = 4 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const x = 1 + r() * (w - 2), hh = Math.floor(h * 0.6 + r() * h * 0.4), bend = (r() - 0.5) * 2;
        for (let k = 0; k < hh; k++) { const t = k / hh, px = x + bend * t; put(px, h - 1 - k, k > hh - 5 ? (k % 2 ? [150, 110, 200] : [120, 84, 176]) : mix(pal[0], [120, 140, 110], t)); }
      }
    },
    cattail: (w, h, r, pal) => (put) => {
      for (let i = 0; i < 3; i++) {
        const x = 2 + r() * (w - 4), hh = Math.floor(h * 0.7 + r() * h * 0.3);
        for (let k = 0; k < hh; k++) put(x, h - 1 - k, mix(pal[0], pal[1], k / hh));
        if (r() < 0.8) for (let k = 4; k < 9; k++) { put(x, h - hh + k, [110, 70, 40]); put(x + 1, h - hh + k, [86, 54, 30]); }
        put(x - 1, h - 4, pal[1]); put(x - 2, h - 6, pal[2]);
      }
    },
    heather: (w, h, r, pal) => (put) => {
      const n = 10 + Math.floor(r() * 8);
      for (let i = 0; i < n; i++) { const x = 1 + Math.floor(r() * (w - 2)), y = 1 + Math.floor(r() * (h - 1)); put(x, y, r() < 0.45 ? (r() < 0.5 ? [196, 110, 170] : [150, 80, 150]) : mix(pal[0], pal[1], r())); put(x, y + 1, pal[0]); }
    },
    bluebell: (w, h, r, pal) => (put) => {
      DRAW.grass(w, h, r, pal)(put);
      const x = 2 + Math.floor(r() * (w - 5));
      for (let k = 0; k < h - 2; k++) put(x + (k < 3 ? k * 0.6 : 2), h - 1 - k, pal[1]);
      for (const [dx, dy] of [[3, 3], [2, 5], [4, 6]]) { put(x + dx, dy, [100, 110, 210]); put(x + dx, dy + 1, [70, 80, 180]); put(x + dx - 1, dy + 1, [90, 100, 200]); }
    },
  };
  // какие пучки к какому краю и почве: [вид, сколько на клетку]
  TF.EXTRA = {
    plains: { grass: [['daisy', 0.3], ['clover', 0.5], ['dandelion', 0.25], ['thistle', 0.05]], tallgrass: [['thistle', 0.2], ['daisy', 0.3]], flowers: [['daisy', 1], ['bluebell', 0.4], ['dandelion', 0.4]], hill: [['clover', 0.4], ['heather', 0.15]] },
    forest: { grass: [['berry', 0.25], ['nettle', 0.15], ['bluebell', 0.15]], roots: [['berry', 0.4], ['nettle', 0.2]], tallgrass: [['nettle', 0.3]], flowers: [['bluebell', 0.8]] },
    ancient: { roots: [['berry', 0.3], ['bluebell', 0.2]], grass: [['berry', 0.2]] },
    swamp: { swamp: [['cattail', 0.9]], grass: [['cattail', 0.2], ['berry', 0.15]], tallgrass: [['cattail', 0.3]] },
    tundra: { grass: [['heather', 0.5], ['berry', 0.2]], grass_frost: [['heather', 0.4]], hill: [['heather', 0.5]] },
    mountain: { grass: [['heather', 0.25], ['thistle', 0.1]], hill: [['heather', 0.4], ['thistle', 0.1]] },
    coast: { grass: [['lavender', 0.25], ['daisy', 0.2], ['clover', 0.2]], flowers: [['lavender', 0.8]] },
  };
  // во сколько крупнее обычного пучка: кусты и высокие стебли видно над травой
  TF.SCALE = { berry: 2.1, nettle: 2.3, thistle: 2.4, cattail: 2.2, lavender: 2, daisy: 1.7, dandelion: 1.6, bluebell: 1.8, heather: 2, clover: 1.4 };
  // что увядает зимой
  TF.SOFT = new Set(['flower', 'fern', 'tall', 'daisy', 'clover', 'dandelion', 'berry', 'nettle', 'lavender', 'bluebell', 'thistle']);
  const SIZE = { daisy: [12, 12], clover: [12, 7], dandelion: [10, 12], thistle: [9, 16], berry: [16, 9], nettle: [12, 16], lavender: [12, 15], cattail: [10, 24], heather: [14, 8], bluebell: [10, 12], grass: [14, 10], tall: [18, 18], flower: [12, 13], fern: [20, 12], wheat: [12, 22], pebble: [9, 5], dry: [14, 9], reed: [9, 22], mush: [8, 7] };
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
