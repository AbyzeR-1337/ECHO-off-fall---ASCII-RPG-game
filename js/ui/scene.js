'use strict';
// Объёмная карта (2.5D): тот же ASCII, но у стен есть верх и лицевая грань,
// деревья и существа приподняты над землёй и отбрасывают тени, вода лежит ниже берега.
(function (E) {
  const U = E.U, T = E.T, TL = E.TL, UI = E.UI;
  // 0 — плоская, 1 — стена/скала, 2 — низкая вещь, 3 — высокий спрайт, 4 — малый спрайт, 5 — низина, 6 — настил над водой
  const K3 = UI.K3 = new Uint8Array(TL.length);
  const cls = (k, keys) => { for (const key of keys) K3[T[key]] = k; };
  cls(1, ['WALL', 'TOWNWALL', 'TREEWALL', 'CORALWALL', 'WINDOW', 'DOOR', 'CAVEWALL', 'CRACKWALL', 'BASALT', 'FLESHWALL', 'DREAMWALL', 'CLOCKWALL', 'MOUNTAIN', 'PEAK', 'ICEROCK', 'BIGTREE', 'PILLAR', 'ORE', 'SHELF']);
  cls(2, ['TABLE', 'COUNTER', 'CHEST', 'ALTAR', 'ANVIL', 'THRONE', 'ALCHTABLE', 'GRAVE', 'WELL', 'BOULDER', 'INSCRIPTION']);
  cls(3, ['TREE', 'PINE', 'DEADTREE', 'CORAL', 'BIGSHROOM', 'STATUE', 'LIGHTHOUSE', 'CACTUS', 'TENT', 'SHRINE']);
  cls(4, ['SAPLING', 'BUSH', 'FERN', 'REEDS', 'MUSHROOM', 'CRYSTAL', 'SIGN', 'CAMPFIRE', 'FLOWERS']);
  cls(5, ['WATER', 'SHALLOW', 'STREAM', 'BOG', 'LAVA', 'MIRRORWATER', 'WHIRLPOOL', 'VOID', 'CLOUD']);
  cls(6, ['BRIDGE', 'DOCK']);
  const CLIFF = new Set([T.VOID, T.CLOUD]);
  const ROCK = new Set([T.CAVEWALL, T.CRACKWALL, T.BASALT, T.MOUNTAIN, T.PEAK, T.ICEROCK, T.ORE, T.FLESHWALL, T.DREAMWALL, T.CLOCKWALL]);
  // высота граней в долях высоты клетки
  const FACE = 0.6, LOWF = 0.24, DECKF = 0.18, BANK = 0.26, DROP = 0.95;

  UI.sceneBuf = function (w, h) {
    let s = UI._sc;
    if (!s || s.w !== w || s.h !== h) {
      const n = w * h;
      s = UI._sc = {
        w, h, k: new Uint8Array(n), v: new Uint8Array(n), out: new Uint8Array(n), tid: new Uint16Array(n), ef: new Uint8Array(n),
        ch: new Array(n), fg: new Array(n), bg: new Array(n), gb: new Array(n), ich: new Array(n), ifg: new Array(n), ech: new Array(n), efg: new Array(n),
      };
    }
    s.ich.fill(null); s.ech.fill(null); s.ef.fill(0); s.out.fill(0); s.k.fill(255);
    s.lights = []; s.flash = null; s.storm = false; s.cursor = null; s.p = null;
    return s;
  };

  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

  UI.drawScene = function (ctx, t, s) {
    const cw = t.cw, chh = t.ch, W = s.w, H = s.h;
    const X0 = s.x0 * cw, Y0 = s.y0 * chh;
    ctx.beginPath(); ctx.rect(X0, Y0, s.vw * cw, s.vh * chh); ctx.clip();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fN = t.font, fB = '700 ' + t.font;
    const fBig = Math.round(t.fpx * 1.32) + 'px ' + t.family, fBoss = '700 ' + Math.round(t.fpx * 1.3) + 'px ' + t.family;
    const shA = 0.22 + 0.3 * s.light;
    const now = s.now;
    const K = s.k;
    const cellW = cw + 0.6, cellH = chh + 0.6;
    for (let r = 0; r < H; r++) {
      const py = Y0 + (r - 1) * chh;
      const row = r * W, up = row - W;
      // 1. земля, вода и верх стен
      ctx.font = fN;
      for (let c = 0; c < W; c++) {
        const j = row + c, k = K[j];
        if (k >= 254) continue;
        const px = X0 + c * cw;
        const fg = s.fg[j], bg = s.bg[j];
        let base;
        if (k === 1) base = bg ? U.mixc(bg, fg, 0.34) : U.shade(fg, 0.52);
        else if (k === 2) base = U.mixc(bg || '#0b0a0f', fg, 0.3);
        else if (k === 5) base = bg || U.shade(fg, 0.22);
        else base = bg || (s.gb[j] ? U.mixc(U.shade(s.gb[j], 0.17), U.shade(fg, 0.17), 0.3) : U.shade(fg, 0.17));
        ctx.fillStyle = base; ctx.fillRect(px, py, cellW, cellH);
        const nk = r > 0 ? K[up + c] : 255;
        if (k === 5) {
          // берег: лицевая грань суши над водой (или обрыв над пустотой)
          if (nk !== 5 && nk !== 1 && nk < 254) {
            const deep = CLIFF.has(s.tid[j]);
            const bh = Math.round(chh * (deep ? DROP : BANK));
            const nf = s.fg[up + c];
            const bc = U.mixc(U.shade(nf, deep ? 0.32 : 0.4), '#2a2016', 0.5);
            ctx.fillStyle = bc; ctx.fillRect(px, py, cellW, bh);
            ctx.fillStyle = U.shade(nf, 0.55); ctx.fillRect(px, py, cellW, 1);
            if (deep) { ctx.fillStyle = U.shade(bc, 0.7); const hh = hash(c + s.cx, r + s.cy); ctx.fillRect(px + (hh % 5) * cw / 6, py + 2, 1, bh - 4); ctx.fillRect(px + ((hh >> 3) % 5) * cw / 6 + 2, py + bh * 0.3, 1, bh * 0.6); }
            ctx.fillStyle = '#000000';
            ctx.globalAlpha = 0.35; ctx.fillRect(px, py + bh, cellW, chh * 0.1);
            ctx.globalAlpha = 0.15; ctx.fillRect(px, py + bh + chh * 0.1, cellW, chh * 0.1);
            ctx.globalAlpha = 1;
          }
          const ch = s.ch[j];
          if (ch !== ' ') {
            const sway = s.v[j] ? Math.sin(now / 650 + (c + s.cx) * 0.9 + (r + s.cy) * 0.4) * cw * 0.08 : 0;
            ctx.fillStyle = fg; t.glyph(ch, px + sway, py + chh * 0.08, cw, chh);
          }
          continue;
        }
        if (k === 1) {
          // кромка верха там, где сзади нет стены; тёмные бока у одиночных стен
          if (nk !== 1 && nk < 254) { ctx.fillStyle = U.mixc(base, '#ffffff', 0.22); ctx.fillRect(px, py, cellW, 1); }
          ctx.fillStyle = U.shade(base, 0.7);
          if (c > 0 && K[j - 1] !== 1) ctx.fillRect(px, py, 1, cellH);
          if (c < W - 1 && K[j + 1] !== 1) ctx.fillRect(px + cw - 1, py, 1, cellH);
          ctx.fillStyle = s.v[j] ? U.mixc(fg, '#ffffff', 0.25) : fg; t.glyph(s.ch[j], px, py, cw, chh);
          continue;
        }
        if (k === 3 || k === 4) continue;
        ctx.fillStyle = fg; t.glyph(s.ch[j], px, py, cw, chh);
      }
      // 2. лицевые грани предметов ряда выше, свисающие в этот ряд
      if (r > 0) for (let c = 0; c < W; c++) {
        const a = up + c, ka = K[a];
        if (ka !== 1 && ka !== 2 && ka !== 6) continue;
        const kb = K[row + c];
        let fh;
        if (ka === 1) { if (kb === 1) continue; fh = FACE; }
        else if (ka === 2) { if (kb === 1 || kb === 2) continue; fh = LOWF; }
        else { if (kb !== 5) continue; fh = DECKF; }
        const px = X0 + c * cw, h = Math.round(chh * fh);
        const fg = s.fg[a], bg = s.bg[a], tid = s.tid[a];
        let face = bg && ka === 1 ? U.mixc(bg, fg, 0.2) : U.shade(fg, ka === 1 ? 0.3 : 0.4);
        if (tid === T.WINDOW) face = U.shade('#9a8a72', s.v[a] ? 0.3 : 0.2);
        ctx.fillStyle = face; ctx.fillRect(px, py, cellW, h);
        const dark = U.shade(face, 0.62);
        if (ka === 1) {
          const hh = hash(c + s.cx, r + s.cy);
          if (tid === T.DOOR) {
            ctx.fillStyle = U.shade(fg, 0.3); ctx.fillRect(px + cw * 0.18, py, cw * 0.64, h);
            ctx.fillStyle = U.shade(fg, 0.62); ctx.fillRect(px + cw * 0.24, py + 1, cw * 0.52, h - 1);
            ctx.fillStyle = U.shade(fg, 0.3); ctx.fillRect(px + cw * 0.5, py + 1, 1, h - 1);
          } else if (tid === T.WINDOW) {
            ctx.fillStyle = dark; ctx.fillRect(px + cw * 0.2, py + h * 0.18, cw * 0.6, h * 0.64);
            ctx.fillStyle = fg; ctx.fillRect(px + cw * 0.26, py + h * 0.26, cw * 0.48, h * 0.48);
          } else if (tid === T.SHELF) {
            const cols = ['#8a3a30', '#3a6a4a', '#5a4a8a', '#a08040', '#406080'];
            for (let q = 0; q < 4; q++) { ctx.fillStyle = U.shade(cols[(hh + q) % 5], s.v[a] ? 0.85 : 0.4); ctx.fillRect(px + cw * (0.12 + q * 0.2), py + h * 0.2, cw * 0.14, h * 0.7); }
          } else if (ROCK.has(tid)) {
            ctx.fillStyle = dark;
            ctx.fillRect(px + (hh % 7) * cw / 8, py + h * 0.35, Math.max(1, cw * 0.22), 1);
            ctx.fillRect(px + ((hh >> 4) % 6) * cw / 7, py + h * 0.7, Math.max(1, cw * 0.3), 1);
            if (tid === T.CRACKWALL) { ctx.fillStyle = U.shade(face, 0.4); ctx.fillRect(px + cw * 0.46, py + 1, 1, h * 0.55); ctx.fillRect(px + cw * 0.52, py + h * 0.5, 1, h * 0.45); }
          } else if (tid !== T.BIGTREE && tid !== T.PILLAR) {
            // кладка
            ctx.fillStyle = dark;
            ctx.fillRect(px, py + Math.round(h * 0.5), cellW, 1);
            const off = (c + s.cx + r + s.cy) % 2 ? cw * 0.3 : cw * 0.75;
            ctx.fillRect(px + off, py + 1, 1, Math.round(h * 0.5) - 1);
            ctx.fillRect(px + ((off + cw * 0.45) % cw), py + Math.round(h * 0.5) + 1, 1, h - Math.round(h * 0.5) - 1);
          }
        }
        ctx.fillStyle = U.mixc(face, '#ffffff', 0.16); ctx.fillRect(px, py, cellW, 1);
        // тень у подножия
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = shA * 0.9; ctx.fillRect(px, py + h, cellW, chh * 0.09);
        ctx.globalAlpha = shA * 0.45; ctx.fillRect(px, py + h + chh * 0.09, cellW, chh * 0.1);
        ctx.globalAlpha = 1;
      }
      // боковая тень от стен и скал на соседей справа (днём)
      if (s.light > 0.3) {
        ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.22 * s.light;
        for (let c = 1; c < W; c++) {
          const j = row + c, k = K[j];
          if (k === 1 || k >= 254 || K[j - 1] !== 1) continue;
          ctx.fillRect(X0 + c * cw, py, cw * 0.32, chh);
        }
        ctx.globalAlpha = 1;
      }
      // 3. приподнятое: деревья, вещи на земле, существа
      let font = fN;
      const setF = (f) => { if (font !== f) { ctx.font = f; font = f; } };
      for (let c = 0; c < W; c++) {
        const j = row + c, k = K[j];
        if (k === 255) continue;
        const px = X0 + c * cw;
        const vis = s.v[j];
        if (k === 3 || k === 4) {
          const big = k === 3;
          if (vis) {
            ctx.fillStyle = '#000000'; ctx.globalAlpha = shA * (big ? 1 : 0.7);
            ctx.beginPath(); ctx.ellipse(px + cw * 0.58, py + chh * 0.8, cw * (big ? 0.55 : 0.36), chh * (big ? 0.15 : 0.1), 0, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
          }
          const tid = s.tid[j];
          if (tid === T.TREE || tid === T.PINE || tid === T.DEADTREE || tid === T.BIGSHROOM) {
            ctx.fillStyle = vis ? (tid === T.BIGSHROOM ? '#8a7aa0' : '#4a3422') : '#2a2630';
            ctx.fillRect(px + cw * 0.44, py + chh * 0.45, Math.max(2, cw * 0.14), chh * 0.36);
          }
          setF(big ? fBig : fN);
          ctx.fillStyle = s.fg[j];
          t.glyph(s.ch[j], px, py - chh * (big ? 0.26 : 0.08), cw, chh);
        }
        if (s.ich[j]) {
          if (vis) { ctx.fillStyle = '#000000'; ctx.globalAlpha = shA * 0.8; ctx.beginPath(); ctx.ellipse(px + cw * 0.52, py + chh * 0.78, cw * 0.3, chh * 0.08, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
          setF(fN); ctx.fillStyle = s.ifg[j]; t.glyph(s.ich[j], px, py - chh * 0.06, cw, chh);
        }
        if (s.ech[j]) {
          const f = s.ef[j];
          if (f & 8) { setF(fN); ctx.fillStyle = s.efg[j]; t.glyph(s.ech[j], px, py, cw, chh); continue; }
          const boss = f & 1;
          if (boss) { ctx.fillStyle = '#ff2030'; ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.ellipse(px + cw * 0.5, py + chh * 0.78, cw * 0.75, chh * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
          ctx.fillStyle = '#000000'; ctx.globalAlpha = shA + 0.1;
          ctx.beginPath(); ctx.ellipse(px + cw * 0.5, py + chh * 0.8, cw * 0.38, chh * 0.11, 0, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          setF(boss ? fBoss : fB);
          const ly = py - chh * (f & 2 ? 0.04 : boss ? 0.2 : 0.15);
          ctx.fillStyle = s.efg[j]; ctx.fillText(s.ech[j], px + cw / 2, ly + chh / 2 + 1);
        }
      }
      // игрок — в своём ряду, с обводкой, чтобы не терялся в листве
      if (s.p && s.p.r === r) {
        const p = s.p, px = X0 + p.c * cw;
        ctx.fillStyle = '#000000'; ctx.globalAlpha = shA + 0.15;
        ctx.beginPath(); ctx.ellipse(px + cw * 0.5, py + chh * 0.8, cw * 0.42, chh * 0.12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        setF(fB);
        const ly = py - chh * 0.16 + chh / 2 + 1;
        ctx.lineWidth = Math.max(2, cw / 4); ctx.strokeStyle = p.hit ? '#401010' : '#16120a'; ctx.lineJoin = 'round';
        ctx.strokeText(p.ch, px + cw / 2, ly);
        ctx.fillStyle = p.hit ? '#ff4040' : '#fff6d0'; ctx.fillText(p.ch, px + cw / 2, ly);
      }
    }
    // 4. свет: костры, разрывы, факел
    if (s.lights.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const l of s.lights) {
        const x = X0 + (l[0] + 0.5) * cw, y = Y0 + (l[1] + 0.5) * chh, R = l[3] * cw * 1.7;
        const g = ctx.createRadialGradient(x, y, 0, x, y, R);
        g.addColorStop(0, l[2]); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // 5. погода — поверх всего, падает сверху
    const wx = s.weather;
    if (wx && wx !== 'none') {
      const fr = Math.floor(now / 160);
      ctx.beginPath();
      let any = false;
      for (let r = 1; r < H - 1; r++) for (let c = 0; c < W; c++) {
        const j = r * W + c;
        if (!s.out[j]) continue;
        const hh = ((c + s.cx) * 73856093 ^ (r - 1 + s.cy) * 19349663 ^ fr) >>> 0;
        const px = X0 + c * cw, py = Y0 + (r - 1) * chh;
        if (wx === 'rain' || wx === 'storm') {
          if (hh % 31) continue;
          any = true; ctx.moveTo(px + cw * 0.75, py); ctx.lineTo(px + cw * 0.35, py + chh * 0.7);
        } else if (wx === 'snow' || wx === 'blizzard' || wx === 'blacksnow' || wx === 'ashrain') {
          if (hh % (wx === 'blizzard' ? 8 : wx === 'ashrain' ? 19 : 23)) continue;
          ctx.fillStyle = wx === 'blacksnow' ? '#404048' : wx === 'ashrain' ? '#909090' : '#e8f0ff';
          const d = (hh >> 5) % 4;
          ctx.fillRect(px + cw * (0.2 + d * 0.18), py + chh * ((hh >> 8) % 5) / 5, Math.max(2, cw / 5), Math.max(2, cw / 5));
        } else if (wx === 'sandstorm') {
          if (hh % 11) continue;
          ctx.fillStyle = '#d0b070'; ctx.font = fN; ctx.fillText('~', px + cw / 2, py + chh / 2);
        }
      }
      if (any) { ctx.strokeStyle = '#7a9ad8'; ctx.globalAlpha = 0.75; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; }
    }
    if (s.storm) { ctx.fillStyle = '#c8c8ff'; ctx.globalAlpha = 0.16; ctx.fillRect(X0, Y0, s.vw * cw, s.vh * chh); ctx.globalAlpha = 1; }
    if (s.flash) {
      const f = s.flash;
      ctx.fillStyle = f.el === 'fire' ? '#ff6020' : f.el === 'ice' ? '#40a0ff' : f.el === 'holy' ? '#fff080' : f.el === 'void' ? '#8040ff' : '#c0c0c0';
      ctx.globalAlpha = 0.3;
      ctx.fillRect(X0 + (f.c - f.r) * cw, Y0 + (f.rr - f.r) * chh, (f.r * 2 + 1) * cw, (f.r * 2 + 1) * chh);
      ctx.globalAlpha = 1;
    }
    if (s.cursor) {
      const x = X0 + s.cursor[0] * cw, y = Y0 + s.cursor[1] * chh;
      ctx.fillStyle = '#806020'; ctx.globalAlpha = 0.45; ctx.fillRect(x, y, cw, chh); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#f0c060'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, cw - 1.5, chh - 1.5);
    }
  };

  // ---------- подсказка «E» ----------
  UI.drawHints = function (ctx, t, h) {
    const cw = t.cw, chh = t.ch;
    ctx.beginPath(); ctx.rect(h.x0 * cw, h.y0 * chh, h.vw * cw, h.vh * chh); ctx.clip();
    const bh = Math.max(10, Math.round(chh * 0.62)), bw = Math.max(Math.round(bh * 0.86), Math.round(cw * 0.95));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 ' + Math.max(8, Math.round(bh * 0.78)) + 'px ' + t.family;
    for (const o of h.list) {
      const lift = o.self ? chh * (h.d3 ? 0.2 : 0.06) : h.d3 && (o.k === 1 || o.k === 3) ? chh * 0.28 : h.d3 && o.k === 2 ? chh * 0.1 : 0;
      // значок над вещью; если вещь прямо под ногами снизу — под ней, чтобы не закрывать тебя
      const x = Math.round((h.x0 + o.c + 0.5) * cw - bw / 2);
      const y = o.dy === 1 ? Math.round((h.y0 + o.r + 1) * chh - bh * 0.1) : Math.round((h.y0 + o.r) * chh - bh * 0.8 - lift);
      ctx.globalAlpha = o.main ? 1 : 0.55;
      ctx.fillStyle = '#000000'; ctx.globalAlpha *= 0.5; rr(ctx, x + 1, y + 2, bw, bh, 3); ctx.fill();
      ctx.globalAlpha = o.main ? 1 : 0.55;
      ctx.fillStyle = o.main ? '#f0c060' : '#3a3020'; rr(ctx, x, y, bw, bh, 3); ctx.fill();
      ctx.strokeStyle = o.main ? '#fff0c0' : '#a08850'; ctx.lineWidth = 1; rr(ctx, x + 0.5, y + 0.5, bw - 1, bh - 1, 3); ctx.stroke();
      ctx.fillStyle = o.main ? '#1a1206' : '#f0c060'; ctx.fillText('E', x + bw / 2, y + bh / 2 + 1);
    }
    ctx.globalAlpha = 1;
  };
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  // кнопка «Действие» на сенсорной панели загорается, когда есть очевидное дело
  let actBtn, actOn = null;
  UI.syncAct = function (on) {
    if (actOn === on) return;
    actOn = on;
    if (!actBtn) actBtn = document.querySelector('#touch [data-k="act"]');
    if (actBtn) actBtn.classList.toggle('ready', on);
  };
})(window.EOF);
