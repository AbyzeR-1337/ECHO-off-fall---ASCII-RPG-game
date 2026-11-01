'use strict';
// Сердечные дела. Завести роман можно с кем угодно — с мужчиной или женщиной, с эльфийкой или
// изящным юношей, — если человек взрослый, свободен и ты ему по сердцу (у каждого своя склонность:
// одним мил кто угодно, другим — только противоположный пол, третьим — свой).
// Путь такой: добрые слова → встречи → признание → пара → свадьба. Всё за кадром, без подробностей.
(function (E) {
  const U = E.U, G = E.G, Gm = E.Gm, Dlg = E.Dlg, R = E.Realms;
  const RM = E.Romance = {};
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const st = (id) => E.Sim.st(id);
  const love = (id) => st(id).love || 0;
  const addLove = (id, d) => { const s = st(id); s.love = U.clamp((s.love || 0) + d, 0, 100); return s.love; };

  RM.adult = (id) => E.Sim.age(id) >= 18 && E.Sim.job(id) !== 'child';
  RM.likes = (n) => { const o = n.orient || 'any', ps = G.P.sex; return o === 'any' || (o === 'opp' ? n.sex !== ps : n.sex === ps); };
  RM.married = (id) => { const n = Gm.npc(id); return n.mate != null && E.Sim.isAlive(n.mate) && !(G.P.love && G.P.love.spouse === id); };
  RM.rel = (id) => st(id).rel || null;
  RM.isLover = (id) => !!RM.rel(id);
  const P = () => G.P;
  const L = () => (G.P.love = G.P.love || {});
  RM.partnerOf = () => { const l = L(); return l.spouse != null ? l.spouse : l.partner != null ? l.partner : null; };

  const feel = (e, m) => { e.mood = m; e.moodT = performance.now(); };
  RM.feel = feel;
  const tone = (n, a, b) => Gm.fmt(n.sex === 'f' ? b : a, n);
  // что сказать в ответ на ласковое слово
  function reply(n, ok, lv) {
    const r = R.raceOf(n);
    if (!ok) return pick(['Приятно, но... не надо. Ты не в моём вкусе.', 'Спасибо. Только давай останемся друзьями.', 'Хм. Мило. Но нет.']);
    if (r === 'succubus') return pick(['Ох, какие слова. Продолжай — мне нравится, когда мне платят словами.', 'Льстец. Я таких ем на завтрак. Но тебя, может, оставлю на ужин.', 'Ещё. И погромче.']);
    if (lv > 60) return pick(['Ты опять... у меня щёки горят.', 'Хватит, а то я поверю.', 'Я всё время о тебе думаю. Это плохо?']);
    if (lv > 30) return pick(['Ты умеешь найти слово.', 'Скажешь тоже... но приятно.', 'Заходи почаще. Ну, если хочешь.']);
    return pick(['Ой. Спасибо.', 'Ты это всем говоришь?', 'Странн[ый|ая] ты. Но мил[ый|ая].']);
  }

  const opts0 = Dlg.options;
  Dlg.options = function (e) {
    const opts = opts0.apply(this, arguments);
    const id = e.npc;
    if (id == null || e.asleep || e.ghost || e.hostile || Gm.fxFlag('mute')) return opts;
    if (!RM.adult(id) || Gm.age() < 18) return opts;
    const n = Gm.npc(id), op = Gm.opinion(id), rel = RM.rel(id), lv = love(id), day = Gm.day(), s = st(id);
    const at = Math.max(0, opts.findIndex((o) => o.t === 'Подарить...'));
    const add = [];
    if (rel === 'spouse' || rel === 'partner') {
      add.push({ t: 'Обнять', f: () => { feel(e, 'l'); addLove(id, 1); Gm.op(id, 1); Gm.healPlayer(Math.round(P().mhp * 0.05), true); return pick(['Тепло. Не отпускай ещё немного.', 'Ты пахнешь дорогой.', 'Я скучал{|а}.']); } });
      add.push({ t: 'Провести время вместе', f: () => RM.together(e) });
      if (rel === 'partner' && lv >= 80) add.push({ t: 'Предложить пожениться', f: () => RM.propose(e) });
      add.push({ t: rel === 'spouse' ? 'Развестись' : 'Расстаться', f: () => RM.leave(e) });
    } else if (op > -10) {
      const free = !RM.married(id) || R.raceOf(n) === 'succubus';
      if (s.lday !== day) add.push({ t: 'Сказать комплимент', f: () => {
        s.lday = day;
        const ok = RM.likes(n) && free;
        if (!ok) { Gm.op(id, 2); feel(e, 'n'); return Gm.fmt(RM.married(id) && RM.likes(n) ? tone(n, 'Спасибо. Только у меня жена есть. И она ревнивая.', 'Спасибо. Только я замужем — и муж у меня крепкий.') : reply(n, false), n); }
        let d = 5 + Math.floor(Math.random() * 6) + Math.max(0, Math.round(op / 12));
        if ((n.traits || []).includes('shy')) d -= 2;
        if ((n.traits || []).includes('cheerful') || (n.traits || []).includes('dreamer')) d += 3;
        if ((n.traits || []).includes('proud')) d -= 1;
        if (R.raceOf(n) === 'succubus') d += 4;
        const v = addLove(id, d); Gm.op(id, 2); feel(e, v > 55 ? 'l' : R.raceOf(n) === 'succubus' ? 'c' : 'h');
        return Gm.fmt(reply(n, true, v), n);
      } });
      if (lv >= 15 && s.dday !== day && RM.likes(n) && free) add.push({ t: 'Позвать прогуляться', f: () => RM.date(e) });
      if (lv >= 45 && RM.likes(n) && free) add.push({ t: 'Признаться в чувствах', f: () => RM.confess(e) });
    }
    opts.splice(at, 0, ...add);
    return opts;
  };

  // свидание: час-другой вместе; в таверне — за кружкой (2 монеты)
  RM.date = function (e) {
    const id = e.npc, n = Gm.npc(id), s = st(id);
    s.dday = Gm.day();
    const inTavern = G.map.spots && G.map.spots.tavern && G.map.spots.tavern.in && G.map.spots.tavern.in.some((p) => p.x === G.P.x && p.y === G.P.y);
    if (inTavern && P().gold >= 2) P().gold -= 2;
    const v = addLove(id, 8 + Math.floor(Math.random() * 8) + (inTavern ? 4 : 0));
    Gm.op(id, 3); feel(e, v > 55 ? 'l' : 'h');
    G.S.time += 60;
    const where = inTavern ? 'Вы пьёте тёмное пиво и смеётесь над чем-то глупым.' : pick(['Вы бродите вдоль околицы, и время идёт незаметно.', 'Вы сидите у воды и молчите — и это хорошее молчание.', 'Вы смотрите, как темнеет небо, плечом к плечу.']);
    return Gm.fmt(where + ' ' + (v > 60 ? '«Мне с тобой спокойно.»' : '«Было хорошо. Правда.»'), n);
  };
  RM.confess = function (e) {
    const id = e.npc, n = Gm.npc(id), lv = love(id), op = Gm.opinion(id);
    const l = L();
    const other = RM.partnerOf();
    if (lv >= 60 && op >= 15) {
      if (other != null && other !== id) { const o = st(other); o.rel = null; o.love = Math.max(0, (o.love || 0) - 40); Gm.op(other, -30); if (l.spouse === other) l.spouse = null; if (l.partner === other) l.partner = null; Gm.msg('Кто-то будет плакать этой ночью.', '#a08090'); }
      feel(e, 'l'); st(id).rel = 'partner'; l.partner = id; Gm.cnt('lovers'); Gm.gain('love');
      Gm.chron && Gm.chron(P().name + ' и ' + n.first + ' — теперь вместе.', { k: 'small' });
      return Gm.fmt(R.raceOf(n) === 'succubus' ? '«Наконец-то. Я думала, ты никогда не решишься. Теперь ты мо[й|я] — и это бесплатно. Почти.»' : pick(['«Я... тоже. Давно. Боял{ся|ась} сказать перв{ым|ой}.»', '«Да. Да! Иди сюда.»', '«Я ждал{|а} этих слов.»']), n);
    }
    addLove(id, -10); feel(e, 's');
    return Gm.fmt(pick(['«Прости... я не готов{|а}.»', '«Это слишком быстро.»', '«Давай не будем торопиться.»']), n);
  };
  RM.propose = function (e) {
    const id = e.npc, n = Gm.npc(id), l = L();
    const ring = P().inv.find((it) => /ring/.test(it.b || '') && !it.art);
    if (!ring && P().gold < 30) return '«Без кольца? И без пира? Подкопи — тогда поговорим.» (нужно кольцо или 30 монет на пир)';
    if (ring) Gm.removeItem(ring); else P().gold -= 30;
    st(id).rel = 'spouse'; l.spouse = id; l.partner = null;
    Gm.cnt('weddings'); Gm.gain('love');
    Gm.chron && Gm.chron(P().name + ' и ' + n.first + ' сыграли свадьбу.', { k: 'big' });
    const sid = E.Sim.settOf(id);
    if (sid >= 0) G.S.sett[sid].rep = (G.S.sett[sid].rep || 0) + 5;
    E.UI.closeAll();
    Gm.popup('Свадьба', Gm.fmt('Пели до утра. Кто-то плакал, кто-то дрался, кто-то уснул в сенях. ' + n.first + ' держал{|а} тебя за руку весь вечер и не отпускал{|а}. Теперь у тебя есть дом — и тот, кто ждёт в нём.', n));
    return null;
  };
  RM.together = function (e) {
    const id = e.npc, n = Gm.npc(id), s = st(id);
    if (s.tday === Gm.day()) return Gm.fmt(pick(['«Опять? Ненасытн[ый|ая]. Вечером.»', '«Дай мне хоть дела доделать.»']), n);
    s.tday = Gm.day();
    addLove(id, 4); Gm.op(id, 2);
    E.UI.closeAll();
    Gm.rest(3);
    Gm.fx && Gm.fx('loved', 60 * 8);
    Gm.msg(Gm.fmt(pick(['Время течёт медленно и тепло. Ты отдыхаешь — по-настоящему.', 'Разговоры, смех, тишина вдвоём. Дальше — только ваше.', 'Ты засыпаешь у {него|неё} на плече.']), n), '#e0a0b0');
    return null;
  };
  RM.leave = function (e) {
    const id = e.npc, n = Gm.npc(id), l = L();
    st(id).rel = null; addLove(id, -50); Gm.op(id, -25); feel(e, Math.random() < 0.5 ? 's' : 'a');
    if (l.spouse === id) l.spouse = null;
    if (l.partner === id) l.partner = null;
    return Gm.fmt(pick(['«Уходи. Просто уходи.»', '«Я знал{|а}. Я всегда знал{|а}.»', '«Ну и ладно. Ну и... ладно.»']), n);
  };

  // любимые здороваются иначе; супруг иногда дарит что-нибудь в дорогу
  const greet0 = Dlg.greet;
  Dlg.greet = function (e) {
    const id = e.npc;
    if (id != null && !e.asleep && RM.rel(id)) {
      const s = st(id), n = Gm.npc(id);
      if (RM.rel(id) === 'spouse' && s.gday !== Gm.day()) {
        s.gday = Gm.day();
        if (Math.random() < 0.6) { Gm.give(pick(['bread', 'apple', 'cheese', 'pie']), 1, true); Gm.msg(Gm.fmt('{Он|Она} суёт тебе в сумку свёрток с едой.', n), '#e0b0b0'); }
      }
      return pick(RM.rel(id) === 'spouse' ? ['Вот и ты! Я уже начал{|а} волноваться.', 'Ты голодн[ый|ая]? Садись.', 'Иди сюда, путешественни[к|ца].'] : ['Ты приш[ёл|ла]! Я скучал{|а}.', 'Опять ты... и опять я рад{|а}.', 'Ну наконец-то.']);
    }
    return greet0.apply(this, arguments);
  };
  // смерть любимого
  if (E.Sim && E.Sim.kill) {
    const kill0 = E.Sim.kill;
    E.Sim.kill = function (id) {
      const r = kill0.apply(this, arguments);
      const l = G.P && G.P.love;
      if (l && (l.spouse === id || l.partner === id)) {
        const n = Gm.npc(id);
        Gm.msg(Gm.fmt('Весть догоняет тебя: ' + n.first + ' больше нет. Мир становится тише.', n), '#c0a0b0');
        if (l.spouse === id) l.spouse = null; if (l.partner === id) l.partner = null;
        Gm.fx && Gm.fx('grief', 60 * 48);
      }
      return r;
    };
  }
})(window.EOF);
