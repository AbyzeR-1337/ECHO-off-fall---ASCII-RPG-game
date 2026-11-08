'use strict';
// Вода и трясина: в трясину можно войти — ноги вязнут, идёшь медленно; в глубокую воду — вплавь.
// Вплавь: медленно, голова у самой воды, бегом и прыжком нельзя, факел гаснет; тяжёлый доспех или
// перегруз тянут на дно — сбрось лишнее или выбирайся на берег. Звери и люди за тобой в воду не идут.
(function (E) {
  const G = E.G, Gm = E.Gm, T = E.T, TL = E.TL, RT = E.RT, U = E.U;
  // трясина — проходима, но вязкая (как мелководье, только медленнее)
  if (TL[T.BOG]) Object.assign(TL[T.BOG], { walk: 1, water: 1, cost: 3, bog: 1 });
  // плыть может каждый
  Gm.swim = () => true;
  const deepAt = (x, y) => { const m = G.map; if (!m || x < 0 || y < 0 || x >= m.w || y >= m.h) return false; const t = TL[m.tiles[y * m.w + x]]; return !!t && t.water === 2 && !t.walk && !m.underwater; };
  Gm.swimming = () => { const P = G.P; return !!(P && deepAt(P.x, P.y)); };
  // тяжесть: латы, кольчуга или сумка тяжелее, чем по силам
  const heavy = () => {
    const P = G.P, body = P.eq && (P.eq.body || P.eq.armor);
    const armor = body && /plate|mail|lat|кольч|лат/i.test(String(body.b || '') + ' ' + String(body.n || ''));
    return armor || (Gm.weight && Gm.cap && Gm.weight() > Gm.cap() * 0.85);
  };
  if (RT) {
    const sp0 = RT.speed;
    RT.speed = function () { let v = sp0.apply(this, arguments); if (Gm.swimming()) v = Math.min(v, RT.WALK * 0.45); return v; };
    const j0 = RT.jump;
    RT.jump = function () { if (Gm.swimming()) return false; return j0.apply(this, arguments); };
  }
  let was = false, lastPull = 0, lastBog = 0;
  // каждый ход мира: что делает вода
  const tk0 = Gm.tick;
  Gm.tick = function () {
    const r = tk0.apply(this, arguments);
    try {
      const P = G.P, m = G.map;
      if (!P || P.dead || !m) return r;
      const sw = Gm.swimming();
      if (sw && !was) {
        Gm.msg('Ты плывёшь. Медленно, бегом не выйдет.', '#80b0e0');
        if (P.light > 0) { P.light = 0; Gm.msg('Факел шипит и гаснет.', '#a0a0a0'); }
        if (E.RT) E.RT.run = false;
      }
      if (sw) {
        if (E.RT) E.RT.run = false;
        if (heavy() && performance.now() - lastPull > 2200) {
          lastPull = performance.now();
          Gm.hurtPlayer(Math.max(1, Math.round(P.mhp * 0.05)), 'drown');
          if (!P.dead) Gm.msg('Тяжесть тянет на дно! Сбрось доспех или плыви к берегу.', '#ff9a80');
        }
      }
      was = sw;
      const t = TL[m.tiles[P.y * m.w + P.x]];
      if (t && t.bog && performance.now() - lastBog > 20000) { lastBog = performance.now(); Gm.msg('Трясина засасывает ноги — каждый шаг через силу.', '#90a070'); }
    } catch (e) { /* вода подождёт */ }
    return r;
  };
  // голова у воды: камера ниже, пока плывёшь
  const UI = E.UI;
  UI.swimDip = () => (Gm.swimming() ? 0.42 : 0);
})(window.EOF);
