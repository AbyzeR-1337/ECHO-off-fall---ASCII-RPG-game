'use strict';
// Новые места на земле мира. Каждое строится в своей земле при постройке карты (по зерну мира — всегда одинаково):
//   каменный круг — стоячие камни и рунный камень в середине (зачарование; в северное сияние — Нить Сияния);
//   обсерватория — развалины со звездочётной трубой (ночью открывает дальние земли; один раз — Труба Звездочёта);
//   ведьмина хижина — ведьма с зельями и куколкой-оберегом;
//   поле древней битвы — кости, ржавые клинки, курган вождя (лопатой — Рог Древней Битвы), ночью неспокойно;
//   святой источник — лечит, снимает яд и мор, наполняет бутылки святой водой; за монету — Фляга Источника;
//   гнездо грифонов — в горах: грифоны стерегут гнездо, в гнезде — перья и Перо Вожака;
//   ремесленный двор — в сёлах и городах: ткацкий станок, коптильня, в городах — ювелирный стол.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, UI = E.UI, Items = E.Items, Ent = E.Ent;
  const MGen = E.MapGen;
  const PL = E.Places = {};
  const KINDS = {
    circle: { n: 'Круг стоячих камней', bi: ['plains', 'tundra', 'forest', 'coast', 'ancient', 'hill'], p: 7, w: 4, h: 4, msg: 'Впереди — круг стоячих камней. В середине камень с рунами светится сам по себе.' },
    observatory: { n: 'Старая обсерватория', bi: ['mountain', 'plains', 'tundra', 'desert', 'coast'], p: 6, w: 4, h: 4, wild: 1, msg: 'Над холмом — развалины обсерватории. Труба звездочёта ещё смотрит в небо.' },
    witchhut: { n: 'Ведьмина хижина', bi: ['swamp', 'forest', 'ancient'], p: 12, w: 4, h: 4, wild: 1, msg: 'Из-за деревьев тянет дымом и травами. Там — хижина на отшибе.' },
    battlefield: { n: 'Поле древней битвы', bi: ['plains', 'ash', 'tundra', 'desert'], p: 9, w: 7, h: 5, wild: 1, msg: 'Земля здесь усыпана костями и ржавым железом. Когда-то здесь была битва.' },
    spring: { n: 'Святой источник', bi: ['forest', 'plains', 'ancient', 'mountain', 'tundra'], p: 5, w: 3, h: 3, msg: 'Где-то рядом журчит вода — чистая, как в храме.' },
    nest: { n: 'Гнездо грифонов', bi: ['mountain'], p: 36, w: 3, h: 3, wild: 1, msg: 'Над скалами кружат огромные крылатые тени. Где-то здесь — гнездо грифонов.' },
  };
  PL.KINDS = KINDS;
  const h100 = (g, k) => (U.hash(G.W.seed, g.id, k) >>> 0) % 100;
  // какие места в земле
  PL.of = function (g) {
    if (!g || g.biome === 'ocean' || g.exist !== 'always' || !G.W) return [];
    const out = [];
    let i = 0;
    for (const k in KINDS) { i++; const d = KINDS[k]; if (d.wild && g.settlement >= 0) continue; if (d.bi.includes(g.biome) && h100(g, 7100 + i) < d.p && g.id !== G.W.start) out.push(k); }
    return out.slice(0, 2);
  };
  // ---------- постройка ----------
  // что можно расчистить под место: деревья, кусты, камни, грибы
  const CLEAR = new Set(['TREE', 'PINE', 'DEADTREE', 'BUSH', 'BOULDER', 'REEDS', 'FERN', 'SAPLING', 'MUSHROOM', 'CACTUS', 'TALLGRASS', 'FLOWERS', 'STONES'].map((k) => T[k]).filter((v) => v != null));
  function freeArea(m, r, w, h, avoid) {
    const W = m.w, H = m.h;
    const ok = (x, y) => {
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return false;
      const i = y * W + x, t = TL[m.tiles[i]];
      if (!t || m.feat[i] || m.chests[i] || m.items.some((o) => o.x === x && o.y === y)) return false;
      if (CLEAR.has(m.tiles[i])) return true;
      if (!t.walk || t.indoor || t.water || t.link) return false;
      if ([T.ROAD, T.BRIDGE, T.DOOR, T.GATE, T.FIELD, T.COBBLE].includes(m.tiles[i])) return false;
      if (m.reserve && m.reserve[i]) return false;
      return true;
    };
    for (let k = 0; k < 500; k++) {
      const cx = r.int(w + 2, W - w - 3), cy = r.int(h + 2, H - h - 3);
      if (avoid && avoid.some((a) => Math.abs(a.x - cx) < 12 && Math.abs(a.y - cy) < 8)) continue;
      let good = true;
      for (let y = cy - h; y <= cy + h && good; y++) for (let x = cx - w; x <= cx + w; x++) if (!ok(x, y)) { good = false; break; }
      if (good) return { x: cx, y: cy };
    }
    return null;
  }
  const set = (m, x, y, t) => { m.tiles[y * m.w + x] = t; };
  const feat = (m, x, y, f) => { m.feat[y * m.w + x] = f; };
  // земля под местом: самая частая проходимая клетка вокруг
  function groundOf(m, x, y, w, h) {
    const cnt = new Map();
    for (let yy = y - h; yy <= y + h; yy++) for (let xx = x - w; xx <= x + w; xx++) { const t = m.tiles[yy * m.w + xx], tl = TL[t]; if (tl && tl.walk && !tl.water && !tl.indoor && !CLEAR.has(t) && ![T.ROAD, T.FIELD].includes(t)) cnt.set(t, (cnt.get(t) || 0) + 1); }
    let best = T.GRASS, bn = 0; for (const [t, n] of cnt) if (n > bn) { bn = n; best = t; }
    return best;
  }
  function build(m, kind, p, r) {
    const { x, y } = p, d = KINDS[kind];
    // расчистить: деревья и кусты уходят, земля — как вокруг
    const gnd = groundOf(m, x, y, d.w, d.h);
    for (let yy = y - d.h; yy <= y + d.h; yy++) for (let xx = x - d.w; xx <= x + d.w; xx++) if (CLEAR.has(m.tiles[yy * m.w + xx])) m.tiles[yy * m.w + xx] = gnd;
    if (kind === 'circle') {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.hypot(dx / 1.4, dy) <= 2.1) set(m, x + dx, y + dy, T.GRASS);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, mx = Math.round(x + Math.cos(a) * 3.4), my = Math.round(y + Math.sin(a) * 2.6); set(m, mx, my, T.MENHIR); }
      set(m, x, y, T.RUNESTONE); feat(m, x, y, { k: 'place', kind });
    } else if (kind === 'observatory') {
      // развалины: стены с проломами, дверь на юг; внутри — труба и стол со свитками
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const edge = Math.abs(dx) === 2 || Math.abs(dy) === 2;
        set(m, x + dx, y + dy, edge ? ((dx * 7 + dy * 3 + 99) % 4 === 0 ? T.RUBBLE : T.WALL) : T.STONEFLOOR);
      }
      set(m, x, y + 2, T.STONEFLOOR); set(m, x, y + 3, T.STONEFLOOR);
      set(m, x, y - 1, T.TELESCOPE); feat(m, x, y - 1, { k: 'place', kind });
      set(m, x - 1, y + 1, T.TABLE);
    } else if (kind === 'witchhut') {
      for (let dy = -2; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) set(m, x + dx, y + dy, Math.abs(dx) === 2 || dy === -2 || dy === 1 ? T.WALL : T.FLOOR);
      set(m, x, y + 1, T.DOOR);
      set(m, x - 1, y - 1, T.ALCHTABLE); set(m, x + 1, y - 1, T.HEARTH);
      set(m, x + 2, y + 2, T.HERB != null ? T.HERB : T.FLOWERS); set(m, x - 2, y + 2, T.MUSHROOM != null ? T.MUSHROOM : T.FLOWERS);
      (m.blds = m.blds || []).push({ type: 'home', rect: { x: x - 2, y: y - 2, w: 5, h: 4 } });
      feat(m, x, y, { k: 'place', kind, spot: 1 });
    } else if (kind === 'battlefield') {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -6; dx <= 6; dx++) {
        const q = (U.hash(x + dx, y + dy, 31) >>> 0) % 100;
        if (Math.hypot(dx / 1.5, dy) > 4.4) continue;
        if (q < 18) set(m, x + dx, y + dy, T.BONES);
        else if (q < 22) set(m, x + dx, y + dy, T.RUBBLE);
      }
      for (const [dx, dy] of [[-4, -2], [3, -3], [-2, 3], [5, 2], [1, -1]]) { set(m, x + dx, y + dy, T.GRAVE); feat(m, x + dx, y + dy, { k: 'grave', text: 'Здесь лежит тот, кто не дожил до конца битвы.', epit: 1 }); }
      set(m, x, y, T.GRAVE); feat(m, x, y, { k: 'place', kind, grave: 1 });
      for (let k = 0; k < 4; k++) { const px = x + r.int(-5, 5), py = y + r.int(-3, 3); if (TL[m.tiles[py * m.w + px]].walk) { const it = Items.make(r.pick(['sword', 'spear', 'axe', 'shield', 'helm', 'dagger'].filter((b) => D.items[b]))); if (it.mw) it.wr = Math.round(it.mw * 0.15); m.items.push({ x: px, y: py, it }); } }
    } else if (kind === 'spring') {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.hypot(dx, dy) <= 2.3) set(m, x + dx, y + dy, Math.hypot(dx, dy) <= 1.2 ? T.STONEFLOOR : T.FLOWERS);
      set(m, x, y, T.SPRING); feat(m, x, y, { k: 'place', kind });
    } else if (kind === 'nest') {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(m, x + dx, y + dy, T.ROCKFLOOR != null ? T.ROCKFLOOR : T.STONES);
      set(m, x, y, T.NEST); feat(m, x, y, { k: 'place', kind });
      for (let k = 0; k < 3; k++) m.items.push({ x: x + r.int(-2, 2), y: y + 2, it: Items.make('feather') });
    }
  }
  // ремесленный двор у посёлка: станки под навесом
  function yard(m, r) {
    if (m.sett == null || m.sett < 0) return null;
    const s = G.W.settlements[m.sett];
    if (!s || ['sea', 'vanish', 'farm'].includes(s.type)) return null;
    const big = ['town', 'capital'].includes(s.type);
    const W = m.w, c = m.settCenter || { x: W >> 1, y: m.h >> 1 };
    const ok = (x, y) => { if (x < 2 || y < 2 || x >= W - 2 || y >= m.h - 2) return false; const i = y * W + x, t = TL[m.tiles[i]]; return t && t.walk && !t.indoor && !t.water && !t.link && !m.feat[i] && !m.chests[i] && ![T.ROAD, T.BRIDGE, T.DOOR, T.GATE, T.FIELD].includes(m.tiles[i]); };
    for (let k = 0; k < 1500; k++) {
      const a = r.next() * Math.PI * 2, d = 4 + r.next() * 30 * Math.min(1, 0.3 + k / 400);
      const x = Math.round(c.x + Math.cos(a) * d), y = Math.round(c.y + Math.sin(a) * d * 0.6);
      // площадка 5×3: станки в середине, вокруг — проход
      let good = true;
      for (let dy = -1; dy <= 1 && good; dy++) for (let dx = -2; dx <= 2; dx++) if (!ok(x + dx, y + dy)) { good = false; break; }
      if (!good) continue;
      set(m, x - 1, y, T.LOOM); set(m, x + 1, y, T.SMOKER);
      set(m, x, y, big ? T.JEWELER : r.chance(0.5) ? T.WORKBENCH : T.STONEFLOOR);
      for (const dx of [-2, 2]) set(m, x + dx, y, T.STONEFLOOR);
      return { x, y, big };
    }
    return null;
  }
  if (MGen && MGen.build) {
    const b0 = MGen.build;
    MGen.build = function (key) {
      const m = b0.apply(this, arguments);
      try {
        if (G.W && m && m.kind === 'over' && m.region && !(MGen.parseKey(key) || {}).v) {
          const r = U.rng(G.W.seed, m.key, 'places');
          m.places = [];
          const avoid = [];
          if (m.tower) avoid.push(m.tower);
          if (m.settCenter && m.sett >= 0) avoid.push(m.settCenter);
          for (const kind of PL.of(m.region)) {
            const d = KINDS[kind], p = freeArea(m, r, d.w, d.h, avoid);
            if (!p) continue;
            build(m, kind, p, r);
            m.places.push({ kind, x: p.x, y: p.y });
            avoid.push(p);
          }
          const y = yard(m, r);
          if (y) m.yard = y;
        }
      } catch (e) { console.warn('places', e); }
      return m;
    };
  }
  // ---------- жители мест и первое знакомство ----------
  const lm0 = Gm.loadMap;
  Gm.loadMap = function () {
    const r = lm0.apply(this, arguments);
    try {
      const m = G.map, P = G.P;
      if (m && m.places && m.places.length) {
        P.seenPlaces = P.seenPlaces || {};
        for (const pl of m.places) {
          const k = m.key + ':' + pl.kind;
          if (!P.seenPlaces[k]) { P.seenPlaces[k] = G.S.time; Gm.msg(KINDS[pl.kind].msg, '#d8c8a0'); Gm.cnt('places_found'); Gm.xp(10); }
          if (pl.kind === 'witchhut' && !m.ents.some((e) => e.custom === 'witch')) {
            const e = Ent.npc(G.W.special.ferryman, pl.x, pl.y);
            Object.assign(e, { npc: null, n: 'Ведьма с болот', c: '#8aa070', art: 'npc_healer', ai: 'still', immortal: 1, kind: 'npc', custom: 'witch', ghost: 0, ghostShop: 'witch' + m.key, shopKind: 'witch', g: 'f' });
            Gm.addEnt(e);
          }
          if (pl.kind === 'nest') {
            const st = PL.st(m, pl);
            if (!st.cleared && !m.ents.some((e) => e.tpl === 'griffin')) for (let i = 0; i < 2; i++) { const p = Ent.freeNear(pl.x + 3 - i * 6, pl.y + 1); if (p) Gm.spawnMon('griffin', p.x, p.y, Math.max(5, (m.spawn && m.spawn.danger) || 5)); }
          }
          if (pl.kind === 'battlefield' && Gm.night() && Math.random() < 0.6) { const p = Ent.freeNear(pl.x + 3, pl.y - 2); if (p) Gm.spawnMon(Math.random() < 0.5 ? 'wraith' : 'gravehound', p.x, p.y); }
        }
      }
    } catch (e) { console.warn('places enter', e); }
    return r;
  };
  PL.st = (m, pl) => { G.S.places = G.S.places || {}; const k = m.key + ':' + pl.kind; return (G.S.places[k] = G.S.places[k] || {}); };
  const plAt = (m, x, y) => (m.places || []).find((p) => Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1);
  // ---------- что делать в местах ----------
  const ia0 = Gm.interactAt;
  Gm.interactAt = function (x, y) {
    const m = G.map, P = G.P, i = y * m.w + x, t = m.tiles[i], f = m.feat[i];
    const pl = f && f.k === 'place' ? (m.places || []).find((p) => p.kind === f.kind) : null;
    if (pl) {
      const st = PL.st(m, pl);
      if (f.kind === 'circle') {
        if (Gm.event('aurora') && Gm.night() && !G.S.taken.a_aurora) { G.S.taken.a_aurora = 1; Gm.give('a_aurora'); Gm.popup('Камни поют', 'Сияние стекает с неба по рунам камня, и в твою ладонь ложится тонкая нить света.\n\nТы получаешь: Нить Северного Сияния.'); Gm.xp(60); Gm.endTurn(3); return true; }
        if (Gm.fullMoon && Gm.fullMoon() && Gm.night() && st.moon !== Math.floor(G.S.time / 1440)) { st.moon = Math.floor(G.S.time / 1440); Gm.fx('moon', 600); Gm.msg('В полнолуние камни гудят. Лунный свет ложится на плечи.', '#d0d8ff'); Gm.cnt('fullmoons'); }
        UI.craftAt('RUNESTONE'); return true;
      }
      if (f.kind === 'observatory') {
        if (!Gm.night()) { Gm.msg('Днём в трубу видно только облака. Приходи ночью.'); return true; }
        const kn = P.known; kn.seen = kn.seen || {}; let n = 0;
        for (const g of G.W.regions) { const d = Math.abs(g.x - m.region.x) + Math.abs(g.y - m.region.y); if (d <= 6 && !kn.regions[g.id] && !kn.seen[g.id]) { kn.seen[g.id] = G.S.time; n++; } }
        Gm.msg(n ? 'Ты смотришь в трубу. Дальние земли ложатся на карту: ' + n + '.' : 'Звёзды на месте. Всё, что видно, ты уже знаешь.', '#d0e0f0');
        if (!st.read) { st.read = 1; Gm.xp(30); Gm.cnt('books'); Gm.gain('read'); Gm.msg('На столе — записи звездочёта. Ты читаешь их до рассвета.', '#c8c0e0'); }
        if (!G.S.taken.a_spyglass && (Gm.event('starfall') || Gm.event('comet') || Math.random() < 0.15)) { G.S.taken.a_spyglass = 1; Gm.give('a_spyglass'); Gm.msg('Под столом — футляр. В нём складная труба звездочёта.', '#f0e0a0'); }
        Gm.endTurn(6); return true;
      }
      if (f.kind === 'battlefield' && f.grave) {
        if (!Gm.toolEq('dig')) { Gm.msg('Курган вождя. Без лопаты не раскопать.'); return true; }
        if (st.dug) { Gm.msg('Курган разрыт. Вождь спит без рога.'); return true; }
        st.dug = 1; Gm.cnt('graves'); Gm.gain('dig');
        if (!G.S.taken.a_battlehorn) { G.S.taken.a_battlehorn = 1; Gm.give('a_battlehorn'); Gm.popup('Курган вождя', 'Под камнями — кости в истлевших латах и рог, перевязанный медью. Когда ты берёшь его, где-то далеко бьют в щиты.\n\nТы получаешь: Рог Древней Битвы.'); }
        else { Gm.give('bone', 3); Gm.msg('Только кости и ржавчина.'); }
        for (let k = 0; k < 2; k++) { const p = Ent.freeNear(x + 2, y + k); if (p) Gm.spawnMon('wraith', p.x, p.y); }
        Gm.endTurn(20); return true;
      }
      if (f.kind === 'spring') {
        const opts = [
          { t: 'Напиться', f: () => { Gm.healPlayer(P.mhp, false); P.thirst = 0; for (const id of ['poison', 'plague', 'bleed']) if (Gm.hasFx(id)) Gm.rmFx(id); Gm.msg('Вода ледяная и сладкая. Раны затягиваются, хворь уходит.', '#a0e0ff'); Gm.cnt('spring_drinks'); Gm.endTurn(2); } },
        ];
        if (Gm.has('empty_bottle')) opts.push({ t: 'Набрать святой воды в бутылку', f: () => { Gm.take('empty_bottle', 1); Gm.give('holy_water'); Gm.msg('Вода в бутылке чуть звенит.', '#a0e0ff'); Gm.endTurn(1); } });
        if (!G.S.taken.a_springflask) opts.push({ t: 'Бросить в источник монету (10)', f: () => { if (P.gold < 10) { Gm.msg('Монет не хватает.'); return; } P.gold -= 10; G.S.taken.a_springflask = 1; Gm.give('a_springflask'); Gm.popup('Источник', 'Монета уходит на дно и не звенит. А у самого камня из воды поднимается старая фляга — полная.\n\nТы получаешь: Флягу Святого Источника.'); } });
        UI.list({ title: 'Святой источник', items: opts.map((o) => ({ t: o.t, f: () => { o.f(); return null; } })) });
        return true;
      }
      if (f.kind === 'nest') {
        if (m.ents.some((e) => e.tpl === 'griffin' && !e.dead)) { Gm.msg('Грифоны кружат над гнездом и кричат. Сначала придётся с ними разобраться.', '#e0c080'); return true; }
        if (st.cleared) { Gm.msg('Пустое гнездо. Только пух на камнях.'); return true; }
        st.cleared = 1;
        Gm.give('griffin_feather', 3);
        if (!G.S.taken.a_griffinplume) { G.S.taken.a_griffinplume = 1; Gm.give('a_griffinplume'); Gm.popup('Гнездо грифонов', 'В гнезде — перья, кости добычи и одно перо длиннее твоей руки. Перо вожака.\n\nТы получаешь: Перо Вожака Грифонов и три пера грифона.'); }
        else Gm.msg('В гнезде — три пера грифона.', '#e0d090');
        Gm.xp(40); Gm.endTurn(4); return true;
      }
      if (f.kind === 'witchhut') { /* сама ведьма — в доме */ }
    }
    return ia0.apply(this, arguments);
  };
  const pu0 = Gm.plainUse;
  if (pu0) Gm.plainUse = function (x, y) { const m = G.map, f = m.feat[y * m.w + x]; if (f && f.k === 'place' && !f.spot) return true; return pu0.apply(this, arguments); };
  // ведьма: зелья, куколка, гадание
  const op0 = E.Dlg.options;
  E.Dlg.options = function (e) {
    if (!e || e.custom !== 'witch') return op0.apply(this, arguments);
    const P = G.P, o = [];
    o.push({ t: 'Посмотреть, что она варит', f: () => UI.trade(e, 'witch') });
    if (!G.S.taken.a_hexdoll) o.push({ t: 'Попросить оберег (3 корня мандрагоры)', f: () => {
      if (Gm.count('h_mandrake') < 3) return 'Три корня мандрагоры, милок. Не меньше. Они кричат, когда их рвёшь — терпи.';
      Gm.take('h_mandrake', 3); G.S.taken.a_hexdoll = 1; Gm.give('a_hexdoll');
      return 'Держи куколку. Носи у сердца — половину беды она заберёт себе. Только не давай ей имени.';
    } });
    o.push({ t: 'Погадать (5 монет)', f: () => {
      if (P.gold < 5) return 'Без монеты судьба молчит.';
      P.gold -= 5;
      const near = Gm.nearPaths ? Gm.nearPaths() : [];
      if (near.length) { const id = near[Math.floor(Math.random() * near.length)], c = D.classes[id]; P.omens = P.omens || {}; P.omens[id] = P.omens[id] || { t: G.S.time, where: 'ведьма' }; const h = Gm.pathHint ? Gm.pathHint(id) : null; return 'Вижу... «' + c.d + '» Это твой путь, если не свернёшь.' + (h ? ' Тебе надо ' + h + '.' : ''); }
      return ['Вижу дорогу. Длинную. И в конце — свет. Или костёр. Плохо видно.', 'Вижу человека, который тебя ждёт. Он ещё не знает, что ждёт.', 'Вижу — ты споткнёшься. Но не упадёшь.'][Math.floor(Math.random() * 3)];
    } });
    o.push({ t: 'Уйти', f: () => 'close' });
    return o;
  };
})(window.EOF);
