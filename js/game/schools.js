'use strict';
// Школы магии. Магия теперь — ремесло школ, а не набор кнопок.
//  • Восемь школ: Пламени, Инея, Бури, Камня, Света, Тлена, Жизни и Тайная. Чтобы колдовать чары школы,
//    надо в неё вступить (в башне магов; маг по пути — сразу). При вступлении даётся одно случайное заклинание ранга F.
//  • Ранги F, E, D, C, B, A, S. Ранг в школе растёт от чар этой школы; заклинания следующего ранга учат в башне.
//  • Посох решает, какой ранг тебе по силам: без посоха — только F (и слабее), простой посох и жезл — до E,
//    костяной — до D, хрустальный — до C, посохи школ — до B (и сильнее для своей школы), посох архимага — до A,
//    древние посохи — до S.
//  • Механики разные: снаряд, луч, конус, взрыв в точке, кольцо вокруг, стена, цепь, сферы вокруг, гроза,
//    призыв, лечение, щит, скачок, высасывание, казнь.
//  • Комбо стихий: мокрого бьёт молния вдвое, замёрзшее раскалывает камень, огонь растапливает лёд, свет карает
//    помеченных… и связки: попадания подряд за пару секунд усиливают друг друга.
//  • Каждое заклинание видно: сгусток со следом, вспышка попадания, лучи, кольца, стены огня, падающие метеоры.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, UI = E.UI, Cb = E.Combat, Ent = E.Ent;
  const SC = E.Schools = {};
  const TIERS = SC.TIERS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
  const SCH = SC.list = {
    fire: { n: 'Школа Пламени', who: ['пиромант', 'пиромантка'], el: 'fire', c: '#ff8a3a', d: 'Огонь жжёт, поджигает и взрывается.' },
    ice: { n: 'Школа Инея', who: ['криомант', 'криомантка'], el: 'ice', c: '#9ad8ff', d: 'Холод замедляет, сковывает и колет.' },
    storm: { n: 'Школа Бури', who: ['громовник', 'громовница'], el: 'storm', c: '#b8c0ff', d: 'Молния бьёт быстро и перескакивает.' },
    stone: { n: 'Школа Камня', who: ['геомант', 'геомантка'], el: 'earth', c: '#c8a070', d: 'Земля держит, давит и защищает.' },
    light: { n: 'Школа Света', who: ['теург', 'теургиня'], el: 'holy', c: '#fff0a0', d: 'Свет лечит своих и сжигает нечисть.' },
    grave: { n: 'Школа Тлена', who: ['некромант', 'некромантка'], el: 'dark', c: '#a070e0', d: 'Тлен пьёт жизнь и поднимает мёртвых.' },
    wild: { n: 'Школа Жизни', who: ['друид', 'друидка'], el: 'nature', c: '#80e080', d: 'Корни, яд и исцеление.' },
    arcane: { n: 'Тайная школа', who: ['чародей', 'чародейка'], el: 'arcane', c: '#c890ff', d: 'Чистая сила: стрелы, щиты, скачки сквозь пространство.' },
  };
  // цвет чар по стихии
  const COL = SC.COL = { fire: [1, 0.55, 0.18], ice: [0.6, 0.88, 1], storm: [0.78, 0.82, 1], earth: [0.78, 0.6, 0.38], holy: [1, 0.95, 0.62], dark: [0.62, 0.38, 0.9], nature: [0.48, 0.95, 0.42], arcane: [0.8, 0.52, 1], acid: [0.55, 1, 0.4] };
  // заклинания: [id, имя, ранг, механика, параметры, описание]
  const SP = {
    fire: [
      ['f_spark', 'Искра', 0, 'bolt', { p: 1.15, r: 9, st: ['burn', 3, 0.35] }, 'Огонёк с ладони. Может поджечь.'],
      ['f_palm', 'Жар ладони', 0, 'cone', { p: 0.95, r: 3, st: ['burn', 3, 0.5] }, 'Короткий веер огня перед собой.'],
      ['f_ball', 'Огненный шар', 1, 'burst', { p: 1.45, r: 11, rad: 1.6, st: ['burn', 3, 0.4] }, 'Шар летит и взрывается.'],
      ['f_wall', 'Стена огня', 2, 'wall', { p: 0.7, len: 5, dur: 10, st: ['burn', 3, 1] }, 'Поперёк пути встаёт пламя. Кто войдёт — горит.'],
      ['f_breath', 'Дыхание дракона', 3, 'cone', { p: 1.65, r: 5, st: ['burn', 4, 0.8] }, 'Широкий огненный выдох.'],
      ['f_meteor', 'Метеор', 4, 'burst', { p: 2.7, r: 14, rad: 2.6, fall: 1, st: ['burn', 4, 0.8], loud: 1 }, 'Камень в огне падает с неба.'],
      ['f_ring', 'Огненное кольцо', 5, 'nova', { p: 2.4, rad: 4, st: ['burn', 5, 1] }, 'Пламя расходится кольцом от тебя.'],
      ['f_fall', 'Пламя Падения', 6, 'burst', { p: 4, r: 14, rad: 4, fall: 1, wallRing: 1, st: ['burn', 6, 1], loud: 1 }, 'Огонь конца света. Земля горит ещё долго.'],
    ],
    ice: [
      ['i_needle', 'Ледяная игла', 0, 'bolt', { p: 1.05, r: 10, st: ['slow', 3, 0.7] }, 'Игла льда замедляет.'],
      ['i_breath', 'Морозное дыхание', 0, 'cone', { p: 0.85, r: 3, st: ['slow', 3, 1] }, 'Иней веером.'],
      ['i_lance', 'Ледяное копьё', 1, 'beam', { p: 1.35, r: 11, st: ['slow', 3, 0.8] }, 'Пронзает насквозь всех на линии.'],
      ['i_field', 'Поле инея', 2, 'wall', { p: 0.4, len: 5, dur: 12, st: ['slow', 3, 1], wet: 1 }, 'Земля покрывается льдом. Кто ступит — вязнет.'],
      ['i_storm', 'Буран', 3, 'burst', { p: 1.55, r: 12, rad: 2.6, st: ['slow', 4, 1] }, 'Вьюга в одной точке.'],
      ['i_prison', 'Ледяная темница', 4, 'bolt', { p: 1.8, r: 11, st: ['freeze', 4, 1] }, 'Цель вмерзает в лёд.'],
      ['i_winter', 'Вечная зима', 5, 'nova', { p: 2.2, rad: 5, st: ['freeze', 3, 1] }, 'Всё вокруг замерзает.'],
      ['i_glacier', 'Сердце Ледника', 6, 'burst', { p: 3.6, r: 14, rad: 4, fall: 1, st: ['freeze', 4, 1], loud: 1 }, 'Глыба льда с неба. Осколки режут всех вокруг.'],
    ],
    storm: [
      ['s_jolt', 'Разряд', 0, 'chain', { p: 0.95, r: 7, cnt: 2, st: ['shock', 2, 0.3] }, 'Молния перескакивает на соседа.'],
      ['s_flick', 'Искровой бросок', 0, 'bolt', { p: 1.1, r: 12, fast: 1, st: ['shock', 2, 0.3] }, 'Быстрая искра.'],
      ['s_bolt', 'Молния', 1, 'beam', { p: 1.55, r: 13, st: ['shock', 2, 0.5] }, 'Прямая молния — насквозь.'],
      ['s_ball', 'Шаровая молния', 2, 'orbit', { p: 0.9, num: 3, dur: 20 }, 'Три шара кружат вокруг и бьют, кто подойдёт.'],
      ['s_chain', 'Цепная молния', 3, 'chain', { p: 1.6, r: 9, cnt: 5, st: ['shock', 2, 0.6] }, 'Скачет по всем врагам рядом.'],
      ['s_thunder', 'Гроза', 4, 'strikes', { p: 2.2, r: 9, cnt: 4, loud: 1 }, 'Молнии с неба в тех, кто рядом.'],
      ['s_step', 'Шаг грома', 5, 'blink', { r: 9, novaP: 2.1, rad: 2.5, loud: 1 }, 'Скачок — и гром там, где ты встал.'],
      ['s_wrath', 'Гнев Неба', 6, 'strikes', { p: 3.2, r: 12, cnt: 12, loud: 1 }, 'Небо раскалывается над всеми врагами.'],
    ],
    stone: [
      ['e_rock', 'Брошенный камень', 0, 'bolt', { p: 1.25, r: 9, push: 1 }, 'Камень с земли — в лоб.'],
      ['e_skin', 'Каменная кожа', 0, 'buff', { e: 'ironskin', dur: 60 }, 'Кожа твердеет, как камень.'],
      ['e_spikes', 'Шипы земли', 1, 'burst', { p: 1.4, r: 10, rad: 1.3, st: ['webbed', 2, 1] }, 'Из земли бьют каменные шипы и держат.'],
      ['e_wall', 'Каменные зубья', 2, 'wall', { p: 0.8, len: 5, dur: 10, st: ['webbed', 2, 1] }, 'Ряд каменных зубьев поперёк пути.'],
      ['e_quake', 'Землетрясение', 3, 'nova', { p: 1.65, rad: 4, st: ['stun', 1, 0.6], loud: 1, quake: 1 }, 'Земля уходит из-под ног у всех вокруг.'],
      ['e_boulder', 'Валун', 4, 'beam', { p: 2.8, r: 12, push: 1, loud: 1 }, 'Катится, давит всех на пути.'],
      ['e_golem', 'Гранитный страж', 5, 'summon', { mon: 'ally_golem', num: 1, dur: 200 }, 'Из земли встаёт голем.'],
      ['e_rift', 'Разлом', 6, 'beam', { p: 3.6, r: 14, st: ['stun', 2, 1], loud: 1, quake: 1 }, 'Земля раскалывается до самого горизонта.'],
    ],
    light: [
      ['l_ray', 'Луч света', 0, 'beam', { p: 0.95, r: 9, st: ['mark', 4, 0.4] }, 'Тонкий луч. Нечисть его не любит.'],
      ['l_mend', 'Малое исцеление', 0, 'heal', { pct: 0.22 }, 'Затягивает раны.'],
      ['l_mark', 'Святая метка', 1, 'bolt', { p: 1.2, r: 11, st: ['mark', 8, 1] }, 'Метка: свет бьёт её носителя вдвое.'],
      ['l_ward', 'Щит веры', 2, 'buff', { e: 'shield', dur: 60 }, 'Свет держит удары.'],
      ['l_radiance', 'Сияние', 3, 'nova', { p: 1.6, rad: 3, heal: 0.15 }, 'Вспышка света: врагам больно, тебе легче.'],
      ['l_smite', 'Кара небесная', 4, 'burst', { p: 2.6, r: 13, rad: 2, fall: 1 }, 'Столп света с неба.'],
      ['l_grace', 'Благодать', 5, 'heal', { pct: 0.6, cleanse: 1, bless: 1 }, 'Полное исцеление и благословение.'],
      ['l_sun', 'Второе солнце', 6, 'nova', { p: 3.6, rad: 6, st: ['stun', 2, 1] }, 'На миг вокруг тебя — полдень.'],
    ],
    grave: [
      ['g_drain', 'Высасывание', 0, 'drain', { p: 0.95, r: 7 }, 'Тянет жизнь из врага в тебя.'],
      ['g_shard', 'Костяной осколок', 0, 'bolt', { p: 1.15, r: 10, st: ['bleed', 3, 0.5] }, 'Острый осколок кости.'],
      ['g_bones', 'Поднять кости', 1, 'summon', { mon: 'ally_bones', num: 1, dur: 120 }, 'Кости встают и служат.'],
      ['g_rot', 'Облако тлена', 2, 'burst', { p: 0.8, r: 10, rad: 2, st: ['poison', 5, 1], cloud: 1 }, 'Гниль висит в воздухе.'],
      ['g_curse', 'Проклятие слабости', 3, 'burst', { p: 0.3, r: 10, rad: 2.5, st: ['curse', 10, 1] }, 'Проклятым больнее от всего.'],
      ['g_harvest', 'Жатва душ', 4, 'nova', { p: 2.2, rad: 4, lifesteal: 0.3 }, 'Коса тьмы вокруг. Часть силы — тебе.'],
      ['g_army', 'Армия мёртвых', 5, 'summon', { mon: 'ally_bones', num: 3, dur: 150 }, 'Трое мёртвых встают рядом.'],
      ['g_death', 'Смерть', 6, 'execute', { p: 2.4, r: 11 }, 'Если враг слаб — он умирает.'],
    ],
    wild: [
      ['w_thorn', 'Ядовитый шип', 0, 'bolt', { p: 0.95, r: 9, st: ['poison', 4, 0.8] }, 'Шип с ядом.'],
      ['w_leaf', 'Лечебный лист', 0, 'heal', { pct: 0.15, regen: 1 }, 'Лист к ране — и рана затягивается.'],
      ['w_roots', 'Опутывание', 1, 'burst', { p: 0.6, r: 10, rad: 1.6, st: ['webbed', 3, 1] }, 'Корни хватают за ноги.'],
      ['w_hedge', 'Стена шипов', 2, 'wall', { p: 0.8, len: 5, dur: 12, st: ['bleed', 3, 1] }, 'Колючий куст поперёк пути.'],
      ['w_swarm', 'Рой', 3, 'orbit', { p: 0.8, num: 5, dur: 25, st: ['poison', 3, 0.5] }, 'Жалящий рой вьётся вокруг тебя.'],
      ['w_call', 'Зов леса', 4, 'summon', { mon: 'ally_wolf', num: 2, dur: 160 }, 'Волки выходят из чащи.'],
      ['w_fog', 'Ядовитый туман', 5, 'burst', { p: 1.2, r: 12, rad: 3, st: ['poison', 8, 1], cloud: 1 }, 'Зелёный туман — тяжёлый и сладкий.'],
      ['w_world', 'Дыхание Мира', 6, 'heal', { pct: 1, cleanse: 1, regen: 1, rootAll: 4 }, 'Мир делится силой: раны закрываются, враги вязнут в корнях.'],
    ],
    arcane: [
      ['a_triple', 'Тройная стрела', 0, 'multi', { p: 0.7, r: 10, num: 3 }, 'Три стрелы силы веером.'],
      ['a_blink', 'Мерцание', 0, 'blink', { r: 6 }, 'Скачок на несколько шагов.'],
      ['a_shield', 'Щит чар', 1, 'buff', { e: 'shield', dur: 45 }, 'Мерцающая сфера держит удары.'],
      ['a_orbs', 'Сферы силы', 2, 'orbit', { p: 1.0, num: 3, dur: 25 }, 'Три сферы кружат вокруг и бьют.'],
      ['a_ray', 'Луч распада', 3, 'beam', { p: 1.85, r: 13 }, 'Луч, что разбирает всё на пути.'],
      ['a_seekers', 'Стрелы-охотники', 4, 'multi', { p: 1.1, r: 13, num: 5, homing: 1 }, 'Пять стрел сами находят врагов.'],
      ['a_warp', 'Искажение', 5, 'burst', { p: 2.2, r: 12, rad: 3, pull: 1 }, 'Пространство сминается в точку.'],
      ['a_rift', 'Разрыв пространства', 6, 'nova', { p: 4, rad: 5, blinkAfter: 1 }, 'Мир рвётся вокруг тебя.'],
    ],
  };
  SC.SP = SP;
  const BYID = SC.byId = {};
  for (const s in SP) for (const [id, n, tier, form, o, d] of SP[s]) {
    const el = SCH[s].el;
    const cost = Math.round([3, 5, 8, 12, 18, 26, 36][tier] * (form === 'heal' || form === 'buff' ? 1.1 : 1));
    const cd = [1, 2, 4, 6, 9, 14, 24][tier] + (form === 'summon' ? 20 : form === 'heal' ? 6 : form === 'buff' ? 25 : form === 'wall' ? 6 : 0);
    const a = D.mkAb(id, n, 'school', Object.assign({ school: s, tier, form, el, stat: s === 'light' ? 'fai' : 'int', cost, cd, d: d + ' (' + SCH[s].n + ', ранг ' + TIERS[tier] + ')' }, o));
    BYID[id] = a;
  }
  // ---------- посохи ----------
  const STAFF_TIER = { staff: 1, wand: 1, staff_bone: 2, staff_crystal: 3, staff_fire: 4, staff_ice: 4, staff_storm: 4, staff_stone: 4, staff_light: 4, staff_grave: 4, staff_wild: 4, staff_arcane: 4, staff_archmage: 5, a_pilgrim_staff: 5, a_nightstaff: 6 };
  SC.STAFF_TIER = STAFF_TIER;
  const B = D.items;
  const staffIt = (id, n, sch, o) => { B[id] = Object.assign({ id, n, g: 'm', t: 'weapon', s: 'hand', w: 3, dmg: [3, 7], v: 420, wear: 220, stat: 'int', spell: 1.35, school: sch }, o); };
  staffIt('staff_fire', 'Посох Пламени', 'fire', { d: 'Обугленное древко, в навершии тлеет уголь. Чары огня с ним сильнее на четверть.' });
  staffIt('staff_ice', 'Посох Инея', 'ice', { d: 'Белое древко в изморози, в навершии — льдинка, что не тает.' });
  staffIt('staff_storm', 'Посох Бури', 'storm', { d: 'Тёмное древко, по нему пробегают искры. Пахнет грозой.' });
  staffIt('staff_stone', 'Посох Камня', 'stone', { d: 'Каменное древко с жилой руды. Тяжёлый, как надгробие.' });
  staffIt('staff_light', 'Посох Света', 'light', { stat: 'fai', d: 'Позолоченное древко, в навершии — светлый кристалл.' });
  staffIt('staff_grave', 'Посох Тлена', 'grave', { d: 'Чёрное древко, перевитое костью. Холодное.' });
  staffIt('staff_wild', 'Посох Жизни', 'wild', { d: 'Живое дерево: на древке растут листья.' });
  staffIt('staff_arcane', 'Посох Тайного', 'arcane', { d: 'Лиловое древко с рунами, навершие парит над ним.' });
  staffIt('staff_archmage', 'Посох Архимага', null, { v: 1600, spell: 1.5, d: 'Серебро и звёздный металл. С ним по силам чары ранга A.' });
  SC.staffTier = (w) => (w && STAFF_TIER[w.b]) || 0;
  // как посох выглядит в руке: цвет древка (кристалл — по стихии выбранного заклинания)
  SC.STAFF_LOOK = { wand: '#c8a878', staff_bone: '#e8e0d0', staff_crystal: '#8a98b0', staff_fire: '#4a2018', staff_ice: '#d0e6f4', staff_storm: '#3a3a5a', staff_stone: '#7a7066', staff_light: '#e8d090', staff_grave: '#221c24', staff_wild: '#4a7a34', staff_arcane: '#6a4a8a', staff_archmage: '#d8d8e8', a_nightstaff: '#16161c', a_pilgrim_staff: '#b89060' };

  // ---------- кто ты в школе ----------
  const RANKXP = [0, 40, 130, 320, 700, 1400, 2800];
  SC.member = (s) => { const P = G.P; return !!(P && P.schools && P.schools[s] != null); };
  SC.rank = (s) => { const P = G.P; if (!SC.member(s)) return -1; const xp = P.schools[s]; let r = 0; for (let i = 0; i < RANKXP.length; i++) if (xp >= RANKXP[i]) r = i; return r; };
  SC.main = () => { const P = G.P; return P && P.school; };
  SC.title = () => { const s = SC.main(); if (!s) return null; return SCH[s].who[G.P.sex === 'f' ? 1 : 0] + ' ' + TIERS[SC.rank(s)]; };
  SC.join = function (s, quiet) {
    const P = G.P;
    P.schools = P.schools || {};
    if (P.schools[s] != null) return false;
    P.schools[s] = 0;
    if (!P.school) P.school = s;
    const f = SP[s].filter((x) => x[2] === 0);
    const pick = f[Math.floor(Math.random() * f.length)];
    Gm.learnAb(pick[0]);
    if (!quiet) Gm.popup(SCH[s].n, 'Тебя вписывают в книгу школы. Старший маг кладёт ладонь тебе на лоб — и в голове загорается первое слово силы.\n\nТы — ' + SCH[s].who[P.sex === 'f' ? 1 : 0] + ' ранга F.\nПервое заклинание: «' + pick[1] + '» — ' + pick[5] + '\n\nЧары школы растят твой ранг. Заклинания следующего ранга учат в башнях магов. Для сильных чар нужен посох получше.');
    Gm.cnt('schools');
    return true;
  };
  SC.gainXp = function (s, n) {
    const P = G.P;
    if (!SC.member(s)) return;
    const r0 = SC.rank(s);
    P.schools[s] += n;
    const r1 = SC.rank(s);
    if (r1 > r0) Gm.msg(SCH[s].n + ': ранг ' + TIERS[r1] + '. Заклинания ранга ' + TIERS[r1] + ' можно учить в башне магов.', SCH[s].c);
  };
  // можно ли колдовать
  SC.why = function (a) {
    const P = G.P;
    if (!a || a.k !== 'school') return null;
    if (!SC.member(a.school)) return 'нужно вступить в ' + SCH[a.school].n.toLowerCase().replace('школа', 'школу');
    const w = staffInHand();
    const st = SC.staffTier(w);
    if (a.tier > Math.max(0, st)) return 'нужен посох ранга ' + TIERS[a.tier] + ' или выше';
    return null;
  };
  function staffInHand() { const P = G.P; for (const h of ['hand', 'off']) { const w = P.eq[h]; if (w && (STAFF_TIER[w.b] != null || /staff|wand/.test(w.b))) return w; } return null; }
  SC.staffInHand = staffInHand;

  // ---------- эффекты (видимые) ----------
  const RT = E.RT;
  const VFX = SC.vfx = RT ? (RT.vfx = RT.vfx || []) : [];
  const now = () => performance.now() / 1000;
  const gy = (x, z) => { const v = UI.V3 && UI.V3.view, m = G.map; const ox = v ? v.gox : 0, oz = v ? v.goz : 0; return UI.Hgt && UI.Hgt.groundAt ? UI.Hgt.groundAt(ox + x, oz + z) : 0; };
  const eyeP = () => { const P = G.P, px = P.posX != null ? P.posX : P.x + 0.5, pz = P.posY != null ? P.posY : P.y + 0.5; return [px, gy(px, pz) + 0.67, pz]; };
  const fwd = () => { const y = UI.V3 ? UI.V3.yaw : 0; return [Math.sin(y), -Math.cos(y)]; };
  // навершие посоха: справа (или слева у левши) и чуть ниже глаз — оттуда бьют лучи и молнии
  const tipP = () => { const e = eyeP(), f = fwd(), sd = G.P.hand === 'L' ? -1 : 1, th = UI.V3 && UI.V3.third; return [e[0] + f[0] * (th ? 0.25 : 0.45) - f[1] * sd * (th ? 0.3 : 0.2), e[1] - (th ? 0.12 : 0.2), e[2] + f[1] * (th ? 0.25 : 0.45) + f[0] * sd * (th ? 0.3 : 0.2)]; };
  function part(x, y, z, vx, vy, vz, life, size, col, o) { if (VFX.length > 900) VFX.splice(0, 100); VFX.push(Object.assign({ k: 'p', x, y, z, vx, vy, vz, t0: now(), life, size, col }, o || {})); }
  function burstFx(x, y, z, el, n, spd, size) {
    const c = COL[el] || COL.arcane;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2, s = spd * (0.4 + Math.random() * 0.8); part(x, y, z, Math.cos(a) * Math.cos(b) * s, Math.sin(b) * s + (el === 'fire' ? 1.2 : 0.3), Math.sin(a) * Math.cos(b) * s, 0.35 + Math.random() * 0.45, size * (0.6 + Math.random() * 0.8), c, { grav: el === 'earth' ? 6 : el === 'fire' ? -0.6 : 1.5 }); }
    VFX.push({ k: 'light', x, y, z, t0: now(), life: 0.35, col: c, r: 3 + n * 0.05, i: 2 });
  }
  function ringFx(x, z, r, el, life) { VFX.push({ k: 'ring', x, z, r, t0: now(), life: life || 0.5, col: COL[el] || COL.arcane }); VFX.push({ k: 'light', x, y: gy(x, z) + 0.6, z, t0: now(), life: 0.4, col: COL[el] || COL.arcane, r: r + 2, i: 2 }); }
  function beamFx(a, b, el, life, w) { VFX.push({ k: 'beam', a, b, t0: now(), life: life || 0.3, col: COL[el] || COL.arcane, w: w || 0.06, jag: el === 'storm' }); const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; VFX.push({ k: 'light', x: m[0], y: m[1], z: m[2], t0: now(), life: 0.3, col: COL[el] || COL.arcane, r: 5, i: 1.6 }); }
  SC.fx = { part, burstFx, ringFx, beamFx };
  // ---------- куда целишься ----------
  function aim(r) {
    const P = G.P, m = G.map;
    if (RT && RT.is3D && RT.is3D() && RT.rayHit) { const h = RT.rayHit(r); return { x: h.x, y: h.y, z: h.z, e: h.e && h.e.kind !== 'ally' ? h.e : null, tx: U.clamp(Math.floor(h.x - (h.wall ? fwd()[0] * 0.5 : 0)), 0, m.w - 1), ty: U.clamp(Math.floor(h.z - (h.wall ? fwd()[1] * 0.5 : 0)), 0, m.h - 1), wall: h.wall }; }
    const d = G.faceDir || [0, 1];
    let x = P.x, y = P.y;
    for (let i = 0; i < r; i++) { const nx = x + d[0], ny = y + d[1]; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) break; const t = TL[m.tiles[ny * m.w + nx]]; if (!t.walk && !t.see) break; x = nx; y = ny; const e = Gm.entAt(x, y); if (e && e.kind !== 'ally') return { x: x + 0.5, y: gy(x + 0.5, y + 0.5) + 0.6, z: y + 0.5, e, tx: x, ty: y }; }
    return { x: x + 0.5, y: gy(x + 0.5, y + 0.5) + 0.6, z: y + 0.5, e: null, tx: x, ty: y };
  }
  const foe = (e) => e && !e.dead && e.kind !== 'ally' && !(e.kind === 'npc' && !e.hostile && !e.hostileToP);
  const ents = () => G.map.ents.filter(foe);
  // ---------- урон, состояния, комбо ----------
  const hasFx = (e, id) => e.fx && e.fx.some((f) => f.id === id);
  const rmFx = (e, id) => { if (e.fx) e.fx = e.fx.filter((f) => f.id !== id); };
  let chain = { n: 0, t: 0 };
  SC.chainN = () => (now() - chain.t < 2.6 ? chain.n : 0);
  function power(a) {
    const P = G.P, sv = P.st[a.stat] || 5, w = staffInHand();
    let k = (2 + Math.random() * 3 + sv * 0.9 + P.level * 0.8) * (a.p || 1);
    const st = SC.staffTier(w);
    if (!w) k *= 0.75; else k *= (w.spell || 1);
    if (w && D.items[w.b] && D.items[w.b].school === a.school) k *= 1.25;
    k *= 1 + 0.06 * Math.max(0, SC.rank(a.school) - a.tier);
    if (Gm.event('comet')) k *= 1.3;
    if (E.Magic && E.Magic.lv) k *= 1 + 0.12 * E.Magic.lv(a.id);
    void st;
    return k;
  }
  SC.hit = function (e, dmg, a, o) {
    const P = G.P, m = G.map, el = a.el;
    if (!e || e.dead) return false;
    if (e.kind === 'npc' && !e.hostile) { if (Gm.crime) Gm.crime(e, 'attack'); e.wasPeaceful = 1; }
    e.aware = true; if (e.kind === 'mon' && e.ai === 'passive') e.hostileToP = true;
    // мокрый: стоит в воде, или дождь
    const t = TL[m.tiles[e.y * m.w + e.x]];
    if ((t && t.water) || (m.outdoor && ['rain', 'storm'].includes(Gm.weather()))) Cb.entFx(e, 'wet', 3);
    let mul = 1, combo = null;
    if (el === 'fire') {
      if (hasFx(e, 'freeze') || hasFx(e, 'slow')) { mul = 1.5; combo = 'Таяние'; rmFx(e, 'freeze'); rmFx(e, 'slow'); Cb.entFx(e, 'wet', 3); }
      else if (hasFx(e, 'poison')) { mul = 1.4; combo = 'Ядовитое пламя'; for (const x of ents()) if (x !== e && U.dist(x.x, x.y, e.x, e.y) <= 1) Cb.entFx(x, 'poison', 4, 3); }
      else if (hasFx(e, 'webbed') || (e.tags || []).includes('plant')) { mul = 1.3; combo = 'Пожар'; Cb.entFx(e, 'burn', 6, 4); }
      else if (hasFx(e, 'wet')) { mul = 0.6; rmFx(e, 'wet'); }
    } else if (el === 'ice') {
      if (hasFx(e, 'wet')) { combo = 'Заморозка'; rmFx(e, 'wet'); Cb.entFx(e, 'freeze', 3); }
      else if (hasFx(e, 'burn')) { combo = 'Закалка'; rmFx(e, 'burn'); Cb.entFx(e, 'brittle', 5); }
    } else if (el === 'storm') {
      if (hasFx(e, 'wet')) { mul = 2; combo = 'Разряд по воде'; Cb.entFx(e, 'stun', 1); for (const x of ents()) if (x !== e && hasFx(x, 'wet') && U.dist(x.x, x.y, e.x, e.y) <= 4) { Cb.hurtEnt(x, Math.round(dmg * 0.8), 'player', 'storm'); beamFx([e.x + 0.5, gy(e.x + 0.5, e.y + 0.5) + 0.7, e.y + 0.5], [x.x + 0.5, gy(x.x + 0.5, x.y + 0.5) + 0.7, x.y + 0.5], 'storm', 0.25, 0.04); } }
      else if (hasFx(e, 'freeze')) { mul = 1.6; combo = 'Ледяной раскол'; rmFx(e, 'freeze'); }
    } else if (el === 'earth') {
      if (hasFx(e, 'freeze') || hasFx(e, 'brittle')) { mul = 2.5; combo = 'Раскол'; rmFx(e, 'freeze'); rmFx(e, 'brittle'); }
    } else if (el === 'holy') {
      if (hasFx(e, 'mark') || hasFx(e, 'curse')) { mul = 1.8; combo = 'Кара'; rmFx(e, 'mark'); for (const x of ents()) if (x !== e && U.dist(x.x, x.y, e.x, e.y) <= 1) Cb.hurtEnt(x, Math.round(dmg * 0.5), 'player', 'holy'); }
    } else if (el === 'dark') {
      if (hasFx(e, 'burn')) { combo = 'Чёрное пламя'; Gm.healPlayer(Math.round(dmg * 0.35), true); }
    } else if (el === 'nature') {
      if (hasFx(e, 'burn')) { combo = 'Ядовитый дым'; for (const x of ents()) if (U.dist(x.x, x.y, e.x, e.y) <= 1) Cb.entFx(x, 'poison', 5, 3); }
    } else if (el === 'arcane') {
      const n = (e.fx || []).filter((f) => ['wet', 'slow', 'freeze', 'burn', 'shock', 'poison', 'mark', 'curse', 'brittle', 'webbed', 'bleed'].includes(f.id)).length;
      if (n >= 2) { mul = 1 + 0.25 * n; combo = 'Резонанс ×' + n; }
    }
    if (hasFx(e, 'curse')) mul *= 1.3;
    if (hasFx(e, 'shock') && el !== 'storm') mul *= 1.15;
    // связка: попадания подряд (стены и сферы её не растят)
    const tn = now(), quiet = o && o.quiet;
    if (!quiet) chain = tn - chain.t < 2.6 ? { n: chain.n + 1, t: tn } : { n: 1, t: tn };
    mul *= 1 + Math.min(0.5, (SC.chainN() - 1) * 0.08);
    let d = Math.max(1, Math.round(dmg * mul - Math.floor((e.d || 0) * 0.3)));
    if (a.form === 'execute' && e.hp < e.mhp * 0.4) { d = e.hp + 5; combo = 'Смерть'; }
    const wasHp = e.hp;
    const killed = Cb.hurtEnt(e, d, 'player', el === 'nature' ? 'acid' : el === 'dark' ? 'void' : el === 'earth' ? null : el);
    if (!quiet || killed || combo) Gm.msg(U.cap(a.n) + ' — ' + Cb.accOf(e) + ' (' + d + ')' + (combo ? '. ' + combo + '!' : '') + (!quiet && chain.n >= 3 ? ' Связка ×' + chain.n + '.' : '.'), combo ? '#ffe080' : '#ffd0a0');
    if (combo && UI.pop3d) UI.pop3d(e.x, e.y, combo + '!', SCH[a.school].c, true);
    if (combo) { const p = [e.x + 0.5, gy(e.x + 0.5, e.y + 0.5) + 0.8, e.y + 0.5]; burstFx(p[0], p[1], p[2], el, 26, 3.2, 0.09); SC.lastCombo = { n: combo, t: performance.now() }; Gm.cnt('combos'); }
    // состояние
    if (!killed && a.st && Math.random() < (a.st[2] == null ? 1 : a.st[2])) {
      const [id, tt] = a.st;
      Cb.entFx(e, id, tt, id === 'burn' ? 3 + Math.floor(G.P.level / 4) : id === 'poison' ? 2 + Math.floor(G.P.level / 5) : id === 'bleed' ? 3 : undefined);
    }
    if (o && o.steal) Gm.healPlayer(Math.round(Math.min(wasHp, d) * o.steal), true);
    SC.gainXp(a.school, killed ? 5 + a.tier * 2 : 0);
    G.hitEnt = e.id; G.hitEntT = performance.now();
    return killed;
  };
  // ---------- исполнение заклинаний ----------
  const pos = (e) => [e.x + 0.5, gy(e.x + 0.5, e.y + 0.5) + 0.7, e.y + 0.5];
  function spellShotTo(a, p, opt) {
    if (!RT || !RT.spellShot || !RT.is3D || !RT.is3D()) return;
    RT.spellShot(a.el, { x: p[0], y: p[1], z: p[2] });
    const s = RT.shots[RT.shots.length - 1];
    if (s) { s.big = opt && opt.big; s.fast = a.fast; if (a.fast) { s.vx *= 1.6; s.vy *= 1.6; s.vz *= 1.6; } }
  }
  SC.cast = function (a) {
    const P = G.P, m = G.map;
    const why = SC.why(a);
    if (why) { Gm.msg('«' + a.n + '»: ' + why + '.', '#c0a0a0'); return false; }
    const dmg = () => power(a);
    const e0 = eyeP(), f = fwd();
    const in3D = !!(RT && RT.is3D && RT.is3D());
    let any = false;
    switch (a.form) {
      case 'bolt': case 'execute': {
        const h = aim(a.r || 9);
        spellShotTo(a, [h.x, h.y, h.z], { big: a.tier >= 4 });
        if (h.e) { SC.hit(h.e, dmg(), a); if (a.push && !h.e.dead) pushBack(h.e, 1); any = true; }
        else { terrain(a, h.tx, h.ty, 0); Gm.msg('«' + a.n + '» уходит мимо.', '#909090'); }
        break;
      }
      case 'multi': {
        const n = a.num || 3, list = ents().filter((e) => U.dist(e.x, e.y, P.x, P.y) <= (a.r || 10) && E.FOV.los(m, P.x, P.y, e.x, e.y));
        const front = list.filter((e) => { const dx = e.x + 0.5 - (P.posX != null ? P.posX : P.x + 0.5), dz = e.y + 0.5 - (P.posY != null ? P.posY : P.y + 0.5), l = Math.hypot(dx, dz) || 1; return a.homing || (dx * f[0] + dz * f[1]) / l > 0.55; }).sort((p, q) => U.dist(p.x, p.y, P.x, P.y) - U.dist(q.x, q.y, P.x, P.y));
        for (let i = 0; i < n; i++) {
          const e = front[i % Math.max(1, front.length)];
          if (e) { spellShotTo(a, pos(e)); SC.hit(e, dmg(), a); any = true; }
          else { const k = (i - (n - 1) / 2) * 0.22, c = Math.cos(k), s = Math.sin(k); const dx = f[0] * c - f[1] * s, dz = f[0] * s + f[1] * c; spellShotTo(a, [e0[0] + dx * 9, e0[1], e0[2] + dz * 9]); }
        }
        break;
      }
      case 'beam': case 'drain': {
        const h = aim(a.r || 10), len = Math.hypot(h.x - e0[0], h.z - e0[2]) || 1;
        const end = [h.x, h.y, h.z];
        beamFx(tipP(), end, a.el, a.form === 'drain' ? 0.5 : 0.32, a.tier >= 4 ? 0.12 : 0.07);
        const hits = a.form === 'drain' ? (h.e ? [h.e] : []) : ents().filter((e) => { const ex = e.x + 0.5 - e0[0], ez = e.y + 0.5 - e0[2], tt = (ex * (h.x - e0[0]) + ez * (h.z - e0[2])) / (len * len); if (tt < 0 || tt > 1.05) return false; const px = e0[0] + (h.x - e0[0]) * tt, pz = e0[2] + (h.z - e0[2]) * tt; return Math.hypot(e.x + 0.5 - px, e.y + 0.5 - pz) < 0.75; });
        for (const e of hits) { SC.hit(e, dmg(), a, a.form === 'drain' ? { steal: 0.5 } : null); if (a.push && !e.dead) pushBack(e, 2); any = true; }
        burstFx(end[0], end[1], end[2], a.el, 12, 2, 0.06);
        terrain(a, h.tx, h.ty, 0);
        if (a.quake) quakeLine(e0, end);
        if (!hits.length) Gm.msg('«' + a.n + '» бьёт в пустоту.', '#909090');
        break;
      }
      case 'cone': {
        const r = a.r || 3;
        const hits = ents().filter((e) => { const dx = e.x + 0.5 - (P.posX != null ? P.posX : P.x + 0.5), dz = e.y + 0.5 - (P.posY != null ? P.posY : P.y + 0.5), l = Math.hypot(dx, dz); return l <= r + 0.5 && (l < 0.8 || (dx * f[0] + dz * f[1]) / l > 0.6); });
        for (let i = 0; i < 40 + r * 12; i++) { const k = (Math.random() - 0.5) * 1.2, c = Math.cos(k), s = Math.sin(k), sp = 3 + Math.random() * r * 1.4; part(e0[0] + f[0] * 0.4, e0[1] - 0.15, e0[2] + f[1] * 0.4, (f[0] * c - f[1] * s) * sp, (Math.random() - 0.4) * 1.2, (f[0] * s + f[1] * c) * sp, 0.35 + Math.random() * 0.25, 0.07 + Math.random() * 0.07, COL[a.el], { grav: a.el === 'fire' ? -1 : 0.5 }); }
        VFX.push({ k: 'light', x: e0[0] + f[0] * 1.5, y: e0[1], z: e0[2] + f[1] * 1.5, t0: now(), life: 0.4, col: COL[a.el], r: 5, i: 2 });
        for (const e of hits) { SC.hit(e, dmg(), a); any = true; }
        for (let k = 1; k <= r; k++) terrain(a, Math.floor((P.posX != null ? P.posX : P.x + 0.5) + f[0] * k), Math.floor((P.posY != null ? P.posY : P.y + 0.5) + f[1] * k), 0);
        if (!hits.length) Gm.msg('«' + a.n + '» — никого перед тобой.', '#909090');
        break;
      }
      case 'burst': {
        const h = aim(a.r || 10);
        const cx = h.e ? h.e.x + 0.5 : h.x, cz = h.e ? h.e.y + 0.5 : h.z, cy = gy(cx, cz);
        if (a.fall) { for (let i = 0; i < 14; i++) part(cx + (Math.random() - 0.5) * 0.4, cy + 7 + i * 0.25, cz + (Math.random() - 0.5) * 0.4, 0, -18, 0, 0.38, 0.16 + Math.random() * 0.1, COL[a.el], { grav: 0 }); }
        else spellShotTo(a, [cx, cy + 0.6, cz], { big: 1 });
        const doIt = () => {
          if (G.map !== m || G.P !== P) return;
          ringFx(cx, cz, a.rad || 2, a.el, 0.6); burstFx(cx, cy + 0.5, cz, a.el, 30 + Math.round((a.rad || 2) * 14), 4 + (a.rad || 2), 0.11);
          let n = 0;
          for (const e of ents()) if (Math.hypot(e.x + 0.5 - cx, e.y + 0.5 - cz) <= (a.rad || 2) + 0.3) { SC.hit(e, dmg(), a); if (a.pull && !e.dead) pullTo(e, Math.floor(cx), Math.floor(cz)); n++; }
          for (let dy = -Math.ceil(a.rad || 1); dy <= Math.ceil(a.rad || 1); dy++) for (let dx = -Math.ceil(a.rad || 1); dx <= Math.ceil(a.rad || 1); dx++) if (Math.hypot(dx, dy) <= (a.rad || 1)) terrain(a, Math.floor(cx) + dx, Math.floor(cz) + dy, Math.hypot(dx, dy));
          if (a.cloud) VFX.push({ k: 'cloud', x: cx, z: cz, r: a.rad || 2, t0: now(), life: 5, col: COL[a.el] });
          if (a.wallRing) for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2; addHazard(Math.floor(cx + Math.cos(an) * (a.rad + 0.5)), Math.floor(cz + Math.sin(an) * (a.rad + 0.5)), a, 12); }
          if (a.loud) loud(Math.floor(cx), Math.floor(cz));
          if (!n) Gm.msg('«' + a.n + '» разрывается — но никого не задевает.', '#909090');
        };
        if (in3D) setTimeout(doIt, a.fall ? 380 : 260); else doIt();
        any = true;
        break;
      }
      case 'nova': {
        const px = P.posX != null ? P.posX : P.x + 0.5, pz = P.posY != null ? P.posY : P.y + 0.5;
        ringFx(px, pz, a.rad || 3, a.el, 0.7); burstFx(px, gy(px, pz) + 0.6, pz, a.el, 50, 5 + (a.rad || 3), 0.1);
        for (const e of ents()) if (Math.hypot(e.x + 0.5 - px, e.y + 0.5 - pz) <= (a.rad || 3) + 0.3) { SC.hit(e, dmg(), a, a.lifesteal ? { steal: a.lifesteal } : null); any = true; }
        if (a.heal) Gm.healPlayer(Math.round(P.mhp * a.heal));
        if (a.quake) { for (let k = 0; k < 6; k++) cavein(P.x + Math.round((Math.random() - 0.5) * 6), P.y + Math.round((Math.random() - 0.5) * 6), 0.15); }
        if (a.loud) loud(P.x, P.y);
        if (a.blinkAfter) { const h = aim(6); blinkTo(h.tx, h.ty); }
        if (!any) Gm.msg('«' + a.n + '» расходится кольцом — вокруг никого.', '#909090');
        any = true;
        break;
      }
      case 'wall': {
        const h = aim(4), cx = h.tx, cy = h.ty;
        const px = -f[1], pz = f[0];
        for (let k = -Math.floor((a.len || 5) / 2); k <= Math.floor((a.len || 5) / 2); k++) addHazard(Math.round(cx + px * k), Math.round(cy + pz * k), a, a.dur || 10);
        Gm.msg('«' + a.n + '» встаёт поперёк пути.', SCH[a.school].c);
        any = true;
        break;
      }
      case 'chain': {
        const tg = ents().filter((e) => U.dist(e.x, e.y, P.x, P.y) <= (a.r || 8) && E.FOV.los(m, P.x, P.y, e.x, e.y)).sort((p, q) => U.dist(p.x, p.y, P.x, P.y) - U.dist(q.x, q.y, P.x, P.y)).slice(0, a.cnt || 3);
        let prev = tipP();
        for (const e of tg) { const p = pos(e); beamFx(prev, p, a.el, 0.35, 0.05); SC.hit(e, dmg(), a); prev = p; any = true; }
        if (!tg.length) { const h = aim(6); beamFx(tipP(), [h.x, h.y, h.z], a.el, 0.3, 0.05); Gm.msg('Молния уходит в землю.', '#909090'); }
        break;
      }
      case 'strikes': {
        const tg = ents().filter((e) => U.dist(e.x, e.y, P.x, P.y) <= (a.r || 9)).slice(0, a.cnt || 4);
        tg.forEach((e, i) => setTimeout(() => { if (e.dead || !G.map.ents.includes(e)) return; const p = pos(e); beamFx([p[0] + (Math.random() - 0.5), p[1] + 9, p[2] + (Math.random() - 0.5)], [p[0], p[1] - 0.6, p[2]], a.el, 0.3, 0.1); burstFx(p[0], p[1] - 0.3, p[2], a.el, 18, 3, 0.08); SC.hit(e, dmg(), a); }, in3D ? i * 120 : 0));
        if (a.loud) loud(P.x, P.y);
        if (!tg.length) Gm.msg('Небо грохочет — но бить некого.', '#909090');
        any = true;
        break;
      }
      case 'orbit': {
        P.orbit = { id: a.id, el: a.el, n: a.num || 3, until: now() + (a.dur || 20), next: 0 };
        Gm.msg('«' + a.n + '» — вокруг тебя закружились сферы.', SCH[a.school].c);
        any = true;
        break;
      }
      case 'summon': {
        let n = 0;
        for (let k = 0; k < (a.num || 1); k++) { const e = Gm.spawnAlly(a.mon, a.dur || 120, P.level); if (e) { n++; const p = pos(e); burstFx(p[0], p[1], p[2], a.el, 20, 2.5, 0.08); } }
        Gm.msg(n ? '«' + a.n + '»: ' + (n > 1 ? 'они встают рядом с тобой.' : 'рядом встаёт союзник.') : 'Некуда призвать.', SCH[a.school].c);
        any = n > 0;
        break;
      }
      case 'heal': {
        Gm.healPlayer(Math.round(P.mhp * (a.pct || 0.2)));
        if (a.cleanse) for (const id of ['poison', 'bleed', 'burn', 'stun', 'slow', 'fear', 'webbed']) if (Gm.hasFx(id)) Gm.rmFx(id);
        if (a.regen) Gm.fx('regenbuff', 60);
        if (a.bless) Gm.fx('blessed', 300);
        if (a.rootAll) for (const e of ents()) if (U.dist(e.x, e.y, P.x, P.y) <= a.rootAll) Cb.entFx(e, 'webbed', 4);
        const px = P.posX != null ? P.posX : P.x + 0.5, pz = P.posY != null ? P.posY : P.y + 0.5;
        for (let i = 0; i < 30; i++) part(px + (Math.random() - 0.5) * 0.8, gy(px, pz) + Math.random() * 0.4, pz + (Math.random() - 0.5) * 0.8, 0, 1 + Math.random(), 0, 0.8, 0.06, COL[a.el], { grav: -0.3 });
        any = true;
        break;
      }
      case 'buff': {
        Gm.fx(a.e, (a.dur || 40) * 2);
        const px = P.posX != null ? P.posX : P.x + 0.5, pz = P.posY != null ? P.posY : P.y + 0.5;
        ringFx(px, pz, 1, a.el, 0.6);
        Gm.msg('«' + a.n + '».', SCH[a.school].c);
        any = true;
        break;
      }
      case 'blink': {
        const h = aim(a.r || 6);
        const ok = blinkTo(h.tx, h.ty);
        if (ok && a.novaP) { const nv = Object.assign({}, a, { form: 'nova', p: a.novaP, rad: a.rad || 2.5 }); SC.cast(nv); }
        any = ok;
        break;
      }
    }
    if (any) { SC.gainXp(a.school, 2 + a.tier); Gm.cnt('cast'); Gm.cnt('cast_' + a.school); Gm.gain('cast'); }
    // чары сорвались с посоха — дух потрачен, даже если мимо; не вышел лишь скачок, которому некуда
    return a.form === 'blink' ? any : true;
  };
  // ---------- помощники ----------
  function pushBack(e, n) {
    const P = G.P, m = G.map, dx = Math.sign(e.x - P.x), dy = Math.sign(e.y - P.y);
    for (let i = 0; i < n; i++) { const nx = e.x + dx, ny = e.y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || !TL[m.tiles[ny * m.w + nx]].walk || Gm.entAt(nx, ny)) break; Ent.move(e, nx, ny); }
  }
  function pullTo(e, x, y) { const m = G.map, dx = Math.sign(x - e.x), dy = Math.sign(y - e.y), nx = e.x + dx, ny = e.y + dy; if ((dx || dy) && nx >= 0 && ny >= 0 && nx < m.w && ny < m.h && TL[m.tiles[ny * m.w + nx]].walk && !Gm.entAt(nx, ny)) Ent.move(e, nx, ny); }
  function blinkTo(tx, ty) {
    const P = G.P, m = G.map;
    let p = null;
    for (let r = 0; r <= 2 && !p; r++) for (let dy = -r; dy <= r && !p; dy++) for (let dx = -r; dx <= r; dx++) { const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue; const t = TL[m.tiles[y * m.w + x]]; if (t.walk && !t.water && !t.lava && !t.link && !Gm.entAt(x, y) && E.FOV.los(m, P.x, P.y, x, y)) { p = [x, y]; break; } }
    if (!p) { Gm.msg('Некуда шагнуть.'); return false; }
    const a = eyeP();
    burstFx(a[0], a[1] - 0.3, a[2], 'arcane', 16, 2, 0.07);
    P.x = p[0]; P.y = p[1]; P.posX = p[0] + 0.5; P.posY = p[1] + 0.5;
    if (Gm.computeFov) Gm.computeFov();
    burstFx(p[0] + 0.5, gy(p[0] + 0.5, p[1] + 0.5) + 0.6, p[1] + 0.5, 'arcane', 16, 2, 0.07);
    return true;
  }
  // ---------- стены и опасные клетки ----------
  const HZ = SC.hazards = [];
  function addHazard(x, y, a, dur) {
    const m = G.map;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
    const t = TL[m.tiles[y * m.w + x]];
    if (!t.walk) return;
    HZ.push({ x, y, a, until: now() + dur * (RT && RT.on ? 0.5 : 1) * 2, until2: G.S.time + dur * 2, key: m.key });
    if (a.wet && t.water) Gm.setTile && Gm.setTile(x, y, T.ICE);
  }
  // каждый ход — опасные клетки бьют тех, кто на них; сферы бьют соседей
  SC.tick = function () {
    const P = G.P, m = G.map;
    if (!P || !m) return;
    const tn = now();
    for (let i = HZ.length - 1; i >= 0; i--) {
      const h = HZ[i];
      if (h.key !== m.key || G.S.time > h.until2) { HZ.splice(i, 1); continue; }
      const e = Gm.entAt(h.x, h.y);
      if (e && foe(e)) SC.hit(e, Math.max(1, power(h.a) * 0.6), h.a, { quiet: 1 });
    }
    // сферы из сохранения: часы страницы начались заново — такие уже не кружат
    if (P.orbit && P.orbit.until - tn > 60) P.orbit = null;
    const o = P.orbit;
    if (o && tn < o.until) {
      const a = D.ab[o.id];
      const near = ents().filter((e) => U.dist(e.x, e.y, P.x, P.y) <= 1.5);
      if (near.length && a) { const e = near[0]; const p = pos(e); beamFx([P.posX != null ? P.posX : P.x + 0.5, p[1], P.posY != null ? P.posY : P.y + 0.5], p, o.el, 0.2, 0.05); SC.hit(e, power(a), a, { quiet: 1 }); }
    } else if (o) P.orbit = null;
  };
  // ход мира (и по ходам, и в живом мире)
  const tk0 = Gm.tick;
  Gm.tick = function () { const r = tk0.apply(this, arguments); try { SC.tick(); } catch (err) { console.warn('schools tick', err); } return r; };
  // ---------- отзывы мира на чары ----------
  // огонь жжёт траву и деревья, иней мостит воду льдом, камень и гром ломают руду и трещины (в шахте — обвал)
  const BURN = new Set(['TREE', 'PINE', 'BUSH', 'TALLGRASS', 'REEDS', 'FERN', 'SAPLING', 'HAY'].map((k) => T[k]).filter((v) => v != null));
  function terrain(a, x, y, d) {
    const m = G.map;
    if (!m || x < 0 || y < 0 || x >= m.w || y >= m.h) return;
    const i = y * m.w + x, t = m.tiles[i], tl = TL[t];
    const strong = a.tier >= 1 || a.form === 'burst' || a.form === 'beam';
    if (a.el === 'fire' && BURN.has(t) && Math.random() < (d < 1 ? 0.8 : 0.4)) {
      const tree = t === T.TREE || t === T.PINE;
      Gm.setTile(x, y, tree ? T.DEADTREE : (T.ASH != null ? T.ASH : T.SOIL), m);
      if (tree && Math.random() < 0.6) m.items.push({ x, y: y + 1 < m.h ? y : y, it: E.Items.make('wood') });
      for (let k = 0; k < 6; k++) part(x + 0.5 + (Math.random() - 0.5) * 0.6, gy(x + 0.5, y + 0.5) + Math.random(), y + 0.5 + (Math.random() - 0.5) * 0.6, 0, 1.5, 0, 1.2, 0.09, [0.3, 0.28, 0.26], { grav: -0.5 });
      if (!SC._burnMsg || performance.now() - SC._burnMsg > 3000) { SC._burnMsg = performance.now(); Gm.msg(tree ? 'Дерево вспыхивает и чернеет.' : 'Трава занимается огнём и выгорает.', '#ffb070'); }
      Gm.cnt('burned');
    } else if (a.el === 'ice' && (t === T.WATER || t === T.SHALLOW) && strong) {
      Gm.setTile(x, y, T.ICE, m);
      if (!SC._iceMsg || performance.now() - SC._iceMsg > 3000) { SC._iceMsg = performance.now(); Gm.msg('Вода схватывается льдом — по нему можно пройти.', '#a0e0ff'); }
    } else if ((a.el === 'earth' || a.el === 'storm' || (a.el === 'fire' && a.tier >= 1) || a.el === 'arcane') && tl.ore && strong && d < 1.2) {
      Gm.setTile(x, y, T.ROCKFLOOR, m);
      m.items.push({ x, y, it: E.Items.make('iron_ore') });
      if (Math.random() < 0.08) m.items.push({ x, y, it: E.Items.make('crystal') });
      Gm.msg('Чары раскалывают жилу — руда сыплется на землю.', '#e0c090');
      if (UI.pop3d) { UI.pop3d(x, y, 'жила расколота', '#f0b080'); UI.pop3d(x, y, '+ железная руда', '#f0d8a0'); }
      Gm.cnt('ore_blasted');
      cavein(x, y, 0.35);
    } else if ((a.el === 'earth' || a.loud) && t === T.CRACKWALL && d < 1.2) {
      Gm.setTile(x, y, m.kind === 'dun' ? T.FLOOR : T.ROCKFLOOR, m);
      Gm.msg('Стена с трещиной рушится. За ней — проход.', '#e0c090');
      if (UI.pop3d) UI.pop3d(x, y, 'проход!', '#f0d8a0', true);
      cavein(x, y, 0.3);
    }
  }
  SC.terrain = terrain;
  // обвал: в шахтах и подземельях громкие дела могут обрушить свод
  function cavein(x, y, ch) {
    const m = G.map, P = G.P;
    if (!m || m.outdoor || Math.random() > ch) return false;
    const fall = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; const t = TL[m.tiles[ny * m.w + nx]]; if (t.walk && !t.link && !m.feat[ny * m.w + nx] && Math.random() < 0.35) fall.push([nx, ny]); }
    for (const [fx, fy] of fall) {
      Gm.setTile(fx, fy, T.RUBBLE, m);
      for (let k = 0; k < 5; k++) part(fx + Math.random(), gy(fx + 0.5, fy + 0.5) + 1.7 + Math.random() * 0.4, fy + Math.random(), 0, -4, 0, 0.6, 0.1, [0.5, 0.45, 0.4], { grav: 9 });
      const e = Gm.entAt(fx, fy); if (e && !e.dead) Cb.hurtEnt(e, 6 + Math.round(Math.random() * 8), null, null);
      if (fx === P.x && fy === P.y) { Gm.hurtPlayer(5 + Math.round(Math.random() * 8), 'cavein'); }
    }
    Gm.msg('Свод трещит — сверху сыплются камни! Обвал.', '#ff9060');
    if (UI.pop3d) UI.pop3d(x, y, 'Обвал!', '#ff9060', true);
    if (E.UI) { G.hitFlash = performance.now(); }
    Gm.cnt('caveins');
    loud(x, y);
    return true;
  }
  SC.cavein = cavein;
  function loud(x, y) {
    const m = G.map;
    let n = 0;
    for (const e of m.ents) if (!e.dead && e.kind === 'mon' && U.dist(e.x, e.y, x, y) <= 14) { if (e.asleep) { e.asleep = false; n++; } e.aware = true; }
    if (n && (!SC._loud || performance.now() - SC._loud > 5000)) { SC._loud = performance.now(); Gm.msg(m.outdoor ? 'Грохот разносится далеко — что-то просыпается.' : 'Грохот катится по ходам. Где-то впереди зашевелились.', '#c0a080'); }
  }
  function quakeLine(a, b) { for (let k = 0; k < 8; k++) { const t = k / 8; terrain({ el: 'earth', tier: 6, form: 'beam', loud: 1 }, Math.floor(a[0] + (b[0] - a[0]) * t), Math.floor(a[2] + (b[2] - a[2]) * t), 0); } }
  // ---------- встраивание: умения школ идут через этот код ----------
  const ua0 = Cb.useAbility;
  Cb.useAbility = function (aid, dir, isPrayer) {
    const a = isPrayer ? null : D.ab[aid];
    if (a && a.k === 'school') return SC.cast(a);
    return ua0.apply(this, arguments);
  };
  const nd0 = Cb.needsDir;
  Cb.needsDir = function (a) { if (a && a.k === 'school') return ['bolt', 'beam', 'cone', 'burst', 'wall', 'blink', 'drain', 'execute', 'multi'].includes(a.form); return nd0.apply(this, arguments); };
  // обойма посоха: «чародейская стрела» — у всякого посоха; остальные — чары твоих школ. Чужие и не по рангу — тусклые
  if (E.Loadout) {
    const LO = E.Loadout;
    const l0 = LO.list;
    LO.list = function (w) {
      const out = l0.apply(this, arguments);
      if (LO.kind(w) !== 'staff') return out;
      const res = out.filter((x) => !(x.a && x.a.staff && x.id !== 'sv_missile'));
      for (const x of res) if (x.a && x.a.k === 'school') { const why = SC.why(x.a); if (why) x.lock = why; }
      return res;
    };
    const c0 = LO.cast;
    LO.cast = function (hand) {
      const P = G.P, w = P.eq[hand], x = LO.cur(w);
      if (x && x.lock) { if (!SC._lockMsg || performance.now() - SC._lockMsg > 2500) { SC._lockMsg = performance.now(); Gm.msg('«' + x.n + '»: ' + x.lock + '.', '#c0a0a0'); } return false; }
      return c0.apply(this, arguments);
    };
  }
  // посох и жезл годятся для обоймы
  if (E.Loadout) { const k0 = E.Loadout.kind; E.Loadout.kind = function (w) { const k = k0.apply(this, arguments); if (k) return k; return w && (STAFF_TIER[w.b] != null) ? 'staff' : null; }; }
  // ---------- маг по пути — сразу в школе ----------
  const sc0 = Gm.setClass;
  Gm.setClass = function (cid) { const r = sc0.apply(this, arguments); try { if (cid === 'mage' && !(G.P.schools && Object.keys(G.P.schools).length)) { const ks = Object.keys(SCH); SC.join(ks[Math.floor(Math.random() * ks.length)], true); Gm.msg('Ты — ' + SC.title() + '. Школа: ' + SCH[G.P.school].n + '.', SCH[G.P.school].c); } } catch (e) { console.warn('school', e); } return r; };
  // ---------- башня магов: школы ----------
  const priceTier = (t) => 30 * (t + 1) * (t + 1);
  UI.schoolsScreen = function () {
    const P = G.P;
    UI.list({ title: 'Школы магии', w: 84, name: 'schools',
      header: () => 'Чтобы колдовать чары школы, надо в неё вступить. Вступление — 30 монет; ' + (P.cls === 'mage' ? 'магу по пути — бесплатно. ' : '') + 'Вторая школа — когда в первой будет ранг C. При вступлении — одно случайное заклинание ранга F.',
      items: () => Object.keys(SCH).map((s) => {
        const d = SCH[s], mem = SC.member(s), r = SC.rank(s);
        const nMem = Object.keys(P.schools || {}).length;
        const canSecond = !nMem || (P.school && SC.rank(P.school) >= 3);
        const fee = P.cls === 'mage' ? 0 : 30;
        return { t: d.n + (mem ? ' — ты ' + d.who[P.sex === 'f' ? 1 : 0] + ' ранга ' + TIERS[r] + ' (' + P.schools[s] + ' оп.)' : ' — ' + d.d), c: d.c, disabled: mem || !canSecond || nMem >= 2 || P.gold < fee, f: () => { if (mem) return 'keep'; P.gold -= fee; SC.join(s); return 'keep'; } };
      }),
    });
  };
  UI.schoolLearn = function () {
    const P = G.P;
    UI.list({ title: 'Заклинания школ', w: 96, name: 'slearn',
      header: () => 'Учит старший маг. Нужен ранг школы не ниже ранга заклинания. Посох (в руке): ' + (staffInHand() ? E.Items.name(staffInHand()) + ' — до ранга ' + TIERS[SC.staffTier(staffInHand())] : 'нет — только F') + '.',
      items: () => {
        const out = [];
        for (const s of Object.keys(P.schools || {})) for (const x of SP[s]) {
          const a = D.ab[x[0]], known = P.abil.includes(a.id), r = SC.rank(s), pr = priceTier(a.tier), sh = a.tier >= 3 ? a.tier - 2 : 0;
          if (known) continue;
          const ok = r >= a.tier && P.gold >= pr && Gm.count('mana_shard') >= sh;
          out.push({ t: '[' + TIERS[a.tier] + '] ' + a.n + ' — ' + a.d, r: Gm.money ? Gm.money(pr, true) + (sh ? ' + ' + sh + ' оск.' : '') : pr + '', c: SCH[s].c, disabled: !ok, f: () => { P.gold -= pr; if (sh) Gm.take('mana_shard', sh); Gm.learnAb(a.id); Gm.cnt('spells_learned'); Gm.msg('Ты выучиваешь «' + a.n + '».', SCH[s].c); return 'keep'; } });
        }
        if (!out.length) out.push({ t: Object.keys(P.schools || {}).length ? 'Всё, что по рангу, ты уже знаешь. Колдуй — ранг растёт.' : 'Сначала вступи в школу.', disabled: 1, f: () => 'keep' });
        return out;
      },
    });
  };
  if (UI.magetower) {
    const mt0 = UI.magetower;
    UI.magetower = function (x, y) {
      const l0 = UI.list;
      UI.list = function (o) {
        UI.list = l0;
        const it0 = o.items;
        o.items = () => { const a = (typeof it0 === 'function' ? it0() : it0).slice(); a.splice(1, 0, { t: 'Школы магии: вступить, твой ранг', c: '#f0d0ff', f: () => { UI.schoolsScreen(); return 'keep'; } }, { t: 'Учить заклинания своей школы', c: '#d0c0ff', f: () => { UI.schoolLearn(); return 'keep'; } }); return a; };
        return l0.call(this, o);
      };
      try { return mt0.apply(this, arguments); } finally { UI.list = l0; }
    };
  }
  // посохи школ продают в башнях; архимагов — редко
  if (E.Dlg && E.Dlg.SHOP && E.Dlg.SHOP.magic) E.Dlg.SHOP.magic.push('staff_fire', 'staff_ice', 'staff_storm', 'staff_stone', 'staff_light', 'staff_grave', 'staff_wild', 'staff_arcane', 'staff_bone', 'staff_crystal', 'wand');
  // в ремесле — посохи школ на верстаке
  if (E.Crafts && E.Crafts.recipes && E.Crafts.recipes.WORKBENCH) {
    const L = E.Crafts.recipes.WORKBENCH.list;
    const ess = { fire: 'h_ashbloom', ice: 'h_frost', storm: 'feather', stone: 'iron_ingot', light: 'holy_water', grave: 'bone', wild: 'h_bloodroot', arcane: 'mana_shard' };
    for (const s in ess) L.push(['staff_' + s, 1, { wood: 2, crystal: 2, mana_shard: 2, [ess[s]]: 2 }, 8]);
    L.push(['staff_archmage', 1, { wood: 2, star_metal: 1, crystal: 3, mana_shard: 5 }, 14]);
  }
  // ---------- рука: стихия кристалла ----------
  SC.orbEl = function (w) { const x = E.Loadout && E.Loadout.cur(w); return x && x.a ? x.a.el : 'arcane'; };
})(window.EOF);
