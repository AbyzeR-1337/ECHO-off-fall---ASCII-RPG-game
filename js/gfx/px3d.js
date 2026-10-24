'use strict';
// Пиксельный 3D-мир от первого лица — как в старых RPG: мир рисуется в маленьком разрешении
// и растягивается без сглаживания, текстуры — пиксель-арт 32×32, люди, звери, деревья и вещи —
// спрайты из объёмных моделей (Gfx.PX), снятые под восемью углами. Свет мягкий: небо, солнце
// или луна, огни; туман растворяет даль; дождь и снег — тихие.
// Модуль ничего не знает об игре: на входе — сетка, описание кадра и камера (js/ui/view3d.js).
(function (E) {
  const Gfx = E.Gfx;
  const P3 = Gfx.P3 = {};
  let cv = null, gl = null, ok = false;
  const S = {};

  // ============================================================
  // Шейдеры
  // ============================================================
  const VS_WORLD = `
attribute vec3 aPos; attribute vec2 aLoc; attribute vec2 aTile; attribute vec3 aN; attribute float aSky; attribute float aKind;
uniform mat4 uVP;
varying vec2 vLoc; varying vec2 vTile; varying vec3 vN; varying vec3 vW; varying float vSky; varying float vKind;
void main(){ vLoc=aLoc; vTile=aTile; vN=aN; vW=aPos; vSky=aSky; vKind=aKind; gl_Position=uVP*vec4(aPos,1.0); }`;
  const LIGHT_FN = `
uniform vec3 uSunDir; uniform vec3 uSun; uniform vec3 uAmb; uniform vec3 uFog; uniform vec3 uCam; uniform float uFogD; uniform float uTime; uniform float uNight;
uniform vec4 uLP[8]; uniform vec4 uLC[8]; uniform int uNL;
vec3 lightAt(vec3 w, vec3 n, float sky, float fl){
  float sunL = mix(max(dot(n, uSunDir), 0.0), 0.55 + 0.45*max(uSunDir.y,0.0), fl);
  vec3 L = uAmb*(0.62 + 0.38*mix(n.y,1.0,fl))*sky + uSun*sunL*sky + vec3(0.035,0.03,0.04);
  for (int i=0;i<8;i++){
    if (i>=uNL) break;
    vec3 d = uLP[i].xyz - w; float dist = length(d);
    float att = clamp(1.0 - dist/uLP[i].w, 0.0, 1.0); att *= att;
    float nd = mix(0.35 + 0.65*max(dot(n, d/max(dist,0.001)), 0.0), 1.0, fl);
    L += uLC[i].rgb*uLC[i].a*att*nd;
  }
  return L;
}
vec3 fogIt(vec3 c, vec3 w){ float fd = length(w - uCam); float f = 1.0 - exp(-fd*uFogD); return mix(c, uFog, clamp(f,0.0,1.0)); }
// мягкая «ступенчатость» цвета с порядковым дизерингом — пиксельный вид без грубых полос
float bayer(vec2 p){ vec2 q = mod(floor(p), 4.0); float a = q.x + q.y*4.0;
  return (a==0.0?0.0:a==1.0?8.0:a==2.0?2.0:a==3.0?10.0:a==4.0?12.0:a==5.0?4.0:a==6.0?14.0:a==7.0?6.0:a==8.0?3.0:a==9.0?11.0:a==10.0?1.0:a==11.0?9.0:a==12.0?15.0:a==13.0?7.0:a==14.0?13.0:5.0)/16.0; }
vec3 quant(vec3 c){ float b = bayer(gl_FragCoord.xy) - 0.5; return floor(c*24.0 + 0.5 + b*0.9)/24.0; }`;
  const FS_WORLD = `precision mediump float;
uniform sampler2D uTex; uniform float uTS;
varying vec2 vLoc; varying vec2 vTile; varying vec3 vN; varying vec3 vW; varying float vSky; varying float vKind;
${LIGHT_FN}
void main(){
  vec2 l = vLoc;
  if (vKind > 0.5 && vKind < 1.5) { l += vec2(uTime*0.03 + sin(uTime*0.6 + vW.z*0.9)*0.05, uTime*0.012); }
  if (vKind > 1.5) { // край соседней земли: растворяется точками к середине клетки
    vec2 q = fract(vW.xz); vec2 tp = floor(vW.xz*16.0);
    float d = vKind < 2.5 ? q.y : vKind < 3.5 ? 1.0-q.x : vKind < 4.5 ? 1.0-q.y : vKind < 5.5 ? q.x
      : vKind < 6.5 ? length(vec2(1.0-q.x, q.y)) : vKind < 7.5 ? length(vec2(1.0-q.x, 1.0-q.y)) : vKind < 8.5 ? length(vec2(q.x, 1.0-q.y)) : length(q);
    float nz = fract(sin(dot(floor(vW.xz*8.0), vec2(12.9898,78.233)))*43758.5453);
    float a = 1.0 - d/0.36 + (nz-0.5)*0.55;
    if (a < bayer(tp)) discard;
  }
  vec4 t = texture2D(uTex, vTile + fract(l)*uTS);
  vec3 n = normalize(vN);
  vec3 c = t.rgb*lightAt(vW, n, vSky, 0.0);
  if (vKind > 0.5 && vKind < 1.5) { float g = pow(max(dot(reflect(normalize(vW-uCam), n), uSunDir),0.0), 24.0); c += uSun*g*0.5*vSky; }
  if (t.a < 0.6) { float em = t.a > 0.4 ? 1.0 : uNight; c = mix(c, t.rgb*1.25, em); }
  gl_FragColor = vec4(quant(fogIt(c, vW)), 1.0);
}`;
  const VS_SPR = `
attribute vec3 aPos; attribute vec2 aUV; attribute vec3 aCol;
uniform mat4 uVP;
varying vec2 vUV; varying vec3 vCol; varying vec3 vW;
void main(){ vUV=aUV; vCol=aCol; vW=aPos; gl_Position=uVP*vec4(aPos,1.0); }`;
  const FS_SPR = `precision mediump float;
uniform sampler2D uSpr;
varying vec2 vUV; varying vec3 vCol; varying vec3 vW;
${LIGHT_FN}
void main(){
  vec4 t = texture2D(uSpr, vUV);
  if (t.a < 0.3) discard;
  // полупрозрачное (призраки) — сеткой точек, без сортировки
  if (t.a < 0.9 && bayer(gl_FragCoord.xy) > t.a*1.1) discard;
  vec3 c = t.a > 0.96 && t.a < 0.99 ? t.rgb*1.1 : t.rgb*vCol;
  gl_FragColor = vec4(quant(fogIt(c, vW)), 1.0);
}`;
  const VS_SKY = `attribute vec2 aP; varying vec2 vP; void main(){ vP=aP; gl_Position=vec4(aP,0.999,1.0); }`;
  const FS_SKY = `precision mediump float;
varying vec2 vP;
uniform vec3 uF; uniform vec3 uR; uniform vec3 uU; uniform float uTan; uniform float uAsp;
uniform vec3 uZen; uniform vec3 uHor; uniform vec3 uSunDir; uniform vec3 uSunC; uniform vec3 uMoonDir; uniform float uStars; uniform float uTime; uniform float uCloud; uniform vec3 uCloudC; uniform float uIn;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); }
vec3 quant(vec3 c){ return floor(c*24.0+0.5)/24.0; }
void main(){
  if (uIn > 0.5) { gl_FragColor = vec4(uHor, 1.0); return; }
  vec3 d = normalize(uF + uR*vP.x*uTan*uAsp + uU*vP.y*uTan);
  float y = d.y;
  vec3 c = mix(uHor, uZen, smoothstep(-0.05, 0.55, y));
  // солнце и луна — пиксельные диски с ореолом
  float sd = dot(d, uSunDir);
  c += uSunC*(smoothstep(0.9975, 0.9985, sd)*1.6 + pow(max(sd,0.0), 60.0)*0.35);
  float md = dot(d, uMoonDir);
  c += vec3(0.85,0.88,0.95)*smoothstep(0.9988, 0.9993, md)*uStars;
  // звёзды
  if (y > 0.0) { vec2 sp = floor(d.xz/(y+0.3)*90.0); float s = h2(sp); c += vec3(0.9)*step(0.994, s)*uStars*(0.6+0.4*sin(uTime*2.0+s*50.0))*smoothstep(0.0,0.2,y); }
  // облака на куполе
  if (y > 0.02) { vec2 cp = d.xz/(y+0.08)*1.3 + vec2(uTime*0.02, uTime*0.008); float cl = n2(cp)*0.6 + n2(cp*2.3)*0.3 + n2(cp*5.1)*0.1; float a = smoothstep(0.55 - uCloud*0.3, 0.8, cl)*smoothstep(0.02,0.25,y); c = mix(c, uCloudC, a*0.85); }
  gl_FragColor = vec4(quant(c), 1.0);
}`;
  const FS_WX = `precision mediump float;
varying vec2 vP; uniform float uTime; uniform float uKind; uniform vec2 uRes; uniform vec3 uCol; uniform float uDens;
float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec2 px = (vP*0.5+0.5)*uRes;
  float a = 0.0;
  if (uKind < 1.5) { // дождь: тонкие косые штрихи
    vec2 q = vec2(px.x + px.y*0.25, px.y + uTime*220.0);
    vec2 cell = floor(q/vec2(3.0, 14.0)); float r = h2(cell);
    float yy = fract(q.y/14.0);
    a = step(1.0-uDens, r)*step(yy, 0.45)*0.35;
  } else { // снег и пепел: мягкие хлопья
    vec2 q = vec2(px.x + sin(uTime*0.8 + px.y*0.05)*6.0, px.y + uTime*28.0);
    vec2 cell = floor(q/5.0); float r = h2(cell);
    vec2 f = fract(q/5.0) - 0.5;
    a = step(1.0-uDens, r)*step(length(f), 0.28)*0.75;
  }
  if (a <= 0.0) discard;
  gl_FragColor = vec4(uCol, a);
}`;

  function compile(vs, fs) {
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.slice(0, 300)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const loc = { p, a: {}, u: {} };
    const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < na; i++) { const a = gl.getActiveAttrib(p, i); loc.a[a.name] = gl.getAttribLocation(p, a.name); }
    const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < nu; i++) { const u = gl.getActiveUniform(p, i); const n = u.name.replace(/\[0\]$/, ''); loc.u[n] = gl.getUniformLocation(p, u.name); }
    return loc;
  }
  function init() {
    if (cv) return ok;
    cv = document.createElement('canvas');
    cv.width = 320; cv.height = 200;
    try {
      gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: true, preserveDrawingBuffer: true, premultipliedAlpha: false }) || cv.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) return (ok = false);
    try {
      S.world = compile(VS_WORLD, FS_WORLD);
      S.spr = compile(VS_SPR, FS_SPR);
      S.sky = compile(VS_SKY, FS_SKY);
      S.wx = compile(VS_SKY, FS_WX);
    } catch (e) { console.warn('px3d shaders', e); gl = null; return (ok = false); }
    S.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, S.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    S.worldBuf = gl.createBuffer(); S.worldN = 0;
    S.sprBuf = gl.createBuffer();
    initAtlas(); initSprAtlas();
    ok = true;
    return ok;
  }
  P3.supported = () => init();
  P3.canvas = () => cv;

  // ============================================================
  // Текстуры: пиксель-арт 32×32 в атласе 512×512
  // ============================================================
  const TS = 32, AW = 512, PER = AW / TS;
  let atlas = null, actx = null, atex = null, aIndex = new Map(), aNext = 0, aDirty = false;
  function initAtlas() {
    atlas = document.createElement('canvas'); atlas.width = AW; atlas.height = AW;
    actx = atlas.getContext('2d');
    atex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, atex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, AW, AW, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  // номер текстуры → смещение в атласе (u, v)
  P3.tex = function (name) {
    let k = aIndex.get(name);
    if (k == null) {
      if (aNext >= PER * PER) return [0, 0];
      k = aNext++;
      const img = actx.createImageData(TS, TS);
      (P3.TEX[name.split(':')[0]] || P3.TEX.noise)(img.data, name, mkRand(name));
      actx.putImageData(img, (k % PER) * TS, Math.floor(k / PER) * TS);
      aIndex.set(name, k);
      aDirty = true;
    }
    return [(k % PER) * TS / AW, Math.floor(k / PER) * TS / AW];
  };
  P3.TS = TS / AW;
  function mkRand(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
  P3.mkRand = mkRand;

  // ============================================================
  // Атлас спрайтов (растёт по мере надобности)
  // ============================================================
  const SW = 2048;
  let spr = null, sctx = null, stex = null, sIndex = new Map(), shelf = { x: 0, y: 0, h: 0 }, sDirty = [];
  function initSprAtlas() {
    spr = document.createElement('canvas'); spr.width = SW; spr.height = SW;
    sctx = spr.getContext('2d');
    stex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, stex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SW, SW, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  // положить картинку спрайта в атлас; вернуть её прямоугольник
  P3.sprite = function (sp) {
    let r = sIndex.get(sp.key);
    if (r) return r;
    if (shelf.x + sp.w + 1 > SW) { shelf.x = 0; shelf.y += shelf.h + 1; shelf.h = 0; }
    if (shelf.y + sp.h + 1 > SW) { // атлас полон — начать заново
      sIndex.clear(); shelf = { x: 0, y: 0, h: 0 }; sctx.clearRect(0, 0, SW, SW); sDirty = [[0, 0, SW, SW]];
      if (Gfx.PX) Gfx.PX.clear();
    }
    sctx.drawImage(sp.cv, shelf.x, shelf.y);
    r = { u0: shelf.x / SW, v0: shelf.y / SW, u1: (shelf.x + sp.w) / SW, v1: (shelf.y + sp.h) / SW, w: sp.w, h: sp.h, ax: sp.ax, ay: sp.ay, ppu: sp.ppu };
    sDirty.push([shelf.x, shelf.y, sp.w, sp.h, sp.cv]);
    shelf.x += sp.w + 1; shelf.h = Math.max(shelf.h, sp.h);
    sIndex.set(sp.key, r);
    return r;
  };

  // ============================================================
  // Геометрия мира (собирает js/ui/view3d.js)
  // ============================================================
  // вершина: pos(3) loc(2) tile(2) n(3) sky(1) kind(1) = 12 float
  P3.mesh = function () { return { a: [], n: 0 }; };
  // прямоугольник по четырём углам (против часовой стрелки, если смотреть с лицевой стороны)
  P3.quad = function (M, p0, p1, p2, p3, l0, l1, tile, n, sky, kind) {
    const t = P3.tex(tile);
    const v = (p, l) => { M.a.push(p[0], p[1], p[2], l[0], l[1], t[0], t[1], n[0], n[1], n[2], sky, kind || 0); };
    const L00 = [l0[0], l0[1]], L10 = [l1[0], l0[1]], L11 = [l1[0], l1[1]], L01 = [l0[0], l1[1]];
    v(p0, L00); v(p1, L10); v(p2, L11);
    v(p0, L00); v(p2, L11); v(p3, L01);
    M.n += 6;
  };
  P3.tri = function (M, p0, p1, p2, l0, l1, l2, tile, n, sky, kind) {
    const t = P3.tex(tile);
    for (const [p, l] of [[p0, l0], [p1, l1], [p2, l2]]) M.a.push(p[0], p[1], p[2], l[0], l[1], t[0], t[1], n[0], n[1], n[2], sky, kind || 0);
    M.n += 3;
  };
  P3.setWorld = function (M) {
    if (!init()) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, S.worldBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(M.a), gl.STATIC_DRAW);
    S.worldN = M.n;
  };

  // ============================================================
  // Кадр
  // ============================================================
  // f: { w, h — размер кадра в пикселях, cam: { x, y, z, yaw, pitch, fov }, sky: {…}, lights: [{x,y,z,r,col,i}], sprites: [{ sp, x, y, z, scale, col }], wx: {kind, dens, col} }
  const mat = new Float32Array(16);
  P3.render = function (f) {
    if (!init()) return null;
    if (cv.width !== f.w || cv.height !== f.h) { cv.width = f.w; cv.height = f.h; }
    gl.viewport(0, 0, f.w, f.h);
    // атласы
    if (aDirty) { gl.bindTexture(gl.TEXTURE_2D, atex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas); aDirty = false; }
    if (sDirty.length) {
      gl.bindTexture(gl.TEXTURE_2D, stex);
      for (const [x, y, w, , src] of sDirty) { if (w === SW) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, spr); break; } gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, src); }
      sDirty = [];
    }
    const c = f.cam, sk = f.sky;
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch || 0), sp = Math.sin(c.pitch || 0);
    const F = [sy * cp, sp, -cy * cp], R = [cy, 0, sy], U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
    const tanH = Math.tan((c.fov || 1.05) / 2), asp = f.w / f.h, near = 0.05, far = 60;
    // матрица вида-проекции
    const ex = c.x, ey = c.y, ez = c.z;
    const V = [R[0], U[0], -F[0], 0, R[1], U[1], -F[1], 0, R[2], U[2], -F[2], 0,
      -(R[0] * ex + R[1] * ey + R[2] * ez), -(U[0] * ex + U[1] * ey + U[2] * ez), (F[0] * ex + F[1] * ey + F[2] * ez), 1];
    const P = [1 / (tanH * asp), 0, 0, 0, 0, 1 / tanH, 0, 0, 0, 0, -(far + near) / (far - near), -1, 0, 0, -2 * far * near / (far - near), 0];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += P[k * 4 + j] * V[i * 4 + k]; mat[i * 4 + j] = s; }
    P3.last = { mat: Float32Array.from(mat), w: f.w, h: f.h, cam: c, F, R, U, tanH, asp };
    gl.clearColor(sk.fog[0], sk.fog[1], sk.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // небо
    gl.disable(gl.DEPTH_TEST);
    let L = S.sky; gl.useProgram(L.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, S.quad);
    gl.enableVertexAttribArray(L.a.aP); gl.vertexAttribPointer(L.a.aP, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(L.u.uF, F); gl.uniform3fv(L.u.uR, R); gl.uniform3fv(L.u.uU, U); gl.uniform1f(L.u.uTan, tanH); gl.uniform1f(L.u.uAsp, asp);
    gl.uniform3fv(L.u.uZen, sk.zen); gl.uniform3fv(L.u.uHor, sk.hor); gl.uniform3fv(L.u.uSunDir, sk.sunSky || sk.sunDir); gl.uniform3fv(L.u.uSunC, sk.sunDisc); gl.uniform3fv(L.u.uMoonDir, sk.moonDir);
    gl.uniform1f(L.u.uStars, sk.stars); gl.uniform1f(L.u.uTime, f.time); gl.uniform1f(L.u.uCloud, sk.cloud); gl.uniform3fv(L.u.uCloudC, sk.cloudC); gl.uniform1f(L.u.uIn, sk.indoor ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(L.a.aP);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    // общий свет
    const setLight = (L) => {
      gl.uniformMatrix4fv(L.u.uVP, false, mat);
      gl.uniform3fv(L.u.uSunDir, sk.sunDir); gl.uniform3fv(L.u.uSun, sk.sun); gl.uniform3fv(L.u.uAmb, sk.amb); gl.uniform3fv(L.u.uFog, sk.fog);
      gl.uniform3f(L.u.uCam, ex, ey, ez); gl.uniform1f(L.u.uFogD, sk.fogD); gl.uniform1f(L.u.uTime, f.time); gl.uniform1f(L.u.uNight, sk.night);
      const lp = new Float32Array(32), lc = new Float32Array(32);
      const ls = f.lights.slice(0, 8);
      ls.forEach((l, i) => { lp.set([l.x, l.y, l.z, l.r], i * 4); lc.set([l.col[0], l.col[1], l.col[2], l.i], i * 4); });
      if (L.u.uLP) gl.uniform4fv(L.u.uLP, lp);
      if (L.u.uLC) gl.uniform4fv(L.u.uLC, lc);
      gl.uniform1i(L.u.uNL, ls.length);
    };
    // мир
    if (S.worldN) {
      L = S.world; gl.useProgram(L.p); setLight(L);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atex); gl.uniform1i(L.u.uTex, 0); gl.uniform1f(L.u.uTS, P3.TS);
      gl.bindBuffer(gl.ARRAY_BUFFER, S.worldBuf);
      const st = 12 * 4;
      const at = (n, size, off) => { if (L.a[n] == null || L.a[n] < 0) return; gl.enableVertexAttribArray(L.a[n]); gl.vertexAttribPointer(L.a[n], size, gl.FLOAT, false, st, off * 4); };
      at('aPos', 3, 0); at('aLoc', 2, 3); at('aTile', 2, 5); at('aN', 3, 7); at('aSky', 1, 10); at('aKind', 1, 11);
      gl.drawArrays(gl.TRIANGLES, 0, S.worldN);
      for (const n of ['aPos', 'aLoc', 'aTile', 'aN', 'aSky', 'aKind']) if (L.a[n] >= 0) gl.disableVertexAttribArray(L.a[n]);
    }
    // спрайты: квадраты лицом к камере
    if (f.sprites.length) {
      const a = new Float32Array(f.sprites.length * 6 * 8);
      let o = 0;
      for (const s of f.sprites) {
        const r = s.r, k = s.scale / r.ppu;
        const x0 = -r.ax * k, x1 = (r.w - r.ax) * k, y0 = (r.ay - r.h) * k, y1 = r.ay * k;
        const rx = R[0], rz = R[2];
        const P0 = [s.x + rx * x0, s.y + y0, s.z + rz * x0], P1 = [s.x + rx * x1, s.y + y0, s.z + rz * x1], P2 = [s.x + rx * x1, s.y + y1, s.z + rz * x1], P3_ = [s.x + rx * x0, s.y + y1, s.z + rz * x0];
        const put = (p, u, v) => { a[o++] = p[0]; a[o++] = p[1]; a[o++] = p[2]; a[o++] = u; a[o++] = v; a[o++] = s.col[0]; a[o++] = s.col[1]; a[o++] = s.col[2]; };
        put(P0, r.u0, r.v1); put(P1, r.u1, r.v1); put(P2, r.u1, r.v0);
        put(P0, r.u0, r.v1); put(P2, r.u1, r.v0); put(P3_, r.u0, r.v0);
      }
      L = S.spr; gl.useProgram(L.p); setLight(L);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, stex); gl.uniform1i(L.u.uSpr, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, S.sprBuf);
      gl.bufferData(gl.ARRAY_BUFFER, a, gl.DYNAMIC_DRAW);
      const st = 8 * 4;
      gl.enableVertexAttribArray(L.a.aPos); gl.vertexAttribPointer(L.a.aPos, 3, gl.FLOAT, false, st, 0);
      gl.enableVertexAttribArray(L.a.aUV); gl.vertexAttribPointer(L.a.aUV, 2, gl.FLOAT, false, st, 12);
      gl.enableVertexAttribArray(L.a.aCol); gl.vertexAttribPointer(L.a.aCol, 3, gl.FLOAT, false, st, 20);
      gl.drawArrays(gl.TRIANGLES, 0, f.sprites.length * 6);
      gl.disableVertexAttribArray(L.a.aPos); gl.disableVertexAttribArray(L.a.aUV); gl.disableVertexAttribArray(L.a.aCol);
    }
    // погода — тихая, поверх всего
    if (f.wx) {
      gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      L = S.wx; gl.useProgram(L.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, S.quad);
      gl.enableVertexAttribArray(L.a.aP); gl.vertexAttribPointer(L.a.aP, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(L.u.uTime, f.time); gl.uniform1f(L.u.uKind, f.wx.kind); gl.uniform2f(L.u.uRes, f.w, f.h); gl.uniform3fv(L.u.uCol, f.wx.col); gl.uniform1f(L.u.uDens, f.wx.dens);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(L.a.aP);
      gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST);
    }
    return cv;
  };
  // точка мира → пиксель кадра (для подсказок [E] и прочего)
  P3.project = function (x, y, z) {
    const l = P3.last;
    if (!l) return null;
    const m = l.mat;
    const X = m[0] * x + m[4] * y + m[8] * z + m[12], Y = m[1] * x + m[5] * y + m[9] * z + m[13], W = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (W <= 0.05) return null;
    return [(X / W * 0.5 + 0.5) * l.w, (1 - (Y / W * 0.5 + 0.5)) * l.h, W];
  };
  // пиксель кадра → луч (для клика по земле)
  P3.ray = function (px, py) {
    const l = P3.last;
    if (!l) return null;
    const nx = (px / l.w) * 2 - 1, ny = 1 - (py / l.h) * 2;
    const d = [l.F[0] + l.R[0] * nx * l.tanH * l.asp + l.U[0] * ny * l.tanH, l.F[1] + l.R[1] * nx * l.tanH * l.asp + l.U[1] * ny * l.tanH, l.F[2] + l.R[2] * nx * l.tanH * l.asp + l.U[2] * ny * l.tanH];
    return { o: [l.cam.x, l.cam.y, l.cam.z], d };
  };
})(window.EOF);
