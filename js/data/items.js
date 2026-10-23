'use strict';
// Предметы: базовые типы, материалы, уникальные предметы, артефакты.
(function (E) {
  const U = E.U, D = E.D;

  // t: weapon armor food potion mat tool book trinket misc art; s: hand body head trinket
  const B = D.items = {};
  function it(id, n, g, t, o) { B[id] = Object.assign({ id, n, g, t, w: 1, v: 1, d: '' }, o); }

  // ---- оружие ----
  it('knife', 'Нож', 'm', 'weapon', { s: 'hand', w: 1, dmg: [1, 3], v: 6, wear: 60, stat: 'dex', d: 'Обычный нож. Режет хлеб и верёвки.' });
  it('dagger', 'Кинжал', 'm', 'weapon', { s: 'hand', w: 1, dmg: [2, 5], v: 22, wear: 70, stat: 'dex', crit: 6, d: 'Узкий клинок. Легко прячется в рукаве.' });
  it('shortsword', 'Короткий меч', 'm', 'weapon', { s: 'hand', w: 2, dmg: [3, 6], v: 38, wear: 90, stat: 'str', d: 'Надёжный и простой.' });
  it('sword', 'Меч', 'm', 'weapon', { s: 'hand', w: 3, dmg: [4, 8], v: 65, wear: 120, stat: 'str', d: 'Хорошо сбалансирован.' });
  it('longsword', 'Длинный меч', 'm', 'weapon', { s: 'hand', w: 5, dmg: [5, 11], v: 115, wear: 140, stat: 'str', d: 'Требует обеих рук и крепкой спины.' });
  it('axe', 'Топор', 'm', 'weapon', { s: 'hand', w: 3, dmg: [3, 8], v: 30, wear: 100, stat: 'str', tool: 'axe', d: 'Им рубят дрова. И не только.' });
  it('waraxe', 'Секира', 'f', 'weapon', { s: 'hand', w: 6, dmg: [6, 12], v: 125, wear: 130, stat: 'str', d: 'Тяжёлое широкое лезвие.' });
  it('mace', 'Булава', 'f', 'weapon', { s: 'hand', w: 4, dmg: [4, 9], v: 55, wear: 150, stat: 'str', vs: { undead: 1.3, stone: 1.3 }, d: 'Дробит кость и камень.' });
  it('spear', 'Копьё', 'n', 'weapon', { s: 'hand', w: 4, dmg: [4, 9], v: 45, wear: 100, stat: 'str', d: 'Держит врага на расстоянии.' });
  it('staff', 'Посох', 'm', 'weapon', { s: 'hand', w: 3, dmg: [2, 5], v: 25, wear: 120, stat: 'int', spell: 1.2, d: 'Посох из прямого дерева.' });
  it('warhammer', 'Боевой молот', 'm', 'weapon', { s: 'hand', w: 7, dmg: [6, 13], v: 135, wear: 160, stat: 'str', vs: { stone: 1.5 }, d: 'Оружие для тех, кто не спешит.' });
  it('club', 'Дубина', 'f', 'weapon', { s: 'hand', w: 3, dmg: [2, 6], v: 4, wear: 60, stat: 'str', d: 'Сучковатая палка.' });
  it('sickle', 'Серп', 'm', 'weapon', { s: 'hand', w: 1, dmg: [2, 4], v: 8, wear: 70, stat: 'dex', tool: 'herb', d: 'Им жнут колосья.' });
  it('scythe', 'Коса', 'f', 'weapon', { s: 'hand', w: 4, dmg: [3, 9], v: 22, wear: 80, stat: 'str', d: 'Длинное изогнутое лезвие.' });
  it('flail', 'Кистень', 'm', 'weapon', { s: 'hand', w: 3, dmg: [3, 8], v: 40, wear: 90, stat: 'str', d: 'Гиря на цепи. Любимое оружие разбойников.' });
  it('bow', 'Лук', 'm', 'weapon', { s: 'hand', w: 2, dmg: [2, 6], v: 40, wear: 100, stat: 'dex', range: 8, d: 'Тисовый лук. Стрелы ты мастеришь сам.' });
  it('sling', 'Праща', 'f', 'weapon', { s: 'hand', w: 1, dmg: [1, 4], v: 8, wear: 60, stat: 'dex', range: 6, d: 'Ремень и горсть камней.' });
  it('crossbow', 'Арбалет', 'm', 'weapon', { s: 'hand', w: 5, dmg: [5, 10], v: 125, wear: 110, stat: 'dex', range: 9, d: 'Тяжёлый, но бьёт насквозь.' });
  it('old_hammer', 'Старый молот', 'm', 'weapon', { s: 'hand', w: 4, dmg: [0, 1], v: 1, wear: 9999, stat: 'str', d: 'Рукоять потрескалась. Боёк сточен почти до основания.' });
  it('pickaxe', 'Кирка', 'f', 'weapon', { s: 'hand', w: 5, dmg: [2, 6], v: 25, wear: 120, stat: 'str', tool: 'pick', d: 'Для камня и руды.' });
  it('shovel', 'Лопата', 'f', 'weapon', { s: 'hand', w: 4, dmg: [1, 4], v: 12, wear: 120, stat: 'str', tool: 'dig', d: 'Копать землю. Иногда — могилы.' });
  it('rod', 'Удочка', 'f', 'tool', { w: 1, v: 10, tool: 'fish', d: 'Леска из конского волоса, костяной крючок.' });

  // ---- броня ----
  it('rags', 'Поношенная одежда', 'f', 'armor', { s: 'body', w: 2, def: 0, v: 1, wear: 80, d: 'Видала лучшие дни.' });
  it('tunic', 'Льняная рубаха', 'f', 'armor', { s: 'body', w: 1, def: 0, v: 6, wear: 60, d: 'Простая и чистая.' });
  it('leather', 'Кожаная куртка', 'f', 'armor', { s: 'body', w: 4, def: 2, v: 35, wear: 120, d: 'Пахнет дубильней.' });
  it('gambeson', 'Стёганка', 'f', 'armor', { s: 'body', w: 5, def: 2, v: 30, wear: 120, warm: 1, d: 'Толстая, тёплая, неуклюжая.' });
  it('chain', 'Кольчуга', 'f', 'armor', { s: 'body', w: 9, def: 4, v: 125, wear: 200, d: 'Тысячи колец. Звенит при ходьбе.' });
  it('scale', 'Чешуйчатый доспех', 'm', 'armor', { s: 'body', w: 11, def: 5, v: 165, wear: 220, d: 'Пластины внахлёст, как у рыбы.' });
  it('plate', 'Латы', 'p', 'armor', { s: 'body', w: 15, def: 7, v: 310, wear: 260, d: 'Целое состояние из стали.' });
  it('furcoat', 'Меховой тулуп', 'm', 'armor', { s: 'body', w: 5, def: 1, v: 40, wear: 120, warm: 2, d: 'Тёплый. Очень тёплый.' });
  it('robe', 'Ряса', 'f', 'armor', { s: 'body', w: 2, def: 1, v: 20, wear: 80, mods: { fai: 1 }, d: 'Грубая ткань, пропахшая ладаном.' });
  it('cloak', 'Дорожный плащ', 'm', 'armor', { s: 'body', w: 2, def: 1, v: 18, wear: 90, warm: 1, d: 'Защищает от ветра и чужих взглядов.' });
  it('hood', 'Капюшон', 'm', 'armor', { s: 'head', w: 1, def: 0, v: 5, wear: 60, d: 'Простой суконный капюшон.' });
  it('furhat', 'Меховая шапка', 'f', 'armor', { s: 'head', w: 1, def: 1, v: 15, wear: 80, warm: 1, d: 'Уши не мёрзнут.' });
  it('helm', 'Шлем', 'm', 'armor', { s: 'head', w: 3, def: 2, v: 45, wear: 150, d: 'Видавший виды шлем.' });
  it('greathelm', 'Глухой шлем', 'm', 'armor', { s: 'head', w: 5, def: 3, v: 95, wear: 180, d: 'Мир сужается до щели.' });
  it('ring', 'Кольцо', 'n', 'trinket', { s: 'trinket', w: 0.1, v: 30, d: 'Простое кольцо.' });
  it('amulet', 'Амулет', 'm', 'trinket', { s: 'trinket', w: 0.2, v: 35, d: 'Подвеска на шнурке.' });
  it('charm', 'Оберег', 'm', 'trinket', { s: 'trinket', w: 0.2, v: 10, mods: { luck: 1 }, d: 'Деревянная фигурка на нитке.' });

  // ---- еда ----
  const food = (id, n, g, f, v, o) => it(id, n, g, 'food', Object.assign({ w: 0.5, v, food: f, st: 1 }, o));
  food('bread', 'Хлеб', 'm', 35, 3, { d: 'Краюха ржаного хлеба.' });
  food('rusk', 'Сухари', 'p', 20, 2, { w: 0.3, d: 'Не портятся. Почти.' });
  food('fish_raw', 'Сырая рыба', 'f', 8, 2, { cook: 'fish_cooked', raw: 1, d: 'Скользкая и холодная.' });
  food('fish_cooked', 'Жареная рыба', 'f', 30, 5, { d: 'Пахнет дымом.' });
  food('meat_raw', 'Сырое мясо', 'n', 8, 3, { cook: 'meat_cooked', raw: 1, d: 'Сырое. Лучше приготовить.' });
  food('meat_cooked', 'Жареное мясо', 'n', 40, 7, { d: 'Сочное, с корочкой.' });
  food('berries', 'Ягоды', 'p', 8, 1, { w: 0.2, d: 'Горсть лесных ягод.' });
  food('mushrooms', 'Грибы', 'p', 10, 2, { w: 0.3, shroom: 1, d: 'Какие-то грибы. Вроде съедобные.' });
  food('apple', 'Яблоко', 'n', 12, 1, { w: 0.3, d: 'Кислое.' });
  food('cheese', 'Сыр', 'm', 25, 6, { d: 'Головка козьего сыра.' });
  food('stew', 'Похлёбка', 'f', 45, 6, { heal: 6, d: 'Горячая, густая.' });
  food('honey', 'Мёд', 'm', 15, 8, { d: 'Тягучий, тёмный.' });
  food('ale', 'Эль', 'm', 4, 3, { drink: 1, d: 'Кружка мутного эля.' });
  food('pie', 'Пирог', 'm', 40, 8, { d: 'С капустой. Ещё тёплый.' });
  food('star_jelly', 'Звёздный студень', 'm', 20, 40, { d: 'Мерцает. Холодный на вкус.' });

  // ---- зелья ----
  const pot = (id, n, g, v, o) => it(id, n, g, 'potion', Object.assign({ w: 0.4, v, st: 1 }, o));
  pot('p_heal', 'Зелье лечения', 'n', 30, { heal: 35, d: 'Красная густая жидкость.' });
  pot('p_spirit', 'Зелье духа', 'n', 35, { mp: 25, d: 'Синее, слегка светится.' });
  pot('p_antidote', 'Противоядие', 'n', 20, { cure: 'poison', d: 'Горькое до слёз.' });
  pot('p_night', 'Зелье ночного зрения', 'n', 30, { eff: 'nighteye', dur: 720, d: 'Чёрное, как зрачок.' });
  pot('p_breath', 'Зелье жабр', 'n', 45, { eff: 'gills', dur: 180, d: 'Солёное и холодное.' });
  pot('p_str', 'Эликсир силы', 'm', 50, { eff: 'might', dur: 120, d: 'Вязкий, как смола.' });
  pot('p_warm', 'Огненная настойка', 'f', 25, { eff: 'warmth', dur: 480, d: 'Обжигает горло.' });
  pot('p_sleep', 'Сонное зелье', 'n', 25, { eff: 'drowsy', dur: 600, d: 'Пахнет маком.' });
  pot('p_sludge', 'Мутная жижа', 'f', 1, { sludge: 1, d: 'Лучше не пробовать. Хотя...' });
  pot('holy_water', 'Святая вода', 'f', 40, { heal: 15, holy: 1, d: 'Прозрачная. Чуть звенит.' });
  pot('p_fire', 'Огненная смесь', 'f', 35, { bomb: 'fire', d: 'Колба с горючей смесью. Бросать.' });
  pot('p_acid', 'Едкая смесь', 'f', 30, { bomb: 'acid', d: 'Разъедает пробку.' });

  // ---- материалы ----
  const mat = (id, n, g, v, o) => it(id, n, g, 'mat', Object.assign({ w: 0.3, v, st: 1 }, o));
  mat('iron_ore', 'Железная руда', 'f', 6, { w: 3, d: 'Рыжеватый тяжёлый камень.' });
  mat('star_metal', 'Звёздный металл', 'm', 220, { w: 2, d: 'Холодный. Не ржавеет.' });
  mat('hide', 'Шкура', 'f', 8, { w: 2, d: 'Сырая шкура.' });
  mat('bone', 'Кость', 'f', 1, { w: 0.5, d: 'Чья-то кость.' });
  mat('crystal', 'Кристалл', 'm', 40, { d: 'Внутри будто застыл свет.' });
  mat('wood', 'Полено', 'n', 1, { w: 2, d: 'Сухое полено.' });
  mat('pearl', 'Жемчужина', 'f', 60, { w: 0.1, d: 'Перламутровая, чуть розовая.' });
  mat('feather', 'Перо', 'n', 1, { w: 0.05, d: 'Птичье перо.' });
  mat('salt', 'Соль', 'f', 4, { d: 'Мешочек крупной соли.' });
  mat('spores', 'Споры', 'p', 2, { w: 0.1, d: 'Фиолетовая пыль. Щекочет нос.' });
  mat('ashpile', 'Горсть пепла', 'f', 0, { w: 0.1, d: 'Серый пепел.' });
  mat('silk', 'Паучий шёлк', 'm', 12, { w: 0.1, d: 'Липкий и прочный.' });
  mat('scale_mat', 'Чешуя', 'f', 25, { w: 0.5, d: 'Твёрдая, как камень.' });
  mat('ectoplasm', 'Призрачная слизь', 'f', 30, { w: 0.1, d: 'Холодная. Испаряется на свету.' });
  const herb = (id, n, g, v, d) => mat(id, n, g, v, { herb: 1, w: 0.1, d });
  herb('h_plantain', 'Подорожник', 'm', 2, 'Широкий лист. Им прикладывают раны.');
  herb('h_wormwood', 'Полынь', 'f', 3, 'Горькая, серебристая.');
  herb('h_mandrake', 'Корень мандрагоры', 'm', 25, 'Похож на маленького человечка.');
  herb('h_moonwort', 'Лунник', 'm', 15, 'Цветёт только ночью.');
  herb('h_bloodroot', 'Кровохлёбка', 'f', 6, 'Тёмно-красные соцветия.');
  herb('h_ashbloom', 'Пепельник', 'm', 12, 'Растёт на остывшей лаве.');
  herb('h_frost', 'Морозник', 'm', 10, 'Ледяной на ощупь.');
  herb('h_saltmoss', 'Солемох', 'm', 8, 'Растёт на прибрежных камнях.');
  herb('h_sundew', 'Росянка', 'f', 9, 'Липкие красные ворсинки.');
  herb('h_sage', 'Шалфей', 'm', 4, 'Пахнет летом.');

  // ---- инструменты ----
  it('torch', 'Факел', 'm', 'tool', { w: 1, v: 2, st: 1, light: 480, d: 'Пропитан смолой.' });
  it('rope', 'Верёвка', 'f', 'tool', { w: 2, v: 4, d: 'Пеньковая, крепкая.' });
  it('boat', 'Лодка', 'f', 'tool', { w: 20, v: 120, boat: 1, d: 'Лёгкая долблёнка. Таскать — мука.' });
  it('mortar', 'Ступка', 'f', 'tool', { w: 2, v: 20, tool: 'alch', d: 'Каменная ступка с пестиком.' });
  it('flint', 'Огниво', 'n', 'tool', { w: 0.3, v: 5, tool: 'fire', d: 'Кремень и кресало.' });
  it('powder', 'Бочонок пороха', 'm', 'tool', { w: 6, v: 90, powder: 1, d: 'Не держать у огня.' });
  it('lute', 'Лютня', 'f', 'tool', { w: 3, v: 60, music: 1, d: 'Пять струн. Одна фальшивит.' });
  it('flute', 'Деревянная флейта', 'f', 'tool', { w: 0.3, v: 6, music: 1, d: 'Вырезана чьей-то неумелой рукой.' });
  it('bedroll', 'Скатка', 'f', 'tool', { w: 3, v: 15, bedroll: 1, d: 'Одеяло и кусок кожи.' });
  it('book', 'Книга', 'f', 'book', { w: 1, v: 15, d: 'Потрёпанный переплёт.' });

  // ---- странные вещи (секреты) ----
  it('old_mug', 'Старая кружка', 'f', 'misc', { w: 0.5, v: 1, cont: 1, d: 'Долго сохраняет тепло.' });
  it('holy_vessel', 'Священный сосуд', 'm', 'misc', { w: 0.5, v: 500, cont: 1, d: 'Тёплая. Вода в ней не кончается.' });
  it('temple_stone', 'Камень', 'm', 'misc', { w: 0.5, v: 0, d: 'Приятно держать в руке.' });
  it('broken_clock', 'Сломанные часы', 'p', 'misc', { w: 0.3, v: 3, d: 'Стрелки замерли на трёх часах и семнадцати минутах.' });
  it('rusty_key', 'Ржавый ключ', 'm', 'misc', { w: 0.1, v: 0, d: 'Ни к одной двери в округе не подходит.' });
  it('blank_book', 'Пустая книга', 'f', 'misc', { w: 1, v: 2, d: 'Ни одной буквы. Страницы пахнут пылью.' });
  it('owl_feather', 'Совиное перо', 'n', 'misc', { w: 0.05, v: 1, d: 'Мягкое. Почти невесомое.' });
  it('doll', 'Тряпичная кукла', 'f', 'misc', { w: 0.3, v: 0, d: 'Один глаз-пуговица оторван.' });
  it('holed_coin', 'Монета с дырой', 'f', 'misc', { w: 0.05, v: 1, d: 'Старая, не местная. Посередине пробита дыра.' });
  it('mirror_shard', 'Осколок зеркала', 'm', 'misc', { w: 0.1, v: 1, d: 'В нём отражается что-то чуть-чуть не то.' });
  it('seed', 'Странное семечко', 'n', 'misc', { w: 0.05, v: 1, d: 'Твёрдое, как камень. И тёплое.' });
  it('shell', 'Ракушка', 'f', 'misc', { w: 0.1, v: 1, d: 'Если приложить к уху — шумит.' });
  it('bell', 'Колокольчик', 'm', 'misc', { w: 0.1, v: 3, d: 'Без язычка. Не звенит.' });
  it('candle', 'Огарок свечи', 'm', 'misc', { w: 0.1, v: 1, d: 'Фитиль почти догорел.' });
  it('letter', 'Запечатанное письмо', 'n', 'misc', { w: 0.05, v: 0, d: 'Сургуч цел.' });
  it('empty_bottle', 'Пустая бутылка', 'f', 'misc', { w: 0.3, v: 1, cont: 1, d: 'Стекло мутное.' });
  it('soul_bottle', 'Бутылка с туманом', 'f', 'misc', { w: 0.3, v: 5, d: 'Внутри что-то шевелится.' });
  it('signet', 'Перстень с печатью', 'm', 'trinket', { s: 'trinket', w: 0.1, v: 80, d: 'На печати — корона и сломанный меч.' });
  it('star_shard', 'Осколок звезды', 'm', 'misc', { w: 1, v: 150, light: 1, d: 'Тёплый. Светится изнутри.' });
  it('dragon_egg', 'Тёплое яйцо', 'n', 'misc', { w: 8, v: 500, d: 'Тяжёлое. Иногда вздрагивает.' });
  it('mask', 'Маска без лица', 'f', 'armor', { s: 'head', w: 0.3, def: 0, v: 3, wear: 9999, d: 'Гладкая, белая. Без прорезей для глаз.' });
  it('compass', 'Компас без стрелки', 'm', 'misc', { w: 0.2, v: 2, d: 'Корпус пуст. Но иногда руку будто тянет.' });
  it('skull', 'Череп', 'm', 'misc', { w: 1, v: 1, d: 'Чей-то.' });
  it('map_scrap', 'Обрывок карты', 'm', 'misc', { w: 0.05, v: 1, d: 'Нарисован берег, которого ты не помнишь.' });
  it('lost_page', 'Обгоревшая страница', 'f', 'misc', { w: 0.05, v: 2, st: 1, d: 'Буквы едва различимы.' });
  it('spore_heart', 'Сердцевина грибницы', 'f', 'misc', { w: 1, v: 60, d: 'Пульсирует.' });
  it('heir_sword', 'Меч Сломанной Короны', 'm', 'weapon', { s: 'hand', w: 4, dmg: [7, 13], v: 400, wear: 400, stat: 'str', d: 'На клинке выбиты имена королей. Последнее стёрто.' });
  it('lamp_oil', 'Лампадное масло', 'n', 'misc', { w: 0.5, v: 8, st: 1, d: 'Для лампад и маяков.' });
  it('cure', 'Лекарство от мора', 'n', 'potion', { w: 0.4, v: 80, st: 1, plague: 1, d: 'Пахнет полынью и железом.' });
  it('king_letter', 'Королевский указ', 'm', 'misc', { w: 0.05, v: 0, d: 'Печать сломана.' });
  it('fish_gold', 'Золотая рыбка', 'f', 'misc', { w: 0.3, v: 300, d: 'Бьётся в ладонях и не умирает.' });
  it('moon_pearl', 'Лунная жемчужина', 'f', 'misc', { w: 0.1, v: 400, d: 'Холодная, как ночь.' });
  it('abyss_note', 'Нота Бездны', 'f', 'misc', { w: 0, v: 0, d: 'Звук, который можно держать в руке.' });

  // ---- артефакты ----
  const art = (id, n, g, o) => it(id, n, g, o.t || 'art', Object.assign({ art: 1, w: 2, v: 2000, wear: 99999 }, o));
  art('a_dawnblade', 'Клинок Последнего Рассвета', 'm', { t: 'weapon', s: 'hand', dmg: [12, 20], stat: 'str', d: 'Лезвие цвета зари. Тяжелее, чем кажется.' });
  art('a_nightstaff', 'Посох Тысячи Ночей', 'm', { t: 'weapon', s: 'hand', dmg: [3, 6], stat: 'int', spell: 1.5, d: 'Чёрное дерево, гладкое от чужих рук.' });
  art('a_moonsickle', 'Лунный Серп', 'm', { t: 'weapon', s: 'hand', dmg: [1, 2], stat: 'dex', d: 'Тонкий, почти прозрачный.' });
  art('a_stormcloak', 'Плащ Бурь', 'm', { t: 'armor', s: 'body', def: 2, w: 4, d: 'Ткань всегда чуть влажная.' });
  art('a_tidetrident', 'Трезубец Отлива', 'm', { t: 'weapon', s: 'hand', dmg: [5, 9], stat: 'str', d: 'Зубцы покрыты солью.' });
  art('a_spiteblade', 'Меч Обиды', 'm', { t: 'weapon', s: 'hand', dmg: [16, 26], stat: 'str', d: 'Рукоять неприятно колет ладонь.' });
  art('a_crown', 'Корона Безымянного', 'f', { t: 'armor', s: 'head', def: 3, w: 1, d: 'Тонкий обруч без камней.' });
  art('a_golem_heart', 'Сердце Голема', 'n', { t: 'trinket', s: 'trinket', w: 6, d: 'Камень, который бьётся.' });
  art('a_tear', 'Слеза Богини', 'f', { t: 'trinket', s: 'trinket', w: 0.1, d: 'Капля, которая не высыхает.' });
  art('a_mirrorshield', 'Зеркальный Щит', 'm', { t: 'trinket', s: 'trinket', w: 5, d: 'В нём ты выглядишь увереннее.' });
  art('a_gauntlet', 'Голодная Перчатка', 'f', { t: 'trinket', s: 'trinket', w: 1, d: 'Кожа на пальцах шевелится.' });
  art('a_voidlantern', 'Фонарь Пустоты', 'm', { t: 'trinket', s: 'trinket', w: 1, d: 'Светит чем-то, что не похоже на свет.' });
  art('a_memring', 'Кольцо Чужой Памяти', 'n', { t: 'trinket', s: 'trinket', w: 0.1, d: 'Внутри выгравировано чужое имя. Каждый раз — другое.' });
  art('a_hourglass', 'Песочные часы без песка', 'p', { t: 'trinket', s: 'trinket', w: 0.5, d: 'Колбы пусты. Но что-то в них течёт.' });
  art('a_deadbell', 'Колокол Мёртвых', 'm', { t: 'trinket', s: 'trinket', w: 3, d: 'Медный, позеленевший. Язычок — из кости.' });
  art('a_dragonbone', 'Кость Первого Дракона', 'f', { t: 'weapon', s: 'hand', dmg: [10, 18], stat: 'str', w: 6, d: 'Горячая. Всегда горячая.' });
  art('a_blindeye', 'Око Слепого Бога', 'n', { t: 'trinket', s: 'trinket', w: 0.2, d: 'Мутный шар. Смотрит.' });
  art('a_frostheart', 'Ледяное Сердце', 'n', { t: 'trinket', s: 'trinket', w: 1, d: 'Изморозь на пальцах не тает.' });
  art('a_whisper', 'Кинжал Шёпота', 'm', { t: 'weapon', s: 'hand', dmg: [6, 10], stat: 'dex', crit: 25, w: 1, d: 'Если прислушаться — он что-то говорит.' });
  art('a_sunspear', 'Копьё Полудня', 'n', { t: 'weapon', s: 'hand', dmg: [8, 14], stat: 'str', w: 5, d: 'Наконечник тёплый даже в снегу.' });
  art('a_rootcrown', 'Венец Корней', 'm', { t: 'armor', s: 'head', def: 2, w: 1, d: 'Живые корни сплелись в обруч.' });
  art('a_graveshovel', 'Лопата Могильщика', 'f', { t: 'weapon', s: 'hand', dmg: [4, 8], stat: 'str', w: 4, tool: 'dig', d: 'Черенок отполирован до блеска.' });
  art('a_starheart', 'Сердце Падшей Звезды', 'n', { t: 'trinket', s: 'trinket', w: 1, d: 'Пульсирует светом.' });
  art('a_echo', 'Эхо', 'n', { t: 'trinket', s: 'trinket', w: 0, d: 'Ничего не делает.' });
  art('a_oathring', 'Кольцо Клятвы', 'n', { t: 'trinket', s: 'trinket', w: 0.1, d: 'Тяжёлое для своего размера.' });

  // ---- материалы уникальных предметов ----
  // gen — родительный падеж; dm/df/wm/vm — множители; tag — особенность
  D.materials = [
    { id: 'iron', gen: 'железа', dm: 1, df: 1, wm: 1, vm: 1, for: 'wa' },
    { id: 'bog', gen: 'болотного железа', dm: 0.95, df: 0.95, wm: 1.1, vm: 0.8, for: 'wa' },
    { id: 'steel', gen: 'стали', dm: 1.2, df: 1.2, wm: 1, vm: 1.6, for: 'wa' },
    { id: 'ashsteel', gen: 'пепельной стали', dm: 1.35, df: 1.3, wm: 0.9, vm: 2.5, for: 'wa' },
    { id: 'bronze', gen: 'бронзы', dm: 0.9, df: 0.9, wm: 1.1, vm: 1, for: 'wat' },
    { id: 'copper', gen: 'меди', dm: 0.8, df: 0.8, wm: 1.1, vm: 0.9, for: 'wat' },
    { id: 'silver', gen: 'серебра', dm: 1, df: 0.9, wm: 1, vm: 3, vs: { undead: 1.5, spirit: 1.4 }, for: 'wat' },
    { id: 'gold', gen: 'тусклого золота', dm: 0.7, df: 0.7, wm: 1.4, vm: 5, for: 'at' },
    { id: 'bone', gen: 'кости', dm: 0.85, df: 0.8, wm: 0.7, vm: 0.7, for: 'wat' },
    { id: 'obsidian', gen: 'обсидиана', dm: 1.4, df: 0.6, wm: 0.9, vm: 2, for: 'wt' },
    { id: 'star', gen: 'звёздного металла', dm: 1.6, df: 1.6, wm: 0.6, vm: 8, vs: { other: 1.5 }, for: 'wat' },
    { id: 'oak', gen: 'морёного дуба', dm: 0.8, df: 0.8, wm: 0.9, vm: 0.8, for: 'wt' },
    { id: 'ash_wood', gen: 'ясеня', dm: 0.85, df: 0.8, wm: 0.8, vm: 0.8, for: 'wt' },
    { id: 'ebony', gen: 'чёрного дерева', dm: 1.1, df: 1, wm: 0.9, vm: 2, for: 'wt' },
    { id: 'amber', gen: 'янтаря', dm: 0.5, df: 0.5, wm: 0.5, vm: 2.5, for: 't' },
    { id: 'coral', gen: 'коралла', dm: 0.9, df: 0.9, wm: 0.8, vm: 2, vs: { water: 1.4 }, for: 'wat' },
    { id: 'moonstone', gen: 'лунного камня', dm: 1, df: 1, wm: 0.8, vm: 4, night: 1.3, for: 'at' },
    { id: 'horn', gen: 'рога', dm: 0.9, df: 0.9, wm: 0.8, vm: 0.9, for: 'wt' },
    { id: 'leather', gen: 'дублёной кожи', dm: 0.7, df: 0.9, wm: 0.7, vm: 0.8, for: 'a' },
    { id: 'dragonscale', gen: 'драконьей чешуи', dm: 1.5, df: 1.8, wm: 0.8, vm: 9, vs: { fire: 1.5 }, for: 'wa' },
    { id: 'glass', gen: 'вулканического стекла', dm: 1.5, df: 0.5, wm: 0.7, vm: 2, for: 'wt' },
    { id: 'whalebone', gen: 'китового уса', dm: 0.9, df: 1, wm: 0.7, vm: 1.5, for: 'wat' },
    { id: 'wyrdwood', gen: 'дерева-шептуна', dm: 1.1, df: 1, wm: 0.6, vm: 3, spell: 1.3, for: 'wt' },
    { id: 'saltiron', gen: 'солёного железа', dm: 1.05, df: 1.05, wm: 1, vm: 1.2, vs: { water: 1.3 }, for: 'wa' },
  ];
  // дополнительные «мелочи» для уникальных
  it('comb', 'Гребень', 'm', 'trinket', { s: 'trinket', w: 0.1, v: 6, d: 'Кто-то расчёсывал им волосы.' });
  it('beads', 'Чётки', 'p', 'trinket', { s: 'trinket', w: 0.1, v: 8, mods: { fai: 1 }, d: 'Бусины стёрты пальцами.' });
  it('dice', 'Игральные кости', 'p', 'trinket', { s: 'trinket', w: 0.05, v: 5, mods: { luck: 1 }, d: 'Одна грань стёрта.' });
  it('handmirror', 'Зеркальце', 'n', 'trinket', { s: 'trinket', w: 0.2, v: 12, d: 'Маленькое, в оправе.' });
  it('medallion', 'Медальон', 'm', 'trinket', { s: 'trinket', w: 0.2, v: 25, d: 'Открывается. Внутри пусто.' });
  it('brooch', 'Брошь', 'f', 'trinket', { s: 'trinket', w: 0.1, v: 20, d: 'Застёжка для плаща.' });
  it('cup', 'Чаша', 'f', 'misc', { w: 0.5, v: 10, cont: 1, d: 'Из неё пили по праздникам.' });
  it('horn_cup', 'Рог', 'm', 'misc', { w: 0.5, v: 12, cont: 1, d: 'Питьевой рог с резьбой.' });
  it('spoon', 'Ложка', 'f', 'misc', { w: 0.1, v: 2, d: 'Деревянная ложка.' });
  it('pipe', 'Трубка', 'f', 'misc', { w: 0.1, v: 4, d: 'Пахнет табаком.' });
  it('whistle', 'Свисток', 'm', 'misc', { w: 0.05, v: 3, d: 'Свистит тонко и противно.' });
  it('figurine', 'Фигурка', 'f', 'misc', { w: 0.3, v: 9, d: 'Кто-то вырезал её долгими вечерами.' });
  it('bracelet', 'Браслет', 'm', 'trinket', { s: 'trinket', w: 0.1, v: 18, d: 'Плетёный.' });

  D.uniqueBases = {
    w: ['knife', 'dagger', 'shortsword', 'sword', 'longsword', 'axe', 'waraxe', 'mace', 'spear', 'staff', 'warhammer', 'flail', 'sickle', 'scythe', 'bow', 'crossbow', 'club'],
    a: ['leather', 'gambeson', 'chain', 'scale', 'plate', 'cloak', 'furcoat', 'robe', 'helm', 'greathelm', 'hood', 'furhat'],
    t: ['ring', 'amulet', 'charm', 'comb', 'beads', 'dice', 'handmirror', 'medallion', 'brooch', 'bracelet'],
    m: ['cup', 'horn_cup', 'spoon', 'pipe', 'whistle', 'figurine', 'flute', 'lute'],
  };
  D.epithets = ['Последний Довод', 'Вдовий Плач', 'Тихий Ответ', 'Седьмой Сын', 'Ранняя Седина', 'Долгая Зима', 'Слово Отца', 'Сломанная Клятва',
    'Добрый Сосед', 'Утренняя Роса', 'Красная Нить', 'Чужая Удача', 'Колыбельная', 'Лишний Шаг', 'Горький Мёд', 'Старый Долг', 'Немой Свидетель',
    'Пятый Гость', 'Ржавая Песня', 'Обещание', 'Сон Наяву', 'Без Имени', 'Тёплая Ладонь', 'Нищий Принц', 'Холодный Чай', 'Третий Петух',
    'Двойное Дно', 'Ночной Звонарь', 'Пустой Колодец', 'Медвежья Услуга', 'Чёрная Метка', 'Белая Ворона', 'Кривое Зеркало', 'Вечерний Звон',
    'Лунный Зайчик', 'Вторая Попытка', 'Последний Ужин', 'Цепной Пёс', 'Сухая Ветка', 'Соль Земли', 'Терпение', 'Упрямец', 'Забвение', 'Гроза',
    'Шёпот', 'Предчувствие', 'Поздняя Весна', 'Злая Память', 'Свеча на Ветру', 'Серый Кот'];
  D.uniqueAdj = ['Скорбный', 'Верный', 'Кроткий', 'Безумный', 'Проклятый', 'Тихий', 'Холодный', 'Горячий', 'Старый', 'Кривой', 'Святой', 'Чужой',
    'Голодный', 'Сонный', 'Упрямый', 'Ревнивый', 'Добрый', 'Жестокий', 'Потерянный', 'Забытый', 'Плачущий', 'Смеющийся', 'Ночной', 'Утренний',
    'Пепельный', 'Ржавый', 'Вдовий', 'Сиротский', 'Королевский', 'Нищенский', 'Шепчущий', 'Немой', 'Лживый', 'Честный', 'Последний'];
  D.fates = [
    'Его нашли в руинах.', 'Его выиграли в кости.', 'Его украли на ярмарке.', 'Его передавали от отца к сыну.', 'Его сняли с мертвеца.',
    'Им расплатились за ночлег.', 'Его вынесли из горящего дома.', 'Его выловили из реки.', 'Его оставили на могиле.', 'Его подарили на свадьбу.',
    'Им клялись.', 'Его прокляли.', 'О нём пели в тавернах.', 'О нём никто не помнит.', 'Его закопали и забыли.', 'Его хотели переплавить, но не смогли.',
    'Его обменяли на мешок соли.', 'Он пережил трёх хозяев.', 'Его продали за долги.', 'Его носили не снимая.',
  ];

  // Скрытые свойства уникальных предметов (никогда не показываются)
  D.hiddenFx = [
    (r, W) => ({ k: 'vs', tag: r.pick(['undead', 'beast', 'human', 'other', 'spirit', 'stone', 'fire', 'water', 'plant', 'insect', 'dragon']), mul: r.pick([1.3, 1.5, 2]) }),
    () => ({ k: 'night', mul: 1.35 }),
    () => ({ k: 'day', mul: 1.25 }),
    (r) => ({ k: 'weather', w: r.pick(['rain', 'storm', 'snow', 'fog', 'clear']), mul: 1.4 }),
    (r) => ({ k: 'biome', b: r.pick(['swamp', 'forest', 'desert', 'ice', 'mountain', 'coast', 'plains', 'ancient', 'volcanic', 'ash']), mul: 1.5 }),
    (r, W) => ({ k: 'region', r: r.int(0, W.regions.length - 1), mul: 2.5 }),
    (r) => ({ k: 'luck', v: r.int(1, 3) }),
    (r) => ({ k: 'regen', v: r.pick([0.5, 1]) }),
    (r) => ({ k: 'crit', v: r.int(3, 10) }),
    (r) => ({ k: 'season', s: r.int(0, 3), mul: 1.4 }),
    (r) => ({ k: 'moon', mul: 1.8 }),
    (r) => ({ k: 'hunger', v: r.pick([0.8, 1.2]) }),
    (r) => ({ k: 'stealth', v: 1 }),
    (r) => ({ k: 'light', v: 2 }),
    (r) => ({ k: 'warm', v: 1 }),
  ];

  // Генерация уникального предмета каталога
  D.makeUnique = function (W, idx, tier, used) {
    const r = U.rng(W.seed, 'uq', idx);
    const kind = r.weighted([['w', 45], ['a', 30], ['t', 17], ['m', 8]]);
    const base = B[r.pick(D.uniqueBases[kind])];
    const mats = D.materials.filter((m) => m.for.includes(kind === 'm' ? 't' : kind));
    const mat = r.pick(mats.length ? mats : D.materials);
    const g = base.g;
    const npcs = W.npcs;
    const owner = () => npcs[r.int(0, npcs.length - 1)];
    let name = '';
    for (let k = 0; k < 30; k++) {
      const p = r.next();
      if (p < 0.28) name = base.n + ' ' + U.gen(owner().first);
      else if (p < 0.52) name = U.adj(r.pick(D.uniqueAdj), g) + ' ' + base.n.toLowerCase();
      else if (p < 0.72) name = base.n + ' «' + r.pick(D.epithets) + '»';
      else if (p < 0.88) name = base.n + ' из ' + mat.gen;
      else name = U.adj(r.pick(D.uniqueAdj), g) + ' ' + base.n.toLowerCase() + ' из ' + mat.gen;
      if (!used || !used.has(name)) break;
    }
    if (used) { if (used.has(name)) name += ' ' + U.roman(1 + (idx % 37)); used.add(name); }
    const smith = owner();
    const sett = W.settlements[smith.sett] || W.settlements[0];
    const year = W.year0 - r.int(3, 400);
    const made = U.gr(g, 'Сделан', 'Сделана', 'Сделано', 'Сделаны');
    const hist = [];
    hist.push(made + ' из ' + mat.gen + (r.chance(0.6) ? ' мастером по имени ' + smith.first + ' ' + smith.sur : '') + ' ' + sett.loc + ', в ' + year + ' году после Падения.');
    const owners = [];
    const no = r.int(1, 4);
    for (let i = 0; i < no; i++) owners.push(owner());
    hist.push('Владельцы: ' + owners.map((o) => o.first + ' ' + o.sur).join(' → ') + ' → ?');
    const pron = U.gr(g, 'Его', 'Её', 'Его', 'Их');
    let fate = r.pick(D.fates).replace(/^Его/, pron).replace(/^Им/, U.gr(g, 'Им', 'Ею', 'Им', 'Ими')).replace(/^О нём/, U.gr(g, 'О нём', 'О ней', 'О нём', 'О них'));
    if (g === 'p') fate = fate.replace('Он пережил', 'Они пережили');
    else if (g === 'f') fate = fate.replace('Он пережил', 'Она пережила');
    else if (g === 'n') fate = fate.replace('Он пережил', 'Оно пережило');
    hist.push(fate);
    const tm = 1 + tier * 0.12;
    const item = {
      b: base.id, n: name, g, t: base.t, s: base.s, w: Math.round((base.w || 1) * mat.wm * 10) / 10,
      v: Math.round((base.v || 5) * mat.vm * (1 + tier * 0.3) + 20), mat: mat.id, uq: idx, hist,
      owners: owners.map((o) => o.id), origin: sett.id,
    };
    if (base.dmg) item.dmg = [Math.max(1, Math.round(base.dmg[0] * mat.dm * tm)), Math.max(2, Math.round(base.dmg[1] * mat.dm * tm))];
    if (base.def != null) item.def = Math.round((base.def + (kind === 'a' ? tier * 0.3 : 0)) * mat.df);
    if (base.wear) item.mw = item.wr = Math.round(base.wear * 1.5);
    if (base.stat) item.stat = base.stat;
    if (base.range) item.range = base.range;
    if (base.crit) item.crit = base.crit;
    if (base.warm) item.warm = base.warm;
    if (base.spell || mat.spell) item.spell = (base.spell || 1) * (mat.spell || 1);
    if (base.cont) item.cont = 1;
    if (base.music) item.music = 1;
    if (base.mods) item.mods = Object.assign({}, base.mods);
    if (mat.vs) item.vs = Object.assign({}, mat.vs, base.vs || {});
    else if (base.vs) item.vs = Object.assign({}, base.vs);
    if (kind === 't') {
      item.mods = item.mods || {};
      const st = r.pick(['str', 'dex', 'con', 'int', 'fai', 'luck']);
      item.mods[st] = (item.mods[st] || 0) + 1 + Math.floor(tier / 4);
    }
    // скрытые эффекты
    const hx = [];
    if (r.chance(0.45)) hx.push(r.pick(D.hiddenFx)(r, W));
    if (r.chance(0.12)) hx.push(r.pick(D.hiddenFx)(r, W));
    if (mat.night) hx.push({ k: 'night', mul: mat.night });
    if (r.chance(0.25)) hx.push({ k: 'owner', npc: owners[owners.length - 1].id });
    if (hx.length) item.hx = hx;
    return item;
  };

  // Названия книг
  D.bookTitles = ['О травах и кореньях', 'Песни северных пастухов', 'Хроника Падения (том II)', 'Счётная книга купца', 'Записки неизвестного паломника',
    'О природе снов', 'Наставление молодым кузнецам', 'Сказки для непослушных детей', 'Исповедь палача', 'О звёздах, что падают', 'Трактат о соли',
    'Путевые заметки картографа', 'Молитвенник с вырванными страницами', 'О повадках зверей', 'Книга мёртвых языков', 'Дневник утопленницы',
    'Свод законов Старой Короны', 'О пустоте между мирами', 'Поваренная книга', 'Стихи о любви и репе', 'Книга без начала', 'О часах и времени',
    'Наставление о войне', 'Список долгов', 'Родословная одного рода', 'О драконах: правда и ложь', 'Опыты над ртутью', 'Как пережить зиму'];
})(window.EOF);
