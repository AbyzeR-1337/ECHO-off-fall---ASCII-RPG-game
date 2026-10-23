'use strict';
// Терминал на canvas: сетка символов с фиксированной шириной ячейки.
// Рамки и блоки рисуются примитивами — без зазоров при любом шрифте.
(function (E) {
  const U = E.U;
  // [вверх, вправо, вниз, влево]: 0 — нет, 1 — одинарная, 2 — двойная
  const BOX = {
    '─': [0, 1, 0, 1], '│': [1, 0, 1, 0], '┌': [0, 1, 1, 0], '┐': [0, 0, 1, 1], '└': [1, 1, 0, 0], '┘': [1, 0, 0, 1],
    '├': [1, 1, 1, 0], '┤': [1, 0, 1, 1], '┬': [0, 1, 1, 1], '┴': [1, 1, 0, 1], '┼': [1, 1, 1, 1],
    '═': [0, 2, 0, 2], '║': [2, 0, 2, 0], '╔': [0, 2, 2, 0], '╗': [0, 0, 2, 2], '╚': [2, 2, 0, 0], '╝': [2, 0, 0, 2],
    '╠': [2, 2, 2, 0], '╣': [2, 0, 2, 2], '╦': [0, 2, 2, 2], '╩': [2, 2, 0, 2], '╬': [2, 2, 2, 2],
    '╞': [1, 2, 1, 0], '╡': [1, 0, 1, 2], '╤': [0, 2, 1, 2], '╧': [1, 2, 0, 2], '╪': [1, 2, 1, 2],
  };
  const BLOCK = { '█': [0, 0, 1, 1], '▀': [0, 0, 1, 0.5], '▄': [0, 0.5, 1, 0.5], '▌': [0, 0, 0.5, 1], '▐': [0.5, 0, 0.5, 1] };

  class Term {
    constructor(cv) {
      this.cv = cv;
      this.ctx = cv.getContext('2d');
      this.cols = 80; this.rows = 30; this.cw = 10; this.ch = 18;
      this.hots = [];
      this.baseBg = '#0b0a0f';
      this.alloc();
    }
    alloc() {
      const n = this.cols * this.rows;
      this.c = new Array(n).fill(' ');
      this.f = new Array(n).fill('#cccccc');
      this.b = new Array(n).fill(null);
    }
    resize(W, H, fontPx, family) {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      this.dpr = dpr;
      this.font = fontPx + 'px ' + family;
      this.ctx.font = this.font;
      const m = this.ctx.measureText('M').width;
      this.cw = Math.max(5, Math.round(m * 100) / 100);
      this.ch = Math.ceil(fontPx * 1.24);
      this.cols = Math.max(30, Math.floor(W / this.cw));
      this.rows = Math.max(16, Math.floor(H / this.ch));
      this.cv.width = Math.floor(this.cols * this.cw * dpr);
      this.cv.height = Math.floor(this.rows * this.ch * dpr);
      this.cv.style.width = (this.cols * this.cw) + 'px';
      this.cv.style.height = (this.rows * this.ch) + 'px';
      this.alloc();
    }
    clear(bg) {
      this.c.fill(' '); this.f.fill('#cccccc'); this.b.fill(bg || null);
      this.hots.length = 0;
    }
    put(x, y, ch, fg, bg) {
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
      const i = y * this.cols + x;
      this.c[i] = ch;
      if (fg) this.f[i] = fg;
      if (bg !== undefined) this.b[i] = bg;
    }
    bg(x, y, bg) {
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
      this.b[y * this.cols + x] = bg;
    }
    text(x, y, s, fg, bg, maxw) {
      s = String(s);
      const n = maxw != null ? Math.min(s.length, maxw) : s.length;
      for (let i = 0; i < n; i++) this.put(x + i, y, s[i], fg, bg);
      return n;
    }
    // Текст с цветовой разметкой: {#rrggbb|текст}
    rich(x, y, s, fg, maxw) {
      let cx = x, col = fg, i = 0, lim = maxw != null ? x + maxw : this.cols;
      while (i < s.length && cx < lim) {
        if (s[i] === '{' && s[i + 1] === '#') {
          const bar = s.indexOf('|', i);
          col = s.slice(i + 1, bar); i = bar + 1; continue;
        }
        if (s[i] === '}') { col = fg; i++; continue; }
        this.put(cx++, y, s[i], col); i++;
      }
      return cx - x;
    }
    center(y, s, fg, bg, x0, w) {
      x0 = x0 || 0; w = w || this.cols;
      this.text(x0 + Math.floor((w - s.length) / 2), y, s, fg, bg);
    }
    fill(x, y, w, h, ch, fg, bg) {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.put(i, j, ch, fg, bg);
    }
    box(x, y, w, h, fg, bg, title, dbl) {
      const [tl, tr, bl, br, hz, vt] = dbl === false ? ['┌', '┐', '└', '┘', '─', '│'] : ['╔', '╗', '╚', '╝', '═', '║'];
      if (bg !== undefined) this.fill(x, y, w, h, ' ', fg, bg);
      for (let i = x + 1; i < x + w - 1; i++) { this.put(i, y, hz, fg); this.put(i, y + h - 1, hz, fg); }
      for (let j = y + 1; j < y + h - 1; j++) { this.put(x, j, vt, fg); this.put(x + w - 1, j, vt, fg); }
      this.put(x, y, tl, fg); this.put(x + w - 1, y, tr, fg); this.put(x, y + h - 1, bl, fg); this.put(x + w - 1, y + h - 1, br, fg);
      if (title) {
        const t = ' ' + title + ' ';
        this.text(x + Math.max(1, Math.floor((w - t.length) / 2)), y, t, fg);
      }
    }
    hline(x, y, w, fg, ch) { for (let i = 0; i < w; i++) this.put(x + i, y, ch || '─', fg); }
    hot(x, y, w, h, fn, data) { this.hots.push({ x, y, w, h, fn, data }); }
    hit(cx, cy) {
      for (let i = this.hots.length - 1; i >= 0; i--) {
        const h = this.hots[i];
        if (cx >= h.x && cx < h.x + h.w && cy >= h.y && cy < h.y + h.h) return h;
      }
      return null;
    }
    cellAt(px, py) { return [Math.floor(px / this.cw), Math.floor(py / this.ch)]; }

    render() {
      const { ctx, cols, rows, cw, ch } = this;
      const dpr = this.dpr || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = this.baseBg;
      ctx.fillRect(0, 0, cols * cw, rows * ch);
      // фоны
      for (let y = 0; y < rows; y++) {
        let x = 0;
        const row = y * cols;
        while (x < cols) {
          const b = this.b[row + x];
          if (!b) { x++; continue; }
          let x2 = x + 1;
          while (x2 < cols && this.b[row + x2] === b) x2++;
          ctx.fillStyle = b;
          ctx.fillRect(Math.floor(x * cw), y * ch, Math.ceil((x2 - x) * cw), ch);
          x = x2;
        }
      }
      // символы
      ctx.font = this.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lw = Math.max(1, Math.round(cw / 8));
      const gap = Math.max(2, Math.round(cw / 4.5));
      let last = null;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const c = this.c[i];
          if (c === ' ') continue;
          const fg = this.f[i];
          if (fg !== last) { ctx.fillStyle = fg; last = fg; }
          const px = x * cw, py = y * ch;
          const bx = BOX[c];
          if (bx) { this.drawBox(bx, px, py, cw, ch, lw, gap); continue; }
          const bl = BLOCK[c];
          if (bl) { ctx.fillRect(Math.floor(px + bl[0] * cw), Math.floor(py + bl[1] * ch), Math.ceil(bl[2] * cw), Math.ceil(bl[3] * ch)); continue; }
          ctx.fillText(c, px + cw / 2, py + ch / 2 + 1);
        }
      }
    }
    drawBox(bx, px, py, cw, ch, lw, gap) {
      const ctx = this.ctx;
      const cx = Math.floor(px + cw / 2 - lw / 2), cy = Math.floor(py + ch / 2 - lw / 2);
      const L = Math.floor(px), R = Math.ceil(px + cw), T = Math.floor(py), B = Math.ceil(py + ch);
      const [u, r, d, l] = bx;
      const dbl = u === 2 || r === 2 || d === 2 || l === 2;
      if (!dbl) {
        if (u) ctx.fillRect(cx, T, lw, cy - T + lw);
        if (d) ctx.fillRect(cx, cy, lw, B - cy);
        if (l) ctx.fillRect(L, cy, cx - L + lw, lw);
        if (r) ctx.fillRect(cx, cy, R - cx, lw);
        return;
      }
      const g = gap / 2;
      const hasH = l || r, hasV = u || d;
      // Прямые двойные линии
      if (hasH && !hasV) {
        ctx.fillRect(L, Math.floor(cy - g), R - L, lw);
        ctx.fillRect(L, Math.floor(cy + g), R - L, lw);
        return;
      }
      if (hasV && !hasH) {
        ctx.fillRect(Math.floor(cx - g), T, lw, B - T);
        ctx.fillRect(Math.floor(cx + g), T, lw, B - T);
        return;
      }
      // Углы
      const cnt = (u ? 1 : 0) + (r ? 1 : 0) + (d ? 1 : 0) + (l ? 1 : 0);
      if (cnt === 2) {
        const sx = r ? 1 : -1, sy = d ? 1 : -1;
        const ox = Math.floor(cx - sx * g), oy = Math.floor(cy - sy * g);
        const ix = Math.floor(cx + sx * g), iy = Math.floor(cy + sy * g);
        // внешний
        if (sx > 0) ctx.fillRect(ox, oy, R - ox, lw); else ctx.fillRect(L, oy, ox - L + lw, lw);
        if (sy > 0) ctx.fillRect(ox, oy, lw, B - oy); else ctx.fillRect(ox, T, lw, oy - T + lw);
        // внутренний
        if (sx > 0) ctx.fillRect(ix, iy, R - ix, lw); else ctx.fillRect(L, iy, ix - L + lw, lw);
        if (sy > 0) ctx.fillRect(ix, iy, lw, B - iy); else ctx.fillRect(ix, T, lw, iy - T + lw);
        return;
      }
      // Т-образные и крест — упрощённо
      const y1 = Math.floor(cy - g), y2 = Math.floor(cy + g), x1 = Math.floor(cx - g), x2 = Math.floor(cx + g);
      if (u) { ctx.fillRect(x1, T, lw, y1 - T + lw); ctx.fillRect(x2, T, lw, y1 - T + lw); }
      if (d) { ctx.fillRect(x1, y2, lw, B - y2); ctx.fillRect(x2, y2, lw, B - y2); }
      if (l) { ctx.fillRect(L, y1, x1 - L + lw, lw); ctx.fillRect(L, y2, x1 - L + lw, lw); }
      if (r) { ctx.fillRect(x2, y1, R - x2, lw); ctx.fillRect(x2, y2, R - x2, lw); }
      if (!u) ctx.fillRect(x1, y1, x2 - x1 + lw, lw);
      if (!d) ctx.fillRect(x1, y2, x2 - x1 + lw, lw);
      if (!l) ctx.fillRect(x1, y1, lw, y2 - y1 + lw);
      if (!r) ctx.fillRect(x2, y1, lw, y2 - y1 + lw);
    }
  }
  E.Term = Term;
})(window.EOF);
