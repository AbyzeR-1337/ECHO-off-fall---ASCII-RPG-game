'use strict';
// Поле зрения: рекурсивное затенение (shadowcasting) по восьми октантам.
(function (E) {
  const TL = E.TL;
  const FOV = E.FOV = {};
  const MULT = [
    [1, 0, 0, -1, -1, 0, 0, 1], [0, 1, -1, 0, 0, -1, 1, 0],
    [0, 1, 1, 0, 0, -1, -1, 0], [1, 0, 0, 1, -1, 0, 0, -1],
  ];
  FOV.compute = function (m, ox, oy, radius, vis, xray) {
    vis.fill(0);
    const w = m.w, h = m.h;
    const blocks = (x, y) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return true;
      if (xray && Math.abs(x - ox) + Math.abs(y - oy) <= xray) return false;
      return !TL[m.tiles[y * w + x]].see;
    };
    const light = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) vis[y * w + x] = 1; };
    light(ox, oy);
    const r2 = radius * radius;
    function cast(row, start, end, xx, xy, yx, yy) {
      if (start < end) return;
      let newStart = 0;
      for (let j = row; j <= radius; j++) {
        let dx = -j - 1, dy = -j, blocked = false;
        while (dx <= 0) {
          dx++;
          const X = ox + dx * xx + dy * xy, Y = oy + dx * yx + dy * yy;
          const lSlope = (dx - 0.5) / (dy + 0.5), rSlope = (dx + 0.5) / (dy - 0.5);
          if (start < rSlope) continue;
          if (end > lSlope) break;
          if (dx * dx + dy * dy < r2) light(X, Y);
          if (blocked) {
            if (blocks(X, Y)) { newStart = rSlope; continue; }
            blocked = false; start = newStart;
          } else if (blocks(X, Y) && j < radius) {
            blocked = true;
            cast(j + 1, start, lSlope, xx, xy, yx, yy);
            newStart = rSlope;
          }
        }
        if (blocked) break;
      }
    }
    for (let o = 0; o < 8; o++) cast(1, 1.0, 0.0, MULT[0][o], MULT[1][o], MULT[2][o], MULT[3][o]);
  };
  // Видна ли клетка (линия)
  FOV.los = function (m, x0, y0, x1, y1) {
    const pts = E.U.line(x0, y0, x1, y1);
    for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i]; if (!TL[m.tiles[y * m.w + x]].see) return false; }
    return true;
  };
})(window.EOF);
