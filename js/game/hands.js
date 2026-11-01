'use strict';
// Две руки. Главная рука (у правши — правая, у левши — левая) и вторая.
// В каждую можно взять своё: меч и кинжал, топор и факел, булаву и кирку.
// Лук и арбалет держат двумя руками. Горящий факел занимает вторую руку.
// ЛКМ (или F) бьёт главной рукой, ПКМ — второй: слабее, но без передышки между руками.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, Items = E.Items, U = E.U;

  // место «вторая рука» в одежде
  const i = D.SLOTS.findIndex((s) => s[0] === 'hand');
  D.SLOTS.splice(i, 1, ['hand', 'Главная рука'], ['off', 'Вторая рука']);
  const SIDE = (P, main) => ((P.hand === 'L') === !!main ? 'левая' : 'правая');
  Gm.handName = (P, slot) => U.cap(SIDE(P, slot === 'hand')) + ' рука';
  Gm.slotName = (P, s) => (s === 'hand' || s === 'off' ? Gm.handName(P, s) : (D.SLOTS.find((q) => q[0] === s) || [s, s])[1]);

  const slotOf = (it) => it.s || (D.items[it.b] || {}).s;
  // двуручное: стреляют двумя руками
  Gm.twoHanded = (it) => !!it && /bow|crossbow/.test(it.b || '');
  Gm.holds = (P, it) => P.eq.hand === it || P.eq.off === it;

  // погасить факел, если вторая рука понадобилась
  function dropTorch(P) {
    if (!(P.light > 0)) return;
    if (P.light > 60) { Gm.give('torch', 1, true); Gm.msg('Ты гасишь факел и убираешь его в сумку.', '#c0a080'); }
    else Gm.msg('Ты бросаешь догорающий факел.', '#a08060');
    P.light = 0;
  }

  // взять в руку: slot — 'hand' (главная) или 'off' (вторая); без slot — как раньше: в главную или снять
  const equip0 = Gm.equip;
  Gm.equip = function (it, slot) {
    const P = G.P;
    Gm.ensureSlots(P);
    if (slotOf(it) !== 'hand') return equip0(it);
    if (!slot) slot = Gm.holds(P, it) ? (P.eq.hand === it ? 'hand' : 'off') : 'hand';
    const other = slot === 'hand' ? 'off' : 'hand';
    // уже в этой руке — убрать
    if (P.eq[slot] === it) { P.eq[slot] = null; Gm.msg('Ты убираешь из руки: ' + Items.name(it).toLowerCase() + '.'); Gm.calc(); Gm.endTurn(1); return; }
    if (Gm.twoHanded(it)) {
      if (P.eq[other] && P.eq[other] !== it) { Gm.msg('Это держат двумя руками. Убираешь: ' + Items.name(P.eq[other]).toLowerCase() + '.'); P.eq[other] = null; }
      if (P.eq.off === it) P.eq.off = null;
      dropTorch(P);
      P.eq.hand = it;
      Gm.msg('Ты берёшь в обе руки: ' + Items.name(it).toLowerCase() + '.');
      Gm.calc(); Gm.endTurn(1); return;
    }
    if (slot === 'off') {
      if (Gm.twoHanded(P.eq.hand)) { Gm.msg(U.cap(Items.name(P.eq.hand)) + ' держат двумя руками — вторая рука занята.'); return; }
      dropTorch(P);
    }
    if (P.eq[other] === it) P.eq[other] = null; // перекладывает из руки в руку
    P.eq[slot] = it;
    Gm.msg('Ты берёшь в ' + (SIDE(P, slot === 'hand') === 'левая' ? 'левую' : 'правую') + ' руку: ' + Items.name(it).toLowerCase() + '.');
    if (it.b === 'a_spiteblade') Gm.msg('Рукоять колет ладонь. Меч недоволен.', '#c08080');
    Gm.calc();
    Gm.endTurn(1);
  };

  // факел зажигают во второй руке
  const use0 = Gm.use;
  Gm.use = function (it) {
    const P = G.P;
    if (it && it.b === 'torch' && !(P.light > 0)) {
      Gm.ensureSlots(P);
      if (P.eq.off) { Gm.msg('Вторая рука занята: ' + Items.name(P.eq.off).toLowerCase() + '. Убери, чтобы зажечь факел.'); return; }
      if (Gm.twoHanded(P.eq.hand)) { Gm.msg('Руки заняты: ' + Items.name(P.eq.hand).toLowerCase() + '.'); return; }
    }
    return use0.apply(this, arguments);
  };

  // удар второй рукой: тем, что в ней, — или кулаком, или горящим факелом
  Gm.offStrike = function (e) {
    const P = G.P, main = P.eq.hand, off = P.eq.off;
    const torch = !off && P.light > 0;
    const weapon = off && off.dmg;
    if (Gm.twoHanded(main)) return false;
    P.eq.hand = weapon ? off : null;
    try { E.Combat.playerAttack(e, { force: 1, mult: weapon ? 0.8 : torch ? 0.7 : 0.6, el: torch ? 'fire' : undefined }); }
    finally { P.eq.hand = main; }
    return true;
  };

  // ---------- держать в руке не оружие: зелье, книгу, хлеб, ключ, компас, кружку… ----------
  Gm.holdable = (it) => { const d = D.items[it.b] || {}; return !!it && it.b !== 'gold' && !(it.s || d.s) && ['potion', 'food', 'book', 'misc', 'tool', 'trinket', 'mat'].includes(it.t || d.t); };
  Gm.hold = function (it, slot) {
    const P = G.P;
    Gm.ensureSlots(P);
    slot = slot || 'off';
    const other = slot === 'hand' ? 'off' : 'hand';
    if (P.eq[slot] === it) { P.eq[slot] = null; Gm.msg('Ты убираешь в сумку: ' + Items.name(it).toLowerCase() + '.'); Gm.calc(); return; }
    if (slot === 'off' && Gm.twoHanded(P.eq.hand)) { Gm.msg(U.cap(Items.name(P.eq.hand)) + ' держат двумя руками — вторая рука занята.'); return; }
    if (slot === 'off') dropTorch(P);
    if (P.eq[other] === it) P.eq[other] = null;
    P.eq[slot] = it;
    Gm.msg('Ты берёшь в ' + (SIDE(P, slot === 'hand') === 'левая' ? 'левую' : 'правую') + ' руку: ' + Items.name(it).toLowerCase() + '.');
    Gm.calc();
  };
  // фонарь в руке — свет без огня
  Gm.lanternHeld = () => { const P = G.P; return !!P && ((P.eq.hand && P.eq.hand.b === 'lantern') || (P.eq.off && P.eq.off.b === 'lantern')); };
  // удар рукой, в которой не оружие: применить вещь (выпить, съесть, прочесть); щитом и фонарём — толкнуть
  Gm.handUse = function (hand) {
    const P = G.P, it = P.eq[hand];
    if (!it || it.dmg || it.range) return false;
    if (it.b === 'shield' || it.b === 'lantern' || it.b === 'torch') return false;
    if (!Gm.holdable(it) && !it.cont) return false;
    Gm.use(it);
    // съеденное и выпитое из руки уходит; остаток стопки — остаётся в руке
    if (!P.inv.includes(it)) P.eq[hand] = null;
    return true;
  };

  // в строке «В руке» — обе руки
  Gm.handsLine = function (P) {
    Gm.ensureSlots(P);
    const a = P.eq.hand, b = P.eq.off;
    if (Gm.twoHanded(a)) return 'В руках: ' + Items.name(a);
    const off = b ? Items.name(b) : P.light > 0 ? 'факел' : null;
    if (!a && !off) return 'В руках: ничего';
    return 'В руках: ' + (a ? Items.name(a) : 'пусто') + (off ? ' · ' + off : '');
  };
})(window.EOF);
