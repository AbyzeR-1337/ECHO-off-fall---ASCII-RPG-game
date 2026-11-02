'use strict';
// Отношения с людьми — не одно число «нравишься / не нравишься», а пять:
// дружба (старое «мнение»), доверие, уважение, симпатия (любовь) и страх.
// У каждого — стадия («незнакомец», «приятель», «друг», «влюблён», …) и память о том, что ты делал.
// В разговоре — разделы: «По душам», «Флирт», «Хитрость». У жителей свой нрав: кто-то кокетлив,
// кто-то хитёр, — и говорят они по-своему. А некоторые и сами подходят: друг — с новостью,
// влюблённый — с улыбкой, шулер — с костями, нищий — с протянутой рукой.
(function (E) {
  const U = E.U, D = E.D, G = E.G, Gm = E.Gm, Dlg = E.Dlg, R = E.Realms, RM = E.Romance, UI = E.UI;
  const SO = E.Social = {};
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const st = (id) => E.Sim.st(id);
  const cl = (v) => U.clamp(v, -100, 100);
  const day = () => Gm.day();
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const traits = (n) => n.traits || [];
  const has = (n, t) => traits(n).includes(t);
  const P = () => G.P;
  const adultP = () => Gm.age() >= 18;

  // ---------- шкалы ----------
  SO.tr = (id, d) => { const s = st(id); s.tr = cl((s.tr || 0) + d); return s.tr; };
  SO.rs = (id, d) => { const s = st(id); s.rs = cl((s.rs || 0) + d); return s.rs; };
  SO.fe = (id, d) => { const s = st(id); s.fe = U.clamp((s.fe || 0) + d, 0, 100); return s.fe; };
  SO.love = (id, d) => { const s = st(id); s.love = U.clamp((s.love || 0) + d, 0, 100); return s.love; };
  // память: что ты делал — коротко, последние пять
  SO.note = function (id, s) { const q = st(id); q.pm = q.pm || []; q.pm.push({ t: G.S.time, s }); if (q.pm.length > 5) q.pm.shift(); };
  // страх тает со временем
  function decay(id) {
    const s = st(id), d = day();
    if (s.fd != null && s.fe) s.fe = Math.max(0, s.fe - (d - s.fd) * 3);
    s.fd = d;
  }
  SO.vals = function (id) {
    const s = st(id);
    return { op: Gm.opinion(id), tr: s.tr || 0, rs: s.rs || 0, fe: s.fe || 0, love: s.love || 0, rel: s.rel || null, fr: !!s.fr };
  };
  // стадия отношений
  SO.stage = function (id) {
    const v = SO.vals(id), n = Gm.npc(id);
    const f = (a, b) => Gm.fmt(n.sex === 'f' ? b : a, n);
    if (v.rel === 'spouse') return [f('Супруг', 'Супруга'), '#ff9ac0'];
    if (v.rel === 'partner') return [f('Возлюбленный', 'Возлюбленная'), '#ff9ac0'];
    if (v.op <= -40) return ['Враг', '#ff6a5a'];
    if (v.op <= -15) return ['Неприязнь', '#e0906a'];
    if (v.love >= 45) return [f('Влюблён', 'Влюблена'), '#f0a0d0'];
    if (!Gm.knows(id)) return [f('Незнакомец', 'Незнакомка'), '#a09888'];
    if (v.fr || (v.op >= 60 && v.tr >= 30)) return [v.op >= 75 ? f('Близкий друг', 'Близкая подруга') : f('Друг', 'Подруга'), '#90e0a0'];
    if (v.love >= 20) return ['Симпатия', '#e0b0d0'];
    if (v.op >= 30) return [f('Приятель', 'Приятельница'), '#b0d890'];
    return [f('Знакомый', 'Знакомая'), v.op >= 8 ? '#c8c0a8' : '#a8a090'];
  };
  // оттенки: доверяет, уважает, боится
  SO.tags = function (id) {
    const v = SO.vals(id), n = Gm.npc(id), out = [];
    if (v.tr >= 30) out.push('доверяет'); else if (v.tr <= -25) out.push('не доверяет');
    if (v.rs >= 30) out.push('уважает'); else if (v.rs <= -25) out.push('презирает');
    if (v.fe >= 50) out.push('боится'); else if (v.fe >= 20) out.push(Gm.fmt('побаивается', n));
    if (v.love >= 20 && v.love < 45 && !v.rel) out.push(Gm.fmt('неравнодуш{ен|на}', n));
    return out;
  };

  // ---------- нрав жителя: кокетливый, хитрый ----------
  SO.temper = function (id) {
    const n = Gm.npc(id);
    if (!n) return null;
    const race = R.raceOf(n), h = U.hash(id, 7717) % 100, adult = RM.adult(id);
    if (race === 'succubus' && adult) return 'flirty';
    if (has(n, 'liar') || (has(n, 'greedy') && h < 35) || (race === 'goblin' && h < 70)) return 'sly';
    if (adult && h < 13 + (race === 'catfolk' || race === 'tiefling' ? 12 : 0) + (has(n, 'cheerful') || has(n, 'dreamer') ? 8 : 0) - (has(n, 'shy') || has(n, 'pious') ? 8 : 0)) return 'flirty';
    if (h >= 95 || (race === 'tiefling' && h >= 80)) return 'sly';
    return null;
  };

  // ---------- реплики ----------
  const L = {
    flirtyHi: ['Ну надо же, кто к нам пожаловал... Я бы тебя запомнил{|а}.', 'Привет, красав[ец|ица]. Заблудил[ся|ась] — или ко мне?', 'Ох, опять ты. Сердце-то не железное.', 'Стой-стой. Дай на тебя посмотреть. Да, так лучше.', 'А я как раз скучал{|а}. Не по тебе. Ну... может, чуть-чуть.', 'Мм, путни[к|ца]. Пахнешь дорогой и приключениями.'],
    slyHi: ['Ага, путни[к|ца] с полным кошельком! Не продашь чего? Или купишь?', 'О, кого я вижу. Как раз о тебе думал{|а}. Честно-честно.', 'Тише, тише. Не все тут такие честные, как я.', 'Друг! Ты ведь мне друг? Друзьям у меня особые цены.', 'Ищешь что-то? Я знаю, где найти. За скромную благодарность.'],
    flirtyTalk: ['Знаешь, у тебя красивые глаза. Ой, я это вслух сказал{|а}?', 'Если бы ты задержал[ся|ась] здесь подольше... я бы не возражал{|а}.', 'Мне скучно. Развлечёшь меня?', 'Таверна вечером — тихое место. Ну, если кому-то вдруг захочется компании...', 'Ты так на меня смотришь... или мне кажется?', 'Почему все интересные путники всегда уходят?', 'Я сегодня надел{|а} лучшее. Заметил[|а]? Нет? Ну и ладно.', 'Говорят, я разбиваю сердца. Врут. Я их коллекционирую.'],
    slyTalk: ['Слушай, есть одно дельце. Не совсем законное, но очень прибыльное. Шучу! Или нет.', 'Я знаю, у кого в этом городе в погребе золото. А ты знаешь, сколько стоит такое знание?', 'Всё на свете продаётся. Даже честность — особенно честность.', 'Видишь того толстяка? Он думает, что я ему друг. Ха.', 'Никогда не играй в кости с тем, кто улыбается. Вроде меня.', 'Хочешь совет? Бесплатный? Таких не бывает. Но тебе — скидка.', 'Стражник у ворот любит медовуху. Это так, к слову.', 'Я никогда не вру. Я просто иногда говорю правду наоборот.'],
  };

  const greet0 = Dlg.greet;
  Dlg.greet = function (e) {
    const id = e.npc;
    if (id != null && !e.asleep) {
      decay(id);
      if (e.offer && G.S.time < e.offer.until) return e.offer.line;
      const tp = SO.temper(id), op = Gm.opinion(id), n = Gm.npc(id);
      if (!RM.rel(id) && op > -10) {
        if (tp === 'flirty' && adultP() && RM.likes(n) && Math.random() < 0.6) return pick(L.flirtyHi);
        if (tp === 'sly' && Math.random() < 0.55) return pick(L.slyHi);
      }
      const v = SO.vals(id);
      if (v.fe >= 50 && Math.random() < 0.6) return pick(['Ч-что тебе нужно? Я всё сделаю.', 'Только не злись. Пожалуйста.', '*вздрагивает* Это ты...']);
      if (v.rs >= 40 && Math.random() < 0.4) return pick(['Для меня честь говорить с тобой.', 'О тебе рассказывают. Хорошее.', 'Рад{|а} видеть такого человека.']);
    }
    return greet0.apply(this, arguments);
  };
  const small0 = Dlg.smalltalk;
  Dlg.smalltalk = function (e) {
    const id = e.npc, tp = id != null ? SO.temper(id) : null;
    if (tp === 'flirty' && adultP() && RM.likes(Gm.npc(id)) && Math.random() < 0.45) return pick(L.flirtyTalk);
    if (tp === 'sly' && Math.random() < 0.45) return pick(L.slyTalk);
    return small0.apply(this, arguments);
  };

  // ---------- реакция: удача броска с учётом статов ----------
  const roll = (p) => Math.random() < U.clamp(p, 0.04, 0.96);
  const PS = (k) => (G.P.st && G.P.st[k]) || 5;
  const raceFlavor = {
    succubus: ['Мм, сладко. Это тебе будет стоить... ещё одного раза.', 'Ты учишься. Мне нравятся способные.'],
    catfolk: ['*мурлычет* Мрр... продолжай.', '*трётся щекой о твоё плечо*', '*хвост обвивает твою ногу*'],
    goblin: ['Хи-хи! Ты мне тоже нравишься. А блестяшки у тебя есть?', 'Ой. Ой-ой. Уши горят!'],
    lizard: ['*гребень наливается красным* Ссс... Это значит «да».', 'У нас так не говорят. Но... мне нравится.'],
    giant: ['*краснеет, как закат* Ой. Я... ой. Такой большой — а смутил{ся|ась}.'],
    tiefling: ['*хвост виляет* Не смотри на хвост. Он сам.', 'Обычно от меня шарахаются. А ты... нет.'],
    darkelf: ['Смел[ый|ая]. Мне нравится, когда со мной не боятся.', 'Осторожнее. Я могу и поверить.'],
    elf: ['Ты горяч[ий|ая], как все короткоживущие. Это... трогательно.', 'Сто лет никто так не говорил. Буквально.'],
    dwarf: ['*кашляет* Кхм. Ну... ладно. Ладно!', 'Тьфу на тебя. *но улыбается*'],
    orc: ['Хрр. Сильные слова. Мне нравится.', 'Ты не боишься. Это хорошо.'],
    halfling: ['Ой, ну что ты! *прячет улыбку в пирожок*', 'Я от тебя растаю, как масло!'],
  };
  const FL = {
    wink: { n: 'Подмигнуть', need: 0, p: 0.55, d: [3, 6],
      ok: ['*прыскает в кулак* Ты что, подмигиваешь мне?', 'Ой. *отводит глаза, но улыбается*', 'Подмигивать каждый умеет. А дальше что?', 'Мм. Я заметил{|а}.', '*подмигивает в ответ*'],
      no: ['У тебя что-то в глаз попало?', '*смотрит как на дурака*', 'Не надо так.'] },
    joke: { n: 'Игриво пошутить', need: 0, p: 0.6, d: [3, 7],
      ok: ['*смеётся* Ты всегда так[ой|ая] смешн[ой|ая] — или только со мной?', 'Ха! Ладно, это было мило.', 'Перестань, у меня живот болит от смеха!', 'Глупость какая. Расскажи ещё.'],
      no: ['Не смешно.', '*вежливо улыбается* ...Ага.', 'Это ты сейчас пытал[ся|ась] шутить?'] },
    bold: { n: 'Дерзко пофлиртовать', need: 10, p: 0.42, d: [7, 13],
      ok: ['*краснеет до ушей* Ну ты и нахал[|ка]... В общем, продолжай.', 'Смело. Мне нравится смелость.', 'Ох. Скажи это ещё раз — только медленнее.', 'Ты всегда так[ой|ая] прямолинейн[ый|ая]? Мне нравится.'],
      no: ['Эй! Полегче на поворотах!', 'Это было лишнее.', 'Ещё одно такое слово — и получишь по щеке.'] },
    hand: { n: 'Взять за руку', need: 25, p: 0.6, d: [6, 10],
      ok: ['*не отнимает руки* ...Тёплая.', '*сжимает твои пальцы в ответ*', 'Ладно. Только не отпускай сразу.'],
      no: ['*отдёргивает руку* Не так быстро.', 'Люди же смотрят!'] },
    whisper: { n: 'Прошептать на ушко', need: 40, p: 0.6, d: [7, 12],
      ok: ['*мурашки по коже* Ты... ты что такое говоришь...', '*тихо смеётся* Щекотно. И приятно.', 'Скажи ещё. Только тише.'],
      no: ['*отстраняется* Не надо.', 'Отойди, ты дышишь мне в ухо.'] },
    kiss: { n: 'Поцеловать', need: 60, p: 0.7, d: [8, 14],
      ok: ['*целует в ответ, долго* ...Вот. Теперь молчи.', '*замирает, потом обнимает* Наконец-то.', 'Ох... Ещё.'],
      no: ['*отворачивается* Нет. Не сейчас.', '*толкает в грудь* С ума [сошёл|сошла]?'] },
  };
  SO.flirt = function (e, k) {
    const id = e.npc, n = Gm.npc(id), f = FL[k], s = st(id);
    s.fl = s.fl || {};
    s.fl[k] = day();
    s.fln = s.fld === day() ? (s.fln || 0) + 1 : 1; s.fld = day();
    const race = R.raceOf(n), lv = s.love || 0, op = Gm.opinion(id);
    const free = !RM.married(id) || race === 'succubus';
    if (!RM.likes(n) || (!free && !RM.rel(id))) {
      Gm.op(id, -1); RM.feel(e, 'u');
      SO.note(id, 'Пытал[ся|ась] флиртовать — не взаимно.');
      return pick(RM.married(id) ? ['{Я женат|Я замужем}. Ты разве не знал[|а]?', 'Мило. Но дома меня ждут.'] : ['Ты очень мил[|а]. Но нет.', 'Давай останемся друзьями, ладно?', 'Не в моём вкусе, прости.']);
    }
    let p = f.p + lv / 200 + op / 300 + (PS('luck') - 5) * 0.02 + (PS('wil') - 5) * 0.015;
    if (SO.temper(id) === 'flirty') p += 0.18;
    if (has(n, 'shy')) p -= k === 'bold' ? 0.2 : 0.06;
    if (has(n, 'proud')) p -= 0.08;
    if (has(n, 'cheerful') && k === 'joke') p += 0.15;
    if (has(n, 'dreamer') && (k === 'whisper' || k === 'hand')) p += 0.12;
    if (has(n, 'pious') && k === 'bold') p -= 0.15;
    if (race === 'succubus') p += 0.25;
    if (s.fln > 3) p -= 0.25; // навязчивость
    if (RM.rel(id)) p += 0.3;
    if (roll(p)) {
      const v = SO.love(id, rnd(f.d[0], f.d[1]) + (race === 'succubus' ? 2 : 0));
      Gm.op(id, 2); SO.tr(id, 1);
      RM.feel(e, v > 55 ? 'l' : SO.temper(id) === 'sly' || race === 'succubus' ? 'c' : 'h');
      SO.note(id, { wink: 'Ты подмигнул[|а] — {ему|ей} понравилось.', joke: 'Вы смеялись вместе.', bold: 'Дерзкий флирт — {он|она} покраснел{|а}.', hand: 'Вы держались за руки.', whisper: 'Ты шептал[|а] {ему|ей} на ухо.', kiss: 'Вы поцеловались.' }[k]);
      Gm.cnt('flirts');
      // иногда — флиртуют в ответ
      const back = v > 30 && Math.random() < 0.45 ? ' ' + pick(['А ты сам[|а]-то... ничего так.', 'Приходи вечером. Просто поговорить. Наверное.', 'Только никому не рассказывай, ладно?', 'Ты ведь вернёшься?']) : '';
      const fl = raceFlavor[race] && Math.random() < 0.5 ? pick(raceFlavor[race]) : pick(f.ok);
      return fl + back;
    }
    SO.love(id, -rnd(1, 4)); Gm.op(id, -2); if (k === 'bold' || k === 'kiss') SO.rs(id, -3);
    RM.feel(e, k === 'bold' || k === 'kiss' ? 'a' : 's');
    SO.note(id, 'Флирт не удался: «' + FL[k].n.toLowerCase() + '».');
    return pick(f.no);
  };
  // меню флирта
  SO.flirtMenu = function (e, rmo) {
    const id = e.npc, s = st(id), lv = s.love || 0, rel = RM.rel(id), out = [];
    const used = (k) => s.fl && s.fl[k] === day();
    // комплимент, прогулка, признание — из «Сердечных дел»
    for (const o of rmo || []) out.push(Object.assign({ c: '#f0a8c8' }, o));
    for (const k in FL) {
      const f = FL[k];
      if (lv < f.need && !rel) continue;
      if (used(k)) continue;
      out.push({ t: f.n, c: '#f0a8c8', f: () => SO.flirt(e, k) });
    }
    if (!out.length) out.push({ t: '(На сегодня хватит — не будь навязчив[ым|ой])', c: '#8a7a80', f: () => 'Может, завтра.' });
    return out;
  };

  // ---------- по душам ----------
  const ADVICE = {
    smith: ['Точи клинок после каждой драки. Тупое железо подводит в самый неподходящий миг.', 'Ржавчина любит сырость. Смазывай оружие жиром.'],
    healer: ['Пей, даже если не хочется. Жажда убивает тише волка.', 'Рану промой, прежде чем перевязать. Иначе загниёт.'],
    hunter: ['Зверь чует тебя по ветру. Заходи так, чтобы ветер дул тебе в лицо.', 'Волки ходят стаей. Увидел одного — ищи остальных.'],
    farmer: ['Ешь, что даёт земля: хлеб, сыр, яблоки. Мясо — по праздникам.', 'Дожди скоро. Ищи крышу на ночь.'],
    guard: ['Не таскай оружие наголо по городу — стража нервничает.', 'В подворотнях после заката режут. Ходи по светлым улицам.'],
    priest: ['Молись не только когда больно. Боги слышат и благодарность.', 'Старые молитвы — сила. Ищи тех, кто их помнит.'],
    trader: ['Не продавай всё в одном месте. В другом городе дадут больше.', 'Покупай у того, кто тебе рад. Цена будет мягче.'],
    innkeeper: ['Спи под крышей, когда можешь. Ночь на земле отнимает силы.', 'Слухи — в таверне. Я всё слышу. Почти.'],
  };
  const GEN_ADVICE = ['Не верь тем, кто слишком улыбается.', 'Носи с собой воду. Колодцы есть не везде.', 'Дружи с теми, кто тебе рад. Остальные — подождут.', 'Если дорога слишком легка — это не та дорога.', 'Будь добр[ым|ой] с детьми и стариками. Мир это запоминает.', 'Ночью из леса лучше уходить.'];
  function advice(e) {
    const P = G.P, job = E.Sim.job(e.npc);
    if (P.thirst != null && P.thirst < 30) return '[Ты весь пересох|Ты вся пересохла]. Найди колодец — или хоть ручей.';
    if (P.hunger != null && P.hunger < 25) return 'Сначала поешь. На голодный желудок советы не впрок.';
    if (P.hp < P.mhp * 0.4) return 'Тебе к лекарю надо, а не советы слушать. Иди, пока не поздно.';
    const pool = (ADVICE[job] || []).concat(GEN_ADVICE);
    return pick(pool);
  }
  SO.heartMenu = function (e) {
    const id = e.npc, n = Gm.npc(id), s = st(id), v = SO.vals(id), out = [];
    const once = (k, days) => { s.hd = s.hd || {}; return s.hd[k] != null && day() - s.hd[k] < (days || 1); };
    const mark = (k) => { s.hd = s.hd || {}; s.hd[k] = day(); };
    const G1 = '#a8e0a0';
    if (!once('joke')) out.push({ t: 'Пошутить', c: G1, f: () => {
      mark('joke');
      let p = 0.55 + (has(n, 'cheerful') ? 0.25 : 0) + (has(n, 'chatty') ? 0.1 : 0) - (has(n, 'gloomy') ? 0.25 : 0) - (has(n, 'proud') ? 0.1 : 0);
      if (roll(p)) { Gm.op(id, rnd(2, 5)); RM.feel(e, 'h'); SO.note(id, 'Вы посмеялись над твоей шуткой.'); return pick(['*хохочет* Ох, уморил[|а]!', 'Ха! Надо будет запомнить.', 'Смешно. Правда смешно.', 'Ты, оказывается, весёл[ый|ая].']); }
      Gm.op(id, -1); RM.feel(e, 'n'); return pick(['...', 'Это шутка была?', 'Хм. Ну-ну.']);
    } });
    if (!once('confide') && v.op >= -5) out.push({ t: 'Рассказать о себе', c: G1, f: () => {
      mark('confide');
      SO.tr(id, rnd(3, 6)); Gm.op(id, 2); RM.feel(e, 'h'); SO.note(id, 'Ты рассказал[|а] {ему|ей} о себе.');
      const back = Math.random() < 0.6 ? ' ' + pick(['А я, знаешь... боюсь ' + D.fears[n.fear] + '. Никому не говорил{|а}.', 'Мне с тобой легко. Странно, да?', 'Я тоже когда-то хотел{|а} уйти отсюда. Не решил{ся|ась}.']) : '';
      return pick(['Надо же. Не думал{|а}, что ты столько повидал[|а].', 'Спасибо, что рассказал[|а]. Правда.', 'Вот оно как...']) + back;
    } });
    if (!once('advice')) out.push({ t: 'Спросить совета', c: G1, f: () => { mark('advice'); SO.rs(id, 1); SO.tr(id, 1); return advice(e); } });
    if (!once('praise', 2)) out.push({ t: 'Похвалить {его|её} дело', c: G1, f: () => {
      mark('praise');
      if (has(n, 'proud') || has(n, 'hard')) { Gm.op(id, 5); SO.rs(id, 3); RM.feel(e, 'h'); return pick(['Наконец-то кто-то заметил!', 'Я стараюсь. Приятно, что видно.']); }
      Gm.op(id, 2); return pick(['Да ладно, обычное дело.', 'Спасибо. Хоть кто-то ценит.']);
    } });
    out.push({ t: 'Что ты обо мне думаешь?', c: G1, f: () => SO.opinionText(id) });
    if ((v.op < 0 || v.tr < 0 || v.fe > 15) && !once('sorry', 3)) out.push({ t: 'Извиниться', c: G1, f: () => {
      mark('sorry');
      if (v.op < -50 && has(n, 'proud')) return 'Извинения? Засунь их себе... в сумку. Мне они не нужны.';
      Gm.op(id, rnd(4, 9)); SO.tr(id, 3); SO.fe(id, -10); RM.feel(e, 'n'); SO.note(id, 'Ты извинил[ся|ась].');
      return pick(['Ладно. Забудем. Но я запомню.', 'Хорошо, что ты это сказал[|а].', '*вздыхает* Принято.']);
    } });
    if (!v.fr && v.op >= 40 && v.tr >= 15 && !RM.rel(id)) out.push({ t: 'Предложить дружбу', c: '#c0ffb0', f: () => {
      st(id).fr = 1; Gm.op(id, 5); SO.tr(id, 5); RM.feel(e, 'h'); SO.note(id, 'Вы стали друзьями.'); Gm.cnt('friends');
      return pick(['Друзья? Давно пора! Заходи, когда хочешь.', 'Я думал{|а}, ты не предложишь. Да, конечно!', '*крепко обнимает* Друг.']);
    } });
    return out;
  };
  SO.opinionText = function (id) {
    const v = SO.vals(id), n = Gm.npc(id), parts = [];
    if (v.rel) parts.push(v.rel === 'spouse' ? 'Ты — моя семья. О чём тут ещё говорить?' : 'Ты знаешь, что я к тебе чувствую.');
    else if (v.love >= 45) parts.push('Я... я думаю о тебе чаще, чем следовало бы.');
    else if (v.love >= 20) parts.push('Ты мне нравишься. Ну, немножко.');
    if (v.op >= 60) parts.push('Ты — хорош[ий|ая] человек. Таких мало.'); else if (v.op >= 20) parts.push('Ты неплох[ой|ая]. С тобой можно иметь дело.'); else if (v.op <= -20) parts.push('Честно? Видеть тебя не хочу.'); else parts.push('Я тебя толком не знаю.');
    if (v.tr >= 30) parts.push('Тебе я верю.'); else if (v.tr <= -20) parts.push('И верить тебе — себя не уважать.');
    if (v.rs >= 30) parts.push('Тебя уважают — и я тоже.');
    if (v.fe >= 40) parts.push('...И, если честно, мне с тобой страшно.');
    return parts.join(' ');
  };

  // ---------- хитрость ----------
  const shopJob = (id) => { const j = D.jobs[E.Sim.job(id)] || {}; return !!j.shop; };
  // секрет: что-то, что знает житель — о себе или о соседях
  SO.secret = function (id) {
    const n = Gm.npc(id), W = G.W, out = [];
    if (W.npcItem[id] && D.items[W.npcItem[id]]) out.push('Между нами: у меня в сундуке лежит ' + D.items[W.npcItem[id]].n.toLowerCase() + '. Не вздумай.');
    if (W.npcUq[id] != null && !G.S.taken['uq' + W.npcUq[id]]) out.push('Я храню дома кое-что очень старое: «' + W.uniques[W.npcUq[id]].n + '». Даже родня не знает.');
    if (n.lostChild) out.push('Моя дочка, ' + n.lostChild + '... она пропала у реки. Я до сих пор хожу туда по ночам.');
    const sid = E.Sim.settOf(id);
    const nb = sid >= 0 ? W.npcs.filter((q) => q.id !== id && q.sett === sid && E.Sim.isAlive(q.id)) : [];
    if (nb.length) {
      const q = pick(nb), qn = q.first + (q.sur ? ' ' + q.sur : '');
      out.push(qn + ' до смерти боится ' + D.fears[q.fear] + '. Смешно, правда?');
      const hb = D.habits[q.habit]; if (hb) out.push('Знаешь, ' + qn + ' ' + hb[0] + '. Каждый раз. Можно часы сверять.');
      if (W.npcItem[q.id] && D.items[W.npcItem[q.id]]) out.push('У ' + q.first + ' в сундуке — ' + D.items[W.npcItem[q.id]].n.toLowerCase() + '. Только я тебе этого не говорил{|а}.');
      const qs = G.S.npc[q.id] || {};
      if (qs.love > 30) out.push(qn + ' по тебе вздыхает. Да-да, по тебе.');
    }
    const me = W.regions[G.map.rid != null ? G.map.rid : 0];
    const dun = me ? W.regions.filter((g) => g.dun && !G.P.known.regions[g.id] && Math.abs(g.x - me.x) + Math.abs(g.y - me.y) < 7) : [];
    if (dun.length) out.push({ dun: pick(dun) });
    return out.length ? pick(out) : null;
  };
  SO.slyMenu = function (e) {
    const id = e.npc, n = Gm.npc(id), s = st(id), v = SO.vals(id), out = [], P = G.P;
    const C1 = '#c8a8f0';
    const once = (k, days) => { s.sd = s.sd || {}; return s.sd[k] != null && day() - s.sd[k] < (days || 1); };
    const mark = (k) => { s.sd = s.sd || {}; s.sd[k] = day(); };
    const wits = PS('int') * 0.03 + PS('luck') * 0.02 + PS('dex') * 0.01;
    const sly = SO.temper(id) === 'sly';
    if (shopJob(id) && !once('disc')) out.push({ t: 'Выторговать скидку', c: C1, f: () => {
      mark('disc');
      let p = 0.2 + wits + v.op / 300 + v.rs / 400 - (has(n, 'greedy') ? 0.15 : 0) - (has(n, 'suspicious') ? 0.1 : 0) - (sly ? 0.1 : 0);
      if (roll(p)) { s.disc = day(); RM.feel(e, 'c'); SO.note(id, 'Ты выторговал[|а] скидку.'); return pick(['Ладно, ладно! Только никому не говори, что я тебе уступил{|а}.', 'Ох, умеешь ты уговаривать. Сегодня — дешевле.', 'Грабёж средь бела дня! ...Ну хорошо.']) + ' (сегодня цены мягче)'; }
      SO.tr(id, -2); Gm.op(id, -1); RM.feel(e, 'a'); return pick(['Ага, конечно. Цена есть цена.', 'Не пытайся меня обдурить — я на этом рынке вырос{|ла}.', 'Иди-ка торгуйся с козой.']);
    } });
    if (!once('secret', 2)) out.push({ t: 'Выведать секрет', c: C1, f: () => {
      mark('secret');
      const p = 0.18 + wits + v.tr / 160 + v.op / 400 + (has(n, 'chatty') ? 0.2 : 0) - (has(n, 'suspicious') ? 0.15 : 0) + (has(n, 'drunk') ? 0.15 : 0);
      if (!roll(p)) { SO.tr(id, -3); RM.feel(e, 'a'); return pick(['С чего бы мне тебе рассказывать?', 'Секреты — не для чужих ушей.', 'Ишь, какой любопытн[ый|ая]. Нет.']); }
      const sc = SO.secret(id);
      RM.feel(e, 'c'); SO.note(id, 'Поделил{ся|ась} с тобой секретом.'); Gm.cnt('secrets_heard');
      if (!sc) return 'Да нет у меня никаких секретов. Скучн{ый|ая} я.';
      if (sc.dun) { G.P.known.regions[sc.dun.id] = G.S.time; return 'Слушай. В ' + (sc.dun.name || 'тех краях') + ' есть вход под землю. Я сам{|а} видел{|а}. (Место отмечено на карте.)'; }
      return sc;
    } });
    if (!once('bluff', 3)) out.push({ t: 'Наплести небылиц о себе', c: C1, f: () => {
      mark('bluff');
      const lie = pick(['Я — посланни[к|ца] самого герцога.', 'Я убил[|а] дракона. Ну, почти.', 'Я наследни[к|ца] древнего рода. Тсс.', 'Меня ждут при дворе. Я тут проездом.']);
      const p = 0.25 + wits - (has(n, 'suspicious') ? 0.2 : 0) + (has(n, 'dreamer') ? 0.15 : 0) - (sly ? 0.15 : 0);
      if (roll(p)) { SO.rs(id, 8); Gm.op(id, 3); s.blf = day(); RM.feel(e, 'u'); SO.note(id, 'Поверил{|а} в твои небылицы.'); return '«' + lie + '» — ' + pick(['П-правда? Простите, не признал{|а}! Чем могу служить?', 'Ох... Тогда, конечно, для тебя — всё самое лучшее.', 'Не может быть! Расскажи ещё!']); }
      SO.tr(id, -10); SO.rs(id, -5); RM.feel(e, 'a'); SO.note(id, 'Поймал{|а} тебя на вранье.');
      return '«' + lie + '» — ' + pick(['Ага. А я — королева фей. Иди-ка ты.', 'Врёшь и не краснеешь. Запомню.', 'Ты меня за {дурака|дуру} держишь?']);
    } });
    if (P.gold >= 10) out.push({ t: 'Подкупить (10 мед.)', c: C1, f: () => {
      if (has(n, 'honest') && !has(n, 'greedy')) { SO.rs(id, -4); SO.tr(id, -4); RM.feel(e, 'a'); return 'Убери деньги. Я не продаюсь.'; }
      P.gold -= 10; SO.tr(id, 4); Gm.op(id, 4); RM.feel(e, 'c'); SO.note(id, 'Ты {ему|ей} заплатил[|а] — «просто так».');
      if (e.guard && G.map.sett >= 0 && Gm.isWanted(G.map.sett)) { const w = G.P.wanted[G.map.sett]; w.n = Math.max(0, (w.n || 1) - 1); return '*монеты исчезают в рукаве* Ладно. Штраф будет поменьше. Только не попадайся снова.'; }
      return pick(['*монеты исчезают в рукаве* Мы с тобой поладим.', 'Деньги не пахнут. А ты — пахнешь удачей.', 'Вот это разговор. Что нужно?']);
    } });
    if (P.gold >= 5 && !once('dice')) out.push({ t: 'Сыграть в кости (5 мед.)', c: C1, f: () => { mark('dice'); return SO.dice(e, false); } });
    if (!once('threat', 2)) out.push({ t: 'Пригрозить', c: '#f08a7a', f: () => {
      mark('threat');
      const str = PS('str') + G.P.level * 0.5, brave = has(n, 'brave') || e.guard || R.raceOf(n) === 'orc' || R.raceOf(n) === 'giant';
      SO.tr(id, -10); Gm.op(id, -8); SO.note(id, 'Ты {ему|ей} угрожал[|а].');
      if (brave && Math.random() < 0.6) { SO.rs(id, -5); RM.feel(e, 'a'); if (Math.random() < 0.3 && !e.guard) { Gm.duel(id); return 'close'; } return pick(['Попробуй. Посмотрим, кто кого.', 'Ты мне угрожаешь? Мне?!', 'Ещё слово — и пожалеешь.']); }
      SO.fe(id, 15 + Math.round(str)); SO.rs(id, 2); RM.feel(e, 'f');
      if ((has(n, 'coward') || SO.vals(id).fe >= 50) && !once('shake', 4)) { mark('shake'); const g = rnd(5, 15); G.P.gold += g; return 'Н-не надо! Вот, возьми, только не трогай! (' + Gm.money(g) + ')'; }
      return pick(['*бледнеет* Я... понял{|а}. Понял{|а}.', 'Л-ладно. Не надо так.', '*отступает на шаг*']);
    } });
    return out;
  };
  // кости: хитрецы мухлюют; можно заметить — если ум и удача на твоей стороне
  SO.dice = function (e, offer) {
    const id = e.npc, n = Gm.npc(id), P = G.P, sly = SO.temper(id) === 'sly';
    if (P.gold < 5) return 'Без денег не играют.';
    const cheat = sly && Math.random() < 0.7;
    const me = rnd(1, 6) + rnd(1, 6) + (PS('luck') > 7 ? 1 : 0), they = cheat ? Math.max(rnd(1, 6) + rnd(1, 6), rnd(7, 11)) : rnd(1, 6) + rnd(1, 6);
    if (cheat && roll(PS('int') * 0.04 + PS('luck') * 0.02 - 0.1)) {
      SO.rs(id, 3); RM.feel(e, 'f');
      P.gold += 5;
      return 'Ты смотришь внимательнее — кости-то с грузом! ' + pick(['«Ой. Это не мои. Ладно-ладно, держи пять монет — и ни слова!»', '«Тихо! Не ори. Вот, бери пять — и разойдёмся.»']) + ' (+5 мед.)';
    }
    Gm.cnt('dice');
    if (me > they) { P.gold += 5; RM.feel(e, sly ? 'a' : 'u'); return 'У тебя ' + me + ', у {него|неё} ' + they + '. ' + pick(['Тьфу! Повезло тебе.', 'Ещё партию? Нет? Ну и ладно.', 'Чтоб тебя!']) + ' (+5 мед.)'; }
    if (me === they) return 'Ничья: ' + me + ' и ' + they + '. Ставки остаются при вас.';
    P.gold -= 5; RM.feel(e, 'c');
    return 'У тебя ' + me + ', у {него|неё} ' + they + '. ' + pick(['Хе-хе. Удача любит меня.', 'Ну, бывает. Отыграешься?', 'Спасибо за монетку!']) + ' (−5 мед.)';
  };
  // цены: скидка, страх, дружба
  const pm0 = Dlg.priceMul;
  Dlg.priceMul = function (e, b, buy) {
    let m = pm0.apply(this, arguments);
    if (e && e.npc != null) {
      const s = G.S.npc[e.npc] || {};
      if (s.disc === Gm.day()) m *= buy ? 0.85 : 1.1;
      if (s.blf === Gm.day()) m *= buy ? 0.92 : 1.05;
      if (s.fr) m *= buy ? 0.93 : 1.05;
      if ((s.fe || 0) >= 50) m *= buy ? 0.9 : 1.05;
    }
    return m;
  };

  // ---------- разговор: разделы ----------
  // комплимент, прогулка и признание — переносим в «Флирт»
  const RM_OPTS = ['Сказать комплимент', 'Позвать прогуляться', 'Признаться в чувствах'];
  const opts0 = Dlg.options;
  Dlg.options = function (e) {
    const opts = opts0.apply(this, arguments);
    const id = e.npc;
    if (id == null || e.asleep || e.ghost || e.hostile || Gm.fxFlag('mute')) return opts;
    if (opts.length <= 1) return opts;
    const rmo = [];
    for (let i = opts.length - 1; i >= 0; i--) if (RM_OPTS.includes(opts[i].t)) rmo.unshift(opts.splice(i, 1)[0]);
    const at = Math.max(0, opts.findIndex((o) => o.t === 'Подарить...'));
    const add = [];
    add.push({ t: 'По душам…', c: '#a8e0a0', sub: () => SO.heartMenu(e) });
    if (RM.adult(id) && adultP() && Gm.opinion(id) > -15) add.push({ t: 'Флирт…', c: '#f0a8c8', sub: () => SO.flirtMenu(e, rmo) });
    add.push({ t: 'Хитрость…', c: '#c8a8f0', sub: () => SO.slyMenu(e) });
    opts.splice(at, 0, ...add);
    // предложение того, кто сам подошёл, — первым
    if (e.offer && G.S.time < e.offer.until && OFFERS[e.offer.k]) {
      const of = OFFERS[e.offer.k].opts(e).map((o) => Object.assign({ c: '#ffe0a0' }, o, { f: () => { const r = o.f(); e.offer = null; return r; } }));
      opts.unshift(...of);
    }
    return opts;
  };

  // ---------- сами подходят ----------
  const OFFERS = {
    flirt: {
      line: () => pick(['Привет... Я тебя давно заметил{|а}. Скучаешь?', 'Ты ведь не уйдёшь, не поздоровавшись со мной?', 'Стой. Ты сегодня как[ой|ая]-то особенн[ый|ая]... нет-нет, это хорошо.', 'Я тут подумал{|а}... может, прогуляемся? Просто так.', 'Эй, красав[ец|ица]. Угостишь меня чем-нибудь?']),
      opts: (e) => [
        { t: 'Ответить тем же', f: () => { SO.love(e.npc, rnd(6, 10)); Gm.op(e.npc, 2); RM.feel(e, 'l'); SO.note(e.npc, '{Он|Она} сам{|а} подош{ёл|ла} пофлиртовать — ты ответил[|а].'); return pick(['*смеётся и касается твоей руки* Я так и знал{|а}.', 'Мм. Значит, не показалось.', 'Вечером. У колодца. Не опаздывай.']); } },
        { t: 'Смутиться', f: () => { SO.love(e.npc, 3); RM.feel(e, 'h'); return pick(['Ой, ты покраснел[|а]! Как мило.', 'Ладно-ладно, не буду тебя мучить. Пока.']); } },
        { t: 'Вежливо отказать', f: () => { SO.love(e.npc, -6); Gm.op(e.npc, -1); RM.feel(e, 's'); return pick(['А... Ну ладно. Я просто так.', 'Понял{|а}. В общем — забудь.']); } },
      ],
    },
    paid: {
      line: () => pick(['Скучаешь, путни[к|ца]? За пять серебряников я сделаю этот вечер... запоминающимся.', 'Ты так напряжён[|а]. Я умею снимать усталость. Недорого.', 'Не проходи мимо. Здесь всем рады — особенно тем, у кого звенит кошель.']),
      opts: (e) => [
        { t: 'Согласиться (5 сер.)', f: () => {
          const P = G.P;
          if (P.gold < 50) return 'Ах, пусто? Возвращайся, когда разбогатеешь, сладк[ий|ая].';
          P.gold -= 50; SO.love(e.npc, 4); Gm.op(e.npc, 3); RM.feel(e, 'l');
          E.UI.closeAll(); Gm.rest(2); Gm.fx('loved', 60 * 6); Gm.healPlayer(Math.round(P.mhp * 0.3), true);
          Gm.msg(Gm.fmt('Вечер проходит в тепле, смехе и шёпоте. Что было дальше — останется между вами.', Gm.npc(e.npc)), '#e0a0c0');
          return null;
        } },
        { t: 'Отказать', f: () => { RM.feel(e, 'c'); return pick(['Как знаешь. Я никуда не денусь.', 'Передумаешь — ты знаешь, где меня найти.']); } },
      ],
    },
    dice: {
      line: () => pick(['Эй! Сыграем в кости? Ставка — пять монет. Удача любит смелых!', 'Скучно стоять, правда? Давай кинем кости — по-честному. Ну, почти.', 'Пс-с. Спорим, я выкину больше? Пять монет.']),
      opts: (e) => [
        { t: 'Сыграть (5 мед.)', f: () => SO.dice(e, true) },
        { t: 'Присмотреться к костям', f: () => { if (roll(PS('int') * 0.06 + PS('luck') * 0.02)) { SO.rs(e.npc, 4); RM.feel(e, 'f'); G.P.gold += 3; return 'Кости-то с грузом! «Тсс! Вот, держи три монеты — и ни слова, ладно?»'; } return 'Кости как кости. Вроде бы.'; } },
        { t: 'Отказаться', f: () => 'Ну и скучн[ый|ая] же ты.' },
      ],
    },
    map: {
      line: () => pick(['Пс-с. Карта сокровищ. Настоящая! Тебе — всего за пятнадцать монет.', 'Хочешь знать, где старый клад зарыт? Есть карта. Дёшево!', 'Только тебе: карта к логову, где никто не был сто лет!']),
      opts: (e) => [
        { t: 'Купить карту (15 мед.)', f: () => SO.buyMap(e, 15) },
        { t: 'Сбить цену', f: () => { if (roll(0.25 + PS('int') * 0.04)) { e.offer.price = 7; return '«Ладно, семь. Грабишь бедн{ого|ую}!» (теперь — 7 мед.)'; } return '«Пятнадцать, и ни медяком меньше!»'; } },
        { t: 'Отказаться', f: () => 'Пожалеешь, когда кто-то другой найдёт!' },
      ],
    },
    thief: {
      line: () => pick(['Ой, простите, не заметил{|а}! Тесно тут...', 'Ах! Извини-извини, споткнул{ся|ась}!', '*толкает тебя плечом* Пардон!']),
      opts: (e) => e.offer.caught ? [
        { t: 'Потребовать откуп', f: () => { const g = rnd(8, 20); G.P.gold += g; SO.fe(e.npc, 20); RM.feel(e, 'f'); return 'Л-ладно! Вот, возьми и не зови стражу! (' + Gm.money(g) + ')'; } },
        { t: 'Отпустить', f: () => { Gm.op(e.npc, 8); SO.tr(e.npc, 6); RM.feel(e, 'u'); SO.note(e.npc, 'Ты {его|её} поймал[|а] — и отпустил[|а].'); return 'Ты... отпускаешь? Я запомню. Должок за мной.'; } },
        { t: 'Позвать стражу', f: () => { e.flee = 1; Gm.op(e.npc, -20); return 'close'; } },
      ] : [{ t: 'Проверить кошелёк', f: () => 'Кошелёк на месте... но как будто легче?' }],
    },
    alms: {
      line: () => pick(['Подай, добр[ый|ая] человек, на хлеб...', 'Не пожалей медяк — боги всё видят.', 'Три дня не ел{|а}... хоть корку...']),
      opts: (e) => [
        { t: 'Подать монетку', f: () => { if (G.P.gold < 1) return 'Самому бы кто подал.'; G.P.gold -= 1; Gm.op(e.npc, 6); SO.tr(e.npc, 3); RM.feel(e, 'h'); Gm.cnt('alms'); if (Math.random() < 0.3) Gm.fx('blessed', 120); return pick(['Да хранят тебя боги!', 'Спасибо... спасибо...', 'Пусть дорога твоя будет мягкой.']); } },
        { t: 'Дать еды', f: () => { E.UI.pickItem('Что дать?', (it) => (D.items[it.b] || {}).t === 'food', (it) => { Gm.take(it.b, 1); Gm.op(e.npc, 10); SO.tr(e.npc, 5); RM.feel(e, 'h'); Gm.msg(Gm.fmt('«Да воздастся тебе!»', Gm.npc(e.npc)), '#e0d0a0'); }); return null; } },
        { t: 'Отказать', f: () => { RM.feel(e, 's'); return '*молча отходит*'; } },
      ],
    },
    child: {
      line: () => pick(['А ты правда путешественни[к|ца]? А драконов видел[|а]?', 'Эй! А у тебя меч настоящий? Можно потрогать?', 'А ты откуда? А там есть море? А чудища?']),
      opts: (e) => [
        { t: 'Рассказать байку', f: () => { Gm.op(e.npc, 8); RM.feel(e, 'u'); for (const f of Gm.npc(e.npc).fam || []) Gm.op(f, 2); return pick(['Ух ты-ы-ы! А дальше?!', 'Я тоже буду путешественником! Когда вырасту!', 'Врёшь! ...Правда?!']); } },
        { t: 'Дать монетку', f: () => { if (G.P.gold < 1) return 'Нету? Ну ладно.'; G.P.gold -= 1; Gm.op(e.npc, 6); RM.feel(e, 'h'); return 'Ура! Куплю пряник!'; } },
        { t: 'Отмахнуться', f: () => { RM.feel(e, 's'); return 'Ну и пожалуйста.'; } },
      ],
    },
    hawk: {
      line: () => pick(['Лучший товар в округе! Заходи, посмотри!', 'Эй, путни[к|ца]! Для тебя — особая цена!', 'Свежее, крепкое, почти даром! Глянь хоть одним глазком!']),
      opts: (e) => [{ t: 'Посмотреть товар', f: () => { const j = D.jobs[E.Sim.job(e.npc)] || {}; E.UI.trade(e, j.shop || 'general'); return null; } }, { t: 'Не сейчас', f: () => 'Ну, ты знаешь, где меня найти!' }],
    },
    friend: {
      line: () => pick(['Эй, $pname! Рад{|а}, что ты здесь. Слушай...', 'Вот ты где! Я как раз хотел{|а} тебе кое-что сказать.', 'Друг! Иди сюда, есть новости.']),
      opts: (e) => [
        { t: 'Выслушать', f: () => { Gm.op(e.npc, 1); if (Math.random() < 0.3) { const b = pick(['bread', 'apple', 'cheese']); Gm.give(b, 1, true); return 'Держи вот, в дорогу. И береги себя. (тебе дали ' + D.items[b].n.toLowerCase() + ')'; } return Dlg.rumor(e); } },
        { t: 'Обнять', f: () => { Gm.op(e.npc, 2); SO.tr(e.npc, 1); RM.feel(e, 'h'); return 'Ох, медведь! Задушишь!'; } },
      ],
    },
    lover: {
      line: () => pick(['Вот ты где! Я тебя везде искал{|а}.', 'Иди сюда. Просто постой рядом.', 'Я соскучил{ся|ась}. Ужасно.']),
      opts: (e) => [
        { t: 'Обнять', f: () => { SO.love(e.npc, 1); RM.feel(e, 'l'); Gm.healPlayer(Math.round(G.P.mhp * 0.05), true); return 'Тепло... не отпускай.'; } },
        { t: 'Поцеловать', f: () => { SO.love(e.npc, 2); RM.feel(e, 'l'); return '*улыбается тебе в губы*'; } },
        { t: 'Провести время вместе', f: () => RM.together(e) },
      ],
    },
    rude: {
      line: () => pick(['Ты ещё здесь? Глаза б мои тебя не видели.', 'А, это ты. Опять.', 'Иди своей дорогой, пока цел[|а].']),
      opts: (e) => [
        { t: 'Огрызнуться', f: () => { SO.rs(e.npc, 3); Gm.op(e.npc, -5); RM.feel(e, 'a'); return pick(['Ах ты...!', 'Ну-ну. Посмотрим.']); } },
        { t: 'Извиниться', f: () => { Gm.op(e.npc, 6); SO.tr(e.npc, 2); RM.feel(e, 'n'); return 'Хм. Ладно. Посмотрим, как ты себя поведёшь.'; } },
        { t: 'Вызвать на поединок', f: () => { Gm.duel(e.npc); return 'close'; } },
      ],
    },
    curious: {
      line: () => pick(['Ты не здешн[ий|яя], да? Откуда ты? Что видел[|а]?', 'Ой, новое лицо! Расскажи что-нибудь, а? Тут так скучно.', 'Постой! Ты ведь издалека? Как там, за лесом?']),
      opts: (e) => [
        { t: 'Рассказать о странствиях', f: () => { Gm.op(e.npc, 4); SO.tr(e.npc, 2); RM.feel(e, 'u'); return 'Ничего себе! А у нас тут вот что: ' + Dlg.rumor(e).replace(/^./, (c) => c.toLowerCase()); } },
        { t: 'Отмолчаться', f: () => { Gm.op(e.npc, -1); return 'Ну и ладно. Таинственн[ый|ая], значит.'; } },
      ],
    },
  };
  SO.OFFERS = OFFERS;
  SO.buyMap = function (e, price0) {
    const P = G.P, price = (e.offer && e.offer.price) || price0;
    if (P.gold < price) return 'Нет денег — нет карты.';
    P.gold -= price;
    Gm.cnt('maps_bought');
    const rid = G.map.rid != null ? G.map.rid : 0, me = G.W.regions[rid];
    const dun = G.W.regions.filter((g) => g.dun && !P.known.regions[g.id] && Math.abs(g.x - me.x) + Math.abs(g.y - me.y) < 9);
    if (dun.length && Math.random() < 0.4) { const g = pick(dun); P.known.regions[g.id] = G.S.time; return 'Карта грубая, но настоящая: место отмечено. (на карте мира — новая метка)'; }
    return 'Ты разворачиваешь карту. Это счёт из таверны, а на обороте углём нарисован... гусь. Продавец уже исчез.';
  };

  // кто и зачем подойдёт
  function approachKind(e) {
    const id = e.npc, n = Gm.npc(id), v = SO.vals(id), job = E.Sim.job(id), race = R.raceOf(n), tp = SO.temper(id);
    const adult = RM.adult(id), age = E.Sim.age(id);
    if (v.rel) return 'lover';
    if (v.op <= -25 && (has(n, 'brave') || has(n, 'proud') || has(n, 'grumpy'))) return 'rude';
    if (v.op <= -10) return null;
    if (age < 13) return Math.random() < 0.5 ? 'child' : null;
    if (job === 'beggar') return 'alms';
    if (race === 'succubus' && adult && adultP()) return Math.random() < 0.6 ? 'paid' : 'flirt';
    if (adult && adultP() && RM.likes(n) && (!RM.married(id)) && (v.love >= 25 || (tp === 'flirty' && Math.random() < 0.6))) return 'flirt';
    if (tp === 'sly') return Math.random() < 0.45 ? pick(G.map.sett >= 0 ? ['dice', 'map', 'thief', 'dice'] : ['dice', 'map']) : null;
    if (v.op >= 30 || v.fr) return 'friend';
    if (shopJob(id) && Math.random() < 0.4) return 'hawk';
    if ((has(n, 'curious') || has(n, 'chatty')) && !Gm.knows(id)) return 'curious';
    return null;
  }
  // раз в несколько ходов: может, кто-то из видимых решит подойти
  SO.approachTick = function () {
    const P = G.P, m = G.map;
    if (!P || !m || P.dead || !m.ents) return;
    if (m.ents.some((e) => e.appr && !e.dead)) return;
    if (G.S.time - (P.apprT || -999) < 35) return;
    if (m.ents.some((e) => !e.dead && (e.hostile || e.hostileToP) && U.dist(e.x, e.y, P.x, P.y) < 12)) return;
    const cand = [];
    for (const e of m.ents) {
      if (e.dead || e.kind !== 'npc' || e.npc == null || e.asleep || e.hostile || e.flee || e.duel || e.ghost || e.ghostShop != null) continue;
      if (e.apprD === Gm.day() && !RM.rel(e.npc)) continue;
      const d = U.dist(e.x, e.y, P.x, P.y);
      if (d < 2 || d > 11) continue;
      if (G.vis && !G.vis[e.y * m.w + e.x]) continue;
      cand.push(e);
    }
    if (!cand.length) return;
    const e = pick(cand), k = approachKind(e);
    e.apprD = Gm.day();
    if (!k) return;
    P.apprT = G.S.time;
    e.appr = { k, until: G.S.time + 40 };
  };
  function arrive(e) {
    const k = e.appr.k, O = OFFERS[k];
    e.appr = null;
    if (!O) return;
    const n = Gm.npc(e.npc);
    const line = Gm.fmt(O.line(), n);
    e.offer = { k, line, until: G.S.time + 90 };
    e.wait = G.S.time + 15;
    RM.feel(e, { flirt: 'l', paid: 'c', dice: 'c', map: 'c', thief: 'n', alms: 's', child: 'u', hawk: 'h', friend: 'h', lover: 'l', rude: 'a', curious: 'u' }[k] || 'n');
    // карманник: заметишь или нет
    if (k === 'thief') {
      const P = G.P;
      if (roll(0.2 + PS('dex') * 0.03 + PS('luck') * 0.03)) { e.offer.caught = 1; e.offer.line = line + ' — и ты ловишь чужую руку у своего кошелька!'; }
      else { const g = Math.min(P.gold, rnd(3, 12)); if (g > 0) { P.gold -= g; e.stole = g; } e.wait = 0; e.flee = 1; e.offer.until = G.S.time + 3; setTimeout(() => Gm.msg('Ты не сразу замечаешь, что кошелёк стал легче...', '#c0a080'), 2500); }
    }
    SO.say(e, e.offer.line, k);
  }
  // реплика над головой и в журнале
  SO.bubbles = [];
  const KC = { flirt: '#f0a8c8', paid: '#f0a8c8', lover: '#ff9ac0', dice: '#c8a8f0', map: '#c8a8f0', thief: '#c8a8f0', rude: '#f08a7a', alms: '#d8c8a0', child: '#e8e0b0', hawk: '#f0d080', friend: '#a8e0a0', curious: '#c8d8f0' };
  SO.say = function (e, s, k) {
    const name = Dlg.label(e);
    Gm.msg(name + ': «' + s + '»' + (k && k !== 'thief' ? '  [E — ответить]' : ''), KC[k] || '#e8dcb0');
    SO.bubbles.push({ e, s, c: KC[k] || '#e8dcb0', t0: performance.now(), until: performance.now() + 6500 });
    if (SO.bubbles.length > 4) SO.bubbles.shift();
  };
  // шаг жителя: подойти к тебе или подождать рядом
  const Ent = E.Ent;
  const npcAct0 = Ent.npcAct;
  Ent.npcAct = function (e) {
    const P = G.P;
    if (!e.hostile && !e.flee && !e.duel) {
      if (e.appr) {
        const d = U.dist(e.x, e.y, P.x, P.y);
        if (G.S.time > e.appr.until || d > 16) e.appr = null;
        else if (d <= 1 || (d <= 2 && !Ent.stepToward(e, false))) { arrive(e); return; }
        else { if (!Ent.stepToward(e, false)) Ent.wander(e, 0.5); return; }
      }
      if (e.wait && G.S.time < e.wait) {
        if (U.dist(e.x, e.y, P.x, P.y) > 3) Ent.stepToward(e, false);
        return;
      }
      if (e.wait) { e.wait = 0; e.path = null; }
    }
    return npcAct0.apply(this, arguments);
  };
  // каждый ход мира — проверка
  const tick0 = Gm.tick;
  Gm.tick = function () {
    const r = tick0.apply(this, arguments);
    if (G.turn % 6 === 0 && Math.random() < 0.35) { try { SO.approachTick(); } catch (err) { console.warn('approach', err); } }
    return r;
  };

  // ---------- реплики над головами (вид от первого лица) ----------
  const hud0 = UI.drawHUD3D;
  UI.drawHUD3D = function (ctx, t, v) {
    if (hud0) hud0.apply(this, arguments);
    const V3 = UI.V3, now = performance.now();
    if (!V3 || !V3.proj || !SO.bubbles.length) return;
    for (let i = SO.bubbles.length - 1; i >= 0; i--) if (now > SO.bubbles[i].until || SO.bubbles[i].e.dead) SO.bubbles.splice(i, 1);
    const fpx = Math.max(10, Math.round(t.fpx * 0.82));
    ctx.save();
    ctx.font = fpx + 'px ' + t.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const b of SO.bubbles) {
      const e = b.e, s = UI.trackPos ? UI.trackPos(e) : [e.x, e.y], m = G.map;
      if (E.FOV && E.FOV.los && !E.FOV.los(m, G.P.x, G.P.y, e.x, e.y)) continue;
      const gx = v.gox + s[0] + 0.5, gz = v.goz + s[1] + 0.5;
      const gy = (UI.Hgt && UI.Hgt.groundAt ? UI.Hgt.groundAt(gx, gz) : 0) + 2.05;
      const p = V3.proj(gx, gy, gz);
      if (!p || p[2] <= 0) continue;
      const d = V3.camPos ? Math.hypot(s[0] + 0.5 - V3.camPos.x, s[1] + 0.5 - V3.camPos.z) : 0;
      if (d > 18) continue;
      const lines = U.wrap(b.s, 34).slice(0, 3);
      const lh = fpx * 1.2, w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + fpx, h = lines.length * lh + fpx * 0.5;
      const a = Math.min(1, (b.until - now) / 800, (now - b.t0) / 200);
      const x = U.clamp(p[0], v.vx0 + w / 2 + 4, v.vx0 + v.vw - w / 2 - 4), y = U.clamp(p[1] - h / 2 - 6, v.vy0 + h / 2 + 4, v.vy0 + v.vh - h);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(16,12,18,0.82)'; ctx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h));
      ctx.strokeStyle = b.c; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x - w / 2) + 0.5, Math.round(y - h / 2) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
      ctx.beginPath(); ctx.moveTo(x - 5, y + h / 2); ctx.lineTo(x, y + h / 2 + 6); ctx.lineTo(x + 5, y + h / 2); ctx.fillStyle = 'rgba(16,12,18,0.82)'; ctx.fill();
      ctx.fillStyle = b.c;
      lines.forEach((l, i) => ctx.fillText(l, x, y - h / 2 + fpx * 0.25 + lh * (i + 0.5)));
    }
    ctx.restore();
  };

  // ---------- последствия дел: подарки и удары ----------
  const gift0 = Dlg.gift;
  Dlg.gift = function (e, it) {
    const before = e.npc != null ? Gm.opinion(e.npc) : 0;
    const r = gift0.apply(this, arguments);
    if (e.npc != null) { const d = Gm.opinion(e.npc) - before; if (d > 0) { SO.tr(e.npc, 2); SO.note(e.npc, 'Ты подарил[|а] {ему|ей} ' + E.Items.name(it).toLowerCase() + '.'); } }
    return r;
  };

  // ---------- окно «Отношения» (N) ----------
  const bar = (v, lo) => { const k = U.clamp(Math.round(((v - (lo || 0)) / (100 - (lo || 0))) * 8), 0, 8); return '█'.repeat(k) + '░'.repeat(8 - k); };
  SO.bars = function (id) {
    const v = SO.vals(id);
    return [['Дружба', v.op, -100, '#90d080'], ['Доверие', v.tr, -100, '#80b8e0'], ['Уважение', v.rs, -100, '#e0c070'], ['Симпатия', v.love, 0, '#f0a0c8'], ['Страх', v.fe, 0, '#d07060']];
  };
  UI.relations = function () {
    const P = G.P;
    const ids = Object.keys(P.known.npc).map(Number).filter((id) => P.known.npc[id] && P.known.npc[id].name && G.W.npcs[id]);
    const score = (id) => { const v = SO.vals(id); return (v.rel ? 1000 : 0) + v.love * 2 + Math.abs(v.op) + Math.abs(v.tr) + v.fe; };
    ids.sort((a, b) => score(b) - score(a));
    UI.list({
      title: 'Отношения', w: 84, name: 'relations',
      header: ids.length ? 'Те, кого ты знаешь по имени. Дружба, доверие, уважение, симпатия и страх — у каждого свои.' : 'Ты ещё ни с кем не познакомил[ся|ась] по-настоящему.',
      items: ids.map((id) => {
        const n = Gm.npc(id), [sg, sc] = SO.stage(id), v = SO.vals(id), tg = SO.tags(id);
        const alive = E.Sim.isAlive(id);
        return { id, t: n.first + (n.sur ? ' ' + n.sur : '') + ' — ' + sg + (tg.length ? ' (' + tg.join(', ') + ')' : '') + (alive ? '' : ' †'), c: alive ? sc : '#807878', r: '☺' + v.op + ' ♥' + v.love, f: () => 'keep' };
      }),
      tip: (it) => {
        const id = it.id, n = Gm.npc(id), q = st(id), sid = E.Sim.settOf(id);
        const out = [n.first + (n.sur ? ' ' + n.sur : ''), U.cap(R.raceName(R.raceOf(n), n.sex)) + (sid >= 0 ? ', ' + G.W.settlements[sid].name : '') + (SO.temper(id) === 'flirty' ? ' · кокетлив{ый|ая}' : SO.temper(id) === 'sly' ? ' · хитр{ый|ая}' : '')];
        out[1] = Gm.fmt(out[1], n);
        for (const [nm, val, lo] of SO.bars(id)) out.push(nm.padEnd(9) + bar(val, lo) + ' ' + val);
        for (const m of (q.pm || []).slice().reverse()) out.push('• ' + Gm.fmt(m.s, n));
        return out;
      },
      empty: '—',
    });
  };
})(window.EOF);
