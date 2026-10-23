'use strict';
// Сохранение и загрузка. Мир восстанавливается из зерна, хранятся только изменения.
(function (E) {
  const U = E.U, D = E.D, C = E.C;
  const G = E.G, Gm = E.Gm;
  const Save = E.Save = {};
  const KEY = 'eotf_save_v1';

  Save.exists = function () { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
  Save.clear = function () { try { localStorage.removeItem(KEY); } catch (e) { /* */ } };
  function packS(S) {
    const o = Object.assign({}, S);
    o.maps = {};
    for (const k in S.maps) {
      const d = S.maps[k];
      o.maps[k] = Object.assign({}, d, { ex: d.ex instanceof Uint8Array ? U.bitsToStr(d.ex) : d.ex });
    }
    // новорождённые — компактно
    o.newNpc = S.newNpc.map((n) => [n.born, n.sett, n.first, n.sur, n.sex === 'f' ? 1 : 0, n.house, n.fam, n.traits, n.fear, n.habit]);
    return o;
  }
  function unpackS(o, base) {
    o.newNpc = (o.newNpc || []).map((a, i) => ({ id: base + i, born: a[0], sett: a[1], first: a[2], sur: a[3], sex: a[4] ? 'f' : 'm', house: a[5], fam: a[6], traits: a[7], fear: a[8], habit: a[9], age: 0, job: 'child', friends: [], enemies: [], col: '#d0c0b0', look: 'ребёнок', lvl: 1 }));
    return o;
  }
  Save.save = function () {
    if (!G.P || !G.S || !G.W) return false;
    if (G.P.ended) { /* после концовки мир всё равно сохраняем — для новой жизни */ }
    const data = { v: 1, seed: G.W.seed, t: Date.now(), S: packS(G.S), P: G.P, map: G.map ? { key: G.map.key, x: G.P.x, y: G.P.y } : null, log: G.log.slice(-40), turn: G.turn };
    let s;
    try { s = JSON.stringify(data); } catch (e) { console.warn('save stringify', e); return false; }
    for (let k = 0; k < 3; k++) {
      try { localStorage.setItem(KEY, s); return true; } catch (e) {
        // нехватка места — урезаем летопись
        G.S.chron.splice(0, Math.floor(G.S.chron.length / 2));
        G.S.deadList.splice(0, Math.floor(G.S.deadList.length / 2));
        data.S = packS(G.S);
        s = JSON.stringify(data);
      }
    }
    return false;
  };
  Save.load = function () {
    let data;
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch (e) { return false; }
    if (!data || data.v !== 1) return false;
    G.W = E.World.generate(data.seed);
    G.S = unpackS(data.S, G.W.npcs.length);
    for (const p of G.S.extraPl || []) E.World.place(G.W, p.r, p.o);
    E.Sim.prepare();
    G.P = data.P;
    G.log = data.log || [];
    G.turn = data.turn || 0;
    G.cache.clear();
    G.map = null;
    if (!G.P.ended && data.map) {
      Gm.calc();
      Gm.loadMap(data.map.key, data.map.x, data.map.y, 'load');
      G.P.x = data.map.x; G.P.y = data.map.y;
      Gm.computeFov();
    }
    return true;
  };
  Save.info = function () {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      if (!data) return null;
      return { name: data.P.name, level: data.P.level, ended: data.P.ended, t: data.t, time: data.S.time, worldEnded: !!(data.S.flags && data.S.flags.worldEnded) };
    } catch (e) { return null; }
  };
  window.addEventListener('pagehide', () => { if (G.P && !G.P.ended) Save.save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.P && !G.P.ended) Save.save(); });
})(window.EOF);
