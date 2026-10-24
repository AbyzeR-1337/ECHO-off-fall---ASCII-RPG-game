'use strict';
// Богиня мира. В начале каждого мира душа встречает её: Богиня спрашивает, кем ты войдёшь в мир,
// и дарует пол, имя и дар. Картинка пиксельная — из тех же моделей, что и весь мир.
(function (E) {
  const U = E.U, D = E.D, G = E.G, Gm = E.Gm, UI = E.UI, Time = E.Time;
  const COL = UI.COL;
  const fmt = (s) => Gm.fmt(s);

  const NAMES = ['Ильва', 'Мара', 'Велена', 'Эйра', 'Сиана', 'Орена', 'Лада', 'Даная', 'Иса', 'Мирена', 'Аэла', 'Зарина'];
  const EPI = ['Мать Мира', 'Ткущая Пути', 'Хранительница Огня', 'Та, что помнит Падение', 'Владычица Рассветов', 'Пряха Судеб'];
  UI.goddessName = (seed) => { const r = new E.RNG((seed ^ 0x51ed27) >>> 0); return [r.pick(NAMES), r.pick(EPI)]; };

  // что Богиня кладёт в руки вместе с путём
  const CLASS_GEAR = { warrior: ['shortsword'], ranger: ['bow', 'cloak'], assassin: ['dagger', 'hood'], mage: ['staff', 'book'], priest: ['robe', 'holy_water'], alchemist: ['mortar', 'p_heal', 'empty_bottle'], wanderer: ['cloak', 'waterskin', 'boots'] };
  const CLASS_SAY = {
    warrior: 'Ты будешь стоять, когда другие упадут. Возьми клинок.',
    ranger: 'Земля заговорит с тобой. Возьми лук и плащ.',
    assassin: 'Тебя не увидят, пока ты сам не захочешь. Возьми кинжал.',
    mage: 'Мир будет спорить с тобой — и проигрывать. Возьми посох и книгу.',
    priest: 'Боги молчат. Ты будешь слышать. Возьми рясу и святую воду.',
    alchemist: 'Ты узнаешь, из чего сделан мир. Возьми ступку и склянки.',
    wanderer: 'У тебя не будет дома, кроме дороги. Возьми плащ, бурдюк и сапоги.',
    none: 'Пусть мир решит сам. Это тоже путь — самый длинный.',
  };
  const GIFTS = [
    { id: 'body', n: 'Крепкое тело', d: 'Стойкость +2.', f: (P) => { P.base.con += 2; } },
    { id: 'mind', n: 'Ясный ум', d: 'Разум +2.', f: (P) => { P.base.int += 2; } },
    { id: 'luck', n: 'Удача', d: 'Удача +2: мир чаще будет на твоей стороне.', f: (P) => { P.base.luck += 2; } },
    { id: 'purse', n: 'Кошель', d: 'Пять серебряников и полный бурдюк.', f: (P) => { P.gold += 50; const w = Gm.give('waterskin', 1, true); if (w) { w.water = 'plain'; w.sips = 4; } } },
    { id: 'land', n: 'Память земли', d: 'Ты будешь знать край, где проснёшься.', f: (P) => { P.flags.giftLand = 1; } },
    { id: 'grace', n: 'Её взгляд', d: 'Благословение на первые три дня и Вера +1.', f: (P) => { P.base.fai += 1; Gm.fx('blessed', 1440 * 3); } },
  ];

  UI.goddess = function (seed) {
    const [gn, ge] = UI.goddessName(seed);
    const r = new E.RNG((seed * 7 + 13) >>> 0);
    const inp = () => document.getElementById('nameInput');
    const s = {
      name: 'create', full: true, anim: true, step: 0, sel: 0, cls: null, sex: null, name0: '', gift: null,
      open() { s.setStep(0); },
      close() { const i = inp(); if (i) { i.style.display = 'none'; i.blur(); i.onkeydown = null; } },
      setStep(n) {
        s.step = n; s.sel = 0;
        const i = inp();
        if (!i) return;
        if (n === 3) {
          if (!s.name0) s.name0 = r.pick(s.sex === 'f' ? E.N.female : E.N.male);
          i.value = s.name0; i.style.display = 'block';
          i.oninput = () => { s.name0 = i.value.slice(0, 18); UI.render(); };
          i.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); i.blur(); s.choose(0); UI.render(); } };
        } else { i.style.display = 'none'; i.blur(); i.onkeydown = null; }
      },
      // что говорит Богиня и что можно ответить на каждом шаге
      page() {
        const he = s.sex === 'f' ? 'дочь' : 'сын';
        switch (s.step) {
          case 0: return { say: ['Тьма. Потом — тёплый свет, как от костра, у которого никто не сидит.', '«Ещё одна душа. Здравствуй. Я — ' + gn + ', ' + ge.toLowerCase() + '. Этот мир — мой. Он стар, он жив, и он ничего тебе не объяснит.', 'Но прежде чем ты войдёшь в него, я спрошу. Немногое. Ответь честно.»'], opts: [{ t: 'Слушаю.', f: () => s.setStep(1) }] };
          case 1: return { say: ['«Кем ты войдёшь в мой мир?»'], opts: D.baseClasses.map((cid) => { const c = D.classes[cid]; return { t: c.n, d: c.d + ' ' + Object.keys(c.grow).map((k) => E.STATN[k] + ' +' + c.grow[k]).join(', ') + '. ' + CLASS_SAY[cid], f: () => { s.cls = cid; s.setStep(2); } }; }).concat([{ t: 'Никем', d: 'Без пути. ' + CLASS_SAY.none + ' (Скрытые пути откроются сами — когда-нибудь.)', f: () => { s.cls = null; s.setStep(2); } }]) };
          case 2: return { say: ['«' + (s.cls ? CLASS_SAY[s.cls] : CLASS_SAY.none) + '', 'А каким тебя сделать?»'], opts: [{ t: 'Мужчиной', f: () => { s.sex = 'm'; s.name0 = ''; s.setStep(3); } }, { t: 'Женщиной', f: () => { s.sex = 'f'; s.name0 = ''; s.setStep(3); } }] };
          case 3: return { say: ['«Как тебя будут звать? Я шепну имя — можешь взять его или назвать своё.»', 'Имя: ' + (s.name0 || '…')], opts: [{ t: 'Это имя — моё', f: () => { if (!s.name0.trim()) s.name0 = r.pick(s.sex === 'f' ? E.N.female : E.N.male); s.setStep(4); } }, { t: 'Шепни другое', f: () => { s.name0 = r.pick(s.sex === 'f' ? E.N.female : E.N.male); const i = inp(); if (i) i.value = s.name0; } }] };
          case 4: return { say: ['«' + s.name0 + '. Хорошее имя. Иди с ним, ' + he + ' мой.', 'И возьми мой дар — один. Больше я ничего не дам.»'], opts: GIFTS.map((g) => ({ t: g.n, d: g.d, f: () => { s.gift = g; s.setStep(5); } })) };
          default: return { say: ['«' + s.gift.n + '. Пусть так.', 'Теперь иди. Ты проснёшься у дороги. Я буду смотреть — но вмешиваться не стану. Мир не будет ждать тебя, ' + s.name0 + '.»'], opts: [{ t: 'Открыть глаза', f: () => s.finish() }, { t: 'Подожди, я передумал' + (s.sex === 'f' ? 'а' : ''), f: () => s.setStep(1) }] };
        }
      },
      choose(i) { const o = s.page().opts[i]; if (o) o.f(); },
      finish() {
        const name = (s.name0 || '').trim() || r.pick(s.sex === 'f' ? E.N.female : E.N.male);
        s.close();
        UI.stack = [];
        UI.push(UI.loading('Ты открываешь глаза', () => {
          Gm.startLife(name, s.sex || 'm', false);
          const P = G.P;
          P.goddess = { n: gn, e: ge, cls: s.cls || null, gift: s.gift ? s.gift.id : null };
          if (s.cls) {
            Gm.setClass(s.cls);
            for (const b of CLASS_GEAR[s.cls] || []) { const it = Gm.give(b, 1, true); const sl = it && (it.s || (D.items[b] || {}).s); if (sl) P.eq[sl] = it; }
          }
          if (s.gift) s.gift.f(P);
          Gm.calc(); P.hp = P.mhp; P.mp = P.mmp;
          if (P.flags.giftLand && G.map && G.map.ex) { G.map.ex.fill(1); if (G.map.rid != null) P.known.regions[G.map.rid] = G.S.time; }
          UI.stack = [];
          UI.push(UI.gameScreen);
          UI.popup('', 'Год ' + Time.year(G.S.time) + ' после Падения.\n\nТы просыпаешься у дороги, рядом с потухшим костром. В памяти — тёплый свет и голос: «' + gn + '». ' + (s.cls ? 'Ты — ' + D.classes[s.cls].n + '. ' : '') + 'Дар: ' + (s.gift ? s.gift.n.toLowerCase() : 'нет') + '.\n\nНикто не знает твоего имени. Никто тебя не ждёт.\n\nМир большой. Он жил до тебя и будет жить после.');
          E.Save.save();
        }));
      },
      draw(t) {
        t.under = (ctx) => drawScene(ctx, t, s);
        const wide = t.cols >= 90;
        const pg = s.page();
        const pw = wide ? Math.min(64, Math.floor(t.cols * 0.5)) : t.cols - 2;
        const px = wide ? t.cols - pw - 2 : 1;
        const sayL = [];
        for (const l of pg.say) { for (const w of U.wrap(fmt(l), pw - 4)) sayL.push(w); sayL.push(''); }
        const sel = pg.opts[s.sel] || {};
        const dl = sel.d ? U.wrap(fmt(sel.d), pw - 4) : [];
        const ph = Math.min(t.rows - 2, sayL.length + pg.opts.length + dl.length + 4);
        const py = wide ? Math.max(1, Math.floor((t.rows - ph) / 2)) : t.rows - ph - 1;
        t.box(px, py, pw, ph, '#b8a070', '#120e1c', gn + ' — ' + ge);
        let y = py + 1;
        for (const l of sayL) { if (y >= py + ph - 1) break; t.text(px + 2, y++, l, l.startsWith('«') || l.includes('»') ? '#f4e2b0' : '#c8bce0', '#120e1c', pw - 4); }
        s.sel = U.clamp(s.sel, 0, pg.opts.length - 1);
        pg.opts.forEach((o, i) => {
          if (y >= py + ph - 1) return;
          const on = i === s.sel;
          t.fill(px + 1, y, pw - 2, 1, ' ', COL.text, on ? '#3a2c50' : '#120e1c');
          t.text(px + 2, y, (on ? '› ' : '  ') + o.t, on ? '#ffe8a0' : '#d8d0e8', on ? '#3a2c50' : '#120e1c', pw - 4);
          const ii = i;
          t.hot(px + 1, y, pw - 2, 1, () => { if (s.sel === ii) s.choose(ii); else s.sel = ii; UI.render(); });
          y++;
        });
        if (dl.length) { y++; for (const l of dl) { if (y >= py + ph - 1) break; t.text(px + 2, y++, l, '#a898c0', '#120e1c', pw - 4); } }
      },
      key(c) {
        const n = s.page().opts.length;
        if (c.k === 'up') s.sel = (s.sel - 1 + n) % n;
        else if (c.k === 'down' || c.k === 'tab') s.sel = (s.sel + 1) % n;
        else if (c.k === 'enter' || c.k === 'act') s.choose(s.sel);
        else if (c.n >= 1 && c.n <= n) { s.sel = c.n - 1; s.choose(s.sel); }
        else if (c.k === 'esc') { if (s.step > 0) s.setStep(s.step - 1); else { s.close(); UI.stack = []; UI.push(UI.titleScreen()); } }
      },
    };
    return s;
  };

  // ---------- картинка: небо перед рассветом, облака, звёзды и Она ----------
  let LOW = null;
  function drawScene(ctx, t, s) {
    const W = t.cols * t.cw, H = t.rows * t.ch;
    const K = Math.max(3, Math.round(Math.min(W, H) / 220));
    const lw = Math.ceil(W / K), lh = Math.ceil(H / K);
    if (!LOW || LOW.width !== lw || LOW.height !== lh) { LOW = document.createElement('canvas'); LOW.width = lw; LOW.height = lh; }
    const x = LOW.getContext('2d');
    const now = performance.now() / 1000;
    const img = x.createImageData(lw, lh), d = img.data;
    const wide = t.cols >= 90;
    const gx = wide ? lw * 0.27 : lw * 0.5, gy = wide ? lh * 0.5 : lh * 0.3;
    for (let j = 0; j < lh; j++) {
      const v = j / lh;
      // небо: ночь сверху, рассвет у горизонта
      let r = 12 + 40 * v * v + 150 * Math.pow(v, 6), g = 8 + 20 * v * v + 90 * Math.pow(v, 6), b = 34 + 50 * v - 20 * Math.pow(v, 6);
      for (let i = 0; i < lw; i++) {
        const k = (j * lw + i) * 4;
        // сияние вокруг Богини
        const dx = (i - gx) / lh, dy = (j - gy) / lh, rr = Math.sqrt(dx * dx + dy * dy);
        const glow = Math.max(0, 1 - rr * 2.4);
        let R = r + 120 * glow * glow, Gc = g + 100 * glow * glow, B = b + 60 * glow * glow;
        // лучи
        const ang = Math.atan2(dy, dx);
        const ray = Math.max(0, Math.sin(ang * 9 + now * 0.3)) * Math.max(0, 1 - rr * 1.6) * 30;
        R += ray; Gc += ray * 0.85; B += ray * 0.5;
        // звёзды
        const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453, hf = h - Math.floor(h);
        if (hf > 0.996 && v < 0.65) { const tw = 0.6 + 0.4 * Math.sin(now * 2 + hf * 100); R += 180 * tw; Gc += 180 * tw; B += 200 * tw; }
        // облака внизу
        const cl = 0.5 + 0.5 * Math.sin(i * 0.05 + now * 0.08 + Math.sin(j * 0.11) * 2) * Math.sin(j * 0.09 + i * 0.013);
        const cz = Math.max(0, (v - 0.7) / 0.3);
        if (cl * cz > 0.25) { const c = Math.min(1, (cl * cz - 0.25) * 3); R = R * (1 - c) + (200 + 40 * glow) * c; Gc = Gc * (1 - c) + (150 + 30 * glow) * c; B = B * (1 - c) + (170) * c; }
        // ступени палитры — «пиксельно»
        d[k] = Math.min(255, Math.round(R / 12) * 12); d[k + 1] = Math.min(255, Math.round(Gc / 12) * 12); d[k + 2] = Math.min(255, Math.round(B / 12) * 12); d[k + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    // Богиня
    const PX = E.Gfx && E.Gfx.PX;
    if (PX) {
      const f = Math.floor(now * 3) % 8;
      const sp = PX.sprite('goddess', { f }, { ppu: 40, levels: 8, pitch: 0.06 });
      if (sp) {
        const sc = Math.max(1, Math.floor((lh * (wide ? 0.78 : 0.5)) / sp.h));
        const bob = Math.round(Math.sin(now * 1.3) * 2);
        x.imageSmoothingEnabled = false;
        x.drawImage(sp.cv, Math.round(gx - sp.ax * sc), Math.round(gy + (sp.h * sc) / 2 - sp.ay * sc + bob), sp.w * sc, sp.h * sc);
      }
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(LOW, 0, 0, lw * K, lh * K);
  }

  // Новый мир начинается с Богини; новая жизнь в старом мире — по-старому
  const create0 = UI.createScreen;
  UI.rebirthScreen = create0;
  UI.createScreen = function (reborn) {
    if (reborn) return create0(true);
    const seed = (Math.random() * 1e9) >>> 0;
    return UI.loading('Мир рождается', () => { E.Save.clear && E.Save.clear(); Gm.newWorld(seed); UI.stack = []; UI.push(UI.goddess(seed)); });
  };
})(window.EOF);
