'use strict';
// Карта мира (M) в 3D: весь мир сверху тем же движком, что и игра — горы, леса, реки, море, замки.
// Поверх: названия поселений и земель, границы владений (бурые полосы, как на старых картах),
// туман над неизведанным, ты — с именем. Колесо или +/− — ближе и дальше, тянуть мышью или стрелки —
// двигать, двойной щелчок или Пробел — к себе, Esc или M — закрыть.
(function (E) {
  const UI = E.UI, G = E.G, U = E.U, C = E.C, D = E.D, Gfx = E.Gfx;
  const MW = C.MW, MH = C.MH, WS = C.WS;
  const PHI = 1.08, FOV = 42 * Math.PI / 180;

  // где ты на земле мира (в клетках всего мира)
  function here() {
    const P = G.P, m = G.map;
    if (m.kind === 'over' && m.region) return [m.region.x * MW + (P.posX != null ? P.posX : P.x + 0.5), m.region.y * MH + (P.posY != null ? P.posY : P.y + 0.5)];
    const k = P.lastOver && P.lastOver.key ? P.lastOver.key.split(':') : null;
    if (k && k[0] === 'o') return [+k[1] * MW + (P.lastOver.x || MW / 2) + 0.5, +k[2] * MH + (P.lastOver.y || MH / 2) + 0.5];
    const g = m.region || G.W.regions[G.W.start];
    return [g.x * MW + MW / 2, g.y * MH + MH / 2];
  }
  // верхний титул земли (герцогство, вольное графство…) — по нему границы
  function topOf(g) {
    const W = G.W;
    if (!g || g.title == null || g.title < 0 || !W.titles) return -1;
    let t = W.titles[g.title], n = 0;
    while (t && t.parent != null && n++ < 6) t = W.titles[t.parent];
    return t ? t.id : -1;
  }
  function countyOf(g) {
    const W = G.W;
    if (!g || g.title == null || g.title < 0 || !W.titles) return -1;
    const t = W.titles[g.title];
    return t && t.parent != null ? t.parent : t ? t.id : -1;
  }
  const spaced = (s) => s.toUpperCase().split('').join(' ').replace(/ {3}/g, '   ');

  UI.worldMap3D = function () {
    const P = G.P, P3 = Gfx.P3, V3 = UI.V3;
    const kit = V3 && V3.mapKit ? V3.mapKit() : null;
    if (!kit || !kit.FAR || !kit.FAR.h) return UI.worldMap2D();
    const HGT = UI.Hgt;
    const [hx, hz] = here();
    const known = (g) => !!(P.known.regions[g.id]);
    const seenR = (g) => !!(P.known.seen && P.known.seen[g.id]);
    const curG = G.W.regions[U.clamp(Math.floor(hz / MH), 0, WS - 1) * WS + U.clamp(Math.floor(hx / MW), 0, WS - 1)];
    const s = {
      name: 'map', full: true, cx: hx, cz: hz, D: 300, view: null, hover: null,
      draw(t) {
        const now = performance.now();
        // клетки над картой — без фона, иначе они закроют картинку
        t.fill(0, 1, t.cols, t.rows - 2, ' ', '#c8c8d0', null);
        t.fill(0, 0, t.cols, 1, ' ', '#c8c8d0', '#04060b'); t.fill(0, t.rows - 1, t.cols, 1, ' ', '#c8c8d0', '#04060b');
        const dpr = t.dpr || 1;
        const vx0 = 0, vy0 = t.ch, vw = t.cols * t.cw, vh = (t.rows - 2) * t.ch;
        const KP = Math.max(1, Math.round(vh * dpr / 620));
        const fw = Math.max(64, Math.ceil(vw * dpr / KP)), fh = Math.max(48, Math.ceil(vh * dpr / KP));
        const dw = fw * KP / dpr, dh = fh * KP / dpr;
        s.cx = U.clamp(s.cx, 0, WS * MW); s.cz = U.clamp(s.cz, 0, WS * MH);
        const RO = [Math.floor(s.cx / 64) * 64, Math.floor(s.cz / 64) * 64];
        const gy = Math.max(0, HGT.far(s.cx, s.cz));
        const cam = { x: s.cx - RO[0], y: gy + s.D * Math.sin(PHI), z: s.cz - RO[1] + s.D * Math.cos(PHI), yaw: 0, pitch: -PHI, fov: FOV };
        // свет — как ясным днём, но приглушённый и холодный: карта, а не погода
        const day = Math.floor(G.S.time / 1440) * 1440 + 13 * 60;
        const sky = Object.assign({}, kit.skyOf(G.map.kind === 'over' ? G.map : { outdoor: true }, { time: day, outdoor: true, dim: null, weather: null, season: E.Gm.season(), cold: false, fullMoon: false, nightland: false }));
        sky.fog = [0.02, 0.03, 0.06]; sky.fogSun = sky.fog; sky.hor = sky.fog; sky.zen = [0.01, 0.015, 0.03];
        sky.fogD = 0.45 / (s.D * 2.2 + 200);
        sky.amb = sky.amb.map((v, i) => v * [0.62, 0.7, 0.85][i]); sky.sun = sky.sun.map((v, i) => v * [0.55, 0.6, 0.72][i]);
        const frame = {
          w: fw, h: fh, time: now / 1000, cam, sky, lights: [], meshes: [], bills: [], dyn: null, wx: null, near: null, hide: null,
          far: { h: kit.FAR.h, off: [-RO[0], 0, -RO[1]] }, farClip: s.D * 4 + 600, shadow: null,
        };
        const gcv = P3.render(frame);
        const proj = (x, y, z) => { const p = P3.project(x - RO[0], y, z - RO[1]); return p ? [vx0 + p[0] / fw * dw, vy0 + p[1] / fh * dh] : null; };
        const hAt = (x, z) => Math.max(0, HGT.far(x, z));
        s.view = { vx0, vy0, vw, vh, fw, fh, dw, dh, RO };
        // что под мышью
        const mp = UI.vcur || UI.mpx;
        s.hover = null;
        if (mp && mp[1] > vy0 && mp[1] < vy0 + vh) {
          const r = P3.ray((mp[0] - vx0) / dw * fw, (mp[1] - vy0) / dh * fh);
          if (r) {
            const l = Math.hypot(...r.d), d = r.d.map((q) => q / l);
            for (let k = 0, st = Math.max(1, s.D / 200); k < 2400; k++) {
              const tt = k * st, x = r.o[0] + d[0] * tt + RO[0], y = r.o[1] + d[1] * tt, z = r.o[2] + d[2] * tt + RO[1];
              if (y <= hAt(x, z)) { const rx = Math.floor(x / MW), ry = Math.floor(z / MH); if (rx >= 0 && ry >= 0 && rx < WS && ry < WS) s.hover = G.W.regions[ry * WS + rx]; break; }
            }
          }
        }
        t.under = (ctx) => {
          ctx.save();
          ctx.beginPath(); ctx.rect(vx0, vy0, vw, vh); ctx.clip();
          ctx.imageSmoothingEnabled = false;
          if (gcv) ctx.drawImage(gcv, vx0, vy0, dw, dh);
          // туман над неизведанным: где не был — темно, что видел издалека — полутьма
          for (const g of G.W.regions) {
            if (g === curG || known(g)) continue;
            const a = seenR(g) ? 0.5 : 0.9;
            const x0 = g.x * MW, z0 = g.y * MH, pts = [];
            for (const [ax, az] of [[x0, z0], [x0 + MW, z0], [x0 + MW, z0 + MH], [x0, z0 + MH]]) { const p = proj(ax, hAt(ax, az), az); if (!p) { pts.length = 0; break; } pts.push(p); }
            if (pts.length < 4) continue;
            ctx.fillStyle = 'rgba(3,4,8,' + a + ')'; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); ctx.stroke();
          }
          // границы: между герцогствами — толстая бурая «кирпичная» полоса, между графствами — тонкий пунктир
          const edge = (ax, az, bx, bz, thick) => {
            const pts = [];
            for (let k = 0; k <= 6; k++) { const x = ax + (bx - ax) * k / 6, z = az + (bz - az) * k / 6, p = proj(x, hAt(x, z) + 0.3, z); if (p) pts.push(p); }
            if (pts.length < 2) return;
            const line = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); };
            const k = U.clamp(300 / s.D, 0.6, 2.2);
            if (thick) {
              ctx.setLineDash([]); ctx.strokeStyle = 'rgba(20,6,2,0.85)'; ctx.lineWidth = 7 * k; line();
              ctx.setLineDash([6 * k, 2 * k]); ctx.strokeStyle = '#a5502f'; ctx.lineWidth = 5 * k; line();
              ctx.setLineDash([2 * k, 6 * k]); ctx.lineDashOffset = 4 * k; ctx.strokeStyle = '#c86a42'; ctx.lineWidth = 2 * k; line(); ctx.lineDashOffset = 0;
            } else { ctx.setLineDash([3 * k, 4 * k]); ctx.strokeStyle = 'rgba(200,140,90,0.55)'; ctx.lineWidth = 1.4 * k; line(); }
            ctx.setLineDash([]);
          };
          for (const g of G.W.regions) {
            if (g.biome === 'ocean') continue;
            for (const [dx, dy] of [[1, 0], [0, 1]]) {
              if (g.x + dx >= WS || g.y + dy >= WS) continue;
              const h = G.W.regions[(g.y + dy) * WS + g.x + dx];
              if (h.biome === 'ocean') continue;
              if (!(known(g) || known(h) || g === curG || h === curG)) continue;
              const ta = topOf(g), tb = topOf(h);
              if (ta < 0 && tb < 0) continue;
              const x0 = dx ? (g.x + 1) * MW : g.x * MW, z0 = dy ? (g.y + 1) * MH : g.y * MH;
              if (ta !== tb) edge(x0, z0, dx ? x0 : x0 + MW, dy ? z0 : z0 + MH, true);
              else if (countyOf(g) !== countyOf(h) && s.D < 700) edge(x0, z0, dx ? x0 : x0 + MW, dy ? z0 : z0 + MH, false);
            }
          }
          const fpx = t.fpx || 14;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const lab = (txt, x, y, font, fg, lw) => { ctx.font = font; ctx.lineWidth = lw || 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(txt, x, y); ctx.fillStyle = fg; ctx.fillText(txt, x, y); };
          // подписи не налезают друг на друга: важные ставятся первыми, остальные — если есть место
          const used = [];
          const fits = (txt, x, y, font, pad) => {
            ctx.font = font; const w = ctx.measureText(txt).width + (pad || 4), h = (+((font.match(/(\d+)px/) || [0, 14])[1])) * 0.85;
            const r = [x - w / 2, y - h / 2, w, h];
            if (used.some((u) => r[0] < u[0] + u[2] && u[0] < r[0] + r[2] && r[1] < u[1] + u[3] && u[1] < r[1] + r[3])) return false;
            used.push(r); return true;
          };
          const pH = proj(hx, hAt(hx, hz) + 0.5, hz);
          if (pH) { fits('@', pH[0], pH[1], '700 ' + Math.round(fpx * 1.2) + 'px x'); fits(P.name || 'ты', pH[0], pH[1] - fpx * 1.2, '600 ' + Math.round(fpx * 0.8) + 'px x'); }
          // поселения: знак и имя
          const sorted = G.W.settlements.slice().sort((a, b) => ({ capital: 0, town: 1 }[a.type] ?? 2) - ({ capital: 0, town: 1 }[b.type] ?? 2));
          for (const st of sorted) {
            if (st.type === 'vanish') continue;
            const g = G.W.regions[st.region];
            if (!g || (!known(g) && g !== curG && !seenR(g))) continue;
            const x = g.x * MW + MW / 2, z = g.y * MH + MH / 2, p = proj(x, hAt(x, z) + 1, z);
            if (!p || p[0] < vx0 - 50 || p[0] > vx0 + vw + 50 || p[1] < vy0 || p[1] > vy0 + vh) continue;
            const dead = G.S.sett[st.id] && G.S.sett[st.id].destroyed;
            const sym = dead ? '×' : st.type === 'capital' ? '◆' : st.type === 'town' ? '■' : '▪';
            const big = st.type === 'capital' || st.type === 'town';
            const f1 = '700 ' + Math.round(fpx * (big ? 1.1 : 0.85)) + 'px ' + t.family, f2 = (big ? '600 ' : '') + Math.round(fpx * (big ? 0.78 : 0.66)) + 'px ' + t.family;
            if (fits(sym, p[0], p[1], f1, 2)) lab(sym, p[0], p[1], f1, dead ? '#9a7070' : '#f0d898', 3);
            const nm = spaced(st.nom);
            if ((big || s.D < 420) && fits(nm, p[0], p[1] - fpx * 1.05, f2, fpx * 1.6)) lab(nm, p[0], p[1] - fpx * 1.05, f2, known(g) ? '#e8e2d2' : '#8a90a0', 3);
          }
          // названия земель (герцогств) — крупно, разреженно, бледно
          if (s.D > 180 && G.W.titles) {
            const acc = new Map();
            for (const g of G.W.regions) { if (!known(g) && g !== curG) continue; const tp = topOf(g); if (tp < 0) continue; const a = acc.get(tp) || [0, 0, 0]; a[0] += g.x * MW + MW / 2; a[1] += g.y * MH + MH / 2; a[2]++; acc.set(tp, a); }
            for (const [tp, a] of acc) {
              const ti = G.W.titles[tp], x = a[0] / a[2], z = a[1] / a[2], p = proj(x, hAt(x, z) + 2, z);
              if (!p || !ti) continue;
              const f3 = '600 ' + Math.round(fpx * 0.95) + 'px ' + t.family, nm = spaced(ti.name || '');
              if (fits(nm, p[0], p[1] - fpx * 1.4, f3, 10)) lab(nm, p[0], p[1] - fpx * 1.4, f3, 'rgba(232,190,120,0.62)', 3);
            }
          }
          // ты: золотое «@», кольцо и имя
          const ph = proj(hx, hAt(hx, hz) + 0.5, hz);
          if (ph) {
            const pul = 0.5 + 0.5 * Math.sin(now / 300);
            ctx.strokeStyle = 'rgba(255,214,100,' + (0.35 + 0.4 * pul) + ')'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(ph[0], ph[1], 7 + pul * 5, 0, Math.PI * 2); ctx.stroke();
            lab('@', ph[0], ph[1], '700 ' + Math.round(fpx * 1.2) + 'px ' + t.family, '#ffd860', 3);
            lab(P.name || 'ты', ph[0], ph[1] - fpx * 1.2, '600 ' + Math.round(fpx * 0.8) + 'px ' + t.family, '#ffe8a0', 3);
          }
          // земля под мышью — рамкой
          if (s.hover) {
            const g = s.hover, x0 = g.x * MW, z0 = g.y * MH, pts = [];
            for (const [ax, az] of [[x0, z0], [x0 + MW, z0], [x0 + MW, z0 + MH], [x0, z0 + MH]]) { const p = proj(ax, hAt(ax, az) + 0.4, az); if (p) pts.push(p); }
            if (pts.length === 4) { ctx.strokeStyle = 'rgba(240,230,200,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); }
          }
          // тёмные края
          const vg = ctx.createRadialGradient(vx0 + vw / 2, vy0 + vh / 2, Math.min(vw, vh) * 0.35, vx0 + vw / 2, vy0 + vh / 2, Math.hypot(vw, vh) * 0.6);
          vg.addColorStop(0, 'rgba(2,3,6,0)'); vg.addColorStop(1, 'rgba(2,3,6,0.7)');
          ctx.fillStyle = vg; ctx.fillRect(vx0, vy0, vw, vh);
          ctx.restore();
          // тонкая рамка
          ctx.strokeStyle = 'rgba(200,200,215,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(vx0 + 0.5, vy0 + 0.5, vw - 1, vh - 1);
        };
        // сверху — что под мышью; снизу — обозначения
        const g = s.hover || curG;
        let info = '';
        if (g) {
          if (known(g) || g === curG) {
            info = g.name + ' — ' + D.biomes[g.biome].n;
            if (g.settlement >= 0) { const st = G.W.settlements[g.settlement]; info += ' · ' + st.nom + (G.S.sett[st.id] && G.S.sett[st.id].destroyed ? ' (руины)' : ''); }
            const tp = topOf(g); if (tp >= 0 && G.W.titles[tp]) info += ' · ' + G.W.titles[tp].name;
          } else info = seenR(g) ? D.biomes[g.biome].n + ' — видно издалека, ты там не был[|а]' : 'Неизведанные земли';
        }
        t.text(1, 0, E.Gm.fmt(info), '#e8dcc0', '#04060b', t.cols - 2);
        const leg = t.cols > 150 ? '◆ столица  ■ город  ▪ деревня  × руины  @ ты  ━ граница герцогства  ┄ графства · колесо — масштаб · тянуть — двигать · 2×щелчок или Пробел — к себе · Esc — закрыть'
          : '◆ столица ■ город ▪ деревня × руины @ ты ━ граница · колесо — масштаб · тянуть — двигать · Пробел — к себе · Esc';
        t.text(1, t.rows - 1, leg, '#8f96a8', '#04060b', t.cols - 2);
        UI.animUntil = Math.max(UI.animUntil || 0, now + 120);
      },
      wheel(dy) { s.D = U.clamp(s.D * (dy > 0 ? 1.15 : 1 / 1.15), 45, 1400); UI.render(); },
      drag(dx, dy) {
        const v = s.view; if (!v) return;
        const k = (2 * s.D * Math.tan(FOV / 2)) / v.vh;
        s.cx -= dx * k; s.cz -= dy * k / Math.sin(PHI);
        UI.render();
      },
      dbl() { const h = here(); s.cx = h[0]; s.cz = h[1]; UI.render(); },
      key(c) {
        const st = s.D * 0.12;
        if (c.k === 'left') s.cx -= st; else if (c.k === 'right') s.cx += st;
        else if (c.k === 'up') s.cz -= st; else if (c.k === 'down') s.cz += st;
        else if (c.k === 'zin') s.wheel(-1);
        else if (c.k === 'zout') s.wheel(1);
        else if (c.k === 'wait' || c.k === 'enter' || c.k === 'home' || c.k === 'jump') s.dbl();
        else if (c.k === 'esc' || c.k === 'map') UI.pop();
      },
    };
    UI.push(s);
  };
})(window.EOF);
