'use strict';
// «Настройки 3D»: всё, что делает картинку от первого лица такой, как хочется.
// Размер пикселя, сглаживание, ступени цвета и точечное сглаживание, палитры (сепия, гравюра,
// карманная консоль, янтарный монитор, ночное зрение…), яркость, контраст, насыщенность, гамма,
// тёплый или холодный свет, свечение огней, контур, резкость, виньетка, зерно, строки старого
// экрана, разбег цветов, изгиб кинескопа, туман, сила огней, тени, поле зрения, дальность,
// покачивание, рука на экране. Есть готовые наборы. Меняется сразу — видно за окном.
// Хранится в браузере (localStorage), открывается из «Графики» (V), меню паузы или по F2.
(function (E) {
  const UI = E.UI, U = E.U, Gfx = E.Gfx, COL = UI.COL;
  const P3 = Gfx && Gfx.P3;
  const KEY = 'eotf_fx3d';
  // что крутится: id, имя, значения (список) или [мин, макс, шаг], подпись
  const PALS = ['живые краски', 'сепия', 'чёрно-белая', 'карманная консоль', 'янтарный монитор', 'ночное зрение', '16 цветов', 'гравюра чернилами', 'выжженные краски', 'кровавая луна', 'закатная'];
  const ROWS = [
    { id: 'preset', n: 'Набор', list: 1 },
    { id: 'pix', n: 'Размер пикселя', v: [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16], f: (v) => (v ? v + '×' : 'сам') },
    { id: 'smooth', n: 'Сглаживание', v: [0, 1], f: (v) => (v ? 'да' : 'нет') },
    { id: 'ql', n: 'Ступени цвета', v: [0, 3, 4, 6, 8, 12, 16, 22, 32, 48], f: (v) => (v ? String(v) : 'без ступеней') },
    { id: 'dith', n: 'Точечный узор', r: [0, 1.5, 0.25] },
    { id: 'pal', n: 'Палитра', v: PALS.map((x, i) => i), f: (v) => PALS[v] },
    { id: 'bri', n: 'Яркость', r: [0.5, 1.6, 0.05] },
    { id: 'con', n: 'Контраст', r: [0.6, 1.6, 0.05] },
    { id: 'sat', n: 'Насыщенность', r: [0, 2, 0.1] },
    { id: 'gam', n: 'Гамма', r: [0.6, 1.6, 0.05] },
    { id: 'temp', n: 'Холод ↔ тепло', r: [-1, 1, 0.1] },
    { id: 'bloom', n: 'Свечение', r: [0, 1.5, 0.1] },
    { id: 'bth', n: 'Порог свечения', r: [0.4, 0.95, 0.05] },
    { id: 'out', n: 'Контур', r: [0, 1, 0.1] },
    { id: 'sharp', n: 'Резкость', r: [0, 1, 0.1] },
    { id: 'vig', n: 'Виньетка', r: [0, 1, 0.05] },
    { id: 'grain', n: 'Зерно плёнки', r: [0, 1, 0.05] },
    { id: 'scan', n: 'Строки экрана', r: [0, 1, 0.1] },
    { id: 'ca', n: 'Разбег цветов', r: [0, 1, 0.1] },
    { id: 'curve', n: 'Изгиб экрана', r: [0, 1, 0.1] },
    { id: 'fog', n: 'Туман', r: [0, 2, 0.1] },
    { id: 'light', n: 'Сила огней', r: [0.3, 2.5, 0.1] },
    { id: 'lightR', n: 'Дальность огней', r: [0.5, 2, 0.1] },
    { id: 'shadows', n: 'Тени', v: [0, 1], f: (v) => (v ? 'да' : 'нет') },
    { id: 'fov', n: 'Поле зрения', v: [50, 55, 60, 65, 69, 75, 80, 85, 90, 100, 110], f: (v) => v + '°' },
    { id: 'dist', n: 'Дальность', r: [0.3, 1.5, 0.1] },
    { id: 'bob', n: 'Покачивание', r: [0, 1.5, 0.1] },
    { id: 'hand', n: 'Рука на экране', v: [0, 1], f: (v) => (v ? 'да' : 'нет') },
    { id: 'reset', n: 'Сбросить всё', act: 1 },
  ];
  const BASE = Object.assign({ pix: 0, smooth: 0, fog: 1, light: 1, lightR: 1, shadows: 1, fov: 69, dist: 1, bob: 1, hand: 1 }, P3 ? P3.FX0 : {});
  const PRESETS = [
    ['Мрачная гравюра', {}],
    ['Чистые пиксели', { ql: 0, dith: 0, bloom: 0.2, vig: 0.3 }],
    ['Высокая чёткость', { pix: 1, ql: 0, dith: 0, sharp: 0.3, bloom: 0.3, vig: 0.35 }],
    ['Крупный пиксель', { pix: 8, ql: 12, dith: 1 }],
    ['Старый кинескоп', { pix: 4, scan: 0.7, curve: 0.6, ca: 0.5, grain: 0.3, vig: 0.8, bloom: 0.6 }],
    ['Карманная консоль', { pix: 5, pal: 3, dith: 1, vig: 0.2, bloom: 0 }],
    ['Гравюра чернилами', { pix: 3, pal: 7, dith: 0.6, out: 0.7, vig: 0.3, bloom: 0 }],
    ['Нуар', { pal: 2, con: 1.35, grain: 0.45, vig: 0.9, out: 0.4 }],
    ['Сепия', { pal: 1, grain: 0.3, vig: 0.7 }],
    ['Янтарный монитор', { pal: 4, scan: 0.6, curve: 0.4, bloom: 0.5 }],
    ['Ночное зрение', { pal: 5, grain: 0.5, scan: 0.3, vig: 0.9 }],
    ['16 цветов', { pix: 4, pal: 6, dith: 1 }],
    ['Комикс', { out: 1, sat: 1.4, con: 1.15, ql: 8, dith: 0, vig: 0.2 }],
    ['Сон наяву', { bloom: 1.2, bth: 0.5, sat: 0.8, temp: 0.3, vig: 0.7, grain: 0.15 }],
    ['Кровавая луна', { pal: 9, vig: 0.9, grain: 0.2, bloom: 0.5 }],
    ['Закат', { pal: 10, bloom: 0.6 }],
    ['Яркий день', { bri: 1.12, sat: 1.3, con: 1.08, temp: 0.2, vig: 0.25, fog: 0.6 }],
  ];
  const FX = UI.FX3 = Object.assign({}, BASE, { preset: 0 });
  try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o) Object.assign(FX, o); } catch (e) { /* по умолчанию */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(FX)); } catch (e) { /* не страшно */ } };
  // передать в шейдеры
  UI.fx3Apply = function () {
    if (!P3) return;
    for (const k in P3.FX0) if (FX[k] != null) P3.fx[k] = FX[k];
    P3.shadows = !!FX.shadows;
  };
  UI.fx3Apply();
  // руке на экране — те же краски (рисуется поверх кадра)
  UI.fx3Filter = function () {
    const f = [];
    const pal = FX.pal | 0;
    if (pal === 1) f.push('sepia(1)');
    else if (pal === 2 || pal === 7) f.push('grayscale(1)', pal === 7 ? 'contrast(2.2)' : '');
    else if (pal === 3) f.push('grayscale(1)', 'sepia(1)', 'hue-rotate(40deg)', 'saturate(2.2)', 'brightness(0.8)');
    else if (pal === 4) f.push('grayscale(1)', 'sepia(1)', 'saturate(3.5)', 'brightness(0.95)');
    else if (pal === 5) f.push('grayscale(1)', 'sepia(1)', 'hue-rotate(65deg)', 'saturate(4)', 'brightness(1.1)');
    else if (pal === 9) f.push('grayscale(1)', 'sepia(1)', 'hue-rotate(-35deg)', 'saturate(3)');
    else if (pal === 10) f.push('sepia(0.6)', 'saturate(1.4)');
    if (FX.bri !== 1) f.push('brightness(' + FX.bri + ')');
    if (FX.con !== 1) f.push('contrast(' + FX.con + ')');
    if (FX.sat !== 1 && pal === 0) f.push('saturate(' + FX.sat + ')');
    return f.filter(Boolean).join(' ') || 'none';
  };
  const valOf = (r) => (r.id === 'preset' ? PRESETS[FX.preset | 0][0] : r.act ? '' : r.f ? r.f(FX[r.id]) : (+FX[r.id]).toFixed(2).replace(/\.?0+$/, '') || '0');
  function step(r, d) {
    if (r.id === 'preset') { FX.preset = ((FX.preset | 0) + d + PRESETS.length) % PRESETS.length; Object.assign(FX, BASE, PRESETS[FX.preset][1]); }
    else if (r.act) { Object.assign(FX, BASE, { preset: 0 }); }
    else if (r.v) { const i = r.v.indexOf(FX[r.id]); FX[r.id] = r.v[U.clamp((i < 0 ? 0 : i) + d, 0, r.v.length - 1)]; }
    else { const [a, b, st] = r.r; FX[r.id] = Math.round(U.clamp((+FX[r.id] || 0) + d * st, a, b) / st) * st; FX[r.id] = +FX[r.id].toFixed(3); }
    UI.fx3Apply(); save();
    UI.animUntil = performance.now() + 200;
  }
  // ползунок
  function bar(r) {
    if (!r.r) return null;
    const [a, b] = r.r, k = U.clamp(((+FX[r.id]) - a) / (b - a), 0, 1);
    const n = 10, on = Math.round(k * n);
    return '▕' + '█'.repeat(on) + '░'.repeat(n - on) + '▏';
  }
  UI.fx3Screen = function () {
    const s = {
      name: 'fx3d', sel: 0, scroll: 0,
      draw(t) {
        const L = UI.layout(t);
        // справа — окно, слева — живая картинка
        const W = Math.min(L.mw - 2, 40);
        const H = Math.min(L.mh, ROWS.length + 6);
        const x0 = L.mx + L.mw - W, y0 = L.my;
        t.box(x0, y0, W, H, COL.border, COL.panel, 'Настройки 3D');
        const listH = H - 5;
        if (s.sel < s.scroll) s.scroll = s.sel;
        if (s.sel >= s.scroll + listH) s.scroll = s.sel - listH + 1;
        for (let k = 0; k < listH && k + s.scroll < ROWS.length; k++) {
          const i = k + s.scroll, r = ROWS[i], y = y0 + 1 + k, on = i === s.sel;
          const bg = on ? COL.sel : COL.panel;
          t.fill(x0 + 1, y, W - 2, 1, ' ', COL.text, bg);
          t.text(x0 + 2, y, r.n, on ? COL.selfg : r.act ? COL.accent : COL.text, bg, W - 4);
          const v = valOf(r), b = bar(r), room = W - 5 - r.n.length;
          if (b) { t.text(x0 + W - 18, y, b, on ? COL.selfg : '#8a7a5a', bg); t.text(x0 + W - 5, y, v.slice(0, 4), on ? COL.selfg : COL.dim, bg); }
          else t.text(x0 + W - 2 - Math.min(v.length, room), y, v.slice(0, room), on ? COL.selfg : COL.accent, bg);
          t.hot(x0 + 1, y, W - 2, 1, (h, cx) => { s.sel = i; step(r, cx != null && cx < x0 + W / 2 ? -1 : 1); UI.render(); });
        }
        const r = ROWS[s.sel];
        const hint = r.id === 'preset' ? 'Готовые наборы: ←/→ — листать.' : r.act ? 'Enter — вернуть всё как было.' : (P3 && !P3.postOn() && ['bloom', 'out', 'sharp', 'grain', 'scan', 'ca', 'curve', 'pal', 'bri', 'con', 'sat', 'gam', 'temp'].includes(r.id) ? 'Видеокарта не тянет постобработку: это не сработает.' : '←/→ — менять, ↑/↓ — выбрать.');
        UI.wrapText(t, x0 + 2, y0 + H - 4, W - 4, hint, COL.dim, 2);
        t.text(x0 + 2, y0 + H - 2, 'Esc — готово · F2 — открыть снова', COL.faint, COL.panel, W - 4);
      },
      key(c) {
        const n = ROWS.length, r = ROWS[s.sel];
        if (c.k === 'up') s.sel = (s.sel - 1 + n) % n;
        else if (c.k === 'down') s.sel = (s.sel + 1) % n;
        else if (c.k === 'left' || c.k === 'tl') step(r, -1);
        else if (c.k === 'right' || c.k === 'tr') step(r, 1);
        else if (c.k === 'enter' || c.k === 'act') step(r, 1);
        else if (c.k === 'esc' || c.k === 'fx3d') { UI.pop(); E.Gm.msg('Настройки 3D сохранены.', '#808090'); }
      },
    };
    UI.push(s);
  };
})(window.EOF);
