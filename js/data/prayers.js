'use strict';
// Боги, духи и генератор молитв (более тысячи).
(function (E) {
  const U = E.U, D = E.D;
  D.gods = [
    { id: 'silent', n: 'Молчащий', d: 'Бог, который ничего не сказал.', asp: ['Молчащего Бога', 'Немых Колоколов', 'Закрытых Уст', 'Тихой Ночи', 'Несказанного Слова'], fx: ['stealth', 'stun', 'calm', 'shield', 'reveal'] },
    { id: 'hungry', n: 'Голодный Бог', d: 'Он всегда хочет есть.', asp: ['Голодного Бога', 'Пустого Котла', 'Последней Крошки', 'Костяного Стола', 'Вечного Пира'], fx: ['drain', 'sate', 'might', 'fury', 'weak'] },
    { id: 'giant', n: 'Ольмар Спящий', d: 'Великан, уснувший под горами.', asp: ['Спящего Великана', 'Каменной Колыбели', 'Тяжёлых Век', 'Горного Сердца', 'Корней Гор'], fx: ['ironskin', 'shield', 'regen', 'blast', 'stone'] },
    { id: 'ash', n: 'Мора Пепельная', d: 'Дева пепла, что провожает мёртвых.', asp: ['Пепельной Девы', 'Остывших Углей', 'Погребального Костра', 'Серой Пыли', 'Последнего Вздоха'], fx: ['drain', 'fear', 'fireImm', 'bolt', 'ward'] },
    { id: 'horns', n: 'Велг Рогатый', d: 'Владыка зверей и чащ.', asp: ['Рогатого Владыки', 'Звериной Тропы', 'Лесного Шума', 'Волчьего Воя', 'Зелёной Тени'], fx: ['calm', 'summon', 'haste', 'regen', 'reveal'] },
    { id: 'moon', n: 'Ласса Седьмая Луна', d: 'Богиня ночи и снов.', asp: ['Седьмой Луны', 'Ночных Тропинок', 'Серебряной Росы', 'Лунного Пса', 'Спящих Глаз'], fx: ['nighteye', 'stealth', 'heal', 'bolt', 'dream'] },
    { id: 'sun', n: 'Хоран Огненное Око', d: 'Солнце, которое смотрит.', asp: ['Огненного Ока', 'Полуденного Жара', 'Золотых Колосьев', 'Рассветного Луча', 'Неугасимого Огня'], fx: ['bolt', 'blast', 'warmth', 'heal', 'holyfire'] },
    { id: 'deep', n: 'Тиу Глубинный', d: 'Тот, кто лежит на дне моря.', asp: ['Бога Глубин', 'Утонувших', 'Солёных Слёз', 'Чёрной Воды', 'Тихого Прилива'], fx: ['gills', 'heal', 'slow', 'drain', 'calm'] },
    { id: 'faceless', n: 'Безликий', d: 'Бог зеркал и лжи.', asp: ['Безликого', 'Кривых Зеркал', 'Чужих Лиц', 'Двойной Тени', 'Обмана'], fx: ['stealth', 'blink', 'mirror', 'fear', 'luck'] },
    { id: 'chron', n: 'Ардан Летописец', d: 'Он записывает всё. Даже это.', asp: ['Летописца', 'Застывшего Мига', 'Старых Страниц', 'Песочных Часов', 'Забытых Имён'], fx: ['timestop', 'reveal', 'focus', 'heal', 'haste'] },
    { id: 'throne', n: 'Пустой Трон', d: 'Бог, которого нет. Его трон пуст.', asp: ['Пустого Трона', 'Пустоты', 'Ничьей Короны', 'Безмолвной Бездны', 'Края Мира'], fx: ['bolt', 'drain', 'blink', 'timestop', 'fear'] },
    { id: 'wind', n: 'Сестра Ветров', d: 'Она поёт в ущельях.', asp: ['Сестры Ветров', 'Северного Ветра', 'Грозовых Туч', 'Птичьих Крыл', 'Дальних Дорог'], fx: ['haste', 'bolt', 'chain', 'blink', 'luck'] },
  ];
  D.godById = {};
  D.gods.forEach((g) => (D.godById[g.id] = g));
  // Духи — источник молитв в мире духов и во время парада духов
  D.spiritAsp = ['Духов Предков', 'Безымянных Мёртвых', 'Домового', 'Речной Девы', 'Курганов', 'Перекрёстков', 'Старых Изб', 'Блуждающих Огней'];
  // Эмоции — источник молитв
  D.emotions = { grief: 'Горя', rage: 'Ярости', fear: 'Страха', joy: 'Радости', lonely: 'Одиночества', awe: 'Благоговения' };

  D.prayerForms = [['Молитва', 'f'], ['Псалом', 'm'], ['Заговор', 'm'], ['Песнь', 'f'], ['Шёпот', 'm'], ['Воззвание', 'n'], ['Плач', 'm'], ['Гимн', 'm'], ['Клятва', 'f'], ['Литания', 'f']];
  D.prayerMods = [['', 1], ['Малый', 0.7], ['Великий', 1.6]];

  // эффекты: k — примитив умений или особые
  D.prayerFx = {
    heal: (p) => ({ k: 'heal', p: 2 * p, stat: 'fai', flat: Math.round(10 * p), d: 'исцеляет' }),
    regen: (p) => ({ k: 'buff', e: 'regenbuff', dur: Math.round(100 * p), d: 'раны затягиваются' }),
    bolt: (p) => ({ k: 'bolt', p: 1.6 * p, r: 8, stat: 'fai', el: 'holy', d: 'поражает врага' }),
    blast: (p) => ({ k: 'blast', p: 1.5 * p, r: 2, self: 1, stat: 'fai', el: 'holy', d: 'опаляет всё вокруг' }),
    chain: (p) => ({ k: 'chain', p: 1.3 * p, r: 8, n: 3, stat: 'fai', el: 'storm', d: 'гром бьёт по врагам' }),
    drain: (p) => ({ k: 'drain', p: 1.5 * p, stat: 'fai', d: 'забирает жизнь' }),
    shield: (p) => ({ k: 'shield', p: 3 * p, stat: 'fai', d: 'ограждает' }),
    stealth: (p) => ({ k: 'stealth', dur: Math.round(15 * p), d: 'скрывает' }),
    stun: (p) => ({ k: 'debuff', e: 'stun', r: 3, dur: Math.round(3 * p), d: 'обездвиживает' }),
    slow: (p) => ({ k: 'debuff', e: 'slow', r: 4, dur: Math.round(6 * p), d: 'сковывает' }),
    weak: (p) => ({ k: 'debuff', e: 'weak', r: 4, dur: Math.round(8 * p), d: 'ослабляет врагов' }),
    fear: (p) => ({ k: 'fear', r: Math.round(5 * p), d: 'обращает в бегство' }),
    calm: (p) => ({ k: 'buff', e: 'calm', dur: Math.round(200 * p), d: 'усмиряет зверей' }),
    reveal: (p) => ({ k: 'reveal', x: { mons: 1, map: p > 1.2 ? 1 : 0 }, r: 40, d: 'открывает скрытое' }),
    sate: (p) => ({ k: 'sate', p: Math.round(40 * p), d: 'утоляет голод' }),
    might: (p) => ({ k: 'buff', e: 'might', dur: Math.round(60 * p), d: 'даёт силу' }),
    fury: (p) => ({ k: 'buff', e: 'fury', dur: Math.round(30 * p), d: 'наполняет яростью' }),
    ironskin: (p) => ({ k: 'buff', e: 'ironskin', dur: Math.round(60 * p), d: 'укрепляет кожу' }),
    stone: (p) => ({ k: 'buff', e: 'stone', dur: Math.round(120 * p), d: 'делает твёрдым как камень' }),
    fireImm: (p) => ({ k: 'buff', e: 'ash', dur: Math.round(300 * p), d: 'защищает от огня' }),
    ward: (p) => ({ k: 'buff', e: 'deathward', dur: Math.round(200 * p), d: 'отводит смерть' }),
    summon: (p) => ({ k: 'summon', x: { mon: 'ally_spirit', n: p > 1.2 ? 2 : 1 }, dur: Math.round(60 * p), d: 'призывает духа' }),
    haste: (p) => ({ k: 'buff', e: 'haste', dur: Math.round(25 * p), d: 'ускоряет' }),
    nighteye: (p) => ({ k: 'buff', e: 'nighteye', dur: Math.round(400 * p), d: 'даёт видеть во тьме' }),
    dream: (p) => ({ k: 'buff', e: 'drowsy', dur: Math.round(600 * p), d: 'навевает сны' }),
    warmth: (p) => ({ k: 'buff', e: 'warmth', dur: Math.round(400 * p), d: 'согревает' }),
    holyfire: (p) => ({ k: 'buff', e: 'holyfire', dur: Math.round(60 * p), d: 'зажигает оружие' }),
    gills: (p) => ({ k: 'buff', e: 'gills', dur: Math.round(150 * p), d: 'даёт дышать водой' }),
    mirror: (p) => ({ k: 'buff', e: 'mirror', dur: Math.round(30 * p), d: 'отражает удары' }),
    luck: (p) => ({ k: 'buff', e: 'luckbuff', dur: Math.round(120 * p), d: 'приносит удачу' }),
    focus: (p) => ({ k: 'buff', e: 'focus', dur: Math.round(100 * p), d: 'проясняет разум' }),
    blink: (p) => ({ k: 'blink', r: Math.round(6 * p), d: 'переносит' }),
    timestop: (p) => ({ k: 'timestop', p: Math.max(1, Math.round(2 * p)), d: 'останавливает миг' }),
  };
  D.prayerFxIds = Object.keys(D.prayerFx);
  // недостатки (у каждой молитвы есть цена)
  D.prayerCost = [
    { k: 'hunger', v: 15, d: 'голод' }, { k: 'hp', v: 0.1, d: 'кровь' }, { k: 'age', v: 7, d: 'дни жизни' }, { k: 'gold', v: 10, d: 'монеты' },
    { k: 'curse', e: 'weak', dur: 30, d: 'слабость' }, { k: 'curse', e: 'blind', dur: 15, d: 'зрение' }, { k: 'curse', e: 'fear', dur: 15, d: 'смелость' },
    { k: 'curse', e: 'cold', dur: 60, d: 'тепло' }, { k: 'curse', e: 'exhausted', dur: 60, d: 'силы' }, { k: 'noise', v: 1, d: 'тишину' },
    { k: 'opinion', v: 5, d: 'чьё-то доверие' }, { k: 'forget', v: 1, d: 'воспоминание' }, { k: 'mp', v: 0.5, d: 'дух' },
  ];

  D.prayerSources = [['god', 30], ['book', 18], ['elder', 15], ['spirit', 9], ['dream', 8], ['lang', 7], ['event', 4], ['sacrifice', 5], ['emotion', 4]];

  // Генерация каталога. Возвращает массив молитв.
  D.genPrayers = function (seed, count) {
    const r = U.rng(seed, 'prayers');
    const combos = [];
    for (let gi = 0; gi < D.gods.length; gi++) {
      for (let ai = 0; ai < 5; ai++) for (let fi = 0; fi < D.prayerForms.length; fi++) for (let mi = 0; mi < 3; mi++) combos.push(['g', gi, ai, fi, mi]);
    }
    for (let si = 0; si < D.spiritAsp.length; si++) for (let fi = 0; fi < D.prayerForms.length; fi++) for (let mi = 0; mi < 2; mi++) combos.push(['s', si, 0, fi, mi]);
    const emo = Object.keys(D.emotions);
    for (let ei = 0; ei < emo.length; ei++) for (let fi = 0; fi < D.prayerForms.length; fi++) combos.push(['e', ei, 0, fi, 0]);
    r.shuffle(combos);
    const out = [];
    for (let i = 0; i < Math.min(count, combos.length); i++) {
      const [kind, a, b, fi, mi] = combos[i];
      const [form, g] = D.prayerForms[fi];
      const [modN, pw] = D.prayerMods[mi];
      let of, god = null, fxPool, src;
      if (kind === 'g') { const gd = D.gods[a]; god = gd.id; of = gd.asp[b]; fxPool = gd.fx.concat(r.sample(D.prayerFxIds, 2)); src = r.weighted(D.prayerSources.filter((s) => s[0] !== 'emotion')); }
      else if (kind === 's') { of = D.spiritAsp[a]; fxPool = ['summon', 'heal', 'reveal', 'fear', 'nighteye', 'calm', 'drain']; src = r.chance(0.6) ? 'spirit' : 'elder'; }
      else { of = D.emotions[emo[a]]; fxPool = ['fury', 'heal', 'might', 'stealth', 'fear', 'luck', 'ward', 'focus']; src = 'emotion'; }
      const name = (modN ? U.adj(modN, g) + ' ' + form.toLowerCase() : form) + ' ' + of;
      const fxId = r.pick(fxPool);
      const power = pw * r.range(0.85, 1.25);
      const fx = D.prayerFx[fxId](power);
      const cost = r.pick(D.prayerCost);
      out.push({
        id: i, n: name, god, src, emo: kind === 'e' ? emo[a] : null, fxId, fx, cost, pw: power,
        mp: Math.round(4 + 6 * power + r.int(0, 4)), cd: Math.round(60 + 240 * power), // cd — в минутах
        lang: src === 'lang' ? r.int(0, 5) : null,
      });
    }
    return out;
  };
  D.langs = ['язык Первых', 'речь утонувших', 'наречие пепла', 'горное письмо', 'птичьи руны', 'язык зеркал'];
})(window.EOF);
