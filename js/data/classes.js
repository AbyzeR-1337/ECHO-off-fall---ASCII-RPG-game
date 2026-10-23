'use strict';
// Классы. Семь видимых и восемьдесят с лишним скрытых.
// У каждого свой «ресурс пути» и свои источники роста (gain: событие → очки).
(function (E) {
  const D = E.D;
  const mk = D.mkAb;
  const C = D.classes = {};
  const c = (P, k) => (P.c[k] || 0);
  D.rankOf = (pts) => Math.floor(Math.sqrt(Math.max(0, pts) / 20)) + 1;
  D.rankPts = (r) => 20 * (r - 1) * (r - 1);

  function base(id, n, d, res, gain, grow, ab, trainer, req) {
    C[id] = { id, n, d, res, gain, grow, ab, trainer, req, base: 1 };
  }
  base('warrior', 'Воин', 'Тот, кто стоит, когда другие падают.', 'Закалка', { hit_taken: 1, kill_melee: 3 }, { str: 1, con: 1 },
    [[1, 'w_power'], [2, 'w_cleave'], [3, 'w_cry'], [5, 'w_iron'], [7, 'w_crush']], 'veteran', { str: 5, gold: 40 });
  base('ranger', 'Следопыт', 'Тот, кто читает землю, как книгу.', 'Тропы', { region_new: 10, 'kill:beast': 2, step_wild: 0.03 }, { dex: 1, con: 1 },
    [[1, 'r_shot'], [2, 'r_sense'], [3, 'r_volley'], [5, 'r_wild'], [7, 'r_wolf']], 'hunter', { dex: 5, gold: 30 });
  base('assassin', 'Ассасин', 'Тот, кого не видят.', 'Тени', { sneak: 5, kill: 2, crit: 1 }, { dex: 1, luck: 1 },
    [[1, 's_back'], [2, 's_shadow'], [3, 's_poison'], [5, 's_throw'], [7, 's_step']], 'shadow', { dex: 5, gold: 100 });
  base('mage', 'Маг', 'Тот, кто спорит с миром его же словами.', 'Познание', { cast: 2, read: 15 }, { int: 2 },
    [[1, 'm_spark'], [2, 'm_frost'], [3, 'm_blink'], [5, 'm_fireball'], [7, 'm_chain']], 'mage', { int: 6, gold: 60 });
  base('priest', 'Жрец', 'Тот, кто слышит, когда боги молчат.', 'Благодать', { pray: 5, heal: 0.2, shrine: 10 }, { fai: 2 },
    [[1, 'p_heal'], [2, 'p_light'], [3, 'p_bless'], [5, 'p_banish'], [7, 'p_ward']], 'priest', { fai: 5, gold: 20 });
  base('alchemist', 'Алхимик', 'Тот, кто знает, из чего сделан мир.', 'Опыты', { brew: 5, throw: 1 }, { int: 1, con: 1 },
    [[1, 'a_flask'], [2, 'a_smoke'], [3, 'a_trans'], [5, 'a_elixir'], [7, 'a_great']], 'alchemist', { int: 4, gold: 40 });
  base('wanderer', 'Странник', 'Тот, у кого нет дома, кроме дороги.', 'Дорога', { step: 0.05, region_new: 5, rest_out: 1 }, { con: 1, luck: 1 },
    [[1, 't_breath'], [2, 't_luck'], [3, 't_flee'], [5, 't_roads'], [7, 't_other']], 'wanderer', { regions: 8 });
  D.baseClasses = ['warrior', 'ranger', 'assassin', 'mage', 'priest', 'alchemist', 'wanderer'];

  // Скрытые классы
  function H(id, n, d, cond, res, gain, grow, abs) {
    const ab = [];
    abs.forEach((a, i) => {
      const aid = id + '_' + i;
      mk(aid, a[2], a[3], a[4] || {});
      ab.push([a[0], aid]);
    });
    C[id] = { id, n, d, cond, res, gain, grow, ab, hidden: 1 };
  }
  // Сокращения для умений: [ранг, _, имя, примитив, параметры]
  H('silence_keeper', 'Хранитель Безмолвия', 'Ты научился слушать тишину. Теперь она слушает тебя.',
    (P) => c(P, 'silent_days') >= 7 && P.prayers.some((p) => E.G.W.prayers[p] && E.G.W.prayers[p].god === 'silent'),
    'Безмолвие', { silent: 1 }, { fai: 1, dex: 1 },
    [[1, 0, 'Печать тишины', 'debuff', { e: 'stun', r: 3, dur: 3, cost: 8, cd: 15 }], [3, 0, 'Немой шаг', 'stealth', { dur: 30, cost: 5, cd: 30 }], [6, 0, 'Слово, которого нет', 'strike', { p: 6, stat: 'fai', cost: 25, cd: 300 }]]);
  H('godslayer', 'Палач Богов', 'Ты поднял руку на бессмертное — и рука не отсохла.',
    (P) => c(P, 'k_god') >= 1, 'Приговор', { boss: 25, 'kill:god': 40, 'kill:other': 2 }, { str: 2 },
    [[1, 0, 'Приговор', 'execute', { p: 2.5, cost: 8, cd: 6 }], [3, 0, 'Казнь небес', 'blast', { p: 3, r: 2, range: 6, el: 'holy', cost: 18, cd: 20 }], [6, 0, 'Тень плахи', 'fear', { r: 8, cost: 10, cd: 30 }]]);
  H('memory_eater', 'Пожиратель Памяти', 'Ты слышишь, как в чужих головах шуршат воспоминания.',
    (P) => c(P, 'talks') >= 60 && (c(P, 'forgot') >= 1 || P.inv.some((i) => i.b === 'a_memring')), 'Память', { talk: 1, rumor: 3 }, { int: 2 },
    [[1, 0, 'Чужое воспоминание', 'drain', { p: 1.5, stat: 'int', cost: 5, cd: 4 }], [3, 0, 'Забвение', 'debuff', { e: 'stun', r: 4, dur: 4, cost: 12, cd: 25 }], [6, 0, 'Вспомнить всё', 'reveal', { x: { map: 1 }, cost: 20, cd: 200 }]]);
  H('moon_pilgrim', 'Лунный Паломник', 'Луна позвала — и ты пошёл.',
    (P) => c(P, 'fullmoons') >= 3 && c(P, 'steps_night') >= 2500, 'Свет луны', { step_night: 0.1, moon: 20 }, { dex: 1, fai: 1 },
    [[1, 0, 'Серебряный луч', 'bolt', { p: 1.8, r: 9, stat: 'fai', el: 'holy', cost: 4, cd: 2 }], [3, 0, 'Лунная тропа', 'blink', { r: 10, cost: 6, cd: 15 }], [6, 0, 'Полнолуние', 'buff', { e: 'moon', dur: 600, cost: 20, cd: 900 }]]);
  H('bone_necro', 'Некромант Костей', 'Мёртвые не уходят далеко. Ты знаешь, как их позвать.',
    (P) => c(P, 'graves') >= 4 && c(P, 'k_undead') >= 25, 'Прах', { 'kill:undead': 2, dig: 5, kill: 1 }, { int: 1, fai: 1 },
    [[1, 0, 'Поднять кости', 'summon', { x: { mon: 'ally_bones', n: 1 }, dur: 80, cost: 10, cd: 40 }], [3, 0, 'Костяное копьё', 'bolt', { p: 2, r: 7, stat: 'int', cost: 6, cd: 3 }], [6, 0, 'Армия праха', 'summon', { x: { mon: 'ally_bones', n: 4 }, dur: 80, cost: 30, cd: 200 }]]);
  H('holy_smith', 'Кузнец Святых Орудий', 'Огонь первой кузни признал твои руки.',
    (P) => !!P.flags.firstForge, 'Горн', { kill_melee: 2, dig: 2, craft: 10 }, { str: 1, con: 1, fai: 1 },
    [[1, 0, 'Молот веры', 'strike', { p: 2.5, x: { stun: 1 }, cost: 6, cd: 4 }], [3, 0, 'Закалка', 'buff', { e: 'ironskin', dur: 60, cost: 10, cd: 60 }], [6, 0, 'Святая наковальня', 'blast', { p: 3, r: 2, self: 1, el: 'holy', cost: 20, cd: 30 }]]);
  H('mirror_lord', 'Повелитель Зеркал', 'Ты убил себя. И теперь ты — оба.',
    (P) => !!P.flags.killedReflection, 'Отражения', { 'kill:other': 3, mirror: 10 }, { dex: 1, int: 1 },
    [[1, 0, 'Двойник', 'summon', { x: { mon: 'ally_shade', n: 1 }, dur: 50, cost: 10, cd: 40 }], [3, 0, 'Отражённый удар', 'buff', { e: 'mirror', dur: 40, cost: 8, cd: 50 }], [6, 0, 'Зеркальный лабиринт', 'timestop', { p: 4, cost: 25, cd: 200 }]]);
  H('abyss_singer', 'Певец Бездны', 'Ты слышал песню, от которой сходят с ума. И запомнил мотив.',
    (P) => !!P.flags.heardAbyss, 'Песнь', { music: 5, abyss: 2, 'kill:other': 2 }, { fai: 1, int: 1 },
    [[1, 0, 'Нота', 'bolt', { p: 2, r: 8, stat: 'fai', el: 'void', cost: 5, cd: 2 }], [3, 0, 'Колыбельная', 'debuff', { e: 'stun', r: 5, dur: 5, cost: 14, cd: 30 }], [6, 0, 'Хор глубин', 'blast', { p: 3.5, r: 4, self: 1, el: 'void', cost: 30, cd: 60 }]]);
  H('prayer_collector', 'Коллекционер Молитв', 'В твоей памяти больше молитв, чем в иных храмах.',
    (P) => P.prayers.length >= 20, 'Собрание', { learn_prayer: 20, pray: 3 }, { fai: 1, int: 1 },
    [[1, 0, 'Чужая молитва', 'heal', { p: 2, stat: 'fai', flat: 15, cost: 6, cd: 8 }], [3, 0, 'Хор богов', 'buff', { e: 'blessed', dur: 200, cost: 10, cd: 100 }], [6, 0, 'Последняя молитва', 'buff', { e: 'deathward', dur: 600, cost: 25, cd: 900 }]]);
  H('time_archivist', 'Архивариус Времени', 'Ты читал страницы, которые ещё не написаны.',
    (P) => c(P, 'time_dim') >= 1 && c(P, 'books') >= 6, 'Страницы', { read: 20, cast: 1 }, { int: 2 },
    [[1, 0, 'Замедлить миг', 'timestop', { p: 2, cost: 10, cd: 40 }], [3, 0, 'Страница прошлого', 'heal', { p: 0.4, pct: 1, cost: 15, cd: 120 }], [6, 0, 'Конец главы', 'blast', { p: 3, r: 3, self: 1, el: 'time', cost: 25, cd: 60 }]]);
  H('living_artifact', 'Живой Артефакт', 'Ты так долго носил древнюю вещь, что она начала носить тебя.',
    (P) => c(P, 'art_hours') >= 400, 'Резонанс', { hit_taken: 1, kill: 1 }, { con: 2, str: 1 },
    [[1, 0, 'Резонанс', 'shield', { p: 4, stat: 'con', cost: 8, cd: 30 }], [3, 0, 'Древняя воля', 'buff', { e: 'stone', dur: 100, cost: 10, cd: 100 }], [6, 0, 'Разлом', 'blast', { p: 4, r: 3, self: 1, cost: 30, cd: 80 }]]);
  H('last_keeper', 'Последний Хранитель', 'Печать держится. Пока держишь её ты.',
    (P) => !!P.flags.lastKeeper, 'Печать', { 'kill:other': 3, boss: 20, shrine: 5 }, { con: 1, fai: 2 },
    [[1, 0, 'Печать', 'debuff', { e: 'webbed', r: 4, dur: 5, cost: 8, cd: 15 }], [3, 0, 'Страж', 'summon', { x: { mon: 'ally_golem', n: 1 }, dur: 100, cost: 15, cd: 100 }], [6, 0, 'Нерушимость', 'shield', { p: 10, stat: 'fai', cost: 25, cd: 120 }]]);
  H('forest_child', 'Дитя Леса', 'Лес принял тебя, как своего. Деревья шепчут твоё имя.',
    (P) => !!P.flags.forestChild || (c(P, 'nights_ancient') >= 8 && c(P, 'k_beast') === 0), 'Листва', { 'step:forest': 0.1, 'step:ancient': 0.2, rest_out: 1 }, { dex: 1, con: 1, fai: 1 },
    [[1, 0, 'Корни', 'debuff', { e: 'webbed', r: 3, dur: 4, cost: 6, cd: 12 }], [3, 0, 'Зов леса', 'summon', { x: { mon: 'ally_wolf', n: 2 }, dur: 60, cost: 14, cd: 100 }], [6, 0, 'Сердце рощи', 'heal', { p: 0.6, pct: 1, cost: 20, cd: 200 }]]);
  H('soul_gatherer', 'Собиратель Душ', 'Каждая смерть оставляет что-то. Ты научился это подбирать.',
    (P) => c(P, 'souls') >= 30, 'Души', { kill: 1 }, { int: 1, fai: 1 },
    [[1, 0, 'Жатва', 'drain', { p: 1.8, stat: 'fai', cost: 5, cd: 4 }], [3, 0, 'Рой душ', 'chain', { p: 1.6, r: 8, n: 5, stat: 'fai', el: 'void', cost: 14, cd: 12 }], [6, 0, 'Последний вздох', 'execute', { p: 4, cost: 20, cd: 30 }]]);
  H('void_judge', 'Судья Пустоты', 'Пустота судила тебя и сочла достойным судить других.',
    (P) => !!P.flags.voidJudged, 'Приговор Пустоты', { void: 2, 'kill:other': 3 }, { int: 1, fai: 1, con: 1 },
    [[1, 0, 'Обвинение', 'bolt', { p: 2.2, r: 8, stat: 'int', el: 'void', cost: 6, cd: 3 }], [3, 0, 'Приговор', 'execute', { p: 3, cost: 12, cd: 15 }], [6, 0, 'Стирание', 'blast', { p: 5, r: 2, range: 8, el: 'void', cost: 35, cd: 100 }]]);

  // Компактные определения остальных скрытых классов
  const L = [
    ['deep_fisher', 'Рыбак Глубин', 'Вода отдаёт тебе то, что не отдаёт другим.', (P) => c(P, 'fish') >= 60, 'Улов', { fish: 5 }, { con: 1, luck: 1 },
      [[1, 'Гарпун', 'bolt', { p: 1.8, r: 6 }], [3, 'Сеть', 'debuff', { e: 'webbed', r: 3, dur: 4 }], [6, 'Зов глубин', 'buff', { e: 'sea', dur: 600 }]]],
    ['hungry_ascetic', 'Голодный Аскет', 'Голод стал твоим учителем.', (P) => c(P, 'hunger_days') >= 15, 'Пост', { hunger_hour: 1 }, { str: 1, con: 1 },
      [[1, 'Сухой кулак', 'strike', { p: 2.2 }], [3, 'Пустое брюхо', 'buff', { e: 'might', dur: 60 }], [6, 'Ни крошки', 'shield', { p: 6, stat: 'con' }]]],
    ['storm_walker', 'Грозовой Странник', 'Молния знает твоё имя.', (P) => c(P, 'storms') >= 400 || !!P.flags.lightning, 'Гром', { storm: 1 }, { dex: 1, int: 1 },
      [[1, 'Разряд', 'bolt', { p: 2, r: 8, el: 'storm', stat: 'int' }], [3, 'Гроза', 'chain', { p: 1.6, r: 8, n: 4, el: 'storm', stat: 'int' }], [6, 'Небесный молот', 'blast', { p: 3.5, r: 2, range: 8, el: 'storm', stat: 'int' }]]],
    ['ash_walker', 'Пепельный Ходок', 'Пепел оседает на тебе — и не жжёт.', (P) => c(P, 'steps_volcanic') + c(P, 'steps_ash') >= 2500, 'Пепел', { 'step:volcanic': 0.1, 'step:ash': 0.1 }, { con: 2 },
      [[1, 'Горсть пепла', 'debuff', { e: 'blind', r: 2, dur: 4 }], [3, 'Жар', 'blast', { p: 2, r: 2, self: 1, el: 'fire' }], [6, 'Пепельная кожа', 'buff', { e: 'ash', dur: 600 }]]],
    ['ice_hermit', 'Ледяной Отшельник', 'Холод больше не враг. Он — дом.', (P) => c(P, 'nights_ice') >= 10, 'Стужа', { 'step:ice': 0.1, rest_out: 1 }, { con: 2 },
      [[1, 'Ледяное дыхание', 'bolt', { p: 1.8, r: 6, el: 'ice', x: { slow: 4 } }], [3, 'Иней', 'debuff', { e: 'slow', r: 4, dur: 6 }], [6, 'Вечная мерзлота', 'blast', { p: 3, r: 3, self: 1, el: 'ice' }]]],
    ['sand_prophet', 'Песчаный Пророк', 'Пустыня шепчет тебе будущее.', (P) => c(P, 'steps_desert') >= 3000, 'Пески', { 'step:desert': 0.1 }, { int: 1, fai: 1 },
      [[1, 'Песчаный вихрь', 'blast', { p: 1.5, r: 2, range: 6 }], [3, 'Мираж', 'stealth', { dur: 20 }], [6, 'Пророчество', 'reveal', { x: { map: 1, mons: 1 } }]]],
    ['bog_witch', 'Болотный Ведун', 'Топь не тянет тебя вниз. Она держит.', (P) => c(P, 'steps_swamp') >= 2500 && c(P, 'herbs') >= 20, 'Тина', { 'step:swamp': 0.1, herb: 2 }, { int: 1, con: 1 },
      [[1, 'Болотный яд', 'bolt', { p: 1.6, r: 6, x: { poison: 5 } }], [3, 'Трясина', 'debuff', { e: 'webbed', r: 3, dur: 5 }], [6, 'Морок', 'fear', { r: 7 }]]],
    ['stargazer', 'Звездочёт', 'Ты держал в руках упавшую звезду.', (P) => c(P, 'star_shards') >= 2, 'Звёзды', { moon: 10, step_night: 0.05 }, { int: 2 },
      [[1, 'Звёздный осколок', 'bolt', { p: 2, r: 9, el: 'holy', stat: 'int' }], [3, 'Созвездие', 'reveal', { x: { map: 1 } }], [6, 'Звездопад', 'blast', { p: 3.5, r: 3, range: 8, el: 'fire', stat: 'int' }]]],
    ['blood_reaper', 'Кровавый Жнец', 'Ты собрал урожай под красной луной.', (P) => c(P, 'k_blood') >= 20, 'Кровь', { kill: 2 }, { str: 2 },
      [[1, 'Кровопускание', 'drain', { p: 1.8 }], [3, 'Багровый вихрь', 'cleave', { p: 1.6 }], [6, 'Жатва', 'execute', { p: 4 }]]],
    ['plague_doctor', 'Чумной Доктор', 'Ты видел мор вблизи и не отвёл глаз.', (P) => c(P, 'plague_cured') >= 1 || c(P, 'brews') >= 15 && !!P.flags.sawPlague, 'Лечение', { brew: 4, heal: 0.2 }, { int: 1, con: 1 },
      [[1, 'Ланцет', 'strike', { p: 1.8, stat: 'int', x: { bleed: 4 } }], [3, 'Окуривание', 'blast', { p: 1.5, r: 2, self: 1, el: 'acid' }], [6, 'Карантин', 'debuff', { e: 'weak', r: 6, dur: 10 }]]],
    ['dream_catcher', 'Ловец Снов', 'Ты возвращался из снов с пустыми руками — пока не перестал.', (P) => c(P, 'dreams') >= 6, 'Сны', { dream: 15, 'kill:dream': 3 }, { int: 1, fai: 1 },
      [[1, 'Дрёма', 'debuff', { e: 'stun', r: 2, dur: 3 }], [3, 'Кошмар', 'fear', { r: 6 }], [6, 'Сон наяву', 'timestop', { p: 3 }]]],
    ['walking_dead', 'Мертвец, что Ходит', 'Ты был мёртв. Это не помешало.', (P) => c(P, 'deaths') >= 1, 'Тлен', { hit_taken: 1, 'kill:undead': 2 }, { con: 2 },
      [[1, 'Холод могилы', 'drain', { p: 1.6 }], [3, 'Мёртвая хватка', 'debuff', { e: 'webbed', r: 1, dur: 4 }], [6, 'Нежизнь', 'buff', { e: 'deathward', dur: 300 }]]],
    ['errant_knight', 'Странствующий Рыцарь', 'Ты защищал дороги, не прося платы.', (P) => c(P, 'k_bandit') >= 25 && c(P, 'civ_kills') === 0, 'Честь', { 'kill:human': 2, gift: 2 }, { str: 1, con: 1, fai: 1 },
      [[1, 'Удар чести', 'strike', { p: 2.2 }], [3, 'Клятва', 'buff', { e: 'ironskin', dur: 50 }], [6, 'Последний рубеж', 'shield', { p: 8, stat: 'con' }]]],
    ['highwayman', 'Разбойник с Большой Дороги', 'Ты взял то, что хотел. Много раз.', (P) => c(P, 'civ_kills') >= 6 || c(P, 'thefts') >= 15, 'Добыча', { theft: 5, kill: 1 }, { dex: 1, str: 1 },
      [[1, 'Кистенём по темечку', 'strike', { p: 2, x: { stun: 1 } }], [3, 'Засада', 'stealth', { dur: 15 }], [6, 'Кошелёк или жизнь', 'fear', { r: 5 }]]],
    ['regicide', 'Цареубийца', 'Корона упала. Ты знаешь, кто её сбил.', (P) => c(P, 'ruler_kills') >= 1, 'Кровь королей', { kill: 1, 'kill:human': 3 }, { dex: 1, str: 1 },
      [[1, 'Отравленный кубок', 'bolt', { p: 1.5, r: 6, x: { poison: 8 } }], [3, 'Удар в сердце', 'execute', { p: 3.5 }], [6, 'Безвластие', 'fear', { r: 10 }]]],
    ['dragon_tamer', 'Укротитель Драконов', 'В твоих руках треснула скорлупа.', (P) => !!P.flags.hatched, 'Пламя', { 'kill:fire': 3, kill: 1 }, { str: 1, con: 1 },
      [[1, 'Огненный зов', 'summon', { x: { mon: 'ally_dragonling', n: 1 }, dur: 200 }], [3, 'Драконье дыхание', 'blast', { p: 2.5, r: 2, range: 5, el: 'fire' }], [6, 'Чешуя', 'buff', { e: 'dragon', dur: 600 }]]],
    ['sky_shepherd', 'Небесный Пастух', 'Облака ходят за тобой, как овцы.', (P) => c(P, 'steps_sky') >= 1200, 'Облака', { 'step:sky': 0.15 }, { dex: 2 },
      [[1, 'Порыв', 'bolt', { p: 1.6, r: 8, el: 'storm' }], [3, 'Облачный шаг', 'blink', { r: 9 }], [6, 'Небесный пастух', 'summon', { x: { mon: 'ally_spirit', n: 2 }, dur: 80 }]]],
    ['deep_one', 'Глубинный', 'Ты дышал водой. Вода дышала тобой.', (P) => c(P, 'under_turns') >= 500, 'Глубина', { under: 1 }, { con: 2 },
      [[1, 'Удар волны', 'bolt', { p: 1.8, r: 6, el: 'water' }], [3, 'Давление глубин', 'debuff', { e: 'slow', r: 4, dur: 6 }], [6, 'Жабры', 'buff', { e: 'sea', dur: 900 }]]],
    ['spore_prophet', 'Грибной Пророк', 'Грибница говорит с тобой. Ты отвечаешь.', (P) => c(P, 'spore_days') >= 10, 'Мицелий', { 'kill:plant': 2, rest_out: 1 }, { con: 2 },
      [[1, 'Споры', 'debuff', { e: 'poison', r: 3, dur: 8 }], [3, 'Грибная плоть', 'heal', { p: 0.3, pct: 1 }], [6, 'Великая грибница', 'blast', { p: 3, r: 4, self: 1, el: 'acid' }]]],
    ['gravedigger', 'Гробовщик', 'Земля мягка для того, кто часто её копает.', (P) => c(P, 'graves') >= 10, 'Земля', { dig: 6 }, { str: 1, con: 1 },
      [[1, 'Удар лопатой', 'strike', { p: 2, x: { stun: 1 } }], [3, 'Последний приют', 'execute', { p: 3 }], [6, 'Могильный холод', 'fear', { r: 8, x: { undeadDie: 1 } }]]],
    ['chronicler', 'Летописец', 'Ты знаешь о мире больше, чем он сам о себе.', (P) => c(P, 'rumors') >= 40, 'Летопись', { rumor: 5, read: 10 }, { int: 2 },
      [[1, 'Знание', 'reveal', { x: { mons: 1 } }], [3, 'Предание', 'buff', { e: 'focus', dur: 120 }], [6, 'Книга судеб', 'reveal', { x: { map: 1 } }]]],
    ['cartographer', 'Картограф Бездорожья', 'На твоей карте нет белых пятен. Почти.', (P) => c(P, 'regions') >= 90, 'Карты', { region_new: 12 }, { dex: 1, int: 1 },
      [[1, 'Взгляд с высоты', 'reveal', { x: { map: 1 } }], [3, 'Короткий путь', 'travel', {}], [6, 'Знание земли', 'buff', { e: 'haste', dur: 200 }]]],
    ['faceless', 'Безликий', 'У тебя больше нет лица. Есть только маска.', (P) => P.eq.head && P.eq.head.b === 'mask' && c(P, 'mask_days') >= 3, 'Маски', { talk: 1, sneak: 3 }, { dex: 1, int: 1 },
      [[1, 'Чужое лицо', 'stealth', { dur: 40 }], [3, 'Пустой взгляд', 'fear', { r: 5 }], [6, 'Никто', 'timestop', { p: 3 }]]],
    ['shadow_merchant', 'Торговец Тенями', 'Ты продавал то, чего нет, тем, кого нет.', (P) => c(P, 'gold_earned') >= 4000, 'Барыш', { gold: 0.02 }, { luck: 2 },
      [[1, 'Взятка', 'fear', { r: 4 }], [3, 'Сделка', 'transmute', { p: 3 }], [6, 'Долговая яма', 'debuff', { e: 'weak', r: 6, dur: 12 }]]],
    ['miser', 'Скупец', 'Золото звенит у тебя во сне.', (P) => P.gold >= 2500, 'Скупость', { gold: 0.03 }, { luck: 1, con: 1 },
      [[1, 'Золотой кулак', 'strike', { p: 2 }], [3, 'Мешок золота', 'shield', { p: 5, stat: 'luck' }], [6, 'Не отдам', 'buff', { e: 'greed', dur: 600 }]]],
    ['holy_beggar', 'Нищий Святой', 'Ты отдал всё. И получил больше.', (P) => c(P, 'gifts') >= 30 && P.gold < 10, 'Милость', { gift: 5 }, { fai: 2 },
      [[1, 'Милостыня', 'heal', { p: 3, stat: 'fai', flat: 10 }], [3, 'Кротость', 'buff', { e: 'calm', dur: 200 }], [6, 'Святость', 'blast', { p: 3, r: 3, self: 1, el: 'holy' }]]],
    ['mourner', 'Плакальщик', 'Ты оплакал слишком многих.', (P) => c(P, 'grief') >= 4, 'Скорбь', { grief: 20, 'kill:undead': 1 }, { fai: 2 },
      [[1, 'Плач', 'debuff', { e: 'weak', r: 4, dur: 6 }], [3, 'Поминальная', 'heal', { p: 0.3, pct: 1 }], [6, 'Реквием', 'blast', { p: 3, r: 4, self: 1, el: 'holy' }]]],
    ['berserker', 'Берсерк', 'На краю смерти ты смеялся.', (P) => c(P, 'rage') >= 8, 'Ярость', { hit_taken: 2, kill_melee: 2 }, { str: 2 },
      [[1, 'Безумный удар', 'strike', { p: 2.6 }], [3, 'Кровь в глазах', 'buff', { e: 'fury', dur: 30 }], [6, 'Неистовство', 'cleave', { p: 2.2 }]]],
    ['survivor', 'Тот, кто Выжил', 'Ты убегал. Поэтому ты жив.', (P) => c(P, 'fled') >= 5, 'Живучесть', { hit_taken: 1, rest_out: 1 }, { dex: 1, con: 1 },
      [[1, 'Рывок', 'blink', { r: 6, x: { away: 1 } }], [3, 'Второй шанс', 'heal', { p: 0.4, pct: 1 }], [6, 'Неуловимость', 'buff', { e: 'haste', dur: 60 }]]],
    ['night_watch', 'Ночной Сторож', 'Ночь — твоя смена.', (P) => c(P, 'steps_night') >= 5000, 'Ночь', { step_night: 0.08, kill_night: 2 }, { con: 1, dex: 1 },
      [[1, 'Фонарь', 'buff', { e: 'nighteye', dur: 300 }], [3, 'Тревога', 'reveal', { x: { mons: 1 } }], [6, 'Ночной дозор', 'shield', { p: 6, stat: 'con' }]]],
    ['sun_paladin', 'Солнечный Паладин', 'Когда солнце исчезло, ты стал его осколком.', (P) => c(P, 'k_sunless') >= 25, 'Солнце', { kill_night: 2, pray: 2 }, { str: 1, fai: 1 },
      [[1, 'Луч', 'bolt', { p: 2, r: 8, el: 'holy', stat: 'fai' }], [3, 'Полдень', 'buff', { e: 'sun', dur: 600 }], [6, 'Рассвет', 'blast', { p: 4, r: 4, self: 1, el: 'holy' }]]],
    ['fire_herald', 'Вестник Огня', 'Огонь слушается твоих пальцев.', (P) => c(P, 'fire_kills') >= 40, 'Пламя', { cast: 2 }, { int: 2 },
      [[1, 'Огненный хлыст', 'bolt', { p: 2, r: 5, el: 'fire', stat: 'int' }], [3, 'Пламенное кольцо', 'blast', { p: 2.5, r: 2, self: 1, el: 'fire' }], [6, 'Пожар', 'blast', { p: 3.5, r: 4, range: 8, el: 'fire', stat: 'int' }]]],
    ['beast_lord', 'Повелитель Зверей', 'Звери едят с твоей руки.', (P) => c(P, 'beasts_fed') >= 8, 'Стая', { 'kill:beast': -1, beast_fed: 10 }, { dex: 1, con: 1 },
      [[1, 'Друг-зверь', 'summon', { x: { mon: 'ally_wolf', n: 1 }, dur: 120 }], [3, 'Рык', 'fear', { r: 6 }], [6, 'Стая', 'summon', { x: { mon: 'ally_wolf', n: 3 }, dur: 120 }]]],
    ['monster_hunter', 'Охотник на Чудовищ', 'Ты знаешь, где у чудовищ слабое место.', (P) => c(P, 'bosses') >= 6, 'Трофеи', { boss: 30, 'kill:other': 2 }, { str: 1, dex: 1 },
      [[1, 'В слабое место', 'strike', { p: 2.4, x: { pierce: 1 } }], [3, 'Капкан', 'debuff', { e: 'webbed', r: 2, dur: 5 }], [6, 'Смертельный выпад', 'execute', { p: 4 }]]],
    ['outcast', 'Изгнанник', 'Тебя гонят отовсюду. Ты привык.', (P) => c(P, 'wanted_places') >= 4, 'Изгнание', { theft: 2, kill: 1 }, { dex: 1, con: 1 },
      [[1, 'Грязный приём', 'strike', { p: 1.8, x: { stun: 1 } }], [3, 'Лесная тропа', 'stealth', { dur: 25 }], [6, 'Ничей', 'buff', { e: 'lonely', dur: 600 }]]],
    ['mountain_hermit', 'Отшельник Гор', 'Ветер на вершинах — твой единственный собеседник.', (P) => c(P, 'steps_mountain') >= 3000, 'Высота', { 'step:mountain': 0.1, silent: 0.5 }, { con: 1, fai: 1 },
      [[1, 'Камнепад', 'blast', { p: 1.8, r: 2, range: 6 }], [3, 'Горный воздух', 'heal', { p: 0.25, pct: 1 }], [6, 'Каменная кожа', 'buff', { e: 'stone', dur: 300 }]]],
    ['bard', 'Бродячий Певец', 'Твои песни поют в тавернах, где ты никогда не был.', (P) => c(P, 'music') >= 40, 'Песни', { music: 3, talk: 0.5 }, { luck: 1, int: 1 },
      [[1, 'Насмешка', 'debuff', { e: 'weak', r: 4, dur: 6 }], [3, 'Походная песня', 'buff', { e: 'joy', dur: 300 }], [6, 'Баллада', 'fear', { r: 8 }]]],
    ['poisoner', 'Мастер Ядов', 'Ты различаешь яды по запаху.', (P) => c(P, 'poison_kills') >= 25, 'Яды', { brew: 2, 'kill:poison': 3 }, { dex: 1, int: 1 },
      [[1, 'Отравленная игла', 'bolt', { p: 1.4, r: 6, x: { poison: 8 } }], [3, 'Ядовитое облако', 'debuff', { e: 'poison', r: 3, dur: 10 }], [6, 'Мгновенный яд', 'execute', { p: 3 }]]],
    ['bone_collector', 'Собиратель Костей', 'У тебя есть кость от каждого, кого ты встретил.', (P) => c(P, 'bones') >= 40, 'Кости', { bone: 2, kill: 1 }, { con: 1, int: 1 },
      [[1, 'Костяной шип', 'bolt', { p: 1.8, r: 6 }], [3, 'Броня из костей', 'shield', { p: 5, stat: 'con' }], [6, 'Костяной голем', 'summon', { x: { mon: 'ally_bones', n: 2 }, dur: 100 }]]],
    ['wind_whisper', 'Шёпот Ветра', 'Ты падал и не разбился.', (P) => c(P, 'steps_sky') >= 300 && c(P, 'void_turns') >= 50, 'Ветер', { 'step:sky': 0.1, void: 1 }, { dex: 2 },
      [[1, 'Шёпот', 'debuff', { e: 'fear', r: 4, dur: 5 }], [3, 'Невесомость', 'blink', { r: 10 }], [6, 'Ураган', 'blast', { p: 3, r: 3, self: 1, el: 'storm' }]]],
    ['lucid_dreamer', 'Сновидец Наяву', 'Ты больше не уверен, что проснулся.', (P) => c(P, 'k_dream') >= 25, 'Явь', { 'kill:dream': 3, dream: 10 }, { int: 2 },
      [[1, 'Сдвиг', 'blink', { r: 7 }], [3, 'Иллюзия', 'summon', { x: { mon: 'ally_shade', n: 2 }, dur: 40 }], [6, 'Пробуждение', 'blast', { p: 3.5, r: 3, self: 1, el: 'void' }]]],
    ['ancestor', 'Говорящий с Предками', 'Мёртвые советуют тебе. Иногда — дельно.', (P) => c(P, 'spirit_talks') >= 12, 'Предки', { spirit_talk: 5 }, { fai: 2 },
      [[1, 'Совет предков', 'reveal', { x: { mons: 1 } }], [3, 'Дух-хранитель', 'summon', { x: { mon: 'ally_spirit', n: 1 }, dur: 150 }], [6, 'Голоса рода', 'buff', { e: 'blessed', dur: 300 }]]],
    ['oathbreaker', 'Клятвопреступник', 'Ты нарушил слово. Слово не простило.', (P) => !!P.flags.oathBroken, 'Вина', { kill: 2, hit_taken: 1 }, { str: 2 },
      [[1, 'Вероломный удар', 'strike', { p: 2.5, x: { bleed: 4 } }], [3, 'Проклятие', 'debuff', { e: 'weak', r: 4, dur: 8 }], [6, 'Ни чести, ни страха', 'buff', { e: 'rage', dur: 200 }]]],
    ['lighthouse_keeper', 'Хранитель Маяка', 'Свет горит, пока ты рядом.', (P) => !!P.flags.lighthouse, 'Свет', { step_night: 0.05, 'kill:water': 3 }, { con: 1, fai: 1 },
      [[1, 'Луч маяка', 'bolt', { p: 2, r: 10, el: 'holy' }], [3, 'Путеводный огонь', 'buff', { e: 'star', dur: 300 }], [6, 'Против бури', 'shield', { p: 7, stat: 'fai' }]]],
    ['flesh_alchemist', 'Алхимик Плоти', 'Ты экспериментировал. На себе.', (P) => c(P, 'brews') >= 25 && c(P, 'brew_fail') >= 8, 'Мутации', { brew: 4 }, { con: 2 },
      [[1, 'Кислотная кровь', 'buff', { e: 'blood', dur: 60 }], [3, 'Мутация', 'buff', { e: 'might', dur: 200 }], [6, 'Новая плоть', 'heal', { p: 0.6, pct: 1 }]]],
    ['exorcist', 'Изгоняющий', 'Нечисть узнаёт тебя по шагам.', (P) => c(P, 'k_other') >= 40, 'Изгнание', { 'kill:other': 3, 'kill:spirit': 3 }, { fai: 2 },
      [[1, 'Знамение', 'bolt', { p: 2, r: 7, el: 'holy', stat: 'fai' }], [3, 'Круг соли', 'debuff', { e: 'webbed', r: 3, dur: 6 }], [6, 'Изгнание', 'fear', { r: 8, x: { undeadDie: 1 } }]]],
    ['storm_child', 'Дитя Бури', 'В тебя ударила молния. Ты ударил в ответ.', (P) => !!P.flags.lightning, 'Буря', { storm: 2 }, { str: 1, dex: 1 },
      [[1, 'Удар грома', 'strike', { p: 2.2, x: { stun: 1 } }], [3, 'Молниеносность', 'buff', { e: 'haste', dur: 40 }], [6, 'Гнев неба', 'chain', { p: 2.2, r: 8, n: 6, el: 'storm' }]]],
    ['stone_reader', 'Чтец Камней', 'Камни рассказали тебе то, что люди забыли.', (P) => c(P, 'inscr') >= 12, 'Письмена', { inscr: 10 }, { int: 2 },
      [[1, 'Слово камня', 'bolt', { p: 1.8, r: 7, stat: 'int' }], [3, 'Руна защиты', 'shield', { p: 5, stat: 'int' }], [6, 'Слово силы', 'blast', { p: 3, r: 3, self: 1 }]]],
    ['polyglot', 'Знаток Мёртвых Языков', 'Ты говоришь на языках тех, кого больше нет.', (P) => Object.keys(P.langs || {}).filter((k) => P.langs[k] >= 3).length >= 3, 'Языки', { inscr: 8, read: 8 }, { int: 2 },
      [[1, 'Слово запрета', 'debuff', { e: 'stun', r: 2, dur: 3 }], [3, 'Истинное имя', 'execute', { p: 3 }], [6, 'Язык богов', 'buff', { e: 'focus', dur: 300 }]]],
    ['hungry_priest', 'Жрец Голодного Бога', 'Ты кормил бога. Бог запомнил.', (P) => c(P, 'sacrifices') >= 5, 'Подношения', { sacrifice: 15 }, { fai: 1, str: 1 },
      [[1, 'Укус бога', 'drain', { p: 2 }], [3, 'Пир', 'heal', { p: 0.35, pct: 1 }], [6, 'Голод', 'debuff', { e: 'weak', r: 6, dur: 12 }]]],
    ['curse_bearer', 'Носитель Проклятий', 'Проклятия — твоя броня.', (P) => c(P, 'max_curses') >= 3, 'Проклятия', { hit_taken: 1 }, { con: 2 },
      [[1, 'Передать проклятие', 'debuff', { e: 'weak', r: 2, dur: 10 }], [3, 'Чёрная метка', 'execute', { p: 2.5 }], [6, 'Порча', 'debuff', { e: 'poison', r: 6, dur: 15 }]]],
    ['twice_blessed', 'Дважды Благословлённый', 'Боги спорят, кому ты принадлежишь.', (P) => c(P, 'max_bless') >= 3, 'Благословения', { pray: 4, shrine: 5 }, { fai: 1, luck: 1 },
      [[1, 'Двойная милость', 'heal', { p: 3, stat: 'fai', flat: 20 }], [3, 'Спор богов', 'blast', { p: 2.5, r: 2, self: 1, el: 'holy' }], [6, 'Избранник', 'buff', { e: 'echo', dur: 600 }]]],
    ['shrine_pilgrim', 'Пилигрим Святынь', 'Ты преклонял колени у каждого алтаря.', (P) => c(P, 'shrines') >= 10, 'Паломничество', { shrine: 15, step: 0.02 }, { fai: 1, con: 1 },
      [[1, 'Посох пилигрима', 'strike', { p: 1.8, stat: 'fai' }], [3, 'Путь веры', 'heal', { p: 0.3, pct: 1 }], [6, 'Святая земля', 'buff', { e: 'blessed', dur: 600 }]]],
    ['kings_shadow', 'Тень Короля', 'Ты служил короне так, что о тебе никто не знал.', (P) => !!P.flags.servedKing, 'Служба', { kill: 1, sneak: 3 }, { dex: 1, int: 1 },
      [[1, 'Тайный приказ', 'strike', { p: 2.2, x: { sneak: 2 } }], [3, 'Невидимка', 'stealth', { dur: 30 }], [6, 'Именем короля', 'fear', { r: 10 }]]],
    ['war_veteran', 'Ветеран Войн', 'Ты видел битвы, о которых пишут песни. И знаешь, что песни лгут.', (P) => c(P, 'war_kills') >= 20, 'Шрамы', { 'kill:human': 2, hit_taken: 1 }, { str: 1, con: 1 },
      [[1, 'Строевой удар', 'strike', { p: 2 }], [3, 'Стена щитов', 'shield', { p: 6, stat: 'con' }], [6, 'Атака', 'cleave', { p: 2 }]]],
    ['chronophage', 'Хронофаг', 'Ты ешь время. Оно горчит.', (P) => c(P, 'time_dim') >= 3, 'Мгновения', { cast: 1, rest_out: 0.5 }, { int: 1, dex: 1 },
      [[1, 'Украденный миг', 'timestop', { p: 2 }], [3, 'Старение', 'debuff', { e: 'weak', r: 4, dur: 10 }], [6, 'Остановка', 'timestop', { p: 6 }]]],
    ['void_walker', 'Пустотник', 'Пустота — это не ничто. Это всё, что ещё не случилось.', (P) => c(P, 'void_turns') >= 200, 'Ничто', { void: 1 }, { int: 1, con: 1 },
      [[1, 'Касание пустоты', 'drain', { p: 1.8, stat: 'int' }], [3, 'Исчезновение', 'stealth', { dur: 25 }], [6, 'Ничто', 'blast', { p: 4, r: 3, self: 1, el: 'void' }]]],
    ['abyss_eye', 'Глаз Бездны', 'Ты смотрел в Бездну так долго, что она моргнула первой.', (P) => c(P, 'abyss_depth') >= 15, 'Глубина', { abyss: 2 }, { int: 1, fai: 1 },
      [[1, 'Взгляд', 'debuff', { e: 'fear', r: 6, dur: 6 }], [3, 'Видеть всё', 'reveal', { x: { map: 1, mons: 1 } }], [6, 'Зов Бездны', 'blast', { p: 4, r: 3, range: 8, el: 'void' }]]],
    ['sleepwalker', 'Лунатик', 'Ты ходишь во сне. Далеко.', (P) => c(P, 'dreams') >= 3 && c(P, 'steps_night') >= 2000, 'Сомнамбула', { dream: 8, step_night: 0.05 }, { dex: 1, int: 1 },
      [[1, 'Шаг во сне', 'blink', { r: 8 }], [3, 'Сонный удар', 'strike', { p: 2, x: { stun: 2 } }], [6, 'Не просыпаться', 'shield', { p: 6, stat: 'int' }]]],
    ['blacksnow_herald', 'Вестник Чёрного Снега', 'Ты шёл сквозь чёрный снег, и он ложился тебе на плечи, как плащ.', (P) => c(P, 'k_blacksnow') >= 15, 'Чёрный снег', { kill: 2 }, { con: 1, fai: 1 },
      [[1, 'Чёрная стужа', 'bolt', { p: 2, r: 7, el: 'ice' }], [3, 'Саван', 'shield', { p: 6, stat: 'con' }], [6, 'Мёртвая зима', 'blast', { p: 3.5, r: 4, self: 1, el: 'ice' }]]],
    ['star_eater', 'Пожиратель Звёзд', 'Ты съел то, что упало с неба.', (P) => !!P.flags.ateStar, 'Звёздный свет', { cast: 2, step_night: 0.05 }, { int: 1, con: 1, fai: 1 },
      [[1, 'Звёздное дыхание', 'bolt', { p: 2.4, r: 9, el: 'fire', stat: 'int' }], [3, 'Свечение', 'buff', { e: 'star', dur: 300 }], [6, 'Сверхновая', 'blast', { p: 5, r: 4, self: 1, el: 'fire' }]]],
    ['ash_gardener', 'Садовник Пепла', 'Ты посадил семя в мёртвую землю. Оно взошло.', (P) => !!P.flags.planted, 'Ростки', { rest_out: 1, herb: 3 }, { fai: 1, con: 1 },
      [[1, 'Шипы', 'debuff', { e: 'bleed', r: 2, dur: 6 }], [3, 'Цветение', 'heal', { p: 0.3, pct: 1 }], [6, 'Лес из пепла', 'debuff', { e: 'webbed', r: 5, dur: 8 }]]],
    ['glutton', 'Обжора', 'Ты съел столько, сколько иная деревня за год.', (P) => c(P, 'eaten') >= 250, 'Сытость', { eat: 2 }, { con: 2 },
      [[1, 'Таран брюхом', 'strike', { p: 2, x: { stun: 1 } }], [3, 'Жир', 'shield', { p: 6, stat: 'con' }], [6, 'Пир горой', 'sate', { p: 100 }]]],
    ['recluse', 'Затворник', 'Ты так долго не выходил из дома, что дом стал тобой.', (P) => c(P, 'rest_hours_town') >= 1500, 'Затвор', { rest_in: 1 }, { int: 1, fai: 1 },
      [[1, 'Порог', 'debuff', { e: 'slow', r: 3, dur: 6 }], [3, 'Мой дом', 'shield', { p: 6, stat: 'int' }], [6, 'Стены', 'debuff', { e: 'webbed', r: 6, dur: 10 }]]],
    ['fire_sitter', 'Тот, кто Сидит у Костра', 'Неделю ты смотрел в огонь. Огонь смотрел в ответ.', (P) => c(P, 'fire_rest_streak') >= 7 * 24, 'Огонь', { rest_out: 2 }, { fai: 1, con: 1 },
      [[1, 'Уголёк', 'bolt', { p: 1.8, r: 6, el: 'fire' }], [3, 'Тепло очага', 'heal', { p: 0.35, pct: 1 }], [6, 'Знание огня', 'reveal', { x: { map: 1 } }]]],
    ['reflected', 'Отражённый', 'Тринадцать раз ты смотрел в осколок в полночь.', (P) => c(P, 'mirror') >= 13, 'Зазеркалье', { mirror: 10 }, { dex: 1, luck: 1 },
      [[1, 'Двойной удар', 'strike', { p: 1.4, x: { echo: 1 } }], [3, 'Зеркальная кожа', 'buff', { e: 'mirror', dur: 60 }], [6, 'Там, за стеклом', 'blink', { r: 12 }]]],
    ['grave_speaker', 'Говорящий с Мёртвыми', 'Призраки знают тебя по имени.', (P) => c(P, 'ghost_talks') >= 8, 'Шёпот', { spirit_talk: 4, 'kill:spirit': 2 }, { fai: 1, int: 1 },
      [[1, 'Призыв', 'summon', { x: { mon: 'ally_spirit', n: 1 }, dur: 100 }], [3, 'Холодное слово', 'bolt', { p: 2, r: 7, el: 'void', stat: 'fai' }], [6, 'Упокоение', 'fear', { r: 8, x: { undeadDie: 1 } }]]],
    ['lone_wolf', 'Одинокий Волк', 'Тридцать дней ни с кем не говорить — и не сойти с ума.', (P) => c(P, 'silent_days') >= 30, 'Одиночество', { silent: 1, kill: 1 }, { str: 1, dex: 1 },
      [[1, 'Волчья хватка', 'strike', { p: 2.2, x: { bleed: 3 } }], [3, 'Вой', 'fear', { r: 6 }], [6, 'Сам по себе', 'buff', { e: 'lonely', dur: 900 }]]],
    ['swordsaint', 'Святой Клинка', 'Тысяча ударов — и меч стал продолжением руки.', (P) => c(P, 'crits') >= 300, 'Клинок', { crit: 2, kill_melee: 1 }, { dex: 2 },
      [[1, 'Выпад', 'strike', { p: 2.4, x: { pierce: 1 } }], [3, 'Вихрь клинка', 'cleave', { p: 1.8 }], [6, 'Один удар', 'execute', { p: 5 }]]],
    ['hearth_witch', 'Знахарка', 'Травы шепчут тебе, от чего они.', (P) => c(P, 'herbs') >= 60, 'Травы', { herb: 2, brew: 3 }, { int: 1, fai: 1 },
      [[1, 'Припарка', 'heal', { p: 2, stat: 'int', flat: 12 }], [3, 'Сглаз', 'debuff', { e: 'weak', r: 4, dur: 8 }], [6, 'Зелье жизни', 'heal', { p: 0.7, pct: 1 }]]],
    ['crypt_robber', 'Расхититель Гробниц', 'Ты открыл сотню сундуков, которые не стоило открывать.', (P) => c(P, 'chests') >= 60, 'Сокровища', { chest: 3 }, { dex: 1, luck: 1 },
      [[1, 'Отмычка', 'strike', { p: 1.8, x: { pierce: 1 } }], [3, 'Чутьё на ловушки', 'reveal', { x: { mons: 1 } }], [6, 'Жадность', 'buff', { e: 'greed', dur: 300 }]]],
    ['ferryman', 'Перевозчик', 'Ты плыл туда, откуда не возвращаются. И вернулся.', (P) => !!P.flags.ferried, 'Река', { 'kill:spirit': 3, sail: 0.2 }, { fai: 1, con: 1 },
      [[1, 'Весло', 'strike', { p: 2.2 }], [3, 'Плата', 'execute', { p: 3 }], [6, 'Тот берег', 'blink', { r: 15 }]]],
    ['sailor', 'Морской Бродяга', 'Ты знаешь все ветра по именам.', (P) => c(P, 'sail') >= 1500, 'Ветра', { sail: 0.1 }, { dex: 1, con: 1 },
      [[1, 'Абордаж', 'strike', { p: 2.2 }], [3, 'Попутный ветер', 'buff', { e: 'wind', dur: 300 }], [6, 'Шторм', 'blast', { p: 3, r: 3, self: 1, el: 'storm' }]]],
    ['moon_hound', 'Лунный Пёс', 'Ты выл на луну. Луна отвечала.', (P) => c(P, 'howls') >= 5, 'Вой', { kill_night: 2, moon: 10 }, { dex: 1, str: 1 },
      [[1, 'Клыки', 'strike', { p: 2, x: { bleed: 3 } }], [3, 'Лунная стая', 'summon', { x: { mon: 'ally_wolf', n: 2 }, dur: 80 }], [6, 'Звериный облик', 'buff', { e: 'fury', dur: 100 }]]],
    ['mushroom_king', 'Грибной Король', 'Ты съел сердцевину грибницы. Теперь ты её король.', (P) => !!P.flags.ateSporeHeart, 'Грибница', { 'kill:plant': 3, rest_out: 1 }, { con: 2, fai: 1 },
      [[1, 'Грибной слуга', 'summon', { x: { mon: 'ally_shade', n: 1 }, dur: 60 }], [3, 'Споровое облако', 'debuff', { e: 'poison', r: 4, dur: 10 }], [6, 'Мицелий', 'heal', { p: 0.5, pct: 1 }]]],
    ['gilded_tongue', 'Золотой Язык', 'Ты уговорил стражника, купца и короля.', (P) => c(P, 'talks') >= 150 && c(P, 'gifts') >= 10, 'Слова', { talk: 1, gift: 2 }, { int: 1, luck: 1 },
      [[1, 'Убеждение', 'fear', { r: 4 }], [3, 'Обаяние', 'buff', { e: 'king', dur: 300 }], [6, 'Слово, что сильнее меча', 'timestop', { p: 3 }]]],
    ['harvest_child', 'Дитя Урожая', 'Ты пришёл в мир в год великого урожая. Земля это помнит.', (P) => c(P, 'harvest_days') >= 20, 'Колос', { eat: 1, rest_out: 1 }, { con: 1, luck: 1 },
      [[1, 'Серп', 'strike', { p: 2, x: { bleed: 3 } }], [3, 'Хлеб насущный', 'sate', { p: 60 }], [6, 'Изобилие', 'buff', { e: 'harvest', dur: 900 }]]],
    ['god_hunter', 'Добыча Богов', 'Боги охотились на тебя. Ты выжил.', (P) => !!P.flags.survivedHunt, 'Бегство', { hit_taken: 1, 'kill:god': 20 }, { dex: 2, con: 1 },
      [[1, 'Петляние', 'blink', { r: 8, x: { away: 1 } }], [3, 'След в след', 'stealth', { dur: 30 }], [6, 'Обернуться', 'execute', { p: 4 }]]],
    ['echo_bearer', 'Носитель Эха', 'Мир повторяет за тобой.', (P) => P.inv.some((i) => i.b === 'a_echo') && c(P, 'days') >= 60, 'Эхо', { kill: 1, step: 0.02, talk: 1 }, { str: 1, dex: 1, int: 1, fai: 1 },
      [[1, 'Эхо', 'strike', { p: 1.5, x: { echo: 1 } }], [3, 'Отзвук', 'blast', { p: 2, r: 3, self: 1 }], [6, 'Падение', 'blast', { p: 5, r: 5, self: 1 }]]],
    ['lamplighter', 'Фонарщик', 'Ты зажигал свет там, где его не ждали.', (P) => c(P, 'torches') >= 40, 'Огоньки', { torch: 4 }, { fai: 1, dex: 1 },
      [[1, 'Огонёк', 'bolt', { p: 1.6, r: 7, el: 'fire' }], [3, 'Свет во тьме', 'buff', { e: 'star', dur: 200 }], [6, 'Факельное шествие', 'blast', { p: 2.5, r: 3, self: 1, el: 'fire' }]]],
    ['wasteland_king', 'Король Пустошей', 'Ты правишь тем, что никому не нужно.', (P) => c(P, 'ruins_visited') >= 12, 'Руины', { region_new: 5, chest: 2 }, { str: 1, con: 1 },
      [[1, 'Удар обломком', 'strike', { p: 2, x: { stun: 1 } }], [3, 'Трон из пепла', 'shield', { p: 6, stat: 'con' }], [6, 'Пыль веков', 'debuff', { e: 'blind', r: 5, dur: 6 }]]],
    ['nameless', 'Безымянный', 'Ты забыл своё имя. Мир — тоже.', (P) => !!P.flags.nameless, 'Забвение', { silent: 2, step: 0.03 }, { dex: 1, int: 1, luck: 1 },
      [[1, 'Ничей удар', 'strike', { p: 2.2 }], [3, 'Никто не видит', 'stealth', { dur: 40 }], [6, 'Небытие', 'timestop', { p: 4 }]]],
  ];
  for (const e of L) {
    const [id, n, d, cond, res, gain, grow, abs] = e;
    H(id, n, d, cond, res, gain, grow, abs.map((a) => [a[0], 0, a[1], a[2], Object.assign({ cost: 6 + a[0] * 2, cd: 4 + a[0] * 4 }, a[3])]));
  }
  D.hiddenClasses = Object.keys(C).filter((k) => C[k].hidden);
})(window.EOF);
