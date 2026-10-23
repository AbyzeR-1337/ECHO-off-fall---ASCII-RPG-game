'use strict';
// Генерация мира: регионы, поселения, люди, государства, каталоги.
(function (E) {
  const U = E.U, D = E.D, N = E.N, C = E.C;
  const World = E.World = {};
  const WS = C.WS;

  World.generate = function (seed) {
    const t0 = performance.now();
    const r = U.rng(seed, 'world');
    const W = { seed, year0: r.int(300, 900), regions: [], settlements: [], npcs: [], factions: [], placements: {}, special: {}, cyclic: [], nightRegions: [], roads: {}, storyRoles: {}, npcItem: {}, npcUq: {}, uqDun: {}, uqOver: {}, uqShop: {}, uqBoss: {}, gods: {} };
    genRegions(W, r);
    genSettlements(W, r);
    genFactions(W, r);
    genRoads(W, r);
    W.prayers = D.genPrayers(seed, 1200);
    assignKeepers(W, r);
    genBosses(W, r);
    genUniques(W, r);
    genSpecial(W, r);
    bindStories(W, r);
    W.genMs = Math.round(performance.now() - t0);
    return W;
  };

  const idx = (x, y) => y * WS + x;
  World.idx = idx;
  World.nb4 = function (x, y) { return U.DIR4.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < WS && b < WS); };

  // ---------- регионы ----------
  function genRegions(W, r) {
    const s = W.seed;
    const cells = [];
    for (let y = 0; y < WS; y++) for (let x = 0; x < WS; x++) {
      const nx = x / (WS - 1) - 0.5, ny = y / (WS - 1) - 0.5;
      const d = Math.sqrt(nx * nx + ny * ny);
      let e = U.fbm(s + 11, x / 5.5, y / 5.5, 4) * 0.85 + U.noise(s + 12, x / 2.2, y / 2.2) * 0.25;
      e -= Math.max(0, d - 0.4) * 1.4;
      e += 0.1;
      const t = (y / (WS - 1)) * 0.95 + (U.fbm(s + 13, x / 4, y / 4, 3) - 0.5) * 0.35;
      const m = U.fbm(s + 14, x / 4.5, y / 4.5, 4);
      cells.push({ x, y, e, t, m });
    }
    const land = (c) => c.e > 0.45;
    for (const c of cells) {
      let b;
      if (!land(c)) b = 'ocean';
      else if (c.t < 0.14) b = 'ice';
      else if (c.t < 0.27) b = c.e > 0.74 ? 'mountain' : 'tundra';
      else if (c.e > 0.74) b = 'mountain';
      else if (c.t > 0.68 && c.m < 0.5) b = 'desert';
      else if (c.m > 0.64 && c.e < 0.6) b = 'swamp';
      else if (c.m > 0.52) b = 'forest';
      else b = 'plains';
      c.b = b;
    }
    const at = (x, y) => (x < 0 || y < 0 || x >= WS || y >= WS ? null : cells[idx(x, y)]);
    // побережье
    for (const c of cells) {
      if (c.b === 'ocean' || c.b === 'ice' || c.b === 'mountain') continue;
      const nearSea = World.nb4(c.x, c.y).some(([a, b2]) => at(a, b2).b === 'ocean');
      if (nearSea && (c.b === 'plains' || c.b === 'forest' || c.b === 'tundra' || c.b === 'desert') && r.chance(0.65)) c.b = 'coast';
    }
    // кластеры особых биомов
    const grow = (seedCell, to, n, from) => {
      const q = [seedCell], seen = new Set([idx(seedCell.x, seedCell.y)]);
      let k = 0;
      while (q.length && k < n) {
        const c = q.shift();
        if (from.includes(c.b)) { c.b = to; k++; }
        for (const [a, b2] of r.shuffle(World.nb4(c.x, c.y))) {
          const cc = at(a, b2), key = idx(a, b2);
          if (!seen.has(key) && from.includes(cc.b)) { seen.add(key); q.push(cc); }
        }
      }
      return k;
    };
    const pickCell = (f) => { const l = cells.filter(f); return l.length ? r.pick(l) : null; };
    for (let i = 0; i < 2; i++) { const c = pickCell((c) => c.b === 'forest'); if (c) grow(c, 'ancient', r.int(4, 7), ['forest']); }
    { const c = pickCell((c) => c.b === 'mountain'); if (c) grow(c, 'living', r.int(3, 5), ['mountain']); }
    for (let i = 0; i < 3; i++) { const c = pickCell((c) => ['plains', 'desert', 'tundra'].includes(c.b)); if (c) grow(c, 'ash', r.int(2, 4), ['plains', 'desert', 'tundra']); }
    // вулканические острова — в тёплом море
    for (let i = 0; i < 5; i++) {
      const c = pickCell((c) => c.b === 'ocean' && c.t > 0.55 && World.nb4(c.x, c.y).every(([a, b2]) => ['ocean', 'volcanic'].includes(at(a, b2).b)));
      if (c) c.b = 'volcanic';
    }
    // небесный архипелаг
    {
      const c = pickCell((c) => c.x > 15 && c.y < 12 && (c.b === 'mountain' || c.b === 'ocean' || c.b === 'tundra'));
      if (c) grow(c, 'sky', r.int(4, 6), ['mountain', 'ocean', 'tundra', 'plains', 'forest', 'coast', 'ice']);
    }
    // стартовый регион
    let start = null, bestD = 99;
    for (const c of cells) {
      if (!['plains', 'forest'].includes(c.b)) continue;
      const dd = Math.abs(c.x - 12) + Math.abs(c.y - 13) + r.next();
      if (dd < bestD) { bestD = dd; start = c; }
    }
    if (!start) { start = cells[idx(12, 12)]; start.b = 'plains'; }
    W.start = idx(start.x, start.y);
    const used = new Set();
    for (const c of cells) {
      const id = idx(c.x, c.y);
      const bi = D.biomes[c.b];
      const dist = Math.hypot(c.x - start.x, c.y - start.y);
      const danger = Math.max(1, Math.round(1 + dist * 0.85 + bi.dg + r.next() * 1.5 - (id === W.start ? 9 : 0)));
      const reg = { id, x: c.x, y: c.y, biome: c.b, e: c.e, t: c.t, m: c.m, danger: id === W.start ? 1 : danger, name: N.regionName(r, bi.nk || 'plains', used), features: [], settlement: -1, fac: -1, shrine: null, dun: null, exist: 'always' };
      W.regions.push(reg);
    }
    // особенности
    for (const g of W.regions) {
      const b = g.biome;
      if (b === 'ocean') { if (r.chance(0.04)) g.features.push('whirlpool'); continue; }
      const f = g.features;
      if (r.chance(b === 'ash' ? 0.9 : 0.14)) f.push('ruins');
      if (r.chance(0.12) && b !== 'sky') { f.push('shrine'); g.shrine = r.pick(D.gods).id; }
      if (r.chance(['plains', 'forest', 'coast', 'swamp', 'tundra', 'ancient'].includes(b) ? 0.35 : 0.08)) f.push('stream');
      if (r.chance(['plains', 'forest', 'swamp', 'tundra'].includes(b) ? 0.12 : 0.03)) f.push('lake');
      if (r.chance(0.06) && !['sky', 'volcanic'].includes(b)) f.push('camp');
      if (r.chance(0.05)) f.push('inscription');
      if (r.chance(0.04)) f.push('altar');
      if (['mountain', 'living'].includes(b) || (b === 'tundra' && r.chance(0.2)) || (b === 'desert' && r.chance(0.15))) { if (r.chance(0.55)) f.push('ore'); }
      let dch = { mountain: 0.55, living: 0.6, ash: 0.7, plains: 0.25, forest: 0.3, ancient: 0.4, swamp: 0.35, desert: 0.4, coast: 0.25, tundra: 0.3, ice: 0.35, volcanic: 0.45, sky: 0.2 }[b] || 0.2;
      if (r.chance(dch)) {
        const types = { mountain: ['cave', 'cave', 'mine_old'], living: ['cave', 'flesh'], ash: ['ruins', 'crypt'], plains: ['crypt', 'barrow'], forest: ['cave', 'barrow'], ancient: ['cave', 'roots'],
          swamp: ['sunken', 'cave'], desert: ['tomb', 'ruins'], coast: ['flooded', 'cave'], tundra: ['barrow', 'cave', 'crypt'], ice: ['ice'], volcanic: ['lava'], sky: ['ruins'] }[b] || ['cave'];
        g.dun = { type: r.pick(types), depth: r.int(2, 4 + Math.floor(g.danger / 3)) };
        f.push('dungeon');
      }
    }
    // самый высокий пик — лунная лестница
    let peak = null;
    for (const g of W.regions) if ((g.biome === 'mountain' || g.biome === 'living') && (!peak || g.e > peak.e)) peak = g;
    W.special.moonPeak = peak ? peak.id : W.start;
    if (peak) peak.features.push('peak');
    // Бездна — два провала
    const abyss = r.sample(W.regions.filter((g) => ['ash', 'mountain', 'desert'].includes(g.biome) && g.danger >= 7 && g.id !== W.special.moonPeak), 2);
    W.special.abyss = abyss.map((g) => g.id);
    for (const g of abyss) { g.dun = { type: 'abyss', depth: 25 }; if (!g.features.includes('dungeon')) g.features.push('dungeon'); }
    // циклические острова и ночные земли
    const oc = r.sample(W.regions.filter((g) => g.biome === 'ocean' && Math.abs(g.x - 12) + Math.abs(g.y - 12) < 16), 2);
    oc.forEach((g, i) => { g.exist = 'cyclic'; g.cyc = { period: 70 + r.int(0, 40), len: 3, off: r.int(0, 60) }; W.cyclic.push(g.id); g.cycName = N.regionName(r, 'coast', used); });
    const nl = r.sample(W.regions.filter((g) => ['plains', 'forest', 'swamp', 'tundra'].includes(g.biome) && g.id !== W.start && g.danger >= 3), 4);
    nl.forEach((g) => { g.exist = 'night'; W.nightRegions.push(g.id); g.nightName = 'Ночные ' + r.pick(['Тропы', 'Луга', 'Земли', 'Холмы', 'Поля']) + ' ' + U.gen(N.fantasy(r)); });
  }

  // ---------- поселения и люди ----------
  const CLOTH = ['#c8a878', '#a8b8c8', '#b89878', '#98a888', '#c8b8a8', '#a89888', '#b8a8c8', '#c8c098', '#98b8b8', '#c8a0a0', '#d0c0a0', '#a0a0b8'];
  function genSettlements(W, r) {
    const chance = { plains: 0.85, coast: 0.88, forest: 0.66, tundra: 0.5, desert: 0.38, swamp: 0.36, mountain: 0.38, ice: 0.22, ancient: 0.35, ash: 0.08, living: 0.05, volcanic: 0.2, sky: 0.3, ocean: 0 };
    const cand = [];
    for (const g of W.regions) {
      if (g.exist !== 'always' && g.exist !== 'cyclic') continue;
      if (g.exist === 'cyclic') { cand.push([g, 'vanish']); continue; }
      if (g.id === W.start || r.chance(chance[g.biome] || 0)) cand.push([g, null]);
    }
    // столицы — разнесены
    const capitals = [];
    const capPool = r.shuffle(cand.filter(([g, k]) => !k && ['plains', 'coast', 'forest'].includes(g.biome) && g.id !== W.start));
    for (const [g] of capPool) {
      if (capitals.length >= 7) break;
      if (capitals.every((c) => Math.abs(c.x - g.x) + Math.abs(c.y - g.y) >= 7)) capitals.push(g);
    }
    const used = new Set();
    for (const [g, kind] of cand) {
      let type;
      if (kind === 'vanish') type = 'vanish';
      else if (capitals.includes(g)) type = 'capital';
      else if (g.id === W.start) type = 'village';
      else if (g.biome === 'ancient') type = 'tree';
      else if (g.biome === 'sky') type = 'hamlet';
      else type = r.weighted([['town', 16], ['village', 46], ['hamlet', 26], ['farm', 12]]);
      if (type === 'town' && ['ice', 'desert', 'swamp', 'mountain'].includes(g.biome) && r.chance(0.5)) type = 'village';
      const nm = N.settlementName(r, used);
      const s = { id: W.settlements.length, region: g.id, rx: g.x, ry: g.y, type, nom: nm.nom, gen: nm.gen, loc: 'в ' + nm.loc, fac: -1, npcs: [], b: {} };
      if (type === 'tree') { s.nom = 'Древоград ' + nm.nom; s.gen = 'Древограда ' + nm.nom; s.loc = 'в Древограде ' + nm.nom; }
      g.settlement = s.id;
      W.settlements.push(s);
    }
    // особые поселения: подводные города
    const seaRegs = r.sample(W.regions.filter((g) => g.biome === 'ocean' && g.exist === 'always'), 3);
    for (const g of seaRegs) {
      const nm = N.settlementName(r, used);
      const s = { id: W.settlements.length, region: g.id, rx: g.x, ry: g.y, type: 'sea', nom: 'Глубинный ' + nm.nom, gen: 'Глубинного ' + nm.nom, loc: 'в Глубинном ' + nm.nom, fac: -1, npcs: [], b: {} };
      W.settlements.push(s);
      g.seaCity = s.id;
      if (!g.features.includes('whirlpool')) g.features.push('whirlpool');
    }
    for (const s of W.settlements) {
      const g = W.regions[s.region];
      const b = s.b;
      const T = s.type;
      const coast = g.biome === 'coast' || World.nb4(g.x, g.y).some(([a, c]) => W.regions[idx(a, c)].biome === 'ocean');
      s.coast = coast;
      const mineNear = g.features.includes('ore') || World.nb4(g.x, g.y).some(([a, c]) => W.regions[idx(a, c)].features.includes('ore'));
      if (T === 'capital') Object.assign(b, { walls: 1, palace: 1, tavern: 1, smith: 1, temple: 1, market: 1, alch: 1, library: 1, guard: 1, grave: 1 });
      else if (T === 'town') Object.assign(b, { walls: 1, tavern: 1, smith: 1, temple: 1, market: 1, guard: 1, grave: 1, alch: r.chance(0.6) ? 1 : 0, library: r.chance(0.45) ? 1 : 0 });
      else if (T === 'village' || T === 'tree') Object.assign(b, { tavern: r.chance(0.6) ? 1 : 0, smith: r.chance(0.6) ? 1 : 0, temple: r.chance(0.45) ? 1 : 0, grave: r.chance(0.5) ? 1 : 0, fields: 1, alch: r.chance(0.12) ? 1 : 0, market: r.chance(0.2) ? 1 : 0 });
      else if (T === 'hamlet' || T === 'farm') Object.assign(b, { fields: 1 });
      else if (T === 'vanish') Object.assign(b, { tavern: 1, temple: 1, market: 1 });
      else if (T === 'sea') Object.assign(b, { market: 1, temple: 1 });
      if (s.id === W.regions[W.start].settlement) Object.assign(b, { tavern: 1, temple: 1, smith: 1, fields: 1, grave: 1 });
      if (coast && T !== 'sea') b.dock = 1;
      if (mineNear && T !== 'sea' && T !== 'vanish' && r.chance(0.8)) b.mine = 1;
      const pop = { capital: [210, 260], town: [115, 150], village: [58, 88], tree: [70, 100], hamlet: [22, 34], farm: [6, 10], vanish: [30, 45], sea: [50, 70] }[T];
      s.pop0 = r.int(pop[0], pop[1]);
      genPeople(W, r, s, g);
    }
    // одиночки вне поселений: отшельники, бродяги
    for (const g of W.regions) {
      if (g.settlement >= 0 || g.biome === 'ocean' || g.exist !== 'always') continue;
      if (r.chance(0.18)) {
        const sex = r.chance(0.5) ? 'm' : 'f';
        addNpc(W, r, { first: r.pick(sex === 'm' ? N.male : N.female), sur: N.surname(r), sex, age: r.int(40, 85), job: r.pick(['hermit', 'hermit', 'wanderer', 'herbalist', 'hunter']), sett: -1, region: g.id });
        (W.placements[g.id] = W.placements[g.id] || []).push({ k: 'npc', id: W.npcs.length - 1 });
      }
    }
  }

  function makeLook(n, r) {
    const j = D.jobs[n.job] || D.jobs.laborer;
    let who;
    if (n.age < 14) who = n.sex === 'm' ? 'мальчик' : 'девочка';
    else if (n.age < 25) who = n.sex === 'm' ? 'молодой парень' : 'молодая девушка';
    else if (n.age < 45) who = n.sex === 'm' ? 'мужчина' : 'женщина';
    else if (n.age < 65) who = n.sex === 'm' ? 'мужчина в годах' : 'женщина в годах';
    else who = n.sex === 'm' ? 'старик' : 'старуха';
    return who + ', ' + r.pick(j.look);
  }
  function addNpc(W, r, o) {
    const n = Object.assign({ id: W.npcs.length, fam: [], friends: [], enemies: [], traits: r.sample(D.traitIds, 2), fear: r.int(0, D.fears.length - 1), habit: r.int(0, D.habits.length - 1), col: r.pick(CLOTH), house: -1 }, o);
    n.look = n.look || makeLook(n, r);
    n.lvl = n.job === 'guard' ? 4 + Math.round((W.regions[n.region != null ? n.region : W.settlements[n.sett].region].danger) / 2) : n.job === 'veteran' ? 6 : n.job === 'ruler' ? 5 : 1 + Math.floor(n.age / 30);
    W.npcs.push(n);
    return n;
  }
  World.addNpc = addNpc;

  function genPeople(W, r, s, g) {
    const target = s.pop0;
    const people = [];
    let house = 0;
    while (people.length < target) {
      const sur = N.surname(r);
      const fam = [];
      const adultM = r.chance(0.92), adultF = r.chance(0.92);
      const baseAge = r.int(20, 58);
      if (adultM) fam.push({ sex: 'm', age: baseAge + r.int(-3, 6) });
      if (adultF) fam.push({ sex: 'f', age: baseAge + r.int(-6, 3) });
      if (!fam.length) fam.push({ sex: r.chance(0.5) ? 'm' : 'f', age: baseAge });
      const kids = baseAge < 45 ? r.int(0, 4) : r.int(0, 2);
      for (let k = 0; k < kids; k++) fam.push({ sex: r.chance(0.5) ? 'm' : 'f', age: Math.max(0, baseAge - r.int(18, 30)) });
      if (r.chance(0.25)) fam.push({ sex: r.chance(0.6) ? 'f' : 'm', age: baseAge + r.int(22, 34) });
      const ids = [];
      for (const f of fam) {
        if (people.length >= target) break;
        const n = addNpc(W, r, { first: r.pick(f.sex === 'm' ? N.male : N.female), sur: f.sex === 'm' ? sur : N.femSur(sur), sex: f.sex, age: Math.max(0, f.age), job: 'laborer', sett: s.id, house });
        ids.push(n.id);
        people.push(n);
      }
      for (const id of ids) W.npcs[id].fam = ids.filter((x) => x !== id);
      house++;
      if (s.type === 'capital' && r.chance(0.5) && people.length < target) { /* две семьи в доме */ } else if (s.type === 'capital') { /**/ }
    }
    s.houses = s.type === 'capital' ? Math.ceil(house * 0.6) : house;
    if (s.type === 'capital') for (const n of people) n.house = n.house % s.houses;
    s.npcs = people.map((n) => n.id);
    // профессии
    const adults = people.filter((n) => n.age >= 16 && n.age < 72);
    r.shuffle(adults);
    let ai = 0;
    const assign = (job, k, pred) => {
      for (let i = 0; i < k; i++) {
        let j = -1;
        for (let t = ai; t < adults.length; t++) if (!pred || pred(adults[t])) { j = t; break; }
        if (j < 0) return;
        const tmp = adults[ai]; adults[ai] = adults[j]; adults[j] = tmp;
        adults[ai].job = job; ai++;
      }
    };
    const b = s.b, P = target;
    if (s.type === 'vanish') { for (const n of people) n.vanish = 1; }
    if (s.type === 'sea') { for (const n of people) { n.deep = 1; n.look = n.look.replace(/мужчина|женщина|старик|старуха|мальчик|девочка|молодой парень|молодая девушка/, 'существо с жабрами'); } }
    if (b.palace) { assign('ruler', 1, (n) => n.age >= 35); assign('noble', r.int(3, 6)); }
    if (b.guard) assign('guard', Math.max(2, Math.round(P / 14)), (n) => n.age < 55);
    if (b.walls && !b.guard) assign('guard', 2);
    if (b.smith) assign('smith', s.type === 'capital' ? 3 : s.type === 'town' ? 2 : 1, (n) => n.age >= 20);
    if (b.tavern) { assign('innkeeper', 1); if (r.chance(0.35)) assign('bard', 1); }
    if (b.temple) { assign('priest', 1, (n) => n.age >= 30); if (r.chance(0.5)) assign('healer', 1); if (r.chance(0.3)) assign('monk', 1); }
    if (b.market) assign('merchant', s.type === 'capital' ? 5 : s.type === 'town' ? 3 : 1);
    if (b.library) { assign('librarian', 1, (n) => n.age >= 25); if (r.chance(0.4)) assign('scholar', 1); if (r.chance(0.35)) assign('mage', 1); }
    if (b.alch) assign('alchemist', 1);
    if (b.mine) assign('miner', Math.max(2, Math.round(P * 0.08)), (n) => n.age < 55);
    if (b.dock) { assign('fisher', Math.max(2, Math.round(P * 0.14))); assign('boatman', 1); }
    if (b.grave) assign('gravedigger', 1);
    if (s.type === 'town' || s.type === 'capital') { assign('caravaneer', 1); if (r.chance(0.55)) assign('veteran', 1, (n) => n.age >= 35); if (r.chance(0.5)) assign('shadow', 1); assign('beggar', s.type === 'capital' ? 2 : 1); }
    if (r.chance(0.25)) assign('wanderer', 1);
    if (['village', 'hamlet', 'farm', 'tree'].includes(s.type)) assign('elder', 1, (n) => n.age >= 50);
    assign('baker', s.type === 'farm' ? 0 : Math.max(1, Math.round(P / 40)));
    assign('herbalist', s.type === 'farm' ? 0 : 1);
    if (['forest', 'ancient', 'tundra', 'mountain', 'plains'].includes(g.biome) || b.fields) { assign('hunter', Math.max(1, Math.round(P * 0.05))); assign('woodcutter', Math.max(1, Math.round(P * 0.05))); }
    if (b.fields) { assign('farmer', Math.round(P * (s.type === 'capital' ? 0.08 : 0.26))); assign('shepherd', Math.max(1, Math.round(P * 0.04))); }
    if (s.type === 'sea') { assign('fisher', Math.round(P * 0.3)); }
    if (s.type === 'capital' || s.type === 'town') { assign('farmer', Math.round(P * 0.14)); assign('fisher', s.b.dock ? Math.round(P * 0.05) : 0); }
    const rest = s.type === 'capital' || s.type === 'town' ? ['laborer', 'weaver', 'potter', 'laborer', 'merchant'] : ['farmer', 'laborer', 'weaver', 'potter', 'farmer'];
    for (let t = ai; t < adults.length; t++) adults[t].job = r.pick(rest);
    for (const n of people) {
      if (n.age < 14) n.job = 'child';
      else if (n.age >= 72) n.job = r.chance(0.5) ? 'laborer' : (s.type === 'hamlet' || s.type === 'village' ? 'elder' : 'laborer');
      if (n.age < 14 || n.job !== 'laborer') n.look = makeLook(n, r);
      else n.look = makeLook(n, r);
    }
    // друзья и враги
    for (const n of people) {
      const k = r.int(1, 3);
      for (let i = 0; i < k; i++) { const o = r.pick(people); if (o !== n && !n.fam.includes(o.id) && !n.friends.includes(o.id)) { n.friends.push(o.id); o.friends.push(n.id); } }
      if (r.chance(0.3)) { const o = r.pick(people); if (o !== n && !n.fam.includes(o.id) && !n.friends.includes(o.id)) { n.enemies.push(o.id); o.enemies.push(n.id); } }
    }
  }

  // ---------- государства ----------
  function genFactions(W, r) {
    const caps = W.settlements.filter((s) => s.type === 'capital');
    const used = new Set();
    caps.forEach((s, i) => {
      const [kind, g] = r.pick(N.realmKind);
      let nm;
      do { nm = N.fantasy(r); } while (used.has(nm));
      used.add(nm);
      const ruler = s.npcs.map((id) => W.npcs[id]).find((n) => n.job === 'ruler');
      const f = { id: i, name: kind + ' ' + U.gen(nm), short: nm, kind, capital: s.id, ruler: ruler ? ruler.id : -1, color: ['#e06060', '#60a0e0', '#e0c060', '#60c080', '#c070e0', '#e09050', '#70d0d0'][i % 7] };
      if (ruler) for (const fid of ruler.fam) if (W.npcs[fid].age >= 14) W.npcs[fid].job = 'noble';
      W.factions.push(f);
      s.fac = i;
    });
    for (const s of W.settlements) {
      if (s.fac >= 0 || s.type === 'vanish' || s.type === 'sea') continue;
      let best = -1, bd = 99;
      for (const f of W.factions) { const c = W.settlements[f.capital]; const d = Math.abs(c.rx - s.rx) + Math.abs(c.ry - s.ry); if (d < bd) { bd = d; best = f.id; } }
      s.fac = bd <= 10 ? best : -1;
      W.regions[s.region].fac = s.fac;
    }
    for (const g of W.regions) {
      if (g.settlement >= 0) { g.fac = W.settlements[g.settlement].fac; continue; }
      let best = -1, bd = 99;
      for (const f of W.factions) { const c = W.settlements[f.capital]; const d = Math.abs(c.rx - g.x) + Math.abs(c.ry - g.y); if (d < bd) { bd = d; best = f.id; } }
      g.fac = bd <= 8 && g.biome !== 'ocean' ? best : -1;
    }
  }

  // ---------- дороги ----------
  function genRoads(W, r) {
    const ss = W.settlements.filter((s) => !['sea', 'vanish'].includes(s.type) && !['sky'].includes(W.regions[s.region].biome));
    // Прим: O(n²)
    const n = ss.length;
    const inT = new Uint8Array(n), bestD = new Array(n).fill(1e9), bestP = new Array(n).fill(-1);
    const edges = [];
    let cur = 0;
    inT[0] = 1;
    for (let k = 1; k < n; k++) {
      const a = ss[cur];
      let nx = -1, nd = 1e9;
      for (let j = 0; j < n; j++) {
        if (inT[j]) continue;
        const d = Math.abs(a.rx - ss[j].rx) + Math.abs(a.ry - ss[j].ry);
        if (d < bestD[j]) { bestD[j] = d; bestP[j] = cur; }
        if (bestD[j] < nd) { nd = bestD[j]; nx = j; }
      }
      if (nx < 0) break;
      inT[nx] = 1;
      if (nd <= 6) edges.push([ss[bestP[nx]], ss[nx]]);
      cur = nx;
    }
    // несколько дополнительных связей
    for (let i = 0; i < ss.length / 4; i++) { const a = r.pick(ss), b = r.pick(ss); const d = Math.abs(a.rx - b.rx) + Math.abs(a.ry - b.ry); if (d > 0 && d <= 3) edges.push([a, b]); }
    const mark = (x, y, dir) => { const id = idx(x, y); W.roads[id] = (W.roads[id] || 0) | dir; };
    for (const [a, b] of edges) {
      let x = a.rx, y = a.ry;
      const hFirst = r.chance(0.5);
      const steps = [];
      if (hFirst) { while (x !== b.rx) { steps.push([Math.sign(b.rx - x), 0]); x += Math.sign(b.rx - x); } while (y !== b.ry) { steps.push([0, Math.sign(b.ry - y)]); y += Math.sign(b.ry - y); } }
      else { while (y !== b.ry) { steps.push([0, Math.sign(b.ry - y)]); y += Math.sign(b.ry - y); } while (x !== b.rx) { steps.push([Math.sign(b.rx - x), 0]); x += Math.sign(b.rx - x); } }
      x = a.rx; y = a.ry;
      let ok = true;
      for (const [dx, dy] of steps) { const nb = W.regions[idx(x + dx, y + dy)]; if (nb.biome === 'ocean' || nb.biome === 'sky') { ok = false; break; } x += dx; y += dy; }
      if (!ok) continue;
      x = a.rx; y = a.ry;
      for (const [dx, dy] of steps) {
        const d1 = dx === 1 ? 2 : dx === -1 ? 8 : dy === 1 ? 4 : 1;
        const d2 = dx === 1 ? 8 : dx === -1 ? 2 : dy === 1 ? 1 : 4;
        mark(x, y, d1); x += dx; y += dy; mark(x, y, d2);
      }
    }
  }

  // ---------- хранители молитв ----------
  function assignKeepers(W, r) {
    const olds = W.npcs.filter((n) => n.age >= 62 && n.sett >= 0);
    for (const p of W.prayers) {
      if (p.src !== 'elder') continue;
      if (!olds.length) break;
      const k = r.int(1, 3);
      p.keepers = [];
      for (let i = 0; i < k; i++) { const n = r.pick(olds); if (!p.keepers.includes(n.id)) { p.keepers.push(n.id); (n.keeps = n.keeps || []).push(p.id); } }
    }
  }

  // ---------- боссы ----------
  function genBosses(W, r) {
    const list = [];
    for (const d of D.bossDefs) {
      const b = Object.assign({}, d);
      if (d.home.startsWith('dim:')) { b.dim = d.home.slice(4); b.region = null; }
      else if (d.home === 'start') { const nb = World.nb4(W.regions[W.start].x, W.regions[W.start].y).map(([x, y]) => W.regions[idx(x, y)]).filter((g) => g.biome !== 'ocean'); b.region = (nb.length ? r.pick(nb) : W.regions[W.start]).id; }
      else if (d.home === 'none') b.region = null;
      else if (d.home === 'abyss') b.region = W.special.abyss[0];
      else {
        const pool = W.regions.filter((g) => g.biome === d.home && g.id !== W.start && (d.where !== 'dun' || g.dun));
        const pool2 = pool.length ? pool : W.regions.filter((g) => g.biome === d.home && g.id !== W.start);
        if (pool2.length) {
          const g = r.pick(pool2);
          b.region = g.id;
          if (d.where === 'dun' && !g.dun) { g.dun = { type: d.dun || 'cave', depth: Math.max(d.depth || 3, 3) }; g.features.push('dungeon'); }
          if (d.where === 'dun' && g.dun) { if (d.dun) g.dun.type = d.dun; g.dun.depth = Math.max(g.dun.depth, d.depth || 3); }
          if (d.camp) g.features.push('camp');
        } else b.region = null;
      }
      list.push(b);
    }
    const gen = D.genBosses(W.seed, W.regions, 296);
    for (const b of gen) { const g = W.regions[b.region]; if (b.where === 'dun' && !g.dun) b.where = 'over'; if (b.where === 'dun') b.depth = Math.min(b.depth, g.dun.depth); list.push(b); }
    W.bosses = list;
    W.bossById = {};
    W.bossByRegion = {};
    list.forEach((b, i) => { b.i = i; W.bossById[b.id] = b; if (b.region != null) (W.bossByRegion[b.region] = W.bossByRegion[b.region] || []).push(i); });
  }

  // ---------- уникальные предметы ----------
  function genUniques(W, r) {
    const used = new Set();
    W.uniques = [];
    const total = 4200;
    const owners = W.npcs.filter((n) => n.sett >= 0 && n.age >= 18 && ['smith', 'noble', 'ruler', 'merchant', 'veteran', 'priest', 'hunter', 'guard', 'elder', 'librarian', 'mage', 'innkeeper', 'shadow', 'wanderer', 'alchemist', 'scholar', 'bard'].includes(n.job));
    const dunRegs = W.regions.filter((g) => g.dun);
    const overRegs = W.regions.filter((g) => g.biome !== 'ocean' && (g.features.includes('ruins') || g.features.includes('camp') || g.features.includes('shrine') || g.features.includes('altar')));
    const shops = W.settlements.filter((s) => s.b.market);
    for (let i = 0; i < total; i++) {
      let tier = 1, where;
      const p = r.next();
      if (p < 0.33 && owners.length) { const n = r.pick(owners); if (W.npcUq[n.id] == null) { W.npcUq[n.id] = i; tier = W.regions[W.settlements[n.sett].region].danger; where = 'npc'; } }
      if (!where && p < 0.66 && dunRegs.length) { const g = r.pick(dunRegs); (W.uqDun[g.id] = W.uqDun[g.id] || []).push(i); tier = g.danger + 2; where = 'dun'; }
      if (!where && p < 0.85 && overRegs.length) { const g = r.pick(overRegs); (W.uqOver[g.id] = W.uqOver[g.id] || []).push(i); tier = g.danger; where = 'over'; }
      if (!where && p < 0.93 && shops.length) { const s = r.pick(shops); (W.uqShop[s.id] = W.uqShop[s.id] || []).push(i); tier = W.regions[s.region].danger; where = 'shop'; }
      if (!where) { const b = r.int(0, W.bosses.length - 1); if (W.uqBoss[b] == null) { W.uqBoss[b] = i; tier = W.bosses[b].tier * 2; where = 'boss'; } else { const g = r.pick(dunRegs); (W.uqDun[g.id] = W.uqDun[g.id] || []).push(i); tier = g.danger + 2; } }
      W.uniques.push(D.makeUnique(W, i, U.clamp(tier, 1, 30), used));
    }
  }

  // ---------- особые места и тайники ----------
  function place(W, regId, o) { (W.placements[regId] = W.placements[regId] || []).push(o); }
  World.place = place;
  function genSpecial(W, r) {
    const st = W.regions[W.start];
    const near = (a, b, f) => W.regions.filter((g) => { const d = Math.abs(g.x - st.x) + Math.abs(g.y - st.y); return d >= a && d <= b && g.biome !== 'ocean' && g.exist === 'always' && (!f || f(g)); });
    // священный ручей
    let pool = near(2, 4, (g) => ['plains', 'forest', 'coast'].includes(g.biome));
    const stream = pool.length ? r.pick(pool) : st;
    if (!stream.features.includes('stream')) stream.features.push('stream');
    W.special.stream = stream.id;
    // разрушенный храм с камнем
    pool = near(2, 5, (g) => g.id !== stream.id && g.biome !== 'sky');
    const temple = pool.length ? r.pick(pool) : st;
    if (!temple.features.includes('ruins')) temple.features.push('ruins');
    temple.features.push('temple');
    W.special.temple = temple.id;
    place(W, temple.id, { k: 'item', b: 'temple_stone', inTemple: 1 });
    // старый молот — у кого-то из соседей
    pool = W.settlements.filter((s) => { const d = Math.abs(s.rx - st.x) + Math.abs(s.ry - st.y); return d >= 1 && d <= 4 && ['village', 'hamlet', 'town'].includes(s.type); });
    const hs = pool.length ? r.pick(pool) : W.settlements[st.settlement];
    const hn = W.npcs[r.pick(hs.npcs)];
    W.npcItem[hn.id] = 'old_hammer';
    W.special.hammerOwner = hn.id;
    // секретные предметы
    const putAt = (b, f, extra) => { const l = W.regions.filter((g) => g.biome !== 'ocean' && g.exist === 'always' && f(g)); if (l.length) place(W, r.pick(l).id, Object.assign({ k: 'item', b }, extra || {})); };
    putAt('owl_feather', (g) => g.biome === 'forest' || g.biome === 'ancient');
    putAt('owl_feather', (g) => g.biome === 'tundra');
    putAt('seed', (g) => g.biome === 'ash', { chest: 1 });
    putAt('shell', (g) => g.biome === 'coast');
    putAt('shell', (g) => g.biome === 'coast');
    putAt('bell', (g) => g.features.includes('shrine'), { chest: 1 });
    putAt('candle', (g) => g.dun && ['crypt', 'barrow', 'tomb'].includes(g.dun.type), { chest: 1 });
    putAt('mirror_shard', (g) => g.features.includes('ruins') && g.danger >= 4, { chest: 1 });
    putAt('map_scrap', (g) => g.biome === 'coast', { corpse: 1 });
    putAt('holed_coin', (g) => g.settlement >= 0 && W.settlements[g.settlement].b.grave, { grave: 1 });
    putAt('holed_coin', (g) => g.features.includes('ruins'), { grave: 1 });
    putAt('rusty_key', (g) => g.danger >= 3, { corpse: 1 });
    putAt('empty_bottle', (g) => g.features.includes('camp'));
    putAt('blank_book', (g) => g.features.includes('ruins'), { chest: 1 });
    putAt('skull', (g) => g.biome === 'ash');
    // кукла — для матери, чей ребёнок пропал
    const mothers = W.npcs.filter((n) => n.sex === 'f' && n.age >= 28 && n.age <= 55 && n.sett >= 0 && ['village', 'hamlet'].includes(W.settlements[n.sett].type));
    if (mothers.length) {
      const m = r.pick(mothers);
      m.lostChild = r.pick(N.female);
      const sg = W.regions[W.settlements[m.sett].region];
      const l = W.regions.filter((g) => Math.abs(g.x - sg.x) + Math.abs(g.y - sg.y) <= 3 && g.biome !== 'ocean' && g.id !== sg.id);
      place(W, (l.length ? r.pick(l) : sg).id, { k: 'item', b: 'doll', mother: m.id });
      W.special.dollMother = m.id;
    }
    // запертое хранилище для ржавого ключа
    { const l = W.regions.filter((g) => g.features.includes('ruins') && g.danger >= 5); if (l.length) { const g = r.pick(l); place(W, g.id, { k: 'vault' }); W.special.vault = g.id; } }
    // трон в Пустоте и корона Безымянного
    { const l = W.regions.filter((g) => g.biome === 'ash' && g.danger >= 6) ; const g = l.length ? r.pick(l) : r.pick(W.regions.filter((x) => x.biome !== 'ocean')); place(W, g.id, { k: 'site', s: 'throne_ruin' }); place(W, g.id, { k: 'item', b: 'a_crown', onThrone: 1 }); W.special.crown = g.id; }
    // лунная дева, перевозчик, глубинный старейшина — в измерениях
    W.special.moonmaid = addNpc(W, r, { first: 'Лунная дева', sur: '', sex: 'f', age: 1000, job: 'priest', sett: -1, region: W.start, special: 'moonmaid', look: 'бледная женщина, сквозь которую видно звёзды' }).id;
    W.special.ferryman = addNpc(W, r, { first: 'Перевозчик', sur: '', sex: 'm', age: 9999, job: 'boatman', sett: -1, region: W.start, special: 'ferryman', look: 'фигура в плаще, с веслом и без лица' }).id;
    W.special.deepelder = addNpc(W, r, { first: 'Старейшина глубин', sur: '', sex: 'm', age: 400, job: 'elder', sett: -1, region: W.start, special: 'deepelder', look: 'существо с жабрами и человеческими глазами' }).id;
    W.special.hag = addNpc(W, r, { first: 'Карга', sur: '', sex: 'f', age: 300, job: 'hermit', sett: -1, region: (W.bossById.b_bog_hag.region != null ? W.bossById.b_bog_hag.region : W.start), special: 'hag', look: 'сгорбленная старуха с глазами разного цвета' }).id;
    // в глухих местах — свежие тела путников
    for (let i = 0; i < 30; i++) { const g = r.pick(W.regions.filter((x) => x.biome !== 'ocean' && x.settlement < 0)); place(W, g.id, { k: 'corpse', loot: 1 }); }
  }

  // ---------- сюжеты ----------
  function bindStories(W, r) {
    const H = {
      r, W,
      pick(f) { for (let k = 0; k < 4000; k++) { const n = W.npcs[r.int(0, W.npcs.length - 1)]; if (n.sett >= 0 && !n.special && !n.role && f(n)) { n.role = 1; return n; } } return null; },
      region(f) { const l = W.regions.filter((g) => g.exist === 'always' && g.id !== W.start && f(g)); return l.length ? r.pick(l) : null; },
      regions(f, k) { return r.sample(W.regions.filter((g) => g.exist === 'always' && f(g)), k); },
      place(id, o) { place(W, id, o); },
      addNpc(o) {
        const spec = Object.assign({ sett: o.sett != null ? o.sett : -1 }, o);
        const n = addNpc(W, r, spec);
        if (spec.sett >= 0) W.settlements[spec.sett].npcs.push(n.id);
        return n.id;
      },
    };
    for (const s of D.stories) {
      try {
        const roles = s.bind(H);
        if (roles) W.storyRoles[s.id] = roles;
      } catch (e) { console.warn('story bind', s.id, e); }
    }
  }
})(window.EOF);
