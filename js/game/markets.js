'use strict';
// Торги:
//  • подпольный рынок в подвале: люк в бедном квартале (или у кожевни), сторож за дверью спрашивает слово —
//    его знают нищие; можно и сунуть монет. Внизу скупщик краденого (берёт дороже всех), торговец запретным,
//    игрок в кости и ночные торги краденым;
//  • аукцион: в столице раз в три дня, в городе раз в неделю — редкие вещи с молотка, ставки против купцов;
//  • ярмарка: раз в две недели у каждого города и села на два дня встают шатры и прилавки за околицей —
//    купцы со всех сторон, гадалка, кукольник, состязания;
//  • барахолка: старьё, ношеное оружие и одежда — дёшево, но с износом.
(function (E) {
  const D = E.D, G = E.G, Gm = E.Gm, U = E.U, T = E.T, TL = E.TL, UI = E.UI, Ent = E.Ent, Dlg = E.Dlg, MG = E.MapGen, Time = E.Time, Items = E.Items;
  const MK = E.Markets = {};
  const MW = E.C.MW, MH = E.C.MH;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const SH = Dlg.SHOP;
  const shop = (k, a) => { SH[k] = a.filter((b) => D.items[b]); };
  shop('black', ['lockpick', 'lockpick', 'p_night', 'p_sleep', 'arrow_poison', 'bolt_barbed', 'wyvern_venom', 'powder', 'dagger', 'crossbow', 'mask', 'hood', 'old_coin', 'map_scrap', 'signet', 'soul_bottle', 'gold_ring', 'silver_ring', 'pearl_amulet', 'p_acid', 'p_fire', 'holed_coin']);
  shop('fence', ['lockpick', 'rope', 'candle', 'hood', 'mask', 'knife', 'dagger', 'empty_bottle', 'dice']);
  shop('fair_cloth', ['tunic', 'shirt_wool', 'shirt_fine', 'trousers', 'pants_wool', 'skirt', 'boots', 'shoes_bast', 'gloves', 'mittens', 'cloak', 'wool_cloak', 'hood', 'furhat', 'robe', 'linen_shirt']);
  shop('fair_arms', ['sword', 'shortsword', 'axe', 'mace', 'spear', 'bow', 'crossbow', 'shield', 'leather', 'gambeson', 'helm', 'arrow_broad', 'arrow_bodkin', 'bolt_heavy']);
  // барахолка: больше всякой всячины
  if (SH.junk) for (const b of ['old_mug', 'cup', 'horn_cup', 'pipe', 'whistle', 'figurine', 'map_scrap', 'lost_page', 'letter', 'bell', 'shell', 'rags', 'skirt', 'trousers', 'old_coin']) if (D.items[b]) SH.junk.push(b);
  // праздничное настроение — от кукольника и плясок
  if (!D.effects.merry) D.effects.merry = { id: 'merry', n: 'Праздничное настроение', kind: 'bless', d: 'На душе светло: удача ходит рядом, а усталость не берёт.', mods: { luck: 2, wil: 1 } };

  // ---------- барахолка: ношеное оружие и одежда ----------
  const ss0 = Dlg.shopStock;
  Dlg.shopStock = function (e, kind) {
    const fresh = !(G.S.shops && G.S.shops[(e.npc != null ? e.npc : 'g' + e.ghostShop) + ':' + kind]) || (Time.day(G.S.time) - G.S.shops[(e.npc != null ? e.npc : 'g' + e.ghostShop) + ':' + kind].day >= 3);
    const items = ss0.apply(this, arguments);
    if (fresh && kind === 'junk') {
      const r = U.rng(G.W.seed, 'junkworn', e.ghostShop || e.npc, Time.day(G.S.time));
      const pool = ['sword', 'axe', 'mace', 'spear', 'shortsword', 'leather', 'gambeson', 'helm', 'boots', 'cloak', 'shield', 'chain', 'bow'].filter((b) => D.items[b]);
      for (let i = 0; i < r.int(1, 3); i++) {
        const it = Items.make(r.pick(pool));
        if (!it) continue;
        if (it.mw) it.wr = Math.max(1, Math.round(it.mw * (0.25 + r.next() * 0.35)));
        it.v = Math.max(1, Math.round((it.v || 1) * 0.45));
        items.push(it);
      }
    }
    return items;
  };
  // скупщик краденого берёт дороже, на ярмарке всё чуть дешевле
  const pm0 = Dlg.priceMul;
  Dlg.priceMul = function (e, b, buy) {
    let m = pm0.apply(this, arguments);
    if (e && e.fence && !buy) m *= 1.65;
    if (e && e.black && buy) m *= 1.25;
    if (e && e.fairStall && buy) m *= 0.9;
    return m;
  };

  // ---------- подпольный рынок ----------
  const WORDS = ['Сова не спит', 'Хлеб чёрствый', 'Луна в колодце', 'Крыса сыта', 'Ветер с болот', 'Кривая подкова', 'Сапог без пары', 'Рыба молчит'];
  MK.word = (sid) => WORDS[(U.hash(G.W.seed, sid, 'bmw') >>> 0) % WORDS.length];
  // где люк: у стены в бедном квартале, а в старых городах — у кожевни или барахолки
  function cellarSpot(m) {
    const ok = (x, y) => { if (x < 2 || y < 2 || x >= MW - 2 || y >= MH - 2) return false; const t = m.tiles[y * MW + x]; return (t === T.MUD || t === T.COBBLE || t === T.ROAD || t === T.RUBBLE) && !m.feat[y * MW + x] && U.DIR4.some(([dx, dy]) => [T.WALL, T.WINDOW].includes(m.tiles[(y + dy) * MW + x + dx])) && !U.DIR8.some(([dx, dy]) => [T.DOOR, T.GATE, T.WELL].includes(m.tiles[(y + dy) * MW + x + dx])); };
    const cand = [];
    if (m.spots.poor && m.spots.poor.length) for (const p of m.spots.poor) if (ok(p.x, p.y)) cand.push(p);
    if (!cand.length) for (const k of ['tannery', 'flea', 'pub', 'brewery', 'workshop']) {
      const b = m.spots[k]; if (!b || !b.rect) continue;
      const r = b.rect;
      for (let x = r.x - 1; x <= r.x + r.w; x++) for (const y of [r.y - 1, r.y + r.h]) if (ok(x, y)) cand.push({ x, y });
      for (let y = r.y; y < r.y + r.h; y++) for (const x of [r.x - 1, r.x + r.w]) if (ok(x, y)) cand.push({ x, y });
      if (cand.length) break;
    }
    if (!cand.length) return null;
    return cand[(U.hash(m.key, 'cellar') >>> 0) % cand.length];
  }
  const b0 = MG.build, pk0 = MG.parseKey;
  MG.parseKey = function (key) {
    if (typeof key === 'string' && key.startsWith('cel:')) return { t: 'cel', s: +key.split(':')[1] };
    return pk0.apply(this, arguments);
  };
  MG.build = function (key) {
    if (typeof key === 'string' && key.startsWith('cel:')) return buildCellar(key);
    const m = b0.apply(this, arguments);
    try {
      if (m && m.kind === 'over' && m.sett >= 0 && !m.dimName) {
        const s = G.W.settlements[m.sett];
        if (s && (s.type === 'town' || s.type === 'capital')) {
          const p = cellarSpot(m);
          if (p) { m.tiles[p.y * MW + p.x] = T.DOWN; m.feat[p.y * MW + p.x] = { k: 'link', to: 'cel:' + s.id, name: 'люк в подвал', cellar: s.id }; m.spots.cellar = p; }
        }
      }
    } catch (e) { console.warn('cellar', e); }
    return m;
  };
  function buildCellar(key) {
    const sid = +key.split(':')[1];
    const m = MG.newMap(key, 'cel');
    m.outdoor = false; m.dark = true; m.biome = 'dungeon'; m.cellar = sid; m.depth = 1; m.spawn = { biome: 'cellar', danger: 0 };
    m.tiles.fill(T.CAVEWALL);
    const r = U.rng(G.W.seed, 'cellar', sid);
    const w = 26, h = 11, x0 = (MW - w) >> 1, y0 = (MH - h) >> 1;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) m.tiles[y * MW + x] = (x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1) ? T.WALL : T.STONEFLOOR;
    const set = (x, y, t) => { m.tiles[y * MW + x] = t; };
    // лестница наверх
    const ux = x0 + 2, uy = y0 + h - 2;
    set(ux, uy, T.UP); m.feat[uy * MW + ux] = { k: 'link', to: 'ret', name: 'лестница наверх' };
    m.entry = { x: ux + 1, y: uy };
    // столбы, бочки, ящики
    for (let x = x0 + 6; x < x0 + w - 3; x += 6) { set(x, y0 + 3, T.PILLAR); set(x, y0 + h - 4, T.PILLAR); }
    for (const [x, y] of [[x0 + 1, y0 + 1], [x0 + 2, y0 + 1], [x0 + w - 2, y0 + 1], [x0 + w - 2, y0 + 2], [x0 + w - 2, y0 + h - 2], [x0 + 1, y0 + 1 + 1]]) set(x, y, r.chance(0.5) ? T.BARREL : T.CRATE);
    // прилавки вдоль дальней стены
    m.stalls = m.stalls || {};
    const sx = [x0 + 6, x0 + 11, x0 + 16];
    const kinds = ['black', 'fence', 'black'];
    sx.forEach((x, k) => { set(x, y0 + 1, T.COUNTER); m.stalls[(y0 + 1) * MW + x] = kinds[k]; });
    // стол для костей и очаг
    set(x0 + 13, y0 + 6, T.TABLE); m.feat[(y0 + 6) * MW + x0 + 13] = { k: 'dice' };
    for (const [dx, dy] of [[-1, 0], [1, 0]]) set(x0 + 13 + dx, y0 + 6 + dy, T.CHAIR);
    set(x0 + w - 2, y0 + 5, T.HEARTH);
    for (let x = x0 + 4; x < x0 + 10; x++) if (m.tiles[(y0 + 6) * MW + x] === T.STONEFLOOR) set(x, y0 + 6, T.RUG);
    m.cellarSpots = { fence: { x: sx[1], y: y0 + 2 }, black: { x: sx[0], y: y0 + 2 }, black2: { x: sx[2], y: y0 + 2 }, dice: { x: x0 + 13, y: y0 + 7 }, auction: { x: x0 + 20, y: y0 + 6 }, guard: { x: ux + 2, y: uy - 1 } };
    m.lights = [];
    return m;
  }
  // в подвале нет бродячих тварей и чужих жильцов
  const mf0 = Gm.monFlags;
  if (mf0) Gm.monFlags = function (m) { if (m && m.cellar != null) return { lvl: 1 }; return mf0.apply(this, arguments); };
  const pop0 = Ent.populate;
  Ent.populate = function () { if (G.map && G.map.cellar != null) return; return pop0.apply(this, arguments); };
  function mkFolk(m, x, y, o) {
    let p = null;
    for (const [dx, dy] of [[0, 0]].concat(U.DIR8)) { const q = MG.findWalkNear(m, x + dx, y + dy); if (q && !m.occ.has(q.y * m.w + q.x) && !(q.x === G.P.x && q.y === G.P.y)) { p = q; break; } }
    if (!p) return null;
    const e = Ent.npc(G.W.special.ferryman, p.x, p.y);
    Object.assign(e, { npc: null, ghost: 0, immortal: 0, ai: 'still', kind: 'npc', ch: '☺' }, o);
    Gm.addEnt(e);
    return e;
  }
  function spawnCellar(m) {
    if (!m || m.cellar == null || m.ents.some((e) => e.under)) return;
    const S = m.cellarSpots, day = Time.day(G.S.time), sid = m.cellar;
    mkFolk(m, S.fence.x, S.fence.y, { under: 1, n: 'Скупщик краденого', g: 'm', job: 'merchant', art: 'npc_hood', c: '#a09080', fence: 1, ghostShop: 'bm:f:' + sid + ':' + Math.floor(day / 3), shopKind: 'fence', greet: 'Что принёс? Не говори, откуда. Мне всё равно — а тебе спокойнее.' });
    mkFolk(m, S.black.x, S.black.y, { under: 1, n: 'Торговец запретным', g: 'f', job: 'merchant', art: 'npc_hood', c: '#9080a0', black: 1, ghostShop: 'bm:b:' + sid + ':' + Math.floor(day / 3), shopKind: 'black', greet: 'Отмычки, яды, сонное зелье. Всё, о чём наверху говорят шёпотом.' });
    mkFolk(m, S.dice.x, S.dice.y, { under: 1, n: 'Игрок в кости', g: 'm', job: 'shadow', custom: 'dice', c: '#b0a070', greet: 'Кости любят смелых. Садись — или проходи мимо.' });
    mkFolk(m, S.guard.x, S.guard.y, { under: 1, n: 'Вышибала', g: 'm', job: 'guard', c: '#8a7a6a', greet: 'Не шуми. Не задирайся. Не спрашивай. Тогда выйдешь своими ногами.' });
    const h = Time.hour(G.S.time);
    if (h >= 20 || h < 4) mkFolk(m, S.auction.x, S.auction.y, { under: 1, n: 'Торговец ночных торгов', g: 'm', job: 'merchant', art: 'npc_noble', custom: 'auction', night: 1, c: '#c0a0d0', greet: 'Тише, тише. Вещи с историей уходят быстро. Хочешь поторговаться — садись ближе.' });
  }
  // у люка: слово, монеты или сила
  const ul0 = Gm.useLink;
  Gm.useLink = function (f, x, y) {
    if (!f || f.cellar == null) return ul0.apply(this, arguments);
    const P = G.P, sid = f.cellar, m = G.map;
    P.flags.bm = P.flags.bm || {};
    const go = (txt) => { P.ret = { key: m.key, x, y }; Gm.loadMap('cel:' + sid, -1, -1, 'tp'); Gm.msg(txt || 'Ты спускаешься по скрипучей лестнице. Внизу — дым, шёпот и звон монет.', '#c0a080'); Gm.cnt('cellar_visits'); Gm.endTurn(1); };
    if (P.flags.bm[sid] === 2) return go();
    const knows = P.flags.bm[sid] === 1;
    const opts = [];
    if (knows) opts.push({ t: 'Постучать трижды и сказать: «' + MK.word(sid) + '»', f: () => { P.flags.bm[sid] = 2; go('Засов лязгает. «Свои. Проходи». Внизу — дым, шёпот и звон монет.'); } });
    opts.push({ t: 'Сунуть в щель 25 монет', f: () => { if (P.gold < 25) { Gm.msg('Монет не хватает. Глаз в щели смотрит насмешливо.', '#a09080'); return; } P.gold -= 25; P.flags.bm[sid] = 2; go('Монеты исчезают в щели. Лязгает засов: «Проходи. Здесь не шумят и не спрашивают».'); } });
    opts.push({ t: 'Надавить плечом', f: () => { if (P.st.str + Math.random() * 10 >= 17) { P.flags.bm[sid] = 2; go('Засов не выдерживает. Внизу на тебя смотрят молча — но никто не гонит. Сила здесь — тоже пропуск.'); } else { Gm.msg('Люк не поддаётся. С той стороны смеются: «Слово, дурень. Или монеты».', '#a09080'); Gm.endTurn(2); } } });
    opts.push({ t: 'Уйти', f: () => {} });
    UI.menu('Тяжёлый люк, окованный железом. Снизу — голоса и стук костей. Из щели в досках на тебя смотрит чей-то глаз.\n«Слово?»', opts);
  };
  // нищий за щедрость шепчет слово
  const City = E.City;
  if (City) City.beggarTip = function () {
    const m = G.map, P = G.P;
    if (!m || !m.spots || !m.spots.cellar) return null;
    const sid = m.sett;
    P.flags.bm = P.flags.bm || {};
    if (P.flags.bm[sid]) return 'Под городом торгуют тем, чего на рынке нет. Да ты, я гляжу, и сам[|а] знаешь.';
    P.flags.bm[sid] = 1;
    return 'В бедном квартале у стены — люк, окованный железом. Постучи трижды и скажи: «' + MK.word(sid) + '». Внизу купят что угодно и продадут что угодно. Только меня не выдавай.';
  };

  // название места наверху экрана
  const pn0 = UI.placeName;
  UI.placeName = function () {
    const m = G.map;
    if (m && m.cellar != null) { const s = G.W.settlements[m.cellar]; return 'Подпольный рынок · ' + (s ? s.nom : 'подвал'); }
    return pn0.apply(this, arguments);
  };

  // ---------- кости ----------
  MK.dice = function (e, stake) {
    const P = G.P;
    if (P.gold < stake) return 'Без ставки не играют.';
    const d = () => 1 + Math.floor(Math.random() * 6);
    const luck = (P.st.luck || 0) / 40;
    const a = [d(), d()], b = [d(), d()];
    if (Math.random() < luck && a[0] + a[1] < 9) a[1] = Math.min(6, a[1] + 2);
    const sa = a[0] + a[1], sb = b[0] + b[1];
    Gm.cnt('dice_games');
    if (sa > sb) { P.gold += stake; Gm.cnt('dice_wins'); return 'У тебя ' + a.join(' и ') + ' — ' + sa + '. У меня ' + b.join(' и ') + ' — ' + sb + '. Твоя взяла: +' + stake + ' ' + U.plural(stake, 'монета', 'монеты', 'монет') + '.'; }
    if (sa === sb) return 'По ' + sa + '. Ничья — ставки при своих.';
    P.gold -= stake; return 'У тебя ' + sa + ', у меня ' + sb + '. ' + pick(['Кости сегодня мои.', 'Не повезло. Ещё разок?', 'Удача — девка капризная.']) + ' −' + stake + '.';
  };
  const op0 = Dlg.options;
  Dlg.options = function (e) {
    if (e && e.custom === 'dice') {
      const o = [];
      for (const s of [5, 20, 50]) o.push({ t: 'Бросить кости (ставка ' + s + ')', f: () => MK.dice(e, s) });
      o.push({ t: 'Уйти', f: () => 'close' });
      return o;
    }
    if (e && e.custom === 'auction') return auctionOpts(e);
    if (e && (e.custom === 'fortune' || e.custom === 'puppets' || e.custom === 'barker')) return fairOpts(e);
    return op0.apply(this, arguments);
  };
  // кости за столом в подвале или в трактире
  const iat0 = Gm.interactAt;
  Gm.interactAt = function (x, y) {
    const m = G.map, f = m && m.feat[y * m.w + x];
    if (f && f.k === 'dice') { UI.menu('Стол, исцарапанный ножами. На нём — пара костей и кружка.', [5, 20, 50].map((s) => ({ t: 'Сыграть с завсегдатаями (ставка ' + s + ')', f: () => Gm.msg(MK.dice(null, s), '#e0d0a0') })).concat([{ t: 'Уйти', f: () => {} }])); return true; }
    return iat0.apply(this, arguments);
  };

  // ---------- аукцион ----------
  const LOTS = ['gold_ring', 'pearl_amulet', 'crystal_pendant', 'signet', 'silver_ring', 'longsword', 'crossbow', 'waraxe', 'warhammer', 'chain', 'scale', 'plate', 'furcloak', 'wool_cloak', 'frost_cloak', 'griffin_cloak', 'star_metal', 'moon_antler', 'pearl', 'lantern_crystal', 'staff_crystal', 'staff_fire', 'staff_ice', 'staff_storm', 'lute', 'dragon_egg', 'basilisk_shield', 'griffin_feather', 'gold_nugget', 'tome_time', 'tome_dream', 'tome_song', 'bottomless_bag', 'mage_satchel', 'explorer_pack'];
  const BIDDERS = ['Купец в зелёном кафтане', 'Толстый ювелир', 'Дама под вуалью', 'Старый коллекционер', 'Молчаливый наёмник', 'Приказчик из столицы', 'Монах с кошелём'];
  MK.auctionDay = function (sid, day) {
    const s = G.W.settlements[sid];
    if (!s) return false;
    const per = s.type === 'capital' ? 3 : s.type === 'town' ? 7 : 0;
    return per > 0 && (day + (U.hash(G.W.seed, sid, 'auc') >>> 0)) % per === 0;
  };
  function lots(e) {
    const day = Time.day(G.S.time);
    G.S.auc = G.S.auc || {};
    const key = (e.night ? 'n' : 'd') + ':' + (G.map.cellar != null ? G.map.cellar : G.map.sett) + ':' + day;
    if (G.S.auc[key]) return G.S.auc[key];
    for (const k in G.S.auc) if (+k.split(':')[2] < day - 3) delete G.S.auc[k];
    const r = U.rng(G.W.seed, key);
    const pool = LOTS.filter((b) => D.items[b]);
    const out = [];
    for (let i = 0; i < 3; i++) {
      const b = r.pick(pool);
      const v = (D.items[b].v || 10) * (e.night ? 0.8 : 1);
      out.push({ b, start: Math.max(5, Math.round(v * 0.45)), cap: Math.round(v * (0.8 + r.next() * 0.9)), sold: 0, who: BIDDERS[r.int(0, BIDDERS.length - 1)] });
    }
    // изредка — древняя вещь
    const arts = Object.keys(D.items).filter((b) => D.items[b].art && !G.S.taken[b] && !G.P.inv.some((i) => i.b === b));
    if (arts.length && r.chance(e.night ? 0.3 : 0.12)) { const b = r.pick(arts); out.push({ b, start: 400, cap: 900 + r.int(0, 900), sold: 0, art: 1, who: 'Старый коллекционер' }); }
    G.S.auc[key] = out;
    return out;
  }
  function auctionOpts(e) {
    const o = [];
    for (const lot of lots(e)) {
      if (lot.sold) continue;
      const nm = D.items[lot.b].n;
      o.push({ t: 'Лот: ' + nm + ' — от ' + lot.start + ' ' + U.plural(lot.start, 'монеты', 'монет', 'монет'), f: () => { UI.pop && UI.top && UI.top().name === 'dialog' && UI.pop(); bidRound(e, lot, lot.start, null); return 'close'; } });
    }
    if (!o.length) o.push({ t: 'Все лоты проданы. Приходи в следующий раз', f: () => 'close' });
    o.push({ t: 'Уйти', f: () => 'close' });
    return o;
  }
  function bidRound(e, lot, price, leader) {
    const P = G.P, nm = D.items[lot.b].n;
    const step = Math.max(2, Math.round(price * 0.1));
    const head = 'Лот: ' + nm + '. ' + (D.items[lot.b].d || '') + '\nТекущая ставка: ' + price + (leader ? ' — ' + (leader === 'P' ? 'твоя' : leader) : ' (начальная)') + '. У тебя ' + P.gold + '.';
    const opts = [];
    if (leader !== 'P') opts.push({ t: 'Поднять до ' + (leader ? price + step : price), f: () => {
      const bid = leader ? price + step : price;
      if (P.gold < bid) { Gm.msg('Столько монет у тебя нет.', '#e07070'); return bidRound(e, lot, price, leader); }
      // соперник думает
      if (bid + step <= lot.cap && Math.random() < 0.85) {
        const nb = bid + step;
        Gm.msg(lot.who + ': «' + nb + '!»', '#d8c0a0');
        return bidRound(e, lot, nb, lot.who);
      }
      // продано тебе
      P.gold -= bid; lot.sold = 1;
      const it = Gm.give(lot.b, 1, true);
      if (lot.art) G.S.taken[lot.b] = 1;
      Gm.cnt('auction_wins');
      Gm.msg('Молоток падает: «Продано! ' + U.cap(nm) + ' — за ' + bid + '». Вещь твоя.', '#e8d070');
      return null;
    } });
    opts.push({ t: leader === 'P' ? 'Ждать удара молотка' : 'Пас', f: () => {
      if (leader === 'P') { // соперник может перебить
        if (price + step <= lot.cap && Math.random() < 0.5) { Gm.msg(lot.who + ' в последний миг: «' + (price + step) + '!»', '#d8c0a0'); return bidRound(e, lot, price + step, lot.who); }
        P.gold -= price; lot.sold = 1; Gm.give(lot.b, 1, true); if (lot.art) G.S.taken[lot.b] = 1; Gm.cnt('auction_wins');
        Gm.msg('Молоток падает: «Продано! ' + U.cap(nm) + ' — за ' + price + '».', '#e8d070'); return null;
      }
      if (leader) { lot.sold = 1; Gm.msg('«Продано — ' + leader + ', за ' + price + '!»', '#a09080'); }
      return null;
    } });
    UI.menu(head, opts);
    return null;
  }
  // аукционист выходит на площадь в день торгов
  function spawnAuction(m) {
    if (!m || m.kind !== 'over' || m.sett < 0 || m.dimName) return;
    const h = Time.hour(G.S.time), day = Time.day(G.S.time);
    const on = MK.auctionDay(m.sett, day) && h >= 11 && h < 17 && !(G.S.sett[m.sett] && G.S.sett[m.sett].destroyed);
    const cur = m.ents.find((e) => e.custom === 'auction' && !e.dead);
    if (!on) { if (cur) Gm.removeEnt(cur); return; }
    if (cur) return;
    const b = m.spots.market && m.spots.market.in ? m.spots.market.in[0] : null;
    const c = b || m.settCenter || { x: m.w >> 1, y: m.h >> 1 };
    const e = mkFolk(m, c.x + 1, c.y, { n: 'Аукционист', g: 'm', job: 'merchant', art: 'npc_noble', custom: 'auction', c: '#e0c080', immortal: 1, greet: 'Торги открыты! Редкие вещи — тому, кто не пожалеет монет. Кто больше?' });
    if (e && !m._aucMsg) { m._aucMsg = day; Gm.msg('На площади — аукцион! Глашатай выкликает лоты.', '#e8d070'); }
  }

  // ---------- ярмарка ----------
  MK.fairDay = function (sid, day) {
    const s = G.W.settlements[sid];
    if (!s || !['capital', 'town', 'village'].includes(s.type)) return false;
    return (day + (U.hash(G.W.seed, sid, 'fair') >>> 0)) % 14 < 2;
  };
  const FAIRV = [
    ['caravan', 'Заморский купец', 'npc_trader'], ['fair_cloth', 'Суконщица', 'npc_f'], ['fair_arms', 'Оружейник с обозом', 'npc_smith'], ['hunter', 'Скорняк', 'npc_hunter'],
    ['herbs', 'Травница с возом', 'npc_healer'], ['trinkets', 'Коробейник', 'npc_trader'], ['pies', 'Пирожница', 'npc_f'], ['sbiten', 'Сбитенщик', 'npc_m'], ['eastfood', 'Повар с Востока', 'npc_hat'], ['nuts', 'Продавец орехов', 'npc_m'],
  ];
  // раскладки ярмарки: широкая — для сёл, узкая полоса — вдоль городской стены
  const LAY = {
    h: { w: 11, h: 7, stalls: [[2, 1], [5, 1], [8, 1], [2, 5], [5, 5], [8, 5]], vend: [[2, 0], [5, 0], [8, 0], [2, 6], [5, 6], [8, 6]], tents: [[0, 0], [10, 0], [0, 6], [10, 6]], pole: [5, 3], lights: [[1, 3], [9, 3]], banners: [[3, 0], [7, 6]], cart: [10, 3], folk: { fortune: [3, 3], puppets: [7, 3], barker: [5, 2] } },
    v: { w: 5, h: 11, stalls: [[1, 2], [1, 5], [1, 8], [3, 2], [3, 5], [3, 8]], vend: [[0, 2], [0, 5], [0, 8], [4, 2], [4, 5], [4, 8]], tents: [[0, 0], [4, 0], [0, 10], [4, 10]], pole: null, lights: [[0, 3], [4, 6]], banners: [[0, 1], [4, 9]], cart: null, folk: { fortune: [1, 3], puppets: [3, 7], barker: [3, 0] } },
  };
  function fairArea(m) {
    const sr = m.settRect; if (!sr) return null;
    // поляна под ярмарку: трава, кусты и редкие деревья (их на два дня «вырубят»), но не дороги, вода и дома
    const okc = (x, y) => { if (x < 2 || y < 2 || x >= MW - 2 || y >= MH - 2) return 0; const i = y * MW + x, t = TL[m.tiles[i]]; if (m.feat[i] || (m.stalls && m.stalls[i]) || t.water || t.link || t.indoor || (m.reserve && m.reserve[i] === 2)) return 0; if ([T.ROAD, T.COBBLE, T.DOOR, T.GATE, T.BRIDGE, T.DOCK, T.FIELD, T.WALL, T.TOWNWALL, T.PALISADE, T.MOUNTAIN, T.PEAK, T.CAVEWALL].includes(m.tiles[i])) return 0; return t.walk ? 2 : (t.wood || [T.BUSH, T.BOULDER, T.STONES].includes(m.tiles[i])) ? 1 : 0; };
    for (const lk of ['h', 'v']) {
      const L = LAY[lk];
      const fits = (x0, y0) => { let w = 0; for (let y = y0; y < y0 + L.h; y++) for (let x = x0; x < x0 + L.w; x++) { const k = okc(x, y); if (!k) return false; if (k === 2) w++; } return w >= L.w * L.h * 0.62; };
      const cand = [];
      for (let y = 2; y <= MH - 2 - L.h; y++) for (let x = 2; x <= MW - 2 - L.w; x++) { if (x + L.w > sr.x - 1 && x < sr.x + sr.w + 1 && y + L.h > sr.y - 1 && y < sr.y + sr.h + 1) continue; cand.push([x, y, Math.abs(x + L.w / 2 - (sr.x + sr.w / 2)) / 2 + Math.abs(y + L.h / 2 - (sr.y + sr.h / 2))]); }
      cand.sort((a, b) => a[2] - b[2]);
      for (const [x, y] of cand.slice(0, 1200)) if (fits(x, y)) return { x, y, L: lk };
    }
    return null;
  }
  function fairOn(m) {
    if (m._fair) return;
    const a = fairArea(m);
    const F = m._fair = { cells: [], stalls: [], a };
    if (!a) return;
    const L = LAY[a.L];
    const put = (x, y, t, stall) => { const i = y * MW + x; F.cells.push([i, m.tiles[i]]); m.tiles[i] = t; if (stall) { m.stalls[i] = stall; F.stalls.push(i); } };
    const gnd = m.biome === 'desert' ? T.SAND : m.biome === 'tundra' || m.biome === 'ice' ? T.SNOW : T.GRASS;
    for (let y = a.y; y < a.y + L.h; y++) for (let x = a.x; x < a.x + L.w; x++) if (!TL[m.tiles[y * MW + x]].walk) put(x, y, gnd);
    const kinds = FAIRV.map((v) => v[0]);
    const r = U.rng(m.key, 'fairstall', Time.day(G.S.time));
    r.shuffle(kinds);
    // ряды прилавков, шатры по углам, столб, фонари и знамёна
    L.stalls.forEach(([dx, dy], k) => put(a.x + dx, a.y + dy, T.STALL, kinds[k % kinds.length]));
    for (const [dx, dy] of L.tents) put(a.x + dx, a.y + dy, T.TENT);
    if (L.pole) put(a.x + L.pole[0], a.y + L.pole[1], T.MAYPOLE);
    for (const [dx, dy] of L.lights) put(a.x + dx, a.y + dy, T.PLANTERN);
    for (const [dx, dy] of L.banners) put(a.x + dx, a.y + dy, T.BANNER);
    if (L.cart) put(a.x + L.cart[0], a.y + L.cart[1], T.CART);
    F.vend = kinds;
    // кто стоял на месте шатра — отходит в сторону
    for (const e of m.ents) {
      if (e.dead || TL[m.tiles[e.y * MW + e.x]].walk) continue;
      const p = MG.findWalkNear(m, e.x, e.y);
      if (!p || m.occ.has(p.y * MW + p.x)) continue;
      if (m.occ.get(e.y * MW + e.x) === e) m.occ.delete(e.y * MW + e.x);
      e.x = p.x; e.y = p.y; m.occ.set(p.y * MW + p.x, e); e.path = null;
    }
  }
  function fairOff(m) {
    const F = m._fair; if (!F) return;
    for (const [i, t] of F.cells.reverse()) m.tiles[i] = t;
    for (const i of F.stalls) delete m.stalls[i];
    for (const e of m.ents.slice()) if (e.fair) Gm.removeEnt(e);
    m._fair = null;
    if (UI.V3 && UI.V3.invalidate) UI.V3.invalidate();
  }
  MK.fair = function (m) {
    if (!m || m.kind !== 'over' || m.sett < 0 || m.dimName) return;
    const day = Time.day(G.S.time), h = Time.hour(G.S.time);
    const on = MK.fairDay(m.sett, day) && h >= 7 && h < 21 && !(G.S.sett[m.sett] && G.S.sett[m.sett].destroyed);
    if (!on) { if (m._fair) fairOff(m); return; }
    const fresh = !m._fair;
    fairOn(m);
    const F = m._fair;
    if (!F.a) return;
    if (fresh && F.cells.length && UI.V3 && UI.V3.invalidate) UI.V3.invalidate();
    // за прилавками — купцы, между рядами — гадалка, кукольник и зазывала
    if (!m.ents.some((e) => e.fair)) {
      const a = F.a, L = LAY[a.L];
      L.vend.forEach(([dx, dy], k) => {
        const kind = F.vend[k % F.vend.length], v = FAIRV.find((q) => q[0] === kind);
        mkFolk(m, a.x + dx, a.y + dy, { fair: 1, fairStall: 1, n: v[1], art: v[2], g: /ца$|ица$|ня$/.test(v[1]) ? 'f' : 'm', job: 'merchant', merchant: 1, ghostShop: 'fair:' + m.key + ':' + kind + ':' + day, shopKind: kind, c: '#e0b070', greet: pick(['Подходи, не стесняйся! Ярмарка раз в две недели — такого товара больше не будет!', 'Со всех земель везли — тебе в руки!', 'Торгуемся, торгуемся! Цена ярмарочная!']) });
      });
      const fo = L.folk;
      mkFolk(m, a.x + fo.fortune[0], a.y + fo.fortune[1], { fair: 1, n: 'Гадалка', g: 'f', art: 'npc_hood', custom: 'fortune', c: '#c090d0', greet: 'Позолоти ручку — скажу, что было и что будет.' });
      mkFolk(m, a.x + fo.puppets[0], a.y + fo.puppets[1], { fair: 1, n: 'Кукольник', g: 'm', art: 'npc_bard', custom: 'puppets', c: '#e0a060', greet: 'Представление! Храбрый рыцарь и глупый дракон! Две монеты — и смейся до слёз!' });
      mkFolk(m, a.x + fo.barker[0], a.y + fo.barker[1], { fair: 1, n: 'Зазывала', g: 'm', art: 'npc_bard', custom: 'barker', c: '#f0d080', greet: 'Ярмарка! Ярмарка! Кто силён — поднимай бочку, кто удачлив — бросай кости!' });
    }
    if (fresh) Gm.msg('Ярмарка! За околицей — шатры и прилавки, зазывалы кричат наперебой.', '#f0d080');
  };
  function fairOpts(e) {
    const P = G.P, o = [];
    if (e.custom === 'fortune') o.push({ t: 'Погадать (5 монет)', f: () => {
      if (P.gold < 5) return 'Без монеты судьба молчит, милок.';
      P.gold -= 5;
      const near = Gm.nearPaths ? Gm.nearPaths() : [];
      if (near.length && Math.random() < 0.6) { const id = near[Math.floor(Math.random() * near.length)], c = D.classes[id]; P.omens = P.omens || {}; P.omens[id] = P.omens[id] || { t: G.S.time, where: 'гадалка' }; const h = Gm.pathHint ? Gm.pathHint(id) : null; return 'Карты говорят... «' + c.d + '» Твоя дорога.' + (h ? ' Тебе надо ' + h + '.' : ''); }
      return pick(['Вижу дальнюю дорогу и казённый дом. Или трактир. Карты путаются.', 'Вижу человека с тёмными глазами. Он думает о тебе — к добру ли, не скажу.', 'Вижу деньги. Много. Потом — мало. Потом снова много. Держи кошелёк крепче.', 'Вижу огонь и воду. Выбирай воду.']);
    } });
    if (e.custom === 'puppets') o.push({ t: 'Посмотреть представление (2 монеты)', f: () => {
      if (P.gold < 2) return 'Две монеты, добрый человек. Куклам тоже есть надо.';
      P.gold -= 2; Gm.fx('merry', 60 * 8); Gm.cnt('puppet_shows'); Gm.endTurn(10);
      return pick(['Рыцарь лупит дракона деревянным мечом, дракон обиженно пищит. Толпа хохочет — и ты вместе с ней.', 'Кукла-король теряет корону, кукла-шут её находит и становится королём. Дети визжат от восторга.', 'Жадный купец прячет золото в сапог и бегает по сцене босиком. Смешно — до слёз.']);
    } });
    if (e.custom === 'barker') {
      o.push({ t: 'Что тут есть?', f: () => 'Купцы со всех земель! Гадалка! Кукольник! А кто силён — к бочке, кто удачлив — к костям, под навесом!' });
      o.push({ t: 'Сыграть в кости с зазывалой (ставка 10)', f: () => MK.dice(e, 10) });
      o.push({ t: 'Поднять бочку на спор (ставка 10)', f: () => {
        G.S.fairStr = G.S.fairStr || {};
        if (G.S.fairStr[Gm.day()]) return 'Ты уже пробовал[|а] сегодня. Дай и другим!';
        if (P.gold < 10) return 'Без ставки — какой спор?';
        G.S.fairStr[Gm.day()] = 1;
        if (P.st.str + Math.random() * 10 >= 14) { P.gold += 20; Gm.xp && Gm.xp(15); Gm.cnt('fair_wins'); return 'Бочка взлетает над головой! Толпа ревёт. Двадцать монет — твои!'; }
        P.gold -= 10; return 'Бочка не поддаётся. Толпа сочувственно гудит. Приходи на следующую ярмарку!';
      } });
    }
    o.push({ t: 'Уйти', f: () => 'close' });
    return o;
  }

  // ---------- когда что открывается ----------
  const lm0 = Gm.loadMap;
  Gm.loadMap = function () {
    const r = lm0.apply(this, arguments);
    try { const m = G.map; spawnCellar(m); spawnAuction(m); MK.fair(m); } catch (e) { console.warn('markets', e); }
    return r;
  };
  const hr0 = Ent.hourly;
  Ent.hourly = function () {
    const r = hr0.apply(this, arguments);
    try { const m = G.map; spawnAuction(m); MK.fair(m); if (m && m.cellar != null) { const h = Time.hour(G.S.time); const na = m.ents.find((e) => e.custom === 'auction'); if ((h >= 20 || h < 4) && !na) mkFolk(m, m.cellarSpots.auction.x, m.cellarSpots.auction.y, { under: 1, n: 'Торговец ночных торгов', g: 'm', job: 'merchant', art: 'npc_noble', custom: 'auction', night: 1, c: '#c0a0d0' }); else if (na && h >= 4 && h < 20) Gm.removeEnt(na); } } catch (e) { /* */ }
    return r;
  };
  // уходя с карты, ярмарочные шатры не остаются в кэше навсегда
  const lv0 = Gm.leaveMap;
  Gm.leaveMap = function () { try { if (G.map && G.map._fair) fairOff(G.map); } catch (e) { /* */ } return lv0.apply(this, arguments); };
})(window.EOF);
