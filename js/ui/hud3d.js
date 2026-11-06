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
    if (t === T.CAMPFIRE || t === T.HEARTH || t === T.OVEN || t === T.KILN) return ['Готовить', TL[t].name];
    if (t === T.BELFRY) return ['Ударить в колокол', 'колокольня'];
    if (t === T.WAYCROSS) return ['Постоять', 'придорожный знак'];
    if ([T.GALLOWS, T.PILLORY, T.GIBBET, T.PIKE, T.WINDMILL, T.WOODPILE].includes(t)) return ['Осмотреть', TL[t].name];
    if (t === T.OUTHOUSE) return ['Зайти', 'нужник'];
    if (t === T.SIGN) return ['Прочесть', 'вывеска'];
    if (TL[t].stall || (m.stalls && m.stalls[i])) return ['Торговать', t === T.COUNTER ? 'стойка' : E.Gm.stallName(m, f.x, f.y)];
    if (TL[t].ore) return E.Gm.toolEq('pick') ? ['Добыть киркой', 'рудная жила'] : ['Нужна кирка', 'рудная жила — или чары земли, бури, огня'];
    if (TL[t].crystal) return E.Gm.toolEq('pick') ? ['Отколоть', 'кристалл'] : ['Нужна кирка', 'кристалл'];
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
    // прицел (от первого лица); сверху-сзади — имя над головой героя, подписи жителей, панель 1–0
    if (v.third) { drawLabels(ctx, t, v, fpx); drawHotbar(ctx, t, v, fpx); drawCursor(ctx, v); }
    // название земли при входе — в любом виде
    drawTitle(ctx, t, v, fpx);
    drawTips(ctx, t, v, fpx);
    drawPops(ctx, t, v, fpx);
    drawFxRow(ctx, t, v, fpx);
    drawEntFx(ctx, t, v, fpx);
    if (!v.third) {
      ctx.fillStyle = 'rgba(255,240,200,0.75)';
      ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 5, 2, 3); ctx.fillRect(Math.round(cx) - 1, Math.round(cy) + 3, 2, 3);
      ctx.fillRect(Math.round(cx) - 5, Math.round(cy) - 1, 3, 2); ctx.fillRect(Math.round(cx) + 3, Math.round(cy) - 1, 3, 2);
    }
    // сверху-сзади подсказки — у героя, а не в середине экрана
    const ax = v.third && v.head ? v.head[0] : cx, ay = v.third && v.head ? v.head[1] - fpx * 1.2 : cy;
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
      let tx = cx, ty = cy;
      // в ASCII — над головой того, по кому ударишь
      if (v.third && UI.V3 && UI.V3.proj) {
        const m = G.map, ox = m.kind === 'over' ? m.region.x * MW : 0, oz = m.kind === 'over' ? m.region.y * MH : 0;
        const gy = UI.Hgt && UI.Hgt.groundAt ? UI.Hgt.groundAt(ox + a.x + 0.5, oz + a.y + 0.5) : 0;
        const q = UI.V3.proj(ox + a.x + 0.5, gy + 1.7, oz + a.y + 0.5);
        if (q) { tx = q[0]; ty = q[1] + fpx * 1.6; } else { tx = ax; ty = ay; }
      }
      pill(fmt(name), tx, ty - fpx * 3.2, hostile ? '#ff9a80' : '#e8e0c8');
      if (a.mhp) {
        const bw = Math.min(160, v.vw * (v.third ? 0.1 : 0.2)), k = U.clamp(a.hp / a.mhp, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(Math.round(tx - bw / 2) - 1, Math.round(ty - fpx * 2.1) - 1, Math.round(bw) + 2, 6);
        ctx.fillStyle = hostile ? '#c84a3a' : '#7aa860'; ctx.fillRect(Math.round(tx - bw / 2), Math.round(ty - fpx * 2.1), Math.round(bw * k), 4);
      }
      // что на нём: горит, мокрый, заморожен… — значки под полоской
      const afx = (a.fx || []).filter((f) => f.t > 0);
      if (afx.length && UI.drawFxIcon) { const sz = Math.round(fpx * 1.2), n = Math.min(6, afx.length); afx.slice(0, n).forEach((f, i) => UI.drawFxIcon(ctx, f.id, tx - n * (sz + 2) / 2 + i * (sz + 2), ty - fpx * 1.75, sz, true)); }
    }
    // что перед тобой
    const lab = UI.focusLabel();
    if (lab) pill('[E] ' + fmt(lab), v.third && v.feet ? v.feet[0] : cx, v.third && v.feet ? v.feet[1] + fpx * 1.6 : cy + fpx * 2.6, '#ffe6a0');
    // памятка в начале и когда мышь не «взята»
    const now = v.now;
    if (!started) started = now;
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const lines = [];
    if (now - started < 25000) {
      if (touch) lines.push('Кнопки — идти и поворачиваться', 'Потяни по картинке — оглядеться', 'Коснись земли — идти, человека или вещи — действие');
      else lines.push('WASD — идти, Shift — бегом, Пробел — прыжок', v.third ? 'Мышь — вращать камеру, +/− — ближе/дальше' : 'Мышь — смотреть, ЛКМ или F — удар', v.third ? 'ЛКМ или F — удар, E — действие, V — ASCII/3D' : 'ПКМ — удар второй рукой, E — действие');
    }
    if (!touch && !UI.locked) lines.push('Щёлкни по картинке, чтобы смотреть мышью');
    // обойма: посох — заклинания, лук — стрелы; цифры выбирают, удар этой рукой выпускает
    const LO = E.Loadout, lh0 = LO && LO.hand();
    if (lh0) {
      const w = P.eq[lh0], list = LO.list(w), cur = LO.cur(w), staff = LO.kind(w) === 'staff';
      ctx.font = fpx * 0.85 + 'px ' + t.family; ctx.textAlign = 'left';
      const lh = fpx * 1.2, x0 = v.vx0 + 8, y0 = v.vy0 + fpx * 2.4;
      const rows = list.map((x, i) => {
        const a = x.a, cd = staff && P.cd[x.id] > 0, poor = staff && P.mp < a.cost;
        const tier = a && a.k === 'school' && E.Schools ? E.Schools.TIERS[a.tier] + ' ' : '';
        const ic = staff && UI.spellIconId ? UI.spellIconId(a) : null;
        return { t: (i + 1) + (ic ? '    ' : ' ') + tier + x.n + (x.lock ? '  ✕' : staff ? '  ' + a.cost : x.cnt ? ' ×' + x.cnt : x.inf ? '  ∞' : ''), ic, on: cur && x.id === cur.id, dim: cd || poor || !!x.lock, col: a && a.k === 'school' && E.Schools ? E.Schools.list[a.school].c : null };
      });
      const w2 = Math.max(...rows.map((r) => ctx.measureText(r.t).width)) + fpx;
      ctx.fillStyle = 'rgba(10,8,6,0.55)'; ctx.fillRect(x0 - 4, y0 - 2, w2, rows.length * lh + fpx * 1.3);
      ctx.fillStyle = '#a89878'; ctx.fillText(staff ? 'Посох' + (lh0 === 'off' ? ' (ПКМ)' : '') : ({ bow: 'Колчан', crossbow: 'Болты', sling: 'Сумка с камнями' })[LO.kind(w)] + (lh0 === 'off' ? ' (ПКМ)' : ''), x0 + 2, y0 + fpx * 0.55);
      rows.forEach((r, i) => {
        const y = y0 + fpx * 1.2 + lh * (i + 0.5);
        if (r.on) { ctx.fillStyle = 'rgba(200,170,90,0.35)'; ctx.fillRect(x0 - 2, y - lh / 2, w2 - 4, lh); }
        ctx.fillStyle = r.on ? '#ffe6a0' : r.dim ? '#7a7068' : '#d8cca8';
        ctx.fillText(r.t, x0 + 2, y);
        if (r.col && !r.dim) { ctx.fillStyle = r.col; ctx.fillRect(x0 - 3, y - lh * 0.32, 2, lh * 0.64); }
        if (r.ic && UI.drawFxIcon) { const isz = Math.round(lh * 0.92); ctx.save(); if (r.dim) ctx.globalAlpha = 0.45; UI.drawFxIcon(ctx, r.ic, x0 + 2 + ctx.measureText(r.t.split(' ')[0] + ' ').width, y - isz / 2, isz, true); ctx.restore(); }
      });
    }
    if (lines.length) {
      ctx.font = fpx * 0.9 + 'px ' + t.family; ctx.textAlign = 'left';
      const lh = fpx * 1.25, w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + fpx;
      const x0 = v.vx0 + 10, y0 = v.vy0 + v.vh - 12 - lines.length * lh - (v.third ? fpx * 3.4 : 0);
      ctx.fillStyle = 'rgba(10,8,6,0.55)'; ctx.fillRect(x0 - 4, y0 - 4, w, lines.length * lh + 6);
      ctx.fillStyle = '#d8cca8';
      lines.forEach((l, i) => ctx.fillText(l, x0 + fpx * 0.3, y0 + lh * (i + 0.5)));
    }
    ctx.restore();
    seeAround();
  };

  // ---------- вид сверху-сзади: подписи, панель 1–0, название земли, курсор ----------
  const stroked = (ctx, s, x, y, fg, lw) => { ctx.lineWidth = lw || 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); ctx.fillStyle = fg; ctx.fillText(s, x, y); };
  // имена жителей над головой и чем они заняты — мелко, как подпись
  function drawLabels(ctx, t, v, fpx) {
    const m = G.map, P = G.P, V3 = UI.V3;
    if (!V3 || !V3.proj) return;
    const ox = m.kind === 'over' ? m.region.x * MW : 0, oz = m.kind === 'over' ? m.region.y * MH : 0;
    const gAt = (x, z) => (UI.Hgt && UI.Hgt.groundAt ? UI.Hgt.groundAt(x, z) : 0);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const f1 = Math.max(10, Math.round(fpx * 0.82)), f2 = Math.max(9, Math.round(fpx * 0.7));
    let n = 0;
    const used = [];
    // имя героя — первым, его не заслоняют
    if (v.head && P.name) { ctx.font = '600 ' + f1 + 'px ' + t.family; const w0 = ctx.measureText(P.name).width; used.push([v.head[0] - w0 / 2, v.head[1] - fpx * 0.6 - f1 * 0.6, w0, f1 * 1.2]); }
    const near = m.ents.filter((e) => !e.dead && (e.kind === 'npc' || e.kind === 'boss')).sort((a, b) => (Math.abs(a.x - P.x) + Math.abs(a.y - P.y)) - (Math.abs(b.x - P.x) + Math.abs(b.y - P.y)));
    for (const e of near) {
      if (e.dead || n > 14 || (e.kind !== 'npc' && e.kind !== 'boss')) continue;
      if (Math.abs(e.x - P.x) > 14 || Math.abs(e.y - P.y) > 14 || !G.vis[e.y * m.w + e.x]) continue;
      if (G.aim === e) continue;
      const s = UI.mvTiles && UI.mvTiles.track ? UI.mvTiles.track(e.id, e.x, e.y, v.now) : null;
      const cp = s ? UI.mvTiles.curPos(s, v.now) : [e.x, e.y];
      const wx = ox + cp[0] + 0.5, wz = oz + cp[1] + 0.5;
      const q = V3.proj(wx, gAt(wx, wz) + 1.9, wz);
      if (!q || q[0] < v.vx0 || q[0] > v.vx0 + v.vw || q[1] < v.vy0 || q[1] > v.vy0 + v.vh) continue;
      // незнакомца зовут по первой примете: «Женщина в годах», а не всё описание
      let name = fmt(e.kind === 'npc' ? (E.Dlg.label ? E.Dlg.label(e) : e.n) : e.n);
      if (e.kind === 'npc' && !(e.npc != null && E.Gm.knows && E.Gm.knows(e.npc))) name = name.split(',')[0];
      const hostile = e.hostile || e.hostileToP;
      ctx.font = '600 ' + f1 + 'px ' + t.family;
      const lw = ctx.measureText(name).width;
      const r = [q[0] - lw / 2 - 2, q[1] - f1 * 0.6, lw + 4, f1 * 2.2];
      if (r[0] < v.vx0 || r[0] + r[2] > v.vx0 + v.vw) continue;
      if (used.some((u) => r[0] < u[0] + u[2] && u[0] < r[0] + r[2] && r[1] < u[1] + u[3] && u[1] < r[1] + r[3])) continue;
      used.push(r);
      n++;
      stroked(ctx, name, Math.round(q[0]), Math.round(q[1]), hostile ? '#ff9a80' : e.kind === 'boss' ? '#ffcf70' : '#ece6d8');
      let sub = null;
      if (e.kind === 'npc' && e.npc != null && E.Gm.knows && E.Gm.knows(e.npc)) {
        const nn = E.Gm.npc(e.npc), j = D.jobs && D.jobs[e.job];
        if (j && nn) sub = j[nn.sex] || null;
      }
      if (sub) { ctx.font = f2 + 'px ' + t.family; stroked(ctx, U.cap(sub), Math.round(q[0]), Math.round(q[1] + f1 * 1.05), '#8f8a80', 2.5); }
      // ◆ — тот, кто сам хочет с тобой поговорить
      if (e.appr || (e.offer && e.offer.until > G.S.time)) { ctx.font = '700 ' + f1 + 'px ' + t.family; stroked(ctx, '◆', Math.round(q[0]), Math.round(q[1] - f1 * 1.2), '#ffd860'); }
    }
    // имя героя над головой
    if (v.head && P.name) { ctx.font = '600 ' + f1 + 'px ' + t.family; stroked(ctx, P.name, Math.round(v.head[0]), Math.round(v.head[1] - fpx * 0.6), '#f4f0e6'); }
    void n;
    ctx.restore();
  }
  // твои эффекты — значки под компасом; полоска под значком — сколько осталось
  function drawFxRow(ctx, t, v, fpx) {
    const P = G.P;
    if (!UI.drawFxIcon || !P || !P.fx || UI.stack.length > 1) return;
    const fx = P.fx.filter((f) => D.effects[f.id]);
    if (!fx.length) return;
    const sz = Math.round(fpx * 1.45), gap = 3, n = Math.min(14, fx.length), w = n * (sz + gap) - gap;
    const x0 = v.vx0 + (v.vw - w) / 2, y0 = v.vy0 + 6 + fpx * 1.5 + 6;
    const now = G.S.time;
    fx.slice(0, n).forEach((f, i) => {
      const x = x0 + i * (sz + gap);
      UI.drawFxIcon(ctx, f.id, x, y0, sz);
      if (f.until && f.until < 1e14) {
        const tot = Math.max(1, f.until - (f.t0 != null ? f.t0 : now)), k = U.clamp((f.until - now) / tot, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(Math.round(x), Math.round(y0 + sz + 1), sz, 3);
        ctx.fillStyle = k < 0.25 ? '#e07050' : '#e8d8a8'; ctx.fillRect(Math.round(x), Math.round(y0 + sz + 1), Math.round(sz * k), 3);
      }
    });
  }
  // состояния существ рядом — значки над головой (кроме того, на кого смотришь: у него — под полоской)
  function drawEntFx(ctx, t, v, fpx) {
    const m = G.map, P = G.P, V3 = UI.V3;
    if (!UI.drawFxIcon || !V3 || !V3.proj || !m || !P) return;
    const ox = m.kind === 'over' ? m.region.x * MW : 0, oz = m.kind === 'over' ? m.region.y * MH : 0;
    const gAt = (x, z) => (UI.Hgt && UI.Hgt.groundAt ? UI.Hgt.groundAt(x, z) : 0);
    const sz = Math.round(fpx * 1.05);
    for (const e of m.ents) {
      if (e.dead || e === G.aim || !e.fx || !e.fx.length || Math.abs(e.x - P.x) > 12 || Math.abs(e.y - P.y) > 12 || !G.vis[e.y * m.w + e.x]) continue;
      const list = e.fx.filter((f) => f.t > 0);
      if (!list.length) continue;
      const s = UI.mvTiles && UI.mvTiles.track ? UI.mvTiles.track(e.id, e.x, e.y, v.now) : null;
      const cp = s ? UI.mvTiles.curPos(s, v.now) : [e.x, e.y];
      const wx = ox + cp[0] + 0.5, wz = oz + cp[1] + 0.5;
      const q = V3.proj(wx, gAt(wx, wz) + (e.boss ? 2.0 : 1.35), wz);
      if (!q || q[0] < v.vx0 || q[0] > v.vx0 + v.vw || q[1] < v.vy0 || q[1] > v.vy0 + v.vh) continue;
      const n = Math.min(4, list.length);
      list.slice(0, n).forEach((f, i) => UI.drawFxIcon(ctx, f.id, q[0] - n * (sz + 1) / 2 + i * (sz + 1), q[1] - sz, sz, true));
    }
  }
  // всплывающие слова над местом: урон, комбо, находки, «Обвал!» — поднимаются и тают
  const POPS = UI.pops = [];
  UI.pop3d = function (x, y, s, col, big) {
    const m = G.map; if (!m) return;
    const t0 = performance.now();
    const stack = POPS.filter((p) => p.tx === x && p.ty === y && t0 - p.t0 < 600).length;
    if (POPS.length > 40) POPS.shift();
    POPS.push({ tx: x, ty: y, x: x + 0.5 + (Math.random() - 0.5) * 0.35, y: y + 0.5 + (Math.random() - 0.5) * 0.35, s: String(s), col: col || '#f4ece0', t0, big: !!big, key: m.key, up: stack * 0.24 });
  };
  function drawPops(ctx, t, v, fpx) {
    const m = G.map, V3 = UI.V3;
    if (!POPS.length || !V3 || !V3.proj || !m) return;
    const ox = m.kind === 'over' ? m.region.x * MW : 0, oz = m.kind === 'over' ? m.region.y * MH : 0;
    const gAt = (x, z) => (UI.Hgt && UI.Hgt.groundAt ? UI.Hgt.groundAt(x, z) : 0);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = POPS.length - 1; i >= 0; i--) {
      const p = POPS[i], age = (v.now - p.t0) / 1000;
      if (age > 1.4 || p.key !== m.key) { POPS.splice(i, 1); continue; }
      if (age < 0) continue;
      const wx = ox + p.x, wz = oz + p.y;
      const q = V3.proj(wx, gAt(wx, wz) + (m.outdoor ? 1.3 : 0.95) + p.up + age * 0.4, wz);
      if (!q || q[0] < v.vx0 || q[0] > v.vx0 + v.vw || q[1] < v.vy0 || q[1] > v.vy0 + v.vh) continue;
      ctx.globalAlpha = age < 0.95 ? 1 : Math.max(0, 1 - (age - 0.95) / 0.45);
      const sz = p.big ? fpx * (1.05 + Math.max(0, 0.25 - age) * 1.2) : fpx * 0.82;
      ctx.font = (p.big ? '700 ' : '600 ') + Math.round(sz) + 'px ' + t.family;
      stroked(ctx, p.s, Math.round(q[0]), Math.round(q[1]), p.col, p.big ? 4 : 3);
    }
    ctx.restore();
  }
  // подписи у того, что можно взять или сломать: жилы, кристаллы, тлеющие стены чар — с подсказкой, чем
  function drawTips(ctx, t, v, fpx) {
    const m = G.map, P = G.P, V3 = UI.V3;
    if (!V3 || !V3.proj || !m || !P || UI.stack.length > 1) return;
    const ox = m.kind === 'over' ? m.region.x * MW : 0, oz = m.kind === 'over' ? m.region.y * MH : 0;
    const gAt = (x, z) => (UI.Hgt && UI.Hgt.groundAt ? UI.Hgt.groundAt(x, z) : 0);
    const R = v.third ? 9 : 7, pick = E.Gm.toolEq('pick'), SC = E.Schools;
    const blast = SC && G.P.abil.some((id) => { const a = E.D.ab[id]; return a && a.k === 'school' && (a.el === 'earth' || a.el === 'storm' || a.el === 'arcane' || (a.el === 'fire' && a.tier >= 1)) && !SC.why(a); });
    const found = [];
    for (let y = Math.max(0, P.y - R); y <= Math.min(m.h - 1, P.y + R); y++) for (let x = Math.max(0, P.x - R); x <= Math.min(m.w - 1, P.x + R); x++) {
      const i = y * m.w + x, tl = TL[m.tiles[i]];
      if (!(tl.ore || tl.crystal) || !G.vis[i]) continue;
      found.push({ x, y, tl, d: Math.hypot(x - P.x, y - P.y) });
    }
    if (!found.length) return;
    found.sort((a, b) => a.d - b.d);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const f1 = Math.max(10, Math.round(fpx * 0.78)), f2 = Math.max(9, Math.round(fpx * 0.64));
    const used = [];
    let n = 0;
    for (const o of found) {
      if (n >= 4) break;
      const wx = ox + o.x + 0.5, wz = oz + o.y + 0.5;
      const q = V3.proj(wx, gAt(wx, wz) + 1.05, wz);
      if (!q || q[0] < v.vx0 + 20 || q[0] > v.vx0 + v.vw - 20 || q[1] < v.vy0 + 20 || q[1] > v.vy0 + v.vh - 40) continue;
      const nm = o.tl.ore ? 'Рудная жила' : 'Кристалл';
      const how = pick ? 'E — добыть киркой' : o.tl.ore ? (blast ? 'кирка — или разбей чарами' : 'нужна кирка (или чары земли, бури)') : 'нужна кирка';
      ctx.font = '600 ' + f1 + 'px ' + t.family;
      const lw = Math.max(ctx.measureText(nm).width, ctx.measureText(how).width * f2 / f1);
      const r = [q[0] - lw / 2, q[1] - f1, lw, f1 * 2.4];
      if (used.some((u) => r[0] < u[0] + u[2] && u[0] < r[0] + r[2] && r[1] < u[1] + u[3] && u[1] < r[1] + r[3])) continue;
      used.push(r); n++;
      ctx.globalAlpha = Math.max(0.35, 1 - o.d / (R + 1));
      stroked(ctx, nm, Math.round(q[0]), Math.round(q[1]), o.tl.ore ? '#f0b080' : '#c8b0ff');
      ctx.font = f2 + 'px ' + t.family;
      stroked(ctx, how, Math.round(q[0]), Math.round(q[1] + f1 * 1.1), pick ? '#e8dcc0' : '#b0a898', 2.5);
    }
    ctx.restore();
  }
  // внизу: уровень и опыт, под ними — десять ячеек (1–9, 0): заклинания посоха, стрелы или умения
  function drawHotbar(ctx, t, v, fpx) {
    const P = G.P, LO = E.Loadout;
    const W = Math.min(v.vw - 20, fpx * 34), x0 = Math.round(v.vx0 + (v.vw - W) / 2), cw = W / 10;
    const ch = Math.round(fpx * 1.9), y1 = Math.round(v.vy0 + v.vh - ch - 4), y0 = y1 - Math.round(fpx * 1.1);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // полоса опыта
    const need = E.Gm.need ? E.Gm.need(P.level) : 100, k = P.level >= 999 ? 1 : U.clamp((P.xp || 0) / Math.max(1, need), 0, 1);
    ctx.fillStyle = 'rgba(4,6,10,0.82)'; ctx.fillRect(x0, y0, W, y1 - y0);
    ctx.fillStyle = 'rgba(150,160,190,0.35)'; ctx.fillRect(x0 + 1, y0 + 1, Math.round((W - 2) * k), y1 - y0 - 2);
    ctx.strokeStyle = 'rgba(210,214,224,0.75)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, W - 1, y1 - y0 - 1);
    ctx.font = Math.max(9, Math.round(fpx * 0.66)) + 'px ' + t.family; ctx.fillStyle = '#d8dce6';
    ctx.fillText('УР ' + (P.level >= 999 ? '—' : P.level) + ' · ' + Math.floor(P.xp || 0) + ' / ' + need + ' ОП', x0 + W / 2, (y0 + y1) / 2 + 1);
    // ячейки
    const lh = LO && LO.hand && LO.hand(), w = lh ? P.eq[lh] : null;
    let cells = [];
    if (lh && w) cells = LO.list(w).map((x) => ({ n: x.n, ic: UI.spellIconId && LO.kind(w) === 'staff' ? UI.spellIconId(x.a) : null, cd: x.a && P.cd[x.id] > 0, poor: (x.a && LO.kind(w) === 'staff' && P.mp < x.a.cost) || !!x.lock, on: LO.cur(w) && LO.cur(w).id === x.id, cnt: x.cnt }));
    else cells = (P.abil || []).slice(0, 10).map((id) => { const a = E.D.ab[id]; return a ? { n: a.n, ic: UI.spellIconId ? UI.spellIconId(a) : null, cd: P.cd[id] > 0, poor: a.cost && P.mp < a.cost } : null; });
    ctx.fillStyle = 'rgba(4,6,10,0.82)'; ctx.fillRect(x0, y1, W, ch);
    for (let i = 0; i < 10; i++) {
      const cx = x0 + i * cw, c = cells[i];
      if (c && c.on) { ctx.fillStyle = 'rgba(200,170,90,0.3)'; ctx.fillRect(Math.round(cx) + 1, y1 + 1, Math.round(cw) - 2, ch - 2); }
      ctx.strokeStyle = 'rgba(210,214,224,0.75)'; ctx.strokeRect(Math.round(cx) + 0.5, y1 + 0.5, Math.round(cw), ch - 1);
      ctx.font = Math.max(9, Math.round(fpx * 0.66)) + 'px ' + t.family; ctx.fillStyle = '#e8eaf0';
      ctx.fillText(String((i + 1) % 10), cx + cw / 2, y1 + ch * 0.27);
      if (c) {
        ctx.font = Math.max(8, Math.round(fpx * 0.6)) + 'px ' + t.family;
        ctx.fillStyle = c.cd || c.poor ? '#6a6a74' : c.on ? '#ffe6a0' : '#b8bcc8';
        if (c.ic && UI.drawFxIcon) { const isz = Math.round(Math.min(ch * 0.42, cw * 0.3)); UI.drawFxIcon(ctx, c.ic, cx + cw - isz - 2, y1 + 2, isz, true); }
        let s2 = c.n; while (s2.length > 2 && ctx.measureText(s2).width > cw - 4) s2 = s2.slice(0, -1);
        ctx.fillText(s2 + (s2.length < c.n.length ? '.' : ''), cx + cw / 2, y1 + ch * 0.7);
      }
    }
    ctx.restore();
  }
  // название земли, когда входишь в неё: разреженные золотые буквы и строка под ними
  let lastPlace = null, placeT = 0, placeA = '', placeB = '';
  function drawTitle(ctx, t, v, fpx) {
    const nm = UI.placeName ? UI.placeName() : '';
    if (nm !== lastPlace) {
      const first = lastPlace === null;
      lastPlace = nm; const parts = nm.split(' · ');
      placeA = parts[0]; placeB = parts.slice(1).join(' · ');
      placeT = first ? v.now - 1500 : v.now;
    }
    const age = v.now - placeT;
    if (age > 5200) return;
    const a = age < 600 ? age / 600 : age > 4200 ? 1 - (age - 4200) / 1000 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const y = v.vy0 + v.vh * 0.2;
    ctx.font = '600 ' + Math.round(fpx * 1.5) + 'px ' + t.family;
    stroked(ctx, placeA.split('').join(' '), v.vx0 + v.vw / 2, y, '#e8c878', 4);
    if (placeB) { ctx.font = Math.round(fpx * 0.8) + 'px ' + t.family; stroked(ctx, placeB, v.vx0 + v.vw / 2, y + fpx * 1.7, '#a89c80', 3); }
    ctx.restore();
  }
  // «+» — куда направлен удар: на земле перед героем
  function drawCursor(ctx, v) {
    const P = G.P, m = G.map, V3 = UI.V3;
    if (!V3 || !V3.proj || P.posX == null && !v.feet) return;
    const ox = m.kind === 'over' ? m.region.x * MW : 0, oz = m.kind === 'over' ? m.region.y * MH : 0;
    const px = P.posX != null ? P.posX : P.x + 0.5, pz = P.posY != null ? P.posY : P.y + 0.5;
    const d = 2.6, wx = ox + px + Math.sin(V3.yaw) * d, wz = oz + pz - Math.cos(V3.yaw) * d;
    const q = V3.proj(wx, (UI.Hgt && UI.Hgt.groundAt ? UI.Hgt.groundAt(wx, wz) : 0) + 0.5, wz);
    if (!q) return;
    const x = Math.round(q[0]) + 0.5, y = Math.round(q[1]) + 0.5, r = 7;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,242,248,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
    ctx.restore();
  }

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
