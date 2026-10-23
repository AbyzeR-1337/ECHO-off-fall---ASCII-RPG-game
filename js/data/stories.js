'use strict';
// Сюжетные линии. Их больше сорока, и ни одна не обязательна.
// bind — привязка ролей к миру при генерации; talk — дополнительные реплики; on — реакции на события.
(function (E) {
  const D = E.D, U = E.U;
  const G = () => E.G, Gm = () => E.Gm;
  const day = () => Math.floor(E.G.S.time / 1440);
  const S = D.stories = [];
  function story(o) { S.push(o); }
  const old = (n) => n.age >= 62;

  // 1. Наследник без имени
  story({ id: 'heir', n: 'Наследник без имени',
    bind(H) {
      const fac = H.r.pick(H.W.factions);
      const heir = H.pick((n) => n.age >= 17 && n.age <= 30 && n.sex === 'm' && ['farmer', 'laborer', 'shepherd', 'fisher'].includes(n.job) && H.W.settlements[n.sett].fac === fac.id && H.W.settlements[n.sett].type !== 'capital');
      const reg = H.region((g) => g.biome === 'ash' || g.features.includes('ruins'));
      if (!heir || !reg) return null;
      H.place(reg.id, { k: 'item', b: 'signet', story: 'heir', chest: 1 });
      return { heir: heir.id, fac: fac.id, reg: reg.id };
    },
    talk(npc, st, R) {
      const o = [];
      if (npc.id === R.heir && Gm().has('signet') && !st.s) o.push({ t: 'Показать перстень с печатью', f() { st.s = 1; Gm().say(npc, 'Откуда... Это перстень моей матери. Она говорила, что мой отец — не простой человек. Я думал{|а}, она бредит. Отдай мне его. Прошу.'); Gm().note('Парень по имени ' + npc.first + ' узнал перстень. Говорит, это вещь его матери.', 'heir'); } });
      if (npc.id === R.heir && st.s === 1 && Gm().has('signet')) {
        o.push({ t: 'Отдать перстень', f() { Gm().take('signet', 1); st.s = 2; st.t = day(); Gm().say(npc, 'Я пойду в столицу. Пусть посмотрят мне в глаза. Спасибо тебе.'); Gm().op(npc.id, 40); } });
      }
      if (st.s === 1 && npc.job === 'ruler' && G().W.settlements[npc.sett].fac === R.fac && Gm().has('signet')) {
        o.push({ t: 'Отдать перстень правителю', f() { Gm().take('signet', 1); st.s = 9; Gm().say(npc, 'Значит, этот бастард ещё жив. Благодарю. Ты получишь награду. А он... не получит ничего.'); Gm().give('gold', 400); Gm().killNpc(R.heir, 'казнён по приказу правителя'); Gm().chron('По приказу правителя казнён молодой ' + G().W.npcs[R.heir].first + '. Говорят, он претендовал на трон.'); } });
      }
      const ruler = Gm().facRuler(R.fac);
      if (st.s === 1 && Gm().has('signet') && !ruler && Gm().inCapital(R.fac)) {
        o.push({ t: 'Надеть перстень и заявить права на трон', f() { Gm().take('signet', 1); Gm().ending('crowned_self'); } });
      }
      return o;
    },
    on: {
      day(st, R) {
        if (st.s === 2 && day() - st.t >= 6) {
          const W = G().W;
          if (!Gm().nalive(R.heir)) { st.s = 8; return; }
          const ruler = Gm().facRuler(R.fac);
          if (!ruler) { Gm().setRuler(R.fac, R.heir); st.s = 3; Gm().chron('Безвестный ' + W.npcs[R.heir].first + ' предъявил перстень и был коронован в ' + W.settlements[W.factions[R.fac].capital].loc + '.', { k: 'big' }); }
          else { st.s = 4; Gm().chron('В ' + W.settlements[W.factions[R.fac].capital].loc + ' объявился претендент на трон. Началась смута.', { k: 'big' }); Gm().facUnrest(R.fac); }
        }
      },
    } });

  // 2. Последний жрец Безмолвного
  story({ id: 'silent', n: 'Безмолвный',
    bind(H) {
      const p = H.pick((n) => old(n) && ['priest', 'monk', 'hermit', 'elder'].includes(n.job));
      if (!p) return null;
      const prs = H.W.prayers.filter((x) => x.god === 'silent').slice(0, 4).map((x) => x.id);
      prs.forEach((id) => { H.W.prayers[id].src = 'elder'; H.W.prayers[id].keepers = [p.id]; });
      return { keeper: p.id, prs };
    },
    talk(npc, st, R) {
      if (npc.id !== R.keeper) return [];
      const P = G().P;
      if ((P.c.silent_turns_now || 0) < 600 && (P.c.silent_days || 0) < 3) return [];
      return [{ t: '...(промолчать)', f() {
        const pr = R.prs.find((id) => !P.prayers.includes(id) && !G().S.lostPr[id]);
        if (pr == null) { Gm().say(npc, '...'); return; }
        Gm().say(npc, '...Ты умеешь молчать. Немногие умеют. Слушай. Не ушами.');
        Gm().learn(pr, 'Безмолвие');
      } }];
    } });

  // 3. Кузнец и звезда
  story({ id: 'starsmith', n: 'Кузнец и звезда',
    bind(H) { const s = H.pick((n) => n.job === 'smith' && n.age > 35 && H.W.settlements[n.sett].type !== 'hamlet'); return s ? { smith: s.id } : null; },
    talk(npc, st, R) {
      if (npc.id !== R.smith) return [];
      const o = [];
      if (!st.s) o.push({ t: 'Спросить о его ремесле', f() { st.s = 1; Gm().say(npc, 'Сорок лет у горна. Всё ковал. А одного не ковал — звёздного металла. Говорят, он падает с неба. Принеси — и я сделаю вещь, какой ещё не было.'); Gm().note(npc.first + ', кузнец, мечтает о звёздном металле.', 'starsmith'); } });
      if (st.s === 1 && Gm().has('star_metal')) o.push({ t: 'Отдать звёздный металл', f() { Gm().take('star_metal', 1); st.s = 2; st.t = day(); Gm().say(npc, 'Холодный... Приходи через три дня. Не раньше.'); } });
      if (st.s === 2 && day() - st.t >= 3) o.push({ t: 'Забрать работу', f() {
        st.s = 3; const it = Gm().mkItem('longsword'); it.n = 'Звёздный клинок ' + U.gen(npc.first); it.dmg = [14, 24]; it.mat = 'star'; it.vs = { other: 1.6, undead: 1.4 }; it.v = 3000; it.mw = it.wr = 2000;
        it.hist = ['Выкован ' + npc.first + 'ом из упавшей звезды.', 'Последняя работа мастера.']; Gm().give(it); Gm().say(npc, 'Вот. Теперь можно и умирать.'); Gm().cnt('craft', 1); } });
      return o;
    } });

  // 4. Дитя Леса
  story({ id: 'forestchild', n: 'Дитя Леса',
    bind(H) {
      const reg = H.region((g) => g.biome === 'ancient');
      if (!reg) return null;
      const id = H.addNpc({ first: 'Мальчик', sur: '', sex: 'm', age: 9, job: 'child', region: reg.id, special: 'forestchild', traits: ['shy', 'dreamer'], sched: 'dawn' });
      H.place(reg.id, { k: 'npc', id });
      H.place(H.region((g) => g.biome === 'forest' && g.settlement >= 0)?.id ?? reg.id, { k: 'item', b: 'flute' });
      return { child: id, reg: reg.id };
    },
    talk(npc, st, R) {
      if (npc.id !== R.child) return [];
      const P = G().P;
      if (P.flags.forestChild) return [{ t: 'Сыграть с ним на флейте', f() { Gm().say(npc, '*смеётся, и смех похож на шелест листьев*'); Gm().fx('forest', 60 * 24 * 30); } }];
      return [{ t: 'Спросить, где его родители', f() { Gm().say(npc, 'Лес — мой папа. А мама... мама ушла под корни. Ты умеешь играть? Тут все умеют.'); } }];
    } });

  // 5. Маяк
  story({ id: 'lighthouse', n: 'Маяк',
    bind(H) {
      const reg = H.region((g) => g.biome === 'coast' && g.settlement < 0);
      if (!reg) return null;
      const id = H.addNpc({ first: H.r.pick(E.N.male), sur: 'Смотритель', sex: 'm', age: 74, job: 'hermit', region: reg.id, special: 'keeper', traits: ['gloomy', 'honest'] });
      H.place(reg.id, { k: 'site', s: 'lighthouse' });
      H.place(reg.id, { k: 'npc', id });
      return { keeper: id, reg: reg.id };
    },
    talk(npc, st, R) {
      if (npc.id !== R.keeper) return [];
      const o = [];
      st.n = st.n || 0;
      if (!st.s) o.push({ t: 'Спросить о маяке', f() { st.s = 1; Gm().say(npc, 'Пока горит — море спит. Масла почти нет. Принеси лампадного масла, если не жалко. Каждый вечер нужно.'); Gm().note('Смотритель маяка просит лампадного масла.', 'lighthouse'); } });
      if (st.s === 1 && Gm().has('lamp_oil') && st.last !== day()) o.push({ t: 'Отдать масло', f() { Gm().take('lamp_oil', 1); st.last = day(); st.n++; G().S.flags.lighthouseLit = G().S.time; Gm().say(npc, st.n >= 3 ? 'Ты приходишь каждый раз. Знаешь... когда меня не станет — может, ты и будешь светить.' : 'Спасибо. Ещё одна ночь.'); if (st.n >= 3) { G().P.flags.lighthouse = 1; } } });
      if (G().P.flags.lighthouse) o.push({ t: 'Остаться смотрителем маяка навсегда', f() { Gm().ending('lighthouse_keeper'); } });
      return o;
    },
    on: { day(st, R) { if (st.s && !Gm().nalive(R.keeper) && !G().S.flags.lighthouseDark) { G().S.flags.lighthouseDark = 1; Gm().chron('Маяк на побережье погас.'); } } } });

  // 6. Библиотека Пепла
  story({ id: 'ashlib', n: 'Библиотека Пепла',
    bind(H) {
      const lib = H.pick((n) => n.job === 'librarian');
      if (!lib) return null;
      const regs = H.regions((g) => ['ash', 'desert', 'tundra', 'swamp', 'mountain'].includes(g.biome), 7);
      regs.forEach((g) => H.place(g.id, { k: 'item', b: 'lost_page', chest: 1 }));
      return { lib: lib.id };
    },
    talk(npc, st, R) {
      if (npc.id !== R.lib) return [];
      const o = [];
      const n = Gm().count('lost_page');
      if (!st.s) o.push({ t: 'Спросить о старых книгах', f() { st.s = 1; Gm().say(npc, 'Самая старая книга сгорела вместе с Библиотекой Пепла. Говорят, страницы разнесло ветром по всему миру. Семь страниц. Если найдёшь — неси сюда.'); Gm().note(npc.first + ', книжник, собирает обгоревшие страницы.', 'ashlib'); } });
      if (st.s >= 1 && n > 0) o.push({ t: 'Отдать обгоревшие страницы (' + n + ')', f() {
        Gm().take('lost_page', n); st.pages = (st.pages || 0) + n; Gm().xp(40 * n);
        if (st.pages >= 7) { st.s = 2; Gm().say(npc, 'Все семь... Я читаю — и не верю. Здесь написано, что упало. Здесь написано — что. Ты... хочешь остаться? Мне нужен помощник. Навсегда.'); Gm().give(Object.assign(Gm().mkItem('book'), { n: 'Хроника Падения', title: 'Хроника Падения', text: D.loreBooks.join('\n\n'), lore: 1 })); }
        else Gm().say(npc, 'Ещё ' + (7 - st.pages) + '. Я подожду.'); } });
      if (st.s === 2) o.push({ t: 'Остаться в библиотеке', f() { Gm().ending('ash_librarian'); } });
      return o;
    } });

  // 7. Культ Открытого Глаза — растёт сам
  story({ id: 'eyecult', n: 'Открытый Глаз',
    bind(H) {
      const t = H.pick((n) => n.age > 30 && n.age < 60 && H.W.settlements[n.sett].type === 'town');
      return t ? { leader: t.id, sett: t.sett } : null;
    },
    talk(npc, st, R) {
      if (npc.id !== R.leader || !st.s) return [];
      const o = [];
      if (Gm().night() && !st.joined) o.push({ t: '«Я хочу видеть»', f() { st.joined = 1; G().P.flags.cultist = 1; Gm().say(npc, 'Глаз видит тебя. Глаз голоден. Приноси ему подношения на алтарь — и он откроется.'); Gm().note('Ты принят[|а] в Культ Открытого Глаза.', 'eyecult'); } });
      if (st.joined && st.m >= 150) o.push({ t: 'Открыть Глаз', f() { Gm().ending('cult_eye'); } });
      return o;
    },
    on: {
      day(st, R) {
        if (!st.s && day() >= 55 && Gm().nalive(R.leader)) { st.s = 1; st.m = 5; Gm().chron('В ' + G().W.settlements[R.sett].loc + ' появились люди, говорящие об Открытом Глазе.', { r: G().W.settlements[R.sett].region }); }
        if (st.s === 1) {
          if (!Gm().nalive(R.leader)) { st.s = 9; Gm().chron('Культ Открытого Глаза распался после смерти своего пророка.'); return; }
          st.m += Math.random() < 0.5 ? 1 : 0;
          if (st.m >= 200 && !st.summoned) { st.summoned = 1; Gm().chron('Культ Открытого Глаза совершил великое жертвоприношение в ' + G().W.settlements[R.sett].loc + '. Небо треснуло.', { k: 'big' }); Gm().killPop(R.sett, 0.2, 'принесён в жертву'); }
        }
      },
      kill(c, st, R) { if (c.target.npc === R.leader && st.s === 1) { G().P.flags.cultSlayer = 1; Gm().xp(300); } },
    } });

  // 8. Яйцо дракона
  story({ id: 'egg', n: 'Тёплое яйцо',
    bind(H) { const reg = H.region((g) => g.biome === 'volcanic'); if (!reg) return null; H.place(reg.id, { k: 'item', b: 'dragon_egg', nest: 1 }); return { reg: reg.id }; },
    talk() { return []; },
    on: { day(st) { const P = G().P; if (P.flags.hatched && !st.ready && G().S.time - P.flags.hatchDay > 60 * 1440) { st.ready = 1; P.flags.dragonRider = 1; Gm().msg('Твой дракон вырос. Он смотрит на небо так, будто ждёт тебя.', '#ff9a4a'); } } } });

  // 9. Старик и золотая рыбка
  story({ id: 'goldfish', n: 'Старик и рыбка',
    bind(H) { const f = H.pick((n) => n.job === 'fisher' && old(n)); return f ? { fisher: f.id, reg: H.W.settlements[f.sett].region } : null; },
    talk(npc, st, R) {
      if (npc.id !== R.fisher) return [];
      const o = [];
      if (!st.s) o.push({ t: 'Спросить о рыбалке', f() { st.s = 1; Gm().say(npc, 'Шестьдесят лет ловлю. А одну рыбу так и не поймал. Золотую. Она бывает здесь летом, на рассвете. Поймаешь — принеси, хоть погляжу перед смертью.'); Gm().note('Старый рыбак ' + npc.first + ' мечтает увидеть золотую рыбку.', 'goldfish'); } });
      if (st.s === 1 && Gm().has('fish_gold')) o.push({ t: 'Показать золотую рыбку', f() { st.s = 2; Gm().say(npc, 'Вот она... Отпусти её. Нет — оставь себе. Нет... Знаешь что. Забирай мою лодку и мой дом. Мне они больше не нужны.'); Gm().give('boat', 1); G().P.flags.fisherHeir = R.reg; Gm().killNpc(R.fisher, 'умер с улыбкой', true); } });
      return o;
    },
    on: { use(c) { if (c.item.b === 'fish_gold') { Gm().removeItem(c.item); Gm().fx('sea', 60 * 24 * 360 * 3); Gm().msg('Ты отпускаешь рыбку в воду. Она оборачивается — и вода вокруг тебя становится тёплой.', '#ffe080'); return true; } } } });

  // 10. Две сестры
  story({ id: 'sisters', n: 'Две сестры',
    bind(H) {
      const a = H.pick((n) => n.sex === 'f' && n.age > 30 && n.age < 60);
      if (!a) return null;
      const b = H.pick((n) => n.sex === 'f' && n.age > 30 && n.age < 60 && n.sett !== a.sett && Math.abs(H.W.settlements[n.sett].rx - H.W.settlements[a.sett].rx) + Math.abs(H.W.settlements[n.sett].ry - H.W.settlements[a.sett].ry) < 6);
      if (!b) return null;
      return { a: a.id, b: b.id };
    },
    talk(npc, st, R) {
      const W = G().W;
      if (npc.id !== R.a && npc.id !== R.b) return [];
      const other = W.npcs[npc.id === R.a ? R.b : R.a];
      const o = [];
      const k = npc.id === R.a ? 'ha' : 'hb';
      if (!st[k]) o.push({ t: 'Спросить о семье', f() { st[k] = 1; Gm().say(npc, 'Есть у меня сестра. ' + other.first + '. Живёт в ' + W.settlements[other.sett].loc + '. Мы не говорили двадцать лет. Из-за дома матери. Пусть подавится этим домом.'); } });
      if (st.ha && st.hb && !st.s) o.push({ t: 'Сказать, что сестра скучает', f() { st.s = 1; Gm().op(R.a, 20); Gm().op(R.b, 20); Gm().say(npc, '...Правда? Скучает? ...Передай ей, что я тоже. Нет. Я сама скажу. Пойду к ней.'); Gm().chron('Две сестры, ' + W.npcs[R.a].first + ' и ' + W.npcs[R.b].first + ', помирились после двадцати лет ссоры.'); Gm().xp(150); Gm().cnt('helped'); } });
      return o;
    } });

  // 11. Война Корон — записаться в войско
  story({ id: 'warcrowns', n: 'Война Корон',
    bind() { return {}; },
    talk(npc, st) {
      if (!['guard', 'veteran'].includes(npc.job)) return [];
      const fac = G().W.settlements[npc.sett].fac;
      if (!Gm().atWar(fac) || st.fac != null) return [];
      return [{ t: 'Записаться в войско', f() { st.fac = fac; st.t = day(); G().P.flags.soldierOf = fac; Gm().say(npc, 'Хорошо. Бей тех, кто в чужих цветах. Вернёшься живым — получишь жалованье.'); Gm().note('Ты сражаешься за ' + G().W.factions[fac].name + '.', 'warcrowns'); } }];
    },
    on: { day(st) { if (st.fac != null && !Gm().atWar(st.fac) && !st.done) { st.done = 1; if ((G().P.c.war_kills || 0) >= 25 && G().S.fac[st.fac].alive) { G().P.flags.general = 1; Gm().msg('Война закончилась. О тебе говорят в казармах.', '#e0c080'); } } } } });

  // 12. Мор
  story({ id: 'plague', n: 'Мор',
    bind() { return {}; },
    talk(npc, st) {
      if (!['healer', 'priest', 'alchemist'].includes(npc.job)) return [];
      if (!Gm().settPlague(npc.sett)) return [];
      const o = [];
      if (!st['p' + npc.sett]) o.push({ t: 'Спросить, чем помочь', f() { st['p' + npc.sett] = 1; G().P.flags.sawPlague = 1; Gm().say(npc, 'Есть старый рецепт. Полынь, кровохлёбка и что-то ещё, чего я не помню. Если сваришь лекарство — неси. Нужно хотя бы три склянки.'); } });
      const n = Gm().count('cure');
      if (n > 0) o.push({ t: 'Отдать лекарство (' + n + ')', f() { Gm().take('cure', n); st['c' + npc.sett] = (st['c' + npc.sett] || 0) + n; Gm().xp(60 * n); if (st['c' + npc.sett] >= 3) { Gm().endPlague(npc.sett); Gm().cnt('plague_cured'); Gm().say(npc, 'Помогает! Люди встают с постелей! Мы запомним тебя.'); Gm().settRep(npc.sett, 40); } else Gm().say(npc, 'Нужно ещё.'); } });
      return o;
    } });

  // 13. Алтарь Голодного Бога
  story({ id: 'hungrygod', n: 'Голодный Бог',
    bind(H) { const reg = H.region((g) => ['ash', 'desert', 'tundra'].includes(g.biome) && g.danger >= 4); if (!reg) return null; H.place(reg.id, { k: 'site', s: 'hungry_altar' }); return { reg: reg.id }; },
    talk() { return []; },
    on: { sacrifice(c, st) { st.n = (st.n || 0) + 1; if (st.n >= 10 && !st.done) { st.done = 1; Gm().popup('Пир', 'Голос, похожий на урчание в животе мира, говорит: «ЕЩЁ». Ты понимаешь, что можешь накормить его всем. Всем миром. Или уйти.'); G().P.flags.feastOffer = 1; } } } });

  // 14. Зеркальный двойник
  story({ id: 'mirrorself', n: 'Отражение', bind() { return {}; }, talk() { return []; },
    on: { kill(c) { if (c.target.boss === 'b_mirror') { G().P.flags.killedReflection = 1; Gm().msg('Отражение разбивается. Почему-то тебе больно.', '#d8e4f0'); } } } });

  // 15. Часовщик
  story({ id: 'clockmaker', n: 'Часовщик',
    bind(H) { const s = H.pick((n) => ['scholar', 'librarian', 'potter'].includes(n.job) && old(n)); if (!s) return null; const reg = H.region((g) => g.settlement >= 0 && g.danger <= 6); H.place(reg.id, { k: 'item', b: 'broken_clock', chest: 1 }); return { cm: s.id }; },
    talk(npc, st, R) {
      if (npc.id !== R.cm || !Gm().has('broken_clock')) return [];
      return [{ t: 'Показать сломанные часы', f() { Gm().say(npc, 'Где ты это взял[|а]? ...Эти часы не сломаны. Они ждут. Время ждёт своего часа — буквально, понимаешь? Когда стрелки совпадут с настоящими — заведи их.'); Gm().note('Часовщик ' + npc.first + ' сказал, что часы «ждут своего часа».', 'clockmaker'); } }];
    } });

  // 16. Лунная лестница
  story({ id: 'moonstair', n: 'Лунная лестница', bind() { return {}; }, talk(npc) {
    if (G().map.dimName !== 'moon' || npc.special !== 'moonmaid') return [];
    return [{ t: 'Остаться на Луне', f() { Gm().ending('moon_stay'); } }, { t: 'Спросить, кто она', f() { Gm().say(npc, 'Я та, на кого смотрят спящие. Ты пришёл не во сне. Это редкость.'); } }];
  } });

  // 17. Бездна
  story({ id: 'abyss', n: 'Сердце Бездны', bind() { return {}; }, talk() { return []; },
    on: {
      kill(c) { if (c.target.boss === 'b_abyss_heart') { Gm().ending(G().P.flags.lastKeeper ? 'abyss_save' : 'abyss_destroy'); } },
      hour() { const m = G().map; if ((m.depth || 0) >= 15 && !G().P.flags.heardAbyss && (G().P.stillTurns || 0) >= 30) { G().P.flags.heardAbyss = 1; Gm().popup('Песнь', 'Сначала ты думаешь, что это кровь шумит в ушах. Потом понимаешь: внизу кто-то поёт. Мотив простой. Ты его уже знаешь.'); } },
    } });

  // 18. Коллекционер молитв
  story({ id: 'collector', n: 'Коллекционер',
    bind(H) { const s = H.pick((n) => n.job === 'scholar' && H.W.settlements[n.sett].type === 'capital') || H.pick((n) => n.job === 'scholar'); return s ? { c: s.id } : null; },
    talk(npc, st, R) {
      if (npc.id !== R.c) return [];
      const P = G().P, n = P.prayers.length;
      const o = [];
      o.push({ t: 'Рассказать о своих молитвах', f() {
        const paid = st.paid || 0;
        if (n >= 30 && !st.done) { st.done = 1; Gm().say(npc, 'Тридцать! Больше, чем у меня. Возьми мою коллекцию — мне она уже ни к чему. Или... останься. Будем записывать вместе.'); Gm().give('gold', 500); st.offer = 1; }
        else if (n - paid >= 5) { const k = Math.floor((n - paid) / 5); st.paid = paid + k * 5; Gm().give('gold', 60 * k); Gm().say(npc, 'Восхитительно! Запишу. Вот, за труды.'); }
        else Gm().say(npc, 'Узнаешь новые — приходи. Плачу за каждые пять.');
      } });
      if (st.offer) o.push({ t: 'Остаться с коллекционером', f() { Gm().ending('collector'); } });
      return o;
    } });

  // 19. Человек без памяти
  story({ id: 'noname', n: 'Человек без памяти',
    bind(H) {
      const w = H.pick((n) => n.job === 'wanderer');
      const reg = H.region((g) => g.settlement < 0 && g.biome !== 'ocean');
      if (!w || !reg) return null;
      const real = H.r.pick(E.N.male);
      H.place(reg.id, { k: 'grave', text: real + '. Ушёл и вернулся. Ушёл снова.' });
      return { w: w.id, real, reg: reg.id };
    },
    talk(npc, st, R) {
      if (npc.id !== R.w) return [];
      const o = [];
      if (!st.s) o.push({ t: 'Спросить, кто он', f() { st.s = 1; Gm().say(npc, 'Не помню. Ничего не помню. Только могилу. Где-то есть могила с моим именем. Я её видел. Или мне приснилось.'); Gm().note('Бродяга не помнит своего имени, но помнит какую-то могилу.', 'noname'); } });
      if (st.s === 1 && st.read) o.push({ t: 'Назвать его: «' + R.real + '»', f() { st.s = 2; Gm().say(npc, R.real + '... Да. Да! Я вспомнил. Я уже умирал. Спасибо. Теперь можно идти дальше.'); Gm().xp(250); const pr = G().W.prayers.find((p) => p.src === 'spirit' && !G().P.prayers.includes(p.id)); if (pr) Gm().learn(pr.id, 'Вспомнивший'); } });
      return o;
    },
    on: { readGrave(c, st, R) { if (c.text && c.text.startsWith(R.real)) st.read = 1; } } });

  // 20. Некромант с холма
  story({ id: 'necro', n: 'Некромант с холма',
    bind(H) {
      const reg = H.region((g) => g.settlement < 0 && ['plains', 'tundra', 'swamp'].includes(g.biome));
      if (!reg) return null;
      const id = H.addNpc({ first: H.r.pick(E.N.male), sur: 'с Холма', sex: 'm', age: 58, job: 'hermit', region: reg.id, traits: ['gloomy', 'kind'] });
      H.place(reg.id, { k: 'npc', id }); H.place(reg.id, { k: 'site', s: 'graveyard' });
      return { n: id };
    },
    talk(npc, st, R) {
      if (npc.id !== R.n) return [];
      const o = [];
      if (!st.s) o.push({ t: 'Спросить, что он делает', f() { st.s = 1; Gm().say(npc, 'Жена моя здесь лежит. Двенадцать лет. Я почти научился её звать. Не хватает призрачной слизи — три склянки. Не смотри так. Я не злодей. Я просто скучаю.'); } });
      if (st.s === 1 && Gm().count('ectoplasm') >= 3) o.push({ t: 'Отдать призрачную слизь', f() { Gm().take('ectoplasm', 3); st.s = 2; Gm().say(npc, 'Она... дышит? Нет. Но она смотрит на меня. Этого достаточно. Возьми мои записи. Мне больше не нужно.'); G().P.flags.necroTaught = 1; G().P.c.graves = (G().P.c.graves || 0) + 4; Gm().chron('Отшельник с холма поднял из могилы свою жену. Соседи обходят холм стороной.'); } });
      return o;
    } });

  // 21. Пропавший караван
  story({ id: 'caravan', n: 'Пропавший караван',
    bind(H) {
      const m = H.pick((n) => n.job === 'merchant' && H.W.settlements[n.sett].type !== 'hamlet');
      const reg = H.region((g) => g.biome === 'desert');
      if (!m || !reg) return null;
      H.place(reg.id, { k: 'site', s: 'wreck' }); H.place(reg.id, { k: 'item', b: 'letter', ledger: 1, n: 'Счётная книга каравана', chest: 1 });
      return { m: m.id, reg: reg.id };
    },
    talk(npc, st, R) {
      if (npc.id !== R.m) return [];
      const o = [];
      if (!st.s) o.push({ t: 'Спросить о делах', f() { st.s = 1; Gm().say(npc, 'Плохо дела. Мой караван ушёл в пустыню и пропал. Если найдёшь хоть что-то — счётную книгу — заплачу.'); } });
      const led = G().P.inv.find((i) => i.ledger);
      if (st.s === 1 && led) o.push({ t: 'Отдать счётную книгу', f() { Gm().removeItem(led); st.s = 2; Gm().give('gold', 300); Gm().settStock(npc.sett, 'food', 60); Gm().say(npc, 'Значит, все погибли... Но долги теперь можно списать. Держи. Ты честн[ый|ая] человек.'); } });
      return o;
    } });

  // 22. Город, который исчезнет
  story({ id: 'vanishtown', n: 'Исчезающий город', bind() { return {}; },
    talk(npc, st) {
      if (!npc.vanish) return [];
      const o = [];
      if (!st.s) o.push({ t: 'Спросить, что это за место', f() { st.s = 1; Gm().say(npc, 'Мы здесь только иногда. Потом — туман. Принеси нам хлеба из мира, десять краюх. Мы так давно не ели настоящего хлеба.'); } });
      if (st.s === 1 && Gm().count('bread') >= 10) o.push({ t: 'Отдать десять краюх хлеба', f() { Gm().take('bread', 10); st.s = 2; Gm().say(npc, 'Тёплый... Останься с нами, если хочешь. Здесь ничего не болит.'); Gm().give(Gm().randomUnique(8)); } });
      if (st.s === 2) o.push({ t: 'Остаться в исчезающем городе', f() { Gm().ending('vanish_town'); } });
      return o;
    } });

  // 23. Король при смерти
  story({ id: 'dyingking', n: 'Последняя воля', bind() { return {}; },
    talk(npc, st) {
      if (npc.job !== 'ruler' || npc.age < 66) return [];
      const o = [];
      if (!st['k' + npc.id]) o.push({ t: 'Спросить о здоровье', f() { st['k' + npc.id] = 1; Gm().say(npc, 'Я умираю. Лекари молчат. Мне ничего не нужно, кроме глотка воды из святого источника. Говорят, такая бывает весной. Но где — не знаю.'); } });
      const v = G().P.inv.find((i) => i.b === 'holy_vessel' || i.water === 'holy');
      if (st['k' + npc.id] === 1 && v) o.push({ t: 'Дать напиться из сосуда', f() { st['k' + npc.id] = 2; G().P.flags.servedKing = 1; Gm().say(npc, 'Тепло... Ступай. Ты будешь моей тенью, когда меня не станет.'); Gm().give(Object.assign(Gm().mkItem('king_letter'), {})); Gm().killNpc(npc.id, 'умер спокойно', true); } });
      return o;
    } });

  // 24. Изгнанный рыцарь
  story({ id: 'exile', n: 'Изгнанный рыцарь',
    bind(H) { const v = H.pick((n) => n.job === 'veteran' && n.sex === 'm' && n.age > 40); return v ? { v: v.id } : null; },
    talk(npc, st, R) {
      if (npc.id !== R.v) return [];
      const o = [];
      if (!st.s) o.push({ t: 'Спросить о шраме', f() { st.s = 1; Gm().say(npc, 'Меня изгнали из ордена за трусость. Я не убил пленного. Хочешь проверить, трус ли я? Сразись со мной. Не насмерть.'); } });
      if (st.s === 1) o.push({ t: 'Принять вызов', f() { st.s = 2; Gm().duel(npc.id); } });
      if (st.s === 3) o.push({ t: 'Спросить о чести', f() { Gm().say(npc, 'Честь — это когда можешь убить и не убиваешь. Иди. Защищай дороги. Ты поймёшь.'); G().P.c.k_bandit = (G().P.c.k_bandit || 0) + 10; st.s = 4; } });
      return o;
    },
    on: { duelEnd(c, st, R) { if (c.npc === R.v) { st.s = 3; if (c.won) { Gm().say(G().W.npcs[R.v], 'Хорошо. Ты не добил[|а]. Возьми мой меч.'); const it = Gm().mkItem('sword'); it.n = 'Меч изгнанника'; it.dmg = [7, 12]; it.mods = { con: 2 }; Gm().give(it); } } } } });

  // 25. Ведьма болот (Карга) — сделки
  story({ id: 'hag', n: 'Карга с болот', bind() { return {}; },
    talk(npc, st) {
      if (npc.special !== 'hag') return [];
      return [
        { t: 'Отдать год жизни за знание', f() { G().P.ageAdd = (G().P.ageAdd || 0) + 1; for (let i = 0; i < 3; i++) { const pr = G().W.prayers.find((p) => !G().P.prayers.includes(p.id) && !G().S.lostPr[p.id] && Math.random() < 0.02); if (pr) Gm().learn(pr.id, 'Сделка'); } Gm().say(npc, 'Хе-хе. Сладкий годок. Держи.'); } },
        { t: 'Отдать своё имя', f() { G().P.flags.nameless = 1; G().P.oldName = G().P.name; G().P.name = '—'; Gm().say(npc, 'Хорошее имя. Мне пригодится. А ты... ты теперь никто. Это тоже неплохо.'); Gm().cnt('forgot'); } },
      ];
    } });

  // 26. Пропавший брат
  story({ id: 'brother', n: 'Пропавший брат',
    bind(H) {
      const a = H.pick((n) => n.age > 25 && n.age < 60 && n.fam.length > 1);
      if (!a) return null;
      const reg = H.region((g) => g.settlement < 0 && g.danger >= 3 && g.biome !== 'ocean');
      if (!reg) return null;
      const bro = H.addNpc({ first: H.r.pick(E.N.male), sur: a.sur.replace(/а$/, ''), sex: 'm', age: a.age + 2, job: 'hunter', region: reg.id, dead: 1 });
      H.place(reg.id, { k: 'corpse', npc: bro, item: { b: 'knife', n: 'Нож ' + U.gen(H.W.npcs[bro].first), owners: [bro] } });
      return { a: a.id, bro, reg: reg.id };
    },
    talk(npc, st, R) {
      if (npc.id !== R.a || st.s) return [];
      const bro = G().W.npcs[R.bro];
      return [{ t: 'Спросить о семье', f() { st.s = 1; Gm().say(npc, 'Брат мой, ' + bro.first + ', ушёл на охоту три года назад. Не вернулся. Я всё жду. Глупо, да?'); Gm().note(npc.first + ' ждёт брата по имени ' + bro.first + ', ушедшего на охоту.', 'brother'); } }];
    } });

  // 27. Небесный пастух
  story({ id: 'skyshep', n: 'Небесный пастух',
    bind(H) { const reg = H.region((g) => g.biome === 'sky'); if (!reg) return null; const id = H.addNpc({ first: H.r.pick(E.N.male), sur: 'Пастух Облаков', sex: 'm', age: 140, job: 'shepherd', region: reg.id, traits: ['dreamer', 'kind'] }); H.place(reg.id, { k: 'npc', id }); return { s: id }; },
    talk(npc, st, R) {
      if (npc.id !== R.s) return [];
      st.n = st.n || 0;
      if (st.last === day()) return [{ t: 'Помолчать вместе', f() { Gm().say(npc, '...'); } }];
      return [{ t: 'Поговорить об облаках', f() { st.last = day(); st.n++; if (st.n >= 3 && !G().P.flags.skyfriend) { G().P.flags.skyfriend = 1; Gm().say(npc, 'Ты приходишь уже третий день. Ладно. Вот тебе секрет: падать не страшно, если веришь, что ветер подхватит. Он подхватит.'); } else Gm().say(npc, 'Облака — это овцы неба. Иногда они теряются и становятся дождём.'); } }];
    } });

  // 28. Песня из таверны
  story({ id: 'tavernsong', n: 'Песня из таверны',
    bind(H) { const b = H.pick((n) => n.job === 'bard' && n.sex === 'f'); if (!b) return null; const pr = H.W.prayers.find((p) => p.src === 'elder' && !p.keepers); if (pr) pr.keepers = [b.id]; return { b: b.id, pr: pr ? pr.id : null }; },
    talk(npc, st, R) {
      if (npc.id !== R.b || R.pr == null) return [];
      const h = Gm().hour();
      if (h < 19 || h > 23) return [];
      if (st.last === day()) return [];
      return [{ t: 'Послушать её песню', f() { st.last = day(); st.n = (st.n || 0) + 1; Gm().cnt('music'); if (st.n >= 3 && !G().P.prayers.includes(R.pr) && !G().S.lostPr[R.pr]) { Gm().say(npc, '*поёт что-то старое, на незнакомом языке, и ты вдруг понимаешь каждое слово*'); Gm().learn(R.pr, 'Песня'); } else Gm().say(npc, '*поёт*'); } }];
    } });

  // 29. Последний Хранитель — главная тайна мира
  // Хранитель — простой старик в глухой деревне. Если он умрёт, не передав Печать, она иногда переходит к другому. Иногда — нет.
  story({ id: 'keeper', n: 'Печать',
    bind(H) { const k = H.pick((n) => old(n) && H.W.settlements[n.sett].type === 'hamlet'); return k ? { k: k.id } : null; },
    talk(npc, st, R) {
      const kid = st.k != null ? st.k : R.k;
      if (npc.id !== kid) return [];
      const P = G().P;
      if ((P.c.abyss_depth || 0) < 10 || st.s) return [];
      return [{ t: 'Рассказать о Бездне', f() {
        st.s = 1; P.flags.lastKeeper = 1; G().S.flags.sealHeld = 1;
        Gm().say(npc, 'Ты был[|а] там. Внизу. Я вижу по глазам. Значит, мне можно отдохнуть. Слушай: Печать — это не вещь. Это обещание не отпускать. Я держал{|а} её всю жизнь. Теперь — ты.');
        Gm().learn(G().W.prayers.find((p) => p.god === 'throne').id, 'Печать');
        st.t = day();
      } }];
    },
    on: {
      day(st, R) {
        const kid = st.k != null ? st.k : R.k;
        if (st.s === 1 && day() - st.t >= 1 && Gm().nalive(kid)) { Gm().killNpc(kid, 'умер(ла) во сне', true); Gm().chron('В глухой деревне умер(ла) старый(ая) ' + G().W.npcs[kid].first + '. Никто не знал, кем он(а) был(а).', { hidden: 1 }); }
        if (!st.s && !Gm().nalive(kid) && !G().S.flags.sealBroken) {
          // Печать ищет нового хранителя
          const olds = [];
          for (let i = 0; i < 400; i++) { const id = Math.floor(Math.random() * G().W.npcs.length); if (Gm().nalive(id) && E.Sim.age(id) >= 55 && E.Sim.settOf(id) >= 0) { olds.push(id); break; } }
          if ((st.passed || 0) < 3 && olds.length && Math.random() < 0.75) { st.k = olds[0]; st.passed = (st.passed || 0) + 1; }
          else { G().S.flags.sealBroken = G().S.time; Gm().chron('Где-то лопнула невидимая нить. Ночи стали темнее.', { k: 'big' }); }
        }
      },
    } });

  // 30. Охота богов
  story({ id: 'godhunt', n: 'Охота богов', bind() { return {}; }, talk() { return []; },
    on: { day(st) { const ev = Gm().event('hunt'); if (ev) st.was = 1; else if (st.was) { st.was = 0; if (G().P.level >= 15 && G().P.hp > 0) { G().P.flags.survivedHunt = 1; } } } } });

  // 31. Торговый дом
  story({ id: 'tradehouse', n: 'Торговый дом',
    bind(H) { const m = H.pick((n) => n.job === 'merchant' && H.W.settlements[n.sett].type === 'capital'); return m ? { m: m.id } : null; },
    talk(npc, st, R) {
      if (npc.id !== R.m) return [];
      const P = G().P, o = [];
      if (!st.inv && P.gold >= 500) o.push({ t: 'Вложить 500 монет в дело', f() { P.gold -= 500; st.inv = 500; st.t = day(); Gm().say(npc, 'Через месяц приходи. Если город устоит — получишь втрое.'); } });
      if (st.inv && day() - st.t >= 30) o.push({ t: 'Забрать прибыль', f() { const k = G().S.sett[npc.sett].destroyed ? 0 : 3; Gm().give('gold', st.inv * k); Gm().cnt('gold_earned', st.inv * k); st.inv = 0; st.deals = (st.deals || 0) + 1; Gm().say(npc, k ? 'Вот твоя доля. Хорошо работаем.' : 'Всё сгорело.'); } });
      if ((st.deals || 0) >= 3 || (P.c.gold_earned || 0) >= 6000) o.push({ t: 'Стать совладельцем торгового дома', f() { Gm().ending('merchant_prince'); } });
      return o;
    } });

  // 32. Письмо без адресата
  story({ id: 'letter', n: 'Письмо',
    bind(H) {
      const to = H.pick((n) => n.age > 20 && H.W.settlements[n.sett].type !== 'capital');
      const reg = H.region((g) => g.settlement < 0 && g.biome !== 'ocean' && g.danger < 6);
      if (!to || !reg) return null;
      const from = H.pick((n) => n.fam.includes(to.id) && n.id !== to.id) || H.pick(() => true);
      H.place(reg.id, { k: 'corpse', item: { b: 'letter', to: to.id, from: from.id, d: 'На конверте: «' + to.first + ' ' + to.sur + ', ' + H.W.settlements[to.sett].nom + '».' } });
      return { to: to.id, from: from.id };
    },
    talk(npc, st, R) {
      const L = G().P.inv.find((i) => i.b === 'letter' && i.to != null);
      if (!L || st.s) return [];
      const W = G().W;
      if (npc.id === R.to || (Gm().isRelativeOf(npc.id, R.to) && !Gm().nalive(R.to))) {
        return [{ t: 'Отдать письмо', f() { Gm().removeItem(L); st.s = 1; Gm().op(npc.id, 40); Gm().xp(120); Gm().say(npc, npc.id === R.to ? 'От ' + U.gen(W.npcs[R.from].first) + '... Я ждал{|а} его так долго. Спасибо. Вот, возьми — больше у меня ничего нет.' : 'Это для ' + U.gen(W.npcs[R.to].first) + '... Не дождался{|ась}. Я прочту за н{его|её}.'); Gm().give('gold', 30); Gm().cnt('helped'); } }];
      }
      return [];
    },
    on: { use(c, st) { if (c.item.b === 'letter' && c.item.to != null) { const W = G().W; Gm().popup('Письмо', '«' + W.npcs[c.item.to].first + '! Если ты читаешь это — я не дошёл. Не жди. Я спрятал деньги, как ты просил{|а}, под камнем у старой могилы. Прости. — ' + W.npcs[c.item.from].first + '»'); c.item.opened = 1; return true; } } } });

  // 33. Подводный город
  story({ id: 'undersea', n: 'Колокол под водой', bind() { return {}; },
    talk(npc) { if (npc.special !== 'deepelder') return []; return [{ t: 'Остаться в глубине навсегда', f() { if (Gm().hasFx('sea') || Gm().hasFx('gills')) Gm().ending('deep_stay'); else Gm().say(npc, 'Ты не можешь дышать здесь вечно. Пока.'); } }]; } });

  // 34. Нищий в столице
  story({ id: 'beggar', n: 'Нищий',
    bind(H) { const cap = H.W.settlements.find((s) => s.type === 'capital'); if (!cap) return null; const id = H.addNpc({ first: 'Старик', sur: '', sex: 'm', age: 80, job: 'beggar', sett: cap.id, special: 'beggar', traits: ['kind', 'honest'] }); H.W.special.beggar = id; return { b: id }; },
    talk() { return []; },
    on: { attackNpc(c, st, R) { if (c.npc === R.b && !st.s) { st.s = 1; Gm().npcToBoss(R.b, 'b_beggar_god'); Gm().msg('Нищий выпрямляется. Он выше, чем казался. Намного выше.', '#ffe0a0'); return true; } },
      kill(c) { if (c.target.boss === 'b_beggar_god') { G().P.c.k_god = (G().P.c.k_god || 0) + 1; Gm().fx('hunted', 60 * 24 * 60); Gm().chron('В столице убили нищего. После этого неделю шёл дождь из пепла.', { k: 'big' }); } } } });

  // 35. Белая Вдова
  story({ id: 'widow', n: 'Белая Вдова', bind() { return {}; }, talk() { return []; },
    on: { kill(c) { if (c.target.boss === 'b_widow') { Gm().msg('Вдова рассыпается снегом. Последнее, что ты слышишь: «...это ты?»', '#ffffff'); Gm().cnt('grief'); } } } });

  // 36. Спящий великан
  story({ id: 'giant', n: 'Спящий великан', bind() { return {}; }, talk() { return []; },
    on: { day(st) { if (!st.s && day() >= 360) { st.s = 1; Gm().chron('Ольмар Спящий открыл глаза. Живые горы пошли.', { k: 'big' }); } if (st.s === 1 && Math.random() < 0.08) Gm().giantStep(); },
      kill(c, st) { if (c.target.boss === 'b_olmar') { st.s = 2; Gm().chron('Великан Ольмар снова уснул. Навсегда.', { k: 'big' }); G().P.flags.giantSlayer = 1; } } } });

  // 37. Падшая звезда — поговорить вместо боя
  story({ id: 'fallen', n: 'Падший со звезды', bind() { return {}; }, talk() { return []; },
    on: { kill(c) { if (c.target.boss === 'b_star_fallen') Gm().chron('Того, кто упал со звездой, убили. Звезда больше не падала в тот год.'); } } });

  // 38. Грибной король
  story({ id: 'mycel', n: 'Грибница', bind() { return {}; }, talk() { return []; },
    on: { day() { const P = G().P; if (Gm().hasFx('spores')) { P.c.spore_days = (P.c.spore_days || 0) + 1; if (P.c.spore_days >= 60) Gm().ending('mycelium'); } } } });

  // 39. Отшельник-пророк — его пророчества сбываются
  story({ id: 'prophet', n: 'Пророк с горы',
    bind(H) { const reg = H.region((g) => g.biome === 'mountain' && g.settlement < 0); if (!reg) return null; const id = H.addNpc({ first: H.r.pick(E.N.male), sur: 'Пророк', sex: 'm', age: 90, job: 'hermit', region: reg.id, traits: ['gloomy', 'honest'] }); H.place(reg.id, { k: 'npc', id }); return { p: id }; },
    talk(npc, st, R) {
      if (npc.id !== R.p) return [];
      return [{ t: 'Спросить о будущем', f() { Gm().say(npc, Gm().prophecy()); Gm().cnt('rumors'); } }];
    } });

  // 40. Садовник пепла
  story({ id: 'garden', n: 'Росток в пепле', bind() { return {}; }, talk() { return []; },
    on: { enter() { const f = G().S.flags.sapling; if (f && f.key === G().map.key && G().S.time - f.t > 30 * 1440 && !f.grown) { f.grown = 1; Gm().msg('Там, где было семечко, стоит молодое деревце. В пепле. Его листья светятся.', '#9ae07a'); } },
      useTile(c) { const f = G().S.flags.sapling; if (f && f.grown && c.tile === E.T.SAPLING && G().S.time - f.t > 100 * 1440) { Gm().ending('gardener'); return true; } if (f && c.tile === E.T.SAPLING) { Gm().msg(f.grown ? 'Деревце растёт. Ему нужно время. Много.' : 'Росток. Совсем маленький.'); return true; } } } });

  // 41. Край мира
  story({ id: 'edge', n: 'Край мира', bind() { return {}; }, talk() { return []; },
    on: { edge(c, st) { st.n = (st.n || 0) + 1; if (st.n === 1) Gm().msg('Дальше — только море. И ещё дальше — тоже.'); if (st.n === 2) Gm().msg('Вода здесь другого цвета. Как будто ненастоящая.', '#a0b0c0'); if (st.n >= 3) Gm().ending('edge_vanish'); } } });

  // 42. Пустой Трон — стать богом
  story({ id: 'throne', n: 'Пустой Трон', bind() { return {}; }, talk() { return []; },
    on: { useTile(c) {
      if (c.tile !== E.T.THRONE || G().map.dimName !== 'void') return;
      const P = G().P;
      if (P.eq.head && P.eq.head.b === 'a_crown' && P.level >= 40) { Gm().ending('god_ascend'); return true; }
      Gm().msg(P.eq.head && P.eq.head.b === 'a_crown' ? 'Трон отвечает гулом. Ты ещё слишком мал[|а] для него.' : 'Трон холоден. Он ждёт не тебя. Или не так.');
      return true;
    } } });

  // 43. Пустота — раствориться
  story({ id: 'dissolve', n: 'Ничто', bind() { return {}; }, talk() { return []; },
    on: { hour() { if (G().map.dimName === 'void' && (G().P.stillTurns || 0) >= 100) Gm().ending('void_dissolve'); } } });

  // 44. Дракон-всадник
  story({ id: 'rider', n: 'Крылья', bind() { return {}; }, talk() { return []; } });

  // 45. Мир духов — остаться
  story({ id: 'spiritstay', n: 'Тот берег', bind() { return {}; },
    talk(npc) { if (npc.special !== 'ferryman') return []; return [
      { t: 'Попросить отвезти обратно', f() { Gm().say(npc, 'Садись. Не оглядывайся.'); Gm().returnFromDim(); } },
      { t: 'Остаться на этом берегу', f() { Gm().ending('spirit_stay'); } }]; } });
})(window.EOF);
