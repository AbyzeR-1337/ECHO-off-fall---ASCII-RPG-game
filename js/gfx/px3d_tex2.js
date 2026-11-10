'use strict';
// Разные рисунки одной поверхности и мелочи на каждой клетке.
// Имя текстуры «brick:s#s2d3»: рисунок 2 (у каждого дома, подземелья, улицы — свой), мелочь 3 (у каждой клетки — своя).
// Рисунки — не перекраска, а другое устройство: фламандская и английская перевязка, плетёнка,
// тёсаный камень, рваная старая кладка; крестовые раскосы, частые стойки, ёлочка паркета,
// рыбья чешуя черепицы, ромбы сланца, пласты и трещины пещер…
// Мелочи (трещины, мох, подтёки, лишайник, клевер, грибы, лужи, следы, ракушки) рисуются не ближе
// 4 точек к краю — соседние клетки сходятся без шва.
(function (E) {
  const P3 = E.Gfx.P3, T = P3.TEX, X = P3.TEXU;
  if (!T || !X) return;
  const { N, hex, mix, mul, put, get, fill, noisy } = X;
  const NS = P3.TEXN = {};
  // заменить рисунок по номеру; 0 — прежний
  function styles(key, list) {
    const g0 = T[key];
    if (!g0) return;
    T[key] = function (d, name, r, s) { const f = s ? list[(s - 1) % list.length] : null; return f ? f(d, name, r, s) : g0(d, name, r, s); };
    NS[key] = list.length + 1;
  }
  const H = (c) => (typeof c === 'string' ? hex(c) : c);
  const wrap = (v) => ((v % N) + N) % N;
  // ячейки Вороного с повтором по краю: ближайшая и вторая точки
  function vor(pts, x, y, sx, sy) {
    let b1 = 1e9, b2 = 1e9, k = -1;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      for (let oy = -N; oy <= N; oy += N) for (let ox = -N; ox <= N; ox += N) {
        const dd = Math.hypot((x - p[0] - ox) * (sx || 1), (y - p[1] - oy) * (sy || 1));
        if (dd < b1) { b2 = b1; b1 = dd; k = i; } else if (dd < b2) b2 = dd;
      }
    }
    return [b1, b2, k];
  }
  // кирпич/камень: светлая верхняя-левая кромка, тёмная нижняя-правая — объём даже без рельефа
  const bevel = (c, fx, fy, w, h) => mul(c, fx === 0 || fy === 0 ? 1.12 : fx === w - 1 || fy === h - 1 ? 0.82 : 1);

  // ================= КИРПИЧ И КАМЕНЬ ДОМОВ =================
  const bc = (name) => (name.endsWith(':s') ? { b: hex('#77726a'), m: hex('#2e2c2a'), alt: hex('#8a8476') } : { b: hex('#6c4836'), m: hex('#8a8074'), alt: hex('#7e3a2a') });
  styles('brick', [
    // английская перевязка: ряд ложков (длинные), ряд тычков (короткие)
    (d, name, r) => {
      const c = bc(name), ks = []; for (let i = 0; i < 80; i++) ks.push(0.74 + r() * 0.42);
      fill(d, (x, y) => {
        const row = y >> 2, fy = y % 4; if (fy === 3) return c.m;
        const w = row % 2 ? 4 : 8, off = row % 2 ? 2 : 0, fx = (x + off) % w; if (fx === w - 1) return c.m;
        const id = row * 9 + Math.floor((x + off) / w);
        return bevel(mul(id % 7 === 0 ? c.alt : c.b, ks[id % 80] * (0.95 + r() * 0.07)), fx, fy, w - 1, 3);
      });
    },
    // тёсаный камень: крупные блоки со скошенной кромкой
    (d, name, r) => {
      const base = name.endsWith(':s') ? hex('#8a8780') : hex('#a08a64'), m = name.endsWith(':s') ? hex('#3a3834') : hex('#5a4c38'), ks = []; for (let i = 0; i < 16; i++) ks.push(0.8 + r() * 0.3);
      fill(d, (x, y) => {
        const row = y >> 3, fy = y % 8, off = (row % 2) * 8, fx = (x + off) % 16; if (fy === 7 || fx === 15) return m;
        const id = row * 2 + Math.floor((x + off) / 16);
        let c = mul(base, ks[id % 16] * (0.95 + (r() - 0.5) * 0.08));
        if (fy === 0 || fx === 0) c = mul(c, 1.2); else if (fy === 6 || fx === 14) c = mul(c, 0.72); else if (fy === 1 || fx === 1) c = mul(c, 1.07);
        return c;
      });
      for (let i = 0; i < 18; i++) put(d, Math.floor(r() * N), Math.floor(r() * N), mul(base, 0.7));
    },
    // старая рваная кладка: ряды разной высоты, кирпичи разной длины и обжига, выкрошенный раствор
    (d, name, r) => {
      const c = bc(name), rows = []; let y0 = 0;
      while (y0 < N) { const h = Math.min(N - y0, 3 + Math.floor(r() * 3)); rows.push([y0, h]); y0 += h; }
      const joints = rows.map(() => { const j = []; let x = Math.floor(r() * 6); while (x < N + 12) { j.push(x % N); x += 5 + Math.floor(r() * 7); } return j; });
      fill(d, (x, y) => {
        const ri = rows.findIndex((rw) => y >= rw[0] && y < rw[0] + rw[1]), rw = rows[ri], fy = y - rw[0];
        if (fy === rw[1] - 1) return r() < 0.25 ? mul(c.m, 0.6) : c.m;
        const js = joints[ri];
        if (js.includes(x)) return c.m;
        let k = 0; for (const j of js) if (j <= x) k++;
        const shade = [0.62, 0.8, 0.95, 1.08, 1.22][(ri * 7 + k * 3) % 5];
        return mul(((ri + k) % 5 === 0) ? c.alt : c.b, shade * (0.94 + r() * 0.1));
      });
    },
    // плетёнка: квадраты по два лежачих и по два стоячих кирпича
    (d, name, r) => {
      const c = bc(name), ks = []; for (let i = 0; i < 64; i++) ks.push(0.78 + r() * 0.36);
      fill(d, (x, y) => {
        const cx = x >> 3, cy = y >> 3, fx = x % 8, fy = y % 8, hor = (cx + cy) % 2 === 0;
        if (hor ? fy % 4 === 3 || fx === 7 : fx % 4 === 3 || fy === 7) return c.m;
        const id = (cy * 4 + cx) * 2 + (hor ? fy >> 2 : fx >> 2);
        return mul(c.b, ks[id % 64] * (0.95 + r() * 0.07) * (hor ? (fy % 4 === 0 ? 1.1 : 1) : (fx % 4 === 0 ? 1.1 : 1)));
      });
    },
    // бутовый камень, связанный кирпичными поясами
    (d, name, r) => {
      const c = bc(name), pts = []; for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) pts.push([i * 8 + r() * 6, 2 + j * 9 + r() * 5, 0.7 + r() * 0.45]);
      fill(d, (x, y) => {
        if (y >= 26) { const fy = y - 26, off = ((fy >> 1) % 2) * 4; if (fy % 3 === 2 || (x + off) % 8 === 7) return c.m; return mul(c.alt, 0.9 + r() * 0.1); }
        const v = vor(pts, x, y, 0.9, 1); if (v[1] - v[0] < 1.4) return mul(c.m, 0.8);
        return mul(hex('#7a7468'), pts[v[2]][2] * (1 - v[0] / 14 * 0.35));
      });
    },
  ]);
  // ================= ФАХВЕРК =================
  const plaster = (d, r, a, b) => noisy(d, r, H(a), H(b), [[mul(H(a), 0.85), 0.06]], 3, 10);
  const frame = (d, beam) => { for (let x = 0; x < N; x++) { put(d, x, 0, beam); put(d, x, 1, beam); put(d, x, 30, beam); put(d, x, 31, beam); } for (let y = 0; y < N; y++) { put(d, 0, y, beam); put(d, 1, y, beam); put(d, 15, y, beam); put(d, 16, y, beam); } };
  const line = (d, x0, y0, x1, y1, c, w) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) { const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n); for (let a = 0; a < (w || 2); a++) put(d, x + a, y, c); } };
  styles('timber', [
    // крест-накрест в каждой клетке
    (d, name, r) => { plaster(d, r, '#958c78', '#b8ae96'); const b = hex('#2e2016'); frame(d, b); for (const x0 of [2, 17]) { line(d, x0, 2, x0 + 11, 29, b); line(d, x0 + 11, 2, x0, 29, b); } },
    // частые стойки и ригель посередине
    (d, name, r) => { plaster(d, r, '#a89e86', '#c8bea4'); const b = hex('#3a2818'); fill(d, (x, y) => (x % 6 < 2 || y === 15 || y === 16 || y < 2 || y > 29 ? mul(b, 0.9 + r() * 0.15) : get(d, x, y))); },
    // охра и «ёлочка»: раскосы сходятся книзу
    (d, name, r) => { plaster(d, r, '#a8884a', '#c8a462'); const b = hex('#24180e'); frame(d, b); for (const x0 of [2, 17]) { line(d, x0, 2, x0 + 6, 29, b); line(d, x0 + 12, 2, x0 + 6, 29, b); } },
    // розоватая известь и гнутые подкосы в углах
    (d, name, r) => {
      plaster(d, r, '#b8968e', '#d4b4a8'); const b = hex('#3a2416'); frame(d, b);
      for (const x0 of [2, 17]) for (let a = 0; a <= 1.57; a += 0.06) { const rx = Math.round(Math.cos(a) * 9), ry = Math.round(Math.sin(a) * 9); put(d, x0 + 11 - rx, 2 + 9 - ry, b); put(d, x0 + 12 - rx, 2 + 9 - ry, b); put(d, x0 + rx, 29 - 9 + ry, b); put(d, x0 + rx + 1, 29 - 9 + ry, b); }
    },
    // смолёные брусья решёткой: квадратные филёнки
    (d, name, r) => { plaster(d, r, '#c8c2b0', '#e0dccc'); const b = hex('#141010'); fill(d, (x, y) => (x % 8 < 2 || y % 8 < 2 ? mul(b, 1 + r() * 0.3) : get(d, x, y))); },
  ]);
  // ================= БРЁВНА =================
  styles('log', [
    // толстые ошкуренные брёвна с сучками
    (d, name, r) => {
      const ks = []; for (let i = 0; i < 4; i++) ks.push(0.85 + r() * 0.25);
      fill(d, (x, y) => { const row = y >> 3, fy = (y % 8) / 8; if (y % 8 === 7) return hex('#2a1c10'); return mul(hex('#8a6a44'), ks[row] * (0.62 + Math.sin(fy * Math.PI) * 0.5 + Math.sin(x * 0.3 + row) * 0.05 + (r() - 0.5) * 0.06)); });
      for (let i = 0; i < 5; i++) { const x = 3 + Math.floor(r() * 26), y = (Math.floor(r() * 4) << 3) + 3; put(d, x, y, hex('#3a2614')); put(d, x + 1, y, hex('#4a3420')); put(d, x, y + 1, hex('#4a3420')); put(d, x - 1, y, hex('#a07e54')); }
    },
    // серые выветренные брёвна с трещинами
    (d, name, r) => {
      fill(d, (x, y) => { const row = Math.floor(y / 6), fy = (y % 6) / 6; if (y % 6 === 5) return hex('#1a1816'); return mul(hex('#77726a'), 0.66 + Math.sin(fy * Math.PI) * 0.44 + (r() - 0.5) * 0.08 + Math.sin(x * 0.2 + row * 3) * 0.04); });
      for (let i = 0; i < 6; i++) { const y = Math.floor(r() * 5) * 6 + 2, x0 = Math.floor(r() * N), l = 5 + Math.floor(r() * 10); for (let k = 0; k < l; k++) put(d, x0 + k, y + (k % 5 === 4 ? 1 : 0), hex('#2e2c28')); }
    },
    // тёмные брёвна, между ними мох-конопатка
    (d, name, r) => {
      fill(d, (x, y) => { const row = Math.floor(y / 6), fy = y % 6; if (fy === 5) return mix(hex('#4a5a2a'), hex('#6a7a3a'), r()); if (fy === 0 && r() < 0.4) return hex('#56662e'); return mul(hex('#4a3220'), 0.7 + Math.sin(fy / 5 * Math.PI) * 0.45 + (r() - 0.5) * 0.07 + (row % 2) * 0.05); });
    },
  ]);
  // ================= БУТ =================
  styles('fieldstone', [
    // сухая кладка из плит: длинные плоские камни без раствора
    (d, name, r) => {
      const pts = []; for (let j = 0; j < 8; j++) for (let i = 0; i < 2; i++) pts.push([i * 16 + r() * 12, j * 4 + r() * 2, 0.6 + r() * 0.5]);
      fill(d, (x, y) => { const v = vor(pts, x, y, 0.35, 1); if (v[1] - v[0] < 0.9) return hex('#161412'); return mul(mix(hex('#6a645a'), hex('#857a68'), pts[v[2]][2] - 0.6), pts[v[2]][2] * (1 - v[0] / 9 * 0.3)); });
    },
    // речные голыши в светлом растворе
    (d, name, r) => {
      const pts = []; for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) pts.push([i * 6.4 + r() * 3, j * 6.4 + r() * 3, r()]);
      const cols = ['#6e6a64', '#7a6a58', '#5e646a', '#8a8070', '#6a5a4e'].map(hex);
      fill(d, (x, y) => { const v = vor(pts, x, y); if (v[0] > 2.9 || v[1] - v[0] < 1.2) return mul(hex('#aaa292'), 0.9 + r() * 0.12); const p = pts[v[2]]; return mul(cols[Math.floor(p[2] * 5)], 1.15 - v[0] / 3.2 * 0.4); });
    },
    // крупные глыбы на извести, лишайник
    (d, name, r) => {
      const pts = []; for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) pts.push([i * 16 + 3 + r() * 10, j * 10.6 + 2 + r() * 6, 0.7 + r() * 0.4]);
      fill(d, (x, y) => { const v = vor(pts, x, y); if (v[1] - v[0] < 1.6) return mul(hex('#b0aa98'), 0.85 + r() * 0.1); return mul(hex('#6a6660'), pts[v[2]][2] * (1.1 - v[0] / 16 * 0.4) * (0.95 + r() * 0.08)); });
      for (let i = 0; i < 16; i++) put(d, Math.floor(r() * N), Math.floor(r() * N), r() < 0.5 ? hex('#b8b060') : hex('#90a070'));
    },
  ]);
  // ================= МАЗАНКА =================
  styles('daub', [
    // белёная хата: светлая известь, местами отпала
    (d, name, r) => {
      plaster(d, r, '#c8c0aa', '#e4dece');
      for (let i = 0; i < 3; i++) { const cx = 4 + r() * 24, cy = 4 + r() * 24, rr = 1.5 + r() * 2.5; for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (Math.hypot(x, y) < rr) put(d, Math.round(cx + x), Math.round(cy + y), Math.hypot(x, y) > rr - 1 ? hex('#8a7a60') : hex('#6e604a')); }
      const beam = hex('#2e2014'); for (let x = 0; x < N; x++) { put(d, x, 0, beam); put(d, x, 31, beam); }
    },
    // охряная, с тёмными подтёками
    (d, name, r) => {
      plaster(d, r, '#a08040', '#c09c58');
      for (let i = 0; i < 4; i++) { const x0 = Math.floor(r() * N), l = 6 + Math.floor(r() * 14); for (let k = 0; k < l; k++) put(d, x0 + (k % 7 === 6 ? 1 : 0), k, mul(get(d, x0, k), 0.75)); }
      const beam = hex('#2a1c10'); for (let y = 0; y < N; y++) { put(d, 0, y, beam); put(d, 31, y, beam); }
    },
    // плетень наружу: прутья внахлёст, глина клочьями
    (d, name, r) => {
      fill(d, (x, y) => { const row = y >> 2, up = ((x >> 2) + row) % 2 === 0; const k = up ? 1.1 - (y % 4) * 0.12 : 0.7 + (y % 4) * 0.08; return x % 8 === 0 ? hex('#2a1c10') : mul(hex('#6a4e30'), k + (r() - 0.5) * 0.08); });
      for (let i = 0; i < 4; i++) { const cx = r() * N, cy = r() * N, rr = 3 + r() * 4; for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) if (Math.hypot(x, y * 1.2) < rr && r() < 0.92) put(d, Math.round(cx + x), Math.round(cy + y), mul(hex('#8e7e62'), 0.9 + r() * 0.15)); }
    },
  ]);
  // ================= ПОЛЫ =================
  styles('planks', [
    // широкие стоячие доски с гвоздями
    (d, name, r) => {
      const ks = []; for (let i = 0; i < 4; i++) ks.push(0.8 + r() * 0.35); const off = [0, 11, 5, 19];
      fill(d, (x, y) => { const col = x >> 3, fx = x % 8; if (fx === 7) return hex('#20140a'); if ((y + off[col]) % 32 === 0) return hex('#20140a'); return mul(hex('#8a6440'), ks[col] * (0.9 + Math.sin(y * 0.5 + col * 2) * 0.05 + (fx === 0 ? 0.08 : 0) + (r() - 0.5) * 0.07)); });
      for (let c = 0; c < 4; c++) for (const yy of [2, 29]) { const y = (yy + off[c]) % 32; put(d, c * 8 + 2, y, hex('#3a3a40')); put(d, c * 8 + 5, y, hex('#3a3a40')); }
    },
    // ёлочка: в каждой полосе доски наискось, полосы — навстречу
    (d, name, r) => {
      const ks = []; for (let i = 0; i < 40; i++) ks.push(0.8 + r() * 0.35);
      fill(d, (x, y) => { const band = x >> 3, fx = x % 8; if (fx === 7) return hex('#2a1a0c'); const u = band % 2 ? y + fx : y - fx + 8; if (((u % 4) + 4) % 4 === 3) return hex('#3a2412'); const id = band * 10 + Math.floor((((u % 32) + 32) % 32) / 4); return mul(hex('#9a6e40'), ks[id % 40] * (0.95 + (r() - 0.5) * 0.06)); });
    },
    // шашка: квадраты с волокнами то вдоль, то поперёк, светлые и тёмные
    (d, name, r) => {
      fill(d, (x, y) => { const cx = x >> 3, cy = y >> 3, fx = x % 8, fy = y % 8, alt = (cx + cy) % 2; if (fx === 7 || fy === 7) return hex('#24160a'); const g = alt ? fy % 2 : fx % 2; return mul(alt ? hex('#9a7044') : hex('#5e3e22'), (g ? 0.92 : 1.04) + (r() - 0.5) * 0.06); });
    },
    // старые узкие доски, тёмные, со щелями, в середине вытоптаны
    (d, name, r) => {
      const ks = []; for (let i = 0; i < 8; i++) ks.push(0.75 + r() * 0.3);
      fill(d, (x, y) => { const row = y >> 2; if (y % 4 === 3) return hex('#0e0806'); if ((x + row * 9) % 32 === 0) return hex('#140c06'); const worn = Math.max(0, 1 - Math.hypot(x - 16, y - 16) / 14) * 0.2; return mul(hex('#5a3c24'), ks[row] * (0.92 + worn + (r() - 0.5) * 0.08)); });
    },
  ]);
  styles('stonetiles', [
    // плиты вразбежку
    (d, name, r) => {
      const ks = []; for (let i = 0; i < 16; i++) ks.push(0.8 + r() * 0.3); const W = [12, 10, 10];
      fill(d, (x, y) => { const row = y >> 3, fy = y % 8, off = (row * 7) % 32; let xx = (x + off) % 32, k = 0; while (xx >= W[k]) { xx -= W[k]; k++; } if (fy === 7 || xx === W[k] - 1) return hex('#26262a'); return mul(hex('#74706a'), ks[(row * 3 + k) % 16] * (fy === 0 || xx === 0 ? 1.1 : 1) * (0.94 + r() * 0.08)); });
    },
    // шахматный мрамор с прожилками
    (d, name, r) => {
      fill(d, (x, y) => { const alt = ((x >> 3) + (y >> 3)) % 2; if (x % 8 === 7 || y % 8 === 7) return hex('#2a2a2a'); return mul(alt ? hex('#b8b2a4') : hex('#3e3c42'), 0.95 + (r() - 0.5) * 0.06); });
      for (let i = 0; i < 6; i++) { let x = r() * N, y = r() * N; const a = r() * 6; for (let k = 0; k < 9; k++) { const c = get(d, Math.round(x), Math.round(y)); put(d, Math.round(x), Math.round(y), mul(c, c[0] > 120 ? 0.82 : 1.35)); x += Math.cos(a + Math.sin(k) * 0.6); y += Math.sin(a + Math.sin(k) * 0.6); } }
    },
    // обожжённая плитка (терракота) мелкими квадратами
    (d, name, r) => {
      const ks = []; for (let i = 0; i < 16; i++) ks.push(0.8 + r() * 0.35);
      fill(d, (x, y) => { if (x % 8 === 7 || y % 8 === 7) return hex('#3a2e26'); const id = (y >> 3) * 4 + (x >> 3); return bevel(mul(hex('#9a5236'), ks[id] * (0.95 + r() * 0.06)), x % 8, y % 8, 7, 7); });
    },
    // неровные плиты
    (d, name, r) => {
      const pts = []; for (let i = 0; i < 7; i++) pts.push([r() * N, r() * N, 0.75 + r() * 0.35]);
      fill(d, (x, y) => { const v = vor(pts, x, y); if (v[1] - v[0] < 1.3) return hex('#262a26'); return mul(hex('#6e726a'), pts[v[2]][2] * (0.95 + r() * 0.07)); });
    },
  ]);
  styles('cobble', [
    // мелкая брусчатка рядами
    (d, name, r) => {
      const ks = []; for (let i = 0; i < 40; i++) ks.push(0.75 + r() * 0.4);
      fill(d, (x, y) => { const row = y >> 2, fy = y % 4, off = (row % 2) * 4, fx = (x + off) % 8; if (fy === 3 || fx === 7) return hex('#2e2c28'); const id = row * 4 + Math.floor((x + off) / 8) % 4; const corner = (fx === 0 || fx === 6) && (fy === 0 || fy === 2); return corner ? hex('#3a3834') : mul(hex('#7a766e'), ks[id % 40] * (fy === 0 ? 1.12 : 1) * (0.95 + r() * 0.08)); });
    },
    // большие неровные плиты, бурые
    (d, name, r) => {
      const pts = []; for (let i = 0; i < 6; i++) pts.push([r() * N, r() * N, 0.75 + r() * 0.4]);
      fill(d, (x, y) => { const v = vor(pts, x, y); if (v[1] - v[0] < 1.5) return hex('#3a3022'); return mul(hex('#857860'), pts[v[2]][2] * (1.05 - v[0] / 20 * 0.3) * (0.95 + r() * 0.07)); });
    },
    // галька в утоптанной земле
    (d, name, r) => {
      const pts = []; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) pts.push([i * 4 + r() * 2.5, j * 4 + r() * 2.5, r()]);
      const cols = ['#7a766e', '#8a7a62', '#5e5e62', '#9a9488'].map(hex);
      fill(d, (x, y) => { const v = vor(pts, x, y); if (v[0] > 1.7) return mul(hex('#4a3a28'), 0.9 + r() * 0.15); return mul(cols[Math.floor(pts[v[2]][2] * 4)], 1.15 - v[0] * 0.18); });
    },
  ]);
  // ================= КРЫШИ =================
  styles('roof_tiles', [
    // рыбья чешуя
    (d, name, r) => { fill(d, (x, y) => { const row = y >> 3, off = (row % 2) * 4, fx = (x + off) % 8, fy = y % 8; const dd = Math.hypot(fx - 3.5, fy - 1); if (dd > 6.6) return hex('#2a1410'); return mul(hex('#80402c'), 1.12 - dd / 7 * 0.45 + (r() - 0.5) * 0.06); }); },
    // марсельская: плоская с бороздками
    (d, name, r) => { fill(d, (x, y) => { const fx = x % 8, fy = y % 8; if (fy === 7) return hex('#2e1610'); if (fx === 0) return hex('#4a2418'); return mul(hex('#9a5a3a'), (fx === 2 || fx === 5 ? 0.8 : 1) * (1.05 - fy / 8 * 0.2) + (r() - 0.5) * 0.05); }); },
    // старая пёстрая: каждая черепица своего обжига, мох
    (d, name, r) => {
      const cols = ['#74382a', '#8a4a2e', '#5a2e22', '#9a6038', '#6a3a30', '#4a2a22'].map(hex), ks = []; for (let i = 0; i < 32; i++) ks.push(cols[Math.floor(r() * cols.length)]);
      fill(d, (x, y) => { const row = y >> 3, off = (row % 2) * 4, fx = (x + off) % 8, fy = y % 8; const edge = fy === 7 || (fy > 4 && (fx === 0 || fx === 7)); const id = row * 4 + Math.floor((x + off) / 8); return mul(ks[id % 32], edge ? 0.45 : 0.85 + (1 - fy / 8) * 0.3 + (r() - 0.5) * 0.08); });
      for (let i = 0; i < 40; i++) { const x = Math.floor(r() * N), y = Math.floor(r() * N); put(d, x, y, mix(hex('#3a4a26'), hex('#6a7040'), r())); }
    },
  ]);
  styles('roof_thatch', [
    // расчёсанная солома с поперечными вязками
    (d, name, r) => { fill(d, (x, y) => { if (y % 8 === 7) return hex('#3a2e1e'); const s = Math.sin(x * 2.6 + Math.sin(y * 0.4) * 2) * 0.5 + 0.5; return mul(mix(hex('#6a5a3a'), hex('#a89060'), s * 0.6 + r() * 0.4), 1 - (y % 8) / 8 * 0.25); }); },
    // крупные снопы-чешуи
    (d, name, r) => { fill(d, (x, y) => { const row = y >> 3, off = (row % 2) * 4, fx = (x + off) % 8, fy = y % 8; const b = Math.sin(fx / 8 * Math.PI); return mul(mix(hex('#4e4030'), hex('#8e7a52'), b * 0.6 + r() * 0.4), 0.6 + b * 0.35 + (1 - fy / 8) * 0.25); }); },
  ]);
  styles('roof_shingle', [
    // деревянная чешуя
    (d, name, r) => { fill(d, (x, y) => { const row = y >> 2, off = (row % 2) * 2, fx = (x + off) % 4, fy = y % 4; if (fy === 3 && (fx === 0 || fx === 3)) return hex('#120c08'); if (fy === 3) return hex('#1e140c'); return mul(hex('#5a4630'), 0.85 + (1 - fy / 4) * 0.3 + (fx === 0 ? -0.15 : 0) + (r() - 0.5) * 0.1); }); },
    // длинная дранка вразбежку, мох по краю
    (d, name, r) => {
      const js = []; for (let row = 0; row < 8; row++) { const j = []; let x = Math.floor(r() * 5); while (x < N) { j.push(x); x += 4 + Math.floor(r() * 8); } js.push(j); }
      fill(d, (x, y) => { const row = y >> 2; if (y % 4 === 3) return hex('#140e0a'); if (js[row].includes(x)) return hex('#24180e'); return mul(hex('#504030'), 0.8 + (1 - (y % 4) / 4) * 0.3 + (r() - 0.5) * 0.12); });
      for (let i = 0; i < 24; i++) put(d, Math.floor(r() * N), (Math.floor(r() * 8) << 2) + 2, mix(hex('#3e4a2a'), hex('#5a6a34'), r()));
    },
  ]);
  styles('roof_slate', [
    // ромбы
    (d, name, r) => { fill(d, (x, y) => { const u = (x + y) % 8, v = ((x - y) % 8 + 8) % 8; if (u === 0 || v === 0) return hex('#1a2028'); return mul(hex('#56667a'), 0.85 + (u < 4 ? 0.12 : 0) + (r() - 0.5) * 0.1); }); },
    // пёстрый сланец разной ширины
    (d, name, r) => {
      const cols = ['#4e5e70', '#5a6a5e', '#5e5468', '#46505a', '#6a7280'].map(hex), js = []; for (let row = 0; row < 8; row++) { const j = []; let x = Math.floor(r() * 4); while (x < N) { j.push([x, cols[Math.floor(r() * 5)]]); x += 3 + Math.floor(r() * 6); } js.push(j); }
      fill(d, (x, y) => { const row = y >> 2; if (y % 4 === 3) return hex('#161c22'); let c = js[row][0][1], on = false; for (const [jx, jc] of js[row]) { if (jx === x) on = true; if (jx <= x) c = jc; } return on ? hex('#1e242c') : mul(c, 0.9 + (1 - (y % 4) / 4) * 0.2 + (r() - 0.5) * 0.08); });
    },
  ]);
  // ================= ПЕЩЕРЫ =================
  styles('cave', [
    // пласты породы волнами
    (d, name, r) => {
      const cols = ['#4a3e34', '#5e5246', '#3a332e', '#6a5e50', '#52463a'].map(hex), ph = r() * 6;
      fill(d, (x, y) => { const band = Math.floor((y + Math.sin(x / N * Math.PI * 2 + ph) * 2.5 + 64) / 4) % 5; return mul(cols[band], 0.9 + (r() - 0.5) * 0.14); });
      for (let i = 0; i < 20; i++) put(d, Math.floor(r() * N), Math.floor(r() * N), hex('#24201c'));
    },
    // крупные трещины между гранями
    (d, name, r) => {
      const pts = []; for (let i = 0; i < 8; i++) pts.push([r() * N, r() * N, 0.7 + r() * 0.45]);
      fill(d, (x, y) => { const v = vor(pts, x, y); if (v[1] - v[0] < 1.1) return hex('#121010'); return mul(hex('#585048'), pts[v[2]][2] * (1.1 - v[0] / 14 * 0.45) * (0.94 + r() * 0.1)); });
    },
    // сырая: тёмная, с потёками и блеском воды
    (d, name, r) => {
      noisy(d, r, hex('#22201e'), hex('#46423c'), [[hex('#1a1816'), 0.06]], 4, 12);
      for (let i = 0; i < 7; i++) { const x = Math.floor(r() * N), y0 = Math.floor(r() * N), l = 6 + Math.floor(r() * 14); for (let k = 0; k < l; k++) put(d, x, y0 + k, mul(get(d, x, y0 + k), k % 4 === 0 ? 1.6 : 1.25)); }
      for (let i = 0; i < 10; i++) put(d, Math.floor(r() * N), Math.floor(r() * N), hex('#8a9aa0'));
    },
  ]);
  // руда и стена с трещиной — того же рисунка, что пещера вокруг (трещина не должна выдавать себя)
  T.ore = (d, name, r, s) => { T.cave(d, name, r, s); for (let i = 0; i < 12; i++) { const x = Math.floor(r() * N), y = Math.floor(r() * N); put(d, x, y, hex('#e0a060')); put(d, x + 1, y, hex('#c87a4a')); put(d, x, y + 1, hex('#8a5030')); } };
  T.crack = (d, name, r, s) => { T.cave(d, name, r, s); for (let y = 0; y < N; y++) put(d, 16 + Math.round(Math.sin(y * 0.4) * 2), y, mul(get(d, 16, y), 0.5)); };
  NS.ore = NS.cave; NS.crack = NS.cave;

  // ================= ОКНА И ДВЕРИ — в рисунок своей стены =================
  const WBASE = (name) => (name.includes(':t') ? 'timber' : name.includes(':l') ? 'log' : name.includes(':f') ? 'fieldstone' : name.includes(':d') ? 'daub' : name.includes(':s') ? 'brick:s' : 'brick');
  const wallOf = (d, name, r, s) => { const b = WBASE(name); T[b.split(':')[0]](d, b, r, s); };
  T.window = (d, name, r, s) => {
    wallOf(d, name, r, s);
    const fr = hex('#3a2410'), glow = (y, y0, y1) => mix(hex('#d08a30'), hex('#f0c060'), (y - y0) / (y1 - y0) + (r() - 0.5) * 0.2);
    const kind = (s || 0) % 4;
    if (kind === 1) { // арка со свинцовым переплётом ромбами
      for (let y = 5; y < 26; y++) for (let x = 9; x < 23; x++) { const top = y < 12 && Math.hypot(x - 15.5, y - 12) > 6.5; if (top) continue; const edge = x === 9 || x === 22 || y === 25 || (y < 12 && Math.hypot(x - 15.5, y - 12) > 5.6); if (edge) put(d, x, y, fr); else if ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0) put(d, x, y, hex('#3a3a3a')); else put(d, x, y, glow(y, 5, 25), 64); }
    } else if (kind === 2) { // распахнутые ставни
      for (let y = 8; y < 24; y++) for (let x = 11; x < 21; x++) { const edge = x === 11 || x === 20 || y === 8 || y === 23 || x === 15 || x === 16; if (edge) put(d, x, y, fr); else put(d, x, y, glow(y, 8, 23), 64); }
      for (let y = 8; y < 24; y++) for (let x = 0; x < 4; x++) { const c = mul(hex('#3a5a3a'), y % 4 === 0 ? 0.6 : 1 + (r() - 0.5) * 0.1); put(d, 6 + x, y, c); put(d, 22 + x, y, c); }
    } else if (kind === 3) { // круглое окошко
      for (let y = 7; y < 25; y++) for (let x = 7; x < 25; x++) { const dd = Math.hypot(x - 15.5, y - 15.5); if (dd > 8.5) continue; if (dd > 7.2 || Math.abs(x - 15.5) < 1 || Math.abs(y - 15.5) < 1) put(d, x, y, fr); else put(d, x, y, glow(y, 7, 25), 64); }
    } else {
      for (let y = 6; y < 26; y++) for (let x = 8; x < 24; x++) { const edge = x === 8 || x === 23 || y === 6 || y === 25 || x === 15 || x === 16 || y === 15 || y === 16; if (edge) put(d, x, y, fr); else put(d, x, y, glow(y, 6, 25), 64); }
    }
    for (let x = 6; x < 26; x++) put(d, x, 26, hex('#5a4028'));
  };
  T.door = (d, name, r, s) => {
    wallOf(d, name, r, s);
    const kind = (s || 0) % 4, paint = [null, null, hex('#5a2a22'), hex('#2a4a5a')][kind] || null;
    for (let y = 4; y < N; y++) for (let x = 7; x < 25; x++) {
      if (kind === 1 && y < 10 && Math.hypot(x - 15.5, y - 10) > 8.5) continue; // арочный верх
      if (x === 7 || x === 24 || y === 4 || (kind === 1 && y < 10 && Math.hypot(x - 15.5, y - 10) > 7.6)) { put(d, x, y, hex('#2a1a0a')); continue; }
      const plank = (x - 8) % 4 === 3;
      put(d, x, y, plank ? hex('#3a2410') : mul(paint || hex('#7a4e28'), 0.9 + r() * 0.15));
    }
    if (kind === 1) { for (let y = 8; y < N; y += 5) for (let x = 9; x < 24; x += 4) put(d, x, y, hex('#9a9aa0')); }
    else if (kind === 2) { for (let k = 0; k < 15; k++) { put(d, 9 + k, 10 + Math.round(k * 12 / 15), hex('#4a2a10')); put(d, 9 + k, 11 + Math.round(k * 12 / 15), hex('#3a2010')); } for (const yy of [9, 24]) for (let x = 8; x < 24; x++) put(d, x, yy, hex('#3a2010')); }
    else for (const yy of [9, 24]) for (let x = 8; x < 24; x++) put(d, x, yy, hex('#4a4a50'));
    if (kind === 3) { put(d, 15, 14, hex('#c0a040')); put(d, 16, 14, hex('#c0a040')); put(d, 15, 15, hex('#806020')); put(d, 16, 16, hex('#c0a040')); put(d, 15, 16, hex('#c0a040')); }
    put(d, 21, 17, hex('#e0c060')); put(d, 21, 18, hex('#a08030'));
    if (name.includes(':b')) for (let k = 0; k < 20; k++) for (let w = -1; w <= 1; w++) { const t = k / 19; put(d, 7 + Math.round(t * 17), 6 + Math.round(t * 22) + w, hex('#8a6a42')); put(d, 24 - Math.round(t * 17), 6 + Math.round(t * 22) + w, hex('#7a5a36')); }
  };
  NS.window = 4; NS.door = 4;

  // ================= МЕЛОЧИ НА КЛЕТКЕ =================
  const A = 4, B = N - 5; // мелочи — только внутри, шва нет
  const inside = (x, y) => x >= A && y >= A && x <= B && y <= B;
  const P = (d, x, y, c) => { if (inside(x, y)) put(d, x, y, c); };
  const rp = (r) => A + 1 + Math.floor(r() * (B - A - 1));
  const blob = (d, r, cx, cy, rx, ry, f) => { for (let y = -ry - 1; y <= ry + 1; y++) for (let x = -rx - 1; x <= rx + 1; x++) { const k = Math.hypot(x / rx, y / ry) + (r() - 0.5) * 0.3; if (k < 1) { const px = cx + x, py = cy + y; if (inside(px, py)) put(d, px, py, f(get(d, px, py), k)); } } };
  // трещина: ломаная тёмная линия в 2 точки шириной, со светлой кромкой и ответвлениями
  const crack = (d, r, dark) => { let x = rp(r), y = A; const c = H(dark || '#100e0c'); while (y <= B) { P(d, x, y, c); P(d, x + 1, y, mul(c, 1.6)); P(d, x + 2, y, mul(get(d, x + 2, y), 1.25)); if (r() < 0.3 && y < B - 5) { let bx = x, by = y; const dir = r() < 0.5 ? -1 : 1; for (let k = 0; k < 6; k++) { bx += dir; by += r() < 0.6 ? 1 : 0; P(d, bx, by, c); } } x += Math.floor(r() * 3) - 1; y++; if (r() < 0.05) break; } };
  const dots = (d, r, n, cols, sz) => { for (let i = 0; i < n; i++) { const x = rp(r), y = rp(r), c = H(cols[Math.floor(r() * cols.length)]); P(d, x, y, c); if (sz > 1) { P(d, x + 1, y, mul(c, 0.85)); P(d, x, y + 1, mul(c, 0.7)); P(d, x + 1, y + 1, mul(c, 0.6)); } } };
  const stones = (d, r, n, big) => { for (let i = 0; i < n; i++) { const x = rp(r) - 1, y = rp(r) - 1, c = mix(hex('#6a665e'), hex('#b0aa9e'), r()), s = (big ? 2 : 1) + Math.floor(r() * 2); for (let a = 0; a <= s; a++) for (let b = 0; b <= s; b++) if (!((a === 0 || a === s) && (b === 0 || b === s)) || s < 2) P(d, x + a, y + b, mul(c, a + b <= 1 ? 1.25 : a + b >= s * 2 - 1 ? 0.65 : 0.95)); for (let a = 1; a <= s + 1; a++) P(d, x + a, y + s + 1, mul(get(d, x + a, y + s + 1), 0.55)); } };
  const mossy = (d, r, cx, cy, rx, ry) => blob(d, r, cx, cy, rx, ry, (c, k) => (r() < 0.9 ? mix(c, mix(hex('#2e5a1e'), hex('#7a9a3a'), r() * (1 - k)), 0.85 - k * 0.25) : c));
  const puddle = (d, r, cx, cy, rx, ry) => { blob(d, r, cx, cy, rx + 1, ry + 1, (c) => mul(c, 0.6)); blob(d, r, cx, cy, rx, ry, (c, k) => mix(hex('#2e3e4e'), hex('#7a8ea0'), k < 0.45 ? 0.75 : 0.35)); for (let k = -rx + 2; k < rx - 1; k++) P(d, cx + k, cy - ry + 1, hex('#c8d8e4')); P(d, cx + 2, cy, hex('#a8bccc')); };
  const DET = {
    wall: [
      (d, r) => { crack(d, r); crack(d, r); },
      (d, r) => { mossy(d, r, rp(r), Math.min(B - 4, rp(r) + 3), 6 + Math.floor(r() * 3), 4); if (r() < 0.6) mossy(d, r, rp(r), rp(r), 3, 3); },
      (d, r) => { const x0 = rp(r) - 3; for (let y = A; y <= B; y++) for (let x = x0; x < x0 + 4 + (y > 16 ? 2 : 0); x++) P(d, x, y, mul(get(d, x, y), 0.5 + (y - A) / (B - A) * 0.25)); },
      (d, r) => { const cx = rp(r), cy = rp(r); blob(d, r, cx, cy, 5, 3, (c, k) => (k < 0.75 ? mul(hex('#0e0c0a'), 1 + k) : mul(c, 0.6))); for (let k = -4; k <= 2; k++) P(d, cx + k, cy - 4, hex('#b8b0a0')); },
      (d, r) => { for (let i = 0; i < 9; i++) { const x = rp(r), y = rp(r), c = H(['#d8d070', '#a8c088', '#e8e8d0', '#c8a860'][Math.floor(r() * 4)]); P(d, x, y, c); P(d, x + 1, y, c); P(d, x, y + 1, mul(c, 0.8)); if (r() < 0.5) P(d, x + 2, y + 1, c); } },
      (d, r) => blob(d, r, rp(r), rp(r), 9, 7, (c, k) => mul(c, 0.3 + k * 0.6)),
    ],
    wood: [
      (d, r) => { for (let n = 0; n < 2; n++) { const y = rp(r), x0 = A + Math.floor(r() * 4), l = 12 + Math.floor(r() * 10); for (let k = 0; k < l; k++) { const yy = y + (k % 7 === 6 ? 1 : 0); P(d, x0 + k, yy, hex('#0c0804')); P(d, x0 + k, yy + 1, mul(get(d, x0 + k, yy + 1), 0.7)); P(d, x0 + k, yy - 1, mul(get(d, x0 + k, yy - 1), 1.25)); } } },
      (d, r) => { mossy(d, r, rp(r), rp(r), 7, 4); },
      (d, r) => { const x = rp(r) - 2, y = rp(r) - 2; for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) P(d, x + a, y + b, hex(a === 0 || b === 0 ? '#6a6a74' : a === 4 || b === 4 ? '#2a2a30' : '#46464e')); P(d, x + 1, y + 1, hex('#9a9aa4')); P(d, x + 3, y + 3, hex('#9a9aa4')); },
      (d, r) => { const x = rp(r), y = rp(r); for (let a = 0; a < 6.28; a += 0.3) { for (const rr of [2.2, 3.4, 4.6]) { const px = x + Math.round(Math.cos(a) * rr * 1.4), py = y + Math.round(Math.sin(a) * rr); P(d, px, py, mul(get(d, px, py), rr < 3 ? 0.55 : 0.75)); } } blob(d, r, x, y, 2, 1, () => hex('#1a1008')); },
      (d, r) => { for (let i = 0; i < 9; i++) { const x = rp(r), y = rp(r), c = H(['#d8d070', '#a8c088', '#e8e8d0'][Math.floor(r() * 3)]); P(d, x, y, c); P(d, x + 1, y, c); P(d, x, y + 1, mul(c, 0.8)); } },
      (d, r) => { const x0 = rp(r) - 2; for (let y = A; y <= B; y++) for (let x = x0; x < x0 + 4; x++) P(d, x, y, mul(get(d, x, y), 0.45 + (y - A) / (B - A) * 0.3)); },
    ],
    floor: [
      (d, r) => { crack(d, r); if (r() < 0.5) crack(d, r); },
      (d, r) => blob(d, r, rp(r), rp(r), 7 + Math.floor(r() * 3), 5, (c, k) => mul(c, 0.4 + k * 0.5)),
      (d, r) => { for (let y = A; y <= B; y++) for (let x = A; x <= B; x++) { const c = get(d, x, y); if (c[0] + c[1] + c[2] < 170 && r() < 0.75) put(d, x, y, mix(hex('#3a6a24'), hex('#6a8a30'), r())); } },
      (d, r) => { for (let i = 0; i < 16; i++) { const x = rp(r), y = rp(r), dx = r() < 0.5 ? 1 : 0; for (let k = 0; k < 4; k++) P(d, x + k * dx, y + k * (1 - dx), hex(r() < 0.5 ? '#d8b860' : '#a88a40')); } },
      (d, r) => blob(d, r, rp(r), rp(r), 9, 6, (c, k) => mul(c, 1.35 - k * 0.3)),
    ],
    grass: [
      (d, r) => { for (let i = 0; i < 12; i++) { const x = rp(r), y = rp(r), c = mix(get(d, x, y), hex('#4e8a2e'), 0.75); for (const [a, b, k] of [[0, 0, 1], [1, 0, 1.25], [0, 1, 0.85], [1, 1, 1.05], [-1, 0, 0.9], [0, -1, 1.15]]) P(d, x + a, y + b, mul(c, k)); if (r() < 0.35) { P(d, x, y - 2, hex('#f0f0e0')); P(d, x + 1, y - 2, hex('#e0c8e0')); } } },
      (d, r) => stones(d, r, 4 + Math.floor(r() * 3), true),
      (d, r) => blob(d, r, rp(r), rp(r), 7 + Math.floor(r() * 3), 5 + Math.floor(r() * 2), (c, k) => (k > 0.85 && r() < 0.5 ? c : mix(hex('#5a4430'), hex('#7e6448'), r()))),
      (d, r) => { const cols = [['#f0e050', '#b8a020'], ['#f070a8', '#b04070'], ['#f8f8f8', '#c0c0c8'], ['#a888f8', '#7050c0'], ['#f88848', '#c05020'], ['#58a8f0', '#3070c0']], c = cols[Math.floor(r() * cols.length)]; for (let i = 0; i < 14; i++) { const x = rp(r), y = rp(r); P(d, x, y, hex(c[0])); P(d, x + 1, y, hex(c[0])); P(d, x, y + 1, hex(c[1])); P(d, x + 1, y + 1, hex(c[1])); P(d, x, y + 2, hex('#2e5a22')); } },
      (d, r) => { for (let i = 0; i < 3 + Math.floor(r() * 3); i++) { const x = rp(r), y = rp(r), red = r() < 0.5, cap = hex(red ? '#c83028' : '#9a6a3a'); for (let k = -2; k <= 2; k++) P(d, x + k, y, mul(cap, Math.abs(k) === 2 ? 0.75 : 1)); for (let k = -1; k <= 1; k++) P(d, x + k, y - 1, mul(cap, 1.2)); P(d, x, y + 1, hex('#e8e0d0')); P(d, x, y + 2, hex('#c8c0b0')); if (red) { P(d, x - 1, y - 1, hex('#f8f0e8')); P(d, x + 1, y, hex('#f8f0e8')); } } },
      (d, r) => { for (let i = 0; i < 14; i++) { const x = rp(r), y = rp(r), c = H(['#c87a2a', '#d8a030', '#a04a20', '#8a6a3a', '#b05828'][Math.floor(r() * 5)]); P(d, x, y, c); P(d, x + 1, y, c); P(d, x + 1, y + 1, mul(c, 0.75)); P(d, x + 2, y + 1, mul(c, 0.9)); } const x = rp(r) - 4, y = rp(r); for (let k = 0; k < 10; k++) { P(d, x + k, y + (k >> 2), hex('#4a3420')); P(d, x + k, y + (k >> 2) + 1, hex('#2a1c10')); } },
    ],
    dirt: [
      (d, r) => puddle(d, r, rp(r), rp(r), 8, 4),
      (d, r) => { const y = rp(r) - 4, x0 = A + 1; for (let k = 0; k < B - A - 1; k++) for (const yy of [y, y + 7]) { P(d, x0 + k, yy, mul(get(d, x0 + k, yy), 0.5)); P(d, x0 + k, yy + 1, mul(get(d, x0 + k, yy + 1), 0.65)); P(d, x0 + k, yy - 1, mul(get(d, x0 + k, yy - 1), 1.2)); } },
      (d, r) => { let x = A + 2, y = rp(r); for (let i = 0; i < 4; i++) { const yy = y + (i % 2 ? 3 : -3); blob(d, r, x, yy, 2, 3, (c) => mul(c, 0.55)); P(d, x, yy - 3, mul(get(d, x, yy - 3), 0.5)); x += 6; } },
      (d, r) => stones(d, r, 7 + Math.floor(r() * 4), true),
      (d, r) => { for (let i = 0; i < 10; i++) { const x = rp(r), y = rp(r); const l = 4 + Math.floor(r() * 4), c = hex(r() < 0.6 ? '#d8b860' : '#5a4028'); for (let k = 0; k < l; k++) P(d, x + k, y + (k > 2 ? 1 : 0), c); } },
    ],
    rock: [
      (d, r) => { crack(d, r); crack(d, r); crack(d, r); },
      (d, r) => puddle(d, r, rp(r), rp(r), 7, 4),
      (d, r) => { const x = rp(r) - 3, y = rp(r); for (let k = 0; k < 8; k++) { P(d, x + k, y, hex('#e0d8c0')); P(d, x + k, y + 1, hex('#b0a890')); } for (const [a, b] of [[-1, -1], [-1, 2], [8, -1], [8, 2]]) { P(d, x + a, y + b, hex('#e8e0c8')); P(d, x + a, y + (b > 0 ? b - 1 : b + 1), hex('#e8e0c8')); } const sx = rp(r), sy = rp(r); blob(d, r, sx, sy, 3, 3, () => hex('#d8d0c0')); P(d, sx - 1, sy, hex('#1a1610')); P(d, sx + 1, sy, hex('#1a1610')); P(d, sx, sy + 2, hex('#3a3428')); },
      (d, r) => { mossy(d, r, rp(r), rp(r), 7, 5); },
      (d, r) => stones(d, r, 10, true),
    ],
    sand: [
      (d, r) => { for (let i = 0; i < 6; i++) { const x = rp(r), y = rp(r), c = hex(r() < 0.5 ? '#f8f0e8' : '#f0b8b0'); for (let k = -2; k <= 2; k++) P(d, x + k, y, c); for (let k = -1; k <= 1; k++) P(d, x + k, y - 1, mul(c, 1.05)); P(d, x, y + 1, mul(c, 0.65)); P(d, x - 1, y + 1, mul(c, 0.7)); } },
      (d, r) => stones(d, r, 6, true),
      (d, r) => { for (let n = 0; n < 2; n++) { const x = rp(r), y = rp(r) + 2; for (let k = 0; k < 9; k++) { const h = 3 + Math.floor(r() * 5); for (let j = 0; j < h; j++) P(d, x - 4 + k, y - j + (k % 2), mix(hex('#8a8a3a'), hex('#d0c070'), r())); } } },
      (d, r) => { const x = rp(r) - 4, y = rp(r); for (let k = 0; k < 12; k++) { P(d, x + k, y + Math.round(Math.sin(k * 0.6)), hex('#6a5a44')); P(d, x + k, y + 1 + Math.round(Math.sin(k * 0.6)), hex('#4a3e30')); } },
    ],
    snow: [
      (d, r) => { let x = A + 2, y = rp(r); for (let i = 0; i < 4; i++) { blob(d, r, x, y + (i % 2 ? 3 : -3), 2, 3, (c) => mix(c, hex('#6a7a98'), 0.7)); x += 6; } },
      (d, r) => { const cx = rp(r), cy = rp(r); blob(d, r, cx, cy, 8, 5, (c, k) => mix(hex('#90c0e0'), hex('#e8f8ff'), k < 0.35 ? 0.95 : 0.25)); for (let k = -5; k < 3; k++) P(d, cx + k, cy - 3, hex('#ffffff')); },
      (d, r) => { for (let i = 0; i < 4; i++) { const x = rp(r) - 3, y = rp(r); for (let k = 0; k < 7; k++) { P(d, x + k, y + (k === 4 ? -1 : 0), hex('#3a2a1a')); if (k === 3) { P(d, x + k, y - 1, hex('#3a2a1a')); P(d, x + k + 1, y - 2, hex('#3a2a1a')); } } } },
      (d, r) => { let x = A + 1, y = rp(r); for (let i = 0; i < 5; i++) { for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1], [2, -1], [-1, -1], [0, -2], [1, -2]]) P(d, x + a, y + b, mul(get(d, x + a, y + b), 0.62)); x += 5; y += (i % 2 ? 3 : -3); } },
    ],
  };
  const CAT = {
    brick: 'wall', stonewall: 'wall', townwall: 'wall', fieldstone: 'wall', arch: 'wall', cave: 'wall', crack: 'wall', grime: 'wall', icerock: 'wall', basalt: 'wall',
    timber: 'wood', log: 'wood', daub: 'wood', palisade: 'wood',
    planks: 'floor', stonetiles: 'floor', cobble: 'floor', deck: 'floor',
    grass: 'grass', grass_dry: 'grass', grass_frost: 'grass', tallgrass: 'grass', nightgrass: 'grass', flowers: 'grass',
    dirt: 'dirt', soil: 'dirt', swamp: 'dirt', mud: 'dirt', flags: 'floor',
    rockfloor: 'rock', stones: 'rock', rubble: 'rock', ash: 'rock', bones: 'rock',
    sand: 'sand', dune: 'sand', snow: 'snow', blacksnow: 'snow',
  };
  P3.texCat = (key) => CAT[key] || null;
  P3.TEXDN = {}; for (const k in DET) P3.TEXDN[k] = DET[k].length;
  P3.TEXDET = function (d, base, r, det) {
    const cat = CAT[base.split(':')[0]];
    const list = cat && DET[cat];
    if (!list || !det) return;
    list[(det - 1) % list.length](d, r);
  };
  // «вид» для клетки: рисунок места (st) и мелочь по координатам
  P3.vary = function (tex, x, y, st) {
    const key = tex.split(':')[0];
    let s = '';
    const ns = NS[key];
    if (ns && st != null) { const v = (st >>> 0) % ns; if (v) s += 's' + v; }
    const cat = CAT[key];
    if (cat && x != null) { const n = P3.TEXDN[cat], h = (((x * 73856093) ^ (y * 19349663) ^ 0x5bd1e995) >>> 0) % (n * 2 + 3); if (h >= 1 && h <= n) s += 'd' + h; }
    return s ? tex + '#' + s : tex;
  };
})(window.EOF);
