'use strict';
// Атлас: вся графика игры — рисунки из символов.
// Править удобно в студии (tools/studio.html): там видно каждый рисунок, его кадры и цвета.
//
// Спрайт: art — рисунок (пробел прозрачен, кадры через строку «--»), ink — буквы цветов из pal.
// Существа нарисованы смотрящими вправо; влево их отражает движок.
(function (E) {
  const Gfx = E.Gfx, U = E.U;
  const R = String.raw;
  const spr = Gfx.sprite, grd = Gfx.ground, blk = Gfx.block, roof = Gfx.roof;
  const rnd2 = (h, k) => (h * k) % 1;

  // ============================================================
  // ЗЕМЛЯ
  // ============================================================
  // Россыпь символов: density — доля занятых ячеек, items — [символ, цвет, вес]
  function scatter(density, items) {
    const tot = items.reduce((a, b) => a + b[2], 0);
    return (u, v, f, h) => {
      if (h > density) return null;
      let x = rnd2(h, 9973.17) * tot;
      for (const it of items) { x -= it[2]; if (x <= 0) return [it[0], it[1]]; }
      return [items[0][0], items[0][1]];
    };
  }
  const GRASS = [[',', '#4f7f35', 4], ['\'', '#5b8a3c', 3], ['.', '#46742f', 3], ['"', '#6a9a45', 1.2], ['`', '#4f7f35', 1]];
  grd('grass', { base: '#0c1409', fn: scatter(0.42, GRASS), name: 'Трава' });
  grd('grass_dry', { base: '#14140a', fn: scatter(0.42, [[',', '#8a8a3c', 4], ['\'', '#9a9048', 3], ['.', '#7a7a34', 3], ['"', '#a89a50', 1]]), name: 'Сухая трава' });
  grd('grass_frost', { base: '#12161a', fn: scatter(0.42, [[',', '#a8b8b8', 4], ['\'', '#c0cccc', 3], ['.', '#90a0a8', 3], ['*', '#e0eef0', 0.6]]), name: 'Трава в инее' });
  grd('tallgrass', { base: '#0e170a', frames: 2, period: [3, 3], name: 'Высокая трава',
    fn: (u, v, f, h) => { if (h > 0.72) return null; const c = h < 0.25 ? '#7da24c' : h < 0.5 ? '#6a9440' : '#8ab25a'; if (h < 0.36) return [f ? '|' : '/', c]; return [h < 0.6 ? '"' : (f ? '\'' : ','), c]; } });
  grd('flowers', { base: '#0c1409', name: 'Цветы',
    fn: (u, v, f, h) => { if (h < 0.2) { const k = rnd2(h, 777.7); return [k < 0.5 ? '*' : 'o', k < 0.33 ? '#b98ad0' : k < 0.66 ? '#e0c050' : '#e07a8a']; } return scatter(0.4, GRASS)(u, v, f, (h - 0.2) / 0.8); } });
  grd('sand', { base: '#1b160c', fn: scatter(0.36, [['.', '#c2a964', 4], ['·', '#a8925a', 3], [':', '#b09a5e', 1], [',', '#9a8450', 1]]), name: 'Песок' });
  grd('dune', { base: '#201a0d', period: [4, 4], name: 'Бархан', fn: (u, v, f, h) => ((u + v * 3) % 8 < 2 && v % 2 === 0 ? ['~', '#c8a85e'] : h < 0.2 ? ['.', '#a89050'] : null) });
  grd('stones', { base: '#14120f', fn: scatter(0.42, [['.', '#8a8070', 3], ['o', '#7a7064', 1], ['°', '#9a9080', 1], [',', '#6a6458', 2]]), name: 'Камни' });
  grd('snow', { base: '#191d23', fn: scatter(0.24, [['.', '#c8d2da', 5], ['\'', '#a8b4c0', 2], ['*', '#e0e8f0', 0.6]]), name: 'Снег' });
  grd('drift', { base: '#1e242a', name: 'Сугроб', fn: (u, v, f, h) => (h < 0.32 ? [v % 2 ? '~' : '^', h < 0.16 ? '#e0e8f0' : '#b8c4ce'] : null) });
  grd('ice', { bg: '#132129', name: 'Лёд', fn: (u, v, f, h) => ((u + v * 2) % 7 === 0 ? ['/', '#6aa0b8'] : h < 0.18 ? ['.', '#9fd3e6'] : h < 0.24 ? ['-', '#7ab8d0'] : null) });
  grd('hill', { base: '#121509', name: 'Холм', fn: (u, v, f, h) => (h < 0.18 ? ['∩', '#8a9a5a'] : h < 0.45 ? [',', '#6a7a45'] : null) });
  grd('rock', { base: '#121110', fn: scatter(0.3, [['.', '#7a7470', 3], [',', '#5f5a55', 2], ['\'', '#6a6560', 1], ['°', '#8a8480', 0.5]]), name: 'Камень' });
  grd('ash', { base: '#131212', fn: scatter(0.32, [['.', '#6a6460', 3], [',', '#5a5450', 2], ['\'', '#7a7470', 1]]), name: 'Пепел' });
  grd('blacksnow', { base: '#101012', fn: scatter(0.34, [['.', '#4a4a52', 3], ['*', '#3a3a42', 2], ['\'', '#5a5a62', 1]]), name: 'Чёрный снег' });
  grd('rubble', { base: '#13110e', fn: scatter(0.55, [[';', '#7a7064', 3], [',', '#6a6054', 2], ['°', '#8a8070', 1], ['.', '#5a5248', 2], ['▪', '#6a6256', 1]]), name: 'Обломки' });
  grd('bones', { base: '#13110e', fn: scatter(0.4, [['%', '#d8d0b8', 2], ['=', '#c8c0a8', 1], ['x', '#b8b098', 1], ['.', '#6a6054', 3]]), name: 'Кости' });
  grd('roots', { base: '#120d08', fn: scatter(0.55, [['~', '#6a4a2a', 3], ['S', '#5a3d22', 1], ['§', '#7a5a3a', 1], [',', '#4a3a22', 2]]), name: 'Корни' });
  grd('floor', { bg: '#1a130c', period: [3, 4], name: 'Деревянный пол',
    fn: (u, v, f, h) => (v % 2 === 1 ? ['_', '#3a2a18'] : (u + v * 3) % 6 === 0 ? ['|', '#4a3620'] : h < 0.2 ? ['-', '#4a3a28'] : null) });
  grd('stonefloor', { bg: '#111114', period: [2, 2], name: 'Каменный пол',
    fn: (u, v, f, h) => (v % 2 === 0 ? [u % 4 === 0 ? '+' : '-', '#34343c'] : u % 4 === 0 ? ['¦', '#2c2c34'] : h < 0.15 ? ['.', '#4a4a52'] : null) });
  grd('road', { bg: '#1c170f', fn: scatter(0.48, [['.', '#a08a60', 3], [':', '#8a7550', 2], ['=', '#6a5840', 0.6], [',', '#8a7a55', 1]]), name: 'Дорога' });
  grd('cobble', { bg: '#1a1917', period: [3, 3], name: 'Мостовая',
    fn: (u, v, f, h) => ((u + (v % 2) * 2) % 3 === 2 || h > 0.7 ? null : [h < 0.3 ? 'o' : h < 0.55 ? '°' : '·', h < 0.3 ? '#5a5650' : h < 0.55 ? '#68645c' : '#4e4a44']) });
  grd('deck', { bg: '#160f08', period: [2, 2], name: 'Настил', fn: (u, v, f, h) => (u % 4 === 3 ? ['|', '#5a4028'] : ['=', h < 0.5 ? '#8a6a4a' : '#7a5a3a']) });
  const WAVE = (deep, light, mid, speed) => (u, v, f, h, PU) => {
    const k = ((u + f * speed + v * 3) % 8 + 8) % 8;
    if (k === 0) return ['~', light];
    if (k === 4 && h < 0.7) return ['-', mid];
    if (h < 0.05) return ['°', light];
    return h < 0.12 ? ['.', deep] : null;
  };
  grd('water', { bg: '#08111f', frames: 8, period: [2, 4], fn: WAVE('#2a4a78', '#5a90c8', '#3a6aa8', 1), name: 'Глубокая вода' });
  grd('shallow', { bg: '#0c1a2a', frames: 8, period: [2, 4], fn: WAVE('#3a5a7a', '#78b0e0', '#5a90c8', 1), name: 'Мелководье' });
  grd('stream', { bg: '#0c1b27', frames: 8, period: [2, 4], fn: WAVE('#3a6a8a', '#90d0f0', '#78c0e8', 2), name: 'Ручей' });
  grd('mirrorwater', { bg: '#141a24', frames: 8, period: [2, 4], fn: WAVE('#6a7a8a', '#e8f0ff', '#b8c4d0', 1), name: 'Зеркальная гладь' });
  grd('bog', { bg: '#0f160c', frames: 4, period: [2, 2], name: 'Трясина',
    fn: (u, v, f, h) => (h < 0.08 && (f + Math.floor(h * 100)) % 4 === 0 ? ['o', '#6a8a4a'] : h < 0.4 ? ['≈', h < 0.2 ? '#4a6a3a' : '#3a5530'] : null) });
  grd('swamp', { base: '#0d130b', fn: scatter(0.5, [['~', '#3e5a35', 3], [',', '#4a6a3a', 2], ['"', '#5a7a45', 1], ['.', '#2e4a28', 2]]), name: 'Топь' });
  grd('lava', { bg: '#2a0800', frames: 4, period: [2, 2], name: 'Лава',
    fn: (u, v, f, h) => { const k = ((u + v * 2 + f) % 4 + 4) % 4; return k === 0 ? ['≈', '#ffb040'] : k === 2 ? ['~', '#ff6a1d'] : h < 0.3 ? ['.', '#c03010'] : null; } });
  grd('cloud', { bg: '#1a1e26', frames: 4, period: [2, 2], name: 'Облака',
    fn: (u, v, f, h) => { const k = ((u + f + v * 2) % 8 + 8) % 8; return k < 2 ? ['~', '#c8d0dc'] : k === 4 ? ['°', '#a8b0bc'] : h < 0.2 ? ['.', '#8890a0'] : null; } });
  grd('void', { bg: '#05050a', frames: 2, name: 'Пустота',
    fn: (u, v, f, h) => (h < 0.035 ? [f && h < 0.015 ? '+' : '.', '#3a3a58'] : null) });
  grd('voidfloor', { base: '#09090f', fn: scatter(0.18, [['·', '#3a3a50', 3], ['.', '#2a2a40', 2]]), name: 'Ничто' });
  grd('moondust', { base: '#141418', fn: scatter(0.35, [['.', '#b8b8c0', 3], ['·', '#8a8a94', 2], ['°', '#d0d0d8', 0.6]]), name: 'Лунная пыль' });
  grd('crater', { base: '#101014', name: 'Кратер', fn: (u, v, f, h) => (u % 4 === 0 ? [v ? '(' : '.', '#6a6a72'] : u % 4 === 3 ? [v ? ')' : '.', '#6a6a72'] : h < 0.2 ? ['.', '#8a8a90'] : null) });
  grd('dreamfloor', { base: '#100c18', frames: 2, fn: (u, v, f, h) => (h < 0.3 ? [h < 0.06 ? (f ? '+' : '·') : h < 0.2 ? '·' : '~', '#9a8ac0'] : null), name: 'Зыбкая земля' });
  grd('timefloor', { base: '#14100a', fn: scatter(0.35, [['·', '#c0a060', 3], [':', '#a08050', 2], ['°', '#e0c080', 1], ['◷', '#8a7040', 0.3]]), name: 'Застывшие мгновения' });
  grd('seafloor', { bg: '#06101a', frames: 4, name: 'Морское дно',
    fn: (u, v, f, h) => (h < 0.04 ? [(f + v) % 2 ? 'o' : '°', '#6ab0d0'] : h < 0.35 ? [h < 0.2 ? '.' : ',', '#3a6a8a'] : null) });
  grd('spiritfloor', { base: '#081412', frames: 4, name: 'Туманная тропа',
    fn: (u, v, f, h) => { const k = ((u + f + v * 3) % 8 + 8) % 8; return k === 0 ? ['~', '#5aa090'] : h < 0.2 ? ['·', '#8ad0c0'] : null; } });
  grd('mist', { base: '#121816', frames: 4, name: 'Туман',
    fn: (u, v, f, h) => { const k = ((u + f + v * 2) % 6 + 6) % 6; return k < 3 ? ['≈', k === 1 ? '#7a9a94' : '#5a7a74'] : null; } });
  grd('flesh', { base: '#1c080c', frames: 2, name: 'Живая плоть',
    fn: (u, v, f, h) => (h < 0.45 ? [h < 0.15 ? 'o' : h < 0.3 ? '~' : '°', f ? '#b05a6a' : '#9a4a5a'] : null) });
  grd('nightgrass', { base: '#0a0c18', fn: scatter(0.42, [[',', '#5a6aa0', 4], ['\'', '#6a7ab0', 3], ['.', '#4a5a90', 3]]), name: 'Серебристая трава' });
  grd('nightflower', { base: '#0a0c18', frames: 2, name: 'Ночные цветы',
    fn: (u, v, f, h) => (h < 0.2 ? ['*', f && h < 0.1 ? '#e0e8ff' : '#a0b0ff'] : h < 0.5 ? [',', '#5a6aa0'] : null) });
  grd('field', { base: '#15120a', period: [2, 2], name: 'Поле', fn: (u, v, f, h) => (u % 2 === 0 ? [v % 2 === 0 ? 'ψ' : '|', h < 0.5 ? '#c9b048' : '#b09a3a'] : h < 0.2 ? ['.', '#6a5a3a'] : null) });
  grd('field_bare', { base: '#15120a', period: [2, 2], name: 'Поле зимой', fn: (u, v, f, h) => (u % 2 === 0 ? ['·', '#8a7a5a'] : null) });
  grd('soil', { base: '#161109', period: [2, 2], name: 'Пашня', fn: (u, v, f, h) => (v % 2 === 0 ? ['=', '#5a4a30'] : h < 0.3 ? ['~', '#4a3a24'] : null) });

  // ============================================================
  // БЛОКИ: стены и скалы — верх в своей клетке, лицевая грань свисает в клетку южнее
  // ============================================================
  const LINES1 = ['·', '│', '─', '└', '│', '│', '┌', '├', '─', '┘', '─', '┴', '┐', '┤', '┬', '┼'];
  const LINES2 = ['·', '║', '═', '╚', '║', '║', '╔', '╠', '═', '╝', '═', '╩', '╗', '╣', '╦', '╬'];
  // Верх рукотворной стены: гребень по соединениям и каменная крошка вокруг
  function capTop(lines, line, bg, speck) {
    return (mask, vx, vy) => {
      const cells = [];
      const H = (mask & 2) || (mask & 8), Vt = mask & 1, Vb = mask & 4;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) {
        let c = null;
        if (j === 0) {
          if (i === 1) c = lines[mask & 15] || '·';
          else if (i === 0 && (mask & 8)) c = lines[10];
          else if (i > 1 && (mask & 2)) c = lines[10];
        } else if (i === 1 && Vb) c = lines[5];
        if (!c && !H && !Vt && !Vb && j === 0 && i === 1) c = '■';
        const hh = Gfx.hash(vx * 4 + i, vy * 2 + j, 41);
        cells.push(c ? [c, line, bg] : hh < 0.22 ? ['·', speck, bg] : [' ', null, bg]);
      }
      return { w: 4, h: 2, cells };
    };
  }
  // Кирпичная кладка
  function brickFace(bg, mortar, wide) {
    return (mask, vx, vy) => {
      const cells = [];
      for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) {
        const u = vx * 4 + i + (j ? 2 : 0);
        const c = wide ? ['[', '_', '_', ']'][u % 4] : (u % 4 === 0 ? '|' : '_');
        cells.push([c, mortar, bg]);
      }
      return { w: 4, h: 2, cells };
    };
  }
  // Природная скала: верх и грань — россыпь знаков
  function rockTop(bg, items, dens) { const f = scatter(dens, items); return (mask, vx, vy) => { const cells = []; for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) { const r = f(0, 0, 0, Gfx.hash(vx * 4 + i, vy * 2 + j, 77)); cells.push(r ? [r[0], r[1], bg] : [' ', null, bg]); } return { w: 4, h: 2, cells }; }; }
  function rockFace(bg, items, dens, edge) { const f = scatter(dens, items); return (mask, vx, vy) => { const cells = []; for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) { const r = f(0, 0, 0, Gfx.hash(vx * 4 + i, vy * 2 + j, 91)); cells.push(j === 0 && edge && !r ? ['‾', edge, bg] : r ? [r[0], r[1], bg] : [' ', null, bg]); } return { w: 4, h: 2, cells }; }; }

  blk('wall', { name: 'Стена дома', top: capTop(LINES1, '#c8b896', '#3a3228', '#5a5040'), face: brickFace('#2e2720', '#6a5c48') });
  blk('townwall', { name: 'Городская стена', top: capTop(LINES2, '#d0d0c8', '#34342f', '#5a5a52'), face: brickFace('#2a2a28', '#7a7a72', true) });
  blk('treewall', { name: 'Стена из живого дерева', top: capTop(LINES1, '#b08a50', '#2e2214', '#5a4020'), face: (m, vx) => Gfx.grid(['|‖|(', ')|‖|'].map((r) => vx % 2 ? r : r.split('').reverse().join('')), ['bbbb', 'bbbb'], { b: '#6a4a2a' }, '#22180c') });
  blk('coralwall', { name: 'Коралловая стена', top: capTop(LINES1, '#f0a0b0', '#3a1c22', '#7a4a52'), face: (m, vx) => Gfx.grid([vx % 2 ? 'Y¥y♣' : '♣yY¥', vx % 2 ? '|‖|¦' : '¦|‖|'], ['pPpP', 'pppp'], { p: '#d07a8a', P: '#f0a0b0' }, '#2a1418') });
  blk('window', { name: 'Окно', top: capTop(LINES1, '#a8d0e0', '#2a3238', '#4a5a60'),
    face: (m, vx) => Gfx.grid(['_▒▒|', '_==_'], ['mggm', 'mwwm'], { m: '#6a5c48', g: '#9ad0e0', w: '#8a6a40' }, { _: '#2e2720', g: '#1a3442' }) });
  blk('door', { name: 'Дверь', top: capTop(LINES1, '#d0a060', '#3a2a18', '#5a4020'),
    face: () => Gfx.grid(['[==]', '[=o]'], ['fwwf', 'fwkf'], { f: '#c09050', w: '#7a5430', k: '#f0d060' }, '#24180c') });
  blk('cave', { name: 'Скальная стена', top: rockTop('#1d1a17', [['.', '#5f5852', 3], ['\'', '#4f4842', 2], ['#', '#3f3832', 1]], 0.4),
    face: rockFace('#17140f', [['/', '#4a443e', 2], ['\\', '#4a443e', 2], ['|', '#3e3832', 1], [';', '#3a342e', 1], ['.', '#5f5852', 1]], 0.55, '#5f5852') });
  blk('crackwall', { name: 'Скальная стена', top: rockTop('#1d1a17', [['.', '#5f5852', 3], ['\'', '#4f4842', 2], ['#', '#3f3832', 1]], 0.4),
    face: (m, vx, vy) => { const g = rockFace('#17140f', [['/', '#4a443e', 2], ['\\', '#4a443e', 2], ['|', '#3e3832', 1], ['.', '#5f5852', 1]], 0.4, '#5f5852')(m, vx, vy); g.cells[2] = ['/', '#2a2420', '#17140f']; g.cells[5] = ['/', '#2a2420', '#17140f']; return g; } });
  blk('mountain', { name: 'Скала', top: rockTop('#262522', [['^', '#9a9a96', 3], ['.', '#6a6a66', 3], ['/', '#7a7a76', 1], ['\\', '#7a7a76', 1]], 0.55),
    face: rockFace('#1c1b19', [['/', '#5a5a56', 3], ['\\', '#5a5a56', 3], ['|', '#4a4a46', 1], ['.', '#6a6a66', 1]], 0.6, '#8a8a86') });
  blk('peak', { name: 'Вершина', top: rockTop('#3a3a3c', [['^', '#f0f0f0', 4], ['*', '#ffffff', 1], ['.', '#c8c8c8', 2]], 0.7),
    face: rockFace('#2a2a2c', [['/', '#9a9a9c', 3], ['\\', '#9a9a9c', 3], ['^', '#e8e8e8', 1]], 0.6, '#e8e8e8') });
  blk('icerock', { name: 'Ледяная глыба', top: rockTop('#22323c', [['^', '#c8e0ec', 2], ['/', '#a9c4d4', 2], ['.', '#88a8b8', 2]], 0.6),
    face: rockFace('#18262e', [['/', '#7aa0b4', 2], ['\\', '#7aa0b4', 2], ['|', '#a9c4d4', 1]], 0.55, '#c8e0ec') });
  blk('basalt', { name: 'Базальт', top: rockTop('#1a1816', [['o', '#4a4644', 2], ['·', '#3a3634', 3]], 0.5),
    face: (m, vx) => Gfx.grid(['‖|‖|', '|‖|‖'], ['dldl', 'ldld'], { d: '#2a2624', l: '#4a4644' }, '#141210') });
  blk('ore', { name: 'Рудная жила', top: rockTop('#1d1a17', [['◊', '#c87a4a', 2], ['.', '#5f5852', 3], ['*', '#e0a060', 1]], 0.5),
    face: rockFace('#17140f', [['◊', '#c87a4a', 2], ['/', '#4a443e', 2], ['*', '#e0a060', 1], ['\\', '#4a443e', 2]], 0.6, '#c87a4a') });
  blk('bigtree', { name: 'Ствол исполина', top: rockTop('#2a1c0e', [['@', '#6a4a2a', 1], ['o', '#5a3d22', 2], ['(', '#4a3018', 1], [')', '#4a3018', 1]], 0.7),
    face: () => Gfx.grid(['|(|)', ')|(|'], ['bdbd', 'dbdb'], { b: '#6a4a2a', d: '#4a3018' }, '#24170c') });
  blk('fleshwall', { name: 'Стенка плоти', top: rockTop('#2a0c14', [['o', '#8a2a3a', 2], ['~', '#6a1a2a', 2], ['°', '#a03a4a', 1]], 0.6),
    face: rockFace('#200810', [['~', '#7a2232', 3], ['o', '#9a3242', 1], ['(', '#6a1a2a', 1], [')', '#6a1a2a', 1]], 0.65, '#a03a4a') });
  blk('dreamwall', { name: 'Стена сна', top: rockTop('#1c1630', [['✧', '#8a7ac0', 1], ['·', '#6a5a9a', 3], ['*', '#a090e0', 1]], 0.45),
    face: rockFace('#161228', [['~', '#5a4a8a', 3], ['·', '#7a6aaa', 2], ['✧', '#a090e0', 1]], 0.5, '#8a7ac0') });
  blk('clockwall', { name: 'Стена шестерён', top: rockTop('#1c160a', [['*', '#8a7a4a', 2], ['o', '#6a5a3a', 2], ['+', '#a08a50', 1]], 0.55),
    face: rockFace('#16120a', [['@', '#7a6a3a', 1], ['*', '#8a7a4a', 2], ['=', '#5a4a2a', 2], ['o', '#6a5a3a', 2]], 0.7, '#a08a50') });
  blk('shelf', { name: 'Книжные полки', top: () => Gfx.grid(['====', '·  ·'], ['wwww', 'dddd'], { w: '#8a6a40', d: '#4a3a20' }, '#2a1e10'),
    face: (m, vx, vy) => { const cols = ['#a04a3a', '#4a7a5a', '#6a5aa0', '#c0a050', '#5080a0', '#8a5a3a']; const cells = []; for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) { const h = Gfx.hash(vx * 4 + i, vy * 2 + j, 5); cells.push([h < 0.2 ? '▌' : h < 0.6 ? '|' : '‖', cols[Math.floor(rnd2(h, 31.7) * cols.length)], '#1c140a']); } return { w: 4, h: 2, cells }; } });

  // Берег над водой и обрыв над пустотой — грань суши, свисающая в низину
  blk('bank', { name: 'Берег', top: () => Gfx.grid(['    ', '    '], ['', ''], {}, null),
    face: (m, vx) => { const cells = []; for (let i = 0; i < 4; i++) { const h = Gfx.hash(vx * 4 + i, 3, 17); cells.push([h < 0.5 ? '\'' : h < 0.8 ? ',' : '.', '#6a5a40', '#22190f']); } for (let i = 0; i < 4; i++) cells.push(null); return { w: 4, h: 2, cells }; } });
  blk('cliff', { name: 'Обрыв', top: () => Gfx.grid(['    ', '    '], ['', ''], {}, null),
    face: (m, vx) => { const cells = []; for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) { const h = Gfx.hash(vx * 4 + i, j, 23); cells.push([j === 0 && h < 0.5 ? '‾' : h < 0.3 ? '/' : h < 0.6 ? '\\' : h < 0.8 ? '|' : '.', j ? '#4a4038' : '#7a6a58', j ? '#16120e' : '#1e1913']); } return { w: 4, h: 2, cells }; } });

  // ============================================================
  // КРЫШИ (дом снаружи — крыша, внутри — комнаты)
  // ============================================================
  function roofStyle(name, nS, rS, sS, bg, bgS) {
    return { name, cell(info) {
      const rows = info.zone === 'r' ? rS : info.zone === 'n' ? nS : sS;
      const g = Gfx.grid(rows[0], rows[1], rows[2], info.zone === 's' ? bgS : bg);
      if (info.l) { g.cells[0] = ['/', rows[2].e || rows[2].a, g.cells[0][2]]; g.cells[4] = ['|', rows[2].e || rows[2].a, g.cells[4][2]]; }
      if (info.r) { g.cells[3] = ['\\', rows[2].e || rows[2].a, g.cells[3][2]]; g.cells[7] = ['|', rows[2].e || rows[2].a, g.cells[7][2]]; }
      if (info.b) for (let i = 4; i < 8; i++) g.cells[i] = [info.l && i === 4 ? '\\' : info.r && i === 7 ? '/' : '_', rows[2].e || rows[2].a, g.cells[i][2]];
      return g;
    } };
  }
  roof('thatch', roofStyle('Солома',
    [['/\'/\'', '\'/\'/'], ['abab', 'baba'], { a: '#8a7040', b: '#6a5430', e: '#c8a060' }],
    [['~~~~', '\\"\\"'], ['rrrr', 'abab'], { r: '#d8b870', a: '#b0904a', b: '#9a7a3a', e: '#c8a060' }],
    [['\\"\\"', '"\\"\\'], ['abab', 'baba'], { a: '#b0904a', b: '#9a7a3a', e: '#c8a060' }], '#2e2410', '#3a2e14'));
  roof('tiles', roofStyle('Черепица',
    [['^ ^ ', ' ^ ^'], ['aaaa', 'aaaa'], { a: '#8a3a2a', e: '#c86a4a' }],
    [['════', '^ ^ '], ['rrrr', 'aaaa'], { r: '#e08a6a', a: '#b04a3a', e: '#c86a4a' }],
    [['^ ^ ', ' ^ ^'], ['aaaa', 'aaaa'], { a: '#c85a44', e: '#e08a6a' }], '#2a0e0a', '#3a1610'));
  roof('slate', roofStyle('Сланец',
    [['=-=-', '-=-='], ['abab', 'baba'], { a: '#4a5a6a', b: '#3a4a5a', e: '#7a8a9a' }],
    [['────', '=-=-'], ['rrrr', 'abab'], { r: '#9aaaba', a: '#5a6a7a', b: '#4a5a6a', e: '#7a8a9a' }],
    [['=-=-', '-=-='], ['abab', 'baba'], { a: '#6a7a8a', b: '#5a6a7a', e: '#9aaaba' }], '#14181e', '#1a2028'));
  roof('temple', roofStyle('Храмовая кровля',
    [['#·#·', '·#·#'], ['abab', 'baba'], { a: '#8a8478', b: '#6a645a', e: '#d0c080' }],
    [['+-+-', '#·#·'], ['rrrr', 'abab'], { r: '#f0d060', a: '#9a9488', b: '#7a746a', e: '#d0c080' }],
    [['#·#·', '·#·#'], ['abab', 'baba'], { a: '#a8a296', b: '#8a8478', e: '#d0c080' }], '#1c1a16', '#24221c'));
  roof('palace', roofStyle('Дворцовая кровля',
    [['^ ^ ', ' ^ ^'], ['aaaa', 'aaaa'], { a: '#3a5a9a', e: '#f0d060' }],
    [['◆─◆─', '^ ^ '], ['rrrr', 'aaaa'], { r: '#f0d060', a: '#4a6ab0', e: '#f0d060' }],
    [['^ ^ ', ' ^ ^'], ['aaaa', 'aaaa'], { a: '#5a7ac8', e: '#f0d060' }], '#0e1630', '#141e3c'));
  roof('wood', roofStyle('Тёс',
    [['||||', '||||'], ['abab', 'abab'], { a: '#6a4a2a', b: '#5a3d22', e: '#a07a4a' }],
    [['════', '||||'], ['rrrr', 'abab'], { r: '#b08a5a', a: '#7a5a3a', b: '#6a4a2a', e: '#a07a4a' }],
    [['||||', '||||'], ['abab', 'abab'], { a: '#8a6a40', b: '#7a5a34', e: '#b08a5a' }], '#1e140a', '#26190c'));

  // ============================================================
  // ПРЕДМЕТЫ МИРА: деревья, мебель, святыни...
  // ============================================================
  const W = { w: '#8a6a40', W: '#a8824e', d: '#5a4028', k: '#3a2a18' };
  spr('tree', { group: 'nature', name: 'Дерево', shadow: 1.3, pal: { $: '#3e7b34', g: '$c', G: '$l', d: '$d', b: '#6a4a2a' }, art: R`
 .@@.
@@@@@
'@|@'
  |`, ink: R`
 dGGd
gGgGg
dgbgd
  b` });
  spr('tree2', { group: 'nature', name: 'Дерево (2)', shadow: 1.3, pal: { $: '#4a8a3c', g: '$c', G: '$l', d: '$d', b: '#6a4a2a' }, art: R`
 ,&&.
&&&&&
 &|&
  |`, ink: R`
 dGGd
gGgGd
 gbd
  b` });
  spr('tree_bare', { group: 'nature', name: 'Дерево зимой', shadow: 1.1, pal: { b: '#7a5a3a', s: '#e8f0f8' }, art: R`
\ | /
 \|/,
  |
  |`, ink: R`
s b s
 bbbs
  b
  b` });
  spr('pine', { group: 'nature', name: 'Ель', shadow: 1.1, pal: { $: '#2e6b55', g: '$c', G: '$l', d: '$d', b: '#5a3d22' }, art: R`
  ^
 /^\
/^^^\
  |`, ink: R`
  G
 gGd
gGgGd
  b` });
  spr('pine_snow', { group: 'nature', name: 'Ель в снегу', shadow: 1.1, pal: { g: '#2e6b55', s: '#eef4f8', b: '#5a3d22' }, art: R`
  ^
 /^\
/^^^\
  |`, ink: R`
  s
 gsg
gsgsg
  b` });
  spr('deadtree', { group: 'nature', name: 'Мёртвое дерево', shadow: 1, pal: { b: '#7a6a55', d: '#5a4a3a' }, art: R`
\  /
 \/_/
  |
 /|`, ink: R`
b  b
 bdbb
  d
 dd` });
  spr('bush', { group: 'nature', name: 'Кустарник', shadow: 0.9, pal: { g: '#4f7a35', G: '#6a9a45', r: '#c04040' }, art: R`
 .o.
(@@@)`, ink: R`
 gGg
gGrGg` });
  spr('fern', { group: 'nature', name: 'Папоротник', shadow: 0.6, pal: { g: '#4a8a5a', G: '#6aaa7a' }, art: R`
\|/
/|\ `, ink: R`
gGg
gGg` });
  spr('reeds', { group: 'nature', name: 'Тростник', shadow: 0.6, frames: 2, pal: { a: '#8a9a5a', b: '#a8b06a', c: '#6a7a4a' }, art: R`
| ¦
|¦|
¦||
--
/ ¦
|¦/
¦||`, ink: R`
a b
bab
cab` });
  spr('mushroom', { group: 'nature', name: 'Гриб', shadow: 0.5, pal: { c: '#c07ad0', s: '#e0d0c0' }, art: R`
(@)
 |`, ink: R`
ccc
 s` });
  spr('bigshroom', { group: 'nature', name: 'Огромный гриб', shadow: 1.4, pal: { c: '#b05ad0', C: '#d08ae0', s: '#e0d0c0', d: '#7a3a90' }, art: R`
.-^^-.
(o__o)
  ||
  ||`, ink: R`
dCCCCd
cCccCc
  ss
  ss` });
  spr('cactus', { group: 'nature', name: 'Кактус', shadow: 0.8, pal: { g: '#5a8a3a', G: '#7aaa4a', p: '#e080a0' }, art: R`
  *
╔ ║ ╗
╚═╬═╝
  ║`, ink: R`
  p
g G g
gggGg
  g` });
  spr('coral', { group: 'nature', name: 'Коралл', shadow: 0.8, pal: { p: '#e07a8a', P: '#f0a0b0' }, art: R`
Y y
\Y/
 |`, ink: R`
P p
pPp
 p` });
  spr('sapling', { group: 'nature', name: 'Росток', shadow: 0.5, pal: { g: '#9ae07a', b: '#6a8a3a' }, art: R`
,♣,
 |`, ink: R`
ggg
 b` });
  spr('boulder', { group: 'nature', name: 'Валун', shadow: 1.1, pal: { a: '#9a9288', b: '#7a7268', d: '#5a5248' }, art: R`
.--.
(___)`, ink: R`
aaab
dbbbd` });
  spr('crystal', { group: 'nature', name: 'Кристалл', shadow: 0.6, frames: 2, pal: { a: '#9a7aff', b: '#c0a8ff', w: '#ffffff' }, art: R`
 ^
/◊\
\_/
--
 *
/◊\
\_/`, ink: R`
 w
aba
aaa` });
  spr('statue', { group: 'build', name: 'Статуя', shadow: 1, pal: { s: '#b0b0b0', d: '#7a7a7a', p: '#8a8a8a' }, art: R`
 o
/|\
 |
[_]`, ink: R`
 s
sds
 d
ppp` });
  spr('pillar', { group: 'build', name: 'Колонна', shadow: 0.9, pal: { s: '#a0a0a0', d: '#6a6a6a' }, art: R`
._.
| |
| |
[_]`, ink: R`
sss
s d
s d
sss` });
  spr('tent', { group: 'build', name: 'Палатка', shadow: 1.4, pal: { t: '#a07a50', T: '#c09a6a', d: '#5a4028' }, art: R`
  ^
 / \
/_|_\ `, ink: R`
  T
 T t
tdddt` });
  spr('shrine', { group: 'holy', name: 'Святилище', shadow: 1.2, frames: 2, pal: { s: '#a8a090', g: '#e8d27a', G: '#fff0a0', d: '#6a6458' }, art: R`
 _^_
|(Ω)|
|___|
--
 _^_
|(Ω)|
|___|`, ink: [R`
 sgs
sdgds
sssss`, R`
 sGs
sdGds
sssss`] });
  spr('altar', { group: 'holy', name: 'Алтарь', shadow: 1, frames: 2, pal: { c: '#f0e0b0', f: '#ffb040', F: '#ffe080', r: '#b04040', s: '#8a8070' }, art: R`
i  i
.==.
[##]`, ink: [R`
f  F
ssss
srrs`, R`
F  f
ssss
srrs`] });
  spr('inscription', { group: 'holy', name: 'Камень с письменами', shadow: 0.8, pal: { s: '#7a8a96', r: '#9ab0c0' }, art: R`
.-.
|≡|
|_|`, ink: R`
sss
srs
sss` });
  spr('grave', { group: 'holy', name: 'Могила', shadow: 0.7, pal: { s: '#a8a8a8', d: '#6a6a6a', e: '#4a3a28' }, art: R`
.-.
|+|
~~~`, ink: R`
sss
sds
eee` });
  spr('well', { group: 'build', name: 'Колодец', shadow: 1, frames: 2, pal: { w: '#8a6a40', s: '#8a9ab0', b: '#5a90c8' }, art: R`
/--\
|  |
(≈≈)
--
/--\
|  |
(~~)`, ink: R`
wwww
w  w
sbbs` });
  spr('campfire', { group: 'fire', name: 'Костёр', shadow: 0, frames: 3, pal: { y: '#ffe060', o: '#ff9a3a', r: '#e0502a', l: '#6a4a2a' }, art: R`
 (
 ))
/\/\
--
  )
 ((
/\/\
--
 ,
 )(
/\/\ `, ink: [R`
 y
 oy
llll`, R`
  y
 yo
llll`, R`
 y
 or
llll`] });
  spr('hearth', { group: 'fire', name: 'Очаг', shadow: 0, frames: 2, pal: { s: '#7a6a5a', f: '#ff9a3a', F: '#ffe060', d: '#4a3a2a' }, art: R`
.--.
|^^|
[==]
--
.--.
|^^|
[==]`, ink: [R`
ssss
sfFs
sdds`, R`
ssss
sFfs
sdds`] });
  spr('chest', { group: 'build', name: 'Сундук', shadow: 0.9, pal: { w: '#c8983a', d: '#7a5420', k: '#f0d060' }, art: R`
.--.
[o_]`, ink: R`
wwww
dkdd` });
  spr('table', { group: 'build', name: 'Стол', shadow: 1, pal: W, art: R`
.__.
|  |`, ink: R`
wWWw
d  d` });
  spr('counter', { group: 'build', name: 'Прилавок', shadow: 1, pal: W, art: R`
====
|__|`, ink: R`
WWWW
dddd` });
  spr('bed', { group: 'build', name: 'Кровать', shadow: 0.8, pal: { p: '#e0e0d0', b: '#8a6a8a', B: '#a88aa8', w: '#6a4a2a' }, art: R`
o===
|__|`, ink: R`
pbBb
wwww` });
  spr('anvil', { group: 'build', name: 'Наковальня', shadow: 0.9, pal: { s: '#9aa0a8', d: '#5a6068', w: '#6a4a2a' }, art: R`
,==-
 []`, ink: R`
ssss
 dd` });
  spr('alchtable', { group: 'build', name: 'Стол алхимика', shadow: 1, frames: 2, pal: { a: '#7ad0a0', b: '#d07ab0', c: '#e0d060', w: '#9a7a50', d: '#5a4028' }, art: R`
!°¡!
|__|
--
!o¡!
|__|`, ink: R`
abca
wddw` });
  spr('throne', { group: 'build', name: 'Трон', shadow: 1, pal: { g: '#e8c040', G: '#fff080', r: '#a02a2a' }, art: R`
/^^\
|##|
[__]`, ink: R`
gGGg
grrg
gggg` });
  spr('sign', { group: 'build', name: 'Указатель', shadow: 0.6, pal: { w: '#c0a070', d: '#7a5a3a' }, art: R`
[==]
 |`, ink: R`
wwww
 d` });
  spr('lighthouse', { group: 'build', name: 'Маяк', shadow: 1.3, frames: 2, pal: { l: '#fff0a0', L: '#ffffff', w: '#f0f0e0', r: '#c04040', s: '#8a8a8a' }, art: R`
 *
[#]
|=|
| |
|=|
[_]`, ink: [R`
 L
sls
wrw
w w
wrw
sss`, R`
 l
sLs
wrw
w w
wrw
sss`] });
  spr('stairs_down', { group: 'link', name: 'Спуск вниз', shadow: 0, pal: { f: '#a08a60', g: '#f0d880', d: '#3a3020' }, art: R`
.--.
|vv|`, ink: R`
ffff
fggf` });
  spr('stairs_up', { group: 'link', name: 'Путь наверх', shadow: 0, pal: { f: '#a08a60', g: '#f0d880' }, art: R`
 /\
/^^\ `, ink: R`
 ff
fggf` });
  spr('mine', { group: 'link', name: 'Вход в шахту', shadow: 0.6, pal: { w: '#a08060', d: '#5a4028', k: '#1a1410' }, art: R`
/==\
|▓▓|`, ink: R`
wwww
dkkd` });
  spr('portal', { group: 'link', name: 'Разрыв', shadow: 0, frames: 4, pal: { a: '#d080ff', b: '#a050e0', w: '#ffffff' }, art: R`
.--.
(@ )
'--'
--
.--.
( o)
'--'
--
.--.
(O )
'--'
--
.--.
( °)
'--'`, ink: R`
bbbb
awwa
bbbb` });
  spr('whirlpool', { group: 'link', name: 'Водоворот', shadow: 0, frames: 2, pal: { a: '#7ab0f0', b: '#4a80c0', w: '#e0f0ff' }, art: R`
.~~.
(@ )
--
.~~.
( @)`, ink: R`
baab
awwa` });
  spr('gate', { group: 'build', name: 'Ворота', shadow: 0, pal: { s: '#c0a070', d: '#7a5a3a' }, art: R`
┌──┐
│  │`, ink: R`
ssss
d  d` });
  spr('chimney', { group: 'build', name: 'Труба и дым', shadow: 0, outline: false, frames: 3, pal: { b: '#6a3a2a', s: '#8a8a90', S: '#5a5a62' }, art: R`
 °
~
▐
--
~
 .
▐
--
 .
 ~
▐`, ink: R`
ss
SS
b` });

  // ============================================================
  // ВЕЩИ НА ЗЕМЛЕ
  // ============================================================
  const item = (k, ch, col, name) => spr('item_' + k, { group: 'items', name, shadow: 0.35, ox: 1.5, pal: { a: col, w: '#ffffff' }, art: ch, ink: 'a' });
  item('weapon', ')', '#c0c0d0', 'Оружие');
  item('armor', '[', '#b0a090', 'Доспех');
  item('food', '%', '#d0a060', 'Еда');
  item('potion', '!', '#e06090', 'Зелье');
  item('book', '?', '#d0c090', 'Книга');
  item('trinket', '"', '#e0c070', 'Безделица');
  item('tool', '(', '#a09080', 'Инструмент');
  item('misc', '*', '#b0b0c0', 'Вещь');
  item('mat', '•', '#a0a0a0', 'Материал');
  spr('item_gold', { group: 'items', name: 'Монеты', shadow: 0.4, ox: 1, pal: { a: '#f0d040', b: '#c0a030' }, art: '.$.', ink: 'bab' });
  spr('item_art', { group: 'items', name: 'Артефакт', shadow: 0.4, ox: 1.5, frames: 2, pal: { a: '#ffe0a0', b: '#c0a0ff' }, art: '*\n--\n+', ink: 'a\n--\nb' });

  // ============================================================
  // ЛЮДИ: игрок и жители. $c — одежда, $k — кожа.
  // ============================================================
  const HUM = { h: '$k', a: '$k', b: '$c', l: '$d', s: '#c0c8d0', w: '#8a6a40', g: '#f0d060', k: '#e0e0e0', x: '#6a4a2a', p: '#9ad0e0', r: '#c04040', v: '#7ad0a0' };
  const human = (key, name, art, ink, pal, extra) => spr(key, Object.assign({ group: key.startsWith('npc') ? 'people' : 'player', name, shadow: 0.8, bold: true, pal: Object.assign({}, HUM, pal || {}), art, ink }, extra || {}));
  human('player', 'Ты', R`
 @
/|\
/ \
--
 @
/|\
| |`, R`
 h
aba
l l`, { h: '#fff6d0', b: '$c', a: '#e0c8a0', l: '$d' });
  human('npc_m', 'Житель', R`
 o
/|\
/ \ `, R`
 h
aba
l l`);
  human('npc_f', 'Жительница', R`
 o
/|\
/_\ `, R`
 h
aba
bbb`);
  human('npc_child', 'Ребёнок', R`
 o
/|\ `, R`
 h
aba`);
  human('npc_elder', 'Старик', R`
 o
/|\,
/ \|`, R`
 k
abax
l lx`);
  human('npc_guard', 'Стражник', R`
 o ^
/|\|
/ \|`, R`
 s s
asax
l lx`, { b: '#a8b8d0' });
  human('npc_hood', 'Жрец', R`
 n
/|\
/_\ `, R`
 b
aba
bbb`);
  human('npc_mage', 'Маг', R`
 n *
/|\|
/_\|`, R`
 b p
abax
bbbx`);
  human('npc_smith', 'Кузнец', R`
 o
/|\T
/ \ `, R`
 h
abas
l l`);
  human('npc_hat', 'Земледелец', R`
 ô
/|\
/ \ `, R`
 g
aba
l l`, { g: '#d8c070' });
  human('npc_fisher', 'Рыбак', R`
 o /
/|\/
/ \ `, R`
 h x
abax
l l`);
  human('npc_hunter', 'Охотник', R`
 o
/|\)
/ \ `, R`
 h
abax
l l`);
  human('npc_trader', 'Торговец', R`
 o
/|\o
/ \ `, R`
 h
abaw
l l`);
  human('npc_noble', 'Знать', R`
 w
 o
/|\
/ \ `, R`
 g
 h
aba
l l`);
  human('npc_bard', 'Бард', R`
   ♪
 o
/|\
/ \
--
  ♪
 o
/|\
/ \ `, R`
  gg
 h
aba
l l`);
  human('npc_beggar', 'Нищий', R`
 o
(|\
/ \u`, R`
 h
bba
l lw`);
  human('npc_scholar', 'Книжник', R`
 o
/|\≡
/_\ `, R`
 h
abaw
bbb`);
  human('npc_healer', 'Лекарь', R`
 o
/|\!
/ \ `, R`
 h
abav
l l`);
  human('npc_wander', 'Странник', R`
 n
/|\|
/ \|`, R`
 b
abax
l lx`);

  // ============================================================
  // СУЩЕСТВА (смотрят вправо)
  // ============================================================
  const MON = { b: '$c', d: '$d', l: '$l', e: '#ff5040', E: '#ffe060', w: '#f0f0e0', k: '#2a2a2a', t: '#f0f0f0', g: '#7ad07a', p: '#c080ff' };
  const mon = (key, name, art, ink, extra) => spr(key, Object.assign({ group: 'beasts', name, shadow: 0.9, bold: true, pal: Object.assign({}, MON, (extra && extra.pal) || {}), art, ink }, extra || {}, { pal: Object.assign({}, MON, (extra && extra.pal) || {}) }));
  mon('m_hare', 'Заяц', R`
  ()
c(_)>`, R`
  ll
wbbbd`, { shadow: 0.6 });
  mon('m_fox', 'Лиса', R`
   ^>
≈--´
 /\/\ `, R`
   ll
lbbb
 dddd`, { shadow: 0.8 });
  mon('m_wolf', 'Волк', R`
~--^>
 /\/\
--
~--^>
 \/\/`, R`
dbbll
 dddd`);
  mon('m_deer', 'Олень', R`
   Y
.--/>
 | |`, R`
   w
bbbbl
 d d`);
  mon('m_boar', 'Кабан', R`
.mm.
(___)=<`, R`
dbbd
bbbbbtt`, { shadow: 1 });
  mon('m_bear', 'Медведь', R`
 .--.o
(____)>
 || ||`, R`
 bbbbl
bbbbbbl
 dd dd`, { shadow: 1.2 });
  mon('m_mammoth', 'Мамонт', R`
 .---.
(_____)~
 || ||  `, R`
 bbbbb
bbbbbbtw
 dd dd`, { shadow: 1.5 });
  mon('m_rat', 'Крыса', R`
~o>`, R`
dbl`, { shadow: 0.5 });
  mon('m_bat', 'Летучая мышь', R`
\o/
--
-o-
--
/o\ `, R`
dbd`, { lift: 6, shadow: 0.4 });
  mon('m_snake', 'Змея', R`
~^~:>
--
^~^:>`, R`
dbdbe`, { shadow: 0.6 });
  mon('m_spider', 'Паук', R`
\(oo)/
/ '' \ `, R`
dbeebd
d dd d`, { shadow: 0.9 });
  mon('m_scorpion', 'Скорпион', R`
   _
  ( \
≡o<`, R`
   b
  b b
dbl`, { shadow: 0.8 });
  mon('m_crab', 'Краб', R`
V.,V
(__)`, R`
lbbl
bbbb`, { shadow: 0.8 });
  mon('m_croc', 'Ящер', R`
  _ _
~=====>`, R`
  e e
dbbbbbl`, { shadow: 1.2 });
  mon('m_eagle', 'Птица', R`
\_v_/
--
_/v\_`, R`
dbEbd`, { lift: 7, shadow: 0.5 });
  mon('m_worm', 'Червь', R`
 .-.
(O O)
 ) (`, R`
 bbb
beebd
 d d`, { shadow: 1.2 });
  mon('m_leech', 'Пиявка', R`
~o~`, R`
dbd`, { shadow: 0.4 });
  mon('m_bandit', 'Разбойник', R`
 o
/|\-
/ \ `, R`
 k
bdbt
d d`, { pal: { k: '#d8b090' } });
  mon('m_archer', 'Лучник', R`
 o
/|\)
/ \ `, R`
 k
bdbw
d d`, { pal: { k: '#d8b090', w: '#a08050' } });
  mon('m_cultist', 'Культист', R`
 n
/|\
/_\ `, R`
 b
dbd
bbb`);
  mon('m_soldier', 'Воин', R`
 o ^
/#\|
/ \|`, R`
 t t
bbbw
d dw`, { pal: { t: '#c0c8d0', w: '#8a6a40' } });
  mon('m_zombie', 'Мертвяк', R`
 o
/|--
/ \ `, R`
 l
dbbb
d d`);
  mon('m_skeleton', 'Скелет', R`
 o
/≡\
/ \ `, R`
 l
bbb
d d`);
  mon('m_ghoul', 'Упырь', R`
 o
(|\
/ \ `, R`
 e
bbd
d d`);
  mon('m_barrow', 'Курганный владыка', R`
 w
 o
/≡\/
/ \ `, R`
 E
 l
bbbt
d d`);
  mon('m_ghost', 'Призрак', R`
 .-.
(o o)
 ^^^
--
 .-.
(o o)
 vvv`, R`
 lll
lkbkl
 bbb`, { lift: 5, shadow: 0.5 });
  mon('m_slime', 'Слизень', R`
.--.
(oo)
--
.__.
(oo)`, R`
llll
bkkb`, { shadow: 0.8 });
  mon('m_golem', 'Голем', R`
 [=]
[|#|]
 | |`, R`
 lll
bbebb
 d d`, { shadow: 1.3 });
  mon('m_imp', 'Бес', R`
\o/
/ \ `, R`
bEb
d d`, { lift: 2, shadow: 0.5 });
  mon('m_lizard', 'Саламандра', R`
 _ _
~=o>`, R`
 d d
bbEl`, { shadow: 0.9 });
  mon('m_troll', 'Тролль', R`
 (o)
/[#]\
 | |`, R`
 lel
bbbbb
 d d`, { shadow: 1.3 });
  mon('m_hag', 'Кикимора', R`
~o~
/|\
/_\ `, R`
lel
bdb
ddd`);
  mon('m_leshy', 'Леший', R`
\|/
(oo)
/||\ `, R`
lbl
beeb
dddd`, { shadow: 1.1 });
  mon('m_treant', 'Древень', R`
 @@@
@(oo)@
 |  |`, R`
 lll
lbEEbl
 d  d`, { shadow: 1.5 });
  mon('m_harpy', 'Гарпия', R`
\o/
 V
--
_o_
 V`, R`
bkb
 d`, { lift: 6, shadow: 0.5, pal: { k: '#e0c0b0' } });
  mon('m_fishman', 'Глубинник', R`
 o~
/|\
/ \ `, R`
 ll
bdb
d d`);
  mon('m_shroom', 'Грибник', R`
(@@)
 ||
/  \ `, R`
bllb
 ww
d  d`);
  mon('m_shroombig', 'Споровик', R`
.-@@-.
(_  _)
  ||
 /  \ `, R`
blllbl
bbeebb
  ww
 d  d`, { shadow: 1.4 });
  mon('m_mimic', 'Сундук', R`
.--.
[vv]
--
/--\
[^^]`, R`
bbbb
dttd`, { pal: { b: '#c8983a', d: '#7a5420' } });
  mon('m_nightmare', 'Кошмар', R`
  ,^>
(___)
/   \ `, R`
  bbe
bbbbb
d   d`);
  mon('m_fish', 'Летучая рыба', R`
><(°>`, R`
ddbbl`, { lift: 6, shadow: 0.4 });
  mon('m_void', 'Пустотник', R`
.:.
:@:
'.'
--
:.:
.@.
:':`, R`
ddd
dbd
ddd`, { lift: 3 });
  mon('m_reflection', 'Отражение', R`
 @
/|\
/ \ `, R`
 l
bbb
d d`);
  mon('m_crawler', 'Ползун', R`
/\(o)/\
/  ''  \ `, R`
dbblbbd
d  dd  d`, { shadow: 1.1 });
  mon('m_wisp', 'Осколок', R`
 *
--
 +
--
 x`, R`
 b`, { lift: 6, shadow: 0.3 });
  mon('m_blob', 'Пожиратель', R`
*o*
'"'`, R`
lbl
ddd`);
  mon('m_herald', 'Глашатай', R`
\ ^ /
(O O)
/| |\ `, R`
l b l
beeeb
dd dd`, { shadow: 1.3 });
  mon('m_trident', 'Страж глубин', R`
 o ψ
/|\|
/ \|`, R`
 l E
bbbw
d dw`, { pal: { w: '#a0a0a0' } });
  mon('m_dragonling', 'Дракончик', R`
  /\
~=o>
 / \ `, R`
  ll
dbEl
 d d`, { shadow: 0.8 });
  mon('m_beast', 'Зверь', R`
~--^>
 /\/\ `, R`
dbbll
 dddd`);
  mon('m_thing', 'Нечто', R`
 ,-.
(o.o)
 ) (`, R`
 bbb
beleb
 d d`);

  // ============================================================
  // ВЕЛИКИЕ (боссы): крупнее, по природе существа
  // ============================================================
  const boss = (key, name, art, ink) => spr(key, { group: 'bosses', name, shadow: 1.8, bold: true, pal: Object.assign({}, MON), art, ink });
  boss('b_dragon', 'Дракон', R`
  /\___/\
 /  o  o \
<(  ^^^^  )=>
  \/\  /\/
   /_/\_\ `, R`
  lllllll
 l  E  E l
dbb tttt bbdd
  dbd  dbd
   dddddd`);
  boss('b_beast', 'Чудище', R`
 ,/\__/\,
(  O  O  )>
 \__^^__/
  /|  |\ `, R`
 llllllll
b  E  E  bl
 bbbttbbb
  dd  dd`);
  boss('b_undead', 'Мёртвый владыка', R`
  _w_
 (o.o)
 /≡≡≡\
/ |_| \
  / \ `, R`
  EEE
 lelel
 bbbbb
b dbd b
  d d`);
  boss('b_spirit', 'Великий дух', R`
  .---.
 ( O O )
(   o   )
 \^^^^^/`, R`
  lllll
 l e e l
b   d   b
 bbbbbbb`);
  boss('b_plant', 'Древний корень', R`
 \@@@@/
 @(oo)@
 \|  |/
 ~/  \~`, R`
 llllll
 lbEEbl
 dd  dd
 dd  dd`);
  boss('b_water', 'Глубинный', R`
  ~.--.~
 ((O  O))
  )~~~~(
 ~~~~~~~~`, R`
  bllllb
 bbe  ebb
  bbbbbb
 dddddddd`);
  boss('b_stone', 'Каменный исполин', R`
  [===]
 [|O O|]
 [|###|]
  || ||`, R`
  lllll
 bbelebb
 bbbbbbb
  dd dd`);
  boss('b_god', 'Божество', R`
   \ | /
  -( @ )-
   / | \
  /_____\ `, R`
   E E E
  EbbEbbE
   b b b
  ddddddd`);
  boss('b_human', 'Владыка', R`
  _w_
  (o)
 /|#|\
  | |
 _| |_`, R`
  EEE
  lll
 bbbbb
  d d
 dd dd`);
  boss('b_insect', 'Матка', R`
\\(OO)//
 /(##)\
/ /''\ \ `, R`
ddbeebdd
 dbbbbd
d dddd d`);
  boss('b_fire', 'Огненный', R`
  ) ( )
 ( (@) )
  \/^\/
  /   \ `, R`
  E b E
 b bEb b
  bbbbb
  d   d`);
  boss('b_other', 'Чужое', R`
 .-""-.
( O  O )
 )(^^)(
/ /  \ \ `, R`
 llllll
b e  e b
 bbttbb
d d  d d`);

  // низкие грани (в полряда): стены домов и пещер, чтобы не закрывать пол
  for (const k of ['wall', 'window', 'door', 'treewall', 'coralwall', 'shelf', 'cave', 'crackwall', 'ore', 'basalt', 'fleshwall', 'dreamwall', 'clockwall', 'bank']) Gfx.blocks[k].faceRows = 1;

  // ============================================================
  // ЗНАКИ И ЭФФЕКТЫ
  // ============================================================
  spr('fx_sleep', { group: 'fx', name: 'Сон', outline: true, frames: 2, ox: 3, pal: { z: '#a0b0ff' }, art: R`
z
--
Z`, ink: 'z' });
  spr('fx_hit', { group: 'fx', name: 'Удар', frames: 2, pal: { a: '#ffe060', b: '#ff6040' }, art: R`
\|/
-*-
/|\
--
 x
x*x
 x`, ink: R`
bab
aaa
bab` });
})(window.EOF);
