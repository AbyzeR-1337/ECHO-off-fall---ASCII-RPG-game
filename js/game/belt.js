'use strict';
// Пояс и спина: оружие висит на тебе, а не лежит в сумке. На поясе — три места
// (меч, кинжал, топор, булава, кирка, факел, фонарь), за спиной — два (лук, арбалет,
// посох, копьё, щит). Колесо мыши (от первого лица) перебирает: кулаки → пояс → спина.
// Рука уходит вниз и возвращается с другим оружием; внизу экрана — полоска с тем, что висит.
// В сумке у вещи: «Повесить на пояс», «Закинуть за спину», «Снять с пояса».
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, UI = E.UI, Items = E.Items;
  const BL = E.Belt = {};
  const CAP = { belt: 3, back: 2 };
  const slotOf = (it) => it && (it.s || (D.items[it.b] || {}).s);
  BL.canHang = (it) => slotOf(it) === 'hand';
  // куда вешать по умолчанию: длинное и двуручное — за спину
  BL.placeFor = (it) => (/bow|crossbow|staff|spear|trident|halberd|pike|scythe|shield|greatsword|zweihander/.test(it.b || '') ? 'back' : 'belt');
  const hung = (where) => G.P.inv.filter((it) => it.hang === where).sort((a, b) => (a.ho || 0) - (b.ho || 0));
  BL.hung = hung;
  BL.free = (where) => CAP[where] - hung(where).length;
  BL.hang = function (it, where, quiet) {
    where = where || BL.placeFor(it);
    if (it.hang === where) return true;
    if (BL.free(where) <= 0) { if (!quiet) Gm.msg(where === 'belt' ? 'На поясе нет места.' : 'За спиной нет места.', '#c0a080'); return false; }
    it.hang = where; it.ho = (G.P.ho = (G.P.ho || 0) + 1);
    if (!quiet) Gm.msg((where === 'belt' ? 'На поясе: ' : 'За спиной: ') + Items.name(it).toLowerCase() + '.', '#a8a090');
    return true;
  };
  BL.unhang = function (it) { delete it.hang; delete it.ho; };
  // сами вешаются: новое оружие, если есть место
  BL.auto = function () {
    const P = G.P;
    if (!P) return;
    for (const it of P.inv) {
      if (it.hang || !BL.canHang(it)) continue;
      if (it.noHang) continue;
      const w = BL.placeFor(it);
      if (BL.free(w) > 0) BL.hang(it, w, true);
      else if (BL.free(w === 'belt' ? 'back' : 'belt') > 0 && w === 'back') { /* длинное за пояс не повесишь */ }
    }
  };
  // что перебирает колесо: кулаки, затем пояс, затем спина
  BL.cycle = function () { BL.auto(); return [null].concat(hung('belt'), hung('back')); };
  BL.step = function (d) {
    const P = G.P;
    if (!P || P.dead) return;
    Gm.ensureSlots(P);
    const list = BL.cycle();
    if (list.length < 2) { BL.show(); return; }
    let i = list.indexOf(P.eq.hand || null);
    if (i < 0) i = 0;
    const next = list[(i + d + list.length) % list.length];
    BL.wield(next);
    BL.show();
  };
  // взять в главную руку — без лишних слов
  BL.wield = function (it) {
    const P = G.P, msg0 = Gm.msg;
    UI.swapT = performance.now();
    if (!it) { if (P.eq.hand) { P.eq.hand = null; Gm.calc(); } return; }
    Gm.msg = function (s) { if (/двумя руками|занята|гасишь|бросаешь/.test(s)) return msg0.apply(this, arguments); };
    try { Gm.equip(it, 'hand'); } finally { Gm.msg = msg0; }
  };
  BL.showT = 0;
  BL.show = () => { BL.showT = performance.now(); UI.animUntil = Math.max(UI.animUntil || 0, BL.showT + 2600); };

  // ---------- колесо мыши ----------
  // (main.js зовёт UI.wheel, если он есть: в виде от первого лица — оружие, иначе — масштаб)
  UI.wheel = function (dy) {
    const top = UI.top();
    if (!top || top.name !== 'game' || !(UI.is3D && UI.is3D())) return false;
    BL.step(dy > 0 ? 1 : -1);
    UI.render();
    return true;
  };

  // ---------- полоска внизу экрана ----------
  const SHORT = (it) => { const n = Items.name(it).replace(/\s*×\d+$/, ''); const w = n.split(/\s+/); return (w[0].length > 9 ? w[0].slice(0, 8) + '.' : w[0]) + (w[1] && w[0].length < 6 ? ' ' + w[1].slice(0, 5) : ''); };
  const hud0 = UI.drawHUD3D;
  UI.drawHUD3D = function (ctx, t, v) {
    if (hud0) hud0.apply(this, arguments);
    const P = G.P;
    if (!P || P.dead) return;
    const now = performance.now(), age = now - BL.showT;
    const list = BL.cycle();
    if (list.length < 2) return;
    const a = age < 2200 ? 1 : age < 2600 ? 1 - (age - 2200) / 400 * 0.45 : 0.55;
    const fpx = Math.max(10, Math.round(t.fpx * 0.78));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = fpx + 'px ' + t.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const cells = list.map((it) => ({ it, s: it ? SHORT(it) : 'кулаки', w: 0 }));
    for (const c of cells) c.w = Math.max(fpx * 3.4, ctx.measureText(c.s).width + fpx * 0.9);
    const gap = fpx * 0.35, total = cells.reduce((s, c) => s + c.w + gap, 0) + fpx * 0.8;
    let x = v.vx0 + v.vw / 2 - total / 2;
    const y = v.vy0 + v.vh - fpx * 2.6, h = fpx * 1.6;
    const cur = P.eq.hand || null;
    cells.forEach((c, i) => {
      // разделители: пояс | спина
      if (i === 1 || (c.it && c.it.hang === 'back' && (!cells[i - 1].it || cells[i - 1].it.hang !== 'back'))) {
        ctx.fillStyle = 'rgba(200,180,140,0.55)'; ctx.fillRect(Math.round(x + fpx * 0.1), Math.round(y - h / 2 + 2), 1, Math.round(h - 4));
        ctx.fillStyle = '#9a8a6a'; ctx.fillText(c.it.hang === 'back' ? 'спина' : 'пояс', x + fpx * 1.6, y - h * 0.95);
        x += fpx * 0.4;
      }
      const on = c.it === cur;
      ctx.fillStyle = on ? 'rgba(200,160,80,0.55)' : 'rgba(12,10,8,0.6)';
      ctx.fillRect(Math.round(x), Math.round(y - h / 2), Math.round(c.w), Math.round(h));
      if (on) { ctx.strokeStyle = '#f0d090'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x) + 0.5, Math.round(y - h / 2) + 0.5, Math.round(c.w) - 1, Math.round(h) - 1); }
      ctx.fillStyle = on ? '#fff0c0' : '#c8bca0';
      ctx.fillText(c.s, x + c.w / 2, y + 1);
      x += c.w + gap;
    });
    ctx.restore();
  };

  // ---------- в сумке ----------
  const im0 = UI.itemMenu;
  UI.itemMenu = function (it) {
    im0.apply(this, arguments);
    if (!BL.canHang(it)) return;
    const top = UI.top();
    const items = top && top.o && top.o.items;
    if (!Array.isArray(items)) return;
    const add = [];
    const wrap = (t, f) => ({ t, f: () => { UI.pop(); UI.pop(); f(); if (UI.top().name === 'game') UI.inventory(); return 'keep'; } });
    if (it.hang) add.push(wrap(it.hang === 'belt' ? 'Снять с пояса' : 'Снять со спины', () => { BL.unhang(it); it.noHang = 1; Gm.msg('Убрано в сумку: ' + Items.name(it).toLowerCase() + '.', '#a8a090'); }));
    if (it.hang !== 'belt' && !/bow|crossbow/.test(it.b || '')) add.push(wrap('Повесить на пояс', () => { delete it.noHang; BL.hang(it, 'belt'); }));
    if (it.hang !== 'back') add.push(wrap('Закинуть за спину', () => { delete it.noHang; BL.hang(it, 'back'); }));
    items.splice(Math.max(0, items.length - 2), 0, ...add);
  };
  // в списке сумки видно, что где висит
  const inv0 = UI.inventory;
  UI.inventory = function () {
    BL.auto();
    inv0.apply(this, arguments);
    const top = UI.top();
    if (!top || !top.o || typeof top.o.items !== 'function') return;
    const f0 = top.o.items;
    top.o.items = () => f0().map((x) => (x.it && x.it.hang && !/надето/.test(x.t) ? Object.assign(x, { t: x.t + (x.it.hang === 'belt' ? '  (на поясе)' : '  (за спиной)') }) : x));
  };
})(window.EOF);
