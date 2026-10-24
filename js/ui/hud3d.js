'use strict';
// Подсказки поверх вида от первого лица: прицел, «что перед тобой» ([E] и глагол),
// имя и здоровье того, по кому ударишь, короткая памятка управления в начале,
// метки на компасе. Здесь же — «увиденное издалека»: замки и горы на горизонте
// попадают на карту мира раньше, чем ты туда дойдёшь.
(function (E) {
  const UI = E.UI, G = E.G, T = E.T, TL = E.TL, D = E.D, U = E.U, C = E.C;
  const MW = C.MW, MH = C.MH, WS = C.WS;
  const fmt = (s) => E.Gm.fmt(s);
  // что сделает «Действие» с тем, на что смотришь
  function verbOf(f) {
    const m = G.map;
    if (!f) return null;
    if (f.kind === 'talk' && f.e) return ['Говорить', E.Dlg.label ? E.Dlg.label(f.e) : f.e.n];
    if (f.kind === 'pick') { const its = E.Gm.itemsAt(f.x, f.y); return ['Подобрать', its.length ? E.Items.name(its[0].it) + (its.length > 1 ? ' и ещё ' + (its.length - 1) : '') : '']; }
    const i = f.y * m.w + f.x, t = m.tiles[i], ft = m.feat[i];
    if (m.chests[i]) return ['Открыть', 'сундук'];
    if (ft && ft.k === 'link') return [t === T.UP ? 'Подняться' : t === T.PORTAL ? 'Шагнуть' : 'Спуститься', ft.name || TL[t].name];
    if (ft && ft.k === 'locked') return ['Отпереть', 'запертая дверь'];
    if (ft && (ft.k === 'shrine' || ft.k === 'altar')) return ['Помолиться', ft.k === 'shrine' ? 'святыня' : 'алтарь'];
    if (ft && ft.k === 'inscr') return ['Прочесть', 'надпись'];
    if (ft && ft.k === 'grave') return ['Осмотреть', 'могила'];
    if (t === T.WELL) return ['Набрать воды', 'колодец'];
    if (t === T.CAMPFIRE || t === T.HEARTH) return ['Готовить', TL[t].name];
    if (t === T.OUTHOUSE) return ['Зайти', 'нужник'];
    if (t === T.SIGN) return ['Прочесть', 'вывеска'];
    if (TL[t].ore) return ['Добыть', 'рудная жила'];
    return ['Использовать', ft && ft.name ? ft.name : TL[t].name];
  }
  UI.focusLabel = () => { const v = verbOf(G.focus); return v ? v[0] + (v[1] ? ': ' + v[1] : '') : null; };
  let started = 0;
  UI.drawHUD3D = function (ctx, t, v) {
    const RT = E.RT, P = G.P;
    if (!RT || !RT.on || !P) return;
    const cx = v.vx0 + v.vw / 2, cy = v.vy0 + v.vh / 2;
    const fpx = Math.max(11, Math.round(t.fpx * 0.9));
    ctx.save();
    ctx.font = '700 ' + fpx + 'px ' + t.family;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // прицел
    ctx.fillStyle = 'rgba(255,240,200,0.75)';
    ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 5, 2, 3); ctx.fillRect(Math.round(cx) - 1, Math.round(cy) + 3, 2, 3);
    ctx.fillRect(Math.round(cx) - 5, Math.round(cy) - 1, 3, 2); ctx.fillRect(Math.round(cx) + 3, Math.round(cy) - 1, 3, 2);
    const pill = (text, x, y, fg, bg) => {
      const w = ctx.measureText(text).width + fpx;
      ctx.fillStyle = bg || 'rgba(10,8,6,0.62)'; ctx.fillRect(Math.round(x - w / 2), Math.round(y - fpx * 0.75), Math.round(w), Math.round(fpx * 1.5));
      ctx.fillStyle = fg || '#f0e0b0'; ctx.fillText(text, x, y);
    };
    // по кому ударишь
    const a = G.aim;
    if (a && !a.dead) {
      const name = a.kind === 'npc' ? (E.Dlg.label ? E.Dlg.label(a) : a.n) : a.n;
      const hostile = a.hostile || a.hostileToP;
      pill(fmt(name), cx, cy - fpx * 3.2, hostile ? '#ff9a80' : '#e8e0c8');
      if (a.mhp) {
        const bw = Math.min(160, v.vw * 0.2), k = U.clamp(a.hp / a.mhp, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(Math.round(cx - bw / 2) - 1, Math.round(cy - fpx * 2.1) - 1, Math.round(bw) + 2, 6);
        ctx.fillStyle = hostile ? '#c84a3a' : '#7aa860'; ctx.fillRect(Math.round(cx - bw / 2), Math.round(cy - fpx * 2.1), Math.round(bw * k), 4);
      }
    }
    // что перед тобой
    const lab = UI.focusLabel();
    if (lab) pill('[E] ' + fmt(lab), cx, cy + fpx * 2.6, '#ffe6a0');
    // памятка в начале и когда мышь не «взята»
    const now = v.now;
    if (!started) started = now;
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const lines = [];
    if (now - started < 25000) {
      if (touch) lines.push('Кнопки — идти и поворачиваться', 'Потяни по картинке — оглядеться', 'Коснись земли — идти, человека или вещи — действие');
      else lines.push('WASD — идти, Shift — бегом', 'Мышь — смотреть, ЛКМ или F — удар', 'E или ПКМ — действие, Esc — меню');
    }
    if (!touch && !UI.locked) lines.push('Щёлкни по картинке, чтобы смотреть мышью');
    if (lines.length) {
      ctx.font = fpx * 0.9 + 'px ' + t.family; ctx.textAlign = 'left';
      const lh = fpx * 1.25, w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + fpx;
      const x0 = v.vx0 + 10, y0 = v.vy0 + v.vh - 12 - lines.length * lh;
      ctx.fillStyle = 'rgba(10,8,6,0.55)'; ctx.fillRect(x0 - 4, y0 - 4, w, lines.length * lh + 6);
      ctx.fillStyle = '#d8cca8';
      lines.forEach((l, i) => ctx.fillText(l, x0 + fpx * 0.3, y0 + lh * (i + 0.5)));
    }
    ctx.restore();
    seeAround();
  };

  // ---------- увиденное издалека ----------
  // каждые пару секунд: земли вокруг (их видно до горизонта) и поселения, что стоят перед глазами
  let lastSee = 0;
  function seeAround() {
    const now = performance.now(), P = G.P, m = G.map;
    if (now - lastSee < 2000 || !m || m.kind !== 'over') return;
    lastSee = now;
    const kn = P.known, seen = kn.seen = kn.seen || {};
    const gx = m.region.x * MW + (P.posX != null ? P.posX : P.x + 0.5), gz = m.region.y * MH + (P.posY != null ? P.posY : P.y + 0.5);
    const yaw = UI.V3 ? UI.V3.yaw : 0;
    let fresh = 0;
    for (const g of G.W.regions) {
      const cx = g.x * MW + MW / 2, cz = g.y * MH + MH / 2, d = Math.hypot(cx - gx, cz - gz);
      if (d > 420) continue;
      const ang = Math.atan2(cx - gx, -(cz - gz));
      let da = ang - yaw; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const inView = Math.abs(da) < 0.75 || d < 110;
      const big = g.biome === 'mountain' || (g.settlement >= 0 && ['capital', 'town'].includes(G.W.settlements[g.settlement].type));
      if (!inView || (d > 220 && !big)) continue;
      if (!seen[g.id] && !kn.regions[g.id]) { seen[g.id] = G.S.time; fresh++; }
    }
    if (fresh && (P.c.seen_far = (P.c.seen_far || 0) + fresh) && fresh >= 2 && Math.random() < 0.5) E.Gm.msg('Вдали видны новые земли. Они уже на твоей карте.', '#a0b4c8');
  }
  // метки на компасе: поселения, что ты видел или знаешь
  UI.compassMarks = function () {
    const P = G.P, m = G.map, out = [];
    if (!m || m.kind !== 'over') return out;
    const kn = P.known, seen = kn.seen || {};
    const gx = m.region.x * MW + (P.posX != null ? P.posX : P.x + 0.5), gz = m.region.y * MH + (P.posY != null ? P.posY : P.y + 0.5);
    for (const s of G.W.settlements) {
      const g = G.W.regions[s.region];
      if (!kn.regions[g.id] && !seen[g.id]) continue;
      const cx = g.x * MW + MW / 2, cz = g.y * MH + MH / 2, d = Math.hypot(cx - gx, cz - gz);
      if (d < 30 || d > 500) continue;
      out.push({ a: Math.atan2(cx - gx, -(cz - gz)), c: kn.regions[g.id] ? '#f0c060' : '#9aa8b8' });
    }
    return out;
  };
})(window.EOF);
