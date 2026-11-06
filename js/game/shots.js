'use strict';
// Выстрелы летят туда, куда смотришь: стрела, болт, камень из пращи вылетают из глаз героя
// вдоль взгляда (с наклоном головы), чуть падают под своей тяжестью, втыкаются в стены и деревья
// и попадают в первого, кто окажется на пути, — а не в «ближайшую цель».
// Заклинания бьют по той же линии: огонь и молния видны в полёте.
(function (E) {
  const G = E.G, U = E.U, TL = E.TL, Gm = E.Gm, RT = E.RT, UI = E.UI;
  const SHOTS = RT.shots = [];
  // скорость (клеток в секунду), падение, дальность (во сколько раз дальше «клеточной» дальности оружия)
  const KIND = {
    arrow: { spd: 26, g: 2.2, len: 0.6, far: 3 },
    bolt: { spd: 34, g: 1.2, len: 0.42, far: 3.4 },
    stone: { spd: 19, g: 4.5, len: 0.1, far: 3 },
    spell: { spd: 22, g: 0, len: 0.3, far: 3 },
  };
  const kindOf = (w) => (!w ? 'stone' : /crossbow/.test(w.b) ? 'bolt' : /sling/.test(w.b) ? 'stone' : 'arrow');
  // куда смотрят глаза: начало и направление луча (в клетках карты, высота — как у земли)
  RT.viewRay = function () {
    const V3 = UI.V3, c = V3 && V3.camPos;
    if (!c) return null;
    // в ASCII камера сверху-сзади: стреляешь вперёд от себя, почти ровно
    const p = V3.third ? -0.03 : (V3.pitch || 0) - 0.04, cp = Math.cos(p);
    return { o: [c.x, c.y, c.z], d: [Math.sin(V3.yaw) * cp, Math.sin(p), -Math.cos(V3.yaw) * cp] };
  };
  const ground = (x, z) => { const m = G.map, ox = m.kind === 'over' ? m.region.x * E.C.MW : 0, oz = m.kind === 'over' ? m.region.y * E.C.MH : 0; return UI.Hgt && UI.Hgt.groundAt ? UI.Hgt.groundAt(ox + x, oz + z) : 0; };
  // что остановит полёт в клетке на высоте y
  function stopsAt(x, z, y) {
    const m = G.map, tx = Math.floor(x), tz = Math.floor(z);
    if (tx < 0 || tz < 0 || tx >= m.w || tz >= m.h) return true;
    const t = m.tiles[tz * m.w + tx], tl = TL[t];
    const gy = ground(x, z);
    if (y < gy) return true;
    if (!m.outdoor && y > gy + 1.9) return true; // свод подземелья
    if (tl.indoor && y > gy + 2.4) return true;  // потолок дома
    const c = RT.colliderAt && RT.colliderAt(tx, tz);
    if (c) return Math.hypot(x - (tx + 0.5), z - (tz + 0.5)) < c.r && y < gy + c.h;
    if (UI.mvTiles && UI.mvTiles.BK[t]) return tl.walk ? y > gy + 1.95 : y < gy + 3.2;
    if (tl.walk || tl.water) return false;
    return y < gy + (tl.see ? 1.0 : 2.2);
  }
  // кто стоит на пути: тело — столб радиусом 0.3 и высотой около человека
  function entAt(x, z, y, skip) {
    const m = G.map;
    for (const e of m.ents) {
      if (e.dead || e === skip || e.kind === 'ally') continue;
      const s = UI.trackPos ? UI.trackPos(e) : [e.x, e.y];
      const ex = s[0] + 0.5, ez = s[1] + 0.5;
      if (Math.abs(ex - x) > 0.6 || Math.abs(ez - z) > 0.6) continue;
      const r = e.boss ? 0.5 : 0.32, h = e.boss ? 1.6 : 1.05;
      if (Math.hypot(ex - x, ez - z) > r) continue;
      const gy = ground(ex, ez);
      if (y >= gy - 0.05 && y <= gy + h) return e;
    }
    return null;
  }
  // луч взгляда: первое, во что он упрётся (существо, стена, земля)
  RT.rayHit = function (maxD) {
    const r = RT.viewRay();
    if (!r) return null;
    const [ox, oy, oz] = r.o, [dx, dy, dz] = r.d;
    for (let t = 0.35; t < maxD; t += 0.08) {
      const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
      const e = entAt(x, z, y);
      if (e) return { e, x, y, z, t };
      if (stopsAt(x, z, y)) return { e: null, x, y, z, t, wall: true };
    }
    return { e: null, x: ox + dx * maxD, y: oy + dy * maxD, z: oz + dz * maxD, t: maxD };
  }
  // выстрел из оружия в руке (или во второй руке)
  RT.shoot = function (w, hand) {
    const r = RT.viewRay();
    if (!r) return false;
    const k = kindOf(w), K = KIND[k];
    const range = Math.max(6, (w && w.range ? w.range : 6) * K.far);
    // летит в точку под прицелом: из руки (чуть сбоку и ниже глаз) — туда, с поправкой на падение
    const side = (G.P.hand === 'L') === (hand === 'off') ? 0.1 : -0.1;
    const o = [r.o[0] + Math.cos(UI.V3.yaw) * side, r.o[1] - 0.06, r.o[2] + Math.sin(UI.V3.yaw) * side];
    const h = RT.rayHit(range);
    const tx = h.x - o[0], ty = h.y - o[1], tz = h.z - o[2], d = Math.hypot(tx, ty, tz) || 1;
    const T = d / K.spd;
    const vy = ty / d * K.spd + K.g * T / 2;
    // что заряжено: особая стрела, болт, пуля — тратится; обычные — без счёта
    const fx = E.Loadout ? E.Loadout.take(w) : null;
    SHOTS.push({ k, w, hand, fx, x: o[0], y: o[1], z: o[2], vx: tx / d * K.spd, vy, vz: tz / d * K.spd, g: K.g, left: range, len: K.len, born: performance.now() });
    return true;
  };
  // заклинание по линии взгляда: видимый сгусток, удар — сразу по тому, что на линии
  RT.spellShot = function (el, to) {
    const r = RT.viewRay();
    if (!r) return;
    const d = to ? Math.hypot(to.x - r.o[0], to.y - r.o[1], to.z - r.o[2]) : 12;
    const n = to ? [(to.x - r.o[0]) / d, (to.y - r.o[1]) / d, (to.z - r.o[2]) / d] : r.d;
    SHOTS.push({ k: 'spell', el: el || 'fire', cos: true, x: r.o[0], y: r.o[1] - 0.15, z: r.o[2], vx: n[0] * KIND.spell.spd, vy: n[1] * KIND.spell.spd, vz: n[2] * KIND.spell.spd, g: 0, left: d, len: 0.3, born: performance.now() });
  };
  function hit(s, e) {
    const P = G.P;
    if (e.kind === 'npc' && !e.hostile) { e.wasPeaceful = 1; if (e.npc != null) (P.okHit = P.okHit || {})[e.npc] = 1; }
    const main = P.eq.hand;
    P.eq.hand = s.w || null;
    const o = E.Loadout ? E.Loadout.hitOpts(s.fx, { force: 1, mult: s.hand === 'off' ? 0.8 : 1 }) : { force: 1 };
    try { E.Combat.playerAttack(e, o); }
    finally { P.eq.hand = main; }
    if (s.fx && s.fx.blast) E.Loadout.blast(s.fx, e.x, e.y);
    G.hitEnt = e.id; G.hitEntT = performance.now();
  }
  // полёт: мелкими шагами, чтобы не проскочить сквозь тонкое
  RT.updateShots = function (dt) {
    if (!SHOTS.length) return;
    if (!G.map || RT.shotsMap !== G.map.key) { if (RT.shotsMap && G.map && RT.shotsMap !== G.map.key) SHOTS.length = 0; RT.shotsMap = G.map && G.map.key; }
    for (let i = SHOTS.length - 1; i >= 0; i--) {
      const s = SHOTS[i];
      if (s.stuck) { if (performance.now() - s.stuck > 4000) SHOTS.splice(i, 1); continue; }
      let left = dt;
      while (left > 0 && !s.done) {
        const st = Math.min(left, 0.012);
        left -= st;
        s.vy -= s.g * st;
        const nx = s.x + s.vx * st, ny = s.y + s.vy * st, nz = s.z + s.vz * st;
        const d = Math.hypot(nx - s.x, ny - s.y, nz - s.z);
        s.left -= d;
        if (!s.cos) { const e = entAt(nx, nz, ny); if (e) { hit(s, e); s.done = true; break; } }
        if (s.left <= 0 || stopsAt(nx, nz, ny)) {
          s.done = true;
          if (s.fx && s.fx.blast) E.Loadout.blast(s.fx, Math.floor(s.x), Math.floor(s.z));
          else if (!s.cos && s.k !== 'stone' && s.left > 0) { s.stuck = performance.now(); s.x = nx; s.y = ny; s.z = nz; }
          break;
        }
        s.x = nx; s.y = ny; s.z = nz;
      }
      if (s.done && s.k === 'spell' && RT.onSpellEnd) { try { RT.onSpellEnd(s); } catch (e) { /* без эффекта */ } }
      if (s.done && !s.stuck) SHOTS.splice(i, 1);
    }
  };
})(window.EOF);
