'use strict';
// Входы вниз и наверх — настоящие постройки, а не значки на земле.
// Шахта — бревенчатый проём в скале: стойки, перекладина, распорки, рельсы, фонарь.
// Склеп и гробница — каменный домик с фронтоном, арка, железная решётка, два факела.
// Курган — травяной холм с камнями у входа. Пещера — каменный зев (во льду, в лаве, в корнях).
// Руины — обломок арки. В подземелье: лестница вниз — колодец со ступенями,
// наверх — ступени к светлому проёму. Разрыв — кольцо светящихся камней.
// Вход смотрит туда, откуда к нему удобно подойти.
(function (E) {
  const UI = E.UI, T = E.T, TL = E.TL, G = E.G, Gfx = E.Gfx;
  const PR = UI.V3props = {};
  // клетка с лестницей вниз — землю на ней не рисуем: там колодец со ступенями
  PR.skipGround = (m, i) => m.tiles[i] === T.DOWN;
  // куда смотрит вход: на самую открытую сторону
  function facing(m, x, y) {
    let best = [0, 1], bs = -1e9;
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      let sc = 0;
      for (let k = 1; k <= 3; k++) {
        const a = x + dx * k, b = y + dy * k;
        if (a < 0 || b < 0 || a >= m.w || b >= m.h) { sc -= 1; continue; }
        const t = TL[m.tiles[b * m.w + a]];
        sc += (t.walk ? 2 : -3) / k;
        if (m.tiles[b * m.w + a] === T.ROAD || m.tiles[b * m.w + a] === T.COBBLE) sc += 1.5 / k;
      }
      // спиной — к скале или стене
      const bx = x - dx, by = y - dy;
      if (bx >= 0 && by >= 0 && bx < m.w && by < m.h && !TL[m.tiles[by * m.w + bx]].walk) sc += 2;
      if (sc > bs) { bs = sc; best = [dx, dy]; }
    }
    return best;
  }
  // локальные оси входа: lx — вправо (если смотреть на вход снаружи), ly — вверх, lz — наружу
  function frame(x, y, h, dir) {
    const fx = dir[0], fz = dir[1], rx = -fz, rz = fx;
    const P = (lx, ly, lz) => [x + 0.5 + rx * lx + fx * lz, h + ly, y + 0.5 + rz * lx + fz * lz];
    const N = (nx, ny, nz) => [rx * nx + fx * nz, ny, rz * nx + fz * nz];
    return { P, N };
  }
  // брусок в осях входа
  function box(M, F, x0, y0, z0, x1, y1, z1, tex, sky, kind, top) {
    const P3 = Gfx.P3, P = F.P, N = F.N;
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    P3.quad(M, P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), [0, h], [w, 0], tex, N(0, 0, 1), sky, kind);
    P3.quad(M, P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), [0, h], [w, 0], tex, N(0, 0, -1), sky, kind);
    P3.quad(M, P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), [0, h], [d, 0], tex, N(-1, 0, 0), sky, kind);
    P3.quad(M, P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), [0, h], [d, 0], tex, N(1, 0, 0), sky, kind);
    P3.quad(M, P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0), [0, 0], [w, d], top || tex, N(0, 1, 0), sky, kind);
  }
  // наклонная плита-скат (для холма вокруг входа)
  function slab(M, F, a, b, c, d, tex, n, sky) { Gfx.P3.quad(M, F.P(...a), F.P(...b), F.P(...c), F.P(...d), [0, 1], [1, 0], tex, F.N(...n), sky); }
  // каменный холм вокруг проёма (шахта, пещера): проём шириной w, высотой hh
  function mound(M, F, w, hh, tex, sky) {
    const W = 1.5, H = hh + 0.9, B = -1.3;
    // левый и правый склоны, верх над проёмом, задняя спина
    slab(M, F, [-W, 0, 0.35], [-w / 2, 0, 0.05], [-w / 2, H, -0.2], [-W * 0.8, H * 0.55, 0.0], tex, [-0.3, 0.4, 0.85], sky);
    slab(M, F, [w / 2, 0, 0.05], [W, 0, 0.35], [W * 0.8, H * 0.55, 0.0], [w / 2, H, -0.2], tex, [0.3, 0.4, 0.85], sky);
    slab(M, F, [-w / 2, hh, 0.05], [w / 2, hh, 0.05], [w / 2, H, -0.2], [-w / 2, H, -0.2], tex, [0, 0.5, 0.85], sky);
    slab(M, F, [-W * 0.8, H * 0.55, 0.0], [-w / 2, H, -0.2], [-w / 2, H * 0.9, B], [-W, 0, B], tex, [-0.6, 0.8, 0], sky);
    slab(M, F, [w / 2, H, -0.2], [W * 0.8, H * 0.55, 0.0], [W, 0, B], [w / 2, H * 0.9, B], tex, [0.6, 0.8, 0], sky);
    slab(M, F, [-w / 2, H, -0.2], [w / 2, H, -0.2], [w / 2, H * 0.9, B], [-w / 2, H * 0.9, B], tex, [0, 0.9, -0.3], sky);
  }
  // каменный (или травяной) холм: неровный купол, спереди — проём с перемычкой, внутри — тёмный ход
  function hill(M, F, o) {
    const P3 = Gfx.P3, NR = 7, NS = 18, rx = o.rx || 1.35, rz = o.rz || 1.25, H = o.h || 1.9, cz = -0.45;
    const ow = o.ow || 0.5, oh = o.oh || 1.3, sky = o.sky, tex = o.tex, seed = o.seed || 1;
    const jag = (i, j) => (i === 0 ? 0 : (((Math.sin(i * 12.9898 + j * 78.233 + seed) * 43758.5453) % 1) + 1) % 1 - 0.5);
    const V = [];
    for (let i = 0; i <= NR; i++) for (let j = 0; j <= NS; j++) {
      const e = i / NR * Math.PI / 2, th = j / NS * Math.PI * 2;
      const k = 1 + jag(i, j % NS) * (o.smooth ? 0.08 : 0.22), r = Math.cos(e) * k;
      V.push([Math.sin(th) * rx * r, Math.sin(e) * H * (1 + jag(i + 3, j % NS) * (o.smooth ? 0.04 : 0.12)), cz + Math.cos(th) * rz * r]);
    }
    const at = (i, j) => V[i * (NS + 1) + j];
    for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) {
      const a = at(i, j), b = at(i, j + 1), c = at(i + 1, j + 1), d = at(i + 1, j);
      const mx = (a[0] + b[0] + c[0] + d[0]) / 4, my = (a[1] + b[1] + c[1] + d[1]) / 4, mz = (a[2] + b[2] + c[2] + d[2]) / 4;
      // проём: спереди, ниже перемычки
      if (mz > cz && Math.abs(mx) < ow + 0.2 && my < oh + 0.15) continue;
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
      if ((nx * (mx) + ny * my + nz * (mz - cz)) < 0) { nx = -nx; ny = -ny; nz = -nz; }
      P3.quad(M, F.P(...a), F.P(...b), F.P(...c), F.P(...d), [j / 3, 1], [(j + 1) / 3, 0], tex, F.N(nx / l, ny / l, nz / l), sky);
    }
    // проём: косяки и перемычка из камня, внутри — стены хода и тьма
    const jt = o.jamb || 'stonewall';
    if (o.rough) {
      // края входа — неровные глыбы, сверху — нависающие камни
      const rnd = (k) => (((Math.sin(k * 91.7 + seed * 3.1) * 43758.5453) % 1) + 1) % 1;
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
        const y0 = k * oh / 3 - 0.1, y1 = (k + 1) * oh / 3 + 0.05, w0 = 0.16 + rnd(k + sd * 7) * 0.14, z0 = -0.1 - rnd(k + 3 + sd) * 0.2, z1 = 0.38 + rnd(k + 5 + sd) * 0.18;
        const xa = sd < 0 ? -ow - w0 : ow, xb = sd < 0 ? -ow : ow + w0;
        box(M, F, xa + sd * rnd(k + 9) * 0.05, y0, z0, xb + sd * rnd(k + 9) * 0.05, y1, z1, jt, sky);
      }
      for (let k = 0; k < 3; k++) { const xa = -ow - 0.25 + k * (ow * 2 + 0.5) / 3, xb = xa + (ow * 2 + 0.5) / 3 + 0.06; box(M, F, xa, oh - 0.04 + rnd(k + 20) * 0.08, -0.2, xb, oh + 0.22 + rnd(k + 22) * 0.18, 0.42 + rnd(k + 24) * 0.2, jt, sky); }
    } else {
      box(M, F, -ow - 0.32, -0.15, -0.2, -ow, oh + 0.1, 0.5, jt, sky);
      box(M, F, ow, -0.15, -0.2, ow + 0.32, oh + 0.1, 0.5, jt, sky);
      box(M, F, -ow - 0.38, oh, -0.25, ow + 0.38, oh + 0.34, 0.52, jt, sky);
    }
    const P = F.P, N = F.N;
    P3.quad(M, P(-ow, -0.6, 0.5), P(-ow, -0.6, -1.4), P(-ow, oh, -1.4), P(-ow, oh, 0.5), [0, 1], [1.5, 0], 'cave', N(1, 0, 0), sky * 0.25);
    P3.quad(M, P(ow, -0.6, -1.4), P(ow, -0.6, 0.5), P(ow, oh, 0.5), P(ow, oh, -1.4), [0, 1], [1.5, 0], 'cave', N(-1, 0, 0), sky * 0.25);
    P3.quad(M, P(-ow, oh, 0.5), P(-ow, oh, -1.4), P(ow, oh, -1.4), P(ow, oh, 0.5), [0, 0], [1, 1.5], 'cave', N(0, -1, 0), sky * 0.1);
    P3.quad(M, P(ow, -0.6, -1.35), P(-ow, -0.6, -1.35), P(-ow, oh, -1.35), P(ow, oh, -1.35), [0, 1], [1, 0], 'tunnel', N(0, 0, 1), 0.01);
    // ступени вниз во тьму
    for (let k = 0; k < 6; k++) { const z1 = 0.42 - k * 0.3, z0 = z1 - 0.3, y = -0.1 - k * 0.12; box(M, F, -ow, y - 0.12, z0, ow, y, z1, 'steps', sky * Math.max(0.03, 0.55 - k * 0.1)); }
  }
  // тёмный ход вглубь
  function tunnel(M, F, w, hh, sky, wall) {
    const P3 = Gfx.P3;
    box(M, F, -w / 2 - 0.05, 0, -0.95, -w / 2, hh, 0.02, wall || 'cave', sky * 0.4);
    box(M, F, w / 2, 0, -0.95, w / 2 + 0.05, hh, 0.02, wall || 'cave', sky * 0.4);
    P3.quad(M, F.P(-w / 2, hh, 0.02), F.P(w / 2, hh, 0.02), F.P(w / 2, hh, -0.95), F.P(-w / 2, hh, -0.95), [0, 0], [1, 1], wall || 'cave', F.N(0, -1, 0), 0.05);
    P3.quad(M, F.P(w / 2, 0, -0.9), F.P(-w / 2, 0, -0.9), F.P(-w / 2, hh, -0.9), F.P(w / 2, hh, -0.9), [0, 1], [1, 0], 'tunnel', F.N(0, 0, 1), 0.02);
  }
  function stairsDown(M, F, sky, wall) {
    const P3 = Gfx.P3;
    // колодец: стены вниз по краю клетки, ступени к дальней стене, тьма внизу
    const D = 1.6;
    for (const [a, b, n] of [[[-0.5, 0.5], [0.5, 0.5], [0, 0, -1]], [[0.5, -0.5], [-0.5, -0.5], [0, 0, 1]], [[-0.5, -0.5], [-0.5, 0.5], [1, 0, 0]], [[0.5, 0.5], [0.5, -0.5], [-1, 0, 0]]]) {
      P3.quad(M, F.P(a[0], -D, a[1]), F.P(b[0], -D, b[1]), F.P(b[0], 0.02, b[1]), F.P(a[0], 0.02, a[1]), [0, D], [1, 0], wall || 'stonewall', F.N(...n), sky * 0.5);
    }
    for (let k = 0; k < 6; k++) {
      const z1 = 0.5 - k * 0.17, z0 = z1 - 0.17, y = -0.22 - k * 0.24;
      box(M, F, -0.48, y - 0.24, z0, 0.48, y, z1, 'steps', sky * Math.max(0.05, 0.7 - k * 0.12));
    }
    P3.quad(M, F.P(-0.5, -D, 0.5), F.P(0.5, -D, 0.5), F.P(0.5, -D, -0.5), F.P(-0.5, -D, -0.5), [0, 0], [1, 1], 'tunnel', F.N(0, 1, 0), 0.02);
    // каменный бортик
    for (const [x0, z0, x1, z1] of [[-0.6, 0.5, 0.6, 0.6], [-0.6, -0.6, 0.6, -0.5], [-0.6, -0.5, -0.5, 0.5], [0.5, -0.5, 0.6, 0.5]]) box(M, F, x0, -0.05, z0, x1, 0.12, z1, 'arch', sky);
  }

  PR.facing = facing; PR.frame = frame; PR.box = box; PR.slab = slab;
  PR.build = function (M, cd, ctx) {
    const m = cd.m, W = m.w, H = m.h;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, t = m.tiles[i];
      if (t !== T.DOWN && t !== T.UP && t !== T.MINE && t !== T.PORTAL) continue;
      if (ctx.dungeon && !m.ex[i] && !(G.map === m && G.vis[i])) continue;
      const f = m.feat[i];
      const hb = cd.h[i];
      const sky = ctx.dungeon ? 0 : TL[t].indoor ? 0.3 : 1;
      const dir = facing(m, x, y);
      const F = frame(x, y, hb, dir);
      const L = (lx, ly, lz, col, r, inten, fl) => { const p = F.P(lx, ly, lz); ctx.lights.push({ x: p[0], y: p[1], z: p[2], r, col, i: inten, fl }); };
      if (t === T.MINE) {
        // бревенчатый проём в скале
        hill(M, F, { tex: 'mountain', sky, ow: 0.45, oh: 1.6, h: 2.3, rx: 1.4, seed: x * 7 + y, jamb: 'beam' });
        box(M, F, -0.55, -0.1, -0.05, -0.41, 1.75, 0.1, 'beam', sky);
        box(M, F, 0.41, -0.1, -0.05, 0.55, 1.75, 0.1, 'beam', sky);
        box(M, F, -0.68, 1.6, -0.06, 0.68, 1.8, 0.14, 'beam', sky);
        // распорки
        Gfx.P3.quad(M, F.P(-0.41, 1.15, 0.1), F.P(-0.29, 1.15, 0.1), F.P(-0.05, 1.6, 0.1), F.P(-0.2, 1.6, 0.1), [0, 1], [1, 0], 'beam', F.N(0, 0, 1), sky);
        Gfx.P3.quad(M, F.P(0.29, 1.15, 0.1), F.P(0.41, 1.15, 0.1), F.P(0.2, 1.6, 0.1), F.P(0.05, 1.6, 0.1), [0, 1], [1, 0], 'beam', F.N(0, 0, 1), sky);
        // рельсы и шпалы
        for (const sx of [-0.22, 0.2]) box(M, F, sx, 0, -0.9, sx + 0.04, 0.05, 1.4, 'rail', sky);
        for (let k = 0; k < 6; k++) { const z = -0.8 + k * 0.4; box(M, F, -0.32, 0, z, 0.32, 0.03, z + 0.12, 'beam', sky); }
        // фонарь на перекладине
        box(M, F, 0.28, 1.36, 0.12, 0.4, 1.52, 0.24, 'lantern', sky);
        L(0.34, 1.4, 0.4, [1, 0.72, 0.4], 4.5, 1.1, 1);
        if (f && f.mine != null && G.S.sett[f.mine] && G.S.sett[f.mine].mineDead) box(M, F, -0.45, 0, -0.3, 0.45, 1.5, 0.05, 'rubble', sky);
        continue;
      }
      if (t === T.PORTAL) {
        // кольцо светящихся камней и мерцание внутри
        for (let k = 0; k < 12; k++) {
          const a = k / 12 * Math.PI * 2, cx = Math.cos(a) * 0.62, cy = 0.95 + Math.sin(a) * 0.82;
          box(M, F, cx - 0.09, cy - 0.09, -0.06, cx + 0.09, cy + 0.09, 0.06, 'runestone', sky);
        }
        Gfx.P3.quad(M, F.P(-0.5, 0.25, 0), F.P(0.5, 0.25, 0), F.P(0.5, 1.65, 0), F.P(-0.5, 1.65, 0), [0, 1], [1, 0], 'portal', F.N(0, 0, 1), sky);
        Gfx.P3.quad(M, F.P(0.5, 0.25, 0), F.P(-0.5, 0.25, 0), F.P(-0.5, 1.65, 0), F.P(0.5, 1.65, 0), [0, 1], [1, 0], 'portal', F.N(0, 0, -1), sky);
        L(0, 1, 0.4, [0.75, 0.45, 1], 5, 1.3, 0);
        continue;
      }
      if (t === T.UP) {
        // ступени вверх к светлому проёму
        for (let k = 0; k < 7; k++) { const z0 = 0.4 - k * 0.14; box(M, F, -0.46, 0, z0 - 0.14, 0.46, 0.2 + k * 0.26, z0, 'steps', sky); }
        for (const sx of [-1, 1]) box(M, F, sx * 0.5 - 0.06, 0, -0.6, sx * 0.5 + 0.06, 2.0, 0.5, 'stonewall', sky);
        Gfx.P3.quad(M, F.P(-0.46, 1.98, -0.55), F.P(0.46, 1.98, -0.55), F.P(0.46, 1.98, 0.1), F.P(-0.46, 1.98, 0.1), [0, 0], [1, 1], 'skylight', F.N(0, -1, 0), sky);
        L(0, 1.7, -0.2, [0.85, 0.9, 1], 4.5, 0.9, 0);
        continue;
      }
      // T.DOWN: в подземелье — колодец со ступенями; на поверхности — по виду подземелья
      const dtype = ctx.dungeon ? 'stairs' : (m.region && m.region.dun && m.region.dun.type) || (f && /шахт|штольн/.test(f.name || '') ? 'mine_old' : 'cave');
      const wall = { ice: 'icerock', lava: 'basalt', flesh: 'fleshwall', roots: 'bark' }[dtype] || 'stonewall';
      const hillType = !['crypt', 'tomb', 'ruins', 'abyss', 'stairs'].includes(dtype);
      if (!hillType) stairsDown(M, F, sky, wall);
      if (dtype === 'stairs') continue;
      if (dtype === 'crypt' || dtype === 'tomb') {
        // каменный домик: стены, фронтон, арка, решётка, факелы
        box(M, F, -0.95, -0.1, -0.85, -0.6, 2.0, 0.55, 'arch', sky);
        box(M, F, 0.6, -0.1, -0.85, 0.95, 2.0, 0.55, 'arch', sky);
        box(M, F, -0.95, -0.1, -1.0, 0.95, 2.0, -0.85, 'arch', sky);
        box(M, F, -0.6, 1.55, 0.35, 0.6, 2.0, 0.55, 'arch', sky);
        // фронтон
        const P3 = Gfx.P3, top = 2.75;
        P3.tri(M, F.P(-1.05, 2.0, 0.6), F.P(1.05, 2.0, 0.6), F.P(0, top, 0.6), [0, 0.75], [2.1, 0.75], [1.05, 0], 'arch', F.N(0, 0, 1), sky);
        P3.quad(M, F.P(-1.1, 1.98, 0.62), F.P(-1.1, 1.98, -1.05), F.P(0, top, -1.05), F.P(0, top, 0.62), [0, 1.2], [1.7, 0], dtype === 'tomb' ? 'roof_temple' : 'roof_slate', F.N(-0.6, 0.8, 0), sky);
        P3.quad(M, F.P(1.1, 1.98, -1.05), F.P(1.1, 1.98, 0.62), F.P(0, top, 0.62), F.P(0, top, -1.05), [0, 1.2], [1.7, 0], dtype === 'tomb' ? 'roof_temple' : 'roof_slate', F.N(0.6, 0.8, 0), sky);
        // решётка в арке (открыта наполовину — пройти можно)
        for (let k = 0; k < 4; k++) { const sx = -0.55 + k * 0.08; box(M, F, sx, 0, 0.42, sx + 0.025, 1.55, 0.45, 'iron', sky); }
        for (const yy of [0.5, 1.1]) box(M, F, -0.56, yy, 0.42, -0.28, yy + 0.04, 0.45, 'iron', sky);
        // факелы по бокам
        for (const sx of [-0.8, 0.8]) { box(M, F, sx - 0.03, 1.1, 0.55, sx + 0.03, 1.45, 0.62, 'beam', sky); box(M, F, sx - 0.05, 1.45, 0.55, sx + 0.05, 1.6, 0.65, 'flame', sky); L(sx, 1.55, 0.8, [1, 0.6, 0.28], 4, 1.0, 1); }
        continue;
      }
      if (dtype === 'barrow') {
        // травяной холм, вход обложен камнем
        hill(M, F, { tex: 'mound', sky, ow: 0.42, oh: 1.15, h: 2.0, rx: 1.9, rz: 1.6, smooth: 1, seed: x * 7 + y, jamb: 'stonewall', rough: 1 });
        continue;
      }
      if (dtype === 'ruins') {
        box(M, F, -0.8, -0.1, -0.15, -0.5, 1.9, 0.15, 'arch', sky);
        box(M, F, 0.5, -0.1, -0.15, 0.8, 1.2, 0.15, 'arch', sky);
        box(M, F, -0.8, 1.9, -0.15, 0.1, 2.15, 0.15, 'arch', sky);
        box(M, F, 0.2, 0, 0.5, 0.55, 0.3, 0.85, 'rubble', sky);
        continue;
      }
      if (dtype === 'abyss') { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; box(M, F, Math.cos(a) * 0.62 - 0.1, -0.1, Math.sin(a) * 0.62 - 0.1, Math.cos(a) * 0.62 + 0.1, 0.25 + (k % 3) * 0.12, Math.sin(a) * 0.62 + 0.1, 'basalt', sky); } L(0, -0.5, 0, [1, 0.2, 0.1], 3, 0.8, 1); continue; }
      // пещеры и прочее: каменный зев
      const rock = { ice: 'icerock', lava: 'basalt', flesh: 'fleshwall', roots: 'bark' }[dtype] || 'mountain';
      hill(M, F, { tex: rock, sky, ow: 0.48, oh: 1.3, h: 2.5, rx: 1.9, rz: 1.6, seed: x * 7 + y, jamb: rock, rough: 1 });
      if (dtype === 'lava') L(0, 0.4, 0, [1, 0.4, 0.12], 3.5, 1.1, 1);
      if (dtype === 'mine_old') { box(M, F, -0.6, -0.1, 0.45, -0.48, 1.4, 0.56, 'beam', sky); box(M, F, 0.48, -0.1, 0.45, 0.6, 1.4, 0.56, 'beam', sky); box(M, F, -0.7, 1.3, 0.44, 0.7, 1.45, 0.58, 'beam', sky); }
    }
  };
})(window.EOF);
