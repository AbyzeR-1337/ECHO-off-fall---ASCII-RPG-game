'use strict';
// Что делают новые события мира (их описание — в js/data/content2.js).
// Северное сияние — чары дешевле; звездопад — осколки звёзд на земле; великий караван — купец с редким товаром;
// праздник — пироги дешевле, состязание силы и кости на интерес; перекочёвка — стада и лишняя добыча;
// дикая магия — у каждого заклинания бывает «сдача»; новая жила — серебро и золото из руды;
// паломничество — молитвы и святыни сильнее, призраки паломников ночью; турнир — бой с чемпионом за копьё;
// Ведьмина ночь — травы вдвое, нечисть смелее. Плюс эффекты новых уникальных вещей.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, Ent = E.Ent;
  const Dlg = E.Dlg, Cb = E.Combat, Items = E.Items;
  const ev = (id) => Gm.event(id);
  const evHere = (id) => { const m = G.map; if (!m) return null; const e = E.Sim.event(id, m.rid != null ? m.rid : null); return e; };
  const eqHas = (b) => { const P = G.P; if (!P) return null; for (const s in P.eq) { const x = P.eq[s]; if (x && x.b === b) return x; } return null; };

  // ---------- разговоры о том, что творится ----------
  const st0 = Dlg.smalltalk;
  Dlg.smalltalk = function (e) {
    const pool = [];
    for (const id of ['aurora', 'festival', 'caravan', 'tournament', 'pilgrimage', 'wildmagic', 'migration', 'goldrush', 'witchnight']) if (evHere(id) && D.talk[id]) pool.push(...D.talk[id]);
    if (pool.length && Math.random() < 0.55) return pool[Math.floor(Math.random() * pool.length)];
    if (D.talk.common2 && Math.random() < 0.14) return D.talk.common2[Math.floor(Math.random() * D.talk.common2.length)];
    return st0.apply(this, arguments);
  };

  // ---------- кто водится: стада, призраки паломников, дикие искры ----------
  const mf0 = Gm.monFlags;
  if (mf0) Gm.monFlags = function (m) {
    const f = mf0.apply(this, arguments) || {};
    if (evHere('migration')) f.migration = 1;
    if (ev('pilgrimage')) f.pilgrimage = 1;
    if (ev('wildmagic')) f.wildmagic = 1;
    if (ev('witchnight')) { f.night = 1; }
    return f;
  };

  // ---------- чары: сияние и Нить Сияния дешевле; дикая магия даёт «сдачу» ----------
  if (E.Magic) {
    const c0 = E.Magic.cost;
    E.Magic.cost = function (id) {
      let c = c0(id);
      if (ev('aurora') && Gm.night()) c *= 0.7;
      if (eqHas('a_aurora')) c *= 0.75;
      return Math.max(0, Math.round(c));
    };
  }
  const ua0 = Gm.useAb;
  Gm.useAb = function (aid, dir) {
    const P = G.P, mp0 = P ? P.mp : 0, cd0 = P && P.cd ? P.cd[aid] || 0 : 0;
    const r = ua0.apply(this, arguments);
    const cast = P && (P.mp < mp0 || (P.cd && (P.cd[aid] || 0) > cd0));
    if (cast && ev('wildmagic') && Math.random() < 0.3) {
      const k = Math.floor(Math.random() * 5);
      if (k === 0) { Gm.healPlayer(Math.round(P.mhp * 0.2), true); Gm.msg('Дикая магия: по жилам разливается тепло.', '#f0a0ff'); }
      else if (k === 1) { P.mp = Math.min(P.mmp, P.mp + 10); Gm.msg('Дикая магия: дух возвращается к тебе.', '#f0a0ff'); }
      else if (k === 2) { Gm.fx('haste', 30); Gm.msg('Дикая магия: мир вокруг замедлился.', '#f0a0ff'); }
      else if (k === 3) { Gm.hurtPlayer(Math.max(1, Math.round(P.mhp * 0.06)), 'magic'); Gm.msg('Дикая магия: чары обжигают пальцы.', '#f0a0ff'); }
      else { Gm.msg('Дикая магия: на миг у тебя вырастают рога. Потом пропадают.', '#f0a0ff'); Gm.cnt('wild_horns'); }
    }
    return r;
  };

  // ---------- праздник и караван: цены ----------
  const pm0 = Dlg.priceMul;
  Dlg.priceMul = function (e, b, buy) {
    let m = pm0.apply(this, arguments);
    const t = D.items[b] ? D.items[b].t : 'misc';
    if (buy && evHere('festival') && t === 'food') m *= 0.6;
    if (buy && eqHas('a_caravanseal')) m *= 0.85;
    if (!buy && eqHas('a_caravanseal')) m *= 1.1;
    if (buy && eqHas('a_festmask')) m *= 0.95;
    return m;
  };

  // ---------- руда: новая жила, лампа кобольда ----------
  const mine0 = Gm.mine;
  Gm.mine = function (x, y) {
    const r = mine0.apply(this, arguments);
    const rich = evHere('goldrush') ? 1 : 0, lamp = eqHas('a_kobold_lamp') ? 1 : 0;
    if (rich || lamp) {
      const q = Math.random();
      if (q < 0.25 * rich + 0.1 * lamp) { Gm.give('silver_nugget'); Gm.msg('В породе блестит серебро!', '#d8d8e8'); }
      else if (q < 0.33 * rich + 0.13 * lamp) { Gm.give('gold_nugget'); Gm.msg('Золото! Самородок с ноготь величиной.', '#f0d060'); }
      if (lamp && Math.random() < 0.3) Gm.give('iron_ore');
    }
    return r;
  };
  // ---------- травы: Ведьмина ночь — вдвое ----------
  const ga0 = Gm.gather;
  Gm.gather = function (x, y) {
    const P = G.P, n0 = P.inv.reduce((s, i) => s + (D.items[i.b] && D.items[i.b].herb ? i.q || 1 : 0), 0);
    const r = ga0.apply(this, arguments);
    if (ev('witchnight') && Gm.night()) {
      const got = P.inv.find((i) => D.items[i.b] && D.items[i.b].herb && P.inv.reduce((s, j) => s + (D.items[j.b] && D.items[j.b].herb ? j.q || 1 : 0), 0) > n0);
      if (got) { Gm.give(got.b, 1, true); Gm.msg('В Ведьмину ночь трава сама просится в руки — вдвое.', '#b0e0a0'); }
    }
    return r;
  };
  // ---------- молитвы: паломничество ----------
  const gain0 = Gm.gain;
  Gm.gain = function (evt, n) {
    let k = n == null ? 1 : n;
    if ((evt === 'pray' || evt === 'shrine') && ev('pilgrimage')) k *= 2;
    if ((evt === 'pray' || evt === 'shrine') && eqHas('a_pilgrim_staff')) k *= 1.3;
    return gain0.call(this, evt, k);
  };
  const ps0 = Gm.prayAtShrine;
  if (ps0) Gm.prayAtShrine = function (f) {
    const r = ps0.apply(this, arguments);
    if (ev('pilgrimage') && Math.random() < 0.5) { Gm.fx('blessed', 300); Gm.msg('Паломники поют рядом. Благодать ложится на плечи.', '#fff0b0'); }
    if (Gm.omen && Math.random() < 0.35) Gm.omen('святыня');
    return r;
  };

  // ---------- добыча: перекочёвка, уникальные вещи при убийстве ----------
  const kill0 = Cb.kill;
  Cb.kill = function (e, src, el) {
    const byP = src === 'player' || src === 'ally';
    const r = kill0.apply(this, arguments);
    if (!byP || !G.P) return r;
    const m = G.map;
    if (evHere('migration') && e.tags && e.tags.includes('beast') && Math.random() < 0.6) { m.items.push({ x: e.x, y: e.y, it: Items.make(Math.random() < 0.5 ? 'hide' : 'meat_raw') }); }
    if (e.tpl === 'moonstag') Gm.cnt('moonstags');
    if (e.tpl === 'griffin') Gm.cnt('griffins');
    if (e.tpl === 'wyvern' && !G.S.taken.a_wyrmfang && Math.random() < 0.25) { G.S.taken.a_wyrmfang = 1; m.items.push({ x: e.x, y: e.y, it: Items.make('a_wyrmfang') }); Gm.msg('Из пасти виверны выпадает длинный кривой клык.', '#e0f0a0'); }
    if (e.tpl === 'basilisk' && !G.S.taken.a_basiliskeye && Math.random() < 0.2) { G.S.taken.a_basiliskeye = 1; m.items.push({ x: e.x, y: e.y, it: Items.make('a_basiliskeye') }); Gm.msg('Один глаз василиска не закрылся. Он каменный.', '#c0d0a0'); }
    if (e.tpl === 'kobold' && !G.S.taken.a_kobold_lamp && Math.random() < 0.06) { G.S.taken.a_kobold_lamp = 1; m.items.push({ x: e.x, y: e.y, it: Items.make('a_kobold_lamp') }); Gm.msg('У кобольда была лампа, что горит без масла.', '#f0d080'); }
    if (e.champion) championWon(e);
    return r;
  };

  // ---------- уникальные вещи: удары и защита ----------
  const A = E.Arts || {};
  A.a_griffinplume = { mods: () => ({ dex: 3 }) };
  A.a_moonantler = { mods: () => (Gm.night() ? { fai: 4, int: 2 } : { fai: 1 }) };
  A.a_wyrmfang = { dmgMul: (P, it, t) => (t && t.tags && t.tags.includes('beast') ? 1.4 : 1.15) };
  A.a_starblade = { mods: () => ({ int: 2 }), dmgMul: () => (Gm.night() ? 1.5 : 1) };
  A.a_tourney = { mods: () => ({ luck: 3, str: 1 }) };
  A.a_festmask = { mods: () => ({ luck: 3 }) };
  A.a_caravanseal = { mods: () => ({ luck: 1 }) };
  A.a_hexdoll = { reflect: 0.15, mods: () => ({ fai: 1 }) };
  A.a_basiliskeye = { mods: () => ({ int: 2 }) };
  A.a_aurora = { mods: () => ({ int: 1, fai: 1 }) };
  A.a_battlehorn = { mods: () => ({ str: 1 }) };
  A.a_springflask = { mods: () => ({ con: 1 }) };
  A.a_spyglass = { mods: () => ({}) };
  A.a_kobold_lamp = { mods: () => (G.map && !G.map.outdoor ? { dex: 1, luck: 2 } : {}) };
  A.a_pilgrim_staff = { mods: () => ({ fai: 3 }) };
  // глаз василиска: кого ударишь — тот иногда каменеет; клык виверны — яд
  const pa0 = Cb.playerAttack;
  if (pa0) Cb.playerAttack = function (e, opts) {
    const r = pa0.apply(this, arguments);
    if (e && !e.dead && e.fx) {
      if (eqHas('a_basiliskeye') && Math.random() < 0.12) { Cb.entFx(e, 'stun', 2); Gm.msg(U.cap(Cb.nameOf(e)) + ' каменеет на миг.', '#c0d0a0'); }
      const w = G.P.eq.hand;
      if (w && w.b === 'a_wyrmfang' && Math.random() < 0.35) Cb.entFx(e, 'poison', 5, 2);
      if (w && w.ench && w.ench.el === 'ice' && Math.random() < 0.15) Cb.entFx(e, 'stun', 1);
    }
    return r;
  };
  // рог древней битвы и труба звездочёта — по «Использовать»
  const use0 = Gm.use;
  Gm.use = function (it) {
    const P = G.P;
    if (it && it.b === 'a_battlehorn') {
      const day = Math.floor(G.S.time / 1440);
      if (it.usedDay === day) { Gm.msg('Рог молчит. Павшие встают раз в день.'); return; }
      it.usedDay = day;
      let n = 0;
      for (let k = 0; k < 3; k++) { const a = Gm.spawnAlly('ally_spirit', 120, Math.max(2, P.level)); if (a) { a.n = 'Павший воин'; n++; } }
      Gm.msg(n ? 'Ты трубишь. Из земли поднимаются павшие воины и встают рядом с тобой.' : 'Ты трубишь, но здесь некому встать.', '#e0d0a0');
      Gm.endTurn(2); return;
    }
    if (it && it.b === 'a_spyglass') {
      const m = G.map;
      if (m.kind !== 'over' || !m.outdoor) { Gm.msg('Отсюда ничего не видно — нужно небо над головой.'); return; }
      const kn = P.known; kn.seen = kn.seen || {}; let n = 0;
      for (const g of G.W.regions) { const d = Math.abs(g.x - m.region.x) + Math.abs(g.y - m.region.y); if (d <= 4 && !kn.regions[g.id] && !kn.seen[g.id]) { kn.seen[g.id] = G.S.time; n++; } }
      Gm.msg(n ? 'Ты смотришь в трубу. Дальние земли ложатся на карту: ' + n + '.' : 'Ты смотришь в трубу. Всё, что видно, ты уже знаешь.', '#d0e0f0');
      Gm.endTurn(3); return;
    }
    if (it && it.b === 'a_springflask') { Gm.healPlayer(Math.round(P.mhp * 0.3), false); P.thirst = Math.max(0, (P.thirst || 0) - 40); Gm.msg('Вода из фляги прохладная и чистая. Раны затягиваются.', '#a0e0ff'); Gm.endTurn(2); return; }
    return use0.apply(this, arguments);
  };

  // ---------- люди событий: караванщик, распорядитель праздника, герольд турнира ----------
  Dlg.SHOP.caravan = ['silk', 'pearl', 'crystal', 'mana_shard', 'silver_ring', 'gold_ring', 'pearl_amulet', 'crystal_pendant', 'spice', 'p_heal', 'p_spirit', 'p_str', 'wool_cloak', 'lute', 'compass', 'lantern', 'star_metal', 'griffin_feather', 'frost_silk', 'boat']
    .filter((b) => D.items[b]);
  Dlg.SHOP.witch = ['p_heal', 'p_spirit', 'p_night', 'p_sleep', 'p_antidote', 'p_breath', 'p_str', 'h_mandrake', 'h_moonwort', 'h_bloodroot', 'ectoplasm', 'bone_talisman', 'dreamcatcher', 'spores', 'cure']
    .filter((b) => D.items[b]);
  const ENT = {
    caravan: { n: 'Караванщик с востока', art: 'npc_trader', c: '#d8a860', shop: 'caravan' },
    festival: { n: 'Распорядитель праздника', art: 'npc_bard', c: '#e8c060' },
    tournament: { n: 'Герольд турнира', art: 'npc_noble', c: '#c8b0e0' },
  };
  function spawnFolk(m) {
    if (!m || m.kind !== 'over' || m.sett == null || m.sett < 0 || !G.W.special || G.W.special.ferryman == null) return;
    for (const id in ENT) {
      if (!E.Sim.event(id, m.rid)) continue;
      if (m.ents.some((e) => e.custom === id)) continue;
      const c = m.settCenter || { x: m.w >> 1, y: m.h >> 1 };
      const MG = E.MapGen, p = MG && MG.findWalkNear ? MG.findWalkNear(m, c.x + 2 + Object.keys(ENT).indexOf(id) * 2, c.y + 1) : null;
      if (!p) continue;
      const e = Ent.npc(G.W.special.ferryman, p.x, p.y);
      const o = ENT[id];
      Object.assign(e, { npc: null, n: o.n, c: o.c, art: o.art, ai: 'still', immortal: 1, kind: 'npc', custom: id, ghost: 0 });
      if (o.shop) { e.ghostShop = 'cv' + m.sett; e.shopKind = o.shop; }
      Gm.addEnt(e);
    }
  }
  const lm0 = Gm.loadMap;
  Gm.loadMap = function () {
    const r = lm0.apply(this, arguments);
    try { spawnFolk(G.map); spawnStars(G.map); } catch (err) { console.warn('events2', err); }
    return r;
  };
  // звездопад: несколько осколков на земле края
  function spawnStars(m) {
    if (!m || m.kind !== 'over') return;
    const e = E.Sim.event('starfall', m.rid);
    if (!e || e.r !== m.rid) return;
    G.S.sf = G.S.sf || {};
    const key = 'sf' + e.t0 + ':' + m.key;
    if (G.S.sf[key]) return;
    G.S.sf[key] = 1;
    const r = U.rng(G.W.seed, key);
    const n = r.int(3, 6);
    for (let i = 0; i < n; i++) {
      const p = E.MapGen.findWalkNear(m, r.int(6, m.w - 7), r.int(4, m.h - 5));
      if (!p) continue;
      m.items.push({ x: p.x, y: p.y, it: Items.make(r.chance(0.25) ? 'star_metal' : 'star_shard') });
    }
    Gm.msg('Вокруг дымятся воронки: здесь падали звёзды.', '#ffe0b0');
  }
  // разговоры с людьми событий
  const op0 = Dlg.options;
  Dlg.options = function (e) {
    if (e && e.custom === 'festival') return festivalOpts(e);
    if (e && e.custom === 'tournament') return tourneyOpts(e);
    return op0.apply(this, arguments);
  };
  function festivalOpts(e) {
    const P = G.P, day = Math.floor(G.S.time / 1440);
    G.S.fest = G.S.fest || {};
    const st = G.S.fest[day] = G.S.fest[day] || {};
    const o = [];
    o.push({ t: 'Купить праздничный пирог (5 монет)', f: () => { if (P.gold < 5) return 'Монет не хватает? Ну, держи кусочек так. Праздник же!'; P.gold -= 5; Gm.give('festival_cake'); return 'Держи! С ягодами и мёдом.'; } });
    if (!st.str) o.push({ t: 'Состязание силы: поднять бочку', f: () => {
      st.str = 1;
      const roll = P.st.str + Math.floor(Math.random() * 10);
      if (roll >= 14) { Gm.xp(30); P.gold += 25; Gm.cnt('fest_wins'); if (!G.S.taken.a_festmask && Math.random() < 0.35) { G.S.taken.a_festmask = 1; Gm.give('a_festmask'); return 'Ты поднимаешь бочку над головой! Толпа ревёт. Держи приз — двадцать пять монет и эту маску. Её носил лучший шут этих краёв.'; } return 'Ты поднимаешь бочку над головой! Толпа ревёт. Держи двадцать пять монет.'; }
      return 'Бочка не поддаётся. Не горюй — приходи завтра, может, повезёт.';
    } });
    if (!st.dice) o.push({ t: 'Сыграть в кости (ставка 10 монет)', f: () => {
      if (P.gold < 10) return 'Без ставки не играют.';
      st.dice = 1;
      const a = 2 + Math.floor(Math.random() * 11) + Math.floor(P.st.luck / 4), b = 2 + Math.floor(Math.random() * 11);
      if (a > b) { P.gold += 10; return 'У тебя ' + a + ', у меня ' + b + '. Твоя взяла — двадцать монет твои.'; }
      if (a === b) return 'По ' + a + '. Ничья — ставка твоя.';
      P.gold -= 10; return 'У тебя ' + a + ', у меня ' + b + '. Не повезло!';
    } });
    o.push({ t: 'Сплясать со всеми', f: () => { Gm.fx('content', 600); Gm.cnt('music'); Gm.gain('music'); return 'Ты пляшешь, пока не гудят ноги. На душе легко.'; } });
    o.push({ t: 'Уйти', f: () => 'close' });
    return o;
  }
  function tourneyOpts(e) {
    const P = G.P;
    const o = [];
    const done = G.S.tourney && G.S.tourney[e.custom + G.map.sett];
    if (!done && !G.map.ents.some((x) => x.champion)) o.push({ t: 'Выйти на ристалище против чемпиона', f: () => {
      const p = Ent.freeNear(P.x + 3, P.y) || Ent.freeNear(P.x, P.y + 3);
      if (!p) return 'Ристалище занято. Подожди.';
      const c = Gm.spawnMon('champion', p.x, p.y, Math.max(2, P.level + 1));
      if (c) { c.champion = 1; c.hostile = true; c.n = 'Чемпион турнира'; c.duelT = G.S.time; }
      return 'Трубы! Чемпион выходит на ристалище. Бьются до последнего — да хранят тебя боги.';
    } });
    if (done) o.push({ t: 'Спросить о турнире', f: () => 'Ты уже победил' + (P.sex === 'f' ? 'а' : '') + ' здесь. О тебе будут петь.' });
    o.push({ t: 'Уйти', f: () => 'close' });
    return o;
  }
  // бой до первой крови: на сорока долях здоровья чемпион сдаётся
  const he0 = Cb.hurtEnt;
  Cb.hurtEnt = function (e, dmg, src, el) {
    if (e && e.champion && !e.dead && (src === 'player' || src === 'ally') && e.hp - dmg < e.mhp * 0.4) {
      e.hp = Math.max(1, e.hp - dmg); e.champion = 0; e.hostile = false;
      Gm.msg('Чемпион опускает копьё: «Довольно! Твоя взяла».', '#ffe0a0');
      championWon(e); Gm.removeEnt(e); return true;
    }
    return he0.apply(this, arguments);
  };
  function championWon(e) {
    const P = G.P, m = G.map;
    G.S.tourney = G.S.tourney || {};
    G.S.tourney['tournament' + m.sett] = 1;
    Gm.xp(80); Gm.cnt('tourney_wins');
    P.gold += 60;
    if (!G.S.taken.a_tourney) { G.S.taken.a_tourney = 1; Gm.give('a_tourney'); Gm.popup('Турнир', 'Чемпион падает. Трибуны ревут. Герольд вручает тебе копьё с лентами — Копьё Победителя — и кошель с шестьюдесятью монетами.'); }
    else Gm.popup('Турнир', 'Чемпион падает. Трибуны ревут. Тебе вручают кошель с шестьюдесятью монетами.');
    if (m.sett >= 0 && G.S.sett[m.sett]) G.S.sett[m.sett].rep = (G.S.sett[m.sett].rep || 0) + 15;
  }
})(window.EOF);
