'use strict';
// Пиксельный 3D-мир от первого лица — как живописный пиксель-арт: мир рисуется в маленьком
// разрешении и растягивается без сглаживания. Земля и стены — пиксельные текстуры 32×32,
// деревья, люди, звери и вещи — спрайты из объёмных моделей (Gfx.PX).
// Свет написан «по-художнички»: солнце отбрасывает тени (карта теней), освещённое — тёплое,
// тень — холодная, даль тонет в голубой дымке, а у солнца дымка золотится. Небо — с облаками,
// подсвеченными солнцем, закатами, звёздами и луной. Дождь и снег — тихие.
// Мир состоит из кусков (чанков): у каждого свой буфер и смещение; вершины хранятся
// относительно начала куска, а кадр строится относительно точки рядом с камерой — так даже
// на краю огромного мира точности хватает.
// Модуль ничего не знает об игре: на входе — сетки, описание кадра и камера (js/ui/view3d.js).
(function (E) {
  const Gfx = E.Gfx;
  const P3 = Gfx.P3 = {};
  let cv = null, gl = null, ok = false;
  const S = {};

  // ============================================================
  // Шейдеры
  // ============================================================
  const PREC = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;
  // вершина мира: pos(3) loc(2) tile(2) n(3) sky(1) kind(1) tint(3) = 15 float
  // kind: 0 земля и стены, 1 вода, 2…9 мягкий край соседней земли, 20 дальняя земля
  const VS_WORLD = `
attribute vec3 aPos; attribute vec2 aLoc; attribute vec2 aTile; attribute vec3 aN; attribute float aSky; attribute float aKind; attribute vec3 aTint;
uniform mat4 uVP; uniform vec3 uOff; uniform vec4 uNear; uniform mat4 uSM; uniform vec4 uHide;
varying vec2 vLoc; varying vec2 vTile; varying vec3 vN; varying vec3 vW; varying float vSky; varying float vKind; varying vec3 vTint; varying vec4 vLS;
void main(){
  vec3 p = aPos + uOff;
  // дальняя земля уходит вниз там, где лежат подробные куски
  if (aKind > 19.5 && p.x > uNear.x && p.x < uNear.z && p.z > uNear.y && p.z < uNear.w) p.y -= aKind > 21.5 ? 200.0 : 8.0;
  // дом, где ты: крыши нет, потолок есть; в других домах — наоборот
  bool inH = p.x > uHide.x && p.x < uHide.z && p.z > uHide.y && p.z < uHide.w;
  if ((aKind > 9.5 && aKind < 10.5 && inH) || (aKind > 10.5 && aKind < 11.5 && !inH)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vLoc=aLoc; vTile=aTile; vN=aN; vW=p; vSky=aSky; vKind=aKind; vTint=aTint;
  vLS = uSM * vec4(p + aN*0.05, 1.0);
  gl_Position = uVP*vec4(p,1.0);
}`;
  const LIGHT_FN = `
uniform vec3 uSunDir; uniform vec3 uSunSky; uniform vec3 uSun; uniform vec3 uAmb; uniform vec3 uFog; uniform vec3 uFogSun; uniform vec3 uCam; uniform float uFogD; uniform float uTime; uniform float uNight;
uniform vec3 uZen; uniform vec3 uHor;
uniform vec4 uLP[8]; uniform vec4 uLC[8]; uniform int uNL;
uniform sampler2D uShadow; uniform float uShOn; uniform float uShTex;
float unpackD(vec4 c){ return dot(c, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0)); }
float shadowAt(vec4 ls, float bias){
  if (uShOn < 0.5) return 1.0;
  vec3 p = ls.xyz / ls.w * 0.5 + 0.5;
  if (p.x <= 0.0 || p.x >= 1.0 || p.y <= 0.0 || p.y >= 1.0 || p.z >= 1.0) return 1.0;
  float px = 1.0/uShTex, s = 0.0;
  s += step(p.z - bias, unpackD(texture2D(uShadow, p.xy + vec2(-0.5,-0.5)*px)));
  s += step(p.z - bias, unpackD(texture2D(uShadow, p.xy + vec2( 0.5,-0.5)*px)));
  s += step(p.z - bias, unpackD(texture2D(uShadow, p.xy + vec2(-0.5, 0.5)*px)));
  s += step(p.z - bias, unpackD(texture2D(uShadow, p.xy + vec2( 0.5, 0.5)*px)));
  float edge = smoothstep(0.0, 0.1, min(min(p.x, 1.0-p.x), min(p.y, 1.0-p.y)));
  return mix(1.0, s*0.25, edge*uShOn);
}
vec3 lightAt(vec3 w, vec3 n, float sky, float fl, float sh){
  float sunL = mix(max(dot(n, uSunDir), 0.0), 0.5 + 0.5*max(uSunDir.y,0.0), fl) * sh;
  vec3 L = uAmb*(0.6 + 0.4*mix(n.y,1.0,fl))*sky + uSun*sunL*sky + vec3(0.03,0.028,0.04);
  for (int i=0;i<8;i++){
    if (i>=uNL) break;
    vec3 d = uLP[i].xyz - w; float dist = length(d);
    float att = clamp(1.0 - dist/uLP[i].w, 0.0, 1.0); att *= att;
    float nd = mix(0.35 + 0.65*max(dot(n, d/max(dist,0.001)), 0.0), 1.0, fl);
    L += uLC[i].rgb*uLC[i].a*att*nd;
  }
  return L;
}
// живописный свет: в тени — холодно и сине, на свету — тепло; цвета чуть сочнее
vec3 grade(vec3 c, vec3 L){
  float lum = dot(L, vec3(0.3,0.55,0.15));
  vec3 tint = mix(vec3(0.6,0.66,1.05), vec3(1.07,1.0,0.88), smoothstep(0.1, 0.9, lum));
  vec3 o = c*L*tint;
  float g = dot(o, vec3(0.3,0.55,0.15));
  return max(mix(vec3(g), o, 1.2), 0.0);
}
// воздушная перспектива: даль голубеет, у солнца — золотится; низины туманнее
vec3 fogIt(vec3 c, vec3 w){
  vec3 d = w - uCam; float fd = length(d);
  float hk = exp(-max(w.y + 2.0, 0.0)*0.03);
  float f = 1.0 - exp(-pow(fd*uFogD, 1.15)*(0.5 + 0.5*hk));
  float sd = max(dot(d/max(fd,0.001), uSunSky), 0.0);
  vec3 fc = mix(uFog, uFogSun, pow(sd, 5.0));
  return mix(c, fc, clamp(f, 0.0, 1.0));
}
vec3 skyCol(vec3 d){ return mix(uHor, uZen, smoothstep(-0.02, 0.6, d.y)); }
float bayer(vec2 p){ vec2 q = mod(floor(p), 4.0); float a = q.x + q.y*4.0;
  return (a==0.0?0.0:a==1.0?8.0:a==2.0?2.0:a==3.0?10.0:a==4.0?12.0:a==5.0?4.0:a==6.0?14.0:a==7.0?6.0:a==8.0?3.0:a==9.0?11.0:a==10.0?1.0:a==11.0?9.0:a==12.0?15.0:a==13.0?7.0:a==14.0?13.0:5.0)/16.0; }
vec3 quant(vec3 c){ float b = bayer(gl_FragCoord.xy) - 0.5; return floor(c*22.0 + 0.5 + b*0.95)/22.0; }`;
  const FS_WORLD = PREC + `
uniform sampler2D uTex; uniform float uTS; uniform vec2 uFarTile;
varying vec2 vLoc; varying vec2 vTile; varying vec3 vN; varying vec3 vW; varying float vSky; varying float vKind; varying vec3 vTint; varying vec4 vLS;
${LIGHT_FN}
void main(){
  vec2 l = vLoc;
  bool water = (vKind > 0.5 && vKind < 1.5) || (vKind > 20.5 && vKind < 21.5);
  if (vKind > 1.5 && vKind < 9.5) { // край соседней земли: растворяется точками к середине клетки
    vec2 q = fract(vLoc); vec2 tp = floor(vLoc*16.0);
    float d = vKind < 2.5 ? q.y : vKind < 3.5 ? 1.0-q.x : vKind < 4.5 ? 1.0-q.y : vKind < 5.5 ? q.x
      : vKind < 6.5 ? length(vec2(1.0-q.x, q.y)) : vKind < 7.5 ? length(vec2(1.0-q.x, 1.0-q.y)) : vKind < 8.5 ? length(vec2(q.x, 1.0-q.y)) : length(q);
    float nz = fract(sin(dot(floor(vLoc*8.0), vec2(12.9898,78.233)))*43758.5453);
    if (1.0 - d/0.36 + (nz-0.5)*0.55 < bayer(tp)) discard;
  }
  if (water) l += vec2(uTime*0.03 + sin(uTime*0.6 + vW.z*0.9)*0.05, uTime*0.012);
  vec3 n = normalize(vN);
  vec4 t;
  vec3 base;
  if (vKind > 19.5 && vKind < 20.5) {
    // дальняя земля: крупный и мелкий шум; на кручах снег не держится — там камень пластами
    t = texture2D(uTex, uFarTile + fract(vLoc)*uTS);
    float t2 = texture2D(uTex, uFarTile + fract(vLoc*3.7)*uTS).r;
    base = vTint*(0.78 + t.r*0.3 + t2*0.16);
    float steep = 1.0 - smoothstep(0.55, 0.85, n.y);
    float snowy = smoothstep(0.82, 0.95, vTint.b);
    vec3 rock = vec3(0.42, 0.39, 0.36)*(0.75 + t2*0.45 + 0.12*sin(vW.y*2.3 + t.r*3.0));
    base = mix(base, rock, steep*max(snowy, 0.6));
    t.a = 1.0;
  }
  else { t = texture2D(uTex, vTile + fract(l)*uTS); base = t.rgb*vTint; }
  float sh = shadowAt(vLS, 0.0018);
  vec3 L = lightAt(vW, n, vSky, 0.0, sh);
  vec3 c = grade(base, L);
  if (water) {
    vec3 v = normalize(vW - uCam);
    vec3 r = reflect(v, n);
    float fr = 0.25 + 0.6*pow(1.0 - max(dot(-v, n), 0.0), 3.0);
    c = mix(c, skyCol(r)*(0.55 + 0.45*vSky), fr*vSky);
    float g = pow(max(dot(r, uSunSky), 0.0), 40.0);
    c += uSun*g*1.2*vSky*sh;
  }
  if (t.a < 0.6) { float em = t.a > 0.4 ? 1.0 : uNight; c = mix(c, t.rgb*1.3, em); }
  gl_FragColor = vec4(quant(fogIt(c, vW)), 1.0);
}`;
  // спрайты-«щиты»: всегда лицом к камере, стоят на земле
  // вершина: center(3) off(2) uv(2) sky(1) = 8 float
  const VS_BB = `
attribute vec3 aC; attribute vec2 aO; attribute vec2 aUV; attribute float aSky;
uniform mat4 uVP; uniform vec3 uOff; uniform vec3 uRight; uniform mat4 uSM; uniform vec3 uSunDir;
varying vec2 vUV; varying vec3 vW; varying vec4 vLS; varying float vSky; varying float vH;
void main(){
  vec3 c = aC + uOff;
  vec3 p = c + uRight*aO.x + vec3(0.0, aO.y, 0.0);
  vUV = aUV; vW = p; vSky = aSky; vH = aO.y;
  vLS = uSM * vec4(p + uSunDir*0.9 + vec3(0.0,0.15,0.0), 1.0);
  gl_Position = uVP*vec4(p,1.0);
}`;
  const FS_BB = PREC + `
uniform sampler2D uSpr; uniform vec3 uTintAll;
varying vec2 vUV; varying vec3 vW; varying vec4 vLS; varying float vSky; varying float vH;
${LIGHT_FN}
void main(){
  vec4 t = texture2D(uSpr, vUV);
  if (t.a < 0.3) discard;
  // полупрозрачное (призраки) — сеткой точек, без сортировки
  if (t.a < 0.9 && bayer(gl_FragCoord.xy) > t.a*1.1) discard;
  vec3 toCam = normalize(vec3(uCam.x - vW.x, 0.0, uCam.z - vW.z) + vec3(0.0,0.001,0.0));
  vec3 n = normalize(vec3(0.0, 0.55, 0.0) + toCam*0.6 + uSunDir*0.25);
  float sh = shadowAt(vLS, 0.004);
  vec3 L = lightAt(vW, n, vSky, 0.65, sh);
  vec3 c = t.a > 0.96 && t.a < 0.99 ? t.rgb*1.15 : grade(t.rgb*uTintAll, L);
  gl_FragColor = vec4(quant(fogIt(c, vW)), 1.0);
}`;
  // тени: глубина от солнца, упакованная в цвет
  const PACK = `vec4 packD(float d){ vec4 e = fract(d * vec4(1.0, 255.0, 65025.0, 16581375.0)); e -= e.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0); return e; }`;
  const VS_SH_WORLD = `
attribute vec3 aPos; attribute float aKind;
uniform mat4 uLVP; uniform vec3 uOff;
void main(){ if (aKind > 0.5 && (aKind < 9.5 || aKind > 19.5)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; } gl_Position = uLVP*vec4(aPos + uOff, 1.0); }`;
  const FS_SH = PREC + `${PACK}
void main(){ gl_FragColor = packD(gl_FragCoord.z); }`;
  const VS_SH_BB = `
attribute vec3 aC; attribute vec2 aO; attribute vec2 aUV;
uniform mat4 uLVP; uniform vec3 uOff; uniform vec3 uLRight;
varying vec2 vUV;
void main(){ vec3 p = aC + uOff + uLRight*aO.x + vec3(0.0, aO.y, 0.0); vUV = aUV; gl_Position = uLVP*vec4(p, 1.0); }`;
  const FS_SH_BB = PREC + `${PACK}
uniform sampler2D uSpr; varying vec2 vUV;
void main(){ vec4 t = texture2D(uSpr, vUV); if (t.a < 0.5) discard; gl_FragColor = packD(gl_FragCoord.z); }`;
  // небо: градиент, сияние у солнца, облака, подсвеченные солнцем, звёзды, Млечный путь, луна
  const VS_SKY = `attribute vec2 aP; varying vec2 vP; void main(){ vP=aP; gl_Position=vec4(aP,0.999,1.0); }`;
  const FS_SKY = PREC + `
varying vec2 vP;
uniform vec3 uF; uniform vec3 uR; uniform vec3 uU; uniform float uTan; uniform float uAsp;
uniform vec3 uZen; uniform vec3 uHor; uniform vec3 uSunDir; uniform vec3 uSunC; uniform vec3 uGlow; uniform vec3 uMoonDir; uniform float uStars; uniform float uTime;
uniform float uCloud; uniform vec3 uCloudLit; uniform vec3 uCloudSh; uniform float uIn; uniform float uSeed;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float f=0.0, a=0.5; for (int i=0;i<5;i++){ f += a*n2(p); p = p*2.02 + vec2(3.1, 7.7); a *= 0.5; } return f; }
// кучевые облака: клубы — шум, поднятый к краям
float cloudDen(vec2 p){ float f = fbm(p); float g = fbm(p*0.35 + 11.0); return f*0.7 + g*0.45; }
float bayer(vec2 p){ vec2 q = mod(floor(p), 4.0); float a = q.x + q.y*4.0;
  return (a==0.0?0.0:a==1.0?8.0:a==2.0?2.0:a==3.0?10.0:a==4.0?12.0:a==5.0?4.0:a==6.0?14.0:a==7.0?6.0:a==8.0?3.0:a==9.0?11.0:a==10.0?1.0:a==11.0?9.0:a==12.0?15.0:a==13.0?7.0:a==14.0?13.0:5.0)/16.0; }
vec3 quant(vec3 c){ float b = bayer(gl_FragCoord.xy) - 0.5; return floor(c*18.0 + 0.5 + b*0.95)/18.0; }
void main(){
  if (uIn > 0.5) { gl_FragColor = vec4(uHor, 1.0); return; }
  vec3 d = normalize(uF + uR*vP.x*uTan*uAsp + uU*vP.y*uTan);
  float y = d.y;
  vec3 c = mix(uHor, uZen, pow(smoothstep(-0.03, 0.62, y), 0.75));
  float sd = max(dot(d, uSunDir), 0.0);
  // сияние у солнца
  c += uGlow*(pow(sd, 5.0)*0.32 + pow(sd, 40.0)*0.55)*(1.0 - 0.5*smoothstep(0.0, 0.7, y));
  // звёзды и Млечный путь
  if (y > 0.0 && uStars > 0.01) {
    vec2 sp = d.xz/(y + 0.35);
    float band = exp(-pow((d.x*0.6 + d.z*0.8 + y*0.35 - 0.1)*3.2, 2.0));
    float mw = fbm(sp*3.0 + 5.0)*band;
    c += vec3(0.32, 0.3, 0.45)*mw*uStars*0.7;
    vec2 cell = floor(sp*95.0); float s = h2(cell);
    float tw = 0.65 + 0.35*sin(uTime*2.3 + s*60.0);
    float big = step(0.9975, s);
    c += mix(vec3(0.75,0.8,1.0), vec3(1.0,0.85,0.7), h2(cell+3.0))*(step(0.992 - band*0.01, s)*0.7 + big*0.6)*uStars*tw*smoothstep(0.0, 0.18, y);
  }
  // луна с пятнами
  float md = dot(d, uMoonDir);
  if (md > 0.9985) { float k = smoothstep(0.9985, 0.9991, md); vec2 mp = (d.xz - uMoonDir.xz)*900.0; c = mix(c, vec3(0.86,0.88,0.94)*(0.85 + 0.15*n2(mp*0.5)), k*uStars); }
  c += vec3(0.5,0.55,0.7)*pow(max(md,0.0), 200.0)*0.25*uStars;
  // солнечный диск
  c += uSunC*smoothstep(0.9978, 0.9986, sd)*1.4;
  // облака: плоскость над головой; ближе к горизонту — гуще и выше (кучевые башни)
  if (y > -0.02) {
    float yy = max(y, 0.0);
    vec2 p = d.xz/(yy + 0.07)*0.75 + vec2(uTime*0.010, uTime*0.004) + uSeed;
    float den = cloudDen(p);
    vec2 toSun = normalize(uSunDir.xz + vec2(1e-4))*0.11;
    float den2 = cloudDen(p + toSun);
    float lit = clamp(0.55 + (den - den2)*4.5, 0.0, 1.0);
    float cov = 0.86 - uCloud*0.42 - (1.0 - smoothstep(0.0, 0.35, yy))*0.1;
    float a = smoothstep(cov, cov + 0.14, den);
    vec3 cc = mix(uCloudSh, uCloudLit, lit);
    // серебряный край со стороны солнца
    cc += uGlow*pow(sd, 6.0)*(1.0 - smoothstep(cov, cov + 0.3, den))*0.9;
    a *= smoothstep(-0.02, 0.06, y);
    c = mix(c, cc, a);
  }
  gl_FragColor = vec4(quant(c), 1.0);
}`;
  const FS_WX = PREC + `
varying vec2 vP; uniform float uTime; uniform float uKind; uniform vec2 uRes; uniform vec3 uCol; uniform float uDens;
float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec2 px = (vP*0.5+0.5)*uRes;
  float a = 0.0;
  if (uKind < 1.5) { // дождь: тонкие косые штрихи
    vec2 q = vec2(px.x + px.y*0.25, px.y + uTime*220.0);
    vec2 cell = floor(q/vec2(3.0, 14.0)); float r = h2(cell);
    float yy = fract(q.y/14.0);
    a = step(1.0-uDens, r)*step(yy, 0.45)*0.25;
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
  const SHN = 2048; // карта теней
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
      S.bb = compile(VS_BB, FS_BB);
      S.sky = compile(VS_SKY, FS_SKY);
      S.wx = compile(VS_SKY, FS_WX);
      S.shW = compile(VS_SH_WORLD, FS_SH);
      S.shB = compile(VS_SH_BB, FS_SH_BB);
    } catch (e) { console.warn('px3d shaders', e); gl = null; return (ok = false); }
    S.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, S.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    S.dynBuf = gl.createBuffer();
    // карта теней: глубина упакована в цвет (работает везде, где есть WebGL)
    try {
      S.shTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, S.shTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHN, SHN, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      S.shDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, S.shDepth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SHN, SHN);
      S.shFB = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, S.shFB);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, S.shTex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, S.shDepth);
      S.shOk = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } catch (e) { S.shOk = false; }
    initAtlas(); initSprAtlas();
    ok = true;
    return ok;
  }
  P3.supported = () => init();
  P3.canvas = () => cv;
  P3.shadows = true;

  // ============================================================
  // Текстуры: пиксель-арт 32×32 в атласе 1024×1024
  // ============================================================
  const TS = 32, AW = 1024, PER = AW / TS;
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
  // имя текстуры → смещение в атласе (u, v)
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
  // Атлас спрайтов (растёт по мере надобности; переполнился — начинается заново, P3.sprGen++)
  // ============================================================
  let SW = 2048;
  let spr = null, sctx = null, stex = null, sIndex = new Map(), shelf = { x: 0, y: 0, h: 0 }, sDirty = [];
  P3.sprGen = 0;
  function initSprAtlas() {
    SW = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048);
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
      P3.sprGen++;
      if (Gfx.PX) Gfx.PX.clear();
    }
    sctx.drawImage(sp.cv, shelf.x, shelf.y);
    r = { u0: shelf.x / SW, v0: shelf.y / SW, u1: (shelf.x + sp.w) / SW, v1: (shelf.y + sp.h) / SW, w: sp.w, h: sp.h, ax: sp.ax, ay: sp.ay, ppu: sp.ppu, gen: P3.sprGen };
    sDirty.push([shelf.x, shelf.y, sp.w, sp.h, sp.cv]);
    shelf.x += sp.w + 1; shelf.h = Math.max(shelf.h, sp.h);
    sIndex.set(sp.key, r);
    return r;
  };
  P3.hasSprite = (key) => sIndex.has(key);

  // ============================================================
  // Сетки
  // ============================================================
  // вершина мира: pos(3) loc(2) tile(2) n(3) sky(1) kind(1) tint(3) = 15 float
  const WV = 15;
  P3.mesh = function () { return { a: [], n: 0 }; };
  const WHITE = [1, 1, 1];
  P3.vtx = function (M, p, l, t, n, sky, kind, tint) { const c = tint || WHITE; M.a.push(p[0], p[1], p[2], l[0], l[1], t[0], t[1], n[0], n[1], n[2], sky, kind || 0, c[0], c[1], c[2]); };
  // прямоугольник по четырём углам; tint — цвет-множитель (один или по углу)
  P3.quad = function (M, p0, p1, p2, p3, l0, l1, tile, n, sky, kind, tint) {
    const t = P3.tex(tile);
    const tc = (i) => (tint && Array.isArray(tint[0]) ? tint[i] : tint);
    const L00 = [l0[0], l0[1]], L10 = [l1[0], l0[1]], L11 = [l1[0], l1[1]], L01 = [l0[0], l1[1]];
    P3.vtx(M, p0, L00, t, n, sky, kind, tc(0)); P3.vtx(M, p1, L10, t, n, sky, kind, tc(1)); P3.vtx(M, p2, L11, t, n, sky, kind, tc(2));
    P3.vtx(M, p0, L00, t, n, sky, kind, tc(0)); P3.vtx(M, p2, L11, t, n, sky, kind, tc(2)); P3.vtx(M, p3, L01, t, n, sky, kind, tc(3));
    M.n += 6;
  };
  // то же, но нормаль у каждой вершины своя (холмы)
  P3.quadN = function (M, p, l, tile, ns, sky, kind, tint) {
    const t = P3.tex(tile);
    const tc = (i) => (tint && Array.isArray(tint[0]) ? tint[i] : tint);
    for (const i of [0, 1, 2, 0, 2, 3]) P3.vtx(M, p[i], l[i], t, ns[i], sky, kind, tc(i));
    M.n += 6;
  };
  P3.tri = function (M, p0, p1, p2, l0, l1, l2, tile, n, sky, kind, tint) {
    const t = P3.tex(tile);
    P3.vtx(M, p0, l0, t, n, sky, kind, tint); P3.vtx(M, p1, l1, t, n, sky, kind, tint); P3.vtx(M, p2, l2, t, n, sky, kind, tint);
    M.n += 3;
  };
  // залить сетку в видеопамять
  P3.upload = function (M) {
    if (!init() || !M.n) return null;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(M.a), gl.STATIC_DRAW);
    return { buf, n: M.n };
  };
  P3.free = function (h) { if (h && h.buf && gl) gl.deleteBuffer(h.buf); };
  // щиты (спрайты, повёрнутые к камере): center(3) off(2) uv(2) sky(1)
  const BV = 8;
  P3.bmesh = function () { return { a: [], n: 0 }; };
  P3.bb = function (B, r, x, y, z, scale, sky) {
    const k = scale / r.ppu;
    const x0 = -r.ax * k, x1 = (r.w - r.ax) * k, y0 = (r.ay - r.h) * k, y1 = r.ay * k;
    const a = B.a;
    const put = (ox, oy, u, v) => { a.push(x, y, z, ox, oy, u, v, sky); };
    put(x0, y0, r.u0, r.v1); put(x1, y0, r.u1, r.v1); put(x1, y1, r.u1, r.v0);
    put(x0, y0, r.u0, r.v1); put(x1, y1, r.u1, r.v0); put(x0, y1, r.u0, r.v0);
    B.n += 6;
  };

  // ============================================================
  // Кадр
  // ============================================================
  // f: { w, h, time, cam: {x,y,z,yaw,pitch,fov} — всё в координатах кадра (рядом с нулём),
  //      sky: {…}, lights: […], meshes: [{h, off}], far: {h, off} | null, bills: [{h, off}],
  //      dyn: bmesh (спрайты этого кадра), near: [x0,z0,x1,z1], wx, shadow: {center:[x,y,z], size} | null }
  const mat = new Float32Array(16), smat = new Float32Array(16), lmat = new Float32Array(16);
  const ID = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  function mul4(out, A, B) { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += A[k * 4 + j] * B[i * 4 + k]; out[i * 4 + j] = s; } }
  function bindWorld(L, h, off) {
    gl.bindBuffer(gl.ARRAY_BUFFER, h.buf);
    const st = WV * 4;
    const at = (n, size, o) => { const l = L.a[n]; if (l == null || l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, st, o * 4); };
    at('aPos', 3, 0); at('aLoc', 2, 3); at('aTile', 2, 5); at('aN', 3, 7); at('aSky', 1, 10); at('aKind', 1, 11); at('aTint', 3, 12);
    if (L.u.uOff) gl.uniform3f(L.u.uOff, off[0], off[1], off[2]);
  }
  function unbind(L) { for (const n in L.a) if (L.a[n] >= 0) gl.disableVertexAttribArray(L.a[n]); }
  function bindBB(L, buf, off) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const st = BV * 4;
    const at = (n, size, o) => { const l = L.a[n]; if (l == null || l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, st, o * 4); };
    at('aC', 3, 0); at('aO', 2, 3); at('aUV', 2, 5); at('aSky', 1, 7);
    if (L.u.uOff) gl.uniform3f(L.u.uOff, off[0], off[1], off[2]);
  }
  function uploadAtlases() {
    if (aDirty) { gl.bindTexture(gl.TEXTURE_2D, atex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas); aDirty = false; }
    if (sDirty.length) {
      gl.bindTexture(gl.TEXTURE_2D, stex);
      for (const [x, y, w, , src] of sDirty) { if (w === SW) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, spr); break; } gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, src); }
      sDirty = [];
    }
  }
  // матрица «вид от солнца»: ортогональная коробка вокруг камеры, привязанная к текселям (тени не дрожат)
  function lightMatrix(sh, dir) {
    let lz = [-dir[0], -dir[1], -dir[2]];
    const up = Math.abs(lz[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
    let lx = [up[1] * lz[2] - up[2] * lz[1], up[2] * lz[0] - up[0] * lz[2], up[0] * lz[1] - up[1] * lz[0]];
    let l = Math.hypot(...lx); lx = lx.map((v) => v / l);
    const ly = [lz[1] * lx[2] - lz[2] * lx[1], lz[2] * lx[0] - lz[0] * lx[2], lz[0] * lx[1] - lz[1] * lx[0]];
    const S2 = sh.size, depth = 160;
    const c = sh.center;
    const tex = (2 * S2) / SHN;
    let cx = c[0] * lx[0] + c[1] * lx[1] + c[2] * lx[2], cy = c[0] * ly[0] + c[1] * ly[1] + c[2] * ly[2];
    const cz = c[0] * lz[0] + c[1] * lz[1] + c[2] * lz[2];
    cx = Math.round(cx / tex) * tex; cy = Math.round(cy / tex) * tex;
    // вид: строки lx, ly, -lz (смотрим вдоль lz)
    const V = [lx[0], ly[0], -lz[0], 0, lx[1], ly[1], -lz[1], 0, lx[2], ly[2], -lz[2], 0, -cx, -cy, cz - depth / 2, 1];
    const Pm = [1 / S2, 0, 0, 0, 0, 1 / S2, 0, 0, 0, 0, -2 / depth, 0, 0, 0, -1, 1];
    mul4(lmat, Pm, V);
    return { right: lx };
  }
  P3.render = function (f) {
    if (!init()) return null;
    if (cv.width !== f.w || cv.height !== f.h) { cv.width = f.w; cv.height = f.h; }
    uploadAtlases();
    const c = f.cam, sk = f.sky;
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch || 0), sp = Math.sin(c.pitch || 0);
    const F = [sy * cp, sp, -cy * cp], R = [cy, 0, sy], U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
    const tanH = Math.tan((c.fov || 1.05) / 2), asp = f.w / f.h, near = 0.06, far = f.farClip || 1400;
    const ex = c.x, ey = c.y, ez = c.z;
    const V = [R[0], U[0], -F[0], 0, R[1], U[1], -F[1], 0, R[2], U[2], -F[2], 0,
      -(R[0] * ex + R[1] * ey + R[2] * ez), -(U[0] * ex + U[1] * ey + U[2] * ez), (F[0] * ex + F[1] * ey + F[2] * ez), 1];
    const Pm = [1 / (tanH * asp), 0, 0, 0, 0, 1 / tanH, 0, 0, 0, 0, -(far + near) / (far - near), -1, 0, 0, -2 * far * near / (far - near), 0];
    mul4(mat, Pm, V);
    P3.last = { mat: Float32Array.from(mat), w: f.w, h: f.h, cam: c, F, R, U, tanH, asp };
    const meshes = f.meshes || [], bills = f.bills || [];
    // ---------- тени от солнца ----------
    let shOn = 0, lightR = [1, 0, 0];
    const shadowDir = sk.sunDir;
    if (f.shadow && P3.shadows && S.shOk && shadowDir[1] > 0.06 && (sk.sun[0] + sk.sun[1] + sk.sun[2]) > 0.05) {
      const lm = lightMatrix(f.shadow, shadowDir);
      lightR = lm.right;
      smat.set(lmat);
      gl.bindFramebuffer(gl.FRAMEBUFFER, S.shFB);
      gl.viewport(0, 0, SHN, SHN);
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      let L = S.shW; gl.useProgram(L.p);
      gl.uniformMatrix4fv(L.u.uLVP, false, smat);
      for (const m of meshes) {
        if (!m.h || m.noShadow) continue;
        gl.bindBuffer(gl.ARRAY_BUFFER, m.h.buf);
        gl.enableVertexAttribArray(L.a.aPos); gl.vertexAttribPointer(L.a.aPos, 3, gl.FLOAT, false, WV * 4, 0);
        gl.enableVertexAttribArray(L.a.aKind); gl.vertexAttribPointer(L.a.aKind, 1, gl.FLOAT, false, WV * 4, 11 * 4);
        gl.uniform3f(L.u.uOff, m.off[0], m.off[1], m.off[2]);
        gl.drawArrays(gl.TRIANGLES, 0, m.h.n);
      }
      unbind(L);
      L = S.shB; gl.useProgram(L.p);
      gl.uniformMatrix4fv(L.u.uLVP, false, smat);
      gl.uniform3f(L.u.uLRight, lightR[0], lightR[1], lightR[2]);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, stex); gl.uniform1i(L.u.uSpr, 0);
      const shB = (buf, n, off) => { bindBB(L, buf, off); gl.drawArrays(gl.TRIANGLES, 0, n); };
      for (const b of bills) if (b.h) shB(b.h.buf, b.h.n, b.off);
      if (f.dyn && f.dyn.n) { gl.bindBuffer(gl.ARRAY_BUFFER, S.dynBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(f.dyn.a), gl.DYNAMIC_DRAW); shB(S.dynBuf, f.dyn.n, [0, 0, 0]); f.dyn.up = true; }
      unbind(L);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      shOn = 1;
    } else smat.set(ID);
    // ---------- небо ----------
    gl.viewport(0, 0, f.w, f.h);
    gl.clearColor(sk.fog[0], sk.fog[1], sk.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    let L = S.sky; gl.useProgram(L.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, S.quad);
    gl.enableVertexAttribArray(L.a.aP); gl.vertexAttribPointer(L.a.aP, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(L.u.uF, F); gl.uniform3fv(L.u.uR, R); gl.uniform3fv(L.u.uU, U); gl.uniform1f(L.u.uTan, tanH); gl.uniform1f(L.u.uAsp, asp);
    gl.uniform3fv(L.u.uZen, sk.zen); gl.uniform3fv(L.u.uHor, sk.hor); gl.uniform3fv(L.u.uSunDir, sk.sunSky || sk.sunDir); gl.uniform3fv(L.u.uSunC, sk.sunDisc); gl.uniform3fv(L.u.uMoonDir, sk.moonDir);
    gl.uniform3fv(L.u.uGlow, sk.glow || [0, 0, 0]);
    gl.uniform1f(L.u.uStars, sk.stars); gl.uniform1f(L.u.uTime, f.time); gl.uniform1f(L.u.uCloud, sk.cloud); gl.uniform3fv(L.u.uCloudLit, sk.cloudLit || sk.cloudC); gl.uniform3fv(L.u.uCloudSh, sk.cloudSh || sk.cloudC);
    gl.uniform1f(L.u.uIn, sk.indoor ? 1 : 0); gl.uniform1f(L.u.uSeed, sk.seed || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(L.a.aP);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    // общий свет
    const lp = new Float32Array(32), lc = new Float32Array(32);
    const ls = f.lights.slice(0, 8);
    ls.forEach((l, i) => { lp.set([l.x, l.y, l.z, l.r], i * 4); lc.set([l.col[0], l.col[1], l.col[2], l.i], i * 4); });
    const setLight = (L) => {
      gl.uniformMatrix4fv(L.u.uVP, false, mat);
      if (L.u.uSM) gl.uniformMatrix4fv(L.u.uSM, false, smat);
      gl.uniform3fv(L.u.uSunDir, sk.sunDir); if (L.u.uSunSky) gl.uniform3fv(L.u.uSunSky, sk.sunSky || sk.sunDir);
      gl.uniform3fv(L.u.uSun, sk.sun); gl.uniform3fv(L.u.uAmb, sk.amb); gl.uniform3fv(L.u.uFog, sk.fog); if (L.u.uFogSun) gl.uniform3fv(L.u.uFogSun, sk.fogSun || sk.fog);
      if (L.u.uZen) gl.uniform3fv(L.u.uZen, sk.zen); if (L.u.uHor) gl.uniform3fv(L.u.uHor, sk.hor);
      gl.uniform3f(L.u.uCam, ex, ey, ez); gl.uniform1f(L.u.uFogD, sk.fogD); if (L.u.uTime) gl.uniform1f(L.u.uTime, f.time); if (L.u.uNight) gl.uniform1f(L.u.uNight, sk.night);
      if (L.u.uLP) gl.uniform4fv(L.u.uLP, lp);
      if (L.u.uLC) gl.uniform4fv(L.u.uLC, lc);
      gl.uniform1i(L.u.uNL, ls.length);
      if (L.u.uShadow) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, S.shTex); gl.uniform1i(L.u.uShadow, 1); gl.activeTexture(gl.TEXTURE0); }
      if (L.u.uShOn) gl.uniform1f(L.u.uShOn, shOn * (f.shadow ? (f.shadow.k == null ? 1 : f.shadow.k) : 0));
      if (L.u.uShTex) gl.uniform1f(L.u.uShTex, SHN);
    };
    // ---------- земля, стены, крыши; дальняя земля ----------
    L = S.world; gl.useProgram(L.p); setLight(L);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atex); gl.uniform1i(L.u.uTex, 0); gl.uniform1f(L.u.uTS, P3.TS);
    const ft = P3.tex('farnoise'); gl.uniform2f(L.u.uFarTile, ft[0], ft[1]);
    const nr = f.near || [1e9, 1e9, -1e9, -1e9];
    gl.uniform4f(L.u.uNear, nr[0], nr[1], nr[2], nr[3]);
    const hd = f.hide || [1e9, 1e9, -1e9, -1e9];
    gl.uniform4f(L.u.uHide, hd[0], hd[1], hd[2], hd[3]);
    for (const m of meshes) { if (!m.h) continue; bindWorld(L, m.h, m.off); gl.drawArrays(gl.TRIANGLES, 0, m.h.n); }
    if (f.far && f.far.h) { bindWorld(L, f.far.h, f.far.off); gl.drawArrays(gl.TRIANGLES, 0, f.far.h.n); }
    unbind(L);
    // ---------- деревья, вещи, люди, звери ----------
    L = S.bb; gl.useProgram(L.p); setLight(L);
    gl.uniform3f(L.u.uRight, R[0], 0, R[2]);
    gl.uniform3fv(L.u.uTintAll, f.sprTint || [1, 1, 1]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, stex); gl.uniform1i(L.u.uSpr, 0);
    for (const b of bills) { if (!b.h) continue; bindBB(L, b.h.buf, b.off); gl.drawArrays(gl.TRIANGLES, 0, b.h.n); }
    if (f.dyn && f.dyn.n) {
      gl.bindBuffer(gl.ARRAY_BUFFER, S.dynBuf);
      if (!f.dyn.up) gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(f.dyn.a), gl.DYNAMIC_DRAW);
      bindBB(L, S.dynBuf, [0, 0, 0]);
      gl.drawArrays(gl.TRIANGLES, 0, f.dyn.n);
    }
    unbind(L);
    // ---------- погода — тихая, поверх всего ----------
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
  // точка (в координатах кадра) → пиксель кадра
  P3.project = function (x, y, z) {
    const l = P3.last;
    if (!l) return null;
    const m = l.mat;
    const X = m[0] * x + m[4] * y + m[8] * z + m[12], Y = m[1] * x + m[5] * y + m[9] * z + m[13], W = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (W <= 0.05) return null;
    return [(X / W * 0.5 + 0.5) * l.w, (1 - (Y / W * 0.5 + 0.5)) * l.h, W];
  };
  // пиксель кадра → луч (в координатах кадра)
  P3.ray = function (px, py) {
    const l = P3.last;
    if (!l) return null;
    const nx = (px / l.w) * 2 - 1, ny = 1 - (py / l.h) * 2;
    const d = [l.F[0] + l.R[0] * nx * l.tanH * l.asp + l.U[0] * ny * l.tanH, l.F[1] + l.R[1] * nx * l.tanH * l.asp + l.U[1] * ny * l.tanH, l.F[2] + l.R[2] * nx * l.tanH * l.asp + l.U[2] * ny * l.tanH];
    return { o: [l.cam.x, l.cam.y, l.cam.z], d };
  };
})(window.EOF);
