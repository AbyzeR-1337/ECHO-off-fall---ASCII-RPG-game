'use strict';
// Сохранение и загрузка. Мир восстанавливается из зерна, хранятся только изменения.
(function (E) {
  const U = E.U, D = E.D, C = E.C;
  const G = E.G, Gm = E.Gm;
  const Save = E.Save = {};
  const KEY = 'eotf_save_v1';

  const read = function () {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw[0] === 'Z' ? U.lzd(raw.slice(1)) : raw);
  };
  Save.exists = function () { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
  Save.clear = function () { try { localStorage.removeItem(KEY); } catch (e) { /* */ } };
  // Строки, которые повторяются тысячи раз, храним по номерам
  function packS(S) {
    const o = Object.assign({}, S);
    o.maps = {};
    for (const k in S.maps) {
      const d = S.maps[k];
      o.maps[k] = Object.assign({}, d, { ex: d.ex instanceof Uint8Array ? U.bitsToStr(d.ex) : d.ex });
    }
    const names = E.N.male.concat(E.N.female);
    const ni = new Map(names.map((n, i) => [n, i]));
    o.newNpc = S.newNpc.map((n) => [n.born, n.sett, ni.has(n.first) ? ni.get(n.first) : n.first, n.sur, n.sex === 'f' ? 1 : 0, n.house, n.fam, n.traits.map((t) => D.traitIds.indexOf(t)), n.fear, n.habit]);
    const dcT = [], dci = new Map();
    o.npc = {};
    for (const id in S.npc) {
      const st = S.npc[id];
      if (st.dc != null && typeof st.dc === 'string') {
        if (!dci.has(st.dc)) { dci.set(st.dc, dcT.length); dcT.push(st.dc); }
        o.npc[id] = Object.assign({}, st, { dc: dci.get(st.dc) });
      } else o.npc[id] = st;
    }
    o.dcT = dcT;
    return o;
  }
  function unpackS(o, base) {
    const names = E.N.male.concat(E.N.female);
    o.newNpc = (o.newNpc || []).map((a, i) => ({ id: base + i, born: a[0], sett: a[1], first: typeof a[2] === 'number' ? names[a[2]] : a[2], sur: a[3], sex: a[4] ? 'f' : 'm', house: a[5], fam: a[6], traits: (a[7] || []).map((t) => (typeof t === 'number' ? D.traitIds[t] : t)), fear: a[8], habit: a[9], age: 0, job: 'child', friends: [], enemies: [], col: '#d0c0b0', look: 'ребёнок', lvl: 1 }));
    if (o.dcT) for (const id in o.npc) { const st = o.npc[id]; if (typeof st.dc === 'number') st.dc = o.dcT[st.dc]; }
    delete o.dcT;
    return o;
  }
  // Если места не хватает — сначала забываем мелочи
  function trim(S, level) {
    if (level === 0) { if (S.chron.length > 900) S.chron.splice(0, S.chron.length - 900); for (const id in S.npc) { const st = S.npc[id]; if (st.d != null) { delete st.m; delete st.grief; } } }
    if (level === 1) { const keys = Object.keys(S.maps).sort((a, b) => (S.maps[a].v || 0) - (S.maps[b].v || 0)); for (const k of keys.slice(0, Math.floor(keys.length / 2))) { S.maps[k].ex = ''; } if (S.chron.length > 500) S.chron.splice(0, S.chron.length - 500); }
    if (level === 2) { S.deadList.splice(0, Math.floor(S.deadList.length / 2)); if (S.shops) S.shops = {}; }
  }
  Save.save = function () {
    if (!G.P || !G.S || !G.W) return false;
    const data = { v: 1, seed: G.W.seed, t: Date.now(), S: packS(G.S), P: G.P, map: G.map ? { key: G.map.key, x: G.P.x, y: G.P.y } : null, log: G.log.slice(-40), turn: G.turn };
    let s;
    try { s = 'Z' + U.lzc(JSON.stringify(data)); } catch (e) { console.warn('save stringify', e); return false; }
    for (let k = 0; k < 4; k++) {
      try { localStorage.setItem(KEY, s); return true; } catch (e) {
        if (k === 3) break;
        trim(G.S, k);
        data.S = packS(G.S);
        s = 'Z' + U.lzc(JSON.stringify(data));
      }
    }
    console.warn('save failed: storage full');
    return false;
  };
  Save.load = function () {
    let data;
    try { data = read(); } catch (e) { console.warn('load', e); return false; }
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
      const data = read();
      if (!data) return null;
      return { name: data.P.name, level: data.P.level, ended: data.P.ended, t: data.t, time: data.S.time, worldEnded: !!(data.S.flags && data.S.flags.worldEnded) };
    } catch (e) { return null; }
  };
  window.addEventListener('pagehide', () => { if (G.P && !G.P.ended) Save.save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.P && !G.P.ended) Save.save(); });
})(window.EOF);
