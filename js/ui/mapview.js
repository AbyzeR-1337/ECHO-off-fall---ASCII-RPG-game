'use strict';
// Карта игры в графике «ASCII 2.5D»: клетки, существа, крыши, свет и подсказки
// превращаются в описание сцены для движка Gfx (js/gfx). Здесь — только перевод игры в картинку.
(function (E) {
  const U = E.U, T = E.T, TL = E.TL, UI = E.UI, G = E.G, Gfx = E.Gfx, Time = E.Time;

  // ---------- клетка → рисунок ----------
  const N = TL.length;
  const GK = new Array(N).fill(null), BK = new Array(N).fill(null), OK = new Array(N).fill(null), FIX = new Array(N).fill(null);
  const LOW = new Uint8Array(N); // 1 — вода и лава (берег), 2 — пропасть (обрыв)
  const g = (key, ...ids) => ids.forEach((id) => { GK[T[id]] = key; });
  const b = (key, ...ids) => ids.forEach((id) => { BK[T[id]] = key; });
  const o = (key, ...ids) => ids.forEach((id) => { OK[T[id]] = key; });
  g('void', 'VOID'); g('grass', 'GRASS'); g('tallgrass', 'TALLGRASS'); g('flowers', 'FLOWERS'); g('roots', 'ROOTS'); g('sand', 'SAND'); g('dune', 'DUNE');
  g('stones', 'STONES'); g('snow', 'SNOW'); g('drift', 'DRIFT'); g('ice', 'ICE'); g('hill', 'HILL'); g('rock', 'ROCKFLOOR');
  g('floor', 'FLOOR'); g('stonefloor', 'STONEFLOOR'); g('road', 'ROAD'); g('cobble', 'COBBLE'); g('water', 'WATER'); g('shallow', 'SHALLOW');
  g('stream', 'STREAM'); g('swamp', 'SWAMP'); g('bog', 'BOG'); g('lava', 'LAVA'); g('ash', 'ASH'); g('cloud', 'CLOUD'); g('deck', 'BRIDGE', 'DOCK');
  g('rubble', 'RUBBLE'); g('bones', 'BONES'); g('field', 'FIELD'); g('soil', 'SOIL'); g('mirrorwater', 'MIRRORWATER'); g('blacksnow', 'BLACKSNOW');
  g('flesh', 'FLESH'); g('moondust', 'MOONDUST'); g('crater', 'CRATER'); g('dreamfloor', 'DREAMFLOOR'); g('voidfloor', 'VOIDFLOOR'); g('timefloor', 'TIMEFLOOR');
  g('seafloor', 'SEAFLOOR'); g('spiritfloor', 'SPIRITFLOOR'); g('mist', 'MIST'); g('nightgrass', 'NIGHTGRASS'); g('nightflower', 'NIGHTFLOWER');
  b('wall', 'WALL'); b('townwall', 'TOWNWALL'); b('treewall', 'TREEWALL'); b('coralwall', 'CORALWALL'); b('window', 'WINDOW'); b('door', 'DOOR');
  b('cave', 'CAVEWALL'); b('crackwall', 'CRACKWALL'); b('mountain', 'MOUNTAIN'); b('peak', 'PEAK'); b('icerock', 'ICEROCK'); b('basalt', 'BASALT');
  b('ore', 'ORE'); b('bigtree', 'BIGTREE'); b('fleshwall', 'FLESHWALL'); b('dreamwall', 'DREAMWALL'); b('clockwall', 'CLOCKWALL'); b('shelf', 'SHELF');
  o('bush', 'BUSH'); o('tree', 'TREE'); o('pine', 'PINE'); o('deadtree', 'DEADTREE'); o('boulder', 'BOULDER'); o('cactus', 'CACTUS'); o('reeds', 'REEDS');
  o('stairs_down', 'DOWN'); o('stairs_up', 'UP'); o('shrine', 'SHRINE'); o('altar', 'ALTAR'); o('inscription', 'INSCRIPTION'); o('statue', 'STATUE');
  o('pillar', 'PILLAR'); o('grave', 'GRAVE'); o('well', 'WELL'); o('campfire', 'CAMPFIRE'); o('hearth', 'HEARTH'); o('chest', 'CHEST'); o('bed', 'BED');
  o('table', 'TABLE'); o('anvil', 'ANVIL'); o('counter', 'COUNTER'); o('alchtable', 'ALCHTABLE'); o('throne', 'THRONE'); o('crystal', 'CRYSTAL');
  o('mushroom', 'MUSHROOM'); o('bigshroom', 'BIGSHROOM'); o('portal', 'PORTAL'); o('whirlpool', 'WHIRLPOOL'); o('mine', 'MINE'); o('tent', 'TENT');
  o('coral', 'CORAL'); o('sign', 'SIGN'); o('lighthouse', 'LIGHTHOUSE'); o('fern', 'FERN'); o('sapling', 'SAPLING'); o('gate', 'GATE');
  o('chair', 'CHAIR'); o('bench', 'BENCH'); o('outhouse', 'OUTHOUSE');
  FIX[T.CHAIR] = 'floor'; FIX[T.BENCH] = 'floor';
  FIX[T.WHIRLPOOL] = 'water'; FIX[T.GATE] = 'road'; FIX[T.CORAL] = 'seafloor'; FIX[T.REEDS] = 'swamp';
  for (const k of ['WATER', 'SHALLOW', 'STREAM', 'BOG', 'LAVA', 'MIRRORWATER', 'WHIRLPOOL']) LOW[T[k]] = 1;
  LOW[T.VOID] = 2; LOW[T.CLOUD] = 2;
  UI.artOfTile = (id) => GK[id] || BK[id] || OK[id];

  // ---------- существа → рисунок ----------
  const MON = {
    hare: 'm_hare', deer: 'm_deer', boar: 'm_boar', wolf: 'm_wolf', bear: 'm_bear', fox: 'm_fox', rat: 'm_rat', bat: 'm_bat', snake: 'm_snake',
    spider: 'm_spider', scorpion: 'm_scorpion', crab: 'm_crab', croc: 'm_croc', frostwolf: 'm_wolf', mammoth: 'm_mammoth', eagle: 'm_eagle',
    sandworm: 'm_worm', leech: 'm_leech', bandit: 'm_bandit', archer: 'm_archer', cultist: 'm_cultist', deserter: 'm_soldier', soldier: 'm_soldier',
    zombie: 'm_zombie', skeleton: 'm_skeleton', ghoul: 'm_ghoul', wraith: 'm_ghost', drowned: 'm_zombie', blackdead: 'm_zombie', barrowlord: 'm_barrow',
    slime: 'm_slime', golem: 'm_golem', imp: 'm_imp', salamander: 'm_lizard', ashghost: 'm_ghost', troll: 'm_troll', kikimora: 'm_hag', leshy: 'm_leshy',
    treant: 'm_treant', harpy: 'm_harpy', cloudling: 'm_ghost', deepone: 'm_fishman', mushroomer: 'm_shroom', sporelord: 'm_shroombig', madbeast: 'm_wolf',
    bloodwolf: 'm_wolf', hound: 'm_wolf', golem_ice: 'm_golem', mimic: 'm_mimic', nightmare: 'm_nightmare', dreamfish: 'm_fish', voidling: 'm_void',
    reflection: 'm_reflection', mooncrawler: 'm_crawler', timewisp: 'm_wisp', antibody: 'm_blob', spirit: 'm_ghost', abyssal: 'm_herald',
    deepcrawler: 'm_crawler', seaguard: 'm_trident', ally_wolf: 'm_wolf', ally_spirit: 'm_ghost', ally_bones: 'm_skeleton', ally_shade: 'm_reflection',
    ally_golem: 'm_golem', ally_dragonling: 'm_dragonling',
  };
  const FAM = [['dragon', 'm_dragonling'], ['undead', 'm_zombie'], ['spirit', 'm_ghost'], ['plant', 'm_leshy'], ['insect', 'm_spider'], ['stone', 'm_golem'], ['water', 'm_fishman'], ['human', 'm_bandit'], ['beast', 'm_beast']];
  const BOSS = [['dragon', 'b_dragon'], ['god', 'b_god'], ['undead', 'b_undead'], ['spirit', 'b_spirit'], ['plant', 'b_plant'], ['water', 'b_water'], ['stone', 'b_stone'], ['fire', 'b_fire'], ['insect', 'b_insect'], ['human', 'b_human'], ['beast', 'b_beast']];
  const ALWAYS = new Set(['m_bat', 'm_eagle', 'm_harpy', 'm_ghost', 'm_wisp', 'm_void', 'm_slime', 'm_snake', 'm_fish', 'npc_bard', 'm_mimic']);
  const JOB = {
    guard: 'npc_guard', veteran: 'npc_guard', priest: 'npc_hood', monk: 'npc_hood', hermit: 'npc_wander', gravedigger: 'npc_hood', mage: 'npc_mage',
    smith: 'npc_smith', miner: 'npc_smith', farmer: 'npc_hat', shepherd: 'npc_hat', laborer: 'npc_hat', woodcutter: 'npc_hat', potter: 'npc_hat', weaver: 'npc_hat',
    fisher: 'npc_fisher', boatman: 'npc_fisher', hunter: 'npc_hunter', merchant: 'npc_trader', innkeeper: 'npc_trader', baker: 'npc_trader', caravaneer: 'npc_trader',
    noble: 'npc_noble', ruler: 'npc_noble', bard: 'npc_bard', beggar: 'npc_beggar', librarian: 'npc_scholar', scholar: 'npc_scholar',
    healer: 'npc_healer', herbalist: 'npc_healer', alchemist: 'npc_healer', wanderer: 'npc_wander', shadow: 'npc_wander', elder: 'npc_elder', child: 'npc_child',
  };
  function entArt(e) {
    if (e.kind === 'npc') {
      const n = E.Gm.npc(e.npc);
      const age = E.Sim.age(e.npc);
      if (e.job === 'child' || age < 13) return 'npc_child';
      const k = JOB[e.job];
      if (k) return k;
      if (age >= 62) return 'npc_elder';
      return n && n.sex === 'f' ? 'npc_f' : 'npc_m';
    }
    if (e.kind === 'boss') {
      if (e.boss === 'b_mirror') return 'player';
      for (const [t, k] of BOSS) if (e.tags && e.tags.includes(t)) return k;
      return 'b_other';
    }
    if (MON[e.tpl]) return MON[e.tpl];
    for (const [t, k] of FAM) if (e.tags && e.tags.includes(t)) return k;
    return 'm_thing';
  }
  UI.entArt = entArt;
  const ITEM = { weapon: 'item_weapon', armor: 'item_armor', food: 'item_food', potion: 'item_potion', book: 'item_book', gold: 'item_gold', trinket: 'item_trinket', tool: 'item_tool', misc: 'item_misc', mat: 'item_mat', art: 'item_art' };
  const itemArt = (it) => { const t = it.t || (E.D.items[it.b] && E.D.items[it.b].t) || 'misc'; return (it.b && it.b.startsWith('a_')) || it.art ? 'item_art' : ITEM[t] || 'item_misc'; };

  // цвет одежды игрока по пути
  const CLS = { warrior: '#c06050', ranger: '#5a9a50', assassin: '#6a6a8a', mage: '#6a7ad0', priest: '#e0d090', alchemist: '#60b0a0', wanderer: '#b09060' };

  // ---------- крыши ----------
  const ROOF = { home: null, tavern: 'tiles', temple: 'temple', palace: 'palace', guard: 'slate', smithy: 'slate', library: 'wood', alch: 'tiles' };
  const HOMEROOF = ['thatch', 'thatch', 'wood', 'tiles'];
  function roofsOf(m) {
    if (m._roofs !== undefined) return m._roofs;
    const out = [];
    for (const bd of m.blds || []) {
      const r = bd.rect;
      if (r.w < 3 || r.h < 3) continue;
      let style = ROOF[bd.type];
      if (!style) style = m.biome === 'mountain' || m.biome === 'tundra' || m.biome === 'ice' ? 'slate' : m.biome === 'forest' || m.biome === 'ancient' ? 'wood' : HOMEROOF[(r.x * 7 + r.y * 13) % HOMEROOF.length];
      let chim = null;
      for (let y = r.y + 1; y < r.y + r.h - 1 && !chim; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) if (m.tiles[y * m.w + x] === T.HEARTH) { chim = { x, y: r.y + ((r.h - 1) >> 1) }; break; }
      out.push({ rect: r, style, chim, door: bd.door });
    }
    m._roofs = out;
    return out;
  }
  // крыша цела, пока стоят углы дома
  const roofIntact = (m, r) => [[r.x, r.y], [r.x + r.w - 1, r.y], [r.x, r.y + r.h - 1], [r.x + r.w - 1, r.y + r.h - 1]].every(([x, y]) => TL[m.tiles[y * m.w + x]].auto);

  // ---------- соединения стен ----------
  function wallMask(m, x, y) {
    const open = (xx, yy) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const a = xx + dx, c = yy + dy;
        if (a < 0 || c < 0 || a >= m.w || c >= m.h) continue;
        const t = TL[m.tiles[c * m.w + a]];
        if (!t.auto && !t.conn) return true;
      }
      return false;
    };
    const conn = (xx, yy) => {
      if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) return false;
      const t = TL[m.tiles[yy * m.w + xx]];
      if (t.conn) return true;
      return !!t.auto && open(xx, yy);
    };
    return (conn(x, y - 1) ? 1 : 0) | (conn(x + 1, y) ? 2 : 0) | (conn(x, y + 1) ? 4 : 0) | (conn(x - 1, y) ? 8 : 0);
  }

  // ---------- плавное движение ----------
  const DUR = 110;
  const tw = new Map();
  let twKey = null;
  const curPos = (s, now) => { const k = s.t0 ? Math.min(1, (now - s.t0) / DUR) : 1; return [s.fx + (s.x - s.fx) * k, s.fy + (s.y - s.fy) * k, k < 1]; };
  function track(id, x, y, now) {
    let s = tw.get(id);
    if (!s) { s = { x, y, fx: x, fy: y, t0: 0, flip: false, step: 0, seen: now }; tw.set(id, s); }
    s.seen = now;
    if (s.x !== x || s.y !== y) {
      const [cx, cy] = curPos(s, now);
      if (Math.abs(x - cx) > 1.6 || Math.abs(y - cy) > 1.6) { s.fx = x; s.fy = y; s.t0 = 0; }
      else { s.fx = cx; s.fy = cy; s.t0 = now; UI.animUntil = Math.max(UI.animUntil || 0, now + DUR + 20); }
      if (x < s.x) s.flip = true; else if (x > s.x) s.flip = false;
      s.x = x; s.y = y; s.step++;
    }
    return s;
  }

  // ---------- масштаб ----------
  UI.zoomK = (() => { try { const v = parseFloat(localStorage.getItem('eotf_zoom')); return v > 0.4 && v < 3 ? v : 1; } catch (e) { return 1; } })();
  UI.zoom = function (dir) {
    UI.zoomK = U.clamp(Math.round((UI.zoomK + dir * 0.1) * 10) / 10, 0.6, 2);
    try { localStorage.setItem('eotf_zoom', String(UI.zoomK)); } catch (e) { /* только на эту сессию */ }
    E.Gm.msg('Масштаб: ' + Math.round(UI.zoomK * 100) + '%', '#808090');
    UI.render();
  };
  function scaleFor(t, L) {
    const mapW = L.mw * t.cw;
    const target = L.wide ? 30 : 14;
    const auto = mapW / (target * 2.4);
    return Math.max(6, Math.min(30, Math.round(auto * UI.zoomK)));
  }

  // ---------- освещение по месту ----------
  const DIM_AMB = { dream: [[26, 12, 44], 0.5], spirit: [[0, 26, 24], 0.55], void: [[6, 6, 16], 0.68], time: [[26, 20, 6], 0.42], moon: [[12, 12, 28], 0.42], flesh: [[34, 4, 12], 0.58], sea: [[0, 12, 34], 0.62], depths: [[26, 8, 0], 0.72], mirror: [[20, 24, 36], 0.3] };
  const LIGHTS = { [T.CAMPFIRE]: [4.5, 'rgba(255,150,60,0.22)'], [T.HEARTH]: [3.5, 'rgba(255,140,50,0.2)'], [T.LAVA]: [1.6, 'rgba(255,90,20,0.1)'], [T.PORTAL]: [3, 'rgba(190,110,255,0.2)'], [T.CRYSTAL]: [2, 'rgba(150,110,255,0.16)'], [T.WHIRLPOOL]: [2, 'rgba(100,160,255,0.12)'], [T.LIGHTHOUSE]: [6, 'rgba(255,240,180,0.18)'], [T.NIGHTFLOWER]: [1.2, 'rgba(160,176,255,0.1)'], [T.ALTAR]: [1.6, 'rgba(255,200,120,0.12)'], [T.SHRINE]: [1.8, 'rgba(255,230,140,0.12)'] };

  // огни для «почти реальности»: цвет, сила, радиус, мерцание
  const HLIGHT = {
    [T.CAMPFIRE]: [[1, 0.58, 0.24], 1.7, 6.5, 1], [T.HEARTH]: [[1, 0.55, 0.22], 1.4, 5, 1], [T.LAVA]: [[1, 0.35, 0.1], 0.7, 2.6, 0],
    [T.PORTAL]: [[0.75, 0.45, 1], 1.2, 4.5, 0], [T.CRYSTAL]: [[0.6, 0.45, 1], 0.8, 3, 0], [T.LIGHTHOUSE]: [[1, 0.95, 0.7], 2, 10, 0],
    [T.NIGHTFLOWER]: [[0.6, 0.7, 1], 0.45, 1.8, 0], [T.ALTAR]: [[1, 0.75, 0.4], 0.8, 2.8, 1], [T.SHRINE]: [[1, 0.9, 0.5], 0.8, 3.2, 0], [T.WHIRLPOOL]: [[0.4, 0.6, 1], 0.5, 2.5, 0],
  };
  const OBJH = Gfx.HF ? Gfx.HF.OBJH : {};
  UI.objHeight = (k) => OBJH[k] || 0.4;

  // ---------- уровень графики: 0 — символы, 1 — рисунок, 2 — свет и тень, 3–5 — «почти реальность» ----------
  const FAMILY = () => (UI.t && UI.t.family) || 'monospace';
  let SC = null, rafOn = false;
  UI.mvCursor = null;
  UI.drawMapGfx = function (t, L) {
    const m = G.map, P = G.P;
    const now = performance.now();
    const lvl = UI.gfxLevel || 1;
    const hifi = lvl >= 3 && Gfx.HF;
    if (twKey !== m.key) { tw.clear(); twKey = m.key; }
    const vx0 = L.mx * t.cw, vy0 = L.my * t.ch, vw = L.mw * t.cw, vh = L.mh * t.ch;
    let TW, TH, hsz = null;
    if (hifi) { hsz = Gfx.HF.tileSize(lvl, UI.zoomK, t.dpr || 1, vw); TW = hsz.TW; TH = hsz.TH; }
    else { Gfx.setScale(scaleFor(t, L), t.dpr || 1, t.family); TW = Gfx.S.TW; TH = Gfx.S.TH; }
    const vwT = vw / TW, vhT = vh / TH;
    // камера следует за плавной позицией игрока
    const ps = track('P', P.x, P.y, now);
    const [ppx, ppy] = curPos(ps, now);
    const camX = m.w <= vwT ? (m.w - vwT) / 2 : U.clamp(ppx + 0.5 - vwT / 2, 0, m.w - vwT);
    const camY = m.h <= vhT ? (m.h - vhT) / 2 : U.clamp(ppy + 0.5 - vhT / 2, 0, m.h - vhT);
    const tx0 = Math.floor(camX) - 2, ty0 = Math.floor(camY) - 1;
    const W = Math.ceil(vwT) + 5, H = Math.ceil(vhT) + 5;
    const sc = SC = Gfx.sceneBuf(SC, W, H);
    sc.now = now; sc.tx0 = tx0; sc.ty0 = ty0; sc.vx0 = vx0; sc.vy0 = vy0; sc.vw = vw; sc.vh = vh;
    sc.px0 = vx0 + (tx0 - camX) * TW; sc.py0 = vy0 + (ty0 - camY) * TH;
    UI.mv = { vx0, vy0, camX, camY, TW, TH, L };
    const Lt = Time.light(G.S.time);
    const season = E.Gm.season();
    const cold = m.region && m.region.t < 0.55;
    const items = new Map();
    for (const it of m.items) items.set(it.y * m.w + it.x, it.it);
    // крыши: те, под которыми нет игрока
    const roofs = roofsOf(m);
    const inRect = (r, x, y) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    for (const rf of roofs) {
      const r = rf.rect;
      if (inRect(r, P.x, P.y) || !roofIntact(m, r)) continue;
      if (r.x + r.w < tx0 || r.y + r.h < ty0 || r.x > tx0 + W || r.y > ty0 + H) continue;
      let seen = false, visible = false;
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { const i = y * m.w + x; if (G.vis[i]) visible = true; if (m.ex[i] || G.vis[i]) seen = true; }
      if (!seen) continue;
      const idx = sc.roofs.length;
      sc.roofs.push({ style: rf.style, x: r.x - tx0, y: r.y - ty0, w: r.w, h: r.h, mem: visible ? 0 : 1, chim: rf.chim ? [{ x: rf.chim.x - tx0, y: rf.chim.y - ty0 }] : null });
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
        const i = x - tx0, j = y - ty0;
        if (i >= 0 && j >= 0 && i < W && j < H) sc.rf[j * W + i] = idx;
      }
    }
    // клетки
    let gnd = m._gndKey;
    if (!gnd) {
      const cnt = new Map();
      for (let q = 0; q < m.tiles.length; q += 3) { const k = GK[m.tiles[q]]; if (k && TL[m.tiles[q]].walk && !LOW[m.tiles[q]]) cnt.set(k, (cnt.get(k) || 0) + 1); }
      let bn = 0; gnd = 'grass';
      for (const [k, n] of cnt) if (n > bn) { bn = n; gnd = k; }
      m._gndKey = gnd;
    }
    const groundOf = (tid) => {
      let k = GK[tid];
      if (k === 'grass') { if (season === 2 && m.biome !== 'desert') k = 'grass_dry'; else if (season === 3 && cold && m.outdoor) k = 'grass_frost'; }
      else if (k === 'field' && season === 3) k = 'field_bare';
      return k;
    };
    const under = (x, y, tid) => {
      if (FIX[tid]) return FIX[tid];
      if (TL[tid].indoor) return 'floor';
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
        const a = x + dx, c = y + dy;
        if (a < 0 || c < 0 || a >= m.w || c >= m.h) continue;
        const t2 = m.tiles[c * m.w + a];
        if (GK[t2] && !LOW[t2]) return groundOf(t2);
      }
      return gnd;
    };
    // общая почва карты: её цвет лежит под всеми естественными текстурами
    sc.base = Gfx.grounds[gnd] && (Gfx.grounds[gnd].base || Gfx.grounds[gnd].bg) || null;
    const fol = season === 2 ? ['#c08a30', '#b05a2a', '#c8a040'] : season === 0 ? ['#5a9a40', '#4a8a3a'] : ['#3e7b34', '#4a8a3c'];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = tx0 + i, y = ty0 + j;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      const mi = y * m.w + x, k = j * W + i;
      const vis = G.vis[mi], ex = m.ex[mi];
      if (!vis && !ex) continue;
      const tid = m.tiles[mi];
      sc.mem[k] = vis ? 0 : 1;
      if (BK[tid]) { sc.b[k] = BK[tid]; sc.m[k] = TL[tid].auto || TL[tid].conn ? wallMask(m, x, y) : 0; }
      else if (OK[tid]) {
        sc.g[k] = under(x, y, tid);
        let ok = OK[tid];
        const h = (x * 7 + y * 13) % 5;
        if (ok === 'tree') { if (season === 3 && cold) ok = 'tree_bare'; else { ok = h < 2 ? 'tree2' : 'tree'; sc.oc[k] = fol[(x + y * 3) % fol.length]; } }
        else if (ok === 'pine') { if ((season === 3 && cold) || m.biome === 'ice' || m.biome === 'tundra') ok = 'pine_snow'; else sc.oc[k] = (x + y) % 3 ? '#2e6b55' : '#3a7a5a'; }
        sc.o[k] = ok; sc.of[k] = (x * 3 + y) & 7;
      } else sc.g[k] = groundOf(tid) || gnd;
      if (LOW[tid] && y > 0) {
        const nt = m.tiles[mi - m.w];
        if (!LOW[nt] && !BK[nt] && (G.vis[mi - m.w] || m.ex[mi - m.w])) sc.bank[k] = LOW[tid] === 2 ? 'cliff' : 'bank';
      }
      if (vis) {
        const it = items.get(mi);
        if (it) sc.it[k] = itemArt(it);
        const lc = LIGHTS[tid];
        if (lc && sc.lights.length < 40) sc.lights.push({ x: i, y: j, r: lc[0], a: 1, glow: lc[1], tid });
      }
    }
    // существа
    const reveal = G.revealUntil && G.turn < G.revealUntil;
    const seenIds = new Set();
    for (const e of m.ents) {
      if (e.dead) continue;
      const mi = e.y * m.w + e.x;
      const vis = G.vis[mi];
      if (!vis && !(reveal && e.kind !== 'npc')) continue;
      const i = e.x - tx0, j = e.y - ty0;
      if (i < -2 || j < -2 || i > W + 1 || j > H + 1) continue;
      if (i >= 0 && j >= 0 && i < W && j < H && sc.rf[j * W + i] >= 0) continue; // под крышей не видно
      const s = track(e.id, e.x, e.y, now);
      seenIds.add(e.id);
      const [fx, fy, moving] = curPos(s, now);
      const key = entArt(e);
      const nf = Gfx.frames(key);
      let f = 0;
      if (nf > 1) f = ALWAYS.has(key) ? Math.floor((now + e.id * 137) / 420) : moving ? 1 : 0;
      // кадр объёмной модели: шаг — ноги попеременно, крылья и призраки — всегда в движении
      const hf = ALWAYS.has(key) || key.startsWith('b_') ? Math.floor((now + e.id * 137) / 180) : moving ? (s.step % 2 ? 1 : 3) : 0;
      let mode = vis ? 0 : 2, alpha = 1;
      if (e.ghost || (e.kind === 'npc' && e.ai === 'wander' && e.immortal)) { mode = 4; alpha = 0.75; }
      if (e.tpl === 'ally_shade') alpha = 0.7;
      if (e.boss === 'b_mirror' || e.tpl === 'reflection') mode = vis ? 5 : 2;
      let c = e.c;
      if (e.kind === 'npc' && e.hostile) c = '#e07060';
      if (e.ally) c = e.c || '#90f090';
      if (e.asleep) c = U.shade(c, 0.7);
      sc.ents.push({ k: key, x: fx - tx0, y: fy - ty0, f, hf, moving, id: e.id, mode, c, flip: s.flip, alpha, sleep: !!e.asleep && vis, aura: e.kind === 'boss' ? '#ff2040' : e.ally ? '#60ff80' : null, big: e.kind === 'boss' });
    }
    // игрок
    const hit = G.hitFlash && now - G.hitFlash < 160;
    const [, , pmov] = curPos(ps, now);
    const pc = CLS[P.cls] || (P.cls ? '#b090d0' : '#c8a060');
    sc.ents.push({ k: 'player', x: ppx - tx0, y: ppy - ty0, f: pmov ? 1 : 0, hf: pmov ? (ps.step % 2 ? 1 : 3) : 0, moving: pmov, id: 0, mode: hit ? 3 : 0, c: pc, flip: ps.flip, ring: '#f0d080' });
    // забыть тех, кого давно не видно
    if (tw.size > 400) for (const [id, s] of tw) if (id !== 'P' && now - s.seen > 4000) tw.delete(id);
    // свет
    const r = E.Gm.fovRadius();
    sc.lights.push({ x: ppx - tx0, y: ppy - ty0, r: r + 1.5, a: 1, glow: P.light > 0 ? 'rgba(255,170,80,0.16)' : null });
    if (m.dimName && DIM_AMB[m.dimName]) sc.ambient = { col: DIM_AMB[m.dimName][0], a: DIM_AMB[m.dimName][1] };
    else if (m.outdoor) sc.ambient = { col: m.tint === 'night' ? [10, 14, 44] : [6, 10, 30], a: Math.max(m.tint === 'night' ? 0.45 : 0, (1 - Lt) * 0.8) };
    else sc.ambient = { col: m.tint === 'abyss' ? [30, 0, 12] : [0, 0, 0], a: 0.84 };
    sc.shadowA = m.outdoor && !m.dimName ? 0.12 + 0.36 * Lt : 0.3;
    // погода
    const w = E.Gm.weather();
    if (m.outdoor && !m.dimName) { sc.weather = w; const storm = (w === 'storm' && Math.random() < 0.012) || (G.flashSky && now - G.flashSky < 120); if (storm && !G.flashSky) G.flashSky = now; if (G.flashSky && now - G.flashSky > 120) G.flashSky = 0; sc.storm = !!storm; }
    // вспышки умений
    if (G.fxFlash && now - G.fxFlash.t < 420) sc.fx.push({ x: G.fxFlash.x - tx0, y: G.fxFlash.y - ty0, r: G.fxFlash.r, el: G.fxFlash.el, life: 1 - (now - G.fxFlash.t) / 420 });
    // для теней и «почти реальности»: высоты клеток, огни, небо
    if (lvl >= 2) {
      const { Hm, Hs } = Gfx.HF.heightsFor(sc);
      const sky = { time: G.S.time, outdoor: !!m.outdoor, dim: m.dimName || null, weather: m.outdoor && !m.dimName ? w : null, season, cold, fullMoon: E.Gm.fullMoon(), nightland: m.tint === 'night', abyss: m.tint === 'abyss', heights: Hm, hshape: Hs };
      if (lvl === 2 && m.outdoor && !m.dimName) sc.shade = sky;
      if (hifi) {
        const hl = [];
        for (const l of sc.lights) { const d = HLIGHT[l.tid]; if (d && hl.length < 40) hl.push({ x: l.x + 0.5, y: l.y + 0.5, z: 0.5, r: d[2], col: d[0], i: d[1], fl: d[3] }); }
        // свет у игрока: факел — тёплый; ночью и под землёй без факела — тусклое «зрение», чтобы видеть рядом
        const dark = !m.outdoor || m.dimName ? 1 : 1 - Lt;
        if (P.light > 0) hl.push({ x: ppx - tx0 + 0.5, y: ppy - ty0 + 0.5, z: 0.9, r: r + 3, col: [1, 0.7, 0.4], i: 1.5, fl: 1 });
        else if (dark > 0.2) hl.push({ x: ppx - tx0 + 0.5, y: ppy - ty0 + 0.5, z: 1.2, r: r + 1.5, col: [0.55, 0.6, 0.8], i: 0.55 * dark });
        sc.hlights = hl;
        Object.assign(sky, { level: lvl, CX: hsz.CX, CY: hsz.CY, cw: hsz.cw, ch: hsz.ch, dpr: t.dpr || 1, family: t.family });
        UI._hs = sky;
      }
    }
    // курсор осмотра ставит экран осмотра
    UI.mvCursor = null;
    const hsNow = UI._hs;
    t.under = (ctx) => {
      sc.cursor = UI.mvCursor ? [UI.mvCursor[0] - tx0, UI.mvCursor[1] - ty0] : null;
      if (hifi) {
        Gfx.HF.render(ctx, sc, hsNow);
        // не всё успело нарисоваться — дорисовать в следующем кадре
        if (Gfx.HF.pending && !rafOn) { rafOn = true; requestAnimationFrame(() => { rafOn = false; UI.render(); }); }
      } else Gfx.drawScene(ctx, sc);
    };
    // пока кто-то идёт — рисуем чаще
    if (UI.animUntil > now && !rafOn) { rafOn = true; requestAnimationFrame(() => { rafOn = false; UI.render(); }); }
    return { tx0, ty0, W, H };
  };
  // клетка мира под точкой экрана
  UI.mvTileAt = function (px, py) {
    const v = UI.mv;
    if (!v) return null;
    return [Math.floor((px - v.vx0) / v.TW + v.camX), Math.floor((py - v.vy0) / v.TH + v.camY)];
  };
  // прямоугольник клетки мира на экране (для подсказок)
  UI.mvRect = function (x, y) {
    const v = UI.mv;
    return { x: Math.round(v.vx0 + (x - v.camX) * v.TW), y: Math.round(v.vy0 + (y - v.camY) * v.TH), w: v.TW, h: v.TH };
  };

  // ---------- подсказка [E] ----------
  // list: [{ x, y, main, dy, self, tall }] в клетках мира; rect(x, y) — где клетка на экране
  UI.drawBadges = function (ctx, t, list, rect, clip) {
    ctx.save();
    ctx.beginPath(); ctx.rect(clip.x, clip.y, clip.w, clip.h); ctx.clip();
    const fpx = Math.max(9, Math.round(t.fpx * 0.82));
    ctx.font = '700 ' + fpx + 'px ' + t.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const cw = ctx.measureText('M').width;
    const bw = Math.round(cw * 3.2), bh = Math.round(fpx * 1.3);
    for (const o of list) {
      const r = rect(o.x, o.y);
      if (!r) continue;
      const lift = o.self ? r.h * 0.55 : o.tall ? r.h * 0.6 : 0;
      const x = Math.round(r.x + r.w / 2 - bw / 2);
      const y = o.dy === 1 && !o.self ? Math.round(r.y + r.h + 1) : Math.round(r.y - bh - 1 - lift);
      ctx.globalAlpha = o.main ? 1 : 0.6;
      ctx.fillStyle = 'rgba(8,6,4,0.82)'; ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = o.main ? '#ffe080' : '#a08850';
      ctx.fillText('[', x + cw * 0.55, y + bh / 2 + 1); ctx.fillText(']', x + bw - cw * 0.55, y + bh / 2 + 1);
      ctx.fillStyle = o.main ? '#ffffff' : '#f0c060';
      ctx.fillText('E', x + bw / 2, y + bh / 2 + 1);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };
  // для мира от первого лица (js/ui/view3d.js)
  UI.mvTiles = { GK, BK, OK, FIX, LOW, roofsOf, roofIntact, entArt, itemArt, track, curPos, HLIGHT, ALWAYS, CLS, DIM_AMB };
  UI.tallAt = (x, y) => { const m = G.map, tid = m.tiles[y * m.w + x]; const k = BK[tid] || OK[tid]; if (!k) return false; if (BK[tid]) return true; if (UI.gfxLevel >= 3) return (OBJH[k] || 0.4) > 0.8; const sz = Gfx.size(k); return sz && sz.h > 2; };
  // кнопка «Действие» на сенсорной панели загорается, когда есть очевидное дело
  let actBtn, actOn = null;
  UI.syncAct = function (on) {
    if (actOn === on) return;
    actOn = on;
    if (!actBtn) actBtn = document.querySelector('#touch [data-k="act"]');
    if (actBtn) actBtn.classList.toggle('ready', on);
  };
})(window.EOF);
