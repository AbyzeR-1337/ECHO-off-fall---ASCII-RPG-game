'use strict';
// Пиксельные спрайты из объёмных моделей (те же модели, что у «почти реальности»).
// Модель снимается ортографической камерой под любым углом: лучи пересекают шары, коробки,
// конусы, цилиндры и диски; поверхность освещается мягким «студийным» светом, цвета сводятся
// к короткой палитре, по силуэту — тёмный контур. Получается пиксель-арт, как у старых RPG.
(function (E) {
  const Gfx = E.Gfx, HF = Gfx.HF;
  const PX = Gfx.PX = {};

  // ---------- пересечение луча o + t·d с телами модели (координаты модели: x — восток, y — юг, z — вверх) ----------
  function hit(p, ox, oy, oz, dx, dy, dz) {
    if (p.t === 'e') {
      const ax = (ox - p.x) / p.rx, ay = (oy - p.y) / p.ry, az = (oz - p.z) / p.rz;
      const bx = dx / p.rx, by = dy / p.ry, bz = dz / p.rz;
      const A = bx * bx + by * by + bz * bz, B = 2 * (ax * bx + ay * by + az * bz), Cc = ax * ax + ay * ay + az * az - 1;
      const D = B * B - 4 * A * Cc;
      if (D < 0) return -1;
      return (-B - Math.sqrt(D)) / (2 * A);
    }
    if (p.t === 'b') {
      let t0 = -1e9, t1 = 1e9;
      for (const [o, d, a, b] of [[ox, dx, p.x0, p.x1], [oy, dy, p.y0, p.y1], [oz, dz, p.z0, p.z1]]) {
        if (Math.abs(d) < 1e-9) { if (o < a || o > b) return -1; continue; }
        let ta = (a - o) / d, tb = (b - o) / d;
        if (ta > tb) { const q = ta; ta = tb; tb = q; }
        if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
        if (t0 > t1) return -1;
      }
      return t0;
    }
    if (p.t === 'y' || p.t === 'c') {
      // вертикальный цилиндр или конус (вершиной вверх)
      const cx = ox - p.x, cy = oy - p.y;
      const z0 = p.z0, z1 = p.t === 'y' ? p.z1 : p.z0 + p.h;
      let best = 1e9;
      if (p.t === 'y') {
        const A = dx * dx + dy * dy, B = 2 * (cx * dx + cy * dy), Cc = cx * cx + cy * cy - p.r * p.r;
        if (A > 1e-12) { const D = B * B - 4 * A * Cc; if (D >= 0) { const t = (-B - Math.sqrt(D)) / (2 * A); const z = oz + t * dz; if (z >= z0 && z <= z1) best = t; } }
        if (Math.abs(dz) > 1e-9) for (const zz of [z1, z0]) { const t = (zz - oz) / dz; const x = cx + t * dx, y = cy + t * dy; if (x * x + y * y <= p.r * p.r && t < best) best = t; }
      } else {
        // r(z) = k·(z1 − z), k = r / h:  x² + y² = k²(z1 − z)²
        const k = p.r / p.h, w0 = z1 - oz;
        const A = dx * dx + dy * dy - k * k * dz * dz, B = 2 * (cx * dx + cy * dy + k * k * w0 * dz), Cc = cx * cx + cy * cy - k * k * w0 * w0;
        if (Math.abs(A) > 1e-12) {
          const D = B * B - 4 * A * Cc;
          if (D >= 0) for (const t of [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)]) { const z = oz + t * dz; if (z >= z0 && z <= z1 && t < best) best = t; }
        }
        if (Math.abs(dz) > 1e-9) { const t = (z0 - oz) / dz; const x = cx + t * dx, y = cy + t * dy; if (x * x + y * y <= p.r * p.r && t < best) best = t; }
      }
      return best < 1e9 ? best : -1;
    }
    if (p.t === 'd') {
      if (Math.abs(dz) < 1e-9) return -1;
      const t = (p.z - oz) / dz;
      const x = (ox + t * dx - p.x) / p.rx, y = (oy + t * dy - p.y) / p.ry;
      return x * x + y * y <= 1 ? t : -1;
    }
    return -1;
  }
  function normal(p, x, y, z, out) {
    if (p.t === 'e') { out[0] = (x - p.x) / (p.rx * p.rx); out[1] = (y - p.y) / (p.ry * p.ry); out[2] = (z - p.z) / (p.rz * p.rz); }
    else if (p.t === 'b') {
      const e = 1e-3;
      out[0] = Math.abs(x - p.x0) < e ? -1 : Math.abs(x - p.x1) < e ? 1 : 0;
      out[1] = Math.abs(y - p.y0) < e ? -1 : Math.abs(y - p.y1) < e ? 1 : 0;
      out[2] = Math.abs(z - p.z0) < e ? -1 : Math.abs(z - p.z1) < e ? 1 : 0;
      if (!out[0] && !out[1] && !out[2]) out[2] = 1;
    } else if (p.t === 'y') { if (Math.abs(z - p.z1) < 1e-3) { out[0] = 0; out[1] = 0; out[2] = 1; } else if (Math.abs(z - p.z0) < 1e-3) { out[0] = 0; out[1] = 0; out[2] = -1; } else { out[0] = x - p.x; out[1] = y - p.y; out[2] = 0; } }
    else if (p.t === 'c') { const rr = Math.hypot(x - p.x, y - p.y) || 1e-3; if (Math.abs(z - p.z0) < 1e-3 && rr < p.r * 0.98) { out[0] = 0; out[1] = 0; out[2] = -1; } else { out[0] = (x - p.x) / rr; out[1] = (y - p.y) / rr; out[2] = p.r / p.h; } }
    else { out[0] = 0; out[1] = 0; out[2] = 1; }
    const l = Math.hypot(out[0], out[1], out[2]) || 1;
    out[0] /= l; out[1] /= l; out[2] /= l;
  }
  function box3(p) {
    if (p.t === 'e') return [p.x - p.rx, p.y - p.ry, p.z - p.rz, p.x + p.rx, p.y + p.ry, p.z + p.rz];
    if (p.t === 'b') return [p.x0, p.y0, p.z0, p.x1, p.y1, p.z1];
    if (p.t === 'c') return [p.x - p.r, p.y - p.r, p.z0, p.x + p.r, p.y + p.r, p.z0 + p.h];
    if (p.t === 'y') return [p.x - p.r, p.y - p.r, p.z0, p.x + p.r, p.y + p.r, p.z1];
    return [p.x - p.rx, p.y - p.ry, p.z - 0.001, p.x + p.rx, p.y + p.ry, p.z + 0.001];
  }

  // ---------- модель → тела ----------
  PX.prims = function (key, o, ppu) {
    const def = HF.models[key] || HF.models[HF.alias[key]];
    if (!def) return null;
    const P = { season: o.season != null ? o.season : 1, cold: !!o.cold, T: 0, level: 5, night: !!o.night, px: 1 / ppu, wet: false };
    const sp = def(o, P);
    if (!sp) return null;
    const parts = Array.isArray(sp) ? sp : [sp];
    const out = [];
    for (const part of parts) {
      const dx = part.dx || 0, dz = -(part.dy || 0);
      for (const p of part.prims) {
        if (!dx && !dz) { out.push(p); continue; }
        const q = Object.assign({}, p);
        if (q.t === 'b') { q.x0 += dx; q.x1 += dx; q.z0 += dz; q.z1 += dz; }
        else if (q.t === 'c' || q.t === 'y') { q.x += dx; q.z0 += dz; if (q.t === 'y') q.z1 += dz; }
        else { q.x += dx; q.z += dz; }
        out.push(q);
      }
    }
    return out;
  };

  // ---------- съёмка ----------
  // o: параметры модели (как у HF.models); opt: { yaw — откуда смотрит камера (0 — с юга, спереди), pitch, ppu — точек на клетку,
  // levels — ступеней палитры, outline, scale — умножить размер }
  const cache = new Map();
  PX.clear = () => cache.clear();
  const mo = { r: 0, g: 0, b: 0, t: 0, cs: 0, sp: 0, em: 0, fl: 0, lk: 0 };
  PX.sprite = function (key, o, opt) {
    opt = opt || {};
    const yaw = opt.yaw || 0, pitch = opt.pitch != null ? opt.pitch : 0.2, ppu = opt.ppu || 48, scale = opt.scale || 1;
    const ck = key + '|' + (o.c || '') + '|' + (o.f || 0) + '|' + (o.moving ? 1 : 0) + '|' + (o.mode || 0) + '|' + (o.hit ? 1 : 0) + '|' + yaw.toFixed(3) + '|' + pitch.toFixed(2) + '|' + ppu + '|' + scale + '|' + (opt.levels || 0) + '|' + (o.seed || 0) + '|' + (o.night ? 1 : 0) + '|' + (o.season != null ? o.season : 1);
    let s = cache.get(ck);
    if (s) return s;
    let prims = PX.prims(key, o, ppu / scale);
    if (!prims || !prims.length) return null;
    if (scale !== 1) prims = prims.map((p) => scaleP(p, scale));
    // камера: вперёд f (из камеры к модели), вправо R, вверх U
    const cp = Math.cos(pitch), spn = Math.sin(pitch);
    const fx = Math.sin(yaw) * cp, fy = -Math.cos(yaw) * cp, fz = -spn;
    const Rx = Math.cos(yaw), Ry = Math.sin(yaw), Rz = 0;
    const Ux = fy * Rz - fz * Ry, Uy = fz * Rx - fx * Rz, Uz = fx * Ry - fy * Rx;
    // проекция рамки модели на экран
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    const bb = prims.map(box3);
    const pb = [];
    for (const b of bb) {
      let a0 = 1e9, a1 = -1e9, c0 = 1e9, c1 = -1e9;
      for (let k = 0; k < 8; k++) {
        const x = k & 1 ? b[3] : b[0], y = k & 2 ? b[4] : b[1], z = k & 4 ? b[5] : b[2];
        const u = x * Rx + y * Ry + z * Rz, v = x * Ux + y * Uy + z * Uz;
        if (u < a0) a0 = u; if (u > a1) a1 = u; if (v < c0) c0 = v; if (v > c1) c1 = v;
      }
      pb.push([a0, a1, c0, c1]);
      u0 = Math.min(u0, a0); u1 = Math.max(u1, a1); v0 = Math.min(v0, c0); v1 = Math.max(v1, c1);
    }
    const pad = 1;
    const W = Math.max(1, Math.ceil((u1 - u0) * ppu) + pad * 2), H = Math.max(1, Math.ceil((v1 - v0) * ppu) + pad * 2);
    const N = W * H;
    const col = new Float32Array(N * 3), al = new Float32Array(N), dep = new Float32Array(N).fill(1e9), emi = new Uint8Array(N);
    // свет: мягкий ключевой слева-сверху-спереди, заполняющий, контровой
    let Lx = -0.45 * Rx + 0.6 * Ux - 0.65 * fx, Ly = -0.45 * Ry + 0.6 * Uy - 0.65 * fy, Lz = -0.45 * Rz + 0.6 * Uz - 0.65 * fz;
    const ll = Math.hypot(Lx, Ly, Lz); Lx /= ll; Ly /= ll; Lz /= ll;
    const nrm = [0, 0, 1];
    const far = 20;
    for (let j = 0; j < H; j++) {
      const v = v1 - (j + 0.5 - pad) / ppu;
      for (let i = 0; i < W; i++) {
        const u = u0 + (i + 0.5 - pad) / ppu;
        const ox = u * Rx + v * Ux - fx * far, oy = u * Ry + v * Uy - fy * far, oz = u * Rz + v * Uz - fz * far;
        let bt = 1e9, bp = -1;
        for (let q = 0; q < prims.length; q++) {
          const b = pb[q];
          if (u < b[0] || u > b[1] || v < b[2] || v > b[3]) continue;
          const t = hit(prims[q], ox, oy, oz, fx, fy, fz);
          if (t > 0 && t < bt) { bt = t; bp = q; }
        }
        if (bp < 0) continue;
        const p = prims[bp], k = j * W + i;
        const x = ox + fx * bt, y = oy + fy * bt, z = oz + fz * bt;
        if (z < -0.05) continue;
        normal(p, x, y, z, nrm);
        const m = p.m;
        mo.r = m.c[0]; mo.g = m.c[1]; mo.b = m.c[2]; mo.t = 0.5; mo.sp = m.sp || 0; mo.em = m.em || 0; mo.fl = m.fl || 0; mo.lk = 0;
        if (m.tex) { m.tex(x, y, z, mo, nrm); const nl = Math.hypot(nrm[0], nrm[1], nrm[2]) || 1; nrm[0] /= nl; nrm[1] /= nl; nrm[2] /= nl; }
        const nd = nrm[0] * Lx + nrm[1] * Ly + nrm[2] * Lz;
        const facing = -(nrm[0] * fx + nrm[1] * fy + nrm[2] * fz);
        const rim = Math.pow(1 - Math.max(0, facing), 3) * 0.25;
        const sky = 0.5 + 0.5 * nrm[2];
        let lum = 0.36 + 0.18 * sky + 0.62 * Math.max(0, nd) + rim + mo.lk * 1.5;
        const spec = mo.sp > 0 ? Math.pow(Math.max(0, nd), 12) * mo.sp * 0.5 : 0;
        lum = Math.max(0.12, lum);
        const em = mo.em || 0;
        col[k * 3] = mo.r * (em > 0.5 ? 1.15 : lum) + spec; col[k * 3 + 1] = mo.g * (em > 0.5 ? 1.15 : lum) + spec; col[k * 3 + 2] = mo.b * (em > 0.5 ? 1.15 : lum) + spec;
        al[k] = m.a != null ? m.a : 1;
        dep[k] = bt;
        if (em > 0.5) emi[k] = 1;
      }
    }
    // складки: там, где соседняя точка заметно ближе, — тень (затенение и внутренний контур)
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i;
      if (!al[k]) continue;
      let occ = 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
        const kn = jj * W + ii;
        if (al[kn] && dep[k] - dep[kn] > 0.06) occ++;
      }
      if (occ) { const f = occ >= 2 ? 0.55 : 0.72; col[k * 3] *= f; col[k * 3 + 1] *= f; col[k * 3 + 2] *= f; }
    }
    // палитра: ступени яркости по каналам — «пиксельный» вид
    const lv = opt.levels || 7;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(W, H), d = img.data;
    const q = (x) => Math.round(Math.min(1, Math.max(0, x)) * (lv - 1)) / (lv - 1) * 255;
    for (let k = 0; k < N; k++) {
      if (!al[k]) continue;
      d[k * 4] = q(col[k * 3]); d[k * 4 + 1] = q(col[k * 3 + 1]); d[k * 4 + 2] = q(col[k * 3 + 2]);
      // альфа: 255 — освещается сценой, 250 — светится сама, меньше — полупрозрачное
      d[k * 4 + 3] = al[k] < 0.95 ? Math.round(al[k] * 200) : emi[k] ? 250 : 255;
    }
    // тёмный контур по силуэту
    if (opt.outline !== false) {
      const src = new Uint8ClampedArray(d);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const k = j * W + i;
        if (src[k * 4 + 3]) continue;
        let n = -1;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < W && jj < H && src[(jj * W + ii) * 4 + 3] >= 250) { n = jj * W + ii; break; } }
        if (n < 0) continue;
        d[k * 4] = src[n * 4] * 0.25; d[k * 4 + 1] = src[n * 4 + 1] * 0.25; d[k * 4 + 2] = src[n * 4 + 2] * 0.3; d[k * 4 + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // точка опоры (центр модели у земли) на картинке
    const ax = Math.round((0 - u0) * ppu + pad), ay = Math.round((v1 - 0) * ppu + pad);
    s = { cv, w: W, h: H, ax, ay, ppu: ppu, key: ck };
    if (cache.size > 1500) cache.clear();
    cache.set(ck, s);
    return s;
  };
  function scaleP(p, k) {
    const q = Object.assign({}, p);
    for (const f of ['x', 'y', 'z', 'rx', 'ry', 'rz', 'r', 'h', 'x0', 'x1', 'y0', 'y1', 'z0', 'z1']) if (q[f] != null) q[f] *= k;
    return q;
  }
  // какая сторона у модели — «перед»: звери смотрят на восток, люди и прочие — на юг (к зрителю)
  const FRONT_X = /^(m_(wolf|fox|beast|deer|boar|bear|mammoth|croc|lizard|dragonling|nightmare|hare|rat|bat|eagle|harpy|fish|snake|leech|spider|crawler|scorpion|crab)|b_(dragon|beast|insect|water))/;
  PX.frontYaw = (key) => (FRONT_X.test(key) ? Math.PI / 2 : 0);
})(window.EOF);
