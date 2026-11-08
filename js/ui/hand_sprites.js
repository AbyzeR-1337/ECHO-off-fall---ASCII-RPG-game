'use strict';
// Рука от первого лица — спрайты с присланного листа (js/gfx/hand_atlas.js), как есть:
// рука по диагонали снизу, рукав по одежде, мужская или женская. Под героя подстраивается:
// кожа перекрашивается под народ и тон, кристалл посоха — под выбранное заклинание,
// размер — под народ и сложение. Удар — взмах вокруг локтя, выпад, отдача; на ходу рука покачивается.
(function (E) {
  const UI = E.UI, G = E.G, D = E.D;
  const HA = E.HandAtlas;
  if (!HA) return;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

  // ---------- загрузка атласа ----------
  let A = null, M = null, ready = false;
  const img = new Image(), msk = new Image();
  let loaded = 0;
  const onload = () => {
    if (++loaded < 2) return;
    A = document.createElement('canvas'); A.width = img.width; A.height = img.height; A.getContext('2d').drawImage(img, 0, 0);
    M = document.createElement('canvas'); M.width = msk.width; M.height = msk.height; M.getContext('2d', { willReadFrequently: true }).drawImage(msk, 0, 0);
    ready = true;
  };
  img.onload = onload; msk.onload = onload;
  img.src = HA.img; msk.src = HA.mask;
  UI.handAtlasReady = () => ready;

  // ---------- что рисовать ----------
  // оружие и вещи → спрайт листа
  const KIND2 = {
    staff: 'staff', sword: 'sword', longsword: 'sword', knife: 'sword', dagger: 'sword', axe: 'axe', waraxe: 'axe',
    hammer: 'hammer', mace: 'hammer', club: 'hammer', flail: 'hammer', spear: 'spear', trident: 'spear',
    bow: 'bow', crossbow: 'crossbow', rod: 'rod', shovel: 'shovel', pick: 'pick', sickle: 'pick3', scythe: 'pick2', sling: 'pouch',
    torch: 'torch', candle: 'torch', lantern: 'lantern', potion: 'potion', scroll: 'scroll', book: 'book', pouch: 'pouch', small: 'pouch',
    key: 'key', compass: 'compass', herbs: 'herbs', bread: 'bread', mug: 'mug', horn: 'horn', shield: 'shield',
  };
  // рука без оружия: рукав по одежде (номер в верхнем ряду листа)
  function idleIndex(P) {
    const f = P.sex === 'f', b = P.eq.body && P.eq.body.b, sh = P.eq.shirt && P.eq.shirt.b, gl = P.eq.hands && P.eq.hands.b;
    if (gl === 'gauntlets') return 10;
    if (gl) return 11;
    if (f) {
      if (b === 'robe') return 1;
      if (b === 'leather') return sh ? 3 : 2;
      if (b === 'gambeson') return 3;
      if (b === 'chain' || b === 'scale' || b === 'plate') return 5;
      if (b === 'furcoat' || b === 'furcloak') return 9;
      if (b === 'rags') return 8;
      if (sh === 'shirt_fine') return 6;
      if (sh === 'tunic') return 0;
      return 10;
    }
    if (b === 'leather') return (P.skin || 0) % 2 ? 5 : 0;
    if (b === 'gambeson') return 3;
    if (b === 'chain') return 6;
    if (b === 'scale' || b === 'plate') return 10;
    if (b === 'furcoat' || b === 'furcloak') return 6;
    if (b === 'robe') return 4;
    if (b === 'rags') return 2;
    if (sh === 'shirt_fine') return 9;
    if (sh === 'shirt_wool') return 8;
    return 1;
  }
  UI.handSpriteName = function (P, it, punching) {
    const s = P.sex === 'f' ? 'f' : 'm';
    if (!it) return punching ? 'idle_' + s + '7' : 'idle_' + s + idleIndex(P);
    if (it.b === 'lantern_crystal') return 'lantern_' + s;
    const k = UI.handKindOf ? UI.handKindOf(it) : 'sword';
    return (KIND2[k] || 'pouch') + '_' + s;
  };

  // ---------- облик: кожа по народу, размер ----------
  const SKIN_H = ['#e8b08c', '#d8a07a', '#b97c58', '#8e5a3c', '#f0c4a4', '#62402a'];
  const RACE = {
    human: { k: 1 }, elf: { k: 0.98, skin: ['#f2dcca', '#ead0bc', '#dcc2ae'] }, dwarf: { k: 0.96, skin: ['#e2a282', '#d09070', '#be8068'] },
    orc: { k: 1.1, skin: ['#7e9c5c', '#6a8a52', '#8c9c6c'] }, halfling: { k: 0.88, skin: ['#ecc4a4', '#dcaa84', '#c89878'] },
    darkelf: { k: 0.98, skin: ['#6e7088', '#5c5e78', '#7c7c98'] }, goblin: { k: 0.84, skin: ['#8aa04a', '#9aae58', '#7a9440'] },
    lizard: { k: 1.04, skin: ['#5e8a6a', '#4e7a8a', '#7a8a4a'] }, catfolk: { k: 0.96, skin: ['#d8a878', '#c89058', '#e8c8a8'] },
    tiefling: { k: 1.0, skin: ['#b04848', '#9a3a5a', '#c06050'] }, giant: { k: 1.16, skin: ['#c89c80', '#b88a6a', '#a87a5a'] },
    taur: { k: 1.07, skin: ['#f0d4bc', '#e2bc9c', '#c89878', '#a87858'] }, femboy: { k: 0.9, skin: ['#f4dccc', '#ecc8b0', '#d8b090'] },
    fae: { k: 0.78, skin: ['#f4e8f0', '#e0f0e0', '#e8e0f8'] }, merfolk: { k: 1.0, skin: ['#9ac8c8', '#88b8c0', '#a8d0c8'] }, vampire: { k: 0.95, skin: ['#e8e4e8', '#dcd4dc', '#f0ecf0'] }, wolfkin: { k: 1.05, skin: ['#c8a080', '#a88060', '#d8b898'] },
  };
  UI.HAND_RACE = RACE;
  function lookOf(P) {
    const r = RACE[P.race] || RACE.human;
    const skin = r.skin ? r.skin[(P.skin || 0) % r.skin.length] : SKIN_H[(P.skin || 0) % SKIN_H.length];
    const st = P.st || {}, mass = clamp(1 + ((st.str || 5) + (st.con || 5) - 10) * 0.01, 0.94, 1.12);
    return { skin, k: r.k * mass };
  }
  // цвет кристалла посоха — по стихии выбранного заклинания
  const ORB = { fire: [255, 130, 40], ice: [120, 210, 255], storm: [170, 190, 255], holy: [255, 220, 120], arcane: [170, 110, 255], void: [140, 80, 220], dark: [140, 80, 220], acid: [140, 230, 80], earth: [210, 160, 90], nature: [110, 230, 90] };

  // готовые варианты спрайтов: перекрашенная кожа, кристалл, светящееся отдельно
  const cache = new Map();
  // wood — цвет древка (у посохов разных видов своё дерево, кость, металл)
  function variant(name, look, orbEl, wood, glow, head, blade) {
    const key = name + '|' + look.skin + '|' + (orbEl || '') + '|' + (wood || '') + '|' + (glow || '') + '|' + (head || '') + '|' + (blade ? blade.id : '');
    let v = cache.get(key);
    if (v) return v;
    const R = HA.rects[name];
    if (!R) return null;
    const cv = document.createElement('canvas'), em = document.createElement('canvas');
    cv.width = em.width = R.w; cv.height = em.height = R.h;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(A, R.x, R.y, R.w, R.h, 0, 0, R.w, R.h);
    const id = c.getImageData(0, 0, R.w, R.h), d = id.data;
    const md = M.getContext('2d', { willReadFrequently: true }).getImageData(R.x, R.y, R.w, R.h).data;
    const ed = em.getContext('2d').createImageData(R.w, R.h), e = ed.data;
    const T = hex(look.skin), Ty = 0.3 * T[0] + 0.59 * T[1] + 0.11 * T[2];
    const SCc = E.Schools && E.Schools.COL && E.Schools.COL[orbEl];
    const O = orbEl && (ORB[orbEl] || (SCc ? SCc.map((x) => Math.round(x * 255)) : null));
    const WD = wood && /^staff/.test(name) ? hex(wood) : null, WY = WD ? 0.3 * WD[0] + 0.59 * WD[1] + 0.11 * WD[2] : 1;
    let top = null;
    const glowKind = /^(torch|lantern)/.test(name);
    for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) {
      const q = (y * R.w + x) * 4;
      if (d[q + 3] < 8) continue;
      if (!top) top = [x, y];
      const r = d[q], g = d[q + 1], b = d[q + 2], Y = 0.3 * r + 0.59 * g + 0.11 * b;
      if (md[q] > 128) {
        // кожа: яркость пикселя (свет и тень рисунка) — на цвет кожи героя
        const k = Y / 168 * (172 / Math.max(60, Ty));
        let nr = T[0] * k, ng = T[1] * k, nb = T[2] * k;
        if (k > 1.15) { const w = Math.min(0.5, (k - 1.15) * 0.8); nr += (255 - nr) * w; ng += (255 - ng) * w; nb += (255 - nb) * w; }
        d[q] = clamp(nr, 0, 255); d[q + 1] = clamp(ng, 0, 255); d[q + 2] = clamp(nb, 0, 255);
      }
      const orb = md[q + 1] > 128;
      // древко: бурое дерево листа — в цвет посоха (светлота рисунка сохраняется)
      if (WD && !orb && md[q] <= 128 && r >= b && r - b > 12 && Y < 200) {
        const k = Y / 110 * (130 / Math.max(50, WY));
        d[q] = clamp(WD[0] * k, 0, 255); d[q + 1] = clamp(WD[1] * k, 0, 255); d[q + 2] = clamp(WD[2] * k, 0, 255);
      }
      if (orb && O) {
        const k = Y / 150;
        let nr = O[0] * k, ng = O[1] * k, nb = O[2] * k;
        if (k > 1.2) { const w = Math.min(0.7, (k - 1.2)); nr += (255 - nr) * w; ng += (255 - ng) * w; nb += (255 - nb) * w; }
        d[q] = clamp(nr, 0, 255); d[q + 1] = clamp(ng, 0, 255); d[q + 2] = clamp(nb, 0, 255);
      }
      // светится само: кристалл, пламя факела, стекло фонаря
      const hot = orb || (glowKind && r > 200 && g > 110 && b < 150 && r - b > 90);
      // кристальный фонарь: вместо пламени — холодный голубой свет
      if (hot && glow === 'crystal' && !orb) { const Y2 = (r + g + b) / 3; d[q] = clamp(Y2 * 0.55, 0, 255); d[q + 1] = clamp(Y2 * 0.85 + 20, 0, 255); d[q + 2] = clamp(Y2 * 1.1 + 40, 0, 255); }
      if (hot) { e[q] = d[q]; e[q + 1] = d[q + 1]; e[q + 2] = d[q + 2]; e[q + 3] = 255; }
    }
    // клинок, топор, булава: длина и вид по оружию — нож короче кинжала, тот — меча; дубина — деревянная
    if (blade && /^(sword|axe|hammer)_/.test(name)) {
      let hy = R.h;
      for (let y = 0; y < R.h && hy === R.h; y++) for (let x = 0; x < R.w; x++) if (md[(y * R.w + x) * 4] > 128) { hy = y; break; }
      const ay = Math.max(10, Math.min(R.h - 1, hy - (/^sword/.test(name) ? 16 : 8)));
      let ac = 0, an = 0;
      for (let x = 0; x < R.w; x++) if (d[(ay * R.w + x) * 4 + 3] > 8) { ac += x; an++; }
      const ax = an ? ac / an : R.w / 2, k = blade.k || 1, src = d.slice();
      if (k !== 1) for (let y = 0; y < ay; y++) for (let x = 0; x < R.w; x++) {
        const q = (y * R.w + x) * 4, sxx = Math.round(ax + (x - ax) / k), syy = Math.round(ay + (y - ay) / k);
        if (sxx < 0 || syy < 0 || sxx >= R.w || syy >= ay) { d[q + 3] = 0; e[q + 3] = 0; continue; }
        const q2 = (syy * R.w + sxx) * 4;
        d[q] = src[q2]; d[q + 1] = src[q2 + 1]; d[q + 2] = src[q2 + 2]; d[q + 3] = src[q2 + 3];
      }
      const TN = blade.tint ? hex(blade.tint) : null, GL = blade.glow ? hex(blade.glow) : null;
      if (TN || GL) for (let y = 0; y < ay; y++) for (let x = 0; x < R.w; x++) {
        const q = (y * R.w + x) * 4;
        if (d[q + 3] < 8) continue;
        const r = d[q], g = d[q + 1], b = d[q + 2], Y = 0.3 * r + 0.59 * g + 0.11 * b, sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (sat > 46) continue; // золото гарды и кожа рукояти — как были
        if (TN) { const kk = Y / 140; d[q] = clamp(TN[0] * kk, 0, 255); d[q + 1] = clamp(TN[1] * kk, 0, 255); d[q + 2] = clamp(TN[2] * kk, 0, 255); }
        if (GL && Y > 120) { e[q] = clamp((d[q] + GL[0]) / 2, 0, 255); e[q + 1] = clamp((d[q + 1] + GL[1]) / 2, 0, 255); e[q + 2] = clamp((d[q + 2] + GL[2]) / 2, 0, 255); e[q + 3] = 255; }
      }
      if (blade.head && UI.paintWeaponHead) UI.paintWeaponHead(d, e, R.w, R.h, blade.head, md);
      top = null;
      for (let y = 0; y < R.h && !top; y++) for (let x = 0; x < R.w; x++) if (d[(y * R.w + x) * 4 + 3] > 8) { top = [x, y]; break; }
    }
    // своё навершие посоха — вместо сферы с листа
    if (head && /^staff/.test(name) && UI.paintStaffHead) {
      const oh = O ? '#' + O.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('') : null;
      if (UI.paintStaffHead(d, e, md, R.w, R.h, head, wood, oh)) { top = null; for (let y = 0; y < R.h && !top; y++) for (let x = 0; x < R.w; x++) if (d[(y * R.w + x) * 4 + 3] > 8) { top = [x, y]; break; } }
    }
    c.putImageData(id, 0, 0);
    em.getContext('2d').putImageData(ed, 0, 0);
    v = { cv, em, w: R.w, h: R.h, top: top || [0, 0] };
    cache.set(key, v);
    if (cache.size > 40) cache.delete(cache.keys().next().value);
    return v;
  }

  // ---------- длина и вид оружия ----------
  const BLADE = {
    knife: { k: 0.55, tint: '#b8bcc4' }, dagger: { k: 0.68, tint: '#9aa0ac' }, sword: { k: 0.88 }, longsword: { k: 1 },
    axe: { k: 0.82 }, waraxe: { k: 1, head: 'waraxe' }, club: { k: 1, head: 'club' }, mace: { k: 1, head: 'mace' }, hammer: { k: 1 }, flail: { k: 1, head: 'flail' },
  };
  const BLADE_ID = { shortsword: { k: 0.78 }, a_starblade: { k: 1, tint: '#c8d8ff', glow: '#a0c8ff' }, a_spite: { k: 1, tint: '#9a3040', glow: '#ff4060' }, a_whisper: { k: 0.7, tint: '#404850', glow: '#8090a0' }, dragonbone: { k: 0.95, tint: '#e8dcc0' } };
  function bladeOf(it) {
    if (!it) return null;
    const k = UI.handKindOf ? UI.handKindOf(it) : null;
    const o = BLADE_ID[it.b] || BLADE[k];
    if (!o) return null;
    return Object.assign({ id: it.b + ':' + k }, o);
  }
  // ---------- движение ----------
  const SLASH = new Set(['sword', 'axe', 'hammer', 'pick', 'pick2', 'pick3', 'shovel']), THRUST = new Set(['spear', 'staff', 'rod']), RANGED = new Set(['bow', 'crossbow']);
  // где спрайт в момент удара: угол вокруг локтя, сдвиг, след
  function motion(base, sw, u) {
    const r = { a: 0, dx: 0, dy: 0, smear: 0 };
    if (!(sw >= 0 && sw < 1)) return r;
    const k = Math.sin(sw * Math.PI);
    if (SLASH.has(base)) {
      // замах назад → рубящий взмах влево-вниз (со следом) → возврат
      if (sw < 0.2) { const e = sw / 0.2; r.a = 0.22 * e; r.dy = -6 * u * e; }
      else if (sw < 0.55) { const e = (sw - 0.2) / 0.35; r.a = 0.22 - 0.95 * e; r.dx = -14 * u * e; r.dy = -6 * u + 10 * u * e; r.smear = 1 - e * 0.3; }
      else { const e = (sw - 0.55) / 0.45; r.a = -0.73 * (1 - e); r.dx = -14 * u * (1 - e); r.dy = 4 * u * (1 - e); }
    } else if (THRUST.has(base)) { r.dx = -k * 18 * u; r.dy = -k * 26 * u; }
    else if (RANGED.has(base)) { r.dy = k * 7 * u; r.a = k * 0.04; }
    else if (base === 'idle') { r.dx = -k * 34 * u; r.dy = -k * 22 * u; r.a = -k * 0.15; }
    else { r.dx = -k * 16 * u; r.dy = -k * 20 * u; r.a = -k * 0.1; }
    return r;
  }

  // ---------- кадр ----------
  let HC = null, TC = null, partsT = 0;
  const parts = [], shk = { t: 0, yaw: 0, pitch: 0 };
  const drawHand0 = UI.drawHand3D;
  UI.drawHand3D = function (ctx, v) {
    const P = G.P;
    if (!P || P.dead) return;
    if (!ready) { if (drawHand0) drawHand0(ctx, v); return; }
    const fw = v.fw, fh = v.fh;
    const RT = E.RT;
    const swM = UI.HAND_SW != null ? UI.HAND_SW : RT ? (v.now - (RT.swing || 0)) / 420 : 9;
    const swO = UI.HAND_SW_OFF != null ? UI.HAND_SW_OFF : RT ? (v.now - (RT.swingOff || 0)) / 420 : 9;
    // смена оружия: рука уходит вниз и возвращается с другим
    const swp = UI.swapT ? (v.now - UI.swapT) / 300 : 9, sdy = swp >= 0 && swp < 1 ? Math.sin(swp * Math.PI) * fh * 0.45 : 0;
    if (sdy) UI.animUntil = Math.max(UI.animUntil || 0, v.now + 40);
    const left = P.hand === 'L', look = lookOf(P);
    const HO = E.Hold, CP = HO ? HO.frame(v.now) : null;
    if (CP) UI.animUntil = Math.max(UI.animUntil || 0, v.now + 40);
    // тряска: как быстро крутится взгляд (и прыжок) — для кружки и хлеба в руке
    if (HO && E.RT && E.RT.on) {
      const V3 = UI.V3, dt = shk.t ? Math.min(0.1, (v.now - shk.t) / 1000) : 0;
      if (dt > 0 && V3) {
        let dy = Math.abs(V3.yaw - shk.yaw); if (dy > Math.PI) dy = Math.PI * 2 - dy;
        const rate = (dy + Math.abs((V3.pitch || 0) - shk.pitch)) / dt + (E.RT.jv ? Math.abs(E.RT.jv) * 0.6 : 0) + (E.RT.run && v.moving ? 1.5 : 0);
        HO.shake(rate, dt);
      }
      shk.t = v.now; shk.yaw = V3 ? V3.yaw : 0; shk.pitch = V3 ? V3.pitch || 0 : 0;
    }
    const orbOf = (it) => { if (!it || !E.Loadout || E.Loadout.kind(it) !== 'staff') return null; const x = E.Loadout.cur(it); return x && x.a ? x.a.el : 'arcane'; };
    // свет вокруг: небо, солнце, огни
    const sk = v.sky;
    let L = [0.08, 0.075, 0.09];
    for (let i = 0; i < 3; i++) L[i] += sk.amb[i] * (v.inside ? 0.75 : 1.1) + sk.sun[i] * (v.inside ? 0.12 : 0.62);
    for (const l of v.lights.slice(0, 4)) { const dd = Math.hypot(l.x - (v.cam ? v.cam.x : l.x), l.z - (v.cam ? v.cam.z : l.z)); const a = Math.max(0, 1 - dd / l.r); for (let i = 0; i < 3; i++) L[i] += l.col[i] * l.i * a * a * 0.8; }
    if (P.light > 0) { L[0] += 0.5; L[1] += 0.33; L[2] += 0.16; }
    L = L.map((x) => Math.min(1.0, x));
    const tint = 'rgb(' + Math.round(L[0] * 255) + ',' + Math.round(L[1] * 255) + ',' + Math.round(L[2] * 255) + ')';
    // покачивание на ходу
    const t = v.now / 1000, u = fh / 260;
    let bx = Math.sin((v.walked || 0) * 2.6) * 2.5 * u, by = Math.abs(Math.cos((v.walked || 0) * 2.6)) * 3.2 * u;
    if (!v.moving) { bx = Math.sin(t * 1.1) * 0.8 * u; by = Math.sin(t * 1.7) * 1.1 * u; }
    if (!HC) { HC = document.createElement('canvas'); TC = document.createElement('canvas'); }
    if (HC.width !== fw || HC.height !== fh) { HC.width = TC.width = fw; HC.height = TC.height = fh; }
    const hc = HC.getContext('2d'), tc = TC.getContext('2d');
    hc.clearRect(0, 0, fw, fh); hc.imageSmoothingEnabled = false; tc.imageSmoothingEnabled = false;
    // одна рука: локоть (правый нижний угол спрайта) у края кадра; mirror — левая рука
    const one = (it, sw, mirror, side, scaleK, cp) => {
      const punching = !it && sw >= 0 && sw < 1;
      const name = UI.handSpriteName(P, it, punching);
      const SCm = E.Schools, wood = it && SCm && SCm.STAFF_LOOK ? SCm.STAFF_LOOK[it.b] : null;
      const sp = variant(name, look, orbOf(it), wood, it && it.b === 'lantern_crystal' ? 'crystal' : null, it && UI.staffHeadOf ? UI.staffHeadOf(it) : null, bladeOf(it));
      if (!sp) return;
      const base = name.split('_')[0];
      const s = (fh / 300) * 1.08 * look.k * scaleK * (cp ? 1 + 0.12 * cp.e : 1);
      const mo = motion(base, sw, u);
      // ко рту: к середине и вверх, с укусами; кружку — наклонить
      if (cp) { mo.dx += -fw * 0.2 * cp.e; mo.dy += -fh * 0.2 * cp.e + cp.bob * 7 * u; mo.a += cp.drink ? -0.55 * cp.tilt - 0.12 * cp.e : -0.18 * cp.e; }
      // локоть — за краем кадра справа снизу
      const ex = mirror ? fw * (1 - side) : fw * side, ey = fh + sp.h * s * 0.06;
      const draw = (c, im) => {
        c.save();
        c.translate(Math.round(ex + (mirror ? -1 : 1) * (mo.dx + bx * (scaleK < 1 ? -0.6 : 1)) ), Math.round(ey + mo.dy + by * (scaleK < 1 ? 0.6 : 1) + (scaleK < 1 ? 0 : sdy)));
        if (mirror) c.scale(-1, 1);
        c.rotate(mo.a);
        c.drawImage(im, -sp.w * s, -sp.h * s, sp.w * s, sp.h * s);
        c.restore();
      };
      // след удара — дуга по пути верхушки оружия
      if (mo.smear > 0) {
        const tx = -sp.w * s + sp.top[0] * s, ty = -sp.h * s + sp.top[1] * s, rr = Math.hypot(tx, ty), a0 = Math.atan2(ty, tx);
        hc.save(); hc.translate(ex + (mirror ? -1 : 1) * mo.dx, ey + mo.dy); if (mirror) hc.scale(-1, 1);
        for (let i = 0; i <= 14; i++) { const f = i / 14, a = a0 + 0.22 - (0.22 - mo.a) * f, al = mo.smear * f * f * 0.5; hc.fillStyle = 'rgba(235,240,250,' + al.toFixed(3) + ')'; hc.fillRect(Math.round(Math.cos(a) * rr), Math.round(Math.sin(a) * rr), Math.ceil(2 * u), Math.ceil(2 * u)); }
        hc.restore();
      }
      // свет на руке: картинка × свет вокруг; светящееся — поверх, без тени
      tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, fw, fh);
      draw(tc, sp.cv);
      tc.globalCompositeOperation = 'multiply'; tc.fillStyle = tint; tc.fillRect(0, 0, fw, fh);
      tc.globalCompositeOperation = 'destination-in'; draw(tc, sp.cv);
      tc.globalCompositeOperation = 'source-over';
      hc.drawImage(TC, 0, 0);
      const gk = HO ? HO.glowK(it) : 1;
      if (gk > 0) { hc.globalAlpha = gk; draw(hc, sp.em); hc.globalAlpha = 1; }
      // где верх вещи: оттуда сыплются крошки и капли
      const tx = -sp.w * s + sp.top[0] * s * 0.6 + sp.w * s * 0.25, ty = -sp.h * s + sp.top[1] * s + sp.h * s * 0.12, ca = Math.cos(mo.a), sa = Math.sin(mo.a);
      anchors.push({ x: ex + (mirror ? -1 : 1) * (mo.dx + tx * ca - ty * sa), y: ey + mo.dy + tx * sa + ty * ca, it, cp: !!cp });
    };
    const anchors = [];
    // вторая рука: вещь, факел — слева (у левши — справа), чуть меньше
    const offIt = P.eq.off;
    const torch = !offIt && P.light > 0 ? { b: 'torch' } : null;
    const offShow = offIt || torch || (swO >= 0 && swO < 1 && !(E.Gm.twoHanded && E.Gm.twoHanded(P.eq.hand)));
    if (CP) one(CP.it, -1, !left, 0.97, 0.95, CP);
    else if (offShow) one(offIt || torch, swO, !left, 0.97, 0.9);
    one(P.eq.hand, swM, left, 0.99, 1);
    // крошки и капли: падают из руки
    if (HO && HO.emitQ.length) {
      const a = anchors.find((x) => x.cp) || anchors.find((x) => x.it && (HO.dry(x.it) || x.it.cont || (D.items[x.it.b] || {}).drink)) || anchors[0];
      for (const q of HO.emitQ.splice(0)) for (let i = 0; i < q.n && a; i++) parts.push({ x: a.x + (Math.random() - 0.5) * 14 * u, y: a.y + (Math.random() - 0.5) * 8 * u, vx: (Math.random() - 0.5) * 60 * u, vy: (q.k === 'drop' ? -20 : -10) * u * Math.random(), k: q.k, t: v.now, life: 600 + Math.random() * 500, c: q.k === 'drop' ? (Math.random() < 0.3 ? '#e8f4ff' : '#7ab0e0') : (Math.random() < 0.5 ? '#c89850' : '#e0c080') });
    }
    if (parts.length) {
      const dtp = Math.min(0.05, (v.now - (partsT || v.now)) / 1000);
      for (const p of parts) { p.vy += 420 * u * dtp; p.x += p.vx * dtp; p.y += p.vy * dtp; }
      for (let i = parts.length - 1; i >= 0; i--) if (v.now - parts[i].t > parts[i].life || parts[i].y > fh + 4) parts.splice(i, 1);
      for (const p of parts) { hc.fillStyle = p.c; const sz = Math.max(1, Math.round((p.k === 'drop' ? 1.6 : 2.2) * u)); hc.fillRect(Math.round(p.x), Math.round(p.y), sz, sz); }
      UI.animUntil = Math.max(UI.animUntil || 0, v.now + 40);
    }
    partsT = v.now;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(HC, v.vx0, v.vy0, fw * v.px, fh * v.px);
    ctx.restore();
  };
  UI.handReady = () => ready;
})(window.EOF);
