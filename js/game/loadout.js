'use strict';
// Обойма: у посоха — набор заклинаний, у лука, арбалета и пращи — разные снаряды.
// Цифры 1–9 выбирают, что сейчас «заряжено» (если в руке посох или стрелковое оружие),
// а удар этой рукой (ЛКМ / F, ПКМ — вторая рука) выпускает выбранное.
// Обычные стрелы, болты и камни не кончаются (их мастеришь сам), особые — покупаются и тратятся.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, Items = E.Items;
  const LO = E.Loadout = {};

  // особые снаряды описаны в data/items.js (t: 'ammo', for: оружие, fx: свойства)
  const BASIC = { bow: 'Стрелы', crossbow: 'Болты', sling: 'Камни' };

  // ---------- заклинания посоха: свои у любого посоха, плюс выученные чары ----------
  const mk = D.mkAb;
  mk('sv_missile', 'Чародейская стрела', 'bolt', { p: 1.0, r: 10, stat: 'int', el: 'arcane', cost: 1, cd: 0, staff: 1, d: 'Сгусток силы из навершия посоха.' });
  mk('sv_ember', 'Огонёк', 'bolt', { p: 1.3, r: 9, stat: 'int', el: 'fire', cost: 3, cd: 1, staff: 1, d: 'Пламя срывается с посоха.' });
  mk('sv_rime', 'Иней', 'bolt', { p: 1.1, r: 9, stat: 'int', el: 'ice', x: { slow: 3 }, cost: 3, cd: 1, staff: 1, d: 'Холод сковывает того, в кого попал.' });
  mk('sv_spark', 'Разряд', 'chain', { p: 0.9, r: 7, cnt: 2, stat: 'int', el: 'storm', cost: 5, cd: 3, staff: 1, d: 'Молния перескакивает на соседа.' });
  const STAFF_OWN = ['sv_missile', 'sv_ember', 'sv_rime', 'sv_spark'];
  const NOT_SPELL = new Set(['travel', 'transmute']);

  // что за оружие для обоймы
  LO.kind = (w) => { if (!w) return null; const b = w.b || ''; if (/staff/.test(b)) return 'staff'; if (/crossbow/.test(b)) return 'crossbow'; if (/sling/.test(b)) return 'sling'; if (/bow/.test(b)) return 'bow'; return null; };
  const load = () => (G.P.load = G.P.load || {});
  // список того, что можно зарядить
  LO.list = function (w) {
    const P = G.P, k = LO.kind(w);
    if (!k) return [];
    if (k === 'staff') {
      const out = STAFF_OWN.map((id) => ({ id, n: D.ab[id].n, spell: 1, a: D.ab[id] }));
      for (const id of P.abil || []) { const a = D.ab[id]; if (a && (a.stat === 'int' || a.stat === 'fai') && !NOT_SPELL.has(a.k) && !a.staff) out.push({ id, n: a.n, spell: 1, a }); }
      return out.slice(0, 9);
    }
    const out = [{ id: '*', n: BASIC[k], inf: 1 }];
    for (const id in D.items) { const d = D.items[id]; if (d.t !== 'ammo' || d.for !== k) continue; const c = Gm.count(id); if (c > 0) out.push({ id, n: d.n, cnt: c, d }); }
    return out.slice(0, 9);
  };
  // что выбрано сейчас (если выбранное кончилось — обычное)
  LO.cur = function (w) {
    const k = LO.kind(w);
    if (!k) return null;
    const list = LO.list(w), sel = load()[k];
    return list.find((x) => x.id === sel) || list[0];
  };
  // рука, для которой цифры выбирают заряд: главная, если в ней посох или лук, иначе вторая
  LO.hand = function () {
    const P = G.P;
    if (!P) return null;
    if (LO.kind(P.eq.hand)) return 'hand';
    if (LO.kind(P.eq.off)) return 'off';
    return null;
  };
  LO.active = () => !!LO.hand();
  LO.select = function (n) {
    const P = G.P, h = LO.hand();
    if (!h) return false;
    const w = P.eq[h], list = LO.list(w), x = list[n - 1];
    if (!x) return true;
    load()[LO.kind(w)] = x.id;
    // выбранное видно в списке слева вверху; в ASCII-видах — коротко в журнале
    if (!(E.UI.is3D && E.UI.is3D())) Gm.msg((x.spell ? 'Заклинание: ' : 'Заряжено: ') + x.n + (x.cnt ? ' ×' + x.cnt : '') + '.', '#c8d8f0');
    return true;
  };
  // строка для панели
  LO.label = function (w) { const x = LO.cur(w); if (!x) return ''; return x.n + (x.cnt ? ' ×' + x.cnt : x.inf ? '' : ''); };

  // ---------- выстрел: свойства снаряда ----------
  // взять один заряд; вернуть его свойства (fx) или null для обычного
  LO.take = function (w) {
    const x = LO.cur(w);
    if (!x || x.inf || x.spell) return null;
    if (!Gm.take(x.id, 1)) return null;
    const left = Gm.count(x.id);
    if (!left) Gm.msg('Кончились: ' + x.n.toLowerCase() + '. Дальше — обычными.', '#c0a080');
    return Object.assign({ id: x.id, c: x.d.c, glow: x.d.glow }, x.d.fx);
  };
  // удар снарядом: огонь, яд, кровь, оглушение
  LO.hitOpts = function (fx, base) {
    const o = Object.assign({}, base || {});
    if (!fx) return o;
    if (fx.mult) o.mult = (o.mult || 1) * fx.mult;
    if (fx.el) o.el = fx.el;
    if (fx.pierce) o.pierce = 1;
    if (fx.bleed) o.bleed = fx.bleed;
    if (fx.poison) o.poison = fx.poison;
    if (fx.slow) o.slow = fx.slow;
    if (fx.stun) o.stun = fx.stun;
    return o;
  };
  // глиняная граната: вспышка огня вокруг места удара
  LO.blast = function (fx, tx, ty) {
    if (!fx || !fx.blast) return;
    const m = G.map, r = fx.blast;
    Gm.flash && Gm.flash(tx, ty, Math.ceil(r), 'fire');
    for (const e of m.ents.slice()) {
      if (e.dead || e.kind === 'ally' || Math.hypot(e.x - tx, e.y - ty) > r) continue;
      if (e.kind === 'npc' && !e.hostile) continue;
      const dmg = Math.max(1, Math.round(3 + G.P.st.dex * 0.4 + G.P.level * 0.6));
      Gm.msg('Пламя охватывает ' + E.Combat.accOf(e) + ' (' + dmg + ').', '#ffb070');
      E.Combat.hurtEnt(e, dmg, 'player', 'fire');
    }
  };

  // ---------- чары посоха ----------
  // hand — какой рукой (посох может быть и во второй)
  LO.cast = function (hand) {
    const P = G.P, w = P.eq[hand], x = LO.cur(w);
    if (!x) return false;
    const a = D.ab[x.id];
    // без лишних строк в журнале: готовность и дух видны в списке слева вверху
    const once = (k, t) => { const now = performance.now(); LO.said = LO.said || {}; if (now - (LO.said[k] || 0) > 4000) { LO.said[k] = now; Gm.msg(t, '#9090a8'); } };
    if ((P.cd[x.id] || 0) > 0) return false;
    if (P.mp < a.cost) { once('mp', 'Не хватает духа на «' + a.n + '».'); return false; }
    // посох во второй руке: на миг он «главный», чтобы его сила усилила чары
    const main = P.eq.hand;
    if (hand === 'off') P.eq.hand = w;
    let ok = false;
    try { ok = E.Combat.useAbility(x.id, null); } finally { P.eq.hand = main; }
    if (ok) { P.mp -= a.cost; P.cd[x.id] = a.cd; Gm.cnt('cast'); }
    return ok;
  };

  // ---------- в строке «В руках» — и что заряжено ----------
  const hl0 = Gm.handsLine;
  Gm.handsLine = function (P) {
    let s = hl0.apply(this, arguments);
    const h = LO.hand();
    if (h && !(E.UI.is3D && E.UI.is3D())) s += ' [' + LO.label(P.eq[h]) + ']';
    return s;
  };
  // «Использовать» снаряд — зарядить его
  const use0 = Gm.use;
  Gm.use = function (it) {
    const d = it && D.items[it.b];
    if (d && d.t === 'ammo') {
      const P = G.P, h = ['hand', 'off'].find((s) => LO.kind(P.eq[s]) === d.for);
      if (!h) { Gm.msg('Это — для ' + ({ bow: 'лука', crossbow: 'арбалета', sling: 'пращи' })[d.for] + '. Сначала возьми его в руку.'); return; }
      load()[d.for] = it.b;
      Gm.msg('Заряжено: ' + d.n + ' ×' + Gm.count(it.b) + '.', '#c8d8f0');
      return;
    }
    return use0.apply(this, arguments);
  };
})(window.EOF);
