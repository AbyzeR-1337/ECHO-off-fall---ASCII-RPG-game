'use strict';
// Интерфейс: стек экранов, отрисовка мира, общие виджеты.
(function (E) {
  const U = E.U, D = E.D, T = E.T, TL = E.TL, Time = E.Time, C = E.C;
  const G = E.G;
  const UI = E.UI = { stack: [], t: null, dirty: true };
  const COL = UI.COL = {
    bg: '#0b0a0f', panel: '#121019', border: '#4a4458', text: '#c8c8c8', dim: '#7a7a88', faint: '#4a4a56', title: '#e8d8a8', accent: '#f0c060',
    hp: '#d04848', mp: '#4878d0', food: '#c09040', xp: '#9090e0', good: '#80d080', bad: '#e07070', sel: '#2a2438', selfg: '#fff0c0',
  };
  UI.push = function (s) { UI.stack.push(s); if (s.open) s.open(); UI.dirty = true; UI.render(); return s; };
  UI.pop = function () { const s = UI.stack.pop(); if (s && s.close) s.close(); UI.dirty = true; UI.render(); return s; };
  UI.top = () => UI.stack[UI.stack.length - 1];
  UI.replace = function (s) { UI.stack.pop(); return UI.push(s); };
  UI.closeAll = function () { while (UI.stack.length > 1 && UI.top().name !== 'game') UI.stack.pop(); UI.dirty = true; UI.render(); };
  UI.render = function () {
    const t = UI.t;
    if (!t) return;
    t.clear(null);
    // рисуем снизу вверх: нижний «полноэкранный» и всё, что над ним
    let start = 0;
    for (let i = UI.stack.length - 1; i >= 0; i--) if (UI.stack[i].full) { start = i; break; }
    for (let i = start; i < UI.stack.length; i++) UI.stack[i].draw(t, i === UI.stack.length - 1);
    t.render();
    const inp = document.getElementById('nameInput');
    if (inp && UI.top() && UI.top().name !== 'create' && inp.style.display !== 'none') { inp.style.display = 'none'; inp.blur(); }
    UI.dirty = false;
  };
  UI.key = function (cmd) {
    const s = UI.top();
    if (!s) return;
    if (UI.auto) { UI.auto = null; }
    s.key(cmd);
    UI.render();
  };

  // ---------- полосы и текст ----------
  UI.bar = function (t, x, y, w, v, max, col, label) {
    const n = Math.max(0, Math.min(w, Math.round(w * v / Math.max(1, max))));
    for (let i = 0; i < w; i++) t.put(x + i, y, i < n ? '█' : '░', i < n ? col : U.shade(col, 0.35));
    if (label) t.text(x + w + 1, y, label, COL.text);
  };
  UI.wrapText = function (t, x, y, w, text, fg, maxLines) {
    const lines = U.wrap(text, w);
    let k = 0;
    for (const l of lines) { if (maxLines && k >= maxLines) break; t.rich(x, y + k, l, fg || COL.text, w); k++; }
    return k;
  };

  // ---------- раскладка экрана игры ----------
  UI.layout = function (t) {
    const wide = t.cols >= 92 && t.rows >= 26;
    if (wide) {
      const sw = t.cols >= 120 ? 34 : 30;
      const lr = U.clamp(Math.floor(t.rows * 0.2), 5, 10);
      return { wide, top: 0, mx: 0, my: 1, mw: t.cols - sw, mh: t.rows - 1 - lr, sx: t.cols - sw, sw, lx: 0, ly: t.rows - lr, lw: t.cols - sw, lh: lr };
    }
    const lr = t.rows >= 34 ? 6 : 4;
    const st = 3;
    return { wide, top: 0, mx: 0, my: 1, mw: t.cols, mh: t.rows - 1 - st - lr, sx: 0, sw: t.cols, sy: t.rows - st - lr, lx: 0, ly: t.rows - lr, lw: t.cols, lh: lr };
  };

  // ---------- автотайлы стен ----------
  const SINGLE = ['■', '│', '─', '└', '│', '│', '┌', '├', '─', '┘', '─', '┴', '┐', '┤', '┬', '┼'];
  const DOUBLE = ['■', '║', '═', '╚', '║', '║', '╔', '╠', '═', '╝', '═', '╩', '╗', '╣', '╦', '╬'];
  function autoChar(m, x, y, tt) {
    // соединяемся только с «открытыми» стенами — внутренняя толща не рисуется зубцами
    const open = (xx, yy) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const a = xx + dx, b = yy + dy;
        if (a < 0 || b < 0 || a >= m.w || b >= m.h) continue;
        const o = TL[m.tiles[b * m.w + a]];
        if (!o.auto && !o.conn) return true;
      }
      return false;
    };
    const conn = (xx, yy) => {
      if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) return false;
      const o = TL[m.tiles[yy * m.w + xx]];
      if (o.conn) return true;
      return !!o.auto && open(xx, yy);
    };
    let k = 0;
    if (conn(x, y - 1)) k |= 1;
    if (conn(x + 1, y)) k |= 2;
    if (conn(x, y + 1)) k |= 4;
    if (conn(x - 1, y)) k |= 8;
    return (tt.auto === 2 ? DOUBLE : SINGLE)[k];
  }

  // ---------- освещение ----------
  const q = (v) => Math.round(v * 20) / 20;
  function lit(fg, m, d, r, L, outdoor) {
    if (!fg) return fg;
    let c = fg;
    if (outdoor) {
      const night = 1 - L;
      if (night > 0.05) c = U.mixc(c, '#1a2648', q(night * 0.5));
      const fall = d > r * 0.55 ? q(Math.min(0.6, (d - r * 0.55) / (r * 0.6 + 1) * night)) : 0;
      if (fall > 0) c = U.shade(c, q(1 - fall));
    } else {
      const k = q(Math.max(0.35, 1 - d / (r + 1.5) * 0.75));
      c = U.shade(c, k);
      if (d <= 2) c = U.mixc(c, '#ffc080', 0.1);
    }
    if (m.tint === 'night') c = U.mixc(c, '#6a78d0', 0.35);
    else if (m.tint === 'mirror') c = U.mixc(U.gray(c, 0.7), '#b8d0f0', 0.25);
    else if (m.tint === 'abyss') c = U.mixc(c, '#902040', 0.3);
    return c;
  }
  const itemGlyph = { weapon: [')', '#c0c0d0'], armor: ['[', '#b0a090'], food: ['%', '#d0a060'], potion: ['!', '#e06090'], book: ['?', '#d0c090'], gold: ['$', '#f0d040'], trinket: ['"', '#e0c070'], tool: ['(', '#a09080'], misc: ['*', '#b0b0c0'], mat: ['•', '#a0a0a0'], art: ['*', '#b0b0c0'] };
  UI.itemGlyph = (it) => {
    const t = it.t || (D.items[it.b] && D.items[it.b].t) || 'misc';
    return itemGlyph[t] || itemGlyph.misc;
  };

  // ---------- карта ----------
  UI.camera = function (L) {
    const m = G.map, P = G.P;
    let cx, cy;
    if (m.w <= L.mw) cx = -Math.floor((L.mw - m.w) / 2); else cx = U.clamp(P.x - (L.mw >> 1), 0, m.w - L.mw);
    if (m.h <= L.mh) cy = -Math.floor((L.mh - m.h) / 2); else cy = U.clamp(P.y - (L.mh >> 1), 0, m.h - L.mh);
    return [cx, cy];
  };
  // вид карты: рисованный ASCII 2.5D (движок js/gfx) или классический плоский; выбор помнится в этом браузере
  // Уровень графики — ползунок от классического ASCII до «почти реальности» (но всё равно символами):
  // 0 — символы, 1 — рисунок, 2 — свет и тень, 3 — объём, 4 — детально, 5 — почти реальность.
  UI.GFX = [
    ['Символы', 'Классический ASCII: одна клетка — один знак.'],
    ['Рисунок', 'Каждая вещь и существо нарисованы несколькими символами, стены и крыши — объёмные.'],
    ['Свет и тень', 'Рисунки плюс тени от солнца, бегущие облака, затенение у стен и тёплый вечерний свет.'],
    ['Объём', 'Мир считается как картинка: материалы, объёмные фигуры, солнце, тени и огни — и потом переводится в символы.'],
    ['Детально', 'Символы мельче, деталей больше: блики и рябь на воде, ветер в траве, облака, мягкие тени.'],
    ['Почти реальность', 'Самые мелкие символы и все эффекты. Тяжелее для слабых устройств.'],
  ];
  UI.gfxLevel = (() => {
    try {
      const v = localStorage.getItem('eotf_gfx');
      if (v != null && /^[0-5]$/.test(v)) return +v;
      if (localStorage.getItem('eotf_view') === 'flat') return 0;
    } catch (e) { /* без хранилища — выберем по экрану */ }
    return null;
  })();
  Object.defineProperty(UI, 'view3d', { get: () => UI.gfxLevel > 0 });
  UI.setGfx = function (lv, quiet) {
    UI.gfxLevel = U.clamp(lv, 0, 5);
    try { localStorage.setItem('eotf_gfx', String(UI.gfxLevel)); } catch (e) { /* только на эту сессию */ }
    if (!quiet && E.G.P) E.Gm.msg('Графика: ' + UI.GFX[UI.gfxLevel][0] + '.', '#808090');
    UI.render();
  };
  UI.setView = (d3) => UI.setGfx(d3 ? Math.max(1, UI._lastGfx || 4) : 0);
  UI.drawMap = function (t, L) {
    const m = G.map, P = G.P;
    if (!m) return;
    const clip = { x: L.mx * t.cw, y: L.my * t.ch, w: L.mw * t.cw, h: L.mh * t.ch };
    let rect;
    if (UI.gfxLevel == null) UI.gfxLevel = L.wide ? 4 : 3;
    if (UI.gfxLevel > 0) UI._lastGfx = UI.gfxLevel;
    if (UI.view3d) { UI.drawMapGfx(t, L); rect = UI.mvRect; }
    else {
      UI.drawMapFlat(t, L);
      const [cx, cy] = UI.cam;
      rect = (x, y) => ({ x: (L.mx + x - cx) * t.cw, y: (L.my + y - cy) * t.ch, w: t.cw, h: t.ch });
    }
    // подсказки [E] — только когда поверх карты ничего не открыто
    const hints = UI.top() && UI.top().name === 'game' ? E.Gm.useHints() : [];
    UI.syncAct(hints.some((o) => o.main));
    if (hints.length) {
      const list = hints.map((o) => ({ x: o.x, y: o.y, main: o.main, dy: o.y - P.y, self: o.x === P.x && o.y === P.y, tall: UI.view3d && UI.tallAt(o.x, o.y) }));
      t.over = (ctx, tt) => UI.drawBadges(ctx, tt, list, rect, clip);
    }
    t.hot(L.mx, L.my, L.mw, L.mh, (h, cx2, cy2, btn, px, py) => {
      if (UI.view3d && px != null) { const p = UI.mvTileAt(px, py); if (p) UI.mapClick(p[0], p[1], btn); return; }
      const [cx, cy] = UI.cam;
      UI.mapClick(cx2 - L.mx + cx, cy2 - L.my + cy, btn);
    });
  };
  UI.drawMapFlat = function (t, L) {
    const m = G.map, P = G.P;
    const [cx, cy] = UI.camera(L);
    UI.cam = [cx, cy, L];
    const Lt = Time.light(G.S.time);
    const outdoorMap = m.outdoor;
    const r = E.Gm.fovRadius();
    const items = new Map();
    for (const o of m.items) items.set(o.y * m.w + o.x, o.it);
    const w = E.Gm.weather();
    const reveal = G.revealUntil && G.turn < G.revealUntil;
    const now = performance.now();
    const flash = G.fxFlash && now - G.fxFlash.t < 350 ? G.fxFlash : null;
    const storm = (w === 'storm' && Math.random() < 0.012) || (G.flashSky && now - G.flashSky < 120);
    if (storm && !G.flashSky) G.flashSky = now;
    if (G.flashSky && now - G.flashSky > 120) G.flashSky = 0;
    for (let vy = 0; vy < L.mh; vy++) for (let vx = 0; vx < L.mw; vx++) {
      const mx = cx + vx, my = cy + vy;
      if (mx < 0 || my < 0 || mx >= m.w || my >= m.h) continue;
      const i = my * m.w + mx;
      const vis = G.vis[i], ex = m.ex[i];
      const sx = L.mx + vx, sy = L.my + vy;
      if (!vis && !ex) {
        if (reveal) { const e = m.occ.get(i); if (e && e.kind !== 'npc') t.put(sx, sy, e.ch, '#604060'); }
        continue;
      }
      const tid = m.tiles[i];
      const tt = TL[tid];
      let ch = tt.auto ? autoChar(m, mx, my, tt) : tt.ch;
      let fg = tt.fg, bg = tt.bg;
      if (tid === T.WINDOW) fg = '#80b8d0';
      if (tid === T.FIELD && E.Gm.season() === 3) { ch = '·'; fg = '#8a7a5a'; }
      if ((tid === T.GRASS || tid === T.TALLGRASS) && E.Gm.season() === 3 && m.region && m.region.t < 0.55 && outdoorMap) fg = '#a8b8b8';
      if (tid === T.GRASS && E.Gm.season() === 2 && m.biome !== 'desert') fg = '#8a8a3c';
      if (m.region && E.G.S.infect[m.region.id] && (tid === T.GRASS || tid === T.TALLGRASS) && (mx * 7 + my * 13) % 9 === 0) { ch = 'τ'; fg = '#b070d0'; }
      if (tt.water && (tid === T.WATER || tid === T.SHALLOW) && vis && ((mx + my + Math.floor(now / 700)) % 7 === 0)) ch = tid === T.WATER ? '~' : '≈';
      if (tid === T.LAVA && vis && (mx * 3 + my + Math.floor(now / 400)) % 5 === 0) fg = '#ffb040';
      if (tid === T.CAMPFIRE || tid === T.HEARTH) fg = ['#ff9a3a', '#ffcf5a', '#ff7a2a'][Math.floor(now / 200 + mx) % 3];
      if (!vis) {
        fg = U.mixc(U.gray(fg || '#888888', 0.85), '#202030', 0.55);
        bg = bg ? U.shade(bg, 0.4) : null;
        t.put(sx, sy, ch, fg, bg);
        continue;
      }
      const d = Math.max(Math.abs(mx - P.x), Math.abs(my - P.y));
      const indoorTile = !!tt.indoor;
      fg = lit(fg, m, d, r, Lt, outdoorMap && !indoorTile);
      if (bg) bg = lit(bg, m, d, r, Lt, outdoorMap && !indoorTile);
      // погода
      if (outdoorMap && !indoorTile && !tt.indoor) {
        const h = (mx * 73856093 ^ my * 19349663 ^ Math.floor(now / 160)) >>> 0;
        if ((w === 'rain' || w === 'storm') && h % 37 === 0) { ch = h % 2 ? '\'' : ','; fg = '#6a8ac8'; }
        else if ((w === 'snow' || w === 'blizzard') && h % (w === 'blizzard' ? 9 : 29) === 0) { ch = '*'; fg = '#e8f0ff'; }
        else if (w === 'blacksnow' && h % 23 === 0) { ch = '*'; fg = '#404048'; }
        else if (w === 'ashrain' && h % 21 === 0) { ch = '.'; fg = '#909090'; }
        else if (w === 'sandstorm' && h % 11 === 0) { ch = '~'; fg = '#d0b070'; }
      }
      if (storm && outdoorMap) { bg = '#2a2a40'; fg = U.mixc(fg, '#ffffff', 0.4); }
      // предметы
      const it = items.get(i);
      if (it) { const g = UI.itemGlyph(it); ch = g[0]; fg = lit(g[1], m, d, r, Lt, outdoorMap); }
      // существа
      const e = m.occ.get(i);
      if (e && !e.dead) {
        ch = e.ch;
        fg = e.c;
        if (e.kind === 'npc' && e.hostile) fg = '#ff7060';
        if (e.ally) fg = '#90f090';
        if (e.asleep) fg = U.shade(e.c, 0.6);
        if (e.kind === 'boss') bg = '#3a0c10';
        if (Lt < 0.5 && outdoorMap) fg = U.mixc(fg, '#30406a', 0.25);
      }
      if (flash && Math.max(Math.abs(mx - flash.x), Math.abs(my - flash.y)) <= flash.r) bg = flash.el === 'fire' ? '#5a2008' : flash.el === 'ice' ? '#10304a' : flash.el === 'holy' ? '#4a4420' : flash.el === 'void' ? '#20103a' : '#3a3a3a';
      t.put(sx, sy, ch, fg, bg);
    }
    // игрок
    const hit = G.hitFlash && now - G.hitFlash < 160;
    t.put(L.mx + P.x - cx, L.my + P.y - cy, '@', hit ? '#ff4040' : '#fff6d0', hit ? '#401010' : '#2a2618');
  };

  // ---------- верхняя строка ----------
  UI.drawTop = function (t, L) {
    const m = G.map, S = G.S;
    t.fill(0, 0, t.cols, 1, ' ', COL.text, '#16131e');
    let place;
    if (m.kind === 'over') {
      const g = m.region;
      place = m.nightland ? (g.nightName || 'Ночные земли') : m.key.endsWith(':c') ? (g.cycName || g.name) : m.key.endsWith(':i') ? 'Безымянный остров' : g.name;
      if (m.sett >= 0) place = (S.sett[m.sett].destroyed ? 'Руины. ' : '') + G.W.settlements[m.sett].nom + ' · ' + place;
    } else if (m.kind === 'dun') place = (m.dtype === 'abyss' && m.depth >= 10 ? 'Бездна' : 'Под землёй') + ', уровень ' + m.depth;
    else place = D.dims[m.dimName] ? D.dims[m.dimName].n : '...';
    const time = Time.fmt(S.time) + ' ' + Time.dayWord(S.time);
    const date = Time.date(S.time);
    const w = E.Gm.weather();
    const wn = w !== 'none' && D.weathers[w] ? D.weathers[w].n : '';
    const moon = ['●', '◑', '○', '◐'][Math.floor(Time.moon(S.time) / 7)];
    let s = ' ' + place;
    const right = time + ' · ' + date + (wn ? ' · ' + wn : '') + ' ' + moon + ' ';
    if (L.wide) { t.text(0, 0, s, COL.title, '#16131e', t.cols - right.length - 1); t.text(t.cols - right.length, 0, right, COL.dim, '#16131e'); }
    else { t.text(0, 0, s, COL.title, '#16131e', t.cols - 13); t.text(t.cols - 12, 0, Time.fmt(S.time) + ' ' + moon + ' ', COL.dim, '#16131e'); }
  };

  // ---------- боковая панель ----------
  UI.clsLabel = function () {
    const P = G.P;
    if (!P.cls) return 'Никто';
    return D.classes[P.cls].n + ' ' + U.roman(P.rank[P.cls] || 1);
  };
  UI.drawSide = function (t, L) {
    const P = G.P, m = G.map;
    if (!L.wide) return UI.drawStatusNarrow(t, L);
    const x = L.sx, w = L.sw;
    t.fill(x, 1, w, t.rows - 1, ' ', COL.text, COL.panel);
    for (let y = 1; y < t.rows; y++) t.put(x, y, '│', COL.border, COL.panel);
    let y = 1;
    const X = x + 2, IW = w - 3;
    t.text(X, y++, U.pad(P.name, IW), COL.title, COL.panel);
    t.text(X, y++, (P.level >= 999 ? 'Ур. —' : 'Ур. ' + P.level) + '  ' + UI.clsLabel(), COL.dim, COL.panel, IW);
    y++;
    const bw = IW - 12;
    t.text(X, y, 'Здоровье', COL.dim, COL.panel); UI.bar(t, X + 9, y, bw, P.hp, P.mhp, COL.hp); t.text(X + 9 + bw + 1, y++, String(Math.ceil(P.hp)), COL.text, COL.panel);
    t.text(X, y, 'Дух', COL.dim, COL.panel); UI.bar(t, X + 9, y, bw, P.mp, P.mmp, COL.mp); t.text(X + 9 + bw + 1, y++, String(Math.floor(P.mp)), COL.text, COL.panel);
    t.text(X, y, 'Сытость', COL.dim, COL.panel); UI.bar(t, X + 9, y, bw, P.hunger, 100, COL.food); y++;
    if (P.level < 999) { t.text(X, y, 'Опыт', COL.dim, COL.panel); UI.bar(t, X + 9, y, bw, P.xp, E.Gm.need(P.level), COL.xp); y++; }
    if (P.shield > 0) t.text(X, y++, 'Щит: ' + P.shield, '#a0c0ff', COL.panel);
    y++;
    const st = P.st;
    t.text(X, y++, 'Сил ' + U.pad(st.str, 3) + 'Лов ' + U.pad(st.dex, 3) + 'Стк ' + st.con, COL.text, COL.panel, IW);
    t.text(X, y++, 'Раз ' + U.pad(st.int, 3) + 'Вер ' + U.pad(st.fai, 3) + 'Уд  ' + st.luck, COL.text, COL.panel, IW);
    if (P.level >= 100) t.text(X, y++, 'Воля ' + U.pad(st.wil, 3) + 'Резонанс ' + st.res, '#d0c0ff', COL.panel, IW);
    t.text(X, y++, 'Защита ' + st.def + '   Монет ' + P.gold, COL.dim, COL.panel, IW);
    if (P.pts > 0) t.text(X, y++, '(+' + P.pts + ' очк. — окно персонажа)', COL.accent, COL.panel, IW);
    y++;
    const hand = P.eq.hand;
    t.text(X, y++, 'В руке: ' + (hand ? E.Items.name(hand) : 'ничего'), COL.text, COL.panel, IW);
    if (P.light > 0) t.text(X, y++, 'Факел: ' + Math.ceil(P.light / 60) + ' ч', '#ffc070', COL.panel, IW);
    const fx = P.fx.filter((f) => D.effects[f.id]);
    if (fx.length) {
      y++;
      for (const f of fx.slice(0, 5)) { const d = D.effects[f.id]; t.text(X, y++, '· ' + d.n, d.kind === 'curse' ? '#c080c0' : d.kind === 'bless' ? '#80c0f0' : '#c0a080', COL.panel, IW); }
      if (fx.length > 5) t.text(X, y++, '  …и ещё ' + (fx.length - 5), COL.dim, COL.panel);
    }
    // рядом
    const near = m.ents.filter((e) => G.vis[e.y * m.w + e.x] && !e.dead).sort((a, b) => U.dist(a.x, a.y, P.x, P.y) - U.dist(b.x, b.y, P.x, P.y));
    if (near.length && y < t.rows - 12) {
      y++;
      t.text(X, y++, 'Рядом:', COL.dim, COL.panel);
      for (const e of near.slice(0, Math.max(1, t.rows - y - 11))) {
        const lbl = e.npc != null ? E.Dlg.label(e) : U.cap(e.full || e.n);
        const hp = e.hp < e.mhp ? (e.hp < e.mhp * 0.3 ? ' (при смерти)' : e.hp < e.mhp * 0.7 ? ' (ранен)' : '') : '';
        t.put(X, y, e.ch, e.kind === 'npc' && e.hostile ? '#ff7060' : e.ally ? '#90f090' : e.c, COL.panel);
        t.text(X + 2, y++, lbl + hp + (e.asleep ? ' (спит)' : ''), e.hostile || e.hostileToP ? '#e0a0a0' : COL.text, COL.panel, IW - 2);
      }
    }
    // умения
    const ab = P.abil.slice(0, 9);
    if (ab.length) {
      let yy = Math.max(y + 1, t.rows - 1 - ab.length);
      if (yy + ab.length >= t.rows) yy = t.rows - ab.length - 1;
      t.hline(X - 1, yy - 1, IW + 1, COL.border, '─');
      ab.forEach((id, k) => {
        const a = D.ab[id];
        const cd = P.cd[id] || 0;
        const ok = cd <= 0 && P.mp >= a.cost;
        t.text(X, yy + k, (k + 1) + ' ' + U.pad(a.n, IW - 7) + (cd > 0 ? U.padl(cd, 4) : U.padl(a.cost, 4)), ok ? COL.text : COL.faint, COL.panel, IW);
        t.hot(X, yy + k, IW, 1, () => E.UI.useAbility(id));
      });
    }
  };
  UI.drawStatusNarrow = function (t, L) {
    const P = G.P;
    const y = L.sy;
    t.fill(0, y, t.cols, 3, ' ', COL.text, COL.panel);
    const bw = Math.max(6, Math.floor((t.cols - 24) / 3));
    t.text(0, y, (P.level >= 999 ? '—' : 'Ур' + P.level) + ' ' + UI.clsLabel(), COL.title, COL.panel, t.cols);
    t.text(0, y + 1, 'HP', COL.dim, COL.panel); UI.bar(t, 3, y + 1, bw, P.hp, P.mhp, COL.hp);
    t.text(4 + bw, y + 1, 'Дух', COL.dim, COL.panel); UI.bar(t, 8 + bw, y + 1, bw, P.mp, P.mmp, COL.mp);
    t.text(9 + bw * 2, y + 1, 'Еда', COL.dim, COL.panel); UI.bar(t, 13 + bw * 2, y + 1, Math.min(bw, t.cols - 14 - bw * 2), P.hunger, 100, COL.food);
    const near = G.map.ents.filter((e) => G.vis[e.y * G.map.w + e.x] && (e.hostile || e.hostileToP)).length;
    t.text(0, y + 2, Math.ceil(P.hp) + '/' + P.mhp + '  ' + P.gold + '$' + (near ? '  враги: ' + near : '') + (P.pts ? '  +' + P.pts + ' очк.' : ''), COL.dim, COL.panel, t.cols);
  };
  UI.drawLog = function (t, L) {
    const x = L.lx, y0 = L.ly, w = L.lw - 1, h = L.lh;
    t.fill(x, y0, L.lw, h, ' ', COL.text, '#0e0c14');
    t.hline(x, y0, L.lw, COL.border, '─');
    const lines = [];
    for (let i = G.log.length - 1; i >= 0 && lines.length < h - 1; i--) {
      const e = G.log[i];
      const s = e.s + (e.n > 1 ? ' (×' + e.n + ')' : '');
      const wl = U.wrap(s, w - 1);
      const old = G.turn - e.turn;
      const c = old > 0 ? U.shade(e.c, old > 3 ? 0.55 : 0.75) : e.c;
      for (let k = wl.length - 1; k >= 0 && lines.length < h - 1; k--) lines.push([wl[k], c]);
    }
    lines.reverse();
    lines.forEach((l, k) => t.text(x + 1, y0 + 1 + k, l[0], l[1], '#0e0c14', w));
  };

  // ---------- клик по карте ----------
  UI.mapClick = function (mx, my, btn) {
    const P = G.P, m = G.map;
    if (UI.top().name !== 'game' || P.dead || P.ended) return;
    if (mx < 0 || my < 0 || mx >= m.w || my >= m.h) return;
    if (btn === 2) { UI.describeAt(mx, my); return; }
    const d = U.dist(mx, my, P.x, P.y);
    if (d === 0) { E.Gm.interact(); UI.render(); return; }
    if (d === 1) { E.Gm.move(U.sign(mx - P.x), U.sign(my - P.y)); UI.render(); return; }
    if (!m.ex[my * m.w + mx]) return;
    UI.autoWalk(mx, my);
  };
  UI.autoWalk = function (tx, ty) {
    const P = G.P;
    const path = E.Ent.pathTo({ x: P.x, y: P.y }, tx, ty, 4000);
    if (!path || !path.length) { E.Gm.msg('Туда не пройти.'); UI.render(); return; }
    const token = {};
    UI.auto = token;
    const seen0 = UI.hostilesVisible();
    const step = () => {
      if (UI.auto !== token || !path.length || G.P.dead || G.P.ended || UI.top().name !== 'game') return;
      const [nx, ny] = path.shift();
      const key = G.map.key;
      const before = G.log.length;
      E.Gm.move(nx - G.P.x, ny - G.P.y);
      UI.render();
      if (G.map.key !== key) return;
      if (G.P.x !== nx || G.P.y !== ny) return;
      if (UI.hostilesVisible() > seen0) { E.Gm.msg('Ты замечаешь опасность.', '#ffb080'); UI.render(); return; }
      if (G.log.length > before && G.log[G.log.length - 1].c === '#ff8080') return;
      setTimeout(step, 45);
    };
    step();
  };
  UI.hostilesVisible = function () { const m = G.map; return m.ents.filter((e) => (e.hostile || e.hostileToP) && e.kind !== 'ally' && G.vis[e.y * m.w + e.x]).length; };
  UI.describeAt = function (x, y) {
    const m = G.map;
    const i = y * m.w + x;
    if (!G.vis[i] && !m.ex[i]) { E.Gm.msg('Ты не знаешь, что там.'); return; }
    const parts = [];
    const e = m.occ.get(i);
    if (e && G.vis[i]) {
      if (e.npc != null) { const n = E.Gm.npc(e.npc); parts.push(E.Gm.knows(e.npc) ? n.first + ' — ' + n.look : U.cap(n.look)); }
      else parts.push(U.cap(e.full || e.n) + (e.kind === 'boss' && e.lore ? '. ' + e.lore : ''));
    }
    const its = m.items.filter((o) => o.x === x && o.y === y);
    if (its.length && G.vis[i]) parts.push('На земле: ' + its.map((o) => E.Items.name(o.it.u ? o.it : (o.it.uq != null ? G.W.uniques[o.it.uq] : { n: (D.items[o.it.b] || {}).n || '?', q: o.it.q, b: o.it.b }))).join(', '));
    const f = m.feat[i];
    parts.push(U.cap(f && f.name ? f.name : TL[m.tiles[i]].name));
    E.Gm.msg(parts.join('. ') + '.', '#c0c0d0');
    UI.render();
  };

  // ---------- главный экран игры ----------
  UI.gameScreen = {
    name: 'game', full: true,
    draw(t) {
      if (!G.map || !G.P) return;
      const L = UI.layout(t);
      UI.drawTop(t, L);
      UI.drawMap(t, L);
      UI.drawSide(t, L);
      UI.drawLog(t, L);
    },
    key(c) {
      const P = G.P;
      if (!P || P.dead || P.ended) return;
      const dir = UI.dirOf(c);
      if (dir) { if (dir[0] === 0 && dir[1] === 0) { E.Gm.wait(); return; } E.Gm.move(dir[0], dir[1]); return; }
      switch (c.k) {
        case 'act': E.Gm.interact(); break;
        case 'inv': UI.inventory(); break;
        case 'char': UI.character(); break;
        case 'pray': UI.prayers(); break;
        case 'skills': UI.skills(); break;
        case 'map': UI.worldMap(); break;
        case 'mem': UI.memory(); break;
        case 'rest': UI.rest(); break;
        case 'fire': UI.fireCmd(); break;
        case 'look': UI.look(); break;
        case 'help': UI.help(); break;
        case 'esc': UI.pause(); break;
        case 'log': UI.logScreen(); break;
        case 'view': UI.gfxScreen(); break;
        case 'gdown': UI.setGfx((UI.gfxLevel || 0) - 1); break;
        case 'gup': UI.setGfx((UI.gfxLevel || 0) + 1); break;
        case 'zin': if (UI.view3d) UI.zoom(1); break;
        case 'zout': if (UI.view3d) UI.zoom(-1); break;
        default:
          if (c.n >= 1 && c.n <= 9) { const id = P.abil[c.n - 1]; if (id) UI.useAbility(id); }
      }
    },
  };
  UI.dirOf = function (c) {
    const m = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], ul: [-1, -1], ur: [1, -1], dl: [-1, 1], dr: [1, 1], wait: [0, 0], home: [-1, -1], pgup: [1, -1], end: [-1, 1], pgdn: [1, 1] };
    return m[c.k] || null;
  };
  E.Gm.wait = function () {
    const P = G.P;
    P.stillTurns = (P.stillTurns || 0) + 1;
    if (E.Gm.fullMoon() && E.Gm.night() && E.Gm.outdoors() && P.stillTurns === 10) { E.Gm.msg('Ты поднимаешь голову к луне. Из горла сам собой рвётся вой.', '#c0c8ff'); E.Gm.cnt('howls'); }
    E.Gm.endTurn(1);
    E.Gm.storyHook('hour', {});
  };
})(window.EOF);
