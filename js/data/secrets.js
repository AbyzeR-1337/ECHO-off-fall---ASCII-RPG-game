'use strict';
// Тайны предметов. Нигде не описаны. Срабатывают на события мира.
(function (E) {
  const D = E.D;
  const T = E.T;
  const found = (id) => {
    const Gm = E.Gm, P = E.G.P;
    if (!P.secrets[id]) { P.secrets[id] = E.G.S.time; Gm.cnt('secrets'); Gm.xp(60 + 20 * Object.keys(P.secrets).length); }
  };
  D.secretFound = found;

  D.secrets = [
    // Кружка + вода из конкретного ручья в первую грозу весны
    { on: 'fill', test: (c) => c.item.b === 'old_mug' && E.G.map.tiles[c.idx] === T.STREAM && E.Gm.regionId() === E.G.W.special.stream && E.Gm.firstSpringStorm(),
      run: (c) => {
        const Gm = E.Gm;
        Object.assign(c.item, Gm.mkItem('holy_vessel'), { u: c.item.u, water: 'holy' });
        Gm.msg('Вода в кружке на миг вспыхивает светом. Кружка стала тяжелее.', '#fff0b0');
        found('mug');
      } },
    // Камень в разрушенном храме — до разговора с первым жрецом
    { on: 'pickup', test: (c) => c.item.b === 'temple_stone' && !c.item.touched,
      run: (c) => {
        c.item.touched = 1;
        if (!E.G.P.flags.talkedPriest) { E.G.P.flags.stoneBlessed = 1; c.item.warm = 1; E.Gm.msg('Камень тёплый.', '#c0c0c0'); found('stone'); }
      } },
    // Последний удар старым молотом по каменному существу открывает проход
    { on: 'kill', test: (c) => c.weapon && c.weapon.b === 'old_hammer' && c.target.tags && c.target.tags.includes('stone') && !E.G.map.dim,
      run: (c) => {
        const Gm = E.Gm;
        Gm.setTile(c.target.x, c.target.y, T.PORTAL);
        Gm.setFeature(c.target.x, c.target.y, { k: 'link', to: 'dim:depths:0:0', name: 'трещина в камне' });
        Gm.msg('Камень раскалывается с долгим, низким звоном. За ним — проход вниз.', '#ffd080');
        found('hammer');
      } },
    // Сломанные часы в 3:17
    { on: 'use', test: (c) => c.item.b === 'broken_clock',
      run: (c) => {
        const Gm = E.Gm;
        if (Gm.hour() === 3 && Math.abs(Gm.minute() - 17) <= 2 && !E.G.map.dimName) {
          Gm.msg('Стрелки дрогнули. И пошли назад.', '#f0d080');
          Gm.cnt('time_dim');
          E.G.P.ret = { key: E.G.map.key, x: E.G.P.x, y: E.G.P.y };
          Gm.teleport('dim:time:1:1', -1, -1);
          found('clock');
        } else if (E.G.map.dimName === 'time') {
          Gm.msg('Стрелки дрогнули. Ты снова там, где был[|а].', '#f0d080');
          Gm.returnFromDim();
        } else Gm.msg('Часы молчат.');
        return true;
      } },
    // Осколок зеркала: полночь, полнолуние, у воды
    { on: 'use', test: (c) => c.item.b === 'mirror_shard',
      run: (c) => {
        const Gm = E.Gm;
        const h = Gm.hour(), mid = h === 0 || (h === 23 && Gm.minute() >= 30);
        if (mid) Gm.cnt('mirror');
        if (E.G.map.dimName === 'mirror') { Gm.msg('Осколок теплеет. Отражение отпускает тебя.', '#d8e4f0'); Gm.returnFromDim(true); return true; }
        if (mid && Gm.fullMoon() && Gm.nearWater(E.G.P.x, E.G.P.y, 1) && E.G.map.region) {
          const r = E.G.map.region;
          Gm.msg('В осколке отражается луна. Потом — ты. Потом — не ты.', '#d8e4f0');
          E.G.P.ret = { key: E.G.map.key, x: E.G.P.x, y: E.G.P.y };
          Gm.teleport('dim:mirror:' + (E.C.WS - 1 - r.x) + ':' + r.y, E.C.MW - 1 - E.G.P.x, E.G.P.y);
          found('mirror');
        } else Gm.msg(mid ? 'Осколок на миг становится холодным.' : 'В осколке — твоё лицо. Почти.');
        return true;
      } },
    // Звёздный осколок можно проглотить
    { on: 'use', test: (c) => c.item.b === 'star_shard',
      run: (c) => {
        const Gm = E.Gm;
        Gm.removeItem(c.item);
        E.G.P.flags.ateStar = 1;
        E.G.P.base.int += 2;
        Gm.fx('star', 60 * 24 * 7);
        Gm.msg('Ты глотаешь осколок. Он горит внутри, но не обжигает.', '#ffffa0');
        found('star');
        return true;
      } },
    // Сердцевина грибницы
    { on: 'use', test: (c) => c.item.b === 'spore_heart',
      run: (c) => {
        const Gm = E.Gm;
        Gm.removeItem(c.item);
        E.G.P.flags.ateSporeHeart = 1;
        Gm.fx('spores', 60 * 24 * 30);
        Gm.msg('Мягкое, тёплое, сладковатое. Под кожей что-то шевельнулось и затихло.', '#e080ff');
        found('sporeheart');
        return true;
      } },
    // Ракушка во время пробуждения океана
    { on: 'use', test: (c) => c.item.b === 'shell',
      run: (c) => {
        const Gm = E.Gm;
        if (Gm.event('ocean') && Gm.nearWater(E.G.P.x, E.G.P.y, 6)) {
          const pr = E.G.W.prayers.find((p) => p.god === 'deep' && p.fxId === 'gills' && !E.G.P.prayers.includes(p.id)) || E.G.W.prayers.find((p) => p.god === 'deep' && !E.G.P.prayers.includes(p.id));
          Gm.msg('В ракушке — не шум. Голос. Он что-то поёт тебе.', '#7ab0f0');
          if (pr) Gm.learn(pr.id, 'Море');
          found('shell');
        } else Gm.msg('Шумит.');
        return true;
      } },
    // Колокольчик без языка звенит в Пустоте
    { on: 'use', test: (c) => c.item.b === 'bell',
      run: () => {
        const Gm = E.Gm;
        if (E.G.map.dimName === 'void') {
          Gm.msg('Колокольчик звенит. В пустоте звук ложится далеко-далеко. Что-то поворачивается к тебе.', '#a0a0ff');
          if (!E.G.S.boss.b_void_judge || !E.G.S.boss.b_void_judge.dead) Gm.spawnBoss('b_void_judge', E.G.P.x + 4, E.G.P.y);
          found('bell');
        } else Gm.msg('Ни звука.');
        return true;
      } },
    // Огарок свечи в Бездне
    { on: 'use', test: (c) => c.item.b === 'candle',
      run: (c) => {
        const Gm = E.Gm;
        if ((E.G.map.depth || 0) >= 10) {
          c.item.lit = 1; c.item.light = 8; c.item.n = 'Негасимая свеча';
          Gm.msg('Фитиль вспыхивает. Пламя не колышется — ему не от чего.', '#ffe0a0');
          found('candle');
        } else Gm.msg('Огарок слишком мал, чтобы светить долго. Ты бережёшь его.');
        return true;
      } },
    // Странное семечко в пепле
    { on: 'use', test: (c) => c.item.b === 'seed',
      run: (c) => {
        const Gm = E.Gm, P = E.G.P;
        const t = Gm.tileAt(P.x, P.y);
        if (t === T.ASH || t === T.BLACKSNOW) {
          Gm.removeItem(c.item);
          let px = P.x + 1, py = P.y;
          Gm.setTile(px, py, T.SAPLING);
          E.G.S.flags.sapling = { key: E.G.map.key, x: px, y: py, t: E.G.S.time };
          P.flags.planted = 1;
          Gm.msg('Ты закапываешь семечко в пепел. Ничего не происходит. Пока.', '#9ae07a');
          found('seed');
        } else Gm.msg('Здесь оно не взойдёт. Ты почему-то это знаешь.');
        return true;
      } },
    // Соль: круг, через который не проходят мёртвые
    { on: 'use', test: (c) => c.item.b === 'salt',
      run: (c) => {
        const Gm = E.Gm;
        Gm.take('salt', 1);
        E.G.P.saltCircle = { x: E.G.P.x, y: E.G.P.y, until: E.G.S.time + 240, key: E.G.map.key };
        Gm.msg('Ты рассыпаешь соль кругом.');
        return true;
      } },
    // Обрывок карты
    { on: 'use', test: (c) => c.item.b === 'map_scrap',
      run: () => {
        const Gm = E.Gm, S = E.G.S;
        const t = S.cyc && E.G.W.cyclic[0];
        const r = Gm.region();
        if (t && r) {
          const rr = E.G.W.regions[t];
          Gm.msg('Очертания берега... Похоже на то, что ' + E.U.dirWord(rr.x - r.x, rr.y - r.y) + '.', '#c0b090');
        } else Gm.msg('Берег, которого ты не помнишь.');
        return true;
      } },
    // Компас без стрелки тянет к недолговечным местам
    { on: 'use', test: (c) => c.item.b === 'compass',
      run: () => {
        const Gm = E.Gm;
        const tgt = Gm.nearestTemp();
        const r = Gm.region();
        if (tgt && r) { Gm.msg('Руку тянет ' + E.U.dirWord(tgt.x - r.x, tgt.y - r.y).replace('на ', 'на ') + '.', '#c0c0c0'); found('compass'); }
        else Gm.msg('Ничего не тянет.');
        return true;
      } },
    // Монета с дырой спасает от смерти: перевозчик возвращает её
    { on: 'death', test: () => !!E.Gm.has('holed_coin') && !E.G.map.dimName,
      run: () => {
        const Gm = E.Gm, P = E.G.P;
        Gm.take('holed_coin', 1);
        P.hp = Math.max(1, Math.round(P.mhp * 0.3));
        P.flags.ferried = 1;
        Gm.cnt('deaths');
        P.ret = { key: E.G.map.key, x: P.x, y: P.y, death: 1 };
        Gm.popup('…', 'Темно. Плеск воды. Чья-то рука берёт монету из твоей ладони — и, помедлив, возвращает обратно... нет. Оставляет себе.\n\n«Не твой черёд», — говорит перевозчик.');
        Gm.teleport('dim:spirit:1:1', -1, -1);
        found('coin');
        return true;
      } },
    // Песочные часы без песка — раз в день отменяют смерть
    { on: 'death', test: () => { const it = E.Gm.has('a_hourglass'); return it && (!it.used || E.G.S.time - it.used > 1440); },
      run: () => {
        const Gm = E.Gm, P = E.G.P;
        const it = Gm.has('a_hourglass');
        it.used = E.G.S.time;
        P.hp = Math.round(P.mhp * 0.5);
        P.ageAdd = (P.ageAdd || 0) + 1;
        Gm.freezeEnemies(3);
        Gm.msg('Что-то течёт в пустых колбах — назад. Ты снова стоишь. Ты стал[|а] на год старше.', '#f0d080');
        return true;
      } },
    // Сосуд и заступничество
    { on: 'death', test: () => E.Gm.hasFx('deathward'),
      run: () => {
        const Gm = E.Gm, P = E.G.P;
        Gm.rmFx('deathward');
        P.hp = Math.round(P.mhp * 0.25);
        Gm.msg('Кто-то держит тебя за руку. Ты не падаешь.', '#fff0b0');
        return true;
      } },
    // Слеза Богини
    { on: 'death', test: () => { const it = E.Gm.has('a_tear'); return it && (!it.used || E.G.S.time - it.used > 1440); },
      run: () => {
        const Gm = E.Gm, P = E.G.P;
        Gm.has('a_tear').used = E.G.S.time;
        P.hp = P.mhp;
        Gm.msg('Капля на твоей груди становится тёплой. Боль уходит.', '#b0e0ff');
        return true;
      } },
    // Пустая бутылка на поле боя собирает души
    { on: 'kill', test: (c) => c.target.tags && (c.target.tags.includes('human') || c.target.tags.includes('undead')) && !!E.Gm.has('empty_bottle'),
      run: () => {
        const Gm = E.Gm;
        if (Math.random() < 0.15) {
          const it = Gm.has('empty_bottle');
          Gm.removeItem(it);
          Gm.give('soul_bottle', 1, true);
          Gm.msg('Бутылка в сумке вдруг становится холодной.', '#a0c0d0');
          found('bottle');
        }
      } },
    { on: 'kill', test: () => !!E.Gm.has('soul_bottle'), run: () => E.Gm.cnt('souls') },
    // Кукла — матери
    { on: 'gift', test: (c) => c.item.b === 'doll' && c.item.mother === c.npc.id,
      run: (c) => {
        const Gm = E.Gm;
        Gm.op(c.npc.id, 60);
        Gm.say(c.npc, 'Это... это же её кукла. Где ты... Нет. Не говори. Спасибо. Возьми. Мне её пела бабушка, когда я была маленькой.');
        const pr = E.G.W.prayers.find((p) => p.emo === 'grief' && !E.G.P.prayers.includes(p.id));
        if (pr) Gm.learn(pr.id, 'Горе матери');
        Gm.cnt('grief');
        found('doll');
        return true;
      } },
    // Вещь покойника — его родне
    { on: 'gift', test: (c) => c.item.owners && c.item.owners.length && Gm2().isRelativeOf(c.npc.id, c.item.owners[c.item.owners.length - 1]),
      run: (c) => {
        const Gm = E.Gm;
        const ow = E.G.W.npcs[c.item.owners[c.item.owners.length - 1]];
        Gm.op(c.npc.id, 50);
        Gm.say(c.npc, 'Это вещь ' + E.U.gen(ow.first) + '... ' + (Gm.nalive(ow.id) ? 'Я думал{|а}, она потеряна навсегда.' : 'Спасибо, что вернул[|а]. Мёртвым это важно.'));
        Gm.give('gold', 20 + Math.round((c.item.v || 10) / 2), false);
        if (!Gm.nalive(ow.id)) { Gm.cnt('grief'); Gm.fx('blessed', 600); }
        found('heirloom');
        return true;
      } },
    // Флейта на рассвете в исполинском лесу
    { on: 'play', test: (c) => c.item.b === 'flute' && E.Gm.biome() === 'ancient' && E.Gm.hour() >= 5 && E.Gm.hour() <= 6,
      run: () => {
        const Gm = E.Gm;
        if (E.G.P.c['k_beast'] > 3) { Gm.msg('Лес молчит. Он помнит кровь.'); return true; }
        E.G.P.flags.forestChild = 1;
        Gm.msg('Издалека, из-за стволов, отвечает другая флейта. Тоньше. Моложе. Лес вокруг вздыхает.', '#9ae07a');
        found('flute');
        return true;
      } },
    // Яйцо в тепле очага
    { on: 'hour', test: () => !!E.Gm.has('dragon_egg') && E.Gm.nearFire(2),
      run: () => {
        const Gm = E.Gm, P = E.G.P;
        P.c.egg_heat = (P.c.egg_heat || 0) + 1;
        if (P.c.egg_heat >= 72) {
          Gm.take('dragon_egg', 1);
          P.flags.hatched = 1;
          P.flags.hatchDay = E.G.S.time;
          Gm.summonPet('ally_dragonling');
          Gm.popup('Треск', 'Скорлупа трескается. Изнутри на тебя смотрит маленький жёлтый глаз — и кусает за палец.');
          found('egg');
        }
      } },
    // Удар молнии
    { on: 'hour', test: () => E.Gm.weather() === 'storm' && E.Gm.outdoors() && E.G.P.eq.hand && /iron|steel|bog|saltiron|ashsteel/.test(E.G.P.eq.hand.mat || 'iron') && Math.random() < 0.04,
      run: () => {
        const Gm = E.Gm, P = E.G.P;
        const dmg = Math.round(P.mhp * 0.35);
        Gm.msg('ВСПЫШКА. Молния бьёт прямо в тебя!', '#ffffff');
        Gm.flash();
        Gm.hurtPlayer(dmg, 'storm');
        if (P.hp > 0) { P.flags.lightning = 1; Gm.msg('Ты жив[|а]. В ушах звенит. Волосы стоят дыбом.', '#c0d0ff'); found('lightning'); }
      } },
    // Священный сосуд: вода исцеляет раз в день
    { on: 'drink', test: (c) => c.item.b === 'holy_vessel',
      run: (c) => {
        const Gm = E.Gm, P = E.G.P;
        if (c.item.used && E.G.S.time - c.item.used < 1440) { Gm.msg('Вода тёплая. Просто вода.'); return true; }
        c.item.used = E.G.S.time;
        P.hp = P.mhp; P.mp = P.mmp;
        for (const e of P.fx.slice()) if (D.effects[e.id] && D.effects[e.id].kind === 'state') Gm.rmFx(e.id);
        Gm.msg('Тепло разливается от горла до кончиков пальцев.', '#fff0b0');
        return true;
      } },
    // Пустая книга во сне в библиотеке
    { on: 'sleep', test: () => !!E.Gm.has('blank_book') && E.Gm.nearTile(E.T.SHELF, 4),
      run: () => {
        const Gm = E.Gm;
        const it = Gm.has('blank_book');
        Gm.removeItem(it);
        const pr = E.G.W.prayers.find((p) => p.src === 'dream' && !E.G.P.prayers.includes(p.id) && !E.G.S.lostPr[p.id]);
        const b = Gm.give('book', 1, true);
        b.n = 'Книга, написанная во сне'; b.title = b.n; b.teach = pr ? pr.id : null; b.text = 'Почерк — твой. Ты не помнишь, как писал[|а] это.';
        Gm.msg('Утром книга уже не пустая.', '#c0b0ff');
        found('blankbook');
      } },
    // Нищий Бог
    { on: 'gift', test: (c) => c.npc.id === E.G.W.special.beggar && E.D.items[c.item.b] && E.D.items[c.item.b].t === 'food',
      run: (c) => {
        const Gm = E.Gm, P = E.G.P;
        const st = Gm.nstate(c.npc.id);
        const day = Math.floor(E.G.S.time / 1440);
        if (st.fedDay === day) { Gm.say(c.npc, 'Спасибо. Я уже сыт сегодня.'); return true; }
        st.fedDay = day; st.fed = (st.fed || 0) + 1;
        if (st.fed >= 3 && !P.flags.beggarBless) {
          P.flags.beggarBless = 1;
          Gm.say(c.npc, 'Трижды ты кормил[|а] меня, не спрашивая, кто я. Я тоже не спрошу, кто ты. Иди. Солнце будет к тебе добрее.');
          Gm.fx(Math.random() < 0.5 ? 'sun' : 'moon', 60 * 24 * 365 * 5);
          found('beggar');
        } else Gm.say(c.npc, 'Спасибо, добрый человек.');
        return true;
      } },
  ];
  function Gm2() { return E.Gm; }
})(window.EOF);
