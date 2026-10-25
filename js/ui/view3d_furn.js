'use strict';
// Мебель и утварь — настоящие объёмные вещи, а не картинки.
// Кровать с изголовьем у стены, подушкой и стёганым одеялом; стол на ножках с кружкой и свечой;
// стул спинкой от стола; очаг из камня с огнём, полкой и дымоходом до потолка; наковальня на чурбаке;
// сундук с железными полосами; алтарь со свечами; колонны; надгробия разных видов с холмиком земли;
// колодец с воротом и крышей; нужник; палатка; бочки, ящики, рыночные прилавки с навесами,
// стога, фонари, лодки у причала, телеги, оружейные стойки, верстаки и половики. Причалы стоят на сваях.
// Всё ставится по месту: спиной к стене, лицом к проходу.
(function (E) {
  const UI = E.UI, T = E.T, TL = E.TL, G = E.G, Gfx = E.Gfx, U = E.U;
  const FU = UI.V3furn = {};
  const WALL = 1.5;
  const SET = new Set(['BED', 'TABLE', 'CHAIR', 'BENCH', 'COUNTER', 'HEARTH', 'ANVIL', 'ALCHTABLE', 'THRONE', 'CHEST', 'ALTAR', 'PILLAR', 'GRAVE', 'WELL', 'OUTHOUSE', 'SIGN', 'TENT', 'INSCRIPTION', 'SHRINE',
    'BARREL', 'CRATE', 'STALL', 'HAY', 'LAMPPOST', 'BOAT', 'CART', 'RACK', 'WORKBENCH', 'RUG'].map((k) => T[k]).filter((v) => v != null));
  FU.has = (tid) => SET.has(tid);
  const hsh = (x, y, k) => (U.hash(x, y, k) >>> 0) % 1000 / 1000;

  // ---------- помощники ----------
  const D4 = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const blockAt = (m, x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h || (!TL[m.tiles[y * m.w + x]].walk && UI.mvTiles.BK[m.tiles[y * m.w + x]]);
  const walkAt = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && TL[m.tiles[y * m.w + x]].walk;
  // лицом от стены (если стена рядом), иначе — к самому открытому
  function awayFromWall(m, x, y) {
    for (const [dx, dy] of D4) if (blockAt(m, x - dx, y - dy) && walkAt(m, x + dx, y + dy)) return [dx, dy];
    for (const [dx, dy] of D4) if (blockAt(m, x - dx, y - dy)) return [dx, dy];
    return UI.V3props.facing(m, x, y);
  }
  // к соседу нужного вида
  function toward(m, x, y, tids) {
    for (const [dx, dy] of D4) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < m.w && b < m.h && tids.includes(m.tiles[b * m.w + a])) return [dx, dy]; }
    return null;
  }
  // восьмигранный столб (бочка, колонна, сруб колодца)
  function prism(M, F, r, y0, y1, tex, sky, top, n, cz) {
    const P3 = Gfx.P3, k = n || 8, z0 = cz || 0;
    for (let i = 0; i < k; i++) {
      const a0 = i / k * Math.PI * 2, a1 = (i + 1) / k * Math.PI * 2, am = (a0 + a1) / 2;
      const p0 = [Math.cos(a0) * r, Math.sin(a0) * r + z0], p1 = [Math.cos(a1) * r, Math.sin(a1) * r + z0];
      P3.quad(M, F.P(p1[0], y0, p1[1]), F.P(p0[0], y0, p0[1]), F.P(p0[0], y1, p0[1]), F.P(p1[0], y1, p1[1]), [i / k * 2, y1 - y0], [(i + 1) / k * 2, 0], tex, F.N(Math.cos(am), 0, Math.sin(am)), sky);
      if (top) P3.tri(M, F.P(0, y1, z0), F.P(p1[0], y1, p1[1]), F.P(p0[0], y1, p0[1]), [0.5, 0.5], [0.5 + Math.cos(a1) * 0.5, 0.5 + Math.sin(a1) * 0.5], [0.5 + Math.cos(a0) * 0.5, 0.5 + Math.sin(a0) * 0.5], top, F.N(0, 1, 0), sky);
    }
  }
  // кольцо (сруб колодца): внешняя и внутренняя стенки, верх
  function ring(M, F, r0, r1, y0, y1, tex, sky) {
    const P3 = Gfx.P3, k = 10;
    for (let i = 0; i < k; i++) {
      const a0 = i / k * Math.PI * 2, a1 = (i + 1) / k * Math.PI * 2, am = (a0 + a1) / 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      P3.quad(M, F.P(c1 * r1, y0, s1 * r1), F.P(c0 * r1, y0, s0 * r1), F.P(c0 * r1, y1, s0 * r1), F.P(c1 * r1, y1, s1 * r1), [0, y1 - y0], [1, 0], tex, F.N(Math.cos(am), 0, Math.sin(am)), sky);
      P3.quad(M, F.P(c0 * r0, y0, s0 * r0), F.P(c1 * r0, y0, s1 * r0), F.P(c1 * r0, y1, s1 * r0), F.P(c0 * r0, y1, s0 * r0), [0, y1 - y0], [1, 0], tex, F.N(-Math.cos(am), 0, -Math.sin(am)), sky * 0.6);
      P3.quad(M, F.P(c0 * r0, y1, s0 * r0), F.P(c1 * r0, y1, s1 * r0), F.P(c1 * r1, y1, s1 * r1), F.P(c0 * r1, y1, s0 * r1), [0, 0], [1, 0.3], tex, F.N(0, 1, 0), sky);
    }
  }
  // колесо: восьмигранный диск вдоль оси x
  function wheel(M, F, cx, cy, cz, r, w, sky) {
    const P3 = Gfx.P3, k = 10;
    for (let i = 0; i < k; i++) {
      const a0 = i / k * Math.PI * 2, a1 = (i + 1) / k * Math.PI * 2;
      const y0 = cy + Math.sin(a0) * r, z0 = cz + Math.cos(a0) * r, y1 = cy + Math.sin(a1) * r, z1 = cz + Math.cos(a1) * r;
      for (const sx of [-1, 1]) P3.tri(M, F.P(cx + sx * w, cy, cz), F.P(cx + sx * w, sx > 0 ? y1 : y0, sx > 0 ? z1 : z0), F.P(cx + sx * w, sx > 0 ? y0 : y1, sx > 0 ? z0 : z1), [0.5, 0.5], [0, 0], [1, 0], 'wood:d', F.N(sx, 0, 0), sky);
      P3.quad(M, F.P(cx - w, y0, z0), F.P(cx + w, y0, z0), F.P(cx + w, y1, z1), F.P(cx - w, y1, z1), [0, 0], [1, 0.2], 'iron', F.N(0, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)), sky);
    }
  }
  const CL_COL = ['r', 'b', 'g', 'y', 'p', 'o'];

  // ---------- вещи ----------
  const MODELS = {};
  MODELS.BED = (M, F, c) => {
    const B = c.box, sk = c.sky, col = CL_COL[Math.floor(c.r(1) * CL_COL.length)];
    B(-0.38, 0, -0.47, 0.38, 0.16, 0.45, 'wood:d');                       // рама
    for (const [lx, lz] of [[-0.36, -0.45], [0.36, -0.45], [-0.36, 0.43], [0.36, 0.43]]) B(lx - 0.03, 0, lz - 0.02, lx + 0.03, 0.18, lz + 0.02, 'wood:d');
    B(-0.35, 0.16, -0.45, 0.35, 0.25, 0.43, c.r(2) < 0.4 ? 'straw' : 'linen');   // тюфяк
    B(-0.36, 0.22, -0.12, 0.36, 0.3, 0.44, 'quilt:' + col);              // одеяло
    B(-0.37, 0.1, -0.12, -0.35, 0.3, 0.44, 'quilt:' + col); B(0.35, 0.1, -0.12, 0.37, 0.3, 0.44, 'quilt:' + col); // свисает по краям
    B(-0.25, 0.25, -0.43, 0.25, 0.34, -0.24, 'linen');                    // подушка
    B(-0.4, 0, -0.5, 0.4, 0.66, -0.45, 'wood:d');                         // изголовье
    B(-0.42, 0.62, -0.51, 0.42, 0.7, -0.44, 'wood');
    B(-0.4, 0, 0.43, 0.4, 0.34, 0.47, 'wood:d');                          // изножье
  };
  MODELS.TABLE = (M, F, c) => {
    const B = c.box;
    B(-0.45, 0.4, -0.45, 0.45, 0.46, 0.45, 'wood:l');
    for (const [lx, lz] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) B(lx - 0.035, 0, lz - 0.035, lx + 0.035, 0.4, lz + 0.035, 'wood:d');
    B(-0.38, 0.33, -0.39, 0.38, 0.38, -0.36, 'wood:d'); B(-0.38, 0.33, 0.36, 0.38, 0.38, 0.39, 'wood:d');
    // на столе: кружка, миска, хлеб, свеча
    const k = c.r(3);
    if (k < 0.75) { B(-0.2, 0.46, -0.08, -0.12, 0.56, 0, 'mug'); }
    if (k > 0.3) { B(0.05, 0.46, 0.05, 0.25, 0.49, 0.22, 'pot'); B(0.08, 0.49, 0.08, 0.22, 0.52, 0.19, 'straw'); }
    if (k > 0.55) { B(0.15, 0.46, -0.25, 0.19, 0.6, -0.21, 'linen'); B(0.155, 0.6, -0.245, 0.185, 0.66, -0.215, 'candle'); c.light(0.17, 0.68, -0.23, [1, 0.75, 0.4], 2.4, 0.5); }
  };
  MODELS.CHAIR = (M, F, c) => {
    const B = c.box;
    B(-0.18, 0.24, -0.16, 0.18, 0.29, 0.2, 'wood');
    for (const [lx, lz] of [[-0.15, -0.13], [0.15, -0.13], [-0.15, 0.17], [0.15, 0.17]]) B(lx - 0.025, 0, lz - 0.025, lx + 0.025, 0.24, lz + 0.025, 'wood:d');
    B(-0.18, 0.29, -0.2, -0.14, 0.68, -0.15, 'wood:d'); B(0.14, 0.29, -0.2, 0.18, 0.68, -0.15, 'wood:d');
    B(-0.15, 0.5, -0.2, 0.15, 0.64, -0.16, 'wood');
  };
  MODELS.BENCH = (M, F, c) => {
    const B = c.box;
    B(-0.47, 0.24, -0.15, 0.47, 0.3, 0.15, 'wood');
    for (const lx of [-0.38, 0.38]) B(lx - 0.04, 0, -0.12, lx + 0.04, 0.24, 0.12, 'wood:d');
    B(-0.36, 0.08, -0.03, 0.36, 0.12, 0.03, 'wood:d');
  };
  MODELS.COUNTER = (M, F, c) => {
    const B = c.box;
    B(-0.5, 0, -0.25, 0.5, 0.5, 0.22, 'planks');
    B(-0.5, 0.5, -0.3, 0.5, 0.56, 0.3, 'wood:l');
    B(-0.5, 0, 0.22, 0.5, 0.06, 0.26, 'wood:d');
    const k = c.r(4);
    if (k < 0.5) { B(-0.3, 0.56, -0.1, -0.22, 0.66, -0.02, 'mug'); B(0.1, 0.56, 0, 0.18, 0.66, 0.08, 'mug'); }
    else if (k < 0.8) { B(-0.2, 0.56, -0.15, 0.2, 0.6, 0.12, 'cloth:' + CL_COL[Math.floor(k * 10) % CL_COL.length]); }
  };
  MODELS.HEARTH = (M, F, c) => {
    const B = c.box, P3 = Gfx.P3, top = c.ceil;
    B(-0.48, 0, -0.5, -0.3, 0.62, 0.06, 'arch'); B(0.3, 0, -0.5, 0.48, 0.62, 0.06, 'arch');   // бока
    B(-0.48, 0.5, -0.5, 0.48, 0.74, 0.08, 'arch');                                         // перемычка
    B(-0.3, 0, -0.5, 0.3, 0.5, -0.38, 'ashes');                                            // закопчённая задняя стенка
    B(-0.32, 0, -0.38, 0.32, 0.04, 0.06, 'ashes');                                          // под
    B(-0.2, 0.04, -0.2, 0.2, 0.09, -0.12, 'beam'); B(-0.12, 0.04, -0.28, -0.04, 0.09, 0.0, 'beam'); // поленья
    // огонь: две скрещённые светящиеся плоскости
    for (const [ax, az, bx, bz] of [[-0.18, -0.22, 0.18, -0.12], [-0.14, -0.08, 0.14, -0.3]]) {
      P3.quad(M, F.P(ax, 0.06, az), F.P(bx, 0.06, bz), F.P(bx * 0.4, 0.36, bz), F.P(ax * 0.4, 0.36, az), [0, 1], [1, 0], 'flame', F.N(0, 0, 1), c.sky);
      P3.quad(M, F.P(bx, 0.06, bz), F.P(ax, 0.06, az), F.P(ax * 0.4, 0.36, az), F.P(bx * 0.4, 0.36, bz), [0, 1], [1, 0], 'flame', F.N(0, 0, -1), c.sky);
    }
    B(-0.52, 0.74, -0.5, 0.52, 0.8, 0.14, 'wood:d');                                         // полка над очагом
    B(-0.38, 0.8, -0.1, -0.26, 0.92, 0.02, 'pot'); B(0.26, 0.8, -0.05, 0.3, 0.92, -0.01, 'candle');
    B(-0.4, 0.8, -0.5, 0.4, 1.02, -0.18, 'arch');                                           // дымоход — до потолка
    B(-0.26, 1.02, -0.5, 0.26, top, -0.24, 'arch');
  };
  MODELS.ANVIL = (M, F, c) => {
    const B = c.box;
    B(-0.16, 0, -0.16, 0.16, 0.28, 0.16, 'bark');
    B(-0.2, 0.28, -0.1, 0.16, 0.36, 0.1, 'iron'); B(-0.14, 0.24, -0.07, 0.1, 0.28, 0.07, 'iron');
    B(0.16, 0.31, -0.06, 0.3, 0.36, 0.06, 'iron'); B(0.3, 0.33, -0.03, 0.36, 0.36, 0.03, 'iron');
    B(-0.12, 0.36, 0.03, 0.06, 0.39, 0.07, 'iron'); B(0.04, 0.36, 0.04, 0.2, 0.38, 0.06, 'wood:d'); // молот
    B(-0.38, 0, 0.15, -0.22, 0.42, 0.33, 'barrel');                                           // бочка с водой
  };
  MODELS.ALCHTABLE = (M, F, c) => {
    MODELS.TABLE(M, F, Object.assign({}, c, { r: () => 0.2 }));
    const B = c.box;
    [['g', -0.3], ['b', -0.16], ['p', 0.0]].forEach(([g, x]) => { B(x - 0.05, 0.46, -0.3, x + 0.05, 0.58, -0.2, 'glass:' + g); B(x - 0.02, 0.58, -0.27, x + 0.02, 0.64, -0.23, 'glass:' + g); });
    B(0.12, 0.46, 0.0, 0.36, 0.6, 0.24, 'iron'); B(0.15, 0.6, 0.03, 0.33, 0.62, 0.21, 'glass:g');      // котелок
    B(-0.3, 0.46, 0.1, -0.06, 0.5, 0.3, 'book');
    c.light(-0.16, 0.6, -0.25, [0.5, 1, 0.7], 2.2, 0.45);
  };
  MODELS.THRONE = (M, F, c) => {
    const B = c.box;
    B(-0.48, 0, -0.48, 0.48, 0.1, 0.48, 'arch');
    B(-0.32, 0.1, -0.3, 0.32, 0.42, 0.3, 'gold'); B(-0.28, 0.42, -0.26, 0.28, 0.48, 0.28, 'velvet');
    B(-0.34, 0.1, -0.38, 0.34, 1.35, -0.28, 'gold'); B(-0.26, 0.48, -0.29, 0.26, 1.22, -0.26, 'velvet');
    B(-0.36, 0.42, -0.3, -0.28, 0.62, 0.3, 'gold'); B(0.28, 0.42, -0.3, 0.36, 0.62, 0.3, 'gold');
    B(-0.1, 1.35, -0.36, 0.1, 1.45, -0.3, 'gold');
  };
  MODELS.CHEST = (M, F, c) => {
    const B = c.box;
    B(-0.3, 0, -0.2, 0.3, 0.26, 0.2, 'wood:d');
    B(-0.31, 0.26, -0.21, 0.31, 0.34, 0.21, 'wood'); B(-0.29, 0.34, -0.17, 0.29, 0.37, 0.17, 'wood');
    for (const lx of [-0.22, 0.2]) B(lx, 0, -0.215, lx + 0.04, 0.375, 0.215, 'iron');
    B(-0.04, 0.18, 0.2, 0.04, 0.28, 0.225, 'gold');
  };
  MODELS.ALTAR = (M, F, c) => {
    const B = c.box;
    B(-0.46, 0, -0.26, 0.46, 0.08, 0.26, 'arch');
    B(-0.4, 0.08, -0.2, 0.4, 0.5, 0.2, 'arch');
    B(-0.44, 0.5, -0.24, 0.44, 0.55, 0.24, 'gravestone');
    B(-0.12, 0.3, -0.25, 0.12, 0.555, 0.25, 'velvet');
    for (const lx of [-0.32, 0.32]) { B(lx - 0.03, 0.55, -0.03, lx + 0.03, 0.72, 0.03, 'linen'); B(lx - 0.02, 0.72, -0.02, lx + 0.02, 0.78, 0.02, 'candle'); }
  };
  MODELS.PILLAR = (M, F, c) => {
    const B = c.box, top = c.indoor ? c.ceil : 1.7;
    B(-0.26, 0, -0.26, 0.26, 0.12, 0.26, 'arch');
    prism(M, F, 0.17, 0.12, top - 0.12, 'stonewall', c.sky);
    B(-0.25, top - 0.12, -0.25, 0.25, top, 0.25, 'arch');
  };
  MODELS.GRAVE = (M, F, c) => {
    const B = c.box, P3 = Gfx.P3, k = c.r(5);
    // холмик земли
    P3.quad(M, F.P(-0.2, 0.0, -0.22), F.P(0.2, 0.0, -0.22), F.P(0.17, 0.12, 0.05), F.P(-0.17, 0.12, 0.05), [0, 0], [1, 1], 'earth', F.N(0, 0.8, -0.6), c.sky);
    P3.quad(M, F.P(-0.17, 0.12, 0.05), F.P(0.17, 0.12, 0.05), F.P(0.2, 0.0, 0.42), F.P(-0.2, 0.0, 0.42), [0, 0], [1, 1], 'earth', F.N(0, 0.9, 0.4), c.sky);
    P3.quad(M, F.P(-0.2, 0.0, 0.42), F.P(-0.2, 0.0, -0.22), F.P(-0.17, 0.12, 0.05), F.P(-0.17, 0.12, 0.05), [0, 0], [1, 1], 'earth', F.N(-1, 0.3, 0), c.sky);
    P3.quad(M, F.P(0.2, 0.0, -0.22), F.P(0.2, 0.0, 0.42), F.P(0.17, 0.12, 0.05), F.P(0.17, 0.12, 0.05), [0, 0], [1, 1], 'earth', F.N(1, 0.3, 0), c.sky);
    if (k < 0.45) {
      // каменная плита с закруглённым верхом
      B(-0.2, 0, -0.34, 0.2, 0.52, -0.25, 'gravestone'); B(-0.15, 0.52, -0.34, 0.15, 0.6, -0.25, 'gravestone'); B(-0.08, 0.6, -0.34, 0.08, 0.64, -0.25, 'gravestone');
      B(-0.24, 0, -0.38, 0.24, 0.05, -0.21, 'arch');
    } else if (k < 0.8) {
      // деревянный крест
      B(-0.035, 0, -0.33, 0.035, 0.72, -0.27, 'wood:d'); B(-0.2, 0.46, -0.33, 0.2, 0.53, -0.27, 'wood:d');
    } else {
      // каменный крест на подножии
      B(-0.16, 0, -0.38, 0.16, 0.1, -0.22, 'arch'); B(-0.045, 0.1, -0.34, 0.045, 0.78, -0.26, 'gravestone'); B(-0.2, 0.5, -0.34, 0.2, 0.58, -0.26, 'gravestone');
    }
  };
  MODELS.WELL = (M, F, c) => {
    const B = c.box, P3 = Gfx.P3;
    ring(M, F, 0.27, 0.4, 0, 0.46, 'stonewall', c.sky);
    P3.quad(M, F.P(-0.27, 0.2, -0.27), F.P(0.27, 0.2, -0.27), F.P(0.27, 0.2, 0.27), F.P(-0.27, 0.2, 0.27), [0, 0], [1, 1], 'water', F.N(0, 1, 0), c.sky * 0.4, 1);
    for (const lx of [-0.37, 0.37]) B(lx - 0.04, 0.3, -0.04, lx + 0.04, 1.2, 0.04, 'beam');
    B(-0.37, 0.86, -0.03, 0.37, 0.92, 0.03, 'beam');
    B(-0.005, 0.6, -0.005, 0.005, 0.86, 0.005, 'rope'); B(-0.07, 0.48, -0.07, 0.07, 0.62, 0.07, 'barrel');
    // крыша
    P3.quad(M, F.P(-0.5, 1.12, -0.32), F.P(0.5, 1.12, -0.32), F.P(0.5, 1.42, 0), F.P(-0.5, 1.42, 0), [0, 1], [1, 0], 'roof_wood', F.N(0, 0.7, -0.7), c.sky);
    P3.quad(M, F.P(0.5, 1.12, 0.32), F.P(-0.5, 1.12, 0.32), F.P(-0.5, 1.42, 0), F.P(0.5, 1.42, 0), [0, 1], [1, 0], 'roof_wood', F.N(0, 0.7, 0.7), c.sky);
    P3.quad(M, F.P(0.5, 1.12, -0.32), F.P(-0.5, 1.12, -0.32), F.P(-0.5, 1.42, 0), F.P(0.5, 1.42, 0), [0, 1], [1, 0], 'ceiling_wood', F.N(0, -0.7, 0.7), c.sky * 0.6);
    P3.quad(M, F.P(-0.5, 1.12, 0.32), F.P(0.5, 1.12, 0.32), F.P(0.5, 1.42, 0), F.P(-0.5, 1.42, 0), [0, 1], [1, 0], 'ceiling_wood', F.N(0, -0.7, -0.7), c.sky * 0.6);
  };
  MODELS.OUTHOUSE = (M, F, c) => {
    const B = c.box, P3 = Gfx.P3;
    B(-0.36, 0, -0.36, 0.36, 1.22, 0.36, 'planks');
    B(-0.2, 0, 0.36, 0.2, 1.0, 0.38, 'wood:d');                         // дверь
    B(-0.03, 0.82, 0.38, 0.03, 0.88, 0.39, 'ashes');                     // прорезь-полумесяц
    P3.quad(M, F.P(-0.44, 1.38, 0.46), F.P(0.44, 1.38, 0.46), F.P(0.44, 1.2, -0.46), F.P(-0.44, 1.2, -0.46), [0, 0], [1, 1], 'roof_wood', F.N(0, 0.98, 0.2), c.sky);
    P3.quad(M, F.P(0.44, 1.38, 0.46), F.P(-0.44, 1.38, 0.46), F.P(-0.44, 1.2, -0.46), F.P(0.44, 1.2, -0.46), [0, 0], [1, 1], 'ceiling_wood', F.N(0, -1, 0), c.sky * 0.6);
    for (const lx of [-0.36, 0.36]) P3.tri(M, F.P(lx, 1.22, -0.36), F.P(lx, 1.22, 0.36), F.P(lx, 1.37, 0.36), [0, 0], [1, 0], [1, 0.2], 'planks', F.N(Math.sign(lx), 0, 0), c.sky);
  };
  MODELS.SIGN = (M, F, c) => {
    const B = c.box;
    B(-0.04, 0, -0.04, 0.04, 0.95, 0.04, 'beam');
    B(-0.32, 0.6, -0.03, 0.32, 0.88, 0.03, 'wood:l');
    B(-0.26, 0.7, 0.03, 0.2, 0.72, 0.035, 'wood:d'); B(-0.26, 0.76, 0.03, 0.12, 0.78, 0.035, 'wood:d');
  };
  MODELS.TENT = (M, F, c) => {
    const P3 = Gfx.P3, h = 1.05, w = 0.55, d = 0.55;
    P3.quad(M, F.P(-w, 0, -d), F.P(-w, 0, d), F.P(0, h, d), F.P(0, h, -d), [0, 1], [1, 0], 'canvas', F.N(-0.9, 0.45, 0), c.sky);
    P3.quad(M, F.P(w, 0, d), F.P(w, 0, -d), F.P(0, h, -d), F.P(0, h, d), [0, 1], [1, 0], 'canvas', F.N(0.9, 0.45, 0), c.sky);
    P3.tri(M, F.P(w, 0, -d), F.P(-w, 0, -d), F.P(0, h, -d), [1, 1], [0, 1], [0.5, 0], 'canvas', F.N(0, 0, -1), c.sky);
    // вход: две откинутые полы и тёмная глубина
    P3.tri(M, F.P(-w, 0, d), F.P(-0.18, 0, d + 0.05), F.P(0, h, d), [0, 1], [0.4, 1], [0.5, 0], 'canvas:d', F.N(0, 0, 1), c.sky);
    P3.tri(M, F.P(0.18, 0, d + 0.05), F.P(w, 0, d), F.P(0, h, d), [0.6, 1], [1, 1], [0.5, 0], 'canvas:d', F.N(0, 0, 1), c.sky);
    P3.tri(M, F.P(-0.18, 0, d - 0.02), F.P(0.18, 0, d - 0.02), F.P(0, h * 0.95, d - 0.02), [0, 1], [1, 1], [0.5, 0], 'tunnel', F.N(0, 0, 1), 0.05);
    c.box(-0.02, 0, -d - 0.02, 0.02, h + 0.1, -d + 0.02, 'beam'); c.box(-0.02, 0, d - 0.02, 0.02, h + 0.1, d + 0.02, 'beam');
  };
  MODELS.INSCRIPTION = (M, F, c) => {
    const B = c.box;
    B(-0.22, 0, -0.09, 0.22, 0.8, 0.09, 'gravestone'); B(-0.16, 0.8, -0.09, 0.16, 0.9, 0.09, 'gravestone'); B(-0.08, 0.9, -0.09, 0.08, 0.95, 0.09, 'gravestone');
    B(-0.28, 0, -0.14, 0.28, 0.06, 0.14, 'arch');
  };
  MODELS.SHRINE = (M, F, c) => {
    const B = c.box, P3 = Gfx.P3;
    B(-0.42, 0, -0.34, 0.42, 0.12, 0.34, 'arch');
    B(-0.32, 0.12, -0.26, 0.32, 0.66, 0.2, 'arch');
    B(-0.16, 0.22, 0.2, 0.16, 0.5, 0.22, 'tunnel');
    B(-0.03, 0.24, 0.12, 0.03, 0.34, 0.18, 'candle');
    P3.quad(M, F.P(-0.42, 0.66, -0.34), F.P(0.42, 0.66, -0.34), F.P(0.42, 0.92, -0.03), F.P(-0.42, 0.92, -0.03), [0, 1], [1, 0], 'roof_temple', F.N(0, 0.77, -0.64), c.sky);
    P3.quad(M, F.P(0.42, 0.66, 0.28), F.P(-0.42, 0.66, 0.28), F.P(-0.42, 0.92, -0.03), F.P(0.42, 0.92, -0.03), [0, 1], [1, 0], 'roof_temple', F.N(0, 0.77, 0.64), c.sky);
    for (const lx of [-0.32, 0.32]) P3.tri(M, F.P(lx, 0.66, -0.26), F.P(lx, 0.66, 0.2), F.P(lx, 0.9, -0.03), [0, 1], [1, 1], [0.5, 0], 'arch', F.N(Math.sign(lx), 0, 0), c.sky);
  };
  MODELS.BARREL = (M, F, c) => {
    prism(M, F, 0.22, 0, 0.56, 'barrel', c.sky, 'wood:d', 10);
  };
  MODELS.CRATE = (M, F, c) => {
    const B = c.box;
    B(-0.27, 0, -0.27, 0.27, 0.54, 0.27, 'crate');
    if (c.r(7) < 0.45) B(-0.2, 0.54, -0.18, 0.16, 0.86, 0.18, 'crate');
  };
  MODELS.STALL = (M, F, c) => {
    const B = c.box, P3 = Gfx.P3, col = CL_COL[Math.floor(c.r(8) * 4)];
    B(-0.48, 0, -0.22, 0.48, 0.48, 0.2, 'planks'); B(-0.5, 0.48, -0.26, 0.5, 0.53, 0.26, 'wood:l');
    for (const lx of [-0.46, 0.46]) { B(lx - 0.03, 0, -0.26, lx + 0.03, 1.32, -0.2, 'beam'); B(lx - 0.03, 0, 0.2, lx + 0.03, 1.08, 0.26, 'beam'); }
    P3.quad(M, F.P(-0.56, 1.06, 0.5), F.P(0.56, 1.06, 0.5), F.P(0.56, 1.36, -0.3), F.P(-0.56, 1.36, -0.3), [0, 1], [3, 0], 'awning:' + col, F.N(0, 0.94, 0.35), c.sky);
    P3.quad(M, F.P(0.56, 1.06, 0.5), F.P(-0.56, 1.06, 0.5), F.P(-0.56, 1.36, -0.3), F.P(0.56, 1.36, -0.3), [0, 1], [3, 0], 'awning:' + col, F.N(0, -0.94, -0.35), c.sky * 0.6);
    P3.quad(M, F.P(-0.56, 0.96, 0.5), F.P(0.56, 0.96, 0.5), F.P(0.56, 1.06, 0.5), F.P(-0.56, 1.06, 0.5), [0, 1], [3, 0.8], 'awning:' + col, F.N(0, 0, 1), c.sky);
    // товар
    const goods = [['pot', 0.08], ['straw', 0.06], ['cloth:' + CL_COL[Math.floor(c.r(9) * 6)], 0.04], ['glass:' + 'gbrpy'[Math.floor(c.r(10) * 5)], 0.1], ['mug', 0.09]];
    for (let i = 0; i < 4; i++) { const g = goods[Math.floor(c.r(11 + i) * goods.length)], x = -0.36 + i * 0.24; B(x - 0.08, 0.53, -0.12, x + 0.08, 0.53 + g[1], 0.08, g[0]); }
  };
  MODELS.HAY = (M, F, c) => {
    const B = c.box;
    B(-0.4, 0, -0.32, 0.4, 0.42, 0.32, 'hay'); B(-0.34, 0.42, -0.26, 0.34, 0.54, 0.26, 'hay');
  };
  MODELS.LAMPPOST = (M, F, c) => {
    const B = c.box;
    B(-0.12, 0, -0.12, 0.12, 0.08, 0.12, 'arch');
    B(-0.035, 0.08, -0.035, 0.035, 1.3, 0.035, 'iron');
    B(-0.1, 1.3, -0.1, 0.1, 1.5, 0.1, 'lantern');
    B(-0.13, 1.5, -0.13, 0.13, 1.55, 0.13, 'iron');
  };
  MODELS.BOAT = (M, F, c) => {
    const P3 = Gfx.P3, B = c.box, y0 = -0.02, y1 = 0.22, L = 0.48, W = 0.24;
    // корпус: борта сходятся к носу и корме
    const side = (s) => { P3.quad(M, F.P(s * W, y1, -L * 0.6), F.P(s * W, y1, L * 0.6), F.P(s * W * 0.55, y0, L * 0.55), F.P(s * W * 0.55, y0, -L * 0.55), [0, 0], [1, 0.3], 'wood', F.N(s * 0.85, -0.3, 0), c.sky); };
    side(-1); side(1);
    for (const e of [-1, 1]) { P3.tri(M, F.P(-W, y1, e * L * 0.6), F.P(W, y1, e * L * 0.6), F.P(0, y1 + 0.04, e * L), [0, 0], [1, 0], [0.5, 0.3], 'wood', F.N(0, 0.2, e), c.sky); P3.tri(M, F.P(-W * 0.55, y0, e * L * 0.55), F.P(W * 0.55, y0, e * L * 0.55), F.P(0, y1 + 0.04, e * L), [0, 0.3], [1, 0.3], [0.5, 0], 'wood:d', F.N(0, -0.4, e), c.sky); }
    P3.quad(M, F.P(-W * 0.55, y0 + 0.06, -L * 0.55), F.P(W * 0.55, y0 + 0.06, -L * 0.55), F.P(W * 0.55, y0 + 0.06, L * 0.55), F.P(-W * 0.55, y0 + 0.06, L * 0.55), [0, 0], [1, 1], 'planks', F.N(0, 1, 0), c.sky * 0.7);
    B(-W * 0.9, y1 - 0.06, -0.06, W * 0.9, y1 - 0.02, 0.06, 'wood:d');
    B(-0.02, y1 - 0.02, 0.1, 0.02, y1 + 0.02, 0.62, 'wood:l');   // весло
  };
  MODELS.CART = (M, F, c) => {
    const B = c.box;
    B(-0.28, 0.24, -0.46, 0.28, 0.3, 0.42, 'planks');
    B(-0.3, 0.3, -0.46, -0.26, 0.5, 0.42, 'wood:d'); B(0.26, 0.3, -0.46, 0.3, 0.5, 0.42, 'wood:d'); B(-0.3, 0.3, -0.48, 0.3, 0.5, -0.44, 'wood:d');
    wheel(M, F, -0.34, 0.2, 0.0, 0.2, 0.03, c.sky); wheel(M, F, 0.34, 0.2, 0.0, 0.2, 0.03, c.sky);
    B(-0.2, 0.22, 0.42, -0.16, 0.26, 0.9, 'wood:d'); B(0.16, 0.22, 0.42, 0.2, 0.26, 0.9, 'wood:d');
    B(-0.24, 0.3, -0.4, 0.24, 0.48, 0.32, c.r(12) < 0.5 ? 'canvas' : 'hay');
    if (c.r(13) < 0.5) B(-0.18, 0.48, -0.3, 0.08, 0.66, -0.06, 'barrel');
  };
  MODELS.RACK = (M, F, c) => {
    const B = c.box;
    B(-0.44, 0, -0.08, 0.44, 0.06, 0.08, 'wood:d');
    for (const lx of [-0.42, 0.42]) B(lx - 0.03, 0, -0.03, lx + 0.03, 1.0, 0.03, 'wood:d');
    B(-0.42, 0.86, -0.03, 0.42, 0.9, 0.03, 'wood:d');
    for (let i = 0; i < 4; i++) { const x = -0.27 + i * 0.18; if (i % 2) { B(x - 0.015, 0.06, -0.01, x + 0.015, 0.4, 0.01, 'wood:d'); B(x - 0.03, 0.4, -0.012, x + 0.03, 1.02, 0.012, 'iron'); } else { B(x - 0.015, 0.06, -0.01, x + 0.015, 0.95, 0.01, 'wood'); B(x - 0.05, 0.86, -0.012, x + 0.05, 1.0, 0.012, 'iron'); } }
  };
  MODELS.WORKBENCH = (M, F, c) => {
    const B = c.box;
    B(-0.47, 0.42, -0.36, 0.47, 0.5, 0.36, 'wood');
    for (const [lx, lz] of [[-0.42, -0.3], [0.42, -0.3], [-0.42, 0.3], [0.42, 0.3]]) B(lx - 0.045, 0, lz - 0.045, lx + 0.045, 0.42, lz + 0.045, 'wood:d');
    B(-0.42, 0.12, -0.3, 0.42, 0.16, 0.3, 'planks');
    B(-0.4, 0.5, 0.18, -0.2, 0.62, 0.32, 'iron');                 // тиски
    B(-0.05, 0.5, -0.05, 0.25, 0.53, 0.02, 'wood:d'); B(0.2, 0.5, -0.07, 0.3, 0.55, 0.04, 'iron'); // молоток
    B(0.1, 0.5, 0.12, 0.4, 0.52, 0.18, 'iron');                   // пила
    B(-0.3, 0.16, -0.2, -0.05, 0.3, 0.1, 'crate');
  };
  MODELS.RUG = (M, F, c) => {
    const P3 = Gfx.P3, col = CL_COL[Math.floor(c.r(14) * 3)];
    P3.quad(M, F.P(-0.46, 0.012, 0.42), F.P(0.46, 0.012, 0.42), F.P(0.46, 0.012, -0.42), F.P(-0.46, 0.012, -0.42), [0, 1], [1.5, 0], 'quilt:' + col, F.N(0, 1, 0), c.sky);
  };

  // ---------- сборка ----------
  FU.build = function (M, cd, ctx) {
    const m = cd.m, W = m.w, H = m.h, P3 = Gfx.P3, PR = UI.V3props;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, tid = m.tiles[i];
      if (!SET.has(tid)) continue;
      if (ctx.dungeon && !m.ex[i] && !(G.map === m && G.vis[i])) continue;
      const key = TL[tid].key;
      const indoor = !!(TL[tid].indoor || ctx.insideRoof[i]);
      const sky = ctx.dungeon ? 0 : indoor ? 0.6 : 1;
      // куда смотрит
      let dir;
      if (key === 'CHAIR' || key === 'BENCH') dir = toward(m, x, y, [T.TABLE, T.COUNTER]) || awayFromWall(m, x, y);
      else if (key === 'TABLE' || key === 'RUG' || key === 'BARREL' || key === 'WELL' || key === 'PILLAR' || key === 'LAMPPOST') dir = [0, 1];
      else if (key === 'COUNTER' || key === 'STALL') {
        // прилавок стоит рядом с такими же — вдоль ряда; лицом — к проходу
        const row = toward(m, x, y, [tid]);
        dir = row ? (walkAt(m, x - row[1], y + row[0]) ? [-row[1], row[0]] : [row[1], -row[0]]) : awayFromWall(m, x, y);
      } else if (key === 'BOAT') { const d = toward(m, x, y, [T.DOCK]); dir = d ? [d[1], -d[0]] : [0, 1]; }
      else if (key === 'GRAVE') dir = [0, 1];
      else dir = awayFromWall(m, x, y);
      // высота пола: у лодки — вода
      const hb = cd.h[i];
      // кровать вдоль стены: изголовье — к стене
      if (key === 'BED') { const back = D4.find(([dx, dy]) => blockAt(m, x - dx, y - dy) && !blockAt(m, x + dx, y + dy)); if (back) dir = back; }
      const F = PR.frame(x, y, hb, dir);
      const r = (k) => hsh(x + cd.ox, y + cd.oz, k);
      const c = {
        sky, indoor, r, ceil: WALL,
        box: (x0, y0, z0, x1, y1, z1, tex) => PR.box(M, F, x0, y0, z0, x1, y1, z1, tex, sky),
        light: (lx, ly, lz, col, rr, inten) => { const p = F.P(lx, ly, lz); ctx.lights.push({ x: p[0], y: p[1], z: p[2], r: rr, col, i: inten, fl: 1 }); },
      };
      const fn = MODELS[key];
      if (fn) fn(M, F, c);
    }
    // причалы: сваи в воду и брус по краю
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (m.tiles[i] !== T.DOCK) continue;
      const hb = cd.h[i], F = PR.frame(x, y, hb, [0, 1]);
      for (const [dx, dy] of D4) {
        const a = x + dx, b = y + dy;
        if (a < 0 || b < 0 || a >= W || b >= H) continue;
        if (!TL[m.tiles[b * W + a]].water) continue;
        // брус по краю и две сваи
        const ex = dx * 0.48, ez = dy * 0.48, px = dy !== 0 ? 0.45 : 0.04, pz = dx !== 0 ? 0.45 : 0.04;
        PR.box(M, F, ex - px, -0.14, ez - pz, ex + px, 0.02, ez + pz, 'beam', 1);
        for (const s of [-1, 1]) { const sx = dy !== 0 ? s * 0.4 : ex, sz = dx !== 0 ? s * 0.4 : ez; PR.box(M, F, sx - 0.05, -1.0, sz - 0.05, sx + 0.05, 0.12, sz + 0.05, 'beam', 1); }
      }
    }
  };
})(window.EOF);
