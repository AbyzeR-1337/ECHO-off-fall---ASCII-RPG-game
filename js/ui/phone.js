'use strict';
// Телефон, повёрнутый горизонтально: картинка во весь экран, всё управление — поверх неё.
// Слева — джойстик (вперёд, назад, шаг вбок; до упора вперёд — бегом), правый палец по картинке — оглядеться,
// справа внизу под большим пальцем — удар, «E» (действие), прыжок, удар второй рукой, следующее заклинание;
// слева сверху — меню, сумка, карта, персонаж и «ещё». В окнах (разговор, сумка, торговля) — «Назад», ▲ ▼ и «OK»;
// по спискам можно вести пальцем вверх-вниз. Телефон стоит вертикально — просим повернуть.
(function (E) {
  const UI = E.UI, G = E.G;
  const PH = UI.phone = { on: false };
  const coarse = () => document.body.classList.contains('force-phone') || !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  PH.want = () => coarse() && window.innerWidth >= window.innerHeight;
  PH.portrait = () => coarse() && window.innerHeight > window.innerWidth && Math.min(window.innerWidth, window.innerHeight) < 620;
  PH.update = function () {
    const on = PH.want();
    if (on !== PH.on) { PH.on = on; document.body.classList.toggle('phone', on); }
    document.body.classList.toggle('rotate', PH.portrait() && !PH.dismissed);
    return on;
  };
  const top = () => UI.top && UI.top();
  const inGame = () => { const t = top(); return !!(t && t.name === 'game' && G.P && !G.P.dead && !G.P.ended); };
  const live = () => !!(E.RT && E.RT.on && inGame());
  const key = (k) => { UI.key(typeof k === 'object' ? k : { k }); UI.render(); };

  // ---------- джойстик ----------
  function joystick() {
    const base = document.getElementById('joy');
    if (!base) return;
    const knob = base.querySelector('.knob');
    let id = null, cx = 0, cy = 0, R = 50, held = new Set(), dirKey = null, rep = null;
    const stopRep = () => { if (rep) { clearInterval(rep); rep = null; } dirKey = null; };
    const setHeld = (keys, run) => {
      const RT = E.RT;
      if (!RT) return;
      for (const k of held) if (!keys.has(k)) RT.held.delete(k);
      for (const k of keys) RT.held.add(k);
      held = keys;
      RT.run = !!run;
      if (keys.size) RT.path = null;
    };
    const move = (ev) => {
      let dx = ev.clientX - cx, dy = ev.clientY - cy;
      const l = Math.hypot(dx, dy), k = l > R ? R / l : 1;
      dx *= k; dy *= k;
      knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      const nx = dx / R, ny = dy / R, mag = Math.hypot(nx, ny);
      if (live()) {
        const keys = new Set();
        if (mag > 0.28) {
          if (ny < -0.38) keys.add('fwd'); else if (ny > 0.38) keys.add('back');
          if (nx < -0.38) keys.add('strL'); else if (nx > 0.38) keys.add('strR');
        }
        base.classList.toggle('run', mag > 0.94 && ny < -0.5);
        setHeld(keys, mag > 0.94 && ny < -0.5);
      } else if (inGame()) {
        // без живого мира — шаг по клеткам, пока держишь
        const d = mag < 0.45 ? null : ['right', 'dr', 'down', 'dl', 'left', 'ul', 'up', 'ur'][(Math.round(Math.atan2(ny, nx) / (Math.PI / 4)) + 8) % 8];
        if (d !== dirKey) { stopRep(); dirKey = d; if (d) { key(d); rep = setInterval(() => key(d), 170); } }
      }
    };
    base.addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      id = ev.pointerId;
      try { base.setPointerCapture(id); } catch (e) { /* */ }
      const r = base.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = r.width * 0.42;
      base.classList.add('on');
      move(ev);
    });
    base.addEventListener('pointermove', (ev) => { if (ev.pointerId === id) { ev.preventDefault(); move(ev); } });
    const end = (ev) => { if (ev.pointerId !== id) return; id = null; knob.style.transform = ''; base.classList.remove('on', 'run'); setHeld(new Set(), false); stopRep(); };
    base.addEventListener('pointerup', end);
    base.addEventListener('pointercancel', end);
    PH.release = () => { id = null; knob.style.transform = ''; base.classList.remove('on', 'run'); setHeld(new Set(), false); stopRep(); };
  }

  // ---------- кнопки ----------
  // следующее заклинание (посох) или заряд (лук); без них — следующее оружие с пояса
  function nextLoad() {
    const LO = E.Loadout, P = G.P;
    if (LO && LO.active()) {
      const h = LO.hand(), w = P.eq[h], list = LO.list(w), cur = LO.cur(w);
      if (list.length) { const i = Math.max(0, list.findIndex((x) => cur && x.id === cur.id)); LO.select(((i + 1) % list.length) + 1); }
    } else if (UI.wheel) UI.wheel(1);
    UI.render();
  }
  const ACT = {
    fire: () => { if (live()) E.RT.attack(); else key('fire'); },
    off: () => { if (live()) E.RT.attack('off'); },
    act: () => key('act'),
    jump: () => key('jump'),
    next: nextLoad,
    menu: () => key('esc'),
    inv: () => key('inv'), map: () => key('map'), char: () => key('char'), skills: () => key('skills'), pray: () => key('pray'),
    rest: () => key('rest'), rel: () => key('rel'), mem: () => key('mem'), look: () => key('look'), log: () => key('log'),
    know: () => key('stats'), view: () => key('gup'), fx3d: () => key('fx3d'), wait: () => key('wait'),
    more: () => { document.body.classList.toggle('pmore'); },
    back: () => key('esc'), up: () => key('up'), down: () => key('down'), enter: () => key('enter'),
  };
  // держишь «Удар» — бьёшь снова и снова; «▲ ▼» — листаешь
  const REPEAT = { fire: 140, off: 140, up: 160, down: 160 };
  function buttons() {
    for (const b of document.querySelectorAll('#phone [data-p]')) {
      let rep = null;
      const stop = () => { if (rep) { clearInterval(rep); rep = null; } b.classList.remove('down'); };
      b.addEventListener('pointerdown', (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const k = b.dataset.p, f = ACT[k];
        b.classList.add('down');
        if (k !== 'more') document.body.classList.remove('pmore');
        if (f) f();
        if (REPEAT[k]) { stop(); b.classList.add('down'); let n = 0; rep = setInterval(() => { if (++n > 2 && f) f(); }, REPEAT[k]); }
      });
      b.addEventListener('pointerup', stop);
      b.addEventListener('pointerleave', stop);
      b.addEventListener('pointercancel', stop);
    }
    const rot = document.getElementById('rotate');
    if (rot) rot.addEventListener('pointerdown', (ev) => { ev.preventDefault(); PH.dismissed = true; PH.update(); });
  }

  // ---------- что показывать: игра или окно ----------
  let lastMode = '';
  PH.sync = function () {
    if (!PH.on) return;
    const mode = inGame() ? 'game' : 'menu';
    if (mode !== lastMode) {
      lastMode = mode;
      document.body.classList.toggle('pgame', mode === 'game');
      document.body.classList.toggle('pmenu', mode === 'menu');
      if (mode !== 'game') { document.body.classList.remove('pmore'); if (PH.release) PH.release(); }
    }
    // где кончается джойстик и начинаются кнопки — панель 1–0 и журнал ложатся между ними
    const j = document.getElementById('joy'), a = document.querySelector('#phone .pacts'), cv = UI.t && UI.t.cv;
    if (j && a && cv && mode === 'game') { const c = cv.getBoundingClientRect(), jr = j.getBoundingClientRect(), ar = a.getBoundingClientRect(); if (jr.width) { PH.padL = jr.right - c.left + 6; PH.padR = c.right - ar.left + 6; } }
    // посох или лук в руке — кнопка «следующее» подписана по делу
    const nb = document.querySelector('#phone [data-p="next"]');
    if (nb) { const LO = E.Loadout, t = LO && LO.active() ? (LO.kind(G.P.eq[LO.hand()]) === 'staff' ? 'Чары' : 'Заряд') : 'Оружие'; if (nb._t !== t) { nb._t = t; nb.querySelector('span').textContent = t; } }
  };
  // во весь экран и горизонтально — с первого касания (браузер разрешает только после касания)
  function fullscreen() {
    document.addEventListener('pointerdown', () => {
      if (!PH.on || PH.fsTried) return;
      PH.fsTried = true;
      const el = document.documentElement;
      try {
        const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null;
        const lock = () => { try { const q = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (q && q.catch) q.catch(() => 0); } catch (e) { /* не везде можно */ } };
        if (p && p.then) p.then(lock).catch(() => 0); else lock();
      } catch (e) { /* без полного экрана */ }
    }, { capture: true });
  }
  // по спискам — вести пальцем вверх-вниз
  function swipe() {
    const cv = document.getElementById('screen');
    if (!cv) return;
    let sy = null, acc = 0;
    cv.addEventListener('pointerdown', (ev) => { if (PH.on && !inGame() && ev.pointerType !== 'mouse') { sy = ev.clientY; acc = 0; } }, { capture: true });
    cv.addEventListener('pointermove', (ev) => {
      if (sy == null) return;
      const t = top();
      if (!t || t.drag) return;
      acc += ev.clientY - sy; sy = ev.clientY;
      const step = UI.t ? UI.t.ch : 20;
      while (Math.abs(acc) >= step) { const k = acc > 0 ? 'up' : 'down'; acc -= Math.sign(acc) * step; if (t.wheel) t.wheel(k === 'up' ? -1 : 1); else UI.key({ k }); UI.render(); }
    });
    const end = () => { sy = null; };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  }
  PH.init = function () {
    joystick(); buttons(); fullscreen(); swipe();
    PH.update();
    // каждый кадр — показать нужный набор кнопок
    const r0 = UI.render;
    UI.render = function () { const r = r0.apply(this, arguments); try { PH.sync(); } catch (e) { /* */ } return r; };
  };
})(window.EOF);
