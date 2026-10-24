'use strict';
// Мир живёт сам. Ходы мира идут по часам (RT.TICK секунд), а не после твоих действий:
// звери бегают, люди ходят по делам, день сменяет ночь, пока ты стоишь и смотришь.
// Твои дела занимают время: удар, глоток, взгляд в сумку — пока занят, новое не начать.
// Долгие дела (готовка, ремесло, рыбалка) проматывают время сразу, как и раньше.
// От первого лица ходьба плавная: мышь (или палец) поворачивает голову, WASD ведут куда смотришь.
(function (E) {
  const G = E.G, U = E.U, C = E.C, TL = E.TL, Gm = E.Gm;
  const RT = E.RT = {
    on: true,
    TICK: 0.5,      // секунд на ход мира
    MIN: 0.25,      // игровых минут за ход мира: сутки — 48 минут
    WALK: 2.7,      // клеток в секунду шагом
    RUN: 1.6,       // во сколько раз быстрее бегом (Shift)
    TURN: 2.4,      // радиан в секунду — поворот стрелками
    R: 0.27,        // «толщина» героя
    acc: 0, last: 0, busyUntil: 0, ticking: false, freeMove: false, stepping: false,
    held: new Set(), path: null, run: false, look: { dx: 0, dy: 0 },
  };
  try { if (localStorage.getItem('eotf_rt') === '0') RT.on = false; } catch (e) { /* по умолчанию — живой мир */ }
  RT.set = (on) => { RT.on = !!on; try { localStorage.setItem('eotf_rt', on ? '1' : '0'); } catch (e) { /* только на сеанс */ } };
  RT.active = () => RT.on && !!G.P && !!G.map && !G.P.dead && !G.P.ended && !!E.UI.top() && E.UI.top().name === 'game' && !document.hidden;
  RT.busy = () => performance.now() < RT.busyUntil;
  RT.is3D = () => !!(E.UI.is3D && E.UI.is3D());

  // ---------- время твоих дел ----------
  const endTurn0 = Gm.endTurn;
  Gm.endTurn = function (cost) {
    if (!RT.on || RT.ticking || !G.P) return endTurn0.call(this, cost);
    cost = cost == null ? 1 : cost;
    if (cost >= 3) return endTurn0.call(this, cost); // долгое дело — время проходит сразу
    const P = G.P;
    if (P.dead || P.ended) return;
    if (!RT.freeMove) {
      const unit = RT.stepping ? 1 / RT.speed() : RT.TICK * (10 / (P.st.speed || 10));
      RT.busyUntil = Math.max(RT.busyUntil, performance.now()) + cost * unit * 1000;
    }
    Gm.calc();
    E.Ent.computeDmap();
    Gm.computeFov();
  };
  // ход мира — сам по себе
  RT.worldTick = function () {
    RT.ticking = true;
    try {
      Gm.tick();
      G.mapChanged = false;
      if (G.P.dead || G.P.ended) return;
      Gm.calc();
      E.Ent.computeDmap();
      Gm.computeFov();
      if (G.autoSaveTurn == null || G.turn - G.autoSaveTurn > 240) { G.autoSaveTurn = G.turn; if (E.Save) E.Save.save(); }
    } finally { RT.ticking = false; }
  };
  // скорость шага: стати, ноша, болото под ногами, бег
  RT.speed = function () {
    const P = G.P, m = G.map;
    let v = RT.WALK * U.clamp((P.st.speed || 10) / 10, 0.5, 2);
    if (RT.run) v *= RT.RUN;
    const t = TL[m.tiles[U.clamp(P.y, 0, m.h - 1) * m.w + U.clamp(P.x, 0, m.w - 1)]];
    if (t && t.cost > 1) v /= Math.min(3, t.cost);
    if (Gm.hasFx('webbed')) v *= 0.35;
    if (Gm.hasFx('chafed')) v *= 0.85;
    return v;
  };

  // звери в живом мире бьют не каждый ход: после удара переводят дух (иначе бой — мясорубка)
  const monAttack0 = E.Combat.monAttack;
  E.Combat.monAttack = function (e, ranged) {
    if (RT.on && RT.ticking) {
      if ((e.atkWait || 0) > G.turn) return;
      e.atkWait = G.turn + (ranged ? 3 : 2);
    }
    return monAttack0.apply(this, arguments);
  };

  // ---------- кто уступает дорогу ----------
  RT.meek = (e) => e.kind === 'ally' || (e.kind === 'npc' && !e.hostile && !e.duel) || (e.kind === 'mon' && e.ai === 'passive' && !e.hostileToP);
  const edgeOk = () => { const m = G.map; return !(m.kind === 'dun' || (m.dim && m.dimGrid === 1) || m.dimName === 'sea'); };
  // можно ли телу оказаться в клетке
  RT.blocked = function (x, y) {
    const m = G.map, P = G.P;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return !edgeOk();
    const i = y * m.w + x, t = TL[m.tiles[i]];
    if (m.feat[i] && m.feat[i].k === 'locked') return true;
    if (!t.walk) return !(t.water === 2 && (Gm.hasBoat() || Gm.swim() || m.underwater));
    if (t.lava && !Gm.fxFlag('fireImm')) return true;
    const e = m.occ.get(i);
    if (e && !e.dead && !(x === P.x && y === P.y) && !RT.meek(e)) return true;
    return false;
  };
  const say = (k, text, col) => { const now = performance.now(); RT.said = RT.said || {}; if (now - (RT.said[k] || 0) > 2500) { RT.said[k] = now; Gm.msg(text, col); } };
  function whyBlocked(x, y) {
    const m = G.map;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
    const i = y * m.w + x, t = TL[m.tiles[i]];
    if (m.feat[i] && m.feat[i].k === 'locked') say('lock', 'Заперто.');
    else if (t.water === 2 && !t.walk) say('water', m.tiles[i] === E.T.BOG ? 'Трясина. Не пройти.' : 'Глубокая вода. Без лодки не переплыть.');
    else if (t.lava) say('lava', 'Это лава. Туда нельзя.', '#ff8040');
  }

  // ---------- плавная ходьба от первого лица ----------
  // P.posX, P.posY — точное место героя внутри клетки (P.x, P.y — сама клетка, ею живёт вся игра)
  RT.syncPos = function () {
    const P = G.P;
    if (P.posX == null || Math.floor(P.posX) !== P.x || Math.floor(P.posY) !== P.y || RT.posMap !== G.map.key) {
      if (!(RT.posMap && RT.posMap !== G.map.key && RT.carry)) { P.posX = P.x + 0.5; P.posY = P.y + 0.5; }
      else { P.posX = P.x + RT.carry[0]; P.posY = P.y + RT.carry[1]; if (Math.floor(P.posX) !== P.x || Math.floor(P.posY) !== P.y) { P.posX = P.x + 0.5; P.posY = P.y + 0.5; } }
      RT.carry = null;
      RT.posMap = G.map.key;
    }
  };
  // тело — круг: упираемся в непроходимые клетки по каждой оси отдельно (скользим вдоль стен)
  function collide(x, z, ox, oz) {
    const r = RT.R, P = G.P;
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r), z0 = Math.floor(z - r), z1 = Math.floor(z + r);
    for (let ty = z0; ty <= z1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tx === P.x && ty === P.y) continue;
      if (!RT.blocked(tx, ty)) continue;
      // ближайшая точка клетки к центру тела
      const cx = U.clamp(x, tx, tx + 1), cz = U.clamp(z, ty, ty + 1);
      const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
      if (d >= r) continue;
      if (d < 1e-6) { x = ox; z = oz; continue; }
      x = cx + dx / d * r; z = cz + dz / d * r;
    }
    return [x, z];
  }
  // перешли в другую клетку — это обычный шаг игры (люди уступают, вещи под ногами, край карты)
  function enterTile(nx, ny, fx, fy) {
    const P = G.P, key = G.map.key, ox = P.x, oy = P.y;
    const dx = U.clamp(nx - P.x, -1, 1), dy = U.clamp(ny - P.y, -1, 1);
    if (RT.blocked(ox + dx, oy + dy) && !(dx && dy && !RT.blocked(ox + dx, oy) && !RT.blocked(ox, oy + dy))) { whyBlocked(ox + dx, oy + dy); return false; }
    RT.freeMove = true;
    RT.carry = [fx - Math.floor(fx), fy - Math.floor(fy)];
    try { Gm.move(dx, dy); } finally { RT.freeMove = false; }
    if (G.map.key !== key) return true; // ушли в соседние земли — место уже поставлено
    RT.carry = null;
    if (P.x === ox + dx && P.y === oy + dy) return true;
    return false;
  }
  RT.move3D = function (dt) {
    const P = G.P, V3 = E.UI.V3;
    RT.syncPos();
    const h = RT.held;
    // поворот стрелками
    const turn = (h.has('turnR') ? 1 : 0) - (h.has('turnL') ? 1 : 0);
    if (turn) { V3.yaw += turn * RT.TURN * dt; V3.yawT = V3.yaw; }
    let fwd = (h.has('fwd') ? 1 : 0) - (h.has('back') ? 1 : 0), str = (h.has('strR') ? 1 : 0) - (h.has('strL') ? 1 : 0);
    // ходьба к месту, на которое указали
    if (RT.path && !fwd && !str) {
      const nxt = RT.path[0];
      if (!nxt) RT.path = null;
      else {
        const tx = nxt[0] + 0.5 - P.posX, tz = nxt[1] + 0.5 - P.posY, d = Math.hypot(tx, tz);
        if (d < 0.18) { RT.path.shift(); if (!RT.path.length) RT.path = null; }
        else {
          const want = Math.atan2(tx, -tz);
          let dd = want - V3.yaw; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI;
          V3.yaw += U.clamp(dd, -5 * dt, 5 * dt); V3.yawT = V3.yaw;
          fwd = Math.abs(dd) < 1.2 ? 1 : 0.2;
        }
        if (E.UI.hostilesVisible() > (RT.pathSeen || 0)) { RT.path = null; Gm.msg('Ты замечаешь опасность.', '#ffb080'); }
      }
    } else if (fwd || str) RT.path = null;
    if (!fwd && !str) { RT.moving = false; return; }
    if (Gm.hasFx('stun')) { RT.moving = false; return; }
    const len = Math.hypot(fwd, str) || 1;
    const v = RT.speed() * dt / len;
    const sy = Math.sin(V3.yaw), cy = Math.cos(V3.yaw);
    const mx = (sy * fwd + cy * str) * v, mz = (-cy * fwd + sy * str) * v;
    const ox = P.posX, oz = P.posY;
    let [x, z] = collide(ox + mx, oz, ox, oz);
    [x, z] = collide(x, oz + mz, x, oz);
    RT.moving = Math.hypot(x - ox, z - oz) > 1e-4;
    RT.walked = (RT.walked || 0) + Math.hypot(x - ox, z - oz);
    const nx = Math.floor(x), ny = Math.floor(z);
    if (nx !== P.x || ny !== P.y) {
      const key = G.map.key;
      if (enterTile(nx, ny, x, z)) { if (G.map.key === key) { P.posX = x; P.posY = z; } else RT.syncPos(); }
      else { RT.path = null; P.posX = U.clamp(x, P.x + 0.02, P.x + 0.98); P.posY = U.clamp(z, P.y + 0.02, P.y + 0.98); }
    } else { P.posX = x; P.posY = z; }
    RT.posMap = G.map.key;
  };
  // ASCII-виды: шаг по клеткам, пока держишь направление
  const GRID = { fwd: [0, -1], back: [0, 1], strL: [-1, 0], strR: [1, 0], turnL: [-1, 0], turnR: [1, 0], ul: [-1, -1], ur: [1, -1], dl: [-1, 1], dr: [1, 1] };
  RT.moveGrid = function () {
    if (RT.busy()) return;
    let dx = 0, dy = 0;
    for (const k of RT.held) { const d = GRID[k]; if (d) { dx += d[0]; dy += d[1]; } }
    dx = U.clamp(dx, -1, 1); dy = U.clamp(dy, -1, 1);
    if (!dx && !dy) return;
    RT.stepping = true;
    try { Gm.move(dx, dy); } finally { RT.stepping = false; }
    if (!RT.busy()) RT.busyUntil = performance.now() + 120; // упёрлись — не долбить стену
  };

  // ---------- на что смотришь (от первого лица) ----------
  // G.focus — то, с чем сработает «Действие»; G.aim — существо перед тобой, по которому ударишь
  RT.findFocus = function () {
    const P = G.P, m = G.map, V3 = E.UI.V3;
    G.focus = null; G.aim = null;
    if (!m || !P || !RT.is3D() || P.posX == null) return;
    const fx = Math.sin(V3.yaw), fz = -Math.cos(V3.yaw);
    let best = null, bestS = 1e9, aim = null, aimS = 1e9;
    const consider = (o, cx, cz, reach) => {
      const dx = cx - P.posX, dz = cz - P.posY, d = Math.hypot(dx, dz);
      if (d > reach) return;
      const a = d < 0.35 ? 0 : Math.acos(U.clamp((dx * fx + dz * fz) / d, -1, 1));
      if (a > 0.85 && d > 0.75) return;
      const s = a * 1.4 + d * 0.45;
      if (s < bestS) { bestS = s; best = o; }
    };
    for (let y = P.y - 2; y <= P.y + 2; y++) for (let x = P.x - 2; x <= P.x + 2; x++) {
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      const i = y * m.w + x;
      if (!G.vis[i]) continue;
      const e = m.occ.get(i);
      if (e && !e.dead && !(x === P.x && y === P.y && false)) {
        const s = E.UI.trackPos ? E.UI.trackPos(e) : [x, y];
        if (e.kind === 'npc' && !e.hostile) consider({ x, y, e, kind: 'talk' }, s[0] + 0.5, s[1] + 0.5, 1.9);
      }
      if (m.chests[i] || m.feat[i] || TL[m.tiles[i]].use || TL[m.tiles[i]].ore || TL[m.tiles[i]].crystal) {
        if (Gm.plainUse(x, y) || TL[m.tiles[i]].ore || TL[m.tiles[i]].crystal || (m.feat[i] && m.feat[i].k === 'locked')) consider({ x, y, kind: 'use' }, x + 0.5, y + 0.5, 1.75);
      }
      if (Gm.itemsAt(x, y).length) consider({ x, y, kind: 'pick' }, x + 0.5, y + 0.5, 1.5);
    }
    // цель удара: ближайшее существо перед глазами
    for (const e of m.ents) {
      if (e.dead || e.kind === 'ally' || !G.vis[e.y * m.w + e.x]) continue;
      const s = E.UI.trackPos ? E.UI.trackPos(e) : [e.x, e.y];
      const dx = s[0] + 0.5 - P.posX, dz = s[1] + 0.5 - P.posY, d = Math.hypot(dx, dz);
      const reach = RT.reach();
      if (d > reach) continue;
      const a = Math.acos(U.clamp((dx * fx + dz * fz) / (d || 1), -1, 1));
      const lim = reach > 2 ? 0.22 : 0.75;
      if (a > lim && d > 0.8) continue;
      const sc = a * 2 + d * 0.3 - ((e.hostile || e.hostileToP) ? 0.5 : 0);
      if (sc < aimS) { aimS = sc; aim = e; }
    }
    G.focus = best; G.aim = aim;
  };
  RT.reach = () => { const w = G.P.eq.hand; return w && w.range ? Math.min(w.range, 9) : 1.75; };

  // ---------- действие и удар от первого лица ----------
  const interact0 = Gm.interact;
  Gm.interact = function () {
    const P = G.P, f = G.focus;
    if (RT.is3D() && f) {
      if (f.kind === 'talk' && f.e && !f.e.dead) { E.UI.talk(f.e); return; }
      if (f.kind === 'pick') { Gm.pickupAt(f.x, f.y); return; }
      if (f.kind === 'use' && Gm.interactAt(f.x, f.y)) return;
    }
    return interact0.apply(this, arguments);
  };
  // подобрать вещи с соседней клетки — рука дотянется
  Gm.pickupAt = function (x, y) {
    const P = G.P, ox = P.x, oy = P.y;
    if (x === ox && y === oy) { Gm.pickupAll(); return; }
    P.x = x; P.y = y;
    try { Gm.pickupAll(); } finally { P.x = ox; P.y = oy; Gm.computeFov(); }
  };
  RT.swing = 0;
  RT.attack = function () {
    const P = G.P;
    if (!P || P.dead || P.ended || RT.busy()) return;
    const e = G.aim, w = P.eq.hand;
    RT.swing = performance.now();
    if (!e) {
      if (w && w.range) Gm.msg('Стрела уходит в пустоту.');
      Gm.endTurn(1);
      return;
    }
    const peaceful = e.kind === 'npc' && !e.hostile;
    if (peaceful) { E.UI.confirm('Напасть на ' + (Gm.knows(e.npc) ? U.acc(e.n, e.g) : 'этого человека') + '?', () => { e.wasPeaceful = 1; E.Combat.playerAttack(e, { force: 1 }); Gm.endTurn(1); }); return; }
    E.Combat.playerAttack(e, { force: 1 });
    P.stillTurns = 0;
    Gm.endTurn(1);
  };
  // пойти к клетке (касание земли): путь по клеткам, плавно
  RT.walkTo = function (tx, ty) {
    const P = G.P;
    const path = E.Ent.pathTo({ x: P.x, y: P.y }, tx, ty, 4000);
    if (!path || !path.length) { Gm.msg('Туда не пройти.'); return; }
    RT.path = path.map((p) => [p[0], p[1]]);
    RT.pathSeen = E.UI.hostilesVisible();
  };

  // ---------- кадр ----------
  RT.frame = function (now) {
    const dt = Math.min(0.25, (now - (RT.last || now)) / 1000);
    RT.last = now;
    if (!RT.active()) { RT.acc = 0; RT.moving = false; return false; }
    RT.acc += dt;
    let n = 0;
    while (RT.acc >= RT.TICK && n++ < 3) { RT.acc -= RT.TICK; RT.worldTick(); if (!RT.active()) return true; }
    if (RT.acc > RT.TICK) RT.acc = 0;
    // шаги — мелкими долями, чтобы на медленном устройстве не проскочить сквозь стену
    if (RT.is3D()) { let left = dt; while (left > 1e-4 && RT.active()) { const d = Math.min(0.05, left); RT.move3D(d); left -= d; } }
    else { RT.syncPos(); RT.moveGrid(); }
    if (!RT.active()) return true;
    if (RT.is3D()) RT.findFocus(); else { G.focus = null; G.aim = null; }
    return true;
  };
})(window.EOF);
