'use strict';
// Долыни — молочные животные. У каждой земли своя порода: луговая, лесная, горная, песчаная,
// снежная, болотная, огненная. Их доят: можно напиться парного молока прямо на месте (жажда уходит)
// или надоить в кринку про запас. У каждой породы молоко с характером.
// Дикие долыни пугливы — сначала покорми. Деревенские — чьи-то: чужую доить при хозяевах не стоит.
// А можно завести свою ферму: купить загон у пахаря или пастуха и долыней к нему —
// пастух присмотрит за стадом и сохранит надоенное до твоего возвращения.
(function (E) {
  const U = E.U, D = E.D, G = E.G, Gm = E.Gm, Dlg = E.Dlg, UI = E.UI, RT = E.RT, TL = E.TL, Ent = E.Ent;
  const DY = E.Dolyni = {};
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  // ---------- породы ----------
  const BR = DY.BREEDS = {
    meadow: { n: 'Луговая долынь', acc: 'луговую долынь', c: '#e8dcc8', bi: ['plains', 'coast'], milk: 'milk_meadow', d: 'Пятнистая, смирная, пахнет клевером.' },
    forest: { n: 'Лесная долынь', acc: 'лесную долынь', c: '#8a6a4a', bi: ['forest', 'ancient'], milk: 'milk_forest', d: 'Бурая, с рожками-веточками. Ест хвою и мох.' },
    mountain: { n: 'Горная долынь', acc: 'горную долынь', c: '#b8b0a0', bi: ['mountain', 'living'], milk: 'milk_mountain', d: 'Лохматая, с крутыми рогами. Карабкается по скалам.' },
    sand: { n: 'Песчаная долынь', acc: 'песчаную долынь', c: '#d8b880', bi: ['desert', 'ash'], milk: 'milk_sand', d: 'Горбатая и длинноногая. Неделю может не пить.' },
    snow: { n: 'Снежная долынь', acc: 'снежную долынь', c: '#f0f0f4', bi: ['tundra', 'ice'], milk: 'milk_snow', d: 'Белая, в густой шерсти. Спит прямо в сугробе.' },
    bog: { n: 'Болотная долынь', acc: 'болотную долынь', c: '#6a7a5a', bi: ['swamp'], milk: 'milk_bog', d: 'Зеленоватая, с перепонками на копытах.' },
    ember: { n: 'Огненная долынь', acc: 'огненную долынь', c: '#8a3a2a', bi: ['volcanic'], milk: 'milk_ember', d: 'Тёмно-рыжая, тёплая на ощупь. Греется у лавы.' },
  };
  const NAMES = ['Зорька', 'Бурёнка', 'Пеструшка', 'Ночка', 'Звёздочка', 'Ласточка', 'Милка', 'Майка', 'Дочка', 'Кудряшка', 'Снежинка', 'Ромашка', 'Белянка', 'Мурка', 'Голубка', 'Рыжуха', 'Тучка', 'Малинка'];
  // дикие — в своих землях; бодаются слабо, убегают
  for (const k in BR) {
    const b = BR[k];
    D.mons['dol_' + k] = { id: 'dol_' + k, n: b.n, acc: b.acc, ch: 'q', c: b.c, hp: 16, a: [1, 3], d: 1, dg: 5, sp: 9, xp: 2, tags: ['beast', 'animal', 'dolyn'], bi: b.bi, ai: 'passive', v: 'бодает', drops: [['meat_raw', 1], ['hide', 0.6]], breed: k };
  }
  const breedOf = (e) => e.breed || (D.mons[e.tpl] && D.mons[e.tpl].breed) || null;
  DY.isDolyn = (e) => !!(e && !e.dead && e.tags && e.tags.includes('dolyn'));
  // порода здешних мест
  DY.breedFor = function (biome) { for (const k in BR) if (BR[k].bi.includes(biome)) return k; return 'meadow'; };

  // ---------- молоко ----------
  // свойства: жажда, сытость и особое
  const FX = {
    milk_forest: () => { Gm.fx('regenbuff', 120); return 'По телу разливается лесная прохлада. Ссадины затягиваются.'; },
    milk_mountain: () => { Gm.fx('might', 90); return 'Густое, жирное. В руках прибавилось силы.'; },
    milk_sand: () => 'Солоноватое. Жажда отступает надолго.',
    milk_snow: () => { Gm.fx('warmth', 240); if (Gm.rmFx) Gm.rmFx('cold'); return 'Ледяное — а внутри разгорается тепло.'; },
    milk_bog: () => { if (Gm.rmFx) Gm.rmFx('poison'); return 'Зеленоватое, горчит. Яд из крови уходит.'; },
    milk_ember: () => { Gm.fx('haste', 60); Gm.fx('warmth', 120); return 'Тёплое, с искрой. Ноги сами просятся в путь.'; },
    milk_meadow: () => { Gm.fx('content', 120); return 'Сладкое, пахнет клевером. Хорошо.'; },
  };
  const eat0 = Gm.eat;
  Gm.eat = function (it) {
    const r = eat0.apply(this, arguments);
    if (it && FX[it.b] && !G.P.dead) Gm.msg(FX[it.b](), '#e8e0d0');
    return r;
  };
  // напиться прямо из-под долыни
  function drinkFresh(e) {
    const b = BR[breedOf(e)] || BR.meadow, mid = b.milk, d = D.items[mid] || {};
    Gm.thirstAdd(Math.min(-40, (d.thirst || -40) - 10));
    G.P.hunger = Math.min(100, (G.P.hunger || 0) + 8);
    Gm.cnt('milk_drunk');
    const s = FX[mid] ? FX[mid]() : '';
    return 'Ты пьёшь парное молоко прямо из ладоней. ' + s;
  }

  // ---------- чья долынь, готова ли ----------
  const herdKey = (e) => (e.own === 'P' ? null : e.hk);
  function milkT(e) {
    if (e.own === 'P') { const h = G.P.farm && G.P.farm.herd[e.hi]; return h ? h.mt || -1e9 : -1e9; }
    const k = herdKey(e);
    if (k) { G.S.dolyn = G.S.dolyn || {}; return G.S.dolyn[k] || -1e9; }
    return e.mt || -1e9;
  }
  function setMilkT(e, t) {
    if (e.own === 'P') { const h = G.P.farm && G.P.farm.herd[e.hi]; if (h) h.mt = t; return; }
    const k = herdKey(e);
    if (k) { G.S.dolyn = G.S.dolyn || {}; G.S.dolyn[k] = t; return; }
    e.mt = t;
  }
  DY.ready = (e) => G.S.time - milkT(e) >= 6 * 60;
  DY.nameOf = function (e) {
    if (e.own === 'P') { const h = G.P.farm.herd[e.hi]; return (h && h.name ? h.name + ', ' : '') + (BR[breedOf(e)] || BR.meadow).n.toLowerCase(); }
    return e.n;
  };
  // кто видит, как ты доишь чужую
  function witness(e) {
    const m = G.map;
    for (const o of m.ents) if (o.kind === 'npc' && !o.dead && !o.asleep && o.npc != null && U.dist(o.x, o.y, G.P.x, G.P.y) <= 7 && E.FOV.los(m, o.x, o.y, G.P.x, G.P.y)) return o;
    return null;
  }

  // ---------- окно у долыни ----------
  UI.dolyn = function (e) {
    const b = BR[breedOf(e)] || BR.meadow;
    const wild = e.own == null, mine = e.own === 'P';
    const head = () => {
      const st = DY.ready(e) ? 'Вымя полное.' : 'Её уже доили — подожди несколько часов.';
      const who = mine ? 'Твоя.' : wild ? 'Дикая: пугливая, к рукам не привыкла' + (e.tame ? ', но тебя уже не боится.' : '.') : 'Деревенская — у неё есть хозяева.';
      return b.d + ' ' + who + ' ' + st;
    };
    const out = (s, c) => { Gm.msg(s, c || '#e8e0d0'); };
    // дикая может лягнуть и убежать
    const calm = () => {
      if (!wild || e.tame >= 2) return true;
      const p = 0.35 + (e.tame || 0) * 0.25 + ((G.P.st && G.P.st.dex) || 5) * 0.02;
      if (Math.random() < p) return true;
      out('Долынь фыркает, лягается и отбегает.', '#c0a080');
      e.feared = G.turn + 12;
      return false;
    };
    const steal = () => {
      if (wild || mine) return;
      const w = witness(e);
      if (w) { Gm.op(w.npc, -6); out(Dlg.label(w) + ': «Эй! Это не твоя долынь!»', '#f0a080'); if (E.Social) E.Social.note(w.npc, 'Видел{|а}, как ты доил[|а] чужую долынь.'); }
    };
    UI.list({
      title: DY.nameOf(e), w: 66, name: 'dolyn',
      header: head,
      items: () => {
        const it = [];
        const ready = DY.ready(e);
        it.push({ t: 'Напиться парного молока', disabled: !ready, f: () => { if (!calm()) return; steal(); setMilkT(e, G.S.time); out(drinkFresh(e)); Gm.endTurn(3); } });
        it.push({ t: 'Подоить в кринку', disabled: !ready, f: () => {
          if (!calm()) return;
          steal(); setMilkT(e, G.S.time);
          const n = mine ? 2 : 1;
          Gm.give(b.milk, n, true); Gm.cnt('milked');
          out('Тёплые струйки звенят о стенки кринки. В сумке прибавилось: ' + D.items[b.milk].n.toLowerCase() + (n > 1 ? ' — две кринки' : '') + '.');
          Gm.endTurn(5);
        } });
        const food = G.P.inv.find((x) => ['bread', 'apple', 'berries', 'hay', 'cheese', 'pie'].includes(x.b));
        if (food) it.push({ t: 'Покормить (' + (D.items[food.b] || food).n.toLowerCase() + ')', f: () => {
          Gm.take(food.b, 1); e.tame = (e.tame || 0) + 1; e.feared = 0;
          if (!DY.ready(e) && Math.random() < 0.4) setMilkT(e, G.S.time - 6 * 60);
          out(pick(['Долынь хрустит угощением и тычется мордой тебе в ладонь.', 'Тёплые губы аккуратно берут еду с руки.', 'Долынь довольно мычит и машет хвостом.']));
          return 'keep';
        } });
        it.push({ t: 'Погладить', f: () => { e.tame = Math.max(e.tame || 0, wild ? (e.tame || 0) + (Math.random() < 0.4 ? 1 : 0) : 2); out(pick(['Шерсть тёплая и пахнет травой.', 'Долынь прикрывает глаза и шумно вздыхает.', 'Она толкает тебя лбом — ещё, мол.'])); return 'keep'; } });
        if (wild && (e.tame || 0) >= 2 && G.P.farm) it.push({ t: 'Увести на свою ферму', f: () => DY.adopt(e) });
        if (mine) it.push({ t: 'Дать кличку', f: () => { const h = G.P.farm.herd[e.hi]; h.name = pick(NAMES.filter((x) => !G.P.farm.herd.some((q) => q.name === x))) || pick(NAMES); out('Теперь её зовут ' + h.name + '.'); return 'keep'; } });
        it.push({ t: 'Отойти', f: () => null });
        return it;
      },
    });
  };
  // дикую — к себе на ферму
  DY.adopt = function (e) {
    const F = G.P.farm;
    if (!F) return;
    if (F.herd.length >= F.cap) { Gm.msg('Загон полон.', '#c0a080'); return; }
    F.herd.push({ breed: breedOf(e), name: pick(NAMES), mt: -1e9, t: G.S.time });
    Gm.removeEnt(e);
    Gm.msg('Долынь послушно уходит за тобой — пастух ' + G.W.settlements[F.sett].gen + ' встретит её у загона.', '#c8e0a0');
    Gm.cnt('dolyn_tamed');
  };

  // ---------- от первого лица: «[E] Подоить» ----------
  const ff0 = RT.findFocus;
  RT.findFocus = function () {
    ff0.apply(this, arguments);
    const P = G.P, m = G.map, V3 = UI.V3;
    if (!m || !P || !RT.is3D() || P.posX == null || (G.focus && G.focus.kind === 'talk')) return;
    const fx = Math.sin(V3.yaw), fz = -Math.cos(V3.yaw);
    let best = null, bs = 1e9;
    for (const e of m.ents) {
      if (!DY.isDolyn(e) || e.hostile) continue;
      const s = UI.trackPos ? UI.trackPos(e) : [e.x, e.y];
      const dx = s[0] + 0.5 - P.posX, dz = s[1] + 0.5 - P.posY, d = Math.hypot(dx, dz);
      if (d > 1.9) continue;
      const a = d < 0.35 ? 0 : Math.acos(U.clamp((dx * fx + dz * fz) / d, -1, 1));
      if (a > 0.85 && d > 0.75) continue;
      const sc = a * 1.4 + d * 0.45;
      if (sc < bs) { bs = sc; best = e; }
    }
    if (best && (!G.focus || bs < 1.2)) G.focus = { x: best.x, y: best.y, e: best, kind: 'dolyn' };
  };
  const fl0 = UI.focusLabel;
  UI.focusLabel = function () {
    const f = G.focus;
    if (f && f.kind === 'dolyn' && f.e) return (DY.ready(f.e) ? 'Подоить: ' : 'Погладить: ') + (f.e.own === 'P' ? DY.nameOf(f.e) : DY.nameOf(f.e).toLowerCase());
    return fl0.apply(this, arguments);
  };
  const int0 = Gm.interact;
  Gm.interact = function () {
    const f = G.focus;
    if (RT.is3D() && f && f.kind === 'dolyn' && DY.isDolyn(f.e)) { UI.dolyn(f.e); return; }
    if (!RT.is3D()) {
      // по клеткам: долынь рядом, а людей рядом нет
      const P = G.P;
      let dol = null, npc = false;
      for (const [dx, dy] of U.DIR8) { const o = Gm.entAt(P.x + dx, P.y + dy); if (!o) continue; if (o.kind === 'npc' && !o.hostile) npc = true; if (DY.isDolyn(o)) dol = o; }
      if (dol && !npc) { UI.dolyn(dol); return; }
    }
    return int0.apply(this, arguments);
  };
  // дикие долыни не нападают в ответ, а убегают (кроме огненной)
  const hurt0 = E.Combat.hurtEnt;
  E.Combat.hurtEnt = function (e, dmg) {
    const r = hurt0.apply(this, arguments);
    if (DY.isDolyn(e) && !e.dead) {
      e.feared = G.turn + 20;
      if (e.own != null && e.own !== 'P') { const w = witness(e); if (w) { Gm.op(w.npc, -10); Gm.msg(Dlg.label(w) + ': «Ты что творишь?! Это наша долынь!»', '#f08a7a'); } }
    }
    return r;
  };

  // ---------- стада в деревнях и твоя ферма ----------
  function spotNear(m, cx, cy, r0, r1) {
    for (let t = 0; t < 80; t++) {
      const a = Math.random() * Math.PI * 2, rr = r0 + Math.random() * (r1 - r0);
      const x = Math.round(cx + Math.cos(a) * rr), y = Math.round(cy + Math.sin(a) * rr);
      if (x < 1 || y < 1 || x >= m.w - 1 || y >= m.h - 1) continue;
      const tl = TL[m.tiles[y * m.w + x]];
      if (!tl.walk || tl.indoor || tl.water || tl.link || m.occ.has(y * m.w + x)) continue;
      if (U.dist(x, y, G.P.x, G.P.y) < 3) continue;
      return { x, y };
    }
    return null;
  }
  function addDolyn(m, breed, x, y, o) {
    const e = Ent.mon('dol_' + breed, 1, x, y, Object.assign({ breed }, o || {}));
    if (!e) return null;
    return Gm.addEnt(e);
  }
  const load0 = Gm.loadMap;
  Gm.loadMap = function () {
    const r = load0.apply(this, arguments);
    try { DY.populate(); } catch (err) { console.warn('dolyni', err); }
    return r;
  };
  DY.populate = function () {
    const m = G.map, P = G.P;
    if (!m || m.sett == null || m.sett < 0 || m.kind === 'dun' || m.dim) return;
    const s = G.W.settlements[m.sett], ss = G.S.sett[m.sett];
    if (!s || (ss && ss.destroyed) || ['sea', 'vanish', 'tree'].includes(s.type)) return;
    const c = m.settCenter || { x: m.w >> 1, y: m.h >> 1 };
    const breed = DY.breedFor(m.biome || (m.region && m.region.biome));
    // деревенское стадо
    const n = { farm: 5, hamlet: 3, village: 3, town: 2, capital: 1 }[s.type] || 0;
    for (let i = 0; i < n; i++) {
      const p = spotNear(m, c.x, c.y, 7, 16);
      if (p) addDolyn(m, breed, p.x, p.y, { own: m.sett, hk: 's' + m.sett + '_' + i, n: BR[breed].n });
    }
    // твоя ферма
    const F = P.farm;
    if (F && F.sett === m.sett) {
      F.herd.forEach((h, i) => {
        const p = spotNear(m, c.x + 4, c.y + 3, 3, 9);
        if (p) addDolyn(m, h.breed, p.x, p.y, { own: 'P', hi: i, n: (h.name ? h.name + ', ' : '') + BR[h.breed].n.toLowerCase(), c: BR[h.breed].c });
      });
    }
  };
  // пастух копит надоенное, пока тебя нет: по кринке с долыни в день
  DY.collect = function () {
    const F = G.P.farm;
    if (!F) return 0;
    const days = Math.floor((G.S.time - (F.ct || F.t)) / 1440);
    if (days <= 0) return 0;
    F.ct = (F.ct || F.t) + days * 1440;
    const add = Math.min(F.herd.length * days, 30 - (F.jugs || []).length);
    F.jugs = F.jugs || [];
    for (let i = 0; i < add; i++) F.jugs.push(BR[F.herd[i % F.herd.length].breed].milk);
    return add;
  };

  // ---------- у пахаря и пастуха: загон, долыни, надоенное ----------
  const FARM_PRICE = 150, DOL_PRICE = 60;
  const opts0 = Dlg.options;
  Dlg.options = function (e) {
    const opts = opts0.apply(this, arguments);
    const id = e.npc;
    if (id == null || e.asleep || e.hostile || e.ghost) return opts;
    const job = E.Sim.job(id), sid = E.Sim.settOf(id);
    if (!['farmer', 'shepherd'].includes(job) || sid < 0) return opts;
    const P = G.P, F = P.farm, at = Math.max(0, opts.findIndex((o) => o.t === 'Подарить...'));
    const add = [];
    const breed = DY.breedFor(G.W.regions[G.W.settlements[sid].region].biome), b = BR[breed];
    const C1 = '#e8d8a0';
    if (!F) add.push({ t: 'Купить загон для долыней (' + Gm.money(FARM_PRICE, true) + ')', c: C1, f: () => {
      if (P.gold < FARM_PRICE) return 'Загон — это забор, навес, корыто и мой присмотр. Без денег — никак.';
      P.gold -= FARM_PRICE;
      P.farm = { sett: sid, herd: [], cap: 6, t: G.S.time, ct: G.S.time, jugs: [], keeper: id };
      Gm.cnt('farms'); Gm.op(id, 8);
      Gm.chron && Gm.chron(Gm.fmt(P.name + ' завел[|а] ферму ' + G.W.settlements[sid].loc + '.'), { k: 'small' });
      return Gm.fmt('По рукам! Загон за моим двором — твой. Приводи долыней, а я пригляжу и подою, пока тебя нет.', Gm.npc(id));
    } });
    if (F && F.sett === sid) {
      if (F.herd.length < F.cap) add.push({ t: 'Купить ' + b.acc + ' (' + Gm.money(DOL_PRICE, true) + ')', c: C1, f: () => {
        if (P.gold < DOL_PRICE) return 'Долынь — не курица. Подкопи монет.';
        P.gold -= DOL_PRICE;
        const name = pick(NAMES.filter((x) => !F.herd.some((q) => q.name === x))) || pick(NAMES);
        F.herd.push({ breed, name, mt: -1e9, t: G.S.time });
        const p = spotNear(G.map, e.x, e.y, 2, 6);
        if (p) addDolyn(G.map, breed, p.x, p.y, { own: 'P', hi: F.herd.length - 1, n: name + ', ' + b.n.toLowerCase(), c: b.c });
        Gm.cnt('dolyn_bought');
        return 'Вот, ' + name + '. Смирная, доится легко. Береги её.';
      } });
      DY.collect();
      if ((F.jugs || []).length) add.push({ t: 'Забрать надоенное (' + F.jugs.length + ' кр.)', c: C1, f: () => {
        const n = F.jugs.length;
        for (const j of F.jugs) Gm.give(j, 1, true);
        F.jugs = [];
        return 'Держи, всё до капли: ' + n + ' ' + U.plural(n, 'кринка', 'кринки', 'кринок') + '. Остальное — на сыр, уж не обессудь.';
      } });
      add.push({ t: 'Как там моё стадо?', c: C1, f: () => {
        if (!F.herd.length) return 'Загон пустует. Купи долынь — или приведи дикую, если приручишь.';
        return 'В загоне ' + F.herd.length + ' ' + U.plural(F.herd.length, 'долынь', 'долыни', 'долыней') + ': ' + F.herd.map((h) => h.name || BR[h.breed].n).join(', ') + '. Все сыты, все доятся.';
      } });
    } else if (F) add.push({ t: 'Купить ' + b.acc + ' (' + Gm.money(DOL_PRICE, true) + ')', c: '#a09880', f: () => 'Твоя ферма ' + G.W.settlements[F.sett].loc + '. Отсюда долынь туда не дойдёт — покупай у тамошнего пастуха.' });
    opts.splice(at, 0, ...add);
    return opts;
  };
})(window.EOF);
