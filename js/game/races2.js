'use strict';
// Особенности новых народов в игре.
//   Феи — чары дешевле на шестую часть, Разум +1.
//   Морской народ — дышит под водой (как зелье жабр, всегда), жажда приходит медленнее.
//   Вампиры — ночью Сила и Ловкость +2, удар возвращает немного здоровья; днём под открытым небом Сила −1.
//   Волколюды — видят в темноте, ночью Ловкость +1; со зверя чаще падает шкура.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm;
  const race = () => (G.P && G.P.race) || 'human';
  const always = (id) => { const P = G.P; if (!P || !D.effects[id]) return; const ex = P.fx.find((f) => f.id === id); if (!ex) P.fx.push({ id, until: 1e15, t0: G.S.time, race: 1 }); else if (ex.until < 1e14) ex.until = 1e15; };
  const c0 = Gm.calc;
  Gm.calc = function () {
    const r = c0.apply(this, arguments);
    const P = G.P;
    if (!P || !P.st) return r;
    const rc = race(), night = Gm.night && Gm.night();
    if (rc === 'fae') P.st.int += 1;
    if (rc === 'vampire') { if (night) { P.st.str += 2; P.st.dex += 2; } else if (G.map && G.map.outdoor) P.st.str -= 1; }
    if (rc === 'wolfkin' && night) P.st.dex += 1;
    return r;
  };
  // постоянные свойства — после рождения и после загрузки
  const keep = () => { const rc = race(); if (rc === 'merfolk') always('gills'); if (rc === 'wolfkin') always('nighteye'); };
  const lm0 = Gm.loadMap;
  Gm.loadMap = function () { const r = lm0.apply(this, arguments); try { keep(); } catch (e) { /* без героя */ } return r; };
  if (E.Magic) {
    const mc0 = E.Magic.cost;
    E.Magic.cost = function (id) { const c = mc0(id); return race() === 'fae' ? Math.round(c * 0.84) : c; };
  }
  // жажда у морского народа — медленнее (раз в час часть жажды уходит обратно)
  const hr0 = Gm.hourTick || null;
  if (E.Gm.eventHour) {
    const eh0 = Gm.eventHour;
    Gm.eventHour = function () {
      const r = eh0.apply(this, arguments);
      const P = G.P;
      if (P && race() === 'merfolk' && P.thirst > 0) P.thirst = Math.max(0, P.thirst - 1.2);
      return r;
    };
  }
  void hr0;
  // удары: вампир пьёт силу ночью; волколюд снимает шкуру лучше
  const Cb = E.Combat;
  const pa0 = Cb.playerAttack;
  Cb.playerAttack = function (e, opts) {
    const hp0 = e ? e.hp : 0;
    const r = pa0.apply(this, arguments);
    if (e && race() === 'vampire' && Gm.night() && e.hp < hp0 && !(e.tags || []).includes('undead')) Gm.healPlayer(Math.max(1, Math.round((hp0 - Math.max(0, e.hp)) * 0.15)), true);
    return r;
  };
  const k0 = Cb.kill;
  Cb.kill = function (e, src, el) {
    const r = k0.apply(this, arguments);
    if ((src === 'player' || src === 'ally') && race() === 'wolfkin' && e.tags && e.tags.includes('beast') && Math.random() < 0.35 && G.map) G.map.items.push({ x: e.x, y: e.y, it: E.Items.make('hide') });
    return r;
  };
})(window.EOF);
