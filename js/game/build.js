'use strict';
// Свой дом. Купи чертёж (в мастерской или у торговца инструментом), выбери место за околицей или в глуши
// и строй по шагам: фундамент из тёсаного камня, сруб, крыша, обустройство (очаг, кровать, стол, сундук).
// Каждому шагу нужны припасы — брёвна (руби лес топором), гвозди (кузнец), тёсаный камень (каменоломни,
// мастерские, кирка в скалах) — и умение: оно растёт от работы за верстаком, от каждого готового шага
// и от уроков старосты, кузнеца или подёнщика. В своём доме спится лучше всего, а сундук — только твой.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, UI = E.UI, Dlg = E.Dlg, Items = E.Items, MG = E.MapGen;
  const BU = E.Build = {};
  const it = (id, n, g, t, o) => { if (!D.items[id]) D.items[id] = Object.assign({ id, n, g, t, w: 1, v: 1, d: '' }, o); };
  it('house_plan', 'Чертёж дома', 'm', 'tool', { w: 0.1, v: 40, d: 'Береста с размеченным срубом: пять шагов на четыре, печь в углу, дверь к солнцу. Используй там, где хочешь строиться.' });
  it('stone_block', 'Тёсаный камень', 'm', 'mat', { w: 3, v: 3, st: 1, d: 'Ровный камень для фундамента и печи.' });
  it('nails', 'Гвозди', 'p', 'mat', { w: 0.05, v: 1, st: 1, d: 'Кованые гвозди. Без них сруб стоит, а крыша — нет.' });
  const SH = Dlg.SHOP;
  const add = (k, list) => { if (SH[k]) for (const b of list) if (D.items[b]) SH[k].push(b); };
  add('tools', ['house_plan', 'nails', 'nails', 'stone_block', 'wood', 'wood']);
  add('smith', ['nails', 'nails', 'nails']);
  add('general', ['nails', 'wood']);
  add('junk', ['nails', 'house_plan']);
  // кирка в скалах иногда даёт тёсаный камень
  const mine0 = Gm.mine;
  Gm.mine = function (x, y) { const r = mine0.apply(this, arguments); if (Math.random() < 0.35) Gm.give('stone_block', 1, true); return r; };

  const STAGES = [
    { n: 'Фундамент', need: { stone_block: 6 }, skill: 0, turns: 60, d: 'Разметить углы, выкопать канаву, уложить камень.' },
    { n: 'Сруб', need: { wood: 14, nails: 8 }, skill: 2, turns: 120, d: 'Венец за венцом поднять стены, оставить проём под дверь и окна.' },
    { n: 'Крыша', need: { wood: 8, nails: 6 }, skill: 4, turns: 90, d: 'Стропила, обрешётка, дранка — чтобы не капало на голову.' },
    { n: 'Обустройство', need: { wood: 6, nails: 4, stone_block: 2 }, skill: 6, turns: 90, d: 'Сложить очаг, сколотить кровать, стол и сундук.' },
  ];
  BU.STAGES = STAGES;
  BU.skill = function () { const P = G.P; return Math.floor((P.c.build_stage || 0) + (P.c.crafts || 0) * 0.4 + (P.flags.buildLessons || 0) * 3); };
  const W0 = 7, H0 = 6;
  const groundOf = (m) => (m.biome === 'desert' ? T.SAND : m.biome === 'tundra' || m.biome === 'ice' ? T.SNOW : T.GRASS);
  function okCell(m, x, y) {
    if (x < 2 || y < 2 || x >= m.w - 2 || y >= m.h - 2) return 0;
    const i = y * m.w + x, t = m.tiles[i], L = TL[t];
    if (m.feat[i] || m.chests[i] || (m.stalls && m.stalls[i]) || L.water || L.link || L.indoor || L.lava) return 0;
    if ([T.ROAD, T.COBBLE, T.DOOR, T.GATE, T.BRIDGE, T.DOCK, T.FIELD, T.WALL, T.TOWNWALL, T.PALISADE, T.MOUNTAIN, T.PEAK, T.CAVEWALL, T.SCAFFOLD].includes(t)) return 0;
    if (m.ents.some((e) => !e.dead && e.x === x && e.y === y)) return 0;
    return L.walk ? 2 : (L.wood || [T.BUSH, T.BOULDER, T.STONES].includes(t)) ? 1 : 0;
  }
  function fits(m, x0, y0) {
    const sr = m.settRect;
    if (sr && x0 + W0 > sr.x - 2 && x0 < sr.x + sr.w + 2 && y0 + H0 > sr.y - 2 && y0 < sr.y + sr.h + 2) return false;
    let w = 0;
    for (let y = y0 - 1; y <= y0 + H0; y++) for (let x = x0 - 1; x <= x0 + W0; x++) { const k = okCell(m, x, y); if (!k) return false; if (k === 2) w++; }
    return w >= (W0 + 2) * (H0 + 2) * 0.7;
  }
  BU.start = function (plan) {
    const P = G.P, m = G.map;
    if (!m || m.kind !== 'over' || m.dimName) { Gm.msg('Здесь строиться нельзя: нужна земля под открытым небом.', '#e0a070'); return; }
    if (G.S.build && !G.S.build.done) { Gm.msg('У тебя уже начата стройка. Закончи её сначала.', '#e0a070'); return; }
    const d = G.faceDir || [0, 1];
    const cx = P.x + d[0] * 5, cy = P.y + d[1] * 4;
    let best = null;
    for (let r = 0; r <= 7 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x0 = cx + dx - (W0 >> 1), y0 = cy + dy - (H0 >> 1);
      if (x0 <= P.x && P.x < x0 + W0 && y0 <= P.y && P.y < y0 + H0) continue;
      if (fits(m, x0, y0)) { best = { x: x0, y: y0 }; break; }
    }
    if (!best) { Gm.msg('Здесь не развернуться: нужна ровная площадка семь шагов на шесть, подальше от домов, дорог и воды.', '#e0a070'); return; }
    // дверь — к игроку
    const r = { x: best.x, y: best.y, w: W0, h: H0 };
    const mx = r.x + (W0 >> 1), my = r.y + (H0 >> 1);
    const door = Math.abs(P.x - mx) > Math.abs(P.y - my) ? { x: P.x < mx ? r.x : r.x + W0 - 1, y: my } : { x: mx, y: P.y < my ? r.y : r.y + H0 - 1 };
    Gm.removeItem(plan);
    G.S.build = { map: m.key, rect: r, door, stage: 0, t0: G.S.time };
    const gnd = groundOf(m);
    for (let y = r.y; y < r.y + H0; y++) for (let x = r.x; x < r.x + W0; x++) if (!TL[m.tiles[y * m.w + x]].walk) Gm.setTile(x, y, gnd);
    for (const [x, y] of [[r.x, r.y], [r.x + W0 - 1, r.y], [r.x, r.y + H0 - 1], [r.x + W0 - 1, r.y + H0 - 1]]) Gm.setTile(x, y, T.SCAFFOLD);
    Gm.msg('Ты разметил[|а] участок: колышки по углам, бечёвка между ними. Подойди к лесам на углу — и за работу.', '#e0d0a0');
    Gm.cnt('build_started');
    Gm.endTurn(10);
  };
  // чертёж — «использовать»
  const use0 = Gm.use;
  Gm.use = function (x) { if (x && x.b === 'house_plan') return BU.start(x); return use0.apply(this, arguments); };
  const ia0 = UI.itemActions;
  if (ia0) UI.itemActions = function (x) { const o = ia0.apply(this, arguments); if (x && x.b === 'house_plan') { const i = o.findIndex((q) => q.t === 'Использовать'); if (i >= 0) o[i].t = 'Строить здесь'; } return o; };

  const have = (b) => Gm.count(b);
  const enough = (st) => Object.keys(st.need).every((b) => have(b) >= st.need[b]);
  const needStr = (st) => Object.keys(st.need).map((b) => D.items[b].n.toLowerCase() + ' ' + have(b) + '/' + st.need[b]).join(', ');
  BU.menu = function () {
    const B = G.S.build;
    const st = STAGES[B.stage];
    if (!st) return;
    const sk = BU.skill();
    const head = 'Стройка: шаг ' + (B.stage + 1) + ' из ' + STAGES.length + ' — ' + st.n + '. ' + st.d + '\nНужно: ' + needStr(st) + '. Умение: ' + sk + ' (надо ' + st.skill + ').';
    const opts = [];
    if (sk < st.skill) opts.push({ t: 'Не хватает умения — поработай за верстаком или возьми уроки у старосты, кузнеца, подёнщика', f: () => {} });
    else if (!enough(st)) opts.push({ t: 'Не хватает припасов: ' + needStr(st), f: () => {} });
    else opts.push({ t: 'Строить: ' + st.n.toLowerCase(), f: () => BU.work() });
    opts.push({ t: 'Уйти', f: () => {} });
    UI.menu(head, opts);
  };
  BU.work = function () {
    const B = G.S.build, st = STAGES[B.stage], m = G.map;
    const q = { type: 'timing', title: 'Стройка — ' + st.n.toLowerCase(), hint: 'Бей молотом точно по гвоздю: жми, когда метка над шляпкой.', need: 3, tries: 4, speed: 0.9, zone: 0.2 + Math.min(0.15, (BU.skill() - st.skill) * 0.02), col: '#e0c080', glyph: '🔨' };
    const go = (r) => {
      if (G.map !== m) return;
      if (!r || !r.ok) {
        // неудача: часть припасов пропала
        for (const b in st.need) Gm.take(b, Math.ceil(st.need[b] * 0.25));
        Gm.msg('Бревно соскользнуло, гвозди погнулись. Часть припасов — в щепу. Попробуй ещё раз.', '#e0a070');
        Gm.endTurn(20);
        return;
      }
      for (const b in st.need) Gm.take(b, st.need[b]);
      BU.apply(m, B, B.stage);
      B.stage++;
      Gm.cnt('build_stage');
      if (Gm.xp) Gm.xp(15 + B.stage * 10);
      Gm.endTurn(st.turns);
      if (B.stage >= STAGES.length) { B.done = 1; G.P.home = { map: B.map, rect: B.rect, door: B.door }; Gm.cnt('houses_built'); Gm.msg('Дом готов! Дверь скрипит, очаг тянет, кровать пахнет свежей стружкой. Это — твоё.', '#f0d890'); }
      else Gm.msg('Готово: ' + st.n.toLowerCase() + '. Дальше — ' + STAGES[B.stage].n.toLowerCase() + '.', '#e0d0a0');
    };
    if (E.Trades && E.Trades.play) E.Trades.play(q, 'build_stage', go); else UI.mgPlay(q, go);
  };
  // что меняется на земле после каждого шага
  BU.apply = function (m, B, stage) {
    const r = B.rect, d = B.door;
    const inner = (fn) => { for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) fn(x, y); };
    const edge = (fn) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1) fn(x, y); };
    const ix = d.x + (d.x === r.x ? 1 : d.x === r.x + r.w - 1 ? -1 : 0), iy = d.y + (d.y === r.y ? 1 : d.y === r.y + r.h - 1 ? -1 : 0);
    // леса — во внутреннем углу подальше от двери
    const far = [[r.x + 1, r.y + 1], [r.x + r.w - 2, r.y + 1], [r.x + 1, r.y + r.h - 2], [r.x + r.w - 2, r.y + r.h - 2]].sort((a, b) => Math.hypot(b[0] - d.x, b[1] - d.y) - Math.hypot(a[0] - d.x, a[1] - d.y))[0];
    if (stage === 0) {
      inner((x, y) => Gm.setTile(x, y, T.FLOOR));
      edge((x, y) => Gm.setTile(x, y, T.STONEFLOOR));
      for (const [x, y] of [[r.x, r.y], [r.x + r.w - 1, r.y], [r.x, r.y + r.h - 1], [r.x + r.w - 1, r.y + r.h - 1]]) Gm.setTile(x, y, T.SCAFFOLD);
    } else if (stage === 1) {
      edge((x, y) => Gm.setTile(x, y, T.WALL));
      for (let x = r.x + 2; x < r.x + r.w - 2; x += 3) for (const y of [r.y, r.y + r.h - 1]) if (!(x === d.x && y === d.y)) Gm.setTile(x, y, T.WINDOW);
      Gm.setTile(d.x, d.y, T.DOOR);
      Gm.setTile(far[0], far[1], T.SCAFFOLD);
    } else if (stage === 2) {
      BU.register(m, B);
    } else if (stage === 3) {
      Gm.setTile(far[0], far[1], T.BED);
      // очаг — у боковой стены, стол посередине, сундук у кровати
      const hx = far[0] === r.x + 1 ? r.x + r.w - 2 : r.x + 1, hy = far[1];
      if (!(hx === ix && hy === iy)) Gm.setTile(hx, hy, T.HEARTH);
      const tx = r.x + (r.w >> 1), ty = r.y + (r.h >> 1);
      if (!(tx === ix && ty === iy) && m.tiles[ty * m.w + tx] === T.FLOOR) { Gm.setTile(tx, ty, T.TABLE); }
      for (const [cx2, cy2] of [[far[0], far[1] === r.y + 1 ? far[1] + 1 : far[1] - 1], [far[0] === r.x + 1 ? far[0] + 1 : far[0] - 1, far[1]]]) {
        const i = cy2 * m.w + cx2;
        if (m.tiles[i] === T.FLOOR && !(cx2 === ix && cy2 === iy)) { Gm.setTile(cx2, cy2, T.CHEST); m.chests[i] = { items: [], opened: 1, own: 1 }; break; }
      }
    }
    // кто оказался в стене — отходит
    const P = G.P;
    if (!TL[m.tiles[P.y * m.w + P.x]].walk) { const p = MG.findWalkNear(m, P.x, P.y); P.x = p.x; P.y = p.y; P.posX = p.x + 0.5; P.posY = p.y + 0.5; }
    for (const e of m.ents) if (!e.dead && !TL[m.tiles[e.y * m.w + e.x]].walk) { const p = MG.findWalkNear(m, e.x, e.y); if (p && !m.occ.has(p.y * m.w + p.x)) { if (m.occ.get(e.y * m.w + e.x) === e) m.occ.delete(e.y * m.w + e.x); e.x = p.x; e.y = p.y; m.occ.set(p.y * m.w + p.x, e); } }
    if (Gm.computeFov) Gm.computeFov();
  };
  // готовый дом — со своей крышей (её рисуют по списку построек карты)
  BU.register = function (m, B) {
    if (!m.blds) m.blds = [];
    if (m.blds.some((b) => b.own)) return;
    m.blds.push({ type: 'home', own: 1, door: { x: B.door.x, y: B.door.y }, rect: { x: B.rect.x, y: B.rect.y, w: B.rect.w, h: B.rect.h }, in: [], mat: m.biome === 'desert' ? 'daub' : 'log', roof: m.biome === 'tundra' || m.biome === 'mountain' ? 'slate' : 'shingle', tall: false, pitch: 0.58 });
    m._roofs = undefined;
  };
  const lm0 = Gm.loadMap;
  Gm.loadMap = function () {
    const r = lm0.apply(this, arguments);
    try { const B = G.S.build, m = G.map; if (B && m && m.key === B.map && B.stage >= 3) BU.register(m, B); } catch (e) { /* */ }
    return r;
  };
  // у лесов — меню стройки
  const iat0 = Gm.interactAt;
  Gm.interactAt = function (x, y) {
    const m = G.map, B = G.S.build;
    if (m && B && !B.done && m.key === B.map && m.tiles[y * m.w + x] === T.SCAFFOLD && x >= B.rect.x - 1 && x <= B.rect.x + B.rect.w && y >= B.rect.y - 1 && y <= B.rect.y + B.rect.h) { BU.menu(); return true; }
    return iat0.apply(this, arguments);
  };
  // в своей постели спится лучше всего
  const rest0 = Gm.rest;
  Gm.rest = function () {
    const P = G.P, h = P && P.home, m = G.map;
    const mine = h && m && m.key === h.map && P.x > h.rect.x && P.x < h.rect.x + h.rect.w - 1 && P.y > h.rect.y && P.y < h.rect.y + h.rect.h - 1;
    const r = rest0.apply(this, arguments);
    if (mine && !P.dead && m.tiles[P.y * m.w + P.x] === T.BED && D.effects.wellrested) { Gm.fx('wellrested', 60 * 12); Gm.msg('Своя постель, своя крыша. Ты спишь как убит[ый|ая] и просыпаешься счастлив[ым|ой].', '#f0d890'); }
    return r;
  };
  // уроки плотницкого дела
  const op0 = Dlg.options;
  Dlg.options = function (e) {
    const o = op0.apply(this, arguments);
    try {
      if (!e || e.npc == null || e.hostile) return o;
      const job = E.Sim.job(e.npc);
      if (!['elder', 'smith', 'laborer', 'farmer'].includes(job)) return o;
      const P = G.P, n = P.flags.buildLessons || 0;
      if (n >= 3) return o;
      const price = 30 + n * 20;
      const opt = { t: 'Поучиться плотницкому делу (' + price + ' монет)', f: () => {
        if (P.gold < price) return 'Учёба денег стоит. ' + price + ' монет — и я покажу, как класть венцы.';
        P.gold -= price; P.flags.buildLessons = n + 1; Gm.endTurn(120);
        return ['Смотри: нижний венец — из лиственницы, она не гниёт. Паз выбирай топором, а мох клади щедро.', 'Стропила ставь под углом, чтоб снег не залёживался. Гвоздь — в косую, так держит крепче.', 'Печь ставь на свой фундамент, отдельно от сруба. Иначе сруб сядет — а печь треснет.'][n] + ' (Умение строить: ' + BU.skill() + ')';
      } };
      o.splice(Math.max(0, o.length - 1), 0, opt);
    } catch (err) { /* */ }
    return o;
  };
})(window.EOF);
