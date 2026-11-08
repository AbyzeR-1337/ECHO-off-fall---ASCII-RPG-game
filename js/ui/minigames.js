'use strict';
// Мини-игры ремесла и промысла. Пять устройств — у каждого дела свой вид, свои цвета и подписи:
//  timing — бегунок ходит по полосе, жми, когда он в зелёном (взлом — штифты, рубка, кирка, кузня, огранка);
//  hold   — держи, чтобы поднимать «окошко», и не упускай цель (рыбалка, зелья, готовка, коптильня);
//  rhythm — метки падают на черту, жми вовремя (посев, жатва, ткацкий станок);
//  seq    — запомни знаки и повтори (руны, рецепты, плетение);
//  arc    — стрелка бежит по кругу, останови в узком секторе (огранка камней, чеканка).
// Управление: Пробел / E / Enter / касание — «жми»; держать — то же, но удерживая; стрелки — в «повтори знаки»; Esc — бросить.
// UI.minigame(opts, done) → done({ ok, q }) — удалось ли и насколько хорошо (0…1).
(function (E) {
  const UI = E.UI, U = E.U, COL = UI.COL;
  const ARROWS = ['up', 'right', 'down', 'left'], ARR = { up: '▲', right: '▶', down: '▼', left: '◀' };
  const rnd = (a, b) => a + Math.random() * (b - a);
  UI.minigame = function (o, done) {
    o = Object.assign({ type: 'timing', title: 'Дело', hint: '', need: 3, tries: 3, speed: 1, zone: 0.18, col: '#e8c060', time: 18 }, o);
    let finished = false, holding = false, raf = 0, last = performance.now();
    const st = { t0: performance.now(), good: 0, bad: 0, perfect: 0, flash: null, msg: '' };
    // ---- состояние по виду ----
    if (o.type === 'timing') { st.pos = 0; st.dir = 1; st.zc = rnd(0.25, 0.75); }
    if (o.type === 'hold') { st.win = 0.3; st.wv = 0; st.fish = 0.5; st.fv = 0; st.prog = 0.25; st.ftgt = 0.5; }
    if (o.type === 'rhythm') { st.notes = []; st.next = 0.6; st.spawned = 0; }
    if (o.type === 'seq') { st.seq = Array.from({ length: o.need }, () => ARROWS[Math.floor(Math.random() * 4)]); st.show = true; st.i = 0; st.showT = performance.now(); }
    if (o.type === 'arc') { st.ang = 0; st.zc = rnd(0, Math.PI * 2); }
    const finish = (ok) => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      detach();
      const q = U.clamp(o.type === 'hold' ? st.prog : (st.good + st.perfect * 0.5) / Math.max(1, o.need * 1.25), 0, 1);
      setTimeout(() => { if (UI.top() === s) UI.pop(); UI.render(); done && done({ ok, q: ok ? Math.max(0.35, q) : 0, perfect: st.perfect }); }, ok ? 420 : 520);
      st.msg = ok ? (q > 0.85 ? 'Мастерски!' : 'Получилось.') : 'Не вышло.';
      UI.render();
    };
    const hitFx = (good, perfect) => { st.flash = { good, perfect, t: performance.now() }; };
    // «жми»
    const press = () => {
      if (finished) return;
      if (o.type === 'timing') {
        const d = Math.abs(st.pos - st.zc), z = o.zone / 2;
        if (d <= z) { st.good++; if (d <= z * 0.35) st.perfect++; hitFx(true, d <= z * 0.35); st.zc = rnd(0.15, 0.85); o.speed *= 1.08; if (st.good >= o.need) finish(true); }
        else { st.bad++; hitFx(false); if (o.onMiss) o.onMiss(st); if (st.bad >= o.tries) finish(false); }
      } else if (o.type === 'rhythm') {
        const n = st.notes.find((x) => !x.done && Math.abs(x.y - 0.85) < 0.09);
        if (n) { n.done = true; st.good++; if (Math.abs(n.y - 0.85) < 0.035) st.perfect++; hitFx(true, Math.abs(n.y - 0.85) < 0.035); if (st.good >= o.need) finish(true); }
        else { st.bad++; hitFx(false); if (st.bad >= o.tries) finish(false); }
      } else if (o.type === 'arc') {
        let d = Math.abs(((st.ang - st.zc) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        if (d <= o.zone * Math.PI) { st.good++; if (d <= o.zone * Math.PI * 0.35) st.perfect++; hitFx(true, d <= o.zone * Math.PI * 0.35); st.zc = rnd(0, Math.PI * 2); o.speed *= 1.1; if (st.good >= o.need) finish(true); }
        else { st.bad++; hitFx(false); if (st.bad >= o.tries) finish(false); }
      }
    };
    const arrow = (k) => {
      if (finished || o.type !== 'seq' || st.show) return;
      if (k === st.seq[st.i]) { st.i++; st.good++; hitFx(true, true); if (st.i >= st.seq.length) finish(true); }
      else { st.bad++; hitFx(false); st.i = 0; st.good = 0; if (st.bad >= o.tries) finish(false); else { st.show = true; st.showT = performance.now(); } }
    };
    // ---- кадр ----
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!finished) {
        if (o.type === 'timing') { st.pos += st.dir * dt * 0.9 * o.speed; if (st.pos > 1) { st.pos = 1; st.dir = -1; } if (st.pos < 0) { st.pos = 0; st.dir = 1; } }
        if (o.type === 'arc') st.ang += dt * 3.2 * o.speed;
        if (o.type === 'hold') {
          // окошко: держишь — поднимается, отпустил — падает; цель гуляет сама
          st.wv += (holding ? 2.6 : -2.2) * dt; st.wv = U.clamp(st.wv, -1.2, 1.2); st.win = U.clamp(st.win + st.wv * dt, 0, 1 - o.zone); if (st.win <= 0 || st.win >= 1 - o.zone) st.wv *= 0.3;
          if (Math.random() < dt * (0.9 + o.speed)) st.ftgt = U.clamp(st.ftgt + rnd(-0.45, 0.45) * o.speed, 0.05, 0.95);
          st.fv += (st.ftgt - st.fish) * dt * 3 * o.speed; st.fv *= 0.92; st.fish = U.clamp(st.fish + st.fv * dt * 4, 0, 1);
          const inside = st.fish >= st.win && st.fish <= st.win + o.zone;
          st.prog = U.clamp(st.prog + (inside ? 0.16 : -0.12) * dt * (o.rate || 1), 0, 1);
          st.inside = inside;
          if (st.prog >= 1) finish(true); else if (st.prog <= 0) finish(false);
        }
        if (o.type === 'rhythm') {
          st.next -= dt;
          if (st.next <= 0 && st.spawned < o.need + o.tries + 2) { st.notes.push({ y: 0, done: false }); st.spawned++; st.next = rnd(0.55, 1.1) / o.speed; }
          for (const n of st.notes) n.y += dt * 0.45 * o.speed;
          for (const n of st.notes) if (!n.done && n.y > 0.96) { n.done = true; n.miss = true; st.bad++; hitFx(false); }
          st.notes = st.notes.filter((n) => n.y < 1.05);
          if (st.bad >= o.tries) finish(false); else if (st.spawned >= o.need + o.tries + 2 && !st.notes.length) finish(st.good >= o.need);
        }
        if (o.type === 'seq' && st.show && now - st.showT > 900 + st.seq.length * 520) st.show = false;
        if ((now - st.t0) / 1000 > o.time && o.type !== 'hold' && o.type !== 'seq') finish(st.good >= Math.ceil(o.need * 0.6));
      }
      UI.render();
      if (!finished) raf = requestAnimationFrame(step);
    };
    // ---- ввод: держать (клавиша или палец) ----
    const kd = (ev) => { if (['Space', 'Enter', 'KeyE', 'NumpadEnter'].includes(ev.code)) { holding = true; } };
    const ku = (ev) => { if (['Space', 'Enter', 'KeyE', 'NumpadEnter'].includes(ev.code)) holding = false; };
    const pd = () => { holding = true; };
    const pu = () => { holding = false; };
    const attach = () => { window.addEventListener('keydown', kd, true); window.addEventListener('keyup', ku, true); window.addEventListener('pointerdown', pd, true); window.addEventListener('pointerup', pu, true); window.addEventListener('pointercancel', pu, true); };
    const detach = () => { window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', ku, true); window.removeEventListener('pointerdown', pd, true); window.removeEventListener('pointerup', pu, true); window.removeEventListener('pointercancel', pu, true); };
    // ---- рисунок ----
    const s = {
      name: 'minigame', full: false,
      draw(t) {
        const W = Math.min(t.cols - 4, 56), H = Math.min(t.rows - 2, 15);
        const x0 = Math.floor((t.cols - W) / 2), y0 = Math.max(1, Math.floor((t.rows - H) / 2));
        t.box(x0, y0, W, H, COL.accent, COL.panel, o.title);
        const hint = o.hint || ({ timing: 'Жми, когда бегунок в светлой полосе', hold: 'Держи — окошко поднимается, отпусти — опускается. Держи цель в окошке', rhythm: 'Жми, когда метка на черте', seq: st && st.show ? 'Запомни знаки…' : 'Повтори стрелками', arc: 'Останови стрелку в светлом секторе' })[o.type];
        t.text(x0 + 2, y0 + 1, hint, COL.dim, COL.panel, W - 4);
        const left = o.type === 'hold' ? '' : o.type === 'seq' ? 'Верно: ' + st.i + ' / ' + st.seq.length : 'Попаданий: ' + st.good + ' / ' + o.need;
        t.text(x0 + 2, y0 + H - 2, left + (o.tries < 99 && o.type !== 'hold' ? '   Промахов: ' + st.bad + ' / ' + o.tries : '') + (st.msg ? '   ' + st.msg : ''), st.msg ? COL.accent : COL.text, COL.panel, W - 4);
        t.text(x0 + W - 15, y0 + H - 1, ' Esc — бросить ', COL.faint, COL.panel);
        t.hot(0, 0, t.cols, t.rows, () => { if (o.type === 'hold') return; if (o.type === 'seq') return; press(); });
        const px = (x0 + 2) * t.cw, py = (y0 + 3) * t.ch, pw = (W - 4) * t.cw, ph = (H - 6) * t.ch;
        t.post.push((ctx) => draw(ctx, px, py, pw, ph, t));
      },
      key(c) {
        if (c.k === 'esc') { finish(false); return; }
        if (o.type === 'seq' && ARROWS.includes(c.k)) { arrow(c.k); return; }
        if (['enter', 'act', 'fire', 'jump', 'wait'].includes(c.k)) { if (o.type !== 'hold') press(); }
      },
    };
    function draw(ctx, x, y, w, h, t) {
      const now = performance.now(), fl = st.flash && now - st.flash.t < 350 ? st.flash : null;
      ctx.fillStyle = fl ? (fl.good ? (fl.perfect ? 'rgba(255,230,140,0.18)' : 'rgba(140,220,120,0.14)') : 'rgba(255,90,70,0.18)') : 'rgba(0,0,0,0)';
      ctx.fillRect(x, y, w, h);
      if (o.type === 'timing') {
        const by = y + h * 0.35, bh = h * 0.3;
        ctx.fillStyle = '#1a1620'; ctx.fillRect(x, by, w, bh);
        ctx.fillStyle = 'rgba(232,200,96,0.28)'; ctx.fillRect(x + w * (st.zc - o.zone / 2), by, w * o.zone, bh);
        ctx.fillStyle = 'rgba(255,240,180,0.55)'; ctx.fillRect(x + w * (st.zc - o.zone * 0.175), by, w * o.zone * 0.35, bh);
        ctx.fillStyle = o.col; ctx.fillRect(x + w * st.pos - 3, by - 6, 6, bh + 12);
        if (o.glyph) { ctx.font = Math.round(bh * 0.9) + 'px ' + t.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ece0c0'; ctx.fillText(o.glyph, x + w * st.pos, by - bh * 0.7); }
        // штифты замка: сколько уже поставлено
        if (o.pins) for (let i = 0; i < o.need; i++) { ctx.fillStyle = i < st.good ? '#e8c060' : '#3a3440'; ctx.fillRect(x + w / 2 - o.need * 12 + i * 24, y + h * 0.78, 16, h * 0.16); }
      } else if (o.type === 'hold') {
        const bx = x + w * 0.42, bw = w * 0.16;
        ctx.fillStyle = '#14202a'; ctx.fillRect(bx, y, bw, h);
        const wy = y + h * (1 - st.win - o.zone);
        ctx.fillStyle = st.inside ? 'rgba(140,220,140,0.55)' : 'rgba(140,200,240,0.35)'; ctx.fillRect(bx, wy, bw, h * o.zone);
        ctx.font = Math.round(bw * 0.7) + 'px ' + t.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = o.col;
        ctx.fillText(o.glyph || '◆', bx + bw / 2, y + h * (1 - st.fish));
        // прогресс
        ctx.fillStyle = '#1a1620'; ctx.fillRect(bx + bw + 14, y, 10, h);
        ctx.fillStyle = st.prog > 0.66 ? '#8ce08a' : st.prog > 0.33 ? '#e8c060' : '#e07050'; ctx.fillRect(bx + bw + 14, y + h * (1 - st.prog), 10, h * st.prog);
        ctx.fillStyle = '#c8bca0'; ctx.textAlign = 'left'; ctx.font = Math.round(t.fpx * 0.8) + 'px ' + t.family; ctx.fillText(holding ? 'держишь' : 'отпущено', x, y + h * 0.5);
      } else if (o.type === 'rhythm') {
        const cx = x + w / 2, lw = w * 0.22;
        ctx.fillStyle = '#16141c'; ctx.fillRect(cx - lw / 2, y, lw, h);
        ctx.fillStyle = 'rgba(232,200,96,0.6)'; ctx.fillRect(cx - lw / 2 - 8, y + h * 0.85 - 2, lw + 16, 4);
        ctx.font = Math.round(lw * 0.5) + 'px ' + t.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const n of st.notes) { ctx.fillStyle = n.miss ? '#7a4a40' : n.done ? '#8ce08a' : o.col; ctx.fillText(o.glyph || '●', cx, y + h * n.y); }
      } else if (o.type === 'seq') {
        ctx.font = Math.round(h * 0.4) + 'px ' + t.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const n = st.seq.length, gap = w / (n + 1);
        st.seq.forEach((k, i) => {
          const showNow = st.show && now - st.showT > 300 + i * 520;
          ctx.fillStyle = i < st.i ? '#8ce08a' : showNow ? o.col : '#3a3440';
          ctx.fillText(st.show || i < st.i ? (o.glyphs ? o.glyphs[ARROWS.indexOf(k)] : ARR[k]) : '?', x + gap * (i + 1), y + h / 2);
        });
      } else if (o.type === 'arc') {
        const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) * 0.42;
        ctx.lineWidth = 8; ctx.strokeStyle = '#1e1a26'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(232,200,96,0.6)'; ctx.beginPath(); ctx.arc(cx, cy, r, st.zc - o.zone * Math.PI, st.zc + o.zone * Math.PI); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = o.col; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(st.ang) * r, cy + Math.sin(st.ang) * r); ctx.stroke();
        if (o.glyph) { ctx.font = Math.round(r * 0.6) + 'px ' + t.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ece0c0'; ctx.fillText(o.glyph, cx, cy); }
      }
      if (fl) { ctx.font = '700 ' + Math.round(t.fpx * 1.1) + 'px ' + t.family; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = fl.good ? (fl.perfect ? '#ffe68a' : '#a8f0a0') : '#ff8a7a'; ctx.fillText(fl.good ? (fl.perfect ? 'Точно!' : 'Да!') : 'Мимо', x + w / 2, y + 12); }
    }
    attach();
    UI.push(s);
    raf = requestAnimationFrame(step);
    UI.mgActive = () => !finished;
    return s;
  };
  // простая обёртка: открыть, если тестовый режим не просит пропустить
  // в настройках можно выключить мини-игры (тогда — средний результат сразу); тесты подставляют свой ответ
  UI.mgOff = () => { try { return localStorage.getItem('eotf_mg') === 'off'; } catch (e) { return false; } };
  UI.mgPlay = function (o, done) {
    const hook = window.EOF_TEST_MG;
    if (hook) { const r = hook(o); if (r) { done(r); return; } }
    if (UI.mgOff() || !UI.t) { done({ ok: Math.random() < 0.75, q: 0.55 }); return; }
    UI.minigame(o, done);
  };
})(window.EOF);
