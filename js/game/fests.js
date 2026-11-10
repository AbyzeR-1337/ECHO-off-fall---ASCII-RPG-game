'use strict';
// Праздники народов — от северных и западных до восточных и южных.
// У каждой культуры края свой склад (север, запад, восток, юг) и свой календарь: Проводы Зимы, Майский день,
// Купальская ночь, Праздник урожая, Карнавал масок, Ночь Духов, Ночь Долгой Зимы, Праздник фонарей,
// Праздник цветения, Праздник Луны, Новый год Дракона, Праздник огней, Праздник красок, Праздник Нового Солнца
// и собственный праздник культуры. В праздник площадь украшена (столб с лентами, костры, бумажные фонари, знамёна),
// жители собираются на площади, еда дешевле, распорядитель предлагает обряды и состязания.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, UI = E.UI, Ent = E.Ent, Dlg = E.Dlg, MG = E.MapGen, Time = E.Time;
  const FS = E.Fests = {};
  const MW = E.C.MW;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------- праздничные вещи ----------
  const it = (id, n, g, t, o) => { if (!D.items[id]) D.items[id] = Object.assign({ id, n, g, t, w: 1, v: 1, d: '' }, o); };
  const food = (id, n, g, f, v, o) => it(id, n, g, 'food', Object.assign({ w: 0.4, v, food: f, st: 1 }, o));
  food('bliny', 'Блины', 'p', 30, 5, { d: 'Стопка горячих блинов со сметаной. Круглые и жёлтые, как весеннее солнце.' });
  food('mulled_wine', 'Глинтвейн', 'm', 4, 6, { drink: 1, thirst: -25, d: 'Горячее вино с мёдом и пряностями. Греет лучше шубы.' });
  food('sweet_rice', 'Сладкая каша', 'f', 28, 4, { d: 'Пшеничная каша с мёдом и финиками. Её варят всю ночь.' });
  food('holiday_sweets', 'Праздничные сладости', 'p', 18, 6, { w: 0.2, d: 'Шарики из орехов, мёда и масла, обсыпанные сахаром.' });
  it('wreath', 'Венок из цветов', 'm', 'trinket', { s: 'trinket', w: 0.1, v: 6, mods: { luck: 1 }, d: 'Сплетён в праздник. Пока не завял — удача рядом.' });
  it('fern_flower', 'Цвет папоротника', 'm', 'trinket', { s: 'trinket', w: 0.05, v: 300, mods: { luck: 4, int: 1 }, d: 'Цветок, которого не бывает. Распускается одну ночь в году — и только для того, кто не испугался.' });
  it('paper_lantern', 'Бумажный фонарик', 'm', 'misc', { w: 0.2, v: 4, d: 'Красный, с золотой кистью. На боку — недописанное желание.' });
  if (!D.effects.colored) D.effects.colored = { id: 'colored', n: 'Пёстрые краски', kind: 'bless', d: 'Ты весь в цветной пыли. Встречные улыбаются — трудно сердиться на радугу.', mods: { luck: 1 } };
  if (!D.effects.feasted) D.effects.feasted = { id: 'feasted', n: 'Праздничная сытость', kind: 'bless', d: 'Ты наел[ся|ась] за общим столом. Силы прибавилось, лень тоже.', mods: { con: 2, str: 1 } };

  // ---------- праздники ----------
  // st — склад культуры: north (северный), west (западный), east (восточный), south (южный)
  const FEST = [
    { id: 'winter_out', n: 'Проводы Зимы', st: ['north'], m: 0, d: [1, 3], deco: 'fire', food: 'bliny', host: 'Скоморох', acts: ['burn', 'fist', 'feast'], txt: 'Пекут блины, жгут соломенное чучело зимы, бьются стенка на стенку.' },
    { id: 'nowruz', n: 'Праздник Нового Солнца', st: ['south'], m: 0, d: [1, 3], deco: 'fire', food: 'sweet_rice', host: 'Старейшина', acts: ['jumpfire', 'feast'], txt: 'Проращивают зерно, прыгают через огонь, всю ночь варят сладкую кашу.' },
    { id: 'dragon_new', n: 'Новый год Дракона', st: ['east'], m: 0, d: [1, 2], deco: 'lanterns', food: 'dumplings', host: 'Танцор дракона', acts: ['dragon', 'envelope'], txt: 'По улицам вьётся бумажный дракон, хлопают хлопушки, детям дарят красные конверты с монетами.' },
    { id: 'lanterns', n: 'Праздник фонарей', st: ['east'], m: 0, d: [15, 15], deco: 'lanterns', food: 'rice_cake', host: 'Хранитель фонарей', acts: ['riddle', 'release'], txt: 'Тысячи бумажных фонарей, и на каждом — загадка. Отгадал — получи награду.' },
    { id: 'colors', n: 'Праздник красок', st: ['south', 'east'], m: 1, d: [15, 15], deco: 'banners', food: 'holiday_sweets', host: 'Весёлый распорядитель', acts: ['colors', 'dance'], txt: 'Осыпают друг друга цветной пылью — и все становятся равны: пёстрые и смеющиеся.' },
    { id: 'mayday', n: 'Майский день', st: ['west'], m: 2, d: [1, 2], deco: 'pole', food: 'sweet_bun', host: 'Королева Мая', acts: ['dance', 'wreath'], txt: 'Ставят столб с лентами, плетут венки и выбирают Королеву Мая.' },
    { id: 'blossom', n: 'Праздник цветения', st: ['east'], m: 2, d: [5, 9], deco: 'lanterns', food: 'tea', host: 'Мастер чайной церемонии', acts: ['poem', 'tea'], txt: 'Сидят под цветущими деревьями, пьют чай и слагают короткие стихи.' },
    { id: 'kupala', n: 'Купальская ночь', st: ['north', 'west'], m: 4, d: [1, 1], deco: 'fire', food: 'kvass', host: 'Ведунья', acts: ['jumpfire', 'wreath', 'fern'], txt: 'Прыгают через костёр, пускают венки по воде, а смелые ищут в лесу цвет папоротника.' },
    { id: 'harvest', n: 'Праздник урожая', st: ['west', 'north', 'south', 'east'], m: 6, d: [15, 17], deco: 'pole', food: 'pie', host: 'Староста праздника', acts: ['pie', 'feast', 'dance'], txt: 'Столы ломятся, эль течёт рекой, а лучший пирог получает ленту и кошель.' },
    { id: 'moonfest', n: 'Праздник Луны', st: ['east', 'south'], m: 7, d: [15, 15], deco: 'lanterns', food: 'mooncake', host: 'Сказительница', acts: ['moon', 'release'], txt: 'Едят лунные пряники, смотрят на луну и рассказывают про лунного зайца.' },
    { id: 'samhain', n: 'Ночь Духов', st: ['west', 'north'], m: 7, d: [30, 30], deco: 'fire', food: 'roasted_nuts', host: 'Хранительница памяти', acts: ['ancestors', 'mask'], txt: 'Граница между живыми и мёртвыми тоньше волоса: ставят свечи для предков, рядятся в маски, чтобы духи не узнали.' },
    { id: 'lights', n: 'Праздник огней', st: ['south'], m: 8, d: [15, 17], deco: 'lanterns', food: 'holiday_sweets', host: 'Жрица огней', acts: ['lamp', 'gift'], txt: 'Масляные лампы в каждом окне, сладости и подарки: свет побеждает тьму.' },
    { id: 'yule', n: 'Ночь Долгой Зимы', st: ['north', 'west'], m: 9, d: [21, 22], deco: 'fire', food: 'mulled_wine', host: 'Хозяин полена', acts: ['gift', 'feast'], txt: 'Жгут огромное полено, дарят подарки и поют до утра, чтобы солнце вернулось.' },
    { id: 'carnival', n: 'Карнавал масок', st: ['west', 'south'], m: 11, d: [26, 30], deco: 'banners', food: 'pretzel', host: 'Принц Карнавала', acts: ['mask', 'dance'], txt: 'Все в масках: король и нищий пляшут рядом, и никто не знает, кто есть кто.' },
  ];
  FS.LIST = FEST;
  const RACE_ST = { catfolk: 'east', fae: 'east', merfolk: 'east', elf: 'east', lizard: 'south', tiefling: 'south', dwarf: 'north', giant: 'north', wolfkin: 'north', orc: 'north', succubus: 'south', vampire: 'west' };
  FS.style = function (cu) {
    if (!cu) return 'west';
    if (cu.fstyle) return cu.fstyle;
    const h = (U.hash(G.W.seed, cu.id, 'fst') >>> 0) % 100;
    let st = RACE_ST[cu.race] || (h < 40 ? 'west' : h < 70 ? 'north' : h < 88 ? 'east' : 'south');
    if (h % 7 === 0) st = ['west', 'north', 'east', 'south'][h % 4];
    cu.fstyle = st;
    return st;
  };
  // свой праздник культуры — в свой день
  function ownFeast(cu) {
    if (!cu || !cu.feast) return null;
    const h = U.hash(G.W.seed, cu.id, 'own') >>> 0;
    return { id: 'own' + cu.id, n: cu.feast, st: [], m: h % 12, d: [1 + (h >>> 4) % 28, 1 + (h >>> 4) % 28 + 1], deco: ['fire', 'pole', 'lanterns', 'banners'][(h >>> 9) % 4], food: 'festival_cake', host: 'Распорядитель праздника', acts: ['feast', 'dance'], txt: 'Свой праздник здешнего народа: обычаи старые, и чужаку их растолкуют за кружкой.' };
  }
  FS.cultOfSett = (sid) => (E.Realms && E.Realms.cultOf ? E.Realms.cultOf(G.W, sid) : null);
  FS.festsOf = function (sid) {
    const cu = FS.cultOfSett(sid);
    const st = FS.style(cu);
    const out = FEST.filter((f) => f.st.includes(st));
    const own = ownFeast(cu); if (own) out.push(own);
    return out;
  };
  const dayOfYear = (t) => Math.floor(t / 1440) % 360;
  FS.today = function (sid, t) {
    const s = G.W.settlements[sid];
    if (!s || ['sea', 'vanish', 'farm'].includes(s.type)) return null;
    t = t == null ? G.S.time : t;
    const mo = Time.month(t), dm = Time.dom(t);
    for (const f of FS.festsOf(sid)) if (f.m === mo && dm >= f.d[0] && dm <= f.d[1]) return f;
    return null;
  };
  FS.next = function (sid) {
    const doy = dayOfYear(G.S.time);
    let best = null, bd = 999;
    for (const f of FS.festsOf(sid)) { const fd = f.m * 30 + f.d[0] - 1; const dd = (fd - doy + 360) % 360; if (dd > 0 && dd < bd) { bd = dd; best = f; } }
    return best ? { f: best, in: bd } : null;
  };

  // ---------- убранство площади (на время праздника) ----------
  function decoOn(m, f) {
    if (m._fest && m._fest.id === f.id) return;
    decoOff(m);
    const F = m._fest = { id: f.id, cells: [] };
    const sq = (m.spots && m.spots.square) || [];
    const c = m.settCenter; if (!c || !sq.length) return;
    const near = (x, y) => U.DIR8.some(([dx, dy]) => { const t = m.tiles[(y + dy) * MW + x + dx]; return t === T.DOOR || t === T.WELL || t === T.GATE; });
    const free = (x, y) => { const i = y * MW + x, t = m.tiles[i]; return TL[t].walk && !TL[t].link && !m.feat[i] && !(m.stalls && m.stalls[i]) && !m.occ.has(i) && !(x === G.P.x && y === G.P.y) && !near(x, y) && U.DIR4.filter(([dx, dy]) => TL[m.tiles[(y + dy) * MW + x + dx]].walk).length >= 3; };
    const put = (x, y, t) => { if (!free(x, y)) return false; const i = y * MW + x; F.cells.push([i, m.tiles[i]]); m.tiles[i] = t; return true; };
    // края площади — подальше от центра
    const edge = sq.filter((p) => p.x !== c.x && p.y !== c.y).sort((a, b) => Math.hypot(b.x - c.x, b.y - c.y) - Math.hypot(a.x - c.x, a.y - c.y));
    if (f.deco === 'pole') { for (const [dx, dy] of [[0, -1], [0, 1], [-2, 0], [2, 0]]) if (put(c.x + dx, c.y + dy, T.MAYPOLE)) break; for (const p of edge.slice(0, 2)) put(p.x, p.y, T.BANNER); }
    else if (f.deco === 'fire') { for (const p of edge) if (put(p.x, p.y, T.CAMPFIRE)) break; for (const p of edge.slice(-3)) put(p.x, p.y, T.BANNER); }
    else if (f.deco === 'lanterns') { let n = 0; for (const p of edge) { if (n >= 6) break; if (put(p.x, p.y, T.PLANTERN)) n++; } }
    else if (f.deco === 'banners') { let n = 0; for (const p of edge) { if (n >= 4) break; if (put(p.x, p.y, T.BANNER)) n++; } for (const p of edge.slice(4, 7)) put(p.x, p.y, T.PLANTERN); }
  }
  function decoOff(m) {
    const F = m._fest; if (!F) return;
    for (const [i, t] of F.cells.reverse()) m.tiles[i] = t;
    for (const e of m.ents.slice()) if (e.custom === 'fest') Gm.removeEnt(e);
    m._fest = null;
  }
  FS.sync = function (m) {
    m = m || G.map;
    if (!m || m.kind !== 'over' || m.sett < 0 || m.dimName || !m.spots) return;
    if (G.S.sett[m.sett] && G.S.sett[m.sett].destroyed) return;
    const f = FS.today(m.sett), h = Time.hour(G.S.time);
    if (!f || h < 8) { if (m._fest) decoOff(m); return; }
    const fresh = !m._fest || m._fest.id !== f.id;
    decoOn(m, f);
    if (!m.ents.some((e) => e.custom === 'fest' && !e.dead)) {
      const c = m.settCenter || { x: m.w >> 1, y: m.h >> 1 };
      let p = null;
      const cand = [[1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0]].map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy })).concat(m.spots.square || [], m.spots.street || []);
      for (const q0 of cand) { const q = MG.findWalkNear(m, q0.x, q0.y); if (q && !m.occ.has(q.y * MW + q.x) && !(q.x === G.P.x && q.y === G.P.y)) { p = q; break; } }
      if (p) {
        const e = Ent.npc(G.W.special.ferryman, p.x, p.y);
        Object.assign(e, { npc: null, ghost: 0, immortal: 1, ai: 'still', kind: 'npc', custom: 'fest', fest: f.id, n: f.host, art: 'npc_bard', c: '#f0c870', g: /а$|я$|ица$|ня$/.test(f.host) ? 'f' : 'm', greet: 'С праздником! Сегодня — ' + f.n + '. ' + f.txt });
        Gm.addEnt(e);
      }
    }
    if (fresh) {
      const s = G.W.settlements[m.sett];
      Gm.msg('Сегодня ' + s.loc + ' — ' + f.n + '! ' + f.txt, '#f0d080');
    }
  };

  // ---------- распорядитель: обряды и состязания ----------
  const RIDDLES = [
    ['Без окон, без дверей — полна горница людей.', ['огурец', 'улей', 'тыква'], 0],
    ['Висит груша — нельзя скушать.', ['лампа', 'колокол', 'луна'], 0],
    ['Зимой и летом одним цветом.', ['ель', 'камень', 'небо'], 0],
    ['Кто ходит утром на четырёх, днём на двух, а вечером на трёх?', ['человек', 'конь', 'паук'], 0],
    ['Что можно увидеть с закрытыми глазами?', ['сон', 'тьму', 'ничего'], 0],
    ['Чем больше из неё берёшь, тем больше она становится.', ['яма', 'река', 'тень'], 0],
    ['Не огонь, а жжётся.', ['крапива', 'лёд', 'перец'], 0],
    ['Сидит дед, во сто шуб одет. Кто его раздевает, тот слёзы проливает.', ['лук', 'капуста', 'медведь'], 0],
    ['Что легче пуха, а удержать не может и силач?', ['дыхание', 'перо', 'дым'], 0],
    ['Что всегда идёт, а с места не сходит?', ['часы', 'река', 'дорога'], 0],
  ];
  const once = (k) => { G.S.festDone = G.S.festDone || {}; const key = k + ':' + Gm.day(); if (G.S.festDone[key]) return false; G.S.festDone[key] = 1; for (const q in G.S.festDone) if (+q.split(':').pop() < Gm.day() - 2) delete G.S.festDone[q]; return true; };
  const crowdLikes = (d) => { const m = G.map; for (const e of m.ents) if (e.npc != null && !e.dead && U.dist(e.x, e.y, G.P.x, G.P.y) < 10) Gm.op(e.npc, d); };
  const ACT = {
    burn: ['Поджечь чучело зимы', () => { if (!once('burn')) return 'Чучело уже догорело. Зима ушла!'; Gm.fx('merry', 60 * 10); Gm.xp && Gm.xp(8); crowdLikes(3); return 'Солома вспыхивает, чучело трещит и валится в огонь. Толпа кричит: «Прощай, зима!» — и ты кричишь вместе со всеми.'; }],
    fist: ['Встать в стенку на кулачки', () => {
      if (!once('fist')) return 'На сегодня бойцы разошлись — мокрые снегом и довольные.';
      const P = G.P; const roll = P.st.str + P.st.con / 2 + Math.random() * 10;
      if (roll >= 16) { P.gold += 15; crowdLikes(4); Gm.xp && Gm.xp(12); Gm.cnt('fest_wins'); return 'Ваша стенка гонит чужую до самого колодца! Тебя качают на руках и суют в кулак пятнадцать монет.'; }
      Gm.hurtPlayer(4, 'fist'); return 'Тебе прилетает в ухо так, что звенит до вечера. Зато смеются все — и ты тоже.';
    }],
    feast: ['Сесть за общий стол', () => { if (!once('feast')) return 'Ты уже наел[ся|ась] — больше не влезет.'; const P = G.P; P.hunger = Math.min(100, (P.hunger || 0) + 45); P.thirst = Math.max(0, (P.thirst || 0) - 30); Gm.fx('feasted', 60 * 8); crowdLikes(2); return 'Тебе наливают, подкладывают, хлопают по плечу. Чужак за праздничным столом — уже не совсем чужак.'; }],
    dance: ['Пуститься в пляс', () => {
      if (!once('dance')) return 'Ноги гудят — отдохни.';
      const P = G.P; Gm.fx('merry', 60 * 8);
      const e = G.map.ents.filter((q) => q.npc != null && !q.dead && U.dist(q.x, q.y, P.x, P.y) < 12);
      if (e.length && P.st.dex + Math.random() * 10 >= 12) { const q = pick(e); Gm.op(q.npc, 10); return 'Ты кружишься в хороводе, и ' + (Gm.npc(q.npc).first || 'кто-то') + ' не сводит с тебя глаз до конца пляски.'; }
      return 'Ты сбиваешься с шага, наступаешь кому-то на ногу — но в пляске это никого не смущает.';
    }],
    wreath: ['Сплести венок', () => { if (!once('wreath')) return 'Твой венок уже сплетён.'; Gm.give('wreath'); return 'Ромашки, васильки, колосок на счастье. Венок выходит кривоват, но свой.'; }],
    jumpfire: ['Прыгнуть через костёр', () => {
      if (!once('jump')) return 'Через огонь дважды не прыгают — примета дурная.';
      const P = G.P;
      if (P.st.dex + Math.random() * 10 >= 11) { Gm.fx('luckbuff', 60 * 12); crowdLikes(3); return 'Разбег — и ты пролетаешь над пламенем! Искры за спиной, толпа ахает. Удача теперь с тобой.'; }
      Gm.hurtPlayer(3, 'fire'); return 'Подол дымится, пятки горят. Тебя тушат всем миром, смеясь до слёз.';
    }],
    fern: ['Спросить о цвете папоротника', () => { G.P.flags.fernNight = Gm.day(); return 'Ведунья понижает голос: «Ровно в полночь, в глухом лесу, где папоротник по пояс, — распустится огненный цвет. Сорвёшь — будет тебе удача на всю жизнь. Только не оглядывайся, что бы ни звало за спиной».'; }],
    pie: ['Выставить пирог на состязание', () => {
      const P = G.P, cand = P.inv.filter((i) => ['pie', 'meat_pie', 'festival_cake', 'dish', 'sweet_bun', 'bliny'].includes(i.b));
      if (!cand.length) return 'Без пирога на состязание не пускают. Испеки — или купи, только не признавайся.';
      if (!once('pie')) return 'Ленту уже разыграли. Приходи на будущий год!';
      const p = cand.sort((a, b) => (b.v || 0) - (a.v || 0))[0];
      Gm.removeItem ? Gm.removeItem(p) : Gm.take(p.b, 1);
      if ((p.v || 5) + Math.random() * 12 >= 14) { P.gold += 30; Gm.cnt('fest_wins'); crowdLikes(4); return 'Судьи жуют, переглядываются... Лента твоя! И кошель в тридцать монет.'; }
      return 'Судьи жуют долго и задумчиво. Лента уходит соседке — у неё пирог с вишней. Но твой съели до крошки.';
    }],
    riddle: ['Отгадать загадку на фонаре', () => {
      if (!once('riddle')) return 'Все загадки на этом фонаре уже отгаданы. Приходи на следующий праздник.';
      const r = pick(RIDDLES), opts = r[1].map((a, i) => ({ a, i })).sort(() => Math.random() - 0.5);
      setTimeout(() => UI.menu('На фонаре тушью: «' + r[0] + '»', opts.map((o) => ({ t: U.cap(o.a), f: () => { if (o.i === r[2]) { const k = 10 + Math.floor(Math.random() * 20); G.P.gold += k; Gm.give('paper_lantern', 1, true); Gm.msg('Верно! Хранитель фонарей вручает тебе ' + k + ' монет и фонарик на память.', '#f0d080'); } else Gm.msg('Мимо. Хранитель фонарей улыбается: «Подумай ещё — в другой год».', '#a09080'); UI.render(); } }))), 0);
      return 'Ты подходишь к фонарю с загадкой...';
    }],
    release: ['Отпустить фонарик в небо (3 монеты)', () => { const P = G.P; if (P.gold < 3) return 'Фонарик стоит три монеты.'; P.gold -= 3; Gm.fx('merry', 60 * 8); if (Math.random() < 0.5) Gm.fx('luckbuff', 60 * 6); return 'Огонёк поднимается всё выше, к сотням других. Ты загадываешь желание — и почему-то веришь, что сбудется.'; }],
    poem: ['Сложить стих на состязание', () => {
      if (!once('poem')) return 'Ты уже читал[|а] сегодня. Дай слово другим.';
      const P = G.P;
      if (P.st.int + Math.random() * 10 >= 13) { P.gold += 20; Gm.xp && Gm.xp(10); return '«Ветер в ветвях. / Лепесток на ладони — / вся моя жизнь». Мастер кивает и вручает тебе кошель в двадцать монет.'; }
      return '«Цветы... красивы... / И чай... горячий...» Мастер вежливо молчит. Зато чай и правда горячий.';
    }],
    tea: ['Выпить чаю по обряду', () => { if (!once('tea')) return 'Вторая чашка уже не обряд, а просто чай.'; const P = G.P; P.mp = P.mmp; Gm.fx('calm', 60 * 8); P.thirst = Math.max(0, (P.thirst || 0) - 30); return 'Мастер долго и молча разливает чай. Мысли стихают, дух полон.'; }],
    moon: ['Смотреть на луну', () => { if (!once('moon')) return 'Луна та же, что час назад. И это хорошо.'; const P = G.P; P.mp = Math.min(P.mmp, P.mp + Math.round(P.mmp / 2)); if (D.effects.moon) Gm.fx('moon', 60 * 10); return 'Сказительница шепчет про зайца, что толчёт в ступе снадобье бессмертия. На луне и правда видно зайца.'; }],
    dragon: ['Нырнуть под бумажного дракона', () => { if (!once('dragon')) return 'Дракон уже унёсся дальше по улице.'; Gm.fx('merry', 60 * 10); Gm.fx('luckbuff', 60 * 8); crowdLikes(3); return 'Ты держишь шест, и дракон извивается над головами. Барабаны, хлопушки, крики — злые духи бегут из города.'; }],
    envelope: ['Получить красный конверт', () => { if (!once('envelope')) return 'Конверт дают один раз — на счастье.'; const k = 5 + Math.floor(Math.random() * 16); G.P.gold += k; return 'Красный конверт с золотым знаком. Внутри — ' + k + ' ' + U.plural(k, 'монета', 'монеты', 'монет') + ' и пожелание богатства.'; }],
    lamp: ['Зажечь лампу у порога', () => { if (!once('lamp')) return 'Твоя лампа горит.'; Gm.fx('calm', 60 * 8); Gm.gain && Gm.gain('pray'); return 'Масло, фитиль, огонёк. Твоя лампа — одна из тысячи, и вместе они гонят тьму до самого неба.'; }],
    gift: ['Обменяться подарками', () => {
      if (!once('gift')) return 'Подарками уже обменялись.';
      const P = G.P, mine = P.inv.filter((i) => !Object.values(P.eq).includes(i) && (i.v || 0) <= 30 && i.b !== 'gold');
      if (!mine.length) return 'Тебе нечего подарить. Не беда — тебе всё равно суют кулёк сладостей.' + (Gm.give('holiday_sweets', 1, true) ? '' : '');
      const g = pick(mine); Gm.removeItem ? Gm.removeItem(g) : Gm.take(g.b, 1);
      const back = pick(['ring', 'beads', 'bracelet', 'mulled_wine', 'holiday_sweets', 'candle', 'figurine', 'bouquet', 'wreath'].filter((b) => D.items[b]));
      Gm.give(back, 1, true); crowdLikes(2);
      return 'Ты даришь ' + (g.n || 'безделицу').toLowerCase() + ' — и получаешь в ответ: ' + D.items[back].n.toLowerCase() + '. Так и живут — от праздника до праздника.';
    }],
    colors: ['Осыпать всех красками', () => { if (!once('colors')) return 'На тебе уже живого места нет — всё в краске.'; Gm.fx('colored', 60 * 12); Gm.fx('merry', 60 * 10); crowdLikes(5); return 'Горсть алой пыли — в соседа, синей — в соседку. Через миг ты сам[|а] — радуга. Все смеются, и никто ни на кого не сердится.'; }],
    mask: ['Надеть праздничную маску (4 монеты)', () => { const P = G.P; if (P.gold < 4) return 'Маска стоит четыре монеты.'; P.gold -= 4; if (D.items.mask) Gm.give('mask', 1, true); if (D.effects.stealth) Gm.fx('stealth', 60 * 6); return 'Ты в маске — и тебя не узнаёт никто. Даже духи, говорят.'; }],
    ancestors: ['Поставить свечу предкам', () => {
      if (!once('anc')) return 'Твоя свеча горит. Предки видят.';
      const P = G.P; if (Gm.has('candle')) Gm.take('candle', 1); else if (P.gold >= 1) P.gold -= 1;
      Gm.fx('calm', 60 * 8); Gm.gain && Gm.gain('pray');
      const dl = G.S.deadList || [];
      if (dl.length && Math.random() < 0.6) { const id = dl[Math.floor(Math.random() * dl.length)], n = Gm.npc(id); if (n) return 'Огонёк вздрагивает. На миг тебе чудится в дыму лицо — ' + n.first + ', ' + (n.sex === 'f' ? 'она' : 'он') + ' кивает и тает. Здесь помнят всех.'; }
      return 'Свеча горит ровно. Ветер стих — будто кто-то встал рядом и молчит вместе с тобой.';
    }],
  };
  const op0 = Dlg.options;
  Dlg.options = function (e) {
    if (e && e.custom === 'fest') {
      const f = FEST.find((q) => q.id === e.fest) || ownFeast(FS.cultOfSett(G.map.sett)) || FEST[0];
      const o = [];
      if (f.food && D.items[f.food]) o.push({ t: 'Купить: ' + D.items[f.food].n.toLowerCase() + ' (' + Gm.money(Math.max(1, Math.round((D.items[f.food].v || 3) * 0.6)), true) + ')', f: () => { const P = G.P, p = Math.max(1, Math.round((D.items[f.food].v || 3) * 0.6)); if (P.gold < p) return 'Монет не хватает? Держи кусочек так — праздник же!'; P.gold -= p; Gm.give(f.food); return 'Держи! С праздником!'; } });
      for (const a of f.acts) if (ACT[a]) o.push({ t: ACT[a][0], f: ACT[a][1] });
      o.push({ t: 'Что это за праздник?', f: () => f.n + '. ' + f.txt });
      o.push({ t: 'Уйти', f: () => 'close' });
      return o;
    }
    const o = op0.apply(this, arguments);
    // любого горожанина можно спросить о праздниках
    try {
      if (e && e.npc != null && !e.hostile && o.length > 1 && o[o.length - 1].t === 'Уйти') {
        const n = Gm.npc(e.npc);
        if (n && n.sett != null && n.sett >= 0 && FS.festsOf(n.sett).length) o.splice(o.length - 1, 0, { t: 'Спросить о праздниках', f: () => FS.calendarTalk(n.sett) });
      }
    } catch (err) { /* */ }
    return o;
  };
  FS.calendarTalk = function (sid) {
    const list = FS.festsOf(sid).slice().sort((a, b) => a.m * 30 + a.d[0] - (b.m * 30 + b.d[0]));
    const nx = FS.next(sid), tod = FS.today(sid);
    const day = (f) => f.d[0] + (f.d[1] !== f.d[0] ? '–' + f.d[1] : '') + ' ' + D.monthsGen[f.m];
    let s = tod ? 'Так сегодня же ' + tod.n + '! Беги на площадь. ' : '';
    s += 'Празднуем мы ' + list.map((f) => f.n + ' (' + day(f) + ')').join(', ') + '.';
    if (nx && !tod) s += ' Ближе всего — ' + nx.f.n + ', через ' + nx.in + ' ' + U.plural(nx.in, 'день', 'дня', 'дней') + '.';
    return s;
  };
  // о близком празднике судачат
  const st0 = Dlg.smalltalk;
  Dlg.smalltalk = function (e) {
    try {
      const n = e && e.npc != null ? Gm.npc(e.npc) : null;
      if (n && n.sett >= 0 && Math.random() < 0.25) { const nx = FS.next(n.sett); if (nx && nx.in <= 6) return 'Через ' + nx.in + ' ' + U.plural(nx.in, 'день', 'дня', 'дней') + ' — ' + nx.f.n + '! ' + nx.f.txt; }
    } catch (err) { /* */ }
    return st0.apply(this, arguments);
  };
  // в праздник еда дешевле, а люди — на площади
  const pm0 = Dlg.priceMul;
  Dlg.priceMul = function (e, b, buy) {
    let m = pm0.apply(this, arguments);
    try { if (buy && G.map && G.map._fest && D.items[b] && D.items[b].t === 'food') m *= 0.75; } catch (err) { /* */ }
    return m;
  };
  const pl0 = Ent.place;
  Ent.place = function (id, hour) {
    const r = pl0.apply(this, arguments);
    const m = G.map;
    if (!m || !m._fest || hour < 10 || hour >= 23) return r;
    if (r === 'home' || r === 'square' || r === 'tavern' || r === 'rich' || r === 'poor') return (id * 7 + hour) % 10 < 6 ? 'square' : r;
    return r;
  };
  // цвет папоротника: в купальскую ночь, в лесу, к полуночи
  const tk0 = Gm.tick;
  Gm.tick = function () {
    const r = tk0.apply(this, arguments);
    try {
      const P = G.P, m = G.map;
      if (P && P.flags.fernNight != null && Gm.day() - P.flags.fernNight <= 1 && m && m.kind === 'over' && m.sett < 0 && ['forest', 'ancient', 'swamp'].includes(m.biome)) {
        const h = Gm.hour();
        if ((h >= 23 || h < 2) && !G.S.taken.fern_flower && Math.random() < 0.01) {
          G.S.taken.fern_flower = 1; P.flags.fernNight = null;
          Gm.give('fern_flower'); Gm.cnt('fern_flower');
          Gm.msg('Во тьме, среди папоротников, вспыхивает алый огонёк — и раскрывается цветок, которого не бывает. Ты срываешь его, не оглядываясь.', '#ff9060');
        }
      }
    } catch (err) { /* */ }
    return r;
  };
  const lm0 = Gm.loadMap;
  Gm.loadMap = function () { const r = lm0.apply(this, arguments); try { FS.sync(G.map); } catch (err) { console.warn('fests', err); } return r; };
  const hr0 = Ent.hourly;
  Ent.hourly = function () { const r = hr0.apply(this, arguments); try { FS.sync(G.map); } catch (err) { /* */ } return r; };
  const lv0 = Gm.leaveMap;
  Gm.leaveMap = function () { try { if (G.map && G.map._fest) decoOff(G.map); } catch (err) { /* */ } return lv0.apply(this, arguments); };
})(window.EOF);
