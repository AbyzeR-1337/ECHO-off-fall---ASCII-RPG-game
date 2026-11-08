'use strict';
// Ветви, смешения и тайные школы магии — сверх восьми основных.
//  • Ветви (подшколы): вырастают из основной школы, когда в ней ранг E и выше. Вода — из Инея, Ветер — из Бури,
//    Металл — из Камня, Кровь — из Тлена, Тень — из Тайной, Яд — из Жизни. Вступают в башне магов (60 монет).
//  • Смешения: две школы ранга D и выше сплавляются в третью. Пламя+Иней — Пар, Пламя+Камень — Магма,
//    Иней+Буря — Пурга, Пламя+Свет — Солнце, Свет+Тлен — Сумерки, Тлен+Жизнь — Гниль, Тайная+Буря — Астрал,
//    Камень+Тайная — Кристалл. У смешения — оба нрава: пар обжигает и слепит, магма жжёт и сбивает с ног…
//  • Тайные (уникальные) школы — Время, Сны и Песнь — в башнях не учат. Их открывает древний том (редкость
//    в сундуках подземелий) или сама богиня.
// Ветви и смешения не занимают место двух основных школ.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, UI = E.UI, Cb = E.Combat, Ent = E.Ent, TL = E.TL;
  const SC = E.Schools;
  if (!SC) return;
  const SCH = SC.list, SP = SC.SP, COL = SC.COL, TIERS = SC.TIERS;
  const BASE = SC.BASE = Object.keys(SCH);
  // новые цвета чар
  Object.assign(COL, {
    water: [0.35, 0.62, 1], wind: [0.82, 0.95, 0.9], metal: [0.78, 0.8, 0.86], blood: [0.9, 0.12, 0.2], shadow: [0.32, 0.22, 0.45], venom: [0.5, 0.9, 0.25],
    steam: [0.92, 0.92, 0.95], magma: [1, 0.36, 0.08], blizzard: [0.75, 0.9, 1], sun: [1, 0.85, 0.35], twilight: [0.7, 0.45, 0.75], rot: [0.55, 0.62, 0.25],
    astral: [0.55, 0.6, 1], crystal: [0.7, 1, 0.95], time: [0.95, 0.85, 0.55], dream: [0.85, 0.6, 1], song: [1, 0.7, 0.85],
  });
  const add = (id, o) => { SCH[id] = o; };
  // ---------- ветви ----------
  add('water', { n: 'Школа Воды', who: ['гидромант', 'гидромантка'], el: 'water', c: '#5aa0ff', kind: 'sub', from: ['ice'], d: 'Вода мочит, сбивает с ног и тянет на дно. Мокрых бьёт молния, сковывает иней.' });
  add('wind', { n: 'Школа Ветра', who: ['аэромант', 'аэромантка'], el: 'wind', c: '#d0f0e6', kind: 'sub', from: ['storm'], d: 'Ветер толкает, режет и несёт тебя самого.' });
  add('metal', { n: 'Школа Металла', who: ['металломант', 'металломантка'], el: 'metal', c: '#c8ccd8', kind: 'sub', from: ['stone'], d: 'Железо в крови земли: клинки из воздуха, раны, что не закрываются.' });
  add('blood', { n: 'Школа Крови', who: ['кровник', 'кровница'], el: 'blood', c: '#e02838', kind: 'sub', from: ['grave'], d: 'Чужая кровь — твоя сила. Платишь здоровьем — берёшь втрое.' });
  add('shadow', { n: 'Школа Тени', who: ['теневик', 'теневичка'], el: 'shadow', c: '#7058a0', kind: 'sub', from: ['arcane'], d: 'Тень слепит, прячет и ходит сквозь темноту.' });
  add('venom', { n: 'Школа Яда', who: ['отравитель', 'отравительница'], el: 'venom', c: '#80e040', kind: 'sub', from: ['wild'], d: 'Яды, кислоты и споры — медленно, но наверняка.' });
  // ---------- смешения ----------
  add('steam', { n: 'Школа Пара', who: ['паромант', 'паромантка'], el: 'steam', c: '#e8e8f0', kind: 'mix', from: ['fire', 'ice'], d: 'Огонь и лёд: пар обжигает и слепит.' });
  add('magma', { n: 'Школа Магмы', who: ['магмант', 'магмантка'], el: 'magma', c: '#ff5c14', kind: 'mix', from: ['fire', 'stone'], d: 'Огонь и камень: жидкая земля жжёт и сбивает с ног.' });
  add('blizzard', { n: 'Школа Пурги', who: ['пургарь', 'пургарша'], el: 'blizzard', c: '#c0e6ff', kind: 'mix', from: ['ice', 'storm'], d: 'Иней и буря: ледяной ветер с молниями.' });
  add('sun', { n: 'Школа Солнца', who: ['солнцежрец', 'солнцежрица'], el: 'sun', c: '#ffd85a', kind: 'mix', from: ['fire', 'light'], d: 'Пламя и свет: полуденный жар, что карает нечисть.' });
  add('twilight', { n: 'Школа Сумерек', who: ['сумеречник', 'сумеречница'], el: 'twilight', c: '#b070c0', kind: 'mix', from: ['light', 'grave'], d: 'Свет и тлен: жизнь и смерть в одной ладони.' });
  add('rot', { n: 'Школа Гнили', who: ['гнилоуст', 'гнилоустка'], el: 'rot', c: '#8c9c40', kind: 'mix', from: ['grave', 'wild'], d: 'Тлен и жизнь: плесень, что ест живое и растит мёртвое.' });
  add('astral', { n: 'Школа Астрала', who: ['звездочёт', 'звездочётка'], el: 'astral', c: '#8c9cff', kind: 'mix', from: ['arcane', 'storm'], d: 'Тайное и буря: звёздный огонь падает с неба.' });
  add('crystal', { n: 'Школа Кристалла', who: ['кристалломант', 'кристалломантка'], el: 'crystal', c: '#a8fff0', kind: 'mix', from: ['stone', 'arcane'], d: 'Камень и тайное: живой кристалл режет, хранит и отражает.' });
  // ---------- тайные ----------
  add('time', { n: 'Школа Времени', who: ['хрономант', 'хрономантка'], el: 'time', c: '#f0d890', kind: 'unique', d: 'Секунды замедляются и текут вспять. Этому не учат.' });
  add('dream', { n: 'Школа Снов', who: ['сновидец', 'сновидица'], el: 'dream', c: '#d8a0ff', kind: 'unique', d: 'Сон — оружие и щит: усыпить, обмануть, уйти сквозь грёзу.' });
  add('song', { n: 'Школа Песни', who: ['певчий', 'певчая'], el: 'song', c: '#ffb0d8', kind: 'unique', d: 'Первая Песнь, что спела мир: голос лечит, ломает и сводит с ума.' });

  // ---------- заклинания ----------
  const NEW = {
    water: [
      ['wa_whip', 'Водяной хлыст', 0, 'bolt', { p: 1.05, r: 8, st: ['wet', 5, 1] }, 'Хлёсткая струя. Мокрый — лёгкая добыча для молнии и инея.'],
      ['wa_wave', 'Волна', 1, 'cone', { p: 1.1, r: 4, st: ['wet', 5, 1], push: 1 }, 'Волна сбивает и отбрасывает.'],
      ['wa_bubble', 'Водяной пузырь', 2, 'buff', { e: 'shield', dur: 50 }, 'Вода обнимает тебя и гасит удары.'],
      ['wa_whirl', 'Водоворот', 3, 'burst', { p: 1.5, r: 11, rad: 2.2, pull: 1, st: ['wet', 6, 1] }, 'Воронка затягивает врагов в одну точку.'],
      ['wa_rain', 'Ливень', 4, 'nova', { p: 1.4, rad: 5, st: ['wet', 8, 1], heal: 0.1 }, 'Ливень вокруг: все враги мокрые, а тебе легче.'],
      ['wa_tsunami', 'Цунами', 5, 'beam', { p: 3, r: 14, push: 1, st: ['wet', 8, 1], loud: 1 }, 'Стена воды сносит всё на пути.'],
    ],
    wind: [
      ['wn_gust', 'Порыв', 0, 'cone', { p: 0.8, r: 4, push: 1 }, 'Ветер отбрасывает всех перед тобой.'],
      ['wn_blade', 'Воздушный серп', 1, 'beam', { p: 1.35, r: 12, st: ['bleed', 3, 0.5] }, 'Невидимое лезвие режет насквозь.'],
      ['wn_step', 'Попутный ветер', 1, 'buff', { e: 'haste', dur: 40 }, 'Ноги сами несут.'],
      ['wn_leap', 'Ветряной скачок', 2, 'blink', { r: 8 }, 'Ветер подхватывает и переносит.'],
      ['wn_cyclone', 'Смерч', 3, 'orbit', { p: 1.1, num: 4, dur: 22 }, 'Вокруг тебя кружит смерч — и бьёт всех, кто рядом.'],
      ['wn_tempest', 'Ураган', 5, 'nova', { p: 2.4, rad: 5, push: 1, st: ['stun', 1, 0.6], loud: 1 }, 'Ураган разбрасывает всех вокруг.'],
    ],
    metal: [
      ['mt_shards', 'Железные иглы', 0, 'multi', { p: 0.6, r: 9, num: 3, st: ['bleed', 3, 0.5] }, 'Три иглы веером. Раны кровят.'],
      ['mt_skin', 'Стальная кожа', 1, 'buff', { e: 'ironskin', dur: 70 }, 'Кожа звенит, как кольчуга.'],
      ['mt_blades', 'Танец клинков', 2, 'orbit', { p: 1.1, num: 4, dur: 25, st: ['bleed', 3, 0.6] }, 'Четыре клинка кружат вокруг.'],
      ['mt_spear', 'Стальное копьё', 3, 'beam', { p: 2, r: 13, st: ['bleed', 4, 1] }, 'Копьё из воздуха — насквозь.'],
      ['mt_rain', 'Ливень клинков', 5, 'strikes', { p: 2.4, r: 10, cnt: 6, st: ['bleed', 5, 1] }, 'С неба падают мечи.'],
    ],
    blood: [
      ['bl_drink', 'Глоток крови', 0, 'drain', { p: 1.05, r: 7 }, 'Тянет кровь врага — она лечит тебя.'],
      ['bl_boil', 'Кипящая кровь', 1, 'bolt', { p: 1.35, r: 9, st: ['bleed', 5, 1] }, 'Кровь в жилах врага закипает.'],
      ['bl_frenzy', 'Кровавое бешенство', 2, 'buff', { e: 'fury', dur: 40 }, 'Боль делает тебя сильнее.'],
      ['bl_rite', 'Обряд крови', 3, 'nova', { p: 1.9, rad: 3.5, lifesteal: 0.45 }, 'Кровь всех вокруг тянется к тебе.'],
      ['bl_puppet', 'Кукловод', 4, 'bolt', { p: 0.6, r: 9, st: ['stun', 3, 1] }, 'Хватаешь кровь врага — он не может шевельнуться.'],
      ['bl_moon', 'Алая луна', 6, 'nova', { p: 3.6, rad: 6, lifesteal: 0.5, st: ['bleed', 6, 1], loud: 1 }, 'Луна краснеет. Кровь течёт отовсюду — к тебе.'],
    ],
    shadow: [
      ['sh_bolt', 'Тёмная игла', 0, 'bolt', { p: 1.1, r: 10, st: ['blind', 2, 0.4] }, 'Игла тьмы. Иногда слепит.'],
      ['sh_veil', 'Покров тени', 1, 'buff', { e: 'stealth', dur: 50 }, 'Ты сливаешься с тенью.'],
      ['sh_step', 'Шаг сквозь тень', 2, 'blink', { r: 9, novaP: 1.2, rad: 1.5 }, 'Ты выходишь из чужой тени — и бьёшь.'],
      ['sh_grasp', 'Хватка тьмы', 3, 'burst', { p: 1.4, r: 11, rad: 2, st: ['webbed', 3, 1] }, 'Тени держат врагов за ноги.'],
      ['sh_night', 'Беззвёздная ночь', 5, 'nova', { p: 2.2, rad: 5, st: ['blind', 4, 1] }, 'Тьма падает на всех вокруг — они ослепли.'],
    ],
    venom: [
      ['vn_spit', 'Плевок кислоты', 0, 'bolt', { p: 1.05, r: 8, st: ['poison', 5, 1] }, 'Едкая капля.'],
      ['vn_cloud', 'Споровое облако', 1, 'burst', { p: 0.6, r: 10, rad: 2, st: ['poison', 6, 1], cloud: 1 }, 'Облако спор висит в воздухе.'],
      ['vn_blade', 'Отравленный клинок', 2, 'buff', { e: 'poisonblade', dur: 60 }, 'Всё, чем бьёшь, — с ядом.'],
      ['vn_acid', 'Кислотный дождь', 4, 'strikes', { p: 1.8, r: 10, cnt: 5, st: ['poison', 6, 1] }, 'С неба льётся кислота.'],
      ['vn_plague', 'Чума', 5, 'nova', { p: 1.6, rad: 5, st: ['poison', 10, 1] }, 'Все вокруг заболевают.'],
    ],
    steam: [
      ['sm_jet', 'Струя пара', 0, 'cone', { p: 1.05, r: 3, st: ['burn', 3, 0.5] }, 'Обжигающий пар веером.'],
      ['sm_fog', 'Паровая завеса', 1, 'burst', { p: 0.7, r: 9, rad: 2.5, st: ['blind', 3, 1], cloud: 1 }, 'Горячий туман — враги ничего не видят.'],
      ['sm_geyser', 'Гейзер', 2, 'burst', { p: 1.8, r: 11, rad: 1.4, fall: 1, st: ['stun', 1, 0.5] }, 'Из-под ног врага бьёт кипяток.'],
      ['sm_boiler', 'Котёл', 4, 'nova', { p: 2.4, rad: 4, st: ['burn', 4, 1] }, 'Всё вокруг кипит.'],
    ],
    magma: [
      ['mg_lava', 'Лавовый плевок', 0, 'bolt', { p: 1.35, r: 9, st: ['burn', 4, 0.6] }, 'Ком жидкой земли.'],
      ['mg_floor', 'Огненная земля', 1, 'wall', { p: 0.9, len: 5, dur: 12, st: ['burn', 4, 1] }, 'Земля плавится поперёк пути.'],
      ['mg_fist', 'Кулак вулкана', 2, 'burst', { p: 2, r: 10, rad: 1.5, push: 1, st: ['stun', 1, 0.6] }, 'Каменный кулак в огне.'],
      ['mg_erupt', 'Извержение', 4, 'strikes', { p: 2.6, r: 10, cnt: 6, st: ['burn', 5, 1], loud: 1 }, 'Из земли бьют фонтаны лавы.'],
      ['mg_core', 'Сердце горы', 6, 'burst', { p: 4.2, r: 14, rad: 4, fall: 1, wallRing: 1, st: ['burn', 6, 1], loud: 1 }, 'С неба падает расплавленная гора.'],
    ],
    blizzard: [
      ['bz_sleet', 'Ледяной дождь', 0, 'multi', { p: 0.65, r: 10, num: 3, st: ['slow', 3, 0.7] }, 'Град осколков.'],
      ['bz_spark', 'Искрящий лёд', 1, 'chain', { p: 1.2, r: 8, cnt: 3, st: ['freeze', 2, 0.3] }, 'Молния прыгает, оставляя иней.'],
      ['bz_wall', 'Стена метели', 2, 'wall', { p: 0.8, len: 6, dur: 12, st: ['slow', 4, 1] }, 'Метель поперёк пути.'],
      ['bz_storm', 'Белая буря', 4, 'strikes', { p: 2.3, r: 11, cnt: 7, st: ['freeze', 2, 0.5], loud: 1 }, 'Ледяные молнии бьют с неба.'],
    ],
    sun: [
      ['su_ray', 'Полуденный луч', 0, 'beam', { p: 1.15, r: 11, st: ['burn', 3, 0.5] }, 'Луч жжёт и метит нечисть.'],
      ['su_flare', 'Вспышка', 1, 'nova', { p: 0.9, rad: 3, st: ['blind', 2, 1] }, 'Ослепительная вспышка.'],
      ['su_halo', 'Венец солнца', 2, 'orbit', { p: 1.1, num: 3, dur: 25 }, 'Три солнечных сферы вокруг тебя.'],
      ['su_noon', 'Полдень', 4, 'burst', { p: 2.8, r: 13, rad: 2.6, fall: 1, st: ['burn', 4, 1] }, 'Столп солнечного огня.'],
      ['su_nova', 'Сверхновая', 6, 'nova', { p: 4, rad: 6, st: ['burn', 6, 1], heal: 0.3, loud: 1 }, 'Ты на миг становишься солнцем.'],
    ],
    twilight: [
      ['tw_touch', 'Касание сумерек', 0, 'drain', { p: 1, r: 7 }, 'Берёшь жизнь — и отдаёшь её себе.'],
      ['tw_veil', 'Сумеречный покров', 1, 'buff', { e: 'shield', dur: 50 }, 'Ни свет, ни тьма не пробьют.'],
      ['tw_judge', 'Суд сумерек', 3, 'bolt', { p: 2, r: 11, st: ['curse', 8, 1] }, 'Метка и проклятие разом.'],
      ['tw_balance', 'Равновесие', 4, 'nova', { p: 2, rad: 4, lifesteal: 0.3, heal: 0.15 }, 'Что взято у врагов — отдано тебе.'],
    ],
    rot: [
      ['rt_mold', 'Плесень', 0, 'bolt', { p: 0.95, r: 9, st: ['poison', 5, 1] }, 'Пятно плесени разъедает плоть.'],
      ['rt_corpse', 'Гнилой взрыв', 2, 'burst', { p: 1.6, r: 10, rad: 2, st: ['poison', 6, 1], cloud: 1 }, 'Гниль лопается облаком.'],
      ['rt_grow', 'Грибница', 3, 'summon', { mon: 'ally_bones', num: 2, dur: 140 }, 'Из гнилой земли встают споровые мертвецы.'],
      ['rt_feast', 'Пир гнили', 5, 'nova', { p: 2.4, rad: 5, lifesteal: 0.3, st: ['poison', 8, 1] }, 'Гниль ест всех вокруг и кормит тебя.'],
    ],
    astral: [
      ['as_star', 'Звёздная стрела', 0, 'bolt', { p: 1.2, r: 13, fast: 1 }, 'Быстрая стрела звёздного света.'],
      ['as_comets', 'Кометы', 2, 'multi', { p: 0.95, r: 13, num: 4, homing: 1 }, 'Кометы сами находят врагов.'],
      ['as_gate', 'Звёздные врата', 3, 'blink', { r: 11, novaP: 1.6, rad: 2 }, 'Шаг сквозь звёзды.'],
      ['as_fall', 'Звездопад', 5, 'strikes', { p: 2.8, r: 12, cnt: 8, loud: 1 }, 'Звёзды падают на врагов.'],
    ],
    crystal: [
      ['cr_shard', 'Кристальный осколок', 0, 'bolt', { p: 1.2, r: 10, st: ['brittle', 4, 0.6] }, 'Осколок делает врага хрупким.'],
      ['cr_armor', 'Кристальный доспех', 1, 'buff', { e: 'shield', dur: 70 }, 'Грани кристалла держат удары.'],
      ['cr_prison', 'Кристальная темница', 3, 'bolt', { p: 1.2, r: 10, st: ['freeze', 4, 1] }, 'Враг вмерзает в кристалл.'],
      ['cr_garden', 'Сад кристаллов', 4, 'wall', { p: 1.1, len: 7, dur: 14, st: ['bleed', 3, 1] }, 'Острые кристаллы вырастают поперёк пути.'],
      ['cr_prism', 'Призма', 6, 'multi', { p: 1.8, r: 14, num: 7, homing: 1 }, 'Свет дробится на семь лучей.'],
    ],
    time: [
      ['tm_slow', 'Тягучая секунда', 0, 'burst', { p: 0.5, r: 10, rad: 2, st: ['slow', 5, 1] }, 'Время вокруг врагов густеет.'],
      ['tm_haste', 'Ускорение', 1, 'buff', { e: 'haste', dur: 60 }, 'Для тебя секунды длиннее.'],
      ['tm_rewind', 'Откат', 2, 'heal', { pct: 0.35, cleanse: 1, rewind: 1 }, 'Раны возвращаются туда, где их не было.'],
      ['tm_age', 'Старение', 3, 'bolt', { p: 1.6, r: 10, st: ['curse', 8, 1] }, 'Враг стареет на годы за миг.'],
      ['tm_stop', 'Остановка времени', 5, 'nova', { p: 0.4, rad: 8, st: ['freeze', 4, 1] }, 'Мир замирает. Только ты двигаешься.'],
      ['tm_end', 'Конец времён', 6, 'nova', { p: 4.4, rad: 6, st: ['stun', 3, 1], loud: 1 }, 'Время рушится на всех вокруг.'],
    ],
    dream: [
      ['dr_lull', 'Колыбельная', 0, 'cone', { p: 0.4, r: 4, st: ['stun', 3, 0.8] }, 'Враги перед тобой засыпают.'],
      ['dr_mirage', 'Мираж', 1, 'buff', { e: 'stealth', dur: 60 }, 'Тебя видят там, где тебя нет.'],
      ['dr_night', 'Кошмар', 2, 'bolt', { p: 1.5, r: 10, st: ['fear', 5, 1] }, 'Враг видит свой худший сон.'],
      ['dr_phantom', 'Призрачные волки', 3, 'summon', { mon: 'ally_wolf', num: 2, dur: 120 }, 'Волки из сна — кусают по-настоящему.'],
      ['dr_deep', 'Глубокий сон', 5, 'nova', { p: 0.6, rad: 6, st: ['stun', 5, 1] }, 'Все вокруг падают и спят.'],
    ],
    song: [
      ['sg_note', 'Звенящая нота', 0, 'beam', { p: 1, r: 10, st: ['stun', 1, 0.35] }, 'Нота — как удар колокола.'],
      ['sg_ballad', 'Баллада', 1, 'heal', { pct: 0.25, regen: 1 }, 'Песня закрывает раны.'],
      ['sg_war', 'Боевой напев', 2, 'buff', { e: 'might', dur: 60 }, 'С песней — сильнее.'],
      ['sg_shatter', 'Разбивающая песнь', 3, 'cone', { p: 1.8, r: 5, st: ['brittle', 5, 1] }, 'Высокая нота — и доспех трескается.'],
      ['sg_lament', 'Плач', 4, 'nova', { p: 1.6, rad: 5, st: ['fear', 5, 1] }, 'От этой песни бегут.'],
      ['sg_first', 'Первая Песнь', 6, 'nova', { p: 3.4, rad: 6, heal: 0.4, st: ['stun', 2, 1], loud: 1 }, 'Песня, которой спели мир.'],
    ],
  };
  for (const s in NEW) {
    SP[s] = NEW[s];
    for (const [id, n, tier, form, o, d] of NEW[s]) {
      const cost = Math.round([3, 5, 8, 12, 18, 26, 36][tier] * (form === 'heal' || form === 'buff' ? 1.1 : 1) * (SCH[s].kind === 'mix' ? 1.1 : 1));
      const cd = [1, 2, 4, 6, 9, 14, 24][tier] + (form === 'summon' ? 20 : form === 'heal' ? 6 : form === 'buff' ? 25 : form === 'wall' ? 6 : 0);
      const stat = s === 'sun' || s === 'twilight' || s === 'song' ? 'fai' : 'int';
      const a = D.mkAb(id, n, 'school', Object.assign({ school: s, tier, form, el: SCH[s].el, stat, cost, cd, d: d + ' (' + SCH[s].n + ', ранг ' + TIERS[tier] + ')' }, o));
      SC.byId[id] = a;
    }
  }

  // ---------- нрав новых стихий при попадании ----------
  // as — чьи комбо работают; on — что ещё делает попадание
  const ef = (e, id, t, p) => { if (!e.dead) Cb.entFx(e, id, t, p); };
  const push = (e, n) => { const P = G.P, m = G.map, dx = Math.sign(e.x - P.x), dy = Math.sign(e.y - P.y); for (let i = 0; i < n; i++) { const nx = e.x + dx, ny = e.y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || !TL[m.tiles[ny * m.w + nx]].walk || Gm.entAt(nx, ny)) break; Ent.move(e, nx, ny); } };
  const steal = (d, k) => Gm.healPlayer(Math.max(1, Math.round(d * k)), true);
  const EX = SC.EX = {
    water: { as: null, on: (e) => ef(e, 'wet', 5) },
    wind: { as: null, on: (e, d, a) => { if (a.form !== 'orbit') push(e, 1); } },
    metal: { as: 'earth', on: (e) => { if (Math.random() < 0.35) ef(e, 'bleed', 3, 3); } },
    blood: { as: 'dark', on: (e, d) => steal(d, 0.25) },
    shadow: { as: 'dark', on: (e) => { if (Math.random() < 0.25) ef(e, 'blind', 2); } },
    venom: { as: 'nature', on: (e) => ef(e, 'poison', 4, 2 + Math.floor(G.P.level / 5)) },
    steam: { as: 'fire', on: (e) => { ef(e, 'wet', 3); if (Math.random() < 0.3) ef(e, 'blind', 2); } },
    magma: { as: 'fire', on: (e) => { ef(e, 'burn', 3, 3 + Math.floor(G.P.level / 4)); if (Math.random() < 0.2) ef(e, 'stun', 1); } },
    blizzard: { as: 'ice', on: (e) => { ef(e, 'shock', 2); ef(e, 'slow', 3); } },
    sun: { as: 'holy', on: (e) => { if (Math.random() < 0.4) ef(e, 'burn', 3, 3); } },
    twilight: { as: 'holy', on: (e, d) => { steal(d, 0.2); if (Math.random() < 0.3) ef(e, 'curse', 4); } },
    rot: { as: 'dark', on: (e, d) => { ef(e, 'poison', 4, 2); steal(d, 0.1); } },
    astral: { as: 'arcane', on: (e) => { const k = ['wet', 'burn', 'shock', 'mark'][Math.floor(Math.random() * 4)]; ef(e, k, 3, k === 'burn' ? 3 : undefined); } },
    crystal: { as: 'earth', on: (e) => { if (Math.random() < 0.4) ef(e, 'brittle', 4); } },
    time: { as: 'arcane', on: (e) => ef(e, 'slow', 3) },
    dream: { as: 'arcane', on: (e) => { if (Math.random() < 0.2) ef(e, 'stun', 2); } },
    song: { as: 'arcane', on: (e) => { if (Math.random() < 0.2) ef(e, 'fear', 3); } },
  };
  const hit0 = SC.hit;
  SC.hit = function (e, dmg, a, o) {
    const X = a && EX[a.el];
    if (!X) return hit0.apply(this, arguments);
    const hp0 = e.hp;
    const r = hit0.call(this, e, dmg, X.as ? Object.assign({}, a, { el: X.as }) : a, o);
    try { if (X.on) X.on(e, Math.max(0, hp0 - Math.max(0, e.hp)), a); } catch (err) { /* */ }
    return r;
  };
  // ---------- особое: откат времени ----------
  const hist = [];
  const tk0 = Gm.tick;
  Gm.tick = function () {
    const r = tk0.apply(this, arguments);
    const P = G.P;
    if (P && !P.dead) { const t = performance.now(); if (!hist.length || t - hist[hist.length - 1].t > 500) { hist.push({ t, hp: P.hp }); if (hist.length > 20) hist.shift(); } }
    return r;
  };
  const cast0 = SC.cast;
  SC.cast = function (a) {
    const r = cast0.apply(this, arguments);
    if (r && a && a.rewind) {
      const P = G.P, t = performance.now(), past = hist.find((h) => t - h.t <= 6500);
      if (past && past.hp > P.hp) { P.hp = Math.min(P.mhp, past.hp); Gm.msg('Время течёт вспять: раны, что были полминуты назад, — их нет.', '#f0d890'); }
    }
    return r;
  };

  // ---------- вступить ----------
  const fee = (s) => (SCH[s].kind === 'mix' ? 120 : SCH[s].kind === 'sub' ? 60 : 30);
  SC.canJoin = function (s) {
    const d = SCH[s];
    if (SC.member(s)) return 'уже в школе';
    if (d.kind === 'unique') return 'этому не учат в башнях';
    if (d.kind === 'sub') { const p = d.from[0]; return SC.rank(p) >= 1 ? null : 'нужен ранг E в ' + SCH[p].n.replace('Школа', 'школе').replace('Тайная школа', 'Тайной школе'); }
    if (d.kind === 'mix') { const bad = d.from.filter((p) => SC.rank(p) < 2); return bad.length ? 'нужен ранг D в ' + (bad.length > 1 ? 'школах ' : 'школе ') + bad.map((p) => SCH[p].n.replace('Школа ', '').replace('Тайная школа', 'Тайной')).join(' и ') : null; }
    return null;
  };
  const baseCount = () => Object.keys(G.P.schools || {}).filter((s) => !SCH[s].kind).length;
  // основные школы — как прежде (две), ветви и смешения — отдельно
  UI.schoolsScreen = function () {
    const P = G.P;
    UI.list({ title: 'Школы магии', w: 90, name: 'schools',
      header: () => 'Основных школ — две (вторая — когда в первой ранг C). Ветвь растёт из школы ранга E, смешение — из двух школ ранга D. Тайные школы в башнях не учат.',
      items: () => {
        const out = [];
        for (const s of BASE) {
          const d = SCH[s], mem = SC.member(s), r = SC.rank(s);
          const nMem = baseCount(), canSecond = !nMem || (P.school && SC.rank(P.school) >= 3);
          const f0 = P.cls === 'mage' ? 0 : 30;
          out.push({ t: d.n + (mem ? ' — ты ' + d.who[P.sex === 'f' ? 1 : 0] + ' ранга ' + TIERS[r] + ' (' + P.schools[s] + ' оп.)' : ' — ' + d.d), c: d.c, disabled: mem || !canSecond || nMem >= 2 || P.gold < f0, f: () => { if (mem) return 'keep'; P.gold -= f0; SC.join(s); return 'keep'; } });
        }
        out.push({ t: '— Ветви и смешения —', dim: 1, disabled: 1, f: () => 'keep' });
        for (const s of Object.keys(SCH).filter((k) => SCH[k].kind === 'sub' || SCH[k].kind === 'mix')) {
          const d = SCH[s], mem = SC.member(s), why = SC.canJoin(s), cost = fee(s);
          out.push({ t: (d.kind === 'mix' ? '⚗ ' : '↳ ') + d.n + (mem ? ' — ты ' + d.who[P.sex === 'f' ? 1 : 0] + ' ранга ' + TIERS[SC.rank(s)] : ' — ' + d.d + (why ? ' (' + why + ')' : ' — ' + cost + ' мон.')), c: d.c, disabled: mem || !!why || P.gold < cost, f: () => { if (mem || why) return 'keep'; P.gold -= cost; SC.join(s); return 'keep'; } });
        }
        const un = Object.keys(SCH).filter((k) => SCH[k].kind === 'unique');
        for (const s of un) if (SC.member(s)) out.push({ t: '✦ ' + SCH[s].n + ' — ты ' + SCH[s].who[P.sex === 'f' ? 1 : 0] + ' ранга ' + TIERS[SC.rank(s)], c: SCH[s].c, disabled: 1, f: () => 'keep' });
        if (!un.some((s) => SC.member(s))) out.push({ t: '✦ Тайные школы — о них говорят лишь старые книги…', dim: 1, disabled: 1, f: () => 'keep' });
        return out;
      },
    });
  };
  // маг по пути, что уже в школе: одна из ветвей откроется сама, когда дорастёт — подсказка
  const gx0 = SC.gainXp;
  SC.gainXp = function (s, n) {
    const r0 = SC.rank(s);
    const r = gx0.apply(this, arguments);
    const r1 = SC.rank(s);
    if (r1 > r0 && !SCH[s].kind) {
      if (r1 === 1) { const sub = Object.keys(SCH).find((k) => SCH[k].kind === 'sub' && SCH[k].from[0] === s); if (sub) Gm.msg('Тебе открылась ветвь: ' + SCH[sub].n + '. Вступить — в башне магов.', SCH[sub].c); }
      if (r1 === 2) for (const k of Object.keys(SCH)) if (SCH[k].kind === 'mix' && SCH[k].from.includes(s) && !SC.canJoin(k)) Gm.msg('Две школы сплавились в третью: ' + SCH[k].n + '. Вступить — в башне магов.', SCH[k].c);
    }
    return r;
  };

  // ---------- тайные тома ----------
  const TOMES = { tome_time: ['Том Остановленных Часов', 'time'], tome_dream: ['Книга Сновидца', 'dream'], tome_song: ['Песенник Первой Песни', 'song'] };
  for (const id in TOMES) D.items[id] = { id, n: TOMES[id][0], g: 'm', t: 'misc', w: 1.5, v: 900, tome: TOMES[id][1], d: 'Древний том. Кто прочтёт — откроет ' + SCH[TOMES[id][1]].n.replace('Школа', 'школу') + '. Таких книг в мире — единицы.' };
  SC.grantUnique = function (s, src) {
    const P = G.P;
    if (SC.member(s)) return false;
    P.schools = P.schools || {};
    P.schools[s] = 0;
    const f = SP[s].filter((x) => x[2] === 0);
    Gm.learnAb(f[Math.floor(Math.random() * f.length)][0]);
    Gm.popup(SCH[s].n, (src || 'Слова сами складываются в голове.') + '\n\nТы — ' + SCH[s].who[P.sex === 'f' ? 1 : 0] + ' ранга F. ' + SCH[s].d + '\n\nНовые заклинания этой школы учатся сами — с рангом (и в башне, у тех немногих, кто о ней слышал).');
    Gm.cnt('schools'); Gm.cnt('unique_school');
    return true;
  };
  const use0 = Gm.use;
  Gm.use = function (it) {
    const d = it && D.items[it.b];
    if (d && d.tome) {
      if (SC.member(d.tome)) { Gm.msg('Ты уже знаешь всё, что в этой книге.'); return; }
      Gm.removeItem(it);
      SC.grantUnique(d.tome, 'Ты читаешь всю ночь. Буквы плывут, потом — светятся. Под утро книга рассыпается в пыль, а ты знаешь то, чего не знает никто.');
      Gm.endTurn(60);
      return;
    }
    return use0.apply(this, arguments);
  };
  // тайные школы растут сами: новый ранг — новое заклинание (в башнях их не учат)
  const gx1 = SC.gainXp;
  SC.gainXp = function (s, n) {
    const r0 = SC.rank(s);
    const r = gx1.apply(this, arguments);
    if (SCH[s] && SCH[s].kind === 'unique' && SC.rank(s) > r0) {
      const P = G.P, nx = SP[s].find((x) => x[2] <= SC.rank(s) && !P.abil.includes(x[0]));
      if (nx) { Gm.learnAb(nx[0]); Gm.msg(SCH[s].n + ': ты сам постиг «' + nx[1] + '».', SCH[s].c); }
    }
    return r;
  };
  // тома — редкая находка в сундуках подземелий
  const oc0 = Gm.openChest;
  if (oc0) Gm.openChest = function (i, x, y) {
    const r = oc0.apply(this, arguments);
    try {
      const m = G.map, dg = (m.spawn && m.spawn.danger) || 0;
      if (!m.outdoor && Math.random() < 0.006 + dg * 0.004) {
        const left = Object.keys(TOMES).filter((k) => !G.S.taken[k]);
        if (left.length) { const k = left[Math.floor(Math.random() * left.length)]; G.S.taken[k] = 1; Gm.give(k); Gm.msg('Под тряпьём на дне сундука — тяжёлый том в коже. Буквы на обложке шевелятся.', SCH[TOMES[k][1]].c); }
      }
    } catch (e) { /* */ }
    return r;
  };
  // посохи ветвей и смешений — на верстаке и в башнях
  const STF = { water: 'Посох Глубин', wind: 'Посох Ветров', metal: 'Стальной жезл', blood: 'Посох Крови', shadow: 'Посох Тени', venom: 'Посох Яда', steam: 'Посох Пара', magma: 'Посох Магмы', blizzard: 'Посох Пурги', sun: 'Посох Солнца', twilight: 'Посох Сумерек', rot: 'Посох Гнили', astral: 'Посох Звездочёта', crystal: 'Кристальный посох', time: 'Посох Часов', dream: 'Посох Сновидца', song: 'Лира-посох' };
  const LOOK = { water: '#2a5a8a', wind: '#c8e0d8', metal: '#8a8e98', blood: '#5a1218', shadow: '#1e1828', venom: '#3a5a1a', steam: '#b8b8c0', magma: '#3a1408', blizzard: '#e0f0ff', sun: '#e8b840', twilight: '#4a2a50', rot: '#4a4a20', astral: '#2a2a5a', crystal: '#a0e0d8', time: '#a08040', dream: '#6a4a8a', song: '#d8a0b8' };
  for (const s in STF) {
    const id = 'staff2_' + s;
    D.items[id] = { id, n: STF[s], g: 'm', t: 'weapon', s: 'hand', w: 3, dmg: [3, 7], v: SCH[s].kind === 'unique' ? 2400 : 520, wear: 220, stat: 'int', spell: 1.35, school: s, d: 'Посох для ' + SCH[s].n.toLowerCase().replace('школа', 'школы') + ': её чары с ним сильнее на четверть.' };
    SC.STAFF_TIER[id] = SCH[s].kind === 'unique' ? 5 : 4;
    SC.STAFF_LOOK[id] = LOOK[s];
  }
  const SH = E.Dlg && E.Dlg.SHOP;
  if (SH && SH.magic) SH.magic.push('staff2_water', 'staff2_wind', 'staff2_metal', 'staff2_blood', 'staff2_shadow', 'staff2_venom', 'staff2_steam', 'staff2_magma', 'staff2_sun', 'staff2_crystal');
  const WB = E.Crafts && E.Crafts.recipes && E.Crafts.recipes.WORKBENCH;
  if (WB) {
    const ess = { water: 'pearl', wind: 'feather', metal: 'iron_ingot', blood: 'h_bloodroot', shadow: 'ectoplasm', venom: 'h_sundew', steam: 'h_frost', magma: 'h_ashbloom', blizzard: 'h_frost', sun: 'holy_water', twilight: 'bone', rot: 'mushrooms', astral: 'star_jelly', crystal: 'crystal' };
    for (const s in ess) WB.list.push(['staff2_' + s, 1, { wood: 2, crystal: 2, mana_shard: SCH[s].kind === 'mix' ? 3 : 2, [ess[s]]: 2 }, 9]);
  }
})(window.EOF);
