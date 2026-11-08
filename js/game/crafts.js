'use strict';
// Ремесло у станций. Подойди и нажми E:
//   наковальня — переплавить руду в крицу, выковать оружие, инструмент, подкову, починить вещь;
//   верстак — луки, арбалеты, посохи, удочки, лютни, факелы, скатки, ловцы снов, лодки;
//   ювелирный стол — кольца, амулеты, подвески и обереги из самородков, жемчуга, кристаллов и костей;
//   ткацкий станок — нить, рубахи, плащи (и редкие — из ледяного шёлка и перьев грифона);
//   коптильня — вяленое мясо и копчёная рыба, что не портятся;
//   рунный камень — зачаровать оружие в руке: огонь, лёд, свет, буря, пустота; и усилить чары.
// Особые вещи (Звёздный Клинок, Венец Лунного Оленя) куются один раз на весь мир.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, UI = E.UI, Items = E.Items;
  const CR = E.Crafts = {};
  const nm = (b) => (D.items[b] ? D.items[b].n : b);
  // [что выходит, сколько, из чего {b: q}, часов, особое]
  const R = CR.recipes = {
    ANVIL: { n: 'Кузня', list: [
      ['iron_ingot', 1, { iron_ore: 2, wood: 1 }, 2], ['knife', 1, { iron_ingot: 1, wood: 1 }, 2], ['dagger', 1, { iron_ingot: 2 }, 3],
      ['sword', 1, { iron_ingot: 3, wood: 1, hide: 1 }, 5], ['axe', 1, { iron_ingot: 2, wood: 2 }, 4], ['mace', 1, { iron_ingot: 3, wood: 1 }, 4],
      ['spear', 1, { iron_ingot: 2, wood: 2 }, 4], ['pickaxe', 1, { iron_ingot: 2, wood: 1 }, 3], ['shovel', 1, { iron_ingot: 1, wood: 2 }, 3],
      ['shield', 1, { iron_ingot: 1, wood: 4 }, 4], ['lantern', 1, { iron_ingot: 1, candle: 1 }, 2], ['horseshoe', 1, { iron_ingot: 1 }, 2],
      ['basilisk_shield', 1, { basilisk_scale: 3, iron_ingot: 2, wood: 2 }, 8],
      ['a_starblade', 1, { star_metal: 2, iron_ingot: 2, crystal: 1 }, 12, { once: 1 }],
    ] },
    WORKBENCH: { n: 'Верстак', list: [
      ['bow', 1, { wood: 3, silk: 1 }, 4], ['crossbow', 1, { wood: 3, iron_ingot: 2, silk: 1 }, 6], ['staff', 1, { wood: 2 }, 2],
      ['staff_crystal', 1, { wood: 2, crystal: 2, mana_shard: 1 }, 6], ['wand', 1, { wood: 1, mana_shard: 1 }, 3], ['rod', 1, { wood: 1, silk: 1 }, 2],
      ['flute', 1, { wood: 1 }, 1], ['lute', 1, { wood: 4, silk: 2 }, 6], ['torch', 3, { wood: 1 }, 1], ['bedroll', 1, { hide: 2, linen_thread: 1 }, 2],
      ['dreamcatcher', 1, { wood: 1, feather: 3, linen_thread: 1 }, 2], ['boat', 1, { wood: 10, linen_thread: 2 }, 12],
    ] },
    JEWELER: { n: 'Ювелирный стол', list: [
      ['silver_ring', 1, { silver_nugget: 2 }, 3], ['gold_ring', 1, { gold_nugget: 2 }, 3], ['pearl_amulet', 1, { pearl: 1, silver_nugget: 1 }, 3],
      ['crystal_pendant', 1, { crystal: 2, silver_nugget: 1 }, 3], ['bone_talisman', 1, { bone: 3, linen_thread: 1 }, 2],
      ['a_moonantler', 1, { moon_antler: 2, silver_nugget: 2 }, 8, { once: 1 }],
    ] },
    LOOM: { n: 'Ткацкий станок', list: [
      ['linen_thread', 3, { tunic: 1 }, 1], ['linen_shirt', 1, { linen_thread: 3 }, 3], ['wool_cloak', 1, { hide: 2, linen_thread: 2 }, 4],
      ['frost_cloak', 1, { frost_silk: 4, linen_thread: 2 }, 8], ['griffin_cloak', 1, { griffin_feather: 4, linen_thread: 3 }, 8],
    ] },
    SMOKER: { n: 'Коптильня', list: [
      ['jerky', 2, { meat_raw: 2, salt: 1 }, 4], ['smoked_fish', 2, { fish_raw: 2, salt: 1 }, 4], ['jerky', 1, { meat_raw: 2 }, 6],
    ] },
  };
  const have = (need) => Object.keys(need).every((b) => Gm.count(b) >= need[b]);
  const needStr = (need) => Object.keys(need).map((b) => nm(b).toLowerCase() + ' ×' + need[b] + ' (' + Gm.count(b) + ')').join(', ');
  // мини-игра станции (её задаёт trades.js); без неё — средний результат
  const play = (st, r, go) => (CR.mg ? CR.mg(st, r, go) : go({ ok: true, q: 0.6 }));
  function craft(st, r) {
    const [out, q, need, hrs, o] = r;
    if (o && o.once && G.S.taken[out]) { Gm.msg('Такую вещь в мире уже сделали. Второй не будет.'); return; }
    if (!have(need)) { Gm.msg('Не хватает: ' + needStr(need) + '.', '#c0a080'); return; }
    play(st, r, (res) => {
      if (!have(need)) return;
      if (!res || !res.ok) {
        // не вышло: пропадает часть первого материала, полдела времени
        const b0 = Object.keys(need)[0], lost = Math.max(1, Math.floor(need[b0] / 2));
        Gm.take(b0, lost);
        Gm.msg('Испорчено. Пропало: ' + nm(b0).toLowerCase() + ' ×' + lost + '. Остальное цело — попробуй снова.', '#e09070');
        Gm.endTurn(Math.max(1, hrs) * 3);
        return;
      }
      for (const b in need) Gm.take(b, need[b]);
      if (o && o.once) G.S.taken[out] = 1;
      let n = q;
      const D0 = D.items[out] || {}, fine = res.q >= 0.85;
      if (fine && D0.st) n += Math.max(1, Math.round(q / 2));
      if (fine && !D0.st) {
        // мастерская работа: крепче и дороже
        const it = Items.make ? Items.make(out) : Gm.mkItem(out);
        if (it.dmg) it.dmg = [it.dmg[0] + 1, it.dmg[1] + 2];
        if (it.def != null) it.def += 1;
        if (it.mw) it.mw = it.wr = Math.round(it.mw * 1.3);
        it.v = Math.round((it.v || D0.v || 1) * 1.4);
        it.fine = 1;
        it.n = (it.n || D0.n) + ' (мастерская работа)';
        Gm.give(it);
        Gm.msg('Мастерская работа: ' + it.n + '!', '#ffe08a');
      } else {
        Gm.give(out, n, true);
        Gm.msg('Готово: ' + nm(out) + (n > 1 ? ' ×' + n : '') + (fine ? ' — с запасом.' : '.'), '#e0d090');
      }
      Gm.cnt('crafts'); Gm.gain('craft');
      if (st === 'ANVIL') Gm.cnt('forged');
      Gm.xp(3 + hrs * 2 + (fine ? 5 : 0));
      Gm.endTurn(Math.max(1, hrs) * 6);
    });
  }
  // починка у наковальни
  function repairList() {
    const P = G.P;
    return P.inv.filter((it) => it.mw && it.wr < it.mw && !(D.items[it.b] && D.items[it.b].art));
  }
  function repair(it) {
    if (Gm.count('iron_ingot') < 1 && Gm.count('iron_ore') < 2) { Gm.msg('Нужна крица или две руды.', '#c0a080'); return; }
    if (Gm.count('iron_ingot') >= 1) Gm.take('iron_ingot', 1); else Gm.take('iron_ore', 2);
    it.wr = it.mw;
    Gm.msg('Починено: ' + Items.name(it) + '.', '#e0d090');
    Gm.cnt('crafts'); Gm.gain('craft'); Gm.endTurn(12);
  }
  // ---------- рунный камень: зачарование ----------
  const ENCH = [
    { el: 'fire', n: 'огня', need: { crystal: 1, h_ashbloom: 2 }, c: '#ff8040' },
    { el: 'ice', n: 'инея', need: { crystal: 1, h_frost: 2 }, c: '#a0e0ff' },
    { el: 'holy', n: 'света', need: { crystal: 1, holy_water: 1 }, c: '#fff0a0' },
    { el: 'storm', n: 'бури', need: { mana_shard: 1, feather: 2 }, c: '#c0c0ff' },
    { el: 'void', n: 'пустоты', need: { mana_shard: 2, ectoplasm: 1 }, c: '#a080e0' },
  ];
  CR.ENCH = ENCH;
  function enchant(x) {
    const P = G.P, w = P.eq.hand;
    if (!w || !(D.items[w.b] && D.items[w.b].t === 'weapon')) { Gm.msg('Возьми оружие в руку — камень зачаровывает то, что держишь.'); return; }
    if (!have(x.need)) { Gm.msg('Не хватает: ' + needStr(x.need) + '.', '#c0a080'); return; }
    play('RUNESTONE', null, (res) => {
      if (!have(x.need) || P.eq.hand !== w) return;
      if (!res || !res.ok) { Gm.take(Object.keys(x.need)[0], 1); Gm.msg('Руны гаснут, не сложившись. Камень съел часть силы.', '#e09070'); Gm.endTurn(9); return; }
      enchant1(x, w);
    });
  }
  function enchant1(x, w) {
    for (const b in x.need) Gm.take(b, x.need[b]);
    const base = w.n0 || w.n || nm(w.b);
    w.n0 = base;
    w.ench = { el: x.el, lvl: 1, n: x.n };
    w.n = base + ' ' + x.n;
    Gm.msg('Руны вспыхивают. Клинок помнит теперь ' + x.n + '.', x.c);
    Gm.cnt('enchants'); Gm.gain('craft'); Gm.xp(15); Gm.endTurn(18);
  }
  function empower() {
    const P = G.P, w = P.eq.hand;
    if (!w || !w.ench) { Gm.msg('Сначала оружие нужно зачаровать.'); return; }
    if (w.ench.lvl >= 3) { Gm.msg('Сильнее чары не лягут: металл не выдержит.'); return; }
    const need = { mana_shard: w.ench.lvl + 1 };
    if (!have(need)) { Gm.msg('Не хватает: ' + needStr(need) + '.', '#c0a080'); return; }
    play('RUNESTONE', null, (res) => {
      if (!have(need) || P.eq.hand !== w) return;
      if (!res || !res.ok) { Gm.take('mana_shard', 1); Gm.msg('Руна срывается — осколок рассыпался в пыль.', '#e09070'); Gm.endTurn(9); return; }
      empower1(w, need);
    });
  }
  function empower1(w, need) {
    Gm.take('mana_shard', need.mana_shard);
    w.ench.lvl++;
    w.n = (w.n0 || nm(w.b)) + ' ' + w.ench.n + ' ' + U.roman(w.ench.lvl);
    Gm.msg('Руны глубже врезаются в металл. Чары — ступень ' + w.ench.lvl + '.', '#c0d0ff');
    Gm.xp(20); Gm.endTurn(18);
  }
  // зачарованное оружие: стихия в ударе и прибавка к урону
  const Cb = E.Combat;
  const pd0 = Cb.playerDmg;
  Cb.playerDmg = function (target, mult, opt) {
    const r = pd0.apply(this, arguments);
    const w = G.P && G.P.eq.hand;
    if (w && w.ench && r && r.dmg != null) r.dmg += 2 * w.ench.lvl;
    return r;
  };
  const pa0 = Cb.playerAttack;
  Cb.playerAttack = function (e, opts) {
    const w = G.P && G.P.eq.hand;
    if (w && w.ench && (!opts || !opts.el)) opts = Object.assign({}, opts || {}, { el: w.ench.el });
    return pa0.call(this, e, opts);
  };

  // ---------- окно станции ----------
  UI.craftAt = function (st) {
    const P = G.P;
    if (st === 'RUNESTONE') {
      const items = () => {
        const w = P.eq.hand;
        const out = [];
        out.push({ t: 'В руке: ' + (w ? Items.name(w) : 'ничего') + (w && w.ench ? ' — чары ' + w.ench.n + ', ступень ' + w.ench.lvl : ''), f: () => 'keep', dim: 1 });
        for (const x of ENCH) out.push({ t: 'Зачаровать: ' + x.n + ' — ' + needStr(x.need) + (have(x.need) ? '' : '  ✗'), f: () => { enchant(x); return 'keep'; } });
        out.push({ t: 'Усилить чары' + (w && w.ench ? ' — осколок маны ×' + (w.ench.lvl + 1) + ' (' + Gm.count('mana_shard') + ')' : ''), f: () => { empower(); return 'keep'; } });
        return out;
      };
      UI.list({ title: 'Рунный камень', items });
      return;
    }
    const def = R[st];
    if (!def) return;
    const items = () => {
      const out = def.list.map((r) => {
        const [o, q, need, hrs, op] = r;
        const done = op && op.once && G.S.taken[o];
        return { t: (done ? '· ' : have(need) ? '✓ ' : '  ') + nm(o) + (q > 1 ? ' ×' + q : '') + ' — ' + (done ? 'уже сделано в этом мире' : needStr(need)) + ' · ' + hrs + ' ч', f: () => { craft(st, r); return 'keep'; } };
      });
      if (st === 'ANVIL') {
        const rl = repairList();
        for (const it of rl) out.push({ t: '⚒ Починить: ' + Items.name(it) + ' (' + Math.round(100 * it.wr / it.mw) + '%) — крица или 2 руды', f: () => { repair(it); return 'keep'; } });
      }
      return out;
    };
    UI.list({ title: def.n + ' — что сделать', items });
  };
  const STN = { ANVIL: 1, WORKBENCH: 1, JEWELER: 1, LOOM: 1, SMOKER: 1, RUNESTONE: 1 };
  const keyOf = (t) => { const k = TL[t] && TL[t].key; return k && STN[k] ? k : null; };
  const ia0 = Gm.interactAt;
  Gm.interactAt = function (x, y) {
    const m = G.map, t = m.tiles[y * m.w + x], k = keyOf(t);
    if (k) {
      if (k === 'SMOKER' && !Gm.has('meat_raw') && !Gm.has('fish_raw')) { Gm.msg('Коптильня дымит. Принеси сырое мясо или рыбу — и соль.'); return true; }
      UI.craftAt(k); return true;
    }
    return ia0.apply(this, arguments);
  };
  const pu0 = Gm.plainUse;
  if (pu0) Gm.plainUse = function (x, y) { const m = G.map; if (keyOf(m.tiles[y * m.w + x])) return true; return pu0.apply(this, arguments); };
  // нить продают в лавках, самородки и шёлк — скупщики и караваны
  const SH = E.Dlg && E.Dlg.SHOP;
  if (SH) {
    if (SH.general) SH.general.push('linen_thread', 'linen_thread', 'salt');
    if (SH.smith) SH.smith.push('iron_ingot', 'iron_ingot', 'horseshoe');
    if (SH.tools) SH.tools.push('linen_thread', 'iron_ingot');
  }
})(window.EOF);
