'use strict';
// Расчистка проходов. Любая только что построенная карта проверяется:
//  • вещь-препятствие (сундук, могила, колонна, бочка, стол, статуя, дерево…), которая стоит
//    в узком месте и перекрывает путь, отодвигается в сторону (сундук и могила — вместе с
//    содержимым и надписью) или убирается;
//  • в подземельях отрезанные куски (комнаты за глухой стеной, острова среди глубокой воды
//    или лавы) соединяются коротким ходом с остальным подземельем;
//  • место, куда ставят героя при переходе, — не лава, не глубокая вода и не западня.
// Карты строятся из зерна заново при каждом входе, так что расчистка тоже одинакова каждый раз.
(function (E) {
  const MG = E.MapGen, TL = E.TL, T = E.T, U = E.U;
  if (!MG || !MG.build) return;
  const UC = E.Unclog = {};
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  // что мешает пройти, но является вещью, а не стеной
  const OBJ = new Set(['CHEST', 'GRAVE', 'ALTAR', 'STATUE', 'PILLAR', 'BARREL', 'CRATE', 'TABLE', 'ANVIL', 'ALCHTABLE', 'THRONE', 'WELL', 'CAMPFIRE', 'BOULDER',
    'CACTUS', 'CORAL', 'CRYSTAL', 'BIGSHROOM', 'SHRINE', 'INSCRIPTION', 'TREE', 'PINE', 'DEADTREE', 'SAPLING', 'HAY', 'CART', 'RACK', 'WORKBENCH', 'WOODPILE',
    'TROUGH', 'VAT', 'SACK', 'LAMPPOST', 'PILLORY', 'GIBBET', 'PIKE', 'BANNER', 'WAYCROSS', 'BED', 'COUNTER', 'SHELF'].map((k) => T[k]).filter((v) => v != null));
  UC.OBJ = OBJ;
  // переносимое вместе с данными
  const KEEP = new Set([T.CHEST, T.GRAVE, T.ALTAR, T.SHRINE, T.INSCRIPTION, T.STATUE, T.BED, T.TABLE, T.COUNTER, T.ANVIL, T.ALCHTABLE, T.THRONE, T.WELL, T.CAMPFIRE, T.WORKBENCH, T.RACK, T.SHELF].filter((v) => v != null));

  function pass(m, i) {
    const t = TL[m.tiles[i]];
    if (m.feat[i] && m.feat[i].k === 'locked') return true;
    return !!(t && t.walk && !t.lava && !t.fall);
  }
  const inb = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
  // стоит ли вещь в узком месте: её проходимые соседи не связаны между собой в обход неё
  function choke(m, i, extraBlock) {
    const W = m.w, x = i % W, y = (i / W) | 0;
    const nb = [];
    for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (inb(m, nx, ny) && pass(m, ny * W + nx) && (extraBlock == null || ny * W + nx !== extraBlock)) nb.push(ny * W + nx); }
    if (nb.length < 2) return false;
    // быстро: соседи связаны по кольцу из восьми клеток вокруг — не узкое место
    const ring = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
    const rp = ring.map(([dx, dy]) => { const nx = x + dx, ny = y + dy; return inb(m, nx, ny) && pass(m, ny * W + nx) && (extraBlock == null || ny * W + nx !== extraBlock); });
    if (rp.every(Boolean)) return false;
    { // компоненты кольца (оно замкнуто)
      const comp = new Array(8).fill(-1); let c = 0;
      const startK = rp.findIndex((v) => !v);
      for (let s = 1; s <= 8; s++) { const k = (startK + s) % 8; if (!rp[k]) { c++; continue; } comp[k] = c; }
      const cs = new Set([1, 3, 5, 7].filter((k) => rp[k]).map((k) => comp[k]));
      if (cs.size <= 1) return false;
    }
    // поиск в окне вокруг: все соседи достижимы друг от друга, не наступая на i
    const R = 9, seen = new Map(), q = [nb[0]];
    seen.set(nb[0], 1);
    while (q.length) {
      const j = q.pop(), jx = j % W, jy = (j / W) | 0;
      for (const [dx, dy] of D4) {
        const nx = jx + dx, ny = jy + dy;
        if (!inb(m, nx, ny) || Math.abs(nx - x) > R || Math.abs(ny - y) > R) continue;
        const k = ny * W + nx;
        if (k === i || k === extraBlock || seen.has(k) || !pass(m, k)) continue;
        seen.set(k, 1); q.push(k);
      }
    }
    return nb.some((k) => !seen.has(k));
  }
  UC.choke = choke;
  // чем застелить освободившуюся клетку: тем, что вокруг
  function floorOf(m, i) {
    const W = m.w, x = i % W, y = (i / W) | 0, cnt = new Map();
    for (const [dx, dy] of D8) { const nx = x + dx, ny = y + dy; if (!inb(m, nx, ny)) continue; const t = m.tiles[ny * W + nx]; const tl = TL[t]; if (tl.walk && !tl.lava && !tl.link && !OBJ.has(t) && t !== T.UP && t !== T.DOWN && !m.feat[ny * W + nx]) cnt.set(t, (cnt.get(t) || 0) + 1); }
    let best = null, bn = 0;
    for (const [t, n] of cnt) if (n > bn) { bn = n; best = t; }
    return best != null ? best : (m.kind === 'over' ? T.GRASS : T.ROCKFLOOR);
  }
  // свободное место рядом, куда можно переставить вещь, ничего не перекрыв
  function spotFor(m, i) {
    // примеряем, будто вещь уже ушла со старого места
    const old = m.tiles[i];
    m.tiles[i] = floorOf(m, i);
    try { return spotFor0(m, i); } finally { m.tiles[i] = old; }
  }
  function spotFor0(m, i) {
    const W = m.w, seen = new Set([i]), q = [[i, 0]], ind = !!TL[m.tiles[i]].indoor; // в доме — только под той же крышей
    let best = null, bs = -1;
    for (let h = 0; h < q.length && h < 400; h++) {
      const [j, d] = q[h];
      if (d > 8) break;
      const jx = j % W, jy = (j / W) | 0;
      for (const [dx, dy] of D4) {
        const nx = jx + dx, ny = jy + dy;
        if (!inb(m, nx, ny)) continue;
        const k = ny * W + nx;
        if (seen.has(k) || !pass(m, k)) continue;
        seen.add(k); q.push([k, d + 1]);
        const t = m.tiles[k];
        if (m.feat[k] || m.chests[k] || t === T.UP || t === T.DOWN || TL[t].link || TL[t].water || OBJ.has(t)) continue;
        if (m.entry && m.entry.x === nx && m.entry.y === ny) continue;
        if (!!TL[t].indoor !== ind) continue;
        // у стены — как ставят вещи люди; и не в узком месте
        let walls = 0; for (const [ex, ey] of D4) { const ax = nx + ex, ay = ny + ey; if (!inb(m, ax, ay) || !pass(m, ay * W + ax)) walls++; }
        if (walls >= 3) { /* тупик — хорошо, но не первое */ }
        const save = m.tiles[k];
        m.tiles[k] = T.PILLAR; // примерить препятствие
        const bad = choke(m, k) || nearLink(m, k) || (Math.abs(nx - (i % W)) + Math.abs(ny - ((i / W) | 0)) <= 1 && choke(m, i, k));
        m.tiles[k] = save;
        if (bad) continue;
        const score = (walls >= 1 ? 2 : 0) - d * 0.1;
        if (score > bs) { bs = score; best = k; }
      }
    }
    return best;
  }
  function nearLink(m, k) {
    const W = m.w, x = k % W, y = (k / W) | 0;
    for (const [dx, dy] of D8) { const nx = x + dx, ny = y + dy; if (!inb(m, nx, ny)) continue; const j = ny * W + nx, t = m.tiles[j]; if (t === T.UP || t === T.DOWN || t === T.DOOR || (m.feat[j] && m.feat[j].k === 'link')) return true; }
    return false;
  }
  // ---------- 1. вещи в узких местах ----------
  function clearChokes(m) {
    let moved = 0, removed = 0;
    m.moved = m.moved || {};
    for (let pass2 = 0; pass2 < 2; pass2++) {
      for (let i = 0; i < m.tiles.length; i++) {
        const t = m.tiles[i];
        if (!OBJ.has(t)) continue;
        // на открытой земле деревья и камни — природа; трогаем, только если они запирают проход у построек или в подземелье
        if (!choke(m, i)) continue;
        if (KEEP.has(t) || m.chests[i] || (m.feat[i] && m.feat[i].k !== 'link')) {

          const k = spotFor(m, i);
          if (k != null) {
            m.tiles[k] = t;
            if (m.chests[i]) { m.chests[k] = m.chests[i]; delete m.chests[i]; }
            if (m.feat[i]) { m.feat[k] = m.feat[i]; delete m.feat[i]; }
            m.tiles[i] = floorOf(m, i);
            m.moved[i] = k; moved++;
            continue;
          }
        }
        (m.ucKinds = m.ucKinds || {})[TL[t].key] = (m.ucKinds[TL[t].key] || 0) + 1;
        if (m.chests[i]) { // некуда переставить — содержимое на пол
          for (const it of m.chests[i].items || []) m.items.push({ x: i % m.w, y: (i / m.w) | 0, it });
          delete m.chests[i];
        }
        if (m.feat[i] && m.feat[i].k !== 'link') delete m.feat[i];
        m.tiles[i] = floorOf(m, i);
        removed++;
      }
    }
    return [moved, removed];
  }
  // ---------- 2. отрезанные куски подземелья ----------
  function connect(m) {
    if (m.kind === 'over') return 0;
    const W = m.w, H = m.h, N = W * H;
    const start = m.entry ? m.entry.y * W + m.entry.x : -1;
    if (start < 0) return 0;
    const lab = new Int32Array(N).fill(-1);
    const sizes = [];
    let lid = 0;
    for (let s = 0; s < N; s++) {
      if (lab[s] >= 0 || !pass(m, s)) continue;
      const q = [s]; lab[s] = lid; let n = 0;
      for (let h = 0; h < q.length; h++) { const j = q[h]; n++; const x = j % W, y = (j / W) | 0; for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (!inb(m, nx, ny)) continue; const k = ny * W + nx; if (lab[k] < 0 && pass(m, k)) { lab[k] = lid; q.push(k); } } }
      sizes.push(n); lid++;
    }
    const main = lab[start];
    if (main < 0) return 0;
    // важные клетки вне главного куска
    const need = new Set();
    for (let i = 0; i < N; i++) {
      const l = lab[i];
      const imp = m.chests[i] || (m.feat[i] && m.feat[i].k === 'link') || m.tiles[i] === T.UP || m.tiles[i] === T.DOWN;
      if (imp) {
        // сундук сам непроходим: смотрим соседей
        let ok = l === main;
        const x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (inb(m, nx, ny) && lab[ny * W + nx] === main) ok = true; }
        if (!ok) { let cl = l; if (cl < 0) for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (inb(m, nx, ny) && lab[ny * W + nx] >= 0) { cl = lab[ny * W + nx]; break; } } need.add(cl >= 0 ? cl : -2 - i); }
      } else if (l >= 0 && l !== main && sizes[l] >= 6) need.add(l);
    }
    let carved = 0;
    const floor = floorOf(m, start);
    for (const target of need) {
      // путь от куска к главному: через стены дороже, через пол дёшево (0-1 BFS по стоимости)
      const dist = new Float32Array(N).fill(1e9), prev = new Int32Array(N).fill(-1);
      const dq = [];
      for (let i = 0; i < N; i++) if ((target >= 0 && lab[i] === target) || (target < -1 && i === -2 - target)) { dist[i] = 0; dq.push(i); }
      let goal = -1;
      // Дейкстра с малыми весами — карты маленькие
      const pq = dq.slice();
      while (pq.length) {
        let bi = 0; for (let k = 1; k < pq.length; k++) if (dist[pq[k]] < dist[pq[bi]]) bi = k;
        const j = pq[bi]; pq[bi] = pq[pq.length - 1]; pq.pop();
        if (lab[j] === main) { goal = j; break; }
        const x = j % W, y = (j / W) | 0;
        for (const [dx, dy] of D4) {
          const nx = x + dx, ny = y + dy;
          if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
          const k = ny * W + nx, c = pass(m, k) ? 1 : TL[m.tiles[k]].water === 2 ? 2 : 4;
          if (dist[j] + c < dist[k]) { if (dist[k] >= 1e9) pq.push(k); dist[k] = dist[j] + c; prev[k] = j; }
        }
      }
      if (goal < 0) continue;
      for (let k = goal; k >= 0 && dist[k] > 0; k = prev[k]) {
        if (pass(m, k) || m.chests[k] || (m.feat[k] && m.feat[k].k === 'link')) continue;
        const tl = TL[m.tiles[k]];
        m.tiles[k] = tl.water === 2 ? T.SHALLOW : tl.lava ? (T.BASALT != null && TL[T.BASALT].walk ? T.BASALT : floor) : floor;
        carved++;
      }
    }
    return carved;
  }
  // ---------- 3. безопасное место появления ----------
  const fwn0 = MG.findWalkNear;
  const safe = (m, x, y) => {
    if (!inb(m, x, y)) return false;
    const i = y * m.w + x, t = TL[m.tiles[i]];
    if (!t.walk || t.lava || t.fall || t.water === 2 || OBJ.has(m.tiles[i])) return false;
    let n = 0; for (const [dx, dy] of D4) if (inb(m, x + dx, y + dy) && pass(m, (y + dy) * m.w + x + dx)) n++;
    return n >= 1;
  };
  MG.findWalkNear = function (m, x, y) {
    for (let r = 0; r < 40; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (safe(m, x + dx, y + dy)) return { x: x + dx, y: y + dy };
    }
    return fwn0(m, x, y);
  };
  UC.fix = function (m) {
    if (!m || !m.tiles || !m.feat) return null;
    const [moved, removed] = clearChokes(m);
    const carved = connect(m);
    m.unclog = { moved, removed, carved };
    return m.unclog;
  };
  const b0 = MG.build;
  MG.build = function (key) {
    const m = b0.apply(this, arguments);
    try { UC.fix(m); } catch (e) { console.warn('unclog', key, e); }
    return m;
  };
  // старые сохранения: сундук, который мы передвинули, — переезжает вместе с содержимым
  const Gm = E.Gm;
  if (Gm && Gm.loadMap) {
    const l0 = Gm.loadMap;
    Gm.loadMap = function () {
      const r = l0.apply(this, arguments);
      const m = E.G.map;
      if (m && m.moved) for (const a in m.moved) { const b = m.moved[a]; if (m.chests[a] && !m.chests[b] && m.tiles[b] === T.CHEST) { m.chests[b] = m.chests[a]; delete m.chests[a]; } }
      return r;
    };
  }
})(window.EOF);
