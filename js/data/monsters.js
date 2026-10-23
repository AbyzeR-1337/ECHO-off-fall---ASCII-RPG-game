'use strict';
// Существа мира. hp/a/d — на уровне 1, масштабируются опасностью.
(function (E) {
  const D = E.D;
  const M = D.mons = {};
  // id, имя, вин.падеж, символ, цвет, hp, атака, защита, уклон, скорость, опыт, теги, биомы, ИИ, глагол атаки, доп.
  function m(id, n, acc, ch, c, hp, a, d, dg, sp, xp, tags, bi, ai, v, x) {
    M[id] = Object.assign({ id, n, acc, ch, c, hp, a, d, dg, sp, xp, tags, bi, ai, v }, x || {});
  }
  const ALLW = ['plains', 'forest', 'swamp', 'tundra', 'mountain', 'coast', 'desert', 'ancient'];
  // --- звери ---
  m('hare', 'Заяц', 'зайца', 'h', '#c8b090', 4, [0, 1], 0, 30, 14, 1, ['beast', 'animal'], ['plains', 'forest', 'tundra'], 'passive', 'царапает', { drops: [['meat_raw', 0.8], ['hide', 0.2]] });
  m('deer', 'Олень', 'оленя', 'd', '#b08a5a', 14, [1, 3], 1, 15, 13, 3, ['beast', 'animal'], ['forest', 'plains', 'ancient'], 'passive', 'бодает', { drops: [['meat_raw', 1], ['hide', 0.7], ['bone', 0.3]] });
  m('boar', 'Кабан', 'кабана', 'b', '#8a6a4a', 18, [2, 5], 2, 5, 11, 6, ['beast', 'animal'], ['forest', 'plains', 'swamp'], 'melee', 'бьёт клыками', { drops: [['meat_raw', 1], ['hide', 0.6]], prov: 1 });
  m('wolf', 'Волк', 'волка', 'w', '#9a9a9a', 12, [2, 5], 1, 15, 13, 6, ['beast', 'animal'], ['forest', 'plains', 'tundra', 'ice', 'mountain'], 'pack', 'кусает', { drops: [['hide', 0.6], ['meat_raw', 0.4]] });
  m('bear', 'Медведь', 'медведя', 'B', '#8a5a3a', 34, [4, 9], 3, 5, 10, 16, ['beast', 'animal'], ['forest', 'mountain', 'tundra', 'ancient'], 'melee', 'рвёт когтями', { drops: [['meat_raw', 1], ['hide', 1]], prov: 1 });
  m('fox', 'Лиса', 'лису', 'f', '#d8763a', 7, [1, 3], 0, 25, 14, 2, ['beast', 'animal'], ['forest', 'plains', 'tundra'], 'passive', 'кусает', { drops: [['hide', 0.5]] });
  m('rat', 'Крыса', 'крысу', 'r', '#8a7a6a', 4, [1, 2], 0, 15, 12, 1, ['beast'], ['*town', 'dungeon', 'swamp'], 'melee', 'кусает');
  m('bat', 'Летучая мышь', 'летучую мышь', 'v', '#7a6a7a', 5, [1, 3], 0, 35, 16, 2, ['beast'], ['dungeon', 'mountain'], 'erratic', 'кусает');
  m('snake', 'Гадюка', 'гадюку', 's', '#7aa04a', 6, [1, 3], 0, 20, 12, 3, ['beast'], ['swamp', 'desert', 'plains'], 'melee', 'жалит', { ab: ['poison'] });
  m('spider', 'Пещерный паук', 'пещерного паука', 'S', '#6a5a7a', 14, [2, 5], 1, 15, 13, 7, ['insect'], ['dungeon', 'forest', 'ancient'], 'melee', 'жалит', { ab: ['poison', 'web'], drops: [['silk', 0.5]] });
  m('scorpion', 'Скорпион', 'скорпиона', 'x', '#c8a050', 12, [2, 5], 3, 10, 11, 7, ['insect'], ['desert'], 'melee', 'жалит', { ab: ['poison'] });
  m('crab', 'Береговой краб', 'берегового краба', 'c', '#d86a4a', 10, [1, 4], 4, 5, 9, 4, ['beast', 'water'], ['coast'], 'melee', 'щиплет', { drops: [['meat_raw', 0.5]] });
  m('croc', 'Болотный ящер', 'болотного ящера', 'L', '#5a7a3a', 28, [4, 8], 4, 5, 10, 14, ['beast', 'water'], ['swamp'], 'ambush', 'хватает пастью', { drops: [['scale_mat', 0.4], ['meat_raw', 0.7]] });
  m('frostwolf', 'Снежный волк', 'снежного волка', 'w', '#e0f0ff', 20, [3, 7], 2, 15, 13, 11, ['beast', 'animal'], ['ice', 'tundra'], 'pack', 'кусает', { drops: [['hide', 0.8]] });
  m('mammoth', 'Мамонт', 'мамонта', 'M', '#9a7a5a', 60, [6, 12], 5, 0, 9, 30, ['beast', 'animal'], ['ice', 'tundra'], 'passive', 'топчет', { drops: [['meat_raw', 1], ['hide', 1], ['bone', 1]], prov: 1 });
  m('eagle', 'Горный орёл', 'горного орла', 'e', '#c8a070', 10, [2, 5], 0, 30, 16, 6, ['beast'], ['mountain', 'sky'], 'erratic', 'клюёт', { drops: [['feather', 0.9]] });
  m('sandworm', 'Песчаный червь', 'песчаного червя', 'W', '#c8a060', 50, [5, 11], 3, 0, 9, 28, ['beast'], ['desert'], 'ambush', 'заглатывает', {});
  m('leech', 'Пиявка-кровопийца', 'пиявку-кровопийцу', 'l', '#6a3a3a', 8, [1, 3], 0, 10, 10, 3, ['beast', 'water'], ['swamp'], 'melee', 'присасывается', { ab: ['drain'] });
  // --- люди ---
  m('bandit', 'Разбойник', 'разбойника', 'b', '#c86a4a', 16, [2, 6], 2, 10, 10, 9, ['human'], ALLW, 'melee', 'бьёт', { human: 1, drops: [['gold', 0.8], ['bread', 0.3], ['knife', 0.1], ['flail', 0.05]] });
  m('archer', 'Разбойник-лучник', 'разбойника-лучника', 'a', '#c88a4a', 12, [2, 5], 1, 15, 10, 10, ['human'], ALLW, 'ranged', 'стреляет в', { human: 1, range: 7, drops: [['gold', 0.7], ['bow', 0.08]] });
  m('cultist', 'Культист', 'культиста', 'c', '#a04a8a', 14, [2, 6], 1, 10, 10, 10, ['human'], ['*cult'], 'melee', 'режет', { human: 1, ab: ['curse'], drops: [['gold', 0.5], ['candle', 0.3]] });
  m('deserter', 'Дезертир', 'дезертира', 'D', '#8a9ab0', 22, [3, 7], 4, 5, 10, 14, ['human'], ALLW, 'melee', 'рубит', { human: 1, drops: [['gold', 0.6], ['helm', 0.1], ['shortsword', 0.1]] });
  m('soldier', 'Солдат', 'солдата', 'g', '#a0a8b8', 26, [3, 8], 5, 5, 10, 16, ['human'], ['*war'], 'melee', 'рубит', { human: 1, drops: [['gold', 0.6], ['chain', 0.05], ['sword', 0.08]] });
  // --- нежить ---
  m('zombie', 'Мертвяк', 'мертвяка', 'z', '#7a9a6a', 18, [2, 6], 1, 0, 7, 8, ['undead'], ['*night', 'swamp', 'dungeon', 'ash'], 'melee', 'хватает', { drops: [['bone', 0.4]] });
  m('skeleton', 'Скелет', 'скелета', 'k', '#d8d0b8', 14, [2, 6], 2, 10, 10, 9, ['undead'], ['dungeon', 'ash', '*night'], 'melee', 'бьёт', { drops: [['bone', 0.9]] });
  m('ghoul', 'Упырь', 'упыря', 'u', '#8a6a7a', 24, [3, 8], 2, 15, 12, 15, ['undead'], ['*night', 'dungeon', 'swamp'], 'melee', 'впивается в', { ab: ['drain'] });
  m('wraith', 'Призрак', 'призрака', 'G', '#b0d0e0', 20, [3, 7], 0, 40, 12, 18, ['undead', 'spirit'], ['*night', 'ash', 'dungeon', 'spirit'], 'erratic', 'касается', { ab: ['fear'], ghost: 1, drops: [['ectoplasm', 0.5]] });
  m('drowned', 'Утопленник', 'утопленника', 'z', '#5a8aa0', 20, [3, 7], 1, 5, 8, 12, ['undead', 'water'], ['coast', 'swamp', '*night'], 'melee', 'тянет к себе', {});
  m('blackdead', 'Чёрный мертвец', 'чёрного мертвеца', 'Z', '#4a4a5a', 30, [4, 9], 3, 5, 9, 20, ['undead'], ['*blacksnow'], 'melee', 'хватает', {});
  m('barrowlord', 'Курганный владыка', 'курганного владыку', 'K', '#c0b080', 50, [5, 11], 5, 10, 10, 35, ['undead'], ['dungeon'], 'melee', 'бьёт мечом', { minLvl: 8, drops: [['gold', 1], ['ring', 0.2]] });
  // --- нечисть и чудовища ---
  m('slime', 'Слизень', 'слизня', 'j', '#7ac05a', 12, [1, 4], 0, 0, 7, 5, ['other', 'plant'], ['swamp', 'dungeon'], 'melee', 'обволакивает', { ab: ['split'] });
  m('golem', 'Каменный страж', 'каменного стража', 'O', '#9a9a8a', 45, [5, 10], 8, 0, 7, 28, ['stone'], ['mountain', 'living', 'ash', 'dungeon', 'depths'], 'melee', 'бьёт кулаком', { minLvl: 5, drops: [['crystal', 0.3], ['iron_ore', 0.5]] });
  m('imp', 'Бес', 'беса', 'i', '#e05a3a', 10, [2, 5], 1, 30, 14, 8, ['other', 'fire'], ['volcanic', 'ash', 'dungeon'], 'erratic', 'царапает', { ab: ['fire'] });
  m('salamander', 'Саламандра', 'саламандру', 'S', '#ff7a2a', 26, [3, 8], 3, 10, 11, 16, ['fire', 'beast'], ['volcanic'], 'melee', 'обжигает', { ab: ['fire'], drops: [['scale_mat', 0.4]] });
  m('ashghost', 'Пепельный дух', 'пепельного духа', 'G', '#8a8480', 22, [3, 7], 0, 35, 12, 15, ['spirit', 'fire'], ['ash', 'volcanic', '*ashrain'], 'erratic', 'обжигает', { ab: ['fire'], ghost: 1 });
  m('troll', 'Тролль', 'тролля', 'T', '#6a8a5a', 55, [6, 12], 4, 0, 9, 32, ['beast', 'stone'], ['mountain', 'forest', 'tundra', 'ancient'], 'melee', 'молотит', { ab: ['regen'], minLvl: 6, drops: [['bone', 1]] });
  m('kikimora', 'Кикимора', 'кикимору', 'q', '#7a9a7a', 18, [2, 6], 1, 25, 12, 12, ['other', 'water'], ['swamp'], 'ambush', 'царапает', { ab: ['curse'] });
  m('leshy', 'Леший', 'лешего', 'Л', '#5a7a3a', 40, [4, 9], 3, 20, 11, 26, ['other', 'plant', 'spirit'], ['forest', 'ancient'], 'erratic', 'хлещет ветвями', { ab: ['fear'], minLvl: 4 });
  m('treant', 'Древень', 'древня', 'Ҭ', '#6a5a2a', 80, [6, 13], 7, 0, 7, 45, ['plant'], ['ancient'], 'melee', 'бьёт корнями', { minLvl: 8, drops: [['wood', 1]] });
  m('harpy', 'Гарпия', 'гарпию', 'H', '#c0a0b0', 20, [3, 7], 1, 30, 14, 14, ['other'], ['sky', 'mountain', 'coast'], 'erratic', 'рвёт когтями', { drops: [['feather', 1]] });
  m('cloudling', 'Облачник', 'облачника', 'o', '#e0e8ff', 18, [2, 6], 0, 40, 15, 14, ['other', 'spirit'], ['sky'], 'erratic', 'хлещет ветром', { ghost: 1 });
  m('deepone', 'Глубинник', 'глубинника', 'D', '#3a8a9a', 34, [4, 9], 3, 10, 10, 22, ['water', 'other'], ['ocean', 'coast', 'undersea', '*ocean'], 'melee', 'бьёт', { drops: [['pearl', 0.15]] });
  m('mushroomer', 'Грибник', 'грибника', 'm', '#c07ad0', 16, [2, 6], 1, 5, 9, 10, ['plant'], ['*shroom'], 'melee', 'обдаёт спорами', { ab: ['spore'], drops: [['spores', 0.8], ['mushrooms', 0.4]] });
  m('sporelord', 'Споровик', 'споровика', 'M', '#d08ae0', 40, [4, 9], 2, 0, 8, 25, ['plant'], ['*shroom'], 'melee', 'обдаёт спорами', { ab: ['spore', 'split'] });
  m('madbeast', 'Обезумевший зверь', 'обезумевшего зверя', 'w', '#e04040', 22, [4, 8], 2, 15, 14, 12, ['beast'], ['*madness'], 'melee', 'рвёт', {});
  m('bloodwolf', 'Кровавый волк', 'кровавого волка', 'w', '#ff3030', 26, [4, 9], 2, 20, 14, 16, ['beast', 'other'], ['*bloodmoon'], 'pack', 'терзает', {});
  m('hound', 'Гончая богов', 'гончую богов', 'Г', '#ffe080', 50, [6, 12], 5, 25, 15, 40, ['god', 'other'], ['*hunt'], 'melee', 'рвёт', { minLvl: 10, drops: [['crystal', 0.5]] });
  m('golem_ice', 'Ледяной голем', 'ледяного голема', 'O', '#a0d0f0', 50, [5, 11], 7, 0, 7, 30, ['stone'], ['ice'], 'melee', 'бьёт', { ab: ['freeze'], minLvl: 6 });
  m('mimic', 'Сундук', 'сундук', '¤', '#d8a84a', 30, [4, 9], 4, 0, 10, 20, ['other'], ['dungeon'], 'ambush', 'кусает', { minLvl: 4, drops: [['gold', 1]] });
  // --- измерения ---
  m('nightmare', 'Кошмар', 'кошмар', 'N', '#8a6ab0', 30, [4, 9], 2, 25, 13, 22, ['dream', 'other'], ['dream'], 'erratic', 'шепчет тебе в ухо и бьёт', { ab: ['fear'] });
  m('dreamfish', 'Летучая рыба', 'летучую рыбу', 'f', '#c0b0ff', 10, [2, 5], 0, 40, 16, 8, ['dream'], ['dream'], 'erratic', 'хлещет хвостом');
  m('voidling', 'Пустотник', 'пустотника', '·', '#8a8ab0', 35, [5, 10], 0, 40, 12, 30, ['other'], ['void'], 'erratic', 'стирает', { ab: ['drain'] });
  m('reflection', 'Отражение', 'отражение', '@', '#d8e4f0', 30, [4, 9], 3, 15, 10, 24, ['other'], ['mirror'], 'melee', 'повторяет твой удар', {});
  m('mooncrawler', 'Лунный ползун', 'лунного ползуна', 'm', '#c8c8d0', 40, [5, 10], 4, 10, 9, 30, ['other'], ['moon'], 'melee', 'кусает', {});
  m('timewisp', 'Осколок мгновения', 'осколок мгновения', '*', '#f0d080', 25, [4, 9], 0, 45, 18, 28, ['other'], ['time'], 'erratic', 'режет', {});
  m('antibody', 'Пожиратель', 'пожирателя', 'a', '#e0a0a0', 30, [4, 9], 2, 15, 12, 24, ['other', 'beast'], ['flesh'], 'pack', 'разъедает', {});
  m('spirit', 'Неупокоенный дух', 'неупокоенного духа', 'G', '#8ad0c0', 25, [3, 8], 0, 35, 12, 18, ['spirit'], ['spirit'], 'erratic', 'холодит', { ghost: 1 });
  m('abyssal', 'Глашатай Бездны', 'глашатая Бездны', 'A', '#a03060', 60, [7, 14], 5, 15, 11, 50, ['other'], ['abyss'], 'melee', 'кричит и бьёт', { minLvl: 12 });
  m('deepcrawler', 'Слепой ползун', 'слепого ползуна', 'c', '#b0a090', 30, [4, 9], 3, 10, 10, 22, ['other', 'beast'], ['abyss', 'depths'], 'melee', 'кусает', {});
  m('seaguard', 'Страж глубин', 'стража глубин', 'P', '#3ab0b0', 40, [5, 10], 5, 10, 10, 30, ['water', 'other'], ['undersea'], 'melee', 'бьёт трезубцем', {});

  // Спутники
  m('ally_wolf', 'Твой волк', 'твоего волка', 'w', '#a0e0a0', 20, [3, 6], 2, 15, 13, 0, ['beast', 'ally'], [], 'ally', 'кусает');
  m('ally_spirit', 'Дух-хранитель', 'духа-хранителя', 'G', '#a0f0e0', 18, [3, 7], 0, 40, 12, 0, ['spirit', 'ally'], [], 'ally', 'касается');
  m('ally_bones', 'Костяной слуга', 'костяного слугу', 'k', '#e0e0b0', 22, [3, 7], 3, 5, 10, 0, ['undead', 'ally'], [], 'ally', 'бьёт');
  m('ally_shade', 'Тень', 'тень', 't', '#9a90c0', 16, [4, 8], 0, 40, 14, 0, ['other', 'ally'], [], 'ally', 'режет');
  m('ally_golem', 'Голем', 'голема', 'O', '#c0b090', 50, [5, 10], 8, 0, 8, 0, ['stone', 'ally'], [], 'ally', 'бьёт');
  m('ally_dragonling', 'Дракончик', 'дракончика', 'd', '#ff9a4a', 30, [5, 11], 3, 20, 13, 0, ['dragon', 'ally'], [], 'ally', 'обжигает');

  // Выбор существ для региона
  D.monsFor = function (biome, flags) {
    const out = [];
    for (const k in M) {
      const t = M[k];
      if (t.ai === 'ally') continue;
      let ok = false, w = 1;
      for (const b of t.bi) {
        if (b === biome) { ok = true; }
        else if (b[0] === '*') {
          const f = b.slice(1);
          if (flags[f]) { ok = true; w = f === 'night' ? 0.6 : 3; }
        }
      }
      if (ok) {
        if (t.minLvl && (flags.lvl || 1) < t.minLvl) continue;
        if (t.ai === 'passive') w *= flags.night ? 0.5 : 2.5;
        out.push([t.id, w]);
      }
    }
    return out;
  };
})(window.EOF);
