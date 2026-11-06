'use strict';
// Отзывы мира на твои дела — чтобы было видно и понятно без подсказок:
// над тем, кого ударил, всплывает урон (цветом стихии), над жилой — находка;
// кирка в шахте звенит, пылит и сыплет искрами; после нескольких ударов крепь скрипит, а потом может рухнуть свод;
// молния, пущенная стоя в воде, бьёт и по тебе; грохот будит спящих в округе.
(function (E) {
  const G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, UI = E.UI, Cb = E.Combat, D = E.D;
  const CSS = { fire: '#ffa060', ice: '#a8e4ff', storm: '#d0d6ff', earth: '#d8b888', holy: '#fff0a8', dark: '#c8a0ff', nature: '#a8e888', arcane: '#ff9ce8', poison: '#a8e070', acid: '#c8e070' };
  const pop = (x, y, s, c, big) => { if (UI.pop3d) UI.pop3d(x, y, s, c, big); };
  const FB = E.Feedback = { pop, CSS };
  const gyAt = (x, z) => { const v = UI.V3 && UI.V3.view; return UI.Hgt && UI.Hgt.groundAt ? UI.Hgt.groundAt((v ? v.gox : 0) + x, (v ? v.goz : 0) + z) : 0; };
  const counts = () => { const o = {}; for (const it of G.P.inv) o[it.b] = (o[it.b] || 0) + (it.q || 1); return o; };
  const itemName = (b) => (D.items[b] ? D.items[b].n : b);
  // что прибавилось в сумке — всплывает над местом
  function showGain(before, x, y) {
    const after = counts();
    let k = 0;
    for (const b in after) { const d = after[b] - (before[b] || 0); if (d > 0) { const P = { x, y: y }; setTimeout(() => pop(P.x, P.y, '+' + d + ' ' + itemName(b), '#f0d8a0'), k * 260); k++; } }
  }
  FB.showGain = showGain;
  FB.counts = counts;

  // ---------- урон над головой ----------
  const he0 = Cb.hurtEnt;
  Cb.hurtEnt = function (e, dmg, src, el) {
    const hp0 = e && !e.dead ? e.hp : null;
    const r = he0.apply(this, arguments);
    try {
      if (hp0 != null && E.RT && E.RT.on) {
        const d = hp0 - Math.max(0, e.hp), P = G.P, m = G.map;
        if (d > 0 && Math.abs(e.x - P.x) <= 16 && Math.abs(e.y - P.y) <= 16 && G.vis[e.y * m.w + e.x]) pop(e.x, e.y, (e.dead ? '✝ ' : '') + d, CSS[el] || (e.dead ? '#ffd080' : '#f4ece0'), e.dead || d >= 40);
      }
    } catch (err) { /* подсказка — не главное */ }
    return r;
  };

  // ---------- кирка ----------
  const mine0 = Gm.mine;
  Gm.mine = function (x, y) {
    const m = G.map, before = counts();
    const r = mine0.apply(this, arguments);
    const SC = E.Schools;
    if (G.map !== m) return r;
    showGain(before, x, y);
    if (SC && SC.fx) {
      const g = gyAt(x + 0.5, y + 0.5);
      for (let k = 0; k < 16; k++) SC.fx.part(x + 0.5 + (Math.random() - 0.5) * 0.6, g + 0.4 + Math.random() * 0.8, y + 0.5 + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 1.4, Math.random() * 1.2, (Math.random() - 0.5) * 1.4, 0.7 + Math.random() * 0.5, 0.07 + Math.random() * 0.05, [0.78, 0.72, 0.62], { grav: 2.5 });
      for (let k = 0; k < 6; k++) SC.fx.part(x + 0.5, g + 0.7, y + 0.5, (Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3, 0.3, 0.03, [1.5, 1.2, 0.6], { grav: 6 });
    }
    if (!m.outdoor) {
      // крепь устаёт: каждая выбитая жила — нагрузка, со временем свод «отдыхает»
      const now = G.S.time;
      m.strain = Math.max(0, (m.strain || 0) - Math.max(0, (now - (m.strainT != null ? m.strainT : now)) / 120)) + 1;
      m.strainT = now;
      if (m.strain >= 3 && !m.creaked) { m.creaked = 1; Gm.msg('Над головой скрипит крепь, сыплется пыль. Ещё пара ударов здесь — и свод может не выдержать.', '#e0b070'); pop(x, y, 'скрип…', '#e0b070'); }
      const ch = m.strain < 3 ? 0.015 : Math.min(0.45, 0.06 + 0.07 * (m.strain - 3));
      if (SC && SC.cavein && SC.cavein(x, y, ch)) { m.strain = 0; m.creaked = 0; }
      // звон кирки слышно — спящие поблизости просыпаются
      for (const e of m.ents) if (!e.dead && e.kind === 'mon' && e.asleep && U.dist(e.x, e.y, x, y) <= 6 && Math.random() < 0.5) { e.asleep = false; e.aware = true; }
    }
    return r;
  };

  // ---------- чары и место, где стоишь ----------
  const SC = E.Schools;
  if (SC) {
    const c0 = SC.cast;
    SC.cast = function (a) {
      const r = c0.apply(this, arguments);
      try {
        const P = G.P, m = G.map, t = m.tiles[P.y * m.w + P.x];
        if (r && a.el === 'storm' && TL[t].water && !a.self) {
          Gm.msg('Ты стоишь в воде — разряд бьёт и по тебе!', '#d0d6ff');
          pop(P.x, P.y, 'разряд!', '#d0d6ff', true);
          Gm.hurtPlayer(2 + (a.tier || 0) * 2, 'shock');
        }
        if (r && a.el === 'fire' && TL[t].water === 1 && Math.random() < 0.5 && !FB._steam) { FB._steam = 1; Gm.msg('Огонь шипит над водой — пар.', '#c0c8d0'); setTimeout(() => { FB._steam = 0; }, 20000); }
      } catch (err) { /* не мешаем чарам */ }
      return r;
    };
  }
})(window.EOF);
