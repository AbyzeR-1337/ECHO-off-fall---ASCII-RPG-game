'use strict';
// Боссы: рукотворные и сгенерированные (всего более трёхсот).
// sp — правило появления: always | night | once | after | days | never | event | moon | weather
(function (E) {
  const U = E.U, D = E.D, N = E.N;
  // home — биом логова (или dim:<имя>), where — over|dun, depth — уровень подземелья
  D.bossDefs = [
    { id: 'b_stone_guard', n: 'Каменный Страж Ольмара', sn: 'Каменный Страж', g: 'm', ch: 'О', c: '#c0b8a0', tier: 4, tags: ['stone'], ab: ['aoe', 'regen'], sp: { k: 'always' }, home: 'mountain', where: 'dun', depth: 3, drops: ['iron_ore', 'crystal'], lore: 'Он стоит здесь дольше, чем помнят горы.' },
    { id: 'b_hungry_maw', n: 'Пасть Голодного Бога', sn: 'Пасть', g: 'f', ch: 'П', c: '#d04040', tier: 5, tags: ['other', 'god'], ab: ['drain', 'summon'], sp: { k: 'always' }, home: 'ash', where: 'dun', depth: 4, drops: ['a_gauntlet'], lore: 'Голод, у которого есть зубы.' },
    { id: 'b_moon_hound', n: 'Лунный Пёс', sn: 'Лунный Пёс', g: 'm', ch: 'Л', c: '#e0e8ff', tier: 4, tags: ['beast', 'spirit'], ab: ['charge', 'summon'], sp: { k: 'moon' }, home: 'plains', where: 'over', drops: ['a_moonsickle'], lore: 'Воет только в полнолуние.' },
    { id: 'b_storm_rider', n: 'Всадник Бури', sn: 'Всадник Бури', g: 'm', ch: 'В', c: '#a0c0ff', tier: 6, tags: ['spirit', 'other'], ab: ['fire', 'teleport'], sp: { k: 'weather', w: 'storm' }, home: 'mountain', where: 'over', drops: ['a_stormcloak'], lore: 'Появляется вместе с громом.' },
    { id: 'b_tide_queen', n: 'Королева Отлива', sn: 'Королева Отлива', g: 'f', ch: 'К', c: '#40c0d0', tier: 6, tags: ['water', 'undead'], ab: ['summon', 'freeze'], sp: { k: 'always' }, home: 'coast', where: 'dun', depth: 3, dun: 'flooded', drops: ['a_tidetrident'], lore: 'Её дворец ушёл под воду. Она осталась.' },
    { id: 'b_spite', n: 'Обиженный Рыцарь', sn: 'Обиженный Рыцарь', g: 'm', ch: 'Р', c: '#c08080', tier: 5, tags: ['undead', 'human'], ab: ['enrage', 'aoe'], sp: { k: 'always' }, home: 'ash', where: 'over', drops: ['a_spiteblade'], lore: 'Его предали. Он помнит каждого.' },
    { id: 'b_leviathan', n: 'Левиафан', sn: 'Левиафан', g: 'm', ch: 'Ѧ', c: '#3a90b0', tier: 10, tags: ['water', 'beast'], ab: ['swallow', 'aoe'], sp: { k: 'event', e: 'ocean' }, home: 'ocean', where: 'over', drops: ['pearl', 'pearl'], lore: 'Море проснулось.' },
    { id: 'b_dragon', n: 'Аргхаал, Пепел Неба', sn: 'Аргхаал', g: 'm', ch: 'Д', c: '#ff7020', tier: 11, tags: ['dragon', 'fire'], ab: ['fire', 'aoe', 'enrage'], sp: { k: 'event', e: 'dragon' }, home: 'volcanic', where: 'over', drops: ['a_dragonbone', 'scale_mat', 'scale_mat'], lore: 'Он уже умирал однажды.' },
    { id: 'b_shroom_heart', n: 'Сердце Грибницы', sn: 'Сердце Грибницы', g: 'n', ch: 'Ф', c: '#e080ff', tier: 6, tags: ['plant'], ab: ['summon', 'regen', 'poison'], sp: { k: 'event', e: 'shroom' }, home: 'swamp', where: 'over', drops: ['spore_heart'], lore: 'Всё прорастает отсюда.' },
    { id: 'b_blood_lord', n: 'Багровый Князь', sn: 'Багровый Князь', g: 'm', ch: 'Б', c: '#ff2040', tier: 7, tags: ['undead', 'other'], ab: ['drain', 'summon', 'teleport'], sp: { k: 'event', e: 'bloodmoon' }, home: 'plains', where: 'over', drops: ['a_deadbell'], lore: 'Приходит, когда луна краснеет.' },
    { id: 'b_black_winter', n: 'Чёрная Зима', sn: 'Чёрная Зима', g: 'f', ch: 'З', c: '#606070', tier: 7, tags: ['undead', 'spirit'], ab: ['freeze', 'aoe'], sp: { k: 'event', e: 'blacksnow' }, home: 'tundra', where: 'over', drops: ['a_frostheart'], lore: 'Снег, который помнит.' },
    { id: 'b_god_hunter', n: 'Ловчий Богов', sn: 'Ловчий', g: 'm', ch: 'Ӂ', c: '#ffe060', tier: 9, tags: ['god', 'other'], ab: ['summon', 'charge', 'fire'], sp: { k: 'event', e: 'hunt' }, home: 'forest', where: 'over', drops: ['a_sunspear'], lore: 'Боги вышли на охоту. Он — их рог.' },
    { id: 'b_mirror', n: 'Твоё Отражение', sn: 'Отражение', g: 'n', ch: '@', c: '#e8f0ff', tier: 6, tags: ['other'], ab: ['mirror'], sp: { k: 'always' }, home: 'dim:mirror', where: 'over', drops: ['a_mirrorshield'], lore: 'Оно ждало, пока ты придёшь.' },
    { id: 'b_dream_eater', n: 'Пожиратель Снов', sn: 'Пожиратель Снов', g: 'm', ch: 'С', c: '#b090ff', tier: 6, tags: ['dream', 'other'], ab: ['teleport', 'fear'], sp: { k: 'always' }, home: 'dim:dream', where: 'over', drops: ['a_hourglass'], lore: 'Ему снятся те, кого он съел.' },
    { id: 'b_void_judge', n: 'Судия Пустоты', sn: 'Судия', g: 'm', ch: 'Ѳ', c: '#a0a0ff', tier: 10, tags: ['other'], ab: ['drain', 'teleport', 'aoe'], sp: { k: 'always' }, home: 'dim:void', where: 'over', drops: ['a_voidlantern'], lore: 'Он спросит, зачем ты пришёл.' },
    { id: 'b_abyss_heart', n: 'Сердце Бездны', sn: 'Сердце Бездны', g: 'n', ch: 'Ж', c: '#ff3080', tier: 14, tags: ['other', 'god'], ab: ['summon', 'aoe', 'drain', 'regen'], sp: { k: 'always' }, home: 'abyss', where: 'dun', depth: 25, drops: [], lore: 'Оно бьётся под миром.' },
    { id: 'b_moon_king', n: 'Лунный Король', sn: 'Лунный Король', g: 'm', ch: 'Л', c: '#f0f0ff', tier: 9, tags: ['other', 'spirit'], ab: ['freeze', 'teleport'], sp: { k: 'always' }, home: 'dim:moon', where: 'over', drops: ['moon_pearl'], lore: 'Он правит пылью.' },
    { id: 'b_time_eater', n: 'Тот, Кто Ест Часы', sn: 'Едок Часов', g: 'm', ch: 'Ч', c: '#f0c060', tier: 9, tags: ['other'], ab: ['teleport', 'drain'], sp: { k: 'always' }, home: 'dim:time', where: 'over', drops: ['a_blindeye'], lore: 'Тик. Так. Хрум.' },
    { id: 'b_flesh_heart', n: 'Сердце Исполина', sn: 'Сердце Исполина', g: 'n', ch: 'Ѵ', c: '#ff6080', tier: 9, tags: ['beast', 'other'], ab: ['regen', 'summon'], sp: { k: 'always' }, home: 'dim:flesh', where: 'over', drops: ['meat_raw', 'meat_raw'], lore: 'Тук. Тук.' },
    { id: 'b_living_mountain', n: 'Пробудившаяся Гора', sn: 'Гора', g: 'f', ch: 'Г', c: '#c08060', tier: 10, tags: ['stone'], ab: ['aoe', 'regen'], sp: { k: 'days', d: 150 }, home: 'living', where: 'over', drops: ['a_golem_heart'], lore: 'Гора открыла глаза.' },
    { id: 'b_barrow_king', n: 'Курганный Король', sn: 'Курганный Король', g: 'm', ch: 'К', c: '#d0c090', tier: 5, tags: ['undead'], ab: ['summon', 'aoe'], sp: { k: 'always' }, home: 'plains', where: 'dun', depth: 3, dun: 'crypt', drops: ['a_graveshovel'], lore: 'Он правит теми, кто под землёй.' },
    { id: 'b_forest_heart', n: 'Дух Пущи', sn: 'Дух Пущи', g: 'm', ch: 'Ѱ', c: '#80e080', tier: 7, tags: ['plant', 'spirit'], ab: ['summon', 'regen'], sp: { k: 'night' }, home: 'ancient', where: 'over', drops: ['a_rootcrown'], lore: 'Лес смотрит его глазами.' },
    { id: 'b_star_fallen', n: 'Падший со Звезды', sn: 'Падший', g: 'm', ch: 'Ӿ', c: '#ffffa0', tier: 8, tags: ['other', 'fire'], ab: ['fire', 'teleport'], sp: { k: 'event', e: 'star' }, home: 'plains', where: 'over', drops: ['a_starheart'], lore: 'Он упал вместе со звездой. Или был ею.' },
    { id: 'b_bog_hag', n: 'Карга с Болот', sn: 'Карга', g: 'f', ch: 'Я', c: '#90c070', tier: 4, tags: ['other', 'human'], ab: ['poison', 'teleport', 'summon'], sp: { k: 'always' }, home: 'swamp', where: 'over', drops: ['a_memring', 'p_heal'], lore: 'Она знает всех по именам.' },
    { id: 'b_first', n: 'Тот, Кто Был До Короля', sn: 'Первый', g: 'm', ch: 'Ѡ', c: '#f0e0b0', tier: 7, tags: ['undead', 'spirit'], ab: ['drain', 'fear'], sp: { k: 'after', b: 'b_barrow_king' }, home: 'plains', where: 'over', drops: ['a_whisper'], lore: 'Король лёг в курган не первым.' },
    { id: 'b_roadside', n: 'Тот, Кто Ждал у Дороги', sn: 'Ждущий', g: 'm', ch: '?', c: '#c0c0c0', tier: 3, tags: ['other'], ab: ['teleport'], sp: { k: 'never', f: 'slept_first_night' }, home: 'start', where: 'over', drops: ['a_echo'], lore: 'Он ждал тебя. В ту первую ночь.' },
    { id: 'b_olmar', n: 'Ольмар Пробуждённый', sn: 'Ольмар', g: 'm', ch: 'Ӧ', c: '#e0a060', tier: 13, tags: ['stone', 'god'], ab: ['aoe', 'regen', 'summon'], sp: { k: 'days', d: 360 }, home: 'living', where: 'over', drops: ['crystal', 'crystal', 'star_metal'], lore: 'Великан проснулся.' },
    { id: 'b_widow', n: 'Белая Вдова', sn: 'Белая Вдова', g: 'f', ch: 'В', c: '#ffffff', tier: 5, tags: ['spirit', 'undead'], ab: ['fear', 'drain'], sp: { k: 'once' }, home: 'forest', where: 'over', drops: ['a_tear'], lore: 'Она ищет мужа. Уже триста лет.' },
    { id: 'b_ataman', n: 'Атаман Ржан Кривой', sn: 'Ржан', g: 'm', ch: 'А', c: '#e08040', tier: 3, tags: ['human'], ab: ['summon', 'enrage'], sp: { k: 'always' }, home: 'forest', where: 'over', camp: 1, drops: ['gold', 'flail'], lore: 'Хозяин леса. Так он говорит.' },
    { id: 'b_deep_mother', n: 'Глубинная Мать', sn: 'Глубинная Мать', g: 'f', ch: 'М', c: '#40a0a0', tier: 8, tags: ['water', 'other'], ab: ['summon', 'freeze', 'regen'], sp: { k: 'always' }, home: 'dim:sea', where: 'over', drops: ['fish_gold', 'pearl'], lore: 'Все глубинники — её дети.' },
    { id: 'b_ash_prince', n: 'Пепельный Князь', sn: 'Пепельный Князь', g: 'm', ch: 'П', c: '#ff9050', tier: 8, tags: ['fire', 'undead'], ab: ['fire', 'aoe'], sp: { k: 'always' }, home: 'volcanic', where: 'over', drops: ['a_dawnblade'], lore: 'Он сжёг своё королевство, чтобы согреться.' },
    { id: 'b_lich', n: 'Безымянный Чернокнижник', sn: 'Чернокнижник', g: 'm', ch: 'Ч', c: '#a080c0', tier: 7, tags: ['undead', 'human'], ab: ['summon', 'fire', 'teleport'], sp: { k: 'always' }, home: 'tundra', where: 'dun', depth: 5, dun: 'crypt', drops: ['a_nightstaff'], lore: 'Он забыл своё имя, но не заклинания.' },
    { id: 'b_beggar_god', n: 'Нищий Бог', sn: 'Нищий', g: 'm', ch: '☺', c: '#ffe0a0', tier: 9, tags: ['god', 'human'], ab: ['curse', 'teleport', 'aoe'], sp: { k: 'never', f: 'never' }, home: 'none', where: 'over', drops: ['a_oathring'], lore: 'Он просил хлеба.' },
  ];

  // Генератор безымянных боссов мира
  const agents = [['Пожиратель', 'Пожирательница'], ['Хранитель', 'Хранительница'], ['Повелитель', 'Повелительница'], ['Страж', 'Стражница'], ['Собиратель', 'Собирательница'],
    ['Ткач', 'Ткачиха'], ['Губитель', 'Губительница'], ['Князь', 'Княгиня'], ['Владыка', 'Владычица'], ['Скиталец', 'Скиталица'], ['Певец', 'Певица'], ['Шептун', 'Шептунья'],
    ['Жнец', 'Жница'], ['Отец', 'Мать'], ['Пастырь', 'Пастушка'], ['Вестник', 'Вестница'], ['Палач', 'Палачиха'], ['Сторож', 'Сторожиха'], ['Сеятель', 'Сеятельница'], ['Плакальщик', 'Плакальщица']];
  const objs = ['Колоколов', 'Пепла', 'Костей', 'Снов', 'Теней', 'Слёз', 'Глубин', 'Курганов', 'Ржавчины', 'Тумана', 'Гнили', 'Зеркал', 'Мёртвых Огней',
    'Детских Голосов', 'Последних Слов', 'Сломанных Клятв', 'Чужих Имён', 'Ночных Дорог', 'Старых Ран', 'Тихих Вод', 'Чёрных Перьев', 'Забытых Песен',
    'Пустых Колыбелей', 'Соли', 'Ветров', 'Молний', 'Корней', 'Камня', 'Холода', 'Голода', 'Мха', 'Ржи', 'Крови', 'Тишины', 'Шёпота', 'Курганной Земли'];
  const bodies = { plains: ['beast', 'undead', 'spirit'], forest: ['beast', 'plant', 'spirit'], ancient: ['plant', 'beast', 'spirit'], swamp: ['water', 'plant', 'undead'],
    desert: ['beast', 'undead', 'fire'], tundra: ['beast', 'undead', 'spirit'], ice: ['beast', 'spirit', 'stone'], mountain: ['stone', 'beast'], living: ['stone', 'other'],
    volcanic: ['fire', 'stone'], ash: ['undead', 'other', 'spirit'], coast: ['water', 'beast'], ocean: ['water'], sky: ['spirit', 'other'] };
  const abPool = ['summon', 'aoe', 'drain', 'teleport', 'enrage', 'regen', 'poison', 'fire', 'freeze', 'fear', 'charge', 'split'];
  const cols = ['#ff6060', '#ffa040', '#ffe060', '#a0ff60', '#60ffc0', '#60c0ff', '#a080ff', '#ff60e0', '#ffffff', '#e0c090', '#c0ffe0', '#ffb0b0'];
  D.genBosses = function (seed, regions, count) {
    const r = U.rng(seed, 'bosses');
    const used = new Set();
    const out = [];
    const land = regions.filter((g) => !['ocean'].includes(g.biome) && g.danger >= 3);
    const events = ['bloodmoon', 'blacksnow', 'shroom', 'madness', 'ash', 'nosun', 'spirits', 'star', 'hunt'];
    const earlyFlags = ['ate_first_day', 'killed_first_day', 'talked_first_day', 'slept_first_night', 'left_start_first_day', 'prayed_first_day'];
    for (let i = 0; i < count; i++) {
      const fem = r.chance(0.4);
      let given, title, n;
      for (let k = 0; k < 40; k++) {
        given = N.fantasy(r);
        const ag = r.pick(agents);
        title = (fem ? ag[1] : ag[0]) + ' ' + r.pick(objs);
        n = given + ', ' + title;
        if (!used.has(n)) break;
      }
      used.add(n);
      const reg = r.pick(land);
      const tier = U.clamp(Math.round(reg.danger / 2 + r.int(0, 3)), 2, 15);
      const kindW = [['always', 40], ['night', 15], ['once', 8], ['after', 10], ['days', 10], ['never', 5], ['event', 6], ['moon', 3], ['weather', 3]];
      let sp = { k: r.weighted(kindW) };
      if (sp.k === 'after') { if (out.length) sp.b = r.pick(out).id; else sp = { k: 'always' }; }
      if (sp.k === 'days') sp.d = r.int(20, 400);
      if (sp.k === 'never') sp.f = r.pick(earlyFlags);
      if (sp.k === 'event') sp.e = r.pick(events);
      if (sp.k === 'weather') sp.w = r.pick(['storm', 'fog', 'rain', 'snow']);
      const body = r.pick(bodies[reg.biome] || ['other']);
      const ab = r.sample(abPool, r.int(1, 3));
      out.push({
        id: 'g' + i, n, sn: given, g: fem ? 'f' : 'm', ch: given[0].toUpperCase(), c: r.pick(cols), tier, tags: [body], ab, sp,
        region: reg.id, where: r.chance(0.3) ? 'dun' : 'over', depth: r.int(1, 4), drops: [], gen: 1,
        lore: r.pick(['Говорят, его видели.', 'О нём поют пьяные.', 'Её боятся дети.', 'Никто не вернулся.', 'Местные не ходят сюда.', 'Здесь пахнет старой кровью.', 'Тихо. Слишком тихо.']),
      });
    }
    return out;
  };
})(window.EOF);
