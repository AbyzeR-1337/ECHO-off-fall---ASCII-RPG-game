'use strict';
// Новые истории. Как и прежние, они привязываются к миру при его рождении и ни одна не обязательна.
(function (E) {
  const D = E.D;
  const G = () => E.G, Gm = () => E.Gm;
  const day = () => Math.floor(E.G.S.time / 1440);
  const S = D.stories;
  const story = (o) => S.push(o);
  const it = (id, n, g, t, o) => { D.items[id] = Object.assign({ id, n, g, t, w: 1, v: 1, d: '' }, o); };
  it('smith_relic', 'Дедов молот', 'm', 'misc', { w: 4, v: 5, d: 'Тяжёлый, с клеймом на бойке: подкова и три звезды.' });
  it('caravan_ledger', 'Учётная книга каравана', 'f', 'misc', { w: 0.6, v: 2, d: 'Залита кровью. Последняя запись обрывается на полуслове.' });
  it('love_letter', 'Письмо без подписи', 'n', 'misc', { w: 0.05, v: 0, d: '«Если отец спросит — скажи, что я счастлива».' });
  const sname = (W, n) => (n.sett >= 0 && W.settlements[n.sett] ? W.settlements[n.sett].nom : 'дальнем селе');

  // 1. Сбежавшая невеста
  story({ id: 'runaway', n: 'Сбежавшая невеста',
    bind(H) {
      const dad = H.pick((n) => n.age >= 42 && n.age <= 70 && n.sex === 'm' && ['farmer', 'merchant', 'smith', 'innkeeper', 'miller', 'baker'].includes(n.job));
      if (!dad) return null;
      const girl = H.pick((n) => n.age >= 17 && n.age <= 26 && n.sex === 'f' && n.sett >= 0 && n.sett !== dad.sett && H.W.settlements[n.sett].type !== 'capital');
      if (!girl) return null;
      return { dad: dad.id, girl: girl.id, where: girl.sett };
    },
    talk(npc, st, R) {
      const o = [], W = G().W;
      if (npc.id === R.dad && !st.s) o.push({ t: 'Спросить, отчего он мрачный', f() { st.s = 1; Gm().say(npc, 'Дочь моя ушла. Ночью, тайком. Говорят, в ' + sname(W, W.npcs[R.girl]) + ' её видели — с каким-то прохожим. Найди её. Пусть хоть весточку пришлёт.'); Gm().note('Отец просит найти дочь — её видели в ' + sname(W, W.npcs[R.girl]) + '.', 'runaway'); } });
      if (npc.id === R.girl && st.s === 1) {
        o.push({ t: 'Сказать, что её ищет отец', f() { st.s = 2; Gm().say(npc, 'Отец... Он бы выдал меня за мельника. Я здесь счастлива. Не говори ему, где я. Или скажи — но отдай вот это.'); Gm().give('love_letter'); } });
      }
      if (npc.id === R.girl && st.s === 2) o.push({ t: 'Уговорить её вернуться домой', f() { st.s = 3; Gm().say(npc, 'Ладно. Повидаюсь с ним. Но если он опять про мельника — уйду навсегда.'); Gm().xp(30); } });
      if (npc.id === R.dad && (st.s === 2 || st.s === 3) && !st.done) {
        if (Gm().has('love_letter')) o.push({ t: 'Отдать письмо дочери', f() { Gm().take('love_letter', 1); st.done = 1; Gm().say(npc, 'Счастлива, пишет... Ну и ладно. Ну и хорошо. Спасибо тебе. Возьми — от сердца.'); G().P.gold += 40; Gm().xp(50); } });
        if (st.s === 3) o.push({ t: 'Сказать, что дочь придёт сама', f() { st.done = 1; Gm().say(npc, 'Придёт?! Сама? ...Я встречу. И про мельника — ни слова. Держи, это тебе.'); Gm().give('silver_ring'); Gm().xp(60); } });
      }
      return o;
    } });

  // 2. Дедов молот
  story({ id: 'smithhammer', n: 'Дедов молот',
    bind(H) {
      const smith = H.pick((n) => n.job === 'smith' && n.age >= 25);
      const reg = H.region((g) => g.features.includes('ruins') || g.features.includes('dungeon'));
      if (!smith || !reg) return null;
      H.place(reg.id, { k: 'item', b: 'smith_relic', story: 'smithhammer', chest: 1 });
      return { smith: smith.id, reg: reg.id };
    },
    talk(npc, st, R) {
      const o = [], W = G().W;
      if (npc.id !== R.smith) return o;
      if (!st.s) o.push({ t: 'Спросить про пустой крюк над горном', f() { st.s = 1; Gm().say(npc, 'Там висел молот моего деда. Его унесли, когда грабили обоз у «' + W.regions[R.reg].name + '». С тех пор железо у меня не поёт.'); Gm().note('Кузнец ищет дедов молот — его унесли к «' + W.regions[R.reg].name + '».', 'smithhammer'); } });
      if (st.s === 1 && Gm().has('smith_relic')) o.push({ t: 'Отдать дедов молот', f() {
        Gm().take('smith_relic', 1); st.s = 2;
        Gm().say(npc, 'Он... Он самый. Клеймо — подкова и три звезды. Слушай: приходи к любой наковальне — теперь ты знаешь, как держать молот. А это — тебе.');
        Gm().give('iron_ingot', 4); Gm().give('horseshoe'); Gm().xp(70); G().P.flags.smithTaught = 1;
      } });
      return o;
    } });

  // 3. Пропавший караван
  story({ id: 'lostcaravan', n: 'Пропавший караван',
    bind(H) {
      const m = H.pick((n) => ['merchant', 'caravaneer'].includes(n.job) && n.age >= 25);
      const reg = H.region((g) => g.settlement < 0 && ['plains', 'desert', 'tundra', 'forest'].includes(g.biome));
      if (!m || !reg) return null;
      H.place(reg.id, { k: 'item', b: 'caravan_ledger', story: 'lostcaravan', corpse: 1 });
      return { merchant: m.id, reg: reg.id };
    },
    talk(npc, st, R) {
      const o = [], W = G().W;
      if (npc.id !== R.merchant) return o;
      if (!st.s) o.push({ t: 'Спросить, почему он не торгует', f() { st.s = 1; Gm().say(npc, 'Нечем. Мой караван ушёл через «' + W.regions[R.reg].name + '» и не вернулся. Найди хоть учётную книгу — там все долги. Без неё меня по миру пустят.'); Gm().note('Купец просит найти учётную книгу пропавшего каравана — у «' + W.regions[R.reg].name + '».', 'lostcaravan'); } });
      if (st.s === 1 && Gm().has('caravan_ledger')) o.push({ t: 'Отдать учётную книгу', f() {
        Gm().take('caravan_ledger', 1); st.s = 2;
        if (!G().S.taken.a_caravanseal) { G().S.taken.a_caravanseal = 1; Gm().give('a_caravanseal'); Gm().say(npc, 'Кровь... Значит, никто не выжил. Спасибо. Возьми печать гильдии — с ней любой купец уступит тебе в цене. Мне она теперь ни к чему.'); }
        else { G().P.gold += 120; Gm().say(npc, 'Спасибо. Это всё, что у меня есть, — сто двадцать монет.'); }
        Gm().xp(80);
      } });
      return o;
    } });

  // 4. Учёный и перья грифона
  story({ id: 'griffinscholar', n: 'Трактат о грифонах',
    bind(H) {
      const s = H.pick((n) => ['scholar', 'librarian', 'priest', 'alchemist'].includes(n.job) && n.age >= 30);
      if (!s) return null;
      return { sch: s.id };
    },
    talk(npc, st, R) {
      const o = [];
      if (npc.id !== R.sch) return o;
      if (!st.s) o.push({ t: 'Спросить, что он пишет', f() { st.s = 1; Gm().say(npc, 'Трактат о грифонах! Но я в жизни не видел ни пера. Принеси мне три пера грифона — и я заплачу, как никто не платит.'); Gm().note('Учёный просит три пера грифона (грифоны гнездятся в горах).', 'griffinscholar'); } });
      if (st.s === 1 && Gm().count('griffin_feather') >= 3) o.push({ t: 'Отдать три пера грифона', f() {
        Gm().take('griffin_feather', 3); st.s = 2; G().P.gold += 150; Gm().give('crystal_pendant'); Gm().xp(90); Gm().cnt('books');
        Gm().say(npc, 'Настоящие! Тёплые! Вот сто пятьдесят монет и подвеска — она помогает думать. Твоё имя будет в трактате, клянусь.');
      } });
      return o;
    } });

  // 5. Ткачиха
  story({ id: 'weaver', n: 'Станок вдовы',
    bind(H) {
      const w = H.pick((n) => n.sex === 'f' && n.age >= 45 && ['weaver', 'farmer', 'laborer', 'potter'].includes(n.job));
      if (!w) return null;
      return { w: w.id };
    },
    talk(npc, st, R) {
      const o = [];
      if (npc.id !== R.w) return o;
      if (!st.s) o.push({ t: 'Спросить, почему у неё нет работы', f() { st.s = 1; Gm().say(npc, 'Станок мой треснул — вал пополам. Муж бы починил, да мужа нет. Принеси четыре полена и железную крицу — я тебе такой плащ сотку, век носить будешь.'); Gm().note('Вдова-ткачиха просит 4 полена и железную крицу для станка.', 'weaver'); } });
      if (st.s === 1 && Gm().count('wood') >= 4 && Gm().count('iron_ingot') >= 1) o.push({ t: 'Отдать дерево и крицу', f() {
        Gm().take('wood', 4); Gm().take('iron_ingot', 1); st.s = 2; st.t = day();
        Gm().say(npc, 'Вот спасибо! Приходи через пару дней — плащ будет готов.');
      } });
      if (st.s === 2 && day() - (st.t || 0) >= 2) o.push({ t: 'Забрать плащ', f() {
        st.s = 3; Gm().give('wool_cloak'); Gm().give('linen_thread', 4); Gm().xp(40);
        Gm().say(npc, 'Держи. И нитки возьми — пригодятся. Если найдёшь ледяной шёлк или перья грифона — неси к любому станку: из них плащи — королям на зависть.');
      } });
      if (st.s === 2 && day() - (st.t || 0) < 2) o.push({ t: 'Спросить про плащ', f() { Gm().say(npc, 'Тку, тку! Не торопи.'); } });
      return o;
    } });
})(window.EOF);
