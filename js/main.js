'use strict';
// Запуск: терминал, ввод с клавиатуры, мыши и сенсорного экрана.
(function (E) {
  const U = E.U, UI = E.UI, G = E.G;
  const FAMILY = '"JetBrains Mono", "DejaVu Sans Mono", "Cascadia Mono", Menlo, Consolas, "Liberation Mono", monospace';
  const CODE = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    Numpad8: 'up', Numpad2: 'down', Numpad4: 'left', Numpad6: 'right', Numpad7: 'ul', Numpad9: 'ur', Numpad1: 'dl', Numpad3: 'dr', Numpad5: 'wait',
    Home: 'home', End: 'end', PageUp: 'pgup', PageDown: 'pgdn',
    KeyE: 'act', Space: 'act', KeyG: 'act', Enter: 'enter', NumpadEnter: 'enter', Escape: 'esc', Tab: 'tab',
    KeyQ: 'tl', KeyI: 'inv', KeyC: 'char', KeyP: 'pray', KeyK: 'skills', KeyM: 'map', KeyJ: 'mem', KeyR: 'rest', KeyF: 'fire', KeyL: 'look', KeyX: 'look', KeyH: 'log', KeyV: 'view', KeyB: 'body', KeyO: 'outfit', KeyT: 'stats',
    Equal: 'zin', NumpadAdd: 'zin', Minus: 'zout', NumpadSubtract: 'zout', BracketLeft: 'gdown', BracketRight: 'gup',
    Period: 'wait', KeyZ: 'wait', NumpadDecimal: 'wait', F1: 'help', Slash: 'help',
  };
  // в живом мире направления держат, а не нажимают: пока держишь — идёшь
  const HOLD = {
    ArrowUp: 'fwd', KeyW: 'fwd', Numpad8: 'fwd', ArrowDown: 'back', KeyS: 'back', Numpad2: 'back',
    ArrowLeft: 'turnL', Numpad4: 'turnL', KeyQ: 'turnL', ArrowRight: 'turnR', Numpad6: 'turnR', KeyA: 'strL', KeyD: 'strR',
    Numpad7: 'ul', Home: 'ul', Numpad9: 'ur', PageUp: 'ur', Numpad1: 'dl', End: 'dl', Numpad3: 'dr', PageDown: 'dr',
  };
  const liveGame = () => { const RT = E.RT, top = UI.top(); return RT && RT.on && top && top.name === 'game' && G.P && !G.P.dead && !G.P.ended; };
  let term;
  function cmdFromEvent(ev) {
    const c = { raw: ev.key, code: ev.code };
    let k = CODE[ev.code];
    if (ev.code && ev.code.startsWith('Digit') && !ev.shiftKey) { c.n = +ev.code.slice(5); }
    else if (ev.code && ev.code.startsWith('Numpad') && /\d$/.test(ev.code) && !k) c.n = +ev.code.slice(6);
    if (ev.key === '?') k = 'help';
    if (ev.key === '>' || ev.key === '<') k = 'act';
    c.k = k || null;
    return c;
  }
  function onKey(ev) {
    const inp = document.getElementById('nameInput');
    const top = UI.top();
    if (top && top.name === 'create' && document.activeElement === inp) {
      if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); UI.key({ k: 'down' }); }
      else if (ev.key === 'Escape') { inp.blur(); }
      return;
    }
    if (liveGame()) {
      const RT = E.RT, hk = HOLD[ev.code];
      if (hk) { ev.preventDefault(); if (!ev.repeat) { RT.held.add(hk); RT.path = null; UI.auto = null; } return; }
      if (ev.key === 'Shift') { RT.run = true; return; }
      if (ev.code === 'KeyF' && UI.is3D && UI.is3D()) { ev.preventDefault(); RT.attack(); return; }
      if (ev.repeat && ['KeyE', 'Space', 'KeyG'].includes(ev.code)) { ev.preventDefault(); return; }
    }
    const c = cmdFromEvent(ev);
    if (!c.k && !c.n && !(top && top.name === 'create')) return;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash', 'F1', 'Backspace'].includes(ev.code) || c.k) ev.preventDefault();
    UI.key(c);
  }
  function layout() {
    const touch = document.getElementById('touch');
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const showTouch = coarse || window.innerWidth < 720 || document.body.classList.contains('force-touch');
    touch.style.display = showTouch ? 'grid' : 'none';
    const th = showTouch ? touch.getBoundingClientRect().height + 4 : 0;
    const W = window.innerWidth - 4, H = window.innerHeight - th - 4;
    let fs;
    if (showTouch && W < 900) fs = U.clamp(Math.floor(W / 44 / 0.6), 9, 17);
    else fs = U.clamp(Math.floor(H / 40), 12, 22);
    // хотя бы 96 колонок на широком экране
    if (!showTouch || W >= 900) while (fs > 11 && W / (fs * 0.6) < 98) fs--;
    term.resize(W, H, fs, FAMILY);
    UI.render();
  }
  function boot() {
    const cv = document.getElementById('screen');
    // правки рисунков из студии (tools/studio.html)
    if (E.Gfx) E.Gfx.applyOverrides();
    term = new E.Term(cv);
    UI.t = term;
    layout();
    window.addEventListener('resize', layout);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', (ev) => { const RT = E.RT; if (!RT) return; const hk = HOLD[ev.code]; if (hk) RT.held.delete(hk); if (ev.key === 'Shift') RT.run = false; });
    window.addEventListener('blur', () => { const RT = E.RT; if (RT) { RT.held.clear(); RT.run = false; } });
    // мышь от первого лица: щелчок по картинке «берёт» мышь — дальше она поворачивает голову
    const SENS = 0.0026;
    document.addEventListener('mousemove', (ev) => {
      if (document.pointerLockElement !== cv || !UI.V3) return;
      const V3 = UI.V3;
      V3.yaw += ev.movementX * SENS; V3.yawT = V3.yaw;
      V3.pitch = U.clamp((V3.pitch || 0) - ev.movementY * SENS, -0.62, 0.5);
    });
    document.addEventListener('pointerlockchange', () => { UI.locked = document.pointerLockElement === cv; UI.render(); });
    // мышь и касания
    const pos = (ev) => { const r = cv.getBoundingClientRect(); return term.cellAt(ev.clientX - r.left, ev.clientY - r.top); };
    cv.addEventListener('contextmenu', (ev) => ev.preventDefault());
    // от первого лица: потянуть по карте — оглядеться; короткое касание — клик
    let pend = null;
    cv.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      // мышь уже «взята»: левая кнопка — удар, правая — действие
      if (document.pointerLockElement === cv) {
        if (liveGame()) { if (ev.button === 2) E.Gm.interact(); else E.RT.attack(); UI.render(); }
        return;
      }
      if (liveGame() && UI.is3D && UI.is3D() && ev.pointerType === 'mouse' && ev.button === 0 && UI.mv3 && cv.requestPointerLock) {
        const r0 = cv.getBoundingClientRect(), x = ev.clientX - r0.left, y = ev.clientY - r0.top, v = UI.mv3;
        if (x >= v.vx0 && x < v.vx0 + v.vw && y >= v.vy0 && y < v.vy0 + v.vh) { try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => 0); } catch (e) { /* без захвата — тянуть мышью */ } return; }
      }
      const [cx, cy] = pos(ev);
      const h = term.hit(cx, cy);
      const r = cv.getBoundingClientRect();
      const top = UI.top();
      if (h && UI.is3D && UI.is3D() && top && top.name === 'game' && UI.mv3 && ev.clientX - r.left >= UI.mv3.vx0 && ev.clientX - r.left < UI.mv3.vx0 + UI.mv3.vw && ev.clientY - r.top >= UI.mv3.vy0 && ev.clientY - r.top < UI.mv3.vy0 + UI.mv3.vh) {
        pend = { h, cx, cy, b: ev.button, x: ev.clientX - r.left, y: ev.clientY - r.top };
        UI.V3.dragStart(ev.clientX, ev.clientY);
        try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* */ }
        return;
      }
      if (h) { h.fn(h, cx, cy, ev.button, ev.clientX - r.left, ev.clientY - r.top); UI.render(); }
      else if (UI.top() && UI.top().name === 'popup') { UI.pop(); }
    });
    cv.addEventListener('pointermove', (ev) => { if (pend && UI.V3) UI.V3.dragMove(ev.clientX, ev.clientY); });
    const release = () => {
      if (!pend) return;
      const p = pend; pend = null;
      if (!UI.V3.dragEnd()) { p.h.fn(p.h, p.cx, p.cy, p.b, p.x, p.y); UI.render(); }
    };
    cv.addEventListener('pointerup', release);
    cv.addEventListener('pointercancel', () => { pend = null; if (UI.V3) UI.V3.dragEnd(); });
    // мышь над экраном — подсказки к вещам и эффектам
    cv.addEventListener('pointermove', (ev) => {
      if (ev.pointerType && ev.pointerType !== 'mouse') return;
      const c = pos(ev);
      if (!UI.mouse || UI.mouse[0] !== c[0] || UI.mouse[1] !== c[1]) { UI.mouse = c; UI.render(); }
    });
    cv.addEventListener('pointerleave', () => { if (UI.mouse) { UI.mouse = null; UI.render(); } });
    // колесо: на карте — масштаб, в списках — прокрутка
    cv.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      const top = UI.top();
      if (top && top.name === 'game') { if (UI.view3d) UI.zoom(ev.deltaY > 0 ? -1 : 1); return; }
      UI.key({ k: ev.deltaY > 0 ? 'down' : 'up' });
    }, { passive: false });
    // сенсорные кнопки
    let rep = null;
    const stop = () => { if (rep) { clearInterval(rep); rep = null; } };
    for (const b of document.querySelectorAll('#touch [data-k]')) {
      b.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        const k = b.dataset.k;
        // живой мир: кнопки направлений держат
        const TH = { up: 'fwd', down: 'back', left: 'turnL', right: 'turnR', ul: 'strL', ur: 'strR', dl: 'dl', dr: 'dr' };
        if (liveGame() && TH[k]) { E.RT.held.add(TH[k]); E.RT.path = null; b._held = TH[k]; return; }
        const c = /^\d$/.test(k) ? { n: +k } : { k };
        UI.key(c);
        if (['up', 'down', 'left', 'right', 'ul', 'ur', 'dl', 'dr', 'wait'].includes(k)) { stop(); let n = 0; rep = setInterval(() => { if (++n > 2) UI.key(c); }, 140); }
      });
      const up = () => { stop(); if (b._held && E.RT) { E.RT.held.delete(b._held); b._held = null; } };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointerleave', up);
      b.addEventListener('pointercancel', up);
    }
    // живой мир: каждый кадр — ход часов, шаги и картинка
    const loop = (now) => {
      requestAnimationFrame(loop);
      const RT = E.RT;
      if (!RT) return;
      const live = RT.frame(now);
      if (!live) { if (RT.held.size && !liveGame()) RT.held.clear(); if (document.pointerLockElement === cv && !liveGame()) document.exitPointerLock(); return; }
      UI.render();
    };
    requestAnimationFrame(loop);
    // анимация: пепел на заставке, огонь, дождь
    setInterval(() => {
      const top = UI.top();
      if (!top) return;
      if (E.RT && E.RT.active()) return;
      if (top.anim) { UI.render(); return; }
      const now = performance.now();
      if (G.map && G.P && UI.stack.some((s) => s.name === 'game')) {
        const w = E.Gm.weather();
        if (['rain', 'storm', 'snow', 'blizzard', 'blacksnow', 'ashrain', 'sandstorm'].includes(w) || (G.fxFlash && now - G.fxFlash.t < 400) || (G.hitFlash && now - G.hitFlash < 250) || G.map.dimName || G.map.kind === 'dun') UI.render();
        else if (now - (UI.lastIdle || 0) > (UI.gfxLevel >= 3 ? 200 : UI.view3d ? 280 : 600)) { UI.lastIdle = now; UI.render(); }
      }
    }, 140);
    UI.push(UI.titleScreen());
  }
  E.boot = boot;
  window.addEventListener('load', () => {
    const go = () => { try { boot(); } catch (e) { document.body.innerHTML = '<pre style="color:#e88;padding:1em">' + (e.stack || e) + '</pre>'; } };
    // шрифт лежит рядом с игрой; холст сам его не запросит — просим явно (латиница и кириллица)
    const want = document.fonts && document.fonts.load ? ['400', '700'].map((w) => document.fonts.load(w + ' 16px "JetBrains Mono"', 'Aa Яя')) : [];
    if (document.fonts && document.fonts.ready) Promise.race([Promise.all(want.concat(document.fonts.ready)).catch(() => 0), new Promise((r) => setTimeout(r, 1500))]).then(go);
    else go();
  });
})(window.EOF);
