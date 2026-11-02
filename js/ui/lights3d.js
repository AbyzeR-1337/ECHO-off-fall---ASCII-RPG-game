'use strict';
// Живые огни вида от первого лица: светит не только то, что стоит на месте (костры, очаги,
// фонари, свечи, окна ночью), но и то, что ходит и лежит: огненные твари, духи и призраки,
// жители с факелами в ночи, светящиеся вещи на земле, огненная долынь.
(function (E) {
  const UI = E.UI, G = E.G, U = E.U;
  const FIRE = [1, 0.55, 0.22], TORCH = [1, 0.66, 0.34], GHOST = [0.6, 0.75, 1], DREAM = [0.85, 0.6, 1], HOLY = [1, 0.9, 0.6];
  const GLOW_ITEM = [[/torch/, TORCH, 3.2, 0.7], [/candle/, [1, 0.74, 0.42], 1.8, 0.35], [/lantern/, [1, 0.82, 0.55], 3.6, 0.7], [/crystal|star|ember|fire/, [0.8, 0.6, 1], 1.8, 0.4]];
  UI.extraLights = function (now, cam, gox, goz, RO, dayK) {
    const m = G.map, out = [];
    if (!m) return out;
    const H = UI.Hgt && UI.Hgt.groundAt ? UI.Hgt.groundAt : () => 0;
    const night = 1 - (dayK == null ? 1 : dayK);
    const near = (x, z) => (x - cam.x) ** 2 + (z - cam.z) ** 2 < 900;
    const flick = (k, a) => 0.85 + 0.15 * Math.sin(now / a + k);
    for (const e of m.ents) {
      if (e.dead) continue;
      const s = UI.trackPos ? UI.trackPos(e) : [e.x, e.y];
      const gx = gox + s[0] + 0.5, gz = goz + s[1] + 0.5, x = gx - RO[0], z = gz - RO[1];
      if (!near(x, z)) continue;
      const tg = e.tags || [], gy = H(gx, gz);
      if (tg.includes('fire') || /fire|ember|flame|imp|salamander|lava/.test(e.tpl || '')) out.push({ x, y: gy + 0.9, z, r: 4.5, col: FIRE, i: 1.1 * flick(e.id, 80) });
      else if (e.ghost || tg.includes('spirit')) out.push({ x, y: gy + 1.0, z, r: 3.2, col: GHOST, i: 0.6 * flick(e.id, 300) });
      else if (tg.includes('dream') || tg.includes('god')) out.push({ x, y: gy + 1.0, z, r: 3.5, col: tg.includes('god') ? HOLY : DREAM, i: 0.7 });
      else if (e.breed === 'ember') out.push({ x, y: gy + 0.6, z, r: 2.2, col: FIRE, i: 0.4 * flick(e.id, 120) });
      // ночью на улице жители ходят с факелами (стража — всегда)
      else if (e.kind === 'npc' && !e.asleep && m.outdoor && night > 0.55 && (e.guard || (e.id % 3 === 0)) && E.Sim && E.Sim.age && e.npc != null && E.Sim.age(e.npc) >= 14) out.push({ x: x + 0.15, y: gy + 1.3, z: z + 0.15, r: 4.2, col: TORCH, i: 0.85 * flick(e.id, 70) });
    }
    // светящиеся вещи на земле
    for (const it of m.items) {
      const b = (it.it && it.it.b) || '';
      const g = GLOW_ITEM.find((q) => q[0].test(b));
      if (!g) continue;
      const gx = gox + it.x + 0.5, gz = goz + it.y + 0.5, x = gx - RO[0], z = gz - RO[1];
      if (!near(x, z)) continue;
      out.push({ x, y: H(gx, gz) + 0.25, z, r: g[2], col: g[1], i: g[3] * flick(it.x * 7 + it.y, 90) });
    }
    return out;
  };
})(window.EOF);
