'use strict';
// Мир шире:
//  • Старт по пути: воин просыпается у казарм большого города, следопыт — на лесной опушке, ассасин — в переулке
//    ночного города, маг — у подножия башни магов, жрец — на ступенях храма, алхимик — у лавки травника,
//    странник — у дороги, как прежде.
//  • Святилища богов стоят и в глуши: у каждого бога своё убранство (каменный круг Молчащего, кости Голодного,
//    лунная роса Лассы, жаровни Хорана, озерцо Тиу…) и своё благословение — молитва даёт его на полдня.
//  • Изредка богиня в самом начале медлит и предлагает больше: тайный путь сразу, божественный ранг
//    или тайную школу магии. Можно и отказаться.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, UI = E.UI, Ent = E.Ent;
  const W2 = E.World2 = {};
  // ---------- божественный ранг ----------
  D.effects.chosen = { id: 'chosen', n: 'Избранник богини', kind: 'bless', perm: 1, d: 'Ладонь богини над тобой: все силы больше, раны затягиваются быстрее. Но тьма чует тебя издалека.', mods: { str: 2, dex: 2, con: 2, int: 2, fai: 2, luck: 1 }, regen: 0.6 };

  // ---------- старт по пути ----------
  const START = {
    warrior: { types: ['capital', 'town'], spot: 'guard', note: 'Ты просыпаешься у казарм. Пахнет кожей, железом и солдатской кашей. Стражник косится: «Новенький? Капитан за углом».' },
    ranger: { types: ['hamlet', 'village', 'farm'], biomes: ['forest', 'ancient', 'tundra'], edge: 1, note: 'Ты просыпаешься на опушке, у охотничьего костра. Лес шумит совсем рядом, а в траве — свежий заячий след.' },
    assassin: { types: ['capital', 'town'], spot: 'tavern', night: 1, note: 'Ты просыпаешься в тёмном переулке за таверной. В кармане — чужой кошелёк. Чей — лучше не вспоминать.' },
    mage: { types: ['town', 'capital'], tower: 1, note: 'Ты просыпаешься у подножия башни магов. Наверху светится одинокое окно, и кто-то там читает вслух.' },
    priest: { b: 'temple', spot: 'temple', note: 'Ты просыпаешься на ступенях храма. Звонят к заутрене, и служка уже несёт тебе воды.' },
    alchemist: { b: 'alch', spot: 'alch', note: 'Ты просыпаешься у лавки травника. В окне булькают склянки, пахнет полынью и серой.' },
  };
  function pickSett(o) {
    const Wd = G.W, s0 = Wd.regions[Wd.start];
    const ok = Wd.settlements.filter((s) => {
      const g = Wd.regions[s.region];
      if (!g || g.exist !== 'always' || (G.S.sett[s.id] && G.S.sett[s.id].destroyed) || g.danger > 4) return false;
      if (o.types && !o.types.includes(s.type)) return false;
      if (o.b && !s.b[o.b]) return false;
      if (o.biomes && !o.biomes.includes(g.biome)) return false;
      return true;
    });
    ok.sort((a, b) => (Math.abs(a.rx - s0.x) + Math.abs(a.ry - s0.y)) - (Math.abs(b.rx - s0.x) + Math.abs(b.ry - s0.y)));
    return ok[0] || null;
  }
  const sl0 = Gm.startLife;
  Gm.startLife = function (name, sex, reborn) {
    const cls = G.startCls;
    G.startCls = null; G.startNote = null;
    const o = !reborn && cls && START[cls];
    const s = o ? pickSett(o) || (o.biomes ? pickSett(Object.assign({}, o, { biomes: null })) : null) : null;
    if (!s) return sl0.apply(this, arguments);
    const Wd = G.W, keep = Wd.start;
    Wd.start = s.region;
    let r;
    try { r = sl0.apply(this, arguments); } finally { Wd.start = keep; }
    try {
      const m = G.map, P = G.P;
      let p = null;
      if (o.tower) { for (const k in m.feat) if (m.feat[k].k === 'magetower') { const x = k % m.w, y = Math.floor(k / m.w); p = Ent.freeNear(x, y + 3); break; } }
      if (!p && o.spot && m.spots[o.spot] && m.spots[o.spot].door) { const d = m.spots[o.spot].door; p = Ent.freeNear(d.x, d.y + (m.spots[o.spot].rect && d.y <= m.spots[o.spot].rect.y ? -1 : 1)) || Ent.freeNear(d.x, d.y); }
      if (!p && o.edge && m.settRect) { const sr = m.settRect; p = Ent.freeNear(Math.max(2, sr.x - 6), sr.y + (sr.h >> 1)); }
      if (p) { P.x = p.x; P.y = p.y; P.posX = p.x + 0.5; P.posY = p.y + 0.5; }
      if (o.night) G.S.time = Math.floor(G.S.time / 1440) * 1440 + 22 * 60 + 30;
      if (cls === 'assassin') P.gold += 12;
      Gm.computeFov();
      G.log = [];
      Gm.msg(o.note, '#e0d0b0');
      G.startNote = o.note;
      P.startRegion = s.region;
    } catch (e) { /* остаёмся у дороги */ }
    return r;
  };

  // ---------- святилища: благословение бога ----------
  const BLESS = { silent: 'calm', hungry: 'harvest', giant: 'stone', ash: 'deathward', horns: 'forest', moon: 'moon', sun: 'sun', deep: 'sea', faceless: 'stealth', chron: 'focus', throne: 'king', wind: 'wind' };
  W2.BLESS = BLESS;
  const pr0 = Gm.prayAtShrine;
  Gm.prayAtShrine = function (f) {
    const P = G.P, k = 'sh_' + G.map.key + ':' + f.god, again = P.shrineDays && P.shrineDays[k] === Gm.day();
    const first = !(P.shrines && P.shrines[f.god]);
    const r = pr0.apply(this, arguments);
    if (again || P.dead) return r;
    const god = D.godById[f.god], b = BLESS[f.god];
    if (first) { Gm.xp(12); Gm.msg('Ты нашёл святилище: ' + god.n + '. Боги помнят тех, кто к ним приходит.', '#fff0b0'); }
    if (b && D.effects[b] && Math.random() < 0.35 + P.st.fai * 0.03 + (first ? 0.3 : 0)) {
      Gm.fx(b, 60 * 12);
      if (UI.pop3d) UI.pop3d(P.x, P.y, '✦ ' + D.effects[b].n, '#fff0b0', true);
    }
    return r;
  };
  // в меню святилища — чьё и что даёт
  const sh0 = Gm.shrine;
  Gm.shrine = function (f, x, y) {
    const god = D.godById[f.god], b = BLESS[f.god];
    if (god && b && D.effects[b] && !god.hint) god.hint = 1;
    return sh0.apply(this, arguments);
  };

  // ---------- редкий дар богини в начале ----------
  // вызывается после выбора пути и дара; по умолчанию — 1 из 12; localStorage eotf_offer=1 — всегда
  W2.offer = function (P, gn) {
    let force = false;
    try { force = localStorage.getItem('eotf_offer') === '1'; } catch (e) { /* */ }
    if (!force && Math.random() > 1 / 12) return false;
    const hid = (D.hiddenClasses || []).filter((c) => !P.paths.includes(c));
    const hc = hid.length ? hid[Math.floor(Math.random() * hid.length)] : null;
    const SC = E.Schools, un = ['time', 'dream', 'song'][Math.floor(Math.random() * 3)];
    const she = P.sex === 'f' ? 'избранницей' : 'избранником';
    const opts = [];
    if (hc) opts.push({ t: 'Тайный путь сразу: ' + D.classes[hc].n + ' — ' + D.classes[hc].d, f: () => { Gm.setClass(hc); Gm.cnt('goddess_offer'); Gm.popup(D.classes[hc].n, '«Этого пути не найти на картах. Иди по нему — он твой.»\n\nТы — ' + D.classes[hc].n + '.'); } });
    opts.push({ t: 'Божественный ранг — стать ' + she + ' ' + (U.gen ? U.gen(gn) : gn), f: () => { P.divine = 1; Gm.fx('chosen', 0); Gm.calc(); P.hp = P.mhp; P.mp = P.mmp; Gm.cnt('goddess_offer'); Gm.popup('Божественный ранг', '«Я положу ладонь тебе на голову. Тебе будет легче — всем силам, всем ранам. Но тьма увидит этот свет издалека. Не жалуйся потом.»'); } });
    if (SC && SC.grantUnique && !SC.member(un)) opts.push({ t: 'Тайная магия: ' + SC.list[un].n + ' — ' + SC.list[un].d, f: () => { SC.grantUnique(un, '«Этому не учат в башнях. Я научу.» — и в голове звучит то, чего нет ни в одной книге.'); Gm.cnt('goddess_offer'); } });
    opts.push({ t: '«Мне хватит того, что есть»', f: () => { Gm.fx('luckbuff', 60 * 24 * 3); Gm.msg('Богиня улыбается: «Скромность — тоже дар». Удача будет с тобой эти дни.', '#fff0b0'); } });
    UI.menu('Богиня медлит. «Ты мне нравишься. Могу дать больше — но только одно. Выбирай.»', opts);
    return true;
  };
})(window.EOF);
