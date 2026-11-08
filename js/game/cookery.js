'use strict';
// Кухня. У костра, очага или в печи любую еду можно смешать — от двух до четырёх продуктов и трав (и воды).
// Что выйдет — считается из того, что положил: сытость, ОЗ, ОМ, утоление жажды, эффекты трав.
// Узнаваемые сочетания дают имя и прибавку (щи, уха, каша на молоке, варенье, пирог в печи, мятный чай…),
// неудачные (рыба с молоком, рыба с мёдом) — мутят. Большой котёл — несколько мисок. Как сварил (мини-игра) — так и вкусно.
// Плюс новые растения по краям: ромашка, мята, крапива, чабрец, черемша, шиповник, брусника, морошка, белые грибы…
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, UI = E.UI, Items = E.Items;
  const CK = E.Cook = {};
  const item = (id, n, g, t, o) => { if (!D.items[id]) D.items[id] = Object.assign({ id, n, g, t, w: 1, v: 1, d: '' }, o); };
  const food = (id, n, g, f, v, o) => item(id, n, g, 'food', Object.assign({ w: 0.5, v, food: f, st: 1 }, o));
  const herb = (id, n, g, v, d) => item(id, n, g, 'mat', { herb: 1, w: 0.1, v, st: 1, d });
  const nm = (b) => (b === 'water' ? 'Вода' : D.items[b] ? D.items[b].n : b);

  // ---------- новые растения ----------
  herb('h_chamomile', 'Ромашка', 'f', 3, 'Белые лепестки, жёлтая серединка. Успокаивает.');
  herb('h_mint', 'Мята', 'f', 3, 'Холодит язык и голову.');
  herb('h_nettle', 'Крапива', 'f', 2, 'Жжётся. В похлёбке — силу даёт.');
  herb('h_thyme', 'Чабрец', 'm', 4, 'Горная трава. Пахнет так, что теплеет внутри.');
  herb('h_garlic', 'Черемша', 'f', 4, 'Дикий чеснок. Ни хворь, ни нечисть его не любят.');
  herb('h_rosehip', 'Шиповник', 'm', 4, 'Красные ягоды с колючек. Бодрят дух.');
  herb('h_yarrow', 'Тысячелистник', 'm', 4, 'Им останавливают кровь.');
  herb('h_stjohn', 'Зверобой', 'm', 5, 'Трава от ста болезней.');
  herb('h_lavender', 'Лаванда', 'f', 6, 'Сиреневые колоски. Клонит в сон.');
  herb('h_lichen', 'Исландский мох', 'm', 5, 'Серый лишайник с камней. Горький, но сытный.');
  food('lingonberry', 'Брусника', 'f', 8, 2, { w: 0.2, d: 'Кислая, с горчинкой.' });
  food('blueberry', 'Черника', 'f', 8, 2, { w: 0.2, d: 'Пачкает пальцы и губы. Говорят, глаза от неё видят в темноте.' });
  food('cloudberry', 'Морошка', 'f', 10, 4, { w: 0.2, d: 'Янтарная северная ягода.' });
  food('hazelnut', 'Лесные орехи', 'p', 12, 3, { w: 0.2, d: 'Горсть лещины.' });
  food('mushroom_white', 'Белые грибы', 'p', 14, 4, { w: 0.3, cook: 'mushroom_fried', d: 'Крепкие боровики. Без подвоха.' });
  food('mushroom_fried', 'Жареные грибы', 'p', 30, 6, { w: 0.3, d: 'С хрустящим краем.' });
  food('mushroom_fly', 'Мухомор', 'm', 2, 3, { w: 0.2, d: 'Красный в белую крапинку. Лучше не есть. Шаманы едят.' });
  food('seaweed', 'Морская капуста', 'f', 9, 2, { w: 0.3, d: 'Солёная, скользкая, полезная.' });
  food('wild_onion', 'Дикий лук', 'm', 6, 1, { w: 0.1, d: 'Злой, до слёз.' });
  food('dates', 'Финики', 'p', 16, 5, { w: 0.3, d: 'Сладкие, как мёд. Растут у оазисов.' });
  food('cactus_fruit', 'Плод кактуса', 'm', 8, 3, { w: 0.3, thirst: -20, d: 'Сочный, под колючками.' });
  food('cattail', 'Корень рогоза', 'm', 10, 1, { w: 0.3, d: 'Крахмалистый болотный корень. Печёный — сытный.' });
  food('burnt', 'Горелое', 'n', 4, 0, { w: 0.3, d: 'Угли с привкусом еды.' });
  item('dish', 'Блюдо', 'n', 'food', { w: 0.6, v: 10, food: 30, d: 'Своё блюдо.' });
  // где что растёт (дополнение к прежним травам)
  const WILD = CK.WILD = {
    plains: ['h_chamomile', 'h_yarrow', 'h_stjohn', 'h_rosehip', 'wild_onion', 'h_nettle', 'h_mint'],
    forest: ['h_nettle', 'h_garlic', 'lingonberry', 'blueberry', 'hazelnut', 'mushroom_white', 'mushroom_fly', 'h_mint', 'h_stjohn'],
    ancient: ['h_garlic', 'mushroom_white', 'mushroom_fly', 'hazelnut', 'blueberry', 'h_mint'],
    swamp: ['cattail', 'cloudberry', 'blueberry', 'h_mint', 'h_yarrow'],
    tundra: ['cloudberry', 'lingonberry', 'h_lichen', 'h_thyme'],
    ice: ['h_lichen', 'h_lichen', 'cloudberry'],
    mountain: ['h_thyme', 'h_lichen', 'wild_onion', 'h_stjohn'],
    coast: ['seaweed', 'h_lavender', 'h_rosehip', 'h_chamomile'],
    desert: ['dates', 'cactus_fruit', 'h_lavender'],
  };
  const ga0 = Gm.gather;
  Gm.gather = function (x, y) {
    const m = G.map, P = G.P, list = WILD[m.biome], t = m.tiles[y * m.w + x];
    let b = null;
    if (t === T.MUSHROOM && (m.biome === 'forest' || m.biome === 'ancient') && Math.random() < 0.45) b = Math.random() < 0.7 ? 'mushroom_white' : 'mushroom_fly';
    else if (list && t !== T.MUSHROOM && Math.random() < 0.5) b = list[Math.floor(Math.random() * list.length)];
    if (!b) return ga0.apply(this, arguments);
    if (Math.random() < 0.6 + P.st.luck * 0.02) { Gm.give(b); if (D.items[b].herb) { Gm.cnt('herbs'); Gm.gain('herb'); } }
    else Gm.msg('Ничего полезного.');
    Gm.setTile(x, y, m.biome === 'swamp' ? T.SWAMP : T.GRASS);
    Gm.endTurn(3);
  };
  // новые травы — и в котёл алхимика
  Object.assign(D.recipes, {
    'h_nettle+h_yarrow': 'p_heal', 'h_plantain+h_yarrow': 'p_heal', 'h_rosehip+h_sage': 'p_spirit', 'h_garlic+h_wormwood': 'p_antidote',
    'h_ashbloom+h_thyme': 'p_warm', 'h_bloodroot+h_stjohn': 'p_str', 'h_lavender+h_moonwort': 'p_sleep', 'h_chamomile+h_lavender': 'p_sleep',
    'h_mint+h_saltmoss': 'p_breath', 'blueberry+h_moonwort': 'p_night', 'h_lichen+h_rosehip': 'p_spirit', 'h_garlic+holy_water': 'holy_water',
  });

  // ---------- что в каждом продукте ----------
  // k — вид: meat fish grain veg fruit nut sweet dairy mush drink herb spice water
  const TG = CK.TG = {
    meat_raw: { k: 'meat' }, meat_cooked: { k: 'meat' }, jerky: { k: 'meat' }, stew: { k: 'meat', hp: 4 },
    fish_raw: { k: 'fish' }, fish_cooked: { k: 'fish' }, smoked_fish: { k: 'fish' }, fish_big: { k: 'fish' }, fish_baked: { k: 'fish' },
    eel: { k: 'fish' }, eel_fried: { k: 'fish' }, crayfish: { k: 'fish' }, crayfish_boiled: { k: 'fish' },
    bread: { k: 'grain' }, rusk: { k: 'grain' }, rye: { k: 'grain', food: 12 }, pie: { k: 'grain' },
    turnip: { k: 'veg' }, cabbage: { k: 'veg' }, wild_onion: { k: 'veg', hp: 2 }, cattail: { k: 'veg' }, seaweed: { k: 'veg', th: -5, mp: 2 },
    berries: { k: 'fruit', mp: 3 }, apple: { k: 'fruit' }, lingonberry: { k: 'fruit', mp: 3, cure: 'cold' }, blueberry: { k: 'fruit', mp: 4, fx: ['nighteye', 120] },
    cloudberry: { k: 'fruit', mp: 5, hp: 3 }, dates: { k: 'fruit', hp: 2 }, cactus_fruit: { k: 'fruit', th: -20 }, hazelnut: { k: 'nut', hp: 2 },
    honey: { k: 'sweet', hp: 4 }, star_jelly: { k: 'sweet', mp: 15 },
    cheese: { k: 'dairy' }, milk: { k: 'dairy', th: -20 },
    mushrooms: { k: 'mush' }, mushroom_white: { k: 'mush', hp: 3 }, mushroom_fried: { k: 'mush' }, mushroom_fly: { k: 'mush', bad: 1 }, spores: { k: 'mush', bad: 1 },
    ale: { k: 'drink', th: -10 }, kvass: { k: 'drink', th: -20 },
    h_plantain: { k: 'herb', hp: 6 }, h_sage: { k: 'herb', mp: 4 }, h_wormwood: { k: 'herb', cure: 'poison', bitter: 1 },
    h_bloodroot: { k: 'herb', hp: 8, cure: 'bleed' }, h_moonwort: { k: 'herb', mp: 8, fx: ['nighteye', 240] }, h_mandrake: { k: 'herb', fx: ['might', 180], bitter: 1 },
    h_ashbloom: { k: 'herb', fx: ['warmth', 480] }, h_frost: { k: 'herb', th: -15 }, h_saltmoss: { k: 'herb', salt: 1 }, h_sundew: { k: 'herb', fx: ['regenbuff', 120] },
    h_chamomile: { k: 'herb', hp: 3, fx: ['calm', 240] }, h_mint: { k: 'herb', th: -15, cure: 'nausea' }, h_nettle: { k: 'herb', hp: 5, fx: ['regenbuff', 180] },
    h_thyme: { k: 'herb', fx: ['warmth', 360], cure: 'cold' }, h_garlic: { k: 'herb', cure: 'poison', fx: ['ironskin', 120] }, h_rosehip: { k: 'herb', mp: 10 },
    h_yarrow: { k: 'herb', hp: 6, cure: 'bleed' }, h_stjohn: { k: 'herb', hp: 4, cure: 'weak', fx: ['content', 240] }, h_lavender: { k: 'herb', fx: ['calm', 300] },
    h_lichen: { k: 'herb', food: 6, hp: 2 },
    salt: { k: 'spice', salt: 1 }, spice: { k: 'spice', fx: ['warmth', 240] },
    water: { k: 'water', th: -30 },
  };
  CK.tag = function (b) {
    const d = D.items[b] || {}, t = TG[b] || {};
    const k = t.k || (/^milk/.test(b) ? 'dairy' : d.drink ? 'drink' : d.herb ? 'herb' : /meat|jerky/.test(b) ? 'meat' : /fish|eel|cray/.test(b) ? 'fish' : /berr|apple|fruit/.test(b) ? 'fruit' : /mush|shroom/.test(b) ? 'mush' : d.veg ? 'veg' : d.grain ? 'grain' : d.t === 'food' ? 'misc' : 'spice');
    // сырое в котле доходит: сытость — как у готового
    const ready = d.cook && D.items[d.cook] ? D.items[d.cook] : d;
    const f = t.food != null ? t.food : (k === 'herb' || k === 'spice' || k === 'water') ? 1 : ready.food || 4;
    return { k, food: f, hp: (t.hp || 0) + (ready.heal || 0), mp: t.mp || 0, th: t.th != null ? t.th : (d.thirst || 0), fx: t.fx, cure: t.cure, bitter: t.bitter, bad: t.bad, salt: t.salt };
  };
  // узнаваемые сочетания: элементы — id, «a|b» (любой из), «#вид»
  const COMBO = CK.COMBO = [
    { all: ['#meat', '#veg', 'water'], n: 'Щи', hp: 8, fx: ['regenbuff', 360] },
    { all: ['#fish', 'water'], n: 'Уха', hp: 6, th: -10, fx: ['focus', 240] },
    { all: ['rye', 'water'], oven: 1, n: 'Ржаной хлеб', food: 15 },
    { all: ['#grain', '#fruit'], oven: 1, n: 'Пирог с ягодами', fx: ['joy', 300] },
    { all: ['#grain', '#meat'], oven: 1, n: 'Пирог с мясом', hp: 6, fx: ['might', 180] },
    { all: ['#grain', '#veg'], oven: 1, n: 'Пирог с капустой', hp: 4, fx: ['content', 240] },
    { all: ['#grain', '#fish'], oven: 1, n: 'Рыбник', hp: 5, fx: ['focus', 240] },
    { all: ['#grain', '#dairy'], n: 'Каша на молоке', hp: 5, fx: ['content', 360] },
    { all: ['#grain', 'water'], n: 'Каша', hp: 3, fx: ['content', 180] },
    { all: ['#meat', 'h_garlic'], n: 'Мясо с черемшой', fx: ['ironskin', 300] },
    { all: ['#meat', 'h_ashbloom'], n: 'Огненное жаркое', fx: ['warmth', 600] },
    { all: ['#meat', 'h_mandrake'], n: 'Колдовское жаркое', fx: ['fury', 180] },
    { all: ['#meat', 'h_thyme|h_sage|wild_onion'], n: 'Мясо в травах', hp: 4, fx: ['might', 180] },
    { all: ['#meat', '#veg'], n: 'Жаркое с овощами', hp: 6, fx: ['might', 240] },
    { all: ['#meat', '#mush'], n: 'Жаркое с грибами', hp: 5, fx: ['might', 180] },
    { all: ['#fish', 'h_thyme|h_mint|h_sage|wild_onion'], n: 'Рыба с травами', fx: ['focus', 300] },
    { all: ['seaweed', '#fish'], n: 'Морской салат', mp: 8, th: -8 },
    { all: ['crayfish|crayfish_boiled', 'ale'], n: 'Раки под эль', fx: ['luckbuff', 300] },
    { all: ['#mush', 'h_nettle'], n: 'Грибы с крапивой', fx: ['regenbuff', 300] },
    { all: ['#mush', 'water'], n: 'Грибная похлёбка', hp: 5, fx: ['nighteye', 180] },
    { all: ['#mush', 'wild_onion'], n: 'Грибы с луком', food: 8, hp: 4 },
    { all: ['#veg', 'water'], n: 'Овощная похлёбка', hp: 4, th: -10 },
    { all: ['turnip', 'honey'], n: 'Пареная репа с мёдом', hp: 6, fx: ['content', 240] },
    { all: ['cabbage', 'salt'], n: 'Квашеная капуста', food: 6, fx: ['regenbuff', 180] },
    { all: ['h_rosehip', 'honey'], n: 'Взвар шиповника', mp: 20, fx: ['focus', 180] },
    { all: ['cloudberry', 'honey'], n: 'Морошка в меду', mp: 14, fx: ['warmth', 360] },
    { all: ['hazelnut', 'honey'], n: 'Козинак', hp: 6, fx: ['might', 240] },
    { all: ['dates', '#dairy'], n: 'Финики в молоке', hp: 6, fx: ['haste', 180] },
    { all: ['star_jelly', '#fruit'], n: 'Звёздный кисель', mp: 30, fx: ['focus', 600] },
    { all: ['#fruit', 'honey'], n: 'Варенье', mp: 10, fx: ['joy', 300] },
    { all: ['#dairy', 'honey'], n: 'Молоко с мёдом', hp: 6, fx: ['calm', 300] },
    { all: ['#fruit', 'water'], n: 'Компот', th: -25, mp: 6 },
    { all: ['h_mint', 'water'], n: 'Мятный чай', th: -20, fx: ['calm', 300] },
    { all: ['h_chamomile', 'water'], n: 'Ромашковый чай', hp: 8, fx: ['calm', 300] },
    { all: ['h_stjohn', 'water'], n: 'Зверобойный чай', hp: 6, fx: ['content', 300] },
    { all: ['h_thyme', 'water'], n: 'Чабрецовый чай', fx: ['warmth', 480] },
    { all: ['h_lavender', 'honey'], n: 'Лавандовый мёд', mp: 6, fx: ['calm', 480] },
    { all: ['h_lichen', 'water'], n: 'Мшаный кисель', food: 10, fx: ['warmth', 240] },
    { all: ['h_frost', 'water'], n: 'Ледяной отвар', th: -35 },
    { all: ['#herb', 'water'], n: 'Травяной отвар', hp: 3 },
    // неудачные
    { all: ['#fish', '#dairy'], bad: 1 }, { all: ['#fish', '#sweet'], bad: 1 }, { all: ['#fish', '#fruit'], bad: 1 },
    { all: ['mushroom_fly'], bad: 1, fx: ['drunk', 120] },
  ];
  const elHit = (el, ids, kinds) => el.split('|').some((x) => (x[0] === '#' ? kinds.has(x.slice(1)) : ids.has(x)));
  function baseName(kinds, oven) {
    const w = kinds.has('water');
    if (oven && kinds.has('grain')) return 'Печево';
    if (kinds.has('fish')) return w ? 'Рыбная похлёбка' : 'Рыба с гарниром';
    if (kinds.has('meat')) return w ? 'Мясная похлёбка' : 'Жаркое';
    if (kinds.has('mush')) return 'Грибное рагу';
    if (kinds.has('veg')) return 'Тушёные овощи';
    if (kinds.has('grain')) return 'Лепёшки';
    if (kinds.has('fruit') || kinds.has('sweet') || kinds.has('nut')) return 'Сладкая смесь';
    if (kinds.has('herb')) return 'Травяная закуска';
    if (kinds.has('dairy')) return 'Молочное';
    return 'Варево';
  }
  const shortN = (b) => nm(b).toLowerCase().replace(/^(сырое|сырая|жареное|жареная|варёные|запечённая|копчёная) /, '');
  // посчитать блюдо (без мини-игры: q — качество 0…1)
  CK.make = function (list, opt) {
    opt = opt || {};
    const tags = list.map(CK.tag), ids = new Set(list), kinds = new Set(tags.map((t) => t.k));
    let food = 0, hp = 0, mp = 0, th = 0, bad = 0;
    const fx = {}, cures = new Set();
    const addFx = (f, k) => { if (f && D.effects[f[0]]) fx[f[0]] = Math.max(fx[f[0]] || 0, Math.round(f[1] * (k || 1))); };
    for (const t of tags) { food += t.food; hp += t.hp; mp += t.mp; th += t.th; addFx(t.fx); if (t.cure) cures.add(t.cure); if (t.bad) bad++; }
    food *= 1 + 0.12 * (list.length - 1);
    if (tags.some((t) => t.salt)) food *= 1.15;
    if (tags.some((t) => t.bitter) && !kinds.has('sweet')) food *= 0.85;
    let name = null;
    const hits = [];
    for (const c of COMBO) {
      if (c.oven && !opt.oven) continue;
      if (!c.all.every((el) => elHit(el, ids, kinds))) continue;
      if (c.bad) { bad++; addFx(c.fx); continue; }
      if (hits.length >= 2) continue; // главное сочетание и ещё одно — не больше
      const k = name ? 0.5 : 1; // первое сочетание — главное, второе — вполсилы
      if (!name) name = c.n;
      hits.push(c.n);
      food += (c.food || 0) * k; hp += (c.hp || 0) * k; mp += (c.mp || 0) * k; th += (c.th || 0) * k; addFx(c.fx, k);
    }
    const generic = !name;
    name = name || baseName(kinds, opt.oven);
    const q = opt.q == null ? 0.6 : opt.q, mul = 0.8 + 0.4 * q;
    food *= mul; hp *= mul; mp *= mul;
    for (const k in fx) fx[k] = Math.round(fx[k] * mul);
    const solid = ['meat', 'fish', 'grain', 'veg', 'mush', 'nut'].some((k) => kinds.has(k)) || ids.has('cheese');
    const wet = kinds.has('water') || kinds.has('drink') || list.some((b) => /^milk/.test(b));
    return { name, generic, food, hp, mp, th, fx, cures: [...cures], bad, drink: wet && !solid, hits, list: list.slice() };
  };
  // готовое блюдо → миски
  function bowls(r, burnt) {
    const servings = Math.max(1, Math.min(4, Math.round(r.food / 42)));
    const out = [];
    const ingr = r.list.map(shortN).join(', ');
    const fxl = Object.keys(r.fx).map((k) => [k, r.fx[k]]);
    const n = burnt ? r.name + ' (подгорело)' : r.generic ? r.name + ' (' + ingr + ')' : r.name;
    for (let i = 0; i < servings; i++) {
      const it = Items.make('dish');
      const food = Math.max(3, Math.round(r.food / servings * (burnt ? 0.5 : 1)));
      const hp = Math.round((r.hp / servings + 2) * (burnt ? 0.3 : 1));
      const mp = Math.round(r.mp / servings * (burnt ? 0.3 : 1));
      Object.assign(it, {
        n, food, heal: hp, mp, thirst: Math.round(r.th / Math.max(1, servings * 0.6)), fx: burnt ? [] : fxl, cures: burnt ? [] : r.cures, bad: r.bad + (burnt ? 1 : 0), drink: r.drink ? 1 : 0, ing: r.list,
        v: Math.round(4 + food / 4 + hp + mp + fxl.length * 6),
      });
      const parts = ['Сытость +' + food];
      if (hp) parts.push('ОЗ +' + hp);
      if (mp) parts.push('ОМ +' + mp);
      if (it.thirst < 0) parts.push('жажда ' + it.thirst);
      for (const [k, d] of it.fx) parts.push((D.effects[k] ? D.effects[k].n : k) + ' ' + Math.round(d / 60) + ' ч');
      if (it.cures.length) parts.push('снимает: ' + it.cures.map((c) => (D.effects[c] ? D.effects[c].n.toLowerCase() : c)).join(', '));
      it.d = 'Из: ' + ingr + '. ' + parts.join(' · ') + '.' + (it.bad ? ' Сочетание странное — может замутить.' : '');
      out.push(it);
    }
    return out;
  }
  CK.preview = (list, oven) => CK.make(list, { oven, q: 0.6 });

  // ---------- есть своё блюдо ----------
  const eat0 = Gm.eat;
  Gm.eat = function (it) {
    if (!it || it.b !== 'dish') {
      const r = eat0.apply(this, arguments);
      if (it && it.b === 'mushroom_fly' && G.P && !G.P.dead) {
        if (Math.random() < 0.5) { Gm.fx('poison', 30); Gm.msg('Горло сжимает. Яд.', '#c0a060'); }
        else { Gm.fx('drunk', 180); Gm.fx('nighteye', 240); Gm.msg('Мир плывёт. В тенях — чьи-то лица, и все они улыбаются.', '#d0a0ff'); }
      }
      return r;
    }
    const P = G.P;
    Gm.removeItem(it);
    let f = (it.food || 10) * Gm.fxMul('food');
    for (const s in P.eq) { const x = P.eq[s]; if (x && x.b === 'a_frostheart') f *= 0.5; }
    P.hunger = Math.min(100, P.hunger + f);
    if (!Gm.fxFlag('noRegen')) Gm.healPlayer((it.heal || 0) + Math.round(f / 8), true);
    if (it.mp) P.mp = Math.min(P.mmp, P.mp + it.mp);
    if (it.thirst && Gm.thirstAdd) Gm.thirstAdd(it.thirst);
    if (Gm.needAdd) Gm.needAdd(f * 0.22);
    for (const c of it.cures || []) Gm.rmFx(c);
    for (const [k, d] of it.fx || []) if (D.effects[k]) Gm.fx(k, d);
    if (it.bad && Math.random() < 0.3 * it.bad) { Gm.fx('nausea', 60); Gm.msg('Странное сочетание. Желудок не согласен.', '#c0a060'); }
    if (Gm.day() === P.startDay) P.flags.ate_first_day = 1;
    const sum = [it.heal ? 'ОЗ +' + it.heal : '', it.mp ? 'ОМ +' + it.mp : ''].filter(Boolean).join(', ');
    Gm.msg((it.drink ? 'Ты пьёшь: ' : 'Ты ешь: ') + it.n.toLowerCase() + '.' + (sum ? ' (' + sum + ')' : ''), '#e8d8a8');
    Gm.cnt('eaten'); Gm.cnt('dishes_eaten'); Gm.gain('eat');
    Gm.fire('eat', { item: it });
    Gm.calc();
    Gm.endTurn(2);
  };

  // ---------- у огня ----------
  const play = (o, k, fn) => (E.Trades && E.Trades.play ? E.Trades.play(o, k, fn) : UI.mgPlay(o, (r) => fn(r || { ok: true, q: 0.6 })));
  const ovenNear = () => !!(Gm.nearTile && ((T.OVEN != null && Gm.nearTile(T.OVEN, 1)) || (T.KILN != null && Gm.nearTile(T.KILN, 1))));
  // где взять воду: фляги, кружки, бурдюки — или колодец, ручей рядом
  const waterSrc = () => G.P.inv.filter((i) => i.cont && i.water && i.water !== 'holy');
  const waterFree = () => { const P = G.P; return Gm.nearWater(P.x, P.y, 2) || (T.WELL != null && Gm.nearTile(T.WELL, 3)); };
  const waterLeft = () => (waterFree() ? 4 : waterSrc().reduce((s, i) => s + (i.sips != null ? i.sips : (D.items[i.b] || {}).sips || 1), 0));
  function useWater() {
    if (waterFree()) return true;
    const c = waterSrc()[0];
    if (!c) return false;
    const base = D.items[c.b] || {};
    if (base.sips) { c.sips = (c.sips == null ? base.sips : c.sips) - 1; if (c.sips <= 0) { c.water = null; c.sips = null; } }
    else if (!base.holyVessel && c.b !== 'holy_vessel') c.water = null;
    return true;
  }
  const isIngr = (it) => { const d = D.items[it.b]; return !!d && it.b !== 'dish' && it.b !== 'burnt' && (d.t === 'food' || d.herb || TG[it.b]); };

  const cook0 = Gm.cook;
  Gm.cook = function () { CK.menu(); };
  CK.menu = function () {
    const P = G.P, oven = ovenNear();
    const raw = P.inv.filter((it) => D.items[it.b] && D.items[it.b].cook);
    const nraw = raw.reduce((s, i) => s + (i.q || 1), 0);
    const items = [];
    if (nraw) items.push({ t: 'Пожарить сырое (' + nraw + ')', f: () => { UI.pop(); roastAll(); return 'keep'; } });
    items.push({ t: (oven ? 'Испечь или сварить' : 'Сварить или пожарить') + ' — смешать продукты', f: () => { UI.pop(); CK.mix(oven); return 'keep'; } });
    const known = Object.keys((P.known && P.known.dishes) || {});
    if (known.length) items.push({ t: 'Что я уже готовил (' + known.length + ')', f: () => { Gm.popup('Поваренная память', known.map((k) => '• ' + k + ' — ' + P.known.dishes[k]).join('\n')); return 'keep'; } });
    items.push({ t: 'Погреть руки у огня', f: () => { UI.pop(); Gm.msg('Ты греешь руки у огня.'); Gm.endTurn(1); return 'keep'; } });
    UI.list({ title: oven ? 'Печь' : 'Огонь', header: 'Любую еду можно смешать: от двух до четырёх продуктов, трав и воды.', items });
  };
  function roastAll() {
    play({ type: 'hold', title: 'Жарка', hint: 'Держи жар ровным: зажми — раздуть угли, отпусти — притушить. Мясо — в окошке.', glyph: '🍖', col: '#ffb060', zone: 0.32, speed: 0.75, rate: 1.25 }, 'cooked', (r) => {
      const P = G.P;
      if (r.ok) {
        cook0.call(Gm);
        if (r.q >= 0.85) { Gm.msg('Корочка — загляденье. Не пересушено ни кусочка.', '#ffe08a'); Gm.xp(3); }
        return;
      }
      let burnt = 0, done = 0;
      for (const it of P.inv.slice()) {
        const b = D.items[it.b];
        if (!b || !b.cook) continue;
        const q = it.q || 1, bq = Math.ceil(q / 2);
        Gm.removeItem(it);
        if (q - bq > 0) Gm.give(b.cook, q - bq, true);
        Gm.give('burnt', bq, true);
        burnt += bq; done += q - bq;
      }
      Gm.msg('Огонь взялся слишком сильно. Сгорело: ' + burnt + (done ? ', удалось спасти: ' + done : '') + '.', '#e09070');
      Gm.endTurn(10);
    });
  }
  // выбрать продукты
  CK.mix = function (oven) {
    const P = G.P, sel = [];
    const left = (it) => (it.q || 1) - sel.filter((b) => b === it.b).length;
    const items = () => {
      const out = [];
      if (sel.length >= 2) {
        const r = CK.preview(sel, oven), knownIt = P.known && P.known.dishes && P.known.dishes[r.name];
        out.push({ t: '▶ Готовить: ' + (r.generic || knownIt ? r.name : '???') + ' — ' + sel.map(shortN).join(' + '), f: () => { const s = sel.slice(); UI.pop(); cookMix(s, oven); return 'keep'; } });
      } else out.push({ t: 'Выбери от двух до четырёх продуктов (' + sel.length + ' / 4)', f: () => 'keep', dim: 1 });
      if (sel.length) out.push({ t: '✕ Убрать: ' + shortN(sel[sel.length - 1]), f: () => { sel.pop(); return 'keep'; } });
      const wl = waterLeft() - sel.filter((b) => b === 'water').length;
      if (wl > 0) out.push({ t: '  Вода' + (waterFree() ? ' (рядом)' : ' (из фляги, ' + wl + ')') + (sel.includes('water') ? '  ✓' : ''), f: () => { if (sel.length < 4) sel.push('water'); return 'keep'; } });
      const seen = new Set();
      for (const it of P.inv) {
        if (!isIngr(it) || seen.has(it.b)) continue;
        seen.add(it.b);
        const n = sel.filter((b) => b === it.b).length, l = Gm.count(it.b) - n;
        const t = CK.tag(it.b);
        const hint = [t.hp ? 'ОЗ' : '', t.mp ? 'ОМ' : '', t.fx && D.effects[t.fx[0]] ? D.effects[t.fx[0]].n.toLowerCase() : '', t.th < 0 ? 'утоляет жажду' : ''].filter(Boolean).join(', ');
        out.push({ t: (n ? '✓' + n + ' ' : '  ') + nm(it.b) + ' (' + Math.max(0, l) + ')' + (hint ? ' — ' + hint : ''), g: UI.itemGlyph ? UI.itemGlyph(it) : null, f: () => { if (sel.length >= 4) Gm.msg('Больше четырёх в котёл не влезет.'); else if (l > 0) sel.push(it.b); return 'keep'; } });
      }
      return out;
    };
    UI.list({ title: (oven ? 'Печь' : 'Котелок') + ' — что смешать', header: 'Сочетания узнаются, когда приготовишь. Вода — для похлёбки, каши и отвара.', items });
  };
  function cookMix(list, oven) {
    const P = G.P;
    const need = {};
    for (const b of list) if (b !== 'water') need[b] = (need[b] || 0) + 1;
    for (const b in need) if (Gm.count(b) < need[b]) { Gm.msg('Не хватает: ' + nm(b).toLowerCase() + '.'); return; }
    const nw = list.filter((b) => b === 'water').length;
    if (nw > waterLeft()) { Gm.msg('Не хватает воды.'); return; }
    const pre = CK.preview(list, oven), soup = list.includes('water');
    const o = oven ? { type: 'hold', title: 'Печь — ' + (pre.generic ? 'что-то выйдет' : '…'), hint: 'Держи жар в печи: зажми — подкинуть дров, отпусти — пусть остывает. Хлеб — в окошке.', glyph: '🍞', col: '#e8c080', zone: 0.3, speed: 0.75, rate: 1.2 }
      : soup ? { type: 'rhythm', title: 'Котелок', hint: 'Помешивай в такт: жми, когда ложка над чертой.', need: 5, tries: 3, speed: 0.95, col: '#e0c890', glyph: '🥄' }
        : { type: 'hold', title: 'Сковорода', hint: 'Держи огонь: зажми — сильнее, отпусти — слабее. Еда — в окошке.', glyph: '🍳', col: '#ffc070', zone: 0.3, speed: 0.8, rate: 1.2 };
    play(o, 'cooked', (r) => {
      for (const b in need) if (Gm.count(b) < need[b]) return;
      for (const b in need) Gm.take(b, need[b]);
      for (let i = 0; i < nw; i++) useWater();
      const res = CK.make(list, { oven, q: r.ok ? r.q : 0.2 });
      const out = bowls(res, !r.ok);
      for (const it of out) Gm.give(it);
      P.known = P.known || {};
      P.known.dishes = P.known.dishes || {};
      const fresh = res.hits.filter((h) => !P.known.dishes[h]);
      for (const h of res.hits) if (!P.known.dishes[h]) P.known.dishes[h] = list.map(shortN).join(' + ');
      Gm.msg((r.ok ? 'Готово: ' : 'Подгорело, но есть можно: ') + out[0].n.toLowerCase() + (out.length > 1 ? ' — ' + out.length + ' ' + U.plural(out.length, 'миска', 'миски', 'мисок') : '') + '.', r.ok ? '#e8d890' : '#e09070');
      if (fresh.length && r.ok) Gm.msg('Новое сочетание: ' + fresh.join(', ') + '. Запомнилось.', '#ffe08a');
      if (r.ok && r.q >= 0.85) Gm.msg('Мастерски! Вкус — как у бабушки.', '#ffe08a');
      Gm.cnt('cooked'); Gm.cnt('dishes'); Gm.gain('craft'); Gm.xp(3 + out.length + fresh.length * 4);
      Gm.endTurn(oven ? 40 : 20);
    });
  }

  // ---------- где взять ----------
  const SH = E.Dlg && E.Dlg.SHOP;
  if (SH) {
    if (SH.herbs) SH.herbs.push('h_chamomile', 'h_mint', 'h_nettle', 'h_thyme', 'h_garlic', 'h_rosehip', 'h_yarrow', 'h_stjohn', 'h_lavender');
    if (SH.general) SH.general.push('wild_onion', 'hazelnut', 'lingonberry');
    if (SH.bakery) SH.bakery.push('rye', 'rye');
    if (SH.hunter) SH.hunter.push('mushroom_white', 'hazelnut');
  }
})(window.EOF);
