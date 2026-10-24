'use strict';
// Действия игрока: движение, взаимодействие, предметы, ремёсла, отдых, смерть.
(function (E) {
  const U = E.U, D = E.D, T = E.T, TL = E.TL, C = E.C, Time = E.Time;
  const G = E.G, Gm = E.Gm, Ent = E.Ent, MG = E.MapGen, Items = E.Items;
  const MW = C.MW, MH = C.MH, WS = C.WS;
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  Gm.hasBoat = () => !!Gm.has('boat');
  Gm.swim = () => Gm.fxFlag('gills');

  // ---------- движение ----------
  // может ли существо встать на клетку (место игрока при обмене местами)
  Gm.canStand = function (e, x, y) {
    const m = G.map, t = TL[m.tiles[y * m.w + x]], tags = e.tags || [];
    if (!t.walk) return t.water === 2 && (tags.includes('water') || !!e.ghost);
    if (t.fall && !e.ghost && !tags.includes('spirit')) return false;
    if (t.lava && !tags.includes('fire')) return false;
    return true;
  };
  Gm.move = function (dx, dy) {
    const P = G.P, m = G.map;
    if (P.dead || P.ended) return;
    if (Gm.hasFx('webbed') && Math.random() < 0.6) { Gm.msg('Липкие нити держат тебя.'); Gm.endTurn(1); return; }
    if (Gm.hasFx('stun')) { Gm.msg('Голова кружится.'); Gm.endTurn(1); return; }
    const nx = P.x + dx, ny = P.y + dy;
    if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) { Gm.edge(dx, dy); return; }
    const e = Gm.entAt(nx, ny);
    if (e) {
      // шаг ни с кем не заговаривает и мирных не бьёт: разговор — действием, удар по мирному — атакой (F).
      // Союзник, мирный житель и смирный зверь уступают дорогу — вы меняетесь местами.
      const meek = e.kind === 'ally' || (e.kind === 'npc' && !e.hostile && !e.duel) || (e.kind === 'mon' && e.ai === 'passive' && !e.hostileToP);
      if (!meek) {
        E.Combat.playerAttack(e);
        P.stillTurns = 0;
        Gm.endTurn(1);
        return;
      }
      const t0 = TL[m.tiles[ny * m.w + nx]], f0 = m.feat[ny * m.w + nx];
      if (!Gm.canStand(e, P.x, P.y) || !t0.walk || t0.lava || t0.fall || (f0 && f0.k === 'locked')) {
        Gm.msg(e.kind === 'npc' ? 'Дорогу загораживает: ' + E.Dlg.label(e).toLowerCase() + '.' : 'На пути — ' + e.n.toLowerCase() + '.', '#9a9aa8');
        return;
      }
      // дальше — обычный шаг на освободившуюся клетку
      Ent.move(e, P.x, P.y);
    }
    const ti = ny * m.w + nx;
    const t = TL[m.tiles[ti]];
    const f = m.feat[ti];
    if (f && f.k === 'locked') { Gm.msg('Заперто.'); return; }
    if (!t.walk) {
      if (t.water === 2) {
        if (Gm.hasBoat() || Gm.swim() || m.underwater) { /* можно */ }
        else { Gm.msg(m.tiles[ti] === T.BOG ? 'Трясина. Не пройти.' : 'Глубокая вода. Без лодки не переплыть.'); return; }
      } else {
        // в вещь можно только упереться — пользоваться ею можно лишь действием
        if (m.tiles[ti] === T.CRACKWALL && P.eq.trinket && P.eq.trinket.b === 'a_voidlantern') { Gm.msg('В стене — трещина. Сквозь неё тянет холодом.'); }
        return;
      }
    }
    if (t.lava && !Gm.fxFlag('fireImm')) { if (!G.lavaWarn) { G.lavaWarn = 1; Gm.msg('Это лава. Ещё шаг — и...', '#ff8040'); return; } }
    G.lavaWarn = 0;
    P.x = nx; P.y = ny;
    P.stillTurns = 0;
    let cost = t.cost || 1;
    if (t.water === 2 && Gm.hasBoat()) { cost = 1; Gm.cnt('sail'); Gm.gain('sail'); }
    if (m.biome && m.kind === 'over') { Gm.cnt('steps_' + m.biome); Gm.gain('step:' + m.biome); if (m.sett < 0) Gm.gain('step_wild'); }
    Gm.cnt('steps'); Gm.gain('step');
    if (Gm.night()) { Gm.cnt('steps_night'); Gm.gain('step_night'); }
    if (P.eq.head && P.eq.head.b === 'a_rootcrown' && m.tiles[ti] === T.COBBLE) cost *= 2;
    if (t.lava) { Gm.hurtPlayer(Math.round(P.mhp * 0.35), 'lava'); if (P.dead) return; Gm.msg('Лава обжигает ноги!', '#ff6020'); }
    if (t.fall) { Gm.fall(); return; }
    if (f && f.k === 'link') Gm.msg('Здесь: ' + f.name + '. (Действие — пройти)', '#d0c090');
    const its = Gm.itemsAt(nx, ny);
    if (its.length) Gm.msg('Здесь лежит: ' + its.slice(0, 3).map((o) => Items.name(o.it)).join(', ') + (its.length > 3 ? '…' : '') + '.', '#c0c0a0');
    Gm.endTurn(cost);
  };
  // Переход за край карты
  Gm.edge = function (dx, dy) {
    const P = G.P, m = G.map;
    if (m.kind === 'dun' || (m.dim && m.dimGrid === 1) || m.dimName === 'sea') { Gm.msg('Дальше пути нет.'); return; }
    let gx, gy, size;
    if (m.kind === 'over') { gx = m.region.x; gy = m.region.y; size = WS; }
    else { gx = m.gx; gy = m.gy; size = m.dimGrid; }
    const tx = gx + (P.x + dx < 0 ? -1 : P.x + dx >= MW ? 1 : 0), ty = gy + (P.y + dy < 0 ? -1 : P.y + dy >= MH ? 1 : 0);
    if (tx < 0 || ty < 0 || tx >= size || ty >= size) {
      if (m.kind === 'over' && Gm.hasBoat() && TL[m.tiles[P.y * MW + P.x]].water) { Gm.storyHook('edge', {}); if (!G.P.ended) Gm.endTurn(1); return; }
      Gm.msg(m.dimName === 'void' ? 'Дальше — ничего. Даже пустоты.' : m.kind === 'over' ? 'Дальше — только бескрайнее море.' : 'Дальше пути нет.');
      return;
    }
    let nx = P.x + dx, ny = P.y + dy;
    nx = nx < 0 ? MW - 1 : nx >= MW ? 0 : nx;
    ny = ny < 0 ? MH - 1 : ny >= MH ? 0 : ny;
    let key;
    if (m.kind === 'over') {
      const rid = ty * WS + tx;
      const v = E.Sim.variant(rid);
      if (v === null) { Gm.msg('Впереди — стена серого тумана. Дальше пути нет. Пока.', '#a0a0b0'); return; }
      key = 'o:' + tx + ':' + ty + (v ? ':' + v : '');
      P.lastOver = { key: m.key, x: P.x, y: P.y };
    } else key = 'dim:' + m.dimName + ':' + tx + ':' + ty;
    Gm.loadMap(key, nx, ny, 'walk');
    // найти проходимую клетку у края
    const m2 = G.map;
    const ok = (x, y) => { const t = TL[m2.tiles[y * MW + x]]; return (t.walk && !t.fall && !t.lava) || (t.water === 2 && (Gm.hasBoat() || Gm.swim())); };
    if (!ok(G.P.x, G.P.y)) {
      let best = null, bd = 1e9;
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (ok(x, y) && !m2.occ.has(y * MW + x)) { const d = Math.abs(x - nx) * 2 + Math.abs(y - ny) * 2 + (dx ? Math.abs(x - nx) * 3 : Math.abs(y - ny) * 3); if (d < bd) { bd = d; best = { x, y }; } }
      if (best) { G.P.x = best.x; G.P.y = best.y; }
    }
    const occ = Gm.entAt(G.P.x, G.P.y);
    if (occ) { const p = Ent.freeNear(G.P.x, G.P.y); if (p) Ent.move(occ, p.x, p.y); }
    Gm.computeFov();
    Gm.endTurn(1);
  };
  Gm.fall = function () {
    const P = G.P, m = G.map;
    if (m.dimName === 'void') { Gm.msg('Ты падаешь глубже в ничто...', '#8080c0'); Gm.die('void'); return; }
    if (Gm.has('owl_feather') || P.flags.skyfriend) {
      Gm.msg('Ты срываешься вниз — но ветер подхватывает тебя. Ты медленно планируешь сквозь облака.', '#c0e0ff');
      const g = m.region;
      const nb = E.World.nb4(g.x, g.y).map(([x, y]) => G.W.regions[y * WS + x]).filter((r) => r.biome !== 'sky');
      const t = nb.length ? nb[Math.floor(Math.random() * nb.length)] : G.W.regions[G.W.start];
      Gm.loadMap('o:' + t.x + ':' + t.y, -1, -1, 'tp');
      Gm.cnt('falls');
      return;
    }
    Gm.popup('Падение', 'Край острова уходит из-под ног. Облака. Ветер. Потом — ничего. Ни облаков, ни ветра, ни низа.');
    P.ret = { key: m.key, x: MW >> 1, y: MH >> 1 };
    Gm.hurtPlayer(Math.round(P.mhp * 0.2), 'fall');
    if (!P.dead) Gm.teleport('dim:void:1:1', -1, -1);
  };

  // ---------- взаимодействие ----------
  Gm.interact = function () {
    const P = G.P, m = G.map;
    // под ногами
    const here = P.y * m.w + P.x;
    const f = m.feat[here];
    if (f && f.k === 'link') { Gm.useLink(f, P.x, P.y); return; }
    const its = Gm.itemsAt(P.x, P.y);
    if (its.length) { Gm.pickupAll(); return; }
    // рядом: сначала люди и очевидные вещи, потом всё прочее
    for (const c of Gm.useCands()) {
      if (c.e) { E.UI.talk(c.e); return; }
      if (Gm.interactAt(c.x, c.y)) return;
    }
    // вода, деревья, травы
    for (const [dx, dy] of [[0, 0]].concat(U.DIR8)) {
      const x = P.x + dx, y = P.y + dy;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      const t = m.tiles[y * m.w + x];
      if (TL[t].water && Gm.has('rod') && !m.underwater) { Gm.fish(x, y); return; }
      if ([T.FLOWERS, T.BUSH, T.FERN, T.MUSHROOM, T.REEDS, T.TALLGRASS].includes(t) && m.sett < 0) { Gm.gather(x, y); return; }
      if (TL[t].wood && Gm.toolEq('axe')) { Gm.chop(x, y); return; }
    }
    Gm.msg('Здесь нечего делать.', '#808080');
  };
  // Очевидное дело в клетке — то, что видно глазом: дверь вниз, сундук, очаг, алтарь.
  // Тайное, разрушение и ремёсла по наитию (руда, деревья, трещины, останки) не подсказываются.
  const PLAIN_FEAT = { shrine: 1, altar: 1, inscr: 1, grave: 1, throne: 1, lighthouse: 1, archive: 1, forge: 1 };
  const PLAIN_TILE = new Set([T.CAMPFIRE, T.HEARTH, T.WELL, T.ANVIL, T.ALCHTABLE, T.SHELF, T.SIGN]);
  Gm.plainUse = function (x, y) {
    const m = G.map, i = y * m.w + x, t = m.tiles[i], f = m.feat[i];
    if (m.chests[i]) return true;
    if (f && f.k === 'link') return !!TL[t].link;
    if (f && PLAIN_FEAT[f.k]) return true;
    if (f && (f.k === 'corpse' || f.k === 'locked')) return false;
    return PLAIN_TILE.has(t);
  };
  Gm.useCands = function () {
    const P = G.P, m = G.map, first = [], rest = [];
    for (const [dx, dy] of [[0, 0]].concat(U.DIR8)) {
      const x = P.x + dx, y = P.y + dy;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      const i = y * m.w + x;
      const e = Gm.entAt(x, y);
      if (e && e.kind === 'npc' && !e.hostile) { first.push({ x, y, e }); continue; }
      if (m.chests[i] || m.feat[i] || TL[m.tiles[i]].use || TL[m.tiles[i]].ore || TL[m.tiles[i]].crystal) (Gm.plainUse(x, y) ? first : rest).push({ x, y });
    }
    return first.concat(rest);
  };
  // Подсказки «E»: всё очевидное на расстоянии руки; main — то, к чему приведёт нажатие
  Gm.useHints = function () {
    const P = G.P, m = G.map, out = [];
    if (!m || !P || P.dead || P.ended) return out;
    const here = P.y * m.w + P.x, f = m.feat[here];
    if ((f && f.k === 'link' && TL[m.tiles[here]].link) || Gm.itemsAt(P.x, P.y).length) out.push({ x: P.x, y: P.y, main: true });
    else if (f && f.k === 'link') return out;
    const cands = Gm.useCands();
    cands.forEach((c, k) => {
      if (!G.vis[c.y * m.w + c.x] || (c.x === P.x && c.y === P.y)) return;
      if (c.e || Gm.plainUse(c.x, c.y)) out.push({ x: c.x, y: c.y, main: !out.length && k === 0 });
    });
    return out;
  };
  Gm.toolEq = (k) => (G.P.eq.hand && D.items[G.P.eq.hand.b] && D.items[G.P.eq.hand.b].tool === k) || !!G.P.inv.find((i) => D.items[i.b] && D.items[i.b].tool === k && i.b === ({ axe: 'axe', pick: 'pickaxe', dig: 'shovel' }[k]));
  Gm.interactAt = function (x, y) {
    const P = G.P, m = G.map;
    const i = y * m.w + x;
    const t = m.tiles[i];
    const f = m.feat[i];
    if (Gm.storyHook('useTile', { tile: t, x, y, f })) { Gm.endTurn(1); return true; }
    if (m.chests[i]) { Gm.openChest(i, x, y); return true; }
    if (t === T.MINE && f && f.mine != null && Gm.has('powder') && (x !== P.x || y !== P.y)) {
      E.UI.list({ title: 'Вход в шахту', items: [
        { t: 'Спуститься', f: () => { E.UI.pop(); Gm.useLink(f, x, y); return 'keep'; } },
        { t: 'Заложить порох', f: () => { E.UI.pop(); E.UI.confirm('Взорвать вход в шахту?', () => Gm.blowMine(x, y, f)); return 'keep'; } },
      ] });
      return true;
    }
    if (f) {
      switch (f.k) {
        case 'link': Gm.useLink(f, x, y); return true;
        case 'shrine': Gm.shrine(f, x, y); return true;
        case 'altar': E.UI.altar(f, x, y); return true;
        case 'inscr': Gm.readInscr(f); return true;
        case 'grave': Gm.grave(f, x, y); return true;
        case 'throne': Gm.msg(f.void ? 'Трон из ничего. Он пуст.' : f.ruined ? 'Пустой трон в руинах. Никто не сидел на нём сотни лет.' : 'Трон правителя.'); Gm.endTurn(1); return true;
        case 'lighthouse': Gm.msg(G.S.flags.lighthouseLit && G.S.time - G.S.flags.lighthouseLit < 1440 ? 'Маяк горит.' : 'Маяк тёмен.'); return true;
        case 'archive': E.UI.archive(); return true;
        case 'forge': Gm.forge(); return true;
        case 'corpse': { const n = Gm.npc(f.npc); Gm.msg('Останки. Рядом — истлевшая сумка охотника.' + (n ? '' : '')); f.seen = 1; return true; }
        case 'locked':
          if (Gm.has(f.key)) { Gm.msg('Ржавый ключ со скрипом поворачивается.', '#e0c080'); Gm.setFeature(x, y, null); Gm.cnt('secrets'); D.secretFound('vault'); Gm.endTurn(1); }
          else Gm.msg('Заперто.');
          return true;
      }
    }
    if (t === T.CAMPFIRE || t === T.HEARTH) { Gm.cook(); return true; }
    if (t === T.WELL) { E.UI.fillMenu('well'); return true; }
    if (t === T.ANVIL) { Gm.msg('Наковальня. Без мастера толку мало.'); return true; }
    if (t === T.ALCHTABLE) { E.UI.alchemy(); return true; }
    if (t === T.SHELF) { Gm.msg('Книги на полках. Чужие.'); return true; }
    if (t === T.SIGN) { Gm.msg('Буквы стёрлись.'); return true; }
    if (TL[t].ore) { if (Gm.toolEq('pick')) { Gm.mine(x, y); return true; } Gm.msg('Рудная жила. Нужна кирка.'); return true; }
    if (TL[t].crystal) { if (Gm.toolEq('pick')) { Gm.setTile(x, y, T.ROCKFLOOR); Gm.give('crystal', 1); Gm.endTurn(6); return true; } Gm.msg('Кристалл. Без кирки не отколоть.'); return true; }
    return false;
  };
  Gm.useLink = function (f, x, y) {
    const P = G.P, m = G.map;
    const to = f.to;
    if (to === 'up') { const r = P.dunRet; P.dunRet = null; if (r) Gm.loadMap(r.key, r.x, r.y, 'walk'); else Gm.returnFromDim(); Gm.endTurn(1); return; }
    if (to === 'ret') { Gm.returnFromDim(); Gm.endTurn(1); return; }
    if (to === 'wake') { Gm.wake(); return; }
    if (m.kind === 'over' && !to.startsWith('dim:') && !to.startsWith('sea:')) P.dunRet = { key: m.key, x, y };
    if (to.startsWith('sea:')) { P.ret = { key: m.key, x, y }; if (!Gm.fxFlag('gills')) Gm.msg('Вода смыкается над головой. Дышать нечем!', '#80a0ff'); }
    if (to.startsWith('dim:') && m.kind !== 'dim') P.ret = { key: m.key, x, y };
    if (f.mine) { if (G.S.sett[f.mine].mineDead) { Gm.msg('Вход завален.'); return; } }
    const k = MG.parseKey(to);
    if (k && (k.t === 'd' || k.t === 'm')) { Gm.loadMap(to, -1, -1, 'walk'); }
    else Gm.loadMap(to, -1, -1, 'tp');
    Gm.endTurn(1);
  };
  Gm.blowMine = function (x, y, f) {
    Gm.take('powder', 1);
    Gm.setTile(x, y, T.RUBBLE);
    Gm.setFeature(x, y, null);
    G.S.sett[f.mine].mineDead = 1;
    Gm.flash(x, y, 4, 'fire');
    Gm.msg('ГРОХОТ. Вход в шахту обрушивается.', '#ff9040');
    Gm.chron('Кто-то взорвал шахту у ' + G.W.settlements[f.mine].gen + '. Железа больше не будет.', { r: G.map.rid, k: 'econ', seen: 1 });
    Gm.crimeArea('mine');
    Gm.endTurn(2);
  };

  // ---------- предметы на земле и в сундуках ----------
  Gm.pickupAll = function () {
    const P = G.P, m = G.map;
    const its = Gm.itemsAt(P.x, P.y);
    for (const o of its) {
      let it = Items.realize(o.it);
      if (!it) continue;
      // артефакты, что выбирают хозяина
      const ah = E.Arts[it.b];
      if (ah && ah.canPick && !ah.canPick(P, it)) { Gm.msg('Ты протягиваешь руку — и ' + Items.name(it).toLowerCase() + ' ускользает. Будто не хочет.', '#c0a0e0'); if (it.b === 'a_crown') { m.items.splice(m.items.indexOf(o), 1); Gm.relocateCrown(); } continue; }
      m.items.splice(m.items.indexOf(o), 1);
      if (it.uq != null) G.S.taken['uq' + it.uq] = 1;
      Gm.give(it, it.q, false);
      if (it.b === 'bone') { Gm.cnt('bones'); Gm.gain('bone'); }
      if (it.b === 'star_shard') Gm.cnt('star_shards');
      Gm.fire('pickup', { item: it });
      Gm.storyHook('pickup', { item: it });
    }
    Gm.endTurn(1);
  };
  Gm.relocateCrown = function () {
    const l = G.W.regions.filter((g) => g.features.includes('ruins') && g.id !== G.map.rid);
    const g = l[Math.floor(Math.random() * l.length)];
    const o = { k: 'item', b: 'a_crown', chest: 1 };
    E.World.place(G.W, g.id, o);
    (G.S.extraPl = G.S.extraPl || []).push({ r: g.id, o });
    G.cache.delete('o:' + g.x + ':' + g.y);
    // если карту уже видели — положить корону в её сундук
    const dyn = G.S.maps['o:' + g.x + ':' + g.y];
    if (dyn) { const ks = Object.keys(dyn.ch); if (ks.length) dyn.ch[ks[0]].items.push({ b: 'a_crown' }); }
  };
  Gm.openChest = function (i, x, y) {
    const m = G.map, P = G.P;
    const c = m.chests[i];
    if (c.mimic && !c.opened) {
      c.mimic = 0;
      Gm.setTile(x, y, m.biome === 'dungeon' ? T.ROCKFLOOR : T.STONEFLOOR);
      delete m.chests[i];
      const e = Ent.mon('mimic', (m.spawn ? m.spawn.danger : 3) + 1, x, y);
      e.aware = true; e.sprung = true;
      Gm.addEnt(e);
      Gm.msg('Сундук открывает пасть!', '#ff6060');
      Gm.endTurn(1);
      return;
    }
    // домашний сундук — чужой
    if (c.home && m.sett >= 0) {
      const home = (m.spots.home || []).find((h) => h.rect && x >= h.rect.x && x < h.rect.x + h.rect.w && y >= h.rect.y && y < h.rect.y + h.rect.h);
      c.owners = c.owners || 1;
      Gm.crime(null, 'theft');
      if (!c.filled) { c.filled = 1; const r = U.rng(G.W.seed, 'hc', m.key, i); c.items.push({ b: 'gold', q: r.int(1, 12) }); if (r.chance(0.5)) c.items.push({ b: r.pick(['bread', 'cheese', 'apple', 'candle', 'rope', 'cloak', 'tunic', 'beads', 'comb', 'spoon', 'pipe', 'dice', 'book']) }); const owner = (home && homeOwner(home)) ; if (owner != null) { const uq = G.W.npcUq[owner]; if (uq != null && !G.S.taken['uq' + uq] && E.Sim.isAlive(owner)) c.items.push({ uq }); const sp = G.W.npcItem[owner]; if (sp && !G.S.taken['ni' + owner]) { c.items.push({ b: sp }); G.S.taken['ni' + owner] = 1; } } }
    }
    if (c.guard || c.treasury) Gm.crime(null, 'theft');
    if (!c.opened) { c.opened = 1; Gm.cnt('chests'); Gm.gain('chest'); }
    c.items = c.items.map((s) => Items.realize(s)).filter(Boolean);
    E.UI.chest(c);
  };
  function homeOwner(home) {
    const m = G.map;
    const k = m.spots.home.indexOf(home);
    const ids = E.Sim.settAlive[m.sett] || [];
    for (const id of ids) { const n = Gm.npc(id); const st = G.S.npc[id]; const h = st && st.h != null ? st.h : n.house; if (h != null && h >= 0 && h % m.spots.home.length === k) return id; }
    return null;
  }

  // ---------- святилища, алтари, письмена, могилы ----------
  Gm.shrine = function (f, x, y) {
    const P = G.P;
    const god = D.godById[f.god];
    if (!god) return;
    const opts = [{ t: 'Помолиться', f: () => Gm.prayAtShrine(f) }];
    if (Gm.event('spirits') && Gm.night()) opts.push({ t: 'Шагнуть в мерцающий туман', f: () => { P.ret = { key: G.map.key, x: P.x, y: P.y }; Gm.teleport('dim:spirit:1:1', -1, -1); } });
    opts.push({ t: 'Уйти', f: () => {} });
    E.UI.menu('Святилище. ' + god.n + '. «' + god.d + '»', opts);
  };
  Gm.prayAtShrine = function (f) {
    const P = G.P;
    if (Gm.day() === P.startDay) P.flags.prayed_first_day = 1;
    const k = 'sh_' + G.map.key + ':' + f.god;
    P.shrineDays = P.shrineDays || {};
    if (P.shrineDays[k] === Gm.day()) { Gm.msg('Ты уже молил[ся|ась] здесь сегодня. Тишина.'); Gm.endTurn(5); return; }
    P.shrineDays[k] = Gm.day();
    P.shrines = P.shrines || {};
    if (!P.shrines[f.god]) { P.shrines[f.god] = 1; Gm.cnt('shrines'); }
    Gm.gain('shrine');
    Gm.gain('pray');
    // голодный бог и голод
    if (f.god === 'hungry' && P.hunger < 10 && !Gm.hasFx('hungry_god')) { Gm.fx('hungry_god', 0); }
    const pool = G.W.prayers.filter((p) => p.god === f.god && p.src === 'god' && !P.prayers.includes(p.id) && !G.S.lostPr[p.id]);
    const chance = 0.25 + P.st.fai * 0.04 + (P.cls === 'priest' ? 0.2 : 0);
    if (pool.length && Math.random() < chance) {
      const pr = pool[Math.floor(Math.random() * pool.length)];
      Gm.msg('Тишина отвечает тебе. Не словами — но ты понимаешь.', '#fff0b0');
      Gm.learn(pr.id, D.godById[f.god].n);
    } else {
      Gm.msg(['Тишина.', 'Ветер шевелит пепел у алтаря.', 'Ничего не происходит. Или происходит, но не с тобой.', 'Тебе становится чуть спокойнее.'][rnd(0, 3)]);
      P.mp = Math.min(P.mmp, P.mp + 5);
    }
    if (Math.random() < 0.05) { const b = D.blessIds[Math.floor(Math.random() * D.blessIds.length)]; Gm.fx(b, 60 * 24 * 2); }
    Gm.endTurn(15);
  };
  Gm.sacrifice = function (f, it) {
    const P = G.P;
    if (!it) return;
    Gm.removeItem(it);
    const v = (it.v || 1) * (it.q || 1);
    Gm.msg('Ты кладёшь на алтарь: ' + Items.name(it) + '. Что-то принимает дар.', '#d08080');
    Gm.cnt('sacrifices'); Gm.gain('sacrifice');
    if (f.god === 'hungry' || f.god === 'ash') {
      if (!Gm.hasFx('hungry_god') && f.god === 'hungry' && Math.random() < 0.4) Gm.fx('hungry_god', 0);
      const pool = G.W.prayers.filter((p) => (p.src === 'sacrifice' || p.god === f.god) && !P.prayers.includes(p.id) && !G.S.lostPr[p.id]);
      if (pool.length && Math.random() < Math.min(0.9, 0.2 + v / 300)) Gm.learn(pool[Math.floor(Math.random() * pool.length)].id, 'Жертва');
    } else if (v >= 50 && Math.random() < 0.5) {
      const b = D.blessIds[Math.floor(Math.random() * D.blessIds.length)];
      Gm.fx(b, 60 * 24 * 3);
    }
    Gm.storyHook('sacrifice', { item: it, god: f.god });
    Gm.endTurn(5);
  };
  Gm.readInscr = function (f) {
    const P = G.P;
    const key = G.map.key + ':' + f.lang + ':' + f.text;
    P.inscRead = P.inscRead || {};
    const first = !P.inscRead[key];
    if (first) { P.inscRead[key] = 1; P.langs[f.lang] = (P.langs[f.lang] || 0) + 1; Gm.cnt('inscr'); Gm.gain('inscr'); Gm.xp(15); }
    const known = (P.langs[f.lang] || 0) >= 2;
    Gm.popup('Письмена', known ? '«' + f.text + '»\n\n(' + D.langs[f.lang] + ')' : 'Знаки, похожие на ' + ['птичьи следы', 'трещины', 'волны', 'корни', 'зубы', 'отражения'][f.lang] + '. Ты не понимаешь их. Пока.');
    if (first && (P.langs[f.lang] || 0) >= 3) {
      const pool = G.W.prayers.filter((p) => p.src === 'lang' && p.lang === f.lang && !P.prayers.includes(p.id) && !G.S.lostPr[p.id]);
      if (pool.length) Gm.learn(pool[0].id, D.langs[f.lang]);
    }
    Gm.endTurn(3);
  };
  Gm.grave = function (f, x, y) {
    const P = G.P;
    let text = f.text;
    if (text == null && f.sid != null) {
      // имена с местного кладбища — настоящие умершие
      const dead = G.S.deadList.filter((id) => E.Sim.settOf(id) === f.sid);
      const id = dead.length ? dead[(f.n * 7) % dead.length] : null;
      text = id != null ? Gm.npc(id).first + ' ' + (Gm.npc(id).sur || '') + '. ' + U.cap(String(G.S.npc[id].dc || '').replace(/\(ла\)|\(а\)|\(ась\)/g, '')) + '.' : 'Свежая земля. Имени ещё нет.';
    }
    const opts = [{ t: 'Прочитать надпись', f: () => { Gm.popup('Могила', text || 'Буквы стёрты.'); Gm.storyHook('readGrave', { text }); P.c.graves_read = (P.c.graves_read || 0) + 1; } }];
    if (Gm.toolEq('dig')) opts.push({ t: 'Раскопать', f: () => Gm.dig(f, x, y) });
    opts.push({ t: 'Уйти', f: () => {} });
    E.UI.menu('Могила.', opts);
  };
  Gm.dig = function (f, x, y) {
    const P = G.P, m = G.map;
    if (f.dug) { Gm.msg('Здесь уже копали.'); return; }
    f.dug = 1;
    Gm.setFeature(x, y, f);
    Gm.cnt('graves'); Gm.gain('dig');
    if (m.sett >= 0) Gm.crime(null, 'grave');
    const shovel = P.eq.hand && P.eq.hand.b === 'a_graveshovel';
    if (f.item) { Gm.dropItem(P.x, P.y, Items.realize(f.item)); Gm.msg('В земле что-то есть.', '#c0c0a0'); }
    else if (shovel || Math.random() < 0.4) { const r = Math.random(); Gm.dropItem(P.x, P.y, r < 0.1 ? Gm.randomUnique(m.spawn ? m.spawn.danger : 3) : Items.make(r < 0.4 ? 'bone' : r < 0.6 ? 'skull' : r < 0.8 ? 'ring' : 'gold', r >= 0.8 ? {} : {})); Gm.msg('Лопата стукается о что-то.', '#c0c0a0'); }
    else Gm.msg('Только земля и кости.');
    if (Math.random() < 0.25 && !shovel) { const e = Gm.placeMon(m, 'zombie', (m.spawn ? m.spawn.danger : 2)); if (e) { e.x = x; e.y = y; Gm.msg('Земля шевелится.', '#ff9090'); } }
    Gm.endTurn(20);
  };
  Gm.forge = function () {
    const P = G.P;
    if (!P.flags.firstForge) {
      P.flags.firstForge = 1;
      Gm.popup('Первая кузня', 'Горн холоден тысячи лет. Ты касаешься наковальни — и она звенит, будто по ней только что ударили. Огонь в горне вспыхивает сам. В нём ковали богов. Теперь он узнал тебя.');
      Gm.xp(500);
      return;
    }
    if (Gm.has('star_metal')) {
      Gm.take('star_metal', 1);
      const it = Gm.mkItem(P.eq.hand && P.eq.hand.dmg ? P.eq.hand.b : 'sword');
      it.n = 'Святое ' + 'орудие ' + U.gen(P.name);
      it.dmg = [12 + P.level, 22 + P.level * 2]; it.vs = { undead: 2, other: 2, god: 1.5 }; it.mw = it.wr = 99999; it.v = 5000;
      it.hist = ['Выковано в Первой кузне руками ' + U.gen(P.name) + '.'];
      Gm.give(it); Gm.cnt('craft'); Gm.gain('craft');
      Gm.msg('Металл поёт под молотом. Ты держишь вещь, какой не было.', '#ffe080');
    } else Gm.msg('Горн горит. Ему нужен металл — не простой.');
  };

  // ---------- ремёсла ----------
  Gm.fish = function (x, y) {
    const P = G.P, m = G.map;
    Gm.msg('Ты закидываешь удочку...');
    const h = Gm.hour();
    let p = 0.35 + P.st.luck * 0.02 + (h >= 4 && h <= 7 || h >= 18 && h <= 20 ? 0.15 : 0) + (P.cls === 'deep_fisher' ? 0.2 : 0);
    if (Gm.event('ocean')) p += 0.2;
    E.Sim.advance(30, () => { Gm.playerHour(); return !P.dead; });
    if (P.dead) return;
    if (Math.random() < p) {
      const gf = G.W.storyRoles.goldfish;
      if (gf && m.rid === gf.reg && Gm.season() === 1 && h >= 4 && h <= 6 && Math.random() < 0.08 && !G.S.flags.goldCaught) { G.S.flags.goldCaught = 1; Gm.give('fish_gold'); Gm.msg('На крючке бьётся что-то золотое!', '#ffe060'); }
      else if (Math.random() < 0.02) Gm.give('pearl');
      else if (Math.random() < 0.01) Gm.give(Gm.randomUnique(3));
      else Gm.give('fish_raw');
      Gm.cnt('fish'); Gm.gain('fish');
    } else Gm.msg('Не клюёт.');
    Gm.endTurn(1);
  };
  Gm.gather = function (x, y) {
    const P = G.P, m = G.map;
    const t = m.tiles[y * m.w + x];
    const b = m.biome;
    let herb = null;
    const r = Math.random();
    if (t === T.MUSHROOM) herb = r < 0.15 ? 'spores' : 'mushrooms';
    else if (Gm.night() && r < 0.15) herb = 'h_moonwort';
    else if (r < 0.04) herb = 'h_mandrake';
    else if (b === 'swamp') herb = r < 0.5 ? 'h_sundew' : 'h_bloodroot';
    else if (b === 'volcanic' || b === 'ash') herb = 'h_ashbloom';
    else if (b === 'ice' || b === 'tundra' || b === 'mountain') herb = r < 0.6 ? 'h_frost' : 'h_sage';
    else if (b === 'coast') herb = 'h_saltmoss';
    else if (b === 'forest' || b === 'ancient') herb = r < 0.3 ? 'berries' : r < 0.6 ? 'h_plantain' : r < 0.8 ? 'h_sage' : 'h_bloodroot';
    else herb = r < 0.4 ? 'h_wormwood' : r < 0.7 ? 'h_plantain' : r < 0.85 ? 'berries' : 'h_sage';
    if (Math.random() < 0.6 + P.st.luck * 0.02) { Gm.give(herb); if (D.items[herb].herb) { Gm.cnt('herbs'); Gm.gain('herb'); } }
    else Gm.msg('Ничего полезного.');
    Gm.setTile(x, y, b === 'swamp' ? T.SWAMP : T.GRASS);
    Gm.endTurn(3);
  };
  Gm.chop = function (x, y) { Gm.setTile(x, y, G.map.biome === 'tundra' ? T.SNOW : T.GRASS); Gm.give('wood'); Gm.endTurn(8); };
  Gm.mine = function (x, y) { Gm.setTile(x, y, T.ROCKFLOOR); Gm.give('iron_ore'); if (Math.random() < 0.05) Gm.give('crystal'); Gm.endTurn(8); };
  Gm.cook = function () {
    const P = G.P;
    let n = 0;
    for (const it of P.inv.slice()) { const b = D.items[it.b]; if (b && b.cook) { const q = it.q || 1; Gm.removeItem(it); Gm.give(b.cook, q, true); n += q; } }
    if (n) { Gm.msg('Ты готовишь еду на огне. (' + n + ')', '#e0c080'); Gm.endTurn(10); }
    else { Gm.msg('Ты греешь руки у огня.'); Gm.endTurn(1); }
  };
  Gm.makeFire = function () {
    const P = G.P;
    if (!Gm.has('flint')) { Gm.msg('Нечем разжечь огонь.'); return; }
    if (!Gm.has('wood')) { Gm.msg('Нужны дрова.'); return; }
    const p = Ent.freeNear(P.x + 1, P.y);
    if (!p || !G.map.outdoor) { Gm.msg('Здесь негде развести костёр.'); return; }
    Gm.take('wood', 1);
    Gm.setTile(p.x, p.y, T.CAMPFIRE);
    Gm.msg('Ты разводишь костёр.', '#ffb060');
    Gm.endTurn(5);
  };
  // Алхимия: рецепты нигде не записаны
  D.recipes = {
    'h_plantain+h_plantain': 'p_heal', 'h_plantain+h_sage': 'p_heal', 'h_bloodroot+h_plantain': 'p_heal', 'h_bloodroot+h_wormwood': 'cure',
    'h_moonwort+h_sage': 'p_night', 'h_saltmoss+h_sundew': 'p_breath', 'h_bloodroot+h_mandrake': 'p_str', 'h_ashbloom+h_frost': 'p_warm',
    'h_ashbloom+h_wormwood': 'p_fire', 'h_sundew+spores': 'p_acid', 'h_mandrake+h_moonwort': 'p_sleep', 'crystal+h_moonwort': 'p_spirit',
    'h_sage+h_wormwood': 'p_antidote', 'h_frost+h_saltmoss': 'p_breath', 'ectoplasm+h_moonwort': 'p_spirit', 'h_mandrake+star_jelly': 'p_str',
    'ashpile+salt': 'holy_water', 'h_wormwood+salt': 'p_antidote', 'h_sage+honey': 'p_heal', 'mushrooms+mushrooms': 'p_sludge',
  };
  Gm.brew = function (a, b) {
    const P = G.P;
    if (!a || !b || (a === b && a.q < 2)) { Gm.msg('Нужно два ингредиента.'); return; }
    const k = [a.b, b.b].sort().join('+');
    Gm.take(a.b, 1); Gm.take(b.b, 1);
    let res = D.recipes[k] || 'p_sludge';
    Gm.cnt('brews'); Gm.gain('brew');
    if (res === 'p_sludge') Gm.cnt('brew_fail');
    if (res !== 'p_sludge') { P.known.recipes[k] = res; }
    let q = 1;
    if ((P.cls === 'alchemist' || P.cls === 'flesh_alchemist' || P.cls === 'hearth_witch') && Math.random() < 0.4) q = 2;
    Gm.give(res, q);
    Gm.endTurn(10);
  };

  // ---------- использование предметов ----------
  Gm.use = function (it) {
    const P = G.P;
    const b = D.items[it.b] || {};
    if (Gm.fire('use', { item: it })) { Gm.endTurn(1); return; }
    if (Gm.storyHook('use', { item: it })) { Gm.endTurn(1); return; }
    if (it.b === 'gold') return;
    if (b.t === 'food') return Gm.eat(it);
    if (b.t === 'potion' || it.t === 'potion') return Gm.drink(it);
    if (b.t === 'book' || it.b === 'book') return Gm.read(it);
    if (it.cont) return Gm.drinkFrom(it);
    if (it.b === 'torch') { Gm.take('torch', 1); P.light = 480; Gm.msg('Ты зажигаешь факел.', '#ffc070'); Gm.cnt('torches'); Gm.gain('torch'); Gm.endTurn(1); return; }
    if (it.b === 'flint') return Gm.makeFire();
    if (it.b === 'mortar') return E.UI.alchemy();
    if (b.music || it.music) { Gm.msg(it.b === 'lute' ? 'Ты играешь. Струны фальшивят, но мелодия получается.' : 'Ты играешь на флейте. Звук летит далеко.', '#c0e0ff'); Gm.cnt('music'); Gm.gain('music'); Gm.fire('play', { item: it }); Gm.endTurn(3); return; }
    if (it.b === 'bedroll') return E.UI.rest();
    if (b.s) return Gm.equip(it);
    if (it.b === 'skull' && Gm.night()) { Gm.msg('Ты смотришь в пустые глазницы. Кажется, кто-то смотрит в ответ.'); Gm.cnt('ghost_talks'); Gm.endTurn(1); return; }
    Gm.msg('Ты вертишь в руках: ' + Items.name(it).toLowerCase() + '. Ничего не происходит.');
    Gm.endTurn(1);
  };
  Gm.eat = function (it) {
    const P = G.P;
    const b = D.items[it.b];
    let f = b.food * Gm.fxMul('food');
    for (const s in P.eq) { const x = P.eq[s]; if (x && x.b === 'a_frostheart') f *= 0.5; }
    Gm.take(it.b, 1);
    P.hunger = Math.min(100, P.hunger + f);
    if (b.heal && !Gm.fxFlag('noRegen')) Gm.healPlayer(b.heal);
    if (Gm.fxFlag('foodHeal') === 0) { /* кровь не лечится едой */ }
    else Gm.healPlayer(Math.round(f / 6), true);
    if (b.raw && Math.random() < 0.25) { Gm.fx('poison', 10); Gm.msg('Сырое. Желудок протестует.', '#c0a060'); }
    if (b.shroom && Math.random() < 0.2) { const r = Math.random(); if (r < 0.4) Gm.fx('poison', 30); else if (r < 0.6) { Gm.fx('drunk', 60); Gm.msg('Мир начинает переливаться.'); } else if (r < 0.7) { const pr = G.W.prayers.find((p) => p.src === 'dream' && !P.prayers.includes(p.id)); if (pr) Gm.learn(pr.id, 'Грибы'); } }
    if (b.drink && it.b === 'ale') { Gm.fx('drunk', 90); }
    if (it.b === 'star_jelly') Gm.fx('focus', 120);
    if (Gm.day() === P.startDay) P.flags.ate_first_day = 1;
    Gm.msg('Ты ешь: ' + b.n.toLowerCase() + '.');
    Gm.cnt('eaten'); Gm.gain('eat');
    Gm.fire('eat', { item: it });
    Gm.endTurn(2);
  };
  Gm.drink = function (it) {
    const P = G.P;
    const b = D.items[it.b];
    Gm.take(it.b, 1);
    Gm.msg('Ты выпиваешь: ' + b.n.toLowerCase() + '.');
    if (b.heal) Gm.healPlayer(b.heal + P.level);
    if (b.mp) P.mp = Math.min(P.mmp, P.mp + b.mp);
    if (b.cure) Gm.rmFx(b.cure);
    if (b.eff) Gm.fx(b.eff, b.dur);
    if (b.holy) { Gm.fx('blessed', 120); for (const f of P.fx.slice()) if (D.effects[f.id].kind === 'state' && ['poison', 'fear', 'weak', 'cold'].includes(f.id)) Gm.rmFx(f.id); }
    if (b.plague) { Gm.rmFx('plague'); Gm.msg('Горько. Но жар отступает.'); }
    if (b.bomb) { Gm.msg('Ты делаешь глоток... это была горючая смесь. Зачем?!', '#ff8040'); Gm.hurtPlayer(Math.round(P.mhp * 0.2), 'fire'); }
    if (b.sludge) {
      const r = Math.random();
      if (r < 0.25) { Gm.healPlayer(P.mhp * 0.5); Gm.msg('Неожиданно приятно.'); }
      else if (r < 0.5) Gm.fx('poison', 30);
      else if (r < 0.6) { const c = D.curseIds[Math.floor(Math.random() * D.curseIds.length)]; if (!['plague', 'age'].includes(c)) Gm.fx(c, 60 * 24); }
      else if (r < 0.7) { const s = ['str', 'dex', 'con', 'int', 'fai', 'luck'][rnd(0, 5)]; P.base[s] += 1; Gm.msg('Что-то в тебе необратимо изменилось.', '#c0e0a0'); }
      else if (r < 0.8) Gm.xp(50 + P.level * 10);
      else Gm.msg('Ничего. Только привкус ржавчины.');
    }
    Gm.endTurn(1);
  };
  Gm.drinkFrom = function (it) {
    const P = G.P;
    if (Gm.fire('drink', { item: it })) { Gm.endTurn(1); return; }
    if (!it.water) {
      if (Gm.nearWater(P.x, P.y, 1)) return Gm.fill(it);
      Gm.msg('Пусто.'); return;
    }
    Gm.msg(it.water === 'holy' ? 'Вода тёплая и светлая.' : 'Ты пьёшь воду.');
    if (it.water === 'holy') { Gm.healPlayer(20); Gm.fx('blessed', 120); }
    it.water = null;
    Gm.endTurn(1);
  };
  Gm.fill = function (it) {
    const P = G.P, m = G.map;
    let idx = -1;
    for (const [dx, dy] of [[0, 0]].concat(U.DIR8)) { const x = P.x + dx, y = P.y + dy; if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue; const t = m.tiles[y * m.w + x]; if (TL[t].water || t === T.WELL) { if (idx < 0 || t === T.STREAM) idx = y * m.w + x; } }
    if (idx < 0) { Gm.msg('Здесь нет воды.'); return; }
    it.water = 'plain';
    Gm.msg('Ты набираешь воды: ' + it.n.toLowerCase() + '.');
    Gm.fire('fill', { item: it, idx });
    Gm.endTurn(1);
  };
  Gm.read = function (it) {
    const P = G.P;
    if (!it.text) Items.fillBook(it);
    const first = !it.read;
    it.read = 1;
    Gm.popup(it.title || it.n, it.text || '...');
    if (first) {
      Gm.cnt('books'); Gm.gain('read');
      Gm.xp(15);
      if (Math.random() < 0.3) P.base.int += Math.random() < 0.2 ? 1 : 0;
      if (it.teach != null) Gm.learn(it.teach, 'Книга');
    }
    Gm.endTurn(5);
  };
  Gm.equip = function (it) {
    const P = G.P;
    const s = it.s || (D.items[it.b] && D.items[it.b].s);
    if (!s) { Gm.msg('Это нельзя надеть.'); return; }
    if (P.eq[s] === it) { P.eq[s] = null; Gm.msg('Ты снимаешь: ' + Items.name(it).toLowerCase() + '.'); }
    else {
      P.eq[s] = it;
      Gm.msg((s === 'hand' ? 'Ты берёшь в руку: ' : 'Ты надеваешь: ') + Items.name(it).toLowerCase() + '.');
      if (it.b === 'a_spiteblade') Gm.msg('Рукоять колет ладонь. Меч недоволен.', '#c08080');
      if (it.b === 'a_oathring') { P.flags.oathRing = 1; Gm.msg('Кольцо сжимается на пальце. Ты что-то пообещал[|а]. Не помнишь что.', '#e0d0a0'); }
    }
    Gm.calc();
    Gm.endTurn(1);
  };
  Gm.drop = function (it) {
    const P = G.P;
    if (it.b === 'a_tear') { Gm.removeItem(it); Gm.msg('Капля падает на землю — и исчезает. Навсегда.', '#b0e0ff'); Gm.endTurn(1); return; }
    Gm.removeItem(it);
    Gm.dropItem(P.x, P.y, it);
    if (it.b === 'a_golem_heart' && TL[G.map.tiles[P.y * G.map.w + P.x]].lava) { /* */ }
    Gm.msg('Ты бросаешь: ' + Items.name(it).toLowerCase() + '.');
    Gm.endTurn(1);
  };
  // Сердце Голема можно уничтожить лишь одним способом — бросить в лаву
  Gm.throwInto = function (it) {
    const P = G.P, m = G.map;
    let lava = false;
    for (const [dx, dy] of U.DIR8) { const x = P.x + dx, y = P.y + dy; if (x >= 0 && y >= 0 && x < m.w && y < m.h && TL[m.tiles[y * m.w + x]].lava) lava = true; }
    if (!lava) { Gm.msg('Некуда бросить.'); return; }
    Gm.removeItem(it);
    if (it.b === 'a_golem_heart') {
      Gm.popup('Камень, который бился', 'Сердце падает в лаву. Оно не плавится — оно бьётся всё быстрее, быстрее... и замирает. Где-то далеко живые горы вздыхают и затихают. Навсегда.');
      G.S.flags.golemHeartDestroyed = 1;
      Gm.chron('Живые горы замерли.', { k: 'big' });
      Gm.xp(1000);
    } else Gm.msg('Лава принимает: ' + Items.name(it).toLowerCase() + '.');
    Gm.endTurn(1);
  };

  // ---------- молитвы ----------
  Gm.pray = function (pid, dir) {
    const P = G.P;
    const p = G.W.prayers[pid];
    if (!p) return;
    if (Gm.fxFlag('mute')) { Gm.msg('Слова застревают в горле.'); return; }
    const cd = P.prCd[pid] || 0;
    if (cd > G.S.time) { Gm.msg('Молитва ещё не вернулась к тебе. (' + Math.ceil((cd - G.S.time) / 60) + ' ч)'); return; }
    if (P.mp < p.mp) { Gm.msg('Не хватает духа.'); return; }
    P.mp -= p.mp;
    P.prCd[pid] = G.S.time + Math.round(p.cd * (1 - Math.min(0.5, (P.st.wil || 0) * 0.01)));
    Gm.msg('Ты шепчешь: «' + p.n + '».', '#fff0c0');
    E.Combat.useAbility(Object.assign({ n: p.n }, p.fx), dir, true);
    // цена
    const c = p.cost;
    const reduce = Math.min(0.8, (P.st.wil || 0) * 0.01);
    if (Math.random() > reduce) {
      if (c.k === 'hunger') P.hunger = Math.max(0, P.hunger - c.v);
      else if (c.k === 'hp') Gm.hurtPlayer(Math.max(1, Math.round(P.mhp * c.v)), 'self');
      else if (c.k === 'age') P.ageAdd = (P.ageAdd || 0) + c.v / 360;
      else if (c.k === 'gold') P.gold = Math.max(0, P.gold - c.v);
      else if (c.k === 'curse') Gm.fx(c.e, c.dur);
      else if (c.k === 'noise') { for (const e of G.map.ents) if (U.dist(e.x, e.y, P.x, P.y) < 15) e.aware = true; }
      else if (c.k === 'opinion') { for (const e of G.map.ents) if (e.npc != null && U.dist(e.x, e.y, P.x, P.y) < 8) Gm.op(e.npc, -c.v); }
      else if (c.k === 'forget') { const keys = Object.keys(G.S.maps); const k = keys[Math.floor(Math.random() * keys.length)]; if (k !== G.map.key) G.S.maps[k].ex = new Uint8Array(MW * MH); }
      else if (c.k === 'mp') P.mp = Math.max(0, P.mp - Math.round(P.mmp * c.v));
    }
    Gm.cnt('pcast'); Gm.gain('pray');
    P.silentHours = 0;
    Gm.endTurn(1);
  };
  Gm.useAb = function (aid, dir) {
    const P = G.P;
    const a = D.ab[aid];
    if (!a) return;
    if ((P.cd[aid] || 0) > 0) { Gm.msg('Ещё не готово. (' + P.cd[aid] + ')'); return; }
    if (P.mp < a.cost) { Gm.msg('Не хватает духа.'); return; }
    if (E.Combat.useAbility(aid, dir)) { P.mp -= a.cost; P.cd[aid] = a.cd; Gm.endTurn(1); }
  };

  // ---------- отдых ----------
  Gm.rest = function (hours, untilHour) {
    const P = G.P, m = G.map;
    if (m.ents.some((e) => (e.hostile || e.hostileToP) && e.kind !== 'ally' && G.vis[e.y * m.w + e.x])) { Gm.msg('Рядом опасность. Не до отдыха.', '#ff9090'); return; }
    const indoors = TL[m.tiles[P.y * m.w + P.x]].indoor;
    const bed = m.tiles[P.y * m.w + P.x] === T.BED;
    const fire = Gm.nearFire(3);
    const safe = (indoors && m.sett >= 0) || m.dimName === 'time';
    let left = hours;
    if (untilHour != null) { const h = Gm.hour(); left = (untilHour - h + 24) % 24 || 24; }
    left = Math.max(1, left);
    P.restInterrupt = 0;
    let slept = 0, done = 0;
    const startTime = G.S.time;
    // минуты до часа
    const firstStep = 60 - G.S.time % 60;
    E.Sim.advance(firstStep, () => true);
    for (let i = 0; i < left; i++) {
      const night = Gm.night();
      E.Sim.advance(60, () => true);
      Gm.playerHour();
      if (P.dead || P.ended || G.mapChanged) break;
      done++;
      // восстановление
      const mul = bed ? 3 : fire || indoors ? 2 : 1.4 * (Gm.has('bedroll') ? 1.3 : 1);
      if (!Gm.fxFlag('noRegen')) P.hp = Math.min(P.mhp, P.hp + Math.ceil(P.mhp * 0.05 * mul));
      P.mp = Math.min(P.mmp, P.mp + Math.ceil(P.mmp * 0.08 * mul));
      if (night) slept++;
      if (fire && m.outdoor) { P.c.fire_rest_streak = (P.c.fire_rest_streak || 0) + 1; Gm.gain('rest_out', 1); } else P.c.fire_rest_streak = 0;
      if (!indoors) Gm.gain('rest_out');
      if (indoors && m.sett >= 0) { Gm.cnt('rest_hours_town'); Gm.gain('rest_in'); }
      if (P.flags.awake_first_night == null && Gm.day() === P.startDay && night) P.flags.slept_first_night = 1;
      if (night && Time.day(G.S.time) === P.startDay + 1 && Gm.hour() < 6) P.flags.slept_first_night = 1;
      // засада
      if (!safe) {
        let p = (night ? 0.06 : 0.025) * (1 + (m.spawn ? m.spawn.danger : 1) / 10) * (fire ? 0.6 : 1) * (m.sett >= 0 ? 0.3 : 1);
        if (P.saltCircle && G.S.time < P.saltCircle.until) p *= 0.3;
        if (Math.random() < p) {
          const tbl = D.monsFor(m.kind === 'dun' ? 'dungeon' : m.biome, Gm.monFlags(m)).filter(([id]) => D.mons[id].ai !== 'passive');
          if (tbl.length) {
            const r = U.rng(G.S.time);
            const tid = r.weighted(tbl);
            const e = Ent.mon(tid, (m.spawn ? m.spawn.danger : 1) + 1, P.x + r.int(-6, 6), P.y + r.int(-4, 4));
            e.aware = true;
            if (Gm.addEnt(e)) { Gm.msg('Тебя будит шорох. Рядом — ' + e.n.toLowerCase() + '!', '#ff8080'); break; }
          }
        }
      }
      if (P.restInterrupt) break;
      if (Gm.fxFlag('mute') == null) { /**/ }
    }
    if (slept >= 4) Gm.sleepEnd(slept, bed);
    // жители — по местам
    if (m.sett >= 0) { m.ents = m.ents.filter((e) => e.npc == null || e.hostile); m.occ = new Map(); for (const e of m.ents) m.occ.set(e.y * m.w + e.x, e); Ent.populate(); }
    Gm.calc();
    Ent.computeDmap();
    Gm.computeFov();
    if (done > 0) Gm.msg('Прошло ' + done + ' ' + U.plural(done, 'час', 'часа', 'часов') + '.', '#a0a0b0');
    G.mapChanged = false;
    E.Save && E.Save.save();
  };
  Gm.sleepEnd = function (hours, bed) {
    const P = G.P, m = G.map;
    Gm.fire('sleep', { hours, bed });
    if (Gm.hasFx('exhausted')) Gm.rmFx('exhausted');
    // сны
    let p = 0.04 + (Gm.hasFx('drowsy') ? 0.35 : 0) + (Gm.has('owl_feather') ? 0.12 : 0) + (P.cls === 'dream_catcher' || P.cls === 'lucid_dreamer' ? 0.2 : 0);
    if (m.dim) p = 0;
    if (Math.random() < p) {
      Gm.cnt('dreams'); Gm.gain('dream');
      P.dreamRet = { key: m.key, x: P.x, y: P.y };
      Gm.popup('Сон', 'Ты засыпаешь... и открываешь глаза не там, где уснул[|а].');
      Gm.teleport('dim:dream:' + rnd(0, 2) + ':' + rnd(0, 2), -1, -1);
      return;
    }
    if (Math.random() < 0.25) Gm.msg(Gm.fmt(D.dreams[rnd(0, D.dreams.length - 1)]), '#a090c0');
    if (Math.random() < 0.03) { const pr = G.W.prayers.find((x) => x.src === 'dream' && !P.prayers.includes(x.id) && !G.S.lostPr[x.id] && Math.random() < 0.1); if (pr) Gm.learn(pr.id, 'Сон'); }
  };
  Gm.wake = function () {
    const P = G.P;
    const r = P.dreamRet;
    P.dreamRet = null;
    Gm.msg('Ты просыпаешься. Сердце колотится.', '#c0b0ff');
    if (r) Gm.loadMap(r.key, r.x, r.y, 'tp'); else Gm.returnFromDim();
  };

  // ---------- смерть ----------
  Gm.die = function (cause, src) {
    const P = G.P, m = G.map;
    if (P.dead || P.ended) return;
    // смерть во сне — пробуждение
    if (m.dimName === 'dream') { P.hp = Math.max(1, Math.round(P.mhp * 0.5)); Gm.fx('fear', 120); Gm.wake(); return; }
    if (Gm.fire('death', { cause })) return;
    P.hp = 0;
    P.dead = true;
    P.cause = cause;
    let id;
    if (Gm.day() === P.startDay && cause !== 'old') id = 'hidden_firstday';
    else if (String(cause).startsWith('boss:')) { const b = String(cause).slice(5); id = D.endings['death_boss_' + b] ? 'death_boss_' + b : 'death_other'; }
    else if (m.dim && D.endings['death_dim_' + m.dimName]) id = 'death_dim_' + m.dimName;
    else if (D.endings['death_' + cause]) id = 'death_' + cause;
    else id = 'death_other';
    if (src && src.boss && G.W.bossById[src.boss] && G.W.bossById[src.boss].gen) id = 'death_other';
    Gm.chron('Умер(ла) путник по имени ' + P.name + '.', { r: m.rid, k: 'death', seen: 1 });
    // тело с вещами остаётся в мире
    for (const it of P.inv) G.map.items.push({ x: P.x, y: P.y, it });
    if (P.gold) G.map.items.push({ x: P.x, y: P.y, it: { u: U.uid(), b: 'gold', n: 'Монеты', t: 'gold', q: P.gold, w: 0 } });
    if (m.kind === 'over') Gm.setTile(P.x, P.y, T.BONES);
    G.S.graves = G.S.graves || [];
    G.S.graves.push({ name: P.name, key: m.key, x: P.x, y: P.y, t: G.S.time, cause });
    setTimeout(() => Gm.ending(id, { cause, src }), 600);
  };
})(window.EOF);
