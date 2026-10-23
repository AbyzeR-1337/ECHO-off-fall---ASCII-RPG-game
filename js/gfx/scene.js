'use strict';
// Сцена «ASCII 2.5D»: земля, стены с гранями, крыши, предметы, существа, свет и погода.
// Получает готовое описание кадра (буфер клеток и список существ) и рисует его.
// Порядок — сзади вперёд, ряд за рядом: высокое в ближнем ряду закрывает то, что стоит за ним.
(function (E) {
  const Gfx = E.Gfx;
  const S = Gfx.S;

  // ---------- буфер сцены ----------
  // Клетка буфера (i, j) — это клетка мира (tx0 + i, ty0 + j).
  Gfx.sceneBuf = function (sc, W, H) {
    if (!sc || sc.W !== W || sc.H !== H) {
      const n = W * H;
      sc = { W, H, g: new Array(n), b: new Array(n), m: new Uint8Array(n), o: new Array(n), oc: new Array(n), of: new Uint8Array(n),
        it: new Array(n), mem: new Uint8Array(n), rf: new Int16Array(n), bank: new Array(n), sh: new Float32Array(n) };
    }
    sc.g.fill(null); sc.b.fill(null); sc.o.fill(null); sc.oc.fill(null); sc.it.fill(null); sc.bank.fill(null);
    sc.m.fill(0); sc.of.fill(0); sc.mem.fill(255); sc.rf.fill(-1); sc.sh.fill(0);
    sc.ents = []; sc.roofs = []; sc.lights = []; sc.fx = []; sc.cursor = null; sc.weather = null; sc.storm = false;
    sc.ambient = null; sc.shadowA = 0.45; sc.base = null; sc.shade = null; sc.hlights = null;
    return sc;
  };

  // ---------- свет ----------
  let LC = null;
  function lightCanvas(w, h) {
    const W = Math.ceil(w * S.dpr), H = Math.ceil(h * S.dpr);
    if (!LC || LC.width !== W || LC.height !== H) { LC = document.createElement('canvas'); LC.width = W; LC.height = H; }
    return LC;
  }

  // ---------- погода: частицы в экранных координатах ----------
  const WX = {
    rain: { n: 0.55, ch: ['/', '|'], col: '#6a8ac8', vx: -0.35, vy: 1.6, a: 0.7 },
    storm: { n: 1.1, ch: ['/', '/'], col: '#8aa8e0', vx: -0.6, vy: 2.2, a: 0.8 },
    snow: { n: 0.7, ch: ['*', '.', '·'], col: '#e8f0ff', vx: 0.05, vy: 0.25, sway: 1, a: 0.9 },
    blizzard: { n: 1.6, ch: ['*', '-', '.'], col: '#f0f4ff', vx: 1.2, vy: 0.5, a: 0.9 },
    blacksnow: { n: 0.8, ch: ['*', '.'], col: '#50505a', vx: 0.05, vy: 0.22, sway: 1, a: 0.95 },
    ashrain: { n: 0.8, ch: ['.', ',', '\''], col: '#9a9490', vx: 0.1, vy: 0.3, sway: 1, a: 0.8 },
    sandstorm: { n: 1.4, ch: ['~', '-', '.'], col: '#d0b070', vx: 2.2, vy: 0.15, a: 0.8 },
    fog: { n: 0.25, ch: ['≈', '~'], col: '#8a9098', vx: 0.12, vy: 0, a: 0.45 },
  };
  const EL = { fire: ['#ff6020', '#ffb040', '*^~'], ice: ['#60c0ff', '#e0f8ff', '*+·'], holy: ['#ffe080', '#ffffff', '+*·'], void: ['#9050ff', '#d0a0ff', '@%o'], poison: ['#60d060', '#a0ff80', 'o°~'], blood: ['#e03030', '#ff8080', '*\'.'], phys: ['#d0d0d0', '#ffffff', 'x*+'] };

  // ---------- главный вывод ----------
  Gfx.drawScene = function (ctx, sc) {
    const TW = S.TW, TH = S.TH, W = sc.W, H = sc.H;
    const now = sc.now;
    ctx.save();
    ctx.beginPath(); ctx.rect(sc.vx0, sc.vy0, sc.vw, sc.vh); ctx.clip();
    ctx.fillStyle = sc.bg || '#060509'; ctx.fillRect(sc.vx0, sc.vy0, sc.vw, sc.vh);
    const X = (i) => Math.round(sc.px0 + i * TW), Y = (j) => Math.round(sc.py0 + j * TH);
    const gf = Math.floor(now / 170);
    const of = Math.floor(now / 380);
    const tx0 = sc.tx0, ty0 = sc.ty0;
    // 1. земля и берега
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, mem = sc.mem[k];
      if (mem === 255 || sc.rf[k] >= 0 || sc.b[k]) continue;
      const g = sc.g[k];
      if (!g) continue;
      const x = X(i), y = Y(j);
      Gfx.drawGround(ctx, g, x, y, tx0 + i, ty0 + j, gf, mem, sc.base);
      const bk = sc.bank[k];
      if (bk) { const img = Gfx.blockImg(bk, 'f', 0, tx0 + i, ty0 + j, mem); if (img) ctx.drawImage(img.cv, x, y, img.w, img.h); }
    }
    // сущности по рядам
    const byRow = new Map();
    for (const e of sc.ents) { const r = Math.round(e.y); if (!byRow.has(r)) byRow.set(r, []); byRow.get(r).push(e); }
    for (const l of byRow.values()) l.sort((a, b) => a.y - b.y || a.x - b.x);
    const chimByRow = new Map();
    for (const r of sc.roofs) if (r.chim) for (const c of r.chim) { if (!chimByRow.has(c.y)) chimByRow.set(c.y, []); chimByRow.get(c.y).push(Object.assign({ mem: r.mem }, c)); }
    const shA = sc.shadowA;
    const shadow = (x, y, w, a) => {
      if (w <= 0 || shA <= 0.02) return;
      ctx.globalAlpha = shA * (a || 1);
      ctx.beginPath(); ctx.ellipse(x + TW * 0.56, y + TH * 0.86, TW * 0.48 * w, TH * 0.15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    };
    // 2. по рядам — сзади вперёд
    for (let j = 0; j < H; j++) {
      const y = Y(j);
      // 2a. верх стен и скал, крыши
      for (let i = 0; i < W; i++) {
        const k = j * W + i, mem = sc.mem[k];
        if (mem === 255) continue;
        const rf = sc.rf[k];
        if (rf >= 0) {
          const r = sc.roofs[rf];
          const ridge = r.y + ((r.h - 1) >> 1);
          const info = { l: i === r.x ? 1 : 0, r: i === r.x + r.w - 1 ? 1 : 0, t: j === r.y ? 1 : 0, b: j === r.y + r.h - 1 ? 1 : 0, zone: j < ridge ? 'n' : j === ridge ? 'r' : 's', x: tx0 + i, y: ty0 + j };
          const img = Gfx.roofImg(r.style, info, mem);
          if (img) ctx.drawImage(img.cv, X(i), y, img.w, img.h);
          continue;
        }
        const b = sc.b[k];
        if (!b) continue;
        const img = Gfx.blockImg(b, 't', sc.m[k], tx0 + i, ty0 + j, mem);
        if (img) ctx.drawImage(img.cv, X(i), y, img.w, img.h);
      }
      // 2b. лицевые грани ряда выше — свисают в этот ряд
      if (j > 0) {
        ctx.fillStyle = '#000000';
        for (let i = 0; i < W; i++) {
          const k = j * W + i, a = k - W;
          const ba = sc.b[a];
          if (!ba || sc.mem[a] === 255) continue;
          const rfa = sc.rf[a], rfk = sc.rf[k];
          if (rfa >= 0 && rfa === rfk) continue;           // внутри одной крыши
          if (rfa < 0 && rfk >= 0) continue;               // крыша выше скалы за ней
          if (sc.b[k] && rfk < 0 && rfa < 0) continue;     // стена за стеной — грани не видно
          // фасад дома под крышей — в полный рост, остальные низкие стены — в полряда
          const part = rfa < 0 && Gfx.blocks[ba] && Gfx.blocks[ba].faceRows === 1 ? 'h' : 'f';
          const img = Gfx.blockImg(ba, part, sc.m[a], tx0 + i, ty0 + j - 1, sc.mem[a]);
          if (!img) continue;
          const x = X(i);
          ctx.drawImage(img.cv, x, y, img.w, img.h);
          // мягкая тень у подножия
          const fh = part === 'h' ? S.ch : TH;
          if (shA > 0.02 && !sc.b[k]) { ctx.globalAlpha = shA * 0.7; ctx.fillRect(x, y + fh, TW, Math.max(2, S.ch * 0.25)); ctx.globalAlpha = shA * 0.35; ctx.fillRect(x, y + fh + S.ch * 0.25, TW, S.ch * 0.25); ctx.globalAlpha = 1; }
        }
      }
      // 2c. предметы мира, вещи, существа этого ряда
      ctx.fillStyle = '#000000';
      for (let i = 0; i < W; i++) {
        const k = j * W + i, mem = sc.mem[k];
        if (mem === 255 || sc.rf[k] >= 0) continue;
        const o = sc.o[k];
        if (o) {
          const d = Gfx.sprites[o];
          const x = X(i);
          if (!mem && d) shadow(x, y, d.shadow != null ? d.shadow : 1, 1);
          Gfx.drawSprite(ctx, o, x, y, { f: d && d.frames ? of + sc.of[k] : 0, mode: mem, c: sc.oc[k] });
        }
        const it = sc.it[k];
        if (it && !mem) { const x = X(i); shadow(x, y, 0.35, 0.8); Gfx.drawSprite(ctx, it, x, y, { f: of }); }
      }
      const row = byRow.get(j);
      if (row) for (const e of row) {
        const x = Math.round(sc.px0 + e.x * TW), ey = Math.round(sc.py0 + e.y * TH);
        const d = Gfx.sprites[e.k];
        if (!d) continue;
        if (e.aura) { ctx.globalAlpha = 0.28; ctx.fillStyle = e.aura; ctx.beginPath(); ctx.ellipse(x + TW * 0.5, ey + TH * 0.84, TW * 0.9, TH * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#000000'; }
        if (e.mode !== 2) shadow(x, ey, (d.shadow != null ? d.shadow : 0.8) * (e.big ? 1.3 : 1), d.lift ? 0.6 : 1.1);
        if (e.ring) { ctx.strokeStyle = e.ring; ctx.lineWidth = Math.max(1, S.cw * 0.18); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(x + TW * 0.5, ey + TH * 0.86, TW * 0.42, TH * 0.15, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = '#000000'; }
        Gfx.drawSprite(ctx, e.k, x, ey, { f: e.f, mode: e.mode, c: e.c, flip: e.flip, alpha: e.alpha, lift: e.lift });
        if (e.sleep) Gfx.drawSprite(ctx, 'fx_sleep', x, ey - S.ch * 2, { f: of });
        if (e.hit) Gfx.drawSprite(ctx, 'fx_hit', x, ey - S.ch * 0.5, { f: of });
      }
      const ch = chimByRow.get(j);
      if (ch) for (const c of ch) { const k = j * W + c.x; if (c.x >= 0 && c.x < W && sc.mem[k] !== 255) Gfx.drawSprite(ctx, 'chimney', X(c.x), y - S.ch, { f: of, mode: sc.mem[k] }); }
    }
    // уровень 2 — тени от солнца, облака и мягкое затенение поверх рисунков
    if (sc.shade && Gfx.HF) Gfx.HF.shadeOverlay(ctx, sc);
    // 3. темнота и свет
    const amb = sc.ambient;
    if (amb && amb.a > 0.01) {
      const lc = lightCanvas(sc.vw, sc.vh);
      const lx = lc.getContext('2d');
      lx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
      lx.globalCompositeOperation = 'source-over';
      lx.clearRect(0, 0, sc.vw, sc.vh);
      lx.fillStyle = 'rgba(' + amb.col[0] + ',' + amb.col[1] + ',' + amb.col[2] + ',' + amb.a.toFixed(3) + ')';
      lx.fillRect(0, 0, sc.vw, sc.vh);
      lx.globalCompositeOperation = 'destination-out';
      for (const l of sc.lights) {
        const cx = sc.px0 - sc.vx0 + (l.x + 0.5) * TW, cy = sc.py0 - sc.vy0 + (l.y + 0.5) * TH, R = l.r * TW;
        if (cx + R < 0 || cy + R < 0 || cx - R > sc.vw || cy - R > sc.vh) continue;
        const g = lx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
        g.addColorStop(0, 'rgba(0,0,0,' + (l.a != null ? l.a : 1) + ')');
        g.addColorStop(0.55, 'rgba(0,0,0,' + ((l.a != null ? l.a : 1) * 0.8).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        lx.fillStyle = g; lx.fillRect(cx - R, cy - R, R * 2, R * 2);
      }
      ctx.drawImage(lc, sc.vx0, sc.vy0, sc.vw, sc.vh);
    }
    // тёплое и цветное свечение
    ctx.globalCompositeOperation = 'lighter';
    for (const l of sc.lights) {
      if (!l.glow) continue;
      const cx = sc.px0 + (l.x + 0.5) * TW, cy = sc.py0 + (l.y + 0.5) * TH, R = l.r * TW * 0.8;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, l.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    // 4. погода
    const wx = WX[sc.weather];
    if (wx) {
      const area = (sc.vw * sc.vh) / (TW * TH);
      const n = Math.min(700, Math.round(area * wx.n));
      const t = now / 16;
      ctx.font = S.fpx + 'px ' + S.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = wx.col; ctx.globalAlpha = wx.a;
      for (let q = 0; q < n; q++) {
        const h1 = Gfx.hash(q, 1, 7), h2 = Gfx.hash(q, 2, 7), h3 = Gfx.hash(q, 3, 7);
        const sp = 0.6 + h3 * 0.8;
        let px = (h1 * sc.vw + t * wx.vx * sp * S.cw * 0.25) % sc.vw; if (px < 0) px += sc.vw;
        let py = (h2 * sc.vh + t * wx.vy * sp * S.ch * 0.25) % sc.vh; if (py < 0) py += sc.vh;
        if (wx.sway) px += Math.sin(t * 0.05 + q) * S.cw * 0.6;
        ctx.fillText(wx.ch[q % wx.ch.length], sc.vx0 + px, sc.vy0 + py);
      }
      ctx.globalAlpha = 1;
    }
    if (sc.storm) { ctx.fillStyle = '#d0d8ff'; ctx.globalAlpha = 0.2; ctx.fillRect(sc.vx0, sc.vy0, sc.vw, sc.vh); ctx.globalAlpha = 1; }
    // 5. вспышки умений — россыпь знаков стихии
    if (sc.fx.length) {
      ctx.font = '700 ' + S.fpx + 'px ' + S.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const f of sc.fx) {
        const el = EL[f.el] || EL.phys;
        const life = Math.max(0, Math.min(1, f.life));
        ctx.globalAlpha = 0.35 + 0.65 * life;
        for (let dy = -f.r; dy <= f.r; dy++) for (let dx = -f.r; dx <= f.r; dx++) {
          for (let q = 0; q < 3; q++) {
            const h = Gfx.hash(dx * 7 + q, dy * 5 + Math.floor(now / 60), 3);
            if (h > 0.7) continue;
            const x = sc.px0 + (f.x + dx) * TW + (Gfx.hash(dx, dy, q) * 0.9 + 0.05) * TW, y = sc.py0 + (f.y + dy) * TH + (Gfx.hash(dy, dx, q + 9) * 0.9 + 0.05) * TH - (1 - life) * S.ch;
            ctx.fillStyle = h < 0.3 ? el[1] : el[0];
            ctx.fillText(el[2][Math.floor(h * 10) % el[2].length], x, y);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    // 6. курсор осмотра — скобки
    if (sc.cursor) {
      const x = Math.round(sc.px0 + sc.cursor[0] * TW), y = Math.round(sc.py0 + sc.cursor[1] * TH);
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#f0c060'; ctx.fillRect(x, y, TW, TH); ctx.globalAlpha = 1;
      ctx.font = '700 ' + Math.round(S.fpx * 1.3) + 'px ' + S.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffe080';
      ctx.fillText('[', x - S.cw * 0.2, y + TH / 2); ctx.fillText(']', x + TW + S.cw * 0.2, y + TH / 2);
    }
    ctx.restore();
  };
})(window.EOF);
