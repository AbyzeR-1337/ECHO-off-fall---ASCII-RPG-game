'use strict';
// Земли в игре: чьи это владения, кто тут живёт, во что верят и как принято.
// Входишь в посёлок — узнаёшь, чьё баронство; спроси местных — расскажут о графе, герцоге, обычаях и запретах.
// Обычаи меняют цены и то, как тебя встречают. Суккубы хитры: торгуются, льстят, могут облегчить кошель
// и предлагают сделки — золото или силу за годы твоей жизни.
(function (E) {
  const U = E.U, D = E.D, G = E.G, Gm = E.Gm, Dlg = E.Dlg, R = E.Realms;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const W = () => G.W;

  // народ человека (родившиеся уже в игре — по родне)
  R.raceOf = function (n) {
    if (!n) return 'human';
    if (n.race) return n.race;
    for (const f of n.fam || []) { const q = Gm.npc(f); if (q && q.race) return q.race; }
    return 'human';
  };
  const lordName = (t) => {
    if (!t || t.lord < 0) return null;
    const n = Gm.npc(t.lord);
    if (!n || !E.Sim.isAlive(t.lord)) return null;
    return (t.succ ? (n.sex === 'f' ? 'Матрона' : 'Хозяин') : U.cap(R.lordWord(t.rank, n.sex))) + ' ' + n.first + (n.sur ? ' ' + n.sur : '');
  };
  R.lordName = lordName;
  // титул человека, если он правит
  R.titleWord = function (id) {
    const n = Gm.npc(id);
    if (!n || n.lordOf == null) return null;
    const t = W().titles[n.lordOf];
    if (!t || t.lord !== id) return null;
    return t.succ ? (n.sex === 'f' ? 'Матрона' : 'Хозяин') : U.cap(R.lordWord(t.rank, n.sex));
  };
  R.landOfMap = function (m) {
    if (!m || m.kind !== 'over' || !m.region) return null;
    const tid = m.sett >= 0 && W().settlements[m.sett].title != null ? W().settlements[m.sett].title : m.region.title;
    return tid != null && tid >= 0 ? W().titles[tid] : null;
  };
  // строка «чьи это земли»
  R.chainText = function (t) {
    const ch = R.chain(W(), t);
    const parts = [];
    for (const q of ch) { const l = lordName(q); parts.push(q.name + (l ? ' (' + (q.succ ? l : l[0].toLowerCase() + l.slice(1)) + ')' : q.lord >= 0 ? ' (господина нет — место пустует)' : '')); }
    const f = t.realm >= 0 ? W().factions[t.realm] : null;
    if (f) parts.push(f.name);
    return parts.join(' — ');
  };
  R.cultText = function (cu, short) {
    if (!cu) return '';
    const god = D.godById[cu.faith];
    const cs = cu.customs.map((c) => R.custom(c)).filter(Boolean);
    const faith = god ? 'Вера здесь — ' + god.n + ' (' + god.d.replace(/\.$/, '').toLowerCase() + ')' : 'Здесь чтят старых богов';
    if (short) return 'Живут здесь больше ' + R.racePl(cu.race) + '. ' + faith + '.';
    return 'Живут здесь больше ' + R.racePl(cu.race) + (cu.minor && cu.minor.length ? ', есть и ' + cu.minor.map((r) => R.racePl(r)).join(' и ') : '') + '. ' +
      faith + '. Здесь ' + cu.life + '. ' +
      'Обычаи: ' + cs.map((c) => c.n + ' — ' + c.d).join('; ') + '. ' +
      'Главный праздник — ' + cu.feast + '. Закон: ' + cu.law + '. Здесь ' + cu.taboo + '.';
  };

  // ---------- прибытие ----------
  const arr0 = Gm.describeArrival;
  Gm.describeArrival = function (m, how) {
    arr0.apply(this, arguments);
    const t = R.landOfMap(m);
    if (!t) return;
    const P = G.P;
    P.known.lands = P.known.lands || {};
    const cu = W().cultures[t.cult];
    if (m.sett >= 0 && !(G.S.sett[m.sett] && G.S.sett[m.sett].destroyed)) {
      if (!P.known.lands[t.id]) {
        P.known.lands[t.id] = G.S.time;
        Gm.msg(R.chainText(t) + '.', '#c8b890');
        if (cu) Gm.msg(cu.succ ? 'Город суккубов. Здесь улыбаются слаще, чем где-либо, — и считают каждую монету.' : R.cultText(cu, true), '#b0a080');
      } else { const l = lordName(t); Gm.msg(t.name + (l ? ' — земли: ' + l : '') + '.', '#a89870'); }
    } else if (!P.known.lands['r' + t.id] && t.rank) {
      P.known.lands['r' + t.id] = 1;
      Gm.msg('Это земли: ' + R.chain(W(), t).slice(-1)[0].name + '.', '#a89870');
    }
  };

  // ---------- имена с титулом ----------
  const label0 = Dlg.label;
  Dlg.label = function (e) {
    const s = label0.apply(this, arguments);
    if (e.npc == null || !Gm.knows(e.npc)) return s;
    const tw = R.titleWord(e.npc);
    return tw ? tw + ' ' + s : s;
  };
  const self0 = Dlg.self;
  Dlg.self = function (e) {
    let s = self0.apply(this, arguments);
    const n = Gm.npc(e.npc), race = R.raceOf(n);
    const add = [];
    if (race === 'succubus') add.push(n.sex === 'f' ? 'Я суккуба, сладк[ий|ая]. Не бойся — я кусаюсь только за деньги.' : 'Я инкуб. Ты ведь слышал[|а] о таких, правда?');
    else if (race !== 'human') add.push('Я ' + R.raceName(race, n.sex) + '. ' + { elf: 'Мой род старше этих городов.', dwarf: 'Наш род помнит каждую жилу в этих горах.', orc: 'Мой род — род Клыка. Не забывай.', halfling: 'Мы маленькие, но едим за троих.', darkelf: 'Да, из тех, кого пугают детей. Не верь всему, что про нас болтают.', goblin: 'И нет, я ничего у тебя не крал{|а}. Пока.', lizard: 'Тёплый камень и тихая вода — больше нам ничего не нужно.', catfolk: 'Мур. Не гладь без спросу — поцарапаю.', tiefling: 'Рога — от прабабки. Характер — тоже.', giant: 'Не бойся. Я осторожно хожу. Почти всегда.', taur: 'Да, рожки настоящие. И колокольчик — тоже. Долыни меня по нему узнают.', fae: 'Не смотри так. Крылья настоящие, просто летать на них — только над травой.', merfolk: 'Мы пришли из моря. Суша сухая, но здесь варят такой суп!', vampire: 'Я давно живу. Очень давно. И нет — я не кусаюсь. Без спросу.', wolfkin: 'Чую, ты с дороги. Пахнешь пылью и костром.', femboy: 'Нравится, как я одет? Я сам шил. Ну, почти сам.' }[race]);
    if (n.fb) add.push(pick(['Да, я ношу юбку. Мне так нравится — и тебе советую не смеяться.', 'Мама говорит, я самый красивый сын в округе. Я с ней согласен.', 'Ленты, серьги, подведённые глаза — что такого? Мужчиной я от этого быть не перестал.']));
    const tw = R.titleWord(e.npc);
    if (tw) { const t = W().titles[n.lordOf]; add.push(t.succ ? 'Этот город — мой. И всё, что в нём продаётся.' : 'Я — ' + tw.toLowerCase() + ', и ' + t.name.replace(/^\S+/, (w) => w.toLowerCase()) + ' — под моей рукой.'); }
    if (add.length) { s += ' ' + Gm.fmt(add.join(' '), n); const k = G.P.known.npc[e.npc]; if (k) k.notes = s; }
    return s;
  };

  // ---------- приветствие по обычаю и народу ----------
  const HELLO = {
    elf: ['Да будет тих твой путь.', 'Листья шепчут о тебе, странник.', 'Ты шумно ходишь. Но добро пожаловать.'],
    dwarf: ['Крепкой кирки и тёплого горна!', 'Хм. Ещё один долговязый.', 'Камень помнит всех. Тебя — пока нет.'],
    orc: ['Хрр. Чего надо, чужак?', 'Сила и честь. Говори коротко.', 'Ты пахнешь дорогой. Это хорошо.'],
    halfling: ['Ой, гость! Пирожка хотите?', 'Заходи, заходи, только сапоги вытри!', 'Ты уже обедал[|а]? А второй раз?'],
    succubus: ['Ах, новое лицо... и новый кошелёк?', 'Как[ой|ая] ты напряжённ[ый|ая]. Хочешь, я помогу расслабиться — за скромную плату?', 'Мы ведь договоримся, правда? Здесь все договариваются.', 'Не смотри так. Я ещё ничего у тебя не взял{|а}.'],
    darkelf: ['Ты смотришь, как все: со страхом. Скучно.', 'Под землёй солнце не нужно. Здесь — терплю.', 'Говори. Только без резких движений.'],
    goblin: ['Эй-эй! Купи чего, а? Почти не краденое!', 'Блестяшки есть? Меняю на что угодно!', 'Ты не стражник? Ну и хорошо, хи-хи.'],
    lizard: ['Ссс... тёплый день, правда?', 'Мы видим, ты ходишь. Ходи дальше — или говори.', 'Река всё помнит. И мы тоже.'],
    catfolk: ['Мррр... чем пахнешь? Рыбкой? Нет? Жаль.', 'Привет! Не наступи мне на хвост.', 'Солнце сегодня мягкое. Как раз чтобы полежать.'],
    tiefling: ['Да, рога. Нет, не кусаюсь. Что-то ещё?', 'Не пялься — лучше говори, чего хочешь.', 'Меня мало кто зовёт по имени. Обычно — «эй, ты, рогатая».'],
    taur: ['Му... то есть, добрый день! Привычка.', 'Молочка не хочешь? Свежее, от моих долыней.', 'Ох, путни[к|ца]! Садись, в ногах правды нет.'],
    fae: ['Ой! Ты меня чуть не раздавил[|а]. Шучу. Привет!', 'Пыльцы не хочешь? Немножко — и сны будут цветные.', 'Тише, тише. Здесь цветы спят.'],
    merfolk: ['Сухопутный! Как вы тут дышите этим сухим воздухом?', 'Волна тебе в паруса, путни[к|ца].', 'Рыбы не продаю. Родня.'],
    vampire: ['Добрый вечер. Да, для меня всегда вечер.', 'Не стой на солнце, тебе же жарко. Иди в тень. Ко мне.', 'Какая у тебя... звонкая кровь. В смысле — голос.'],
    wolfkin: ['*принюхивается* Свои. Проходи.', 'Луна сегодня полная. Ты слышал[|а], как стая пела?', 'Здорово, путни[к|ца]. Чужих тут не любят, но ты не чужой — ты пахнешь честно.'],
    femboy: ['Привет-привет! Ой, у тебя пыль на плаще. Дай отряхну.', 'Ты на мои ленты смотришь? Нравятся?', 'Заходи, не стесняйся. Я не кусаюсь. Почти.'],
    giant: ['ХО! Маленький гость! Ой, прости, громко.', 'Не стой под ногами — затопчу ненароком.', 'Садись. Нет, не на меня.'],
    fb: ['Привет! Ты на меня так смотришь... что-то не так с лентой?', 'О, путник! Нравится моя вышивка? Сам вышивал.'],
  };
  const greet0 = Dlg.greet;
  Dlg.greet = function (e) {
    const g = greet0.apply(this, arguments);
    if (e.npc == null || e.asleep) return g;
    const n = Gm.npc(e.npc), race = R.raceOf(n), op = Gm.opinion(e.npc);
    if (op < -15) return g;
    if (n.fb && Math.random() < 0.35) return pick(HELLO.fb);
    if (race !== 'human' && HELLO[race] && Math.random() < (race === 'succubus' ? 0.7 : 0.4)) return pick(HELLO[race]);
    const sid = E.Sim.settOf(e.npc), cu = sid >= 0 ? R.cultOf(W(), sid) : null;
    if (cu && !G.P.known.npc[e.npc] && Math.random() < 0.5) {
      if (cu.customs.includes('bread')) return 'Хлеб да соль, путник. Не откажи — обидишь.';
      if (cu.customs.includes('guest')) return 'Гость в дом — боги в дом. Чем помочь?';
    }
    return g;
  };

  // ---------- первая встреча и обычаи ----------
  const onTalk0 = Dlg.onTalk;
  Dlg.onTalk = function (e) {
    const first = e.npc != null && !G.P.known.npc[e.npc];
    onTalk0.apply(this, arguments);
    if (e.npc == null) return;
    const n = Gm.npc(e.npc), sid = E.Sim.settOf(e.npc), cu = sid >= 0 ? R.cultOf(W(), sid) : null;
    if (first && cu) for (const c of cu.customs) { const d = R.custom(c); if (d && d.op) Gm.op(e.npc, d.op); }
    // суккубы: ловкие пальцы
    if (R.raceOf(n) === 'succubus' && !(E.Romance && E.Romance.isLover(e.npc))) {
      const st = E.Sim.st(e.npc), day = Gm.day(), P = G.P;
      if (st.pick !== day && P.gold > 8 && Math.random() < 0.3 - Math.min(0.2, (P.st.int + P.st.luck) * 0.006)) {
        st.pick = day;
        const q = Math.min(P.gold, 2 + Math.floor(Math.random() * 7));
        P.gold -= q;
        e.mood = 'c'; e.moodT = performance.now();
        Gm.msg(Gm.fmt('{Он|Она} так мило смеётся... а кошель почему-то стал легче. (−' + q + ')', n), '#d080b0');
      }
    }
  };
  const price0 = Dlg.priceMul;
  Dlg.priceMul = function (e, b, buy) {
    let m = price0.apply(this, arguments);
    const sid = e.npc != null ? E.Sim.settOf(e.npc) : -1;
    const cu = sid >= 0 ? R.cultOf(W(), sid) : null;
    if (cu) {
      for (const c of cu.customs) { const d = R.custom(c); if (d && d.price) m *= buy ? d.price : 2 - d.price; }
      if (cu.succ) m *= buy ? 1.2 : 0.85;
    }
    // свой народ — свои цены
    if (e.npc != null && G.P.race && R.raceOf(Gm.npc(e.npc)) === G.P.race) m *= buy ? 0.95 : 1.03;
    return m;
  };

  // подарок видно по лицу
  const gift0 = Dlg.gift;
  Dlg.gift = function (e) {
    const before = e.npc != null ? (E.Sim.st(e.npc).op || 0) : 0;
    const r = gift0.apply(this, arguments);
    if (e.npc != null) { const d = (E.Sim.st(e.npc).op || 0) - before; e.mood = d > 15 ? 'h' : d < 0 ? 'a' : d > 4 ? 'h' : 'n'; e.moodT = performance.now(); }
    return r;
  };
  // ---------- разговоры о землях и сделки ----------
  const opts0 = Dlg.options;
  Dlg.options = function (e) {
    const opts = opts0.apply(this, arguments);
    const id = e.npc;
    if (id == null || e.asleep || e.ghost || Gm.fxFlag('mute')) return opts;
    const n = Gm.npc(id), age = E.Sim.age(id);
    const at = Math.max(0, opts.findIndex((o) => o.t === 'Подарить...'));
    const extra = [];
    if (age >= 12 && Gm.opinion(id) > -40) extra.push({ t: 'Расспросить о здешних землях', f: () => R.aboutLand(e) });
    if (R.raceOf(n) === 'succubus' && age >= 18) extra.push({ t: 'Заключить сделку', f: () => { R.deal(e); return null; } });
    opts.splice(at, 0, ...extra);
    return opts;
  };
  R.aboutLand = function (e) {
    const sid = E.Sim.settOf(e.npc), n = Gm.npc(e.npc);
    const t = sid >= 0 ? R.titleOf(W(), sid) : R.landOfMap(G.map);
    if (!t) return 'Здесь ничьи земли. Никто не правит — никто и не защитит.';
    const cu = W().cultures[t.cult];
    G.P.known.lands = G.P.known.lands || {};
    G.P.known.lands[t.id] = G.P.known.lands[t.id] || G.S.time;
    G.P.known.cult = G.P.known.cult || {};
    G.P.known.cult[t.cult] = 1;
    const own = R.titleWord(e.npc);
    const head = own ? 'Мои земли: ' + R.chainText(t) + '.' : 'Это ' + R.chainText(t) + '.';
    let s = head + ' ' + R.cultText(cu);
    if (cu && cu.succ) s = head + ' Здесь ' + cu.life + '. Закон один: ' + cu.law + '. И запомни: ' + cu.taboo + '.';
    const tr = n.traits || [];
    if (tr.includes('liar') && Math.random() < 0.3) s += ' Хотя... может, я что и путаю.';
    return s;
  };
  // сделка с суккубой: годы жизни — за золото или за силу
  R.deal = function (e) {
    const n = Gm.npc(e.npc), P = G.P;
    e.mood = 'c'; e.moodT = performance.now();
    const STAT = ['str', 'dex', 'con', 'int', 'fai', 'luck'];
    const s = STAT[(e.npc + Gm.day()) % STAT.length];
    E.UI.menu(Gm.fmt(n.sex === 'f' ? '«Всё имеет цену, мил[ый|ая]. Даже ты.»' : '«Я не обманываю. Я просто не договариваю.»', n), [
      { t: 'Год жизни — за кошель (60 монет)', f: () => { P.ageAdd = (P.ageAdd || 0) + 1; Gm.give('gold', 60); Gm.op(e.npc, 5); Gm.msg(Gm.fmt('{Его|Её} губы касаются твоего виска. Ты чувствуешь себя чуть старше. И чуть богаче.', n), '#d080b0'); } },
      { t: 'Пять лет жизни — за силу (' + E.STATN[s] + ' +1)', f: () => { P.ageAdd = (P.ageAdd || 0) + 5; P.base[s] = (P.base[s] || 5) + 1; Gm.calc(); Gm.op(e.npc, 8); Gm.msg('Холод проходит по жилам — и уходит, оставив силу. И пять лет, которых больше нет.', '#d080b0'); } },
      { t: 'Тайну — за 25 монет', f: () => { if (P.gold < 25) { Gm.msg('«Без монет тайны не рассказывают.»', '#c090b0'); return; } P.gold -= 25; const r = E.Sim.rumorsFor(e.npc); Gm.msg(r && r.length ? '«' + pick(r).s + '»' : '«Тайна в том, что тайн нет. Спасибо за монеты.»', '#d0a0c0'); } },
      { t: 'Отказаться', f: () => { Gm.msg(Gm.fmt('«Жаль. Ты бы мне понравил[ся|ась] — ещё больше.»', n), '#c090b0'); } },
    ]);
  };
})(window.EOF);
