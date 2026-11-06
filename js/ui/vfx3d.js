'use strict';
// Видимая магия в 3D: искры и обломки, следы снарядов, вспышки попаданий, лучи и молнии (ломаные),
// кольца по земле, облака яда и тлена, стены огня, инея, камня и шипов, сферы, что кружат вокруг героя.
// Всё светится само (особый вид вершин, kind 16) и даёт свет вокруг. Строится заново каждый кадр.
(function (E) {
  const UI = E.UI, G = E.G, Gfx = E.Gfx, U = E.U;
  let H = null, last = 0;
  const W = [1, 1, 1];
  UI.vfxMesh = function (nowMs, lights, ox, oz) {
    const P3 = Gfx.P3, RT = E.RT, SC = E.Schools, V3 = UI.V3, P = G.P, m = G.map;
    if (H) { P3.free(H); H = null; }
    if (!RT || !SC || !V3 || !V3.camPos || !m) return null;
    const VFX = RT.vfx || [];
    const now = nowMs / 1000, dt = Math.min(0.05, last ? now - last : 0.016);
    last = now;
    const COL = SC.COL;
    const v = V3.view || { gox: 0, goz: 0 };
    const gy = (x, z) => (UI.Hgt && UI.Hgt.groundAt ? UI.Hgt.groundAt(v.gox + x, v.goz + z) : 0);
    const cam = V3.camPos, yaw = V3.yaw || 0, R = [Math.cos(yaw), 0, Math.sin(yaw)];
    const M = P3.mesh();
    let nq = 0;
    const tint = (c, k) => [Math.min(2, c[0] * k), Math.min(2, c[1] * k), Math.min(2, c[2] * k)];
    // квадрат лицом к камере
    const sprite = (x, y, z, s0, col) => { if (s0 <= 0.004) return; const s = s0 * 1.35; nq++; P3.quad(M, [x - R[0] * s, y - s, z - R[2] * s], [x + R[0] * s, y - s, z + R[2] * s], [x + R[0] * s, y + s, z + R[2] * s], [x - R[0] * s, y + s, z - R[2] * s], [0, 0], [1, 1], 'flame', [0, 1, 0], 1, 16, col); };
    // плоский квадрат на земле
    const flat = (x, y, z, s0, col) => { const s = s0 * 1.35; nq++; P3.quad(M, [x - s, y, z + s], [x + s, y, z + s], [x + s, y, z - s], [x - s, y, z - s], [0, 0], [1, 1], 'flame', [0, 1, 0], 1, 16, col); };
    // отрезок-лента лицом к камере
    const strip = (a, b, w, col) => {
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], mid = [(a[0] + b[0]) / 2 - cam.x, (a[1] + b[1]) / 2 - cam.y, (a[2] + b[2]) / 2 - cam.z];
      let s = [d[1] * mid[2] - d[2] * mid[1], d[2] * mid[0] - d[0] * mid[2], d[0] * mid[1] - d[1] * mid[0]];
      const l = Math.hypot(s[0], s[1], s[2]) || 1; s = [s[0] / l * w, s[1] / l * w, s[2] / l * w];
      nq++; P3.quad(M, [a[0] - s[0], a[1] - s[1], a[2] - s[2]], [a[0] + s[0], a[1] + s[1], a[2] + s[2]], [b[0] + s[0], b[1] + s[1], b[2] + s[2]], [b[0] - s[0], b[1] - s[1], b[2] - s[2]], [2, 0], [2.999, 1], 'flame', [0, 1, 0], 1, 16, col);
    };
    const light = (x, y, z, col, r, i) => { if (lights.length < 40) lights.unshift({ x: ox + x, y, z: oz + z, r, col, i }); };
    // ---------- частицы и прочее ----------
    for (let i = VFX.length - 1; i >= 0; i--) {
      const f = VFX[i], age = now - f.t0, k = age / f.life;
      if (k >= 1 || age < -1) { VFX.splice(i, 1); continue; }
      if (f.k === 'p') {
        f.vy -= (f.grav == null ? 1.5 : f.grav) * dt;
        f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
        const g = gy(f.x, f.z); if (f.y < g + 0.02) { f.y = g + 0.02; f.vy *= -0.3; f.vx *= 0.6; f.vz *= 0.6; }
        sprite(f.x, f.y, f.z, f.size * (1 - k * 0.7), tint(f.col, 1.25 - k * 0.6));
      } else if (f.k === 'beam') {
        const segs = f.jag ? 7 : 1, w = f.w * (1 - k * 0.6), col = tint(f.col, 1.6 - k);
        let prev = f.a;
        for (let s = 1; s <= segs; s++) {
          const t = s / segs, j = f.jag && s < segs ? 0.28 : 0;
          const p = [f.a[0] + (f.b[0] - f.a[0]) * t + (Math.random() - 0.5) * j, f.a[1] + (f.b[1] - f.a[1]) * t + (Math.random() - 0.5) * j, f.a[2] + (f.b[2] - f.a[2]) * t + (Math.random() - 0.5) * j];
          strip(prev, p, w, col); strip(prev, p, w * 0.35, [1.4, 1.4, 1.4]);
          prev = p;
        }
      } else if (f.k === 'ring') {
        const r = f.r * (0.2 + k * 0.9), n = 28, y = gy(f.x, f.z) + 0.06, col = tint(f.col, 1.5 - k);
        for (let s = 0; s < n; s++) { const a = s / n * Math.PI * 2; flat(f.x + Math.cos(a) * r, y + Math.sin(a * 3 + now * 9) * 0.02, f.z + Math.sin(a) * r, 0.09 * (1 - k * 0.5), col); }
      } else if (f.k === 'light') {
        light(f.x, f.y, f.z, f.col, f.r * (1 - k * 0.5), f.i * (1 - k));
      } else if (f.k === 'cloud') {
        if (Math.random() < 0.7) for (let s = 0; s < 3; s++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * f.r; SC.fx.part(f.x + Math.cos(a) * rr, gy(f.x, f.z) + 0.1 + Math.random() * 0.4, f.z + Math.sin(a) * rr, (Math.random() - 0.5) * 0.3, 0.25, (Math.random() - 0.5) * 0.3, 1.2, 0.14, f.col, { grav: -0.05 }); }
        if (Math.random() < 0.2) light(f.x, gy(f.x, f.z) + 0.5, f.z, f.col, f.r + 1, 0.6);
      }
    }
    // ---------- стены и опасные клетки ----------
    for (const h of SC.hazards || []) {
      if (h.key !== m.key) continue;
      const el = h.a.el, col = COL[el] || W, x = h.x + 0.5, z = h.y + 0.5, g = gy(x, z);
      if (el === 'fire') { for (let s = 0; s < 3; s++) sprite(x + Math.sin(now * 7 + h.x * 3 + s) * 0.25, g + 0.15 + ((now * 1.6 + s * 0.33 + h.y * 0.17) % 1) * 0.9, z + Math.cos(now * 5 + h.y * 2 + s) * 0.25, 0.12, tint(col, 1.4)); if ((h.x + h.y) % 2 === 0) light(x, g + 0.6, z, col, 3.5, 1.1); }
      else if (el === 'ice') { for (let s = 0; s < 4; s++) { const a = s * 1.7 + h.x; flat(x + Math.cos(a) * 0.3, g + 0.04, z + Math.sin(a) * 0.3, 0.14, tint(col, 1.1)); } sprite(x, g + 0.25 + Math.sin(now * 3 + h.x) * 0.05, z, 0.06, [1.3, 1.4, 1.5]); }
      else { const spk = el === 'nature' ? [0.3, 0.7, 0.25] : el === 'earth' ? [0.55, 0.45, 0.35] : col; for (let s = 0; s < 3; s++) { const a = s * 2.1 + h.y; const bx = x + Math.cos(a) * 0.25, bz = z + Math.sin(a) * 0.25; strip([bx, g, bz], [bx, g + 0.55, bz], 0.06, spk); } }
    }
    // ---------- сферы вокруг героя ----------
    const o = P && P.orbit;
    if (o && now < o.until) {
      const px = P.posX != null ? P.posX : P.x + 0.5, pz = P.posY != null ? P.posY : P.y + 0.5, py = gy(px, pz) + 0.75;
      for (let s = 0; s < o.n; s++) { const a = now * 2.4 + s / o.n * Math.PI * 2; const x = px + Math.cos(a) * 0.95, z = pz + Math.sin(a) * 0.95; sprite(x, py + Math.sin(now * 3 + s) * 0.08, z, 0.11, tint(COL[o.el] || W, 1.5)); if (Math.random() < 0.3) SC.fx.part(x, py, z, 0, 0, 0, 0.3, 0.05, COL[o.el] || W, { grav: 0 }); }
      light(px, py, pz, COL[o.el] || W, 4, 0.9);
    }
    if (!nq) return null;
    H = P3.upload(M);
    return H;
  };
  // след заклинания в полёте и вспышка, где оно кончилось
  const RT = E.RT;
  if (RT) {
    RT.onSpellEnd = function (s) {
      const SC = E.Schools; if (!SC) return;
      SC.fx.burstFx(s.x, s.y, s.z, s.el || 'arcane', s.big ? 34 : 18, s.big ? 4 : 2.5, s.big ? 0.1 : 0.07);
    };
    RT.spellTrail = function (s) {
      const SC = E.Schools; if (!SC) return;
      const c = SC.COL[s.el] || SC.COL.arcane;
      for (let k = 0; k < (s.big ? 3 : 2); k++) SC.fx.part(s.x + (Math.random() - 0.5) * 0.08, s.y + (Math.random() - 0.5) * 0.08, s.z + (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4 + (s.el === 'fire' ? 0.6 : 0), (Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.2, (s.big ? 0.09 : 0.06) * (0.6 + Math.random() * 0.6), c, { grav: s.el === 'earth' ? 4 : 0 });
    };
  }
})(window.EOF);
