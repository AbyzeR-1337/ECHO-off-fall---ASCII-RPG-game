'use strict';
// Темп: развитие чуть быстрее, но без подарков. Уровень — на пятую часть меньше опыта, ступени пути
// растут на треть быстрее, скрытые пути открываются примерно на четверть раньше (см. classes.js).
// И знамения: когда до скрытого пути уже недалеко, мир намекает — во сне, у костра, на святынях.
// Знамения копятся в «Знании мира» (T): что за путь зовёт и что для него делать.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U;
  const PACE = D.PACE = { xpNeed: 0.8, gain: 1.3 };
  Gm.need = (L) => Math.round(20 * PACE.xpNeed * Math.pow(L, 1.5));
  const g0 = Gm.gain;
  Gm.gain = function (evt, n) { return g0.call(this, evt, (n == null ? 1 : n) * PACE.gain); };

  // что значит каждый счётчик — по-человечески
  const DO = {
    steps_night: 'ходить ночами', void_turns: 'бывать в пустоте', time_dim: 'побывать в измерении времени', talks: 'много говорить с людьми',
    steps_sky: 'ходить по небесным островам', silent_days: 'проводить дни в молчании', herbs: 'собирать травы', graves: 'раскапывать могилы',
    gifts: 'дарить', dreams: 'видеть сны наяву', brews: 'варить зелья', war_kills: 'сражаться на войне', wanted_places: 'попадать в розыск',
    under_turns: 'подолгу бывать под землёй', torches: 'зажигать факелы', thefts: 'воровать', storms: 'попадать в грозы',
    steps_volcanic: 'бродить у вулканов', steps_swamp: 'бродить по болотам', steps_mountain: 'ходить по горам', steps_desert: 'ходить по пустыне',
    steps_ash: 'ходить по пепельным пустошам', star_shards: 'находить осколки звёзд', spore_days: 'жить среди грибницы', spirit_talks: 'говорить с духами',
    souls: 'собирать души', shrines: 'молиться у разных святынь', sail: 'ходить под парусом', sacrifices: 'приносить жертвы', rumors: 'собирать слухи',
    ruins_visited: 'бывать в руинах', rest_hours_town: 'подолгу жить под крышей', regions: 'видеть новые земли', rage: 'драться на краю смерти',
    poison_kills: 'убивать ядом', plague_cured: 'лечить мор', nights_ice: 'ночевать во льдах', nights_ancient: 'ночевать в древних лесах',
    music: 'играть музыку', mirror: 'смотреть в зеркальный осколок в полночь', max_curses: 'носить проклятия', max_bless: 'собирать благословения',
    mask_days: 'носить маску', k_undead: 'упокаивать нежить', k_sunless: 'драться, пока нет солнца', k_other: 'изгонять потустороннее',
    k_god: 'поднять руку на бессмертного', k_dream: 'сражаться во снах', k_blood: 'драться под кровавой луной', k_blacksnow: 'драться в чёрный снег',
    k_beast: 'охотиться на зверей', k_bandit: 'бить разбойников', inscr: 'читать древние надписи', hunger_days: 'терпеть голод',
    howls: 'выть на луну', harvest_days: 'жить в годы урожая', grief: 'оплакивать близких', gold_earned: 'зарабатывать золото',
    ghost_talks: 'говорить с призраками', fullmoons: 'встречать полнолуния', forgot: 'забыть что-то важное', fled: 'спасаться бегством',
    fish: 'рыбачить', fire_rest_streak: 'жить у костра', fire_kills: 'жечь врагов огнём', eaten: 'есть досыта', deaths: 'возвращаться из-за грани',
    days: 'прожить долго', crits: 'бить точно', chests: 'открывать сундуки', brew_fail: 'ошибаться в зельях', bosses: 'одолевать великих чудовищ',
    books: 'читать книги', bones: 'собирать кости', beasts_fed: 'кормить зверей с руки', art_hours: 'носить древнюю вещь', abyss_depth: 'спускаться в бездну',
  };
  // скрытые пути, до которых уже «полпути»: условие сбылось бы, будь счётчики в 1.6 раза больше
  function nearPaths() {
    const P = G.P;
    if (!P) return [];
    const big = {}; for (const k in P.c) big[k] = (P.c[k] || 0) * 1.6;
    const PP = Object.create(P); PP.c = big;
    const out = [];
    for (const id of D.hiddenClasses || []) {
      if (P.paths.includes(id)) continue;
      const c = D.classes[id];
      try { if (!c.cond(P, G) && c.cond(PP, G)) out.push(id); } catch (e) { /* условие на редкость — пропускаем */ }
    }
    return out;
  }
  Gm.nearPaths = nearPaths;
  // что делать для пути: по счётчикам в условии
  function hintOf(id) {
    const c = D.classes[id];
    const src = String(c.cond);
    const ks = []; const re = /c\(P, '([a-z_0-9]+)'\)/g; let mm;
    while ((mm = re.exec(src))) if (DO[mm[1]] && !ks.includes(DO[mm[1]])) ks.push(DO[mm[1]]);
    return ks.length ? ks.join(', ') : null;
  }
  Gm.pathHint = hintOf;
  const OMEN = [
    'Тебе снится чужой голос: «{d}»',
    'В треске огня ты различаешь слова: «{d}»',
    'Ветер приносит обрывок чужой мысли: «{d}»',
    'Тень на стене на миг складывается в знак. Ты почему-то знаешь, что он значит: «{d}»',
  ];
  // знамение: раз в несколько дней, если какой-то путь уже близко
  Gm.omen = function (where) {
    const P = G.P;
    if (!P) return false;
    const day = Math.floor(G.S.time / 1440);
    if (P.omenDay != null && day - P.omenDay < 3) return false;
    const near = nearPaths().filter((id) => !(P.omens && P.omens[id]));
    if (!near.length) return false;
    const id = near[Math.floor(Math.random() * near.length)], c = D.classes[id];
    P.omenDay = day;
    P.omens = P.omens || {};
    P.omens[id] = { t: G.S.time, where: where || '' };
    const line = OMEN[Math.floor(Math.random() * OMEN.length)].replace('{d}', c.d);
    const h = hintOf(id);
    Gm.msg(line, '#c8b0ff');
    Gm.msg('Знамение: путь «' + c.n + '» уже близко' + (h ? ' — ' + h + '.' : '.') + ' (Знание мира, T)', '#b8a0e8');
    P.notes.push({ t: G.S.time, s: 'Знамение: путь «' + c.n + '»' + (h ? ' — ' + h : '') + '.' });
    return true;
  };
  // когда бывают знамения: после сна, у костра, у святыни
  const se0 = Gm.sleepEnd;
  Gm.sleepEnd = function (hours, bed) {
    const r = se0.apply(this, arguments);
    if (G.P && !G.map.dim && Math.random() < 0.5) Gm.omen('сон');
    return r;
  };
  const cook0 = Gm.cook;
  Gm.cook = function () { const r = cook0.apply(this, arguments); if (Math.random() < 0.15) Gm.omen('огонь'); return r; };
  // в «Знании мира» — список знамений
  Gm.omenLines = function () {
    const P = G.P, out = [];
    for (const id in P.omens || {}) {
      const c = D.classes[id];
      if (!c) continue;
      const got = P.paths.includes(id);
      out.push((got ? '✓ ' : '· ') + c.n + (got ? ' — путь открыт' : ' — «' + c.d + '»' + (hintOf(id) ? ' Что делать: ' + hintOf(id) + '.' : '')));
    }
    return out;
  };
})(window.EOF);
