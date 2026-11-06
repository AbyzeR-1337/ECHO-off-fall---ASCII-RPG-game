'use strict';
// Боковая панель и оформление.
// Тема: у каждого народа — свои цвета рамок, заголовков и акцента (эльфы — зелень и серебро,
// гномы — бронза, тифлинги — багрянец, коровьи девы — луговая зелень и золото колокольчика,
// фембои — пастель…); время года подмешивает свой оттенок, а место — своё: в подземелье холодный
// камень, ночью синева, в пустыне песок, в снегах лёд, в болотах зелень, в иных мирах — лиловое.
// Панель: портрет героя с настроением, полосы (здоровье, дух, сытость, жажда, нужда, опыт),
// стати, кошелёк, что в руках и на поясе, ЦЕЛЬ (кто перед тобой: здоровье, отношение, опасность),
// ОКРУЖЕНИЕ (время года, погода, холод, свет, чьи земли), куда идти (ближайшее поселение
// или выход из подземелья), кто рядом, благословения и проклятия, подсказка по клавишам.
(function (E) {
  const UI = E.UI, U = E.U, D = E.D, G = E.G, TL = E.TL, T = E.T, COL = UI.COL, C0 = UI.COL0;
  const Gm = () => E.Gm;
  const hex = (c) => { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const mix = (a, b, k) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join(''); };

  // ---------- темы ----------
  // [рамка, панель, заголовок, акцент, узор]
  const RACE = {
    human: ['#5a4a3a', '#141018', '#e8d8a8', '#f0c060', '·'], elf: ['#46664c', '#0f1512', '#d8ecc8', '#a8e0a0', '❦'],
    dwarf: ['#7a5a36', '#16120d', '#f0d0a0', '#e0a050', '◆'], orc: ['#6a4a34', '#15100c', '#e8c8a0', '#d08050', '‡'],
    halfling: ['#6a6438', '#14130d', '#f0e0a8', '#d8c060', '•'], darkelf: ['#56487a', '#110e18', '#e0d8f0', '#b8a0f0', '◇'],
    goblin: ['#56662a', '#12140b', '#e0e8a0', '#b0d040', '¤'], lizard: ['#386656', '#0c1513', '#c8e8d8', '#60d0a0', '≈'],
    catfolk: ['#7a5a38', '#16110c', '#f8e0c0', '#f0a050', '∴'], tiefling: ['#7a3a3a', '#170c10', '#f0d0c0', '#f06a5a', '†'],
    giant: ['#56606e', '#101317', '#d8e0e8', '#a0b8d8', '▲'], taur: ['#56703e', '#12150e', '#f0ecd8', '#e0c050', '∙'],
    fae: ['#6a8a6a', '#0e140f', '#f0e8f8', '#c0f0c0', '✿'], merfolk: ['#2a6a7a', '#0a1418', '#d0f0f0', '#60e0e0', '≈'], vampire: ['#6a1a2a', '#140a0e', '#f0e0e8', '#e03040', '†'], wolfkin: ['#5a5a50', '#121210', '#e8e0d0', '#f0c020', '☾'],
    femboy: ['#7a5a7a', '#160f16', '#f8e0f0', '#f0a0d0', '♡'], succubus: ['#7a3a5a', '#170c13', '#f8d0e0', '#f070a0', '♥'],
  };
  const SEASON = [['весна', '#a8e0a0', '✿'], ['лето', '#f0d070', '☼'], ['осень', '#e09050', '♣'], ['зима', '#b8d8f0', '❄']];
  const ENV = {
    dungeon: ['#4a4a56', '#0d0d12', 0.45], night: ['#3a4a7a', '#0d0f1c', 0.35], desert: ['#8a7040', '#17130c', 0.3], snow: ['#7a90a8', '#10141a', 0.35],
    swamp: ['#4a6a3a', '#0e140d', 0.3], dim: ['#6a4a8a', '#130e1a', 0.45], sea: ['#3a5a7a', '#0c121a', 0.35],
  };
  UI.THEME = { orn: '·', season: 0, env: null };
  UI.applyTheme = function () {
    const P = G.P, m = G.map;
    const base = RACE[(P && P.race) || 'human'] || RACE.human;
    let border = base[0], panel = base[1], title = base[2], accent = base[3];
    const sea = Gm() && Gm().season ? Gm().season() : 0;
    const S = SEASON[sea] || SEASON[0];
    accent = mix(accent, S[1], 0.22);
    let env = null;
    if (m) {
      if (m.kind === 'dun') env = 'dungeon';
      else if (m.dim || m.kind === 'dim') env = m.dimName === 'sea' ? 'sea' : 'dim';
      else if (['desert', 'ash'].includes(m.biome)) env = 'desert';
      else if (['ice', 'tundra'].includes(m.biome) || (sea === 3 && m.region && m.region.t < 0.5)) env = 'snow';
      else if (m.biome === 'swamp') env = 'swamp';
      if (!env && m.outdoor && E.Gm.night && E.Gm.night()) env = 'night';
    }
    if (env) { const e = ENV[env]; border = mix(border, e[0], e[2]); panel = mix(panel, e[1], e[2]); }
    COL.border = border; COL.panel = panel; COL.title = title; COL.accent = accent;
    COL.bar = mix(panel, '#000000', 0.15); COL.logbg = mix(panel, '#000000', 0.3);
    COL.sel = mix(panel, accent, 0.18); COL.selfg = mix('#ffffff', title, 0.4);
    UI.THEME = { orn: base[4], season: sea, seasonN: S[0], seasonC: S[1], seasonI: S[2], env };
  };
  const r0 = UI.render;
  UI.render = function () { if (G.P && G.map) { try { UI.applyTheme(); } catch (e) { /* без темы */ } } return r0.apply(this, arguments); };

  // ---------- портрет героя ----------
  const RC = () => UI.RCODE || {};
  const faces = new Map();
  function moodP(P) {
    if (P.dead) return 'z';
    if (P.hp < P.mhp * 0.25) return 'f';
    if (E.UI.hostilesVisible && E.UI.hostilesVisible() > 0) return 'a';
    if ((P.thirst || 0) >= 80 || P.hunger < 15) return 's';
    if (E.Gm.hasFx && (E.Gm.hasFx('loved') || E.Gm.hasFx('content'))) return 'h';
    return 'n';
  }
  function drawFace(ctx, x, y, w, h) {
    const P = G.P, Gfx = E.Gfx;
    if (!Gfx || !Gfx.PX) return;
    const code = RC()[P.race || 'human'] || 'h', fb = P.race === 'femboy' ? '1' : '0';
    const key = (P.sex === 'f' ? 'npc_f' : 'npc_m') + '~' + code + (P.sex === 'f' ? 'f' : 'm') + fb + moodP(P) + ((P.skin || 0) % 10);
    const cls = UI.mvTiles && UI.mvTiles.CLS ? UI.mvTiles.CLS[P.cls || 'wanderer'] : null;
    const c = cls || '#b09060';
    const ck = key + '|' + c + '|' + w + 'x' + h;
    let pr = faces.get(ck);
    if (!pr) {
      const sp = Gfx.PX.sprite(key, { c, f: 0 }, { yaw: 0.32, pitch: 0.06, ppu: 150, levels: 9 });
      if (!sp) return;
      const RV = Gfx.HF.RACEV && Gfx.HF.RACEV[code], sc = RV ? RV.h : 1;
      const hz = 1.235 * sc * sp.ppu, cw = 0.5 * sc * sp.ppu, asp = h / w, chh = Math.max(0.52 * sc * sp.ppu, Math.min(cw * asp, 0.7 * sc * sp.ppu));
      const sx = Math.max(0, Math.round(sp.ax - cw / 2)), sy = Math.max(0, Math.round(sp.ay - hz - 0.22 * sc * sp.ppu));
      pr = { sp, sx, sy, sw: Math.min(sp.w - sx, Math.round(cw)), sh: Math.min(sp.h - sy, Math.round(chh)) };
      faces.set(ck, pr);
      if (faces.size > 24) faces.delete(faces.keys().next().value);
    }
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, mix(COL.panel, '#ffffff', 0.08)); g.addColorStop(1, mix(COL.panel, '#000000', 0.4));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const k = Math.min((w - 4) / pr.sw, (h - 4) / pr.sh), dw = pr.sw * k, dh = pr.sh * k;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pr.sp.cv, pr.sx, pr.sy, pr.sw, pr.sh, Math.round(x + (w - dw) / 2), Math.round(y + Math.max(2, h - dh - 1)), Math.round(dw), Math.round(dh));
    ctx.strokeStyle = COL.accent; ctx.globalAlpha = 0.7; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.globalAlpha = 1;
  }

  // ---------- красивые полосы (поверх текстовых) ----------
  function drawBar(ctx, t, b) {
    const x = b.x * t.cw, y = b.y * t.ch + t.ch * 0.18, w = b.w * t.cw, h = t.ch * 0.64, k = U.clamp(b.v / Math.max(1, b.max), 0, 1);
    const r = Math.min(h / 2, 4);
    const rr = (xx, yy, ww, hh) => { ctx.beginPath(); ctx.moveTo(xx + r, yy); ctx.lineTo(xx + ww - r, yy); ctx.quadraticCurveTo(xx + ww, yy, xx + ww, yy + r); ctx.lineTo(xx + ww, yy + hh - r); ctx.quadraticCurveTo(xx + ww, yy + hh, xx + ww - r, yy + hh); ctx.lineTo(xx + r, yy + hh); ctx.quadraticCurveTo(xx, yy + hh, xx, yy + hh - r); ctx.lineTo(xx, yy + r); ctx.quadraticCurveTo(xx, yy, xx + r, yy); ctx.closePath(); };
    ctx.fillStyle = COL.panel; ctx.fillRect(x - 1, b.y * t.ch, w + 2, t.ch);
    rr(x, y, w, h); ctx.fillStyle = mix(b.col, '#000000', 0.72); ctx.fill();
    if (k > 0) {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, mix(b.col, '#ffffff', 0.35)); g.addColorStop(0.5, b.col); g.addColorStop(1, mix(b.col, '#000000', 0.35));
      ctx.save(); rr(x, y, w, h); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(x, y, Math.max(2, w * k), h);
      // отметки по четвертям
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let q = 1; q < 4; q++) ctx.fillRect(Math.round(x + w * q / 4), y, 1, h);
      ctx.restore();
    }
    rr(x + 0.5, y + 0.5, w - 1, h - 1); ctx.strokeStyle = mix(b.col, '#000000', 0.4); ctx.lineWidth = 1; ctx.stroke();
    if (b.txt) { ctx.font = Math.round(t.ch * 0.56) + 'px ' + t.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(b.txt, x + w / 2 + 1, y + h / 2 + 1); ctx.fillStyle = '#fff6e0'; ctx.fillText(b.txt, x + w / 2, y + h / 2); }
  }

  // ---------- куда идти ----------
  const DIR = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
  const dirOf = (dx, dy) => DIR[(Math.round(Math.atan2(dx, -dy) / (Math.PI / 4)) + 8) % 8];
  function whereTo() {
    const P = G.P, m = G.map, W = G.W;
    if (m.kind === 'dun') {
      const up = m.entry, dn = m.downAt;
      const parts = [];
      if (up) parts.push('подъём — ' + dirOf(up.x - P.x, up.y - P.y) + ', ' + Math.round(Math.hypot(up.x - P.x, up.y - P.y)) + ' ш.');
      if (dn && (m.ex[dn.y * m.w + dn.x] || G.vis[dn.y * m.w + dn.x])) parts.push('спуск — ' + dirOf(dn.x - P.x, dn.y - P.y));
      return parts.join(', ');
    }
    if (m.kind !== 'over' || !m.region) return '';
    if (m.sett >= 0) {
      const tw = m.tower; const parts = [];
      if (tw) parts.push('башня магов — ' + dirOf(tw.x - P.x, tw.y - P.y));
      if (P.farm && P.farm.sett === m.sett) parts.push('твоя ферма здесь');
      return parts.join(', ');
    }
    let best = null, bd = 1e9;
    for (const s of W.settlements) { if (s.type === 'sea' || s.type === 'vanish') continue; const kn = P.known.regions[s.region] || (P.known.seen && P.known.seen[s.region]); if (!kn) continue; const d = Math.abs(s.rx - m.region.x) + Math.abs(s.ry - m.region.y); if (d < bd && d > 0) { bd = d; best = s; } }
    if (!best) return 'поселений поблизости не знаешь';
    return best.nom + ' — ' + dirOf(best.rx - m.region.x, best.ry - m.region.y) + ', ' + bd + ' ' + U.plural(bd, 'земля', 'земли', 'земель');
  }
  // ---------- цель ----------
  function targetOf() {
    const P = G.P, m = G.map;
    if (G.aim && !G.aim.dead) return G.aim;
    if (G.focus && G.focus.e && !G.focus.e.dead) return G.focus.e;
    // в ASCII — ближайший враг в поле зрения
    let best = null, bd = 99;
    for (const e of m.ents) { if (e.dead || !(e.hostile || e.hostileToP) || !G.vis[e.y * m.w + e.x]) continue; const d = U.dist(e.x, e.y, P.x, P.y); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  const danger = (e) => { const d = (e.lvl || 1) - (G.P.level || 1); return d >= 4 ? ['смертельно опасен', '#ff6050'] : d >= 2 ? ['опасен', '#f0a060'] : d >= -1 ? ['равный', '#d8d0a0'] : ['слабее тебя', '#90c890']; };

  // ---------- панель ----------
  UI.drawSide = function (t, L) {
    const P = G.P, m = G.map, Gm1 = E.Gm;
    if (!L.wide) return UI.drawStatusNarrow(t, L);
    const x = L.sx, w = L.sw, TH = UI.THEME;
    t.fill(x, 1, w, t.rows - 1, ' ', COL.text, COL.panel);
    for (let y = 1; y < t.rows; y++) t.put(x, y, '│', COL.border, COL.panel);
    const X = x + 2, IW = w - 3;
    const head = (y, s) => { const line = '─'.repeat(Math.max(0, IW - s.length - 4)); t.text(X, y, TH.orn + ' ' + s + ' ', COL.accent, COL.panel); t.text(X + s.length + 3, y, line, COL.border, COL.panel); };
    let y = 1;
    // портрет и имя
    const PW = 7, PH = 4;
    const fy = y;
    t.post.push((ctx) => drawFace(ctx, X * t.cw, (fy + 0.1) * t.ch, PW * t.cw, PH * t.ch - 2));
    const RN = E.Realms ? E.Realms.raceName : null;
    const raceW = RN ? U.cap(RN(P.race || 'human', P.sex)) : '';
    t.text(X + PW + 1, y, P.name, COL.title, COL.panel, IW - PW - 1);
    t.text(X + PW + 1, y + 1, raceW, COL.accent, COL.panel, IW - PW - 1);
    t.text(X + PW + 1, y + 2, (P.level >= 999 ? 'Ур. —' : 'Ур. ' + P.level) + ' · ' + UI.clsLabel(), COL.dim, COL.panel, IW - PW - 1);
    t.text(X + PW + 1, y + 3, Gm1.purseStr(true), '#e0c070', COL.panel, IW - PW - 1);
    y += PH + 1;
    // полосы
    const bars = [];
    const bw = IW - 9;
    const barRow = (lab, v, max, col, txt) => { t.text(X, y, lab, COL.dim, COL.panel); UI.bar(t, X + 9, y, bw, v, max, col); bars.push({ x: X + 9, y, w: bw, v, max, col, txt }); y++; };
    barRow('Здоровье', P.hp, P.mhp, COL.hp, Math.ceil(P.hp) + ' / ' + P.mhp);
    barRow('Дух', P.mp, P.mmp, COL.mp, Math.floor(P.mp) + ' / ' + P.mmp);
    barRow('Сытость', P.hunger, 100, COL.food, P.hunger < 20 ? 'голод' : '');
    barRow('Жажда', P.thirst || 0, 100, (P.thirst || 0) >= 80 ? '#e07050' : '#4ab8d0', (P.thirst || 0) >= 80 ? 'пить!' : '');
    barRow('Нужда', P.need || 0, 100, (P.need || 0) >= 85 ? '#e07050' : '#b08a40', '');
    if (P.level < 999) barRow('Опыт', P.xp, Gm1.need(P.level), COL.xp, Math.floor(P.xp / Math.max(1, Gm1.need(P.level)) * 100) + '%');
    t.post.push((ctx) => { for (const b of bars) drawBar(ctx, t, b); });
    if (P.shield > 0) t.text(X, y++, 'Щит: ' + P.shield, '#a0c0ff', COL.panel);
    const st = P.st;
    t.text(X, y++, 'Сил ' + U.pad(st.str, 3) + 'Лов ' + U.pad(st.dex, 3) + 'Стк ' + U.pad(st.con, 3) + 'Защ ' + st.def, COL.text, COL.panel, IW);
    t.text(X, y++, 'Раз ' + U.pad(st.int, 3) + 'Вер ' + U.pad(st.fai, 3) + 'Уд  ' + st.luck, COL.text, COL.panel, IW);
    if (P.level >= 100) t.text(X, y++, 'Воля ' + U.pad(st.wil, 3) + 'Резонанс ' + st.res, '#d0c0ff', COL.panel, IW);
    if (P.pts > 0) t.text(X, y++, '+' + P.pts + ' очк. навыков (C)', COL.accent, COL.panel, IW);
    // школы магии: в какой ты и какой ранг (F…S)
    const SCl = E.Schools;
    if (SCl && P.schools) { const ks = Object.keys(P.schools); if (ks.length) { const mn = P.school && P.schools[P.school] != null ? P.school : ks[0]; t.text(X, y++, [mn].concat(ks.filter((s) => s !== mn)).map((s) => U.cap(SCl.list[s].who[P.sex === 'f' ? 1 : 0]) + ' ' + SCl.TIERS[Math.max(0, SCl.rank(s))]).join(' · '), SCl.list[mn].c, COL.panel, IW); } }
    // в руках и на поясе
    y++; head(y++, 'Снаряжение');
    t.text(X, y++, Gm1.handsLine(P), COL.text, COL.panel, IW);
    if (E.Belt) {
      const hb = E.Belt.hung('belt').map((it) => E.Items.name(it).split(' ')[0]), hk = E.Belt.hung('back').map((it) => E.Items.name(it).split(' ')[0]);
      if (hb.length) t.text(X, y++, 'Пояс: ' + hb.join(', ').toLowerCase(), COL.dim, COL.panel, IW);
      if (hk.length) t.text(X, y++, 'Спина: ' + hk.join(', ').toLowerCase(), COL.dim, COL.panel, IW);
    }
    if (P.light > 0) t.text(X, y++, 'Факел: ' + Math.ceil(P.light / 60) + ' ч', '#ffc070', COL.panel, IW);
    t.text(X, y++, U.cap(Gm1.fmt(Gm1.dressName())), Gm1.dress && ['naked', 'under'].includes(Gm1.dress()) ? '#e0a080' : COL.dim, COL.panel, IW);
    // цель
    const e = targetOf();
    if (e && y < t.rows - 12) {
      y++; head(y++, 'Цель');
      const lbl = e.npc != null ? E.Dlg.label(e) : U.cap(e.full || e.n);
      const hostile = e.hostile || e.hostileToP;
      t.put(X, y, e.ch || '?', hostile ? '#ff7060' : e.c || COL.text, COL.panel);
      t.text(X + 2, y++, lbl, hostile ? '#f0a090' : COL.title, COL.panel, IW - 2);
      if (e.mhp) { t.text(X, y, 'Сила', COL.dim, COL.panel); UI.bar(t, X + 9, y, bw, e.hp, e.mhp, hostile ? '#c84a3a' : '#7aa860'); bars.push({ x: X + 9, y, w: bw, v: e.hp, max: e.mhp, col: hostile ? '#c84a3a' : '#7aa860', txt: e.hp < e.mhp * 0.3 ? 'при смерти' : e.hp < e.mhp ? 'ранен' : '' }); y++; }
      if (e.npc != null && E.Social) {
        const sg = E.Social.stage(e.npc), tg = E.Social.tags(e.npc), mood = UI.moodWord ? UI.moodWord(e) : '';
        t.text(X, y++, sg[0] + (tg.length ? ' · ' + tg.join(', ') : ''), sg[1], COL.panel, IW);
        if (mood) t.text(X, y++, U.cap(mood), COL.dim, COL.panel, IW);
      } else if (e.kind === 'mon' || e.kind === 'boss') {
        const dg = danger(e); t.text(X, y++, U.cap(dg[0]) + (e.asleep ? ' · спит' : e.aware ? '' : ' · не видит тебя'), dg[1], COL.panel, IW);
      }
    }
    // окружение
    if (y < t.rows - 9) {
      y++; head(y++, 'Окружение');
      const S = E.Time, w2 = Gm1.weather(), wn = w2 !== 'none' && D.weathers[w2] ? D.weathers[w2].n.toLowerCase() : 'ясно';
      t.text(X, y, TH.seasonI + ' ', TH.seasonC, COL.panel);
      t.text(X + 2, y++, U.cap(TH.seasonN) + ' · ' + wn + ' · ' + S.dayWord(G.S.time), COL.text, COL.panel, IW - 2);
      const cold = Gm1.coldLevel ? Gm1.coldLevel() : 0;
      const lightW = m.outdoor ? (Gm1.night() ? 'ночь, темно' : 'светло') : (m.kind === 'dun' ? 'под землёй, темно' : 'под крышей');
      t.text(X, y++, U.cap(lightW) + (cold >= 2 ? ' · лютый холод' : cold >= 1 ? ' · холодно' : ''), cold >= 1 ? '#a8c8f0' : COL.dim, COL.panel, IW);
      const land = E.Realms && E.Realms.landOfMap ? E.Realms.landOfMap(m) : null;
      if (land) t.text(X, y++, land.name, COL.dim, COL.panel, IW);
      const wt = whereTo();
      if (wt) { const ls = U.wrap('→ ' + wt, IW).slice(0, 2); for (const l of ls) t.text(X, y++, l, '#c8b890', COL.panel, IW); }
    }
    // рядом
    const near = m.ents.filter((q) => G.vis[q.y * m.w + q.x] && !q.dead && q !== e).sort((a, b) => U.dist(a.x, a.y, P.x, P.y) - U.dist(b.x, b.y, P.x, P.y));
    const fx = P.fx.filter((f) => D.effects[f.id]);
    const reserve = (fx.length ? Math.min(4, fx.length) + 2 : 0) + 2;
    if (near.length && y < t.rows - reserve - 3) {
      y++; head(y++, 'Рядом');
      for (const q of near.slice(0, Math.max(1, t.rows - y - reserve))) {
        const lbl = q.npc != null ? E.Dlg.label(q) : U.cap(q.full || q.n);
        t.put(X, y, q.ch, q.kind === 'npc' && q.hostile ? '#ff7060' : q.ally ? '#90f090' : q.c, COL.panel);
        t.text(X + 2, y++, lbl + (q.asleep ? ' (спит)' : ''), q.hostile || q.hostileToP ? '#e0a0a0' : COL.text, COL.panel, IW - 2);
      }
    }
    // благословения и проклятия — внизу
    let yb = t.rows - 2 - Math.min(4, fx.length);
    if (fx.length && yb > y) {
      t.hline(X - 1, yb - 1, IW + 1, COL.border, '─');
      for (const f of fx.slice(0, 4)) { const d = D.effects[f.id]; if (UI.drawFxIcon) { const yy = yb; t.post.push((ctx) => UI.drawFxIcon(ctx, f.id, X * t.cw, yy * t.ch + 1, Math.max(10, t.ch - 2))); } t.text(X, yb, '   ' + d.n, d.kind === 'curse' ? '#c080c0' : d.kind === 'bless' ? '#80c0f0' : '#c0a080', COL.panel, IW); t.hot(X, yb, IW, 1, () => UI.popup(d.n, UI.fxTip(f.id).slice(1).join('\n\n')), { tip: () => UI.fxTip(f.id) }); yb++; }
    }
    // клавиши
    t.text(X, t.rows - 1, IW >= 34 ? 'I сумка · K умения · N люди · F2 вид' : 'I сумка K умения N люди F2', COL.faint, COL.panel, IW);
  };
})(window.EOF);
