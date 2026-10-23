'use strict';
// ASCII Studio — отдельная утилита для графики игры: смотреть, оживлять и править рисунки из символов.
// Работает на том же движке (js/gfx), что и игра, поэтому всё выглядит ровно так же, как в мире.
(function (E) {
  const Gfx = E.Gfx;
  const $ = (id) => document.getElementById(id);
  const FAMILY = '"JetBrains Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace';
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const R = (s) => (s == null ? '' : Array.isArray(s) ? s.map((x) => String(x).replace(/^\n/, '')).join('\n--\n') : String(s).replace(/^\n/, ''));

  // исходные рисунки — чтобы правку можно было отменить
  const ORIG = {};
  for (const k in Gfx.sprites) { const d = Gfx.sprites[k]; ORIG[k] = { art: d.art, ink: d.ink, pal: Object.assign({}, d.pal), ox: d.ox, oy: d.oy }; }
  let OVR = {};
  try { OVR = JSON.parse(localStorage.getItem(Gfx.OVR_KEY) || '{}') || {}; } catch (e) { OVR = {}; }
  Gfx.applyOverrides();

  const st = { zoom: 15, mode: 0, flip: false, tint: '#9a9a9a', sel: null, tab: 'atlas', filter: '' };
  const GROUP = { player: 'Игрок', people: 'Жители', beasts: 'Существа', bosses: 'Великие', nature: 'Природа', build: 'Постройки и утварь', holy: 'Святыни', fire: 'Огонь', link: 'Переходы', items: 'Вещи на земле', fx: 'Знаки', ground: 'Земля', block: 'Стены и скалы', roof: 'Крыши' };
  const ORDER = Object.keys(GROUP);
  const UNDER = { nature: 'grass', beasts: 'grass', people: 'cobble', player: 'grass', bosses: 'rock', build: 'floor', holy: 'stonefloor', fire: 'rock', link: 'rock', items: 'road', fx: 'rock' };
  const LIVE = new Set(['beasts', 'people', 'player', 'bosses']);

  // ---------- все записи атласа ----------
  function entries() {
    const out = [];
    for (const k in Gfx.sprites) { const d = Gfx.sprites[k]; out.push({ kind: 's', key: k, group: d.group || 'fx', name: d.name || k }); }
    for (const k in Gfx.grounds) out.push({ kind: 'g', key: k, group: 'ground', name: Gfx.grounds[k].name || k });
    for (const k in Gfx.blocks) out.push({ kind: 'b', key: k, group: 'block', name: Gfx.blocks[k].name || k });
    for (const k in Gfx.roofs) out.push({ kind: 'r', key: k, group: 'roof', name: Gfx.roofs[k].name || k });
    out.sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group));
    return out;
  }

  // ---------- маленькая сцена для карточки ----------
  // layout: строки; символ → { g, b, o, e } по legend
  function sceneFor(en, opt) {
    opt = opt || {};
    const S = Gfx.S;
    let rows;
    const legend = {};
    if (en.kind === 's') {
      const sz = Gfx.size(en.key);
      const w = Math.max(opt.minW || 3, Math.ceil(sz.w / 4) + 2), h = Math.max(opt.minH || 2, Math.ceil(sz.h / 2) + 1);
      rows = [];
      for (let j = 0; j < h; j++) rows.push('.'.repeat(w));
      const cx = Math.floor((w - 1) / 2), cy = h - 1;
      rows[cy] = rows[cy].slice(0, cx) + '@' + rows[cy].slice(cx + 1);
      const under = UNDER[en.group] || 'rock';
      legend['.'] = { g: under };
      legend['@'] = LIVE.has(en.group) ? { g: under, e: en.key } : en.group === 'items' ? { g: under, it: en.key } : { g: under, o: en.key };
    } else if (en.kind === 'g') {
      rows = ['...', '...'];
      legend['.'] = { g: en.key };
    } else if (en.kind === 'b') {
      rows = ['BBB', 'B..', '...'];
      legend.B = { b: en.key }; legend['.'] = { g: en.key === 'cliff' || en.key === 'bank' ? 'water' : 'rock' };
      if (en.key === 'bank' || en.key === 'cliff') { rows = ['ggg', 'www', 'www']; legend.g = { g: 'grass' }; legend.w = { g: en.key === 'cliff' ? 'void' : 'water', bank: en.key }; }
    } else {
      rows = ['WWWW', 'WWWW', 'WDWW', '....'];
      legend.W = { b: 'wall', roof: en.key }; legend.D = { b: 'door', roof: en.key }; legend['.'] = { g: 'road' };
    }
    return build(rows, legend, opt);
  }
  function build(rows, legend, opt) {
    const H = rows.length, W = Math.max(...rows.map((r) => r.length));
    const sc = Gfx.sceneBuf(null, W, H + 1);
    sc.tx0 = opt.tx0 || 0; sc.ty0 = opt.ty0 || 0;
    const roofCells = {};
    const at = (x, y) => (y >= 0 && y < H && x >= 0 && x < W ? legend[rows[y][x]] : null);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const L = at(i, j);
      if (!L) continue;
      const k = j * W + i;
      sc.mem[k] = opt.mode === 1 ? 1 : 0;
      if (L.g) sc.g[k] = L.g;
      if (L.bank) sc.bank[k] = j > 0 && !(at(i, j - 1) || {}).bank ? L.bank : null;
      if (L.b) {
        sc.b[k] = L.b;
        const wallish = (q) => q && q.b && Gfx.blocks[q.b] && /wall|window|door/.test(q.b);
        if (/wall|window|door|shelf/.test(L.b)) sc.m[k] = (wallish(at(i, j - 1)) ? 1 : 0) | (wallish(at(i + 1, j)) ? 2 : 0) | (wallish(at(i, j + 1)) ? 4 : 0) | (wallish(at(i - 1, j)) ? 8 : 0);
      }
      if (L.o) { sc.o[k] = L.o; sc.oc[k] = opt.objTint || null; sc.of[k] = 0; }
      if (L.it) sc.it[k] = L.it;
      if (L.roof && !opt.inside) (roofCells[L.roof] = roofCells[L.roof] || []).push([i, j]);
      if (L.e) sc.ents.push({ k: L.e, x: i, y: j, f: opt.frame != null ? opt.frame : Math.floor(performance.now() / 420), mode: opt.mode || 0, c: opt.tint, flip: opt.flip, ring: L.e === 'player' ? '#f0d080' : null, aura: (Gfx.sprites[L.e] || {}).group === 'bosses' ? '#ff2040' : null, big: (Gfx.sprites[L.e] || {}).group === 'bosses' });
      for (const ex of L.ents || []) sc.ents.push(Object.assign({ x: i, y: j, f: Math.floor(performance.now() / 420), mode: opt.mode || 0 }, ex));
    }
    for (const style in roofCells) {
      const cells = roofCells[style];
      const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
      const r = { style, x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1, mem: opt.mode === 1 ? 1 : 0, chim: opt.chim ? [{ x: Math.min(...xs) + 1, y: Math.min(...ys) + 1 }] : null };
      const idx = sc.roofs.length;
      sc.roofs.push(r);
      for (const [i, j] of cells) sc.rf[j * W + i] = idx;
    }
    sc.H = H + 1; // запас снизу под тени
    return sc;
  }
  function paintScene(cv, sc, opt) {
    const S = Gfx.S;
    const wpx = sc.W * S.TW, hpx = (sc.H - 1) * S.TH + S.TH * 0.2 + (opt.top || 0);
    cv.width = Math.ceil(wpx * dpr); cv.height = Math.ceil(hpx * dpr);
    cv.style.width = wpx + 'px'; cv.style.height = hpx + 'px';
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sc.now = performance.now();
    sc.vx0 = 0; sc.vy0 = 0; sc.vw = wpx; sc.vh = hpx;
    sc.px0 = 0; sc.py0 = opt.top || 0;
    sc.shadowA = opt.shadowA != null ? opt.shadowA : 0.45;
    if (opt.ambient) sc.ambient = opt.ambient;
    if (opt.lights) sc.lights = opt.lights;
    if (opt.weather) sc.weather = opt.weather;
    sc.base = opt.base || null;
    Gfx.drawScene(ctx, sc);
  }

  // ---------- атлас ----------
  let cards = [];
  function renderAtlas() {
    const sheet = $('sheet');
    sheet.innerHTML = '';
    cards = [];
    const f = st.filter.trim().toLowerCase();
    let last = null, n = 0;
    for (const en of entries()) {
      if (f && !(en.name.toLowerCase().includes(f) || en.key.includes(f))) continue;
      if (en.group !== last) { const h = document.createElement('div'); h.className = 'grouphead'; h.textContent = GROUP[en.group] || en.group; sheet.appendChild(h); last = en.group; }
      const c = document.createElement('div');
      c.className = 'card' + (OVR[en.key] ? ' mod' : '');
      const cv = document.createElement('canvas');
      const b = document.createElement('b'); b.textContent = en.name;
      const s = document.createElement('small'); s.textContent = en.key;
      c.append(cv, b, s);
      c.onclick = () => { setTab('edit'); select(en); };
      sheet.appendChild(c);
      cards.push({ en, cv });
      n++;
    }
    $('count').textContent = n + ' рисунков';
    drawCards();
  }
  function drawCards() {
    for (const { en, cv } of cards) {
      const r = cv.getBoundingClientRect();
      if (r.bottom < -50 || r.top > innerHeight + 50) continue;
      paintScene(cv, sceneFor(en, { mode: st.mode, flip: st.flip, tint: st.tint, chim: true }), { top: Gfx.S.TH * 0.6 });
    }
  }

  // ---------- редактор ----------
  function renderList() {
    const box = $('list');
    box.innerHTML = '';
    let last = null;
    for (const en of entries()) {
      if (en.group !== last) { const g = document.createElement('div'); g.className = 'g'; g.textContent = GROUP[en.group] || en.group; box.appendChild(g); last = en.group; }
      const d = document.createElement('div');
      d.textContent = en.name;
      d.title = en.key;
      if (st.sel && st.sel.key === en.key && st.sel.kind === en.kind) d.className = 'sel';
      d.onclick = () => select(en);
      box.appendChild(d);
    }
  }
  function select(en) {
    st.sel = en;
    $('ename').textContent = en.name;
    $('ekey').textContent = en.key;
    const editable = en.kind === 's';
    for (const id of ['fart', 'fink', 'fox', 'foy', 'bsave', 'breset', 'bcode']) $(id).disabled = !editable;
    $('procsrc').hidden = editable;
    if (editable) {
      const d = Gfx.sprites[en.key];
      $('fart').value = R(d.art);
      $('fink').value = R(d.ink);
      $('fox').value = d.ox != null ? d.ox : '';
      $('foy').value = d.oy != null ? d.oy : '';
      renderPal(d);
    } else {
      $('fart').value = ''; $('fink').value = ''; $('pal').innerHTML = '';
      const def = en.kind === 'g' ? Gfx.grounds[en.key] : en.kind === 'b' ? Gfx.blocks[en.key] : Gfx.roofs[en.key];
      const src = en.kind === 'g' ? def.fn : en.kind === 'b' ? def.face : def.cell;
      $('procsrc').textContent = 'Этот рисунок строится кодом в js/gfx/art.js (' + (en.kind === 'g' ? 'земля' : en.kind === 'b' ? 'блок' : 'крыша') + ' «' + en.key + '»):\n\n' + (src ? String(src) : '');
    }
    renderList();
    drawPreview();
  }
  function renderPal(d) {
    const box = $('pal');
    box.innerHTML = '';
    const used = new Set([...R(d.ink)].filter((c) => c !== ' ' && c !== '\n' && c !== '-'));
    const keys = [...new Set(Object.keys(d.pal || {}).concat([...used]))];
    for (const k of keys) {
      const v = (d.pal || {})[k] || '';
      const row = document.createElement('div');
      const b = document.createElement('b'); b.textContent = k;
      const col = document.createElement('input'); col.type = 'color'; col.value = /^#[0-9a-f]{6}$/i.test(v) ? v : '#888888'; col.disabled = v[0] === '$';
      const txt = document.createElement('input'); txt.type = 'text'; txt.value = v; txt.title = '$c — цвет существа, $d темнее, $l светлее, $k кожа';
      col.oninput = () => { txt.value = col.value; d.pal = Object.assign({}, d.pal, { [k]: col.value }); live(); };
      txt.onchange = () => { d.pal = Object.assign({}, d.pal, { [k]: txt.value.trim() }); if (/^#[0-9a-f]{6}$/i.test(txt.value.trim())) col.value = txt.value.trim(); col.disabled = txt.value.trim()[0] === '$'; live(); };
      row.append(b, col, txt);
      box.appendChild(row);
    }
  }
  function validate(art, ink) {
    const a = Gfx.parseFrames(art), k = Gfx.parseFrames(ink);
    const warn = [];
    if (k && k.length !== 1 && k.length !== a.length) warn.push('кадров рисунка ' + a.length + ', а цветов ' + k.length);
    a.forEach((fr, n) => {
      const ink2 = k ? k[Math.min(n, k.length - 1)] : null;
      if (!ink2) return;
      fr.forEach((line, j) => { const il = ink2[j] || ''; if ([...line].some((ch, i) => ch !== ' ' && (il[i] == null || il[i] === ' '))) warn.push('кадр ' + (n + 1) + ', ряд ' + (j + 1) + ': у символа нет цвета'); });
    });
    return warn.slice(0, 4).join(' · ');
  }
  function live() {
    const en = st.sel;
    if (!en || en.kind !== 's') return;
    const d = Gfx.sprites[en.key];
    d.art = $('fart').value; d.ink = $('fink').value;
    const ox = $('fox').value, oy = $('foy').value;
    d.ox = ox === '' ? undefined : +ox; d.oy = oy === '' ? undefined : +oy;
    d._c = null;
    Gfx.clearCache();
    $('warn').textContent = validate(d.art, d.ink);
    drawPreview();
  }
  function drawPreview() {
    const en = st.sel;
    if (!en) return;
    paintScene($('preview'), sceneFor(en, { mode: st.mode, flip: st.flip, tint: st.tint, minW: 5, minH: 3, chim: true }), { top: Gfx.S.TH });
    const fr = $('frames');
    fr.innerHTML = '';
    if (en.kind !== 's') return;
    const n = Gfx.frames(en.key);
    if (n < 2) return;
    for (let i = 0; i < n; i++) {
      const cv = document.createElement('canvas');
      fr.appendChild(cv);
      paintScene(cv, sceneFor(en, { mode: st.mode, flip: st.flip, tint: st.tint, frame: i }), { top: Gfx.S.TH * 0.4 });
    }
  }
  function saveOvr() {
    try { localStorage.setItem(Gfx.OVR_KEY, JSON.stringify(OVR)); } catch (e) { $('warn').textContent = 'Не удалось сохранить в браузере: ' + e.message; }
  }
  $('bsave').onclick = () => {
    const en = st.sel; if (!en || en.kind !== 's') return;
    const d = Gfx.sprites[en.key];
    OVR[en.key] = { art: d.art, ink: d.ink, pal: d.pal, ox: d.ox, oy: d.oy };
    saveOvr();
    $('warn').textContent = 'Сохранено. Игра подхватит правку при следующем запуске.';
  };
  $('breset').onclick = () => {
    const en = st.sel; if (!en || en.kind !== 's') return;
    Object.assign(Gfx.sprites[en.key], ORIG[en.key]);
    Gfx.sprites[en.key]._c = null;
    delete OVR[en.key];
    saveOvr();
    Gfx.clearCache();
    select(en);
  };
  $('bcode').onclick = async () => {
    const en = st.sel; if (!en || en.kind !== 's') return;
    const d = Gfx.sprites[en.key];
    const raw = (s) => 'R`\n' + R(s).replace(/\\$/gm, '\\ ') + '`';
    const extra = ['group', 'name', 'shadow', 'bold', 'lift', 'ox', 'oy', 'outline'].filter((k) => d[k] !== undefined).map((k) => k + ': ' + JSON.stringify(d[k])).join(', ');
    const code = "spr('" + en.key + "', { " + extra + ', pal: ' + JSON.stringify(d.pal) + ', art: ' + raw(d.art) + ', ink: ' + raw(d.ink) + ' });';
    const pre = $('procsrc');
    pre.hidden = false; pre.textContent = code;
    try { await navigator.clipboard.writeText(code); $('warn').textContent = 'Код скопирован.'; } catch (e) { $('warn').textContent = 'Код ниже — выдели и скопируй.'; }
  };
  $('bexport').onclick = () => {
    const blob = new Blob([JSON.stringify(OVR, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'eotf-art.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('bimport').onchange = (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    f.text().then((t) => {
      try { const o = JSON.parse(t); if (o && typeof o === 'object') { Object.assign(OVR, o); saveOvr(); Gfx.applyOverrides(); renderAtlas(); if (st.sel) select(st.sel); $('warn').textContent = 'Правки загружены.'; } }
      catch (e) { $('warn').textContent = 'Файл не похож на правки: ' + e.message; }
    });
  };
  for (const id of ['fart', 'fink', 'fox', 'foy']) $(id).addEventListener('input', live);

  // ---------- диорама ----------
  const DIO = [
    'PPPP...TT.....,,,,..T.~~~~~~',
    'PPP..T.....ff.,,,,.....~~~~~',
    'PP.....HHHHHH......w....~~~~',
    'P..b...HHHHHH...........~~~~',
    '.......HHHHHH....T......~~~~',
    '.......HHHDHH..........==~~~',
    'T.........=...........==.~~~',
    '==========================~~',
    '.....c.....=.....s......,,~~',
    '..T........=..........T,,,~~',
    '...........=...a..........~~',
    'ggg.....kk.=.......,,,....~~',
  ];
  function dioScene() {
    const roof = $('roofsel').value;
    const legend = {
      '.': { g: 'grass' }, ',': { g: 'tallgrass' }, f: { g: 'flowers' }, '~': { g: 'water', bank: 'bank' }, '=': { g: 'road' },
      T: { g: 'grass', o: 'tree' }, P: { g: 'grass', o: 'pine' }, b: { g: 'grass', o: 'bush' }, w: { g: 'grass', o: 'well' }, c: { g: 'grass', o: 'campfire' },
      s: { g: 'grass', o: 'shrine' }, a: { g: 'grass', o: 'altar' }, g: { g: 'grass', o: 'grave' }, k: { g: 'stones', o: 'boulder' },
      H: { b: 'wall', roof }, D: { b: 'door', roof },
    };
    // внутри дома — пол и утварь
    if ($('inside').checked) { legend.I = { g: 'floor' }; legend.h = { g: 'floor', o: 'hearth' }; legend.t = { g: 'floor', o: 'table' }; legend.x = { g: 'floor', o: 'chest' }; legend.e = { g: 'floor', o: 'bed' }; }
    const rows = DIO.slice();
    if ($('inside').checked) { rows[3] = rows[3].slice(0, 8) + 'eIIh' + rows[3].slice(12); rows[4] = rows[4].slice(0, 8) + 'ItIx' + rows[4].slice(12); }
    const sc = build(rows, legend, { inside: $('inside').checked, chim: true });
    // жители и звери
    const t = performance.now();
    const walk = (x0, x1, y, speed, off) => { const p = ((t / speed + off) % ((x1 - x0) * 2)); const x = p < x1 - x0 ? x0 + p : x1 - (p - (x1 - x0)); return [x, y, p >= x1 - x0]; };
    const [px, py, pf] = walk(3, 14, 7, 700, 0);
    sc.ents.push({ k: 'player', x: px, y: py, f: Math.floor(t / 180), c: '#c06050', flip: pf, ring: '#f0d080' });
    const [ax, ay, af] = walk(9, 20, 9, 1100, 3);
    sc.ents.push({ k: 'npc_f', x: ax, y: ay, f: 0, c: '#b8a8c8', flip: af });
    sc.ents.push({ k: 'npc_guard', x: 11, y: 6, f: 0, c: '#a8b8d0' });
    sc.ents.push({ k: 'npc_hat', x: 15, y: 4, f: 0, c: '#c8a878' });
    sc.ents.push({ k: 'npc_bard', x: 6, y: 9, f: Math.floor(t / 420), c: '#c8a0a0' });
    sc.ents.push({ k: 'm_deer', x: 20, y: 1, f: 0, c: '#b08a5a', flip: true });
    sc.ents.push({ k: 'm_wolf', x: 1, y: 10, f: Math.floor(t / 300) % 2, c: '#9a9a9a' });
    sc.ents.push({ k: 'm_bat', x: 13, y: 0.5, f: Math.floor(t / 200), c: '#7a6a7a' });
    return sc;
  }
  function drawDio() {
    const sc = dioScene();
    const hour = +$('hour').value;
    $('hourv').textContent = String(Math.floor(hour)).padStart(2, '0') + ':' + String(Math.round((hour % 1) * 60)).padStart(2, '0');
    const L = Math.max(0, Math.min(1, (Math.cos((hour - 12) / 12 * Math.PI) + 0.35) / 1.1));
    const px = sc.ents[0].x, py = sc.ents[0].y;
    paintScene($('dio'), sc, {
      top: Gfx.S.TH, base: '#0c1409', shadowA: 0.12 + 0.36 * L, weather: $('weather').value || null,
      ambient: { col: [6, 10, 30], a: (1 - L) * 0.8 },
      lights: [{ x: px, y: py, r: 5 + L * 20, a: 1, glow: L < 0.5 ? 'rgba(255,170,80,0.16)' : null }, { x: 5, y: 8, r: 4.5, a: 1, glow: 'rgba(255,150,60,0.22)' }, { x: 17, y: 8, r: 1.8, a: 1, glow: 'rgba(255,230,140,0.12)' }],
    });
  }
  for (const k in Gfx.roofs) { const o = document.createElement('option'); o.value = k; o.textContent = Gfx.roofs[k].name || k; $('roofsel').appendChild(o); }

  // ---------- общее ----------
  // в редакторе рисунок крупнее — вдвое против атласа
  function setScale() { Gfx.setScale(st.tab === 'edit' ? Math.round(st.zoom * 2) : st.zoom, dpr, FAMILY); }
  function setTab(tab) {
    st.tab = tab;
    for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('on', b.dataset.tab === tab);
    for (const s of document.querySelectorAll('.tab')) s.classList.toggle('on', s.id === tab);
    setScale();
    if (tab === 'atlas') drawCards();
    if (tab === 'edit') { if (!st.sel) select(entries()[0]); else drawPreview(); }
  }
  for (const b of document.querySelectorAll('#tabs button')) b.onclick = () => setTab(b.dataset.tab);
  $('zoom').oninput = () => { st.zoom = +$('zoom').value; setScale(); redraw(); };
  $('mode').onchange = () => { st.mode = +$('mode').value; redraw(); };
  $('flip').onchange = () => { st.flip = $('flip').checked; redraw(); };
  $('tint').oninput = () => { st.tint = $('tint').value; redraw(); };
  $('search').oninput = () => { st.filter = $('search').value; renderAtlas(); };
  window.addEventListener('scroll', () => { if (st.tab === 'atlas') drawCards(); }, { passive: true });
  function redraw() { if (st.tab === 'atlas') drawCards(); else if (st.tab === 'edit') drawPreview(); else drawDio(); }
  // оживление: огонь, вода, крылья
  setInterval(() => { if (document.hidden) return; if (st.tab === 'atlas') drawCards(); else if (st.tab === 'edit') { if (st.sel) paintScene($('preview'), sceneFor(st.sel, { mode: st.mode, flip: st.flip, tint: st.tint, minW: 5, minH: 3, chim: true }), { top: Gfx.S.TH }); } else drawDio(); }, 160);

  function boot() {
    setScale();
    renderAtlas();
    renderList();
    const h = (location.hash || '').slice(1);
    if (h === 'scene' || h === 'edit') setTab(h);
  }
  E.Studio = { entries, sceneFor, setTab, select };
  const go = () => boot();
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(go); else go();
})(window.EOF);
