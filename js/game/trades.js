'use strict';
// Промыслы и ремёсла с мини-играми. Как сыграл — так и вышло:
//   рыбалка  — сначала ждёшь поклёвку, потом ведёшь рыбу в окошке (держи/отпускай); крупная рыба вертлявее;
//   рубка    — три точных удара топором по зарубке; мастерски — лишнее полено;
//   кирка    — бей по трещине в породе; промах — кирка звенит и отскакивает;
//   травы    — сорвать бережно, с корнем; мастерски — вдвое, иногда семена;
//   зелья    — держи жар под котелком; выкипело — мутная жижа, чисто — лишнее зелье;
//   станции  — кузня, верстак, ювелирный стол, станок, коптильня, рунный камень — у каждой своя игра (crafts.js спрашивает CR.mg);
//   огород   — лопатой вскопать землю за околицей (или поле на своей ферме), посеять семена (ритм), через несколько дней — собрать.
// С опытом каждое дело даётся легче: окошко шире, бегунок медленнее.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, UI = E.UI;
  const TR = E.Trades = {};
  const item = (id, n, g, t, o) => { if (!D.items[id]) D.items[id] = Object.assign({ id, n, g, t, w: 1, v: 1, d: '' }, o); };
  const food = (id, n, g, f, v, o) => item(id, n, g, 'food', Object.assign({ w: 0.5, v, food: f, st: 1 }, o));
  const mat = (id, n, g, v, o) => item(id, n, g, 'mat', Object.assign({ w: 0.3, v, st: 1 }, o));

  // ---------- новый улов, семена и урожай ----------
  food('fish_big', 'Крупная рыба', 'f', 14, 6, { w: 2, cook: 'fish_baked', raw: 1, d: 'Тяжёлая, бьёт хвостом даже в сумке.' });
  food('fish_baked', 'Запечённая рыба', 'f', 55, 12, { w: 1.5, heal: 4, d: 'Целиком, на углях, с хрустящей кожей.' });
  food('crayfish', 'Раки', 'p', 6, 3, { w: 0.4, cook: 'crayfish_boiled', raw: 1, d: 'Пятятся и щёлкают клешнями.' });
  food('crayfish_boiled', 'Варёные раки', 'p', 24, 7, { w: 0.4, d: 'Красные, солоноватые. К элю — лучше нет.' });
  food('eel', 'Угорь', 'm', 10, 5, { w: 1, cook: 'eel_fried', raw: 1, d: 'Скользкий, как сама река.' });
  food('eel_fried', 'Жареный угорь', 'm', 38, 10, { w: 0.8, d: 'Жирный, сытный, пахнет дымом.' });
  const SEEDS = TR.SEEDS = {
    seeds_rye: { n: 'Семена ржи', w: 'рожь', crop: 'rye', days: 3, base: 4 },
    seeds_turnip: { n: 'Семена репы', w: 'репа', crop: 'turnip', days: 2, base: 3 },
    seeds_cabbage: { n: 'Семена капусты', w: 'капуста', crop: 'cabbage', days: 3, base: 2 },
    seeds_flax: { n: 'Семена льна', w: 'лён', crop: 'flax', days: 3, base: 3 },
    seeds_herb: { n: 'Семена целебных трав', w: 'целебные травы', crop: 'herb', days: 2, base: 2 },
  };
  for (const id in SEEDS) mat(id, SEEDS[id].n, 'p', 3, { w: 0.05, seed: id, d: 'Горсть семян. Посеять на вскопанной земле — и ждать ' + SEEDS[id].days + ' дн.' });
  mat('rye', 'Рожь', 'f', 4, { w: 0.6, grain: 1, d: 'Сноп колосьев. Из зерна — хлеб, каша и квас.' });
  food('turnip', 'Репа', 'f', 14, 2, { w: 0.5, veg: 1, d: 'Крепкая, сладковатая. Проще пареной репы — только сырая.' });
  food('cabbage', 'Капуста', 'f', 12, 3, { w: 1, veg: 1, d: 'Тугой кочан с росой между листьями.' });
  mat('flax', 'Лён', 'm', 3, { w: 0.4, d: 'Стебли льна. На станке из них выходит нить.' });

  // ---------- общее ----------
  // опыт: 0 … 0.5 — окошко шире, бегунок медленнее
  const ease = (k) => Math.min(0.5, ((G.P && G.P.c && G.P.c[k]) || 0) / 60);
  const play = TR.play = function (o, k, fn) {
    const e = ease(k), q = Object.assign({}, o);
    if (q.zone) q.zone = Math.min(q.type === 'hold' ? 0.5 : 0.4, q.zone * (1 + e * 0.8));
    if (q.speed) q.speed *= 1 - e * 0.35;
    const m = G.map;
    UI.mgPlay(q, (r) => { if (G.map !== m || !G.P || G.P.dead) return; fn(r || { ok: true, q: 0.6 }); });
  };
  const counts = () => { const o = {}; for (const it of G.P.inv) o[it.b] = (o[it.b] || 0) + (it.q || 1); return o; };
  const gained = (before) => { const now = counts(), out = []; for (const b in now) if (now[b] > (before[b] || 0)) out.push(b); return out; };
  const nm = (b) => (D.items[b] ? D.items[b].n : b);

  // ---------- рыбалка ----------
  Gm.fish = function (x, y) {
    const P = G.P, m = G.map, h = Gm.hour();
    let p = 0.5 + P.st.luck * 0.02 + ((h >= 4 && h <= 7) || (h >= 18 && h <= 20) ? 0.15 : 0) + (P.cls === 'deep_fisher' ? 0.2 : 0);
    if (Gm.event('ocean')) p += 0.2;
    Gm.msg('Ты закидываешь удочку...');
    E.Sim.advance(20, () => { Gm.playerHour(); return !P.dead; });
    if (P.dead || G.map !== m) return;
    if (Math.random() >= p) { Gm.msg('Не клюёт.'); Gm.endTurn(1); return; }
    // кто на крючке — решается сразу: от этого зависит, как он бьётся
    const gf = G.W.storyRoles && G.W.storyRoles.goldfish;
    const t = TL[m.tiles[y * m.w + x]] || {};
    let catchB = 'fish_raw', title = 'Клюёт!', speed = 1, zone = 0.3;
    if (gf && m.rid === gf.reg && Gm.season() === 1 && h >= 4 && h <= 6 && Math.random() < 0.08 && !G.S.flags.goldCaught) { catchB = 'fish_gold'; title = 'Что-то золотое на крючке!'; speed = 1.6; zone = 0.22; }
    else if (Math.random() < 0.02) catchB = 'pearl';
    else if (Math.random() < 0.01) catchB = 'unique';
    else if (Math.random() < 0.18) { catchB = 'fish_big'; title = 'Тяжело тянет — крупная!'; speed = 1.35; zone = 0.25; }
    else if ((m.biome === 'swamp' || t.bog || m.biome === 'coast') && Math.random() < 0.3) { catchB = Math.random() < 0.5 ? 'eel' : 'crayfish'; speed = 1.15; }
    play({ type: 'hold', title, hint: 'Держи — леска натягивается, отпусти — даёт слабину. Веди рыбу в окошке, пока не вытащишь.', glyph: '🐟', col: '#9cc8e8', zone, speed, rate: 1.1 }, 'fish', (r) => {
      if (!r.ok) { Gm.msg(catchB === 'fish_gold' ? 'Золотой блеск уходит в глубину. Может, ещё вернётся.' : 'Сорвалась! Только круги по воде.', '#a0b0c0'); Gm.endTurn(1); return; }
      if (catchB === 'fish_gold') { G.S.flags.goldCaught = 1; Gm.give('fish_gold'); Gm.msg('На крючке бьётся что-то золотое!', '#ffe060'); }
      else if (catchB === 'unique') Gm.give(Gm.randomUnique(3));
      else Gm.give(catchB);
      if (r.q >= 0.9 && catchB === 'fish_raw') { Gm.give('fish_raw', 1, true); Gm.msg('Мастерски! Пока вываживал — клюнула вторая.', '#ffe08a'); }
      Gm.cnt('fish'); Gm.gain('fish');
      Gm.endTurn(1);
    });
  };

  // ---------- рубка ----------
  const chop0 = Gm.chop;
  Gm.chop = function (x, y) {
    const self = this;
    play({ type: 'timing', title: 'Рубка', hint: 'Бей, когда топор над зарубкой. Три точных удара — и дерево твоё.', need: 3, tries: 3, speed: 1.05, zone: 0.2, col: '#d8b070', glyph: '🪓' }, 'chop', (r) => {
      if (!r.ok) { Gm.msg('Топор вязнет в коре и соскальзывает. Дерево стоит.', '#c0a080'); Gm.endTurn(4); return; }
      chop0.call(self, x, y);
      Gm.cnt('chop');
      if (r.q >= 0.7) Gm.give('wood', r.q >= 0.9 ? 2 : 1, true);
      if (r.q >= 0.7) Gm.msg(r.q >= 0.9 ? 'Мастерски! Ровные поленья — втрое больше.' : 'Чисто срублено — лишнее полено.', '#e0c890');
    });
  };

  // ---------- кирка ----------
  const mine0 = Gm.mine;
  Gm.mine = function (x, y) {
    const self = this;
    play({ type: 'timing', title: 'Кирка', hint: 'Бей по трещине в породе — когда кирка над светлой жилой.', need: 3, tries: 3, speed: 1.15, zone: 0.17, col: '#c0c8d0', glyph: '⛏' }, 'mined', (r) => {
      if (!r.ok) {
        Gm.msg('Кирка звенит о камень и отскакивает. Жила цела.', '#c0a080');
        // звон слышно далеко
        const m = G.map;
        for (const e of m.ents) if (!e.dead && e.kind === 'mon' && e.asleep && U.dist(e.x, e.y, x, y) <= 7 && Math.random() < 0.4) { e.asleep = false; e.aware = true; }
        Gm.endTurn(4); return;
      }
      mine0.call(self, x, y);
      Gm.cnt('mined');
      if (r.q >= 0.85) { Gm.give('iron_ore', 1, true); Gm.msg('Порода раскололась ровно — лишний кусок руды.', '#e0c890'); }
      if (r.q >= 0.95 && Math.random() < 0.3) Gm.give('crystal');
    });
  };

  // ---------- травы ----------
  const ga0 = Gm.gather;
  Gm.gather = function (x, y) {
    const self = this, P = G.P;
    play({ type: 'timing', title: 'Сбор трав', hint: 'Тяни, когда стебель поддаётся — бережно, с корнем.', need: 2, tries: 2, speed: 0.9, zone: 0.24, col: '#90d080', glyph: '🌿' }, 'herbs', (r) => {
      if (!r.ok) { Gm.msg('Стебель рвётся, корень остаётся в земле.', '#a0a080'); Gm.setTile(x, y, G.map.biome === 'swamp' ? T.SWAMP : T.GRASS); Gm.endTurn(2); return; }
      const before = counts(), l0 = P.st.luck;
      P.st.luck = Math.max(l0, 20); // бережно сорванное не пропадает
      try { ga0.call(self, x, y); } finally { P.st.luck = l0; }
      const got = gained(before).find((b) => D.items[b] && (D.items[b].herb || D.items[b].t === 'food'));
      if (got && r.q >= 0.85) { Gm.give(got, 1, true); Gm.msg('Мастерски! С корнем и отростком — вдвое: ' + nm(got).toLowerCase() + '.', '#b0e0a0'); }
      if (got && Math.random() < (r.q >= 0.85 ? 0.35 : 0.12)) { Gm.give('seeds_herb', 1, true); Gm.msg('В ладони остались семена.', '#c0d0a0'); }
    });
  };

  // ---------- зелья ----------
  const brew0 = Gm.brew;
  Gm.brew = function (a, b) {
    const self = this, P = G.P;
    if (!a || !b || (a === b && (a.q || 1) < 2)) return brew0.apply(this, arguments);
    play({ type: 'hold', title: 'Зельеварение', hint: 'Держи жар: зажми — огонь сильнее, отпусти — слабее. Пузырь должен быть в окошке.', glyph: '◉', col: '#a0e8a0', zone: 0.28, speed: 0.85, rate: 1.15 }, 'brews', (r) => {
      if (!P.inv.includes(a) || !P.inv.includes(b)) return;
      if (!r.ok) {
        Gm.take(a.b, 1); Gm.take(b.b, 1);
        Gm.give('p_sludge'); Gm.cnt('brews'); Gm.cnt('brew_fail');
        Gm.msg('Варево вскипело и свернулось. Мутная жижа.', '#a09070');
        Gm.endTurn(10); return;
      }
      const before = counts();
      brew0.call(self, a, b);
      const got = gained(before).find((x) => x !== 'p_sludge' && D.items[x] && D.items[x].t === 'potion');
      if (got && r.q >= 0.85) { Gm.give(got, 1, true); Gm.msg('Чистая варка — вышло на одно зелье больше.', '#b0f0c0'); }
    });
  };

  // ---------- станции ремесла (crafts.js) ----------
  const ST = {
    ANVIL: (r) => ({ type: 'timing', title: 'Кузня' + (r ? ' — ' + nm(r[0]) : ''), hint: 'Бей молотом, когда он над раскалённой меткой.', need: r && r[3] >= 6 ? 4 : 3, tries: 3, speed: 1.1, zone: 0.18, col: '#ff9040', glyph: '🔨' }),
    WORKBENCH: (r) => ({ type: 'timing', title: 'Верстак' + (r ? ' — ' + nm(r[0]) : ''), hint: 'Веди пилу по разметке: жми, когда зубья над линией.', need: 3, tries: 3, speed: 0.95, zone: 0.22, col: '#d8b070', glyph: '🪚' }),
    JEWELER: (r) => ({ type: 'arc', title: 'Ювелирный стол' + (r ? ' — ' + nm(r[0]) : ''), hint: 'Останови резец на светлой грани камня.', need: 3, tries: 3, speed: 1, zone: 0.12, col: '#a0e0ff', glyph: '💎' }),
    LOOM: (r) => ({ type: 'rhythm', title: 'Ткацкий станок' + (r ? ' — ' + nm(r[0]) : ''), hint: 'Бросай челнок в такт: жми, когда нить на черте.', need: 5, tries: 3, speed: 1, col: '#e0d0b0', glyph: '🧶' }),
    SMOKER: (r) => ({ type: 'hold', title: 'Коптильня', hint: 'Держи дым ровным: зажми — подбросить щепы, отпусти — притушить.', glyph: '🔥', col: '#ffb060', zone: 0.3, speed: 0.7, rate: 1.2 }),
    RUNESTONE: () => ({ type: 'seq', title: 'Рунный камень', hint: 'Запомни, какие руны вспыхнули, и повтори их по порядку.', need: 5, tries: 2, col: '#c0b0ff', glyphs: ['🔥', '💧', '⚡', '🌙'] }),
  };
  const ck = { ANVIL: 'forged', WORKBENCH: 'crafts', JEWELER: 'crafts', LOOM: 'crafts', SMOKER: 'crafts', RUNESTONE: 'enchants' };
  if (E.Crafts) {
    E.Crafts.mg = function (st, r, go) { const f = ST[st]; if (!f) { go({ ok: true, q: 0.6 }); return; } play(f(r), ck[st], go); };
    // лён на станке — в нить
    const L = E.Crafts.recipes && E.Crafts.recipes.LOOM;
    if (L && !L.list.some((x) => x[2].flax)) L.list.splice(1, 0, ['linen_thread', 3, { flax: 2 }, 1]);
    const S = E.Crafts.recipes && E.Crafts.recipes.SMOKER;
    if (S) S.list.push(['eel_fried', 2, { eel: 2, salt: 1 }, 4]);
  }

  // ---------- огород ----------
  const crops = () => { const S = G.S; S.crops = S.crops || {}; const k = G.map.key; return (S.crops[k] = S.crops[k] || {}); };
  const own = () => { const P = G.P, m = G.map; return m.sett < 0 || (P.farm && P.farm.sett === m.sett); };
  const seedsHave = () => Object.keys(SEEDS).filter((b) => Gm.has(b));
  const GROUND = () => new Set([T.GRASS, T.DIRT, T.MEADOW, T.TALLGRASS, T.FLOWERS].filter((x) => x != null));
  const ripe = (c) => G.S.time - c.t >= SEEDS[c.s].days * 1440;
  TR.cropAt = (x, y) => { const m = G.map; return G.S.crops && G.S.crops[m.key] && G.S.crops[m.key][y * m.w + x]; };
  // всходы видно: созрело — поле, растёт — пашня
  function syncCrops() {
    const m = G.map;
    if (!m || !G.S.crops || !G.S.crops[m.key]) return;
    const C = G.S.crops[m.key];
    for (const i in C) { const want = ripe(C[i]) ? T.FIELD : T.SOIL; if (m.tiles[i] !== want) Gm.setTile(i % m.w, Math.floor(i / m.w), want); }
  }
  function sow(x, y) {
    const list = seedsHave();
    if (Gm.season() === 3) { Gm.msg('Зима. Земля мёрзлая — сеять до весны нечего.', '#a0b0c0'); return true; }
    const go = (b) => {
      play({ type: 'rhythm', title: 'Посев — ' + nm(b).toLowerCase(), hint: 'Бросай горсть в борозду в такт шагам: жми, когда зерно над чертой.', need: 4, tries: 3, speed: 0.9, col: '#d8c070', glyph: '🌱' }, 'sown', (r) => {
        if (!Gm.has(b)) return;
        Gm.take(b, 1);
        if (!r.ok) { Gm.msg('Семена разлетелись мимо борозды. Птицам на радость.', '#a0a080'); Gm.endTurn(6); return; }
        const m = G.map;
        crops()[y * m.w + x] = { s: b, t: G.S.time, q: r.q };
        Gm.setTile(x, y, T.SOIL);
        Gm.cnt('sown'); Gm.gain('craft');
        Gm.msg('Посеяно: ' + SEEDS[b].w + '. Созреет через ' + SEEDS[b].days + ' дн.' + (r.q >= 0.85 ? ' Ровные борозды — урожай будет богаче.' : ''), '#c0e0a0');
        Gm.endTurn(10);
      });
    };
    if (list.length === 1) go(list[0]);
    else UI.list({ title: 'Что посеять?', items: list.map((b) => ({ t: nm(b) + ' ×' + Gm.count(b) + ' — ' + SEEDS[b].days + ' дн.', f: () => { UI.pop(); go(b); return 'keep'; } })) });
    return true;
  }
  function harvest(x, y, c) {
    const S = SEEDS[c.s];
    play({ type: 'rhythm', title: 'Жатва', hint: 'Срезай в такт: жми, когда колос на черте.', need: 4, tries: 3, speed: 1, col: '#e8d070', glyph: '🌾' }, 'harvest', (r) => {
      const m = G.map, i = y * m.w + x;
      delete crops()[i];
      Gm.setTile(x, y, T.SOIL);
      let n = Math.max(1, Math.round(S.base * (0.6 + 0.5 * (c.q || 0.5)) * (r.ok ? 0.7 + 0.5 * r.q : 0.4)));
      if (Gm.event('harvest')) n++;
      if (S.crop === 'herb') { for (let k = 0; k < n; k++) Gm.give(['h_plantain', 'h_sage', 'h_chamomile', 'h_mint'].filter((b) => D.items[b])[Math.floor(Math.random() * 4)] || 'h_plantain', 1, true); }
      else Gm.give(S.crop, n, true);
      if (Math.random() < 0.5) Gm.give(Object.keys(SEEDS).find((k) => SEEDS[k] === S), 1, true);
      Gm.msg('Урожай: ' + (S.crop === 'herb' ? 'целебные травы' : nm(S.crop).toLowerCase()) + ' ×' + n + (r.ok ? '' : ' — половину потоптал') + '.', '#e8d890');
      Gm.cnt('harvest'); Gm.gain('craft'); Gm.xp(4 + n);
      Gm.endTurn(10);
    });
    return true;
  }
  function till(x, y) {
    play({ type: 'timing', title: 'Вскопать грядку', hint: 'Втыкай лопату, когда она над рыхлым местом.', need: 3, tries: 3, speed: 0.9, zone: 0.24, col: '#b09060', glyph: '⛏' }, 'tilled', (r) => {
      if (!r.ok) { Gm.msg('Корни дёрна держат лопату. Земля не поддалась.', '#a09070'); Gm.endTurn(5); return; }
      Gm.setTile(x, y, T.SOIL); Gm.cnt('tilled');
      Gm.msg('Грядка вскопана. Теперь — посеять.', '#c0b090');
      Gm.endTurn(15);
    });
    return true;
  }
  // что сделать с землёй здесь (или null)
  TR.farmAt = function (x, y) {
    const m = G.map, i = y * m.w + x, t = m.tiles[i], c = crops()[i];
    if (c) return ripe(c) ? 'harvest' : 'grow';
    if (!m.outdoor) return null;
    if ((t === T.SOIL || (t === T.FIELD && own())) && seedsHave().length) return 'sow';
    if (t === T.FIELD && !own() && seedsHave().length) return 'foreign';
    if (GROUND().has(t) && own() && seedsHave().length && Gm.toolEq('dig')) return 'till';
    return null;
  };
  TR.farm = function (x, y) {
    const k = TR.farmAt(x, y), c = crops()[y * G.map.w + x];
    if (k === 'harvest') return harvest(x, y, c);
    if (k === 'grow') { const left = Math.ceil((SEEDS[c.s].days * 1440 - (G.S.time - c.t)) / 1440); Gm.msg('Всходы ещё зелёные (' + SEEDS[c.s].w + '). Созреет через ' + left + ' ' + U.plural(left, 'день', 'дня', 'дней') + '.', '#a0c090'); return true; }
    if (k === 'sow') return sow(x, y);
    if (k === 'till') return till(x, y);
    if (k === 'foreign') { Gm.msg('Чужое поле. Сеять можно на своей ферме — или вскопай лопатой землю за околицей.', '#c0a080'); return true; }
    return false;
  };
  // «E»: сначала люди, вещи и очевидное — потом земля под ногами и рядом
  const ia0 = Gm.interact;
  Gm.interact = function () {
    const P = G.P, m = G.map;
    try {
      const f = m.feat[P.y * m.w + P.x];
      if (!(f && f.k === 'link') && !Gm.itemsAt(P.x, P.y).length && !Gm.useCands().length) {
        for (const [dx, dy] of [[0, 0]].concat(U.DIR8)) {
          const x = P.x + dx, y = P.y + dy;
          if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
          const k = TR.farmAt(x, y);
          if (k && (k !== 'till' || (dx === 0 && dy === 0))) { TR.farm(x, y); return; }
        }
      }
    } catch (e) { /* земля подождёт */ }
    return ia0.apply(this, arguments);
  };
  const tk0 = Gm.tick;
  let lastSync = 0;
  Gm.tick = function () {
    const r = tk0.apply(this, arguments);
    try { if (G.map && G.S && Math.abs(G.S.time - lastSync) >= 30) { lastSync = G.S.time; syncCrops(); } } catch (e) { /* */ }
    return r;
  };
  const lm0 = Gm.loadMap;
  Gm.loadMap = function () { const r = lm0.apply(this, arguments); try { lastSync = 0; syncCrops(); } catch (e) { /* */ } return r; };

  // ---------- где взять семена ----------
  const SH = E.Dlg && E.Dlg.SHOP;
  if (SH) {
    if (SH.general) SH.general.push('seeds_turnip', 'seeds_rye', 'seeds_cabbage', 'seeds_flax');
    if (SH.herbs) SH.herbs.push('seeds_herb', 'seeds_herb');
    if (SH.bakery) SH.bakery.push('rye');
    if (SH.fish) SH.fish.push('crayfish', 'eel', 'fish_big');
    if (SH.inn) SH.inn.push('crayfish_boiled', 'eel_fried', 'fish_baked');
  }
})(window.EOF);
