'use strict';
// Сумка — не список строк, а то, что видно, когда заглядываешь внутрь:
//  • слева — во что сложено: карманы, кошель на поясе, сума через плечо, рюкзак или короб за спиной;
//  • посередине — ячейки этой сумки на её собственном фоне: кожа рюкзака, холст мешка, плетёнка корзины,
//    береста короба, бархат кошеля, звёздный шёлк сумки чародея;
//  • вещи нарисованы; под наведённой — она чуть выдвигается из ячейки;
//  • справа — большая картинка и описание выбранной вещи;
//  • щелчок или Enter — колесо действий вокруг вещи (съесть, надеть, взять в руку, переложить, выбросить…).
(function (E) {
  const U = E.U, D = E.D, G = E.G, Gm = E.Gm, UI = E.UI, Items = E.Items, TL = E.TL;
  const COL = UI.COL;
  const BG = () => E.Bags;

  // ============================================================
  // Картинки вещей: 32×32, рисуются по виду вещи и кешируются
  // ============================================================
  const KINDS = [
    [/bottomless|mage_satchel|scholar|satchel|shoulder_bag|hunter_bag/, 'satchel'], [/pouch|purse|belt_bag|bandolier/, 'pouch'], [/basket/, 'basket'], [/sack|bundle/, 'sack'], [/korob|pedlar|chest/, 'box'], [/pack|knapsack/, 'backpack'],
    [/^arrow|^bolt|^shot/, 'arrows'], [/staff|wand/, 'staff'], [/crossbow/, 'crossbow'], [/bow/, 'bow'], [/sling/, 'sling'], [/dagger|knife|whisper|wyrmfang/, 'dagger'], [/axe/, 'axe'],
    [/hammer|mace|club|flail/, 'mace'], [/spear|trident|sunspear/, 'spear'], [/scythe|sickle/, 'sickle'], [/pickaxe/, 'pick'], [/shovel/, 'shovel'], [/sword|blade|heir/, 'sword'],
    [/shield/, 'shield'], [/helm|crown/, 'helm'], [/hood|hat|mask/, 'hood'], [/cloak/, 'cloak'], [/boots|shoes/, 'boots'], [/glove|mitten|gauntlet/, 'gloves'], [/trousers|pants|skirt/, 'pants'],
    [/^p_|potion|holy_water|cure|venom|soul_bottle/, 'bottle'], [/ale|kvass|milk|tea|sbiten|wine|cup|mug/, 'mug'], [/honey/, 'jar'], [/bread|rusk|pretzel|bun|bliny|rice_cake/, 'bread'], [/pie|cake|mooncake|sweets|dumpl/, 'pie'],
    [/meat|jerky|stew|dish/, 'meat'], [/fish|eel|crayfish|seaweed/, 'fish'], [/apple|cactus_fruit|dates|candied/, 'apple'], [/berr|lingon|cloud|blue|hazelnut|nuts/, 'berries'], [/mushroom|spores/, 'mushroom'], [/cheese/, 'cheese'],
    [/turnip|cabbage|onion|cattail|sweet_rice/, 'veg'], [/book|tome/, 'book'], [/letter|scrap|page|ledger/, 'scroll'], [/ring|signet/, 'ring'], [/amulet|pendant|medallion|talisman|charm|brooch/, 'amulet'], [/beads|bracelet|dreamcatcher/, 'beads'],
    [/coin/, 'coin'], [/dice/, 'dice'], [/ore|nugget|star_metal/, 'ore'], [/ingot/, 'ingot'], [/crystal|shard|gem|pearl|jelly/, 'gem'], [/feather|plume/, 'feather'], [/hide|scale_mat|silk|thread|flax/, 'cloth'],
    [/bone|skull|antler/, 'bone'], [/^h_|herb|wreath|bouquet|fern/, 'herb'], [/seed|rye/, 'seed'], [/torch/, 'torch'], [/lantern|lamp/, 'lantern'], [/rope/, 'rope'], [/rod/, 'rod'], [/mortar/, 'mortar'],
    [/lute|flute|horn|bell|whistle/, 'lute'], [/lockpick|key/, 'key'], [/bedroll/, 'bedroll'], [/waterskin|bottle/, 'skin'], [/candle/, 'candle'], [/egg/, 'egg'],
  ];
  const BYT = { weapon: 'sword', armor: 'shirt', food: 'bread', potion: 'bottle', book: 'book', trinket: 'amulet', tool: 'box', mat: 'ore', misc: 'box', bag: 'pouch', ammo: 'arrows', art: 'gem' };
  function kindOf(it) {
    const b = it.b || '';
    for (const [re, k] of KINDS) if (re.test(b)) return k;
    const base = D.items[b] || {};
    if (base.s === 'body' || base.s === 'shirt' || base.s === 'under') return 'shirt';
    if (base.s === 'feet') return 'boots';
    if (base.s === 'legs') return 'pants';
    if (base.s === 'head') return 'helm';
    if (base.s === 'hands') return 'gloves';
    if (base.s === 'cloak') return 'cloak';
    return BYT[it.t || base.t] || 'box';
  }
  // оттенок вещи: зелье — по названию, металл — по материалу
  function tintOf(it) {
    const b = it.b || '';
    if (/heal|blood|fire|^p_str/.test(b)) return '#d83a3a';
    if (/spirit|breath|frost|ice|moon/.test(b)) return '#4a8ae0';
    if (/antidote|venom|acid|wild|forest/.test(b)) return '#4ab84a';
    if (/night|sleep|shadow|void|dream|arcane/.test(b)) return '#9a5ad8';
    if (/holy|light|sun|gold|warm/.test(b)) return '#e8c040';
    if (/storm|wind/.test(b)) return '#9ad0f0';
    if (/stone|grave|bone/.test(b)) return '#b0a890';
    if (it.art) return '#e0b0ff';
    const g = UI.itemGlyph(it);
    return g ? g[1] : '#b0b0c0';
  }
  const icache = new Map();
  UI.itemIcon = function (it) {
    const k = kindOf(it), tint = tintOf(it), key = k + '|' + tint + '|' + (it.art ? 1 : 0);
    let c = icache.get(key);
    if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d');
    drawIcon(x, k, tint, it);
    if (it.art) { x.globalCompositeOperation = 'source-atop'; const g = x.createLinearGradient(0, 0, 32, 32); g.addColorStop(0, 'rgba(255,220,255,0.0)'); g.addColorStop(0.5, 'rgba(255,220,255,0.35)'); g.addColorStop(1, 'rgba(255,220,255,0.0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); x.globalCompositeOperation = 'source-over'; }
    icache.set(key, c);
    return c;
  };
  const shade = (hex, k) => U.shade ? U.shade(hex, k) : hex;
  function drawIcon(x, k, tint, it) {
    const O = '#1a120c';
    x.lineJoin = 'round'; x.lineCap = 'round';
    const poly = (pts, fill, stroke, lw) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } x.lineWidth = lw || 1.6; x.strokeStyle = stroke || O; x.stroke(); };
    const line = (a, b, c2, d, col, w) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.lineWidth = (w || 2) + 1.6; x.strokeStyle = O; x.stroke(); x.lineWidth = w || 2; x.strokeStyle = col; x.stroke(); };
    const circ = (a, b, r, fill) => { x.beginPath(); x.arc(a, b, r, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); x.lineWidth = 1.6; x.strokeStyle = O; x.stroke(); };
    const ell = (a, b, rx, ry, fill, rot) => { x.beginPath(); x.ellipse(a, b, rx, ry, rot || 0, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); x.lineWidth = 1.6; x.strokeStyle = O; x.stroke(); };
    const hl = (a, b, w, h) => { x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(a, b, w, h); };
    const STEEL = '#c8ccd4', WOOD = '#8a5a30', LEATH = '#7a4a26', GOLD = '#e0b840';
    switch (k) {
      case 'sword': line(7, 25, 24, 8, STEEL, 3.4); line(22, 6, 26, 10, STEEL, 2); hl(14, 15, 5, 1); line(5, 20, 12, 27, GOLD, 2.4); line(4, 28, 8, 24, LEATH, 3); circ(3.5, 28.5, 2, GOLD); break;
      case 'dagger': line(10, 22, 23, 9, STEEL, 3); line(8, 18, 14, 24, GOLD, 2.2); line(5, 27, 9, 23, LEATH, 3); break;
      case 'axe': line(7, 28, 22, 6, WOOD, 3); poly([[17, 4], [27, 6], [28, 14], [21, 13]], STEEL); hl(19, 6, 6, 1.5); break;
      case 'mace': line(8, 28, 20, 10, WOOD, 3); circ(22, 8, 6, '#9aa0a8'); for (const [a, b] of [[22, 1.5], [28.5, 8], [22, 14.5], [15.5, 8]]) circ(a, b, 1.6, '#c8ccd4'); break;
      case 'spear': line(4, 29, 24, 9, WOOD, 2.6); poly([[22, 11], [29, 3], [25, 12]], STEEL); poly([[24, 7], [29, 3], [21, 10]], STEEL); break;
      case 'sickle': line(6, 28, 13, 20, WOOD, 3); x.beginPath(); x.arc(18, 13, 9, Math.PI * 0.9, Math.PI * 2.1); x.lineWidth = 5; x.strokeStyle = O; x.stroke(); x.lineWidth = 3; x.strokeStyle = STEEL; x.stroke(); break;
      case 'pick': line(9, 29, 18, 8, WOOD, 3); x.beginPath(); x.arc(18, 14, 11, Math.PI * 1.15, Math.PI * 1.85); x.lineWidth = 5; x.strokeStyle = O; x.stroke(); x.lineWidth = 3; x.strokeStyle = '#9aa0a8'; x.stroke(); break;
      case 'shovel': line(8, 28, 20, 10, WOOD, 3); poly([[17, 4], [27, 8], [24, 15], [16, 12]], '#9aa0a8'); break;
      case 'bow': x.beginPath(); x.arc(6, 16, 15, -Math.PI * 0.42, Math.PI * 0.42); x.lineWidth = 5; x.strokeStyle = O; x.stroke(); x.lineWidth = 3; x.strokeStyle = WOOD; x.stroke(); line(10, 2.5, 10, 29.5, '#e8e0c8', 0.8); break;
      case 'crossbow': line(6, 26, 24, 8, WOOD, 4); x.beginPath(); x.arc(20, 12, 10, Math.PI * 0.75, Math.PI * 1.75); x.lineWidth = 4.5; x.strokeStyle = O; x.stroke(); x.lineWidth = 2.6; x.strokeStyle = '#9aa0a8'; x.stroke(); break;
      case 'sling': line(6, 6, 16, 22, LEATH, 1.6); line(26, 6, 16, 22, LEATH, 1.6); ell(16, 23, 4, 3, LEATH); circ(16, 22, 2, '#9a9080'); break;
      case 'staff': line(9, 30, 21, 8, WOOD, 3); x.save(); x.shadowColor = tint; x.shadowBlur = 8; circ(23, 6, 5, tint); x.restore(); hl(21, 3.5, 2, 2); break;
      case 'arrows': for (const d of [-4, 0, 4]) { line(6 + d, 28, 24 + d, 6, '#c0a070', 1.6); poly([[24 + d, 6], [27 + d, 2], [26 + d, 7]], STEEL); line(5 + d, 29, 8 + d, 24, '#e8e0d0', 2.2); } break;
      case 'shield': poly([[6, 5], [26, 5], [26, 16], [16, 29], [6, 16]], '#7a4a2a'); poly([[9, 8], [23, 8], [23, 16], [16, 25], [9, 16]], tint === '#b0b0c0' ? '#a03030' : tint); line(16, 6, 16, 27, GOLD, 1.4); break;
      case 'helm': x.beginPath(); x.arc(16, 18, 11, Math.PI, 0); x.lineTo(27, 26); x.lineTo(5, 26); x.closePath(); x.fillStyle = '#9aa0a8'; x.fill(); x.lineWidth = 1.6; x.strokeStyle = O; x.stroke(); line(16, 7, 16, 25, '#c8ccd4', 2); x.fillStyle = O; x.fillRect(8, 19, 16, 2.5); break;
      case 'hood': poly([[16, 3], [27, 14], [27, 28], [5, 28], [5, 14]], tint); ell(16, 19, 6, 7, '#20160e'); break;
      case 'cloak': poly([[11, 4], [21, 4], [28, 29], [4, 29]], tint); line(11, 5, 21, 5, GOLD, 2); circ(16, 6, 2, GOLD); break;
      case 'boots': poly([[8, 4], [16, 4], [16, 20], [27, 22], [27, 28], [8, 28]], LEATH); line(8, 8, 16, 8, '#5a3216', 1.4); hl(10, 6, 2, 12); break;
      case 'gloves': poly([[9, 30], [9, 14], [7, 9], [10, 8], [12, 13], [12, 5], [15, 5], [15, 12], [16, 4], [19, 4], [19, 12], [21, 6], [24, 7], [22, 16], [23, 30]], tint === '#b0a090' ? LEATH : tint); break;
      case 'pants': poly([[8, 4], [24, 4], [26, 29], [18, 29], [16, 13], [14, 29], [6, 29]], tint); line(8, 6, 24, 6, LEATH, 2); break;
      case 'shirt': poly([[10, 4], [22, 4], [29, 10], [25, 15], [23, 12], [23, 28], [9, 28], [9, 12], [7, 15], [3, 10]], tint); line(13, 4, 16, 9, O, 1); line(19, 4, 16, 9, O, 1); break;
      case 'bottle': poly([[13, 3], [19, 3], [19, 10], [25, 17], [25, 27], [7, 27], [7, 17], [13, 10]], 'rgba(220,235,255,0.35)'); x.save(); x.beginPath(); x.moveTo(8, 18); x.lineTo(24, 18); x.lineTo(24, 26); x.lineTo(8, 26); x.closePath(); x.fillStyle = tint; x.fill(); x.restore(); poly([[12, 1], [20, 1], [20, 4], [12, 4]], WOOD); hl(10, 19, 2, 5); break;
      case 'mug': poly([[7, 8], [21, 8], [21, 28], [7, 28]], WOOD); x.beginPath(); x.arc(22, 17, 5, -Math.PI / 2, Math.PI / 2); x.lineWidth = 4; x.strokeStyle = O; x.stroke(); x.lineWidth = 2.4; x.strokeStyle = WOOD; x.stroke(); ell(14, 8, 7, 2.5, '#f0e8d0'); line(7, 14, 21, 14, '#5a3a1a', 1); line(7, 22, 21, 22, '#5a3a1a', 1); break;
      case 'jar': poly([[9, 8], [23, 8], [25, 27], [7, 27]], '#e0a030'); poly([[8, 5], [24, 5], [24, 9], [8, 9]], '#c8b090'); hl(10, 12, 2, 10); break;
      case 'bread': ell(16, 18, 13, 8, '#c88a3a'); for (const a of [9, 14, 19, 24]) line(a, 14, a + 2, 20, '#e8b868', 1.2); hl(9, 12, 10, 1.5); break;
      case 'pie': ell(16, 20, 13, 7, '#d8a050'); ell(16, 17, 11, 5, '#e8c070'); for (const a of [10, 16, 22]) circ(a, 17, 1.6, '#a02030'); break;
      case 'meat': ell(14, 17, 10, 8, '#b84838'); ell(14, 17, 6, 4, '#d87868'); line(22, 22, 28, 28, '#f0e8d8', 3); circ(28.5, 28.5, 2, '#f0e8d8'); break;
      case 'fish': ell(14, 16, 11, 6, tint === '#d0a060' ? '#8ab0c8' : '#8ab0c8'); poly([[24, 16], [30, 9], [30, 23]], '#6a90a8'); circ(8, 14, 1.4, O); line(12, 12, 12, 20, '#5a7890', 1); break;
      case 'apple': circ(16, 18, 10, '#c83030'); line(16, 9, 18, 4, WOOD, 1.6); ell(21, 6, 4, 2, '#4a9a3a', -0.5); hl(10, 13, 3, 3); break;
      case 'berries': for (const [a, b] of [[10, 18], [17, 15], [22, 21], [14, 24], [20, 10]]) circ(a, b, 4.2, tint === '#d0a060' ? '#5a3a9a' : '#a02a4a'); ell(10, 8, 5, 2, '#4a9a3a', 0.4); break;
      case 'mushroom': poly([[12, 18], [20, 18], [21, 29], [11, 29]], '#e8dcc0'); x.beginPath(); x.arc(16, 18, 12, Math.PI, 0); x.closePath(); x.fillStyle = '#b83a2a'; x.fill(); x.lineWidth = 1.6; x.strokeStyle = O; x.stroke(); for (const [a, b] of [[10, 13], [17, 10], [22, 14]]) circ(a, b, 1.8, '#f0f0e8'); break;
      case 'cheese': poly([[4, 22], [26, 10], [28, 24], [6, 28]], '#e8c040'); circ(14, 22, 2, '#c8a020'); circ(21, 19, 1.5, '#c8a020'); break;
      case 'veg': ell(16, 18, 9, 10, '#d8c8a0'); for (const a of [-4, 0, 4]) line(16, 9, 16 + a, 2, '#4a9a3a', 2); break;
      case 'book': poly([[6, 5], [25, 5], [25, 28], [6, 28]], tint === '#d0c090' ? '#7a2a2a' : tint); line(9, 6, 9, 27, O, 1); poly([[25, 7], [27, 7], [27, 28], [25, 28]], '#e8e0c8'); line(13, 12, 22, 12, GOLD, 1.4); line(13, 16, 22, 16, GOLD, 1); break;
      case 'scroll': poly([[7, 7], [25, 7], [25, 25], [7, 25]], '#e8dcb8'); ell(7, 16, 2.5, 9, '#c8b890'); ell(25, 16, 2.5, 9, '#c8b890'); for (const b of [11, 14, 17, 20]) line(10, b, 22, b, '#8a7a5a', 0.8); break;
      case 'ring': x.beginPath(); x.arc(16, 19, 8, 0, Math.PI * 2); x.lineWidth = 6; x.strokeStyle = O; x.stroke(); x.lineWidth = 3.6; x.strokeStyle = /silver/.test(it.b) ? '#d8dce4' : GOLD; x.stroke(); poly([[13, 8], [19, 8], [21, 11], [16, 14], [11, 11]], tint === '#e0c070' ? '#e04a6a' : tint); break;
      case 'amulet': x.beginPath(); x.arc(16, 6, 9, 0, Math.PI); x.lineWidth = 1.4; x.strokeStyle = GOLD; x.stroke(); circ(16, 20, 7, GOLD); circ(16, 20, 4, tint === '#e0c070' ? '#4a8ae0' : tint); break;
      case 'beads': for (let i = 0; i < 9; i++) { const a = Math.PI * 0.15 + i / 8 * Math.PI * 0.7; circ(16 + Math.cos(a) * 11, 8 + Math.sin(a) * 15, 2.6, i % 2 ? '#c84a4a' : '#e8d070'); } break;
      case 'coin': circ(16, 16, 10, GOLD); circ(16, 16, 6.5, '#c89a28'); x.fillStyle = O; x.fillRect(14.5, 11, 3, 10); break;
      case 'dice': poly([[6, 9], [18, 6], [26, 12], [14, 16]], '#f0ece0'); poly([[6, 9], [14, 16], [14, 28], [6, 21]], '#d8d0c0'); poly([[14, 16], [26, 12], [26, 24], [14, 28]], '#e8e0d0'); for (const [a, b] of [[16, 11], [9, 15], [11, 22], [18, 18], [22, 21]]) circ(a, b, 1.2, O); break;
      case 'ore': poly([[5, 20], [10, 9], [21, 6], [28, 15], [24, 27], [10, 28]], '#6a6058'); for (const [a, b] of [[12, 15], [19, 12], [17, 21], [23, 19]]) circ(a, b, 1.8, /gold/.test(it.b) ? GOLD : /silver/.test(it.b) ? '#e0e4ec' : /star/.test(it.b) ? '#a0c0ff' : '#b07850'); break;
      case 'ingot': poly([[4, 20], [10, 12], [28, 12], [24, 20]], '#a0a4ac'); poly([[4, 20], [24, 20], [24, 25], [4, 25]], '#7a7e86'); poly([[24, 20], [28, 12], [28, 17], [24, 25]], '#6a6e76'); break;
      case 'gem': x.save(); x.shadowColor = tint; x.shadowBlur = 6; poly([[16, 3], [27, 12], [16, 29], [5, 12]], tint === '#b0b0c0' ? '#80c0ff' : tint); x.restore(); line(5, 12, 27, 12, 'rgba(255,255,255,0.6)', 1); line(16, 3, 16, 29, 'rgba(255,255,255,0.3)', 1); break;
      case 'feather': ell(16, 15, 5, 13, tint === '#b0b0c0' ? '#e8e0d0' : '#d8a040', 0.5); line(10, 28, 22, 4, '#7a6a50', 1.2); break;
      case 'cloth': poly([[5, 8], [27, 6], [26, 26], [6, 27]], tint); line(5, 8, 26, 26, 'rgba(0,0,0,0.25)', 1); line(27, 6, 6, 27, 'rgba(0,0,0,0.25)', 1); break;
      case 'bone': line(7, 24, 25, 8, '#e8e0c8', 4); for (const [a, b] of [[5, 23], [8, 27], [24, 5], [27, 9]]) circ(a, b, 3, '#e8e0c8'); break;
      case 'herb': line(16, 30, 16, 12, '#4a8a3a', 1.6); for (const [a, b, r] of [[11, 18, -0.6], [21, 15, 0.6], [12, 11, -0.4], [20, 8, 0.5]]) ell(a, b, 5, 2.5, '#5aaa48', r); circ(16, 6, 3, tint === '#b0b0c0' || tint === '#a09080' ? '#e0d060' : tint); break;
      case 'seed': for (const [a, b] of [[10, 12], [17, 10], [22, 16], [13, 19], [19, 22], [11, 25]]) ell(a, b, 2.4, 3.6, '#c8a060', 0.5); break;
      case 'torch': line(9, 29, 18, 12, WOOD, 3.2); ell(20, 9, 4.5, 3.5, '#5a3a1a'); x.save(); x.shadowColor = '#ff9030'; x.shadowBlur = 8; poly([[17, 8], [21, 1], [25, 8], [21, 11]], '#ffb040'); x.restore(); break;
      case 'lantern': poly([[10, 9], [22, 9], [22, 26], [10, 26]], '#3a3530'); x.save(); x.shadowColor = '#ffc060'; x.shadowBlur = 8; poly([[12, 11], [20, 11], [20, 24], [12, 24]], '#ffd080'); x.restore(); x.beginPath(); x.arc(16, 8, 5, Math.PI, 0); x.lineWidth = 1.6; x.strokeStyle = O; x.stroke(); break;
      case 'rope': for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(16, 17, 11 - i * 3, 8 - i * 2, 0, 0, Math.PI * 2); x.lineWidth = 4; x.strokeStyle = O; x.stroke(); x.lineWidth = 2.4; x.strokeStyle = '#c8a870'; x.stroke(); } break;
      case 'rod': line(5, 29, 27, 3, WOOD, 2); line(27, 3, 27, 20, '#e0e0e0', 0.6); circ(27, 21, 1.6, '#c83030'); break;
      case 'mortar': poly([[6, 14], [26, 14], [22, 28], [10, 28]], '#9a9080'); line(18, 16, 26, 4, '#b0a890', 3); break;
      case 'lute': ell(13, 20, 8, 9, WOOD); circ(13, 20, 2.6, O); line(18, 14, 28, 3, '#5a3a1a', 2.4); break;
      case 'key': circ(9, 9, 5, GOLD); circ(9, 9, 2, '#00000000'); line(12, 12, 26, 26, GOLD, 2.4); line(22, 22, 26, 18, GOLD, 2); break;
      case 'bedroll': ell(16, 18, 13, 7, '#7a6a4a'); ell(27, 18, 3, 7, '#6a5a3a'); line(10, 11, 10, 25, LEATH, 1.6); line(20, 11, 20, 25, LEATH, 1.6); break;
      case 'skin': ell(15, 19, 9, 10, LEATH); poly([[13, 4], [18, 4], [18, 10], [13, 10]], '#5a3a1a'); hl(10, 15, 2, 6); break;
      case 'candle': poly([[12, 12], [20, 12], [20, 28], [12, 28]], '#f0e8d0'); x.save(); x.shadowColor = '#ffb040'; x.shadowBlur = 6; ell(16, 8, 2.4, 4, '#ffc040'); x.restore(); break;
      case 'egg': ell(16, 17, 9, 12, '#d8b080'); for (const [a, b] of [[12, 12], [19, 18], [14, 23]]) circ(a, b, 1.6, '#8a5030'); break;
      case 'pouch': ell(16, 20, 10, 9, LEATH); poly([[11, 8], [21, 8], [19, 12], [13, 12]], '#6a3a1a'); line(10, 7, 22, 7, '#c8a870', 1.2); break;
      case 'satchel': poly([[5, 11], [27, 11], [27, 28], [5, 28]], tint === '#b0b0c0' ? LEATH : tint); poly([[5, 11], [27, 11], [27, 19], [5, 19]], shade(tint === '#b0b0c0' ? LEATH : tint, 0.8)); x.beginPath(); x.arc(16, 11, 10, Math.PI, 0); x.lineWidth = 1.8; x.strokeStyle = O; x.stroke(); circ(16, 19, 1.8, GOLD); break;
      case 'backpack': poly([[7, 7], [25, 7], [27, 29], [5, 29]], '#7a5a34'); poly([[7, 7], [25, 7], [25, 15], [7, 15]], '#6a4a26'); poly([[10, 18], [22, 18], [22, 26], [10, 26]], '#8a6a40'); line(12, 3, 12, 7, LEATH, 2); line(20, 3, 20, 7, LEATH, 2); circ(16, 15, 1.6, GOLD); break;
      case 'basket': poly([[5, 13], [27, 13], [24, 28], [8, 28]], '#c8a060'); for (let i = 0; i < 4; i++) line(6 + i * 0.7, 16 + i * 3, 26 - i * 0.7, 16 + i * 3, '#a07a40', 0.8); x.beginPath(); x.arc(16, 13, 9, Math.PI, 0); x.lineWidth = 3.4; x.strokeStyle = O; x.stroke(); x.lineWidth = 2; x.strokeStyle = '#c8a060'; x.stroke(); break;
      case 'sack': poly([[8, 9], [24, 9], [28, 28], [4, 28]], '#b8a070'); poly([[12, 4], [20, 4], [21, 9], [11, 9]], '#a89060'); line(10, 9, 22, 9, '#6a5030', 1.6); break;
      case 'box': poly([[5, 9], [27, 9], [27, 28], [5, 28]], WOOD); line(5, 15, 27, 15, '#5a3a1a', 1.4); line(16, 9, 16, 28, '#5a3a1a', 1); circ(16, 15, 1.8, GOLD); break;
      default: circ(16, 16, 9, tint);
    }
  }

  // ============================================================
  // Фон сумки: заглядываешь внутрь
  // ============================================================
  const bcache = new Map();
  function noise(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function bgArt(look, w, h) {
    w = Math.max(32, Math.round(w)); h = Math.max(32, Math.round(h));
    const key = look + ':' + w + 'x' + h;
    let c = bcache.get(key); if (c) return c;
    if (bcache.size > 24) bcache.clear();
    c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), r = noise(w * 31 + h * 7 + look.length * 997);
    const grad = (a, b) => { const g = x.createRadialGradient(w / 2, h * 0.58, Math.min(w, h) * 0.1, w / 2, h * 0.55, Math.max(w, h) * 0.75); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, w, h); };
    const speck = (n, col, sz) => { x.fillStyle = col; for (let i = 0; i < n; i++) x.fillRect(r() * w, r() * h, sz || 1, sz || 1); };
    const stitch = (inset, col) => { x.setLineDash([5, 4]); x.lineWidth = 1.5; x.strokeStyle = col; x.strokeRect(inset, inset, w - inset * 2, h - inset * 2); x.setLineDash([]); };
    switch (look) {
      case 'leather': {
        // кожа изнутри: светлее у горловины, темнее в глубине, швы по краю, ремень с пряжкой
        grad('#4a2e18', '#160c06');
        for (let i = 0; i < 900; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,220,180,0.035)' : 'rgba(0,0,0,0.08)'; x.fillRect(r() * w, r() * h, 2 + r() * 3, 1); }
        const lg = x.createLinearGradient(0, 0, 0, h * 0.22); lg.addColorStop(0, 'rgba(160,110,60,0.55)'); lg.addColorStop(1, 'rgba(160,110,60,0)'); x.fillStyle = lg; x.fillRect(0, 0, w, h * 0.22);
        x.fillStyle = '#5a3818'; x.beginPath(); x.ellipse(w / 2, 0, w * 0.55, h * 0.07, 0, 0, Math.PI); x.fill();
        stitch(7, 'rgba(220,180,120,0.5)');
        x.fillStyle = 'rgba(30,16,8,0.65)'; x.fillRect(w * 0.12, h * 0.03, w * 0.07, h * 0.94); x.fillRect(w * 0.81, h * 0.03, w * 0.07, h * 0.94);
        x.strokeStyle = '#b8902a'; x.lineWidth = 3; x.strokeRect(w * 0.125, h * 0.07, w * 0.06, h * 0.05); x.strokeRect(w * 0.815, h * 0.07, w * 0.06, h * 0.05);
        break;
      }
      case 'sack': case 'linen': {
        grad(look === 'sack' ? '#6a5a3c' : '#8a8270', look === 'sack' ? '#251d10' : '#3a362c');
        x.globalAlpha = 0.18; for (let y = 0; y < h; y += 3) { x.fillStyle = y % 6 ? '#000' : '#fff'; x.fillRect(0, y, w, 1); } for (let xx = 0; xx < w; xx += 3) { x.fillStyle = xx % 6 ? '#000' : '#fff'; x.fillRect(xx, 0, 1, h); } x.globalAlpha = 1;
        speck(400, 'rgba(0,0,0,0.25)', 2);
        x.strokeStyle = 'rgba(40,28,14,0.8)'; x.lineWidth = 3; x.beginPath(); for (let i = 0; i < 9; i++) { const xx = w * (0.1 + i * 0.1); x.moveTo(xx, 0); x.quadraticCurveTo(xx + 10, h * 0.08, xx + 4, h * 0.14); } x.stroke();
        break;
      }
      case 'basket': {
        x.fillStyle = '#2a1c0c'; x.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 12) for (let xx = (y / 12) % 2 ? 0 : 12; xx < w; xx += 24) { const g = x.createLinearGradient(xx, y, xx + 22, y + 10); g.addColorStop(0, '#b88a48'); g.addColorStop(1, '#7a5a2a'); x.fillStyle = g; x.fillRect(xx + 1, y + 1, 22, 10); }
        for (let xx = 0; xx < w; xx += 24) { x.fillStyle = 'rgba(200,160,90,0.6)'; x.fillRect(xx, 0, 3, h); }
        const v = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.65)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
        break;
      }
      case 'birch': {
        grad('#d8d0bc', '#6a6050');
        for (let i = 0; i < 160; i++) { x.fillStyle = 'rgba(30,24,18,' + (0.3 + r() * 0.5) + ')'; x.fillRect(r() * w, r() * h, 6 + r() * 18, 1.5 + r() * 2); }
        x.fillStyle = 'rgba(120,80,40,0.25)'; for (let i = 0; i < 6; i++) x.fillRect(0, r() * h, w, 2);
        const v = x.createRadialGradient(w / 2, h * 0.6, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7); v.addColorStop(0, 'rgba(0,0,0,0.15)'); v.addColorStop(1, 'rgba(0,0,0,0.6)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
        break;
      }
      case 'velvet': {
        grad('#5a1630', '#1a0610');
        const sh = x.createLinearGradient(0, 0, w, h); sh.addColorStop(0.3, 'rgba(255,180,220,0)'); sh.addColorStop(0.5, 'rgba(255,180,220,0.12)'); sh.addColorStop(0.7, 'rgba(255,180,220,0)'); x.fillStyle = sh; x.fillRect(0, 0, w, h);
        stitch(6, 'rgba(230,190,90,0.6)');
        break;
      }
      case 'magic': {
        grad('#2a2058', '#06041a');
        for (let i = 0; i < 140; i++) { const a = r(); x.fillStyle = 'rgba(200,210,255,' + a + ')'; x.fillRect(r() * w, r() * h, a > 0.85 ? 2 : 1, a > 0.85 ? 2 : 1); }
        x.font = Math.round(Math.min(w, h) * 0.07) + 'px serif'; x.fillStyle = 'rgba(150,170,255,0.18)';
        for (let i = 0; i < 14; i++) x.fillText('ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ'[i % 12], r() * w, r() * h);
        stitch(6, 'rgba(180,190,255,0.45)');
        break;
      }
      case 'chest': {
        for (let y = 0; y < h; y += 26) { const g = x.createLinearGradient(0, y, 0, y + 26); g.addColorStop(0, '#6a4424'); g.addColorStop(1, '#3a2410'); x.fillStyle = g; x.fillRect(0, y, w, 25); x.fillStyle = '#1a0e06'; x.fillRect(0, y + 25, w, 1); }
        for (const xx of [w * 0.1, w * 0.9]) { x.fillStyle = '#4a4a50'; x.fillRect(xx - 6, 0, 12, h); x.fillStyle = '#8a8a90'; for (let y = 10; y < h; y += 30) { x.beginPath(); x.arc(xx, y, 2.5, 0, Math.PI * 2); x.fill(); } }
        const v = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
        break;
      }
      case 'pouch': {
        grad('#6a4426', '#1e1008');
        for (let i = 0; i < 500; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,220,180,0.04)' : 'rgba(0,0,0,0.1)'; x.fillRect(r() * w, r() * h, 2, 1); }
        x.strokeStyle = 'rgba(30,16,8,0.6)'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < 10; i++) { const xx = w * (0.05 + i * 0.1); x.moveTo(xx, 0); x.lineTo(xx + 6, h * 0.12); } x.stroke();
        x.strokeStyle = '#c8a870'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, h * 0.06); x.quadraticCurveTo(w / 2, h * 0.14, w, h * 0.06); x.stroke();
        stitch(6, 'rgba(220,180,120,0.45)');
        break;
      }
      case 'hands': grad('#4a1a14', '#160606'); stitch(4, 'rgba(255,120,100,0.4)'); break;
      default: { // карманы: подкладка из грубого сукна
        grad('#3a342a', '#14110c');
        x.globalAlpha = 0.12; for (let y = 0; y < h; y += 2) { x.fillStyle = y % 4 ? '#000' : '#fff'; x.fillRect(0, y, w, 1); } x.globalAlpha = 1;
        stitch(6, 'rgba(200,190,160,0.35)');
      }
    }
    bcache.set(key, c);
    return c;
  }

  // ============================================================
  // Что можно сделать с вещью (колесо)
  // ============================================================
  UI.itemActions = function (it) {
    const P = G.P, b = D.items[it.b] || {}, opts = [];
    const t = it.t || b.t;
    const wornNow = Object.values(P.eq).includes(it);
    if (t === 'food') opts.push({ t: (b.drink ? 'Выпить' : 'Съесть'), ic: '🍞', f: () => Gm.use(it) });
    else if (t === 'potion') opts.push({ t: 'Выпить', ic: '⚗', f: () => Gm.use(it) });
    else if (t === 'book' || it.b === 'book') opts.push({ t: 'Прочитать', ic: '📖', f: () => Gm.use(it) });
    else if (t === 'ammo') opts.push({ t: 'Зарядить', ic: '➶', f: () => Gm.use(it) });
    else if (it.cont) { opts.push({ t: it.water ? 'Выпить воду' : 'Набрать воды', ic: '💧', f: () => Gm.use(it) }); }
    else if (!it.s && !b.s) opts.push({ t: 'Использовать', ic: '✋', f: () => Gm.use(it) });
    if ((it.s || b.s) === 'hand') {
      Gm.ensureSlots(P);
      if (Gm.holds(P, it)) opts.push({ t: 'Убрать из руки', ic: '↓', f: () => Gm.equip(it, P.eq.hand === it ? 'hand' : 'off') });
      if (P.eq.hand !== it) opts.push({ t: Gm.twoHanded(it) ? 'В обе руки' : 'В главную руку', ic: '⚔', f: () => Gm.equip(it, 'hand') });
      if (P.eq.off !== it && !Gm.twoHanded(it)) opts.push({ t: 'Во вторую руку', ic: '🛡', f: () => Gm.equip(it, 'off') });
    } else if (Gm.holdable && Gm.holdable(it)) {
      Gm.ensureSlots(P);
      if (Gm.holds(P, it)) opts.push({ t: 'Убрать из руки', ic: '↓', f: () => Gm.hold(it, P.eq.hand === it ? 'hand' : 'off') });
      else opts.push({ t: 'Держать в руке', ic: '✋', f: () => Gm.hold(it, 'off') });
    } else if (it.s || b.s) {
      opts.push({ t: wornNow ? 'Снять' : 'Надеть', ic: wornNow ? '↓' : '👕', f: () => Gm.equip(it) });
      if (b.music || it.music || it.b === 'mask' || it.art || it.b === 'signet') opts.push({ t: 'Использовать', ic: '✋', f: () => Gm.use(it) });
    }
    // переложить в другую сумку
    if (!wornNow && BG()) {
      for (const c of BG().layout(P)) if (c.k !== it.in && c.k !== 'hands' && c.items.length < c.cap) opts.push({ t: 'Переложить: ' + c.n.toLowerCase(), ic: '⇄', f: () => { BG().move(it, c.k); } });
    }
    let lava = false; for (const [dx, dy] of U.DIR8) { const x = P.x + dx, y = P.y + dy; if (G.map && x >= 0 && y >= 0 && x < G.map.w && y < G.map.h && TL[G.map.tiles[y * G.map.w + x]].lava) lava = true; }
    if (lava) opts.push({ t: 'Бросить в лаву', ic: '🔥', f: () => Gm.throwInto(it) });
    opts.push({ t: 'Осмотреть', ic: '👁', f: () => UI.popup(Items.name(it), UI.itemTip(it).slice(1).join('\n\n')) });
    if (!wornNow) opts.push({ t: 'Выбросить', ic: '✕', f: () => Gm.drop(it) });
    return opts;
  };

  // ============================================================
  // Экран сумки
  // ============================================================
  UI.inventory = function () {
    const P = G.P;
    const s = {
      name: 'inv', tab: 0, sel: 0, hov: -1, hv: {}, wheel: null, last: performance.now(), anim: false,
      draw(t, top) {
        const now = performance.now(), dt = Math.min(0.1, (now - s.last) / 1000); s.last = now;
        const cont = BG() ? BG().layout(P) : [{ k: 'pockets', n: 'Сумка', cap: P.inv.length, look: 'pockets', items: P.inv.filter((i) => !Object.values(P.eq).includes(i)) }];
        s.cont = cont;
        s.tab = U.clamp(s.tab, 0, cont.length - 1);
        const C = cont[s.tab];
        const W = Math.min(t.cols - 2, 104), H = Math.min(t.rows - 2, 34);
        const x0 = Math.floor((t.cols - W) / 2), y0 = Math.max(0, Math.floor((t.rows - H) / 2));
        // картинки нижних окон (портрет, полоски) не должны проступать сквозь сумку
        const prev = t.post.splice(0), rx = x0 * t.cw, ry = y0 * t.ch, rw = W * t.cw, rh = H * t.ch;
        for (const f of prev) t.post.push((ctx, T) => { ctx.beginPath(); ctx.rect(0, 0, t.cols * t.cw, t.rows * t.ch); ctx.rect(rx, ry, rw, rh); ctx.clip('evenodd'); f(ctx, T); });
        t.box(x0, y0, W, H, COL.border, COL.panel, 'Сумка');
        const narrow = W < 78;
        const TW = narrow ? 14 : 20, IW = narrow ? 0 : 30;
        // шапка: места, вес, кошелёк
        const slots = BG() ? BG().slots(P) : 99, used = BG() ? BG().used(P) : P.inv.length;
        const wt = Math.round(Gm.weight() * 10) / 10, cap = Gm.cap();
        const over = used > slots || wt > cap;
        t.text(x0 + 2, y0 + 1, 'Места ' + used + '/' + slots + '   Вес ' + wt + '/' + cap + ' кг   ' + Gm.purseStr(), over ? '#e08070' : COL.accent, COL.panel, W - 4);
        if (over) t.text(x0 + W - 13, y0 + 1, 'перегруз!', '#ff7060', COL.panel);
        // вкладки — во что сложено
        let ty = y0 + 3;
        cont.forEach((c, i) => {
          const on = i === s.tab;
          t.fill(x0 + 1, ty, TW, 2, ' ', COL.text, on ? '#3a2e1c' : COL.panel);
          const ic = c.bag ? UI.itemIcon(c.bag) : null, yy = ty;
          if (ic) t.post.push((ctx) => { ctx.imageSmoothingEnabled = false; ctx.drawImage(ic, (x0 + 1.4) * t.cw, (yy + 0.15) * t.ch, t.ch * 1.7, t.ch * 1.7); });
          t.text(x0 + 2 + (ic ? 3 : 0), ty, c.n.slice(0, TW - 4 - (ic ? 3 : 0)), on ? '#f0d890' : c.k === 'hands' ? '#e08070' : COL.text, on ? '#3a2e1c' : COL.panel);
          t.text(x0 + 2 + (ic ? 3 : 0), ty + 1, c.items.length + (c.k === 'hands' ? '' : '/' + c.cap), c.items.length >= c.cap && c.k !== 'hands' ? '#e0a070' : COL.dim, on ? '#3a2e1c' : COL.panel);
          const ii = i;
          t.hot(x0 + 1, ty, TW, 2, () => { s.tab = ii; s.sel = 0; s.wheel = null; UI.render(); });
          ty += 3;
        });
        // что на тебе: в руках и надетое
        ty = Math.max(ty, y0 + H - 7);
        t.text(x0 + 2, ty, 'В руках:', COL.dim, COL.panel); ty++;
        const held = [P.eq.hand, P.eq.off].filter(Boolean);
        held.forEach((it, i) => { const ic = UI.itemIcon(it), yy = ty, xx = x0 + 2 + i * 5; t.post.push((ctx) => { ctx.imageSmoothingEnabled = false; ctx.drawImage(ic, xx * t.cw, yy * t.ch, t.ch * 2, t.ch * 2); }); t.hot(xx, yy, 4, 2, (h, cx, cy, btn, px, py) => { s.wheel = mkWheel(it, px, py); UI.render(); }, { tip: () => UI.itemTip(it) }); });
        if (!held.length) t.text(x0 + 2, ty, 'пусто', COL.faint, COL.panel);
        t.text(x0 + 2, y0 + H - 3, 'O — одежда', COL.dim, COL.panel);
        t.hot(x0 + 2, y0 + H - 3, 11, 1, () => { UI.outfit(); });
        // ячейки на фоне сумки
        const gx0 = x0 + TW + 2, gy0 = y0 + 3, gw = W - TW - IW - (narrow ? 3 : 4), gh = H - 5 - (narrow ? 5 : 0);
        const px0 = gx0 * t.cw, py0 = gy0 * t.ch, pw = gw * t.cw, ph = gh * t.ch;
        const n = Math.max(1, C.k === 'hands' ? C.items.length : C.cap);
        let cols = Math.min(n, Math.max(1, Math.floor(pw / 58)));
        while (cols > 1 && Math.ceil(n / cols) * Math.min(pw / cols, 92) < ph * 0.35) cols--;
        const rows = Math.ceil(n / cols);
        const cs = Math.floor(Math.min(92, pw / cols, ph / rows));
        const gxP = px0 + (pw - cs * cols) / 2, gyP = py0 + Math.max(4, (ph - cs * rows) / 2);
        s.grid = { gxP, gyP, cs, cols, rows, n };
        // наведение мышью — по пикселям
        const mp = UI.locked && UI.vcur ? UI.vcur : UI.mpx;
        s.hov = -1;
        if (mp && !s.wheel) { const cx = Math.floor((mp[0] - gxP) / cs), cy = Math.floor((mp[1] - gyP) / cs); if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) { const i = cy * cols + cx; if (i < C.items.length) s.hov = i; } }
        s.sel = U.clamp(s.sel, 0, Math.max(0, C.items.length - 1));
        let moving = false;
        for (let i = 0; i < n; i++) { const tgt = i === s.hov || (i === s.sel && !UI.mouse) ? 1 : 0; const v = s.hv[i] || 0; const nv = v + (tgt - v) * Math.min(1, dt * 14); s.hv[i] = Math.abs(nv - tgt) < 0.01 ? tgt : nv; if (s.hv[i] !== tgt) moving = true; }
        const look = C.look || 'pockets';
        const items = C.items;
        t.post.push((ctx) => {
          ctx.save();
          const bg = bgArt(look, pw, ph);
          ctx.globalAlpha = 1; ctx.drawImage(bg, px0, py0, pw, ph);
          // глубина: внутренняя тень по краю
          const v = ctx.createLinearGradient(0, py0, 0, py0 + 14); v.addColorStop(0, 'rgba(0,0,0,0.55)'); v.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = v; ctx.fillRect(px0, py0, pw, 14);
          ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2; ctx.strokeRect(px0 + 1, py0 + 1, pw - 2, ph - 2);
          for (let i = 0; i < n; i++) {
            const cx = gxP + (i % cols) * cs, cy = gyP + Math.floor(i / cols) * cs, pad = Math.max(3, cs * 0.07);
            // ячейка-кармашек
            const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
            rr(cx + pad, cy + pad, cs - pad * 2, cs - pad * 2, cs * 0.12);
            ctx.fillStyle = C.k === 'hands' ? 'rgba(80,10,0,0.4)' : 'rgba(0,0,0,0.38)'; ctx.fill();
            ctx.strokeStyle = i === s.sel ? 'rgba(240,210,140,0.9)' : 'rgba(255,240,210,0.13)'; ctx.lineWidth = i === s.sel ? 2 : 1; ctx.stroke();
            const it = items[i];
            if (!it) continue;
            const hv = s.hv[i] || 0;
            const lift = hv * cs * 0.16, sc = 1 + hv * 0.1;
            const isz = (cs - pad * 2) * 0.8 * sc;
            const ix = cx + cs / 2 - isz / 2, iy = cy + cs / 2 - isz / 2 - lift;
            // тень под выдвинутой вещью
            if (hv > 0.02) { ctx.fillStyle = 'rgba(0,0,0,' + (0.45 * hv) + ')'; ctx.beginPath(); ctx.ellipse(cx + cs / 2, cy + cs - pad * 1.6, isz * 0.38, isz * 0.08, 0, 0, Math.PI * 2); ctx.fill(); }
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(UI.itemIcon(it), ix, iy, isz, isz);
            if (it.q > 1) { ctx.font = 'bold ' + Math.max(10, Math.round(cs * 0.2)) + 'px ' + t.family; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#000'; ctx.fillText('×' + it.q, cx + cs - pad - 1, cy + cs - pad + 1); ctx.fillStyle = '#f0e0b0'; ctx.fillText('×' + it.q, cx + cs - pad - 2, cy + cs - pad); }
            if (it.mw) { const k = U.clamp(it.wr / it.mw, 0, 1); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(cx + pad + 3, cy + cs - pad - 4, cs - pad * 2 - 6, 3); ctx.fillStyle = k > 0.5 ? '#7ac060' : k > 0.2 ? '#d8b040' : '#d05040'; ctx.fillRect(cx + pad + 3, cy + cs - pad - 4, (cs - pad * 2 - 6) * k, 3); }
            if (it.art) { ctx.strokeStyle = 'rgba(220,180,255,' + (0.4 + hv * 0.5) + ')'; ctx.lineWidth = 1.5; rr(cx + pad + 1, cy + pad + 1, cs - pad * 2 - 2, cs - pad * 2 - 2, cs * 0.1); ctx.stroke(); }
          }
          if (!items.length) { ctx.font = Math.round(t.ch * 0.9) + 'px ' + t.family; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(240,220,180,0.5)'; ctx.fillText(C.k === 'pockets' ? 'Карманы пусты' : 'Пусто', px0 + pw / 2, py0 + ph / 2); }
          ctx.restore();
        });
        // щелчок по сетке
        t.hot(gx0, gy0, gw, gh, (h, cx, cy, btn, px, py) => {
          const gcx = Math.floor((px - gxP) / cs), gcy = Math.floor((py - gyP) / cs);
          if (gcx < 0 || gcy < 0 || gcx >= cols || gcy >= rows) return;
          const i = gcy * cols + gcx;
          if (i >= items.length) return;
          s.sel = i;
          s.wheel = mkWheel(items[i], gxP + (i % cols) * cs + cs / 2, gyP + Math.floor(i / cols) * cs + cs / 2 - cs * 0.16);
          UI.render();
        });
        // описание под картинкой
        const cur = items[s.hov >= 0 ? s.hov : s.sel];
        if (cur) {
          const tip = UI.itemTip(cur);
          if (!narrow) {
            const ix = x0 + W - IW - 1, iy = y0 + 3, big = Math.min(IW * t.cw - 16, 9 * t.ch);
            t.post.push((ctx) => {
              const bx = ix * t.cw + (IW * t.cw - big) / 2, by = iy * t.ch;
              const g = ctx.createRadialGradient(bx + big / 2, by + big / 2, 4, bx + big / 2, by + big / 2, big * 0.7); g.addColorStop(0, 'rgba(255,220,160,0.18)'); g.addColorStop(1, 'rgba(255,220,160,0)'); ctx.fillStyle = g; ctx.fillRect(bx - 10, by - 6, big + 20, big + 12);
              ctx.imageSmoothingEnabled = false; ctx.drawImage(UI.itemIcon(cur), bx + big * 0.1, by + big * 0.05, big * 0.8, big * 0.8);
            });
            let yy = iy + Math.ceil(big / t.ch) + 1;
            t.text(ix + 1, yy++, Items.name(cur).slice(0, IW - 2), cur.art ? '#e0b0ff' : '#f0d890', COL.panel);
            const body = tip.slice(1).join(' · ');
            for (const l of U.wrap(body, IW - 2).slice(0, y0 + H - 3 - yy)) t.text(ix + 1, yy++, l, COL.text, COL.panel);
          } else {
            let yy = y0 + H - 7;
            t.text(gx0, yy++, Items.name(cur).slice(0, gw), '#f0d890', COL.panel);
            for (const l of U.wrap(tip.slice(1).join(' · '), gw).slice(0, 3)) t.text(gx0, yy++, l, COL.text, COL.panel);
          }
        }
        t.text(x0 + 2, y0 + H - 1, ' Клик/Enter — действия · стрелки — выбор · Tab — другая сумка · O — одежда · Esc ', COL.dim, COL.panel, W - 4);
        // колесо действий — поверх всего
        if (s.wheel) drawWheel(t, s.wheel);
        if (moving || s.wheel && s.wheel.anim < 1) { if (!s.raf) s.raf = requestAnimationFrame(() => { s.raf = 0; if (UI.top() === s) UI.render(); }); }
      },
      key(c) {
        const C = s.cont && s.cont[s.tab];
        const n = C ? C.items.length : 0, cols = s.grid ? s.grid.cols : 1;
        if (s.wheel) {
          const W = s.wheel;
          if (c.k === 'esc') { s.wheel = null; return; }
          if (c.k === 'left' || c.k === 'up') { W.sel = (W.sel - 1 + W.opts.length) % W.opts.length; return; }
          if (c.k === 'right' || c.k === 'down' || c.k === 'tab') { W.sel = (W.sel + 1) % W.opts.length; return; }
          if (c.k === 'enter' || c.k === 'act') { runOpt(W, W.sel); return; }
          if (c.n >= 1 && c.n <= W.opts.length) { runOpt(W, c.n - 1); return; }
          return;
        }
        if (c.k === 'esc' || c.k === 'inv') { UI.pop(); return; }
        if (c.k === 'tab') { s.tab = (s.tab + 1) % (s.cont ? s.cont.length : 1); s.sel = 0; return; }
        if (c.k === 'outfit') { UI.outfit(); return; }
        if (c.k === 'left') s.sel = Math.max(0, s.sel - 1);
        else if (c.k === 'right') s.sel = Math.min(n - 1, s.sel + 1);
        else if (c.k === 'up') s.sel = Math.max(0, s.sel - cols);
        else if (c.k === 'down') s.sel = Math.min(n - 1, s.sel + cols);
        else if ((c.k === 'enter' || c.k === 'act') && C && C.items[s.sel]) { const g = s.grid, i = s.sel; s.wheel = mkWheel(C.items[i], g.gxP + (i % g.cols) * g.cs + g.cs / 2, g.gyP + Math.floor(i / g.cols) * g.cs + g.cs / 2); }
        else if (c.n >= 1 && c.n <= Math.min(9, n)) s.sel = c.n - 1;
      },
    };
    function mkWheel(it, cx, cy) { return { it, opts: UI.itemActions(it), cx, cy, sel: 0, anim: 0, t0: performance.now() }; }
    function runOpt(W, i) {
      const o = W.opts[i];
      s.wheel = null;
      if (!o) return;
      o.f();
      UI.render();
    }
    function drawWheel(t, W) {
      W.anim = Math.min(1, (performance.now() - W.t0) / 160);
      const k = 1 - Math.pow(1 - W.anim, 3);
      const n = W.opts.length, R = Math.max(70, Math.min(150, 40 + n * 13)) * k;
      const mp = UI.locked && UI.vcur ? UI.vcur : UI.mpx;
      // выбор мышью — по углу
      if (mp) { const dx = mp[0] - W.cx, dy = mp[1] - W.cy, d = Math.hypot(dx, dy); if (d > 24) { let a = Math.atan2(dy, dx) + Math.PI / 2; if (a < 0) a += Math.PI * 2; W.sel = Math.round(a / (Math.PI * 2 / n)) % n; } }
      t.post.push((ctx) => {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,' + (0.45 * k) + ')'; ctx.fillRect(0, 0, t.cols * t.cw, t.rows * t.ch);
        // кольцо
        ctx.beginPath(); ctx.arc(W.cx, W.cy, R, 0, Math.PI * 2); ctx.lineWidth = 26 * k; ctx.strokeStyle = 'rgba(40,30,18,0.85)'; ctx.stroke();
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(230,200,140,0.5)'; ctx.beginPath(); ctx.arc(W.cx, W.cy, R + 13 * k, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(W.cx, W.cy, R - 13 * k, 0, Math.PI * 2); ctx.stroke();
        // вещь в центре
        const isz = 56 * k; ctx.fillStyle = 'rgba(20,14,8,0.9)'; ctx.beginPath(); ctx.arc(W.cx, W.cy, isz * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(240,210,140,0.8)'; ctx.stroke();
        ctx.imageSmoothingEnabled = false; ctx.drawImage(UI.itemIcon(W.it), W.cx - isz / 2, W.cy - isz / 2, isz, isz);
        ctx.font = Math.round(t.ch * 0.82) + 'px ' + t.family; ctx.textBaseline = 'middle';
        W.opts.forEach((o, i) => {
          const a = -Math.PI / 2 + i * (Math.PI * 2 / n), ox = W.cx + Math.cos(a) * R, oy = W.cy + Math.sin(a) * R;
          const on = i === W.sel;
          const lab = (i < 9 ? (i + 1) + ' ' : '') + o.t, tw = ctx.measureText(lab).width + 18;
          const bx = Math.cos(a) > 0.3 ? ox - 10 : Math.cos(a) < -0.3 ? ox - tw + 10 : ox - tw / 2;
          ctx.fillStyle = on ? 'rgba(120,84,30,0.97)' : 'rgba(30,22,14,0.92)';
          ctx.beginPath(); const r = 9, x = bx, y = oy - 12, w = tw, h = 24; ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = on ? '#f0d890' : 'rgba(230,200,140,0.45)'; ctx.lineWidth = on ? 2 : 1; ctx.stroke();
          ctx.fillStyle = on ? '#fff4d0' : '#e0d0b0'; ctx.textAlign = 'left'; ctx.fillText(lab, bx + 9, oy + 1);
          ctx.beginPath(); ctx.arc(ox, oy, on ? 5 : 3.5, 0, Math.PI * 2); ctx.fillStyle = on ? '#f0d890' : 'rgba(230,200,140,0.6)'; ctx.fill();
        });
        ctx.restore();
      });
      // щелчок: по пункту (угол) или мимо — закрыть
      t.hot(0, 0, t.cols, t.rows, (h, cx, cy, btn, px, py) => {
        const d = Math.hypot(px - W.cx, py - W.cy);
        if (d < 24 || d > R + 160) { s.wheel = null; UI.render(); return; }
        let a = Math.atan2(py - W.cy, px - W.cx) + Math.PI / 2; if (a < 0) a += Math.PI * 2;
        runOpt(W, Math.round(a / (Math.PI * 2 / n)) % n);
      });
    }
    return UI.push(s);
  };
})(window.EOF);
